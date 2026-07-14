import { Vec2 } from './Math';

const EPSILON = 1e-9;

export function exponentialDecayFactor(lambda: number, dt: number): number {
  if (!Number.isFinite(lambda) || !Number.isFinite(dt) || lambda < 0 || dt < 0) {
    throw new RangeError('lambda and dt must be finite non-negative values');
  }
  return Math.exp(-lambda * dt);
}

export function halfLifeDecayFactor(halfLife: number, dt: number): number {
  if (!Number.isFinite(halfLife) || halfLife <= 0) {
    throw new RangeError('halfLife must be a finite positive value');
  }
  return exponentialDecayFactor(Math.LN2 / halfLife, dt);
}

export interface DampedScalarState {
  value: number;
  velocity: number;
}

export function criticallyDampedStep(
  value: number,
  velocity: number,
  target: number,
  angularFrequency: number,
  dt: number,
): DampedScalarState {
  if (![value, velocity, target, angularFrequency, dt].every(Number.isFinite)) {
    throw new RangeError('all arguments must be finite');
  }
  if (angularFrequency < 0 || dt < 0) {
    throw new RangeError('angularFrequency and dt must be non-negative');
  }
  if (angularFrequency === 0 || dt === 0) return { value, velocity };

  const displacement = value - target;
  const c2 = velocity + angularFrequency * displacement;
  const decay = Math.exp(-angularFrequency * dt);
  const nextDisplacement = (displacement + c2 * dt) * decay;
  const nextVelocity = (velocity - angularFrequency * c2 * dt) * decay;

  return { value: target + nextDisplacement, velocity: nextVelocity };
}

export interface InterceptSolution {
  time: number;
  point: Vec2;
}

export function solveConstantVelocityIntercept(
  pursuerPosition: Vec2,
  pursuerSpeed: number,
  targetPosition: Vec2,
  targetVelocity: Vec2,
): InterceptSolution | null {
  if (!Number.isFinite(pursuerSpeed) || pursuerSpeed < 0) {
    throw new RangeError('pursuerSpeed must be a finite non-negative value');
  }

  const rx = targetPosition.x - pursuerPosition.x;
  const ry = targetPosition.y - pursuerPosition.y;
  const vx = targetVelocity.x;
  const vy = targetVelocity.y;
  const a = vx * vx + vy * vy - pursuerSpeed * pursuerSpeed;
  const b = 2 * (rx * vx + ry * vy);
  const c = rx * rx + ry * ry;

  if (c <= EPSILON) return { time: 0, point: targetPosition.clone() };

  let time: number | null = null;
  if (Math.abs(a) <= EPSILON) {
    if (Math.abs(b) <= EPSILON) return null;
    const linearTime = -c / b;
    if (linearTime >= 0) time = linearTime;
  } else {
    const discriminant = b * b - 4 * a * c;
    if (discriminant < 0) return null;
    const sqrtDiscriminant = Math.sqrt(Math.max(0, discriminant));
    const t0 = (-b - sqrtDiscriminant) / (2 * a);
    const t1 = (-b + sqrtDiscriminant) / (2 * a);
    if (t0 >= 0 && Number.isFinite(t0)) time = t0;
    if (t1 >= 0 && Number.isFinite(t1) && (time === null || t1 < time)) time = t1;
  }

  if (time === null || !Number.isFinite(time)) return null;
  return { time, point: new Vec2(targetPosition.x + vx * time, targetPosition.y + vy * time) };
}
