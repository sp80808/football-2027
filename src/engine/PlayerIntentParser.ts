/**
 * Converts raw controller input and current context into a normalised intent.
 * This keeps hardware, replay, AI and future network input separate from physics.
 */
import { Vec2 } from './Math';
import { ControllerFrame, PlayerIntent, TouchAction, BallAction } from './Intent';
import { SimulationConfig } from './SimulationConfig';

interface ParseContext {
  playerSpeed: number;
  chargeDuration: number;
  isCharging: boolean;
  ballGrounded: boolean;
  ballInControl: boolean;
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

  let action: BallAction = 'none';
  const charge = Math.max(cfg.MIN_CHARGE_FRACTION, ctx.chargeDuration / cfg.MAX_CHARGE_TIME);

  if (frame.shootReleased && ctx.isCharging) {
    action = 'shot';
  } else if (frame.throughPassReleased && ctx.isCharging) {
    action = 'through_pass';
  } else if (frame.passReleased && ctx.isCharging) {
    action = frame.shootHeld ? 'long_pass' : 'short_pass';
  } else if (frame.shootHeld || frame.shootPressed) {
    action = 'shot';
  } else if (frame.passHeld || frame.passPressed) {
    action = 'short_pass';
  } else if (frame.throughPassHeld || frame.throughPassPressed) {
    action = 'through_pass';
  }

  return {
    moveDir,
    faceDir,
    urgency,
    desiredTouch,
    action,
    charge,
    isShielding: frame.shield > 0.5,
    cancelRequested: false,
  };
}
