import { describe, it, expect, beforeEach } from 'vitest';
import { deriveAnimFrame, triggerKickAnim } from '../src/engine/AnimationState';
import { createEmptyWorldState } from '../src/engine/WorldState';
import { Vec2, Vec3 } from '../src/engine/Math';
import { SimulationConfig } from '../src/engine/SimulationConfig';

// Helper: build a WorldState variant
function makeState(overrides: {
  playerSpeed?: number;
  playerDir?: [number, number];
  controlState?: string;
  isCharging?: boolean;
  chargeType?: 'pass' | 'shoot';
  chargeStart?: number;
  ballX?: number;
  ballY?: number;
  ballVY?: number;
  keeperX?: number;
} = {}) {
  const s = createEmptyWorldState();

  const speed = overrides.playerSpeed ?? 0;
  const [dx, dy] = overrides.playerDir ?? [0, 1];
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  s.player.vel = new Vec2(dx / len * speed, dy / len * speed);
  s.player.controlState = (overrides.controlState ?? 'free') as any;
  s.player.isCharging   = overrides.isCharging ?? false;
  s.player.chargeType   = overrides.chargeType ?? 'pass';
  s.player.chargeStart  = overrides.chargeStart ?? 0;

  s.ball.pos.x = overrides.ballX ?? 0;
  s.ball.pos.y = overrides.ballY ?? 0;
  s.ball.vel.y = overrides.ballVY ?? 0;

  s.keeper.pos = new Vec2(overrides.keeperX ?? 0, SimulationConfig.PITCH_HALF_LENGTH - 0.5);
  return s;
}

describe('AnimationState — player', () => {
  beforeEach(() => {
    // Reset kick cooldown between tests by advancing with no-trigger
    deriveAnimFrame(makeState(), 1);
  });

  it('returns idle when speed < threshold', () => {
    const frame = deriveAnimFrame(makeState({ playerSpeed: 0.1 }), 1/60);
    expect(frame.player).toBe('idle');
  });

  it('returns jog when moving at moderate speed', () => {
    const frame = deriveAnimFrame(makeState({ playerSpeed: 3 }), 1/60);
    expect(frame.player).toBe('jog');
  });

  it('returns sprint when speed exceeds sprint threshold', () => {
    const threshold = SimulationConfig.PLAYER_SPRINT_SPEED * 0.75;
    const frame = deriveAnimFrame(makeState({ playerSpeed: threshold + 0.1 }), 1/60);
    expect(frame.player).toBe('sprint');
  });

  it('returns dribble when under_control at jog speed', () => {
    const frame = deriveAnimFrame(makeState({ playerSpeed: 3, controlState: 'under_control' }), 1/60);
    expect(frame.player).toBe('dribble');
  });

  it('returns dribble_sprint when under_control at sprint speed', () => {
    const sprintSpeed = SimulationConfig.PLAYER_SPRINT_SPEED;
    const frame = deriveAnimFrame(makeState({ playerSpeed: sprintSpeed, controlState: 'under_control' }), 1/60);
    expect(frame.player).toBe('dribble_sprint');
  });

  it('returns charge_pass when isCharging + chargeType=pass', () => {
    const frame = deriveAnimFrame(makeState({ isCharging: true, chargeType: 'pass', chargeStart: 0.3 }), 1/60);
    expect(frame.player).toBe('charge_pass');
  });

  it('returns charge_shoot when isCharging + chargeType=shoot', () => {
    const frame = deriveAnimFrame(makeState({ isCharging: true, chargeType: 'shoot', chargeStart: 0.5 }), 1/60);
    expect(frame.player).toBe('charge_shoot');
  });

  it('chargeProgress is normalised 0-1', () => {
    const half = SimulationConfig.MAX_CHARGE_TIME / 2;
    const frame = deriveAnimFrame(makeState({ isCharging: true, chargeStart: half }), 1/60);
    expect(frame.chargeProgress).toBeCloseTo(0.5, 2);
  });

  it('chargeProgress clamps to 1 when overcharged', () => {
    const over = SimulationConfig.MAX_CHARGE_TIME * 2;
    const frame = deriveAnimFrame(makeState({ isCharging: true, chargeStart: over }), 1/60);
    expect(frame.chargeProgress).toBe(1);
  });

  it('kick state lasts for cooldown period after triggerKickAnim()', () => {
    triggerKickAnim(0.32);
    const frame1 = deriveAnimFrame(makeState(), 0.1);
    expect(frame1.player).toBe('kick');
    // After cooldown expires
    const frame2 = deriveAnimFrame(makeState(), 0.32);
    expect(frame2.player).not.toBe('kick');
  });

  it('playerStateChanged is true on first frame of new state', () => {
    const idle   = deriveAnimFrame(makeState({ playerSpeed: 0 }), 1/60);
    const moving = deriveAnimFrame(makeState({ playerSpeed: 5 }), 1/60);
    expect(moving.playerStateChanged).toBe(true);
  });
});

describe('AnimationState — keeper', () => {
  it('returns keeper_idle when ball is far', () => {
    const s = makeState({ ballX: 0, ballY: 0 }); // ball at centre
    const frame = deriveAnimFrame(s, 1/60);
    expect(frame.keeper).toBe('keeper_idle');
  });

  it('returns keeper_ready when ball approaches', () => {
    const s = makeState({ ballX: 0, ballY: 35 }); // halfway in
    const frame = deriveAnimFrame(s, 1/60);
    expect(frame.keeper).toBe('keeper_ready');
  });

  it('returns keeper_strafe_r when ball is right of keeper', () => {
    const s = makeState({ ballX: 3, ballY: 40, keeperX: -1 });
    const frame = deriveAnimFrame(s, 1/60);
    expect(frame.keeper).toBe('keeper_strafe_r');
  });

  it('returns keeper_strafe_l when ball is left of keeper', () => {
    const s = makeState({ ballX: -3, ballY: 40, keeperX: 1 });
    const frame = deriveAnimFrame(s, 1/60);
    expect(frame.keeper).toBe('keeper_strafe_l');
  });

  it('returns keeper_dive_r when ball is very close and to the right', () => {
    const diveR = SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS - 0.1;
    const s = makeState({ ballX: diveR * 0.8, ballY: 51, keeperX: 0 });
    s.keeper.pos = new Vec2(0, SimulationConfig.PITCH_HALF_LENGTH - 0.5);
    const frame = deriveAnimFrame(s, 1/60);
    expect(frame.keeper).toBe('keeper_dive_r');
  });
});
