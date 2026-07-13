// ─── Position system ───────────────────────────────────────────────────────

export type PositionCode =
  | 'GK'
  | 'CB' | 'LCB' | 'RCB'
  | 'LB'  | 'RB'
  | 'LWB' | 'RWB'
  | 'DM'
  | 'CM'
  | 'AM'
  | 'LM'  | 'RM'
  | 'LW'  | 'RW'
  | 'ST'  | 'SS';

/** Positions a slot will highlight as "natural fit" */
export const POSITION_FAMILIES: Record<PositionCode, PositionCode[]> = {
  GK:  ['GK'],
  CB:  ['CB','LCB','RCB'],
  LCB: ['CB','LCB','LB'],
  RCB: ['CB','RCB','RB'],
  LB:  ['LB','LCB','LWB'],
  RB:  ['RB','RCB','RWB'],
  LWB: ['LWB','LB','LM'],
  RWB: ['RWB','RB','RM'],
  DM:  ['DM','CM'],
  CM:  ['CM','DM','AM'],
  AM:  ['AM','CM','SS'],
  LM:  ['LM','LW','CM'],
  RM:  ['RM','RW','CM'],
  LW:  ['LW','LM','SS'],
  RW:  ['RW','RM','SS'],
  ST:  ['ST','SS'],
  SS:  ['SS','ST','AM'],
};

export function positionFits(playerPos: PositionCode, slotPos: PositionCode): 'natural' | 'workable' | 'uncomfortable' {
  if (POSITION_FAMILIES[slotPos]?.includes(playerPos)) return 'natural';
  if (POSITION_FAMILIES[playerPos]?.includes(slotPos)) return 'workable';
  return 'uncomfortable';
}

// ─── Card & player model ───────────────────────────────────────────────────

export type CardTier =
  | 'grassroots'    // Tier 9-10 level
  | 'amateur'       // Tier 7-8
  | 'semi_pro'      // Tier 5-6
  | 'professional'  // Tier 3-4
  | 'international' // Tier 1-2
  | 'elite'         // Top-flight starters
  | 'world_class';  // World-level

export const TIER_GEM_COLOUR: Record<CardTier, string> = {
  grassroots:    '#9ca3af',
  amateur:       '#22c55e',
  semi_pro:      '#3b82f6',
  professional:  '#a855f7',
  international: '#eab308',
  elite:         '#f97316',
  world_class:   '#ef4444',
};

export function overallToCardTier(overall: number): CardTier {
  if (overall >= 88) return 'world_class';
  if (overall >= 80) return 'elite';
  if (overall >= 72) return 'international';
  if (overall >= 64) return 'professional';
  if (overall >= 57) return 'semi_pro';
  if (overall >= 50) return 'amateur';
  return 'grassroots';
}

export type PlayerArchetype =
  | 'Guardian' | 'Sweeper'
  | 'Anchor'   | 'Libero'
  | 'Fullback' | 'Overlapper'
  | 'Destroyer'| 'Metronome'
  | 'BoxToBox' | 'Playmaker'
  | 'Dribbler' | 'CrossSpecialist'
  | 'Target'   | 'Poacher'
  | 'Presser'  | 'Technician';

export type Trait =
  | 'set_piece_master' | 'long_shot'        | 'clinical'
  | 'aerial_threat'   | 'pace_merchant'     | 'press_resistance'
  | 'leadership'      | 'big_game_player'   | 'recovery_runner'
  | 'creative_passer' | 'tactical_reader'   | 'hard_tackler'
  | 'dribble_merchant'| 'two_footed'        | 'consistent';

export interface PlayerRatings {
  overall:     number; // 40-99 composite
  pace:        number;
  physicality: number;
  technical:   number;
  vision:      number;
  composure:   number;
  speciality:  number; // position-specific elite skill
}

export type DataSource = 'generated' | 'openfoot' | 'statsbomb' | 'api_football' | 'sportmonks' | 'football_data' | 'community';
export type DataConfidence = 'fictional' | 'modelled' | 'community' | 'verified';

