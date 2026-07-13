import { describe, expect, it } from 'vitest';
import {
  parseIntent,
  resolvePassModifier,
  resolveShotModifier,
  type ParseContext,
} from '../src/engine/PlayerIntentParser';
import { Vec2 } from '../src/engine/Math';
import type { ControllerFrame } from '../src/engine/Intent';
import { SimulationConfig } from '../src/engine/SimulationConfig';

function frame(overrides: Partial<ControllerFrame> = {}): ControllerFrame {
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

function context(overrides: Partial<ParseContext> = {}): ParseContext {
  return {
    playerSpeed: 0,
    chargeDuration: 0,
    isCharging: false,
    chargeType: 'pass',
    ballGrounded: true,
    ballInControl: false,
    ballReceiving: false,
    incomingBallSpeed: 0,
    ...overrides,
  };
}

describe('canonical player intent parser', () => {
  it('normalises movement and derives facing from movement', () => {
    const intent = parseIntent(
      frame({ leftStick: new Vec2(2, 0) }),
      context({ playerSpeed: 3 }),
    );

    expect(intent.moveDir.x).toBeCloseTo(1);
    expect(intent.moveDir.y).toBeCloseTo(0);
    expect(intent.faceDir.x).toBeCloseTo(1);
    expect(intent.desiredTouch).toBe('push');
  });

  it('uses right stick as independent facing intent', () => {
    const intent = parseIntent(
      frame({ leftStick: new Vec2(0, 1), rightStick: new Vec2(1, 0) }),
      context({ playerSpeed: 3 }),
    );

    expect(intent.moveDir.y).toBeCloseTo(1);
    expect(intent.faceDir.x).toBeCloseTo(1);
    expect(intent.faceDir.y).toBeCloseTo(0);
  });

  it('clamps deterministic charge to the valid range', () => {
    const intent = parseIntent(
      frame({ passReleased: true }),
      context({
        chargeDuration: SimulationConfig.MAX_CHARGE_TIME * 3,
        isCharging: true,
        chargeType: 'pass',
      }),
    );

    expect(intent.action).toBe('short_pass');
    expect(intent.charge).toBe(1);
  });

  it('maps a lobbed through release correctly', () => {
    const input = frame({
      throughPassReleased: true,
      lobHeld: true,
    });
    const intent = parseIntent(
      input,
      context({ isCharging: true, chargeType: 'pass', chargeDuration: 0.2 }),
    );

    expect(resolvePassModifier(input)).toBe('lob_through');
    expect(intent.action).toBe('lob_pass');
    expect(intent.passModifier).toBe('lob_through');
  });

  it('emits a first-time action while receiving', () => {
    const intent = parseIntent(
      frame({ shootReleased: true }),
      context({
        ballReceiving: true,
        incomingBallSpeed: 12,
        isCharging: true,
        chargeType: 'shoot',
        chargeDuration: 0.25,
      }),
    );

    expect(intent.action).toBe('first_time');
    expect(intent.desiredTouch).toBe('cushion');
  });

  it('prioritises shielding and requests cancellation while charging', () => {
    const intent = parseIntent(
      frame({ passHeld: true, shield: 1, leftStick: new Vec2(0, 1) }),
      context({ ballInControl: true }),
    );

    expect(intent.isShielding).toBe(true);
    expect(intent.desiredTouch).toBe('shield');
    expect(intent.cancelRequested).toBe(true);
  });

  it('derives knock-on touch at high sprint speed', () => {
    const intent = parseIntent(
      frame({ leftStick: new Vec2(0, 1), sprint: 1 }),
      context({ playerSpeed: SimulationConfig.PLAYER_SPRINT_SPEED * 0.8 }),
    );

    expect(intent.desiredTouch).toBe('knock_on');
    expect(intent.skillMove).toBe('knock_on');
  });

  it('resolves shot modifiers in deterministic priority order', () => {
    expect(resolveShotModifier(frame({ chipHeld: true, finesseHeld: true }), 1)).toBe('chip');
    expect(resolveShotModifier(frame({ finesseHeld: true }), 1)).toBe('finesse');
    expect(resolveShotModifier(frame({ lowDrivenTap: true }), 0.5)).toBe('low_driven');
    expect(resolveShotModifier(frame(), 1)).toBe('power');
  });
});
