import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import { Ball } from '../src/engine/Ball';
import { Player } from '../src/engine/Player';
import { Opponent } from '../src/engine/Opponent';
import { SimulationConfig } from '../src/engine/SimulationConfig';

const DT = 1 / 120;

function runJockeyTicks(
  opponent: Opponent,
  player: Player,
  ball: Ball,
  ticks: number,
) {
  for (let i = 0; i < ticks; i++) {
    opponent.update(DT, ball, player);
  }
}

describe('opponent jockey and lane blocking', () => {
  it('enters jockeying state when the player has the ball', () => {
    const opponent = new Opponent();
    const player = new Player();
    const ball = new Ball();

    player.pos.set(0, 0);
    player.facing.set(0, 1);
    player.controlState = 'under_control';
    opponent.pos.set(8, 8);
    opponent.vel.set(0, 0);
    ball.pos.set(0, 0.3, 0);

    opponent.update(DT, ball, player);
    expect(opponent.aiState).toBe('jockeying');
  });

  it('closes goal-side on the attack lane instead of charging straight at the carrier', () => {
    const opponent = new Opponent();
    const player = new Player();
    const ball = new Ball();

    player.pos.set(0, 0);
    player.facing.set(0, 1);
    player.controlState = 'under_control';
    opponent.pos.set(6, 2);
    opponent.vel.set(0, 0);
    ball.pos.set(0, 0.3, 0);

    const startDistToPlayer = opponent.pos.distanceTo(player.pos);
    runJockeyTicks(opponent, player, ball, 90);

    const goalSideY = opponent.pos.y - player.pos.y;
    expect(goalSideY).toBeGreaterThan(0.5);
    expect(opponent.pos.distanceTo(player.pos)).toBeLessThan(startDistToPlayer);
    expect(opponent.aiState).toBe('jockeying');
  });

  it('shifts toward the wide passing corridor the carrier is facing', () => {
    const opponent = new Opponent();
    const player = new Player();
    const ball = new Ball();

    player.pos.set(0, 0);
    player.facing.set(1, 0.2);
    player.controlState = 'under_control';
    opponent.pos.set(-6, 4);
    opponent.vel.set(0, 0);
    ball.pos.set(0, 0.3, 0);

    runJockeyTicks(opponent, player, ball, 120);

    expect(opponent.pos.x).toBeGreaterThan(-4);
    expect(opponent.aiState).toBe('jockeying');
  });

  it('still presses loose balls with higher priority than jockeying', () => {
    const opponent = new Opponent();
    const player = new Player();
    const ball = new Ball();

    player.pos.set(0, 0);
    player.controlState = 'free';
    opponent.pos.set(0, 20);
    ball.pos.set(0, 18, 0);
    ball.vel.set(0, 4, 0);

    opponent.update(DT, ball, player);
    expect(opponent.aiState).toBe('pressing');
  });

  it('still shoots when in possession and facing the opponent goal', () => {
    const opponent = new Opponent();
    const player = new Player();
    const ball = new Ball();

    player.controlState = 'free';
    opponent.pos.set(0, -SimulationConfig.PITCH_HALF_LENGTH + 8);
    opponent.facing.set(0, -1);
    ball.pos.set(opponent.pos.x, opponent.pos.y + 0.3, 0);
    ball.vel.set(0, 0, 0);

    opponent.update(DT, ball, player);
    expect(opponent.aiState).toBe('shooting');
    expect(ball.vel.mag()).toBeGreaterThan(5);
  });
});
