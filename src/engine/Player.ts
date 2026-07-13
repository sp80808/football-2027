import { Vec2, Vec3 } from './Math';
import { ControllerFrame, BallAction, PassModifier, ShotModifier } from './Intent';
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
  | 'shooting_preparation'
  | 'jumping'
  | 'heading';

export class Player {
  pos = new Vec2(0, 0);
  vel = new Vec2(0, 0);
  facing = new Vec2(1, 0);
  controlState: BallControlState = 'free';
  chargeStart = 0;
  isCharging = false;
  chargeType: 'pass' | 'shoot' = 'pass';
  activePassModifier: PassModifier = 'none';
  activeShotModifier: ShotModifier = 'none';
  skillBurstTimer = 0;
  private touchTimer = 0;
  
  // Enhanced locomotion properties
  private angularVelocity = 0; // radians per second
  private angularDrag = 0.1;
  private facingTarget = new Vec2(1, 0);
  private speedBuffer = 0; // for acceleration/deceleration smoothing
  
  // Stamina/fatigue system
  stamina = 100; // 0-100%
  maxStamina = 100;
  staminaDrainRate = 0.1; // per second at max effort
  staminaRegenRate = 0.05; // per second when resting
  
  // Physical attributes for enhanced interactions
  strength = 10; // 1-20 scale
  aggression = 10; // 1-20 scale
  jumping = 10; // 1-20 scale
  heading = 10; // 1-20 scale
  
  // First touch and ball control
  firstTouchQuality = 0; // 0-1, based on attributes and situation
  private trapTimer = 0;
  
  // Collision
  private isColliding = false;
  private collisionRecovery = 0;
  
  // Jumping/heading
  jumpVelocity = 0;
  isJumping = false;
  jumpTimer = 0;
}

  update(dt: number, input: ControllerFrame, ball: Ball) {
    const intent = parseIntent(input, {
      playerSpeed: this.vel.mag(),
      chargeDuration: this.chargeStart,
      isCharging: this.isCharging,
      chargeType: this.chargeType,
      ballGrounded: ball.pos.z <= 0,
      ballInControl: this.controlState === 'under_control' || this.controlState === 'loose_nearby',
    });

    if (this.skillBurstTimer > 0) this.skillBurstTimer -= dt;
    this.applySkillMove(dt, intent.skillMove, ball);

    this.updateLocomotion(dt, intent);
    this.updateBallInteraction(dt, input, intent, ball);
  }

  private applySkillMove(dt: number, skill: string, ball: Ball) {
    const cfg = SimulationConfig;
    if (skill === 'none' || this.skillBurstTimer > 0) return;
    if (this.controlState !== 'under_control' && this.controlState !== 'loose_nearby') return;

    if (skill === 'step_over') {
      const perp = new Vec2(-this.facing.y, this.facing.x);
      this.vel.add(perp.mul(cfg.PLAYER_ACCEL * 2.5 * dt));
      this.skillBurstTimer = 0.18;
    } else if (skill === 'ball_roll') {
      const perp = new Vec2(-this.facing.y, this.facing.x);
      ball.vel.x += perp.x * 4;
      ball.vel.y += perp.y * 4;
      this.skillBurstTimer = 0.22;
    } else if (skill === 'knock_on') {
      const burst = this.facing.clone().mul(cfg.PLAYER_SPRINT_SPEED * 0.35);
      ball.vel.x += burst.x;
      ball.vel.y += burst.y;
      this.skillBurstTimer = 0.15;
    }
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

    this.activePassModifier = intent.passModifier;
    this.activeShotModifier = intent.shotModifier;

    const kickAction = this.resolveKickAction(input, intent);
    this.updateCharging(dt, input, kickAction);

    if (kickAction && this.isCharging) {
      if (this.controlState === 'under_control' || this.controlState === 'loose_nearby') {
        this.executeKick(ball, kickAction, intent);
      }
      this.isCharging = false;
      this.chargeStart = 0;
      this.activePassModifier = 'none';
      this.activeShotModifier = 'none';
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

  private resolveKickAction(input: ControllerFrame, intent: ReturnType<typeof parseIntent>): BallAction | null {
    if (!this.isCharging) return null;
    if (this.chargeType === 'shoot' && input.shootReleased) return 'shot';
    if (this.chargeType === 'pass' && (input.passReleased || input.throughPassReleased)) {
      return intent.action === 'none' ? 'short_pass' : intent.action;
    }
    return null;
  }

  private updateCharging(dt: number, input: ControllerFrame, releasing: BallAction | null) {
    const cfg = SimulationConfig;
    const shootHeld = input.shootHeld || input.shootPressed;
    const passHeld = input.passHeld || input.passPressed;
    const throughHeld = input.throughPassHeld || input.throughPassPressed;

    if (!this.isCharging && !releasing) {
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

    if (this.isCharging && !releasing) {
      this.chargeStart = Math.min(cfg.MAX_CHARGE_TIME, this.chargeStart + dt);
    }
  }

  private executeKick(ball: Ball, action: BallAction, intent: ReturnType<typeof parseIntent>) {
    const cfg = SimulationConfig;
    const multiplier = Math.max(cfg.MIN_CHARGE_FRACTION, this.chargeStart / cfg.MAX_CHARGE_TIME);
    const direction = this.facing.clone();

    if (action === 'shot' || action === 'first_time') {
      const power = cfg.SHOT_POWER_BASE * multiplier;
      let lift = 3 * multiplier;
      let spin: Vec3 | undefined;

      if (intent.shotModifier === 'finesse') {
        lift = 2.2 * multiplier;
        const curl = new Vec3(-direction.y, direction.x, 0);
        spin = curl.mul(18 * multiplier);
      } else if (intent.shotModifier === 'chip') {
        lift = 7 * multiplier;
      } else if (intent.shotModifier === 'low_driven') {
        lift = 0.35 * multiplier;
      } else if (intent.shotModifier === 'power') {
        lift = 4.5 * multiplier;
      }

      const chipScale = intent.shotModifier === 'chip' ? 0.85 : 1;
      ball.kick(
        new Vec3(direction.x * power * chipScale, direction.y * power * chipScale, lift),
        spin,
      );
      return;
    }

    const passPower = cfg.PASS_POWER_BASE * multiplier;
    let lift = 0.5 * multiplier;
    let leadScale = 1;
    let powerScale = 1;

    if (action === 'through_pass') {
      lift = 1.2 * multiplier;
      leadScale = 1.35;
      direction.add(this.vel.clone().mul(0.08 * multiplier));
      direction.normalize();
    } else if (action === 'lob_pass') {
      lift = 5.5 * multiplier;
      powerScale = 0.9;
    } else if (action === 'driven_pass') {
      lift = 0.15 * multiplier;
      powerScale = 1.35;
    } else if (action === 'long_pass') {
      lift = 4 * multiplier;
      powerScale = 1.15;
    } else {
      powerScale = 0.85 + multiplier * 0.2;
    }

    ball.kick(new Vec3(
      direction.x * passPower * powerScale * leadScale,
      direction.y * passPower * powerScale * leadScale,
      lift,
    ));
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
