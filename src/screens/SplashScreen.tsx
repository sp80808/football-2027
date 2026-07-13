import React, { useCallback, useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { markSplashSeen, preloadGameAssets } from '../input/useInputDevice';

interface SplashScreenProps {
  onStart: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  const [progress, setProgress] = useState(0);
  const [ready, setReady] = useState(false);

  const finish = useCallback(() => {
    markSplashSeen();
    onStart();
  }, [onStart]);

  useEffect(() => {
    let cancelled = false;
    preloadGameAssets((p) => {
      if (!cancelled) setProgress(p);
    }).then(() => {
      if (!cancelled) setReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!ready) return;
    const handleStart = () => finish();
    window.addEventListener('keydown', handleStart);
    window.addEventListener('click', handleStart);
    return () => {
      window.removeEventListener('keydown', handleStart);
      window.removeEventListener('click', handleStart);
    };
  }, [ready, finish]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0, y: -12 }}
      transition={{ duration: 0.45 }}
      className="relative flex h-screen w-screen flex-col items-center justify-center overflow-hidden bg-surface"
    >
      <MenuBackdrop />

      <div className="pointer-events-none absolute top-1/2 left-1/2 h-[520px] w-[520px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-accent-action-bg blur-[120px]" />

      <motion.div
        initial={{ scale: 0.88, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.1, ease: 'easeOut' }}
        className="z-10 flex flex-col items-center"
      >
        <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl border border-accent-player-border bg-accent-player-bg shadow-glass">
          <span className="text-2xl font-black text-accent-player">27</span>
        </div>
        <h1 className="mb-2 bg-gradient-to-r from-accent-action via-accent-player to-accent-action bg-clip-text text-5xl font-black tracking-tighter text-transparent md:text-7xl">
          FOOTBALL 2027
        </h1>
        <p className="text-sm font-semibold uppercase tracking-[0.35em] text-text-muted">Broadcast Simulation</p>
      </motion.div>

      <div className="absolute bottom-24 z-10 w-full max-w-xs px-6">
        <div className="mb-2 flex justify-between text-[10px] font-semibold uppercase tracking-widest text-text-muted">
          <span>{ready ? 'Ready' : 'Loading assets'}</span>
          <span>{Math.round(progress * 100)}%</span>
        </div>
        <div className="h-1 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-gradient-to-r from-accent-action to-accent-player"
            initial={{ width: '0%' }}
            animate={{ width: `${Math.max(progress * 100, ready ? 100 : 8)}%` }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          />
        </div>
      </div>

      <motion.p
        animate={{ opacity: ready ? [0.4, 1, 0.4] : 0.35 }}
        transition={{ duration: 2, repeat: ready ? Infinity : 0, ease: 'easeInOut' }}
        className="absolute bottom-10 z-10 cursor-pointer text-sm font-bold uppercase tracking-widest text-accent-action"
      >
        {ready ? 'Press any key to continue' : 'Preparing match engine…'}
      </motion.p>
    </motion.div>
  );
};
