/**
 * PRISM F5: Multi-Tenant Isolation Engine
 * =========================================
 * 
 * Manages tenant lifecycle, namespace isolation, resource limits,
 * and Shared Learning Bus (SLB) for cross-tenant pattern sharing.
 * 
 * CRITICAL SECURITY: Tenant data leakage = security failure.
 * - All state paths namespaced: state/{tenant_id}/
 * - Tenant ID frozen in context (cannot be overwritten by dispatchers)
 * - SLB patterns anonymized before publication
 * - Resource limits enforced per-tenant
 * 
 * SAFETY: Multi-tenant engine failure = fall back to default tenant.
 * All S(x)≥0.70 enforcement continues regardless of tenant state.
 * 
 * @version 1.0.0
 * @feature F5
 * @depends F2 (MemoryGraphEngine)
 */

import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { randomUUID } from 'crypto';
import {
  Tenant, TenantConfig, TenantStats, TenantContext, TenantStatus,
  SharedPattern, PatternType, AnonymizationResult, DeletionRecord,
  MultiTenantConfig, DEFAULT_MT_CONFIG, DEFAULT_TENANT_CONFIG,
  DEFAULT_SLB_CONFIG,
} from '../types/tenant-types.js';
import { log } from '../utils/Logger.js';

// ============================================================================
// STATE PATHS
// ============================================================================

const BASE_DIR = path.join(process.cwd(), 'state', 'tenants');
const REGISTRY_PATH = path.join(BASE_DIR, 'tenant_registry.json');
const SLB_PATH = path.join(BASE_DIR, 'shared_learning_bus.json');
const DELETION_LOG = path.join(BASE_DIR, 'deletion_log.jsonl');

function ensureDirs(...dirs: string[]): void {
  for (const dir of dirs) {
    try { if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true }); } catch { /* non-fatal */ }
  }
}

// ============================================================================
// ANONYMIZATION FILTER — Strip tenant-identifying data before SLB publish
// ============================================================================

const SENSITIVE_FIELDS = [
  'tenant_id', 'tenant_name', 'user_id', 'user_name', 'email',
  'session_id', 'ip_address', 'api_key', 'token', 'password',
  'company', 'organization', 'customer', 'operator_name', 'part_number',
];

function anonymizePayload(data: Record<string, unknown>, tenantId: string): { anonymized: Record<string, unknown>; result: AnonymizationResult } {
  const removed: string[] = [];
  const hashed: string[] = [];
  const sizeBefore = JSON.stringify(data).length;
  const anonymized: Record<string, unknown> = {};

  for (const [key, value] of Object.entries(data)) {
    const keyLower = key.toLowerCase();
    if (SENSITIVE_FIELDS.some(f => keyLower.includes(f))) {
      removed.push(key);
      continue;
    }
    if (typeof value === 'string' && value.includes(tenantId)) {
      // Hash any value containing tenant ID
      anonymized[key] = crypto.createHash('sha256').update(value).digest('hex').slice(0, 16);
      hashed.push(key);
    } else {
      anonymized[key] = value;
    }
  }

  return {
    anonymized,
    result: {
      original_fields_removed: removed,
      fields_hashed: hashed,
      payload_size_before: sizeBefore,
      payload_size_after: JSON.stringify(anonymized).length,
    },
  };
}

function hashTenantId(tenantId: string): string {
  return 'tenant_' + crypto.createHash('sha256').update(tenantId).digest('hex').slice(0, 12);
}

// ============================================================================
// MULTI-TENANT ENGINE — SINGLETON
// ============================================================================

export class MultiTenantEngine {
  private config: MultiTenantConfig;
  private tenants: Map<string, Tenant> = new Map();
  private slbPatterns: Map<string, SharedPattern> = new Map();
  private initialized: boolean = false;

  // Telemetry
  private metrics = {
    tenants_created: 0, tenants_deleted: 0, tenants_suspended: 0,
    context_injections: 0, resource_limit_hits: 0,
    slb_published: 0, slb_consumed: 0, slb_promoted: 0, slb_quarantined: 0,
    anonymizations: 0, leakage_blocks: 0,
  };

  constructor(configOverrides?: Partial<MultiTenantConfig>) {
    this.config = { ...DEFAULT_MT_CONFIG, ...configOverrides };
  }

