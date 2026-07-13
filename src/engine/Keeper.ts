import { Vec2 } from './Math';
import { Ball } from './Ball';

export class Keeper {
  pos: Vec2 = new Vec2(0, 50); // Defending top goal (y = 52.5)
  facing: Vec2 = new Vec2(0, -1); // Facing down the pitch
  
  // Tuning
  maxSpeed: number = 5.0; // m/s
  goalLineY: number = 52.0;

  update(dt: number, ball: Ball) {
    // Simple AI: follow ball X coordinate, stay on goal line
    const targetX = Math.max(-3.66, Math.min(3.66, ball.pos.x));
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
    this.pos.y = this.goalLineY;

    // Very simple save logic: if ball is close, stop it
    const distToBallSq = Math.pow(this.pos.x - ball.pos.x, 2) + Math.pow(this.pos.y - ball.pos.y, 2);
    if (distToBallSq < 1.5 * 1.5 && ball.pos.z < 2.5) { // Can reach it
      // Deflect ball
      ball.vel.x *= -0.3;
      ball.vel.y = -Math.abs(ball.vel.y) * 0.3; // bounce back
      ball.vel.z *= 0.5;
    }
  }
}
