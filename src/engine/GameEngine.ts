import { InputSystem } from './InputSystem';
import { Player } from './Player';
import { Ball } from './Ball';
import { Keeper } from './Keeper';
import { Opponent } from './Opponent';
import { SimulationConfig } from './SimulationConfig';
import { WorldState, createEmptyWorldState, cloneWorldState, interpolateWorldState } from './WorldState';
import { SeededRandom } from './SeededRandom';

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
  
  private prevState: WorldState = createEmptyWorldState();
  private currState: WorldState = createEmptyWorldState();
  private renderState: WorldState = createEmptyWorldState();

  public tps = 0;
  private ticksThisSecond = 0;
  private lastTpsTime = 0;

  // ── Score ──────────────────────────────────────────────────────────────────
  public scorePlayer = 0;
  public scoreOpponent = 0;

  /** Ticks remaining in post-goal pause before reset (-1 = not paused). */
  private goalPauseTicks = -1;
  private readonly GOAL_PAUSE_TICKS = 120 * 3; // 3 s at 120 Hz

  /** Set to 'player' or 'opponent' when a goal was just scored this frame. */
  public lastGoalScorer: 'player' | 'opponent' | null = null;

  init() {
    this.input.init();
    this._resetPositions();
    this.captureState(this.prevState);
    this.captureState(this.currState);
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

    // Prevent spiral of death
    this.accumulator += Math.min(frameTime, 0.25);

    let didTick = false;
    while (this.accumulator >= this.dt) {
      this.prevState = cloneWorldState(this.currState);
      this.tick();
      this.captureState(this.currState);
      this.accumulator -= this.dt;
      this.ticksThisSecond++;
      didTick = true;
    }

    const alpha = this.accumulator / this.dt;
    this.renderState = interpolateWorldState(this.prevState, this.currState, alpha);
    
    return this.renderState;
  }

  getRenderState() {
    return this.renderState;
  }

  private tick() {
    // ── Post-goal pause ────────────────────────────────────────────────────
    if (this.goalPauseTicks > 0) {
      this.goalPauseTicks--;
      if (this.goalPauseTicks === 0) {
        this.goalPauseTicks = -1;
        this.lastGoalScorer = null;
        this._resetPositions();
      }
      return; // freeze simulation during pause
    }

    this.input.update();
    
    this.player.update(this.dt, this.input.currentFrame, this.ball);
    this.keeper.update(this.dt, this.ball);
    this.opponent.update(this.dt, this.ball, this.player);
    this.ball.update(this.dt);
    
    this._checkGoals();
    this.enforceBoundaries();
  }

  /** Detect whether the ball has crossed either goal line within the posts. */
  private _checkGoals() {
    const cfg = SimulationConfig;
    const hw = cfg.GOAL_HALF_WIDTH;
    const gl = cfg.PITCH_HALF_LENGTH;

    // Goal for player: ball crosses +Y goal line (keeper end)
    if (
      this.ball.pos.y >= gl &&
      Math.abs(this.ball.pos.x) <= hw &&
      this.ball.pos.z <= cfg.GOAL_HEIGHT
    ) {
      this.scorePlayer++;
      this.lastGoalScorer = 'player';
      this.goalPauseTicks = this.GOAL_PAUSE_TICKS;
      return;
    }

    // Goal for opponent: ball crosses -Y goal line (player starting end)
    if (
      this.ball.pos.y <= -gl &&
      Math.abs(this.ball.pos.x) <= hw &&
      this.ball.pos.z <= cfg.GOAL_HEIGHT
    ) {
      this.scoreOpponent++;
      this.lastGoalScorer = 'opponent';
      this.goalPauseTicks = this.GOAL_PAUSE_TICKS;
    }
  }

  /** Reset all entities to kick-off positions after a goal. */
  private _resetPositions() {
    this.player.pos.set(0, -5);
    this.player.vel.set(0, 0);
    this.player.facing.set(0, 1);
    this.player.controlState = 'free';
    this.player.isCharging = false;
    this.player.chargeStart = 0;

    this.ball.pos.set(0, 0, 0);
    this.ball.vel.set(0, 0, 0);

    this.keeper.pos.set(0, 52.0);
    this.keeper.facing.set(0, -1);
    this.keeper.aiState = 'positioning';

    this.opponent.reset();
  }

  private captureState(state: WorldState) {
    state.tick++;
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
    state.opponent.facing.copy(this.opponent.facing);
    state.opponent.vel.copy(this.opponent.vel);
    state.opponent.aiState = this.opponent.aiState;

    state.scorePlayer = this.scorePlayer;
    state.scoreOpponent = this.scoreOpponent;
    state.lastGoalScorer = this.lastGoalScorer;
  }

  private enforceBoundaries() {
    const hw = SimulationConfig.PITCH_HALF_WIDTH;
    const hl = SimulationConfig.PITCH_HALF_LENGTH;
    
    if (this.ball.pos.x > hw) {
      this.ball.pos.x = hw;
      this.ball.vel.x *= -0.5;
    } else if (this.ball.pos.x < -hw) {
      this.ball.pos.x = -hw;
      this.ball.vel.x *= -0.5;
    }

    if (this.ball.pos.y > hl) {
      this.ball.pos.y = hl;
      this.ball.vel.y *= -0.5;
    } else if (this.ball.pos.y < -hl) {
      this.ball.pos.y = -hl;
      this.ball.vel.y *= -0.5;
    }
    
    if (this.player.pos.x > hw) this.player.pos.x = hw;
    if (this.player.pos.x < -hw) this.player.pos.x = -hw;
    if (this.player.pos.y > hl) this.player.pos.y = hl;
    if (this.player.pos.y < -hl) this.player.pos.y = -hl;
  }
}
