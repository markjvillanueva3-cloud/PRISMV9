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
// SESSION REPLAY (4 actions — git-backed context reconstruction)
// Backed by SessionReplayEngine. Complements state_reconstruct/quick_resume
// (which read JSON state files) by sourcing context from git history — the
// source of truth when JSON state is stale after /compact or crash.
// Token win: ~200-token replay summaries replace 2000+ token transcript reads.
// ============================================================================

/** replay_context — Compact "where was I?" object from recent git activity */
const replay_context = z.object({
  max_commits: z.number().int().positive().max(50).optional().describe(
    "Max recent commits to summarize (default 5; max 50)"
  ),
}).passthrough();

/** replay_resume_line — One-liner resume summary derived from git */
const replay_resume_line = z.object({}).passthrough();

/** replay_working_set — Current uncommitted changes (staged/modified/untracked) */
const replay_working_set = z.object({}).passthrough();

/** replay_diff_summary — git diff --stat for the last 3 commits */
const replay_diff_summary = z.object({}).passthrough();

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
// COORD-MS0/U-COORD04 — CrossSessionOrchestratorEngine unified facade (11 actions)
// ============================================================================

const cross_session_get_session_id = z.object({}).passthrough();

const cross_session_claim = z.object({
  resource: z.string().min(1).describe("Resource path/id to claim (file path, milestone id, etc.)"),
  ttl_ms: z.union([z.string(), z.number()]).optional().describe("TTL in ms; defaults to 180000 (3 min). Capped at 24h."),
  reason: optStr.describe("Optional human-readable reason for the claim"),
}).passthrough();

const cross_session_release = z.object({
  resource: z.string().min(1).describe("Resource path/id to release"),
}).passthrough();

const cross_session_is_file_claimed = z.object({
  file_path: z.string().min(1).describe("File path to check against active claim registry"),
}).passthrough();

const cross_session_broadcast = z.object({
  type: z.enum([
    "info", "warning", "request", "response",
    "registry_change", "asset_added", "asset_removed", "cache_invalidate",
  ]).optional().describe("Broadcast type. Default: info (rides on cache_invalidate channel)"),
  content: optStr.describe("Optional human-readable content"),
  payload: z.record(z.string(), z.any()).optional().describe("Optional structured payload"),
  ttl_ms: z.union([z.string(), z.number()]).optional().describe("Optional message TTL in ms"),
}).passthrough();

const cross_session_get_recent_events = z.object({
  limit: z.union([z.string(), z.number()]).optional().describe("Max events to return (default 50, max 10000)"),
}).passthrough();

const cross_session_force_invalidate_all = z.object({}).passthrough();

const cross_session_create_handoff = z.object({
  identity: z.object({
    sessionId: optStr,
    family: z.enum(["claude", "codex", "other"]).optional(),
    machine: optStr,
    instance: optStr,
    startedAt: optStr,
    endedAt: optStr,
  }).passthrough().optional().describe("Identity override; defaults to this session"),
  position: z.object({
    phase: optStr,
    milestone: optStr,
    branch: optStr,
    lastCommit: optStr,
    notes: optStr,
  }).passthrough().optional(),
  open_goals: z.array(z.object({
    id: z.string(),
    text: z.string(),
    priority: z.number(),
    depth: z.number(),
  }).passthrough()).optional(),
  key_insights: z.array(z.object({
    id: z.string(),
    category: z.string(),
    summary: z.string(),
    at: z.string(),
  }).passthrough()).optional(),
  next_actions: z.array(z.object({
    action: z.string(),
    reason: optStr,
    blocking: z.boolean().optional(),
  }).passthrough()).optional(),
  written_at: optStr.describe("Optional ISO timestamp; defaults to now"),
  started_at: optStr.describe("Optional ISO timestamp for session start; defaults to writtenAt"),
}).passthrough();

