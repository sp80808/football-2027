import { Vec2 } from './Math';
import { Ball } from './Ball';
import { Player } from './Player';
import { SimulationConfig } from './SimulationConfig';
import { BehaviourTree, State } from 'mistreevous';

/**
 * Tactical AI System
 * Role-based AI with tactical awareness, team coordination, and decision trees
 */

// ============================================
// Types & Enums
// ============================================

export type PlayerRole =
  | 'GK'
  | 'CB'    // Centre Back
  | 'LB' | 'RB'  // Full Backs
  | 'CDM'   // Defensive Midfielder
  | 'CM'    // Central Midfielder
  | 'CAM'   // Attacking Midfielder
  | 'LW' | 'RW'  // Wingers
  | 'CF' | 'ST';  // Strikers

export type Formation = '4-4-2' | '4-3-3' | '3-5-2' | '4-2-3-1' | '5-3-2' | '4-5-1';

export type TacticalPhase = 'defending' | 'transition_def_to_att' | 'attacking' | 'transition_att_to_def' | 'set_piece';

export type TeamInstruction =
  | 'possession'       // Keep ball, short passes
  | 'counter_attack'   // Direct, quick forward
  | 'high_press'       // Aggressive pressing
  | 'low_block'        // Deep defensive
  | 'wing_play'        // Wide attacks
  | 'through_balls';   // Behind defence

export interface TacticalProfile {
  formation: Formation;
  teamInstruction: TeamInstruction;
  defensiveLine: 'high' | 'normal' | 'deep';
  pressingIntensity: 'low' | 'medium' | 'high';
  width: 'narrow' | 'normal' | 'wide';
  tempo: 'slow' | 'normal' | 'fast';
  crossingFrequency: 'low' | 'normal' | 'high';
  shootingFrequency: 'low' | 'normal' | 'high';
}

export interface PlayerAttributes {
  // Technical
  passing: number;      // 1-20
  shooting: number;
  dribbling: number;
  firstTouch: number;
  crossing: number;
  tackling: number;
  heading: number;

  // Physical
  pace: number;
  acceleration: number;
  stamina: number;
  strength: number;
  agility: number;
  jumping: number;

  // Mental
  vision: number;
  positioning: number;
  decisions: number;
  teamwork: number;
  workRate: number;
  flair: number;
  composure: number;
  anticipation: number;
  concentration: number;

  // Role suitability (1-20 per role)
  roleSuitability: Record<PlayerRole, number>;
}

// ============================================
// Base AI Controller
// ============================================

export interface AIContext {
  ball: Ball;
  teammates: Player[];
  opponents: Player[];
  self: Player;
  phase: TacticalPhase;
  teamInstruction: TeamInstruction;
  tacticalProfile: TacticalProfile;
  timeRemaining: number;
  scoreDiff: number; // positive = winning
}

export type AIAction =
  | { type: 'move'; target: Vec2; urgency: number }
  | { type: 'intercept'; target: Vec2 }
  | { type: 'pass'; targetPlayer: number; power: number }
  | { type: 'shoot'; target: Vec2; power: number }
  | { type: 'dribble'; direction: Vec2 }
  | { type: 'tackle'; target: Vec2 }
  | { type: 'mark'; targetPlayer: number; distance: number }
  | { type: 'cover'; position: Vec2 }
  | { type: 'support'; targetPlayer: number }
  | { type: 'wait' };

export abstract class BaseAIController {
  protected attributes: PlayerAttributes;
  protected role: PlayerRole;

  constructor(attributes: PlayerAttributes, role: PlayerRole) {
    this.attributes = attributes;
    this.role = role;
  }

  abstract decide(context: AIContext): AIAction;

  // Utility methods
  protected distanceTo(a: Vec2, b: Vec2): number {
    return a.distanceTo(b);
  }

  protected angleBetween(a: Vec2, b: Vec2): number {
    return Math.atan2(b.y - a.y, b.x - a.x);
  }

  protected normalize(v: Vec2): Vec2 {
    const m = v.mag();
    return m > 0 ? v.mul(1 / m) : new Vec2(0, 0);
  }

  protected clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }
}

// ============================================
// Role-Specific Controllers
// ============================================

/**
 * Goalkeeper AI - Sweeper keeper with advanced positioning
 */
export class GoalkeeperAI extends BaseAIController {
  private diveTimer = 0;
  private recoveryTimer = 0;
  private state: 'positioning' | 'diving' | 'recovering' | 'distributing' = 'positioning';
  private savedShotDirection: Vec2 | null = null;

  constructor(attributes: PlayerAttributes) {
    super(attributes, 'GK');
  }

