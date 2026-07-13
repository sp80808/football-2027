import { PlayerCard, PlayerRatings, PlayerArchetype, Trait, PositionCode, CardTier, overallToCardTier } from '../types';
import { mulberry32, seedFromString, RNG, generatePlayerName, pickRandom, pickWeighted } from './nameGen';

// ── Rating bands by tier (max overall at that level) ─────────────────────

const TIER_MAX_OVERALL: Record<number, number> = {
  1: 90, 2: 82, 3: 76, 4: 71, 5: 67,
  6: 64, 7: 62, 8: 60, 9: 58, 10: 56,
};

function tierMaxOverall(tier: number): number {
  return TIER_MAX_OVERALL[Math.max(1, Math.min(10, tier))] ?? 56;
}

// ── Position pools for squad generation ─────────────────────────────────

const SQUAD_BLUEPRINT: { position: PositionCode; count: number }[] = [
  { position: 'GK',  count: 2 },
  { position: 'RCB', count: 1 }, { position: 'LCB', count: 1 }, { position: 'CB', count: 1 },
  { position: 'RB',  count: 1 }, { position: 'LB',  count: 1 },
  { position: 'CM',  count: 3 }, { position: 'DM',  count: 1 }, { position: 'AM', count: 1 },
  { position: 'RM',  count: 1 }, { position: 'LM',  count: 1 },
  { position: 'ST',  count: 2 }, { position: 'SS',  count: 1 },
];

// ── Archetype → position mapping ─────────────────────────────────────────

const ARCHETYPE_BY_POS: Record<PositionCode, PlayerArchetype[]> = {
  GK:  ['Guardian','Sweeper'],
  CB:  ['Anchor','Libero'],  LCB: ['Anchor','Libero'], RCB: ['Anchor','Libero'],
  LB:  ['Fullback','Overlapper'], RB: ['Fullback','Overlapper'],
  LWB: ['Overlapper','Fullback'], RWB: ['Overlapper','Fullback'],
  DM:  ['Destroyer','Metronome'],
  CM:  ['BoxToBox','Playmaker','Metronome'],
  AM:  ['Playmaker','Technician'],
  LM:  ['Dribbler','CrossSpecialist'], RM: ['Dribbler','CrossSpecialist'],
  LW:  ['Dribbler','Technician'],      RW: ['Dribbler','Technician'],
  ST:  ['Target','Poacher'],           SS: ['Presser','Technician'],
};

// ── Per-position stat weight (which stats matter most) ────────────────────

interface StatWeights { pace: number; physicality: number; technical: number; vision: number; composure: number; speciality: number }

const STAT_WEIGHTS_BY_POS: Record<string, StatWeights> = {
  GK:  { pace:.3, physicality:.5, technical:.3, vision:.5, composure:.7, speciality:1.0 },
  CB:  { pace:.4, physicality:.9, technical:.4, vision:.5, composure:.6, speciality:.7  },
  LCB: { pace:.4, physicality:.9, technical:.4, vision:.5, composure:.6, speciality:.7  },
  RCB: { pace:.4, physicality:.9, technical:.4, vision:.5, composure:.6, speciality:.7  },
  LB:  { pace:.8, physicality:.6, technical:.6, vision:.5, composure:.5, speciality:.6  },
  RB:  { pace:.8, physicality:.6, technical:.6, vision:.5, composure:.5, speciality:.6  },
  LWB: { pace:.9, physicality:.5, technical:.7, vision:.5, composure:.5, speciality:.6  },
  RWB: { pace:.9, physicality:.5, technical:.7, vision:.5, composure:.5, speciality:.6  },
  DM:  { pace:.4, physicality:.8, technical:.5, vision:.6, composure:.6, speciality:.7  },
  CM:  { pace:.5, physicality:.6, technical:.7, vision:.7, composure:.6, speciality:.6  },
  AM:  { pace:.5, physicality:.4, technical:.9, vision:.8, composure:.7, speciality:.7  },
  LM:  { pace:.8, physicality:.5, technical:.8, vision:.6, composure:.5, speciality:.7  },
  RM:  { pace:.8, physicality:.5, technical:.8, vision:.6, composure:.5, speciality:.7  },
  LW:  { pace:.9, physicality:.4, technical:.8, vision:.6, composure:.5, speciality:.7  },
  RW:  { pace:.9, physicality:.4, technical:.8, vision:.6, composure:.5, speciality:.7  },
  ST:  { pace:.7, physicality:.7, technical:.6, vision:.5, composure:.8, speciality:.9  },
  SS:  { pace:.7, physicality:.5, technical:.7, vision:.7, composure:.7, speciality:.7  },
};

// ── Trait pools ─────────────────────────────────────────────────────────

const ALL_TRAITS: Trait[] = [
  'set_piece_master','long_shot','clinical','aerial_threat','pace_merchant',
  'press_resistance','leadership','big_game_player','recovery_runner',
  'creative_passer','tactical_reader','hard_tackler','dribble_merchant',
  'two_footed','consistent',
];

function traitCountForOverall(overall: number, rng: RNG): number {
  if (overall >= 80) return Math.floor(rng() * 2) + 2;
  if (overall >= 65) return Math.floor(rng() * 2) + 1;
  return rng() > 0.6 ? 1 : 0;
}

// ── XP curve ────────────────────────────────────────────────────────────

function xpToNextLevel(level: number): number {
  return Math.floor(100 * Math.pow(1.3, level - 1));
}

// ── Core generation ──────────────────────────────────────────────────────

