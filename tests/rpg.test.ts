import { describe, expect, it } from 'vitest';
import {
  Attributes,
  Position,
  STAT_KEYS,
  computeOverall,
  PlayerProfile,
} from '../src/career/playerSchemas';
import {
  applyXp,
  levelForXp,
  xpForLevel,
  spendPoints,
  totalXpForMatch,
  XP_REWARDS,
  POINTS_PER_LEVEL,
} from '../src/career/progression';
import { generateSquad, squadOverall } from '../src/career/rosterGenerator';

function makeProfile(overrides: Partial<PlayerProfile> = {}): PlayerProfile {
  return {
    id: 'test',
    name: 'Test Player',
    position: 'CM',
    age: 24,
    attributes: { pace: 70, shooting: 70, passing: 70, dribbling: 70, defense: 70, physical: 70 },
    xp: 0,
    level: 1,
    unspentPoints: 0,
    fitness: 100,
    morale: 70,
    kitNumber: 8,
    ...overrides,
  };
}

describe('attributes & overall', () => {
  it('weights stats by position', () => {
    const strikerAttrs: Attributes = { pace: 90, shooting: 90, passing: 50, dribbling: 80, defense: 30, physical: 70 };
    const defenderAttrs: Attributes = { pace: 60, shooting: 30, passing: 60, dribbling: 50, defense: 90, physical: 85 };
    expect(computeOverall(strikerAttrs, 'ST')).toBeGreaterThan(computeOverall(strikerAttrs, 'CB'));
    expect(computeOverall(defenderAttrs, 'CB')).toBeGreaterThan(computeOverall(defenderAttrs, 'ST'));
  });

  it('clamps overall to 1–99', () => {
    const min: Attributes = { pace: 1, shooting: 1, passing: 1, dribbling: 1, defense: 1, physical: 1 };
    const max: Attributes = { pace: 99, shooting: 99, passing: 99, dribbling: 99, defense: 99, physical: 99 };
    expect(computeOverall(min, 'CM')).toBeGreaterThanOrEqual(1);
    expect(computeOverall(max, 'CM')).toBeLessThanOrEqual(99);
  });
});

describe('xp curve', () => {
  it('starts at zero for level 1', () => {
    expect(xpForLevel(1)).toBe(0);
    expect(levelForXp(0)).toBe(1);
  });

  it('is monotonically increasing', () => {
    let prev = -1;
    for (let lvl = 1; lvl <= 30; lvl++) {
      const need = xpForLevel(lvl);
      expect(need).toBeGreaterThan(prev);
      prev = need;
    }
  });

  it('levelForXp is the inverse of xpForLevel', () => {
    for (const lvl of [1, 2, 5, 10, 20]) {
      expect(levelForXp(xpForLevel(lvl))).toBe(lvl);
    }
  });

  it('early progression is reachable from a single good match', () => {
    // One goal + 5 passes + 2 tackles + ~10 min participation
    const match = totalXpForMatch(
      { goal: 1, passCompleted: 5, tackleWon: 2 },
      10,
    );
    expect(levelForXp(match)).toBeGreaterThanOrEqual(2);
  });
});

describe('applyXp', () => {
  it('awards points on level up', () => {
    const profile = makeProfile({ level: 1, xp: 0, unspentPoints: 0 });
    const result = applyXp(profile, 200); // enough for a few levels
    expect(result.leveledUp).toBe(true);
    expect(result.levelsGained).toBeGreaterThan(0);
    expect(result.pointsAwarded).toBe(result.levelsGained * POINTS_PER_LEVEL);
    expect(result.profile.unspentPoints).toBe(result.pointsAwarded);
    expect(result.profile.level).toBe(result.profile.level);
  });

  it('accumulates xp without levelling when below threshold', () => {
    const profile = makeProfile({ level: 5, xp: xpForLevel(5), unspentPoints: 0 });
    const small = applyXp(profile, 10);
    expect(small.leveledUp).toBe(false);
    expect(small.profile.xp).toBe(xpForLevel(5) + 10);
    expect(small.profile.unspentPoints).toBe(0);
  });
});

describe('spendPoints', () => {
  it('spends from the budget and clamps stats', () => {
    const profile = makeProfile({ unspentPoints: 10, attributes: { pace: 95, shooting: 60, passing: 70, dribbling: 70, defense: 70, physical: 70 } });
    // Requesting more than budget → throws.
    expect(() => spendPoints(profile, { pace: 10, shooting: 3 })).toThrow();

    const ok = spendPoints(profile, { pace: 5, shooting: 3 });
    expect(ok.attributes.pace).toBe(99); // clamped from 95+5 = 100
    expect(ok.attributes.shooting).toBe(63);
    expect(ok.unspentPoints).toBe(2); // 10 - 8 requested
  });

  it('no-op when nothing allocated', () => {
    const profile = makeProfile({ unspentPoints: 5 });
    expect(spendPoints(profile, {})).toBe(profile);
  });
});

describe('squad generation', () => {
  it('generates a 16-player squad deterministically', () => {
    const a = generateSquad({ seed: 42, teamRating: 75 });
    const b = generateSquad({ seed: 42, teamRating: 75 });
    expect(a).toHaveLength(16);
    expect(b.map((p) => p.name)).toEqual(a.map((p) => p.name));
  });

  it('includes at least one goalkeeper and is position-balanced', () => {
    const squad = generateSquad({ seed: 1 });
    const positions = squad.map((p) => p.position);
    expect(positions.filter((p) => p === 'GK').length).toBeGreaterThanOrEqual(1);
    expect(positions.filter((p) => p === 'CB').length).toBeGreaterThanOrEqual(2);
    expect(positions.filter((p) => p === 'ST').length).toBeGreaterThanOrEqual(1);
  });

  it('marks exactly one non-keeper as controlled', () => {
    const squad = generateSquad({ seed: 3 });
    const controlled = squad.filter((p) => p.isControlled && !p.isKeeper);
    expect(controlled).toHaveLength(1);
  });

  it('team rating influences squad overall', () => {
    const weak = squadOverall(generateSquad({ seed: 9, teamRating: 60 }));
    const strong = squadOverall(generateSquad({ seed: 9, teamRating: 85 }));
    expect(strong - weak).toBeGreaterThan(10);
  });

  it('all attributes are within 1–99', () => {
    const squad = generateSquad({ seed: 5 });
    for (const p of squad) {
      for (const k of STAT_KEYS) {
        expect(p.attributes[k]).toBeGreaterThanOrEqual(1);
        expect(p.attributes[k]).toBeLessThanOrEqual(99);
      }
    }
  });
});
