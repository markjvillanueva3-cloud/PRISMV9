/**
 * NL Hook Dispatcher Action Schemas
 * ===================================
 * Per-action Zod schemas for all 8 prism_nl_hook actions.
 * Covers natural language hook creation, parsing, approval, removal,
 * listing, retrieval, stats, and config.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/nlHookActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// create — Full NL pipeline: parse -> compile -> validate -> sandbox -> deploy
// ============================================================================

const create = z.object({
  description: z.string().describe("Natural language hook description"),
}).passthrough();

// ============================================================================
// parse — Parse NL description to HookSpec only (no compile/deploy)
// ============================================================================

const parse = z.object({
  description: z.string().describe("Natural language hook description to parse"),
}).passthrough();

// ============================================================================
// approve — Approve a pending LLM-generated hook
// ============================================================================

const approve = z.object({
  hook_id: z.string().describe("Hook ID to approve"),
  approver: z.string().optional().describe("Approver name (default: admin)"),
}).passthrough();

// ============================================================================
// remove — Remove/rollback a deployed hook
// ============================================================================

const remove = z.object({
  hook_id: z.string().describe("Hook ID to remove"),
}).passthrough();

// ============================================================================
// list — List all NL-authored hooks with optional filters
// ============================================================================

const list = z.object({
  status: z.string().optional().describe("Filter by deploy status"),
  tag: z.string().optional().describe("Filter by tag"),
}).passthrough();

// ============================================================================
// get — Get details for a single hook
// ============================================================================

const get = z.object({
  hook_id: z.string().describe("Hook ID to retrieve"),
}).passthrough();

// ============================================================================
// stats — Get NL hook registry statistics
// ============================================================================

const stats = z.object({}).passthrough();

// ============================================================================
// config — View or update NL hook config
// ============================================================================

const config = z.object({
  updates: z.record(z.string(), z.unknown()).optional().describe("Config key-value updates to apply"),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_NL_HOOK_SCHEMAS: ActionSchemaMap = {
  create,
  parse,
  approve,
  remove,
  list,
  get,
  stats,
  config,
};
