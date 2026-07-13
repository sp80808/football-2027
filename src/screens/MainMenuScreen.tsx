import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Play, Trophy, Settings } from 'lucide-react';
import { fadeUp, hoverLift, motionTransition, springSmooth, useReducedMotion } from '../ui/motionPresets';

interface MainMenuScreenProps { onNavigate: (screen: 'quickMatch' | 'career' | 'settings') => void; }
export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ onNavigate }) => {
  const reduced = useReducedMotion();
  const containerVariants = { hidden: { opacity: 0 }, visible: { opacity: 1, transition: { staggerChildren: reduced ? 0 : 0.1, delayChildren: 0.2 } } };
  const itemVariants = { hidden: { x: -50, opacity: 0 }, visible: { x: 0, opacity: 1, transition: motionTransition(reduced, springSmooth) } };
  const menuItems = [
    { key: 'quickMatch' as const, variant: 'primary' as const, icon: <Play className="mr-2 text-blue-400" size={24} />, label: 'Quick Match' },
    { key: 'career' as const, variant: 'secondary' as const, icon: <Trophy className="mr-2 text-emerald-400" size={24} />, label: 'Career Mode' },
    { key: 'settings' as const, variant: 'secondary' as const, icon: <Settings className="mr-2 text-slate-400" size={24} />, label: 'Settings' },
  ];
  return (
    <div className="relative flex h-screen w-screen overflow-hidden bg-slate-950">
      <div className="absolute top-0 right-0 h-full w-2/3 bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-blue-900/20 via-slate-900/10 to-transparent opacity-60" />
      <div className="absolute -right-40 top-1/2 -translate-y-1/2 opacity-10"><div className="h-[800px] w-[800px] rounded-full border-[40px] border-blue-500/20" /></div>
      <div className="z-10 flex h-full w-1/2 flex-col justify-center px-24">
        <motion.div initial={fadeUp.initial} animate={fadeUp.animate} transition={motionTransition(reduced, springSmooth)} className="mb-16">
          <h1 className="mb-2 text-5xl font-black tracking-tighter text-white">FOOTBALL 2027</h1>
          <div className="h-1 w-24 rounded-full bg-blue-500" />
        </motion.div>
        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex w-80 flex-col gap-4">
          {menuItems.map((item) => (
            <motion.div key={item.key} variants={itemVariants} whileHover={hoverLift(reduced)} className="rounded-md transition-[box-shadow] hover:shadow-lg hover:shadow-blue-500/10">
              <Button variant={item.variant} size="lg" className="w-full justify-start pl-6 text-xl" onClick={() => onNavigate(item.key)}>{item.icon}{item.label}</Button>
            </motion.div>
          ))}
        </motion.div>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: reduced ? 0 : 1 }} className="absolute bottom-12 font-mono text-sm text-slate-500">v0.1.0 Alpha Build</motion.div>
      </div>
    </div>
  );
};
