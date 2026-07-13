import { create } from 'zustand';
import { MatchPhase, MatchSnapshot } from '../engine/MatchManager';
import { audioManager } from '../audio/AudioManager';
import { displayMatchMinute, getMatchHalf } from '../utils/matchTime';

export type PlayEventKind = 'goal' | 'shot' | 'foul' | 'tackle' | 'kick' | 'offside';

export interface PlayEvent {
  id: string;
  side: 'home' | 'away';
  kind: PlayEventKind;
  matchMinute: number;
  label: string;
  createdAt: number;
}

const MAX_EVENTS_PER_SIDE = 4;
const EVENT_TTL_MS = 8000;

interface GameStore {
  homeScore: number;
  awayScore: number;
  matchTime: number;
  elapsedSeconds: number;
  half: number;
  phase: MatchPhase;
  announcement: string | null;
  goalScorer: 'home' | 'away' | null;
  audioEnabled: boolean;
  playEvents: PlayEvent[];
  syncMatch: (state: MatchSnapshot) => void;
  syncFromEngine: (scores: { player: number; opponent: number }, elapsedSeconds: number) => void;
  pushPlayEvent: (event: Omit<PlayEvent, 'id' | 'createdAt'>) => void;
  prunePlayEvents: () => void;
  setAnnouncement: (text: string | null) => void;
  toggleAudio: () => void;
}

let eventCounter = 0;

export const useGameStore = create<GameStore>((set, get) => ({
  homeScore: 0,
  awayScore: 0,
  matchTime: 0,
  elapsedSeconds: 0,
  half: 1,
  phase: 'pre_kickoff',
  announcement: null,
  goalScorer: null,
  audioEnabled: true,
  playEvents: [],

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

  syncFromEngine: (scores, elapsedSeconds) =>
    set({
      homeScore: scores.player,
      awayScore: scores.opponent,
      elapsedSeconds,
      matchTime: displayMatchMinute(elapsedSeconds),
      half: getMatchHalf(elapsedSeconds),
    }),

  pushPlayEvent: (event) => {
    const now = Date.now();
    const entry: PlayEvent = {
      ...event,
      id: `evt-${++eventCounter}`,
      createdAt: now,
    };
    set((s) => {
      const fresh = s.playEvents.filter(
        (e) => now - e.createdAt < EVENT_TTL_MS,
      );
      const sameSide = fresh.filter((e) => e.side === event.side);
      const otherSide = fresh.filter((e) => e.side !== event.side);
      const trimmed = [...sameSide, entry].slice(-MAX_EVENTS_PER_SIDE);
      return { playEvents: [...otherSide, ...trimmed] };
    });
  },

  prunePlayEvents: () => {
    const now = Date.now();
    set((s) => ({
      playEvents: s.playEvents.filter((e) => now - e.createdAt < EVENT_TTL_MS),
    }));
  },

  setAnnouncement: (text) => set({ announcement: text }),

  toggleAudio: () =>
    set((s) => {
      const audioEnabled = !s.audioEnabled;
      audioManager.setEnabled(audioEnabled);
      return { audioEnabled };
    }),
}));
