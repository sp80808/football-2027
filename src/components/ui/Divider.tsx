import React from 'react';
import { cn } from '../../ui/designTokens';
export function Divider({ className = '' }: { className?: string }) {
  return <hr className={cn('border-0 border-t border-border', className)} />;
}
