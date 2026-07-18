/**
 * Session Dispatcher — session lifecycle, state management, and context control.
 * (Action count auto-tracked in PRISM-INVENTORY-LATEST.md; the static "48 actions"
 * header from the original module has been corrected — refer to ACTIONS.length and
 * the inventory file for live counts.)
 *
 * Manages cross-session persistence (memory_save/recall), context pressure monitoring,
 * state checkpointing (auto_checkpoint, checkpoint_enhanced), WIP capture/restore,
 * workflow tracking, system introspection (system_snapshot, dispatcher_map, action_search),
 * and intent-based tool routing (tool_route, tool_route_best).
 *
 * Every PRISM session should call context_boot at start and memory_save at end.
 * Auto_checkpoint fires every 5-10 tool calls for crash recovery.
 *
 * @module sessionDispatcher
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_SESSION_SCHEMAS } from "../../schemas/sessionActionSchemas.js";
import { SESSION_KICKOFF_SCHEMAS } from "../../schemas/sessionSchema.js";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import { execFileSync } from "child_process";
import { hookExecutor, type HookPhase } from "../../engines/HookExecutor.js";
import type { StateEvent } from "../../types/prism-schema.js";
import { atomicWrite } from "../../utils/atomicWrite.js";
import { PATHS } from "../../constants.js";
import { sessionDeltaEngine } from "../../engines/SessionDeltaEngine.js";
import { systemSnapshotEngine } from "../../engines/SystemSnapshotEngine.js";
import type { SnapshotDepth } from "../../engines/SystemSnapshotEngine.js";
import { safeWriteSync } from "../../utils/atomicWrite.js";
import * as TaskClaimService from "../../services/TaskClaimService.js";

// PRISM-STAB-MS0/U-B1 (2026-05-09): per-session handoff write/read with in-memory mutex.
// Map keyed by session_id; ensures single-writer-per-session under concurrent
// dispatcher invocations within this MCP server process.
const HANDOFFS_DIR = "H:/prism/state/shared/handoffs";
// U-LOOP-STATE-QUERY (slot:bravo 2026-06-14): the dispatcher-surface for fleet loop-state.
// Mirrors HANDOFFS_DIR's absolute-path convention. The on-disk loop-*.json shape is the shared
// contract also read by .claude/helpers/loop-state.mjs readFleetLoops() (cross-module-root, so
// re-read here rather than imported -- the helper is outside the mcp-server TS build).
const LOOP_STATE_DIR = "H:/prism/state/shared/loop-state";
const CAG_STATS_FILE_PATH = "H:/prism/state/shared/cache/cag-cache-stats.json";
// FLEET-RECURRING-PATTERNS digest sidecar (written by scripts/fleet-recurring-patterns-digest.mjs,
// computed by the pure scripts/lib/fleet-recurring-patterns.mjs lib; outside the mcp-server TS build).
// The dispatcher action below READS this precomputed JSON (mirrors the cag_stats read pattern). galaxy:golf.
const FLEET_RECURRING_PATTERNS_PATH = "H:/prism/state/shared/dashboards/fleet-recurring-patterns.json";
const handoffWriteLocks = new Map<string, Promise<unknown>>();

function sanitizeForFilename(s: string): string {
  return String(s).replace(/[^a-zA-Z0-9._@-]/g, "_").replace(/_+/g, "_");
}

function handoffPathFor(sessionId: string, topic?: string | null): string {
  const base = sanitizeForFilename(sessionId);
  const topicSuffix = topic ? `-${String(topic).replace(/[^a-zA-Z0-9-]/g, "-").replace(/-+/g, "-").slice(0, 20)}` : "";
  return path.join(HANDOFFS_DIR, `HANDOFF-${base}${topicSuffix}.md`).replace(/\\/g, "/");
}

async function withHandoffLock<T>(sessionId: string, fn: () => Promise<T>): Promise<T> {
  const prior = handoffWriteLocks.get(sessionId) || Promise.resolve();
  let release!: () => void;
  const next = new Promise<void>((r) => (release = r));
  const ourEntry = prior.then(() => next);
  handoffWriteLocks.set(sessionId, ourEntry);
  try {
    await prior;
    return await fn();
  } finally {
    release();
    if (handoffWriteLocks.get(sessionId) === ourEntry) {
      handoffWriteLocks.delete(sessionId);
    }
  }
}

// Fire lifecycle hooks (non-blocking, errors logged but don't break session ops)
async function fireLifecycleHook(phase: string, metadata: Record<string, any>): Promise<void> {
  try {
    await hookExecutor.execute(phase as HookPhase, {
      operation: phase,
      target: { type: "calculation" as const, id: phase, data: metadata },
      session: metadata.session,
      metadata: { dispatcher: "sessionDispatcher", ...metadata }
    });
  } catch (err) {
    log.warn(`[sessionDispatcher] Lifecycle hook ${phase} error: ${err}`);
  }
}

const ACTIONS = [
  // U-WIRE-SLOTSESSION / WIRE-UNWIRED-PAPA: SlotSessionHistoryEngine read surfaces (fleet-state / per-slot latest+history; record* writes excluded). galaxy:golf -> prism_session. slot:papa->golf 2026-06-15.
  "slot_session_fleet_state",
  "slot_session_latest",
  "slot_session_history",
  // BLACKWELL-DB-GEN-MS0/U-WIRE-SLOT-SESSION-HISTORY (slot:india 2026-06-22): readAll() surface
  // honoring a custom (path-guard-confined) baseDir -- distinct from the DEFAULT_BASE_DIR-locked
  // singleton surfaces above.
  "slot_session_history_read",
  "state_load",
  "state_save", 
  "state_checkpoint",
  "state_diff",
  "handoff_prepare",
  "handoff_write",
  "handoff_read",
  "loop_state_query",
  "cag_stats",
  // CROSS-DOMAIN-RAG-FEDERATION-MS0/U-RAGFED-RETRIEVER (slot:india): federated RAG retrieval --
  // fan a query embedding to N Qdrant collections in parallel, fuse via Reciprocal Rank Fusion.
  "federated_rag_query",
  // FLEET-HYGIENE/golf: cross-session recurring-pattern digest read surface (regression classes,
  // scope-focus, fleet-wide citations, fix-rebreak loops). Sidecar written by fleet-recurring-patterns-digest.mjs.
  "fleet_recurring_patterns",
  // U-WIRE-OPERATOR-PREFS (slot:romeo): OperatorPreferencesEngine → prism_session (3 actions)
  "operator_prefs_set",
  "operator_prefs_get",
  "operator_prefs_apply",
  // U-FE-OPERATOR-FEEDBACK (slot:bravo): expose recordFeedback for the SPA OperatorFeedbackPanel
  // (/api/operator/feedback) -> RLHF capture (getUnprocessedFeedback feeds LoRA training).
  "operator_feedback_record",
  "resume_session",
  // Session replay (SessionReplayEngine — git-backed context, complements quick_resume)
  "replay_context",
  "replay_resume_line",
  "replay_working_set",
  "replay_diff_summary",
  "memory_save",
  "memory_recall",
  "context_pressure",
  "context_size",
  "context_compress",
  "context_expand", 
  "compaction_detect",
  "transcript_read",
  "state_reconstruct",
  "session_recover",
  "quick_resume",
  "session_start",
  "session_end",
  "auto_checkpoint",
  "wip_capture",
  "wip_list",
  "wip_restore",
  "state_rollback",
  "resume_score",
  "checkpoint_enhanced",
  "workflow_start",
  "workflow_advance", 
  "workflow_status",
  "workflow_complete",
  "health_check",
  "dsl_mode",
  "context_preload",
  "context_boot",
  "context_delta_boot",
  "quick_ref_regenerate",
  "session_delta",
  "session_bookmark",
  "session_compare_bookmark",
  "system_snapshot",
  "system_snapshot_layered",
  "system_drift_report",
  "dispatcher_map",
  "dispatcher_map_compact",
  "action_search",
  "action_find",
  "tool_route",
  "tool_route_best",
  "coordination_record",
  "coordination_detect_conflicts",
  "coordination_recent",
  "coordination_count",
  // ENGINE-WIRE-MS0/U-WIRE22: AgentSelfAwarenessEngine — unified self-awareness
  "self_awareness_build",
  "self_awareness_search",
  "self_awareness_context_summary",
  "self_awareness_health",
  "self_awareness_quick_stats",
  "self_awareness_recommended_actions",
  // COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH4: Awareness
  "awareness_unified_query",
  "awareness_command_detect",
  "awareness_command_suggest_string",
  "awareness_filter",
  "awareness_lifecycle_get_current",
  "awareness_lifecycle_get_history",
  // OBSIDIAN-AUTOMATE-MS3/U-OLLAMA-HEALTH-EXPOSE: surface OllamaIntegrationEngine
  "ollama_health",
  // HTML-PRIMARY-MS0/U-HPS07: render any Markdown doc/spec → HTML via SpecHTMLCompanionEngine
  "doc_render",
  // HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2): compact event → top-N hook ids map (mirrors dispatcher_map_compact for hooks)
  "hook_map_compact",
  // OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX: unified master search across system-viz + obsidian + capability index + BUILD_STATE
  "master_index_query",
  "master_index_node_status",
  // SIERRA-LEVERAGE/U-N1-RANKED-HYBRID (sierra 2026-05-29): re-rank master-index hits by RRF-fusing the confidence (lexical) ranking against the utilization (structural-importance) ranking — distinct axis from `hybrid_search` (which fuses across the 4 PSN SOURCES); this blends relevance × importance WITHIN the master hits.
  "master_index_ranked_hybrid",
  // PSN-ENHANCE-MS0/U-PSN-HYBRID-MCP-WIRE (sierra iter26 2026-05-25): one query → all 4 PSN retrieval substrates (memory + master + episode + Qdrant vector) → RRF k=60 fusion
  "hybrid_search",
  // OBSIDIAN-PRISM-OS-MS0/U-NODE-UTILIZATION: graph-wide utilization classifier (hub/sink/source/orphan/ghost)
  "master_index_utilization_dashboard",
  // CHEAP-NODE-ACCESS-MS0/U-NODECARD-DISPATCHER (sierra 2026-06-04): token-cheap node-card read-by-id — seeks the offset index via the single-source CLI (no 644MB graph load). params.id (string) | params.ids (string[]).
  "node_card",
  // SYSTEM-VIZ/U-VIZ-NEAR (sierra 2026-06-25): semantic nearest-neighbor node search -- top-K by 768d cosine via the single-source CLI `near` subcommand (streams the embedding pool, no 884MB graph load). params.id (string) + params.k (optional int, default 10).
  "node_near",
  // CHEAP-NODE-ACCESS-MS0/U-VBL-DISPATCHER (sierra 2026-06-09): REVERSE of node_card — given a vault doc (wiki path or memory slug) list the graph node(s) that document it, via the single-source CLI `doc-nodes` over vault-backlinks.json (no 644MB graph load). params.doc (string) + aliases query/q/key/path/slug.
  "doc_nodes",
  // GRAPH-AS-LLM-CONTEXT-MS0/U-GAC04 (sierra 2026-06-15): dual-channel subagent context -- JSON ego-graph (node-id: markers) + viz layer (system-Chrome PNG, else mermaid+markdown fallback). params.nodeId|id + prompt + mode + layer + embed. Composes GAC01.
  "dual_channel_dispatch",
  // GRAPH-AS-LLM-CONTEXT-MS0/U-GAC05 (sierra 2026-06-15): resolve a free-text alias/paraphrase to a canonical node-id (shared spatial address space; agents coordinate by id not paraphrase). params.text|alias|query OR params.aliases[] (batch). Composes GAC02 find-cache.
  "spatial_resolve",
  // COORD-MS0/U-COORD04: CrossSessionOrchestratorEngine unified facade — claim/broadcast/handoff over the 3 cross-session primitives
  "cross_session_get_session_id",
  "cross_session_claim",
  "cross_session_release",
  "cross_session_is_file_claimed",
  "cross_session_broadcast",
  "cross_session_get_recent_events",
  "cross_session_force_invalidate_all",
  "cross_session_create_handoff",
  "cross_session_get_status",
  "cross_session_get_other_sessions",
  "cross_session_get_status_line",
  // COMMAND-KERNEL-MS0/U-CK01 — PRISM Syscall Kernel (psk) thin dispatch shell.
  // Composes 10 declared syscalls (whoami / manifest / position / delta /
  // tools / pick / checkin / handoff / record / recommend) over existing
  // helpers + engines. U-CK02/CK03 fill the per-syscall semantics.
  "psk",
  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-MULTI-SESSION-HANDOFF — wire
  // MultiSessionHandoffCoordinatorEngine (U-CTX05, was orphan). Reads every
  // HANDOFF-*.md in state/shared, merges open goals + next actions across
  // sessions, detects claim conflicts, formats an injection-ready digest,
  // and supports stale-handoff cleanup (gated behind dry-run + confirm).
  "handoff_coord_status",
  "handoff_coord_inject",
  "handoff_coord_load_sessions",
  "handoff_coord_cleanup_stale",
  // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SESSION-LIFECYCLE — wires
  // SessionLifecycleEngine (W3:D5, 489 LOC, was orphan). Exposes the
  // 5-dimension session quality ensemble (task_completion / reliability /
  // safety_adherence / efficiency / continuity → 0-100 + letter grade)
  // plus metrics inspection + final-handoff generation. Engine is a
  // process-wide singleton via getInstance(); record-* methods stay
  // internal (cadence-wrapper-driven), only read/handoff surfaces exposed.
  "lifecycle_metrics",
  "lifecycle_quality_score",
  // U-BRIDGE-WIRE-AGENT (oscar 2026-05-23): wire 2 unwired Agent engines.
  // AgentAutoUpdateEngine — agent-knowledge sync (5 actions).
  "agent_knowledge_scan",
  "agent_knowledge_snapshot",
  "agent_knowledge_recent",
  "agent_knowledge_context_string",
  "agent_knowledge_rescan",
  // AgentWorkflowEngine — autonomous workflow execution (4 lifecycle actions).
  // Prefixed `agent_workflow_*` to avoid collision with existing
  // workflow_{start,advance,status,complete} (different engine).
  "agent_workflow_list",
  "agent_workflow_start",
  "agent_workflow_status",
  "agent_workflow_cancel",
  // U-BRIDGE-WIRE-CROSS (oscar 2026-05-23): wire 2 unwired Cross engines.
  // CrossCAMComparisonLedgerEngine — per-cell Wilson-bound CAM leaderboard.
  "cross_cam_ledger_record",
  "cross_cam_ledger_leaderboard",
  "cross_cam_ledger_by_cam",
  "cross_cam_ledger_stats",
  "cross_cam_ledger_reset",
  // CrossToolCouplingEngine — multi-tool modal coupling analysis.
  "cross_tool_coupling_analyze",
  // U-BRIDGE-WIRE-LIVE (oscar 2026-05-23 iter3): wire 3 unwired Live engines.
  "live_tooling_analyze_driven",
  "live_tooling_controller_capabilities",
  "live_turret_validate_kinematics",
  // U-BRIDGE-WIRE-INVENTOR (oscar 2026-05-23 iter4): wire 3 unwired Inventor engines.
  "inventor_cad_list_modules",
  "inventor_cad_get_module_entry",
  "inventor_cam_list_strategies",
  "inventor_cam_get_strategy_params",
  "inventor_cam_get_templates",
  // U-BRIDGE-WIRE-PRINT-PARTIAL (oscar 2026-05-23 iter5): wire 2 of 4 unwired Print
  // engines. PrintAccuracyProofEngine + PrintCorpusOrchestratorEngine deferred —
  // november DEA-MS0/P06 has explicit claim on PrintAccuracyProofEngine.
  "print_corpus_all_shas",
  "print_corpus_total_count",
  "print_stall_stats",
  // U-BRIDGE-WIRE-SENSOR (oscar 2026-05-23 iter6): DEFERRED — goal pivoted to mill
  // calculator page studio mid-iter; cases never wired. Names removed to satisfy
  // stop_on_unwired_assets. Re-add when SENSOR wiring resumes.
  "lifecycle_session_id",
  "lifecycle_call_count",
  "lifecycle_final_handoff",
  // OBSIDIAN-INTELLIGENCE-MS3/U-ACTION-TRACES (D4) — read-only query over the
  // append-only agent-write trace log (state/shared/action-traces.jsonl).
  // Backed by ActionTraceEngine.queryTraces. The recordTrace write-path is
  // the engine API consumed by a future PostToolUse trace hook.
  "action_trace_query",
  // OBSIDIAN-INTELLIGENCE-MS3/U-CONFLICT-RESOLUTION (D3) — detect a semantic
  // conflict between two writes to the same memory key and, on a real
  // conflict, persist both versions + a policy-selected winner to
  // knowledge/memories/conflicts/<key>.diff.md. Backed by
  // MemoryConflictResolverEngine.resolveConflict.
  "memory_conflict_resolve",
  // HERMES-AGI-ARCHITECTURE-MS0/U-HAGI08 — source-chain / provenance decorator
  // (Voxyz Layer 8). Citation chain on every retrieval, operator-auditable.
  "source_chain_decorate",
  "source_chain_merge",
  "source_chain_validate",
  "source_chain_render",
  // HERMES-AGI-ARCHITECTURE-MS0/U-HAGI12 — PSNCoverageAuditEngine
  // 11x12 PSN-leg x Voxyz-layer coverage matrix, operator-tunable thresholds.
  "psn_coverage_audit",
  "psn_coverage_by_verdict",
  "psn_coverage_render",
  "psn_coverage_decorated",
  // U-HAGI11 KillSwitchEngine — unified 3-level operator kill switch.
  "kill_switch_initial",
  "kill_switch_promote",
  "kill_switch_reset",
  "kill_switch_decide",
  // U-HAGI04 TaskDecomposerEngine — prose to N parallel sub-tasks.
  "task_decompose",
  "task_decompose_cap",
  "task_decompose_validate",
  // U-HAGI09 PolicyTestSuiteEngine — adversarial / forbidden-action verdict suite.
  "policy_suite_run",
  "policy_suite_summarize",
  "policy_suite_render",
  // U-HAGI10 TenantBoundaryEngine — multi-tenant data isolation primitive.
  "tenant_boundary_decide",
  "tenant_boundary_filter",
  "tenant_boundary_render",
  // U-HAGI03 CoordinatorSwarmEngine — Kimi-pattern fan-out + synthesize.
  "swarm_run",
  "swarm_successes",
  "swarm_failures",
  // U-HAGI07 A2AProtocolEngine — Linux Foundation Agent2Agent protocol layer.
  "a2a_inbound_descriptor",
  "a2a_outbound_envelope",
  "a2a_accept_inbound",
  // U-HAGI02 UnifiedControlPlaneEngine — composes kill-switch + tenant + budget + approval.
  "control_plane_decide",
  "control_plane_render",
  // U-HAGI05 BatchDeliverableEngine — fan-out multi-customer batch production.
  "batch_deliverable_run",
  "batch_deliverable_render",
  // U-HAGI01 DurableWorkflowEngine -- crash-resumable workflow primitive (Voxyz L9).
  // NOTE: durable advance is `workflow_durable_advance` -- the bare `workflow_advance`
  // (above) is the W6.1 python Workflow Tracker and wins the switch on first-match;
  // the durable advance was shadowed/dead until renamed (dup-case fix, slot:alpha 2026-06-22).
  "workflow_initial",
  "workflow_durable_advance",
  "workflow_pause",
  "workflow_resume",
  "workflow_cancel",
  "workflow_render",
  // U-HAGI06 WorkSurfaceScaffoldEngine — PrismApp web work-surface (Voxyz L1).
  "work_surface_manifest",
  "work_surface_route_at",
  "work_surface_filter_by_role",
  "work_surface_render",
  // HMEMV-MS0 sister milestone — memory/vector layer.
  // HMEMV01 TieredMemoryEngine — 3-tier working/episodic/semantic store.
  "tiered_memory_insert",
  "tiered_memory_recall",
  "tiered_memory_promote",
  "tiered_memory_expire",
  "tiered_memory_stats",
  "tiered_memory_render",
  // HMEMV02 RecallRankingEngine — hybrid retrieval ranking + MMR.
  "recall_rank",
  "recall_rank_render",
  // HMEMV03 MemoryGovernanceEngine — TTL + audit + scrub.
  "memory_find_expired",
  "memory_scrub",
  "memory_record_audit",
  "memory_render_audit",
  // HMEMV04 EmbeddingRouterEngine — Euclidean vs hyperbolic routing.
  "embedding_route",
  "embedding_route_render",
  // HMEMV05 MemoryDecayConsolidationEngine — decay/merge/drop consolidation.
  "memory_decay_consolidate",
  // HMEMV06 DriftDetectionEngine — semantic drift detection.
  "drift_measure",
  "drift_render",
  // HMEMV07 ContextBlockPackerEngine — per-block context packing.
  "context_pack_plan",
  "context_pack_render",
  // HMEMV08 MemoryDiffEngine — state-snapshot diff.
  "memory_diff",
  "memory_diff_render",
  // HMEMV09 NamespaceMigrationEngine — cross-namespace re-key.
  "namespace_migrate",
  "namespace_migrate_render",
  // HMEMV10 HybridIndexEngine — RRF fusion of BM25 + semantic.
  "hybrid_fuse",
  "hybrid_fuse_render",
  // HMEMV11 QuantizationProfileEngine — RaBitQ profile selector.
  "quant_select",
  "quant_render",
  // HCAP-MS0 sister milestone — capability layer.
  // HCAP01 PluginRegistryEngine — Hermes plugin manifest registry.
  "plugin_register",
  "plugin_deregister",
  "plugin_find_by_capability",
  "plugin_filter_by_side_effect",
  "plugin_render",
  // HCAP02 ExcelStructureEngine — Excel sheet/range parser.
  "excel_analyze",
  "excel_column_values",
  "excel_render",
  // HCAP03 PDFStructureEngine — PDF document structural model.
  "pdf_analyze",
  "pdf_render",
  // HMPI-MS0 sister milestone — MCP plugin / integration layer.
  // HMPI01 MCPServerRegistryEngine — registry of MCP servers we consume/expose.
  "mcp_server_register",
  "mcp_server_deregister",
  "mcp_server_find_by_tool",
  "mcp_server_filter_by_tier",
  "mcp_server_filter_by_transport",
  "mcp_server_find_oauth_gated",
  "mcp_server_render",
  // HCAP04 CSVStructureEngine — CSV structural parser.
  "csv_analyze",
  "csv_render",
  // HMPI02 OAuthCredentialEngine — OAuth credential lifecycle state machine.
  "oauth_initial",
  "oauth_authorize",
  "oauth_record_failure",
  "oauth_revoke",
  "oauth_reevaluate",
  "oauth_render",
  // HMPI03 IntegrationHealthEngine — health score + verdict for integrations.
  "health_score",
  "health_aggregate",
  "health_render",
  // HCAP05 JSONSchemaValidatorEngine — lightweight JSON Schema validator.
  "json_schema_validate",
  "json_schema_render",
  // HCAP06 WebScrapeResultEngine — structured web scrape result.
  "web_scrape_analyze",
  "web_scrape_rank",
  "web_scrape_render",
  // HCAP07 OCRResultEngine — structured OCR output.
  "ocr_summarize",
  "ocr_filter_by_confidence",
  "ocr_merge_text",
  "ocr_render",
  // HCAP08 ImageMetadataEngine — image metadata structural model.
  "image_analyze",
  "image_strip_gps",
  "image_render",
  // HCAP09 EmailMessageEngine — email message structural model.
  "email_analyze",
  "email_same_thread",
  "email_render",
  // HCAP10 ZipArchiveEngine — zip-archive structural model.
  "zip_analyze",
  "zip_filter_by_extension",
  "zip_render",
  // HCAP11 ParquetSchemaEngine — columnar table schema model.
  "parquet_analyze",
  "parquet_columns_of_type",
  "parquet_render",
  // HCAP12 SQLQueryStructureEngine — SQL structural classifier.
  "sql_query_analyze",
  "sql_query_render",
  // HCAP13 GraphQLSchemaEngine — GraphQL schema structural model.
  "graphql_analyze",
  "graphql_render",
  // HCAP14 RegexCatalogEngine — named-regex catalog.
  "regex_register",
  "regex_deregister",
  "regex_test",
  "regex_extract_all",
  "regex_list",
  "regex_render",
  // HCAP15 LocalizationBundleEngine — i18n bundle coverage.
  "i18n_analyze",
  "i18n_render",
  // HCAP16 PluginPermissionMatrixEngine — plugin × capability authz.
  "perm_matrix_set",
  "perm_matrix_lookup",
  "perm_matrix_remove",
  "perm_matrix_filter_by_verdict",
  "perm_matrix_stats",
  "perm_matrix_render",
  // HMPI04 SchemaDriftDetectorEngine — MCP tool schema drift detection.
  "schema_drift_diff",
  "schema_drift_render",
  // HMPI05 RateLimitGovernorEngine — token-bucket rate limiter.
  "rate_limit_initial",
  "rate_limit_refill",
  "rate_limit_consume",
  "rate_limit_render",
  // HMPI06 ToolDeprecationTrackerEngine — tool lifecycle / deprecation verdict.
  "tool_dep_decide",
  "tool_dep_aggregate",
  "tool_dep_render",
  // HMPI07 TransportHealthProbeEngine.
  "transport_health_analyze",
  "transport_health_render",
  // HMPI08 AuthHandshakeEngine.
  "auth_handshake_initial",
  "auth_handshake_challenge",
  "auth_handshake_respond",
  "auth_handshake_verify",
  "auth_handshake_render",
  // HMPI09 PluginInstallManifestEngine.
  "plugin_manifest_check",
  "plugin_manifest_render",
  // HMPI10 McpResourceLifecycleEngine.
  "mcp_resource_validate",
  "mcp_resource_begin_load",
  "mcp_resource_mark_ready",
  "mcp_resource_mark_failed",
  "mcp_resource_revoke",
  "mcp_resource_render",
  // HMPI11 PluginUpgradePathEngine.
  "plugin_upgrade_classify",
  "plugin_upgrade_render",
  // HMPI12 WebhookSubscriptionEngine.
  "webhook_subscription_check_add",
  "webhook_subscription_render",
  // HMPI13 ToolCallAuditLogEngine.
  "tool_call_audit_append",
  "tool_call_audit_summarize",
  "tool_call_audit_render",
  // HMPI14 PluginSandboxPolicyEngine.
  "plugin_sandbox_evaluate",
  "plugin_sandbox_render",
  // HZP01.0 HermesWorkSourceFeederEngine -- normalize heterogeneous work-source rows -> classified Subtask[] (the INPUT stage feeding hermes_fanout_plan). Pure: caller does all I/O.
  "hermes_work_source_feed",
  // HZP01 HermesParallelFanoutPlannerEngine.
  "hermes_fanout_plan",
  "hermes_fanout_render",
  // HZP01.5 auto-trigger gate — decides WHEN a raw task warrants fan-out (the dormant decision layer).
  "hermes_auto_fanout_gate",
  "hermes_auto_fanout_render",
  // C1 ZuluWaveSchedulerEngine -- multi-wave DAG scheduler (closes HZP01 wave-1-only gap).
  "schedule_wave",
  "compute_wave_n",
  "wave_partition_render",
  "wave_next_render",
  // HERMES-AUTONOMOUS-DRIVER -- pure state-machine driver over the wave scheduler (closes F1: the autonomous-build glue).
  "autonomous_drive_start",
  "autonomous_drive_next_batch",
  "autonomous_drive_record",
  "autonomous_drive_aggregate",
  // HERMES-AUTONOMOUS-DRIVER RUNNER -- the GATED full self-driving loop (default-OFF).
  "autonomous_drive",
  // C1 executable-wave bridge -- next wave as slot ASSIGNMENTS (makes wave_2+ dispatchable).
  "next_wave_execute",
  "wave_exec_render",
  // C1 SAFETY GATE -- next wave with the ZuluFleetGovernorEngine authority check applied per assignment.
  "governed_wave_execute",
  // C1+C2 RESUMABILITY -- a governed wave step that resumes/checkpoints completed_ids via ZuluTaskContinuityEngine (survives /compact).
  "wave_loop_step",
  // C1 FULL PROJECTION -- the COMPLETE governed multi-wave schedule + drains/stalled feasibility (the upfront check before spawning agents).
  "project_governed_schedule",
  "project_schedule_render",
  // C1 FRONT-END -- decompose a raw goal into a SubtaskSchema DAG (FanoutPlanRequest) via local Ollama; prompt_only returns the prompt without an LLM call.
  "hermes_decompose_goal",
  // C2 ZuluTaskContinuityEngine -- durable cross-session mid-flight task continuity.
  "continuity_checkpoint",
  "continuity_resume",
  "continuity_list_midflights",
  // C3 ZuluFleetHealthSynthesisEngine -- slot health -> scored readiness vector.
  "zulu_fleet_health_snapshot",
  "zulu_fleet_health_slot_readiness",
  // C4 ZuluDelegationContractEngine -- time/token/galaxy-bounded authority delegations
  // + a NARROWING pre-gate composed before the ZuluFleetGovernor authority check.
  "delegation_grant",
  "delegation_revoke",
  "delegation_status",
  "delegation_check",
  "zulu_authority_check_gated",
  // C5 ZuluAdaptiveBackPressureEngine -- trend-aware fan-out throttle (advisory).
  "backpressure_record_sample",
  "backpressure_assess",
  "backpressure_status",
  // C6 ZuluCapabilityRegistryEngine -- read-only runtime capability attestation.
  "capability_registry_snapshot",
  "capability_attest",
  // C7 ZuluCapabilityAttestationEngine -- outcome-correlated trust scores.
  "attestation_record_outcome",
  "attestation_score",
  "attestation_score_all",
  "attestation_bid_modifier",
  // C8 ZuluSoulEvolutionAdvisorEngine -- advisory-only soul-amendment proposals.
  "soul_evolution_propose",
  "soul_evolution_emit",
  "soul_evolution_proposals_list",
  // HZP02 HermesFileScopePartitionerEngine.
  "hermes_file_scope_partition",
  "hermes_file_scope_render",
  // HZP03 HermesParallelBudgetEnvelopeEngine.
  "hermes_budget_estimate",
  "hermes_budget_render",
  // HZP04 HermesParallelVerdictAggregatorEngine.
  "hermes_verdict_aggregate",
  "hermes_verdict_render",
  // HSE01 SoulFrontmatterReaderEngine.
  "soul_parse",
  "soul_summary_render",
  // HSE02 SoulSubagentRouterEngine.
  "soul_subagent_route",
  "soul_subagent_render",
  // DOMAIN-SOUL-AGENTS/U4 (operator 2026-06-30): route a task to its domain-soul agent
  // (<slot>-<domain>) + the hybrid Claude/Hermes/Ollama lane that should carry it.
  "domain_soul_agent_route",
  // HSE03 SoulEscalationCheckerEngine.
  "soul_escalation_check",
  "soul_escalation_render",
  // HSE04 SoulHtmlRenderEngine.
  "soul_html_render",
  // HSE05 SoulFleetRollupEngine.
  "soul_fleet_rollup",
  "soul_fleet_html",
  "soul_fleet_summary",
  // HSE06 DreamLoopProposalEngine.
  "dream_propose",
  "dream_batch_render",
  // HSE07 DreamConsolidationEngine.
  "dream_consolidate",
  "dream_queue_render",
  // DREAM-RECEIPT-MS0 / U-DR02 + U-DR03 + U-DR04 + U-DR05 + U-DR06 — DreamArtifactBundleEngine receipt-bundle surface (Hermes Dreaming v0.1.0 6-verb interop).
  "dream_status",
  "dream_diff",
  "dream_validate",
  "dream_apply",
  "dream_discard",
  // DREAM-RECEIPT-MS0 / U-DR07 — DreamMarkerScannerEngine: offline `DREAM:` marker parser (pure-core).
  "dream_scan",
  "dream_markers_to_proposals",
  // HSE08 SoulConsensusEngine.
  "soul_consensus_analyze",
  "soul_consensus_render",
  // HZP05 SoulAwareFanoutExtenderEngine.
  "soul_aware_fanout_extend",
  "soul_aware_fanout_render",
  // HZP06 ZuluTaskAuctionEngine.
  "zulu_task_auction",
  "zulu_task_auction_render",
  // C3<->HZP06 bridge: auction with LIVE queue_depth from ZuluFleetHealthSynthesisEngine.
  "zulu_auction_live",
  // HZD-02 ZuluFleetGovernorEngine — pure-core authority gate (read-only query).
  "zulu_authority_check",
  "zulu_authority_check_render",
  // HZD-06 ModelAttributionEngine — fleet model-provenance ledger (which model/provenance answered + token/latency badge). Pure in-memory, no I/O.
  "model_attribution_record",
  "model_attribution_summary",
  "model_attribution_recent",
  "model_attribution_find",
  "model_attribution_badge",
  // HZD-07 OpusCapabilityEngine — model-tier complexity router (PURE assessment + stats surface). execute() is LLM-backed (separate live-integration unit).
  "opus_assess_complexity",
  "opus_stats",
  // HZP07 HermesSelfCorrectionEngine.
  "hermes_self_correct",
  "hermes_self_correct_render",
  // HZP08 DoctrineDraftEngine.
  "doctrine_draft",
  "doctrine_draft_render",
  // HZD-05 ZuluDashboardControlEngine — MCP wrapper for the :8767 control server (HZP-DASH-MS0).
  "zulu_dash_assign",
  "zulu_dash_veto",
  "zulu_dash_promote_refuse",
  "zulu_dash_adopt_doctrine",
  "zulu_dash_escalate",
  "zulu_dash_bus_send",
  "zulu_dash_state",
  "zulu_dash_audit_tail",
  // ── DEA-MS0/U-DEA-november-01 — ContextualBoundaryEngine wire ──
  "context_bound_compute",
  "context_bound_all",
  "context_bound_check",
  // ── DEA-MS0/U-DEA-november-P06 — PrintAccuracyProofEngine wire (was UNKNOWN dispatcher) ──
  "print_accuracy_audit",
  "print_accuracy_classify_row",
  // ZULU-OBSIDIAN-LIVE-MS0 — ObsidianRestBridgeEngine (live Obsidian vault, READ-ONLY v1).
  "obsidian_status",
  "obsidian_read",
  "obsidian_search",
  // U-INDIA-WIRE-4-UNWIRED: PreMOUKickoffChecklistEngine
  "kickoff_checklist",
] as const;

function ok(data: any) {
  return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(data)) }] };
}

/**
 * C5 back-pressure throttle bridge for the governed-wave dispatch actions. DEFAULT (no
 * enforce + no surface) = a zero-IO pass-through (throttleWave with NO signals -> identical
 * dispatch set, throttled:[]/back_pressure:[] which slimResponse drops). Reads the durable
 * back-pressure store (zuluAdaptiveBackPressureEngine.assess per DISTINCT slot) only when
 * enforcing OR surfacing. Held assignments are re-offered on the next wave -- NEVER vetoed
 * (C5 spec: advisory by default; never overrides a governor-authorized action). Enforce via
 * `enforce_backpressure:true` or PRISM_BACKPRESSURE_ENFORCE=1; advisory-surface via
 * `surface_backpressure:true`.
 */
