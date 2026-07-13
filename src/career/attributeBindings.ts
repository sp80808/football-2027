import { Attributes, PlayerProfile, computeOverall } from './playerSchemas';

/**
 * Bridge between RPG attributes and the live physics engine.
 *
 * Maps a controlled player's 0–99 attributes to effective physics tunables
 * (max speed, accel, control radius, kick power, turn speed). The engine's
 * Player/Keeper read these via `applyBindings()` so a fast striker literally
 * runs faster than a slow defender.
 *
 * Multipliers are normalized so a 50-rating player ≈ baseline config, 99 is
 * ~+25%, and 1 is ~−25%. This keeps the existing tuned feel as the mid-point.
 */

export interface PhysicsBindings {
  /** Multiplier on PLAYER_SPRINT_SPEED and PLAYER_MAX_SPEED. */
  speedMul: number;
  /** Multiplier on PLAYER_ACCEL. */
  accelMul: number;
  /** Multiplier on PLAYER_CONTROL_RADIUS / touch distances. */
  controlMul: number;
  /** Multiplier on kick (pass/shot) base power. */
  kickPowerMul: number;
  /** Multiplier on turn speed (agility). */
  turnMul: number;
  /** Multiplier on PLAYER_DECEL. */
  decelMul: number;
}

export const BASELINE_BINDINGS: PhysicsBindings = {
  speedMul: 1,
  accelMul: 1,
  controlMul: 1,
  kickPowerMul: 1,
  turnMul: 1,
  decelMul: 1,
};

/** Map a 1–99 rating to a ~0.75–1.25 multiplier centred at 50. */
function ratingToMul(rating: number, perPoint = 0.005): number {
  // 50 → 1.0; 99 → 1.245; 1 → 0.755
  return 1 + (rating - 50) * perPoint;
}

export function bindingsForProfile(profile: PlayerProfile): PhysicsBindings {
  const a: Attributes = profile.attributes;
  const overall = computeOverall(a, profile.position);
  return {
    speedMul: ratingToMul(a.pace, 0.0045),
    accelMul: ratingToMul((a.pace + a.physical) / 2, 0.004),
    controlMul: ratingToMul(a.dribbling, 0.003),        // ±15% range
    kickPowerMul: ratingToMul(
      profile.position === 'GK' || ['CB','CDM','LB','RB'].includes(profile.position)
        ? (a.passing + a.physical) / 2
        : (a.shooting + a.passing) / 2,
      0.0035,
    ),
    turnMul: ratingToMul((a.dribbling + a.pace) / 2, 0.004),
    decelMul: ratingToMul(a.physical, 0.003),
  };
}

/** Keeper-specific bindings (dive speed, reaction, reach). */
export interface KeeperBindings {
  diveSpeedMul: number;
  saveRadiusMul: number;
  reactionMul: number; // lower = reacts sooner (keeper lookahead)
}

export function keeperBindingsForProfile(profile: PlayerProfile): KeeperBindings {
  const a = profile.attributes;
  return {
    diveSpeedMul: ratingToMul((a.pace + a.physical) / 2, 0.004),
    saveRadiusMul: ratingToMul((a.defense + a.physical) / 2, 0.003),
    reactionMul: 1 / ratingToMul((a.defense + a.passing) / 2, 0.003),
  };
}
