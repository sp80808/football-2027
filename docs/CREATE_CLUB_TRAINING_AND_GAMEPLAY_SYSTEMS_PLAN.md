# Football 2027 — Create-a-Club, Training Academy & Gameplay Systems Plan

Status: implementation planning
Date: 14 July 2026

## Product goal

Create one connected opening loop:

`create club → create manager/player → learn the match controls → play first fixture → receive progression`

Customisation, training and live matches must share authoritative schemas, semantic actions, assistance options, ball physics, event scoring and save data.

## 1. Create-a-Club

Target: complete with defaults in under five minutes; autosave every step.

1. club foundation and location
2. name, short name, code and nickname
3. colours and kits
4. crest
5. starting ground profile
6. club culture and football philosophy
7. manager
8. optional founding player
9. review and accessibility validation

### Authoritative output

- `ClubDefinition`
- `ClubVisualIdentity`
- `ManagerProfile`
- `PlayerProfile`
- `SquadRegistration`
- `ClubSeasonState`
- `MatchTeamSheet`

## 2. Kit designer

Use procedural recipes rather than baked texture collections.

Launch patterns:

- solid
- vertical stripes
- hoops
- halves
- quarters
- sash
- chest band
- pinstripes
- contrast sleeves
- shoulder panel
- centre stripe
- chevrons
- tonal geometry

Store pattern, colours, collar, sleeves, shorts, socks and number style as parameters. Render SVG/menu previews and gameplay materials from the same recipe.

Use OKLab/Delta-E for perceptual home/away/goalkeeper separation and WCAG-style luminance checks for names and numbers. Automatically offer a clash-safe alternative.

## 3. Crest creator

Use a constrained deterministic SVG recipe:

1. base shape
2. border
3. field colours
4. divider/pattern
5. original symbol or monogram
6. optional text/year
7. ornament

No real-club templates, copied marks or unverified uploaded artwork in the first release.

## 4. Manager and optional founding player

Keep appearance creation simple: face, skin tone, hair, facial hair, build, outfit and colour presets.

Manager and player attributes use a bounded point budget determined by career difficulty and starting competition level. Creation choices should change tendencies, development and role fit without overpowering match skill.

## 5. One semantic control system

Training drills must not define physical buttons directly. They consume semantic football actions:

```ts
export type FootballAction =
  | 'move'
  | 'sprint'
  | 'shield_or_matchup'
  | 'short_pass'
  | 'through_pass'
  | 'lofted_pass_or_cross'
  | 'shoot'
  | 'modifier_1'
  | 'modifier_2'
  | 'player_switch'
  | 'right_stick_select_or_skill'
  | 'standing_tackle_or_shouldering'
  | 'sliding_tackle';
```

### FC-style Classic preset

Face-button positions:

- south: short pass / contain
- north: through pass
- east: shoot / standing tackle
- west: cross or lofted pass / sliding tackle

Shoulders/triggers:

- right trigger: sprint
- left trigger: shield or jockey
- left shoulder: player switch; contextual run/chip modifier
- right shoulder: teammate press; contextual finesse/driven modifier

### eFootball-style preset

Face-button positions:

- south: low pass / pressure
- north: through pass
- east: lofted pass or cross / sliding tackle
- west: shoot / shoulder charge

Shoulders/triggers:

- right trigger: dash
- left trigger: match-up
- left shoulder: cursor/player change
- right shoulder: special-control or pressure modifier by context

### Settings

- FC-style, eFootball-style and custom presets
- assisted, semi-assisted and manual targeting
- contextual or manual switching
- analog sprint on/off
- vibration/haptic intensity
- hold/toggle options
- dead-zone and sensitivity controls
- keyboard/mouse remapping
- reduced-input accessibility preset

### Dynamic device and glyph detection

- listen for `gamepadconnected` and `gamepaddisconnected`
- poll `navigator.getGamepads()` during active input
- prefer `standard` mapped controllers
- infer glyph family conservatively and permit manual override
- use most-recent-input switching with debounce/hysteresis
- preserve control preset independently from controller brand
- show PlayStation, Xbox, Nintendo-style, generic, keyboard or mouse labels dynamically
- never treat `Gamepad.id` as a stable player identity

## 6. Training Academy

Prioritise match-relevant drills that teach the same actions and assistance settings used in fixtures.

### Passing

- static and moving gates
- receiver selection
- through-ball space
- ground, driven and lofted passes
- rondo and pressure escape

Metrics: directional error, arrival time, completion probability, receiver orientation, interception risk and possession value.

### Shooting

