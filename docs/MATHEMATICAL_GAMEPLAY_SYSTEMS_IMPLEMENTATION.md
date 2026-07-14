# Football 2027 — Mathematical Gameplay Systems Implementation

Status: post-vertical-slice implementation specification
Date: 14 July 2026

## Priority and scope

This document does not replace the current priority queue.

1. Complete #40 and #38.
2. Complete the vertical slice #32–#37.
3. Merge or rebuild the reviewed foundations in PRs #17, #25 and #28.
4. Implement this mathematical tranche through #27, #42 and the issues linked below.

Do not create a second physics engine, tactical runtime or input stack.

## Research basis

Research supports using player movement, ball travel, body orientation and opponent configuration when estimating pass availability. Orientation improved pass-feasibility ranking in analysis of more than 6,000 passes. Expected-possession models decompose the value of passes, carries and shots, which maps well to an explainable deterministic utility layer.

Implementation should use transparent approximations and scenario tests rather than runtime neural inference.

References:

- Arbués Sangüesa et al., “Using Player's Body-Orientation to Model Pass Feasibility in Soccer”: https://consensus.app/papers/using-players-bodyorientation-to-model-pass-feasibility-sangesa-martn/a87757669c1858058d410f798079b3cb/
- Fernández, Bornn and Cervone, “A framework for the fine-grained evaluation of the instantaneous expected value of soccer possessions”: https://consensus.app/papers/a-framework-for-the-finegrained-evaluation-of-the-fernndez-bornn/c22f676146885da6b39e8e530b70094f/
- Dick, Link and Brefeld, “Who can receive the pass?”: https://consensus.app/papers/who-can-receive-the-pass-a-computational-model-for-dick-link/d76819272d925d8892959f36fac9795a/

## 1. Shared arrival-time API

One pure deterministic module owns player arrival estimates.

Inputs:

- start position and velocity
- facing direction
- destination
- reaction delay
- maximum acceleration/deceleration
- maximum speed
- turn-rate or orientation penalty
- optional fatigue/surface multiplier

Baseline from rest:

```text
acceleratingDistance = vmax² / (2a)

if d <= acceleratingDistance:
    t = reaction + sqrt(2d/a)
else:
    t = reaction + vmax/a + (d - acceleratingDistance)/vmax
```

Refine current-motion cases with a bounded monotonic root solve over projected displacement. Return an explicit result:

```ts
interface ArrivalEstimate {
  reachable: boolean;
  timeSeconds: number;
  turnSeconds: number;
  accelerationSeconds: number;
  cruiseSeconds: number;
  rejection?: 'non_finite' | 'outside_pitch' | 'speed_cap' | 'invalid_config';
}
```

Uses:

- loose-ball races
- goalkeeper charging
- pass interception
- contextual switching
- pressing and cover assignment
- pitch control

Rules:

- no allocations in the hot path
- deterministic tie-break by stable entity ID
- no wall-clock time
- same helper for player and AI consumers

## 2. Pass availability

For candidate target point `q`:

1. predict ball arrival `tBall(q)` from the chosen pass trajectory;
2. calculate each opponent arrival `tOpp_j(q)`;
3. define margin `m_j = tOpp_j - tBall`;
4. convert margin to interception probability.

```text
pIntercept_j = 1 / (1 + exp(m_j / s))
pNoIntercept = product_j(1 - pIntercept_j)
```

Wolfram sensitivity check:

- with `s = 0.25 s`, margin -0.5 s → interception probability about 0.881;
- margin 0 s → 0.5;
- margin +0.5 s → about 0.119.

The final completion estimate also includes:

- passer execution quality
- pressure on passer
- receiver facing and field of view
- preferred/weak foot
- ball speed and height
- expected first-touch difficulty
- offside status

```text
pComplete = pNoIntercept
          × pExecution
          × pReceiverControl
          × pOnside
```

The model returns components, not only one score, so diagnostics can explain why a target was rejected.

## 3. Target-space search

Through balls and crosses search space rather than snapping only to current teammate positions.

- generate bounded candidate points from receiver velocity, role lane and pitch limits;
- reject offside, unreachable and obviously unsafe points;
- score using completion probability, receiver advantage and action value;
- retain manual aim authority when assistance confidence is low;
- use deterministic ordering and fixed candidate caps.

## 4. Expected action utility

For action `a`:

```text
U(a) = Psuccess(a) × Reward(a)
     - (1 - Psuccess(a)) × TurnoverCost(a)
     - ExecutionCost(a)
     - StaminaCost(a)
     + TacticalInstructionBias(a)
```

Candidate actions:

- pass
- through ball
- cross/cut-back
- carry
- shoot
- clear
- hold/protect

Reward components:

- territory and centrality gained
- defensive lines bypassed
- receiver advantage
- shot/chance quality
- score/time state

Turnover cost components:

- counterattack exposure
- rest-defence coverage
- proximity to own goal
- numerical disadvantage

No hidden random roll chooses the action. Optional variety uses bounded seeded noise after the deterministic score and must never override clearly dominant choices.

## 5. Pitch control

Initial grid: 24 × 16 = 384 cells.

