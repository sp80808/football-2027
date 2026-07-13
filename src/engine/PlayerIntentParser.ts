/**
 * PlayerIntentParser
 *
 * Converts raw ControllerFrame + current game context into a normalised
 * PlayerIntent.  This layer sits between hardware input and the physics
 * simulation, making it easy to swap input sources (AI, replay, network)
 * without touching Player.ts locomotion logic.
 */

import { Vec2 } from './Math';
import { ControllerFrame, PlayerIntent, TouchAction, BallAction } from './Intent';
import { SimulationConfig } from './SimulationConfig';

interface ParseContext {
  playerSpeed: number;          // current player speed (m/s)
  chargeDuration: number;       // seconds charge has been held
  isCharging: boolean;
  ballGrounded: boolean;        // ball.pos.z <= 0
  ballInControl: boolean;       // 'under_control' | 'loose_nearby'
}

export function parseIntent(
  frame: ControllerFrame,
  ctx: ParseContext,
): PlayerIntent {
  const cfg = SimulationConfig;

  // ── Movement ─────────────────────────────────────────────────────────
  const moveDir = frame.leftStick.clone();

  // ── Facing ────────────────────────────────────────────────────────────
  // Right stick overrides; otherwise use movement direction.
  const hasMoveInput = moveDir.magSq() > 0.01;
  const hasRightStick = frame.rightStick.magSq() > 0.1;
  const faceDir = hasRightStick
    ? frame.rightStick.clone().normalize()
    : hasMoveInput
      ? moveDir.clone().normalize()
      : new Vec2(0, 1); // default forward

  // ── Urgency ───────────────────────────────────────────────────────────
  const urgency = frame.sprint > 0.5 ? 1.0 : hasMoveInput ? 0.6 : 0.0;

  // ── Touch quality ─────────────────────────────────────────────────────
  let desiredTouch: TouchAction = 'push';
  if (frame.shield > 0.5) {
    desiredTouch = 'shield';
  } else if (urgency >= 1.0 && ctx.playerSpeed > cfg.PLAYER_SPRINT_SPEED * 0.7) {
    desiredTouch = 'knock_on'; // big touch ahead when sprinting
  } else if (ctx.playerSpeed < 2.0) {
    desiredTouch = 'cushion';  // gentle touch at slow pace / on arrival
  }

  // ── Ball action ───────────────────────────────────────────────────────
  let action: BallAction = 'none';
  const chargeFraction = Math.max(
    cfg.MIN_CHARGE_FRACTION,
    ctx.chargeDuration / cfg.MAX_CHARGE_TIME,
  );

  if (frame.shootReleased && ctx.isCharging) {
    action = 'shot';
  } else if (frame.throughPassReleased && ctx.isCharging) {
    action = 'through_pass';
  } else if (frame.passReleased && ctx.isCharging) {
    action = frame.shootHeld ? 'long_pass' : 'short_pass';
  } else if (frame.shootHeld || frame.shootPressed) {
    action = 'shot'; // indicates charging intent
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
    charge: chargeFraction,
    isShielding: frame.shield > 0.5,
    cancelRequested: false,
  };
}
