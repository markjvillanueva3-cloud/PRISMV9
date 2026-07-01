/**
 * Guard Dispatcher Action Schemas
 * ================================
 * Per-action Zod schemas for all 14 prism_guard actions.
 * Covers decision logging, failure library, error capture, pre-write gates,
 * pre-call validation, autohook diagnostics, and D3 learning/pattern detection.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/guardActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// decision_log — Record / search / list decisions
// ============================================================================

const decision_log = z.object({
  action: z.enum(["record", "search", "list"]),
  // record fields
  decision: z.string().optional(),
  alternatives: z.array(z.string()).optional(),
  reasoning: z.string().optional(),
  revisit_if: z.array(z.string()).optional(),
  confidence: z.number().min(0).max(1).optional(),
  domain: z.string().optional(),
  // search fields
  query: z.string().optional(),
}).passthrough();

// ============================================================================
// failure_library — Record / check / search / stats for failure patterns
// ============================================================================

const failure_library = z.object({
  action: z.enum(["record", "check", "search", "stats"]),
  // record fields
  type: z.string().optional(),
  context: z.string().optional(),
  error: z.string().optional(),
  root_cause: z.string().optional(),
  prevention: z.string().optional(),
  domain: z.string().optional(),
  severity: z.enum(["low", "medium", "high", "critical"]).optional(),
  // check/search fields
  query: z.string().optional(),
}).passthrough();

// ============================================================================
// error_capture — Capture and cross-reference errors with failure patterns
// ============================================================================

const error_capture = z.object({
  error_message: z.string().optional(),
  tool_name: z.string().optional(),
  error_type: z.string().optional(),
  context: z.string().optional(),
  parameters: z.record(z.string(), z.unknown()).optional(),
  auto_fix_attempted: z.boolean().optional(),
}).passthrough();

// ============================================================================
// pre_write_gate — Approve / check / status for large file writes
// ============================================================================

const pre_write_gate = z.object({
  action: z.enum(["approve", "check", "status"]),
  file_path: z.string().optional(),
  plan: z.string().optional(),
  line_count: z.number().int().nonnegative().optional(),
}).passthrough();

// ============================================================================
// pre_write_diff — Register reads and check writes for read-before-write gate
// ============================================================================

const pre_write_diff = z.object({
  action: z.enum(["register_read", "check_write", "status"]),
  file_path: z.string().optional(),
}).passthrough();

// ============================================================================
// pre_call_validate — Check if a tool name has been renamed
// ============================================================================

const pre_call_validate = z.object({
  tool_name: z.string(),
  known_renames: z.record(z.string(), z.string()).optional(),
}).passthrough();

// ============================================================================
// autohook_status — Query hook execution history
// ============================================================================

const autohook_status = z.object({
  last_n: z.number().int().positive().optional(),
}).passthrough();

// ============================================================================
// autohook_test — Fire a test hook to verify system is active
// ============================================================================

const autohook_test = z.object({}).passthrough();

// ============================================================================
// pattern_scan — D3: Detect patterns in content via Python
// ============================================================================

const pattern_scan = z.object({
  content: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
}).passthrough();

// ============================================================================
// pattern_history — D3: List detected pattern history
// ============================================================================

const pattern_history = z.object({}).passthrough();

// ============================================================================
// learning_query — D3: Query the learning store by topic
// ============================================================================

const learning_query = z.object({
  topic: z.string().optional(),
  query: z.string().optional(),
}).passthrough();

// ============================================================================
// learning_save — D3: Save a lesson to the learning store
// ============================================================================

const learning_save = z.object({
  data: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  content: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  lesson: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
}).passthrough();

// ============================================================================
// lkg_status — D3: Last-known-good status tracker
// ============================================================================

const lkg_status = z.object({
  subcommand: z.enum(["get", "mark", "rollback", "history"]).optional(),
  checkpoint: z.string().optional(),
  reason: z.string().optional(),
}).passthrough();

// ============================================================================
// priority_score — D3: Score priority of content via Python
// ============================================================================

const priority_score = z.object({
  content: z.union([z.string(), z.record(z.string(), z.unknown())]).optional(),
  target: z.union([z.string(), z.number()]).optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_GUARD_SCHEMAS: ActionSchemaMap = {
  decision_log,
  failure_library,
  error_capture,
  pre_write_gate,
  pre_write_diff,
  pre_call_validate,
  autohook_status,
  autohook_test,
  pattern_scan,
  pattern_history,
  learning_query,
  learning_save,
  lkg_status,
  priority_score,
};
