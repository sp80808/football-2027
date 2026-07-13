import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/GameEngine';

describe('GameEngine Simulation', () => {
  it('should run simulation ticks deterministically', () => {
    const engine1 = new GameEngine();
    engine1.init({ skipKickoff: true });

    const engine2 = new GameEngine();
    engine2.init({ skipKickoff: true });

    // Advance ~1 second using identical, increasing frame timestamps on both
    // engines. (Passing the same timestamp to both would short-circuit the
    // fixed-timestep accumulator and never tick — so we step 16 ms at a time.)
    for (let t = 16; t <= 1000; t += 16) {
      engine1.update(t);
      engine2.update(t);
    }

    const s1 = engine1.getRenderState();
    const s2 = engine2.getRenderState();

    expect(s1.tick).toBe(s2.tick);
    expect(s1.player.pos.x).toBeCloseTo(s2.player.pos.x, 6);
    expect(s1.player.pos.y).toBeCloseTo(s2.player.pos.y, 6);
    expect(s1.ball.pos.x).toBeCloseTo(s2.ball.pos.x, 6);
  });

  it('produces identical results across runs with the same seed', () => {
    const run = () => {
      const engine = new GameEngine();
      engine.init({ skipKickoff: true });
      for (let t = 16; t <= 2000; t += 16) engine.update(t);
      return engine.getRenderState();
    };

    const a = run();
    const b = run();
    expect(a.ball.pos.x).toBeCloseTo(b.ball.pos.x, 6);
    expect(a.player.pos.x).toBeCloseTo(b.player.pos.x, 6);
  });

  it('benchmark: 1000 seconds of simulation', () => {
    const engine = new GameEngine();
    engine.init({ skipKickoff: true });

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      engine.update(i * 1000);
    }
    const end = performance.now();

    // Test fails if it takes more than 1 second to simulate 1000 seconds (should be very fast)
    expect(end - start).toBeLessThan(1000);
  });

  it('computes offside line during simulation', () => {
    const engine = new GameEngine();
    engine.init({ skipKickoff: true });
    for (let t = 16; t <= 200; t += 16) engine.update(t);
    const state = engine.getRenderState();
    expect(state.offsideLineY).not.toBeNull();
    expect(typeof state.offsideLineY).toBe('number');
  });
});
