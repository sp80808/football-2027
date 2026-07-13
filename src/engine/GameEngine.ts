import { Vec2 } from './Math';
import { InputSystem } from './InputSystem';
import { Player } from './Player';
import { Ball } from './Ball';
import { Keeper } from './Keeper';
import { Opponent } from './Opponent';
import { SimulationConfig } from './SimulationConfig';
import { WorldState, createEmptyWorldState, cloneWorldState, interpolateWorldState } from './WorldState';
import { SeededRandom } from './SeededRandom';
import { RingBuffer } from './RingBuffer';
import { OffsideDetector } from './OffsideDetector';
import { ReplayRecorder } from './ReplayRecorder';
import { MatchManager, MatchSnapshot } from './MatchManager';

export type SimEvent =
  | { type: 'kick'; power: number }
  | { type: 'bounce'; intensity: number }
  | { type: 'goal'; scorer: 'player' | 'opponent' }
  | { type: 'shot'; side: 'player' | 'opponent' }
  | { type: 'offside'; side: 'player' | 'opponent' }
  | { type: 'tackle'; side: 'player' | 'opponent' }
  | { type: 'whistle' };

export class GameEngine {
  input = new InputSystem();
  player = new Player();
  ball = new Ball();
  keeper = new Keeper();
  opponent = new Opponent();
  random = new SeededRandom(12345);
  replayRecorder = new ReplayRecorder(12345);
  matchManager = new MatchManager();

  private readonly dt = SimulationConfig.DT;
  private accumulator = 0;
  private lastTime = 0;
  private previousState: WorldState = createEmptyWorldState();
  private currentState: WorldState = createEmptyWorldState();
  private renderState: WorldState = createEmptyWorldState();

  public tps = 0;
  private ticksThisSecond = 0;
  private lastTpsTime = 0;
  public replayBuffer = new RingBuffer<WorldState>(600);

  public scorePlayer = 0;
  public scoreOpponent = 0;
  public lastGoalScorer: 'player' | 'opponent' | null = null;
  private pendingEvents: SimEvent[] = [];
  private prevMatchPhase = this.matchManager.state.phase;
  private prevHomeScore = 0;
  private prevAwayScore = 0;

  private readonly offsideDetector = new OffsideDetector();
  private readonly ballPlayPos = new Vec2();
  private readonly playerPosAtPlay = new Vec2();
  private awaitingOffsideCheck = false;
  private previousControlState = this.player.controlState;
  public offsideLineY: number | null = null;

  private readonly offsideAttacker = { id: 0, pos: new Vec2(), involvedInPlay: true };
  private readonly offsideDefenderA = { id: 1, pos: new Vec2() };
  private readonly offsideDefenderB = { id: 2, pos: new Vec2() };
  private readonly offsideAttackers = [this.offsideAttacker];
  private readonly offsideDefenders = [this.offsideDefenderA, this.offsideDefenderB];

  get isGoalCelebration(): boolean {
    return this.matchManager.state.phase === 'goal';
  }

  get elapsedSeconds(): number {
    return this.matchManager.state.matchTime;
  }

  getMatchSnapshot(): MatchSnapshot {
    return this.matchManager.state;
  }

  drainEvents(): SimEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  init(options?: { skipKickoff?: boolean }) {
    this.input.init();
    this.matchManager.init();
    this.resetPositions();
    if (options?.skipKickoff) {
      this.matchManager.state.phase = 'playing';
      this.matchManager.state.announcement = null;
      this.matchManager.state.periodCountdown = null;
    } else {
      this.matchManager.beginKickoff();
    }
    this.prevMatchPhase = this.matchManager.state.phase;
    this.prevHomeScore = 0;
    this.prevAwayScore = 0;
    this.scorePlayer = 0;
    this.scoreOpponent = 0;
    this.lastGoalScorer = null;
    this.captureState(this.previousState, 0);
    this.captureState(this.currentState, 0);
    this.renderState = cloneWorldState(this.currentState);
    this.replayBuffer.push(cloneWorldState(this.currentState));
  }

  rematch() {
    this.matchManager.rematch();
    this.resetPositions();
    this.prevMatchPhase = this.matchManager.state.phase;
    this.prevHomeScore = 0;
    this.prevAwayScore = 0;
    this.scorePlayer = 0;
    this.scoreOpponent = 0;
    this.lastGoalScorer = null;
    this.pendingEvents = [];
    this.awaitingOffsideCheck = false;
    this.offsideLineY = null;
    this.captureState(this.previousState, 0);
    this.captureState(this.currentState, 0);
    this.renderState = cloneWorldState(this.currentState);
    this.replayBuffer.clear();
    this.replayBuffer.push(cloneWorldState(this.currentState));
  }

  update(currentTime: number): WorldState {
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
      this.lastTpsTime = currentTime;
      return this.renderState;
    }

