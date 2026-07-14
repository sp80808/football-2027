import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { ControlBindingsPanel } from '../components/ControlGlyph';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { ChevronLeft } from 'lucide-react';
import { useSettingsStore } from '../store/settingsStore';

interface SettingsScreenProps {
  onBack: () => void;
}

type SettingsTab = 'gameplay' | 'video' | 'audio' | 'controls';

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onBack }) => {
  const [activeTab, setActiveTab] = useState<SettingsTab>('gameplay');

  const tabs: { id: SettingsTab; label: string }[] = [
    { id: 'gameplay', label: 'Gameplay' },
    { id: 'controls', label: 'Controls' },
    { id: 'video', label: 'Video' },
    { id: 'audio', label: 'Audio' },
  ];

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-surface p-8">
      <MenuBackdrop />

      <div className="relative z-10 mb-8 flex items-center gap-6">
        <Button variant="ghost" onClick={onBack} className="p-2">
          <ChevronLeft size={32} />
        </Button>
        <h1 className="m-0 text-4xl font-bold uppercase tracking-wider text-text-primary">Settings</h1>
      </div>

      <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-1 gap-8">
        <Panel className="h-fit w-64">
          <div className="flex flex-col gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`rounded-md px-4 py-3 text-left font-bold uppercase tracking-wide transition-colors ${
                  activeTab === tab.id
                    ? 'border border-accent-action-border bg-accent-action-bg text-accent-action'
                    : 'text-text-muted hover:bg-white/5 hover:text-text-primary'
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
                <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                  <div>
                    <h3 className="m-0 text-lg font-bold text-text-primary">Difficulty</h3>
                    <p className="m-0 text-sm text-text-muted">Adjust AI intelligence and reaction time</p>
                  </div>
                  <select
                    className="rounded border border-border bg-surface px-4 py-2 text-text-primary outline-none focus:border-accent-action"
                    value={useSettingsStore((s) => s.aiDifficulty)}
                    onChange={(e) => useSettingsStore.getState().setAiDifficulty(e.target.value as any)}
                  >
                    <option value="Amateur">Amateur</option>
                    <option value="Semi-Pro">Semi-Pro</option>
                    <option value="Professional">Professional</option>
                    <option value="World Class">World Class</option>
                    <option value="Legendary">Legendary</option>
                  </select>
                </div>
                <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                  <div>
                    <h3 className="m-0 text-lg font-bold text-text-primary">Match Length</h3>
                    <p className="m-0 text-sm text-text-muted">Duration of each half</p>
                  </div>
                  <select className="rounded border border-border bg-surface px-4 py-2 text-text-primary outline-none focus:border-accent-action">
                    <option>3 Mins</option>
                    <option>5 Mins</option>
                    <option>10 Mins</option>
                  </select>
                </div>
              </>
            )}

            {activeTab === 'controls' && (
              <ControlBindingsPanel title="Control reference" className="border-border-strong bg-surface-hud/60" />
            )}

            {activeTab === 'video' && (
              <div className="flex items-center justify-between rounded-lg bg-white/5 p-4">
                <div>
                  <h3 className="m-0 text-lg font-bold text-text-primary">Render Quality</h3>
                  <p className="m-0 text-sm text-text-muted">Affects performance and visuals</p>
                </div>
                <select className="rounded border border-border bg-surface px-4 py-2 text-text-primary outline-none focus:border-accent-action">
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                  <option>Ultra</option>
                </select>
              </div>
            )}

            {activeTab === 'audio' && (
              <div className="flex flex-col gap-4 rounded-lg bg-white/5 p-4">
                <h3 className="m-0 mb-4 text-lg font-bold text-text-primary">Master Volume</h3>
                <input type="range" className="w-full accent-accent-action" />
              </div>
            )}
          </div>
        </Panel>
      </div>
    </div>
  );
};
