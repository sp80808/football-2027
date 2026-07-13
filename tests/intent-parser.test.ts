import { describe, expect, it } from 'vitest';
import { IntentParser } from '../src/engine/IntentParser';
import { Vec2 } from '../src/engine/Math';
import type { ControllerFrame } from '../src/engine/Intent';

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

describe('IntentParser', () => {
  it('normalises movement and derives facing from movement', () => {
    const parser = new IntentParser();
    const intent = parser.parse(frame({ leftStick: new Vec2(2, 0) }), 1 / 120);

    expect(intent.moveDir.x).toBeCloseTo(1);
    expect(intent.moveDir.y).toBeCloseTo(0);
    expect(intent.faceDir.x).toBeCloseTo(1);
    expect(intent.desiredTouch).toBe('push');
  });

  it('uses right stick as independent facing intent', () => {
    const parser = new IntentParser();
    const intent = parser.parse(
      frame({ leftStick: new Vec2(0, 1), rightStick: new Vec2(1, 0) }),
      1 / 120,
    );

    expect(intent.moveDir.y).toBeCloseTo(1);
    expect(intent.faceDir.x).toBeCloseTo(1);
    expect(intent.faceDir.y).toBeCloseTo(0);
  });

  it('accumulates deterministic pass charge and emits on release', () => {
    const parser = new IntentParser({ fullChargeSeconds: 0.5 });

    for (let i = 0; i < 30; i += 1) {
      parser.parse(frame({ passHeld: true }), 1 / 120);
    }

    const intent = parser.parse(frame({ passReleased: true }), 1 / 120);
    expect(intent.action).toBe('short_pass');
    expect(intent.charge).toBeCloseTo(0.5, 2);
  });

  it('maps combined through and lob input to a lofted through intent', () => {
    const parser = new IntentParser();
    parser.parse(frame({ throughPassHeld: true, lobHeld: true }), 0.1);
    const intent = parser.parse(
      frame({ throughPassReleased: true, lobHeld: true }),
      0.1,
    );

    expect(intent.action).toBe('lob_pass');
    expect(intent.passModifier).toBe('lob_through');
  });

  it('prioritises shielding and requests cancellation while charging', () => {
    const parser = new IntentParser();
    const intent = parser.parse(
      frame({ passHeld: true, shield: 1, leftStick: new Vec2(0, 1) }),
      1 / 120,
    );

    expect(intent.isShielding).toBe(true);
    expect(intent.desiredTouch).toBe('shield');
    expect(intent.cancelRequested).toBe(true);
  });

  it('derives knock-on touch from sprinting directional intent', () => {
    const parser = new IntentParser();
    const intent = parser.parse(
      frame({ leftStick: new Vec2(0, 1), sprint: 1 }),
      1 / 120,
    );

    expect(intent.desiredTouch).toBe('knock_on');
  });
});
