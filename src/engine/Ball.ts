import { Vec2, Vec3 } from './Math';

export class Ball {
  pos: Vec3 = new Vec3(0, 0, 0); // x, y, z (height)
  vel: Vec3 = new Vec3(0, 0, 0);
  radius: number = 0.11; // 11cm size 5 ball
  mass: number = 0.43; // 430g
  
  // Tuning params
  friction: number = 0.98;
  gravity: number = 9.81;
  bounciness: number = 0.6;

  update(dt: number) {
    // Gravity
    if (this.pos.z > 0) {
      this.vel.z -= this.gravity * dt;
    }

    // Apply velocity
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    // Ground collision
    if (this.pos.z < 0) {
      this.pos.z = 0;
      this.vel.z = -this.vel.z * this.bounciness;
      
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
        const drop = speed * (1 - this.friction) * (dt * 120); // normalized to 120hz
        v2.normalize().mul(Math.max(0, speed - drop));
        this.vel.x = v2.x;
        this.vel.y = v2.y;
      }
    }
  }

  kick(powerVec: Vec3) {
    // Add velocity based on impulse
    this.vel.x += powerVec.x / this.mass;
    this.vel.y += powerVec.y / this.mass;
    this.vel.z += powerVec.z / this.mass;
  }
}
