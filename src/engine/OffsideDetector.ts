import { Vec2 } from './Math';
import { Ball } from './Ball';
import { Player } from './Player';
import { SimulationConfig } from './SimulationConfig';

export type OffsideCheckResult = {
  isOffside: boolean;
  attackerId: number;
  defenderIds: number[];
  offsideLine: number;
  ballPosition: Vec2;
};

/**
 * Offside Detection System
 * Implements FIFA Laws of the Game Law 11 - Offside
 */
export class OffsideDetector {
  private lastOffsideResult: OffsideCheckResult | null = null;

  /**
   * Check if an attacker is in an offside position
   * @param ballPosition Position of the ball when played
   * @param attackers Array of attacking players (team with ball)
   * @param defenders Array of defending players (opposing team)
   * @param attackingDirection 1 for attacking positive Y, -1 for negative Y
   */
  checkOffside(
    ballPosition: Vec2,
    attackers: Array<{ id: number; pos: Vec2; involvedInPlay: boolean }>,
    defenders: Array<{ id: number; pos: Vec2 }>,
    attackingDirection: 1 | -1 = 1
  ): OffsideCheckResult | null {
    // Find the second-last defender (including goalkeeper)
    const sortedDefenders = [...defenders].sort((a, b) => {
      return attackingDirection === 1
        ? a.pos.y - b.pos.y
        : b.pos.y - a.pos.y;
    });

    if (sortedDefenders.length < 2) return null; // Need at least 2 defenders

    const secondLastDefender = sortedDefenders[1];
    const offsideLine = secondLastDefender.pos.y;

    // Check each attacker
    for (const attacker of attackers) {
      if (!attacker.involvedInPlay) continue;

      const isAheadOfBall = attackingDirection === 1
        ? attacker.pos.y > ballPosition.y
        : attacker.pos.y < ballPosition.y;

      const isAheadOfSecondLast = attackingDirection === 1
        ? attacker.pos.y > offsideLine
        : attacker.pos.y < offsideLine;

      // Offside position: ahead of ball AND ahead of second-last defender
      const inOffsidePosition = isAheadOfBall && isAheadOfSecondLast;

      // Check if in active play (interfering, gaining advantage, interfering with opponent)
      if (inOffsidePosition && this.isInActivePlay(attacker, ballPosition, defenders)) {
        this.lastOffsideResult = {
          isOffside: true,
          attackerId: attacker.id,
          defenderIds: [sortedDefenders[0].id, secondLastDefender.id],
          offsideLine,
          ballPosition: ballPosition.clone(),
        };
        return this.lastOffsideResult;
      }
    }

    this.lastOffsideResult = {
      isOffside: false,
      attackerId: -1,
      defenderIds: [sortedDefenders[0].id, sortedDefenders[1].id],
      offsideLine,
      ballPosition: ballPosition.clone(),
    };
    return this.lastOffsideResult;
  }

  /**
   * Determine if attacker is actively involved in play
   * Per FIFA: interfering with play, interfering with opponent, gaining advantage
   */
  private isInActivePlay(
    attacker: { id: number; pos: Vec2; involvedInPlay: boolean },
    ballPosition: Vec2,
    defenders: Array<{ id: number; pos: Vec2 }>
  ): boolean {
    // 1. Interfering with play: touches ball or is in path of ball
    const distanceToBall = attacker.pos.distanceTo(ballPosition);
    if (distanceToBall < 5) return true; // Within 5m of ball path

    // 2. Interfering with opponent: obstructing line of vision, challenging for ball
    for (const defender of defenders) {
      const distToDefender = attacker.pos.distanceTo(defender.pos);
      if (distToDefender < 2) return true; // Challenging/obstructing
    }

    // 3. Gaining advantage: rebounds from post/bar/defender
    // This would require tracking ball history - simplified here

    return attacker.involvedInPlay;
  }

  getLastResult(): OffsideCheckResult | null {
    return this.lastOffsideResult;
  }

  /**
   * Visual offside line for rendering
   */
  getOffsideLine(
    attackers: Array<{ pos: Vec2 }>,
    defenders: Array<{ pos: Vec2 }>,
    attackingDirection: 1 | -1 = 1
  ): number | null {
    const sortedDefenders = [...defenders].sort((a, b) => {
      return attackingDirection === 1
        ? a.pos.y - b.pos.y
        : b.pos.y - a.pos.y;
    });
    if (sortedDefenders.length < 2) return null;
    return sortedDefenders[1].pos.y;
  }
}

// Export singleton for game engine
export const offsideDetector = new OffsideDetector();