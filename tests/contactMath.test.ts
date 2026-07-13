import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import {
  assessTackle,
  criticallyDampedStep,
  reducedMass,
  resolveDiscContact,
} from '../src/engine/ContactMath';

describe('ContactMath', () => {
  it('computes reduced mass symmetrically', () => {
    expect(reducedMass(78, 82)).toBeCloseTo(39.975, 6);
    expect(reducedMass(82, 78)).toBeCloseTo(39.975, 6);
  });

  it('separates overlapping bodies and exchanges normal momentum', () => {
    const a = {
      position: new Vec2(0, 0),
      velocity: new Vec2(4, 1),
      inverseMass: 1 / 80,
      radius: 0.42,
    };
    const b = {
      position: new Vec2(0.7, 0),
      velocity: new Vec2(-2, 0),
      inverseMass: 1 / 80,
      radius: 0.42,
    };

    const beforeMomentumX = 80 * a.velocity.x + 80 * b.velocity.x;
    const result = resolveDiscContact(a, b, {
      restitution: 0.05,
      friction: 0.55,
    });
    const afterMomentumX = 80 * a.velocity.x + 80 * b.velocity.x;

    expect(result.collided).toBe(true);
    expect(result.penetration).toBeGreaterThan(0);
    expect(result.normalImpulse).toBeGreaterThan(0);
    expect(afterMomentumX).toBeCloseTo(beforeMomentumX, 8);
    expect(b.position.x - a.position.x).toBeGreaterThan(0.7);
  });

  it('does not apply an impulse when overlapping bodies are separating', () => {
    const a = {
      position: new Vec2(0, 0),
      velocity: new Vec2(-1, 0),
      inverseMass: 1 / 75,
      radius: 0.42,
    };
    const b = {
      position: new Vec2(0.7, 0),
      velocity: new Vec2(1, 0),
      inverseMass: 1 / 75,
      radius: 0.42,
    };

    const result = resolveDiscContact(a, b, {
      restitution: 0.1,
      friction: 0.5,
    });

    expect(result.collided).toBe(true);
    expect(result.normalImpulse).toBe(0);
    expect(a.velocity.x).toBe(-1);
    expect(b.velocity.x).toBe(1);
  });

  it('classifies higher-energy, off-centre tackles as more severe', () => {
    const common = {
      tacklerMass: 82,
      carrierMass: 78,
      contactNormal: new Vec2(1, 0),
      tacklerFacing: new Vec2(1, 0),
      carrierFacing: new Vec2(0, 1),
      carrierSupportHalfWidth: 0.18,
      carrierCentreOfMassHeight: 1.02,
      carrierBalance: 1,
      ballFirst: false,
    };

    const low = assessTackle({
      ...common,
      relativeVelocity: new Vec2(-1.2, 0),
      contactOffsetFromCarrierCentre: new Vec2(0.05, 0),
    });
    const high = assessTackle({
      ...common,
      relativeVelocity: new Vec2(-5.2, 0),
      contactOffsetFromCarrierCentre: new Vec2(0, 0.35),
    });

    expect(high.normalKineticEnergy).toBeGreaterThan(low.normalKineticEnergy);
    expect(high.angularLeverage).toBeGreaterThan(low.angularLeverage);
    expect(high.severity).toBeGreaterThan(low.severity);
    expect(high.outcome).toBe('fall');
  });

  it('critically damped recovery converges without overshoot', () => {
    let value = 1;
    let velocity = 0;
    let previous = value;

    for (let i = 0; i < 120; i += 1) {
      const next = criticallyDampedStep(value, velocity, 0, 10, 1 / 120);
      value = next.value;
      velocity = next.velocity;
      expect(value).toBeLessThanOrEqual(previous + 1e-10);
      expect(value).toBeGreaterThanOrEqual(-1e-10);
      previous = value;
    }

    expect(value).toBeLessThan(0.001);
  });
});