At 15 Hz this is 5,760 cell updates per second before player comparisons. Use spatial pruning, cached arrival terms and lower update rates where necessary.

For each cell:

```text
tHome = minimum home arrival

tAway = minimum away arrival

pHome = 1 / (1 + exp((tHome - tAway) / sControl))
pAway = 1 - pHome
```

Store:

- home/away probability
- first and second arriving players
- uncertainty
- last update tick

Update policy:

- 10–15 Hz during live play
- event-triggered refresh after possession, restart or major shape changes
- interpolate for presentation only

## 6. Stable assignment

Use minimum-cost assignment for formation slots, marking and pressure-cover balance.

```text
cost(player, target) = arrivalTime
                     + roleMismatch
                     + fatigueCost
                     + dangerWeight
                     + assignmentSwitchPenalty
                     + zoneAbandonmentCost
```

An 11 × 11 Hungarian solve is acceptable at low frequency; cubic-size reference is 1,331 elementary matrix-scale units before implementation overhead. Do not run it at 120 Hz.

Add hysteresis and minimum assignment duration unless danger changes materially.

## 7. Contextual player switching

```text
score_i = -w1 × interceptTime
          -w2 × distanceToDanger
          +w3 × stickAlignment
          +w4 × roleSuitability
          +w5 × momentumAlignment
          -w6 × abandonmentCost
          +contextBias
```

Contexts:

- grounded loose ball
- aerial ball
- runner behind line
- keeper possession
- set piece
- manual right-stick selection

Only switch automatically when the new score exceeds the current player by a configured hysteresis margin.

## 8. First touch and loose-ball ownership

First touch is a result, not an automatic possession snap.

Inputs:

- relative ball velocity
- contact point and body orientation
- pressure and opponent arrival margin
- player first-touch, balance and composure
- foot suitability
- requested next action

Outputs:

- controlled touch
- heavy but recoverable touch
- deflection
- failed control
- contested loose ball

Possession begins only after a valid control event. All outcomes must be replayable from stored state and semantic input.

## 9. Difficulty

Difficulty changes information quality and execution variance, not input delay or impossible physical bonuses.

Adjustable dimensions:

- reaction/scanning cadence
- prediction horizon
- action-score noise
- tactical discipline
- execution-error distribution
- risk tolerance
- adaptation to repeated behaviours

Keep player and AI acceleration/speed inside the same physical model unless a clearly disclosed arcade preset intentionally changes global simulation parameters.

## 10. Presentation smoothing

Three.js rendering consumes immutable snapshots.

- fixed simulation step: 1/120 s
- render interpolation independent from simulation authority
- exponential coefficient from half-life: `lambda = ln(2)/halfLife`
- critically damped equation uses `beta = 2ω`

Reference half-life coefficients:

- 0.08 s → lambda 8.6643
- 0.12 s → 5.7762
- 0.18 s → 3.8508
- 0.25 s → 2.7726
- 0.35 s → 1.9804

Use Three.js timer/render APIs only in presentation. `renderer.info` supplies calls/triangles/textures proxies but not complete legacy-WebGL GPU timing, so diagnostics must label CPU/render proxies honestly.

## 11. Scenario and calibration requirements

Every mathematical system ships with deterministic fixtures:

- stationary and moving arrival
- turn-away interception
- attacker/defender equal-time tie
- safe and unsafe pass margins
- receiver facing toward/away from ball
- loose-ball race
- goalkeeper rush
- pressure-cover assignment
- switch hysteresis
- 2v1 and 3v2 action choice
- grid response to moving one player

Required outputs:

- first divergent tick
- selected candidate and stable tie-break
- component probabilities/costs
- elapsed engine time
- candidate/refinement counts
- final checksum

## 12. Input architecture dependency

Mathematical decisions consume semantic intent, never physical button numbers.

The browser layer must support:

- FC-style, eFootball-style and custom presets
- standard Gamepad mapping where available
- `gamepadconnected`/`gamepaddisconnected`
- active polling with `navigator.getGamepads()`
- recent-device debounce/hysteresis
- dynamic platform glyphs
- keyboard/mouse fallback
- explicit assistance settings

Do not encode PlayStation/Xbox labels inside engine modules.

## 13. Issue reconciliation

- #6 remains the umbrella tactical algorithm design.
- #27 owns integration of already-created damping/interception foundations.
- #42 owns deterministic scenario infrastructure.
- #43 should be treated as the player-facing tranche and should depend on #27/#42 rather than reimplementing their helpers.
- #48 owns shared control presets and training integration.
- #5/#19 own ball flight and ground-contact mechanics; pass evaluation consumes their trajectory API rather than duplicating ball equations.
- #16/#18 own player contact; switching and first-touch systems consume contact events rather than inventing parallel overlap rules.

## 14. Definition of done

- one arrival-time implementation serves all consumers
- pass and switch decisions expose explainable components
- pitch-control/assignment updates stay within measured budgets
- physical-button mappings remain outside the engine
- same seed and semantic input reproduce decisions and checksums
- no mathematical work starts before the current P0/P1 delivery gates permit it
- typecheck, tests, production build and browser smoke test pass
