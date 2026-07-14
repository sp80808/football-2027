# F2027 Continued Development Plan

## Current product reality

Football 2027 already has a deterministic TypeScript simulation, a Three.js renderer, React menu/HUD surfaces, quick match flow, career persistence, squad/training screens and post-match XP. The next stage should strengthen one coherent playable career loop before expanding scope further.

## Product objective

Deliver a polished browser football vertical slice where a player can:

1. launch the game and understand its identity;
2. create or select a club;
3. view a career hub and next fixture;
4. play a deterministic match with readable controls;
5. receive action-based XP and level progression;
6. return to a persisted career state.

## Development principles

- Simulation remains the source of truth; rendering and UI consume snapshots/events.
- Add no new major mode until the vertical slice is stable.
- Prefer deterministic generated data over external licensed datasets.
- Keep the TypeScript engine authoritative until a measured WASM migration is justified.
- Every sprint ends with typecheck, unit tests, build and browser smoke tests.

## Workstreams

### A. Brand and app shell

Implement canonical logo assets, honest loading, save/profile entry, menu hierarchy, accessibility entry points and consistent semantic tokens.

### B. Career vertical slice

Consolidate club identity, squad, fixtures, training, XP and persistence into one versioned career state with safe migration and recovery.

### C. Match feel

Prioritise first touch, passing target selection, shooting feedback, defending readability, goalkeeper behaviour, dead-ball flow and camera polish before broad tactical complexity.

### D. Broadcast HUD

Extract scorebug, clock, player status, event toast, power meter, target feedback and replay transport from monolithic surfaces. Keep the playfield clear.

### E. Content and assets

Create a deterministic fictional league, modular kit colours/patterns, reusable badge geometry, stadium lighting presets, crowd/audio tiers and player appearance variants.

### F. Quality and operations

CI on every pull request, deterministic replay fixtures, performance budgets, save migration tests, screenshot baselines and automated browser playtests.

## Release phases

### Phase 1 — Branded vertical slice

- brand assets and splash
- app shell and navigation polish
- canonical career state
- club creation or robust default club
- career hub → match → post-match → hub loop
- save migration and recovery

### Phase 2 — Match depth

- contextual passing/shooting targets
- dead-ball completeness
- fouls/cards/advantage baseline
- goalkeeper and defensive tuning
- replay and match event review

### Phase 3 — Career depth

- full season fixtures and table
- squad roles, form, fatigue and injuries
- training calendar and coaching programmes
- objectives, inbox and basic contracts

### Phase 4 — Team scale

- measured 11v11 performance path
- off-ball positioning and tactical policy
- player switching and attribution
- couch multiplayer input ownership

### Phase 5 — Public alpha

- onboarding and analytics consent
- crash/error reporting
- settings and accessibility audit
- deployment, rollback and save export/import
- feedback capture linked to build version

## Technical decisions to lock

1. One authoritative match phase/event vocabulary.
2. One versioned `CareerSave` schema.
3. One semantic token layer shared by all React surfaces.
4. One asset manifest API; filenames are not runtime contracts.
5. One input action map shared by keyboard, gamepad and touch.

## Performance budgets

- Stable 60 FPS on target laptop at 1080p
- Simulation tick p95 under 2 ms for the current match scale
- Initial menu-critical transfer under 3 MB compressed
- No unbounded allocations in the simulation tick
- HUD render updates driven by selectors, not full-store rerenders

## Definition of done

A feature is done only when it has tests, keyboard/gamepad behaviour, save/reload behaviour where relevant, failure-state UI, documentation and a reproducible browser verification step.
