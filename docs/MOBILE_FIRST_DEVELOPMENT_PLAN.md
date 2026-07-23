# Mobile-First Development Plan

This document is the shared implementation context for agents working on Football 2027's offline mobile and iOS milestone.

Parent epic: #66

## Executive decision

Do **not** migrate the game to Unity, Phaser, React Three Fiber, or another renderer.

Keep:
- deterministic 120 Hz simulation in `src/engine/`;
- vanilla Three.js presentation through `src/debug/RenderingPanel.tsx` and scene modules;
- React for menus, HUD and overlays;
- `ControllerFrame` as the single input boundary;
- Vitest + Playwright as the verification stack.

Add a narrow mobile/platform layer around the existing architecture rather than introducing a second game runtime.

## Why this route

The repository already has the expensive foundations: deterministic simulation, render interpolation, input normalization, local AI, persistence, a test seam and an established browser build. A framework migration would reset performance tuning, controls, replay determinism and test confidence without solving the actual mobile risks: browser lifecycle, touch ergonomics, offline assets, safe areas and iOS packaging.

## Recommended stack

### Offline/installability

Use `vite-plugin-pwa` backed by Workbox.

Start with `generateSW` while requirements are simple. Move to `injectManifest` only if custom version gating, offline routing or cache migration requires explicit service-worker code.

Resources:
- https://vite-pwa-org.netlify.app/guide/
- https://vite-pwa-org.netlify.app/guide/service-worker-precache
- https://vite-pwa-org.netlify.app/guide/service-worker-strategies-and-behaviors
- https://web.dev/learn/pwa/service-workers

Important implementation notes:
- Default Workbox glob patterns do not include every game asset type. Explicitly include models, textures, audio, fonts and data.
- Workbox commonly warns or fails for individual files above its configured precache size. Treat this as an asset-budget signal rather than blindly raising the limit.
- Prefer an update prompt between matches over a forced update during gameplay.
- First visit is not offline-capable until the service worker installs and controls the page; show an explicit “Ready offline” state.

### Touch input

Use the browser Pointer Events API directly, not a second gesture framework.

Reasons:
- multi-touch is required for movement plus sprint/charge/action;
- pointer capture gives predictable ownership of each finger;
- `pointercancel` handling is essential on mobile;
- `touch-action: none` prevents browser pan/zoom from stealing gameplay gestures;
- direct events make deterministic `ControllerFrame` testing easier.

Resources:
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events
- https://developer.mozilla.org/en-US/docs/Web/API/Pointer_events/Multi-touch_interaction

Optional reference implementation, not a mandatory dependency:
- https://github.com/dondido/virtual-joystick

Recommendation: inspect small joystick libraries for maths and ergonomics, but own the final implementation because Football 2027 needs simultaneous actions, charge timing, cancellation recovery, layout presets and input replay.

### Physical controllers

Use the Web Gamepad API in Safari/PWA first. Normalize browser gamepads into semantic football actions at one adapter boundary.

Resources:
- https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API
- https://developer.mozilla.org/en-US/docs/Web/API/Gamepad
- https://webkit.org/blog/14445/webkit-features-in-safari-17-0/
- https://developer.apple.com/documentation/gamecontroller/

Do not rely on controller ID strings alone. Prefer `mapping === "standard"`, button/axis shape, a small known-device mapping table and user remapping. Treat haptics as capability-detected and optional.

### Native packaging

Use Capacitor after the browser/PWA version works on a real iPhone.

Resources:
- https://capacitorjs.com/docs
- https://developer.apple.com/videos/play/wwdc2023/10120/
- https://developer.apple.com/documentation/gamecontroller/

Architecture rule: native features must sit behind adapters. `src/engine/` must not import Capacitor, WebKit or DOM APIs.

### Rendering and performance

Keep vanilla Three.js. Do not reactively rebuild scene objects during gameplay.

Resources:
- https://threejs.org/docs/pages/WebGLRenderer.html
- https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas

Initial mobile renderer defaults:
- cap device pixel ratio, initially around 1.25–1.5;
- disable or reduce dynamic shadows;
- avoid `preserveDrawingBuffer`;
- avoid logarithmic depth unless required;
- use presentation-only adaptive quality;
- pool vectors, particles and temporary objects;
- freeze or pause presentation while hidden;
- never vary simulation results based on quality tier.

