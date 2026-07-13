import React from 'react';
import { GLASS, cn } from '../../ui/designTokens';

export function GlassPanel({
  children,
  className = '',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: string;
  padding?: string;
  rounded?: string;
}) {
  return (
    <div className={cn(GLASS.hud, 'rounded-xl p-3', className)}>
      {children}
    </div>
  );
}
