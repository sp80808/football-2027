import React from 'react';
import { TYPO, cn } from '../../ui/designTokens';
export function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <p className={cn(TYPO.sectionLabel, 'mb-2', className)}>{children}</p>;
}
