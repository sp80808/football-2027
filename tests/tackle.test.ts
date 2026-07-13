import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import { Ball } from '../src/engine/Ball';
import { Player } from '../src/engine/Player';
import { Opponent } from '../src/engine/Opponent';
import { ControllerFrame } from '../src/engine/Intent';

function makeFrame(overrides: Partial<ControllerFrame> = {}): ControllerFrame {
  return {
    leftStick: new Vec2(),
    rightStick: new Vec2(),
    sprint: 0,
    shield: 0,
    passPressed: false,
    passHeld: false,
    passReleased: false,
    throughPassPressed: false,
    throughPassHeld: false,
    throughPassReleased: false,
    shootPressed: false,
    shootHeld: false,
    shootReleased: false,
    lobHeld: false,
    finesseHeld: false,
    chipHeld: false,
    drivenHeld: false,
    skillPressed: false,
    lowDrivenTap: false,
    tacklePressed: false,
    slidePressed: false,
    switchPressed: false,
    keeperRushHeld: false,
    ...overrides,
  };
}

describe('player defensive tackles', () => {
  it('enters tackling state on tackle input', () => {
    const player = new Player();
    const ball = new Ball();
    const opponent = new Opponent();

    player.pos.set(0, 10);
    opponent.pos.set(0, 12);
    ball.pos.set(0, 12, 0);

    player.update(1 / 120, makeFrame({ tacklePressed: true }), ball, opponent);
    expect(player.defensiveState).toBe('tackling');
  });

  it('enters sliding state on slide input', () => {
    const player = new Player();
    const ball = new Ball();
    const opponent = new Opponent();

    player.pos.set(0, 10);
    opponent.pos.set(0, 12);
    ball.pos.set(0, 12, 0);

    player.update(1 / 120, makeFrame({ slidePressed: true }), ball, opponent);
    expect(player.defensiveState).toBe('sliding');
  });

  it('dispossesses opponent when tackle connects', () => {
    const player = new Player();
    const ball = new Ball();
    const opponent = new Opponent();

    player.pos.set(0, 10);
    opponent.pos.set(0, 10.35);
    opponent.facing.set(0, -1);
    opponent.aiState = 'dribbling';
    ball.pos.set(0, 10.3, 0);
    ball.vel.set(0, 0, 0);

    player.update(1 / 120, makeFrame({ tacklePressed: true }), ball, opponent);

    let won = false;
    for (let i = 0; i < 60; i++) {
      player.update(1 / 120, makeFrame(), ball, opponent);
      if (player.tackleWonThisTick) {
        won = true;
        break;
      }
    }

    expect(won).toBe(true);
    expect(opponent.aiState).toBe('tracking');
    expect(ball.vel.mag()).toBeGreaterThan(1);
  });

  it('respects tackle cooldown between attempts', () => {
    const player = new Player();
    const ball = new Ball();
    const opponent = new Opponent();

    player.pos.set(0, 10);
    opponent.pos.set(0, 12);
    ball.pos.set(0, 12, 0);

    player.update(1 / 120, makeFrame({ tacklePressed: true }), ball, opponent);
    expect(player.defensiveState).toBe('tackling');

    for (let i = 0; i < 60; i++) {
      player.update(1 / 120, makeFrame(), ball, opponent);
    }
    expect(player.defensiveState).toBe('none');

    player.update(1 / 120, makeFrame({ tacklePressed: true }), ball, opponent);
    expect(player.defensiveState).toBe('none');
  });
});
