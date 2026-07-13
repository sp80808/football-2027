import { SimulationConfig } from '../engine/SimulationConfig';

export const MATCH_MINUTES_TOTAL = 90;
export const HALFTIME_MINUTE = 45;

/** Map real elapsed seconds to 0–90 broadcast match minutes. */
export function scaledMatchMinute(elapsedSeconds: number): number {
  const duration = SimulationConfig.MATCH_DURATION_SECONDS;
  const ratio = Math.min(1, Math.max(0, elapsedSeconds / duration));
  return ratio * MATCH_MINUTES_TOTAL;
}

export function displayMatchMinute(elapsedSeconds: number): number {
  return Math.floor(scaledMatchMinute(elapsedSeconds));
}

/** Broadcast-style mm:ss clock (0:00 → 90:00). */
export function formatBroadcastClock(elapsedSeconds: number): string {
  const minute = scaledMatchMinute(elapsedSeconds);
  const mins = Math.floor(minute);
  const secs = Math.floor((minute - mins) * 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function getMatchHalf(elapsedSeconds: number): 1 | 2 {
  return scaledMatchMinute(elapsedSeconds) < HALFTIME_MINUTE ? 1 : 2;
}

export function getPeriodLabel(elapsedSeconds: number): string {
  return getMatchHalf(elapsedSeconds) === 1 ? '1ST HALF' : '2ND HALF';
}
