import React, { useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';

export function HUD({ engine }: { engine: GameEngine }) {
  const [diagnostics, setDiagnostics] = useState({
    fps: 0,
    tps: 0,
    frameTime: '0.0',
    playerSpeed: '0.00',
    ballVelocity: '0.00',
    controlState: 'free',
    intentX: '0.00',
    intentY: '0.00',
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const renderState = engine.getRenderState();
      setDiagnostics({
        fps: 60, // Mocked for HUD
        tps: engine.tps,
        frameTime: '16.6', // Mocked for HUD
        playerSpeed: renderState.player.vel.mag().toFixed(2),
        ballVelocity: renderState.ball.vel.mag().toFixed(2),
        controlState: renderState.player.controlState,
        intentX: engine.input.currentFrame.leftStick.x.toFixed(2),
        intentY: engine.input.currentFrame.leftStick.y.toFixed(2),
      });
    }, 100);
    return () => clearInterval(interval);
  }, [engine]);

  return (
    <>
      {/* Help Panel */}
      <div className="absolute top-14 left-4 text-white text-sm bg-black/50 p-4 rounded-lg pointer-events-none">
        <h1 className="font-bold mb-2">Football Sandbox Core</h1>
        <ul className="space-y-1">
          <li><strong>Move:</strong> WASD / Left Stick</li>
          <li><strong>Sprint:</strong> Shift / RT</li>
          <li><strong>Pass:</strong> J / Space / A Button</li>
          <li><strong>Shoot:</strong> K / X Button</li>
          <li>Hold Pass/Shoot to charge. Release to kick.</li>
        </ul>
      </div>

      {/* Diagnostics Panel */}
      <div className="absolute top-4 right-4 text-white text-xs font-mono bg-black/70 p-4 rounded-lg pointer-events-none">
        <h2 className="font-bold mb-2 border-b border-gray-600 pb-1">Diagnostics</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span>TPS:</span> <span className="text-right text-blue-400">{diagnostics.tps}</span>
          <span>Speed:</span> <span className="text-right">{diagnostics.playerSpeed} m/s</span>
          <span>Ball Vel:</span> <span className="text-right">{diagnostics.ballVelocity} m/s</span>
          <span>Control:</span> <span className="text-right text-yellow-300">{diagnostics.controlState}</span>
          <span>Intent (X/Y):</span> <span className="text-right">{diagnostics.intentX}, {diagnostics.intentY}</span>
        </div>
      </div>
    </>
  );
}
