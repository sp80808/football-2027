import { XP_REWARDS, XPAction } from './progression';
import { SimEvent } from '../engine/GameEngine';

/**
 * Per-match action accumulator for the human (player) side.
 *
 * The engine emits rich SimEvents (pass, shot_on_target, shot_off_target,
 * goal, assist, tackle, save) each tick; this object tallies them into a stat
 * line and an XP breakdown that the post-match screen + on-pitch leveling read.
 *
 * Possession and participation are observed per-tick via observeTick().
 */

export interface MatchActionCounts {
  passCompleted: number;
  shotOnTarget: number;
  shotOffTarget: number;
  goal: number;
  assist: number;
  tackleWon: number;
  save: number;
  participationMinutes: number;
}

export interface MatchStatsLine {
  goals: number;
  shots: number;
  shotsOnTarget: number;
  passes: number;
  tackles: number;
  saves: number;
  possessionPct: number;
}

export interface XpBreakdownEntry { count: number; xp: number; }

export function emptyCounts(): MatchActionCounts {
  return { passCompleted: 0, shotOnTarget: 0, shotOffTarget: 0, goal: 0, assist: 0, tackleWon: 0, save: 0, participationMinutes: 0 };
}

export function emptyStatsLine(): MatchStatsLine {
  return { goals: 0, shots: 0, shotsOnTarget: 0, passes: 0, tackles: 0, saves: 0, possessionPct: 50 };
}

export class ActionTracker {
  readonly counts: MatchActionCounts = emptyCounts();
  readonly xpBreakdown: Partial<Record<XPAction, XpBreakdownEntry>> = {};
  private matchSeconds = 0;
  private possessionTicks = 0;
  private totalTicks = 0;

  reset() {
    Object.assign(this.counts, emptyCounts());
    for (const k of Object.keys(this.xpBreakdown)) delete (this.xpBreakdown as any)[k];
    this.matchSeconds = 0;
    this.possessionTicks = 0;
    this.totalTicks = 0;
  }

  /** Called once per engine tick (120 Hz). */
  observeTick(matchSeconds: number, playerHasBall: boolean) {
    this.matchSeconds = matchSeconds;
    this.totalTicks++;
    if (playerHasBall) this.possessionTicks++;
    const minutes = Math.floor(matchSeconds / 60);
    if (minutes > this.counts.participationMinutes) this.counts.participationMinutes = minutes;
  }

  /** Generic recorder used by the engine-facing helper below. */
  record(action: XPAction, count = 1) {
    const current = this.counts as any;
    // map XPAction → MatchActionCounts field
    const field = ACTION_TO_FIELD[action];
    if (field) current[field] += count;
    const reward = XP_REWARDS[action];
    const entry = this.xpBreakdown[action] ?? { count: 0, xp: 0 };
    entry.count += count;
    entry.xp += reward * count;
    this.xpBreakdown[action] = entry;
  }

  /**
   * Translate a batch of engine SimEvents (player side) into RPG action counts.
   * Called once per frame from the gameplay loop with the drained events.
   */
  ingestSimEvents(events: SimEvent[]) {
    for (const e of events) {
      switch (e.type) {
        case 'pass_completed':
          if (e.side === 'player') this.record('passCompleted');
          break;
        case 'shot_on_target':
          if (e.side === 'player') this.record('shotOnTarget');
          break;
        case 'shot_off_target':
          if (e.side === 'player') this.record('shotOffTarget');
          break;
        case 'tackle':
          if (e.side === 'player') this.record('tackleWon');
          break;
        case 'save':
          if (e.side === 'player') this.record('save');
          break;
        case 'goal':
          if (e.scorer === 'player') this.record('goal');
          break;
        default:
          break;
      }
    }
  }

  get totalXp(): number {
    let sum = 0;
    for (const k of Object.keys(this.xpBreakdown) as XPAction[]) sum += this.xpBreakdown[k]!.xp;
    sum += this.counts.participationMinutes * XP_REWARDS.participationPerMinute;
    return Math.round(sum);
  }

  get statsLine(): MatchStatsLine {
    return {
      goals: this.counts.goal,
      shots: this.counts.shotOnTarget + this.counts.shotOffTarget,
      shotsOnTarget: this.counts.shotOnTarget,
      passes: this.counts.passCompleted,
      tackles: this.counts.tackleWon,
      saves: this.counts.save,
      possessionPct: this.totalTicks > 0 ? Math.round((this.possessionTicks / this.totalTicks) * 100) : 50,
    };
  }
}

const ACTION_TO_FIELD: Record<XPAction, keyof MatchActionCounts | null> = {
  passCompleted: 'passCompleted',
  keyPass: null,
  shotOnTarget: 'shotOnTarget',
  shotOffTarget: 'shotOffTarget',
  goal: 'goal',
  assist: 'assist',
  tackleWon: 'tackleWon',
  interception: null,
  save: 'save',
  clearance: null,
  cleanSheetBonus: null,
  matchWinBonus: null,
  matchDrawBonus: null,
  participationPerMinute: 'participationMinutes',
};
