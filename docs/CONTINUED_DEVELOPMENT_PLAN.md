# Football 2027 — Continued Development Plan

**Updated:** 14 July 2026  
**Planning horizon:** July–October 2026  
**Primary rule:** complete a playable, replayable career vertical slice before widening simulation or management scope.

## 1. Current strategic position

Football 2027 already has more foundation than a typical prototype:

- deterministic fixed-step TypeScript simulation;
- vanilla Three.js rendering separated from engine authority;
- keyboard/gamepad/touch input;
- match phases, ball flight/spin, player/opponent/keeper systems and offside;
- React menu, career, squad, training, gameplay and post-match surfaces;
- career persistence and early RPG progression;
- unit/E2E seams;
- active research and foundation work for contact physics, intent parsing, tactical intelligence and presentation.

The danger is simultaneous expansion. The project must stop treating every credible subsystem as equally urgent.

## 2. Product north star

A short browser session should support this loop:

1. **Prepare** — make one meaningful club/squad/tactical choice.
2. **Play** — control decisive football moments with expressive input.
3. **Resolve** — understand the result and why it happened.
4. **Progress** — improve a player, squad, club or ground.
5. **Return** — see a clear reason to play the next fixture.

Any major system must improve at least one step without making another materially worse.

## 3. Development lanes

### Lane A — playable product

Owns the end-to-end vertical slice, career loop, onboarding and progression. This lane sets release priority.

### Lane B — authoritative football

Owns deterministic physics, intent, rules, AI and replay-safe state. Work lands in small pure/tested foundations before live integration.

### Lane C — presentation and feel

Owns Three.js rendering, animation adapters, camera, audio, VFX, scorebug and performance presets. It never becomes simulation authority.

### Lane D — platform quality

Owns CI, test coverage, save migrations, accessibility, performance budgets, telemetry-safe diagnostics and release packaging.

Each sprint has one Lane A outcome. Other lanes may support it, but cannot replace it.

## 4. Gate sequence

### Gate 0 — branch and build health

Exit criteria:

- main typechecks, tests and builds;
- required Actions workflow is green;
- open PRs are rebased/current or explicitly superseded;
- no hidden AppleDouble/generated artefacts;
- architecture docs match the live vanilla Three.js path.

### Gate 1 — first playable club journey

Tracked by issue #22 and Sprint F27-S01.

Exit criteria:

- launch → club identity → career hub → match → post-match → hub;
- defaults reach kick-off in under five minutes;
- save survives reload;
- visible XP/progression consequence;
- F27 brand shell is coherent and accessible.

### Gate 2 — expressive small-sided football

Exit criteria:

- semantic intent parser is live;
- first touch, shielding, passing/shooting targeting and switching are readable;
- deterministic contact integration replaces direct/scripted dispossession in the scoped match mode;
- AI can press, contain and contest loose balls credibly;
- camera and aim feedback are frame-rate independent;
- replay remains deterministic.

### Gate 3 — meaningful career week

Exit criteria:

- fixture calendar and advance-day loop;
- training/recovery choice;
- squad selection and role coverage;
- player growth, condition and one relationship/identity dimension;
- league table and next-fixture consequences;
- no spreadsheet overload.

### Gate 4 — presentation and performance alpha

Exit criteria:

- Low/Balanced/High presets;
- stylised player/animation asset path with verified licences;
- readable scorebug, event toasts and post-match presentation;
- stable 60 FPS target on Balanced reference hardware;
- graceful WebGL capability fallback/context handling;
- audio categories, subtitles/captions and reduced motion.

### Gate 5 — closed external alpha

Exit criteria:

- packaged PWA/web deployment;
- save migration policy;
- crash/diagnostic capture that avoids personal data;
- onboarding and feedback flow;
- known-issues list;
- 20–50 invited testers complete at least three fixtures/career days;
- measured retention/friction informs next roadmap.

## 5. Proposed sprint sequence

### F27-S01 — Branded vertical slice shell (15–28 July)

Outcome: first club journey and fixture consequence. See [`SPRINT_F27_S01_BRANDED_VERTICAL_SLICE.md`](./SPRINT_F27_S01_BRANDED_VERTICAL_SLICE.md).

### F27-S02 — Club creator and squad attachment (29 July–11 August)

Outcome:

- complete Basic creator with Place, Identity, People, Football and Review;
- 3–5 authored-feeling founding-player cards generated from deterministic templates;
- squad role/condition view and accessible XI selection;
- generated badge/kit system uses original geometry and clear provenance;
- telemetry-free usability timing captured in test sessions.

Defer: detailed ground editor, transfers, academy and full staff market.

### F27-S03 — Expressive match feel (12–25 August)

Outcome:

