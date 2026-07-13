# Physics Engine Documentation

## Overview
The Football Engine 2027 physics system implements a deterministic, fixed-timestep simulation at 120 Hz with realistic ball dynamics, player locomotion, and collision resolution.

---

## Ball Physics (`Ball.ts`)

### State Variables
```typescript
pos: Vec3     // x, y (pitch plane), z (height)
vel: Vec3     // Linear velocity
spin: Vec3    // Angular velocity (rad/s) - NEW
```

### Forces Applied Per Tick

#### Gravity
```typescript
if (pos.z > 0) {
  vel.z -= BALL_GRAVITY * dt;  // 9.81 m/s²
}
```

#### Aerodynamic Drag (Quadratic)
```typescript
const speed = vel.mag();
if (speed > 0) {
  const dragForce = 0.5 * airDensity * speed² * crossSection * DRAG_COEFF;
  const dragAccel = dragForce / mass;
  vel.mul(max(0, 1 - dragAccel * dt / speed));
}
```

#### Magnus Effect (Spin-Induced Curve)
```typescript
// F = 0.5 * ρ * v² * A * Cl * (ω × v̂)
const CL = 0.25;  // Lift coefficient for spinning sphere
const speed = vel.mag();
if (speed > 0.1 && spin.mag() > 0) {
  const vHat = vel.clone().normalize();
  const spinCrossVel = spin.cross(vHat);
  const magnusAccel = 0.5 * airDensity * speed² * crossSection * CL / mass;
  vel.add(spinCrossVel.mul(magnusAccel * dt));
}
```

#### Spin Decay
```typescript
// Air resistance torque: τ = -k * ω
// Ground friction torque when rolling
const decayRate = AIR_DECAY + (pos.z <= radius ? GROUND_DECAY : 0);
spin.mul(exp(-decayRate * dt));
```

### Ground Collision
```typescript
if (pos.z < radius) {
  pos.z = radius;
  
  // Restitution
  const impactSpeed = -vel.z;
  if (impactSpeed > 0) {
    vel.z = impactSpeed * BOUNCINESS;
    
    // Spin generation from tangential friction
    const tangentialSpeed = sqrt(vel.x² + vel.y²);
    if (tangentialSpeed > 0.1) {
      const frictionImpulse = impactSpeed * 0.3 * BALL_FRICTION;
      const spinAxis = new Vec3(-vel.y, vel.x, 0).normalize();
      const spinGain = frictionImpulse / (mass * radius);
      spin.add(spinAxis.mul(spinGain));
    }
    
    // Dead zone
    if (abs(vel.z) < BOUNCE_DEAD_ZONE) vel.z = 0;
  }
}
```

### Ground Friction
```typescript
if (pos.z <= radius) {
  const frictionMultiplier = pow(BALL_FRICTION * surfaceFriction, dt);
  vel.x *= frictionMultiplier;
  vel.y *= frictionMultiplier;
}
```

### Environmental Factors
| Factor | Effect | Range |
|--------|--------|-------|
| Altitude | ↓ air density → less drag, less Magnus | 0-3000m |
| Temperature | ↓ temp → ↑ density → more drag | -10°C to 35°C |
| Humidity | Minor density effect | 0-100% |
| Wet Surface | ↓ friction 30% | boolean |
| Grass Length | ↑ friction, ↑ ball roll resistance | enum |

### Configuration Constants
```typescript
BALL_RADIUS: 0.11           // m
BALL_MASS: 0.43             // kg
BALL_GRAVITY: 9.81          // m/s²
BALL_BOUNCINESS: 0.62       // Coefficient of restitution
BALL_BOUNCE_DEAD_ZONE: 0.4  // m/s
BALL_FRICTION: 0.965        // Per-second multiplier
BALL_AIR_DRAG: 0.994        // Drag coefficient component
BALL_BOUNCE_DEAD_ZONE: 0.4  // m/s minimum bounce
```

---

## Player Locomotion (`Player.ts`)

### State Variables
```typescript
pos: Vec2      // Pitch position (x, y)
vel: Vec2      // Linear velocity
facing: Vec2   // Body orientation (normalized)
controlState: BallControlState
```

### Locomotion Model

#### Acceleration
```typescript
if (moveInput.magSq() > 0.01) {
  const accel = moveDir.normalize().mul(PLAYER_ACCEL * dt);
  vel.add(accel);
  
  // Speed cap
  const maxSpeed = isSprinting ? PLAYER_SPRINT_SPEED : PLAYER_MAX_SPEED;
  if (vel.magSq() > maxSpeed²) vel.normalize().mul(maxSpeed);
}
```

#### Deceleration
```typescript
if (moveInput.magSq() < 0.01 && vel.mag() > 0) {
  const drop = min(vel.mag(), PLAYER_DECEL * dt);
  vel.normalize().mul(vel.mag() - drop);
}
```