Do not move the renderer to OffscreenCanvas until profiling proves the main thread is the bottleneck and Safari/Capacitor device testing confirms the exact pathway. It is an optimisation option, not phase-one architecture.

### Audio

Keep Howler for the first mobile milestone. Add a narrow audio lifecycle adapter for:
- first-user-gesture unlock;
- interruption/background pause;
- resume/reinitialisation;
- master mute during suspension;
- local-only fallback assets.

Avoid introducing Web Audio abstractions until a measured limitation appears.

### State and persistence

Keep Zustand for UI/application state and `idb-keyval` for durable browser storage. Do not put high-frequency simulation state in React or Zustand.

Version persisted schemas. Any migration failure should preserve the ability to start a local Quick Match.

## Proposed source layout

```text
src/
  platform/
    capabilities.ts
    lifecycle.ts
    visibility.ts
    wakeLock.ts
    haptics.ts
    orientation.ts
    storage.ts
    audioLifecycle.ts
    adapters/
      web.ts
      capacitor.ts
  input/
    InputSystem.ts
    ControllerFrame.ts
    providers/
      keyboardProvider.ts
      gamepadProvider.ts
      touchProvider.ts
      replayProvider.ts
    mappings/
      semanticActions.ts
      standardGamepad.ts
      knownControllers.ts
  mobile/
    MobileShell.tsx
    OrientationGate.tsx
    OfflineReadyIndicator.tsx
    ControllerReconnectOverlay.tsx
    controls/
      TouchControls.tsx
      VirtualStick.tsx
      ActionCluster.tsx
      TouchLayoutEditor.tsx
  performance/
    capabilityTier.ts
    adaptiveQuality.ts
    frameBudget.ts
```

Names are recommendations; preserve existing paths where moving files would create unnecessary churn.

## Input architecture

All providers output partial semantic state. `InputSystem` resolves them into one `ControllerFrame` per simulation tick.

```text
KeyboardProvider ─┐
GamepadProvider  ─┼─> InputSystem -> ControllerFrame -> PlayerIntentParser
TouchProvider    ─┤
ReplayProvider   ─┘
```

Rules:
- provider code may know browser events;
- engine code may only know `ControllerFrame`;
- switching providers must clear stale held states;
- timestamps/edges are sampled at the fixed simulation boundary;
- UI glyphs observe the active provider but do not control gameplay semantics.

## Mobile control design

### Default layout

Left side:
- floating analogue stick;
- optional fixed-stick accessibility mode.

Right side:
- primary context action: pass/contain;
- secondary action: shoot/tackle;
- through ball/second defender;
- lob/slide;
- sprint modifier in an outer reachable strip;
- small player-switch and pause controls away from the action cluster.

### Progressive complexity

Phase 1: buttons only, full action parity.

Phase 2: contextual labels and visual charge feedback.

Phase 3: optional swipe/flick skills.

Phase 4: editable layout presets and handedness.

Do not ship gesture-only equivalents for core actions. Gestures should enhance buttons, not replace reliable controls.

## Capability tiers

Determine presentation defaults using measured capabilities, not only user-agent strings.

Suggested signals:
- viewport and safe-area dimensions;
- device pixel ratio;
- WebGL renderer limits and extensions;
- recent measured frame time;
- memory pressure symptoms where observable;
- touch/gamepad availability;
- standalone/PWA/native-container state;
- reduced-motion preference;
- battery-saving or low-power hints when available.

Suggested tiers:

### Low
- render scale 0.8–1.0;
- no dynamic player shadows;
- reduced crowd/stadium detail;
- reduced particles;
- 30 FPS presentation target if needed.

### Medium
- capped DPR;
- limited shadows;
- standard effects;
- 60 FPS presentation target.

### High
- enhanced shadows/effects only after sustained budget headroom.

Never alter engine timestep, AI decisions, collision rules, ball physics or replay data by tier.

## Offline asset plan

Create a build-time asset inventory containing path, type, compressed size and cache status.

Budgets to establish through measurement:
- initial application shell;
- required Quick Match models/textures;
- required SFX/commentary fallback;
- optional stadium/cosmetic packs;
- maximum single cached file;
- total installed cache.

