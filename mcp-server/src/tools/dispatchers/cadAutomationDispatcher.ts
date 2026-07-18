/**
 * prism_cad_automation â€” CAD Automation Dispatcher
 *
 * Wires the unified CADAutomationRouter (U-CAUT10) into the MCP action surface
 * so skills, agents, and external clients can drive CAD automation through a
 * single set of 14 actions regardless of which underlying bridge services the
 * call (SolidWorks, Inventor, FreeCAD, Mastercam, Fusion 360, hyperMILL).
 *
 * Action surface:
 *   Routing / discovery
 *     - route                        â€” resolve a filePath to { bridge, ext }
 *     - list_supported_extensions    â€” enumerate all 12 covered extensions
 *     - supports_extension           â€” case-insensitive supports check
 *   Lifecycle
 *     - open                         â€” open a CAD session by filePath
 *     - close                        â€” tear down a CAD session
 *   Data access (requires prior open)
 *     - get_geometry                 â€” normalized entity counts
 *     - get_operation_tree           â€” normalized op count + cycle palette
 *     - get_toolpaths                â€” flat list of normalized ops
 *     - export_step                  â€” emit STEP AP242 to outputPath
 *   Mock-layer passthrough (no open required)
 *     - mock_geometry / mock_operation_tree / mock_toolpaths
 *     - mock_fingerprint / mock_all_fingerprints
 *
 * Design notes:
 *   - No per-bridge actions â€” callers never pick the bridge manually. The
 *     router inspects the extension and picks the right one.
 *   - In PRISM_CAD_MOCK=1 mode the router short-circuits open/close/export to
 *     no-ops and serves geometry/ops/toolpaths from CADAutomationMockLayer.
 *   - Hooks fire on "pre-calculation" / "post-calculation" to match the
 *     pattern used by every other PRISM dispatcher.
 *
 * @milestone CAD-AUTOMATION-MS0/U-CAUT11
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { CAD_AUTOMATION_ACTION_SCHEMAS } from "../../schemas/cadAutomationActionSchemas.js";
import type { ICADCodeGenerator } from "../../interfaces/ICADCodeGenerator.js";
import type { TribalTipProvider } from "../../engines/CADTrialErrorLearningEngine.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

// Lazy singletons
let _router: typeof import("../../engines/CADAutomationRouter.js").cadAutomationRouter | null = null;
let _mockLayer: typeof import("../../engines/CADAutomationMockLayer.js").cadAutomationMockLayer | null =
  null;

async function getRouter() {
  if (_router) return _router;
  const mod = await import("../../engines/CADAutomationRouter.js");
  _router = mod.cadAutomationRouter;
  return _router;
}

async function getMockLayer() {
  if (_mockLayer) return _mockLayer;
  const mod = await import("../../engines/CADAutomationMockLayer.js");
  _mockLayer = mod.cadAutomationMockLayer;
  return _mockLayer;
}

/**
 * Build a pure TribalTipProvider for the CAD trial-error learning loop's
 * knowledge-injection arm (U-CAD-LEARN-TRIBAL-INJECT). Pre-loads the
 * CADTribalDrawInjectionEngine + the tracked CAD tribal corpus (same source as
 * cad_tribal_draw_query) so the returned provider is SYNCHRONOUS -- the learning
 * engine invokes it inline while staying pure (no corpus I/O of its own).
 *
 * The provider maps a recommendation's risk profile (top failure categories +
 * candidate part/feature/generator) to a DrawContext and returns the ranked,
 * matched tribal lessons. So a topology-risk candidate surfaces "topology before
 * tolerance", a STEP-emit candidate surfaces the inch-unit lesson, etc.
 *
 * @param inlineCorpus optional caller-supplied corpus override (else the tracked default)
 * @returns a synchronous, side-effect-free TribalTipProvider
 */
async function buildCadTribalProvider(inlineCorpus?: unknown[]): Promise<TribalTipProvider> {
  const { cadTribalDrawInjectionEngine } = await import(
    "../../engines/CADTribalDrawInjectionEngine.js"
  );
  const corpus = Array.isArray(inlineCorpus)
    ? inlineCorpus
    : (await import("../../data/cadDrawTribalTips.js")).CAD_DRAW_TRIBAL_TIPS;
  return ({ categories, candidate, limit }) => {
    // Category names are snake_case (topology_mismatch) -> de-underscore so they
    // token-match the tip text ("topology"). Candidate part/feature/generator add
    // domain context for the ranker.
    const queryParts = [
      ...categories.map((c) => String(c).replace(/_/g, " ")),
      candidate.partType,
      candidate.generator,
      ...(candidate.features ?? []),
    ].filter((x): x is string => typeof x === "string" && x.length > 0);
    const ctx = {
      featureType: candidate.features?.[0] ?? candidate.partType,
      query: queryParts.join(" "),
      limit: limit ?? 5,
    };
    const injection = cadTribalDrawInjectionEngine.recommend(ctx as never, corpus as never);
    return injection.applied.map((t) => ({
      id: t.id,
      tip: t.tip ?? "",
      relevanceScore: t.relevanceScore,
      source: t.source,
      kind: t.kind,
    }));
  };
}

const ACTIONS = [
  // Routing / discovery
  "route",
  "list_supported_extensions",
  "supports_extension",
  // Lifecycle
  "open",
  "close",
  // Data access
  "get_geometry",
  "get_operation_tree",
  "get_toolpaths",
  "export_step",
  // Mock-layer passthrough
  "mock_geometry",
  "mock_operation_tree",
  "mock_toolpaths",
  "mock_fingerprint",
  "mock_all_fingerprints",
  // CAD-INPUT-MS0 â€” universal DXF parse + write (closes 1,445-file gap)
  "dxf_parse",
  "dxf_write_polygons",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC11 — pure-JS STL write (closes STL gap)
  "stl_write_polygons",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC07: IGES import
  "iges_parse",
  "iges_extract_geometry",
  "iges_summary",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC08: format conversion matrix
  "cad_classify_conversion",
  "cad_best_path",
  "cad_sniff_format",
  "cad_probe_validity",
  "cad_list_conversion_edges",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC09: feature classifier
  "cad_classify_feature",
  "cad_classify_batch",
  "cad_group_by_family",
  "cad_dominant_family",
  // U-CUIX-P0-19 â€” AI-control surface: route master-AI intent through
  // ICADCodeGenerator adapters (FreeCAD/Fusion360/Inventor/Mastercam today;
  // HyperCAD-S + SolidWorks land in P0-17/P0-18). Closes the "4 adapters
  // with 557 tests but zero dispatcher wiring" orphan flagged by CAD-UIX-MS0
  // round 1 scrutiny finding F4.
  "list_systems",
  "list_capabilities",
  "build_script",
  "execute_script",
  "validate_script",
  // U-CUIX-P0-20 â€” CADOperationPlanner intent â†’ CADOperation[] surface
  "plan_ops",
  // U-CUIX-P0-21 â€” ComplexPartPlanner: multi-body + multi-configuration
  "plan_complex_part",
  // U-CUIX-P0-22 â€” AssemblyPlanner: components + mates + BOM + drawings
  "plan_assembly",
  // U-CADC-AI01 â€” MasterCADControlBrain: full orchestration facade
  "orchestrate_intent",
  // U-CADC-AI02 â€” CADIntentDecomposer: NL â†’ structured intent
  "decompose_intent",
  // U-CADC-AI04 â€” CADAIStateMachine: observable FSM for multi-step flows
  "fsm_open",
  "fsm_close",
  "fsm_dispatch",
  "fsm_snapshot",
  "fsm_log",
  "fsm_list",
  "fsm_allowed_events",
  // U-CADC13 â€” BladeProfileLibrary: NACA 4/5-digit airfoil generation
  "airfoil_list",
  "airfoil_query",
  "airfoil_get",
  "airfoil_interpolate",
  // U-CADC28 â€” CADFeatureMemoryEngine: persistent feature pattern memory + similarity search
  "feature_memory_record",
  "feature_memory_query",
  "feature_memory_lookup",
  "feature_memory_stats",
  // U-CGT03 â€” CADToSTEPPipelineEngine: full CADâ†’STEP orchestration + AP214/AP242 validation
  "step_pipeline_run",
  "step_pipeline_batch",
  "step_validate",
  "step_pipeline_strategies",
  "step_pipeline_supported",
  // U-CGT04 â€” GroundTruthFeatureTreeExtractor: canonical feature tree extraction across CAD formats
  "feature_tree_extract",
  "feature_tree_validate",
  "feature_tree_recompute_signature",
  "feature_tree_canonical_types",
  "feature_tree_source_formats",
  // U-CGT01 â€” FCStdNativeParserEngine: native FreeCAD .FCStd parsing (ZIP+XML)
  "fcstd_parse",
  // U-CGT02 â€” F3DSQLiteParserEngine: native Fusion .f3d / .f3z parsing (ZIP+SQLite)
  "f3d_parse",
  "f3z_parse",
  // U-CGT05 â€” DimensionalSignatureEngine: STEP â†’ SI dimensional fingerprint
  "dim_signature_extract",
  "dim_signature_extract_text",
  "dim_signature_compare",
  "dim_signature_validate",
  "dim_signature_recompute",
  // U-CGT08 â€” GroundTruthRegistryEngine: indexed corpus query
  "gt_registry_build_index",
  "gt_registry_find_file_id",
  "gt_registry_find_customer",
  "gt_registry_find_machine",
  "gt_registry_find_complexity",
  "gt_registry_find_format",
  "gt_registry_query",
  "gt_registry_stats",
  "gt_registry_dump",
  "gt_registry_load",
  // U-CGT09 â€” GroundTruthValidationEngine: corpus integrity gate + quarantine
  "gt_validate_bundle",
  "gt_validate_corpus",
  "gt_export_quarantine",
  "gt_validate_report",
  "gt_list_issue_codes",
  // U-CADC01..U-CADC04 â€” UniversalCADIndexEngine: master CAD-file registry
  "universal_cad_index",
  "universal_cad_load",
  "universal_cad_coverage",
  "universal_cad_has_coverage",
  "universal_cad_target_formats",
  "universal_cad_root_paths",
  // U-CGT06 â€” CADScreenshotCapturer: 6 canonical views via OCCT (mock fallback)
  "screenshot_capture_views",
  "screenshot_list_views",
  "screenshot_validate",
  "screenshot_recompute_signature",
  // U-CGT07 â€” GroundTruthBatchExtractor: 4-stage pipeline across 20K corpus
  "batch_extract",
  "batch_coverage_report",
  "batch_validate",
  // CAD-UNIVERSAL-CONTROL-MS0/U-CUC10: CAD knowledge graph
  "cad_graph_build",
  "cad_graph_detect_cycles",
  "cad_graph_find_orphans",
  "cad_graph_ancestors",
  "cad_graph_descendants",
  "cad_graph_to_jsonld",
  "cad_assembly_add_node",
  "cad_assembly_add_ref",
  "cad_assembly_remove_node",
  "cad_assembly_get_children",
  "cad_assembly_get_parents",
  "cad_assembly_descendants",
  "cad_assembly_ancestors",
  "cad_assembly_broken_refs",
  "cad_assembly_heal",
  "cad_assembly_detect_cycles",
  "cad_assembly_impact",
  "cad_assembly_list_nodes",
  "cad_assembly_list_edges",
  "cad_assembly_snapshot",
  "cad_assembly_load",
  "cad_assembly_persist",
  "cad_cas_load",
  "cad_cas_persist",
  "cad_cas_upsert",
  "cad_cas_get",
  "cad_cas_get_by_path",
  "cad_cas_ingest",
  "cad_cas_verify",
  "cad_cas_detect_ip_leaks",
  "cad_cas_delete",
  "cad_cas_rebuild_meta",
  "cad_cas_list",
  "cad_index_scan",
  "cad_index_load",
  "cad_index_status",
  "cad_drawing_parse",
  "cad_drawing_fuzzy_find",
  "cad_drawing_get_family",
  "cad_drawing_index_size",
  "cad_classify_run",
  "cad_classify_one",
  "cad_classify_format",
  "cad_taxonomy_get",
  "cad_taxonomy_list",
  "cad_taxonomy_aerospace",
  "cad_taxonomy_by_category",
  "cad_taxonomy_by_system",
  "cad_taxonomy_search",
  "cad_taxonomy_compatibility",
  "cad_taxonomy_stats",
  "cad_geometry_compare",
  "cad_geometry_extract",
  "cad_geometry_thresholds_get",
  "cad_geometry_thresholds_set",
  "cad_accuracy_validate",
  "cad_accuracy_dimensional",
  "cad_accuracy_topology",
  "cad_accuracy_dfm",
  "cad_accuracy_tolerance",
  "cad_accuracy_features",
  "cad_search_index",
  "cad_search_query",
  "cad_search_get",
  "cad_search_remove",
  "cad_search_clear",
  "cad_search_stats",
  "cad_revision_detect",
  "cad_revision_group",
  "cad_reasoning_generate",
  "cad_reasoning_why",
  "cad_reasoning_get",
  "cad_reasoning_list",
  "cad_visual_diff_features",
  "cad_visual_diff_hashes",
  "cad_visual_diff_report",
  "cad_learning_ingest",
  "cad_learning_ingest_batch",
  "cad_learning_patterns",
  "cad_learning_recommend",
  "cad_learning_stats",
  "cad_learning_reset",
  "cad_learning_trend",
  "cad_learning_record_recommendation",
  "cad_learning_efficacy",
  "cad_rag_filter",
  "cad_rag_retrieve",
  "cad_rag_format",
  "cad_rag_rank",
  "cad_rag_augment",
  "cad_rag_stats",
  "cad_pipeline_run",
  "cad_pipeline_validate",
  "cad_pipeline_status",
  "cad_embed",
  "cad_embed_batch",
  "cad_embed_build_index",
  "cad_embed_search",
  "cad_embed_cache_clear",
  "cad_index_ingest",
  "cad_index_query",
  "cad_index_similar",
  "cad_index_stats_orch",
  "cad_index_clear",
  "cad_kernel_eval_nurbs",
  "cad_kernel_compute_aabb",
  "cad_kernel_ray_intersect",
  "cad_kernel_mesh_volume",
  "cad_kernel_mesh_area",
  "cad_kernel_generate_box",
  "cad_access_grant",
  "cad_access_revoke",
  "cad_access_check",
  "cad_access_checkout",
  "cad_access_checkin",
  "cad_access_audit",
  "cad_feature_extract",
  "cad_thumb_get",
  "cad_thumb_has",
  "cad_thumb_list",
  "cad_thumb_invalidate",
  "cad_drawing_knowledge_calc",
  "cad_artifact_write",
  "cad_artifact_list",
  "cad_artifact_prune",
  "cad_bundle_register",
  "cad_bundle_get",
  "cad_bundle_list",
  "cad_bundle_diff",
  "cad_bundle_search",
  "cad_bundle_retrain_list",
  "cad_bundle_retrain_drain",
  "cad_bundle_key_create",
  "cad_bundle_key_get",
  "cad_bundle_sign",
  "cad_bundle_verify",
  "cad_corpus_classify",
  "cad_corpus_ingest",
  "cad_corpus_dedup",
  "cad_corpus_stats",
  "cad_corpus_jsonl",
  "cad_crash_session_list",
  "cad_crash_session_get",
  "cad_crash_health_check",
  "cad_crash_checkpoint_create",
  "cad_crash_checkpoint_get",
  "cad_crash_checkpoint_list",
  "cad_crash_journal_get",
  "cad_crash_history",
  "cad_crash_policy_get",
  "cad_crash_policy_set",
  "cad_failure_triage",
  "cad_failure_group",
  "cad_fs_registry_upsert",
  "cad_fs_registry_get",
  "cad_fs_registry_list",
  "cad_fs_registry_remove",
  "cad_fs_reconcile",
  "cad_fs_aging_plan",
  "cad_fs_aging_apply",
  "cad_fs_cost_tenant",
  "cad_install_probe",
  "cad_install_cached",
  "cad_install_invalidate",
  "cad_license_server_add",
  "cad_license_server_list",
  "cad_license_server_check",
  "cad_license_features_refresh",
  "cad_license_features_list",
  "cad_license_utilization",
  "cad_license_users_active",
  "cad_license_contention_record",
  "cad_license_contention_history",
  "cad_license_alerts",
  "cad_license_alert_ack",
  "cad_license_health_summary",
  "cad_param_predict",
  "cad_param_model_info",
  "cad_param_train",
  "cad_param_evaluate",
  "cad_audit_record",
  "cad_audit_query",
  "cad_audit_verify",
  "cad_audit_chain_info",
  "cad_audit_export",
  "cad_audit_clear",
  "cad_mtls_cert_add",
  "cad_mtls_cert_list",
  "cad_mtls_cert_validate",
  "cad_mtls_binary_verify",
  "cad_mtls_connection_validate",
  "cad_mtls_events",
  "cad_mtls_config",
  "cad_regen_test",
  "cad_regen_batch",
  "cad_regen_compare",
  "cad_regen_thresholds_get",
  "cad_regen_thresholds_set",
  "cad_regression_dashboard_snapshot",
  "cad_regression_dashboard_list",
  "cad_regression_run",
  "cad_regression_load",
  "cad_regression_report_snapshot",
  "cad_regression_report_diff",
  "cad_regression_report_trend",
  "cad_regression_report_hotspots",
  "cad_regression_report_summary",
  "cad_regression_analyzer_diff",
  "cad_regression_analyzer_trend",
  "cad_regression_analyzer_hotspots",
  "cad_augment_geometry",
  "cad_augment_batch",
  "cad_augment_stats",
  "cad_augment_reset_stats",
  "cad_augment_configure",
  "cad_augment_get_config",
  "cad_physics_gate_validate",
  "cad_physics_gate_validate_batch",
  "cad_physics_gate_constants",
  "cad_physics_gate_stats",
  "cad_physics_gate_reset_stats",
  "cad_replication_set_target",
  "cad_replication_register_replica",
  "cad_replication_register_shard",
  "cad_replication_mark_replica_lost",
  "cad_replication_mark_shard_lost",
  "cad_replication_get",
  "cad_replication_merge",
  "cad_revision_get_record",
  "cad_revision_list_by_drawing",
  "cad_revision_get_current",
  "cad_revision_create_draft",
  "cad_revision_submit_for_review",
  "cad_revision_revoke_to_draft",
  "cad_revision_reject",
  "cad_trainer_param_count",
  "cad_trainer_update_on_batch",
  "cad_trainer_score_sequence",
  "cad_trainer_predict_next",
  "cad_trainer_serialize_checkpoint",
  "cad_trainer_load_checkpoint",
  "cad_tenant_register",
  "cad_tenant_get",
  "cad_tenant_list_by_tenant",
  "cad_tenant_list_all",
  "cad_tenant_can_access",
  "cad_tenant_sign_nda",
  "cad_tenant_find_collisions",
  "cad_checkpoint_validate",
  "cad_checkpoint_create_cadence",
  "cad_checkpoint_record_transition",
  "cad_checkpoint_save",
  "cad_checkpoint_load",
  "cad_token_vocab_size",
  "cad_token_vocab_version",
  "cad_token_get_id",
  "cad_token_get_name",
  "cad_token_get_def",
  "cad_token_list_names",
  "cad_token_supported_formats",
  "cad_corpus_scan_only",
  "cad_corpus_orchestrate",
  // ENGINE-WIRE-CAD-MS0/U-WIRE-CAD-BATCH1: 3 unwired CAD engines
  "cad_geometry_hash",                  // GeometryHashGroupingEngine.geometryHash
  "cad_geometry_assign_splits",         // GeometryHashGroupingEngine.assignSplits
  "cad_solidcam_chip_thickness",        // SolidCamAlgorithmsEngine.chipThickness
  "cad_solidcam_engagement_geometry",   // SolidCamAlgorithmsEngine.engagementGeometry
  "cad_solidcam_adjust_feed",           // SolidCamAlgorithmsEngine.adjustFeedForEngagement
  "cad_solidworks_list_modules",        // SolidWorksCADFunctionIndexEngine.listModules
  "cad_solidworks_module",              // SolidWorksCADFunctionIndexEngine.getModule
  "cad_solidworks_list_operations",     // SolidWorksCADFunctionIndexEngine.listAllOperations
] as const;

export type CadAutomationAction = (typeof ACTIONS)[number];

async function resolveExtFromParams(params: Record<string, unknown>): Promise<string> {
  if (typeof params["ext"] === "string" && params["ext"]) return params["ext"] as string;
  if (typeof params["filePath"] === "string" && params["filePath"]) {
    const router = await getRouter();
    const d = router.route(params["filePath"] as string);
    return d.ext;
  }
  throw new Error("Provide either 'ext' or 'filePath'");
}

