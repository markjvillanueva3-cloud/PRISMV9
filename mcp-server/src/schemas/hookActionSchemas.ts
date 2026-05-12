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
// EXTRACTION INGESTION (3)
// ============================================================================

/** run_ingestion — Run extraction ingestion pipeline */
const run_ingestion = z.object({}).passthrough();

/** ingestion_status — Get current ingestion state */
const ingestion_status = z.object({}).passthrough();

/** ingestion_reset — Reset ingestion state to reprocess all files */
const ingestion_reset = z.object({}).passthrough();

/** extraction_maintenance — Run full maintenance check */
const extraction_maintenance = z.object({}).passthrough();

/** extraction_maintenance_status — Quick status check */
const extraction_maintenance_status = z.object({}).passthrough();

/** extraction_enforce — Run enforcement checks for an operation */
const extraction_enforce = z.object({
  operation: z.string().optional().describe("Operation to check (build, commit, deploy)"),
  phase: z.string().optional().describe("Phase (pre, post)"),
  metadata: z.record(z.string(), z.any()).optional(),
}).passthrough();

/** extraction_enforce_check — Dry-run enforcement check */
const extraction_enforce_check = z.object({}).passthrough();

/** extraction_enforce_autofix — Auto-fix ingestion issues */
const extraction_enforce_autofix = z.object({}).passthrough();

// ============================================================================
// EXTRACTION ROUTING (4)
// ============================================================================

/** routing_run — Run intelligent routing pipeline on extraction data */
const routing_run = z.object({
  source_file: z.string().optional().describe("Specific file to route, or all pending if omitted"),
}).passthrough();

/** routing_status — Get routing pipeline status and statistics */
const routing_status = z.object({}).passthrough();

/** routing_upgrades — Get pending upgrade suggestions from routing analysis */
const routing_upgrades = z.object({
  priority: z.enum(["critical", "high", "medium", "low", "all"]).optional(),
}).passthrough();

/** routing_consumers — List all knowledge consumers and their capabilities */
const routing_consumers = z.object({
  content_type: z.string().optional().describe("Filter by content type"),
  domain: z.string().optional().describe("Filter by domain"),
}).passthrough();

// ============================================================================
// EXTRACTION WIRING (3)
// ============================================================================

/** wiring_process — Process the wiring actions queue */
const wiring_process = z.object({}).passthrough();

/** wiring_stats — Get wiring statistics */
const wiring_stats = z.object({}).passthrough();

/** wiring_queue — Get current wiring queue status */
const wiring_queue = z.object({}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================


// ── ENGINE-WIRE-MS0/U-WIRE17: 5 hook orchestration engines ──────────
const hook_orch_plan = z.object({
  phase: z.enum(["PreTool","PostTool","UserPromptSubmit","SessionStart","SessionEnd","PreCompact","Stop"]).describe("Hook lifecycle phase to plan"),
}).passthrough();

const hook_coverage_analyze = z.object({}).passthrough();

const hook_bandit_select = z.object({
  k: z.number().int().positive().max(50).describe("Number of hooks to select"),
  time_budget_ms: z.number().positive().max(60000).optional().describe("Total time budget in ms (default 500)"),
}).passthrough();

const hook_telemetry_metrics = z.object({}).passthrough();

const hook_efficiency_roi = z.object({
  session_budget: z.number().positive().optional().describe("Session token budget for ROI calc (default 150000)"),
}).passthrough();

// ── HOOK-MANIFEST-DAG-MS26/P0-U01: static hook manifest ─────────────
const manifest = z.object({
  full: z.boolean().optional().describe("Return the entire hook catalog (every hook + wiring), not the summary"),
  write: z.boolean().optional().describe("(Re)write mcp-server/data/state/hook-manifest.json"),
  regenerate: z.boolean().optional().describe("Alias for write"),
  outPath: z.string().optional().describe("Override the manifest output path (used with write/regenerate)"),
  repoRoot: z.string().optional().describe("Repo root to anchor the scan (default: auto-detect)"),
  hook: z.string().optional().describe("Look up one hook by relative file path or basename id"),
  event: z.string().optional().describe("List the hooks wired to a single event (e.g. PreToolUse)"),
}).passthrough();

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
  // Extraction Ingestion (3)
  run_ingestion,
  ingestion_status,
  ingestion_reset,
  // Extraction Maintenance (2)
  extraction_maintenance,
  extraction_maintenance_status,
  // Extraction Enforcement (3)
  extraction_enforce,
  extraction_enforce_check,
  extraction_enforce_autofix,
  // Extraction Routing (4)
  routing_run,
  routing_status,
  routing_upgrades,
  routing_consumers,
  // Extraction Wiring (3)
  wiring_process,
  wiring_stats,
  wiring_queue,
  // ENGINE-WIRE-MS0/U-WIRE17: 5 hook orchestration engines
  hook_orch_plan,
  hook_coverage_analyze,
  hook_bandit_select,
  hook_telemetry_metrics,
  hook_efficiency_roi,
  // HOOK-MANIFEST-DAG-MS26/P0-U01: static hook manifest
  manifest,
};
