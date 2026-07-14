import { Vec2 } from './Math';
import { Ball } from './Ball';
import { Footballer } from './Footballer';
import { Keeper } from './Keeper';
import { SimulationConfig } from './SimulationConfig';

export type DeadBallType = 'none' | 'goal_kick' | 'throw_in' | 'corner_kick' | 'free_kick';
export type DeadBallSubPhase = 'setup' | 'ready' | 'execute' | 'resuming';

export interface DeadBallState {
  type: DeadBallType;
  subPhase: DeadBallSubPhase;
  /** Team that takes the restart ('home' attacks +Y, 'away' attacks -Y). */
  takingTeam: 'home' | 'away';
  /** Position where the ball is placed for the restart. */
  ballPlacement: Vec2;
  /** Timer counting down the current sub-phase. */
  timer: number;
  /** Index of the player designated to take the restart (outfield, 0-9). */
  takerIndex: number;
  /** For free kicks: position of the wall centre. */
  wallCenter: Vec2 | null;
}

function createDefaultState(): DeadBallState {
  return {
    type: 'none',
    subPhase: 'setup',
    takingTeam: 'home',
    ballPlacement: new Vec2(0, 0),
    timer: 0,
    takerIndex: 0,
    wallCenter: null,
  };
}

export class DeadBallManager {
  state: DeadBallState = createDefaultState();

  /** True on the tick the dead ball resolves back to play. */
  resumedThisTick = false;

  get isActive(): boolean {
    return this.state.type !== 'none';
  }

  reset() {
    this.state = createDefaultState();
    this.resumedThisTick = false;
  }

  // ─── Triggers ───────────────────────────────────────────────────────

  /**
   * Called when the ball crosses a sideline.
   * @param crossX - the x position where the ball crossed
   * @param crossY - the y position where the ball crossed
   * @param lastTouchTeam - team that last touched the ball
   */
  triggerThrowIn(crossX: number, crossY: number, lastTouchTeam: 'home' | 'away',
    homeTeam: Footballer[], awayTeam: Footballer[]) {
    const cfg = SimulationConfig;
    const takingTeam = lastTouchTeam === 'home' ? 'away' : 'home';

    // Clamp the throw-in position to the sideline
    const sideX = crossX > 0 ? cfg.PITCH_HALF_WIDTH : -cfg.PITCH_HALF_WIDTH;
    const placement = new Vec2(sideX, Math.max(-cfg.PITCH_HALF_LENGTH + 2, Math.min(cfg.PITCH_HALF_LENGTH - 2, crossY)));

    // Pick the nearest player from the taking team to be the thrower
    const squad = takingTeam === 'home' ? homeTeam : awayTeam;
    const takerIndex = this.findNearest(squad, placement);

    this.state = {
      type: 'throw_in',
      subPhase: 'setup',
      takingTeam,
      ballPlacement: placement,
      timer: cfg.THROW_IN_DELAY,
      takerIndex,
      wallCenter: null,
    };
  }

  /**
   * Called when the ball crosses the goal line but not into the goal.
   * @param goalEnd - which goal end: 'home_end' (y < -HALF_LENGTH) or 'away_end' (y > HALF_LENGTH)
   * @param lastTouchTeam - team that last touched the ball
   */
  triggerGoalLineOut(
    goalEnd: 'home_end' | 'away_end',
    ballX: number,
    lastTouchTeam: 'home' | 'away',
    homeTeam: Footballer[], awayTeam: Footballer[],
    homeKeeper: Keeper, awayKeeper: Keeper,
  ) {
    const cfg = SimulationConfig;

    // Determine if it's a goal kick or corner
    const defendingTeam = goalEnd === 'away_end' ? 'away' : 'home';
    const isCorner = lastTouchTeam === defendingTeam;

    if (isCorner) {
      this.triggerCorner(goalEnd, ballX, defendingTeam === 'home' ? 'away' : 'home', homeTeam, awayTeam);
    } else {
      this.triggerGoalKick(goalEnd, defendingTeam, homeTeam, awayTeam, homeKeeper, awayKeeper);
    }
  }

