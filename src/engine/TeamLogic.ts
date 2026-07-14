import { Vec2 } from './Math';
import { Footballer } from './Footballer';
import { Ball } from './Ball';
import { ControllerFrame } from './Intent';
import { SimulationConfig } from './SimulationConfig';

export class TeamLogic {
  team: 'home' | 'away';
  
  // Positional anchors for a 4-2-3-1 / 4-3-3 shape
  // Y-coordinates are relative to the team's defending half. 
  // Home attacks +Y, Away attacks -Y.
  private static POSITIONS = [
    { x: -18, y: 15 }, // LB
    { x: -8, y: 12 }, // LCB
    { x: 8, y: 12 },  // RCB
    { x: 18, y: 15 },  // RB
    { x: -12, y: 25 }, // LDM
    { x: 12, y: 25 },  // RDM
    { x: -22, y: 35 }, // LW
    { x: 0, y: 32 },   // CAM
    { x: 22, y: 35 },  // RW
    { x: 0, y: 45 },   // ST
  ];

  private tackleCooldowns: number[] = Array(10).fill(0);
  private passCooldowns: number[] = Array(10).fill(0);
  private opponents: Footballer[] | null = null;

  constructor(team: 'home' | 'away') {
    this.team = team;
  }

  update(
    dt: number,
    footballers: Footballer[],
    frames: ControllerFrame[],
    ball: Ball,
    activeId: number | null,
    opponents?: Footballer[],
    teammatePressHeld = false,
  ) {
    const cfg = SimulationConfig;
    this.opponents = opponents ?? null;

    // Determine if team has possession
    let teamHasPossession = false;
    for (let i = 0; i < 10; i++) {
      if (footballers[i].controlState === 'under_control') {
        teamHasPossession = true;
        break;
      }
    }

    const ballPos = new Vec2(ball.pos.x, ball.pos.y);

    // FC26 secondary press: while defending with the modifier held, designate the
    // nearest AI teammate (excluding the human's active player) to aggressively
    // press the ball carrier. This frees the human to mark space or intercept.
    let presserId = -1;
    if (teammatePressHeld && !teamHasPossession && activeId !== null) {
      let nearestDist = Infinity;
      for (let i = 0; i < 10; i++) {
        if (i === activeId) continue;
        const d = footballers[i].pos.distanceTo(ballPos);
        if (d < nearestDist) {
          nearestDist = d;
          presserId = i;
        }
      }
    }

    for (let i = 0; i < 10; i++) {
      const f = footballers[i];
      const frame = frames[i];

      // Reset frame
      frame.leftStick.set(0, 0);
      frame.sprint = 0;
      frame.shield = 0;
      frame.passPressed = false;
      frame.passHeld = false;
      frame.passReleased = false;
      frame.shootPressed = false;
      frame.shootHeld = false;
      frame.shootReleased = false;
      frame.tacklePressed = false;
      frame.slidePressed = false;

      // Skip AI logic for the human-controlled player
      if (activeId === i) continue;

      if (this.tackleCooldowns[i] > 0) this.tackleCooldowns[i] -= dt;
      if (this.passCooldowns[i] > 0) this.passCooldowns[i] -= dt;

      const distToBall = f.pos.distanceTo(ballPos);

      // AI Behaviour
      if (f.controlState === 'under_control') {
        this.attackWithBall(i, f, frame, footballers, ball);
      } else if (!teamHasPossession) {
        this.defend(i, f, frame, ball, ballPos, distToBall, i === presserId);
      } else {
        this.supportAttack(i, f, frame);
      }
    }
  }

  /**
   * Attacking on-ball logic: shoot near goal, pass under pressure or to a
   * better-positioned teammate, otherwise dribble forward.
   */
  private attackWithBall(
    i: number,
    f: Footballer,
    frame: ControllerFrame,
    teammates: Footballer[],
    ball: Ball,
  ) {
    const cfg = SimulationConfig;
    const goalY = this.team === 'home' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
    const distToGoal = Math.hypot(0 - f.pos.x, goalY - f.pos.y);
    const towardGoal = new Vec2(0 - f.pos.x, goalY - f.pos.y).normalize();

    // 1. Shoot if in range
    if (distToGoal < 26 && this.passCooldowns[i] <= 0) {
      frame.shootHeld = true;
      frame.shootReleased = f.chargeStart > cfg.MAX_CHARGE_TIME * 0.5;
      frame.leftStick.copy(towardGoal);
      this.passCooldowns[i] = 1.0;
      return;
    }

    // 2. Evaluate a forward pass — triggered by pressure or a teammate in space.
    const pressure = this.nearestOpponentDist(f.pos);
    const passOption = this.bestPassTarget(i, f, teammates);

    const wantsPass =
      this.passCooldowns[i] <= 0 &&
      passOption &&
      (pressure < 4.0 || // under pressure → pass
        (passOption.gainForward > 12 && passOption.openness > 5)); // teammate well-placed

    if (wantsPass) {
      // Aim at the teammate; engine's TargetFinder resolves the actual target pos.
      const dirToMate = new Vec2(passOption.pos.x - f.pos.x, passOption.pos.y - f.pos.y);
      if (dirToMate.magSq() > 0.01) dirToMate.normalize();
      frame.leftStick.copy(dirToMate);
      // Charge the pass briefly, then release.
      if (!f.isCharging || f.chargeType !== 'pass') {
        frame.passHeld = true;
      } else if (f.chargeStart > cfg.MAX_CHARGE_TIME * 0.25) {
        frame.passReleased = true;
        this.passCooldowns[i] = 0.8;
      }
      return;
    }

    // 3. Dribble toward goal
    frame.leftStick.copy(towardGoal);
    if (distToGoal > 35) frame.sprint = 1;
  }

