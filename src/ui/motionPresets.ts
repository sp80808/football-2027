import { useEffect, useState } from 'react';
import type { Transition, Variant } from 'motion/react';

export const springSnappy: Transition = { type: 'spring', stiffness: 400, damping: 30 };
export const springSmooth: Transition = { type: 'spring', stiffness: 320, damping: 28 };
export const springBouncy: Transition = { type: 'spring', stiffness: 500, damping: 22 };

export const fadeUp = {
  initial: { opacity: 0, y: 8 } satisfies Variant,
  animate: { opacity: 1, y: 0 } satisfies Variant,
  exit: { opacity: 0, y: 4 } satisfies Variant,
};

export const fadeIn = {
  initial: { opacity: 0 } satisfies Variant,
  animate: { opacity: 1 } satisfies Variant,
  exit: { opacity: 0 } satisfies Variant,
};

export const scaleIn = {
  initial: { opacity: 0, scale: 0.88 } satisfies Variant,
  animate: { opacity: 1, scale: 1 } satisfies Variant,
  exit: { opacity: 0, scale: 0.95 } satisfies Variant,
};

export function slideFromSide(align: 'left' | 'right', staggerIndex = 0) {
  return {
    initial: { opacity: 0, x: align === 'left' ? -28 : 28, y: 10, scale: 0.94 },
    animate: { opacity: 1, x: 0, y: 0, scale: 1 },
    exit: { opacity: 0, x: align === 'left' ? -14 : 14, scale: 0.96 },
    transition: { ...springSmooth, delay: staggerIndex * 0.055 },
  };
}

export function useReducedMotion(): boolean {
  const [reduced, setReduced] = useState(() => {
    if (typeof window === 'undefined') return false;
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  return reduced;
}

export function motionTransition(reduced: boolean, transition: Transition): Transition {
  return reduced ? { duration: 0.01 } : transition;
}

export function tapScale(reduced: boolean, scale = 0.97) {
  return reduced ? undefined : { scale };
}

export function hoverLift(reduced: boolean) {
  return reduced ? undefined : { y: -3 };
}
