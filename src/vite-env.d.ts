/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_GEMINI_API_KEY?: string;
  readonly VITE_GOOGLE_API_KEY?: string;
  readonly GEMINI_API_KEY?: string;
  readonly GOOGLE_API_KEY?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}

interface Window {
  __TEST__?: {
    screen: string;
    phase: string;
    homeScore: number;
    awayScore: number;
  };
}
