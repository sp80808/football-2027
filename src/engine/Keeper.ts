import { Vec2 } from './Math';
import { Ball } from './Ball';
import { SimulationConfig } from './SimulationConfig';

export type KeeperState = 'positioning' | 'diving' | 'recovering' | 'holding' | 'distributing';

export class Keeper {
  pos = new Vec2(0, 52);
  facing = new Vec2(0, -1);
  aiState: KeeperState = 'positioning';
  isHoldingBall = false;

  /** True on the tick the keeper deflects or punches the ball (for save tracking). */
  savedThisTick = false;

  private diveTimer = 0;
  private holdTimer = 0;
  private diveVelocity = new Vec2(0, 0);
  private readonly scratchToBall = new Vec2();
  private readonly scratchBallPos = new Vec2();
  private readonly scratchTarget = new Vec2();
  private readonly scratchPredict = new Vec2();

  resetState() {
    this.aiState = 'positioning';
    this.diveTimer = 0;
    this.holdTimer = 0;
    this.isHoldingBall = false;
    this.diveVelocity.set(0, 0);
    this.facing.set(0, -1);
    this.savedThisTick = false;
  }

  update(dt: number, ball: Ball, rushHeld = false, denyPassbackCollection = false) {
    this.savedThisTick = false;
    if (this.aiState === 'positioning') this.updatePositioning(dt, ball, rushHeld, denyPassbackCollection);
    else if (this.aiState === 'diving') this.updateDiving(dt, ball);
    else if (this.aiState === 'holding') this.updateHolding(dt, ball);
    else if (this.aiState === 'distributing') this.updateDistributing(dt, ball);
    else this.updateRecovering(dt);
  }

  /**
   * Predict where the ball crosses the goal line.
   * out.x = intercept X, out.y = height (z). Returns time-to-intercept in seconds.
   */
  predictGoalLineIntersection(ball: Ball, out: Vec2): number {
    const cfg = SimulationConfig;
    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;
    const vy = ball.vel.y;

    if (vy <= 0.5) {
      out.set(ball.pos.x + ball.vel.x * cfg.KEEPER_LOOKAHEAD_TIME, ball.pos.z);
      return cfg.KEEPER_LOOKAHEAD_TIME;
    }

    const t = (goalLineY - ball.pos.y) / vy;
    if (t <= 0 || t > cfg.KEEPER_PREDICT_MAX_TIME) {
      out.set(ball.pos.x + ball.vel.x * cfg.KEEPER_LOOKAHEAD_TIME, ball.pos.z);
      return cfg.KEEPER_LOOKAHEAD_TIME;
    }

    const predictedX = ball.pos.x + ball.vel.x * t;
    const predictedZ = ball.pos.z + ball.vel.z * t - 0.5 * cfg.BALL_GRAVITY * t * t;
    out.set(predictedX, Math.max(0, predictedZ));
    return t;
  }

  private updatePositioning(dt: number, ball: Ball, rushHeld: boolean, denyPassbackCollection: boolean) {
    const cfg = SimulationConfig;
    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;
    const boxEdgeY = goalLineY - cfg.KEEPER_BOX_DEPTH;

    const autoRush = this.shouldAutoRushOut(ball, cfg, goalLineY, boxEdgeY);
    const userRush = rushHeld && this.isLooseBallInBox(ball, cfg, goalLineY);

    if (autoRush || userRush) {
      this.updateRushOut(dt, ball, cfg, goalLineY, boxEdgeY, autoRush);
    } else {
      this.predictGoalLineIntersection(ball, this.scratchPredict);
      const targetX = Math.max(
        -cfg.GOAL_HALF_WIDTH,
        Math.min(cfg.GOAL_HALF_WIDTH, this.scratchPredict.x),
      );
      const difference = targetX - this.pos.x;

      if (Math.abs(difference) > 0.05) {
        const movement = Math.min(Math.abs(difference), cfg.KEEPER_MAX_SPEED * dt);
        this.pos.x += Math.sign(difference) * movement;
      }
      this.pos.y = goalLineY;
    }

    this.scratchToBall.set(ball.pos.x - this.pos.x, ball.pos.y - this.pos.y);
    if (this.scratchToBall.magSq() > 0.01) {
      this.scratchToBall.normalize();
      this.facing.x += (this.scratchToBall.x - this.facing.x) * 8 * dt;
      this.facing.y += (this.scratchToBall.y - this.facing.y) * 8 * dt;
      this.facing.normalize();
    }

    const ballSpeed = Math.hypot(ball.vel.x, ball.vel.y);
    this.scratchBallPos.set(ball.pos.x, ball.pos.y);
    const distanceToBall = this.pos.distanceTo(this.scratchBallPos);
    const approaching = ball.vel.y > 1;

    let saveRadius = cfg.KEEPER_SAVE_RADIUS;
    if (autoRush || userRush) {
      if (distanceToBall < cfg.KEEPER_SPREAD_DIST) {
        saveRadius *= cfg.KEEPER_SPREAD_RADIUS_MULT; // spread save
      }
    }

    if (
      approaching
      && ballSpeed >= cfg.KEEPER_DIVE_MIN_BALL_SPEED
      && distanceToBall <= cfg.KEEPER_DIVE_TRIGGER_RADIUS
      && ball.pos.z < cfg.GOAL_HEIGHT
    ) {
      this.startDive(ball);
      return;
    }

    if (distanceToBall < saveRadius && ball.pos.z < cfg.GOAL_HEIGHT) {
      if (denyPassbackCollection && ballSpeed < cfg.KEEPER_LOOSE_BALL_MAX_SPEED * 1.5) {
        this.punchClear(ball);
      } else {
        if (ballSpeed < cfg.KEEPER_CATCH_MAX_SPEED && ball.pos.z < 2.0 && !denyPassbackCollection) {
          this.catchBall(ball);
        } else {
          this.deflect(ball);
        }
      }
    }

    if (
      (autoRush || userRush)
      && distanceToBall < cfg.KEEPER_SAVE_RADIUS * 1.2
      && ball.pos.z < cfg.GOAL_HEIGHT + 0.5
    ) {
      this.punchClear(ball);
    }
  }

