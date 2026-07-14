/**
 * FixtureScheduler — Deterministic round-robin fixture generation.
 *
 * Uses the circle method (rotate-and-pair) with the project's SeededRandom
 * to produce reproducible fixture lists. Supports:
 *   - Even and odd team counts
 *   - Home/away alternation per matchday
 *   - Double round-robin (home + away legs)
 *   - Optional derby constraints (minimum rounds between derbies)
 *
 * Reference: https://en.wikipedia.org/wiki/Round-robin_tournament#Circle_method
 */

import { SeededRandom } from '../engine/SeededRandom';

export interface Fixture {
  /** Matchday number (1-indexed). */
  matchday: number;
  /** Home team identifier. */
  home: string;
  /** Away team identifier. */
  away: string;
}

export interface ScheduleOptions {
  /** Team identifiers. Must have ≥ 2 entries. */
  teams: string[];
  /** Seed for deterministic shuffling. */
  seed: number;
  /** If true, generate both home and away legs (default: true). */
  doubleRoundRobin?: boolean;
  /** Pairs of team IDs that are derbies. Scheduler will try to space them apart. */
  derbies?: Array<[string, string]>;
  /** Minimum matchdays between derby fixtures (default: 3). */
  derbySpacing?: number;
}

/**
 * Generate a complete round-robin schedule using the circle method.
 *
 * For n teams (padded to even with a "BYE" if odd), the algorithm:
 * 1. Fix team[0] in position 0.
 * 2. Rotate teams[1..n-1] through the remaining positions.
 * 3. Pair position i with position (n-1-i) each round.
 * 4. Alternate home/away per round to balance.
 */
export function generateSchedule(options: ScheduleOptions): Fixture[] {
  const {
    teams: rawTeams,
    seed,
    doubleRoundRobin = true,
    derbies = [],
    derbySpacing = 3,
  } = options;

  if (rawTeams.length < 2) {
    throw new Error('FixtureScheduler: need at least 2 teams');
  }

  const rng = new SeededRandom(seed);

  // Shuffle teams deterministically to randomize fixture order.
  const teams = [...rawTeams];
  for (let i = teams.length - 1; i > 0; i--) {
    const j = Math.floor(rng.next() * (i + 1));
    [teams[i], teams[j]] = [teams[j], teams[i]];
  }

  // Pad to even number if necessary.
  const hasBye = teams.length % 2 !== 0;
  if (hasBye) teams.push('__BYE__');

  const n = teams.length;
  const rounds = n - 1;
  const halfN = n / 2;

  // Circle method: fix teams[0], rotate the rest.
  const circle = teams.slice(1); // mutable rotating array

  const firstLeg: Fixture[] = [];
  let matchday = 1;

  for (let round = 0; round < rounds; round++) {
    const roundFixtures: Fixture[] = [];

    // Pair teams[0] with circle[0]
    const top = teams[0];
    const bottom = circle[0];
    if (top !== '__BYE__' && bottom !== '__BYE__') {
      // Alternate home/away for the fixed team each round
      if (round % 2 === 0) {
        roundFixtures.push({ matchday, home: top, away: bottom });
      } else {
        roundFixtures.push({ matchday, home: bottom, away: top });
      }
    }

    // Pair remaining: circle[i] with circle[n-2-i]
    for (let i = 1; i < halfN; i++) {
      const a = circle[i];
      const b = circle[n - 2 - i];
      if (a === '__BYE__' || b === '__BYE__') continue;
      // Alternate based on position + round to balance H/A
      if ((i + round) % 2 === 0) {
        roundFixtures.push({ matchday, home: a, away: b });
      } else {
        roundFixtures.push({ matchday, home: b, away: a });
      }
    }

    firstLeg.push(...roundFixtures);
    matchday++;

    // Rotate: move last element to front
    circle.unshift(circle.pop()!);
  }

  if (!doubleRoundRobin) {
    return applyDerbySpacing(firstLeg, derbies, derbySpacing, rounds);
  }

  // Second leg: reverse home/away, shift matchdays
  const secondLeg: Fixture[] = firstLeg.map((f) => ({
    matchday: f.matchday + rounds,
    home: f.away,
    away: f.home,
  }));

  const fullSchedule = [...firstLeg, ...secondLeg];
  return applyDerbySpacing(fullSchedule, derbies, derbySpacing, rounds * 2);
}

