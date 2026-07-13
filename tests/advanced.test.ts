import { describe, it, expect, beforeEach } from 'vitest';
import { Ball } from '../src/engine/Ball';
import { SimulationConfig } from '../src/engine/SimulationConfig';
import { OffsideDetector } from '../src/engine/OffsideDetector';
import {
  TacticalAIController,
  GoalkeeperAI,
  DefenderAI,
  MidfielderAI,
  AttackerAI,
  WingerAI,
  createAIController,
  ROLE_ATTRIBUTE_TEMPLATES
} from '../src/engine/TacticalAI';
import { Vec2 } from '../src/engine/Math';

describe('Enhanced Ball Physics', () => {
  let ball: Ball;

  beforeEach(() => {
    ball = new Ball();
  });

  describe('Magnus Effect', () => {
    it('applies spin-induced curve to airborne ball', () => {
      ball.pos.set(0, 0, 10);
      ball.vel.set(20, 0, 0);
      ball.spin.set(0, 0, 50); // 50 rad/s backspin

      const dt = 1 / 120;
      for (let i = 0; i < 120; i++) {
        ball.update(dt);
      }

      // Magnus force should curve ball to the left (negative Y for positive X velocity + positive Z spin)
      expect(ball.pos.y).toBeLessThan(0);
    });

    it('does not apply Magnus force when ball is on ground', () => {
      ball.pos.set(0, 0, 0);
      ball.vel.set(10, 0, 0);
      ball.spin.set(0, 0, 50);

      const initialY = ball.pos.y;
      ball.update(1/120);

      // No Magnus effect on ground
      expect(ball.pos.y).toBeCloseTo(initialY, 5);
    });
  });

  describe('Environmental Factors', () => {
    it('adjusts air density for altitude', () => {
      ball.pos.set(0, 0, 10);
      ball.vel.set(20, 0, 0);

      // Sea level
      ball.update(1/120, { altitude: 0, temperature: 15 });
      const seaLevelZ = ball.pos.z;

      // High altitude (Mexico City ~2240m)
      ball.pos.set(0, 0, 10);
      ball.vel.set(20, 0, 0);
      ball.update(1/120, { altitude: 2240, temperature: 15 });
      const highAltZ = ball.pos.z;

      // Less drag at altitude -> ball stays higher
      expect(highAltZ).toBeGreaterThan(seaLevelZ);
    });

    it('increases ground friction on wet surface', () => {
      ball.pos.set(0, 0, 0);
      ball.vel.set(10, 0, 0);

      // Dry
      ball.update(1/120, { wetSurface: false });
      const drySpeed = ball.vel.mag();

      // Wet
      ball.pos.set(0, 0, 0);
      ball.vel.set(10, 0, 0);
      ball.update(1/120, { wetSurface: true });
      const wetSpeed = ball.vel.mag();

      expect(wetSpeed).toBeLessThan(drySpeed);
    });
  });

  describe('Spin Decay', () => {
    it('decays spin in air', () => {
      ball.spin.set(0, 0, 100);
      const initialSpin = ball.getSpin().mag();

      for (let i = 0; i < 120; i++) {
        ball.update(1/120);
      }

      expect(ball.getSpin().mag()).toBeLessThan(initialSpin);
    });

    it('decays spin faster on ground', () => {
      ball.spin.set(0, 0, 100);

      // In air
      ball.pos.set(0, 0, 10);
      for (let i = 0; i < 120; i++) ball.update(1/120);
      const airSpin = ball.getSpin().mag();

      // On ground
      ball.spin.set(0, 0, 100);
      ball.pos.set(0, 0, 0);
      for (let i = 0; i < 120; i++) ball.update(1/120);
      const groundSpin = ball.getSpin().mag();

      expect(groundSpin).toBeLessThan(airSpin);
    });
  });

  describe('Ground Collision', () => {
    it('generates spin from tangential friction on bounce', () => {
      ball.pos.set(0, 0, 5);
      ball.vel.set(10, 5, -15);

      // Let it bounce
      for (let i = 0; i < 120; i++) {
        ball.update(1/120);
        if (ball.pos.z === 0.11 && ball.vel.z > 0) break;
      }

      // Should have generated some spin from tangential friction
      expect(ball.getSpin().mag()).toBeGreaterThan(0);
    });
  });
});

