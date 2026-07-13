import React, { useEffect, useState } from 'react';
import {
  Zap,
  ArrowUp,
  ChevronsUp,
  Shield,
  Crosshair,
  Footprints,
  GitBranch,
  RefreshCw,
  Activity,
  Cpu,
  Volume2,
  VolumeX,
} from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { SimulationConfig } from '../engine/SimulationConfig';
import { useGameStore } from '../store/gameStore';

interface HUDProps {
  engine: GameEngine;
  useWasm?: boolean;
  onToggleWasm?: () => void;
}

function Key({ children }: { children: React.ReactNode }) {
  return (
    <kbd className="inline-flex min-w-[22px] items-center justify-center rounded border border-white/30 bg-white/15 px-1.5 py-0.5 font-mono text-[10px] font-semibold leading-none text-white">
      {children}
    </kbd>
  );
}

function ControlRow({ label, keys, icon }: { label: string; keys: React.ReactNode[]; icon: React.ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="shrink-0 text-white/50">{icon}</span>
      <span className="w-[72px] shrink-0 text-[11px] text-white/70">{label}</span>
      <span className="flex flex-wrap gap-1">
        {keys.map((key, index) => <Key key={index}>{key}</Key>)}
      </span>
    </li>
  );
}

function StatRow({ label, value, accent = 'text-white' }: { label: string; value: string | number; accent?: string }) {
  return (
    <>
      <span className="text-[11px] text-white/50">{label}</span>
      <span className={`text-right font-mono text-[11px] ${accent}`}>{value}</span>
    </>
  );
}

function formatMatchTime(seconds: number) {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
}

