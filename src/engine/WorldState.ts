import { Vec2, Vec3 } from './Math';
import { BallControlState } from './Player';
import { OpponentState } from './Opponent';

export interface PlayerState {
  pos: Vec2;
  vel: Vec2;
  facing: Vec2;
  controlState: BallControlState;
  isCharging: boolean;
  chargeStart: number;
  chargeType: 'pass' | 'shoot';
}

export interface BallState {
  pos: Vec3;
  vel: Vec3;
}

export interface KeeperState {
  pos: Vec2;
  facing: Vec2;
  aiState: 'positioning' | 'diving' | 'recovering';
}

export interface OpponentWorldState {
  pos: Vec2;
  facing: Vec2;
  vel: Vec2;
  aiState: OpponentState;
}

export interface WorldState {
  tick: number;
  player: PlayerState;
  ball: BallState;
  keeper: KeeperState;
  opponent: OpponentWorldState;
  scorePlayer: number;
  scoreOpponent: number;
  lastGoalScorer: 'player' | 'opponent' | null;
}

export function createEmptyWorldState(): WorldState {
  return {
    tick: 0,
    player: {
      pos: new Vec2(0, -5),
      vel: new Vec2(0, 0),
      facing: new Vec2(0, 1),
      controlState: 'free',
      isCharging: false,
      chargeStart: 0,
      chargeType: 'pass'
    },
    ball: {
      pos: new Vec3(0, 0, 0),
      vel: new Vec3(0, 0, 0)
    },
    keeper: {
      pos: new Vec2(0, 52),
      facing: new Vec2(0, -1),
      aiState: 'positioning' as const
    },
    opponent: {
      pos: new Vec2(0, 25),
      facing: new Vec2(0, -1),
      vel: new Vec2(0, 0),
      aiState: 'tracking' as OpponentState
    },
    scorePlayer: 0,
    scoreOpponent: 0,
    lastGoalScorer: null,
  };
}

export function cloneWorldState(state: WorldState): WorldState {
  return {
    tick: state.tick,
    player: {
      pos: state.player.pos.clone(),
      vel: state.player.vel.clone(),
      facing: state.player.facing.clone(),
      controlState: state.player.controlState,
      isCharging: state.player.isCharging,
      chargeStart: state.player.chargeStart,
      chargeType: state.player.chargeType
    },
    ball: {
      pos: new Vec3(state.ball.pos.x, state.ball.pos.y, state.ball.pos.z),
      vel: new Vec3(state.ball.vel.x, state.ball.vel.y, state.ball.vel.z)
    },
    keeper: {
      pos: state.keeper.pos.clone(),
      facing: state.keeper.facing.clone(),
      aiState: state.keeper.aiState
    },
    opponent: {
      pos: state.opponent.pos.clone(),
      facing: state.opponent.facing.clone(),
      vel: state.opponent.vel.clone(),
      aiState: state.opponent.aiState
    },
    scorePlayer: state.scorePlayer,
    scoreOpponent: state.scoreOpponent,
    lastGoalScorer: state.lastGoalScorer,
  };
}

export function interpolateWorldState(prev: WorldState, next: WorldState, alpha: number): WorldState {
  const result = cloneWorldState(next); // keep discrete values from next
  
  // Interpolate player
  result.player.pos.x = prev.player.pos.x + (next.player.pos.x - prev.player.pos.x) * alpha;
  result.player.pos.y = prev.player.pos.y + (next.player.pos.y - prev.player.pos.y) * alpha;
  
  result.player.facing.x = prev.player.facing.x + (next.player.facing.x - prev.player.facing.x) * alpha;
  result.player.facing.y = prev.player.facing.y + (next.player.facing.y - prev.player.facing.y) * alpha;
  result.player.facing.normalize();

  // Interpolate ball
  result.ball.pos.x = prev.ball.pos.x + (next.ball.pos.x - prev.ball.pos.x) * alpha;
  result.ball.pos.y = prev.ball.pos.y + (next.ball.pos.y - prev.ball.pos.y) * alpha;
  result.ball.pos.z = prev.ball.pos.z + (next.ball.pos.z - prev.ball.pos.z) * alpha;

  // Interpolate keeper
  result.keeper.pos.x = prev.keeper.pos.x + (next.keeper.pos.x - prev.keeper.pos.x) * alpha;
  result.keeper.pos.y = prev.keeper.pos.y + (next.keeper.pos.y - prev.keeper.pos.y) * alpha;
  result.keeper.aiState = next.keeper.aiState; // discrete — take next value

  // Interpolate opponent
  result.opponent.pos.x = prev.opponent.pos.x + (next.opponent.pos.x - prev.opponent.pos.x) * alpha;
  result.opponent.pos.y = prev.opponent.pos.y + (next.opponent.pos.y - prev.opponent.pos.y) * alpha;
  result.opponent.facing.x = prev.opponent.facing.x + (next.opponent.facing.x - prev.opponent.facing.x) * alpha;
  result.opponent.facing.y = prev.opponent.facing.y + (next.opponent.facing.y - prev.opponent.facing.y) * alpha;
  result.opponent.aiState = next.opponent.aiState;

  // Score is discrete — always take next value
  result.scorePlayer = next.scorePlayer;
  result.scoreOpponent = next.scoreOpponent;
  result.lastGoalScorer = next.lastGoalScorer;

  return result;
}
