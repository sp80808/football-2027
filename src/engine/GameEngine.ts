import { Vec2 } from './Math';
import { InputSystem } from './InputSystem';
import { Footballer } from './Footballer';
import { Ball } from './Ball';
import { Keeper } from './Keeper';
import { TeamLogic } from './TeamLogic';
import { SimulationConfig } from './SimulationConfig';
import { WorldState, createEmptyWorldState, copyWorldState, interpolateWorldState } from './WorldState';
import { SeededRandom } from './SeededRandom';
import { RingBuffer } from './RingBuffer';
import { OffsideDetector } from './OffsideDetector';
import { ControllerFrame, createEmptyFrame } from './Intent';
import { ReplayData, ReplayRecorder } from './ReplayRecorder';
import { MatchManager, MatchSnapshot } from './MatchManager';
import { TargetFinder } from './TargetFinder';
import { DeadBallManager } from './DeadBallManager';
import { useSettingsStore } from '../store/settingsStore';

const DEFAULT_SIM_SEED = 12345;

export type SimEvent =
  | { type: 'kick'; power: number }
  | { type: 'bounce'; intensity: number }
  | { type: 'goal'; scorer: 'player' | 'opponent' }
  | { type: 'shot'; side: 'player' | 'opponent' }
  | { type: 'offside'; side: 'player' | 'opponent' }
  | { type: 'tackle'; side: 'player' | 'opponent' }
  | { type: 'whistle' }
  | { type: 'pass_completed'; side: 'player' | 'opponent' }
  | { type: 'shot_on_target'; side: 'player' | 'opponent' }
  | { type: 'shot_off_target'; side: 'player' | 'opponent' }
  | { type: 'save'; side: 'player' | 'opponent' }
  | { type: 'goal_kick' | 'throw_in' | 'corner_kick' | 'free_kick' };

export class GameEngine {
  input = new InputSystem();
  ball = new Ball();
  
  homeTeam: Footballer[] = Array.from({ length: 10 }, (_, i) => new Footballer(i, 'home'));
  awayTeam: Footballer[] = Array.from({ length: 10 }, (_, i) => new Footballer(i, 'away'));
  homeKeeper = new Keeper();
  awayKeeper = new Keeper();

  homeLogic = new TeamLogic('home');
  awayLogic = new TeamLogic('away');
  
  homeFrames: ControllerFrame[] = Array.from({ length: 10 }, () => createEmptyFrame());
  awayFrames: ControllerFrame[] = Array.from({ length: 10 }, () => createEmptyFrame());

  activeHomeIndex = 0; // Default active player

  random = new SeededRandom(DEFAULT_SIM_SEED);
  replayRecorder = new ReplayRecorder(DEFAULT_SIM_SEED);
  matchManager = new MatchManager();
  deadBall = new DeadBallManager();
  lastTouchTeam: 'home' | 'away' = 'home';

  private readonly dt = SimulationConfig.DT;
  private accumulator = 0;
  private lastTime = 0;
  private previousState: WorldState = createEmptyWorldState();
  private currentState: WorldState = createEmptyWorldState();
  private renderState: WorldState = createEmptyWorldState();

  public tps = 0;
  private ticksThisSecond = 0;
  private lastTpsTime = 0;
  public replayBuffer = new RingBuffer<WorldState>(600);

  public scorePlayer = 0;
  public scoreOpponent = 0;
  public lastGoalScorer: 'player' | 'opponent' | null = null;
  private pendingEvents: SimEvent[] = [];
  private prevMatchPhase = this.matchManager.state.phase;
  private prevHomeScore = 0;
  private prevAwayScore = 0;

  private readonly offsideDetector = new OffsideDetector();
  private readonly ballPlayPos = new Vec2();
  private readonly playerPosAtPlay = new Vec2();
  private awaitingOffsideCheck = false;
  private passbackTimer = 0;
  private previousControlState = this.homeTeam[0].controlState;
  public offsideLineY: number | null = null;
  public passTargetId: number | null = null;