  init(): void {
    if (this.initialized) return;
    ensureDirs(BASE_DIR);
    this.loadRegistry();
    this.loadSLB();

    // Ensure default tenant exists
    if (!this.tenants.has(this.config.default_tenant_id)) {
      this.createTenantInternal(this.config.default_tenant_id, 'Default Tenant', 'system');
    }

    this.initialized = true;
    log.info(`[TENANT] Engine initialized (${this.tenants.size} tenants, ${this.slbPatterns.size} SLB patterns)`);
  }

  // ==========================================================================
  // TENANT LIFECYCLE — Create, suspend, delete (2-phase)
  // ==========================================================================

  createTenant(name: string, createdBy: string = 'system',
               configOverrides?: Partial<TenantConfig>): { success: boolean; tenant?: Tenant; reason?: string } {
    this.init();
    
    // Gate: max tenants
    const activeCount = [...this.tenants.values()].filter(t => t.status === 'active').length;
    if (activeCount >= this.config.max_tenants) {
      return { success: false, reason: `Maximum ${this.config.max_tenants} tenants reached` };
    }

    const id = randomUUID();
    const tenant = this.createTenantInternal(id, name, createdBy, configOverrides);
    if (!tenant) return { success: false, reason: 'Tenant creation failed' };
    return { success: true, tenant };
  }

  private createTenantInternal(id: string, name: string, createdBy: string,
                               configOverrides?: Partial<TenantConfig>): Tenant | null {
    try {
      const tenantDir = path.join(process.cwd(), this.config.base_state_dir, id);
      ensureDirs(tenantDir);

      const tenant: Tenant = {
        id, name,
        created_at: Date.now(), updated_at: Date.now(),
        status: 'active',
        config: { ...DEFAULT_TENANT_CONFIG, ...configOverrides },
        stats: {
          dispatchers_registered: 0, hooks_active: 0, state_bytes: 0,
          sessions_this_hour: 0, slb_patterns_published: 0,
          slb_patterns_consumed: 0, last_activity: Date.now(),
        },
      };

      this.tenants.set(id, tenant);
      this.saveRegistry();
      this.metrics.tenants_created++;
      log.info(`[TENANT] Created tenant '${name}' (${id})`);
      return tenant;
    } catch (e) {
      log.warn(`[TENANT] Create failed: ${(e as Error).message}`);
      return null;
    }
  }

  suspendTenant(tenantId: string): { success: boolean; reason?: string } {
    this.init();
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return { success: false, reason: 'Tenant not found' };
    if (tenant.id === this.config.default_tenant_id) {
      return { success: false, reason: 'Cannot suspend default tenant' };
    }

    const updated: Tenant = { ...tenant, status: 'suspended', updated_at: Date.now() };
    this.tenants.set(tenantId, updated);
    this.saveRegistry();
    this.metrics.tenants_suspended++;
    return { success: true };
  }

  reactivateTenant(tenantId: string): { success: boolean; reason?: string } {
    this.init();
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return { success: false, reason: 'Tenant not found' };
    if (tenant.status !== 'suspended') return { success: false, reason: `Tenant is ${tenant.status}, not suspended` };

    const updated: Tenant = { ...tenant, status: 'active', updated_at: Date.now() };
    this.tenants.set(tenantId, updated);
    this.saveRegistry();
    return { success: true };
  }

  // 2-phase deletion: soft_delete → hard_purge after delay
  deleteTenant(tenantId: string, deletedBy: string = 'system'): { success: boolean; phase: string; reason?: string } {
    this.init();
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return { success: false, phase: 'none', reason: 'Tenant not found' };
    if (tenant.id === this.config.default_tenant_id) {
      return { success: false, phase: 'none', reason: 'Cannot delete default tenant' };
    }

    if (tenant.status !== 'soft_deleted') {
      // Phase 1: Soft delete
      const updated: Tenant = { ...tenant, status: 'soft_deleted', updated_at: Date.now() };
      this.tenants.set(tenantId, updated);
      this.saveRegistry();
      this.writeDeletionLog({ tenant_id: tenantId, phase: 'soft_delete', initiated_at: Date.now(), files_removed: 0, bytes_freed: 0, initiated_by: deletedBy });
      this.metrics.tenants_deleted++;
      return { success: true, phase: 'soft_delete' };
    } else {
      // Phase 2: Hard purge (only if soft_delete age > purge_delay)
      const ageHours = (Date.now() - tenant.updated_at) / 3_600_000;
      if (ageHours < this.config.purge_delay_hours) {
        return { success: false, phase: 'waiting', reason: `Purge available in ${(this.config.purge_delay_hours - ageHours).toFixed(1)} hours` };
      }

      const purgeResult = this.hardPurge(tenantId, deletedBy);
      return { success: purgeResult.success, phase: 'hard_purge', reason: purgeResult.reason };
    }
  }

