import React, { useEffect } from 'react';
import { motion } from 'motion/react';

interface SplashScreenProps {
  onStart: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onStart }) => {
  useEffect(() => {
    const handleKeyPress = () => onStart();
    window.addEventListener('keydown', handleKeyPress);
    window.addEventListener('click', handleKeyPress);
    
    return () => {
      window.removeEventListener('keydown', handleKeyPress);
      window.removeEventListener('click', handleKeyPress);
    };
  }, [onStart]);

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col items-center justify-center relative overflow-hidden">
      {/* Background ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-blue-600/20 rounded-full blur-[120px]" />
      
      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 1.5, ease: "easeOut" }}
        className="z-10 flex flex-col items-center"
      >
        <h1 className="text-6xl md:text-8xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-emerald-400 tracking-tighter mb-2">
          FOOTBALL 2027
        </h1>
        <p className="text-slate-400 tracking-widest uppercase text-sm mb-20 font-semibold">
          Next Generation Simulation
        </p>
      </motion.div>
      
      <motion.p
        animate={{ opacity: [0.3, 1, 0.3] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="absolute bottom-20 text-blue-200/80 font-bold tracking-widest text-lg uppercase cursor-pointer z-10"
      >
        Press any key to start
      </motion.p>
    </div>
  );
};