  private triggerGoalKick(
    goalEnd: 'home_end' | 'away_end',
    takingTeam: 'home' | 'away',
    homeTeam: Footballer[], awayTeam: Footballer[],
    homeKeeper: Keeper, _awayKeeper: Keeper,
  ) {
    const cfg = SimulationConfig;
    // Ball placed on the 6-yard box, on the side where it went out
    const goalLineY = goalEnd === 'away_end' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
    const sixYardY = goalEnd === 'away_end'
      ? goalLineY - cfg.SIX_YARD_BOX_DEPTH
      : goalLineY + cfg.SIX_YARD_BOX_DEPTH;

    const placement = new Vec2(0, sixYardY);

    this.state = {
      type: 'goal_kick',
      subPhase: 'setup',
      takingTeam,
      ballPlacement: placement,
      timer: cfg.GOAL_KICK_DELAY,
      takerIndex: 0, // keeper takes it (handled specially)
      wallCenter: null,
    };
  }

  private triggerCorner(
    goalEnd: 'home_end' | 'away_end',
    ballX: number,
    takingTeam: 'home' | 'away',
    homeTeam: Footballer[], awayTeam: Footballer[],
  ) {
    const cfg = SimulationConfig;
    const cornerX = ballX > 0 ? cfg.PITCH_HALF_WIDTH - cfg.CORNER_ARC_OFFSET : -cfg.PITCH_HALF_WIDTH + cfg.CORNER_ARC_OFFSET;
    const cornerY = goalEnd === 'away_end'
      ? cfg.PITCH_HALF_LENGTH - cfg.CORNER_ARC_OFFSET
      : -cfg.PITCH_HALF_LENGTH + cfg.CORNER_ARC_OFFSET;
    const placement = new Vec2(cornerX, cornerY);

    const squad = takingTeam === 'home' ? homeTeam : awayTeam;
    const takerIndex = this.findNearestToCorner(squad, placement);

    this.state = {
      type: 'corner_kick',
      subPhase: 'setup',
      takingTeam,
      ballPlacement: placement,
      timer: cfg.CORNER_KICK_DELAY,
      takerIndex,
      wallCenter: null,
    };
  }

  triggerFreeKick(
    foulPos: Vec2,
    takingTeam: 'home' | 'away',
    homeTeam: Footballer[], awayTeam: Footballer[],
  ) {
    const cfg = SimulationConfig;
    const placement = foulPos.clone();

    const squad = takingTeam === 'home' ? homeTeam : awayTeam;
    const takerIndex = this.findNearest(squad, placement);

    // Wall placed between foul and goal
    const goalY = takingTeam === 'home' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
    const toGoalDir = new Vec2(0 - placement.x, goalY - placement.y);
    if (toGoalDir.magSq() > 0.01) toGoalDir.normalize();
    const wallCenter = placement.clone().add(toGoalDir.clone().mul(cfg.FREE_KICK_WALL_DIST));

    this.state = {
      type: 'free_kick',
      subPhase: 'setup',
      takingTeam,
      ballPlacement: placement,
      timer: cfg.FREE_KICK_DELAY,
      takerIndex,
      wallCenter,
    };
  }

  // ─── Update ─────────────────────────────────────────────────────────

  update(
    dt: number,
    ball: Ball,
    homeTeam: Footballer[], awayTeam: Footballer[],
    homeKeeper: Keeper, awayKeeper: Keeper,
    executePressed: boolean,
    aimDir: Vec2,
  ): void {
    this.resumedThisTick = false;
    if (!this.isActive) return;

    const s = this.state;

    if (s.subPhase === 'setup') {
      this.positionForRestart(ball, homeTeam, awayTeam, homeKeeper, awayKeeper);
      s.subPhase = 'ready';
      return;
    }

    if (s.subPhase === 'ready') {
      s.timer -= dt;
      // Keep the ball and taker in place during the delay
      ball.pos.set(s.ballPlacement.x, s.ballPlacement.y, 0);
      ball.vel.set(0, 0, 0);
      this.holdTakerAtBall(homeTeam, awayTeam);

      if (s.timer <= 0) {
        // Auto-execute for AI, wait for input for human
        if (this.isTakerHuman(s, homeTeam)) {
          if (executePressed) {
            this.executeRestart(ball, aimDir, homeTeam, awayTeam, homeKeeper, awayKeeper);
          }
        } else {
          this.executeRestart(ball, this.getAIAimDir(s, homeTeam, awayTeam), homeTeam, awayTeam, homeKeeper, awayKeeper);
        }
      }
      return;
    }

    if (s.subPhase === 'execute' || s.subPhase === 'resuming') {
      // Brief transition back to normal play
      s.timer -= dt;
      if (s.timer <= 0) {
        this.resumedThisTick = true;
        this.reset();
      }
    }
  }

  // ─── Positioning ────────────────────────────────────────────────────