  decide(context: AIContext): AIAction {
    const ball = context.ball;
    const self = context.self;

    switch (this.state) {
      case 'diving':
        this.diveTimer -= context.self.dt || 1/120;
        if (this.diveTimer <= 0) {
          this.state = 'recovering';
          this.recoveryTimer = 1.5;
        }
        return { type: 'move', target: self.pos.clone().add(this.savedShotDirection?.mul(0.1) ?? new Vec2(0, 0)), urgency: 1 };

      case 'recovering':
        this.recoveryTimer -= context.self.dt || 1/120;
        if (this.recoveryTimer <= 0) this.state = 'positioning';
        // Fall through to positioning

      case 'positioning':
        return this.decidePositioning(context);

      case 'distributing':
        // Simple distribution logic
        const target = this.findDistributionTarget(context);
        if (target) {
          this.state = 'positioning';
          return { type: 'pass', targetPlayer: target, power: 0.8 };
        }
        this.state = 'positioning';
        return { type: 'wait' };
    }
  }

  private decidePositioning(context: AIContext): AIAction {
    const cfg = SimulationConfig;
    const ball = context.ball;
    const self = context.self;

    // Predict ball position
    const lookahead = cfg.KEEPER_LOOKAHEAD_TIME;
    const predictedX = ball.pos.x + ball.vel.x * lookahead;
    const goalLineY = context.tacticalProfile.defensiveLine === 'high'
      ? cfg.PITCH_HALF_LENGTH - 8
      : cfg.PITCH_HALF_LENGTH - 0.5;

    // Target X position
    let targetX = this.clamp(predictedX, -cfg.GOAL_HALF_WIDTH, cfg.GOAL_HALF_WIDTH);

    // Adjust for team instruction
    if (context.teamInstruction === 'high_press') {
      targetX = ball.pos.x * 0.5; // More aggressive
    }

    // Sweeper keeper behavior
    const ballDistance = self.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    if (ballDistance > 30 && ball.pos.z < 1) {
      // Come out for through balls
      targetX = ball.pos.x;
    }

    const targetY = goalLineY;

    // Check for dive trigger
    const ballSpeed = Math.hypot(ball.vel.x, ball.vel.y);
    const distToBall = self.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const approaching = ball.vel.y > 2; // Coming towards goal

    if (
      approaching &&
      ballSpeed >= cfg.KEEPER_DIVE_MIN_BALL_SPEED &&
      distToBall <= cfg.KEEPER_DIVE_TRIGGER_RADIUS &&
      ball.pos.z < cfg.GOAL_HEIGHT
    ) {
      this.triggerDive(ball);
    }

    // Close-range reaction save
    if (distToBall < cfg.KEEPER_SAVE_RADIUS && ball.pos.z < cfg.GOAL_HEIGHT) {
      this.deflectBall(context);
    }

    return { type: 'move', target: new Vec2(targetX, targetY), urgency: 0.7 };
  }

  private triggerDive(ball: Ball) {
    this.state = 'diving';
    this.diveTimer = 0.5;
    const predictedX = ball.pos.x + ball.vel.x * 0.25;
    const dir = Math.sign(predictedX - this.pos.x) || Math.sign(ball.vel.x) || 1;
    this.savedShotDirection = new Vec2(dir, 0);
  }

  private deflectBall(context: AIContext) {
    const ball = context.ball;
    ball.vel.y = -Math.abs(ball.vel.y) * 0.4;
    ball.vel.x *= -0.3;
    ball.vel.z *= 0.5;
  }

  private findDistributionTarget(context: AIContext): number | null {
    // Find open teammate
    for (let i = 0; i < context.teammates.length; i++) {
      const tm = context.teammates[i];
      const dist = tm.pos.distanceTo(new Vec2(context.ball.pos.x, context.ball.pos.y));
      if (dist < 30 && this.isPassingLaneOpen(context, i)) return i;
    }
    return null;
  }

  private isPassingLaneOpen(context: AIContext, targetIndex: number): boolean {
    const from = new Vec2(context.self.pos.x, context.self.pos.y);
    const to = context.teammates[targetIndex].pos;
    const dir = to.clone().sub(from).normalize();
    const dist = from.distanceTo(to);

    for (const opp of context.opponents) {
      const oppPos = new Vec2(opp.pos.x, opp.pos.y);
      const toOpp = oppPos.clone().sub(from);
      const proj = toOpp.dot(dir);
      if (proj > 0 && proj < dist) {
        const perp = toOpp.clone().sub(dir.mul(proj));
        if (perp.mag() < 2) return false;
      }
    }
    return true;
  }
}

/**
 * Defender AI - Marking, covering, intercepting
 */
export class DefenderAI extends BaseAIController {
  private markedOpponent: number | null = null;
  private tackleCooldown = 0;

  constructor(attributes: PlayerAttributes, role: PlayerRole) {
    super(attributes, role);
  }

  decide(context: AIContext): AIAction {
    const self = context.self;
    const ball = context.ball;

    // Update tackle cooldown
    if (this.tackleCooldown > 0) this.tackleCooldown -= context.self.dt || 1/120;

    // Assign marking target if needed
    if (this.markedOpponent === null || !this.isValidMark(context, this.markedOpponent)) {
      this.assignMarkingTarget(context);
    }

    // Check for interception opportunity
    const intercept = this.checkInterception(context);
    if (intercept) return intercept;

    // Check for tackle opportunity
    const tackle = this.checkTackle(context);
    if (tackle) return tackle;

    // Decide positioning based on phase
    switch (context.phase) {
      case 'defending':
        return this.defensivePositioning(context);
      case 'transition_def_to_att':
        return this.transitionPositioning(context);
      case 'attacking':
        return this.attackingSupport(context);
      default:
        return this.defaultPositioning(context);
    }
  }

