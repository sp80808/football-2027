import { create } from 'zustand';
import { MatchPhase, MatchState } from '../engine/MatchManager';

interface GameStore extends MatchState {
  audioEnabled: boolean;
  syncMatch: (state: MatchState) => void;
  setAnnouncement: (text: string | null) => void;
  toggleAudio: () => void;
}

export const useGameStore = create<GameStore>((set) => ({
  homeScore: 0,
  awayScore: 0,
  matchTime: 0,
  half: 1,
  phase: 'pre_kickoff' as MatchPhase,
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

  toggleAudio: () => set((s) => ({ audioEnabled: !s.audioEnabled })),
}));