export interface PlayerCard {
  id: string;
  name: string;
  knownAs: string;
  nationality: string;
  age: number;
  primaryPosition: PositionCode;
  naturalPositions: PositionCode[];
  archetype: PlayerArchetype;
  tier: CardTier;
  ratings: PlayerRatings;
  // RPG layer
  level: number;
  experience: number;
  xpToNextLevel: number;
  potential: { min: number; max: number };
  traits: Trait[];
  // Live state (mutates during career)
  condition:  number; // 0-100 physical freshness
  morale:     number; // 0-100 mood
  form:       number; // 0-100 rolling performance avg
  fitness:    number; // 0-100 match sharpness
  // Career stats
  stats: { appearances: number; goals: number; assists: number; cleanSheets: number };
  // Contract
  contract: { weeklySalary: number; seasonsRemaining: number };
  // Provenance
  dataSource:     DataSource;
  dataConfidence: DataConfidence;
  confidenceNote: string;
  lastUpdated:    string;
}

// ─── Formation & squad selection ──────────────────────────────────────────

export type FormationCode = '4-4-2' | '4-3-3' | '4-2-3-1' | '3-5-2' | '5-3-2' | '4-1-4-1';

export interface FormationSlotDef {
  id:             string;
  label:          string;
  position:       PositionCode;
  validPositions: PositionCode[];
  x: number; // 0-100 left→right
  y: number; // 0-100 own goal→attack
}

export interface FilledSlot extends FormationSlotDef {
  playerId: string | null;
}

export interface SquadSelection {
  formationCode: FormationCode;
  slots:         FilledSlot[];  // 11 starters
  bench:         (string | null)[]; // 7 spots
}

// ─── Formation templates ─────────────────────────────────────────────────