  // Offside detector caches
  private readonly homeOffsideCache = Array.from({ length: 10 }, (_, i) => ({ id: i, pos: new Vec2(), involvedInPlay: true }));
  private readonly awayOffsideCache = Array.from({ length: 11 }, (_, i) => ({ id: i, pos: new Vec2() })); // Includes Keeper

  get isGoalCelebration(): boolean {
    return this.matchManager.state.phase === 'goal';
  }

  get elapsedSeconds(): number {
    return this.matchManager.state.matchTime;
  }

  getMatchSnapshot(): MatchSnapshot {
    return this.matchManager.state;
  }

  drainEvents(): SimEvent[] {
    const events = this.pendingEvents;
    this.pendingEvents = [];
    return events;
  }

  init(options?: { skipKickoff?: boolean }) {
    this.input.init();
    this.random.setSeed(DEFAULT_SIM_SEED);
    this.replayRecorder = new ReplayRecorder(DEFAULT_SIM_SEED, options);
    this.matchManager.init();
    
    // We let MatchManager handle initial positions when phase transitions to playing
    
    if (options?.skipKickoff) {
      this.matchManager.state.phase = 'playing';
      this.matchManager.state.announcement = null;
      this.matchManager.state.periodCountdown = null;
    } else {
      this.matchManager.beginKickoff();
    }
    this.prevMatchPhase = this.matchManager.state.phase;
    this.prevHomeScore = 0;
    this.prevAwayScore = 0;
    this.scorePlayer = 0;
    this.scoreOpponent = 0;
    this.lastGoalScorer = null;
    this.captureState(this.previousState, 0);
    this.captureState(this.currentState, 0);
    copyWorldState(this.currentState, this.renderState);
    
    // Allocate 600 empty states for the buffer to prevent gc in push
    for (let i = 0; i < 600; i++) {
        this.replayBuffer.push(createEmptyWorldState());
    }
    this.replayBuffer.clear(); // Reset pointers but keep objects
    
    const initialBufState = createEmptyWorldState();
    copyWorldState(this.currentState, initialBufState);
    this.replayBuffer.push(initialBufState);
  }

  rematch() {
    this.random.setSeed(DEFAULT_SIM_SEED);
    this.replayRecorder = new ReplayRecorder(DEFAULT_SIM_SEED);
    this.matchManager.rematch();
    
    this.prevMatchPhase = this.matchManager.state.phase;
    this.prevHomeScore = 0;
    this.prevAwayScore = 0;
    this.scorePlayer = 0;
    this.scoreOpponent = 0;
    this.lastGoalScorer = null;
    this.pendingEvents = [];
    this.awaitingOffsideCheck = false;
    this.passbackTimer = 0;
    this.offsideLineY = null;
    this.passTargetId = null;
    this.deadBall.reset();
    this.lastTouchTeam = 'home';
    this.captureState(this.previousState, 0);
    this.captureState(this.currentState, 0);
    copyWorldState(this.currentState, this.renderState);
    this.replayBuffer.clear();
    const initialBufState = createEmptyWorldState();
    copyWorldState(this.currentState, initialBufState);
    this.replayBuffer.push(initialBufState);
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

    this.accumulator += Math.min(frameTime, 0.25);
    while (this.accumulator >= this.dt) {
      copyWorldState(this.currentState, this.previousState);
      this.tick();
      this.captureState(this.currentState, this.previousState.tick + 1);
      
      const bufState = createEmptyWorldState();
      copyWorldState(this.currentState, bufState);
      this.replayBuffer.push(bufState);
      
      this.replayRecorder.recordFrame(this.currentState.tick, this.input.currentFrame);
      this.accumulator -= this.dt;
      this.ticksThisSecond++;
    }

    interpolateWorldState(this.previousState, this.currentState, this.accumulator / this.dt, this.renderState);
    return this.renderState;
  }

