import { Vec2 } from './Math';
import { Ball } from './Ball';
import { SimulationConfig } from './SimulationConfig';
import { KeeperBrain } from './KeeperBrain';

export class Keeper {
  pos: Vec2    = new Vec2(0, 50);
  facing: Vec2 = new Vec2(0, -1);
  vel: Vec2    = new Vec2(0, 0);

  /** Yuka-based FSM — see KeeperBrain.ts / ADR-004. */
  readonly brain = new KeeperBrain();

  update(dt: number, ball: Ball) {
    const cfg         = SimulationConfig;
    const goalLineY   = cfg.PITCH_HALF_LENGTH - 0.5;
    const hw          = cfg.GOAL_HALF_WIDTH;

    // ── 1. Run FSM to determine desired action ──────────────────────────
    this.brain.update(dt, ball.pos, ball.vel, this.pos.x);
    const action = this.brain.action;

    // ── 2. Lateral movement toward targetX ──────────────────────────────
    const clampedTarget = Math.max(-hw, Math.min(hw, action.targetX));
    const dx  = clampedTarget - this.pos.x;
    const dir = Math.sign(dx);

    if (Math.abs(dx) > 0.05) {
      const step = dir * action.speed * dt;
      // Don't overshoot
      this.pos.x += Math.abs(step) > Math.abs(dx) ? dx : step;
    }

    // Clamp to goal line width
    this.pos.x = Math.max(-hw, Math.min(hw, this.pos.x));

    // ── 3. Stay on goal line (Y is fixed) ───────────────────────────────
    this.pos.y = goalLineY;

    // ── 4. Face toward ball ──────────────────────────────────────────────
    const toBallX = ball.pos.x - this.pos.x;
    const toBallY = ball.pos.y - this.pos.y;
    const len     = Math.sqrt(toBallX * toBallX + toBallY * toBallY);
    if (len > 0.1) {
      this.facing.x += ((toBallX / len) - this.facing.x) * 10 * dt;
      this.facing.y += ((toBallY / len) - this.facing.y) * 10 * dt;
      const fl = Math.sqrt(this.facing.x ** 2 + this.facing.y ** 2);
      if (fl > 0) { this.facing.x /= fl; this.facing.y /= fl; }
    }

    // ── 5. Save / deflection ─────────────────────────────────────────────
    const distSq = (this.pos.x - ball.pos.x) ** 2 + (this.pos.y - ball.pos.y) ** 2;
    const saveR  = cfg.KEEPER_SAVE_RADIUS;

    if (distSq < saveR * saveR && ball.pos.z < 2.5) {
      if (action.isDiving) {
        // Committed dive — aggressive deflection in dive direction
        ball.vel.x = action.diveDir * Math.abs(ball.vel.x + ball.vel.y) * 0.4;
        ball.vel.y = -Math.abs(ball.vel.y) * 0.5;
        ball.vel.z *= 0.4;
      } else {
        // Standard parry — push ball back toward pitch centre
        ball.vel.x *= -0.3;
        ball.vel.y  = -Math.abs(ball.vel.y) * 0.4;
        ball.vel.z *= 0.5;
      }
    }
  }
}
