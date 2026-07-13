# Football 2027 Roadmap & Development Sprints

This document outlines the development phases, technical roadmaps, and detailed sprint schedules for **Football 2027**.

---

## Roadmap Overview

```mermaid
gantt
    title Football 2027 Development Timeline
    dateFormat  YYYY-MM
    section Phase 1: Foundation
    Completed Core Architecture :done, 2026-06, 2026-07
    section Phase 2: Expressive Control
    Sprint 2.1: Input Intent Parser :active, 2026-07, 2026-08
    Sprint 2.2: Advanced First Touch :active, 2026-08, 2026-08
    Sprint 2.3: Player Shielding : 2026-08, 2026-09
    Sprint 2.4: Contextual Targeting : 2026-09, 2026-09
    section Phase 3: Defensive & AI
    Sprint 3.1: Tackle Mechanics & Windows : 2026-09, 2026-10
    Sprint 3.2: Defending Jockey & Pressing : 2026-10, 2026-10
    Sprint 3.3: Advanced Goalkeeper AI : 2026-10, 2026-11
    Sprint 3.4: Team Tactics & Policies : 2026-11, 2026-11
    section Phase 4: Multiplayer & Scale
    Sprint 4.1: Spatial Collision Hashing : 2026-11, 2026-12
    Sprint 4.2: 11v11 Simulation & Shapes : 2026-12, 2027-01
    Sprint 4.3: Couch Multiplayer : 2027-01, 2027-01
    section Phase 5: Career Mode
    Sprint 5.1: SQLite/IndexedDB & State : 2027-01, 2027-02
    Sprint 5.2: Zod Schemas & Career Data : 2027-02, 2027-02
    Sprint 5.3: Gemini-powered AI Scouting : 2027-02, 2027-03
```

---

## Phase 1: Foundation (Completed)
* **Code Audit**: Audited existing React, Three.js, and physics structures.
* **Fixed Timestep**: Implemented double-buffered 120 Hz tick loop with accumulator-based render interpolation.
* **Input Buffering**: Added basic controller abstraction and mapped gamepad/keyboard input frames.
* **Diagnostic HUD**: Created a visual overlay displaying FPS, TPS, player speeds, and control states.
* **Vitest Coverage**: Established test suite for goals and ball logic.

---

## Phase 2: Expressive Control (Current Phase)

Phase 2 focuses on moving from simple direct physics to **intentional control**. The engine will parse raw inputs into a semantic `PlayerIntent` before executing movements and touches.

### Sprint 2.1: Input Intent Parser
* **Objective**: Decouple raw `ControllerFrame` inputs from physics execution by building the `IntentParser`.
* **Deliverables**:
  * Implement `IntentParser.ts` inside `src/engine/`.
  * Parse raw buttons/sticks into semantic action triggers (e.g., distinguishing between a tap for a short pass vs holding for a through pass, or pressing the trigger for a knock-on).
  * Update `Player.update()` to accept `PlayerIntent` rather than `ControllerFrame`.
* **Files Affected**:
  * [NEW] `src/engine/IntentParser.ts`
  * [MODIFY] [Intent.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Intent.ts)
  * [MODIFY] [Player.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Player.ts)
  * [MODIFY] [GameEngine.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/GameEngine.ts)
* **Acceptance Criteria**:
  * All unit tests build successfully.
  * Diagnostic HUD displays parsed intent coordinates correctly.
  * Movement remains responsive with zero latency introduced by the parsing layer.

### Sprint 2.2: Advanced First Touch Logic
* **Objective**: Replace instant-snapping ball possession with a realistic touch-cadence system.
* **Deliverables**:
  * Implement touch mechanics based on the speed of the incoming ball relative to the player.
  * Add support for 4 touch profiles:
    * `cushion`: Soft touch that kills the ball's momentum (active when moving slowly or shielding).
    * `push`: Standard dribble touch that pushes the ball slightly ahead.
    * `knock_on`: Heavy touch pushing the ball far ahead into space (triggered by sprinting + flicking direction).
    * `first_time`: Deflecting or passing the ball directly before gaining control.
* **Files Affected**:
  * [MODIFY] [Player.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Player.ts)
  * [MODIFY] [Ball.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Ball.ts)
* **Acceptance Criteria**:
  * Incoming high-speed balls bounce off players naturally if they don't perform a "cushion" touch.
  * Sprinting causes the touch interval to increase, making the ball loose and interceptable between touches.

### Sprint 2.3: Player Shielding & Bracing
* **Objective**: Allow the player to shield the ball using their physical body to block incoming opponents.
* **Deliverables**:
  * Implement shielding mechanics inside `Player.ts` when holding the shield input button.
  * Rotate the player's back toward the nearest opponent, pinning the ball between the player's legs and the opponent's feet.
  * Apply friction/tackle resistance modifiers to make it harder to dispossess a shielding player.
