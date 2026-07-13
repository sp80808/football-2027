import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import {
  criticallyDampedStep,
  exponentialDecayFactor,
  halfLifeDecayFactor,
  solveConstantVelocityIntercept,
} from '../src/engine/SimulationMath';

describe('SimulationMath', () => {
  it('produces frame-rate-independent exponential decay', () => {
    const lambda = 3.2;
    const oneStep = exponentialDecayFactor(lambda, 1);
    const fourSteps = Math.pow(exponentialDecayFactor(lambda, 0.25), 4);
    expect(fourSteps).toBeCloseTo(oneStep, 12);
  });

  it('halves a value over one half-life', () => {
    expect(halfLifeDecayFactor(0.18, 0.18)).toBeCloseTo(0.5, 12);
  });

  it('critically damped motion converges without overshoot', () => {
    let value = 0;
    let velocity = 0;
    const target = 10;

    for (let i = 0; i < 240; i += 1) {
      const next = criticallyDampedStep(value, velocity, target, 10, 1 / 120);
      expect(next.value).toBeGreaterThanOrEqual(value - 1e-12);
      expect(next.value).toBeLessThanOrEqual(target + 1e-12);
      value = next.value;
      velocity = next.velocity;
    }

    expect(value).toBeCloseTo(target, 5);
    expect(velocity).toBeCloseTo(0, 5);
  });

  it('solves a stationary-target interception', () => {
    const solution = solveConstantVelocityIntercept(
      new Vec2(0, 0),
      5,
      new Vec2(10, 0),
      new Vec2(0, 0),
    );

    expect(solution).not.toBeNull();
    expect(solution?.time).toBeCloseTo(2, 12);
    expect(solution?.point.x).toBeCloseTo(10, 12);
    expect(solution?.point.y).toBeCloseTo(0, 12);
  });

  it('leads a moving target', () => {
    const solution = solveConstantVelocityIntercept(
      new Vec2(0, 0),
      5,
      new Vec2(10, 0),
      new Vec2(1, 0),
    );

    expect(solution).not.toBeNull();
    expect(solution?.time).toBeCloseTo(2.5, 12);
    expect(solution?.point.x).toBeCloseTo(12.5, 12);
  });

  it('returns null when an equally fast target is escaping directly away', () => {
    const solution = solveConstantVelocityIntercept(
      new Vec2(0, 0),
      5,
      new Vec2(10, 0),
      new Vec2(5, 0),
    );

    expect(solution).toBeNull();
  });
});
