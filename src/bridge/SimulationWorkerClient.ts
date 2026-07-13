import { ControllerFrame } from '../engine/Intent';
import { WorldState } from '../engine/WorldState';
import { SimulationConfig } from '../engine/SimulationConfig';

export class SimulationWorkerClient {
  private worker: Worker;
  private stateBuffer: Float32Array;
  
  constructor() {
    this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), {
      type: 'module'
    });
    
    // For now we use standard messaging or SharedArrayBuffer if available.
    // 5 floats: playerX, playerY, ballX, ballY, ballZ
    this.stateBuffer = new Float32Array(5);
    
    this.worker.onmessage = (e) => {
      if (e.data.type === 'STATE_UPDATE') {
        this.stateBuffer.set(e.data.state);
      }
    };
  }
  
  init() {
    this.worker.postMessage({ type: 'INIT' });
  }

  submitInput(input: ControllerFrame) {
    this.worker.postMessage({
      type: 'INPUT',
      input: {
        x: input.leftStick.x,
        y: input.leftStick.y
      }
    });
  }

  getRenderState(): WorldState {
    // This maps the flat Float32Array back to the expected WorldState structure
    // Since we're in a transition phase, we will return a minimal mocked WorldState
    return {
      tick: 0,
      player: {
        pos: { x: this.stateBuffer[0], y: this.stateBuffer[1], clone: () => ({ x: this.stateBuffer[0], y: this.stateBuffer[1] } as any) } as any,
        vel: { x: 0, y: 0, mag: () => 0, clone: () => ({ x: 0, y: 0 } as any) } as any,
        facing: { x: 0, y: 1, clone: () => ({ x: 0, y: 1 } as any) } as any,
        controlState: 'free',
        isCharging: false,
        chargeStart: 0,
        chargeType: 'pass'
      },
      ball: {
        pos: { x: this.stateBuffer[2], y: this.stateBuffer[3], z: this.stateBuffer[4] } as any,
        vel: { x: 0, y: 0, z: 0, mag: () => 0, clone: () => ({ x: 0, y: 0, z: 0 } as any) } as any
      },
      keeper: {
        pos: { x: 0, y: 52, clone: () => ({ x: 0, y: 52 } as any) } as any,
        facing: { x: 0, y: -1, clone: () => ({ x: 0, y: -1 } as any) } as any
      }
    };
  }
}
