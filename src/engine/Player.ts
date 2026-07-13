import { Vec2, Vec3 } from './Math';
import { ControllerFrame } from './Intent'; // used in update() signature
import { Ball } from './Ball';
import { SimulationConfig } from './SimulationConfig';
import { parseIntent } from './PlayerIntentParser';

export type BallControlState =
  | 'free'
  | 'loose_nearby'
  | 'under_control'
  | 'stretching'
  | 'shielding'
  | 'receiving'
  | 'shooting_preparation';

export class Player {
  pos: Vec2 = new Vec2(0, 0);
  vel: Vec2 = new Vec2(0, 0);
  facing: Vec2 = new Vec2(1, 0);
  
  controlState: BallControlState = 'free';
  
  chargeStart: number = 0;
  isCharging: boolean = false;
  chargeType: 'pass' | 'shoot' = 'pass';

  /** Accumulated time since the last discrete ball touch (touch cadence timer). */
  private touchTimer: number = 0;
  
  update(dt: number, input: ControllerFrame, ball: Ball) {
    // Build ParseContext so the intent parser has what it needs.
    const intent = parseIntent(input, {
      playerSpeed: this.vel.mag(),
      chargeDuration: this.chargeStart,
      isCharging: this.isCharging,
      ballGrounded: ball.pos.z <= 0,
      ballInControl: this.controlState === 'under_control' || this.controlState === 'loose_nearby',
    });

    this.updateLocomotion(dt, intent);
    this.updateBallInteraction(dt, intent, ball);
  }

  private updateLocomotion(dt: number, intent: ReturnType<typeof parseIntent>) {
    const cfg = SimulationConfig;
    const targetSpeed = intent.urgency >= 1.0 ? cfg.PLAYER_SPRINT_SPEED : cfg.PLAYER_MAX_SPEED;
    const moveDir = intent.moveDir.clone();

    // Deceleration if no input
    if (moveDir.magSq() < 0.01) {
      const speed = this.vel.mag();
      if (speed > 0) {
        const drop = Math.min(speed, cfg.PLAYER_DECEL * dt);
        this.vel.normalize().mul(speed - drop);
      }
    } else {
      // Acceleration
      const acc = moveDir.normalize().mul(cfg.PLAYER_ACCEL * dt);
      this.vel.add(acc);
      
      const speedSq = this.vel.magSq();
      if (speedSq > targetSpeed * targetSpeed) {
        this.vel.normalize().mul(targetSpeed);
      }

      // Momentum-scaled turn speed: agile at walk, sluggish at sprint.
      const speedRatio = Math.min(this.vel.mag() / cfg.PLAYER_SPRINT_SPEED, 1.0);
      const turnSpeed = cfg.PLAYER_TURN_SPEED_WALK + (cfg.PLAYER_TURN_SPEED_SPRINT - cfg.PLAYER_TURN_SPEED_WALK) * speedRatio;

      // When shielding, body faces away from goal (away from faceDir) so
      // turning is deliberately slower.
      const effectiveTurnSpeed = intent.isShielding ? turnSpeed * 0.5 : turnSpeed;

      const targetFacing = intent.faceDir.clone();
      this.facing.x += (targetFacing.x - this.facing.x) * effectiveTurnSpeed * dt;
      this.facing.y += (targetFacing.y - this.facing.y) * effectiveTurnSpeed * dt;
      this.facing.normalize();
    }

    this.pos.add(this.vel.clone().mul(dt));
  }

