import { Vec2 } from './Math';
import { Ball } from './Ball';
import { SimulationConfig } from './SimulationConfig';

export type KeeperState = 'positioning' | 'diving' | 'recovering';

export class Keeper {
  pos = new Vec2(0, 52);
  facing = new Vec2(0, -1);
  aiState: KeeperState = 'positioning';

  private diveTimer = 0;
  private diveVelocity = new Vec2(0, 0);

  update(dt: number, ball: Ball) {
    if (this.aiState === 'positioning') this.updatePositioning(dt, ball);
    else if (this.aiState === 'diving') this.updateDiving(dt, ball);
    else this.updateRecovering(dt);
  }

  private updatePositioning(dt: number, ball: Ball) {
    const cfg = SimulationConfig;
    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;
    const predictedX = ball.pos.x + ball.vel.x * cfg.KEEPER_LOOKAHEAD_TIME;
    const targetX = Math.max(-cfg.GOAL_HALF_WIDTH, Math.min(cfg.GOAL_HALF_WIDTH, predictedX));
    const difference = targetX - this.pos.x;

    if (Math.abs(difference) > 0.05) {
      const movement = Math.min(Math.abs(difference), cfg.KEEPER_MAX_SPEED * dt);
      this.pos.x += Math.sign(difference) * movement;
    }
    this.pos.y = goalLineY;

    const toBall = new Vec2(ball.pos.x - this.pos.x, ball.pos.y - this.pos.y);
    if (toBall.magSq() > 0.01) {
      toBall.normalize();
      this.facing.x += (toBall.x - this.facing.x) * 8 * dt;
      this.facing.y += (toBall.y - this.facing.y) * 8 * dt;
      this.facing.normalize();
    }

    const ballSpeed = Math.hypot(ball.vel.x, ball.vel.y);
    const distanceToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const approaching = ball.vel.y > 1;

    if (
      approaching
      && ballSpeed >= cfg.KEEPER_DIVE_MIN_BALL_SPEED
      && distanceToBall <= cfg.KEEPER_DIVE_TRIGGER_RADIUS
      && ball.pos.z < cfg.GOAL_HEIGHT
    ) {
      this.startDive(ball);
    }

    if (distanceToBall < cfg.KEEPER_SAVE_RADIUS && ball.pos.z < cfg.GOAL_HEIGHT) {
      this.deflect(ball);
    }
  }

  private updateDiving(dt: number, ball: Ball) {
    const cfg = SimulationConfig;
    this.pos.x += this.diveVelocity.x * dt;
    this.pos.y += this.diveVelocity.y * dt;
    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;
    this.pos.y = Math.max(goalLineY - 2, Math.min(goalLineY + 0.5, this.pos.y));

    const distanceToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    if (distanceToBall < cfg.KEEPER_SAVE_RADIUS && ball.pos.z < cfg.GOAL_HEIGHT) this.deflect(ball);

    this.diveTimer -= dt;
    if (this.diveTimer <= 0) {
      this.aiState = 'recovering';
      this.diveTimer = cfg.KEEPER_RECOVER_DURATION;
    }
  }

  private updateRecovering(dt: number) {
    const cfg = SimulationConfig;
    const difference = -this.pos.x;
    if (Math.abs(difference) > 0.05) {
      const movement = Math.min(Math.abs(difference), cfg.KEEPER_MAX_SPEED * 0.6 * dt);
      this.pos.x += Math.sign(difference) * movement;
    }

    const goalLineY = cfg.PITCH_HALF_LENGTH - 0.5;
    this.pos.y += (goalLineY - this.pos.y) * 5 * dt;
    this.diveTimer -= dt;
    if (this.diveTimer <= 0) this.aiState = 'positioning';
  }

  private startDive(ball: Ball) {
    const cfg = SimulationConfig;
    const predictedX = ball.pos.x + ball.vel.x * 0.25;
    let direction = Math.sign(predictedX - this.pos.x);
    if (direction === 0) direction = Math.sign(ball.vel.x) || 1;
    this.diveVelocity.set(direction * cfg.KEEPER_DIVE_SPEED, 0);
    this.diveTimer = cfg.KEEPER_DIVE_DURATION;
    this.aiState = 'diving';
  }

  private deflect(ball: Ball) {
    ball.vel.y = -Math.abs(ball.vel.y) * 0.4;
    ball.vel.x *= -0.3;
    ball.vel.z *= 0.5;
  }
}
