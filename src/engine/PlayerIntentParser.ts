/**
 * Converts raw controller input and current context into a normalised intent.
 * This keeps hardware, replay, AI and future network input separate from physics.
 */
import { Vec2 } from './Math';
import {
  ControllerFrame,
  PlayerIntent,
  TouchAction,
  BallAction,
  PassModifier,
  ShotModifier,
  SkillMove,
} from './Intent';
import { SimulationConfig } from './SimulationConfig';

interface ParseContext {
  playerSpeed: number;
  chargeDuration: number;
  isCharging: boolean;
  chargeType: 'pass' | 'shoot';
  ballGrounded: boolean;
  ballInControl: boolean;
}

export function resolvePassModifier(frame: ControllerFrame): PassModifier {
  if (frame.throughPassHeld || frame.throughPassReleased) {
    if (frame.lobHeld) return 'lob_through';
    if (frame.drivenHeld) return 'driven';
    return 'through';
  }
  if (frame.lobHeld) return 'lob';
  if (frame.drivenHeld) return 'driven';
  return 'none';
}

export function resolveShotModifier(frame: ControllerFrame, charge: number): ShotModifier {
  if (frame.chipHeld) return 'chip';
  if (frame.finesseHeld) return 'finesse';
  if (frame.lowDrivenTap) return 'low_driven';
  if (charge >= 0.95 && !frame.finesseHeld && !frame.chipHeld) return 'power';
  return 'none';
}

export function modifierLabel(
  passModifier: PassModifier,
  shotModifier: ShotModifier,
  action: BallAction,
): string | null {
  if (action === 'shot' || action === 'first_time') {
    if (shotModifier === 'finesse') return 'Finesse';
    if (shotModifier === 'chip') return 'Chip Shot';
    if (shotModifier === 'low_driven') return 'Low Driven';
    if (shotModifier === 'power') return 'Power Shot';
    return null;
  }
  if (passModifier === 'through') return 'Through Ball';
  if (passModifier === 'lob') return 'Lob Pass';
  if (passModifier === 'driven') return 'Driven Pass';
  if (passModifier === 'lob_through') return 'Lobbed Through';
  return null;
}

export function parseIntent(frame: ControllerFrame, ctx: ParseContext): PlayerIntent {
  const cfg = SimulationConfig;
  const moveDir = frame.leftStick.clone();
  const hasMoveInput = moveDir.magSq() > 0.01;
  const hasRightStick = frame.rightStick.magSq() > 0.1;
  const faceDir = hasRightStick
    ? frame.rightStick.clone().normalize()
    : hasMoveInput
      ? moveDir.clone().normalize()
      : new Vec2(0, 1);

  const urgency = frame.sprint > 0.5 ? 1.0 : hasMoveInput ? 0.6 : 0.0;

  let desiredTouch: TouchAction = 'push';
  if (frame.shield > 0.5) {
    desiredTouch = 'shield';
  } else if (urgency >= 1.0 && ctx.playerSpeed > cfg.PLAYER_SPRINT_SPEED * 0.7) {
    desiredTouch = 'knock_on';
  } else if (ctx.playerSpeed < 2.0) {
    desiredTouch = 'cushion';
  }

  const charge = Math.max(cfg.MIN_CHARGE_FRACTION, ctx.chargeDuration / cfg.MAX_CHARGE_TIME);
  const passModifier = resolvePassModifier(frame);
  const shotModifier = ctx.chargeType === 'shoot' ? resolveShotModifier(frame, charge) : 'none';

  let skillMove: SkillMove = 'none';
  if (frame.skillPressed && ctx.ballInControl) {
    if (hasMoveInput) skillMove = 'step_over';
    else skillMove = 'ball_roll';
  } else if (desiredTouch === 'knock_on' && hasMoveInput) {
    skillMove = 'knock_on';
  }

  let action: BallAction = 'none';
  if (frame.shootReleased && ctx.isCharging && ctx.chargeType === 'shoot') {
    action = 'shot';
  } else if ((frame.throughPassReleased || frame.passReleased) && ctx.isCharging && ctx.chargeType === 'pass') {
    if (passModifier === 'lob' || passModifier === 'lob_through') action = 'lob_pass';
    else if (passModifier === 'driven') action = 'driven_pass';
    else if (passModifier === 'through') action = 'through_pass';
    else if (frame.shootHeld) action = 'long_pass';
    else action = 'short_pass';
  } else if (frame.shootHeld || frame.shootPressed) {
    action = 'shot';
  } else if (frame.passHeld || frame.passPressed) {
    action = passModifier === 'lob' ? 'lob_pass' : 'short_pass';
  } else if (frame.throughPassHeld || frame.throughPassPressed) {
    action = passModifier === 'lob' ? 'lob_pass' : 'through_pass';
  }

  return {
    moveDir,
    faceDir,
    urgency,
    desiredTouch,
    action,
    passModifier,
    shotModifier,
    skillMove,
    charge,
    isShielding: frame.shield > 0.5,
    cancelRequested: false,
  };
}
