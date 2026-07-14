import { Vec2 } from './Math';

export interface DiscBody2D {
  position: Vec2;
  velocity: Vec2;
  inverseMass: number;
  radius: number;
}

export interface ContactMaterial {
  restitution: number;
  friction: number;
  penetrationSlop?: number;
  correctionPercent?: number;
}

export interface ContactResolution {
  collided: boolean;
  normal: Vec2;
  penetration: number;
  normalImpulse: number;
  frictionImpulse: number;
  relativeNormalSpeed: number;
}

export interface TackleAssessmentInput {
  tacklerMass: number;
  carrierMass: number;
  relativeVelocity: Vec2;
  contactNormal: Vec2;
  tacklerFacing: Vec2;
  carrierFacing: Vec2;
  contactOffsetFromCarrierCentre: Vec2;
  carrierSupportHalfWidth: number;
  carrierCentreOfMassHeight: number;
  carrierBalance: number;
  ballFirst: boolean;
}

export interface TackleAssessment {
  closingSpeed: number;
  reducedMass: number;
  normalKineticEnergy: number;
  angularLeverage: number;
  balanceDemand: number;
  severity: number;
  outcome: 'glance' | 'stagger' | 'fall';
}

const EPSILON = 1e-8;

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function reducedMass(massA: number, massB: number): number {
  if (massA <= 0 || massB <= 0) return 0;
  return 1 / (1 / massA + 1 / massB);
}

/**
 * Deterministic sequential-impulse contact for two circular player bodies.
 *
 * The normal impulse follows j = -(1 + e) v_n / (mA^-1 + mB^-1).
 * Tangential impulse is clamped by Coulomb friction: |j_t| <= mu |j_n|.
 * A small positional correction prevents persistent overlap without injecting
 * large amounts of kinetic energy into the authoritative simulation.
 */
export function resolveDiscContact(
  bodyA: DiscBody2D,
  bodyB: DiscBody2D,
  material: ContactMaterial,
): ContactResolution {
  const delta = bodyB.position.clone().sub(bodyA.position);
  const minDistance = bodyA.radius + bodyB.radius;
  const distanceSq = delta.magSq();

  if (distanceSq >= minDistance * minDistance) {
    return {
      collided: false,
      normal: new Vec2(1, 0),
      penetration: 0,
      normalImpulse: 0,
      frictionImpulse: 0,
      relativeNormalSpeed: 0,
    };
  }

  const distance = Math.sqrt(Math.max(distanceSq, EPSILON));
  const normal = distanceSq > EPSILON ? delta.div(distance) : new Vec2(1, 0);
  const penetration = minDistance - distance;
  const inverseMassSum = bodyA.inverseMass + bodyB.inverseMass;

  if (inverseMassSum <= EPSILON) {
    return {
      collided: true,
      normal,
      penetration,
      normalImpulse: 0,
      frictionImpulse: 0,
      relativeNormalSpeed: 0,
    };
  }

  const relativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
  const relativeNormalSpeed = relativeVelocity.dot(normal);
  let normalImpulse = 0;
  let frictionImpulse = 0;

  if (relativeNormalSpeed < 0) {
    const restitution = clamp(material.restitution, 0, 1);
    normalImpulse = -(1 + restitution) * relativeNormalSpeed / inverseMassSum;
    const normalImpulseVector = normal.clone().mul(normalImpulse);

    bodyA.velocity.sub(normalImpulseVector.clone().mul(bodyA.inverseMass));
    bodyB.velocity.add(normalImpulseVector.clone().mul(bodyB.inverseMass));

    const postNormalRelativeVelocity = bodyB.velocity.clone().sub(bodyA.velocity);
    const tangent = postNormalRelativeVelocity
      .clone()
      .sub(normal.clone().mul(postNormalRelativeVelocity.dot(normal)));

    if (tangent.magSq() > EPSILON) {
      tangent.normalize();
      const unconstrainedFrictionImpulse = -postNormalRelativeVelocity.dot(tangent) / inverseMassSum;
      const maxFrictionImpulse = Math.max(0, material.friction) * normalImpulse;
      frictionImpulse = clamp(
        unconstrainedFrictionImpulse,
        -maxFrictionImpulse,
        maxFrictionImpulse,
      );
      const frictionVector = tangent.mul(frictionImpulse);
      bodyA.velocity.sub(frictionVector.clone().mul(bodyA.inverseMass));
      bodyB.velocity.add(frictionVector.clone().mul(bodyB.inverseMass));
    }
  }

  const slop = material.penetrationSlop ?? 0.01;
  const correctionPercent = clamp(material.correctionPercent ?? 0.65, 0, 1);
  const correctionMagnitude = Math.max(penetration - slop, 0) * correctionPercent / inverseMassSum;
  const correction = normal.clone().mul(correctionMagnitude);
  bodyA.position.sub(correction.clone().mul(bodyA.inverseMass));
  bodyB.position.add(correction.clone().mul(bodyB.inverseMass));

  return {
    collided: true,
    normal,
    penetration,
    normalImpulse,
    frictionImpulse,
    relativeNormalSpeed,
  };
}