async function applyBackPressureThrottle(
  governed: import("../../engines/ZuluWaveSchedulerEngine.js").GovernedWaveExecution,
  enforceParam?: boolean,
  surfaceParam?: boolean,
): Promise<import("../../engines/ZuluWaveSchedulerEngine.js").ThrottledWaveExecution> {
  const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
  const enforce = enforceParam === true || process.env.PRISM_BACKPRESSURE_ENFORCE === "1";
  const consult = enforce || surfaceParam === true;
  if (!consult || governed.wave_assignments.length === 0) {
    return ZuluWaveSchedulerEngine.throttleWave(governed, undefined, { enforce: false });
  }
  const { zuluAdaptiveBackPressureEngine: zb } = await import("../../engines/ZuluAdaptiveBackPressureEngine.js");
  const signals = new Map<string, ReturnType<typeof zb.assess>>();
  for (const a of governed.wave_assignments) {
    if (!signals.has(a.slot)) signals.set(a.slot, zb.assess(a.slot));
  }
  return ZuluWaveSchedulerEngine.throttleWave(governed, signals, { enforce });
}

/**
 * Wire-layer mapper for SessionReplayEngine results.
 * Detects the engine's synthetic-error sentinel (lastCommit.hash === "error" OR
 * resumeLine starting with "Could not determine session context") and re-shapes
 * the response as {ok:false, error:"git_unavailable"} so MCP clients can branch
 * on a real discriminant. Also strips $HOME / USERPROFILE prefix from all
 * string fields (recursive) to prevent path/username leak through git stderr
 * round-tripping into MCP responses.
 *
 * Pure / side-effect-free. Exported for direct unit-test coverage of the
 * sentinel-detection + path-strip branches (the dispatcher's round-trip can
 * only reach the happy path in a real git repo).
 */
export function _replayMapResult(raw: unknown): unknown {
  const homeDir = process.env.HOME || process.env.USERPROFILE || "";
  // Sentinel detection: engine returns {lastCommit:{hash:"error",...}} on git failure.
  if (
    raw && typeof raw === "object" &&
    (raw as { lastCommit?: { hash?: string } }).lastCommit?.hash === "error"
  ) {
    return {
      ok: false,
      error: "git_unavailable",
      detail: "SessionReplayEngine could not access git (cwd missing .git, git not on PATH, or repo corrupted)",
    };
  }
  // Sentinel detection: getResumeLine() returns "Could not determine session context" on failure.
  if (
    raw && typeof raw === "object" &&
    typeof (raw as { resumeLine?: string }).resumeLine === "string" &&
    (raw as { resumeLine: string }).resumeLine.startsWith("Could not determine")
  ) {
    return {
      ok: false,
      error: "git_unavailable",
      detail: "SessionReplayEngine resume-line build failed",
    };
  }
  return _stripHomeDir(raw, homeDir);
}

export function _stripHomeDir(v: unknown, homeDir: string): unknown {
  if (!homeDir) return v;
  if (typeof v === "string") {
    // Replace both forward-slash and backslash variants (Windows / POSIX).
    let out = v.split(homeDir).join("~");
    if (homeDir.includes("\\")) out = out.split(homeDir.replace(/\\/g, "/")).join("~");
    return out;
  }
  if (Array.isArray(v)) return v.map(x => _stripHomeDir(x, homeDir));
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const k of Object.keys(v as Record<string, unknown>)) {
      out[k] = _stripHomeDir((v as Record<string, unknown>)[k], homeDir);
    }
    return out;
  }
  return v;
}

const STATE_DIR = PATHS.STATE_DIR;
const SCRIPTS_DIR = PATHS.SCRIPTS_CORE;
const CURRENT_STATE_FILE = path.join(STATE_DIR, "CURRENT_STATE.json");
const SESSION_MEMORY_FILE = path.join(STATE_DIR, "SESSION_MEMORY.json");
const ROADMAP_FILE = path.join(STATE_DIR, "ROADMAP_TRACKER.json");
const PRESSURE_LOG = path.join(STATE_DIR, "context_pressure_log.json");
const EVENT_LOG_FILE = path.join(STATE_DIR, "session_events.jsonl");
const SNAPSHOTS_DIR = path.join(STATE_DIR, "snapshots");
const TRANSCRIPTS_DIR = "/mnt/transcripts";
const PYTHON = PATHS.PYTHON;

const THRESHOLDS = {
  GREEN_MAX: 0.60,
  YELLOW_MAX: 0.75,
  ORANGE_MAX: 0.85,
  RED_MAX: 0.92,
  MAX_TOKENS: 200000
};

function loadJsonFile(filepath: string): any {
  try {
    if (fs.existsSync(filepath)) {
      return JSON.parse(fs.readFileSync(filepath, 'utf-8'));
    }
  } catch (e) {
    log.error(`Failed to load ${filepath}`, e);
  }
  return null;
}

function saveJsonFile(filepath: string, data: any): void {
  safeWriteSync(filepath, JSON.stringify(data, null, 2));
}

// ============================================================================
// APPEND-ONLY EVENT LOG (P2-001)
// Every state mutation is recorded as an immutable event.
// Recovery = latest snapshot + replay events after snapshot timestamp.
// ============================================================================

// StateEvent — imported from prism-schema

function appendEvent(type: string, data: any): void {
  try {
    const event: StateEvent = {
      ts: new Date().toISOString(),
      type,
      session: data.session || data.currentSession?.id,
      phase: data.phase || data.currentSession?.phase,
      data: trimEventData(data),
    };
    fs.appendFileSync(EVENT_LOG_FILE, JSON.stringify(event) + "\n");
  } catch { /* append failed — non-fatal, state_save still works */ }
}

/** Keep event data small — strip large nested objects */
function trimEventData(data: any): any {
  if (!data || typeof data !== "object") return data;
  const trimmed: any = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "currentSession" || k === "progress" || k === "quickResume" ||
        k === "session" || k === "phase" || k === "summary" || k === "next" ||
        k === "completed" || k === "status" || k === "checkpoint_id" ||
        k === "session_name" || k === "next_actions" || k === "quick_resume") {
      trimmed[k] = v;
    }
  }
  return Object.keys(trimmed).length > 0 ? trimmed : { _raw: JSON.stringify(data).slice(0, 500) };
}

function saveSnapshot(): string | null {
  try {
    const state = loadJsonFile(CURRENT_STATE_FILE);
    if (!state) return null;
    if (!fs.existsSync(SNAPSHOTS_DIR)) fs.mkdirSync(SNAPSHOTS_DIR, { recursive: true });
    const ts = new Date().toISOString().replace(/[:.]/g, "-");
    const snapPath = path.join(SNAPSHOTS_DIR, `snapshot_${ts}.json`);
    state._snapshot_ts = new Date().toISOString();
    saveJsonFile(snapPath, state);
    return snapPath;
  } catch { return null; }
}

function replayEventLog(afterTimestamp?: string): { events: StateEvent[]; reconstructed: any } {
  const events: StateEvent[] = [];
  const reconstructed: any = { sessions: [], checkpoints: [], phases: [], timeline: [] };
  try {
    if (!fs.existsSync(EVENT_LOG_FILE)) return { events, reconstructed };
    const lines = fs.readFileSync(EVENT_LOG_FILE, "utf-8").trim().split("\n");
    for (const line of lines) {
      if (!line.trim()) continue;
      try {
        const event = JSON.parse(line) as StateEvent;
        if (afterTimestamp && event.ts <= afterTimestamp) continue;
        events.push(event);
        reconstructed.timeline.push(`[${event.ts}] ${event.type}: ${event.phase || ""}`);
        if (event.type === "session_start") reconstructed.sessions.push(event.data);
        if (event.type === "checkpoint") reconstructed.checkpoints.push(event.data);
        if (event.phase) reconstructed.phases.push(event.phase);
        // Apply latest values
        if (event.data?.session) reconstructed.session = event.data.session;
        if (event.data?.phase) reconstructed.phase = event.data.phase;
        if (event.data?.summary) reconstructed.summary = event.data.summary;
        if (event.data?.quickResume) reconstructed.quickResume = event.data.quickResume;
        if (event.data?.quick_resume) reconstructed.quickResume = event.data.quick_resume;
      } catch { /* bad line — skip */ }
    }
  } catch { /* file read failed */ }
  return { events, reconstructed };
}

function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function getPressureLevel(percentage: number): string {
  if (percentage <= THRESHOLDS.GREEN_MAX) return "GREEN";
  if (percentage <= THRESHOLDS.YELLOW_MAX) return "YELLOW";
  if (percentage <= THRESHOLDS.ORANGE_MAX) return "ORANGE";
  if (percentage <= THRESHOLDS.RED_MAX) return "RED";
  return "CRITICAL";
}

async function runPythonScript(scriptName: string, args: string[] = []): Promise<string> {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  if (!fs.existsSync(scriptPath)) {
    return `ERROR: Script not found: ${scriptPath}`;
  }
  try {
    const result = execFileSync(PYTHON, [scriptPath, ...args], {
      encoding: 'utf-8',
      timeout: 30000,
      cwd: SCRIPTS_DIR
    });
    return result;
  } catch (error: any) {
    return `ERROR: ${error.message}`;
  }
}

async function loadCurrentState(): Promise<any> {
  const state = loadJsonFile(CURRENT_STATE_FILE);
  if (state) return state;
  
  return {
    version: "1.0.0",
    lastUpdated: new Date().toISOString(),
    currentSession: {
      id: `session-${Date.now()}`,
      status: "IN_PROGRESS",
      phase: "1",
      sessionNumber: "1.4",
      progress: {}
    },
    quickResume: "New session started"
  };
}

