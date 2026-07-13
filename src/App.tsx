/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { RenderingPanel } from './debug/RenderingPanel';
import { GameEngine } from './engine/GameEngine';
import { SimulationWorkerClient } from './bridge/SimulationWorkerClient';
import { HUD } from './components/HUD';
import { WorldState } from './engine/WorldState';

// Initialize the TS engine
const tsEngine = new GameEngine();
tsEngine.init();

// Initialize the WASM worker client
const wasmClient = new SimulationWorkerClient();
wasmClient.init();

export default function App() {
  const [useWasm, setUseWasm] = useState(false);
  const [, setForceRender] = useState({});
  const [replayMode, setReplayMode] = useState(false);
  const [replayFrame, setReplayFrame] = useState(0);
  const [showOffsideLine, setShowOffsideLine] = useState(false);
  
  const replayItems = useRef<WorldState[]>([]);

  useEffect(() => {
    let reqId: number;

    const loop = (time: number) => {
      reqId = requestAnimationFrame(loop);
      
      // Update TS engine which manages its own fixed timestep
      // In replay mode we keep it running in the background, or pause it. Let's keep it running.
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

  const handleToggleReplay = () => {
    if (!replayMode) {
      // Enter replay mode, capture buffer
      replayItems.current = tsEngine.replayBuffer.getItems();
      setReplayFrame(Math.max(0, replayItems.current.length - 1));
      setReplayMode(true);
    } else {
      setReplayMode(false);
    }
  };

  const currentReplayState = replayMode && replayItems.current.length > 0 
    ? replayItems.current[replayFrame] 
    : null;

  return (
    <div style={{ width: '100vw', height: '100vh', overflow: 'hidden' }}>
      <RenderingPanel 
        useWasm={useWasm} 
        engine={tsEngine} 
        wasmClient={wasmClient} 
        replayState={currentReplayState}
        showOffsideLine={replayMode && showOffsideLine}
      />
      <div style={{ position: 'absolute', top: 10, left: 10, zIndex: 10, display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <button 
          onClick={() => setUseWasm(!useWasm)}
          style={{ padding: '8px 16px', background: '#333', color: 'white', border: '1px solid #666', cursor: 'pointer' }}
        >
          Toggle WASM Simulation (Current: {useWasm ? 'WASM' : 'TS'})
        </button>
        <button 
          onClick={handleToggleReplay}
          style={{ padding: '8px 16px', background: replayMode ? '#b91c1c' : '#333', color: 'white', border: '1px solid #666', cursor: 'pointer' }}
        >
          {replayMode ? 'Exit Replay' : 'Instant Replay'}
        </button>
      </div>

      {replayMode && (
        <div style={{ position: 'absolute', bottom: 40, left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: 'rgba(0,0,0,0.8)', padding: '20px', borderRadius: '8px', color: 'white', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', minWidth: '400px' }}>
          <h2 style={{ margin: 0, color: '#ff4444' }}>REPLAY MODE</h2>
          <div style={{ width: '100%', display: 'flex', gap: '16px', alignItems: 'center' }}>
            <span>T -5s</span>
            <input 
              type="range" 
              min={0} 
              max={Math.max(0, replayItems.current.length - 1)} 
              value={replayFrame} 
              onChange={(e) => setReplayFrame(parseInt(e.target.value))}
              style={{ flex: 1 }}
            />
            <span>Now</span>
          </div>
          <div>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" checked={showOffsideLine} onChange={(e) => setShowOffsideLine(e.target.checked)} />
              Show Offside Line
            </label>
          </div>
        </div>
      )}

      <HUD engine={tsEngine} />
    </div>
  );
}
