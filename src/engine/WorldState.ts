import { Vec2, Vec3 } from './Math';
import { BallControlState } from './Footballer';
import { PassModifier, ShotModifier } from './Intent';

export interface FootballerState {
  id: number;
  pos: Vec2;
  vel: Vec2;
  facing: Vec2;
  controlState: BallControlState;
  isCharging: boolean;
  chargeStart: number;
  chargeType: 'pass' | 'shoot';
  passModifier: PassModifier;
  shotModifier: ShotModifier;
  stamina: number;
  maxStamina: number;
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

export interface WorldState {
  tick: number;
  homeTeam: FootballerState[];
  awayTeam: FootballerState[];
  homeKeeper: KeeperWorldState;
  awayKeeper: KeeperWorldState;
  activeHomeIndex: number;
  ball: BallState;
  scorePlayer: number;
  scoreOpponent: number;
  lastGoalScorer: 'player' | 'opponent' | null;
  offsideLineY: number | null;
  passTargetId: number | null;
}

function createEmptyFootballer(id: number): FootballerState {
  return {
    id,
    pos: new Vec2(0, -5),
    vel: new Vec2(0, 0),
    facing: new Vec2(0, 1),
    controlState: 'free',
    isCharging: false,
    chargeStart: 0,
    chargeType: 'pass',
    passModifier: 'none',
    shotModifier: 'none',
    stamina: 100,
    maxStamina: 100,
  };
}

export function createEmptyWorldState(): WorldState {
  return {
    tick: 0,
    homeTeam: Array.from({ length: 10 }, (_, i) => createEmptyFootballer(i)),
    awayTeam: Array.from({ length: 10 }, (_, i) => createEmptyFootballer(i)),
    homeKeeper: { pos: new Vec2(0, 52), facing: new Vec2(0, -1), aiState: 'positioning' },
    awayKeeper: { pos: new Vec2(0, -52), facing: new Vec2(0, 1), aiState: 'positioning' },
    activeHomeIndex: 0,
    ball: { pos: new Vec3(0, 0, 0), vel: new Vec3(0, 0, 0) },
    scorePlayer: 0,
    scoreOpponent: 0,
    lastGoalScorer: null,
    offsideLineY: null,
    passTargetId: null,
  };
}

export function copyWorldState(src: WorldState, dest: WorldState) {
  dest.tick = src.tick;
  dest.activeHomeIndex = src.activeHomeIndex;
  for (let i = 0; i < 10; i++) {
    const s = src.homeTeam[i];
    const d = dest.homeTeam[i];
    d.pos.copy(s.pos);
    d.vel.copy(s.vel);
    d.facing.copy(s.facing);
    d.controlState = s.controlState;
    d.isCharging = s.isCharging;
    d.chargeStart = s.chargeStart;
    d.chargeType = s.chargeType;
    d.passModifier = s.passModifier;
    d.shotModifier = s.shotModifier;
    d.stamina = s.stamina;
    d.maxStamina = s.maxStamina;

    const sa = src.awayTeam[i];
    const da = dest.awayTeam[i];
    da.pos.copy(sa.pos);
    da.vel.copy(sa.vel);
    da.facing.copy(sa.facing);
    da.controlState = sa.controlState;
    da.isCharging = sa.isCharging;
    da.chargeStart = sa.chargeStart;
    da.chargeType = sa.chargeType;
    da.passModifier = sa.passModifier;
    da.shotModifier = sa.shotModifier;
    da.stamina = sa.stamina;
    da.maxStamina = sa.maxStamina;
  }
  
  dest.homeKeeper.pos.copy(src.homeKeeper.pos);
  dest.homeKeeper.facing.copy(src.homeKeeper.facing);
  dest.homeKeeper.aiState = src.homeKeeper.aiState;

  dest.awayKeeper.pos.copy(src.awayKeeper.pos);
  dest.awayKeeper.facing.copy(src.awayKeeper.facing);
  dest.awayKeeper.aiState = src.awayKeeper.aiState;

  dest.ball.pos.copy(src.ball.pos);
  dest.ball.vel.copy(src.ball.vel);

  dest.scorePlayer = src.scorePlayer;
  dest.scoreOpponent = src.scoreOpponent;
  dest.lastGoalScorer = src.lastGoalScorer;
  dest.offsideLineY = src.offsideLineY;
  dest.passTargetId = src.passTargetId;
}

export function interpolateWorldState(previous: WorldState, next: WorldState, alpha: number, result: WorldState) {
  copyWorldState(next, result);

  for (let i = 0; i < 10; i++) {
    const p = previous.homeTeam[i];
    const n = next.homeTeam[i];
    const r = result.homeTeam[i];
    r.pos.x = p.pos.x + (n.pos.x - p.pos.x) * alpha;
    r.pos.y = p.pos.y + (n.pos.y - p.pos.y) * alpha;
    r.facing.x = p.facing.x + (n.facing.x - p.facing.x) * alpha;
    r.facing.y = p.facing.y + (n.facing.y - p.facing.y) * alpha;
    r.facing.normalize();

    const pa = previous.awayTeam[i];
    const na = next.awayTeam[i];
    const ra = result.awayTeam[i];
    ra.pos.x = pa.pos.x + (na.pos.x - pa.pos.x) * alpha;
    ra.pos.y = pa.pos.y + (na.pos.y - pa.pos.y) * alpha;
    ra.facing.x = pa.facing.x + (na.facing.x - pa.facing.x) * alpha;
    ra.facing.y = pa.facing.y + (na.facing.y - pa.facing.y) * alpha;
    ra.facing.normalize();
  }

  result.ball.pos.x = previous.ball.pos.x + (next.ball.pos.x - previous.ball.pos.x) * alpha;
  result.ball.pos.y = previous.ball.pos.y + (next.ball.pos.y - previous.ball.pos.y) * alpha;
  result.ball.pos.z = previous.ball.pos.z + (next.ball.pos.z - previous.ball.pos.z) * alpha;

  result.homeKeeper.pos.x = previous.homeKeeper.pos.x + (next.homeKeeper.pos.x - previous.homeKeeper.pos.x) * alpha;
  result.homeKeeper.pos.y = previous.homeKeeper.pos.y + (next.homeKeeper.pos.y - previous.homeKeeper.pos.y) * alpha;
  
  result.awayKeeper.pos.x = previous.awayKeeper.pos.x + (next.awayKeeper.pos.x - previous.awayKeeper.pos.x) * alpha;
  result.awayKeeper.pos.y = previous.awayKeeper.pos.y + (next.awayKeeper.pos.y - previous.awayKeeper.pos.y) * alpha;
}
