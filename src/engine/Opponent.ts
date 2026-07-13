import { Vec2, Vec3 } from './Math';
import { Ball } from './Ball';
import { Player } from './Player';
import { SimulationConfig } from './SimulationConfig';

/**
 * Opponent — lightweight CPU outfield player.
 *
 * Behaviour priority (evaluated top-to-bottom each tick):
 *  1. If in possession → shoot if facing goal and close enough, else dribble
 *  2. If ball is loose and nearby → sprint to intercept
 *  3. If player has the ball → jockey (close down but don't over-commit), tackle on window
 *  4. Default → track ball laterally from a safe defensive distance
 */

export type OpponentState =
  | 'tracking'
  | 'pressing'
  | 'jockeying'
  | 'tackling'
  | 'dribbling'
  | 'shooting';

export class Opponent {
  pos: Vec2 = new Vec2(0, 25);
  vel: Vec2 = new Vec2(0, 0);
  facing: Vec2 = new Vec2(0, -1);

  aiState: OpponentState = 'tracking';

  private tackleTimer = 0;
  private readonly TACKLE_DURATION = 0.35;
  private readonly TACKLE_COOLDOWN = 1.2;
  private tackleCooldown = 0;
  private readonly TACKLE_RANGE = 1.4;
  private readonly JOCKEY_DIST = 2.8;
  private readonly SHOOT_RANGE = 28;
  private readonly SHOOT_ANGLE_COS = 0.70;

  update(dt: number, ball: Ball, humanPlayer: Player) {
    const cfg = SimulationConfig;

    if (this.tackleTimer > 0) this.tackleTimer -= dt;
    if (this.tackleCooldown > 0) this.tackleCooldown -= dt;

    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const hasPossession = distToBall < cfg.PLAYER_CONTROL_RADIUS && ball.pos.z < 1.0;
    const ballIsLoose = humanPlayer.controlState === 'free' && ball.groundSpeed() > 0.5;

    if (hasPossession) {
      this.updateWithPossession(dt, ball);
      return;
    }

    if (ballIsLoose) {
      this.pressBall(dt, ball, cfg);
      return;
    }

    const playerHasBall =
      humanPlayer.controlState === 'under_control' ||
      humanPlayer.controlState === 'loose_nearby' ||
      humanPlayer.controlState === 'shielding';

    if (playerHasBall) {
      this.jockeyAndTackle(dt, ball, humanPlayer, cfg);
      return;
    }

    this.trackBall(dt, ball, cfg);
  }

  private updateWithPossession(dt: number, ball: Ball) {
    const cfg = SimulationConfig;
    const goalPos = new Vec2(0, -cfg.PITCH_HALF_LENGTH);
    const toGoal = new Vec2(goalPos.x - this.pos.x, goalPos.y - this.pos.y);
    const distToGoal = this.pos.distanceTo(goalPos);

    if (toGoal.magSq() > 0.01) {
      toGoal.normalize();
      this.facing.x += (toGoal.x - this.facing.x) * 10 * dt;
      this.facing.y += (toGoal.y - this.facing.y) * 10 * dt;
      this.facing.normalize();
    }

    const facingDotGoal = this.facing.dot(toGoal.magSq() > 0 ? toGoal : new Vec2(0, -1));
    if (distToGoal < this.SHOOT_RANGE && facingDotGoal > this.SHOOT_ANGLE_COS) {
      this.aiState = 'shooting';
      const power = cfg.SHOT_POWER_BASE * 0.85;
      ball.kick(new Vec3(this.facing.x * power, this.facing.y * power, 1.8));
      return;
    }

    this.aiState = 'dribbling';
    const speed = cfg.PLAYER_MAX_SPEED * 0.9;
    this.vel.x += (this.facing.x * speed - this.vel.x) * 8 * dt;
    this.vel.y += (this.facing.y * speed - this.vel.y) * 8 * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    const idealBall = this.pos.clone().add(this.facing.clone().mul(0.5));
    ball.vel.x += (idealBall.x - ball.pos.x) * 18 * dt;
    ball.vel.y += (idealBall.y - ball.pos.y) * 18 * dt;
  }

  private pressBall(dt: number, ball: Ball, cfg: typeof SimulationConfig) {
    this.aiState = 'pressing';
    const toTarget = new Vec2(ball.pos.x - this.pos.x, ball.pos.y - this.pos.y);
    if (toTarget.magSq() > 0.01) {
      toTarget.normalize();
      const speed = cfg.PLAYER_SPRINT_SPEED;
      this.vel.x += (toTarget.x * speed - this.vel.x) * 10 * dt;
      this.vel.y += (toTarget.y * speed - this.vel.y) * 10 * dt;
      this.facing.copy(toTarget);
    }
    this.applyVelocity(dt, cfg);
  }

