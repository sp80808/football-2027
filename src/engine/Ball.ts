import { Vec3 } from './Math';
import { SimulationConfig } from './SimulationConfig';

export class Ball {
  pos: Vec3 = new Vec3(0, 0, 0);
  vel: Vec3 = new Vec3(0, 0, 0);

  update(dt: number) {
    const cfg = SimulationConfig;

    if (this.pos.z > 0) {
      this.vel.z -= cfg.BALL_GRAVITY * dt;
      const airDragMultiplier = Math.pow(cfg.BALL_AIR_DRAG, dt);
      this.vel.x *= airDragMultiplier;
      this.vel.y *= airDragMultiplier;
    }

    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    if (this.pos.z < 0) {
      this.pos.z = 0;
      this.vel.z = -this.vel.z * cfg.BALL_BOUNCINESS;
      if (Math.abs(this.vel.z) < cfg.BALL_BOUNCE_DEAD_ZONE) this.vel.z = 0;
    }

    if (this.pos.z <= 0) {
      const frictionMultiplier = Math.pow(cfg.BALL_FRICTION, dt);
      this.vel.x *= frictionMultiplier;
      this.vel.y *= frictionMultiplier;
    }
  }

  kick(power: Vec3) {
    this.vel.x += power.x / SimulationConfig.BALL_MASS;
    this.vel.y += power.y / SimulationConfig.BALL_MASS;
    this.vel.z += power.z / SimulationConfig.BALL_MASS;
  }

  groundSpeed() {
    return Math.hypot(this.vel.x, this.vel.y);
  }
}
