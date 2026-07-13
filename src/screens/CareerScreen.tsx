import React, { useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { MenuBackdrop } from '../components/MenuBackdrop';
import { ChevronLeft, Calendar, Users, TrendingUp, Trophy } from 'lucide-react';
import { ACCENT, iconProps } from '../ui/designTokens';
import { useCareerStore } from '../career/careerStore';
import type { LeagueTeam } from '../career/careerSchemas';

interface CareerScreenProps {
  onBack: () => void;
  onPlayMatch: () => void;
}

function sortStandings(standings: LeagueTeam[]): LeagueTeam[] {
  return [...standings].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aGd = a.won - a.lost;
    const bGd = b.won - b.lost;
    if (bGd !== aGd) return bGd - aGd;
    return a.name.localeCompare(b.name);
  });
}

export const CareerScreen: React.FC<CareerScreenProps> = ({ onBack, onPlayMatch }) => {
  const { clubName, seasonWeek, leaguePosition, fixturesPlayed, standings, getNextOpponent } = useCareerStore();
  const nextOpponent = getNextOpponent();
  const sortedStandings = useMemo(() => sortStandings(standings), [standings]);

  return (
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-surface p-8">
      <MenuBackdrop />
      <div className="relative z-10 mb-8 flex items-center gap-6">
        <Button variant="ghost" onClick={onBack} className="p-2"><ChevronLeft {...iconProps('lg')} /></Button>
        <div>
          <h1 className="m-0 text-4xl font-black uppercase tracking-widest text-text-primary">Manager Career</h1>
          <p className="m-0 mt-1 text-sm text-text-muted">
            {clubName} · Week {seasonWeek} · {leaguePosition}
            {leaguePosition === 1 ? 'st' : leaguePosition === 2 ? 'nd' : leaguePosition === 3 ? 'rd' : 'th'} · {fixturesPlayed} played
          </p>
        </div>
      </div>
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-12 gap-8">
        <div className="col-span-8 flex flex-col gap-8">
          <Panel className="border-accent-player-border bg-gradient-to-r from-accent-player-bg/40 to-surface-elevated">
            <div className="flex items-center justify-between">
              <div>
                <p className={`mb-2 text-sm font-bold uppercase tracking-wider ${ACCENT.player}`}>Next Match</p>
                <h2 className="m-0 mb-1 text-4xl font-black uppercase tracking-tighter text-text-primary">vs {nextOpponent.name}</h2>
                <p className="text-sm text-text-muted">Week {seasonWeek} · Home · 8-Team League</p>
              </div>
              <Button size="lg" className="border-accent-player-border bg-accent-player-bg hover:bg-accent-player/25" onClick={onPlayMatch}>
                Play Match <Calendar className="ml-2" {...iconProps('md')} />
              </Button>
            </div>
          </Panel>
          <Panel title="League Standings" className="flex-1">
            <div className="w-full">
              <div className="mb-3 grid grid-cols-12 border-b border-border pb-2 text-xs font-bold uppercase tracking-wider text-text-muted">
                <div className="col-span-1">Pos</div><div className="col-span-5">Club</div>
                <div className="col-span-1 text-center">P</div><div className="col-span-1 text-center">W</div>
                <div className="col-span-1 text-center">D</div><div className="col-span-1 text-center">L</div>
                <div className="col-span-2 text-center text-text-primary">Pts</div>
              </div>
              {sortedStandings.map((team, index) => {
                const isPlayerClub = team.isPlayerClub === true;
                return (
                  <div key={team.id} className={`grid grid-cols-12 items-center py-3 text-sm ${isPlayerClub ? `rounded border ${ACCENT.actionSurface}` : 'border-b border-border'}`}>
                    <div className="col-span-1 ml-2 font-mono text-text-muted">{index + 1}</div>
                    <div className={`col-span-5 font-bold ${isPlayerClub ? 'text-text-primary' : 'text-text-secondary'}`}>{team.name}</div>
                    <div className="col-span-1 text-center font-mono text-text-muted">{team.played}</div>
                    <div className="col-span-1 text-center font-mono text-text-muted">{team.won}</div>
                    <div className="col-span-1 text-center font-mono text-text-muted">{team.drawn}</div>
                    <div className="col-span-1 text-center font-mono text-text-muted">{team.lost}</div>
                    <div className={`col-span-2 text-center font-mono font-bold ${isPlayerClub ? ACCENT.action : 'text-text-primary'}`}>{team.points}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
        <div className="col-span-4">
          <Panel title="Manager Hub">
            <div className="flex flex-col gap-4 text-sm text-text-muted">
              <div className="flex items-center gap-3"><Users {...iconProps('md')} /> Squad hub (coming soon)</div>
              <div className="flex items-center gap-3"><TrendingUp {...iconProps('md')} /> Transfers (coming soon)</div>
              <div className="flex items-center gap-3"><Trophy {...iconProps('md')} /> Objectives (coming soon)</div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
