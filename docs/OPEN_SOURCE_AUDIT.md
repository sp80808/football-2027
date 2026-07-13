# Open-Source Library Audit

Evaluation of external libraries for football-2027 browser game.
Each entry records relevance, licence, maintenance quality, browser performance, determinism impact, and integration cost.

---

## Tier 1 — Integrated / Approved

### Yuka 0.7.8
- **Purpose**: Finite-state machines, steering behaviours, perception, path following for AI agents.
- **Licence**: MIT ✅
- **Relevance**: High — used for goalkeeper FSM (idle → ready → diving) and future opponent steering.
- **Maintenance**: Actively maintained, last release 2024. ESM-native, zero runtime dependencies.
- **Performance**: Lightweight CPU-side; does not touch GPU. Keeper FSM adds <0.1 ms/tick.
- **Determinism**: Deterministic as long as inputs are deterministic (we control all inputs). ✅
- **Integration cost**: Low — thin adapter class (`KeeperBrain.ts`) bridges Yuka StateMachine to our Vec2 physics. Yuka physics/steering NOT used; only FSM layer.
- **Status**: ✅ Integrated (KeeperBrain.ts)

### Three.js (existing)
- **Status**: ✅ Core renderer, WebGPU/WebGL via RendererFactory.

### leva 0.9.35
- **Purpose**: Dev-only GUI panel for tweaking SimulationConfig constants at runtime.
- **Licence**: MIT ✅
- **Relevance**: Medium — saves iteration time when tuning physics constants.
- **Performance**: DEV only; zero cost in production builds.
- **Status**: ✅ Integrated (dev-only, behind `import.meta.env.DEV` guard)

---

## Tier 2 — Deferred / Experimental

### @react-three/fiber + @react-three/drei
- **Licence**: MIT ✅
- **Status**: Present in package.json but rendering migrated to raw Three.js (RenderingPanel). May be reintroduced for component-based UI overlays.
- **Verdict**: Deferred. Keep dependency but do not expand R3F usage until rendering strategy is settled.

### @react-three/rapier / Rapier WASM
- **Purpose**: Rigid-body physics for collision, joints, character controller.
- **Licence**: Apache-2.0 ✅
- **Relevance**: Low-Medium — our deterministic TS/WASM sim handles ball/player physics well. Rapier would add determinism complexity (WASM + JS bridge timing).
- **Risk**: Breaking determinism guarantee is high; Rapier's determinism requires fixed-seed, same step order.
- **Status**: 🔜 Experimental adapter only. Candidate for collision mesh (goals, pitch boundary) but NOT ball/player physics.
- **Verdict**: Do not replace TS simulation. Consider isolated `RapierBoundaryAdapter` for future goal-net collisions.

### Ecctrl
- **Purpose**: R3F character controller on top of Rapier.
- **Relevance**: Low for current architecture (no R3F canvas in use).
- **Status**: ⏸ Deferred until R3F is reinstated as primary renderer.

### React Postprocessing / three/addons EffectComposer
- **Purpose**: Bloom, vignette, colour grading, SSAO, motion blur.
- **Licence**: MIT / MIT ✅
- **Status**: 🔜 Pending. Use three/addons EffectComposer directly (compatible with raw Three.js renderer in RenderingPanel). Keep effects subtle; no effect if WebGPU path is used.

### Miniplex (ECS)
- **Purpose**: Entity-component management when scaling to 11v11.
- **Licence**: MIT ✅
- **Relevance**: Low now (3 entities). High relevance at Phase 4 (11v11).
- **Status**: 📋 Deferred to Phase 4.

### Recast Navigation
- **Purpose**: NavMesh pathfinding for tactical positioning.
- **Relevance**: Medium-High for off-ball player runs, zonal marking.
- **Status**: 📋 Deferred to Phase 3 AI work.

### Colyseus
- **Purpose**: Multiplayer authoritative game server.
- **Status**: 📋 Phase 5 only.

---

## Tier 3 — Assets

### Quaternius Universal Animation Library
- **Licence**: CC0 ✅ — no attribution required.
- **Format**: GLB with skinned mesh and BVH-retargetable animations.
- **Relevance**: Very high — locomotion clips (idle, run, sprint, kick) match football states exactly.
- **Pipeline**: glTF Transform → prune → compress → gltfjsx → React component.
- **Status**: 🔜 Infrastructure ready (`PLAYER_CLIP_NAMES` map in AnimationState.ts). Assets to be downloaded from quaternius.com and placed in `public/assets/characters/`.

### KayKit Character Animations
- **Licence**: CC0 ✅
- **Relevance**: High — modular character rig, easy re-colour for kits.
- **Status**: 🔜 Pending asset download.

### Kenney Animated Characters
- **Licence**: CC0 ✅
- **Relevance**: Medium — simpler rig, good fallback if Quaternius retargeting fails.
- **Status**: 🔜 Fallback option.

### Khronos Rigged Figure (glTF Sample Models)
- **Licence**: CC-BY 4.0 — attribution required ⚠️
- **Status**: Test fixture only. Must credit "glTF Sample Models by Khronos Group, CC-BY 4.0" if shipped.

---

## Rejected

### Unity / Unreal exported assets
- **Reason**: Engine-specific assets, potential licence restrictions on export. Use CC0 sources instead.

### Google Research Football (GRF) assets
- **Licence**: Apache-2.0 for code, but 3D assets/textures are proprietary. ❌
- **Status**: Concepts only. Use for inspiration on action schemas, observation design, tactical state. Do NOT import GRF rendering assets.

---

## Asset Delivery Pipeline (planned)

```
source GLB
  → @gltf-transform/cli prune + dedup + compress (draco / meshopt)
  → gltfjsx → auto-generated React component
  → useGLTF (drei) with Suspense + ErrorBoundary fallback
  → AnimationMixer driven by AnimationState.ts
```

Performance budgets (per character):
- GLB ≤ 500 KB compressed
- Triangles ≤ 5 000
- Texture atlas ≤ 512 × 512
- Animation clips ≤ 10 per character
- Draw calls ≤ 2 per character (body + kit decal)
