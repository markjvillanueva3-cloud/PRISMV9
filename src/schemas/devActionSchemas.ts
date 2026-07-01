/**
 * Dev Dispatcher Action Schemas
 * ==============================
 * Per-action Zod schemas for all 9 prism_dev actions.
 * Covers session boot, build, code templates, code search, file I/O,
 * server info, smoke tests, and test results.
 * Validated AFTER normalizeParams(), BEFORE engine dispatch.
 *
 * @module schemas/devActionSchemas
 * @version 1.0.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// session_boot — Initialize session with state recovery
// ============================================================================

const session_boot = z.object({}).passthrough();

// ============================================================================
// build — Run npm build with pre-build validation
// ============================================================================

const build = z.object({}).passthrough();

// ============================================================================
// code_template — Retrieve a code template by name
// ============================================================================

const code_template = z.object({
  template: z.string().describe("Template name: tool_registration, index_import, registry_data_loader, zod_schemas"),
}).passthrough();

// ============================================================================
// code_search — Search source/dist for a regex pattern
// ============================================================================

const code_search = z.object({
  pattern: z.string().optional().describe("Regex pattern to search for"),
  query: z.string().optional().describe("Alias for pattern"),
  scope: z.string().optional().describe("Search scope: src, dist, both, or sub-directory name"),
  max_results: z.number().int().positive().optional().describe("Max results to return (default 20)"),
}).passthrough();

// ============================================================================
// file_read — Read a file relative to MCP_ROOT
// ============================================================================

const file_read = z.object({
  path: z.string().describe("File path relative to MCP_ROOT"),
  start_line: z.number().int().nonnegative().optional().describe("Line offset to start reading"),
  max_lines: z.number().int().positive().optional().describe("Max lines to read (default 100)"),
}).passthrough();

// ============================================================================
// file_write — Write content to a file relative to MCP_ROOT
// ============================================================================

const file_write = z.object({
  path: z.string().describe("File path relative to MCP_ROOT"),
  content: z.string().describe("Content to write"),
}).passthrough();

// ============================================================================
// server_info — List registered tool and dispatcher files
// ============================================================================

const server_info = z.object({}).passthrough();

// ============================================================================
// test_smoke — Run or list smoke tests
// ============================================================================

const test_smoke = z.object({
  mode: z.enum(["run", "info", "atcs"]).optional().describe("Mode: run (default, execute smoke tests), info (list tests), or atcs (generate ATCS work queue)"),
}).passthrough();

// ============================================================================
// test_results — View smoke test results
// ============================================================================

const test_results = z.object({
  detail: z.boolean().optional().describe("Whether to fetch detailed run results"),
  run_id: z.string().optional().describe("Specific run ID to fetch details for"),
}).passthrough();

// ============================================================================
// svi_* — System Variability Index lifecycle
// ============================================================================

const svi_compute = z.object({}).passthrough();

const svi_read = z.object({}).passthrough();

const svi_summary = z.object({}).passthrough();

// ============================================================================
// erp_persistence_health — Check PersistenceBridge health
// ============================================================================

const erp_persistence_health = z.object({}).passthrough();

// ============================================================================
// engine_overlap_scan — Scan for duplicate/overlapping engines
// ============================================================================

const engine_overlap_scan = z.object({
  candidate_name: z.string().optional().describe("Engine name to check for duplicates (omit to scan all for overlaps)"),
  threshold: z.number().min(0).max(1).optional().describe("Similarity threshold 0-1 (default 0.6)"),
}).passthrough();

// ============================================================================
// quality_score — Development quality scoring (AUTO-0)
// ============================================================================

const quality_score = z.object({
  engine_name: z.string().optional().describe("Engine name filter (omit for full scan)"),
}).passthrough();

const quality_score_read = z.object({}).passthrough();

const quality_score_summary = z.object({}).passthrough();

// ============================================================================
// auto_wiring — Engine wiring automation (AUTO-1)
// ============================================================================

const auto_wiring_analyze = z.object({
  engine_file: z.string().describe("Engine file name (e.g., MyEngine.ts)"),
  dry_run: z.boolean().optional().describe("Show plan without applying (default: true)"),
}).passthrough();

const auto_wiring_scan = z.object({}).passthrough();

// ============================================================================
// schema/test gap scanning (AUTO-2, AUTO-3)
// ============================================================================

const schema_gap_scan = z.object({}).passthrough();

const test_gap_scan = z.object({}).passthrough();

// ============================================================================
// gap_scan — Unified codebase gap detection (SQ1-0-GAP)
// ============================================================================

const gap_scan = z.object({
  target: z.string().optional().describe("Engine name filter — scans only matching engines"),
  dimensions: z.array(z.string()).optional().describe("Dimension filter, e.g. ['engine_index','engine_test']. Valid: engine_index, engine_dispatcher, engine_schema, engine_route, engine_api_client, engine_test, dispatcher_schema, route_api_client"),
}).passthrough();

const gap_scan_read = z.object({}).passthrough();

const gap_scan_summary = z.object({}).passthrough();

// ============================================================================
// formula_accuracy — Run formula validation suite (AUTO-5)
// ============================================================================

const formula_accuracy = z.object({}).passthrough();

const formula_accuracy_read = z.object({}).passthrough();

const formula_accuracy_summary = z.object({}).passthrough();

// ============================================================================
// self_improvement_* — Self-improvement pattern detection (AUTO-6)
// ============================================================================

const self_improvement_scan = z.object({}).passthrough();

const self_improvement_read = z.object({}).passthrough();

const self_improvement_summary = z.object({}).passthrough();

// ============================================================================
// auto_fix_* — Auto-fix pipeline (AUTO-6 U-SI2)
// ============================================================================

const auto_fix_generate = z.object({}).passthrough();

const auto_fix_read = z.object({}).passthrough();

const auto_fix_summary = z.object({}).passthrough();

const auto_fix_approve = z.object({
  fix_id: z.string().describe("Fix candidate ID to approve (e.g., AFX-001)"),
}).passthrough();

const auto_fix_promote = z.object({
  fix_id: z.string().describe("Approved fix ID to promote (e.g., AFX-001)"),
}).passthrough();

// ============================================================================
// quality_dashboard — Quality metrics dashboard (AUTO-7)
// ============================================================================

const quality_dashboard = z.object({}).passthrough();

const quality_dashboard_read = z.object({}).passthrough();

const quality_dashboard_summary = z.object({}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const ACTION_DEV_SCHEMAS: ActionSchemaMap = {
  session_boot,
  build,
  code_template,
  code_search,
  file_read,
  file_write,
  server_info,
  test_smoke,
  test_results,
  svi_compute,
  svi_read,
  svi_summary,
  erp_persistence_health,
  engine_overlap_scan,
  quality_score,
  quality_score_read,
  quality_score_summary,
  auto_wiring_analyze,
  auto_wiring_scan,
  schema_gap_scan,
  test_gap_scan,
  gap_scan,
  gap_scan_read,
  gap_scan_summary,
  auto_forge: z.object({
    name: z.string().describe("PascalCase engine name, e.g. 'FixtureOptimizationEngine'"),
    description: z.string().describe("One-line description of what the engine does"),
    domain: z.string().optional().describe("Domain hint (physics, business, quality, etc.) — auto-detected if omitted"),
    methods: z.array(z.object({
      name: z.string().describe("Method name in camelCase"),
      description: z.string().optional().describe("Brief method description"),
      params: z.array(z.object({
        name: z.string(),
        type: z.string(),
        optional: z.boolean().optional(),
        description: z.string().optional(),
      })).optional().describe("Parameter definitions"),
      return_type: z.string().optional().describe("Return type (defaults to Promise<Record<string, unknown>>)"),
      is_async: z.boolean().optional().describe("Whether async (defaults to true)"),
    })).optional().describe("Methods to generate. Defaults to a single 'analyze' method."),
    dry_run: z.boolean().optional().describe("If true (default), only return generated content without writing files"),
  }).passthrough(),
  auto_forge_summary: z.object({
    name: z.string().describe("PascalCase engine name"),
    description: z.string().describe("One-line description"),
    domain: z.string().optional(),
    methods: z.array(z.unknown()).optional(),
  }).passthrough(),
  resource_census: z.object({
    location: z.enum(["prism", "archive", "box"]).optional().describe("Scan only this location (default: all)"),
    type: z.string().optional().describe("Filter by type: pdf, video, cad_model, json_data, macro, post_processor, other"),
  }).passthrough(),
  resource_census_read: z.object({}).passthrough(),
  resource_census_summary: z.object({}).passthrough(),
  pdf_pipeline_classify: z.object({
    max_pdfs: z.number().int().positive().optional().describe("Maximum PDFs to classify (default: all)"),
  }).passthrough(),
  pdf_pipeline_extract: z.object({
    category: z.string().optional().describe("Category filter: manufacturer_catalog, handbook, course, cutting_data, hypermill_doc"),
    batch_size: z.number().int().positive().optional().describe("Max PDFs per batch (default: 10)"),
  }).passthrough(),
  pdf_pipeline_read: z.object({}).passthrough(),
  pdf_pipeline_summary: z.object({}).passthrough(),

  // ── SQ3-0: Machine data hardening ──
  machine_harden_audit: z.object({
    machine_id: z.string().optional().describe("Audit a specific machine (omit for all)"),
  }).passthrough(),
  machine_harden_enrich: z.object({
    machine_id: z.string().optional().describe("Enrich a specific machine (omit for all)"),
    dry_run: z.boolean().optional().default(true).describe("If true, report gaps without applying changes"),
  }).passthrough(),
  machine_harden_validate: z.object({
    machine_id: z.string().optional().describe("Validate a specific machine (omit for all)"),
  }).passthrough(),
  machine_harden_read: z.object({}).passthrough(),
  machine_harden_summary: z.object({}).passthrough(),

  formula_accuracy,
  formula_accuracy_read,
  formula_accuracy_summary,
  self_improvement_scan,
  self_improvement_read,
  self_improvement_summary,
  auto_fix_generate,
  auto_fix_read,
  auto_fix_summary,
  auto_fix_approve,
  auto_fix_promote,
  quality_dashboard,
  quality_dashboard_read,
  quality_dashboard_summary,

  // ── Output Budget Enforcer ──
  output_budget_enforce: z.object({
    tool: z.string().describe("Tool name to enforce budget on (e.g. Bash, Read, Grep)"),
    output: z.string().describe("The tool output string to enforce budget on"),
  }).passthrough(),
  output_budget_stats: z.object({}).passthrough(),
  output_budget_set_rule: z.object({
    tool: z.string().describe("Tool name to set budget rule for"),
    max_tokens: z.number().int().positive().describe("Maximum token budget for this tool"),
    strategy: z.enum(["head", "tail", "headtail", "summary"]).optional().describe("Truncation strategy (default: headtail)"),
  }).passthrough(),

  // ── Context Inventory ──
  context_inventory_add: z.object({
    type: z.enum(["file", "search", "decision", "fact", "schema", "config"]).optional().describe("Entry type (default: fact)"),
    key: z.string().describe("Unique key for this context entry"),
    summary: z.string().describe("Brief summary of what was loaded"),
    tokens: z.number().int().nonnegative().optional().describe("Estimated token count"),
  }).passthrough(),
  context_inventory_query: z.object({
    key: z.string().optional().describe("Exact key to look up"),
    search: z.string().optional().describe("Search term to find entries"),
    type: z.enum(["file", "search", "decision", "fact", "schema", "config"]).optional().describe("Filter by entry type"),
  }).passthrough(),
  context_inventory_summary: z.object({}).passthrough(),

  // ── Cost-Aware Router ──
  cost_route: z.object({
    intent: z.enum(["find-file", "search-content", "read-section", "read-full", "count-matches", "list-files", "check-exists", "compare-files", "get-structure", "modify-file"]).describe("Query intent to route"),
    context: z.record(z.string(), z.any()).optional().describe("Additional context (pattern, file, path, etc.)"),
  }).passthrough(),
  cost_route_infer: z.object({
    query: z.string().describe("Natural language query to infer intent from"),
    context: z.record(z.string(), z.any()).optional().describe("Additional context for routing"),
  }).passthrough(),

  // ── Import Cost (TypeScript dependency analysis) ──
  import_cost_analyze: z.object({
    dir: z.string().optional().describe("Directory to analyze (default: engines dir)"),
    max_depth: z.number().int().nonnegative().optional().describe("Max directory traversal depth (default: 0)"),
  }).passthrough(),
  import_cost_heavy: z.object({
    dir: z.string().optional().describe("Directory to scan (default: engines dir)"),
    threshold: z.number().int().positive().optional().describe("Min import count to flag (default: 10)"),
  }).passthrough(),
  import_cost_report: z.object({
    dir: z.string().optional().describe("Directory to report on (default: engines dir)"),
  }).passthrough(),

  // ── Session Token Ledger ──
  token_ledger_record: z.object({
    tool: z.string().describe("Tool name that was called"),
    input_tokens: z.number().int().nonnegative().optional().describe("Estimated input tokens"),
    inputTokens: z.number().int().nonnegative().optional().describe("Estimated input tokens (camelCase alias)"),
    output_tokens: z.number().int().nonnegative().optional().describe("Estimated output tokens"),
    outputTokens: z.number().int().nonnegative().optional().describe("Estimated output tokens (camelCase alias)"),
    label: z.string().optional().describe("Optional label for this entry"),
  }).passthrough(),
  token_ledger_summary: z.object({}).passthrough(),
  token_ledger_project: z.object({}).passthrough(),
  token_ledger_reset: z.object({}).passthrough(),

  // ── Tool Cost Predictor ──
  tool_cost_predict: z.object({
    tool: z.string().optional().describe("Tool name to predict cost for (e.g. Read, Grep, Bash)"),
    tool_name: z.string().optional().describe("Tool name alias"),
    tool_params: z.record(z.string(), z.any()).optional().describe("Tool parameters to factor into prediction"),
  }).passthrough(),
  tool_cost_affordable: z.object({
    tool: z.string().optional().describe("Tool name to check affordability for"),
    tool_name: z.string().optional().describe("Tool name alias"),
    tool_params: z.record(z.string(), z.any()).optional().describe("Tool parameters to factor into prediction"),
    remaining_budget: z.number().nonnegative().optional().describe("Remaining token budget"),
  }).passthrough(),

  // ── Tool Output Fingerprinter ──
  tool_fingerprint_check: z.object({
    tool: z.string().optional().describe("Tool name that produced the output"),
    tool_name: z.string().optional().describe("Tool name alias"),
    output: z.string().describe("Tool output string to fingerprint and check for duplicates"),
  }).passthrough(),
  tool_fingerprint_stats: z.object({}).passthrough(),
  tool_fingerprint_reset: z.object({}).passthrough(),
};
