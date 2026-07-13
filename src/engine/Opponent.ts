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
  | 'tracking'      // following ball from defensive shape
  | 'pressing'      // sprinting to win loose ball
  | 'jockeying'     // closing down ball carrier without committing
  | 'tackling'      // committed tackle lunge
  | 'dribbling'     // has possession, moving toward goal
  | 'shooting';     // locked into shot wind-up

export class Opponent {
  pos: Vec2 = new Vec2(0, 25);
  vel: Vec2 = new Vec2(0, 0);
  facing: Vec2 = new Vec2(0, -1); // faces player end by default

  aiState: OpponentState = 'tracking';

  // Tackle window timer: when positive, the tackle is live and can dispossess
  private tackleTimer = 0;
  private readonly TACKLE_DURATION   = 0.35;  // seconds the lunge is active
  private readonly TACKLE_COOLDOWN   = 1.2;   // seconds before next attempt
  private tackleCooldown             = 0;
  private readonly TACKLE_RANGE      = 1.4;   // m — lunge triggers within this distance

  // Jockey offset: opponent circles the ball carrier at JOCKEY_DIST
  private readonly JOCKEY_DIST       = 2.8;   // m

  // Shoot opportunity parameters
  private readonly SHOOT_RANGE       = 28;    // m from the player's goal (-Y)
  private readonly SHOOT_ANGLE_COS   = 0.70;  // ≈40° half-cone facing goal

  update(dt: number, ball: Ball, humanPlayer: Player) {
    const cfg = SimulationConfig;

    // Tick down timers
    if (this.tackleTimer   > 0) this.tackleTimer   -= dt;
    if (this.tackleCooldown > 0) this.tackleCooldown -= dt;

    // ── Possession check ──────────────────────────────────────────────────
    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const hasPossession = distToBall < cfg.PLAYER_CONTROL_RADIUS && ball.pos.z < 1.0;
    const ballIsLoose   =
      humanPlayer.controlState === 'free' &&
      ball.groundSpeed() > 0.5;

    if (hasPossession) {
      this._updateWithPossession(dt, ball);
      return;
    }

    if (ballIsLoose) {
      this._pressBall(dt, ball, cfg);
      return;
    }

    // Human has the ball — jockey and look for tackle window
    const playerHasBall =
      humanPlayer.controlState === 'under_control' ||
      humanPlayer.controlState === 'loose_nearby' ||
      humanPlayer.controlState === 'shielding';

    if (playerHasBall) {
      this._jockeyAndTackle(dt, ball, humanPlayer, cfg);
      return;
    }

    // Default: track ball from defensive shape
    this._trackBall(dt, ball, cfg);
  }

  // ── Has Possession ────────────────────────────────────────────────────────
  private _updateWithPossession(dt: number, ball: Ball) {
    const cfg = SimulationConfig;

    // Opponent attacks toward -Y (player's goal end)
    const goalPos = new Vec2(0, -cfg.PITCH_HALF_LENGTH);
    const toGoal  = goalPos.clone().add(new Vec2(-this.pos.x, -this.pos.y));
    const distToGoal = this.pos.distanceTo(goalPos);

    // Snap facing toward goal
    if (toGoal.magSq() > 0.01) {
      toGoal.normalize();
      this.facing.x += (toGoal.x - this.facing.x) * 10 * dt;
      this.facing.y += (toGoal.y - this.facing.y) * 10 * dt;
      this.facing.normalize();
    }

    // Shoot if close enough and facing goal within cone
    const facingDotGoal = this.facing.dot(toGoal.magSq() > 0 ? toGoal : new Vec2(0, -1));
    if (distToGoal < this.SHOOT_RANGE && facingDotGoal > this.SHOOT_ANGLE_COS) {
      this.aiState = 'shooting';
      const power = cfg.SHOT_POWER_BASE * 0.85;
      ball.kick(new Vec3(
        this.facing.x * power,
        this.facing.y * power,
        1.8,
      ));
      // Clear possession so we don't loop
      ball.vel.x += (Math.random() - 0.5) * 3; // slight inaccuracy
      return;
    }

    // Dribble toward goal
    this.aiState = 'dribbling';
    const speed = cfg.PLAYER_MAX_SPEED * 0.9;
    this.vel.x += (this.facing.x * speed - this.vel.x) * 8 * dt;
    this.vel.y += (this.facing.y * speed - this.vel.y) * 8 * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Keep ball glued ahead
    const idealBall = this.pos.clone().add(this.facing.clone().mul(0.5));
    ball.vel.x += (idealBall.x - ball.pos.x) * 18 * dt;
    ball.vel.y += (idealBall.y - ball.pos.y) * 18 * dt;
  }

  // ── Press loose ball ──────────────────────────────────────────────────────
  private _pressBall(dt: number, ball: Ball, cfg: typeof SimulationConfig) {
    this.aiState = 'pressing';
    const target = new Vec2(ball.pos.x, ball.pos.y);
    const toTarget = target.clone().add(new Vec2(-this.pos.x, -this.pos.y));
    if (toTarget.magSq() > 0.01) {
      toTarget.normalize();
      const speed = cfg.PLAYER_SPRINT_SPEED;
      this.vel.x += (toTarget.x * speed - this.vel.x) * 10 * dt;
      this.vel.y += (toTarget.y * speed - this.vel.y) * 10 * dt;
      this.facing.copy(toTarget);
    }
    this._applyVelocity(dt, cfg);
  }

