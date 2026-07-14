# Football 2027 Physics Presentation & Diagnostics UI Specification

## Purpose

Translate deterministic contact, tackle and ball-contact mathematics into readable gameplay feedback, replay analysis and developer diagnostics without obscuring the pitch or allowing presentation systems to alter authoritative outcomes.

## Design sources

- Figma UI system: https://www.figma.com/design/3t9KZyigE4bLc9Q0aGINoE
- FigJam architecture and state flow: https://www.figma.com/board/fEsm4TksXthQ5zUlcp8N6Q
- Physics architecture: `docs/CONTACT_TACKLE_RAGDOLL_ARCHITECTURE.md`
- Pure solver: `src/engine/ContactMath.ts`

## Game Studio constraints

- Keep simulation state outside Three.js objects.
- Treat rendering, animation, camera shake and ragdoll as presentation adapters.
- Use DOM for text-heavy HUD and diagnostics.
- Protect the centre and lower-middle playfield during live play.
- Gate gameplay/camera input when replay analysis or diagnostics panels are interactive.
- Keep visual ragdoll incapable of changing possession, fouls, injury, score or authoritative root position.

## Player-facing interaction language

### Glance

- Short shoulder/hip response.
- No large HUD panel.
- Small directional contact flash at the player marker.
- Optional controller haptic pulse proportional to clamped normal impulse.
- Ball-control cone briefly widens if possession tolerance is exceeded.

### Stagger

- Procedural torso lean and one-to-three corrective steps.
- Compact transient status chip near the player-status cluster: `OFF BALANCE`.
- Energy/stamina display remains unchanged; balance is a separate transient state.
- Input is attenuated, not completely disabled.
- Recovery progress is never shown as a large progress bar during live play.

### Fall

- Authoritative root enters `falling`, then `grounded`, then `recovering`.
- Visual layer blends into pseudo-ragdoll or active ragdoll based on quality tier.
- A contextual get-up indicator appears only when user input can affect recovery.
- Camera shake is amplitude-limited and disabled by reduced-motion settings.

## Broadcast event presentation

Add a `TackleEventToast` composition beside the existing event-toast system.

Visible fields:

- tackler and carrier display names
- `CLEAN`, `LATE`, `BODY FIRST`, or `BALL FIRST`
- outcome: `GLANCE`, `STAGGER`, `FALL`
- optional card/foul result after referee resolution

Do not expose joules, newton-seconds or raw severity to normal players. Those belong in replay analysis and developer tools.

## Replay analysis panel

A pause/replay-only panel may show:

- closing speed in metres per second
- normal kinetic energy in joules
- normal impulse in newton-seconds
- tangential/friction impulse
- angular leverage
- balance demand
- ball-first timing
- severity score and classification

Use a horizontal timeline:

1. approach
2. first contact
3. peak impulse
4. possession change
5. stagger/fall transition
6. recovery start

The panel must consume immutable replay events and snapshots, not recompute outcomes from rendered animation.

## Developer physics HUD

Dev-only toggles:

- body discs and collision normals
- penetration depth
- relative velocity vector
- impulse vector
- support polygon and COM projection
- ball contact velocity and slip vector
- rolling/sliding state
- current balance state
- momentum and kinetic-energy diagnostics

The diagnostics overlay must default off and remain excluded from production builds unless explicitly enabled.

## Calibration bands

These are gameplay tuning bands, not injury or medical thresholds.

For representative 78 kg and 82 kg players, reduced mass is approximately 39.975 kg.

| Normal closing speed | Normal energy | Initial presentation band |
| --- | ---: | --- |
| 1.5 m/s | 45 J | glance |
| 3.0 m/s | 180 J | stagger |
| 4.5 m/s | 405 J | fall candidate |
| 5.2 m/s | 540 J | fall candidate |
| 6.5 m/s | 844 J | severe fall candidate |

Final classification must continue to include geometry, support, carrier balance and ball-first mitigation from `assessTackle()`.

## Recovery animation mapping

The authoritative recovery helper is critically damped. Presentation should read its normalized value and velocity rather than run a separate gameplay timer.

Suggested visual response ranges:

- omega 8 rad/s: sharp corrective step / minor glance
- omega 6 rad/s: standard stagger recovery
- omega 4 rad/s: slower fall/get-up alignment

Animation blending may lag the authoritative state slightly for visual continuity, but input and possession rules use authoritative state only.

## Ball ground-contact feedback

When angular ground contact is implemented:

- show a brief grass/dirt contact effect only when normal impulse exceeds the visual threshold
- derive skid audio from contact-slip speed
- derive rolling audio from angular speed after grip transition
- avoid constant particles or audio for ordinary rolling
- replay diagnostics may display `SLIDING`, `GRIPPING`, or `ROLLING`

For a solid sphere, the ideal unconstrained slip-removal impulse has the familiar `2m/7` mass factor before Coulomb clamping.

## Required React components

```text
broadcast/
  TackleEventToast.tsx
  BalanceStateChip.tsx
  GetUpPrompt.tsx

replay/
  ContactAnalysisPanel.tsx
  ContactTimeline.tsx
  PhysicsMetric.tsx

diagnostics/
  PhysicsDebugPanel.tsx
  PhysicsOverlayLegend.tsx
```

## Event contract additions

```ts
type PlayerContactEvent = {
  type: 'player_contact';
  tick: number;
  playerAId: string;
  playerBId: string;
  normal: { x: number; y: number };
  normalImpulse: number;
  frictionImpulse: number;
  relativeNormalSpeed: number;
};

type TackleResolvedEvent = {
  type: 'tackle_resolved';
  tick: number;
  tacklerId: string;
  carrierId: string;
  ballFirst: boolean;
  normalKineticEnergy: number;
  angularLeverage: number;
  balanceDemand: number;
  severity: number;
  outcome: 'glance' | 'stagger' | 'fall';
  possessionChanged: boolean;
};
```

Version these events before replay persistence ships.

## Accessibility

- Do not rely on shake, colour or animation alone to communicate contact outcome.
- Support reduced motion by replacing shake/lean exaggeration with opacity and text cues.
- Keep tackle toasts screen-reader concise.
- Avoid flashing impact effects.
- Haptics are optional and separately configurable.

## Performance budgets

- No React state update for every simulation tick; subscribe to events and coarse selectors.
- Pool impact decals, particles and ragdoll rigs.
- Maximum one full visual ragdoll near the active camera in low quality, four in high quality.
- Physics debug geometry uses instanced lines/meshes and remains dev-only.
- Contact UI must add less than 0.3 ms average scripting time per rendered frame on the target desktop profile.

## Acceptance criteria

- Gameplay feedback matches authoritative `glance`, `stagger`, `fall` outcomes.
- Replay analysis reproduces stored metrics without recalculation drift.
- Reduced-motion mode remains fully understandable.
- Live HUD preserves the centre and lower-middle playfield.
- Ragdoll quality changes do not change gameplay outcomes.
- Screenshot and browser playtests cover desktop, 720p and narrow layouts.
