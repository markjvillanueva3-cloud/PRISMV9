/**
 * PRISM MCP Server - Product Dispatcher
 *
 * Routes 40 product actions to ProductEngine sub-engines.
 * Extracted from intelligenceDispatcher (SYS-MS1-U00).
 *
 * Sub-engines:
 *   productSFC  (10 actions) — Surface Finish Calculator
 *   productPPG  (10 actions) — Post Processor Generator
 *   productShop (10 actions) — Shop Manager
 *   productACNC (10 actions) — Adaptive CNC
 *
 * @milestone SYS-MS1-U00
 */

import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { slimResponse, getCurrentPressurePct, getSlimLevel } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_PRODUCT_SCHEMAS } from "../../schemas/productActionSchemas.js";
import { formatByLevel, type ResponseLevel } from "../../types/ResponseLevel.js";

/** Hook context shape varies by dispatcher — named alias avoids bare `as any` */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HookContext = any;

/** Action string is validated by Zod enum but `.includes()` needs wider type */
type ActionString = string;

// Lazy engine cache
let _productSFC: any, _productPPG: any, _productShop: any, _productACNC: any;

async function getProductEngine(name: string): Promise<any> {
  switch (name) {
    case "productSFC":  return _productSFC ??= (await import("../../engines/ProductEngine.js")).productSFC;
    case "productPPG":  return _productPPG ??= (await import("../../engines/ProductEngine.js")).productPPG;
    case "productShop": return _productShop ??= (await import("../../engines/ProductEngine.js")).productShop;
    case "productACNC": return _productACNC ??= (await import("../../engines/ProductEngine.js")).productACNC;
    default: throw new Error(`Unknown product engine: ${name}`);
  }
}

// ============================================================================
// ACTION ARRAYS
// ============================================================================

const SFC_ACTIONS = [
  "sfc_calculate", "sfc_compare", "sfc_optimize", "sfc_quick",
  "sfc_materials", "sfc_tools", "sfc_formulas", "sfc_safety",
  "sfc_history", "sfc_get",
] as const;

const PPG_ACTIONS = [
  "ppg_validate", "ppg_translate", "ppg_templates", "ppg_generate",
  "ppg_controllers", "ppg_compare", "ppg_syntax", "ppg_batch",
  "ppg_history", "ppg_get", "ppg_feature_select",
  "ppg_prove_out", "ppg_validate_limits", "ppg_validation_report",
  "ppg_library_search", "ppg_library_detail", "ppg_version_store", "ppg_version_diff",
  "ppg_benchmark_report",
  "ppg_optimization_report",
  "ppg_setup_sheet_auto",
  "ppg_cycle_time",
  "ppg_cycle_time_compare",
  "ppg_tool_change_optimize",
  "ppg_magazine_layout",
  "ppg_tool_sharing",
  "ppg_magazine_calculate",
  "ppg_hsm_inject",
  "ppg_sister_tool",
  "ppg_auto_probe",
  "ppg_prove_out_generate",
  "ppg_prove_out_promote",
  "ppg_air_cut_detect",
  "ppg_rapid_optimize",
  "ppg_cross_cam_inject",
  "ppg_rl_feedback",
  "ppg_rl_generate",
  "ppg_program_diff",
  "ppg_program_compare_full",
  "ppg_subprogram_extract",
  "ppg_check_tier",
  "ppg_list_features",
] as const;

const SHOP_ACTIONS = [
  "shop_job", "shop_cost", "shop_quote", "shop_schedule",
  "shop_dashboard", "shop_report", "shop_compare", "shop_materials",
  "shop_history", "shop_get",
] as const;

const ACNC_ACTIONS = [
  "acnc_program", "acnc_feature", "acnc_simulate", "acnc_output",
  "acnc_tools", "acnc_strategy", "acnc_validate", "acnc_batch",
  "acnc_history", "acnc_get",
] as const;

const ACTIONS = [
  ...SFC_ACTIONS,
  ...PPG_ACTIONS,
  ...SHOP_ACTIONS,
  ...ACNC_ACTIONS,
] as const;

// ============================================================================
// KEY VALUE EXTRACTOR (for slim responses)
// ============================================================================

