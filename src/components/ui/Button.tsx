import React from 'react';
import { motion, HTMLMotionProps } from 'motion/react';

interface ButtonProps extends HTMLMotionProps<"button"> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
  size?: 'sm' | 'md' | 'lg' | 'xl';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({ 
  variant = 'primary', 
  size = 'md', 
  children, 
  className = '',
  ...props 
}) => {
  const baseStyle = "font-bold tracking-wider uppercase rounded-md transition-colors flex items-center justify-center gap-2 border shadow-lg backdrop-blur-sm relative overflow-hidden group cursor-pointer";
  
  const variants = {
    primary: "bg-blue-600/80 hover:bg-blue-500/90 border-blue-400 text-white shadow-blue-500/30",
    secondary: "bg-slate-800/80 hover:bg-slate-700/90 border-slate-600 text-slate-200 shadow-slate-900/50",
    danger: "bg-red-600/80 hover:bg-red-500/90 border-red-400 text-white shadow-red-500/30",
    ghost: "bg-transparent hover:bg-white/10 border-transparent hover:border-white/20 text-white shadow-none",
  };

  const sizes = {
    sm: "px-3 py-1.5 text-xs",
    md: "px-5 py-2.5 text-sm",
    lg: "px-8 py-4 text-base",
    xl: "px-12 py-6 text-xl",
  };

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      className={`${baseStyle} ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}
    >
      <span className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out" />
      <span className="relative z-10 flex items-center gap-2">{children}</span>
    </motion.button>
  );
};