  private hardPurge(tenantId: string, purgedBy: string): { success: boolean; reason?: string } {
    try {
      const tenantDir = path.join(process.cwd(), this.config.base_state_dir, tenantId);
      let filesRemoved = 0;
      let bytesFreed = 0;

      if (fs.existsSync(tenantDir)) {
        const files = this.walkDir(tenantDir);
        for (const file of files) {
          try {
            const stat = fs.statSync(file);
            bytesFreed += stat.size;
            fs.unlinkSync(file);
            filesRemoved++;
          } catch { /* best-effort */ }
        }
        try { fs.rmSync(tenantDir, { recursive: true, force: true }); } catch { /* best-effort */ }
      }

      this.tenants.set(tenantId, { ...this.tenants.get(tenantId)!, status: 'purged', updated_at: Date.now() });
      this.saveRegistry();
      this.writeDeletionLog({ tenant_id: tenantId, phase: 'hard_purge', initiated_at: Date.now(), completed_at: Date.now(), files_removed: filesRemoved, bytes_freed: bytesFreed, initiated_by: purgedBy });

      log.info(`[TENANT] Hard purge: ${tenantId} (${filesRemoved} files, ${(bytesFreed / 1024).toFixed(0)}KB)`);
      return { success: true };
    } catch (e) {
      return { success: false, reason: `Purge failed: ${(e as Error).message}` };
    }
  }

