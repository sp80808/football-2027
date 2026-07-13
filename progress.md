# Football 2027 — Development Progress

Original prompt: Improve graphics, gameplay and physics engine. (Expanded): improve RPG, career and add a player XP system — players gain XP and level up abilities through actions on the pitch, plus off-pitch training and coaching programmes.

## Foundation reality (2026-07-13)
- The repo did NOT run: 29 macOS `._*` AppleDouble resource-fork files polluted the tree; `tsc`'s default include-glob tried to parse them as TypeScript → ~30 spurious errors. The actual source import graph was intact all along.
- `/Volumes/Harry` external drive hit ENOSPC mid-install; cleared `simulation/target` (~200M) + pnpm store prune to get ~13G free. `pnpm install` then succeeded.
- **Fixed:** purged all `._*` files. `npm run lint` → 0 errors. `npm run test` → 74 pass / 13 files. Dev server runs; full menu → quick match → 3D match flow works.
- **Fixed:** `RenderingPanel.tsx:694` `crowd.dispose()` → `crowd?.dispose()` (null-deref on React StrictMode double-invoke cleanup).

## What already exists (more than expected — the `._` confusion misled earlier recon)
- Career: `src/career/{careerSchemas,careerStore}.ts` — club-level season/standings/persistence (8-team league, W/D/L/points, localStorage `football-2027-career`). 4 passing tests. **No squad, no players, no attributes, no XP/level yet.**
- Engine: advanced Ball (Magnus/spin/air-density), intent-driven Player (dormant attr fields), diving Keeper (state machine), Opponent (jockey/tackle/press/shoot), snapshot interpolation, offside detector, match phases.
- Rich UI: splash, main menu, quick match setup (team overalls/formations), gameplay (3D match + HUD + replay + offside line), career placeholder, settings, touch controls, commentary (TTS), camera modes.
- WASM/Rust core: minimal generic physics sandbox, **inert** in live loop (TS engine is source of truth). Left untouched.

## Design decisions (per user)
- Roster: **full squad (~16 players)**, each with attributes + XP + level.
- Attributes: **FIFA 6-stat 0–99** (PAC/SHO/PAS/DRI/DEF/PHY) + Overall + Level + XP — canonical, supersedes 3 conflicting dead models.
- Scope: on-pitch XP & leveling + training/coaching + season/fixtures + save/load. Fix build foundation first.
- On-pitch XP in a 1v1 engine: controlled player + keeper earn rich action XP; squad earns participation XP. Add player-switching (Q/LB already sampled) so any controlled squad member earns action XP.

## TODO / next steps
- [ ] Phase 2: canonical RPG data model (`src/career/` schemas for players/attrs/xp), roster generator, XP curve, XP rewards, tests.
- [ ] Phase 3: ActionTracker + expanded SimEvent (pass/shot/tackle/save/assist) + bind attributes into physics (PAC→speed, DRI→control, etc.).
- [ ] Phase 4: TrainingSystem (coaching programmes + fatigue), SeasonManager fixtures, extend careerStore with squad+xp persistence, player-switching.
- [ ] Phase 5: real SquadScreen, TrainingScreen, PostMatchScreen (XP/level-up), HUD (name/level/xp), visual polish (kit numbers, level badges).
- [ ] Phase 6: full Playwright verification of the loop + persistence across reload.

## Known limitations (document)
- 1v1 engine: rich action XP only for controlled player + keeper; squad gets participation XP. Full 11v11 per-player attribution is a future phase.
- zod is a transitive dep (not in package.json) — add it explicitly.
