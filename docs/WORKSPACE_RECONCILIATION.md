# Football 2027 Workspace Reconciliation

Date: 2026-07-14

## Canonical source

GitHub `sp80808/football-2027` remains the source of truth. Cloud workspaces must fetch from current `main`, work on a dedicated branch and open a draft PR. No force-pushes, destructive resets or wholesale ports from older environments.

## Preserved states

- `backup/pre-workspace-reconciliation-2026-07-14` preserves commit `ba8ade94e01c4d2175372a206da662386628126d`, immediately before the latest `.gitignore` cleanup.
- `backup/main-af7ecea-2026-07-14` preserves commit `af7ecea2f96bc3777298fdc4381e98ca3ab82da2`, the current main state at reconciliation time.

## Active work

- PR #30 is the canonical brand/splash/UI implementation branch.
- PR #31 was closed as superseded. Its branch remains available for selective recovery of unique documentation, token JSON and source assets.
- Epic #32 is the active branded career vertical-slice plan.

## Native/WASM warning

Commit `af7ecea` removed the generated `simulation/pkg` package while `src/bridge/simulation.worker.ts` still imports `../../simulation/pkg/football_sim.js`. The bridge appears dormant in the live application, but future agents must not silently restore or further delete these files. Choose one explicit path:

1. retain the Rust/WASM experiment and add a reproducible build step that regenerates `simulation/pkg`, or
2. remove the dormant worker/client bridge and document TypeScript as the sole simulation authority.

Until that decision is made, the pre-cleanup branch is the recovery point.

## Workspace status

- Existing Replit app: `football-2027`; no duplicate created. Its agent audit timed out before returning a trustworthy branch/working-tree report, so no Replit write was authorised.
- Existing Lovable project: `Football Code Companion`; no duplicate created. The workspace has no available build credits and its connected GitHub integration could not access the private repository, so no Lovable code write was authorised.

## Required pre-merge gate

- fetch current `main`
- inspect divergence and uncommitted files
- preserve local work on a named backup branch
- typecheck
- unit tests
- production build
- browser smoke test
- verify career, replay, input, commentary, 11v11/team logic and dead-ball behaviour remain intact
