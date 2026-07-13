import { create } from 'zustand';
import { MatchPhase, MatchSnapshot } from '../engine/MatchManager';
import { audioManager } from '../audio/AudioManager';

interface GameStore {
  homeScore: number;
  awayScore: number;
  matchTime: number;
  half: number;
  phase: MatchPhase;
  announcement: string | null;
  goalScorer: 'home' | 'away' | null;
  audioEnabled: boolean;
  syncMatch: (state: MatchSnapshot) => void;
  setAnnouncement: (text: string | null) => void;
  toggleAudio: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  homeScore: 0,
  awayScore: 0,
  matchTime: 0,
  half: 1,
  phase: 'pre_kickoff',
  announcement: null,
  goalScorer: null,
  audioEnabled: true,

  syncMatch: (state) =>
    set({
      homeScore: state.homeScore,
      awayScore: state.awayScore,
      matchTime: state.matchTime,
      half: state.half,
      phase: state.phase,
      announcement: state.announcement,
      goalScorer: state.goalScorer,
    }),

  setAnnouncement: (text) => set({ announcement: text }),

  toggleAudio: () =>
    set((s) => {
      const audioEnabled = !s.audioEnabled;
      audioManager.setEnabled(audioEnabled);
      return { audioEnabled };
    }),
}));
