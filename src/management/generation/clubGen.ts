/**
 * English football pyramid + club/league generation.
 * Covers tiers 1-10 with fictional clubs where real data is unavailable.
 * Generates deterministic round-robin fixtures for a single division.
 */
import { Club, Division, Fixture, StandingsRow } from '../types';
import { mulberry32, seedFromString, RNG, generateClubName, pickRandom } from './nameGen';

// ── English pyramid structure ────────────────────────────────────────────

export interface TierInfo {
  tier: number;
  name: string;
  divisionIds: string[];
  clubsPerDivision: number;
  promotionSpots: number;
  playoffSpots: number;
  relegationSpots: number;
  region: 'national' | 'north' | 'south' | 'midlands' | 'county';
  isRealStructure: boolean; // true = matches real English pyramid
}

export const ENGLISH_PYRAMID: TierInfo[] = [
  { tier:1,  name:'Premier League',           divisionIds:['prem'],                clubsPerDivision:20, promotionSpots:0, playoffSpots:0, relegationSpots:3,  region:'national', isRealStructure:true  },
  { tier:2,  name:'Championship',             divisionIds:['champ'],               clubsPerDivision:24, promotionSpots:2, playoffSpots:4, relegationSpots:3,  region:'national', isRealStructure:true  },
  { tier:3,  name:'League One',               divisionIds:['l1'],                  clubsPerDivision:24, promotionSpots:2, playoffSpots:4, relegationSpots:4,  region:'national', isRealStructure:true  },
  { tier:4,  name:'League Two',               divisionIds:['l2'],                  clubsPerDivision:24, promotionSpots:3, playoffSpots:4, relegationSpots:2,  region:'national', isRealStructure:true  },
  { tier:5,  name:'National League',          divisionIds:['nlg'],                 clubsPerDivision:24, promotionSpots:1, playoffSpots:4, relegationSpots:3,  region:'national', isRealStructure:true  },
  { tier:6,  name:'National League North',    divisionIds:['nlgn','nlgs'],         clubsPerDivision:22, promotionSpots:1, playoffSpots:4, relegationSpots:3,  region:'national', isRealStructure:true  },
  { tier:7,  name:'Step 3 (Northern Premier)',divisionIds:['npp','slpc','slps','ip'],clubsPerDivision:22,promotionSpots:1, playoffSpots:4, relegationSpots:3, region:'national', isRealStructure:true  },
  { tier:8,  name:'Step 4 (Northern Premier East)', divisionIds:['npe1','npe2','mid1','sl1','il1'], clubsPerDivision:20, promotionSpots:1, playoffSpots:2, relegationSpots:3, region:'national', isRealStructure:true },
  { tier:9,  name:'Step 5 (Regional)',        divisionIds:['step5n','step5s'],     clubsPerDivision:18, promotionSpots:1, playoffSpots:0, relegationSpots:2,  region:'county',   isRealStructure:false },
  { tier:10, name:'Step 6/County League',     divisionIds:['county1'],             clubsPerDivision:16, promotionSpots:1, playoffSpots:0, relegationSpots:1,  region:'county',   isRealStructure:false },
];

export function getTierInfo(tier: number): TierInfo {
  return ENGLISH_PYRAMID.find(t => t.tier === tier) ?? ENGLISH_PYRAMID[ENGLISH_PYRAMID.length - 1];
}

// ── Colour palettes for generated clubs ─────────────────────────────────

const KIT_COMBOS = [
  { primary: '#dc2626', secondary: '#ffffff' }, // red/white
  { primary: '#2563eb', secondary: '#ffffff' }, // blue/white
  { primary: '#16a34a', secondary: '#ffffff' }, // green/white
  { primary: '#1d1d1d', secondary: '#f59e0b' }, // black/gold
  { primary: '#7c3aed', secondary: '#ffffff' }, // purple/white
  { primary: '#d97706', secondary: '#1d1d1d' }, // amber/black
  { primary: '#0e7490', secondary: '#ffffff' }, // teal/white
  { primary: '#be185d', secondary: '#ffffff' }, // pink/white
  { primary: '#dc2626', secondary: '#1d1d1d' }, // red/black
  { primary: '#1e3a5f', secondary: '#c9a84c' }, // navy/gold
];

// ── Generate a complete division ─────────────────────────────────────────

