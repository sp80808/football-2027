import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import { Ball } from '../src/engine/Ball';
import { Footballer } from '../src/engine/Footballer';
import { TeamLogic } from '../src/engine/TeamLogic';
import { SimulationConfig } from '../src/engine/SimulationConfig';
import { ControllerFrame } from '../src/engine/Intent';
import { createEmptyFrame } from '../src/engine/Intent';

function makeFrame(overrides: Partial<ControllerFrame> = {}): ControllerFrame {
  return { ...createEmptyFrame(), ...overrides };
}

/**
 * Regression tests for the core single-player gameplay loop. These lock in two
 * fixes that were degrading the feel of the game:
 *
 *  1. The double-update bug: Footballer.update() previously called
 *     updateLocomotion + updateBallInteraction TWICE per tick, doubling
 *     effective speed and stamina drain. We now assert that a single update
 *     advances the player by exactly one tick's worth of acceleration.
 *  2. AI teamwork: TeamLogic previously only dribbled or shot. We assert that
 *     an AI player under pressure now emits pass charge/release inputs aimed
 *     at a forward teammate.
 */

describe('footballer single-update (no double locomotion)', () => {
  it('advances position by one tick of acceleration, not two', () => {
    const player = new Footballer(0, 'home');
    player.pos.set(0, 0);
    player.vel.set(0, 0);
    player.controlState = 'free';

    const dt = SimulationConfig.DT;
    const frame = makeFrame({ leftStick: new Vec2(1, 0) }); // jog right
    const ball = new Ball();
    ball.pos.set(100, 100, 0); // keep ball far away so it doesn't interfere

    player.update(dt, frame, ball);

    // After one tick the velocity gain is accel * dt (≈ 18 / 120 = 0.15),
    // NOT double that. Allow a tolerance for the decel/idle branch.
    const expectedVelGain = SimulationConfig.PLAYER_ACCEL * dt;
    expect(player.vel.x).toBeGreaterThan(0);
    expect(player.vel.x).toBeLessThanOrEqual(expectedVelGain + 1e-6);
    // Position should be vel * dt (≈ 0.00125), not 2× that.
    expect(player.pos.x).toBeLessThanOrEqual(expectedVelGain * dt + 1e-6);
  });

  it('does not drain stamina twice as fast when sprinting', () => {
    const player = new Footballer(0, 'home');
    player.pos.set(0, 0);
    player.vel.set(SimulationConfig.PLAYER_MAX_SPEED + 1, 0); // already above max → sprint drain
    player.stamina = 50;
    player.controlState = 'free';

    const dt = SimulationConfig.DT;
    const frame = makeFrame({ leftStick: new Vec2(1, 0), sprint: 1 });
    const ball = new Ball();
    ball.pos.set(100, 100, 0);

    player.update(dt, frame, ball);

    // Single-tick drain = staminaDrainRate * 100 * dt ≈ 0.1 * 100 / 120 ≈ 0.0833
    const expectedDrain = player.staminaDrainRate * 100 * dt;
    expect(50 - player.stamina).toBeCloseTo(expectedDrain, 4);
  });
});

describe('attribute bindings affect locomotion', () => {
  it('a faster player reaches a higher speed than a slow one', () => {
    const fast = new Footballer(0, 'home');
    fast.speedMul = 1.25;
    const slow = new Footballer(1, 'home');
    slow.speedMul = 0.75;

    const dt = SimulationConfig.DT;
    const frame = makeFrame({ leftStick: new Vec2(1, 0), sprint: 1 });
    const ball = new Ball();
    ball.pos.set(100, 100, 0);

    // Run enough ticks for both to hit their terminal speed.
    for (let i = 0; i < 600; i++) {
      fast.update(dt, frame, ball);
      slow.update(dt, frame, ball);
    }

    expect(fast.vel.mag()).toBeGreaterThan(slow.vel.mag());
  });

  it('a high-agility player turns faster (turnMul applied)', () => {
    const agile = new Footballer(0, 'home');
    agile.turnMul = 1.5;
    const stiff = new Footballer(1, 'home');
    stiff.turnMul = 0.5;

    // Both start facing +X, then we command them to face +Y.
    agile.facing.set(1, 0);
    stiff.facing.set(1, 0);
    agile.pos.set(0, 0);
    stiff.pos.set(0, 0);
    agile.controlState = 'free';
    stiff.controlState = 'free';

    const dt = SimulationConfig.DT;
    const frame = makeFrame({ leftStick: new Vec2(0, 1) }); // move up, face up
    const ball = new Ball();
    ball.pos.set(100, 100, 0);

    for (let i = 0; i < 12; i++) { // ~100ms
      agile.update(dt, frame, ball);
      stiff.update(dt, frame, ball);
    }

    // The agile player should have rotated its facing further toward +Y.
    expect(agile.facing.y).toBeGreaterThan(stiff.facing.y);
  });
});

describe('AI teammate passing', () => {
  it('passes forward to an open teammate when under pressure', () => {
    const home = Array.from({ length: 10 }, (_, i) => new Footballer(i, 'home'));
    const away = Array.from({ length: 10 }, (_, i) => new Footballer(i, 'away'));

    // Ball-car (ST) near the halfway line, in possession.
    home[9].pos.set(0, -5);
    home[9].controlState = 'under_control';

    // A teammate (CAM) in open space, 15m further forward.
    home[7].pos.set(0, 10);

    // An opponent pressing the ball-car closely.
    away[0].pos.set(0, -7);

    // No other opponents near the lane or the receiver.
    for (let i = 1; i < 10; i++) away[i].pos.set(50 + i, 50);

    const ball = new Ball();
    ball.pos.set(0, -5, 0);

    const frames = Array.from({ length: 10 }, () => createEmptyFrame());
    const logic = new TeamLogic('home');
    logic.update(SimulationConfig.DT, home, frames, ball, null, away);

    // The ball-car's frame should aim toward the forward teammate (+Y)
    // and begin charging a pass.
    const carrierFrame = frames[9];
    expect(carrierFrame.leftStick.y).toBeGreaterThan(0);
    expect(carrierFrame.passHeld || carrierFrame.passReleased).toBe(true);
  });

  it('still dribbles toward goal when no pass is on and not pressured', () => {
    const home = Array.from({ length: 10 }, (_, i) => new Footballer(i, 'home'));
    const away = Array.from({ length: 10 }, (_, i) => new Footballer(i, 'away'));

    home[9].pos.set(0, 0);
    home[9].controlState = 'under_control';

    // All opponents far away — no pressure, no passing lane needed.
    for (let i = 0; i < 10; i++) away[i].pos.set(50 + i, -50);

    const ball = new Ball();
    ball.pos.set(0, 0, 0);

    const frames = Array.from({ length: 10 }, () => createEmptyFrame());
    const logic = new TeamLogic('home');
    logic.update(SimulationConfig.DT, home, frames, ball, null, away);

    const carrierFrame = frames[9];
    // Home attacks +Y, so the carrier should move toward +Y.
    expect(carrierFrame.leftStick.y).toBeGreaterThan(0);
    // And should not be charging a pass.
    expect(carrierFrame.passHeld).toBe(false);
    expect(carrierFrame.passReleased).toBe(false);
  });
});
