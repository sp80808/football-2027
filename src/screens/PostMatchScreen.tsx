import React from 'react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { Trophy, TrendingUp, ArrowRight } from 'lucide-react';
import { iconProps, cn } from '../ui/designTokens';
import { MatchActionCounts, MatchStatsLine } from '../career/ActionTracker';
import { MatchXpAward } from '../career/squadStore';

interface PostMatchScreenProps {
  homeScore: number;
  awayScore: number;
  statsLine: MatchStatsLine;
  counts: MatchActionCounts;
  awards: MatchXpAward[];
  controlledName: string;
  onContinue: () => void;
}

function StatCell({ label, value, accent }: { label: string; value: number | string; accent?: string }) {
  return (
    <div className="flex flex-col items-center rounded-lg border border-border bg-white/5 px-3 py-2">
      <span className={cn('font-mono text-xl font-black tabular-nums', accent ?? 'text-text-primary')}>{value}</span>
      <span className="text-[10px] uppercase tracking-wider text-text-muted">{label}</span>
    </div>
  );
}

export const PostMatchScreen: React.FC<PostMatchScreenProps> = ({
  homeScore, awayScore, statsLine, counts, awards, controlledName, onContinue,
}) => {
  const won = homeScore > awayScore;
  const drew = homeScore === awayScore;
  const resultLabel = won ? 'WIN' : drew ? 'DRAW' : 'LOSS';
  const resultColor = won ? 'text-emerald-400' : drew ? 'text-amber-400' : 'text-rose-400';

  const totalXp = awards.reduce((s, a) => s + a.xpGained, 0);
  const leveled = awards.filter((a) => a.leveledUp);
  const totalPoints = awards.reduce((s, a) => s + a.pointsAwarded, 0);

  return (
    <div className="relative flex h-screen w-screen items-center justify-center overflow-hidden bg-surface p-8">
      <MenuBackdrop />
      <div className="relative z-10 w-full max-w-3xl">
        <Panel className="p-8">
          <div className="mb-6 text-center">
            <p className={cn('text-sm font-black uppercase tracking-[0.3em]', resultColor)}>{resultLabel}</p>
            <div className="mt-2 flex items-center justify-center gap-6">
              <span className="text-6xl font-black tabular-nums text-text-primary">{homeScore}</span>
              <span className="text-2xl text-text-muted">—</span>
              <span className="text-6xl font-black tabular-nums text-text-primary">{awayScore}</span>
            </div>
            <p className="mt-2 text-xs text-text-muted">Full Time</p>
          </div>

          <Panel title={`${controlledName} — Match Stats`} className="mb-5">
            <div className="grid grid-cols-4 gap-3">
              <StatCell label="Goals" value={statsLine.goals} accent={statsLine.goals > 0 ? 'text-emerald-400' : undefined} />
              <StatCell label="Shots (SOT)" value={`${statsLine.shots} (${statsLine.shotsOnTarget})`} />
              <StatCell label="Passes" value={statsLine.passes} />
              <StatCell label="Tackles" value={statsLine.tackles} />
              <StatCell label="Possession" value={`${statsLine.possessionPct}%`} />
              <StatCell label="Saves" value={statsLine.saves} />
              <StatCell label="Assists" value={counts.assist} />
              <StatCell label="Minutes" value={counts.participationMinutes} />
            </div>
          </Panel>

          <Panel title="XP Earned" className="mb-5">
            <div className="mb-3 flex items-center justify-between">
              <span className="flex items-center gap-2 text-sm text-text-secondary">
                <TrendingUp {...iconProps('sm')} /> Total XP awarded this match
              </span>
              <span className="font-mono text-2xl font-black text-accent-action">+{totalXp}</span>
            </div>
            {leveled.length > 0 ? (
              <div className="space-y-1">
                {leveled.map((a) => (
                  <div key={a.playerId} className="flex items-center justify-between rounded bg-accent-player-bg/20 px-3 py-1.5 text-sm">
                    <span className="font-semibold text-text-primary">{a.playerName}</span>
                    <span className="flex items-center gap-3">
                      <span className="font-mono text-emerald-400">+{a.xpGained} xp</span>
                      <span className="flex items-center gap-1 font-bold text-accent-player">
                        <Trophy {...iconProps('xs')} /> Lv +{a.levelsGained}
                      </span>
                      {a.pointsAwarded > 0 && <span className="font-mono text-accent-action">+{a.pointsAwarded} pts</span>}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-text-muted">No level-ups this match — keep playing to progress.</p>
            )}
            {totalPoints > 0 && (
              <p className="mt-3 border-t border-border pt-2 text-center text-xs text-accent-action">
                {totalPoints} attribute points available to spend in the Squad screen.
              </p>
            )}
          </Panel>

          <div className="flex justify-end">
            <Button variant="primary" size="lg" onClick={onContinue}>
              Continue <ArrowRight className="ml-2" {...iconProps('md')} />
            </Button>
          </div>
        </Panel>
      </div>
    </div>
  );
};
