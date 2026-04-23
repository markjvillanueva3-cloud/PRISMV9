/**
 * PRISM F5: Multi-Tenant Isolation Types
 * ========================================
 * 
 * Tenant namespace isolation with shared learning bus.
 * CRITICAL: Tenant data leakage = security failure.
 * 
 * @version 1.0.0
 * @feature F5
 * @depends F2 (MemoryGraphEngine)
 */

// ============================================================================
// TENANT
// ============================================================================

export type TenantStatus = 'active' | 'suspended' | 'soft_deleted' | 'purged';

export interface Tenant {
  readonly id: string;               // UUID
  readonly name: string;
  readonly created_at: number;
  readonly updated_at: number;
  readonly status: TenantStatus;
  readonly config: TenantConfig;
  readonly stats: TenantStats;
}

export interface TenantConfig {
  // Resource limits
  max_dispatchers: number;           // Default 30
  max_hooks: number;                 // Default 100
  max_state_bytes: number;           // Default 50MB
  max_sessions_per_hour: number;     // Default 100
  
  // Shared Learning Bus governance
  slb_publish: boolean;              // Opt-out publish (default true)
  slb_subscribe: boolean;            // Opt-out subscribe (default true)
  slb_pattern_filter: string[];      // Allowed pattern types (empty = all)
  
  // Isolation
  frozen_tenant_id: boolean;         // Prevent tenant ID injection (default true)
  anonymize_exports: boolean;        // Anonymize before SLB publish (default true)

  // Data residency
  inference_geo: 'us' | 'eu' | 'global';  // Inference region constraint (default 'global')
  data_residency_region: string;           // Data storage region (default '')
  zero_data_retention: boolean;            // ZDR flag for sensitive IP (default false)
}

export interface TenantStats {
  dispatchers_registered: number;
  hooks_active: number;
  state_bytes: number;
  sessions_this_hour: number;
  slb_patterns_published: number;
  slb_patterns_consumed: number;
  last_activity: number;
}

export const DEFAULT_TENANT_CONFIG: TenantConfig = {
  max_dispatchers: 30,
  max_hooks: 100,
  max_state_bytes: 52_428_800,       // 50MB
  max_sessions_per_hour: 100,
  slb_publish: true,
  slb_subscribe: true,
  slb_pattern_filter: [],
  frozen_tenant_id: true,
  anonymize_exports: true,
  inference_geo: 'global',
  data_residency_region: '',
  zero_data_retention: false,
};

// ============================================================================
// TENANT CONTEXT — Injected into every dispatcher call
// ============================================================================

export interface TenantContext {
  readonly tenant_id: string;
  readonly tenant_name: string;
  readonly state_dir: string;        // state/{tenant_id}/
  readonly is_frozen: boolean;       // Cannot be modified by dispatchers
  readonly inference_geo: 'us' | 'eu' | 'global';  // Data residency constraint
  readonly zero_data_retention: boolean;            // ZDR flag
}

// ============================================================================
// SHARED LEARNING BUS
// ============================================================================

export type PatternType = 'failure' | 'success' | 'optimization' | 'safety' | 'toolpath';

export interface SharedPattern {
  readonly id: string;
  readonly type: PatternType;
  readonly source_tenant: string;     // Anonymized: 'tenant_xxx' hash
  readonly published_at: number;
  readonly data: Record<string, unknown>; // Anonymized payload
  readonly confidence: number;        // 0-1
  readonly external_weight: number;   // 0.5 by default
  readonly promotions: number;        // Times locally confirmed
  readonly quarantined: boolean;
}

export interface SLBConfig {
  enabled: boolean;
  external_weight: number;           // Default 0.5
  min_confidence_publish: number;    // Default 0.6
  min_promotions_adopt: number;      // Default 3
  quarantine_threshold: number;      // Quarantine after N rejections (default 5)
  max_patterns: number;              // Default 10000
}

export const DEFAULT_SLB_CONFIG: SLBConfig = {
  enabled: true,
  external_weight: 0.5,
  min_confidence_publish: 0.6,
  min_promotions_adopt: 3,
  quarantine_threshold: 5,
  max_patterns: 10_000,
};

// ============================================================================
// ANONYMIZATION
// ============================================================================

export interface AnonymizationResult {
  readonly original_fields_removed: string[];
  readonly fields_hashed: string[];
  readonly payload_size_before: number;
  readonly payload_size_after: number;
}

// ============================================================================
// DELETION — 2-phase
// ============================================================================

export interface DeletionRecord {
  readonly tenant_id: string;
  readonly phase: 'soft_delete' | 'hard_purge';
  readonly initiated_at: number;
  readonly completed_at?: number;
  readonly files_removed: number;
  readonly bytes_freed: number;
  readonly initiated_by: string;
}

// ============================================================================
// MULTI-TENANT ENGINE CONFIG
// ============================================================================

export interface MultiTenantConfig {
  enabled: boolean;
  base_state_dir: string;            // Default 'state'
  default_tenant_id: string;         // Default 'default'
  max_tenants: number;               // Default 50
  slb: SLBConfig;
  purge_delay_hours: number;         // Hours between soft_delete and hard_purge (default 72)
}

export const DEFAULT_MT_CONFIG: MultiTenantConfig = {
  enabled: true,
  base_state_dir: 'state',
  default_tenant_id: 'default',
  max_tenants: 50,
  slb: DEFAULT_SLB_CONFIG,
  purge_delay_hours: 72,
};
