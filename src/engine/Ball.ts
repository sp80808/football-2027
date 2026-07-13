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

      // Horizontal air drag: per-second coefficient, properly dt-scaled.
      const airDragMul = Math.pow(cfg.BALL_AIR_DRAG, dt);
      this.vel.x *= airDragMul;
      this.vel.y *= airDragMul;
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

    // ── Rolling friction (only on the ground, per-second, dt-scaled) ──────
    // BALL_FRICTION is now a per-second multiplier (e.g. 0.965 = lose 3.5%/s).
    if (this.pos.z <= 0) {
      const frictionMul = Math.pow(cfg.BALL_FRICTION, dt);
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
