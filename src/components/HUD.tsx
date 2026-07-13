/**
 * HUD — Broadcast-style match HUD overlay.
 *
 * Renders as React DOM elements positioned on top of the Three.js canvas.
 * Uses Tailwind CSS classes. No Three.js imports.
 */
import React, { useEffect, useRef, useState } from 'react';
import { GameEngine } from '../engine/GameEngine';
import { BallControlState } from '../engine/Player';

// ── Types ─────────────────────────────────────────────────────────────────────

interface DiagState {
  tps: number;
  fps: number;
  playerSpeed: string;
  ballVelocity: string;
  ballHeight: string;
  controlState: BallControlState;
  inputX: string;
  inputY: string;
  simMode: string;
  chargeProgress: number;
  chargeType: 'pass' | 'shoot';
  isCharging: boolean;
  isDiving: boolean;
  keeperState: string;
}

interface HUDProps {
  engine: GameEngine;
  simMode?: 'TS' | 'WASM';
}

// ── Sub-components ────────────────────────────────────────────────────────────

function PowerMeter({ charge, type, visible }: { charge: number; type: 'pass' | 'shoot'; visible: boolean }) {
  if (!visible) return null;
  const color = type === 'shoot' ? '#ef4444' : '#3b82f6';
  const label = type === 'shoot' ? 'SHOT' : 'PASS';
  const pct   = Math.round(charge * 100);

  return (
    <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1 pointer-events-none">
      <div className="w-52 h-2.5 bg-black/40 rounded-full overflow-hidden border border-white/20">
        <div
          className="h-full rounded-full transition-none"
          style={{ width: `${pct}%`, background: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <span className="text-xs font-bold tracking-widest text-white/80" style={{ textShadow: '0 1px 4px #000' }}>
        {label} {pct}%
      </span>
    </div>
  );
}

function ControlBadge({ state }: { state: BallControlState }) {
  const map: Partial<Record<BallControlState, { label: string; cls: string }>> = {
    under_control: { label: 'ON BALL', cls: 'bg-green-500/90 text-white' },
    loose_nearby:  { label: 'LOOSE',   cls: 'bg-yellow-500/90 text-black' },
    receiving:     { label: 'RECEIVING', cls: 'bg-blue-500/90 text-white' },
    shielding:     { label: 'SHIELDING', cls: 'bg-purple-500/90 text-white' },
  };
  const entry = map[state];
  if (!entry) return null;
  return (
    <div className="absolute top-4 left-1/2 -translate-x-1/2 pointer-events-none">
      <span className={`${entry.cls} text-xs font-extrabold px-3 py-1 rounded-full tracking-widest uppercase shadow-lg`}>
        {entry.label}
      </span>
    </div>
  );
}

function SpeedBar({ speed }: { speed: number }) {
  const max = 9.5;
  const pct = Math.min(100, (speed / max) * 100);
  const isSprint = speed > 7;
  return (
    <div className="flex items-center gap-2 w-28">
      <div className="flex-1 h-1.5 bg-white/20 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-none"
          style={{
            width: `${pct}%`,
            background: isSprint ? '#f59e0b' : '#22d3ee',
          }}
        />
      </div>
      <span className="text-xs tabular-nums text-white/60 w-10 text-right">{speed.toFixed(1)} m/s</span>
    </div>
  );
}

function SimBadge({ mode }: { mode: string }) {
  return (
    <span className={`text-xs font-bold px-2 py-0.5 rounded ${mode === 'WASM' ? 'bg-amber-500/80 text-black' : 'bg-blue-600/80 text-white'}`}>
      {mode}
    </span>
  );
}

// ── Main HUD ──────────────────────────────────────────────────────────────────

export function HUD({ engine, simMode = 'TS' }: HUDProps) {
  const [d, setD] = useState<DiagState>({
    tps: 0, fps: 0,
    playerSpeed: '0.00', ballVelocity: '0.00', ballHeight: '0.00',
    controlState: 'free', inputX: '0.00', inputY: '0.00',
    simMode: 'TS',
    chargeProgress: 0, chargeType: 'pass', isCharging: false,
    isDiving: false, keeperState: 'idle',
  });

  const [showHelp, setShowHelp] = useState(true);
  const fpsRef  = useRef(0);
  const frameRef = useRef(0);
  const lastFpsTime = useRef(performance.now());

  // FPS counter via rAF
  useEffect(() => {
    let raf: number;
    const tick = (now: number) => {
      frameRef.current++;
      if (now - lastFpsTime.current >= 1000) {
        fpsRef.current = frameRef.current;
        frameRef.current = 0;
        lastFpsTime.current = now;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  // Diagnostics poll (100 ms)
  useEffect(() => {
    const interval = setInterval(() => {
      const s = engine.getRenderState();
      const pSpeed = s.player.vel.mag();
      setD({
        tps:          engine.tps,
        fps:          fpsRef.current,
        playerSpeed:  pSpeed.toFixed(2),
        ballVelocity: s.ball.vel.mag().toFixed(2),
        ballHeight:   s.ball.pos.z.toFixed(2),
        controlState: s.player.controlState,
        inputX:       engine.input.currentFrame.leftStick.x.toFixed(2),
        inputY:       engine.input.currentFrame.leftStick.y.toFixed(2),
        simMode,
        chargeProgress: s.player.isCharging
          ? Math.min(1, s.player.chargeStart / 1.5)
          : 0,
        chargeType:  s.player.chargeType,
        isCharging:  s.player.isCharging,
        isDiving:    engine.keeper.brain.action.isDiving,
        keeperState: engine.keeper.brain.currentStateName,
      });
    }, 100);
    return () => clearInterval(interval);
  }, [engine, simMode]);

  // Toggle help with H key
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyH') setShowHelp(h => !h);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const pSpeed = parseFloat(d.playerSpeed);

  return (
    <>
      {/* ── Control badge (top-centre) ── */}
      <ControlBadge state={d.controlState} />

      {/* ── Power meter (bottom-centre) ── */}
      <PowerMeter charge={d.chargeProgress} type={d.chargeType} visible={d.isCharging} />

      {/* ── Help panel (top-left, toggle H) ── */}
      {showHelp && (
        <div className="absolute top-14 left-4 text-white text-sm bg-black/60 backdrop-blur-sm p-4 rounded-xl pointer-events-none border border-white/10 shadow-2xl">
          <h1 className="font-bold mb-2 text-base tracking-wide">⚽ Football Sandbox</h1>
          <ul className="space-y-1 text-white/80">
            <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">WASD</kbd> Move</li>
            <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">Shift</kbd> Sprint</li>
            <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">Space / J</kbd> Pass (hold → charge)</li>
            <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">K</kbd> Shoot (hold → charge)</li>
            <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">H</kbd> Toggle help</li>
            <li><kbd className="bg-white/20 px-1.5 py-0.5 rounded text-xs">Esc</kbd> Pause</li>
          </ul>
        </div>
      )}

      {/* ── Diagnostics panel (top-right) ── */}
      <div className="absolute top-4 right-4 text-white text-xs font-mono bg-black/70 backdrop-blur-sm p-3 rounded-xl pointer-events-none border border-white/10 min-w-[180px]">
        <div className="flex items-center justify-between mb-2 border-b border-white/10 pb-1">
          <span className="font-bold text-white/90">DIAG</span>
          <SimBadge mode={d.simMode} />
        </div>
        <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
          <span className="text-white/50">FPS</span>
          <span className="text-right text-green-400">{d.fps}</span>
          <span className="text-white/50">TPS</span>
          <span className="text-right text-blue-400">{d.tps}</span>
          <span className="text-white/50">Speed</span>
          <span className="text-right">{d.playerSpeed} m/s</span>
          <span className="text-white/50">Ball</span>
          <span className="text-right">{d.ballVelocity} m/s</span>
          <span className="text-white/50">Ball Z</span>
          <span className="text-right">{d.ballHeight} m</span>
          <span className="text-white/50">Control</span>
          <span className="text-right text-yellow-300 truncate">{d.controlState}</span>
          <span className="text-white/50">Keeper</span>
          <span className="text-right text-purple-300">{d.keeperState}</span>
          <span className="text-white/50">Input</span>
          <span className="text-right">{d.inputX}, {d.inputY}</span>
        </div>
        {/* Speed bar */}
        <div className="mt-2 pt-1 border-t border-white/10">
          <SpeedBar speed={pSpeed} />
        </div>
      </div>
    </>
  );
}