  private isValidMark(context: AIContext, opponentIndex: number): boolean {
    if (opponentIndex >= context.opponents.length) return false;
    const opp = context.opponents[opponentIndex];
    const dist = context.self.pos.distanceTo(opp.pos);
    return dist < 25; // Within reasonable marking distance
  }

  private assignMarkingTarget(context: AIContext) {
    // Find closest unmarked opponent in our zone
    let bestTarget: number | null = null;
    let bestDist = Infinity;

    for (let i = 0; i < context.opponents.length; i++) {
      const opp = context.opponents[i];
      const dist = context.self.pos.distanceTo(opp.pos);

      // Check if already marked by teammate
      const alreadyMarked = context.teammates.some(t =>
        t.aiState === 'marking' && (t as any).markedOpponent === i
      );

      if (!alreadyMarked && dist < bestDist && dist < 30) {
        bestDist = dist;
        bestTarget = i;
      }
    }

    this.markedOpponent = bestTarget;
  }

  private checkInterception(context: AIContext): AIAction | null {
    const ball = context.ball;
    const self = context.self;

    // Predict ball trajectory
    const predictionTime = 1.5;
    const futureBallPos = new Vec2(
      ball.pos.x + ball.vel.x * predictionTime,
      ball.pos.y + ball.vel.y * predictionTime
    );

    const distToIntercept = self.pos.distanceTo(futureBallPos);
    const timeToIntercept = distToIntercept / (self.attributes.pace / 20 * 8);

    if (timeToIntercept < predictionTime && ball.vel.mag() > 5) {
      return { type: 'intercept', target: futureBallPos };
    }
    return null;
  }

  private checkTackle(context: AIContext): AIAction | null {
    if (this.tackleCooldown > 0) return null;

    for (const opp of context.opponents) {
      const dist = context.self.pos.distanceTo(opp.pos);
      if (dist < 1.5 && opp.controlState === 'under_control') {
        // Check if good tackle opportunity
        if (context.self.attributes.tackling > 12 && Math.random() < 0.3) {
          this.tackleCooldown = 1.5;
          return { type: 'tackle', target: opp.pos };
        }
      }
    }
    return null;
  }

  private defensivePositioning(context: AIContext): AIAction {
    const ball = context.ball;
    const self = context.self;
    const opp = this.markedOpponent !== null ? context.opponents[this.markedOpponent] : null;

    if (opp) {
      // Marking: stay between ball and opponent
      const toOpp = opp.pos.clone().sub(self.pos);
      const toBall = ball.pos.clone().sub(self.pos);

      // Position slightly ball-side
      const targetPos = opp.pos.clone().sub(toBall.normalize().mul(2));

      return { type: 'mark', targetPlayer: this.markedOpponent!, distance: 2 };
    }

    // Default: cover space between ball and goal
    const goalY = SimulationConfig.PITCH_HALF_LENGTH * (context.tacticalProfile.defensiveLine === 'high' ? 0.8 : 1);
    const targetX = ball.pos.x * 0.5;
    const targetY = goalY + (ball.pos.y - goalY) * 0.3;

    return { type: 'cover', position: new Vec2(targetX, targetY) };
  }

  private transitionPositioning(context: AIContext): AIAction {
    // Quick forward runs when winning ball
    return { type: 'move', target: new Vec2(context.self.pos.x, context.self.pos.y + 10 * (context.tacticalProfile.defensiveLine === 'high' ? 1 : 0.5)), urgency: 0.8 };
  }

  private attackingSupport(context: AIContext): AIAction {
    // Overlap/underlap for fullbacks
    if (this.role === 'LB' || this.role === 'RB') {
      const ball = context.ball;
      const wingSide = this.role === 'LB' ? -1 : 1;
      if (ball.pos.x * wingSide > 10) {
        return { type: 'support', targetPlayer: this.findWinger(context) };
      }
    }
    return { type: 'cover', position: context.self.pos.clone().add(new Vec2(0, 5)) };
  }

  private defaultPositioning(context: AIContext): AIAction {
    return { type: 'cover', position: new Vec2(0, context.self.pos.y) };
  }

  private findWinger(context: AIContext): number {
    for (let i = 0; i < context.teammates.length; i++) {
      if (context.teammates[i].role === 'LW' || context.teammates[i].role === 'RW') return i;
    }
    return 0;
  }
}

/**
 * Midfielder AI - Playmaking, box-to-box, defensive cover
 */
export class MidfielderAI extends BaseAIController {
  decide(context: AIContext): AIAction {
    const self = context.self;
    const ball = context.ball;

    // Ball possession logic
    if (self.controlState === 'under_control' || self.controlState === 'loose_nearby') {
      return this.onBall(context);
    }

    // Off-ball movement
    return this.offBall(context);
  }