  // ── Jockey + tackle window ────────────────────────────────────────────────
  private _jockeyAndTackle(dt: number, ball: Ball, humanPlayer: Player, cfg: typeof SimulationConfig) {
    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));

    // Active tackle lunge
    if (this.tackleTimer > 0) {
      this.aiState = 'tackling';
      // During lunge, keep moving toward ball
      const toB = new Vec2(ball.pos.x - this.pos.x, ball.pos.y - this.pos.y);
      if (toB.magSq() > 0.01) {
        toB.normalize();
        this.vel.x += toB.x * cfg.PLAYER_SPRINT_SPEED * 1.2 * dt;
        this.vel.y += toB.y * cfg.PLAYER_SPRINT_SPEED * 1.2 * dt;
      }
      // Dispossess check
      if (distToBall < this.TACKLE_RANGE * 0.6) {
        this._dispossess(ball, humanPlayer, cfg);
      }
      this._applyVelocity(dt, cfg);
      return;
    }

    this.aiState = 'jockeying';

    // Jockey: approach to JOCKEY_DIST then shadow
    const toPlayer = new Vec2(humanPlayer.pos.x - this.pos.x, humanPlayer.pos.y - this.pos.y);
    const distToPlayer = this.pos.distanceTo(humanPlayer.pos);

    if (distToPlayer > this.JOCKEY_DIST) {
      // Close down at jog pace
      toPlayer.normalize();
      const speed = cfg.PLAYER_MAX_SPEED * 0.75;
      this.vel.x += (toPlayer.x * speed - this.vel.x) * 6 * dt;
      this.vel.y += (toPlayer.y * speed - this.vel.y) * 6 * dt;
      this.facing.copy(toPlayer);
    } else {
      // Match player lateral movement, hold distance
      const lateralVel = new Vec2(humanPlayer.vel.x * 0.8, humanPlayer.vel.y * 0.8);
      this.vel.x += (lateralVel.x - this.vel.x) * 5 * dt;
      this.vel.y += (lateralVel.y - this.vel.y) * 5 * dt;

      // Face the ball carrier
      toPlayer.normalize();
      this.facing.copy(toPlayer);

      // Attempt tackle if in range and cooldown elapsed
      if (distToBall < this.TACKLE_RANGE && this.tackleCooldown <= 0) {
        this.tackleTimer   = this.TACKLE_DURATION;
        this.tackleCooldown = this.TACKLE_COOLDOWN;
      }
    }

    this._applyVelocity(dt, cfg);
  }

  // ── Track ball from shape ──────────────────────────────────────────────────
  private _trackBall(dt: number, ball: Ball, cfg: typeof SimulationConfig) {
    this.aiState = 'tracking';
    // Hold a line 20 m from the player's goal, shadow the ball's X
    const shapeY   = -15;
    const targetX  = Math.max(-cfg.PITCH_HALF_WIDTH + 3, Math.min(cfg.PITCH_HALF_WIDTH - 3, ball.pos.x));
    const target   = new Vec2(targetX, shapeY);
    const toTarget = new Vec2(target.x - this.pos.x, target.y - this.pos.y);

    if (toTarget.magSq() > 0.25) {
      toTarget.normalize();
      const speed = cfg.PLAYER_MAX_SPEED * 0.6;
      this.vel.x += (toTarget.x * speed - this.vel.x) * 4 * dt;
      this.vel.y += (toTarget.y * speed - this.vel.y) * 4 * dt;
      this.facing.copy(toTarget);
    } else {
      // Decelerate
      this.vel.x *= 1 - dt * 8;
      this.vel.y *= 1 - dt * 8;
    }

    this._applyVelocity(dt, cfg);
  }

  // ── Helpers ───────────────────────────────────────────────────────────────
  private _applyVelocity(dt: number, cfg: typeof SimulationConfig) {
    const maxSpeed = cfg.PLAYER_SPRINT_SPEED;
    const speed = this.vel.mag();
    if (speed > maxSpeed) {
      this.vel.x = (this.vel.x / speed) * maxSpeed;
      this.vel.y = (this.vel.y / speed) * maxSpeed;
    }
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;

    // Clamp to pitch
    const hw = cfg.PITCH_HALF_WIDTH;
    const hl = cfg.PITCH_HALF_LENGTH;
    this.pos.x = Math.max(-hw, Math.min(hw, this.pos.x));
    this.pos.y = Math.max(-hl, Math.min(hl, this.pos.y));
  }

  private _dispossess(ball: Ball, humanPlayer: Player, cfg: typeof SimulationConfig) {
    // Knock the ball away from the human player toward a random clearance angle
    const clearAngle = Math.atan2(-humanPlayer.facing.y, -humanPlayer.facing.x) + (Math.random() - 0.5) * 1.2;
    const power = cfg.PASS_POWER_BASE * 0.6;
    ball.vel.x = Math.cos(clearAngle) * power;
    ball.vel.y = Math.sin(clearAngle) * power;
    ball.vel.z = 0.5;

    // Force human out of control
    humanPlayer.controlState = 'free';
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
