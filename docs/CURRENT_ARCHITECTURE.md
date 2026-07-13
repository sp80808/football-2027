# Current Architecture

## Overview
The application is a real-time football gameplay prototype using React, Three.js (@react-three/fiber), and a custom physics and simulation engine written in TypeScript. 

## File Responsibilities
### `src/engine/`
- **Math.ts**: Provides standard 2D and 3D vector math abstractions (`Vec2`, `Vec3`) for position, velocity, and facing vectors.
- **InputSystem.ts**: Captures keyboard and Gamepad API inputs. Transforms raw inputs into a `ControllerFrame`.
- **Ball.ts**: Simulates ball physics, including 3D trajectory (gravity), ground collision, bounce restitution, and friction.
- **Player.ts**: Simulates the player entity, implementing locomotion (acceleration, turning, max speed), soft possession control zones, pass/shot charge, and kicking the ball.
- **Keeper.ts**: A rudimentary goalkeeper simulation that tracks the ball horizontally and attempts simple deflection if it's nearby.
- **GameEngine.ts**: The main tick manager. Currently implements a fixed-timestep update loop (120 Hz) that updates the input system, player, ball, and keeper, and enforces pitch boundaries.

### `src/components/`
- **Pitch.tsx**: A Three.js shader-based pitch surface generating grass stripes and white pitch lines via distance fields.
- **PlayerView.tsx**: 3D visual representation of the player state, using capsules and meshes, updating smoothly inside the render loop based on player's position and charge state.
- **KeeperView.tsx**: 3D visual representation of the goalkeeper.
- **BallView.tsx**: 3D visual representation of the ball, mapping engine (x, z) to rendering (x, -y) and rotating the sphere based on velocity.
- **Renderer.tsx**: Manages the `<Canvas>` environment, initializes the `GameEngine` singleton, handles camera following, and orchestrates the rendering loop updating at browser refresh rate while advancing the engine's fixed timestep updates.

## Update Flow
1. `requestAnimationFrame` fires in `Renderer.tsx`'s `useFrame`.
2. It passes the current time to `GameEngine.update(time)`.
3. `GameEngine` accumulates time and runs one or more fixed 120 Hz `tick()` loops.
4. Each `tick()` parses input, updates player/keeper velocities and positions, updates ball physics, and enforces collisions.
5. Control returns to the React Three Fiber `useFrame` loop.
6. `PlayerView`, `KeeperView`, and `BallView` read the updated simulation state and set object positions and rotations.
7. The browser renders the 3D scene.

## Input Flow
1. Raw `keydown`/`keyup` events and `navigator.getGamepads()` are sampled inside `InputSystem.update()`.
2. These generate a normalized `ControllerFrame` (e.g. left stick `[-1, 1]`, right stick, pass/shoot press states).
3. `Player.update()` reads `ControllerFrame` and converts it directly into velocity changes and pass/shoot charge states.
4. When releasing pass/shoot, the player imparts an impulse vector (`Vec3`) to the `Ball` based on the accumulated charge.

## Known Limitations
- Simulation state is mutated in-place and accessed directly by the rendering thread without interpolation. High refresh rate monitors run fine, but 60Hz displays may perceive micro-stuttering because the 120 Hz simulation might tick 1 or 2 times inconsistently per frame.
- Input system maps directly to physics. There is no abstracted "intent" representing what the player *wants* to do versus what they *can* do.
- Locomotion is overly simple linear acceleration with immediate direction change.
- Soft possession simply snaps the ball towards a target position instead of managing distinct touch cadences.
- The goalkeeper AI is limited to simplistic goal-line strafing.
- Missing configuration data files to centralize constants for pitch size, speeds, acceleration, friction, etc.
