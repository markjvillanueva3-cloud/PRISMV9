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

/** handoff_write — Write a per-session handoff with atomic rename + in-memory mutex (PRISM-STAB-MS0/U-B1) */
const handoff_write = z.object({
  session_id: z.string().min(8).describe("Authoritative chat session id (e.g. claude-7b9d1810)"),
  topic: optStr.describe("Optional topic slug (e.g. cad-fusion-live-ms0)"),
  body: z.string().min(1).describe("Markdown body to persist"),
  machine: optStr.describe("Machine hostname; defaults to process hostname"),
  family: optStr.describe("Agent family (Claude|Codex|Gemini); default Claude"),
  parent_session_id: optStr.describe("Parent session for /compact lineage"),
}).passthrough();

/** handoff_read — Read a per-session handoff. NO topic-glob fallback (U-B4 doctrine) */
const handoff_read = z.object({
  session_id: z.string().min(8).describe("Exact session id to read"),
  topic: optStr.describe("Optional topic suffix; if provided, must match exactly"),
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

/** hook_map_compact — HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2): event → top-N hook ids. */
const hook_map_compact = z.object({
  max_per_event: z.union([z.string(), z.number()]).optional(),
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
// COORDINATION LEDGER (4 actions) — CoordinationLedgerEngine bridge
// ============================================================================

/** coordination_record — Append a coordination event to the shared ledger JSONL */
const coordination_record = z.object({
  agent: z.string().min(1).describe("Agent/instance id recording the event"),
  kind: z.enum([
    "claim",
    "release",
    "edit_start",
    "edit_end",
    "handoff",
    "note",
    "conflict_detected",
  ]).describe("Event kind"),
  target: z.string().min(1).describe("Target resource (file path, milestone id, etc.)"),
  payload: z.record(z.string(), z.any()).optional().describe("Optional structured payload"),
  at: z.union([z.string(), z.number()]).optional().describe("Epoch ms; defaults to now"),
  ledger_path: optStr.describe("Override ledger JSONL path (default: state/shared/COORDINATION_LEDGER.jsonl)"),
}).passthrough();

/** coordination_detect_conflicts — Hydrate ledger from JSONL and return overlapping claims */
const coordination_detect_conflicts = z.object({
  window_ms: z.union([z.string(), z.number()]).optional().describe("Conflict window in ms (default 30000)"),
  ledger_path: optStr.describe("Override ledger JSONL path"),
}).passthrough();

/** coordination_recent — Events at or after a timestamp */
const coordination_recent = z.object({
  since: z.union([z.string(), z.number()]).optional().describe("Epoch ms threshold (default: now - 1h)"),
  agent: optStr.describe("Filter by agent id"),
  target: optStr.describe("Filter by target"),
  ledger_path: optStr.describe("Override ledger JSONL path"),
}).passthrough();

/** coordination_count — Total events in the ledger */
const coordination_count = z.object({
  ledger_path: optStr.describe("Override ledger JSONL path"),
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
  handoff_write,
  handoff_read,

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
  hook_map_compact,
  action_search,
  action_find,
  tool_route,
  tool_route_best,

  // Coordination ledger
  coordination_record,
  coordination_detect_conflicts,
  coordination_recent,
  coordination_count,

  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH4: Awareness
  awareness_unified_query: z.object({
    query: z.string().min(1).describe("Search term to look up across capability domains"),
    domain: z.enum(["all", "engine", "formula", "algorithm", "material", "tool", "tribal", "resource", "program", "extraction", "dispatcher", "action"]).optional().describe("Restrict search to one domain (default: all)"),
    context: z.string().optional().describe("Optional context bias for ranking"),
    limit: z.number().int().positive().max(100).optional().describe("Max matches per domain (default: 10)"),
  }).passthrough(),
  awareness_command_detect: z.object({
    input: z.string().min(1).describe("User input text to scan for command triggers"),
  }).passthrough(),
  awareness_command_suggest_string: z.object({
    input: z.string().min(1).describe("User input text — returns formatted suggestion string"),
  }).passthrough(),
  awareness_filter: z.object({
    directive: z.string().min(1).describe("Reference directive text to filter against"),
    prompt: z.string().min(1).describe("Prompt text to score line-by-line"),
    max_lines: z.number().int().positive().optional().describe("Max kept lines (default unlimited)"),
    min_score: z.number().min(0).max(1).optional().describe("Min relevance score 0-1"),
    always_keep_headers: z.boolean().optional().describe("Always keep markdown headers (default true)"),
  }).passthrough(),
  awareness_lifecycle_get_current: z.object({
    session_id: z.string().min(1).optional().describe("Session id (defaults to 'dispatcher-default')"),
  }).passthrough(),
  awareness_lifecycle_get_history: z.object({
    session_id: z.string().min(1).optional().describe("Session id (defaults to 'dispatcher-default')"),
  }).passthrough(),

  // HTML-PRIMARY-MS0/U-HPS07 — render any Markdown doc/spec → HTML companion (mirrors prism_dev:spec_html_render)
  doc_render: z.object({
    md: z.string().optional().describe("Markdown content to render (provide this OR markdown OR path)"),
    markdown: z.string().optional().describe("Alias for md"),
    path: z.string().optional().describe("Path to a .md file under the PRISM root to read & render (provide this OR md)"),
    theme: z.enum(["dark", "light", "auto"]).optional().describe("Color theme; auto (default) follows prefers-color-scheme"),
    toc: z.boolean().optional().describe("Include the table-of-contents sidebar (default true)"),
    title: z.string().optional().describe("Override the document <title>"),
    write: z.boolean().optional().describe("If a path was given, also write <path>.html (and a .hash sidecar) alongside it"),
    include_html: z.boolean().optional().describe("Return the full rendered HTML inline in the response (default false — only metadata)"),
  }).passthrough(),

  // ==========================================================================
  // MASTER INDEX (2 actions — OBSIDIAN-PRISM-OS-MS0 / U-MASTER-INDEX)
  // Unified search across system-viz graph + Obsidian vault + capability
  // index + BUILD_STATE. Goal: ONE call replaces N Grep/Glob/Agent searches.
  // ==========================================================================

  /**
   * master_index_query — Unified ranked search across the PRISM brain.
   * Sources fused: system-graph.json (110K nodes), PRISMSelfAwarenessEngine
   * fuzzy capability match, pre-joined wiki + memory entries per node,
   * BUILD_STATE classification. Each hit carries provenance + utilization
   * (log-normalized in-degree) + buildClass. Use INSTEAD OF Grep/Glob/Agent.
   */
  master_index_query: z.object({
    query: optStr.describe("Natural-language search text (capped at 500 chars)"),
    q: optStr.describe("Alias for query"),
    limit: z.union([z.string(), z.number()]).optional()
      .describe("Cap returned hits (default 20, max 200)"),
    layers: z.array(z.string()).optional()
      .describe("Restrict to graph layers (e.g., ['L4','L5'])"),
    sources: z.array(z.enum([
      "graph_node", "engine", "action", "hook", "skill", "wiki", "memory",
    ])).optional().describe("Restrict to specific result sources"),
    min_utilization: z.union([z.string(), z.number()]).optional()
      .describe("Drop hits below this utilization (0..1)"),
    min_confidence: z.union([z.string(), z.number()]).optional()
      .describe("Drop hits below this confidence (0..1)"),
    build_classes: z.array(z.enum([
      "wired", "unwired", "pending", "frontend", "unknown",
    ])).optional().describe("Filter by BUILD_STATE classification"),
  }).passthrough(),

  /**
   * master_index_node_status — Single-node lookup with raw degree counts.
   * Returns the hit projection plus in-degree / out-degree so callers can
   * answer "is this node fully utilized?" without a separate trace.
   */
  master_index_node_status: z.object({
    id: z.string().min(1).describe("Exact graph node id (e.g., 'engine.KienzleForceModel')"),
  }).passthrough(),

  /**
   * master_index_utilization_dashboard — Graph-wide utilization classifier.
   *
   * Buckets every node into hub/sink/source/orphan/ghost/normal based on
   * in/out edge degree percentiles + has-docs. Use to answer the standing
   * question "what's actually being used?" — orphans + ghosts are the
   * audit punch list (built but not wired / dead-code candidates).
   */
  master_index_utilization_dashboard: z.object({
    layers: z.array(z.string()).optional()
      .describe("Restrict to graph layers (e.g., ['L4','L5'])"),
    exclude_layers: z.array(z.string()).optional()
      .describe("Exclude layers (default ['L9','L11'] — fs noise)"),
  }).passthrough(),
};
