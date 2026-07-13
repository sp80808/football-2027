import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { motionTransition, scaleIn, springSmooth, useReducedMotion } from '../ui/motionPresets';

interface SplashScreenProps { onStart: () => void; }
export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const reduced = useReducedMotion();
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const start = performance.now(); const duration = 2200; let frame = 0;
    const tick = (now: number) => { const p = Math.min(1, (now - start) / duration); setProgress(p); if (p < 1) frame = requestAnimationFrame(tick); else setReady(true); };
    frame = requestAnimationFrame(tick); return () => cancelAnimationFrame(frame);
  }, []);
  useEffect(() => {
    if (!ready) return;
    const handleStart = () => onStart();
    window.addEventListener('keydown', handleStart); window.addEventListener('click', handleStart);
    return () => { window.removeEventListener('keydown', handleStart); window.removeEventListener('click', handleStart); };
  }, [onStart, ready]);
  return (
    <div className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-slate-950">
      <div className="absolute top-1/2 left-1/2 h-[600px] w-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-blue-600/20 blur-[120px]" />
      <motion.div initial={scaleIn.initial} animate={scaleIn.animate} transition={motionTransition(reduced, { ...springSmooth, duration: reduced ? 0.01 : 1.1 })} className="z-10 flex flex-col items-center">
        <h1 className="mb-2 bg-gradient-to-r from-blue-400 to-emerald-400 bg-clip-text text-6xl font-black tracking-tighter text-transparent md:text-8xl">FOOTBALL 2027</h1>
        <p className="mb-12 text-sm font-semibold uppercase tracking-widest text-slate-400">Next Generation Simulation</p>
      </motion.div>
      <div className="absolute bottom-24 z-10 w-[min(320px,80vw)]">
        <div className="mb-3 h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div className="relative h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400" style={{ width: `${progress * 100}%` }}>
            {!reduced && (<motion.span className="absolute inset-y-0 w-1/3 bg-gradient-to-r from-transparent via-white/50 to-transparent" animate={{ x: ['-100%', '320%'] }} transition={{ duration: 1.2, repeat: Infinity, ease: 'linear' }} />)}
          </motion.div>
        </div>
        <motion.p animate={ready ? { opacity: [0.35, 1, 0.35] } : { opacity: 0.5 }} transition={{ duration: 2, repeat: ready ? Infinity : 0, ease: 'easeInOut' }} className="cursor-pointer text-center text-lg font-bold uppercase tracking-widest text-blue-200/80">{ready ? 'Press any key to start' : 'Loading…'}</motion.p>
      </div>
    </div>
  );
};
