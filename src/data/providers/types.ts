/**
 * Provider interface — every data source implements this contract.
 * The game always works with the 'generated' provider (no API key).
 * External providers are optional and additive.
 */

export type ProviderName = 'generated' | 'openfoot' | 'statsbomb' | 'api_football' | 'sportmonks' | 'football_data';

export type ProviderStatus = 'active' | 'inactive' | 'quota_exceeded' | 'error' | 'unconfigured';

export interface ProviderCapability {
  competitions:   boolean;
  clubs:          boolean;
  players:        boolean;
  fixtures:       boolean;
  standings:      boolean;
  liveEvents:     boolean;
  playerStats:    boolean;
  xgData:         boolean;
}

export interface ProviderMeta {
  name:         ProviderName;
  label:        string;
  description:  string;
  requiresKey:  boolean;
  attribution:  string | null; // required attribution text
  licence:      string;
  status:       ProviderStatus;
  capabilities: ProviderCapability;
  quotaLimit:   number | null;
  quotaUsed:    number;
  lastSync:     string | null;
  tierCoverage: number[]; // tiers this provider covers reliably
}

/** Every imported record carries provenance */
export interface DataRecord<T> {
  data:       T;
  provider:   ProviderName;
  retrievedAt: string; // ISO timestamp
  confidence: 'fictional' | 'modelled' | 'community' | 'verified';
  coverageNote: string;
}

/** Provider interface — async, network-optional */
export interface FootballDataProvider {
  meta: ProviderMeta;
  /** Returns null if the provider is not configured or quota exceeded */
  fetchFixtures?(competitionId: string, season: number): Promise<DataRecord<any>[] | null>;
  fetchStandings?(competitionId: string, season: number): Promise<DataRecord<any>[] | null>;
  fetchSquad?(clubId: string, season: number): Promise<DataRecord<any>[] | null>;
  fetchPlayerStats?(playerId: string, season: number): Promise<DataRecord<any> | null>;
}

export interface ProviderConfig {
  provider: ProviderName;
  apiKey?:  string;
  enabled:  boolean;
}
