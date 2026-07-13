import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';
import { fadeUp, motionTransition, springSmooth, useReducedMotion } from '../../ui/motionPresets';

interface PanelProps extends HTMLMotionProps<'div'> {
  children: React.ReactNode;
  title?: string;
  hoverable?: boolean;
}

export const Panel: React.FC<PanelProps> = ({
  children,
  title,
  hoverable = false,
  className = '',
  initial,
  animate,
  exit,
  transition,
  whileHover,
  ...props
}) => {
  const reduced = useReducedMotion();

  return (
    <motion.div
      initial={initial ?? fadeUp.initial}
      animate={animate ?? fadeUp.animate}
      exit={exit ?? fadeUp.exit}
      transition={transition ?? motionTransition(reduced, springSmooth)}
      whileHover={
        whileHover ??
        (hoverable && !reduced
          ? { y: -4, boxShadow: '0 20px 40px -12px rgba(59, 130, 246, 0.25)' }
          : undefined)
      }
      className={`bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden transition-[border-color,box-shadow] duration-300 ${hoverable ? 'hover:border-slate-500/70' : ''} ${className}`}
      {...props}
    >
      {title && (
        <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <h2 className="text-xl font-bold text-white tracking-wide uppercase m-0">{title}</h2>
        </div>
      )}
      <div className="p-6">{children}</div>
    </motion.div>
  );
};