  private onBall(context: AIContext): AIAction {
    const self = context.self;
    const ball = context.ball;

    // Look for passing options
    const passTarget = this.findBestPass(context);
    if (passTarget !== null) {
      const target = context.teammates[passTarget];
      const dist = context.self.pos.distanceTo(target.pos);
      return { type: 'pass', targetPlayer: passTarget, power: this.clamp(dist / 30, 0.3, 1) };
    }

    // Shoot if in range
    if (this.shouldShoot(context)) {
      const goalY = SimulationConfig.PITCH_HALF_LENGTH;
      return { type: 'shoot', target: new Vec2(0, goalY), power: 0.8 };
    }

    // Dribble forward
    return { type: 'dribble', direction: new Vec2(0, 1) };
  }

  private findBestPass(context: AIContext): number | null {
    let bestTarget: number | null = null;
    let bestScore = -Infinity;

    for (let i = 0; i < context.teammates.length; i++) {
      const target = context.teammates[i];
      const dist = context.self.pos.distanceTo(target.pos);

      if (dist > 40) continue; // Too far

      // Score based on position, space, and role
      let score = 100 - dist * 2;

      // Bonus for forward passes
      if (target.pos.y > context.self.pos.y) score += 20;

      // Bonus for unmarked
      if (this.isUnmarked(context, i)) score += 30;

      // Role bonus
      if (target.role === 'CF' || target.role === 'ST') score += 15;
      if (target.role === 'CAM') score += 10;

      if (score > bestScore && this.isPassingLaneOpen(context, i)) {
        bestScore = score;
        bestTarget = i;
      }
    }
    return bestTarget;
  }

  private isUnmarked(context: AIContext, targetIndex: number): boolean {
    const target = context.teammates[targetIndex];
    for (const opp of context.opponents) {
      if (target.pos.distanceTo(opp.pos) < 5) return false;
    }
    return true;
  }

  private isPassingLaneOpen(context: AIContext, targetIndex: number): boolean {
    // Simplified - check if any opponent is in the passing lane
    const from = context.self.pos;
    const to = context.teammates[targetIndex].pos;
    const dir = to.clone().sub(from).normalize();
    const dist = from.distanceTo(to);

    for (const opp of context.opponents) {
      const oppPos = opp.pos;
      const toOpp = oppPos.clone().sub(from);
      const proj = toOpp.dot(dir);
      if (proj > 0 && proj < dist) {
        const perp = toOpp.clone().sub(dir.mul(proj));
        if (perp.mag() < 3) return false;
      }
    }
    return true;
  }

  private shouldShoot(context: AIContext): boolean {
    const self = context.self;
    const ball = context.ball;
    const goalY = SimulationConfig.PITCH_HALF_LENGTH;
    const distToGoal = Math.abs(goalY - ball.pos.y);

    return (
      distToGoal < 25 &&
      self.attributes.shooting > 12 &&
      Math.random() < 0.15
    );
  }

  private offBall(context: AIContext): AIAction {
    // Find space between lines
    const self = context.self;
    const ball = context.ball;

    // Move to receive
    if (self.controlState === 'free' && ball.pos.distanceTo(self.pos) < 30) {
      // Find pocket of space
      const space = this.findSpace(context);
      if (space) return { type: 'move', target: space, urgency: 0.6 };
    }

    // Support ball carrier
    if (context.teammates.some(t => t.controlState === 'under_control')) {
      const carrier = context.teammates.find(t => t.controlState === 'under_control')!;
      const supportPos = carrier.pos.clone().add(new Vec2(
        (Math.random() - 0.5) * 10,
        5
      ));
      return { type: 'support', targetPlayer: context.teammates.indexOf(carrier) };
    }

    // Default: hold position relative to ball
    return {
      type: 'cover',
      position: new Vec2(
        ball.pos.x * 0.3 + self.pos.x * 0.7,
        ball.pos.y * 0.3 + self.pos.y * 0.7
      )
    };
  }

  private findSpace(context: AIContext): Vec2 | null {
    const self = context.self;
    const step = 5;
    let bestPos: Vec2 | null = null;
    let bestScore = -1;

    for (let x = -5; x <= 5; x += step) {
      for (let y = -5; y <= 5; y += step) {
        const testPos = self.pos.clone().add(new Vec2(x, y));
        let score = 100;

        // Penalize distance from ideal position
        score -= testPos.distanceTo(self.pos) * 2;

        // Reward space from opponents
        for (const opp of context.opponents) {
          score += testPos.distanceTo(opp.pos) * 3;
        }

        // Reward forward position
        if (testPos.y > self.pos.y) score += 10;

        if (score > bestScore) {
          bestScore = score;
          bestPos = testPos;
        }
      }
    }

    return bestPos;
  }
}

/**
 * Attacker AI - Movement, finishing, link-up play
 */
export class AttackerAI extends BaseAIController {
  private runTimer = 0;
  private targetRunPosition: Vec2 | null = null;

  decide(context: AIContext): AIAction {
    const self = context.self;

    if (self.controlState === 'under_control' || self.controlState === 'loose_nearby') {
      return this.onBall(context);
    }

    return this.offBall(context);
  }

