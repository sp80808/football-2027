# Simulation mathematics and compatible OSS research

## Immediate findings

The current project already uses a deterministic 120 Hz fixed timestep, but several tunings are expressed as per-second exponential multipliers and ad-hoc constants. The ball model also mixes a fixed lift coefficient with an angular-velocity cross product, so Magnus acceleration can scale too aggressively with spin. Ground friction is currently exponential rather than a rolling/sliding regime.

## Implemented integration

`CameraController` now consumes `criticallyDampedStep()` directly for camera position, look target and shake recovery.

The integration:

- removes the previous explicit-Euler spring plus 60 Hz-authored damping multiplier;
- caps unusually large render deltas after tab suspension;
- keeps reusable Three.js vectors to avoid per-frame temporary allocation;
- uses mode-specific natural frequencies instead of stiffness/damping pairs;
- leaves all camera motion presentation-only and outside authoritative simulation state;
- adds a 30/60/120 Hz equivalence regression for the exact spring primitive.

This is the first live consumer required by issue #27. Keeper, pass and player-switch interception remain follow-up consumers and must refine the analytic solution against acceleration limits and sampled ball trajectories.

## Priority 1: exact, deterministic primitives

Use `SimulationMath.ts` for:

- exact exponential damping: `exp(-lambda * dt)`
- half-life-authored damping: `lambda = ln(2) / halfLife`
- exact critically damped spring updates for camera, facing, keeper positioning and desired velocity
- analytic constant-velocity interception for passes, loose balls, keeper rushes and player switching

These avoid frame-rate-dependent `lerp` tuning and reduce iterative search work.

## Priority 2: hybrid ball model

Treat the football as a hybrid continuous/discrete system:

1. **Airborne:** semi-implicit integration of gravity, quadratic drag and Magnus force.
2. **Impact event:** continuous collision detection against ground, posts and crossbar; apply normal restitution and bounded tangential impulse.
3. **Sliding:** Coulomb friction with approximately constant deceleration until slip ratio approaches rolling.
4. **Rolling:** rolling resistance plus spin decay; stop using a low-speed dead zone with hysteresis.

Recommended force model:

- drag: `F_d = -0.5 * rho * C_d * A * |v| * v`
- Magnus: `F_m = 0.5 * rho * A * C_l(S) * |v|^2 * normalize(omega × v)`
- spin parameter: `S = radius * |omega| / max(|v|, epsilon)`
- use a bounded empirical `C_l(S)` curve instead of fixed `C_l` multiplied by unbounded `|omega|`

Use event-time correction for bounces so a 120 Hz step does not penetrate the pitch and then reflect late. Wolfram's event-driven bouncing-ball examples support modelling continuous motion with discrete impact events and restitution.

## Priority 3: iterative contact solver

Do not import a full rigid-body world into gameplay immediately. First implement a small sequential impulse solver for player capsules and ball contacts:

- broad phase: uniform spatial hash on the pitch
- narrow phase: capsule/circle and swept sphere tests
- warm-start accumulated impulses
- 4–8 projected Gauss–Seidel iterations
- Baumgarte or split-impulse positional correction
- Coulomb friction cone clamp
- deterministic stable contact ordering by entity ID

This is sufficient for 22 players and one ball, while remaining transparent and replayable.

## Priority 4: gameplay prediction

Use analytic or bounded iterative predictions:

- constant-velocity interception as the cheap first pass
- acceleration-limited time-to-reach lookup table for players
- sampled ball trajectory at fixed future horizons for lofted passes and keeper saves
- root-bracketed binary search for first reachable trajectory point
- hysteresis on target selection to prevent AI role flicker

For assignment problems:

- Hungarian algorithm for defensive marking and set-piece assignments
- min-cost matching with persistence penalty to avoid constant swaps
- utility scoring for pass selection, combining angle, arrival-time margin, pressure, progression and interception risk

## Priority 5: spatial and tactical algorithms

- uniform grid/spatial hash for nearby-player and collision queries
- Voronoi-style space-control estimates for tactical overlays and support runs
- Delaunay neighbours or k-nearest neighbours for local passing options
- velocity obstacles/ORCA concepts for collision-aware off-ball steering, but use them as a local avoidance layer rather than authoritative physics
- influence maps updated at 5–10 Hz, not 120 Hz

## Performance rules

- structure-of-arrays in the future Rust/WASM core
- packed snapshots and coarse JS/WASM calls
- fixed-size scratch buffers and object pools
- update tactical assignments at 2–10 Hz
- update local steering and contacts at 120 Hz
- use deterministic seeded randomness and sorted iteration order
- benchmark 1v1, 3v3 and 11v11 separately

## Compatible OSS sources

### Rapier

Rust 2D/3D physics engine with JavaScript/TypeScript npm packages. Useful as a reference or optional native/WASM backend for broad phase, CCD, contact manifolds and sequential impulses. Avoid making full Rapier world state the gameplay API until determinism, bundle size and replay parity are measured.

### Parry

Rust geometric and collision-detection library from the same organisation. Better fit than full Rapier if the project wants custom football-specific dynamics but production-quality shape queries, ray casts, swept tests and contact geometry.

### Avian

Modern Rust/Bevy physics codebase worth studying for solver organisation and ECS-friendly data layout. It is not a direct dependency for the current React/Three.js client.

## Suggested implementation order

1. Merge deterministic math primitives and tests.
2. Replace camera/keeper smoothing with exact critical damping.
3. Use analytic interception in keeper and opponent prediction.
4. Refactor ball air forces into dimensionally consistent drag/Magnus functions.
5. Add event-time ground impact and sliding-to-rolling state.
6. Add spatial hash and stable contact ordering.
7. Introduce iterative contact solver.
8. Add assignment and influence-map systems only when 3v3 begins.

## Validation gates

- results equivalent at 30, 60, 120 and variable render rates
- deterministic replay hash remains stable
- no NaN/Infinity under 100,000 randomized shots
- kinetic energy never increases without an impulse or potential-energy conversion
- bounce energy matches restitution squared within tolerance
- interception predictions match simulated arrival within a bounded error
- 11v11 broad-phase and AI query cost remain comfortably below the 8.33 ms simulation budget
