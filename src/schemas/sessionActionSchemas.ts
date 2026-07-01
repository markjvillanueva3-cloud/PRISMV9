/**
 * sessionActionSchemas.ts — Zod action schemas for sessionDispatcher
 *
 * Validated AFTER normalizeParams(), BEFORE the switch(action) dispatch.
 *
 * Design decisions:
 * - `.passthrough()` on all schemas: extra params flow through (hooks, metadata, debug)
 * - Only enforce fields the dispatcher actually reads
 * - Aliases are resolved by normalizeParams before validation
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// SHARED PRIMITIVES
// ============================================================================

const optStr = z.string().optional();
const optNum = z.number().optional();
const optBool = z.boolean().optional();

// ============================================================================
// STATE MANAGEMENT (6 actions)
// ============================================================================

/** state_load — No params required */
const state_load = z.object({}).passthrough();

/** state_save — Merge state data into CURRENT_STATE.json */
const state_save = z.object({
  state: z.record(z.string(), z.unknown()).optional(),
  path: optStr,
  // All other top-level keys are merged into state
}).passthrough();

/** state_checkpoint — Record progress checkpoint */
const state_checkpoint = z.object({
  completed: z.union([z.string(), z.number()]).optional(),
  next: optStr,
}).passthrough();

/** state_diff — Compare current state with a previous snapshot */
const state_diff = z.object({
  previous_path: optStr,
}).passthrough();

/** state_rollback — Preview or execute rollback to a checkpoint */
const state_rollback = z.object({
  subcommand: z.enum(["preview", "execute", "list"]).optional(),
  checkpoint_id: optStr,
  target: optStr,
}).passthrough();

/** state_reconstruct — Rebuild state from event log + transcripts */
const state_reconstruct = z.object({
  after_timestamp: optStr,
  checkpoint_id: optStr,
  transcript_summary: optStr,
}).passthrough();

// ============================================================================
// SESSION LIFECYCLE (6 actions)
// ============================================================================

/** session_start — Begin a new session */
const session_start = z.object({
  session_name: optStr,
}).passthrough();

/** session_end — End current session with handoff info */
const session_end = z.object({
  status: optStr,
  next_actions: z.array(z.string()).optional(),
  quick_resume: optStr,
  summary: optStr,
}).passthrough();

/** session_recover — Attempt to recover from lost state */
const session_recover = z.object({}).passthrough();

/** quick_resume — Get quick resume summary */
const quick_resume = z.object({}).passthrough();

/** resume_session — Resume with compaction detection */
const resume_session = z.object({
  compaction_detected: optBool,
}).passthrough();

/** handoff_prepare — Prepare session for handoff */
const handoff_prepare = z.object({
  status: optStr,
  next_actions: z.array(z.string()).optional(),
}).passthrough();

// ============================================================================
// MEMORY (2 actions)
// ============================================================================

/** memory_save — Save a key/value into session memory */
const memory_save = z.object({
  key: z.string(),
  value: z.unknown(),
  category: optStr,
}).passthrough();

/** memory_recall — Retrieve from session memory */
const memory_recall = z.object({
  key: optStr,
  category: optStr,
}).passthrough();

// ============================================================================
// CONTEXT MANAGEMENT (6 actions)
// ============================================================================

/** context_pressure — Report/track context window pressure */
const context_pressure = z.object({
  estimated_tokens: optNum,
}).passthrough();

/** context_size — Estimate context window token usage */
const context_size = z.object({}).passthrough();

/** context_compress — Compress context to reduce token usage */
const context_compress = z.object({
  compression_level: optStr,
  preserve_categories: z.array(z.string()).optional(),
}).passthrough();

/** context_expand — Re-expand previously compressed context */
const context_expand = z.object({
  sections: z.array(z.string()).optional(),
}).passthrough();

/** context_preload — Get preloaded context block */
const context_preload = z.object({}).passthrough();

/** context_boot — Get boot context block */
const context_boot = z.object({}).passthrough();

/** context_delta_boot — Get delta-based boot context */
const context_delta_boot = z.object({
  since_commit: optStr,
  commit: optStr,
}).passthrough();

// ============================================================================
// COMPACTION & TRANSCRIPTS (2 actions)
// ============================================================================

/** compaction_detect — Detect if a compaction has occurred */
const compaction_detect = z.object({}).passthrough();

/** transcript_read — Read transcript files */
const transcript_read = z.object({
  transcript_name: optStr,
  lines: optNum,
  from_end: optBool,
}).passthrough();

// ============================================================================
// CHECKPOINT & AUTO-CHECKPOINT (3 actions)
// ============================================================================

/** auto_checkpoint — Determine if a checkpoint should be taken */
const auto_checkpoint = z.object({
  force: optBool,
  tool_calls: optNum,
  error_count: optNum,
  success_count: optNum,
}).passthrough();

/** checkpoint_enhanced — Enhanced checkpoint management */
const checkpoint_enhanced = z.object({
  subcommand: z.enum(["list", "create", "get", "delete", "chain", "summary", "sessions"]).optional(),
  checkpoint_id: optStr,
  session_id: optStr,
}).passthrough();

/** resume_score — Validate and score resume quality */
const resume_score = z.object({
  subcommand: z.enum(["detect", "validate", "generate", "actions"]).optional(),
  level: optStr,
  save: optBool,
}).passthrough();

// ============================================================================
// WIP (3 actions)
// ============================================================================

