import { Ball } from './Ball';
import { Player } from './Player';
import { Keeper } from './Keeper';
import { SimulationConfig } from './SimulationConfig';

export type MatchPhase = 'pre_kickoff' | 'playing' | 'goal' | 'kickoff' | 'celebration';

export interface MatchSnapshot {
  homeScore: number;
  awayScore: number;
  matchTime: number;
  half: number;
  phase: MatchPhase;
  announcement: string | null;
  goalScorer: 'home' | 'away' | null;
}

export class MatchManager {
  state: MatchSnapshot = {
    homeScore: 0,
    awayScore: 0,
    matchTime: 0,
    half: 1,
    phase: 'pre_kickoff',
    announcement: null,
    goalScorer: null,
  };

  private celebrationTimer = 0;
  private kickoffTimer = 0;

  init() {
    this.state = {
      homeScore: 0,
      awayScore: 0,
      matchTime: 0,
      half: 1,
      phase: 'pre_kickoff',
      announcement: null,
      goalScorer: null,
    };
    this.celebrationTimer = 0;
    this.kickoffTimer = 0;
  }

  update(dt: number, ball: Ball, player: Player, keeper: Keeper) {
    if (this.state.phase === 'goal') {
      this.celebrationTimer -= dt;
      if (this.celebrationTimer <= 0) {
        this.state.phase = 'kickoff';
        this.state.announcement = 'KICK OFF';
        this.kickoffTimer = SimulationConfig.KICKOFF_DELAY_SECONDS;
        this.resetKickoffPositions(ball, player, keeper);
      }
      return;
    }

    if (this.state.phase === 'kickoff') {
      this.kickoffTimer -= dt;
      if (this.kickoffTimer <= 0) {
        this.state.phase = 'playing';
        this.state.announcement = null;
        this.state.goalScorer = null;
      }
      return;
    }

    if (this.state.phase !== 'playing') return;

    this.state.matchTime += dt;
    this.checkGoal(ball, player, keeper);
  }

  private checkGoal(ball: Ball, player: Player, keeper: Keeper) {
    const cfg = SimulationConfig;
    const inGoalMouth =
      Math.abs(ball.pos.x) <= cfg.GOAL_HALF_WIDTH && ball.pos.z <= cfg.GOAL_HEIGHT;

    if (!inGoalMouth) return;

    if (ball.pos.y >= cfg.PITCH_HALF_LENGTH) {
      this.state.homeScore += 1;
      this.state.goalScorer = 'home';
      this.state.phase = 'goal';
      this.state.announcement = 'GOAL!';
      this.celebrationTimer = SimulationConfig.GOAL_CELEBRATION_SECONDS;
      this.resetKickoffPositions(ball, player, keeper);
    } else if (ball.pos.y <= -cfg.PITCH_HALF_LENGTH) {
      this.state.awayScore += 1;
      this.state.goalScorer = 'away';
      this.state.phase = 'goal';
      this.state.announcement = 'GOAL!';
      this.celebrationTimer = SimulationConfig.GOAL_CELEBRATION_SECONDS;
      this.resetKickoffPositions(ball, player, keeper);
    }
  }

  private resetKickoffPositions(ball: Ball, player: Player, keeper: Keeper) {
    player.pos.set(0, -5);
    player.vel.set(0, 0);
    player.facing.set(0, 1);

    ball.pos.set(0, 0, 0);
    ball.vel.set(0, 0, 0);

    keeper.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH - 0.5);
    keeper.resetState();
  }
}

export type MatchState = MatchSnapshot;
