/**
 * English Football Data Pipeline
 * Processes real-world data from multiple sources into game-ready format
 */

// ============================================
// Core Data Types
// ============================================

export interface League {
  id: string;
  name: string;
  shortName: string;
  country: string;
  tier: number;           // 1 = Premier League, 2 = Championship, etc.
  season: string;         // e.g., "2024/25"
  startDate: string;
  endDate: string;
  teams: number;
  promotionSpots: number;
  relegationSpots: number;
  playoffFormat?: string;
}

export interface Club {
  id: string;
  name: string;
  shortName: string;
  crestUrl: string;
  stadium: string;
  stadiumCapacity: number;
  city: string;
  founded: number;
  primaryColor: string;
  secondaryColor: string;
  thirdColor?: string;
  latitude: number;
  longitude: number;
  leagueId: string;
  reputation: number;     // 1-5 (global standing)
  budget: number;         // Transfer budget in millions
  wageBudget: number;     // Weekly wage budget in thousands
  ownerType: 'private' | 'consortium' | 'fan' | 'state';
  youthFacilities: number;    // 1-20
  trainingFacilities: number; // 1-20
  stadiumOwnership: 'owned' | 'rented' | 'shared';
}

export interface Player {
  id: string;
  firstName: string;
  lastName: string;
  commonName?: string;
  dateOfBirth: string;      // YYYY-MM-DD
  nationality: string[];
  position: PlayerPosition;
  preferredFoot: 'left' | 'right' | 'both';
  height: number;           // cm
  weight: number;           // kg
  clubId: string;
  contractUntil: string;    // YYYY-MM-DD
  marketValue: number;      // euros
  wage: number;             // weekly, euros
  attributes: PlayerAttributes;
  traits: PlayerTrait[];
  injuryHistory: InjuryRecord[];
  internationalCaps: number;
  internationalGoals: number;
  preferredRoles: PlayerRole[];
  weakFoot: number;         // 1-5
  skillMoves: number;       // 1-5
  workRateAttack: 'low' | 'medium' | 'high';
  workRateDefense: 'low' | 'medium' | 'high';
}

export type PlayerPosition = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'CF' | 'ST';
export type PlayerRole = 'GK' | 'CB' | 'LB' | 'RB' | 'CDM' | 'CM' | 'CAM' | 'LW' | 'RW' | 'CF' | 'ST';

export interface PlayerAttributes {
  // Technical (1-20)
  passing: { short: number; long: number; crossing: number; vision: number; throughBall: number };
  shooting: { finishing: number; power: number; placement: number; volleys: number; penalties: number; freeKicks: number };
  dribbling: { closeControl: number; agility: number; balance: number; acceleration: number };
  firstTouch: number;
  tackling: number;
  heading: number;

  // Physical (1-20)
  pace: number;
  acceleration: number;
  stamina: number;
  strength: number;
  agility: number;
  jumping: number;

  // Mental (1-20)
  composure: number;
  decisions: number;
  anticipation: number;
  workRate: number;
  flair: number;
  leadership: number;
  concentration: number;
  aggression: number;
  bravery: number;
  determination: number;
  teamwork: number;
  positioning: number;
}

export type PlayerTrait =
  | 'playmaker' | 'target_man' | 'poacher' | 'false_nine'
  | 'ball_winning_midfielder' | 'deep_lying_playmaker' | 'box_to_box'
  | 'inverted_winger' | 'traditional_winger' | 'inside_forward'
  | 'ball_playing_defender' | 'no_nonsense_defender' | 'sweeper_keeper'
  | 'long_throw' | 'giant_killer' | 'finesse_shot' | 'power_header'
  | 'outside_foot_shot' | 'knuckleball' | 'acrobatic_clearance';

export interface InjuryRecord {
  date: string;
  type: string;
  severity: 'minor' | 'moderate' | 'major';
  daysOut: number;
  recurrenceRisk: number;
}

export interface Match {
  id: string;
  date: string;
  homeTeamId: string;
  awayTeamId: string;
  homeScore: number;
  awayScore: number;
  competitionId: string;
  season: string;
  round: string;
  venue: string;
  attendance: number;
  referee: string;
  events: MatchEvent[];
  stats: MatchStats;
}

