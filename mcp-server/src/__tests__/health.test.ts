/**
 * PRISM MCP Server - Health Endpoint Smoke Test
 * Validates that the health schema type definitions are correct.
 * Full integration test (actual endpoint) deferred to P0-MS0b.
 */

import { describe, it, expect } from 'vitest';
import { HEALTH_SCHEMA } from '../schemas/healthSchema.js';
import type { HealthResponse } from '../schemas/healthSchema.js';

describe('Health Schema', () => {
  it('schema has required fields', () => {
    expect(HEALTH_SCHEMA.required).toContain('status');
    expect(HEALTH_SCHEMA.required).toContain('dispatchers');
    expect(HEALTH_SCHEMA.required).toContain('heap_used_mb');
    expect(HEALTH_SCHEMA.required).toContain('uptime_s');
  });

  it('status enum is correct', () => {
    const statusProp = HEALTH_SCHEMA.properties.status;
    expect(statusProp.enum).toEqual(['ok', 'degraded', 'error']);
  });

  it('registry_status has all 4 registries', () => {
    const regStatus = HEALTH_SCHEMA.properties.registry_status;
    expect(regStatus.required).toEqual(['materials', 'machines', 'tools', 'alarms']);
  });

  it('opus_config tracks all 5 features', () => {
    const opusConfig = HEALTH_SCHEMA.properties.opus_config;
    expect(opusConfig.required).toContain('adaptive_thinking');
    expect(opusConfig.required).toContain('compaction_api');
    expect(opusConfig.required).toContain('effort_tiers');
    expect(opusConfig.required).toContain('structured_outputs');
    expect(opusConfig.required).toContain('prefilling_removed');
  });

  it('type-checks a valid health response', () => {
    const response: HealthResponse = {
      status: 'ok',
      dispatchers: 31,
      heap_used_mb: 150,
      uptime_s: 3600,
      registry_status: {
        materials: 'ok',
        machines: 'ok',
        tools: 'ok',
        alarms: 'ok',
      },
      opus_config: {
        adaptive_thinking: true,
        compaction_api: true,
        effort_tiers: true,
        structured_outputs: true,
        prefilling_removed: true,
      },
    };
    expect(response.status).toBe('ok');
    expect(response.dispatchers).toBe(31);
  });
});
