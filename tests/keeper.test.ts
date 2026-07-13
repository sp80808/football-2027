import { describe, expect, it } from 'vitest';
import { Keeper } from '../src/engine/Keeper';
import { Ball } from '../src/engine/Ball';
import { SimulationConfig } from '../src/engine/SimulationConfig';
import { Vec2 } from '../src/engine/Math';

describe('Keeper rush and dive prediction', () => {
  const goalLine = SimulationConfig.PITCH_HALF_LENGTH - 0.5;
  const boxEdge = goalLine - SimulationConfig.KEEPER_BOX_DEPTH;
  const dt = 1 / 120;

  it('holds the goal line while the ball is distant', () => {
    const keeper = new Keeper();
    const ball = new Ball();
    ball.pos.set(0, -20, 0);
    for (let tick = 0; tick < 120; tick++) keeper.update(dt, ball);
    expect(keeper.pos.y).toBeCloseTo(goalLine, 1);
    expect(keeper.aiState).toBe('positioning');
  });

  it('predicts goal-line intersection for through balls', () => {
    const keeper = new Keeper();
    const ball = new Ball();
    ball.pos.set(2, 40, 0);
    ball.vel.set(0.5, 8, 0);

    const out = new Vec2();
    const t = keeper.predictGoalLineIntersection(ball, out);
    const expectedT = (goalLine - 40) / 8;
    expect(t).toBeCloseTo(expectedT, 3);
    expect(out.x).toBeCloseTo(2 + 0.5 * expectedT, 2);
    expect(out.y).toBeCloseTo(0, 2);
  });

  it('dives toward predicted intercept for fast approaching shots', () => {
    const keeper = new Keeper();
    keeper.pos.set(0, goalLine);
    const ball = new Ball();
    ball.pos.set(3, goalLine - SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS + 0.1, 0);
    ball.vel.set(-2, SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED + 1, 0);

    let divePositionX = 0;
    let dived = false;
    for (let tick = 0; tick < 120; tick++) {
      keeper.update(dt, ball);
      ball.update(dt);
      if (keeper.aiState === 'diving') {
        dived = true;
        divePositionX = keeper.pos.x;
        break;
      }
    }
    expect(dived).toBe(true);
    expect(divePositionX).toBeGreaterThan(0);
  });

  it('auto-rushes off the goal line on through balls', () => {
    const keeper = new Keeper();
    keeper.pos.set(0, goalLine);
    const ball = new Ball();
    const throughY = boxEdge + SimulationConfig.KEEPER_BOX_DEPTH * 0.5;
    ball.pos.set(4, throughY, 0);
    ball.vel.set(0, SimulationConfig.KEEPER_THROUGH_BALL_MIN_VY + 2, 0);

    for (let tick = 0; tick < 90; tick++) keeper.update(dt, ball);

    expect(keeper.pos.y).toBeLessThan(goalLine - 0.5);
    expect(keeper.pos.y).toBeGreaterThanOrEqual(boxEdge);
  });

  it('rushes out when rushHeld and loose ball in box', () => {
    const keeper = new Keeper();
    keeper.pos.set(0, goalLine);
    const ball = new Ball();
    ball.pos.set(3, boxEdge + 4, 0);
    ball.vel.set(0, 0, 0);

    const startY = keeper.pos.y;
    for (let tick = 0; tick < 120; tick++) keeper.update(dt, ball, true);

    expect(keeper.pos.y).toBeLessThan(startY);
    expect(keeper.pos.y).toBeGreaterThanOrEqual(boxEdge);
  });

  it('recovers faster after a dive', () => {
    const keeper = new Keeper();
    keeper.pos.set(0, goalLine);
    const ball = new Ball();
    ball.pos.set(3, goalLine - SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS + 0.1, 0);
    ball.vel.set(-1, SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED + 2, 0);

    const recoverSeconds =
      SimulationConfig.KEEPER_DIVE_DURATION + SimulationConfig.KEEPER_RECOVER_DURATION + 0.15;
    for (let tick = 0; tick < Math.ceil(recoverSeconds * 120); tick++) {
      keeper.update(dt, ball);
      ball.update(dt);
    }
    expect(keeper.aiState).toBe('positioning');
    expect(keeper.pos.y).toBeCloseTo(goalLine, 0.5);
  });
});