  getRenderState() {
    return this.renderState;
  }

  resetForInputReplay(seed: number, options?: { skipKickoff?: boolean }) {
    this.random.setSeed(seed);
    this.accumulator = 0;
    this.lastTime = 0;
    this.ticksThisSecond = 0;
    this.lastTpsTime = 0;
    this.pendingEvents = [];
    this.matchManager.init();
    
    if (options?.skipKickoff) {
      this.matchManager.state.phase = 'playing';
      this.matchManager.state.announcement = null;
      this.matchManager.state.periodCountdown = null;
    } else {
      this.matchManager.beginKickoff();
    }
    this.prevMatchPhase = this.matchManager.state.phase;
    this.prevHomeScore = 0;
    this.prevAwayScore = 0;
    this.scorePlayer = 0;
    this.scoreOpponent = 0;
    this.lastGoalScorer = null;
    this.captureState(this.previousState, 0);
    this.captureState(this.currentState, 0);
    copyWorldState(this.currentState, this.renderState);
  }

  advanceTickWithInput(input: ControllerFrame): WorldState {
    copyWorldState(this.currentState, this.previousState);
    this.tick(input);
    const tick = this.previousState.tick + 1;
    this.captureState(this.currentState, tick);
    copyWorldState(this.currentState, this.renderState);
    return this.renderState;
  }

  simulateInputReplay(replayData: ReplayData, frameCount?: number): WorldState {
    this.resetForInputReplay(replayData.seed, { skipKickoff: replayData.skipKickoff });
    const count = frameCount ?? replayData.frames.length;
    for (let i = 0; i < count; i++) {
      this.advanceTickWithInput(replayData.frames[i].input);
    }
    copyWorldState(this.currentState, this.renderState);
    return this.renderState;
  }

  buildInputReplayTimeline(replayData?: ReplayData): WorldState[] {
    const data = replayData ?? this.replayRecorder.getReplayData();
    const playback = new GameEngine();
    playback.resetForInputReplay(data.seed, { skipKickoff: data.skipKickoff });
    return data.frames.map((frame) => {
        const s = createEmptyWorldState();
        copyWorldState(playback.advanceTickWithInput(frame.input), s);
        return s;
    });
  }

