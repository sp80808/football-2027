import {
  BallAction,
  ControllerFrame,
  PassModifier,
  PlayerIntent,
  ShotModifier,
  SkillMove,
  TouchAction,
} from './Intent';
import { Vec2 } from './Math';

export interface IntentParserConfig {
  fullChargeSeconds: number;
  sprintThreshold: number;
  shieldThreshold: number;
  knockOnThreshold: number;
  facingDeadZone: number;
}

const DEFAULT_CONFIG: IntentParserConfig = {
  fullChargeSeconds: 0.5,
  sprintThreshold: 0.55,
  shieldThreshold: 0.2,
  knockOnThreshold: 0.85,
  facingDeadZone: 0.15,
};

/**
 * Converts device-level ControllerFrame data into semantic, gameplay-facing intent.
 * Charge and held modifiers are accumulated at the fixed simulation timestep so the
 * result is deterministic and independent of browser render frequency.
 */
export class IntentParser {
  private readonly config: IntentParserConfig;
  private readonly moveDir = new Vec2();
  private readonly faceDir = new Vec2(0, 1);
  private passChargeSeconds = 0;
  private shotChargeSeconds = 0;
  private activePassModifier: PassModifier = 'none';
  private activeShotModifier: ShotModifier = 'none';

  constructor(config: Partial<IntentParserConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  reset(): void {
    this.moveDir.set(0, 0);
    this.faceDir.set(0, 1);
    this.passChargeSeconds = 0;
    this.shotChargeSeconds = 0;
    this.activePassModifier = 'none';
    this.activeShotModifier = 'none';
  }

  parse(frame: ControllerFrame, dt: number): PlayerIntent {
    this.copyNormalised(frame.leftStick, this.moveDir);

    if (frame.rightStick.mag() >= this.config.facingDeadZone) {
      this.copyNormalised(frame.rightStick, this.faceDir);
    } else if (this.moveDir.magSq() > 0) {
      this.faceDir.copy(this.moveDir);
    }

    if (frame.passHeld || frame.throughPassHeld) {
      this.passChargeSeconds += dt;
      this.activePassModifier = this.getPassModifier(frame);
    }
    if (frame.shootHeld) {
      this.shotChargeSeconds += dt;
      this.activeShotModifier = this.getShotModifier(frame);
    }

    const passModifier = frame.passReleased || frame.throughPassReleased
      ? this.activePassModifier
      : this.getPassModifier(frame);
    const shotModifier = frame.shootReleased
      ? this.activeShotModifier
      : this.getShotModifier(frame);
    const skillMove = this.getSkillMove(frame);
    const desiredTouch = this.getDesiredTouch(frame, skillMove);
    const action = this.getAction(frame, passModifier);

    const charge = action === 'shot'
      ? this.normaliseCharge(this.shotChargeSeconds)
      : action !== 'none'
        ? this.normaliseCharge(this.passChargeSeconds)
        : Math.max(
            frame.shootHeld ? this.normaliseCharge(this.shotChargeSeconds) : 0,
            frame.passHeld || frame.throughPassHeld ? this.normaliseCharge(this.passChargeSeconds) : 0,
          );

    const intent: PlayerIntent = {
      moveDir: this.moveDir.clone(),
      faceDir: this.faceDir.clone(),
      urgency: this.getUrgency(frame),
      desiredTouch,
      action,
      passModifier,
      shotModifier,
      skillMove,
      charge,
      isShielding: frame.shield >= this.config.shieldThreshold,
      cancelRequested:
        frame.shield >= this.config.shieldThreshold &&
        (frame.passHeld || frame.throughPassHeld || frame.shootHeld),
    };

    if (frame.passReleased || frame.throughPassReleased) {
      this.passChargeSeconds = 0;
      this.activePassModifier = 'none';
    }
    if (frame.shootReleased) {
      this.shotChargeSeconds = 0;
      this.activeShotModifier = 'none';
    }

    return intent;
  }

  private getAction(frame: ControllerFrame, passModifier: PassModifier): BallAction {
    if (frame.shootReleased) return 'shot';
    if (frame.throughPassReleased) {
      return passModifier === 'lob_through' ? 'lob_pass' : 'through_pass';
    }
    if (frame.passReleased) {
      if (passModifier === 'lob') return 'lob_pass';
      if (passModifier === 'driven') return 'driven_pass';
      return 'short_pass';
    }
    return 'none';
  }

  private getPassModifier(frame: ControllerFrame): PassModifier {
    if (frame.throughPassHeld && frame.lobHeld) return 'lob_through';
    if (frame.throughPassHeld) return 'through';
    if (frame.lobHeld) return 'lob';
    if (frame.drivenHeld) return 'driven';
    return 'none';
  }

  private getShotModifier(frame: ControllerFrame): ShotModifier {
    if (frame.lowDrivenTap) return 'low_driven';
    if (frame.chipHeld) return 'chip';
    if (frame.finesseHeld) return 'finesse';
    if (frame.shootHeld && this.normaliseCharge(this.shotChargeSeconds) >= 0.95) return 'power';
    return 'none';
  }

  private getSkillMove(frame: ControllerFrame): SkillMove {
    if (!frame.skillPressed) return 'none';
    if (
      frame.sprint >= this.config.sprintThreshold &&
      this.moveDir.mag() >= this.config.knockOnThreshold
    ) {
      return 'knock_on';
    }
    return this.moveDir.magSq() > 0.1 ? 'step_over' : 'ball_roll';
  }

  private getDesiredTouch(frame: ControllerFrame, skillMove: SkillMove): TouchAction {
    if (frame.shield >= this.config.shieldThreshold) return 'shield';
    if (
      skillMove === 'knock_on' ||
      (frame.sprint >= this.config.sprintThreshold &&
        this.moveDir.mag() >= this.config.knockOnThreshold)
    ) {
      return 'knock_on';
    }
    if (this.moveDir.magSq() < 0.05) return 'cushion';
    return 'push';
  }

  private getUrgency(frame: ControllerFrame): number {
    const movement = Math.min(1, frame.leftStick.mag());
    const sprintBoost = 1 + Math.max(0, Math.min(1, frame.sprint)) * 0.5;
    return Math.min(1, movement * sprintBoost);
  }

  private normaliseCharge(seconds: number): number {
    return Math.max(0, Math.min(1, seconds / this.config.fullChargeSeconds));
  }

  private copyNormalised(source: Vec2, target: Vec2): void {
    target.copy(source);
    if (target.magSq() > 1) target.normalize();
  }
}
