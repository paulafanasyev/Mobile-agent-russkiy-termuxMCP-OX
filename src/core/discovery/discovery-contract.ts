export type DiscoveryKind =
  | "public-api"
  | "mcp-server"
  | "plugin"
  | "skill"
  | "github-repository"
  | "external-worker";

export type DiscoveryTrust = "unverified" | "observed" | "verified";

export interface DiscoveryEntry {
  id: string;
  kind: DiscoveryKind;
  name: string;
  description?: string;
  sourceUrl?: string;
  sourceRef?: string;
  trust: DiscoveryTrust;
  capabilities: string[];
  metadata?: Record<string, unknown>;
  discoveredAt: string;
  lastVerifiedAt?: string;
  staleAfter?: string;
  enabled: boolean;
}

export interface DiscoveryQuery {
  kind?: DiscoveryKind;
  capability?: string;
  trust?: DiscoveryTrust;
  enabledOnly?: boolean;
}

export interface DiscoveryRegistry {
  register(entry: DiscoveryEntry): void;
  get(id: string): DiscoveryEntry | undefined;
  list(query?: DiscoveryQuery): DiscoveryEntry[];
}
