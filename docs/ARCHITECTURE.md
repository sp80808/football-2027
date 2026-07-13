# Architecture

Football 2027 separates **deterministic simulation** (`src/engine/`) from **presentation** (React UI + vanilla Three.js). The engine must run without DOM or Three.js imports.

> **Legacy:** React Three Fiber lives in `src/legacy/r3f/` and is **not** used. Live render loop: `src/debug/RenderingPanel.tsx`.

## Layer diagram

| Layer | Responsibility | Key paths |
|-------|----------------|-----------|
| **UI** | Screen routing, menus, HUD, touch | `App.tsx`, `screens/`, `components/` |
| **Engine** | 120 Hz physics, match flow, rules | `src/engine/` |
| **Rendering** | Three.js scene, camera, effects | `RenderingPanel.tsx`, `scene/`, `camera/` |
| **Audio** | Howler spatial SFX | `src/audio/` |
| **State** | Match UI, career persistence | `store/`, `career/` |
| **Input** | Bindings, device detection | `input/` |

## Application flow

```
Splash → MainMenu → QuickMatch ──┐
              │                  ├──→ Gameplay
              └── Career ────────┘
              └── Settings
```

- **Quick Match:** standalone fixture.
- **Career:** 8-team league; results in `localStorage`.
- **Gameplay:** `RenderingPanel`, `HUD`, `TouchControls`, singleton `GameEngine`.
- **Test seam:** `window.__TEST__` for Playwright.

## Simulation loop (120 Hz)

1. `InputSystem` → `ControllerFrame`
2. `PlayerIntentParser` → `PlayerIntent`
3. Update `Player`, `Opponent`, `Keeper`, `Ball`
4. `MatchManager` phases; `OffsideDetector` after passes
5. `WorldState` double-buffer + render interpolation

## Key engine modules

| File | Role |
|------|------|
| `GameEngine.ts` | Tick loop, events, replay buffer |
| `MatchManager.ts` | Scores, phases, kickoff/halftime/FT |
| `PlayerIntentParser.ts` | FC26 modifiers → intent |
| `Player.ts` | Locomotion, first touch, shield, tackle |
| `Opponent.ts` | Press, jockey, dispossession |
| `Keeper.ts` | Dive saves, keeper rush |
| `OffsideDetector.ts` | Offside at pass |
| `Ball.ts` | Gravity, drag, Magnus, bounce |

## Coordinate system

| Physics | Three.js |
|---------|----------|
| X | X |
| Y | −Z |
| Z | Y |

Pitch: 105 m × 68 m. Goal: 7.32 m × 2.44 m.

## Determinism

1. `SeededRandom` only — never `Math.random()` in engine
2. Fixed 120 Hz timestep
3. Zero allocation in `tick()` / `update()`
4. No Three.js imports in `src/engine/`

## Testing

- **Vitest:** 57 tests / 11 files in `tests/`
- **Playwright:** `e2e/smoke.spec.ts`
- **Gap:** `resetForInputReplay` not yet on `GameEngine`

## Related

[CONTROLS.md](./CONTROLS.md) · [DEVELOPMENT.md](./DEVELOPMENT.md) · [ROADMAP.md](./ROADMAP.md)