  private walkDir(dir: string): string[] {
    const files: string[] = [];
    try {
      for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        const full = path.join(dir, entry.name);
        if (entry.isDirectory()) files.push(...this.walkDir(full));
        else files.push(full);
      }
    } catch { /* non-fatal */ }
    return files;
  }

  // ==========================================================================
  // TENANT CONTEXT — Frozen injection for dispatcher calls
  // ==========================================================================

  getTenantContext(tenantId: string): TenantContext | null {
    this.init();
    const tenant = this.tenants.get(tenantId);
    if (!tenant || tenant.status !== 'active') return null;

    this.metrics.context_injections++;
    const updated: Tenant = { ...tenant, stats: { ...tenant.stats, last_activity: Date.now() } };
    this.tenants.set(tenantId, updated);

    return Object.freeze({
      tenant_id: tenant.id,
      tenant_name: tenant.name,
      state_dir: path.join(process.cwd(), this.config.base_state_dir, tenant.id),
      is_frozen: tenant.config.frozen_tenant_id,
      inference_geo: tenant.config.inference_geo,
      zero_data_retention: tenant.config.zero_data_retention,
    });
  }

  // ==========================================================================
  // RESOURCE LIMITS — Enforce per-tenant caps
  // ==========================================================================

  checkResourceLimit(tenantId: string, resource: 'dispatchers' | 'hooks' | 'state_bytes' | 'sessions'):
    { allowed: boolean; current: number; limit: number; reason?: string } {
    this.init();
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return { allowed: false, current: 0, limit: 0, reason: 'Tenant not found' };

    const cfg = tenant.config;
    const stats = tenant.stats;
    let current: number, limit: number;

    switch (resource) {
      case 'dispatchers': current = stats.dispatchers_registered; limit = cfg.max_dispatchers; break;
      case 'hooks': current = stats.hooks_active; limit = cfg.max_hooks; break;
      case 'state_bytes': current = stats.state_bytes; limit = cfg.max_state_bytes; break;
      case 'sessions': current = stats.sessions_this_hour; limit = cfg.max_sessions_per_hour; break;
    }

    if (current >= limit) {
      this.metrics.resource_limit_hits++;
      return { allowed: false, current, limit, reason: `${resource} limit reached (${current}/${limit})` };
    }
    return { allowed: true, current, limit };
  }

  // ==========================================================================
  // SHARED LEARNING BUS — Anonymized cross-tenant pattern sharing
  // ==========================================================================

  publishPattern(tenantId: string, type: PatternType,
                 data: Record<string, unknown>, confidence: number): { success: boolean; pattern_id?: string; anonymization?: AnonymizationResult; reason?: string } {
    this.init();
    const tenant = this.tenants.get(tenantId);
    if (!tenant) return { success: false, reason: 'Tenant not found' };
    if (!tenant.config.slb_publish) return { success: false, reason: 'SLB publishing disabled for this tenant' };
    if (!this.config.slb.enabled) return { success: false, reason: 'SLB globally disabled' };
    if (confidence < this.config.slb.min_confidence_publish) {
      return { success: false, reason: `Confidence ${confidence.toFixed(2)} below minimum ${this.config.slb.min_confidence_publish}` };
    }

    // Pattern type filter
    if (tenant.config.slb_pattern_filter.length > 0 && !tenant.config.slb_pattern_filter.includes(type)) {
      return { success: false, reason: `Pattern type '${type}' not in tenant's allowed filter` };
    }

    // Anonymize
    const { anonymized, result: anonResult } = anonymizePayload(data, tenantId);
    this.metrics.anonymizations++;

    // Check for leakage — verify tenant ID not in anonymized payload
    const anonStr = JSON.stringify(anonymized);
    if (anonStr.includes(tenantId)) {
      this.metrics.leakage_blocks++;
      log.error(`[TENANT] LEAKAGE BLOCKED: tenant ID found in anonymized payload for ${tenantId}`);
      return { success: false, reason: 'Anonymization failed — tenant ID detected in output' };
    }

    const pattern: SharedPattern = {
      id: randomUUID(), type,
      source_tenant: hashTenantId(tenantId),
      published_at: Date.now(),
      data: anonymized,
      confidence,
      external_weight: this.config.slb.external_weight,
      promotions: 0,
      quarantined: false,
    };

    // Enforce max patterns
    if (this.slbPatterns.size >= this.config.slb.max_patterns) {
      // Evict oldest non-promoted pattern
      const oldest = [...this.slbPatterns.entries()]
        .filter(([, p]) => p.promotions === 0)
        .sort((a, b) => a[1].published_at - b[1].published_at)[0];
      if (oldest) this.slbPatterns.delete(oldest[0]);
    }

    this.slbPatterns.set(pattern.id, pattern);
    this.saveSLB();

    // Update tenant stats
    const updated: Tenant = { ...tenant, stats: { ...tenant.stats, slb_patterns_published: tenant.stats.slb_patterns_published + 1 } };
    this.tenants.set(tenantId, updated);
    this.saveRegistry();
    this.metrics.slb_published++;

    return { success: true, pattern_id: pattern.id, anonymization: anonResult };
  }

  consumePatterns(tenantId: string, type?: PatternType, limit: number = 20):
    { patterns: SharedPattern[]; count: number } {
    this.init();
    const tenant = this.tenants.get(tenantId);
    if (!tenant || !tenant.config.slb_subscribe || !this.config.slb.enabled) {
      return { patterns: [], count: 0 };
    }

    let patterns = [...this.slbPatterns.values()]
      .filter(p => !p.quarantined)
      .filter(p => p.source_tenant !== hashTenantId(tenantId)); // Don't consume own patterns

    if (type) patterns = patterns.filter(p => p.type === type);
    if (tenant.config.slb_pattern_filter.length > 0) {
      patterns = patterns.filter(p => tenant.config.slb_pattern_filter.includes(p.type));
    }

    patterns = patterns.sort((a, b) => b.confidence - a.confidence).slice(0, limit);

    // Update stats
    const updated: Tenant = { ...tenant, stats: { ...tenant.stats, slb_patterns_consumed: tenant.stats.slb_patterns_consumed + patterns.length } };
    this.tenants.set(tenantId, updated);
    this.metrics.slb_consumed += patterns.length;

    return { patterns, count: patterns.length };
  }

  promotePattern(patternId: string): { success: boolean; promotions?: number; reason?: string } {
    const pattern = this.slbPatterns.get(patternId);
    if (!pattern) return { success: false, reason: 'Pattern not found' };
    if (pattern.quarantined) return { success: false, reason: 'Pattern is quarantined' };

    const updated: SharedPattern = { ...pattern, promotions: pattern.promotions + 1 };
    this.slbPatterns.set(patternId, updated);
    this.saveSLB();
    this.metrics.slb_promoted++;
    return { success: true, promotions: updated.promotions };
  }

  quarantinePattern(patternId: string): { success: boolean; reason?: string } {
    const pattern = this.slbPatterns.get(patternId);
    if (!pattern) return { success: false, reason: 'Pattern not found' };

    const updated: SharedPattern = { ...pattern, quarantined: true };
    this.slbPatterns.set(patternId, updated);
    this.saveSLB();
    this.metrics.slb_quarantined++;
    return { success: true };
  }

  // ==========================================================================
  // QUERIES
  // ==========================================================================

  getTenant(tenantId: string): Tenant | null {
    this.init();
    return this.tenants.get(tenantId) || null;
  }

  listTenants(status?: TenantStatus): Tenant[] {
    this.init();
    let tenants = [...this.tenants.values()];
    if (status) tenants = tenants.filter(t => t.status === status);
    return tenants;
  }

  getSLBStats(): {
    total_patterns: number; quarantined: number; avg_confidence: number;
    by_type: Record<string, number>; top_promoted: { id: string; promotions: number }[];
  } {
    this.init();
    const patterns = [...this.slbPatterns.values()];
    const active = patterns.filter(p => !p.quarantined);
    const byType: Record<string, number> = {};
    for (const p of active) {
      byType[p.type] = (byType[p.type] || 0) + 1;
    }
    const topPromoted = [...active]
      .filter(p => p.promotions > 0)
      .sort((a, b) => b.promotions - a.promotions)
      .slice(0, 10)
      .map(p => ({ id: p.id, promotions: p.promotions }));

    return {
      total_patterns: patterns.length,
      quarantined: patterns.filter(p => p.quarantined).length,
      avg_confidence: active.length > 0 ? active.reduce((s, p) => s + p.confidence, 0) / active.length : 0,
      by_type: byType,
      top_promoted: topPromoted,
    };
  }

  // ==========================================================================
  // PERSISTENCE
  // ==========================================================================

  private saveRegistry(): void {
    try {
      ensureDirs(BASE_DIR);
      const data = JSON.stringify({ tenants: Object.fromEntries(this.tenants), saved_at: Date.now() });
      const tmp = REGISTRY_PATH + '.tmp';
      fs.writeFileSync(tmp, data);
      fs.renameSync(tmp, REGISTRY_PATH);
    } catch (e) {
      log.warn(`[TENANT] Registry save failed: ${(e as Error).message}`);
    }
  }

  private loadRegistry(): void {
    try {
      if (fs.existsSync(REGISTRY_PATH)) {
        const raw = JSON.parse(fs.readFileSync(REGISTRY_PATH, 'utf-8'));
        if (raw.tenants) {
          for (const [k, v] of Object.entries(raw.tenants)) {
            this.tenants.set(k, v as Tenant);
          }
        }
      }
    } catch (e) {
      log.warn(`[TENANT] Registry load failed: ${(e as Error).message}`);
    }
  }

  private saveSLB(): void {
    try {
      ensureDirs(BASE_DIR);
      const data = JSON.stringify({ patterns: Object.fromEntries(this.slbPatterns), saved_at: Date.now() });
      const tmp = SLB_PATH + '.tmp';
      fs.writeFileSync(tmp, data);
      fs.renameSync(tmp, SLB_PATH);
    } catch (e) {
      log.warn(`[TENANT] SLB save failed: ${(e as Error).message}`);
    }
  }

  private loadSLB(): void {
    try {
      if (fs.existsSync(SLB_PATH)) {
        const raw = JSON.parse(fs.readFileSync(SLB_PATH, 'utf-8'));
        if (raw.patterns) {
          for (const [k, v] of Object.entries(raw.patterns)) {
            this.slbPatterns.set(k, v as SharedPattern);
          }
        }
      }
    } catch (e) {
      log.warn(`[TENANT] SLB load failed: ${(e as Error).message}`);
    }
  }

  private writeDeletionLog(record: DeletionRecord): void {
    try {
      ensureDirs(BASE_DIR);
      fs.appendFileSync(DELETION_LOG, JSON.stringify(record) + '\n');
    } catch { /* non-fatal */ }
  }

  // ==========================================================================
  // METRICS & CONFIG
  // ==========================================================================

  getStats(): {
    total_tenants: number; active: number; suspended: number; deleted: number;
    slb: ReturnType<typeof this.getSLBStats>; metrics: typeof this.metrics;
  } {
    this.init();
    const tenants = [...this.tenants.values()];
    return {
      total_tenants: tenants.length,
      active: tenants.filter(t => t.status === 'active').length,
      suspended: tenants.filter(t => t.status === 'suspended').length,
      deleted: tenants.filter(t => t.status === 'soft_deleted' || t.status === 'purged').length,
      slb: this.getSLBStats(),
      metrics: { ...this.metrics },
    };
  }

  getConfig(): MultiTenantConfig { return { ...this.config }; }

  updateConfig(updates: Partial<MultiTenantConfig>): MultiTenantConfig {
    this.config = { ...this.config, ...updates };
    return { ...this.config };
  }

  shutdown(): void {
    this.saveRegistry();
    this.saveSLB();
    this.initialized = false;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const multiTenantEngine = new MultiTenantEngine();
