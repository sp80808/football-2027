import React from 'react';
export function MenuBackdrop() {
  return (
    <>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_0%,rgba(16,185,129,0.12),transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_50%_at_100%_50%,rgba(59,130,246,0.14),transparent_60%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.2)_0%,rgba(2,6,23,0.95)_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-1/2 opacity-[0.07]">
        <div className="absolute inset-x-[8%] bottom-0 h-[72%] rounded-t-[40%] border border-emerald-400/50 bg-emerald-500/10" />
        <div className="absolute inset-x-[18%] bottom-[8%] h-[2px] bg-white/40" />
        <div className="absolute left-1/2 top-[18%] h-[58%] w-[2px] -translate-x-1/2 bg-white/30" />
      </div>
    </>
  );
}