  private onBall(context: AIContext): AIAction {
    const self = context.self;

    // Shoot if in good position
    if (this.shouldShoot(context)) {
      return { type: 'shoot', target: new Vec2(0, SimulationConfig.PITCH_HALF_LENGTH), power: 0.9 };
    }

    // Pass to better positioned teammate
    const pass = this.findPass(context);
    if (pass !== null) {
      return { type: 'pass', targetPlayer: pass, power: 0.7 };
    }

    // Dribble/draw defenders
    return { type: 'dribble', direction: new Vec2(0, 1) };
  }

  private shouldShoot(context: AIContext): boolean {
    const ball = context.ball;
    const goalY = SimulationConfig.PITCH_HALF_LENGTH;
    const distToGoal = Math.abs(goalY - ball.pos.y);
    const angle = Math.abs(ball.pos.x) / distToGoal;

    return (
      distToGoal < 25 &&
      angle < 0.5 &&
      context.self.attributes.shooting > 13 &&
      Math.random() < 0.2
    );
  }

  private findPass(context: AIContext): number | null {
    // Look for through balls
    for (let i = 0; i < context.teammates.length; i++) {
      const tm = context.teammates[i];
      if (tm.role === 'CF' || tm.role === 'ST' || tm.role === 'CAM') {
        if (this.isThroughBallOn(context, i)) return i;
      }
    }
    return null;
  }

  private isThroughBallOn(context: AIContext, targetIndex: number): boolean {
    const target = context.teammates[targetIndex];
    const self = context.self;
    const ball = context.ball;

    // Target must be ahead
    if (target.pos.y <= self.pos.y) return false;

    // Check defensive line
    const lastDefenderY = Math.min(...context.opponents.map(o => o.pos.y));
    if (target.pos.y > lastDefenderY - 2) return false; // Offside risk

    // Check passing lane
    return this.isPassingLaneOpen(context, targetIndex);
  }

  private offBall(context: AIContext): AIAction {
    const self = context.self;
    const ball = context.ball;

    // Make runs
    if (this.runTimer <= 0 && this.shouldMakeRun(context)) {
      this.targetRunPosition = this.calculateRunTarget(context);
      this.runTimer = 3 + Math.random() * 5;
      return { type: 'move', target: this.targetRunPosition!, urgency: 0.9 };
    }

    this.runTimer -= context.self.dt || 1/120;

    // Continue run
    if (this.targetRunPosition) {
      const dist = self.pos.distanceTo(this.targetRunPosition);
      if (dist < 2) {
        this.targetRunPosition = null;
      } else {
        return { type: 'move', target: this.targetRunPosition, urgency: 0.8 };
      }
    }

    // Drop deep to link play
    if (ball.pos.y < self.pos.y - 15 && Math.random() < 0.05) {
      return { type: 'move', target: new Vec2(self.pos.x, ball.pos.y + 10), urgency: 0.5 };
    }

    // Default: hold position between defenders
    return { type: 'cover', position: new Vec2(self.pos.x, self.pos.y) };
  }

  private shouldMakeRun(context: AIContext): boolean {
    const self = context.self;
    const ball = context.ball;

    // Ball carrier looking up
    const carrier = context.teammates.find(t => t.controlState === 'under_control');
    if (!carrier) return false;

    // Space behind defense
    const lastDefenderY = Math.min(...context.opponents.map(o => o.pos.y));
    const space = lastDefenderY - self.pos.y;

    return space > 10 && carrier.pos.y > self.pos.y - 10 && Math.random() < 0.1;
  }

  private calculateRunTarget(context: AIContext): Vec2 {
    const self = context.self;
    const lastDefenderY = Math.min(...context.opponents.map(o => o.pos.y));
    const goalY = SimulationConfig.PITCH_HALF_LENGTH;

    return new Vec2(
      self.pos.x + (Math.random() - 0.5) * 10,
      lastDefenderY - 3 - Math.random() * 5
    );
  }

  private isPassingLaneOpen(context: AIContext, targetIndex: number): boolean {
    const from = context.self.pos;
    const to = context.teammates[targetIndex].pos;
    const dir = to.clone().sub(from).normalize();
    const dist = from.distanceTo(to);

    for (const opp of context.opponents) {
      const toOpp = opp.pos.clone().sub(from);
      const proj = toOpp.dot(dir);
      if (proj > 0 && proj < dist) {
        const perp = toOpp.clone().sub(dir.mul(proj));
        if (perp.mag() < 3) return false;
      }
    }
    return true;
  }
}

/**
 * Wingers AI - Width, crossing, cutting inside
 */
export class WingerAI extends BaseAIController {
  private side: 'left' | 'right';

  constructor(attributes: PlayerAttributes, role: PlayerRole) {
    super(attributes, role);
    this.side = role === 'LW' ? 'left' : 'right';
  }

  decide(context: AIContext): AIAction {
    const self = context.self;
    const ball = context.ball;

    if (self.controlState === 'under_control') {
      return this.onBall(context);
    }

    return this.offBall(context);
  }

