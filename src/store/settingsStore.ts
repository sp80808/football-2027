import { create } from 'zustand';

export type CameraMode = 'broadcast' | 'action' | 'steady' | 'dynamic';
export type ZoomIntensity = 'low' | 'medium' | 'high';

export interface SettingsState {
  cameraMode: CameraMode;
  cameraShake: boolean;
  zoomIntensity: ZoomIntensity;
  showControlHints: boolean;
  settingsOpen: boolean;
  activeModifierLabel: string | null;
  setCameraMode: (mode: CameraMode) => void;
  setCameraShake: (enabled: boolean) => void;
  setZoomIntensity: (level: ZoomIntensity) => void;
  setShowControlHints: (show: boolean) => void;
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
}

function loadPersisted(): Partial<PersistedSettings> {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) as PersistedSettings : {};
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

export const useSettingsStore = create<SettingsState>((set, get) => ({
  cameraMode: saved.cameraMode ?? 'dynamic',
  cameraShake: saved.cameraShake ?? true,
  zoomIntensity: saved.zoomIntensity ?? 'medium',
  showControlHints: saved.showControlHints ?? true,
  settingsOpen: false,
  activeModifierLabel: null,

  setCameraMode: (cameraMode) => {
    set({ cameraMode });
    persist({ cameraMode, cameraShake: get().cameraShake, zoomIntensity: get().zoomIntensity, showControlHints: get().showControlHints });
  },
  setCameraShake: (cameraShake) => {
    set({ cameraShake });
    persist({ cameraMode: get().cameraMode, cameraShake, zoomIntensity: get().zoomIntensity, showControlHints: get().showControlHints });
  },
  setZoomIntensity: (zoomIntensity) => {
    set({ zoomIntensity });
    persist({ cameraMode: get().cameraMode, cameraShake: get().cameraShake, zoomIntensity, showControlHints: get().showControlHints });
  },
  setShowControlHints: (showControlHints) => {
    set({ showControlHints });
    persist({ cameraMode: get().cameraMode, cameraShake: get().cameraShake, zoomIntensity: get().zoomIntensity, showControlHints });
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
