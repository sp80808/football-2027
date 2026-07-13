import { hashCommentaryKey } from './commentaryTtsHash';
import type { CommentaryVoiceId } from './commentaryTtsConfig';

class CommentaryAudioCache {
  private urls = new Map<string, string>();

  keyFor(text: string, voice: CommentaryVoiceId | string): string {
    return hashCommentaryKey(text, voice);
  }

  async get(text: string, voice: CommentaryVoiceId | string): Promise<string | null> {
    return this.urls.get(this.keyFor(text, voice)) ?? null;
  }

  async put(text: string, voice: CommentaryVoiceId | string, audio: ArrayBuffer): Promise<string> {
    const key = this.keyFor(text, voice);
    const existing = this.urls.get(key);
    if (existing) return existing;

    const blob = new Blob([audio], { type: 'audio/mpeg' });
    const url = URL.createObjectURL(blob);
    this.urls.set(key, url);
    return url;
  }

  clear() {
    for (const url of this.urls.values()) URL.revokeObjectURL(url);
    this.urls.clear();
  }
}

export const commentaryAudioCache = new CommentaryAudioCache();
