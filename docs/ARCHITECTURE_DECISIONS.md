# Architecture Decision Records (ADR)

A running log of significant architecture decisions, trade-offs, and the reasons behind them.
Helps AI Studio and Replit agents stay aligned across sessions.

---

## ADR-001: Dual simulation engines (TS + WASM)

**Date**: 2026-07-13  
**Status**: Active

**Decision**: Ship both a TypeScript simulation (`GameEngine.ts`) and a Rust/WASM simulation (`simulation/pkg/`) selectable at runtime. TS engine runs on the main thread; WASM engine runs in a Web Worker.

**Why**: The TS engine is authoritative for development and determinism testing. The WASM engine provides a performance baseline and will become the multiplayer-authoritative path. Toggling between them lets us benchmark and validate parity.

**Trade-offs**:
- Two codebases to keep in sync (mitigated by shared SimulationConfig constants exposed via the WASM interface).
- WASM worker uses `setInterval` which is not perfectly 120 Hz — acceptable for prototype, must move to `requestAnimationFrame`-driven approach in the worker before multiplayer.

**Constraints for AI Studio / Replit**:
- Do not merge or remove the WASM path. 
- Physics constants changed in `SimulationConfig.ts` should also be reflected in `simulation/src/lib.rs`.

---

## ADR-002: Raw Three.js renderer over React Three Fiber

**Date**: 2026-07-13  
**Status**: Active

**Decision**: `RenderingPanel.tsx` uses raw Three.js with a canvas ref, supporting WebGPU → WebGL fallback via `RendererFactory`. React Three Fiber is present in dependencies but not the primary renderer.

**Why**: The WASM commit introduced `RendererFactory` with WebGPU support. Three.js's new WebGPURenderer requires raw canvas access that R3F's abstraction complicates. WebGPU enables TSL (Three.js Shading Language) shaders for future pitch/grass rendering.

**Trade-offs**:
- Lose R3F's component model, hooks (`useFrame`, `useGLTF`), and Drei helpers.
- HUD and menus remain React DOM overlays on top of the raw canvas — this works and is portable.
- GLTF loading must use THREE.GLTFLoader directly, not `useGLTF`.

**Future path**: Once Three.js WebGPURenderer is stable with R3F, we may migrate back. Do not invest heavily in R3F-specific APIs for now.

---

## ADR-003: Animation state as pure TypeScript layer

**Date**: 2026-07-13  
**Status**: Active

**Decision**: `AnimationState.ts` derives all animation states from `WorldState` using pure functions. It has no Three.js or renderer imports.

**Why**: Animation state must be deterministic and independently testable. Keeping it pure means the same test harness used for physics tests can also verify animation state transitions without a browser/renderer.

**How to apply**: Renderers call `deriveAnimFrame(state, dt)` each frame. They are responsible for cross-fading clips using the returned `ANIM_FADE` durations. They do not implement state logic.

---

## ADR-004: Yuka for keeper AI FSM only

**Date**: 2026-07-13  
**Status**: Active

**Decision**: Yuka's `StateMachine` is used for goalkeeper decision-making (idle → ready → diving). Yuka's physics/steering/entity-manager are NOT used.

**Why**: The FSM is the high-value, low-risk part of Yuka. Yuka's steering behaviours (`ArriveBehavior`, `PursuitBehavior`) operate on Yuka's own `Vector3` and would require bridging to our `Vec2`, complicating determinism guarantees. We use a thin adapter (`KeeperBrain.ts`) that reads from and writes to our own types.

**Constraints**: KeeperBrain outputs an `action` (targetX, speed, isDiving, diveDir). `Keeper.ts` executes it using our deterministic physics. KeeperBrain must NOT mutate ball or player state directly.

---

## ADR-005: SimulationConfig as single source of tuning constants

**Date**: 2026-07-13  
**Status**: Active

**Decision**: All numeric simulation parameters live in `SimulationConfig.ts`. Classes do not define their own magic numbers.

**Why**: Enables Leva dev-panel bindings, future WASM constant synchronisation, and avoids scattered hard-codes that break when one agent edits a file without seeing another.

**How to apply**: Add new constants to `SimulationConfig` first, then reference them. Leva controls read from and write to this object at runtime.

---

## ADR-006: Google AI Studio / Replit co-development conventions

**Date**: 2026-07-13  
**Status**: Active

**Rules for both environments**:
1. `SimulationConfig.ts` is the merge point for tuning — always check before adding magic numbers.
2. `docs/ARCHITECTURE_DECISIONS.md` must be updated when a structural decision changes.
3. Do not delete the TS engine, the WASM worker, or the RenderingPanel — both paths must remain functional.
4. Engine improvements go in `src/engine/`. Renderer improvements go in `src/debug/` or `src/rendering/`. HUD changes go in `src/components/HUD/` or `src/components/`.
5. Tests in `tests/` must pass after every session. Run `npm test` before finishing.
6. vite.config.ts must always include `host: '0.0.0.0'`, `port: 5000`, `allowedHosts: true` for Replit. AI Studio adds `DISABLE_HMR=true` to its env — the HMR toggle handles this.
