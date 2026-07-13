export const SimulationConfig = {
  // Timing
  SIMULATION_HZ: 120,
  get DT() {
    return 1 / this.SIMULATION_HZ;
  },

  // Dimensions
  PITCH_LENGTH: 105,
  PITCH_WIDTH: 68,
  get PITCH_HALF_LENGTH() {
    return this.PITCH_LENGTH / 2;
  },
  get PITCH_HALF_WIDTH() {
    return this.PITCH_WIDTH / 2;
  },
  GOAL_WIDTH: 7.32,
  get GOAL_HALF_WIDTH() {
    return this.GOAL_WIDTH / 2;
  },

  // Ball Tuning
  BALL_RADIUS: 0.11,
  BALL_MASS: 0.43,
  BALL_FRICTION: 0.98,
  BALL_GRAVITY: 9.81,
  BALL_BOUNCINESS: 0.6,

  // Player Tuning
  PLAYER_MAX_SPEED: 7.0, // m/s
  PLAYER_SPRINT_SPEED: 9.0, // m/s
  PLAYER_ACCEL: 15.0, // m/s^2
  PLAYER_DECEL: 25.0, // m/s^2
  PLAYER_TURN_SPEED: 10.0, // rad/s
  PLAYER_CONTROL_RADIUS: 0.8, // Distance for possession

  // Pass / Shoot
  PASS_POWER_BASE: 12.0,
  SHOT_POWER_BASE: 25.0,
  MAX_CHARGE_TIME: 1.5,
};
