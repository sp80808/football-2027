import { Vec2 } from './Math';
import { Footballer } from './Footballer';
import { Ball } from './Ball';
import { ControllerFrame } from './Intent';
import { SimulationConfig } from './SimulationConfig';

export class TeamLogic {
  team: 'home' | 'away';
  
  // Positional anchors for a 4-2-3-1 / 4-3-3 shape
  // Y-coordinates are relative to the team's defending half. 
  // Home attacks +Y, Away attacks -Y.
  private static POSITIONS = [
    { x: -18, y: 15 }, // LB
    { x: -8, y: 12 }, // LCB
    { x: 8, y: 12 },  // RCB
    { x: 18, y: 15 },  // RB
    { x: -12, y: 25 }, // LDM
    { x: 12, y: 25 },  // RDM
    { x: -22, y: 35 }, // LW
    { x: 0, y: 32 },   // CAM
    { x: 22, y: 35 },  // RW
    { x: 0, y: 45 },   // ST
  ];

  private tackleCooldowns: number[] = Array(10).fill(0);
  private passCooldowns: number[] = Array(10).fill(0);

  constructor(team: 'home' | 'away') {
    this.team = team;
  }

  update(
    dt: number,
    footballers: Footballer[],
    frames: ControllerFrame[],
    ball: Ball,
    activeId: number | null
  ) {
    const cfg = SimulationConfig;
    const directionMul = this.team === 'home' ? 1 : -1;
    
    // Determine if team has possession
    let teamHasPossession = false;
    for (let i = 0; i < 10; i++) {
      if (footballers[i].controlState === 'under_control') {
        teamHasPossession = true;
        break;
      }
    }

    const ballPos = new Vec2(ball.pos.x, ball.pos.y);

    for (let i = 0; i < 10; i++) {
      const f = footballers[i];
      const frame = frames[i];
      
      // Reset frame
      frame.leftStick.set(0, 0);
      frame.sprint = 0;
      frame.shield = 0;
      frame.passPressed = false;
      frame.passHeld = false;
      frame.passReleased = false;
      frame.shootPressed = false;
      frame.shootHeld = false;
      frame.shootReleased = false;
      frame.tacklePressed = false;
      frame.slidePressed = false;

      // Skip AI logic for the human-controlled player
      if (activeId === i) continue;

      if (this.tackleCooldowns[i] > 0) this.tackleCooldowns[i] -= dt;
      if (this.passCooldowns[i] > 0) this.passCooldowns[i] -= dt;

      const distToBall = f.pos.distanceTo(ballPos);

      // AI Behaviour
      if (f.controlState === 'under_control') {
        // Attack logic
        // 1. Shoot if close to goal
        const goalY = this.team === 'home' ? cfg.PITCH_HALF_LENGTH : -cfg.PITCH_HALF_LENGTH;
        const distToGoal = Math.hypot(0 - f.pos.x, goalY - f.pos.y);
        
        if (distToGoal < 28 && this.passCooldowns[i] <= 0) {
          // Shoot!
          frame.shootHeld = true;
          frame.shootReleased = f.chargeStart > cfg.MAX_CHARGE_TIME * 0.5;
          frame.leftStick.set(0 - f.pos.x, goalY - f.pos.y).normalize();
          this.passCooldowns[i] = 1.0;
        } else if (this.passCooldowns[i] <= 0) {
          // Dribble towards goal
          frame.leftStick.set(0 - f.pos.x, goalY - f.pos.y).normalize();
          if (distToGoal > 40) frame.sprint = 1;
        }
      } else if (!teamHasPossession) {
        // Defensive logic
        if (distToBall < 15) {
          // Press ball
          frame.leftStick.set(ball.pos.x - f.pos.x, ball.pos.y - f.pos.y).normalize();
          if (distToBall > 3) frame.sprint = 1;
          
          if (distToBall < 1.5 && this.tackleCooldowns[i] <= 0) {
            frame.tacklePressed = true;
            this.tackleCooldowns[i] = 1.0;
          }
        } else {
          // Track back to position
          const anchor = TeamLogic.POSITIONS[i];
          const targetX = anchor.x;
          // Y is relative to defending half, so shift from center
          const targetY = this.team === 'home' ? -cfg.PITCH_HALF_LENGTH + anchor.y : cfg.PITCH_HALF_LENGTH - anchor.y;
          
          const dx = targetX - f.pos.x;
          const dy = targetY - f.pos.y;
          const distToTarget = Math.hypot(dx, dy);
          
          if (distToTarget > 1.0) {
            frame.leftStick.set(dx, dy).normalize();
            if (distToTarget > 10) frame.sprint = 1;
          }
        }
      } else {
        // Attacking off-ball logic
        const anchor = TeamLogic.POSITIONS[i];
        const targetX = anchor.x;
        // Shift Y up the pitch
        const targetY = this.team === 'home' ? -cfg.PITCH_HALF_LENGTH + anchor.y + 30 : cfg.PITCH_HALF_LENGTH - anchor.y - 30;
        
        const dx = targetX - f.pos.x;
        const dy = targetY - f.pos.y;
        const distToTarget = Math.hypot(dx, dy);
        
        if (distToTarget > 1.0) {
          frame.leftStick.set(dx, dy).normalize();
          if (distToTarget > 15) frame.sprint = 1;
        }
      }
    }
  }
}
