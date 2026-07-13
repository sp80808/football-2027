import React, { useMemo } from 'react';
import { Button } from '../components/ui/Button';
import { Panel } from '../components/ui/Panel';
import { ChevronLeft, Calendar, Users, TrendingUp, Trophy } from 'lucide-react';
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
    <div className="relative flex h-screen w-screen flex-col overflow-hidden bg-slate-950 p-8">
      <div className="absolute -bottom-1/2 -right-1/4 h-full w-full rounded-full bg-emerald-600/5 blur-[200px]" />
      <div className="relative z-10 mb-8 flex items-center gap-6">
        <Button variant="ghost" onClick={onBack} className="p-2"><ChevronLeft size={32} /></Button>
        <div>
          <h1 className="m-0 text-4xl font-black uppercase tracking-widest text-white">Manager Career</h1>
          <p className="m-0 mt-1 text-sm text-slate-400">
            {clubName} · Week {seasonWeek} · {leaguePosition}
            {leaguePosition === 1 ? 'st' : leaguePosition === 2 ? 'nd' : leaguePosition === 3 ? 'rd' : 'th'} · {fixturesPlayed} played
          </p>
        </div>
      </div>
      <div className="relative z-10 mx-auto grid w-full max-w-7xl flex-1 grid-cols-12 gap-8">
        <div className="col-span-8 flex flex-col gap-8">
          <Panel className="border-emerald-500/30 bg-gradient-to-r from-emerald-900/40 to-slate-900 shadow-emerald-500/10">
            <div className="flex items-center justify-between">
              <div>
                <p className="mb-2 text-sm font-bold uppercase tracking-wider text-emerald-400">Next Match</p>
                <h2 className="m-0 mb-1 text-4xl font-black uppercase tracking-tighter text-white">vs {nextOpponent.name}</h2>
                <p className="text-sm text-slate-400">Week {seasonWeek} · Home · 8-Team League</p>
              </div>
              <Button size="lg" className="border-emerald-400 bg-emerald-600 shadow-emerald-500/30 hover:bg-emerald-500" onClick={onPlayMatch}>
                Play Match <Calendar className="ml-2" size={20} />
              </Button>
            </div>
          </Panel>
          <Panel title="League Standings" className="flex-1">
            <div className="w-full">
              <div className="mb-3 grid grid-cols-12 border-b border-slate-700/50 pb-2 text-xs font-bold uppercase tracking-wider text-slate-400">
                <div className="col-span-1">Pos</div><div className="col-span-5">Club</div>
                <div className="col-span-1 text-center">P</div><div className="col-span-1 text-center">W</div>
                <div className="col-span-1 text-center">D</div><div className="col-span-1 text-center">L</div>
                <div className="col-span-2 text-center text-white">Pts</div>
              </div>
              {sortedStandings.map((team, index) => {
                const isPlayerClub = team.isPlayerClub === true;
                return (
                  <div key={team.id} className={`grid grid-cols-12 items-center py-3 text-sm ${isPlayerClub ? 'rounded border border-blue-500/20 bg-blue-500/10' : 'border-b border-slate-800/50'}`}>
                    <div className="col-span-1 ml-2 font-mono text-slate-500">{index + 1}</div>
                    <div className={`col-span-5 font-bold ${isPlayerClub ? 'text-white' : 'text-slate-300'}`}>{team.name}</div>
                    <div className="col-span-1 text-center font-mono text-slate-400">{team.played}</div>
                    <div className="col-span-1 text-center font-mono text-slate-400">{team.won}</div>
                    <div className="col-span-1 text-center font-mono text-slate-400">{team.drawn}</div>
                    <div className="col-span-1 text-center font-mono text-slate-400">{team.lost}</div>
                    <div className={`col-span-2 text-center font-mono font-bold ${isPlayerClub ? 'text-blue-400' : 'text-white'}`}>{team.points}</div>
                  </div>
                );
              })}
            </div>
          </Panel>
        </div>
        <div className="col-span-4">
          <Panel title="Manager Hub">
            <div className="flex flex-col gap-4 text-slate-400 text-sm">
              <div className="flex items-center gap-3"><Users size={20} /> Squad hub (coming soon)</div>
              <div className="flex items-center gap-3"><TrendingUp size={20} /> Transfers (coming soon)</div>
              <div className="flex items-center gap-3"><Trophy size={20} /> Objectives (coming soon)</div>
            </div>
          </Panel>
        </div>
      </div>
    </div>
  );
};