#### Turning (Momentum-Based)
```typescript
const speedRatio = clamp(vel.mag() / PLAYER_SPRINT_SPEED, 0, 1);
const turnSpeed = PLAYER_TURN_SPEED_WALK + 
  (PLAYER_TURN_SPEED_SPRINT - PLAYER_TURN_SPEED_WALK) * speedRatio;

if (shielding) turnSpeed *= 0.5;  // Shielding reduces turn rate

facing.x += (targetFacing.x - facing.x) * turnSpeed * dt;
facing.y += (targetFacing.y - facing.y) * turnSpeed * dt;
facing.normalize();
```

#### Position Integration
```typescript
pos.add(vel.clone().mul(dt));
```

### Ball Control States
| State | Condition | Behavior |
|-------|-----------|----------|
| `free` | Ball far, no control | No interaction |
| `loose_nearby` | Ball within 2× radius | Can intercept |
| `under_control` | Ball within radius, grounded | Full control |
| `shielding` | Shield held + ball near | Body between ball/opponent |
| `receiving` | Ball incoming, anticipating | Soft first touch |
| `stretching` | Reaching for ball | Extended reach |
| `shooting_preparation` | Charging shot | Locked animation |

### Touch Cadence System
```typescript
// Continuous tether (every tick)
const tetherPos = idealBallPosition(touchStyle);
const toTether = tetherPos - ball.pos;
if (toTether.mag() > 0.02) {
  ball.vel += (vel + toTether.normalize() * tetherForce - ball.vel) * 8 * dt;
}

// Discrete touch (every cadence interval)
const speedRatio = clamp(vel.mag() / PLAYER_SPRINT_SPEED, 0, 1);
const cadenceInterval = TOUCH_CADENCE_MAX - (TOUCH_CADENCE_MAX - TOUCH_CADENCE_MIN) * speedRatio;

if (touchTimer >= cadenceInterval) {
  touchTimer = 0;
  applyDiscreteTouch(touchStyle, ball);
}
```

### Touch Styles
| Style | Trigger | Ball Position | Force |
|-------|---------|---------------|-------|
| `knock_on` | Sprinting | 3.5× distance ahead | 1.1× multiplier |
| `push` | Normal | 1× distance ahead | Normal |
| `cushion` | Slow/stopped | 0.5× distance | Soft |
| `shield` | Shielding | Behind player | Strong hold |

### Kick Physics
```typescript
const power = chargeType === 'shoot' ? SHOT_POWER_BASE : PASS_POWER_BASE;
const multiplier = max(MIN_CHARGE_FRACTION, chargeTime / MAX_CHARGE_TIME);

const lift = chargeType === 'shoot'
  ? 3.0 * multiplier
  : isThroughPass ? 2.5 * multiplier : 0.5 * multiplier;

ball.kick(Vec3(facing.x * power * multiplier, facing.y * power * multiplier, lift));
```

### Configuration
```typescript
PLAYER_MAX_SPEED: 6.5           // m/s
PLAYER_SPRINT_SPEED: 8.5        // m/s
PLAYER_ACCEL: 18.0              // m/s²
PLAYER_DECEL: 28.0              // m/s²
PLAYER_TURN_SPEED_WALK: 14.0    // rad/s
PLAYER_TURN_SPEED_SPRINT: 5.0   // rad/s
PLAYER_CONTROL_RADIUS: 0.8      // m

TOUCH_IDEAL_DIST: 0.4           // m
TOUCH_FORCE_MAX: 10.0           // N
TOUCH_CADENCE_MAX: 0.40         // s
TOUCH_CADENCE_MIN: 0.10         // s
TOUCH_TETHER_GAIN: 4.0

PASS_POWER_BASE: 7.0            // m/s base
SHOT_POWER_BASE: 13.0           // m/s base
MAX_CHARGE_TIME: 1.2            // s
MIN_CHARGE_FRACTION: 0.2        // 20%
```

---

## Collision System

### Player-Player Collision
```typescript
// Impulse-based resolution
const normal = (p1.pos - p2.pos).normalize();
const relativeVel = p1.vel - p2.vel;
const sepVel = relativeVel.dot(normal);

if (sepVel < 0) {  // Approaching
  const restitution = 0.3;
  const impulse = -(1 + restitution) * sepVel / (1/m1 + 1/m2);
  const impulseVec = normal.mul(impulse);
  
  p1.vel.add(impulseVec.mul(1/m1));
  p2.vel.sub(impulseVec.mul(1/m2));
  
  // Position separation
  const overlap = (r1 + r2) - distance;
  const correction = normal.mul(overlap * 0.5);
  p1.pos.add(correction);
  p2.pos.sub(correction);
}
```

### Player-Ball Collision
- Handled through possession logic in `Player.updateBallInteraction()`
- Soft possession: tether force when ball within control radius
- Hard collision: kick impulse when charging shot/pass