  private shouldAutoRushOut(
    ball: Ball,
    cfg: typeof SimulationConfig,
    goalLineY: number,
    boxEdgeY: number,
  ): boolean {
    if (ball.pos.y < boxEdgeY - cfg.KEEPER_1V1_RUSH_DIST || ball.pos.y > goalLineY) return false;
    const ballSpeed = Math.hypot(ball.vel.x, ball.vel.y);
    const throughBall =
      ball.vel.y >= cfg.KEEPER_THROUGH_BALL_MIN_VY
      && ballSpeed >= cfg.KEEPER_THROUGH_BALL_MIN_SPEED;
    
    // 1-on-1 check: ball is in our half, approaching goal
    const oneOnOne = ball.pos.y >= boxEdgeY - cfg.KEEPER_1V1_RUSH_DIST && ball.vel.y > 0.5;

    const inRushZone = ball.pos.y >= boxEdgeY + cfg.KEEPER_BOX_DEPTH * 0.35 || oneOnOne;
    return (throughBall || oneOnOne) && inRushZone && ball.pos.z < cfg.GOAL_HEIGHT;
  }

  private isLooseBallInBox(ball: Ball, cfg: typeof SimulationConfig, goalLineY: number): boolean {
    const boxEdgeY = goalLineY - cfg.KEEPER_BOX_DEPTH;
    if (ball.pos.y < boxEdgeY || ball.pos.y > goalLineY) return false;
    if (Math.abs(ball.pos.x) > cfg.KEEPER_BOX_HALF_WIDTH) return false;
    const ballSpeed = Math.hypot(ball.vel.x, ball.vel.y);
    return ballSpeed < cfg.KEEPER_LOOSE_BALL_MAX_SPEED && ball.pos.z < cfg.GOAL_HEIGHT + 0.5;
  }

  private updateRushOut(
    dt: number,
    ball: Ball,
    cfg: typeof SimulationConfig,
    goalLineY: number,
    boxEdgeY: number,
    autoRush: boolean,
  ) {
    if (autoRush) {
      const targetX = Math.max(
        -cfg.GOAL_HALF_WIDTH * 1.5,
        Math.min(cfg.GOAL_HALF_WIDTH * 1.5, ball.pos.x),
      );
      const targetY = Math.max(boxEdgeY, Math.min(ball.pos.y - 1, goalLineY - 1.5));
      this.scratchTarget.set(targetX, targetY);
    } else {
      this.scratchTarget.set(ball.pos.x, Math.min(ball.pos.y, goalLineY - 0.5));
    }

    const dx = this.scratchTarget.x - this.pos.x;
    const dy = this.scratchTarget.y - this.pos.y;
    const dist = Math.hypot(dx, dy);
    if (dist > 0.05) {
      const move = Math.min(dist, cfg.KEEPER_RUSH_SPEED * dt);
      this.pos.x += (dx / dist) * move;
      this.pos.y += (dy / dist) * move;
    }

    this.pos.y = Math.min(this.pos.y, goalLineY);
    this.pos.y = Math.max(this.pos.y, boxEdgeY);
  }

