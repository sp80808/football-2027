import { useEffect, useState } from 'react';
import type { InputDevice } from './controlBindings';
const SPLASH_SEEN_KEY = 'football2027-splash-seen';
function detectGamepadFamily(id: string): 'xbox' | 'playstation' {
  const lower = id.toLowerCase();
  if (lower.includes('dualsense') || lower.includes('dualshock') || lower.includes('playstation') || lower.includes('054c') || lower.includes('wireless controller')) return 'playstation';
  return 'xbox';
}
function hasTouchCapability(): boolean {
  if (typeof window === 'undefined') return false;
  return 'ontouchstart' in window || navigator.maxTouchPoints > 0 || window.matchMedia('(pointer: coarse)').matches;
}
function pollGamepad(): InputDevice | null {
  if (typeof navigator === 'undefined' || !navigator.getGamepads) return null;
  for (const pad of navigator.getGamepads()) if (pad?.connected) return detectGamepadFamily(pad.id);
  return null;
}
export function useInputDevice(): InputDevice {
  const [device, setDevice] = useState<InputDevice>(() => {
    if (typeof window === 'undefined') return 'keyboard';
    return pollGamepad() ?? (hasTouchCapability() && window.innerWidth < 768 ? 'touch' : 'keyboard');
  });
  useEffect(() => {
    let lastKeyAt = 0, lastTouchAt = 0;
    const onKey = () => { lastKeyAt = Date.now(); setDevice('keyboard'); };
    const onPointer = () => { if (!hasTouchCapability()) return; lastTouchAt = Date.now(); if (window.innerWidth < 768) setDevice('touch'); };
    const onGamepad = (e: GamepadEvent) => setDevice(detectGamepadFamily(e.gamepad.id));
    const interval = window.setInterval(() => {
      const pad = pollGamepad();
      if (pad) return setDevice(pad);
      if (lastKeyAt > lastTouchAt && Date.now() - lastKeyAt < 3000) setDevice('keyboard');
      else if (lastTouchAt > lastKeyAt && Date.now() - lastTouchAt < 3000 && window.innerWidth < 768) setDevice('touch');
    }, 400);
    window.addEventListener('keydown', onKey);
    window.addEventListener('pointerdown', onPointer);
    window.addEventListener('gamepadconnected', onGamepad);
    return () => { window.clearInterval(interval); window.removeEventListener('keydown', onKey); window.removeEventListener('pointerdown', onPointer); window.removeEventListener('gamepadconnected', onGamepad); };
  }, []);
  return device;
}
export function hasSeenSplash(): boolean { try { return localStorage.getItem(SPLASH_SEEN_KEY) === '1'; } catch { return false; } }
export function markSplashSeen(): void { try { localStorage.setItem(SPLASH_SEEN_KEY, '1'); } catch {} }
export async function preloadGameAssets(onProgress: (p: number) => void): Promise<void> {
  const tasks = [import('three'), import('../debug/RenderingPanel')];
  let done = 0;
  await Promise.all(tasks.map(async (t) => { await t; done++; onProgress(done / tasks.length); }));
  onProgress(1);
}