### Boundary Enforcement
```typescript
// Pitch boundaries with restitution
const inGoalMouth = abs(ball.x) <= GOAL_HALF_WIDTH && ball.z <= GOAL_HEIGHT;

if (!inGoalMouth) {
  if (ball.x > HALF_WIDTH)  { ball.x = HALF_WIDTH;  ball.vel.x *= -0.55; }
  if (ball.x < -HALF_WIDTH) { ball.x = -HALF_WIDTH; ball.vel.x *= -0.55; }
  if (ball.y > HALF_LENGTH) { ball.y = HALF_LENGTH; ball.vel.y *= -0.55; }
  if (ball.y < -HALF_LENGTH) { ball.y = -HALF_LENGTH; ball.vel.y *= -0.55; }
}

// Player clamping
player.x = clamp(player.x, -HALF_WIDTH, HALF_WIDTH);
player.y = clamp(player.y, -HALF_LENGTH, HALF_LENGTH);
```

---

## Goal Detection
```typescript
const inGoalMouth = abs(ball.x) <= GOAL_HALF_WIDTH && ball.z <= GOAL_HEIGHT;

if (inGoalMouth) {
  if (ball.y >= HALF_LENGTH) {  // Player goal
    scorePlayer++;
    triggerGoal('player');
  } else if (ball.y <= -HALF_LENGTH) {  // Opponent goal
    scoreOpponent++;
    triggerGoal('opponent');
  }
}
```

---

## Determinism

### Seeded Random
```typescript
class SeededRandom {
  constructor(seed = 12345) { this.state = seed; }
  next(): number {
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 4294967296;
  }
}
```

### Fixed Timestep Loop
```typescript
const dt = 1 / 120;  // 120 Hz
accumulator += min(frameTime, 0.25);  // Spiral-of-death protection

while (accumulator >= dt) {
  previousState = clone(currentState);
  tick(dt);
  captureState(currentState);
  replayBuffer.push(clone(currentState));
  accumulator -= dt;
  ticksThisSecond++;
}

const alpha = accumulator / dt;
renderState = interpolate(previousState, currentState, alpha);
```

### Interpolation
```typescript
function interpolate(prev, next, alpha) {
  const out = clone(next);
  
  // Position interpolation
  out.player.pos.lerp(prev.player.pos, next.player.pos, alpha);
  out.ball.pos.lerp(prev.ball.pos, next.ball.pos, alpha);
  
  // Facing interpolation (slerp equivalent for 2D)
  out.player.facing.lerp(prev, next, alpha).normalize();
  
  // Discrete values from next
  out.player.controlState = next.player.controlState;
  // ... other discrete
  
  return out;
}
```

---

## Performance

### Targets
- **Tick time**: < 1ms average, < 2ms worst-case
- **GC pressure**: Zero per-tick allocations
- **Memory**: Stable, no leaks over 1000+ ticks

### Optimizations
1. **Object pooling** - All `WorldState`, `Vec2`, `Vec3` pre-allocated
2. **Ring buffer** - `ReplayBuffer` with pre-allocated slots
3. **In-place mutation** - `interpolateInto()` writes to pre-allocated output
4. **No JSON** - Binary state transfer only

### Allocation-Free Pattern
```typescript
// Before (allocates)
prevState = cloneWorldState(currState);
tick();
captureState(currState);
replayBuffer.push(cloneWorldState(currState));
renderState = interpolateWorldState(prev, curr, alpha);

// After (zero alloc)
swap(prev, curr);
tick();
captureState(curr);
replayBuffer.record(curr);
renderState = interpolateInto(renderState, prev, curr, alpha);
```

---

## Testing

### Determinism Tests
```typescript
it('produces identical results with same seed', () => {
  const run = () => {
    const e = new GameEngine(); e.init();
    for (let t = 16; t <= 2000; t += 16) e.update(t);
    return e.getRenderState();
  };
  expect(run().ball.pos.x).toBeCloseTo(run().ball.pos.x, 6);
});
```

### Physics Validation
```typescript
it('ball settles after repeated bounces', () => {
  const ball = new Ball();
  ball.pos.set(0, 0, 5);
  for (let i = 0; i < 600; i++) ball.update(1/120);
  expect(ball.pos.z).toBeCloseTo(0.11, 1);
  expect(abs(ball.vel.z)).toBeLessThan(0.5);
});
```

### Performance Benchmarks
```typescript
it('1000 simulated seconds under 1 second', () => {
  const engine = new GameEngine(); engine.init();
  const start = performance.now();
  for (let i = 0; i < 1000; i++) engine.update(i * 1000);
  expect(performance.now() - start).toBeLessThan(1000);
});
```

---

## Future Extensions

1. **Soft-body ball deformation** - FEM or pressure-based
2. **Muscle-driven locomotion** - Hill-type muscle models
3. **Terrain deformation** - Divots, mud patches
4. **Cloth-ball interaction** - Net physics, shirt tugging
5. **Fluid dynamics** - Rain puddles, splashing