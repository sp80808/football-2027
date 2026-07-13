import { describe, it, expect } from 'vitest';
import { MatchManager } from '../src/engine/MatchManager';
import { Ball } from '../src/engine/Ball';
import { Player } from '../src/engine/Player';
import { Keeper } from '../src/engine/Keeper';
import { SimulationConfig } from '../src/engine/SimulationConfig';

describe('MatchManager', () => {
  it('detects goal when ball crosses the line', () => {
    const match = new MatchManager();
    const ball = new Ball();
    const player = new Player();
    const keeper = new Keeper();

    match.init();
    match.state.phase = 'playing';

    ball.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH + 0.5, 0.5);
    ball.vel.set(0, 5, 0);

    match.update(1 / 120, ball, player, keeper);

    expect(match.state.homeScore).toBe(1);
    expect(match.state.phase).toBe('goal');
  });

  it('resets for kickoff after goal celebration', () => {
    const match = new MatchManager();
    const ball = new Ball();
    const player = new Player();
    const keeper = new Keeper();

    match.init();
    match.state.phase = 'playing';

    ball.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH + 0.5, 0.5);
    ball.vel.set(0, 5, 0);
    match.update(1 / 120, ball, player, keeper);

    expect(match.state.phase).toBe('goal');

    for (let i = 0; i < 400; i++) {
      match.update(1 / 120, ball, player, keeper);
    }

    expect(match.state.phase).toBe('kickoff');
    expect(ball.pos.x).toBe(0);
    expect(player.pos.y).toBe(-5);
  });
});
