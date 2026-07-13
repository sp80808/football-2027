import { create } from 'zustand';
import { PlayerProfile, StatKey } from './playerSchemas';
import { generateSquad } from './rosterGenerator';
import { applyXp, spendPoints } from './progression';
import { ActionTracker } from './ActionTracker';
import { ProgrammeId, Intensity, applyTraining } from './TrainingSystem';

/**
 * Squad + progression store. Holds the 16-player roster, their XP/level/points,
 * per-player training programmes, and the live match ActionTracker. Persisted
 * to localStorage under SQUAD_KEY (mirrors the settingsStore pattern).
 *
 * Career-flow responsibilities:
 *  - Generate a squad on first run.
 *  - Track which outfielder is currently controlled (for on-pitch XP + physics binding).
 *  - Apply post-match XP from the ActionTracker to the controlled player (and
 *    participation XP to the rest of the selected squad).
 *  - Apply a training week between matches.
 *  - Spend attribute points.
 */

const SQUAD_KEY = 'football-2027-squad';

function loadPersisted(): PlayerProfile[] | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(SQUAD_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length < 11) return null;
    return parsed as PlayerProfile[];
  } catch {
    return null;
  }
}

function persist(players: PlayerProfile[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SQUAD_KEY, JSON.stringify(players));
  } catch {
    // ignore quota errors
  }
}

export interface MatchXpAward {
  playerId: string;
  playerName: string;
  xpGained: number;
  levelsGained: number;
  pointsAwarded: number;
  leveledUp: boolean;
}

interface SquadActions {
  players: PlayerProfile[];
  /** Live per-match action tracker (not persisted). */
  tracker: ActionTracker;
  trainingProgrammes: Record<string, { programme: ProgrammeId; intensity: Intensity }>;
  /** Awards from the most recent match, for the post-match screen. */
  lastMatchAwards: MatchXpAward[];

  controlledPlayerId: string;
  getControlled: () => PlayerProfile | undefined;
  getKeeper: () => PlayerProfile | undefined;
  setControlled: (playerId: string) => void;
  switchControl: () => void;

  startMatchTracking: () => void;
  recordPostMatchXp: (didWin: boolean | null, cleanSheet: boolean) => MatchXpAward[];
  applyTrainingWeek: () => void;
  allocatePoints: (playerId: string, allocation: Partial<Record<StatKey, number>>) => void;
  setTrainingProgramme: (playerId: string, programme: ProgrammeId, intensity: Intensity) => void;
  resetSquad: () => void;
}

function ensureControlled(players: PlayerProfile[]): string {
  const existing = players.find((p) => p.isControlled && !p.isKeeper);
  if (existing) return existing.id;
  const first = players.find((p) => !p.isKeeper);
  if (first) {
    first.isControlled = true;
    return first.id;
  }
  return players[0]?.id ?? '';
}

const saved = loadPersisted();
const initialPlayers = saved ?? generateSquad({ seed: 2027, teamRating: 75 });
if (!saved) persist(initialPlayers);
const initialControlled = ensureControlled(initialPlayers);

export const useSquadStore = create<SquadActions>((set, get) => ({
  players: initialPlayers,
  tracker: new ActionTracker(),
  trainingProgrammes: {},
  lastMatchAwards: [],
  controlledPlayerId: initialControlled,

  getControlled: () => get().players.find((p) => p.id === get().controlledPlayerId && !p.isKeeper),
  getKeeper: () => get().players.find((p) => p.isKeeper),

  setControlled: (playerId) => {
    const players = get().players.map((p) => ({ ...p, isControlled: p.id === playerId && !p.isKeeper }));
    set({ players, controlledPlayerId: playerId });
    persist(players);
  },

  switchControl: () => {
    const { players, controlledPlayerId } = get();
    const outfielders = players.filter((p) => !p.isKeeper);
    if (outfielders.length < 2) return;
    const idx = outfielders.findIndex((p) => p.id === controlledPlayerId);
    const next = outfielders[(idx + 1) % outfielders.length];
    get().setControlled(next.id);
  },

  startMatchTracking: () => {
    get().tracker.reset();
  },

  recordPostMatchXp: (didWin, cleanSheet) => {
    const tracker = get().tracker;
    const players = get().players.map((p) => ({ ...p }));
    const awards: MatchXpAward[] = [];
    const controlledId = get().controlledPlayerId;

    // Controlled player: full action XP from the tracker.
    const controlledActionXp = tracker.totalXp;
    let participationBonus = 0;
    if (didWin === true) participationBonus += 50; // matchWinBonus
    else if (didWin === null) participationBonus += 15; // draw
    // Clean sheet bonus for defenders/GK.
    const cleanSheetBonus = (p: PlayerProfile) =>
      cleanSheet && ['GK', 'CB', 'LB', 'RB', 'CDM'].includes(p.position) ? 40 : 0;

    for (const p of players) {
      let xp = 0;
      if (p.id === controlledId) {
        xp = controlledActionXp + participationBonus + cleanSheetBonus(p);
      } else if (!p.isKeeper) {
        // Squad participation: a fraction of the controlled action XP + win/draw bonus.
        xp = Math.round(controlledActionXp * 0.25) + participationBonus + cleanSheetBonus(p);
      } else {
        // Keeper: saves already in action XP if keeper was controlled-equivalent; give modest participation.
        xp = Math.round(controlledActionXp * 0.15) + participationBonus + cleanSheetBonus(p);
      }
      if (xp > 0) {
        const result = applyXp(p, xp);
        Object.assign(p, result.profile);
        if (result.xpGained > 0) {
          awards.push({
            playerId: p.id,
            playerName: p.name,
            xpGained: result.xpGained,
            levelsGained: result.levelsGained,
            pointsAwarded: result.pointsAwarded,
            leveledUp: result.leveledUp,
          });
        }
      }
    }

    set({ players, lastMatchAwards: awards });
    persist(players);
    return awards;
  },

  applyTrainingWeek: () => {
    const programmes = get().trainingProgrammes;
    const players = get().players.map((p) => {
      const plan = programmes[p.id] ?? { programme: 'balanced' as ProgrammeId, intensity: 'standard' as Intensity };
      const outcome = applyTraining(p, plan.programme, plan.intensity);
      return outcome.profile;
    });
    set({ players });
    persist(players);
  },

  allocatePoints: (playerId, allocation) => {
    const players = get().players.map((p) => (p.id === playerId ? spendPoints(p, allocation) : p));
    set({ players });
    persist(players);
  },

  setTrainingProgramme: (playerId, programme, intensity) => {
    set({ trainingProgrammes: { ...get().trainingProgrammes, [playerId]: { programme, intensity } } });
  },

  resetSquad: () => {
    const fresh = generateSquad({ seed: Date.now() & 0xffffff, teamRating: 75 });
    ensureControlled(fresh);
    persist(fresh);
    get().tracker.reset();
    set({ players: fresh, controlledPlayerId: fresh.find((p) => p.isControlled && !p.isKeeper)?.id ?? fresh[0].id, lastMatchAwards: [], trainingProgrammes: {} });
  },
}));