/** Registers session dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerSessionDispatcher(server: any): void {
  server.tool(
    "prism_session",
    "Session state management: save/load/checkpoint/diff, handoff, memory, context pressure, workflows, health. Use 'action' param.",
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params: Record<string, any> }) => {
      log.info(`[prism_session] ${action}`);
      // H1-MS2: Auto-normalize snake_case → camelCase params
      let params = rawParams;
      try {
        const { normalizeParams } = await import("../../utils/paramNormalizer.js");
        params = normalizeParams(rawParams);
      } catch { /* normalizer not available */ }

      // SYS-MS6: Validate params against per-action Zod schema
      const mergedSessionSchemas = { ...ACTION_SESSION_SCHEMAS, ...SESSION_KICKOFF_SCHEMAS };
      const validation = validateActionParams(action, params, mergedSessionSchemas);
      if (!validation.valid) {
        return dispatcherError(
          `Invalid params for '${action}': ${validation.errorMessage}`,
          action,
          "prism_session"
        );
      }

      try {
        switch (action) {
          case "state_load": {
            const state = await loadCurrentState();
            return ok({ success: true, state, quickResume: state.quickResume });
          }
          
          case "state_save": {
            // Load existing state, merge new data on top
            let state = loadJsonFile(CURRENT_STATE_FILE) || {};
            
            // Support both: params.state={...} (nested) OR top-level params
            const newData = params.state || {};
            const topLevel: Record<string, any> = {};
            for (const [k, v] of Object.entries(params)) {
              if (k !== "state" && k !== "path") topLevel[k] = v;
            }
            
            // Merge: existing ← nested state ← top-level params
            Object.assign(state, newData, topLevel);
            state.lastUpdated = new Date().toISOString();
            
            // Build quickResume from whatever we have
            const parts = [
              state.session ? `Session: ${state.session}` : null,
              state.phase ? `Phase: ${state.phase}` : null,
              state.summary ? state.summary : null,
            ].filter(Boolean);
            if (parts.length > 0) state.quickResume = parts.join(" | ");
            
            // Ensure currentSession structure exists for other tools
            if (!state.currentSession) {
              state.currentSession = { phase: state.phase || "unknown", progress: {} };
            }
            if (state.phase) state.currentSession.phase = state.phase;
            
            const savePath = params.path || CURRENT_STATE_FILE;
            saveJsonFile(savePath, state);
            appendEvent("state_save", state);
            return ok({ success: true, path: savePath, timestamp: state.lastUpdated, quickResume: state.quickResume });
          }
          
          case "state_checkpoint": {
            const state = await loadCurrentState();
            state.currentSession.progress = {
              ...state.currentSession.progress,
              completed: params.completed,
              next: params.next,
              lastCheckpoint: new Date().toISOString()
            };
            state.quickResume = `Checkpoint: ${params.completed} items done. Next: ${params.next}`;
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("checkpoint", { completed: params.completed, next: params.next, phase: state.currentSession?.phase });
            
            // Fire on-session-checkpoint hooks (5 hooks: backup trigger, metrics snapshot, state sync)
            await fireLifecycleHook("on-session-checkpoint", { completed: params.completed, next: params.next });
            
            return ok({ success: true, completed: params.completed, next: params.next });
          }
          
          case "state_diff": {
            const current = await loadCurrentState();
            if (!params.previous_path) {
              return ok({ success: true, current });
            }
            if (!fs.existsSync(params.previous_path)) {
              return ok({ success: false, error: "File not found" });
            }
            const previous = loadJsonFile(params.previous_path);
            const changes: string[] = [];
            if (current.version !== previous.version) {
              changes.push(`Version: ${previous.version} → ${current.version}`);
            }
            return ok({ success: true, changes });
          }
          
          case "handoff_prepare": {
            const state = await loadCurrentState();
            state.currentSession.status = params.status || "IN_PROGRESS";
            const nextActions = params.next_actions || [];
            state.quickResume = [
              `Status: ${params.status}`,
              `Phase: ${state.currentSession.phase}`,
              nextActions.length ? `Next: ${nextActions[0]}` : ""
            ].filter(Boolean).join(" | ");
            state.currentSession.progress = {
              ...state.currentSession.progress,
              handoffTime: new Date().toISOString(),
              nextActions
            };
            saveJsonFile(CURRENT_STATE_FILE, state);
            return ok({ success: true, status: params.status, quickResume: state.quickResume, nextActions });
          }

          case "handoff_write": {
            // PRISM-STAB-MS0/U-B1: serialized atomic write per session_id.
            const sid = String(params.session_id);
            const topic = params.topic ? String(params.topic) : null;
            const body = String(params.body);
            const machine = params.machine ? String(params.machine) : (process.env.COMPUTERNAME || "unknown");
            const family = params.family ? String(params.family) : "Claude";
            const parentSid = params.parent_session_id ? String(params.parent_session_id) : null;

            const result = await withHandoffLock(sid, async () => {
              fs.mkdirSync(HANDOFFS_DIR, { recursive: true });
              const filePath = handoffPathFor(sid, topic);
              const writtenAt = new Date().toISOString();
              const frontmatter = [
                "---",
                `session: ${sid}`,
                `topic: ${topic || ""}`,
                `written_at: ${writtenAt}`,
                `machine: ${machine}`,
                `family: ${family}`,
                ...(parentSid ? [`parent_session: ${parentSid}`] : []),
                `status: active`,
                `writer: prism_session.handoff_write`,
                "---",
                "",
              ].join("\n");
              const finalBody = body.startsWith("---\n") ? body : frontmatter + body;
              atomicWrite(filePath, finalBody);
              return { file: filePath, writtenAt, bytes: Buffer.byteLength(finalBody, "utf-8") };
            });

            return ok({ success: true, ...result, session_id: sid, topic });
          }

          case "handoff_read": {
            // PRISM-STAB-MS0/U-B1: exact-match read (no topic-glob fallback per U-B4 doctrine).
            const sid = String(params.session_id);
            const topic = params.topic ? String(params.topic) : null;
            const filePath = handoffPathFor(sid, topic);
            if (!fs.existsSync(filePath)) {
              return ok({ success: false, error: "not_found", session_id: sid, topic, expected: filePath });
            }
            const stat = fs.statSync(filePath);
            const content = fs.readFileSync(filePath, "utf-8");
            const ageMinutes = Math.round((Date.now() - stat.mtimeMs) / 60000);
            return ok({
              success: true,
              session_id: sid,
              topic,
              file: filePath,
              content,
              age_minutes: ageMinutes,
              bytes: stat.size,
              modified: new Date(stat.mtimeMs).toISOString(),
            });
          }

          case "loop_state_query": {
            // Fleet loop-state query: dispatcher surface over the on-disk loop-*.json contract
            // (also read by .claude/helpers/loop-state.mjs readFleetLoops -- re-read here because
            // that helper is outside the mcp-server TS build). Optional loop_state_dir overrides the
            // default (test-isolatable, like coordination_record's ledger_path). active_only filters
            // status === "running". Fail-soft: a missing dir / corrupt file -> empty / skipped.
            const dir = params.loop_state_dir ? String(params.loop_state_dir) : LOOP_STATE_DIR;
            const activeOnly = params.active_only === true || params.activeOnly === true;
            const nowMs = Date.now();
            let lsFiles: string[] = [];
            try {
              lsFiles = fs.readdirSync(dir).filter((f) => f.startsWith("loop-") && f.endsWith(".json"));
            } catch {
              return ok({ success: true, count: 0, loops: [] });
            }
            const loops: Array<Record<string, unknown>> = [];
            for (const f of lsFiles) {
              try {
                const s = JSON.parse(fs.readFileSync(path.join(dir, f), "utf-8")) as Record<string, unknown>;
                if (activeOnly && s.status !== "running") continue;
                const rawStale = s.lastTickAt ? nowMs - new Date(String(s.lastTickAt)).getTime() : null;
                loops.push({
                  sessionId: s.sessionId, task: s.task, iter: s.iter, target: s.target,
                  status: s.status, lastTickAt: s.lastTickAt,
                  // guard NaN from an unparseable lastTickAt -> null so the sort stays deterministic (?? only catches null/undefined)
                  staleMs: Number.isFinite(rawStale as number) ? rawStale : null,
                });
              } catch { /* skip corrupt */ }
            }
            loops.sort((a, b) => Number(a.staleMs ?? Infinity) - Number(b.staleMs ?? Infinity));
            return ok({ success: true, count: loops.length, loops });
          }

          case "cag_stats": {
            // CAG hit-rate telemetry surface over the stats sink written by recordCagStat() in
            // scripts/lib/galaxy-cag-cache.mjs (called from galaxy-reasoning-bridge.reasonForGalaxy).
            // Re-read + summarized here because that .mjs lib is outside the mcp-server TS build; the
            // per-galaxy rate math MIRRORS summarizeCagStats() in galaxy-cag-cache.mjs (source of truth)
            // -- keep in sync -- but is returned as a total-sorted ARRAY for dispatcher ergonomics.
            // Optional cag_stats_file overrides the default (test-isolatable). Fail-soft: absent/corrupt -> zeros.
            const statsFile = params.cag_stats_file ? String(params.cag_stats_file) : CAG_STATS_FILE_PATH;
            let raw: Record<string, unknown> = { hits: 0, misses: 0, byGalaxy: {} };
            try {
              const j = JSON.parse(fs.readFileSync(statsFile, "utf-8")) as Record<string, unknown>;
              if (j && typeof j === "object") raw = j;
            } catch { /* absent / corrupt -> zeros */ }
            const hits = Number(raw.hits) || 0;
            const misses = Number(raw.misses) || 0;
            const total = hits + misses;
            // Miss-reason segmentation + warm hit-rate (U-CAG-HITRATE-HONESTY, slot:alpha 2026-06-15).
            // MIRRORS normalizeMissReasons()/warmRateFields() in scripts/lib/galaxy-cag-cache.mjs (the
            // source of truth -- that .mjs lib is outside the mcp-server TS build, so the math is
            // duplicated here; KEEP IN SYNC). warmHitRate = hits/(hits+invalidated): the rate over
            // RECOVERABLE traffic only (cold/novel first-asks excluded); null when untrustworthy
            // (untagged legacy misses) or absent (no warm traffic) -- never a misleading 0.
            const normReasons = (mr: unknown): { novel: number; invalidated: number; error: number } => {
              const out = { novel: 0, invalidated: 0, error: 0 };
              if (mr && typeof mr === "object") {
                for (const k of Object.keys(out) as Array<keyof typeof out>) {
                  const val = (mr as Record<string, unknown>)[k];
                  if (typeof val === "number" && val > 0) out[k] = val;
                }
              }
              return out;
            };
            // legacyBaseline = pre-instrumentation untagged misses, quarantined out of the warm-rate
            // window (U-CAG-WARM-RATE-LEGACY-QUARANTINE); a NEW untagged miss beyond it still nulls.
            const warmFields = (h: number, m: number, r: { novel: number; invalidated: number; error: number }, legacyBaseline = 0) => {
              const classified = r.novel + r.invalidated + r.error;
              const legacy = Math.max(0, Math.floor(Number(legacyBaseline) || 0));
              const unclassifiedMisses = Math.max(0, m - classified - legacy);
              const recoverable = h + r.invalidated;
              const warmHitRate = unclassifiedMisses === 0 && recoverable > 0 ? h / recoverable : null;
              return { warmHitRate, addressableMisses: r.invalidated, coldMisses: r.novel, unclassifiedMisses, legacyUntaggedBaseline: legacy };
            };
            const byGalaxyRaw =
              raw.byGalaxy && typeof raw.byGalaxy === "object"
                ? (raw.byGalaxy as Record<string, { hits?: number; misses?: number; missReasons?: Record<string, number>; legacyUntaggedBaseline?: number }>)
                : {};
            const byGalaxy: Array<Record<string, unknown>> = [];
            for (const [g, v] of Object.entries(byGalaxyRaw)) {
              const h = Number(v?.hits) || 0;
              const m = Number(v?.misses) || 0;
              const t = h + m;
              const gr = normReasons(v?.missReasons);
              // Match the lib's exact guard form (typeof===number, not Number(x)||0) so the KEEP-IN-SYNC
              // contract holds byte-for-byte even on a malformed sink (scrutiny arm-B P2).
              const gBase = typeof v?.legacyUntaggedBaseline === "number" ? v.legacyUntaggedBaseline : 0;
              byGalaxy.push({ galaxy: g, hits: h, misses: m, total: t, hitRate: t > 0 ? h / t : 0, missReasons: gr, ...warmFields(h, m, gr, gBase) });
            }
            byGalaxy.sort((a, b) => Number(b.total) - Number(a.total));
            const overallReasons = normReasons(raw.missReasons);
            const rawBase = (raw as { legacyUntaggedBaseline?: number }).legacyUntaggedBaseline;
            const overallLegacyBaseline = typeof rawBase === "number" ? rawBase : 0;
            return ok({
              success: true,
              file: statsFile,
              hits,
              misses,
              total,
              hitRate: total > 0 ? hits / total : 0,
              galaxies: byGalaxy.length,
              byGalaxy,
              missReasons: overallReasons,
              ...warmFields(hits, misses, overallReasons, overallLegacyBaseline),
              updatedAt: raw.updatedAt ?? null,
            });
          }

          case "federated_rag_query": {
            // CROSS-DOMAIN-RAG-FEDERATION-MS0/U-RAGFED-RETRIEVER (slot:india).
            // Federated RAG: embed the query ONCE (shared Ollama nomic-embed-text, 768-d),
            // fan to N Qdrant collections in parallel, fuse via Reciprocal Rank Fusion + domain
            // affinity. Default Qdrant store auto-connects (QDRANT_URL / localhost:6333). When
            // `collections` is omitted, defaults to the canonical populated read-collections
            // (mirrors QdrantMemoryEngine.CANONICAL_READ_COLLECTIONS) so the action works
            // out-of-the-box for cross-knowledge retrieval. Fail-soft: a not-connected/embed
            // failure surfaces as { success:false, error } (R12), never a thrown 500.
            const fedQuery = typeof params.query === "string" ? params.query : "";
            const fedCollections = Array.isArray(params.collections)
              ? params.collections.map((c: unknown) => String(c))
              : ["prism_wiki", "prism_memories", "prism_engines", "prism_skills", "prism_formulas"];
            const { QdrantFederatedRetrieverEngine } = await import(
              "../../engines/QdrantFederatedRetrieverEngine.js"
            );
            const { QdrantMemoryEngineSingleton } = await import(
              "../../engines/QdrantMemoryEngineSingleton.js"
            );
            const fedEngine = new QdrantFederatedRetrieverEngine({
              embedder: QdrantMemoryEngineSingleton.createOllamaEmbedder(),
            });
            const fedOut = await fedEngine.federatedRetrieve({
              query: fedQuery,
              collections: fedCollections,
              limit: typeof params.limit === "number" ? params.limit : undefined,
              perCollectionLimit:
                typeof params.perCollectionLimit === "number" ? params.perCollectionLimit : undefined,
              rrfK: typeof params.rrfK === "number" ? params.rrfK : undefined,
              domainAffinity:
                typeof params.domainAffinity === "boolean" ? params.domainAffinity : undefined,
              domainBoost: typeof params.domainBoost === "number" ? params.domainBoost : undefined,
              filter:
                params.filter && typeof params.filter === "object"
                  ? (params.filter as Record<string, unknown>)
                  : undefined,
            });
            if (!fedOut.ok) return ok({ success: false, error: fedOut.error });
            return ok({ success: true, ...fedOut.value });
          }

          case "fleet_recurring_patterns": {
            // FLEET-HYGIENE/golf cross-session pattern digest. Reads the precomputed sidecar written by
            // scripts/fleet-recurring-patterns-digest.mjs (pure analysis in scripts/lib/fleet-recurring-patterns.mjs,
            // outside the mcp-server TS build -- so we READ here, mirroring cag_stats). Fail-soft: absent/corrupt
            // -> empty digest with the same shape. Optional patterns_file overrides the default (test-isolatable).
            // Path-traversal guard: an override is honored ONLY if it resolves under the dashboards dir
            // (this action is reachable by any chat; an unrestricted patterns_file -> fs.readFileSync would
            // be an arbitrary local-file read). Anything else falls back to the default (fail-soft, no throw).
            const reqPatternsFile = params.patterns_file ? String(params.patterns_file).replace(/\\/g, "/") : null;
            const PATTERNS_ALLOWED_DIR = "H:/prism/state/shared/dashboards/";
            const patternsFile =
              reqPatternsFile && reqPatternsFile.startsWith(PATTERNS_ALLOWED_DIR) && !reqPatternsFile.includes("..")
                ? reqPatternsFile
                : FLEET_RECURRING_PATTERNS_PATH;
            let digest: Record<string, unknown> = {
              regressionPatterns: [],
              scopePatterns: [],
              topCitations: [],
              fixRebreakLoops: [],
              commitCount: 0,
              citationCount: 0,
              regressionFileCount: 0,
              windowDays: null,
              generatedAt: null,
            };
            let present = false;
            try {
              const j = JSON.parse(fs.readFileSync(patternsFile, "utf-8")) as Record<string, unknown>;
              if (j && typeof j === "object") {
                digest = j;
                present = true;
              }
            } catch { /* absent / corrupt -> empty digest */ }
            const arr = (v: unknown): unknown[] => (Array.isArray(v) ? v : []);
            const generatedAt = typeof digest.generatedAt === "string" ? digest.generatedAt : null;
            const ageMsRaw = generatedAt ? Date.now() - new Date(generatedAt).getTime() : null;
            // Number.isFinite catches a malformed generatedAt (new Date("x").getTime() -> NaN); NaN != null
            // would otherwise leak NaN into ageMinutes and silently break any `ageMinutes > N` staleness check.
            const ageMs = ageMsRaw != null && Number.isFinite(ageMsRaw) ? ageMsRaw : null;
            return ok({
              success: true,
              present,
              file: patternsFile,
              generatedAt,
              ageMinutes: ageMs != null ? Math.round(ageMs / 60000) : null,
              windowDays: digest.windowDays ?? null,
              commitCount: Number(digest.commitCount) || 0,
              citationCount: Number(digest.citationCount) || 0,
              regressionFileCount: Number(digest.regressionFileCount) || 0,
              regressionClasses: arr(digest.regressionPatterns).length,
              scopeFocus: arr(digest.scopePatterns).length,
              fixRebreakLoops: arr(digest.fixRebreakLoops).length,
              regressionPatterns: arr(digest.regressionPatterns),
              scopePatterns: arr(digest.scopePatterns),
              topCitations: arr(digest.topCitations),
              fixRebreakLoopDetail: arr(digest.fixRebreakLoops),
              note: present
                ? "Read from precomputed sidecar. Regenerate: node scripts/fleet-recurring-patterns-digest.mjs"
                : "No digest yet. Generate: node scripts/fleet-recurring-patterns-digest.mjs",
            });
          }

          case "resume_session": {
            const state = await loadCurrentState();
            const progress = state.currentSession?.progress || {};
            const nextActions = progress.nextActions || [];
            
            // Fire on-session-resume hooks (3 hooks: state restore, context rebuild, warmup)
            await fireLifecycleHook("on-session-resume", { session_id: state.currentSession?.id });
            
            // W2.2: Run resume_detector for intelligent scenario detection
            let resumeDetection: any = null;
            try {
              const compactionArg = params.compaction_detected ? " --compaction-detected" : "";
              const resumeOutput = await runPythonScript("resume_detector.py", ["--json" + compactionArg]);
              resumeDetection = JSON.parse(resumeOutput);
            } catch { /* non-fatal — fall back to basic resume */ }
            
            // W2.1: Load next_session_prep if available
            let nextSessionPrep: any = null;
            try {
              const prepPath = path.join(STATE_DIR, "next_session_prep.json");
              if (fs.existsSync(prepPath)) {
                nextSessionPrep = JSON.parse(fs.readFileSync(prepPath, "utf-8"));
              }
            } catch { /* non-fatal */ }
            
            // W4: Run resume_validator for state consistency check
            let resumeValidation: any = null;
            try {
              const valOutput = await runPythonScript("resume_validator.py", ["validate", "--json"]);
              resumeValidation = JSON.parse(valOutput);
            } catch { /* non-fatal */ }
            
            return ok({ 
              success: true, state, nextActions, quickResume: state.quickResume,
              resume_detection: resumeDetection,
              resume_validation: resumeValidation,
              next_session_prep: nextSessionPrep
            });
          }
          
          case "memory_save": {
            let memory: Record<string, unknown> = {};
            if (fs.existsSync(SESSION_MEMORY_FILE)) {
              memory = loadJsonFile(SESSION_MEMORY_FILE) || {};
            }
            const category = params.category || "general";
            if (!memory[category]) {
              memory[category] = {};
            }
            (memory[category] as Record<string, unknown>)[params.key] = {
              value: params.value,
              timestamp: new Date().toISOString()
            };
            saveJsonFile(SESSION_MEMORY_FILE, memory);
            return ok({ success: true, key: params.key, category });
          }
          
          case "memory_recall": {
            if (!fs.existsSync(SESSION_MEMORY_FILE)) {
              return ok({ success: true, memory: {} });
            }
            const memory = loadJsonFile(SESSION_MEMORY_FILE) || {};
            if (params.key && params.category) {
              const categoryMem = memory[params.category] as Record<string, unknown>;
              const value = categoryMem?.[params.key];
              return ok({ success: !!value, value });
            }
            if (params.category) {
              const categoryMem = memory[params.category];
              return ok({ success: true, category: params.category, memory: categoryMem });
            }
            return ok({ success: true, categories: Object.keys(memory), memory });
          }
          
          case "context_pressure": {
            let tokensUsed = params.estimated_tokens ?? 50000;
            const percentage = tokensUsed / THRESHOLDS.MAX_TOKENS;
            const level = getPressureLevel(percentage);
            const reading = {
              timestamp: new Date().toISOString(),
              tokens_used: tokensUsed,
              percentage: Math.round(percentage * 100),
              level
            };
            let history: any[] = [];
            if (fs.existsSync(PRESSURE_LOG)) {
              const loaded = loadJsonFile(PRESSURE_LOG);
              if (Array.isArray(loaded)) history = loaded;
            }
            history.push(reading);
            if (history.length > 100) history = history.slice(-100);
            saveJsonFile(PRESSURE_LOG, history);
            // Fire on-context-pressure hooks for elevated pressure (2 hooks: pressure tracking, auto-save)
            if (level !== "GREEN") {
              fireLifecycleHook("on-context-pressure", { level, percentage: Math.round(percentage * 100) });
            }
            
            return ok({ 
              level, 
              percentage: Math.round(percentage * 100),
              tokens_used: tokensUsed,
              urgent: level === "RED" || level === "CRITICAL"
            });
          }
          
          case "context_size": {
            const state = loadJsonFile(CURRENT_STATE_FILE);
            const roadmap = loadJsonFile(ROADMAP_FILE);
            const estimates = {
              system_prompt: 5000,
              memories: 3000,
              state_file: state ? estimateTokens(JSON.stringify(state)) : 0,
              roadmap_file: roadmap ? estimateTokens(JSON.stringify(roadmap)) : 0,
              conversation: 50000,
              tools_loaded: 10000
            };
            const total = Object.values(estimates).reduce((a, b) => a + b, 0);
            const percentage = total / THRESHOLDS.MAX_TOKENS;
            return ok({ estimates, total, percentage });
          }
          
          case "context_compress": {
            const level = (params.compression_level || "MODERATE").toUpperCase();
            const result = await runPythonScript("context_compressor.py", ["--level", level]);
            const manifest = {
              compressed_at: new Date().toISOString(),
              level: params.compression_level || "moderate",
              preserved: params.preserve_categories || ["safety_critical", "current_task"]
            };
            const manifestPath = path.join(STATE_DIR, "compression_manifest.json");
            saveJsonFile(manifestPath, manifest);
            
            // Fire on-compaction hook (1 hook: compaction tracking)
            await fireLifecycleHook("on-compaction", { level: params.compression_level, manifest });
            
            return ok({ success: !result.includes("ERROR"), manifest, output: result });
          }
          
          case "context_expand": {
            const manifestPath = path.join(STATE_DIR, "compression_manifest.json");
            const manifest = loadJsonFile(manifestPath);
            if (!manifest) {
              return ok({ success: false, error: "No compressed context found" });
            }
            const result = await runPythonScript("context_expander.py", params.sections || []);
            return ok({ success: !result.includes("ERROR"), manifest, output: result });
          }
          
          case "compaction_detect": {
            const state = loadJsonFile(CURRENT_STATE_FILE);
            let isCompacted = false;
            let confidence = 0;
            const indicators: Array<{ name: string; detected: boolean }> = [];
            
            if (!state || !state.currentSession) {
              isCompacted = true;
              confidence += 0.5;
            }
            indicators.push({ name: "state_file", detected: !!state });
            
            let latestTranscript: string | null = null;
            try {
              if (fs.existsSync(TRANSCRIPTS_DIR)) {
                const files = fs.readdirSync(TRANSCRIPTS_DIR)
                  .filter(f => f.endsWith('.txt'))
                  .sort()
                  .reverse();
                if (files.length > 0) {
                  latestTranscript = files[0];
                }
              }
            } catch (e) {
              // Continue
            }

            indicators.push({ name: "transcript", detected: !!latestTranscript });
            
            const compactionType = isCompacted ? (latestTranscript ? "soft" : "hard") : "none";
            
            return ok({ 
              is_compacted: isCompacted, 
              compaction_type: compactionType,
              confidence,
              latest_transcript: latestTranscript,
              indicators
            });
          }
          
          case "transcript_read": {
            try {
              if (!fs.existsSync(TRANSCRIPTS_DIR)) {
                return ok({ error: "Transcripts directory not accessible" });
              }
              
              const files = fs.readdirSync(TRANSCRIPTS_DIR)
                .filter(f => f.endsWith('.txt'))
                .sort()
                .reverse();
              
              if (files.length === 0) {
                return ok({ error: "No transcript files found" });
              }
              
              let transcriptPath = "";
              if (params.transcript_name && params.transcript_name !== 'latest') {
                transcriptPath = path.resolve(TRANSCRIPTS_DIR, params.transcript_name);
              } else {
                transcriptPath = path.resolve(TRANSCRIPTS_DIR, files[0]);
              }

              if (!transcriptPath.startsWith(path.resolve(TRANSCRIPTS_DIR))) {
                return ok({ error: "Path traversal detected — access denied" });
              }

              if (!fs.existsSync(transcriptPath)) {
                return ok({ error: `Transcript not found: ${transcriptPath}` });
              }
              
              const content = fs.readFileSync(transcriptPath, 'utf-8');
              const lines = content.split('\n');
              const totalLines = lines.length;
              const numLines = params.lines ?? 200;
              
              let selectedLines: string[];
              if (params.from_end !== false) {
                selectedLines = lines.slice(-numLines);
              } else {
                selectedLines = lines.slice(0, numLines);
              }
              
              return ok({ 
                transcript: path.basename(transcriptPath),
                total_lines: totalLines,
                lines_shown: selectedLines.length,
                content: selectedLines.join('\n')
              });
            } catch (error: any) {
              return ok({ error: `Failed to read transcript: ${error.message}` });
            }
          }
          
          case "state_reconstruct": {
            let state = loadJsonFile(CURRENT_STATE_FILE) || {};
            
            // P2-001: Replay event log for reconstruction
            const { events, reconstructed: replayed } = replayEventLog(params.after_timestamp);
            
            state.reconstructed = {
              timestamp: new Date().toISOString(),
              from_checkpoint: params.checkpoint_id || null,
              summary: params.transcript_summary,
              event_count: events.length,
              replayed_session: replayed.session,
              replayed_phase: replayed.phase,
              timeline_tail: replayed.timeline.slice(-10),
            };
            // Use replayed data to fill gaps
            if (replayed.session && !state.session) state.session = replayed.session;
            if (replayed.phase && !state.currentSession?.phase) {
              state.currentSession = state.currentSession || {};
              state.currentSession.phase = replayed.phase;
            }
            if (replayed.quickResume) state.quickResume = replayed.quickResume;
            else state.quickResume = `RECONSTRUCTED: ${(params.transcript_summary || "").slice(0, 200)}...`;
            
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("state_reconstruct", { event_count: events.length, phase: replayed.phase });
            return ok({ reconstructed: true, events_replayed: events.length, state });
          }
          
          case "session_recover": {
            let latestTranscript: string | null = null;
            try {
              if (fs.existsSync(TRANSCRIPTS_DIR)) {
                const files = fs.readdirSync(TRANSCRIPTS_DIR)
                  .filter(f => f.endsWith('.txt'))
                  .sort()
                  .reverse();
                if (files.length > 0) {
                  latestTranscript = files[0];
                }
              }
            } catch (e) {
              // Continue
            }
            
            const state = loadJsonFile(CURRENT_STATE_FILE);
            const roadmap = loadJsonFile(ROADMAP_FILE);
            
            const quickResume = [
              state?.quickResume || "Session recovered",
              roadmap?.current_focus || ""
            ].filter(Boolean).join(" | ");
            
            // P2-001: Include event log summary for recovery
            const eventReplay = replayEventLog();
            
            return ok({ 
              transcript: latestTranscript,
              state_loaded: !!state,
              roadmap_loaded: !!roadmap,
              quickResume,
              event_log: eventReplay.events.length > 0 ? {
                total_events: eventReplay.events.length,
                last_phase: eventReplay.reconstructed.phase,
                last_session: eventReplay.reconstructed.session,
              } : null,
            });
          }
          
          case "quick_resume": {
            const state = loadJsonFile(CURRENT_STATE_FILE);
            const roadmap = loadJsonFile(ROADMAP_FILE);

            const quickResume = state?.quickResume || "No previous session";
            const currentPhase = roadmap?.current_phase || state?.currentSession?.phase || "Unknown";
            const lastCheckpoint = state?.currentSession?.progress?.lastCheckpoint || "None";
            const nextAction = state?.currentSession?.progress?.next || "Check prism_gsd_core";

            return ok({ quickResume, currentPhase, lastCheckpoint, nextAction });
          }

          // SessionReplayEngine — git-backed context (token-cheap alternative to transcript reads).
          // Wire-layer responsibility: detect the engine's synthetic-error sentinel and surface
          // a proper {ok:false, error:"git_unavailable"} discriminant to the MCP client (the engine
          // itself silent-wraps execSync failures as {hash:"error", summary:"... failed: <stderr>"};
          // without this layer, clients can't tell git-missing from a real commit literally named "error").
          // Also strips $HOME / repo-root prefix from any string fields to prevent path/username leak.
          case "replay_context": {
            const { sessionReplayEngine } = await import("../../engines/SessionReplayEngine.js");
            const maxCommits = typeof params.max_commits === "number" ? params.max_commits : 5;
            const raw = sessionReplayEngine.getReplayContext(maxCommits);
            return ok(_replayMapResult(raw));
          }
          case "replay_resume_line": {
            const { sessionReplayEngine } = await import("../../engines/SessionReplayEngine.js");
            const line = sessionReplayEngine.getResumeLine();
            return ok(_replayMapResult({ resumeLine: line }));
          }
          case "replay_working_set": {
            const { sessionReplayEngine } = await import("../../engines/SessionReplayEngine.js");
            return ok(_replayMapResult(sessionReplayEngine.getWorkingSet()));
          }
          case "replay_diff_summary": {
            const { sessionReplayEngine } = await import("../../engines/SessionReplayEngine.js");
            const ds = sessionReplayEngine.getDiffSummary();
            return ok(_replayMapResult({ diffSummary: ds }));
          }
          
          case "session_start": {
            const startTime = new Date().toISOString();
            const sessionId = `SESSION-${Date.now()}`;
            
            let state = loadJsonFile(CURRENT_STATE_FILE) || {
              version: "1.0.0",
              lastUpdated: startTime
            };
            
            state.currentSession = {
              id: sessionId,
              name: params.session_name || `Session ${startTime.split('T')[0]}`,
              startTime,
              status: "IN_PROGRESS",
              phase: state.currentSession?.phase || "0",
              progress: {}
            };
            state.lastUpdated = startTime;
            
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("session_start", { session: sessionId, session_name: state.currentSession.name, phase: state.currentSession.phase });
            saveSnapshot(); // Full state snapshot at session start
            
            // Fire on-session-start hooks (5 hooks: cognitive init, lifecycle tracking, circuit breaker reset)
            await fireLifecycleHook("on-session-start", { session: { id: sessionId, startTime: new Date(), toolCalls: 0, checkpoints: 0 } });
            
            const roadmap = loadJsonFile(ROADMAP_FILE);
            
            return ok({ session_id: sessionId, state, roadmap_loaded: !!roadmap });
          }
          
          case "session_end": {
            const endTime = new Date().toISOString();
            
            let state = loadJsonFile(CURRENT_STATE_FILE) || {};
            
            if (state.currentSession) {
              state.currentSession.endTime = endTime;
              state.currentSession.status = params.status || "IN_PROGRESS";
              state.currentSession.progress = {
                ...state.currentSession.progress,
                handoffTime: endTime,
                nextActions: params.next_actions || []
              };
            }
            
            state.quickResume = params.quick_resume ?? state.quickResume ?? "Session ended";
            state.lastUpdated = endTime;
            
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("session_end", { status: params.status, quick_resume: params.quick_resume, phase: state.currentSession?.phase });
            saveSnapshot(); // Full state snapshot at session end
            
            // Fire on-session-end hooks (4 hooks: metrics flush, state sync, learning persist)
            await fireLifecycleHook("on-session-end", { status: params.status, endTime });
            
            // D1: Graceful shutdown — capture WIP and prepare for clean handoff
            let shutdownResult: any = null;
            try {
              const shutdownOutput = await runPythonScript("graceful_shutdown.py", ["execute", "--json"]);
              shutdownResult = JSON.parse(shutdownOutput);
            } catch { /* graceful shutdown failed — non-fatal */ }
            
            // W2.1: Run next_session_prep to prepare for next session
            let nextSessionPrep: any = null;
            try {
              const prepOutput = await runPythonScript("next_session_prep.py", ["generate", "--json", "--save"]);
              nextSessionPrep = JSON.parse(prepOutput);
            } catch { /* non-fatal */ }

            // DA-MS11 UTILIZATION: Run enhanced shutdown for quality scoring + cadence tracking
            let enhancedShutdown: any = null;
            try {
              const PYTHON_PATH = PATHS.PYTHON;
              const shutdownScript = path.join(PATHS.SCRIPTS, "session_enhanced_shutdown.py");
              const summary = params.summary || params.quick_resume || "session ended";
              if (fs.existsSync(shutdownScript)) {
                const sdOutput = execFileSync(
                  PYTHON_PATH, [shutdownScript, "--summary", summary, "--json"],
                  { encoding: 'utf-8', timeout: 15000, env: { ...process.env, PYTHONIOENCODING: 'utf-8' } }
                );
                try { enhancedShutdown = JSON.parse(sdOutput); } catch { enhancedShutdown = { raw: sdOutput.slice(0, 200) }; }
              }
            } catch { /* enhanced shutdown non-fatal */ }

            // Multi-chat coordination: release all claims held by this instance
            let claimsReleased = 0;
            try {
              const instanceIdPath = path.join(PATHS.STATE_DIR || path.resolve("C:\\PRISM\\state"), "INSTANCE_ID.txt");
              if (fs.existsSync(instanceIdPath)) {
                const instanceId = fs.readFileSync(instanceIdPath, "utf-8").trim();
                claimsReleased = await TaskClaimService.releaseAll(instanceId);
              }
            } catch (e: any) { log.debug(`[session_end] claim release: ${e?.message?.slice(0, 80)}`); }

            return ok({ status: params.status, endTime, quickResume: params.quick_resume, graceful_shutdown: shutdownResult, next_session_prep: nextSessionPrep, enhanced_shutdown: enhancedShutdown, claims_released: claimsReleased });
          }
          
          case "auto_checkpoint": {
            let zone = "GREEN";
            let shouldCheckpoint = params.force || false;
            
            const toolCalls = params.tool_calls ?? 0;
            
            if (toolCalls >= 19) {
              zone = "BLACK";
              shouldCheckpoint = true;
            } else if (toolCalls >= 15) {
              zone = "RED";
              shouldCheckpoint = true;
            } else if (toolCalls >= 9) {
              zone = "YELLOW";
              shouldCheckpoint = true;
            }
            
            if (!shouldCheckpoint) {
              return ok({ zone, checkpointed: false, tool_calls: toolCalls });
            }
            
            const checkpointId = `CP-${new Date().toISOString().replace(/[:-]/g, '').split('.')[0]}`;
            
            let state = loadJsonFile(CURRENT_STATE_FILE) || {};
            state.currentSession = state.currentSession || {};
            state.currentSession.progress = state.currentSession.progress || {};
            state.currentSession.progress.lastCheckpoint = checkpointId;
            state.currentSession.progress.checkpointTime = new Date().toISOString();
            state.currentSession.progress.toolCalls = toolCalls;
            state.lastUpdated = new Date().toISOString();
            
            // D5: Session quality metric — tracks error rate, checkpoint frequency, pressure trend
            const errorCount = params.error_count ?? 0;
            const successCount = params.success_count ?? (toolCalls - errorCount);
            const errorRate = toolCalls > 0 ? errorCount / toolCalls : 0;
            const sessionQuality = Math.max(0, Math.min(1, 1 - (errorRate * 2) - (zone === "BLACK" ? 0.3 : zone === "RED" ? 0.15 : 0)));
            
            state.currentSession.progress.sessionQuality = sessionQuality;
            state.currentSession.progress.errorRate = errorRate;
            
            saveJsonFile(CURRENT_STATE_FILE, state);
            appendEvent("auto_checkpoint", { checkpoint_id: checkpointId, zone, toolCalls, phase: state.currentSession?.phase, sessionQuality });
            
            return ok({ zone, checkpointed: true, checkpoint_id: checkpointId, tool_calls: toolCalls, session_quality: sessionQuality, error_rate: errorRate });
          }

          // ================================================================
          // D1: SESSION RESILIENCE — Wired Python modules
          // ================================================================

          case "wip_capture": {
            const desc = params.description || params.notes || "WIP capture";
            const wArgs = ["capture-task", desc, "--json"];
            if (params.next) wArgs.push("--next", params.next);
            if (params.completed) wArgs.push("--completed", String(params.completed));
            if (params.total) wArgs.push("--total", String(params.total));
            const output = await runPythonScript("wip_capturer.py", wArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "wip_list": {
            const output = await runPythonScript("wip_capturer.py", ["list", "--json"]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "wip_restore": {
            const wipId = params.wip_id || params.id;
            if (!wipId) return ok({ error: "Missing wip_id parameter" });
            const output = await runPythonScript("wip_capturer.py", ["restore", wipId, "--json"]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "state_rollback": {
            const subcommand = params.subcommand || "preview";
            const target = params.checkpoint_id || params.target || "";
            const rbArgs = [subcommand];
            if (target) rbArgs.push(target);
            rbArgs.push("--json");
            const output = await runPythonScript("state_rollback.py", rbArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "resume_score": {
            // W4: Enhanced with resume_validator.py for comprehensive resume assessment
            const subcommand = params.subcommand || "validate";
            const validCommands = ["detect", "validate", "generate", "actions"];
            
            if (validCommands.includes(subcommand)) {
              const rvArgs = [subcommand, "--json"];
              if (subcommand === "generate" && params.level) {
                rvArgs.push("--level", params.level);
              }
              if (subcommand === "generate" && params.save) {
                rvArgs.push("--save");
              }
              const output = await runPythonScript("resume_validator.py", rvArgs);
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            
            // Fallback: original recovery_scorer
            const output = await runPythonScript("recovery_scorer.py", ["--json"]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "checkpoint_enhanced": {
            const sub = params.subcommand || "list";
            
            // W4: Route mapper commands to checkpoint_mapper.py
            const mapperCommands = ["chain", "summary", "sessions"];
            if (mapperCommands.includes(sub)) {
              const mapArgs = [sub === "sessions" ? "list" : sub];
              if (params.session_id) mapArgs.push("--session", params.session_id);
              if (params.checkpoint_id) mapArgs.push(params.checkpoint_id);
              const output = await runPythonScript("checkpoint_mapper.py", mapArgs);
              try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
            }
            
            // Default: checkpoint_mgr.py for create/get/list/delete
            const cpArgs = [sub];
            if (params.checkpoint_id) cpArgs.push(params.checkpoint_id);
            cpArgs.push("--json");
            const output = await runPythonScript("checkpoint_mgr.py", cpArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          // ── W6.1: Workflow Tracker ───────────────────────────────
          case "workflow_start": {
            const wfType = params.type || params.workflow_type;
            if (!wfType) return ok({ error: "Missing 'type' parameter", available: ["session_boot", "bug_fix", "feature_implement", "build_verify", "code_search_edit", "validation", "refactor"] });
            const wfArgs = ["start", wfType];
            if (params.name) wfArgs.push("--name", params.name);
            const output = await runPythonScript("workflow_tracker.py", wfArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "workflow_advance": {
            const wfArgs = ["advance"];
            if (params.intent) wfArgs.push("--intent", params.intent);
            if (params.notes) wfArgs.push("--notes", params.notes);
            if (params.files) {
              wfArgs.push("--files");
              const fileList = Array.isArray(params.files) ? params.files : [params.files];
              wfArgs.push(...fileList);
            }
            const output = await runPythonScript("workflow_tracker.py", wfArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "workflow_status": {
            const sub = params.subcommand || "status";
            const output = await runPythonScript("workflow_tracker.py", [sub]);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }

          case "workflow_complete": {
            const sub = params.abort ? "abort" : "complete";
            const wfArgs = [sub];
            if (params.reason) wfArgs.push("--reason", params.reason);
            const output = await runPythonScript("workflow_tracker.py", wfArgs);
            try { return ok(JSON.parse(output)); } catch { return ok({ raw: output }); }
          }
          
          case "health_check": {
            // W4-1: Session Health Signal
            // Thresholds: GREEN (healthy) / YELLOW (aging) / RED (wrap up)
            const HEALTH_THRESHOLDS = {
              CALL_YELLOW: 20, CALL_RED: 35,
              TOKEN_YELLOW: 50000, TOKEN_RED: 80000,
              COMPACTION_YELLOW: 1, COMPACTION_RED: 2
            };

            // Get call count from pressure log (proxy for session calls)
            let callCount = 0;
            let latestTokens = 0;
            let compactionCount = 0;
            if (fs.existsSync(PRESSURE_LOG)) {
              const history = loadJsonFile(PRESSURE_LOG);
              if (Array.isArray(history)) {
                callCount = history.length;
                if (history.length > 0) {
                  latestTokens = history[history.length - 1].tokens_used ?? 0;
                }
              }
            }
            // Count compaction events from session events
            if (fs.existsSync(EVENT_LOG_FILE)) {
              try {
                const eventLines = fs.readFileSync(EVENT_LOG_FILE, "utf-8").split("\n").filter(Boolean);
                for (const line of eventLines) {
                  try {
                    const evt = JSON.parse(line);
                    if (evt.type === "compaction" || evt.event === "compaction") compactionCount++;
                  } catch { /* skip malformed */ }
                }
              } catch { /* no events */ }
            }

            // Allow override from params
            const estimatedTokens = params.estimated_tokens ?? latestTokens ?? 0;
            const calls = params.call_count ?? callCount;
            const compactions = params.compaction_count ?? compactionCount;

            // Determine health status
            let healthStatus: "GREEN" | "YELLOW" | "RED" = "GREEN";
            const reasons: string[] = [];
            if (calls > HEALTH_THRESHOLDS.CALL_RED || estimatedTokens > HEALTH_THRESHOLDS.TOKEN_RED || compactions >= HEALTH_THRESHOLDS.COMPACTION_RED) {
              healthStatus = "RED";
              if (calls > HEALTH_THRESHOLDS.CALL_RED) reasons.push(`calls=${calls} (>${HEALTH_THRESHOLDS.CALL_RED})`);
              if (estimatedTokens > HEALTH_THRESHOLDS.TOKEN_RED) reasons.push(`tokens=${estimatedTokens} (>${HEALTH_THRESHOLDS.TOKEN_RED})`);
              if (compactions >= HEALTH_THRESHOLDS.COMPACTION_RED) reasons.push(`compactions=${compactions} (>=${HEALTH_THRESHOLDS.COMPACTION_RED})`);
            } else if (calls > HEALTH_THRESHOLDS.CALL_YELLOW || estimatedTokens > HEALTH_THRESHOLDS.TOKEN_YELLOW || compactions >= HEALTH_THRESHOLDS.COMPACTION_YELLOW) {
              healthStatus = "YELLOW";
              if (calls > HEALTH_THRESHOLDS.CALL_YELLOW) reasons.push(`calls=${calls} (>${HEALTH_THRESHOLDS.CALL_YELLOW})`);
              if (estimatedTokens > HEALTH_THRESHOLDS.TOKEN_YELLOW) reasons.push(`tokens=${estimatedTokens} (>${HEALTH_THRESHOLDS.TOKEN_YELLOW})`);
              if (compactions >= HEALTH_THRESHOLDS.COMPACTION_YELLOW) reasons.push(`compactions=${compactions} (>=${HEALTH_THRESHOLDS.COMPACTION_YELLOW})`);
            }

            // Get last position save time
            let lastPositionSave: string | null = null;
            const posFile = path.join(PATHS.MCP_SERVER, "data", "docs", "roadmap", "CURRENT_POSITION.md");
            if (fs.existsSync(posFile)) {
              lastPositionSave = fs.statSync(posFile).mtime.toISOString();
            }

            const advisory = healthStatus === "RED"
              ? "Complete current step, write handoff, stop."
              : healthStatus === "YELLOW"
              ? "Session aging. Save state, consider wrapping up."
              : "Healthy. Continue normally.";

            // SYS-MS6: Schema coverage metric
            const schemaCoverage = {
              dispatchers_with_schemas: 7,
              total_dispatchers: 45,
              actions_with_schemas: 147,
              covered: ["prism_calc(48)", "prism_safety(29)", "prism_5axis(5)", "prism_thread(13)", "prism_data(35)", "prism_toolpath(9)", "prism_export(8)"],
            };

            return ok({
              health_status: healthStatus,
              call_count: calls,
              estimated_tokens: estimatedTokens,
              compaction_count: compactions,
              last_position_save: lastPositionSave,
              reasons,
              advisory,
              schema_coverage: schemaCoverage,
            });
          }

          case "dsl_mode": {
            // L0-P1-MS1: DSL compression mode toggle
            // Persists to CURRENT_STATE.json under dsl_mode key
            const DSL_STATE_KEY = "dsl_mode";
            const mode = params.mode; // "enable" | "disable" | "status"
            const state = loadJsonFile(CURRENT_STATE_FILE) || {};

            if (mode === "enable") {
              state[DSL_STATE_KEY] = { enabled: true, activated_at: new Date().toISOString() };
              saveJsonFile(CURRENT_STATE_FILE, state);
              return ok({ dsl_mode: "enabled", message: "DSL compression active. Dispatcher responses will use abbreviated terms." });
            } else if (mode === "disable") {
              state[DSL_STATE_KEY] = { enabled: false, deactivated_at: new Date().toISOString() };
              saveJsonFile(CURRENT_STATE_FILE, state);
              return ok({ dsl_mode: "disabled", message: "DSL compression disabled. Full terms will be used." });
            } else {
              // status
              const dslState = state[DSL_STATE_KEY] || { enabled: false };
              return ok({ dsl_mode: dslState.enabled ? "enabled" : "disabled", state: dslState });
            }
          }

          case "context_preload": {
            const { contextPreloaderEngine } = await import("../../engines/ContextPreloaderEngine.js");
            const ctx = contextPreloaderEngine.getPreloadContext();
            return ok(ctx);
          }
          case "context_boot": {
            const { contextPreloaderEngine: cpe } = await import("../../engines/ContextPreloaderEngine.js");
            const boot = cpe.getBootBlock();
            return ok(boot);
          }
          case "context_delta_boot": {
            const { contextPreloaderEngine: cpe2 } = await import("../../engines/ContextPreloaderEngine.js");
            const sinceCommit = params.since_commit || params.commit || "HEAD~10";
            const delta = cpe2.getDeltaBoot(sinceCommit);
            return ok(delta);
          }
          case "quick_ref_regenerate": {
            const { contextPreloaderEngine: cpe3 } = await import("../../engines/ContextPreloaderEngine.js");
            const result = cpe3.regenerateQuickRef();
            return ok(result);
          }
          case "session_delta": {
            const hours = params.hours ? Number(params.hours) : 24;
            const report = sessionDeltaEngine.getRecentActivity(hours);
            return ok(report);
          }

          case "session_bookmark": {
            const bookmark = sessionDeltaEngine.getSessionBookmark();
            return ok(bookmark);
          }

          case "session_compare_bookmark": {
            const bookmark = params.bookmark;
            if (!bookmark || !bookmark.commitHash || !bookmark.timestamp) {
              return ok({ error: "bookmark param required with commitHash, timestamp, engineCount, dispatcherCount, testCount, actionCount" });
            }
            const delta = sessionDeltaEngine.compareBookmark(bookmark);
            return ok(delta);
          }

          // ================================================================
          // system_snapshot — Ultra-compact single-line system summary
          // ================================================================
          case "system_snapshot": {
            const snapshot = systemSnapshotEngine.getCompactSnapshot();
            return ok({ snapshot });
          }

          // ================================================================
          // system_snapshot_layered — Depth-controlled snapshot
          // ================================================================
          case "system_snapshot_layered": {
            const depth = (params.depth || 'standard') as SnapshotDepth;
            const snapshot = systemSnapshotEngine.getLayeredSnapshot(depth);
            return ok({ depth, snapshot });
          }

          // ================================================================
          // system_drift_report — Live vs documented count comparison
          // ================================================================
          case "system_drift_report": {
            const report = systemSnapshotEngine.getDriftReport();
            return ok(report);
          }

          // ================================================================
          // dispatcher_map — Full dispatcher action catalog
          // ================================================================
          case "dispatcher_map": {
            const { dispatcherMapEngine } = await import("../../engines/DispatcherMapEngine.js");
            return ok(dispatcherMapEngine.getCounts());
          }

          case "dispatcher_map_compact": {
            const { dispatcherMapEngine: dme } = await import("../../engines/DispatcherMapEngine.js");
            const max = params.max_per_dispatcher ? Number(params.max_per_dispatcher) : 5;
            return ok({ map: dme.getCompactMap(max) });
          }

          // HOOK-SYNERGY-MS0/U-HOOK-REGISTRY (H2) — event → top-N hook ids (parallel of dispatcher_map_compact for hooks)
          case "hook_map_compact": {
            const { hookRegistryReaderEngine } = await import("../../engines/HookRegistryReaderEngine.js");
            const max = params.max_per_event != null ? Number(params.max_per_event) : 5;
            return ok({ map: hookRegistryReaderEngine.getCompactMap(max) });
          }

          // OBSIDIAN-PRISM-OS-MS0/U-MASTER-INDEX (2 actions): unified ranked
          // search across system-viz graph + Obsidian vault + capability index
          // + BUILD_STATE. Future hot path under master-index-precheck-inject
          // hook — replaces N Grep/Glob/Agent calls.
          // PSN-ENHANCE-MS0/U-PSN-HYBRID-MCP-WIRE (sierra iter26 2026-05-25):
          // closes iter-18 follow-up. Cross-tree dynamic import via file://
          // URL bypasses src/ boundary so MCP + CLI + skill share one
          // implementation (duplicate-guard would block a copy under
          // mcp-server/src/engines).
          //
          // U-PSN-HYBRID-MCP-VERIFY (sierra iter27 2026-05-26): case body
          // hoisted into ./sessionHybridSearchAction.ts so it can be
          // exercised under vitest with mock deps. Behavior identical to
          // iter26 — same defaults, same params accepted.
          case "hybrid_search": {
            const { runHybridSearchAction } = await import("./sessionHybridSearchAction.js");
            const result = await runHybridSearchAction(params as Parameters<typeof runHybridSearchAction>[0]);
            return ok(result);
          }

          // SIERRA-LEVERAGE/U-N1-RANKED-HYBRID (sierra 2026-05-29): re-rank master-index
          // hits by RRF-fusing confidence (lexical) vs utilization (structural importance).
          // OOM-safe — reuses MasterIndexEngine's cached index; no live PageRank on the 548MB graph.
          case "master_index_ranked_hybrid": {
            const { rankedHybridGraphSearchEngine } = await import("../../engines/RankedHybridGraphSearchEngine.js");
            const query = String(params.query ?? params.q ?? "");
            const opts: Record<string, unknown> = {};
            if (params.limit != null) opts.limit = Number(params.limit);
            if (Array.isArray(params.layers)) opts.layers = params.layers;
            if (Array.isArray(params.sources)) opts.sources = params.sources;
            if (params.min_utilization != null) opts.minUtilization = Number(params.min_utilization);
            if (params.min_confidence != null) opts.minConfidence = Number(params.min_confidence);
            if (Array.isArray(params.build_classes)) opts.buildClasses = params.build_classes;
            if (typeof params.stopwords === "string" || Array.isArray(params.stopwords)) opts.stopwords = params.stopwords;
            if (params.rrf_k != null) opts.rrfK = Number(params.rrf_k);
            if (params.top_k != null) opts.topK = Number(params.top_k);
            const result = await rankedHybridGraphSearchEngine.search(query, opts as Parameters<typeof rankedHybridGraphSearchEngine.search>[1]);
            return ok(result);
          }

          case "master_index_query": {
            const { masterIndexEngine } = await import("../../engines/MasterIndexEngine.js");
            const query = String(params.query ?? params.q ?? "");
            const opts: Record<string, unknown> = {};
            if (params.limit != null) opts.limit = Number(params.limit);
            if (Array.isArray(params.layers)) opts.layers = params.layers;
            if (Array.isArray(params.sources)) opts.sources = params.sources;
            if (params.min_utilization != null) opts.minUtilization = Number(params.min_utilization);
            if (params.min_confidence != null) opts.minConfidence = Number(params.min_confidence);
            if (Array.isArray(params.build_classes)) opts.buildClasses = params.build_classes;
            // BACKEND-DEV-LOOP/U-MIQ-STOPWORDS-CONFIG (iter-2): pass either
            // string mode ('default'|'minimal'|'off') or custom string[] through
            // verbatim; engine's resolveStopwords() defends against unknowns.
            if (typeof params.stopwords === "string" || Array.isArray(params.stopwords)) {
              opts.stopwords = params.stopwords;
            }
            const result = await masterIndexEngine.query(query, opts as Parameters<typeof masterIndexEngine.query>[1]);
            return ok(result);
          }

          case "master_index_node_status": {
            const { masterIndexEngine } = await import("../../engines/MasterIndexEngine.js");
            const id = String(params.id ?? "");
            const result = await masterIndexEngine.getNodeStatus(id);
            return ok(result);
          }

          // OBSIDIAN-PRISM-OS-MS0/U-NODE-UTILIZATION: graph-wide bucket classifier
          case "master_index_utilization_dashboard": {
            const { masterIndexEngine } = await import("../../engines/MasterIndexEngine.js");
            const opts: Record<string, unknown> = {};
            if (Array.isArray(params.layers)) opts.layers = params.layers;
            if (Array.isArray(params.exclude_layers)) opts.excludeLayers = params.exclude_layers;
            const result = await masterIndexEngine.classifyAllNodes(opts as Parameters<typeof masterIndexEngine.classifyAllNodes>[0]);
            return ok(result);
          }

          // CHEAP-NODE-ACCESS-MS0/U-NODECARD-DISPATCHER (sierra 2026-06-04): token-cheap
          // node-card read-by-id. Delegates to runNodeCardAction with a real
          // execFileSync-backed runner (argv array, NO shell — ids are positional args)
          // that calls the single-source CLI `system-viz-query.mjs node-card --json`,
          // which SEEKS the offset index (parse 24MB once, fs.read exact bytes) — never
          // the 644MB graph, and never a fork of the .mjs reader.
          case "node_card": {
            const { runNodeCardAction } = await import("./sessionNodeCardAction.js");
            const scriptPath = path.join(PATHS.PRISM_ROOT, "scripts", "system-viz-query.mjs");
            const result = runNodeCardAction(params, {
              runCli: (ids: string[]) => execFileSync(
                process.execPath,
                [scriptPath, "node-card", ...ids, "--json"],
                { encoding: "utf8", timeout: 12000, maxBuffer: 16 * 1024 * 1024 },
              ),
            });
            return ok(result);
          }

          // SYSTEM-VIZ/U-VIZ-NEAR (sierra 2026-06-25): semantic nearest-neighbor node
          // search. Delegates to runNodeNearAction with the same execFileSync-backed
          // runner pattern (argv array, NO shell) calling the single-source CLI
          // `system-viz-query.mjs near <id> --k <k> --json`, which streams the 768d
          // embedding pool -- never the 884MB graph, never a fork of the search logic.
          case "node_near": {
            const { runNodeNearAction } = await import("./sessionNodeNearAction.js");
            const scriptPath = path.join(PATHS.PRISM_ROOT, "scripts", "system-viz-query.mjs");
            const result = runNodeNearAction(params, {
              runCli: (id: string, k: number) => execFileSync(
                process.execPath,
                [scriptPath, "near", id, "--k", String(k), "--json"],
                { encoding: "utf8", timeout: 15000, maxBuffer: 16 * 1024 * 1024 },
              ),
            });
            return ok(result);
          }

          // CHEAP-NODE-ACCESS-MS0/U-VBL-DISPATCHER (sierra 2026-06-09): REVERSE of
          // node_card. Given a vault doc (wiki path or memory slug), list the graph
          // node(s) that document it. Delegates to runDocNodesAction with the same
          // execFileSync-backed runner pattern (argv array, NO shell — the key is one
          // positional arg) calling the single-source CLI `system-viz-query.mjs
          // doc-nodes <key> --json`, which reads vault-backlinks.json — never the
          // 644MB graph, never a fork of the .mjs reader.
          case "doc_nodes": {
            const { runDocNodesAction } = await import("./sessionDocNodesAction.js");
            const scriptPath = path.join(PATHS.PRISM_ROOT, "scripts", "system-viz-query.mjs");
            const result = runDocNodesAction(params, {
              runCli: (key: string) => execFileSync(
                process.execPath,
                [scriptPath, "doc-nodes", key, "--json"],
                { encoding: "utf8", timeout: 12000, maxBuffer: 16 * 1024 * 1024 },
              ),
            });
            return ok(result);
          }

          // GRAPH-AS-LLM-CONTEXT-MS0/U-GAC04: build a dual-channel subagent-context
          // bundle (JSON ego-graph + visual layer) around a node. Composes GAC01;
          // the viz channel is best-effort PNG (system Chrome) with a guaranteed
          // mermaid+markdown fallback. The default embed="path" keeps the payload small.
          case "dual_channel_dispatch": {
            const { dualChannelContextEngine } = await import("../../engines/DualChannelContextEngine.js");
            const nodeId = params.nodeId || params.id || "";
            // Pre-validate so a missing node id surfaces as a structured dispatcherError
            // (same shape as a schema failure) rather than a raw engine throw caught downstream.
            if (typeof nodeId !== "string" || nodeId.trim() === "") {
              return dispatcherError(
                "dual_channel_dispatch requires a non-empty nodeId (or id)",
                action,
                "prism_session",
              );
            }
            const prompt = params.prompt || params.subagentPrompt || "";
            const bundle = await dualChannelContextEngine.buildDualChannel(prompt, nodeId, {
              mode: params.mode,
              hops: params.hops != null ? Number(params.hops) : undefined,
              maxNodes: params.maxNodes != null ? Number(params.maxNodes) : undefined,
              layer: params.layer,
              embed: params.embed,
              maxPngBytes: params.maxPngBytes != null ? Number(params.maxPngBytes) : undefined,
              outDir: typeof params.outDir === "string" ? params.outDir : undefined,
              enrich: params.enrich,
              adjacencyPath: params.adjacencyPath,
            });
            return ok(bundle);
          }

          // GRAPH-AS-LLM-CONTEXT-MS0/U-GAC05: resolve a free-text alias/paraphrase to a
          // canonical node-id (or a candidate list when ambiguous) so N agents coordinate
          // by node-id mention, not paraphrase. Composes GAC02's find-cache. Accepts a
          // single text (text|alias|query|q) or a batch (aliases[]).
          case "spatial_resolve": {
            const { spatialAddressBookEngine } = await import("../../engines/SpatialAddressBookEngine.js");
            const common = {
              findCachePath: params.findCachePath,
              maxCandidates: params.maxCandidates != null ? Number(params.maxCandidates) : undefined,
              minFuzzy: params.minFuzzy != null ? Number(params.minFuzzy) : undefined,
              ambiguityMargin: params.ambiguityMargin != null ? Number(params.ambiguityMargin) : undefined,
            };
            if (Array.isArray(params.aliases)) {
              return ok({ results: spatialAddressBookEngine.resolveMany(params.aliases, common) });
            }
            const text = params.text || params.alias || params.query || params.q || "";
            if (typeof text !== "string" || text.trim() === "") {
              return dispatcherError(
                "spatial_resolve requires a non-empty 'text' (or an 'aliases' array)",
                action,
                "prism_session",
              );
            }
            return ok(spatialAddressBookEngine.resolveAlias(text, common));
          }

          case "action_search": {
            const { dispatcherMapEngine: dme2 } = await import("../../engines/DispatcherMapEngine.js");
            const q = params.query || params.q || "";
            const max = params.max_results ? Number(params.max_results) : 20;
            return ok(dme2.searchActions(q, max));
          }

          case "action_find": {
            const { dispatcherMapEngine: dme3 } = await import("../../engines/DispatcherMapEngine.js");
            const action_name = params.action || params.name || "";
            const result = dme3.findAction(action_name);
            return ok(result || { error: `Action '${action_name}' not found` });
          }

          // ================================================================
          // tool_route — Intent-based routing for token efficiency
          // ================================================================
          case "tool_route": {
            const { toolRouterEngine } = await import("../../engines/ToolRouterEngine.js");
            const intent = params.intent || params.query || params.q || "";
            return ok(toolRouterEngine.route(intent));
          }

          case "tool_route_best": {
            const { toolRouterEngine: tr } = await import("../../engines/ToolRouterEngine.js");
            const intent = params.intent || params.query || params.q || "";
            const best = tr.bestRoute(intent);
            return ok(best || { error: "No route found for intent" });
          }

          // ================================================================
          // Coordination Ledger — CoordinationLedgerEngine bridge
          // ================================================================
          case "coordination_record": {
            const { coordinationLedgerEngine } = await import("../../engines/CoordinationLedgerEngine.js");
            const ledgerPath = (params.ledger_path as string) || path.join(STATE_DIR, "..", "..", "state", "shared", "COORDINATION_LEDGER.jsonl");
            const at = params.at != null ? Number(params.at) : Date.now();
            if (!Number.isFinite(at)) return ok({ error: "at must be a finite epoch-ms value" });
            if (!params.agent || !params.kind || !params.target) {
              return ok({ error: "agent, kind, and target are required" });
            }
            const event = coordinationLedgerEngine.record({
              agent: String(params.agent),
              kind: params.kind as any,
              target: String(params.target),
              payload: params.payload,
              at,
            });
            try {
              const dir = path.dirname(ledgerPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              fs.appendFileSync(ledgerPath, JSON.stringify(event) + "\n", "utf8");
            } catch (err: any) {
              return ok({ success: false, error: `append failed: ${err.message}`, event });
            }
            return ok({ success: true, event, ledger_path: ledgerPath, count: coordinationLedgerEngine.count() });
          }

          case "coordination_detect_conflicts": {
            const { CoordinationLedgerEngine } = await import("../../engines/CoordinationLedgerEngine.js");
            const ledgerPath = (params.ledger_path as string) || path.join(STATE_DIR, "..", "..", "state", "shared", "COORDINATION_LEDGER.jsonl");
            const windowMs = params.window_ms != null ? Number(params.window_ms) : 30_000;
            const ledger = new CoordinationLedgerEngine();
            let hydrateResult = { hydrated: 0, skipped: 0, errors: [] as any[] };
            if (fs.existsSync(ledgerPath)) {
              const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
              hydrateResult = ledger.hydrateFromJSONL(lines);
            }
            const conflicts = ledger.detectConflicts(windowMs);
            return ok({ success: true, conflicts, count: ledger.count(), hydrate: hydrateResult, ledger_path: ledgerPath, window_ms: windowMs });
          }

          case "coordination_recent": {
            const { CoordinationLedgerEngine } = await import("../../engines/CoordinationLedgerEngine.js");
            const ledgerPath = (params.ledger_path as string) || path.join(STATE_DIR, "..", "..", "state", "shared", "COORDINATION_LEDGER.jsonl");
            const since = params.since != null ? Number(params.since) : Date.now() - 60 * 60 * 1000;
            const ledger = new CoordinationLedgerEngine();
            if (fs.existsSync(ledgerPath)) {
              const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
              ledger.hydrateFromJSONL(lines);
            }
            let events = ledger.since(since);
            if (params.agent) events = events.filter((e) => e.agent === String(params.agent));
            if (params.target) events = events.filter((e) => e.target === String(params.target));
            return ok({ success: true, events, count: events.length, since, ledger_path: ledgerPath });
          }

          case "coordination_count": {
            const { CoordinationLedgerEngine } = await import("../../engines/CoordinationLedgerEngine.js");
            const ledgerPath = (params.ledger_path as string) || path.join(STATE_DIR, "..", "..", "state", "shared", "COORDINATION_LEDGER.jsonl");
            const ledger = new CoordinationLedgerEngine();
            if (fs.existsSync(ledgerPath)) {
              const lines = fs.readFileSync(ledgerPath, "utf8").split(/\r?\n/);
              ledger.hydrateFromJSONL(lines);
            }
            return ok({ success: true, count: ledger.count(), ledger_path: ledgerPath });
          }

          // ================================================================
          // ENGINE-WIRE-MS0/U-WIRE22: AgentSelfAwarenessEngine
          // Unified self-awareness across capabilities + engines
          // ================================================================
          case "self_awareness_build": {
            const { agentSelfAwarenessEngine } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const forceRefresh = params.force_refresh === true || params.forceRefresh === true;
            const awareness = await agentSelfAwarenessEngine.buildAwareness(forceRefresh);
            return ok({
              stats: awareness.stats,
              topCapabilities: awareness.topCapabilities,
              topEngines: awareness.topEngines.slice(0, 10),
              refreshedAt: awareness.refreshedAt.toISOString(),
            });
          }

          case "self_awareness_search": {
            const { agentSelfAwarenessEngine: asa1 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const query = typeof params.query === "string" ? params.query : (typeof params.q === "string" ? params.q : "");
            if (!query) return ok({ error: "Missing 'query' parameter" });
            const limit = Number.isFinite(Number(params.limit)) ? Number(params.limit) : 20;
            const results = await asa1.search(query, limit);
            return ok({
              query,
              count: results.length,
              results: results.map(r => ({
                type: r.type,
                name: r.name,
                description: r.description,
                category: r.category,
                score: r.score,
              })),
            });
          }

          case "self_awareness_context_summary": {
            const { agentSelfAwarenessEngine: asa2 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const maxTokens = Number.isFinite(Number(params.max_tokens))
              ? Number(params.max_tokens)
              : (Number.isFinite(Number(params.maxTokens)) ? Number(params.maxTokens) : 500);
            const summary = await asa2.getContextSummary(maxTokens);
            return ok(summary);
          }

          case "self_awareness_health": {
            const { agentSelfAwarenessEngine: asa3 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const health = await asa3.getHealthCheck();
            return ok(health);
          }

          case "self_awareness_quick_stats": {
            const { agentSelfAwarenessEngine: asa4 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const stats = await asa4.getQuickStats();
            return ok(stats);
          }

          case "self_awareness_recommended_actions": {
            const { agentSelfAwarenessEngine: asa5 } = await import("../../engines/AgentSelfAwarenessEngine.js");
            const task = typeof params.task === "string" ? params.task : (typeof params.query === "string" ? params.query : "");
            if (!task) return ok({ error: "Missing 'task' parameter" });
            const recs = await asa5.getRecommendedActions(task);
            return ok(recs);
          }

          // ── COGNITIVE-BRIDGE-MS0/U-WIRE-COG-BATCH4: Awareness ──
          case "awareness_unified_query": {
            const { unifiedAwarenessOrchestrator } = await import("../../engines/UnifiedAwarenessOrchestrator.js");
            const result = await unifiedAwarenessOrchestrator.query({
              query: params.query,
              domain: params.domain ?? "all",
              context: params.context,
              limit: params.limit,
            });
            return ok({ result });
          }
          case "awareness_command_detect": {
            const { unifiedCommandAwarenessEngine } = await import("../../engines/UnifiedCommandAwarenessEngine.js");
            const suggestion = await unifiedCommandAwarenessEngine.detectCommands(params.input);
            return ok({ suggestion });
          }
          case "awareness_command_suggest_string": {
            const { unifiedCommandAwarenessEngine } = await import("../../engines/UnifiedCommandAwarenessEngine.js");
            const text = await unifiedCommandAwarenessEngine.getSuggestionString(params.input);
            return ok({ suggestion: text });
          }
          case "awareness_filter": {
            const { situationalAwarenessFilterEngine } = await import("../../engines/SituationalAwarenessFilterEngine.js");
            const result = situationalAwarenessFilterEngine.filter(params.directive, params.prompt, {
              maxLines: params.max_lines,
              minScore: params.min_score,
              alwaysKeepHeaders: params.always_keep_headers,
            });
            return ok({ result });
          }
          case "awareness_lifecycle_get_current": {
            // Engine has no module singleton — per-session factory. Use the
            // shared dispatcher-scoped lifecycle (cached lazily, keyed by
            // session_id param or a default "dispatcher-default").
            const { createSessionAwarenessLifecycle } = await import("../../engines/SessionAwarenessLifecycleEngine.js");
            const sid = (typeof params.session_id === "string" && params.session_id.length > 0)
              ? params.session_id
              : "dispatcher-default";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cache = (globalThis as any).__prismLifecycleCache ?? new Map<string, ReturnType<typeof createSessionAwarenessLifecycle>>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).__prismLifecycleCache = cache;
            let engine = cache.get(sid);
            if (!engine) {
              engine = createSessionAwarenessLifecycle(sid);
              cache.set(sid, engine);
            }
            return ok({
              current: engine.getCurrent(),
              session_id: engine.getSessionId(),
              execute_to_metacog_count: engine.getExecuteToMetacogCount(),
            });
          }
          case "awareness_lifecycle_get_history": {
            const { createSessionAwarenessLifecycle } = await import("../../engines/SessionAwarenessLifecycleEngine.js");
            const sid = (typeof params.session_id === "string" && params.session_id.length > 0)
              ? params.session_id
              : "dispatcher-default";
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const cache = (globalThis as any).__prismLifecycleCache ?? new Map<string, ReturnType<typeof createSessionAwarenessLifecycle>>();
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            (globalThis as any).__prismLifecycleCache = cache;
            let engine = cache.get(sid);
            if (!engine) {
              engine = createSessionAwarenessLifecycle(sid);
              cache.set(sid, engine);
            }
            return ok({ history: engine.getHistory() });
          }

          // OBSIDIAN-AUTOMATE-MS3/U-OLLAMA-HEALTH-EXPOSE — surface Ollama daemon health
          case "ollama_health": {
            const { ollamaIntegrationEngine } = await import("../../engines/OllamaIntegrationEngine.js");
            const probeFresh = params.probe_fresh === true || params.probeFresh === true;
            const refreshModels = params.refresh_models === true || params.refreshModels === true;
            const health = probeFresh
              ? await ollamaIntegrationEngine.ping()
              : ollamaIntegrationEngine.snapshotHealth();
            const models = await ollamaIntegrationEngine.discoverModels(refreshModels);
            return ok({
              connected: health.connected,
              host: health.host,
              lastPingAt: health.lastPingAt,
              lastPingOk: health.lastPingOk,
              lastPingLatencyMs: health.lastPingLatencyMs,
              avgLatencyMs: health.avgLatencyMs,
              okStreak: health.okStreak,
              failStreak: health.failStreak,
              pingsAttempted: health.pingsAttempted,
              models,
              defaultModelMap: ollamaIntegrationEngine.listDefaults(),
              status: ollamaIntegrationEngine.status(),
            });
          }

          // HTML-PRIMARY-MS0/U-HPS07 — general doc → HTML render (mirrors prism_dev:spec_html_render; wire-to-all-consumers)
          case "doc_render": {
            const { specHtmlCompanionEngine } = await import("../../engines/SpecHTMLCompanionEngine.js");
            const projRoot = path.resolve(PATHS.PRISM_ROOT);
            let md = typeof params.md === "string" ? params.md : (typeof params.markdown === "string" ? params.markdown : "");
            let srcPath: string | undefined;
            if (!md && typeof params.path === "string" && params.path) {
              const abs = path.isAbsolute(params.path) ? params.path : path.join(projRoot, params.path);
              const resolved = path.resolve(abs);
              // require a trailing separator so a sibling like H:/prism-cad-complete can't satisfy the prefix check
              if (resolved !== projRoot && !resolved.startsWith(projRoot + path.sep)) return ok({ success: false, error: "path escapes PRISM root" });
              if (!fs.existsSync(resolved)) return ok({ success: false, error: `file not found: ${params.path}` });
              md = fs.readFileSync(resolved, "utf-8");
              srcPath = resolved;
            }
            if (!md) return ok({ success: false, error: "provide 'md' (markdown string) or 'path' (.md file path under the PRISM root)" });
            const rendered = specHtmlCompanionEngine.render(md, {
              theme: params.theme === "dark" || params.theme === "light" ? params.theme : "auto",
              toc: params.toc !== false,
              title: typeof params.title === "string" ? params.title : undefined,
              generatedBy: "prism_session:doc_render",
              sourcePath: srcPath ? path.basename(srcPath) : undefined,
            });
            let wrote: string | undefined;
            if (params.write && srcPath) {
              const stem = srcPath.replace(/\.(md|markdown)$/i, "");
              const outPath = stem === srcPath ? srcPath + ".html" : stem + ".html";
              safeWriteSync(outPath, rendered.html, "utf-8");
              safeWriteSync(outPath + ".hash", `${rendered.sourceHash}  ${path.basename(srcPath)}\n`, "utf-8");
              wrote = path.relative(projRoot, outPath);
            }
            return ok({
              success: true,
              title: rendered.title,
              headings: rendered.headings,
              hasMermaid: rendered.hasMermaid,
              sourceHash: rendered.sourceHash,
              bytes: rendered.bytes,
              warnings: rendered.warnings,
              ...(wrote ? { wrote } : {}),
              ...(params.include_html ? { html: rendered.html } : {}),
            });
          }

          // ================================================================
          // COORD-MS0/U-COORD04: CrossSessionOrchestratorEngine unified facade
          // Wires AtomicClaimBroker + CrossTerminalBroadcast + SessionHandoffV2
          // ================================================================
          case "cross_session_get_session_id": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            return ok({
              sessionId: xs.getSessionId(),
              identity: xs.getIdentity(),
            });
          }

          case "cross_session_claim": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            const resource = String(params.resource ?? "");
            const ttlMsRaw = params.ttl_ms ?? params.ttlMs;
            const ttlMs = ttlMsRaw != null ? Number(ttlMsRaw) : undefined;
            const reason = typeof params.reason === "string" ? params.reason : undefined;
            return ok(xs.claim({ resource, ttlMs, reason }));
          }

          case "cross_session_release": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            const resource = typeof params.resource === "string" ? params.resource : "";
            const released = resource ? xs.release(resource) : false;
            return ok({ released, resource });
          }

          case "cross_session_is_file_claimed": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            const filePath = String(params.file_path ?? params.filePath ?? "");
            return ok(xs.isFileClaimedByOther(filePath));
          }

          case "cross_session_broadcast": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            const type = (typeof params.type === "string" ? params.type : "info") as
              "info" | "warning" | "request" | "response" | "registry_change" | "asset_added" | "asset_removed" | "cache_invalidate";
            const content = typeof params.content === "string" ? params.content : undefined;
            const payload = (params.payload && typeof params.payload === "object")
              ? params.payload as Record<string, unknown>
              : undefined;
            const ttlMsRaw = params.ttl_ms ?? params.ttlMs;
            const ttlMs = ttlMsRaw != null && Number.isFinite(Number(ttlMsRaw)) ? Number(ttlMsRaw) : undefined;
            const msg = await xs.broadcastMessage({ type, content, payload, ttlMs });
            return ok({ success: true, message: msg });
          }

          case "cross_session_get_recent_events": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            const limit = params.limit != null ? Number(params.limit) : 50;
            const events = await xs.getRecentEvents(limit);
            return ok({ events, count: events.length });
          }

          case "cross_session_force_invalidate_all": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            await xs.forceInvalidateAll();
            return ok({ success: true });
          }

          case "cross_session_create_handoff": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            const outcome = xs.createHandoff({
              identity: (params.identity && typeof params.identity === "object")
                ? params.identity as Parameters<typeof xs.createHandoff>[0]["identity"]
                : undefined,
              position: (params.position && typeof params.position === "object")
                ? params.position as Parameters<typeof xs.createHandoff>[0]["position"]
                : undefined,
              openGoals: Array.isArray(params.open_goals ?? params.openGoals)
                ? (params.open_goals ?? params.openGoals) as Parameters<typeof xs.createHandoff>[0]["openGoals"]
                : undefined,
              keyInsights: Array.isArray(params.key_insights ?? params.keyInsights)
                ? (params.key_insights ?? params.keyInsights) as Parameters<typeof xs.createHandoff>[0]["keyInsights"]
                : undefined,
              nextActions: Array.isArray(params.next_actions ?? params.nextActions)
                ? (params.next_actions ?? params.nextActions) as Parameters<typeof xs.createHandoff>[0]["nextActions"]
                : undefined,
              writtenAt: typeof (params.written_at ?? params.writtenAt) === "string"
                ? String(params.written_at ?? params.writtenAt)
                : undefined,
              startedAt: typeof (params.started_at ?? params.startedAt) === "string"
                ? String(params.started_at ?? params.startedAt)
                : undefined,
            });
            return ok(outcome);
          }

          case "cross_session_get_status": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            return ok(xs.getStatus());
          }

          case "cross_session_get_other_sessions": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            const others = xs.getOtherSessions();
            return ok({ sessions: others, count: others.length });
          }

          case "cross_session_get_status_line": {
            const { crossSessionOrchestratorEngine: xs } = await import("../../engines/CrossSessionOrchestratorEngine.js");
            return ok({ statusLine: xs.getStatusLine() });
          }

          // COMMAND-KERNEL-MS0/U-CK01: prism_session:psk thin MCP wrapper.
          // The kernel lives at .claude/kernel/psk.mjs (outside mcp-server src
          // tree) — resolved via PATHS.PRISM_ROOT and imported through a
          // file:// URL for Windows-safe dynamic ESM. psk's dispatch() is
          // fail-soft (never throws), but the dynamic import() itself can
          // throw on missing-file / bad-syntax — those bubble to the outer
          // try/catch and surface via dispatcherError(). We add an explicit
          // fs.existsSync gate (Reviewer B P2 fix) so the missing-file case
          // returns an operator-readable degraded response instead of an
          // ERR_MODULE_NOT_FOUND stack trace.
          case "psk": {
            const { pathToFileURL } = await import("node:url");
            const pskPath = path.join(PATHS.PRISM_ROOT, ".claude", "kernel", "psk.mjs");
            if (!fs.existsSync(pskPath)) {
              return ok({
                ok: false,
                syscall: typeof params.syscall === "string" ? params.syscall : null,
                degraded: true,
                error: `psk.mjs missing at ${pskPath}`,
                note: "COMMAND-KERNEL-MS0/U-CK01 kernel file not found — check PRISM_ROOT or worktree .claude/kernel/",
              });
            }
            const pskUrl = pathToFileURL(pskPath).href;
            const { dispatch: pskDispatch } = await import(pskUrl);
            const syscall = typeof params.syscall === "string"
              ? params.syscall
              : String(params.syscall ?? "");
            // Reviewer B P1 fix: PRISM dispatchers use normalizeParams to
            // flatten nested {action,params} envelopes. A caller may pass
            // syscall-fields at the TOP level (sessionId, subcommand, etc.)
            // instead of nesting them under params.params. Merge flat fields
            // into syscallParams so callers using either shape work — nested
            // wins on collision (explicit user intent).
            const nested = (params.params && typeof params.params === "object")
              ? params.params as Record<string, unknown>
              : {};
            const FLAT_FORWARD_KEYS = [
              "sessionId", "subcommand", "terminal", "topic", "resume",
              "state", "source", "field", "event", "command", "outcome",
              "tokens", "latency_ms", "extra", "filter", "priority",
              "slot", "limit", "tier", "chatId", "branch", "activity",
              "preferSlot", "since", "query", "json",
            ];
            const syscallParams: Record<string, unknown> = { ...nested };
            for (const key of FLAT_FORWARD_KEYS) {
              if (params[key] !== undefined && syscallParams[key] === undefined) {
                syscallParams[key] = params[key];
              }
            }
            const result = await pskDispatch(syscall, syscallParams);
            return ok(result);
          }

          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-MULTI-SESSION-HANDOFF —
          // 4 actions wrapping MultiSessionHandoffCoordinatorEngine (U-CTX05).
          // All four lazy-import the engine via dynamic import() per
          // dispatchers.md convention. A custom handoff_dir param instantiates
          // a fresh engine; default uses the package singleton (HANDOFF_DIR =
          // H:/prism/state/shared). cleanup_stale is destructive and refuses
          // to unlink without explicit {confirm:true} (dry-run by default).
          case "handoff_coord_status": {
            const mod = await import("../../engines/MultiSessionHandoffCoordinatorEngine.js");
            const engine = params.handoff_dir
              ? new mod.MultiSessionHandoffCoordinatorEngine(String(params.handoff_dir))
              : mod.multiSessionHandoffCoordinatorEngine;
            // engine.coordinate() already returns { success: true, workQueue, recommendations, tokenEstimate }
            return ok(engine.coordinate());
          }

          case "handoff_coord_inject": {
            const mod = await import("../../engines/MultiSessionHandoffCoordinatorEngine.js");
            const engine = params.handoff_dir
              ? new mod.MultiSessionHandoffCoordinatorEngine(String(params.handoff_dir))
              : mod.multiSessionHandoffCoordinatorEngine;
            const text = engine.formatForInjection();
            return ok({
              success: true,
              text,
              tokenEstimate: Math.ceil(text.length / 3.5),
              bytes: Buffer.byteLength(text, "utf-8"),
            });
          }

          case "handoff_coord_load_sessions": {
            const mod = await import("../../engines/MultiSessionHandoffCoordinatorEngine.js");
            const engine = params.handoff_dir
              ? new mod.MultiSessionHandoffCoordinatorEngine(String(params.handoff_dir))
              : mod.multiSessionHandoffCoordinatorEngine;
            const sessions = engine.loadAllSessions();
            const active = sessions.filter((s) => s.status === "active").length;
            const stale = sessions.filter((s) => s.status === "stale").length;
            return ok({
              success: true,
              count: sessions.length,
              active,
              stale,
              sessions,
            });
          }

          case "handoff_coord_cleanup_stale": {
            // DESTRUCTIVE — dry-run by default. Requires explicit confirm:true
            // to actually unlink. max_age_ms clamped ≥ 60_000 (1 min) to
            // prevent foot-gunning (an op that nukes a fresh handoff is
            // almost certainly an accident).
            const mod = await import("../../engines/MultiSessionHandoffCoordinatorEngine.js");
            const engine = params.handoff_dir
              ? new mod.MultiSessionHandoffCoordinatorEngine(String(params.handoff_dir))
              : mod.multiSessionHandoffCoordinatorEngine;
            const requestedMaxAge = Number(params.max_age_ms ?? 30 * 60 * 1000);
            const maxAgeMs = Math.max(
              60_000,
              Number.isFinite(requestedMaxAge) ? requestedMaxAge : 30 * 60 * 1000
            );
            const confirm = params.confirm === true;

            if (!confirm) {
              // Dry-run path: enumerate would-be-deleted files without unlink.
              const files = engine.findHandoffFiles();
              const now = Date.now();
              const wouldDelete: Array<{ file: string; ageMs: number; ageMinutes: number }> = [];
              for (const file of files) {
                try {
                  const stat = fs.statSync(file);
                  const ageMs = now - stat.mtimeMs;
                  if (ageMs > maxAgeMs) {
                    wouldDelete.push({
                      file,
                      ageMs,
                      ageMinutes: Math.round(ageMs / 60_000),
                    });
                  }
                } catch { /* skip unreadable */ }
              }
              return ok({
                success: true,
                dry_run: true,
                max_age_ms: maxAgeMs,
                scanned: files.length,
                would_delete_count: wouldDelete.length,
                would_delete: wouldDelete,
                note: "DESTRUCTIVE op — pass {confirm:true} to actually delete. max_age_ms clamped to ≥60_000.",
              });
            }

            // Confirmed path: actually delete — but FIRST verify handoff_dir
            // resolves under an allowlist. Reviewer B P1.3: an operator typo
            // of `handoff_dir: "C:/Users"` + `confirm:true` would unlink files
            // outside the handoff tree. The engine has no path guard, so the
            // dispatcher enforces it here. Allowed roots: H:/prism/state, the
            // OS tmp dir (for tests), and the engine's default singleton dir.
            if (params.handoff_dir) {
              const resolved = path.resolve(String(params.handoff_dir)).replace(/\\/g, "/");
              const allowedRoots = [
                "H:/prism/state",
                path.resolve(os.tmpdir()).replace(/\\/g, "/"),
              ];
              const inAllowedRoot = allowedRoots.some((root) => {
                const rootResolved = path.resolve(root).replace(/\\/g, "/");
                return resolved === rootResolved || resolved.startsWith(rootResolved + "/");
              });
              if (!inAllowedRoot) {
                return ok({
                  success: false,
                  error: "handoff_dir_not_in_allowlist",
                  resolved,
                  allowed_roots: allowedRoots,
                  note: "DESTRUCTIVE cleanup_stale with confirm:true refuses to operate outside the H:/prism/state tree or the OS tmp dir. Dry-run mode (without confirm:true) is unrestricted.",
                });
              }
            }
            const cleaned = engine.cleanupStaleSessions(maxAgeMs);
            return ok({
              success: true,
              dry_run: false,
              confirmed: true,
              max_age_ms: maxAgeMs,
              cleaned,
            });
          }

          // OBSIDIAN-PRISM-OS-MS0/U-ORPHAN-RESCUE-SESSION-LIFECYCLE —
          // 5 actions wrapping SessionLifecycleEngine (W3:D5, was orphan).
          // Engine is a process-wide Singleton via getInstance(); we expose
          // the convenience export functions where available (cleaner API)
          // and getInstance() for the two accessors without convenience
          // helpers (getSessionId, getCallCount).
          case "lifecycle_metrics": {
            const mod = await import("../../engines/SessionLifecycleEngine.js");
            const metrics = mod.getSessionMetrics();
            return ok({ success: true, metrics });
          }

          case "lifecycle_quality_score": {
            const mod = await import("../../engines/SessionLifecycleEngine.js");
            const score = mod.getSessionQualityScore();
            return ok({ success: true, score });
          }

          case "lifecycle_session_id": {
            const mod = await import("../../engines/SessionLifecycleEngine.js");
            const sessionId = mod.SessionLifecycleEngine.getInstance().getSessionId();
            return ok({ success: true, session_id: sessionId });
          }

          case "lifecycle_call_count": {
            const mod = await import("../../engines/SessionLifecycleEngine.js");
            const callCount = mod.SessionLifecycleEngine.getInstance().getCallCount();
            return ok({ success: true, call_count: callCount });
          }

          case "lifecycle_final_handoff": {
            const mod = await import("../../engines/SessionLifecycleEngine.js");
            const phase = String(params.phase);
            const quickResume = String(params.quick_resume);
            const pendingTasks = Array.isArray(params.pending_tasks)
              ? (params.pending_tasks as unknown[]).map((t) => String(t))
              : [];
            const keyFindings = Array.isArray(params.key_findings)
              ? (params.key_findings as unknown[]).map((f) => String(f))
              : [];
            const handoff = mod.generateSessionHandoff(phase, quickResume, pendingTasks, keyFindings);
            if (!handoff) {
              return ok({ success: false, error: "handoff_generation_failed" });
            }
            return ok({ success: true, handoff });
          }

          // OBSIDIAN-INTELLIGENCE-MS3/U-ACTION-TRACES (D4) — read-only query
          // over the append-only agent-write trace log. Lazy-imported per
          // the dispatcher lazy-import convention.
          case "action_trace_query": {
            const { queryTraces } = await import(
              "../../engines/ActionTraceEngine.js"
            );
            const result = queryTraces({
              agent: typeof params.agent === "string" ? params.agent : undefined,
              target:
                typeof params.target === "string" ? params.target : undefined,
              tool: typeof params.tool === "string" ? params.tool : undefined,
              sessionId:
                typeof params.sessionId === "string"
                  ? params.sessionId
                  : undefined,
              action:
                typeof params.action === "string" ? params.action : undefined,
              sinceTs:
                typeof params.sinceTs === "string" ? params.sinceTs : undefined,
              limit:
                typeof params.limit === "number" ? params.limit : undefined,
              order:
                params.order === "desc"
                  ? "desc"
                  : params.order === "asc"
                    ? "asc"
                    : undefined,
            });
            // Don't leak the absolute host log path through the MCP tool
            // surface — basename is enough for a caller to know which log
            // answered the query (filename is fixed; the dir is host layout).
            const { file: traceFile, ...rest } = result;
            return ok({
              success: true,
              ...rest,
              file: traceFile ? traceFile.replace(/^.*[/\\]/, "") : traceFile,
            });
          }

          // OBSIDIAN-INTELLIGENCE-MS3/U-CONFLICT-RESOLUTION (D3) — detect +
          // resolve a semantic memory-key conflict. Lazy-imported per the
          // dispatcher lazy-import convention. The engine result's `file`
          // is already a basename (no host-path leak by construction).
          case "memory_conflict_resolve": {
            const { resolveConflict } = await import(
              "../../engines/MemoryConflictResolverEngine.js"
            );
            const result = resolveConflict({
              key: params.key as string,
              existing: params.existing as {
                agent: string;
                sessionId: string;
                content: string;
                ts: string;
              },
              incoming: params.incoming as {
                agent: string;
                sessionId: string;
                content: string;
                ts: string;
              },
              windowMs:
                typeof params.windowMs === "number"
                  ? params.windowMs
                  : undefined,
              policy:
                params.policy === "first-writer" ||
                params.policy === "human-arbitrate" ||
                params.policy === "last-writer"
                  ? params.policy
                  : undefined,
            });
            return ok({ success: true, ...result });
          }

          // ==================================================================
          // HERMES-AGI-ARCHITECTURE-MS0/U-HAGI08 — SourceChainEngine (Voxyz L8)
          // Provenance/citation chain decorator. Wraps any retrieval with
          // {value, sources, digest} so every PSN-leg hit is operator-auditable.
          // ==================================================================
          case "source_chain_decorate": {
            const { SourceChainEngine } = await import("../../engines/SourceChainEngine.js");
            const value = (params as { value?: unknown }).value;
            const citations = ((params as { citations?: unknown }).citations ?? []) as unknown[];
            const result = SourceChainEngine.decorate(value, citations as never);
            return ok({ success: true, ...result });
          }
          case "source_chain_merge": {
            const { SourceChainEngine } = await import("../../engines/SourceChainEngine.js");
            const results = ((params as { results?: unknown }).results ?? []) as unknown[];
            const merged = SourceChainEngine.merge(results as never);
            return ok({ success: true, ...merged });
          }
          case "source_chain_validate": {
            const { SourceChainEngine } = await import("../../engines/SourceChainEngine.js");
            const citation = (params as { citation?: unknown }).citation;
            const parsed = SourceChainEngine.validate(citation);
            return ok({ success: true, citation: parsed });
          }
          case "source_chain_render": {
            const { SourceChainEngine } = await import("../../engines/SourceChainEngine.js");
            const citations = ((params as { citations?: unknown }).citations ?? []) as unknown[];
            const markdown = SourceChainEngine.renderMarkdown(citations as never);
            return ok({ success: true, markdown });
          }

          // ==================================================================
          // HERMES-AGI-ARCHITECTURE-MS0/U-HAGI12 — PSNCoverageAuditEngine
          // ==================================================================
          case "psn_coverage_audit": {
            const { PSNCoverageAuditEngine } = await import("../../engines/PSNCoverageAuditEngine.js");
            const evidence = ((params as { evidence?: unknown }).evidence ?? []) as unknown[];
            const opts = (params as { opts?: unknown }).opts ?? {};
            const matrix = PSNCoverageAuditEngine.audit(evidence as never, opts as never);
            return ok({ success: true, ...matrix });
          }
          case "psn_coverage_by_verdict": {
            const { PSNCoverageAuditEngine } = await import("../../engines/PSNCoverageAuditEngine.js");
            const matrix = (params as { matrix?: unknown }).matrix;
            const verdict = (params as { verdict?: unknown }).verdict as "covered" | "partial" | "missing";
            const cells = PSNCoverageAuditEngine.cellsByVerdict(matrix as never, verdict);
            return ok({ success: true, cells });
          }
          case "psn_coverage_render": {
            const { PSNCoverageAuditEngine } = await import("../../engines/PSNCoverageAuditEngine.js");
            const matrix = (params as { matrix?: unknown }).matrix;
            const markdown = PSNCoverageAuditEngine.renderMarkdown(matrix as never);
            return ok({ success: true, markdown });
          }
          case "psn_coverage_decorated": {
            const { PSNCoverageAuditEngine } = await import("../../engines/PSNCoverageAuditEngine.js");
            const evidence = ((params as { evidence?: unknown }).evidence ?? []) as unknown[];
            const opts = (params as { opts?: unknown }).opts ?? {};
            const matrix = PSNCoverageAuditEngine.audit(evidence as never, opts as never);
            const decorated = PSNCoverageAuditEngine.decorateWithProvenance(matrix);
            return ok({ success: true, ...decorated });
          }

          // U-HAGI11 KillSwitchEngine
          case "kill_switch_initial": {
            const { KillSwitchEngine } = await import("../../engines/KillSwitchEngine.js");
            const at = (params as { at?: string }).at;
            return ok({ success: true, state: KillSwitchEngine.initial(at) });
          }
          case "kill_switch_promote": {
            const { KillSwitchEngine } = await import("../../engines/KillSwitchEngine.js");
            const p = params as { state: never; to: never; reason: string; actor: string; at?: string };
            const next = KillSwitchEngine.promote(p.state, p.to, p.reason, p.actor, p.at);
            return ok({ success: true, state: next });
          }
          case "kill_switch_reset": {
            const { KillSwitchEngine } = await import("../../engines/KillSwitchEngine.js");
            const p = params as { state: never; actor: string; reason: string; force: boolean; at?: string };
            const next = KillSwitchEngine.reset(p.state, p.actor, p.reason, p.force, p.at);
            return ok({ success: true, state: next });
          }
          case "kill_switch_decide": {
            const { KillSwitchEngine } = await import("../../engines/KillSwitchEngine.js");
            const p = params as { state: never; operation: "new_request"|"in_flight"|"credential_use"; opts?: { blockCredsAtHard?: boolean } };
            const decision = KillSwitchEngine.decide(p.state, p.operation, p.opts ?? {});
            return ok({ success: true, ...decision });
          }

          // U-HAGI04 TaskDecomposerEngine
          case "task_decompose": {
            const { TaskDecomposerEngine } = await import("../../engines/TaskDecomposerEngine.js");
            const p = params as { prompt: string; opts?: { maxSubtasks?: number; itemLabel?: string } };
            const result = TaskDecomposerEngine.decompose(p.prompt, p.opts ?? {});
            return ok({ success: true, ...result });
          }
          case "task_decompose_cap": {
            const { TaskDecomposerEngine } = await import("../../engines/TaskDecomposerEngine.js");
            const p = params as { result: never; maxN: number };
            const capped = TaskDecomposerEngine.cap(p.result, p.maxN);
            return ok({ success: true, ...capped });
          }
          case "task_decompose_validate": {
            const { TaskDecomposerEngine } = await import("../../engines/TaskDecomposerEngine.js");
            const subtask = (params as { subtask?: unknown }).subtask;
            const parsed = TaskDecomposerEngine.validate(subtask);
            return ok({ success: true, subtask: parsed });
          }

          // U-HAGI09 PolicyTestSuiteEngine
          case "policy_suite_run": {
            const { PolicyTestSuiteEngine } = await import("../../engines/PolicyTestSuiteEngine.js");
            const p = params as { cases: never; runner: (i: unknown) => never };
            const result = await PolicyTestSuiteEngine.run(p.cases, p.runner);
            return ok({ success: true, ...result });
          }
          case "policy_suite_summarize": {
            const { PolicyTestSuiteEngine } = await import("../../engines/PolicyTestSuiteEngine.js");
            const results = (params as { results: never }).results;
            const summary = PolicyTestSuiteEngine.summarize(results);
            return ok({ success: true, summary });
          }
          case "policy_suite_render": {
            const { PolicyTestSuiteEngine } = await import("../../engines/PolicyTestSuiteEngine.js");
            const p = params as { summary: never; results?: never };
            const markdown = PolicyTestSuiteEngine.renderMarkdown(p.summary, p.results);
            return ok({ success: true, markdown });
          }

          // U-HAGI10 TenantBoundaryEngine
          case "tenant_boundary_decide": {
            const { TenantBoundaryEngine } = await import("../../engines/TenantBoundaryEngine.js");
            const p = params as { requestTenantId: string; resourceTenantId: string; allowlist?: never };
            const decision = TenantBoundaryEngine.decide(p.requestTenantId, p.resourceTenantId, p.allowlist ?? []);
            return ok({ success: true, ...decision });
          }
          case "tenant_boundary_filter": {
            const { TenantBoundaryEngine } = await import("../../engines/TenantBoundaryEngine.js");
            const p = params as { requestTenantId: string; resources: Array<Record<string, unknown>>; tenantField: string; allowlist?: never };
            const visible = TenantBoundaryEngine.filterAccessible(
              p.requestTenantId,
              p.resources,
              (r) => String(r[p.tenantField] ?? ""),
              p.allowlist ?? [],
            );
            return ok({ success: true, resources: visible, count: visible.length });
          }
          case "tenant_boundary_render": {
            const { TenantBoundaryEngine } = await import("../../engines/TenantBoundaryEngine.js");
            const decision = (params as { decision: never }).decision;
            return ok({ success: true, markdown: TenantBoundaryEngine.renderDecision(decision) });
          }

          // U-HAGI03 CoordinatorSwarmEngine
          case "swarm_run": {
            const { CoordinatorSwarmEngine } = await import("../../engines/CoordinatorSwarmEngine.js");
            const p = params as unknown as {
              tasks: Parameters<typeof CoordinatorSwarmEngine.run>[0];
              runner: Parameters<typeof CoordinatorSwarmEngine.run>[1];
              opts?: Parameters<typeof CoordinatorSwarmEngine.run>[2];
            };
            const r = await CoordinatorSwarmEngine.run(p.tasks, p.runner, p.opts ?? {});
            return ok({ success: true, ...r });
          }
          case "swarm_successes": {
            const { CoordinatorSwarmEngine } = await import("../../engines/CoordinatorSwarmEngine.js");
            const r = (params as { result: never }).result;
            return ok({ success: true, results: CoordinatorSwarmEngine.successes(r) });
          }
          case "swarm_failures": {
            const { CoordinatorSwarmEngine } = await import("../../engines/CoordinatorSwarmEngine.js");
            const r = (params as { result: never }).result;
            return ok({ success: true, results: CoordinatorSwarmEngine.failures(r) });
          }

          // U-HAGI07 A2AProtocolEngine
          case "a2a_inbound_descriptor": {
            const { A2AProtocolEngine } = await import("../../engines/A2AProtocolEngine.js");
            const p = params as { profile: never; at?: string };
            const desc = A2AProtocolEngine.inboundDescriptor(p.profile, p.at);
            return ok({ success: true, descriptor: desc });
          }
          case "a2a_outbound_envelope": {
            const { A2AProtocolEngine } = await import("../../engines/A2AProtocolEngine.js");
            const message = A2AProtocolEngine.outboundEnvelope(params as never);
            return ok({ success: true, message });
          }
          case "a2a_accept_inbound": {
            const { A2AProtocolEngine } = await import("../../engines/A2AProtocolEngine.js");
            const p = params as { message: never; descriptor: never };
            const verdict = A2AProtocolEngine.acceptInbound(p.message, p.descriptor);
            return ok({ success: true, ...verdict });
          }

          // U-HAGI02 UnifiedControlPlaneEngine
          case "control_plane_decide": {
            const { UnifiedControlPlaneEngine } = await import("../../engines/UnifiedControlPlaneEngine.js");
            const p = params as { request: never; killState: never; budget: never; allowlist?: never; at?: string };
            const v = UnifiedControlPlaneEngine.decide(p.request, p.killState, p.budget, p.allowlist ?? [], p.at);
            return ok({ success: true, ...v });
          }
          case "control_plane_render": {
            const { UnifiedControlPlaneEngine } = await import("../../engines/UnifiedControlPlaneEngine.js");
            const v = (params as { verdict: never }).verdict;
            return ok({ success: true, markdown: UnifiedControlPlaneEngine.renderVerdict(v) });
          }

          // U-HAGI05 BatchDeliverableEngine — multi-customer batch production roll-up.
          // Note: serializable inputs only; runner is wired in-process via a registry of
          // known kinds (caller-supplied via params.kindHandlers as a label).  For the
          // pure-core surface here we accept a payload-echo runner to make the dispatcher
          // round-trippable from MCP without RPC-serializing functions.
          case "batch_deliverable_run": {
            const { BatchDeliverableEngine } = await import("../../engines/BatchDeliverableEngine.js");
            const p = params as { request: never; completed_at?: string };
            // Default runner: echo the payload as the output — operator-driven batches
            // that need real work go through a kind-specific dispatcher (quote/program).
            const rollup = await BatchDeliverableEngine.run(
              p.request,
              (d) => ({ kind: d.kind, payload: d.payload }),
              p.completed_at,
            );
            return ok({ success: true, ...rollup });
          }
          case "batch_deliverable_render": {
            const { BatchDeliverableEngine } = await import("../../engines/BatchDeliverableEngine.js");
            const r = (params as { rollup: never }).rollup;
            return ok({ success: true, markdown: BatchDeliverableEngine.renderRollup(r) });
          }

          // U-HAGI01 DurableWorkflowEngine — crash-resumable workflow ops.
          // State-management surfaces are serializable; advance() requires a runner
          // function so the dispatcher uses an identity step runner (each step's
          // output = step_id label) to keep the contract round-trippable.  Real
          // workflows wire kind-specific runners in-process.
          case "workflow_initial": {
            const { DurableWorkflowEngine } = await import("../../engines/DurableWorkflowEngine.js");
            const p = params as { spec: never; at?: string };
            const state = DurableWorkflowEngine.initial(p.spec, p.at);
            return ok({ success: true, state });
          }
          case "workflow_durable_advance": {
            const { DurableWorkflowEngine } = await import("../../engines/DurableWorkflowEngine.js");
            const p = params as { prior: never; step_ids: string[] };
            // Reconstitute spec from prior state's step_ids list + identity runners.
            const stepIds = Array.isArray(p.step_ids) ? p.step_ids : (p.prior as { steps: { step_id: string }[] }).steps.map((s) => s.step_id);
            const spec = {
              workflow_id: (p.prior as { workflow_id: string }).workflow_id,
              kind: (p.prior as { kind: string }).kind,
              input: null,
              steps: stepIds.map((id) => ({ step_id: id, run: () => id })),
              synthesize: (outs: unknown[]) => outs,
            };
            const next = await DurableWorkflowEngine.advance(spec as never, p.prior);
            return ok({ success: true, state: next });
          }
          case "workflow_pause": {
            const { DurableWorkflowEngine } = await import("../../engines/DurableWorkflowEngine.js");
            const p = params as { state: never; at?: string };
            return ok({ success: true, state: DurableWorkflowEngine.pause(p.state, p.at) });
          }
          case "workflow_resume": {
            const { DurableWorkflowEngine } = await import("../../engines/DurableWorkflowEngine.js");
            const p = params as { state: never; at?: string };
            return ok({ success: true, state: DurableWorkflowEngine.resume(p.state, p.at) });
          }
          case "workflow_cancel": {
            const { DurableWorkflowEngine } = await import("../../engines/DurableWorkflowEngine.js");
            const p = params as { state: never; reason: string; at?: string };
            return ok({ success: true, state: DurableWorkflowEngine.cancel(p.state, p.reason, p.at) });
          }
          case "workflow_render": {
            const { DurableWorkflowEngine } = await import("../../engines/DurableWorkflowEngine.js");
            const p = params as { state: never };
            return ok({ success: true, markdown: DurableWorkflowEngine.renderState(p.state) });
          }

          // U-HAGI06 WorkSurfaceScaffoldEngine — PrismApp web work-surface manifest.
          case "work_surface_manifest": {
            const { WorkSurfaceScaffoldEngine } = await import("../../engines/WorkSurfaceScaffoldEngine.js");
            const p = params as { surface_id: string; roles: never; at?: string };
            const manifest = WorkSurfaceScaffoldEngine.manifestForRoles(p.surface_id, p.roles, p.at);
            return ok({ success: true, manifest });
          }
          case "work_surface_route_at": {
            const { WorkSurfaceScaffoldEngine } = await import("../../engines/WorkSurfaceScaffoldEngine.js");
            const p = params as { manifest: never; path: string };
            return ok({ success: true, route: WorkSurfaceScaffoldEngine.routeAt(p.manifest, p.path) });
          }
          case "work_surface_filter_by_role": {
            const { WorkSurfaceScaffoldEngine } = await import("../../engines/WorkSurfaceScaffoldEngine.js");
            const p = params as { manifest: never; role: never };
            return ok({ success: true, manifest: WorkSurfaceScaffoldEngine.filterByRole(p.manifest, p.role) });
          }
          case "work_surface_render": {
            const { WorkSurfaceScaffoldEngine } = await import("../../engines/WorkSurfaceScaffoldEngine.js");
            const p = params as { manifest: never };
            return ok({ success: true, markdown: WorkSurfaceScaffoldEngine.renderManifest(p.manifest) });
          }

          // HMEMV01 TieredMemoryEngine — 3-tier memory store.
          case "tiered_memory_insert": {
            const { TieredMemoryEngine } = await import("../../engines/TieredMemoryEngine.js");
            const p = params as { state: never; entry: never; at?: string };
            return ok({ success: true, state: TieredMemoryEngine.insert(p.state, p.entry, p.at) });
          }
          case "tiered_memory_recall": {
            const { TieredMemoryEngine } = await import("../../engines/TieredMemoryEngine.js");
            const p = params as { state: never; key: string; at?: string };
            return ok({ success: true, ...TieredMemoryEngine.recall(p.state, p.key, p.at) });
          }
          case "tiered_memory_promote": {
            const { TieredMemoryEngine } = await import("../../engines/TieredMemoryEngine.js");
            const p = params as { state: never; policy?: never };
            return ok({ success: true, state: TieredMemoryEngine.promote(p.state, p.policy ?? {}) });
          }
          case "tiered_memory_expire": {
            const { TieredMemoryEngine } = await import("../../engines/TieredMemoryEngine.js");
            const p = params as { state: never; at?: string };
            return ok({ success: true, ...TieredMemoryEngine.expire(p.state, p.at) });
          }
          case "tiered_memory_stats": {
            const { TieredMemoryEngine } = await import("../../engines/TieredMemoryEngine.js");
            const p = params as { state: never };
            return ok({ success: true, ...TieredMemoryEngine.stats(p.state) });
          }
          case "tiered_memory_render": {
            const { TieredMemoryEngine } = await import("../../engines/TieredMemoryEngine.js");
            const p = params as { state: never };
            return ok({ success: true, markdown: TieredMemoryEngine.renderState(p.state) });
          }

          // HMEMV02 RecallRankingEngine — hybrid retrieval ranking.
          case "recall_rank": {
            const { RecallRankingEngine, DEFAULT_WEIGHTS } = await import("../../engines/RecallRankingEngine.js");
            const p = params as { candidates: never; weights?: never; at?: string; topK?: number };
            const ranked = RecallRankingEngine.rank(p.candidates, p.weights ?? DEFAULT_WEIGHTS, p.at, p.topK);
            return ok({ success: true, ranked });
          }
          case "recall_rank_render": {
            const { RecallRankingEngine } = await import("../../engines/RecallRankingEngine.js");
            const p = params as { ranked: never };
            return ok({ success: true, markdown: RecallRankingEngine.renderRanking(p.ranked) });
          }

          // HMEMV03 MemoryGovernanceEngine — TTL + audit + scrub.
          case "memory_find_expired": {
            const { MemoryGovernanceEngine } = await import("../../engines/MemoryGovernanceEngine.js");
            const p = params as { entries: never; at: string; actor?: string };
            return ok({ success: true, ...MemoryGovernanceEngine.findExpired(p.entries, p.at, p.actor) });
          }
          case "memory_scrub": {
            const { MemoryGovernanceEngine } = await import("../../engines/MemoryGovernanceEngine.js");
            const p = params as { entries: never; request: never; at?: string };
            return ok({ success: true, ...MemoryGovernanceEngine.scrub(p.entries, p.request, p.at) });
          }
          case "memory_record_audit": {
            const { MemoryGovernanceEngine } = await import("../../engines/MemoryGovernanceEngine.js");
            const p = params as { args: never };
            return ok({ success: true, audit: MemoryGovernanceEngine.recordAudit(p.args) });
          }
          case "memory_render_audit": {
            const { MemoryGovernanceEngine } = await import("../../engines/MemoryGovernanceEngine.js");
            const p = params as { audits: never };
            return ok({ success: true, markdown: MemoryGovernanceEngine.renderAudit(p.audits) });
          }

          // HMEMV04 EmbeddingRouterEngine — Euclidean vs hyperbolic routing.
          case "embedding_route": {
            const { EmbeddingRouterEngine } = await import("../../engines/EmbeddingRouterEngine.js");
            const p = params as { profile: never };
            return ok({ success: true, decision: EmbeddingRouterEngine.route(p.profile) });
          }
          case "embedding_route_render": {
            const { EmbeddingRouterEngine } = await import("../../engines/EmbeddingRouterEngine.js");
            const p = params as { decision: never };
            return ok({ success: true, markdown: EmbeddingRouterEngine.renderDecision(p.decision) });
          }

          // HMEMV05 MemoryDecayConsolidationEngine — decay/merge/drop.
          case "memory_decay_consolidate": {
            const { MemoryDecayConsolidationEngine } = await import("../../engines/MemoryDecayConsolidationEngine.js");
            const p = params as { entries: never; at?: string; opts?: never };
            return ok({ success: true, ...MemoryDecayConsolidationEngine.consolidate(p.entries, p.at, p.opts ?? {}) });
          }

          // HMEMV06 DriftDetectionEngine — semantic drift detection.
          case "drift_measure": {
            const { DriftDetectionEngine } = await import("../../engines/DriftDetectionEngine.js");
            const p = params as { args: never };
            return ok({ success: true, measurement: DriftDetectionEngine.measure(p.args) });
          }
          case "drift_render": {
            const { DriftDetectionEngine } = await import("../../engines/DriftDetectionEngine.js");
            const p = params as { measurement: never };
            return ok({ success: true, markdown: DriftDetectionEngine.renderMeasurement(p.measurement) });
          }

          // HMEMV07 ContextBlockPackerEngine — per-block context packing.
          case "context_pack_plan": {
            const { ContextBlockPackerEngine } = await import("../../engines/ContextBlockPackerEngine.js");
            const p = params as { blocks: never; budget_tokens: number };
            return ok({ success: true, plan: ContextBlockPackerEngine.plan(p.blocks, p.budget_tokens) });
          }
          case "context_pack_render": {
            const { ContextBlockPackerEngine } = await import("../../engines/ContextBlockPackerEngine.js");
            const p = params as { plan: never };
            return ok({ success: true, markdown: ContextBlockPackerEngine.renderPlan(p.plan) });
          }

          // HMEMV08 MemoryDiffEngine — state-snapshot diff.
          case "memory_diff": {
            const { MemoryDiffEngine } = await import("../../engines/MemoryDiffEngine.js");
            const p = params as { a: never; b: never };
            return ok({ success: true, diff: MemoryDiffEngine.diff(p.a, p.b) });
          }
          case "memory_diff_render": {
            const { MemoryDiffEngine } = await import("../../engines/MemoryDiffEngine.js");
            const p = params as { diff: never };
            return ok({ success: true, markdown: MemoryDiffEngine.renderDiff(p.diff) });
          }

          // HMEMV09 NamespaceMigrationEngine — cross-namespace re-key.
          case "namespace_migrate": {
            const { NamespaceMigrationEngine } = await import("../../engines/NamespaceMigrationEngine.js");
            const p = params as { args: never };
            return ok({ success: true, result: NamespaceMigrationEngine.migrate(p.args) });
          }
          case "namespace_migrate_render": {
            const { NamespaceMigrationEngine } = await import("../../engines/NamespaceMigrationEngine.js");
            const p = params as { result: never };
            return ok({ success: true, markdown: NamespaceMigrationEngine.renderResult(p.result) });
          }

          // HMEMV10 HybridIndexEngine — RRF fusion of BM25 + semantic.
          case "hybrid_fuse": {
            const { HybridIndexEngine } = await import("../../engines/HybridIndexEngine.js");
            const p = params as { bm25: never; semantic: never; opts?: { k?: number; topK?: number } };
            return ok({ success: true, fusion: HybridIndexEngine.fuse(p.bm25, p.semantic, p.opts ?? {}) });
          }
          case "hybrid_fuse_render": {
            const { HybridIndexEngine } = await import("../../engines/HybridIndexEngine.js");
            const p = params as { results: never };
            return ok({ success: true, markdown: HybridIndexEngine.renderFusion(p.results) });
          }

          // HMEMV11 QuantizationProfileEngine — RaBitQ profile selector.
          case "quant_select": {
            const { QuantizationProfileEngine } = await import("../../engines/QuantizationProfileEngine.js");
            const p = params as { corpus_size: number; query_budget_ms: number };
            return ok({ success: true, selection: QuantizationProfileEngine.select(p.corpus_size, p.query_budget_ms) });
          }
          case "quant_render": {
            const { QuantizationProfileEngine } = await import("../../engines/QuantizationProfileEngine.js");
            const p = params as { selection: never };
            return ok({ success: true, markdown: QuantizationProfileEngine.renderSelection(p.selection) });
          }

          // HCAP01 PluginRegistryEngine — Hermes plugin manifest registry.
          case "plugin_register": {
            const { PluginRegistryEngine } = await import("../../engines/PluginRegistryEngine.js");
            const p = params as { state: never; manifest: never };
            return ok({ success: true, state: PluginRegistryEngine.register(p.state, p.manifest) });
          }
          case "plugin_deregister": {
            const { PluginRegistryEngine } = await import("../../engines/PluginRegistryEngine.js");
            const p = params as { state: never; plugin_id: string };
            return ok({ success: true, state: PluginRegistryEngine.deregister(p.state, p.plugin_id) });
          }
          case "plugin_find_by_capability": {
            const { PluginRegistryEngine } = await import("../../engines/PluginRegistryEngine.js");
            const p = params as { state: never; capability: string };
            return ok({ success: true, plugins: PluginRegistryEngine.findByCapability(p.state, p.capability) });
          }
          case "plugin_filter_by_side_effect": {
            const { PluginRegistryEngine } = await import("../../engines/PluginRegistryEngine.js");
            const p = params as { state: never; tier: never };
            return ok({ success: true, plugins: PluginRegistryEngine.filterBySideEffect(p.state, p.tier) });
          }
          case "plugin_render": {
            const { PluginRegistryEngine } = await import("../../engines/PluginRegistryEngine.js");
            const p = params as { state: never };
            return ok({ success: true, markdown: PluginRegistryEngine.renderState(p.state) });
          }

          // HCAP02 ExcelStructureEngine — Excel sheet/range structural parser.
          case "excel_analyze": {
            const { ExcelStructureEngine } = await import("../../engines/ExcelStructureEngine.js");
            const p = params as { sheet: never };
            return ok({ success: true, structure: ExcelStructureEngine.analyze(p.sheet) });
          }
          case "excel_column_values": {
            const { ExcelStructureEngine } = await import("../../engines/ExcelStructureEngine.js");
            const p = params as { sheet: never; col: number; header_row?: number };
            return ok({ success: true, values: ExcelStructureEngine.columnValues(p.sheet, p.col, p.header_row) });
          }
          case "excel_render": {
            const { ExcelStructureEngine } = await import("../../engines/ExcelStructureEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: ExcelStructureEngine.renderStructure(p.structure) });
          }

          // HCAP03 PDFStructureEngine — PDF document structural model.
          case "pdf_analyze": {
            const { PDFStructureEngine } = await import("../../engines/PDFStructureEngine.js");
            const p = params as { document_id: string; blocks: never };
            return ok({ success: true, structure: PDFStructureEngine.analyze(p.document_id, p.blocks) });
          }
          case "pdf_render": {
            const { PDFStructureEngine } = await import("../../engines/PDFStructureEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: PDFStructureEngine.renderStructure(p.structure) });
          }

          // HMPI01 MCPServerRegistryEngine — registry of MCP servers we consume/expose.
          case "mcp_server_register": {
            const { MCPServerRegistryEngine } = await import("../../engines/MCPServerRegistryEngine.js");
            const p = params as { state: never; manifest: never };
            return ok({ success: true, state: MCPServerRegistryEngine.register(p.state, p.manifest) });
          }
          case "mcp_server_deregister": {
            const { MCPServerRegistryEngine } = await import("../../engines/MCPServerRegistryEngine.js");
            const p = params as { state: never; server_id: string };
            return ok({ success: true, state: MCPServerRegistryEngine.deregister(p.state, p.server_id) });
          }
          case "mcp_server_find_by_tool": {
            const { MCPServerRegistryEngine } = await import("../../engines/MCPServerRegistryEngine.js");
            const p = params as { state: never; tool_name: string };
            return ok({ success: true, servers: MCPServerRegistryEngine.findByTool(p.state, p.tool_name) });
          }
          case "mcp_server_filter_by_tier": {
            const { MCPServerRegistryEngine } = await import("../../engines/MCPServerRegistryEngine.js");
            const p = params as { state: never; tier: never };
            return ok({ success: true, servers: MCPServerRegistryEngine.filterByTier(p.state, p.tier) });
          }
          case "mcp_server_filter_by_transport": {
            const { MCPServerRegistryEngine } = await import("../../engines/MCPServerRegistryEngine.js");
            const p = params as { state: never; transport: never };
            return ok({ success: true, servers: MCPServerRegistryEngine.filterByTransport(p.state, p.transport) });
          }
          case "mcp_server_find_oauth_gated": {
            const { MCPServerRegistryEngine } = await import("../../engines/MCPServerRegistryEngine.js");
            const p = params as { state: never };
            return ok({ success: true, servers: MCPServerRegistryEngine.findOAuthGated(p.state) });
          }
          case "mcp_server_render": {
            const { MCPServerRegistryEngine } = await import("../../engines/MCPServerRegistryEngine.js");
            const p = params as { state: never };
            return ok({ success: true, markdown: MCPServerRegistryEngine.renderState(p.state) });
          }

          // HCAP04 CSVStructureEngine — CSV structural parser.
          case "csv_analyze": {
            const { CSVStructureEngine } = await import("../../engines/CSVStructureEngine.js");
            const p = params as { document_id: string; rows: never };
            return ok({ success: true, structure: CSVStructureEngine.analyze(p.document_id, p.rows) });
          }
          case "csv_render": {
            const { CSVStructureEngine } = await import("../../engines/CSVStructureEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: CSVStructureEngine.renderStructure(p.structure) });
          }

          // HMPI02 OAuthCredentialEngine — OAuth credential lifecycle.
          case "oauth_initial": {
            const { OAuthCredentialEngine } = await import("../../engines/OAuthCredentialEngine.js");
            const p = params as { server_id: string };
            return ok({ success: true, state: OAuthCredentialEngine.initial(p.server_id) });
          }
          case "oauth_authorize": {
            const { OAuthCredentialEngine } = await import("../../engines/OAuthCredentialEngine.js");
            const p = params as { state: never; expires_at: string; now_at: string };
            return ok({ success: true, state: OAuthCredentialEngine.authorize(p.state, p.expires_at, p.now_at) });
          }
          case "oauth_record_failure": {
            const { OAuthCredentialEngine } = await import("../../engines/OAuthCredentialEngine.js");
            const p = params as { state: never };
            return ok({ success: true, state: OAuthCredentialEngine.recordRefreshFailure(p.state) });
          }
          case "oauth_revoke": {
            const { OAuthCredentialEngine } = await import("../../engines/OAuthCredentialEngine.js");
            const p = params as { state: never };
            return ok({ success: true, state: OAuthCredentialEngine.revoke(p.state) });
          }
          case "oauth_reevaluate": {
            const { OAuthCredentialEngine } = await import("../../engines/OAuthCredentialEngine.js");
            const p = params as { state: never; now_at: string };
            return ok({ success: true, state: OAuthCredentialEngine.reevaluate(p.state, p.now_at) });
          }
          case "oauth_render": {
            const { OAuthCredentialEngine } = await import("../../engines/OAuthCredentialEngine.js");
            const p = params as { state: never };
            return ok({ success: true, markdown: OAuthCredentialEngine.renderState(p.state) });
          }

          // HMPI03 IntegrationHealthEngine — health score + verdict.
          case "health_score": {
            const { IntegrationHealthEngine } = await import("../../engines/IntegrationHealthEngine.js");
            const p = params as { probe: never; now_at?: string };
            return ok({ success: true, score: IntegrationHealthEngine.score(p.probe, p.now_at) });
          }
          case "health_aggregate": {
            const { IntegrationHealthEngine } = await import("../../engines/IntegrationHealthEngine.js");
            const p = params as { scores: never };
            return ok({ success: true, ...IntegrationHealthEngine.aggregate(p.scores) });
          }
          case "health_render": {
            const { IntegrationHealthEngine } = await import("../../engines/IntegrationHealthEngine.js");
            const p = params as { score: never };
            return ok({ success: true, markdown: IntegrationHealthEngine.renderScore(p.score) });
          }

          // HCAP05 JSONSchemaValidatorEngine — JSON Schema validator.
          case "json_schema_validate": {
            const { JSONSchemaValidatorEngine } = await import("../../engines/JSONSchemaValidatorEngine.js");
            const p = params as { spec: never; payload: unknown };
            return ok({ success: true, ...JSONSchemaValidatorEngine.validate(p.spec, p.payload) });
          }
          case "json_schema_render": {
            const { JSONSchemaValidatorEngine } = await import("../../engines/JSONSchemaValidatorEngine.js");
            const p = params as { result: never };
            return ok({ success: true, markdown: JSONSchemaValidatorEngine.renderResult(p.result) });
          }

          // HCAP06 WebScrapeResultEngine — structured web-scrape result.
          case "web_scrape_analyze": {
            const { WebScrapeResultEngine } = await import("../../engines/WebScrapeResultEngine.js");
            const p = params as { response: never };
            return ok({ success: true, structure: WebScrapeResultEngine.analyze(p.response) });
          }
          case "web_scrape_rank": {
            const { WebScrapeResultEngine } = await import("../../engines/WebScrapeResultEngine.js");
            const p = params as { blocks: never; topK?: number };
            return ok({ success: true, ranked: WebScrapeResultEngine.rankByLength(p.blocks, p.topK) });
          }
          case "web_scrape_render": {
            const { WebScrapeResultEngine } = await import("../../engines/WebScrapeResultEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: WebScrapeResultEngine.renderStructure(p.structure) });
          }

          // HCAP07 OCRResultEngine — structured OCR output.
          case "ocr_summarize": {
            const { OCRResultEngine } = await import("../../engines/OCRResultEngine.js");
            const p = params as { document_id: string; regions: never; low_confidence_threshold?: number };
            return ok({ success: true, summary: OCRResultEngine.summarize(p.document_id, p.regions, p.low_confidence_threshold) });
          }
          case "ocr_filter_by_confidence": {
            const { OCRResultEngine } = await import("../../engines/OCRResultEngine.js");
            const p = params as { regions: never; min_confidence: number };
            return ok({ success: true, regions: OCRResultEngine.filterByConfidence(p.regions, p.min_confidence) });
          }
          case "ocr_merge_text": {
            const { OCRResultEngine } = await import("../../engines/OCRResultEngine.js");
            const p = params as { regions: never };
            return ok({ success: true, text: OCRResultEngine.mergeText(p.regions) });
          }
          case "ocr_render": {
            const { OCRResultEngine } = await import("../../engines/OCRResultEngine.js");
            const p = params as { summary: never };
            return ok({ success: true, markdown: OCRResultEngine.renderSummary(p.summary) });
          }

          // HCAP08 ImageMetadataEngine — image metadata structural model.
          case "image_analyze": {
            const { ImageMetadataEngine } = await import("../../engines/ImageMetadataEngine.js");
            const p = params as { raw: never };
            return ok({ success: true, structure: ImageMetadataEngine.analyze(p.raw) });
          }
          case "image_strip_gps": {
            const { ImageMetadataEngine } = await import("../../engines/ImageMetadataEngine.js");
            const p = params as { raw: never };
            return ok({ success: true, stripped: ImageMetadataEngine.stripGPS(p.raw) });
          }
          case "image_render": {
            const { ImageMetadataEngine } = await import("../../engines/ImageMetadataEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: ImageMetadataEngine.renderStructure(p.structure) });
          }

          // HCAP09 EmailMessageEngine — email message structural model.
          case "email_analyze": {
            const { EmailMessageEngine } = await import("../../engines/EmailMessageEngine.js");
            const p = params as { raw: never };
            return ok({ success: true, structure: EmailMessageEngine.analyze(p.raw) });
          }
          case "email_same_thread": {
            const { EmailMessageEngine } = await import("../../engines/EmailMessageEngine.js");
            const p = params as { a: never; b: never };
            return ok({ success: true, sameThread: EmailMessageEngine.sameThread(p.a, p.b) });
          }
          case "email_render": {
            const { EmailMessageEngine } = await import("../../engines/EmailMessageEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: EmailMessageEngine.renderStructure(p.structure) });
          }

          // HCAP10 ZipArchiveEngine — zip-archive structural model.
          case "zip_analyze": {
            const { ZipArchiveEngine } = await import("../../engines/ZipArchiveEngine.js");
            const p = params as { archive_id: string; entries: never };
            return ok({ success: true, structure: ZipArchiveEngine.analyze(p.archive_id, p.entries) });
          }
          case "zip_filter_by_extension": {
            const { ZipArchiveEngine } = await import("../../engines/ZipArchiveEngine.js");
            const p = params as { entries: never; ext: string };
            return ok({ success: true, entries: ZipArchiveEngine.filterByExtension(p.entries, p.ext) });
          }
          case "zip_render": {
            const { ZipArchiveEngine } = await import("../../engines/ZipArchiveEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: ZipArchiveEngine.renderStructure(p.structure) });
          }

          // HCAP11 ParquetSchemaEngine.
          case "parquet_analyze": {
            const { ParquetSchemaEngine } = await import("../../engines/ParquetSchemaEngine.js");
            const p = params as { file: never };
            return ok({ success: true, structure: ParquetSchemaEngine.analyze(p.file) });
          }
          case "parquet_columns_of_type": {
            const { ParquetSchemaEngine } = await import("../../engines/ParquetSchemaEngine.js");
            const p = params as { file: never; t: never };
            return ok({ success: true, columns: ParquetSchemaEngine.columnsOfType(p.file, p.t) });
          }
          case "parquet_render": {
            const { ParquetSchemaEngine } = await import("../../engines/ParquetSchemaEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: ParquetSchemaEngine.renderStructure(p.structure) });
          }

          // HCAP12 SQLQueryStructureEngine.
          case "sql_query_analyze": {
            const { SQLQueryStructureEngine } = await import("../../engines/SQLQueryStructureEngine.js");
            const p = params as { query_id: string; sql: string };
            return ok({ success: true, structure: SQLQueryStructureEngine.analyze(p.query_id, p.sql) });
          }
          case "sql_query_render": {
            const { SQLQueryStructureEngine } = await import("../../engines/SQLQueryStructureEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: SQLQueryStructureEngine.renderStructure(p.structure) });
          }

          // HCAP13 GraphQLSchemaEngine.
          case "graphql_analyze": {
            const { GraphQLSchemaEngine } = await import("../../engines/GraphQLSchemaEngine.js");
            const p = params as { schema_id: string; types: never };
            return ok({ success: true, structure: GraphQLSchemaEngine.analyze(p.schema_id, p.types) });
          }
          case "graphql_render": {
            const { GraphQLSchemaEngine } = await import("../../engines/GraphQLSchemaEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: GraphQLSchemaEngine.renderStructure(p.structure) });
          }

          // HCAP14 RegexCatalogEngine.
          case "regex_register": {
            const { RegexCatalogEngine } = await import("../../engines/RegexCatalogEngine.js");
            const p = params as { state: never; entry: never };
            return ok({ success: true, state: RegexCatalogEngine.register(p.state, p.entry) });
          }
          case "regex_deregister": {
            const { RegexCatalogEngine } = await import("../../engines/RegexCatalogEngine.js");
            const p = params as { state: never; name: string };
            return ok({ success: true, state: RegexCatalogEngine.deregister(p.state, p.name) });
          }
          case "regex_test": {
            const { RegexCatalogEngine } = await import("../../engines/RegexCatalogEngine.js");
            const p = params as { state: never; name: string; input: string };
            return ok({ success: true, match: RegexCatalogEngine.test(p.state, p.name, p.input) });
          }
          case "regex_extract_all": {
            const { RegexCatalogEngine } = await import("../../engines/RegexCatalogEngine.js");
            const p = params as { state: never; name: string; input: string };
            return ok({ success: true, matches: RegexCatalogEngine.extractAll(p.state, p.name, p.input) });
          }
          case "regex_list": {
            const { RegexCatalogEngine } = await import("../../engines/RegexCatalogEngine.js");
            const p = params as { state: never };
            return ok({ success: true, list: RegexCatalogEngine.list(p.state) });
          }
          case "regex_render": {
            const { RegexCatalogEngine } = await import("../../engines/RegexCatalogEngine.js");
            const p = params as { state: never };
            return ok({ success: true, markdown: RegexCatalogEngine.renderState(p.state) });
          }

          // HCAP15 LocalizationBundleEngine.
          case "i18n_analyze": {
            const { LocalizationBundleEngine } = await import("../../engines/LocalizationBundleEngine.js");
            const p = params as { bundle_id: string; base_locale: string; locales: never };
            return ok({ success: true, structure: LocalizationBundleEngine.analyze(p.bundle_id, p.base_locale, p.locales) });
          }
          case "i18n_render": {
            const { LocalizationBundleEngine } = await import("../../engines/LocalizationBundleEngine.js");
            const p = params as { structure: never };
            return ok({ success: true, markdown: LocalizationBundleEngine.renderStructure(p.structure) });
          }

          // HCAP16 PluginPermissionMatrixEngine.
          case "perm_matrix_set": {
            const { PluginPermissionMatrixEngine } = await import("../../engines/PluginPermissionMatrixEngine.js");
            const p = params as { state: never; entry: never };
            return ok({ success: true, state: PluginPermissionMatrixEngine.set(p.state, p.entry) });
          }
          case "perm_matrix_lookup": {
            const { PluginPermissionMatrixEngine } = await import("../../engines/PluginPermissionMatrixEngine.js");
            const p = params as { state: never; plugin_id: string; capability: string };
            return ok({ success: true, entry: PluginPermissionMatrixEngine.lookup(p.state, p.plugin_id, p.capability) });
          }
          case "perm_matrix_remove": {
            const { PluginPermissionMatrixEngine } = await import("../../engines/PluginPermissionMatrixEngine.js");
            const p = params as { state: never; plugin_id: string; capability: string };
            return ok({ success: true, state: PluginPermissionMatrixEngine.remove(p.state, p.plugin_id, p.capability) });
          }
          case "perm_matrix_filter_by_verdict": {
            const { PluginPermissionMatrixEngine } = await import("../../engines/PluginPermissionMatrixEngine.js");
            const p = params as { state: never; verdict: never };
            return ok({ success: true, entries: PluginPermissionMatrixEngine.filterByVerdict(p.state, p.verdict) });
          }
          case "perm_matrix_stats": {
            const { PluginPermissionMatrixEngine } = await import("../../engines/PluginPermissionMatrixEngine.js");
            const p = params as { state: never };
            return ok({ success: true, ...PluginPermissionMatrixEngine.stats(p.state) });
          }
          case "perm_matrix_render": {
            const { PluginPermissionMatrixEngine } = await import("../../engines/PluginPermissionMatrixEngine.js");
            const p = params as { state: never };
            return ok({ success: true, markdown: PluginPermissionMatrixEngine.renderState(p.state) });
          }

          // HMPI04 SchemaDriftDetectorEngine.
          case "schema_drift_diff": {
            const { SchemaDriftDetectorEngine } = await import("../../engines/SchemaDriftDetectorEngine.js");
            const p = params as { a: never; b: never };
            return ok({ success: true, report: SchemaDriftDetectorEngine.diff(p.a, p.b) });
          }
          case "schema_drift_render": {
            const { SchemaDriftDetectorEngine } = await import("../../engines/SchemaDriftDetectorEngine.js");
            const p = params as { report: never };
            return ok({ success: true, markdown: SchemaDriftDetectorEngine.renderReport(p.report) });
          }

          // HMPI05 RateLimitGovernorEngine.
          case "rate_limit_initial": {
            const { RateLimitGovernorEngine } = await import("../../engines/RateLimitGovernorEngine.js");
            const p = params as { bucket_id: string; capacity: number; refill_rate_per_sec: number; at: string };
            return ok({ success: true, state: RateLimitGovernorEngine.initial(p.bucket_id, p.capacity, p.refill_rate_per_sec, p.at) });
          }
          case "rate_limit_refill": {
            const { RateLimitGovernorEngine } = await import("../../engines/RateLimitGovernorEngine.js");
            const p = params as { state: never; now_at: string };
            return ok({ success: true, state: RateLimitGovernorEngine.refill(p.state, p.now_at) });
          }
          case "rate_limit_consume": {
            const { RateLimitGovernorEngine } = await import("../../engines/RateLimitGovernorEngine.js");
            const p = params as { state: never; cost: number; now_at: string };
            return ok({ success: true, ...RateLimitGovernorEngine.consume(p.state, p.cost, p.now_at) });
          }
          case "rate_limit_render": {
            const { RateLimitGovernorEngine } = await import("../../engines/RateLimitGovernorEngine.js");
            const p = params as { state: never };
            return ok({ success: true, markdown: RateLimitGovernorEngine.renderState(p.state) });
          }

          // HMPI06 ToolDeprecationTrackerEngine.
          case "tool_dep_decide": {
            const { ToolDeprecationTrackerEngine } = await import("../../engines/ToolDeprecationTrackerEngine.js");
            const p = params as { tool: never; now_at: string };
            return ok({ success: true, verdict: ToolDeprecationTrackerEngine.decide(p.tool, p.now_at) });
          }
          case "tool_dep_aggregate": {
            const { ToolDeprecationTrackerEngine } = await import("../../engines/ToolDeprecationTrackerEngine.js");
            const p = params as { tools: never };
            return ok({ success: true, ...ToolDeprecationTrackerEngine.aggregate(p.tools) });
          }
          case "tool_dep_render": {
            const { ToolDeprecationTrackerEngine } = await import("../../engines/ToolDeprecationTrackerEngine.js");
            const p = params as { verdict: never };
            return ok({ success: true, markdown: ToolDeprecationTrackerEngine.renderVerdict(p.verdict) });
          }

          // HMPI07 TransportHealthProbeEngine.
          case "transport_health_analyze": {
            const { TransportHealthProbeEngine } = await import("../../engines/TransportHealthProbeEngine.js");
            const p = params as { transport_id: string; samples: never };
            return ok({ success: true, health: TransportHealthProbeEngine.analyze(p.transport_id, p.samples) });
          }
          case "transport_health_render": {
            const { TransportHealthProbeEngine } = await import("../../engines/TransportHealthProbeEngine.js");
            const p = params as { health: never };
            return ok({ success: true, markdown: TransportHealthProbeEngine.renderHealth(p.health) });
          }

          // HMPI08 AuthHandshakeEngine.
          case "auth_handshake_initial": {
            const { AuthHandshakeEngine } = await import("../../engines/AuthHandshakeEngine.js");
            const p = params as { handshake_id: string; plugin_id: string; at: string };
            return ok({ success: true, record: AuthHandshakeEngine.initial(p.handshake_id, p.plugin_id, p.at) });
          }
          case "auth_handshake_challenge": {
            const { AuthHandshakeEngine } = await import("../../engines/AuthHandshakeEngine.js");
            const p = params as { record: never; nonce: string; at: string };
            return ok({ success: true, record: AuthHandshakeEngine.challenge(p.record, p.nonce, p.at) });
          }
          case "auth_handshake_respond": {
            const { AuthHandshakeEngine } = await import("../../engines/AuthHandshakeEngine.js");
            const p = params as { record: never; at: string };
            return ok({ success: true, record: AuthHandshakeEngine.respond(p.record, p.at) });
          }
          case "auth_handshake_verify": {
            const { AuthHandshakeEngine } = await import("../../engines/AuthHandshakeEngine.js");
            const p = params as { record: never; ok: boolean; at: string; reason?: string };
            return ok({ success: true, record: AuthHandshakeEngine.verify(p.record, p.ok, p.at, p.reason) });
          }
          case "auth_handshake_render": {
            const { AuthHandshakeEngine } = await import("../../engines/AuthHandshakeEngine.js");
            const p = params as { record: never };
            return ok({ success: true, markdown: AuthHandshakeEngine.renderRecord(p.record) });
          }

          // HMPI09 PluginInstallManifestEngine.
          case "plugin_manifest_check": {
            const { PluginInstallManifestEngine } = await import("../../engines/PluginInstallManifestEngine.js");
            const p = params as { manifest: never };
            return ok({ success: true, validation: PluginInstallManifestEngine.check(p.manifest) });
          }
          case "plugin_manifest_render": {
            const { PluginInstallManifestEngine } = await import("../../engines/PluginInstallManifestEngine.js");
            const p = params as { validation: never };
            return ok({ success: true, markdown: PluginInstallManifestEngine.renderValidation(p.validation) });
          }

          // HMPI10 McpResourceLifecycleEngine.
          case "mcp_resource_validate": {
            const { McpResourceLifecycleEngine } = await import("../../engines/McpResourceLifecycleEngine.js");
            const p = params as { resource: unknown };
            return ok({ success: true, resource: McpResourceLifecycleEngine.validate(p.resource) });
          }
          case "mcp_resource_begin_load": {
            const { McpResourceLifecycleEngine } = await import("../../engines/McpResourceLifecycleEngine.js");
            const p = params as { resource: never };
            return ok({ success: true, resource: McpResourceLifecycleEngine.beginLoad(p.resource) });
          }
          case "mcp_resource_mark_ready": {
            const { McpResourceLifecycleEngine } = await import("../../engines/McpResourceLifecycleEngine.js");
            const p = params as { resource: never; size_bytes: number; at: string };
            return ok({ success: true, resource: McpResourceLifecycleEngine.markReady(p.resource, p.size_bytes, p.at) });
          }
          case "mcp_resource_mark_failed": {
            const { McpResourceLifecycleEngine } = await import("../../engines/McpResourceLifecycleEngine.js");
            const p = params as { resource: never; reason: string };
            return ok({ success: true, resource: McpResourceLifecycleEngine.markFailed(p.resource, p.reason) });
          }
          case "mcp_resource_revoke": {
            const { McpResourceLifecycleEngine } = await import("../../engines/McpResourceLifecycleEngine.js");
            const p = params as { resource: never };
            return ok({ success: true, resource: McpResourceLifecycleEngine.revoke(p.resource) });
          }
          case "mcp_resource_render": {
            const { McpResourceLifecycleEngine } = await import("../../engines/McpResourceLifecycleEngine.js");
            const p = params as { resource: never };
            return ok({ success: true, markdown: McpResourceLifecycleEngine.renderResource(p.resource) });
          }

          // HMPI11 PluginUpgradePathEngine.
          case "plugin_upgrade_classify": {
            const { PluginUpgradePathEngine } = await import("../../engines/PluginUpgradePathEngine.js");
            const p = params as { from: string; to: string };
            return ok({ success: true, verdict: PluginUpgradePathEngine.classify(p.from, p.to) });
          }
          case "plugin_upgrade_render": {
            const { PluginUpgradePathEngine } = await import("../../engines/PluginUpgradePathEngine.js");
            const p = params as { verdict: never };
            return ok({ success: true, markdown: PluginUpgradePathEngine.renderVerdict(p.verdict) });
          }

          // HMPI12 WebhookSubscriptionEngine.
          case "webhook_subscription_check_add": {
            const { WebhookSubscriptionEngine } = await import("../../engines/WebhookSubscriptionEngine.js");
            const p = params as { existing?: never[]; proposed: never };
            return ok({ success: true, verdict: WebhookSubscriptionEngine.checkAdd(p.existing ?? [], p.proposed) });
          }
          case "webhook_subscription_render": {
            const { WebhookSubscriptionEngine } = await import("../../engines/WebhookSubscriptionEngine.js");
            const p = params as { verdict: never };
            return ok({ success: true, markdown: WebhookSubscriptionEngine.renderVerdict(p.verdict) });
          }

          // HMPI13 ToolCallAuditLogEngine.
          case "tool_call_audit_append": {
            const { ToolCallAuditLogEngine } = await import("../../engines/ToolCallAuditLogEngine.js");
            const p = params as { ring?: never[]; entry: never; maxEntries?: number };
            return ok({ success: true, ring: ToolCallAuditLogEngine.append(p.ring ?? [], p.entry, p.maxEntries) });
          }
          case "tool_call_audit_summarize": {
            const { ToolCallAuditLogEngine } = await import("../../engines/ToolCallAuditLogEngine.js");
            const p = params as { ring?: never[]; tool: string; recent_n?: number };
            return ok({ success: true, summary: ToolCallAuditLogEngine.summarize(p.ring ?? [], p.tool, p.recent_n) });
          }
          case "tool_call_audit_render": {
            const { ToolCallAuditLogEngine } = await import("../../engines/ToolCallAuditLogEngine.js");
            const p = params as { summary: never };
            return ok({ success: true, markdown: ToolCallAuditLogEngine.renderSummary(p.summary) });
          }

          // HMPI14 PluginSandboxPolicyEngine.
          case "plugin_sandbox_evaluate": {
            const { PluginSandboxPolicyEngine } = await import("../../engines/PluginSandboxPolicyEngine.js");
            const p = params as { request: never };
            return ok({ success: true, verdict: PluginSandboxPolicyEngine.evaluate(p.request) });
          }
          case "plugin_sandbox_render": {
            const { PluginSandboxPolicyEngine } = await import("../../engines/PluginSandboxPolicyEngine.js");
            const p = params as { verdict: never };
            return ok({ success: true, markdown: PluginSandboxPolicyEngine.renderVerdict(p.verdict) });
          }

          // HZP01.0 HermesWorkSourceFeederEngine -- normalize heterogeneous work-source rows
          // (roadmap / research / wiring / synthesis) into deduped, claim-filtered, risk-classified
          // Subtask[] -- the INPUT stage feeding hermes_fanout_plan. Pure: the caller reads + normalizes
          // the sources and computes peer-held claims (this engine does no I/O). Validation lives inside
          // HermesWorkSourceFeederEngine.toSubtasks (FeederRequestSchema.parse) -- same pass-through
          // pattern as hermes_fanout_plan.
          case "hermes_work_source_feed": {
            const { HermesWorkSourceFeederEngine } = await import("../../engines/HermesWorkSourceFeederEngine.js");
            const p = params as { request: never };
            return ok({ success: true, result: HermesWorkSourceFeederEngine.toSubtasks(p.request) });
          }
          // HZP01 HermesParallelFanoutPlannerEngine — decompose a parent task into N parallel agents.
          case "hermes_fanout_plan": {
            const { HermesParallelFanoutPlannerEngine } = await import("../../engines/HermesParallelFanoutPlannerEngine.js");
            const p = params as { request: never };
            return ok({ success: true, plan: HermesParallelFanoutPlannerEngine.plan(p.request) });
          }
          case "hermes_fanout_render": {
            const { HermesParallelFanoutPlannerEngine } = await import("../../engines/HermesParallelFanoutPlannerEngine.js");
            const p = params as { plan: never };
            return ok({ success: true, markdown: HermesParallelFanoutPlannerEngine.renderPlan(p.plan) });
          }
          // HZP01.5 auto-trigger gate — decide WHEN a raw task warrants fan-out (was the dormant gap: ~28% Hermes utilization).
          case "hermes_auto_fanout_gate": {
            const { HermesParallelFanoutPlannerEngine } = await import("../../engines/HermesParallelFanoutPlannerEngine.js");
            const p = params as { prompt_text?: string; threshold?: number; max_parallel?: number };
            return ok({ success: true, assessment: HermesParallelFanoutPlannerEngine.assessAutoTrigger(p.prompt_text, { threshold: p.threshold, maxParallel: p.max_parallel }) });
          }
          case "hermes_auto_fanout_render": {
            const { HermesParallelFanoutPlannerEngine } = await import("../../engines/HermesParallelFanoutPlannerEngine.js");
            const p = params as { assessment: never };
            return ok({ success: true, markdown: HermesParallelFanoutPlannerEngine.renderAutoTrigger(p.assessment) });
          }

          // C1 ZuluWaveSchedulerEngine -- full topological wave partition + incremental next-wave (closes HZP01 wave-1-only gap).
          case "schedule_wave": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { plan: never };
            return ok({ success: true, partition: ZuluWaveSchedulerEngine.allWaves(p.plan) });
          }
          case "compute_wave_n": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { plan: never; completed_ids?: string[] };
            return ok({ success: true, next: ZuluWaveSchedulerEngine.computeWaveN(p.plan, p.completed_ids ?? []) });
          }
          // HERMES-AUTONOMOUS-DRIVER -- the autonomous-build DRIVER chained over the wave scheduler.
          // Pure state-machine round-trip: start -> (next_batch -> consumer spawns -> record)* -> aggregate.
          // The risky agent-spawning lives in the GATED consumer (PRISM_HERMES_AUTONOMOUS_DRIVE); these
          // actions only orchestrate STATE, so they are safe + side-effect-free (R13 verifiable core).
          case "autonomous_drive_start": {
            const { HermesAutonomousDriverEngine } = await import("../../engines/HermesAutonomousDriverEngine.js");
            const p = params as { parent_task_id: string; subtasks: never[]; bounds?: { maxIterations?: number; maxRetries?: number } };
            return ok({ success: true, state: HermesAutonomousDriverEngine.start({ parent_task_id: p.parent_task_id, subtasks: p.subtasks, bounds: p.bounds }) });
          }
          case "autonomous_drive_next_batch": {
            const { HermesAutonomousDriverEngine } = await import("../../engines/HermesAutonomousDriverEngine.js");
            const p = params as { state: never };
            return ok({ success: true, batch: HermesAutonomousDriverEngine.nextBatch(p.state) });
          }
          case "autonomous_drive_record": {
            const { HermesAutonomousDriverEngine } = await import("../../engines/HermesAutonomousDriverEngine.js");
            const p = params as { state: never; results: never[] };
            return ok({ success: true, state: HermesAutonomousDriverEngine.recordResults(p.state, p.results) });
          }
          case "autonomous_drive_aggregate": {
            const { HermesAutonomousDriverEngine } = await import("../../engines/HermesAutonomousDriverEngine.js");
            const p = params as { state: never };
            return ok({ success: true, summary: HermesAutonomousDriverEngine.aggregate(p.state) });
          }
          // HERMES-AUTONOMOUS-DRIVER RUNNER -- the GATED full self-driving loop (default-OFF).
          // Refuses unless PRISM_HERMES_AUTONOMOUS_DRIVE=1 or gate:true. When armed, each ready
          // wave is executed via local Ollama (mechanical default; the Ollama->Sonnet->Opus ladder).
          case "autonomous_drive": {
            const { HermesAutonomousDriveRunnerEngine } = await import("../../engines/HermesAutonomousDriveRunnerEngine.js");
            const p = params as {
              goal?: string; subtasks?: never[]; candidates?: never[]; parent_task_id?: string;
              bounds?: { maxIterations?: number; maxRetries?: number };
              max_parallel?: number; per_subtask_timeout_ms?: number; gate?: boolean; model?: string;
            };
            const gateEnabled = p.gate === true || process.env.PRISM_HERMES_AUTONOMOUS_DRIVE === "1";
            if (!gateEnabled) {
              // SAFE DEFAULT: refuse to execute autonomous agent waves; return the gated envelope.
              return ok({ success: true, result: { ran: false, gated: true, reason: "gated-off (set PRISM_HERMES_AUTONOMOUS_DRIVE=1 or pass gate:true)", state: null, aggregate: null, trace: [] } });
            }
            const { ollamaClientEngine } = await import("../../engines/OllamaClientEngine.js");
            const model = typeof p.model === "string" && p.model.trim() ? p.model : "qwen2.5-coder:32b";
            if (!ollamaClientEngine.isConnected()) {
              const conn = await ollamaClientEngine.connect();
              if (!conn.ok) {
                // FAIL LOUD (R12): surface the unreachable daemon instead of silently burning the
                // whole retry budget on "not connected" generate failures with no clear cause.
                return ok({ success: true, result: { ran: false, gated: false, reason: `ollama-connect-failed: ${conn.error ?? "unknown"}`, state: null, aggregate: null, trace: [] } });
              }
            }
            const executor = async (subtask: { subtask_id: string; description: string; domain: string }) => {
              const r = await ollamaClientEngine.generate({
                model,
                prompt: `Execute this manufacturing-software subtask and report the result concisely.\nDomain: ${subtask.domain}\nTask: ${subtask.description}`,
              });
              return r.ok ? { ok: true, output: String(r.value ?? "").slice(0, 4000) } : { ok: false, error: r.error ?? "ollama-generate-failed" };
            };
            const llm = async (prompt: string) => {
              const r = await ollamaClientEngine.generate({ model, prompt });
              return r.ok ? String(r.value ?? "") : "";
            };
            const result = await HermesAutonomousDriveRunnerEngine.drive({
              executor,
              subtasks: p.subtasks as never,
              goal: p.goal,
              candidates: p.candidates as never,
              decompose: llm,
              parent_task_id: p.parent_task_id,
              bounds: p.bounds,
              maxParallel: p.max_parallel,
              // The LIVE Ollama path MUST have a per-subtask ceiling -- a hung daemon would
              // otherwise block a wave's Promise.all forever (waveCap only guards BETWEEN waves).
              // Default 3 min; callers may override, including 0 to explicitly disable.
              perSubtaskTimeoutMs: typeof p.per_subtask_timeout_ms === "number" ? p.per_subtask_timeout_ms : 180_000,
              gateEnabled: true,
            });
            return ok({ success: true, result });
          }
          case "wave_partition_render": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { partition: never };
            return ok({ success: true, markdown: ZuluWaveSchedulerEngine.renderPartition(p.partition) });
          }
          case "wave_next_render": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { next: never };
            return ok({ success: true, markdown: ZuluWaveSchedulerEngine.renderNextWave(p.next) });
          }
          // C1 executable-wave bridge: given the full FanoutPlanRequest (subtasks + candidates +
          // max_parallel) and the cumulative completed_ids, return the NEXT wave as dispatchable
          // slot assignments. The runtime loops: call -> spawn the Agent batch -> feed back completed.
          case "next_wave_execute": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { request: never; completed_ids?: string[] };
            return ok({ success: true, execution: ZuluWaveSchedulerEngine.nextWaveAssignments(p.request, p.completed_ids ?? []) });
          }
          case "wave_exec_render": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { execution: never };
            return ok({ success: true, markdown: ZuluWaveSchedulerEngine.renderWaveExecution(p.execution) });
          }
          // C1 SAFETY GATE: like next_wave_execute, but every assignment passes the
          // ZuluFleetGovernorEngine authority check first. The CALLER supplies the parsed
          // souls (slot -> SlotSoul) -- same caller-provides-soul contract as check_authority
          // -- so this stays pure (no disk I/O). An unauthorized assignment is moved to
          // `vetoed` (never dispatched); a slot with no soul fails closed.
          case "governed_wave_execute": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { request: never; completed_ids?: string[]; souls?: Record<string, never>; apply_delegation?: boolean; enforce_backpressure?: boolean; surface_backpressure?: boolean };
            const soulMap = new Map(Object.entries(p.souls ?? {}));
            // C4 delegation pre-gate (default-ON; apply_delegation:false opts out). The full
            // durable contract set is injected; with NO live contract the gate is a no-op (every
            // assignment reads "no-contract" -> governor verdict unchanged). It NARROWS
            // (authorized -> vetoed) only where an orchestrator-granted contract denies.
            const zdMod = p.apply_delegation === false ? null : await import("../../engines/ZuluDelegationContractEngine.js");
            const delegation = zdMod ? { contracts: zdMod.zuluDelegationContractEngine.allContracts(), nowMs: Date.now() } : undefined;
            const governed = ZuluWaveSchedulerEngine.governedNextWave(p.request, p.completed_ids ?? [], soulMap, delegation);
            const execution = await applyBackPressureThrottle(governed, p.enforce_backpressure, p.surface_backpressure);
            return ok({ success: true, execution });
          }
          // C1 FULL PROJECTION: the COMPLETE governed multi-wave schedule in ONE call -- loops the
          // governor over simulated all-succeed completions to a drains/stalled feasibility verdict.
          // The upfront check a runtime executor runs BEFORE spawning any agent (will this DAG drain
          // as governed, or stall on a vetoed/unrouted subtask?). Same caller-provides-souls +
          // default-ON delegation contract as governed_wave_execute; NO back-pressure (a static plan
          // -- throttle is a runtime load-shaper and never changes drain-ability).
          case "project_governed_schedule": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { request: never; souls?: Record<string, never>; apply_delegation?: boolean };
            const soulMap = new Map(Object.entries(p.souls ?? {}));
            const zdMod = p.apply_delegation === false ? null : await import("../../engines/ZuluDelegationContractEngine.js");
            const delegation = zdMod ? { contracts: zdMod.zuluDelegationContractEngine.allContracts(), nowMs: Date.now() } : undefined;
            return ok({ success: true, schedule: ZuluWaveSchedulerEngine.projectGovernedSchedule(p.request, soulMap, delegation) });
          }
          case "project_schedule_render": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const p = params as { schedule: never };
            return ok({ success: true, markdown: ZuluWaveSchedulerEngine.renderProjectedSchedule(p.schedule) });
          }
          // C1 FRONT-END: decompose a raw goal into a SubtaskSchema DAG (FanoutPlanRequest) the
          // multi-wave executor consumes. Decomposition is reasoning -> local Ollama (R5); the engine
          // stays pure (the llm is injected here). prompt_only:true returns the built prompt with NO
          // LLM call (hermetic wiring proof + lets a caller route the prompt themselves). Fail-loud
          // (R12): an undecomposable goal / Ollama-down / invalid DAG THROWS -- never a fabricated plan.
          case "hermes_decompose_goal": {
            const { HermesGoalDecomposerEngine } = await import("../../engines/HermesGoalDecomposerEngine.js");
            const p = params as {
              goal?: string; candidates?: never[]; parent_id?: string; parentId?: string;
              max_parallel?: number; maxParallel?: number; max_subtasks?: number; maxSubtasks?: number;
              model?: string; prompt_only?: boolean; promptOnly?: boolean;
            };
            const goal = String(p.goal ?? "");
            const candidates = Array.isArray(p.candidates) ? p.candidates : [];
            const maxSubtasks = typeof p.max_subtasks === "number" ? p.max_subtasks : p.maxSubtasks;
            if (p.prompt_only === true || p.promptOnly === true) {
              // No LLM call -- build + return the prompt only (the hermetic wiring path).
              return ok({ success: true, prompt: HermesGoalDecomposerEngine.buildDecomposePrompt(goal, candidates, { maxSubtasks }) });
            }
            const { ollamaClientEngine } = await import("../../engines/OllamaClientEngine.js");
            const model = String(p.model ?? "qwen2.5-coder:32b");
            // Injected llm: route the decomposition prompt to the local model. Fail-loud on a down
            // daemon or a generate error so decompose() never silently fabricates a plan (R12).
            const llm = async (prompt: string): Promise<string> => {
              if (!ollamaClientEngine.isConnected()) {
                const conn = await ollamaClientEngine.connect();
                if (!conn.ok) throw new Error(`hermes_decompose_goal: Ollama connect failed -- ${conn.error}`);
              }
              const r = await ollamaClientEngine.generate({
                model, prompt,
                system: "You are a build planner. Reply with STRICT JSON only -- no prose, no markdown fences.",
                temperature: 0.1, maxTokens: 2048,
              });
              if (!r.ok) throw new Error(`hermes_decompose_goal: Ollama generate failed -- ${r.error}`);
              return String(r.value ?? "");
            };
            const request = await HermesGoalDecomposerEngine.decompose(goal, candidates, {
              llm,
              parentId: p.parent_id ?? p.parentId,
              maxParallel: typeof p.max_parallel === "number" ? p.max_parallel : p.maxParallel,
              maxSubtasks,
            });
            return ok({ success: true, request, model });
          }
          // C1+C2 RESUMABILITY: a governed wave-loop step that SURVIVES /compact. Resumes the
          // cumulative completed_ids from the ZuluTaskContinuityEngine (the recovery oracle's
          // first real PRODUCER), merges the caller's newly_completed, computes the next GOVERNED
          // wave, and CHECKPOINTS the advanced state back -- so a self-startup re-entry resumes a
          // multi-wave build exactly where /compact interrupted it. unit_id is the continuity key
          // (MILESTONE::U-ID); a bad id surfaces as checkpointed:false (R12), never silent.
          case "wave_loop_step": {
            const { ZuluWaveSchedulerEngine } = await import("../../engines/ZuluWaveSchedulerEngine.js");
            const { zuluTaskContinuityEngine: zc } = await import("../../engines/ZuluTaskContinuityEngine.js");
            const p = params as { unit_id: never; request: never; newly_completed?: string[]; souls?: Record<string, never>; slot?: string; chat_id?: string; apply_delegation?: boolean; enforce_backpressure?: boolean; surface_backpressure?: boolean };
            const prior = zc.resume(p.unit_id);
            const priorCompleted = (prior.record?.state as { completed_ids?: unknown[] } | undefined)?.completed_ids;
            const completed = ZuluWaveSchedulerEngine.mergeCompleted(priorCompleted, p.newly_completed);
            const soulMap = new Map(Object.entries(p.souls ?? {}));
            // C4 delegation pre-gate (default-ON; apply_delegation:false opts out) -- same
            // strictly-narrowing, no-op-when-no-contract semantics as governed_wave_execute.
            const zdMod = p.apply_delegation === false ? null : await import("../../engines/ZuluDelegationContractEngine.js");
            const delegation = zdMod ? { contracts: zdMod.zuluDelegationContractEngine.allContracts(), nowMs: Date.now() } : undefined;
            const governed = ZuluWaveSchedulerEngine.governedNextWave(p.request, completed, soulMap, delegation);
            // C5 back-pressure throttle: HELD assignments are NOT dispatched + NOT checkpointed as
            // completed, so the next wave_loop_step re-offers them once pressure clears.
            const execution = await applyBackPressureThrottle(governed, p.enforce_backpressure, p.surface_backpressure);
            const cp = zc.checkpoint(p.unit_id, ZuluWaveSchedulerEngine.loopCheckpointState(completed, execution), { slot: p.slot, chatId: p.chat_id });
            return ok({ success: true, execution, completed_ids: completed, resumed: prior.found === true, resumedStale: prior.stale === true, checkpointed: cp.ok });
          }

          // C2 ZuluTaskContinuityEngine -- durable cross-session mid-flight task continuity (checkpoint/resume/list).
          case "continuity_checkpoint": {
            const { zuluTaskContinuityEngine: zc } = await import("../../engines/ZuluTaskContinuityEngine.js");
            const p = params as { unit?: unknown; state?: unknown; slot?: unknown; chatId?: unknown; chat_id?: unknown };
            return ok(zc.checkpoint(String(p.unit ?? ""), p.state, {
              slot: typeof p.slot === "string" ? p.slot : undefined,
              chatId: typeof p.chatId === "string" ? p.chatId : (typeof p.chat_id === "string" ? p.chat_id : undefined),
            }));
          }
          case "continuity_resume": {
            const { zuluTaskContinuityEngine: zc } = await import("../../engines/ZuluTaskContinuityEngine.js");
            const p = params as { unit?: unknown };
            return ok(zc.resume(String(p.unit ?? "")));
          }
          case "continuity_list_midflights": {
            const { zuluTaskContinuityEngine: zc } = await import("../../engines/ZuluTaskContinuityEngine.js");
            return ok(zc.listMidflights());
          }

          // C3 ZuluFleetHealthSynthesisEngine -- slot heartbeats/queue/coverage -> scored readiness vector.
          case "zulu_fleet_health_snapshot": {
            const { ZuluFleetHealthSynthesisEngine } = await import("../../engines/ZuluFleetHealthSynthesisEngine.js");
            const p = params as { request: Parameters<typeof ZuluFleetHealthSynthesisEngine.synthesize>[0] };
            return ok({ success: true, vector: ZuluFleetHealthSynthesisEngine.synthesize(p.request) });
          }
          case "zulu_fleet_health_slot_readiness": {
            const { ZuluFleetHealthSynthesisEngine } = await import("../../engines/ZuluFleetHealthSynthesisEngine.js");
            const p = params as { request: Parameters<typeof ZuluFleetHealthSynthesisEngine.synthesize>[0] };
            const vector = ZuluFleetHealthSynthesisEngine.synthesize(p.request);
            return ok({ success: true, readiness: ZuluFleetHealthSynthesisEngine.slotReadiness(vector) });
          }

          // HZP02 HermesFileScopePartitionerEngine — partition files to prevent index.lock thrash.
          case "hermes_file_scope_partition": {
            const { HermesFileScopePartitionerEngine } = await import("../../engines/HermesFileScopePartitionerEngine.js");
            const p = params as { scopes: never[] };
            return ok({ success: true, result: HermesFileScopePartitionerEngine.partition(p.scopes) });
          }
          case "hermes_file_scope_render": {
            const { HermesFileScopePartitionerEngine } = await import("../../engines/HermesFileScopePartitionerEngine.js");
            const p = params as { result: never };
            return ok({ success: true, markdown: HermesFileScopePartitionerEngine.renderResult(p.result) });
          }

          // HZP03 HermesParallelBudgetEnvelopeEngine — token-spend envelope per fan-out.
          case "hermes_budget_estimate": {
            const { HermesParallelBudgetEnvelopeEngine } = await import("../../engines/HermesParallelBudgetEnvelopeEngine.js");
            const p = params as { request: never };
            return ok({ success: true, verdict: HermesParallelBudgetEnvelopeEngine.estimate(p.request) });
          }
          case "hermes_budget_render": {
            const { HermesParallelBudgetEnvelopeEngine } = await import("../../engines/HermesParallelBudgetEnvelopeEngine.js");
            const p = params as { verdict: never };
            return ok({ success: true, markdown: HermesParallelBudgetEnvelopeEngine.renderVerdict(p.verdict) });
          }

          // HZP04 HermesParallelVerdictAggregatorEngine — merge N parallel agent verdicts.
          case "hermes_verdict_aggregate": {
            const { HermesParallelVerdictAggregatorEngine } = await import("../../engines/HermesParallelVerdictAggregatorEngine.js");
            const p = params as { verdicts: never[] };
            return ok({ success: true, result: HermesParallelVerdictAggregatorEngine.aggregate(p.verdicts) });
          }
          case "hermes_verdict_render": {
            const { HermesParallelVerdictAggregatorEngine } = await import("../../engines/HermesParallelVerdictAggregatorEngine.js");
            const p = params as { result: never };
            return ok({ success: true, markdown: HermesParallelVerdictAggregatorEngine.renderResult(p.result) });
          }

          // HSE01 SoulFrontmatterReaderEngine — parse slot soul markdown into typed SlotSoul.
          case "soul_parse": {
            const { SoulFrontmatterReaderEngine } = await import("../../engines/SoulFrontmatterReaderEngine.js");
            const p = params as { source: string; slot: string };
            return ok({ success: true, result: SoulFrontmatterReaderEngine.parse(p.source, p.slot) });
          }
          case "soul_summary_render": {
            const { SoulFrontmatterReaderEngine } = await import("../../engines/SoulFrontmatterReaderEngine.js");
            const p = params as { soul: never };
            return ok({ success: true, markdown: SoulFrontmatterReaderEngine.renderSummary(p.soul) });
          }

          // HSE02 SoulSubagentRouterEngine — wire preferred_subagent_type into Agent-tool routing.
          case "soul_subagent_route": {
            const { SoulSubagentRouterEngine } = await import("../../engines/SoulSubagentRouterEngine.js");
            const p = params as { soul: never; request: never };
            return ok({ success: true, verdict: SoulSubagentRouterEngine.route(p.soul, p.request) });
          }
          case "soul_subagent_render": {
            const { SoulSubagentRouterEngine } = await import("../../engines/SoulSubagentRouterEngine.js");
            const p = params as { verdict: never };
            return ok({ success: true, markdown: SoulSubagentRouterEngine.renderVerdict(p.verdict) });
          }

          // DOMAIN-SOUL-AGENTS/U4 -- given a task, return the domain-soul agent that should
          // handle it (<slot>-<domain>) + the hybrid lane (claude/hermes/ollama). Composes the
          // 26 slot souls' domain_filter regexes (which domain does this task touch?) with the
          // HybridAgentDispatchEngine lane selector. Read-only; the caller spawns the agent.
          case "domain_soul_agent_route": {
            const fsMod = await import("node:fs");
            const pathMod = await import("node:path");
            const { SoulFrontmatterReaderEngine } = await import("../../engines/SoulFrontmatterReaderEngine.js");
            const { HybridAgentDispatchEngine } = await import("../../engines/HybridAgentDispatchEngine.js");
            const { SLOT_GALAXY_MAP } = await import("../../../../scripts/lib/slot-galaxy-map.mjs");
            const p = params as {
              task_text?: string;
              task_kind?: string;
              hermes_healthy?: boolean;
              ollama_healthy?: boolean;
              parallelism?: number;
            };
            const taskText = String(p.task_text ?? "");
            // PRISM_ROOT-relative slot-souls dir (the dispatcher runs from mcp-server).
            const root = process.env.PRISM_ROOT || pathMod.resolve(process.cwd(), "..");
            const soulsDir = pathMod.join(root, "state/shared/slot-souls");
            const matches: Array<{ slot: string; domain: string; agent: string }> = [];
            for (const [slot, domain] of Object.entries(SLOT_GALAXY_MAP as Record<string, string>)) {
              if (slot === "zebra") continue; // alias of zulu
              let raw = "";
              try {
                raw = fsMod.readFileSync(pathMod.join(soulsDir, `${slot}.md`), "utf8");
              } catch {
                continue;
              }
              const parsed = SoulFrontmatterReaderEngine.parse(raw, slot);
              const df = parsed.ok && parsed.soul ? parsed.soul.domain_filter : undefined;
              if (!df) continue;
              try {
                if (new RegExp(df, "i").test(taskText)) {
                  matches.push({ slot, domain, agent: `${slot}-${domain}` });
                }
              } catch {
                /* bad regex in a soul -> skip, never throw (R12) */
              }
            }
            // Lane selection for the top match (or a neutral verdict when no domain matched).
            const top = matches[0];
            const allowedKinds = ["review", "audit", "research", "plan", "draft", "build", "safety_write"];
            const taskKind = allowedKinds.includes(String(p.task_kind))
              ? (p.task_kind as "review")
              : "review";
            const verdict = top
              ? HybridAgentDispatchEngine.selectLane({
                  agent: top.agent,
                  task_kind: taskKind,
                  hermes_healthy: p.hermes_healthy === true,
                  ollama_healthy: p.ollama_healthy,
                  parallelism: p.parallelism,
                })
              : null;
            return ok({
              success: true,
              matched: matches.length > 0,
              agent: top ? top.agent : null,
              all_matches: matches,
              lane: verdict,
            });
          }

          // HSE03 SoulEscalationCheckerEngine — enforce escalation_path against edit context.
          case "soul_escalation_check": {
            const { SoulEscalationCheckerEngine } = await import("../../engines/SoulEscalationCheckerEngine.js");
            const p = params as { soul: never; context: never };
            return ok({ success: true, check: SoulEscalationCheckerEngine.check(p.soul, p.context) });
          }
          case "soul_escalation_render": {
            const { SoulEscalationCheckerEngine } = await import("../../engines/SoulEscalationCheckerEngine.js");
            const p = params as { check: never };
            return ok({ success: true, markdown: SoulEscalationCheckerEngine.renderCheck(p.check) });
          }

          // HSE04 SoulHtmlRenderEngine — emit per-slot soul.html companion.
          case "soul_html_render": {
            const { SoulHtmlRenderEngine } = await import("../../engines/SoulHtmlRenderEngine.js");
            const p = params as { soul: never };
            return ok({ success: true, html: SoulHtmlRenderEngine.render(p.soul) });
          }

          // HSE05 SoulFleetRollupEngine — fleet-wide soul rollup + html grid.
          case "soul_fleet_rollup": {
            const { SoulFleetRollupEngine } = await import("../../engines/SoulFleetRollupEngine.js");
            const p = params as { souls: never[] };
            return ok({ success: true, rollup: SoulFleetRollupEngine.rollup(p.souls) });
          }
          case "soul_fleet_html": {
            const { SoulFleetRollupEngine } = await import("../../engines/SoulFleetRollupEngine.js");
            const p = params as { rollup: never };
            return ok({ success: true, html: SoulFleetRollupEngine.renderHtml(p.rollup) });
          }
          case "soul_fleet_summary": {
            const { SoulFleetRollupEngine } = await import("../../engines/SoulFleetRollupEngine.js");
            const p = params as { rollup: never };
            return ok({ success: true, markdown: SoulFleetRollupEngine.renderSummary(p.rollup) });
          }

          // HSE06 DreamLoopProposalEngine — soul-coupled dream loop proposer.
          case "dream_propose": {
            const { DreamLoopProposalEngine } = await import("../../engines/DreamLoopProposalEngine.js");
            const p = params as { request: never };
            return ok({ success: true, batch: DreamLoopProposalEngine.propose(p.request) });
          }
          case "dream_batch_render": {
            const { DreamLoopProposalEngine } = await import("../../engines/DreamLoopProposalEngine.js");
            const p = params as { batch: never };
            return ok({ success: true, markdown: DreamLoopProposalEngine.renderBatch(p.batch) });
          }

          // HSE07 DreamConsolidationEngine — collapse N nights of dream proposals.
          case "dream_consolidate": {
            const { DreamConsolidationEngine } = await import("../../engines/DreamConsolidationEngine.js");
            const p = params as { request: never };
            return ok({ success: true, queue: DreamConsolidationEngine.consolidate(p.request) });
          }
          case "dream_queue_render": {
            const { DreamConsolidationEngine } = await import("../../engines/DreamConsolidationEngine.js");
            const p = params as { queue: never };
            return ok({ success: true, markdown: DreamConsolidationEngine.renderQueue(p.queue) });
          }

          // DREAM-RECEIPT-MS0 — DreamArtifactBundleEngine receipt-bundle surface (Hermes Dreaming v0.1.0 interop).
          // U-DR06 — capability metadata for clients to discover the bundle surface before building.
          case "dream_status": {
            const { DreamArtifactBundleEngine } = await import("../../engines/DreamArtifactBundleEngine.js");
            return ok({ success: true, capabilities: DreamArtifactBundleEngine.getCapabilities() });
          }
          // U-DR02 — annotate every proposal with would_change vs no-op against caller-supplied live content map.
          case "dream_diff": {
            const { DreamArtifactBundleEngine } = await import("../../engines/DreamArtifactBundleEngine.js");
            const p = params as { bundle: never; live_content: Record<string, string> };
            return ok({ success: true, diff: DreamArtifactBundleEngine.diffAgainstLive(p.bundle, p.live_content ?? {}) });
          }
          // U-DR03 — validate bundle against schema + cross-field invariants (non-throwing; returns {ok, errors[]}).
          case "dream_validate": {
            const { DreamArtifactBundleEngine } = await import("../../engines/DreamArtifactBundleEngine.js");
            const p = params as { bundle: unknown };
            return ok({ success: true, validation: DreamArtifactBundleEngine.validateBundle(p.bundle) });
          }
          // U-DR04 — compute apply-plan (pure-fn); caller does the I/O (backup → write/delete).
          case "dream_apply": {
            const { DreamArtifactBundleEngine } = await import("../../engines/DreamArtifactBundleEngine.js");
            const p = params as { bundle: never; approve_list: "all" | string[]; backup_root: string };
            const approve = p.approve_list === "all" ? "all" : (Array.isArray(p.approve_list) ? p.approve_list : []);
            return ok({ success: true, plan: DreamArtifactBundleEngine.planApply(p.bundle, approve, p.backup_root) });
          }
          // U-DR05 — mark bundle discarded + compute archive_path; caller does the actual directory move.
          case "dream_discard": {
            const { DreamArtifactBundleEngine } = await import("../../engines/DreamArtifactBundleEngine.js");
            const p = params as { bundle: never; archive_root: string };
            return ok({ success: true, ...DreamArtifactBundleEngine.markDiscarded(p.bundle, p.archive_root) });
          }

          // DREAM-RECEIPT-MS0 / U-DR07 DreamMarkerScannerEngine — pure-core offline `DREAM:` marker
          // parser (text → markers). No I/O (caller reads files). `dream_markers_to_proposals` is the
          // adapter to the already-wired DreamArtifactBundleEngine receipt-bundle surface. Closes the
          // engine's wiring orphan (U-DREAM-SCANNER-WIRE) — built+tested but dispatcher-unwired.
          case "dream_scan": {
            const { DreamMarkerScannerEngine } = await import("../../engines/DreamMarkerScannerEngine.js");
            const p = params as { source: string };
            return ok({ success: true, result: DreamMarkerScannerEngine.scan(p.source) });
          }
          case "dream_markers_to_proposals": {
            const { DreamMarkerScannerEngine } = await import("../../engines/DreamMarkerScannerEngine.js");
            const p = params as { markers: never[]; opts: never };
            return ok({ success: true, proposals: DreamMarkerScannerEngine.markersToProposals(p.markers, p.opts) });
          }

          // HSE08 SoulConsensusEngine — cross-soul fleet doctrine + divergence detection.
          case "soul_consensus_analyze": {
            const { SoulConsensusEngine } = await import("../../engines/SoulConsensusEngine.js");
            const p = params as { souls: never[] };
            return ok({ success: true, result: SoulConsensusEngine.analyze(p.souls) });
          }
          case "soul_consensus_render": {
            const { SoulConsensusEngine } = await import("../../engines/SoulConsensusEngine.js");
            const p = params as { result: never };
            return ok({ success: true, markdown: SoulConsensusEngine.renderResult(p.result) });
          }

          // HZP05 SoulAwareFanoutExtenderEngine — bridges HSE02 router with HZP01 fanout planner.
          case "soul_aware_fanout_extend": {
            const { SoulAwareFanoutExtenderEngine } = await import("../../engines/SoulAwareFanoutExtenderEngine.js");
            const p = params as { request: never; souls: Record<string, never> };
            return ok({ success: true, result: SoulAwareFanoutExtenderEngine.extend(p.request, p.souls) });
          }
          case "soul_aware_fanout_render": {
            const { SoulAwareFanoutExtenderEngine } = await import("../../engines/SoulAwareFanoutExtenderEngine.js");
            const p = params as { result: never };
            return ok({ success: true, markdown: SoulAwareFanoutExtenderEngine.renderResult(p.result) });
          }

          // HZP06 ZuluTaskAuctionEngine — soul-weighted sealed-bid task auction.
          case "zulu_task_auction": {
            const { ZuluTaskAuctionEngine } = await import("../../engines/ZuluTaskAuctionEngine.js");
            const p = params as { request: never; souls: Record<string, never> };
            return ok({ success: true, result: ZuluTaskAuctionEngine.auction(p.request, p.souls) });
          }
          case "zulu_task_auction_render": {
            const { ZuluTaskAuctionEngine } = await import("../../engines/ZuluTaskAuctionEngine.js");
            const p = params as { result: never };
            return ok({ success: true, markdown: ZuluTaskAuctionEngine.renderResult(p.result) });
          }
          // C3<->HZP06 bridge: run the auction with LIVE queue_depth sourced from the
          // ZuluFleetHealthSynthesisEngine FleetHealthVector (the spec's live queue_penalty
          // source). Synthesizes the vector, overrides each bidder's queue_depth from live
          // health, and (by default) DROPS crashed/dead slots from the bidder set so a task
          // is never auctioned to a slot the fleet shows as down. drop_dead:false keeps them.
          case "zulu_auction_live": {
            const { ZuluFleetHealthSynthesisEngine } = await import("../../engines/ZuluFleetHealthSynthesisEngine.js");
            const { ZuluTaskAuctionEngine } = await import("../../engines/ZuluTaskAuctionEngine.js");
            const p = params as {
              fleet_request: never;
              auction: { task_id: string; task_text: string; task_domain?: string; bidders: Array<{ slot: string; queue_depth?: number; success_rate: number; success_sample_size: number }> };
              souls: Record<string, never>;
              drop_dead?: boolean;
            };
            const vector = ZuluFleetHealthSynthesisEngine.synthesize(p.fleet_request);
            const liveDepths = ZuluFleetHealthSynthesisEngine.auctionQueueDepths(vector);
            const dead = new Set(vector.fleet.deadSlots);
            const dropDead = p.drop_dead !== false; // default: drop crashed/dead slots
            const droppedDead = dropDead ? p.auction.bidders.filter((b) => dead.has(b.slot)).map((b) => b.slot) : [];
            const bidders = p.auction.bidders
              .filter((b) => !(dropDead && dead.has(b.slot)))
              .map((b) => ({ ...b, queue_depth: liveDepths[b.slot] ?? b.queue_depth ?? 0 }));
            if (bidders.length === 0) {
              return ok({
                success: true,
                vector,
                liveQueueDepths: liveDepths,
                droppedDead,
                result: { task_id: p.auction.task_id, winner_slot: null, winner_reason: "no live bidder (all dead/crashed, live-health filtered)", bids: [], unresolved_slots: [] },
              });
            }
            const request = { task_id: p.auction.task_id, task_text: p.auction.task_text, task_domain: p.auction.task_domain, bidders };
            const result = ZuluTaskAuctionEngine.auction(request as Parameters<typeof ZuluTaskAuctionEngine.auction>[0], p.souls);
            return ok({ success: true, vector, liveQueueDepths: liveDepths, droppedDead, result });
          }

          // HZD-02 ZuluFleetGovernorEngine — pure-core authority gate. READ-ONLY:
          // given an AuthorityCheckRequest {slot, task_text, operation} + the slot's
          // soul, returns the deterministic verdict the control server enforces.
          // Exposes the governance predicate for query/audit; grants NO control
          // capability (no assign/veto/state change). Closes the engine's wiring
          // orphan (U-ZULU-GOVERNOR-WIRE) — it was built+tested but dispatcher-unwired.
          case "zulu_authority_check": {
            const { ZuluFleetGovernorEngine } = await import("../../engines/ZuluFleetGovernorEngine.js");
            const p = params as { request: never; soul: never | null };
            return ok({ success: true, verdict: ZuluFleetGovernorEngine.checkAuthority(p.request, p.soul ?? null) });
          }
          case "zulu_authority_check_render": {
            const { ZuluFleetGovernorEngine } = await import("../../engines/ZuluFleetGovernorEngine.js");
            const p = params as { verdict: never };
            return ok({ success: true, markdown: ZuluFleetGovernorEngine.renderVerdict(p.verdict) });
          }

          // C4 ZuluDelegationContractEngine -- time/token/galaxy-bounded authority
          // delegations + a NARROWING pre-gate composed before the governor check.
          // grant/revoke are ORCHESTRATOR-ONLY (the engine enforces granted_by_role).
          case "delegation_grant": {
            const { zuluDelegationContractEngine: zd } = await import("../../engines/ZuluDelegationContractEngine.js");
            const p = params as { input: Parameters<typeof zd.grant>[0]; now?: string };
            return ok({ success: true, result: zd.grant(p.input, { now: typeof p.now === "string" ? p.now : undefined }) });
          }
          case "delegation_revoke": {
            const { zuluDelegationContractEngine: zd } = await import("../../engines/ZuluDelegationContractEngine.js");
            const p = params as { id?: unknown; byRole?: unknown; by_role?: unknown; bySlot?: unknown; now?: unknown };
            const byRole = typeof p.byRole === "string" ? p.byRole : (typeof p.by_role === "string" ? p.by_role : "");
            return ok({ success: true, result: zd.revoke(String(p.id ?? ""), byRole, {
              now: typeof p.now === "string" ? p.now : undefined,
              bySlot: typeof p.bySlot === "string" ? p.bySlot : undefined,
            }) });
          }
          case "delegation_status": {
            const { zuluDelegationContractEngine: zd } = await import("../../engines/ZuluDelegationContractEngine.js");
            const p = params as { grantee_slot?: unknown; granteeSlot?: unknown; now?: unknown };
            const grantee = typeof p.grantee_slot === "string" ? p.grantee_slot : (typeof p.granteeSlot === "string" ? p.granteeSlot : undefined);
            return ok({ success: true, ...zd.status({ grantee_slot: grantee }, typeof p.now === "string" ? p.now : undefined) });
          }
          case "delegation_check": {
            const { zuluDelegationContractEngine: zd } = await import("../../engines/ZuluDelegationContractEngine.js");
            const p = params as { request: Parameters<typeof zd.check>[0]; now?: unknown };
            return ok({ success: true, verdict: zd.check(p.request, typeof p.now === "string" ? p.now : undefined) });
          }
          // The composed NARROWING gate: delegation pre-gate -> governor. A denying
          // delegation (expired/revoked/over-cap) blocks immediately (governor not
          // consulted); otherwise the governor verdict is authoritative. Never widens.
          case "zulu_authority_check_gated": {
            const { zuluDelegationContractEngine: zd, ZuluDelegationContractEngine } = await import("../../engines/ZuluDelegationContractEngine.js");
            const { ZuluFleetGovernorEngine } = await import("../../engines/ZuluFleetGovernorEngine.js");
            const p = params as {
              request: { slot: string; task_text: string; operation: import("../../engines/ZuluDelegationContractEngine.js").DelegationOperation };
              soul?: unknown;
              galaxy?: unknown;
              tokens_pending?: unknown;
              now?: unknown;
            };
            const galaxy = typeof p.galaxy === "string" ? p.galaxy : "*";
            const delegation = zd.check(
              {
                grantee_slot: p.request.slot,
                operation: p.request.operation,
                galaxy,
                tokens_pending: typeof p.tokens_pending === "number" ? p.tokens_pending : undefined,
              },
              typeof p.now === "string" ? p.now : undefined,
            );
            // Only consult the governor when delegation did NOT deny (matches
            // composeGatedAuthority's contract + avoids a needless governor call).
            const governor = delegation.decision === "denied"
              ? null
              : ZuluFleetGovernorEngine.checkAuthority(p.request as Parameters<typeof ZuluFleetGovernorEngine.checkAuthority>[0], (p.soul ?? null) as Parameters<typeof ZuluFleetGovernorEngine.checkAuthority>[1]);
            return ok({ success: true, composed: ZuluDelegationContractEngine.composeGatedAuthority(delegation, governor) });
          }

          // C5 ZuluAdaptiveBackPressureEngine -- trend-aware fan-out throttle. Advisory:
          // emits a BackPressureSignal (never vetoes); reads C3-style queue-depth/error-rate
          // samples over a sliding window.
          case "backpressure_record_sample": {
            const { zuluAdaptiveBackPressureEngine: zb } = await import("../../engines/ZuluAdaptiveBackPressureEngine.js");
            const p = params as { slot?: unknown; queue_depth?: unknown; error_rate?: unknown; now?: unknown; maxSamplesPerSlot?: unknown; windowMs?: unknown };
            return ok({ success: true, result: zb.recordSample(
              String(p.slot ?? ""),
              { queue_depth: Number(p.queue_depth), error_rate: Number(p.error_rate) },
              {
                now: typeof p.now === "string" ? p.now : undefined,
                maxSamplesPerSlot: typeof p.maxSamplesPerSlot === "number" ? p.maxSamplesPerSlot : undefined,
                windowMs: typeof p.windowMs === "number" ? p.windowMs : undefined,
              },
            ) });
          }
          case "backpressure_assess": {
            const { zuluAdaptiveBackPressureEngine: zb } = await import("../../engines/ZuluAdaptiveBackPressureEngine.js");
            const p = params as { slot?: unknown } & Parameters<typeof zb.assess>[1];
            return ok({ success: true, signal: zb.assess(String(p.slot ?? ""), p) });
          }
          case "backpressure_status": {
            const { zuluAdaptiveBackPressureEngine: zb } = await import("../../engines/ZuluAdaptiveBackPressureEngine.js");
            const p = params as Parameters<typeof zb.status>[0];
            return ok({ success: true, ...zb.status(p) });
          }

          // C6 ZuluCapabilityRegistryEngine -- read-only runtime capability attestation.
          // Aggregates live chat-slots + active slot-task-claims into per-slot Capability
          // attestations (liveness, warmth, queue depth, domain affinity). Read-only: no
          // store mutation; degrades (never throws) when the source files are unreadable.
          case "capability_registry_snapshot": {
            const { zuluCapabilityRegistryEngine: zc } = await import("../../engines/ZuluCapabilityRegistryEngine.js");
            const p = params as { now?: unknown; activeModelsBySlot?: unknown };
            return ok({ success: true, ...zc.snapshot({
              now: typeof p.now === "string" ? p.now : undefined,
              activeModelsBySlot: (p.activeModelsBySlot && typeof p.activeModelsBySlot === "object")
                ? p.activeModelsBySlot as Record<string, string[]> : undefined,
            }) });
          }
          case "capability_attest": {
            const { zuluCapabilityRegistryEngine: zc } = await import("../../engines/ZuluCapabilityRegistryEngine.js");
            const p = params as { slot?: unknown; now?: unknown; activeModels?: unknown };
            return ok({ success: true, attestation: zc.attest(String(p.slot ?? ""), {
              now: typeof p.now === "string" ? p.now : undefined,
              activeModels: Array.isArray(p.activeModels) ? p.activeModels as string[] : undefined,
            }) });
          }

          // C7 ZuluCapabilityAttestationEngine -- outcome-correlated trust. Correlates a
          // slot's SOUL-declared domain affinity against actual task-outcome history; emits
          // an AttestationScore (Wilson-interval credibility) + an ADVISORY multiplicative
          // bid_modifier (>0, never a veto) the auction applies to domain_match.
          case "attestation_record_outcome": {
            const { zuluCapabilityAttestationEngine: za } = await import("../../engines/ZuluCapabilityAttestationEngine.js");
            const p = params as { slot?: unknown; domain?: unknown; success?: unknown; now?: unknown; unit?: unknown; maxOutcomesPerPair?: unknown };
            return ok({ success: true, result: za.recordOutcome(
              String(p.slot ?? ""), String(p.domain ?? ""), p.success === true,
              {
                now: typeof p.now === "string" ? p.now : undefined,
                unit: typeof p.unit === "string" ? p.unit : undefined,
                maxOutcomesPerPair: typeof p.maxOutcomesPerPair === "number" ? p.maxOutcomesPerPair : undefined,
              },
            ) });
          }
          case "attestation_score": {
            const { zuluCapabilityAttestationEngine: za } = await import("../../engines/ZuluCapabilityAttestationEngine.js");
            const p = params as { slot?: unknown; domain?: unknown } & Parameters<typeof za.attest>[2];
            return ok({ success: true, score: za.attest(String(p.slot ?? ""), String(p.domain ?? ""), p) });
          }
          case "attestation_score_all": {
            const { zuluCapabilityAttestationEngine: za } = await import("../../engines/ZuluCapabilityAttestationEngine.js");
            const p = params as Parameters<typeof za.attestAll>[0];
            return ok({ success: true, ...za.attestAll(p) });
          }
          case "attestation_bid_modifier": {
            const { zuluCapabilityAttestationEngine: za } = await import("../../engines/ZuluCapabilityAttestationEngine.js");
            const p = params as { slot?: unknown; domain?: unknown } & Parameters<typeof za.bidModifierFor>[2];
            return ok({ success: true, bid_modifier: za.bidModifierFor(String(p.slot ?? ""), String(p.domain ?? ""), p) });
          }

          // C8 ZuluSoulEvolutionAdvisorEngine -- advisory-only soul-amendment proposals.
          // This is the C7->C8 composition root: propose reads C7 AttestationScores live and
          // hands them to C8 (which never imports C7 itself, staying ESM-pure). ADVISORY-ONLY:
          // every proposal is operator_approval_required + auto_apply:false; NO apply path
          // exists; refuse_list / safety domains can never be proposed.
          case "soul_evolution_propose": {
            const { zuluCapabilityAttestationEngine: za } = await import("../../engines/ZuluCapabilityAttestationEngine.js");
            const { ZuluSoulEvolutionAdvisorEngine: ZSE } = await import("../../engines/ZuluSoulEvolutionAdvisorEngine.js");
            const p = params as { slot?: unknown; soul?: unknown; declaredDomains?: unknown; now?: unknown; minProposalN?: unknown; addCiLowerThreshold?: unknown };
            const slot = String(p.slot ?? "");
            const declaredDomains = Array.isArray(p.declaredDomains) ? p.declaredDomains as string[] : undefined;
            const now = typeof p.now === "string" ? p.now : undefined;
            const all = za.attestAll({ now, declaredDomains });
            const scores = all.scores.filter((s) => s.slot === slot);
            const soul = (p.soul && typeof p.soul === "object") ? p.soul as Parameters<typeof ZSE.proposeAmendments>[2] : null;
            const result = ZSE.proposeAmendments(slot, scores, soul ?? null, {
              now,
              minProposalN: typeof p.minProposalN === "number" ? p.minProposalN : undefined,
              addCiLowerThreshold: typeof p.addCiLowerThreshold === "number" ? p.addCiLowerThreshold : undefined,
            });
            return ok({ success: true, ...result, chat_message: ZSE.renderForChat(result.proposals) });
          }
          case "soul_evolution_emit": {
            const { zuluSoulEvolutionAdvisorEngine: zs } = await import("../../engines/ZuluSoulEvolutionAdvisorEngine.js");
            const p = params as { proposals?: unknown; now?: unknown };
            const proposals = Array.isArray(p.proposals) ? p.proposals as Parameters<typeof zs.emit>[0] : [];
            return ok({ success: true, result: zs.emit(proposals, { now: typeof p.now === "string" ? p.now : undefined }) });
          }
          case "soul_evolution_proposals_list": {
            const { zuluSoulEvolutionAdvisorEngine: zs } = await import("../../engines/ZuluSoulEvolutionAdvisorEngine.js");
            const p = params as { slot?: unknown };
            return ok({ success: true, ...zs.listProposals({ slot: typeof p.slot === "string" ? p.slot : undefined }) });
          }

          // HZD-06 ModelAttributionEngine — fleet model-provenance ledger. Records which
          // model/provenance produced each response (+ token/latency), aggregates usage, and
          // builds the "[model · Nms]" badge the /aware skill surfaces. Pure in-memory singleton
          // (no I/O — a higher-level sink persists). Closes the engine's wiring orphan
          // (U-MODEL-ATTRIBUTION-WIRE) — built + unit-tested but dispatcher-unwired (only
          // consumer was its own test). slot:bravo hermes-zulu mandate (model orchestration).
          case "model_attribution_record": {
            const { modelAttributionEngine } = await import("../../engines/ModelAttributionEngine.js");
            const p = params as { entry: Parameters<typeof modelAttributionEngine.record>[0] };
            return ok({ success: true, record: modelAttributionEngine.record(p.entry) });
          }
          case "model_attribution_summary": {
            const { modelAttributionEngine } = await import("../../engines/ModelAttributionEngine.js");
            return ok({ success: true, summary: modelAttributionEngine.summary() });
          }
          case "model_attribution_recent": {
            const { modelAttributionEngine } = await import("../../engines/ModelAttributionEngine.js");
            const p = params as { limit?: number };
            return ok({ success: true, records: modelAttributionEngine.recent(p.limit) });
          }
          case "model_attribution_find": {
            const { modelAttributionEngine } = await import("../../engines/ModelAttributionEngine.js");
            const p = params as { responseId: string };
            return ok({ success: true, record: modelAttributionEngine.findByResponseId(p.responseId) });
          }
          case "model_attribution_badge": {
            const { modelAttributionEngine } = await import("../../engines/ModelAttributionEngine.js");
            const p = params as { model: string; provenance: Parameters<typeof modelAttributionEngine.buildBadge>[1]; latencyMs: number };
            return ok({ success: true, badge: modelAttributionEngine.buildBadge(p.model, p.provenance, p.latencyMs) });
          }

          // HZD-07 OpusCapabilityEngine — model-tier complexity router. `opus_assess_complexity`
          // exposes the PURE, deterministic tier-recommendation (haiku/sonnet/opus) for an
          // OpusRequest (no I/O — heuristic factor scoring). `opus_stats` reads usage counters.
          // The LLM-backed `execute()` entry is intentionally NOT wired here — it needs a live
          // Anthropic client + a separate integration-test harness (follow-up
          // U-OPUS-EXECUTE-WIRE). This closes the engine's wiring orphan (U-OPUS-CAPABILITY-WIRE)
          // — built but dispatcher-unwired. slot:bravo hermes-zulu mandate (model orchestration).
          case "opus_assess_complexity": {
            const { opusCapabilityEngine } = await import("../../engines/OpusCapabilityEngine.js");
            const p = params as { request: Parameters<typeof opusCapabilityEngine.getComplexityAssessment>[0] };
            return ok({ success: true, assessment: opusCapabilityEngine.getComplexityAssessment(p.request) });
          }
          case "opus_stats": {
            const { opusCapabilityEngine } = await import("../../engines/OpusCapabilityEngine.js");
            return ok({ success: true, stats: opusCapabilityEngine.getStats() });
          }

          // HZP07 HermesSelfCorrectionEngine — failure → corrected approach.
          case "hermes_self_correct": {
            const { HermesSelfCorrectionEngine } = await import("../../engines/HermesSelfCorrectionEngine.js");
            const p = params as { request: never; soul: never | null };
            return ok({ success: true, proposal: HermesSelfCorrectionEngine.propose(p.request, p.soul) });
          }
          case "hermes_self_correct_render": {
            const { HermesSelfCorrectionEngine } = await import("../../engines/HermesSelfCorrectionEngine.js");
            const p = params as { proposal: never };
            return ok({ success: true, markdown: HermesSelfCorrectionEngine.renderProposal(p.proposal) });
          }

          // HZP08 DoctrineDraftEngine — HSE08 consensus → CLAUDE.md doctrine draft.
          case "doctrine_draft": {
            const { DoctrineDraftEngine } = await import("../../engines/DoctrineDraftEngine.js");
            const p = params as { request: never };
            return ok({ success: true, draft: DoctrineDraftEngine.draft(p.request) });
          }
          case "doctrine_draft_render": {
            const { DoctrineDraftEngine } = await import("../../engines/DoctrineDraftEngine.js");
            const p = params as { draft: never };
            return ok({ success: true, markdown: DoctrineDraftEngine.renderSummary(p.draft) });
          }

          // HZD-05 ZuluDashboardControlEngine — MCP wrapper around hzp-dash-control HTTP server (:8767, HZP-DASH-MS0).
          // Server must be running for these to succeed: `node H:/prism/scripts/hzp-dash-control-server.mjs`.
          case "zulu_dash_assign": {
            const { ZuluDashboardControlEngine } = await import("../../engines/ZuluDashboardControlEngine.js");
            const p = params as Parameters<typeof ZuluDashboardControlEngine.assign>[0];
            return ok({ success: true, result: await ZuluDashboardControlEngine.assign(p) });
          }
          case "zulu_dash_veto": {
            const { ZuluDashboardControlEngine } = await import("../../engines/ZuluDashboardControlEngine.js");
            const p = params as Parameters<typeof ZuluDashboardControlEngine.veto>[0];
            return ok({ success: true, result: await ZuluDashboardControlEngine.veto(p) });
          }
          case "zulu_dash_promote_refuse": {
            const { ZuluDashboardControlEngine } = await import("../../engines/ZuluDashboardControlEngine.js");
            const p = params as Parameters<typeof ZuluDashboardControlEngine.promoteRefuse>[0];
            return ok({ success: true, result: await ZuluDashboardControlEngine.promoteRefuse(p) });
          }
          case "zulu_dash_adopt_doctrine": {
            const { ZuluDashboardControlEngine } = await import("../../engines/ZuluDashboardControlEngine.js");
            const p = params as Parameters<typeof ZuluDashboardControlEngine.adoptDoctrine>[0];
            return ok({ success: true, result: await ZuluDashboardControlEngine.adoptDoctrine(p) });
          }
          case "zulu_dash_escalate": {
            const { ZuluDashboardControlEngine } = await import("../../engines/ZuluDashboardControlEngine.js");
            const p = params as Parameters<typeof ZuluDashboardControlEngine.escalate>[0];
            return ok({ success: true, result: await ZuluDashboardControlEngine.escalate(p) });
          }
          case "zulu_dash_bus_send": {
            const { ZuluDashboardControlEngine } = await import("../../engines/ZuluDashboardControlEngine.js");
            const p = params as Parameters<typeof ZuluDashboardControlEngine.busSend>[0];
            return ok({ success: true, result: await ZuluDashboardControlEngine.busSend(p) });
          }
          case "zulu_dash_state": {
            const { ZuluDashboardControlEngine } = await import("../../engines/ZuluDashboardControlEngine.js");
            return ok({ success: true, result: await ZuluDashboardControlEngine.state() });
          }
          case "zulu_dash_audit_tail": {
            const { ZuluDashboardControlEngine } = await import("../../engines/ZuluDashboardControlEngine.js");
            return ok({ success: true, result: await ZuluDashboardControlEngine.auditTail() });
          }

          // ZULU-OBSIDIAN-LIVE-MS0 — ObsidianRestBridgeEngine: live Obsidian vault over
          // the Local REST API (:27123). Fail-soft: every action returns
          // { ok:false, reason } when the vault is down / no key / non-loopback URL —
          // never throws, never hangs. READ-ONLY v1 (no obsidian_write action).
          case "obsidian_status": {
            const { ObsidianRestBridgeEngine } = await import("../../engines/ObsidianRestBridgeEngine.js");
            return ok({ success: true, result: await ObsidianRestBridgeEngine.status() });
          }
          case "obsidian_read": {
            const { ObsidianRestBridgeEngine } = await import("../../engines/ObsidianRestBridgeEngine.js");
            const p = params as { path?: string };
            return ok({ success: true, result: await ObsidianRestBridgeEngine.read(String(p.path ?? "")) });
          }
          case "obsidian_search": {
            const { ObsidianRestBridgeEngine } = await import("../../engines/ObsidianRestBridgeEngine.js");
            const p = params as { query?: string };
            return ok({ success: true, result: await ObsidianRestBridgeEngine.search(String(p.query ?? "")) });
          }

          // ==================================================================
          // U-BRIDGE-WIRE-AGENT (oscar 2026-05-23) — wire 2 unwired Agent engines
          // ==================================================================
          // AgentAutoUpdateEngine — agent-knowledge sync surface
          case "agent_knowledge_scan": {
            const { agentAutoUpdate } = await import("../../engines/AgentAutoUpdateEngine.js");
            const result = await agentAutoUpdate.scanForNewAssets();
            return ok({ success: true, ...result });
          }
          case "agent_knowledge_snapshot": {
            const { agentAutoUpdate } = await import("../../engines/AgentAutoUpdateEngine.js");
            const result = await agentAutoUpdate.getKnowledgeSnapshot();
            return ok({ success: true, ...result });
          }
          case "agent_knowledge_recent": {
            const { agentAutoUpdate } = await import("../../engines/AgentAutoUpdateEngine.js");
            const count = typeof params.count === "number" ? params.count : 10;
            const updates = agentAutoUpdate.getRecentUpdates(count);
            return ok({ success: true, updates, count: updates.length });
          }
          case "agent_knowledge_context_string": {
            const { agentAutoUpdate } = await import("../../engines/AgentAutoUpdateEngine.js");
            const context = await agentAutoUpdate.getAgentContextString();
            return ok({ success: true, context });
          }
          case "agent_knowledge_rescan": {
            const { agentAutoUpdate } = await import("../../engines/AgentAutoUpdateEngine.js");
            const result = await agentAutoUpdate.rescan();
            return ok({ success: true, ...result });
          }

          // AgentWorkflowEngine — autonomous workflow lifecycle surface
          case "agent_workflow_list": {
            const { agentWorkflowEngine } = await import("../../engines/AgentWorkflowEngine.js");
            const workflows = agentWorkflowEngine.getWorkflows();
            return ok({
              success: true,
              count: workflows.length,
              workflows: workflows.map((w) => ({
                workflow_id: w.workflow_id,
                name: w.name,
                type: w.type,
                description: w.description,
                step_count: w.steps.length,
              })),
            });
          }
          case "agent_workflow_start": {
            const { agentWorkflowEngine } = await import("../../engines/AgentWorkflowEngine.js");
            const workflowId = String(params.workflow_id ?? params.workflowId ?? "");
            if (!workflowId) {
              return ok({ success: false, error: "workflow_id required" });
            }
            const context = (params.context && typeof params.context === "object")
              ? params.context as Record<string, unknown>
              : {};
            const options = (params.options && typeof params.options === "object")
              ? params.options as Record<string, unknown>
              : {};
            try {
              const instance = await agentWorkflowEngine.startWorkflow(workflowId, context, options);
              return ok({
                success: true,
                instance_id: instance.instance_id,
                workflow_id: instance.workflow_id,
                status: instance.status,
                started_at: instance.started_at,
              });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }
          case "agent_workflow_status": {
            const { agentWorkflowEngine } = await import("../../engines/AgentWorkflowEngine.js");
            const instanceId = String(params.instance_id ?? params.instanceId ?? "");
            if (instanceId) {
              const instance = agentWorkflowEngine.getInstance(instanceId);
              if (!instance) {
                return ok({ success: false, error: `Instance not found: ${instanceId}` });
              }
              return ok({
                success: true,
                instance_id: instance.instance_id,
                workflow_id: instance.workflow_id,
                status: instance.status,
                started_at: instance.started_at,
                metrics: instance.metrics,
              });
            }
            const running = agentWorkflowEngine.getRunningInstances();
            const completed = agentWorkflowEngine.getCompletedInstances();
            return ok({
              success: true,
              running_count: running.length,
              completed_count: completed.length,
              running: running.map((i) => ({
                instance_id: i.instance_id,
                workflow_id: i.workflow_id,
                status: i.status,
              })),
            });
          }
          case "agent_workflow_cancel": {
            const { agentWorkflowEngine } = await import("../../engines/AgentWorkflowEngine.js");
            const instanceId = String(params.instance_id ?? params.instanceId ?? "");
            if (!instanceId) {
              return ok({ success: false, error: "instance_id required" });
            }
            const cancelled = agentWorkflowEngine.cancelInstance(instanceId);
            return ok({ success: cancelled, instance_id: instanceId });
          }

          // ==================================================================
          // U-BRIDGE-WIRE-CROSS (oscar 2026-05-23) — wire 2 unwired Cross engines
          // ==================================================================
          case "cross_cam_ledger_record": {
            const { crossCAMComparisonLedgerEngine } = await import("../../engines/CrossCAMComparisonLedgerEngine.js");
            const acc = crossCAMComparisonLedgerEngine.record({
              camSystem: params.cam_system as string ?? params.camSystem as string,
              featureClass: String(params.feature_class ?? params.featureClass ?? ""),
              materialClass: String(params.material_class ?? params.materialClass ?? ""),
              machineClass: String(params.machine_class ?? params.machineClass ?? ""),
              success: ((params.success === 1 || params.success === true) ? 1 : 0) as 0 | 1,
              observedAt: String(params.observed_at ?? params.observedAt ?? new Date().toISOString()),
            } as Parameters<typeof crossCAMComparisonLedgerEngine.record>[0]);
            return ok({ success: true, accumulator: acc });
          }
          case "cross_cam_ledger_leaderboard": {
            const { crossCAMComparisonLedgerEngine } = await import("../../engines/CrossCAMComparisonLedgerEngine.js");
            const board = crossCAMComparisonLedgerEngine.leaderboard({
              featureClass: String(params.feature_class ?? params.featureClass ?? ""),
              materialClass: String(params.material_class ?? params.materialClass ?? ""),
              machineClass: String(params.machine_class ?? params.machineClass ?? ""),
            });
            return ok({ success: true, ...board });
          }
          case "cross_cam_ledger_by_cam": {
            const { crossCAMComparisonLedgerEngine } = await import("../../engines/CrossCAMComparisonLedgerEngine.js");
            const cam = String(params.cam_system ?? params.camSystem ?? "");
            if (!cam) return ok({ success: false, error: "cam_system required" });
            const entries = crossCAMComparisonLedgerEngine.byCAM(
              cam as Parameters<typeof crossCAMComparisonLedgerEngine.byCAM>[0],
            );
            return ok({ success: true, cam_system: cam, count: entries.length, entries });
          }
          case "cross_cam_ledger_stats": {
            const { crossCAMComparisonLedgerEngine } = await import("../../engines/CrossCAMComparisonLedgerEngine.js");
            return ok({
              success: true,
              total_cells: crossCAMComparisonLedgerEngine.totalCells(),
              total_observations: crossCAMComparisonLedgerEngine.totalObservations(),
            });
          }
          case "cross_cam_ledger_reset": {
            const { crossCAMComparisonLedgerEngine } = await import("../../engines/CrossCAMComparisonLedgerEngine.js");
            crossCAMComparisonLedgerEngine.reset();
            return ok({ success: true });
          }
          case "cross_tool_coupling_analyze": {
            const { crossToolCouplingEngine } = await import("../../engines/CrossToolCouplingEngine.js");
            const input = params.input ?? params;
            try {
              const result = crossToolCouplingEngine.analyze(
                input as Parameters<typeof crossToolCouplingEngine.analyze>[0],
              );
              return ok({ success: true, ...result });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }

          // ==================================================================
          // U-BRIDGE-WIRE-LIVE (oscar 2026-05-23 iter3) — 3 unwired Live engines
          // ==================================================================
          case "live_tooling_analyze_driven": {
            const { liveToolingIntelligenceEngine } = await import("../../engines/LiveToolingIntelligenceEngine.js");
            const operation = params.operation;
            const config = params.config;
            if (!operation || !config) {
              return ok({ success: false, error: "operation and config required" });
            }
            try {
              const result = liveToolingIntelligenceEngine.analyzeDrivenToolCapability(
                operation as Parameters<typeof liveToolingIntelligenceEngine.analyzeDrivenToolCapability>[0],
                config as Parameters<typeof liveToolingIntelligenceEngine.analyzeDrivenToolCapability>[1],
              );
              // spread result first so the explicit success:true is authoritative
              // (reaching here means the call succeeded) and not shadowed by result.success
              return ok({ ...result, success: true });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }
          case "live_tooling_controller_capabilities": {
            const { liveToolingSyntaxEngine } = await import("../../engines/LiveToolingSyntaxEngine.js");
            const controller = String(params.controller ?? "");
            if (!controller) return ok({ success: false, error: "controller required" });
            try {
              const caps = liveToolingSyntaxEngine.getControllerCapabilities(
                controller as Parameters<typeof liveToolingSyntaxEngine.getControllerCapabilities>[0],
              );
              if (!caps) {
                return ok({ success: false, error: `Unknown controller: ${controller}` });
              }
              return ok({ success: true, controller, capabilities: caps });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }
          case "live_turret_validate_kinematics": {
            const { liveTurretCAxisEngine } = await import("../../engines/LiveTurretCAxisEngine.js");
            const kinematics = params.kinematics ?? params;
            try {
              const result = liveTurretCAxisEngine.validateKinematics(
                kinematics as Parameters<typeof liveTurretCAxisEngine.validateKinematics>[0],
              );
              return ok({ success: true, ...result });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }

          // ==================================================================
          // U-BRIDGE-WIRE-INVENTOR (oscar 2026-05-23 iter4) — 3 unwired Inventor engines
          // ==================================================================
          case "inventor_cad_list_modules": {
            const { InventorCADFunctionIndexEngine } = await import("../../engines/InventorCADFunctionIndexEngine.js");
            try {
              const modules = InventorCADFunctionIndexEngine.listModules();
              return ok({ success: true, count: modules.length, modules });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }
          case "inventor_cad_get_module_entry": {
            const { InventorCADFunctionIndexEngine } = await import("../../engines/InventorCADFunctionIndexEngine.js");
            const moduleId = String(params.module_id ?? params.moduleId ?? "");
            if (!moduleId) return ok({ success: false, error: "module_id required" });
            try {
              const entry = InventorCADFunctionIndexEngine.getModuleEntry(moduleId);
              if (!entry) return ok({ success: false, error: `Module not registered: ${moduleId}` });
              return ok({ success: true, module_id: moduleId, entry });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }
          case "inventor_cam_list_strategies": {
            const { inventorCAMStrategyEngine } = await import("../../engines/InventorCAMStrategyEngine.js");
            const category = params.category as Parameters<typeof inventorCAMStrategyEngine.listStrategies>[0] | undefined;
            try {
              const strategies = inventorCAMStrategyEngine.listStrategies(category);
              return ok({ success: true, count: strategies.length, strategies });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }
          case "inventor_cam_get_strategy_params": {
            const { inventorCAMStrategyEngine } = await import("../../engines/InventorCAMStrategyEngine.js");
            const strategyName = String(params.strategy_name ?? params.strategyName ?? "");
            if (!strategyName) return ok({ success: false, error: "strategy_name required" });
            try {
              const strategy = inventorCAMStrategyEngine.getParameters(strategyName);
              if (!strategy) return ok({ success: false, error: `Strategy not found: ${strategyName}` });
              return ok({ success: true, strategy_name: strategyName, strategy });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }
          case "inventor_cam_get_templates": {
            const { inventorCAMCodeGeneratorEngine } = await import("../../engines/InventorCAMCodeGeneratorEngine.js");
            const category = params.category as Parameters<typeof inventorCAMCodeGeneratorEngine.getTemplates>[0] | undefined;
            try {
              const templates = inventorCAMCodeGeneratorEngine.getTemplates(category);
              return ok({ success: true, count: templates.length, templates });
            } catch (err: any) {
              return ok({ success: false, error: err?.message ?? String(err) });
            }
          }

          // ==================================================================
          // U-BRIDGE-WIRE-PRINT-PARTIAL (oscar 2026-05-23 iter5) — 2 of 4 Print engines
          // ==================================================================
          case "print_corpus_all_shas": {
            const { defaultPrintCorpusTableWriter } = await import("../../engines/PrintCorpusTableWriter.js");
            const shas = defaultPrintCorpusTableWriter.allShas();
            return ok({ success: true, count: shas.length, shas });
          }
          case "print_corpus_total_count": {
            const { defaultPrintCorpusTableWriter } = await import("../../engines/PrintCorpusTableWriter.js");
            return ok({ success: true, total_rows: defaultPrintCorpusTableWriter.totalRowCount() });
          }
          case "print_stall_stats": {
            const { printMatchStallDetectorEngine } = await import("../../engines/PrintMatchStallDetectorEngine.js");
            const now = typeof params.now_ms === "number" ? params.now_ms : undefined;
            const stats = now !== undefined
              ? printMatchStallDetectorEngine.statsAt(now)
              : printMatchStallDetectorEngine.stats();
            return ok({ success: true, ...stats });
          }

          // ── DEA-MS0/U-DEA-november-01 — ContextualBoundaryEngine ──
          case "context_bound_compute": {
            const { contextualBoundaryEngine } = await import("../../engines/ContextualBoundaryEngine.js");
            const bound = contextualBoundaryEngine.calculateBoundary(params.parameter, params.context ?? {});
            return ok({ success: true, bound });
          }
          case "context_bound_all": {
            const { contextualBoundaryEngine } = await import("../../engines/ContextualBoundaryEngine.js");
            const all = contextualBoundaryEngine.calculateAllBoundaries(params.context ?? {});
            return ok({ success: true, bounds: Object.fromEntries(all) });
          }
          case "context_bound_check": {
            const { contextualBoundaryEngine } = await import("../../engines/ContextualBoundaryEngine.js");
            const verdict = contextualBoundaryEngine.checkValue(params.parameter, params.value, params.context ?? {});
            return ok({ success: true, verdict });
          }

          // ── U-WIRE-OPERATOR-PREFS (slot:romeo): OperatorPreferencesEngine → prism_session ──
          // Per-operator preference store + override applier. Verified GENUINE_ORPHAN (self-contained
          // zero-arg singleton) via scripts/classify-engine-reachability.mjs (U-CLASSIFIER-AWARE-HUNT).
          // camelCase params match the engine's native OperatorPreferences type (no normalization).
          case "operator_prefs_set": {
            const { operatorPreferencesEngine } = await import("../../engines/OperatorPreferencesEngine.js");
            const saved = operatorPreferencesEngine.upsertPreferences(
              params.preferences as Parameters<typeof operatorPreferencesEngine.upsertPreferences>[0],
            );
            return ok({ success: true, preferences: saved });
          }
          case "operator_prefs_get": {
            const { operatorPreferencesEngine } = await import("../../engines/OperatorPreferencesEngine.js");
            const tenantId = String(params.tenantId ?? "");
            const operatorId = String(params.operatorId ?? "");
            const existing = operatorPreferencesEngine.getPreferences(tenantId, operatorId);
            const withDefaults = params.withDefaults === true;
            const preferences = existing ?? (withDefaults ? operatorPreferencesEngine.getDefaultPreferences(tenantId, operatorId) : null);
            return ok({ success: true, found: existing !== null, usedDefaults: existing === null && withDefaults, preferences });
          }
          case "operator_prefs_apply": {
            const { operatorPreferencesEngine } = await import("../../engines/OperatorPreferencesEngine.js");
            const tenantId = String(params.tenantId ?? "");
            const operatorId = String(params.operatorId ?? "");
            const base = (params.baseParams ?? {}) as Record<string, unknown>;
            const result = operatorPreferencesEngine.applyOverrides(tenantId, operatorId, base);
            return ok({ success: true, ...result });
          }
          // U-FE-OPERATOR-FEEDBACK (slot:bravo): record SPA OperatorFeedbackPanel feedback for RLHF.
          // The feedback object is UNTRUSTED SPA input -> whitelist the known OperatorFeedback fields
          // (never spread raw input) + validate operatorId/tenantId/feedbackType before persisting.
          case "operator_feedback_record": {
            const { operatorPreferencesEngine } = await import("../../engines/OperatorPreferencesEngine.js");
            const fb = (params.feedback ?? {}) as Record<string, any>;
            const VALID_TYPES = ["thumbs_up", "thumbs_down", "correction", "note"];
            if (!fb.operatorId || !fb.tenantId || !VALID_TYPES.includes(fb.feedbackType)) {
              return ok({ success: false, error: "operator_feedback_record requires operatorId, tenantId, and feedbackType in {thumbs_up,thumbs_down,correction,note}" });
            }
            const ctx = (fb.context ?? {}) as Record<string, any>;
            const record = operatorPreferencesEngine.recordFeedback({
              operatorId: String(fb.operatorId),
              tenantId: String(fb.tenantId),
              timestamp: typeof fb.timestamp === "string" ? fb.timestamp : new Date().toISOString(),
              feedbackType: fb.feedbackType,
              // Whitelist the 4 known context scalar keys -- never store a raw SPA-supplied object
              // (would let forged/proto keys reach the RLHF/LoRA feed).
              context: {
                machineId: typeof ctx.machineId === "string" ? ctx.machineId : undefined,
                materialId: typeof ctx.materialId === "string" ? ctx.materialId : undefined,
                operationType: typeof ctx.operationType === "string" ? ctx.operationType : undefined,
                programId: typeof ctx.programId === "string" ? ctx.programId : undefined,
              },
              originalRecommendation: fb.originalRecommendation && typeof fb.originalRecommendation === "object" ? fb.originalRecommendation : undefined,
              operatorCorrection: fb.operatorCorrection && typeof fb.operatorCorrection === "object" ? fb.operatorCorrection : undefined,
              reason: typeof fb.reason === "string" ? fb.reason : undefined,
              tags: Array.isArray(fb.tags) ? fb.tags.map(String) : [],
              // Default to NOT-eligible when absent: rlhfEligible gates inclusion in LoRA training
              // data, so an omitted field must opt OUT, not silently opt in.
              rlhfEligible: fb.rlhfEligible === true,
            } as Parameters<typeof operatorPreferencesEngine.recordFeedback>[0]);
            return ok({ success: true, feedback: record });
          }

          // ── DEA-MS0/U-DEA-november-P06 — PrintAccuracyProofEngine ──
          case "print_accuracy_audit": {
            const { defaultPrintCorpusTableWriter } = await import("../../engines/PrintCorpusTableWriter.js");
            const { PrintAccuracyProofEngine } = await import("../../engines/PrintAccuracyProofEngine.js");
            const engine = new PrintAccuracyProofEngine(defaultPrintCorpusTableWriter);
            const report = engine.buildReport({});
            return ok({ success: true, report });
          }
          case "print_accuracy_classify_row": {
            const { classifyRow } = await import("../../engines/PrintAccuracyProofEngine.js");
            const verdict = classifyRow(params.row);
            return ok({ success: true, verdict });
          }

          // U-WIRE-SLOTSESSION / WIRE-UNWIRED-PAPA: SlotSessionHistoryEngine read surfaces (slot:papa->golf 2026-06-15).
          case "slot_session_fleet_state": {
            const { slotSessionHistoryEngine } = await import("../../engines/SlotSessionHistoryEngine.js");
            return ok({ success: true, slots: slotSessionHistoryEngine().getAllSlotsState() });
          }
          case "slot_session_latest": {
            const { slotSessionHistoryEngine } = await import("../../engines/SlotSessionHistoryEngine.js");
            const eng = slotSessionHistoryEngine();
            const slot = params.slot as Parameters<typeof eng.getLatestForSlot>[0];
            return ok({ success: true, slot, entry: eng.getLatestForSlot(slot) });
          }
          case "slot_session_history": {
            const { slotSessionHistoryEngine } = await import("../../engines/SlotSessionHistoryEngine.js");
            const eng = slotSessionHistoryEngine();
            const slot = params.slot as Parameters<typeof eng.getHistoryForSlot>[0];
            const entries = eng.getHistoryForSlot(slot, params.limit as number | undefined);
            return ok({ success: true, slot, count: entries.length, entries });
          }
          // BLACKWELL-DB-GEN-MS0/U-WIRE-SLOT-SESSION-HISTORY (slot:india 2026-06-22):
          // SlotSessionHistoryEngine.readAll() read surface honoring a custom baseDir (the singleton
          // surfaces above are DEFAULT_BASE_DIR-locked). baseDir is path-guard-confined to the
          // slot-sessions root (dirname(DEFAULT_BASE_DIR) = state/shared) so a caller cannot traverse
          // out to arbitrary disk. readAll keeps only entries with a valid eventType + slot + sessionId.
          case "slot_session_history_read": {
            const mod = await import("../../engines/SlotSessionHistoryEngine.js");
            const nodePath = await import("node:path");
            let baseDir = mod.DEFAULT_BASE_DIR;
            if (typeof params.baseDir === "string" && params.baseDir.length > 0) {
              const confineRoot = nodePath.resolve(nodePath.dirname(mod.DEFAULT_BASE_DIR));
              const resolved = nodePath.resolve(params.baseDir);
              const rel = nodePath.relative(confineRoot, resolved);
              if (rel === ".." || rel.startsWith(".." + nodePath.sep) || nodePath.isAbsolute(rel)) {
                return ok({ success: false, error: `baseDir escapes the slot-sessions root: ${params.baseDir}` });
              }
              baseDir = resolved;
            }
            const eng = new mod.SlotSessionHistoryEngine({ baseDir });
            const slot = params.slot as Parameters<typeof eng.readAll>[0];
            const entries = eng.readAll(slot);
            return ok({ success: true, slot, count: entries.length, entries });
          }
          // ── U-INDIA-WIRE-4-UNWIRED: PreMOUKickoffChecklistEngine ──
          case "kickoff_checklist": {
            const { preMOUKickoffChecklistEngine } = await import("../../engines/PreMOUKickoffChecklistEngine.js");
            const op = params.op as string;
            let kcResult: unknown;
            switch (op) {
              case "register":
                kcResult = preMOUKickoffChecklistEngine.register({
                  kickoff_id: params.kickoff_id as string,
                  blocker_id: params.blocker_id as string,
                  customer: params.customer as string,
                  opened_at: params.opened_at as number,
                });
                break;
              case "verify":
                kcResult = preMOUKickoffChecklistEngine.verify({
                  kickoff_id: params.kickoff_id as string,
                  item_id: params.item_id as string,
                  filled_at: params.filled_at as number,
                  evidence_uri: params.evidence_uri as string | undefined,
                  signed_off_by: params.signed_off_by as string,
                  notes: params.notes as string | undefined,
                });
                break;
              case "waive":
                kcResult = preMOUKickoffChecklistEngine.waive({
                  kickoff_id: params.kickoff_id as string,
                  item_id: params.item_id as string,
                  waived_at: params.waived_at as number,
                  waived_by: params.waived_by as string,
                  reason: params.reason as string,
                  expires_at: params.expires_at as number | undefined,
                });
                break;
              case "can_kickoff":
                kcResult = preMOUKickoffChecklistEngine.canKickoff(
                  params.kickoff_id as string,
                  params.now as number | undefined,
                );
                break;
              case "get":
                kcResult = preMOUKickoffChecklistEngine.getKickoff(params.kickoff_id as string);
                break;
              case "list":
                kcResult = preMOUKickoffChecklistEngine.listKickoffs(
                  params.open_only ? { status: "open" } : undefined,
                );
                break;
              case "close":
                kcResult = preMOUKickoffChecklistEngine.close({
                  kickoff_id: params.kickoff_id as string,
                  closed_at: params.closed_at as number,
                  closed_by: params.closed_by as string,
                });
                break;
              case "sweep_waivers":
                kcResult = preMOUKickoffChecklistEngine.sweepExpiredWaivers(
                  (params.now as number | undefined) ?? Date.now(),
                );
                break;
              default:
                return ok({ success: false, error: `Unknown kickoff_checklist op: ${String(op)}` });
            }
            return ok({ success: true, op, data: kcResult });
          }
          default:
            return ok({ error: `Unknown action: ${action}`, available: ACTIONS });
        }
      } catch (err: any) {
        return dispatcherError(err, action, "prism_session");
      }
    }
  );
}