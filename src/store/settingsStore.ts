import { create } from 'zustand';
import type { CommentaryVoiceId } from '../audio/commentaryTtsConfig';
import { DEFAULT_COMMENTARY_VOICE } from '../audio/commentaryTtsConfig';
import { setMatchDurationSeconds } from '../engine/matchDuration';

export type CameraMode = 'broadcast' | 'action' | 'steady' | 'dynamic';
export type ZoomIntensity = 'low' | 'medium' | 'high';
export type DevMatchDuration = 90 | 180;
export type AiDifficulty = 'Amateur' | 'Semi-Pro' | 'Professional' | 'World Class' | 'Legendary';

export interface SettingsState {
  cameraMode: CameraMode;
  cameraShake: boolean;
  zoomIntensity: ZoomIntensity;
  showControlHints: boolean;
  commentaryEnabled: boolean;
  commentaryVolume: number;
  commentaryVoice: CommentaryVoiceId;
  devMatchDuration: DevMatchDuration;
  aiDifficulty: AiDifficulty;
  settingsOpen: boolean;
  activeModifierLabel: string | null;
  setCameraMode: (mode: CameraMode) => void;
  setCameraShake: (enabled: boolean) => void;
  setZoomIntensity: (level: ZoomIntensity) => void;
  setShowControlHints: (show: boolean) => void;
  setCommentaryEnabled: (enabled: boolean) => void;
  setCommentaryVolume: (volume: number) => void;
  setCommentaryVoice: (voice: CommentaryVoiceId) => void;
  setDevMatchDuration: (seconds: DevMatchDuration) => void;
  setAiDifficulty: (difficulty: AiDifficulty) => void;
  setSettingsOpen: (open: boolean) => void;
  setActiveModifierLabel: (label: string | null) => void;
  flashModifierLabel: (label: string) => void;
}

const STORAGE_KEY = 'football-2027-settings';

interface PersistedSettings {
  cameraMode: CameraMode;
  cameraShake: boolean;
  zoomIntensity: ZoomIntensity;
  showControlHints: boolean;
  commentaryEnabled: boolean;
  commentaryVolume: number;
  commentaryVoice: CommentaryVoiceId;
  devMatchDuration: DevMatchDuration;
  aiDifficulty: AiDifficulty;
}

function loadPersisted(): Partial<PersistedSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PersistedSettings) : {};
  } catch {
    return {};
  }
}

function persist(state: PersistedSettings) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore quota errors
  }
}

const saved = loadPersisted();
const initialDevMatchDuration = saved.devMatchDuration ?? 180;
setMatchDurationSeconds(initialDevMatchDuration);

let modifierTimeout: number | undefined;

function snapshot(get: () => SettingsState): PersistedSettings {
  return {
    cameraMode: get().cameraMode,
    cameraShake: get().cameraShake,
    zoomIntensity: get().zoomIntensity,
    showControlHints: get().showControlHints,
    commentaryEnabled: get().commentaryEnabled,
    commentaryVolume: get().commentaryVolume,
    commentaryVoice: get().commentaryVoice,
    devMatchDuration: get().devMatchDuration,
    aiDifficulty: get().aiDifficulty,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  cameraMode: saved.cameraMode ?? 'dynamic',
  cameraShake: saved.cameraShake ?? true,
  zoomIntensity: saved.zoomIntensity ?? 'medium',
  showControlHints: saved.showControlHints ?? true,
  commentaryEnabled: saved.commentaryEnabled ?? true,
  commentaryVolume: saved.commentaryVolume ?? 1,
  commentaryVoice: saved.commentaryVoice ?? DEFAULT_COMMENTARY_VOICE,
  devMatchDuration: initialDevMatchDuration,
  aiDifficulty: saved.aiDifficulty ?? 'Professional',
  settingsOpen: false,
  activeModifierLabel: null,
  setCameraMode: (cameraMode) => { set({ cameraMode }); persist(snapshot(get)); },
  setCameraShake: (cameraShake) => { set({ cameraShake }); persist(snapshot(get)); },
  setZoomIntensity: (zoomIntensity) => { set({ zoomIntensity }); persist(snapshot(get)); },
  setShowControlHints: (showControlHints) => { set({ showControlHints }); persist(snapshot(get)); },
  setCommentaryEnabled: (commentaryEnabled) => { set({ commentaryEnabled }); persist(snapshot(get)); },
  setCommentaryVoice: (commentaryVoice) => { set({ commentaryVoice }); persist(snapshot(get)); },
  setCommentaryVolume: (commentaryVolume) => {
    const clamped = Math.max(0, Math.min(1, commentaryVolume));
    set({ commentaryVolume: clamped });
    persist(snapshot(get));
  },
  setDevMatchDuration: (devMatchDuration) => {
    setMatchDurationSeconds(devMatchDuration);
    set({ devMatchDuration });
    persist(snapshot(get));
  },
  setAiDifficulty: (aiDifficulty) => {
    set({ aiDifficulty });
    persist(snapshot(get));
  },
  setSettingsOpen: (settingsOpen) => set({ settingsOpen }),
  setActiveModifierLabel: (activeModifierLabel) => set({ activeModifierLabel }),
  flashModifierLabel: (label) => {
    set({ activeModifierLabel: label });
    if (modifierTimeout) window.clearTimeout(modifierTimeout);
    modifierTimeout = window.setTimeout(() => {
      if (get().activeModifierLabel === label) set({ activeModifierLabel: null });
    }, 1800);
  },
}));
