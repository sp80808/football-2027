import { Vec2 } from './Math';

/**
 * FC 26 control mapping (keyboard / gamepad analogue for football-2027):
 *
 * PASSING
 * - Short pass:        F / Space          | A (pad)
 * - Through ball:      R                  | Y (pad)
 * - Lob / cross:       E + pass           | X + pass (pad)
 * - Driven pass:       Shift + pass hold  | RB + pass (pad)
 * - Driven through:    Shift + R + pass   | LB + RB + Y (pad)
 *
 * SHOOTING
 * - Normal shot:       G / Enter hold     | B (pad)
 * - Finesse (curl):    Q + shoot          | RB + B (pad)
 * - Chip:              Alt + shoot        | LB + B (pad)
 * - Low driven:        shoot release + tap shoot again within 0.35s | B + B (pad)
 * - Power (full arc):  full charge, no modifier
 *
 * DRIBBLING / SKILLS
 * - Sprint:            Shift              | RT (pad)
 * - Shield:            Ctrl               | LT (pad)
 * - Knock-on:          sprint + direction | RT + stick (auto)
 * - Skill / feint:     C                  | RS flick (simplified: C)
 * - Ball roll:         C + no direction   | C tap
 * - Step-over fake:    C + direction      | C + stick
 *
 * CAMERA (settings menu — FC tele/broadcast / pro cam analogue)
 * - Broadcast, Action, Steady, Dynamic
 */

export interface ControllerFrame {
  leftStick: Vec2;
  rightStick: Vec2;
  sprint: number;
  shield: number;
  passPressed: boolean;
  passHeld: boolean;
  passReleased: boolean;
  throughPassPressed: boolean;
  throughPassHeld: boolean;
  throughPassReleased: boolean;
  shootPressed: boolean;
  shootHeld: boolean;
  shootReleased: boolean;
  lobHeld: boolean;
  finesseHeld: boolean;
  chipHeld: boolean;
  drivenHeld: boolean;
  skillPressed: boolean;
  lowDrivenTap: boolean;
  tacklePressed: boolean;
  slidePressed: boolean;
  switchPressed: boolean;
  keeperRushHeld: boolean;
}

export function createEmptyFrame(): ControllerFrame {
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
  };
}

export type TouchAction = 'cushion' | 'push' | 'shield' | 'knock_on';
export type PassModifier = 'none' | 'through' | 'lob' | 'driven' | 'lob_through';
export type ShotModifier = 'none' | 'finesse' | 'chip' | 'low_driven' | 'power';
export type SkillMove = 'none' | 'knock_on' | 'step_over' | 'ball_roll' | 'drag_back' | 'fake_shot';
export type BallAction =
  | 'none'
  | 'short_pass'
  | 'through_pass'
  | 'lob_pass'
  | 'driven_pass'
  | 'long_pass'
  | 'shot'
  | 'first_time'
  | 'cross';

export interface PlayerIntent {
  moveDir: Vec2;
  faceDir: Vec2;
  urgency: number;
  desiredTouch: TouchAction;
  action: BallAction;
  passModifier: PassModifier;
  shotModifier: ShotModifier;
  skillMove: SkillMove;
  charge: number;
  isShielding: boolean;
  isContaining: boolean;
  cancelRequested: boolean;
}
