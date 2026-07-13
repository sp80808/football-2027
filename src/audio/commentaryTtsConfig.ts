/** Edge neural TTS via edge-tts-universal on Vite /api/tts proxy (no API key). */
export const TTS_API_PATH = '/api/tts';
export const TTS_FETCH_TIMEOUT_MS = 800;
export const DEFAULT_COMMENTARY_VOICE = 'en-GB-RyanNeural';
export const COMMENTARY_VOICES = [
  { id: 'en-GB-RyanNeural', label: 'Ryan (UK)' },
  { id: 'en-GB-SoniaNeural', label: 'Sonia (UK)' },
  { id: 'en-US-GuyNeural', label: 'Guy (US)' },
  { id: 'en-US-JennyNeural', label: 'Jenny (US)' },
  { id: 'en-AU-WilliamNeural', label: 'William (AU)' },
] as const;
export type CommentaryVoiceId = (typeof COMMENTARY_VOICES)[number]['id'];
