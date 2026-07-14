# Football 2027 — Create-a-Club, Training Academy & Gameplay Systems Plan

Status: planning proposal
Date: 14 July 2026

## Product goal

Create an enjoyable opening loop in which the player founds a club, designs its identity, creates a manager and optional player avatar, completes short skill games, then carries those choices into the deterministic career and match engine.

The feature must not become a disconnected customisation screen. Club identity, staff profile, player attributes, training results, tactics, fixtures and live gameplay should share authoritative schemas and progression events.

## 1. Create-a-Club flow

Target completion time: 5–8 minutes, resumable at every step.

1. Club foundation
2. Name, short name and commentary nickname
3. Home location and local identity
4. Colours and kit designer
5. Crest designer
6. Stadium/ground starting profile
7. Club culture and football philosophy
8. Manager creation
9. Optional founding player creation
10. Review, accessibility check and confirmation

### Foundation archetypes

Each archetype changes starting constraints rather than providing a flat cosmetic choice.

- Community club: stronger supporter growth, lower initial budget.
- Academy project: younger squad and development bonuses, lower physical readiness.
- Works club: physical squad, loyal local following, basic facilities.
- Technical collective: stronger control/passing baseline, shallow squad depth.
- Phoenix club: stronger reputation and pressure, unstable finances.

All bonuses must be bounded and visible before confirmation.

## 2. Kit designer

### Interaction principles

- Immediate 3D or clean 2D preview.
- Controller-first: left stick changes focus/value, A confirms, B backs out, shoulder buttons change categories.
- Mouse: click a region or preset, drag sliders, click colour chips.
- Never require precise freehand drawing.
- Randomise and undo buttons.
- Home, away and goalkeeper kits generated from one workflow.
- Real-time contrast and colour-blind warnings.

### Preset pattern system

Use procedural vector masks rather than storing hundreds of textures.

Initial pattern families:

- solid
- vertical stripes: 2, 3, 5, 7
- hoops
- halves
- quarters
- sash left/right
- chest band
- pinstripes
- sleeves contrast
- shoulder panel
- centre stripe
- gradient/fade
- geometric chevrons
- subtle tonal pattern

Pattern schema:

```ts
interface KitPatternDefinition {
  id: string;
  family: string;
  maskParameters: Record<string, number | boolean>;
  colourSlots: Array<'primary' | 'secondary' | 'accent' | 'trim'>;
  supportsSleeveOverride: boolean;
  supportsShortsOverride: boolean;
  supportsSocksOverride: boolean;
}
```

### Colour system

- Curated palettes first, advanced picker second.
- Primary, secondary, accent and trim slots.
- Calculate WCAG-like luminance contrast for UI previews and perceptual kit separation.
- Away-kit validator compares home/away colour distance using OKLab/Delta E rather than RGB distance.
- Automatically propose a clash-safe away kit and goalkeeper colour.

### Number, name and trim

- 4–6 original typeface styles with clear licence provenance.
- Back name on/off.
- Number style, outline and shadow presets.
- Collar and cuff trim presets.
- Sponsor area remains fictional/generic unless a later licensed system is added.

### Technical output

Store only parameters and render assets at runtime/build time:

```ts
interface ClubKit {
  id: string;
  type: 'home' | 'away' | 'goalkeeper';
  patternId: string;
  colours: { primary: string; secondary: string; accent: string; trim: string };
  collarId: string;
  sleeveId: string;
  numberStyleId: string;
  shortsPatternId?: string;
  socksPatternId?: string;
}
```

## 3. Crest creation

Use a layered, constrained editor that is fun on controller and avoids trademark-copying workflows.

### Crest layers

1. Shield/base shape
2. Border style
3. Primary/secondary fill
4. Divider or pattern
5. Central original symbol
6. Optional top/bottom text
7. Founding year
8. Accent ornament

### Launch shapes

- shield
- roundel
- diamond
- pennant
- hexagon
- modern angular mark
- monogram tile

### Symbol library

Create original generic symbols only:

- local landscape: hill, river, bridge, coast, tree
- industry: cog, anvil, loom, rail
- football culture: floodlight, stand, pennant, boot silhouette
- animals rendered as original minimal geometry
- initials and geometric monograms

Disallow direct upload at first. Later uploads require moderation and a clear rights declaration.

### Crest renderer

Persist a `CrestRecipe`; generate SVG deterministically. Use the same SVG recipe for menus, scorebug, kits and stadium signage.

## 4. Club details

Required:

