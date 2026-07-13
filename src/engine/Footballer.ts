import { Vec2, Vec3 } from './Math';
import { ControllerFrame, BallAction, PassModifier, ShotModifier } from './Intent';
import { Ball } from './Ball';
import { Opponent } from './Opponent';
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

export type DefensiveState = 'none' | 'tackling' | 'sliding';

export class Footballer {
  id: number;
  team: 'home' | 'away';
  
  pos = new Vec2(0, 0);
  vel = new Vec2(0, 0);
  facing = new Vec2(1, 0);
  controlState: BallControlState = 'free';

  constructor(id: number, team: 'home' | 'away') {
    this.id = id;
    this.team = team;
  }
  chargeStart = 0;
  isCharging = false;
  chargeType: 'pass' | 'shoot' = 'pass';
  activePassModifier: PassModifier = 'none';
  activeShotModifier: ShotModifier = 'none';
  skillBurstTimer = 0;
  private touchTimer = 0;

  /**
   * RPG attribute bindings — derived from the controlled footballer's profile
   * (see career/attributeBindings). Neutral by default; the gameplay loop sets
   * these when a squad profile is bound so PAC/SHO/PAS/DRI/PHY affect physics.
   */
  speedMul = 1;
  accelMul = 1;
  controlMul = 1;
  kickPowerMul = 1;
  
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

  defensiveState: DefensiveState = 'none';
  tackleWonThisTick = false;
  private tackleTimer = 0;
  private tackleCooldown = 0;
  private readonly scratchBallPos = new Vec2();
  private readonly scratchToBall = new Vec2();
  private readonly scratchBallVel = new Vec2();
  private readonly scratchToPlayer = new Vec2();
  private readonly scratchDelta = new Vec2();

  update(dt: number, input: ControllerFrame, ball: Ball, opponent?: Opponent) {
    this.tackleWonThisTick = false;
    if (this.tackleCooldown > 0) this.tackleCooldown -= dt;
    if (this.tackleTimer > 0) this.tackleTimer -= dt;

    const ballReceiving = this.detectBallReceiving(ball);
    const intent = parseIntent(input, {
      playerSpeed: this.vel.mag(),
      chargeDuration: this.chargeStart,
      isCharging: this.isCharging,
      chargeType: this.chargeType,
      ballGrounded: ball.pos.z <= 0,
      ballInControl: this.controlState === 'under_control' || this.controlState === 'loose_nearby',
      ballReceiving,
      incomingBallSpeed: this.scratchBallVel.mag(),
      playerPos: this.pos,
    });

    if (this.defensiveState !== 'none') {
      this.tackleWonThisTick = this.updateDefensive(dt, ball, opponent);
      return;
    }

    if (opponent && (input.tacklePressed || input.slidePressed) && this.tackleCooldown <= 0) {
      this.beginTackle(input.slidePressed);
    }

    if (this.skillBurstTimer > 0) this.skillBurstTimer -= dt;
    this.applySkillMove(dt, intent.skillMove, ball);
    if (intent.isContaining && opponent) { this.scratchToPlayer.set(opponent.pos.x-this.pos.x,opponent.pos.y-this.pos.y); if (this.scratchToPlayer.magSq()>0.01) intent.faceDir.copy(this.scratchToPlayer.normalize()); }
    this.updateLocomotion(dt, intent);
    this.updateBallInteraction(dt, input, intent, ball, opponent);
  }

  private detectBallReceiving(ball: Ball): boolean {
    if (this.controlState === 'under_control' || this.controlState === 'shielding') return false;

    this.scratchBallPos.set(ball.pos.x, ball.pos.y);
    this.scratchToPlayer.set(this.pos.x - ball.pos.x, this.pos.y - ball.pos.y);
    this.scratchBallVel.set(ball.vel.x, ball.vel.y);

    const dist = this.scratchToPlayer.mag();
    const incomingSpeed = this.scratchBallVel.mag();
    if (dist > SimulationConfig.PLAYER_CONTROL_RADIUS * 2.5 || incomingSpeed < 1.2) return false;

    this.scratchToPlayer.normalize();
    this.scratchBallVel.normalize();
    const approaching = this.scratchToPlayer.dot(this.scratchBallVel) > 0.35;
    return approaching && ball.pos.z < 1.2;
  }

