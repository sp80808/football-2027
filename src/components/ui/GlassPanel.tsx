import React from 'react';
import { GLASS, cn } from '../../ui/designTokens';
type GlassVariant = 'hud' | 'elevated' | 'overlay';
type GlassPadding = 'none' | 'sm' | 'md' | 'lg';
const paddingMap: Record<GlassPadding, string> = { none: 'p-0', sm: 'p-2', md: 'p-3', lg: 'p-5' };
export function GlassPanel({ children, className = '', variant = 'hud', padding = 'md', rounded = 'xl' }: {
  children: React.ReactNode; className?: string; variant?: GlassVariant; padding?: GlassPadding; rounded?: 'lg' | 'xl' | '2xl';
}) {
  const roundedClass = rounded === '2xl' ? 'rounded-2xl' : rounded === 'lg' ? 'rounded-lg' : 'rounded-xl';
  return <div className={cn(GLASS[variant], roundedClass, paddingMap[padding], className)}>{children}</div>;
}
