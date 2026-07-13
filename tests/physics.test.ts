import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import { Ball } from '../src/engine/Ball';
import { Keeper } from '../src/engine/Keeper';
import { SimulationConfig } from '../src/engine/SimulationConfig';
import { parseIntent } from '../src/engine/PlayerIntentParser';
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

describe('math and ball physics', () => {
  it('normalises vectors', () => {
    const vector = new Vec2(3, 4);
    expect(vector.mag()).toBe(5);
    vector.normalize();
    expect(vector.x).toBeCloseTo(0.6);
    expect(vector.y).toBeCloseTo(0.8);
  });

  it('applies gravity to an airborne ball', () => {
    const ball = new Ball();
    ball.pos.set(0, 0, 10);
    for (let tick = 0; tick < 120; tick++) ball.update(1 / 120);
    expect(ball.pos.z).toBeLessThan(10);
    expect(ball.vel.z).toBeLessThan(0);
  });

  it('settles repeated bounces', () => {
    const ball = new Ball();
    ball.pos.set(0, 0, 5);
    for (let tick = 0; tick < 1200; tick++) ball.update(1 / 120);
    expect(ball.pos.z).toBeCloseTo(SimulationConfig.BALL_RADIUS, 2);
    expect(Math.abs(ball.vel.z)).toBeLessThanOrEqual(SimulationConfig.BALL_BOUNCE_DEAD_ZONE);
  });

  it('reduces rolling speed without reversing it', () => {
    const ball = new Ball();
    ball.vel.set(10, 0, 0);
    for (let tick = 0; tick < 120; tick++) ball.update(1 / 120);
    expect(ball.vel.x).toBeGreaterThan(0);
    expect(ball.vel.x).toBeLessThan(10);
  });
});

describe('player intent parser', () => {
  const context = {
    playerSpeed: 4,
    chargeDuration: 0,
    isCharging: false,
    chargeType: 'pass' as const,
    ballGrounded: true,
    ballInControl: true,
    ballReceiving: false,
    incomingBallSpeed: 0,
  };

  it('selects a normal push touch at jogging pace', () => {
    expect(parseIntent(makeFrame({ leftStick: new Vec2(0, 1) }), context).desiredTouch).toBe('push');
  });

  it('selects a cushion touch at low speed', () => {
    expect(parseIntent(makeFrame({ leftStick: new Vec2(0, 0.3) }), { ...context, playerSpeed: 1 }).desiredTouch).toBe('cushion');
  });

  it('selects a knock-on while sprinting', () => {
    expect(parseIntent(
      makeFrame({ leftStick: new Vec2(0, 1), sprint: 1 }),
      { ...context, playerSpeed: SimulationConfig.PLAYER_SPRINT_SPEED * 0.9 },
    ).desiredTouch).toBe('knock_on');
  });

  it('selects shielding when the shield input is held', () => {
    expect(parseIntent(makeFrame({ shield: 1 }), context).desiredTouch).toBe('shield');
  });

  it('emits a shot action on release after charging', () => {
    expect(parseIntent(
      makeFrame({ shootReleased: true }),
      { ...context, chargeDuration: 0.8, isCharging: true, chargeType: 'shoot' },
    ).action).toBe('shot');
  });

  it('detects finesse shot modifier', () => {
    const intent = parseIntent(
      makeFrame({ shootHeld: true, finesseHeld: true }),
      { ...context, chargeType: 'shoot' },
    );
    expect(intent.shotModifier).toBe('finesse');
  });

  it('detects lob pass modifier', () => {
    const intent = parseIntent(
      makeFrame({ passHeld: true, lobHeld: true }),
      context,
    );
    expect(intent.passModifier).toBe('lob');
    expect(intent.action).toBe('lob_pass');
  });

  it('detects through ball modifier', () => {
    expect(parseIntent(makeFrame({ throughPassHeld: true }), context).passModifier).toBe('through');
  });

  it('emits first-time shot while receiving', () => {
    const intent = parseIntent(
      makeFrame({ shootReleased: true }),
      {
        ...context,
        ballInControl: false,
        ballReceiving: true,
        incomingBallSpeed: 6,
        chargeDuration: 0.6,
        isCharging: true,
        chargeType: 'shoot',
      },
    );
    expect(intent.action).toBe('first_time');
  });
});

describe('keeper state machine', () => {
  it('holds the goal line while the ball is distant', () => {
    const keeper = new Keeper();
    const ball = new Ball();
    ball.pos.set(0, -20, 0);
    for (let tick = 0; tick < 120; tick++) keeper.update(1 / 120, ball);
    expect(keeper.pos.y).toBeCloseTo(SimulationConfig.PITCH_HALF_LENGTH - 0.5, 1);
    expect(keeper.aiState).toBe('positioning');
  });

  it('dives for a fast approaching ball', () => {
    const keeper = new Keeper();
    const goalLine = SimulationConfig.PITCH_HALF_LENGTH - 0.5;
    keeper.pos.set(0, goalLine);
    const ball = new Ball();
    ball.pos.set(3, goalLine - SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS + 0.1, 0);
    ball.vel.set(-1, SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED + 1, 0);

    let dived = false;
    for (let tick = 0; tick < 120; tick++) {
      keeper.update(1 / 120, ball);
      ball.update(1 / 120);
      if (keeper.aiState === 'diving') {
        dived = true;
        break;
      }
    }
    expect(dived).toBe(true);
  });

  it('returns to positioning after dive and recovery', () => {
    const keeper = new Keeper();
    const goalLine = SimulationConfig.PITCH_HALF_LENGTH - 0.5;
    keeper.pos.set(0, goalLine);
    const ball = new Ball();
    ball.pos.set(3, goalLine - SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS + 0.1, 0);
    ball.vel.set(-1, SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED + 2, 0);

    const seconds = SimulationConfig.KEEPER_DIVE_DURATION + SimulationConfig.KEEPER_RECOVER_DURATION + 0.5;
    for (let tick = 0; tick < Math.ceil(seconds * 120); tick++) {
      keeper.update(1 / 120, ball);
      ball.update(1 / 120);
    }
    expect(keeper.aiState).toBe('positioning');
  });
});
