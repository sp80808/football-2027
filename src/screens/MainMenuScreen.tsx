import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { ControlBindingsPanel } from '../components/ControlGlyph';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { CORE_BINDINGS } from '../input/controlBindings';
import { Play, Trophy, Settings } from 'lucide-react';

interface MainMenuScreenProps {
  onNavigate: (screen: 'quickMatch' | 'career' | 'settings') => void;
}

export const MainMenuScreen: React.FC<MainMenuScreenProps> = ({ onNavigate }) => {
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.08, delayChildren: 0.15 },
    },
  };

  const itemVariants = {
    hidden: { y: 16, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: 'spring' as const, stiffness: 320, damping: 26 } },
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="relative flex h-screen w-screen overflow-hidden bg-surface"
    >
      <MenuBackdrop />

      <div className="relative z-10 flex h-full w-full flex-col px-8 py-10 md:px-16 lg:px-24">
        <div className="flex flex-1 flex-col justify-center gap-10 lg:flex-row lg:items-center lg:justify-between">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="max-w-xl"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.4em] text-accent-player">Season 2027</p>
            <h1 className="mb-3 text-5xl font-black tracking-tighter text-text-primary md:text-6xl lg:text-7xl">
              FOOTBALL
              <span className="block bg-gradient-to-r from-accent-action to-accent-player bg-clip-text text-transparent">
                2027
              </span>
            </h1>
            <p className="max-w-md text-base text-text-secondary md:text-lg">
              Deterministic broadcast football. Quick matches, career arcs, and FC26-style controls on any device.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="flex w-full max-w-sm flex-col gap-3"
          >
            <motion.div variants={itemVariants}>
              <Button size="lg" className="w-full justify-start gap-3 pl-6 text-lg" onClick={() => onNavigate('quickMatch')}>
                <Play className="text-accent-action" size={22} />
                Quick Match
              </Button>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button
                variant="secondary"
                size="lg"
                className="w-full justify-start gap-3 pl-6 text-lg"
                onClick={() => onNavigate('career')}
              >
                <Trophy className="text-accent-player" size={22} />
                Career Mode
              </Button>
            </motion.div>
            <motion.div variants={itemVariants}>
              <Button
                variant="secondary"
                size="lg"
                className="w-full justify-start gap-3 pl-6 text-lg"
                onClick={() => onNavigate('settings')}
              >
                <Settings className="text-text-muted" size={22} />
                Settings
              </Button>
            </motion.div>
          </motion.div>
        </div>

        <div className="mt-8">
          <ControlBindingsPanel bindings={CORE_BINDINGS} title="Your controls" className="max-w-md border-border-strong bg-surface-hud/80" />
        </div>

        {import.meta.env.DEV && (
          <p className="absolute bottom-4 right-6 font-mono text-[10px] text-text-subtle">
            dev · v{import.meta.env.VITE_APP_VERSION ?? '0.1.0'}
          </p>
        )}
      </div>
    </motion.div>
  );
};
