# F2027 UI / UX Specification

## Product surfaces

1. **Boot and identity:** splash, profile/save selection, main menu
2. **Play:** quick match setup, gameplay HUD, pause, replay and post-match
3. **Career:** hub, squad, training, fixtures, standings, objectives and inbox
4. **System:** settings, controls, accessibility, diagnostics and error recovery

## Layout principles

- The live 3D pitch is the product hero. Persistent HUD should cover no more than roughly 20% of desktop play area.
- Keep the centre and lower-middle playfield clear during normal play.
- Management screens have one obvious primary action and a stable back path.
- Dense data belongs in tables; decisions belong in cards; temporary feedback belongs in toasts.
- Desktop baseline: 1440×900. Also verify 1280×720, 1920×1080 and mobile landscape.

## Information hierarchy

### Gameplay

1. Score and clock
2. Controlled player and immediate state
3. Contextual input feedback such as power, target or advantage
4. Transient match events
5. Optional tactical or diagnostic information

### Career hub

1. Next fixture / continue action
2. Club snapshot and current objectives
3. Squad condition and progression alerts
4. Table, fixtures and inbox
5. Secondary management links

## Component architecture

```text
ui/
  Button, IconButton, ButtonGroup
  Panel, Card, Tabs, Tag
  Notification, Dialog
  SelectField, SliderField, Table

broadcast/
  Scorebug, MatchClock, EventToast
  CommentarySubtitle, PlayerStatus
  ChargeMeter, TacticalMiniMap, ReplayTransport

management/
  ClubSnapshot, FixtureCard, FormationPitch
  PlayerCard, SquadTable, StandingsTable
  ObjectiveProgress, InboxItem, TrainingProgrammeCard
```

## Responsive behaviour

- **Desktop:** scorebug top-centre; player state lower-left; transient power/target lower-right.
- **720p:** reduce padding, combine player name and XP into one compact strip.
- **Mobile landscape:** replace wide panels with edge chips; pause opens a full-screen accessible overlay.
- **Mobile portrait:** menus and career surfaces supported; live match may show an orientation prompt until touch controls are intentionally redesigned.

## Interaction states

Every actionable component requires default, hover, focus-visible, pressed, disabled and loading states. Gamepad focus must be visually stronger than hover and must not rely on colour alone.

## Accessibility

- WCAG AA contrast for core text and controls
- Full keyboard and gamepad navigation
- Remappable controls
- Reduced motion option
- Commentary subtitle and event log controls
- Colour-blind-safe team differentiation using pattern/shape as well as colour
- Text scaling target up to 125% without clipped controls

## Splash specification

- Duration target: 1.2–2.2 seconds on a warm load
- Skip on input after minimum legal/engine init work is complete
- Display honest loading state; do not fake progress if asset loading is indeterminate
- Preload only menu-critical assets before entering the main menu
- Use the F27 mark, game name and one concise line: “Build your football story”

## Main menu specification

- Left-aligned primary options for fast keyboard/gamepad scan
- Background may show a low-motion stadium/pitch scene or player tunnel
- Primary options: Continue Career, Quick Match, New Career
- Secondary: Settings, Accessibility, Credits
- Surface build version and network/offline status unobtrusively

## Career progression feedback

- XP gains are grouped by action category after a match
- Level-up moments show the attribute affected and the practical gameplay meaning
- Training cards show benefit, fatigue cost, schedule and eligibility before confirmation
- Never hide persistence failure; show retry/export recovery action

## UI quality gate

A screen is not complete until it has empty, loading, error, success and controller-focus states, plus screenshots at 1440×900 and 1280×720.
