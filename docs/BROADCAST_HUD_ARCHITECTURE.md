# Broadcast HUD Architecture

## Goal

Make live play read like a compact television football broadcast without covering the pitch or coupling presentation to simulation state.

## Source patterns used

### SPX Graphics Controller

Repository: `TuomoKu/SPX-GC` — MIT licensed.

Patterns adapted, not copied:

- layered graphics rather than one monolithic overlay;
- independent scorebug, event, lower-third and control layers;
- HTML/CSS-based presentation suitable for real-time graphics;
- event-driven show/hide behaviour;
- graphics remain replaceable presentation templates rather than simulation owners.

SPX itself is not bundled into the game.

### Motion for React

Current Motion documentation was checked through Context7.

Patterns used:

- `AnimatePresence` for deterministic entry and exit;
- `layout` for score and event-stack reflow;
- `useReducedMotion` to simplify non-essential movement;
- brief opacity/translation transitions instead of continuous animation.

## Runtime boundaries

- `BroadcastHUD` consumes coarse Zustand selectors and match events.
- It never writes to the simulation.
- The scorebug, event stacks, announcement strap, charge meter and diagnostics are separate layers.
- HUD polling remains throttled to 10 Hz for simulation diagnostics.
- Camera and Three.js rendering remain independent.

## Components

```text
src/components/
  HUD.tsx
  broadcast/
    BroadcastHUD.tsx
```

`BroadcastHUD.tsx` owns:

- animated score digits;
- match clock and period label;
- announcement/goal strap;
- home and away event stacks.

`HUD.tsx` owns:

- control help;
- charge feedback;
- modifier feedback;
- diagnostics;
- settings, sound and debug controls.

## Presentation rules

- Keep the centre and lower-middle pitch clear.
- Scorebug stays top-left in a compact 16:9-safe area.
- Event stacks are capped at three items per side.
- Strong motion is reserved for score changes, announcements and event arrival.
- Reduced-motion mode uses opacity-only transitions where practical.
- Debug controls remain visually subordinate to the broadcast layer.

## Follow-up

1. Add team abbreviations, badge placeholders and kit-colour tokens.
2. Add substitution, booking and injury event variants.
3. Add replay stinger and replay transport skin.
4. Add screenshot tests at 1920×1080, 1280×720 and narrow layouts.
5. Move diagnostics behind a development-only toggle for production builds.
