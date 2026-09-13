import type { MemoryEntry, MemorySourceKind, MemoryStatus, MemoryTrust } from "@/core/types/app-state";

export type ProvenanceMemoryEntry = MemoryEntry & {
  trust: MemoryTrust;
  status: MemoryStatus;
  sourceKind: MemorySourceKind;
  sourceRef: string | null;
  validFrom: string;
  staleAfter: string | null;
  supersedes: string | null;
  supersededBy: string | null;
  confidence: number;
};
