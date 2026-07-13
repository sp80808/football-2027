import { describe, it, expect } from 'vitest';
import { MatchManager } from '../src/engine/MatchManager';
import { Ball } from '../src/engine/Ball';
import { Player } from '../src/engine/Player';
import { Keeper } from '../src/engine/Keeper';
import { SimulationConfig } from '../src/engine/SimulationConfig';

describe('MatchManager', () => {
  it('detects goal when ball crosses the line', () => {
    const match = new MatchManager();
    const ball = new Ball();
    const player = new Player();
    const keeper = new Keeper();

    match.init();
    match.state.phase = 'playing';

    ball.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH + 0.5, 0.5);
    ball.vel.set(0, 5, 0);

    match.update(1 / 120, ball, player, keeper);

    expect(match.state.homeScore).toBe(1);
    expect(match.state.phase).toBe('goal');
  });

  it('resets for kickoff after goal celebration', () => {
    const match = new MatchManager();
    const ball = new Ball();
    const player = new Player();
    const keeper = new Keeper();

    match.init();
    match.state.phase = 'playing';

    ball.pos.set(0, SimulationConfig.PITCH_HALF_LENGTH + 0.5, 0.5);
    ball.vel.set(0, 5, 0);
    match.update(1 / 120, ball, player, keeper);

    expect(match.state.phase).toBe('goal');

    for (let i = 0; i < 400; i++) {
      match.update(1 / 120, ball, player, keeper);
    }

    expect(match.state.phase).toBe('kickoff');
    expect(ball.pos.x).toBe(0);
    expect(player.pos.y).toBe(-5);
  });

  it('enters halftime with countdown then resumes second half', () => {
    const match = new MatchManager();
    const ball = new Ball();
    const player = new Player();
    const keeper = new Keeper();
    const cfg = SimulationConfig;

    match.init();
    match.state.phase = 'playing';
    match.state.matchTime = cfg.MATCH_DURATION_SECONDS / 2;

    match.update(1 / 120, ball, player, keeper);
    expect(match.state.phase).toBe('halftime');
    expect(match.state.periodCountdown).toBeGreaterThan(0);

    for (let i = 0; i < Math.ceil(cfg.HALFTIME_SECONDS * 120) + 5; i++) {
      match.update(1 / 120, ball, player, keeper);
      if (match.state.phase === 'kickoff') break;
    }

    expect(match.state.half).toBe(2);
    expect(match.state.phase).toBe('kickoff');
  });

  it('ends match at full time', () => {
    const match = new MatchManager();
    const ball = new Ball();
    const player = new Player();
    const keeper = new Keeper();
    const cfg = SimulationConfig;

    match.init();
    match.state.phase = 'playing';
    match.state.half = 2;
    match.state.matchTime = cfg.MATCH_DURATION_SECONDS;

    match.update(1 / 120, ball, player, keeper);
    expect(match.state.phase).toBe('full_time');
    expect(match.state.announcement).toBe('FULL TIME');
  });

  it('rematch resets scores and begins kickoff countdown', () => {
    const match = new MatchManager();
    const ball = new Ball();
    const player = new Player();
    const keeper = new Keeper();

    match.init();
    match.state.phase = 'full_time';
    match.state.homeScore = 2;
    match.state.awayScore = 1;

    match.rematch();
    expect(match.state.homeScore).toBe(0);
    expect(match.state.awayScore).toBe(0);
    expect(match.state.phase).toBe('kickoff');
    expect(match.state.periodCountdown).toBeGreaterThan(0);
  });
});
