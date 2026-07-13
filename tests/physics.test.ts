import { describe, it, expect } from 'vitest';
import { Vec2, Vec3 } from '../src/engine/Math';
import { Ball } from '../src/engine/Ball';
import { Player } from '../src/engine/Player';
import { Keeper } from '../src/engine/Keeper';
import { SimulationConfig } from '../src/engine/SimulationConfig';
import { parseIntent } from '../src/engine/PlayerIntentParser';
import { ControllerFrame } from '../src/engine/Intent';

// ── Helpers ────────────────────────────────────────────────────────────────

function makeFrame(overrides: Partial<ControllerFrame> = {}): ControllerFrame {
  return {
    leftStick: new Vec2(0, 0),
    rightStick: new Vec2(0, 0),
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
    tacklePressed: false,
    slidePressed: false,
    switchPressed: false,
    keeperRushHeld: false,
    ...overrides,
  };
}

// ── Math & Ball physics ─────────────────────────────────────────────────────

describe('Math and Physics Sanity', () => {
  it('Vec2 magnitude and normalization', () => {
    const v = new Vec2(3, 4);
    expect(v.mag()).toBe(5);
    v.normalize();
    expect(v.x).toBeCloseTo(0.6);
    expect(v.y).toBeCloseTo(0.8);
  });

  it('Ball falls under gravity', () => {
    const ball = new Ball();
    ball.pos.set(0, 0, 10);

    const dt = 1 / 120;
    for (let i = 0; i < 120; i++) ball.update(dt);

    expect(ball.pos.z).toBeLessThan(10);
    expect(ball.vel.z).toBeLessThan(0);
  });

  it('Ball bounces and settles', () => {
    const ball = new Ball();
    ball.pos.set(0, 0, 5);

    const dt = 1 / 120;
    // Run for 5 simulated seconds — ball should settle.
    for (let i = 0; i < 600; i++) ball.update(dt);

    expect(ball.pos.z).toBeCloseTo(0, 1);
    expect(Math.abs(ball.vel.z)).toBeLessThan(0.5);
  });

  it('Ball decelerates due to rolling friction', () => {
    const ball = new Ball();
    ball.pos.set(0, 0, 0);
    ball.vel.set(10, 0, 0);

    const dt = 1 / 120;
    for (let i = 0; i < 120; i++) ball.update(dt);

    expect(ball.vel.x).toBeLessThan(10);
    expect(ball.vel.x).toBeGreaterThan(0);
  });
});

// ── PlayerIntentParser ──────────────────────────────────────────────────────

describe('PlayerIntentParser', () => {
  it('returns push touch at normal pace', () => {
    const frame = makeFrame({ leftStick: new Vec2(0, 1) });
    const intent = parseIntent(frame, {
      playerSpeed: 4,
      chargeDuration: 0,
      isCharging: false,
      ballGrounded: true,
      ballInControl: true,
    });
    expect(intent.desiredTouch).toBe('push');
  });

  it('returns cushion touch at slow pace', () => {
    const frame = makeFrame({ leftStick: new Vec2(0, 0.3) });
    const intent = parseIntent(frame, {
      playerSpeed: 1.0,
      chargeDuration: 0,
      isCharging: false,
      ballGrounded: true,
      ballInControl: true,
    });
    expect(intent.desiredTouch).toBe('cushion');
  });

  it('returns knock_on touch when sprinting', () => {
    const frame = makeFrame({ leftStick: new Vec2(0, 1), sprint: 1 });
    const intent = parseIntent(frame, {
      playerSpeed: SimulationConfig.PLAYER_SPRINT_SPEED * 0.9,
      chargeDuration: 0,
      isCharging: false,
      ballGrounded: true,
      ballInControl: true,
    });
    expect(intent.desiredTouch).toBe('knock_on');
  });

  it('returns shield touch when shield held', () => {
    const frame = makeFrame({ shield: 1 });
    const intent = parseIntent(frame, {
      playerSpeed: 3,
      chargeDuration: 0,
      isCharging: false,
      ballGrounded: true,
      ballInControl: true,
    });
    expect(intent.desiredTouch).toBe('shield');
  });

  it('detects shot release action', () => {
    const frame = makeFrame({ shootReleased: true });
    const intent = parseIntent(frame, {
      playerSpeed: 4,
      chargeDuration: 0.8,
      isCharging: true,
      ballGrounded: true,
      ballInControl: true,
    });
    expect(intent.action).toBe('shot');
  });

  it('urgency is 1.0 when sprinting', () => {
    const frame = makeFrame({ leftStick: new Vec2(0, 1), sprint: 1 });
    const intent = parseIntent(frame, {
      playerSpeed: 5,
      chargeDuration: 0,
      isCharging: false,
      ballGrounded: true,
      ballInControl: false,
    });
    expect(intent.urgency).toBe(1.0);
  });
});

// ── Keeper AI ───────────────────────────────────────────────────────────────

describe('Keeper AI', () => {
  it('stays on goal line when ball is far away', () => {
    const keeper = new Keeper();
    const ball = new Ball();
    ball.pos.set(0, -20, 0); // Far from goal

    const dt = 1 / 120;
    for (let i = 0; i < 120; i++) keeper.update(dt, ball);

    const goalLineY = SimulationConfig.PITCH_HALF_LENGTH - 0.5;
    expect(keeper.pos.y).toBeCloseTo(goalLineY, 1);
    expect(keeper.aiState).toBe('positioning');
  });

  it('transitions to diving when a fast ball approaches', () => {
    const keeper = new Keeper();
    const goalLineY = SimulationConfig.PITCH_HALF_LENGTH - 0.5;
    keeper.pos.set(0, goalLineY);

    const ball = new Ball();
    // Ball near keeper, travelling toward goal fast.
    ball.pos.set(3, goalLineY - SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS + 0.1, 0);
    ball.vel.set(-1, SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED + 1, 0);

    const dt = 1 / 120;
    let dived = false;
    for (let i = 0; i < 120; i++) {
      keeper.update(dt, ball);
      ball.update(dt);
      if (keeper.aiState === 'diving') { dived = true; break; }
    }

    expect(dived).toBe(true);
  });

  it('recovers after dive duration', () => {
    const keeper = new Keeper();
    const goalLineY = SimulationConfig.PITCH_HALF_LENGTH - 0.5;
    keeper.pos.set(0, goalLineY);

    const ball = new Ball();
    ball.pos.set(3, goalLineY - SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS + 0.1, 0);
    ball.vel.set(-1, SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED + 2, 0);

    const dt = 1 / 120;
    // Run long enough for dive + recovery cycle.
    const totalTicks = Math.ceil((SimulationConfig.KEEPER_DIVE_DURATION * 2 + 0.5) * 120);
    for (let i = 0; i < totalTicks; i++) {
      keeper.update(dt, ball);
      ball.update(dt);
    }

    expect(keeper.aiState).toBe('positioning');
  });
});
