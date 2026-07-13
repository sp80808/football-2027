import { describe, expect, it } from 'vitest';
import { ActionTracker } from '../src/career/ActionTracker';
import { SimEvent } from '../src/engine/GameEngine';
import { XP_REWARDS } from '../src/career/progression';

describe('ActionTracker', () => {
  it('counts player-side actions from SimEvents', () => {
    const t = new ActionTracker();
    const events: SimEvent[] = [
      { type: 'pass_completed', side: 'player' },
      { type: 'pass_completed', side: 'player' },
      { type: 'shot_on_target', side: 'player' },
      { type: 'tackle', side: 'player' },
      { type: 'goal', scorer: 'player' },
      // opponent events ignored for player attribution
      { type: 'pass_completed', side: 'opponent' },
      { type: 'shot_on_target', side: 'opponent' },
    ];
    t.ingestSimEvents(events);
    expect(t.counts.passCompleted).toBe(2);
    expect(t.counts.shotOnTarget).toBe(1);
    expect(t.counts.tackleWon).toBe(1);
    expect(t.counts.goal).toBe(1);
  });

  it('computes XP from the breakdown + participation', () => {
    const t = new ActionTracker();
    t.ingestSimEvents([
      { type: 'goal', scorer: 'player' },
      { type: 'pass_completed', side: 'player' },
      { type: 'pass_completed', side: 'player' },
      { type: 'pass_completed', side: 'player' },
    ]);
    t.observeTick(60 * 12, false); // 12 match-minutes elapsed
    const expected = XP_REWARDS.goal + 3 * XP_REWARDS.passCompleted + 12 * XP_REWARDS.participationPerMinute;
    expect(t.totalXp).toBe(Math.round(expected));
  });

  it('computes possession percentage', () => {
    const t = new ActionTracker();
    for (let i = 0; i < 10; i++) t.observeTick(i, i < 7); // 7/10 ticks with ball
    expect(t.statsLine.possessionPct).toBe(70);
  });

  it('reset clears everything', () => {
    const t = new ActionTracker();
    t.ingestSimEvents([{ type: 'goal', scorer: 'player' }]);
    t.observeTick(60, true);
    t.reset();
    expect(t.counts.goal).toBe(0);
    expect(t.totalXp).toBe(0);
    expect(t.statsLine.possessionPct).toBe(50);
  });
});
