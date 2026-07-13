import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import {
  criticallyDampedStep,
  exponentialDecayFactor,
  halfLifeDecayFactor,
  solveConstantVelocityIntercept,
} from '../src/engine/SimulationMath';

describe('SimulationMath', () => {
  it('matches one full damping step with two half steps', () => {
    const full = exponentialDecayFactor(3.2, 1 / 30);
    const half = exponentialDecayFactor(3.2, 1 / 60);
    expect(half * half).toBeCloseTo(full, 12);
  });

  it('halves a value after one half-life', () => {
    expect(halfLifeDecayFactor(0.2, 0.2)).toBeCloseTo(0.5, 12);
  });

  it('produces equivalent critically damped state across render subdivisions', () => {
    const oneStep = criticallyDampedStep(0, 0, 10, 5, 1 / 30);
    const firstHalf = criticallyDampedStep(0, 0, 10, 5, 1 / 60);
    const secondHalf = criticallyDampedStep(firstHalf.value, firstHalf.velocity, 10, 5, 1 / 60);

    expect(secondHalf.value).toBeCloseTo(oneStep.value, 10);
    expect(secondHalf.velocity).toBeCloseTo(oneStep.velocity, 10);
  });

  it('converges without overshooting a stationary target', () => {
    let value = 0;
    let velocity = 0;
    for (let i = 0; i < 240; i += 1) {
      const next = criticallyDampedStep(value, velocity, 1, 6, 1 / 120);
      value = next.value;
      velocity = next.velocity;
      expect(value).toBeLessThanOrEqual(1 + 1e-10);
    }
    expect(value).toBeCloseTo(1, 4);
  });

  it('finds a stationary target interception', () => {
    const result = solveConstantVelocityIntercept(
      new Vec2(0, 0),
      5,
      new Vec2(10, 0),
      new Vec2(0, 0),
    );

    expect(result).not.toBeNull();
    expect(result?.time).toBeCloseTo(2, 10);
    expect(result?.point.x).toBeCloseTo(10, 10);
  });

  it('leads a moving target', () => {
    const result = solveConstantVelocityIntercept(
      new Vec2(0, 0),
      10,
      new Vec2(10, 0),
      new Vec2(0, 2),
    );

    expect(result).not.toBeNull();
    expect(result!.point.y).toBeGreaterThan(0);
    expect(result!.point.distanceTo(new Vec2(0, 0))).toBeCloseTo(10 * result!.time, 8);
  });

  it('rejects an unreachable target moving directly away at equal speed', () => {
    expect(solveConstantVelocityIntercept(
      new Vec2(0, 0),
      5,
      new Vec2(10, 0),
      new Vec2(5, 0),
    )).toBeNull();
  });

  it('validates invalid parameters', () => {
    expect(() => exponentialDecayFactor(-1, 0.1)).toThrow(RangeError);
    expect(() => halfLifeDecayFactor(0, 0.1)).toThrow(RangeError);
    expect(() => criticallyDampedStep(0, 0, 1, -1, 0.1)).toThrow(RangeError);
    expect(() => solveConstantVelocityIntercept(new Vec2(), -1, new Vec2(), new Vec2())).toThrow(RangeError);
  });
});