describe('Offside Detection', () => {
  let detector: OffsideDetector;

  beforeEach(() => {
    detector = new OffsideDetector();
  });

  it('detects offside when attacker ahead of second-last defender', () => {
    const ballPos = new Vec2(0, 30);
    const attackers = [
      { id: 1, pos: new Vec2(5, 35), involvedInPlay: true },
      { id: 2, pos: new Vec2(-5, 25), involvedInPlay: false }
    ];
    const defenders = [
      { id: 1, pos: new Vec2(-10, 28) },
      { id: 2, pos: new Vec2(10, 29) },
      { id: 3, pos: new Vec2(0, 32) } // Goalkeeper
    ];

    const result = detector.checkOffside(ballPos, attackers, defenders, 1);

    expect(result?.isOffside).toBe(true);
    expect(result?.attackerId).toBe(1);
  });

  it('allows onside when attacker level with second-last defender', () => {
    const ballPos = new Vec2(0, 30);
    const attackers = [
      { id: 1, pos: new Vec2(5, 29), involvedInPlay: true } // Level with defender
    ];
    const defenders = [
      { id: 1, pos: new Vec2(-10, 28) },
      { id: 2, pos: new Vec2(10, 29) },
      { id: 3, pos: new Vec2(0, 32) }
    ];

    const result = detector.checkOffside(ballPos, attackers, defenders, 1);

    expect(result?.isOffside).toBe(false);
  });

  it('allows onside when attacker behind ball', () => {
    const ballPos = new Vec2(0, 30);
    const attackers = [
      { id: 1, pos: new Vec2(5, 25), involvedInPlay: true } // Behind ball
    ];
    const defenders = [
      { id: 1, pos: new Vec2(-10, 28) },
      { id: 2, pos: new Vec2(10, 29) },
      { id: 3, pos: new Vec2(0, 32) }
    ];

    const result = detector.checkOffside(ballPos, attackers, defenders, 1);

    expect(result?.isOffside).toBe(false);
  });

  it('ignores attackers not involved in active play', () => {
    const ballPos = new Vec2(0, 30);
    const attackers = [
      { id: 1, pos: new Vec2(5, 35), involvedInPlay: false }, // Not involved
      { id: 2, pos: new Vec2(-5, 25), involvedInPlay: true }
    ];
    const defenders = [
      { id: 1, pos: new Vec2(-10, 28) },
      { id: 2, pos: new Vec2(10, 29) },
      { id: 3, pos: new Vec2(0, 32) }
    ];

    const result = detector.checkOffside(ballPos, attackers, defenders, 1);

    // Attacker 1 is in offside position but not involved
    // Attacker 2 is onside
    expect(result?.isOffside).toBe(false);
  });

  it('handles attacking negative Y direction', () => {
    const ballPos = new Vec2(0, -30);
    const attackers = [
      { id: 1, pos: new Vec2(5, -35), involvedInPlay: true }
    ];
    const defenders = [
      { id: 1, pos: new Vec2(-10, -28) },
      { id: 2, pos: new Vec2(10, -29) },
      { id: 3, pos: new Vec2(0, -32) }
    ];

    const result = detector.checkOffside(ballPos, attackers, defenders, -1);

    expect(result?.isOffside).toBe(true);
  });
});