- integrate current intent parser foundation;
- contextual pass/shot targeting and aim readability;
- frame-rate-independent camera/facing smoothing;
- scoped contact/tackle resolution from reviewed pure helpers;
- event stream supports pass, shot, save, tackle, possession and goal feedback;
- controller and keyboard parity tested.

Defer: 11v11 tactical completeness and active ragdoll.

### F27-S04 — Progression week (26 August–8 September)

Outcome:

- advance-day calendar;
- training/recovery programme choices;
- XP/level curve and attribute progression balanced for short sessions;
- condition/fatigue consequence;
- next fixture/table progression;
- save schema migration tests.

Defer: transfer-market economy and complex contracts.

### F27-S05 — Tactical intelligence and opposition (9–22 September)

Outcome:

- time-to-intercept reused for keeper, loose-ball race and passing lanes;
- bounded pitch-control/assignment layer;
- tactical identity visibly changes support/press shape;
- difficulty controls reaction/decision quality without hidden stat cheating;
- deterministic AI diagnostics and regression scenarios.

Defer: language-model tactical decision making.

### F27-S06 — Alpha presentation/performance (23 September–6 October)

Outcome:

- quality presets and performance budgets;
- licensed/CC0 character-animation pilot or polished procedural fallback;
- scorebug/event/replay readability pass;
- audio mix categories and offline deterministic commentary templates;
- accessibility and mobile interaction pass;
- closed-alpha deployment checklist.

## 6. Backlog admission test

A new feature enters an active sprint only when all answers are clear:

1. Which player-facing loop step improves?
2. What is visible in the first minute or first session?
3. What simpler version was considered?
4. What is explicitly omitted?
5. Which authoritative state owns it?
6. How is determinism/performance protected?
7. How will it be tested?
8. Which existing issue does it extend rather than duplicate?

Research may be valuable without entering implementation. Mark it as research and keep it off the integration critical path.

## 7. Technical boundaries

- Engine modules have no DOM or Three.js imports.
- Rendering consumes snapshots/events and never decides authoritative outcomes.
- Authoritative randomness is seeded.
- Fixed-step state is allocation-conscious and replay-safe.
- React/Zustand state is for UI and durable product state, not high-frequency physics mutation.
- Save data is versioned and migrated/validated.
- Third-party assets and dependencies require licence/provenance records.
- WASM remains optional until profiling proves a real need and parity tests exist.
- LLM/network features are enhancements; core match and career remain functional offline.

## 8. Performance budgets

Initial alpha budgets:

| Area | Budget |
|---|---:|
| Balanced render target | 60 FPS / 16.67 ms frame |
| Fixed simulation | 120 Hz |
| Simulation tick target | < 1 ms for scoped match mode; measure before 11v11 claims |
| Initial JS bundle | track and prevent unexplained growth; target < 1.5 MB gzipped after deliberate asset splitting |
| Persistent desktop HUD | < 25% viewport |
| Main-thread long tasks during play | none routinely > 50 ms |
| Save operation | outside authoritative tick; no visible hitch |
| Low preset | no required post-processing; reduced crowd/shadows/render scale |

Budgets are measured gates, not aspirational text. Record reference browser, device and scene.

## 9. Testing pyramid

### Unit

- deterministic math;
- schema migrations/defaults;
- XP/training curves;
- event classification;
- tactical/interception helpers.

### Scenario/regression

- seeded match snippets;
- tackle/ball-contact edge cases;
- keeper interception;
- offside/pass sequences;
- save/reload equivalence.

### Browser E2E

- launch/menu/creator/career/match/post-match path;
- keyboard and pointer routes;
- quality preset persistence;
- mobile viewport critical actions;
- no uncaught errors.

### Visual/performance

- fixed reference captures for splash/menu/HUD/post-match;
- low/balanced/high frame timings;
- HUD coverage and text readability;
- reduced-motion comparison.

## 10. Documentation cadence

At sprint start:

- update one sprint document;
- identify linked issues/PRs;
- state explicit deferrals.

During sprint:

- decisions that change architecture or product gates go into a concise ADR/decision log;
- new assets get provenance and usage records;
- do not create duplicate roadmaps for the same period.

At sprint end:

- update progress with shipped player-facing result;
- record test/performance evidence;
- close, split or roll over incomplete work explicitly;
- choose the next sprint from observed user friction and system risk.

## 11. Immediate next actions

1. Validate and merge the F27 brand/splash branch.
2. Review current PR #28 first because it is mergeable and narrows camera math cleanly.
3. Resolve/split stale or conflicting PRs before live integration.
4. Create the canonical club identity/save schema.
5. Implement the Basic creator and vertical-slice Playwright path.
6. Keep issue #22 as the near-term product gate until the complete loop is demonstrably playable.