  private onBall(context: AIContext): AIAction {
    const self = context.self;
    const ball = context.ball;
    const wingSide = this.side === 'left' ? -1 : 1;

    // Cross if in final third
    if (ball.pos.x * wingSide > 20 && ball.pos.y > 20) {
      const target = this.findCrossTarget(context);
      if (target !== null) {
        return { type: 'pass', targetPlayer: target, power: 0.8 };
      }
    }

    // Cut inside
    if (ball.pos.x * wingSide > 15 && Math.random() < 0.1) {
      return { type: 'dribble', direction: new Vec2(-wingSide * 0.5, 0.5).normalize() };
    }

    // Drive to byline
    return { type: 'dribble', direction: new Vec2(wingSide * 0.3, 0.7).normalize() };
  }

  private findCrossTarget(context: AIContext): number | null {
    for (let i = 0; i < context.teammates.length; i++) {
      const tm = context.teammates[i];
      if (tm.role === 'CF' || tm.role === 'ST' || tm.role === 'CAM') {
        const dist = tm.pos.distanceTo(context.self.pos);
        if (dist < 30 && tm.pos.y > context.self.pos.y) return i;
      }
    }
    return null;
  }

  private offBall(context: AIContext): AIAction {
    const self = context.self;
    const ball = context.ball;
    const wingSide = this.side === 'left' ? -1 : 1;

    // Stay wide
    const targetX = wingSide * (SimulationConfig.PITCH_HALF_WIDTH - 5);
    const targetY = Math.max(ball.pos.y - 10, -SimulationConfig.PITCH_HALF_LENGTH + 10);

    // Pinch in when ball on opposite side
    if (ball.pos.x * wingSide < 0) {
      return { type: 'move', target: new Vec2(wingSide * 15, ball.pos.y - 5), urgency: 0.6 };
    }

    return { type: 'move', target: new Vec2(targetX, targetY), urgency: 0.5 };
  }
}

// ============================================
// Factory
// ============================================

export function createAIController(role: PlayerRole | 'BT', attributes: PlayerAttributes): BaseAIController {
  switch (role) {
    case 'GK': return new GoalkeeperAI(attributes);
    case 'CB': case 'LB': case 'RB': return new DefenderAI(attributes, role);
    case 'CDM': case 'CM': case 'CAM': return new MidfielderAI(attributes);
    case 'LW': case 'RW': return new WingerAI(attributes, role);
    case 'CF': case 'ST': return new AttackerAI(attributes);
    case 'BT': return new BehaviourTreeAIController(attributes, 'CM');
    default: return new MidfielderAI(attributes);
  }
}

