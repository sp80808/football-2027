/**
 * SimulationConfig — single source of truth for all tuning constants.
 * Keep values here rather than scattered in class files so AI Studio and
 * Replit edits converge in one place, and future Leva bindings are trivial.
 *
 * AI Studio note: add constants here; do not hard-code values inside classes.
 */
export const SimulationConfig = {
  // ── Timing ───────────────────────────────────────────────────────────────
  SIMULATION_HZ: 120,
  get DT() { return 1 / this.SIMULATION_HZ; },

  // ── Pitch & Goals ────────────────────────────────────────────────────────
  PITCH_LENGTH: 105,
  PITCH_WIDTH: 68,
  get PITCH_HALF_LENGTH() { return this.PITCH_LENGTH / 2; },
  get PITCH_HALF_WIDTH()  { return this.PITCH_WIDTH  / 2; },
  GOAL_WIDTH: 7.32,
  GOAL_HEIGHT: 2.44,
  get GOAL_HALF_WIDTH() { return this.GOAL_WIDTH / 2; },

  // ── Ball Physics ─────────────────────────────────────────────────────────
  BALL_RADIUS: 0.11,
  BALL_MASS: 0.43,
  /** Multiplicative friction applied per tick (120 Hz). 0.988 ≈ 85% loss/sec. */
  BALL_FRICTION: 0.988,
  BALL_GRAVITY: 9.81,
  BALL_BOUNCINESS: 0.6,
  /** Minimum vertical speed below which bounce is killed to let ball settle. */
  BALL_BOUNCE_DEAD_ZONE: 0.5,
  /** Per-tick air drag on horizontal components when ball is airborne. */
  BALL_AIR_DRAG: 0.9997,

  // ── Player Locomotion ─────────────────────────────────────────────────────
  PLAYER_MAX_SPEED: 7.0,    // m/s — normal run
  PLAYER_SPRINT_SPEED: 9.0, // m/s — sprint
  PLAYER_ACCEL: 15.0,       // m/s² — ground acceleration
  PLAYER_DECEL: 25.0,       // m/s² — braking deceleration

  /** Turn rate (rad/s) when stationary — very agile. */
  PLAYER_TURN_SPEED_WALK: 14.0,
  /** Turn rate (rad/s) at full sprint — momentum limits rotation. */
  PLAYER_TURN_SPEED_SPRINT: 5.0,
  /** Legacy alias kept for backward-compat. */
  get PLAYER_TURN_SPEED() { return this.PLAYER_TURN_SPEED_WALK; },

  /** Radius within which player has ball 'under_control'. */
  PLAYER_CONTROL_RADIUS: 0.8,

  // ── Possession / Touch Cadence ───────────────────────────────────────────
  /** Target distance in front of player to nudge ball during dribble. */
  TOUCH_IDEAL_DIST: 0.4,
  /** Maximum nudge impulse per cadence beat (m/s). */
  TOUCH_FORCE_MAX: 10.0,
  /** Seconds between discrete ball touches at walking pace. */
  TOUCH_CADENCE_MAX_INTERVAL: 0.40,
  /** Seconds between touches at full sprint. */
  TOUCH_CADENCE_MIN_INTERVAL: 0.10,
  /** Continuous soft tether gain keeping ball in range between touches. */
  TOUCH_TETHER_GAIN: 4.0,

  // ── Pass / Shoot ─────────────────────────────────────────────────────────
  PASS_POWER_BASE: 12.0,
  SHOT_POWER_BASE: 25.0,
  MAX_CHARGE_TIME: 1.5,
  /** Tap-kick produces at least this fraction of full power. */
  MIN_CHARGE_FRACTION: 0.15,

  // ── Goalkeeper ───────────────────────────────────────────────────────────
  KEEPER_MAX_SPEED: 5.5,
  KEEPER_DIVE_SPEED: 9.0,
  /** Seconds ahead that keeper predicts ball position. */
  KEEPER_LOOKAHEAD_TIME: 0.55,
  /** Distance (m) at which keeper triggers a save response. */
  KEEPER_SAVE_RADIUS: 1.6,
  /** Distance (m) at which keeper commits to a diving save. */
  KEEPER_DIVE_TRIGGER_RADIUS: 2.4,
  /** Minimum ball horizontal speed (m/s) to warrant a dive. */
  KEEPER_DIVE_MIN_BALL_SPEED: 4.0,
  /** How long (seconds) keeper stays locked in dive animation/motion. */
  KEEPER_DIVE_DURATION: 0.5,
};
