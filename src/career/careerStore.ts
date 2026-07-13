import { create } from 'zustand';
import {
  CareerState,
  CareerStateSchema,
  LeagueTeam,
  LeagueTeamSchema,
} from './careerSchemas';
import { createCareerStateFromOpenFootball, fetchOpenFootballLeague } from './openFootballLoader';

const STORAGE_KEY = 'football-2027-career';

const OPPONENT_NAMES = [
  'North United',
  'City Athletic',
  'Harbour Town',
  'Valley Rovers',
  'East End',
  'Metro FC',
  'County Wanderers',
] as const;

export const PLAYER_CLUB_NAME = 'Riverside FC';
const PLAYER_CLUB_ID = 'riverside-fc';

function createDefaultStandings(): LeagueTeam[] {
  const playerClub: LeagueTeam = {
    id: PLAYER_CLUB_ID,
    name: PLAYER_CLUB_NAME,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points: 0,
    isPlayerClub: true,
  };

  const opponents = OPPONENT_NAMES.map((name, index) => ({
    id: `opponent-${index + 1}`,
    name,
    played: 0,
    won: 0,
    drawn: 0,
    lost: 0,
    points: 0,
  }));

  return [playerClub, ...opponents];
}

export function createDefaultCareerState(): CareerState {
  const standings = createDefaultStandings();
  return {
    seasonWeek: 1,
    leaguePosition: 1,
    clubName: PLAYER_CLUB_NAME,
    playerClubId: PLAYER_CLUB_ID,
    fixturesPlayed: 0,
    standings,
    nextOpponentId: standings[1].id,
  };
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

function leaguePositionForClub(standings: LeagueTeam[], clubId: string): number {
  const sorted = sortStandings(standings);
  const index = sorted.findIndex((team) => team.id === clubId);
  return index === -1 ? 8 : index + 1;
}

function pickNextOpponent(standings: LeagueTeam[], week: number): string {
  const opponents = standings.filter((team) => !team.isPlayerClub);
  return opponents[(week - 1) % opponents.length].id;
}

function applyResult(team: LeagueTeam, goalsFor: number, goalsAgainst: number): LeagueTeam {
  const won = goalsFor > goalsAgainst ? 1 : 0;
  const drawn = goalsFor === goalsAgainst ? 1 : 0;
  const lost = goalsFor < goalsAgainst ? 1 : 0;
  const points = won * 3 + drawn;

  return {
    ...team,
    played: team.played + 1,
    won: team.won + won,
    drawn: team.drawn + drawn,
    lost: team.lost + lost,
    points: team.points + points,
  };
}

function loadPersisted(): CareerState | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = CareerStateSchema.safeParse(JSON.parse(raw));
    return parsed.success ? parsed.data : null;
  } catch {
    return null;
  }
}

function persist(state: CareerState) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

interface CareerActions {
  getNextOpponent: () => LeagueTeam;
  recordMatchResult: (homeScore: number, awayScore: number) => void;
  resetCareer: () => void;
  loadOpenFootballData: (leagueCode: string, season: string, playerClubName: string) => Promise<void>;
}

export type CareerStore = CareerState & CareerActions;

const saved = loadPersisted();

export const useCareerStore = create<CareerStore>((set, get) => ({
  ...(saved ?? createDefaultCareerState()),

  getNextOpponent: () => {
    const current = get();
    const opponent = current.standings.find((team) => team.id === current.nextOpponentId);
    return opponent ?? current.standings.find((team) => !team.isPlayerClub)!;
  },

  recordMatchResult: (homeScore, awayScore) => {
    const current = get();
    const opponentId = current.nextOpponentId;

    const updatedStandings = current.standings.map((team) => {
      if (team.id === current.playerClubId) return applyResult(team, homeScore, awayScore);
      if (team.id === opponentId) return applyResult(team, awayScore, homeScore);
      return team;
    });

    const nextWeek = current.seasonWeek + 1;
    const nextState: CareerState = {
      seasonWeek: nextWeek,
      leaguePosition: leaguePositionForClub(updatedStandings, current.playerClubId),
      clubName: current.clubName,
      playerClubId: current.playerClubId,
      fixturesPlayed: current.fixturesPlayed + 1,
      standings: updatedStandings,
      nextOpponentId: pickNextOpponent(updatedStandings, nextWeek),
    };

    const parsed = CareerStateSchema.parse(nextState);
    set(parsed);
    persist(parsed);
  },

  resetCareer: () => {
    const fresh = createDefaultCareerState();
    set(fresh);
    persist(fresh);
  },

  loadOpenFootballData: async (leagueCode: string, season: string, playerClubName: string) => {
    const league = await fetchOpenFootballLeague(leagueCode, season);
    if (!league) return;

    const state = createCareerStateFromOpenFootball(league, playerClubName || PLAYER_CLUB_NAME);
    if (!state) return;

    const parsed = CareerStateSchema.parse(state);
    set(parsed);
    persist(parsed);
  },
}));

export function parseCareerState(raw: unknown): CareerState | null {
  const parsed = CareerStateSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}

export function parseLeagueTeam(raw: unknown): LeagueTeam | null {
  const parsed = LeagueTeamSchema.safeParse(raw);
  return parsed.success ? parsed.data : null;
}
