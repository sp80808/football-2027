/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, { useEffect, useRef, useState } from 'react';
import { Play, Pause, SkipBack, SkipForward } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RenderingPanel } from './debug/RenderingPanel';
import { GameEngine } from './engine/GameEngine';
import { SimulationWorkerClient } from './bridge/SimulationWorkerClient';
import { HUD } from './components/HUD';
import { WorldState } from './engine/WorldState';

const tsEngine = new GameEngine();
tsEngine.init();
const wasmClient = new SimulationWorkerClient();
wasmClient.init();

export default function App() {
  const [useWasm, setUseWasm] = useState(false);
  const [, setForceRender] = useState({});
  const [replayMode, setReplayMode] = useState(false);
  const replayModeRef = useRef(false);
  const [replayFrame, setReplayFrame] = useState(0);
  const [showOffsideLine, setShowOffsideLine] = useState(false);
  const [isPlayingReplay, setIsPlayingReplay] = useState(false);
  const replayItems = useRef<WorldState[]>([]);

  useEffect(() => {
    let requestId = 0;
    const loop = (time: number) => {
      requestId = requestAnimationFrame(loop);
      if (!replayModeRef.current) {
        tsEngine.update(time);
      }
      wasmClient.submitInput(tsEngine.input.currentFrame);
      if (Math.random() < 0.1) setForceRender({});
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
      replayItems.current = tsEngine.replayBuffer.getItems();
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

  const replayState = replayMode && replayItems.current.length > 0
    ? replayItems.current[replayFrame]
    : null;

  return (
    <div className="h-screen w-screen overflow-hidden">
      <RenderingPanel
        useWasm={useWasm}
        engine={tsEngine}
        wasmClient={wasmClient}
        replayState={replayState}
        showOffsideLine={replayMode && showOffsideLine}
      />

      <button
        onClick={toggleReplay}
        className={`absolute left-4 top-14 z-10 flex items-center justify-center gap-2 rounded-md px-4 py-2 font-bold text-white shadow-md transition-colors ${replayMode ? 'bg-red-500 hover:bg-red-600' : 'bg-blue-600 hover:bg-blue-700'}`}
      >
        {replayMode ? 'Exit Replay' : <><Play size={16} /> Instant Replay</>}
      </button>

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

      <HUD engine={tsEngine} useWasm={useWasm} onToggleWasm={() => setUseWasm((value) => !value)} />
    </div>
  );
}
