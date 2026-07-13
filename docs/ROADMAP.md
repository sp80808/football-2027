# Development Roadmap

## Overview
30-week phased development plan transforming the 1v1 prototype into a full football simulation with realistic physics, complete FIFA rules, tactical AI, broadcast-quality graphics, and real English football data.

---

## Phase 1: Core Physics & Simulation (Weeks 1-6)
**Goal**: Production-ready physics foundation with enhanced realism

### Week 1-2: Enhanced Ball Physics
- [x] Magnus effect (spin-induced curve)
- [x] Variable air density (altitude, temperature, humidity)
- [x] Ball deformation on high-velocity impact
- [x] Surface-dependent friction (wet/dry, grass length)
- [x] Spin decay (air + ground)
- [x] Spin generation from tangential friction on bounce

### Week 2-3: Advanced Player Locomotion
- [ ] Momentum-based turning (angular inertia)
- [ ] Non-linear acceleration/deceleration curves
- [ ] Player-to-player collision resolution
- [ ] Stamina/fatigue system affecting performance
- [ ] Body lean animation sync with velocity
- [ ] Tackle/shoulder charge physics

### Week 3-4: Ball-Player Interaction
- [ ] First-touch quality based on attributes
- [ ] Body-part trapping (chest, thigh, foot)
- [ ] Shielding with body positioning
- [ ] Headers with jump timing and power
- [ ] Volley/half-volley detection and physics

### Week 4-6: FIFA Laws of the Game
- [ ] **Offside** - Real-time detection with active play logic
- [ ] **Throw-ins** - Correct procedure, foul throws
- [ ] **Goal Kicks** - New rule (ball in play when kicked)
- [ ] **Corner Kicks** - Placement, defenders distance
- [ ] **Free Kicks** - Direct/indirect, wall distance, quick free kicks
- [ ] **Penalties** - Stutter run, keeper movement, encroachment
- [ ] **Yellow/Red Cards** - Persistent infringement, DOGSO, SPA
- [ ] **Advantage Rule** - Play on when beneficial
- [ ] **Substitutions** - 5 subs, 3 windows + half-time
- [ ] **VAR Review** - Goal, penalty, red card, mistaken identity

**Deliverable**: Complete 1v1 simulation with all FIFA restarts and offside

---

## Phase 2: Tactical AI & Team Play (Weeks 7-12)
**Goal**: 11v11 with coherent team tactics and intelligent decision-making

### Week 7-9: Tactical Framework
- [ ] `TacticalProfile` system (formation, mentality, pressing, width, tempo)
- [ ] Role-based controllers (GK, CB, FB, CDM, CM, CAM, W, ST)
- [ ] Utility-based decision engine
- [ ] Team coordination (cover, overlap, third-man runs)

### Week 9-10: Advanced Goalkeeper
- [ ] Sweeper keeper behavior
- [ ] Shot probability heatmaps for positioning
- [ ] Cross claiming and punching
- [ ] Distribution decision tree (throw/kick/roll)
- [ ] Penalty mind games

### Week 10-11: Set Piece AI
- [ ] Corner routines (near/far/short/edge)
- [ ] Free kick routines (direct/cross/dummy/layoff)
- [ ] Penalty routines (placement/power/stutter)
- [ ] Throw-in routines (long/short/flip)
- [ ] Defensive assignments (man/zone/man+zone)

### Week 11-12: Team Coordination
- [ ] Overlapping/underlapping runs
- [ ] Third-man runs
- [ ] False nine dropping deep
- [ ] Inverted winger cuts
- [ ] Defensive cover rotations
- [ ] Pressing traps
- [ ] Counter-attack triggers

**Deliverable**: 11v11 match with tactical variety and realistic team play

---

## Phase 3: Graphics & Immersion (Weeks 13-18)
**Goal**: Broadcast-quality visuals with dynamic environments

### Week 13-14: Advanced Pitch
- [ ] Geometry shader grass with wind simulation
- [ ] Dynamic pitch wear (high-traffic degradation)
- [ ] Dynamic line marking (fade, chalk dust)
- [ ] Weather: rain puddles, snow, frost
- [ ] Time-of-day lighting (dynamic shadows)
- [ ] Stadium floodlight system

### Week 14-15: Player Rendering
- [ ] Skeletal animation (glTF models)
- [ ] Animation blend trees (locomotion/turn/kick/fall)
- [ ] Cloth simulation (shorts, sleeves, hair)
- [ ] Muscle deformation (corrective blend shapes)
- [ ] Facial animation (blend shapes)
- [ ] Kit physics (dynamic fabric)

### Week 15: Ball Visual Effects
- [ ] Spin visualization (subtle trail)
- [ ] Impact particles (dust, grass, water)
- [ ] Heat distortion on powerful shots
- [ ] Wet ball sheen
- [ ] Scuff mark accumulation

### Week 16-17: Stadium & Environment
- [ ] Modular stadium system (stands, roof, floodlights)
- [ ] Dynamic crowd (impostors, waves, flares, tifos)
- [ ] Animated advertising boards
- [ ] Integrated scoreboard
- [ ] TV broadcast camera angles
- [ ] VAR screen overlay

