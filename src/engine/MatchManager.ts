import { Ball } from './Ball';
import { Footballer } from './Footballer';
import { Keeper } from './Keeper';
import { SimulationConfig } from './SimulationConfig';

export type MatchPhase =
  | 'pre_kickoff'
  | 'playing'
  | 'goal'
  | 'kickoff'
  | 'celebration'
  | 'halftime'
  | 'full_time';

export interface MatchSnapshot {
  homeScore: number;
  awayScore: number;
  matchTime: number;
  half: number;
  phase: MatchPhase;
  announcement: string | null;
  goalScorer: 'home' | 'away' | null;
  /** Seconds remaining before play resumes (kickoff or 2nd half). */
  periodCountdown: number | null;
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
    periodCountdown: null,
  };

  private celebrationTimer = 0;
  private kickoffTimer = 0;
  private halftimeTimer = 0;

  init() {
    this.state = {
      homeScore: 0,
      awayScore: 0,
      matchTime: 0,
      half: 1,
      phase: 'pre_kickoff',
      announcement: null,
      goalScorer: null,
      periodCountdown: null,
    };
    this.celebrationTimer = 0;
    this.kickoffTimer = 0;
    this.halftimeTimer = 0;
  }

  rematch() {
    this.init();
    this.beginKickoff();
  }

  beginKickoff() {
    this.state.phase = 'kickoff';
    this.state.announcement = 'KICK OFF';
    this.kickoffTimer = SimulationConfig.KICKOFF_DELAY_SECONDS;
    this.state.periodCountdown = Math.ceil(SimulationConfig.KICKOFF_DELAY_SECONDS);
  }

  update(dt: number, ball: Ball, homeTeam: Footballer[], awayTeam: Footballer[], homeKeeper: Keeper, awayKeeper: Keeper) {
    if (this.state.phase === 'full_time') return;

    if (this.state.phase === 'halftime') {
      this.halftimeTimer -= dt;
      this.state.periodCountdown = Math.max(0, Math.ceil(this.halftimeTimer));
      if (this.halftimeTimer <= 0) {
        this.state.half = 2;
        this.beginKickoff();
        this.resetKickoffPositions(ball, homeTeam, awayTeam, homeKeeper, awayKeeper);
      }
      return;
    }

    if (this.state.phase === 'goal') {
      this.celebrationTimer -= dt;
      if (this.celebrationTimer <= 0) {
        this.state.phase = 'kickoff';
        this.state.announcement = 'KICK OFF';
        this.kickoffTimer = SimulationConfig.KICKOFF_DELAY_SECONDS;
        this.resetKickoffPositions(ball, homeTeam, awayTeam, homeKeeper, awayKeeper);
      }
      return;
    }

    if (this.state.phase === 'kickoff') {
      this.kickoffTimer -= dt;
      this.state.periodCountdown = Math.max(0, Math.ceil(this.kickoffTimer));
      if (this.kickoffTimer <= 0) {
        this.state.phase = 'playing';
        this.state.announcement = null;
        this.state.goalScorer = null;
        this.state.periodCountdown = null;
      }
      return;
    }

    if (this.state.phase !== 'playing') return;

    this.state.matchTime += dt;
    this.checkPeriodTransitions(ball, homeTeam, awayTeam, homeKeeper, awayKeeper);
    if (this.state.phase !== 'playing') return;

    this.checkGoal(ball, homeTeam, awayTeam, homeKeeper, awayKeeper);
  }

  private checkPeriodTransitions(ball: Ball, homeTeam: Footballer[], awayTeam: Footballer[], homeKeeper: Keeper, awayKeeper: Keeper) {
    const cfg = SimulationConfig;
    const halfDuration = cfg.MATCH_DURATION_SECONDS / 2;

    if (this.state.half === 1 && this.state.matchTime >= halfDuration) {
      this.state.phase = 'halftime';
      this.state.announcement = 'HALF TIME';
      this.halftimeTimer = cfg.HALFTIME_SECONDS;
      this.state.periodCountdown = Math.ceil(cfg.HALFTIME_SECONDS);
      return;
    }

    if (this.state.half === 2 && this.state.matchTime >= cfg.MATCH_DURATION_SECONDS) {
      this.state.phase = 'full_time';
      this.state.announcement = 'FULL TIME';
      this.state.periodCountdown = null;
    }
  }

  private checkGoal(ball: Ball, homeTeam: Footballer[], awayTeam: Footballer[], homeKeeper: Keeper, awayKeeper: Keeper) {
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
      this.resetKickoffPositions(ball, homeTeam, awayTeam, homeKeeper, awayKeeper);
    } else if (ball.pos.y <= -cfg.PITCH_HALF_LENGTH) {
      this.state.awayScore += 1;
      this.state.goalScorer = 'away';
      this.state.phase = 'goal';
      this.state.announcement = 'GOAL!';
      this.celebrationTimer = SimulationConfig.GOAL_CELEBRATION_SECONDS;
      this.resetKickoffPositions(ball, homeTeam, awayTeam, homeKeeper, awayKeeper);
    }
  }

  private resetKickoffPositions(ball: Ball, homeTeam: Footballer[], awayTeam: Footballer[], homeKeeper: Keeper, awayKeeper: Keeper) {
    // Basic 4-3-3 shape for reset. Home attacks +Y, Away attacks -Y.
    const positions = [
      { x: -18, y: 15 }, // LB
      { x: -8, y: 12 }, // LCB
      { x: 8, y: 12 },  // RCB
      { x: 18, y: 15 },  // RB
      { x: -12, y: 25 }, // LDM
      { x: 12, y: 25 },  // RDM
      { x: -22, y: 35 }, // LW
      { x: 0, y: 32 },   // CAM
      { x: 22, y: 35 },  // RW
      { x: 0, y: 45 },   // ST
    ];

    for (let i = 0; i < 10; i++) {
      homeTeam[i].pos.set(positions[i].x, -SimulationConfig.PITCH_HALF_LENGTH + positions[i].y);
      homeTeam[i].vel.set(0, 0);
      homeTeam[i].facing.set(0, 1);
      homeTeam[i].controlState = 'free';

      awayTeam[i].pos.set(positions[i].x, SimulationConfig.PITCH_HALF_LENGTH - positions[i].y);
      awayTeam[i].vel.set(0, 0);
      awayTeam[i].facing.set(0, -1);
      awayTeam[i].controlState = 'free';
    }
    
    // Put STs closer to the ball for kickoff
    homeTeam[9].pos.set(0, -5);
    awayTeam[9].pos.set(0, 5);

    ball.pos.set(0, 0, 0);
    ball.vel.set(0, 0, 0);

    homeKeeper.pos.set(0, -SimulationConfig.PITCH_HALF_LENGTH + 0.5);
    homeKeeper.facing.set(0, 1);
    homeKeeper.resetState();

    awayKeeper.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH - 0.5);
    awayKeeper.facing.set(0, -1);
    awayKeeper.resetState();
  }
}

export type MatchState = MatchSnapshot;
