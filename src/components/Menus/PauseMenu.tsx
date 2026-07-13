/**
 * PauseMenu — Escape-key pause overlay.
 * Pure React DOM / Tailwind, no renderer dependency.
 */
import React, { useEffect } from 'react';

interface PauseMenuProps {
  onResume: () => void;
  onRestart: () => void;
}

export function PauseMenu({ onResume, onRestart }: PauseMenuProps) {
  // Close on Escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'Escape') onResume();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onResume]);

  return (
    <div
      className="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.72)', backdropFilter: 'blur(4px)' }}
    >
      <div className="bg-gray-900/95 border border-white/15 rounded-2xl shadow-2xl p-8 min-w-[260px] flex flex-col gap-4 text-center">
        {/* Title */}
        <div className="mb-2">
          <span className="text-3xl">⚽</span>
          <h2 className="text-white text-xl font-bold tracking-wide mt-1">PAUSED</h2>
          <p className="text-white/40 text-xs mt-1">Press Esc to resume</p>
        </div>

        {/* Buttons */}
        <button
          onClick={onResume}
          className="w-full py-2.5 rounded-lg bg-green-600 hover:bg-green-500 text-white font-bold tracking-wide transition-colors"
        >
          Resume
        </button>

        <button
          onClick={onRestart}
          className="w-full py-2.5 rounded-lg bg-white/10 hover:bg-white/20 text-white/80 font-semibold tracking-wide transition-colors border border-white/10"
        >
          Restart
        </button>

        {/* Controls reminder */}
        <div className="mt-2 border-t border-white/10 pt-3 text-left">
          <p className="text-white/40 text-xs font-bold mb-1 uppercase tracking-widest">Controls</p>
          <div className="grid grid-cols-2 gap-x-2 gap-y-1 text-xs text-white/50">
            <span>Move</span>       <span className="text-white/70">WASD</span>
            <span>Sprint</span>     <span className="text-white/70">Shift</span>
            <span>Pass</span>       <span className="text-white/70">Space / J</span>
            <span>Shoot</span>      <span className="text-white/70">K</span>
          </div>
        </div>
      </div>
    </div>
  );
}
