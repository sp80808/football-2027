import React, { useEffect, useState } from 'react';
import {
  Shield,
  RefreshCw,
  Activity,
  Cpu,
  Volume2,
  VolumeX,
  Settings,
  Target,
  Clock,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { GameEngine } from '../engine/GameEngine';
import { SimulationConfig } from '../engine/SimulationConfig';
import { useGameStore, PlayEvent } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { modifierLabel } from '../engine/PlayerIntentParser';
import type { PassModifier, ShotModifier } from '../engine/Intent';
import { formatBroadcastClock, getPeriodLabel } from '../utils/matchTime';
import { ControlBindingsPanel } from './ControlGlyph';
import { GlassPanel } from './ui/GlassPanel';
import { Badge } from './ui/Badge';
import { Chip } from './ui/Chip';
import { ACCENT, GLASS, TYPO, iconProps } from '../ui/designTokens';
import {
  motionTransition,
  slideFromSide,
  springBouncy,
  springSmooth,
  useReducedMotion,
} from '../ui/motionPresets';

interface HUDProps {
  engine: GameEngine;
  useWasm?: boolean;
  onToggleWasm?: () => void;
  showOffsideLine?: boolean;
  onToggleOffsideLine?: () => void;
}

function StatRow({ label, value, accent = 'text-text-primary' }: { label: string; value: string | number; accent?: string }) {
  return (
    <>
      <span className="text-[11px] text-text-muted">{label}</span>
      <span className={`text-right font-mono text-[11px] ${accent}`}>{value}</span>
    </>
  );
}

function ScoreDigit({ value, accent }: { value: number; accent: string }) {
  const reduced = useReducedMotion();
  return (
    <motion.span
      key={value}
      initial={reduced ? false : { scale: 1.4, filter: 'brightness(1.8)' }}
      animate={{ scale: 1, filter: 'brightness(1)' }}
      transition={motionTransition(reduced, springBouncy)}
      className={`min-w-[1.25rem] text-center text-2xl leading-none ${TYPO.score} ${accent}`}
    >
      {value}
    </motion.span>
  );
}

function PlayEventChip({ event, align, index }: { event: PlayEvent; align: 'left' | 'right'; index: number }) {
  const reduced = useReducedMotion();
  const slide = slideFromSide(align, index);
  const side = event.kind === 'offside' ? 'warning' : event.side === 'home' ? 'player' : 'opponent';

  return (
    <motion.div
      layout={!reduced}
      initial={reduced ? false : slide.initial}
      animate={slide.animate}
      exit={reduced ? undefined : slide.exit}
      transition={motionTransition(reduced, slide.transition)}
      className={align === 'right' ? 'flex flex-row-reverse' : ''}
    >
      <Chip side={side}>
        <span className={`flex items-center gap-1 ${TYPO.score} text-[10px] text-text-muted`}>
          <Clock {...iconProps('xs')} className="shrink-0 opacity-70" />
          {`${event.matchMinute}'`}
        </span>
        <span className="text-[11px] font-semibold uppercase tracking-wide text-text-primary">{event.label}</span>
      </Chip>
    </motion.div>
  );
}

function PlayEventFeed({ side, align }: { side: 'home' | 'away'; align: 'left' | 'right' }) {
  const events = useGameStore((s) => s.playEvents.filter((e) => e.side === side));

  return (
    <div className={`pointer-events-none absolute bottom-4 z-10 flex max-w-[min(220px,42vw)] flex-col gap-1.5 select-none ${align === 'left' ? 'left-3 sm:left-4' : 'right-3 sm:right-4 items-end'}`}>
      <AnimatePresence mode="popLayout">
        {events.map((event, index) => (
          <PlayEventChip key={event.id} event={event} align={align} index={index} />
        ))}
      </AnimatePresence>
    </div>
  );
}

const hudButtonClass = `flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium backdrop-blur-sm transition-colors hover:bg-white/10 ${GLASS.hud} text-text-primary`;

export function HUD({ engine, useWasm = false, onToggleWasm, showOffsideLine = false, onToggleOffsideLine }: HUDProps) {
  const reduced = useReducedMotion();
  const { audioEnabled, toggleAudio, homeScore, awayScore, elapsedSeconds, phase, announcement, half } = useGameStore();
  const { showControlHints, setSettingsOpen, activeModifierLabel, flashModifierLabel } = useSettingsStore();
  const [diagnostics, setDiagnostics] = useState({
    tps: 0,
    fps: 0,
    playerSpeed: '0.0',
    ballVelocity: '0.0',
    controlState: 'free',
    keeperState: 'positioning',
    charging: false,
    chargeType: 'pass' as 'pass' | 'shoot',
    chargePercent: 0,
    passModifier: 'none' as string,
    shotModifier: 'none' as string,
    scorePlayer: 0,
    scoreOpponent: 0,
    matchSeconds: 0,
    celebrating: false,
    offsideLine: null as number | null,
  });

  useEffect(() => {
    let frames = 0;
    let fps = 0;
    let lastFpsTime = performance.now();
    let animationFrame = 0;

    const countFrame = () => {
      frames++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        fps = frames;
        frames = 0;
        lastFpsTime = now;
      }
      animationFrame = requestAnimationFrame(countFrame);
    };
    animationFrame = requestAnimationFrame(countFrame);

    const interval = window.setInterval(() => {
      const state = engine.getRenderState();
      setDiagnostics({
        tps: engine.tps,
        fps,
        playerSpeed: state.player.vel.mag().toFixed(1),
        ballVelocity: state.ball.vel.mag().toFixed(1),
        controlState: state.player.controlState,
        keeperState: state.keeper.aiState,
        charging: state.player.isCharging,
        chargeType: state.player.chargeType,
        chargePercent: Math.min(100, Math.round((state.player.chargeStart / SimulationConfig.MAX_CHARGE_TIME) * 100)),
        passModifier: state.player.passModifier,
        shotModifier: state.player.shotModifier,
        scorePlayer: state.scorePlayer,
        scoreOpponent: state.scoreOpponent,
        matchSeconds: engine.elapsedSeconds,
        celebrating: engine.isGoalCelebration,
        offsideLine: state.offsideLineY,
      });
    }, 80);

    return () => {
      window.clearInterval(interval);
      cancelAnimationFrame(animationFrame);
    };
  }, [engine, flashModifierLabel]);

  const periodLabel =
    phase === 'halftime'
      ? 'HALF TIME'
      : phase === 'full_time'
        ? 'FULL TIME'
        : phase === 'kickoff' && half === 2
          ? '2ND HALF'
          : getPeriodLabel(elapsedSeconds);

  useEffect(() => {
    if (!diagnostics.charging) return;
    const label = modifierLabel(
      diagnostics.passModifier as PassModifier,
      diagnostics.shotModifier as ShotModifier,
      diagnostics.chargeType === 'shoot' ? 'shot' : 'short_pass',
    );
    if (label) flashModifierLabel(label);
  }, [diagnostics.charging, diagnostics.passModifier, diagnostics.shotModifier, diagnostics.chargeType, flashModifierLabel]);

  const chargeBarClass = () => {
    if (diagnostics.chargeType === 'shoot') {
      if (diagnostics.shotModifier === 'finesse') return 'bg-gradient-to-r from-purple-400 to-fuchsia-500';
      if (diagnostics.shotModifier === 'chip') return 'bg-gradient-to-r from-yellow-300 to-amber-400';
      if (diagnostics.shotModifier === 'low_driven') return 'bg-gradient-to-r from-orange-400 to-red-500';
      return 'bg-gradient-to-r from-orange-400 to-red-500';
    }
    if (diagnostics.passModifier === 'through') return 'bg-gradient-to-r from-emerald-400 to-green-500';
    if (diagnostics.passModifier === 'lob') return 'bg-gradient-to-r from-cyan-400 to-sky-400';
    if (diagnostics.passModifier === 'driven') return 'bg-gradient-to-r from-blue-300 to-indigo-400';
    return 'bg-gradient-to-r from-blue-400 to-cyan-400';
  };

  const keeperStyles: Record<string, string> = {
    positioning: ACCENT.playerSurface,
    diving: ACCENT.opponentSurface,
    recovering: ACCENT.warningSurface,
  };

  const controlStyles: Record<string, string> = {
    free: 'border-border bg-white/10 text-text-muted',
    loose_nearby: ACCENT.warningSurface,
    under_control: ACCENT.actionSurface,
    shielding: 'border-purple-500/20 bg-purple-500/20 text-purple-300',
    receiving: 'border-cyan-500/20 bg-cyan-500/20 text-cyan-300',
    stretching: 'border-orange-500/20 bg-orange-500/20 text-orange-300',
  };

  return (
    <>
      {showControlHints && (
        <div className="pointer-events-none absolute bottom-28 left-3 select-none sm:bottom-32 sm:left-4">
          <ControlBindingsPanel compact className="min-w-[220px] border-border bg-surface-hud" />
        </div>
      )}

      <PlayEventFeed side="home" align="left" />
      <PlayEventFeed side="away" align="right" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 select-none sm:left-4 sm:top-4">
        <div className="flex flex-col gap-1">
          <GlassPanel className="flex items-center gap-3 sm:gap-4" padding="sm">
            <ScoreDigit value={homeScore} accent={ACCENT.player} />
            <span className="text-text-subtle">|</span>
            <div className="flex min-w-[3.5rem] flex-col items-center">
              <span className={`${TYPO.clock} text-sm text-text-primary`}>
                {formatBroadcastClock(elapsedSeconds)}
              </span>
              <span className="text-[8px] font-semibold uppercase tracking-[0.2em] text-text-muted">
                {periodLabel}
              </span>
            </div>
            <span className="text-text-subtle">|</span>
            <ScoreDigit value={awayScore} accent={ACCENT.opponent} />
          </GlassPanel>
          {announcement && <Badge variant="warning">{announcement}</Badge>}
          {diagnostics.celebrating && !announcement && (
            <Badge variant="warning">Goal — kick-off soon</Badge>
          )}
        </div>
      </div>

      {diagnostics.charging && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 select-none">
          <motion.div
            animate={!reduced && diagnostics.chargePercent >= 100 ? { x: [0, -2, 2, -1, 1, 0] } : { x: 0 }}
            transition={{ duration: 0.35, ease: 'easeOut' }}
            className={`min-w-[180px] rounded-lg border px-4 py-2 backdrop-blur-sm ${diagnostics.chargeType === 'shoot' && diagnostics.shotModifier === 'power' ? 'border-accent-opponent-border bg-surface-hud shadow-[0_0_24px_rgba(239,68,68,0.25)]' : `${GLASS.hud}`}`}
          >
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium capitalize text-text-muted">
                {diagnostics.chargeType === 'shoot' ? 'Shooting' : 'Passing'}
              </span>
              <span className={`${TYPO.score} text-[11px] text-text-secondary`}>
                {diagnostics.chargePercent}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <motion.div
                className={`h-full rounded-full ${chargeBarClass()}`}
                animate={{
                  width: `${diagnostics.chargePercent}%`,
                  boxShadow:
                    diagnostics.chargePercent > 20
                      ? `0 0 ${8 + diagnostics.chargePercent * 0.2}px rgba(96, 165, 250, ${0.15 + diagnostics.chargePercent * 0.004})`
                      : 'none',
                }}
                transition={motionTransition(reduced, springSmooth)}
              />
            </div>
          </motion.div>
        </div>
      )}

      <AnimatePresence>
        {activeModifierLabel && (
          <motion.div
            key={activeModifierLabel}
            initial={reduced ? false : { opacity: 0, y: 16, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduced ? undefined : { opacity: 0, y: -8, scale: 0.96 }}
            transition={motionTransition(reduced, springBouncy)}
            className="pointer-events-none absolute left-1/2 top-24 -translate-x-1/2 select-none"
          >
            <Badge variant="neutral" className="px-4 py-1.5 text-xs backdrop-blur-sm">
              {activeModifierLabel}
            </Badge>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute right-3 top-3 select-none sm:right-4 sm:top-4">
        <GlassPanel className="min-w-[190px]" padding="md">
          <p className={`mb-2 px-0.5 ${TYPO.sectionLabel}`}>Diagnostics</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <StatRow label="FPS" value={diagnostics.fps} accent="text-accent-player" />
            <StatRow label="TPS" value={diagnostics.tps} accent="text-accent-action" />
            <StatRow label="Player" value={`${diagnostics.playerSpeed} m/s`} />
            <StatRow label="Ball" value={`${diagnostics.ballVelocity} m/s`} />
            {diagnostics.offsideLine !== null && (
              <StatRow label="Offside" value={`${diagnostics.offsideLine.toFixed(1)}m`} accent={ACCENT.warning} />
            )}
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <Activity {...iconProps('xs')} className="shrink-0 text-text-subtle" />
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${controlStyles[diagnostics.controlState] ?? controlStyles.free}`}>
              {diagnostics.controlState.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Shield {...iconProps('xs')} className="shrink-0 text-text-subtle" />
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${keeperStyles[diagnostics.keeperState] ?? keeperStyles.positioning}`}>
              GK — {diagnostics.keeperState}
            </span>
          </div>
        </GlassPanel>
      </div>

      <div className="pointer-events-auto absolute right-3 top-[9.5rem] z-10 flex flex-col gap-2 select-none sm:right-4 sm:top-[10rem]">
        {onToggleWasm && (
          <button onClick={onToggleWasm} className={hudButtonClass}>
            <Cpu {...iconProps('xs')} />
            <span>
              Sim: <span className={useWasm ? ACCENT.warning : ACCENT.action}>{useWasm ? 'WASM' : 'TypeScript'}</span>
            </span>
            <RefreshCw {...iconProps('xs')} className="text-text-muted" />
          </button>
        )}
        <button onClick={() => setSettingsOpen(true)} className={hudButtonClass}>
          <Settings {...iconProps('xs')} />
          <span>Settings</span>
        </button>
        <button onClick={toggleAudio} className={hudButtonClass}>
          {audioEnabled ? <Volume2 {...iconProps('xs')} /> : <VolumeX {...iconProps('xs')} />}
          <span>{audioEnabled ? 'Sound On' : 'Sound Off'}</span>
        </button>
        {onToggleOffsideLine && (
          <button
            onClick={onToggleOffsideLine}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-[11px] font-medium backdrop-blur-sm transition-colors hover:bg-white/10 ${showOffsideLine ? ACCENT.warningSurface : `${GLASS.hud} text-text-primary`}`}
          >
            <Target {...iconProps('xs')} />
            <span>Offside Line</span>
          </button>
        )}
      </div>
    </>
  );
}