export type MatchEventType =
  | 'goal' | 'assist' | 'yellow_card' | 'red_card'
  | 'substitution_in' | 'substitution_out'
  | 'penalty_scored' | 'penalty_missed' | 'penalty_saved'
  | 'own_goal' | 'injury' | 'var_review';

export interface MatchEvent {
  minute: number;
  type: MatchEventType;
  playerId: string;
  teamId: string;
  assistPlayerId?: string;
  x?: number;
  y?: number;
  description: string;
}

export interface MatchStats {
  possession: { home: number; away: number };
  shots: { home: number; away: number };
  shotsOnTarget: { home: number; away: number };
  corners: { home: number; away: number };
  fouls: { home: number; away: number };
  offsides: { home: number; away: number };
  passes: { home: number; away: number };
  passAccuracy: { home: number; away: number };
  keyPasses: { home: number; away: number };
  interceptions: { home: number; away: number };
  tackles: { home: number; away: number };
  clearances: { home: number; away: number };
  saves: { home: number; away: number };
  xG: { home: number; away: number };
}

// ============================================
// Data Sources Configuration
// ============================================

export const DATA_SOURCES = {
  'football-data.co.uk': {
    baseUrl: 'https://www.football-data.co.uk/mmz4281/',
    leagues: {
      'E0': 'Premier League',
      'E1': 'Championship',
      'E2': 'League One',
      'E3': 'League Two',
      'EC': 'National League',
      'ECN': 'National League North',
      'ECS': 'National League South'
    },
    format: 'csv',
    encoding: 'utf-8',
    rateLimit: 1000 // ms between requests
  },
  'fbref': {
    baseUrl: 'https://fbref.com/en/comps/',
    leagues: {
      '9': 'Premier League',
      '10': 'Championship',
      '11': 'League One',
      '12': 'League Two'
    },
    format: 'html_table',
    rateLimit: 3000,
    advancedStats: ['xG', 'progressive_passes', 'pressures', 'tackles_interceptions']
  },
  'transfermarkt': {
    baseUrl: 'https://www.transfermarkt.com',
    requiresAuth: false,
    rateLimit: 5000,
    dataTypes: ['market_values', 'contracts', 'transfers', 'injuries']
  },
  'football-data.org': {
    baseUrl: 'https://api.football-data.org/v4',
    requiresApiKey: true,
    rateLimit: 1000,
    endpoints: ['competitions', 'teams', 'matches', 'players', 'standings']
  },
  'openstreetmap': {
    baseUrl: 'https://overpass-api.de/api/interpreter',
    query: '[out:json];area["name"="England"];(node["leisure"="stadium"](area);way["leisure"="stadium"](area);relation["leisure"="stadium"](area););out center;',
    rateLimit: 1000
  }
} as const;

// ============================================
// Data Processing Pipeline
// ============================================

export interface ProcessingResult<T> {
  success: boolean;
  data: T[];
  errors: ProcessingError[];
  warnings: ProcessingWarning[];
  metadata: {
    source: string;
    timestamp: string;
    recordCount: number;
    processingTimeMs: number;
  };
}

export interface ProcessingError {
  code: string;
  message: string;
  record?: any;
  severity: 'critical' | 'warning' | 'info';
}

export interface ProcessingWarning {
  code: string;
  message: string;
  record?: any;
}

/**
 * Main data processor coordinating all sources
 */
export class DataProcessor {
  private cache = new Map<string, any>();
  private rateLimiters = new Map<string, number>();

  async processAllSources(): Promise<{
    leagues: League[];
    clubs: Club[];
    players: Player[];
    matches: Match[];
  }> {
    const results = await Promise.all([
      this.processLeagues(),
      this.processClubs(),
      this.processPlayers(),
      this.processMatches()
    ]);

    return {
      leagues: results[0].data,
      clubs: results[1].data,
      players: results[2].data,
      matches: results[3].data
    };
  }

