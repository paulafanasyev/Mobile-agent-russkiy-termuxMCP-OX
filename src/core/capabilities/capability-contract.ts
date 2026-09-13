export type CapabilityRisk = 'low' | 'medium' | 'high' | 'critical';

export interface CapabilityManifest {
  id: string;
  version: string;
  title: string;
  description: string;
  risk: CapabilityRisk;
  requiredApproval: boolean;
  requiredWorkerKinds: string[];
  verificationRequired: boolean;
  enabled: boolean;
  source: 'builtin' | 'mcp' | 'plugin' | 'worker' | 'external';
}

export function canAdvertiseCapability(capability: CapabilityManifest): boolean {
  return capability.enabled && capability.id.trim().length > 0 && capability.version.trim().length > 0;
}

export function requiresApproval(capability: CapabilityManifest): boolean {
  return capability.requiredApproval || capability.risk === 'high' || capability.risk === 'critical';
}
