import { Attributes, PlayerProfile, STAT_KEYS, StatKey, computeOverall } from './playerSchemas';

/**
 * Off-pitch training & coaching.
 *
 * Between matches the manager assigns a coaching PROGRAMME per player. Each
 * programme drifts a subset of attributes up (focus stats) and others slightly
 * down (neglect stats), scaled by intensity and the player's age curve. Every
 * training week costs FITNESS and carries a small injury risk.
 *
 * This is the off-pitch counterpart to on-pitch XP: even players who didn't
 * play develop according to their training plan.
 */

export type ProgrammeId =
  | 'rest'
  | 'attacking'
  | 'defensive'
  | 'conditioning'
  | 'technical'
  | 'balanced';

export interface TrainingProgramme {
  id: ProgrammeId;
  label: string;
  description: string;
  /** Stats that gain each week (per-intensity-point, before age curve). */
  focus: Partial<Record<StatKey, number>>;
  /** Stats that decay slightly from neglect. */
  neglect: Partial<Record<StatKey, number>>;
  /** Fitness cost per intensity point. */
  fitnessCost: number;
  /** Baseline injury risk (0–1) at full intensity. */
  injuryRisk: number;
}

export const PROGRAMMES: Record<ProgrammeId, TrainingProgramme> = {
  rest: {
    id: 'rest', label: 'Rest', description: 'Recover fitness; minor attribute drift.',
    focus: {}, neglect: { shooting: 0.05, defense: 0.05 }, fitnessCost: -25, injuryRisk: 0,
  },
  attacking: {
    id: 'attacking', label: 'Attacking Focus', description: 'Shooting, finishing, dribbling.',
    focus: { shooting: 1.1, dribbling: 0.8, pace: 0.4 },
    neglect: { defense: 0.25, physical: 0.15 },
    fitnessCost: 10, injuryRisk: 0.02,
  },
  defensive: {
    id: 'defensive', label: 'Defensive Drill', description: 'Tackling, positioning, physicality.',
    focus: { defense: 1.1, physical: 0.7, passing: 0.3 },
    neglect: { shooting: 0.25, dribbling: 0.15 },
    fitnessCost: 10, injuryRisk: 0.02,
  },
  conditioning: {
    id: 'conditioning', label: 'Conditioning', description: 'Pace, stamina, strength.',
    focus: { pace: 0.9, physical: 0.9 },
    neglect: { dribbling: 0.1, shooting: 0.1 },
    fitnessCost: 16, injuryRisk: 0.04,
  },
  technical: {
    id: 'technical', label: 'Technical', description: 'Passing, ball control, vision.',
    focus: { passing: 1.0, dribbling: 0.6 },
    neglect: { physical: 0.15 },
    fitnessCost: 8, injuryRisk: 0.015,
  },
  balanced: {
    id: 'balanced', label: 'Balanced', description: 'Light all-round maintenance.',
    focus: { passing: 0.4, dribbling: 0.4, defense: 0.4, physical: 0.4 },
    neglect: {},
    fitnessCost: 6, injuryRisk: 0.01,
  },
};

export type Intensity = 'light' | 'standard' | 'intense';
const INTENSITY_SCALE: Record<Intensity, number> = { light: 0.6, standard: 1.0, intense: 1.4 };

/** Age-based development multiplier (peak ~24 for physical, ~27 technical). */
export function ageCurve(profile: PlayerProfile): number {
  const age = profile.age;
  if (age <= 20) return 1.25; // prospects grow fast
  if (age <= 26) return 1.0;
  if (age <= 30) return 0.7;
  if (age <= 33) return 0.4;
  return 0.15;
}

export interface TrainingOutcome {
  profile: PlayerProfile;
  attrDeltas: Partial<Record<StatKey, number>>;
  fitnessDelta: number;
  injured: boolean;
}

/** Apply one training week to a player. */
export function applyTraining(
  profile: PlayerProfile,
  programmeId: ProgrammeId,
  intensity: Intensity = 'standard',
  rng: () => number = Math.random,
): TrainingOutcome {
  const programme = PROGRAMMES[programmeId];
  const scale = INTENSITY_SCALE[intensity];
  const growth = ageCurve(profile);

  const attrDeltas: Partial<Record<StatKey, number>> = {};
  const attributes: Attributes = { ...profile.attributes };

  for (const key of STAT_KEYS) {
    const gain = (programme.focus[key] ?? 0) * scale * growth * 0.6;
    const loss = (programme.neglect[key] ?? 0) * scale * 0.4;
    const delta = gain - loss;
    if (Math.abs(delta) > 0.001) {
      // probabilistic: each ~1.0 expected delta = 1 point ~63% of the time
      const whole = Math.floor(delta);
      const frac = delta - whole;
      let points = whole;
      if (rng() < frac) points += 1;
      if (points !== 0) {
        attributes[key] = Math.max(1, Math.min(99, attributes[key] + points));
        attrDeltas[key] = points;
      }
    }
  }

  const fitnessDelta = -Math.round(programme.fitnessCost * scale);
  const fitness = Math.max(0, Math.min(100, profile.fitness + fitnessDelta));
  const injured = programme.injuryRisk > 0 && rng() < programme.injuryRisk * scale * growth;

  return {
    profile: { ...profile, attributes, fitness: injured ? Math.max(0, fitness - 30) : fitness },
    attrDeltas,
    fitnessDelta,
    injured,
  };
}

/** Convenience: a player's current overall (recomputed from attributes). */
export function overallOf(profile: PlayerProfile): number {
  return computeOverall(profile.attributes, profile.position);
}