  private async processLeagues(): Promise<ProcessingResult<League>> {
    // Implementation would fetch from football-data.co.uk and football-data.org
    // For now, return hardcoded English league structure
    return {
      success: true,
      data: this.getEnglishLeagueStructure(),
      errors: [],
      warnings: [],
      metadata: { source: 'static', timestamp: new Date().toISOString(), recordCount: 8, processingTimeMs: 0 }
    };
  }

  private getEnglishLeagueStructure(): League[] {
    return [
      { id: 'E0', name: 'Premier League', shortName: 'PL', country: 'England', tier: 1, season: '2024/25', startDate: '2024-08-17', endDate: '2025-05-25', teams: 20, promotionSpots: 0, relegationSpots: 3 },
      { id: 'E1', name: 'Championship', shortName: 'CH', country: 'England', tier: 2, season: '2024/25', startDate: '2024-08-09', endDate: '2025-05-03', teams: 24, promotionSpots: 2, relegationSpots: 3, playoffFormat: '3-6' },
      { id: 'E2', name: 'League One', shortName: 'L1', country: 'England', tier: 3, season: '2024/25', startDate: '2024-08-10', endDate: '2025-05-03', teams: 24, promotionSpots: 2, relegationSpots: 4, playoffFormat: '3-6' },
      { id: 'E3', name: 'League Two', shortName: 'L2', country: 'England', tier: 4, season: '2024/25', startDate: '2024-08-10', endDate: '2025-05-03', teams: 24, promotionSpots: 3, relegationSpots: 2, playoffFormat: '4-7' },
      { id: 'EC', name: 'National League', shortName: 'NL', country: 'England', tier: 5, season: '2024/25', startDate: '2024-08-10', endDate: '2025-05-03', teams: 24, promotionSpots: 1, relegationSpots: 4, playoffFormat: '2-7' },
      { id: 'ECN', name: 'National League North', shortName: 'NLN', country: 'England', tier: 6, season: '2024/25', startDate: '2024-08-10', endDate: '2025-05-03', teams: 24, promotionSpots: 1, relegationSpots: 3, playoffFormat: '2-7' },
      { id: 'ECS', name: 'National League South', shortName: 'NLS', country: 'England', tier: 6, season: '2024/25', startDate: '2024-08-10', endDate: '2025-05-03', teams: 24, promotionSpots: 1, relegationSpots: 3, playoffFormat: '2-7' },
      { id: 'FAC', name: 'FA Cup', shortName: 'FAC', country: 'England', tier: 0, season: '2024/25', startDate: '2024-11-02', endDate: '2025-05-17', teams: 736, promotionSpots: 0, relegationSpots: 0 }
    ];
  }

  private async processClubs(): Promise<ProcessingResult<Club>> {
    // Would fetch from football-data.org teams endpoint + Transfermarkt for values
    return {
      success: true,
      data: [],
      errors: [],
      warnings: [],
      metadata: { source: 'multiple', timestamp: new Date().toISOString(), recordCount: 0, processingTimeMs: 0 }
    };
  }

  private async processPlayers(): Promise<ProcessingResult<Player>> {
    // Would merge FBref stats + Transfermarkt values + football-data.co.uk appearances
    return {
      success: true,
      data: [],
      errors: [],
      warnings: [],
      metadata: { source: 'multiple', timestamp: new Date().toISOString(), recordCount: 0, processingTimeMs: 0 }
    };
  }

  private async processMatches(): Promise<ProcessingResult<Match>> {
    return {
      success: true,
      data: [],
      errors: [],
      warnings: [],
      metadata: { source: 'multiple', timestamp: new Date().toISOString(), recordCount: 0, processingTimeMs: 0 }
    };
  }

  // Rate limiting helper
  private async respectRateLimit(source: string): Promise<void> {
    const limit = DATA_SOURCES[source as keyof typeof DATA_SOURCES]?.rateLimit || 1000;
    const lastRequest = this.rateLimiters.get(source) || 0;
    const elapsed = Date.now() - lastRequest;
    if (elapsed < limit) {
      await new Promise(r => setTimeout(r, limit - elapsed));
    }
    this.rateLimiters.set(source, Date.now());
  }
}

// ============================================
// Attribute Calculation Engine
// ============================================

