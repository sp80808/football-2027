import React, { Suspense, useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from '../components/ui/Button';
import { GameEngine } from '../engine/GameEngine';
import { HUD } from '../components/HUD';
import { TouchControls } from '../components/TouchControls';
import { MatchPhaseOverlay } from '../components/MatchPhaseOverlay';
import { SettingsOverlay } from '../components/SettingsOverlay';
import { WorldState } from '../engine/WorldState';
import { audioManager } from '../audio/AudioManager';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { commentaryService } from '../audio/CommentaryService';
import { useCareerStore } from '../career/careerStore';
import { useSquadStore } from '../career/squadStore';
import { bindingsForProfile } from '../career/attributeBindings';
import { displayMatchMinute } from '../utils/matchTime';

const RenderingPanel = React.lazy(() =>
  import('../debug/RenderingPanel').then((m) => ({ default: m.RenderingPanel })),
);

const tsEngine = new GameEngine();
tsEngine.init();

interface GameplayScreenProps {
  mode?: 'quickMatch' | 'career';
  onExit: (result?: { homeScore: number; awayScore: number }) => void;
}

export const GameplayScreen: React.FC<GameplayScreenProps> = ({ mode = 'quickMatch', onExit }) => {
  const phase = useGameStore((s) => s.phase);
  const isMatchEnd = phase === 'full_time';
  const [replayMode, setReplayMode] = useState(false);
  const replayModeRef = useRef(false);
  const [replaySource, setReplaySource] = useState<'input' | 'state'>('input');
  const [replayFrame, setReplayFrame] = useState(0);
  const [showOffsideLine, setShowOffsideLine] = useState(true);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const replayItems = useRef<WorldState[]>([]);
  const careerResultRecorded = useRef(false);

  const maybeRecordCareerResult = () => {
    if (mode !== 'career' || careerResultRecorded.current) return;
    const match = useGameStore.getState();
    if (match.phase !== 'full_time') return;
    careerResultRecorded.current = true;
    useCareerStore.getState().recordMatchResult(match.homeScore, match.awayScore);
  };

  useEffect(() => {
    careerResultRecorded.current = false;
    tsEngine.init();
    commentaryService.reset();
    const { commentaryEnabled, commentaryVolume, commentaryVoice } = useSettingsStore.getState();
    commentaryService.setEnabled(useGameStore.getState().audioEnabled && commentaryEnabled);
    commentaryService.setVolume(commentaryVolume);
    useGameStore.getState().resetMatchUi();
    useGameStore.getState().syncMatch(tsEngine.getMatchSnapshot());

    return () => {
      tsEngine.init();
      commentaryService.reset();
      useGameStore.getState().resetMatchUi();
    };
  }, []);

  // Bind the controlled player's RPG attributes into the engine physics.
  useEffect(() => {
    const apply = () => {
      const controlled = useSquadStore.getState().getControlled();
      if (!controlled) return;
      const b = bindingsForProfile(controlled);
      for (const p of tsEngine.homeTeam) {
        p.speedMul = b.speedMul;
        p.accelMul = b.accelMul;
        p.controlMul = b.controlMul;
        p.kickPowerMul = b.kickPowerMul;
        p.turnMul = b.turnMul;
        p.decelMul = b.decelMul;
      }
    };
    apply();
    return useSquadStore.subscribe(apply);
  }, []);

  useEffect(() => {
    if (phase === 'full_time') maybeRecordCareerResult();
  }, [phase, mode]);

  useEffect(() => {
    return useSettingsStore.subscribe(() => {
      const { commentaryEnabled, commentaryVolume, commentaryVoice } = useSettingsStore.getState();
      commentaryService.setEnabled(useGameStore.getState().audioEnabled && commentaryEnabled);
      commentaryService.setVolume(commentaryVolume);
    });
  }, []);

  useEffect(() => {
    const unlock = () => {
      audioManager.unlock();
      commentaryService.unlock();
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
    window.addEventListener('pointerdown', unlock);
    window.addEventListener('keydown', unlock);
    return () => {
      window.removeEventListener('pointerdown', unlock);
      window.removeEventListener('keydown', unlock);
    };
  }, []);

  useEffect(() => {
    let requestId = 0;
    const loop = (time: number) => {
      requestId = requestAnimationFrame(loop);
      if (!replayModeRef.current) {
        tsEngine.update(time);
        const snapshot = tsEngine.getMatchSnapshot();
        useGameStore.getState().syncMatch(snapshot);

        // RPG: feed the on-pitch action tracker (only in career mode where a squad exists).
        if (mode === 'career') {
          const tracker = useSquadStore.getState().tracker;
          const playerHasBall = tsEngine.homeTeam[tsEngine.activeHomeIndex].controlState === 'under_control' || tsEngine.homeTeam[tsEngine.activeHomeIndex].controlState === 'shielding';
          tracker.observeTick(snapshot.matchTime, playerHasBall);
          // Note: on-pitch player-switching is handled inside the engine (ball-nearest).
          // We deliberately do NOT cycle the squad store here — doing so desyncs the
          // RPG "controlled player" (used for XP/binding) from the on-pitch active player.
        }

        const frameEvents = tsEngine.drainEvents();
        if (mode === 'career') useSquadStore.getState().tracker.ingestSimEvents(frameEvents);
        commentaryService.update(frameEvents, snapshot, tsEngine.homeTeam[tsEngine.activeHomeIndex]);
        for (const event of frameEvents) {
          const state = tsEngine.getRenderState();
          const ballX = state.ball.pos.x;
          const ballY = state.ball.pos.z + 0.11;
          const ballZ = -state.ball.pos.y;

          if (event.type === 'kick') {
            const power = (event as any).power ?? 1;
            audioManager.playKick(power);
            audioManager.playAt('kick', ballX, ballY, ballZ, Math.min(0.9, 0.3 + power * 0.4));
          } else if (event.type === 'bounce') {
            audioManager.playAt('bounce', ballX, ballY, ballZ, Math.min(0.5, 0.15 + (event as any).intensity * 0.2));
          } else if (event.type === 'goal') {
            audioManager.playGoal();
            useGameStore.getState().pushPlayEvent({
              side: (event as any).scorer === 'player' ? 'home' : 'away',
              kind: 'goal',
              matchMinute: displayMatchMinute(tsEngine.elapsedSeconds),
              label: 'GOAL',
            });
          } else if (event.type === 'shot') {
            useGameStore.getState().pushPlayEvent({
              side: event.side === 'player' ? 'home' : 'away',
              kind: 'shot',
              matchMinute: displayMatchMinute(tsEngine.elapsedSeconds),
              label: 'SHOT',
            });
          } else if (event.type === 'shot_on_target') {
            audioManager.crowdReaction('tension_up', 0.5);
          } else if (event.type === 'shot_off_target') {
            audioManager.crowdReaction('gasp', 0.4);
          } else if (event.type === 'offside') {
            audioManager.crowdReaction('groan', 0.5);
            useGameStore.getState().pushPlayEvent({
              side: event.side === 'player' ? 'home' : 'away',
              kind: 'offside',
              matchMinute: displayMatchMinute(tsEngine.elapsedSeconds),
              label: 'OFFSIDE',
            });
          } else if (event.type === 'whistle') {
            audioManager.playWhistle();
          } else if (event.type === 'tackle') {
            useGameStore.getState().pushPlayEvent({
              side: event.side === 'player' ? 'home' : 'away',
              kind: 'tackle',
              matchMinute: displayMatchMinute(tsEngine.elapsedSeconds),
              label: 'TACKLE WON',
            });
          } else if (event.type === 'slide') {
            audioManager.playSlide();
            audioManager.crowdReaction('groan', 0.2);
          } else if (event.type === 'save') {
            audioManager.playSave();
            if (event.side === 'player') audioManager.crowdReaction('cheer', 0.4);
          } else if (event.type === 'post_hit') {
            audioManager.playPostHit();
          } else if (event.type === 'goal_kick' || event.type === 'throw_in' || event.type === 'corner_kick' || event.type === 'free_kick') {
             audioManager.playWhistle();
             audioManager.crowdReaction('tension_up', 0.3);
          }
        }
        useGameStore.getState().prunePlayEvents();
      }
    };
    requestId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestId);
  }, []);

  useEffect(() => {
    if (!replayMode || !isPlayingReplay) return;
    let requestId = 0;
    let lastTime = performance.now();

    const loop = (time: number) => {
      requestId = requestAnimationFrame(loop);
      if (time - lastTime > 1000 / 60) {
        setReplayFrame((previous) => {
          if (previous >= replayItems.current.length - 1) {
            setIsPlayingReplay(false);
            return previous;
          }
          return Math.min(previous + 2, replayItems.current.length - 1);
        });
        lastTime = time;
      }
    };

    requestId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(requestId);
  }, [replayMode, isPlayingReplay]);

  const toggleReplay = () => {
    if (!replayMode) {
      const hasInputFrames = tsEngine.replayRecorder.getFrameCount() > 0;
      const useInput = hasInputFrames;
      setReplaySource(useInput ? 'input' : 'state');
      replayItems.current = useInput
        ? tsEngine.buildInputReplayTimeline()
        : tsEngine.replayBuffer.getItems();
      setReplayFrame(Math.max(0, replayItems.current.length - 1));
      setReplayMode(true);
      replayModeRef.current = true;
      setIsPlayingReplay(false);
    } else {
      setReplayMode(false);
      replayModeRef.current = false;
      setIsPlayingReplay(false);
    }
  };

  const switchReplaySource = (source: 'input' | 'state') => {
    if (source === replaySource) return;
    setReplaySource(source);
    replayItems.current = source === 'input'
      ? tsEngine.buildInputReplayTimeline()
      : tsEngine.replayBuffer.getItems();
    setReplayFrame(Math.max(0, replayItems.current.length - 1));
    setIsPlayingReplay(false);
  };

  const replayState = replayMode && replayItems.current.length > 0
    ? replayItems.current[replayFrame]
    : null;

  const handleRematch = () => {
    careerResultRecorded.current = false;
    tsEngine.rematch();
    commentaryService.reset();
    useGameStore.getState().resetMatchUi();
    useGameStore.getState().syncMatch(tsEngine.getMatchSnapshot());
  };

  const handleMainMenu = () => {
    maybeRecordCareerResult();
    tsEngine.init();
    commentaryService.reset();
    const { commentaryEnabled, commentaryVolume } = useSettingsStore.getState();
    commentaryService.setEnabled(useGameStore.getState().audioEnabled && commentaryEnabled);
    commentaryService.setVolume(commentaryVolume);
    useGameStore.getState().resetMatchUi();
    onExit();
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden">
      <Suspense
        fallback={
          <div className="flex h-full w-full items-center justify-center bg-slate-950 text-sm text-slate-400">
            Loading pitch…
          </div>
        }
      >
        <RenderingPanel
          engine={tsEngine}
          replayState={replayState}
          showOffsideLine={showOffsideLine}
        />
      </Suspense>

      {!isMatchEnd && (
        <div className="absolute left-3 top-[5.5rem] z-10 flex flex-col gap-2 sm:left-4">
          <Button variant={replayMode ? 'danger' : 'primary'} onClick={toggleReplay}>
            {replayMode ? 'Exit Replay' : <><Play size={16} /> Instant Replay</>}
          </Button>
        </div>
      )}

      {!isMatchEnd && (
        <div className="absolute right-3 top-3 z-10 sm:right-4">
          <Button variant="danger" size="sm" onClick={() => onExit()}>
            <X size={16} /> Exit
          </Button>
        </div>
      )}

      <AnimatePresence>
        {replayMode && (
          <motion.div
            initial={{ y: 100, opacity: 0, x: '-50%' }}
            animate={{ y: 0, opacity: 1, x: '-50%' }}
            exit={{ y: 100, opacity: 0, x: '-50%' }}
            className="absolute bottom-10 left-1/2 z-20 flex min-w-[500px] flex-col items-center gap-5 rounded-xl border border-slate-700 bg-slate-900/90 p-6 text-white shadow-2xl backdrop-blur-sm"
          >
            <div className="flex w-full items-center justify-between">
              <h2 className="m-0 flex items-center gap-2 text-lg font-bold text-red-500">
                <span className="inline-block h-2.5 w-2.5 animate-pulse rounded-full bg-red-500" />
                REPLAY MODE
              </h2>
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1 rounded-lg border border-slate-600 bg-slate-800 p-0.5 text-xs">
                  <button type="button" onClick={() => switchReplaySource('input')} disabled={tsEngine.replayRecorder.getFrameCount() === 0}
                    className={`rounded-md px-2.5 py-1 transition-colors ${replaySource === 'input' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white disabled:cursor-not-allowed disabled:opacity-40'}`}>Input replay</button>
                  <button type="button" onClick={() => switchReplaySource('state')}
                    className={`rounded-md px-2.5 py-1 transition-colors ${replaySource === 'state' ? 'bg-blue-500 text-white' : 'text-slate-400 hover:text-white'}`}>State replay</button>
                </div>
                <label className="flex cursor-pointer items-center gap-2 text-sm text-slate-300 transition-colors hover:text-white">
                <input
                  type="checkbox"
                  checked={showOffsideLine}
                  onChange={(event) => setShowOffsideLine(event.target.checked)}
                  className="rounded border-slate-600 bg-slate-800 text-blue-500"
                />
                Show Offside Line
              </label>
              </div>
            </div>

            <div className="flex w-full items-center gap-4">
              <span className="font-mono text-sm text-slate-400">-5s</span>
              <input
                type="range"
                min={0}
                max={Math.max(0, replayItems.current.length - 1)}
                value={replayFrame}
                onChange={(event) => {
                  setReplayFrame(Number.parseInt(event.target.value, 10));
                  setIsPlayingReplay(false);
                }}
                className="h-2 flex-1 cursor-pointer appearance-none rounded-lg bg-slate-700 accent-blue-500"
              />
              <span className="font-mono text-sm text-slate-400">NOW</span>
            </div>

            <div className="flex items-center gap-4">
              <button
                onClick={() => { setReplayFrame(0); setIsPlayingReplay(false); }}
                className="flex cursor-pointer items-center justify-center bg-transparent p-2 text-slate-300 transition-colors hover:text-white"
                aria-label="Replay from start"
              >
                <SkipBack size={24} />
              </button>
              <button
                onClick={() => setIsPlayingReplay((playing) => !playing)}
                className="flex cursor-pointer items-center justify-center rounded-full bg-blue-500 p-3 text-white shadow-lg transition-transform hover:scale-105 hover:bg-blue-600 active:scale-95"
                aria-label={isPlayingReplay ? 'Pause replay' : 'Play replay'}
              >
                {isPlayingReplay ? <Pause size={24} /> : <Play size={24} className="ml-1" />}
              </button>
              <button
                onClick={() => { setReplayFrame(Math.max(0, replayItems.current.length - 1)); setIsPlayingReplay(false); }}
                className="flex cursor-pointer items-center justify-center bg-transparent p-2 text-slate-300 transition-colors hover:text-white"
                aria-label="Jump to live"
              >
                <SkipForward size={24} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <HUD
        engine={tsEngine}
        showOffsideLine={showOffsideLine}
        onToggleOffsideLine={() => setShowOffsideLine((value) => !value)}
      />
      <MatchPhaseOverlay onRematch={handleRematch} onMainMenu={handleMainMenu} />
      <TouchControls input={tsEngine.input} />
      <SettingsOverlay />
    </div>
  );
};
