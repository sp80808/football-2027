import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { X, Volume2, VolumeX } from 'lucide-react';
import { useSettingsStore, CameraMode, ZoomIntensity } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { COMMENTARY_VOICES } from '../audio/commentaryTtsConfig';
import { commentaryService } from '../audio/CommentaryService';
import { Toggle } from '../ui/Toggle';
import { GlassPanel } from './ui/GlassPanel';
import { SectionTitle } from './ui/SectionTitle';
import { ACCENT, cn, iconProps } from '../ui/designTokens';
import { fadeUp, motionTransition, springSmooth, useReducedMotion } from '../ui/motionPresets';

export function SettingsOverlay() {
  const reduced = useReducedMotion();
  const {
    settingsOpen,
    setSettingsOpen,
    cameraMode,
    setCameraMode,
    cameraShake,
    setCameraShake,
    zoomIntensity,
    setZoomIntensity,
    showControlHints,
    setShowControlHints,
    commentaryEnabled,
    setCommentaryEnabled,
    commentaryVoice,
    setCommentaryVoice,
    commentaryVolume,
    setCommentaryVolume,
    devMatchDuration,
    setDevMatchDuration,
  } = useSettingsStore();
  const { audioEnabled, toggleAudio } = useGameStore();

  useEffect(() => {
    commentaryService.setEnabled(commentaryEnabled && audioEnabled);
    commentaryService.setVoice(commentaryVoice);
    commentaryService.setVolume(commentaryVolume);
  }, [commentaryEnabled, commentaryVoice, commentaryVolume, audioEnabled]);

  if (!settingsOpen) return null;

  const modes: { id: CameraMode; label: string; desc: string }[] = [
    { id: 'dynamic', label: 'Dynamic', desc: 'Balanced zoom and follow' },
    { id: 'broadcast', label: 'Broadcast', desc: 'Wide televised angle' },
    { id: 'action', label: 'Action', desc: 'Closer ball-focused framing' },
    { id: 'steady', label: 'Steady', desc: 'Minimal shake, slow zoom' },
  ];

  const zoomLevels: { id: ZoomIntensity; label: string }[] = [
    { id: 'low', label: 'Low' },
    { id: 'medium', label: 'Medium' },
    { id: 'high', label: 'High' },
  ];

  return (
    <motion.div
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm"
    >
      <motion.div initial={fadeUp.initial} animate={fadeUp.animate} transition={motionTransition(reduced, springSmooth)} className="w-full max-w-md"><GlassPanel variant="overlay" padding="lg" rounded="2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-lg font-bold text-text-primary">Settings</h2>
          <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-lg border border-border bg-white/5 p-2 text-text-secondary hover:bg-white/10" aria-label="Close settings">
            <X {...iconProps('sm')} />
          </button>
        </div>

        <section className="mb-5">
          <SectionTitle>Camera</SectionTitle>
          <div className="grid grid-cols-2 gap-2">
            {modes.map((mode) => (
              <button key={mode.id} type="button" onClick={() => setCameraMode(mode.id)} className={`rounded-lg border px-3 py-2 text-left transition-colors ${cameraMode === mode.id ? 'border-accent-action-border bg-accent-action-bg text-accent-action' : 'border-border bg-white/5 text-text-secondary hover:bg-white/10'}`}>
                <span className="block text-sm font-semibold">{mode.label}</span>
                <span className="block text-[10px] text-text-muted">{mode.desc}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="mb-5 space-y-3">
          <Toggle label="Camera shake" checked={cameraShake} onChange={setCameraShake} />
          <Toggle label="Control hints" checked={showControlHints} onChange={setShowControlHints} />
          <Toggle label="Sound" checked={audioEnabled} onChange={(on) => { if (on !== audioEnabled) toggleAudio(); }} onIcon={<Volume2 size={12} />} offIcon={<VolumeX size={12} />} />
          <Toggle label="Commentary" checked={commentaryEnabled} onChange={setCommentaryEnabled} />
        </section>

        {commentaryEnabled && (
          <section className="mb-5 space-y-3">
            <div>
              <SectionTitle>Commentary voice</SectionTitle>
              <select value={commentaryVoice} onChange={(e) => setCommentaryVoice(e.target.value as typeof commentaryVoice)} className="w-full rounded-lg border border-border bg-white/5 px-3 py-2.5 text-sm text-text-secondary">
                {COMMENTARY_VOICES.map((voice) => (
                  <option key={voice.id} value={voice.id} className="bg-surface">{voice.label}</option>
                ))}
              </select>
            </div>
            <label className="block rounded-lg border border-border bg-white/5 px-3 py-2.5">
              <span className="mb-2 block text-sm text-text-secondary">Commentary volume</span>
              <input type="range" min={0} max={1} step={0.05} value={commentaryVolume} onChange={(e) => setCommentaryVolume(Number(e.target.value))} className="w-full accent-accent-action" />
            </label>
          </section>
        )}

        <section className="mb-5">
          <SectionTitle>Dev — match length</SectionTitle>
          <div className="flex gap-2">
            {([90, 180] as const).map((seconds) => (
              <button key={seconds} type="button" onClick={() => setDevMatchDuration(seconds)} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${devMatchDuration === seconds ? 'border-accent-action-border bg-accent-action-bg text-accent-action' : 'border-border bg-white/5 text-text-muted'}`}>
                {seconds === 90 ? '90s (fast)' : '3 min'}
              </button>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle>Zoom intensity</SectionTitle>
          <div className="flex gap-2">
            {zoomLevels.map((level) => (
              <button key={level.id} type="button" onClick={() => setZoomIntensity(level.id)} className={`flex-1 rounded-lg border py-2 text-sm font-medium ${zoomIntensity === level.id ? 'border-accent-action-border bg-accent-action-bg text-accent-action' : 'border-border bg-white/5 text-text-muted'}`}>
                {level.label}
              </button>
            ))}
          </div>
        </section>
      </GlassPanel></motion.div>
    </motion.div>
  );
}
