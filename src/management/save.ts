import { CareerState } from './types';

const SAVE_KEY   = 'football2027_career_v1';
const SAVE_VERSION = 1;

export function saveCareer(state: CareerState): void {
  try {
    const payload = { ...state, version: SAVE_VERSION, saveTimestamp: new Date().toISOString() };
    localStorage.setItem(SAVE_KEY, JSON.stringify(payload));
  } catch (e) {
    console.warn('[save] Failed to write localStorage:', e);
  }
}

export function loadCareer(): CareerState | null {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const data = JSON.parse(raw) as CareerState;
    if (data.version !== SAVE_VERSION) {
      console.warn('[save] Save version mismatch — discarding.');
      return null;
    }
    return data;
  } catch (e) {
    console.warn('[save] Failed to read save:', e);
    return null;
  }
}

export function deleteSave(): void {
  localStorage.removeItem(SAVE_KEY);
}

export function hasSave(): boolean {
  return localStorage.getItem(SAVE_KEY) !== null;
}
