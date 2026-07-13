import { InputSystem } from './InputSystem';
import { Player } from './Player';
import { Ball } from './Ball';
import { Keeper } from './Keeper';
import { Opponent } from './Opponent';
import { SimulationConfig } from './SimulationConfig';
import { WorldState, createEmptyWorldState, cloneWorldState, interpolateWorldState } from './WorldState';
import { SeededRandom } from './SeededRandom';
import { RingBuffer } from './RingBuffer';

export type SimEvent =
  | { type: 'kick'; power: number }
  | { type: 'bounce'; intensity: number }
  | { type: 'goal' }
  | { type: 'whistle' };

export class GameEngine {
  input = new InputSystem();
  player = new Player();
  ball = new Ball();
  keeper = new Keeper();
  opponent = new Opponent();
  random = new SeededRandom(12345);

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
  private goalPauseTicks = -1;
  private readonly goalPauseDurationTicks = SimulationConfig.SIMULATION_HZ * 3;
  private pendingEvents: SimEvent[] = [];
  private matchElapsed = 0;

  private matchElapsed = 0;

  get isGoalCelebration(): boolean {
    return this.goalPauseTicks > 0;
  }

  get elapsedSeconds(): number {
    return this.matchElapsed;
  }

  drainEvents(): SimEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  init() {
    this.input.init();
    this.resetPositions();
    this.captureState(this.previousState, 0);
    this.captureState(this.currentState, 0);
    this.renderState = cloneWorldState(this.currentState);
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
    if (this.goalPauseTicks > 0) {
      this.goalPauseTicks--;
      if (this.goalPauseTicks === 0) {
        this.goalPauseTicks = -1;
        this.lastGoalScorer = null;
        this.resetPositions();
        this.pendingEvents.push({ type: 'whistle' });
      }
      return;
    }

    this.matchElapsed += this.dt;
    this.input.update();
    const velBefore = this.ball.vel.mag();
    const zVelBefore = this.ball.vel.z;

    this.player.update(this.dt, this.input.currentFrame, this.ball);
    this.keeper.update(this.dt, this.ball);
    this.opponent.update(this.dt, this.ball, this.player);
    this.ball.update(this.dt);

    if (this.ball.pos.z === 0 && zVelBefore < -0.5) {
      this.pendingEvents.push({ type: 'bounce', intensity: Math.min(1, Math.abs(zVelBefore) / 8) });
    }
    const velAfter = this.ball.vel.mag();
    if (velAfter - velBefore > 6) {
      this.pendingEvents.push({ type: 'kick', power: Math.min(1, (velAfter - velBefore) / 20) });
    }

    this.checkGoals();
    this.enforceBoundaries();
  }

  private checkGoals() {
    const cfg = SimulationConfig;
    const insideGoal = Math.abs(this.ball.pos.x) <= cfg.GOAL_HALF_WIDTH && this.ball.pos.z <= cfg.GOAL_HEIGHT;
    if (!insideGoal) return;

    if (this.ball.pos.y >= cfg.PITCH_HALF_LENGTH) {
      this.scorePlayer++;
      this.lastGoalScorer = 'player';
      this.goalPauseTicks = this.goalPauseDurationTicks;
      this.pendingEvents.push({ type: 'goal' }, { type: 'whistle' });
    } else if (this.ball.pos.y <= -cfg.PITCH_HALF_LENGTH) {
      this.scoreOpponent++;
      this.lastGoalScorer = 'opponent';
      this.goalPauseTicks = this.goalPauseDurationTicks;
      this.pendingEvents.push({ type: 'goal' }, { type: 'whistle' });
    }
  }

  private resetPositions() {
    this.player.pos.set(0, -5);
    this.player.vel.set(0, 0);
    this.player.facing.set(0, 1);
    this.player.controlState = 'free';
    this.player.isCharging = false;
    this.player.chargeStart = 0;

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
