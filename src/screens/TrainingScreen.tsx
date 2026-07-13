import React, { useState } from 'react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { ChevronLeft, Dumbbell } from 'lucide-react';
import { iconProps, cn } from '../ui/designTokens';
import { useSquadStore } from '../career/squadStore';
import { PROGRAMMES, ProgrammeId, Intensity, applyTraining } from '../career/TrainingSystem';
import { overallFor } from '../career/progression';
import { STAT_KEYS, StatKey } from '../career/playerSchemas';

interface TrainingScreenProps {
  onBack: () => void;
}

const PROGRAMME_ORDER: ProgrammeId[] = ['balanced', 'attacking', 'defensive', 'conditioning', 'technical', 'rest'];
const INTENSITIES: { id: Intensity; label: string }[] = [
  { id: 'light', label: 'Light' },
  { id: 'standard', label: 'Standard' },
  { id: 'intense', label: 'Intense' },
];

export const TrainingScreen: React.FC<TrainingScreenProps> = ({ onBack }) => {
  const { players, trainingProgrammes, setTrainingProgramme, applyTrainingWeek } = useSquadStore();
  const [selectedId, setSelectedId] = useState<string>(players[0]?.id ?? '');
  const selected = players.find((p) => p.id === selectedId) ?? players[0];
  const plan = trainingProgrammes[selectedId] ?? { programme: 'balanced' as ProgrammeId, intensity: 'standard' as Intensity };

  // Preview the projected outcome for the selected player/plan (deterministic preview).
  const preview = selected
    ? applyTraining(selected, plan.programme, plan.intensity, () => 0.5)
    : null;

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-surface p-6">
      <MenuBackdrop />
      <div className="relative z-10 mb-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" onClick={onBack} className="p-2"><ChevronLeft {...iconProps('lg')} /></Button>
          <div>
            <h1 className="m-0 text-3xl font-black uppercase tracking-widest text-text-primary">Training</h1>
            <p className="m-0 mt-1 text-xs text-text-muted">Set each player's coaching programme · apply a training week between matches</p>
          </div>
        </div>
        <Button variant="primary" onClick={applyTrainingWeek}>
          <Dumbbell className="mr-2" {...iconProps('md')} /> Apply Training Week
        </Button>
      </div>

      <div className="relative z-10 grid w-full flex-1 grid-cols-12 gap-5 overflow-hidden">
        {/* Player list */}
        <div className="col-span-4 overflow-hidden">
          <Panel className="flex h-full flex-col">
            <div className="flex-1 overflow-y-auto">
              {players.map((p) => {
                const pp = trainingProgrammes[p.id]?.programme ?? 'balanced';
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedId(p.id)}
                    className={cn(
                      'flex w-full items-center justify-between px-3 py-2 text-left text-sm transition-colors',
                      p.id === selectedId ? 'bg-accent-player-bg/30' : 'hover:bg-white/5',
                    )}
                  >
                    <span className="truncate font-semibold text-text-primary">{p.name}</span>
                    <span className="flex items-center gap-2">
                      <span className="font-mono text-xs text-text-muted">{p.position}</span>
                      <span className="font-mono text-xs text-text-secondary">{PROGRAMMES[pp as ProgrammeId].label}</span>
                    </span>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Programme selector + preview */}
        <div className="col-span-8 flex flex-col gap-5 overflow-y-auto">
          {selected && (
            <>
              <Panel>
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="m-0 text-xl font-black uppercase text-text-primary">{selected.name}</h2>
                    <p className="mt-1 text-xs text-text-muted">{selected.position} · Age {selected.age} · OVR {overallFor(selected)} · Fit {Math.round(selected.fitness)}</p>
                  </div>
                </div>
              </Panel>

              <Panel title="Coaching Programme">
                <div className="grid grid-cols-3 gap-2">
                  {PROGRAMME_ORDER.map((id) => {
                    const prog = PROGRAMMES[id];
                    const active = plan.programme === id;
                    return (
                      <button
                        key={id}
                        onClick={() => setTrainingProgramme(selected.id, id, plan.intensity)}
                        className={cn(
                          'rounded-lg border p-3 text-left transition-colors',
                          active ? 'border-accent-action-border bg-accent-action-bg' : 'border-border bg-white/5 hover:bg-white/10',
                        )}
                      >
                        <div className={cn('text-sm font-bold uppercase tracking-wide', active ? 'text-accent-action' : 'text-text-primary')}>{prog.label}</div>
                        <div className="mt-1 text-[11px] leading-snug text-text-muted">{prog.description}</div>
                      </button>
                    );
                  })}
                </div>
              </Panel>

              <Panel title="Intensity">
                <div className="flex gap-2">
                  {INTENSITIES.map((i) => (
                    <button
                      key={i.id}
                      onClick={() => setTrainingProgramme(selected.id, plan.programme, i.id)}
                      className={cn(
                        'flex-1 rounded-lg border py-2 text-sm font-semibold uppercase transition-colors',
                        plan.intensity === i.id ? 'border-accent-action-border bg-accent-action-bg text-accent-action' : 'border-border bg-white/5 text-text-secondary hover:bg-white/10',
                      )}
                    >
                      {i.label}
                    </button>
                  ))}
                </div>
              </Panel>

              {preview && (
                <Panel title="Projected Outcome (next week)">
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    {STAT_KEYS.map((k) => {
                      const delta = preview.attrDeltas[k as StatKey] ?? 0;
                      return (
                        <div key={k} className="flex items-center justify-between rounded bg-white/5 px-2 py-1.5">
                          <span className="uppercase text-text-muted">{k.slice(0, 3)}</span>
                          <span className={cn('font-mono font-bold', delta > 0 ? 'text-emerald-400' : delta < 0 ? 'text-rose-400' : 'text-text-muted')}>
                            {delta > 0 ? '+' : ''}{delta}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                  <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
                    <span>Fitness: <span className={cn('font-mono font-bold', preview.fitnessDelta < 0 ? 'text-rose-400' : 'text-emerald-400')}>{preview.fitnessDelta > 0 ? '+' : ''}{preview.fitnessDelta}</span></span>
                    <span>Injury risk: <span className="font-mono text-amber-400">{Math.round(PROGRAMMES[plan.programme].injuryRisk * (plan.intensity === 'intense' ? 1.4 : plan.intensity === 'light' ? 0.6 : 1) * 100)}%</span></span>
                  </div>
                </Panel>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
