/**
 * Zod Action Schemas — hookDispatcher
 * ======================================
 * 20 actions: list, get, execute, chain, toggle,
 *   emit, event_list, event_history,
 *   fire, chain_v2, status, history,
 *   enable, disable, coverage, gaps, performance, failures,
 *   subscribe, reactive_chains
 *
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// V2 HOOK TOOLS (5)
// ============================================================================

/** list — List registered hooks with optional filters */
const list = z.object({
  event: z.string().optional(),
  phase: z.string().optional(),
  enabled: z.boolean().optional(),
}).passthrough();

/** get — Get a specific hook by ID */
const get = z.object({
  hook_id: z.string().min(1),
}).passthrough();

/** execute — Execute a specific hook */
const execute = z.object({
  hook_id: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

/** chain — Execute a hook chain for an event */
const chain = z.object({
  event: z.string().min(1),
  phase: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  stop_on_error: z.boolean().optional(),
  stop_on_halt: z.boolean().optional(),
}).passthrough();

/** toggle — Enable/disable a hook */
const toggle = z.object({
  hook_id: z.string().min(1),
  enabled: z.boolean(),
}).passthrough();

// ============================================================================
// EVENT TOOLS (3)
// ============================================================================

/** emit — Publish an event */
const emit = z.object({
  event: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
}).passthrough();

/** event_list — List known events */
const event_list = z.object({
  category: z.string().optional(),
}).passthrough();

/** event_history — Get event history */
const event_history = z.object({
  event: z.string().optional(),
  category: z.string().optional(),
  limit: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// V3/MANAGEMENT TOOLS (10)
// ============================================================================

/** fire — Execute a hook with safety validation */
const fire = z.object({
  hook_id: z.string().min(1),
  data: z.record(z.string(), z.unknown()).optional(),
  context: z.record(z.string(), z.unknown()).optional(),
  validate_safety: z.boolean().optional(),
}).passthrough();

/** chain_v2 — Execute hook chain with rollback support */
const chain_v2 = z.object({
  event: z.string().min(1),
  phase: z.string().optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  parallel: z.boolean().optional(),
  enable_rollback: z.boolean().optional(),
}).passthrough();

/** status — Get hook system status overview */
const status = z.object({
  filter_domain: z.string().optional(),
  filter_enabled: z.boolean().optional(),
  show_metrics: z.boolean().optional(),
}).passthrough();

/** history — Get execution history */
const history = z.object({
  event: z.string().optional(),
  hook_id: z.string().optional(),
  last_n: z.number().int().positive().optional(),
}).passthrough();

/** enable — Enable a hook with reason tracking */
const enable = z.object({
  hook_id: z.string().min(1),
  reason: z.string().optional(),
}).passthrough();

/** disable — Disable a hook with reason tracking */
const disable = z.object({
  hook_id: z.string().min(1),
  reason: z.string().optional(),
  temporary: z.boolean().optional(),
}).passthrough();

/** coverage — Get hook coverage report */
const coverage = z.object({
  domain: z.string().optional(),
}).passthrough();

/** gaps — Get hook gap analysis */
const gaps = z.object({
  domain: z.string().optional(),
  severity: z.string().optional(),
}).passthrough();

/** performance — Get hook performance metrics */
const performance = z.object({
  hook_id: z.string().optional(),
  sort_by: z.string().optional(),
  limit: z.number().int().positive().optional(),
}).passthrough();

/** failures — Get hook failure records */
const failures = z.object({
  hook_id: z.string().optional(),
  last_n: z.number().int().positive().optional(),
  include_stack: z.boolean().optional(),
}).passthrough();

// ============================================================================
// PUB/SUB PROTOCOL (2)
// ============================================================================

/** subscribe — Subscribe to events */
const subscribe = z.object({
  event: z.string().min(1),
  filter: z.record(z.string(), z.unknown()).optional(),
  description: z.string().optional(),
  active: z.boolean().optional(),
}).passthrough();

/** reactive_chains — List reactive event chains */
const reactive_chains = z.object({}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const HOOK_ACTION_SCHEMAS: ActionSchemaMap = {
  // V2 Hook Tools (5)
  list,
  get,
  execute,
  chain,
  toggle,
  // Event Tools (3)
  emit,
  event_list,
  event_history,
  // V3/Management (10)
  fire,
  chain_v2,
  status,
  history,
  enable,
  disable,
  coverage,
  gaps,
  performance,
  failures,
  // Pub/Sub (2)
  subscribe,
  reactive_chains,
};