### Week 17-18: Post-Processing Pipeline
- [ ] ACES tone mapping + bloom
- [ ] Motion blur (camera + object)
- [ ] Depth of field (cinematic)
- [ ] Lens flare, chromatic aberration
- [ ] Film grain, vignette
- [ ] HDR output support

**Deliverable**: Broadcast-quality match presentation

---

## Phase 4: Real-World Data Integration (Weeks 19-26)
**Goal**: Authentic English football experience with real data

### Week 19-21: Data Pipeline
- [ ] football-data.co.uk (all English leagues) ingestion
- [ ] FBref/StatsBomb advanced metrics (xG, progressive, pressures)
- [ ] Transfermarkt values, contracts, transfers
- [ ] Football-Data.org live scores/fixtures
- [ ] OpenStreetMap stadium locations
- [ ] Automated ETL pipeline with validation

### Week 21-22: Attribute Calculation
- [ ] Statistical mapping to 1-20 attributes
- [ ] Position-specific weighting
- [ ] Age curve modeling (development → peak → decline)
- [ ] Form fluctuations
- [ ] Injury history impact

### Week 22-23: League Structure
- [ ] Full English pyramid (PL → National League N/S)
- [ ] Promotion/relegation playoffs
- [ ] Cup competitions (FA Cup, EFL Cup, EFL Trophy, FA Trophy)
- [ ] European qualification (CL, EL, ECL)
- [ ] Fixture scheduling algorithm
- [ ] TV revenue distribution

### Week 23-25: Career Mode
- [ ] CareerManager (save/load, progression)
- [ ] TransferMarket (AI clubs, negotiations, contracts)
- [ ] ScoutingSystem (fog of war, scout reports)
- [ ] TrainingSystem (sessions, development plans)
- [ ] StaffManager (coaches, scouts, medical, analysts)
- [ ] BoardObjectives (expectations, job security)
- [ ] NewsGenerator (dynamic narratives)

### Week 25-26: AI Scouting & Analysis
- [ ] Scout reports (attribute ranges, fog of war)
- [ ] Match reports (tactical analysis)
- [ ] Opposition instructions
- [ ] Player comparison tools
- [ ] Development predictions

**Deliverable**: Full career mode with real English football data

---

## Phase 5: Technical Excellence (Weeks 27-30)
**Goal**: Production-ready, performant, maintainable codebase

### Week 27-28: Testing & CI/CD
- [ ] Unit tests >90% coverage (Vitest)
- [ ] Integration tests (all major systems)
- [ ] Physics regression suite (deterministic seeds)
- [ ] Visual regression (Playwright + Chromatic)
- [ ] Performance benchmarks (CI gates)
- [ ] GitHub Actions pipeline

### Week 28-29: Performance Optimization
- [ ] Object pooling (zero per-tick allocation)
- [ ] Spatial hashing (collision broadphase)
- [ ] Instanced rendering (players, crowd)
- [ ] WASM physics hot path
- [ ] Web Workers for AI
- [ ] Bundle splitting (<1.5MB initial)

### Week 29-30: WASM Migration
- [ ] Port Ball, Player, Opponent, Keeper to Rust
- [ ] Fixed-point deterministic math
- [ ] SharedArrayBuffer zero-copy state
- [ ] Web Worker isolation
- [ ] TS fallback for unsupported browsers

**Deliverable**: Production-ready, shippable product

---

## Parallel Tracks (Continuous)

### Documentation (Ongoing)
| Document | Target |
|----------|--------|
| Physics Engine | Week 2 |
| Tactical AI | Week 9 |
| Rendering Pipeline | Week 15 |
| Data Pipeline | Week 21 |
| Career Mode Design | Week 25 |
| API Reference | Week 30 |

### Quality Gates (Per Phase)
- All tests passing
- TypeScript strict mode clean
- Bundle size within budget
- 120Hz simulation stable
- 60 FPS rendering on target hardware

---

## Risk Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Physics instability at 120Hz | Medium | High | Extensive test suite, continuous integration |
| AI performance at 11v11 | High | High | Spatial hashing, LOD AI, Web Workers |
| Data licensing issues | Low | High | Open sources only, clear attribution |
| WASM debugging complexity | Medium | Medium | Maintain TS fallback, comprehensive logging |
| Browser WebGPU support | Low | Medium | WebGL2 fallback, progressive enhancement |
| Scope creep | High | High | Strict phase gates, regular retrospectives |

---

## Success Criteria

| Metric | Target |
|--------|--------|
| Physics determinism | 100% (identical seeds → identical states) |
| Frame time (11v11) | < 16.67ms (60 FPS) |
| Tick time (11v11) | < 1ms |
| Test coverage | > 90% |
| Bundle size (gzipped) | < 1.5 MB |
| Visual fidelity | Broadcast quality |
| Data accuracy | > 95% vs sources |
| AI decision quality | Expert-rated "human-like" |



---

## Related documentation

- [Design system reuse audit](./DESIGN_SYSTEM_REUSE_AUDIT.md) — Figma and code alignment audit (merged from `origin/main`).

---

*Last Updated: 2026-07-13*
*Review: Weekly during active development*