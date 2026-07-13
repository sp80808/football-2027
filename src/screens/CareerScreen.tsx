import React from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { ChevronLeft, Calendar, Users, TrendingUp, Trophy } from 'lucide-react';

interface CareerScreenProps {
  onBack: () => void;
}

export const CareerScreen: React.FC<CareerScreenProps> = ({ onBack }) => {
  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col p-8 relative overflow-hidden">
      <div className="absolute -bottom-1/2 -right-1/4 w-full h-full bg-emerald-600/5 blur-[200px] rounded-full" />
      
      <div className="flex items-center gap-6 mb-8 z-10">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ChevronLeft size={32} />
        </Button>
        <h1 className="text-4xl font-black text-white uppercase tracking-widest m-0">Manager Career</h1>
      </div>

      <div className="flex-1 grid grid-cols-12 gap-8 z-10 max-w-7xl mx-auto w-full">
        {/* Left Column - Main Action & Schedule */}
        <div className="col-span-8 flex flex-col gap-8">
          <Panel className="bg-gradient-to-r from-emerald-900/40 to-slate-900 border-emerald-500/30 shadow-emerald-500/10">
            <div className="flex justify-between items-center">
              <div>
                <p className="text-emerald-400 font-bold uppercase tracking-wider text-sm mb-2">Next Match</p>
                <h2 className="text-4xl font-black text-white uppercase tracking-tighter m-0 mb-1">vs Local Rivals</h2>
                <p className="text-slate-400 text-sm">Sat, 14 Aug - Home - Premier Division</p>
              </div>
              <Button size="lg" className="bg-emerald-600 hover:bg-emerald-500 border-emerald-400 shadow-emerald-500/30">
                Play Match <Calendar className="ml-2" size={20} />
              </Button>
            </div>
          </Panel>

          <Panel title="League Standings" className="flex-1">
            <div className="w-full">
              <div className="grid grid-cols-12 text-slate-400 text-xs font-bold uppercase tracking-wider mb-3 pb-2 border-b border-slate-700/50">
                <div className="col-span-1">Pos</div>
                <div className="col-span-5">Club</div>
                <div className="col-span-1 text-center">P</div>
                <div className="col-span-1 text-center">W</div>
                <div className="col-span-1 text-center">D</div>
                <div className="col-span-1 text-center">L</div>
                <div className="col-span-2 text-center text-white">Pts</div>
              </div>
              {[1, 2, 3, 4, 5].map((pos) => (
                <div key={pos} className={`grid grid-cols-12 items-center py-3 text-sm ${pos === 3 ? 'bg-blue-500/10 rounded border border-blue-500/20' : 'border-b border-slate-800/50'}`}>
                  <div className="col-span-1 text-slate-500 font-mono ml-2">{pos}</div>
                  <div className={`col-span-5 font-bold ${pos === 3 ? 'text-white' : 'text-slate-300'}`}>
                    {pos === 3 ? 'Your Club' : `Rival Team ${pos}`}
                  </div>
                  <div className="col-span-1 text-center text-slate-400 font-mono">12</div>
                  <div className="col-span-1 text-center text-slate-400 font-mono">8</div>
                  <div className="col-span-1 text-center text-slate-400 font-mono">2</div>
                  <div className="col-span-1 text-center text-slate-400 font-mono">2</div>
                  <div className={`col-span-2 text-center font-bold font-mono ${pos === 3 ? 'text-blue-400' : 'text-white'}`}>
                    {26 - (pos * 2)}
                  </div>
                </div>
              ))}
            </div>
          </Panel>
        </div>

        {/* Right Column - Hub & Stats */}
        <div className="col-span-4 flex flex-col gap-8">
          <Panel title="Manager Hub" className="flex-1">
            <div className="flex flex-col gap-4">
              <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between border border-transparent hover:border-slate-600 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="bg-blue-500/20 p-2 rounded text-blue-400 group-hover:bg-blue-500 group-hover:text-white transition-colors">
                    <Users size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider m-0">Squad</h3>
                    <p className="text-slate-400 text-xs m-0">Manage tactics</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between border border-transparent hover:border-slate-600 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="bg-purple-500/20 p-2 rounded text-purple-400 group-hover:bg-purple-500 group-hover:text-white transition-colors">
                    <TrendingUp size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider m-0">Transfers</h3>
                    <p className="text-slate-400 text-xs m-0">Scout & sign players</p>
                  </div>
                </div>
              </div>

              <div className="bg-slate-800/50 p-4 rounded-lg flex items-center justify-between border border-transparent hover:border-slate-600 transition-colors cursor-pointer group">
                <div className="flex items-center gap-4">
                  <div className="bg-amber-500/20 p-2 rounded text-amber-400 group-hover:bg-amber-500 group-hover:text-white transition-colors">
                    <Trophy size={24} />
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-sm uppercase tracking-wider m-0">Objectives</h3>
                    <p className="text-slate-400 text-xs m-0">Board expectations</p>
                  </div>
                </div>
              </div>
            </div>
            
            <div className="mt-8 pt-6 border-t border-slate-700/50">
               <h3 className="text-slate-400 font-bold text-xs uppercase tracking-wider m-0 mb-4">Board Confidence</h3>
               <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
                 <div className="bg-gradient-to-r from-emerald-500 to-emerald-400 h-full w-3/4 rounded-full" />
               </div>
               <div className="flex justify-between mt-2">
                 <span className="text-xs text-slate-500">Critical</span>
                 <span className="text-xs text-emerald-400 font-bold">Secure</span>
               </div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