const cross_session_get_status = z.object({}).passthrough();
const cross_session_get_other_sessions = z.object({}).passthrough();
const cross_session_get_status_line = z.object({}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

// ============================================================================
// OPERATOR PREFERENCES (3 actions — U-WIRE-OPERATOR-PREFS, slot:romeo)
// ============================================================================

const operatorPreferencesObject = z.object({
  operatorId: z.string().min(1),
  tenantId: z.string().min(1),
  speedFeedBias: z.enum(["conservative", "balanced", "aggressive"]),
  surfaceFinishPriority: z.enum(["low", "medium", "high", "critical"]),
  cycleTimeVsToolLife: z.enum(["favor_cycle", "balanced", "favor_tool_life"]),
  coolantPreference: z.enum(["flood", "mist", "air", "through_tool", "machine_default"]),
  safetyMarginPercent: z.number(),
  maxSpindleRpmOverride: z.number().optional(),
  maxFeedrateOverride_mmpm: z.number().optional(),
  chipBreakStrategy: z.enum(["standard", "aggressive_peck", "high_pressure_coolant"]),
  notificationPreferences: z.object({
    toolChangeAlerts: z.boolean(),
    cycleCompleteAlerts: z.boolean(),
    qualityCheckReminders: z.boolean(),
    maintenanceReminders: z.boolean(),
  }),
  machineNotes: z.record(z.string(), z.string()),
}).passthrough();

/** operator_prefs_set — store/update per-operator preferences */
const operator_prefs_set = z.object({ preferences: operatorPreferencesObject }).passthrough();
/** operator_prefs_get — fetch operator preferences (optionally fall back to engine defaults) */
const operator_prefs_get = z.object({
  tenantId: z.string().min(1),
  operatorId: z.string().min(1),
  withDefaults: optBool,
}).passthrough();
/** operator_prefs_apply — apply operator preference overrides to base calc params */
const operator_prefs_apply = z.object({
  tenantId: z.string().min(1),
  operatorId: z.string().min(1),
  baseParams: z.record(z.string(), z.unknown()),
}).passthrough();

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
  // U-WIRE-OPERATOR-PREFS (slot:romeo)
  operator_prefs_set,
  operator_prefs_get,
  operator_prefs_apply,

  // Session replay (SessionReplayEngine — git-backed, complements quick_resume)
  replay_context,
  replay_resume_line,
  replay_working_set,
  replay_diff_summary,

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

  // COORD-MS0/U-COORD04 — CrossSessionOrchestratorEngine unified facade
  cross_session_get_session_id,
  cross_session_claim,
  cross_session_release,
  cross_session_is_file_claimed,
  cross_session_broadcast,
  cross_session_get_recent_events,
  cross_session_force_invalidate_all,
  cross_session_create_handoff,
  cross_session_get_status,
  cross_session_get_other_sessions,
  cross_session_get_status_line,

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
  // PSN-ENHANCE-MS0/U-PSN-HYBRID-MCP-WIRE (sierra iter26 2026-05-25):
  // wraps scripts/lib/hybrid-retrieval.mjs::hybridSearch — one query, four PSN
  // retrieval substrates (memory-index BM25 + master-index BM25 + graphiti
  // episode + Qdrant dense), Reciprocal Rank Fusion k=60.
  hybrid_search: z.object({
    query: optStr.describe("Natural-language search text (required)"),
    q: optStr.describe("Alias for query"),
    top_k: z.union([z.string(), z.number()]).optional()
      .describe("Final result count (default 10)"),
    per_source: z.union([z.string(), z.number()]).optional()
      .describe("Cap per substrate before fusion (default 20)"),
    no_memory: z.boolean().optional().describe("Drop memory-index leg"),
    no_master: z.boolean().optional().describe("Drop master-index leg"),
    no_episode: z.boolean().optional().describe("Drop episode-store leg"),
    no_vector: z.boolean().optional().describe("Drop Qdrant dense vector leg"),
    collection: z.string().optional().describe("Qdrant collection (default prism_engines)"),
    qdrant_url: z.string().optional().describe("Qdrant base URL (default http://localhost:6333)"),
    ollama_url: z.string().optional().describe("Ollama embeddings URL (default http://localhost:11434/api/embeddings)"),
    model: z.string().optional().describe("Embedding model (default nomic-embed-text)"),
  }),

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
    // BACKEND-DEV-LOOP/U-MIQ-STOPWORDS-CONFIG (iter-2, 2026-05-18):
    // Default behavior unchanged when unset (full STOPWORDS_DEFAULT). 'minimal'
    // drops only English noise so PRISM-meta tokens (engine/system/wiki/memory/
    // prism/feature/node/label/info) reach the inverted index — required for
    // queries that actually want to find an engine called "Engine". 'off'
    // disables filtering. A `string[]` defines a custom set.
    stopwords: z.union([
      z.enum(["default", "minimal", "off"]),
      z.array(z.string()),
    ]).optional().describe("Tokenization stopword mode: 'default'|'minimal'|'off'|string[]"),
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

  /**
   * doc_nodes — REVERSE of node_card (CHEAP-NODE-ACCESS-MS0 · U-VBL-DISPATCHER).
   * Given a vault doc, list the live graph node(s) that document it (then
   * node_card <id> for the node's state). Reads the inverted vault-backlinks.json
   * via the single-source CLI — never the 644MB graph. `doc` is the canonical
   * field; query/q/key/path/slug are accepted aliases (resolved in the action).
   */
  doc_nodes: z.object({
    doc: z.string().min(1).optional()
      .describe("Vault doc key — a wiki path ('architecture/foo' or full 'knowledge/wiki/...md') or a memory slug ('feedback_psn_definition')"),
    query: optStr.describe("Alias for doc"),
    q: optStr.describe("Alias for doc"),
    key: optStr.describe("Alias for doc"),
    path: optStr.describe("Alias for doc"),
    slug: optStr.describe("Alias for doc"),
  }).passthrough(),

  /**
   * dual_channel_dispatch -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC04.
   * Build a DUAL-CHANNEL subagent-context bundle around a graph node: a structured
   * JSON ego-graph (addressed by explicit `node-id:` markers) + a visual layer (a
   * real PNG via system Chrome when free, else a mermaid+markdown fallback). The
   * tldraw dual-channel pattern for multi-agent coordination. Composes GAC01.
   */
  dual_channel_dispatch: z.object({
    nodeId: z.string().min(1).optional()
      .describe("Graph node id to center the ego-graph on (e.g. 'eng.mill'). Alias: id."),
    id: optStr.describe("Alias for nodeId"),
    prompt: optStr.describe("Subagent prompt the dual-channel context is appended to. Alias: subagentPrompt."),
    subagentPrompt: optStr.describe("Alias for prompt"),
    mode: z.enum(["json-only", "viz-only", "both"]).optional()
      .describe("Which channels to assemble. Default 'both'."),
    hops: z.number().int().min(0).max(12).optional().describe("Ego-graph hops around the node. Default 1."),
    maxNodes: z.number().int().min(1).optional().describe("Node cap for the ego slice. Default 200."),
    layer: z.string().regex(/^[A-Za-z0-9_-]{1,20}$/).optional()
      .describe("Visual-channel layer filter (e.g. 'L4'); [A-Za-z0-9_-], <=20 chars. Filters the viz only; JSON stays full."),
    embed: z.enum(["path", "data-uri"]).optional()
      .describe("How a successful PNG is attached: 'path' (default) or 'data-uri' (base64 inline, only if <= maxPngBytes)."),
    maxPngBytes: z.number().int().positive().optional()
      .describe("PNG byte ceiling before downscale-then-fallback / data-uri skip. Default 10MB."),
    outDir: optStr.describe("Directory PNGs are written to. Default = a shared temp dir (auto-cleaned for data-uri)."),
    enrich: z.boolean().optional().describe("Enrich ego nodes with label/layer/kind via seekCard. Default true."),
    adjacencyPath: optStr.describe("Override the adjacency sidecar path (tests / non-default deployments)."),
  }).passthrough(),

  /**
   * spatial_resolve -- GRAPH-AS-LLM-CONTEXT-MS0 / U-GAC05.
   * Resolve a free-text alias/paraphrase to a canonical node-id (or a candidate
   * list when ambiguous) so N agents coordinate by node-id mention, not paraphrase.
   * Single (text|alias|query|q) or batch (aliases[]). Composes GAC02 find-cache.
   */
  spatial_resolve: z.object({
    text: optStr.describe("Free-text alias/paraphrase to resolve. Aliases: alias, query, q."),
    alias: optStr.describe("Alias for text"),
    query: optStr.describe("Alias for text"),
    q: optStr.describe("Alias for text"),
    aliases: z.array(z.string()).optional().describe("Batch mode: resolve each alias (handoff canonicalization)."),
    maxCandidates: z.number().int().positive().max(50).optional().describe("Max candidates for ambiguous/fuzzy. Default 5."),
    minFuzzy: z.number().min(0).max(1).optional().describe("Min fuzzy score (0..1) to consider a match. Default 0.34."),
    ambiguityMargin: z.number().min(0).max(1).optional().describe("Relative margin the top fuzzy hit must beat the second by to NOT be ambiguous. Default 0.15."),
    findCachePath: optStr.describe("Override the find-cache path (tests / non-default deployments)."),
  }).passthrough(),

  /**
   * psk — COMMAND-KERNEL-MS0/U-CK01 PRISM Syscall Kernel dispatch.
   * Thin MCP wrapper around .claude/kernel/psk.mjs's dispatch() function.
   * 10 declared syscalls (whoami / manifest / position / delta / tools /
   * pick / checkin / handoff / record / recommend). Each is fail-soft —
   * the dispatcher returns a structured {ok, syscall, result|error, …}
   * object even on failure. Per-syscall semantics fill in via U-CK02
   * (whoami / manifest / position) and U-CK03 (handoff / checkin / pick).
   */
  psk: z.object({
    syscall: z.string().min(1)
      .describe("Syscall name. One of: whoami, manifest, position, delta, tools, pick, checkin, handoff, record, recommend. Unknown values return ok:false with errorCode:UNKNOWN_SYSCALL."),
    params: z.record(z.string(), z.unknown()).optional()
      .describe("Syscall-specific params (e.g. {sessionId} for whoami, {event,command,outcome} for record, {subcommand,terminal,resume,state} for handoff). Forwarded verbatim — each syscall validates its own shape and returns a degraded result on bad input."),
  }).passthrough(),

  // ==========================================================================
  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-MULTI-SESSION-HANDOFF (4 actions)
  // Wires MultiSessionHandoffCoordinatorEngine (U-CTX05, 358 LOC, was orphan):
  // reads all HANDOFF-*.md in state/shared, merges work queues, detects
  // claim conflicts, formats an injection-ready digest, and supports
  // stale-handoff cleanup (DESTRUCTIVE — gated behind dry_run + confirm).
  // ==========================================================================

  /**
   * handoff_coord_status — Run coordinate() across all session handoffs.
   * Returns the merged work queue (pending goals, next actions, conflicts)
   * + recommendations + tokenEstimate for the formatted-injection variant.
   */
  handoff_coord_status: z.object({
    handoff_dir: optStr
      .describe("Override the handoff directory (default: H:/prism/state/shared). Useful for tests / alternate worktrees."),
  }).passthrough(),

  /**
   * handoff_coord_inject — Pre-rendered markdown digest suitable for
   * UserPromptSubmit injection. Same data as handoff_coord_status but
   * formatted as `## Multi-Session Handoff\n…` ~150-400 char block.
   */
  handoff_coord_inject: z.object({
    handoff_dir: optStr
      .describe("Override the handoff directory (default: H:/prism/state/shared)."),
  }).passthrough(),

  /**
   * handoff_coord_load_sessions — Raw enumeration of every HANDOFF-*.md
   * parsed into SessionSnapshot (family, machine, lastActive, claims,
   * openGoals, nextActions, status active|stale). Returns sorted newest-first.
   */
  handoff_coord_load_sessions: z.object({
    handoff_dir: optStr
      .describe("Override the handoff directory (default: H:/prism/state/shared)."),
  }).passthrough(),

  /**
   * handoff_coord_cleanup_stale — DESTRUCTIVE: delete HANDOFF-*.md files
   * older than max_age_ms. SAFE BY DEFAULT — without confirm:true the
   * action runs in dry-run mode and returns the list of files that WOULD
   * be deleted. Pass {confirm:true} to actually unlink them.
   */
  handoff_coord_cleanup_stale: z.object({
    handoff_dir: optStr
      .describe("Override the handoff directory (default: H:/prism/state/shared)."),
    max_age_ms: z.union([z.string(), z.number()]).optional()
      .describe("Stale threshold in ms (default 1800000 = 30 min). Clamped to ≥60000 (1 min) to prevent foot-gunning."),
    confirm: optBool
      .describe("EXPLICIT confirmation required to actually delete files. Default false; without this the action returns a dry-run preview only."),
  }).passthrough(),

  // ==========================================================================
  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SESSION-LIFECYCLE (5 actions)
  // Wires SessionLifecycleEngine (W3:D5, 489 LOC, was orphan): exposes
  // multi-metric session quality scoring (5-dimension ensemble: task
  // completion, reliability, safety adherence, efficiency, continuity),
  // metrics inspection, and final-handoff generation for crash recovery.
  // Note: orphan-inventory suggested prism_auth based on "Session" name
  // heuristic, but the engine's docblock states it's called by
  // "autoHookWrapper cadence + sessionDispatcher session_end" — wiring
  // to prism_session is the correct route.
  // ==========================================================================

  /** lifecycle_metrics — Read current SessionMetrics (tool_calls, hook stats,
   * pressure, latency, etc). No params. */
  lifecycle_metrics: z.object({}).passthrough(),

  /** lifecycle_quality_score — Compute 5-dimension session quality (0-100)
   * with letter grade (A+..F) and weakest-dimension recommendation.
   * Weighted ensemble: task_completion 0.30 / reliability 0.25 /
   * safety_adherence 0.20 / efficiency 0.15 / continuity 0.10. */
  lifecycle_quality_score: z.object({}).passthrough(),

  /** lifecycle_session_id — Get the canonical session id this engine is
   * tracking (format: SESSION-{epochMs}). */
  lifecycle_session_id: z.object({}).passthrough(),

  /** lifecycle_call_count — Get total tool calls recorded this session. */
  lifecycle_call_count: z.object({}).passthrough(),

  /** lifecycle_final_handoff — Generate a final handoff document (quality
   * score + metrics summary + resume context) AND write it to
   * state/next_session_prep.json. Use at session_end. */
  lifecycle_final_handoff: z.object({
    phase: z.string().min(1)
      .describe("Current phase/milestone tag (e.g., 'OBSIDIAN-PRISM-OS-MS0/iter-3')"),
    quick_resume: z.string().min(1)
      .describe("One-line directive for the next session"),
    pending_tasks: z.array(z.string()).optional()
      .describe("Optional list of pending task descriptions (first 10 retained)"),
    key_findings: z.array(z.string()).optional()
      .describe("Optional list of key findings/decisions from this session (first 5 retained)"),
  }).passthrough(),

  /** action_trace_query — OBSIDIAN-INTELLIGENCE-MS3/U-ACTION-TRACES (D4).
   * Read-only query over the append-only agent-write trace log
   * (state/shared/action-traces.jsonl). All filters optional; empty params
   * returns the most recent `limit` edges. Backed by
   * ActionTraceEngine.queryTraces. */
  action_trace_query: z.object({
    agent: z.string().min(1).optional()
      .describe("Filter to one agent id (e.g. 'claude-c0f06dee')"),
    target: z.string().min(1).optional()
      .describe("Filter to one written target (file path or memory key)"),
    tool: z.string().min(1).optional()
      .describe("Filter to one tool (Write | Edit | MultiEdit | memory-mirror | ...)"),
    sessionId: z.string().min(1).optional()
      .describe("Filter to one stable session id"),
    action: z.string().min(1).optional()
      .describe("Filter to one semantic action label"),
    sinceTs: z.string().min(1).optional()
      .describe("Only edges with ts >= this ISO-8601 timestamp"),
    limit: z.number().int().positive().max(100000).optional()
      .describe("Max edges returned (default 1000). Applied after filtering."),
    order: z.enum(["asc", "desc"]).optional()
      .describe("'asc' = chronological/file order (default), 'desc' = most-recent first"),
  }).strict(),

  /** memory_conflict_resolve — OBSIDIAN-INTELLIGENCE-MS3/U-CONFLICT-RESOLUTION
   * (D3). Detect a semantic conflict between two writes to the same memory
   * key and, on a real conflict, persist both versions + a policy-selected
   * winner to knowledge/memories/conflicts/<key>.diff.md. Backed by
   * MemoryConflictResolverEngine.resolveConflict. */
  memory_conflict_resolve: z.object({
    key: z.string().min(1)
      .describe("Logical memory key — sanitized to a basename (no slashes / '..')"),
    existing: z.object({
      agent: z.string().min(1).max(64)
        .describe("Chat/agent id that produced the on-record write"),
      sessionId: z.string().min(1).max(64)
        .describe("Stable session id of the on-record write"),
      content: z.string().max(5_000_000)
        .describe("Full content of the on-record write (may be empty)"),
      ts: z.string().min(1).describe("ISO-8601 timestamp of the on-record write"),
    }).strict().describe("The write already on record for this key"),
    incoming: z.object({
      agent: z.string().min(1).max(64)
        .describe("Chat/agent id that produced the incoming write"),
      sessionId: z.string().min(1).max(64)
        .describe("Stable session id of the incoming write"),
      content: z.string().max(5_000_000)
        .describe("Full content of the incoming write (may be empty)"),
      ts: z.string().min(1).describe("ISO-8601 timestamp of the incoming write"),
    }).strict().describe("The new incoming write for the same key"),
    windowMs: z.number().positive().optional()
      .describe("Concurrency window in ms (default 30000): within → 'concurrent', beyond → 'superseded'"),
    policy: z.enum(["last-writer", "first-writer", "human-arbitrate"]).optional()
      .describe("Resolution policy (default last-writer)"),
  }).strict(),

  // ==========================================================================
  // U-BRIDGE-WIRE-AGENT (oscar 2026-05-23) — 9 actions for 2 unwired Agent engines
  // ==========================================================================
  // AgentAutoUpdateEngine — agent-knowledge sync surface (5 actions)
  agent_knowledge_scan: z.object({}).passthrough(),
  agent_knowledge_snapshot: z.object({}).passthrough(),
  agent_knowledge_recent: z.object({
    count: z.number().int().positive().max(1000).optional()
      .describe("Max recent update events to return (default 10)"),
  }).passthrough(),
  agent_knowledge_context_string: z.object({}).passthrough(),
  agent_knowledge_rescan: z.object({}).passthrough(),

  // AgentWorkflowEngine — autonomous workflow lifecycle surface (4 actions)
  agent_workflow_list: z.object({}).passthrough(),
  agent_workflow_start: z.object({
    workflow_id: z.string().min(1)
      .describe("Workflow template id (see agent_workflow_list)"),
    context: z.record(z.string(), z.unknown()).optional()
      .describe("Initial workflow context (free-form key/value)"),
    options: z.record(z.string(), z.unknown()).optional()
      .describe("Execution options (e.g., auto_approval_threshold)"),
  }).passthrough(),
  agent_workflow_status: z.object({
    instance_id: z.string().min(1).optional()
      .describe("Workflow instance id — omit to list running+completed counts"),
  }).passthrough(),
  agent_workflow_cancel: z.object({
    instance_id: z.string().min(1)
      .describe("Workflow instance id to cancel"),
  }).passthrough(),

  // ==========================================================================
  // U-BRIDGE-WIRE-CROSS (oscar 2026-05-23) — 6 actions for 2 unwired Cross engines
  // ==========================================================================
  // CrossCAMComparisonLedgerEngine — per-cell Wilson-bound CAM leaderboard (5 actions)
  cross_cam_ledger_record: z.object({
    cam_system: z.string().min(1)
      .describe("CAM system identifier (e.g., mastercam, hyperMILL, fusion360)"),
    feature_class: z.string().min(1)
      .describe("Feature classification (e.g., pocket, contour, drill)"),
    material_class: z.string().min(1)
      .describe("Material classification (e.g., aluminum, steel, titanium)"),
    machine_class: z.string().min(1)
      .describe("Machine classification (e.g., 3axis_mill, lathe, 5axis)"),
    success: z.union([z.literal(0), z.literal(1), z.boolean()])
      .describe("1/true if CAM matched observed reality within tolerance; 0/false otherwise"),
    observed_at: z.string().min(1).optional()
      .describe("ISO-8601 observation timestamp (defaults to now)"),
  }).passthrough(),
  cross_cam_ledger_leaderboard: z.object({
    feature_class: z.string().min(1)
      .describe("Feature class of the cell"),
    material_class: z.string().min(1)
      .describe("Material class of the cell"),
    machine_class: z.string().min(1)
      .describe("Machine class of the cell"),
  }).passthrough(),
  cross_cam_ledger_by_cam: z.object({
    cam_system: z.string().min(1)
      .describe("CAM system identifier to fetch all cells for"),
  }).passthrough(),
  cross_cam_ledger_stats: z.object({}).passthrough(),
  cross_cam_ledger_reset: z.object({}).passthrough(),

  // CrossToolCouplingEngine — multi-tool modal coupling analysis (1 action)
  cross_tool_coupling_analyze: z.object({
    input: z.object({
      tools: z.array(z.unknown()).min(1)
        .describe("Tool stations (>=1; analyze() falls back to single-tool for n<2)"),
      workpiece: z.record(z.string(), z.unknown())
        .describe("WorkpieceProperties (material, modulus, geometry, dimensions)"),
      fixture: z.record(z.string(), z.unknown())
        .describe("FixtureProperties (type, stiffness, damping, support points)"),
    }).optional().describe("Wrapped CouplingInput (or pass tools/workpiece/fixture at root)"),
    tools: z.array(z.unknown()).optional()
      .describe("Tool stations (alternative root-level path; preferred when no input wrapper)"),
    workpiece: z.record(z.string(), z.unknown()).optional()
      .describe("WorkpieceProperties (root-level alternative)"),
    fixture: z.record(z.string(), z.unknown()).optional()
      .describe("FixtureProperties (root-level alternative)"),
  }).passthrough(),

  // ==========================================================================
  // U-BRIDGE-WIRE-LIVE (oscar 2026-05-23 iter3) — 3 actions for 3 unwired Live engines
  // ==========================================================================
  live_tooling_analyze_driven: z.object({
    operation: z.record(z.string(), z.unknown())
      .describe("LiveToolingOperation: { material, type, diameter_mm, depth_mm, width_mm, ... }"),
    config: z.record(z.string(), z.unknown())
      .describe("LiveToolingConfig: { maxDrivenRpm, drivenPower_kW, drivenTorque_Nm, ... }"),
  }).passthrough(),
  live_tooling_controller_capabilities: z.object({
    controller: z.enum(["okuma", "fanuc", "mazak", "dmg", "haas", "doosan"])
      .describe("Lathe controller type"),
  }).passthrough(),
  live_turret_validate_kinematics: z.object({
    kinematics: z.record(z.string(), z.unknown()).optional()
      .describe("MachineKinematics: { hasCAxis, maxLiveToolRpm, cAxisRange_deg, ... }"),
    hasCAxis: z.boolean().optional()
      .describe("Root-level alternative: C-axis capability"),
    maxLiveToolRpm: z.number().optional()
      .describe("Root-level alternative: max live-tool RPM"),
    cAxisRange_deg: z.number().optional()
      .describe("Root-level alternative: C-axis range in degrees"),
  }).passthrough(),

  // ==========================================================================
  // U-BRIDGE-WIRE-INVENTOR (oscar 2026-05-23 iter4) — 5 actions for 3 unwired Inventor engines
  // ==========================================================================
  inventor_cad_list_modules: z.object({}).passthrough(),
  inventor_cad_get_module_entry: z.object({
    module_id: z.string().min(1)
      .describe("Inventor CAD module identifier (e.g., sketch_operations)"),
  }).passthrough(),
  inventor_cam_list_strategies: z.object({
    category: z.string().min(1).optional()
      .describe("Optional HSMCategory filter (2d, 3d, drilling, multiaxis, turning)"),
  }).passthrough(),
  inventor_cam_get_strategy_params: z.object({
    strategy_name: z.string().min(1)
      .describe("HSM strategy name (e.g., adaptive2d, contour, pocket)"),
  }).passthrough(),
  inventor_cam_get_templates: z.object({
    category: z.string().min(1).optional()
      .describe("Optional TemplateCategory filter (sketch, feature, assembly, ilogic, post)"),
  }).passthrough(),

  // ==========================================================================
  // U-BRIDGE-WIRE-PRINT-PARTIAL (oscar 2026-05-23 iter5) — 3 actions for 2 Print engines
  // ==========================================================================
  print_corpus_all_shas: z.object({}).passthrough(),
  print_corpus_total_count: z.object({}).passthrough(),
  print_stall_stats: z.object({
    now_ms: z.number().nonnegative().optional()
      .describe("Optional epoch-ms — when supplied, statsAt(now) populates currently_stalled"),
  }).passthrough(),
  // U-WIRE-SLOTSESSION: SlotSessionHistoryEngine read surfaces (slot:papa->golf 2026-06-15). slot is a NatoSlot enum, not a path.
  slot_session_fleet_state: z.object({}).passthrough().optional(),
  slot_session_latest: z.object({ slot: z.enum(["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett","kilo","lima","mike","november","oscar","papa","quebec","romeo","sierra","tango","uniform","victor","whiskey","xray","yankee","zulu"]).describe("NatoSlot to read the latest session entry for") }).passthrough(),
  slot_session_history: z.object({ slot: z.enum(["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett","kilo","lima","mike","november","oscar","papa","quebec","romeo","sierra","tango","uniform","victor","whiskey","xray","yankee","zulu"]).describe("NatoSlot"), limit: z.number().int().positive().optional().describe("Last N entries (engine default 10)") }).passthrough(),
  // BLACKWELL-DB-GEN-MS0/U-WIRE-SLOT-SESSION-HISTORY: readAll() with optional custom baseDir
  // (case path-guards baseDir to the slot-sessions root; a traversal value is a valid string here
  // and is rejected in the handler, not the schema).
  slot_session_history_read: z.object({ slot: z.enum(["alpha","bravo","charlie","delta","echo","foxtrot","golf","hotel","india","juliett","kilo","lima","mike","november","oscar","papa","quebec","romeo","sierra","tango","uniform","victor","whiskey","xray","yankee","zulu"]).describe("NatoSlot"), baseDir: z.string().optional().describe("Override slot-sessions base dir (path-guard-confined to the slot-sessions root)") }).passthrough(),
};
