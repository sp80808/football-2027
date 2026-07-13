import { Howl } from 'howler';
import type { CommentaryLine, CommentaryPriority } from './CommentaryEngine';
import { audioManager } from './AudioManager';
import { commentaryAudioCache } from './CommentaryAudioCache';
import { findInstantClipText, allInstantClipTexts } from './commentaryInstantClips';
import {
  DEFAULT_COMMENTARY_VOICE,
  TTS_API_PATH,
  TTS_FETCH_TIMEOUT_MS,
  type CommentaryVoiceId,
} from './commentaryTtsConfig';
import {
  enqueueWithCap,
  shouldDropIncoming,
  shouldInterrupt,
  sortQueue,
} from './commentaryTtsQueue';

const MAX_QUEUE = 2;

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => reject(new Error('timeout')), ms);
    promise
      .then((value) => {
        window.clearTimeout(timer);
        resolve(value);
      })
      .catch((error) => {
        window.clearTimeout(timer);
        reject(error);
      });
  });
}

function pickSportsVoice(): SpeechSynthesisVoice | null {
  const voices = window.speechSynthesis.getVoices();
  const preferred = voices.find((v) => /ryan|guy|daniel|google uk english male/i.test(v.name));
  return preferred ?? voices.find((v) => v.lang.startsWith('en')) ?? null;
}