export function HUD({ engine, useWasm = false, onToggleWasm }: HUDProps) {
  const { audioEnabled, toggleAudio } = useGameStore();
  const [diagnostics, setDiagnostics] = useState({
    tps: 0,
    fps: 0,
    playerSpeed: '0.0',
    ballVelocity: '0.0',
    controlState: 'free',
    keeperState: 'positioning',
    charging: false,
    chargeType: 'pass' as 'pass' | 'shoot',
    chargePercent: 0,
    scorePlayer: 0,
    scoreOpponent: 0,
    matchSeconds: 0,
    celebrating: false,
  });

  useEffect(() => {
    let frames = 0;
    let fps = 0;
    let lastFpsTime = performance.now();
    let animationFrame = 0;

    const countFrame = () => {
      frames++;
      const now = performance.now();
      if (now - lastFpsTime >= 1000) {
        fps = frames;
        frames = 0;
        lastFpsTime = now;
      }
      animationFrame = requestAnimationFrame(countFrame);
    };
    animationFrame = requestAnimationFrame(countFrame);

    const interval = window.setInterval(() => {
      const state = engine.getRenderState();
      setDiagnostics({
        tps: engine.tps,
        fps,
        playerSpeed: state.player.vel.mag().toFixed(1),
        ballVelocity: state.ball.vel.mag().toFixed(1),
        controlState: state.player.controlState,
        keeperState: state.keeper.aiState,
        charging: state.player.isCharging,
        chargeType: state.player.chargeType,
        chargePercent: Math.min(100, Math.round((state.player.chargeStart / SimulationConfig.MAX_CHARGE_TIME) * 100)),
        scorePlayer: state.scorePlayer,
        scoreOpponent: state.scoreOpponent,
        matchSeconds: engine.elapsedSeconds,
        celebrating: engine.isGoalCelebration,
      });
    }, 80);

    return () => {
      window.clearInterval(interval);
      cancelAnimationFrame(animationFrame);
    };
  }, [engine]);

  const keeperStyles: Record<string, string> = {
    positioning: 'border-emerald-500/30 bg-emerald-500/20 text-emerald-300',
    diving: 'border-red-500/30 bg-red-500/20 text-red-300',
    recovering: 'border-amber-500/30 bg-amber-500/20 text-amber-300',
  };

  const controlStyles: Record<string, string> = {
    free: 'border-white/10 bg-white/10 text-white/60',
    loose_nearby: 'border-amber-500/20 bg-amber-500/20 text-amber-300',
    under_control: 'border-blue-500/20 bg-blue-500/20 text-blue-300',
    shielding: 'border-purple-500/20 bg-purple-500/20 text-purple-300',
    receiving: 'border-cyan-500/20 bg-cyan-500/20 text-cyan-300',
    stretching: 'border-orange-500/20 bg-orange-500/20 text-orange-300',
  };

  return (
    <>
      <div className="pointer-events-none absolute bottom-4 left-4 select-none">
        <div className="min-w-[220px] rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
          <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">Controls</p>
          <ul className="space-y-1.5">
            <ControlRow label="Move" icon={<ArrowUp size={12} />} keys={['W', 'A', 'S', 'D']} />
            <ControlRow label="Sprint" icon={<ChevronsUp size={12} />} keys={['Shift']} />
            <ControlRow label="Shield" icon={<Shield size={12} />} keys={['Ctrl']} />
            <div className="my-1 border-t border-white/10" />
            <ControlRow label="Pass" icon={<Footprints size={12} />} keys={['F', 'Space']} />
            <ControlRow label="Shoot" icon={<Crosshair size={12} />} keys={['G', 'Enter']} />
            <ControlRow label="Through" icon={<GitBranch size={12} />} keys={['R']} />
            <ControlRow label="Tackle" icon={<Zap size={12} />} keys={['T']} />
          </ul>
          <p className="mt-2 text-[10px] leading-tight text-white/30">Hold pass or shoot to charge, then release.</p>
        </div>
      </div>

      <div className="pointer-events-none absolute left-1/2 top-4 -translate-x-1/2 select-none">
        <div className="flex flex-col items-center gap-1">
          <div className="flex items-center gap-4 rounded-xl border border-white/10 bg-black/60 px-5 py-2 backdrop-blur-sm">
            <div className="flex min-w-[48px] flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">You</span>
              <span className="mt-0.5 text-2xl font-black leading-none text-blue-300">{diagnostics.scorePlayer}</span>
            </div>
            <div className="flex flex-col items-center px-1">
              <span className="font-mono text-sm font-semibold tabular-nums text-white/70">
                {formatMatchTime(diagnostics.matchSeconds)}
              </span>
              <span className="text-[9px] uppercase tracking-widest text-white/30">
                / {formatMatchTime(SimulationConfig.MATCH_DURATION_SECONDS)}
              </span>
            </div>
            <div className="flex min-w-[48px] flex-col items-center">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/40">CPU</span>
              <span className="mt-0.5 text-2xl font-black leading-none text-red-300">{diagnostics.scoreOpponent}</span>
            </div>
          </div>
          {diagnostics.celebrating && (
            <span className="rounded-full border border-amber-500/30 bg-amber-500/20 px-3 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-amber-300">
              Goal — kick-off soon
            </span>
          )}
        </div>
      </div>

      {diagnostics.charging && (
        <div className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 select-none">
          <div className="min-w-[180px] rounded-lg border border-white/10 bg-black/70 px-4 py-2 backdrop-blur-sm">
            <div className="mb-1.5 flex items-center justify-between">
              <span className="text-[11px] font-medium capitalize text-white/60">
                {diagnostics.chargeType === 'shoot' ? 'Shooting' : 'Passing'}
              </span>
              <span className={`font-mono text-[11px] font-bold ${diagnostics.chargeType === 'shoot' ? 'text-red-400' : 'text-blue-400'}`}>
                {diagnostics.chargePercent}%
              </span>
            </div>
            <div className="h-2.5 w-full overflow-hidden rounded-full bg-white/10">
              <div
                className={`h-full rounded-full ${diagnostics.chargeType === 'shoot' ? 'bg-gradient-to-r from-orange-400 to-red-500' : 'bg-gradient-to-r from-blue-400 to-cyan-400'}`}
                style={{ width: `${diagnostics.chargePercent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      <div className="pointer-events-none absolute right-4 top-4 select-none">
        <div className="min-w-[190px] rounded-xl border border-white/10 bg-black/60 p-3 backdrop-blur-sm">
          <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">Diagnostics</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <StatRow label="FPS" value={diagnostics.fps} accent="text-green-400" />
            <StatRow label="TPS" value={diagnostics.tps} accent="text-blue-400" />
            <StatRow label="Player" value={`${diagnostics.playerSpeed} m/s`} />
            <StatRow label="Ball" value={`${diagnostics.ballVelocity} m/s`} />
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            <Activity size={11} className="shrink-0 text-white/30" />
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${controlStyles[diagnostics.controlState] ?? controlStyles.free}`}>
              {diagnostics.controlState.replace('_', ' ')}
            </span>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <Shield size={11} className="shrink-0 text-white/30" />
            <span className={`rounded border px-1.5 py-0.5 text-[10px] font-medium ${keeperStyles[diagnostics.keeperState] ?? keeperStyles.positioning}`}>
              GK — {diagnostics.keeperState}
            </span>
          </div>
        </div>
      </div>

      <div className="pointer-events-auto absolute left-4 top-4 z-10 flex flex-col gap-2 select-none">
        {onToggleWasm && (
          <button
            onClick={onToggleWasm}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
          >
            <Cpu size={12} />
            <span>Sim: <span className={useWasm ? 'text-amber-300' : 'text-blue-300'}>{useWasm ? 'WASM' : 'TypeScript'}</span></span>
            <RefreshCw size={11} className="text-white/40" />
          </button>
        )}
        <button
          onClick={toggleAudio}
          className="flex items-center gap-2 rounded-lg border border-white/10 bg-black/60 px-3 py-1.5 text-[11px] font-medium text-white backdrop-blur-sm transition-colors hover:bg-white/10"
        >
          {audioEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          <span>{audioEnabled ? 'Sound On' : 'Sound Off'}</span>
        </button>
      </div>
    </>
  );
}