export const FORMATIONS: Record<FormationCode, FormationSlotDef[]> = {
  '4-4-2': [
    { id:'gk',   label:'GK',   position:'GK',  validPositions:['GK'],              x:50, y:8  },
    { id:'rb',   label:'RB',   position:'RB',  validPositions:['RB','RWB','RCB'],  x:78, y:27 },
    { id:'rcb',  label:'RCB',  position:'RCB', validPositions:['CB','RCB','LCB'],  x:62, y:27 },
    { id:'lcb',  label:'LCB',  position:'LCB', validPositions:['CB','LCB','RCB'],  x:38, y:27 },
    { id:'lb',   label:'LB',   position:'LB',  validPositions:['LB','LWB','LCB'],  x:22, y:27 },
    { id:'rm',   label:'RM',   position:'RM',  validPositions:['RM','RW','CM'],    x:80, y:52 },
    { id:'rcm',  label:'RCM',  position:'CM',  validPositions:['CM','DM','AM'],    x:61, y:48 },
    { id:'lcm',  label:'LCM',  position:'CM',  validPositions:['CM','DM','AM'],    x:39, y:48 },
    { id:'lm',   label:'LM',   position:'LM',  validPositions:['LM','LW','CM'],    x:20, y:52 },
    { id:'rst',  label:'ST',   position:'ST',  validPositions:['ST','SS'],         x:62, y:80 },
    { id:'lst',  label:'ST',   position:'ST',  validPositions:['ST','SS'],         x:38, y:80 },
  ],
  '4-3-3': [
    { id:'gk',   label:'GK',  position:'GK',  validPositions:['GK'],              x:50, y:8  },
    { id:'rb',   label:'RB',  position:'RB',  validPositions:['RB','RWB','RCB'],  x:78, y:27 },
    { id:'rcb',  label:'CB',  position:'RCB', validPositions:['CB','RCB','LCB'],  x:62, y:27 },
    { id:'lcb',  label:'CB',  position:'LCB', validPositions:['CB','LCB','RCB'],  x:38, y:27 },
    { id:'lb',   label:'LB',  position:'LB',  validPositions:['LB','LWB','LCB'],  x:22, y:27 },
    { id:'rcm',  label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:68, y:52 },
    { id:'cm',   label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:50, y:50 },
    { id:'lcm',  label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:32, y:52 },
    { id:'rw',   label:'RW',  position:'RW',  validPositions:['RW','RM','SS'],    x:78, y:79 },
    { id:'cf',   label:'CF',  position:'ST',  validPositions:['ST','SS'],         x:50, y:83 },
    { id:'lw',   label:'LW',  position:'LW',  validPositions:['LW','LM','SS'],    x:22, y:79 },
  ],
  '4-2-3-1': [
    { id:'gk',   label:'GK',  position:'GK',  validPositions:['GK'],              x:50, y:8  },
    { id:'rb',   label:'RB',  position:'RB',  validPositions:['RB','RWB','RCB'],  x:78, y:27 },
    { id:'rcb',  label:'CB',  position:'RCB', validPositions:['CB','RCB','LCB'],  x:62, y:27 },
    { id:'lcb',  label:'CB',  position:'LCB', validPositions:['CB','LCB','RCB'],  x:38, y:27 },
    { id:'lb',   label:'LB',  position:'LB',  validPositions:['LB','LWB','LCB'],  x:22, y:27 },
    { id:'rdm',  label:'DM',  position:'DM',  validPositions:['DM','CM'],         x:61, y:43 },
    { id:'ldm',  label:'DM',  position:'DM',  validPositions:['DM','CM'],         x:39, y:43 },
    { id:'rm',   label:'RM',  position:'RM',  validPositions:['RM','RW','CM'],    x:75, y:64 },
    { id:'am',   label:'AM',  position:'AM',  validPositions:['AM','CM','SS'],    x:50, y:63 },
    { id:'lm',   label:'LM',  position:'LM',  validPositions:['LM','LW','CM'],    x:25, y:64 },
    { id:'st',   label:'ST',  position:'ST',  validPositions:['ST','SS'],         x:50, y:83 },
  ],
  '3-5-2': [
    { id:'gk',   label:'GK',  position:'GK',  validPositions:['GK'],              x:50, y:8  },
    { id:'rcb',  label:'RCB', position:'RCB', validPositions:['CB','RCB','RB'],   x:72, y:27 },
    { id:'cb',   label:'CB',  position:'CB',  validPositions:['CB','LCB','RCB'],  x:50, y:25 },
    { id:'lcb',  label:'LCB', position:'LCB', validPositions:['CB','LCB','LB'],   x:28, y:27 },
    { id:'rwb',  label:'RWB', position:'RWB', validPositions:['RWB','RB','RM'],   x:86, y:50 },
    { id:'rcm',  label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:65, y:48 },
    { id:'dm',   label:'DM',  position:'DM',  validPositions:['DM','CM'],         x:50, y:45 },
    { id:'lcm',  label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:35, y:48 },
    { id:'lwb',  label:'LWB', position:'LWB', validPositions:['LWB','LB','LM'],   x:14, y:50 },
    { id:'rst',  label:'ST',  position:'ST',  validPositions:['ST','SS'],         x:62, y:80 },
    { id:'lst',  label:'ST',  position:'ST',  validPositions:['ST','SS'],         x:38, y:80 },
  ],
  '5-3-2': [
    { id:'gk',   label:'GK',  position:'GK',  validPositions:['GK'],              x:50, y:8  },
    { id:'rwb',  label:'RWB', position:'RWB', validPositions:['RWB','RB','RM'],   x:86, y:30 },
    { id:'rcb',  label:'RCB', position:'RCB', validPositions:['CB','RCB','LCB'],  x:68, y:27 },
    { id:'cb',   label:'CB',  position:'CB',  validPositions:['CB','LCB','RCB'],  x:50, y:25 },
    { id:'lcb',  label:'LCB', position:'LCB', validPositions:['CB','LCB','RCB'],  x:32, y:27 },
    { id:'lwb',  label:'LWB', position:'LWB', validPositions:['LWB','LB','LM'],   x:14, y:30 },
    { id:'rcm',  label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:67, y:52 },
    { id:'cm',   label:'CM',  position:'CM',  validPositions:['CM','DM'],         x:50, y:50 },
    { id:'lcm',  label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:33, y:52 },
    { id:'rst',  label:'ST',  position:'ST',  validPositions:['ST','SS'],         x:62, y:80 },
    { id:'lst',  label:'ST',  position:'ST',  validPositions:['ST','SS'],         x:38, y:80 },
  ],
  '4-1-4-1': [
    { id:'gk',   label:'GK',  position:'GK',  validPositions:['GK'],              x:50, y:8  },
    { id:'rb',   label:'RB',  position:'RB',  validPositions:['RB','RWB','RCB'],  x:78, y:27 },
    { id:'rcb',  label:'CB',  position:'RCB', validPositions:['CB','RCB','LCB'],  x:62, y:27 },
    { id:'lcb',  label:'CB',  position:'LCB', validPositions:['CB','LCB','RCB'],  x:38, y:27 },
    { id:'lb',   label:'LB',  position:'LB',  validPositions:['LB','LWB','LCB'],  x:22, y:27 },
    { id:'dm',   label:'DM',  position:'DM',  validPositions:['DM','CM'],         x:50, y:43 },
    { id:'rm',   label:'RM',  position:'RM',  validPositions:['RM','RW','CM'],    x:78, y:60 },
    { id:'rcm',  label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:61, y:56 },
    { id:'lcm',  label:'CM',  position:'CM',  validPositions:['CM','DM','AM'],    x:39, y:56 },
    { id:'lm',   label:'LM',  position:'LM',  validPositions:['LM','LW','CM'],    x:22, y:60 },
    { id:'st',   label:'ST',  position:'ST',  validPositions:['ST','SS'],         x:50, y:83 },
  ],
};

