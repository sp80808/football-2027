import React, { useMemo, useState } from 'react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { ChevronLeft, Star, Zap, TrendingUp, Award, Heart } from 'lucide-react';
import { ACCENT, iconProps, cn } from '../ui/designTokens';
import { useSquadStore } from '../career/squadStore';
import { computeOverall, PlayerProfile, Position, STAT_KEYS, StatKey } from '../career/playerSchemas';
import { xpForLevel } from '../career/progression';
import { overallFor } from '../career/progression';

interface SquadScreenProps {
  onBack: () => void;
}

const STAT_LABELS: Record<StatKey, string> = {
  pace: 'PAC', shooting: 'SHO', passing: 'PAS', dribbling: 'DRI', defense: 'DEF', physical: 'PHY',
};
const STAT_COLORS: Record<StatKey, string> = {
  pace: 'text-sky-400', shooting: 'text-red-400', passing: 'text-emerald-400',
  dribbling: 'text-fuchsia-400', defense: 'text-amber-400', physical: 'text-orange-400',
};

function StatBar({ value, color }: { value: number; color: string }) {
  const pct = Math.max(0, Math.min(100, value));
  const barColor = pct >= 80 ? 'bg-emerald-500' : pct >= 60 ? 'bg-lime-500' : pct >= 40 ? 'bg-amber-500' : 'bg-rose-500';
  return (
    <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
      <div className={cn('h-full rounded-full', barColor)} style={{ width: `${pct}%` }} />
    </div>
  );
}

function XpBar({ xp, level }: { xp: number; level: number }) {
  const curFloor = xpForLevel(level);
  const next = xpForLevel(level + 1);
  const span = Math.max(1, next - curFloor);
  const pct = Math.max(0, Math.min(100, ((xp - curFloor) / span) * 100));
  return (
    <div className="h-1 w-full overflow-hidden rounded-full bg-white/10" title={`${Math.floor(xp - curFloor)} / ${span} xp to next level`}>
      <div className="h-full rounded-full bg-accent-action" style={{ width: `${pct}%` }} />
    </div>
  );
}

