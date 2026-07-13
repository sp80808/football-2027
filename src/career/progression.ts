import { Attributes, PlayerProfile, Position, STAT_KEYS, StatKey, computeOverall } from './playerSchemas';

/**
 * XP & leveling rules.
 *
 * - `xpForLevel(n)` is the *cumulative* XP required to reach level n from level 1.
 *   Curve: 80 * (n-1)^1.45 — gentle early, steeper later. L1→L2 ≈ 80xp, L10→L11 ≈ 2.4k, L30→L31 ≈ 9.7k.
 * - Each level-up grants `POINTS_PER_LEVEL` attribute points (default 3) to spend.
 * - `applyXp` advances a profile's XP, applying any level-ups and awarding points.
 */

export const MAX_LEVEL = 99;
export const POINTS_PER_LEVEL = 3;

export function xpForLevel(level: number): number {
  if (level <= 1) return 0;
  return Math.round(80 * Math.pow(level - 1, 1.45));
}

/** The *next* level reachable for a given cumulative XP. */
export function levelForXp(xp: number): number {
  let level = 1;
  while (level < MAX_LEVEL && xpForLevel(level + 1) <= xp) level++;
  return level;
}

export interface ApplyXpResult {
  profile: PlayerProfile;
  xpGained: number;
  levelsGained: number;
  /** Attribute points awarded this application (POINTS_PER_LEVEL * levelsGained). */
  pointsAwarded: number;
  leveledUp: boolean;
}

export function applyXp(profile: PlayerProfile, xpGained: number): ApplyXpResult {
  const newXp = Math.max(0, profile.xp + xpGained);
  const oldLevel = profile.level;
  const newLevel = Math.min(MAX_LEVEL, levelForXp(newXp));
  const levelsGained = Math.max(0, newLevel - oldLevel);
  const pointsAwarded = levelsGained * POINTS_PER_LEVEL;

  const updated: PlayerProfile = {
    ...profile,
    xp: newXp,
    level: newLevel,
    unspentPoints: profile.unspentPoints + pointsAwarded,
  };

  return { profile: updated, xpGained, levelsGained, pointsAwarded, leveledUp: levelsGained > 0 };
}

/**
 * Spend attribute points. Returns a new profile. Validates point budget and
 * clamps each stat to 1–99. Throws if `points` exceed available budget.
 */
export function spendPoints(
  profile: PlayerProfile,
  allocation: Partial<Record<StatKey, number>>,
): PlayerProfile {
  const totalRequested = STAT_KEYS.reduce((sum, k) => sum + (allocation[k] ?? 0), 0);
  if (totalRequested <= 0) return profile;
  if (totalRequested > profile.unspentPoints) {
    throw new Error(`Not enough points: requested ${totalRequested}, have ${profile.unspentPoints}`);
  }

  const attributes: Attributes = { ...profile.attributes };
  for (const k of STAT_KEYS) {
    const add = allocation[k] ?? 0;
    attributes[k] = Math.max(1, Math.min(99, attributes[k] + add));
  }

  return {
    ...profile,
    attributes,
    unspentPoints: profile.unspentPoints - totalRequested,
  };
}

/**
 * XP awarded per on-pitch action. Tuned so a busy match (many passes, a shot,
 * maybe a goal) yields meaningful progression early but slows at higher levels
 * via the curve in xpForLevel.
 */
export const XP_REWARDS = {
  passCompleted: 5,
  keyPass: 12,          // a pass that directly sets up a shot
  shotOnTarget: 15,
  shotOffTarget: 4,
  goal: 100,
  assist: 60,
  tackleWon: 20,
  interception: 10,
  save: 30,             // keeper
  clearance: 8,
  cleanSheetBonus: 40,  // defenders/GK when conceding 0 (per match, per-player)
  matchWinBonus: 50,
  matchDrawBonus: 15,
  /** Per minute of being on the pitch but not directly acting (participation). */
  participationPerMinute: 3,
} as const;

export type XPAction = keyof typeof XP_REWARDS;

/**
 * Sum a per-action count map into total XP.
 * `participationMinutes` is added separately using participationPerMinute.
 */
export function totalXpForMatch(
  counts: Partial<Record<XPAction, number>>,
  participationMinutes = 0,
): number {
  let total = participationMinutes * XP_REWARDS.participationPerMinute;
  (Object.keys(counts) as XPAction[]).forEach((action) => {
    total += (counts[action] ?? 0) * XP_REWARDS[action];
  });
  return Math.round(total);
}

/** Recompute the cached Overall after attributes change (defensive convenience). */
export function overallFor(profile: PlayerProfile): number {
  return computeOverall(profile.attributes, profile.position as Position);
}
