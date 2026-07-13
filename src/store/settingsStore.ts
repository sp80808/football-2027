import { create } from 'zustand';

export type CameraMode = 'broadcast' | 'action' | 'steady' | 'dynamic';
export type ZoomIntensity = 'low' | 'medium' | 'high';

export interface SettingsState {
  cameraMode: CameraMode;
  cameraShake: boolean;
  zoomIntensity: ZoomIntensity;
  showControlHints: boolean;
  commentaryEnabled: boolean;
  commentaryVolume: number;
  settingsOpen: boolean;
  activeModifierLabel: string | null;
  setCameraMode: (mode: CameraMode) => void;
  setCameraShake: (enabled: boolean) => void;
  setZoomIntensity: (level: ZoomIntensity) => void;
  setShowControlHints: (show: boolean) => void;
  setCommentaryEnabled: (enabled: boolean) => void;
  setCommentaryVolume: (volume: number) => void;
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
let modifierTimeout: number | undefined;

function snapshot(get: () => SettingsState): PersistedSettings {
  return {
    cameraMode: get().cameraMode,
    cameraShake: get().cameraShake,
    zoomIntensity: get().zoomIntensity,
    showControlHints: get().showControlHints,
    commentaryEnabled: get().commentaryEnabled,
    commentaryVolume: get().commentaryVolume,
  };
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  cameraMode: saved.cameraMode ?? 'dynamic',
  cameraShake: saved.cameraShake ?? true,
  zoomIntensity: saved.zoomIntensity ?? 'medium',
  showControlHints: saved.showControlHints ?? true,
  commentaryEnabled: saved.commentaryEnabled ?? true,
  commentaryVolume: saved.commentaryVolume ?? 1,
  settingsOpen: false,
  activeModifierLabel: null,

  setCameraMode: (cameraMode) => {
    set({ cameraMode });
    persist(snapshot(get));
  },
  setCameraShake: (cameraShake) => {
    set({ cameraShake });
    persist(snapshot(get));
  },
  setZoomIntensity: (zoomIntensity) => {
    set({ zoomIntensity });
    persist(snapshot(get));
  },
  setShowControlHints: (showControlHints) => {
    set({ showControlHints });
    persist(snapshot(get));
  },
  setCommentaryEnabled: (commentaryEnabled) => {
    set({ commentaryEnabled });
    persist(snapshot(get));
  },
  setCommentaryVolume: (commentaryVolume) => {
    const clamped = Math.max(0, Math.min(1, commentaryVolume));
    set({ commentaryVolume: clamped });
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