describe('Tactical AI System', () => {
  const mockContext = (overrides = {}) => ({
    ball: { pos: new Vec2(0, 0), vel: new Vec2(0, 0), pos: { z: 0 } } as any,
    teammates: [] as any[],
    opponents: [] as any[],
    self: { pos: new Vec2(0, 0), vel: new Vec2(0, 0), dt: 1/120, role: 'CM' } as any,
    phase: 'attacking' as any,
    teamInstruction: 'possession',
    tacticalProfile: {
      formation: '4-3-3' as any,
      teamInstruction: 'possession',
      defensiveLine: 'normal',
      pressingIntensity: 'medium',
      width: 'normal',
      tempo: 'normal',
      crossingFrequency: 'normal',
      shootingFrequency: 'normal'
    },
    timeRemaining: 90,
    scoreDiff: 0,
    ...overrides
  });

  describe('GoalkeeperAI', () => {
    let gk: GoalkeeperAI;

    beforeEach(() => {
      const attrs = ROLE_ATTRIBUTE_TEMPLATES.GK!;
      gk = new GoalkeeperAI(attrs as any);
    });

    it('stays on goal line when ball is far', () => {
      const ctx = mockContext({
        ball: { pos: { x: 0, y: -30, z: 0 }, vel: { x: 0, y: 0, z: 0 } } as any,
        self: { pos: new Vec2(0, 52), vel: new Vec2(0, 0), dt: 1/120 }
      });

      const action = gk.decide(ctx);
      expect(action.type).toBe('move');
      expect(action.target.y).toBeCloseTo(52, 1);
    });

    it('dives for fast approaching shot', () => {
      const ctx = mockContext({
        ball: {
          pos: { x: 2, y: 45, z: 1 },
          vel: { x: -2, y: 8, z: 0 }
        } as any,
        self: { pos: new Vec2(0, 52), vel: new Vec2(0, 0), dt: 1/120 }
      });

      const action = gk.decide(ctx);
      // Should be in diving state or making save attempt
      expect(action.type).toBe('move');
    });
  });

  describe('DefenderAI', () => {
    let df: DefenderAI;

    beforeEach(() => {
      const attrs = ROLE_ATTRIBUTE_TEMPLATES.CB!;
      df = new DefenderAI(attrs as any, 'CB');
    });

    it('marks closest opponent when defending', () => {
      const ctx = mockContext({
        phase: 'defending',
        self: { pos: new Vec2(0, 30), vel: new Vec2(0, 0), dt: 1/120, role: 'CB' },
        opponents: [
          { pos: new Vec2(5, 35), vel: new Vec2(0, 0), controlState: 'under_control', role: 'ST' } as any,
          { pos: new Vec2(-5, 35), vel: new Vec2(0, 0), controlState: 'free', role: 'LW' } as any
        ],
        teammates: []
      });

      const action = df.decide(ctx);
      expect(action.type).toBe('mark');
    });

    it('intercepts loose balls', () => {
      const ctx = mockContext({
        phase: 'defending',
        ball: { pos: { x: 10, y: 20, z: 0 }, vel: { x: 5, y: 10, z: 0 } } as any,
        self: { pos: new Vec2(0, 25), vel: new Vec2(0, 0), dt: 1/120 },
        opponents: []
      });

      const action = df.decide(ctx);
      expect(action.type).toBe('intercept');
    });
  });

  describe('MidfielderAI', () => {
    let mf: MidfielderAI;

    beforeEach(() => {
      const attrs = ROLE_ATTRIBUTE_TEMPLATES.CM!;
      mf = new MidfielderAI(attrs as any);
    });

    it('finds best passing option', () => {
      const ctx = mockContext({
        phase: 'attacking',
        self: { pos: new Vec2(0, 0), vel: new Vec2(0, 0), dt: 1/120, controlState: 'under_control', role: 'CM' },
        ball: { pos: { x: 0, y: 0, z: 0 }, vel: { x: 0, y: 0, z: 0 } } as any,
        teammates: [
          { pos: new Vec2(10, 20), vel: new Vec2(0, 0), controlState: 'free', role: 'CAM' } as any,
          { pos: new Vec2(-5, 15), vel: new Vec2(0, 0), controlState: 'free', role: 'LW' } as any
        ],
        opponents: [
          { pos: new Vec2(0, 5), vel: new Vec2(0, 0), controlState: 'free' } as any
        ]
      });

      const action = mf.decide(ctx);
      expect(action.type).toBe('pass');
    });

    it('finds space when off-ball', () => {
      const ctx = mockContext({
        phase: 'attacking',
        self: { pos: new Vec2(0, 10), vel: new Vec2(0, 0), dt: 1/120, controlState: 'free', role: 'CM' },
        ball: { pos: { x: 0, y: -20, z: 0 }, vel: { x: 0, y: 0, z: 0 } } as any,
        teammates: [
          { pos: new Vec2(0, -15), vel: new Vec2(0, 0), controlState: 'under_control', role: 'CB' } as any
        ],
        opponents: [
          { pos: new Vec2(0, 5), vel: new Vec2(0, 0) } as any
        ]
      });

      const action = mf.decide(ctx);
      expect(action.type).toBe('move');
    });
  });

  describe('AttackerAI', () => {
    let atk: AttackerAI;

    beforeEach(() => {
      const attrs = ROLE_ATTRIBUTE_TEMPLATES.ST!;
      atk = new AttackerAI(attrs as any);
    });

    it('shoots when in good position', () => {
      const ctx = mockContext({
        self: {
          pos: new Vec2(0, 30),
          vel: new Vec2(0, 0),
          dt: 1/120,
          controlState: 'under_control',
          role: 'ST',
          attributes: { shooting: 18 }
        },
        ball: { pos: { x: 0, y: 30, z: 0 }, vel: { x: 0, y: 0, z: 0 } } as any,
        teammates: [],
        opponents: [
          { pos: new Vec2(5, 45), vel: new Vec2(0, 0) } as any,
          { pos: new Vec2(-5, 45), vel: new Vec2(0, 0) } as any
        ]
      });

      const action = atk.decide(ctx);
      expect(action.type).toBe('shoot');
    });

    it('makes runs behind defense', () => {
      const ctx = mockContext({
        self: { pos: new Vec2(0, 25), vel: new Vec2(0, 0), dt: 1/120, controlState: 'free', role: 'ST' },
        ball: { pos: { x: 0, y: 10, z: 0 }, vel: { x: 0, y: 0, z: 0 } } as any,
        teammates: [
          { pos: new Vec2(0, 15), vel: new Vec2(0, 0), controlState: 'under_control', role: 'CAM' } as any
        ],
        opponents: [
          { pos: new Vec2(0, 35), vel: new Vec2(0, 0) } as any,
          { pos: new Vec2(10, 35), vel: new Vec2(0, 0) } as any
        ]
      });

      const action = atk.decide(ctx);
      expect(action.type).toBe('move');
      expect(action.target.y).toBeGreaterThan(25);
    });
  });

  describe('WingerAI', () => {
    let wg: WingerAI;

    beforeEach(() => {
      const attrs = ROLE_ATTRIBUTE_TEMPLATES.LW!;
      wg = new WingerAI(attrs as any, 'LW');
    });

    it('stays wide when off-ball', () => {
      const ctx = mockContext({
        self: { pos: new Vec2(-25, 20), vel: new Vec2(0, 0), dt: 1/120, controlState: 'free', role: 'LW' },
        ball: { pos: { x: 0, y: 20, z: 0 }, vel: { x: 0, y: 0, z: 0 } } as any,
        teammates: [],
        opponents: []
      });

      const action = wg.decide(ctx);
      expect(action.type).toBe('move');
      expect(action.target.x).toBeLessThan(-20);
    });

    it('cuts inside when in final third', () => {
      const ctx = mockContext({
        self: { pos: new Vec2(-20, 30), vel: new Vec2(0, 0), dt: 1/120, controlState: 'under_control', role: 'LW' },
        ball: { pos: { x: -20, y: 30, z: 0 }, vel: { x: 0, y: 0, z: 0 } } as any,
        teammates: [
          { pos: new Vec2(-5, 35), vel: new Vec2(0, 0), role: 'CF' } as any
        ],
        opponents: []
      });

      const action = wg.decide(ctx);
      // Should cut inside
      expect(action.type).toBe('dribble');
      expect(action.direction.x).toBeGreaterThan(0);
    });
  });

  describe('Factory', () => {
    it('creates correct controller for each role', () => {
      const attrs = ROLE_ATTRIBUTE_TEMPLATES.CM!;

      expect(createAIController('GK', attrs as any)).toBeInstanceOf(GoalkeeperAI);
      expect(createAIController('CB', attrs as any)).toBeInstanceOf(DefenderAI);
      expect(createAIController('CM', attrs as any)).toBeInstanceOf(MidfielderAI);
      expect(createAIController('LW', attrs as any)).toBeInstanceOf(WingerAI);
      expect(createAIController('ST', attrs as any)).toBeInstanceOf(AttackerAI);
    });
  });
});

