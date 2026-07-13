# Football Engine Prototype

A real-time 3D football physics and movement sandbox with analog control, soft possession, and deterministic simulation.

## Development

- Start dev server: `npm run dev`
- Run linter: `npm run lint`
- Build project: `npm run build`
- Run tests: `npm run test`

## Architecture
See `docs/CURRENT_ARCHITECTURE.md`.

## Features
- Fixed-timestep engine (120 Hz) separated from rendering (up to 144 Hz)
- Player Locomotion: Acceleration, turning speed, sprinting
- Ball Physics: Gravity, restitution (bounce), friction, independent velocity
- Soft possession mechanic
- Support for keyboard and gamepad inputs
- Diagnostic HUD