  private tick(injectedInput?: ControllerFrame) {
    const prevPhase = this.prevMatchPhase;
    const prevHome = this.prevHomeScore;
    const prevAway = this.prevAwayScore;

    this.matchManager.update(this.dt, this.ball, this.homeTeam, this.awayTeam, this.homeKeeper, this.awayKeeper);

    const match = this.matchManager.state;
    this.scorePlayer = match.homeScore;
    this.scoreOpponent = match.awayScore;
    this.lastGoalScorer =
      match.goalScorer === 'home' ? 'player' : match.goalScorer === 'away' ? 'opponent' : null;

    if (match.homeScore > prevHome) {
      this.resetKickoffExtras();
      this.pendingEvents.push({ type: 'goal', scorer: 'player' }, { type: 'whistle' });
    } else if (match.awayScore > prevAway) {
      this.resetKickoffExtras();
      this.pendingEvents.push({ type: 'goal', scorer: 'opponent' }, { type: 'whistle' });
    } else if (prevPhase === 'goal' && match.phase === 'kickoff') {
      this.resetKickoffExtras();
      this.pendingEvents.push({ type: 'whistle' });
    } else if (prevPhase === 'playing' && match.phase === 'halftime') {
      this.pendingEvents.push({ type: 'whistle' });
    } else if (prevPhase === 'playing' && match.phase === 'full_time') {
      this.pendingEvents.push({ type: 'whistle' });
    } else if (prevPhase === 'halftime' && match.phase === 'kickoff') {
      this.pendingEvents.push({ type: 'whistle' });
    }

    this.prevMatchPhase = match.phase;
    this.prevHomeScore = match.homeScore;
    this.prevAwayScore = match.awayScore;

    if (match.phase !== 'playing') return;

    if (injectedInput) {
      this.input.injectFrame(injectedInput);
    } else {
      this.input.update();
    }

    const humanInput = this.input.currentFrame;

    if (this.deadBall.isActive) {
      const activePlayer = this.homeTeam[this.activeHomeIndex];
      this.deadBall.update(
        this.dt, this.ball, this.homeTeam, this.awayTeam, this.homeKeeper, this.awayKeeper,
        humanInput.shootReleased, humanInput.leftStick
      );
      if (this.deadBall.resumedThisTick) {
         this.pendingEvents.push({ type: 'whistle' });
      }
      return;
    }

    // Handle Player Switching
    if (humanInput.switchPressed) {
      let bestDist = Infinity;
      let bestIdx = this.activeHomeIndex;
      for(let i=0; i<10; i++) {
        if(i === this.activeHomeIndex) continue;
        const dist = Math.hypot(this.homeTeam[i].pos.x - this.ball.pos.x, this.homeTeam[i].pos.y - this.ball.pos.y);
        if(dist < bestDist) {
          bestDist = dist;
          bestIdx = i;
        }
      }
      this.activeHomeIndex = bestIdx;
    }

    const aiDifficulty = typeof window !== 'undefined' ? useSettingsStore.getState().aiDifficulty : 'Professional';

    this.homeLogic.update(this.dt, this.homeTeam, this.homeFrames, this.ball, this.activeHomeIndex, this.awayTeam, humanInput.teammatePressHeld, aiDifficulty);
    this.awayLogic.update(this.dt, this.awayTeam, this.awayFrames, this.ball, null, this.homeTeam, false, aiDifficulty);

    // Inject human input into active player
    this.homeFrames[this.activeHomeIndex] = humanInput;

    const activePlayer = this.homeTeam[this.activeHomeIndex];

    // Determine target based on left stick
    this.passTargetId = null;
    if (activePlayer.controlState === 'under_control' || activePlayer.controlState === 'receiving') {
      const intentDir = humanInput.leftStick;
      this.passTargetId = TargetFinder.findPassTarget(
        activePlayer.id,
        activePlayer.pos,
        intentDir,
        this.homeTeam
      );
    }

    const passReleased =
      (humanInput.passReleased || humanInput.throughPassReleased) &&
      activePlayer.isCharging &&
      activePlayer.chargeType === 'pass';
      
    if (passReleased) {
      this.ballPlayPos.set(this.ball.pos.x, this.ball.pos.y);
      this.playerPosAtPlay.copy(activePlayer.pos);
      this.awaitingOffsideCheck = true;
      this.passbackTimer = SimulationConfig.KEEPER_PASSBACK_WINDOW;
    }
    if (this.passbackTimer > 0) this.passbackTimer -= this.dt;

    const velBefore = this.ball.vel.mag();
    const zVelBefore = this.ball.vel.z;
    const playerShooting =
      humanInput.shootReleased &&
      activePlayer.isCharging &&
      activePlayer.chargeType === 'shoot';

    // Update outfields
    for(let i=0; i<10; i++) {
        let homeTarget: Vec2 | undefined = undefined;
        let awayTarget: Vec2 | undefined = undefined;

        if (i === this.activeHomeIndex) {
          // Human-controlled player: aim shots at goal, passes at the selected mate.
          if (activePlayer.chargeType === 'shoot') {
             homeTarget = TargetFinder.getShotTarget(activePlayer.pos, humanInput.leftStick, true);
          } else if (this.passTargetId !== null) {
             const targetMate = this.homeTeam.find(m => m.id === this.passTargetId);
             if (targetMate) homeTarget = targetMate.pos;
          }
        } else {
          // AI home player: if charging a pass, resolve a target from its aim direction
          // so the kick is aimed at a teammate rather than aimlessly forward.
          const hp = this.homeTeam[i];
          if (hp.isCharging && hp.chargeType === 'pass') {
            const mateId = TargetFinder.findPassTarget(hp.id, hp.pos, this.homeFrames[i].leftStick, this.homeTeam);
            if (mateId !== null) {
              const mate = this.homeTeam.find(m => m.id === mateId);
              if (mate) homeTarget = mate.pos;
            } else {
              homeTarget = TargetFinder.getShotTarget(hp.pos, this.homeFrames[i].leftStick, true);
            }
          } else if (hp.isCharging && hp.chargeType === 'shoot') {
            homeTarget = TargetFinder.getShotTarget(hp.pos, this.homeFrames[i].leftStick, true);
          }
        }

        // AI away player: same target resolution on the away team (attacks -Y).
        const ap = this.awayTeam[i];
        if (ap.isCharging && ap.chargeType === 'pass') {
          const mateId = TargetFinder.findPassTarget(ap.id, ap.pos, this.awayFrames[i].leftStick, this.awayTeam);
          if (mateId !== null) {
            const mate = this.awayTeam.find(m => m.id === mateId);
            if (mate) awayTarget = mate.pos;
          } else {
            awayTarget = TargetFinder.getShotTarget(ap.pos, this.awayFrames[i].leftStick, false);
          }
        } else if (ap.isCharging && ap.chargeType === 'shoot') {
          awayTarget = TargetFinder.getShotTarget(ap.pos, this.awayFrames[i].leftStick, false);
        }

        this.homeTeam[i].update(this.dt, this.homeFrames[i], this.ball, undefined, homeTarget);
        this.awayTeam[i].update(this.dt, this.awayFrames[i], this.ball, undefined, awayTarget);

        if (this.homeTeam[i].tackleWonThisTick) {
          this.pendingEvents.push({ type: 'tackle', side: 'player' });
        }
        if (this.awayTeam[i].tackleWonThisTick) {
          this.pendingEvents.push({ type: 'tackle', side: 'opponent' });
        }
        
        // Track last touch
        if (this.homeTeam[i].controlState !== 'free' || this.homeTeam[i].tackleWonThisTick) {
          this.lastTouchTeam = 'home';
        }
        if (this.awayTeam[i].controlState !== 'free' || this.awayTeam[i].tackleWonThisTick) {
          this.lastTouchTeam = 'away';
        }
    }

    const denyPassback = this.passbackTimer > 0 && this.ball.pos.y > SimulationConfig.PITCH_HALF_LENGTH - SimulationConfig.KEEPER_BOX_DEPTH;
    this.homeKeeper.update(this.dt, this.ball, humanInput.keeperRushHeld, denyPassback);
    this.awayKeeper.update(this.dt, this.ball, false, false); // AI keeper never rushes directly yet
    
    if (this.homeKeeper.aiState === 'diving' || this.homeKeeper.aiState === 'positioning' /* will add holding later */) {
      // rough proxy for keeper touch
      if (Math.hypot(this.ball.pos.x - this.homeKeeper.pos.x, this.ball.pos.y - this.homeKeeper.pos.y) < 2) this.lastTouchTeam = 'home';
    }
    if (this.awayKeeper.aiState === 'diving' || this.awayKeeper.aiState === 'positioning') {
      if (Math.hypot(this.ball.pos.x - this.awayKeeper.pos.x, this.ball.pos.y - this.awayKeeper.pos.y) < 2) this.lastTouchTeam = 'away';
    }

    this.ball.update(this.dt);

    this.updateOffsideLine();
    this.checkOffsideOnReceive();

    if (this.ball.pos.z === 0 && zVelBefore < -0.5) {
      this.pendingEvents.push({ type: 'bounce', intensity: Math.min(1, Math.abs(zVelBefore) / 8) });
    }
    const velAfter = this.ball.vel.mag();
    if (velAfter - velBefore > 6) {
      const power = Math.min(1, (velAfter - velBefore) / 20);
      this.pendingEvents.push({ type: 'kick', power });
      if (power > 0.45) {
        if (playerShooting) {
          this.pendingEvents.push({ type: 'shot', side: 'player' });
          if (this.isShotOnTarget('player')) this.pendingEvents.push({ type: 'shot_on_target', side: 'player' });
          else this.pendingEvents.push({ type: 'shot_off_target', side: 'player' });
        } else if (passReleased) {
          this.pendingEvents.push({ type: 'pass_completed', side: 'player' });
        }
      }
    }

    if (this.homeKeeper.savedThisTick) this.pendingEvents.push({ type: 'save', side: 'player' });
    if (this.awayKeeper.savedThisTick) this.pendingEvents.push({ type: 'save', side: 'opponent' });

    this.previousControlState = activePlayer.controlState;
    this.checkBoundaries();
  }

