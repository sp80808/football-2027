# Sprint F27-S01 — Branded Vertical Slice Shell

**Dates:** 15–28 July 2026  
**Length:** 10 working days  
**Delivery gate:** [#22 — Vertical slice: arcade club creation to first playable fixture](https://github.com/sp80808/football-2027/issues/22)  
**Supporting work:** [#15 UI foundations](https://github.com/sp80808/football-2027/issues/15), [#24 performance/readability](https://github.com/sp80808/football-2027/issues/24), [#9 broadcast UI](https://github.com/sp80808/football-2027/issues/9)

## Sprint outcome

A new player can launch Football 2027, understand the product, create or accept a default local club identity, enter the career hub, start one playable fixture, see a result/progression consequence and return to the hub.

The sprint is successful only if the journey is playable end to end. A beautiful isolated menu or a deeper simulation subsystem does not satisfy the goal.

## Player-facing promise

> From first launch to first kick-off in under five minutes, with a clear club identity and a reason to play the next match.

## Baseline at sprint start

Already present:

- deterministic 120 Hz simulation separated from presentation;
- React screen routing and vanilla Three.js match rendering;
- splash, main menu, quick match, career, squad, training, gameplay and post-match screens;
- career persistence and early player/XP work;
- tests and Playwright seam;
- active physics and simulation-math PRs.

New in this branch:

- Forward Pitch logo asset family;
- branded splash background and implemented splash;
- branded main-menu shell;
- semantic colour-token alignment;
- UI implementation guide and asset register.

## Scope and backlog

### P0 — must ship

| ID | Work | Acceptance |
|---|---|---|
| S01-01 | Merge branded splash/menu shell | Typecheck, tests and production build pass; keyboard/pointer start works; reduced motion is respected. |
| S01-02 | Minimal club identity domain | Deterministic club name, short name, region, two colours and badge seed persist in career save. |
| S01-03 | Basic club creator | Defaults permit completion in under five minutes; Place, Identity, Football and Review are usable; optional Ground/People details may be compact presets. |
| S01-04 | Career hub handoff | Created club identity appears in hub; next fixture and one primary action are obvious. |
| S01-05 | First fixture handoff | Career fixture launches the authoritative gameplay screen and returns a result. |
| S01-06 | Post-match consequence | Controlled player receives visible XP/progress; Continue returns to career hub with persisted state. |
| S01-07 | End-to-end test | Playwright covers splash/menu → creator/default career → match seam → post-match → hub and reload persistence. |

### P1 — do when P0 is stable

| ID | Work | Acceptance |
|---|---|---|
| S01-08 | Foundation component extraction | Add `BrandLockup`, `ScreenShell`, `ProgressMeter` only where at least two screens consume them. |
| S01-09 | Low/Balanced/High preset shell | Quality choice persists and controls at least crowd/shadows/render scale; default is capability-safe. |
| S01-10 | Compact scorebug alignment | Uses F27 tokens, tabular score/clock and compact team accents without obscuring play. |
| S01-11 | Raster brand exports | 1024 transparent mark, 512 app icon and 32 favicon generated from authoritative SVGs and checked at small sizes. |

### Explicitly deferred

- full 11v11 tactical completeness;
- generic rigid-body engine migration;
- active ragdoll implementation;
- real club/league branding or unverified player databases;
- AI-generated live commentary expansion;
- full stadium builder;
- deep transfer market/economy;
- broad analytics dashboards;
- marketing site rebuild.

These may continue as isolated research or reviewed foundation PRs, but they must not destabilise the sprint branch or consume the vertical-slice integration window.

## Ten-day execution plan

### Day 1 — Wednesday 15 July

- Review/merge brand shell after build and visual smoke checks.
- Reconcile active PRs #17, #25 and #28 against the vertical-slice branch plan.
- Freeze new broad epics for the sprint.

### Day 2 — Thursday 16 July

- Define canonical `ClubIdentity` schema and migration/default handling.
- Add deterministic generator and tests.
- Record data ownership and save version.

### Day 3 — Friday 17 July

- Implement Basic club creator: Place + Identity.
- Live colour/name preview using original generated geometry only.
- Ensure keyboard and small-screen flow.

### Day 4 — Monday 20 July

- Implement Football + Review steps.
- Add tactical identity preset, captain/default XI choice and Found Club action.
- Persist and route to career hub.

### Day 5 — Tuesday 21 July

- Replace career placeholder content with created identity and next fixture.
- One primary action: Play Next Match.
- Add empty/error recovery for missing or invalid save data.

### Day 6 — Wednesday 22 July

- Validate career → gameplay handoff.
- Keep new career data out of authoritative per-tick allocation paths.
- Confirm quick match remains unaffected.

### Day 7 — Thursday 23 July

- Implement post-match progression summary and save update.
- Keep report concise: result, XP/level movement, one turning point and Continue.

### Day 8 — Friday 24 July

- Consolidate scorebug/readability and quality-preset basics.
- Run 1366×768, 1920×1080 and representative mobile viewport checks.

### Day 9 — Monday 27 July

- Add Playwright vertical-slice and persistence path.
- Run deterministic unit tests, typecheck, build and browser smoke tests.
- Fix only release-blocking defects.

### Day 10 — Tuesday 28 July

- Sprint review against player-facing outcome.
- Capture screenshots and performance notes.
- Close/roll over tasks with explicit reasons.
- Select the next sprint from observed friction, not from the longest roadmap list.

## Technical constraints

- `src/engine/` remains DOM- and Three.js-free.
- Never use `Math.random()` in authoritative generation/simulation; use project seeded randomness.
- Fixed timestep remains 120 Hz; rendering stays interpolated.
- No per-tick UI-store churn or broad React rerenders.
- Avoid adding dependencies unless they replace meaningful project code and pass licence review.
- New UI must use semantic F27 tokens and visible focus states.
- Match UI must not own simulation authority.

## Definition of done

All P0 items are complete and:

- [ ] `npm run lint` passes.
- [ ] `npm run test` passes.
- [ ] `npm run build` passes.
- [ ] Playwright vertical-slice smoke passes.
- [ ] No new uncaught console errors in the journey.
- [ ] Save survives reload and invalid old data degrades safely.
- [ ] Splash and creator work with keyboard.
- [ ] Reduced-motion path communicates the same information.
- [ ] Primary actions remain visible at 1366×768 and mobile portrait.
- [ ] Live HUD does not obscure the central/lower-middle playfield.
- [ ] The first playable fixture is reachable in under five minutes using defaults.
- [ ] The post-match screen provides a visible progression consequence.

## Measurement

Capture these numbers at review:

| Metric | Sprint target |
|---|---:|
| First launch → career hub with defaults | < 3 minutes |
| First launch → kick-off with defaults | < 5 minutes |
| Primary action recognition | obvious within 3 seconds per screen |
| Desktop persistent live-HUD coverage | < 25% viewport |
| Target render performance | 60 FPS on Balanced reference environment |
| Typecheck/build/test regressions | 0 |
| Vertical-slice critical console errors | 0 |

## Risks and controls

| Risk | Control |
|---|---|
| Physics PRs collide with UI integration | Merge pure foundations independently; defer live integration unless required by the slice. |
| Creator becomes a large customisation suite | Ship Basic presets first; place Advanced behind a later gate. |
| Brand work becomes cosmetic churn | Code only approved assets/tokens needed by current screens. |
| Career models diverge again | One versioned schema and one migration/default path. |
| Low-end browser presentation regresses | Capability-safe default, quality preset, measured crowd/shadow budgets. |
| Automated agents create duplicate work | Every task references this sprint and an existing issue/PR before implementation. |

## Review questions

1. Did the player reach a satisfying match quickly?
2. Did creating the club increase attachment without delaying play?
3. Was the next action obvious on every screen?
4. Did post-match progression create a reason to continue?
5. Which single friction point most deserves Sprint F27-S02?
