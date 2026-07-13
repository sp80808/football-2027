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
    this.renderState.homeTeam[0].pos.set(this.stateBuffer[0], this.stateBuffer[1]);
    this.renderState.homeTeam[0].vel.set(0, 0);
    this.renderState.homeTeam[0].facing.set(0, 1);
    this.renderState.homeTeam[0].controlState = 'free';
    this.renderState.homeTeam[0].isCharging = false;
    this.renderState.homeTeam[0].chargeStart = 0;
    this.renderState.homeTeam[0].chargeType = 'pass';

    this.renderState.ball.pos.set(this.stateBuffer[2], this.stateBuffer[3], this.stateBuffer[4]);
    this.renderState.ball.vel.set(0, 0, 0);

    this.renderState.homeKeeper.pos.set(0, 52);
    this.renderState.homeKeeper.facing.set(0, -1);
    this.renderState.homeKeeper.aiState = 'positioning';

    this.renderState.awayTeam[0].pos.set(0, 25);
    this.renderState.awayTeam[0].vel.set(0, 0);
    this.renderState.awayTeam[0].facing.set(0, -1);
    
    this.renderState.scorePlayer = 0;
    this.renderState.scoreOpponent = 0;
    this.renderState.lastGoalScorer = null;

    return this.renderState;
  }
}
