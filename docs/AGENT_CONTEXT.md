# Agent Developer Context Guide — Football 2027

This document provides future AI agents and developers with the technical context, architecture principles, coordinate mapping systems, and core mechanics required to successfully develop, debug, and expand the **Football 2027** engine.

---

## 1. Architectural Philosophy

Football 2027 is a real-time football gameplay prototype designed for deterministic simulation, offline replay capture, and low-latency physics response. It separates simulation physics from rendering to ensure consistent gameplay across different hardware frame rates.

### Decoupled Simulation & Rendering
* **Fixed Timestep (120 Hz)**: The physics engine ticks at a fixed rate of 120 Hz ($dt = 1/120 \approx 0.00833\text{ seconds}$). This ensures deterministic physics calculations (ball bounce, locomotion drag, collision resolution).
* **Variable Render Loop**: The rendering thread runs at the browser's refresh rate (up to 144 Hz or higher) using `requestAnimationFrame`.
* **State Interpolation (Double-Buffering)**: The engine maintains two simulation states: `prev` (state at tick $n-1$) and `curr` (state at tick $n$). When rendering, the engine interpolates between `prev` and `curr` based on the remaining accumulator fraction ($\alpha$), eliminating micro-stutters:
  $$\text{RenderState} = (1 - \alpha) \cdot \text{prev} + \alpha \cdot \text{curr}$$

---

## 2. Directory & Component Breakdown

```
src/
├── App.tsx                   # Central entry point, game loop manager, screen routing, and audio bridge.
├── main.tsx                  # React entry point.
├── index.css                 # Global styling (Tailwind CSS v4).
├── audio/
│   └── AudioManager.ts       # Audio manager controlling ambient, whistle, bounce, and kick sounds.
├── bridge/
│   ├── SimulationWorker.ts   # Web Worker running the simulation core off-thread.
│   └── SimulationWorkerClient.ts # Main-thread client that bridges user input and worker states.
├── components/
│   ├── Pitch.tsx             # Shader-based field line rendering.
│   ├── PlayerView.tsx        # 3D representation of the user controlled player.
│   ├── KeeperView.tsx        # 3D representation of the Goalkeeper.
│   ├── BallView.tsx          # 3D representation of the ball (mapping physics and roll).
│   ├── HUD.tsx               # In-match scoreboard, match stats, and replay controls overlay.
│   └── Renderer.tsx          # Renders the canvas environment and camera follow.
├── debug/
│   └── RenderingPanel.tsx    # Detailed WebGL canvas utilizing raw Three.js for direct performance control.
├── engine/
│   ├── Math.ts               # Custom Vec2 & Vec3 vector classes for zero-dependency calculations.
│   ├── SimulationConfig.ts   # Shared dimensions, constants, and player/ball tuning parameters.
│   ├── Intent.ts             # Input structures (ControllerFrame) and semantic player actions (PlayerIntent).
│   ├── Player.ts             # Locomotion physics, ball control states, and kick charge calculations.
│   ├── Keeper.ts             # Goalkeeper positioning, tracking, and defensive state logic.
│   ├── Opponent.ts           # CPU outfield AI (tracking, pressing, jockeying, tackling, dribbling, shooting).
│   ├── MatchManager.ts       # Match phases, rules (kick-off, half-time, full-time, goal celebration) and scoreboard.
│   ├── GameEngine.ts         # Main tick accumulator orchestrating updates to all engine modules.
│   ├── WorldState.ts         # Pre-allocated data structure for snapshotting and double-buffering.
│   └── ReplayRing.ts         # Circular buffer holding the last 5 seconds of full WorldState for instant replay.
├── screens/
│   ├── SplashScreen.tsx      # Cinematic intro menu with navigation.
│   ├── MainMenuScreen.tsx    # Game hub (Quick Match, Career, Settings).
│   ├── SettingsScreen.tsx    # Sound and gameplay difficulty settings.
│   └── GameplayScreen.tsx    # Orchestrates match simulation UI and overlay states.
└── store/
    └── gameStore.ts          # Zustand store synchronizing match time, score, and audio states.
```