- static and moving-ball finishing
- near/far-post targets
- first-time shots
- placed/finesse variants
- pressure finishing

Metrics: shot quality, placement, timing, body orientation and goalkeeper advantage.

### Crossing

- target zones
- receiver runs
- defensive pressure
- near/far-post and cut-back choices

### Dribbling

- slalom
- acceleration/deceleration
- shielding and turns
- controlled sprint changes
- defender shadows

### Defending

- match-up/jockey
- contextual switching
- passing-lane interception
- teammate pressure
- standing and sliding tackles
- recovery after being bypassed

### Goalkeeping

- positioning
- reaction saves
- claiming crosses
- rush/hold decisions
- distribution targets

A juggling activity may be added later, but it is not the MVP control reference and receives no bespoke physical-button scheme.

## 7. Shared deterministic drill framework

```ts
interface TrainingDrillDefinition {
  id: string;
  category: 'passing' | 'shooting' | 'crossing' | 'dribbling' | 'defending' | 'goalkeeping';
  scenario: ScenarioDefinition;
  allowedActions: FootballAction[];
  scoreRules: ScoreRule[];
  medals: { bronze: number; silver: number; gold: number };
  progressionRewards: TrainingReward[];
  tutorialSteps: TutorialStep[];
}
```

Requirements:

- fixed seed and replayable semantic-input trace
- restart in under two seconds
- current-binding tutorial prompts
- gamepad and keyboard/mouse parity
- bronze/silver/gold thresholds
- bounded progression rewards
- diagnostics for selected action, timing, aim, assistance and outcome
- no React or Three.js imports in authoritative drill logic

## 8. Mathematical gameplay systems

### Arrival time

Use one acceleration-limited arrival-time API for switching, loose balls, pass interception, pressing and keeper rushing. Include reaction delay, current velocity, turn cost, acceleration and maximum speed. Stable entity ID resolves ties.

### Pass completion

For opponent `j`, compare opponent arrival with ball arrival:

```text
margin_j = tOpponent_j - tBall
pIntercept_j = logistic(-margin_j / uncertainty)
pComplete = product(1 - pIntercept_j)
```

Add passer execution, receiver body orientation, preferred foot, pressure and first-touch difficulty.

### Action value

```text
value(action)
  = successProbability × reward
  - failureProbability × turnoverCost
  - executionCost
  - staminaCost
```

Use this for explainable pass, carry, shoot, cross and clear choices. No neural model is required in the authoritative runtime.

### Pitch control and assignments

- initial grid: 24 × 16
- update around 10–15 Hz, not 120 Hz
- convert team arrival-time differences to control probabilities
- assign pressing, cover and marking targets with minimum-cost assignment plus switching penalties
- dynamic role targets combine formation, ball zone, phase, occupancy and threat

### Player switching

Score candidates using interception time, danger, stick direction, role suitability, momentum and abandonment cost. Add hysteresis, aerial and loose-ball contexts, and explicit right-stick selection.

### Presentation smoothing

Simulation remains fixed-step and authoritative. Rendering consumes snapshots and uses exact exponential or critically damped interpolation. Never use presentation smoothing to hide collision or possession errors.

## 9. Engine audit priorities

1. complete P0 repository/build reconciliation
2. finish the career vertical slice
3. land semantic input and dynamic glyph infrastructure
4. add deterministic scenario harness
5. integrate shared arrival-time math
6. replace static pass-lane samples
7. contextual switching
8. dynamic team shape and pitch control
9. first-touch and loose-ball ownership
10. smoother restarts and goalkeeper utility

## 10. Delivery gates

### Gate A — input foundation

- semantic actions
- FC-style/eFootball-style/custom mappings
- active-device resolver
- glyph labels
- persistence and remapping tests

### Gate B — creator data

- versioned club, kit, crest, manager and player schemas
- autosave and migration

### Gate C — visual identity

- kit renderer and clash validator
- crest renderer
- career/menu/scorebug integration

### Gate D — drill runner

- deterministic scenarios
- semantic-input traces
- scoring, medals and bounded rewards

### Gate E — football drills

- passing and shooting first
- crossing, dribbling, defending and goalkeeping next

### Gate F — match intelligence

- arrival time
- pass availability
- switching
- pitch control
- assignment and action value

## Acceptance principles

- drills and matches use identical semantic actions
- both football-game convention presets are fully playable
- physical button labels always match the active device and current binding
- disconnect/reconnect is safe
- identical seed and semantic input produce identical results
- assists are explicit settings, not hidden difficulty cheats
- creator outputs are original, deterministic and saveable
- no new system bypasses the current vertical-slice and build-health gates