// Default attribute profiles per role
export const ROLE_ATTRIBUTE_TEMPLATES: Record<PlayerRole, Partial<PlayerAttributes>> = {
  GK: {
    passing: 12, shooting: 2, dribbling: 3, firstTouch: 10, crossing: 5, tackling: 3, heading: 8,
    pace: 10, acceleration: 12, stamina: 15, strength: 15, agility: 12, jumping: 18,
    vision: 14, positioning: 18, decisions: 16, teamwork: 12, workRate: 8, flair: 5, composure: 18, anticipation: 16, concentration: 18,
    roleSuitability: { GK: 20, CB: 2, LB: 1, RB: 1, CDM: 2, CM: 1, CAM: 1, LW: 1, RW: 1, CF: 1, ST: 1 }
  },
  CB: {
    passing: 13, shooting: 5, dribbling: 8, firstTouch: 12, crossing: 6, tackling: 18, heading: 18,
    pace: 10, acceleration: 8, stamina: 15, strength: 18, agility: 10, jumping: 18,
    vision: 12, positioning: 18, decisions: 15, teamwork: 14, workRate: 12, flair: 5, composure: 14, anticipation: 16, concentration: 18,
    roleSuitability: { GK: 1, CB: 20, LB: 12, RB: 12, CDM: 10, CM: 6, CAM: 2, LW: 1, RW: 1, CF: 2, ST: 1 }
  },
  LB: {
    passing: 14, shooting: 7, dribbling: 12, firstTouch: 13, crossing: 16, tackling: 14, heading: 8,
    pace: 16, acceleration: 14, stamina: 18, strength: 12, agility: 14, jumping: 10,
    vision: 13, positioning: 14, decisions: 13, teamwork: 15, workRate: 18, flair: 8, composure: 12, anticipation: 13, concentration: 14,
    roleSuitability: { GK: 1, CB: 12, LB: 20, RB: 2, CDM: 8, CM: 10, CAM: 4, LW: 8, RW: 2, CF: 3, ST: 2 }
  },
  RB: {
    passing: 14, shooting: 7, dribbling: 12, firstTouch: 13, crossing: 16, tackling: 14, heading: 8,
    pace: 16, acceleration: 14, stamina: 18, strength: 12, agility: 14, jumping: 10,
    vision: 13, positioning: 14, decisions: 13, teamwork: 15, workRate: 18, flair: 8, composure: 12, anticipation: 13, concentration: 14,
    roleSuitability: { GK: 1, CB: 12, LB: 2, RB: 20, CDM: 8, CM: 10, CAM: 4, LW: 2, RW: 8, CF: 3, ST: 2 }
  },
  CDM: {
    passing: 16, shooting: 8, dribbling: 11, firstTouch: 14, crossing: 8, tackling: 17, heading: 10,
    pace: 12, acceleration: 10, stamina: 18, strength: 15, agility: 12, jumping: 12,
    vision: 16, positioning: 16, decisions: 17, teamwork: 16, workRate: 18, flair: 6, composure: 16, anticipation: 17, concentration: 16,
    roleSuitability: { GK: 1, CB: 10, LB: 8, RB: 8, CDM: 20, CM: 15, CAM: 8, LW: 2, RW: 2, CF: 3, ST: 2 }
  },
  CM: {
    passing: 18, shooting: 11, dribbling: 14, firstTouch: 16, crossing: 11, tackling: 12, heading: 8,
    pace: 13, acceleration: 12, stamina: 18, strength: 12, agility: 14, jumping: 10,
    vision: 18, positioning: 14, decisions: 16, teamwork: 16, workRate: 16, flair: 10, composure: 15, anticipation: 14, concentration: 14,
    roleSuitability: { GK: 1, CB: 4, LB: 6, RB: 6, CDM: 14, CM: 20, CAM: 14, LW: 6, RW: 6, CF: 8, ST: 5 }
  },
  CAM: {
    passing: 19, shooting: 16, dribbling: 17, firstTouch: 18, crossing: 14, tackling: 5, heading: 6,
    pace: 13, acceleration: 14, stamina: 14, strength: 8, agility: 16, jumping: 8,
    vision: 20, positioning: 16, decisions: 18, teamwork: 15, workRate: 12, flair: 18, composure: 16, anticipation: 17, concentration: 13,
    roleSuitability: { GK: 1, CB: 2, LB: 3, RB: 3, CDM: 4, CM: 14, CAM: 20, LW: 10, RW: 10, CF: 14, ST: 10 }
  },
  LW: {
    passing: 14, shooting: 15, dribbling: 18, firstTouch: 15, crossing: 18, tackling: 6, heading: 6,
    pace: 18, acceleration: 17, stamina: 15, strength: 8, agility: 17, jumping: 8,
    vision: 14, positioning: 12, decisions: 13, teamwork: 13, workRate: 14, flair: 18, composure: 13, anticipation: 13, concentration: 12,
    roleSuitability: { GK: 1, CB: 2, LB: 8, RB: 2, CDM: 2, CM: 6, CAM: 10, LW: 20, RW: 2, CF: 10, ST: 8 }
  },
  RW: {
    passing: 14, shooting: 15, dribbling: 18, firstTouch: 15, crossing: 18, tackling: 6, heading: 6,
    pace: 18, acceleration: 17, stamina: 15, strength: 8, agility: 17, jumping: 8,
    vision: 14, positioning: 12, decisions: 13, teamwork: 13, workRate: 14, flair: 18, composure: 13, anticipation: 13, concentration: 12,
    roleSuitability: { GK: 1, CB: 2, LB: 2, RB: 8, CDM: 2, CM: 6, CAM: 10, LW: 2, RW: 20, CF: 10, ST: 8 }
  },
  CF: {
    passing: 16, shooting: 18, dribbling: 16, firstTouch: 17, crossing: 10, tackling: 4, heading: 14,
    pace: 14, acceleration: 14, stamina: 14, strength: 14, agility: 13, jumping: 14,
    vision: 16, positioning: 18, decisions: 16, teamwork: 14, workRate: 12, flair: 14, composure: 16, anticipation: 17, concentration: 14,
    roleSuitability: { GK: 1, CB: 2, LB: 2, RB: 2, CDM: 3, CM: 8, CAM: 14, LW: 10, RW: 10, CF: 20, ST: 16 }
  },
  ST: {
    passing: 12, shooting: 20, dribbling: 14, firstTouch: 15, crossing: 6, tackling: 3, heading: 16,
    pace: 16, acceleration: 16, stamina: 13, strength: 16, agility: 12, jumping: 15,
    vision: 12, positioning: 20, decisions: 15, teamwork: 11, workRate: 10, flair: 12, composure: 17, anticipation: 18, concentration: 13,
    roleSuitability: { GK: 1, CB: 1, LB: 1, RB: 1, CDM: 2, CM: 4, CAM: 8, LW: 8, RW: 8, CF: 16, ST: 20 }
  }
  }
};

// ============================================
// Behaviour Tree AI Controller (Mistreevous)
// ============================================

export type BTAction =
  | 'shoot'
  | 'dribble'
  | 'press'
  | 'tackle'
  | 'jockey'
  | 'track'
  | 'wait';

export interface BTAgent {
  hasPossession: boolean;
  ballIsLoose: boolean;
  playerHasBall: boolean;
  canShoot: boolean;
  canTackle: boolean;
  selectedAction: BTAction;
  cfg: typeof SimulationConfig;
}

export class BehaviourTreeAIController extends BaseAIController {
  private tree: BehaviourTree;
  private agent: BTAgent;
  private static treeInitialized = false;