    const frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (currentTime - this.lastTpsTime >= 1000) {
      this.tps = this.ticksThisSecond;
      this.ticksThisSecond = 0;
      this.lastTpsTime = currentTime;
    }

    this.accumulator += Math.min(frameTime, 0.25);
    while (this.accumulator >= this.dt) {
      this.previousState = cloneWorldState(this.currentState);
      this.tick();
      this.captureState(this.currentState, this.previousState.tick + 1);
      this.replayBuffer.push(cloneWorldState(this.currentState));
      this.replayRecorder.recordFrame(this.currentState.tick, this.input.currentFrame);
      this.accumulator -= this.dt;
      this.ticksThisSecond++;
    }

    this.renderState = interpolateWorldState(this.previousState, this.currentState, this.accumulator / this.dt);
    return this.renderState;
  }

  getRenderState() {
    return this.renderState;
  }

  private tick() {
    const prevPhase = this.prevMatchPhase;
    const prevHome = this.prevHomeScore;
    const prevAway = this.prevAwayScore;

    this.matchManager.update(this.dt, this.ball, this.player, this.keeper);

    const match = this.matchManager.state;
    this.scorePlayer = match.homeScore;
    this.scoreOpponent = match.awayScore;
    this.lastGoalScorer =
      match.goalScorer === 'home' ? 'player' : match.goalScorer === 'away' ? 'opponent' : null;

    if (match.homeScore > prevHome) {
      this.resetKickoffExtras();
      this.pendingEvents.push({ type: 'goal', scorer: 'player' }, { type: 'whistle' });
    } else if (match.awayScore > prevAway) {
      this.resetKickoffExtras();
      this.pendingEvents.push({ type: 'goal', scorer: 'opponent' }, { type: 'whistle' });
    } else if (prevPhase === 'goal' && match.phase === 'kickoff') {
      this.resetKickoffExtras();
      this.pendingEvents.push({ type: 'whistle' });
    } else if (prevPhase === 'playing' && match.phase === 'halftime') {
      this.pendingEvents.push({ type: 'whistle' });
    } else if (prevPhase === 'playing' && match.phase === 'full_time') {
      this.pendingEvents.push({ type: 'whistle' });
    } else if (prevPhase === 'halftime' && match.phase === 'kickoff') {
      this.pendingEvents.push({ type: 'whistle' });
    }

    this.prevMatchPhase = match.phase;
    this.prevHomeScore = match.homeScore;
    this.prevAwayScore = match.awayScore;

    if (match.phase !== 'playing') return;

    this.input.update();

    const passReleased =
      (this.input.currentFrame.passReleased || this.input.currentFrame.throughPassReleased) &&
      this.player.isCharging &&
      this.player.chargeType === 'pass';
    if (passReleased) {
      this.ballPlayPos.set(this.ball.pos.x, this.ball.pos.y);
      this.playerPosAtPlay.copy(this.player.pos);
      this.awaitingOffsideCheck = true;
    }

    const velBefore = this.ball.vel.mag();
    const zVelBefore = this.ball.vel.z;
    const playerShooting =
      this.input.currentFrame.shootReleased &&
      this.player.isCharging &&
      this.player.chargeType === 'shoot';

    this.player.update(this.dt, this.input.currentFrame, this.ball, this.opponent);
    this.keeper.update(this.dt, this.ball, this.input.currentFrame.keeperRushHeld);
    this.opponent.update(this.dt, this.ball, this.player);
    if (this.player.tackleWonThisTick) {
      this.pendingEvents.push({ type: 'tackle', side: 'player' });
    }
    this.ball.update(this.dt);

    this.updateOffsideLine();
    this.checkOffsideOnReceive();

    if (this.ball.pos.z === 0 && zVelBefore < -0.5) {
      this.pendingEvents.push({ type: 'bounce', intensity: Math.min(1, Math.abs(zVelBefore) / 8) });
    }
    const velAfter = this.ball.vel.mag();
    if (velAfter - velBefore > 6) {
      const power = Math.min(1, (velAfter - velBefore) / 20);
      this.pendingEvents.push({ type: 'kick', power });
      if (power > 0.45) {
        if (this.opponent.aiState === 'shooting') {
          this.pendingEvents.push({ type: 'shot', side: 'opponent' });
        } else if (playerShooting) {
          this.pendingEvents.push({ type: 'shot', side: 'player' });
        }
      }
    }

    this.previousControlState = this.player.controlState;
    this.enforceBoundaries();
  }

  private updateOffsideLine() {
    this.offsideDefenderA.pos.copy(this.opponent.pos);
    this.offsideDefenderB.pos.copy(this.keeper.pos);
    this.offsideLineY = this.offsideDetector.getOffsideLine(
      this.offsideAttackers,
      this.offsideDefenders,
      1,
    );
  }

  private checkOffsideOnReceive() {
    if (!this.awaitingOffsideCheck) return;

    const curr = this.player.controlState;
    const prev = this.previousControlState;
    const regainedControl =
      (curr === 'under_control' || curr === 'shielding') &&
      (prev === 'free' || prev === 'loose_nearby' || prev === 'receiving' || prev === 'stretching');

    if (!regainedControl) return;

    this.offsideAttacker.pos.copy(this.playerPosAtPlay);
    this.offsideDefenderA.pos.copy(this.opponent.pos);
    this.offsideDefenderB.pos.copy(this.keeper.pos);

    const result = this.offsideDetector.checkOffside(
      this.ballPlayPos,
      this.offsideAttackers,
      this.offsideDefenders,
      1,
    );

    this.awaitingOffsideCheck = false;

    if (!result?.isOffside) return;

    this.ball.pos.x = this.ballPlayPos.x;
    this.ball.pos.y = this.ballPlayPos.y;
    this.ball.pos.z = 0;
    this.ball.vel.set(0, 0, 0);
    this.player.controlState = 'free';
    this.pendingEvents.push({ type: 'offside', side: 'player' }, { type: 'whistle' });
  }

  private resetKickoffExtras() {
    this.player.controlState = 'free';
    this.player.isCharging = false;
    this.player.chargeStart = 0;
    this.player.resetDefensive();
    this.awaitingOffsideCheck = false;
    this.previousControlState = 'free';
    this.opponent.reset();
  }

  private resetPositions() {
    this.player.pos.set(0, -5);
    this.player.vel.set(0, 0);
    this.player.facing.set(0, 1);
    this.player.controlState = 'free';
    this.player.isCharging = false;
    this.player.chargeStart = 0;
    this.player.resetDefensive();
    this.awaitingOffsideCheck = false;
    this.previousControlState = 'free';

    this.ball.pos.set(0, 0, 0);
    this.ball.vel.set(0, 0, 0);

    this.keeper.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH - 0.5);
    this.keeper.facing.set(0, -1);
    this.keeper.aiState = 'positioning';
    this.opponent.reset();
  }

  private captureState(state: WorldState, tick: number) {
    state.tick = tick;
    state.player.pos.copy(this.player.pos);
    state.player.vel.copy(this.player.vel);
    state.player.facing.copy(this.player.facing);
    state.player.controlState = this.player.controlState;
    state.player.isCharging = this.player.isCharging;
    state.player.chargeStart = this.player.chargeStart;
    state.player.chargeType = this.player.chargeType;
    state.player.passModifier = this.player.activePassModifier;
    state.player.shotModifier = this.player.activeShotModifier;

    state.ball.pos.copy(this.ball.pos);
    state.ball.vel.copy(this.ball.vel);

    state.keeper.pos.copy(this.keeper.pos);
    state.keeper.facing.copy(this.keeper.facing);
    state.keeper.aiState = this.keeper.aiState;

    state.opponent.pos.copy(this.opponent.pos);
    state.opponent.vel.copy(this.opponent.vel);
    state.opponent.facing.copy(this.opponent.facing);
    state.opponent.aiState = this.opponent.aiState;

    state.scorePlayer = this.scorePlayer;
    state.scoreOpponent = this.scoreOpponent;
    state.lastGoalScorer = this.lastGoalScorer;
    state.offsideLineY = this.offsideLineY;
  }

  private enforceBoundaries() {
    const cfg = SimulationConfig;
    const inGoalMouth = Math.abs(this.ball.pos.x) <= cfg.GOAL_HALF_WIDTH && this.ball.pos.z <= cfg.GOAL_HEIGHT;

    if (this.ball.pos.x > cfg.PITCH_HALF_WIDTH) {
      this.ball.pos.x = cfg.PITCH_HALF_WIDTH;
      this.ball.vel.x *= -0.55;
    } else if (this.ball.pos.x < -cfg.PITCH_HALF_WIDTH) {
      this.ball.pos.x = -cfg.PITCH_HALF_WIDTH;
      this.ball.vel.x *= -0.55;
    }

    if (!inGoalMouth) {
      if (this.ball.pos.y > cfg.PITCH_HALF_LENGTH) {
        this.ball.pos.y = cfg.PITCH_HALF_LENGTH;
        this.ball.vel.y *= -0.55;
      } else if (this.ball.pos.y < -cfg.PITCH_HALF_LENGTH) {
        this.ball.pos.y = -cfg.PITCH_HALF_LENGTH;
        this.ball.vel.y *= -0.55;
      }
    }

    this.player.pos.x = Math.max(-cfg.PITCH_HALF_WIDTH, Math.min(cfg.PITCH_HALF_WIDTH, this.player.pos.x));
    this.player.pos.y = Math.max(-cfg.PITCH_HALF_LENGTH, Math.min(cfg.PITCH_HALF_LENGTH, this.player.pos.y));
  }
}
