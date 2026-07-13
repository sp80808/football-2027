import { describe, it, expect } from 'vitest';
import { GameEngine } from '../src/engine/GameEngine';

describe('GameEngine Simulation', () => {
  it('should run simulation ticks deterministically', () => {
    const engine1 = new GameEngine();
    engine1.init();

    const engine2 = new GameEngine();
    engine2.init();

    // Advance 1 second
    engine1.update(1000);
    engine2.update(1000);

    const s1 = engine1.getRenderState();
    const s2 = engine2.getRenderState();

    expect(s1.player.pos.x).toBe(s2.player.pos.x);
    expect(s1.player.pos.y).toBe(s2.player.pos.y);
    expect(s1.ball.pos.x).toBe(s2.ball.pos.x);
  });

  it('benchmark: 1000 seconds of simulation', () => {
    const engine = new GameEngine();
    engine.init();

    const start = performance.now();
    for (let i = 0; i < 1000; i++) {
      engine.update(i * 1000);
    }
    const end = performance.now();
    
    // Test fails if it takes more than 1 second to simulate 1000 seconds (should be very fast)
    expect(end - start).toBeLessThan(1000);
  });
});
