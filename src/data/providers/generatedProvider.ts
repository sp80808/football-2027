/**
 * Generated data provider — works offline with no API key.
 * This is the always-available fallback.
 */
import { FootballDataProvider, ProviderMeta } from './types';

const meta: ProviderMeta = {
  name: 'generated',
  label: 'Local Generated Data',
  description: 'Deterministic fictional data. Always available. No API key required.',
  requiresKey: false,
  attribution: null,
  licence: 'MIT',
  status: 'active',
  capabilities: {
    competitions: true, clubs: true, players: true, fixtures: true,
    standings: true, liveEvents: false, playerStats: false, xgData: false,
  },
  quotaLimit: null,
  quotaUsed: 0,
  lastSync: null,
  tierCoverage: [1,2,3,4,5,6,7,8,9,10],
};

export const generatedProvider: FootballDataProvider = { meta };
