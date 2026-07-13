import React from 'react';
import { cn } from '../../ui/designTokens';

export function Chip({
  children,
  className = '',
  side,
}: {
  children: React.ReactNode;
  className?: string;
  side?: 'player' | 'opponent' | 'warning';
}) {
  const sideClass =
    side === 'warning'
      ? 'border-amber-500/35 bg-amber-500/15 text-amber-200'
      : side === 'player'
        ? 'border-emerald-500/35 bg-emerald-500/15 text-emerald-200'
        : side === 'opponent'
          ? 'border-red-500/35 bg-red-500/15 text-red-200'
          : 'border-white/10 bg-white/5 text-white/70';

  return (
    <span className={cn('inline-flex items-center gap-2 rounded-lg border px-2.5 py-1.5 backdrop-blur-sm', sideClass, className)}>
      {children}
    </span>
  );
}
