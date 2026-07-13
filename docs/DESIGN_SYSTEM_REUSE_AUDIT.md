# Football 2027 Design-System Reuse Audit

## Purpose

Align the editable Football 2027 Figma work with the actual React/Three.js codebase and define which mature patterns can be adapted from Figma Simple Design System without copying its generic visual identity.

## Current sources of truth

- **Runtime and data contracts:** GitHub `main`
- **Visual direction and screen composition:** Football 2027 Figma file
- **Accessibility and component-state references:** Figma Simple Design System
- **Gameplay state:** deterministic simulation snapshots and versioned game events

## Current stack

- React 19 and TypeScript
- Vite
- Tailwind CSS 4
- Motion
- Lucide icons
- Zustand
- Three.js with a DOM overlay UI
- Vitest

## Current application gaps

1. `App.tsx` still boots directly into the gameplay renderer and HUD.
2. `MainMenuScreen`, `QuickMatchScreen`, `CareerScreen`, `SettingsScreen` and `GameplayScreen` exist but are not wired into the active app shell.
3. The latest Vercel status is failing.
4. `src/audio/AudioManager.ts` imports `howler`, but `howler` is not declared in `package.json`.
5. `src/store/gameStore.ts` imports `../engine/MatchManager`, while the repository contains `MatchState.ts` instead.
6. `GameplayScreen` renders `HUD` without the currently required WASM props.
7. The current Figma file uses editable frames and hardcoded paints rather than local token collections and component sets.
8. Several Figma concepts have no stable one-to-one code component yet, so Code Connect mappings must wait until extraction is complete.

## Code-to-Figma conflict policy

- **Code wins:** state shape, event contracts, component props, navigation state and accessible behaviour.
- **Figma wins:** palette, spacing, typography hierarchy, density, screen composition and motion emphasis.
- **Simple DS contributes:** semantic component APIs, interaction states, accessibility patterns and composition models.
- **Simple DS does not contribute:** Football 2027 branding, generic marketing layouts or wholesale CSS.

## Reusable Figma Simple Design System sources

The Simple Design System codebase is MIT licensed. Its subscribed Figma library is available in the Football 2027 design file.

### Button

Reference Figma node: `J0KLPKXiONDRssXD1AX9Oi / 4185:3778`

Adapt:
- semantic variants
- disabled/focus states
- start/end icon slots
- button groups
- anchor-or-button behaviour

Keep Football 2027 sizes `sm`, `md`, `lg`, `xl` because game menus and HUD actions need a wider range than Simple DS.

### Tabs

Reference Figma nodes:
- Tab: `3729:12963`
- Tabs: `3729:13362`

Adapt:
- `Tabs`, `TabList`, `Tab`, `TabPanel` component boundaries
- keyboard navigation and selected/disabled semantics

Use for Settings, Career sub-navigation, tactics and replay analysis.

### Card and Panel

Reference Figma node: `2142:11380`

Adapt:
- optional asset slot
- vertical/horizontal direction
- padding and visual variants
- pressable-card interaction layer

Keep `Panel` as the large game-surface container. Add a smaller `Card` primitive for fixtures, players, objectives, inbox items and settings rows.

### Notification

Reference Figma node: `124:8256`

Adapt:
- message versus alert variants
- optional icon
- optional dismissal

Use for match event toasts, autosave feedback, transfer/inbox updates and provider warnings.

### Dialog

Reference Figma node: `192:31534`

Use for destructive confirmations, quit-match confirmation, overwrite-save and transfer-contract confirmation.

### Select and Slider

Reference Figma nodes:
- Select field: `2136:2336`
- Slider field: `589:17676`

Use for Settings and tactical controls. Code must retain proper labels, keyboard operation and value feedback.

### Table

Adapt the Simple DS table API rather than its styling:
- dense/regular modes
- sortable columns
- row selection
- explicit column alignment

Use for standings, squads, scouting and transfer shortlists.

### Tag

Reference Figma node: `56:8830`

Use for condition, form, role, card status, injuries, data-confidence and provider provenance.

## Football-specific components to build locally

These should not be imported from a generic design system:

- `Scorebug`
- `MatchClock`
- `EventToast`
- `CommentarySubtitle`
- `PlayerStatus`
- `ChargeMeter`
- `TacticalMiniMap`
- `FormationPitch`
- `PlayerCard`
- `ClubBadge`
- `KitPreview`
- `ReplayTransport`
- `FixtureCard`
- `ObjectiveProgress`

## Recommended component hierarchy

```text
ui/
  Button
  IconButton
  ButtonGroup
  Panel
  Card
  Tabs
  Tag
  Notification
  Dialog
  SelectField
  SliderField
  Table

broadcast/
  Scorebug
  MatchClock
  EventToast
  CommentarySubtitle
  PlayerStatus
  ChargeMeter
  TacticalMiniMap
  ReplayTransport

management/
  FixtureCard
  FormationPitch
  PlayerCard
  SquadTable
  StandingsTable
  ObjectiveProgress
  InboxItem
  ClubSnapshot
```

## Design-token direction

Create semantic tokens instead of binding components directly to Tailwind colour names:

- `--game-bg-canvas`
- `--game-bg-panel`
- `--game-bg-elevated`
- `--game-border-subtle`
- `--game-text-primary`
- `--game-text-secondary`
- `--game-accent-primary`
- `--game-accent-success`
- `--game-accent-warning`
- `--game-accent-danger`
- `--game-team-home`
- `--game-team-away`

Tailwind utilities may consume these variables, but the variable names remain stable across code and Figma.

## Implementation order

### Tranche 0 — restore build health

- resolve the missing audio dependency or replace Howler with Web Audio
- correct the invalid match-state import
- reconcile `GameplayScreen` and `HUD` props
- add a real CI workflow that runs typecheck, tests and build

### Tranche 1 — app shell

- wire splash, main menu, quick match, career, settings and gameplay into one explicit screen-state machine
- gate gameplay input whenever a menu or modal is active
- preserve the existing renderer and simulation lifecycle

### Tranche 2 — UI foundations

- add semantic CSS variables
- harden `Button` and `Panel`
- add `Card`, `Tabs`, `Tag`, `Notification`, `Dialog`, `SelectField`, `SliderField` and `Table`
- add a dev-only component gallery

### Tranche 3 — broadcast HUD

- extract the monolithic HUD into football-specific components
- consume match state and game events through selectors
- implement desktop, 720p and narrow layouts

### Tranche 4 — management surfaces

- replace placeholder Career data with domain-backed selectors
- implement standings, squad, line-up, objectives and inbox components
- add empty, loading, error and stale-data states

### Tranche 5 — Figma integration

- create local variable collections and proper Figma component sets
- wrap imported Simple DS components only where their APIs match
- add Code Connect mappings after source modules and props stabilise
- add screenshot and design-parity checks to pull requests

## Acceptance criteria

- production build succeeds
- every reachable screen uses the same semantic token layer
- keyboard focus and reduced-motion behaviour are visible and tested
- live gameplay keeps the centre and lower-middle playfield clear
- no UI component owns a duplicate copy of authoritative gameplay state
- Figma components map to stable code modules or an explicitly documented composition
- all imported or adapted assets retain licence and source records