  /** Pick the best teammate to pass to: forward progress + openness, no opponents in the lane. */
  private bestPassTarget(
    passerIdx: number,
    passer: Footballer,
    teammates: Footballer[],
  ): { pos: Vec2; gainForward: number; openness: number } | null {
    const cfg = SimulationConfig;
    const goalY = this.team === 'home' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
    const passerToGoal = goalY - passer.pos.y; // positive = distance to goal in attack dir

    let best: { pos: Vec2; gainForward: number; openness: number } | null = null;
    let bestScore = -Infinity;

    for (let j = 0; j < teammates.length; j++) {
      if (j === passerIdx) continue;
      const mate = teammates[j];
      const toMate = new Vec2(mate.pos.x - passer.pos.x, mate.pos.y - passer.pos.y);
      const dist = toMate.mag();
      if (dist < 4 || dist > 50) continue;

      // Forward gain: how much closer to goal the teammate is (in attack direction).
      const mateToGoal = goalY - mate.pos.y;
      const gainForward = passerToGoal - mateToGoal; // positive = mate is more advanced

      // Only pass forward or sideways (don't pass backward unless very pressured — handled by caller).
      if (gainForward < -8) continue;

      // Openness: distance from nearest opponent to the teammate.
      const openness = this.nearestOpponentDist(mate.pos);

      // Is the passing lane blocked? Skip if an opponent is very close to the lane midpoint.
      const midPoint = new Vec2((passer.pos.x + mate.pos.x) / 2, (passer.pos.y + mate.pos.y) / 2);
      const laneBlocked = this.nearestOpponentDist(midPoint) < 2.5;
      if (laneBlocked) continue;

      const score = gainForward * 1.0 + openness * 0.5 - dist * 0.1;
      if (score > bestScore) {
        bestScore = score;
        best = { pos: new Vec2(mate.pos.x, mate.pos.y), gainForward, openness };
      }
    }
    return best;
  }

  private nearestOpponentDist(pos: Vec2): number {
    if (!this.opponents) return Infinity;
    let min = Infinity;
    for (const o of this.opponents) {
      const d = Math.hypot(o.pos.x - pos.x, o.pos.y - pos.y);
      if (d < min) min = d;
    }
    return min;
  }

  private defend(
    i: number,
    f: Footballer,
    frame: ControllerFrame,
    ball: Ball,
    ballPos: Vec2,
    distToBall: number,
    isPresser = false,
  ) {
    const cfg = SimulationConfig;
    // The designated FC26 secondary presser chases the ball aggressively from
    // any distance and attempts tackles earlier than normal defensive AI.
    const pressRange = isPresser ? 40 : 15;
    if (distToBall < pressRange) {
      // Press the ball
      frame.leftStick.set(ball.pos.x - f.pos.x, ball.pos.y - f.pos.y).normalize();
      if (distToBall > 3) frame.sprint = 1;

      const tackleThreshold = isPresser ? 2.0 : 1.5;
      if (distToBall < tackleThreshold && this.tackleCooldowns[i] <= 0) {
        frame.tacklePressed = true;
        this.tackleCooldowns[i] = isPresser ? 0.7 : 1.0;
      }
    } else {
      // Track back to positional anchor
      const anchor = TeamLogic.POSITIONS[i];
      const targetX = anchor.x;
      const targetY = this.team === 'home' ? -cfg.PITCH_HALF_LENGTH + anchor.y : cfg.PITCH_HALF_LENGTH - anchor.y;

      const dx = targetX - f.pos.x;
      const dy = targetY - f.pos.y;
      const distToTarget = Math.hypot(dx, dy);

      if (distToTarget > 1.0) {
        frame.leftStick.set(dx, dy).normalize();
        if (distToTarget > 10) frame.sprint = 1;
      }
    }
  }

  private supportAttack(i: number, f: Footballer, frame: ControllerFrame) {
    const cfg = SimulationConfig;
    const anchor = TeamLogic.POSITIONS[i];
    const targetX = anchor.x;
    const targetY = this.team === 'home' ? -cfg.PITCH_HALF_LENGTH + anchor.y + 30 : cfg.PITCH_HALF_LENGTH - anchor.y - 30;

    const dx = targetX - f.pos.x;
    const dy = targetY - f.pos.y;
    const distToTarget = Math.hypot(dx, dy);

    if (distToTarget > 1.0) {
      frame.leftStick.set(dx, dy).normalize();
      if (distToTarget > 15) frame.sprint = 1;
    }
  }
}
