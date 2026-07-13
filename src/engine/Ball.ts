import { Vec2, Vec3 } from './Math';
import { SimulationConfig } from './SimulationConfig';

export class Ball {
  pos: Vec3 = new Vec3(0, 0, 0); // x, y, z (height)
  vel: Vec3 = new Vec3(0, 0, 0);

  update(dt: number) {
    // Gravity
    if (this.pos.z > 0) {
      this.vel.z -= SimulationConfig.BALL_GRAVITY * dt;
    }

    // Apply velocity
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    // Ground collision
    if (this.pos.z < 0) {
      this.pos.z = 0;
      this.vel.z = -this.vel.z * SimulationConfig.BALL_BOUNCINESS;
      
      // Stop bouncing if very low
      if (Math.abs(this.vel.z) < 0.5) {
        this.vel.z = 0;
      }
    }

    // Ground friction
    if (this.pos.z <= 0) {
      const v2 = new Vec2(this.vel.x, this.vel.y);
      const speed = v2.mag();
      if (speed > 0) {
        // Friction applies rolling resistance
        const drop = speed * (1 - SimulationConfig.BALL_FRICTION) * (dt * 120);
        v2.normalize().mul(Math.max(0, speed - drop));
        this.vel.x = v2.x;
        this.vel.y = v2.y;
      }
    }
  }

  kick(powerVec: Vec3) {
    this.vel.x += powerVec.x / SimulationConfig.BALL_MASS;
    this.vel.y += powerVec.y / SimulationConfig.BALL_MASS;
    this.vel.z += powerVec.z / SimulationConfig.BALL_MASS;
  }
}
