/** Stable cache key for commentary TTS clips (text + voice). */
export function hashCommentaryKey(text: string, voice: string): string {
  const input = `${voice}::${text.trim().toLowerCase()}`;
  let hash = 2166136261;
  for (let i = 0; i < input.length; i++) {
    hash ^= input.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return `tts-${(hash >>> 0).toString(16)}`;
}
