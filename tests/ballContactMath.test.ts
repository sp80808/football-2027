import { describe, expect, it } from 'vitest';
import { Vec2, Vec3 } from '../src/engine/Math';
import {
  groundContactVelocity,
  solidSphereInertia,
  solveBallGroundTangentialImpulse,
} from '../src/engine/BallContactMath';

describe('BallContactMath', () => {
  it('matches the solid-sphere inertia calibration', () => {
    expect(solidSphereInertia(0.43, 0.11)).toBeCloseTo(0.0020812, 7);
  });

  it('includes angular velocity in contact slip', () => {
    const contact = groundContactVelocity(
      new Vec2(6, 0),
      new Vec3(0, 20, 0),
      0.11,
    );

    expect(contact.x).toBeCloseTo(3.8, 8);
    expect(contact.y).toBeCloseTo(0, 8);
  });

  it('uses the two-mass-over-seven slip-removal impulse for a solid sphere', () => {
    const result = solveBallGroundTangentialImpulse({
      mass: 0.43,
      radius: 0.11,
      linearTangentialVelocity: new Vec2(3.5, 0),
      angularVelocity: new Vec3(0, 0, 0),
      normalImpulse: 10,
      friction: 1,
    });

    expect(result.unconstrainedImpulseMagnitude).toBeCloseTo((2 * 0.43 / 7) * 3.5, 8);
    expect(result.impulseMagnitude).toBeCloseTo(result.unconstrainedImpulseMagnitude, 8);
    expect(result.regime).toBe('gripping');
    expect(result.impulse.x).toBeLessThan(0);
  });

  it('clamps tangential impulse by Coulomb friction and remains sliding', () => {
    const result = solveBallGroundTangentialImpulse({
      mass: 0.43,
      radius: 0.11,
      linearTangentialVelocity: new Vec2(20, 0),
      angularVelocity: new Vec3(0, 0, 0),
      normalImpulse: 3.53,
      friction: 0.55,
    });

    expect(result.frictionLimit).toBeCloseTo(1.9415, 4);
    expect(result.impulseMagnitude).toBeCloseTo(result.frictionLimit, 8);
    expect(result.regime).toBe('sliding');
  });

  it('reports rolling when contact slip is below tolerance', () => {
    const result = solveBallGroundTangentialImpulse({
      mass: 0.43,
      radius: 0.11,
      linearTangentialVelocity: new Vec2(2.2, 0),
      angularVelocity: new Vec3(0, 20, 0),
      normalImpulse: 2,
      friction: 0.5,
      rollingTolerance: 0.01,
    });

    expect(result.contactVelocity.mag()).toBeCloseTo(0, 8);
    expect(result.impulseMagnitude).toBe(0);
    expect(result.regime).toBe('rolling');
  });
});
