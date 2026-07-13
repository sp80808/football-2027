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
  ballReceiving: boolean;
  incomingBallSpeed: number;
  playerPos?: Vec2;
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

  const isContaining = frame.shield > 0.5 && !ctx.ballInControl;
  const isShielding = frame.shield > 0.5 && ctx.ballInControl;
  let desiredTouch: TouchAction = 'push';
  if (isShielding) {
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
    const backing = hasMoveInput && moveDir.dot(faceDir) < -0.35;
    if (backing) skillMove = 'drag_back';
    else if (hasMoveInput) skillMove = 'step_over';
    else skillMove = 'ball_roll';
  } else if (desiredTouch === 'knock_on' && hasMoveInput) skillMove = 'knock_on';
  else if (ctx.chargeType==='shoot'&&frame.shootReleased&&ctx.isCharging&&ctx.chargeDuration<cfg.FAKE_SHOT_MAX_CHARGE&&ctx.ballInControl) skillMove='fake_shot';

  let action: BallAction = 'none';
  if (ctx.ballReceiving && frame.shootReleased && ctx.isCharging && ctx.chargeType === 'shoot') {
    action = 'first_time';
  } else if (ctx.ballReceiving && (frame.passReleased || frame.throughPassReleased) && ctx.isCharging && ctx.chargeType === 'pass') {
    action = 'first_time';
  } else if (frame.shootReleased && ctx.isCharging && ctx.chargeType === 'shoot') {
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

  if (action === 'lob_pass' && ctx.playerPos) {
    const isWing = Math.abs(ctx.playerPos.x) > cfg.PITCH_HALF_WIDTH - 18;
    const isAttackingHalf = ctx.playerPos.y > cfg.PITCH_HALF_LENGTH * 0.25;
    if (isWing && isAttackingHalf) {
      action = 'cross';
    }
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
    isShielding,
    isContaining,
    cancelRequested: false,
  };
}
