/**
 * Instant match simulation — Poisson goal model.
 * Produces the same CareerMatchReport shape as the live 3D match handoff.
 * Fully deterministic when given the same seed.
 */
import { PlayerCard, FilledSlot, CareerMatchReport, GoalEvent, BookingEvent } from '../types';
import { mulberry32, seedFromString, RNG } from '../generation/nameGen';

// ── PRNG helpers ─────────────────────────────────────────────────────────

function poissonSample(lambda: number, rng: RNG): number {
  if (lambda <= 0) return 0;
  if (lambda >= 15) return Math.max(0, Math.round(lambda + Math.sqrt(lambda) * gaussianRNG(rng)));
  const L = Math.exp(-lambda);
  let k = 0, p = 1;
  do { k++; p *= rng(); } while (p > L);
  return k - 1;
}

function gaussianRNG(rng: RNG): number {
  // Box-Muller
  const u1 = Math.max(1e-10, rng());
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// ── Team strength calculator ─────────────────────────────────────────────

const ATTACK_POS  = new Set(['ST','SS','LW','RW','AM','LM','RM']);
const DEFENSE_POS = new Set(['GK','CB','LCB','RCB','LB','RB','LWB','RWB','DM']);

interface TeamStrength { attack: number; defense: number; midfield: number; overall: number }

function calcStrength(slots: FilledSlot[], playerMap: Map<string, PlayerCard>): TeamStrength {
  let att = 0, attN = 0, def = 0, defN = 0, mid = 0, midN = 0;

  for (const slot of slots) {
    if (!slot.playerId) continue;
    const p = playerMap.get(slot.playerId);
    if (!p) continue;
    const ovr = p.ratings.overall * (p.form / 100) * (p.condition / 100);

    if (ATTACK_POS.has(slot.position))       { att += ovr; attN++; }
    else if (DEFENSE_POS.has(slot.position)) { def += ovr; defN++; }
    else                                     { mid += ovr; midN++; }
  }

  const attack  = attN  > 0 ? att  / attN  : 55;
  const defense = defN  > 0 ? def  / defN  : 55;
  const midfield= midN  > 0 ? mid  / midN  : 55;
  const overall = attack * 0.35 + midfield * 0.30 + defense * 0.35;

  return { attack, defense, midfield, overall };
}

// ── Goal event generation ────────────────────────────────────────────────

function pickScorer(slots: FilledSlot[], playerMap: Map<string, PlayerCard>, rng: RNG): { id: string; name: string } | null {
  const attackers = slots
    .filter(s => s.playerId && ATTACK_POS.has(s.position))
    .map(s => playerMap.get(s.playerId!))
    .filter(Boolean) as PlayerCard[];
  const others = slots
    .filter(s => s.playerId && !ATTACK_POS.has(s.position))
    .map(s => playerMap.get(s.playerId!))
    .filter(Boolean) as PlayerCard[];

  const pool = [...attackers, ...attackers, ...attackers, ...others]; // weight attackers 3:1
  if (pool.length === 0) return null;
  const chosen = pool[Math.floor(rng() * pool.length)];
  return { id: chosen.id, name: chosen.knownAs };
}

function generateGoalEvents(
  homeGoals: number, awayGoals: number,
  homeSlots: FilledSlot[], awaySlots: FilledSlot[],
  homeMap: Map<string, PlayerCard>, awayMap: Map<string, PlayerCard>,
  rng: RNG,
): GoalEvent[] {
  const events: GoalEvent[] = [];
  const minutes = Array.from({ length: homeGoals + awayGoals }, () => Math.ceil(rng() * 90)).sort((a, b) => a - b);
  let hg = 0, ag = 0;
  for (const minute of minutes) {
    const isHome = hg < homeGoals && (ag >= awayGoals || rng() < homeGoals / (homeGoals + awayGoals));
    const scorer = isHome ? pickScorer(homeSlots, homeMap, rng) : pickScorer(awaySlots, awayMap, rng);
    if (!scorer) continue;
    events.push({ minute, scorerId: scorer.id, scorerName: scorer.name, isHome, isPenalty: rng() < 0.1, isOwnGoal: false });
    isHome ? hg++ : ag++;
  }
  return events;
}

// ── Narrative generation ─────────────────────────────────────────────────

function generateNarrative(
  homeGoals: number, awayGoals: number,
  homeXG: number, awayXG: number,
  homeClubName: string, awayClubName: string,
): string[] {
  const result = homeGoals > awayGoals ? 'win' : homeGoals < awayGoals ? 'loss' : 'draw';
  const lines: string[] = [];

  if (result === 'win') {
    lines.push(`${homeClubName} secure an important victory at home.`);
    if (homeXG > homeGoals + 1) lines.push('The scoreline flattered the away side — the hosts created far more.');
  } else if (result === 'loss') {
    lines.push(`${awayClubName} leave with all three points.`);
    if (awayXG < awayGoals) lines.push('The visitors were clinical despite limited opportunities.');
  } else {
    lines.push(`Honours even as both sides cancel each other out.`);
  }

  if (homeGoals + awayGoals === 0) lines.push('A hard-fought goalless draw — both keepers barely tested.');
  if (homeGoals + awayGoals >= 5) lines.push('A thrilling, open game with plenty of chances at both ends.');

  return lines;
}

// ── Post-match effects ────────────────────────────────────────────────────

function applyMatchEffects(
  report: CareerMatchReport,
  userIsHome: boolean,
  homeGoals: number, awayGoals: number,
  userSlots: FilledSlot[],
  userMap: Map<string, PlayerCard>,
): void {
  const won  = userIsHome ? homeGoals > awayGoals : awayGoals > homeGoals;
  const drew = homeGoals === awayGoals;

  const moraleDelta  = won ? 6 : drew ? 2 : -4;
  const conditionHit = -(12 + Math.floor(Math.random() * 6));

  for (const slot of userSlots) {
    if (!slot.playerId) continue;
    const p = userMap.get(slot.playerId);
    if (!p) continue;

    report.conditionDeltas[slot.playerId]  = conditionHit;
    report.moraleDeltas[slot.playerId]     = moraleDelta;

    const rating = report.playerRatings[slot.playerId] ?? 6;
    const formDelta = Math.round((rating - 6) * 4);
    report.formDeltas[slot.playerId] = formDelta;

    report.xpGained[slot.playerId] = Math.round(8 + rating * 2 + (won ? 10 : drew ? 5 : 0));
  }

  const gate = Math.round(800 + Math.random() * 400);
  report.financeEffect = { gate, bonus: won ? 500 : 0 };
}

// ── Main entry point ─────────────────────────────────────────────────────

export interface InstantMatchInput {
  fixtureId:    string;
  homeClubName: string;
  awayClubName: string;
  homeSlots:    FilledSlot[];
  awaySlots:    FilledSlot[];
  homePlayers:  PlayerCard[];
  awayPlayers:  PlayerCard[];
  userIsHome:   boolean;
  seed:         string;
}

export function simulateInstantMatch(input: InstantMatchInput): CareerMatchReport {
  const rng = mulberry32(seedFromString(input.seed + input.fixtureId));

  const homeMap = new Map(input.homePlayers.map(p => [p.id, p]));
  const awayMap = new Map(input.awayPlayers.map(p => [p.id, p]));

  const homeStr = calcStrength(input.homeSlots, homeMap);
  const awayStr = calcStrength(input.awaySlots, awayMap);

  const BASE_XG = 1.35;
  const HOME_ADV = 1.12;
  const homeXG = Math.max(0.1, BASE_XG * (homeStr.attack / (awayStr.defense + 0.001)) * HOME_ADV);
  const awayXG = Math.max(0.1, BASE_XG * (awayStr.attack / (homeStr.defense + 0.001)));

  const homeGoals = poissonSample(homeXG, rng);
  const awayGoals = poissonSample(awayXG, rng);

  const goalEvents = generateGoalEvents(homeGoals, awayGoals, input.homeSlots, input.awaySlots, homeMap, awayMap, rng);

  // Player ratings: 6 base ± form
  const playerRatings: Record<string, number> = {};
  for (const slot of [...input.homeSlots, ...input.awaySlots]) {
    if (slot.playerId) {
      playerRatings[slot.playerId] = Math.max(1, Math.min(10, 6 + (rng() - 0.5) * 4));
    }
  }

  const narrative = generateNarrative(homeGoals, awayGoals, homeXG, awayXG, input.homeClubName, input.awayClubName);

  const report: CareerMatchReport = {
    fixtureId:       input.fixtureId,
    homeGoals, awayGoals, homeXG, awayXG,
    goalEvents,
    bookings: [],
    playerRatings,
    attendance: Math.round(500 + rng() * 3000),
    narrative,
    conditionDeltas: {},
    formDeltas:      {},
    moraleDeltas:    {},
    xpGained:        {},
    financeEffect:   { gate: 0, bonus: 0 },
  };

  const userSlots  = input.userIsHome ? input.homeSlots : input.awaySlots;
  const userMap    = input.userIsHome ? homeMap : awayMap;
  applyMatchEffects(report, input.userIsHome, homeGoals, awayGoals, userSlots, userMap);

  return report;
}
