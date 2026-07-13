import React from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';

interface BroadcastScorebugProps {
  homeName?: string;
  awayName?: string;
  homeScore: number;
  awayScore: number;
  clock: string;
  periodLabel: string;
  announcement?: string | null;
  celebrating?: boolean;
}

function TeamCode({ children, side }: { children: React.ReactNode; side: 'home' | 'away' }) {
  return (
    <span
      className={`flex h-8 min-w-[3.25rem] items-center justify-center px-2 text-[11px] font-black tracking-[0.12em] text-white ${
        side === 'home' ? 'bg-cyan-600' : 'bg-rose-600'
      }`}
    >
      {children}
    </span>
  );
}

export function BroadcastScorebug({
  homeName = 'HOME',
  awayName = 'AWAY',
  homeScore,
  awayScore,
  clock,
  periodLabel,
  announcement,
  celebrating = false,
}: BroadcastScorebugProps) {
  const reduceMotion = useReducedMotion();
  const strap = announcement ?? (celebrating ? 'GOAL — KICK-OFF SOON' : null);

  return (
    <div className="pointer-events-none absolute left-3 top-3 z-30 select-none sm:left-5 sm:top-5">
      <motion.div
        initial={reduceMotion ? false : { opacity: 0, x: -18 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, ease: 'easeOut' }}
        className="overflow-hidden rounded-[0.38rem] border border-white/20 bg-slate-950/92 shadow-[0_8px_30px_rgba(0,0,0,0.35)] backdrop-blur-md"
      >
        <div className="flex h-8 items-stretch">
          <TeamCode side="home">{homeName.slice(0, 4).toUpperCase()}</TeamCode>
          <span className="flex min-w-[2rem] items-center justify-center bg-white px-2 font-mono text-lg font-black tabular-nums text-slate-950">
            {homeScore}
          </span>
          <div className="flex min-w-[4.6rem] flex-col items-center justify-center border-x border-white/10 bg-slate-950 px-2">
            <span className="font-mono text-[12px] font-black tabular-nums leading-none text-white">{clock}</span>
            <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.22em] text-white/45">{periodLabel}</span>
          </div>
          <span className="flex min-w-[2rem] items-center justify-center bg-white px-2 font-mono text-lg font-black tabular-nums text-slate-950">
            {awayScore}
          </span>
          <TeamCode side="away">{awayName.slice(0, 4).toUpperCase()}</TeamCode>
        </div>
        <div className="h-[3px] bg-gradient-to-r from-cyan-400 via-white/80 to-rose-400" />
      </motion.div>

      <AnimatePresence mode="wait">
        {strap && (
          <motion.div
            key={strap}
            initial={reduceMotion ? false : { opacity: 0, y: -5, scaleX: 0.96 }}
            animate={{ opacity: 1, y: 0, scaleX: 1 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.2 }}
            className="ml-2 mt-1 w-fit max-w-[min(22rem,80vw)] rounded-sm border-l-4 border-amber-400 bg-slate-950/90 px-3 py-1 text-[10px] font-extrabold uppercase tracking-[0.16em] text-white shadow-lg backdrop-blur-md"
          >
            {strap}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
