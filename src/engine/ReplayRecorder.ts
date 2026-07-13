import { ControllerFrame } from './Intent';
import { Vec2 } from './Math';

export interface ReplayFrame {
  tick: number;
  input: ControllerFrame;
}

export interface ReplayData {
  seed: number;
  skipKickoff?: boolean;
  frames: ReplayFrame[];
}

export function cloneControllerFrame(input: ControllerFrame): ControllerFrame {
  return {
    ...input,
    leftStick: input.leftStick.clone(),
    rightStick: input.rightStick.clone(),
  };
}

export function createEmptyControllerFrame(): ControllerFrame {
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
  };
}

export class ReplayRecorder {
  private initialSeed: number;
  private skipKickoff: boolean;
  private frames: ReplayFrame[] = [];

  constructor(seed: number, options?: { skipKickoff?: boolean }) {
    this.initialSeed = seed;
    this.skipKickoff = options?.skipKickoff ?? false;
  }

  recordFrame(tick: number, input: ControllerFrame) {
    this.frames.push({ tick, input: cloneControllerFrame(input) });
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  clear() {
    this.frames = [];
  }

  getReplayData(): ReplayData {
    return {
      seed: this.initialSeed,
      skipKickoff: this.skipKickoff,
      frames: this.frames.map((frame) => ({
        tick: frame.tick,
        input: cloneControllerFrame(frame.input),
      })),
    };
  }
}
