import { OpenFootballLeague, OpenFootballMatch, OpenFootballMatchSchema, OpenFootballLeagueSchema } from './careerSchemas';
import { LeagueTeam, CareerState } from './careerSchemas';
import { SeededRandom } from '../engine/SeededRandom';

const OPENFOOTBALL_BASE = 'https://raw.githubusercontent.com/openfootball/football.json/master';

export async function fetchOpenFootballLeague(leagueCode: string, season: string): Promise<OpenFootballLeague | null> {
  const url = `${OPENFOOTBALL_BASE}/${season}/${leagueCode}.json`;
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const raw = await response.json();
    const parsed = OpenFootballLeagueSchema.safeParse(raw);
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

export function openFootballToCareerTeams(league: OpenFootballLeague, playerClubName: string): LeagueTeam[] {
  const teams = new Map<string, LeagueTeam>();
  const rng = new SeededRandom(league.name.length);

  for (const match of league.matches) {
    for (const teamName of [match.team1, match.team2]) {
      if (!teams.has(teamName)) {
        teams.set(teamName, {
          id: teamName.toLowerCase().replace(/\s+/g, '-'),
          name: teamName,
          played: 0,
          won: 0,
          drawn: 0,
          lost: 0,
          points: 0,
          isPlayerClub: teamName === playerClubName,
        });
      }
    }

    const ft = match.score.ft;
    if (!ft) continue;

    const team1 = teams.get(match.team1)!;
    const team2 = teams.get(match.team2)!;

    team1.played += 1;
    team2.played += 1;

    if (ft[0] > ft[1]) {
      team1.won += 1;
      team1.points += 3;
      team2.lost += 1;
    } else if (ft[0] < ft[1]) {
      team2.won += 1;
      team2.points += 3;
      team1.lost += 1;
    } else {
      team1.drawn += 1;
      team2.drawn += 1;
      team1.points += 1;
      team2.points += 1;
    }
  }

  const sorted = [...teams.values()].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    const aGd = a.won - a.lost;
    const bGd = b.won - b.lost;
    if (bGd !== aGd) return bGd - aGd;
    return a.name.localeCompare(b.name);
  });

  return sorted.slice(0, 8);
}

export function createCareerStateFromOpenFootball(
  league: OpenFootballLeague,
  playerClubName: string,
  seasonWeek: number = 1,
): CareerState | null {
  const standings = openFootballToCareerTeams(league, playerClubName);
  if (standings.length < 2) return null;

  const playerClub = standings.find((t) => t.isPlayerClub) || standings[0];
  const opponents = standings.filter((t) => !t.isPlayerClub);
  const nextOpponent = opponents[(seasonWeek - 1) % opponents.length] || opponents[0];

  const fixturesPlayed = Math.min(seasonWeek - 1, league.matches.length);

  return {
    seasonWeek,
    leaguePosition: standings.findIndex((t) => t.isPlayerClub) + 1,
    clubName: playerClub.name,
    playerClubId: playerClub.id,
    fixturesPlayed,
    standings,
    nextOpponentId: nextOpponent.id,
  };
}
