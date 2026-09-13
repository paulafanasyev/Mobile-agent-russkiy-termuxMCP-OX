export type MemoryTrust = 'untrusted' | 'user-confirmed' | 'observed' | 'verified';
export type MemoryStatus = 'active' | 'superseded' | 'stale' | 'archived' | 'rejected';

export interface MemoryMetadata {
  trust: MemoryTrust;
  status: MemoryStatus;
  sourceKind: 'conversation' | 'runtime' | 'device' | 'research' | 'external-source' | 'user';
  sourceRef?: string;
  validFrom: string;
  staleAfter?: string;
  supersedes?: string;
  supersededBy?: string;
  confidence: number;
}

export function normalizeMemoryConfidence(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(1, value));
}

export function memoryCanAffectRanking(memory: MemoryMetadata): boolean {
  return memory.status === 'active' && memory.trust !== 'rejected';
}

export function learningEffect(memory: MemoryMetadata): 'ranking-only' | 'ignored' {
  return memoryCanAffectRanking(memory) ? 'ranking-only' : 'ignored';
}
