import React, { useEffect } from 'react';
import { X } from 'lucide-react';
import { useSettingsStore, CameraMode, ZoomIntensity } from '../store/settingsStore';
import { useGameStore } from '../store/gameStore';
import { COMMENTARY_VOICES } from '../audio/commentaryTtsConfig';
import { commentaryService } from '../audio/CommentaryService';

export function SettingsOverlay() {
  const {
    settingsOpen, setSettingsOpen, cameraMode, setCameraMode, cameraShake, setCameraShake,
    zoomIntensity, setZoomIntensity, showControlHints, setShowControlHints,
    commentaryEnabled, setCommentaryEnabled, commentaryVoice, setCommentaryVoice,
    commentaryVolume, setCommentaryVolume,
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
    { id: 'low', label: 'Low' }, { id: 'medium', label: 'Medium' }, { id: 'high', label: 'High' },
  ];

  return (
    <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/55 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-slate-950/95 p-5 shadow-2xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="m-0 text-lg font-bold text-white">Settings</h2>
          <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-lg border border-white/10 bg-white/5 p-2 text-white/70" aria-label="Close settings"><X size={16} /></button>
        </div>
        <section className="mb-5">
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Camera</p>
          <div className="grid grid-cols-2 gap-2">{modes.map((mode) => (
            <button key={mode.id} type="button" onClick={() => setCameraMode(mode.id)} className={`rounded-lg border px-3 py-2 text-left ${cameraMode === mode.id ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/10 bg-white/5 text-white/70'}`}>
              <span className="block text-sm font-semibold">{mode.label}</span><span className="block text-[10px] text-white/40">{mode.desc}</span>
            </button>))}</div>
        </section>
        <section className="mb-5 space-y-3">
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"><span className="text-sm text-white/80">Camera shake</span><input type="checkbox" checked={cameraShake} onChange={(e) => setCameraShake(e.target.checked)} className="accent-blue-500" /></label>
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"><span className="text-sm text-white/80">Control hints</span><input type="checkbox" checked={showControlHints} onChange={(e) => setShowControlHints(e.target.checked)} className="accent-blue-500" /></label>
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"><span className="text-sm text-white/80">Sound</span><input type="checkbox" checked={audioEnabled} onChange={toggleAudio} className="accent-blue-500" /></label>
          <label className="flex items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"><span className="text-sm text-white/80">Commentary</span><input type="checkbox" checked={commentaryEnabled} onChange={(e) => setCommentaryEnabled(e.target.checked)} className="accent-blue-500" /></label>
        </section>
        {commentaryEnabled && (
          <section className="mb-5 space-y-3">
            <div><p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Commentary voice</p>
              <select value={commentaryVoice} onChange={(e) => setCommentaryVoice(e.target.value as typeof commentaryVoice)} className="w-full rounded-lg border border-white/10 bg-white/5 px-3 py-2.5 text-sm text-white/80">
                {COMMENTARY_VOICES.map((v) => <option key={v.id} value={v.id} className="bg-slate-900">{v.label}</option>)}
              </select></div>
            <label className="block rounded-lg border border-white/10 bg-white/5 px-3 py-2.5"><span className="mb-2 block text-sm text-white/80">Commentary volume</span>
              <input type="range" min={0} max={1} step={0.05} value={commentaryVolume} onChange={(e) => setCommentaryVolume(Number(e.target.value))} className="w-full accent-blue-500" /></label>
          </section>
        )}
        <section><p className="mb-2 text-[10px] font-semibold uppercase tracking-widest text-white/40">Zoom intensity</p>
          <div className="flex gap-2">{zoomLevels.map((level) => (
            <button key={level.id} type="button" onClick={() => setZoomIntensity(level.id)} className={`flex-1 rounded-lg border py-2 text-sm ${zoomIntensity === level.id ? 'border-blue-400/50 bg-blue-500/15 text-blue-200' : 'border-white/10 bg-white/5 text-white/60'}`}>{level.label}</button>))}</div>
        </section>
      </div>
    </div>
  );
}
