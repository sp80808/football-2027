# Football 2027 — Open-Source Feature-Parity Plan

Updated: 14 July 2026

## Goal

Close the most important player-facing gaps with modern football games while preserving an original product, deterministic browser simulation, licence safety and the current vertical-slice gate.

This plan does **not** attempt to clone FC26 or eFootball. It converts familiar capability areas into original Football 2027 systems:

- responsive contextual control;
- believable team shape and off-ball intelligence;
- readable contact, ball and goalkeeper outcomes;
- broadcast-grade presentation;
- career identity, progression and match consequences;
- scalable asset, replay and performance infrastructure.

## Admission rule

A dependency or borrowed algorithm enters the shipping codebase only when it:

1. improves a named player-facing outcome;
2. has a compatible licence and recorded provenance;
3. fits the deterministic simulation/presentation split;
4. has a bounded browser-performance budget;
5. can be removed or replaced without corrupting saves or replays;
6. does not delay issue #22, the current vertical-slice delivery gate.

## Capability parity matrix

| Capability area | Football 2027 target | Open-source leverage | Decision |
|---|---|---|---|
| Contextual passing and shooting | assisted target ranking, pass types, shot shaping, visible aim confidence | Google Research Football scenario/action concepts; original deterministic target scoring | **Study algorithms; do not embed GRF runtime** |
| Team tactics and off-ball runs | role assignments, support triangles, pitch control, pressing triggers, defensive lines | GRF/DB-Football scenario benchmarks; RoboCup time-to-intercept and multi-agent research | **Implement original pure TypeScript math** |
| Player contact | weight, balance, shielding, tackle windows, stumble/fall presentation | existing ContactMath foundation; Rapier only for non-authoritative presentation experiments | **Keep authoritative custom solver** |
| Ball behaviour | spin, rolling/sliding transition, deflection and first-touch error | existing deterministic Ball model and issue #19 | **Continue in-house deterministic solver** |
| Goalkeepers | interception prediction, rush, catch/parry decisions, recovery | GRF academy scenarios as tests; current analytic interception helper | **Build scenario harness around current engine** |
| Broadcast graphics | scorebug, event cards, replay treatment, depth and colour polish | `pmndrs/postprocessing`, Motion, Lucide, Troika text where 3D labels are required | **Prototype behind quality presets** |
| Character and stadium assets | efficient GLB delivery, animation retargeting, LOD, compressed textures | `@gltf-transform/*`, Meshoptimizer, Draco, KTX2/Basis, CC0 animation packs | **Adopt pipeline, not raw untracked assets** |
| Stadium/crowd navigation | concourse NPCs, camera rails, non-match spatial queries | `recast-navigation-js` | **Defer to stadium-life phase; not player football AI** |
| Behaviour authoring | inspectable goalkeeper/opponent state logic | existing `mistreevous` dependency; small typed state machines | **Use selectively; no engine-wide behaviour-tree rewrite** |
| Match replay and diagnostics | deterministic input replay, event timeline, camera cuts, regression fixtures | existing replay buffer; GRF-style episode/scenario structure | **High priority** |
| Online multiplayer | authoritative rooms, snapshots, reconnection and matchmaking | Colyseus or custom WebSocket protocol after deterministic replay is stable | **Research only until local slice and replay pass** |
| Career data and saves | migrations, validation, fixtures, progression, generated clubs | Zod, Zustand, IndexedDB via Dexie if localStorage becomes insufficient | **Zod now; Dexie only after schema stabilises** |
| Accessibility/input | remapping, device prompts, touch, reduced motion, readable colour states | Gamepad API, current input layer, DOM UI | **Continue in-house** |

## Recommended systems

### 1. Scenario and benchmark harness inspired by Google Research Football

**Use for:** repeatable football situations, not as a runtime dependency.

Create deterministic scenario fixtures such as:

- 2v1 counter attack;
- pass-and-shoot with keeper;
- loose-ball race;
- defensive recovery run;
- crossing and near/far-post occupation;
- high press escape;
- last-man tackle;
- goalkeeper rush decision.

Each scenario defines seed, players, ball state, tactical policy, success metrics and replay trace. This gives Football 2027 an objective way to improve AI and control feel without importing GRF’s C++/Python stack.

### 2. `pmndrs/postprocessing`

**Use for:** WebGL presentation only.

Prototype a capability-safe effect chain:

- SMAA or FXAA;
- tone mapping and colour grading;
- restrained bloom for floodlights and event emphasis;
- optional SSAO only where measurable;
- vignette limited to menus/replays, not normal gameplay.

Requirements:

- Low/Balanced/High presets;
- effects never alter simulation;
- GPU timings and fallback behaviour recorded;
- WebGPU path must not silently regress.

### 3. glTF asset pipeline

Adopt command-line asset processing using glTF Transform and Meshoptimizer-compatible compression.

Pipeline stages:

1. validate source and licence record;
2. normalise scale, axes, materials and animation names;
3. deduplicate geometry/materials;
4. generate LOD variants where useful;
5. compress geometry;
6. convert textures to KTX2/Basis where supported;
7. emit manifest with source, licence, triangle count, texture memory and target quality tier;
8. run browser load/performance smoke test.

