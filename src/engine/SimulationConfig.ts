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
  /** Per-tick rolling-friction multiplier (applied each 120Hz tick on ground). */
  BALL_FRICTION: 0.988,
  BALL_GRAVITY: 9.81,
  BALL_BOUNCINESS: 0.6,
  /** Minimum vertical speed below which bounce is killed. */
  BALL_BOUNCE_DEAD_ZONE: 0.5,
  /** Light air drag applied every tick while airborne (multiplicative). */
  BALL_AIR_DRAG: 0.9997,

  // ── Player Locomotion ─────────────────────────────────────────────────────
  PLAYER_MAX_SPEED: 7.0,    // m/s normal
  PLAYER_SPRINT_SPEED: 9.0, // m/s sprint
  PLAYER_ACCEL: 15.0,       // m/s² ground acceleration
  PLAYER_DECEL: 25.0,       // m/s² ground deceleration

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
  PASS_POWER_BASE: 12.0,
  SHOT_POWER_BASE: 25.0,
  MAX_CHARGE_TIME: 1.5,
  /** Minimum charge fraction so a tap still produces a kick. */
  MIN_CHARGE_FRACTION: 0.15,

  // ── Goalkeeper ───────────────────────────────────────────────────────────
  KEEPER_MAX_SPEED: 5.5,        // m/s lateral strafe
  KEEPER_DIVE_SPEED: 9.0,       // m/s during a diving save
  /** Seconds the keeper predicts ahead along ball trajectory. */
  KEEPER_LOOKAHEAD_TIME: 0.55,
  /** Distance at which keeper triggers a save response. */
  KEEPER_SAVE_RADIUS: 1.6,
  /** Distance at which keeper commits to a dive. */
  KEEPER_DIVE_TRIGGER_RADIUS: 2.4,
  /** Minimum ball speed (m/s) for a dive to be worth attempting. */
  KEEPER_DIVE_MIN_BALL_SPEED: 4.0,
  /** How long the keeper stays in dive state (seconds). */
  KEEPER_DIVE_DURATION: 0.5,
};