  private jockeyAndTackle(dt: number, ball: Ball, humanPlayer: Player, cfg: typeof SimulationConfig) {
    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));

    if (this.tackleTimer > 0) {
      this.aiState = 'tackling';
      const toBall = new Vec2(ball.pos.x - this.pos.x, ball.pos.y - this.pos.y);
      if (toBall.magSq() > 0.01) {
        toBall.normalize();
        this.vel.x += toBall.x * cfg.PLAYER_SPRINT_SPEED * 1.2 * dt;
        this.vel.y += toBall.y * cfg.PLAYER_SPRINT_SPEED * 1.2 * dt;
      }
      if (distToBall < this.TACKLE_RANGE * 0.6) this.dispossess(ball, humanPlayer, cfg);
      this.applyVelocity(dt, cfg);
      return;
    }

    this.aiState = 'jockeying';
    const toPlayer = new Vec2(humanPlayer.pos.x - this.pos.x, humanPlayer.pos.y - this.pos.y);
    const distToPlayer = this.pos.distanceTo(humanPlayer.pos);

    if (distToPlayer > this.JOCKEY_DIST) {
      toPlayer.normalize();
      const speed = cfg.PLAYER_MAX_SPEED * 0.75;
      this.vel.x += (toPlayer.x * speed - this.vel.x) * 6 * dt;
      this.vel.y += (toPlayer.y * speed - this.vel.y) * 6 * dt;
      this.facing.copy(toPlayer);
    } else {
      const lateralVel = new Vec2(humanPlayer.vel.x * 0.8, humanPlayer.vel.y * 0.8);
      this.vel.x += (lateralVel.x - this.vel.x) * 5 * dt;
      this.vel.y += (lateralVel.y - this.vel.y) * 5 * dt;
      toPlayer.normalize();
      this.facing.copy(toPlayer);

      if (distToBall < this.TACKLE_RANGE && this.tackleCooldown <= 0) {
        this.tackleTimer = this.TACKLE_DURATION;
        this.tackleCooldown = this.TACKLE_COOLDOWN;
      }
    }

    this.applyVelocity(dt, cfg);
  }

  private trackBall(dt: number, ball: Ball, cfg: typeof SimulationConfig) {
    this.aiState = 'tracking';
    const targetX = Math.max(-cfg.PITCH_HALF_WIDTH + 3, Math.min(cfg.PITCH_HALF_WIDTH - 3, ball.pos.x));
    const toTarget = new Vec2(targetX - this.pos.x, -15 - this.pos.y);

    if (toTarget.magSq() > 0.25) {
      toTarget.normalize();
      const speed = cfg.PLAYER_MAX_SPEED * 0.6;
      this.vel.x += (toTarget.x * speed - this.vel.x) * 4 * dt;
      this.vel.y += (toTarget.y * speed - this.vel.y) * 4 * dt;
      this.facing.copy(toTarget);
    } else {
      this.vel.x *= 1 - dt * 8;
      this.vel.y *= 1 - dt * 8;
    }

    this.applyVelocity(dt, cfg);
  }

  private applyVelocity(dt: number, cfg: typeof SimulationConfig) {
    const maxSpeed = cfg.PLAYER_SPRINT_SPEED;
    const speed = this.vel.mag();
    if (speed > maxSpeed) {
      this.vel.x = (this.vel.x / speed) * maxSpeed;
      this.vel.y = (this.vel.y / speed) * maxSpeed;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.x = Math.max(-cfg.PITCH_HALF_WIDTH, Math.min(cfg.PITCH_HALF_WIDTH, this.pos.x));
    this.pos.y = Math.max(-cfg.PITCH_HALF_LENGTH, Math.min(cfg.PITCH_HALF_LENGTH, this.pos.y));
  }

  private dispossess(ball: Ball, humanPlayer: Player, cfg: typeof SimulationConfig) {
    const clearAngle = Math.atan2(-humanPlayer.facing.y, -humanPlayer.facing.x);
    const power = cfg.PASS_POWER_BASE * 0.6;
    ball.vel.x = Math.cos(clearAngle) * power;
    ball.vel.y = Math.sin(clearAngle) * power;
    ball.vel.z = 0.5;
    humanPlayer.controlState = 'free';
  }

  dispossessByPlayer(ball: Ball, humanPlayer: Player): boolean {
    const cfg = SimulationConfig;
    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    if (distToBall >= cfg.PLAYER_CONTROL_RADIUS || ball.pos.z >= 1.0) return false;

    const clearAngle = Math.atan2(-this.facing.y, -this.facing.x);
    const power = cfg.PASS_POWER_BASE * 0.65;
    ball.vel.x = Math.cos(clearAngle) * power;
    ball.vel.y = Math.sin(clearAngle) * power;
    ball.vel.z = 0.4;
    this.aiState = 'tracking';
    this.tackleTimer = 0;
    this.tackleCooldown = 0.8;
    humanPlayer.controlState = 'free';
    return true;
  }

  reset() {
    this.pos.set(0, 25);
    this.vel.set(0, 0);
    this.facing.set(0, -1);
    this.aiState = 'tracking';
    this.tackleTimer = 0;
    this.tackleCooldown = 0;
  }
}
