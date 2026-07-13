import React from 'react';
import { GLASS, cn } from '../../ui/designTokens';

type GlassVariant = keyof typeof GLASS;
type Padding = 'none' | 'sm' | 'md' | 'lg';

const paddingClass: Record<Padding, string> = {
  none: 'p-0',
  sm: 'p-2 sm:p-3',
  md: 'p-4 sm:p-5',
  lg: 'p-6',
};

export function GlassPanel({
  children,
  className = '',
  variant = 'hud',
  padding = 'sm',
}: {
  children: React.ReactNode;
  className?: string;
  variant?: GlassVariant;
  padding?: Padding;
}) {
  return (
    <div className={cn(GLASS[variant], 'rounded-xl', paddingClass[padding], className)}>
      {children}
    </div>
  );
}
