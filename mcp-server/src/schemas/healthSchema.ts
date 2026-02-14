/**
 * PRISM MCP Server - Health Schema
 * Validates health endpoint responses to prevent silent regression passes.
 * 
 * WHY registry_status: Health can report status:"ok" + dispatchers:31 when 4 registries
 * failed to load. Without registry_status, calcs fail with "material not found" and
 * debugging points to calc code when the real problem is a boot-time data load failure.
 * 
 * WHY opus_config: Verifies Opus 4.6 features are wired, not just that the server runs.
 * 
 * @module schemas/healthSchema
 */

export const HEALTH_SCHEMA = {
  type: 'object' as const,
  properties: {
    status: {
      type: 'string' as const,
      enum: ['ok', 'degraded', 'error'] as const,
    },
    dispatchers: { type: 'integer' as const, minimum: 0 },
    heap_used_mb: { type: 'number' as const, minimum: 0 },
    uptime_s: { type: 'number' as const, minimum: 0 },
    registry_status: {
      type: 'object' as const,
      properties: {
        materials: { type: 'string' as const, enum: ['ok', 'degraded', 'error', 'empty'] as const },
        machines: { type: 'string' as const, enum: ['ok', 'degraded', 'error', 'empty'] as const },
        tools: { type: 'string' as const, enum: ['ok', 'degraded', 'error', 'empty'] as const },
        alarms: { type: 'string' as const, enum: ['ok', 'degraded', 'error', 'empty'] as const },
      },
      required: ['materials', 'machines', 'tools', 'alarms'],
    },
    opus_config: {
      type: 'object' as const,
      properties: {
        adaptive_thinking: { type: 'boolean' as const },
        compaction_api: { type: 'boolean' as const },
        effort_tiers: { type: 'boolean' as const },
        structured_outputs: { type: 'boolean' as const },
        prefilling_removed: { type: 'boolean' as const },
      },
      required: ['adaptive_thinking', 'compaction_api', 'effort_tiers', 'structured_outputs', 'prefilling_removed'],
    },
  },
  required: ['status', 'dispatchers', 'heap_used_mb', 'uptime_s'],
  additionalProperties: false,
} as const;

export type RegistryStatus = 'ok' | 'degraded' | 'error' | 'empty';

export interface HealthResponse {
  status: 'ok' | 'degraded' | 'error';
  dispatchers: number;
  heap_used_mb: number;
  uptime_s: number;
  registry_status?: {
    materials: RegistryStatus;
    machines: RegistryStatus;
    tools: RegistryStatus;
    alarms: RegistryStatus;
  };
  opus_config?: {
    adaptive_thinking: boolean;
    compaction_api: boolean;
    effort_tiers: boolean;
    structured_outputs: boolean;
    prefilling_removed: boolean;
  };
}
