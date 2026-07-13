/**
 * AnimationState — pure TypeScript derivation of visual animation states
 * from the deterministic WorldState.
 *
 * No Three.js or renderer imports — fully testable in Vitest.
 * Renderers read AnimationFrame each tick and cross-fade accordingly.
 */

import { WorldState } from './WorldState';
import { SimulationConfig } from './SimulationConfig';

// ── State enums ──────────────────────────────────────────────────────────────

export type PlayerAnimState =
  | 'idle'
  | 'jog'
  | 'sprint'
  | 'dribble'
  | 'dribble_sprint'
  | 'charge_pass'
  | 'charge_shoot'
  | 'kick'
  | 'stumble'
  | 'celebrate';

export type KeeperAnimState =
  | 'keeper_idle'
  | 'keeper_ready'
  | 'keeper_strafe_l'
  | 'keeper_strafe_r'
  | 'keeper_dive_l'
  | 'keeper_dive_r'
  | 'keeper_catch';

export interface AnimationFrame {
  player: PlayerAnimState;
  keeper: KeeperAnimState;
  /** Normalised 0–1 charge progress for blend weighting. */
  chargeProgress: number;
  /** True for the first frame of a new player state (renderer can reset clip). */
  playerStateChanged: boolean;
  /** True for the first frame of a new keeper state. */
  keeperStateChanged: boolean;
}

// ── Thresholds ────────────────────────────────────────────────────────────────

const JOG_SPEED       = 0.4;
const SPRINT_FRACTION = 0.75; // fraction of PLAYER_SPRINT_SPEED

// ── Module-level state for brief trigger animations ──────────────────────────

let _kickCooldown   = 0;
let _prevPlayer: PlayerAnimState = 'idle';
let _prevKeeper: KeeperAnimState = 'keeper_idle';

/**
 * Call from the kick-release path (Player.ts or GameEngine.ts) to
 * schedule the brief 'kick' animation state.
 */
export function triggerKickAnim(durationSec = 0.32) {
  _kickCooldown = durationSec;
}

/**
 * Primary derivation entry-point.
 * Call once per rendered frame after engine.getRenderState().
 *
 * @param state  Interpolated WorldState from GameEngine.getRenderState()
 * @param dt     Rendered frame delta-time in seconds (for cooldown decay)
 */
export function deriveAnimFrame(state: WorldState, dt: number): AnimationFrame {
  _kickCooldown = Math.max(0, _kickCooldown - dt);

  const player  = _derivePlayer(state);
  const keeper  = _deriveKeeper(state);
  const charge  = state.player.isCharging
    ? Math.min(1, state.player.chargeStart / SimulationConfig.MAX_CHARGE_TIME)
    : 0;

  const playerStateChanged = player !== _prevPlayer;
  const keeperStateChanged = keeper !== _prevKeeper;
  _prevPlayer = player;
  _prevKeeper = keeper;

  return { player, keeper, chargeProgress: charge, playerStateChanged, keeperStateChanged };
}

// ── Internal derivation helpers ───────────────────────────────────────────────

function _derivePlayer(state: WorldState): PlayerAnimState {
  const p     = state.player;
  const speed = p.vel.mag();
  const inControl =
    p.controlState === 'under_control' || p.controlState === 'loose_nearby';

  if (_kickCooldown > 0) return 'kick';

  if (p.isCharging) {
    return p.chargeType === 'shoot' ? 'charge_shoot' : 'charge_pass';
  }

  if (speed < JOG_SPEED) return 'idle';

  const sprintThresh = SimulationConfig.PLAYER_SPRINT_SPEED * SPRINT_FRACTION;
  const isSprinting  = speed >= sprintThresh;

  if (inControl) return isSprinting ? 'dribble_sprint' : 'dribble';
  return isSprinting ? 'sprint' : 'jog';
}

function _deriveKeeper(state: WorldState): KeeperAnimState {
  const ball   = state.ball;
  const keeper = state.keeper;

  const dx   = ball.pos.x - keeper.pos.x;
  const dy   = ball.pos.y - keeper.pos.y;
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist < SimulationConfig.KEEPER_DIVE_TRIGGER_RADIUS) {
    return dx >= 0 ? 'keeper_dive_r' : 'keeper_dive_l';
  }
  if (dist < 20) {
    if (dx >  0.5) return 'keeper_strafe_r';
    if (dx < -0.5) return 'keeper_strafe_l';
    return 'keeper_ready';
  }
  return 'keeper_idle';
}

// ── Cross-fade duration table (seconds) ──────────────────────────────────────

export const ANIM_FADE: Record<PlayerAnimState, number> = {
  idle:           0.30,
  jog:            0.20,
  sprint:         0.20,
  dribble:        0.15,
  dribble_sprint: 0.15,
  charge_pass:    0.10,
  charge_shoot:   0.10,
  kick:           0.05,
  stumble:        0.10,
  celebrate:      0.40,
};

// ── Animation clip name map — points to Quaternius/KayKit GLB clip names ─────
// Update these strings to match the actual clip names once assets are provided.

export const PLAYER_CLIP_NAMES: Record<PlayerAnimState, string> = {
  idle:           'Idle',
  jog:            'Run',
  sprint:         'Sprint',
  dribble:        'Run',
  dribble_sprint: 'Sprint',
  charge_pass:    'Kick_start',
  charge_shoot:   'Kick_start',
  kick:           'Kick',
  stumble:        'Fall',
  celebrate:      'Wave',
};

export const KEEPER_CLIP_NAMES: Record<KeeperAnimState, string> = {
  keeper_idle:     'Idle',
  keeper_ready:    'Idle_combat',
  keeper_strafe_l: 'Strafe_left',
  keeper_strafe_r: 'Strafe_right',
  keeper_dive_l:   'Dive_left',
  keeper_dive_r:   'Dive_right',
  keeper_catch:    'Catch',
};
