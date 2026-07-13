import { z } from 'zod';

export const LeagueTeamSchema = z.object({
  id: z.string(),
  name: z.string(),
  played: z.number().int().min(0),
  won: z.number().int().min(0),
  drawn: z.number().int().min(0),
  lost: z.number().int().min(0),
  points: z.number().int().min(0),
  isPlayerClub: z.boolean().optional(),
});

export const CareerStateSchema = z.object({
  seasonWeek: z.number().int().min(1),
  leaguePosition: z.number().int().min(1).max(8),
  clubName: z.string(),
  playerClubId: z.string(),
  fixturesPlayed: z.number().int().min(0),
  standings: z.array(LeagueTeamSchema).length(8),
  nextOpponentId: z.string(),
});

export type LeagueTeam = z.infer<typeof LeagueTeamSchema>;
export type CareerState = z.infer<typeof CareerStateSchema>;
