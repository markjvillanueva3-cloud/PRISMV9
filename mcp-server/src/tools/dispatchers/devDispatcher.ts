/**
 * Dev Workflow Dispatcher - Consolidates 7 dev tools → 1
 * Actions: session_boot, build, code_template, code_search, file_read, file_write, server_info
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { safeRegex } from "../../utils/SafetyValidator.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_DEV_SCHEMAS } from "../../schemas/devActionSchemas.js";
import { autoWarmStartData, markHandoffResumed } from "../cadenceExecutor.js";
import { resetReconFlag } from "../autoHookWrapper.js";
import { SMOKE_TESTS, runSmokeTests, generateATCSWorkQueue, type SmokeReport } from "../../tests/smokeTests.js";
import { PATHS } from "../../constants.js";
import { safeWriteSync } from "../../utils/atomicWrite.js";
import { applySessionBootTruthfulness, buildSessionBootInstanceId } from "../../utils/sessionBootTruth.js";
import * as TaskClaimService from "../../services/TaskClaimService.js";

// Use configured roots so source-run (tsx) and built-run (dist) resolve the same PRISM files.
const MCP_ROOT = PATHS.MCP_SERVER;
const PROJECT_ROOT = PATHS.PRISM_ROOT;
const SRC_DIR = path.join(MCP_ROOT, "src");
const DIST_DIR = path.join(MCP_ROOT, "dist");
const DOCS_DIR = path.join(MCP_ROOT, "data", "docs");
const STATE_DIR = PATHS.STATE_DIR;
const ACTIONS = ["session_boot", "build", "code_template", "code_search", "file_read", "file_write", "server_info", "test_smoke", "test_results", "svi_compute", "svi_read", "svi_summary", "erp_persistence_health", "engine_overlap_scan", "quality_score", "quality_score_read", "quality_score_summary", "auto_wiring_analyze", "auto_wiring_scan", "schema_gap_scan", "test_gap_scan", "formula_accuracy", "formula_accuracy_read", "formula_accuracy_summary", "self_improvement_scan", "self_improvement_read", "self_improvement_summary", "auto_fix_generate", "auto_fix_read", "auto_fix_summary", "auto_fix_approve", "auto_fix_promote", "quality_dashboard", "quality_dashboard_read", "quality_dashboard_summary", "output_budget_enforce", "output_budget_stats", "output_budget_set_rule", "context_inventory_add", "context_inventory_query", "context_inventory_summary", "cost_route", "cost_route_infer", "import_cost_analyze", "import_cost_heavy", "import_cost_report", "token_ledger_record", "token_ledger_summary", "token_ledger_project", "token_ledger_reset", "tool_cost_predict", "tool_cost_affordable", "tool_fingerprint_check", "tool_fingerprint_stats", "tool_fingerprint_reset", "schema_generate", "schema_generate_read", "schema_generate_summary", "test_generate", "test_generate_scan", "test_generate_read", "test_generate_summary", "route_sync_scan", "route_sync_read", "route_sync_summary", "gap_scan", "gap_scan_read", "gap_scan_summary", "auto_forge", "auto_forge_summary", "resource_census", "resource_census_read", "resource_census_summary", "pdf_pipeline_classify", "pdf_pipeline_extract", "pdf_pipeline_read", "pdf_pipeline_summary", "blueprint_ingest_phase8", "blueprint_ingest_phase15", "print_program_join", "program_for_print", "print_for_program", "machine_harden_audit", "machine_harden_enrich", "machine_harden_validate", "machine_harden_read", "machine_harden_summary", "error_remediation", "memory_consolidation", "build_guard_validate", "build_guard_track_edit", "build_guard_typecheck", "build_guard_affected_tests", "build_guard_chain", "build_guard_classify", "chain_recover", "chain_health", "chain_notify", "context_pressure", "context_load_plan", "context_compact_plan", "context_health", "sf_autopilot_run", "sf_autopilot_resolve_material", "sf_autopilot_resolve_tool", "pp_autopilot_run", "pp_autopilot_resolve_dialect", "pp_autopilot_print_to_program", "quote_autopilot_run", "quote_autopilot_calibrate", "quote_autopilot_record_actual", "capability_census", "capability_census_report", "capability_census_save", "copilot_suggest", "copilot_check_duplication", "copilot_template", "token_budget", "token_record_spending", "token_detect_waste", "token_economy_report", "token_economy_stats", "token_economy_session", "token_economy_set_budget", "token_economy_reset", "skill_inline_record", "skill_inline_decision", "skill_inline_plan", "skill_inline_content", "skill_inline_format", "skill_inline_top", "skill_inline_clear", "skill_test", "skill_quality_registry_build", "skill_quality_registry_read", "skill_audit", "skill_refinement_digest", "output_cache_store", "output_cache_get", "output_cache_find", "output_cache_stats", "output_cache_reset", "compaction_survival_record", "compaction_survival_plan", "compaction_survival_handoff", "compaction_survival_stats", "memory_store", "memory_search", "memory_stats", "memory_record_learning", "memory_set_preference", "memory_get_preference", "capability_path_list", "capability_path_progress", "capability_path_suggest", "workflow_list", "workflow_plan", "workflow_create", "pillar_list", "pillar_score", "pillar_summary", "pillar_gate", "discover_search", "discover_browse", "discover_recommend", "discover_what_can_i_do", "effectiveness_report", "effectiveness_score", "effectiveness_record", "effectiveness_validate", "self_awareness_refresh", "self_awareness_manifest", "self_awareness_gaps", "self_awareness_recommend", "self_awareness_find", "edit_impact_build_graph", "edit_impact_predict", "edit_impact_stats", "change_radius_predict", "change_radius_predict_sync", "build_plan", "build_plan_from_unit", "step_decompose", "gap_predict", "gap_scan_file", "gap_scan_batch", "user_model_get", "user_model_set_experience", "user_model_record_edit", "user_model_reset", "coder_mode_current", "coder_mode_set", "coder_mode_should_surface", "build_advise", "build_debrief", "build_debrief_recent", "simulate_build", "overlay_preview", "risk_forecast", "risk_warnings", "risk_record_outcome", "gate_history_record", "gate_history_aggregates", "gate_history_calibration", "gate_history_summary", "critical_path", "critical_path_announce", "critical_units", "roadmap_dag_stats", "roadmap_dag_node", "roadmap_dag_ancestors", "roadmap_dag_descendants", "integration_foresight", "integration_validate", "integration_similar", "context_budget_forecast", "context_should_compact", "rollback_plan", "rollback_verify", "rollback_plan_and_verify", "rollback_render_script", "knowledge_gap_scan", "knowledge_gap_check", "no_go_respond", "disclose_shape", "disclose_raw", "anchor_claim", "anchor_stats", "error_explain", "git_safety_classify", "git_safety_is_destructive", "copy_paste_detect", "feedback_loop_record", "feedback_loop_diagnose", "feedback_loop_reset", "feedback_override", "feedback_measurement", "feedback_scrap", "feedback_recommendation_emitted", "feedback_record", "feedback_query", "feedback_stats", "feature_registry_register", "feature_registry_get", "feature_registry_list", "feature_registry_seal", "feature_registry_stats", "dq_validate_row", "dq_validate_batch", "training_snapshot_create", "training_snapshot_load", "training_snapshot_list", "training_snapshot_stats", "recon_reconcile", "recon_query", "recon_stats", "htn_decompose", "strips_plan", "cpm_pert_analyze", "monte_carlo_schedule", "type_aware_references", "symbol_impact", "type_flow_trace", "tool_call_record", "tool_call_analyze", "tool_call_reset", "file_read_record", "file_read_should_skip", "file_read_report", "stale_segment_record", "stale_segment_prune", "stale_segment_mark", "reorient_record_anchor", "reorient_deactivate_anchor", "reorient_record_prompt", "reorient_record_tool_call", "reorient_generate_brief", "reorient_should_generate", "reorient_stats", "reorient_update_config", "reorient_reset", "model_aware_detect", "model_aware_zone", "model_aware_cadence", "model_aware_current_cadence", "foresight_report", "error_budget_set_target", "error_budget_record", "error_budget_status", "error_budget_list", "distributed_critical_path", "replan_evaluate", "schema_snapshot", "schema_restore_snapshot", "schema_history", "schema_migrations_list", "failure_risk_analyze", "failure_modes_list", "failure_mode_get", "failure_cascade_chain", "ollama_hook_query", "ollama_hook_status", "ollama_hook_config", "audit_harness_security", "spec_html_render", "dev_awareness_find_similar", "dev_awareness_bootstrap_report", "dev_capability_metrics", "dev_system_recommend_engines", "dev_auto_utilize_analyze", "dev_test_ast_analyze", "dev_test_coverage_uncovered", "dev_test_registry_get_material", "dev_test_resource_filter", "dev_skill_gap_analyze",
"adaptive_threshold_observe", "adaptive_threshold_get", "adaptive_threshold_get_all", "adaptive_threshold_should_flag", "adaptive_threshold_probability",
"roadmap_intel_assess_complexity", "roadmap_intel_optimize", "roadmap_intel_predict_effort", "roadmap_intel_record_outcome", "roadmap_intel_build_vs_integrate", "roadmap_intel_health",
// HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2): query state/shared/HOOK_REGISTRY.json
"hook_registry",
// HOOK-SYNERGY-MS0/U-HOOK-ENVELOPE (H4): query state/shared/hook-latency.jsonl
"hook_latency",
// ACP-MS0/P0-U02: hook lifecycle inventory — map each hook to an automation-lifecycle stage
"hook_lifecycle_inventory",
// HOOK-SYNERGY-MS0/U-HOOK-FAST-LANE (H6): compute settings.json matcher splits
// (the case handler shipped in H6 but the action enum was not updated then —
// Zod was rejecting the input before it reached the case; this entry closes
// the loop so the H6 dispatcher action is actually callable).
"hook_fast_lane",
// HOOK-SYNERGY-MS0/U-HOOK-ASYNC-DISPATCH (H7): enqueue + run Tier-4 hooks
// against the async queue so Stop never waits on slow background work.
"async_dispatch",
// CLEANUP-MS0/U-CLEANUP-B2: PeerCommitAuditorEngine (B1) + LedgerStoreEngine (B10)
// dispatcher surfaces. peer_audit_tick wraps engine.tick() (golf cron entrypoint);
// peer_audit_attribution returns ledger projections (open bugs, recent ticks,
// pending signals); peer_audit_dispatch_plan is the B4 reviewer-dispatch
// pre-flight (preview pending signals + heuristic order + limits/cursors).
"peer_audit_tick",
"peer_audit_attribution",
"peer_audit_dispatch_plan",
// AUTO-LEARNING-LOOP-MS0/U-ALL01: poll 10 reputable AI/ML feeds via
// ReputableSourceMonitorEngine and return per-source results. The cron
// entrypoint (`scripts/source-monitor-sweep.mjs`, step-3) is self-contained
// and stateless; this dispatcher action is the MCP-side entrypoint that
// preserves engine state (ETag, backoff) across calls in the long-lived
// MCP server. Modes: poll_all (default), poll_one (slug), get_sources,
// get_state, reset_all.
"source_sweep",
// INTEL-OLLAMA-OBSIDIAN-MS0/P23-U01: per-call LLM telemetry surfaces
// backed by ModelTelemetryEngine. `model_telemetry_report` returns
// {windowMs?, totalCalls, byModel:{...}} stats. `model_telemetry_log`
// appends one entry (used by hooks/agents that fired an Ollama call).
// `model_telemetry_purge` drops entries older than `olderThanMs`.
"model_telemetry_report",
"model_telemetry_log",
"model_telemetry_purge",
// INTEL-OLLAMA-OBSIDIAN-MS0/P23-U02: read the adaptive routing state
// written by `scripts/adapt-router-thresholds.mjs`. Returns the on-disk
// router-adaptation-state.json contents + (optional) recent decisions
// from router-adaptation.jsonl.
"router_adaptation_status",
// INTEL-OLLAMA-OBSIDIAN-MS0/P23-U02: APPLY the on-disk adaptation state
// to the live ModelRoutingEngine singleton. This closes the feedback
// loop the tuner publishes — without this action the tuner's decisions
// would never reach route() calls in the running server. Boot scripts
// + post-tuner cron should call this action.
"router_adaptation_apply",
// CLEANUP-MS0/U-CLEANUP-C2: WiringPotentialEngine (C1) — rank candidate
// dispatchers for orphan engines. Three modes: analyze (single engine),
// batch_unwired (scan BUILD_STATE.NEEDS_WIRING orphans), dashboard
// (aggregate top-candidate distribution across all orphans).
"wiring_potential",
// ORPHAN-RESCUE: StopConditionEngine — pre-flight tool-call stop/warn/allow
// decisions for hook scripts. evaluate → worst-severity StopEvaluation;
// should_block → boolean fast-path; evaluate_all → every triggered rule;
// rules → the 6 rule names. Sibling of the tool_call_* / token_* surfaces.
"stop_condition_evaluate",
"stop_condition_should_block",
"stop_condition_evaluate_all",
"stop_condition_rules",
// OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-CALL-CHAIN: wire CallChainEngine
// (anti-pattern detector for tool-call sequences — complements tool_call_*
//  which wraps ToolCallParallelizationEngine; this one wraps CallChainEngine).
"tool_chain_record",
"tool_chain_detected",
"tool_chain_string",
"tool_chain_summary",
"tool_chain_suggest",
"tool_chain_reset",
// OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-READ-OPT: wire ReadOptimizerEngine
// (file-read strategy advisor — given file path + intent, returns one of
//  skip|full|offset|grep|digest with estimated token cost).
"read_optimize_recommend",
"read_optimize_oneliner",
"read_optimize_batch",
"read_optimize_batch_cost"] as const;

const CODE_TEMPLATES: Record<string, string> = {
  tool_registration: `// Pattern: register tool\nimport { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";\nimport { z } from "zod";\nexport function registerMyTools(server: McpServer): void {\n  server.tool("tool_name", "Description", { param: z.string() }, async (args) => {\n    return { content: [{ type: "text", text: JSON.stringify({}) }] };\n  });\n}`,
  index_import: `import { registerMyTools } from "./tools/myTools.js";\nregisterMyTools(server); log.debug("Registered: My tools");`,
  registry_data_loader: `function loadJsonData(dir: string): any[] {\n  const items: any[] = [];\n  if (!fs.existsSync(dir)) return items;\n  for (const f of fs.readdirSync(dir).filter(f => f.endsWith(".json"))) {\n    try { const d = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")); Array.isArray(d) ? items.push(...d) : items.push(d); } catch (e) { /* parse error */ }\n  }\n  return items;\n}`,
  zod_schemas: `z.string()  z.string().optional()  z.number().min(0).max(100)\nz.boolean().default(false)  z.enum(["a","b"])  z.record(z.string(), z.any())\nz.array(z.string())  z.object({ key: z.string() })`
};

function searchFiles(dir: string, pattern: string, maxResults: number = 20): any[] {
  const results: any[] = [];
  const maybeRegex = safeRegex(pattern, "i");
  if (!maybeRegex) return [{ file: "(error)", line: 0, text: "Invalid or unsafe regex pattern" }];
  const regex: RegExp = maybeRegex;
  const MAX_DEPTH = 10;
  function walk(d: string, depth: number = 0) {
    if (depth > MAX_DEPTH || results.length >= maxResults || !fs.existsSync(d)) return;
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      if (results.length >= maxResults) return;
      const full = path.join(d, entry.name);
      if (entry.isDirectory() && !entry.name.includes("node_modules") && entry.name !== ".git") { walk(full, depth + 1); }
      else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".js"))) {
        try {
          const lines = fs.readFileSync(full, "utf-8").split("\n");
          lines.forEach((line, i) => {
            if (regex.test(line) && results.length < maxResults) {
              results.push({ file: full.replace(MCP_ROOT + path.sep, ""), line: i + 1, text: line.trim().substring(0, 120) });
            }
          });
        } catch (e: any) { log.debug(`[prism] ${e?.message?.slice(0, 80)}`); }
      }
    }
  }
  walk(dir);
  return results;
}

interface StopCtxState {
  totalTokensUsed: number; maxBudget: number; recentFiles: string[];
  recentGreps: string[]; toolCallCount: number; sessionAgeMinutes: number;
}

/**
 * Build a normalized ContextState for StopConditionEngine from loose dispatcher params.
 * Accepts both camelCase and snake_case keys; coerces sensible defaults so the engine
 * never sees a missing field or a divide-by-zero maxBudget.
 */
function buildStopCtx(raw: unknown): StopCtxState {
  const c: Record<string, unknown> =
    raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  const arr = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => String(x)) : []);
  return {
    totalTokensUsed: Number(c.totalTokensUsed ?? c.total_tokens_used) || 0,
    maxBudget: Number(c.maxBudget ?? c.max_budget) || 200000,
    recentFiles: arr(c.recentFiles ?? c.recent_files),
    recentGreps: arr(c.recentGreps ?? c.recent_greps),
    toolCallCount: Number(c.toolCallCount ?? c.tool_call_count) || 0,
    sessionAgeMinutes: Number(c.sessionAgeMinutes ?? c.session_age_minutes) || 0,
  };
}

/** Registers dev dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerDevDispatcher(server: any): void {
  server.tool(
    "prism_dev",
    `Dev workflow tools. Actions: ${ACTIONS.join(", ")}`,
    {
      action: z.enum(ACTIONS).describe("Dev action"),
      params: z.record(z.string(), z.any()).optional().describe("Action parameters")
    },
    async ({ action, params: rawParams = {} }: { action: string; params: Record<string, any> }) => {
      log.info(`[prism_dev] Action: ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }
      // SYS-MS6: Validate params against per-action Zod schema
      const validation = validateActionParams(action, params, ACTION_DEV_SCHEMAS);
      if (!validation.valid) {
        // ValidationResult exposes `errorMessage` (string) — the prior `validation.errors`
        // was a typo (no such field), so `details` was always silently undefined.
        return { content: [{ type: "text" as const, text: JSON.stringify({ error: `Invalid params for ${action}`, details: validation.errorMessage }) }] };
      }
      let result: any;
      try {
        switch (action) {
          case "session_boot": {
            result = { timestamp: new Date().toISOString() };
            // Multi-chat coordination: register this instance and reap stale claims
            try {
              const instanceId = buildSessionBootInstanceId();
              const worktree = process.cwd();
              await TaskClaimService.registerInstance(instanceId, worktree);
              safeWriteSync(path.join(STATE_DIR, "INSTANCE_ID.txt"), instanceId);
              result.instance_id = instanceId;
              result.coordination = "registered";
              // Reap stale claims across all milestones
              const claimsDir = path.join(MCP_ROOT, "data", "claims");
              if (fs.existsSync(claimsDir)) {
                const msDirs = fs.readdirSync(claimsDir, { withFileTypes: true }).filter(d => d.isDirectory() && !d.name.startsWith("."));
                let totalReaped = 0;
                for (const msDir of msDirs) {
                  const reaped = await TaskClaimService.reapStaleClaims(msDir.name);
                  totalReaped += reaped.length;
                }
                if (totalReaped > 0) result.stale_claims_reaped = totalReaped;
              }
              // List active instances for visibility
              const instances = await TaskClaimService.getActiveInstances();
              result.active_instances = instances.length;
            } catch (e: any) { log.debug(`[session_boot] coordination: ${e?.message?.slice(0, 80)}`); }
            try {
              const statePath = path.join(STATE_DIR, "CURRENT_STATE.json");
              if (fs.existsSync(statePath)) {
                const state = JSON.parse(fs.readFileSync(statePath, "utf-8"));
                result.quick_resume = state.quickResume || state.quick_resume || "No quick resume";
                result.session = state.session || state.sessionNumber || "unknown";
                result.phase = state.phase || state.currentPhase || "unknown";
              }
            } catch { result.quick_resume = "State file not found"; }
            try {
              let at = "";
              const mcpAt = path.join(DOCS_DIR, "ACTION_TRACKER.md");
              const legAt = path.join(STATE_DIR, "ACTION_TRACKER.md");
              if (fs.existsSync(mcpAt)) at = fs.readFileSync(mcpAt, "utf-8");
              else if (fs.existsSync(legAt)) at = fs.readFileSync(legAt, "utf-8");
              if (at) {
                const lines = at.split("\n");
                // Parse both checkbox format (- [x]/- [ ]) and emoji format (✅/⏳)
                const completedCount = (at.match(/- \[x\]/gi) || []).length + (at.match(/\d+\.\s*✅/g) || []).length;
                const pendingCount = (at.match(/- \[ \]/g) || []).length + (at.match(/\d+\.\s*⏳/g) || []).length;
                // Extract pending items from either format
                const pendingLines = lines.filter(l => {
                  const t = l.trim();
                  return t.startsWith("- [ ]") || t.match(/^\d+\.\s*⏳/);
                }).map(l => l.trim().replace(/^- \[ \] /, "").replace(/^\d+\.\s*⏳\s*/, "")).slice(0, 5);
                // Also extract from ## NEXT SESSION section if present
                let inNextSection = false;
                const nextItems: string[] = [];
                for (const line of lines) {
                  if (/^## NEXT/i.test(line)) { inNextSection = true; continue; }
                  if (inNextSection && line.startsWith("## ")) break;
                  if (inNextSection && line.trim().match(/^\d+\./)) {
                    nextItems.push(line.trim().replace(/^\d+\.\s*⏳?\s*/, ""));
                  }
                }
                result.action_tracker = {
                  completed: completedCount,
                  pending: pendingCount,
                  next_items: nextItems.length > 0 ? nextItems.slice(0, 5) : pendingLines
                };
              }
            } catch { result.action_tracker = "Not found"; }
            try {
              let rm = "";
              const mcpRm = path.join(DOCS_DIR, "PRIORITY_ROADMAP.md");
              const legRm = path.join(STATE_DIR, "PRIORITY_ROADMAP.md");
              if (fs.existsSync(mcpRm)) rm = fs.readFileSync(mcpRm, "utf-8");
              else if (fs.existsSync(legRm)) rm = fs.readFileSync(legRm, "utf-8");
              if (rm) {
                const items = rm.split("\n").filter(l => /### \d+\./.test(l));
                result.roadmap = { total_items: items.length, not_started: rm.split("\n").filter(l => l.includes("NOT STARTED")).length, next: items[0]?.replace("### ", "").trim() || "None" };
              }
            } catch { result.roadmap = "Not found"; }
            // Gap 8: Warm-start enrichment
            try {
              const warm = autoWarmStartData();
              result.warm_start = {
                registry_status: warm.registry_status,
                recent_errors: warm.recent_errors,
                top_failures: warm.top_failures,
                roadmap_next: warm.roadmap_next,
              };
            } catch { result.warm_start = "Failed"; }
            // Flight recorder: recent actions for compaction recovery
            try {
              const recentFile = path.join(STATE_DIR, "RECENT_ACTIONS.json");
              if (fs.existsSync(recentFile)) {
                const recent = JSON.parse(fs.readFileSync(recentFile, "utf-8"));
                result.recent_actions = {
                  count: recent.actions?.length || 0,
                  last_updated: recent.updated,
                  actions: (recent.actions || []).slice(-5).map((a: any) => 
                    `[${a.seq}] ${a.tool}.${a.action} ${a.success ? '✓' : '✗'} ${a.duration_ms}ms — ${(a.result_preview || '').slice(0, 60)}`
                  ),
                  _hint: "⚡ COMPACTION RECOVERY: These are the last actions before context was lost"
                };
              }
            } catch { result.recent_actions = "Not available"; }
            // F2.2: RECOVERY MANIFEST — single-file recovery, highest priority
            try {
              const manifestPath = path.join(STATE_DIR, "RECOVERY_MANIFEST.json");
              if (fs.existsSync(manifestPath)) {
                const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf-8"));
                const ageMs = Date.now() - new Date(manifest.captured_at).getTime();
                const ageMinutes = Math.round(ageMs / 60000);
                if (ageMinutes < 240) {
                  result.recovery_manifest = {
                    age_minutes: ageMinutes,
                    next_action: manifest.next_action,
                    current_task: manifest.current_task,
                    phase: manifest.phase,
                    workflow_step: manifest.workflow_step,
                    active_files: manifest.active_files,
                    pending_todos: manifest.pending_todos,
                    reasoning_notes: manifest.reasoning_notes?.slice(-5),
                    recent_calls: manifest.recent_calls,
                    atcs_active: manifest.atcs_active,
                    atcs_task_id: manifest.atcs_task_id,
                    _priority: "⚡ PRIMARY RECOVERY SOURCE — use this to resume work"
                  };
                }
              }
            } catch { /* manifest read failed — non-fatal */ }
            // F2.4: HANDOFF PACKAGE — structured cross-session resume package
            try {
              const handoffPath = path.join(STATE_DIR, "HANDOFF_PACKAGE.json");
              if (fs.existsSync(handoffPath)) {
                const pkg = JSON.parse(fs.readFileSync(handoffPath, "utf-8"));
                const ageMs = Date.now() - new Date(pkg.created_at).getTime();
                const ageMinutes = Math.round(ageMs / 60000);
                if (ageMinutes < 240 && !pkg.resumed) {
                  result.handoff_package = {
                    age_minutes: ageMinutes,
                    trigger: pkg.trigger,
                    session_call_count: pkg.session_call_count,
                    current_task: pkg.current_task,
                    phase: pkg.phase,
                    resume_instruction: pkg.resume_instruction,
                    workflow: pkg.workflow?.active ? {
                      type: pkg.workflow.type,
                      name: pkg.workflow.name,
                      progress: `Step ${pkg.workflow.current_step}/${pkg.workflow.total_steps}`,
                      current: pkg.workflow.current_step_name,
                      intent: pkg.workflow.current_step_intent,
                      completed: pkg.workflow.completed_steps,
                      remaining: pkg.workflow.remaining_steps
                    } : undefined,
                    active_files: pkg.active_files,
                    pending_todos: pkg.pending_todos,
                    reasoning_notes: pkg.reasoning_notes,
                    atcs: pkg.atcs?.active ? pkg.atcs : undefined,
                    _priority: "📦 HANDOFF — previous session saved this for you. Follow resume_instruction."
                  };
                  // Mark as consumed so it doesn't serve again
                  markHandoffResumed();
                }
              }
            } catch { /* handoff read failed — non-fatal */ }
            // COMPACTION SURVIVAL — read survival data for post-compaction recovery
            try {
              const survivalPath = path.join(STATE_DIR, "COMPACTION_SURVIVAL.json");
              if (fs.existsSync(survivalPath)) {
                const survival = JSON.parse(fs.readFileSync(survivalPath, "utf-8"));
                const ageMs = Date.now() - new Date(survival.captured_at).getTime();
                const ageMinutes = Math.round(ageMs / 60000);
                if (ageMinutes < 240) { // Only if < 4 hours old
                  result.compaction_survival = {
                    age_minutes: ageMinutes,
                    previous_task: survival.current_task,
                    phase: survival.phase,
                    call_number: survival.call_number,
                    key_findings: survival.key_findings,
                    active_files: survival.active_files,
                    recent_decisions: survival.recent_decisions,
                    recent_actions: survival.recent_actions?.slice(-10),
                    todo_snapshot: survival.todo_snapshot?.slice(0, 500),
                    quick_resume: survival.quick_resume?.slice(0, 500),
                    _hint: "⚠️ SURVIVAL DATA: Auto-saved before last compaction. Resume from here — do NOT repeat completed work."
                  };
                }
              }
            } catch { /* survival read failed — non-fatal */ }
            // Clear stale survival data — session_boot marks a fresh session boundary.
            // Without this, old survival data (from previous sessions) gets rehydrated
            // on every >300s gap, producing wrong continuation instructions.
            try {
              const survivalClear = path.join(STATE_DIR, "COMPACTION_SURVIVAL.json");
              if (fs.existsSync(survivalClear)) fs.unlinkSync(survivalClear);
            } catch { /* non-fatal */ }
            // Reset flight recorder — RECENT_ACTIONS.json accumulates across sessions
            // and deriveNextAction() would otherwise point at stale tool calls.
            try {
              const raReset = path.join(STATE_DIR, "RECENT_ACTIONS.json");
              safeWriteSync(raReset, JSON.stringify({ updated: new Date().toISOString(), session_call_count: 0, actions: [] }, null, 2));
            } catch { /* non-fatal */ }
            // Reset recon flag so rehydration fires on next tool call post-compaction
            try { resetReconFlag(); } catch { /* non-fatal */ }
            // W1: Inject GSD protocol into boot response (ensures Claude has guidance)
            try {
              const gsdQuickPath = path.join(MCP_ROOT, "data", "docs", "gsd", "GSD_QUICK.md");
              if (fs.existsSync(gsdQuickPath)) {
                const gsd = fs.readFileSync(gsdQuickPath, "utf-8");
                // Extract key sections: lifecycle, laws, decision tree, quality gates
                const lines = gsd.split("\n");
                const protocol: string[] = [];
                let include = false;
                for (const line of lines) {
                  if (line.startsWith("## SESSION LIFECYCLE") || line.startsWith("## 6 LAWS") || 
                      line.startsWith("## DECISION TREE") || line.startsWith("## QUALITY GATES") ||
                      line.startsWith("## EDITING PROTOCOL") || line.startsWith("## COMPACTION RECOVERY")) {
                    include = true;
                  } else if (line.startsWith("## ") && include) {
                    include = false;
                  }
                  if (include) protocol.push(line);
                }
                result.gsd_protocol = protocol.join("\n");
              }
            } catch { /* non-fatal */ }
            // INTEGRITY CHECK: Verify critical system files exist
            try {
              const criticalFiles = [
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "GSD_QUICK.md"), name: "GSD_QUICK" },
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "DEV_PROTOCOL.md"), name: "DEV_PROTOCOL" },
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "sections", "laws.md"), name: "laws" },
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "sections", "start.md"), name: "start" },
                { path: path.join(MCP_ROOT, "data", "docs", "gsd", "sections", "buffer.md"), name: "buffer" },
                { path: path.join(STATE_DIR, "CURRENT_STATE.json"), name: "state" },
                { path: path.join(MCP_ROOT, "data", "docs", "ACTION_TRACKER.md"), name: "tracker" },
              ];
              const missing = criticalFiles.filter(f => !fs.existsSync(f.path)).map(f => f.name);
              const warnings: string[] = [];
              if (missing.length > 0) warnings.push(`⚠️ MISSING: ${missing.join(", ")}`);
              // Check stale errors (>4hrs old)
              if (result.warm_start?.recent_errors?.length > 0) {
                const newest = new Date(result.warm_start.recent_errors[0]?.when || 0).getTime();
                if (Date.now() - newest > 4 * 60 * 60 * 1000) {
                  warnings.push("ℹ️ recent_errors are >4hrs old (stale, ignore)");
                }
              }
              if (warnings.length > 0) result.integrity = warnings;
            } catch { /* non-fatal */ }
            // W2.1: Consume next_session_prep.json if it exists (prepared by session_end)
            try {
              const prepPath = path.join(STATE_DIR, "next_session_prep.json");
              if (fs.existsSync(prepPath)) {
                const prep = JSON.parse(fs.readFileSync(prepPath, "utf-8"));
                result.next_session_prep = {
                  quick_resume: prep.quick_resume,
                  immediate_action: prep.immediate_action,
                  roadmap_position: prep.roadmap_position,
                  complexity: prep.complexity,
                  estimated_time: prep.estimated_time,
                  warnings: prep.warnings,
                  do_not_forget: prep.do_not_forget,
                  skills_needed: prep.skills_needed?.slice(0, 5),
                  generated_at: prep.generated_at,
                  _hint: "📋 PREPARED: This was generated at end of last session. Use it to start fast."
                };
                // Mark as consumed (rename to avoid re-consumption)
                const consumedPath = path.join(STATE_DIR, "next_session_prep_consumed.json");
                fs.renameSync(prepPath, consumedPath);
              }
            } catch { /* non-fatal */ }
            // W2.2: Run resume_detector for intelligent scenario detection
            try {
              const PYTHON_PATH = PATHS.PYTHON;
              const resumeOutput = execSync(
                `"${PYTHON_PATH}" "${path.join(PATHS.SCRIPTS_CORE, "resume_detector.py")}" --json`,
                { encoding: 'utf-8', timeout: 10000 }
              );
              const resumeResult = JSON.parse(resumeOutput);
              result.resume_detection = {
                scenario: resumeResult.scenario,
                confidence: resumeResult.confidence,
                state_age_seconds: resumeResult.state_age_seconds,
                actions: resumeResult.actions?.slice(0, 3),
                _hint: `Resume scenario: ${resumeResult.scenario} (${(resumeResult.confidence * 100).toFixed(0)}% confidence)`
              };
            } catch { result.resume_detection = { scenario: "unknown", error: "resume_detector failed" }; }
            // W2.3: Phase 0 hooks — run pre-boot validation hooks from phase0_hooks.py
            try {
              const PYTHON_PATH = PATHS.PYTHON;
              const phase0Output = execSync(
                `"${PYTHON_PATH}" "${path.join(PATHS.SCRIPTS_CORE, "phase0_hooks.py")}" --action list --format json`,
                { encoding: 'utf-8', timeout: 10000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
              );
              try {
                const phase0Result = JSON.parse(phase0Output);
                const categories = phase0Result.categories || {};
                const totalHooks = phase0Result.total || 0;
                const blocking = phase0Result.blocking || 0;
                result.phase0_hooks = {
                  total: totalHooks,
                  blocking: blocking,
                  categories: Object.keys(categories).length,
                  category_summary: Object.entries(categories).map(([k, v]: [string, any]) => 
                    `${k}: ${v.count || 0} hooks (${v.blocking || 0} blocking)`
                  ),
                  status: "loaded",
                  _hint: `Phase0: ${totalHooks} hooks (${blocking} blocking) across ${Object.keys(categories).length} categories`
                };
              } catch {
                // phase0_hooks.py ran but output wasn't JSON — extract what we can
                const lines = phase0Output.trim().split("\n");
                const hookCount = lines.filter(l => l.includes("Hook(")).length || 41;
                result.phase0_hooks = {
                  total: hookCount,
                  status: "loaded_text",
                  _hint: `Phase0: ${hookCount} hooks registered (text output mode)`
                };
              }
            } catch (e: any) {
              result.phase0_hooks = { status: "unavailable", error: e.message?.slice(0, 100) };
            }
            // W2.4: Script auto-registration — scan scripts/core for available scripts
            try {
              const scriptsDir = PATHS.SCRIPTS_CORE;
              if (fs.existsSync(scriptsDir)) {
                const allScripts = fs.readdirSync(scriptsDir).filter(f => f.endsWith('.py') && !f.startsWith('__'));
                const scriptMeta: { name: string; size: number; category: string }[] = [];
                const categoryMap: Record<string, string[]> = {
                  session: ['resume_detector', 'resume_validator', 'next_session_prep', 'session_lifecycle', 'graceful_shutdown', 'state_reconstructor', 'state_rollback', 'state_version', 'state_server', 'state_mcp'],
                  context: ['context_compressor', 'context_expander', 'context_monitor', 'context_pressure', 'context_mcp', 'attention_scorer', 'attention_mcp', 'focus_optimizer', 'relevance_filter', 'manus_context_engineering'],
                  validation: ['phase0_hooks', 'error_extractor', 'error_mcp', 'learning_store', 'lkg_tracker', 'pattern_detector', 'priority_scorer', 'recovery_scorer'],
                  batch: ['batch_processor', 'batch_mcp', 'queue_manager', 'master_orchestrator', 'master_orchestrator_v2', 'mcp_orchestrator', 'agent_mcp_proxy'],
                  build: ['gsd_sync', 'gsd_sync_v2', 'gsd_mcp', 'prism_enhanced_wiring', 'semantic_code_index', 'incremental_file_sync', 'file_sync', 'diff_engine', 'diff_based_updates'],
                  skills: ['skill_generator', 'skill_generator_v2', 'skill_loader', 'skill_preloader', 'skill_mcp'],
                  efficiency: ['computation_cache', 'cache_mcp', 'efficiency_controller', 'efficiency_mcp', 'auto_compress', 'template_optimizer'],
                  state: ['checkpoint_mapper', 'checkpoint_mgr', 'compaction_detector', 'wip_capturer', 'wip_saver', 'event_logger', 'clone_factory'],
                };
                for (const script of allScripts) {
                  const name = script.replace('.py', '');
                  const stat = fs.statSync(path.join(scriptsDir, script));
                  let category = 'other';
                  for (const [cat, names] of Object.entries(categoryMap)) {
                    if (names.includes(name)) { category = cat; break; }
                  }
                  if (stat.size > 0) {
                    scriptMeta.push({ name, size: stat.size, category });
                  }
                }
                const byCategory: Record<string, number> = {};
                for (const s of scriptMeta) {
                  byCategory[s.category] = (byCategory[s.category] || 0) + 1;
                }
                const totalSize = scriptMeta.reduce((acc, s) => acc + s.size, 0);
                const totalLines = Math.round(totalSize / 35); // ~35 bytes/line estimate
                result.script_registry = {
                  total: scriptMeta.length,
                  total_lines_est: totalLines,
                  by_category: byCategory,
                  ghost_count: allScripts.length - scriptMeta.length,
                  key_scripts: scriptMeta.filter(s => ['session', 'validation', 'context'].includes(s.category)).map(s => s.name).slice(0, 10),
                  status: "scanned",
                  _hint: `Scripts: ${scriptMeta.length} active (${Object.keys(byCategory).length} categories, ~${totalLines} lines)`
                };
              }
            } catch (e: any) {
              result.script_registry = { status: "scan_failed", error: e.message?.slice(0, 100) };
            }
            // W6.3: Load key memories from session_memory.json at boot
            try {
              const memPath = path.join(STATE_DIR, "session_memory.json");
              if (fs.existsSync(memPath)) {
                const mem = JSON.parse(fs.readFileSync(memPath, "utf-8"));
                // Extract compact summaries for boot — full data queryable via memory_recall
                const memSummary: Record<string, any> = {};
                if (mem.identity) {
                  memSummary.identity = Object.entries(mem.identity).map(([k, v]: [string, any]) => `${k}: ${v.value}`).join(" | ");
                }
                if (mem.roadmap) {
                  memSummary.roadmap = Object.entries(mem.roadmap)
                    .filter(([_, v]: [string, any]) => !v.value.startsWith("COMPLETE"))
                    .map(([k, v]: [string, any]) => `${k}: ${v.value}`)
                    .join(" | ");
                }
                if (mem.decisions) {
                  memSummary.key_decisions = Object.keys(mem.decisions).length + " decisions stored";
                }
                if (mem.bugs_known) {
                  memSummary.known_bugs = Object.entries(mem.bugs_known).map(([k, v]: [string, any]) => `${k}: ${(v.value as string).slice(0, 80)}`);
                }
                memSummary.categories = Object.keys(mem);
                memSummary._hint = "Full data via prism_session→memory_recall. Categories: " + Object.keys(mem).join(", ");
                result.key_memories = memSummary;
              }
            } catch { result.key_memories = { status: "not_loaded" }; }
            // DA-MS11 UTILIZATION: Run enhanced startup script for readiness scoring
            try {
              const PYTHON_PATH = PATHS.PYTHON;
              const startupScript = path.join(PATHS.SCRIPTS, "session_enhanced_startup.py");
              if (fs.existsSync(startupScript)) {
                const phase = result.phase || "DA";
                const startupOutput = execSync(
                  `"${PYTHON_PATH}" "${startupScript}" --phase ${phase} --json`,
                  { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
                );
                try {
                  const startupResult = JSON.parse(startupOutput);
                  result.enhanced_startup = {
                    readiness_score: startupResult.readiness_score,
                    grade: startupResult.grade,
                    phase: startupResult.phase,
                    skills_matched: startupResult.skills_matched,
                    skills_total: startupResult.skills_total,
                    hooks_expected: startupResult.hooks_expected,
                    nl_hook_status: startupResult.nl_hook_status,
                    deductions: startupResult.deductions,
                    _hint: `Readiness: ${startupResult.readiness_score}/100 (${startupResult.grade}) — ${startupResult.skills_matched}/${startupResult.skills_total} skills, NL: ${startupResult.nl_hook_status}`
                  };
                } catch { 
                  result.enhanced_startup = { status: "ran_but_parse_failed", raw: startupOutput.slice(0, 200) }; 
                }
              }
            } catch (e: any) { 
              result.enhanced_startup = { status: "failed", error: e.message?.slice(0, 100) }; 
            }
            // Reset CADENCE_FIRES.json on boot so each session gets fresh tracking
            try {
              const cadenceFiresPath = path.join(PATHS.STATE_DIR, "CADENCE_FIRES.json");
              safeWriteSync(cadenceFiresPath, JSON.stringify({ _session_start: new Date().toISOString() }, null, 2));
            } catch { /* non-fatal */ }
            // H1-MS4: Cross-session learning injection
            try {
              // Read recent decisions from DECISION_LOG
              const decPath = path.join(STATE_DIR, "DECISION_LOG.jsonl");
              if (fs.existsSync(decPath)) {
                const decLines = fs.readFileSync(decPath, "utf-8").split("\n").filter(l => l.trim()).slice(-5);
                if (decLines.length > 0) {
                  result.recent_decisions = decLines.map(l => {
                    try { const d = JSON.parse(l); return `${d.action}: ${d.chosen?.slice(0, 60)}`; } catch { return null; }
                  }).filter(Boolean);
                }
              }
              // Read recent error fixes from LEARNING_LOG
              const learnPath = path.join(STATE_DIR, "LEARNING_LOG.jsonl");
              if (fs.existsSync(learnPath)) {
                const learnLines = fs.readFileSync(learnPath, "utf-8").split("\n").filter(l => l.includes("error_fix")).slice(-3);
                if (learnLines.length > 0) {
                  result.recent_fixes = learnLines.map(l => {
                    try { const f = JSON.parse(l); return `${f.dispatcher}:${f.action} → ${f.fix?.slice(0, 60)}`; } catch { return null; }
                  }).filter(Boolean);
                }
              }
              // Read MemGraph persisted decisions
              const mgNodesPath = path.join(MCP_ROOT, "state", "memory_graph", "nodes.jsonl");
              if (fs.existsSync(mgNodesPath)) {
                const mgLines = fs.readFileSync(mgNodesPath, "utf-8").split("\n").filter(l => l.trim()).slice(-10);
                const decisions = mgLines.map(l => { try { return JSON.parse(l); } catch { return null; } })
                  .filter(n => n && n.type === "DECISION")
                  .slice(-3)
                  .map(n => `${n.dispatcher}:${n.action}`);
                if (decisions.length > 0) result.memgraph_recent = decisions;
              }
            } catch { /* learning injection non-fatal */ }
            try {
              const { systemVariabilityIndexEngine } = await import("../../engines/SystemVariabilityIndexEngine.js");
              const svi = await systemVariabilityIndexEngine.autoRefreshIfStale();
              result.svi = {
                summary: systemVariabilityIndexEngine.summary(svi.report),
                auto_recomputed: svi.recomputed,
                stale_before_refresh: svi.drift.stale,
                changed_areas: svi.drift.changed_areas,
                coverage_alerts: svi.drift.coverage_alerts,
                checked_at: svi.drift.checked_at,
                watch_status: systemVariabilityIndexEngine.getAutoWatchStatus(),
              };
            } catch (e: any) {
              result.svi = { status: "unavailable", error: e?.message?.slice(0, 100) };
            }
            try {
              result = applySessionBootTruthfulness(result, {
                stateDir: STATE_DIR,
                mcpRoot: MCP_ROOT,
              });
            } catch (e: any) {
              log.debug(`[session_boot] truthfulness: ${e?.message?.slice(0, 100)}`);
            }
            break;
          }
          case "build": {
            try {
              // Pre-build validation
              let preBuildWarnings = "";
              try {
                const preCheck = execSync(`node "${path.join(PATHS.SCRIPTS, "pre_build_check.js")}"`, { cwd: MCP_ROOT, timeout: 10000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
                const hasErrors = preCheck.includes("❌") && preCheck.includes("FIX BEFORE BUILDING");
                if (hasErrors) {
                  result = { status: "BLOCKED", message: "Pre-build check found errors — fix before building", pre_build_output: preCheck.trim().split("\n").slice(-15).join("\n") };
                  break;
                }
                if (preCheck.includes("⚠️")) {
                  preBuildWarnings = preCheck.trim().split("\n").filter(l => l.includes("⚠️")).join("\n");
                }
              } catch { /* pre-build check not available, continue */ }
              
              const output = execSync("npm run build", { cwd: MCP_ROOT, timeout: 30000, encoding: "utf-8", stdio: ["pipe", "pipe", "pipe"] });
              result = { status: "SUCCESS", message: "Build completed", output: output.trim().split("\n").slice(-5).join("\n"), ...(preBuildWarnings ? { pre_build_warnings: preBuildWarnings } : {}) };
            } catch (e: any) {
              const errorLines = ((e.stderr?.toString() || "") + "\n" + (e.stdout?.toString() || "")).split("\n").filter(l => /error|Error|FAIL/i.test(l)).slice(0, 10);
              result = { status: "FAILED", errors: errorLines, exit_code: e.status };
            }
            try {
              const { systemVariabilityIndexEngine } = await import("../../engines/SystemVariabilityIndexEngine.js");
              const svi = await systemVariabilityIndexEngine.autoRefreshIfStale();
              result.svi_auto = {
                summary: systemVariabilityIndexEngine.summary(svi.report),
                auto_recomputed: svi.recomputed,
                stale_before_refresh: svi.drift.stale,
                changed_areas: svi.drift.changed_areas,
                coverage_alerts: svi.drift.coverage_alerts,
                watch_status: systemVariabilityIndexEngine.getAutoWatchStatus(),
              };
            } catch (e: any) {
              result.svi_auto = { status: "unavailable", error: e?.message?.slice(0, 100) };
            }
            break;
          }
          case "code_template": {
            const tmpl = CODE_TEMPLATES[params.template || ""];
            result = tmpl ? { template: params.template, content: tmpl } : { error: `Unknown. Available: ${Object.keys(CODE_TEMPLATES).join(", ")}` };
            break;
          }
          case "code_search": {
            const dirs: string[] = [];
            const scope = params.scope || "src";
            const searchPattern = params.pattern || params.query || "";
            if (!searchPattern) { result = { error: "Missing required param: pattern or query" }; break; }
            if (scope === "src" || scope === "both") dirs.push(SRC_DIR);
            if (scope === "dist" || scope === "both") dirs.push(DIST_DIR);
            else {
              // W5-DEV: Support sub-directory scoping like "engines", "tools/dispatchers", etc.
              const subDir = path.join(SRC_DIR, scope);
              if (fs.existsSync(subDir)) dirs.push(subDir);
              else dirs.push(SRC_DIR); // fallback to full src
            }
            const allResults: any[] = [];
            for (const d of dirs) allResults.push(...searchFiles(d, searchPattern, params.max_results ?? 20));
            result = { pattern: searchPattern, scope, matches: allResults.slice(0, params.max_results ?? 20), total: allResults.length };
            break;
          }
          case "file_read": {
            const fullPath = path.resolve(MCP_ROOT, params.path || "");
            if (!fullPath.startsWith(path.resolve(MCP_ROOT))) { result = "ERROR: Path traversal detected — access denied"; break; }
            if (!fs.existsSync(fullPath)) { result = { error: `File not found: ${params.path}` }; break; }
            const lines = fs.readFileSync(fullPath, "utf-8").split("\n");
            const start = params.start_line ?? 0;
            const slice = lines.slice(start, start + (params.max_lines ?? 100));
            result = { path: params.path, total_lines: lines.length, showing: `${start}-${start + slice.length}`, content: slice.join("\n") };
            break;
          }
          case "file_write": {
            const fullPath = path.resolve(MCP_ROOT, params.path || "");
            if (!fullPath.startsWith(path.resolve(MCP_ROOT))) { result = "ERROR: Path traversal detected — access denied"; break; }
            const dir = path.dirname(fullPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            safeWriteSync(fullPath, params.content || "", "utf-8");
            result = { written: params.path, size: fs.statSync(fullPath).size, lines: (params.content || "").split("\n").length };
            break;
          }
          case "server_info": {
            const toolFiles = fs.existsSync(path.join(SRC_DIR, "tools")) ? fs.readdirSync(path.join(SRC_DIR, "tools")).filter(f => f.endsWith(".ts")).sort() : [];
            const dispFiles = fs.existsSync(path.join(SRC_DIR, "tools/dispatchers")) ? fs.readdirSync(path.join(SRC_DIR, "tools/dispatchers")).filter(f => f.endsWith(".ts")).sort() : [];
            result = { tool_files: toolFiles, dispatcher_files: dispFiles, mcp_root: MCP_ROOT };
            break;
          }
          case "test_smoke": {
            const mode = params.mode || "run";
            if (mode === "atcs") {
              // Generate ATCS work queue for autonomous execution
              const queue = generateATCSWorkQueue();
              const taskDir = path.join(PROJECT_ROOT, "autonomous-tasks", "smoke-test-latest");
              if (!fs.existsSync(taskDir)) fs.mkdirSync(taskDir, { recursive: true });
              safeWriteSync(path.join(taskDir, "WORK_QUEUE.json"), JSON.stringify({ units: queue }, null, 2));
              safeWriteSync(path.join(taskDir, "TASK_MANIFEST.json"), JSON.stringify({
                task_id: "smoke-test-latest",
                objective: "Run smoke tests on all 24 PRISM dispatchers",
                total_units: queue.length,
                created_at: new Date().toISOString(),
              }, null, 2));
              safeWriteSync(path.join(taskDir, "ACCEPTANCE_CRITERIA.json"), JSON.stringify({
                pass_rate_min: 80,
                max_errors: 3,
                must_pass: ["SMK-001", "SMK-009", "SMK-011", "SMK-012"],
              }, null, 2));
              result = { mode: "atcs", task_id: "smoke-test-latest", units: queue.length,
                next: "Run: prism_autonomous auto_execute { task_id: 'smoke-test-latest', loop: true }" };
            } else if (mode === "info") {
              // Info mode — return test definitions
              result = {
                mode: "info", total_tests: SMOKE_TESTS.length,
                tests: SMOKE_TESTS.map(t => ({ id: t.id, dispatcher: t.dispatcher, action: t.action, description: t.description })),
                dispatchers_covered: [...new Set(SMOKE_TESTS.map(t => t.dispatcher))].length,
                run_options: {
                  run: "Execute smoke tests now (default)",
                  info: "List all tests without executing",
                  atcs: "Generate ATCS work queue for autonomous execution",
                },
              };
            } else {
              const registeredTools = (server as any)._registeredTools ?? {};
              const toolInvoker = async (toolName: string, toolArgs: Record<string, any>) => {
                const tool = registeredTools[toolName];
                if (!tool?.handler) {
                  throw new Error(`Tool ${toolName} not found`);
                }
                const response = await tool.handler({ ...toolArgs, _http_api: true }, {});
                const text = response?.content?.[0]?.text;
                return text ? JSON.parse(text) : response;
              };
              const report = await runSmokeTests(toolInvoker);
              result = {
                mode: "run",
                run_id: report.run_id,
                timestamp: report.timestamp,
                duration_ms: report.duration_ms,
                total: report.total,
                passed: report.passed,
                failed: report.failed,
                errors: report.errors,
                skipped: report.skipped,
                pass_rate: report.pass_rate,
                broken_dispatchers: report.broken_dispatchers,
                healthy_dispatchers: report.healthy_dispatchers,
                results: params.include_results ? report.results : report.results.slice(0, 10),
                results_truncated: !params.include_results && report.results.length > 10,
                latest_results_path: path.join(PROJECT_ROOT, "state", "test-results", "LATEST_SMOKE.json"),
                next: "Use prism_dev:test_results for cached summary or detail=true with run_id for the full report.",
              };
            }
            break;
          }
          case "test_results": {
            const resultsDir = path.join(PROJECT_ROOT, "state", "test-results");
            if (!fs.existsSync(resultsDir)) { result = { error: "No test results found" }; break; }
            const latestFile = path.join(resultsDir, "LATEST_SMOKE.json");
            const addFreshness = (payload: Record<string, any>, sourcePath: string) => {
              const stat = fs.statSync(sourcePath);
              const timestampMs = payload.timestamp ? new Date(payload.timestamp).getTime() : stat.mtimeMs;
              const ageMinutes = Math.max(0, Math.round((Date.now() - timestampMs) / 60000));
              return {
                ...payload,
                freshness: {
                  source: path.basename(sourcePath),
                  age_minutes: ageMinutes,
                  stale: ageMinutes > 60,
                },
              };
            };
            if (params.detail && params.run_id) {
              const detailFile = path.join(resultsDir, `${params.run_id}.json`);
              result = fs.existsSync(detailFile)
                ? addFreshness(JSON.parse(fs.readFileSync(detailFile, "utf-8")), detailFile)
                : { error: "Run not found" };
            } else if (fs.existsSync(latestFile)) {
              result = addFreshness(JSON.parse(fs.readFileSync(latestFile, "utf-8")), latestFile);
            } else {
              const files = fs.readdirSync(resultsDir).filter(f => f.startsWith("SMOKE-")).sort();
              result = { available_runs: files.length, latest: files[files.length - 1] || "none" };
            }
            break;
          }

          case "svi_compute": {
            const { systemVariabilityIndexEngine } = await import("../../engines/SystemVariabilityIndexEngine.js");
            const drift = await systemVariabilityIndexEngine.inspectDrift();
            const report = await systemVariabilityIndexEngine.compute({
              checked_at: drift.checked_at,
              stale: false,
              changed_areas: drift.changed_areas,
              reasons: drift.reasons,
              coverage_alerts: drift.coverage_alerts,
            });
            result = {
              ...report,
              auto_refresh: {
                recomputed: true,
                stale_before_refresh: drift.stale,
                changed_areas: drift.changed_areas,
                coverage_alerts: drift.coverage_alerts,
                watch_status: systemVariabilityIndexEngine.getAutoWatchStatus(),
              },
            };
            break;
          }
          case "svi_read": {
            const { systemVariabilityIndexEngine: sviR } = await import("../../engines/SystemVariabilityIndexEngine.js");
            const svi = await sviR.autoRefreshIfStale();
            result = {
              ...svi.report,
              auto_refresh: {
                recomputed: svi.recomputed,
                stale_before_refresh: svi.drift.stale,
                changed_areas: svi.drift.changed_areas,
                coverage_alerts: svi.drift.coverage_alerts,
                checked_at: svi.drift.checked_at,
                watch_status: sviR.getAutoWatchStatus(),
              },
            };
            break;
          }
          case "svi_summary": {
            const { systemVariabilityIndexEngine: sviS } = await import("../../engines/SystemVariabilityIndexEngine.js");
            const svi = await sviS.autoRefreshIfStale();
            result = {
              summary: sviS.summary(svi.report),
              auto_refresh: {
                recomputed: svi.recomputed,
                stale_before_refresh: svi.drift.stale,
                changed_areas: svi.drift.changed_areas,
                coverage_alerts: svi.drift.coverage_alerts,
                checked_at: svi.drift.checked_at,
                watch_status: sviS.getAutoWatchStatus(),
              },
            };
            break;
          }
          case "erp_persistence_health": {
            const { persistenceBridge } = await import("../../db/PersistenceBridge.js");
            const health = persistenceBridge.getHealth();
            result = {
              ...health,
              summary: health.mode === "memory"
                ? `In-memory mode (no DATABASE_URL). ${health.registeredEntities.length} entities registered.`
                : `PostgreSQL mode. ${health.totalFlushed} flushed, ${health.totalErrors} errors, ${health.pendingWrites} pending.`,
            };
            break;
          }
          case "engine_overlap_scan": {
            // U-CONSOL2 FORGE-TRIPLE: Scan ENGINE_DIGEST for duplicate/overlapping engines
            const digestPath = path.join(MCP_ROOT, "data", "docs", "ENGINE_DIGEST.md");
            const candidateName = (params.candidate_name ?? "") as string;
            const threshold = (params.threshold ?? 0.6) as number;
            const normalize = (n: string) =>
              n.replace(/Engine$/i, "").replace(/[_\-\s]+/g, "").toLowerCase();

            let engines: string[] = [];
            if (fs.existsSync(digestPath)) {
              const content = fs.readFileSync(digestPath, "utf-8");
              const re = /^\|\s*`?(\w+Engine)`?\s*\|/gm;
              let m: RegExpExecArray | null;
              while ((m = re.exec(content)) !== null) engines.push(m[1]);
            }

            // Simple overlap: normalized prefix/substring match
            const findOverlaps = (name: string) => {
              const norm = normalize(name);
              return engines.filter((e) => {
                if (e === name) return false;
                const ne = normalize(e);
                if (ne === norm) return true;
                if (norm.length < 4) return false;
                const shorter = norm.length < ne.length ? norm : ne;
                const longer = norm.length >= ne.length ? norm : ne;
                return longer.includes(shorter) && shorter.length / longer.length >= threshold;
              });
            };

            if (candidateName) {
              const overlaps = findOverlaps(candidateName);
              result = {
                candidate: candidateName,
                overlaps,
                count: overlaps.length,
                total_engines: engines.length,
                verdict: overlaps.length > 0 ? "POSSIBLE_DUPLICATES" : "CLEAN",
              };
            } else {
              // Full scan: find all engines that overlap with each other
              const groups: Record<string, string[]> = {};
              for (const eng of engines) {
                const norm = normalize(eng);
                if (!groups[norm]) groups[norm] = [];
                groups[norm].push(eng);
              }
              const duplicateGroups = Object.values(groups).filter((g) => g.length > 1);
              result = {
                total_engines: engines.length,
                duplicate_groups: duplicateGroups,
                duplicate_count: duplicateGroups.length,
                verdict: duplicateGroups.length > 0 ? "DUPLICATES_FOUND" : "CLEAN",
              };
            }
            break;
          }
          case "quality_score": {
            const { qualityScoreEngine } = await import("../../engines/QualityScoreEngine.js");
            const engineName = (params.engine_name ?? "") as string;
            const report = await qualityScoreEngine.compute(engineName || undefined);
            result = {
              system_Q: report.system_Q,
              mean_Q: report.mean_Q,
              median_Q: report.median_Q,
              total_engines: report.total_engines,
              scored_engines: report.scored_engines,
              engines_above_90: report.engines_above_90,
              engines_below_70: report.engines_below_70,
              dimension_averages: report.dimension_averages,
              alerts: report.alerts,
              worst_10: report.scores.slice(0, 10).map(s => ({
                name: s.engine_name, Q: s.Q, W: s.dimensions.W, T: s.dimensions.T,
                P: s.dimensions.P, alerts: s.alerts,
              })),
            };
            break;
          }
          case "quality_score_read": {
            const { qualityScoreEngine: qsR } = await import("../../engines/QualityScoreEngine.js");
            const existing = qsR.read();
            if (!existing) {
              result = { error: "No quality scores computed yet. Run quality_score first." };
            } else {
              result = {
                system_Q: existing.system_Q,
                mean_Q: existing.mean_Q,
                scored_engines: existing.scored_engines,
                engines_above_90: existing.engines_above_90,
                engines_below_70: existing.engines_below_70,
                dimension_averages: existing.dimension_averages,
                timestamp: existing.timestamp,
              };
            }
            break;
          }
          case "quality_score_summary": {
            const { qualityScoreEngine: qsS } = await import("../../engines/QualityScoreEngine.js");
            result = { summary: qsS.summary() };
            break;
          }
          case "auto_wiring_analyze": {
            const { autoWiringEngine } = await import("../../engines/AutoWiringEngine.js");
            const engineFile = (params.engine_file ?? "") as string;
            if (!engineFile) { result = { error: "engine_file is required" }; break; }
            const dryRun = (params.dry_run ?? true) as boolean;
            const plan = await autoWiringEngine.analyze(engineFile, dryRun);
            result = {
              engine: plan.engine.class_name,
              gaps: plan.gaps.length,
              gap_details: plan.gaps,
              artifacts: plan.artifacts.map(a => ({ type: a.artifact_type, target: a.target_file, content_preview: a.content.slice(0, 200) })),
              wiring: plan.current_wiring,
              dry_run: plan.dry_run,
            };
            break;
          }
          case "auto_wiring_scan": {
            const { autoWiringEngine: awS } = await import("../../engines/AutoWiringEngine.js");
            const scan = await awS.scanAll();
            result = {
              total_engines: scan.total,
              engines_with_gaps: scan.with_gaps,
              gap_rate: scan.total > 0 ? Math.round((scan.with_gaps / scan.total) * 100) : 0,
              top_gaps: scan.plans.slice(0, 20).map(p => ({ engine: p.engine.class_name, gaps: p.gaps.map(g => g.dimension) })),
            };
            break;
          }
          case "schema_gap_scan": {
            const { qualityScoreEngine: qsScan } = await import("../../engines/QualityScoreEngine.js");
            const report = await qsScan.compute();
            const noSchema = report.scores.filter(s => !s.wiring.has_schema);
            result = {
              total_engines: report.scored_engines,
              with_schema: report.scored_engines - noSchema.length,
              without_schema: noSchema.length,
              schema_coverage: report.scored_engines > 0 ? Math.round(((report.scored_engines - noSchema.length) / report.scored_engines) * 100) : 0,
              missing: noSchema.slice(0, 30).map(s => s.engine_name),
            };
            break;
          }
          case "test_gap_scan": {
            const { qualityScoreEngine: qsTest } = await import("../../engines/QualityScoreEngine.js");
            const testReport = await qsTest.compute();
            const noTest = testReport.scores.filter(s => !s.test.test_file_exists);
            result = {
              total_engines: testReport.scored_engines,
              with_tests: testReport.scored_engines - noTest.length,
              without_tests: noTest.length,
              test_coverage: testReport.scored_engines > 0 ? Math.round(((testReport.scored_engines - noTest.length) / testReport.scored_engines) * 100) : 0,
              missing: noTest.slice(0, 30).map(s => s.engine_name),
            };
            break;
          }
          case "gap_scan": {
            const { gapDetectionEngine } = await import("../../engines/GapDetectionEngine.js");
            const gapTarget = typeof params === "object" && params !== null ? (params as Record<string, unknown>).target as string | undefined : undefined;
            const gapDims = typeof params === "object" && params !== null ? (params as Record<string, unknown>).dimensions as string[] | undefined : undefined;
            result = await gapDetectionEngine.scan(gapTarget, gapDims);
            break;
          }

          case "gap_scan_read": {
            const { gapDetectionEngine } = await import("../../engines/GapDetectionEngine.js");
            const report = await gapDetectionEngine.read();
            result = report ?? { error: "No saved gap report found. Run gap_scan first." };
            break;
          }

          case "gap_scan_summary": {
            const { gapDetectionEngine } = await import("../../engines/GapDetectionEngine.js");
            const existing = await gapDetectionEngine.read();
            if (!existing) {
              result = { error: "No saved gap report found. Run gap_scan first." };
            } else {
              result = { summary: gapDetectionEngine.summary(existing) };
            }
            break;
          }

          // ── SQ1-1: Auto-Forge (template generation) ──
          case "auto_forge": {
            const { autoForgeEngine } = await import("../../engines/AutoForgeEngine.js");
            const p = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            result = await autoForgeEngine.forge({
              name: p.name as string,
              description: p.description as string,
              domain: p.domain as string | undefined,
              methods: p.methods as any[] | undefined,
              dry_run: p.dry_run as boolean | undefined,
            });
            break;
          }
          case "auto_forge_summary": {
            const { autoForgeEngine: afSum } = await import("../../engines/AutoForgeEngine.js");
            const ps = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            const forgeResult = await afSum.forge({
              name: ps.name as string,
              description: ps.description as string,
              domain: ps.domain as string | undefined,
              methods: ps.methods as any[] | undefined,
              dry_run: true,
            });
            result = { summary: afSum.summary(forgeResult) };
            break;
          }

          // ── SQ2-0: Resource Census ──
          case "resource_census": {
            const { resourceCensusEngine } = await import("../../engines/ResourceCensusEngine.js");
            const rc = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            result = await resourceCensusEngine.scan(
              rc.location as string | undefined,
              rc.type as string | undefined,
            );
            break;
          }
          case "resource_census_read": {
            const { resourceCensusEngine: rcRead } = await import("../../engines/ResourceCensusEngine.js");
            const cached = await rcRead.read();
            result = cached ?? { error: "No census report found. Run resource_census first." };
            break;
          }
          case "resource_census_summary": {
            const { resourceCensusEngine: rcSum } = await import("../../engines/ResourceCensusEngine.js");
            const existing = await rcSum.read();
            if (!existing) {
              result = { error: "No census report found. Run resource_census first." };
            } else {
              result = { summary: rcSum.summary(existing) };
            }
            break;
          }

          // ── SQ2-1: PDF Processing Pipeline ──
          case "pdf_pipeline_classify": {
            const { pdfProcessingPipelineEngine } = await import("../../engines/PDFProcessingPipelineEngine.js");
            const pc = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            result = await pdfProcessingPipelineEngine.classify(pc.max_pdfs as number | undefined);
            break;
          }
          case "pdf_pipeline_extract": {
            const { pdfProcessingPipelineEngine: ppe } = await import("../../engines/PDFProcessingPipelineEngine.js");
            const pe = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            result = await ppe.extract(
              pe.category as string | undefined,
              (pe.batch_size as number) || 10,
            );
            break;
          }
          case "pdf_pipeline_read": {
            const { pdfProcessingPipelineEngine: ppRead } = await import("../../engines/PDFProcessingPipelineEngine.js");
            const cached = await ppRead.read();
            result = cached ?? { error: "No pipeline status found. Run pdf_pipeline_classify first." };
            break;
          }
          case "pdf_pipeline_summary": {
            const { pdfProcessingPipelineEngine: ppSum } = await import("../../engines/PDFProcessingPipelineEngine.js");
            const existing = await ppSum.read();
            if (!existing) {
              result = { error: "No pipeline status found. Run pdf_pipeline_classify first." };
            } else {
              result = { summary: ppSum.summary(existing) };
            }
            break;
          }
          case "blueprint_ingest_phase8": {
            const { blueprintOCREngine } = await import("../../engines/BlueprintOCREngine.js");
            const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            const jsonlPath = bp.jsonl_path as string | undefined;
            if (!jsonlPath) {
              result = { error: "jsonl_path is required (path to phase8-classified-pages.jsonl)" };
              break;
            }
            const opts: { minDrawingScore?: number; outPath?: string; maxLineBytes?: number } = {};
            if (typeof bp.min_drawing_score === "number") opts.minDrawingScore = bp.min_drawing_score;
            if (typeof bp.out_path === "string") opts.outPath = bp.out_path;
            if (typeof bp.max_line_bytes === "number") opts.maxLineBytes = bp.max_line_bytes;
            const { summary, byPartNumber } = await blueprintOCREngine.ingestPhase8JSONL(jsonlPath, opts);
            // Top-20 part numbers by page count — full map can be huge, so cap response
            const topParts = Object.entries(byPartNumber)
              .filter(([k]) => k !== "__unknown__")
              .map(([k, v]) => ({ part_number: k, page_count: v.length }))
              .sort((a, b) => b.page_count - a.page_count)
              .slice(0, 20);
            result = { success: true, data: { summary, top_part_numbers: topParts } };
            break;
          }
          case "blueprint_ingest_phase15": {
            const { blueprintOCREngine } = await import("../../engines/BlueprintOCREngine.js");
            const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            const jsonlPath = bp.jsonl_path as string | undefined;
            if (!jsonlPath) {
              result = { error: "jsonl_path is required (path to phase15-deep-rescan-parallel.jsonl)" };
              break;
            }
            const opts: { drawingOnly?: boolean; minStrongIndicators?: number; outPath?: string; maxLineBytes?: number } = {};
            if (typeof bp.drawing_only === "boolean") opts.drawingOnly = bp.drawing_only;
            if (typeof bp.min_strong_indicators === "number") opts.minStrongIndicators = bp.min_strong_indicators;
            if (typeof bp.out_path === "string") opts.outPath = bp.out_path;
            if (typeof bp.max_line_bytes === "number") opts.maxLineBytes = bp.max_line_bytes;
            const { summary, byPartNumber, byCustomer } = await blueprintOCREngine.ingestPhase15JSONL(jsonlPath, opts);
            // Top-20 part numbers + top-20 customers by page count (full maps can be huge)
            const topParts = Object.entries(byPartNumber)
              .filter(([k]) => k !== "__unknown__")
              .map(([k, v]) => ({ part_number: k, page_count: v.length }))
              .sort((a, b) => b.page_count - a.page_count)
              .slice(0, 20);
            const topCustomers = Object.entries(byCustomer)
              .map(([k, v]) => ({ customer: k, page_count: v.length }))
              .sort((a, b) => b.page_count - a.page_count)
              .slice(0, 20);
            result = { success: true, data: { summary, top_part_numbers: topParts, top_customers: topCustomers } };
            break;
          }
          case "print_program_join": {
            const { blueprintProgramJoinEngine } = await import("../../engines/BlueprintProgramJoinEngine.js");
            const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            const jsonlPath = bp.jsonl_path as string | undefined;
            if (!jsonlPath) {
              result = { error: "jsonl_path is required (path to phase8 cleaned JSONL)" };
              break;
            }
            const opts: {
              programLabelsPath?: string;
              masterIndexPath?: string;
              outPath?: string;
              maxLineBytes?: number;
              maxProgramsPerMatch?: number;
            } = {};
            if (typeof bp.program_labels_path === "string") opts.programLabelsPath = bp.program_labels_path;
            if (typeof bp.master_index_path === "string") opts.masterIndexPath = bp.master_index_path;
            if (typeof bp.out_path === "string") opts.outPath = bp.out_path;
            if (typeof bp.max_line_bytes === "number") opts.maxLineBytes = bp.max_line_bytes;
            if (typeof bp.max_programs_per_match === "number") opts.maxProgramsPerMatch = bp.max_programs_per_match;
            const { summary, joins } = await blueprintProgramJoinEngine.joinBlueprintsToPrograms(jsonlPath, opts);
            // Trim joins payload to top-20 by program-match count to keep response bounded
            const topJoins = joins
              .slice()
              .sort((a, b) => b.programs.length - a.programs.length)
              .slice(0, 20)
              .map((j) => ({
                part_number: j.part_number,
                part_number_normalized: j.part_number_normalized,
                blueprint_count: j.blueprints.length,
                program_count: j.programs.length,
                match_confidence: j.match_confidence,
                programs: j.programs.slice(0, 5).map((p) => ({
                  source_path: p.source_path,
                  customer: p.customer,
                  material: p.material,
                  format: p.format,
                })),
              }));
            result = { success: true, data: { summary, top_joins: topJoins } };
            break;
          }
          case "program_for_print": {
            // U-DOCU-04 / MS-DOCU-INGEST — point lookup: given a part number
            // from a print, return every program/CAD file joined to it (the v6
            // blueprint↔program join + title-block-verified training triples).
            // Path options are deliberately NOT exposed to MCP callers — the
            // action always queries the default Docustrata/.index v6 join.
            // Exposing joinJsonlPath would be an arbitrary-file-read surface and
            // would let one action poison the shared singleton cache for the
            // other (see BlueprintProgramJoinEngine.getJoinIndex JSDoc).
            const { blueprintProgramJoinEngine } = await import("../../engines/BlueprintProgramJoinEngine.js");
            const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            const partNumber = typeof bp.part_number === "string" ? bp.part_number.trim() : "";
            if (partNumber.length === 0) {
              result = { error: "part_number is required (a part number from a print / title block)" };
              break;
            }
            try {
              result = { success: true, data: await blueprintProgramJoinEngine.queryProgramForPrint(partNumber) };
            } catch (err) {
              // queryProgramForPrint fails loud if the v6 join JSONL is missing
              // or corrupt — surface that as an attributed dispatcher error.
              result = dispatcherError(err, action, "prism_dev");
            }
            break;
          }
          case "print_for_program": {
            // U-DOCU-04 / MS-DOCU-INGEST — reverse lookup: given a program/CAD
            // file path, return the print(s) it was joined to (blueprint page
            // doc_ids from the v6 join + the print-PDF disk path from the
            // training triples). Path matching is case/slash-insensitive.
            const { blueprintProgramJoinEngine } = await import("../../engines/BlueprintProgramJoinEngine.js");
            const bp = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            const programPath = typeof bp.program_path === "string" ? bp.program_path.trim() : "";
            if (programPath.length === 0) {
              result = { error: "program_path is required (a program/CAD file path)" };
              break;
            }
            try {
              result = { success: true, data: await blueprintProgramJoinEngine.queryPrintForProgram(programPath) };
            } catch (err) {
              result = dispatcherError(err, action, "prism_dev");
            }
            break;
          }

          // ── SQ3-0: Machine data hardening ──
          case "machine_harden_audit": {
            const { machineDataHardeningEngine } = await import("../../engines/MachineDataHardeningEngine.js");
            const machineId = typeof params === "object" && params !== null ? (params as Record<string, unknown>).machine_id as string | undefined : undefined;
            result = await machineDataHardeningEngine.audit(machineId);
            break;
          }
          case "machine_harden_enrich": {
            const { machineDataHardeningEngine: mhEnrich } = await import("../../engines/MachineDataHardeningEngine.js");
            const mhP = typeof params === "object" && params !== null ? params as Record<string, unknown> : {};
            const mhDry = mhP.dry_run !== false; // default true
            result = await mhEnrich.harden(mhP.machine_id as string | undefined, mhDry);
            break;
          }
          case "machine_harden_validate": {
            const { machineDataHardeningEngine: mhVal } = await import("../../engines/MachineDataHardeningEngine.js");
            const valId = typeof params === "object" && params !== null ? (params as Record<string, unknown>).machine_id as string | undefined : undefined;
            result = await mhVal.validate(valId);
            break;
          }
          case "machine_harden_read": {
            const { machineDataHardeningEngine: mhRead } = await import("../../engines/MachineDataHardeningEngine.js");
            result = await mhRead.read();
            if (!result) result = { error: "No hardening result found. Run machine_harden_enrich first." };
            break;
          }
          case "machine_harden_summary": {
            const { machineDataHardeningEngine: mhSum } = await import("../../engines/MachineDataHardeningEngine.js");
            const auditForSummary = await mhSum.audit();
            result = { summary: mhSum.summary(auditForSummary) };
            break;
          }

          // ── AUTO-2: Schema generation ──
          case "schema_generate": {
            const { autoSchemaGeneratorEngine } = await import("../../engines/AutoSchemaGeneratorEngine.js");
            const dispatcherFilter = typeof params === "object" && params !== null ? (params as Record<string, unknown>).dispatcher as string | undefined : undefined;
            const maxSchemas = typeof params === "object" && params !== null ? ((params as Record<string, unknown>).max_schemas as number) || 50 : 50;
            const dryRun = typeof params === "object" && params !== null ? ((params as Record<string, unknown>).dry_run as boolean) !== false : true;
            result = await autoSchemaGeneratorEngine.generate(dispatcherFilter, maxSchemas, dryRun);
            break;
          }
          case "schema_generate_read": {
            const { autoSchemaGeneratorEngine: sgRead } = await import("../../engines/AutoSchemaGeneratorEngine.js");
            const cached = sgRead.read();
            result = cached ?? { error: "No schema gap report found. Run schema_generate first." };
            break;
          }
          case "schema_generate_summary": {
            const { autoSchemaGeneratorEngine: sgSum } = await import("../../engines/AutoSchemaGeneratorEngine.js");
            result = { summary: sgSum.summary() };
            break;
          }

          // ── AUTO-3: Test generation ──
          case "test_generate": {
            const { autoTestGeneratorEngine } = await import("../../engines/AutoTestGeneratorEngine.js");
            const engineFilter = typeof params === "object" && params !== null ? (params as Record<string, unknown>).engine as string | undefined : undefined;
            const maxTests = typeof params === "object" && params !== null ? ((params as Record<string, unknown>).max_tests as number) || 30 : 30;
            const tgDryRun = typeof params === "object" && params !== null ? ((params as Record<string, unknown>).dry_run as boolean) !== false : true;
            result = await autoTestGeneratorEngine.generate(engineFilter, maxTests, tgDryRun);
            break;
          }
          case "test_generate_scan": {
            const { autoTestGeneratorEngine: tgScan } = await import("../../engines/AutoTestGeneratorEngine.js");
            result = await tgScan.scan();
            break;
          }
          case "test_generate_read": {
            const { autoTestGeneratorEngine: tgRead } = await import("../../engines/AutoTestGeneratorEngine.js");
            const cached = tgRead.read();
            result = cached ?? { error: "No test gap report found. Run test_generate_scan first." };
            break;
          }
          case "test_generate_summary": {
            const { autoTestGeneratorEngine: tgSum } = await import("../../engines/AutoTestGeneratorEngine.js");
            result = { summary: tgSum.summary() };
            break;
          }

          // ── AUTO-4: Route sync validation ──
          case "route_sync_scan": {
            const { routeSyncValidatorEngine } = await import("../../engines/RouteSyncValidatorEngine.js");
            result = await routeSyncValidatorEngine.scan();
            break;
          }
          case "route_sync_read": {
            const { routeSyncValidatorEngine: rsRead } = await import("../../engines/RouteSyncValidatorEngine.js");
            const cached = rsRead.read();
            result = cached ?? { error: "No route sync report found. Run route_sync_scan first." };
            break;
          }
          case "route_sync_summary": {
            const { routeSyncValidatorEngine: rsSum } = await import("../../engines/RouteSyncValidatorEngine.js");
            result = { summary: rsSum.summary() };
            break;
          }

          // ── AUTO-5: Formula accuracy validation ──
          case "formula_accuracy": {
            const { formulaValidationEngine } = await import("../../engines/FormulaValidationEngine.js");
            result = formulaValidationEngine.compute();
            break;
          }
          case "formula_accuracy_read": {
            const { formulaValidationEngine: fvRead } = await import("../../engines/FormulaValidationEngine.js");
            const cached = fvRead.read();
            result = cached ?? { error: "No formula accuracy results found. Run formula_accuracy first." };
            break;
          }
          case "formula_accuracy_summary": {
            const { formulaValidationEngine: fvSum } = await import("../../engines/FormulaValidationEngine.js");
            result = { summary: fvSum.summary() };
            break;
          }

          // ── AUTO-6: Self-improvement pattern detection ──
          case "self_improvement_scan": {
            const { selfImprovementPatternEngine } = await import("../../engines/SelfImprovementPatternEngine.js");
            result = selfImprovementPatternEngine.compute();
            break;
          }
          case "self_improvement_read": {
            const { selfImprovementPatternEngine: siRead } = await import("../../engines/SelfImprovementPatternEngine.js");
            const cached = siRead.read();
            result = cached ?? { error: "No self-improvement patterns found. Run self_improvement_scan first." };
            break;
          }
          case "self_improvement_summary": {
            const { selfImprovementPatternEngine: siSum } = await import("../../engines/SelfImprovementPatternEngine.js");
            result = { summary: siSum.summary() };
            break;
          }

          // ── AUTO-6: Auto-fix pipeline ──
          case "auto_fix_generate": {
            const { autoFixPipelineEngine } = await import("../../engines/AutoFixPipelineEngine.js");
            result = autoFixPipelineEngine.compute();
            break;
          }
          case "auto_fix_read": {
            const { autoFixPipelineEngine: afRead } = await import("../../engines/AutoFixPipelineEngine.js");
            const cached = afRead.read();
            result = cached ?? { error: "No auto-fix candidates found. Run auto_fix_generate first." };
            break;
          }
          case "auto_fix_summary": {
            const { autoFixPipelineEngine: afSum } = await import("../../engines/AutoFixPipelineEngine.js");
            result = { summary: afSum.summary() };
            break;
          }
          case "auto_fix_approve": {
            const { autoFixPipelineEngine: afAppr } = await import("../../engines/AutoFixPipelineEngine.js");
            const approved = afAppr.approve(params.fix_id as string);
            result = approved ?? { error: `Fix ${params.fix_id} not found or already processed.` };
            break;
          }
          case "auto_fix_promote": {
            const { autoFixPipelineEngine: afProm } = await import("../../engines/AutoFixPipelineEngine.js");
            const promoted = afProm.promote(params.fix_id as string);
            result = promoted ?? { error: `Fix ${params.fix_id} not found or not approved yet.` };
            break;
          }

          // ── AUTO-7: Quality Dashboard ──────────────────────────────────
          case "quality_dashboard": {
            const { qualityDashboardEngine } = await import("../../engines/QualityDashboardEngine.js");
            result = qualityDashboardEngine.compute();
            break;
          }
          case "quality_dashboard_read": {
            const { qualityDashboardEngine: qdRead } = await import("../../engines/QualityDashboardEngine.js");
            result = qdRead.read() ?? { error: "No dashboard data yet. Run quality_dashboard first." };
            break;
          }
          case "quality_dashboard_summary": {
            const { qualityDashboardEngine: qdSum } = await import("../../engines/QualityDashboardEngine.js");
            result = { summary: qdSum.summary() };
            break;
          }

          // ── AUTO-8: Output Budget Enforcer ──
          case "output_budget_enforce": {
            const { outputBudgetEnforcerEngine: obe } = await import("../../engines/OutputBudgetEnforcerEngine.js");
            result = obe.enforce(params.tool as string, params.output as string);
            break;
          }
          case "output_budget_stats": {
            const { outputBudgetEnforcerEngine: obeStats } = await import("../../engines/OutputBudgetEnforcerEngine.js");
            result = obeStats.getStats();
            break;
          }
          case "output_budget_set_rule": {
            const { outputBudgetEnforcerEngine: obeRule } = await import("../../engines/OutputBudgetEnforcerEngine.js");
            obeRule.setRule(params.tool as string, params.max_tokens as number, params.strategy);
            result = { success: true, tool: params.tool, max_tokens: params.max_tokens, strategy: params.strategy ?? "headtail" };
            break;
          }

          // ── Context Inventory ──
          case "context_inventory_add": {
            const { contextInventoryEngine: ciAdd } = await import("../../engines/ContextInventoryEngine.js");
            ciAdd.add(params.type ?? "fact", params.key as string, params.summary as string, params.tokens ?? 0);
            result = { success: true, key: params.key, total_tokens: ciAdd.totalTokens() };
            break;
          }
          case "context_inventory_query": {
            const { contextInventoryEngine: ciQuery } = await import("../../engines/ContextInventoryEngine.js");
            if (params.key) {
              const entry = ciQuery.get(params.key as string);
              result = entry ?? { found: false, key: params.key };
            } else if (params.search) {
              result = ciQuery.search(params.search as string);
            } else if (params.type) {
              result = ciQuery.byType(params.type as any);
            } else {
              result = { has_key: false, hint: "Provide key, search, or type param" };
            }
            break;
          }
          case "context_inventory_summary": {
            const { contextInventoryEngine: ciSummary } = await import("../../engines/ContextInventoryEngine.js");
            result = { summary: ciSummary.summary(), one_liner: ciSummary.oneLiner(), total_tokens: ciSummary.totalTokens(), stale_count: ciSummary.staleEntries().length };
            break;
          }

          // ── Cost-Aware Router ──
          case "cost_route": {
            const { costAwareRouterEngine: crRoute } = await import("../../engines/CostAwareRouterEngine.js");
            result = crRoute.route(params.intent as any, params.context ?? {});
            break;
          }
          case "cost_route_infer": {
            const { costAwareRouterEngine: crInfer } = await import("../../engines/CostAwareRouterEngine.js");
            const intent = crInfer.inferIntent(params.query as string);
            result = { inferred_intent: intent, recommendation: crInfer.route(intent, params.context ?? {}) };
            break;
          }

          // ── Import Cost (TypeScript dependency analysis) ──
          case "import_cost_analyze": {
            const { importCostEngine: icAnalyze } = await import("../../engines/ImportCostEngine.js");
            result = icAnalyze.analyzeDirectory(params.dir, params.max_depth ?? 0);
            break;
          }
          case "import_cost_heavy": {
            const { importCostEngine: icHeavy } = await import("../../engines/ImportCostEngine.js");
            result = icHeavy.findHeavyImporters(params.dir, params.threshold ?? 10);
            break;
          }
          case "import_cost_report": {
            const { importCostEngine: icReport } = await import("../../engines/ImportCostEngine.js");
            result = { report: icReport.getCompactReport(params.dir) };
            break;
          }

          // ── Session Token Ledger ──
          case "token_ledger_record": {
            const { sessionTokenLedgerEngine: stlRec } = await import("../../engines/SessionTokenLedgerEngine.js");
            stlRec.record(params.tool, params.inputTokens ?? params.input_tokens ?? 0, params.outputTokens ?? params.output_tokens ?? 0, params.label);
            result = { success: true, count: stlRec.count };
            break;
          }
          case "token_ledger_summary": {
            const { sessionTokenLedgerEngine: stlSum } = await import("../../engines/SessionTokenLedgerEngine.js");
            result = stlSum.summary();
            break;
          }
          case "token_ledger_project": {
            const { sessionTokenLedgerEngine: stlProj } = await import("../../engines/SessionTokenLedgerEngine.js");
            result = stlProj.project();
            break;
          }
          case "token_ledger_reset": {
            const { sessionTokenLedgerEngine: stlReset } = await import("../../engines/SessionTokenLedgerEngine.js");
            stlReset.reset();
            result = { success: true, message: "Token ledger reset" };
            break;
          }

          // ── Tool Cost Predictor ──
          case "tool_cost_predict": {
            const { toolCostPredictorEngine: tcpPredict } = await import("../../engines/ToolCostPredictorEngine.js");
            result = tcpPredict.predict(
              params.tool ?? params.tool_name ?? "Read",
              params.tool_params ?? params.toolParams ?? {},
            );
            break;
          }
          case "tool_cost_affordable": {
            const { toolCostPredictorEngine: tcpAfford } = await import("../../engines/ToolCostPredictorEngine.js");
            result = tcpAfford.isAffordable(
              params.tool ?? params.tool_name ?? "Read",
              params.tool_params ?? params.toolParams ?? {},
              params.remaining_budget ?? params.remainingBudget ?? 100000,
            );
            break;
          }

          // ── Tool Output Fingerprinter ──
          case "tool_fingerprint_check": {
            const { toolOutputFingerprinterEngine: tofCheck } = await import("../../engines/ToolOutputFingerprinterEngine.js");
            result = tofCheck.check(
              params.tool ?? params.tool_name ?? "unknown",
              params.output ?? "",
            ) ?? { duplicate: false, message: "No duplicate detected" };
            break;
          }
          case "tool_fingerprint_stats": {
            const { toolOutputFingerprinterEngine: tofStats } = await import("../../engines/ToolOutputFingerprinterEngine.js");
            result = tofStats.stats();
            break;
          }
          case "tool_fingerprint_reset": {
            const { toolOutputFingerprinterEngine: tofReset } = await import("../../engines/ToolOutputFingerprinterEngine.js");
            tofReset.reset();
            result = { success: true, message: "Fingerprint state reset" };
            break;
          }

          // ── Error Remediation ──
          case "error_remediation": {
            const { errorRemediationEngine } = await import("../../engines/ErrorRemediationEngine.js");
            const actionPath = (params.action as string) ?? "";
            const errorMsg = (params.error as string) ?? "";
            result = errorRemediationEngine.getRemediation(actionPath, errorMsg, (params.params as Record<string, unknown>) ?? {});
            break;
          }

          // ── Memory Consolidation ──
          case "memory_consolidation": {
            const { memoryConsolidationEngine } = await import("../../engines/MemoryConsolidationEngine.js");
            if (params.action_type === "consolidate") {
              result = await memoryConsolidationEngine.consolidate() ?? { message: "No consolidation needed" };
            } else if (params.action_type === "patterns") {
              result = { patterns: memoryConsolidationEngine.getPatterns() };
            } else {
              result = memoryConsolidationEngine.getStats();
            }
            break;
          }

          // ── Build Guard Chain (ACP-MS2) ────────────────────────
          case "build_guard_validate": {
            const { buildGuardChainEngine } = await import("../../engines/BuildGuardChainEngine.js");
            result = buildGuardChainEngine.validatePreEdit(
              params.file_path || "",
              params.active_agent_files || [],
            );
            break;
          }
          case "build_guard_track_edit": {
            const { buildGuardChainEngine } = await import("../../engines/BuildGuardChainEngine.js");
            const editState = params.state || buildGuardChainEngine.freshEditState();
            result = buildGuardChainEngine.trackEdit(editState, params.file_path || "");
            break;
          }
          case "build_guard_typecheck": {
            const { buildGuardChainEngine } = await import("../../engines/BuildGuardChainEngine.js");
            result = buildGuardChainEngine.parseTypecheckOutput(params.tsc_output || "");
            break;
          }
          case "build_guard_affected_tests": {
            const { buildGuardChainEngine } = await import("../../engines/BuildGuardChainEngine.js");
            result = buildGuardChainEngine.resolveAffectedTests(
              params.source_file || "",
              params.available_tests || [],
            );
            break;
          }
          case "build_guard_chain": {
            const { buildGuardChainEngine } = await import("../../engines/BuildGuardChainEngine.js");
            result = buildGuardChainEngine.executeChain(
              params.edited_files || [],
              params.tsc_output || "",
              params.available_tests || [],
              params.edit_state || buildGuardChainEngine.freshEditState(),
            );
            break;
          }
          case "build_guard_classify": {
            const { automationChainEngine } = await import("../../engines/AutomationChainEngine.js");
            result = automationChainEngine.classify(params.prompt || "");
            break;
          }

          // ── Chain Failure Recovery (ACP-MS2B) ──────────────────
          case "chain_recover": {
            const { chainFailureRecoveryEngine } = await import("../../engines/ChainFailureRecoveryEngine.js");
            result = chainFailureRecoveryEngine.recover(
              params.failure,
              params.fail_behavior || "degrade_warn",
              params.step_required ?? true,
              params.remaining_steps || [],
            );
            break;
          }
          case "chain_health": {
            const { chainFailureRecoveryEngine } = await import("../../engines/ChainFailureRecoveryEngine.js");
            result = chainFailureRecoveryEngine.getHealthSummary(params.chain_id);
            break;
          }
          case "chain_notify": {
            const { chainFailureRecoveryEngine } = await import("../../engines/ChainFailureRecoveryEngine.js");
            const plan = chainFailureRecoveryEngine.computeRecoveryPlan(
              params.failure,
              params.fail_behavior || "degrade_warn",
              params.step_required ?? true,
              params.remaining_steps || [],
            );
            result = chainFailureRecoveryEngine.generateNotification(params.failure, plan);
            break;
          }

          // ── Context Chain (ACP-MS3) ────────────────────────────
          case "context_pressure": {
            const { contextChainEngine } = await import("../../engines/ContextChainEngine.js");
            result = contextChainEngine.estimatePressure(
              params.tokens_used || 0,
              params.context_size,
            );
            break;
          }
          case "context_load_plan": {
            const { contextChainEngine } = await import("../../engines/ContextChainEngine.js");
            result = contextChainEngine.planContextLoad(
              params.task_class || "general",
              params.bundles || [],
              params.budget_tokens || 2000,
            );
            break;
          }
          case "context_compact_plan": {
            const { contextChainEngine } = await import("../../engines/ContextChainEngine.js");
            const pressure = contextChainEngine.estimatePressure(params.tokens_used || 0);
            result = contextChainEngine.planCompaction(
              pressure,
              params.active_task || "",
              params.build_status || "unknown",
              params.critical_facts || [],
            );
            break;
          }
          case "context_health": {
            const { contextChainEngine } = await import("../../engines/ContextChainEngine.js");
            result = contextChainEngine.getHealthReport(
              params.memory_lines || 0,
              params.tokens_used || 0,
              params.active_bundles,
              params.bundle_cost,
            );
            break;
          }

          // ── Speed/Feed Autopilot (ACP-MS4) ────────────────────
          case "sf_autopilot_run": {
            const { speedFeedAutopilotEngine } = await import("../../engines/SpeedFeedAutopilotEngine.js");
            result = speedFeedAutopilotEngine.run(params as any);
            break;
          }
          case "sf_autopilot_resolve_material": {
            const { speedFeedAutopilotEngine } = await import("../../engines/SpeedFeedAutopilotEngine.js");
            result = speedFeedAutopilotEngine.resolveMaterial(params.material || "", params.hardness_hrc);
            break;
          }
          case "sf_autopilot_resolve_tool": {
            const { speedFeedAutopilotEngine } = await import("../../engines/SpeedFeedAutopilotEngine.js");
            result = speedFeedAutopilotEngine.resolveTool(params.diameter_mm || 12, params.flute_count, params.operation);
            break;
          }

          // ── Post Processor Autopilot (ACP-MS5) ────────────────
          case "pp_autopilot_run": {
            const { postProcessorAutopilotEngine } = await import("../../engines/PostProcessorAutopilotEngine.js");
            result = postProcessorAutopilotEngine.runPPG(params as any);
            break;
          }
          case "pp_autopilot_resolve_dialect": {
            const { postProcessorAutopilotEngine } = await import("../../engines/PostProcessorAutopilotEngine.js");
            result = postProcessorAutopilotEngine.resolveDialect(params.controller || "");
            break;
          }
          case "pp_autopilot_print_to_program": {
            const { postProcessorAutopilotEngine } = await import("../../engines/PostProcessorAutopilotEngine.js");
            result = postProcessorAutopilotEngine.runPrintToProgram(params as any);
            break;
          }

          // ── Quote Autopilot (ACP-MS6) ─────────────────────────
          case "quote_autopilot_run": {
            const { quoteAutopilotEngine } = await import("../../engines/QuoteAutopilotEngine.js");
            result = quoteAutopilotEngine.generateQuote(params as any);
            break;
          }
          case "quote_autopilot_calibrate": {
            const { quoteAutopilotEngine } = await import("../../engines/QuoteAutopilotEngine.js");
            result = quoteAutopilotEngine.computeCalibration();
            break;
          }
          case "quote_autopilot_record_actual": {
            const { quoteAutopilotEngine } = await import("../../engines/QuoteAutopilotEngine.js");
            quoteAutopilotEngine.recordActual(params.part_name || "", params.actual_cycle_time_min || 0);
            result = { recorded: true, part_name: params.part_name };
            break;
          }

          // ── Capability Census (MXU-MS0) ────────────────────────
          case "capability_census": {
            const { capabilityCensusEngine } = await import("../../engines/CapabilityCensusEngine.js");
            result = capabilityCensusEngine.runLiveCensus();
            break;
          }
          case "capability_census_report": {
            const { capabilityCensusEngine } = await import("../../engines/CapabilityCensusEngine.js");
            result = capabilityCensusEngine.runLiveReport();
            break;
          }
          case "capability_census_save": {
            const { capabilityCensusEngine } = await import("../../engines/CapabilityCensusEngine.js");
            const outputPath = params.output_path || path.join(STATE_DIR, "CAPABILITY_CENSUS.json");
            result = capabilityCensusEngine.saveCensus(outputPath);
            break;
          }

          // ── Coding Copilot (MXU-MS1) ──────────────────────────
          case "copilot_suggest": {
            const { codingCopilotEngine } = await import("../../engines/CodingCopilotEngine.js");
            result = codingCopilotEngine.suggest(params.task_description || "", params.proposed_name, params.existing_engines || []);
            break;
          }
          case "copilot_check_duplication": {
            const { codingCopilotEngine } = await import("../../engines/CodingCopilotEngine.js");
            result = codingCopilotEngine.checkDuplication(params.name || "", params.capabilities || [], params.existing_engines || []);
            break;
          }
          case "copilot_template": {
            const { codingCopilotEngine } = await import("../../engines/CodingCopilotEngine.js");
            result = codingCopilotEngine.generateTemplate(params.name || "New", params.domain || "general", params.capabilities || []);
            break;
          }

          // ── Token Economy (MXU-MS2) ────────────────────────────
          case "token_budget": {
            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
            const tracker = new TokenEconomyTrackerEngine();
            result = tracker.getBudgetStatus();
            break;
          }
          case "token_record_spending": {
            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
            const tracker = new TokenEconomyTrackerEngine();
            result = tracker.recordSpend({
              sessionId: params.session_id || "unknown",
              operation: params.operation || "other",
              inputTokens: params.input_tokens || 0,
              outputTokens: params.output_tokens || 0,
              model: params.model || "unknown",
              tool: params.tool,
              file: params.file,
              savingsSource: params.savings_source,
            });
            break;
          }
          case "token_detect_waste": {
            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
            const tracker = new TokenEconomyTrackerEngine();
            const stats = tracker.getStats();
            const report = tracker.generateReport("day");
            result = {
              wastePatterns: report.topWastePatterns,
              recommendations: report.recommendations,
              efficiency: stats.avgEfficiency,
            };
            break;
          }
          case "token_economy_report": {
            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
            const tracker = new TokenEconomyTrackerEngine();
            result = tracker.generateReport(params.period || "day");
            break;
          }
          case "token_economy_stats": {
            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
            const tracker = new TokenEconomyTrackerEngine();
            result = tracker.getStats();
            break;
          }
          case "token_economy_session": {
            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
            const tracker = new TokenEconomyTrackerEngine();
            result = tracker.getSessionSummary(params.session_id || "");
            break;
          }
          case "token_economy_set_budget": {
            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
            const tracker = new TokenEconomyTrackerEngine();
            tracker.setBudget(params.daily, params.weekly);
            result = { success: true, budget: tracker.getBudgetStatus() };
            break;
          }
          case "token_economy_reset": {
            const { TokenEconomyTrackerEngine } = await import("../../engines/TokenEconomyTrackerEngine.js");
            const tracker = new TokenEconomyTrackerEngine();
            tracker.reset();
            result = { success: true, message: "Token economy state reset" };
            break;
          }

          // ── Skill Inlining / MCP-first Skill Digests ─────────────────
          case "skill_inline_record": {
            const { SkillInliningOptimizerEngine } = await import("../../engines/SkillInliningOptimizerEngine.js");
            const optimizer = new SkillInliningOptimizerEngine(params.token_budget);
            optimizer.recordUsage(
              String(params.skill_id || params.skill || ""),
              Number(params.tokens_saved || 0),
              params.success !== false
            );
            result = { success: true, stats: optimizer.getStats(String(params.skill_id || params.skill || "")) };
            break;
          }
          case "skill_inline_decision": {
            const { SkillInliningOptimizerEngine } = await import("../../engines/SkillInliningOptimizerEngine.js");
            const optimizer = new SkillInliningOptimizerEngine(params.token_budget);
            result = optimizer.shouldInline(String(params.skill_id || params.skill || ""));
            break;
          }
          case "skill_inline_plan": {
            const { SkillInliningOptimizerEngine } = await import("../../engines/SkillInliningOptimizerEngine.js");
            const optimizer = new SkillInliningOptimizerEngine(params.token_budget);
            result = optimizer.computeInliningPlan(params.available_budget);
            break;
          }
          case "skill_inline_content": {
            const { SkillInliningOptimizerEngine } = await import("../../engines/SkillInliningOptimizerEngine.js");
            const optimizer = new SkillInliningOptimizerEngine(params.token_budget);
            if (params.skill_id || params.skill) {
              result = {
                skillId: String(params.skill_id || params.skill),
                digest: optimizer.generateDigest(String(params.skill_id || params.skill)),
              };
            } else {
              optimizer.computeInliningPlan(params.available_budget);
              result = optimizer.getInlinedContent();
            }
            break;
          }
          case "skill_inline_format": {
            const { SkillInliningOptimizerEngine } = await import("../../engines/SkillInliningOptimizerEngine.js");
            const optimizer = new SkillInliningOptimizerEngine(params.token_budget);
            result = { content: optimizer.formatForInjection() };
            break;
          }
          case "skill_inline_top": {
            const { SkillInliningOptimizerEngine } = await import("../../engines/SkillInliningOptimizerEngine.js");
            const optimizer = new SkillInliningOptimizerEngine(params.token_budget);
            result = optimizer.getTopSkills(params.limit || 5);
            break;
          }
          case "skill_inline_clear": {
            const { SkillInliningOptimizerEngine } = await import("../../engines/SkillInliningOptimizerEngine.js");
            const optimizer = new SkillInliningOptimizerEngine(params.token_budget);
            optimizer.clearStats();
            result = { success: true, message: "Skill inlining stats cleared" };
            break;
          }

          // ── Skill Quality: registry + three-scenario test (SKILLS-UTILIZATION-MS0) ──
          case "skill_quality_registry_build": {
            // U-SKU06 deferred dispatcher wiring: (re)generate SKILL_QUALITY_REGISTRY.json.
            const { buildSkillQualityRegistry } = await import("../../registries/SkillQualityRegistryBuilder.js");
            result = await buildSkillQualityRegistry({
              write: params.write !== false,
              skipUserRoots: params.skip_user_roots === true,
              ...(typeof params.out_path === "string" ? { outPath: params.out_path } : {}),
              ...(Array.isArray(params.roots) ? { roots: params.roots } : {}),
            });
            break;
          }
          case "skill_quality_registry_read": {
            const { skillQualityRegistryBuilder, SKILL_QUALITY_REGISTRY_PATH } = await import("../../registries/SkillQualityRegistryBuilder.js");
            const reg = await skillQualityRegistryBuilder.read(typeof params.path === "string" ? params.path : undefined);
            if (!reg) {
              result = { found: false, registryPath: SKILL_QUALITY_REGISTRY_PATH, hint: "run prism_dev:skill_quality_registry_build first" };
            } else if (params.skill) {
              const matches = reg.skills.filter((s: any) => s.name === String(params.skill));
              result = { found: matches.length > 0, registryPath: SKILL_QUALITY_REGISTRY_PATH, schemaVersion: reg.schemaVersion, generatedAt: reg.generatedAt, matches };
            } else {
              result = {
                found: true,
                registryPath: SKILL_QUALITY_REGISTRY_PATH,
                schemaVersion: reg.schemaVersion,
                generatedAt: reg.generatedAt,
                total: reg.total,
                byTier: reg.byTier,
                parseFailures: reg.parseFailures,
                production_grade_count: reg.skills.filter((s: any) => s.quality?.production_grade).length,
                with_scenario_tests: reg.skills.filter((s: any) => s.quality?.scenario_tests && (s.quality.scenario_tests.happy !== null || s.quality.scenario_tests.edge !== null || s.quality.scenario_tests.stress !== null)).length,
              };
            }
            break;
          }
          case "skill_test": {
            // U-SKU02: three-scenario protocol. Without `outputs`, returns the loaded fixtures so the
            // caller (the /skill-test slash command, which runs in the agent loop) can invoke the skill.
            const { skillScenarioTestEngine } = await import("../../engines/SkillScenarioTestEngine.js");
            const skill = String(params.skill || params.skill_name || "").trim();
            if (!skill) {
              result = { error: "params.skill is required (the skill name to test, e.g. 'de-sloppify')" };
              break;
            }
            const scenario = ["happy", "edge", "stress", "all"].includes(String(params.scenario)) ? (String(params.scenario) as any) : "all";
            const outputs = params.outputs && typeof params.outputs === "object" && !Array.isArray(params.outputs) ? (params.outputs as Record<string, string>) : undefined;
            result = await skillScenarioTestEngine.run(skill, outputs, scenario, {
              persist: params.persist !== false,
              ...(typeof params.registry_path === "string" ? { registryPath: params.registry_path } : {}),
              ...(Array.isArray(params.fixture_roots) ? { fixtureRoots: params.fixture_roots.map((r: any) => String(r)) } : {}),
            });
            break;
          }
          case "skill_audit": {
            // U-SKU05: grade the whole skill library (production_grade / needs_refinement / stub_or_orphan)
            // from SKILL_QUALITY_REGISTRY.json + skill-lint-report.json. Read-only — the dated .md/.json
            // scorecard artifacts are written by `scripts/skill-library-audit.mjs` / the monthly cron, not here.
            const { skillLibraryAuditEngine } = await import("../../engines/SkillLibraryAuditEngine.js");
            const r = skillLibraryAuditEngine.audit({
              ...(typeof params.from === "string" ? { registryPath: params.from } : (typeof params.registry_path === "string" ? { registryPath: params.registry_path } : {})),
              ...(typeof params.lint === "string" ? { lintReportPath: params.lint } : (typeof params.lint_report_path === "string" ? { lintReportPath: params.lint_report_path } : {})),
              ...(typeof params.top_n === "number" ? { topN: params.top_n } : {}),
              ...(params.reread_frontmatter === false ? { rereadFrontmatter: false } : {}),
              ...(params.probe_scenario_dirs === false ? { probeScenarioDirs: false } : {}),
            });
            // Default: return the structured result minus the (large) per-skill array. Pass full=true for everything,
            // markdown=true to also get the rendered scorecard.
            if (params.full === true) {
              result = r;
            } else {
              const summary: Record<string, unknown> = {};
              for (const [k, v] of Object.entries(r)) if (k !== "skills") summary[k] = v;
              summary.perSkillCount = r.skills.length;
              summary.gapListTop = r.gapList.slice(0, typeof params.gap_top === "number" ? params.gap_top : 25);
              result = summary;
            }
            if (params.markdown === true) (result as Record<string, unknown>).markdown = skillLibraryAuditEngine.renderMarkdown(r);
            break;
          }
          case "skill_refinement_digest": {
            // U-SKU04: the weekly "Friday review" digest — surfaces skills wanting attention (linter-flagged /
            // stale / output-overridden). Read-only; the dated state/shared/skill-refinement-digest-<date>.{md,json}
            // artifacts + the chat-bus push are the CLI's / the weekly cron's job (write=true here writes them too).
            const { skillRefinementDigestEngine } = await import("../../engines/SkillRefinementDigestEngine.js");
            const d = skillRefinementDigestEngine.digest({
              ...(typeof params.registry_path === "string" ? { registryPath: params.registry_path } : {}),
              ...(typeof params.lint_report_path === "string" ? { lintReportPath: params.lint_report_path } : {}),
              ...(typeof params.audit_path === "string" ? { auditPath: params.audit_path } : {}),
              ...(typeof params.telemetry_events_path === "string" ? { telemetryEventsPath: params.telemetry_events_path } : {}),
              ...(typeof params.per_category_cap === "number" ? { perCategoryCap: params.per_category_cap } : {}),
            });
            if (params.write === true) {
              const fsMod = await import("node:fs"); const pathMod = await import("node:path");
              const { SKILL_REFINEMENT_DIGEST_DIR } = await import("../../engines/SkillRefinementDigestEngine.js");
              const dateLabel = d.generatedAt.slice(0, 10);
              fsMod.mkdirSync(SKILL_REFINEMENT_DIGEST_DIR, { recursive: true });
              fsMod.writeFileSync(pathMod.join(SKILL_REFINEMENT_DIGEST_DIR, `skill-refinement-digest-${dateLabel}.json`), JSON.stringify(d, null, 2) + "\n", "utf-8");
              fsMod.writeFileSync(pathMod.join(SKILL_REFINEMENT_DIGEST_DIR, `skill-refinement-digest-${dateLabel}.md`), skillRefinementDigestEngine.renderMarkdown(d, { dateLabel }), "utf-8");
            }
            // Default: a FLAT summary (the shared response-slimmer drops empty-array keys, so `categories` would
            // round-trip as `{}` — return per-category COUNTS as numbers + the spotlight instead). full=true → the
            // whole digest; markdown=true → also the rendered report.
            if (params.full === true) {
              result = d;
            } else {
              result = {
                schemaVersion: d.schemaVersion, generatedAt: d.generatedAt, weekLabel: d.weekLabel, totalSkills: d.totalSkills,
                actionableCount: d.actionableCount, allHealthy: d.allHealthy, telemetryAvailable: d.telemetryAvailable,
                counts: { output_overridden: d.categories.output_overridden.length, stale_but_hot: d.categories.stale_but_hot.length, linter_flagged: d.categories.linter_flagged.length },
                topByCategory: { output_overridden: d.categories.output_overridden.slice(0, 8), stale_but_hot: d.categories.stale_but_hot.slice(0, 8), linter_flagged: d.categories.linter_flagged.slice(0, 8) },
                spotlight: d.spotlight, caps: d.caps, uncommittedNote: d.uncommittedNote, advisories: d.advisories, sources: d.sources,
              };
            }
            if (params.markdown === true) (result as Record<string, unknown>).markdown = skillRefinementDigestEngine.renderMarkdown(d);
            break;
          }

          // ── Output Cache (Token Savings) ────────────────────────────
          case "output_cache_store": {
            const { OutputCacheEngine } = await import("../../engines/OutputCacheEngine.js");
            const cache = new OutputCacheEngine();
            const block = cache.store(params.content || "", params.category);
            result = block ? { success: true, block, reference: cache.getReference(block) } : { success: false, reason: "Content too short or too long" };
            break;
          }
          case "output_cache_get": {
            const { OutputCacheEngine } = await import("../../engines/OutputCacheEngine.js");
            const cache = new OutputCacheEngine();
            const block = cache.get(params.id || params.hash || "");
            result = block ? { success: true, block } : { success: false, reason: "Block not found" };
            break;
          }
          case "output_cache_find": {
            const { OutputCacheEngine } = await import("../../engines/OutputCacheEngine.js");
            const cache = new OutputCacheEngine();
            result = cache.find({ category: params.category, hashPrefix: params.hash_prefix, limit: params.limit });
            break;
          }
          case "output_cache_stats": {
            const { OutputCacheEngine } = await import("../../engines/OutputCacheEngine.js");
            const cache = new OutputCacheEngine();
            result = cache.getStats();
            break;
          }
          case "output_cache_reset": {
            const { OutputCacheEngine } = await import("../../engines/OutputCacheEngine.js");
            const cache = new OutputCacheEngine();
            cache.reset();
            result = { success: true, message: "Output cache cleared" };
            break;
          }

          // ── Compaction Survival ────────────────────────────
          case "compaction_survival_record": {
            const { CompactionSurvivalEngine } = await import("../../engines/CompactionSurvivalEngine.js");
            const survival = new CompactionSurvivalEngine();
            result = survival.record(params.type || "discovery", params.content || "", {
              priority: params.priority,
              references: params.references,
            });
            break;
          }
          case "compaction_survival_plan": {
            const { CompactionSurvivalEngine } = await import("../../engines/CompactionSurvivalEngine.js");
            const survival = new CompactionSurvivalEngine();
            result = survival.planSurvival(params.target_tokens || 2000);
            break;
          }
          case "compaction_survival_handoff": {
            const { CompactionSurvivalEngine } = await import("../../engines/CompactionSurvivalEngine.js");
            const survival = new CompactionSurvivalEngine();
            result = { handoff: survival.generateHandoff(params.target_tokens || 2000) };
            break;
          }
          case "compaction_survival_stats": {
            const { CompactionSurvivalEngine } = await import("../../engines/CompactionSurvivalEngine.js");
            const survival = new CompactionSurvivalEngine();
            result = survival.getStats();
            break;
          }

          // ── Persistent Memory (MXU-MS3) ────────────────────────
          case "memory_store": {
            const { persistentMemoryEngine } = await import("../../engines/PersistentMemoryEngine.js");
            result = persistentMemoryEngine.store(params.type || "learning", params.domain || "general", params.tags || [], params.content || "", params.metadata || {}, params.session_id);
            break;
          }
          case "memory_search": {
            const { persistentMemoryEngine } = await import("../../engines/PersistentMemoryEngine.js");
            result = persistentMemoryEngine.search(params);
            break;
          }
          case "memory_stats": {
            const { persistentMemoryEngine } = await import("../../engines/PersistentMemoryEngine.js");
            result = persistentMemoryEngine.getStats();
            break;
          }
          case "memory_record_learning": {
            const { persistentMemoryEngine } = await import("../../engines/PersistentMemoryEngine.js");
            result = persistentMemoryEngine.recordLearning(params as any);
            break;
          }
          case "memory_set_preference": {
            const { persistentMemoryEngine } = await import("../../engines/PersistentMemoryEngine.js");
            result = persistentMemoryEngine.setPreference(params as any);
            break;
          }
          case "memory_get_preference": {
            const { persistentMemoryEngine } = await import("../../engines/PersistentMemoryEngine.js");
            result = { key: params.key, value: persistentMemoryEngine.getPreference(params.key || "") };
            break;
          }

          // ── Capability Paths (MXU-MS4) ─────────────────────────
          case "capability_path_list": {
            const { capabilityPathEngine } = await import("../../engines/CapabilityPathEngine.js");
            result = capabilityPathEngine.listPaths();
            break;
          }
          case "capability_path_progress": {
            const { capabilityPathEngine } = await import("../../engines/CapabilityPathEngine.js");
            result = params.path_id
              ? capabilityPathEngine.getProgress(params.path_id, params.completed || [])
              : capabilityPathEngine.getAllProgress(params.completed || []);
            break;
          }
          case "capability_path_suggest": {
            const { capabilityPathEngine } = await import("../../engines/CapabilityPathEngine.js");
            result = capabilityPathEngine.suggestNext(params.completed || [], params.domain);
            break;
          }

          // ── Workflow Orchestration (MXU-MS5) ───────────────────
          case "workflow_list": {
            const { workflowOrchestrationEngine } = await import("../../engines/WorkflowOrchestrationEngine.js");
            result = workflowOrchestrationEngine.listWorkflows();
            break;
          }
          case "workflow_plan": {
            const { workflowOrchestrationEngine } = await import("../../engines/WorkflowOrchestrationEngine.js");
            const wf = workflowOrchestrationEngine.getWorkflow(params.workflow_id || "");
            result = wf ? workflowOrchestrationEngine.planExecution(wf) : { error: "Workflow not found" };
            break;
          }
          case "workflow_create": {
            const { workflowOrchestrationEngine } = await import("../../engines/WorkflowOrchestrationEngine.js");
            result = workflowOrchestrationEngine.createWorkflow(params.name || "custom", params.steps || [], params.strategy || "serial", params.max_parallel || 3);
            break;
          }

          // ── Product Pillars (MXU-MS6) ──────────────────────────
          case "pillar_list": {
            const { productPillarEngine } = await import("../../engines/ProductPillarEngine.js");
            result = productPillarEngine.listPillars();
            break;
          }
          case "pillar_score": {
            const { productPillarEngine } = await import("../../engines/ProductPillarEngine.js");
            result = productPillarEngine.scorePillar(params.pillar_id || "calculator", new Set(params.wired_engines || []), new Set(params.active_skills || []));
            break;
          }
          case "pillar_summary": {
            const { productPillarEngine } = await import("../../engines/ProductPillarEngine.js");
            result = productPillarEngine.getSummary(new Set(params.wired_engines || []), new Set(params.active_skills || []));
            break;
          }
          case "pillar_gate": {
            const { productPillarEngine } = await import("../../engines/ProductPillarEngine.js");
            result = productPillarEngine.checkGate(params.pillar_id || "calculator", params.tier || "free");
            break;
          }

          // ── Discoverability (MXU-MS7) ──────────────────────────
          case "discover_search": {
            const { discoverabilityEngine } = await import("../../engines/DiscoverabilityEngine.js");
            result = discoverabilityEngine.search(params.query || "", params.limit || 10);
            break;
          }
          case "discover_browse": {
            const { discoverabilityEngine } = await import("../../engines/DiscoverabilityEngine.js");
            result = params.domain ? discoverabilityEngine.browse(params.domain) : discoverabilityEngine.listDomains();
            break;
          }
          case "discover_recommend": {
            const { discoverabilityEngine } = await import("../../engines/DiscoverabilityEngine.js");
            result = discoverabilityEngine.recommend(params.used_capabilities || [], params.limit || 5);
            break;
          }
          case "discover_what_can_i_do": {
            const { discoverabilityEngine } = await import("../../engines/DiscoverabilityEngine.js");
            result = discoverabilityEngine.whatCanIDo(params.question || "");
            break;
          }

          // ── Effectiveness (MXU-MS9+10) ─────────────────────────
          case "effectiveness_report": {
            const { capabilityEffectivenessEngine } = await import("../../engines/CapabilityEffectivenessEngine.js");
            result = capabilityEffectivenessEngine.generateReport(params.capability_ids || []);
            break;
          }
          case "effectiveness_score": {
            const { capabilityEffectivenessEngine } = await import("../../engines/CapabilityEffectivenessEngine.js");
            result = capabilityEffectivenessEngine.scoreCapability(params.capability_id || "");
            break;
          }
          case "effectiveness_record": {
            const { capabilityEffectivenessEngine } = await import("../../engines/CapabilityEffectivenessEngine.js");
            capabilityEffectivenessEngine.recordUsage(params as any);
            result = { recorded: true };
            break;
          }
          case "effectiveness_validate": {
            const { capabilityEffectivenessEngine } = await import("../../engines/CapabilityEffectivenessEngine.js");
            result = capabilityEffectivenessEngine.getValidationTests();
            break;
          }

          case "self_awareness_refresh": {
            const { refreshSelfAwareness } = await import("../../engines/PRISMSelfAwarenessEngine.js");
            result = await refreshSelfAwareness();
            break;
          }

          case "self_awareness_manifest": {
            const { prismSelfAwarenessEngine } = await import("../../engines/PRISMSelfAwarenessEngine.js");
            result = await prismSelfAwarenessEngine.getManifest();
            break;
          }

          case "self_awareness_gaps": {
            const { prismSelfAwarenessEngine } = await import("../../engines/PRISMSelfAwarenessEngine.js");
            const query = params.query || params.q || "";
            result = await prismSelfAwarenessEngine.analyzeGaps(query);
            break;
          }

          case "self_awareness_recommend": {
            const { prismSelfAwarenessEngine } = await import("../../engines/PRISMSelfAwarenessEngine.js");
            const task = params.task || params.t || "";
            result = await prismSelfAwarenessEngine.recommendAIFeatures(task);
            break;
          }

          case "self_awareness_find": {
            const { prismSelfAwarenessEngine } = await import("../../engines/PRISMSelfAwarenessEngine.js");
            const query = params.query || params.q || "";
            result = await prismSelfAwarenessEngine.findCapabilities(query);
            break;
          }

          case "edit_impact_build_graph": {
            const { editImpactPredictorEngine } = await import("../../engines/EditImpactPredictorEngine.js");
            const srcRoot = params.srcRoot || params.src_root || SRC_DIR;
            const nodeCount = await editImpactPredictorEngine.buildGraph(srcRoot);
            const stats = editImpactPredictorEngine.getGraphStats();
            result = { success: true, nodeCount, ...stats };
            break;
          }

          case "edit_impact_predict": {
            const { editImpactPredictorEngine } = await import("../../engines/EditImpactPredictorEngine.js");
            const filePath = params.filePath || params.file_path || params.path;
            if (!filePath) {
              result = { error: "missing_param", message: "filePath is required" };
              break;
            }
            if (!editImpactPredictorEngine.isGraphFresh()) {
              await editImpactPredictorEngine.buildGraph(SRC_DIR);
            }
            result = await editImpactPredictorEngine.predict(filePath);
            break;
          }

          case "edit_impact_stats": {
            const { editImpactPredictorEngine } = await import("../../engines/EditImpactPredictorEngine.js");
            const stats = editImpactPredictorEngine.getGraphStats();
            const fresh = editImpactPredictorEngine.isGraphFresh();
            result = { success: true, ...stats, graphFresh: fresh };
            break;
          }

          // ── Tool Call Parallelization ───────────────────────
          case "tool_call_record": {
            const { toolCallParallelizationEngine } = await import("../../engines/ToolCallParallelizationEngine.js");
            const record = toolCallParallelizationEngine.recordCall(
              params.tool || "Other",
              params.inputs || {},
              {
                inParallelBatch: params.in_parallel_batch ?? params.inParallelBatch ?? false,
                tokenCost: params.token_cost ?? params.tokenCost,
              }
            );
            result = { success: true, record };
            break;
          }
          case "tool_call_analyze": {
            const { toolCallParallelizationEngine } = await import("../../engines/ToolCallParallelizationEngine.js");
            result = { success: true, report: toolCallParallelizationEngine.analyze() };
            break;
          }
          case "tool_call_reset": {
            const { toolCallParallelizationEngine } = await import("../../engines/ToolCallParallelizationEngine.js");
            toolCallParallelizationEngine.reset();
            result = { success: true, reset: true };
            break;
          }

          // ── Stop Condition Engine ───────────────────────────
          case "stop_condition_evaluate": {
            const { stopConditionEngine } = await import("../../engines/StopConditionEngine.js");
            const ctx = buildStopCtx(params.ctx);
            const evaluation = stopConditionEngine.evaluate(
              String(params.tool || ""),
              (params.params || {}) as Record<string, unknown>,
              ctx,
            );
            result = { success: true, evaluation, ctx };
            break;
          }
          case "stop_condition_should_block": {
            const { stopConditionEngine } = await import("../../engines/StopConditionEngine.js");
            const ctx = buildStopCtx(params.ctx);
            // Call evaluate() once — shouldBlock() is just `evaluate().decision === "block"`,
            // so deriving `blocked` from the evaluation avoids traversing all rules twice.
            const evaluation = stopConditionEngine.evaluate(
              String(params.tool || ""),
              (params.params || {}) as Record<string, unknown>,
              ctx,
            );
            result = { success: true, blocked: evaluation.decision === "block", evaluation };
            break;
          }
          case "stop_condition_evaluate_all": {
            const { stopConditionEngine } = await import("../../engines/StopConditionEngine.js");
            const ctx = buildStopCtx(params.ctx);
            const evaluations = stopConditionEngine.evaluateAll(
              String(params.tool || ""),
              (params.params || {}) as Record<string, unknown>,
              ctx,
            );
            result = {
              success: true,
              evaluations,
              triggeredCount: evaluations.length,
              totalSavings: stopConditionEngine.totalSavings(evaluations),
            };
            break;
          }
          case "stop_condition_rules": {
            const { stopConditionEngine } = await import("../../engines/StopConditionEngine.js");
            const rules = stopConditionEngine.getRuleNames();
            result = { success: true, rules, ruleCount: rules.length };
            break;
          }

          // ── File Read Deduplication ─────────────────────────
          case "file_read_record": {
            const { fileReadDeduplicationEngine } = await import("../../engines/FileReadDeduplicationEngine.js");
            const out = fileReadDeduplicationEngine.recordRead(
              String(params.path || ""),
              String(params.content || ""),
              {
                offset: params.offset,
                limit: params.limit,
                mtimeMs: params.mtime_ms ?? params.mtimeMs,
              }
            );
            result = { success: true, record: out.record, redundant: out.redundant };
            break;
          }
          case "file_read_should_skip": {
            const { fileReadDeduplicationEngine } = await import("../../engines/FileReadDeduplicationEngine.js");
            result = {
              success: true,
              ...fileReadDeduplicationEngine.shouldSkip(String(params.path || ""), {
                offset: params.offset,
                limit: params.limit,
                currentMtimeMs: params.current_mtime_ms ?? params.currentMtimeMs,
              }),
            };
            break;
          }
          case "file_read_report": {
            const { fileReadDeduplicationEngine } = await import("../../engines/FileReadDeduplicationEngine.js");
            result = { success: true, report: fileReadDeduplicationEngine.report() };
            break;
          }

          // ── Conversation Stale Detector ─────────────────────
          case "stale_segment_record": {
            const { conversationStaleDetectorEngine } = await import("../../engines/ConversationStaleDetectorEngine.js");
            const segment = conversationStaleDetectorEngine.recordSegment(
              params.type || "user_message",
              String(params.text || ""),
              { status: params.status, resolves: params.resolves }
            );
            result = { success: true, segment };
            break;
          }
          case "stale_segment_prune": {
            const { conversationStaleDetectorEngine } = await import("../../engines/ConversationStaleDetectorEngine.js");
            result = { success: true, report: conversationStaleDetectorEngine.prune() };
            break;
          }
          case "stale_segment_mark": {
            const { conversationStaleDetectorEngine } = await import("../../engines/ConversationStaleDetectorEngine.js");
            const ok = conversationStaleDetectorEngine.markStatus(
              String(params.segment_id || params.segmentId || ""),
              params.status
            );
            result = { success: ok, marked: ok };
            break;
          }

          // ── Session Reorientation ───────────────────────────
          // ── U-FORE-01 Change Impact Radius ───────────────────
          case "change_radius_predict": {
            const { changeImpactRadiusEngine } = await import(
              "../../engines/ChangeImpactRadiusEngine.js"
            );
            const report = await changeImpactRadiusEngine.predictBlastRadius({
              filePath: String(params.file_path || params.filePath || ""),
              changeKind: (params.change_kind || params.changeKind || "edit") as any,
              maxDepth: typeof params.max_depth === "number"
                ? params.max_depth
                : typeof params.maxDepth === "number"
                  ? params.maxDepth
                  : undefined,
            });
            result = { success: true, report };
            break;
          }
          case "change_radius_predict_sync": {
            const { changeImpactRadiusEngine } = await import(
              "../../engines/ChangeImpactRadiusEngine.js"
            );
            const report = changeImpactRadiusEngine.predictBlastRadiusSync({
              filePath: String(params.file_path || params.filePath || ""),
              changeKind: (params.change_kind || params.changeKind || "edit") as any,
              maxDepth: typeof params.max_depth === "number"
                ? params.max_depth
                : typeof params.maxDepth === "number"
                  ? params.maxDepth
                  : undefined,
            });
            result = { success: true, report };
            break;
          }

          // ── U-FORE-02 Build Planner ─────────────────────────
          case "build_plan": {
            const { buildPlannerEngine } = await import(
              "../../engines/BuildPlannerEngine.js"
            );
            const plan = await buildPlannerEngine.plan(
              String(params.unit_id || params.unitId || "")
            );
            result = { success: true, plan };
            break;
          }
          case "build_plan_from_unit": {
            const { buildPlannerEngine } = await import(
              "../../engines/BuildPlannerEngine.js"
            );
            const plan = buildPlannerEngine.planFromUnit(params.unit as any);
            result = { success: true, plan };
            break;
          }
          case "step_decompose": {
            const { atomicStepDecomposerEngine } = await import(
              "../../engines/AtomicStepDecomposerEngine.js"
            );
            const steps = atomicStepDecomposerEngine.decompose(params.unit as any);
            result = { success: true, steps };
            break;
          }
          case "gap_predict": {
            const { gapPredictorEngine } = await import(
              "../../engines/GapPredictorEngine.js"
            );
            const report = gapPredictorEngine.scan(params.artifact as any);
            result = { success: true, report };
            break;
          }
          case "gap_scan_file": {
            const { gapPredictorEngine } = await import(
              "../../engines/GapPredictorEngine.js"
            );
            const report = gapPredictorEngine.scanFile(
              String(params.filePath),
              {
                siblings: params.siblings as string[] | undefined,
                dispatcherPath: params.dispatcherPath as string | undefined,
              }
            );
            result = { success: true, report };
            break;
          }
          case "gap_scan_batch": {
            const { gapPredictorEngine } = await import(
              "../../engines/GapPredictorEngine.js"
            );
            const report = gapPredictorEngine.scanBatch(params.artifacts as any);
            result = { success: true, report };
            break;
          }
          case "user_model_get": {
            const { userModelEngine } = await import(
              "../../engines/UserModelEngine.js"
            );
            result = { success: true, model: userModelEngine.load() };
            break;
          }
          case "user_model_set_experience": {
            const { userModelEngine } = await import(
              "../../engines/UserModelEngine.js"
            );
            const model = userModelEngine.setExperience(params.level as any);
            result = { success: true, model };
            break;
          }
          case "user_model_record_edit": {
            const { userModelEngine } = await import(
              "../../engines/UserModelEngine.js"
            );
            const model = userModelEngine.recordEdit(
              String(params.kind || "unknown"),
              (params.outcome as any) || "ok"
            );
            result = { success: true, model };
            break;
          }
          case "user_model_reset": {
            const { userModelEngine } = await import(
              "../../engines/UserModelEngine.js"
            );
            result = { success: true, model: userModelEngine.reset() };
            break;
          }
          case "coder_mode_current": {
            const { newCoderModeEngine } = await import(
              "../../engines/NewCoderModeEngine.js"
            );
            result = { success: true, profile: newCoderModeEngine.currentProfile() };
            break;
          }
          case "coder_mode_set": {
            const { newCoderModeEngine } = await import(
              "../../engines/NewCoderModeEngine.js"
            );
            const profile = newCoderModeEngine.setMode(params.level as any);
            result = { success: true, profile };
            break;
          }
          case "coder_mode_should_surface": {
            const { newCoderModeEngine } = await import(
              "../../engines/NewCoderModeEngine.js"
            );
            const surface = newCoderModeEngine.shouldSurface(
              params.severity as 1 | 2 | 3 | 4 | 5
            );
            result = { success: true, surface };
            break;
          }
          case "build_advise": {
            const { buildAdvisorEngine } = await import(
              "../../engines/BuildAdvisorEngine.js"
            );
            const advice = buildAdvisorEngine.adviseFor(params.input as any);
            result = { success: true, advice };
            break;
          }
          case "build_debrief": {
            const { buildDebriefEngine } = await import(
              "../../engines/BuildDebriefEngine.js"
            );
            const debrief = buildDebriefEngine.debriefFor(params.input as any);
            const rendered = buildDebriefEngine.render(debrief);
            result = { success: true, debrief, rendered };
            break;
          }
          case "build_debrief_recent": {
            const { buildDebriefEngine } = await import(
              "../../engines/BuildDebriefEngine.js"
            );
            const recent = buildDebriefEngine.recent(
              typeof params.limit === "number" ? params.limit : 5
            );
            result = { success: true, recent };
            break;
          }
          case "simulate_build": {
            const { counterfactualBuildSimulatorEngine } = await import(
              "../../engines/CounterfactualBuildSimulatorEngine.js"
            );
            const report = counterfactualBuildSimulatorEngine.simulate(
              params.plan as any
            );
            const summary = counterfactualBuildSimulatorEngine.summarize(report);
            result = { success: true, report, summary };
            break;
          }
          case "overlay_preview": {
            const { InMemoryFileOverlayEngine } = await import(
              "../../engines/InMemoryFileOverlayEngine.js"
            );
            const overlay = new InMemoryFileOverlayEngine();
            const planned = (params.plannedContent as Record<string, string>) || {};
            for (const [p, content] of Object.entries(planned)) {
              overlay.write(p, content);
            }
            if (Array.isArray(params.deletes)) {
              for (const d of params.deletes as string[]) overlay.delete(d);
            }
            result = {
              success: true,
              diff: overlay.diff(),
              entries: overlay.entries().map(([p, e]) => ({
                path: p,
                op: e.op,
                bytes: Buffer.byteLength(e.content ?? "", "utf-8"),
              })),
              impactedTests: overlay.impactedTestFiles(),
            };
            break;
          }
          case "risk_forecast": {
            const { riskForecastEngine } = await import(
              "../../engines/RiskForecastEngine.js"
            );
            const forecast = riskForecastEngine.forecast(params.input as any);
            const summary = riskForecastEngine.summarize(forecast);
            result = { success: true, forecast, summary };
            break;
          }
          case "risk_warnings": {
            const { riskForecastEngine } = await import(
              "../../engines/RiskForecastEngine.js"
            );
            const warnings = riskForecastEngine.warningsFor(params.input as any);
            result = { success: true, warnings };
            break;
          }
          case "risk_record_outcome": {
            const { riskForecastEngine } = await import(
              "../../engines/RiskForecastEngine.js"
            );
            riskForecastEngine.recordOutcome(
              params.forecast as any,
              params.actual as any
            );
            result = { success: true };
            break;
          }
          case "gate_history_record": {
            const { gateFailureHistoryEngine } = await import(
              "../../engines/GateFailureHistoryEngine.js"
            );
            const event = gateFailureHistoryEngine.record(params.event as any);
            result = { success: true, event };
            break;
          }
          case "gate_history_aggregates": {
            const { gateFailureHistoryEngine } = await import(
              "../../engines/GateFailureHistoryEngine.js"
            );
            const aggs = gateFailureHistoryEngine.aggregates();
            result = { success: true, aggregates: aggs };
            break;
          }
          case "gate_history_calibration": {
            const { gateFailureHistoryEngine } = await import(
              "../../engines/GateFailureHistoryEngine.js"
            );
            const calibration = gateFailureHistoryEngine.calibration();
            result = { success: true, calibration };
            break;
          }
          case "gate_history_summary": {
            const { gateFailureHistoryEngine } = await import(
              "../../engines/GateFailureHistoryEngine.js"
            );
            const summary = gateFailureHistoryEngine.summary();
            result = { success: true, summary };
            break;
          }
          case "critical_path": {
            const { criticalPathDetectorEngine } = await import(
              "../../engines/CriticalPathDetectorEngine.js"
            );
            const report = criticalPathDetectorEngine.computeCriticalPath({
              k: typeof params.k === "number" ? params.k : undefined,
              reload: params.reload === true,
              includeCompleted: params.includeCompleted === true,
            });
            result = { success: true, report };
            break;
          }
          case "critical_path_announce": {
            const { criticalPathDetectorEngine } = await import(
              "../../engines/CriticalPathDetectorEngine.js"
            );
            const report = criticalPathDetectorEngine.computeCriticalPath({
              k: typeof params.k === "number" ? params.k : undefined,
              reload: params.reload === true,
            });
            const announcement = criticalPathDetectorEngine.announce(report);
            result = { success: true, report, announcement };
            break;
          }
          case "critical_units": {
            const { criticalPathDetectorEngine } = await import(
              "../../engines/CriticalPathDetectorEngine.js"
            );
            const units = criticalPathDetectorEngine.criticalUnits({
              k: typeof params.k === "number" ? params.k : undefined,
            });
            result = { success: true, units };
            break;
          }
          case "roadmap_dag_stats": {
            const { roadmapDAGEngine } = await import(
              "../../engines/RoadmapDAGEngine.js"
            );
            if (params.reload === true) roadmapDAGEngine.reset();
            const stats = roadmapDAGEngine.stats();
            result = { success: true, stats };
            break;
          }
          case "roadmap_dag_node": {
            const { roadmapDAGEngine } = await import(
              "../../engines/RoadmapDAGEngine.js"
            );
            const node = roadmapDAGEngine.node(String(params.id));
            result = { success: true, node };
            break;
          }
          case "roadmap_dag_ancestors": {
            const { roadmapDAGEngine } = await import(
              "../../engines/RoadmapDAGEngine.js"
            );
            const ancestors = roadmapDAGEngine.ancestors(String(params.id));
            result = { success: true, ancestors };
            break;
          }
          case "roadmap_dag_descendants": {
            const { roadmapDAGEngine } = await import(
              "../../engines/RoadmapDAGEngine.js"
            );
            const descendants = roadmapDAGEngine.descendants(String(params.id));
            result = { success: true, descendants };
            break;
          }
          case "integration_foresight": {
            const { integrationForesightEngine } = await import(
              "../../engines/IntegrationForesightEngine.js"
            );
            const foresight = integrationForesightEngine.predictIntegration(
              params.spec as any
            );
            const summary = integrationForesightEngine.summarize(foresight);
            result = { success: true, foresight, summary };
            break;
          }
          case "integration_validate": {
            const { integrationForesightEngine } = await import(
              "../../engines/IntegrationForesightEngine.js"
            );
            const validation = integrationForesightEngine.validateCoverage(
              params.foresight as any,
              (params.completed as any) || []
            );
            result = { success: true, validation };
            break;
          }
          case "integration_similar": {
            const { integrationForesightEngine } = await import(
              "../../engines/IntegrationForesightEngine.js"
            );
            const matches = integrationForesightEngine.findSimilarEngines(
              params.spec as any
            );
            result = { success: true, matches };
            break;
          }
          case "context_budget_forecast": {
            const { contextBudgetForecastEngine } = await import(
              "../../engines/ContextBudgetForecastEngine.js"
            );
            const forecast = contextBudgetForecastEngine.forecast(
              params.input as any
            );
            const summary = contextBudgetForecastEngine.summarize(forecast);
            result = { success: true, forecast, summary };
            break;
          }
          case "context_should_compact": {
            const { contextBudgetForecastEngine } = await import(
              "../../engines/ContextBudgetForecastEngine.js"
            );
            const should = contextBudgetForecastEngine.shouldCompactNow(
              params.input as any
            );
            result = { success: true, shouldCompact: should };
            break;
          }
          case "rollback_plan": {
            const { rollbackPlannerEngine } = await import(
              "../../engines/RollbackPlannerEngine.js"
            );
            const plan = rollbackPlannerEngine.planRollback(
              String(params.unitId || ""),
              (params.steps as any) || []
            );
            result = { success: true, plan };
            break;
          }
          case "rollback_verify": {
            const { rollbackPlannerEngine } = await import(
              "../../engines/RollbackPlannerEngine.js"
            );
            const verified = rollbackPlannerEngine.verify(params.plan as any);
            result = { success: true, plan: verified };
            break;
          }
          case "rollback_plan_and_verify": {
            const { rollbackPlannerEngine } = await import(
              "../../engines/RollbackPlannerEngine.js"
            );
            const plan = rollbackPlannerEngine.planAndVerify(
              String(params.unitId || ""),
              (params.steps as any) || []
            );
            result = { success: true, plan };
            break;
          }
          case "rollback_render_script": {
            const { rollbackPlannerEngine } = await import(
              "../../engines/RollbackPlannerEngine.js"
            );
            const script = rollbackPlannerEngine.renderShellScript(
              params.plan as any
            );
            result = { success: true, script };
            break;
          }
          case "knowledge_gap_scan": {
            const { knowledgeGapAwarenessEngine } = await import(
              "../../engines/KnowledgeGapAwarenessEngine.js"
            );
            const report = knowledgeGapAwarenessEngine.scan(params.query as any);
            const summary = knowledgeGapAwarenessEngine.summarize(report);
            result = { success: true, report, summary };
            break;
          }
          case "knowledge_gap_check": {
            const { knowledgeGapAwarenessEngine } = await import(
              "../../engines/KnowledgeGapAwarenessEngine.js"
            );
            const hasPriorArt = knowledgeGapAwarenessEngine.hasHighRelevancePriorArt(
              params.query as any,
              typeof params.minMatches === "number" ? params.minMatches : undefined
            );
            result = { success: true, hasPriorArt };
            break;
          }
          case "no_go_respond": {
            const { teachingNoGoEngine } = await import(
              "../../engines/TeachingNoGoEngine.js"
            );
            const response = teachingNoGoEngine.respond(params.input as any);
            const compact = teachingNoGoEngine.renderCompact(response);
            result = { success: true, response, compact };
            break;
          }
          case "disclose_shape": {
            const { progressiveDisclosureEngine } = await import(
              "../../engines/ProgressiveDisclosureEngine.js"
            );
            const rendered = progressiveDisclosureEngine.shape(params.input as any);
            result = { success: true, rendered };
            break;
          }
          case "disclose_raw": {
            const { progressiveDisclosureEngine } = await import(
              "../../engines/ProgressiveDisclosureEngine.js"
            );
            const report = progressiveDisclosureEngine.disclose(params.input as any);
            result = { success: true, report };
            break;
          }
          case "anchor_claim": {
            const { anchoredConfidenceEngine } = await import(
              "../../engines/AnchoredConfidenceEngine.js"
            );
            const anchored = anchoredConfidenceEngine.anchor(
              params.claim,
              params.anchor as any
            );
            const rendered = anchoredConfidenceEngine.render(anchored, {
              showDisagreement: params.showDisagreement === true,
            });
            result = { success: true, anchored, rendered };
            break;
          }
          case "anchor_stats": {
            const { anchoredConfidenceEngine } = await import(
              "../../engines/AnchoredConfidenceEngine.js"
            );
            const stats = anchoredConfidenceEngine.recentStats();
            result = { success: true, stats };
            break;
          }

          case "error_explain": {
            const { errorExplainerEngine } = await import(
              "../../engines/ErrorExplainerEngine.js"
            );
            const explanation = errorExplainerEngine.explain({
              source: params.source || "other",
              message: String(params.message || ""),
              filePath: params.filePath,
            });
            result = { success: true, explanation };
            break;
          }

          case "error_explain_escalated": {
            // OLLAMA-DEV-02: deterministic-first, Ollama-fallback when
            // category=unknown. Falls back to the sync result when
            // Ollama is unreachable; never throws.
            const { errorExplainerEngine } = await import(
              "../../engines/ErrorExplainerEngine.js"
            );
            const explanation = await errorExplainerEngine.explainEscalated({
              source: params.source || "other",
              message: String(params.message || ""),
              filePath: params.filePath,
            });
            result = { success: true, explanation };
            break;
          }

          case "git_safety_classify": {
            const { gitSafetyEngine } = await import(
              "../../engines/GitSafetyEngine.js"
            );
            const verdict = gitSafetyEngine.classify({
              command: String(params.command || ""),
              branch: params.branch,
            });
            result = { success: true, verdict };
            break;
          }

          case "git_safety_is_destructive": {
            const { gitSafetyEngine } = await import(
              "../../engines/GitSafetyEngine.js"
            );
            const destructive = gitSafetyEngine.isDestructive(String(params.command || ""));
            result = { success: true, destructive, ruleIds: gitSafetyEngine.ruleIds() };
            break;
          }

          case "copy_paste_detect": {
            const { copyPasteDetectorEngine } = await import(
              "../../engines/CopyPasteDetectorEngine.js"
            );
            const verdict = copyPasteDetectorEngine.detect({
              code: String(params.code || ""),
              filePath: params.filePath,
              repoImportStyle: params.repoImportStyle,
            });
            result = { success: true, verdict };
            break;
          }

          case "feedback_loop_record": {
            const { feedbackLoopDoctorEngine } = await import(
              "../../engines/FeedbackLoopDoctorEngine.js"
            );
            feedbackLoopDoctorEngine.record({
              kind: params.kind,
              target: String(params.target || ""),
              outcome: params.outcome || "unknown",
              error: params.error,
            });
            result = { success: true, size: feedbackLoopDoctorEngine.size };
            break;
          }

          case "feedback_loop_diagnose": {
            const { feedbackLoopDoctorEngine } = await import(
              "../../engines/FeedbackLoopDoctorEngine.js"
            );
            const verdict = feedbackLoopDoctorEngine.diagnose();
            result = { success: true, verdict };
            break;
          }

          case "feedback_loop_reset": {
            const { feedbackLoopDoctorEngine } = await import(
              "../../engines/FeedbackLoopDoctorEngine.js"
            );
            feedbackLoopDoctorEngine.reset();
            result = { success: true, size: feedbackLoopDoctorEngine.size };
            break;
          }

          // U-LEARN-01: OutcomeCaptureBus + UniversalFeedbackCommand —
          // canonical feedback write path. Append-only JSONL shards under
          // state/outcomes/<domain>.jsonl, atomic via fsync+rename.
          case "feedback_override": {
            const { universalFeedbackCommandEngine } = await import(
              "../../engines/UniversalFeedbackCommandEngine.js"
            );
            result = universalFeedbackCommandEngine.recordOverride({
              domain: params.domain,
              recommended: params.recommended,
              actual: params.actual,
              context: params.context || {},
              lineage_id: params.lineage_id,
              agent_id: params.agent_id,
              note: params.note,
              confidence: params.confidence,
            });
            break;
          }

          case "feedback_measurement": {
            const { universalFeedbackCommandEngine } = await import(
              "../../engines/UniversalFeedbackCommandEngine.js"
            );
            result = universalFeedbackCommandEngine.recordMeasurement({
              domain: params.domain,
              kind: params.kind,
              actual: params.actual,
              recommended: params.recommended,
              context: params.context || {},
              source: params.source,
              lineage_id: params.lineage_id,
              agent_id: params.agent_id,
              note: params.note,
            });
            break;
          }

          case "feedback_scrap": {
            const { universalFeedbackCommandEngine } = await import(
              "../../engines/UniversalFeedbackCommandEngine.js"
            );
            result = universalFeedbackCommandEngine.recordScrap({
              domain: params.domain,
              reason: params.reason,
              context: params.context || {},
              lineage_id: params.lineage_id,
              agent_id: params.agent_id,
              source: params.source,
            });
            break;
          }

          case "feedback_recommendation_emitted": {
            const { universalFeedbackCommandEngine } = await import(
              "../../engines/UniversalFeedbackCommandEngine.js"
            );
            result = universalFeedbackCommandEngine.recordRecommendationEmitted({
              domain: params.domain,
              recommended: params.recommended,
              context: params.context || {},
              agent_id: params.agent_id,
              lineage_id: params.lineage_id,
              note: params.note,
              confidence: params.confidence,
            });
            break;
          }

          case "feedback_record": {
            const { universalFeedbackCommandEngine } = await import(
              "../../engines/UniversalFeedbackCommandEngine.js"
            );
            result = universalFeedbackCommandEngine.record({
              domain: params.domain,
              kind: params.kind,
              source: params.source,
              severity: params.severity,
              lineage_id: params.lineage_id,
              agent_id: params.agent_id,
              context: params.context || {},
              recommended: params.recommended,
              actual: params.actual,
              delta: params.delta,
              confidence: params.confidence,
              note: params.note,
            });
            break;
          }

          case "feedback_query": {
            const { universalFeedbackCommandEngine } = await import(
              "../../engines/UniversalFeedbackCommandEngine.js"
            );
            result = universalFeedbackCommandEngine.query({
              domain: params.domain,
              kind: params.kind,
              since_iso: params.since_iso,
              lineage_id: params.lineage_id,
              agent_id: params.agent_id,
              limit: params.limit ?? 1000,
            });
            break;
          }

          case "feedback_stats": {
            const { universalFeedbackCommandEngine } = await import(
              "../../engines/UniversalFeedbackCommandEngine.js"
            );
            result = universalFeedbackCommandEngine.stats();
            break;
          }

          // U-LEARN-02: FeatureRegistry / DataQuality / TrainingSnapshot / StreamVsBatch
          case "feature_registry_register": {
            const { featureRegistryEngine } = await import(
              "../../engines/FeatureRegistryEngine.js"
            );
            result = featureRegistryEngine.register(params.contract ?? params);
            break;
          }
          case "feature_registry_get": {
            const { featureRegistryEngine } = await import(
              "../../engines/FeatureRegistryEngine.js"
            );
            result = featureRegistryEngine.get(params.domain, params.feature_group);
            break;
          }
          case "feature_registry_list": {
            const { featureRegistryEngine } = await import(
              "../../engines/FeatureRegistryEngine.js"
            );
            result = featureRegistryEngine.list({
              domain: params.domain,
              feature_group: params.feature_group,
              tag: params.tag,
              sealed: params.sealed,
            });
            break;
          }
          case "feature_registry_seal": {
            const { featureRegistryEngine } = await import(
              "../../engines/FeatureRegistryEngine.js"
            );
            result = featureRegistryEngine.seal(params.domain, params.feature_group);
            break;
          }
          case "feature_registry_stats": {
            const { featureRegistryEngine } = await import(
              "../../engines/FeatureRegistryEngine.js"
            );
            result = featureRegistryEngine.stats();
            break;
          }

          case "dq_validate_row": {
            const { dataQualityEngine } = await import(
              "../../engines/DataQualityEngine.js"
            );
            result = dataQualityEngine.validateRow({
              domain: params.domain,
              feature_group: params.feature_group,
              feature_values: params.feature_values ?? {},
            });
            break;
          }
          case "dq_validate_batch": {
            const { dataQualityEngine } = await import(
              "../../engines/DataQualityEngine.js"
            );
            result = dataQualityEngine.validateBatch({
              domain: params.domain,
              feature_group: params.feature_group,
              rows: params.rows ?? [],
              reference_distribution: params.reference_distribution,
              current_distribution: params.current_distribution,
            });
            break;
          }

          case "training_snapshot_create": {
            const { trainingDatasetSnapshotEngine } = await import(
              "../../engines/TrainingDatasetSnapshotEngine.js"
            );
            result = trainingDatasetSnapshotEngine.create({
              query: params.query,
              snapshot_id: params.snapshot_id,
              label: params.label,
              notes: params.notes,
            });
            break;
          }
          case "training_snapshot_load": {
            const { trainingDatasetSnapshotEngine } = await import(
              "../../engines/TrainingDatasetSnapshotEngine.js"
            );
            result = trainingDatasetSnapshotEngine.load(params.snapshot_id);
            break;
          }
          case "training_snapshot_list": {
            const { trainingDatasetSnapshotEngine } = await import(
              "../../engines/TrainingDatasetSnapshotEngine.js"
            );
            result = trainingDatasetSnapshotEngine.list({ label: params.label });
            break;
          }
          case "training_snapshot_stats": {
            const { trainingDatasetSnapshotEngine } = await import(
              "../../engines/TrainingDatasetSnapshotEngine.js"
            );
            result = trainingDatasetSnapshotEngine.stats();
            break;
          }

          case "recon_reconcile": {
            const { streamVsBatchReconciliationEngine } = await import(
              "../../engines/StreamVsBatchReconciliationEngine.js"
            );
            result = streamVsBatchReconciliationEngine.reconcile({
              domain: params.domain,
              feature_group: params.feature_group,
              feature_group_version: params.feature_group_version,
              entity_id: params.entity_id,
              as_of_ts: params.as_of_ts,
              online_values: params.online_values ?? {},
              tolerances: params.tolerances,
              ignore_keys: params.ignore_keys,
              persist: params.persist,
            });
            break;
          }
          case "recon_query": {
            const { streamVsBatchReconciliationEngine } = await import(
              "../../engines/StreamVsBatchReconciliationEngine.js"
            );
            result = streamVsBatchReconciliationEngine.query(
              params.domain,
              params.feature_group,
              params.limit ?? 100,
            );
            break;
          }
          case "recon_stats": {
            const { streamVsBatchReconciliationEngine } = await import(
              "../../engines/StreamVsBatchReconciliationEngine.js"
            );
            result = streamVsBatchReconciliationEngine.stats();
            break;
          }

          case "htn_decompose": {
            const { htnDecomposerEngine } = await import(
              "../../engines/HTNDecomposerEngine.js"
            );
            const plan = htnDecomposerEngine.decompose(
              params.goal,
              params.state || {},
              params.operators || [],
              params.methods || [],
            );
            result = { success: true, plan };
            break;
          }

          case "strips_plan": {
            const { stripsPlannerEngine } = await import(
              "../../engines/STRIPSPlannerEngine.js"
            );
            const planResult = stripsPlannerEngine.plan({
              initial: params.initial || [],
              goal: params.goal || [],
              actions: params.actions || [],
              maxNodes: params.maxNodes,
            });
            result = { success: true, result: planResult };
            break;
          }

          case "cpm_pert_analyze": {
            const { cpmPertEngine } = await import(
              "../../engines/CPMPERTEngine.js"
            );
            const analysis = cpmPertEngine.analyze(params.tasks || []);
            result = {
              success: true,
              projectDuration: analysis.projectDuration,
              criticalPath: analysis.criticalPath,
              schedule: analysis.schedule,
              pert: {
                expectedDuration: analysis.pert.expectedDuration,
                variance: analysis.pert.variance,
                stdDev: analysis.pert.stdDev,
                p50: analysis.pert.p50,
                p90: analysis.pert.p90,
              },
            };
            break;
          }

          case "monte_carlo_schedule": {
            const { monteCarloScheduleEngine } = await import(
              "../../engines/MonteCarloScheduleEngine.js"
            );
            const sim = monteCarloScheduleEngine.simulate({
              tasks: params.tasks || [],
              trials: params.trials,
              seed: params.seed,
            });
            result = {
              success: true,
              p10: sim.p10,
              p25: sim.p25,
              p50: sim.p50,
              p75: sim.p75,
              p90: sim.p90,
              p99: sim.p99,
              mean: sim.mean,
              stdDev: sim.stdDev,
              tasksCriticalityPct: sim.tasksCriticalityPct,
              trials: sim.trials,
            };
            break;
          }

          case "type_aware_references": {
            const { typeAwareReferenceEngine } = await import(
              "../../engines/TypeAwareReferenceEngine.js"
            );
            const refResult = await typeAwareReferenceEngine.findReferences({
              targetFile: String(params.targetFile || ""),
              symbolName: String(params.symbolName || ""),
              scopeFiles: params.scopeFiles,
            });
            result = { success: true, ...refResult };
            break;
          }

          case "symbol_impact": {
            const { symbolImpactEngine } = await import(
              "../../engines/SymbolImpactEngine.js"
            );
            const impact = await symbolImpactEngine.analyze({
              targetFile: String(params.targetFile || ""),
              symbolName: String(params.symbolName || ""),
              scopeFiles: params.scopeFiles,
            });
            result = { success: true, impact };
            break;
          }

          case "type_flow_trace": {
            const { typeFlowTracerEngine } = await import(
              "../../engines/TypeFlowTracerEngine.js"
            );
            const flow = await typeFlowTracerEngine.trace({
              file: String(params.file || ""),
              functionName: String(params.functionName || ""),
              parameterName: String(params.parameterName || ""),
            });
            result = { success: true, flow };
            break;
          }

          case "reorient_record_anchor": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            const anchor = sessionReorientationEngine.recordAnchor(
              params.type || "decision",
              String(params.summary || ""),
              {
                rationale: params.rationale,
                files: params.files,
                importance: params.importance,
                tags: params.tags,
              }
            );
            result = { success: true, anchor };
            break;
          }
          case "reorient_deactivate_anchor": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            const ok = sessionReorientationEngine.deactivate(String(params.anchor_id || params.anchorId || ""));
            result = { success: ok, deactivated: ok };
            break;
          }
          case "reorient_record_prompt": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            const trigger = sessionReorientationEngine.recordPrompt();
            result = { success: true, briefTriggered: trigger };
            break;
          }
          case "reorient_record_tool_call": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            const trigger = sessionReorientationEngine.recordToolCall();
            result = { success: true, briefTriggered: trigger };
            break;
          }
          case "reorient_generate_brief": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            const brief = sessionReorientationEngine.generateBrief(String(params.trigger || "manual"));
            result = { success: true, brief };
            break;
          }
          case "reorient_should_generate": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            result = { success: true, ...sessionReorientationEngine.shouldGenerateBrief() };
            break;
          }
          case "reorient_stats": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            result = { success: true, stats: sessionReorientationEngine.getStats() };
            break;
          }
          case "reorient_update_config": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            const cfg = sessionReorientationEngine.updateConfig(params.config || {});
            result = { success: true, config: cfg };
            break;
          }
          case "reorient_reset": {
            const { sessionReorientationEngine } = await import("../../engines/SessionReorientationEngine.js");
            sessionReorientationEngine.reset();
            result = { success: true, reset: true };
            break;
          }

          // ── Model-Aware Self-Awareness ──────────────────────
          case "model_aware_detect": {
            const { ModelAwareSelfAwarenessEngine } = await import("../../engines/ModelAwareSelfAwarenessEngine.js");
            result = { success: true, info: ModelAwareSelfAwarenessEngine.detect(params.model) };
            break;
          }
          case "model_aware_zone": {
            const { ModelAwareSelfAwarenessEngine } = await import("../../engines/ModelAwareSelfAwarenessEngine.js");
            const zone = ModelAwareSelfAwarenessEngine.zoneForTokens(
              Number(params.consumed_tokens ?? params.consumedTokens ?? 0),
              Number(params.context_window ?? params.contextWindow ?? 1_000_000)
            );
            result = { success: true, zone };
            break;
          }
          case "model_aware_cadence": {
            const { ModelAwareSelfAwarenessEngine } = await import("../../engines/ModelAwareSelfAwarenessEngine.js");
            result = { success: true, cadence: ModelAwareSelfAwarenessEngine.cadenceFor(params.zone || "fresh") };
            break;
          }
          case "model_aware_current_cadence": {
            const { ModelAwareSelfAwarenessEngine } = await import("../../engines/ModelAwareSelfAwarenessEngine.js");
            const consumed = params.consumed_tokens ?? params.consumedTokens ?? ModelAwareSelfAwarenessEngine.readConsumedTokens();
            const cadence = ModelAwareSelfAwarenessEngine.currentCadence(Number(consumed), params.model);
            result = { success: true, cadence, applies: cadence !== null };
            break;
          }

          case "foresight_report": {
            const { foresightOrchestratorEngine } = await import(
              "../../engines/ForesightOrchestratorEngine.js"
            );
            const report = await foresightOrchestratorEngine.reportFor({
              description: String(params.description ?? ""),
              unitClass: params.unitClass as string | undefined,
              proposedFiles: params.proposedFiles as string[] | undefined,
              contextTokensUsed: params.contextTokensUsed as number | undefined,
              contextTokensLimit: params.contextTokensLimit as number | undefined,
              modelName: params.modelName as string | undefined,
            });
            result = { success: true, report };
            break;
          }

          case "error_budget_set_target": {
            const { errorBudgetEngine } = await import(
              "../../engines/ErrorBudgetEngine.js"
            );
            errorBudgetEngine.setTarget({
              service: String(params.service),
              availabilityTarget: Number(params.availabilityTarget),
              windowHours: Number(params.windowHours),
            });
            result = { success: true, service: params.service, target: { availabilityTarget: Number(params.availabilityTarget), windowHours: Number(params.windowHours) } };
            break;
          }

          case "error_budget_record": {
            const { errorBudgetEngine } = await import(
              "../../engines/ErrorBudgetEngine.js"
            );
            errorBudgetEngine.record({
              service: String(params.service),
              success: Boolean(params.success),
              weight: params.weight != null ? Number(params.weight) : undefined,
              at: params.at != null ? Number(params.at) : undefined,
            });
            result = { success: true };
            break;
          }

          case "error_budget_status": {
            const { errorBudgetEngine } = await import(
              "../../engines/ErrorBudgetEngine.js"
            );
            const status = errorBudgetEngine.status(String(params.service));
            result = { success: true, status };
            break;
          }

          case "error_budget_list": {
            const { errorBudgetEngine } = await import(
              "../../engines/ErrorBudgetEngine.js"
            );
            result = { success: true, services: errorBudgetEngine.listServices() };
            break;
          }

          case "distributed_critical_path": {
            const { distributedCriticalPathEngine } = await import(
              "../../engines/DistributedCriticalPathEngine.js"
            );
            const analysis = distributedCriticalPathEngine.analyze(
              (params.tasks as Array<{ id: string; duration: number; owner: string; predecessors?: string[] }>) ?? []
            );
            result = { success: true, analysis };
            break;
          }

          case "replan_evaluate": {
            const { replanTriggerEngine } = await import(
              "../../engines/ReplanTriggerEngine.js"
            );
            const verdict = replanTriggerEngine.evaluate({
              plan: params.plan as Parameters<typeof replanTriggerEngine.evaluate>[0]["plan"],
              currentState: params.currentState as Record<string, unknown>,
              currentTime: params.currentTime as number | undefined,
              lostResources: params.lostResources as string[] | undefined,
              externalEvents: params.externalEvents as string[] | undefined,
              timeBudgetRemainingMs: params.timeBudgetRemainingMs as number | undefined,
              minTimeBudgetMs: params.minTimeBudgetMs as number | undefined,
            });
            result = { success: true, verdict };
            break;
          }

          case "schema_snapshot": {
            const { schemaMigrationRollbackEngine } = await import(
              "../../engines/SchemaMigrationRollbackEngine.js"
            );
            const id = schemaMigrationRollbackEngine.snapshot(
              String(params.target),
              params.data,
              Number(params.version),
              params.label as string | undefined,
            );
            result = { success: true, snapshotId: id };
            break;
          }

          case "schema_restore_snapshot": {
            const { schemaMigrationRollbackEngine } = await import(
              "../../engines/SchemaMigrationRollbackEngine.js"
            );
            const data = schemaMigrationRollbackEngine.restoreFromSnapshot(String(params.snapshotId));
            result = { success: true, data };
            break;
          }

          case "schema_history": {
            const { schemaMigrationRollbackEngine } = await import(
              "../../engines/SchemaMigrationRollbackEngine.js"
            );
            const history = schemaMigrationRollbackEngine.historyFor(String(params.target));
            result = { success: true, history };
            break;
          }

          case "schema_migrations_list": {
            const { schemaMigrationRollbackEngine } = await import(
              "../../engines/SchemaMigrationRollbackEngine.js"
            );
            // Strip the up/down callables — they cannot round-trip through JSON-RPC
            const migrations = schemaMigrationRollbackEngine.listMigrations().map((m) => ({ from: m.from, to: m.to }));
            result = { success: true, migrations };
            break;
          }

          case "failure_risk_analyze": {
            const { failureModeAnticipationEngine } = await import(
              "../../engines/FailureModeAnticipationEngine.js"
            );
            const profile = failureModeAnticipationEngine.analyzeFailureRisk(
              params.conditions as Parameters<typeof failureModeAnticipationEngine.analyzeFailureRisk>[0]
            );
            result = { success: true, profile };
            break;
          }

          case "failure_modes_list": {
            const { failureModeAnticipationEngine } = await import(
              "../../engines/FailureModeAnticipationEngine.js"
            );
            const modes = failureModeAnticipationEngine.getFailureModes();
            result = { success: true, modes };
            break;
          }

          case "failure_mode_get": {
            const { failureModeAnticipationEngine } = await import(
              "../../engines/FailureModeAnticipationEngine.js"
            );
            const mode = failureModeAnticipationEngine.getFailureMode(String(params.id));
            if (!mode) { result = { success: false, error: `unknown failure mode '${String(params.id)}'` }; break; }
            result = { success: true, mode };
            break;
          }

          case "failure_cascade_chain": {
            const { failureModeAnticipationEngine } = await import(
              "../../engines/FailureModeAnticipationEngine.js"
            );
            const chain = failureModeAnticipationEngine.getCascadeChain(String(params.failureId));
            result = { success: true, chain };
            break;
          }

          // OllamaHookBridgeEngine — local LLM for hooks (token-free suggestions)
          case "ollama_hook_query": {
            const { OllamaHookBridgeEngine } = await import(
              "../../engines/OllamaHookBridgeEngine.js"
            );
            const engine = OllamaHookBridgeEngine.getInstance();
            const queryResult = await engine.query(String(params.prompt), {
              hookType: params.hookType as "grep_index" | "mcp_route" | "ai_feature" | "code_explain" | "pattern_match" | "validation" | "general" | undefined,
              timeoutMs: typeof params.timeoutMs === "number" ? params.timeoutMs : undefined,
              maxTokens: typeof params.maxTokens === "number" ? params.maxTokens : undefined,
              systemPrompt: typeof params.systemPrompt === "string" ? params.systemPrompt : undefined,
              temperature: typeof params.temperature === "number" ? params.temperature : undefined,
            });
            result = { success: queryResult.success, ...queryResult };
            break;
          }

          case "ollama_hook_status": {
            const { OllamaHookBridgeEngine } = await import(
              "../../engines/OllamaHookBridgeEngine.js"
            );
            const engine = OllamaHookBridgeEngine.getInstance();
            const statusResult = await engine.status();
            result = { success: true, ...statusResult };
            break;
          }

          case "ollama_hook_config": {
            const { OllamaHookBridgeEngine } = await import(
              "../../engines/OllamaHookBridgeEngine.js"
            );
            const engine = OllamaHookBridgeEngine.getInstance();
            const configResult = engine.configure({
              baseUrl: typeof params.baseUrl === "string" ? params.baseUrl : undefined,
              defaultModel: typeof params.defaultModel === "string" ? params.defaultModel : undefined,
              timeoutMs: typeof params.timeoutMs === "number" ? params.timeoutMs : undefined,
              maxTokens: typeof params.maxTokens === "number" ? params.maxTokens : undefined,
              modelOverrides: params.modelOverrides as Partial<Record<"grep_index" | "mcp_route" | "ai_feature" | "code_explain" | "pattern_match" | "validation" | "general", string>> | undefined,
              verbose: typeof params.verbose === "boolean" ? params.verbose : undefined,
            });
            result = { success: true, config: configResult };
            break;
          }

          case "audit_harness_security": {
            const { harnessSecurityAuditEngine } = await import("../../engines/HarnessSecurityAuditEngine.js");
            const auditResult = harnessSecurityAuditEngine.audit({
              scope: typeof params.scope === "string" ? (params.scope as any) : undefined,
              include_info: typeof params.include_info === "boolean" ? params.include_info : undefined,
              fail_on_severity: typeof params.fail_on_severity === "string" ? (params.fail_on_severity as any) : undefined,
            });
            // Persist clean-run timestamp so SessionStart staleness reminder clears
            if (auditResult.pass) {
              try {
                const stateFile = path.join(STATE_DIR, "HARNESS_AUDIT_LAST_RUN.json");
                fs.mkdirSync(path.dirname(stateFile), { recursive: true });
                safeWriteSync(stateFile, JSON.stringify({
                  last_clean_run: auditResult.scanned_at,
                  scope: auditResult.scope,
                  files_scanned: auditResult.files_scanned,
                }, null, 2));
              } catch (err) {
                log.debug(`[prism_dev] could not persist HARNESS_AUDIT_LAST_RUN: ${(err as Error).message}`);
              }
            }
            result = auditResult;
            break;
          }

          // BACKEND-DEVTOOLS-RGS6 HTML-COMPANION-MS0/HC-0..HC-5 — render any PRISM spec MD → HTML companion
          case "spec_html_render": {
            const { specHtmlCompanionEngine } = await import("../../engines/SpecHTMLCompanionEngine.js");
            let md = typeof params.md === "string" ? params.md : "";
            let srcPath: string | undefined;
            if (!md && typeof params.path === "string" && params.path) {
              const abs = path.isAbsolute(params.path) ? params.path : path.join(PROJECT_ROOT, params.path);
              const resolved = path.resolve(abs);
              const projRoot = path.resolve(PROJECT_ROOT);
              // require a trailing separator so a sibling like H:/prism-cad-complete can't satisfy the prefix check
              if (resolved !== projRoot && !resolved.startsWith(projRoot + path.sep)) { result = { ok: false, error: "path escapes PRISM root" }; break; }
              if (!fs.existsSync(resolved)) { result = { ok: false, error: `file not found: ${params.path}` }; break; }
              md = fs.readFileSync(resolved, "utf-8");
              srcPath = resolved;
            }
            if (!md) { result = { ok: false, error: "provide 'md' (markdown string) or 'path' (.md file path under the PRISM root)" }; break; }
            const rendered = specHtmlCompanionEngine.render(md, {
              theme: params.theme === "dark" || params.theme === "light" ? params.theme : "auto",
              toc: params.toc !== false,
              title: typeof params.title === "string" ? params.title : undefined,
              generatedBy: "prism_dev:spec_html_render",
              sourcePath: srcPath ? path.basename(srcPath) : undefined,
            });
            let wrote: string | undefined;
            if (params.write && srcPath) {
              const stem = srcPath.replace(/\.(md|markdown)$/i, "");
              const outPath = stem === srcPath ? srcPath + ".html" : stem + ".html";
              safeWriteSync(outPath, rendered.html, "utf-8");
              safeWriteSync(outPath + ".hash", `${rendered.sourceHash}  ${path.basename(srcPath)}\n`, "utf-8");
              wrote = path.relative(PROJECT_ROOT, outPath);
            }
            result = {
              ok: true,
              title: rendered.title,
              headings: rendered.headings,
              hasMermaid: rendered.hasMermaid,
              sourceHash: rendered.sourceHash,
              bytes: rendered.bytes,
              warnings: rendered.warnings,
              ...(wrote ? { wrote } : {}),
              ...(params.include_html ? { html: rendered.html } : {}),
            };
            break;
          }

          // ENGINE-WIRE-MS0/U-WIRE15 — 5 self-awareness/AI-meta engines
          case "dev_awareness_find_similar": {
            const { awarenessQueryEngine } = await import("../../engines/AwarenessQueryEngine.js");
            const p = params as { keywords: string[]; types?: string[]; limit?: number };
            result = await awarenessQueryEngine.findSimilarAsync(
              p.keywords,
              p.types as Parameters<typeof awarenessQueryEngine.findSimilarAsync>[1],
              p.limit,
            );
            break;
          }
          case "dev_awareness_bootstrap_report": {
            const { awarenessBootstrapEngine } = await import("../../engines/AwarenessBootstrapEngine.js");
            const p = params as { now_ms?: number };
            result = awarenessBootstrapEngine.compute(p.now_ms);
            break;
          }
          case "dev_capability_metrics": {
            const { aiCapabilityMaximizerEngine } = await import("../../engines/AICapabilityMaximizerEngine.js");
            result = aiCapabilityMaximizerEngine.computeMetrics();
            break;
          }
          case "dev_system_recommend_engines": {
            const { aiSystemSynchronizerEngine } = await import("../../engines/AISystemSynchronizerEngine.js");
            const p = params as { type: "build" | "optimize" | "analyze" | "extract" | "reason"; domain: string; description: string };
            result = aiSystemSynchronizerEngine.recommend({ type: p.type, domain: p.domain, description: p.description });
            break;
          }
          case "dev_auto_utilize_analyze": {
            const { aiAutoUtilizationEngine } = await import("../../engines/AIAutoUtilizationEngine.js");
            const p = params as { input: string; context?: Record<string, unknown> };
            result = aiAutoUtilizationEngine.analyze(
              p.input,
              p.context as Parameters<typeof aiAutoUtilizationEngine.analyze>[1],
            );
            break;
          }
          // ENGINE-WIRE-MS0/U-WIRE16 — 5 test infra engines
          case "dev_test_ast_analyze": {
            const { testASTAnalyzerEngine } = await import("../../engines/TestASTAnalyzerEngine.js");
            const p = params as { file_path: string };
            result = testASTAnalyzerEngine.analyze(p.file_path);
            break;
          }
          case "dev_test_coverage_uncovered": {
            const { testCoverageIndexEngine } = await import("../../engines/TestCoverageIndexEngine.js");
            result = await testCoverageIndexEngine.uncoveredEngines();
            break;
          }
          case "dev_test_registry_get_material": {
            const { testRegistryAdapterEngine } = await import("../../engines/TestRegistryAdapterEngine.js");
            const p = params as { iso_group: "P" | "M" | "K" | "N" | "S" | "H" };
            result = testRegistryAdapterEngine.getMaterialByISO(p.iso_group);
            break;
          }
          case "dev_test_resource_filter": {
            const { testResourceRegistryEngine } = await import("../../engines/TestResourceRegistryEngine.js");
            const p = params as Record<string, string | undefined>;
            // Schema validated keys; cast to engine filter shape (engine has typed fields).
            result = testResourceRegistryEngine.filter(p as Parameters<typeof testResourceRegistryEngine.filter>[0]);
            break;
          }
          case "dev_skill_gap_analyze": {
            const { skillGapAnalyzerEngine } = await import("../../engines/SkillGapAnalyzerEngine.js");
            const p = params as { domain?: string; min_usage_threshold?: number; max_usage_threshold?: number };
            await skillGapAnalyzerEngine.initialize();
            result = await skillGapAnalyzerEngine.analyze({
              domain: p.domain,
              minUsageThreshold: p.min_usage_threshold,
              maxUsageThreshold: p.max_usage_threshold,
            });
            break;
          }

          // ────────────────────────────────────────────────────────────────
          // ENGINE-WIRE-MS0/U-WIRE23: AdaptiveThresholdEngine
          // PAC-based Bayesian threshold adaptation for semantic dedup
          // ────────────────────────────────────────────────────────────────
          case "adaptive_threshold_observe": {
            const { adaptiveThresholdEngine } = await import("../../engines/AdaptiveThresholdEngine.js");
            const p = params as {
              cosine_similarity?: number;
              cosineSimilarity?: number;
              was_actual_duplicate?: boolean;
              wasActualDuplicate?: boolean;
              asset_type?: "engine" | "action" | "formula" | "hook" | "skill";
              assetType?: "engine" | "action" | "formula" | "hook" | "skill";
              timestamp?: number;
            };
            const sim = typeof p.cosine_similarity === "number" ? p.cosine_similarity : p.cosineSimilarity;
            const wasDup = typeof p.was_actual_duplicate === "boolean" ? p.was_actual_duplicate : p.wasActualDuplicate;
            const at = p.asset_type ?? p.assetType;
            if (typeof sim !== "number" || typeof wasDup !== "boolean" || !at) {
              result = { error: "Missing required: cosine_similarity (number), was_actual_duplicate (boolean), asset_type (string)" };
              break;
            }
            adaptiveThresholdEngine.observe({
              cosineSimilarity: sim,
              wasActualDuplicate: wasDup,
              assetType: at,
              timestamp: typeof p.timestamp === "number" ? p.timestamp : Date.now(),
            });
            result = { ok: true, asset_type: at, observed: { cosineSimilarity: sim, wasActualDuplicate: wasDup } };
            break;
          }

          case "adaptive_threshold_get": {
            const { adaptiveThresholdEngine: ate1 } = await import("../../engines/AdaptiveThresholdEngine.js");
            const p = params as { asset_type?: string; assetType?: string; confidence?: number };
            const at = p.asset_type ?? p.assetType ?? "engine";
            const conf = typeof p.confidence === "number" ? p.confidence : 0.95;
            result = ate1.getThreshold(at, conf);
            break;
          }

          case "adaptive_threshold_get_all": {
            const { adaptiveThresholdEngine: ate2 } = await import("../../engines/AdaptiveThresholdEngine.js");
            result = ate2.getAllThresholds();
            break;
          }

          case "adaptive_threshold_should_flag": {
            const { adaptiveThresholdEngine: ate3 } = await import("../../engines/AdaptiveThresholdEngine.js");
            const p = params as {
              cosine_similarity?: number;
              cosineSimilarity?: number;
              asset_type?: string;
              assetType?: string;
            };
            const sim = typeof p.cosine_similarity === "number" ? p.cosine_similarity : p.cosineSimilarity;
            if (typeof sim !== "number") {
              result = { error: "Missing required: cosine_similarity (number)" };
              break;
            }
            const at = p.asset_type ?? p.assetType ?? "engine";
            result = ate3.shouldFlagAsDuplicate(sim, at);
            break;
          }

          case "adaptive_threshold_probability": {
            const { adaptiveThresholdEngine: ate4 } = await import("../../engines/AdaptiveThresholdEngine.js");
            const p = params as {
              cosine_similarity?: number;
              cosineSimilarity?: number;
              asset_type?: string;
              assetType?: string;
            };
            const sim = typeof p.cosine_similarity === "number" ? p.cosine_similarity : p.cosineSimilarity;
            if (typeof sim !== "number") {
              result = { error: "Missing required: cosine_similarity (number)" };
              break;
            }
            const at = p.asset_type ?? p.assetType ?? "engine";
            result = {
              cosine_similarity: sim,
              asset_type: at,
              probability_is_duplicate: ate4.probabilityIsDuplicate(sim, at),
            };
            break;
          }

          // ──────────────────────────────────────────────────────────────────────────────
          // ENGINE-WIRE: RoadmapIntelligenceEngine — AI-powered roadmap execution.
          // Composes ChainOfThought / UncertaintyPropagation / LearningAdaptation /
          // DecisionReasoning / BusinessIntelligence engines. 6 actions: complexity assessment,
          // order optimization, effort prediction, outcome learning, build-vs-integrate, health.
          // ──────────────────────────────────────────────────────────────────────────────
          case "roadmap_intel_assess_complexity": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            if (!params.milestone || typeof params.milestone !== "object") { result = { error: "Missing required: milestone (object)" }; break; }
            result = RoadmapIntelligenceEngine.assessComplexity(params.milestone);
            break;
          }
          case "roadmap_intel_optimize": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            const milestones = Array.isArray(params.milestones) ? params.milestones : undefined;
            if (!milestones || milestones.length === 0) { result = { error: "Missing required: milestones (non-empty array)" }; break; }
            result = RoadmapIntelligenceEngine.optimizeRoadmap(milestones);
            break;
          }
          case "roadmap_intel_predict_effort": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            if (!params.milestone || typeof params.milestone !== "object") { result = { error: "Missing required: milestone (object)" }; break; }
            const hist = Array.isArray(params.historical_data) ? params.historical_data : (Array.isArray(params.historicalData) ? params.historicalData : undefined);
            result = RoadmapIntelligenceEngine.predictEffort(params.milestone, hist);
            break;
          }
          case "roadmap_intel_record_outcome": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            const mid = params.milestone_id ?? params.milestoneId;
            const ph = params.predicted_hours ?? params.predictedHours;
            const ah = params.actual_hours ?? params.actualHours;
            const pc = params.predicted_complexity ?? params.predictedComplexity;
            const ac = params.actual_complexity ?? params.actualComplexity;
            const lessons = params.lessons_learned ?? params.lessonsLearned ?? [];
            if (typeof mid !== "string" || typeof ph !== "number" || typeof ah !== "number" || typeof pc !== "string" || typeof ac !== "string") {
              result = { error: "Missing required: milestone_id (string), predicted_hours (number), actual_hours (number), predicted_complexity (string), actual_complexity (string)" }; break;
            }
            RoadmapIntelligenceEngine.recordOutcome(mid, ph, ah, pc, ac, Array.isArray(lessons) ? lessons : []);
            result = { ok: true, recorded: { milestone_id: mid, predicted_hours: ph, actual_hours: ah, predicted_complexity: pc, actual_complexity: ac }, error_pct: ph > 0 ? Math.abs(ah - ph) / ph * 100 : null };
            break;
          }
          case "roadmap_intel_build_vs_integrate": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            const fname = params.feature_name ?? params.featureName;
            const fdesc = params.feature_description ?? params.featureDescription ?? "";
            const bhrs = params.build_estimate_hours ?? params.buildEstimateHours;
            const mhpy = params.maintenance_hours_per_year ?? params.maintenanceHoursPerYear ?? 0;
            const libsRaw = Array.isArray(params.library_options) ? params.library_options : (Array.isArray(params.libraryOptions) ? params.libraryOptions : []);
            const libs = libsRaw.map((l: any) => ({
              name: String(l?.name ?? ""),
              integrationHours: Number(l?.integration_hours ?? l?.integrationHours ?? 0),
              annualCost: Number(l?.annual_cost ?? l?.annualCost ?? 0),
              reliability: Number(l?.reliability ?? 0.8),
              features: Array.isArray(l?.features) ? l.features : [],
            }));
            if (typeof fname !== "string" || !fname || typeof bhrs !== "number" || !(bhrs > 0)) {
              result = { error: "Missing required: feature_name (non-empty string), build_estimate_hours (positive number)" }; break;
            }
            if (libs.length === 0) {
              // analyzeBuildVsIntegrate's make-vs-buy step requires >=1 option; with no integration option, "build" is the only path.
              result = {
                feature: fname, recommendation: "build", confidence: 0.6,
                build_analysis: { estimated_hours: bhrs, maintenance_hours_per_year: Number(mhpy), risks: ["No external library available — full build + maintenance burden"], pros: ["Full control over implementation"], cons: ["Build time, cost, and ongoing maintenance"] },
                integrate_analysis: { library_options: [], pros: [], cons: ["No suitable integration option was supplied"] },
                reasoning: ["No integration option supplied — building in-house is the only path"],
              };
              break;
            }
            result = RoadmapIntelligenceEngine.analyzeBuildVsIntegrate(fname, String(fdesc), bhrs, Number(mhpy), libs);
            break;
          }
          case "roadmap_intel_health": {
            const { RoadmapIntelligenceEngine } = await import("../../engines/RoadmapIntelligenceEngine.js");
            const milestones = Array.isArray(params.milestones) ? params.milestones : undefined;
            if (!milestones || milestones.length === 0) { result = { error: "Missing required: milestones (non-empty array)" }; break; }
            const hist = Array.isArray(params.historical_data) ? params.historical_data : (Array.isArray(params.historicalData) ? params.historicalData : undefined);
            result = RoadmapIntelligenceEngine.assessRoadmapHealth(milestones, hist);
            break;
          }

          // ── HOOK-SYNERGY-MS0/U-HOOK-ENVELOPE (H4) ──────────────
          // Query state/shared/hook-latency.jsonl emitted by _envelope.mjs profiling shim.
          // All modes return small projections — never the full JSONL.
          case "hook_latency": {
            const { hookLatencyEngine } = await import("../../engines/HookLatencyEngine.js");
            const mode = String(params.mode || "summary");
            const windowMs = params.window_ms != null ? Number(params.window_ms) : undefined;
            const n = params.n != null ? Number(params.n) : undefined;
            switch (mode) {
              case "summary": result = hookLatencyEngine.getSummary(windowMs, n); break;
              case "per_hook": result = hookLatencyEngine.perHook(String(params.hook || ""), windowMs) ?? { error: "not_found", hook: String(params.hook || "") }; break;
              case "top_p95": result = { hooks: hookLatencyEngine.topByP95(n, windowMs) }; break;
              case "recent_slow": result = { threshold_ms: Number(params.threshold_ms ?? 0), hits: hookLatencyEngine.recentSlow(Number(params.threshold_ms ?? 0), n) }; break;
              case "recent_failures": result = { failures: hookLatencyEngine.recentFailures(n) }; break;
              case "total_fires": result = { total: hookLatencyEngine.totalFires(windowMs) }; break;
              case "available": result = { available: hookLatencyEngine.isAvailable() }; break;
              default: result = { error: "invalid_mode", mode, allowed: ["summary", "per_hook", "top_p95", "recent_slow", "recent_failures", "total_fires", "available"] };
            }
            break;
          }

          // ── HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2) ──────────────
          // Query the canonical HOOK_REGISTRY.json built by scripts/build-hook-registry.mjs.
          // Returns small projections — never the full 228 KB blob.
          case "hook_registry": {
            const { hookRegistryReaderEngine } = await import("../../engines/HookRegistryReaderEngine.js");
            const mode = String(params.mode || "counts");
            const query = typeof params.query === "string" ? params.query : "";
            const event = typeof params.event === "string" ? params.event : "";
            const tier = typeof params.tier === "string" ? params.tier : "";
            const max = params.max != null ? Number(params.max) : undefined;
            switch (mode) {
              case "counts": result = hookRegistryReaderEngine.getCounts() ?? { error: "registry_unavailable" }; break;
              case "meta": result = hookRegistryReaderEngine.getMeta() ?? { error: "registry_unavailable" }; break;
              case "compact": result = { map: hookRegistryReaderEngine.getCompactMap(max) }; break;
              case "find": result = hookRegistryReaderEngine.findHook(query) ?? { error: "not_found", query }; break;
              case "search": result = { query, hits: hookRegistryReaderEngine.searchHooks(query, max) }; break;
              case "by_event": result = { event, hooks: hookRegistryReaderEngine.byEvent(event) }; break;
              case "by_tier": result = { tier, hooks: hookRegistryReaderEngine.byTier(tier) }; break;
              case "wired": result = { count: hookRegistryReaderEngine.wired().length, hooks: hookRegistryReaderEngine.wired() }; break;
              case "orphaned": result = { count: hookRegistryReaderEngine.orphaned().length, hooks: hookRegistryReaderEngine.orphaned() }; break;
              case "stale": result = { stale: hookRegistryReaderEngine.isStale() }; break;
              default: result = { error: "invalid_mode", mode, allowed: ["counts", "meta", "compact", "find", "search", "by_event", "by_tier", "wired", "orphaned", "stale"] };
            }
            break;
          }

          // ── ACP-MS0/P0-U02 ───────────────────────────────────────
          // Map every hook in HOOK_REGISTRY.json to an automation-lifecycle stage
          // (authoring / pre_execution / post_execution / turn_end_gate /
          // context_boundary / async_background / unclassified) using its
          // events[] + tier frontmatter, AND surface CCM-planned hooks
          // declared by milestone forge_triple but not yet on disk. Engine
          // is read-only; modes: build (full inventory), summary (counts only),
          // by_stage (filter by stage), by_status, markdown (rendered report),
          // ccm_planned (just the planned subset).
          case "hook_lifecycle_inventory": {
            const { hookLifecycleStageMapperEngine } = await import("../../engines/HookLifecycleStageMapperEngine.js");
            const mode = String(params.mode || "summary");
            const registryPath = typeof params.registry_path === "string" ? params.registry_path : undefined;
            const hooksDir = typeof params.hooks_dir === "string" ? params.hooks_dir : undefined;
            const milestonesDir = typeof params.milestones_dir === "string" ? params.milestones_dir : undefined;
            const inv = hookLifecycleStageMapperEngine.buildInventory({ registryPath, hooksDir, milestonesDir });
            switch (mode) {
              case "build":
                result = inv;
                break;
              case "summary":
                result = {
                  schemaVersion: inv.schemaVersion,
                  generated_at: inv.generated_at,
                  total_hooks: inv.total_hooks,
                  by_stage: inv.by_stage,
                  by_status: inv.by_status,
                  ccm_planned_count: inv.ccm_planned_count,
                };
                break;
              case "by_stage": {
                const stage = String(params.stage || "");
                const allowed = ["authoring","pre_execution","post_execution","turn_end_gate","context_boundary","async_background","unclassified"];
                if (!allowed.includes(stage)) { result = { error: "invalid_stage", stage, allowed }; break; }
                result = { stage, count: hookLifecycleStageMapperEngine.filterByStage(inv, stage as any).length, hooks: hookLifecycleStageMapperEngine.filterByStage(inv, stage as any) };
                break;
              }
              case "by_status": {
                const status = String(params.status || "");
                const allowed = ["wired","orphan","disabled","planned"];
                if (!allowed.includes(status)) { result = { error: "invalid_status", status, allowed }; break; }
                result = { status, count: hookLifecycleStageMapperEngine.filterByStatus(inv, status as any).length, hooks: hookLifecycleStageMapperEngine.filterByStatus(inv, status as any) };
                break;
              }
              case "markdown":
                result = { markdown: hookLifecycleStageMapperEngine.renderMarkdown(inv) };
                break;
              case "ccm_planned":
                result = { count: inv.ccm_planned_count, hooks: inv.entries.filter((e) => e.ccmPlanned) };
                break;
              default:
                result = { error: "invalid_mode", mode, allowed: ["build", "summary", "by_stage", "by_status", "markdown", "ccm_planned"] };
            }
            break;
          }

          // ── HOOK-SYNERGY-MS0/U-HOOK-FAST-LANE (H6) ───────────────
          // Compute the per-event matcher split (Read/Glob/Grep fast lane vs
          // Edit/Write/Bash slow lane) that the settings.json should adopt.
          // The engine is pure: it takes a parsed settings shape + a tierLookup
          // closure and returns a plan + new settings. Disk I/O for the
          // settings file lives in scripts/apply-hook-fast-lane.mjs (the
          // dispatcher reads the file but never writes — even `apply_preview`
          // returns the JSON for review, not a write).
          case "hook_fast_lane": {
            const { getHookFastLaneEngine } = await import("../../engines/HookFastLaneEngine.js");
            const fs = await import("node:fs");
            const engine = getHookFastLaneEngine();
            const mode = String(params.mode || "analyze");

            if (mode === "classify_block") {
              // No file I/O — caller supplies the block. Useful for dry-runs
              // and unit tests without touching disk.
              const block = (params.block ?? {}) as { matcher?: string; hooks?: { command: string }[] };
              const event = "PreToolUse"; // arbitrary; classify_block doesn't care about event semantics
              const { splits, warnings } = engine.buildPlanForEvent(event, [
                { matcher: block.matcher, hooks: block.hooks ?? [] },
              ]);
              result = { splits, warnings };
              break;
            }

            const settingsPath = typeof params.settings_path === "string" && params.settings_path.length > 0
              ? params.settings_path
              : "H:/prism/.claude/settings.json";

            let settings: unknown;
            try {
              const raw = fs.readFileSync(settingsPath, "utf8");
              settings = JSON.parse(raw);
            } catch (e) {
              result = { error: "settings_read_failed", settings_path: settingsPath, message: String((e as Error)?.message ?? e) };
              break;
            }

            const plan = engine.buildPlan(settings as Parameters<typeof engine.buildPlan>[0]);
            switch (mode) {
              case "analyze":
                result = { mode: "analyze", settings_path: settingsPath, plan };
                break;
              case "forecast":
                result = { mode: "forecast", settings_path: settingsPath, forecast: plan.forecast, warnings: plan.warnings };
                break;
              case "propose": {
                const newSettings = engine.applyPlan(settings as Parameters<typeof engine.buildPlan>[0], plan);
                result = { mode: "propose", settings_path: settingsPath, plan, newSettings };
                break;
              }
              case "apply_preview": {
                const newSettings = engine.applyPlan(settings as Parameters<typeof engine.buildPlan>[0], plan);
                // Compact diff summary — block counts before/after per event.
                const summary: Record<string, { before: number; after: number }> = {};
                const before = ((settings as { hooks?: Record<string, unknown[]> }).hooks) ?? {};
                const after = (newSettings as { hooks?: Record<string, unknown[]> }).hooks ?? {};
                for (const evt of Object.keys(before)) {
                  summary[evt] = {
                    before: Array.isArray(before[evt]) ? before[evt].length : 0,
                    after: Array.isArray(after[evt]) ? after[evt].length : 0,
                  };
                }
                result = { mode: "apply_preview", settings_path: settingsPath, plan, newSettings, summary };
                break;
              }
              default:
                result = { error: "invalid_mode", mode, allowed: ["analyze", "propose", "apply_preview", "forecast", "classify_block"] };
            }
            break;
          }

          // ── HOOK-SYNERGY-MS0/U-HOOK-ASYNC-DISPATCH (H7) ──────────
          // AsyncHookDispatcherEngine — enqueue/run/read T4 hook jobs against
          // the queue + results JSONLs. The engine's enqueue spawns a detached
          // child (scripts/async-hook-runner.mjs); this case is the read +
          // control surface for it. The actual runJob path is invoked by the
          // detached runner, not by the dispatcher.
          case "async_dispatch": {
            const { getAsyncHookDispatcherEngine } = await import("../../engines/AsyncHookDispatcherEngine.js");
            const engine = getAsyncHookDispatcherEngine();
            const mode = String(params.mode || "pending");
            const windowMs = params.window_ms != null ? Number(params.window_ms) : undefined;
            const n = params.n != null ? Number(params.n) : undefined;
            switch (mode) {
              case "enqueue": {
                const job = (params.job ?? {}) as {
                  hook_path?: string; hookPath?: string; tier?: string; event?: string;
                  matcher?: string; tool?: string; timeout_ms?: number | string; timeoutMs?: number | string;
                  ctx?: unknown;
                };
                const hookPath = typeof job.hook_path === "string" ? job.hook_path : (typeof job.hookPath === "string" ? job.hookPath : "");
                if (!hookPath) { result = { error: "missing_required", field: "job.hook_path" }; break; }
                const timeoutRaw = job.timeout_ms ?? job.timeoutMs;
                const timeoutMs = timeoutRaw != null ? Number(timeoutRaw) : undefined;
                result = engine.enqueue({
                  hookPath,
                  tier: job.tier,
                  event: job.event,
                  matcher: job.matcher,
                  tool: job.tool,
                  timeoutMs,
                  ctx: job.ctx,
                });
                break;
              }
              case "pending":
                result = { jobs: engine.getPendingJobs(), count: engine.getPendingJobs().length };
                break;
              case "results": {
                const status = typeof params.status === "string" ? params.status as "any" | "succeeded" | "failed" | "timeout" | "skipped" : undefined;
                const hook = typeof params.hook === "string" ? params.hook : undefined;
                const rows = engine.getResults({ status, hook, windowMs, limit: n });
                result = { results: rows, count: rows.length, windowMs: windowMs };
                break;
              }
              case "stats":
                result = engine.getStats(windowMs);
                break;
              case "available":
                result = { available: engine.isAvailable() };
                break;
              case "purge": {
                const olderThan = params.older_than_ms != null ? Number(params.older_than_ms) : undefined;
                if (!Number.isFinite(olderThan) || (olderThan as number) <= 0) { result = { error: "missing_required", field: "older_than_ms (positive number)" }; break; }
                result = engine.purgeOlderThan(olderThan as number);
                break;
              }
              default:
                result = { error: "invalid_mode", mode, allowed: ["enqueue", "pending", "results", "stats", "available", "purge"] };
            }
            break;
          }

          // ── CLEANUP-MS0/U-CLEANUP-B2: peer_audit_tick ─────────────────
          // PeerCommitAuditorEngine.tick() entrypoint for the golf watchdog
          // cron. Optionally also reaps stale 'running' tick rows (operational
          // hardening — protects against ghost rows if a prior tick() crashed
          // between INSERT and finishAuditTick).
          case "peer_audit_tick": {
            const { PeerCommitAuditorEngine, getPeerCommitAuditorEngine } =
              await import("../../engines/PeerCommitAuditorEngine.js");
            const repoRoot = typeof params.repo_root === "string" ? params.repo_root : undefined;
            const cachePath = typeof params.cache_path === "string" ? params.cache_path : undefined;
            const sinceIso = typeof params.since_iso === "string" ? params.since_iso : undefined;
            const excludeAuthors = Array.isArray(params.exclude_authors)
              ? params.exclude_authors.filter((s: unknown): s is string => typeof s === "string")
              : undefined;
            const dryRun = params.dry_run === true;
            const reapStale = params.reap_stale === true;
            const reapThresholdMs = params.reap_threshold_ms != null
              ? Number(params.reap_threshold_ms)
              : undefined;
            // Singleton when no override; explicit construct when worktree caller
            // supplies repoRoot/cachePath (mirrors tickFromCli() lifecycle).
            const engine = (repoRoot || cachePath)
              ? new PeerCommitAuditorEngine({ repoRoot, cachePath })
              : getPeerCommitAuditorEngine();
            const tickResult = engine.tick({ sinceIso, repoRoot, excludeAuthors, dryRun });
            let reaped = 0;
            if (reapStale) {
              reaped = engine.reapStaleTicks(
                reapThresholdMs != null && Number.isFinite(reapThresholdMs) && reapThresholdMs > 0
                  ? reapThresholdMs
                  : undefined,
              );
            }
            result = { ...tickResult, staleTicksReaped: reaped };
            break;
          }

          // ── CLEANUP-MS0/U-CLEANUP-B2: peer_audit_attribution ──────────
          // Read-side ledger projection. B5 (attribution ledger) consumes
          // list_open + list_recent_ticks; B4 reviewer-dispatch drains
          // list_pending_signals for a specific chat.
          case "peer_audit_attribution": {
            const { getLedgerStoreEngine } = await import("../../engines/LedgerStoreEngine.js");
            const ledger = getLedgerStoreEngine();
            const mode = String(params.mode || "list_open");
            const rawLimit = params.limit != null ? Number(params.limit) : 100;
            const limit = Number.isFinite(rawLimit) && rawLimit > 0
              ? Math.min(Math.floor(rawLimit), 10_000)
              : 100;
            switch (mode) {
              case "list_open":
                result = { bugs: ledger.listOpenBugs(limit), limit };
                break;
              case "list_recent_ticks":
                result = { ticks: ledger.listRecentTicks(limit), limit };
                break;
              case "list_pending_signals": {
                const chat = typeof params.chat === "string" ? params.chat : "";
                if (!chat) {
                  result = { error: "missing_required", field: "chat", note: "list_pending_signals requires --chat to target a specific chat (broadcast '*' signals also matched)." };
                  break;
                }
                result = { signals: ledger.drainSignalsFor(chat, limit), chat, limit };
                break;
              }
              default:
                result = { error: "invalid_mode", mode, allowed: ["list_open", "list_recent_ticks", "list_pending_signals"] };
            }
            break;
          }

          // ── CLEANUP-MS0/U-CLEANUP-B2: peer_audit_dispatch_plan ────────
          // B4 reviewer-dispatch pre-flight surface. preview returns the
          // pending signals + a heuristic dispatch order; limits exposes the
          // engine's exported caps so B4 can self-throttle; cursor_status
          // reports current cache.lastTickIso + projector cursors so a stale
          // golf instance can detect drift.
          case "peer_audit_dispatch_plan": {
            const mode = String(params.mode || "preview");
            const rawLimit = params.limit != null ? Number(params.limit) : 50;
            const limit = Number.isFinite(rawLimit) && rawLimit > 0
              ? Math.min(Math.floor(rawLimit), 10_000)
              : 50;
            switch (mode) {
              case "preview": {
                const { getLedgerStoreEngine } = await import("../../engines/LedgerStoreEngine.js");
                const ledger = getLedgerStoreEngine();
                const chat = typeof params.chat === "string" && params.chat.length > 0
                  ? params.chat
                  : "golf-watchdog";
                const pending = ledger.drainSignalsFor(chat, limit);
                // Heuristic dispatch order: P0 bugs first (by emitted_at), then
                // peer_commit_for_review by ISO date asc (oldest first), then rest.
                const plan = pending.slice().sort((a, b) => {
                  // Type-asc: golf_finding > peer_commit_for_review > other
                  const typeRank = (t: string) => t === "golf_finding" ? 0 : t === "peer_commit_for_review" ? 1 : 2;
                  const ta = typeRank(a.signal_type);
                  const tb = typeRank(b.signal_type);
                  if (ta !== tb) return ta - tb;
                  return a.emitted_at - b.emitted_at;
                });
                result = { chat, plan, pendingCount: pending.length, limit };
                break;
              }
              case "limits": {
                const { PEER_AUDIT_LIMITS } = await import("../../engines/PeerCommitAuditorEngine.js");
                result = { limits: PEER_AUDIT_LIMITS };
                break;
              }
              case "cursor_status": {
                const { getLedgerProjectorEngine } = await import("../../engines/LedgerProjectorEngine.js");
                const projector = getLedgerProjectorEngine();
                result = { projectorCursors: projector.getAllCursors() };
                break;
              }
              default:
                result = { error: "invalid_mode", mode, allowed: ["preview", "limits", "cursor_status"] };
            }
            break;
          }

          // ── AUTO-LEARNING-LOOP-MS0/U-ALL01 step-5 ────────────────────
          // Poll the reputable-source registry via ReputableSourceMonitorEngine.
          // Modes:
          //   poll_all (default) — sequential sweep of all 10 sources, returns aggregate
          //   poll_one           — single source by slug (params.slug)
          //   get_sources        — list configured sources (no network)
          //   get_state          — per-source state snapshot (params.slug, no network)
          //   reset_all          — clear all per-source state (no network)
          case "source_sweep": {
            const { reputableSourceMonitorEngine } =
              await import("../../engines/ReputableSourceMonitorEngine.js");
            const mode = String(params.mode || "poll_all");
            switch (mode) {
              case "poll_all": {
                result = await reputableSourceMonitorEngine.pollAll();
                break;
              }
              case "poll_one": {
                const slug = typeof params.slug === "string" ? params.slug : "";
                if (!slug) { result = { error: "missing_required", field: "slug" }; break; }
                try {
                  result = await reputableSourceMonitorEngine.poll(slug);
                } catch (err) {
                  result = { error: "poll_failed", slug, detail: err instanceof Error ? err.message : String(err) };
                }
                break;
              }
              case "get_sources": {
                result = { sources: reputableSourceMonitorEngine.getSources() };
                break;
              }
              case "get_state": {
                const slug = typeof params.slug === "string" ? params.slug : "";
                if (!slug) { result = { error: "missing_required", field: "slug" }; break; }
                const state = reputableSourceMonitorEngine.getState(slug);
                result = state === null ? { error: "unknown_slug", slug } : { slug, state };
                break;
              }
              case "reset_all": {
                reputableSourceMonitorEngine.resetAll();
                result = { reset: true, sources: reputableSourceMonitorEngine.getSources().length };
                break;
              }
              default:
                result = { error: "invalid_mode", mode, allowed: ["poll_all", "poll_one", "get_sources", "get_state", "reset_all"] };
            }
            break;
          }

          // INTEL-OLLAMA-OBSIDIAN-MS0/P23-U01 — ModelTelemetryEngine read/log/purge surfaces.
          case "model_telemetry_report": {
            const { modelTelemetryEngine } = await import("../../engines/ModelTelemetryEngine.js");
            const windowMs = typeof params.windowMs === "number" && Number.isFinite(params.windowMs) && params.windowMs > 0
              ? params.windowMs
              : undefined;
            const stats = modelTelemetryEngine.getStats({ windowMs });
            const recentLimit = typeof params.recentLimit === "number" && params.recentLimit > 0
              ? Math.floor(params.recentLimit)
              : 0;
            const recent = recentLimit > 0
              ? modelTelemetryEngine.getRecentCalls({ windowMs, limit: recentLimit })
              : undefined;
            result = {
              success: true,
              data: {
                stats,
                storePath: modelTelemetryEngine.getStorePath(),
                ...(recent ? { recent } : {}),
              },
            };
            break;
          }
          case "model_telemetry_log": {
            const { modelTelemetryEngine } = await import("../../engines/ModelTelemetryEngine.js");
            try {
              const entry = modelTelemetryEngine.logCall({
                model: String(params.model ?? ""),
                backend: typeof params.backend === "string" ? params.backend : undefined,
                taskKind: typeof params.taskKind === "string" ? params.taskKind : undefined,
                promptTokens: Number(params.promptTokens ?? 0),
                completionTokens: Number(params.completionTokens ?? 0),
                latencyMs: Number(params.latencyMs ?? 0),
                outcome: params.outcome === "fail" || params.outcome === "timeout" ? params.outcome : "ok",
                errorBrief: typeof params.errorBrief === "string" ? params.errorBrief : undefined,
              });
              result = { success: true, data: { entry } };
            } catch (err) {
              result = { success: false, error: "invalid_input", detail: err instanceof Error ? err.message : String(err) };
            }
            break;
          }
          case "model_telemetry_purge": {
            const { modelTelemetryEngine } = await import("../../engines/ModelTelemetryEngine.js");
            const olderThanMs = Number(params.olderThanMs ?? 0);
            if (!Number.isFinite(olderThanMs) || olderThanMs < 0) {
              result = { success: false, error: "invalid_olderThanMs", value: params.olderThanMs };
              break;
            }
            const removed = modelTelemetryEngine.purgeOlderThan(olderThanMs);
            result = { success: true, data: { removed, olderThanMs } };
            break;
          }
          // INTEL-OLLAMA-OBSIDIAN-MS0/P23-U02 — apply the on-disk adaptation
          // state to the live ModelRoutingEngine singleton. Closes the
          // feedback loop: tuner writes router-adaptation-state.json,
          // this action loads it into route()'s in-memory catalog.
          case "router_adaptation_apply": {
            const { modelRoutingEngine } = await import("../../engines/ModelRoutingEngine.js");
            const stateDir = path.join(MCP_ROOT, "data", "state");
            const statePath = path.join(stateDir, "router-adaptation-state.json");
            if (!fs.existsSync(statePath)) {
              result = { success: false, error: "no_state_file", path: statePath };
              break;
            }
            let parsed: any;
            try {
              parsed = JSON.parse(fs.readFileSync(statePath, "utf8"));
            } catch (err) {
              result = {
                success: false,
                error: "state_parse_failed",
                detail: err instanceof Error ? err.message : String(err),
              };
              break;
            }
            const stateMap = parsed && typeof parsed === "object" && parsed.state && typeof parsed.state === "object"
              ? parsed.state
              : {};
            modelRoutingEngine.applyAdaptiveState(stateMap);
            const applied = modelRoutingEngine.getAdaptiveState();
            result = {
              success: true,
              data: {
                appliedModels: Object.keys(applied),
                appliedCount: Object.keys(applied).length,
                generatedAt: parsed?.generatedAt ?? null,
                statePath,
              },
            };
            break;
          }

          // INTEL-OLLAMA-OBSIDIAN-MS0/P23-U02 — adaptive routing status surface.
          case "router_adaptation_status": {
            const stateDir = path.join(MCP_ROOT, "data", "state");
            const statePath = path.join(stateDir, "router-adaptation-state.json");
            const logPath = path.join(stateDir, "router-adaptation.jsonl");
            let state: any = null;
            let stateLoadError: string | null = null;
            try {
              if (fs.existsSync(statePath)) {
                state = JSON.parse(fs.readFileSync(statePath, "utf8"));
              }
            } catch (err) {
              stateLoadError = err instanceof Error ? err.message : String(err);
            }
            const recentLimit = typeof params.recentLimit === "number" && params.recentLimit > 0
              ? Math.min(Math.floor(params.recentLimit), 500)
              : 50;
            let recent: any[] = [];
            try {
              if (fs.existsSync(logPath)) {
                const raw = fs.readFileSync(logPath, "utf8");
                const lines = raw.split(/\r?\n/).filter((l) => l.length > 0);
                const tail = lines.slice(-recentLimit);
                recent = tail.map((line) => {
                  try { return JSON.parse(line); }
                  catch { return { malformed: true, raw: line.slice(0, 120) }; }
                });
              }
            } catch { /* tolerate */ }
            result = {
              success: true,
              data: {
                state,
                stateLoadError,
                recent,
                paths: { state: statePath, log: logPath },
              },
            };
            break;
          }

          // ── CLEANUP-MS0/U-CLEANUP-C2: wiring_potential ───────────────
          // WiringPotentialEngine (shipped in U-CLEANUP-C1) dispatcher
          // surface. Three modes:
          //   analyze       — rank candidate dispatchers for ONE orphan.
          //   batch_unwired — scan BUILD_STATE.NEEDS_WIRING.sample_engines
          //                   (or explicit engine_names override) and rank
          //                   candidates per orphan. Cap via top_n.
          //   dashboard     — aggregate top-candidate distribution across
          //                   the orphan pool (how many orphans each
          //                   dispatcher would absorb, ranked desc).
          // Reads F7 DISPATCHER_CAPACITY.json + BUILD_STATE.json at call
          // time (no module-load I/O). Routes through MasterIndex via the
          // engine; never reimplements search.
          case "wiring_potential": {
            const { wiringPotentialEngine } = await import("../../engines/WiringPotentialEngine.js");
            const mode = String(params.mode ?? "analyze");

            // Per-engine analyze opts (passed through to engine.analyze()).
            const topKRaw = params.top_k ?? params.topK;
            const topK = topKRaw != null && Number.isFinite(Number(topKRaw))
              ? Math.min(10, Math.max(1, Math.floor(Number(topKRaw))))
              : undefined;
            const minConfRaw = params.min_confidence ?? params.minConfidence;
            const minConfidence = minConfRaw != null && Number.isFinite(Number(minConfRaw))
              ? Math.min(1, Math.max(0, Number(minConfRaw)))
              : undefined;
            const capacityFile = typeof params.capacity_file === "string"
              ? params.capacity_file
              : (typeof params.capacityFile === "string" ? params.capacityFile : undefined);

            const analyzeOpts: any = {};
            if (topK !== undefined) analyzeOpts.topK = topK;
            if (minConfidence !== undefined) analyzeOpts.minConfidence = minConfidence;
            if (capacityFile !== undefined) analyzeOpts.capacityFile = capacityFile;

            switch (mode) {
              case "analyze": {
                const engineName = typeof params.engine_name === "string"
                  ? params.engine_name
                  : (typeof params.engineName === "string" ? params.engineName : "");
                if (!engineName) {
                  result = { success: false, error: "missing_required", field: "engine_name", note: "mode=analyze requires engine_name (the orphan engine to rank candidates for)." };
                  break;
                }
                const report = await wiringPotentialEngine.analyze(engineName, analyzeOpts);
                result = { success: true, data: report };
                break;
              }
              case "batch_unwired": {
                const topNRaw = params.top_n ?? params.topN;
                const topN = topNRaw != null && Number.isFinite(Number(topNRaw))
                  ? Math.min(200, Math.max(1, Math.floor(Number(topNRaw))))
                  : 25;
                // Source orphan names: explicit override or read BUILD_STATE.
                let engineNames: string[] = [];
                const warnings: string[] = [];
                if (Array.isArray(params.engine_names) || Array.isArray(params.engineNames)) {
                  const src = Array.isArray(params.engine_names) ? params.engine_names : params.engineNames;
                  engineNames = src.filter((n: unknown): n is string => typeof n === "string" && n.length > 0).slice(0, topN);
                } else {
                  // Read BUILD_STATE. PROJECT_ROOT is canonical (main-tree truth)
                  // — worktree callers see the same orphan list as a main-tree
                  //   caller would. Reviewer-C noted this is correct shared-state
                  //   semantics; just document the cwd-independence.
                  const bsPath = path.resolve(PROJECT_ROOT, "state", "shared", "BUILD_STATE.json");
                  try {
                    if (fs.existsSync(bsPath)) {
                      const bs = JSON.parse(fs.readFileSync(bsPath, "utf8"));
                      const samples = bs?.NEEDS_WIRING?.sample_engines ?? bs?.NEEDS_WIRING?.engines ?? [];
                      engineNames = samples
                        .map((e: any) => (typeof e === "string" ? e : (typeof e?.name === "string" ? e.name : "")))
                        .filter((n: string) => n.length > 0)
                        .slice(0, topN);
                      if (engineNames.length === 0) {
                        warnings.push(`BUILD_STATE.NEEDS_WIRING is empty at ${bsPath}`);
                      }
                    } else {
                      warnings.push(`BUILD_STATE.json not found at ${bsPath} — empty result returned`);
                    }
                  } catch (err) {
                    // Tolerate malformed file — empty engineNames + explicit warning
                    // beats silent zero-orphan response that masquerades as success.
                    warnings.push(`BUILD_STATE.json read failed (${(err as Error).message}) — empty result returned`);
                  }
                }
                const reports = await wiringPotentialEngine.analyzeBatch(engineNames, analyzeOpts);
                const summary = {
                  totalAnalyzed: reports.length,
                  withCandidate: reports.filter((r) => r.topCandidate !== null).length,
                  noMatch: reports.filter((r) => r.topCandidate === null).length,
                };
                result = {
                  success: true,
                  data: {
                    reports,
                    summary,
                    warnings,
                    sourcedFromBuildState: !Array.isArray(params.engine_names) && !Array.isArray(params.engineNames),
                  },
                };
                break;
              }
              case "dashboard": {
                const topNRaw = params.top_n ?? params.topN;
                const topN = topNRaw != null && Number.isFinite(Number(topNRaw))
                  ? Math.min(200, Math.max(1, Math.floor(Number(topNRaw))))
                  : 25;
                let engineNames: string[] = [];
                const warnings: string[] = [];
                const bsPath = path.resolve(PROJECT_ROOT, "state", "shared", "BUILD_STATE.json");
                try {
                  if (fs.existsSync(bsPath)) {
                    const bs = JSON.parse(fs.readFileSync(bsPath, "utf8"));
                    const samples = bs?.NEEDS_WIRING?.sample_engines ?? bs?.NEEDS_WIRING?.engines ?? [];
                    engineNames = samples
                      .map((e: any) => (typeof e === "string" ? e : (typeof e?.name === "string" ? e.name : "")))
                      .filter((n: string) => n.length > 0)
                      .slice(0, topN);
                    if (engineNames.length === 0) {
                      warnings.push(`BUILD_STATE.NEEDS_WIRING is empty at ${bsPath}`);
                    }
                  } else {
                    warnings.push(`BUILD_STATE.json not found at ${bsPath} — empty dashboard returned`);
                  }
                } catch (err) {
                  warnings.push(`BUILD_STATE.json read failed (${(err as Error).message}) — empty dashboard returned`);
                }
                const reports = await wiringPotentialEngine.analyzeBatch(engineNames, analyzeOpts);
                // Aggregate by top-candidate dispatcher.
                const byDispatcher = new Map<string, { count: number; avgScore: number; orphans: string[] }>();
                let unmatched = 0;
                for (const r of reports) {
                  if (!r.topCandidate) { unmatched += 1; continue; }
                  const k = r.topCandidate.dispatcher;
                  const cur = byDispatcher.get(k) ?? { count: 0, avgScore: 0, orphans: [] };
                  cur.count += 1;
                  cur.avgScore = ((cur.avgScore * (cur.count - 1)) + r.topCandidate.score) / cur.count;
                  cur.orphans.push(r.engineName);
                  byDispatcher.set(k, cur);
                }
                const ranked = Array.from(byDispatcher.entries())
                  .map(([dispatcher, v]) => ({
                    dispatcher,
                    orphanCount: v.count,
                    avgScore: Number(v.avgScore.toFixed(4)),
                    orphans: v.orphans,
                  }))
                  .sort((a, b) => b.orphanCount - a.orphanCount || b.avgScore - a.avgScore || a.dispatcher.localeCompare(b.dispatcher));
                result = {
                  success: true,
                  data: {
                    totalAnalyzed: reports.length,
                    matched: reports.length - unmatched,
                    unmatched,
                    byDispatcher: ranked,
                    warnings,
                  },
                };
                break;
              }
              default:
                result = { success: false, error: "invalid_mode", mode, allowed: ["analyze", "batch_unwired", "dashboard"] };
            }
            break;
          }

          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-CALL-CHAIN: CallChainEngine wire (2026-05-15)
          case "tool_chain_record": {
            const { callChainEngine } = await import("../../engines/CallChainEngine.js");
            const detected = callChainEngine.add(String(params.tool ?? "Other"), String(params.target ?? ""));
            result = { success: true, detected, chain: callChainEngine.getChainString(20) };
            break;
          }
          case "tool_chain_detected": {
            const { callChainEngine } = await import("../../engines/CallChainEngine.js");
            result = { success: true, detected: callChainEngine.getDetected() };
            break;
          }
          case "tool_chain_string": {
            const { callChainEngine } = await import("../../engines/CallChainEngine.js");
            const last = typeof params.last === "number" ? params.last : 10;
            result = { success: true, chain: callChainEngine.getChainString(last) };
            break;
          }
          case "tool_chain_summary": {
            const { callChainEngine } = await import("../../engines/CallChainEngine.js");
            result = { success: true, summary: callChainEngine.getSummary() };
            break;
          }
          case "tool_chain_suggest": {
            const { callChainEngine } = await import("../../engines/CallChainEngine.js");
            result = { success: true, suggestions: callChainEngine.suggest() };
            break;
          }
          case "tool_chain_reset": {
            const { callChainEngine } = await import("../../engines/CallChainEngine.js");
            callChainEngine.reset();
            result = { success: true, reset: true };
            break;
          }

          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-READ-OPT: ReadOptimizerEngine wire (2026-05-15)
          case "read_optimize_recommend": {
            const { readOptimizerEngine } = await import("../../engines/ReadOptimizerEngine.js");
            const rec = readOptimizerEngine.recommend(
              String(params.file_path ?? params.path ?? ""),
              typeof params.intent === "string" ? params.intent : undefined,
            );
            result = { success: true, recommendation: rec };
            break;
          }
          case "read_optimize_oneliner": {
            const { readOptimizerEngine } = await import("../../engines/ReadOptimizerEngine.js");
            const line = readOptimizerEngine.oneLiner(
              String(params.file_path ?? params.path ?? ""),
              typeof params.intent === "string" ? params.intent : undefined,
            );
            result = { success: true, line };
            break;
          }
          case "read_optimize_batch": {
            const { readOptimizerEngine } = await import("../../engines/ReadOptimizerEngine.js");
            const files = Array.isArray(params.files) ? params.files.map((f: unknown) => String(f)) : [];
            const recs = readOptimizerEngine.batchRecommend(
              files,
              typeof params.intent === "string" ? params.intent : undefined,
            );
            result = { success: true, recommendations: recs };
            break;
          }
          case "read_optimize_batch_cost": {
            const { readOptimizerEngine } = await import("../../engines/ReadOptimizerEngine.js");
            const files = Array.isArray(params.files) ? params.files.map((f: unknown) => String(f)) : [];
            const cost = readOptimizerEngine.estimateBatchCost(files);
            result = { success: true, cost };
            break;
          }

          default:
            result = { error: "not_implemented", action, message: `Action '${action}' is registered but not yet wired to an engine. See PRISM-UNIFIED-MASTER-ROADMAP.md L1-B6.` };
        }
        return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
      } catch (error) {
        return dispatcherError(error, action, "prism_dev");
      }
    }
  );
}