  private isShotOnTarget(side: 'player' | 'opponent'): boolean {
    const cfg = SimulationConfig;
    const goalY = side === 'player' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
    const vy = this.ball.vel.y;
    if (side === 'player' ? vy <= 0.5 : vy >= -0.5) return false;
    const t = (goalY - this.ball.pos.y) / vy;
    if (!isFinite(t) || t <= 0 || t > 2) return false;
    const xAtGoal = this.ball.pos.x + this.ball.vel.x * t;
    const zAtGoal = this.ball.pos.z + this.ball.vel.z * t - 0.5 * cfg.BALL_GRAVITY * t * t;
    return Math.abs(xAtGoal) <= cfg.GOAL_HALF_WIDTH && zAtGoal <= cfg.GOAL_HEIGHT && zAtGoal >= 0;
  }

  private updateOffsideLine() {
    for (let i=0; i<10; i++) {
        this.homeOffsideCache[i].pos.copy(this.homeTeam[i].pos);
        this.awayOffsideCache[i].pos.copy(this.awayTeam[i].pos);
    }
    this.awayOffsideCache[10].pos.copy(this.awayKeeper.pos);

    this.offsideLineY = this.offsideDetector.getOffsideLine(
      this.homeOffsideCache,
      this.awayOffsideCache,
      1,
    );
  }