export class AttributeCalculator {
  /**
   * Calculate game attributes from real-world statistics
   * Uses weighted formulas based on position and statistical significance
   */
  static calculateAttributes(stats: RawPlayerStats, position: PlayerPosition, age: number): PlayerAttributes {
    const weights = this.getPositionWeights(position);

    return {
      passing: {
        short: this.normalize(stats.passes_completed / Math.max(stats.passes_attempted, 1) * 100, weights.passing.short),
        long: this.normalize(stats.long_passes_completed / Math.max(stats.long_passes_attempted, 1) * 100, weights.passing.long),
        crossing: this.normalize(stats.crosses_completed / Math.max(stats.crosses_attempted, 1) * 100, weights.passing.crossing),
        vision: this.normalize(stats.key_passes_per_90 * 10, weights.passing.vision),
        throughBall: this.normalize(stats.through_passes_per_90 * 10, weights.passing.throughBall)
      },
      shooting: {
        finishing: this.normalize(stats.goals_per_shot * 100, weights.shooting.finishing),
        power: this.normalize(stats.shot_power_avg || 50, weights.shooting.power),
        placement: this.normalize(stats.shots_on_target / Math.max(stats.shots, 1) * 100, weights.shooting.placement),
        volleys: this.normalize(stats.volley_goals / Math.max(stats.volley_attempts, 1) * 100, weights.shooting.volleys),
        penalties: this.normalize(stats.penalties_scored / Math.max(stats.penalties_taken, 1) * 100, weights.shooting.penalties),
        freeKicks: this.normalize(stats.freekick_goals / Math.max(stats.freekick_attempts, 1) * 100, weights.shooting.freeKicks)
      },
      dribbling: {
        closeControl: this.normalize(stats.successful_dribbles_per_90 * 2, weights.dribbling.closeControl),
        agility: this.clamp(stats.successful_dribbles_per_90 * 1.5, 1, 20),
        balance: this.clamp(stats.dribbles_won_per_90 * 1.2, 1, 20),
        acceleration: this.clamp(stats.sprints_per_90 * 0.5, 1, 20)
      },
      firstTouch: this.clamp(stats.touches_per_90 / 5, 1, 20),
      tackling: this.clamp(stats.tackles_won_per_90 * 1.5, 1, 20),
      heading: this.clamp(stats.aerial_duels_won / Math.max(stats.aerial_duels_total, 1) * 20, 1, 20),

      pace: this.clamp(stats.max_speed_kmh / 2, 1, 20),
      acceleration: this.clamp(stats.acceleration_score || 10, 1, 20),
      stamina: this.clamp(stats.minutes_played / 90 * 2, 1, 20),
      strength: this.clamp(stats.aerial_duels_won_per_90 * 1.5, 1, 20),
      agility: this.clamp(stats.agility_score || 10, 1, 20),
      jumping: this.clamp(stats.aerial_duels_won_per_90 * 2, 1, 20),

      composure: this.clamp(20 - (stats.errors_per_90 * 2), 1, 20),
      decisions: this.clamp(stats.key_passes_per_90 * 2, 1, 20),
      anticipation: this.clamp(stats.interceptions_per_90 * 2, 1, 20),
      workRate: this.clamp(stats.distance_covered_km * 1.5, 1, 20),
      flair: this.clamp(stats.dribbles_attempted_per_90 * 0.5, 1, 20),
      leadership: this.clamp((stats.captain_matches / Math.max(stats.matches_played, 1)) * 20, 1, 20),
      concentration: this.clamp(20 - (stats.fouls_conceded_per_90 * 1.5), 1, 20),
      aggression: this.clamp(stats.fouls_committed_per_90 * 2, 1, 20),
      bravery: this.clamp(stats.aerial_duels_won / Math.max(stats.aerial_duels_total, 1) * 20, 1, 20),
      determination: this.clamp(stats.comebacks / Math.max(stats.matches_played, 1) * 20, 1, 20),
      teamwork: this.clamp(stats.assists_per_90 * 5, 1, 20),
      positioning: this.clamp(stats.goals_per_90 * 5 + stats.xG_per_90 * 10, 1, 20)
    };
  }

