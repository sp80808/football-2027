import { Vec2, Vec3 } from './Math';
import { SimulationConfig } from './SimulationConfig';

export class Ball {
  pos: Vec3 = new Vec3(0, 0, 0); // x, y = pitch plane; z = height
  vel: Vec3 = new Vec3(0, 0, 0);

  update(dt: number) {
    const cfg = SimulationConfig;

    // ── Gravity (only when airborne) ────────────────────────────────────
    if (this.pos.z > 0) {
      this.vel.z -= cfg.BALL_GRAVITY * dt;

      // Very light air drag on horizontal velocity when the ball is in flight.
      // Uses a multiplicative approach so it's properly dt-scaled at 120 Hz.
      this.vel.x *= cfg.BALL_AIR_DRAG;
      this.vel.y *= cfg.BALL_AIR_DRAG;
    }

    // ── Integrate position ───────────────────────────────────────────────
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    // ── Ground collision ─────────────────────────────────────────────────
    if (this.pos.z < 0) {
      this.pos.z = 0;
      this.vel.z = -this.vel.z * cfg.BALL_BOUNCINESS;

      // Kill negligible bounces so the ball settles cleanly.
      if (Math.abs(this.vel.z) < cfg.BALL_BOUNCE_DEAD_ZONE) {
        this.vel.z = 0;
      }
    }

    // ── Rolling friction (only on the ground, multiplicative & dt-scaled) ─
    // Multiplier is raised to the power of (dt * SIMULATION_HZ) so the result
    // is identical regardless of whether it's called once at 120 Hz or
    // composed across variable-length steps.
    if (this.pos.z <= 0) {
      const frictionMul = Math.pow(cfg.BALL_FRICTION, dt * cfg.SIMULATION_HZ);
      this.vel.x *= frictionMul;
      this.vel.y *= frictionMul;
    }
  }

  kick(powerVec: Vec3) {
    this.vel.x += powerVec.x / SimulationConfig.BALL_MASS;
    this.vel.y += powerVec.y / SimulationConfig.BALL_MASS;
    this.vel.z += powerVec.z / SimulationConfig.BALL_MASS;
  }

  /** Horizontal speed only (2-D ground plane). */
  groundSpeed(): number {
    return Math.sqrt(this.vel.x * this.vel.x + this.vel.y * this.vel.y);
  }
}
