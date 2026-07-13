import React, { useEffect, useState } from 'react';
import {
  Zap,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  ChevronsUp,
  Shield,
  Crosshair,
  Footprints,
  GitBranch,
  RefreshCw,
  Activity,
  Cpu,
  Gauge,
} from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';

// ─── Types ────────────────────────────────────────────────────────────────────
interface HUDProps {
  engine: GameEngine;
  useWasm: boolean;
  onToggleWasm: () => void;
}

// ─── Small helpers ────────────────────────────────────────────────────────────
function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex items-center justify-center px-1.5 py-0.5 rounded text-[10px] font-mono font-semibold bg-white/15 border border-white/30 text-white leading-none min-w-[22px]">
      {children}
    </kbd>
  );
}

function Row({ label, keys, icon }: { label: string; keys: React.ReactNode[]; icon?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      {icon && <span className="text-white/50 shrink-0">{icon}</span>}
      <span className="text-white/70 text-[11px] w-[72px] shrink-0">{label}</span>
      <span className="flex gap-1 flex-wrap">
        {keys.map((k, i) => <Kbd key={i}>{k}</Kbd>)}
      </span>
    </li>
  );
}

function StatRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <>
      <span className="text-white/50 text-[11px]">{label}</span>
      <span className={`text-right text-[11px] font-mono ${accent ?? 'text-white'}`}>{value}</span>
    </>
  );
}