describe('Attribute Calculator', () => {
  const mockStats = {
    passes_completed: 850,
    passes_attempted: 1000,
    long_passes_completed: 40,
    long_passes_attempted: 80,
    crosses_completed: 15,
    crosses_attempted: 30,
    key_passes_per_90: 2.5,
    through_passes_per_90: 1.2,
    goals_per_shot: 0.15,
    shot_power_avg: 70,
    shots: 50,
    shots_on_target: 20,
    volley_goals: 2,
    volley_attempts: 10,
    penalties_scored: 4,
    penalties_taken: 5,
    freekick_goals: 2,
    freekick_attempts: 10,
    successful_dribbles_per_90: 4,
    dribbles_won_per_90: 3,
    touches_per_90: 80,
    tackles_won_per_90: 2,
    aerial_duels_won: 10,
    aerial_duels_total: 20,
    aerial_duels_won_per_90: 2,
    max_speed_kmh: 32,
    sprints_per_90: 30,
    minutes_played: 2700,
    distance_covered_km: 11,
    errors_per_90: 0.5,
    interceptions_per_90: 2,
    fouls_conceded_per_90: 1,
    fouls_committed_per_90: 1.5,
    captain_matches: 10,
    matches_played: 38,
    goals_per_90: 0.3,
    xG_per_90: 0.25,
    comebacks: 3,
    assists_per_90: 0.2
  };

  it('calculates passing attributes for midfielder', () => {
    const attrs = AttributeCalculator.calculateAttributes(mockStats, 'CM', 26);

    expect(attrs.passing.short).toBeGreaterThan(15);
    expect(attrs.passing.long).toBeGreaterThan(13);
    expect(attrs.passing.vision).toBeGreaterThan(14);
  });

  it('calculates shooting attributes for striker', () => {
    const attrs = AttributeCalculator.calculateAttributes(mockStats, 'ST', 25);

    expect(attrs.shooting.finishing).toBeGreaterThan(14);
    expect(attrs.shooting.placement).toBeGreaterThan(13);
  });

  it('applies age curve correctly', () => {
    const youngAttrs = AttributeCalculator.calculateAttributes(mockStats, 'CM', 20);
    const primeAttrs = AttributeCalculator.calculateAttributes(mockStats, 'CM', 27);
    const oldAttrs = AttributeCalculator.calculateAttributes(mockStats, 'CM', 34);

    // Physical attributes should peak at 24
    expect(primeAttrs.pace).toBeGreaterThanOrEqual(youngAttrs.pace);
    expect(primeAttrs.pace).toBeGreaterThan(oldAttrs.pace);

    // Mental attributes should peak later
    expect(primeAttrs.composure).toBeGreaterThanOrEqual(youngAttrs.composure);
  });
});

