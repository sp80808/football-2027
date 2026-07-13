import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { FOCUS_RING, cn } from '../../ui/designTokens';
import { springSnappy, tapScale, useReducedMotion } from '../../ui/motionPresets';

interface ButtonProps extends HTMLMotionProps<'button'> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

const variants = {
  primary: 'border-accent-action-border bg-accent-action-bg text-text-primary shadow-glass hover:bg-accent-action/25',
  secondary: 'border-border-strong bg-surface-elevated text-text-secondary shadow-glass hover:bg-white/10 hover:text-text-primary',
  danger: 'border-accent-opponent-border bg-accent-opponent-bg text-text-primary shadow-glass hover:bg-accent-opponent/25',
  ghost: 'border-transparent bg-transparent text-text-primary shadow-none hover:bg-white/10 hover:border-border',
};
const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-5 py-2.5 text-sm', lg: 'px-8 py-4 text-base', xl: 'px-12 py-6 text-xl' };

export const Button: React.FC<ButtonProps> = ({ variant = 'primary', size = 'md', children, className = '', whileHover, whileTap, transition, ...props }) => {
  const reduced = useReducedMotion();
  return (
    <motion.button whileHover={whileHover ?? (reduced ? undefined : { scale: 1.02 })} whileTap={whileTap ?? tapScale(reduced, 0.97)} transition={transition ?? springSnappy}
      className={cn('group relative flex cursor-pointer items-center justify-center gap-2 overflow-hidden rounded-md border font-bold uppercase tracking-wider backdrop-blur-sm transition-colors', variants[variant], sizes[size], FOCUS_RING, className)} {...props}>
      <span className="absolute inset-0 translate-y-full bg-white/10 transition-transform duration-300 ease-out group-hover:translate-y-0" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};
export const PrimaryButton = Button;
export const SecondaryButton: React.FC<Omit<ButtonProps, 'variant'>> = (p) => <Button variant="secondary" {...p} />;
