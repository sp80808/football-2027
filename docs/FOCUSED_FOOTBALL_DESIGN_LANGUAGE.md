# Football 2027 — Focused Football Design Language

Status: implementation plan
Date: 14 July 2026

## Product direction

Football 2027 should look like one coherent football operating system rather than a collection of unrelated sports-game screens.

The visual language is **Focused Football**:

- bold silhouettes and simplified materials during play;
- compact broadcast information during live action;
- expanded analytical layers only in pause, replay, simulation and management contexts;
- one spatial pitch grammar reused across tactics, player cards, match reports and training;
- club colour appears as identity, not as uncontrolled decoration;
- animation communicates state and priority, not constant spectacle.

## 1. Three visual modes

### Live

Purpose: play the match.

- preserve the centre and lower-middle pitch;
- one compact scorebug;
- one controlled-player/status cluster;
- short event toasts only;
- contextual prompts display current input glyphs;
- tactical overlays appear only on request or at dead balls;
- no permanent panels, radial dashboards or card stacks.

### Analyse

Purpose: understand what just happened.

Used for pause, replay, half-time and optional coach view.

- pitch becomes a high-contrast tactical canvas;
- players simplify into numbered discs/mini silhouettes where useful;
- trails, passing lanes, pressure, shape and pitch-control layers can be toggled;
- timeline and key-event rail appear at the edge;
- one selected event or player owns the detail panel;
- all values come from authoritative stored events/snapshots.

### Manage

Purpose: make a decision.

Used for career, squad, tactics, training and club setup.

- stable left navigation or compact top-level route bar;
- central working surface;
- optional right inspector for the selected item;
- progressive disclosure instead of presenting every statistic at once;
- one primary decision per screen;
- summaries first, evidence second, raw detail third.

## 2. Rendering and shading

### Style

Use a stylised broadcast-realism approach rather than photorealism:

- clean player silhouettes at broadcast distance;
- slightly exaggerated kit colour separation;
- restrained facial/detail work outside close replay shots;
- soft directional light plus broad stadium fill;
- simple readable material groups: skin, kit, boot, grass, metal, crowd;
- selective rim or contact light only where it improves separation;
- restrained bloom limited to floodlights, UI focus and celebration moments;
- no permanent neon glow around players or ball.

### Pitch

The pitch is the core visual canvas:

- desaturated natural grass base;
- clear mowing direction and zone readability;
- subtle wear near goals and touchlines;
- analytical overlays use translucent ink-like fills, not opaque heatmap blankets;
- tactical grid, zones and passing lanes share one metre-based transform utility.

### Players

At normal camera distance, prioritise:

1. team colour;
2. controlled/selected state;
3. orientation;
4. movement phase;
5. role/number;
6. fine character detail.

Player selection should use a thin ground arc, pointer or shirt-number emphasis rather than a large glowing ring.

### Ball

Visibility comes from contrast, shadow, motion and camera framing. Avoid a permanent emissive ball. Use a short contact flash or subtle trail only for accessibility or high-speed replay.

## 3. Shape grammar

Use a small visual vocabulary:

- clipped rectangles for panels and cards;
- circles for players, possession and status;
- diagonal cuts for motion, progression and match events;
- thin pitch lines as dividers;
- compact tabs and rails rather than large floating cards;
- one accent edge per selected element.

Corner radii remain modest. Avoid soft rounded mobile-app styling across the whole product.

## 4. Colour system

Base:

- Night Navy: #07101C
- Deep Panel: #0E1B2B
- Chalk: #F2F7FF
- Muted Text: #94A3B8

Signals:

- Signal Cyan: #14D1E6 for information, selection and analysis;
- Progress Green: #33D677 for positive progression and confirmation;
- Amber: warnings and fatigue;
- Red: danger, cards, destructive action and severe condition only.

Club colours should enter through:

- kit previews;
- crest strip;
- selected-team edge;
- scorebug abbreviation block;
- tactical markers;
- player-card identity band.

Never recolour the entire interface to match the club.

## 5. Typography and data density

Use one condensed display face for scores, time, ratings and headings, plus one highly readable sans for controls and explanations.

Hierarchy:

- score/time: largest and densest;
- screen/action title;
- selected player/team;
- decision summary;
- supporting metric;
- raw detail.

Rules:

- show labels beside unfamiliar metrics;
- use football language before internal simulation terms;
- display no more than 3–5 primary metrics on a card;
- reveal advanced values in an inspector, comparison or expanded state;
- avoid dense walls of equally weighted numbers.

## 6. HUD system

Persistent live HUD:

- compact scorebug;
- match clock and phase;
- controlled-player name/condition only when useful;
- temporary power/aim feedback;
- temporary event toast;
- optional compact minimap.

Contextual HUD:

- set-piece options;
- substitution prompt;
- advantage/card information;
- current input glyph;
- injury/fatigue warning;
- tactical quick change.

Rules:

