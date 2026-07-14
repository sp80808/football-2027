# Contact, Tackle and Ragdoll Architecture

## Purpose

Replace scripted dispossession and weightless overlap with deterministic, physically grounded contact while preserving responsive arcade control and replay parity.

## Current problems on `main`

- `Opponent.dispossess()` directly overwrites ball velocity and possession state.
- Player and opponent bodies have no explicit mass, collision radius, impulse exchange or balance state.
- Tackles use distance and timers but not closing velocity, contact normal, momentum, leverage or ball-first timing.
- Ball-ground contact combines exponential horizontal damping with ad-hoc spin generation.
- There is no authoritative fall, stagger or recovery state.
- A full skeletal ragdoll inside the authoritative 120 Hz simulation would be unnecessarily expensive and would threaten TS/WASM parity.

## Architecture decision

Use a two-layer character physics model.

### Authoritative simulation

The deterministic simulation owns:

- a 2D circular/capsule body for each player
- position, planar velocity, facing, mass and inverse mass
- contact impulses and positional correction
- support/balance state
- tackle contact geometry and ball-first timing
- `upright`, `staggered`, `falling`, `grounded`, `recovering` states
- recovery timing and temporary control penalties
- ball/player contact events

This layer must produce identical results in TypeScript and WASM for the same seed and inputs.

### Presentation simulation

The renderer owns:

- short hit reactions
- procedural leaning and foot planting
- partial active ragdoll for torso/arms during severe contact
- full visual ragdoll after an authoritative `fall` event
- animation-to-ragdoll and ragdoll-to-get-up blending
- camera shake, audio and particles

The presentation layer must never feed skeletal results back into match outcomes. It consumes immutable events and authoritative root transforms.

## Contact equations

### Normal impulse

For contact normal `n` and relative normal velocity `v_n`:

```text
j_n = -(1 + e) v_n / (mA^-1 + mB^-1)
```

Apply only when bodies are closing (`v_n < 0`). Player-player restitution should be low so bodies feel heavy rather than bouncy.

### Coulomb friction

After the normal impulse, compute the tangential relative velocity and unconstrained tangential impulse. Clamp it to:

```text
|j_t| <= mu |j_n|
```

This provides shoulder-to-shoulder drag, reduces skating and allows glancing collisions.

### Positional correction

Use slop and partial correction rather than teleporting the entire overlap in one frame:

```text
correction = percent * max(penetration - slop, 0) / inverseMassSum
```

Recommended initial values:

- slop: `0.01 m`
- correction percent: `0.55–0.7`
- player restitution: `0.02–0.1`
- player friction: `0.45–0.7`

## Ball-ground rolling and sliding

Treat the football approximately as a spherical shell once ball inertia is introduced:

```text
I = 2/3 m r^2   (thin shell approximation)
```

A solid-sphere approximation uses `I = 2/5 m r^2`. The selected value should be calibrated against measured roll-down and spin-decay tests.

At ground contact, calculate contact slip velocity:

```text
v_contact = v_tangent + omega × r_contact
```

The tangential impulse required to remove slip is:

```text
j_t = -v_contact / (1/m + r^2/I)
```

Clamp by Coulomb friction. When the required impulse is below the friction cap, transition to rolling without slip. Otherwise remain in sliding contact.

For a `0.43 kg`, `0.11 m` solid sphere, Wolfram evaluation gives:

- inertia: approximately `0.0020812 kg m²`
- rolling-contact effective mass: approximately `0.122857 kg`
- required rolling impulse factor: `2m/7`

Do not keep both exponential horizontal damping and impulse-based ground friction after this is integrated; that would double-damp the ball.

## Tackle assessment

A tackle is a contact plus football-specific context, not a random success roll.

Inputs:

- closing speed along contact normal
- reduced mass
- normal relative kinetic energy
- contact offset and torque arm
- tackler facing alignment
- carrier exposure angle
- support width and centre-of-mass height
- balance/player attributes
- ball-first timing and ball displacement

