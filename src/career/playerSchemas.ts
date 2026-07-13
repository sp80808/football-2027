import { z } from 'zod';
import { SeededRandom } from '../engine/SeededRandom';

/**
 * Canonical RPG attribute model for Football 2027.
 *
 * Design decision (2026-07-13): FIFA-style six-stat model on a 0–99 scale,
 * chosen as canonical over the three conflicting dead models found in the repo
 * (dormant fields in Player.ts, TacticalAI's 1–20 buckets, FootballDataPipeline's
 * nested schema). These six stats are what the UI, XP, leveling, and on-pitch
 * physics binding all consume.
 */

export const STAT_KEYS = ['pace', 'shooting', 'passing', 'dribbling', 'defense', 'physical'] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export const AttributesSchema = z.object({
  pace: z.number().int().min(1).max(99),
  shooting: z.number().int().min(1).max(99),
  passing: z.number().int().min(1).max(99),
  dribbling: z.number().int().min(1).max(99),
  defense: z.number().int().min(1).max(99),
  physical: z.number().int().min(1).max(99),
});
export type Attributes = z.infer<typeof AttributesSchema>;

export const PositionSchema = z.enum([
  'GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST',
]);
export type Position = z.infer<typeof PositionSchema>;

/**
 * Per-position weights for the Overall rating. Sums to 1.0 so overall is a
 * weighted average on the 0–99 scale. Values reflect real football intuition:
 * a striker is judged mostly on shooting + pace, a defender on defending + physical, etc.
 */
export const POSITION_WEIGHTS: Record<Position, Record<StatKey, number>> = {
  GK:  { pace: 0.1, shooting: 0.05, passing: 0.2, dribbling: 0.05, defense: 0.5, physical: 0.1 },
  CB:  { pace: 0.1, shooting: 0.02, passing: 0.13, dribbling: 0.05, defense: 0.5, physical: 0.2 },
  LB:  { pace: 0.22, shooting: 0.03, passing: 0.17, dribbling: 0.1, defense: 0.33, physical: 0.15 },
  RB:  { pace: 0.22, shooting: 0.03, passing: 0.17, dribbling: 0.1, defense: 0.33, physical: 0.15 },
  CDM: { pace: 0.1, shooting: 0.08, passing: 0.27, dribbling: 0.12, defense: 0.33, physical: 0.1 },
  CM:  { pace: 0.12, shooting: 0.13, passing: 0.3, dribbling: 0.2, defense: 0.15, physical: 0.1 },
  CAM: { pace: 0.13, shooting: 0.2, passing: 0.27, dribbling: 0.25, defense: 0.05, physical: 0.1 },
  LW:  { pace: 0.27, shooting: 0.18, passing: 0.17, dribbling: 0.28, defense: 0.02, physical: 0.08 },
  RW:  { pace: 0.27, shooting: 0.18, passing: 0.17, dribbling: 0.28, defense: 0.02, physical: 0.08 },
  ST:  { pace: 0.24, shooting: 0.36, passing: 0.12, dribbling: 0.16, defense: 0.02, physical: 0.1 },
};

/** Compute the 0–99 Overall for a player given their attributes + position. */
export function computeOverall(attrs: Attributes, position: Position): number {
  const w = POSITION_WEIGHTS[position];
  let sum = 0;
  for (const key of STAT_KEYS) sum += attrs[key] * w[key];
  return Math.round(sum);
}

export const PlayerProfileSchema = z.object({
  id: z.string(),
  name: z.string(),
  position: PositionSchema,
  age: z.number().int().min(15).max(45),
  attributes: AttributesSchema,
  /** Cumulative XP. xpForLevel maps level thresholds. */
  xp: z.number().min(0),
  /** Derived from xp; stored for convenience. */
  level: z.number().int().min(1),
  /** Attribute points available to spend (gained on level-up). */
  unspentPoints: z.number().int().min(0),
  /** 0–100, drained by matches & training, recovered by rest. */
  fitness: z.number().min(0).max(100),
  /** 0–100 morale, affected by results, playing time, etc. */
  morale: z.number().min(0).max(100),
  /** Kit number 1–99. */
  kitNumber: z.number().int().min(1).max(99),
  /** True if this squad member is the currently controlled outfield player. */
  isControlled: z.boolean().optional(),
  /** True if this is the starting goalkeeper (keeper role is special-cased). */
  isKeeper: z.boolean().optional(),
});
export type PlayerProfile = z.infer<typeof PlayerProfileSchema>;

export const SquadSchema = z.object({
  players: z.array(PlayerProfileSchema).min(11),
});
export type Squad = z.infer<typeof SquadSchema>;
