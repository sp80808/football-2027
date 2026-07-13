import { ControllerFrame } from '../engine/Intent';
import { WorldState, createEmptyWorldState } from '../engine/WorldState';

export class SimulationWorkerClient {
  private worker: Worker;
  private stateBuffer = new Float32Array(5);
  private renderState: WorldState = createEmptyWorldState();

  constructor() {
    this.worker = new Worker(new URL('./simulation.worker.ts', import.meta.url), { type: 'module' });
    this.worker.onmessage = (event) => {
      if (event.data.type === 'STATE_UPDATE') this.stateBuffer.set(event.data.state);
    };
  }

  init() {
    this.worker.postMessage({ type: 'INIT' });
  }

  submitInput(input: ControllerFrame) {
    this.worker.postMessage({
      type: 'INPUT',
      input: { x: input.leftStick.x, y: input.leftStick.y },
    });
  }

  getRenderState(): WorldState {
    this.renderState.tick++;
    this.renderState.player.pos.set(this.stateBuffer[0], this.stateBuffer[1]);
    this.renderState.player.vel.set(0, 0);
    this.renderState.player.facing.set(0, 1);
    this.renderState.player.controlState = 'free';
    this.renderState.player.isCharging = false;
    this.renderState.player.chargeStart = 0;
    this.renderState.player.chargeType = 'pass';

    this.renderState.ball.pos.set(this.stateBuffer[2], this.stateBuffer[3], this.stateBuffer[4]);
    this.renderState.ball.vel.set(0, 0, 0);

    this.renderState.keeper.pos.set(0, 52);
    this.renderState.keeper.facing.set(0, -1);
    this.renderState.keeper.aiState = 'positioning';

    this.renderState.opponent.pos.set(0, 25);
    this.renderState.opponent.vel.set(0, 0);
    this.renderState.opponent.facing.set(0, -1);
    this.renderState.opponent.aiState = 'tracking';
    this.renderState.scorePlayer = 0;
    this.renderState.scoreOpponent = 0;
    this.renderState.lastGoalScorer = null;

    return this.renderState;
  }
}