  private positionForRestart(
    ball: Ball,
    homeTeam: Footballer[], awayTeam: Footballer[],
    homeKeeper: Keeper, awayKeeper: Keeper,
  ) {
    const cfg = SimulationConfig;
    const s = this.state;
    const bp = s.ballPlacement;

    // Place the ball
    ball.pos.set(bp.x, bp.y, 0);
    ball.vel.set(0, 0, 0);
    ball.spin.set(0, 0, 0);

    const takers = s.takingTeam === 'home' ? homeTeam : awayTeam;
    const opponents = s.takingTeam === 'home' ? awayTeam : homeTeam;

    if (s.type === 'throw_in') {
      // Move the taker to the sideline
      const taker = takers[s.takerIndex];
      taker.pos.set(bp.x, bp.y);
      taker.vel.set(0, 0);
      taker.controlState = 'free';
      // Face inward
      taker.facing.set(bp.x > 0 ? -1 : 1, 0);
    } else if (s.type === 'goal_kick') {
      // Keeper takes the goal kick; position keeper at the ball
      const keeper = s.takingTeam === 'home' ? homeKeeper : awayKeeper;
      keeper.pos.set(bp.x, bp.y);
      keeper.resetState();
      // Push opponents out of the box
      const boxEdge = s.takingTeam === 'home'
        ? -cfg.PITCH_HALF_LENGTH + cfg.KEEPER_BOX_DEPTH
        : cfg.PITCH_HALF_LENGTH - cfg.KEEPER_BOX_DEPTH;
      for (const opp of opponents) {
        if (s.takingTeam === 'home' && opp.pos.y < boxEdge) {
          opp.pos.y = boxEdge + 2;
        } else if (s.takingTeam === 'away' && opp.pos.y > boxEdge) {
          opp.pos.y = boxEdge - 2;
        }
      }
    } else if (s.type === 'corner_kick') {
      // Taker at corner flag
      const taker = takers[s.takerIndex];
      taker.pos.set(bp.x, bp.y);
      taker.vel.set(0, 0);
      taker.controlState = 'free';
      // Move attacking players toward the box
      const goalY = s.takingTeam === 'home' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
      const sign = s.takingTeam === 'home' ? 1 : -1;
      for (let i = 0; i < 10; i++) {
        if (i === s.takerIndex) continue;
        const p = takers[i];
        // Forwards and midfielders move into the box area
        if (i >= 4) {
          const spreadX = -15 + (i - 4) * 5;
          p.pos.set(spreadX, goalY - sign * (8 + (i - 4) * 2));
          p.vel.set(0, 0);
        }
      }
    } else if (s.type === 'free_kick') {
      // Taker at the ball
      const taker = takers[s.takerIndex];
      taker.pos.set(bp.x - 0.5, bp.y);
      taker.vel.set(0, 0);
      taker.controlState = 'free';
      // Position a defensive wall
      if (s.wallCenter) {
        const wallDir = new Vec2(s.wallCenter.x - bp.x, s.wallCenter.y - bp.y);
        if (wallDir.magSq() > 0.01) wallDir.normalize();
        const perp = new Vec2(-wallDir.y, wallDir.x);
        // Place 3 opponents in the wall
        let wallCount = 0;
        for (let i = 0; i < 10 && wallCount < 3; i++) {
          const opp = opponents[i];
          const offset = (wallCount - 1) * 0.8;
          opp.pos.set(
            s.wallCenter.x + perp.x * offset,
            s.wallCenter.y + perp.y * offset,
          );
          opp.vel.set(0, 0);
          opp.facing.set(-wallDir.x, -wallDir.y);
          wallCount++;
        }
      }
    }
  }

  private holdTakerAtBall(homeTeam: Footballer[], awayTeam: Footballer[]) {
    const s = this.state;
    if (s.type === 'goal_kick') return; // keeper handles goal kicks
    const takers = s.takingTeam === 'home' ? homeTeam : awayTeam;
    const taker = takers[s.takerIndex];
    taker.vel.set(0, 0);
  }

  // ─── Execution ──────────────────────────────────────────────────────