export function registerCadAutomationDispatcher(server: any): void {
  server.tool(
    "prism_cad_automation",
    `CAD automation router â€” unified access to SolidWorks/Inventor/FreeCAD/Mastercam/Fusion 360/hyperMILL via a single action surface. Supported formats: .sldprt .sldasm .ipt .iam .FCStd .FCStd1 .mcam .mcx .mcx-8 .f3d .f3z .hmc.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({
      action,
      params: rawParams = {},
    }: {
      action: CadAutomationAction;
      params?: Record<string, unknown>;
    }) => {
      log.info(`[prism_cad_automation] Action: ${action}`);
      let result: unknown;
      try {
        let params: Record<string, unknown> = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams) as Record<string, unknown>;
        } catch {
          /* normalizer unavailable â€” proceed with raw params */
        }

        const validation = validateActionParams(action, params, CAD_AUTOMATION_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_cad_automation",
          );
        }

        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "cadAutomationDispatcher", action, params },
        };
        const pre = await hookExecutor.execute("pre-calculation", hookCtx);
        if (pre.blocked) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  blocked: true,
                  blocker: pre.blockedBy,
                  reason: pre.summary,
                  action,
                }),
              },
            ],
          };
        }

        const router = await getRouter();

        switch (action) {
          case "route": {
            result = router.route(params["filePath"] as string);
            break;
          }
          case "list_supported_extensions": {
            result = { extensions: router.listSupportedExtensions() };
            break;
          }
          case "supports_extension": {
            const ext = params["ext"] as string;
            result = { ext, supported: router.supportsExtension(ext) };
            break;
          }
          case "open": {
            result = await router.open(params["filePath"] as string);
            break;
          }
          case "close": {
            result = await router.close(params["filePath"] as string);
            break;
          }
          case "get_geometry": {
            result = await router.getGeometry(params["filePath"] as string);
            break;
          }
          case "get_operation_tree": {
            result = await router.getOperationTree(params["filePath"] as string);
            break;
          }
          case "get_toolpaths": {
            result = await router.getToolpaths(params["filePath"] as string);
            break;
          }
          case "export_step": {
            result = await router.exportSTEP(
              params["filePath"] as string,
              params["outputPath"] as string,
            );
            break;
          }
          case "mock_geometry": {
            const mock = await getMockLayer();
            const ext = await resolveExtFromParams(params);
            if (!mock.supports(ext)) {
              throw new Error(`Unsupported extension for mock: ${ext}`);
            }
            result = mock.geometryFor(ext as Parameters<typeof mock.geometryFor>[0]);
            break;
          }
          case "mock_operation_tree": {
            const mock = await getMockLayer();
            const ext = await resolveExtFromParams(params);
            if (!mock.supports(ext)) {
              throw new Error(`Unsupported extension for mock: ${ext}`);
            }
            result = mock.operationTreeFor(ext as Parameters<typeof mock.operationTreeFor>[0]);
            break;
          }
          case "mock_toolpaths": {
            const mock = await getMockLayer();
            const ext = await resolveExtFromParams(params);
            if (!mock.supports(ext)) {
              throw new Error(`Unsupported extension for mock: ${ext}`);
            }
            result = { ops: mock.toolpathsFor(ext as Parameters<typeof mock.toolpathsFor>[0]) };
            break;
          }
          case "mock_fingerprint": {
            const mock = await getMockLayer();
            const ext = await resolveExtFromParams(params);
            if (!mock.supports(ext)) {
              throw new Error(`Unsupported extension for mock: ${ext}`);
            }
            result = { ext, fingerprint: mock.fingerprint(ext as Parameters<typeof mock.fingerprint>[0]) };
            break;
          }
          case "mock_all_fingerprints": {
            const mock = await getMockLayer();
            result = mock.allFingerprints();
            break;
          }
          case "dxf_parse": {
            // CAD-INPUT-MS0 â€” parse DXF content into Polygon2D[] via DXFParserEngine.
            const { dxfParserEngine } = await import("../../engines/DXFParserEngine.js");
            const content = params["content"] as string;
            if (typeof content !== "string" || content.length === 0) {
              throw new Error("dxf_parse requires non-empty 'content' string");
            }
            const polygons = dxfParserEngine.parseDXF(content);
            result = {
              polygon_count: polygons.length,
              polygons,
              source: "dxfParserEngine.parseDXF",
            };
            break;
          }
          case "dxf_write_polygons": {
            // CAD-INPUT-MS0 â€” write Polygon2D[] to DXF R12 ASCII.
            const { dxfWriterEngine } = await import("../../engines/DxfWriterEngine.js");
            result = dxfWriterEngine.writePolygonsToDxf(
              params["polygons"] as Parameters<typeof dxfWriterEngine.writePolygonsToDxf>[0],
              {
                outer_layer: params["outer_layer"] as string | undefined,
                hole_layer: params["hole_layer"] as string | undefined,
                acadver: params["acadver"] as string | undefined,
                precision: params["precision"] as number | undefined,
              },
            );
            break;
          }
          case "stl_write_polygons": {
            // CAD-UNIVERSAL-CONTROL-MS0/U-CUC11 — write Polygon2D[] to STL (ASCII or binary).
            const { stlWriterEngine } = await import("../../engines/StlWriterEngine.js");
            result = stlWriterEngine.writePolygonsToStl(
              params["polygons"] as Parameters<typeof stlWriterEngine.writePolygonsToStl>[0],
              {
                thickness: params["thickness"] as number | undefined,
                format: params["format"] as "ascii" | "binary" | undefined,
                solidName: params["solid_name"] as string | undefined,
                precision: params["precision"] as number | undefined,
              },
            );
            break;
          }
          // â”€â”€ CAD-UNIVERSAL-CONTROL-MS0/U-CUC07: IGES import via IGESImportEngine â”€â”€
          case "iges_parse": {
            const { IGESImportEngine } = await import("../../engines/IGESImportEngine.js");
            const engine = new IGESImportEngine();
            const content = params["content"] as string;
            if (typeof content !== "string" || content.length === 0) {
              throw new Error("iges_parse requires non-empty 'content' string");
            }
            const parsed = engine.parseIGES({ content });
            result = {
              entity_count: parsed.entities.length,
              entities: parsed.entities,
              global: parsed.global,
              summary: parsed.summary,
              source: "IGESImportEngine.parseIGES",
            };
            break;
          }
          case "iges_extract_geometry": {
            const { IGESImportEngine } = await import("../../engines/IGESImportEngine.js");
            const engine = new IGESImportEngine();
            const content = params["content"] as string;
            if (typeof content !== "string" || content.length === 0) {
              throw new Error("iges_extract_geometry requires non-empty 'content' string");
            }
            const filter = params["filter"] as { types?: string[] } | undefined;
            const geometry = engine.extractGeometry({ content, filter });
            result = {
              ...geometry,
              source: "IGESImportEngine.extractGeometry",
            };
            break;
          }
          case "iges_summary": {
            const { IGESImportEngine } = await import("../../engines/IGESImportEngine.js");
            const engine = new IGESImportEngine();
            const content = params["content"] as string;
            if (typeof content !== "string" || content.length === 0) {
              throw new Error("iges_summary requires non-empty 'content' string");
            }
            const summary = engine.getSummary({ content });
            result = {
              ...summary,
              source: "IGESImportEngine.getSummary",
            };
            break;
          }
          // â”€â”€ CAD-UNIVERSAL-CONTROL-MS0/U-CUC08: CAD format conversion matrix â”€â”€
          case "cad_classify_conversion": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const from = params["from"] as string;
            const to = params["to"] as string;
            if (!from || !to) {
              throw new Error("cad_classify_conversion requires 'from' and 'to' format strings");
            }
            result = {
              ...cadFormatConversionMatrixEngine.classifyConversion(from, to),
              source: "cadFormatConversionMatrixEngine.classifyConversion",
            };
            break;
          }
          case "cad_best_path": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const from = params["from"] as string;
            const to = params["to"] as string;
            if (!from || !to) {
              throw new Error("cad_best_path requires 'from' and 'to' format strings");
            }
            const pathResult = cadFormatConversionMatrixEngine.bestPath(from, to);
            result = pathResult
              ? { ...pathResult, source: "cadFormatConversionMatrixEngine.bestPath" }
              : { path: null, compositeScore: 0, source: "cadFormatConversionMatrixEngine.bestPath" };
            break;
          }
          case "cad_sniff_format": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const hex = params["hex"] as string | undefined;
            const bytes = params["bytes"] as number[] | undefined;
            if (!hex && !bytes) {
              throw new Error("cad_sniff_format requires 'hex' string or 'bytes' array");
            }
            const input = hex ?? new Uint8Array(bytes!);
            const format = cadFormatConversionMatrixEngine.sniffFormat(input);
            result = {
              format: format ?? null,
              source: "cadFormatConversionMatrixEngine.sniffFormat",
            };
            break;
          }
          case "cad_probe_validity": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const filename = params["filename"] as string;
            const hex = params["hex"] as string | undefined;
            const bytes = params["bytes"] as number[] | undefined;
            if (!filename) {
              throw new Error("cad_probe_validity requires 'filename'");
            }
            if (!hex && !bytes) {
              throw new Error("cad_probe_validity requires 'hex' string or 'bytes' array");
            }
            const input = hex ?? new Uint8Array(bytes!);
            result = {
              ...cadFormatConversionMatrixEngine.probeValidity(filename, input),
              source: "cadFormatConversionMatrixEngine.probeValidity",
            };
            break;
          }
          case "cad_list_conversion_edges": {
            const { cadFormatConversionMatrixEngine } = await import("../../engines/CADFormatConversionMatrixEngine.js");
            const edges = cadFormatConversionMatrixEngine.listEdges();
            result = {
              edges,
              count: edges.length,
              source: "cadFormatConversionMatrixEngine.listEdges",
            };
            break;
          }
          // â”€â”€ CAD-UNIVERSAL-CONTROL-MS0/U-CUC09: feature classifier â”€â”€
          case "cad_classify_feature": {
            const { CADFeatureClassifierEngine } = await import("../../engines/CADFeatureClassifierEngine.js");
            const engine = new CADFeatureClassifierEngine();
            const feature = params["feature"] as Parameters<typeof engine.classify>[0];
            if (!feature) {
              throw new Error("cad_classify_feature requires 'feature' object");
            }
            result = {
              ...engine.classify(feature),
              source: "CADFeatureClassifierEngine.classify",
            };
            break;
          }
          case "cad_classify_batch": {
            const { CADFeatureClassifierEngine } = await import("../../engines/CADFeatureClassifierEngine.js");
            const engine = new CADFeatureClassifierEngine();
            const features = params["features"] as Parameters<typeof engine.classifyBatch>[0];
            if (!Array.isArray(features)) {
              throw new Error("cad_classify_batch requires 'features' array");
            }
            result = {
              ...engine.classifyBatch(features),
              source: "CADFeatureClassifierEngine.classifyBatch",
            };
            break;
          }
          case "cad_group_by_family": {
            const { CADFeatureClassifierEngine } = await import("../../engines/CADFeatureClassifierEngine.js");
            const engine = new CADFeatureClassifierEngine();
            const classifications = params["classifications"] as Parameters<typeof engine.groupByFamily>[0];
            if (!Array.isArray(classifications)) {
              throw new Error("cad_group_by_family requires 'classifications' array");
            }
            result = {
              groups: engine.groupByFamily(classifications),
              source: "CADFeatureClassifierEngine.groupByFamily",
            };
            break;
          }
          case "cad_dominant_family": {
            const { CADFeatureClassifierEngine } = await import("../../engines/CADFeatureClassifierEngine.js");
            const engine = new CADFeatureClassifierEngine();
            const classifications = params["classifications"] as Parameters<typeof engine.suggestDominantFamily>[0];
            if (!Array.isArray(classifications)) {
              throw new Error("cad_dominant_family requires 'classifications' array");
            }
            result = {
              ...engine.suggestDominantFamily(classifications),
              source: "CADFeatureClassifierEngine.suggestDominantFamily",
            };
            break;
          }
          // â”€â”€ U-CUIX-P0-19: AI-control surface via CADAdapterRegistry â”€â”€
          case "list_systems": {
            const { listAllCADSystems } = await import(
              "../../engines/CADAdapterRegistry.js"
            );
            const inv = listAllCADSystems();
            const includeUnregistered = params["include_unregistered"] !== false;
            result = includeUnregistered
              ? inv
              : { registered: inv.registered, totalDeclared: inv.totalDeclared, coverageRatio: inv.coverageRatio };
            break;
          }
          case "list_capabilities": {
            const { listAllCapabilities, getCADAdapter, isCADSystemRegistered } = await import(
              "../../engines/CADAdapterRegistry.js"
            );
            const requested = params["cad_system"] as string | undefined;
            if (requested) {
              if (!isCADSystemRegistered(requested)) {
                throw new Error(
                  `CAD system '${requested}' is not registered. Use action 'list_systems' to enumerate available systems.`,
                );
              }
              const adapter = await getCADAdapter(requested);
              const caps = adapter.getCapabilities();
              result = {
                cad_system: caps.cadSystem,
                supported_ops: Array.from(caps.supportedOps).sort(),
                supported_ops_count: caps.supportedOps.size,
                native_length_unit: caps.nativeLengthUnit,
                native_angle_unit: caps.nativeAngleUnit,
                requires_subprocess: caps.requiresSubprocess,
                typical_latency_ms: caps.typicalLatencyMs,
                limits: caps.limits ?? {},
              };
            } else {
              const full = await listAllCapabilities();
              result = {
                systems: full.map((e) => ({
                  cad_system: e.cadSystem,
                  description: e.description,
                  supported_ops_count: e.supportedOpsCount,
                  native_length_unit: e.capabilities.nativeLengthUnit,
                  native_angle_unit: e.capabilities.nativeAngleUnit,
                  requires_subprocess: e.capabilities.requiresSubprocess,
                  typical_latency_ms: e.capabilities.typicalLatencyMs,
                })),
                count: full.length,
              };
            }
            break;
          }
          case "build_script": {
            const { getCADAdapter } = await import("../../engines/CADAdapterRegistry.js");
            const cadSystem = params["cad_system"] as string;
            const operations = params["operations"] as Array<Record<string, unknown>>;
            const context = (params["context"] as Record<string, unknown>) ?? {};
            const adapter = await getCADAdapter(cadSystem);
            const script = adapter.buildScript(
              operations as unknown as Parameters<typeof adapter.buildScript>[0],
              context as Parameters<typeof adapter.buildScript>[1],
            );
            // Serialize Map â†’ [key, value][] so the script crosses the MCP wire cleanly.
            const parametersArr = Array.from(script.parameters.entries());
            result = {
              cad_system: script.cadSystem,
              body: script.body,
              filename: script.filename,
              imports: script.imports,
              lineage: script.lineage,
              warnings: script.warnings,
              parameters: parametersArr,
              op_count: operations.length,
              script_bytes: script.body.length,
            };
            break;
          }
          case "execute_script": {
            const { getCADAdapter, cadAdapterRequiresLiveHost } = await import(
              "../../engines/CADAdapterRegistry.js"
            );
            const cadSystem = params["cad_system"] as string;
            const scriptParam = params["script"] as Record<string, unknown>;
            const adapter = await getCADAdapter(cadSystem);
            // Reconstruct the CADScript<string> shape from the wire payload.
            const parametersInput = scriptParam["parameters"];
            const paramEntries: Array<[string, unknown]> = Array.isArray(parametersInput)
              ? (parametersInput as Array<[string, unknown]>)
              : [];
            const script = {
              cadSystem: scriptParam["cadSystem"] as string,
              body: scriptParam["body"] as string,
              filename: scriptParam["filename"] as string,
              imports: (scriptParam["imports"] as string[]) ?? [],
              lineage: (scriptParam["lineage"] as unknown[]) ?? [],
              warnings: (scriptParam["warnings"] as unknown[]) ?? [],
              parameters: new Map(paramEntries) as Parameters<typeof adapter.executeScript>[0]["parameters"],
            } as Parameters<typeof adapter.executeScript>[0];
            const execResult = await adapter.executeScript(script);
            result = {
              ...execResult,
              cad_system: cadSystem,
              requires_live_host: cadAdapterRequiresLiveHost(cadSystem as never),
            };
            break;
          }
          case "validate_script": {
            const { getCADAdapter } = await import("../../engines/CADAdapterRegistry.js");
            const cadSystem = params["cad_system"] as string;
            const execResult = params["execution_result"] as Parameters<
              ICADCodeGenerator["validateOutput"]
            >[0];
            const adapter = await getCADAdapter(cadSystem);
            const report = adapter.validateOutput(execResult);
            result = {
              cad_system: cadSystem,
              ok: report.ok,
              findings: report.findings,
              acceptance_score: report.acceptanceScore,
            };
            break;
          }
          case "plan_ops": {
            // U-CUIX-P0-20 â€” structured intent â†’ CADOperation[] via planner.
            const { cadOperationPlannerEngine } = await import(
              "../../engines/CADOperationPlannerEngine.js"
            );
            const intent = params["intent"] as Parameters<
              typeof cadOperationPlannerEngine.plan
            >[0];
            const planResult = await cadOperationPlannerEngine.plan(intent);
            result = {
              cad_system: planResult.cadSystem,
              ops: planResult.ops,
              op_count: planResult.opCount,
              feature_count: planResult.featureCount,
              warnings: planResult.warnings,
              compatibility: planResult.compatibility,
            };
            break;
          }
          case "orchestrate_intent": {
            // U-CADC-AI01 â€” full chain: intent â†’ select_cad â†’ plan â†’ build â†’ (execute) â†’ validate
            const { masterCADControlBrainEngine } = await import(
              "../../engines/MasterCADControlBrainEngine.js"
            );
            const intent = params["intent"] as Parameters<
              typeof masterCADControlBrainEngine.orchestrate
            >[0];
            const opts = (params["options"] as Parameters<
              typeof masterCADControlBrainEngine.orchestrate
            >[1]) ?? {};
            const report = await masterCADControlBrainEngine.orchestrate(intent, opts);
            result = {
              tier: report.tier,
              cad_system: report.cadSystem,
              ok: report.ok,
              stages: report.stages,
              op_count: report.ops.length,
              script_bytes: report.script?.body.length ?? 0,
              execution_result: report.executionResult,
              validation_report: report.validationReport,
              total_duration_ms: report.totalDurationMs,
              compatibility: report.compatibility,
              narration: report.narration,
              warnings: report.warnings,
            };
            break;
          }
          case "plan_assembly": {
            // U-CUIX-P0-22 â€” components + mates + BOM + drawings â†’ plan.
            const { assemblyPlannerEngine } = await import(
              "../../engines/AssemblyPlannerEngine.js"
            );
            const intent = params["intent"] as Parameters<
              typeof assemblyPlannerEngine.plan
            >[0];
            const asm = await assemblyPlannerEngine.plan(intent);
            result = {
              cad_system: asm.cadSystem,
              assembly_name: asm.assemblyName,
              component_count: asm.componentCount,
              mate_count: asm.mateCount,
              drawing_view_count: asm.drawingViewCount,
              ops: asm.ops,
              op_count: asm.opCount,
              bom: asm.bom,
              warnings: asm.warnings,
              compatibility: asm.compatibility,
            };
            break;
          }
          case "airfoil_list": {
            const { bladeProfileLibraryEngine } = await import(
              "../../engines/BladeProfileLibraryEngine.js"
            );
            result = {
              count: bladeProfileLibraryEngine.profileCount(),
              entries: bladeProfileLibraryEngine.listCatalog(),
            };
            break;
          }
          case "airfoil_query": {
            const { bladeProfileLibraryEngine } = await import(
              "../../engines/BladeProfileLibraryEngine.js"
            );
            result = {
              entries: bladeProfileLibraryEngine.query({
                designation: params["designation"] as string | undefined,
                family: params["family"] as "naca-4" | "naca-5" | undefined,
                thicknessPct: params["thicknessPct"] as number | undefined,
                thicknessToleranceAbs: params["thicknessToleranceAbs"] as
                  | number
                  | undefined,
              }),
            };
            break;
          }
          case "airfoil_get": {
            const { bladeProfileLibraryEngine } = await import(
              "../../engines/BladeProfileLibraryEngine.js"
            );
            const designation = params["designation"] as string;
            const samples =
              typeof params["samplesPerSurface"] === "number"
                ? (params["samplesPerSurface"] as number)
                : 80;
            const p = bladeProfileLibraryEngine.getProfile(designation, samples);
            result = {
              designation: p.designation,
              family: p.family,
              digits: p.digits,
              max_camber: p.maxCamber,
              max_camber_pos: p.maxCamberPos,
              thickness: p.thickness,
              upper: p.upper,
              lower: p.lower,
              contour: p.contour,
              samples_per_surface: p.samplesPerSurface,
            };
            break;
          }
          case "airfoil_interpolate": {
            const { bladeProfileLibraryEngine } = await import(
              "../../engines/BladeProfileLibraryEngine.js"
            );
            const designation = params["designation"] as string;
            const x = params["x"] as number;
            const surface = params["surface"] as "upper" | "lower";
            const samples =
              typeof params["samplesPerSurface"] === "number"
                ? (params["samplesPerSurface"] as number)
                : 80;
            const p = bladeProfileLibraryEngine.getProfile(designation, samples);
            result = {
              designation,
              x,
              surface,
              y: bladeProfileLibraryEngine.interpolate(p, x, surface),
            };
            break;
          }
          case "fsm_open": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = cadAIStateMachineEngine.open(params["sessionId"] as string);
            break;
          }
          case "fsm_close": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            cadAIStateMachineEngine.close(params["sessionId"] as string);
            result = { closed: true, sessionId: params["sessionId"] };
            break;
          }
          case "fsm_dispatch": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = cadAIStateMachineEngine.dispatch(
              params["sessionId"] as string,
              params["event"] as Parameters<
                typeof cadAIStateMachineEngine.dispatch
              >[1],
              params["payload"],
            );
            break;
          }
          case "fsm_snapshot": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = cadAIStateMachineEngine.snapshot(params["sessionId"] as string);
            break;
          }
          case "fsm_log": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            const tail = typeof params["tail"] === "number" ? (params["tail"] as number) : 100;
            result = {
              sessionId: params["sessionId"],
              log: cadAIStateMachineEngine.getLog(params["sessionId"] as string, tail),
            };
            break;
          }
          case "fsm_list": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = { sessions: cadAIStateMachineEngine.list() };
            break;
          }
          case "fsm_allowed_events": {
            const { cadAIStateMachineEngine } = await import(
              "../../engines/CADAIStateMachineEngine.js"
            );
            result = {
              sessionId: params["sessionId"],
              events: cadAIStateMachineEngine.allowedEvents(params["sessionId"] as string),
            };
            break;
          }
          case "decompose_intent": {
            // U-CADC-AI02 â€” parse NL into structured CAD intent for AI01.
            const { cadIntentDecomposerEngine } = await import(
              "../../engines/CADIntentDecomposerEngine.js"
            );
            const nl = params["input"] as string;
            const nameHint = params["nameHint"] as string | undefined;
            if (typeof nl !== "string" || nl.trim().length === 0) {
              throw new Error("decompose_intent requires 'input' (non-empty string)");
            }
            const decomposed = cadIntentDecomposerEngine.decompose(nl, nameHint);
            result = {
              raw_input: decomposed.rawInput,
              tier: decomposed.tier,
              cad_system: decomposed.cadSystem,
              operation_type: decomposed.operationType,
              parameters: decomposed.parameters,
              constraints: decomposed.constraints,
              preferred_bridge: decomposed.preferredBridge,
              features: decomposed.features,
              op_intent: decomposed.opIntent,
              ambiguities: decomposed.ambiguities,
              confidence: decomposed.confidence,
              classification: decomposed.classification,
            };
            break;
          }
          case "plan_complex_part": {
            // U-CUIX-P0-21 â€” multi-body + multi-config ComplexPartIntent â†’ plan.
            const { complexPartPlannerEngine } = await import(
              "../../engines/ComplexPartPlannerEngine.js"
            );
            const intent = params["intent"] as Parameters<
              typeof complexPartPlannerEngine.plan
            >[0];
            const cp = await complexPartPlannerEngine.plan(intent);
            result = {
              cad_system: cp.cadSystem,
              part_name: cp.partName,
              body_count: cp.bodyCount,
              configuration_count: cp.configurationCount,
              default_ops: cp.defaultOps,
              default_op_count: cp.defaultOpCount,
              per_configuration: cp.perConfiguration,
              warnings: cp.warnings,
              compatibility: cp.compatibility,
              boolean_ops_emitted: cp.booleanOpsEmitted,
            };
            break;
          }
          case "feature_memory_record": {
            const { cadFeatureMemoryEngine } = await import(
              "../../engines/CADFeatureMemoryEngine.js"
            );
            const featureType = String(params["feature_type"] ?? "");
            const parameters = (params["parameters"] ?? {}) as Record<string, number | string | boolean>;
            const outcome = String(params["outcome"] ?? "") as "success" | "failure";
            const genTimeMs = Number(params["gen_time_ms"] ?? 0);
            const errorPattern = typeof params["error_pattern"] === "string" ? (params["error_pattern"] as string) : undefined;
            const persistFlag = params["persist"] === undefined ? true : Boolean(params["persist"]);
            const entry = await cadFeatureMemoryEngine.record({
              feature_type: featureType,
              parameters,
              outcome,
              gen_time_ms: genTimeMs,
              error_pattern: errorPattern,
            });
            if (persistFlag) await cadFeatureMemoryEngine.persist();
            result = {
              id: entry.id,
              feature_type: entry.feature_type,
              total_attempts: entry.total_attempts,
              success_count: entry.success_count,
              failure_count: entry.failure_count,
              success_rate: entry.success_rate,
              avg_gen_time_ms: entry.avg_gen_time_ms,
              error_patterns: entry.error_patterns,
              created_at: entry.created_at,
              last_used_at: entry.last_used_at,
              persisted: persistFlag,
            };
            break;
          }
          case "feature_memory_query": {
            const { cadFeatureMemoryEngine } = await import(
              "../../engines/CADFeatureMemoryEngine.js"
            );
            const featureType = String(params["feature_type"] ?? "");
            const parameters = (params["parameters"] ?? {}) as Record<string, number | string | boolean>;
            const matches = await cadFeatureMemoryEngine.query(featureType, parameters, {
              topK: typeof params["topK"] === "number" ? (params["topK"] as number) : undefined,
              minSuccessRate: typeof params["minSuccessRate"] === "number" ? (params["minSuccessRate"] as number) : undefined,
              minAttempts: typeof params["minAttempts"] === "number" ? (params["minAttempts"] as number) : undefined,
              featureTypeFilter: typeof params["featureTypeFilter"] === "string" ? (params["featureTypeFilter"] as string) : undefined,
            });
            result = {
              count: matches.length,
              matches: matches.map((m) => ({
                id: m.entry.id,
                feature_type: m.entry.feature_type,
                parameters: m.entry.parameters,
                similarity: m.similarity,
                success_rate: m.entry.success_rate,
                total_attempts: m.entry.total_attempts,
                avg_gen_time_ms: m.entry.avg_gen_time_ms,
                error_patterns: m.entry.error_patterns,
              })),
            };
            break;
          }
          case "feature_memory_lookup": {
            const { cadFeatureMemoryEngine } = await import(
              "../../engines/CADFeatureMemoryEngine.js"
            );
            const id = String(params["id"] ?? "");
            const entry = await cadFeatureMemoryEngine.lookup(id);
            result = { found: entry !== null, entry };
            break;
          }
          case "feature_memory_stats": {
            const { cadFeatureMemoryEngine } = await import(
              "../../engines/CADFeatureMemoryEngine.js"
            );
            result = await cadFeatureMemoryEngine.stats();
            break;
          }
          case "step_pipeline_run": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            result = await cadToSTEPPipelineEngine.runPipeline({
              filePath: String(params["filePath"] ?? ""),
              outputPath: String(params["outputPath"] ?? ""),
              requireOutputParent: typeof params["requireOutputParent"] === "boolean" ? (params["requireOutputParent"] as boolean) : undefined,
              validate: typeof params["validate"] === "boolean" ? (params["validate"] as boolean) : undefined,
            });
            break;
          }
          case "step_pipeline_batch": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            const rawItems = Array.isArray(params["items"]) ? (params["items"] as Array<{ filePath?: unknown; outputPath?: unknown }>) : [];
            const items = rawItems.map((it) => ({
              filePath: String(it?.filePath ?? ""),
              outputPath: String(it?.outputPath ?? ""),
            }));
            result = await cadToSTEPPipelineEngine.runBatch({
              items,
              continueOnError: typeof params["continueOnError"] === "boolean" ? (params["continueOnError"] as boolean) : undefined,
            });
            break;
          }
          case "step_validate": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            result = cadToSTEPPipelineEngine.validateSTEP(String(params["stepFilePath"] ?? ""));
            break;
          }
          case "step_pipeline_strategies": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            const ext = String(params["ext"] ?? "");
            const supported = cadToSTEPPipelineEngine.listSupportedExtensions();
            if (!(supported as readonly string[]).includes(ext)) {
              result = { error: `Unsupported extension: ${ext}`, supportedExtensions: supported };
            } else {
              const chain = cadToSTEPPipelineEngine.selectStrategy(ext as (typeof supported)[number]);
              result = { ext, strategies: chain };
            }
            break;
          }
          case "step_pipeline_supported": {
            const { cadToSTEPPipelineEngine } = await import(
              "../../engines/CADToSTEPPipelineEngine.js"
            );
            const exts = cadToSTEPPipelineEngine.listSupportedExtensions();
            result = { count: exts.length, extensions: exts };
            break;
          }
          case "feature_tree_extract": {
            // U-CGT04 â€” Extract canonical feature tree from a CAD file (mock or live).
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            const filePath = String(params["filePath"] ?? "");
            const formatHint = typeof params["formatHint"] === "string"
              ? (params["formatHint"] as string)
              : undefined;
            try {
              result = await groundTruthFeatureTreeExtractor.extract(
                filePath,
                formatHint as Parameters<typeof groundTruthFeatureTreeExtractor.extract>[1],
              );
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "feature_tree_validate": {
            // U-CGT04 â€” Validate a candidate tree against the canonical Zod schema.
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            result = groundTruthFeatureTreeExtractor.validate(params["candidate"]);
            break;
          }
          case "feature_tree_recompute_signature": {
            // U-CGT04 â€” Recompute canonical signature for a tree (post-edit).
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            try {
              const signature = groundTruthFeatureTreeExtractor.recomputeSignature(
                params["tree"] as Parameters<typeof groundTruthFeatureTreeExtractor.recomputeSignature>[0],
              );
              result = { signature };
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "feature_tree_canonical_types": {
            // U-CGT04 â€” Read-only canonical feature-type vocabulary.
            const { groundTruthFeatureTreeExtractor } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            const types = groundTruthFeatureTreeExtractor.listCanonicalTypes();
            result = { count: types.length, types };
            break;
          }
          case "feature_tree_source_formats": {
            // U-CGT04 â€” Source format vocabulary (file extensions the extractor recognizes).
            const { SOURCE_FORMATS } = await import(
              "../../engines/GroundTruthFeatureTreeExtractor.js"
            );
            result = { count: SOURCE_FORMATS.length, formats: SOURCE_FORMATS };
            break;
          }
          case "fcstd_parse": {
            // U-CGT01 â€” FreeCAD native .FCStd parser (no FreeCAD installation needed).
            const { fcStdNativeParserEngine } = await import(
              "../../engines/FCStdNativeParserEngine.js"
            );
            result = await fcStdNativeParserEngine.parse(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "f3d_parse": {
            // U-CGT02 â€” Fusion 360 native .f3d parser (ZIP+SQLite, no Fusion install).
            const { f3dSqliteParserEngine } = await import(
              "../../engines/F3DSQLiteParserEngine.js"
            );
            result = await f3dSqliteParserEngine.parse(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "f3z_parse": {
            // U-CGT02 â€” Fusion 360 .f3z multi-document archive (returns array).
            const { f3dSqliteParserEngine } = await import(
              "../../engines/F3DSQLiteParserEngine.js"
            );
            const arr = await f3dSqliteParserEngine.parseF3Z(
              String(params["filePath"] ?? ""),
            );
            result = { count: arr.length, documents: arr };
            break;
          }
          case "dim_signature_extract": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            result = await dimensionalSignatureEngine.extractFromStep(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "dim_signature_extract_text": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            result = dimensionalSignatureEngine.extractFromStepText(
              String(params["stepText"] ?? ""),
              String(params["sourceFile"] ?? ""),
            );
            break;
          }
          case "dim_signature_compare": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            try {
              result = dimensionalSignatureEngine.compare(
                params["a"] as Parameters<typeof dimensionalSignatureEngine.compare>[0],
                params["b"] as Parameters<typeof dimensionalSignatureEngine.compare>[1],
              );
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "dim_signature_validate": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            result = dimensionalSignatureEngine.validate(params["candidate"]);
            break;
          }
          case "dim_signature_recompute": {
            const { dimensionalSignatureEngine } = await import(
              "../../engines/DimensionalSignatureEngine.js"
            );
            try {
              const sig = dimensionalSignatureEngine.recomputeSignature(
                params["signature"] as Parameters<typeof dimensionalSignatureEngine.recomputeSignature>[0],
              );
              result = { signature: sig };
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "gt_registry_build_index": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            const stats = groundTruthRegistryEngine.buildIndex(
              String(params["outputRoot"] ?? ""),
              { includeNonOk: params["includeNonOk"] === true },
            );
            result = { stats, total: groundTruthRegistryEngine.size() };
            break;
          }
          case "gt_registry_find_file_id": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = groundTruthRegistryEngine.findByFileId(
              String(params["fileId"] ?? ""),
            );
            break;
          }
          case "gt_registry_find_customer": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = groundTruthRegistryEngine.findByCustomer(
              String(params["name"] ?? ""),
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.findByCustomer>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_find_machine": {
            const { groundTruthRegistryEngine, MACHINE_CATEGORIES } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            const cat = params["category"] as (typeof MACHINE_CATEGORIES)[number];
            result = groundTruthRegistryEngine.findByMachineCategory(
              cat,
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.findByMachineCategory>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_find_complexity": {
            const { groundTruthRegistryEngine, COMPLEXITY_TIERS } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            const tier = params["tier"] as (typeof COMPLEXITY_TIERS)[number];
            result = groundTruthRegistryEngine.findByComplexity(
              tier,
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.findByComplexity>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_find_format": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = groundTruthRegistryEngine.findByFormat(
              String(params["format"] ?? ""),
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.findByFormat>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_query": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = groundTruthRegistryEngine.query(
              (params["filter"] as Parameters<typeof groundTruthRegistryEngine.query>[0]) ?? {},
              (params["options"] as Parameters<typeof groundTruthRegistryEngine.query>[1]) ?? {},
            );
            break;
          }
          case "gt_registry_stats": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = {
              size: groundTruthRegistryEngine.size(),
              stats: groundTruthRegistryEngine.getStats(),
            };
            break;
          }
          case "gt_registry_dump": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            await groundTruthRegistryEngine.dumpManifest(
              String(params["filePath"] ?? ""),
            );
            result = { ok: true, filePath: String(params["filePath"] ?? "") };
            break;
          }
          case "gt_registry_load": {
            const { groundTruthRegistryEngine } = await import(
              "../../engines/GroundTruthRegistryEngine.js"
            );
            result = await groundTruthRegistryEngine.loadManifest(
              String(params["filePath"] ?? ""),
            );
            break;
          }
          case "gt_validate_bundle": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            result = groundTruthValidationEngine.validateBundle(
              String(params["bundleDir"] ?? ""),
              String(params["fileId"] ?? ""),
              {
                skipScreenshots: params["skipScreenshots"] === true,
                quarantineFailedStatus:
                  params["quarantineFailedStatus"] === undefined
                    ? true
                    : params["quarantineFailedStatus"] === true,
                quarantinePartialStatus:
                  params["quarantinePartialStatus"] === true,
              },
            );
            break;
          }
          case "gt_validate_corpus": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            result = groundTruthValidationEngine.validateCorpus(
              String(params["outputRoot"] ?? ""),
              {
                skipScreenshots: params["skipScreenshots"] === true,
                quarantineFailedStatus:
                  params["quarantineFailedStatus"] === undefined
                    ? true
                    : params["quarantineFailedStatus"] === true,
                quarantinePartialStatus:
                  params["quarantinePartialStatus"] === true,
                ...(typeof params["limit"] === "number"
                  ? { limit: params["limit"] as number }
                  : {}),
              },
            );
            break;
          }
          case "gt_export_quarantine": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            await groundTruthValidationEngine.exportQuarantine(
              params["report"] as Parameters<typeof groundTruthValidationEngine.exportQuarantine>[0],
              String(params["filePath"] ?? ""),
            );
            result = { ok: true, filePath: String(params["filePath"] ?? "") };
            break;
          }
          case "gt_validate_report": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            result = groundTruthValidationEngine.validate(params["candidate"]);
            break;
          }
          case "gt_list_issue_codes": {
            const { groundTruthValidationEngine } = await import(
              "../../engines/GroundTruthValidationEngine.js"
            );
            const codes = groundTruthValidationEngine.listIssueCodes();
            result = { count: codes.length, codes };
            break;
          }
          case "universal_cad_index": {
            // U-CADC01 â€” Run full corpus scan; persist master-index.json by default.
            const { universalCADIndexEngine } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            const indexOpts: Record<string, unknown> = {};
            if (Array.isArray(params["rootPaths"])) indexOpts["rootPaths"] = params["rootPaths"];
            if (typeof params["outputPath"] === "string") indexOpts["outputPath"] = params["outputPath"];
            if (Array.isArray(params["extensions"])) indexOpts["extensions"] = params["extensions"];
            if (typeof params["maxDepth"] === "number") indexOpts["maxDepth"] = params["maxDepth"];
            if (typeof params["persist"] === "boolean") indexOpts["persist"] = params["persist"];
            result = await universalCADIndexEngine.index(
              indexOpts as Parameters<typeof universalCADIndexEngine.index>[0],
            );
            break;
          }
          case "universal_cad_load": {
            const { universalCADIndexEngine } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            const loaded = universalCADIndexEngine.load(
              typeof params["outputPath"] === "string"
                ? (params["outputPath"] as string)
                : undefined,
            );
            result = loaded ?? { error: "master index not found or invalid" };
            break;
          }
          case "universal_cad_coverage": {
            const { universalCADIndexEngine } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            try {
              result = universalCADIndexEngine.computeCoverage(
                params["index"] as Parameters<typeof universalCADIndexEngine.computeCoverage>[0],
              );
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "universal_cad_has_coverage": {
            const { universalCADIndexEngine } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            try {
              const ok = universalCADIndexEngine.hasUniversalCoverage(
                params["index"] as Parameters<typeof universalCADIndexEngine.hasUniversalCoverage>[0],
                typeof params["minCoveragePct"] === "number"
                  ? (params["minCoveragePct"] as number)
                  : 1.0,
              );
              result = { hasCoverage: ok };
            } catch (err) {
              result = { error: (err as Error).message ?? String(err) };
            }
            break;
          }
          case "universal_cad_target_formats": {
            const { TARGET_CAD_FORMATS } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            result = { count: TARGET_CAD_FORMATS.length, formats: TARGET_CAD_FORMATS };
            break;
          }
          case "universal_cad_root_paths": {
            const { UNIVERSAL_ROOT_PATHS } = await import(
              "../../engines/UniversalCADIndexEngine.js"
            );
            result = { count: UNIVERSAL_ROOT_PATHS.length, paths: UNIVERSAL_ROOT_PATHS };
            break;
          }
          // U-CGT06 â€” CADScreenshotCapturer wiring
          case "screenshot_capture_views": {
            const { cadScreenshotCapturer } = await import(
              "../../engines/CADScreenshotCapturer.js"
            );
            result = await cadScreenshotCapturer.captureViews(
              String(params["stepPath"] ?? ""),
              {
                fileId: String(params["fileId"] ?? ""),
                outputRoot: String(params["outputRoot"] ?? ""),
                views: params["views"] as readonly string[] | undefined,
                overwrite: params["overwrite"] as boolean | undefined,
                forceMock: params["forceMock"] as boolean | undefined,
              } as never,
            );
            break;
          }
          case "screenshot_list_views": {
            const { cadScreenshotCapturer } = await import(
              "../../engines/CADScreenshotCapturer.js"
            );
            result = { views: cadScreenshotCapturer.listCanonicalViews() };
            break;
          }
          case "screenshot_validate": {
            const { cadScreenshotCapturer } = await import(
              "../../engines/CADScreenshotCapturer.js"
            );
            result = cadScreenshotCapturer.validate(params["candidate"]);
            break;
          }
          case "screenshot_recompute_signature": {
            const { cadScreenshotCapturer } = await import(
              "../../engines/CADScreenshotCapturer.js"
            );
            result = {
              signature: cadScreenshotCapturer.recomputeSignature(
                params["result"] as never,
              ),
            };
            break;
          }
          // U-CGT07 â€” GroundTruthBatchExtractor wiring
          case "batch_extract": {
            const { groundTruthBatchExtractor } = await import(
              "../../engines/GroundTruthBatchExtractor.js"
            );
            result = await groundTruthBatchExtractor.extractBatch(
              params["tasks"] as never,
              {
                outputRoot: String(params["outputRoot"] ?? ""),
                runId: params["runId"] as string | undefined,
                maxConcurrency: params["maxConcurrency"] as number | undefined,
                checkpointEvery: params["checkpointEvery"] as number | undefined,
                skipExisting: params["skipExisting"] as boolean | undefined,
                force: params["force"] as boolean | undefined,
              } as never,
            );
            break;
          }
          case "batch_coverage_report": {
            const { groundTruthBatchExtractor } = await import(
              "../../engines/GroundTruthBatchExtractor.js"
            );
            result = groundTruthBatchExtractor.generateCoverageReport(
              params["results"] as never,
            );
            break;
          }
          case "batch_validate": {
            const { groundTruthBatchExtractor } = await import(
              "../../engines/GroundTruthBatchExtractor.js"
            );
            result = groundTruthBatchExtractor.validate(params["candidate"]);
            break;
          }
          // ── CAD-UNIVERSAL-CONTROL-MS0/U-CUC10: CAD knowledge graph via CADKnowledgeGraphEngine ──
          case "cad_graph_build": {
            const { cadKnowledgeGraphEngine: engine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const operations = params["operations"] as Array<Record<string, unknown>>;
            if (!Array.isArray(operations) || operations.length === 0) {
              throw new Error("cad_graph_build requires non-empty 'operations' array");
            }
            const graph = engine.build(operations as unknown as Parameters<typeof engine.build>[0]);
            result = {
              node_count: graph.nodes.length,
              edge_count: graph.edges.length,
              nodes: graph.nodes,
              edges: graph.edges,
              source: "CADKnowledgeGraphEngine.build",
            };
            break;
          }
          case "cad_graph_detect_cycles": {
            const { cadKnowledgeGraphEngine: engine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_detect_cycles requires 'graph' with nodes and edges arrays");
            }
            const report = engine.detectCycles(graph as Parameters<typeof engine.detectCycles>[0]);
            result = {
              ...report,
              source: "CADKnowledgeGraphEngine.detectCycles",
            };
            break;
          }
          case "cad_graph_find_orphans": {
            const { cadKnowledgeGraphEngine: engine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_find_orphans requires 'graph' with nodes and edges arrays");
            }
            const report = engine.findOrphans(graph as Parameters<typeof engine.findOrphans>[0]);
            result = {
              ...report,
              source: "CADKnowledgeGraphEngine.findOrphans",
            };
            break;
          }
          case "cad_graph_ancestors": {
            const { cadKnowledgeGraphEngine: engine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            const nodeId = params["node_id"] as string;
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_ancestors requires 'graph' with nodes and edges arrays");
            }
            if (typeof nodeId !== "string" || nodeId.length === 0) {
              throw new Error("cad_graph_ancestors requires non-empty 'node_id' string");
            }
            const ancestors = engine.ancestors(graph as Parameters<typeof engine.ancestors>[0], nodeId);
            result = {
              node_id: nodeId,
              ancestors,
              count: ancestors.length,
              source: "CADKnowledgeGraphEngine.ancestors",
            };
            break;
          }
          case "cad_graph_descendants": {
            const { cadKnowledgeGraphEngine: engine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            const nodeId = params["node_id"] as string;
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_descendants requires 'graph' with nodes and edges arrays");
            }
            if (typeof nodeId !== "string" || nodeId.length === 0) {
              throw new Error("cad_graph_descendants requires non-empty 'node_id' string");
            }
            const descendants = engine.descendants(graph as Parameters<typeof engine.descendants>[0], nodeId);
            result = {
              node_id: nodeId,
              descendants,
              count: descendants.length,
              source: "CADKnowledgeGraphEngine.descendants",
            };
            break;
          }
          case "cad_graph_to_jsonld": {
            const { cadKnowledgeGraphEngine: engine } = await import("../../engines/CADKnowledgeGraphEngine.js");
            const graph = params["graph"] as { nodes: unknown[]; edges: unknown[] };
            if (!graph || !Array.isArray(graph.nodes) || !Array.isArray(graph.edges)) {
              throw new Error("cad_graph_to_jsonld requires 'graph' with nodes and edges arrays");
            }
            const jsonld = engine.toJsonLd(graph as Parameters<typeof engine.toJsonLd>[0]);
            result = {
              ...jsonld,
              source: "CADKnowledgeGraphEngine.toJsonLd",
            };
            break;
          }
          case "cad_assembly_add_node": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            const componentType = params["component_type"] as string;
            if (!partId) {
              throw new Error("cad_assembly_add_node requires 'part_id' string");
            }
            const node = engine.addNode({
              partId,
              componentType: componentType as Parameters<typeof engine.addNode>[0]["componentType"],
              name: (params["name"] as string) || partId,
              paths: (params["paths"] as string[]) || [],
              contentHash: params["content_hash"] as string | undefined,
              tags: (params["tags"] as string[]) || [],
              customer: (params["customer"] as string) || "UNKNOWN",
            });
            engine.persist();
            result = { node, source: "CADAssemblyGraphEngine.addNode" };
            break;
          }
          case "cad_assembly_add_ref": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const parentId = params["parent_id"] as string;
            const childId = params["child_id"] as string;
            if (!parentId || !childId) {
              throw new Error("cad_assembly_add_ref requires 'parent_id' and 'child_id' strings");
            }
            const ref = engine.addReference({
              parentId,
              childId,
              instanceName: params["instance_name"] as string | undefined,
              childContentHash: params["child_content_hash"] as string | undefined,
            });
            engine.persist();
            result = { reference: ref, source: "CADAssemblyGraphEngine.addReference" };
            break;
          }
          case "cad_assembly_remove_node": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_remove_node requires 'part_id' string");
            }
            const removed = engine.removeNode(partId);
            engine.persist();
            result = { removed, partId, source: "CADAssemblyGraphEngine.removeNode" };
            break;
          }
          case "cad_assembly_get_children": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_get_children requires 'part_id' string");
            }
            const children = engine.getChildren(partId);
            result = { children, count: children.length, source: "CADAssemblyGraphEngine.getChildren" };
            break;
          }
          case "cad_assembly_get_parents": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_get_parents requires 'part_id' string");
            }
            const parents = engine.getParents(partId);
            result = { parents, count: parents.length, source: "CADAssemblyGraphEngine.getParents" };
            break;
          }
          case "cad_assembly_descendants": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_descendants requires 'part_id' string");
            }
            const maxDepth = (params["max_depth"] as number) || 64;
            const descendants = engine.getDescendants(partId, maxDepth);
            result = { descendants, count: descendants.length, source: "CADAssemblyGraphEngine.getDescendants" };
            break;
          }
          case "cad_assembly_ancestors": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_ancestors requires 'part_id' string");
            }
            const maxDepth = (params["max_depth"] as number) || 64;
            const ancestors = engine.getAncestors(partId, maxDepth);
            result = { ancestors, count: ancestors.length, source: "CADAssemblyGraphEngine.getAncestors" };
            break;
          }
          case "cad_assembly_broken_refs": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const broken = engine.findBrokenReferences();
            result = { broken, count: broken.length, source: "CADAssemblyGraphEngine.findBrokenReferences" };
            break;
          }
          case "cad_assembly_heal": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const healedCount = engine.healByContentHash();
            engine.persist();
            result = { healedCount, source: "CADAssemblyGraphEngine.healByContentHash" };
            break;
          }
          case "cad_assembly_detect_cycles": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const cycles = engine.detectCycles();
            result = { cycles, hasCycles: cycles.length > 0, count: cycles.length, source: "CADAssemblyGraphEngine.detectCycles" };
            break;
          }
          case "cad_assembly_impact": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const partId = params["part_id"] as string;
            if (!partId) {
              throw new Error("cad_assembly_impact requires 'part_id' string");
            }
            const impact = engine.impactAnalysis(partId);
            result = { ...impact, source: "CADAssemblyGraphEngine.impactAnalysis" };
            break;
          }
          case "cad_assembly_list_nodes": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const nodes = engine.listNodes();
            result = { nodes, count: nodes.length, source: "CADAssemblyGraphEngine.listNodes" };
            break;
          }
          case "cad_assembly_list_edges": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const edges = engine.listEdges();
            result = { edges, count: edges.length, source: "CADAssemblyGraphEngine.listEdges" };
            break;
          }
          case "cad_assembly_snapshot": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            const snapshot = engine.snapshot();
            result = { snapshot, source: "CADAssemblyGraphEngine.snapshot" };
            break;
          }
          case "cad_assembly_load": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            result = { loaded: true, nodeCount: engine.nodeCount, edgeCount: engine.edgeCount, source: "CADAssemblyGraphEngine.load" };
            break;
          }
          case "cad_assembly_persist": {
            const { CADAssemblyGraphEngine } = await import("../../engines/CADAssemblyGraphEngine.js");
            const engine = new CADAssemblyGraphEngine();
            engine.load();
            engine.persist();
            result = { persisted: true, nodeCount: engine.nodeCount, edgeCount: engine.edgeCount, source: "CADAssemblyGraphEngine.persist" };
            break;
          }
          case "cad_cas_load": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            const registry = engine.load();
            result = { registry, entryCount: Object.keys(registry.entries).length, source: "CADContentAddressableStoreEngine.load" };
            break;
          }
          case "cad_cas_persist": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            engine.persist();
            result = { persisted: true, source: "CADContentAddressableStoreEngine.persist" };
            break;
          }
          case "cad_cas_upsert": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_upsert requires 'content_hash' string");
            }
            const absolutePath = params["path"] as string;
            const format = params["format"] as string || ".unknown";
            const sizeBytes = (params["size_bytes"] as number) || 0;
            if (!absolutePath) {
              throw new Error("cad_cas_upsert requires 'path' string (absolute file path)");
            }
            const entry = engine.upsert({
              contentHash,
              absolutePath,
              format,
              sizeBytes,
              source: (params["source"] as "initial_scan" | "intake_queue" | "customer_upload" | "migration_import" | "manual") || "initial_scan",
              customer: (params["customer"] as string) || "UNKNOWN",
              visibility: (params["visibility"] as "private" | "shared" | "public") || "private",
              tags: (params["tags"] as string[]) || [],
              chunks: params["chunks"] as Array<{ offset: number; size: number; blake3: string }> | undefined,
            });
            engine.persist();
            result = { entry, source: "CADContentAddressableStoreEngine.upsert" };
            break;
          }
          case "cad_cas_get": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_get requires 'content_hash' string");
            }
            const entry = engine.get(contentHash);
            result = { entry: entry || null, found: !!entry, source: "CADContentAddressableStoreEngine.get" };
            break;
          }
          case "cad_cas_get_by_path": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const path = params["path"] as string;
            if (!path) {
              throw new Error("cad_cas_get_by_path requires 'path' string");
            }
            const entry = engine.getByPath(path);
            result = { entry: entry || null, found: !!entry, source: "CADContentAddressableStoreEngine.getByPath" };
            break;
          }
          case "cad_cas_ingest": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const fs = await import("fs");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const absolutePath = params["path"] as string;
            if (!absolutePath) {
              throw new Error("cad_cas_ingest requires 'path' string");
            }
            if (!fs.existsSync(absolutePath)) {
              throw new Error(`cad_cas_ingest: file not found: ${absolutePath}`);
            }
            const content = fs.readFileSync(absolutePath);
            const entry = engine.ingest(absolutePath, content, {
              source: (params["source"] as "initial_scan" | "intake_queue" | "customer_upload" | "migration_import" | "manual") || "initial_scan",
              customer: (params["customer"] as string) || "UNKNOWN",
              visibility: (params["visibility"] as "private" | "shared" | "public") || "private",
              tags: (params["tags"] as string[]) || [],
            });
            engine.persist();
            result = { entry, source: "CADContentAddressableStoreEngine.ingest" };
            break;
          }
          case "cad_cas_verify": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const fs = await import("fs");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            const filePath = params["path"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_verify requires 'content_hash' string");
            }
            if (!filePath) {
              throw new Error("cad_cas_verify requires 'path' string to read file content");
            }
            if (!fs.existsSync(filePath)) {
              throw new Error(`cad_cas_verify: file not found: ${filePath}`);
            }
            const content = fs.readFileSync(filePath);
            const verification = engine.verifyIntegrity(contentHash, content);
            engine.persist();
            result = { ...verification, source: "CADContentAddressableStoreEngine.verifyIntegrity" };
            break;
          }
          case "cad_cas_detect_ip_leaks": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const leaks = engine.detectIPLeaks();
            result = { leaks, count: leaks.length, source: "CADContentAddressableStoreEngine.detectIPLeaks" };
            break;
          }
          case "cad_cas_delete": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_cas_delete requires 'content_hash' string");
            }
            const deleted = engine.delete(contentHash);
            engine.persist();
            result = { deleted, contentHash, source: "CADContentAddressableStoreEngine.delete" };
            break;
          }
          case "cad_cas_rebuild_meta": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            engine.load();
            engine.rebuildMeta();
            engine.persist();
            result = { rebuilt: true, source: "CADContentAddressableStoreEngine.rebuildMeta" };
            break;
          }
          case "cad_cas_list": {
            const { CADContentAddressableStoreEngine } = await import("../../engines/CADContentAddressableStoreEngine.js");
            const engine = new CADContentAddressableStoreEngine();
            const registry = engine.load();
            const entries = Object.values(registry.entries);
            result = { entries, count: entries.length, source: "CADContentAddressableStoreEngine.list" };
            break;
          }
          case "cad_index_scan": {
            const { cadFileIndexerEngine } = await import("../../engines/CADFileIndexerEngine.js");
            const rootPaths = params["root_paths"] as string[] | undefined;
            const batchSize = (params["batch_size"] as number) || 500;
            const maxDepth = (params["max_depth"] as number) || 20;
            const outputPath = params["output_path"] as string | undefined;
            const index = await cadFileIndexerEngine.index({
              rootPaths,
              batchSize,
              maxDepth,
              outputPath,
            });
            result = {
              totalFiles: index.files.length,
              schemaVersion: index.schemaVersion,
              generatedAt: index.generatedAt,
              diff: index.lastDiff,
              source: "CADFileIndexerEngine.index",
            };
            break;
          }
          case "cad_index_load": {
            const { cadFileIndexerEngine } = await import("../../engines/CADFileIndexerEngine.js");
            const outputPath = params["output_path"] as string | undefined;
            const index = cadFileIndexerEngine.load(outputPath);
            if (!index) {
              result = { found: false, source: "CADFileIndexerEngine.load" };
            } else {
              result = {
                found: true,
                totalFiles: index.files.length,
                schemaVersion: index.schemaVersion,
                generatedAt: index.generatedAt,
                source: "CADFileIndexerEngine.load",
              };
            }
            break;
          }
          case "cad_index_status": {
            const { cadFileIndexerEngine } = await import("../../engines/CADFileIndexerEngine.js");
            const outputPath = params["output_path"] as string | undefined;
            const index = cadFileIndexerEngine.load(outputPath);
            if (!index) {
              result = {
                indexed: false,
                totalFiles: 0,
                lastUpdated: null,
                source: "CADFileIndexerEngine.status",
              };
            } else {
              // Group by machine category
              const byCategory: Record<string, number> = {};
              const byFormat: Record<string, number> = {};
              const byCustomer: Record<string, number> = {};
              for (const e of index.files) {
                byCategory[e.machineCategory] = (byCategory[e.machineCategory] || 0) + 1;
                byFormat[e.format] = (byFormat[e.format] || 0) + 1;
                byCustomer[e.customer] = (byCustomer[e.customer] || 0) + 1;
              }
              result = {
                indexed: true,
                totalFiles: index.files.length,
                lastUpdated: index.generatedAt,
                byCategory,
                byFormat,
                topCustomers: Object.entries(byCustomer)
                  .sort((a, b) => b[1] - a[1])
                  .slice(0, 10)
                  .map(([name, count]) => ({ name, count })),
                source: "CADFileIndexerEngine.status",
              };
            }
            break;
          }
          case "cad_drawing_parse": {
            const { cadDrawingNumberNormalizerEngine } = await import("../../engines/CADDrawingNumberNormalizerEngine.js");
            const rawNumber = params["raw"] as string;
            if (!rawNumber) {
              throw new Error("cad_drawing_parse requires 'raw' string");
            }
            const parsed = cadDrawingNumberNormalizerEngine.parse(rawNumber);
            result = { ...parsed, source: "CADDrawingNumberNormalizerEngine.parse" };
            break;
          }
          case "cad_drawing_fuzzy_find": {
            const { cadDrawingNumberNormalizerEngine } = await import("../../engines/CADDrawingNumberNormalizerEngine.js");
            const rawNumber = params["raw"] as string;
            const maxDistance = (params["max_distance"] as number) || 2;
            if (!rawNumber) {
              throw new Error("cad_drawing_fuzzy_find requires 'raw' string");
            }
            const matches = cadDrawingNumberNormalizerEngine.fuzzyFind(rawNumber, maxDistance);
            result = { matches, count: matches.length, source: "CADDrawingNumberNormalizerEngine.fuzzyFind" };
            break;
          }
          case "cad_drawing_get_family": {
            const { cadDrawingNumberNormalizerEngine } = await import("../../engines/CADDrawingNumberNormalizerEngine.js");
            const familyKey = params["family_key"] as string;
            if (!familyKey) {
              throw new Error("cad_drawing_get_family requires 'family_key' string");
            }
            const family = cadDrawingNumberNormalizerEngine.getFamily(familyKey);
            result = { family: family || null, found: !!family, source: "CADDrawingNumberNormalizerEngine.getFamily" };
            break;
          }
          case "cad_drawing_index_size": {
            const { cadDrawingNumberNormalizerEngine } = await import("../../engines/CADDrawingNumberNormalizerEngine.js");
            result = { size: cadDrawingNumberNormalizerEngine.size, source: "CADDrawingNumberNormalizerEngine.size" };
            break;
          }
          case "cad_classify_run": {
            const { cadFileClassifierEngine } = await import("../../engines/CADFileClassifierEngine.js");
            const { cadFileIndexerEngine } = await import("../../engines/CADFileIndexerEngine.js");
            const indexPath = params["index_path"] as string | undefined;
            const includeClassifications = (params["include_classifications"] as boolean) ?? true;
            const index = cadFileIndexerEngine.load(indexPath);
            if (!index) {
              result = { success: false, error: "No index found. Run cad_index_scan first.", source: "CADFileClassifierEngine" };
            } else {
              const summary = cadFileClassifierEngine.classify(index.files, { includeClassifications });
              result = { success: true, ...summary, source: "CADFileClassifierEngine.classify" };
            }
            break;
          }
          case "cad_classify_one": {
            const { cadFileClassifierEngine } = await import("../../engines/CADFileClassifierEngine.js");
            const format = params["format"] as string;
            if (!format) {
              throw new Error("cad_classify_one requires 'format' string (e.g. '.sldprt')");
            }
            const classification = cadFileClassifierEngine.classifyOne(format);
            result = { ...classification, source: "CADFileClassifierEngine.classifyOne" };
            break;
          }
          case "cad_classify_format": {
            const { classifyFormat } = await import("../../engines/CADFileClassifierEngine.js");
            const format = params["format"] as string;
            if (!format) {
              throw new Error("cad_classify_format requires 'format' string (e.g. '.step')");
            }
            const profile = classifyFormat(format);
            result = { ...profile, source: "CADFileClassifierEngine.classifyFormat" };
            break;
          }
          case "cad_taxonomy_get": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const operationId = params["operation_id"] as string;
            if (!operationId) {
              throw new Error("cad_taxonomy_get requires 'operation_id' string");
            }
            const op = cadOperationTaxonomyEngine.getOperation(operationId);
            result = { operation: op, found: !!op, source: "CADOperationTaxonomyEngine.getOperation" };
            break;
          }
          case "cad_taxonomy_list": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const operations = cadOperationTaxonomyEngine.getAllOperations();
            result = { operations, count: operations.length, source: "CADOperationTaxonomyEngine.getAllOperations" };
            break;
          }
          case "cad_taxonomy_aerospace": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const operations = cadOperationTaxonomyEngine.getAerospaceOperations();
            result = { operations, count: operations.length, source: "CADOperationTaxonomyEngine.getAerospaceOperations" };
            break;
          }
          case "cad_taxonomy_by_category": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const category = params["category"] as string;
            if (!category) {
              throw new Error("cad_taxonomy_by_category requires 'category' string");
            }
            const operations = cadOperationTaxonomyEngine.getByCategory(category as Parameters<typeof cadOperationTaxonomyEngine.getByCategory>[0]);
            result = { operations, count: operations.length, category, source: "CADOperationTaxonomyEngine.getByCategory" };
            break;
          }
          case "cad_taxonomy_by_system": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const system = params["system"] as string;
            if (!system) {
              throw new Error("cad_taxonomy_by_system requires 'system' string (e.g. 'fusion360', 'solidworks')");
            }
            const operations = cadOperationTaxonomyEngine.getBySupportedSystem(system as Parameters<typeof cadOperationTaxonomyEngine.getBySupportedSystem>[0]);
            result = { operations, count: operations.length, system, source: "CADOperationTaxonomyEngine.getBySupportedSystem" };
            break;
          }
          case "cad_taxonomy_search": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const query = params["query"] as string;
            if (!query) {
              throw new Error("cad_taxonomy_search requires 'query' string");
            }
            const results = cadOperationTaxonomyEngine.search(query);
            result = { results, count: results.length, query, source: "CADOperationTaxonomyEngine.search" };
            break;
          }
          case "cad_taxonomy_compatibility": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const operationId = params["operation_id"] as string;
            const system = params["system"] as string;
            if (!operationId || !system) {
              throw new Error("cad_taxonomy_compatibility requires 'operation_id' and 'system' strings");
            }
            const report = cadOperationTaxonomyEngine.checkCompatibility(operationId, system as Parameters<typeof cadOperationTaxonomyEngine.checkCompatibility>[1]);
            result = { ...report, source: "CADOperationTaxonomyEngine.checkCompatibility" };
            break;
          }
          case "cad_taxonomy_stats": {
            const { cadOperationTaxonomyEngine } = await import("../../engines/CADOperationTaxonomyEngine.js");
            const stats = cadOperationTaxonomyEngine.getStats();
            result = { ...stats, source: "CADOperationTaxonomyEngine.getStats" };
            break;
          }
          case "cad_geometry_compare": {
            const { cadGeometryComparisonEngine } = await import("../../engines/CADGeometryComparisonEngine.js");
            const originalPath = params["original_path"] as string;
            const generatedPath = params["generated_path"] as string;
            const thresholds = params["thresholds"] as Record<string, number> | undefined;
            if (!originalPath || !generatedPath) {
              throw new Error("cad_geometry_compare requires 'original_path' and 'generated_path' strings");
            }
            const comparison = cadGeometryComparisonEngine.compare(originalPath, generatedPath, thresholds);
            result = { ...comparison, source: "CADGeometryComparisonEngine.compare" };
            break;
          }
          case "cad_geometry_extract": {
            const { cadGeometryComparisonEngine } = await import("../../engines/CADGeometryComparisonEngine.js");
            const filePath = params["file_path"] as string;
            if (!filePath) {
              throw new Error("cad_geometry_extract requires 'file_path' string");
            }
            const metrics = cadGeometryComparisonEngine.extractMetrics(filePath);
            result = { ...metrics, source: "CADGeometryComparisonEngine.extractMetrics" };
            break;
          }
          case "cad_geometry_thresholds_get": {
            const { cadGeometryComparisonEngine } = await import("../../engines/CADGeometryComparisonEngine.js");
            const thresholds = cadGeometryComparisonEngine.getThresholds();
            result = { thresholds, source: "CADGeometryComparisonEngine.getThresholds" };
            break;
          }
          case "cad_geometry_thresholds_set": {
            const { cadGeometryComparisonEngine } = await import("../../engines/CADGeometryComparisonEngine.js");
            const thresholds = params["thresholds"] as Record<string, number>;
            if (!thresholds || typeof thresholds !== "object") {
              throw new Error("cad_geometry_thresholds_set requires 'thresholds' object");
            }
            const updated = cadGeometryComparisonEngine.setThresholds(thresholds);
            result = { thresholds: updated, source: "CADGeometryComparisonEngine.setThresholds" };
            break;
          }
          case "cad_accuracy_validate": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            if (!code) {
              throw new Error("cad_accuracy_validate requires 'code' string (CAD code to validate)");
            }
            const input = {
              partId: params["part_id"] as string | undefined,
              code,
              expectedDimensions: params["expected_dimensions"] as Array<{name: string; nominal: number; tolerance: {plus: number; minus: number}; unit: "mm" | "inch"}> | undefined,
              expectedFeatures: params["expected_features"] as Array<{type: string; params: Record<string, number>}> | undefined,
              material: params["material"] as string | undefined,
              customer: params["customer"] as string | undefined,
              strictMode: params["strict_mode"] as boolean | undefined,
            };
            const report = await cadAccuracyValidatorEngine.validateAccuracy(input);
            result = { ...report, source: "CADAccuracyValidatorEngine.validateAccuracy" };
            break;
          }
          case "cad_accuracy_dimensional": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            const specs = (params["specs"] as Array<{name: string; nominal: number; tolerance: {plus: number; minus: number}; unit: "mm" | "inch"}>) || [];
            if (!code) {
              throw new Error("cad_accuracy_dimensional requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateDimensional(code, specs);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateDimensional" };
            break;
          }
          case "cad_accuracy_topology": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            if (!code) {
              throw new Error("cad_accuracy_topology requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateTopology(code);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateTopology" };
            break;
          }
          case "cad_accuracy_dfm": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            const material = params["material"] as string | undefined;
            if (!code) {
              throw new Error("cad_accuracy_dfm requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateDFM(code, material);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateDFM" };
            break;
          }
          case "cad_accuracy_tolerance": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            const specs = (params["specs"] as Array<{name: string; nominal: number; tolerance: {plus: number; minus: number}; unit: "mm" | "inch"}>) || [];
            if (!code) {
              throw new Error("cad_accuracy_tolerance requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateTolerance(code, specs);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateTolerance" };
            break;
          }
          case "cad_accuracy_features": {
            const { cadAccuracyValidatorEngine } = await import("../../engines/CADAccuracyValidatorEngine.js");
            const code = params["code"] as string;
            const expectedFeatures = (params["expected_features"] as Array<{type: string; params: Record<string, number>}>) || [];
            if (!code) {
              throw new Error("cad_accuracy_features requires 'code' string");
            }
            const layer = cadAccuracyValidatorEngine.validateFeatures(code, expectedFeatures);
            result = { ...layer, source: "CADAccuracyValidatorEngine.validateFeatures" };
            break;
          }
          case "cad_search_index": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            const doc = params["document"] as {
              id: string;
              canonicalName: string;
              description?: string;
              text?: string;
              embedding?: number[];
              perceptualHash?: string;
              spec: {
                material?: string;
                finish?: string;
                customer?: string;
                tags: string[];
                numericSpecs: Record<string, number>;
              };
            };
            if (!doc || !doc.id || !doc.canonicalName) {
              throw new Error("cad_search_index requires 'document' with id, canonicalName, and spec fields");
            }
            const indexed = cadSearchUniversalEngine.index({
              ...doc,
              description: doc.description ?? doc.text ?? "",
            });
            result = { indexed, size: cadSearchUniversalEngine.size, source: "CADSearchUniversalEngine.index" };
            break;
          }
          case "cad_search_query": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            const query = params["query"] as {
              mode?: "full_text" | "semantic" | "visual" | "spec" | "tolerance" | "natural_language" | "unified";
              text?: string;
              embedding?: number[];
              perceptualHash?: string;
              specFilter?: { material?: string; finish?: string; customer?: string; tags?: string[] };
              toleranceRanges?: Array<{ key: string; min?: number; max?: number }>;
              naturalLanguage?: string;
              limit?: number;
            };
            if (!query) {
              throw new Error("cad_search_query requires 'query' object");
            }
            const results = cadSearchUniversalEngine.search(query);
            result = { results, count: results.length, source: "CADSearchUniversalEngine.search" };
            break;
          }
          case "cad_search_get": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            const id = params["id"] as string;
            if (!id) {
              throw new Error("cad_search_get requires 'id' string");
            }
            const doc = cadSearchUniversalEngine.get(id);
            result = { document: doc, found: !!doc, source: "CADSearchUniversalEngine.get" };
            break;
          }
          case "cad_search_remove": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            const id = params["id"] as string;
            if (!id) {
              throw new Error("cad_search_remove requires 'id' string");
            }
            const removed = cadSearchUniversalEngine.remove(id);
            result = { removed, size: cadSearchUniversalEngine.size, source: "CADSearchUniversalEngine.remove" };
            break;
          }
          case "cad_search_clear": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            cadSearchUniversalEngine.clear();
            result = { cleared: true, size: cadSearchUniversalEngine.size, source: "CADSearchUniversalEngine.clear" };
            break;
          }
          case "cad_search_stats": {
            const { cadSearchUniversalEngine } = await import("../../engines/CADSearchUniversalEngine.js");
            result = { size: cadSearchUniversalEngine.size, source: "CADSearchUniversalEngine.stats" };
            break;
          }
          case "cad_revision_detect": {
            const { cadRevisionDetectorEngine } = await import("../../engines/CADRevisionDetectorEngine.js");
            const filename = params["filename"] as string;
            if (!filename) {
              throw new Error("cad_revision_detect requires 'filename' string");
            }
            const tag = cadRevisionDetectorEngine.detect(filename);
            result = { ...tag, source: "CADRevisionDetectorEngine.detect" };
            break;
          }
          case "cad_revision_group": {
            const { cadRevisionDetectorEngine } = await import("../../engines/CADRevisionDetectorEngine.js");
            const filenames = params["filenames"] as string[];
            if (!filenames || !Array.isArray(filenames)) {
              throw new Error("cad_revision_group requires 'filenames' string array");
            }
            const groups = cadRevisionDetectorEngine.group(filenames);
            result = { groups, count: groups.length, source: "CADRevisionDetectorEngine.group" };
            break;
          }
          case "cad_reasoning_generate": {
            const { cadReasoningChainEngine } = await import("../../engines/CADReasoningChainEngine.js");
            const input = params["input"] as {
              description: string;
              constraints?: string[];
              material?: string;
              targetSystem?: string;
              verbosity?: "minimal" | "standard" | "verbose";
            };
            if (!input || !input.description) {
              throw new Error("cad_reasoning_generate requires 'input' with description");
            }
            const output = await cadReasoningChainEngine.generateWithReasoning(
              input as unknown as Parameters<typeof cadReasoningChainEngine.generateWithReasoning>[0],
            );
            result = { ...output, source: "CADReasoningChainEngine.generateWithReasoning" };
            break;
          }
          case "cad_reasoning_why": {
            const { cadReasoningChainEngine } = await import("../../engines/CADReasoningChainEngine.js");
            const chainId = params["chain_id"] as string;
            const query = params["query"] as string;
            if (!chainId || !query) {
              throw new Error("cad_reasoning_why requires 'chain_id' and 'query' strings");
            }
            const answer = cadReasoningChainEngine.queryWhy(chainId, query);
            result = { ...answer, source: "CADReasoningChainEngine.queryWhy" };
            break;
          }
          case "cad_reasoning_get": {
            const { cadReasoningChainEngine } = await import("../../engines/CADReasoningChainEngine.js");
            const chainId = params["chain_id"] as string;
            if (!chainId) {
              throw new Error("cad_reasoning_get requires 'chain_id' string");
            }
            const chain = cadReasoningChainEngine.getChain(chainId);
            result = { chain, found: !!chain, source: "CADReasoningChainEngine.getChain" };
            break;
          }
          case "cad_reasoning_list": {
            const { cadReasoningChainEngine } = await import("../../engines/CADReasoningChainEngine.js");
            const limit = (params["limit"] as number) ?? 10;
            const chains = cadReasoningChainEngine.listChains(limit);
            result = { chains, count: chains.length, source: "CADReasoningChainEngine.listChains" };
            break;
          }
          case "cad_visual_diff_features": {
            const { cadVisualDiffEngine } = await import("../../engines/CADVisualDiffEngine.js");
            const before = params["before"] as Array<{
              id: string;
              featureType: string;
              order: number;
              parameters: Record<string, string | number | boolean>;
            }>;
            const after = params["after"] as Array<{
              id: string;
              featureType: string;
              order: number;
              parameters: Record<string, string | number | boolean>;
            }>;
            if (!before || !after) {
              throw new Error("cad_visual_diff_features requires 'before' and 'after' feature arrays");
            }
            const diffs = cadVisualDiffEngine.diffFeatureTrees(before, after);
            result = { diffs, count: diffs.length, source: "CADVisualDiffEngine.diffFeatureTrees" };
            break;
          }
          case "cad_visual_diff_hashes": {
            const { cadVisualDiffEngine } = await import("../../engines/CADVisualDiffEngine.js");
            const hashA = params["hash_a"] as string;
            const hashB = params["hash_b"] as string;
            if (!hashA || !hashB) {
              throw new Error("cad_visual_diff_hashes requires 'hash_a' and 'hash_b' hex strings");
            }
            const comparison = cadVisualDiffEngine.comparePerceptualHashes(hashA, hashB);
            result = { ...comparison, source: "CADVisualDiffEngine.comparePerceptualHashes" };
            break;
          }
          case "cad_visual_diff_report": {
            const { cadVisualDiffEngine } = await import("../../engines/CADVisualDiffEngine.js");
            const input = params["input"] as {
              drawingNumber: string;
              beforeRevision: string;
              afterRevision: string;
              beforeTree: Array<{
                id: string;
                featureType: string;
                order: number;
                parameters: Record<string, string | number | boolean>;
              }>;
              afterTree: Array<{
                id: string;
                featureType: string;
                order: number;
                parameters: Record<string, string | number | boolean>;
              }>;
              beforePerceptualHash?: string;
              afterPerceptualHash?: string;
            };
            if (!input || !input.drawingNumber || !input.beforeTree || !input.afterTree) {
              throw new Error("cad_visual_diff_report requires 'input' with drawingNumber, beforeTree, afterTree");
            }
            const report = cadVisualDiffEngine.buildReport(input);
            result = { ...report, source: "CADVisualDiffEngine.buildReport" };
            break;
          }
          case "cad_learning_ingest": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const outcome = params["outcome"] as {
              testId: string;
              originalPath: string;
              status: "pass" | "fail" | "error";
              partType?: string;
              features?: string[];
              generator?: string;
              metrics?: Record<string, { passed: boolean; deviationPct?: number }>;
              error?: string;
            };
            if (!outcome || !outcome.testId || !outcome.originalPath) {
              throw new Error("cad_learning_ingest requires 'outcome' with testId, originalPath, status");
            }
            const ingestResult = cadTrialErrorLearningEngine.ingest(outcome);
            result = { ...ingestResult, source: "CADTrialErrorLearningEngine.ingest" };
            break;
          }
          case "cad_learning_ingest_batch": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const outcomes = params["outcomes"] as unknown[];
            if (!outcomes || !Array.isArray(outcomes)) {
              throw new Error("cad_learning_ingest_batch requires 'outcomes' array");
            }
            const batchResult = cadTrialErrorLearningEngine.ingestBatch(outcomes);
            result = { ...batchResult, source: "CADTrialErrorLearningEngine.ingestBatch" };
            break;
          }
          case "cad_learning_patterns": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const patterns = cadTrialErrorLearningEngine.extractPatterns();
            result = { patterns, count: patterns.length, source: "CADTrialErrorLearningEngine.extractPatterns" };
            break;
          }
          case "cad_learning_recommend": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const candidate = params["candidate"] as {
              partType?: string;
              features?: string[];
              generator?: string;
            } | undefined;
            // Knowledge-injection arm (U-CAD-LEARN-TRIBAL-INJECT): wire the CAD tribal
            // corpus via CADTribalDrawInjectionEngine so risk recommendations surface
            // the operator's curated lessons. disable_tribal skips it; tribal_corpus overrides.
            const tribalProvider = params["disable_tribal"]
              ? undefined
              : await buildCadTribalProvider(params["tribal_corpus"] as unknown[] | undefined);
            const recommendation = cadTrialErrorLearningEngine.recommendAdjustments(candidate ?? {}, {
              tribalProvider,
              // Closed-loop self-calibration (U-CAD-LEARN-CALIBRATE): recalibrate the raw
              // aggregate risk toward the realized failure rate. No-op until >=
              // MIN_EFFICACY_SAMPLES scored recs exist, so empty/thin ledgers are unchanged.
              calibrate: params["disable_calibrate"] ? false : true,
            });
            result = { ...recommendation, source: "CADTrialErrorLearningEngine.recommendAdjustments" };
            break;
          }
          case "cad_learning_stats": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const opts = {
              since: params["since"] as string | undefined,
              partType: params["part_type"] as string | undefined,
            };
            const stats = cadTrialErrorLearningEngine.getFailureStats(opts);
            result = { ...stats, source: "CADTrialErrorLearningEngine.getFailureStats" };
            break;
          }
          case "cad_learning_reset": {
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const eraseLedger = params["erase_ledger"] as boolean | undefined;
            cadTrialErrorLearningEngine.reset({ eraseLedger: eraseLedger ?? false });
            result = { reset: true, erasedLedger: eraseLedger ?? false, source: "CADTrialErrorLearningEngine.reset" };
            break;
          }
          case "cad_learning_trend": {
            // Loop-health: is the CAD failure rate dropping as the corpus grows?
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const trend = cadTrialErrorLearningEngine.getLearningTrend();
            result = { ...trend, source: "CADTrialErrorLearningEngine.getLearningTrend" };
            break;
          }
          case "cad_learning_record_recommendation": {
            // Closed-loop: issue + persist a recommendation so a later outcome
            // (ingested with this recommendationId) can be attributed back to it.
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const candidate = params["candidate"] as {
              partType?: string;
              features?: string[];
              generator?: string;
            } | undefined;
            const recommendationId = params["recommendation_id"] as string | undefined;
            // Same knowledge-injection arm as cad_learning_recommend; the injected
            // tribalTipCount is persisted on the recommendation record (U-CAD-LEARN-TRIBAL-INJECT).
            const tribalProvider = params["disable_tribal"]
              ? undefined
              : await buildCadTribalProvider(params["tribal_corpus"] as unknown[] | undefined);
            const recorded = cadTrialErrorLearningEngine.recordRecommendation(candidate ?? {}, {
              ...(recommendationId ? { recommendationId } : {}),
              tribalProvider,
              // getLoopEfficacy's Brier then measures the CALIBRATED predictions vs reality, while
              // the shift basis is the separately-persisted RAW prediction -- so the loop converges
              // on the realized rate as scored data grows, not a biased fixed point (U-CAD-LEARN-CALIBRATE).
              calibrate: params["disable_calibrate"] ? false : true,
            });
            result = { ...recorded, source: "CADTrialErrorLearningEngine.recordRecommendation" };
            break;
          }
          case "cad_learning_efficacy": {
            // Closed-loop retrain signal: predicted-vs-realized + recommendation lift.
            const { cadTrialErrorLearningEngine } = await import("../../engines/CADTrialErrorLearningEngine.js");
            const efficacy = cadTrialErrorLearningEngine.getLoopEfficacy();
            result = { ...efficacy, source: "CADTrialErrorLearningEngine.getLoopEfficacy" };
            break;
          }
          case "cad_rag_filter": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const corpus = params["corpus"] as Array<{
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: "lathe" | "mill" | "wire_edm" | "sinker_edm" | "hurco" | "hypermill" | "unknown";
              features?: string[];
            }>;
            const filters = params["filters"] as {
              customer?: string | string[];
              machineCategory?: string | string[];
              features?: string[];
              excludeIds?: string[];
            } | undefined;
            if (!corpus || !Array.isArray(corpus)) {
              throw new Error("cad_rag_filter requires 'corpus' array");
            }
            const filtered = cadRetrievalAugmentationEngine.filterCorpus(
              corpus as unknown as Parameters<typeof cadRetrievalAugmentationEngine.filterCorpus>[0],
              (filters ?? {}) as unknown as Parameters<typeof cadRetrievalAugmentationEngine.filterCorpus>[1],
            );
            result = { filtered, count: filtered.length, source: "CADRetrievalAugmentationEngine.filterCorpus" };
            break;
          }
          case "cad_rag_retrieve": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const query = params["query"] as {
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: "lathe" | "mill" | "wire_edm" | "sinker_edm" | "hurco" | "hypermill" | "unknown";
              features?: string[];
            };
            const corpus = params["corpus"] as Array<{
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: "lathe" | "mill" | "wire_edm" | "sinker_edm" | "hurco" | "hypermill" | "unknown";
              features?: string[];
            }>;
            const backend = (params["backend"] as string) ?? "count_vectorizer";
            const filters = params["filters"] as Record<string, unknown> | undefined;
            const k = (params["k"] as number) ?? 5;
            if (!query || !corpus) {
              throw new Error("cad_rag_retrieve requires 'query' and 'corpus'");
            }
            const results = cadRetrievalAugmentationEngine.retrieve(query, corpus, backend as any, filters as any, k);
            result = { results, count: results.length, source: "CADRetrievalAugmentationEngine.retrieve" };
            break;
          }
          case "cad_rag_format": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const ragResults = params["results"] as Array<{
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: "lathe" | "mill" | "wire_edm" | "sinker_edm" | "hurco" | "hypermill" | "unknown";
              features?: string[];
              distance: number;
              similarity: number;
            }>;
            const format = (params["format"] as string) ?? "json";
            if (!ragResults || !Array.isArray(ragResults)) {
              throw new Error("cad_rag_format requires 'results' array");
            }
            const formatted = cadRetrievalAugmentationEngine.formatExamples(ragResults, format as any);
            result = { ...formatted, source: "CADRetrievalAugmentationEngine.formatExamples" };
            break;
          }
          case "cad_rag_rank": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const ragResults = params["results"] as Array<{
              id: string;
              tokens: number[];
              features?: string[];
              distance: number;
              similarity: number;
            }>;
            const query = params["query"] as {
              id: string;
              tokens: number[];
              features?: string[];
            };
            const featureWeight = (params["feature_weight"] as number) ?? 0.3;
            if (!ragResults || !query) {
              throw new Error("cad_rag_rank requires 'results' and 'query'");
            }
            const ranked = cadRetrievalAugmentationEngine.rankByRelevance(ragResults, query, featureWeight);
            result = { ranked, count: ranked.length, source: "CADRetrievalAugmentationEngine.rankByRelevance" };
            break;
          }
          case "cad_rag_augment": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            // Note: augment requires an async generator callback which is complex to wire
            // This action returns a stub indicating the method signature
            result = {
              available: false,
              message: "cad_rag_augment requires an async generator callback. Use cad_rag_retrieve + cad_rag_format for the retrieval portion.",
              signature: "augment(query, corpus, backend, generator, filters?, k?, format?)",
              source: "CADRetrievalAugmentationEngine.augment"
            };
            break;
          }
          case "cad_rag_stats": {
            const { cadRetrievalAugmentationEngine } = await import("../../engines/CADRetrievalAugmentationEngine.js");
            const corpus = params["corpus"] as Array<{
              id: string;
              tokens: number[];
              customer?: string;
              machineCategory?: "lathe" | "mill" | "wire_edm" | "sinker_edm" | "hurco" | "hypermill" | "unknown";
            }>;
            if (!corpus || !Array.isArray(corpus)) {
              throw new Error("cad_rag_stats requires 'corpus' array");
            }
            const stats = cadRetrievalAugmentationEngine.getCorpusStats(corpus);
            const customers = cadRetrievalAugmentationEngine.getCustomers(corpus);
            result = { ...stats, customers, source: "CADRetrievalAugmentationEngine.getCorpusStats" };
            break;
          }
          case "cad_pipeline_run": {
            const { cadTrainingPipelineOrchestratorEngine } = await import("../../engines/CADTrainingPipelineOrchestratorEngine.js");
            const config = params["config"] as {
              rootPath: string;
              outputDir?: string;
              maxFiles?: number;
              excludePatterns?: string[];
              indexType?: "flat" | "vptree";
              validateSamples?: number;
              skipValidation?: boolean;
            };
            if (!config || !config.rootPath) {
              throw new Error("cad_pipeline_run requires 'config' with rootPath");
            }
            const pipelineResult = cadTrainingPipelineOrchestratorEngine.run(config);
            result = { ...pipelineResult, source: "CADTrainingPipelineOrchestratorEngine.run" };
            break;
          }
          case "cad_pipeline_validate": {
            const { cadTrainingPipelineOrchestratorEngine } = await import("../../engines/CADTrainingPipelineOrchestratorEngine.js");
            const sampleSize = (params["sample_size"] as number) ?? 10;
            const validation = cadTrainingPipelineOrchestratorEngine.validateIndex(sampleSize);
            result = { ...validation, source: "CADTrainingPipelineOrchestratorEngine.validateIndex" };
            break;
          }
          case "cad_pipeline_status": {
            const { cadTrainingPipelineOrchestratorEngine } = await import("../../engines/CADTrainingPipelineOrchestratorEngine.js");
            const info = cadTrainingPipelineOrchestratorEngine.getInfo();
            const capabilities = cadTrainingPipelineOrchestratorEngine.getCapabilities();
            result = { info, capabilities, source: "CADTrainingPipelineOrchestratorEngine.getInfo" };
            break;
          }
          case "cad_embed": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            // Note: embed requires an EmbeddingBackend which is complex to wire via JSON
            // Return signature info - use cad_embed_build_index for full pipeline
            result = {
              available: false,
              message: "cad_embed requires an EmbeddingBackend instance. Use CADEmbeddingIndexOrchestratorEngine for the full pipeline.",
              signature: "embed(tokens: number[], backend: EmbeddingBackend, config?: EmbedConfig)",
              cacheStats: cadFeatureEmbeddingEngine.cacheStats(),
              source: "CADFeatureEmbeddingEngine.embed"
            };
            break;
          }
          case "cad_embed_batch": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            result = {
              available: false,
              message: "cad_embed_batch requires an EmbeddingBackend instance. Use CADEmbeddingIndexOrchestratorEngine for the full pipeline.",
              signature: "embedBatch(corpus: number[][], backend: EmbeddingBackend, config?: EmbedConfig)",
              cacheStats: cadFeatureEmbeddingEngine.cacheStats(),
              source: "CADFeatureEmbeddingEngine.embedBatch"
            };
            break;
          }
          case "cad_embed_build_index": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            // Building index requires pre-computed embeddings
            result = {
              available: false,
              message: "cad_embed_build_index requires pre-computed IndexedEmbedding[]. Use CADEmbeddingIndexOrchestratorEngine.ingest() for the full pipeline.",
              signature: "buildIndex(embeddings: IndexedEmbedding[], type: 'flat' | 'vptree', metric: SimilarityMetric)",
              source: "CADFeatureEmbeddingEngine.buildIndex"
            };
            break;
          }
          case "cad_embed_search": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            result = {
              available: false,
              message: "cad_embed_search requires an embedding query and index. Use CADEmbeddingIndexOrchestratorEngine.query() for text-based search.",
              signature: "search(query: Embedding, index: SimilarityIndex, k: number, metric: SimilarityMetric)",
              source: "CADFeatureEmbeddingEngine.search"
            };
            break;
          }
          case "cad_embed_cache_clear": {
            const { cadFeatureEmbeddingEngine } = await import("../../engines/CADFeatureEmbeddingEngine.js");
            const cleared = cadFeatureEmbeddingEngine.clearCache();
            result = { ...cleared, source: "CADFeatureEmbeddingEngine.clearCache" };
            break;
          }
          case "cad_index_ingest": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            const corpusPath = params["corpus_path"] as string;
            const config = params["config"] as { indexType?: "flat" | "vptree"; metric?: string; maxEntries?: number } | undefined;
            if (!corpusPath) {
              throw new Error("cad_index_ingest requires 'corpus_path' string");
            }
            const ingestResult = cadEmbeddingIndexOrchestratorEngine.ingest(
              corpusPath,
              config as unknown as Parameters<typeof cadEmbeddingIndexOrchestratorEngine.ingest>[1],
            );
            result = { ...ingestResult, source: "CADEmbeddingIndexOrchestratorEngine.ingest" };
            break;
          }
          case "cad_index_query": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            const query = params["query"] as string;
            const k = (params["k"] as number) ?? 10;
            const extensions = params["extensions"] as string[] | undefined;
            const minBytes = params["min_bytes"] as number | undefined;
            const maxBytes = params["max_bytes"] as number | undefined;
            if (!query) {
              throw new Error("cad_index_query requires 'query' string");
            }
            const results = cadEmbeddingIndexOrchestratorEngine.query({ query, k, extensions, minBytes, maxBytes });
            result = { results, count: results.length, source: "CADEmbeddingIndexOrchestratorEngine.query" };
            break;
          }
          case "cad_index_similar": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            const sourcePath = params["source_path"] as string;
            const k = (params["k"] as number) ?? 5;
            if (!sourcePath) {
              throw new Error("cad_index_similar requires 'source_path' string");
            }
            const similar = cadEmbeddingIndexOrchestratorEngine.findSimilar(sourcePath, k);
            result = { similar, count: similar.length, source: "CADEmbeddingIndexOrchestratorEngine.findSimilar" };
            break;
          }
          case "cad_index_stats_orch": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            const stats = cadEmbeddingIndexOrchestratorEngine.stats();
            result = { ...stats, source: "CADEmbeddingIndexOrchestratorEngine.stats" };
            break;
          }
          case "cad_index_clear": {
            const { cadEmbeddingIndexOrchestratorEngine } = await import("../../engines/CADEmbeddingIndexOrchestratorEngine.js");
            cadEmbeddingIndexOrchestratorEngine.clear();
            result = { cleared: true, source: "CADEmbeddingIndexOrchestratorEngine.clear" };
            break;
          }
          case "cad_kernel_eval_nurbs": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const curve = params["curve"] as {
              degree: number;
              control_points: Array<{ x: number; y: number; z: number; w: number }>;
              knot_vector: number[]; is_periodic: boolean;
            };
            const t = params["t"] as number;
            if (!curve || t === undefined) {
              throw new Error("cad_kernel_eval_nurbs requires 'curve' and 't' parameter");
            }
            const point = cadKernelEngine.evaluateNURBSCurve(curve, t);
            result = { point, source: "CADKernelEngine.evaluateNURBSCurve" };
            break;
          }
          case "cad_kernel_compute_aabb": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const points = params["points"] as Array<{ x: number; y: number; z: number }>;
            if (!points || !Array.isArray(points)) {
              throw new Error("cad_kernel_compute_aabb requires 'points' array");
            }
            const aabb = cadKernelEngine.computeAABB(points);
            result = { aabb, source: "CADKernelEngine.computeAABB" };
            break;
          }
          case "cad_kernel_ray_intersect": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const ray = params["ray"] as { origin: { x: number; y: number; z: number }; direction: { x: number; y: number; z: number } };
            const aabb = params["aabb"] as { min: { x: number; y: number; z: number }; max: { x: number; y: number; z: number } };
            if (!ray || !aabb) {
              throw new Error("cad_kernel_ray_intersect requires 'ray' and 'aabb' objects");
            }
            const intersection = cadKernelEngine.rayAABBIntersect(ray, aabb);
            result = { ...intersection, source: "CADKernelEngine.rayAABBIntersect" };
            break;
          }
          case "cad_kernel_mesh_volume": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const mesh = params["mesh"] as {
              vertices: Array<{ x: number; y: number; z: number }>;
              normals: Array<{ x: number; y: number; z: number }>; indices: number[]; triangle_count: number;
            };
            if (!mesh) {
              throw new Error("cad_kernel_mesh_volume requires 'mesh' with vertices and triangles");
            }
            const volume = cadKernelEngine.meshVolume(mesh);
            result = { volume, source: "CADKernelEngine.meshVolume" };
            break;
          }
          case "cad_kernel_mesh_area": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const mesh = params["mesh"] as {
              vertices: Array<{ x: number; y: number; z: number }>;
              normals: Array<{ x: number; y: number; z: number }>; indices: number[]; triangle_count: number;
            };
            if (!mesh) {
              throw new Error("cad_kernel_mesh_area requires 'mesh' with vertices and triangles");
            }
            const area = cadKernelEngine.meshSurfaceArea(mesh);
            result = { area, source: "CADKernelEngine.meshSurfaceArea" };
            break;
          }
          case "cad_kernel_generate_box": {
            const { cadKernelEngine } = await import("../../engines/CADKernelEngine.js");
            const width = (params["width"] as number) ?? 1;
            const height = (params["height"] as number) ?? 1;
            const depth = (params["depth"] as number) ?? 1;
            const mesh = cadKernelEngine.generateBox(width, height, depth);
            result = { mesh, source: "CADKernelEngine.generateBox" };
            break;
          }
          case "cad_access_grant": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const userId = params["user_id"] as string;
            const role = params["role"] as string;
            const expiration = params["expiration"] as string | undefined;
            if (!contentHash || !userId || !role) {
              throw new Error("cad_access_grant requires 'content_hash', 'user_id', and 'role'");
            }
            const policy = cadAccessControlRBACABACEngine.grant(contentHash, { userId, roles: [role] as ("viewer" | "editor" | "owner" | "auditor")[], grantedBy: 'system', expiresAt: expiration });
            result = { policy, source: "CADAccessControlRBACABACEngine.grant" };
            break;
          }
          case "cad_access_revoke": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const userId = params["user_id"] as string;
            if (!contentHash || !userId) {
              throw new Error("cad_access_revoke requires 'content_hash' and 'user_id'");
            }
            const policy = cadAccessControlRBACABACEngine.revoke(contentHash, userId);
            result = { policy, source: "CADAccessControlRBACABACEngine.revoke" };
            break;
          }
          case "cad_access_check": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const user = params["user"] as { userId: string; countryCode: string; isUSPerson: boolean; roles: ("viewer" | "editor" | "owner" | "auditor")[]; investigative: boolean };
            const action = params["action"] as "view" | "edit" | "delete" | "grant" | "checkout" | "checkin" | "audit_read" | "download" | "print";
            if (!contentHash || !user || !action) {
              throw new Error("cad_access_check requires 'content_hash', 'user', and 'action'");
            }
            const decision = cadAccessControlRBACABACEngine.check(contentHash, user, action);
            result = { ...decision, source: "CADAccessControlRBACABACEngine.check" };
            break;
          }
          case "cad_access_checkout": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const user = params["user"] as { userId: string; countryCode: string; isUSPerson: boolean; roles: ("viewer" | "editor" | "owner" | "auditor")[]; investigative: boolean };
            if (!contentHash || !user) {
              throw new Error("cad_access_checkout requires 'content_hash' and 'user'");
            }
            const decision = cadAccessControlRBACABACEngine.checkout(contentHash, user);
            result = { ...decision, source: "CADAccessControlRBACABACEngine.checkout" };
            break;
          }
          case "cad_access_checkin": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string;
            const user = params["user"] as { userId: string; countryCode: string; isUSPerson: boolean; roles: ("viewer" | "editor" | "owner" | "auditor")[]; investigative: boolean };
            if (!contentHash || !user) {
              throw new Error("cad_access_checkin requires 'content_hash' and 'user'");
            }
            const decision = cadAccessControlRBACABACEngine.checkin(contentHash, user);
            result = { ...decision, source: "CADAccessControlRBACABACEngine.checkin" };
            break;
          }
          case "cad_access_audit": {
            const { cadAccessControlRBACABACEngine } = await import("../../engines/CADAccessControlRBACABACEngine.js");
            const contentHash = params["content_hash"] as string | undefined;
            const userId = params["user_id"] as string | undefined;
            const events = cadAccessControlRBACABACEngine.auditEvents(contentHash, userId);
            result = { events, count: events.length, source: "CADAccessControlRBACABACEngine.auditEvents" };
            break;
          }
          case "cad_feature_extract": {
            const { cadFeatureRecognitionEngine } = await import("../../engines/CADFeatureRecognitionEngine.js");
            const geometry = params["geometry"];
            const extracted = cadFeatureRecognitionEngine.extractFeatures(geometry);
            result = { ...extracted, source: "CADFeatureRecognitionEngine.extractFeatures" };
            break;
          }
          case "cad_thumb_get": {
            const { cadPreviewThumbnailCacheEngine } = await import("../../engines/CADPreviewThumbnailCacheEngine.js");
            const contentHash = params["content_hash"] as string;
            const view = params["view"] as "2d_drawing" | "hero_3d" | "iso_top" | "front" | "top" | "bottom" | "right" | "back" | "left";
            if (!contentHash || !view) {
              throw new Error("cad_thumb_get requires 'content_hash' and 'view'");
            }
            const entry = cadPreviewThumbnailCacheEngine.get(contentHash, view);
            result = { entry: entry ?? null, found: !!entry, source: "CADPreviewThumbnailCacheEngine.get" };
            break;
          }
          case "cad_thumb_has": {
            const { cadPreviewThumbnailCacheEngine } = await import("../../engines/CADPreviewThumbnailCacheEngine.js");
            const contentHash = params["content_hash"] as string;
            const view = params["view"] as "2d_drawing" | "hero_3d" | "iso_top" | "front" | "top" | "bottom" | "right" | "back" | "left";
            if (!contentHash || !view) {
              throw new Error("cad_thumb_has requires 'content_hash' and 'view'");
            }
            const exists = cadPreviewThumbnailCacheEngine.has(contentHash, view);
            result = { exists, source: "CADPreviewThumbnailCacheEngine.has" };
            break;
          }
          case "cad_thumb_list": {
            const { cadPreviewThumbnailCacheEngine } = await import("../../engines/CADPreviewThumbnailCacheEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_thumb_list requires 'content_hash'");
            }
            const entries = cadPreviewThumbnailCacheEngine.listByHash(contentHash);
            result = { entries, count: entries.length, source: "CADPreviewThumbnailCacheEngine.listByHash" };
            break;
          }
          case "cad_thumb_invalidate": {
            const { cadPreviewThumbnailCacheEngine } = await import("../../engines/CADPreviewThumbnailCacheEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_thumb_invalidate requires 'content_hash'");
            }
            const removed = cadPreviewThumbnailCacheEngine.invalidateHash(contentHash);
            result = { removed, source: "CADPreviewThumbnailCacheEngine.invalidateHash" };
            break;
          }
          case "cad_drawing_knowledge_calc": {
            const { cadDrawingKnowledgeEngine } = await import("../../engines/CADDrawingKnowledgeEngine.js");
            const action = params["calc_action"] as string;
            const calcParams = params["calc_params"] as Record<string, unknown>;
            if (!action) {
              throw new Error("cad_drawing_knowledge_calc requires 'calc_action' string");
            }
            const calcResult = cadDrawingKnowledgeEngine.calculate(action, calcParams ?? {});
            result = { result: calcResult, source: "CADDrawingKnowledgeEngine.calculate" };
            break;
          }
          case "cad_artifact_write": {
            const { CADArtifactStorageEngine } = await import("../../engines/CADArtifactStorageEngine.js");
            const engine = new CADArtifactStorageEngine();
            const batchId = params["batch_id"] as string;
            const fileId = params["file_id"] as string;
            const kind = params["kind"] as "expected_step" | "actual_step" | "diff_png" | "error_log";
            const data = params["data"] as string;
            if (!batchId || !fileId || !kind || data === undefined) {
              throw new Error("cad_artifact_write requires 'batch_id', 'file_id', 'kind', 'data'");
            }
            const record = await engine.write(batchId, fileId, kind, data);
            result = { record, source: "CADArtifactStorageEngine.write" };
            break;
          }
          case "cad_artifact_list": {
            const { CADArtifactStorageEngine } = await import("../../engines/CADArtifactStorageEngine.js");
            const engine = new CADArtifactStorageEngine();
            const batchId = params["batch_id"] as string;
            if (!batchId) {
              throw new Error("cad_artifact_list requires 'batch_id'");
            }
            const manifest = await engine.listBatch(batchId);
            result = { manifest, source: "CADArtifactStorageEngine.listBatch" };
            break;
          }
          case "cad_artifact_prune": {
            const { CADArtifactStorageEngine } = await import("../../engines/CADArtifactStorageEngine.js");
            const engine = new CADArtifactStorageEngine();
            const maxBatches = params["max_batches"] as number | undefined;
            const report = await engine.pruneRetention(maxBatches);
            result = { report, source: "CADArtifactStorageEngine.pruneRetention" };
            break;
          }
          case "cad_bundle_register": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const bundle = params["bundle"] as { bundleId: string; operations: unknown[] };
            if (!bundle || !bundle.bundleId) {
              throw new Error("cad_bundle_register requires 'bundle' with 'bundleId'");
            }
            const registered = engine.registerBundle(bundle as Parameters<typeof engine.registerBundle>[0]);
            result = { bundle: registered, source: "CADBundleReplayCompareEngine.registerBundle" };
            break;
          }
          case "cad_bundle_get": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const bundleId = params["bundle_id"] as string;
            if (!bundleId) {
              throw new Error("cad_bundle_get requires 'bundle_id'");
            }
            const bundle = engine.getBundle(bundleId);
            result = { bundle: bundle ?? null, found: !!bundle, source: "CADBundleReplayCompareEngine.getBundle" };
            break;
          }
          case "cad_bundle_list": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const bundles = engine.listBundles();
            result = { bundles, count: bundles.length, source: "CADBundleReplayCompareEngine.listBundles" };
            break;
          }
          case "cad_bundle_diff": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const leftId = params["left_bundle_id"] as string;
            const rightId = params["right_bundle_id"] as string;
            if (!leftId || !rightId) {
              throw new Error("cad_bundle_diff requires 'left_bundle_id' and 'right_bundle_id'");
            }
            const diff = engine.diff(leftId, rightId);
            result = { diff, source: "CADBundleReplayCompareEngine.diff" };
            break;
          }
          case "cad_bundle_search": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const kinds = params["kinds"] as string[] | undefined;
            const paramEquals = params["param_equals"] as Record<string, unknown> | undefined;
            const limit = params["limit"] as number | undefined;
            const hits = engine.search({ kinds: kinds as Parameters<typeof engine.search>[0]["kinds"], paramEquals: paramEquals as Parameters<typeof engine.search>[0]["paramEquals"], limit });
            result = { hits, count: hits.length, source: "CADBundleReplayCompareEngine.search" };
            break;
          }
          case "cad_bundle_retrain_list": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const entries = engine.retrainEntries();
            result = { entries, count: entries.length, source: "CADBundleReplayCompareEngine.retrainEntries" };
            break;
          }
          case "cad_bundle_retrain_drain": {
            const { CADBundleReplayCompareEngine } = await import("../../engines/CADBundleReplayCompareEngine.js");
            const engine = new CADBundleReplayCompareEngine();
            const entries = engine.drainRetrainQueue();
            result = { entries, count: entries.length, source: "CADBundleReplayCompareEngine.drainRetrainQueue" };
            break;
          }
          case "cad_bundle_key_create": {
            const { CADBundleSigningVersioningEngine } = await import("../../engines/CADBundleSigningVersioningEngine.js");
            const engine = new CADBundleSigningVersioningEngine();
            const keyId = params["key_id"] as string;
            const alg = params["alg"] as "ed25519" | "ed25519-hmac" | undefined;
            const issuer = params["issuer"] as string | undefined;
            const seedHex = params["seed_hex"] as string | undefined;
            if (!keyId) {
              throw new Error("cad_bundle_key_create requires 'key_id'");
            }
            const key = engine.createKey({ keyId, alg, issuer, seedHex });
            result = { key, source: "CADBundleSigningVersioningEngine.createKey" };
            break;
          }
          case "cad_bundle_key_get": {
            const { CADBundleSigningVersioningEngine } = await import("../../engines/CADBundleSigningVersioningEngine.js");
            const engine = new CADBundleSigningVersioningEngine();
            const keyId = params["key_id"] as string;
            if (!keyId) {
              throw new Error("cad_bundle_key_get requires 'key_id'");
            }
            const key = engine.publicKey(keyId);
            result = { key: key ?? null, found: !!key, source: "CADBundleSigningVersioningEngine.publicKey" };
            break;
          }
          case "cad_bundle_sign": {
            const { CADBundleSigningVersioningEngine } = await import("../../engines/CADBundleSigningVersioningEngine.js");
            const engine = new CADBundleSigningVersioningEngine();
            const bundleId = params["bundle_id"] as string;
            const bundleDigestSha256 = params["bundle_digest_sha256"] as string;
            const version = params["version"] as string;
            const keyId = params["key_id"] as string;
            const predicate = params["predicate"] as { predicateType: string; builder: string; buildType: string; metadata?: Record<string, string> };
            const bump = params["bump"] as "major" | "minor" | "patch" | undefined;
            if (!bundleId || !bundleDigestSha256 || !version || !keyId || !predicate) {
              throw new Error("cad_bundle_sign requires 'bundle_id', 'bundle_digest_sha256', 'version', 'key_id', 'predicate'");
            }
            const signature = engine.sign({ bundleId, bundleDigestSha256, version, keyId, predicate, bump });
            result = { signature, source: "CADBundleSigningVersioningEngine.sign" };
            break;
          }
          case "cad_bundle_verify": {
            const { CADBundleSigningVersioningEngine } = await import("../../engines/CADBundleSigningVersioningEngine.js");
            const engine = new CADBundleSigningVersioningEngine();
            const sig = params["signature"] as Parameters<typeof engine.verify>[0];
            const expectedDigest = params["expected_digest"] as string | undefined;
            if (!sig) {
              throw new Error("cad_bundle_verify requires 'signature'");
            }
            const verifyResult = engine.verify(sig, expectedDigest);
            result = { result: verifyResult, source: "CADBundleSigningVersioningEngine.verify" };
            break;
          }
          case "cad_corpus_classify": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const path = params["path"] as string;
            const bytes = params["bytes"] as number;
            if (!path || bytes === undefined) {
              throw new Error("cad_corpus_classify requires 'path' and 'bytes'");
            }
            const entry = cadCorpusIngesterEngine.classify(path, bytes);
            result = { entry: entry ?? null, classified: !!entry, source: "CADCorpusIngesterEngine.classify" };
            break;
          }
          case "cad_corpus_ingest": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const rawEntries = params["entries"];
            if (!rawEntries || !Array.isArray(rawEntries)) {
              throw new Error("cad_corpus_ingest requires 'entries' array");
            }
            const ingestResult = cadCorpusIngesterEngine.ingest(rawEntries as Parameters<typeof cadCorpusIngesterEngine.ingest>[0]);
            result = { ...ingestResult, source: "CADCorpusIngesterEngine.ingest" };
            break;
          }
          case "cad_corpus_dedup": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const rawEntries = params["entries"];
            if (!rawEntries || !Array.isArray(rawEntries)) {
              throw new Error("cad_corpus_dedup requires 'entries' array");
            }
            const deduped = cadCorpusIngesterEngine.dedup(rawEntries as Parameters<typeof cadCorpusIngesterEngine.dedup>[0]);
            result = { entries: deduped, removed: rawEntries.length - deduped.length, source: "CADCorpusIngesterEngine.dedup" };
            break;
          }
          case "cad_corpus_stats": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const rawEntries = params["entries"];
            if (!rawEntries || !Array.isArray(rawEntries)) {
              throw new Error("cad_corpus_stats requires 'entries' array");
            }
            const stats = cadCorpusIngesterEngine.stats(rawEntries as Parameters<typeof cadCorpusIngesterEngine.stats>[0]);
            result = { stats, source: "CADCorpusIngesterEngine.stats" };
            break;
          }
          case "cad_corpus_jsonl": {
            const { cadCorpusIngesterEngine } = await import("../../engines/CADCorpusIngesterEngine.js");
            const rawEntries = params["entries"];
            if (!rawEntries || !Array.isArray(rawEntries)) {
              throw new Error("cad_corpus_jsonl requires 'entries' array");
            }
            const jsonl = cadCorpusIngesterEngine.toJsonl(rawEntries as Parameters<typeof cadCorpusIngesterEngine.toJsonl>[0]);
            result = { jsonl, lines: rawEntries.length, source: "CADCorpusIngesterEngine.toJsonl" };
            break;
          }
          case "cad_crash_session_list": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessions = engine.listSessions();
            result = { sessions, count: sessions.length, source: "CADCrashRecoveryEngine.listSessions" };
            break;
          }
          case "cad_crash_session_get": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            if (!sessionId) {
              throw new Error("cad_crash_session_get requires 'session_id'");
            }
            const session = engine.getSession(sessionId);
            result = { session: session ?? null, found: !!session, source: "CADCrashRecoveryEngine.getSession" };
            break;
          }
          case "cad_crash_health_check": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            if (!sessionId) {
              throw new Error("cad_crash_health_check requires 'session_id'");
            }
            const health = engine.checkHealth(sessionId);
            result = { health: health ?? null, healthy: !!health, source: "CADCrashRecoveryEngine.checkHealth" };
            break;
          }
          case "cad_crash_checkpoint_create": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            const stateHash = params["state_hash"] as string | undefined;
            const metadata = params["metadata"] as Record<string, unknown> | undefined;
            if (!sessionId) {
              throw new Error("cad_crash_checkpoint_create requires 'session_id'");
            }
            const checkpoint = engine.createCheckpoint(sessionId, { stateHash, metadata });
            result = { checkpoint: checkpoint ?? null, created: !!checkpoint, source: "CADCrashRecoveryEngine.createCheckpoint" };
            break;
          }
          case "cad_crash_checkpoint_get": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const checkpointId = params["checkpoint_id"] as string;
            if (!checkpointId) {
              throw new Error("cad_crash_checkpoint_get requires 'checkpoint_id'");
            }
            const checkpoint = engine.getCheckpoint(checkpointId);
            result = { checkpoint: checkpoint ?? null, found: !!checkpoint, source: "CADCrashRecoveryEngine.getCheckpoint" };
            break;
          }
          case "cad_crash_checkpoint_list": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string | undefined;
            const checkpoints = engine.listCheckpoints(sessionId);
            result = { checkpoints, count: checkpoints.length, source: "CADCrashRecoveryEngine.listCheckpoints" };
            break;
          }
          case "cad_crash_journal_get": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            if (!sessionId) {
              throw new Error("cad_crash_journal_get requires 'session_id'");
            }
            const journal = engine.getJournal(sessionId);
            result = { journal, count: journal.length, source: "CADCrashRecoveryEngine.getJournal" };
            break;
          }
          case "cad_crash_history": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string | undefined;
            const limit = params["limit"] as number | undefined;
            const events = engine.getCrashHistory({ sessionId, limit });
            result = { events, count: events.length, source: "CADCrashRecoveryEngine.getCrashHistory" };
            break;
          }
          case "cad_crash_policy_get": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            if (!sessionId) {
              throw new Error("cad_crash_policy_get requires 'session_id'");
            }
            const policy = engine.getPolicy(sessionId);
            result = { policy, source: "CADCrashRecoveryEngine.getPolicy" };
            break;
          }
          case "cad_crash_policy_set": {
            const { CADCrashRecoveryEngine } = await import("../../engines/CADCrashRecoveryEngine.js");
            const noopTransport = {
              getProcessHealth: () => null,
              restartApp: () => ({ processId: 0, success: false }),
              attachToProcess: () => false,
              executeCommand: () => false,
              loadDocument: () => false,
            };
            const engine = new CADCrashRecoveryEngine({ transport: noopTransport });
            const sessionId = params["session_id"] as string;
            const policy = params["policy"] as Record<string, unknown>;
            if (!sessionId || !policy) {
              throw new Error("cad_crash_policy_set requires 'session_id' and 'policy'");
            }
            engine.setPolicy(sessionId, policy);
            result = { updated: true, source: "CADCrashRecoveryEngine.setPolicy" };
            break;
          }
          case "cad_failure_triage": {
            const { cadFailureTriageEngine } = await import("../../engines/CADFailureTriageEngine.js");
            const failure = params["failure"] as Parameters<typeof cadFailureTriageEngine.triage>[0];
            if (!failure) {
              throw new Error("cad_failure_triage requires 'failure' (FailurePayload)");
            }
            const triageResult = cadFailureTriageEngine.triage(failure);
            result = { result: triageResult, source: "CADFailureTriageEngine.triage" };
            break;
          }
          case "cad_failure_group": {
            const { cadFailureTriageEngine } = await import("../../engines/CADFailureTriageEngine.js");
            const rawResults = params["results"];
            if (!rawResults || !Array.isArray(rawResults)) {
              throw new Error("cad_failure_group requires 'results' array (TriageResult[])");
            }
            const groups = cadFailureTriageEngine.group(rawResults as Parameters<typeof cadFailureTriageEngine.group>[0]);
            result = { groups, count: groups.length, source: "CADFailureTriageEngine.group" };
            break;
          }
          case "cad_fs_registry_upsert": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const entry = params["entry"] as Parameters<typeof cadFilesystemReconciliationEngine.upsertRegistryEntry>[0];
            if (!entry) {
              throw new Error("cad_fs_registry_upsert requires 'entry' (RegistryEntry)");
            }
            const upserted = cadFilesystemReconciliationEngine.upsertRegistryEntry(entry);
            result = { entry: upserted, source: "CADFilesystemReconciliationEngine.upsertRegistryEntry" };
            break;
          }
          case "cad_fs_registry_get": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_fs_registry_get requires 'content_hash'");
            }
            const entry = cadFilesystemReconciliationEngine.getRegistryEntry(contentHash);
            result = { entry: entry ?? null, found: !!entry, source: "CADFilesystemReconciliationEngine.getRegistryEntry" };
            break;
          }
          case "cad_fs_registry_list": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const entries = cadFilesystemReconciliationEngine.allEntries();
            result = { entries, count: entries.length, source: "CADFilesystemReconciliationEngine.allEntries" };
            break;
          }
          case "cad_fs_registry_remove": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_fs_registry_remove requires 'content_hash'");
            }
            const removed = cadFilesystemReconciliationEngine.removeRegistryEntry(contentHash);
            result = { removed, source: "CADFilesystemReconciliationEngine.removeRegistryEntry" };
            break;
          }
          case "cad_fs_reconcile": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const disk = params["disk"] as Parameters<typeof cadFilesystemReconciliationEngine.reconcile>[0];
            if (!disk || !Array.isArray(disk)) {
              throw new Error("cad_fs_reconcile requires 'disk' array (DiskEntry[])");
            }
            const report = cadFilesystemReconciliationEngine.reconcile(disk);
            result = { report, source: "CADFilesystemReconciliationEngine.reconcile" };
            break;
          }
          case "cad_fs_aging_plan": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const now = params["now"] as string | undefined;
            const transitions = cadFilesystemReconciliationEngine.planAging(now);
            result = { transitions, count: transitions.length, source: "CADFilesystemReconciliationEngine.planAging" };
            break;
          }
          case "cad_fs_aging_apply": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const transition = params["transition"] as Parameters<typeof cadFilesystemReconciliationEngine.applyTransition>[0];
            if (!transition) {
              throw new Error("cad_fs_aging_apply requires 'transition' (AgingTransition)");
            }
            const entry = cadFilesystemReconciliationEngine.applyTransition(transition);
            result = { entry, source: "CADFilesystemReconciliationEngine.applyTransition" };
            break;
          }
          case "cad_fs_cost_tenant": {
            const { cadFilesystemReconciliationEngine } = await import("../../engines/CADFilesystemReconciliationEngine.js");
            const tenantId = params["tenant_id"] as string;
            const periodStart = params["period_start"] as string;
            const periodEnd = params["period_end"] as string;
            if (!tenantId || !periodStart || !periodEnd) {
              throw new Error("cad_fs_cost_tenant requires 'tenant_id', 'period_start', 'period_end'");
            }
            const ledger = cadFilesystemReconciliationEngine.costForTenant(tenantId, periodStart, periodEnd);
            result = { ledger, source: "CADFilesystemReconciliationEngine.costForTenant" };
            break;
          }
          case "cad_install_probe": {
            const { cadInstallationProbeEngine } = await import("../../engines/CADInstallationProbeEngine.js");
            const forceRefresh = params["force_refresh"] as boolean | undefined;
            const probeResult = await cadInstallationProbeEngine.probe(forceRefresh);
            result = { probe: probeResult, source: "CADInstallationProbeEngine.probe" };
            break;
          }
          case "cad_install_cached": {
            const { cadInstallationProbeEngine } = await import("../../engines/CADInstallationProbeEngine.js");
            const cached = cadInstallationProbeEngine.getCached();
            result = { cached: cached ?? null, hasCached: !!cached, source: "CADInstallationProbeEngine.getCached" };
            break;
          }
          case "cad_install_invalidate": {
            const { cadInstallationProbeEngine } = await import("../../engines/CADInstallationProbeEngine.js");
            cadInstallationProbeEngine.invalidateCache();
            result = { invalidated: true, source: "CADInstallationProbeEngine.invalidateCache" };
            break;
          }
          case "cad_license_server_add": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            const serverType = params["server_type"] as "FlexLM" | "RLM" | "DSLS" | "Sentinel" | "CodeMeter" | "LUM" | "Native";
            const host = params["host"] as string;
            const port = params["port"] as number;
            if (!serverId || !serverType || !host || !port) {
              throw new Error("cad_license_server_add requires 'server_id', 'server_type', 'host', 'port'");
            }
            engine.addServer(serverId, serverType, host, port);
            result = { added: true, serverId, source: "CADLicenseHealthEngine.addServer" };
            break;
          }
          case "cad_license_server_list": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const servers = engine.listServers();
            result = { servers, count: servers.length, source: "CADLicenseHealthEngine.listServers" };
            break;
          }
          case "cad_license_server_check": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            if (!serverId) {
              throw new Error("cad_license_server_check requires 'server_id'");
            }
            const server = engine.checkServer(serverId);
            result = { server: server ?? null, online: server?.isOnline ?? false, source: "CADLicenseHealthEngine.checkServer" };
            break;
          }
          case "cad_license_features_refresh": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            if (!serverId) {
              throw new Error("cad_license_features_refresh requires 'server_id'");
            }
            const features = engine.refreshFeatures(serverId);
            result = { features, count: features.length, source: "CADLicenseHealthEngine.refreshFeatures" };
            break;
          }
          case "cad_license_features_list": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string | undefined;
            const features = engine.listFeatures(serverId);
            result = { features, count: features.length, source: "CADLicenseHealthEngine.listFeatures" };
            break;
          }
          case "cad_license_utilization": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            const featureId = params["feature_id"] as string;
            if (!serverId || !featureId) {
              throw new Error("cad_license_utilization requires 'server_id' and 'feature_id'");
            }
            const utilization = engine.getFeatureUtilization(serverId, featureId);
            result = { utilization, source: "CADLicenseHealthEngine.getFeatureUtilization" };
            break;
          }
          case "cad_license_users_active": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const serverId = params["server_id"] as string;
            const featureId = params["feature_id"] as string | undefined;
            if (!serverId) {
              throw new Error("cad_license_users_active requires 'server_id'");
            }
            const users = engine.getActiveUsers(serverId, featureId);
            result = { users, count: users.length, source: "CADLicenseHealthEngine.getActiveUsers" };
            break;
          }
          case "cad_license_contention_record": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const featureId = params["feature_id"] as string;
            const userId = params["user_id"] as string;
            const queueDepth = params["queue_depth"] as number;
            const waitTimeMs = params["wait_time_ms"] as number;
            if (!featureId || !userId || queueDepth === undefined || waitTimeMs === undefined) {
              throw new Error("cad_license_contention_record requires 'feature_id', 'user_id', 'queue_depth', 'wait_time_ms'");
            }
            const event = engine.recordContention(featureId, userId, queueDepth, waitTimeMs);
            result = { event, source: "CADLicenseHealthEngine.recordContention" };
            break;
          }
          case "cad_license_contention_history": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const featureId = params["feature_id"] as string | undefined;
            const limit = params["limit"] as number | undefined;
            const events = engine.getContentionHistory({ featureId, limit });
            result = { events, count: events.length, source: "CADLicenseHealthEngine.getContentionHistory" };
            break;
          }
          case "cad_license_alerts": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const acknowledged = params["acknowledged"] as boolean | undefined;
            const severity = params["severity"] as string | undefined;
            const alerts = engine.getAlerts({ acknowledged, severity });
            result = { alerts, count: alerts.length, source: "CADLicenseHealthEngine.getAlerts" };
            break;
          }
          case "cad_license_alert_ack": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const alertId = params["alert_id"] as string;
            if (!alertId) {
              throw new Error("cad_license_alert_ack requires 'alert_id'");
            }
            const acked = engine.acknowledgeAlert(alertId);
            result = { acknowledged: acked, source: "CADLicenseHealthEngine.acknowledgeAlert" };
            break;
          }
          case "cad_license_health_summary": {
            const { CADLicenseHealthEngine } = await import("../../engines/CADLicenseHealthEngine.js");
            const noopTransport = {
              queryServer: () => null,
              getFeatures: () => [],
              getUsers: () => [],
              borrowLicense: () => false,
              returnLicense: () => false,
            };
            const engine = new CADLicenseHealthEngine({ transport: noopTransport });
            const summary = engine.getHealthSummary();
            result = { summary, source: "CADLicenseHealthEngine.getHealthSummary" };
            break;
          }
          case "cad_param_predict": {
            const { cadParameterPredictorEngine } = await import("../../engines/CADParameterPredictorEngine.js");
            const geometry = params["geometry"] as Parameters<typeof cadParameterPredictorEngine.predict>[0];
            if (!geometry) {
              throw new Error("cad_param_predict requires 'geometry' (TargetGeometry)");
            }
            const prediction = cadParameterPredictorEngine.predict(geometry);
            result = { prediction, source: "CADParameterPredictorEngine.predict" };
            break;
          }
          case "cad_param_model_info": {
            const { cadParameterPredictorEngine } = await import("../../engines/CADParameterPredictorEngine.js");
            const info = cadParameterPredictorEngine.getModelInfo();
            result = { info, source: "CADParameterPredictorEngine.getModelInfo" };
            break;
          }
          case "cad_param_train": {
            const { cadParameterPredictorEngine } = await import("../../engines/CADParameterPredictorEngine.js");
            const samples = params["samples"] as Parameters<typeof cadParameterPredictorEngine.train>[0];
            const corpusName = params["corpus_name"] as string | undefined;
            if (!samples || !Array.isArray(samples)) {
              throw new Error("cad_param_train requires 'samples' array (TrainingSample[])");
            }
            const trainResult = cadParameterPredictorEngine.train(samples, { corpusName });
            result = { result: trainResult, source: "CADParameterPredictorEngine.train" };
            break;
          }
          case "cad_param_evaluate": {
            const { cadParameterPredictorEngine } = await import("../../engines/CADParameterPredictorEngine.js");
            const samples = params["samples"] as Parameters<typeof cadParameterPredictorEngine.evaluate>[0];
            if (!samples || !Array.isArray(samples)) {
              throw new Error("cad_param_evaluate requires 'samples' array (TrainingSample[])");
            }
            const report = cadParameterPredictorEngine.evaluate(samples);
            result = { report, source: "CADParameterPredictorEngine.evaluate" };
            break;
          }
          case "cad_audit_record": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const sessionId = params["session_id"] as string;
            const userId = params["user_id"] as string;
            const command = params["command"] as string;
            const args = params["args"] as Record<string, unknown> ?? {};
            const resultStatus = params["result"] as "success" | "failure" | "error";
            const durationMs = params["duration_ms"] as number;
            const metadata = params["metadata"] as Record<string, unknown> | undefined;
            if (!sessionId || !userId || !command || !resultStatus || durationMs === undefined) {
              throw new Error("cad_audit_record requires 'session_id', 'user_id', 'command', 'result', 'duration_ms'");
            }
            const entry = engine.recordCommand(sessionId, userId, command, args, resultStatus, durationMs, metadata);
            result = { entry, source: "CADPluginTamperAuditLogEngine.recordCommand" };
            break;
          }
          case "cad_audit_query": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const opts = {
              sessionId: params["session_id"] as string | undefined,
              userId: params["user_id"] as string | undefined,
              command: params["command"] as string | undefined,
              result: params["result"] as "success" | "failure" | "error" | undefined,
              startTime: params["start_time"] as string | undefined,
              endTime: params["end_time"] as string | undefined,
              limit: params["limit"] as number | undefined,
              offset: params["offset"] as number | undefined,
            };
            const entries = engine.queryEntries(opts);
            result = { entries, count: entries.length, source: "CADPluginTamperAuditLogEngine.queryEntries" };
            break;
          }
          case "cad_audit_verify": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const startIndex = params["start_index"] as number | undefined;
            const endIndex = params["end_index"] as number | undefined;
            const report = engine.verifyChainIntegrity(startIndex, endIndex);
            result = { report, source: "CADPluginTamperAuditLogEngine.verifyChainIntegrity" };
            break;
          }
          case "cad_audit_chain_info": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const info = engine.getChainInfo();
            result = { info, source: "CADPluginTamperAuditLogEngine.getChainInfo" };
            break;
          }
          case "cad_audit_export": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const format = params["format"] as "json" | "csv" | "jsonl";
            const startIndex = params["start_index"] as number | undefined;
            const endIndex = params["end_index"] as number | undefined;
            if (!format) {
              throw new Error("cad_audit_export requires 'format' (json|csv|jsonl)");
            }
            const exported = engine.exportLog(format, { startIndex, endIndex });
            result = { exported, source: "CADPluginTamperAuditLogEngine.exportLog" };
            break;
          }
          case "cad_audit_clear": {
            const { CADPluginTamperAuditLogEngine } = await import("../../engines/CADPluginTamperAuditLogEngine.js");
            const engine = new CADPluginTamperAuditLogEngine();
            const clearedCount = engine.clearLog();
            result = { cleared: clearedCount, source: "CADPluginTamperAuditLogEngine.clearLog" };
            break;
          }
          case "cad_mtls_cert_add": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const cert = params["certificate"] as Parameters<typeof engine.addCertificate>[0];
            if (!cert) {
              throw new Error("cad_mtls_cert_add requires 'certificate' (Certificate)");
            }
            engine.addCertificate(cert);
            result = { added: true, fingerprint: cert.fingerprint, source: "CADPluginMTLSSecurityEngine.addCertificate" };
            break;
          }
          case "cad_mtls_cert_list": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const certs = engine.listCertificates();
            result = { certificates: certs, count: certs.length, source: "CADPluginMTLSSecurityEngine.listCertificates" };
            break;
          }
          case "cad_mtls_cert_validate": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const fingerprint = params["fingerprint"] as string;
            if (!fingerprint) {
              throw new Error("cad_mtls_cert_validate requires 'fingerprint'");
            }
            const validation = engine.validateCertificate(fingerprint);
            result = { validation, source: "CADPluginMTLSSecurityEngine.validateCertificate" };
            break;
          }
          case "cad_mtls_binary_verify": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: (fp: string, eh?: string) => ({ filePath: fp, fileHash: eh ?? "mock", hashAlgorithm: "SHA256" as const, signature: "mocksig", signerCertFingerprint: "mockcert", timestamp: new Date().toISOString(), isValid: true }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const filePath = params["file_path"] as string;
            const expectedHash = params["expected_hash"] as string | undefined;
            if (!filePath) {
              throw new Error("cad_mtls_binary_verify requires 'file_path'");
            }
            const sig = engine.verifyBinary(filePath, expectedHash);
            result = { signature: sig, source: "CADPluginMTLSSecurityEngine.verifyBinary" };
            break;
          }
          case "cad_mtls_connection_validate": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const clientCertFingerprint = params["client_cert_fingerprint"] as string;
            if (!clientCertFingerprint) {
              throw new Error("cad_mtls_connection_validate requires 'client_cert_fingerprint'");
            }
            const validation = engine.validateConnection(clientCertFingerprint);
            result = { validation, source: "CADPluginMTLSSecurityEngine.validateConnection" };
            break;
          }
          case "cad_mtls_events": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const opts = {
              type: params["type"] as string | undefined,
              severity: params["severity"] as string | undefined,
              limit: params["limit"] as number | undefined,
            };
            const events = engine.getSecurityEvents(opts);
            result = { events, count: events.length, source: "CADPluginMTLSSecurityEngine.getSecurityEvents" };
            break;
          }
          case "cad_mtls_config": {
            const { CADPluginMTLSSecurityEngine } = await import("../../engines/CADPluginMTLSSecurityEngine.js");
            const noopTransport = {
              loadCertificate: () => null,
              verifyCertificateChain: () => ({ chainId: "", certificates: [], rootFingerprint: "", isComplete: false, isValid: false }),
              verifyBinarySignature: () => ({ filePath: "", fileHash: "", hashAlgorithm: "SHA256" as const, signature: "", signerCertFingerprint: "", timestamp: new Date().toISOString(), isValid: false }),
              checkRevocation: () => false,
            };
            const engine = new CADPluginMTLSSecurityEngine({ transport: noopTransport });
            const config = engine.getConfig();
            result = { config, source: "CADPluginMTLSSecurityEngine.getConfig" };
            break;
          }
          case "cad_regen_test": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const originalPath = params["original_path"] as string;
            const thresholds = params["thresholds"] as Parameters<typeof cadRegenerationTestEngine.test>[0]["thresholds"];
            if (!originalPath) {
              throw new Error("cad_regen_test requires 'original_path'");
            }
            const testResult = await cadRegenerationTestEngine.test({ originalPath, thresholds });
            result = { result: testResult, source: "CADRegenerationTestEngine.test" };
            break;
          }
          case "cad_regen_batch": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const paths = params["paths"] as string[];
            const thresholds = params["thresholds"] as Parameters<typeof cadRegenerationTestEngine.batch>[0]["thresholds"];
            const stopOnFirstFail = params["stop_on_first_fail"] as boolean | undefined;
            if (!paths || !Array.isArray(paths)) {
              throw new Error("cad_regen_batch requires 'paths' array");
            }
            const batchResult = await cadRegenerationTestEngine.batch({ paths, thresholds, stopOnFirstFail });
            result = { result: batchResult, source: "CADRegenerationTestEngine.batch" };
            break;
          }
          case "cad_regen_compare": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const original = params["original"] as Parameters<typeof cadRegenerationTestEngine.compare>[0];
            const generated = params["generated"] as Parameters<typeof cadRegenerationTestEngine.compare>[1];
            const thresholds = params["thresholds"] as Parameters<typeof cadRegenerationTestEngine.compare>[2];
            if (!original || !generated) {
              throw new Error("cad_regen_compare requires 'original' and 'generated' (CADGeometry)");
            }
            const comparison = cadRegenerationTestEngine.compare(original, generated, thresholds);
            result = { comparison, source: "CADRegenerationTestEngine.compare" };
            break;
          }
          case "cad_regen_thresholds_get": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const thresholds = cadRegenerationTestEngine.getThresholds();
            result = { thresholds, source: "CADRegenerationTestEngine.getThresholds" };
            break;
          }
          case "cad_regen_thresholds_set": {
            const { cadRegenerationTestEngine } = await import("../../engines/CADRegenerationTestEngine.js");
            const thresholds = params["thresholds"] as Parameters<typeof cadRegenerationTestEngine.setThresholds>[0];
            if (!thresholds) {
              throw new Error("cad_regen_thresholds_set requires 'thresholds'");
            }
            const updated = cadRegenerationTestEngine.setThresholds(thresholds);
            result = { thresholds: updated, source: "CADRegenerationTestEngine.setThresholds" };
            break;
          }
          case "cad_regression_dashboard_snapshot": {
            const { cadRegressionDashboardEngine } = await import("../../engines/CADRegressionDashboardEngine.js");
            const batchId = params["batch_id"] as string;
            const stateDir = params["state_dir"] as string | undefined;
            const windowMinutes = params["window_minutes"] as number | undefined;
            const recentLimit = params["recent_limit"] as number | undefined;
            if (!batchId) {
              throw new Error("cad_regression_dashboard_snapshot requires 'batch_id'");
            }
            const snapshot = await cadRegressionDashboardEngine.snapshot(batchId, stateDir, windowMinutes, recentLimit);
            result = { snapshot, source: "CADRegressionDashboardEngine.snapshot" };
            break;
          }
          case "cad_regression_dashboard_list": {
            const { cadRegressionDashboardEngine } = await import("../../engines/CADRegressionDashboardEngine.js");
            const stateDir = params["state_dir"] as string | undefined;
            const batches = await cadRegressionDashboardEngine.listBatches(stateDir);
            result = { batches, count: batches.length, source: "CADRegressionDashboardEngine.listBatches" };
            break;
          }
          case "cad_regression_run": {
            result = { error: "cad_regression_run requires runtime TestRunner - use loadState or call engine directly", source: "CADRegressionTestOrchestratorEngine" };
            break;
          }
          case "cad_regression_load": {
            const { cadRegressionTestOrchestratorEngine } = await import("../../engines/CADRegressionTestOrchestratorEngine.js");
            const statePath = params["state_path"] as string;
            if (!statePath) {
              throw new Error("cad_regression_load requires 'state_path'");
            }
            const batch = await cadRegressionTestOrchestratorEngine.loadState(statePath);
            result = { batch: batch ?? null, found: !!batch, source: "CADRegressionTestOrchestratorEngine.loadState" };
            break;
          }
          case "cad_regression_report_snapshot": {
            const { renderSnapshot } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const snapshot = params["snapshot"] as Parameters<typeof renderSnapshot>[0];
            if (!snapshot) {
              throw new Error("cad_regression_report_snapshot requires 'snapshot' (DashboardSnapshot)");
            }
            const markdown = renderSnapshot(snapshot);
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderSnapshot" };
            break;
          }
          case "cad_regression_report_diff": {
            const { renderDiff } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const diff = params["diff"] as Parameters<typeof renderDiff>[0];
            const rowLimit = params["row_limit"] as number | undefined;
            if (!diff) {
              throw new Error("cad_regression_report_diff requires 'diff' (DiffReport)");
            }
            const markdown = renderDiff(diff, rowLimit);
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderDiff" };
            break;
          }
          case "cad_regression_report_trend": {
            const { renderTrend } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const trend = params["trend"] as Parameters<typeof renderTrend>[0];
            if (!trend) {
              throw new Error("cad_regression_report_trend requires 'trend' (TrendReport)");
            }
            const markdown = renderTrend(trend);
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderTrend" };
            break;
          }
          case "cad_regression_report_hotspots": {
            const { renderHotspots } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const hotspots = params["hotspots"] as Parameters<typeof renderHotspots>[0];
            if (!hotspots) {
              throw new Error("cad_regression_report_hotspots requires 'hotspots' (HotspotReport)");
            }
            const markdown = renderHotspots(hotspots);
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderHotspots" };
            break;
          }
          case "cad_regression_report_summary": {
            const { renderSummary } = await import("../../engines/CADRegressionReportGeneratorEngine.js");
            const snapshot = params["snapshot"] as Parameters<typeof renderSummary>[0]["snapshot"];
            const diff = params["diff"] as Parameters<typeof renderSummary>[0]["diff"];
            const trend = params["trend"] as Parameters<typeof renderSummary>[0]["trend"];
            const hotspots = params["hotspots"] as Parameters<typeof renderSummary>[0]["hotspots"];
            const rowLimit = params["row_limit"] as number | undefined;
            const markdown = renderSummary({ snapshot, diff, trend, hotspots, rowLimit });
            result = { markdown, source: "CADRegressionReportGeneratorEngine.renderSummary" };
            break;
          }
          case "cad_regression_analyzer_diff": {
            const { cadRegressionResultsAnalyzerEngine } = await import("../../engines/CADRegressionResultsAnalyzerEngine.js");
            const baseBatchId = params["base_batch_id"] as string;
            const candidateBatchId = params["candidate_batch_id"] as string;
            const stateDir = params["state_dir"] as string | undefined;
            if (!baseBatchId || !candidateBatchId) {
              throw new Error("cad_regression_analyzer_diff requires 'base_batch_id' and 'candidate_batch_id'");
            }
            const diffReport = await cadRegressionResultsAnalyzerEngine.diff(baseBatchId, candidateBatchId, stateDir);
            result = { diff: diffReport, source: "CADRegressionResultsAnalyzerEngine.diff" };
            break;
          }
          case "cad_regression_analyzer_trend": {
            const { cadRegressionResultsAnalyzerEngine } = await import("../../engines/CADRegressionResultsAnalyzerEngine.js");
            const batchIds = params["batch_ids"] as string[];
            const stateDir = params["state_dir"] as string | undefined;
            if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
              throw new Error("cad_regression_analyzer_trend requires 'batch_ids' array (non-empty)");
            }
            const trendReport = await cadRegressionResultsAnalyzerEngine.trend(batchIds, stateDir);
            result = { trend: trendReport, source: "CADRegressionResultsAnalyzerEngine.trend" };
            break;
          }
          case "cad_regression_analyzer_hotspots": {
            const { cadRegressionResultsAnalyzerEngine } = await import("../../engines/CADRegressionResultsAnalyzerEngine.js");
            const batchIds = params["batch_ids"] as string[];
            const threshold = params["threshold"] as number | undefined;
            const minAppearances = params["min_appearances"] as number | undefined;
            const stateDir = params["state_dir"] as string | undefined;
            if (!batchIds || !Array.isArray(batchIds) || batchIds.length === 0) {
              throw new Error("cad_regression_analyzer_hotspots requires 'batch_ids' array (non-empty)");
            }
            const hotspotReport = await cadRegressionResultsAnalyzerEngine.hotspots(batchIds, threshold, minAppearances, stateDir);
            result = { hotspots: hotspotReport, source: "CADRegressionResultsAnalyzerEngine.hotspots" };
            break;
          }
          case "cad_augment_geometry": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const source = params["source"] as Parameters<typeof cadGeometricAugmentationEngine.augment>[0];
            if (!source) {
              throw new Error("cad_augment_geometry requires 'source' (CADGeometry)");
            }
            const augmented = cadGeometricAugmentationEngine.augment(source);
            result = { augmented, count: augmented.length, source: "CADGeometricAugmentationEngine.augment" };
            break;
          }
          case "cad_augment_batch": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const sources = params["sources"] as Parameters<typeof cadGeometricAugmentationEngine.augmentBatch>[0];
            if (!sources || !Array.isArray(sources)) {
              throw new Error("cad_augment_batch requires 'sources' array (CADGeometry[])");
            }
            const batchResult = cadGeometricAugmentationEngine.augmentBatch(sources);
            result = { ...batchResult, source: "CADGeometricAugmentationEngine.augmentBatch" };
            break;
          }
          case "cad_augment_stats": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const stats = cadGeometricAugmentationEngine.getStats();
            result = { stats, source: "CADGeometricAugmentationEngine.getStats" };
            break;
          }
          case "cad_augment_reset_stats": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            cadGeometricAugmentationEngine.resetStats();
            result = { reset: true, source: "CADGeometricAugmentationEngine.resetStats" };
            break;
          }
          case "cad_augment_configure": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const config = params["config"] as Parameters<typeof cadGeometricAugmentationEngine.configure>[0];
            if (!config) {
              throw new Error("cad_augment_configure requires 'config'");
            }
            cadGeometricAugmentationEngine.configure(config);
            result = { configured: true, source: "CADGeometricAugmentationEngine.configure" };
            break;
          }
          case "cad_augment_get_config": {
            const { cadGeometricAugmentationEngine } = await import("../../engines/CADGeometricAugmentationEngine.js");
            const config = cadGeometricAugmentationEngine.getConfig();
            result = { config, source: "CADGeometricAugmentationEngine.getConfig" };
            break;
          }
          case "cad_physics_gate_validate": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            const input = params["input"] as Parameters<typeof cadPhysicsConsistencyGateEngine.validate>[0];
            if (!input) {
              throw new Error("cad_physics_gate_validate requires 'input' (PhysicsValidationInput)");
            }
            const gateResult = cadPhysicsConsistencyGateEngine.validate(input);
            result = { ...gateResult, source: "CADPhysicsConsistencyGateEngine.validate" };
            break;
          }
          case "cad_physics_gate_validate_batch": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            const input = params["input"] as Parameters<typeof cadPhysicsConsistencyGateEngine.validateBatch>[0];
            if (!input) {
              throw new Error("cad_physics_gate_validate_batch requires 'input' (BatchValidationInput)");
            }
            const batchResult = cadPhysicsConsistencyGateEngine.validateBatch(input);
            result = { ...batchResult, source: "CADPhysicsConsistencyGateEngine.validateBatch" };
            break;
          }
          case "cad_physics_gate_constants": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            const isoGroup = params["iso_group"] as Parameters<typeof cadPhysicsConsistencyGateEngine.getPhysicsConstants>[0];
            if (!isoGroup) {
              throw new Error("cad_physics_gate_constants requires 'iso_group'");
            }
            const constants = cadPhysicsConsistencyGateEngine.getPhysicsConstants(isoGroup);
            result = { constants, source: "CADPhysicsConsistencyGateEngine.getPhysicsConstants" };
            break;
          }
          case "cad_physics_gate_stats": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            const stats = cadPhysicsConsistencyGateEngine.getStats();
            result = { stats, source: "CADPhysicsConsistencyGateEngine.getStats" };
            break;
          }
          case "cad_physics_gate_reset_stats": {
            const { cadPhysicsConsistencyGateEngine } = await import("../../engines/CADPhysicsConsistencyGateEngine.js");
            cadPhysicsConsistencyGateEngine.resetStats();
            result = { reset: true, source: "CADPhysicsConsistencyGateEngine.resetStats" };
            break;
          }
          case "cad_replication_set_target": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const target = params["target"] as Parameters<typeof cadReplicationDurabilityEngine.setTarget>[0];
            if (!target) {
              throw new Error("cad_replication_set_target requires 'target'");
            }
            cadReplicationDurabilityEngine.setTarget(target);
            result = { set: true, source: "CADReplicationDurabilityEngine.setTarget" };
            break;
          }
          case "cad_replication_register_replica": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            const loc = params["location"] as Parameters<typeof cadReplicationDurabilityEngine.registerReplica>[1] | undefined;
            if (!contentHash || !loc) {
              throw new Error("cad_replication_register_replica requires 'content_hash' and 'location' (ReplicaLocation object: { tier, region, sizeBytes, ... })");
            }
            const record = cadReplicationDurabilityEngine.registerReplica(contentHash, loc);
            result = { record, source: "CADReplicationDurabilityEngine.registerReplica" };
            break;
          }
          case "cad_replication_register_shard": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            const scheme = params["scheme"] as Parameters<typeof cadReplicationDurabilityEngine.registerShard>[1] | undefined;
            const shard = params["shard"] as Parameters<typeof cadReplicationDurabilityEngine.registerShard>[2] | undefined;
            if (!contentHash || !scheme || !shard) {
              throw new Error("cad_replication_register_shard requires 'content_hash', 'scheme' (ErasureScheme), and 'shard' (ErasureShard with location)");
            }
            const record = cadReplicationDurabilityEngine.registerShard(contentHash, scheme, shard);
            result = { record, source: "CADReplicationDurabilityEngine.registerShard" };
            break;
          }
          case "cad_replication_mark_replica_lost": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            const tier = params["tier"] as string;
            const region = params["region"] as string;
            if (!contentHash || !tier || !region) {
              throw new Error("cad_replication_mark_replica_lost requires 'content_hash', 'tier', 'region'");
            }
            const record = cadReplicationDurabilityEngine.markReplicaLost(contentHash, tier, region);
            result = { record, source: "CADReplicationDurabilityEngine.markReplicaLost" };
            break;
          }
          case "cad_replication_mark_shard_lost": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            const shardIndex = params["shard_index"] as number;
            if (!contentHash || shardIndex === undefined) {
              throw new Error("cad_replication_mark_shard_lost requires 'content_hash', 'shard_index'");
            }
            const record = cadReplicationDurabilityEngine.markShardLost(contentHash, shardIndex);
            result = { record, source: "CADReplicationDurabilityEngine.markShardLost" };
            break;
          }
          case "cad_replication_get": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const contentHash = params["content_hash"] as string;
            if (!contentHash) {
              throw new Error("cad_replication_get requires 'content_hash'");
            }
            const record = cadReplicationDurabilityEngine.get(contentHash);
            result = { record: record ?? null, found: !!record, source: "CADReplicationDurabilityEngine.get" };
            break;
          }
          case "cad_replication_merge": {
            const { cadReplicationDurabilityEngine } = await import("../../engines/CADReplicationDurabilityEngine.js");
            const remote = params["remote"] as Parameters<typeof cadReplicationDurabilityEngine.merge>[0];
            if (!remote) {
              throw new Error("cad_replication_merge requires 'remote' (ReplicationRecord)");
            }
            const merged = cadReplicationDurabilityEngine.merge(remote);
            result = { merged, source: "CADReplicationDurabilityEngine.merge" };
            break;
          }
          case "cad_revision_get_record": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            if (!drawingNumber || !revision) {
              throw new Error("cad_revision_get_record requires 'drawing_number' and 'revision'");
            }
            const record = cadRevisionPromotionWorkflowEngine.getRecord(drawingNumber, revision);
            result = { record: record ?? null, found: !!record, source: "CADRevisionPromotionWorkflowEngine.getRecord" };
            break;
          }
          case "cad_revision_list_by_drawing": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            if (!drawingNumber) {
              throw new Error("cad_revision_list_by_drawing requires 'drawing_number'");
            }
            const records = cadRevisionPromotionWorkflowEngine.listByDrawing(drawingNumber);
            result = { records, count: records.length, source: "CADRevisionPromotionWorkflowEngine.listByDrawing" };
            break;
          }
          case "cad_revision_get_current": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            if (!drawingNumber) {
              throw new Error("cad_revision_get_current requires 'drawing_number'");
            }
            const current = cadRevisionPromotionWorkflowEngine.getCurrent(drawingNumber);
            result = { current: current ?? null, found: !!current, source: "CADRevisionPromotionWorkflowEngine.getCurrent" };
            break;
          }
          case "cad_revision_create_draft": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            const author = params["author"] as string;
            if (!drawingNumber || !revision || !author) {
              throw new Error("cad_revision_create_draft requires 'drawing_number', 'revision', 'author'");
            }
            const record = cadRevisionPromotionWorkflowEngine.createDraft(drawingNumber, revision, author);
            result = { record, source: "CADRevisionPromotionWorkflowEngine.createDraft" };
            break;
          }
          case "cad_revision_submit_for_review": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            const submitter = params["submitter"] as string;
            if (!drawingNumber || !revision || !submitter) {
              throw new Error("cad_revision_submit_for_review requires 'drawing_number', 'revision', 'submitter'");
            }
            const record = cadRevisionPromotionWorkflowEngine.submitForReview(drawingNumber, revision, submitter);
            result = { record, source: "CADRevisionPromotionWorkflowEngine.submitForReview" };
            break;
          }
          case "cad_revision_revoke_to_draft": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            const revoker = params["revoker"] as string;
            const reason = params["reason"] as string | undefined;
            if (!drawingNumber || !revision || !revoker) {
              throw new Error("cad_revision_revoke_to_draft requires 'drawing_number', 'revision', 'revoker'");
            }
            const record = cadRevisionPromotionWorkflowEngine.revokeToDraft(drawingNumber, revision, revoker, reason);
            result = { record, source: "CADRevisionPromotionWorkflowEngine.revokeToDraft" };
            break;
          }
          case "cad_revision_reject": {
            const { cadRevisionPromotionWorkflowEngine } = await import("../../engines/CADRevisionPromotionWorkflowEngine.js");
            const drawingNumber = params["drawing_number"] as string;
            const revision = params["revision"] as string;
            const rejector = params["rejector"] as string;
            const reason = params["reason"] as string;
            if (!drawingNumber || !revision || !rejector || !reason) {
              throw new Error("cad_revision_reject requires 'drawing_number', 'revision', 'rejector', 'reason'");
            }
            const record = cadRevisionPromotionWorkflowEngine.reject(drawingNumber, revision, rejector, reason);
            result = { record, source: "CADRevisionPromotionWorkflowEngine.reject" };
            break;
          }
          case "cad_trainer_param_count": {
            const backend = params["backend"] as { getParamCount(): number } | undefined;
            if (!backend || typeof backend.getParamCount !== "function") {
              throw new Error("cad_trainer_param_count requires 'backend' (ModelBackend instance with getParamCount). Backend objects cannot cross MCP process boundaries; this action is for in-process orchestration callers only.");
            }
            const count = backend.getParamCount();
            result = { paramCount: count, source: "ModelBackend.getParamCount" };
            break;
          }
          case "cad_trainer_update_on_batch": {
            const backend = params["backend"] as { updateOnBatch(b: unknown, lr: number): { loss: number; gradNorm: number } } | undefined;
            const batch = params["batch"];
            const lr = params["learning_rate"] as number;
            if (!backend || typeof backend.updateOnBatch !== "function") {
              throw new Error("cad_trainer_update_on_batch requires 'backend' (ModelBackend instance with updateOnBatch). In-process callers only.");
            }
            if (!batch || lr === undefined) {
              throw new Error("cad_trainer_update_on_batch requires 'batch' (TrainingBatch) and 'learning_rate'");
            }
            const update = backend.updateOnBatch(batch, lr);
            result = { ...update, source: "ModelBackend.updateOnBatch" };
            break;
          }
          case "cad_trainer_score_sequence": {
            const backend = params["backend"] as { scoreSequence(s: unknown): number } | undefined;
            const seq = params["sequence"];
            if (!backend || typeof backend.scoreSequence !== "function") {
              throw new Error("cad_trainer_score_sequence requires 'backend' (ModelBackend instance with scoreSequence). In-process callers only.");
            }
            if (!seq) {
              throw new Error("cad_trainer_score_sequence requires 'sequence' (TokenSeq)");
            }
            const score = backend.scoreSequence(seq);
            result = { score, source: "ModelBackend.scoreSequence" };
            break;
          }
          case "cad_trainer_predict_next": {
            const backend = params["backend"] as { predictNext(c: unknown): number } | undefined;
            const ctx = params["context"];
            if (!backend || typeof backend.predictNext !== "function") {
              throw new Error("cad_trainer_predict_next requires 'backend' (ModelBackend instance with predictNext). In-process callers only.");
            }
            if (!ctx) {
              throw new Error("cad_trainer_predict_next requires 'context' (TokenSeq)");
            }
            const nextToken = backend.predictNext(ctx);
            result = { nextToken, source: "ModelBackend.predictNext" };
            break;
          }
          case "cad_trainer_serialize_checkpoint": {
            const { cadSequenceTrainerEngine } = await import("../../engines/CADSequenceTrainerEngine.js");
            const backend = params["backend"] as Parameters<typeof cadSequenceTrainerEngine.serializeCheckpoint>[0] | undefined;
            if (!backend) {
              throw new Error("cad_trainer_serialize_checkpoint requires 'backend' (ModelBackend instance). In-process callers only.");
            }
            const checkpoint = cadSequenceTrainerEngine.serializeCheckpoint(backend);
            result = { checkpoint, source: "CADSequenceTrainerEngine.serializeCheckpoint" };
            break;
          }
          case "cad_trainer_load_checkpoint": {
            const { cadSequenceTrainerEngine } = await import("../../engines/CADSequenceTrainerEngine.js");
            const backend = params["backend"] as Parameters<typeof cadSequenceTrainerEngine.loadCheckpoint>[0] | undefined;
            const data = params["data"] as string;
            if (!backend) {
              throw new Error("cad_trainer_load_checkpoint requires 'backend' (ModelBackend instance). In-process callers only.");
            }
            if (!data) {
              throw new Error("cad_trainer_load_checkpoint requires 'data' (checkpoint string)");
            }
            cadSequenceTrainerEngine.loadCheckpoint(backend, data);
            result = { loaded: true, source: "CADSequenceTrainerEngine.loadCheckpoint" };
            break;
          }
          case "cad_tenant_register": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const input = params["input"] as Parameters<typeof cadTenantNamespaceEngine.register>[0];
            if (!input) {
              throw new Error("cad_tenant_register requires 'input' (registration object)");
            }
            const content = cadTenantNamespaceEngine.register(input);
            result = { content, source: "CADTenantNamespaceEngine.register" };
            break;
          }
          case "cad_tenant_get": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const tenantId = params["tenant_id"] as string;
            const contentHash = params["content_hash"] as string;
            if (!tenantId || !contentHash) {
              throw new Error("cad_tenant_get requires 'tenant_id' and 'content_hash'");
            }
            const content = cadTenantNamespaceEngine.get(tenantId, contentHash);
            result = { content: content ?? null, found: !!content, source: "CADTenantNamespaceEngine.get" };
            break;
          }
          case "cad_tenant_list_by_tenant": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const tenantId = params["tenant_id"] as string;
            if (!tenantId) {
              throw new Error("cad_tenant_list_by_tenant requires 'tenant_id'");
            }
            const contents = cadTenantNamespaceEngine.listByTenant(tenantId);
            result = { contents, count: contents.length, source: "CADTenantNamespaceEngine.listByTenant" };
            break;
          }
          case "cad_tenant_list_all": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const contents = cadTenantNamespaceEngine.listAll();
            result = { contents, count: contents.length, source: "CADTenantNamespaceEngine.listAll" };
            break;
          }
          case "cad_tenant_can_access": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const tenantId = params["tenant_id"] as string;
            const contentHash = params["content_hash"] as string;
            const requestingTenant = params["requesting_tenant"] as string;
            if (!tenantId || !contentHash || !requestingTenant) {
              throw new Error("cad_tenant_can_access requires 'tenant_id', 'content_hash', 'requesting_tenant'");
            }
            const content = cadTenantNamespaceEngine.get(tenantId, contentHash);
            if (!content) {
              throw new Error(`cad_tenant_can_access: content not found for tenant_id=${tenantId}, content_hash=${contentHash}`);
            }
            const canAccess = cadTenantNamespaceEngine.canAccess(requestingTenant, content);
            result = { canAccess, source: "CADTenantNamespaceEngine.canAccess" };
            break;
          }
          case "cad_tenant_sign_nda": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const tenantId = params["tenant_id"] as string;
            const contentHash = params["content_hash"] as string;
            const signingTenant = params["signing_tenant"] as string;
            if (!tenantId || !contentHash || !signingTenant) {
              throw new Error("cad_tenant_sign_nda requires 'tenant_id', 'content_hash', 'signing_tenant'");
            }
            const content = cadTenantNamespaceEngine.signNDA(tenantId, contentHash, signingTenant);
            result = { content, source: "CADTenantNamespaceEngine.signNDA" };
            break;
          }
          case "cad_tenant_find_collisions": {
            const { cadTenantNamespaceEngine } = await import("../../engines/CADTenantNamespaceEngine.js");
            const collisions = cadTenantNamespaceEngine.findCollisions();
            result = { collisions, count: collisions.length, source: "CADTenantNamespaceEngine.findCollisions" };
            break;
          }
          case "cad_checkpoint_validate": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const input = params["input"];
            const error = cadTestCheckpointEngine.validate(input);
            result = { valid: error === null, error, source: "CADTestCheckpointEngine.validate" };
            break;
          }
          case "cad_checkpoint_create_cadence": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const opts = params["options"] as Parameters<typeof cadTestCheckpointEngine.createCadence>[0];
            const state = cadTestCheckpointEngine.createCadence(opts);
            result = { state, source: "CADTestCheckpointEngine.createCadence" };
            break;
          }
          case "cad_checkpoint_record_transition": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const state = params["state"] as Parameters<typeof cadTestCheckpointEngine.recordTransition>[0];
            const nowMs = params["now_ms"] as number | undefined;
            if (!state) {
              throw new Error("cad_checkpoint_record_transition requires 'state' (CheckpointCadenceState)");
            }
            const shouldSave = cadTestCheckpointEngine.recordTransition(state, nowMs);
            result = { shouldSave, state, source: "CADTestCheckpointEngine.recordTransition" };
            break;
          }
          case "cad_checkpoint_save": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const batch = params["batch"] as Parameters<typeof cadTestCheckpointEngine.save>[0];
            const outputPath = params["output_path"] as string;
            if (!batch || !outputPath) {
              throw new Error("cad_checkpoint_save requires 'batch' (TestBatch) and 'output_path'");
            }
            await cadTestCheckpointEngine.save(batch, outputPath);
            result = { saved: true, path: outputPath, source: "CADTestCheckpointEngine.save" };
            break;
          }
          case "cad_checkpoint_load": {
            const { cadTestCheckpointEngine } = await import("../../engines/CADTestCheckpointEngine.js");
            const inputPath = params["input_path"] as string;
            if (!inputPath) {
              throw new Error("cad_checkpoint_load requires 'input_path'");
            }
            const batch = await cadTestCheckpointEngine.load(inputPath);
            result = { batch: batch ?? null, found: !!batch, source: "CADTestCheckpointEngine.load" };
            break;
          }
          case "cad_token_vocab_size": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const size = cadTokenRepresentationEngine.vocabularySize();
            result = { size, source: "CADTokenRepresentationEngine.vocabularySize" };
            break;
          }
          case "cad_token_vocab_version": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const version = cadTokenRepresentationEngine.vocabularyVersion();
            result = { version, source: "CADTokenRepresentationEngine.vocabularyVersion" };
            break;
          }
          case "cad_token_get_id": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const name = params["name"] as string;
            if (!name) {
              throw new Error("cad_token_get_id requires 'name'");
            }
            const id = cadTokenRepresentationEngine.getTokenId(name);
            result = { id, source: "CADTokenRepresentationEngine.getTokenId" };
            break;
          }
          case "cad_token_get_name": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const id = params["id"] as number;
            if (id === undefined) {
              throw new Error("cad_token_get_name requires 'id'");
            }
            const name = cadTokenRepresentationEngine.getTokenName(id);
            result = { name: name ?? null, found: name !== null, source: "CADTokenRepresentationEngine.getTokenName" };
            break;
          }
          case "cad_token_get_def": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const nameOrId = params["name_or_id"] as string | number;
            if (nameOrId === undefined) {
              throw new Error("cad_token_get_def requires 'name_or_id'");
            }
            const def = cadTokenRepresentationEngine.getTokenDef(nameOrId);
            result = { def: def ?? null, found: !!def, source: "CADTokenRepresentationEngine.getTokenDef" };
            break;
          }
          case "cad_token_list_names": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const names = cadTokenRepresentationEngine.listTokenNames();
            result = { names, count: names.length, source: "CADTokenRepresentationEngine.listTokenNames" };
            break;
          }
          case "cad_token_supported_formats": {
            const { cadTokenRepresentationEngine } = await import("../../engines/CADTokenRepresentationEngine.js");
            const formats = cadTokenRepresentationEngine.supportedFormats();
            result = { formats, count: formats.length, source: "CADTokenRepresentationEngine.supportedFormats" };
            break;
          }
          case "cad_corpus_scan_only": {
            const { cadTrainingCorpusOrchestratorEngine } = await import("../../engines/CADTrainingCorpusOrchestratorEngine.js");
            const config = params["config"] as Parameters<typeof cadTrainingCorpusOrchestratorEngine.scanOnly>[0];
            if (!config || !config.rootPath) {
              throw new Error("cad_corpus_scan_only requires 'config' with 'rootPath'");
            }
            const files = cadTrainingCorpusOrchestratorEngine.scanOnly(config);
            result = { files, count: files.length, source: "CADTrainingCorpusOrchestratorEngine.scanOnly" };
            break;
          }
          case "cad_corpus_orchestrate": {
            const { cadTrainingCorpusOrchestratorEngine } = await import("../../engines/CADTrainingCorpusOrchestratorEngine.js");
            const config = params["config"] as Parameters<typeof cadTrainingCorpusOrchestratorEngine.orchestrate>[0];
            if (!config || !config.rootPath) {
              throw new Error("cad_corpus_orchestrate requires 'config' with 'rootPath'");
            }
            const orchestrationResult = cadTrainingCorpusOrchestratorEngine.orchestrate(config);
            result = { ...orchestrationResult, source: "CADTrainingCorpusOrchestratorEngine.orchestrate" };
            break;
          }
          // ──────────────────────────────────────────────────────────────────
          // ENGINE-WIRE-CAD-MS0/U-WIRE-CAD-BATCH1: 3 unwired CAD engines
          // ──────────────────────────────────────────────────────────────────
          case "cad_geometry_hash": {
            const { geometryHashGroupingEngine } = await import("../../engines/GeometryHashGroupingEngine.js");
            const rec = params["record"] as Parameters<typeof geometryHashGroupingEngine.geometryHash>[0];
            if (!rec) throw new Error("cad_geometry_hash requires 'record' (GeometryRecord)");
            const hash = geometryHashGroupingEngine.geometryHash(rec);
            result = { hash, source: "GeometryHashGroupingEngine.geometryHash" };
            break;
          }
          case "cad_geometry_assign_splits": {
            const { geometryHashGroupingEngine } = await import("../../engines/GeometryHashGroupingEngine.js");
            const records = params["records"] as Parameters<typeof geometryHashGroupingEngine.assignSplits>[0];
            if (!Array.isArray(records)) throw new Error("cad_geometry_assign_splits requires 'records' (GeometryRecord[])");
            const assignments = geometryHashGroupingEngine.assignSplits(records);
            const summary = geometryHashGroupingEngine.summarize(records, assignments);
            result = { assignments, summary, source: "GeometryHashGroupingEngine.assignSplits" };
            break;
          }
          case "cad_solidcam_chip_thickness": {
            const { SolidCamAlgorithmsEngine } = await import("../../engines/SolidCamAlgorithmsEngine.js");
            result = SolidCamAlgorithmsEngine.chipThickness(
              params as unknown as Parameters<typeof SolidCamAlgorithmsEngine.chipThickness>[0],
            );
            break;
          }
          case "cad_solidcam_engagement_geometry": {
            const { SolidCamAlgorithmsEngine } = await import("../../engines/SolidCamAlgorithmsEngine.js");
            result = SolidCamAlgorithmsEngine.engagementGeometry(
              params as unknown as Parameters<typeof SolidCamAlgorithmsEngine.engagementGeometry>[0],
            );
            break;
          }
          case "cad_solidcam_adjust_feed": {
            const { SolidCamAlgorithmsEngine } = await import("../../engines/SolidCamAlgorithmsEngine.js");
            result = SolidCamAlgorithmsEngine.adjustFeedForEngagement(
              params as unknown as Parameters<typeof SolidCamAlgorithmsEngine.adjustFeedForEngagement>[0],
            );
            break;
          }
          case "cad_solidworks_list_modules": {
            const { SolidWorksCADFunctionIndexEngine } = await import("../../engines/SolidWorksCADFunctionIndexEngine.js");
            result = { modules: SolidWorksCADFunctionIndexEngine.listModules() };
            break;
          }
          case "cad_solidworks_module": {
            const { SolidWorksCADFunctionIndexEngine } = await import("../../engines/SolidWorksCADFunctionIndexEngine.js");
            const moduleId = params["moduleId"] as string | undefined;
            if (typeof moduleId !== "string" || !moduleId) {
              throw new Error("cad_solidworks_module requires 'moduleId' (non-empty string)");
            }
            const mod = SolidWorksCADFunctionIndexEngine.getModule(moduleId);
            result = { moduleId, module: mod, found: mod !== null };
            break;
          }
          case "cad_solidworks_list_operations": {
            const { SolidWorksCADFunctionIndexEngine } = await import("../../engines/SolidWorksCADFunctionIndexEngine.js");
            const ops = SolidWorksCADFunctionIndexEngine.listAllOperations();
            result = { operations: ops, total: ops.length };
            break;
          }
          default:
            result = { error: `Unknown action: ${action as string}` };
        }

        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            metadata: { ...hookCtx.metadata, result },
          });
        } catch (postErr) {
          log.warn(`[prism_cad_automation] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_cad_automation");
      }
      return {
        content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }],
      };
    },
  );
}

// Exported for tests to introspect the action surface without a running server.
export const CAD_AUTOMATION_ACTIONS = ACTIONS;
