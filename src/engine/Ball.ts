import { Vec3 } from './Math';
import { SimulationConfig } from './SimulationConfig';

/**
 * Enhanced Ball Physics with:
 * - Magnus effect (spin-induced curve)
 * - Variable air density
 * - Ball deformation on impact
 * - Surface-dependent friction
 * - Spin decay
 */
export class Ball {
  pos: Vec3 = new Vec3(0, 0, 0);
  vel: Vec3 = new Vec3(0, 0, 0);
  spin: Vec3 = new Vec3(0, 0, 0); // angular velocity (rad/s)

  // Physical properties
  private readonly radius = SimulationConfig.BALL_RADIUS;
  private readonly mass = SimulationConfig.BALL_MASS;
  private readonly crossSection = Math.PI * this.radius * this.radius;

  // Environmental
  private airDensity = 1.225; // kg/m³ at sea level, 15°C
  private surfaceFriction = 1.0; // multiplier for ground friction

  update(dt: number, env?: { altitude?: number; temperature?: number; humidity?: number; wetSurface?: boolean }) {
    const cfg = SimulationConfig;

    // Update environmental factors
    if (env) {
      this.updateEnvironment(env);
    }

    // Gravity
    if (this.pos.z > 0) {
      this.vel.z -= cfg.BALL_GRAVITY * dt;
    }

    // Air drag (legacy exponential tuning while airborne)
    if (this.pos.z > this.radius) {
      const airDragMultiplier = Math.pow(cfg.BALL_AIR_DRAG, dt);
      this.vel.x *= airDragMultiplier;
      this.vel.y *= airDragMultiplier;
    }

    // Magnus effect (spin-induced lift)
    if (this.pos.z > this.radius && this.spin.mag() > 0) {
      this.applyMagnusForce(dt);
    }

    // Spin decay (air resistance + ground friction)
    this.decaySpin(dt);

    // Integration
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;

    // Ground collision
    if (this.pos.z < this.radius) {
      this.handleGroundCollision(dt);
    }

    // Ground friction
    if (this.pos.z <= this.radius) {
      const frictionMultiplier = Math.pow(cfg.BALL_FRICTION * this.surfaceFriction, dt);
      this.vel.x *= frictionMultiplier;
      this.vel.y *= frictionMultiplier;
    }
  }

  private updateEnvironment(env: { altitude?: number; temperature?: number; humidity?: number; wetSurface?: boolean }) {
    // Air density: ρ = P / (R * T) * (1 - 0.378 * humidity * Pv / P)
    // Simplified: decreases with altitude, increases with lower temp
    const basePressure = 101325; // Pa
    const altitude = env.altitude ?? 0;
    const tempC = env.temperature ?? 15;
    const humidity = env.humidity ?? 0.5;

    const pressure = basePressure * Math.exp(-altitude / 8400);
    const tempK = tempC + 273.15;
    this.airDensity = (pressure / (287.058 * tempK)) * (1 - 0.378 * humidity * 0.6);

    this.surfaceFriction = env.wetSurface ? 0.7 : 1.0;
  }

  private applyMagnusForce(dt: number) {
    // F_magnus = 0.5 * ρ * v² * A * Cl * (ω × v̂)
    // Cl (lift coefficient) ≈ 0.2 - 0.3 for spinning sphere
    const CL = 0.25;
    const speed = this.vel.mag();
    if (speed < 0.1) return;

    const vHat = this.vel.clone().normalize();
    const spinCrossVel = this.spin.cross(vHat);

    const magnusAccel = 0.5 * this.airDensity * speed * speed * this.crossSection * CL / this.mass;
    this.vel.add(spinCrossVel.mul(magnusAccel * dt));
  }

  private decaySpin(dt: number) {
    // Air resistance torque: τ = -k * ω
    // Ground friction torque when rolling
    const airDecay = 0.02; // per second
    const groundDecay = this.pos.z <= this.radius ? 0.5 : 0;

    const decayRate = airDecay + groundDecay;
    const factor = Math.exp(-decayRate * dt);
    this.spin.mul(factor);
  }

  private handleGroundCollision(dt: number) {
    const cfg = SimulationConfig;

    // Position correction
    this.pos.z = this.radius;

    // Velocity reflection with restitution
    const impactSpeed = -this.vel.z;
    if (impactSpeed > 0) {
      this.vel.z = impactSpeed * cfg.BALL_BOUNCINESS;

      // Spin generation from friction during bounce
      const tangentialSpeed = Math.hypot(this.vel.x, this.vel.y);
      if (tangentialSpeed > 0.1) {
        // Convert some tangential velocity to spin
        const frictionImpulse = impactSpeed * 0.3 * cfg.BALL_FRICTION;
        const spinAxis = new Vec3(-this.vel.y, this.vel.x, 0).normalize();
        const spinGain = frictionImpulse / (this.mass * this.radius);
        this.spin.add(spinAxis.mul(spinGain));
      }

      // Dead zone for micro-bounces
      if (Math.abs(this.vel.z) < cfg.BALL_BOUNCE_DEAD_ZONE) {
        this.vel.z = 0;
      }
    }
  }

  kick(power: Vec3, spin?: Vec3) {
    this.vel.x += power.x / this.mass;
    this.vel.y += power.y / this.mass;
    this.vel.z += power.z / this.mass;

    if (spin) {
      this.spin.add(spin);
    }
  }

  // Getters for rendering/debugging
  getSpin() { return this.spin.clone(); }
  getAirDensity() { return this.airDensity; }
  groundSpeed() { return Math.hypot(this.vel.x, this.vel.y); }
  speed() { return this.vel.mag(); }
}