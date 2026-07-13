import type { SimEvent } from '../engine/GameEngine';
import type { MatchPhase, MatchSnapshot } from '../engine/MatchManager';
import { displayMatchMinute } from '../utils/matchTime';
import { type CommentaryCategory, type CommentaryTemplate, pickAdjective, TEMPLATES_BY_CATEGORY } from './commentaryTemplates';

export type CommentaryPriority = 'critical' | 'high' | 'medium' | 'low' | 'ambient';
export interface CommentaryLine { text: string; priority: CommentaryPriority; category: CommentaryCategory; templateId: string; allowGemini?: boolean; }
export interface CommentaryMatchContext { homeScore: number; awayScore: number; minute: number; phase: MatchPhase; possession: 'home' | 'away' | 'loose'; }

const PRIORITY_RANK: Record<CommentaryPriority, number> = { critical: 100, high: 80, medium: 60, low: 40, ambient: 20 };
const TEAM_HOME = 'the home side';
const TEAM_AWAY = 'the away side';

function minuteWords(minute: number): string {
  if (minute <= 0) return 'zero';
  if (minute === 45) return 'forty-five';
  if (minute === 90) return 'ninety';
  return String(minute);
}
function scoreline(home: number, away: number): string { return `${home}–${away}`; }
function marginText(home: number, away: number): string {
  const diff = home - away;
  if (diff === 0) return 'level';
  const abs = Math.abs(diff);
  const leader = diff > 0 ? 'home' : 'away';
  const word = abs === 1 ? 'one' : abs === 2 ? 'two' : String(abs);
  return `${leader} lead by ${word}`;
}
interface SlotValues { playerTeam: string; opponentTeam: string; score: string; minute: string; adj: string; margin: string; }
function fillTemplate(template: string, slots: SlotValues): string {
  return template.replaceAll('{playerTeam}', slots.playerTeam).replaceAll('{opponentTeam}', slots.opponentTeam).replaceAll('{score}', slots.score).replaceAll('{minute}', slots.minute).replaceAll('{adj}', slots.adj).replaceAll('{margin}', slots.margin);
}
function sideToTeam(side: 'home' | 'away'): string { return side === 'home' ? TEAM_HOME : TEAM_AWAY; }

export class CommentaryEngine {
  private rng: () => number = Math.random;
  private usedTemplateIds = new Set<string>();
  private shuffledPools = new Map<CommentaryCategory, CommentaryTemplate[]>();
  private lastSpokenAt = 0;
  private lastBuildupAt = 0;
  private lastShotAt = 0;
  private lastTackleAt = 0;
  private prevPhase: MatchPhase = 'pre_kickoff';
  private queue: CommentaryLine[] = [];
  private preloadedNearMiss: CommentaryLine | null = null;
  private kickoffSpoken = false;
  private readonly maxQueue = 2;

  setRng(rng: () => number) { this.rng = rng; }
  reset() {
    this.usedTemplateIds.clear(); this.shuffledPools.clear(); this.lastSpokenAt = 0; this.lastBuildupAt = 0;
    this.lastShotAt = 0; this.lastTackleAt = 0; this.prevPhase = 'pre_kickoff'; this.queue = [];
    this.preloadedNearMiss = null; this.kickoffSpoken = false;
  }
  drainLines(): CommentaryLine[] { const out = [...this.queue]; this.queue = []; return out; }
  getPreloadedNearMiss(): CommentaryLine | null { const line = this.preloadedNearMiss; this.preloadedNearMiss = null; return line; }

  processEvents(events: SimEvent[], snapshot: MatchSnapshot, possession: 'home' | 'away' | 'loose'): CommentaryLine[] {
    const ctx = this.buildContext(snapshot, possession);
    const generated: CommentaryLine[] = [];
    for (const event of events) {
      const line = this.eventToLine(event, ctx);
      if (line) generated.push(line);
      if (event.type === 'shot' && this.rng() < 0.5) {
        const side = event.side === 'player' ? 'home' : 'away';
        this.preloadedNearMiss = this.pickLine(side === 'home' ? 'near_miss_home' : 'near_miss_away', ctx, 'low', false, side);
      }
    }
    const phaseLine = this.phaseTransitionLine(snapshot, ctx);
    if (phaseLine) generated.push(phaseLine);
    const ambient = this.maybeAmbientLine(snapshot, ctx, possession);
    if (ambient) generated.push(ambient);
    this.prevPhase = snapshot.phase;
    for (const line of generated) this.enqueue(line);
    return this.drainLines();
  }

