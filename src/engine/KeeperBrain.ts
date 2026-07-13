/**
 * KeeperBrain — Yuka-based finite-state machine for goalkeeper decision-making.
 *
 * Architecture (see ADR-004):
 *  - Uses Yuka's StateMachine for state transitions only.
 *  - Physics / movement is executed by Keeper.ts using our Vec2 system.
 *  - KeeperBrain writes to `this.action`; Keeper.ts reads and acts on it.
 *  - KeeperBrain must NOT mutate Ball or Player state directly.
 */

// @ts-ignore — Yuka ships CJS/ESM but TS types vary by version
import { StateMachine, State } from 'yuka';
import { SimulationConfig } from './SimulationConfig';

// ── Action output ─────────────────────────────────────────────────────────────

export interface KeeperAction {
  /** Desired lateral (X) position on the goal line. */
  targetX: number;
  /** Maximum speed budget this tick (m/s). */
  speed: number;
  /** Whether keeper is committed to a diving save. */
  isDiving: boolean;
  /** Direction of dive: -1 = left, +1 = right. */
  diveDir: -1 | 1;
}

// ── Input snapshot (written before FSM update, read by states) ────────────────

export interface KeeperSense {
  ballX: number;
  ballY: number;
  ballZ: number;
  ballVX: number;
  ballVY: number;
  ballVZ: number;
  keeperX: number;
}

// ── State ID constants ─────────────────────────────────────────────────────────

const S = {
  IDLE:      'idle',
  READY:     'ready',
  INTERCEPT: 'intercept',
  DIVING:    'diving',
} as const;

// ── KeeperBrain class ─────────────────────────────────────────────────────────

export class KeeperBrain {
  /** Expose for logging / diagnostics. */
  currentStateName = S.IDLE;

  /** Written by update(); read by Keeper.ts each tick. */
  action: KeeperAction = {
    targetX: 0,
    speed:   SimulationConfig.KEEPER_MAX_SPEED,
    isDiving: false,
    diveDir:  1,
  };

  /** Sense snapshot — written by update() before FSM tick. */
  sense: KeeperSense = {
    ballX: 0, ballY: 0, ballZ: 0,
    ballVX: 0, ballVY: 0, ballVZ: 0,
    keeperX: 0,
  };

  /** Stored so State.execute() can access dt without API change. */
  _dt = 0;

  private fsm: any; // YUKA.StateMachine
  private _diveCooldown = 0;

  constructor() {
    this.fsm = new StateMachine(this);
    this.fsm.add(S.IDLE,      new IdleState());
    this.fsm.add(S.READY,     new ReadyState());
    this.fsm.add(S.INTERCEPT, new InterceptState());
    this.fsm.add(S.DIVING,    new DivingState());
    this.fsm.changeTo(S.IDLE);
    this.currentStateName = S.IDLE;
  }

  /**
   * Main update — call from Keeper.ts each physics tick.
   * @param dt      Fixed simulation delta (1/120 s)
   * @param ballPos Ball 3-D position
   * @param ballVel Ball 3-D velocity
   * @param keeperX Current keeper X coordinate
   */
  update(
    dt: number,
    ballPos: { x: number; y: number; z: number },
    ballVel: { x: number; y: number; z: number },
    keeperX: number,
  ) {
    this._dt = dt;

    this.sense.ballX  = ballPos.x;
    this.sense.ballY  = ballPos.y;
    this.sense.ballZ  = ballPos.z;
    this.sense.ballVX = ballVel.x;
    this.sense.ballVY = ballVel.y;
    this.sense.ballVZ = ballVel.z;
    this.sense.keeperX = keeperX;

    this._diveCooldown = Math.max(0, this._diveCooldown - dt);

    this.fsm.update(dt);
  }

  // ── Helper methods (called by states) ────────────────────────────────────

  /** Predicted ball X after lookahead window. */
  predictedBallX(): number {
    return this.sense.ballX + this.sense.ballVX * SimulationConfig.KEEPER_LOOKAHEAD_TIME;
  }

