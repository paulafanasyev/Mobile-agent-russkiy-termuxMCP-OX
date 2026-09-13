export type EvidenceStatus = 'observed' | 'verified' | 'failed' | 'unverified';

export type EvidenceSourceKind =
  | 'runtime'
  | 'device'
  | 'browser'
  | 'ci'
  | 'code'
  | 'api'
  | 'user'
  | 'external-source';

export interface EvidenceRecord {
  id: string;
  runId: string;
  status: EvidenceStatus;
  sourceKind: EvidenceSourceKind;
  sourceRef?: string;
  claim: string;
  observedAt: string;
  verifier?: string;
  artifactRef?: string;
  details?: Record<string, unknown>;
}

export function isVerifiedEvidence(evidence: EvidenceRecord): boolean {
  return evidence.status === 'verified';
}

export function requireVerifiedEvidence(evidence: EvidenceRecord): EvidenceRecord {
  if (!isVerifiedEvidence(evidence)) {
    throw new Error(`Evidence is not verified: ${evidence.id}`);
  }
  return evidence;
}
