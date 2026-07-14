# Contributing to Football 2027

Thanks for helping build a fast, stylised, open-source arcade football game.

## Current contribution goal

The project is intentionally concentrating on one outcome:

> Make a 3–6 minute small-sided football match immediately understandable, satisfying to control, and worth replaying.

Contributions that improve the core match are prioritised over large new modes.

## Before starting

1. Search existing issues and pull requests.
2. Comment on the issue you intend to work on.
3. For changes larger than a focused bug fix, open or join a design issue first.
4. Keep pull requests narrow and independently testable.

## Setup

Requirements:

- Node.js 22 recommended.
- npm.

```bash
git clone https://github.com/sp80808/football-2027.git
cd football-2027
npm install
npm run dev
```

The development server runs on `http://localhost:3000`.

## Verification

Run these before opening a pull request:

```bash
npm run lint
npm run test
npm run build
```

Run Playwright when your change affects a user-facing flow:

```bash
npm run test:e2e
```

Vite transpiles TypeScript but does not provide full type-checking by itself. `npm run lint` runs `tsc --noEmit` and is required even when the app builds.

## Architecture rules

- Keep simulation updates independent from render frame rate.
- Preserve the fixed-timestep model.
- Avoid hidden randomness in deterministic gameplay paths; inject or seed randomness where needed.
- Keep input intent, simulation state and rendering concerns separated.
- Add tests for rule changes and regressions.
- Prefer small components and systems over expanding central orchestration files.
- Do not introduce network authority assumptions into local gameplay code without discussion.

## Design rules

A change should improve at least one of these:

- responsiveness,
- readability,
- satisfaction,
- replayability,
- accessibility,
- performance,
- deterministic reliability.

Avoid adding features that increase pre-match setup or menu time without strengthening the match itself.

## Good first issues

Suitable starter work includes:

- input remapping and controller prompts,
- camera comfort options,
- goal and tackle feedback,
- accessibility toggles,
- deterministic unit tests,
- debug visualisations,
- documentation corrections,
- simple audio hooks,
- low-poly placeholder assets with explicit licences.

## Pull requests

Include:

- what changed,
- why it improves the core loop,
- how it was tested,
- screenshots or a short clip for visual changes,
- any known limitations.

Keep formatting-only changes separate from behavioural changes where practical.

## Assets and licensing

Do not contribute:

- real club badges or kits,
- player likenesses,
- copyrighted broadcast graphics,
- unlicensed music or sound effects,
- generated assets whose redistribution rights are unclear.

State the source and licence for every added asset.

## Conduct

Be constructive, specific and respectful. Critique the implementation or design, not the contributor.
