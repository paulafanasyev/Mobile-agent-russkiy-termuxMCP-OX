export type WorkerKind =
  | 'android-hands'
  | 'termux'
  | 'browser'
  | 'research'
  | 'knowledge'
  | 'model'
  | 'api'
  | 'mcp';

export type WorkerAvailability = 'available' | 'degraded' | 'unavailable' | 'unknown';

export interface WorkerCapabilityRef {
  id: string;
  version: string;
}

export interface WorkerRequest {
  requestId: string;
  capabilityId: string;
  input: Record<string, unknown>;
  requiredEvidence?: string[];
}

export interface WorkerResult {
  requestId: string;
  workerId: string;
  status: 'completed' | 'retryable' | 'failed' | 'rejected';
  output?: Record<string, unknown>;
  evidenceIds: string[];
  error?: string;
}

export interface WorkerDescriptor {
  id: string;
  kind: WorkerKind;
  version: string;
  availability: WorkerAvailability;
  capabilities: WorkerCapabilityRef[];
  endpoint?: string;
}

export interface WorkerAdapter {
  describe(): WorkerDescriptor;
  execute(request: WorkerRequest): Promise<WorkerResult>;
}
