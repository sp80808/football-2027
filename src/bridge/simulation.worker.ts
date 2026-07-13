// Web Worker for WASM simulation
// @ts-ignore
import init, { SimulationCore } from '../../simulation/pkg/football_sim.js';

let core: any = null;
let interval: any = null;
let inputX = 0;
let inputY = 0;

async function initWasm() {
  try {
    await init();
    core = new SimulationCore();

    // Start fixed timestep loop at 120Hz
    interval = setInterval(() => {
      core.tick(inputX, inputY);

      const state = core.get_state();
      self.postMessage({
        type: 'STATE_UPDATE',
        state: state
      });
    }, 1000 / 120);
  } catch (error) {
    console.warn('[simulation.worker] WASM init failed; worker idle.', error);
  }
}

self.onmessage = (e) => {
  if (e.data.type === 'INIT') {
    initWasm();
  } else if (e.data.type === 'INPUT') {
    inputX = e.data.input.x;
    inputY = e.data.input.y;
  }
};