/**
 * Converts collision geometry into a gameplay-facing tackle classification.
 * It deliberately uses continuous physical quantities and deterministic
 * thresholds rather than random success rolls.
 */
export function assessTackle(input: TackleAssessmentInput): TackleAssessment {
  const normal = input.contactNormal.clone().normalize();
  const relativeVelocity = input.relativeVelocity.clone();
  const closingSpeed = Math.max(0, -relativeVelocity.dot(normal));
  const mass = reducedMass(input.tacklerMass, input.carrierMass);
  const normalKineticEnergy = 0.5 * mass * closingSpeed * closingSpeed;

  const offset = input.contactOffsetFromCarrierCentre;
  const planarTorqueArm = Math.abs(offset.x * normal.y - offset.y * normal.x);
  const angularLeverage = planarTorqueArm / Math.max(input.carrierSupportHalfWidth, 0.05);

  const facingAlignment = clamp(
    (input.tacklerFacing.clone().normalize().dot(normal) + 1) * 0.5,
    0,
    1,
  );
  const carrierExposure = clamp(
    1 - Math.abs(input.carrierFacing.clone().normalize().dot(normal)),
    0,
    1,
  );

  // A quasi-static toppling estimate: lateral acceleration above g * b / h
  // moves the COM projection beyond a support half-width b at COM height h.
  const criticalAcceleration = 9.81
    * Math.max(input.carrierSupportHalfWidth, 0.05)
    / Math.max(input.carrierCentreOfMassHeight, 0.2);
  const contactDuration = 0.12;
  const estimatedAcceleration = closingSpeed / contactDuration;
  const balanceDemand = estimatedAcceleration / criticalAcceleration;

  const energyTerm = clamp(normalKineticEnergy / 650, 0, 1.5);
  const balanceTerm = clamp(balanceDemand / Math.max(input.carrierBalance, 0.2), 0, 2);
  const geometryTerm = clamp(0.45 * angularLeverage + 0.35 * carrierExposure + 0.2 * facingAlignment, 0, 1.5);
  const ballFirstMitigation = input.ballFirst ? 0.82 : 1;
  const severity = clamp((0.48 * energyTerm + 0.34 * balanceTerm + 0.18 * geometryTerm) * ballFirstMitigation, 0, 2);

  const outcome = severity >= 1.05 ? 'fall' : severity >= 0.55 ? 'stagger' : 'glance';

  return {
    closingSpeed,
    reducedMass: mass,
    normalKineticEnergy,
    angularLeverage,
    balanceDemand,
    severity,
    outcome,
  };
}

/** Exact critically damped spring update for a scalar error over one step. */
export function criticallyDampedStep(
  value: number,
  velocity: number,
  target: number,
  angularFrequency: number,
  dt: number,
): { value: number; velocity: number } {
  const omega = Math.max(0, angularFrequency);
  const timeStep = Math.max(0, dt);
  const error = value - target;
  const c = velocity + omega * error;
  const decay = Math.exp(-omega * timeStep);
  const nextError = (error + c * timeStep) * decay;
  const nextVelocity = (velocity - omega * c * timeStep) * decay;
  return { value: target + nextError, velocity: nextVelocity };
}