* **Files Affected**:
  * [MODIFY] [Player.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Player.ts)
  * [MODIFY] [Opponent.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Opponent.ts)
* **Acceptance Criteria**:
  * The opponent cannot execute standing tackles from behind while the player is in the `shielding` state.
  * Player speed is heavily penalized while shielding (e.g., maximum 30% of normal jogging speed).

### Sprint 2.4: Contextual Target Selection
* **Objective**: Add joystick-guided targeting for passing and shooting instead of kicking blindly in the player's facing direction.
* **Deliverables**:
  * Scan potential pass targets (other players/open spaces) within a cone extending in the direction of the left stick.
  * Highlight the target visually.
  * Apply smart targeting to shots, snapping the kick vector toward the corners of the goal when charging a shot near the penalty box.
* **Files Affected**:
  * [MODIFY] [Player.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Player.ts)
  * [MODIFY] [GameEngine.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/GameEngine.ts)
  * [NEW] `src/engine/TargetFinder.ts`
* **Acceptance Criteria**:
  * Kicking passes with short taps snaps the ball's direction toward a target teammate within a $30^\circ$ cone.
  * Charging a shot near the goal box automatically biases the ball vector to the left or right post based on the stick direction.

---

## Phase 3: Defensive & AI Mechanics

Phase 3 introduces physics-based defensive interactions and advances opponent AI behaviors.

### Sprint 3.1: Standing & Sliding Tackle Windows
* **Objective**: Implement active tackling animations and physics-based dispossession windows.
* **Deliverables**:
  * Add standing tackle lunge that extends the player's possession collection radius forward.
  * Add sliding tackle physics where the player slides as a physical capsule along the pitch floor, blocking paths and sweeping the ball.
  * Enforce cooldowns and inertia penalties on missed tackles.
* **Files Affected**:
  * [MODIFY] [Player.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Player.ts)
  * [MODIFY] [Ball.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Ball.ts)
  * [MODIFY] [Opponent.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Opponent.ts)
* **Acceptance Criteria**:
  * Sliding tackles sweep the ball correctly but lock the player into a 1.5s recovery state.
  * Staged tackles from behind trigger foul checks (in later phases).

### Sprint 3.2: Defending Jockey & Pressing
* **Objective**: Improve opponent AI defensive positioning to intelligently contain the ball carrier.
* **Deliverables**:
  * Upgrade `Opponent.ts` with dynamic jockeying offsets that shadow the ball carrier.
  * Introduce pressure thresholds: AI sprints to press if the player takes a heavy touch (knock_on) or loses momentum.
* **Files Affected**:
  * [MODIFY] [Opponent.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Opponent.ts)
* **Acceptance Criteria**:
  * The opponent AI blocks passing lanes instead of running directly at the player.
  * The opponent AI actively lunges for a tackle only when in range ($<1.2\text{m}$) and the ball is vulnerable.

### Sprint 3.3: Advanced Goalkeeper AI
* **Objective**: Replace simple goal-line strafing with diving, parrying, and goalkeeper rush mechanics.
* **Deliverables**:
  * Add a ball trajectory prediction system inside `Keeper.ts`.
  * Calculate dive interception vectors.
  * Implement "GK Rush" where the keeper charges out to clear loose balls when the player inputs the rush command.
* **Files Affected**:
  * [MODIFY] [Keeper.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/Keeper.ts)
  * [MODIFY] [GameEngine.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/GameEngine.ts)
* **Acceptance Criteria**:
  * Goalkeepers dive horizontally to parry high-speed shots heading for the corners.
  * Pressing the GK Rush button successfully causes the goalie to sprint toward the ball.

### Sprint 3.4: Team Tactics & Policies
* **Objective**: Integrate a lightweight configuration system to govern team-wide positioning.
* **Deliverables**:
  * Create `TacticalPolicy.ts` that coordinates defense/midfield/attack offsets.
  * Implement base support for off-ball positioning guides.
* **Files Affected**:
  * [NEW] `src/engine/TacticalPolicy.ts`
  * [MODIFY] [GameEngine.ts](file:///Volumes/Harry/DEV/F2027/football-2027/src/engine/GameEngine.ts)
* **Acceptance Criteria**:
  * Team lines shift up and down the pitch dynamically depending on the ball's position.

---

## Phase 4: Multiplayer, Scaling & Optimization
* **Sprint 4.1**: Spatial Hashing for Collisions.
* **Sprint 4.2**: 11v11 Simulation & Off-ball runs.
* **Sprint 4.3**: Local Couch Multiplayer mapping.

---

## Phase 5: Career Mode, Scouting & Persistence
* **Sprint 5.1**: Career Mode Zod Schemas for Clubs, Players, and Competitions.
* **Sprint 5.2**: SQLite/IndexedDB database persistence.
* **Sprint 5.3**: Gemini-powered AI Match Scouting and Event Generation.
