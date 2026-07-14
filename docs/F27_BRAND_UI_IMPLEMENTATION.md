# Football 2027 — Brand & UI Implementation Guide

**Status:** working implementation specification  
**Updated:** 14 July 2026  
**Product gate:** [Vertical slice issue #22](https://github.com/sp80808/football-2027/issues/22)

This document translates the Drive brand guide and product direction into a practical, testable UI system for the shipping game. It is deliberately smaller than a full design system: components are added only when they support the playable vertical slice.

## 1. Product and brand promise

> Build the most approachable browser football career game that still rewards football intelligence, expressive control and long-term club building.

Brand shorthand: **THE NEXT MATCH STARTS HERE.**

The experience should feel:

- energetic, not noisy;
- intelligent, not clinical;
- ambitious, not elite-only;
- grounded in local football, not nostalgic imitation;
- modern and technical, not sterile;
- confident, not over-branded.

Use direct football language: **Play**, **Create club**, **Pick your XI**, **Advance day**, **Train**, **Continue**. Avoid vague platform language and overlong tutorial prose.

## 2. Ownership and source-of-truth model

| Surface | Owns |
|---|---|
| Google Drive | Product rationale, brand guidance, licences, asset records and planning backups. |
| GitHub | Shipping SVGs, CSS tokens, React components, implementation documentation, tests and release history. |
| Figma | Detailed screen/component specification and handoff nodes. |
| Canva | Editable marketing, social and presentation explorations; not the only source of shipping UI truth. |

Never let a Canva/Figma experiment silently override GitHub tokens or established accessibility behaviour. Approved changes must be reflected in this document and the code.

## 3. Logo system

Working direction: **Forward Pitch**.

The mark combines an angular F, a forward-rising diagonal and a centre-circle detail. It must remain recognisable at favicon size and avoid resemblance to a licensed club badge, competition or broadcaster.

Shipping assets are in [`public/brand/`](../public/brand/README.md):

| Asset | Default context |
|---|---|
| Two-colour mark | App navigation, large watermark, project identity. |
| White mark | Scorebug, compact HUD, busy backgrounds, one-colour use. |
| Horizontal lockup | Splash, main menu and wide layouts. |
| App icon | PWA/icon/social export master. |
| Splash background | Loading and menu decoration only. |

### Logo acceptance checks

- readable at 16, 32, 64 and 256 px;
- one-colour version remains identifiable;
- no stretch, bevel, glow-outline or crest container;
- sufficient clear space around the centre-circle detail;
- no team-colour recolour that could imply a real club affiliation.

## 4. Colour tokens

Canonical values:

| Token | Value | Purpose |
|---|---:|---|
| `--game-bg-canvas` | `#07101C` | Primary page/game shell. |
| `--game-bg-panel` | `#0E1B2B` | Standard solid management surface. |
| `--game-bg-elevated` | `#16263A` | Hover, selection and elevated panels. |
| `--game-border-subtle` | `#304058` | Borders and pitch-line structure. |
| `--game-text-primary` | `#F2F7FF` | Main text. |
| `--game-text-secondary` | `#95A4B8` | Supporting text. |
| `--game-text-muted` | `#64748B` | Metadata and low-priority labels. |
| `--game-accent-primary` | `#14D1E6` | Interaction, focus and system state. |
| `--game-accent-success` | `#33D677` | Progress, fitness and successful outcomes. |
| `--game-accent-warning` | `#FFA81F` | Risk or attention. |
| `--game-accent-danger` | `#F54148` | Failure, injury, dismissal or destructive action. |
| `--game-team-home` | `#1F61F2` | Compact home-team accent only. |
| `--game-team-away` | `#E83D4A` | Compact away-team accent only. |

Target usage ratio: approximately 70% dark surfaces, 20% text/structure, 8% cyan or green emphasis, 2% warning/danger/team accents.

## 5. Typography and iconography

- Primary UI family: Inter or a metrically compatible open-source sans.
- Display: bold/black, compact tracking, short labels only in uppercase.
- Body: sentence case, 15/22 target.
- Compact body: 13/18 target.
- Broadcast numbers: tabular figures, high contrast.
- Icons: Lucide-compatible line icons, approximately 1.75–2 px visual stroke.
- Icons support language; they do not replace unclear labels.

Do not add custom font binaries to the repository without explicit licence review and an actual product need.

## 6. UI architecture principles

1. **Protect the pitch.** During live play, persistent HUD should normally cover less than 20–25% of a desktop viewport.
2. **DOM for information.** Menus, HUD, settings and text-heavy tools stay in React DOM; Three.js remains presentation of the match world.
3. **One clear action.** Each management screen has one obvious primary football verb.
4. **Progressive disclosure.** Controls, details, analytics and explanations open on demand.
5. **No dashboard soup.** Prefer structured rows, tabs, dividers and one meaningful panel over nested card grids.
6. **State is never colour-only.** Pair colour with text, icon or shape.
7. **Input boundaries are explicit.** Menus must suspend gameplay camera/pointer input where relevant.
8. **Small-screen first decisions.** Collapse secondary information before shrinking text or covering the playfield.

## 7. Screen specifications

### Splash

**Purpose:** establish identity, finish boot work and make readiness explicit.

Required:

- horizontal lockup or compact mark;
- short proposition, not generic “next generation” language;
- real loading/readiness state;
- keyboard and pointer start action;
- visible focus style;
- reduced-motion behaviour;
- no full-screen video dependency.

### Main menu

Primary actions:

1. **Play quick match**
2. **Build a career**
3. **Settings**

The menu should feel like entering football, not launching a software dashboard. Keep marketing copy to one short sentence.

### Club creator

Target completion: defaults allow a first club in under five minutes.

Guided steps:

1. **Place** — town/area, club name and founding story.
2. **Identity** — colours, Forward Pitch-safe generated badge and kit preview.
3. **Ground** — modest local ground preset and one meaningful trade-off.
4. **People** — generated squad plus 3–5 founding-player cards.
5. **Football** — tactical identity, formation and captain.
6. **Review** — readable summary and **Found club** action.

Provide sensible defaults, immediate preview and a compact advanced drawer. Do not expose a wall of raw attributes.

### Career hub

The first view answers:

- Who is next?
- What needs attention?
- How is the club progressing?
- What can I do now?

Primary action: **Play next match** or **Advance day**, depending on fixture state.

Secondary routes: Squad, Training, Club, Fixtures, Table. Avoid equal-weight tiles for every future feature.

### Squad and line-up

- readable player rows/cards with role, condition, level and current ability;
- current ability and potential shown separately;
- formation/pitch view plus accessible list alternative;
- drag-and-drop must also support keyboard/touch-friendly alternatives;
- warnings explain missing role coverage without preventing experimentation.

### Live match HUD

Persistent budget:

- compact scorebug/clock cluster;
- controlled-player name, stamina/condition and contextual action feedback;
- transient prompts and authoritative event toasts;
- optional diagnostics hidden outside development mode.

Do not permanently open controls, objectives, commentary history, tactical analysis and replay tools at the same time.

### Post-match

The screen should deliver consequence quickly:

1. result and one-line match story;
2. player XP/level progress;
3. one or two awards/turning points;
4. club progression or next-fixture consequence;
5. **Continue**.

The user should reach the career hub again without navigating a report maze.

## 8. Foundation component backlog

Implement only when consumed by a vertical-slice screen.

| Component | Responsibility |
|---|---|
| `BrandMark` / `BrandLockup` | Accessible asset selection and sizing. |
| `ScreenShell` | Shared canvas, safe areas and responsive max width. |
| `PageHeader` | Back action, title and one optional status/action. |
| `ActionButton` | Primary/secondary/destructive states with focus and disabled behaviour. |
| `StatusChip` | Compact semantic state with text + icon. |
| `ProgressMeter` | XP, fitness and loading with labelled value. |
| `PlayerRow` | Player identity, role, condition and relevant actions. |
| `Scorebug` | Clock, score and team identifiers with tabular numbers. |
| `EventToast` | Goal, card, offside, level-up and tackle outcomes. |
| `EmptyState` | Football-specific next action, not generic placeholder copy. |

## 9. Motion language

- Match presentation entrances: 120–220 ms.
- Goal/card emphasis: 350–600 ms maximum.
- Management transitions: 160–240 ms with minimal movement.
- Strong motion is reserved for reward, danger and state change.
- Reduced motion removes scale/spring effects while preserving immediate state communication.
- Never delay access to information until animation completion.

## 10. Responsive behaviour

Desktop:

- management content uses a readable max width;
- live HUD stays edge-aligned and centre-safe;
- wide screens do not expand every panel indefinitely.

Tablet/mobile:

- secondary navigation collapses into a drawer or bottom surface;
- creator steps use one primary panel at a time;
- scorebug and status become compact chips;
- touch controls own dedicated safe regions and never overlap primary actions;
- avoid text below a usable minimum merely to retain desktop density.

## 11. Accessibility definition of done

- normal text meets WCAG 4.5:1 target;
- visible `:focus-visible` treatment on every actionable element;
- keyboard path through splash, menu and creator;
- control labels remain understandable without icons;
- team/card/fitness states are not colour-only;
- reduced-motion support;
- independent audio categories planned for commentary, crowd, SFX and music;
- subtitles/commentary captions use a bounded dark plate;
- screen readers receive useful progress and loading labels.

## 12. Implementation order

1. Merge and validate branded splash/menu shell.
2. Extract brand asset component and semantic tokens when a second consumer needs them.
3. Build the minimum club-creator journey for issue #22.
4. Implement career hub state and next-match handoff.
5. Consolidate scorebug/event feedback around authoritative match events.
6. Deliver post-match XP/upgrade consequence.
7. Run responsive, keyboard, reduced-motion and low-quality-preset checks.

## 13. Visual QA checklist

- [ ] Logo is sharp and readable at target size.
- [ ] One primary action is obvious within three seconds.
- [ ] No management screen resembles a generic SaaS dashboard.
- [ ] Live play remains visually dominant over HUD chrome.
- [ ] Cyan and green are used semantically, not decoratively everywhere.
- [ ] Team colours remain compact accents.
- [ ] Text remains readable over motion and stadium lighting.
- [ ] Mobile and 1366×768 layouts have no clipped primary actions.
- [ ] Keyboard focus is visible.
- [ ] Reduced-motion mode retains complete information.