  private updateDiving(dt: number, ball: Ball) {
    const cfg = SimulationConfig;
    this.pos.x += this.diveVelocity.x * dt;
    this.pos.y += this.diveVelocity.y * dt;
    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;
    this.pos.y = Math.max(goalLineY - 2, Math.min(goalLineY + 0.5, this.pos.y));

    this.scratchBallPos.set(ball.pos.x, ball.pos.y);
    const distanceToBall = this.pos.distanceTo(this.scratchBallPos);
    if (distanceToBall < cfg.KEEPER_SAVE_RADIUS && ball.pos.z < cfg.GOAL_HEIGHT) {
      if (Math.hypot(ball.vel.x, ball.vel.y) < cfg.KEEPER_CATCH_MAX_SPEED && ball.pos.z < 2.0) {
        this.catchBall(ball);
      } else {
        this.deflect(ball);
      }
    }

    this.diveTimer -= dt;
    if (this.diveTimer <= 0) {
      this.aiState = 'recovering';
      this.diveTimer = cfg.KEEPER_RECOVER_DURATION;
    }
  }

  private updateRecovering(dt: number) {
    const cfg = SimulationConfig;
    const difference = -this.pos.x;
    const recoverSpeed = cfg.KEEPER_MAX_SPEED * cfg.KEEPER_RECOVER_SPEED_MULT;
    if (Math.abs(difference) > 0.05) {
      const movement = Math.min(Math.abs(difference), recoverSpeed * dt);
      this.pos.x += Math.sign(difference) * movement;
    }

    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;
    this.pos.y += (goalLineY - this.pos.y) * cfg.KEEPER_RECOVER_RETURN_RATE * dt;
    this.diveTimer -= dt;
    if (this.diveTimer <= 0) this.aiState = 'positioning';
  }

  private startDive(ball: Ball) {
    const cfg = SimulationConfig;
    const t = this.predictGoalLineIntersection(ball, this.scratchPredict);
    if (this.scratchPredict.y > cfg.GOAL_HEIGHT) return;

    const predictedX = this.scratchPredict.x;
    let direction = Math.sign(predictedX - this.pos.x);
    if (direction === 0) direction = Math.sign(ball.vel.x) || 1;

    const dist = Math.abs(predictedX - this.pos.x);
    const speed = Math.min(
      cfg.KEEPER_DIVE_SPEED,
      Math.max(cfg.KEEPER_DIVE_SPEED * 0.65, dist / Math.max(t, cfg.KEEPER_DIVE_DURATION * 0.5)),
    );
    this.diveVelocity.set(direction * speed, 0);
    this.diveTimer = cfg.KEEPER_DIVE_DURATION;
    this.aiState = 'diving';
  }

  private catchBall(ball: Ball) {
    this.aiState = 'holding';
    this.isHoldingBall = true;
    this.holdTimer = SimulationConfig.KEEPER_HOLD_DURATION;
    ball.vel.set(0, 0, 0);
    ball.spin.set(0, 0, 0);
    this.savedThisTick = true;
  }

  private updateHolding(dt: number, ball: Ball) {
    this.holdTimer -= dt;
    // Tether ball to keeper
    ball.pos.set(this.pos.x + this.facing.x * 0.5, this.pos.y + this.facing.y * 0.5, 0.5);
    ball.vel.set(0, 0, 0);

    if (this.holdTimer <= 0) {
      this.aiState = 'distributing';
    }
  }

  private updateDistributing(dt: number, ball: Ball) {
    const cfg = SimulationConfig;
    // Auto distribute upfield
    const power = cfg.KEEPER_PUNT_POWER;
    // Face forward
    this.facing.set(0, this.pos.y > 0 ? -1 : 1);
    
    ball.vel.set(this.facing.x * power * 0.3, this.facing.y * power, cfg.KEEPER_PUNT_LIFT);
    this.isHoldingBall = false;
    this.aiState = 'recovering';
    this.diveTimer = 0.5; // brief recovery pause
  }

  private deflect(ball: Ball) {
    // Parry to the sides instead of straight back
    const deflectDir = Math.sign(ball.pos.x);
    ball.vel.y = -Math.abs(ball.vel.y) * 0.2;
    ball.vel.x = deflectDir * (Math.abs(ball.vel.x) * 0.5 + 4);
    ball.vel.z *= 0.5;
    this.savedThisTick = true;
  }

  private punchClear(ball: Ball) {
    ball.vel.y = -Math.abs(ball.vel.y) * 0.6 - 2;
    ball.vel.x *= 0.5;
    ball.vel.z = Math.abs(ball.vel.z) * 0.3 + 3;
    this.savedThisTick = true;
  }
}
