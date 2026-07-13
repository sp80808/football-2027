import { Vec2 } from './Math';
import { Ball } from './Ball';
import { SimulationConfig } from './SimulationConfig';

type KeeperState = 'positioning' | 'diving' | 'recovering';

export class Keeper {
  pos: Vec2 = new Vec2(0, 52.0);
  facing: Vec2 = new Vec2(0, -1);

  /** Expose current AI state for HUD / debug overlay. */
  aiState: KeeperState = 'positioning';

  private diveTimer: number = 0;
  private diveVel: Vec2 = new Vec2(0, 0);

  update(dt: number, ball: Ball) {
    switch (this.aiState) {
      case 'positioning':
        this._updatePositioning(dt, ball);
        break;
      case 'diving':
        this._updateDiving(dt, ball);
        break;
      case 'recovering':
        this._updateRecovering(dt);
        break;
    }
  }

  // ── Positioning ──────────────────────────────────────────────────────────
  private _updatePositioning(dt: number, ball: Ball) {
    const cfg = SimulationConfig;
    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5; // 52.0
    const hw = cfg.GOAL_HALF_WIDTH;

    // Predict where ball will be after KEEPER_LOOKAHEAD_TIME seconds.
    // Simple linear projection on the ground plane (ignore arc for now).
    const predictedX = ball.pos.x + ball.vel.x * cfg.KEEPER_LOOKAHEAD_TIME;
    const targetX = Math.max(-hw, Math.min(hw, predictedX));

    // Lateral strafe towards predicted intercept.
    const diff = targetX - this.pos.x;
    if (Math.abs(diff) > 0.05) {
      const dir = Math.sign(diff);
      const move = Math.min(Math.abs(diff), cfg.KEEPER_MAX_SPEED * dt);
      this.pos.x += dir * move;
    }

    // Stay on goal line.
    this.pos.y = goalLineY;

    // Update facing towards ball.
    const toBall = new Vec2(ball.pos.x - this.pos.x, ball.pos.y - this.pos.y);
    if (toBall.magSq() > 0.01) {
      toBall.normalize();
      this.facing.x += (toBall.x - this.facing.x) * 8 * dt;
      this.facing.y += (toBall.y - this.facing.y) * 8 * dt;
      this.facing.normalize();
    }

    // ── Dive decision ────────────────────────────────────────────────────
    const ballSpeed = Math.sqrt(ball.vel.x * ball.vel.x + ball.vel.y * ball.vel.y);
    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));

    // Only dive if ball is heading towards this goal (vel.y > 0 in world space
    // means towards keeper whose y is positive).
    const ballTravellingToGoal = ball.vel.y > 1.0;

    if (
      ballTravellingToGoal &&
      ballSpeed >= cfg.KEEPER_DIVE_MIN_BALL_SPEED &&
      distToBall <= cfg.KEEPER_DIVE_TRIGGER_RADIUS &&
      ball.pos.z < cfg.GOAL_HEIGHT
    ) {
      this._startDive(ball);
    }

    // ── Close-range reaction save ─────────────────────────────────────────
    if (distToBall < cfg.KEEPER_SAVE_RADIUS && ball.pos.z < cfg.GOAL_HEIGHT) {
      this._deflect(ball);
    }
  }

  // ── Diving ───────────────────────────────────────────────────────────────
  private _updateDiving(dt: number, ball: Ball) {
    const cfg = SimulationConfig;

    // Move in dive direction.
    this.pos.x += this.diveVel.x * dt;
    this.pos.y += this.diveVel.y * dt;

    // Clamp to near goal-line region.
    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;
    this.pos.y = Math.max(goalLineY - 2, Math.min(goalLineY + 0.5, this.pos.y));

    // Attempt a deflection if ball is very close during the dive.
    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    if (distToBall < cfg.KEEPER_SAVE_RADIUS && ball.pos.z < cfg.GOAL_HEIGHT) {
      this._deflect(ball);
    }

    this.diveTimer -= dt;
    if (this.diveTimer <= 0) {
      this.aiState = 'recovering';
      this.diveTimer = cfg.KEEPER_DIVE_DURATION; // reuse as recovery timer
    }
  }

  // ── Recovering ───────────────────────────────────────────────────────────
  private _updateRecovering(dt: number) {
    const cfg = SimulationConfig;
    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;

    // Walk back to goal-line centre.
    const targetX = 0;
    const diff = targetX - this.pos.x;
    if (Math.abs(diff) > 0.05) {
      const dir = Math.sign(diff);
      const move = Math.min(Math.abs(diff), cfg.KEEPER_MAX_SPEED * 0.6 * dt);
      this.pos.x += dir * move;
    }
    this.pos.y += (goalLineY - this.pos.y) * 5 * dt;

    this.diveTimer -= dt;
    if (this.diveTimer <= 0) {
      this.aiState = 'positioning';
    }
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private _startDive(ball: Ball) {
    const cfg = SimulationConfig;

    // Dive direction: towards predicted ball intercept.
    const predictedX = ball.pos.x + ball.vel.x * 0.25;
    const dir = new Vec2(predictedX - this.pos.x, 0);
    const dirMag = Math.abs(dir.x);

    if (dirMag > 0.1) {
      dir.normalize();
    } else {
      // Ball coming straight — dive in ball horizontal direction.
      dir.x = Math.sign(ball.vel.x) || 1;
      dir.y = 0;
    }

    this.diveVel.x = dir.x * cfg.KEEPER_DIVE_SPEED;
    this.diveVel.y = 0;

    this.diveTimer = cfg.KEEPER_DIVE_DURATION;
    this.aiState = 'diving';
  }

  private _deflect(ball: Ball) {
    // Punch/parry: reverse ball's y velocity strongly and reduce x.
    ball.vel.y = -Math.abs(ball.vel.y) * 0.4;
    ball.vel.x *= -0.3;
    ball.vel.z *= 0.5;
  }
}
