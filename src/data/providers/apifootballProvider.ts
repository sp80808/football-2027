/**
 * API-Football adapter (api-football.com via RapidAPI).
 * Server-side only — API key must live in an environment variable,
 * never in client bundles or git history.
 *
 * Covers tiers 1-8 in England. Lower leagues (9-10) use generated data.
 * Quota: free plan = 100 requests/day; upgrade as needed.
 *
 * Attribution: "Data provided by API-Football"
 */
import { FootballDataProvider, ProviderMeta, DataRecord } from './types';

const ATTRIBUTION = 'Data provided by API-Football (api-football.com)';
const BASE_URL    = 'https://v3.football.api-sports.io';

const meta: ProviderMeta = {
  name: 'api_football',
  label: 'API-Football',
  description: 'Broad coverage of English football tiers 1-8. Requires API key.',
  requiresKey: true,
  attribution: ATTRIBUTION,
  licence: 'Commercial — see api-football.com/terms',
  status: 'unconfigured',
  capabilities: {
    competitions: true, clubs: true, players: true, fixtures: true,
    standings: true, liveEvents: true, playerStats: true, xgData: false,
  },
  quotaLimit: 100,
  quotaUsed: 0,
  lastSync: null,
  tierCoverage: [1, 2, 3, 4, 5, 6, 7, 8],
};

export class ApiFootballProvider implements FootballDataProvider {
  meta = { ...meta };

  private apiKey: string | null = null;

  configure(apiKey: string) {
    this.apiKey = apiKey;
    this.meta.status = 'active';
  }

  private async get(path: string): Promise<any> {
    if (!this.apiKey) throw new Error('API-Football: no API key configured');
    const res = await fetch(`${BASE_URL}${path}`, {
      headers: {
        'x-rapidapi-key':  this.apiKey,
        'x-rapidapi-host': 'v3.football.api-sports.io',
      },
    });
    if (res.status === 429) { this.meta.status = 'quota_exceeded'; throw new Error('Quota exceeded'); }
    if (!res.ok) throw new Error(`API-Football HTTP ${res.status}`);
    this.meta.quotaUsed++;
    this.meta.lastSync = new Date().toISOString();
    return res.json();
  }

  async fetchStandings(competitionId: string, season: number): Promise<DataRecord<any>[] | null> {
    try {
      const json = await this.get(`/standings?league=${competitionId}&season=${season}`);
      const table = json?.response?.[0]?.league?.standings?.[0] ?? [];
      return table.map((row: any) => ({
        data:         row,
        provider:     'api_football' as const,
        retrievedAt:  new Date().toISOString(),
        confidence:   'verified' as const,
        coverageNote: `API-Football league ${competitionId}, season ${season}`,
      }));
    } catch (e) {
      console.warn('[api_football] fetchStandings failed:', e);
      return null;
    }
  }

  async fetchFixtures(competitionId: string, season: number): Promise<DataRecord<any>[] | null> {
    try {
      const json = await this.get(`/fixtures?league=${competitionId}&season=${season}`);
      const fixtures = json?.response ?? [];
      return fixtures.map((f: any) => ({
        data:         f,
        provider:     'api_football' as const,
        retrievedAt:  new Date().toISOString(),
        confidence:   'verified' as const,
        coverageNote: `API-Football fixtures league ${competitionId}`,
      }));
    } catch (e) {
      console.warn('[api_football] fetchFixtures failed:', e);
      return null;
    }
  }
}

export const apifootballProvider = new ApiFootballProvider();
