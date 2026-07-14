# Sprint F27-S01 — Branded Vertical Slice

**Dates:** 15–24 July 2026  
**Goal:** Ship the smallest cohesive Football 2027 career experience with canonical branding, reliable persistence and an end-to-end playable loop.

## Sprint outcome

A first-time player can launch, enter or create a club identity, reach a career hub, play the next fixture, see XP/level outcomes and return to the hub with the result safely persisted.

## Scope

### 1. Brand and boot

- Integrate `f2027-mark.svg` and `f2027-wordmark.svg`
- Replace text-only splash with the canonical mark and honest preload state
- Add skip/continue behaviour compatible with keyboard, pointer and gamepad
- Add reduced-motion treatment

### 2. Career state

- Define versioned `CareerSave` and `ClubIdentity` schemas
- Establish migration from the current localStorage shape
- Add safe default data and corrupt-save recovery
- Add tests for save, reload, migration and reset

### 3. Career hub

- Show club identity, next fixture, form and one primary “Play Match” action
- Link squad and training without dead ends
- Add empty/error/loading states

### 4. Match handoff

- Use one authoritative fixture payload when starting gameplay
- Preserve quick match regression behaviour
- Return final score and action events to career state

### 5. Post-match progression

- Group XP by action category
- Show level-up and attribute effects
- Persist result, XP and controlled-player selection before navigation

### 6. Quality gate

- TypeScript clean
- Unit tests green
- Production build green
- Playwright covers launch → career → match → post-match → reload
- Screenshots at 1440×900 and 1280×720

## Suggested task breakdown

| ID | Task | Estimate | Dependency |
|---|---|---:|---|
| S01-01 | Integrate canonical brand assets and splash | 0.75 d | none |
| S01-02 | CareerSave/ClubIdentity schema + migration | 1.25 d | none |
| S01-03 | Career hub information hierarchy | 1.0 d | S01-02 |
| S01-04 | Fixture handoff and result contract | 1.0 d | S01-02 |
| S01-05 | Post-match XP presentation and persistence | 1.0 d | S01-04 |
| S01-06 | E2E journey and visual regression | 1.0 d | all |
| S01-07 | Performance/accessibility pass and release notes | 0.75 d | all |

## Out of scope

- transfer market
- online multiplayer
- licensed clubs/players
- full 11v11 attribution redesign
- Gemini-generated scouting content
- major renderer replacement

## Daily sequence

- **15 July:** brand integration and screen-state audit
- **16 July:** save schema, migration and tests
- **17 July:** career hub and fixture contract
- **20 July:** post-match progression
- **21 July:** E2E flow and reload persistence
- **22 July:** 720p/mobile menu pass and accessibility
- **23 July:** performance, bug fixing and release candidate
- **24 July:** sprint review, merge and next-sprint triage

## Acceptance criteria

- No screen is reachable only by developer/test controls
- Splash can be skipped after required initialization
- Career state survives reload and reports recovery if invalid
- Gameplay receives a typed fixture and returns a typed result
- XP shown to the player equals XP committed to the save
- Centre and lower-middle playfield remain clear during normal gameplay
- Main menu and career hub are operable by keyboard and gamepad
