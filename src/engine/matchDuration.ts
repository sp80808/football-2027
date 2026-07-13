import { SimulationConfig } from './SimulationConfig';

export function setMatchDurationSeconds(seconds: number): void {
  SimulationConfig.MATCH_DURATION_SECONDS = seconds;
}

export function getMatchDurationSeconds(): number {
  return SimulationConfig.MATCH_DURATION_SECONDS;
}
