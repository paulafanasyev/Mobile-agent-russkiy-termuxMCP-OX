import type {
  DiscoveryEntry,
  DiscoveryQuery,
  DiscoveryRegistry,
} from "@/core/discovery/discovery-contract";

export function createDiscoveryRegistry(): DiscoveryRegistry {
  const entries = new Map<string, DiscoveryEntry>();

  return {
    register(entry) {
      entries.set(entry.id, entry);
    },

    get(id) {
      return entries.get(id);
    },

    list(query = {}) {
      return Array.from(entries.values()).filter((entry) => {
        if (query.enabledOnly && !entry.enabled) return false;
        if (query.kind && entry.kind !== query.kind) return false;
        if (query.trust && entry.trust !== query.trust) return false;
        if (
          query.capability &&
          !entry.capabilities.includes(query.capability)
        ) {
          return false;
        }
        return true;
      });
    },
  };
}
