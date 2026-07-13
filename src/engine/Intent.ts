import { Vec2 } from './Math';

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
  tacklePressed: boolean;
  slidePressed: boolean;
  switchPressed: boolean;
  keeperRushHeld: boolean;
}

export type TouchAction = 'cushion' | 'push' | 'shield' | 'knock_on';
export type BallAction = 'none' | 'short_pass' | 'through_pass' | 'long_pass' | 'shot' | 'first_time';

export interface PlayerIntent {
  moveDir: Vec2;        // Desired movement direction
  faceDir: Vec2;        // Desired facing direction
  urgency: number;      // 0.0 (walk) to 1.0 (sprint)
  desiredTouch: TouchAction;
  action: BallAction;
  charge: number;       // 0.0 to 1.0+
  isShielding: boolean;
  cancelRequested: boolean;
}