- persistent HUD should stay below 20% of the desktop viewport;
- centre and lower-middle pitch remain protected;
- event animations occur once from authoritative events;
- reduced motion preserves information without camera shake or large transitions.

## 7. Player cards

Use one card system with four densities.

### Chip

Name, position, number, condition.

### Match card

Name, role, condition, current rating, one key contribution and one warning.

### Squad card

Portrait/silhouette, position group, role fit, overall band, form, condition and development marker.

### Analysis card

Selected action/event, confidence, outcome and 3–5 contextual metrics.

Cards use:

- club-colour identity edge;
- position icon;
- one dominant state;
- small comparison deltas;
- no collectible-card visual language or decorative rarity frames.

## 8. Manager and tactical views

### Tactical board

The pitch is always primary.

- players use shirt discs with number and role colour;
- formation slots remain distinct from actual average positions;
- selected player opens the inspector;
- role, duty, condition and instruction appear together;
- passing/support/press relationships use directional lines only when selected;
- team shape can switch between base, in-possession and out-of-possession views;
- live simulation mode animates simplified player movement over the same tactical canvas.

### Sim/coach mode

Provide three levels:

1. **Ticker** — score, clock, major events and momentum summary.
2. **Tactical 2D** — simplified moving player discs, ball and key event overlays.
3. **Broadcast 3D** — normal rendering with management controls reduced to the edges.

All three consume the same match snapshots and events. Switching view cannot change simulation outcomes.

### Match control rail

During sim mode:

- mentality;
- tempo;
- press;
- line height;
- width;
- substitution;
- one contextual recommendation.

Changes queue as explicit tactical commands with visible effective time, rather than silently mutating AI weights.

## 9. Menus and navigation

Use a shallow route structure:

- Play
- Career
- Club
- Squad
- Tactics
- Training
- Data
- Settings

Within a task, prefer:

- left route rail;
- centre content;
- right inspector;
- bottom contextual actions.

Avoid:

- nested carousel menus;
- full-screen card mosaics;
- repeated confirmation screens;
- duplicate routes to the same action;
- more than two navigation levels for common tasks.

## 10. Motion language

Motion has four meanings:

- slide: navigation or tactical movement;
- snap: score/stat change;
- pulse: urgent temporary state;
- trace: replay or analytical history.

Use 120–220 ms for ordinary UI transitions. Longer motion is reserved for goals, trophies and major career events. Do not animate every number or card on entry.

## 11. Implementation architecture

Create reusable primitives rather than mode-specific copies:

- `GameShell`
- `RouteRail`
- `InspectorPanel`
- `Scorebug`
- `EventToast`
- `PlayerChip`
- `PlayerCard`
- `MetricRow`
- `PitchCanvas`
- `TacticalMarker`
- `TimelineRail`
- `ControlGlyph`
- `StatusPill`
- `DecisionFooter`

All visual surfaces consume selectors/snapshots. They do not own authoritative game state.

## 12. Delivery gates

### Gate A — tokens and primitives

- consolidate colours, typography, spacing, radii and motion;
- harden Button, Panel, Card, Tabs, Tag and Dialog;
- add PlayerChip, MetricRow and ControlGlyph;
- dev-only component gallery.

### Gate B — live match shell

- compact scorebug;
- controlled-player/status cluster;
- event toast;
- contextual aim/power and glyph prompts;
- 720p, 1080p and reduced-motion checks.

### Gate C — tactical canvas

- one metre-based pitch transform;
- formation slots, player discs and role markers;
- selected-player inspector;
- in/out-of-possession shape toggle;
- keyboard/controller navigation.

### Gate D — sim/coach mode

- ticker, 2D tactical and 3D broadcast views;
- shared timeline/event stream;
- queued tactical commands;
- view switching without simulation mutation.

### Gate E — cards and management surfaces

- squad and analysis card densities;
- career hub summaries;
- training and player-development surfaces;
- advanced metrics behind inspectors.

### Gate F — rendering polish

- calibrated lighting and materials;
- pitch readability;
- player/ball separation;
- measured post-processing presets;
- visual regression and frame-budget capture.

## 13. Reconciliation with current issues

- #9 owns broadcast presentation components and tactical overlays.
- #11 owns rendering, camera, stadium and broad match presentation.
- #15 owns generic UI primitives and tokens.
- #24 owns readability and graphics presets.
- #37 owns vertical-slice E2E/accessibility/performance gates.
- #44 owns post-processing and asset-pipeline spikes.
- #50 owns dynamic control glyphs and input profiles.

This document defines the shared visual language and sequence; it does not replace those implementation issues.

## 14. Acceptance principles

- live play remains visually quiet;
- every screen has one obvious primary action;
- the pitch is the primary tactical interface;
- club identity appears consistently but does not dominate layout;
- the same player/card/tactical components scale across live, analyse and manage modes;
- simulation view changes never alter authoritative outcomes;
- all common actions remain within two navigation levels;
- keyboard, controller and pointer flows are complete;
- reduced-motion and colour-contrast alternatives preserve meaning;
- performance and readability are measured, not assumed.