Optimisation order:
1. remove unused assets;
2. resize textures to actual use;
3. use GPU-friendly compressed textures if the tested iOS pipeline supports them;
4. compress GLB geometry and animation;
5. shorten/encode audio appropriately;
6. split nonessential assets from the core offline match pack.

Do not defer required Quick Match assets to the network.

## Lifecycle contract

On `visibilitychange`, page suspension or native background:
- pause match progression at a safe boundary;
- clear held touch/gamepad states;
- stop or mute audio;
- release transient haptics;
- release wake lock;
- prevent accumulated wall-clock delta from reaching the engine.

On resume:
- require explicit user resume if the match was active;
- reacquire optional wake lock;
- restore audio after a valid gesture where required;
- rescan controllers;
- reset render interpolation timing.

Wake Lock reference:
- https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API

## PWA update strategy

Use a safe update boundary:
- download new assets in the background;
- show “Update ready” in menu/pause/full-time screens;
- never swap the running build mid-match;
- activate after returning to Main Menu or explicit confirmation;
- record build version in diagnostics and replay metadata.

## Testing strategy

### Unit
- provider-to-`ControllerFrame` normalization;
- dead zones and trigger thresholds;
- pointer cancellation;
- stale-state clearing;
- capability-tier decisions;
- lifecycle state machine;
- persistence migrations.

### Browser integration
- mobile viewport screenshots;
- offline production-build launch;
- touch multi-pointer sequences;
- simulated controller connect/disconnect;
- orientation/resize;
- hidden/visible lifecycle;
- repeated rematches and listener leak checks.

### Real device
- Safari browser tab;
- Home Screen standalone PWA;
- Capacitor build;
- Xbox controller connected before and after launch;
- touch-only five-match usability run;
- airplane mode;
- interruption by lock screen, call/audio route and app switching;
- low battery/low-power mode where practical.

## Development phases

### Phase A — architecture and observability
- implement platform capability/lifecycle adapters;
- complete replay-reset test seam;
- add build/version diagnostics;
- add production-build offline test harness;
- add mobile viewport visual baselines.

### Phase B — installable offline web game
- add manifest and service worker;
- inventory/cache required assets;
- implement safe update prompt;
- prove airplane-mode Quick Match and rematch.

### Phase C — touch-first usability
- implement pointer-based virtual stick and action cluster;
- complete action parity;
- add touch settings, safe areas and orientation handling;
- run repeated usability sessions and tune ergonomics.

### Phase D — controller robustness
- semantic mapping and prompts;
- reconnect overlay and stale-state clearing;
- controller-only menu navigation;
- real-device Xbox/PlayStation matrix.

### Phase E — mobile performance
- establish frame and memory budgets;
- optimise draw calls, shadows, DPR, allocations and asset sizes;
- add adaptive presentation quality;
- test five consecutive matches.

### Phase F — native iOS wrapper
- add Capacitor;
- package local build assets;
- implement lifecycle/haptics adapters;
- configure landscape, icons, privacy inventory and signing docs;
- distribute through development install/TestFlight.

## Dependency policy

Add a library only when it replaces meaningful complexity and remains compatible with deterministic testing.

Preferred additions:
- `vite-plugin-pwa` / Workbox for service-worker generation;
- Capacitor core/iOS plus only narrowly required official plugins.

Avoid initially:
- a second game engine;
- a second renderer abstraction;
- large gesture libraries;
- physics replacement;
- UI component frameworks that fight the game HUD;
- analytics or online dependencies in the core match path.

## Agent checklist

Before changing code, an agent should read:
1. `docs/ARCHITECTURE.md`
2. `docs/CONTROLS.md`
3. this document
4. epic #66 and the relevant child issue

Every implementation must state:
- affected deterministic boundary;
- browser/native capability assumptions;
- offline impact;
- lifecycle cleanup behaviour;
- performance impact;
- automated tests added;
- real-device checks still required.

## Immediate next tasks

1. Implement `PlatformCapabilities` and `AppLifecycle` interfaces without changing gameplay.
2. Add replay/input-provider seams required by #73.
3. Produce an asset inventory from the production `dist/` build.
4. Add Vite PWA with an explicit game-asset precache pattern and update prompt.
5. Build the pointer-event touch provider before visually polishing controls.
6. Establish a real-device benchmark sheet before optimisation.