### 4. Existing `mistreevous` behaviour trees

Use only for inspectable, low-frequency decision layers such as goalkeeper choice, opponent tactical mode and set-piece phases. Keep locomotion, collision, ball contact and high-frequency steering in explicit deterministic systems.

Required safeguards:

- tree state serialisable for replay diagnostics;
- no wall-clock timers;
- no random selector without `SeededRandom`;
- decisions produce intents, never mutate render objects.

### 5. `recast-navigation-js`

Do **not** use navmeshes for normal football positioning on a rectangular pitch. The pitch is better served by direct geometry, tactical assignments, interception estimates and pitch-control fields.

Potential later uses:

- crowd/concourse agents;
- training-ground navigation;
- tunnel and presentation sequences;
- stadium camera path planning;
- generated facility walkable areas.

## Systems rejected or deferred

### Engine-wide ECS migration

ECSY or another ECS would create extensive migration cost while the repository already has clear engine, rendering, UI, state and input boundaries. Reconsider only if profiling proves entity update organisation—not algorithms or rendering—is the limiting factor at full team scale.

### Generic rigid-body authority

Do not replace the authoritative custom football solver with Rapier or another general engine. It risks replay parity, control feel and stable football-specific contact. A rigid-body engine may be used later for presentation-only ragdolls or environmental props.

### Direct reinforcement-learning runtime

Do not ship TensorFlow/PyTorch policies in the browser during the current phases. Use research environments to learn test design and offline policy evaluation. Production opponents must remain deterministic, inspectable and performant until a later experimental branch proves otherwise.

### Immediate online multiplayer stack

Networking before replay determinism, state snapshots and local end-to-end stability would multiply debugging scope. First complete deterministic input replay and scenario validation.

## Feature-parity workstreams

### A. Expressive control

- semantic input parser integrated into live engine;
- contextual target ranking with confidence and manual override;
- grounded, lofted, through and driven pass intents;
- first-time actions and directional first touch;
- shot placement, power and body-shape error model;
- player switching based on intercept time and tactical relevance.

### B. Tactical intelligence

- role and assignment model;
- time-to-intercept service;
- pitch-control grid with bounded update frequency;
- support, overlap, underlap and third-man run candidates;
- pressing triggers and cover shadows;
- defensive line, compactness and rest-defence policy;
- action valuation for pass, carry, shoot and clear.

### C. Physical match feel

- contact integration and balance states;
- angular ball-ground contact;
- tackle anticipation, commitment and recovery;
- first-touch error from ball velocity, body orientation and attributes;
- goalkeeper catch/parry/punch decision model;
- readable fouls and advantage later, after contact is stable.

### D. Presentation

- compact scorebug and event timeline;
- line-up, formation and substitution overlays;
- replay director driven by authoritative events;
- quality presets and frame budgets;
- animation state machine and retargeted CC0 clips;
- crowd/stadium LOD and audio buses;
- accessibility-safe visual feedback.

### E. Career and progression

- club identity creator;
- canonical squad/player schema;
- match action tracking and XP;
- training programmes, fatigue and recovery;
- fixtures, standings and post-match consequences;
- tactical identity and player roles;
- later transfers, scouting, staff and facilities.

## Sequenced delivery

### Gate 1 — Playable identity loop

Complete issue #22 and sprint #29. No open-source integration should block this gate.

### Gate 2 — Scenario harness and control feel

- deterministic scenario format;
- input replay reset seam;
- contextual targeting;
- goalkeeper/interception scenarios;
- telemetry output for success rate and decision time.

### Gate 3 — Tactical small-sided football

- 3v3/5v5 team assignments;
- pitch control and support runs;
- pressing and defensive shape;
- scenario regression suite.

### Gate 4 — Presentation and asset pipeline

- postprocessing prototype with presets;
- glTF optimisation pipeline;
- animation/LOD manifest;
- event-driven replay and broadcast overlays.

### Gate 5 — Full-team scale and online research

Only after measured 11v11 tick/render budgets, deterministic replay and stable saves.

## Dependency governance

Every proposed dependency requires an entry containing:

- repository and package name;
- exact licence and version;
- why existing code is insufficient;
- authoritative or presentation-only classification;
- bundle/runtime cost;
- deterministic/replay implications;
- browser support and fallback;
- removal strategy;
- proof-of-concept branch and acceptance result.

## Immediate next issues

1. Scenario harness and replayable football academy fixtures.
2. Contextual targeting and player-switch scoring.
3. Tactical pitch-control and assignment service.
4. Postprocessing quality-preset spike.
5. Reproducible glTF/animation optimisation pipeline.

## Sources

- Google Research Football — Apache-2.0 research environment and scenario/replay model.
- DB-Football — multi-agent football research and benchmark reference.
- pmndrs/postprocessing — Three.js post-processing library.
- recast-navigation-js — WebAssembly Recast/Detour navigation toolkit.
- glTF Transform, Meshoptimizer, Draco and KTX2/Basis tooling — asset optimisation references.

All external code or assets still require a specific licence review before adoption.