function generateRatings(position: PositionCode, baseOverall: number, rng: RNG): PlayerRatings {
  const w = STAT_WEIGHTS_BY_POS[position] ?? STAT_WEIGHTS_BY_POS['CM'];
  const spread = 15;

  const randStat = (weight: number) => {
    const base = baseOverall * weight;
    const noise = (rng() - 0.5) * spread;
    return Math.round(Math.min(99, Math.max(40, base + noise)));
  };

  const pace        = randStat(w.pace);
  const physicality = randStat(w.physicality);
  const technical   = randStat(w.technical);
  const vision      = randStat(w.vision);
  const composure   = randStat(w.composure);
  const speciality  = randStat(w.speciality);

  // Overall = weighted composite using stat importance
  const overall = Math.round(
    pace * 0.15 + physicality * 0.15 + technical * 0.20 +
    vision * 0.15 + composure * 0.15 + speciality * 0.20
  );

  return { overall: Math.min(99, Math.max(40, overall)), pace, physicality, technical, vision, composure, speciality };
}

export function generatePlayer(
  index: number,
  position: PositionCode,
  tier: number,
  careerId: string,
  rng: RNG,
): PlayerCard {
  const maxOvr = tierMaxOverall(tier);
  const minOvr = Math.max(40, maxOvr - 20);
  // Star players spike higher
  const isStar = rng() < 0.08;
  const targetOvr = isStar
    ? Math.round(minOvr + (maxOvr - minOvr) * (0.8 + rng() * 0.2))
    : Math.round(minOvr + (maxOvr - minOvr) * rng());

  const ratings = generateRatings(position, targetOvr, rng);
  const { name, nationality } = generatePlayerName(tier, rng);

  const age = Math.round(16 + rng() * 20); // 16-36
  const potentialMin = Math.max(ratings.overall, Math.round(ratings.overall + rng() * 5));
  const potentialMax = Math.min(99, Math.round(potentialMin + (age < 23 ? 12 : age < 28 ? 5 : 2) * rng()));

  const archetypes = ARCHETYPE_BY_POS[position] ?? ['Technician'];
  const archetype  = pickRandom(archetypes, rng) as PlayerArchetype;

  const numTraits = traitCountForOverall(ratings.overall, rng);
  const traits: Trait[] = [];
  const traitPool = [...ALL_TRAITS];
  for (let t = 0; t < numTraits; t++) {
    const idx = Math.floor(rng() * traitPool.length);
    traits.push(traitPool.splice(idx, 1)[0]);
  }

  const tier2salary: Record<number, number> = { 1:15000, 2:5000, 3:2000, 4:1200, 5:700, 6:400, 7:250, 8:150, 9:80, 10:40 };
  const baseSalary = tier2salary[tier] ?? 40;
  const weeklySalary = Math.round(baseSalary * (0.7 + ratings.overall / 100 * 0.6) * (1 + (rng() - 0.5) * 0.3));

  const cardTier = overallToCardTier(ratings.overall);
  const level = Math.max(1, Math.round(1 + (ratings.overall - 40) / 6));
  const nat = position === 'GK' ? position : position.replace(/[LR](?=[A-Z])/, '');

  return {
    id:   `${careerId}-p${index}`,
    name,
    knownAs: name.split(' ').pop() ?? name,
    nationality,
    age,
    primaryPosition:  position,
    naturalPositions: [position],
    archetype,
    tier: cardTier,
    ratings,
    level,
    experience: 0,
    xpToNextLevel: xpToNextLevel(level),
    potential: { min: potentialMin, max: potentialMax },
    traits,
    condition:  Math.round(80 + rng() * 20),
    morale:     Math.round(60 + rng() * 30),
    form:       Math.round(55 + rng() * 25),
    fitness:    Math.round(70 + rng() * 25),
    stats: { appearances: 0, goals: 0, assists: 0, cleanSheets: 0 },
    contract: {
      weeklySalary,
      seasonsRemaining: Math.ceil(rng() * 3),
    },
    dataSource:     'generated',
    dataConfidence: 'fictional',
    confidenceNote: `Generated deterministically for tier ${tier}. No real player data.`,
    lastUpdated: new Date().toISOString().slice(0, 10),
  };
}

export function generateSquad(tier: number, careerId: string, seed: string): PlayerCard[] {
  const rng = mulberry32(seedFromString(seed + '-squad'));
  const players: PlayerCard[] = [];
  let idx = 0;

  for (const { position, count } of SQUAD_BLUEPRINT) {
    for (let i = 0; i < count; i++) {
      players.push(generatePlayer(idx++, position, tier, careerId, rng));
    }
  }

  return players;
}

// ── Build default squad selection from generated players ─────────────────

import { SquadSelection, FORMATIONS } from '../types';

export function buildDefaultSquad(players: PlayerCard[], formationCode: keyof typeof FORMATIONS = '4-4-2'): SquadSelection {
  const slotDefs = FORMATIONS[formationCode];
  const assigned = new Set<string>();

  const slots = slotDefs.map(def => {
    // Find best unassigned player for this slot
    const candidates = players
      .filter(p => !assigned.has(p.id) && def.validPositions.includes(p.primaryPosition as any))
      .sort((a, b) => b.ratings.overall - a.ratings.overall);

    const fallback = players
      .filter(p => !assigned.has(p.id))
      .sort((a, b) => b.ratings.overall - a.ratings.overall);

    const chosen = candidates[0] ?? fallback[0] ?? null;
    if (chosen) assigned.add(chosen.id);

    return { ...def, playerId: chosen?.id ?? null };
  });

  const bench = players
    .filter(p => !assigned.has(p.id))
    .sort((a, b) => b.ratings.overall - a.ratings.overall)
    .slice(0, 7)
    .map(p => p.id);

  return { formationCode, slots, bench: [...bench, ...Array(Math.max(0, 7 - bench.length)).fill(null)] };
}