  private executeRestart(
    ball: Ball,
    aimDir: Vec2,
    homeTeam: Footballer[], awayTeam: Footballer[],
    homeKeeper: Keeper, awayKeeper: Keeper,
  ) {
    const cfg = SimulationConfig;
    const s = this.state;
    const dir = aimDir.magSq() > 0.01 ? aimDir.clone().normalize() : new Vec2(0, s.takingTeam === 'home' ? 1 : -1);

    if (s.type === 'throw_in') {
      // Flat, limited-power throw
      const power = cfg.THROW_IN_MAX_POWER;
      ball.vel.set(dir.x * power, dir.y * power, 0);
      ball.spin.set(0, 0, 0);
    } else if (s.type === 'goal_kick') {
      // Long kick upfield
      const power = cfg.KEEPER_PUNT_POWER;
      ball.vel.set(dir.x * power * 0.3, dir.y * power, cfg.KEEPER_PUNT_LIFT * 0.7);
    } else if (s.type === 'corner_kick') {
      // Inswinging cross toward the box
      const crossPower = cfg.PASS_POWER_BASE * 1.4;
      const goalY = s.takingTeam === 'home' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
      const sign = s.takingTeam === 'home' ? 1 : -1;
      // Default aim: near post area
      const targetX = s.ballPlacement.x > 0 ? -2 : 2;
      const targetY = goalY - sign * 10;
      const toTarget = new Vec2(targetX - ball.pos.x, targetY - ball.pos.y);
      if (toTarget.magSq() > 0.01) toTarget.normalize();
      ball.vel.set(toTarget.x * crossPower, toTarget.y * crossPower, 6.0);
      // Add curl
      const curlDir = s.ballPlacement.x > 0 ? 1 : -1;
      ball.spin.set(-toTarget.y * 12 * curlDir, toTarget.x * 12 * curlDir, 0);
    } else if (s.type === 'free_kick') {
      // Shot or pass depending on distance to goal
      const goalY = s.takingTeam === 'home' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
      const distToGoal = Math.abs(goalY - s.ballPlacement.y);
      if (distToGoal < 30) {
        // Shoot
        const shotPower = cfg.SHOT_POWER_BASE * 0.9;
        ball.vel.set(dir.x * shotPower, dir.y * shotPower, 2.5);
      } else {
        // Pass
        const passPower = cfg.PASS_POWER_BASE * 1.1;
        ball.vel.set(dir.x * passPower, dir.y * passPower, 1.0);
      }
    }

    s.subPhase = 'resuming';
    s.timer = 0.3; // brief transition
  }

  private isTakerHuman(s: DeadBallState, homeTeam: Footballer[]): boolean {
    // Only the home team can be human-controlled, and only if the taking team is home
    return s.takingTeam === 'home';
  }

  private getAIAimDir(s: DeadBallState, homeTeam: Footballer[], awayTeam: Footballer[]): Vec2 {
    const cfg = SimulationConfig;
    const takers = s.takingTeam === 'home' ? homeTeam : awayTeam;
    const goalDir = s.takingTeam === 'home' ? 1 : -1;

    if (s.type === 'throw_in' || s.type === 'goal_kick') {
      // Find nearest open teammate
      let bestDist = Infinity;
      let bestDir = new Vec2(0, goalDir);
      for (let i = 0; i < 10; i++) {
        if (i === s.takerIndex) continue;
        const mate = takers[i];
        const dx = mate.pos.x - s.ballPlacement.x;
        const dy = mate.pos.y - s.ballPlacement.y;
        const dist = Math.hypot(dx, dy);
        if (dist > 5 && dist < 40 && dist < bestDist) {
          bestDist = dist;
          bestDir = new Vec2(dx, dy);
        }
      }
      if (bestDir.magSq() > 0.01) bestDir.normalize();
      return bestDir;
    }

    // Default: aim toward goal
    return new Vec2(0, goalDir);
  }

  // ─── Helpers ────────────────────────────────────────────────────────

  private findNearest(squad: Footballer[], target: Vec2): number {
    let bestIdx = 0;
    let bestDist = Infinity;
    for (let i = 0; i < squad.length; i++) {
      const d = squad[i].pos.distanceTo(target);
      if (d < bestDist) {
        bestDist = d;
        bestIdx = i;
      }
    }
    return bestIdx;
  }

  private findNearestToCorner(squad: Footballer[], corner: Vec2): number {
    // Prefer wingers (indices 6, 8) for corners, otherwise nearest
    let bestIdx = 0;
    let bestDist = Infinity;
    const preferredIndices = [6, 8, 7]; // LW, RW, CAM
    for (const i of preferredIndices) {
      if (i < squad.length) {
        const d = squad[i].pos.distanceTo(corner);
        if (d < bestDist) {
          bestDist = d;
          bestIdx = i;
        }
      }
    }
    return bestIdx;
  }
}