- full name, short name and three-letter code
- nickname and commentary pronunciation fallback
- town/region
- founding year
- club colours
- ground name
- rivalry seed
- supporter profile
- football philosophy
- board expectation
- difficulty preset

Optional later:

- motto
- walkout music category
- mascot
- social/media tone
- supporter group names

## 5. Manager creation

Keep character creation simple and readable at match-camera distance.

### Identity

- name
- pronouns
- age band
- nationality/region
- voice category or text-only mode

### Appearance

- 8–12 face presets
- skin tone range
- hair preset and colour
- facial hair
- glasses
- body build presets
- touchline outfit and colour

Do not start with a full facial sculpt system.

### Manager attributes

Choose one background and two strengths. Difficulty determines the available point budget and maximum starting values.

Attributes, 1–20:

- coaching
- tactical knowledge
- motivation
- player development
- recruitment
- discipline
- media handling

Example budgets:

- Story/Easy: 72 points, max 16
- Standard: 62 points, max 14
- Hard: 54 points, max 12
- Founder challenge: 48 points, max 11

Manager attributes should create modest modifiers and unlock information, not override match skill.

## 6. Optional founding player creation

### Basic identity and appearance

Reuse the manager appearance pipeline with football-specific body presets.

### Position and archetype

- goalkeeper
- defender
- midfielder
- winger
- striker

Archetypes provide bounded stat shapes: organiser, ball winner, playmaker, runner, target, creator, finisher, sweeper keeper.

### Attribute budget

Difficulty controls the total and caps. No starting created player should exceed the intended league level.

Recommended launch attributes:

- pace
- acceleration
- stamina
- strength
- balance
- first touch
- passing
- shooting
- dribbling
- tackling
- positioning
- composure

Use derived detailed ratings internally where needed. Surface a compact set to avoid spreadsheet overload.

## 7. Training Academy mini-games

All drills should use the same engine inputs, ball physics, target selection and scoring events as matches. Avoid separate arcade physics unless a drill explicitly needs a constrained mode.

### A. Keepy-uppy challenge

Inspiration: one-button Messenger-style football loop, but more forgiving and compatible with gamepad/mouse.

Controls:

- Gamepad: left stick positions the player/contact direction; A taps the ball.
- Mouse: move pointer for body/contact direction; left-click taps.
- Touch later: drag position, tap to juggle.

Core loop:

- Ball falls toward a contact zone.
- Press timing determines upward impulse and error.
- Stick/pointer direction adds lateral correction.
- Generous early timing window; narrows slowly with streak.
- Missed perfect timing should usually produce a recoverable touch, not immediate failure.
- Optional head/chest/foot contact prompts after the basic mode works.

Scoring:

```text
score = touches
      + perfectTimingBonus
      + alternatingFootBonus
      + recoveryBonus
      + controlledHeightBonus
```

Difficulty changes target window and lateral instability, not arbitrary input lag.

Modes:

- first touch tutorial
- 30-second score attack
- survive as long as possible
- target height sequence
- weak-foot challenge

Training effect: small first-touch, balance and composure XP; daily/weekly caps prevent grinding exploits.

### B. Passing gates

- Pass through moving or static gates.
- Ground, driven and lofted variants.
- Score arrival timing, direction error, receiver control and risk.
- Introduce body orientation and pass availability gradually.

### C. Rondo / keep-ball

- 3v1 then 4v2.
- Teaches scanning, quick passing, first touch and support angles.
- Uses pitch-control and interception-time diagnostics.
- Score possession streak, one-touch actions and line-breaking passes.

### D. Shooting practice

- Static finishing
- moving ball finishing
- near/far-post targets
- first-time shots
- finesse/placed shots
- pressure finishing
- penalties later

Score expected difficulty, placement, timing and shot selection—not only raw target hits.

### E. Crossing and heading

- Cross into highlighted arrival zones.
- Vary receiver runs and defensive pressure.
- Score ball flight, arrival window and receiver advantage.

### F. Dribbling course

- Slalom with optional sprint gates.
- Shield-and-turn section.
- Dynamic defender shadows later.
- Penalise excessive touches and loss of control rather than using rigid rail movement.

### G. Defending drill

- Jockey and contain
- intercept passing lane
- secondary press choice
- timed standing tackle
- recover after being bypassed

### H. Goalkeeper drills

- positioning arcs
- near-post protection
- reaction saves
- claiming crosses
- distribution targets

## 8. Shared drill architecture

