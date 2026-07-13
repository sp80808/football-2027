import { SimulationConfig } from './SimulationConfig';

export type MatchPhase = 'playing' | 'celebration' | 'kickoff';

export class MatchState {
  homeScore = 0;
  awayScore = 0;
  elapsedSeconds = 0;
  phase: MatchPhase = 'kickoff';
  celebrationTimer = 0;
  kickoffTimer = 0;
  lastGoalSide: 1 | -1 | null = null;

  get displayMinutes(): number {
    return Math.floor(this.elapsedSeconds / 60);
  }

  get displaySeconds(): number {
    return Math.floor(this.elapsedSeconds % 60);
  }

  get isFullTime(): boolean {
    return this.elapsedSeconds >= SimulationConfig.MATCH_DURATION_SECONDS;
  }

  reset() {
    this.homeScore = 0;
    this.awayScore = 0;
    this.elapsedSeconds = 0;
    this.phase = 'kickoff';
    this.celebrationTimer = 0;
    this.kickoffTimer = SimulationConfig.KICKOFF_DELAY_SECONDS;
    this.lastGoalSide = null;
  }

  startKickoffCountdown() {
    this.phase = 'kickoff';
    this.kickoffTimer = SimulationConfig.KICKOFF_DELAY_SECONDS;
  }

  registerGoal(scoredAtPositiveY: boolean): 1 | -1 {
    const side: 1 | -1 = scoredAtPositiveY ? 1 : -1;
    if (side === 1) {
      this.homeScore += 1;
    } else {
      this.awayScore += 1;
    }
    this.lastGoalSide = side;
    this.phase = 'celebration';
    this.celebrationTimer = SimulationConfig.GOAL_CELEBRATION_SECONDS;
    return side;
  }

  update(dt: number): boolean {
    if (this.phase === 'celebration') {
      this.celebrationTimer -= dt;
      if (this.celebrationTimer <= 0) {
        this.startKickoffCountdown();
        return true;
      }
      return false;
    }

    if (this.phase === 'kickoff') {
      this.kickoffTimer -= dt;
      if (this.kickoffTimer <= 0) {
        this.phase = 'playing';
      }
      return false;
    }

    if (!this.isFullTime) {
      this.elapsedSeconds += dt;
    }
    return false;
  }
}
