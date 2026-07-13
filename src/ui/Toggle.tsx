import React from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { motionTransition, springSnappy, useReducedMotion } from './motionPresets';

interface ToggleProps {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  onIcon?: React.ReactNode;
  offIcon?: React.ReactNode;
}

export function Toggle({ label, checked, onChange, onIcon, offIcon }: ToggleProps) {
  const reduced = useReducedMotion();
  const showIcons = onIcon != null || offIcon != null;

  return (
    <label className="flex cursor-pointer items-center justify-between gap-3">
      <span className="text-sm text-white/80">{label}</span>
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        aria-label={label}
        onClick={() => onChange(!checked)}
        className={`relative h-6 shrink-0 rounded-full border transition-colors ${showIcons ? 'w-14' : 'w-11'} ${checked ? 'border-blue-400/50 bg-blue-500/40' : 'border-white/15 bg-white/10'}`}
      >
        {showIcons && (
          <span className="pointer-events-none absolute inset-0 flex items-center justify-between px-1.5">
            <AnimatePresence mode="wait" initial={false}>
              {checked ? (
                <motion.span
                  key="on"
                  initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.6 }}
                  transition={motionTransition(reduced, springSnappy)}
                  className="text-white/90"
                >
                  {onIcon}
                </motion.span>
              ) : (
                <motion.span
                  key="off"
                  initial={reduced ? false : { opacity: 0, scale: 0.6 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={reduced ? undefined : { opacity: 0, scale: 0.6 }}
                  transition={motionTransition(reduced, springSnappy)}
                  className="ml-auto text-white/40"
                >
                  {offIcon}
                </motion.span>
              )}
            </AnimatePresence>
          </span>
        )}
        <motion.span
          layout={!reduced}
          transition={motionTransition(reduced, springSnappy)}
          className="absolute top-0.5 left-0.5 z-10 h-5 w-5 rounded-full bg-white shadow"
          animate={{ x: checked ? (showIcons ? 32 : 20) : 0 }}
        />
      </button>
    </label>
  );
}
