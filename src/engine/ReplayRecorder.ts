import { ControllerFrame } from './Intent';

interface ReplayFrame {
  tick: number;
  input: ControllerFrame;
}

export class ReplayRecorder {
  private initialSeed: number;
  private frames: ReplayFrame[] = [];
  
  constructor(seed: number) {
    this.initialSeed = seed;
  }

  recordFrame(tick: number, input: ControllerFrame) {
    // Clone input to avoid reference mutations
    const inputClone: ControllerFrame = {
      ...input,
      leftStick: input.leftStick.clone(),
      rightStick: input.rightStick.clone(),
    };
    this.frames.push({ tick, input: inputClone });
  }

  getReplayData() {
    return {
      seed: this.initialSeed,
      frames: this.frames
    };
  }
}
