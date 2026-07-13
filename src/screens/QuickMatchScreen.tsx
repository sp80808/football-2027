import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { ControlGlyphStrip } from '../components/ControlGlyph';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { ChevronLeft, Play, User, Cpu } from 'lucide-react';

interface QuickMatchScreenProps {
  onBack: () => void;
  onStartMatch: () => void;
}

export const QuickMatchScreen: React.FC<QuickMatchScreenProps> = ({ onBack, onStartMatch }) => {
  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-surface p-8">
      <MenuBackdrop />

      <div className="relative z-10 mb-12 flex items-center justify-between">
        <div className="flex items-center gap-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ChevronLeft size={32} />
          </Button>
          <h1 className="m-0 text-4xl font-black uppercase tracking-widest text-text-primary">Quick Match</h1>
        </div>
        <Button size="lg" onClick={onStartMatch}>
          <Play size={20} className="mr-2" /> Play Match
        </Button>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-7xl flex-1 items-center justify-center gap-12">
        <motion.div initial={{ x: -50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1">
          <Panel hoverable className="border-accent-player-border bg-gradient-to-br from-surface-elevated to-accent-player-bg/20 shadow-glass">
            <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
              <h2 className="m-0 text-3xl font-black uppercase tracking-wide text-text-primary">Home Team</h2>
              <div className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-accent-player-border bg-accent-player-bg px-3 py-1 text-sm font-bold uppercase tracking-wider text-accent-player">
                <User size={16} /> Player 1
              </div>
            </div>
            <div className="mb-6 flex h-48 items-center justify-center rounded-xl border border-border bg-surface-hud">
              <span className="text-6xl font-black tracking-tighter text-text-subtle">TEAM A</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white/5 p-4 text-center">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-text-muted">Overall</div>
                <div className="text-3xl font-black text-text-primary">85</div>
              </div>
              <div className="rounded-lg bg-white/5 p-4 text-center">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-text-muted">Formation</div>
                <div className="mt-1 text-xl font-bold text-text-primary">4-3-3</div>
              </div>
            </div>
          </Panel>
        </motion.div>

        <div className="text-4xl font-black italic tracking-tighter text-text-subtle">VS</div>

        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="flex-1">
          <Panel hoverable className="border-accent-opponent-border bg-gradient-to-br from-surface-elevated to-accent-opponent-bg/20 shadow-glass">
            <div className="mb-8 flex items-center justify-between border-b border-border pb-4">
              <h2 className="m-0 text-3xl font-black uppercase tracking-wide text-text-primary">Away Team</h2>
              <div className="flex items-center gap-2 rounded-[var(--radius-pill)] border border-accent-opponent-border bg-accent-opponent-bg px-3 py-1 text-sm font-bold uppercase tracking-wider text-accent-opponent">
                <Cpu size={16} /> CPU
              </div>
            </div>
            <div className="mb-6 flex h-48 items-center justify-center rounded-xl border border-border bg-surface-hud">
              <span className="text-6xl font-black tracking-tighter text-text-subtle">TEAM B</span>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-white/5 p-4 text-center">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-text-muted">Overall</div>
                <div className="text-3xl font-black text-text-primary">82</div>
              </div>
              <div className="rounded-lg bg-white/5 p-4 text-center">
                <div className="mb-1 text-xs font-bold uppercase tracking-wider text-text-muted">Formation</div>
                <div className="mt-1 text-xl font-bold text-text-primary">4-4-2</div>
              </div>
            </div>
          </Panel>
        </motion.div>
      </div>

      <div className="relative z-10 mt-8 rounded-xl border border-border bg-surface-hud/80 p-4 backdrop-blur-[var(--blur-glass)]">
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-text-muted">Match controls</p>
        <ControlGlyphStrip actions={['pass', 'shoot', 'sprint', 'through', 'finesse', 'tackle']} />
      </div>
    </div>
  );
};
