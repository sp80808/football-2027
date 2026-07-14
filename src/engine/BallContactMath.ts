import { Vec2, Vec3 } from './Math';

const EPSILON = 1e-8;

export interface BallGroundContactInput {
  mass: number;
  radius: number;
  linearTangentialVelocity: Vec2;
  angularVelocity: Vec3;
  normalImpulse: number;
  friction: number;
  rollingTolerance?: number;
}

export interface BallGroundContactResult {
  contactVelocity: Vec2;
  impulse: Vec2;
  impulseMagnitude: number;
  unconstrainedImpulseMagnitude: number;
  frictionLimit: number;
  regime: 'rolling' | 'gripping' | 'sliding';
}

/** Moment of inertia for a uniform solid sphere: I = 2/5 m r^2. */
export function solidSphereInertia(mass: number, radius: number): number {
  if (mass <= 0 || radius <= 0) return 0;
  return 0.4 * mass * radius * radius;
}

/**
 * Horizontal velocity of the point on the ball touching the ground.
 * For contact offset r = (0, 0, -R), omega x r contributes
 * (-omegaY R, omegaX R) in the pitch plane.
 */
export function groundContactVelocity(
  linearTangentialVelocity: Vec2,
  angularVelocity: Vec3,
  radius: number,
): Vec2 {
  return new Vec2(
    linearTangentialVelocity.x - angularVelocity.y * radius,
    linearTangentialVelocity.y + angularVelocity.x * radius,
  );
}

/**
 * Solves the tangential impulse needed to oppose slip at a ball-ground contact.
 *
 * Effective inverse mass at contact is 1/m + r^2/I. For a solid sphere this
 * becomes 7/(2m), so the unconstrained slip-removal impulse is -(2m/7) vContact.
 * The final impulse is clamped by Coulomb friction: |jt| <= mu |jn|.
 */
export function solveBallGroundTangentialImpulse(
  input: BallGroundContactInput,
): BallGroundContactResult {
  const mass = Math.max(0, input.mass);
  const radius = Math.max(0, input.radius);
  const contactVelocity = groundContactVelocity(
    input.linearTangentialVelocity,
    input.angularVelocity,
    radius,
  );
  const slipSpeed = contactVelocity.mag();
  const rollingTolerance = Math.max(0, input.rollingTolerance ?? 0.05);
  const frictionLimit = Math.max(0, input.friction) * Math.max(0, input.normalImpulse);

  if (mass <= EPSILON || radius <= EPSILON || slipSpeed <= rollingTolerance) {
    return {
      contactVelocity,
      impulse: new Vec2(0, 0),
      impulseMagnitude: 0,
      unconstrainedImpulseMagnitude: 0,
      frictionLimit,
      regime: 'rolling',
    };
  }

  const inertia = solidSphereInertia(mass, radius);
  const effectiveInverseMass = 1 / mass + (radius * radius) / inertia;
  const unconstrainedImpulseMagnitude = slipSpeed / effectiveInverseMass;
  const impulseMagnitude = Math.min(unconstrainedImpulseMagnitude, frictionLimit);
  const impulse = contactVelocity.clone().normalize().mul(-impulseMagnitude);
  const regime = impulseMagnitude + EPSILON >= unconstrainedImpulseMagnitude
    ? 'gripping'
    : 'sliding';

  return {
    contactVelocity,
    impulse,
    impulseMagnitude,
    unconstrainedImpulseMagnitude,
    frictionLimit,
    regime,
  };
}