// ─── Club & competition ────────────────────────────────────────────────────

export interface Club {
  id: string;
  name: string;
  shortName: string;
  crestEmoji: string;
  primaryColour: string;
  secondaryColour: string;
  homeCity: string;
  tier: number;          // 1 = Premier League, 10 = county
  divisionId: string;
  divisionName: string;
  isUserClub: boolean;
  isRealData: boolean;
}

export interface Division {
  id: string;
  name: string;
  tier: number;
  region: 'national' | 'north' | 'south' | 'midlands' | 'county';
  clubs: string[]; // club IDs
  promotionSpots: number;
  playoffSpots: number;
  relegationSpots: number;
  isRealData: boolean;
  dataSource: DataSource;
}

// ─── Season & calendar ─────────────────────────────────────────────────────

export type SeasonPhase = 'preseason' | 'season' | 'transfer_window' | 'season_end';

export interface CalendarDay {
  week: number;
  day: number;   // 1-7 within week
  date: string;  // YYYY-MM-DD (fictional season start = 2027-07-01)
  events: CalendarEvent[];
}

export type CalendarEventType =
  | 'fixture' | 'training' | 'rest' | 'transfer_window_open'
  | 'transfer_window_close' | 'board_review' | 'cup_draw';

export interface CalendarEvent {
  type: CalendarEventType;
  fixtureId?: string;
  label: string;
}

// ─── Fixtures & results ────────────────────────────────────────────────────

export type FixtureStatus = 'upcoming' | 'live' | 'completed' | 'postponed';

export interface Fixture {
  id: string;
  divisionId: string;
  week: number;
  homeClubId: string;
  awayClubId: string;
  homeClubName: string;
  awayClubName: string;
  homeClubEmoji: string;
  awayClubEmoji: string;
  status: FixtureStatus;
  result?: CareerMatchReport;
  isUserFixture: boolean;
}

export interface GoalEvent {
  minute: number;
  scorerId: string;
  scorerName: string;
  isHome: boolean;
  isPenalty: boolean;
  isOwnGoal: boolean;
}

export interface BookingEvent {
  minute: number;
  playerId: string;
  playerName: string;
  isHome: boolean;
  card: 'yellow' | 'red';
}