  constructor(attributes: PlayerAttributes, role: PlayerRole) {
    super(attributes, role);

    this.agent = {
      hasPossession: false,
      ballIsLoose: false,
      playerHasBall: false,
      canShoot: false,
      canTackle: false,
      selectedAction: 'track',
      cfg: SimulationConfig,
    };

    this.registerAgentMethods();
    this.tree = new BehaviourTree(BehaviourTreeAIController.treeDefinition(), this.agent, {});
  }

  private static treeDefinition() {
    return {
      type: 'root',
      child: {
        type: 'selector',
        children: [
          {
            type: 'sequence',
            children: [
              { type: 'condition', call: 'checkHasPossession' },
              {
                type: 'selector',
                children: [
                  {
                    type: 'sequence',
                    children: [
                      { type: 'condition', call: 'checkCanShoot' },
                      { type: 'action', call: 'doShoot' },
                    ],
                  },
                  { type: 'action', call: 'doDribble' },
                ],
              },
            ],
          },
          {
            type: 'sequence',
            children: [
              { type: 'condition', call: 'checkBallLoose' },
              { type: 'action', call: 'doPress' },
            ],
          },
          {
            type: 'sequence',
            children: [
              { type: 'condition', call: 'checkPlayerHasBall' },
              {
                type: 'selector',
                children: [
                  {
                    type: 'sequence',
                    children: [
                      { type: 'condition', call: 'checkCanTackle' },
                      { type: 'action', call: 'doTackle' },
                    ],
                  },
                  { type: 'action', call: 'doJockey' },
                ],
              },
            ],
          },
          { type: 'action', call: 'doTrack' },
        ],
      },
    };
  }

  private registerAgentMethods() {
    const methods: Record<string, (agent: BTAgent) => boolean | State> = {
      checkHasPossession: () => this.agent.hasPossession,
      checkBallLoose: () => this.agent.ballIsLoose,
      checkPlayerHasBall: () => this.agent.playerHasBall,
      checkCanShoot: () => this.agent.canShoot,
      checkCanTackle: () => this.agent.canTackle,
      doShoot: () => { this.agent.selectedAction = 'shoot'; return State.SUCCEEDED; },
      doDribble: () => { this.agent.selectedAction = 'dribble'; return State.SUCCEEDED; },
      doPress: () => { this.agent.selectedAction = 'press'; return State.SUCCEEDED; },
      doTackle: () => { this.agent.selectedAction = 'tackle'; return State.SUCCEEDED; },
      doJockey: () => { this.agent.selectedAction = 'jockey'; return State.SUCCEEDED; },
      doTrack: () => { this.agent.selectedAction = 'track'; return State.SUCCEEDED; },
    };

    for (const [name, fn] of Object.entries(methods)) {
      BehaviourTree.register(name, fn);
    }
  }

  decide(context: AIContext): AIAction {
    const cfg = context.cfg || SimulationConfig;
    const self = context.self;
    const ball = context.ball;
    const distToBall = self.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y));
    const distToPlayer = self.pos.distanceTo(context.opponents[0]?.pos ?? self.pos);

    this.agent.hasPossession = distToBall < cfg.PLAYER_CONTROL_RADIUS && ball.pos.z < 1.0;
    this.agent.ballIsLoose = !this.agent.hasPossession && ball.groundSpeed() > 0.5;
    this.agent.playerHasBall = context.opponents.some(
      (opp) => opp.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y)) < cfg.PLAYER_CONTROL_RADIUS && ball.pos.z < 1.0
    );
    this.agent.canShoot = distToBall < 25 && this.agent.hasPossession;
    this.agent.canTackle = distToBall < 1.4 && this.agent.playerHasBall;

    this.tree.step();

    switch (this.agent.selectedAction) {
      case 'shoot': {
        const goalY = -cfg.PITCH_HALF_LENGTH;
        const dir = new Vec2(0 - self.pos.x, goalY - self.pos.y).normalize();
        return { type: 'shoot', target: new Vec2(0, goalY), power: 0.7 };
      }
      case 'dribble': {
        const goalY = -cfg.PITCH_HALF_LENGTH;
        const dir = new Vec2(0 - self.pos.x, goalY - self.pos.y).normalize();
        return { type: 'dribble', direction: dir };
      }
      case 'press':
        return { type: 'move', target: new Vec2(ball.pos.x, ball.pos.y), urgency: 0.9 };
      case 'tackle':
        return { type: 'tackle', target: new Vec2(ball.pos.x, ball.pos.y) };
      case 'jockey': {
        const carrier = context.opponents.find(
          (opp) => opp.pos.distanceTo(new Vec2(ball.pos.x, ball.pos.y)) < cfg.PLAYER_CONTROL_RADIUS
        );
        const target = carrier ? carrier.pos.clone() : new Vec2(ball.pos.x, ball.pos.y);
        return { type: 'move', target, urgency: 0.8 };
      }
      case 'track': {
        const targetX = Math.max(-cfg.PITCH_HALF_WIDTH + 3, Math.min(cfg.PITCH_HALF_WIDTH - 3, ball.pos.x));
        return { type: 'move', target: new Vec2(targetX, -15), urgency: 0.5 };
      }
      default:
        return { type: 'wait' };
    }
  }
}
