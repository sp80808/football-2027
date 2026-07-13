import { Howl } from 'howler';
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
      volume: 0.15,
      loop: true,
    });
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
    this.crowd?.volume(0.35);
    setTimeout(() => this.crowd?.volume(0.15), 3000);
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
}

export const audioManager = new AudioManager();