---

## 3. Coordinate System & Axis Mappings

A critical source of bugs is mapping vectors between the **2D/3D Physics Engine** and the **Three.js WebGL Renderer**.

### Coordinate Specifications
* **Pitch Length ($Y$ or $Z$)**: The pitch runs from $+52.5\text{m}$ to $-52.5\text{m}$ (total length $105\text{m}$).
  * $+52.5\text{m}$ is the Goalkeeper's Goal Line.
  * $-52.5\text{m}$ is the Human Player's Goal Line.
  * $0$ is the Center Line.
* **Pitch Width ($X$)**: The pitch runs from $-34\text{m}$ to $+34\text{m}$ (total width $68\text{m}$).
* **Goal Mouth**: Half-width is $3.66\text{m}$ ($x \in [-3.66, 3.66]$). Height is $2.44\text{m}$ ($z \in [0, 2.44]$).

### Physics vs. Three.js Mapping
The physics engine uses a standard local-coordinate grid:
* $X$: Horizontal width-wise coordinate.
* $Y$: Longitudinal length-wise coordinate.
* $Z$: Vertical height-coordinate (for ball physics only).

In the **Three.js Renderer** (`BallView.tsx` / `PlayerView.tsx`), the vertical axis is $Y$, and the longitudinal axis is $-Z$. Use this mapping:

| Physics Coordinate | Three.js Vector Map | Explanation |
| :--- | :--- | :--- |
| `pos.x` | `position.x` | Horizontal position matches exactly. |
| `pos.y` | `-position.z` | Positive longitudinal movement points towards Three.js negative-Z. |
| `pos.z` | `position.y` | Vertical height is mapped to Three.js Y. |

```typescript
// Visual positioning map in BallView.tsx
meshRef.current.position.set(
  ball.pos.x,
  ball.pos.z + BALL_RADIUS,
  -ball.pos.y
);
```

---

## 4. Key Simulation Systems

### Double-Buffering & Interpolation
To avoid memory allocation overhead during fast ticks (120 Hz), the `GameEngine` pre-allocates states `stateA` and `stateB` and swaps them by reference:
```typescript
const tmp = this.prev;
this.prev = this.curr;
this.curr = tmp;
this.tick();
this.captureState(this.curr);
```
Make sure you never create new object allocations inside `tick()` or `updateLocomotion()`. Modify coordinates on pre-allocated vector components (`.set()`, `.add()`, `.copy()`).

### Ball Control States (`Player.ts`)
The player's possession is represented by `controlState`:
* `free`: Player is far from the ball.
* `loose_nearby`: Player is within $1.6\text{m}$ of the ball (can stretch or press).
* `under_control`: Player is within $0.8\text{m}$ (control zone) and the ball is low ($z < 1.0$).
* When `under_control`, the ball is continuously nudged toward an `idealPos` in front of the player's facing direction. This is a **soft possession** model—the ball remains a separate physics object and can be intercepted at any time.

---

## 5. Cheat Sheet for Development

### Common CLI Tasks
* **Start Dev Server**: `pnpm dev` (launches Vite on port 3000)
* **Run Lint**: `pnpm lint` (runs `tsc --noEmit` to verify type safety)
* **Run Unit Tests**: `pnpm test` (runs Vitest runner)
* **Build Project**: `pnpm build` (compiles production bundle into `dist/`)

### Formatting & Coding Rules
1. **No In-Tick Allocations**: Never allocate new `Vec2`, `Vec3`, `THREE.Vector3` or other objects inside high-frequency updates (`tick`, `update`, `useFrame`). Use class properties or scratch objects initialized in constructor.
2. **Deterministic Randomness**: Always use `this.random.next()` (from `SeededRandom.ts`) inside the physics calculations. Never use `Math.random()`.
3. **Sound Events**: Simulation events (kicks, bounces, goals) should be queued via the engine event queue (`tsEngine.drainEvents()`) rather than played directly, keeping simulation separate from browser audio contexts.
