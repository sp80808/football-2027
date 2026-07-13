# Open Source Research: Football 2027 Engine

> Research compiled: 2026-07-13
> Purpose: Identify open-source projects that can accelerate Football 2027 roadmap phases.

---

## Executive Summary

Football 2027 is a deterministic, 120 Hz tick-based football simulation built on TypeScript, React, Three.js, and custom physics. The roadmap spans expressive control (Phase 2), defensive AI (Phase 3), multiplayer scale (Phase 4), and career mode (Phase 5).

This report evaluates open-source libraries across six categories aligned to roadmap needs. Recommendations are graded **Adopt** (integrate now), **Evaluate** (prototype before committing), or **Monitor** (watch for maturity).

---

## 1. Physics & Collision

### Current State
Football 2027 uses a **custom hand-rolled physics layer** (Vec2/Vec3, double-buffered accumulator, pre-allocated state). This is intentional for deterministic replay and 120 Hz stability. Replacing the core physics engine is **not recommended** — it would break determinism and require rewriting the entire simulation layer.

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [Rapier](https://github.com/dimforge/rapier) (Rust/WASM) | ~12k | MIT | **Monitor** | Industry-grade 2D/3D physics with WASM bindings. Exceptionally fast. **Not for adoption now** because WASM introduces non-determinism risk and the project already has a working physics layer. Could be revisited if custom physics hits a wall. |
| [box2d-wasm](https://github.com/Birch-san/box2d-wasm) | 302 | Zlib | **Monitor** | Box2D v2.4 compiled to WASM. Good for 2D rigid bodies. Same WASM concerns as Rapier. |
| [cannon-es](https://github.com/pmndrs/cannon-es) | ~2k | MIT | **Monitor** | Lightweight 3D JS physics. Actively maintained fork of cannon.js. Useful only if the project ever abandons custom physics. |
| [Matter.js](https://brm.io/matter-js/) | ~19k | MIT | **Monitor** | Excellent 2D web physics. Overkill for a top-down football sim; better suited for puzzle/platformer prototypes. |

**Action**: Keep the custom physics layer. If collision stability issues arise during 11v11 (Phase 4.2), prototype Rapier WASM in a separate branch to benchmark determinism.

---

## 2. AI & Behavior Trees

### Current State
`Opponent.ts` implements CPU AI with hardcoded states (tracking, pressing, jockeying, tackling). Phase 3.2 (Jockey & Pressing) and Phase 3.4 (Tactical Policies) will require more sophisticated decision-making. A behavior tree (BT) or utility AI system would let designers tune opponent behaviors without rewriting code.

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [Mistreevous](https://github.com/nikkorn/mistreevous) | 136 | MIT | **Adopt** | Lightweight TypeScript BT library. JSON or DSL definitions, async actions, guards, seedable RNG. Zero dependencies. Perfect for opponent AI trees — defensive jockey, press triggers, tackle decisions. |
| [BehaviorTree.TypeScript](https://github.com/songhuixiang/ts-behaviortree) | — | MIT | **Evaluate** | Port of BehaviorTree.CPP. Supports async actions, XML-based tree definitions loaded at runtime, dataflow between nodes. More complex than Mistreevous but more powerful. |
| [ts-behavior-tree](https://github.com/robinxb/ts-behavior-tree) | — | MIT | **Monitor** | Fluent API, ~5 KB, zero dependencies. Simpler than Mistreevous but lacks async/guard features. Good for smaller state machines. |
| [ESEngine](https://github.com/esengine/esengine) | 888 | MIT | **Evaluate** | Full ECS framework with built-in behavior trees, utility AI, FSM, and tilemap rendering. **Heavyweight** — would require significant integration. Only consider if the project migrates to ECS architecture. |
| [behaviac](https://github.com/Tencent/behaviac) | ~4k | MIT | **Monitor** | C++/C# BT/FSM/HTN framework. Not TypeScript-native. Useful as a design reference for BT node architectures. |

**Action**: Integrate **Mistreevous** in Phase 3.2 for opponent jockeying/pressing behavior trees. It matches the project's TypeScript-first, zero-dependency philosophy and supports deterministic seeded RNG.

---

## 3. Pathfinding & Navigation

### Current State
No pathfinding library is in use. Sprint 4.2 (11v11 Simulation & Off-ball runs) and Sprint 4.1 (Spatial Collision Hashing) will need spatial queries and pathfinding for off-ball movement.

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [recast-navigation-js](https://github.com/isaac-mason/recast-navigation-js) | 421 | MIT | **Adopt** | WASM port of Recast/Detour. NavMesh generation, pathfinding, crowd simulation, temporary obstacles. Has a Three.js integration package (`@recast-navigation/three`). Perfect for 11v11 off-ball runs and goalkeeper positioning. |
| [navcat](https://github.com/isaac-mason/navcat) | — | MIT | **Adopt** | Pure JS alternative to recast-navigation-js. Same algorithms, no WASM overhead. Simpler integration if bundle size is a concern. Good for pitch-based 2D pathfinding. |
| [PathFinding.js](https://github.com/qiao/PathFinding.js) | 8.7k | MIT | **Monitor** | Classic grid-based pathfinding. Too coarse for a continuous football pitch (needs NavMesh, not grids). |
| [astar-typescript](https://github.com/digitsensitive/astar-typescript) | 101 | MIT | **Monitor** | Grid-based A*. Same limitations as PathFinding.js for this project. |
| [EasyStar.js](https://github.com/prettymuchbryce/easystarjs) | ~3k | MIT | **Monitor** | Async A* for tilemaps. Not suited for continuous 2D pitch movement. |

**Action**: Prototype **recast-navigation-js** during Sprint 4.1. Use it for off-ball run calculation and spatial collision hashing visualization. The Three.js integration is a bonus.

---

## 4. Football Data & Career Mode

### Current State
Phase 5 (Career Mode) requires club, player, competition, and transfer data. The roadmap mentions Zod schemas and SQLite/IndexedDB persistence.

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [openfootball](https://github.com/openfootball) | — | CC0-1.0 | **Adopt** | Public domain football datasets (fixtures, results, squads, lineups). JSON and Football.TXT formats. No API key required. Covers major leagues, World Cup, historical seasons. Perfect for seeding career mode data. |
| [StatsBomb Open Data](https://github.com/statsbomb/open-data) | 3,396 | Custom (free for research) | **Adopt** | Event-level match data with xG, shot coordinates, pass networks. Free for research/non-commercial. Excellent for scouting analytics and match event generation in Phase 5.3. |
| [football.json](https://github.com/openfootball/football.json) | — | CC0-1.0 | **Adopt** | Machine-readable match data in JSON. Directly usable in TypeScript. |
| [football-data.org](https://www.football-data.org/) | — | Free API | **Adopt** | RESTful API for fixtures, results, standings, squads, lineups. Free tier covers 12+ top competitions. Useful for live data feeds. |
| [API-Football](https://www.api-football.com/) | — | Freemium | **Evaluate** | Most comprehensive football API (events, lineups, player stats, H2H). Free tier ~100 req/day. Paid tier ~15s refresh for live scores. Overkill for offline career mode but useful for live integration. |
| [open-football (Rust)](https://github.com/ZOXEXIVO/open-football) | 193 | MIT | **Monitor** | Rust-based football manager engine. Interesting architecture (Markov chains, ECS). Could inspire the Rust/WASM speedup mentioned in AGENT_CONTEXT.md if the project ever ports simulation to WASM. |

**Action**: Integrate **openfootball** datasets during Phase 5.1 for career mode seeding. Use **StatsBomb** open data for match event generation and scouting analytics in Phase 5.3.

---

## 5. Multiplayer & Networking

### Current State
Phase 4.3 (Couch Multiplayer) and the long-term goal of online multiplayer require authoritative server architecture, state synchronization, and room management.

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [Colyseus](https://github.com/colyseus/colyseus) | 7,074 | MIT | **Adopt** | The best Node.js multiplayer framework for web games. State synchronization, matchmaking, rooms, delta-compressed binary encoding. Full TypeScript support. Perfect for Phase 4.3 (couch multiplayer) and future online play. |
| [Colyseus Schema](https://github.com/colyseus/schema) | 167 | MIT | **Adopt** | Binary state serializer with delta encoding. Use alongside Colyseus for efficient network sync. |
| [PeerJS](https://peerjs.com/) | ~14k | MIT | **Evaluate** | WebRTC wrapper for peer-to-peer. Good for couch multiplayer (local network) without a server. Less suitable for authoritative online play. |
| [Talo](https://trytalo.com/) | — | MIT | **Monitor** | Self-hostable game backend (players, leaderboards, stats, analytics). Could complement Colyseus for player accounts and persistence. |
| [Socket.IO](https://github.com/socketio/socket.io) | ~61k | MIT | **Monitor** | Already familiar to most web devs. Colyseus is a better fit for game state sync, but Socket.IO works for simple lobby/matchmaking. |

**Action**: Integrate **Colyseus** in Phase 4.3. It is the industry standard for Node.js web multiplayer and has excellent TypeScript support. Use Colyseus Schema for state serialization.

---

## 6. Audio

### Current State
The project uses **Howler.js** for audio (already in `package.json`). `AudioManager.ts` handles ambient, whistle, bounce, and kick sounds. The roadmap doesn't list audio as a priority, but 3D spatial audio would significantly enhance immersion.

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [Howler.js](https://github.com/goldfire/howler.js) | ~24k | MIT | **Keep** | Already in use. Excellent for basic audio. No need to replace. |
| [Tone.js](https://github.com/Tonejs/Tone.js) | ~13k | MIT | **Evaluate** | Web Audio framework for interactive music. Useful for adaptive match music (stinger on goal, tension buildup). Overkill for sound effects. |
| [Omnitone](https://github.com/GoogleChrome/omnitone) | 911 | Apache-2.0 | **Monitor** | Ambisonic spatial audio for the web. Could add 3D positional audio (crowd noise, ball kicks directional). Requires HRTF support and more Web Audio API knowledge. |
| [tuna](https://github.com/Theodeus/tuna) | ~1.5k | MIT | **Monitor** | Audio effects library (reverb, delay, distortion). Useful for stadium atmosphere effects. |

**Action**: Keep **Howler.js** for now. If spatial audio becomes a priority (post-launch), prototype **Tone.js** for adaptive music and **Omnitone** for positional crowd/kick audio.

---

## 7. Rendering & Game Engines

### Current State
Three.js + React Three Fiber is the rendering stack. The project has a custom broadcast-style camera and shader-based pitch rendering. No engine migration is needed.

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [React Three Fiber](https://github.com/pmndrs/react-three-fiber) | ~26k | MIT | **Keep** | Already in use. Excellent React-Three.js bridge. |
| [Drei](https://github.com/pmndrs/drei) | ~10k | MIT | **Keep** | Already in use (`@react-three/drei`). Useful helpers. |
| [Babylon.js](https://github.com/babylonjs/babylon.js) | ~23k | MIT | **Monitor** | Powerful 3D engine with built-in physics, audio, and GUI. Would require a full rewrite. Not recommended. |
| [melonJS](https://github.com/melonjs/melonJS) | ~5k | MIT | **Monitor** | Lightweight 2.5D HTML5 engine with tilemaps, physics, and Tiled integration. Interesting for future 2D modes or prototyping. |
| [Strata Game Library](https://github.com/jbcom/strata-game-library) | 2 | MIT | **Monitor** | Procedural 3D graphics for React Three Fiber. Could help with procedural stadium/crowd generation. Very early stage. |

**Action**: No changes to the rendering stack. Watch **melonJS** if a 2D tactical view is ever needed.

---

## 8. Data Validation & State Management

### Current State
Zod is already used for schema validation. Zustand manages UI state. The simulation uses custom double-buffered state (`WorldState.ts`).

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [Zod](https://github.com/colinhacks/zod) | ~33k | MIT | **Keep** | Already in use. Excellent for career mode data schemas. |
| [Zustand](https://github.com/pmndrs/zustand) | ~50k | MIT | **Keep** | Already in use. Perfect for UI state. |
| [Immer](https://github.com/immerjs/immer) | ~27k | MIT | **Evaluate** | Immutable state with mutable syntax. Could simplify WorldState updates if the project moves away from pre-allocated mutation. **Not recommended now** because the current pre-allocated pattern is more performant for 120 Hz ticks. |
| [RxJS](https://github.com/ReactiveX/rxjs) | ~38k | Apache-2.0 | **Monitor** | Reactive streams. Useful for complex event buses (match events → UI → audio). Overkill unless event complexity grows significantly. |

**Action**: No changes needed. The current stack is appropriate.

---

## 9. Testing & Quality

### Current State
Vitest is used for unit tests. The roadmap requires >90% test coverage and strict TypeScript mode.

### Recommendations

| Project | Stars | License | Verdict | Rationale |
|---------|-------|---------|---------|-----------|
| [Vitest](https://github.com/vitest-dev/vitest) | ~13k | MIT | **Keep** | Already in use. Fast, ESM-native, great TS support. |
| [Playwright](https://github.com/microsoft/playwright) | ~67k | Apache-2.0 | **Keep** | Already in use for E2E. Excellent for integration testing match flows. |
| [testing-library/react](https://github.com/testing-library/react-testing-library) | ~25k | MIT | **Keep** | Already in use. Standard for React component tests. |

**Action**: No changes. The testing stack is solid.

---

## Prioritized Integration Roadmap

| Priority | Library | Phase | Integration Effort | Impact |
|----------|---------|-------|-------------------|--------|
| **P0** | Mistreevous | Phase 3.2 | Low | Enables data-driven opponent AI without rewriting Opponent.ts |
| **P0** | openfootball datasets | Phase 5.1 | Low | Provides free, legal career mode data (clubs, players, competitions) |
| **P1** | recast-navigation-js / navcat | Phase 4.1 | Medium | Enables spatial queries, off-ball pathfinding, collision hashing visualization |
| **P1** | Colyseus | Phase 4.3 | Medium | Industry-standard multiplayer framework for couch/online play |
| **P1** | StatsBomb Open Data | Phase 5.3 | Low | Free xG and event data for scouting analytics and match event generation |
| **P2** | BehaviorTree.TypeScript | Phase 3.4 | Medium | More powerful than Mistreevous if tactical policies need complex trees |
| **P2** | Tone.js | Post-launch | Low | Adaptive match music without touching core audio |
| **P3** | Rapier (WASM) | Future | High | Physics replacement only if custom physics becomes unmaintainable |

---

## License Compliance Notes

- All **Adopt** and **Evaluate** libraries use permissive licenses (MIT, Apache-2.0, CC0-1.0).
- StatsBomb Open Data requires attribution ("Data provided by StatsBomb") for any published research or analysis.
- No GPL-licensed libraries are recommended to avoid copyleft contamination of the codebase.
- All libraries are compatible with the project's TypeScript/module architecture.

---

## Risks & Caveats

1. **Determinism**: Any library using `Math.random()`, floating-point non-determinism, or unseeded RNG breaks the 120 Hz simulation's replay capability. All recommended libraries must be audited for deterministic behavior before integration.
2. **WASM Overhead**: Rapier and recast-navigation-js use WASM. WASM introduces startup cost and memory management complexity. Test thoroughly on target hardware.
3. **Bundle Size**: The roadmap mandates <1.5 MB gzipped. Mistreevous (~15 KB), navcat (~10 KB), and Colyseus Schema (~5 KB) are safe. Rapier and Tone.js need careful tree-shaking.
4. **Maintenance**: Verify library maintenance frequency before adopting. Prefer libraries with active CI, recent commits, and responsive maintainers.

---

## Next Steps

1. **Prototype Mistreevous** in `src/engine/Opponent.ts` during Phase 3.2 sprint. Build a simple jockey/press behavior tree and measure performance.
2. **Seed career mode data** from openfootball datasets during Phase 5.1. Convert Football.TXT to Zod-validated JSON.
3. **Benchmark navcat** against custom spatial hashing during Phase 4.1. Compare pathfinding speed and memory usage.
4. **Set up Colyseus dev server** alongside the existing Express server for Phase 4.3 couch multiplayer proof-of-concept.

---

*This document is maintained alongside the roadmap. Update when new libraries are evaluated or integrated.*
