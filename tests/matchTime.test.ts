import { describe, it, expect } from 'vitest';
import {
  scaledMatchMinute,
  formatBroadcastClock,
  displayMatchMinute,
  getMatchHalf,
  getPeriodLabel,
} from '../src/utils/matchTime';
import { SimulationConfig } from '../src/engine/SimulationConfig';

describe('matchTime', () => {
  it('maps real seconds to 90-minute match clock', () => {
    const half = SimulationConfig.MATCH_DURATION_SECONDS / 2;
    expect(scaledMatchMinute(0)).toBe(0);
    expect(scaledMatchMinute(half)).toBeCloseTo(45, 5);
    expect(scaledMatchMinute(SimulationConfig.MATCH_DURATION_SECONDS)).toBe(90);
  });

  it('formats broadcast clock as mm:ss', () => {
    expect(formatBroadcastClock(0)).toBe('0:00');
    expect(formatBroadcastClock(SimulationConfig.MATCH_DURATION_SECONDS / 2)).toBe('45:00');
  });

  it('reports match half and period label', () => {
    const early = SimulationConfig.MATCH_DURATION_SECONDS * 0.25;
    const late = SimulationConfig.MATCH_DURATION_SECONDS * 0.75;
    expect(getMatchHalf(early)).toBe(1);
    expect(getPeriodLabel(early)).toBe('1ST HALF');
    expect(getMatchHalf(late)).toBe(2);
    expect(getPeriodLabel(late)).toBe('2ND HALF');
  });

  it('floors display match minute', () => {
    const t = SimulationConfig.MATCH_DURATION_SECONDS * 0.5 + 1;
    expect(displayMatchMinute(t)).toBe(45);
  });
});
