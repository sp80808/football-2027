export const SimulationConfig = {
  // ── Timing ───────────────────────────────────────────────────────────────
  SIMULATION_HZ: 120,
  get DT() {
    return 1 / this.SIMULATION_HZ;
  },

  // ── Pitch & Goals ────────────────────────────────────────────────────────
  PITCH_LENGTH: 105,
  PITCH_WIDTH: 68,
  get PITCH_HALF_LENGTH() {
    return this.PITCH_LENGTH / 2;
  },
  get PITCH_HALF_WIDTH() {
    return this.PITCH_WIDTH / 2;
  },
  GOAL_WIDTH: 7.32,
  GOAL_HEIGHT: 2.44,
  get GOAL_HALF_WIDTH() {
    return this.GOAL_WIDTH / 2;
  },

  // ── Ball Physics ─────────────────────────────────────────────────────────
  BALL_RADIUS: 0.11,
  BALL_MASS: 0.43,
  /**
   * Per-second rolling-friction multiplier on grass.
   * Applied as Math.pow(BALL_FRICTION, dt) each tick so it is rate-independent.
   * 0.965 ≈ lose ~3.5% speed per second — realistic short-grass roll.
   */
  BALL_FRICTION: 0.965,
  BALL_GRAVITY: 9.81,
  /** Coefficient of restitution on bounce (0 = dead, 1 = perfect). */
  BALL_BOUNCINESS: 0.62,
  /** Minimum vertical speed (m/s) below which bounce is killed (settles). */
  BALL_BOUNCE_DEAD_ZONE: 0.4,
  /** Horizontal air drag coefficient per second (multiplicative). */
  BALL_AIR_DRAG: 0.994,

  // ── Player Locomotion ─────────────────────────────────────────────────────
  PLAYER_MAX_SPEED: 6.5,    // m/s normal (FIFA-scale ~6-7 m/s)
  PLAYER_SPRINT_SPEED: 8.5, // m/s sprint
  PLAYER_ACCEL: 18.0,       // m/s² — snappy acceleration
  PLAYER_DECEL: 28.0,       // m/s² — quick stop

  /** Turn rate (rad/s) when nearly stationary — very agile. */
  PLAYER_TURN_SPEED_WALK: 14.0,
  /** Turn rate (rad/s) at full sprint — momentum limits rotation. */
  PLAYER_TURN_SPEED_SPRINT: 5.0,
  /** Legacy alias kept for any external references. */
  get PLAYER_TURN_SPEED() {
    return this.PLAYER_TURN_SPEED_WALK;
  },

  /** Radius within which the player considers the ball "under control". */
  PLAYER_CONTROL_RADIUS: 0.8,

  // ── Possession / Touch Cadence ───────────────────────────────────────────
  /** Target distance in front of player to push ball during dribble. */
  TOUCH_IDEAL_DIST: 0.4,
  /** Max nudge impulse applied each touch cadence tick (m/s contribution). */
  TOUCH_FORCE_MAX: 10.0,
  /** Seconds between discrete ball "touches" at walking pace. */
  TOUCH_CADENCE_MAX_INTERVAL: 0.40,
  /** Seconds between touches at full sprint. */
  TOUCH_CADENCE_MIN_INTERVAL: 0.10,
  /** Continuous soft centering gain (keeps ball tethered between touches). */
  TOUCH_TETHER_GAIN: 4.0,

  // ── Pass / Shoot ─────────────────────────────────────────────────────────
  /**
   * Pass and shot power are in N (force applied to ball).
   * ball.kick() divides by BALL_MASS (0.43 kg), so:
   *   PASS_POWER_BASE 7 N → ~16 m/s max pass speed (good for 20 m)
   *   SHOT_POWER_BASE 13 N → ~30 m/s max shot speed (strong but not ridiculous)
   */
  PASS_POWER_BASE: 7.0,
  SHOT_POWER_BASE: 13.0,
  MAX_CHARGE_TIME: 1.2,
  /** Minimum charge fraction so a tap still produces a kick. */
  MIN_CHARGE_FRACTION: 0.2,

  // ── Goalkeeper ───────────────────────────────────────────────────────────
  KEEPER_MAX_SPEED: 6.0,        // m/s lateral strafe
  KEEPER_DIVE_SPEED: 10.0,      // m/s during a diving save
  /** Seconds the keeper predicts ahead along ball trajectory. */
  KEEPER_LOOKAHEAD_TIME: 0.4,
  /** Distance at which keeper triggers a save response. */
  KEEPER_SAVE_RADIUS: 2.0,
  /** Distance at which keeper commits to a dive. */
  KEEPER_DIVE_TRIGGER_RADIUS: 4.5,
  /** Minimum ball speed (m/s) for a dive to be worth attempting. */
  KEEPER_DIVE_MIN_BALL_SPEED: 3.5,
  /** How long the keeper stays in dive state (seconds). */
  KEEPER_DIVE_DURATION: 0.55,
  /** How long the keeper takes to recover after a dive. */
  KEEPER_RECOVER_DURATION: 1.2,
};
