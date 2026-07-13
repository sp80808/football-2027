import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Play, Trophy, Settings, X } from 'lucide-react';

interface MainMenuScreenProps {
  onNavigate: (screen: 'quickMatch' | 'career' | 'settings') => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ onNavigate }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: { 
      opacity: 1,
      transition: { 
        staggerChildren: 0.1,
        delayChildren: 0.2
      }
    }
  };

  const itemVariants = {
    hidden: { x: -50, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: { type: 'spring', stiffness: 300, damping: 24 } }
  };

  return (
    <div className="w-screen h-screen bg-slate-950 flex relative overflow-hidden">
      {/* Background Graphic */}
      <div className="absolute top-0 right-0 w-2/3 h-full bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/10 to-transparent opacity-60" />
      <div className="absolute -right-40 top-1/2 -translate-y-1/2 opacity-10">
         {/* Placeholder for a large stylized football or player graphic */}
         <div className="w-[800px] h-[800px] rounded-full border-[40px] border-blue-500/20" />
      </div>

      <div className="w-1/2 h-full flex flex-col justify-center px-24 z-10">
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="mb-16"
        >
          <h1 className="text-5xl font-black text-white tracking-tighter mb-2">FOOTBALL 2027</h1>
          <div className="h-1 w-24 bg-blue-500 rounded-full" />
        </motion.div>

        <motion.div 
          variants={containerVariants}
          initial="hidden"
          animate="visible"
          className="flex flex-col gap-4 w-80"
        >
          <motion.div variants={itemVariants}>
            <Button 
              size="lg" 
              className="w-full justify-start pl-6 text-xl"
              onClick={() => onNavigate('quickMatch')}
            >
              <Play className="text-blue-400 mr-2" size={24} />
              Quick Match
            </Button>
          </motion.div>
          
          <motion.div variants={itemVariants}>
            <Button 
              variant="secondary" 
              size="lg" 
              className="w-full justify-start pl-6 text-xl"
              onClick={() => onNavigate('career')}
            >
              <Trophy className="text-emerald-400 mr-2" size={24} />
              Career Mode
            </Button>
          </motion.div>

          <motion.div variants={itemVariants}>
            <Button 
              variant="secondary" 
              size="lg" 
              className="w-full justify-start pl-6 text-xl"
              onClick={() => onNavigate('settings')}
            >
              <Settings className="text-slate-400 mr-2" size={24} />
              Settings
            </Button>
          </motion.div>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="absolute bottom-12 text-sm text-slate-500 font-mono"
        >
          v0.1.0 Alpha Build
        </motion.div>
      </div>
    </div>
  );
};
