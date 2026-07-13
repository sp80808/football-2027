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
      
      // Update TS engine which manages its own fixed timestep
      tsEngine.update(time);
      
      // Get current input to send to WASM
      const input = tsEngine.input.currentFrame;

      // Send input to WASM worker
      wasmClient.submitInput(input);

      // Throttled HUD update
      if (Math.random() < 0.1) {
        setForceRender({});
      }
    };
    reqId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(reqId);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <RenderingPanel useWasm={useWasm} engine={tsEngine} wasmClient={wasmClient} />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10 }}>
        <button 
          onClick={() => setUseWasm(!useWasm)}
          style={{ padding: '8px 16px', background: '#333', color: 'white', border: '1px solid #666', cursor: 'pointer' }}
        >
          Toggle WASM Simulation (Current: {useWasm ? 'WASM' : 'TS'})
        </button>
      </div>
      <HUD engine={tsEngine} />
    </div>
  );
}