function productExtractKeyValues(action: string, result: any): Record<string, any> {
  if (!result || typeof result !== "object") return { value: result };
  switch (action) {
    // SFC
    case "sfc_calculate":
      return { vc: result.cutting_speed_m_min, rpm: result.spindle_rpm, fz: result.feed_per_tooth_mm, power: result.power_kW, tool_life: result.tool_life_min, safety: result.safety_status };
    case "sfc_compare":
      return { approaches: result.approaches?.length, recommended: result.recommended };
    case "sfc_optimize":
      return { objective: result.objective, improvement: result.improvement_pct };
    case "sfc_quick":
      return { vc: result.result?.cutting_speed_m_min, rpm: result.result?.spindle_rpm };
    case "sfc_materials":
      return { count: result.materials?.length };
    case "sfc_tools":
      return { count: result.tools?.length };
    case "sfc_formulas":
      return { count: result.formulas?.length };
    case "sfc_safety":
      return { score: result.score, status: result.status };
    case "sfc_history":
      return { entries: result.history?.length };
    case "sfc_get":
      return { product: result.product, version: result.version };
    // PPG
    case "ppg_validate":
      return { valid: result.valid, score: result.score, errors: result.errors?.length, warnings: result.warnings?.length };
    case "ppg_translate":
      return { source: result.original_controller, target: result.target_controller, changes: result.changes_made?.length };
    case "ppg_templates":
      return { total: result.total };
    case "ppg_generate":
      return { controller: result.controller, operation: result.operation, line_count: result.line_count };
    case "ppg_controllers":
      return { total: result.total };
    case "ppg_compare":
      return { operation: result.operation, controllers_compared: result.controllers_compared };
    case "ppg_syntax":
      return { controller: result.controller, family: result.controller_family };
    case "ppg_batch":
      return { source: result.source_controller, targets: result.total_targets };
    case "ppg_history":
      return { entries: result.history?.length };
    case "ppg_get":
      return { product: result.product, version: result.version };
    case "ppg_library_search":
      return { total: result.total_matches, posts: result.posts?.length, facets: Object.keys(result.facets?.vendors ?? {}).length };
    case "ppg_library_detail":
      return { name: result.name, vendor: result.vendor, controller: result.controller, axes: result.axes };
    case "ppg_version_store":
      return { hash: result.short_hash, machine: result.machine_id, lines: result.line_count };
    case "ppg_version_diff":
      return { added: result.summary?.lines_added, removed: result.summary?.lines_removed, changed: result.summary?.lines_changed, config_diffs: result.summary?.config_diffs?.length };
    case "ppg_prove_out":
      return { modified_lines: result.summary?.modified_lines, feed_reductions: result.summary?.feed_reductions, rpm_caps: result.summary?.rpm_caps, stops_added: result.summary?.optional_stops_added, cycle_ratio: result.estimated_cycle_time_ratio };
    case "ppg_validate_limits":
      return { passed: result.summary?.passed, blocks: result.summary?.block_count, warns: result.summary?.warn_count, lines_flagged: result.summary?.lines_flagged };
    case "ppg_validation_report":
      return { passed: result.passed, format: result.metadata?.format, flags: result.metadata?.total_flags };
    case "ppg_benchmark_report":
      return { total_ms: result.total_duration_ms, pipeline_ms: result.pipeline_duration_ms, stages: result.stage_count, output_lines: result.output_lines, status: result.overall_status };
    case "ppg_optimization_report":
      return { cycle_time_saved_pct: result.summary?.cycle_time_saved_pct, tools_analyzed: result.summary?.tool_count, blocks_optimized: result.summary?.blocks_optimized, recommendations_count: result.recommendations?.length };
    case "ppg_setup_sheet_auto":
      return { tools: result.setup_sheet?.tools?.length, operations: result.setup_sheet?.operations?.length, offsets: result.setup_sheet?.work_offsets?.length, cycle_time_est_s: result.setup_sheet?.cycle_time_est_s };
    case "ppg_cycle_time":
      return { total_sec: result.total_seconds, cutting_sec: result.cutting_time, rapid_sec: result.rapid_time, tool_changes: result.tool_change_count, profile: result.machine_profile };
    case "ppg_cycle_time_compare":
      return { fastest: result.fastest_machine, slowest: result.slowest_machine, spread_sec: result.time_spread_seconds, machines: result.machines?.length };
    case "ppg_feature_select":
      return { features: result.selected_features?.length, confidence: result.confidence, cycle_time_pct: result.estimated_improvement?.cycle_time_pct, safety: result.estimated_improvement?.safety_score };
    case "ppg_check_tier":
      return { target: result.action, required_tier: result.required_tier, user_tier: result.user_tier, allowed: result.allowed };
    case "ppg_list_features":
      return { tiers: Object.keys(result.tiers ?? {}).length };
    // Shop Manager
    case "shop_job":
      return { material: result.material, operations: result.operations?.length, cycle_time_min: result.total_cycle_time_min };
    case "shop_cost":
      return { cost_per_part: result.cost_per_part, price_per_part: result.price_per_part, batch_size: result.batch_size };
    case "shop_quote":
      return { quote_number: result.quote_number, unit_price: result.pricing?.unit_price, quantity: result.pricing?.quantity };
    case "shop_schedule":
      return { makespan_min: result.metrics?.total_makespan_min, avg_utilization: result.metrics?.average_utilization_pct, jobs_on_time: result.metrics?.jobs_on_time, bottlenecks: result.bottlenecks?.length };
    case "shop_dashboard":
      return { total_machines: result.summary?.total_machines, utilization: result.summary?.average_utilization_pct };
    case "shop_report":
      return { cost_per_part: result.cost_summary?.cost_per_part, co2_kg: result.sustainability?.co2_kg_per_part };
    case "shop_compare":
      return { results: result.results?.length, recommendation: result.recommendation };
    case "shop_materials":
      return { total: result.total };
    case "shop_history":
      return { entries: result.history?.length };
    case "shop_get":
      return { product: result.product, version: result.version };
    // ACNC
    case "acnc_program":
      return { feature: result.feature?.feature, controller: result.gcode?.controller, safety: result.safety_score, ready: result.ready_to_run };
    case "acnc_feature":
      return { feature: result.feature, operations: result.operations?.length };
    case "acnc_simulate":
      return { safety: result.safety_status, cycle_time: result.estimated_cycle_time_min };
    case "acnc_output":
      return { controller: result.controller, operations: result.operations_count };
    case "acnc_tools":
      return { tool: result.tool_type, coating: result.coating };
    case "acnc_strategy":
      return { strategy: result.strategy, confidence: result.confidence };
    case "acnc_validate":
      return { valid: result.valid, score: result.score };
    case "acnc_batch":
      return { batch_size: result.batch_size, all_ready: result.all_ready };
    case "acnc_history":
      return { entries: result.history?.length };
    case "acnc_get":
      return { product: result.product, version: result.version };
    default:
      return result;
  }
}

