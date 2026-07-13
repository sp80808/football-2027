import { describe, expect, it, beforeEach } from 'vitest';
import {
  createDefaultCareerState,
  useCareerStore,
  PLAYER_CLUB_NAME,
} from '../src/career/careerStore';
import { CareerStateSchema } from '../src/career/careerSchemas';

describe('career store', () => {
  beforeEach(() => {
    useCareerStore.getState().resetCareer();
  });

  it('creates a valid default career state', () => {
    const state = createDefaultCareerState();
    expect(CareerStateSchema.safeParse(state).success).toBe(true);
    expect(state.clubName).toBe(PLAYER_CLUB_NAME);
    expect(state.standings).toHaveLength(8);
    expect(state.fixturesPlayed).toBe(0);
    expect(state.seasonWeek).toBe(1);
  });

  it('records a win and updates standings', () => {
    const before = useCareerStore.getState();
    const playerBefore = before.standings.find((team) => team.isPlayerClub)!;
    const opponentBefore = before.getNextOpponent();

    useCareerStore.getState().recordMatchResult(2, 1);

    const after = useCareerStore.getState();
    const playerAfter = after.standings.find((team) => team.isPlayerClub)!;
    const opponentAfter = after.standings.find((team) => team.id === opponentBefore.id)!;

    expect(after.fixturesPlayed).toBe(1);
    expect(after.seasonWeek).toBe(2);
    expect(playerAfter.played).toBe(playerBefore.played + 1);
    expect(playerAfter.won).toBe(playerBefore.won + 1);
    expect(playerAfter.points).toBe(playerBefore.points + 3);
    expect(opponentAfter.lost).toBe(opponentBefore.lost + 1);
    expect(after.leaguePosition).toBeGreaterThanOrEqual(1);
    expect(after.leaguePosition).toBeLessThanOrEqual(8);
  });

  it('records a draw', () => {
    useCareerStore.getState().recordMatchResult(1, 1);
    const player = useCareerStore.getState().standings.find((team) => team.isPlayerClub)!;
    expect(player.drawn).toBe(1);
    expect(player.points).toBe(1);
  });

  it('records a loss', () => {
    useCareerStore.getState().recordMatchResult(0, 2);
    const player = useCareerStore.getState().standings.find((team) => team.isPlayerClub)!;
    expect(player.lost).toBe(1);
    expect(player.points).toBe(0);
  });
});
