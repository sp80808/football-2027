# Mobile Agent Brief

Read this before implementing issues #66–#73.

## Non-negotiable architecture

- `src/engine/` remains deterministic, DOM-free and Three.js-free.
- Simulation remains fixed at 120 Hz.
- Mobile input must normalize into `ControllerFrame`.
- Rendering quality may adapt; gameplay rules may not.
- Quick Match must remain fully playable offline.
- Capacitor/native APIs must be hidden behind platform adapters.

## Source of truth

- `docs/ARCHITECTURE.md`
- `docs/CONTROLS.md`
- `docs/MOBILE_FIRST_DEVELOPMENT_PLAN.md`
- Epic #66 and its child issue currently being implemented.

## Preferred implementation choices

- Pointer Events + pointer capture for touch controls.
- Web Gamepad API for browser/PWA controllers.
- `vite-plugin-pwa` + Workbox for offline caching.
- Vanilla Three.js renderer stays in place.
- Zustand remains UI/application state only.
- `idb-keyval` remains durable browser storage.
- Capacitor is packaging, not a replacement runtime.

## Required review questions

Every PR should answer:

1. Does this touch deterministic engine state?
2. How are stale inputs cleared on cancel, disconnect and background?
3. Does it work with all network requests blocked?
4. Does it allocate or update React state in the hot loop?
5. What happens on orientation change and app resume?
6. Which unit/integration tests prove the new seam?
7. Which real-device checks remain manual?

## Release gate

A milestone is not complete until a real iPhone can, in airplane mode:

1. launch the installed game;
2. start a 90-second Quick Match;
3. complete it with touch;
4. rematch;
5. repeat with an Xbox-compatible controller;
6. survive controller disconnect/reconnect and app background/resume.