  private checkOffsideOnReceive() {
    if (!this.awaitingOffsideCheck) return;

    const activePlayer = this.homeTeam[this.activeHomeIndex];
    const curr = activePlayer.controlState;
    const prev = this.previousControlState;
    const regainedControl =
      (curr === 'under_control' || curr === 'shielding') &&
      (prev === 'free' || prev === 'loose_nearby' || prev === 'receiving' || prev === 'stretching');

    if (!regainedControl) return;

    // We assume the active player is the one who received the ball.
    // In a real 11v11, we should check which attacker received it, but this is a good start.
    this.homeOffsideCache[0].pos.copy(this.playerPosAtPlay);
    const result = this.offsideDetector.checkOffside(
      this.ballPlayPos,
      [this.homeOffsideCache[0]],
      this.awayOffsideCache,
      1,
    );

    this.awaitingOffsideCheck = false;
    this.passbackTimer = 0;

    if (!result?.isOffside) return;

    this.ball.pos.x = this.ballPlayPos.x;
    this.ball.pos.y = this.ballPlayPos.y;
    this.ball.pos.z = 0;
    this.ball.vel.set(0, 0, 0);
    activePlayer.controlState = 'free';
    this.pendingEvents.push({ type: 'offside', side: 'player' }, { type: 'whistle' });
  }

  private resetKickoffExtras() {
    for(let i=0; i<10; i++){
        this.homeTeam[i].controlState = 'free';
        this.homeTeam[i].isCharging = false;
        this.homeTeam[i].chargeStart = 0;
        this.awayTeam[i].controlState = 'free';
        this.awayTeam[i].isCharging = false;
        this.awayTeam[i].chargeStart = 0;
    }
  }

