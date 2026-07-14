# Football 2027 — Live Development Priority Queue

**Updated:** 14 July 2026  
**Canonical repository:** `sp80808/football-2027`  
**Current main:** `4d75977`  
**Product gate:** complete the branded career vertical slice before broadening simulation or management scope.

## Current repository reality

- `main` contains the newest gameplay, career, audio, renderer, multiplayer scaffold, dead-ball, targeting and control work.
- Draft PR #30 contains the working brand/splash/menu implementation, but it diverged from `main` at `547406d`.
- PR #30 currently contains 13 branch commits while `main` has six newer commits from the shared base. It must not be merged or force-updated without reconciliation.
- Commit `af7ecea` removed `simulation/pkg`, while the dormant worker bridge still imports it. Issue #38 owns the decision to rebuild or retire that bridge coherently.
- PR #31 is closed as superseded. Its branch remains available only for selective recovery of unique editable assets and documentation.

## Priority order

### P0 — Repository safety and build health

1. **Rebuild PR #30 on current `main`.**
   - Start from current `main` rather than resetting or force-pushing the old branch.
   - Transplant only the brand assets, splash/menu changes, semantic tokens and useful documentation.
   - Preserve all newer gameplay, career, renderer, audio, input, replay, dead-ball and multiplayer files.
   - Run typecheck, tests, production build and browser smoke tests before replacing or closing PR #30.

2. **Resolve issue #38: dormant WASM bridge.**
   - Either add a reproducible Rust/WASM generation path and TypeScript fallback, or remove the unused bridge and imports together.
   - Do not restore opaque generated binaries merely to satisfy a cloud environment.

3. **Establish a clean CI baseline.**
   - TypeScript/typecheck, unit tests, production build and one Playwright smoke journey must run from a clean clone.
   - Generated screenshots, Playwright session dumps and local environment files must not become runtime dependencies.

### P1 — Sprint F27-S01 branded career vertical slice

Execute in dependency order after P0:

1. **#33 Brand and splash integration** — from the reconciled PR #30 implementation.
2. **#34 Versioned `CareerSave` and `ClubIdentity`** — migration, corruption recovery and reset.
3. **#35 Career hub and typed fixture handoff** — one payload into gameplay and one result contract back.
4. **#36 Post-match XP** — displayed rewards must exactly match persisted rewards.
5. **#37 E2E/accessibility/performance gate** — launch → career → match → post-match → reload.

The sprint is complete only when a player can enter the game, use a default or created club, play the next fixture, receive progression and reload into the updated career state.

### P2 — Stabilise the current match

After the vertical slice is functional:

- Add regression coverage around dead-ball restarts, contextual targeting, controlled-player switching and locomotion.
- Measure and tune goalkeeper decisions, defensive shape and pass interception without expanding the AI architecture.
- Consolidate HUD readability, quality presets and 60 FPS budgets under #24.
- Verify commentary/audio failures degrade silently and never block gameplay.
- Remove committed transient Playwright session files and move durable baselines into an intentional test-fixture location.

### P3 — Match-depth foundations

Only after P0–P2 are green:

- #27 exact damping and interception integration, using PR #28 as the current foundation.
- #16/#18 deterministic player contact and tackle state machine.
- #19 angular ball-ground contact.
- #20 tackle/replay presentation.
- #6 tactical intelligence, beginning with shared arrival-time estimates at a reduced AI update rate.

Each tranche must remain deterministic, replay-safe and separately reviewable.

### P4 — Explicitly deferred

Do not prioritise during F27-S01:

- online multiplayer product work beyond maintaining the existing scaffold;
- a full Rust/WASM authority migration;
- full 11v11 attribution or animation redesign;
- transfer-market and contract depth;
- external licensed clubs, players or competitions;
- Gemini-generated scouting content;
- renderer replacement or generic rigid-body adoption.

## Agent responsibilities

### GitHub

Source of truth for code, issues, pull requests, architecture decisions and test evidence. All agents work through branches and draft PRs. No force pushes or direct overwrites of newer work.

### Replit

Use the existing `football-2027` Repl for clean-clone verification, integration work, Node/Colyseus execution and browser testing. Before any modification, record branch, HEAD, origin/main, working-tree state and test results. Never reset or push from an older workspace over GitHub.

### Lovable

Use the dedicated Git Sync project for React/Vite/TypeScript frontend work after the private GitHub repository is connected. Lovable must not generate a competing game codebase. Rust/WASM and Colyseus remain external build responsibilities.

## Next 48-hour sequence

1. Audit the existing Replit workspace and preserve any unpushed work on a named backup branch.
2. Create a fresh reconciliation branch from current `main` for the unique contents of PR #30.
3. Run the frontend typecheck, tests and production build from that branch.
4. Resolve or isolate issue #38 so clean builds have no ambiguous native import.
5. Verify splash/menu behaviour, reduced motion and input paths.
6. Merge the reconciled brand shell only after gameplay regression checks.
7. Begin #34, then #35; do not start post-match polish before the state contracts are stable.

## Merge gate for every development PR

- Player-facing outcome is stated.
- New work is based on current `main`.
- Typecheck, tests and production build pass.
- Deterministic simulation boundaries remain intact.
- Keyboard and gamepad behaviour are covered where relevant.
- Save migration/reload is covered where relevant.
- No newer functionality is removed because a cloud workspace could not build it.
- Documentation and issue status are updated in the same tranche.
