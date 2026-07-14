import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { motionTransition, scaleIn, springSmooth, useReducedMotion } from '../ui/motionPresets';

interface SplashScreenProps {
  onStart: () => void;
}

const LOAD_DURATION_MS = 1900;

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const start = performance.now();
    let frame = 0;

    const tick = (now: number) => {
      const nextProgress = Math.min(1, (now - start) / LOAD_DURATION_MS);
      setProgress(nextProgress);

      if (nextProgress < 1) frame = requestAnimationFrame(tick);
      else setReady(true);
    };

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, []);

  useEffect(() => {
    if (!ready) return;

    const handleStart = () => onStart();
    window.addEventListener('keydown', handleStart);
    return () => window.removeEventListener('keydown', handleStart);
  }, [onStart, ready]);

  return (
    <main className="relative isolate flex min-h-screen w-screen items-center overflow-hidden bg-[#07101C] text-[#F2F7FF]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: "url('/brand/football-2027-splash-background.svg')" }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#07101C] via-[#07101C]/85 to-transparent" />

      <section className="relative z-10 flex w-full max-w-3xl flex-col px-7 py-12 sm:px-12 lg:ml-[7vw] lg:px-0">
        <motion.div
          initial={scaleIn.initial}
          animate={scaleIn.animate}
          transition={motionTransition(reduced, { ...springSmooth, duration: reduced ? 0.01 : 0.85 })}
          className="max-w-[680px]"
        >
          <img
            src="/brand/football-2027-lockup-horizontal.svg"
            alt="Football 2027 — The next match starts here"
            className="h-auto w-full max-w-[620px]"
          />

          <p className="mt-8 max-w-xl text-base font-medium leading-7 text-[#95A4B8] sm:text-lg">
            Build a club from the ground up. Shape the squad. Play every decisive moment.
          </p>
        </motion.div>

        <div className="mt-16 w-full max-w-md" aria-live="polite">
          <div className="mb-3 flex items-center justify-between text-xs font-bold uppercase tracking-[0.2em] text-[#95A4B8]">
            <span>{ready ? 'Match ready' : 'Preparing the pitch'}</span>
            <span className="font-mono tabular-nums text-[#14D1E6]">{Math.round(progress * 100)}%</span>
          </div>

          <div className="h-1.5 overflow-hidden rounded-full bg-[#304058]/55">
            <motion.div
              className="relative h-full rounded-full bg-gradient-to-r from-[#14D1E6] to-[#33D677]"
              style={{ width: `${progress * 100}%` }}
            >
              {!reduced && !ready && (
                <motion.span
                  className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/55 to-transparent"
                  animate={{ x: ['-100%', '320%'] }}
                  transition={{ duration: 1.1, repeat: Infinity, ease: 'linear' }}
                />
              )}
            </motion.div>
          </div>

          <motion.button
            type="button"
            disabled={!ready}
            onClick={onStart}
            animate={ready && !reduced ? { opacity: [0.62, 1, 0.62] } : { opacity: ready ? 1 : 0.48 }}
            transition={{ duration: 1.8, repeat: ready && !reduced ? Infinity : 0, ease: 'easeInOut' }}
            className="mt-6 min-h-12 w-full rounded-xl border border-[#304058] bg-[#0E1B2B]/85 px-5 text-sm font-black uppercase tracking-[0.18em] text-[#F2F7FF] shadow-2xl backdrop-blur-md transition hover:border-[#14D1E6]/70 hover:bg-[#16263A] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14D1E6] focus-visible:ring-offset-2 focus-visible:ring-offset-[#07101C] disabled:cursor-wait"
          >
            {ready ? 'Press any key to start' : 'Loading…'}
          </motion.button>
        </div>
      </section>

      <footer className="absolute bottom-5 left-7 z-10 font-mono text-[11px] uppercase tracking-[0.18em] text-[#64748B] sm:left-12 lg:left-[7vw]">
        F27 pre-alpha · deterministic match engine
      </footer>
    </main>
  );
};
