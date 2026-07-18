/**
 * Zod Action Schemas — tenantDispatcher
 * ========================================
 * 15 actions: create, get, list, suspend, reactivate, delete,
 *   get_context, check_limit, publish_pattern, consume_patterns,
 *   promote_pattern, quarantine_pattern, slb_stats, stats, config
 *
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// TENANT LIFECYCLE (6)
// ============================================================================

/** create — Create a new tenant */
const create = z.object({
  name: z.string().min(1),
  created_by: z.string().optional(),
  config: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

/** get — Get tenant details */
const get = z.object({
  tenant_id: z.string().min(1),
}).passthrough();

/** list — List tenants */
const list = z.object({
  status: z.string().optional(),
}).passthrough();

/** suspend — Suspend a tenant */
const suspend = z.object({
  tenant_id: z.string().min(1),
}).passthrough();

/** reactivate — Reactivate a suspended tenant */
const reactivate = z.object({
  tenant_id: z.string().min(1),
}).passthrough();

/** delete — Delete a tenant (2-phase) */
const del = z.object({
  tenant_id: z.string().min(1),
  deleted_by: z.string().optional(),
}).passthrough();

// ============================================================================
// CONTEXT & RESOURCE LIMITS (2)
// ============================================================================

/** get_context — Get tenant execution context */
const get_context = z.object({
  tenant_id: z.string().min(1),
}).passthrough();

/** check_limit — Check resource limit for a tenant */
const check_limit = z.object({
  tenant_id: z.string().min(1),
  resource: z.string().min(1),
}).passthrough();

// ============================================================================
// SHARED LEARNING BUS (4)
// ============================================================================

/** publish_pattern — Publish a pattern to the SLB */
const publish_pattern = z.object({
  tenant_id: z.string().min(1),
  type: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
  confidence: z.number().min(0).max(1).optional(),
}).passthrough();

/** consume_patterns — Consume patterns from SLB */
const consume_patterns = z.object({
  tenant_id: z.string().min(1),
  type: z.string().min(1),
  limit: z.number().int().positive().optional(),
}).passthrough();

/** promote_pattern — Promote a pattern (admin) */
const promote_pattern = z.object({
  tenant_id: z.string().min(1),
  pattern_id: z.string().min(1),
}).passthrough();

/** quarantine_pattern — Quarantine a pattern (admin) */
const quarantine_pattern = z.object({
  tenant_id: z.string().min(1),
  pattern_id: z.string().min(1),
}).passthrough();

// ============================================================================
// STATS & CONFIG (3)
// ============================================================================

/** slb_stats — Shared Learning Bus statistics */
const slb_stats = z.object({}).passthrough();

/** stats — Overall tenant system stats */
const stats = z.object({}).passthrough();

/** config — Get or update system config */
const config = z.object({
  tenant_id: z.string().optional(),
  updates: z.record(z.string(), z.unknown()).optional(),
  role: z.string().optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const TENANT_ACTION_SCHEMAS: ActionSchemaMap = {
  // Tenant Lifecycle (6)
  create,
  get,
  list,
  suspend,
  reactivate,
  delete: del,
  // Context & Resource Limits (2)
  get_context,
  check_limit,
  // Shared Learning Bus (4)
  publish_pattern,
  consume_patterns,
  promote_pattern,
  quarantine_pattern,
  // Stats & Config (3)
  slb_stats,
  stats,
  config,
};
