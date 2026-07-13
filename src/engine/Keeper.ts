import { Vec2 } from './Math';
import { Ball } from './Ball';
import { SimulationConfig } from './SimulationConfig';

export class Keeper {
  pos: Vec2 = new Vec2(0, 50);
  facing: Vec2 = new Vec2(0, -1);
  
  maxSpeed: number = 5.0;

  update(dt: number, ball: Ball) {
    const goalLineY = SimulationConfig.PITCH_HALF_LENGTH - 0.5;
    const hw = SimulationConfig.GOAL_HALF_WIDTH;
    const targetX = Math.max(-hw, Math.min(hw, ball.pos.x));
    const currentX = this.pos.x;
    
    // Move towards targetX
    if (Math.abs(targetX - currentX) > 0.1) {
      const dir = Math.sign(targetX - currentX);
      this.pos.x += dir * this.maxSpeed * dt;
      
      // Clamp if we overshot
      if ((dir > 0 && this.pos.x > targetX) || (dir < 0 && this.pos.x < targetX)) {
        this.pos.x = targetX;
      }
    }

    // Keep on line
    this.pos.y = goalLineY;

    // Very simple save logic
    const distToBallSq = Math.pow(this.pos.x - ball.pos.x, 2) + Math.pow(this.pos.y - ball.pos.y, 2);
    if (distToBallSq < 1.5 * 1.5 && ball.pos.z < 2.5) {
      ball.vel.x *= -0.3;
      ball.vel.y = -Math.abs(ball.vel.y) * 0.3;
      ball.vel.z *= 0.5;
    }
  }
}
