import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { useGameStore } from '../store/gameStore';
import { RotateCcw, Home } from 'lucide-react';
import { fadeUp, motionTransition, springSmooth, useReducedMotion } from '../ui/motionPresets';

interface MatchPhaseOverlayProps {
  onRematch: () => void;
  onMainMenu: () => void;
}

function resultLabel(homeScore: number, awayScore: number): string {
  if (homeScore === awayScore) return 'Draw';
  if (homeScore > awayScore) return 'Home Win';
  return 'Away Win';
}

export function MatchPhaseOverlay({ onRematch, onMainMenu }: MatchPhaseOverlayProps) {
  const reduced = useReducedMotion();
  const { phase, homeScore, awayScore, periodCountdown, half } = useGameStore();

  const showHalftime = phase === 'halftime';
  const showKickoff = phase === 'kickoff' && periodCountdown !== null;
  const showFullTime = phase === 'full_time';

  if (!showHalftime && !showKickoff && !showFullTime) return null;

  const pauseTitle = showHalftime
    ? 'Half Time'
    : half === 2
      ? '2nd Half'
      : 'Kick Off';

  return (
    <AnimatePresence>
      <motion.div
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/60 backdrop-blur-sm"
      >
        {showFullTime ? (
          <motion.div
            initial={reduced ? false : { scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            transition={motionTransition(reduced, springSmooth)}
            className="flex min-w-[min(420px,92vw)] flex-col items-center gap-6 rounded-2xl border border-white/15 bg-slate-950/90 px-8 py-10 text-center shadow-2xl backdrop-blur-md"
          >
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">Full Time</p>
            <p className="m-0 text-sm font-semibold uppercase tracking-[0.25em] text-white/45">
              {resultLabel(homeScore, awayScore)}
            </p>
            <div className="flex items-center gap-6">
              <span className="font-mono text-5xl font-black tabular-nums text-emerald-300">{homeScore}</span>
              <span className="text-2xl font-light text-white/30">—</span>
              <span className="font-mono text-5xl font-black tabular-nums text-red-300">{awayScore}</span>
            </div>
            <p className="m-0 max-w-sm text-sm text-white/60">
              {homeScore === awayScore
                ? 'The match ends level.'
                : homeScore > awayScore
                  ? 'Home side take the points.'
                  : 'Away side take the points.'}
            </p>
            <motion.div
              initial={reduced ? false : 'hidden'}
              animate="visible"
              variants={{
                hidden: {},
                visible: { transition: { staggerChildren: reduced ? 0 : 0.12, delayChildren: reduced ? 0 : 0.35 } },
              }}
              className="flex flex-wrap items-center justify-center gap-3"
            >
              <motion.div variants={reduced ? undefined : fadeUp}>
                <Button size="lg" onClick={onRematch}>
                  <RotateCcw size={18} /> Rematch
                </Button>
              </motion.div>
              <motion.div variants={reduced ? undefined : fadeUp}>
                <Button variant="secondary" size="lg" onClick={onMainMenu}>
                  <Home size={18} /> Main Menu
                </Button>
              </motion.div>
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            initial={reduced ? false : { scale: 0.9, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            transition={motionTransition(reduced, springSmooth)}
            className="flex min-w-[min(320px,88vw)] flex-col items-center gap-4 rounded-2xl border border-white/15 bg-slate-950/85 px-8 py-9 text-center shadow-2xl backdrop-blur-md"
          >
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              {pauseTitle}
            </p>
            {showHalftime && (
              <div className="flex items-center gap-4 font-mono text-3xl font-black tabular-nums">
                <span className="text-emerald-300">{homeScore}</span>
                <span className="text-white/25">|</span>
                <span className="text-red-300">{awayScore}</span>
              </div>
            )}
            {periodCountdown !== null && periodCountdown > 0 && (
              <motion.span
                key={periodCountdown}
                initial={reduced ? false : { scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={motionTransition(reduced, springSmooth)}
                className="font-mono text-6xl font-black tabular-nums text-white"
              >
                {periodCountdown}
              </motion.span>
            )}
            <p className="m-0 text-sm text-white/55">
              {showHalftime ? 'Teams returning to the pitch…' : 'Get ready…'}
            </p>
          </motion.div>
        )}
      </motion.div>
    </AnimatePresence>
  );
}
