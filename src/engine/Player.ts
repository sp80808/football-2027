import { Vec2, Vec3 } from './Math';
import { ControllerFrame } from './Intent';
import { Ball } from './Ball';
import { SimulationConfig } from './SimulationConfig';

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
  
  update(dt: number, input: ControllerFrame, ball: Ball) {
    this.updateLocomotion(dt, input);
    this.updateBallInteraction(dt, input, ball);
  }

  private updateLocomotion(dt: number, input: ControllerFrame) {
    const targetSpeed = input.sprint > 0.5 ? SimulationConfig.PLAYER_SPRINT_SPEED : SimulationConfig.PLAYER_MAX_SPEED;
    const inputDir = input.leftStick.clone();
    
    // Deceleration if no input
    if (inputDir.magSq() < 0.01) {
      const speed = this.vel.mag();
      if (speed > 0) {
        const drop = Math.min(speed, SimulationConfig.PLAYER_DECEL * dt);
        this.vel.normalize().mul(speed - drop);
      }
    } else {
      // Acceleration
      const acc = inputDir.normalize().mul(SimulationConfig.PLAYER_ACCEL * dt);
      this.vel.add(acc);
      
      const speedSq = this.vel.magSq();
      if (speedSq > targetSpeed * targetSpeed) {
        this.vel.normalize().mul(targetSpeed);
      }

      // Smooth facing update
      let targetFacing = input.rightStick.magSq() > 0.1 ? input.rightStick.clone().normalize() : this.vel.clone().normalize();
      
      this.facing.x += (targetFacing.x - this.facing.x) * SimulationConfig.PLAYER_TURN_SPEED * dt;
      this.facing.y += (targetFacing.y - this.facing.y) * SimulationConfig.PLAYER_TURN_SPEED * dt;
      this.facing.normalize();
    }

    this.pos.add(this.vel.clone().mul(dt));
  }

  private updateBallInteraction(dt: number, input: ControllerFrame, ball: Ball) {
    const distToBall = this.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const controlRadius = SimulationConfig.PLAYER_CONTROL_RADIUS;

    if (distToBall < controlRadius && ball.pos.z < 1.0) {
      this.controlState = 'under_control';
    } else if (distToBall < controlRadius * 2) {
      this.controlState = 'loose_nearby';
    } else {
      this.controlState = 'free';
    }

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
      if (this.chargeStart > SimulationConfig.MAX_CHARGE_TIME) this.chargeStart = SimulationConfig.MAX_CHARGE_TIME;
    }

    if ((input.passReleased || input.shootReleased) && this.isCharging) {
      if (this.controlState === 'under_control' || this.controlState === 'loose_nearby') {
        const power = this.chargeType === 'shoot' ? SimulationConfig.SHOT_POWER_BASE : SimulationConfig.PASS_POWER_BASE;
        const multiplier = Math.max(0.2, this.chargeStart / SimulationConfig.MAX_CHARGE_TIME);
        
        const kickDir = this.facing.clone();
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

    // Soft possession mechanic
    if (this.controlState === 'under_control' && !this.isCharging) {
      const idealDist = 0.4;
      const playerSpeed = this.vel.mag();
      
      // Calculate ideal ball position slightly in front of the player
      const idealPos = this.pos.clone().add(this.facing.clone().mul(idealDist));
      
      // Calculate vector from current ball pos to ideal pos
      const toIdeal = new Vec2(idealPos.x - ball.pos.x, idealPos.y - ball.pos.y);
      const distToIdeal = toIdeal.mag();
      
      if (distToIdeal > 0.05) {
        // Nudge ball towards ideal position
        toIdeal.normalize();
        
        // Touch force scales with distance to ideal pos, but caps out
        const touchForce = Math.min(distToIdeal * 15, 10);
        
        // Add player velocity contribution
        const desiredBallVelX = this.vel.x + toIdeal.x * touchForce;
        const desiredBallVelY = this.vel.y + toIdeal.y * touchForce;

        ball.vel.x += (desiredBallVelX - ball.vel.x) * 10 * dt;
        ball.vel.y += (desiredBallVelY - ball.vel.y) * 10 * dt;
      }
    }
  }
}