/** Unified report shape — same whether live 3D or instant simulation */
export interface CareerMatchReport {
  fixtureId: string;
  homeGoals: number;
  awayGoals: number;
  homeXG: number;
  awayXG: number;
  goalEvents: GoalEvent[];
  bookings: BookingEvent[];
  playerRatings: Record<string, number>; // playerId → 0-10
  attendance: number;
  narrative: string[];
  // Applied effects (populated after match)
  conditionDeltas: Record<string, number>;
  formDeltas:      Record<string, number>;
  moraleDeltas:    Record<string, number>;
  xpGained:       Record<string, number>;
  financeEffect:  { gate: number; bonus: number };
}

// ─── Standings ─────────────────────────────────────────────────────────────

export interface StandingsRow {
  clubId:    string;
  clubName:  string;
  clubEmoji: string;
  played: number; won: number; drawn: number; lost: number;
  gf: number; ga: number; gd: number; points: number;
  form: ('W' | 'D' | 'L')[];
  isUserClub: boolean;
}

// ─── Training & recovery ───────────────────────────────────────────────────

export type TrainingFocus =
  | 'fitness' | 'tactical' | 'technical' | 'physical'
  | 'set_pieces' | 'recovery' | 'youth' | 'match_prep';

export type TrainingIntensity = 'light' | 'normal' | 'heavy';

export interface TrainingEffect {
  conditionDelta: number;
  fitnessDelta:   number;
  xpGained:       number;
  traitsUnlockChance: number;
}

// ─── Facilities & staff ────────────────────────────────────────────────────

export interface Facilities {
  trainingGround:    number; // 1-5
  stadium:           number; // 1-5
  academy:           number; // 1-5
  medicalDepartment: number; // 1-5
  scoutingNetwork:   number; // 1-5
}

export interface Staff {
  id: string;
  name: string;
  role: 'assistant_manager' | 'coach' | 'physio' | 'scout' | 'analyst';
  quality: number; // 1-10
  speciality: string;
  weeklySalary: number;
}

// ─── Inbox & events ────────────────────────────────────────────────────────

export type InboxEventType =
  | 'board_message' | 'transfer_offer' | 'contract_expiry'
  | 'injury_report' | 'player_morale' | 'scout_report'
  | 'media_question' | 'facility_upgrade' | 'objective_update';

export interface InboxChoice {
  id: string;
  label: string;
  effect: string;
}

export interface InboxEvent {
  id: string;
  week: number;
  day: number;
  type: InboxEventType;
  title: string;
  body: string;
  choices?: InboxChoice[];
  resolved: boolean;
  choiceId?: string;
}

// ─── Board objectives ──────────────────────────────────────────────────────

export interface BoardObjective {
  id: string;
  description: string;
  target: string;
  progress: string;
  reward: string;
  completed: boolean;
  failed: boolean;
}

// ─── Scouting ─────────────────────────────────────────────────────────────

export type ScoutRegion = 'local' | 'regional' | 'national' | 'europe' | 'south_america' | 'africa';

export interface ScoutReport {
  id: string;
  playerId: string;
  playerName: string;
  position: PositionCode;
  ageGuess: number;
  overallGuess: number;
  confidence: number; // 0-1
  note: string;
  week: number;
}

// ─── Finances ──────────────────────────────────────────────────────────────

export interface Finances {
  balance:        number;
  weeklyWageBill: number;
  transferBudget: number;
  revenue: {
    matchday:    number;
    broadcasting: number;
    commercial:  number;
  };
}

// ─── Career save state ────────────────────────────────────────────────────

export interface CareerState {
  version:       number;
  saveTimestamp: string;
  managerId:     string;
  managerName:   string;
  season:        number;
  week:          number;
  day:           number;
  phase:         SeasonPhase;
  club:          Club;
  division:      Division;
  allClubs:      Club[];
  players:       PlayerCard[];
  squad:         SquadSelection;
  staff:         Staff[];
  facilities:    Facilities;
  finances:      Finances;
  fixtures:      Fixture[];
  standings:     StandingsRow[];
  inbox:         InboxEvent[];
  objectives:    BoardObjective[];
  scoutReports:  ScoutReport[];
  calendar:      CalendarDay[];
  activeTraining?: { focus: TrainingFocus; intensity: TrainingIntensity; startWeek: number };
}
