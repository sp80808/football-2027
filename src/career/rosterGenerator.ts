import { Attributes, PlayerProfile, Position, STAT_KEYS, computeOverall } from './playerSchemas';
import { SeededRandom } from '../engine/SeededRandom';

/**
 * Deterministic squad generator. Given a seed + team rating (overall target),
 * produce a balanced ~16-player squad with plausible names, positions, ages,
 * and attribute spreads centred on the team rating.
 *
 * Position distribution aims for a usable matchday squad:
 * 2 GK, 4 CB, 2 LB, 2 RB, 3 CM/CDM/CAM, 2 LW/RW, 3 ST  (≈18, trimmed to 16).
 */

const FIRST_NAMES = [
  'Liam', 'Noah', 'Ethan', 'Lucas', 'Mason', 'Logan', 'James', 'Aiden', 'Elijah', 'Owen',
  'Diego', 'Mateo', 'Carlos', 'Marco', 'Andrea', 'Lorenzo', 'Florian', 'Sven', 'Mikael', 'Pierre',
  'Kai', 'Ravi', 'Yuki', 'Seok', 'Tariq', 'Omar', 'Sadio', 'Kwame', 'Diego', 'Hugo',
];
const LAST_NAMES = [
  'Silva', 'Rossi', 'Müller', 'Costa', 'Nakamura', 'Okafor', 'Fernández', 'Kowalski', 'Dubois', 'Hansen',
  'Bauer', 'Vargas', 'Lindberg', 'Petit', 'Novak', 'Sato', 'Kim', 'Ahmed', 'Reyes', 'Schmidt',
];

/**
 * Positions that make up a squad. A 16-player matchday squad must guarantee
 * coverage of every role (GK, CB, FB, MF, Wing, ST), so we interleave roles
 * rather than front-loading defenders. Order = fill priority for trimming.
 */
const SQUAD_POSITIONS: { pos: Position; count: number }[] = [
  { pos: 'GK', count: 2 },
  { pos: 'ST', count: 2 },
  { pos: 'CB', count: 3 },
  { pos: 'CM', count: 2 },
  { pos: 'LW', count: 1 },
  { pos: 'RW', count: 1 },
  { pos: 'LB', count: 1 },
  { pos: 'RB', count: 1 },
  { pos: 'CDM', count: 1 },
  { pos: 'CAM', count: 1 },
  { pos: 'CB', count: 1 }, // extra defenders
  { pos: 'CM', count: 1 },
  { pos: 'ST', count: 1 },
];

function pickName(rng: SeededRandom): string {
  const first = FIRST_NAMES[Math.floor(rng.next() * FIRST_NAMES.length)];
  const last = LAST_NAMES[Math.floor(rng.next() * LAST_NAMES.length)];
  return `${first} ${last}`;
}

function jitter(rng: SeededRandom, centre: number, spread: number): number {
  const v = centre + (rng.next() - 0.5) * 2 * spread;
  return Math.max(1, Math.min(99, Math.round(v)));
}

/**
 * Generate attributes for a player at `position` around `teamRating`.
 * The position's weighted stats get a small boost (so a striker shoots well,
 * a defender defends well); off-position stats drift lower.
 */
function generateAttributes(rng: SeededRandom, position: Position, teamRating: number): Attributes {
  // Players cluster ±8 of the team rating, with rare wider variance.
  const playerCentre = jitter(rng, teamRating, 8);
  const attrs = {} as Attributes;
  // import position weights lazily to avoid a cycle
  const weights = POSITION_WEIGHTS_FOR_GEN[position];
  for (const key of STAT_KEYS) {
    const isKeyStat = weights[key] >= 0.2;
    const isWeakStat = weights[key] <= 0.05;
    const centre = isKeyStat ? playerCentre + 6 : isWeakStat ? playerCentre - 14 : playerCentre - 3;
    attrs[key] = jitter(rng, centre, 8);
  }
  return attrs;
}

// Local copy to avoid importing the zod-facing weights object circularly at module eval.
// Kept in sync with POSITION_WEIGHTS in playerSchemas.ts.
const POSITION_WEIGHTS_FOR_GEN: Record<Position, Record<import('./playerSchemas').StatKey, number>> = {
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

let KIT_NUMBERS_SHUFFLED: number[] | null = null;
function takeKitNumber(rng: SeededRandom): number {
  if (!KIT_NUMBERS_SHUFFLED) {
    KIT_NUMBERS_SHUFFLED = Array.from({ length: 99 }, (_, i) => i + 1);
  }
  // Pick a random unused-ish number deterministically.
  const idx = Math.floor(rng.next() * KIT_NUMBERS_SHUFFLED.length);
  return KIT_NUMBERS_SHUFFLED[idx];
}

export interface GenerateSquadOptions {
  seed?: number;
  /** Target team Overall (default 75 — a solid mid-table side). */
  teamRating?: number;
  /** Squad size (default 16). */
  size?: number;
}

export function generateSquad(opts: GenerateSquadOptions = {}): PlayerProfile[] {
  const seed = opts.seed ?? 7777;
  const teamRating = opts.teamRating ?? 75;
  const size = opts.size ?? 16;
  const rng = new SeededRandom(seed);

  // Build the ordered position list, then trim/pad to `size`.
  const positions: Position[] = [];
  for (const { pos, count } of SQUAD_POSITIONS) {
    for (let i = 0; i < count; i++) positions.push(pos);
  }
  // Truncate to requested size (keeps most important positions).
  const chosen = positions.slice(0, size);

  const players: PlayerProfile[] = [];
  const usedNames = new Set<string>();

  chosen.forEach((position, index) => {
    let name = pickName(rng);
    let guard = 0;
    while (usedNames.has(name) && guard < 10) { name = pickName(rng); guard++; }
    usedNames.add(name);

    const age = 18 + Math.floor(rng.next() * 20); // 18–37
    const attributes = generateAttributes(rng, position, teamRating);
    const overall = computeOverall(attributes, position);

    players.push({
      id: `ply_${seed}_${index}`,
      name,
      position,
      age,
      attributes,
      xp: 0,
      level: 1,
      unspentPoints: 0,
      fitness: 100,
      morale: 70,
      kitNumber: takeKitNumber(rng),
      isKeeper: position === 'GK',
      isControlled: index === 0 && position !== 'GK', // first outfielder controlled by default
    });
    // Mark the first non-GK as controlled.
    if (players[players.length - 1].isControlled) {
      // ensure only one
      for (const p of players) if (p !== players[players.length - 1]) p.isControlled = false;
    }
  });

  // Guarantee exactly one controlled outfield player.
  const controlled = players.filter((p) => p.isControlled && !p.isKeeper);
  if (controlled.length === 0) {
    const firstOutfield = players.find((p) => !p.isKeeper);
    if (firstOutfield) firstOutfield.isControlled = true;
  }

  return players;
}

/** Average Overall across the squad (a coarse team-strength number). */
export function squadOverall(players: PlayerProfile[]): number {
  if (players.length === 0) return 0;
  const sum = players.reduce((s, p) => s + computeOverall(p.attributes, p.position), 0);
  return Math.round(sum / players.length);
}
