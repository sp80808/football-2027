import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface PanelProps extends HTMLMotionProps<"div"> {
  children: React.ReactNode;
  title?: string;
}

export const Panel: React.FC<PanelProps> = ({ 
  children, 
  title,
  className = '',
  ...props 
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className={`bg-slate-900/80 backdrop-blur-md border border-slate-700/50 rounded-xl shadow-2xl overflow-hidden ${className}`}
      {...props}
    >
      {title && (
        <div className="px-6 py-4 border-b border-slate-700/50 bg-slate-800/50">
          <h2 className="text-xl font-bold text-white tracking-wide uppercase m-0">{title}</h2>
        </div>
      )}
      <div className="p-6">
        {children}
      </div>
    </motion.div>
  );
};
