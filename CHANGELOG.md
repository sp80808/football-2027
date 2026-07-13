# Changelog

## [Unreleased]
- Initial Audit completed.
- Added fixed-timestep update loop (120 Hz) with state interpolation.
- Added `SimulationConfig` to centralize physics and gameplay tunables.
- Refactored `InputSystem` to support Gamepad and Keyboard abstraction via `ControllerFrame`.
- Implemented physics-based soft possession and first touch concepts.
- Added `tests/` directory with Vitest configuration.
- Added on-screen Diagnostics panel.
