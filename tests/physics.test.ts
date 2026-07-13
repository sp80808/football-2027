import { describe, it, expect } from 'vitest';
import { Vec2, Vec3 } from '../src/engine/Math';
import { Ball } from '../src/engine/Ball';
import { SimulationConfig } from '../src/engine/SimulationConfig';

describe('Math and Physics Sanity', () => {
  it('Vec2 magnitude and normalization', () => {
    const v = new Vec2(3, 4);
    expect(v.mag()).toBe(5);
    v.normalize();
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(0.8);
  });

  it('Ball energy and gravity', () => {
    const ball = new Ball();
    ball.pos.set(0, 0, 10);
    
    // Fall for 1 second at 9.81 m/s^2
    const dt = 1 / 120;
    for (let i = 0; i < 120; i++) {
      ball.update(dt);
    }
    
    expect(ball.pos.z).toBeLessThan(10);
    expect(ball.vel.z).toBeLessThan(0);
  });
});
