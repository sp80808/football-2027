import { InputSystem } from './InputSystem';
import { Player } from './Player';
import { Ball } from './Ball';
import { Keeper } from './Keeper';

export class GameEngine {
  input = new InputSystem();
  player = new Player();
  ball = new Ball();
  keeper = new Keeper();

  // 120 Hz fixed timestep
  private readonly dt = 1 / 120;
  private accumulator = 0;
  private lastTime = 0;

  init() {
    this.input.init();
    
    // Initial state
    this.player.pos.set(0, -5);
    this.player.vel.set(0, 0);
    this.player.facing.set(0, 1);
    
    this.ball.pos.set(0, 0, 0);
    this.ball.vel.set(0, 0, 0);
  }

  update(currentTime: number) {
    if (this.lastTime === 0) {
      this.lastTime = currentTime;
      return;
    }

    const frameTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    // Prevent spiral of death on long pauses
    this.accumulator += Math.min(frameTime, 0.25);

    while (this.accumulator >= this.dt) {
      this.tick();
      this.accumulator -= this.dt;
    }
  }

  private tick() {
    this.input.update();
    
    this.player.update(this.dt, this.input.currentFrame, this.ball);
    this.keeper.update(this.dt, this.ball);
    this.ball.update(this.dt);
    
    // Pitch boundaries (rough)
    this.enforceBoundaries();
  }

  private enforceBoundaries() {
    const PITCH_HALF_WIDTH = 34; // 68m wide
    const PITCH_HALF_LENGTH = 52.5; // 105m long
    
    if (this.ball.pos.x > PITCH_HALF_WIDTH) {
      this.ball.pos.x = PITCH_HALF_WIDTH;
      this.ball.vel.x *= -0.5;
    } else if (this.ball.pos.x < -PITCH_HALF_WIDTH) {
      this.ball.pos.x = -PITCH_HALF_WIDTH;
      this.ball.vel.x *= -0.5;
    }

    if (this.ball.pos.y > PITCH_HALF_LENGTH) {
      this.ball.pos.y = PITCH_HALF_LENGTH;
      this.ball.vel.y *= -0.5;
    } else if (this.ball.pos.y < -PITCH_HALF_LENGTH) {
      this.ball.pos.y = -PITCH_HALF_LENGTH;
      this.ball.vel.y *= -0.5;
    }
    
    // Player bounds
    if (this.player.pos.x > PITCH_HALF_WIDTH) this.player.pos.x = PITCH_HALF_WIDTH;
    if (this.player.pos.x < -PITCH_HALF_WIDTH) this.player.pos.x = -PITCH_HALF_WIDTH;
    if (this.player.pos.y > PITCH_HALF_LENGTH) this.player.pos.y = PITCH_HALF_LENGTH;
    if (this.player.pos.y < -PITCH_HALF_LENGTH) this.player.pos.y = -PITCH_HALF_LENGTH;
  }
}