The foundation module computes:

```text
reducedMass = 1 / (1/mTackler + 1/mCarrier)
normalKE = 1/2 reducedMass closingSpeed²
criticalLateralAcceleration = g supportHalfWidth / COMHeight
```

A representative `78 kg` and `82 kg` collision has reduced mass `39.975 kg`. At `5.2 m/s` closing speed the relative normal kinetic energy is about `540 J`; this is enough to demand a fall/stagger response unless geometry is very favourable.

Outcomes:

- `glance`: contact response only; little or no control interruption
- `stagger`: reduced steering/acceleration, unstable touch and short recovery spring
- `fall`: authoritative root enters falling/grounded/recovery state; renderer blends to ragdoll

## Balance and toppling

The quasi-static threshold for a centre of mass to move beyond the support polygon is approximated by:

```text
a_critical = g b / h
```

where `b` is support half-width and `h` is COM height. With `b = 0.18 m` and `h = 1.02 m`, Wolfram gives about `1.731 m/s²`.

This is intentionally only one term. Dynamic angular impulse, current planted-foot state, facing, stamina and animation phase should modify the threshold.

## Recovery

Use exact critically damped updates rather than frame-rate-dependent interpolation:

```text
x'' + 2 omega x' + omega²(x - target) = 0
```

The foundation module includes a closed-form fixed-step update. Recommended initial angular frequencies:

- light stagger: `omega = 12–16 rad/s`
- heavy stagger: `omega = 7–11 rad/s`
- post-ragdoll get-up alignment: `omega = 5–8 rad/s`

## Ragdoll implementation stages

### Stage 1 — pseudo-ragdoll

- Authoritative fall state and root trajectory
- animation hit reactions and get-up clips
- procedural torso lean based on impulse direction
- no skeletal rigid bodies

### Stage 2 — partial active ragdoll

- torso, pelvis, head and arms only
- PD motors track animation pose
- legs remain animation/IK driven until grounded
- activate for severe tackles and keeper collisions

### Stage 3 — full visual ragdoll

- 10–14 rigid body segments
- joint angular limits
- substepped presentation solver
- deterministic event seed chooses blend profile, but presentation motion is not authoritative
- freeze/sleep and blend to one of a small set of get-up poses

A browser build should not simulate full ragdolls for every player continuously. Pool them and activate only near relevant contact/replay cameras.

## Event contract

Add versioned events such as:

```ts
interface PlayerContactEvent {
  type: 'player_contact';
  tick: number;
  aId: string;
  bId: string;
  normal: { x: number; y: number };
  normalImpulse: number;
  frictionImpulse: number;
  contactPoint: { x: number; y: number };
}

interface TackleResolvedEvent {
  type: 'tackle_resolved';
  tick: number;
  tacklerId: string;
  carrierId: string;
  ballFirst: boolean;
  severity: number;
  outcome: 'glance' | 'stagger' | 'fall';
  impulseDirection: { x: number; y: number };
}
```

Replay, commentary, crowd, referee, camera and ragdoll systems consume these events.

## Integration order

1. Merge pure `ContactMath` and tests.
2. Add mass/radius/balance fields and body-state snapshots.
3. Resolve player/opponent overlap after locomotion, before ball interaction.
4. Replace direct scripted dispossession with contact + tackle assessment.
5. Add authoritative stagger/fall/recovery state machine.
6. Port identical math to WASM and add golden parity tests.
7. Replace ball ground damping with angular contact/rolling solver.
8. Add pseudo-ragdoll presentation.
9. Benchmark partial active ragdoll behind a quality flag.

## Required diagnostics

Per contact or test scene, expose:

- linear momentum before/after
- kinetic energy before/after
- normal and friction impulses
- penetration and correction
- tackle severity terms
- balance margin
- active ragdoll count and solver cost

Impact contacts may dissipate energy, but should not create unexplained energy. Momentum should remain close to conserved for isolated player-player contacts.