// ─── Main HUD ─────────────────────────────────────────────────────────────────
export function HUD({ engine, useWasm, onToggleWasm }: HUDProps) {
  const [diag, setDiag] = useState({
    tps: 0,
    fps: 0,
    playerSpeed: '0.00',
    ballVelocity: '0.00',
    controlState: 'free',
    keeperState: 'positioning' as 'positioning' | 'diving' | 'recovering',
    charging: false,
    chargeType: 'pass' as 'pass' | 'shoot',
    chargePct: 0,
  });

  useEffect(() => {
    let frames = 0;
    let lastFpsTime = performance.now();
    let fps = 0;

    const raf = () => {
      frames++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        fps = frames;
        frames = 0;
        lastFpsTime = now;
      }
      handle = requestAnimationFrame(raf);
    };
    let handle = requestAnimationFrame(raf);

    const interval = setInterval(() => {
      const state = engine.getRenderState();
      setDiag({
        tps: engine.tps,
        fps,
        playerSpeed: state.player.vel.mag().toFixed(1),
        ballVelocity: state.ball.vel.mag().toFixed(1),
        controlState: state.player.controlState,
        keeperState: state.keeper.aiState,
        charging: state.player.isCharging,
        chargeType: state.player.chargeType,
        chargePct: Math.min(100, Math.round((state.player.chargeStart / 1.5) * 100)),
      });
    }, 80);

    return () => {
      clearInterval(interval);
      cancelAnimationFrame(handle);
    };
  }, [engine]);

  const keeperBadge: Record<string, string> = {
    positioning: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
    diving:      'bg-red-500/20 text-red-300 border-red-500/30',
    recovering:  'bg-amber-500/20 text-amber-300 border-amber-500/30',
  };

  const controlBadge: Record<string, string> = {
    free:          'bg-white/10 text-white/60',
    loose_nearby:  'bg-amber-500/20 text-amber-300',
    under_control: 'bg-blue-500/20 text-blue-300',
    shielding:     'bg-purple-500/20 text-purple-300',
    receiving:     'bg-cyan-500/20 text-cyan-300',
    stretching:    'bg-orange-500/20 text-orange-300',
  };

  return (
    <>
      {/* ── Controls legend (bottom-left) ───────────────────────────────── */}
      <div className="absolute bottom-4 left-4 pointer-events-none select-none">
        <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-3 min-w-[220px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2 px-0.5">Controls</p>
          <ul className="space-y-1.5">
            <Row
              label="Move"
              icon={<ArrowUp size={12} />}
              keys={['W', 'A', 'S', 'D', '↑', '↓']}
            />
            <Row
              label="Sprint"
              icon={<ChevronsUp size={12} />}
              keys={['Shift']}
            />
            <Row
              label="Shield"
              icon={<Shield size={12} />}
              keys={['Ctrl']}
            />
            <div className="border-t border-white/10 my-1" />
            <Row
              label="Pass"
              icon={<Footprints size={12} />}
              keys={['F', 'Space']}
            />
            <Row
              label="Shoot"
              icon={<Crosshair size={12} />}
              keys={['G', '↵']}
            />
            <Row
              label="Through"
              icon={<GitBranch size={12} />}
              keys={['R']}
            />
            <Row
              label="Tackle"
              icon={<Zap size={12} />}
              keys={['T']}
            />
          </ul>
          <p className="text-[10px] text-white/30 mt-2 leading-tight">Hold pass/shoot to charge. Release to kick.</p>
        </div>
      </div>

      {/* ── Charge bar (bottom-centre, only when charging) ───────────────── */}
      {diag.charging && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 pointer-events-none select-none">
          <div className="bg-black/70 backdrop-blur-sm border border-white/10 rounded-lg px-4 py-2 min-w-[180px]">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-white/60 font-medium capitalize">
                {diag.chargeType === 'shoot' ? 'Shooting' : 'Passing'}
              </span>
              <span className={`text-[11px] font-mono font-bold ${diag.chargeType === 'shoot' ? 'text-red-400' : 'text-blue-400'}`}>
                {diag.chargePct}%
              </span>
            </div>
            <div className="w-full h-2.5 bg-white/10 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-none ${diag.chargeType === 'shoot' ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`}
                style={{ width: `${diag.chargePct}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* ── Diagnostics (top-right) ──────────────────────────────────────── */}
      <div className="absolute top-4 right-4 pointer-events-none select-none">
        <div className="bg-black/60 backdrop-blur-sm border border-white/10 rounded-xl p-3 min-w-[190px]">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-white/40 mb-2 px-0.5">Diagnostics</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <StatRow label="FPS" value={diag.fps} accent="text-green-400" />
            <StatRow label="TPS" value={diag.tps} accent="text-blue-400" />
            <StatRow label="Player" value={`${diag.playerSpeed} m/s`} />
            <StatRow label="Ball" value={`${diag.ballVelocity} m/s`} />
          </div>

          {/* Control state badge */}
          <div className="mt-2.5 flex items-center gap-2">
            <Activity size={11} className="text-white/30 shrink-0" />
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${controlBadge[diag.controlState] ?? 'bg-white/10 text-white/60 border-white/10'}`}
            >
              {diag.controlState.replace('_', ' ')}
            </span>
          </div>

          {/* Keeper state badge */}
          <div className="mt-1.5 flex items-center gap-2">
            <Shield size={11} className="text-white/30 shrink-0" />
            <span
              className={`text-[10px] font-medium px-1.5 py-0.5 rounded border ${keeperBadge[diag.keeperState] ?? 'bg-white/10 text-white/60 border-white/10'}`}
            >
              GK — {diag.keeperState}
            </span>
          </div>
        </div>
      </div>

      {/* ── Sim toggle (top-left) ─────────────────────────────────────────── */}
      <div className="absolute top-4 left-4 pointer-events-auto select-none">
        <button
          onClick={onToggleWasm}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-black/60 backdrop-blur-sm border border-white/10 hover:bg-white/10 transition-colors text-white text-[11px] font-medium"
        >
          <Cpu size={12} />
          <span>Sim: <span className={useWasm ? 'text-amber-300' : 'text-blue-300'}>{useWasm ? 'WASM' : 'TypeScript'}</span></span>
          <RefreshCw size={11} className="text-white/40" />
        </button>
      </div>
    </>
  );
}