  /** True when ball is moving fast toward keeper's goal. */
  isBallIncoming(): boolean {
    const hSpeed = Math.sqrt(this.sense.ballVX ** 2 + this.sense.ballVY ** 2);
    // Positive Y = toward keeper goal in our coord system
    return this.sense.ballVY > 1.5 && hSpeed >= SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED;
  }

  /** Distance from keeper to ball (2-D). */
  distToBall(): number {
    const dx = this.sense.ballX - this.sense.keeperX;
    const dy = this.sense.ballY - (SimulationConfig.PITCH_HALF_LENGTH - 0.5);
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Whether dive conditions are met. */
  shouldDive(): boolean {
    return (
      this.distToBall() < SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS &&
      this.isBallIncoming() &&
      this._diveCooldown <= 0
    );
  }

  /** Commit to a dive — locks action.isDiving and starts cooldown. */
  commitDive() {
    const dx = this.sense.ballX - this.sense.keeperX;
    this.action.isDiving = true;
    this.action.diveDir  = dx >= 0 ? 1 : -1;
    this.action.speed    = SimulationConfig.KEEPER_DIVE_SPEED;
    this._diveCooldown   = SimulationConfig.KEEPER_DIVE_DURATION + 0.8;
  }

  changeTo(stateId: string) {
    this.fsm.changeTo(stateId);
    this.currentStateName = stateId;
  }
}

// ── Yuka States ───────────────────────────────────────────────────────────────

class IdleState extends State {
  enter(brain: KeeperBrain) {
    brain.action.isDiving = false;
    brain.action.speed    = SimulationConfig.KEEPER_MAX_SPEED * 0.6;
  }

  execute(brain: KeeperBrain) {
    // Track ball slowly; transition to ready when ball approaches
    brain.action.targetX = brain.predictedBallX();
    brain.action.speed   = SimulationConfig.KEEPER_MAX_SPEED * 0.6;

    if (brain.sense.ballY > SimulationConfig.PITCH_HALF_LENGTH * 0.3) {
      brain.changeTo(S.READY);
    }
  }

  exit(_brain: KeeperBrain) {}
}

class ReadyState extends State {
  enter(brain: KeeperBrain) {
    brain.action.isDiving = false;
    brain.action.speed    = SimulationConfig.KEEPER_MAX_SPEED;
  }

  execute(brain: KeeperBrain) {
    brain.action.targetX = brain.predictedBallX();
    brain.action.speed   = SimulationConfig.KEEPER_MAX_SPEED;

    if (brain.shouldDive()) {
      brain.changeTo(S.DIVING);
    } else if (brain.isBallIncoming() && brain.distToBall() < 10) {
      brain.changeTo(S.INTERCEPT);
    } else if (brain.sense.ballY < SimulationConfig.PITCH_HALF_LENGTH * 0.2) {
      brain.changeTo(S.IDLE);
    }
  }

  exit(_brain: KeeperBrain) {}
}

class InterceptState extends State {
  enter(brain: KeeperBrain) {
    brain.action.speed = SimulationConfig.KEEPER_MAX_SPEED;
  }

  execute(brain: KeeperBrain) {
    // Use longer lookahead when intercepting
    brain.action.targetX = brain.predictedBallX();
    brain.action.speed   = SimulationConfig.KEEPER_MAX_SPEED;

    if (brain.shouldDive()) {
      brain.changeTo(S.DIVING);
    } else if (!brain.isBallIncoming()) {
      brain.changeTo(S.READY);
    }
  }

  exit(_brain: KeeperBrain) {}
}

class DivingState extends State {
  private _elapsed = 0;

  enter(brain: KeeperBrain) {
    this._elapsed = 0;
    brain.commitDive();
  }

  execute(brain: KeeperBrain) {
    this._elapsed += brain._dt;
    if (this._elapsed >= SimulationConfig.KEEPER_DIVE_DURATION) {
      brain.action.isDiving = false;
      brain.changeTo(S.READY);
    }
  }

  exit(brain: KeeperBrain) {
    brain.action.isDiving = false;
  }
}
