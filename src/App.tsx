/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { RenderingPanel } from './debug/RenderingPanel';
import { GameEngine } from './engine/GameEngine';
import { SimulationWorkerClient } from './bridge/SimulationWorkerClient';
import { HUD } from './components/HUD';

// Initialize the TS engine
const tsEngine = new GameEngine();
tsEngine.init();

// Initialize the WASM worker client
const wasmClient = new SimulationWorkerClient();
wasmClient.init();

export default function App() {
  const [useWasm, setUseWasm] = useState(false);
  const [, setForceRender] = useState({});

  useEffect(() => {
    let reqId: number;

    const loop = (time: number) => {
      reqId = requestAnimationFrame(loop);
      
      // The TS engine handles its own fixed timestep internally
      tsEngine.update(time);

      // In WASM mode, we would sample the input and submit it here.
      if (useWasm) {
        // Sample input and submit to WASM
        const currentInput = tsEngine.input.currentFrame;
        wasmClient.submitInput(currentInput);
      }

      // Throttled HUD update for React
      if (Math.random() < 0.1) {
        setForceRender({});
      }
    };
    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, [useWasm]);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <RenderingPanel useWasm={useWasm} engine={tsEngine} wasmClient={wasmClient} />
      <HUD engine={tsEngine} useWasm={useWasm} onToggleWasm={() => setUseWasm(w => !w)} />
    </div>
  );
}