export const SquadScreen: React.FC<SquadScreenProps> = ({ onBack }) => {
  const { players, controlledPlayerId, setControlled, allocatePoints } = useSquadStore();
  const [selectedId, setSelectedId] = useState<string>(controlledPlayerId);
  const selected = players.find((p) => p.id === selectedId) ?? players[0];
  // Pending point allocation for the selected player (local until "Apply").
  const [pending, setPending] = useState<Partial<Record<StatKey, number>>>({});
  const pendingTotal = STAT_KEYS.reduce((s, k) => s + (pending[k] ?? 0), 0);

  const sorted = useMemo(
    () => [...players].sort((a, b) => overallFor(b) - overallFor(a)),
    [players],
  );

  const addPoint = (k: StatKey) => {
    if (!selected) return;
    if (pendingTotal >= selected.unspentPoints) return;
    if ((selected.attributes[k] + (pending[k] ?? 0)) >= 99) return;
    setPending({ ...pending, [k]: (pending[k] ?? 0) + 1 });
  };
  const subPoint = (k: StatKey) => {
    if ((pending[k] ?? 0) <= 0) return;
    setPending({ ...pending, [k]: (pending[k] ?? 0) - 1 });
  };
  const applyAllocation = () => {
    if (pendingTotal <= 0 || !selected) return;
    allocatePoints(selected.id, pending);
    setPending({});
  };

  if (!selected) return null;
  const projectedAttrs = { ...selected.attributes };
  for (const k of STAT_KEYS) projectedAttrs[k] = Math.min(99, projectedAttrs[k] + (pending[k] ?? 0));

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-surface p-6">
      <MenuBackdrop />
      <div className="relative z-10 mb-4 flex items-center gap-4">
        <Button variant="ghost" onClick={onBack} className="p-2"><ChevronLeft {...iconProps('lg')} /></Button>
        <div>
          <h1 className="m-0 text-3xl font-black uppercase tracking-widest text-text-primary">Squad</h1>
          <p className="m-0 mt-1 text-xs text-text-muted">{players.length} players · click a row to inspect · star = controlled</p>
        </div>
      </div>

      <div className="relative z-10 grid w-full flex-1 grid-cols-12 gap-5 overflow-hidden">
        {/* Squad table */}
        <div className="col-span-7 overflow-hidden">
          <Panel className="flex h-full flex-col">
            <div className="grid grid-cols-12 border-b border-border px-3 py-2 text-[10px] font-bold uppercase tracking-wider text-text-muted">
              <div className="col-span-1"></div>
              <div className="col-span-4">Player</div>
              <div className="col-span-1 text-center">Pos</div>
              <div className="col-span-1 text-center">Age</div>
              <div className="col-span-1 text-center">OVR</div>
              <div className="col-span-2 text-center">Lvl / XP</div>
              <div className="col-span-2 text-center">Pts</div>
            </div>
            <div className="flex-1 overflow-y-auto">
              {sorted.map((p) => {
                const isSel = p.id === selected.id;
                const isCtrl = p.id === controlledPlayerId;
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedId(p.id); setPending({}); }}
                    className={cn(
                      'grid w-full grid-cols-12 items-center px-3 py-2 text-left text-sm transition-colors',
                      isSel ? 'bg-accent-player-bg/30' : 'hover:bg-white/5',
                    )}
                  >
                    <div className="col-span-1">{isCtrl ? <Star className="text-accent-player" {...iconProps('sm')} /> : null}</div>
                    <div className="col-span-4 truncate font-semibold text-text-primary">
                      <span className="mr-1 text-text-muted">#{p.kitNumber}</span>{p.name}
                    </div>
                    <div className="col-span-1 text-center font-mono text-text-secondary">{p.position}</div>
                    <div className="col-span-1 text-center font-mono text-text-muted">{p.age}</div>
                    <div className="col-span-1 text-center font-mono font-bold text-text-primary">{overallFor(p)}</div>
                    <div className="col-span-2 px-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-text-secondary">{p.level}</span>
                        <div className="flex-1"><XpBar xp={p.xp} level={p.level} /></div>
                      </div>
                    </div>
                    <div className="col-span-2 text-center">
                      {p.unspentPoints > 0 ? (
                        <span className="inline-block rounded bg-accent-action-bg px-2 py-0.5 text-xs font-bold text-accent-action">{p.unspentPoints} pts</span>
                      ) : (
                        <span className="text-text-muted">—</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        </div>

        {/* Player detail + point allocation */}
        <div className="col-span-5 flex flex-col gap-4 overflow-y-auto">
          <Panel>
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs uppercase tracking-wider text-text-muted">#{selected.kitNumber} · {selected.position}</p>
                <h2 className="m-0 text-2xl font-black uppercase tracking-tight text-text-primary">{selected.name}</h2>
                <p className="mt-1 text-xs text-text-muted">Age {selected.age} · Level {selected.level}</p>
              </div>
              <div className="text-right">
                <div className="text-5xl font-black tabular-nums text-text-primary">{computeOverall(projectedAttrs, selected.position as Position)}</div>
                <p className="text-[10px] uppercase tracking-wider text-text-muted">Overall</p>
              </div>
            </div>
            <div className="mt-3 flex items-center gap-4 text-xs text-text-muted">
              <span className="flex items-center gap-1"><Heart {...iconProps('xs')} /> Fit {Math.round(selected.fitness)}</span>
              <span className="flex items-center gap-1"><Zap {...iconProps('xs')} /> Morale {Math.round(selected.morale)}</span>
            </div>
            {!selected.isKeeper && (
              <Button
                variant={selected.id === controlledPlayerId ? 'primary' : 'secondary'}
                size="sm"
                className="mt-3 w-full"
                onClick={() => setControlled(selected.id)}
              >
                {selected.id === controlledPlayerId ? '★ Controlled on pitch' : 'Set as controlled'}
              </Button>
            )}
          </Panel>

          <Panel title="Attributes">
            <div className="flex flex-col gap-2">
              {STAT_KEYS.map((k) => {
                const cur = selected.attributes[k];
                const proj = projectedAttrs[k];
                const diff = proj - cur;
                return (
                  <div key={k} className="grid grid-cols-12 items-center gap-2">
                    <div className={cn('col-span-2 text-xs font-bold', STAT_COLORS[k])}>{STAT_LABELS[k]}</div>
                    <div className="col-span-1 text-right font-mono text-sm tabular-nums text-text-primary">{proj}</div>
                    <div className="col-span-4"><StatBar value={proj} color={STAT_COLORS[k]} /></div>
                    {selected.unspentPoints > 0 ? (
                      <div className="col-span-5 flex items-center justify-end gap-1">
                        <button onClick={() => subPoint(k)} className="h-5 w-5 rounded bg-white/10 text-xs text-text-primary hover:bg-white/20 disabled:opacity-30" disabled={(pending[k] ?? 0) <= 0}>−</button>
                        {diff > 0 && <span className="w-4 text-center font-mono text-xs text-emerald-400">+{diff}</span>}
                        <button onClick={() => addPoint(k)} className="h-5 w-5 rounded bg-white/10 text-xs text-text-primary hover:bg-white/20 disabled:opacity-30" disabled={pendingTotal >= selected.unspentPoints || proj >= 99}>+</button>
                      </div>
                    ) : (
                      <div className="col-span-5" />
                    )}
                  </div>
                );
              })}
            </div>
            {selected.unspentPoints > 0 && (
              <div className="mt-3 flex items-center justify-between border-t border-border pt-3">
                <span className="text-xs text-text-muted">{selected.unspentPoints - pendingTotal} of {selected.unspentPoints} points left</span>
                <Button size="sm" onClick={applyAllocation} disabled={pendingTotal <= 0}>
                  <Award className="mr-1" {...iconProps('sm')} /> Apply {pendingTotal > 0 ? `${pendingTotal} pts` : ''}
                </Button>
              </div>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
};