/**
 * Best-effort derby spacing. If two derby fixtures are too close,
 * swap the later one with a non-derby fixture from a distant matchday.
 * This is a heuristic — it won't always find a perfect solution.
 */
function applyDerbySpacing(
  fixtures: Fixture[],
  derbies: Array<[string, string]>,
  minSpacing: number,
  totalRounds: number,
): Fixture[] {
  if (derbies.length === 0) return fixtures;

  const isDerby = (f: Fixture): boolean =>
    derbies.some(
      ([a, b]) =>
        (f.home === a && f.away === b) || (f.home === b && f.away === a),
    );

  // Group by matchday
  const byMatchday = new Map<number, Fixture[]>();
  for (const f of fixtures) {
    const list = byMatchday.get(f.matchday) ?? [];
    list.push(f);
    byMatchday.set(f.matchday, list);
  }

  // Find derby matchdays and check spacing
  const derbyMatchdays: number[] = [];
  for (const f of fixtures) {
    if (isDerby(f) && !derbyMatchdays.includes(f.matchday)) {
      derbyMatchdays.push(f.matchday);
    }
  }
  derbyMatchdays.sort((a, b) => a - b);

  // Simple swap heuristic: if two derby matchdays are too close, try to
  // swap one derby fixture with a non-derby from a distant matchday.
  for (let i = 1; i < derbyMatchdays.length; i++) {
    const gap = derbyMatchdays[i] - derbyMatchdays[i - 1];
    if (gap >= minSpacing) continue;

    // Try to move the derby at derbyMatchdays[i] to a later matchday
    const srcDay = derbyMatchdays[i];
    const srcFixtures = byMatchday.get(srcDay) ?? [];
    const derbyInSrc = srcFixtures.find((f) => isDerby(f));
    if (!derbyInSrc) continue;

    // Look for a swap target at least minSpacing away
    for (let targetDay = srcDay + minSpacing; targetDay <= totalRounds; targetDay++) {
      const targetFixtures = byMatchday.get(targetDay) ?? [];
      const nonDerbyInTarget = targetFixtures.find((f) => !isDerby(f));
      if (!nonDerbyInTarget) continue;

      // Swap matchdays
      derbyInSrc.matchday = targetDay;
      nonDerbyInTarget.matchday = srcDay;
      derbyMatchdays[i] = targetDay;
      break;
    }
  }

  // Re-sort by matchday
  return fixtures.sort((a, b) => a.matchday - b.matchday);
}

/**
 * Utility: get all fixtures for a specific team.
 */
export function getTeamFixtures(fixtures: Fixture[], teamId: string): Fixture[] {
  return fixtures.filter((f) => f.home === teamId || f.away === teamId);
}

/**
 * Utility: get all fixtures for a specific matchday.
 */
export function getMatchdayFixtures(fixtures: Fixture[], matchday: number): Fixture[] {
  return fixtures.filter((f) => f.matchday === matchday);
}

/**
 * Utility: validate schedule correctness.
 * Returns an array of error messages (empty = valid).
 */
export function validateSchedule(fixtures: Fixture[], teams: string[]): string[] {
  const errors: string[] = [];

  // Each team pair should meet exactly once per leg
  const pairCounts = new Map<string, number>();
  for (const f of fixtures) {
    const key = [f.home, f.away].sort().join('|');
    pairCounts.set(key, (pairCounts.get(key) ?? 0) + 1);
  }

  for (let i = 0; i < teams.length; i++) {
    for (let j = i + 1; j < teams.length; j++) {
      const key = [teams[i], teams[j]].sort().join('|');
      const count = pairCounts.get(key) ?? 0;
      if (count !== 2) {
        errors.push(`${teams[i]} vs ${teams[j]}: expected 2 meetings, got ${count}`);
      }
    }
  }

  // Each team plays exactly once per matchday
  const matchdays = new Set(fixtures.map((f) => f.matchday));
  for (const md of matchdays) {
    const dayFixtures = fixtures.filter((f) => f.matchday === md);
    const teamsSeen = new Set<string>();
    for (const f of dayFixtures) {
      if (teamsSeen.has(f.home)) errors.push(`Matchday ${md}: ${f.home} plays twice`);
      if (teamsSeen.has(f.away)) errors.push(`Matchday ${md}: ${f.away} plays twice`);
      teamsSeen.add(f.home);
      teamsSeen.add(f.away);
    }
  }

  return errors;
}
