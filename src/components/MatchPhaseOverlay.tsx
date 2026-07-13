import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Button } from './ui/Button';
import { useGameStore } from '../store/gameStore';
import { RotateCcw, Home } from 'lucide-react';

interface MatchPhaseOverlayProps {
  onRematch: () => void;
  onMainMenu: () => void;
}

export function MatchPhaseOverlay({ onRematch, onMainMenu }: MatchPhaseOverlayProps) {
  const { phase, homeScore, awayScore, periodCountdown, half } = useGameStore();

  const showHalftime = phase === 'halftime';
  const showKickoff = phase === 'kickoff' && periodCountdown !== null;
  const showFullTime = phase === 'full_time';

  if (!showHalftime && !showKickoff && !showFullTime) return null;

  return (
    <AnimatePresence>
      <motion.div
        key={phase}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center bg-black/55 backdrop-blur-[2px]"
      >
        {showFullTime ? (
          <motion.div
            initial={{ scale: 0.92, y: 16 }}
            animate={{ scale: 1, y: 0 }}
            className="flex min-w-[min(420px,92vw)] flex-col items-center gap-6 rounded-2xl border border-white/15 bg-slate-950/90 px-8 py-10 text-center shadow-2xl"
          >
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.35em] text-amber-300">Full Time</p>
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
            <div className="flex flex-wrap items-center justify-center gap-3">
              <Button size="lg" onClick={onRematch}>
                <RotateCcw size={18} /> Rematch
              </Button>
              <Button variant="secondary" size="lg" onClick={onMainMenu}>
                <Home size={18} /> Main Menu
              </Button>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, y: 12 }}
            animate={{ scale: 1, y: 0 }}
            className="flex flex-col items-center gap-3 text-center"
          >
            <p className="m-0 text-xs font-semibold uppercase tracking-[0.35em] text-white/50">
              {showHalftime ? 'Half Time' : half === 2 ? 'Second Half' : 'Kick Off'}
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
                initial={{ scale: 1.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
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