describe('Player Development', () => {
  it('develops physical attributes early', () => {
    const baseAttrs = {
      pace: 12, acceleration: 11, stamina: 10, strength: 9, agility: 10, jumping: 9,
      passing: { short: 10, long: 8, crossing: 7, vision: 9, throughBall: 8 },
      shooting: { finishing: 9, power: 8, placement: 8, volleys: 7, penalties: 7, freeKicks: 6 },
      dribbling: { closeControl: 9, agility: 9, balance: 9, acceleration: 9 },
      firstTouch: 9, tackling: 8, heading: 8,
      pace: 11, acceleration: 10, stamina: 10, strength: 9, agility: 10, jumping: 9,
      composure: 10, decisions: 10, anticipation: 10, workRate: 11, flair: 8, leadership: 5, concentration: 10, aggression: 9, bravery: 8, determination: 10, teamwork: 9, positioning: 9
    } as any;

    const dev = PlayerDevelopment.calculateDevelopment(baseAttrs, 19, 0.8, 0.9, 'ambitious');

    // Physical should develop fastest at 19
    expect(dev.pace).toBeGreaterThan(0);
    expect(dev.acceleration).toBeGreaterThan(0);
  });

  it('declines physical attributes after peak', () => {
    const baseAttrs = {
      pace: 16, acceleration: 15, stamina: 15, strength: 14, agility: 14, jumping: 13,
      passing: { short: 14, long: 12, crossing: 10, vision: 13, throughBall: 12 },
      shooting: { finishing: 13, power: 12, placement: 12, volleys: 10, penalties: 11, freeKicks: 10 },
      dribbling: { closeControl: 13, agility: 13, balance: 12, acceleration: 13 },
      firstTouch: 13, tackling: 11, heading: 12,
      pace: 16, acceleration: 15, stamina: 15, strength: 14, agility: 14, jumping: 13,
      composure: 14, decisions: 14, anticipation: 14, workRate: 13, flair: 10, leadership: 10, concentration: 12, aggression: 11, bravery: 12, determination: 12, teamwork: 12, positioning: 13
    } as any;

    const dev = PlayerDevelopment.calculateDevelopment(baseAttrs, 32, 0.6, 0.8, 'professional');

    // Physical should decline
    expect(dev.pace).toBeLessThanOrEqual(0);
    expect(dev.acceleration).toBeLessThanOrEqual(0);
  });
});