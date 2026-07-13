import { Vec2, Vec3 } from './Math';
import { ControllerFrame } from './InputSystem';
import { Ball } from './Ball';

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
  
  // Actions
  chargeStart: number = 0; // timestamp or frame counter
  isCharging: boolean = false;
  chargeType: 'pass' | 'shoot' = 'pass';

  // Tuning
  maxSpeed: number = 7.0; // m/s (approx 25 km/h)
  sprintSpeed: number = 9.0; // m/s (approx 32 km/h)
  accel: number = 15.0; // m/s^2
  decel: number = 25.0; // m/s^2
  turnSpeed: number = 10.0; // radians per second
  
  controlRadius: number = 0.5; // distance at which ball is "controllable"
  
  update(dt: number, input: ControllerFrame, ball: Ball) {
    this.updateLocomotion(dt, input);
    this.updateBallInteraction(dt, input, ball);
  }

  private updateLocomotion(dt: number, input: ControllerFrame) {
    const targetSpeed = input.sprint > 0.5 ? this.sprintSpeed : this.maxSpeed;
    const inputDir = input.leftStick.clone();
    
    // Deceleration if no input
    if (inputDir.magSq() < 0.01) {
      const speed = this.vel.mag();
      if (speed > 0) {
        const drop = Math.min(speed, this.decel * dt);
        this.vel.normalize().mul(speed - drop);
      }
    } else {
      // Acceleration
      const acc = inputDir.normalize().mul(this.accel * dt);
      this.vel.add(acc);
      
      // Clamp speed
      const speedSq = this.vel.magSq();
      if (speedSq > targetSpeed * targetSpeed) {
        this.vel.normalize().mul(targetSpeed);
      }

      // Update facing smoothly
      // Right stick can override facing, otherwise follow velocity
      let targetFacing = input.rightStick.magSq() > 0.1 ? input.rightStick.clone().normalize() : this.vel.clone().normalize();
      
      // Slerp or simple interpolation for facing
      this.facing.x += (targetFacing.x - this.facing.x) * this.turnSpeed * dt;
      this.facing.y += (targetFacing.y - this.facing.y) * this.turnSpeed * dt;
      this.facing.normalize();
    }

    // Apply velocity
    this.pos.add(this.vel.clone().mul(dt));
  }

  private updateBallInteraction(dt: number, input: ControllerFrame, ball: Ball) {
    const distToBall = Math.sqrt(
      Math.pow(ball.pos.x - this.pos.x, 2) + Math.pow(ball.pos.y - this.pos.y, 2)
    );

    // Assess control state
    if (distToBall < this.controlRadius && ball.pos.z < 1.0) {
      this.controlState = 'under_control';
    } else if (distToBall < this.controlRadius * 2) {
      this.controlState = 'loose_nearby';
    } else {
      this.controlState = 'free';
    }

    // Charge action
    if (input.passPressed) {
      this.isCharging = true;
      this.chargeType = 'pass';
      this.chargeStart = 0;
    } else if (input.shootPressed) {
      this.isCharging = true;
      this.chargeType = 'shoot';
      this.chargeStart = 0;
    }

    if (this.isCharging) {
      this.chargeStart += dt;
      // Cap charge
      if (this.chargeStart > 1.5) this.chargeStart = 1.5;
    }

    // Execute kick if released and ball is controllable
    if ((input.passReleased || input.shootReleased) && this.isCharging) {
      if (this.controlState === 'under_control' || this.controlState === 'loose_nearby') {
        const power = this.chargeType === 'shoot' ? 25 : 12;
        const multiplier = Math.max(0.2, this.chargeStart / 1.0); // 1.0s = full power
        
        // Kick in facing direction
        const kickDir = this.facing.clone();
        
        // Add vertical lift for shots
        const lift = this.chargeType === 'shoot' ? 3.0 * multiplier : 0.5 * multiplier;
        
        ball.kick(new Vec3(
          kickDir.x * power * multiplier,
          kickDir.y * power * multiplier,
          lift
        ));
      }
      this.isCharging = false;
      this.chargeStart = 0;
    }

    // Soft possession - touch ball to keep it close
    if (this.controlState === 'under_control' && !this.isCharging) {
      // Very simple soft possession - nudge ball towards desired velocity
      const desiredBallVel = this.vel.clone().mul(1.1); // slightly faster than player
      ball.vel.x += (desiredBallVel.x - ball.vel.x) * 5 * dt;
      ball.vel.y += (desiredBallVel.y - ball.vel.y) * 5 * dt;
      
      // Keep it slightly in front of player
      const idealBallPos = this.pos.clone().add(this.facing.clone().mul(0.3));
      ball.pos.x += (idealBallPos.x - ball.pos.x) * 10 * dt;
      ball.pos.y += (idealBallPos.y - ball.pos.y) * 10 * dt;
    }
  }
}