export class CommentaryTTS {
  private enabled = true;
  private volume = 0.85;
  private voiceId: CommentaryVoiceId = DEFAULT_COMMENTARY_VOICE;
  private queue: CommentaryLine[] = [];
  private processing = false;
  private speaking = false;
  private currentPriority: CommentaryPriority | null = null;
  private activeHowl: Howl | null = null;
  private inFlight = new Map<string, Promise<string | null>>();
  private warmed = false;
  private voicesReady = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    if (!enabled) this.cancel();
    else if (!this.warmed) void this.warmInstantClips();
  }

  setVolume(volume: number) {
    this.volume = Math.max(0, Math.min(1, volume));
    this.activeHowl?.volume(this.volume);
  }

  setVoice(voiceId: CommentaryVoiceId) {
    this.voiceId = voiceId;
  }

  getVoice(): CommentaryVoiceId {
    return this.voiceId;
  }

  isSpeaking(): boolean {
    return this.speaking;
  }

  unlock() {
    if (this.enabled && !this.warmed) void this.warmInstantClips();
  }

  cancel() {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    this.activeHowl?.stop();
    this.activeHowl?.unload();
    this.activeHowl = null;
    this.speaking = false;
    this.processing = false;
    this.currentPriority = null;
    this.queue = [];
    audioManager.setCommentaryDucking(false);
  }

  prefetch(text: string) {
    if (!this.enabled || typeof window === 'undefined') return;
    void this.resolveAudioUrl(text, false);
  }

  speak(line: CommentaryLine) {
    if (!this.enabled || typeof window === 'undefined') return;

    if (shouldDropIncoming(this.currentPriority, line.priority)) return;
    if (shouldInterrupt(this.currentPriority, line.priority)) this.cancel();

    this.queue = enqueueWithCap(this.queue, line, MAX_QUEUE);
    void this.processQueue();
  }

  private async warmInstantClips() {
    this.warmed = true;
    for (const phrase of allInstantClipTexts()) {
      this.prefetch(phrase);
    }
  }

  private async processQueue() {
    if (this.processing || this.speaking || !this.queue.length) return;
    this.processing = true;

    try {
      while (this.queue.length > 0 && !this.speaking) {
        const sorted = sortQueue(this.queue);
        const next = sorted[0];
        if (!next) break;
        this.queue = sorted.slice(1);
        await this.playLine(next);
      }
    } finally {
      this.processing = false;
      if (this.queue.length > 0 && !this.speaking) void this.processQueue();
    }
  }

  private async playLine(line: CommentaryLine) {
    const instant = findInstantClipText(line.text);
    const cached = await commentaryAudioCache.get(line.text, this.voiceId);
    if (cached) {
      await this.playHowlUrl(cached, line.priority);
      return;
    }

    if (instant) {
      const instantUrl = await commentaryAudioCache.get(instant, this.voiceId);
      if (instantUrl) {
        void this.resolveAudioUrl(line.text, false);
        await this.playHowlUrl(instantUrl, line.priority);
        return;
      }
    }

    try {
      const url = await withTimeout(this.resolveAudioUrl(line.text, true), TTS_FETCH_TIMEOUT_MS);
      if (url) {
        await this.playHowlUrl(url, line.priority);
        return;
      }
    } catch {
      // Fall through to Web Speech.
    }

    if (instant) {
      const instantUrl = await this.resolveAudioUrl(instant, true);
      if (instantUrl) {
        await this.playHowlUrl(instantUrl, line.priority);
        return;
      }
    }

    await this.playWebSpeech(line.text, line.priority);
  }

  private async resolveAudioUrl(text: string, required: boolean): Promise<string | null> {
    const cached = await commentaryAudioCache.get(text, this.voiceId);
    if (cached) return cached;

    const key = commentaryAudioCache.keyFor(text, this.voiceId);
    const pending = this.inFlight.get(key);
    if (pending) return pending;

    const task = this.fetchAndCache(text).finally(() => {
      this.inFlight.delete(key);
    });
    this.inFlight.set(key, task);

    const url = await task;
    if (!url && required) return null;
    return url;
  }

  private async fetchAndCache(text: string): Promise<string | null> {
    try {
      const response = await fetch(TTS_API_PATH, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, voice: this.voiceId }),
      });
      if (!response.ok) return null;
      const audio = await response.arrayBuffer();
      if (!audio.byteLength) return null;
      return commentaryAudioCache.put(text, this.voiceId, audio);
    } catch {
      return null;
    }
  }

  private playHowlUrl(url: string, priority: CommentaryPriority): Promise<void> {
    return new Promise((resolve) => {
      if (!this.enabled) {
        resolve();
        return;
      }

      this.activeHowl?.stop();
      this.activeHowl?.unload();

      const howl = new Howl({
        src: [url],
        format: ['mp3'],
        volume: this.volume,
        html5: true,
        onplay: () => {
          this.speaking = true;
          this.currentPriority = priority;
          audioManager.setCommentaryDucking(true);
        },
        onend: () => {
          this.speaking = false;
          this.currentPriority = null;
          this.activeHowl = null;
          audioManager.setCommentaryDucking(false);
          resolve();
        },
        onstop: () => {
          this.speaking = false;
          this.currentPriority = null;
          this.activeHowl = null;
          audioManager.setCommentaryDucking(false);
          resolve();
        },
        onloaderror: () => {
          this.speaking = false;
          this.currentPriority = null;
          this.activeHowl = null;
          audioManager.setCommentaryDucking(false);
          resolve();
        },
        onplayerror: () => {
          this.speaking = false;
          this.currentPriority = null;
          this.activeHowl = null;
          audioManager.setCommentaryDucking(false);
          resolve();
        },
      });

      this.activeHowl = howl;
      howl.play();
    });
  }

  private playWebSpeech(text: string, priority: CommentaryPriority): Promise<void> {
    return new Promise((resolve) => {
      if (!this.enabled || typeof window === 'undefined' || !window.speechSynthesis) {
        resolve();
        return;
      }

      if (!this.voicesReady) {
        this.selectedVoice = pickSportsVoice();
        this.voicesReady = true;
      }

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.98;
      utterance.volume = this.volume;
      if (this.selectedVoice) utterance.voice = this.selectedVoice;

      utterance.onstart = () => {
        this.speaking = true;
        this.currentPriority = priority;
        audioManager.setCommentaryDucking(true);
      };

      const finish = () => {
        this.speaking = false;
        this.currentPriority = null;
        audioManager.setCommentaryDucking(false);
        resolve();
      };

      utterance.onend = finish;
      utterance.onerror = finish;

      window.speechSynthesis.speak(utterance);
    });
  }
}

export const commentaryTTS = new CommentaryTTS();