  private beginTackle(isSlide: boolean) {
    const cfg = SimulationConfig;
    if (isSlide) {
      this.defensiveState = 'sliding';
      this.tackleTimer = cfg.SLIDE_DURATION;
      this.tackleCooldown = cfg.SLIDE_COOLDOWN;
    } else {
      this.defensiveState = 'tackling';
      this.tackleTimer = cfg.TACKLE_DURATION;
      this.tackleCooldown = cfg.TACKLE_COOLDOWN;
    }
  }

  private updateDefensive(dt: number, ball: Ball, opponent?: Opponent): boolean {
    const cfg = SimulationConfig;
    const isSlide = this.defensiveState === 'sliding';
    const range = isSlide ? cfg.SLIDE_RANGE : cfg.TACKLE_RANGE;
    const speed = isSlide ? cfg.PLAYER_SPRINT_SPEED * 1.35 : cfg.PLAYER_SPRINT_SPEED * 1.15;
    let wonTackle = false;

    this.scratchToBall.set(ball.pos.x - this.pos.x, ball.pos.y - this.pos.y);
    if (this.scratchToBall.magSq() > 0.01) {
      this.scratchToBall.normalize();
      this.vel.x += this.scratchToBall.x * speed * dt;
      this.vel.y += this.scratchToBall.y * speed * dt;
      this.facing.copy(this.scratchToBall);
    }

    const distToBall = this.pos.distanceTo(this.scratchBallPos.set(ball.pos.x, ball.pos.y));
    if (opponent && distToBall < range * (isSlide ? 0.75 : 0.6)) {
      wonTackle = opponent.dispossessByPlayer(ball, this);
    }

    if (this.tackleTimer <= 0) {
      this.defensiveState = 'none';
    } else {
      const moveScale = isSlide ? dt * 0.85 : dt;
      this.scratchDelta.copy(this.vel).mul(moveScale);
      this.pos.add(this.scratchDelta);
    }

    return wonTackle;
  }

  resetDefensive() {
    this.defensiveState = 'none';
    this.tackleWonThisTick = false;
    this.tackleTimer = 0;
    this.tackleCooldown = 0;
  }

  private applySkillMove(dt: number, skill: string, ball: Ball) {
    const cfg = SimulationConfig;
    if (skill === 'none' || this.skillBurstTimer > 0) return;
    if (this.controlState !== 'under_control' && this.controlState !== 'loose_nearby') return;

    if (skill === 'step_over') {
      const perp = new Vec2(-this.facing.y, this.facing.x);
      this.vel.add(perp.mul(cfg.PLAYER_ACCEL * 2.5 * dt));
      this.skillBurstTimer = 0.18;
    } else if (skill === 'ball_roll') { const perp=new Vec2(-this.facing.y,this.facing.x); ball.vel.x+=perp.x*4; ball.vel.y+=perp.y*4; this.skillBurstTimer=0.22;
    } else if (skill==='drag_back'){ball.vel.x-=this.facing.x*3.5;ball.vel.y-=this.facing.y*3.5;this.vel.x-=this.facing.x*cfg.PLAYER_ACCEL*1.8*dt;this.vel.y-=this.facing.y*cfg.PLAYER_ACCEL*1.8*dt;this.skillBurstTimer=0.25;
    } else if (skill==='fake_shot'){this.vel.x+=this.facing.x*cfg.PLAYER_SPRINT_SPEED*cfg.FAKE_SHOT_BURST_MULT*0.12;this.vel.y+=this.facing.y*cfg.PLAYER_SPRINT_SPEED*cfg.FAKE_SHOT_BURST_MULT*0.12;this.skillBurstTimer=0.14;
    } else if (skill === 'knock_on') {
      const burst = this.facing.clone().mul(cfg.PLAYER_SPRINT_SPEED * 0.35);
      ball.vel.x += burst.x;
      ball.vel.y += burst.y;
      this.skillBurstTimer = 0.15;
    }
  }

