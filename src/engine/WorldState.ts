import { Vec2, Vec3 } from './Math';
import { BallControlState } from './Player';
import { OpponentState } from './Opponent';
import { PassModifier, ShotModifier } from './Intent';

export interface PlayerState {
  pos: Vec2;
  vel: Vec2;
  facing: Vec2;
  controlState: BallControlState;
  isCharging: boolean;
  chargeStart: number;
  chargeType: 'pass' | 'shoot';
  passModifier: PassModifier;
  shotModifier: ShotModifier;
}

export interface BallState {
  pos: Vec3;
  vel: Vec3;
}

export interface KeeperWorldState {
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
  keeper: KeeperWorldState;
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
      chargeType: 'pass',
      passModifier: 'none',
      shotModifier: 'none',
    },
    ball: {
      pos: new Vec3(0, 0, 0),
      vel: new Vec3(0, 0, 0),
    },
    keeper: {
      pos: new Vec2(0, 52),
      facing: new Vec2(0, -1),
      aiState: 'positioning',
    },
    opponent: {
      pos: new Vec2(0, 25),
      facing: new Vec2(0, -1),
      vel: new Vec2(0, 0),
      aiState: 'tracking',
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
      chargeType: state.player.chargeType,
      passModifier: state.player.passModifier,
      shotModifier: state.player.shotModifier,
    },
    ball: {
      pos: new Vec3(state.ball.pos.x, state.ball.pos.y, state.ball.pos.z),
      vel: new Vec3(state.ball.vel.x, state.ball.vel.y, state.ball.vel.z),
    },
    keeper: {
      pos: state.keeper.pos.clone(),
      facing: state.keeper.facing.clone(),
      aiState: state.keeper.aiState,
    },
    opponent: {
      pos: state.opponent.pos.clone(),
      facing: state.opponent.facing.clone(),
      vel: state.opponent.vel.clone(),
      aiState: state.opponent.aiState,
    },
    scorePlayer: state.scorePlayer,
    scoreOpponent: state.scoreOpponent,
    lastGoalScorer: state.lastGoalScorer,
  };
}

export function interpolateWorldState(previous: WorldState, next: WorldState, alpha: number): WorldState {
  const result = cloneWorldState(next);

  result.player.pos.x = previous.player.pos.x + (next.player.pos.x - previous.player.pos.x) * alpha;
  result.player.pos.y = previous.player.pos.y + (next.player.pos.y - previous.player.pos.y) * alpha;
  result.player.facing.x = previous.player.facing.x + (next.player.facing.x - previous.player.facing.x) * alpha;
  result.player.facing.y = previous.player.facing.y + (next.player.facing.y - previous.player.facing.y) * alpha;
  result.player.facing.normalize();

  result.ball.pos.x = previous.ball.pos.x + (next.ball.pos.x - previous.ball.pos.x) * alpha;
  result.ball.pos.y = previous.ball.pos.y + (next.ball.pos.y - previous.ball.pos.y) * alpha;
  result.ball.pos.z = previous.ball.pos.z + (next.ball.pos.z - previous.ball.pos.z) * alpha;

  result.keeper.pos.x = previous.keeper.pos.x + (next.keeper.pos.x - previous.keeper.pos.x) * alpha;
  result.keeper.pos.y = previous.keeper.pos.y + (next.keeper.pos.y - previous.keeper.pos.y) * alpha;

  result.opponent.pos.x = previous.opponent.pos.x + (next.opponent.pos.x - previous.opponent.pos.x) * alpha;
  result.opponent.pos.y = previous.opponent.pos.y + (next.opponent.pos.y - previous.opponent.pos.y) * alpha;
  result.opponent.facing.x = previous.opponent.facing.x + (next.opponent.facing.x - previous.opponent.facing.x) * alpha;
  result.opponent.facing.y = previous.opponent.facing.y + (next.opponent.facing.y - previous.opponent.facing.y) * alpha;
  result.opponent.facing.normalize();

  return result;
}
