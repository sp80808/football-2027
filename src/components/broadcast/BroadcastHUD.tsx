import React from 'react';
import { Clock } from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { type PlayEvent, useGameStore } from '../../store/gameStore';
import { formatBroadcastClock, getPeriodLabel } from '../../utils/matchTime';

interface BroadcastHUDProps {
  celebrating: boolean;
}

function ScoreDigit({ value, tone }: { value: number; tone: string }) {
  const reduceMotion = useReducedMotion();

  return (
    <span className="relative grid min-w-7 place-items-center overflow-hidden font-mono text-2xl font-black tabular-nums leading-none">
      <AnimatePresence initial={false} mode="popLayout">
        <motion.span
          key={value}
          initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -16, scale: 0.86 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 16, scale: 0.86 }}
          transition={{ duration: reduceMotion ? 0.12 : 0.28, ease: 'easeOut' }}
          className={tone}
        >
          {value}
        </motion.span>
      </AnimatePresence>
    </span>
  );
}

function EventChip({ event, align }: { event: PlayEvent; align: 'left' | 'right' }) {
  const reduceMotion = useReducedMotion();
  const isHome = event.side === 'home';
  const accent = event.kind === 'offside'
    ? 'border-amber-300/35 bg-amber-950/80'
    : isHome
      ? 'border-emerald-300/35 bg-emerald-950/80'
      : 'border-red-300/35 bg-red-950/80';

  return (
    <motion.div
      layout
      initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: align === 'left' ? -30 : 30 }}
      animate={{ opacity: 1, x: 0 }}
      exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: align === 'left' ? -20 : 20 }}
      transition={{ duration: reduceMotion ? 0.12 : 0.25, ease: 'easeOut' }}
      className={`flex max-w-64 items-stretch overflow-hidden rounded-sm border shadow-[0_8px_28px_rgba(0,0,0,0.35)] ${accent} ${align === 'right' ? 'flex-row-reverse' : ''}`}
    >
      <span className="grid min-w-12 place-items-center bg-black/35 px-2 font-mono text-[10px] tabular-nums text-white/65">
        {event.matchMinute}'
      </span>
      <span className="px-3 py-2 text-[11px] font-bold uppercase tracking-[0.08em] text-white">
        {event.label}
      </span>
    </motion.div>
  );
}

function EventStack({ side, align }: { side: 'home' | 'away'; align: 'left' | 'right' }) {
  const events = useGameStore((state) => state.playEvents);
  const visible = events.filter((event) => event.side === side).slice(-3);

  return (
    <div className={`pointer-events-none absolute bottom-4 z-10 flex max-w-[42vw] flex-col gap-1.5 ${align === 'left' ? 'left-3 items-start sm:left-4' : 'right-3 items-end sm:right-4'}`}>
      <AnimatePresence initial={false} mode="popLayout">
        {visible.map((event) => <EventChip key={event.id} event={event} align={align} />)}
      </AnimatePresence>
    </div>
  );
}

export function BroadcastHUD({ celebrating }: BroadcastHUDProps) {
  const homeScore = useGameStore((state) => state.homeScore);
  const awayScore = useGameStore((state) => state.awayScore);
  const elapsedSeconds = useGameStore((state) => state.elapsedSeconds);
  const phase = useGameStore((state) => state.phase);
  const announcement = useGameStore((state) => state.announcement);
  const half = useGameStore((state) => state.half);
  const reduceMotion = useReducedMotion();

  const periodLabel = phase === 'halftime'
    ? 'HALF TIME'
    : phase === 'full_time'
      ? 'FULL TIME'
      : phase === 'kickoff' && half === 2
        ? '2ND HALF'
        : getPeriodLabel(elapsedSeconds);

  const banner = announcement || (celebrating ? 'GOAL — KICK-OFF SOON' : null);

  return (
    <>
      <EventStack side="home" align="left" />
      <EventStack side="away" align="right" />

      <div className="pointer-events-none absolute left-3 top-3 z-20 select-none sm:left-4 sm:top-4">
        <motion.div layout className="overflow-hidden rounded-sm border border-white/15 bg-[#07110d]/92 shadow-[0_8px_30px_rgba(0,0,0,0.42)] backdrop-blur-md">
          <div className="flex h-11 items-stretch">
            <div className="flex items-center gap-2 border-r border-white/10 bg-emerald-950/90 px-3">
              <span className="hidden text-[9px] font-black uppercase tracking-[0.18em] text-emerald-100/70 sm:block">HOME</span>
              <ScoreDigit value={homeScore} tone="text-emerald-300" />
            </div>

            <div className="flex min-w-[5.25rem] flex-col items-center justify-center bg-black/65 px-3">
              <span className="font-mono text-sm font-black tabular-nums tracking-tight text-white">
                {formatBroadcastClock(elapsedSeconds)}
              </span>
              <span className="mt-0.5 text-[7px] font-bold uppercase tracking-[0.24em] text-white/45">
                {periodLabel}
              </span>
            </div>

            <div className="flex items-center gap-2 border-l border-white/10 bg-red-950/90 px-3">
              <ScoreDigit value={awayScore} tone="text-red-300" />
              <span className="hidden text-[9px] font-black uppercase tracking-[0.18em] text-red-100/70 sm:block">AWAY</span>
            </div>
          </div>

          <div className="h-0.5 bg-gradient-to-r from-emerald-400 via-white/80 to-red-400" />
        </motion.div>

        <AnimatePresence initial={false}>
          {banner && (
            <motion.div
              initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scaleX: 0.94 }}
              animate={{ opacity: 1, y: 0, scaleX: 1 }}
              exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -8, scaleX: 0.94 }}
              transition={{ duration: reduceMotion ? 0.12 : 0.24, ease: 'easeOut' }}
              className="mt-1 flex w-fit items-center gap-1.5 rounded-sm border border-amber-300/30 bg-amber-950/90 px-3 py-1 text-[9px] font-black uppercase tracking-[0.16em] text-amber-200 shadow-lg"
            >
              <Clock size={10} />
              {banner}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );
}
