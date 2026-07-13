import React from 'react';
import { cn } from '../../ui/designTokens';

export function Badge({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: string;
}) {
  return (
    <span className={cn('inline-flex rounded-full border border-white/15 bg-white/10 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-white/80', className)}>
      {children}
    </span>
  );
}
