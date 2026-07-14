import { Howl, Howler } from 'howler';
import {
  generateKickSound,
  generateGoalSound,
  generateWhistleSound,
  generateBounceSound,
  generateCrowdAmbience,
  generateCrowdTension,
  generateCrowdCheer,
  generateCrowdGasp,
  generateCrowdGroan,
  generateFootstepSound,
  generateSlideSound,
  generateSaveSound,
  generatePostHitSound,
  generatePitchCallSound,
  generateSoftKickSound,
} from './generateSounds';

export type CrowdReactionType = 'cheer' | 'gasp' | 'groan' | 'tension_up' | 'tension_down';

export class AudioManager {
  private enabled = true;
  private initialized = false;
  private kick!: Howl;
  private softKick!: Howl;
  private goal!: Howl;
  private whistle!: Howl;
  private bounce!: Howl;
  private crowd!: Howl;
  private crowdTension!: Howl;
  private footstep!: Howl;
  private slide!: Howl;
  private save!: Howl;
  private postHit!: Howl;
  private pitchCall!: Howl;
  private cheer!: Howl;
  private gasp!: Howl;
  private groan!: Howl;

  private crowdBaseVolume = 0.15;
  private crowdTensionVolume = 0;
  private crowdTensionTarget = 0;
  private commentaryDucking = false;
  private lastBounceTime = 0;
  private lastFootstepTime = 0;
  private lastPitchCallTime = 0;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.kick = new Howl({ src: [generateKickSound()], volume: 0.6 });
    this.softKick = new Howl({ src: [generateSoftKickSound()], volume: 0.35 });
    this.goal = new Howl({ src: [generateGoalSound()], volume: 0.7 });
    this.whistle = new Howl({ src: [generateWhistleSound()], volume: 0.5 });
    this.bounce = new Howl({ src: [generateBounceSound()], volume: 0.25 });
    this.crowd = new Howl({
      src: [generateCrowdAmbience()],
      volume: this.crowdBaseVolume,
      loop: true,
    });
    this.crowdTension = new Howl({
      src: [generateCrowdTension()],
      volume: 0,
      loop: true,
    });
    this.footstep = new Howl({ src: [generateFootstepSound()], volume: 0.12 });
    this.slide = new Howl({ src: [generateSlideSound()], volume: 0.4 });
    this.save = new Howl({ src: [generateSaveSound()], volume: 0.45 });
    this.postHit = new Howl({ src: [generatePostHitSound()], volume: 0.5 });
    this.pitchCall = new Howl({ src: [generatePitchCallSound()], volume: 0.18 });
    this.cheer = new Howl({ src: [generateCrowdCheer()], volume: 0.5 });
    this.gasp = new Howl({ src: [generateCrowdGasp()], volume: 0.35 });
    this.groan = new Howl({ src: [generateCrowdGroan()], volume: 0.4 });
  }

  setCommentaryDucking(ducking: boolean) {
    this.commentaryDucking = ducking;
    if (!this.initialized) return;
    this.crowd?.volume(ducking ? this.crowdBaseVolume * 0.35 : this.crowdBaseVolume);
    this.crowdTension?.volume(ducking ? this.crowdTensionVolume * 0.35 : this.crowdTensionVolume);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.crowd?.stop();
      this.crowdTension?.stop();
    } else if (this.initialized) {
      this.crowd?.play();
      this.crowdTension?.play();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  unlock() {
    this.init();
    if (this.enabled) {
      this.crowd?.play();
      this.crowdTension?.play();
    }
  }

  playKick(power = 1) {
    if (!this.enabled || !this.initialized) return;
    if (power < 0.35) {
      this.softKick.volume(Math.min(0.5, 0.15 + power * 0.5));
      this.softKick.play();
    } else {
      this.kick.volume(Math.min(0.9, 0.3 + power * 0.4));
      this.kick.play();
    }
  }

  playGoal() {
    if (!this.enabled || !this.initialized) return;
    this.goal.play();
    this.crowdReaction('cheer', 1);
    if (!this.commentaryDucking) {
      this.crowd?.volume(0.4);
      setTimeout(() => {
        if (!this.commentaryDucking) this.crowd?.volume(this.crowdBaseVolume);
      }, 3000);
    }
  }

  playWhistle() {
    if (!this.enabled || !this.initialized) return;
    this.whistle.play();
  }

  playBounce(intensity = 1) {
    if (!this.enabled || !this.initialized) return;
    const now = performance.now();
    if (now - this.lastBounceTime < 80) return;
    this.lastBounceTime = now;
    this.bounce.volume(Math.min(0.5, 0.15 + intensity * 0.2));
    this.bounce.play();
  }

  playSlide() {
    if (!this.enabled || !this.initialized) return;
    this.slide.play();
  }

  playSave() {
    if (!this.enabled || !this.initialized) return;
    this.save.play();
    this.crowdReaction('gasp', 0.6);
  }

  playPostHit() {
    if (!this.enabled || !this.initialized) return;
    this.postHit.play();
    this.crowdReaction('gasp', 0.8);
  }

  playFootstep(intensity = 1) {
    if (!this.enabled || !this.initialized) return;
    const now = performance.now();
    const interval = 350 - intensity * 200;
    if (now - this.lastFootstepTime < interval) return;
    this.lastFootstepTime = now;
    this.footstep.volume(Math.min(0.2, 0.06 + intensity * 0.1));
    this.footstep.play();
  }

  playPitchCall() {
    if (!this.enabled || !this.initialized) return;
    const now = performance.now();
    if (now - this.lastPitchCallTime < 4000) return;
    this.lastPitchCallTime = now;
    this.pitchCall.play();
  }

  /** Reactive crowd reaction — plays a one-shot response to game events. */
  crowdReaction(type: CrowdReactionType, intensity = 1) {
    if (!this.enabled || !this.initialized) return;
    switch (type) {
      case 'cheer':
        this.cheer.volume(Math.min(0.7, 0.3 + intensity * 0.4));
        this.cheer.play();
        break;
      case 'gasp':
        this.gasp.volume(Math.min(0.5, 0.2 + intensity * 0.3));
        this.gasp.play();
        break;
      case 'groan':
        this.groan.volume(Math.min(0.6, 0.25 + intensity * 0.35));
        this.groan.play();
        break;
      case 'tension_up':
        this.crowdTensionTarget = Math.min(0.25, this.crowdTensionTarget + 0.08 * intensity);
        break;
      case 'tension_down':
        this.crowdTensionTarget = Math.max(0, this.crowdTensionTarget - 0.06 * intensity);
        break;
    }
  }

  /** Smoothly ramp the tension bed toward its target volume. Call each frame. */
  updateCrowd(dt: number) {
    if (!this.enabled || !this.initialized) return;
    const rate = 0.8;
    this.crowdTensionVolume += (this.crowdTensionTarget - this.crowdTensionVolume) * Math.min(1, rate * dt);
    this.crowdTension.volume(this.commentaryDucking ? this.crowdTensionVolume * 0.35 : this.crowdTensionVolume);
    // Decay tension target slowly over time
    this.crowdTensionTarget = Math.max(0, this.crowdTensionTarget - 0.01 * dt);
  }

  /** Sync Howler listener to the broadcast camera (physics X→X, Y→-Z, Z→Y). */
  updateListener(
    cameraX: number,
    cameraY: number,
    cameraZ: number,
    lookX: number,
    lookY: number,
    lookZ: number,
  ) {
    if (!this.initialized || typeof window === 'undefined') return;
    const fx = lookX - cameraX;
    const fy = lookY - cameraY;
    const fz = lookZ - cameraZ;
    const len = Math.hypot(fx, fy, fz) || 1;
    Howler.pos(cameraX, cameraY, cameraZ);
    Howler.orientation(fx / len, fy / len, fz / len, 0, 1, 0);
  }

  /** Place a one-shot at a world position for spatial kick/bounce audio. */
  playAt(id: 'kick' | 'bounce' | 'softKick', x: number, y: number, z: number, volume = 1) {
    if (!this.enabled || !this.initialized) return;
    const sound = id === 'kick' ? this.kick : id === 'softKick' ? this.softKick : this.bounce;
    sound.pos(x, y, z);
    sound.volume(volume);
    sound.play();
  }
}

export const audioManager = new AudioManager();