  private buildContext(snapshot: MatchSnapshot, possession: 'home' | 'away' | 'loose'): CommentaryMatchContext {
    return { homeScore: snapshot.homeScore, awayScore: snapshot.awayScore, minute: displayMatchMinute(snapshot.matchTime), phase: snapshot.phase, possession };
  }
  private slotsForSide(side: 'home' | 'away', ctx: CommentaryMatchContext): SlotValues {
    return { playerTeam: sideToTeam(side), opponentTeam: sideToTeam(side === 'home' ? 'away' : 'home'), score: scoreline(ctx.homeScore, ctx.awayScore), minute: minuteWords(ctx.minute), adj: pickAdjective(this.rng), margin: marginText(ctx.homeScore, ctx.awayScore) };
  }
  private shuffleCategory(category: CommentaryCategory): CommentaryTemplate[] {
    const pool = TEMPLATES_BY_CATEGORY[category]; if (!pool?.length) return [];
    let shuffled = this.shuffledPools.get(category);
    if (!shuffled?.length) { shuffled = [...pool].sort(() => this.rng() - 0.5); this.shuffledPools.set(category, shuffled); }
    return shuffled;
  }
  private pickLine(category: CommentaryCategory, ctx: CommentaryMatchContext, priority: CommentaryPriority, allowGemini: boolean, side: 'home' | 'away' = 'home'): CommentaryLine | null {
    const pool = this.shuffleCategory(category); if (!pool.length) return null;
    let template: CommentaryTemplate | undefined;
    for (let i = 0; i < pool.length; i++) {
      const candidate = pool[i]!; if (!this.usedTemplateIds.has(candidate.id)) { template = candidate; pool.splice(i, 1); break; }
    }
    if (!template) { this.shuffledPools.delete(category); return this.pickLine(category, ctx, priority, allowGemini, side); }
    this.usedTemplateIds.add(template.id);
    const text = fillTemplate(template.text, this.slotsForSide(side, ctx));
    this.lastSpokenAt = performance.now();
    return { text, priority, category, templateId: template.id, allowGemini };
  }
  private eventToLine(event: SimEvent, ctx: CommentaryMatchContext): CommentaryLine | null {
    const now = performance.now();
    switch (event.type) {
      case 'goal': { const side = event.scorer === 'player' ? 'home' : 'away'; return this.pickLine(side === 'home' ? 'goal_home' : 'goal_away', ctx, 'critical', true, side); }
      case 'shot': { if (this.lastShotAt > 0 && now - this.lastShotAt < 3000) return null; this.lastShotAt = now; const side = event.side === 'player' ? 'home' : 'away'; return this.pickLine(side === 'home' ? 'shot_home' : 'shot_away', ctx, 'high', false, side); }
      case 'tackle': { if (this.lastTackleAt > 0 && now - this.lastTackleAt < 4000) return null; this.lastTackleAt = now; const side = event.side === 'player' ? 'home' : 'away'; return this.pickLine(side === 'home' ? 'tackle_home' : 'tackle_away', ctx, 'medium', false, side); }
      case 'offside': { const side = event.side === 'player' ? 'home' : 'away'; return this.pickLine(side === 'home' ? 'offside_home' : 'offside_away', ctx, 'high', false, side); }
      default: return null;
    }
  }
  private phaseTransitionLine(snapshot: MatchSnapshot, ctx: CommentaryMatchContext): CommentaryLine | null {
    const prev = this.prevPhase; const phase = snapshot.phase;
    if (phase === 'kickoff' && !this.kickoffSpoken && (prev === 'pre_kickoff' || prev === 'halftime')) { this.kickoffSpoken = true; return this.pickLine('kickoff', ctx, 'medium', false); }
    if (prev === 'playing' && phase === 'halftime') return this.pickLine('halftime', ctx, 'high', false);
    if (prev === 'playing' && phase === 'full_time') {
      const { homeScore, awayScore } = snapshot;
      if (homeScore === awayScore) return this.pickLine('full_time_draw', ctx, 'critical', true);
      if (homeScore > awayScore) return this.pickLine('full_time_win_home', ctx, 'critical', true);
      return this.pickLine('full_time_win_away', ctx, 'critical', true);
    }
    return null;
  }
  private maybeAmbientLine(snapshot: MatchSnapshot, ctx: CommentaryMatchContext, possession: 'home' | 'away' | 'loose'): CommentaryLine | null {
    if (snapshot.phase !== 'playing' || possession === 'loose') return null;
    const now = performance.now(); const interval = 25000 + this.rng() * 10000;
    if (now - this.lastBuildupAt < interval || now - this.lastSpokenAt < 8000) return null;
    this.lastBuildupAt = now;
    return this.pickLine(possession === 'home' ? 'buildup_home' : 'buildup_away', ctx, 'ambient', false, possession);
  }
  private enqueue(line: CommentaryLine) {
    if (this.queue.length >= this.maxQueue) {
      const lowestIdx = this.queue.reduce((minIdx, item, idx, arr) => PRIORITY_RANK[item.priority] < PRIORITY_RANK[arr[minIdx]!.priority] ? idx : minIdx, 0);
      if (PRIORITY_RANK[line.priority] <= PRIORITY_RANK[this.queue[lowestIdx]!.priority]) return;
      this.queue.splice(lowestIdx, 1);
    }
    this.queue.push(line);
  }
  generateGoalLine(scorer: 'player' | 'opponent', snapshot: MatchSnapshot): CommentaryLine | null {
    const side = scorer === 'player' ? 'home' : 'away';
    return this.pickLine(side === 'home' ? 'goal_home' : 'goal_away', this.buildContext(snapshot, side), 'critical', true, side);
  }
}
export const commentaryEngine = new CommentaryEngine();