/** wip_capture — Capture work-in-progress state */
const wip_capture = z.object({
  description: optStr,
  notes: optStr,
  next: optStr,
  completed: z.union([z.string(), z.number()]).optional(),
  total: z.union([z.string(), z.number()]).optional(),
}).passthrough();

/** wip_list — List all WIP captures */
const wip_list = z.object({}).passthrough();

/** wip_restore — Restore a WIP capture by ID */
const wip_restore = z.object({
  wip_id: optStr,
  id: optStr,
}).passthrough();

// ============================================================================
// WORKFLOW (4 actions)
// ============================================================================

/** workflow_start — Start a new workflow */
const workflow_start = z.object({
  type: optStr,
  workflow_type: optStr,
  name: optStr,
}).passthrough();

/** workflow_advance — Advance current workflow to next step */
const workflow_advance = z.object({
  intent: optStr,
  notes: optStr,
  files: z.union([z.array(z.string()), z.string()]).optional(),
}).passthrough();

/** workflow_status — Get workflow status */
const workflow_status = z.object({
  subcommand: optStr,
}).passthrough();

/** workflow_complete — Complete or abort current workflow */
const workflow_complete = z.object({
  abort: optBool,
  reason: optStr,
}).passthrough();

// ============================================================================
// HEALTH & DSL (2 actions)
// ============================================================================

/** health_check — Session health signal with zone classification */
const health_check = z.object({
  estimated_tokens: optNum,
  call_count: optNum,
  compaction_count: optNum,
}).passthrough();

/** dsl_mode — Toggle DSL compression mode */
const dsl_mode = z.object({
  mode: z.enum(["enable", "disable", "status"]).optional(),
}).passthrough();

// ============================================================================
// QUICK REF & DELTA (3 actions)
// ============================================================================

/** quick_ref_regenerate — Regenerate quick reference data */
const quick_ref_regenerate = z.object({}).passthrough();

/** session_delta — Get recent session activity */
const session_delta = z.object({
  hours: z.union([z.string(), z.number()]).optional(),
}).passthrough();

/** session_bookmark — Get a bookmark of current session state */
const session_bookmark = z.object({}).passthrough();

/** session_compare_bookmark — Compare current state against a bookmark */
const session_compare_bookmark = z.object({
  bookmark: z.object({
    commitHash: z.string(),
    timestamp: z.string(),
    engineCount: optNum,
    dispatcherCount: optNum,
    testCount: optNum,
    actionCount: optNum,
  }).passthrough(),
}).passthrough();

// ============================================================================
// SYSTEM SNAPSHOT (3 actions)
// ============================================================================

/** system_snapshot — Ultra-compact single-line system summary */
const system_snapshot = z.object({}).passthrough();

/** system_snapshot_layered — Depth-controlled snapshot */
const system_snapshot_layered = z.object({
  depth: z.enum(["minimal", "standard", "full"]).optional(),
}).passthrough();

/** system_drift_report — Live vs documented count comparison */
const system_drift_report = z.object({}).passthrough();

// ============================================================================
// DISPATCHER MAP & ROUTING (6 actions)
// ============================================================================

/** dispatcher_map — Full dispatcher action catalog */
const dispatcher_map = z.object({}).passthrough();

/** dispatcher_map_compact — Compact dispatcher map with limits */
const dispatcher_map_compact = z.object({
  max_per_dispatcher: z.union([z.string(), z.number()]).optional(),
}).passthrough();

/** action_search — Search across all dispatcher actions */
const action_search = z.object({
  query: optStr,
  q: optStr,
  max_results: z.union([z.string(), z.number()]).optional(),
}).passthrough();

/** action_find — Find a specific action by name */
const action_find = z.object({
  action: optStr,
  name: optStr,
}).passthrough();

/** tool_route — Intent-based routing */
const tool_route = z.object({
  intent: optStr,
  query: optStr,
  q: optStr,
}).passthrough();

/** tool_route_best — Best single route for an intent */
const tool_route_best = z.object({
  intent: optStr,
  query: optStr,
  q: optStr,
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_SESSION_SCHEMAS: ActionSchemaMap = {
  // State management
  state_load,
  state_save,
  state_checkpoint,
  state_diff,
  state_rollback,
  state_reconstruct,

  // Session lifecycle
  session_start,
  session_end,
  session_recover,
  quick_resume,
  resume_session,
  handoff_prepare,

  // Memory
  memory_save,
  memory_recall,

  // Context management
  context_pressure,
  context_size,
  context_compress,
  context_expand,
  context_preload,
  context_boot,
  context_delta_boot,

  // Compaction & transcripts
  compaction_detect,
  transcript_read,

  // Checkpoint & auto-checkpoint
  auto_checkpoint,
  checkpoint_enhanced,
  resume_score,

  // WIP
  wip_capture,
  wip_list,
  wip_restore,

  // Workflow
  workflow_start,
  workflow_advance,
  workflow_status,
  workflow_complete,

  // Health & DSL
  health_check,
  dsl_mode,

  // Quick ref & delta
  quick_ref_regenerate,
  session_delta,
  session_bookmark,
  session_compare_bookmark,

  // System snapshot
  system_snapshot,
  system_snapshot_layered,
  system_drift_report,

  // Dispatcher map & routing
  dispatcher_map,
  dispatcher_map_compact,
  action_search,
  action_find,
  tool_route,
  tool_route_best,
};
