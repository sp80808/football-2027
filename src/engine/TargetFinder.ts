import { Vec2 } from './Math';
import { Footballer } from './Footballer';
import { SimulationConfig } from './SimulationConfig';

export class TargetFinder {
  /**
   * Finds the best teammate to pass to based on the stick direction.
   */
  static findPassTarget(
    passerId: number,
    passerPos: Vec2,
    intentDir: Vec2,
    teammates: Footballer[]
  ): number | null {
    if (intentDir.magSq() < 0.01) return null;

    let bestId: number | null = null;
    let bestScore = -Infinity;
    
    // Normalize intended direction
    const dir = intentDir.clone().normalize();

    for (const mate of teammates) {
      if (mate.id === passerId) continue;

      const toMate = new Vec2(mate.pos.x - passerPos.x, mate.pos.y - passerPos.y);
      const dist = toMate.mag();
      
      // Ignore players too close (under 2m) or too far (over 60m)
      if (dist < 2.0 || dist > 60.0) continue;

      toMate.normalize();
      const dot = dir.dot(toMate);

      // Must be within roughly 45 degrees of the stick direction
      if (dot > 0.707) {
        // Score is primarily based on angle, with a tiny distance tie-breaker 
        // to prefer closer players if angles are identical.
        const score = dot - (dist * 0.001);
        if (score > bestScore) {
          bestScore = score;
          bestId = mate.id;
        }
      }
    }

    return bestId;
  }

  /**
   * Snaps the shot direction to the left or right post of the target goal.
   */
  static getShotTarget(
    passerPos: Vec2,
    intentDir: Vec2,
    isHomeTeam: boolean
  ): Vec2 {
    const cfg = SimulationConfig;
    const goalY = isHomeTeam ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
    const postX = 3.5; // Slightly inside the 3.66m post

    // If they aren't aiming at all, just shoot center
    if (intentDir.magSq() < 0.01) {
      return new Vec2(0, goalY);
    }

    // Determine if the stick is pointing left or right of the center of the pitch
    // Actually, it's better to check if the stick aims towards the left or right post
    const isAimingRight = intentDir.x > 0;
    
    const targetX = isAimingRight ? postX : -postX;
    return new Vec2(targetX, goalY);
  }
}
