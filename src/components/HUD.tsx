import React, { useEffect, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { parseIntent } from '../engine/PlayerIntentParser';

export function HUD({ engine }: { engine: GameEngine }) {
  const [diag, setDiag] = useState({
    tps: 0,
    playerSpeed: '0.00',
    ballVelocity: '0.00',
    controlState: 'free',
    desiredTouch: 'push',
    action: 'none',
    keeperState: 'positioning',
    intentX: '0.00',
    intentY: '0.00',
    charging: false,
    chargeType: 'pass' as 'pass' | 'shoot',
    chargePct: 0,
  });

  useEffect(() => {
    const interval = setInterval(() => {
      const state = engine.getRenderState();
      const frame = engine.input.currentFrame;
      const intent = parseIntent(frame, {
        playerSpeed: state.player.vel.mag(),
        chargeDuration: state.player.chargeStart,
        isCharging: state.player.isCharging,
        ballGrounded: state.ball.pos.z <= 0,
        ballInControl:
          state.player.controlState === 'under_control' ||
          state.player.controlState === 'loose_nearby',
      });

      setDiag({
        tps: engine.tps,
        playerSpeed: state.player.vel.mag().toFixed(2),
        ballVelocity: state.ball.vel.mag().toFixed(2),
        controlState: state.player.controlState,
        desiredTouch: intent.desiredTouch,
        action: intent.action,
        keeperState: state.keeper.aiState,
        intentX: frame.leftStick.x.toFixed(2),
        intentY: frame.leftStick.y.toFixed(2),
        charging: state.player.isCharging,
        chargeType: state.player.chargeType,
        chargePct: Math.round((state.player.chargeStart / 1.5) * 100),
      });
    }, 100);
    return () => clearInterval(interval);
  }, [engine]);

  const keeperColor: Record<string, string> = {
    positioning: 'text-green-400',
    diving: 'text-red-400',
    recovering: 'text-orange-400',
  };

  return (
    <>
      {/* Help Panel */}
      <div className="absolute top-14 left-4 text-white text-sm bg-black/50 p-4 rounded-lg pointer-events-none">
        <h1 className="font-bold mb-2">Football Sandbox</h1>
        <ul className="space-y-1">
          <li><strong>Move:</strong> WASD / Left Stick</li>
          <li><strong>Sprint:</strong> Shift / RT</li>
          <li><strong>Shield:</strong> Ctrl / LT</li>
          <li><strong>Pass:</strong> Space / A</li>
          <li><strong>Through:</strong> I / Y</li>
          <li><strong>Shoot:</strong> K / X</li>
          <li className="text-gray-300 text-xs pt-1">Hold to charge, release to kick.</li>
        </ul>
      </div>

      {/* Diagnostics Panel */}
      <div className="absolute top-4 right-4 text-white text-xs font-mono bg-black/70 p-4 rounded-lg pointer-events-none min-w-[200px]">
        <h2 className="font-bold mb-2 border-b border-gray-600 pb-1">Diagnostics</h2>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          <span>TPS:</span>
          <span className="text-right text-blue-400">{diag.tps}</span>

          <span>Speed:</span>
          <span className="text-right">{diag.playerSpeed} m/s</span>

          <span>Ball:</span>
          <span className="text-right">{diag.ballVelocity} m/s</span>

          <span>Control:</span>
          <span className="text-right text-yellow-300">{diag.controlState}</span>

          <span>Touch:</span>
          <span className="text-right text-cyan-300">{diag.desiredTouch}</span>

          <span>Action:</span>
          <span className="text-right text-purple-300">{diag.action}</span>

          <span>Keeper:</span>
          <span className={`text-right ${keeperColor[diag.keeperState] ?? 'text-white'}`}>
            {diag.keeperState}
          </span>

          <span>Stick:</span>
          <span className="text-right">{diag.intentX}, {diag.intentY}</span>
        </div>

        {/* Charge bar */}
        {diag.charging && (
          <div className="mt-3">
            <div className="text-xs mb-1 capitalize">
              {diag.chargeType} charge — {diag.chargePct}%
            </div>
            <div className="w-full h-2 bg-gray-700 rounded overflow-hidden">
              <div
                className={`h-full rounded transition-all ${diag.chargeType === 'shoot' ? 'bg-red-500' : 'bg-blue-400'}`}
                style={{ width: `${diag.chargePct}%` }}
              />
            </div>
          </div>
        )}
      </div>
    </>
  );
}