  private static getPositionWeights(position: PlayerPosition) {
    // Position-specific weighting for attribute importance
    const base = {
      passing: { short: 1, long: 1, crossing: 1, vision: 1, throughBall: 1 },
      shooting: { finishing: 1, power: 1, placement: 1, volleys: 1, penalties: 1, freeKicks: 1 },
      dribbling: { closeControl: 1, agility: 1, balance: 1, acceleration: 1 }
    };

    // Position-specific adjustments
    switch (position) {
      case 'GK':
        return { ...base, passing: { ...base.passing, short: 1.5, long: 1.2, crossing: 0.5, vision: 0.8, throughBall: 0.3 } };
      case 'CB':
        return { ...base, passing: { ...base.passing, short: 1.3, long: 1.5, crossing: 0.3, vision: 0.8, throughBall: 0.5 } };
      case 'LB': case 'RB':
        return { ...base, passing: { ...base.passing, short: 1.2, long: 1.0, crossing: 1.5, vision: 1.0, throughBall: 0.8 } };
      case 'CDM':
        return { ...base, passing: { ...base.passing, short: 1.5, long: 1.5, crossing: 0.5, vision: 1.2, throughBall: 1.0 } };
      case 'CM':
        return { ...base, passing: { ...base.passing, short: 1.5, long: 1.3, crossing: 0.8, vision: 1.4, throughBall: 1.2 } };
      case 'CAM':
        return { ...base, passing: { ...base.passing, short: 1.4, long: 1.0, crossing: 1.0, vision: 1.8, throughBall: 1.5 } };
      case 'LW': case 'RW':
        return { ...base, passing: { ...base.passing, short: 1.2, long: 0.8, crossing: 1.6, vision: 1.1, throughBall: 1.0 } };
      case 'CF': case 'ST':
        return { ...base, passing: { ...base.passing, short: 1.0, long: 0.6, crossing: 0.6, vision: 1.0, throughBall: 1.2 } };
      default:
        return base;
    }
  }

  private static normalize(value: number, weight: number): number {
    return this.clamp(value * weight, 1, 20);
  }

  private static clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, Math.round(value)));
  }
}

interface RawPlayerStats {
  passes_completed: number;
  passes_attempted: number;
  long_passes_completed: number;
  long_passes_attempted: number;
  crosses_completed: number;
  crosses_attempted: number;
  key_passes_per_90: number;
  through_passes_per_90: number;
  goals_per_shot: number;
  shot_power_avg?: number;
  shots: number;
  shots_on_target: number;
  volley_goals: number;
  volley_attempts: number;
  penalties_scored: number;
  penalties_taken: number;
  freekick_goals: number;
  freekick_attempts: number;
  successful_dribbles_per_90: number;
  dribbles_won_per_90: number;
  touches_per_90: number;
  tackles_won_per_90: number;
  aerial_duels_won: number;
  aerial_duels_total: number;
  aerial_duels_won_per_90: number;
  max_speed_kmh: number;
  sprints_per_90: number;
  minutes_played: number;
  distance_covered_km: number;
  errors_per_90: number;
  interceptions_per_90: number;
  fouls_conceded_per_90: number;
  fouls_committed_per_90: number;
  captain_matches: number;
  matches_played: number;
  goals_per_90: number;
  xG_per_90: number;
  comebacks: number;
  assists_per_90: number;
  comebacks?: number;
}

// ============================================
// Storage & Export
// ============================================

export interface GameDatabase {
  version: number;
  lastUpdated: string;
  leagues: Map<string, League>;
  clubs: Map<string, Club>;
  players: Map<string, Player>;
  matches: Map<string, Match>;
  metadata: {
    sources: string[];
    processingDate: string;
    totalRecords: number;
  };
}

export class GameDatabaseManager {
  private db: GameDatabase;

  constructor() {
    this.db = {
      version: 1,
      lastUpdated: new Date().toISOString(),
      leagues: new Map(),
      clubs: new Map(),
      players: new Map(),
      matches: new Map(),
      metadata: { sources: [], processingDate: '', totalRecords: 0 }
    };
  }

