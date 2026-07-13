import { InputSystem } from './InputSystem';
import { Player } from './Player';
import { Ball } from './Ball';
import { Keeper } from './Keeper';
import { SimulationConfig } from './SimulationConfig';
import { WorldState, createEmptyWorldState, cloneWorldState, interpolateWorldState } from './WorldState';
import { SeededRandom } from './SeededRandom';

export class GameEngine {
  input = new InputSystem();
  player = new Player();
  ball = new Ball();
  keeper = new Keeper();
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

  init() {
    this.input.init();
    
    this.player.pos.set(0, -5);
    this.player.vel.set(0, 0);
    this.player.facing.set(0, 1);
    
    this.ball.pos.set(0, 0, 0);
    this.ball.vel.set(0, 0, 0);
    
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
    this.input.update();
    
    this.player.update(this.dt, this.input.currentFrame, this.ball);
    this.keeper.update(this.dt, this.ball);
    this.ball.update(this.dt);
    
    this.enforceBoundaries();
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
