import { createMachine, assign } from 'xstate';
import { SeasonPhase } from '../types';

export interface SeasonContext {
  season: number;
  week:   number;
  day:    number;
  phase:  SeasonPhase;
  pendingFixtureId: string | null;
}

export type SeasonEvent =
  | { type: 'ADVANCE_DAY' }
  | { type: 'FIXTURE_DUE'; fixtureId: string }
  | { type: 'PLAY_LIVE' }
  | { type: 'SIMULATE'; report: any }
  | { type: 'MATCH_ENDED'; report: any }
  | { type: 'CONTINUE' }
  | { type: 'SEASON_OVER' }
  | { type: 'NEW_SEASON' };

export const seasonMachine = createMachine({
  id: 'season',
  types: {} as { context: SeasonContext; events: SeasonEvent },
  context: {
    season: 1,
    week:   1,
    day:    1,
    phase:  'preseason',
    pendingFixtureId: null,
  },
  initial: 'preseason',
  states: {
    preseason: {
      on: {
        ADVANCE_DAY: { target: 'regular', actions: assign({ phase: 'season' as SeasonPhase }) },
      },
    },
    regular: {
      on: {
        ADVANCE_DAY: {
          actions: assign(({ context }) => {
            const nextDay  = context.day < 7 ? context.day + 1 : 1;
            const nextWeek = context.day < 7 ? context.week   : context.week + 1;
            return { day: nextDay, week: nextWeek };
          }),
        },
        FIXTURE_DUE: {
          target: 'preMatch',
          actions: assign(({ event }) => ({ pendingFixtureId: (event as any).fixtureId })),
        },
        SEASON_OVER: { target: 'seasonEnd' },
      },
    },
    preMatch: {
      on: {
        PLAY_LIVE: 'liveMatch',
        SIMULATE:  {
          target: 'postMatch',
          actions: assign({ pendingFixtureId: null }),
        },
      },
    },
    liveMatch: {
      on: {
        MATCH_ENDED: {
          target: 'postMatch',
          actions: assign({ pendingFixtureId: null }),
        },
      },
    },
    postMatch: {
      on: {
        CONTINUE: 'regular',
      },
    },
    seasonEnd: {
      on: {
        NEW_SEASON: {
          target: 'preseason',
          actions: assign(({ context }) => ({
            season: context.season + 1,
            week: 1,
            day: 1,
            phase: 'preseason' as SeasonPhase,
          })),
        },
      },
    },
  },
});