// ============================================================================
// REGISTRATION
// ============================================================================

/** Registers product dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerProductDispatcher(server: any): void {
  server.tool(
    "prism_product",
    "Product tools: SFC (surface finish calc), PPG (post processor generator), Shop Manager (job costing/quoting), ACNC (adaptive CNC programming). Use 'action' param.",
    {
      action: z.enum(ACTIONS),
      params: z.record(z.string(), z.any()).optional(),
    },
    async ({ action, params: rawParams = {} }: { action: string; params?: Record<string, any> }) => {
      log.info(`[prism_product] Action: ${action}`);

      const params: Record<string, any> = { ...rawParams };

      try {
        // Normalize params
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          Object.assign(params, normalizeParams(rawParams));
        } catch { /* normalizer not available */ }

        // SFC machine-data shape bridge: the SFC web page (web/src/components/sfc/buildSfcRequest.ts)
        // posts FLAT machine_max_rpm/machine_power_kw to POST /api/v1/sfc/calculate -> prism_product:
        // sfc_calculate, but the pre-calculation machine-validation hooks read the NESTED
        // machine.spindle.* shape -> pre-machine-completeness-gate FALSE-BLOCKS every web SFC calc
        // (verified live: flat -> blocked, nested -> full result). calcDispatcher already bridges its
        // sf_* SFC actions; this wires the SAME shared bridge into the product path. Additive +
        // non-destructive: SFC compute actions only, never overwrites an explicit machine, and a
        // genuinely-incomplete spec STILL blocks (no safety weakening). See utils/sfcMachineBridge.ts.
        try {
          const { applySfcMachineBridge } = await import("../../utils/sfcMachineBridge.js");
          applySfcMachineBridge(action, params);
        } catch { /* bridge not available -- gate behaves as before (blocks a flat-only SFC payload) */ }

        // Pre-hooks
        const hookCtx = {
          operation: action,
          target: { type: "product" as const, id: action, data: params },
          metadata: { dispatcher: "productDispatcher", action, params },
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx as HookContext);
        if (preResult.blocked) {
          return {
            content: [{ type: "text" as const, text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy, reason: preResult.summary, action,
            }) }],
          };
        }

        // SYS-MS6: Validate params against per-action Zod schema
        const validation = validateActionParams(action, params, ACTION_PRODUCT_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_product"
          );
        }

        // Route to engine
        let result;
        if (action === "ppg_prove_out") {
          const { proveOutModeEngine } = await import("../../engines/ProveOutModeEngine.js");
          result = await proveOutModeEngine.process({
            action: "apply_prove_out",
            gcode: params.gcode,
            machine: params.machine,
            material: params.material,
            config: params.config,
          });
        } else if (action === "ppg_validate_limits") {
          const { postValidationHardeningEngine } = await import("../../engines/PostValidationHardeningEngine.js");
          result = await postValidationHardeningEngine.process({
            action: params.check_envelope_only ? "check_envelope" : "validate",
            gcode: params.gcode,
            machine: params.machine,
            skip_info: params.skip_info,
          });
        } else if (action === "ppg_validation_report") {
          const { postValidationHardeningEngine } = await import("../../engines/PostValidationHardeningEngine.js");
          const { postValidationReportEngine } = await import("../../engines/PostValidationReportEngine.js");
          const validation = await postValidationHardeningEngine.process({
            action: "validate",
            gcode: params.gcode,
            machine: params.machine,
          });
          result = await postValidationReportEngine.process({
            action: "generate_report",
            validation,
            machine: params.machine,
            format: params.format || "text",
            include_recommendations: params.include_recommendations ?? true,
            program_name: params.program_name,
          });
        } else if (action === "ppg_library_search" || action === "ppg_library_detail") {
          const { postLibraryCatalogEngine } = await import("../../engines/PostLibraryCatalogEngine.js");
          result = await postLibraryCatalogEngine.process({
            action: action === "ppg_library_search" ? "search" : "detail",
            query: params.query,
            post_id: params.post_id,
            machine: params.machine,
          });
        } else if (action === "ppg_version_store" || action === "ppg_version_diff") {
          const { postVersioningEngine } = await import("../../engines/PostVersioningEngine.js");
          result = await postVersioningEngine.process({
            action: action === "ppg_version_store" ? "store" : "diff",
            version: params.version,
            hash_a: params.hash_a,
            hash_b: params.hash_b,
            machine_id: params.machine_id,
          });
        } else if (action === "ppg_benchmark_report") {
          const { postProcessorPipelineEngine } = await import("../../engines/PostProcessorPipelineEngine.js");
          const benchStart = performance.now();
          const benchResult = await postProcessorPipelineEngine.process({
            gcode: params.gcode,
            machine: params.machine,
            material: params.material,
            tools: params.tools,
            controller: params.controller,
            aggressiveness: params.aggressiveness ?? 0.5,
          });
          const benchElapsed = performance.now() - benchStart;
          result = {
            total_duration_ms: benchElapsed,
            pipeline_duration_ms: benchResult.total_duration_ms,
            stage_count: benchResult.stages.length,
            stages: benchResult.stages.map(s => ({
              name: s.stage, phase: s.phase, status: s.status, duration_ms: s.duration_ms,
            })),
            output_lines: benchResult.output_gcode.split("\n").length,
            overall_status: benchResult.overall_status,
          };
        } else if (action === "ppg_optimization_report") {
          const { optimizationReportEngine } = await import("../../engines/OptimizationReportEngine.js");
          result = await optimizationReportEngine.generate({
            gcode: params.gcode,
            machine: params.machine,
            material: params.material,
            tools: params.tools,
            controller: params.controller,
            aggressiveness: params.aggressiveness,
            tolerance_mm: params.tolerance_mm,
            surface_finish_Ra: params.surface_finish_Ra,
            format: params.format ?? "json",
            program_name: params.program_name ?? "PROGRAM",
          });
        } else if (action === "ppg_setup_sheet_auto") {
          const { setupSheetFromGCodeEngine } = await import("../../engines/SetupSheetFromGCodeEngine.js");
          result = setupSheetFromGCodeEngine.generateSetupSheet(params.gcode, {
            controller: params.controller || "fanuc",
            part_number: params.part_number,
            operation_name: params.operation_name,
            machine_name: params.machine_name || params.machine?.name,
            include_tool_list: params.include_tool_list ?? true,
            include_offsets: params.include_offsets ?? true,
            include_safety: params.include_safety ?? true,
            operator: params.operator,
          });
        } else if (action === "ppg_cycle_time") {
          const { cycleTimeEstimatorEngine } = await import("../../engines/CycleTimeEstimatorEngine.js");
          result = cycleTimeEstimatorEngine.estimateFromGCode(params.gcode, {
            controller: params.controller || "fanuc",
            machine_profile: params.machine_profile,
            kinematics_override: params.kinematics_override,
            include_breakdown: params.include_breakdown ?? true,
            path_tolerance: params.path_tolerance,
            model_look_ahead: params.model_look_ahead,
          });
        } else if (action === "ppg_cycle_time_compare") {
          const { cycleTimeEstimatorEngine } = await import("../../engines/CycleTimeEstimatorEngine.js");
          result = cycleTimeEstimatorEngine.compareEstimates(
            params.gcode,
            (params.machines || []).map((m: any) => ({
              name: m.name || m.machine_name,
              controller: m.controller || "fanuc",
              machine_profile: m.machine_profile,
              kinematics_override: m.kinematics_override,
            })),
          );
        } else if (action === "ppg_tool_change_optimize") {
          const { toolChangeOptimizationEngine } = await import("../../engines/ToolChangeOptimizationEngine.js");
          const operations = (params.operations || []).map((op: any) => ({
            id: op.id || op.operation_id,
            tool_id: op.tool_id,
            tool_diameter_mm: op.tool_diameter_mm || op.diameter_mm || 10,
            num_flutes: op.num_flutes,
            tool_type: op.tool_type,
            operation_type: op.operation_type,
            cutting_time_min: op.cutting_time_min,
            required_Ra_um: op.required_Ra_um,
            feature_id: op.feature_id,
            prerequisites: op.prerequisites,
            wear_fraction: op.wear_fraction,
          }));
          const tools = (params.tools || []).map((t: any) => ({
            tool_id: t.tool_id,
            diameter_mm: t.diameter_mm || t.tool_diameter_mm || 10,
            length_mm: t.length_mm || 100,
            weight_kg: t.weight_kg,
            pockets_required: t.pockets_required,
            usage_rank: t.usage_rank,
            current_wear_pct: t.current_wear_pct,
            is_sister: t.is_sister,
            sister_of: t.sister_of,
          }));
          const capacity = params.magazine_capacity || 30;
          result = params.use_tsp
            ? toolChangeOptimizationEngine.optimizeWithTSP(operations, {
                magazine_capacity: capacity,
                magazine_type: params.magazine_type,
                atc_swap_sec: params.atc_swap_sec,
                time_per_slot_sec: params.time_per_slot_sec,
              })
            : toolChangeOptimizationEngine.optimizeToolChanges(operations, tools, capacity);
        } else if (action === "ppg_magazine_layout") {
          const { toolChangeOptimizationEngine } = await import("../../engines/ToolChangeOptimizationEngine.js");
          const tools = (params.tools || []).map((t: any) => ({
            tool_id: t.tool_id,
            diameter_mm: t.diameter_mm || t.tool_diameter_mm || 10,
            length_mm: t.length_mm || 100,
            weight_kg: t.weight_kg,
            pockets_required: t.pockets_required,
            usage_rank: t.usage_rank,
            current_wear_pct: t.current_wear_pct,
            is_sister: t.is_sister ?? false,
            sister_of: t.sister_of,
          }));
          result = toolChangeOptimizationEngine.optimizeMagazine(tools, {
            magazine_capacity: params.magazine_capacity || params.capacity || 30,
            magazine_type: params.magazine_type || "chain",
            atc_swap_sec: params.atc_swap_sec,
            time_per_slot_sec: params.time_per_slot_sec,
            blocked_pockets: params.blocked_pockets,
            heavy_pockets: params.heavy_pockets,
          }, params.operation_sequence);
        } else if (action === "ppg_tool_sharing") {
          const { toolChangeOptimizationEngine } = await import("../../engines/ToolChangeOptimizationEngine.js");
          const operations = (params.operations || []).map((op: any) => ({
            id: op.id || op.operation_id,
            tool_id: op.tool_id,
            tool_diameter_mm: op.tool_diameter_mm || op.diameter_mm || 10,
            num_flutes: op.num_flutes,
            tool_type: op.tool_type,
            operation_type: op.operation_type,
            cutting_time_min: op.cutting_time_min,
            required_Ra_um: op.required_Ra_um,
          }));
          result = toolChangeOptimizationEngine.suggestToolSharing(operations);
        } else if (action === "ppg_magazine_calculate") {
          const { ToolMagazineOptimizationEngine } = await import("../../engines/ToolMagazineOptimizationEngine.js");
          const engine = new ToolMagazineOptimizationEngine();
          result = engine.calculate({
            magazine_type: params.magazine_type,
            total_slots: params.total_slots || params.magazine_capacity,
            tools_required: params.tools_required,
            tool_change_time_s: params.tool_change_time_s || params.atc_swap_sec,
            index_time_per_slot_s: params.index_time_per_slot_s,
            strategy: params.strategy,
            tool_lives_min: params.tool_lives_min,
            program_tool_sequence: params.program_tool_sequence,
            sister_tool_enabled: params.sister_tool_enabled,
            spindle_to_magazine_s: params.spindle_to_magazine_s,
          });
        } else if (action === "ppg_hsm_inject") {
          const { AdvancedPostProcessorEngine } = await import("../../engines/AdvancedPostProcessorEngine.js");
          const engine = new AdvancedPostProcessorEngine();
          result = engine.enhance({
            controller: params.controller || "fanuc",
            gcode: params.gcode,
            hsm: {
              corner_rounding_tolerance: params.corner_tolerance_mm ?? 0.01,
              smoothing_mode: params.smoothing_mode ?? "finish",
              nurbs_interpolation: params.nurbs ?? false,
              arc_fitting: params.arc_fitting ?? true,
              arc_tolerance: params.arc_tolerance_mm ?? 0.005,
              min_arc_radius: params.min_arc_radius_mm ?? 1,
              max_arc_radius: params.max_arc_radius_mm ?? 1000,
              jerk_limit: params.jerk_limit,
              look_ahead_blocks: params.look_ahead_blocks,
            },
            tool_management: params.sister_tooling ? {
              sister_tooling: true,
              max_tool_life_minutes: params.max_tool_life_min ?? 60,
              break_detection: params.break_detection ?? false,
              break_detection_method: params.break_detection_method ?? "probe",
              wear_offset_increment: params.wear_offset_increment_mm ?? 0.005,
              auto_offset_update: params.auto_offset_update ?? false,
              tool_group_id: params.tool_group_id,
            } : undefined,
            feed_optimization: params.chip_thinning ? {
              chip_thinning: true,
              corner_slowdown: params.corner_slowdown ?? true,
              corner_radius_threshold: params.corner_radius_threshold_mm ?? 5,
              corner_feed_factor: params.corner_feed_factor ?? 0.5,
              plunge_rate_factor: params.plunge_rate_factor ?? 0.3,
              retract_rapid: params.retract_rapid ?? true,
            } : undefined,
          });
        } else if (action === "ppg_sister_tool") {
          const { AdvancedPostProcessorEngine } = await import("../../engines/AdvancedPostProcessorEngine.js");
          const engine = new AdvancedPostProcessorEngine();
          result = engine.enhance({
            controller: params.controller || "fanuc",
            gcode: params.gcode,
            tool_management: {
              sister_tooling: true,
              max_tool_life_minutes: params.max_tool_life_min ?? 60,
              break_detection: params.break_detection ?? true,
              break_detection_method: params.break_detection_method ?? "probe",
              wear_offset_increment: params.wear_offset_increment_mm ?? 0.005,
              auto_offset_update: params.auto_offset_update ?? false,
              tool_group_id: params.tool_group_id,
            },
          });
        } else if (action === "ppg_auto_probe") {
          const { ProbeRoutineGeneratorEngine } = await import("../../engines/ProbeRoutineGeneratorEngine.js");
          const engine = new ProbeRoutineGeneratorEngine();
          result = engine.generateWCSSetup({
            controller: params.controller || "fanuc",
            probe_tool_number: params.probe_tool_number ?? 99,
            work_offset: params.work_offset ?? "G54",
            features: (params.features || []).map((f: any) => ({
              type: f.type || "corner",
              position: f.position ?? { x: 0, y: 0, z: 0 },
              diameter: f.diameter,
              depth: f.depth,
              expected_value: f.expected_value,
              tolerance: f.tolerance,
            })),
            approach_distance: params.safe_z_mm ?? 100,
            feed_rate: params.probe_feed_mm_min ?? 200,
          });
        } else if (action === "ppg_prove_out_generate") {
          const { proveOutModeEngine } = await import("../../engines/ProveOutModeEngine.js");
          result = await proveOutModeEngine.process({
            action: "apply_prove_out",
            gcode: params.gcode,
            config: {
              feed_reduction: params.feed_reduction ?? 0.5,
              rpm_cap: params.rpm_cap ?? 0.7,
              insert_optional_stops: params.insert_optional_stops ?? true,
              add_prove_out_comments: params.insert_depth_comments ?? true,
              controller: params.controller || "fanuc",
            },
          });
        } else if (action === "ppg_prove_out_promote") {
          const { proveOutPromotionEngine } = await import("../../engines/ProveOutPromotionEngine.js");
          const promoResult = proveOutPromotionEngine.promote({
            prove_out_gcode: params.gcode || "",
            original_gcode: params.original_gcode,
            feed_reduction: params.feed_reduction,
            rpm_cap: params.rpm_cap,
            operator_name: params.operator_name,
            part_number: params.part_number,
            job_number: params.job_number,
            include_sign_off: params.include_sign_off,
          });
          result = {
            gcode: promoResult.production_gcode,
            lines_removed: promoResult.summary.lines_removed,
            feeds_restored: promoResult.summary.feeds_restored,
            rpms_restored: promoResult.summary.rpms_restored,
            diff: promoResult.diff,
            sign_off: promoResult.sign_off,
            restoration_method: promoResult.restoration_method,
            promoted: true,
          };
        } else if (action === "ppg_air_cut_detect") {
          // Support both raw G-code and structured air_cut_data
          if (params.gcode) {
            const { airCutDetectionEngine } = await import("../../engines/AirCutDetectionEngine.js");
            const airResult = airCutDetectionEngine.detect({
              gcode: params.gcode,
              controller: params.controller,
              retract_z: params.retract_z,
              stock_top_z: params.stock_top_z,
              rapid_rate_mm_min: params.rapid_rate_mm_min,
            });
            result = {
              detections: airResult.detections,
              total_time_wasted_sec: airResult.total_time_wasted_sec,
              detection_count: airResult.detections.length,
              optimized_gcode: airResult.optimized_gcode,
              summary: airResult.summary,
              report: airResult.report,
            };
          } else {
            const { rapidRepositionOptEngine } = await import("../../engines/RapidRepositionOptEngine.js");
            const airResult = rapidRepositionOptEngine.detectAirCuts({
              air_cut_data: params.air_cut_data,
              moves: params.moves,
            });
            result = {
              detections: airResult.detections,
              total_time_wasted_sec: airResult.total_time_wasted_sec,
              detection_count: airResult.detections.length,
            };
          }
        } else if (action === "ppg_rapid_optimize") {
          const { rapidRepositionOptEngine } = await import("../../engines/RapidRepositionOptEngine.js");
          result = rapidRepositionOptEngine.fullOptimize({
            air_cut_data: params.air_cut_data,
            moves: params.moves,
            magazine: params.magazine,
          });
        } else if (action === "ppg_cross_cam_inject") {
          const { masterPostProcessorEngine } = await import("../../engines/MasterPostProcessorEngine.js");
          // Build minimal segments from raw G-code for cross-CAM processing
          const segments = [{
            gcode: params.gcode || "",
            source_cam: params.source_cam || "generic",
            tool_number: 1,
            operation_type: "general",
          }];
          result = masterPostProcessorEngine.process(segments as any, {
            controller: params.controller || "fanuc",
            enable_cross_cam_features: params.enable_cross_cam ?? true,
            enable_hsm: params.enable_hsm ?? true,
            enable_feed_optimization: params.enable_feed_optimization ?? true,
          });
        } else if (action === "ppg_rl_feedback") {
          const { rlPostProcessorEngine } = await import("../../engines/RLPostProcessorEngine.js");
          const processor = rlPostProcessorEngine.createProcessor(params.controller || "fanuc");
          result = rlPostProcessorEngine.learn(processor, {
            stateKey: params.state_key || `program_${params.program_id || "unknown"}`,
            actionKey: params.action_key || "default",
            error: params.outcome === "tool_broke" || params.outcome === "crashed",
            executionTime: params.execution_time_sec ?? 60,
            expectedTime: params.expected_time_sec ?? 60,
            surfaceQuality: params.surface_quality ?? 0.8,
            codeLineIndex: params.line_index ?? 0,
          });
        } else if (action === "ppg_rl_generate") {
          const { rlPostProcessorEngine } = await import("../../engines/RLPostProcessorEngine.js");
          const processor = rlPostProcessorEngine.createProcessor(params.controller || "fanuc");
          // Generate requires toolpath moves — pass through if provided
          result = rlPostProcessorEngine.generateCode(
            processor,
            params.toolpath_moves || [],
            { programNumber: params.program_number, deterministic: params.deterministic ?? true },
          );
        } else if (action === "ppg_program_diff") {
          const { programCompareEngine } = await import("../../engines/ProgramCompareEngine.js");
          result = programCompareEngine.diffGCode(params.gcode_a, params.gcode_b);
        } else if (action === "ppg_program_compare_full") {
          const { programCompareEngine } = await import("../../engines/ProgramCompareEngine.js");
          const comparison = programCompareEngine.compare(params.gcode_a, params.gcode_b);
          result = {
            ...comparison,
            report: programCompareEngine.generateReport(comparison),
          };
        } else if (action === "ppg_subprogram_extract") {
          const { subprogramStructureEngine } = await import("../../engines/SubprogramStructureEngine.js");
          const controllerMap: Record<string, string> = {
            fanuc: "generic_fanuc", haas: "haas_ngc", mazak: "mazak_smooth_ai",
            okuma: "okuma_osp_p300", siemens: "siemens_840d", heidenhain: "heidenhain_tnc640",
          };
          const family = controllerMap[params.controller || "fanuc"] || "generic_fanuc";
          const extractResult = subprogramStructureEngine.analyze({
            gcode: params.gcode || "",
            controller_family: family as any,
            min_repeats: params.min_repeats ?? 2,
            min_block_length: params.min_block_length ?? 3,
            starting_sub_number: params.starting_sub_number ?? 1000,
          });
          result = {
            main_program: extractResult.main_program,
            subprograms: extractResult.subprograms,
            original_lines: extractResult.analysis.original_lines,
            restructured_lines: extractResult.analysis.restructured_lines,
            subprogram_count: extractResult.analysis.subprogram_count,
            line_savings: extractResult.analysis.total_line_savings,
            savings_percent: extractResult.analysis.savings_percent,
            patterns_detected: extractResult.analysis.patterns_detected.length,
            dialect: extractResult.dialect,
            offer: extractResult.analysis.total_line_savings > 0
              ? `Convert ${extractResult.analysis.patterns_detected.length} repeated patterns to ${extractResult.dialect} subprograms? Saves ${extractResult.analysis.total_line_savings} lines (${extractResult.analysis.savings_percent.toFixed(1)}%).`
              : "No repeating patterns detected for subprogram extraction.",
            warnings: extractResult.warnings,
          };
        } else if (action === "ppg_check_tier") {
          // PP-REV-MS7: Feature tier gate — checks if an action is available for a given tier
          const PP_TIER_MAP: Record<string, "free" | "pro" | "production" | "enterprise"> = {
            // Free
            ppg_generate: "free", ppg_validate: "free", ppg_syntax: "free",
            // Pro
            ppg_optimization_report: "pro", ppg_setup_sheet_auto: "pro",
            ppg_cycle_time: "pro", ppg_cycle_time_compare: "pro",
            ppg_prove_out_generate: "pro", ppg_prove_out_promote: "pro",
            ppg_program_diff: "pro", ppg_program_compare_full: "pro",
            ppg_feature_select: "pro", ppg_hsm_inject: "pro",
            // Production
            ppg_tool_change_optimize: "production", ppg_magazine_layout: "production",
            ppg_tool_sharing: "production", ppg_magazine_calculate: "production",
            ppg_sister_tool: "production", ppg_auto_probe: "production",
            ppg_air_cut_detect: "production", ppg_rapid_optimize: "production",
            ppg_subprogram_extract: "production",
            // Enterprise
            ppg_cross_cam_inject: "enterprise", ppg_rl_feedback: "enterprise",
            ppg_rl_generate: "enterprise",
          };
          const TIER_RANK: Record<string, number> = { free: 0, pro: 1, production: 2, enterprise: 3 };
          const targetAction = params.target_action || "";
          const userTier = params.user_tier || "free";
          const requiredTier = PP_TIER_MAP[targetAction] || "free";
          const allowed = TIER_RANK[userTier] >= TIER_RANK[requiredTier];
          result = {
            action: targetAction,
            required_tier: requiredTier,
            user_tier: userTier,
            allowed,
            upgrade_prompt: allowed ? null : `Upgrade to ${requiredTier} ($${requiredTier === "pro" ? 79 : requiredTier === "production" ? 199 : 499}/mo) to unlock ${targetAction}`,
          };
        } else if (action === "ppg_list_features") {
          // PP-REV-MS7: List all PP features grouped by tier
          result = {
            tiers: {
              free: {
                price_monthly: 0,
                features: ["Basic G-code generation", "Syntax validation", "1 controller (Fanuc)"],
                actions: ["ppg_generate", "ppg_validate", "ppg_syntax"],
              },
              pro: {
                price_monthly: 79,
                features: [
                  "Per-block optimization report", "Setup sheet auto-generation",
                  "Cycle time prediction + machine comparison", "Prove-out workflow",
                  "Program diff + revision control", "HSM code injection",
                  "Feature auto-selection", "11 controllers",
                ],
                actions: ["ppg_optimization_report", "ppg_setup_sheet_auto", "ppg_cycle_time",
                  "ppg_cycle_time_compare", "ppg_prove_out_generate", "ppg_prove_out_promote",
                  "ppg_program_diff", "ppg_program_compare_full", "ppg_feature_select", "ppg_hsm_inject"],
              },
              production: {
                price_monthly: 199,
                features: [
                  "Tool change optimization (TSP)", "Magazine layout optimization",
                  "Tool sharing consolidation", "Sister tool management",
                  "Auto probe routine generation", "Air-cut detection + elimination",
                  "Rapid repositioning optimization",
                  "Subprogram extraction (auto-detect repeating patterns)",
                ],
                actions: ["ppg_tool_change_optimize", "ppg_magazine_layout", "ppg_tool_sharing",
                  "ppg_magazine_calculate", "ppg_sister_tool", "ppg_auto_probe",
                  "ppg_air_cut_detect", "ppg_rapid_optimize", "ppg_subprogram_extract"],
              },
              enterprise: {
                price_monthly: 499,
                features: [
                  "Cross-CAM feature injection", "RL learning feedback loop",
                  "AI-optimized code generation", "Fleet management", "API access",
                ],
                actions: ["ppg_cross_cam_inject", "ppg_rl_feedback", "ppg_rl_generate"],
              },
            },
          };
        } else if (action === "ppg_feature_select") {
          const { postSelectionEngine } = await import("../../engines/PostSelectionEngine.js");
          result = postSelectionEngine.compute({
            machine: {
              controller: params.controller || "fanuc",
              max_rpm: params.max_rpm || 12000,
              spindle_power_kw: params.spindle_power_kw || 15,
              axis_count: params.axis_count || 3,
              has_tsc: params.has_tsc ?? false,
              has_probing: params.has_probing ?? false,
              has_rigid_tapping: params.has_rigid_tapping ?? true,
              taper: params.taper || "BT40",
            },
            part: {
              complexity: params.complexity || "moderate",
              tolerance_mm: params.tolerance_mm || 0.05,
              surface_finish_target_um: params.surface_finish_target_um || 3.2,
              has_deep_pockets: params.has_deep_pockets ?? false,
              has_thin_walls: params.has_thin_walls ?? false,
              has_tight_corners: params.has_tight_corners ?? false,
              max_depth_mm: params.max_depth_mm || 20,
              estimated_cycle_time_min: params.estimated_cycle_time_min || 30,
            },
            material: {
              iso_group: params.iso_group || params.material_iso_group || "P",
              hardness_hrc: params.hardness_hrc,
              thermal_sensitivity: params.thermal_sensitivity || "medium",
            },
            cam_source: params.cam_source || "generic",
            operation_type: params.operation_type || "roughing",
            tool_count: params.tool_count || 6,
            production_volume: params.production_volume || "medium",
          });
        } else {
          result = SFC_ACTIONS.includes(action as ActionString as typeof SFC_ACTIONS[number])
          ? await (await getProductEngine("productSFC"))(action, params)
          : PPG_ACTIONS.includes(action as ActionString as typeof PPG_ACTIONS[number])
          ? await (await getProductEngine("productPPG"))(action, params)
          : SHOP_ACTIONS.includes(action as ActionString as typeof SHOP_ACTIONS[number])
          ? await (await getProductEngine("productShop"))(action, params)
          : await (await getProductEngine("productACNC"))(action, params);
        }

        // Post-hooks
        await hookExecutor.execute("post-calculation", {
          ...hookCtx,
          target: { ...hookCtx.target, data: { ...params, result } },
        } as HookContext);

        // Response formatting
        if (params.response_level) {
          const formatted = formatByLevel(
            result,
            params.response_level as ResponseLevel,
            (r: any) => productExtractKeyValues(action, r)
          );
          return { content: [{ type: "text" as const, text: JSON.stringify(formatted) }] };
        }

        return { content: [{ type: "text" as const, text: JSON.stringify({ action, ...result }) }] };
      } catch (err: any) {
        log.error(`[prism_product] ${action} failed: ${err.message}`);
        return dispatcherError(err, action, "prism_product");
      }
    }
  );
}