  private checkBoundaries() {
    const cfg = SimulationConfig;
    
    if (this.deadBall.isActive) return;

    // Check goal lines
    if (this.ball.pos.y > cfg.PITCH_HALF_LENGTH) {
       // Outside goal width
       if (Math.abs(this.ball.pos.x) > cfg.GOAL_HALF_WIDTH) {
          this.deadBall.triggerGoalLineOut('away_end', this.ball.pos.x, this.lastTouchTeam, this.homeTeam, this.awayTeam, this.homeKeeper, this.awayKeeper);
          this.pendingEvents.push({ type: this.deadBall.state.type as 'goal_kick' | 'corner_kick' });
       }
    } else if (this.ball.pos.y < -cfg.PITCH_HALF_LENGTH) {
       if (Math.abs(this.ball.pos.x) > cfg.GOAL_HALF_WIDTH) {
          this.deadBall.triggerGoalLineOut('home_end', this.ball.pos.x, this.lastTouchTeam, this.homeTeam, this.awayTeam, this.homeKeeper, this.awayKeeper);
          this.pendingEvents.push({ type: this.deadBall.state.type as 'goal_kick' | 'corner_kick' });
       }
    }

    // Check sidelines
    if (this.ball.pos.x > cfg.PITCH_HALF_WIDTH || this.ball.pos.x < -cfg.PITCH_HALF_WIDTH) {
       this.deadBall.triggerThrowIn(this.ball.pos.x, this.ball.pos.y, this.lastTouchTeam, this.homeTeam, this.awayTeam);
       this.pendingEvents.push({ type: 'throw_in' });
    }
  }

  private captureState(state: WorldState, tick: number) {
    state.tick = tick;
    state.activeHomeIndex = this.activeHomeIndex;
    state.passTargetId = this.passTargetId;
    
    for (let i = 0; i < 10; i++) {
        const hp = this.homeTeam[i];
        const hs = state.homeTeam[i];
        hs.pos.copy(hp.pos);
        hs.vel.copy(hp.vel);
        hs.facing.copy(hp.facing);
        hs.controlState = hp.controlState;
        hs.isCharging = hp.isCharging;
        hs.chargeStart = hp.chargeStart;
        hs.chargeType = hp.chargeType;
        hs.passModifier = hp.activePassModifier;
        hs.shotModifier = hp.activeShotModifier;
        hs.stamina = hp.stamina;
        hs.maxStamina = hp.maxStamina;

        const ap = this.awayTeam[i];
        const as = state.awayTeam[i];
        as.pos.copy(ap.pos);
        as.vel.copy(ap.vel);
        as.facing.copy(ap.facing);
        as.controlState = ap.controlState;
        as.isCharging = ap.isCharging;
        as.chargeStart = ap.chargeStart;
        as.chargeType = ap.chargeType;
        as.passModifier = ap.activePassModifier;
        as.shotModifier = ap.activeShotModifier;
        as.stamina = ap.stamina;
        as.maxStamina = ap.maxStamina;
    }

    state.homeKeeper.pos.copy(this.homeKeeper.pos);
    state.homeKeeper.facing.copy(this.homeKeeper.facing);
    state.homeKeeper.aiState = this.homeKeeper.aiState;
    state.homeKeeper.isHoldingBall = this.homeKeeper.isHoldingBall;

    state.awayKeeper.pos.copy(this.awayKeeper.pos);
    state.awayKeeper.facing.copy(this.awayKeeper.facing);
    state.awayKeeper.aiState = this.awayKeeper.aiState;
    state.awayKeeper.isHoldingBall = this.awayKeeper.isHoldingBall;

    state.ball.pos.copy(this.ball.pos);
    state.ball.vel.copy(this.ball.vel);

    state.scorePlayer = this.scorePlayer;
    state.scoreOpponent = this.scoreOpponent;
    state.lastGoalScorer = this.lastGoalScorer;
    state.offsideLineY = this.offsideLineY;
    state.deadBallState = this.deadBall.isActive ? this.deadBall.state.type : null;
  }
}
