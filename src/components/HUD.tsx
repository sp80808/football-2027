import React, { useEffect, useState } from 'react';
import {
  Activity,
  ArrowUp,
  ChevronsUp,
  Cpu,
  Crosshair,
  Footprints,
  GitBranch,
  RefreshCw,
  Settings,
  Shield,
  Sparkles,
  Target,
  Volume2,
  VolumeX,
  Wind,
  Zap,
} from 'lucide-react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { GameEngine } from '../engine/GameEngine';
import { SimulationConfig } from '../engine/SimulationConfig';
import { useGameStore } from '../store/gameStore';
import { useSettingsStore } from '../store/settingsStore';
import { modifierLabel } from '../engine/PlayerIntentParser';
import type { PassModifier, ShotModifier } from '../engine/Intent';
import { BroadcastHUD } from './broadcast/BroadcastHUD';

interface HUDProps {
  engine: GameEngine;
  useWasm?: boolean;
  onToggleWasm?: () => void;
  showOffsideLine?: boolean;
  onToggleOffsideLine?: () => void;
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

export function HUD({ engine, useWasm = false, onToggleWasm, showOffsideLine = false, onToggleOffsideLine }: HUDProps) {
  const audioEnabled = useGameStore((state) => state.audioEnabled);
  const toggleAudio = useGameStore((state) => state.toggleAudio);
  const { showControlHints, setSettingsOpen, activeModifierLabel, flashModifierLabel } = useSettingsStore();
  const reduceMotion = useReducedMotion();
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
    passModifier: 'none' as string,
    shotModifier: 'none' as string,
    celebrating: false,
    offsideLine: null as number | null,
  });

  useEffect(() => {
    let frames = 0;
    let fps = 0;
    let lastFpsTime = performance.now();
    let animationFrame = 0;

    const countFrame = () => {
      frames += 1;
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
        passModifier: state.player.passModifier,
        shotModifier: state.player.shotModifier,
        celebrating: engine.isGoalCelebration,
        offsideLine: state.offsideLineY,
      });
    }, 100);

    return () => {
      window.clearInterval(interval);
      cancelAnimationFrame(animationFrame);
    };
  }, [engine]);

  useEffect(() => {
    if (!diagnostics.charging) return;
    const label = modifierLabel(
      diagnostics.passModifier as PassModifier,
      diagnostics.shotModifier as ShotModifier,
      diagnostics.chargeType === 'shoot' ? 'shot' : 'short_pass',
    );
    if (label) flashModifierLabel(label);
  }, [diagnostics.charging, diagnostics.passModifier, diagnostics.shotModifier, diagnostics.chargeType, flashModifierLabel]);

  const chargeBarClass = () => {
    if (diagnostics.chargeType === 'shoot') {
      if (diagnostics.shotModifier === 'finesse') return 'bg-gradient-to-r from-purple-400 to-fuchsia-500';
      if (diagnostics.shotModifier === 'chip') return 'bg-gradient-to-r from-yellow-300 to-amber-400';
      return 'bg-gradient-to-r from-orange-400 to-red-500';
    }
    if (diagnostics.passModifier === 'through') return 'bg-gradient-to-r from-emerald-400 to-green-500';
    if (diagnostics.passModifier === 'lob' || diagnostics.passModifier === 'lob_through') return 'bg-gradient-to-r from-cyan-400 to-sky-400';
    if (diagnostics.passModifier === 'driven') return 'bg-gradient-to-r from-blue-300 to-indigo-400';
    return 'bg-gradient-to-r from-blue-400 to-cyan-400';
  };

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
      <BroadcastHUD celebrating={diagnostics.celebrating} />

      <AnimatePresence initial={false}>
        {showControlHints && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, x: -16 }}
            className="pointer-events-none absolute bottom-28 left-3 select-none sm:bottom-32 sm:left-4"
          >
            <div className="min-w-[220px] rounded-sm border border-white/10 bg-black/72 p-3 shadow-xl backdrop-blur-md">
              <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">Controls</p>
              <ul className="space-y-1.5">
                <ControlRow label="Move" icon={<ArrowUp size={12} />} keys={['W', 'A', 'S', 'D']} />
                <ControlRow label="Sprint" icon={<ChevronsUp size={12} />} keys={['Shift']} />
                <ControlRow label="Shield" icon={<Shield size={12} />} keys={['Ctrl']} />
                <div className="my-1 border-t border-white/10" />
                <ControlRow label="Pass" icon={<Footprints size={12} />} keys={['F', 'Space']} />
                <ControlRow label="Shoot" icon={<Crosshair size={12} />} keys={['G', 'Enter']} />
                <ControlRow label="Through" icon={<GitBranch size={12} />} keys={['R']} />
                <ControlRow label="Lob" icon={<Wind size={12} />} keys={['E']} />
                <ControlRow label="Finesse" icon={<Target size={12} />} keys={['Q']} />
                <ControlRow label="Chip" icon={<Sparkles size={12} />} keys={['Alt']} />
                <ControlRow label="Skill" icon={<Sparkles size={12} />} keys={['C']} />
                <ControlRow label="Tackle" icon={<Zap size={12} />} keys={['T']} />
                <ControlRow label="Slide" icon={<Zap size={12} />} keys={['X', 'Shift+T']} />
              </ul>
              <p className="mt-2 text-[10px] leading-tight text-white/30">Hold to charge. Tap shoot twice for low driven.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {diagnostics.charging && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96 }}
            className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 select-none"
          >
            <div className={`min-w-[190px] rounded-sm border px-4 py-2 shadow-xl backdrop-blur-md ${diagnostics.chargeType === 'shoot' && diagnostics.shotModifier === 'power' ? 'border-red-400/40 bg-black/85 shadow-[0_0_24px_rgba(239,68,68,0.25)]' : 'border-white/10 bg-black/75'}`}>
              <div className="mb-1.5 flex items-center justify-between">
                <span className="text-[10px] font-black uppercase tracking-[0.12em] text-white/60">
                  {diagnostics.chargeType === 'shoot' ? 'Shot power' : 'Pass power'}
                </span>
                <span className="font-mono text-[11px] font-bold text-white/85">{diagnostics.chargePercent}%</span>
              </div>
              <div className="h-2.5 w-full overflow-hidden bg-white/10">
                <motion.div
                  className={`h-full ${chargeBarClass()}`}
                  animate={{ width: `${diagnostics.chargePercent}%` }}
                  transition={{ duration: 0.05, ease: 'linear' }}
                />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence initial={false}>
        {activeModifierLabel && (
          <motion.div
            initial={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: -10, scale: 0.94 }}
            className="pointer-events-none absolute left-1/2 top-20 -translate-x-1/2 select-none"
          >
            <span className="rounded-sm border border-white/20 bg-black/80 px-4 py-1.5 text-[10px] font-black uppercase tracking-[0.18em] text-white/90 shadow-xl backdrop-blur-md">
              {activeModifierLabel}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-none absolute right-3 top-3 select-none sm:right-4 sm:top-4">
        <div className="min-w-[190px] rounded-sm border border-white/10 bg-black/68 p-3 shadow-xl backdrop-blur-md">
          <p className="mb-2 px-0.5 text-[10px] font-semibold uppercase tracking-widest text-white/40">Diagnostics</p>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1.5">
            <StatRow label="FPS" value={diagnostics.fps} accent="text-green-400" />
            <StatRow label="TPS" value={diagnostics.tps} accent="text-blue-400" />
            <StatRow label="Player" value={`${diagnostics.playerSpeed} m/s`} />
            <StatRow label="Ball" value={`${diagnostics.ballVelocity} m/s`} />
            {diagnostics.offsideLine !== null && <StatRow label="Offside" value={`${diagnostics.offsideLine.toFixed(1)}m`} accent="text-amber-300" />}
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

      <div className="pointer-events-auto absolute right-3 top-[9.5rem] z-10 flex flex-col gap-2 select-none sm:right-4 sm:top-[10rem]">
        {onToggleWasm && (
          <button onClick={onToggleWasm} className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/68 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/10">
            <Cpu size={12} />
            <span>Sim: <span className={useWasm ? 'text-amber-300' : 'text-blue-300'}>{useWasm ? 'WASM' : 'TypeScript'}</span></span>
            <RefreshCw size={11} className="text-white/40" />
          </button>
        )}
        <button onClick={() => setSettingsOpen(true)} className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/68 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/10">
          <Settings size={12} />
          <span>Settings</span>
        </button>
        <button onClick={toggleAudio} className="flex items-center gap-2 rounded-sm border border-white/10 bg-black/68 px-3 py-1.5 text-[11px] font-medium text-white shadow-lg backdrop-blur-md transition-colors hover:bg-white/10">
          {audioEnabled ? <Volume2 size={12} /> : <VolumeX size={12} />}
          <span>{audioEnabled ? 'Sound On' : 'Sound Off'}</span>
        </button>
        {onToggleOffsideLine && (
          <button onClick={onToggleOffsideLine} className={`flex items-center gap-2 rounded-sm border px-3 py-1.5 text-[11px] font-medium shadow-lg backdrop-blur-md transition-colors hover:bg-white/10 ${showOffsideLine ? 'border-amber-500/30 bg-amber-500/15 text-amber-200' : 'border-white/10 bg-black/68 text-white'}`}>
            <Target size={12} />
            <span>Offside Line</span>
          </button>
        )}
      </div>
    </>
  );
}
