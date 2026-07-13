# Development Guide

## Prerequisites

- Node.js 20+
- **pnpm** (required — not npm/yarn)

```bash
pnpm install
```

## Scripts

| Command | Description |
|---------|-------------|
| `pnpm dev` | Vite on port 3000 |
| `pnpm build` | Production build |
| `pnpm lint` | `tsc --noEmit` |
| `pnpm test` | Vitest (single run) |
| `pnpm test:e2e` | Playwright smoke |
| `pnpm clean` | Remove `dist/` |

## Testing

- **Vitest:** 11 files, 57 tests in `tests/`
- **Playwright:** `e2e/smoke.spec.ts` (splash → gameplay scoreboard)
- **Known:** 3 failures in `replay.test.ts` pending `resetForInputReplay`

```bash
pnpm test
pnpm test:e2e
pnpm exec playwright install chromium  # first time
```

## Agent rules (from AGENTS.md)

1. pnpm only
2. Deterministic engine — `SeededRandom`, no `Math.random()`
3. Zero allocation in tick loops
4. No Three.js in `src/engine/`
5. Coordinates: physics (X,Y,Z) → Three.js (X,−Z,Y)

## Git workflow

```bash
git pull --no-rebase
git checkout -b feat/my-feature
pnpm lint && pnpm test && pnpm build
git commit -m "feat: ..."
```

PR template: `.github/pull_request_template.md`. Gate: [ARCADE_PRODUCT_GATE.md](./ARCADE_PRODUCT_GATE.md).

## `/Volumes/Harry` notes

External APFS volume — ensure mounted before dev. If HMR is flaky, avoid cloud sync on the volume or clone locally.

## Layout

- `src/engine/` — simulation (headless-safe)
- `src/debug/RenderingPanel.tsx` — active Three.js
- `src/legacy/r3f/` — quarantined R3F

See [ARCHITECTURE.md](./ARCHITECTURE.md), [CONTROLS.md](./CONTROLS.md).
