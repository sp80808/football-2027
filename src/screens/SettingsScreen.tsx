import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { ChevronLeft } from 'lucide-react';

interface SettingsScreenProps {
  onBack: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<'video' | 'audio' | 'gameplay'>('gameplay');

  const tabs = [
    { id: 'gameplay', label: 'Gameplay' },
    { id: 'video', label: 'Video' },
    { id: 'audio', label: 'Audio' }
  ];

  return (
    <div className="w-screen h-screen bg-slate-950 flex flex-col p-8 relative overflow-hidden">
      <div className="absolute top-0 right-0 w-1/2 h-1/2 bg-blue-600/10 blur-[100px] rounded-full" />
      
      <div className="flex items-center gap-6 mb-8 z-10">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ChevronLeft size={32} />
        </Button>
        <h1 className="text-4xl font-bold text-white uppercase tracking-wider m-0">Settings</h1>
      </div>

      <div className="flex flex-1 gap-8 z-10 max-w-6xl mx-auto w-full">
        <Panel className="w-64 h-fit">
          <div className="flex flex-col gap-2">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`text-left px-4 py-3 rounded-md transition-colors font-bold tracking-wide uppercase ${
                  activeTab === tab.id 
                    ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' 
                    : 'text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </Panel>

        <Panel title={`${activeTab} Settings`} className="flex-1">
          <div className="flex flex-col gap-6">
            {activeTab === 'gameplay' && (
              <>
                <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-bold text-lg m-0">Difficulty</h3>
                    <p className="text-slate-400 text-sm m-0">Adjust AI intelligence and reaction time</p>
                  </div>
                  <select className="bg-slate-900 text-white border border-slate-700 rounded p-2 px-4 outline-none focus:border-blue-500">
                    <option>Amateur</option>
                    <option>Semi-Pro</option>
                    <option>Professional</option>
                    <option>World Class</option>
                    <option>Legendary</option>
                  </select>
                </div>
                <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                  <div>
                    <h3 className="text-white font-bold text-lg m-0">Match Length</h3>
                    <p className="text-slate-400 text-sm m-0">Duration of each half</p>
                  </div>
                  <select className="bg-slate-900 text-white border border-slate-700 rounded p-2 px-4 outline-none focus:border-blue-500">
                    <option>3 Mins</option>
                    <option>5 Mins</option>
                    <option>10 Mins</option>
                  </select>
                </div>
              </>
            )}
            {activeTab === 'video' && (
              <div className="flex justify-between items-center p-4 bg-slate-800/50 rounded-lg">
                 <div>
                    <h3 className="text-white font-bold text-lg m-0">Render Quality</h3>
                    <p className="text-slate-400 text-sm m-0">Affects performance and visuals</p>
                  </div>
                  <select className="bg-slate-900 text-white border border-slate-700 rounded p-2 px-4 outline-none focus:border-blue-500">
                    <option>Low</option>
                    <option>Medium</option>
                    <option>High</option>
                    <option>Ultra</option>
                  </select>
              </div>
            )}
            {activeTab === 'audio' && (
              <div className="flex flex-col gap-4 p-4 bg-slate-800/50 rounded-lg">
                 <div>
                    <h3 className="text-white font-bold text-lg m-0 mb-4">Master Volume</h3>
                  </div>
                  <input type="range" className="w-full accent-blue-500" />
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};
