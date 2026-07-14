import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Play, Settings, Trophy } from 'lucide-react';
import { fadeUp, hoverLift, motionTransition, springSmooth, useReducedMotion } from '../ui/motionPresets';

interface MainMenuScreenProps {
  onNavigate: (screen: 'quickMatch' | 'career' | 'settings') => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ onNavigate }) => {
  const reduced = useReducedMotion();
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: reduced ? 0 : 0.08, delayChildren: reduced ? 0 : 0.18 },
    },
  };
  const itemVariants = {
    hidden: { x: -36, opacity: 0 },
    visible: { x: 0, opacity: 1, transition: motionTransition(reduced, springSmooth) },
  };
  const menuItems = [
    { key: 'quickMatch' as const, variant: 'primary' as const, icon: <Play className="mr-3 text-[#14D1E6]" size={22} />, label: 'Play quick match', detail: 'Kick off immediately' },
    { key: 'career' as const, variant: 'secondary' as const, icon: <Trophy className="mr-3 text-[#33D677]" size={22} />, label: 'Build a career', detail: 'Grow the club and squad' },
    { key: 'settings' as const, variant: 'secondary' as const, icon: <Settings className="mr-3 text-[#95A4B8]" size={22} />, label: 'Settings', detail: 'Controls, audio and display' },
  ];

  return (
    <main className="relative isolate flex min-h-screen w-screen overflow-hidden bg-[#07101C] text-[#F2F7FF]">
      <div
        aria-hidden="true"
        className="absolute inset-0 bg-cover bg-center opacity-70"
        style={{ backgroundImage: "url('/brand/football-2027-splash-background.svg')" }}
      />
      <div aria-hidden="true" className="absolute inset-0 bg-gradient-to-r from-[#07101C] via-[#07101C]/95 to-[#07101C]/30" />

      <section className="relative z-10 flex min-h-screen w-full max-w-2xl flex-col justify-center px-7 py-16 sm:px-12 lg:ml-[7vw] lg:px-0">
        <motion.div
          initial={fadeUp.initial}
          animate={fadeUp.animate}
          transition={motionTransition(reduced, springSmooth)}
          className="mb-12"
        >
          <img
            src="/brand/football-2027-lockup-horizontal.svg"
            alt="Football 2027"
            className="h-auto w-full max-w-[470px]"
          />
          <p className="mt-6 max-w-lg text-base leading-7 text-[#95A4B8]">
            Start with the next match or build a club that can climb the pyramid.
          </p>
        </motion.div>

        <motion.div variants={containerVariants} initial="hidden" animate="visible" className="flex w-full max-w-md flex-col gap-3">
          {menuItems.map((item) => (
            <motion.div key={item.key} variants={itemVariants} whileHover={hoverLift(reduced)}>
              <Button
                variant={item.variant}
                size="lg"
                className="group min-h-16 w-full justify-start rounded-xl border border-white/10 bg-[#0E1B2B]/88 px-5 text-left shadow-xl backdrop-blur-md transition hover:border-[#14D1E6]/45 hover:bg-[#16263A] focus-visible:ring-[#14D1E6]"
                onClick={() => onNavigate(item.key)}
              >
                {item.icon}
                <span className="flex flex-col">
                  <span className="text-base font-black tracking-tight text-[#F2F7FF]">{item.label}</span>
                  <span className="mt-0.5 text-xs font-medium text-[#95A4B8] group-hover:text-[#F2F7FF]/75">{item.detail}</span>
                </span>
              </Button>
            </motion.div>
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: reduced ? 0 : 0.75 }}
          className="mt-10 font-mono text-xs uppercase tracking-[0.16em] text-[#64748B]"
        >
          F27 pre-alpha · vertical slice in development
        </motion.p>
      </section>
    </main>
  );
};
