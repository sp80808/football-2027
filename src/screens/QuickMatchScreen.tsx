import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { ChevronLeft, Play, User, Cpu } from 'lucide-react';

interface QuickMatchScreenProps {
  onBack: () => void;
  onStartMatch: () => void;
}

export const QuickMatchScreen: React.FC<QuickMatchScreenProps> = ({ onBack, onStartMatch }) => {
  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col p-8 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full h-1/2 bg-blue-600/5 blur-[150px] rounded-full" />
      
      <div className="flex justify-between items-center mb-12 z-10">
        <div className="flex items-center gap-6">
          <Button variant="ghost" onClick={onBack} className="p-2">
            <ChevronLeft size={32} />
          </Button>
          <h1 className="text-4xl font-black text-white uppercase tracking-widest m-0">Quick Match</h1>
        </div>
        <Button size="lg" onClick={onStartMatch}>
          <Play size={20} className="mr-2" /> Play Match
        </Button>
      </div>

      <div className="flex-1 flex items-center justify-center gap-12 z-10 max-w-7xl mx-auto w-full">
        {/* Team 1 Selection */}
        <motion.div 
          initial={{ x: -50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex-1"
        >
          <Panel className="border-blue-500/30 bg-gradient-to-br from-slate-900 to-blue-900/20 shadow-blue-500/10">
            <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-4">
              <h2 className="text-3xl font-black text-white uppercase tracking-wide m-0">Home Team</h2>
              <div className="flex items-center gap-2 bg-blue-500/20 text-blue-400 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                <User size={16} /> Player 1
              </div>
            </div>
            
            <div className="flex items-center justify-center h-48 bg-slate-900/50 rounded-xl mb-6 border border-slate-800">
              <span className="text-6xl font-black text-slate-700 tracking-tighter">TEAM A</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Overall</div>
                <div className="text-3xl font-black text-white">85</div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Formation</div>
                <div className="text-xl font-bold text-white mt-1">4-3-3</div>
              </div>
            </div>
          </Panel>
        </motion.div>

        {/* VS Badge */}
        <div className="text-4xl font-black text-slate-500 italic tracking-tighter">VS</div>

        {/* Team 2 Selection */}
        <motion.div 
          initial={{ x: 50, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          className="flex-1"
        >
          <Panel className="border-red-500/30 bg-gradient-to-br from-slate-900 to-red-900/20 shadow-red-500/10">
            <div className="flex justify-between items-center mb-8 border-b border-slate-700/50 pb-4">
              <h2 className="text-3xl font-black text-white uppercase tracking-wide m-0">Away Team</h2>
              <div className="flex items-center gap-2 bg-red-500/20 text-red-400 px-3 py-1 rounded-full text-sm font-bold uppercase tracking-wider">
                <Cpu size={16} /> CPU
              </div>
            </div>
            
            <div className="flex items-center justify-center h-48 bg-slate-900/50 rounded-xl mb-6 border border-slate-800">
              <span className="text-6xl font-black text-slate-700 tracking-tighter">TEAM B</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Overall</div>
                <div className="text-3xl font-black text-white">82</div>
              </div>
              <div className="bg-slate-800/50 p-4 rounded-lg text-center">
                <div className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-1">Formation</div>
                <div className="text-xl font-bold text-white mt-1">4-4-2</div>
              </div>
            </div>
          </Panel>
        </motion.div>
      </div>
    </div>
  );
};
