import { GoogleGenAI } from '@google/genai';
import type { CommentaryLine, CommentaryPriority } from './CommentaryEngine';
import { audioManager } from './AudioManager';

const PRIORITY_RANK: Record<CommentaryPriority, number> = { critical: 100, high: 80, medium: 60, low: 40, ambient: 20 };
const GEMINI_TIMEOUT_MS = 800;

function getGeminiApiKey(): string | undefined {
  const env = import.meta.env as Record<string, string | undefined>;
  return env.VITE_GEMINI_API_KEY || env.VITE_GOOGLE_API_KEY || env.GEMINI_API_KEY || env.GOOGLE_API_KEY;
}

function pickSportsVoice(): SpeechSynthesisVoice | null {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voices = window.speechSynthesis.getVoices();
  if (!voices.length) return null;
  const preferred = voices.find((v) => (v.lang.startsWith('en-GB') || v.lang.startsWith('en-US')) && /male|daniel|james|oliver|david|mark/i.test(`${v.name} ${v.voiceURI}`));
  return preferred ?? voices.find((v) => v.lang.startsWith('en-GB')) ?? voices.find((v) => v.lang.startsWith('en-US')) ?? voices[0] ?? null;
}

async function tryGeminiLine(prompt: string): Promise<string | null> {
  const apiKey = getGeminiApiKey();
  if (!apiKey) return null;
  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await Promise.race([
      ai.models.generateContent({ model: 'gemini-2.0-flash', contents: prompt }),
      new Promise<null>((resolve) => window.setTimeout(() => resolve(null), GEMINI_TIMEOUT_MS)),
    ]);
    if (!response || !('text' in response)) return null;
    const text = response.text?.trim();
    if (!text || text.length > 220) return null;
    return text.replace(/^["']|["']$/g, '');
  } catch { return null; }
}

export class CommentaryTTS {
  private enabled = true;
  private volume = 1;
  private currentPriority: CommentaryPriority | null = null;
  private speaking = false;
  private selectedVoice: SpeechSynthesisVoice | null = null;

  constructor() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    const loadVoices = () => { this.selectedVoice = pickSportsVoice(); };
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
  }

  setEnabled(enabled: boolean) { this.enabled = enabled; if (!enabled) this.cancel(); }
  setVolume(volume: number) { this.volume = Math.max(0, Math.min(1, volume)); }

  cancel() {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    this.speaking = false;
    this.currentPriority = null;
    audioManager.setCommentaryDucking(false);
  }

  speak(line: CommentaryLine) {
    if (!this.enabled || typeof window === 'undefined') return;
    const incomingRank = PRIORITY_RANK[line.priority];
    if (this.speaking && this.currentPriority) {
      const currentRank = PRIORITY_RANK[this.currentPriority];
      if (incomingRank < currentRank) return;
      if (incomingRank > currentRank) this.cancel();
    }
    if (line.allowGemini && getGeminiApiKey()) { void this.speakWithOptionalGemini(line); return; }
    this.speakWebSpeech(line.text, line.priority);
  }

  private async speakWithOptionalGemini(line: CommentaryLine) {
    const prompt = `You are an excited British football TV commentator. In ONE short spoken sentence (max 18 words), react to: "${line.text}". No quotes.`;
    this.speakWebSpeech((await tryGeminiLine(prompt)) ?? line.text, line.priority);
  }

  private speakWebSpeech(text: string, priority: CommentaryPriority) {
    if (!this.enabled || typeof window === 'undefined' || !window.speechSynthesis) return;
    this.selectedVoice ??= pickSportsVoice();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.05 + (Math.random() - 0.5) * 0.06;
    utterance.pitch = 0.95 + Math.random() * 0.1;
    utterance.volume = this.volume;
    if (this.selectedVoice) utterance.voice = this.selectedVoice;
    utterance.onstart = () => { this.speaking = true; this.currentPriority = priority; audioManager.setCommentaryDucking(true); };
    const end = () => { this.speaking = false; this.currentPriority = null; audioManager.setCommentaryDucking(false); };
    utterance.onend = end;
    utterance.onerror = end;
    window.speechSynthesis.speak(utterance);
  }
}
export const commentaryTTS = new CommentaryTTS();