  private updateBallInteraction(dt: number, intent: ReturnType<typeof parseIntent>, ball: Ball) {
    const cfg = SimulationConfig;
    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const controlRadius = cfg.PLAYER_CONTROL_RADIUS;

    // ── Control state classification ──────────────────────────────────────
    if (intent.isShielding && distToBall < controlRadius) {
      this.controlState = 'shielding';
    } else if (distToBall < controlRadius && ball.pos.z < 1.0) {
      this.controlState = 'under_control';
    } else if (distToBall < controlRadius * 2) {
      this.controlState = 'loose_nearby';
    } else {
      this.controlState = 'free';
    }

    // ── Charge management ─────────────────────────────────────────────────
    // Use raw frame so we can distinguish held vs released without losing
    // the charge the moment the intent parser sees 'none' on a frame boundary.
    const shootHeld    = input.shootHeld || input.shootPressed;
    const passHeld     = input.passHeld  || input.passPressed;
    const throughHeld  = input.throughPassHeld || input.throughPassPressed;
    const shootReleased = input.shootReleased;
    const passReleased  = input.passReleased || input.throughPassReleased;

    // Start charge on first held frame
    if (!this.isCharging) {
      if (shootHeld) {
        this.isCharging = true;
        this.chargeType = 'shoot';
        this.chargeStart = 0;
      } else if (passHeld || throughHeld) {
        this.isCharging = true;
        this.chargeType = 'pass';
        this.chargeStart = 0;
      }
    }

    // Accumulate charge while button held
    if (this.isCharging) {
      this.chargeStart += dt;
      if (this.chargeStart > cfg.MAX_CHARGE_TIME) this.chargeStart = cfg.MAX_CHARGE_TIME;
    }

    // ── Kick on release ───────────────────────────────────────────────────
    const shouldKick =
      (this.chargeType === 'shoot' && shootReleased) ||
      (this.chargeType === 'pass'  && passReleased);

    if (shouldKick && this.isCharging) {
      if (this.controlState === 'under_control' || this.controlState === 'loose_nearby') {
        const power =
          this.chargeType === 'shoot' ? cfg.SHOT_POWER_BASE : cfg.PASS_POWER_BASE;
        const multiplier = Math.max(cfg.MIN_CHARGE_FRACTION, this.chargeStart / cfg.MAX_CHARGE_TIME);

        // Through-pass gets extra loft; shoot gets more lift at full charge.
        const isThrough = throughHeld && this.chargeType === 'pass';
        const lift = this.chargeType === 'shoot'
          ? 3.0 * multiplier
          : isThrough ? 2.5 * multiplier : 0.5 * multiplier;

        const kickDir = this.facing.clone();
        ball.kick(
          new Vec3(
            kickDir.x * power * multiplier,
            kickDir.y * power * multiplier,
            lift,
          ),
        );
      }
      this.isCharging = false;
      this.chargeStart = 0;
    }

    // ── First Touch / Possession cadence ──────────────────────────────────
    if (
      (this.controlState === 'under_control' || this.controlState === 'shielding') &&
      !this.isCharging
    ) {
      this.touchTimer += dt;

      // Cadence interval: shorter at sprint, longer at walk.
      const speedRatio = Math.min(this.vel.mag() / cfg.PLAYER_SPRINT_SPEED, 1.0);
      const cadenceInterval =
        cfg.TOUCH_CADENCE_MAX_INTERVAL -
        (cfg.TOUCH_CADENCE_MAX_INTERVAL - cfg.TOUCH_CADENCE_MIN_INTERVAL) * speedRatio;

      const touch = intent.desiredTouch;

      // Soft continuous tether — keeps the ball from wandering between touches.
      const tetherPos = this._idealBallPos(touch);
      const toTether = new Vec2(tetherPos.x - ball.pos.x, tetherPos.y - ball.pos.y);
      const tetherDist = toTether.mag();
      if (tetherDist > 0.02) {
        toTether.normalize();
        const tetherForce = tetherDist * cfg.TOUCH_TETHER_GAIN;
        ball.vel.x += (this.vel.x + toTether.x * tetherForce - ball.vel.x) * 8 * dt;
        ball.vel.y += (this.vel.y + toTether.y * tetherForce - ball.vel.y) * 8 * dt;
      }

      // Discrete impulse touch once per cadence interval.
      if (this.touchTimer >= cadenceInterval) {
        this.touchTimer = 0;
        this._applyDiscreteTouch(touch, ball, cfg);
      }
    } else {
      this.touchTimer = 0;
    }

    // ── Shielding push ────────────────────────────────────────────────────
    // Position the ball behind the player relative to their facing direction
    // so the body acts as a physical barrier.
    if (this.controlState === 'shielding') {
      const shieldOffset = this.facing.clone().mul(-0.5); // behind player
      const shieldTargetX = this.pos.x + shieldOffset.x;
      const shieldTargetY = this.pos.y + shieldOffset.y;
      ball.vel.x += (shieldTargetX - ball.pos.x) * 20 * dt;
      ball.vel.y += (shieldTargetY - ball.pos.y) * 20 * dt;
    }
  }

  /** Returns the ideal 2-D position for the ball based on the touch style. */
  private _idealBallPos(touch: string): Vec2 {
    const cfg = SimulationConfig;
    if (touch === 'knock_on') {
      // Big touch ahead — push ball well in front
      return this.pos.clone().add(this.facing.clone().mul(cfg.TOUCH_IDEAL_DIST * 3.5));
    }
    if (touch === 'cushion') {
      // Gentle: bring ball very close to feet
      return this.pos.clone().add(this.facing.clone().mul(cfg.TOUCH_IDEAL_DIST * 0.5));
    }
    if (touch === 'shield') {
      // Behind the player
      return this.pos.clone().add(this.facing.clone().mul(-cfg.TOUCH_IDEAL_DIST));
    }
    // Default push: normal distance in front
    return this.pos.clone().add(this.facing.clone().mul(cfg.TOUCH_IDEAL_DIST));
  }

  /** Applies a single discrete impulse to the ball at the touch cadence. */
  private _applyDiscreteTouch(touch: string, ball: Ball, cfg: typeof SimulationConfig) {
    const idealPos = this._idealBallPos(touch);
    const toIdeal = new Vec2(idealPos.x - ball.pos.x, idealPos.y - ball.pos.y);
    const dist = toIdeal.mag();
    if (dist < 0.01) return;

    toIdeal.normalize();
    const force = Math.min(dist * 15, cfg.TOUCH_FORCE_MAX);

    ball.vel.x = this.vel.x + toIdeal.x * force;
    ball.vel.y = this.vel.y + toIdeal.y * force;

    // Knock-on adds a small spin/swerve variation from velocity direction.
    if (touch === 'knock_on') {
      ball.vel.x *= 1.1;
      ball.vel.y *= 1.1;
    }
  }
}