  async loadFromIndexedDB(): Promise<void> {
    // Load from browser IndexedDB
  }

  async saveToIndexedDB(): Promise<void> {
    // Save to browser IndexedDB
  }

  exportToJSON(): string {
    return JSON.stringify({
      version: this.db.version,
      lastUpdated: this.db.lastUpdated,
      leagues: Array.from(this.db.leagues.entries()),
      clubs: Array.from(this.db.clubs.entries()),
      players: Array.from(this.db.players.entries()),
      matches: Array.from(this.db.matches.entries()),
      metadata: this.db.metadata
    }, null, 2);
  }

  importFromJSON(json: string): void {
    const data = JSON.parse(json);
    this.db.version = data.version;
    this.db.lastUpdated = data.lastUpdated;
    this.db.leagues = new Map(data.leagues);
    this.db.clubs = new Map(data.clubs);
    this.db.players = new Map(data.players);
    this.db.matches = new Map(data.matches);
    this.db.metadata = data.metadata;
  }

  getLeague(id: string): League | undefined { return this.db.leagues.get(id); }
  getClub(id: string): Club | undefined { return this.db.clubs.get(id); }
  getPlayer(id: string): Player | undefined { return this.db.players.get(id); }
  getMatch(id: string): Match | undefined { return this.db.matches.get(id); }

  getAllClubs(): Club[] { return Array.from(this.db.clubs.values()); }
  getAllPlayers(): Player[] { return Array.from(this.db.players.values()); }
  getClubPlayers(clubId: string): Player[] {
    return Array.from(this.db.players.values()).filter(p => p.clubId === clubId);
  }
}

// ============================================
// Age Curve & Development
// ============================================

export class PlayerDevelopment {
  static getAgeCurve(attribute: keyof PlayerAttributes, age: number): number {
    // Returns multiplier for attribute at given age
    const peakAge = this.getPeakAge(attribute);
    const diff = age - peakAge;

    if (diff <= 0) {
      // Development phase
      return 0.5 + 0.5 * (1 - Math.exp(diff / 3));
    } else {
      // Decline phase
      return Math.exp(-diff / 8);
    }
  }

  private static getPeakAge(attr: keyof PlayerAttributes): number {
    const physicalPeaks = ['pace', 'acceleration', 'stamina', 'strength', 'agility', 'jumping'];
    const mentalPeaks = ['composure', 'decisions', 'anticipation', 'workRate', 'positioning', 'concentration', 'leadership'];
    const technicalPeaks = ['passing', 'shooting', 'dribbling', 'firstTouch', 'tackling', 'heading'];

    if (physicalPeaks.some(p => attr.toString().includes(p))) return 24;
    if (mentalPeaks.some(p => attr.toString().includes(p))) return 29;
    if (technicalPeaks.some(p => attr.toString().includes(p))) return 27;
    return 27;
  }

  static calculateDevelopment(
    currentAttrs: PlayerAttributes,
    age: number,
    playingTime: number,      // 0-1 (fraction of available minutes)
    trainingQuality: number,  // 0-1
    personality: 'model_pro' | 'professional' | 'ambitious' | 'fairly_professional' | 'unambitious'
  ): Partial<PlayerAttributes> {
    const personalityMultiplier = {
      model_pro: 1.3,
      professional: 1.1,
      ambitious: 1.2,
      fairly_professional: 1.0,
      unambitious: 0.7
    }[personality] || 1.0;

    const development: Partial<PlayerAttributes> = {};

    for (const [key, value] of Object.entries(currentAttrs)) {
      if (typeof value === 'number') {
        const peakAge = this.getPeakAge(key as keyof PlayerAttributes);
        const ageMultiplier = this.getAgeCurve(key as keyof PlayerAttributes, age);
        const playingMultiplier = 0.3 + 0.7 * playingTime;
        const trainingMultiplier = 0.5 + 0.5 * trainingQuality;

        const potentialGain = (20 - (currentAttrs as any)[key]) * ageMultiplier * playingMultiplier * trainingMultiplier * personalityMultiplier * 0.02;
        (development as any)[key] = Math.max(0, Math.min(potentialGain, 1));
      }
    }

    return development;
  }
}