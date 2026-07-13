/// <reference types="vite/client" />

interface Window {
  __TEST__?: {
    screen: string;
    phase: string;
    homeScore: number;
    awayScore: number;
  };
}