export function generateDivision(
  divisionId: string,
  tier: number,
  userClubId: string,
  userClubName: string,
  userClubEmoji: string,
  seed: string,
): { division: Division; clubs: Club[] } {
  const rng = mulberry32(seedFromString(seed + divisionId));
  const info = getTierInfo(tier);
  const total = info.clubsPerDivision;

  const clubs: Club[] = [];

  // User club always in the division
  clubs.push({
    id: userClubId,
    name: userClubName,
    shortName: userClubName.split(' ')[0].slice(0, 4).toUpperCase(),
    crestEmoji: userClubEmoji,
    primaryColour: '#dc2626',
    secondaryColour: '#ffffff',
    homeCity: userClubName.replace(/\s*(FC|AFC|United|City|Town|Athletic|Rovers|Wanderers|Rangers|Albion|Vale)$/, '').trim(),
    tier,
    divisionId,
    divisionName: info.name,
    isUserClub: true,
    isRealData: false,
  });

  // Generate AI clubs
  for (let i = 1; i < total; i++) {
    const clubSeed = `${seed}-club-${i}`;
    const { name, shortName, crestEmoji } = generateClubName(clubSeed);
    const kit = KIT_COMBOS[i % KIT_COMBOS.length];
    clubs.push({
      id: `generated-${i}`,
      name,
      shortName,
      crestEmoji,
      primaryColour: kit.primary,
      secondaryColour: kit.secondary,
      homeCity: name.replace(/\s*(FC|AFC|United|City|Town|Athletic|Rovers|Wanderers|Rangers|Albion|Vale)$/, '').trim(),
      tier,
      divisionId,
      divisionName: info.name,
      isUserClub: false,
      isRealData: false,
    });
  }

  const division: Division = {
    id: divisionId,
    name: info.name,
    tier,
    region: info.region,
    clubs: clubs.map(c => c.id),
    promotionSpots: info.promotionSpots,
    playoffSpots: info.playoffSpots,
    relegationSpots: info.relegationSpots,
    isRealData: false,
    dataSource: 'generated',
  };

  return { division, clubs };
}

// ── Generate a round-robin fixture schedule ──────────────────────────────

export function generateFixtures(clubs: Club[], divisionId: string, seed: string): Fixture[] {
  const rng = mulberry32(seedFromString(seed + 'fixtures'));
  const n = clubs.length;
  const fixtures: Fixture[] = [];
  let fixtureId = 0;

  // Create shuffled club list (rotate for round robin)
  const ids = clubs.map(c => c.id);
  // Simple round-robin using Berger tables
  const rounds: [number, number][][] = [];
  const list = [...ids];
  if (list.length % 2 !== 0) list.push('bye');
  const half = list.length / 2;

  for (let round = 0; round < list.length - 1; round++) {
    const pairs: [number, number][] = [];
    for (let i = 0; i < half; i++) {
      const a = i === 0 ? 0 : i;
      const b = list.length - 1 - i;
      if (list[a] !== 'bye' && list[b] !== 'bye') {
        pairs.push([list.indexOf(list[a]), list.indexOf(list[b])]);
      }
    }
    // Rotate
    const last = list.pop()!;
    list.splice(1, 0, last);
    rounds.push(pairs);
  }

  // Actually let's do a simpler direct round-robin
  const home_away_schedule: { home: string; away: string; week: number }[] = [];
  let week = 1;

  // Double round-robin (home + away)
  for (const home of ids) {
    for (const away of ids) {
      if (home === away) continue;
      home_away_schedule.push({ home, away, week });
      week++;
      if (week > ids.length * 2 - 2) week = ids.length * 2 - 2; // cap
    }
  }

  // Reassign weeks properly (round-robin)
  const clubMap = new Map(clubs.map(c => [c.id, c]));
  const schedule: { home: string; away: string; week: number }[] = [];

  // Build proper round-robin
  const fixedList = [...ids];
  const numRounds = ids.length - 1;
  const half2 = ids.length / 2;

  for (let r = 0; r < numRounds; r++) {
    for (let i = 0; i < half2; i++) {
      const homeId = fixedList[i];
      const awayId = fixedList[fixedList.length - 1 - i];
      if (homeId && awayId) {
        schedule.push({ home: homeId, away: awayId, week: r + 1 });
        schedule.push({ home: awayId, away: homeId, week: numRounds + r + 1 });
      }
    }
    // rotate all except index 0
    const last2 = fixedList.pop()!;
    fixedList.splice(1, 0, last2);
  }

  return schedule.map(({ home, away, week }) => {
    const homeClub = clubMap.get(home)!;
    const awayClub = clubMap.get(away)!;
    fixtureId++;
    return {
      id: `fix-${fixtureId}`,
      divisionId,
      week,
      homeClubId: home,
      awayClubId: away,
      homeClubName: homeClub?.name ?? 'Unknown',
      awayClubName: awayClub?.name ?? 'Unknown',
      homeClubEmoji: homeClub?.crestEmoji ?? '⚽',
      awayClubEmoji: awayClub?.crestEmoji ?? '⚽',
      status: 'upcoming',
      isUserFixture: homeClub?.isUserClub || awayClub?.isUserClub || false,
    } as Fixture;
  });
}

// ── Generate initial standings ────────────────────────────────────────────

export function generateStandings(clubs: Club[]): StandingsRow[] {
  return clubs.map(club => ({
    clubId:    club.id,
    clubName:  club.name,
    clubEmoji: club.crestEmoji,
    played: 0, won: 0, drawn: 0, lost: 0,
    gf: 0, ga: 0, gd: 0, points: 0,
    form: [],
    isUserClub: club.isUserClub,
  }));
}
