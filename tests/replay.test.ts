import { describe, expect, it } from 'vitest';
import { Vec2 } from '../src/engine/Math';
import { GameEngine } from '../src/engine/GameEngine';
import { ControllerFrame } from '../src/engine/Intent';
import { createEmptyControllerFrame, ReplayData, ReplayRecorder } from '../src/engine/ReplayRecorder';

function makeFrame(overrides: Partial<ControllerFrame> = {}): ControllerFrame {
  return { ...createEmptyControllerFrame(), ...overrides };
}

function makeMovementFrames(count: number, dir: Vec2): ControllerFrame[] {
  const frames: ControllerFrame[] = [];
  for (let i = 0; i < count; i++) frames.push(makeFrame({ leftStick: dir.clone() }));
  return frames;
}

describe('input replay playback', () => {
  it('re-simulates recorded inputs to the same final score', () => {
    const engine = new GameEngine();
    engine.resetForInputReplay(12345, { skipKickoff: true });
    engine.replayRecorder = new ReplayRecorder(12345, { skipKickoff: true });

    const frames = [
      ...makeMovementFrames(120, new Vec2(0, 1)),
      makeFrame({ shootPressed: true, shootHeld: true }),
      ...makeMovementFrames(30, new Vec2(0, 1)),
      makeFrame({ shootHeld: true, shootReleased: true }),
      ...makeMovementFrames(240, new Vec2(0, 0)),
    ];

    let liveState = engine.getRenderState();
    for (const input of frames) {
      liveState = engine.advanceTickWithInput(input);
      engine.replayRecorder.recordFrame(liveState.tick, input);
    }

    const replayData = engine.replayRecorder.getReplayData();
    const playback = new GameEngine();
    const replayState = playback.simulateInputReplay(replayData);

    expect(replayState.scorePlayer).toBe(liveState.scorePlayer);
    expect(replayState.scoreOpponent).toBe(liveState.scoreOpponent);
    expect(replayState.player.pos.x).toBeCloseTo(liveState.player.pos.x, 6);
    expect(replayState.player.pos.y).toBeCloseTo(liveState.player.pos.y, 6);
    expect(replayState.ball.pos.x).toBeCloseTo(liveState.ball.pos.x, 6);
    expect(replayState.ball.pos.y).toBeCloseTo(liveState.ball.pos.y, 6);
  });

  it('buildInputReplayTimeline matches live ring-buffer states when skipKickoff', () => {
    const engine = new GameEngine();
    engine.init({ skipKickoff: true });
    for (let t = 16; t <= 800; t += 16) engine.update(t);

    const bufferStates = engine.replayBuffer.getItems();
    const inputTimeline = engine.buildInputReplayTimeline();
    expect(inputTimeline.length).toBe(engine.replayRecorder.getFrameCount());
    expect(inputTimeline.length).toBeGreaterThan(0);

    const lastBuffer = bufferStates[bufferStates.length - 1];
    const lastInput = inputTimeline[inputTimeline.length - 1];
    expect(lastInput.scorePlayer).toBe(lastBuffer.scorePlayer);
    expect(lastInput.scoreOpponent).toBe(lastBuffer.scoreOpponent);
    expect(lastInput.player.pos.x).toBeCloseTo(lastBuffer.player.pos.x, 4);
    expect(lastInput.player.pos.y).toBeCloseTo(lastBuffer.player.pos.y, 4);
  });

  it('partial replay matches intermediate state', () => {
    const engine = new GameEngine();
    engine.resetForInputReplay(999, { skipKickoff: true });
    const frames = makeMovementFrames(200, new Vec2(1, 0));
    for (const input of frames) engine.advanceTickWithInput(input);

    const replayData: ReplayData = {
      seed: 999,
      skipKickoff: true,
      frames: frames.map((input, index) => ({ tick: index + 1, input })),
    };

    const playback = new GameEngine();
    const partial = playback.simulateInputReplay(replayData, 100);
    const checkpoint = new GameEngine();
    checkpoint.resetForInputReplay(999, { skipKickoff: true });
    for (let i = 0; i < 100; i++) checkpoint.advanceTickWithInput(frames[i]);

    expect(partial.player.pos.x).toBeCloseTo(checkpoint.getRenderState().player.pos.x, 6);
    expect(partial.tick).toBe(checkpoint.getRenderState().tick);
  });
});
