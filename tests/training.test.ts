import { describe, expect, it } from 'vitest';
import { applyTraining, PROGRAMMES, ageCurve, Intensity } from '../src/career/TrainingSystem';
import { PlayerProfile } from '../src/career/playerSchemas';

function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id: 'p1', name: 'Test', position: 'ST', age: 22,
    attributes: { pace: 70, shooting: 70, passing: 70, dribbling: 70, defense: 70, physical: 70 },
    xp: 0, level: 1, unspentPoints: 0, fitness: 100, morale: 70, kitNumber: 9,
    ...overrides,
  };
}

describe('training system', () => {
  it('young players grow faster than veterans', () => {
    expect(ageCurve(makeProfile({ age: 19 }))).toBeGreaterThan(ageCurve(makeProfile({ age: 32 })));
  });

  it('attacking programme boosts shooting-focused stats', () => {
    // Deterministic: force rng to always round up fractional gains.
    const rng = () => 0.0;
    const before = makeProfile({ age: 20 });
    const after = applyTraining(before, 'attacking', 'intense', rng);
    expect(after.profile.attributes.shooting).toBeGreaterThanOrEqual(before.attributes.shooting);
  });

  it('rest recovers fitness', () => {
    const before = makeProfile({ fitness: 40 });
    const after = applyTraining(before, 'rest', 'standard', () => 1);
    expect(after.profile.fitness).toBeGreaterThan(before.fitness);
  });

  it('intense training costs more fitness than light', () => {
    const before = makeProfile({ fitness: 80 });
    const light = applyTraining(before, 'conditioning', 'light' as Intensity, () => 1);
    const intense = applyTraining(before, 'conditioning', 'intense', () => 1);
    expect(intense.fitnessDelta).toBeLessThan(light.fitnessDelta); // more negative
    expect(intense.profile.fitness).toBeLessThan(light.profile.fitness);
  });

  it('attributes never exceed 99 or drop below 1', () => {
    const maxed = makeProfile({ age: 19, attributes: { pace: 99, shooting: 99, passing: 99, dribbling: 99, defense: 99, physical: 99 } });
    for (let i = 0; i < 5; i++) {
      const outcome = applyTraining(maxed, 'attacking', 'intense', () => 0);
      for (const k of ['pace','shooting','passing','dribbling','defense','physical'] as const) {
        expect(outcome.profile.attributes[k]).toBeLessThanOrEqual(99);
      }
    }
  });
});
