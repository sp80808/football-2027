import { describe, it, expect, beforeEach } from 'vitest';
import { CommentaryEngine } from '../src/audio/CommentaryEngine';
import type { MatchSnapshot } from '../src/engine/MatchManager';

function baseSnapshot(overrides: Partial<MatchSnapshot> = {}): MatchSnapshot {
  return { homeScore: 0, awayScore: 0, matchTime: 120, half: 1, phase: 'playing', announcement: null, goalScorer: null, periodCountdown: null, ...overrides };
}

describe('CommentaryEngine', () => {
  let engine: CommentaryEngine;
  let roll = 0;
  beforeEach(() => {
    engine = new CommentaryEngine();
    roll = 0;
    engine.setRng(() => { roll += 0.17; return roll % 1; });
    engine.reset();
  });

  it('produces a non-empty line for a goal event', () => {
    const line = engine.generateGoalLine('player', baseSnapshot({ homeScore: 1 }));
    expect(line).not.toBeNull();
    expect(line!.text.length).toBeGreaterThan(10);
    expect(line!.text.toLowerCase()).toMatch(/goal|score|net/);
  });

  it('does not repeat the same template within a match', () => {
    const first = engine.generateGoalLine('player', baseSnapshot());
    const second = engine.generateGoalLine('player', baseSnapshot({ homeScore: 2, matchTime: 300 }));
    expect(first!.templateId).not.toBe(second!.templateId);
    expect(first!.text).not.toBe(second!.text);
  });

  it('maps shot events to commentary lines', () => {
    const lines = engine.processEvents([{ type: 'shot', side: 'player' }], baseSnapshot({ matchTime: 600 }), 'home');
    expect(lines.length).toBeGreaterThan(0);
  });

  it('ignores bounce events', () => {
    expect(engine.processEvents([{ type: 'bounce', intensity: 0.8 }], baseSnapshot(), 'loose')).toHaveLength(0);
  });

  it('announces halftime on phase transition', () => {
    engine.processEvents([], baseSnapshot({ phase: 'playing' }), 'home');
    const lines = engine.processEvents([], baseSnapshot({ phase: 'halftime', matchTime: 2700, homeScore: 1 }), 'home');
    expect(lines.some((l) => l.text.toLowerCase().includes('half'))).toBe(true);
  });
});
