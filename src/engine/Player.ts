import { Vec2, Vec3 } from './Math';
import { ControllerFrame } from './Intent';
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
  pos = new Vec2(0, 0);
  vel = new Vec2(0, 0);
  facing = new Vec2(1, 0);
  controlState: BallControlState = 'free';
  chargeStart = 0;
  isCharging = false;
  chargeType: 'pass' | 'shoot' = 'pass';
  private chargingThroughPass = false;
  private touchTimer = 0;

  update(dt: number, input: ControllerFrame, ball: Ball) {
    const intent = parseIntent(input, {
      playerSpeed: this.vel.mag(),
      chargeDuration: this.chargeStart,
      isCharging: this.isCharging,
      ballGrounded: ball.pos.z <= 0,
      ballInControl: this.controlState === 'under_control' || this.controlState === 'loose_nearby',
    });

    this.updateLocomotion(dt, intent);
    this.updateBallInteraction(dt, input, intent, ball);
  }

  private updateLocomotion(dt: number, intent: ReturnType<typeof parseIntent>) {
    const cfg = SimulationConfig;
    const targetSpeed = intent.urgency >= 1 ? cfg.PLAYER_SPRINT_SPEED : cfg.PLAYER_MAX_SPEED;
    const moveDirection = intent.moveDir.clone();

    if (moveDirection.magSq() < 0.01) {
      const speed = this.vel.mag();
      if (speed > 0) {
        const drop = Math.min(speed, cfg.PLAYER_DECEL * dt);
        this.vel.normalize().mul(speed - drop);
      }
    } else {
      this.vel.add(moveDirection.normalize().mul(cfg.PLAYER_ACCEL * dt));
      if (this.vel.magSq() > targetSpeed * targetSpeed) this.vel.normalize().mul(targetSpeed);

      const speedRatio = Math.min(this.vel.mag() / cfg.PLAYER_SPRINT_SPEED, 1);
      const turnSpeed = cfg.PLAYER_TURN_SPEED_WALK
        + (cfg.PLAYER_TURN_SPEED_SPRINT - cfg.PLAYER_TURN_SPEED_WALK) * speedRatio;
      const effectiveTurnSpeed = intent.isShielding ? turnSpeed * 0.5 : turnSpeed;
      const targetFacing = intent.faceDir.clone();
      this.facing.x += (targetFacing.x - this.facing.x) * effectiveTurnSpeed * dt;
      this.facing.y += (targetFacing.y - this.facing.y) * effectiveTurnSpeed * dt;
      this.facing.normalize();
    }

    this.pos.add(this.vel.clone().mul(dt));
  }

  private updateBallInteraction(
    dt: number,
    input: ControllerFrame,
    intent: ReturnType<typeof parseIntent>,
    ball: Ball,
  ) {
    const cfg = SimulationConfig;
    const distanceToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const controlRadius = cfg.PLAYER_CONTROL_RADIUS;

    if (intent.isShielding && distanceToBall < controlRadius) {
      this.controlState = 'shielding';
    } else if (distanceToBall < controlRadius && ball.pos.z < 1) {
      this.controlState = 'under_control';
    } else if (distanceToBall < controlRadius * 2) {
      this.controlState = 'loose_nearby';
    } else {
      this.controlState = 'free';
    }

    const shootHeld = input.shootHeld || input.shootPressed;
    const passHeld = input.passHeld || input.passPressed;
    const throughHeld = input.throughPassHeld || input.throughPassPressed;
    const shootReleased = input.shootReleased;
    const passReleased = input.passReleased || input.throughPassReleased;

    if (!this.isCharging) {
      if (shootHeld) {
        this.isCharging = true;
        this.chargeType = 'shoot';
        this.chargingThroughPass = false;
        this.chargeStart = 0;
      } else if (passHeld || throughHeld) {
        this.isCharging = true;
        this.chargeType = 'pass';
        this.chargingThroughPass = throughHeld;
        this.chargeStart = 0;
      }
    }

    if (this.isCharging) {
      this.chargeStart = Math.min(cfg.MAX_CHARGE_TIME, this.chargeStart + dt);
    }

    const shouldKick =
      (this.chargeType === 'shoot' && shootReleased)
      || (this.chargeType === 'pass' && passReleased);

    if (shouldKick && this.isCharging) {
      if (this.controlState === 'under_control' || this.controlState === 'loose_nearby') {
        const power = this.chargeType === 'shoot' ? cfg.SHOT_POWER_BASE : cfg.PASS_POWER_BASE;
        const multiplier = Math.max(cfg.MIN_CHARGE_FRACTION, this.chargeStart / cfg.MAX_CHARGE_TIME);
        const lift = this.chargeType === 'shoot'
          ? 3 * multiplier
          : this.chargingThroughPass ? 2.5 * multiplier : 0.5 * multiplier;
        const direction = this.facing.clone();
        ball.kick(new Vec3(direction.x * power * multiplier, direction.y * power * multiplier, lift));
      }
      this.isCharging = false;
      this.chargingThroughPass = false;
      this.chargeStart = 0;
    }

    if ((this.controlState === 'under_control' || this.controlState === 'shielding') && !this.isCharging) {
      this.touchTimer += dt;
      const speedRatio = Math.min(this.vel.mag() / cfg.PLAYER_SPRINT_SPEED, 1);
      const cadenceInterval = cfg.TOUCH_CADENCE_MAX_INTERVAL
        - (cfg.TOUCH_CADENCE_MAX_INTERVAL - cfg.TOUCH_CADENCE_MIN_INTERVAL) * speedRatio;
      const touch = intent.desiredTouch;
      const tetherPosition = this.idealBallPosition(touch);
      const toTether = new Vec2(tetherPosition.x - ball.pos.x, tetherPosition.y - ball.pos.y);
      const tetherDistance = toTether.mag();

      if (tetherDistance > 0.02) {
        toTether.normalize();
        const tetherForce = tetherDistance * cfg.TOUCH_TETHER_GAIN;
        ball.vel.x += (this.vel.x + toTether.x * tetherForce - ball.vel.x) * 8 * dt;
        ball.vel.y += (this.vel.y + toTether.y * tetherForce - ball.vel.y) * 8 * dt;
      }

      if (this.touchTimer >= cadenceInterval) {
        this.touchTimer = 0;
        this.applyDiscreteTouch(touch, ball, cfg);
      }
    } else {
      this.touchTimer = 0;
    }

    if (this.controlState === 'shielding') {
      const shieldOffset = this.facing.clone().mul(-0.5);
      ball.vel.x += (this.pos.x + shieldOffset.x - ball.pos.x) * 20 * dt;
      ball.vel.y += (this.pos.y + shieldOffset.y - ball.pos.y) * 20 * dt;
    }
  }

  private idealBallPosition(touch: string) {
    const distance = SimulationConfig.TOUCH_IDEAL_DIST;
    if (touch === 'knock_on') return this.pos.clone().add(this.facing.clone().mul(distance * 3.5));
    if (touch === 'cushion') return this.pos.clone().add(this.facing.clone().mul(distance * 0.5));
    if (touch === 'shield') return this.pos.clone().add(this.facing.clone().mul(-distance));
    return this.pos.clone().add(this.facing.clone().mul(distance));
  }

  private applyDiscreteTouch(touch: string, ball: Ball, cfg: typeof SimulationConfig) {
    const idealPosition = this.idealBallPosition(touch);
    const toIdeal = new Vec2(idealPosition.x - ball.pos.x, idealPosition.y - ball.pos.y);
    const distance = toIdeal.mag();
    if (distance < 0.01) return;

    toIdeal.normalize();
    const force = Math.min(distance * 15, cfg.TOUCH_FORCE_MAX);
    ball.vel.x = this.vel.x + toIdeal.x * force;
    ball.vel.y = this.vel.y + toIdeal.y * force;

    if (touch === 'knock_on') {
      ball.vel.x *= 1.1;
      ball.vel.y *= 1.1;
    }
  }
}
