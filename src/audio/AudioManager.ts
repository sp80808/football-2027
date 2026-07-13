import { Howl, Howler } from 'howler';
import {
  generateKickSound,
  generateGoalSound,
  generateWhistleSound,
  generateBounceSound,
  generateCrowdAmbience,
} from './generateSounds';

export class AudioManager {
  private enabled = true;
  private initialized = false;
  private kick!: Howl;
  private goal!: Howl;
  private whistle!: Howl;
  private bounce!: Howl;
  private crowd!: Howl;
  private crowdBaseVolume = 0.15;
  private commentaryDucking = false;
  private lastBounceTime = 0;

  init() {
    if (this.initialized || typeof window === 'undefined') return;
    this.initialized = true;

    this.kick = new Howl({ src: [generateKickSound()], volume: 0.6 });
    this.goal = new Howl({ src: [generateGoalSound()], volume: 0.7 });
    this.whistle = new Howl({ src: [generateWhistleSound()], volume: 0.5 });
    this.bounce = new Howl({ src: [generateBounceSound()], volume: 0.25 });
    this.crowd = new Howl({
      src: [generateCrowdAmbience()],
      volume: this.crowdBaseVolume,
      loop: true,
    });
  }

  setCommentaryDucking(ducking: boolean) {
    this.commentaryDucking = ducking;
    if (!this.initialized) return;
    this.crowd?.volume(ducking ? this.crowdBaseVolume * 0.35 : this.crowdBaseVolume);
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) {
      this.crowd?.stop();
    } else if (this.initialized) {
      this.crowd?.play();
    }
  }

  isEnabled() {
    return this.enabled;
  }

  unlock() {
    this.init();
    if (this.enabled) this.crowd?.play();
  }

  playKick(power = 1) {
    if (!this.enabled || !this.initialized) return;
    this.kick.volume(Math.min(0.9, 0.3 + power * 0.4));
    this.kick.play();
  }

  playGoal() {
    if (!this.enabled || !this.initialized) return;
    this.goal.play();
    if (!this.commentaryDucking) {
      this.crowd?.volume(0.35);
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
  playAt(id: 'kick' | 'bounce', x: number, y: number, z: number, volume = 1) {
    if (!this.enabled || !this.initialized) return;
    const sound = id === 'kick' ? this.kick : this.bounce;
    sound.pos(x, y, z);
    sound.volume(volume);
    sound.play();
  }
}

export const audioManager = new AudioManager();
