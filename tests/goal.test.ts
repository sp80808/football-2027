import { describe, it, expect } from 'vitest';
import { Ball } from '../src/engine/Ball';
import { SimulationConfig } from '../src/engine/SimulationConfig';
import { GameEngine } from '../src/engine/GameEngine';
import { MatchState } from '../src/engine/MatchState';

describe('Ball physics tuning', () => {
  it('applies air drag reducing horizontal velocity over time', () => {
    const ball = new Ball();
    ball.pos.set(0, 0, 0);
    ball.vel.set(20, 0, 0);

    const dt = SimulationConfig.DT;
    for (let i = 0; i < 120; i++) {
      ball.update(dt);
    }

    expect(ball.vel.x).toBeLessThan(20);
    expect(ball.vel.x).toBeGreaterThan(0);
  });

  it('still falls under gravity when airborne', () => {
    const ball = new Ball();
    ball.pos.set(0, 0, 10);
    const dt = 1 / 120;
    for (let i = 0; i < 120; i++) {
      ball.update(dt);
    }
    expect(ball.pos.z).toBeLessThan(10);
    expect(ball.vel.z).toBeLessThan(0);
  });
});

describe('MatchState', () => {
  it('tracks score and celebration phase on goal', () => {
    const match = new MatchState();
    match.phase = 'playing';
    const side = match.registerGoal(true);
    expect(side).toBe(1);
    expect(match.homeScore).toBe(1);
    expect(match.phase).toBe('celebration');
  });
});

describe('Goal detection integration', () => {
  it('registers goal when ball is in goal mouth past line', () => {
    const engine = new GameEngine();
    engine.init({ skipKickoff: true });

    engine.ball.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH + 0.2, 0.5);
    engine.ball.vel.set(0, 0, 0);

    for (let i = 1; i <= 240; i++) {
      engine.ball.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH + 0.2, 0.5);
      engine.update(1000 + i * (1000 / 120));
      if (engine.scorePlayer > 0) break;
    }

    expect(engine.scorePlayer).toBe(1);
    expect(engine.isGoalCelebration).toBe(true);
  });
});
