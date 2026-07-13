import { describe, it, expect } from 'vitest';
import { KeeperBrain } from '../src/engine/KeeperBrain';
import { SimulationConfig } from '../src/engine/SimulationConfig';

const DT = SimulationConfig.DT;
const GOAL_Y = SimulationConfig.PITCH_HALF_LENGTH - 0.5;

function makeBall(x = 0, y = 0, z = 0, vx = 0, vy = 0, vz = 0) {
  return { pos: { x, y, z }, vel: { x: vx, y: vy, z: vz } };
}

describe('KeeperBrain FSM', () => {
  it('starts in idle state', () => {
    const brain = new KeeperBrain();
    expect(brain.currentStateName).toBe('idle');
  });

  it('transitions idle → ready when ball enters attacking third', () => {
    const brain  = new KeeperBrain();
    const ballY  = SimulationConfig.PITCH_HALF_LENGTH * 0.35; // past threshold
    const ball   = makeBall(0, ballY);
    
    // Tick until transition
    for (let i = 0; i < 10; i++) {
      brain.update(DT, ball.pos, ball.vel, 0);
    }
    expect(brain.currentStateName).toBe('ready');
  });

  it('stays idle when ball is in own half', () => {
    const brain = new KeeperBrain();
    // Ball at centre (y = 0), well below threshold
    for (let i = 0; i < 20; i++) {
      brain.update(DT, { x: 0, y: 0, z: 0 }, { x: 0, y: 0, z: 0 }, 0);
    }
    expect(brain.currentStateName).toBe('idle');
  });

  it('action.targetX tracks predictedBallX during ready state', () => {
    const brain = new KeeperBrain();
    // Force to ready state by running many ticks with ball in attacking third
    const ballY = SimulationConfig.PITCH_HALF_LENGTH * 0.4;
    const ballVX = 2.0;
    const ballPos = { x: 1, y: ballY, z: 0 };
    const ballVel = { x: ballVX, y: 0, z: 0 };
    for (let i = 0; i < 20; i++) brain.update(DT, ballPos, ballVel, 0);

    const predicted = ballPos.x + ballVel.x * SimulationConfig.KEEPER_LOOKAHEAD_TIME;
    expect(brain.action.targetX).toBeCloseTo(predicted, 1);
  });

  it('commits to dive when ball is close and incoming fast', () => {
    const brain = new KeeperBrain();
    // Put ball just outside dive radius, moving fast toward keeper
    const diveR = SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS;
    const ballPos = { x: 0, y: GOAL_Y - diveR + 0.1, z: 0 };
    const ballVel = { x: 0, y: SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED + 1, z: 0 };

    // Need to get into ready/intercept first
    const farBall = { x: 0, y: SimulationConfig.PITCH_HALF_LENGTH * 0.4, z: 0 };
    for (let i = 0; i < 20; i++) brain.update(DT, farBall, { x: 0, y: 0, z: 0 }, 0);

    // Now bring ball close and incoming
    for (let i = 0; i < 30; i++) brain.update(DT, ballPos, ballVel, 0);

    expect(brain.currentStateName).toBe('diving');
    expect(brain.action.isDiving).toBe(true);
  });

  it('action.isDiving resets after dive duration', () => {
    const brain = new KeeperBrain();
    const diveR   = SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS;
    const ballPos = { x: 0, y: GOAL_Y - diveR + 0.1, z: 0 };
    const ballVel = { x: 0, y: SimulationConfig.KEEPER_DIVE_MIN_BALL_SPEED + 1, z: 0 };

    const farBall = { x: 0, y: SimulationConfig.PITCH_HALF_LENGTH * 0.4, z: 0 };
    for (let i = 0; i < 20; i++) brain.update(DT, farBall, { x: 0, y: 0, z: 0 }, 0);
    for (let i = 0; i < 30; i++) brain.update(DT, ballPos, ballVel, 0);

    expect(brain.action.isDiving).toBe(true);

    // Advance past dive duration
    const ticksForDive = Math.ceil(SimulationConfig.KEEPER_DIVE_DURATION / DT) + 5;
    for (let i = 0; i < ticksForDive; i++) brain.update(DT, ballPos, ballVel, 0);

    expect(brain.action.isDiving).toBe(false);
  });

  it('predictedBallX accounts for lateral velocity', () => {
    const brain = new KeeperBrain();
    brain.update(DT, { x: 2, y: 0, z: 0 }, { x: 3, y: 0, z: 0 }, 0);
    const expected = 2 + 3 * SimulationConfig.KEEPER_LOOKAHEAD_TIME;
    expect(brain.predictedBallX()).toBeCloseTo(expected, 4);
  });
});
