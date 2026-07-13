# Changelog

## [Unreleased]
- Graphics & design pass on the active WebGL/WebGPU renderer (`RenderingPanel`):
  - Added ACES filmic tone mapping + exposure for a broadcast look.
  - Added a gradient sky dome and hemisphere fill lighting; tightened sun shadow frustum.
  - Rebuilt the pitch texture with correct markings, mowing stripes, and grass grain.
  - Replaced capsule players with detailed footballer models (kit, shorts, socks, boots, arms, legs, hair) and numbered jerseys.
  - Added a speed-synced procedural run cycle (leg/arm swing, lean, bob).
  - Added a textured soccer ball.
  - Added an instanced, GPU-animated crowd (`src/scene/createCrowd.ts`) filling the stands.
  - Added a charge-aim indicator (target ring + line) for pass/shot targeting.
- Removed a redundant per-frame `setForceRender` in `GameplayScreen`.
- Added fixed-timestep update loop (120 Hz) with state interpolation.
- Added `SimulationConfig` to centralize physics and gameplay tunables.
- Refactored `InputSystem` to support Gamepad and Keyboard abstraction via `ControllerFrame`.
- Implemented physics-based soft possession and first touch concepts.
- Added `tests/` directory with Vitest configuration.
- Added on-screen Diagnostics panel.