  private updateLocomotion(dt: number, intent: ReturnType<typeof parseIntent>) {
    const cfg = SimulationConfig;
    
    if (intent.urgency >= 1 && this.vel.mag() > cfg.PLAYER_MAX_SPEED) {
      this.stamina = Math.max(0, this.stamina - this.staminaDrainRate * 100 * dt);
    } else {
      this.stamina = Math.min(this.maxStamina, this.stamina + this.staminaRegenRate * 100 * dt);
    }
    
    const staminaPenalty = this.stamina < 10 ? 0.75 : 1.0;
    const targetSpeed = (intent.isContaining ? cfg.PLAYER_MAX_SPEED*cfg.CONTAIN_SPEED_MULT : intent.urgency>=1 ? cfg.PLAYER_SPRINT_SPEED : cfg.PLAYER_MAX_SPEED) * this.speedMul * staminaPenalty;
    const moveDirection = intent.moveDir.clone();

    if (moveDirection.magSq() < 0.01) {
      const speed = this.vel.mag();
      if (speed > 0) {
        const drop = Math.min(speed, cfg.PLAYER_DECEL * dt);
        this.vel.normalize().mul(speed - drop);
      }
    } else {
      this.vel.add(moveDirection.normalize().mul(cfg.PLAYER_ACCEL * this.accelMul * dt));
      if (this.vel.magSq() > targetSpeed * targetSpeed) this.vel.normalize().mul(targetSpeed);

      const speedRatio = Math.min(this.vel.mag() / cfg.PLAYER_SPRINT_SPEED, 1);
      const turnSpeed = cfg.PLAYER_TURN_SPEED_WALK
        + (cfg.PLAYER_TURN_SPEED_SPRINT - cfg.PLAYER_TURN_SPEED_WALK) * speedRatio;
      const effectiveTurnSpeed = intent.isShielding ? turnSpeed*0.5 : intent.isContaining ? turnSpeed*cfg.CONTAIN_TURN_MULT : turnSpeed;
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
    opponent?: Opponent,
  ) {
    const cfg = SimulationConfig;
    const distanceToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const controlRadius = cfg.PLAYER_CONTROL_RADIUS * this.controlMul;

    if (intent.isShielding && distanceToBall < controlRadius) {
      this.controlState = 'shielding';
    } else if (this.detectBallReceiving(ball) && distanceToBall < controlRadius * 2) {
      this.controlState = 'receiving';
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
    const isFakeShot=intent.skillMove==='fake_shot';
    this.updateCharging(dt,input,isFakeShot?null:kickAction);

    const canFirstTime =
      kickAction === 'first_time' &&
      (this.controlState === 'receiving' || this.controlState === 'loose_nearby');

    if (isFakeShot&&this.isCharging){this.applySkillMove(dt,'fake_shot',ball);this.isCharging=false;this.chargeStart=0;this.activeShotModifier='none';}
    else if (canFirstTime && this.isCharging) {
      this.executeKick(ball, kickAction, intent, opponent);
      this.isCharging = false;
      this.chargeStart = 0;
      this.activePassModifier = 'none';
      this.activeShotModifier = 'none';
      this.controlState = 'free';
    } else if (kickAction && this.isCharging && !isFakeShot) {
      if (this.controlState === 'under_control' || this.controlState === 'loose_nearby') {
        this.executeKick(ball, kickAction, intent, opponent);
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
    } else if (this.controlState === 'receiving' && !this.isCharging) {
      this.applyReceiveTouch(intent.desiredTouch, ball, cfg);
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
    if (intent.action === 'first_time') return 'first_time';
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

  private executeKick(ball: Ball, action: BallAction, intent: ReturnType<typeof parseIntent>, opponent?: Opponent) {
    const cfg = SimulationConfig;
    const multiplier = Math.max(cfg.MIN_CHARGE_FRACTION, this.chargeStart / cfg.MAX_CHARGE_TIME);
    const direction = this.facing.clone();

    if (action === 'shot' || action === 'first_time') {
      const powerScale = action === 'first_time' ? 0.75 : 1;
      const power = cfg.SHOT_POWER_BASE * multiplier * powerScale * this.kickPowerMul;
      let lift = (action === 'first_time' ? 1.6 : 3) * multiplier;
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

      const speedRatio = this.vel.mag() / cfg.PLAYER_SPRINT_SPEED;
      const overcharge = Math.max(0, multiplier - 0.85) * 2.5;
      const errorSpread = (speedRatio * 0.1 + overcharge * 0.15);
      if (errorSpread > 0.01) {
        const angle = Math.sin(this.pos.x * 13.37 + this.pos.y * 42.0) * errorSpread;
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const nx = direction.x * cos - direction.y * sin;
        const ny = direction.x * sin + direction.y * cos;
        direction.set(nx, ny);
      }

      const chipScale = intent.shotModifier === 'chip' ? 0.85 : 1;
      ball.kick(
        new Vec3(direction.x * power * chipScale, direction.y * power * chipScale, lift),
        spin,
      );
      return;
    }

    const passPower = cfg.PASS_POWER_BASE * multiplier * this.kickPowerMul;
    let lift = 0.5 * multiplier;
    let leadScale = 1;
    let powerScale = 1;

    if (action === 'through_pass') { lift=1.2*multiplier; leadScale=1.35;
      if (opponent) { const la=cfg.THROUGH_LEAD_BASE+multiplier*cfg.THROUGH_LEAD_CHARGE_SCALE; const tgY=cfg.PITCH_HALF_LENGTH-opponent.pos.y,tgX=-opponent.pos.x,tl=Math.hypot(tgX,tgY);
        if (tl>0.01){direction.set(opponent.pos.x+(tgX/tl)*la-this.pos.x,opponent.pos.y+(tgY/tl)*la-this.pos.y); if(direction.magSq()>0.01)direction.normalize();}}
      else {direction.add(this.vel.clone().mul(0.08*multiplier));direction.normalize();} powerScale=1.05; } else if (action === 'lob_pass') {
      lift = 5.5 * multiplier;
      powerScale = 0.9;
    } else if (action === 'driven_pass') {
      lift = 0.15 * multiplier;
      powerScale = 1.35;
    } else if (action === 'long_pass') {
      lift = 4 * multiplier;
      powerScale = 1.15;
    } else if (action === 'cross') {
      lift = 6.0 * multiplier;
      powerScale = 1.15;
      const targetY = this.pos.y > 0 ? cfg.PITCH_HALF_LENGTH - 11 : -(cfg.PITCH_HALF_LENGTH - 11);
      direction.set(0 - this.pos.x, targetY - this.pos.y);
      if (direction.magSq() > 0.01) direction.normalize();
    } else {
      powerScale = 0.85 + multiplier * 0.2;
    }

    const speedRatio = this.vel.mag() / cfg.PLAYER_SPRINT_SPEED;
    const overcharge = Math.max(0, multiplier - 0.9) * 2.0;
    const errorSpread = (speedRatio * 0.08 + overcharge * 0.12);
    if (errorSpread > 0.01) {
      const angle = Math.sin(this.pos.x * 13.37 + this.pos.y * 42.0) * errorSpread;
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      const nx = direction.x * cos - direction.y * sin;
      const ny = direction.x * sin + direction.y * cos;
      direction.set(nx, ny);
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

  private applyReceiveTouch(touch: string, ball: Ball, cfg: typeof SimulationConfig) {
    const incoming = this.scratchBallVel.set(ball.vel.x, ball.vel.y).mag();
    const idealPosition = this.idealBallPosition(touch);
    const toIdeal = new Vec2(idealPosition.x - ball.pos.x, idealPosition.y - ball.pos.y);
    if (toIdeal.magSq() < 0.01) return;

    toIdeal.normalize();
    if (touch === 'cushion') {
      const damp = Math.max(0.15, 1 - incoming / 14);
      ball.vel.x = this.vel.x + toIdeal.x * cfg.TOUCH_FORCE_MAX * 0.35 * damp;
      ball.vel.y = this.vel.y + toIdeal.y * cfg.TOUCH_FORCE_MAX * 0.35 * damp;
    } else if (touch === 'knock_on') {
      ball.vel.x = this.vel.x + this.facing.x * cfg.TOUCH_FORCE_MAX * 1.1;
      ball.vel.y = this.vel.y + this.facing.y * cfg.TOUCH_FORCE_MAX * 1.1;
    } else {
      const force = Math.min(incoming * 0.45, cfg.TOUCH_FORCE_MAX * 0.7);
      ball.vel.x = this.vel.x + toIdeal.x * force;
      ball.vel.y = this.vel.y + toIdeal.y * force;
    }
    this.controlState = 'under_control';
  }
}