```ts
interface TrainingDrillDefinition {
  id: string;
  category: 'control' | 'passing' | 'shooting' | 'dribbling' | 'defending' | 'goalkeeping';
  scenario: ScenarioDefinition;
  inputProfile: string;
  scoreRules: ScoreRule[];
  medals: { bronze: number; silver: number; gold: number };
  durationSeconds?: number;
  progressionRewards: TrainingReward[];
  tutorialSteps: TutorialStep[];
}
```

A drill runner should provide:

- deterministic seed
- reset/retry under two seconds
- ghost/best-run replay
- bronze/silver/gold targets
- adaptive tutorial hints
- accessible speed and assistance options
- per-action diagnostics
- training reward caps

## 9. Engine and gameplay audit additions

### Movement and contact

- Shared arrival-time utility for switching, loose balls, press assignment and interception.
- Turn-rate and momentum cost based on facing and velocity.
- First-touch outcome based on ball speed, body orientation, pressure and player skill.
- Separate loose-ball claim state from magnetic possession.
- Critically damped visual interpolation without changing authoritative positions.

### Passing

- Replace static lane samples with time-to-intercept probability.
- Include receiver orientation, preferred foot and expected first touch.
- Add through-ball destination search over safe space, not only teammate position.
- Assistance presets expose target confidence and permit manual override.

### Team AI

- Dynamic role anchors using ball zone, phase, occupation and threat.
- Pitch-control grid at 10–15 Hz, not 120 Hz.
- Pressure-cover-balance defensive assignment.
- Support triangle, overlap, underlap and third-man run candidates.
- Team mentality and match-state utility weights.

### Player switching

- Score interception time, danger, stick angle, role and abandonment cost.
- Add hysteresis and aerial/loose-ball contexts.
- Right-stick selection later.

### Restarts

- Jog players into restart targets rather than hard teleport where presentation permits.
- Quick restart, short corner and distribution options.
- Set-piece target zones and routines later.

### Goalkeepers

- Decision utility for hold/parry/catch/charge/distribute.
- Ball-flight interception and collision confidence.
- Distribution risk and team tactical instruction.

### Match systems

- authoritative event stream for passes, shots, xG, tackles, saves, fouls and possession
- substitutions and stamina
- advantage, cards and referee strictness
- stoppage-time model
- formations and tactical instructions
- replay bookmarks generated from event value

## 10. System design connections

Create-a-Club output must feed:

- `ClubDefinition`
- `ClubSeasonState`
- `SquadRegistration`
- `ManagerProfile`
- `PlayerProfile`
- `ClubVisualIdentity`
- `TrainingSchedule`
- `MatchTeamSheet`

Training results emit bounded progression events. They must not directly mutate arbitrary engine constants.

```ts
interface TrainingResultEvent {
  drillId: string;
  playerId: string;
  seed: number;
  score: number;
  medal: 'none' | 'bronze' | 'silver' | 'gold';
  actionMetrics: Record<string, number>;
  rewards: TrainingReward[];
}
```

## 11. Recommended delivery sequence

### Gate 1 — schemas and navigation

- authoritative club/identity/manager schemas
- create-club state machine and save draft
- migration strategy
- route from new career to creator and back

### Gate 2 — visual identity MVP

- procedural kit patterns
- palette and clash validator
- layered SVG crest renderer
- review screen
- scorebug/menu integration

### Gate 3 — manager and player creator

- presets and accessibility
- difficulty-bound attribute budgets
- persistence and career integration

### Gate 4 — drill framework + keepy-uppy

- generic deterministic drill runner
- retry, medals, event scoring
- A/left-stick and mouse/LMB controls
- first-touch progression reward

### Gate 5 — football drills

- passing gates
- shooting
- dribbling
- crossing
- defending
- goalkeeper

### Gate 6 — engine improvement tranche

- contextual switching
- analytic interception
- dynamic team shape
- first touch and loose-ball behaviour
- smoother restarts and goalkeeper logic

## 12. Acceptance principles

- Creator is fully usable by gamepad and mouse.
- A recognisable club can be made without freehand art.
- Home and away kits cannot be accidentally indistinguishable.
- Crest and kits remain original and reproducible from parameters.
- Manager/player starting stats obey difficulty budgets.
- Every drill runs from the deterministic scenario framework.
- Drill inputs map to match controls.
- Training rewards are bounded and testable.
- No creator or drill system imports Three.js into authoritative engine modules.
- A complete flow works: create club → create manager → optional player → training → fixture → progression.
