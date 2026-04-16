/**
 * prism_turning — Turning-Specific Dispatcher
 * *** SAFETY CRITICAL *** — clamping forces affect workpiece ejection risk
 *
 * 6 actions: chuck_force, tailstock, steady_rest, live_tool, bar_pull, thread_single_point
 *
 * Engine dependencies: ChuckJawForceEngine, TailstockForceEngine,
 *   SteadyRestPlacementEngine, LiveToolingEngine, BarPullerTimingEngine,
 *   SinglePointThreadEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { TURNING_ACTION_SCHEMAS } from "../../schemas/turningActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { validateCrossFieldPhysics } from "../../validation/crossFieldPhysics.js";

let _chuck: any, _tail: any, _steady: any, _live: any, _bar: any, _thread: any, _partoff: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "chuck": return _chuck ??= (await import("../../engines/ChuckJawForceEngine.js")).chuckJawForceEngine;
    case "tail": return _tail ??= (await import("../../engines/TailstockForceEngine.js")).tailstockForceEngine;
    case "steady": return _steady ??= (await import("../../engines/SteadyRestPlacementEngine.js")).steadyRestPlacementEngine;
    case "live": return _live ??= (await import("../../engines/LiveToolingEngine.js")).liveToolingEngine;
    case "bar": return _bar ??= (await import("../../engines/BarPullerTimingEngine.js")).barPullerTimingEngine;
    case "thread": return _thread ??= (await import("../../engines/SinglePointThreadEngine.js")).singlePointThreadEngine;
    case "partoff": return _partoff ??= (await import("../../engines/PartOffForceEngine.js")).partOffForceEngine;
    default: throw new Error(`Unknown turning engine: ${name}`);
  }
}

const ACTIONS = [
  "chuck_force", "tailstock", "steady_rest",
  "live_tool", "bar_pull", "thread_single_point",
  "part_off_force", "thread_turning_calc",
  "turning_assemble_program", "turning_auto_tools", "turning_cycle_time", "turning_validate",
  "mill_turn_live_tool", "mill_turn_sub_spindle", "mill_turn_multi_channel",
  "mill_turn_bar_feeder", "mill_turn_swiss",
  // LATHE-MS0: Collision zone + safety checks
  "lathe_collision_check", "lathe_swing_check", "lathe_grooving_overhang",
  "lathe_chip_thickness", "lathe_boring_reach", "lathe_g71_type",
  "lathe_boring_taper_comp", "lathe_springback_comp",
  // LATHE-MS7: Physics & science hardening
  "lathe_chatter_analysis", "lathe_hard_turning", "lathe_thread_schedule",
  "lathe_drill_thrust", "lathe_parting_force", "lathe_beam_deflection",
  "lathe_chip_breaking", "lathe_peck_schedule", "lathe_bore_dwell",
  // LLM-INTEL-6: Lathe AI reasoning
  "lathe_macro_decision", "lathe_live_plan", "lathe_multi_turret_safety",
  "lathe_swiss_decision", "lathe_millturn_plan", "lathe_complete_analysis",
  // LLM-INTEL-7: Lathe CAM Intelligence
  "lathe_cam_template", "lathe_cam_toolpath", "lathe_cam_sequence",
  "lathe_cam_workholding", "lathe_cam_mrr_optimize", "lathe_cam_analyze",
  "lathe_cam_feature_map", "lathe_cam_interrupted_cut",
  // LATHE-OPUS-AI: Claude Opus-level reasoning + knowledge
  "lathe_opus_analyze", "lathe_opus_optimize", "lathe_opus_reasoning",
  "lathe_opus_counterfactual", "lathe_opus_hybrid_strategy",
  "lathe_knowledge_detect_mistakes", "lathe_knowledge_score_program",
  "lathe_knowledge_generate_improvements", "lathe_knowledge_best_practices",
  // LATHE-DEEP-AI: Advanced neural network + reasoning engines
  "lathe_attention_analyze", "lathe_attention_visualize", "lathe_attention_dependencies",
  "lathe_causal_effect", "lathe_causal_counterfactual", "lathe_causal_discover",
  "lathe_ensemble_predict", "lathe_ensemble_train", "lathe_ensemble_evaluate",
  "lathe_knowledge_graph_query", "lathe_knowledge_graph_path", "lathe_knowledge_graph_reason",
  "lathe_rl_select_action", "lathe_rl_train", "lathe_rl_evaluate",
  "lathe_orchestrate", "lathe_orchestrate_deep", "lathe_orchestrate_quick",
  // LATHE-DEEP-AI-MS2: Advanced ML engines
  "lathe_meta_adapt", "lathe_meta_few_shot", "lathe_meta_prototype",
  "lathe_bayesian_optimize", "lathe_bayesian_uncertainty", "lathe_bayesian_pareto",
  "lathe_anomaly_detect", "lathe_anomaly_program", "lathe_anomaly_explain",
  "lathe_genetic_optimize", "lathe_genetic_nsga", "lathe_genetic_sequence",
  "lathe_transfer_knowledge", "lathe_transfer_material", "lathe_transfer_machine",
  "lathe_active_select", "lathe_active_suggest", "lathe_active_feedback",
  // LATHE-UNIFIED-SCIENCE: PhD-level physics/chemistry/metallurgy integration
  "lathe_unified_analyze", "lathe_unified_recommend", "lathe_unified_forces",
  "lathe_unified_thermal", "lathe_unified_metallurgy", "lathe_unified_chemistry",
  // MS2: Vendor Turning Catalog Actions (U-LAT23-U-LAT25)
  "lathe_vendor_tool_lookup", "lathe_insert_grade_select", "lathe_iso_code_resolve",
  // MS3: Machine Kinematics Actions (U-LAT30)
  "lathe_machine_kinematics_lookup",
  // MS5: HyperMILL Turning Strategy Actions (U-LAT39)
  "lathe_hypermill_strategy_lookup",
  // MS5: Mark's MULTUS Pattern Actions (U-LAT42)
  "lathe_pattern_inject",
  // MS7: Fusion Lathe Post Lookup (U-LAT54)
  "lathe_fusion_post_lookup",
  // MS8: Tribal Knowledge Integration (U-LAT57-60)
  "lathe_tribal_activate",
  "lathe_tribal_speedfeed",
  "lathe_tribal_postprocessor",
  "lathe_tribal_quality",
  "lathe_tribal_autoprogram",
  // MS8: Lathe Awareness Snapshot (U-LAT64)
  "lathe_awareness_snapshot",
  // MS8: Lathe Master Orchestrator Facade (U-LAT61)
  "lathe_orchestrate_facade",
  // MS9: Programming Style Selector (U-LAT68, U-LAT69)
  "lathe_select_programming_style",
  "lathe_compare_programming_costs",
  // MS10: Program Catalog Index & Retrieval (U-LAT73, U-LAT74, U-LAT75)
  "lathe_find_similar_programs",
  "lathe_programming_history",
  "lathe_catalog_stats",
  // MS11: Programming Cost Model (U-LAT77-U-LAT82)
  "lathe_estimate_programming_cost",
  "lathe_compare_programming_approaches",
  "lathe_break_even_analysis",
  // MS12: Part Family Planning (U-LAT85, U-LAT86)
  "lathe_family_planning",
  "lathe_macro_roi",
] as const;

/** Registers turning dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerTurningDispatcher(server: any): void {
  server.tool(
    "prism_turning",
    `Turning-specific dispatcher — SAFETY CRITICAL. Chuck jaw force, tailstock, steady rest, live tooling, bar puller, single-point threading.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_turning] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation — SAFETY CRITICAL
        const validation = validateActionParams(action, params, TURNING_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_turning"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS — blocks unsafe turning params
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "turningDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action,
            }) }]
          };
        }

        switch (action) {
          case "chuck_force": {
            const engine = await getEngine("chuck");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "ChuckJawForceEngine method not found" };
            break;
          }
          case "tailstock": {
            const engine = await getEngine("tail");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "TailstockForceEngine method not found" };
            break;
          }
          case "steady_rest": {
            const engine = await getEngine("steady");
            result = engine.place?.(params) ?? { error: "SteadyRestPlacementEngine method not found" };
            break;
          }
          case "live_tool": {
            const engine = await getEngine("live");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "LiveToolingEngine method not found" };
            break;
          }
          case "bar_pull": {
            const engine = await getEngine("bar");
            result = engine.calculate?.(params) ?? engine.optimize?.(params) ?? engine.compute?.(params) ?? { error: "BarPullerTimingEngine method not found" };
            break;
          }
          case "thread_single_point": {
            const engine = await getEngine("thread");
            result = engine.calculatePassPlan?.(params) ?? { error: "SinglePointThreadEngine method not found" };
            break;
          }
          case "part_off_force": {
            const engine = await getEngine("partoff");
            result = engine.calculate?.(params) ?? { error: "PartOffForceEngine method not found" };
            break;
          }
          case "thread_turning_calc": {
            const { threadTurningEngine } = await import("../../engines/ThreadTurningEngine.js");
            result = threadTurningEngine.calculate(params as any);
            break;
          }
          case "turning_assemble_program": {
            const { turningProgramAssemblerEngine } = await import("../../engines/TurningProgramAssemblerEngine.js");
            result = await turningProgramAssemblerEngine.assembleTurningProgram(params as any);
            break;
          }
          case "turning_auto_tools": {
            const { turningProgramAssemblerEngine } = await import("../../engines/TurningProgramAssemblerEngine.js");
            result = turningProgramAssemblerEngine.autoSelectTools(params as any);
            break;
          }
          case "turning_cycle_time": {
            const { turningProgramAssemblerEngine } = await import("../../engines/TurningProgramAssemblerEngine.js");
            result = turningProgramAssemblerEngine.estimateCycleTime(params as any);
            break;
          }
          case "turning_validate": {
            const { turningProgramAssemblerEngine } = await import("../../engines/TurningProgramAssemblerEngine.js");
            result = await turningProgramAssemblerEngine.validateProgram(params as any);
            break;
          }
          case "mill_turn_live_tool": {
            const { millTurnSwissPipelineEngine: mte } = await import("../../engines/MillTurnSwissPipelineEngine.js");
            result = mte.calculate({ action: "live_tool_calc", params: params as any });
            break;
          }
          case "mill_turn_sub_spindle": {
            const { millTurnSwissPipelineEngine: mte } = await import("../../engines/MillTurnSwissPipelineEngine.js");
            result = mte.calculate({ action: "sub_spindle_transfer", params: params as any });
            break;
          }
          case "mill_turn_multi_channel": {
            const { millTurnSwissPipelineEngine: mte } = await import("../../engines/MillTurnSwissPipelineEngine.js");
            result = mte.calculate({ action: "multi_channel_program", params: params as any });
            break;
          }
          case "mill_turn_bar_feeder": {
            const { millTurnSwissPipelineEngine: mte } = await import("../../engines/MillTurnSwissPipelineEngine.js");
            result = mte.calculate({ action: "bar_feeder_calc", params: params as any });
            break;
          }
          case "mill_turn_swiss": {
            const { millTurnSwissPipelineEngine: mte } = await import("../../engines/MillTurnSwissPipelineEngine.js");
            result = mte.calculate({ action: "swiss_machining", params: params as any });
            break;
          }
          // LATHE-MS0: Collision zone actions
          case "lathe_collision_check": {
            const { latheCollisionZoneEngine: lcz } = await import("../../engines/LatheCollisionZoneEngine.js");
            result = lcz.checkAll(params as any);
            break;
          }
          case "lathe_swing_check": {
            const { latheCollisionZoneEngine: lcz } = await import("../../engines/LatheCollisionZoneEngine.js");
            result = lcz.checkMachineSwing(params as any);
            break;
          }
          case "lathe_grooving_overhang": {
            const { latheCollisionZoneEngine: lcz } = await import("../../engines/LatheCollisionZoneEngine.js");
            result = lcz.checkGroovingOverhang({
              station: params.station ?? 1,
              tool_type: params.tool_type ?? "grooving",
              tool_stickout_mm: params.tool_stickout_mm ?? params.extension_mm ?? 20,
              holder_protrusion_mm: params.holder_protrusion_mm ?? 30,
              diameter_mm: params.diameter_mm ?? 20,
              blade_width_mm: params.blade_width_mm ?? 3,
            });
            break;
          }
          case "lathe_chip_thickness": {
            const { latheCollisionZoneEngine: lcz } = await import("../../engines/LatheCollisionZoneEngine.js");
            result = lcz.checkMinChipThickness(
              params.feed_per_rev_mm ?? 0.1,
              params.approach_angle_deg ?? 95,
              params.edge_radius_mm ?? 0.02,
            );
            break;
          }
          case "lathe_boring_reach": {
            const { latheCollisionZoneEngine: lcz } = await import("../../engines/LatheCollisionZoneEngine.js");
            result = lcz.checkBoringBarReach({
              station: params.station ?? 1,
              tool_type: "boring",
              tool_stickout_mm: params.tool_stickout_mm ?? 40,
              holder_protrusion_mm: params.holder_protrusion_mm ?? 30,
              diameter_mm: params.bore_diameter_mm ?? 25,
              bar_diameter_mm: params.bar_diameter_mm ?? 16,
              bar_material: params.bar_material ?? "steel",
              bore_depth_mm: params.bore_depth_mm ?? 50,
            });
            break;
          }
          case "lathe_g71_type": {
            const { latheCollisionZoneEngine: lcz } = await import("../../engines/LatheCollisionZoneEngine.js");
            result = lcz.detectG71Type(params.profile ?? []);
            break;
          }
          case "lathe_boring_taper_comp": {
            const { latheCollisionZoneEngine: lcz } = await import("../../engines/LatheCollisionZoneEngine.js");
            result = lcz.calculateBoringTaperCompensation(
              params.bar_diameter_mm ?? 16,
              params.bar_material ?? "steel",
              params.bore_depth_mm ?? 50,
              params.cutting_force_N ?? 500,
              params.num_z_points ?? 10,
            );
            break;
          }
          case "lathe_springback_comp": {
            const { latheCollisionZoneEngine: lcz } = await import("../../engines/LatheCollisionZoneEngine.js");
            result = lcz.calculateSpringbackCompensation(
              params.bar_diameter_mm ?? 16,
              params.bar_material ?? "steel",
              params.depth_of_cut_mm ?? 0.5,
              params.overhang_mm ?? 50,
              params.cutting_force_N ?? 500,
            );
            break;
          }
          // LATHE-MS7: Physics & science hardening
          case "lathe_chatter_analysis": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.analyzeTurningChatter(params as any);
            break;
          }
          case "lathe_hard_turning": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.analyzeHardTurning(params as any);
            break;
          }
          case "lathe_thread_schedule": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.generateThreadPassSchedule({
              thread_depth_mm: params.thread_depth_mm ?? 0.92,
              pitch_mm: params.pitch_mm ?? 1.5,
              passes: params.passes ?? 6,
              method: params.method ?? "constant_chip_area",
            });
            break;
          }
          case "lathe_drill_thrust": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.checkDrillThrust({
              drill_diameter_mm: params.drill_diameter_mm ?? 10,
              feed_per_rev_mm: params.feed_per_rev_mm ?? 0.15,
              point_angle_deg: params.point_angle_deg ?? 118,
              kc1_1: params.kc1_1 ?? 1800,
              mc: params.mc ?? 0.25,
              tailstock_force_N: params.tailstock_force_N,
            });
            break;
          }
          case "lathe_parting_force": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.partingForceMultiplier(params.straight_turning_force_N ?? 500);
            break;
          }
          case "lathe_beam_deflection": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.calculateBeamDeflection(params as any);
            break;
          }
          case "lathe_chip_breaking": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.chipBreakingOscillation(params.iso_group ?? "P", params.feed_mm_rev ?? 0.2);
            break;
          }
          case "lathe_peck_schedule": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.generateDecreasingPeckSchedule(
              params.total_depth_mm ?? 30,
              params.first_peck_mm ?? 5,
              params.min_peck_mm,
            );
            break;
          }
          case "lathe_bore_dwell": {
            const { latheScienceHardeningEngine: lsh } = await import("../../engines/LatheScienceHardeningEngine.js");
            result = lsh.boreDwell(params.iso_group ?? "P");
            break;
          }
          // LLM-INTEL-6: Lathe AI reasoning actions
          case "lathe_macro_decision": {
            const { LatheIntelligenceEngine } = await import("../../engines/LatheIntelligenceEngine.js");
            result = await LatheIntelligenceEngine.decideMacroVsHardCode(params as any);
            break;
          }
          case "lathe_live_plan": {
            const { LatheIntelligenceEngine } = await import("../../engines/LatheIntelligenceEngine.js");
            result = await LatheIntelligenceEngine.planLiveTooling(params as any);
            break;
          }
          case "lathe_multi_turret_safety": {
            const { LatheIntelligenceEngine } = await import("../../engines/LatheIntelligenceEngine.js");
            result = await LatheIntelligenceEngine.analyzeMultiTurret(params as any);
            break;
          }
          case "lathe_swiss_decision": {
            const { LatheIntelligenceEngine } = await import("../../engines/LatheIntelligenceEngine.js");
            result = await LatheIntelligenceEngine.decideSwissType(params as any);
            break;
          }
          case "lathe_millturn_plan": {
            const { LatheIntelligenceEngine } = await import("../../engines/LatheIntelligenceEngine.js");
            result = await LatheIntelligenceEngine.planMillTurn(params as any);
            break;
          }
          case "lathe_complete_analysis": {
            const { LatheIntelligenceEngine } = await import("../../engines/LatheIntelligenceEngine.js");
            result = await LatheIntelligenceEngine.analyzeComplete(params as any);
            break;
          }
          // LLM-INTEL-7: Lathe CAM Intelligence actions
          case "lathe_cam_template": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            result = latheCAMIntelligenceEngine.recommendParametricTemplate(
              params.part,
              params.similar_parts
            );
            break;
          }
          case "lathe_cam_toolpath": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            result = latheCAMIntelligenceEngine.selectToolpath(
              params.feature,
              params.part,
              params.machine,
              { batch_size: params.batch_size, priority: params.priority }
            );
            break;
          }
          case "lathe_cam_sequence": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            // Build toolpath selections from provided array or empty Map
            const toolpathMap = new Map();
            if (params.toolpath_selections) {
              for (const [featureId, toolpath] of Object.entries(params.toolpath_selections)) {
                toolpathMap.set(featureId, toolpath);
              }
            }
            result = latheCAMIntelligenceEngine.sequenceOperations(
              params.part,
              params.machine,
              toolpathMap
            );
            break;
          }
          case "lathe_cam_workholding": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            result = latheCAMIntelligenceEngine.recommendWorkholding(
              params.part,
              params.machine,
              params.max_cutting_force_N
            );
            break;
          }
          case "lathe_cam_mrr_optimize": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            result = latheCAMIntelligenceEngine.optimizeMRRCost(
              params.part,
              params.machine,
              params.batch_size || 1,
              params.available_tools
            );
            break;
          }
          case "lathe_cam_analyze": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            const analysisResult = latheCAMIntelligenceEngine.analyzeComplete(
              params.part,
              params.machine,
              {
                batch_size: params.batch_size,
                priority: params.priority,
                similar_parts: params.similar_parts,
              }
            );
            // Convert Map to Object for JSON serialization
            result = {
              ...analysisResult,
              feature_toolpaths: Object.fromEntries(analysisResult.feature_toolpaths),
            };
            break;
          }
          case "lathe_cam_feature_map": {
            // Return the feature-to-toolpath mapping rules
            const featureToolpathMap: Record<string, string[]> = {
              cylinder_od: ["g71_od_rough", "g70_od_finish", "profile_turn"],
              cylinder_id: ["g71_id_rough", "g70_id_finish", "bore"],
              face: ["g72_face_rough", "face_turn"],
              shoulder: ["g71_od_rough", "g70_od_finish", "profile_turn"],
              taper_od: ["g71_od_rough", "g70_od_finish", "taper_turn", "contour_turn"],
              taper_id: ["g71_id_rough", "g70_id_finish", "bore"],
              groove_od: ["g75_grooving", "plunge_groove", "turn_groove"],
              groove_id: ["g75_grooving", "bore"],
              groove_face: ["g75_grooving", "plunge_groove"],
              thread_od: ["g76_threading", "thread_single", "thread_multi"],
              thread_id: ["g76_threading", "thread_single", "tap"],
              cross_hole: ["live_drill", "live_mill"],
              flat: ["live_mill", "c_axis_contour"],
              keyway: ["live_mill", "c_axis_contour"],
              chamfer: ["g70_od_finish", "profile_turn"],
              center_hole: ["center_drill"],
            };
            result = { feature_toolpath_map: featureToolpathMap, count: Object.keys(featureToolpathMap).length };
            break;
          }
          case "lathe_cam_interrupted_cut": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            // Analyze interrupted cut risk for a feature
            const toolpath = latheCAMIntelligenceEngine.selectToolpath(
              params.feature,
              params.part,
              params.machine
            );
            result = {
              feature_id: params.feature?.id,
              interrupted_cut: toolpath.interrupted_cut,
              mitigation: toolpath.interrupted_cut?.mitigation || [],
              selected_toolpath: toolpath.strategy,
              warnings: toolpath.warnings,
            };
            break;
          }

          // ===== LATHE-OPUS-AI: Claude Opus-level reasoning + knowledge =====
          case "lathe_opus_analyze": {
            const { LatheOpusReasoningEngine } = await import("../../engines/LatheOpusReasoningEngine.js");
            const engine = LatheOpusReasoningEngine.getInstance();
            const analysis = engine.analyzePartWithReasoning(params.part || {}, params.material);
            result = {
              reasoning_chain: analysis.reasoningChain,
              recommendations: analysis.recommendations,
              operation_sequence: analysis.operationSequence,
              confidence: analysis.confidence,
            };
            break;
          }
          case "lathe_opus_optimize": {
            const { LatheOpusReasoningEngine } = await import("../../engines/LatheOpusReasoningEngine.js");
            const sequence = LatheOpusReasoningEngine.predictOperationSequence(params.features || []);
            const parameters = LatheOpusReasoningEngine.predictCuttingParameters(
              params.operation || "od_rough",
              params.material || "4140",
              params.tool || {}
            );
            result = {
              optimized_sequence: sequence,
              optimized_parameters: parameters,
              neural_confidence: sequence.confidence,
            };
            break;
          }
          case "lathe_opus_reasoning": {
            const { LatheOpusReasoningEngine } = await import("../../engines/LatheOpusReasoningEngine.js");
            const engine = LatheOpusReasoningEngine.getInstance();
            const diagnosis = engine.diagnoseWithReasoning(
              params.symptoms || [],
              params.context || {}
            );
            result = {
              diagnosis: diagnosis.conclusion,
              reasoning_steps: diagnosis.reasoningChain,
              root_causes: diagnosis.rootCauses,
              recommended_actions: diagnosis.recommendations,
            };
            break;
          }
          case "lathe_opus_counterfactual": {
            const { LatheOpusReasoningEngine } = await import("../../engines/LatheOpusReasoningEngine.js");
            const counterfactuals = LatheOpusReasoningEngine.generateCounterfactuals(
              params.current_params || {},
              params.actual_outcome || {}
            );
            result = {
              scenarios: counterfactuals.scenarios,
              best_alternative: counterfactuals.bestAlternative,
              improvement_potential: counterfactuals.improvementPotential,
            };
            break;
          }
          case "lathe_opus_hybrid_strategy": {
            const { LatheOpusReasoningEngine } = await import("../../engines/LatheOpusReasoningEngine.js");
            const strategies = LatheOpusReasoningEngine.generateHybridStrategies(
              params.part || {},
              params.material || {},
              params.constraints || {}
            );
            result = {
              hybrid_strategies: strategies.strategies,
              recommended: strategies.recommended,
              cost_comparison: strategies.costComparison,
            };
            break;
          }
          case "lathe_knowledge_detect_mistakes": {
            const { latheResourceKnowledgeEngine } = await import("../../engines/LatheResourceKnowledgeEngine.js");
            const mistakes = latheResourceKnowledgeEngine.detectMistakes(params.program_content || "");
            result = {
              mistakes_found: mistakes.length,
              mistakes,
              severity_breakdown: {
                critical: mistakes.filter((m: any) => m.severity === "critical").length,
                warning: mistakes.filter((m: any) => m.severity === "warning").length,
                suggestion: mistakes.filter((m: any) => m.severity === "suggestion").length,
              },
            };
            break;
          }
          case "lathe_knowledge_score_program": {
            const { latheResourceKnowledgeEngine } = await import("../../engines/LatheResourceKnowledgeEngine.js");
            const score = latheResourceKnowledgeEngine.scoreProgramPractices(params.program_content || "");
            result = {
              score: score.score,
              practices_followed: score.followed,
              practices_violated: score.violated,
              suggestions: score.suggestions,
            };
            break;
          }
          case "lathe_knowledge_generate_improvements": {
            const { latheResourceKnowledgeEngine } = await import("../../engines/LatheResourceKnowledgeEngine.js");
            const improvements = latheResourceKnowledgeEngine.generateImprovements(
              params.program_content || "",
              params.material
            );
            result = {
              recommendations: improvements.recommendations,
              aot_optimizations: improvements.aot_optimizations,
              code_improvements: improvements.code_improvements,
            };
            break;
          }
          case "lathe_knowledge_best_practices": {
            const { latheResourceKnowledgeEngine } = await import("../../engines/LatheResourceKnowledgeEngine.js");
            result = {
              best_practices: latheResourceKnowledgeEngine.getBestPractices(),
              aot_parameters: latheResourceKnowledgeEngine.getAOTParameters(),
              program_patterns: latheResourceKnowledgeEngine.getProgramPatterns(),
              stats: latheResourceKnowledgeEngine.getStats(),
            };
            break;
          }

          // ═══════════════════════════════════════════════════════════════════
          // LATHE-DEEP-AI: Advanced Neural Network + Reasoning Engines
          // ═══════════════════════════════════════════════════════════════════

          case "lathe_attention_analyze": {
            const { latheAttentionMechanismEngine } = await import("../../engines/LatheAttentionMechanismEngine.js");
            const program = params.program || "";
            result = latheAttentionMechanismEngine.analyzeProgram(program);
            break;
          }

          case "lathe_attention_visualize": {
            const { latheAttentionMechanismEngine } = await import("../../engines/LatheAttentionMechanismEngine.js");
            const program = params.program || "";
            result = latheAttentionMechanismEngine.visualizeAttention(program);
            break;
          }

          case "lathe_attention_dependencies": {
            const { latheAttentionMechanismEngine } = await import("../../engines/LatheAttentionMechanismEngine.js");
            const program = params.program || "";
            result = latheAttentionMechanismEngine.analyzeOperationDependencies(program);
            break;
          }

          case "lathe_causal_effect": {
            const { latheCausalInferenceEngine } = await import("../../engines/LatheCausalInferenceEngine.js");
            const treatment = params.treatment || "cutting_speed";
            const outcome = params.outcome || "surface_finish";
            result = latheCausalInferenceEngine.estimateCausalEffect(treatment, outcome);
            break;
          }

          case "lathe_causal_counterfactual": {
            const { latheCausalInferenceEngine } = await import("../../engines/LatheCausalInferenceEngine.js");
            const observation = params.observation || {};
            const intervention = params.intervention || {};
            result = latheCausalInferenceEngine.counterfactual(observation, intervention);
            break;
          }

          case "lathe_causal_discover": {
            const { latheCausalInferenceEngine } = await import("../../engines/LatheCausalInferenceEngine.js");
            const data = params.data || [];
            result = latheCausalInferenceEngine.discoverStructure(data);
            break;
          }

          case "lathe_ensemble_predict": {
            const { latheEnsembleLearningEngine } = await import("../../engines/LatheEnsembleLearningEngine.js");
            const input = params.input || {};
            const target = params.target || "surface_finish";
            result = latheEnsembleLearningEngine.predict(input, target);
            break;
          }

          case "lathe_ensemble_train": {
            const { latheEnsembleLearningEngine } = await import("../../engines/LatheEnsembleLearningEngine.js");
            const data = params.data || [];
            const config = params.config || {};
            result = latheEnsembleLearningEngine.train(data, config);
            break;
          }

          case "lathe_ensemble_evaluate": {
            const { latheEnsembleLearningEngine } = await import("../../engines/LatheEnsembleLearningEngine.js");
            const testData = params.test_data || [];
            result = latheEnsembleLearningEngine.evaluate(testData);
            break;
          }

          case "lathe_knowledge_graph_query": {
            const { latheKnowledgeGraphEngine } = await import("../../engines/LatheKnowledgeGraphEngine.js");
            const material = params.material || "D2";
            const operation = params.operation || "od_rough";
            result = latheKnowledgeGraphEngine.query({ material, operation });
            break;
          }

          case "lathe_knowledge_graph_path": {
            const { latheKnowledgeGraphEngine } = await import("../../engines/LatheKnowledgeGraphEngine.js");
            const start = params.start || "D2";
            const end = params.end || "surface_finish";
            result = latheKnowledgeGraphEngine.findPath(start, end);
            break;
          }

          case "lathe_knowledge_graph_reason": {
            const { latheKnowledgeGraphEngine } = await import("../../engines/LatheKnowledgeGraphEngine.js");
            const material = params.material || "D2";
            result = latheKnowledgeGraphEngine.multiHopReason(material);
            break;
          }

          case "lathe_rl_select_action": {
            const { latheReinforcementLearningEngine } = await import("../../engines/LatheReinforcementLearningEngine.js");
            const state = params.state || {};
            const algorithm = params.algorithm || "q_learning";
            result = latheReinforcementLearningEngine.selectAction(state, algorithm);
            break;
          }

          case "lathe_rl_train": {
            const { latheReinforcementLearningEngine } = await import("../../engines/LatheReinforcementLearningEngine.js");
            const episodes = params.episodes || 100;
            const config = params.config || {};
            result = latheReinforcementLearningEngine.getTrainingStatus();
            break;
          }

          case "lathe_rl_evaluate": {
            const { latheReinforcementLearningEngine } = await import("../../engines/LatheReinforcementLearningEngine.js");
            const programs = params.programs || [];
            result = latheReinforcementLearningEngine.getStats();
            break;
          }

          case "lathe_orchestrate": {
            const { latheUnifiedAIOrchestrator } = await import("../../engines/LatheUnifiedAIOrchestrator.js");
            const taskType = params.task_type || "analyze_program";
            const input = params.input || {};
            result = await latheUnifiedAIOrchestrator.execute({
              task_type: taskType,
              input,
              options: { depth: "standard" },
            });
            break;
          }

          case "lathe_orchestrate_deep": {
            const { latheUnifiedAIOrchestrator } = await import("../../engines/LatheUnifiedAIOrchestrator.js");
            const taskType = params.task_type || "analyze_program";
            const input = params.input || {};
            result = await latheUnifiedAIOrchestrator.execute({
              task_type: taskType,
              input,
              options: { depth: "deep", explain_reasoning: true },
            });
            break;
          }

          case "lathe_orchestrate_quick": {
            const { latheUnifiedAIOrchestrator } = await import("../../engines/LatheUnifiedAIOrchestrator.js");
            const taskType = params.task_type || "analyze_program";
            const input = params.input || {};
            result = await latheUnifiedAIOrchestrator.execute({
              task_type: taskType,
              input,
              options: { depth: "quick" },
            });
            break;
          }

          // LATHE-DEEP-AI-MS2: Meta-Learning
          case "lathe_meta_adapt": {
            const { latheMetaLearningEngine } = await import("../../engines/LatheMetaLearningEngine.js");
            const material = params.material || "D2";
            const examples = params.examples || [];
            result = latheMetaLearningEngine.adaptToMaterial(material, examples);
            break;
          }

          case "lathe_meta_few_shot": {
            const { latheMetaLearningEngine } = await import("../../engines/LatheMetaLearningEngine.js");
            const query = params.query || {};
            const support = params.support || [];
            result = latheMetaLearningEngine.fewShotPredict(query, support);
            break;
          }

          case "lathe_meta_prototype": {
            const { latheMetaLearningEngine } = await import("../../engines/LatheMetaLearningEngine.js");
            const supportSet = params.support_set || [];
            result = latheMetaLearningEngine.computePrototypes(supportSet);
            break;
          }

          // LATHE-DEEP-AI-MS2: Bayesian Optimization
          case "lathe_bayesian_optimize": {
            const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
            const bounds = params.bounds || {};
            const nIter = params.n_iterations || 20;
            result = latheBayesianOptimizationEngine.optimizeLatheCutting(params);
            break;
          }

          case "lathe_bayesian_uncertainty": {
            const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
            const x = params.point || [];
            result = latheBayesianOptimizationEngine.quantifyUncertainty(x);
            break;
          }

          case "lathe_bayesian_pareto": {
            const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
            result = latheBayesianOptimizationEngine.optimizeSpeedFeedTradeoff(params);
            break;
          }

          // LATHE-DEEP-AI-MS2: Anomaly Detection
          case "lathe_anomaly_detect": {
            const { latheAnomalyDetectionEngine } = await import("../../engines/LatheAnomalyDetectionEngine.js");
            const data = params.data || [];
            const methods = params.methods || ["z_score", "isolation_forest"];
            result = latheAnomalyDetectionEngine.detectAnomalies(data, methods);
            break;
          }

          case "lathe_anomaly_program": {
            const { latheAnomalyDetectionEngine } = await import("../../engines/LatheAnomalyDetectionEngine.js");
            const program = params.program || "";
            result = latheAnomalyDetectionEngine.detectProgramAnomalies(program);
            break;
          }

          case "lathe_anomaly_explain": {
            const { latheAnomalyDetectionEngine } = await import("../../engines/LatheAnomalyDetectionEngine.js");
            const anomaly = params.anomaly || {};
            result = latheAnomalyDetectionEngine.explainAnomaly(anomaly);
            break;
          }

          // LATHE-DEEP-AI-MS2: Genetic Algorithms
          case "lathe_genetic_optimize": {
            const { latheGeneticAlgorithmEngine } = await import("../../engines/LatheGeneticAlgorithmEngine.js");
            result = latheGeneticAlgorithmEngine.optimizeParameters(params);
            break;
          }

          case "lathe_genetic_nsga": {
            const { latheGeneticAlgorithmEngine } = await import("../../engines/LatheGeneticAlgorithmEngine.js");
            const population = params.population || [];
            const objectives = params.objectives || ["cycle_time", "tool_life"];
            result = latheGeneticAlgorithmEngine.nsgaII(population, { generations: params.generations || 50 });
            break;
          }

          case "lathe_genetic_sequence": {
            const { latheGeneticAlgorithmEngine } = await import("../../engines/LatheGeneticAlgorithmEngine.js");
            const operations = params.operations || [];
            result = latheGeneticAlgorithmEngine.optimizeToolSequence(operations, params);
            break;
          }

          // LATHE-DEEP-AI-MS2: Transfer Learning
          case "lathe_transfer_knowledge": {
            const { latheTransferLearningEngine } = await import("../../engines/LatheTransferLearningEngine.js");
            const source = params.source || {};
            const target = params.target || {};
            result = latheTransferLearningEngine.transferKnowledge(source, target);
            break;
          }

          case "lathe_transfer_material": {
            const { latheTransferLearningEngine } = await import("../../engines/LatheTransferLearningEngine.js");
            const material = params.material || "D2";
            const operation = params.operation || "roughing";
            result = latheTransferLearningEngine.inferNewMaterialParams(material, operation);
            break;
          }

          case "lathe_transfer_machine": {
            const { latheTransferLearningEngine } = await import("../../engines/LatheTransferLearningEngine.js");
            const machine = params.machine || {};
            const refs = params.reference_machines || [];
            result = latheTransferLearningEngine.commissionNewMachine(machine, refs, params.material || "D2");
            break;
          }

          // LATHE-DEEP-AI-MS2: Active Learning
          case "lathe_active_select": {
            const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
            const pool = params.pool || [];
            const n = params.n_samples || 5;
            const strategy = params.strategy || "uncertainty";
            result = latheActiveLearningEngine.selectSamples(pool, n, strategy);
            break;
          }

          case "lathe_active_suggest": {
            const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
            const budget = params.budget || 10;
            result = latheActiveLearningEngine.suggestExperiments(budget);
            break;
          }

          case "lathe_active_feedback": {
            const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
            const feedback = params.feedback || {};
            result = latheActiveLearningEngine.processOperatorFeedback(feedback);
            break;
          }

          // ================================================================
          // LATHE-UNIFIED-SCIENCE: PhD-level physics/chemistry/metallurgy
          // ================================================================

          case "lathe_unified_analyze": {
            const { latheUnifiedScienceEngine } = await import("../../engines/LatheUnifiedScienceEngine.js");
            result = latheUnifiedScienceEngine.analyze(
              params.material,
              params.cutting_params || params.params,
              params.tool_geometry,
              params.workpiece
            );
            break;
          }

          case "lathe_unified_recommend": {
            const { latheUnifiedScienceEngine } = await import("../../engines/LatheUnifiedScienceEngine.js");
            result = latheUnifiedScienceEngine.recommendParameters(
              params.material,
              {
                tool_life_min: params.target_tool_life || 30,
                max_ra_um: params.max_ra,
                max_deflection_mm: params.max_deflection,
              }
            );
            break;
          }

          case "lathe_unified_forces": {
            const { latheUnifiedScienceEngine } = await import("../../engines/LatheUnifiedScienceEngine.js");
            const analysis = latheUnifiedScienceEngine.analyze(
              params.material,
              params.cutting_params || params.params
            );
            result = analysis.forces;
            break;
          }

          case "lathe_unified_thermal": {
            const { latheUnifiedScienceEngine } = await import("../../engines/LatheUnifiedScienceEngine.js");
            const analysis = latheUnifiedScienceEngine.analyze(
              params.material,
              params.cutting_params || params.params
            );
            result = analysis.thermal;
            break;
          }

          case "lathe_unified_metallurgy": {
            const { latheUnifiedScienceEngine } = await import("../../engines/LatheUnifiedScienceEngine.js");
            const analysis = latheUnifiedScienceEngine.analyze(
              params.material,
              params.cutting_params || params.params
            );
            result = analysis.metallurgy;
            break;
          }

          case "lathe_unified_chemistry": {
            const { latheUnifiedScienceEngine } = await import("../../engines/LatheUnifiedScienceEngine.js");
            const analysis = latheUnifiedScienceEngine.analyze(
              params.material,
              params.cutting_params || params.params
            );
            result = analysis.chemistry;
            break;
          }

          // MS2: Vendor Turning Catalog Actions (U-LAT23-U-LAT25)
          case "lathe_vendor_tool_lookup": {
            const { vendorTurningCatalogExtractorEngine } = await import("../../engines/VendorTurningCatalogExtractorEngine.js");
            result = vendorTurningCatalogExtractorEngine.searchInserts({
              designation: params.designation,
              shape: params.shape,
              ic_mm: params.ic_mm,
              nose_radius_mm: params.nose_radius_mm,
              iso_group: params.iso_group,
              vendor: params.vendor,
              chipbreaker_type: params.chipbreaker_type,
              limit: params.limit || 20,
            });
            break;
          }

          case "lathe_insert_grade_select": {
            const { vendorTurningCatalogExtractorEngine } = await import("../../engines/VendorTurningCatalogExtractorEngine.js");
            result = vendorTurningCatalogExtractorEngine.recommendGrade({
              iso_group: params.iso_group || "P",
              operation: params.operation || "medium",
              vendor: params.vendor,
              substrate: params.substrate,
            });
            break;
          }

          case "lathe_iso_code_resolve": {
            const { vendorTurningCatalogExtractorEngine, parseISO1832Designation } = await import("../../engines/VendorTurningCatalogExtractorEngine.js");
            const resolved = vendorTurningCatalogExtractorEngine.resolveISOCode(params.designation || "");
            result = {
              ...resolved,
              iso_shape_angle: resolved.parsed?.iso_shape ? { C: 80, D: 55, E: 75, T: 60, S: 90, R: 360, V: 35, W: 80 }[resolved.parsed.iso_shape] : null,
            };
            break;
          }

          // MS3: Machine Kinematics Lookup (U-LAT30)
          case "lathe_machine_kinematics_lookup": {
            const { findOkumaMachineByModel, getOkumaMachinesBySeries, getOkumaMachinesByType, OKUMA_MACHINES_FROM_STEP } = await import("../../data/okuma-machines-from-step.js");

            if (params.model) {
              // Lookup by model name
              const machine = findOkumaMachineByModel(params.model);
              result = machine ? {
                found: true,
                source: "okuma_step_catalog",
                machine,
                work_envelope_mm: machine.work_envelope_mm,
                kinematic_chain: machine.kinematic_chain,
                simulation_model_path: machine.simulation_model_path,
                spindle: machine.spindle,
                tool_magazine: machine.tool_magazine,
                controller: machine.controller,
              } : { found: false, query: params.model };
            } else if (params.series) {
              // List by series
              const machines = getOkumaMachinesBySeries(params.series);
              result = { machines, count: machines.length, series: params.series };
            } else if (params.type) {
              // List by type
              const machines = getOkumaMachinesByType(params.type);
              result = { machines, count: machines.length, type: params.type };
            } else if (params.stats) {
              // Return catalog stats
              const bySeries: Record<string, number> = {};
              const byType: Record<string, number> = {};
              let fiveAxisCount = 0;
              for (const m of OKUMA_MACHINES_FROM_STEP) {
                bySeries[m.series] = (bySeries[m.series] || 0) + 1;
                byType[m.type] = (byType[m.type] || 0) + 1;
                if (m.type === "5axis_machining_center") fiveAxisCount++;
              }
              result = {
                total_machines: OKUMA_MACHINES_FROM_STEP.length,
                by_series: bySeries,
                by_type: byType,
                machines_with_5axis: fiveAxisCount,
              };
            } else {
              // Return all machines
              result = { machines: OKUMA_MACHINES_FROM_STEP, count: OKUMA_MACHINES_FROM_STEP.length };
            }
            break;
          }

          // MS5: HyperMILL Turning Strategy Lookup (U-LAT39)
          case "lathe_hypermill_strategy_lookup": {
            const {
              findHyperMillStrategyByCode,
              getHyperMillStrategiesByGroup,
              searchHyperMillStrategies,
              getRoughingStrategies,
              getFinishingStrategies,
              get5AxisStrategies,
              getStrategyStats,
              HYPERMILL_TURNING_STRATEGIES,
            } = await import("../../data/hypermill-turning-strategy-catalog.js");

            if (params.code) {
              // Lookup by code
              const strategy = findHyperMillStrategyByCode(params.code);
              result = strategy ? { found: true, strategy } : { found: false, code: params.code };
            } else if (params.group) {
              // List by group
              const strategies = getHyperMillStrategiesByGroup(params.group);
              result = { strategies, count: strategies.length, group: params.group };
            } else if (params.search) {
              // Search by keyword
              const strategies = searchHyperMillStrategies(params.search);
              result = { strategies, count: strategies.length, query: params.search };
            } else if (params.roughing) {
              // Get roughing strategies
              const strategies = getRoughingStrategies();
              result = { strategies, count: strategies.length, type: "roughing" };
            } else if (params.finishing) {
              // Get finishing strategies
              const strategies = getFinishingStrategies();
              result = { strategies, count: strategies.length, type: "finishing" };
            } else if (params.five_axis || params.mill_turn) {
              // Get 5-axis strategies
              const strategies = get5AxisStrategies();
              result = { strategies, count: strategies.length, type: "5axis_mill_turn" };
            } else if (params.stats) {
              // Get stats
              result = getStrategyStats();
            } else {
              // Return all strategies
              result = { strategies: HYPERMILL_TURNING_STRATEGIES, count: HYPERMILL_TURNING_STRATEGIES.length };
            }
            break;
          }

          // MS5: Mark's MULTUS Pattern Inject (U-LAT42)
          case "lathe_pattern_inject": {
            const {
              findPatternById,
              getPatternsByCategory,
              searchPatterns,
              getPatternsForPartType,
              getPatternsForMaterial,
              getPatternStats,
              MARKS_MULTUS_PATTERNS,
            } = await import("../../data/marks-multus-patterns.js");

            if (params.id) {
              // Lookup by ID
              const pattern = findPatternById(params.id);
              result = pattern ? { found: true, pattern } : { found: false, id: params.id };
            } else if (params.category) {
              // Get by category
              const patterns = getPatternsByCategory(params.category);
              result = { patterns, count: patterns.length, category: params.category };
            } else if (params.search) {
              // Search by keyword
              const patterns = searchPatterns(params.search);
              result = { patterns, count: patterns.length, query: params.search };
            } else if (params.part_type) {
              // Get patterns for part type
              const patterns = getPatternsForPartType(params.part_type);
              result = { patterns, count: patterns.length, part_type: params.part_type };
            } else if (params.material || params.iso_group) {
              // Get patterns for material group
              const patterns = getPatternsForMaterial(params.material || params.iso_group);
              result = { patterns, count: patterns.length, material: params.material || params.iso_group };
            } else if (params.stats) {
              // Get stats
              result = getPatternStats();
            } else {
              // Return all patterns
              result = { patterns: MARKS_MULTUS_PATTERNS, count: MARKS_MULTUS_PATTERNS.length };
            }
            break;
          }

          // MS7: Fusion Lathe Post Lookup (U-LAT54)
          case "lathe_fusion_post_lookup": {
            const { fusionLathePostDeltaRegistryEngine } = await import("../../engines/FusionLathePostDeltaRegistryEngine.js");

            if (params.manufacturer) {
              // Lookup by manufacturer
              const posts = fusionLathePostDeltaRegistryEngine.lookupPost({ manufacturer: params.manufacturer });
              result = { posts, count: posts.length, query: { manufacturer: params.manufacturer } };
            } else if (params.controller_family) {
              // Lookup by controller family
              const posts = fusionLathePostDeltaRegistryEngine.lookupPost({ controllerFamily: params.controller_family });
              result = { posts, count: posts.length, query: { controllerFamily: params.controller_family } };
            } else if (params.machine_model) {
              // Lookup by machine model
              const posts = fusionLathePostDeltaRegistryEngine.lookupPost({ machineModel: params.machine_model });
              result = { posts, count: posts.length, query: { machineModel: params.machine_model } };
            } else if (params.machine_type) {
              // Lookup by machine type
              const posts = fusionLathePostDeltaRegistryEngine.lookupPost({ machineType: params.machine_type });
              result = { posts, count: posts.length, query: { machineType: params.machine_type } };
            } else if (params.capability) {
              // Lookup by capability
              const posts = fusionLathePostDeltaRegistryEngine.lookupPost({ capability: params.capability });
              result = { posts, count: posts.length, query: { capability: params.capability } };
            } else if (params.summary || params.stats) {
              // Get summary statistics
              result = fusionLathePostDeltaRegistryEngine.getSummary();
            } else if (params.refresh || params.scan) {
              // Refresh/scan posts
              const scanResult = fusionLathePostDeltaRegistryEngine.scanAndRegister();
              fusionLathePostDeltaRegistryEngine.saveRegistry();
              result = {
                newPosts: scanResult.newPosts,
                updatedPosts: scanResult.updatedPosts,
                totalPosts: scanResult.registry.postCount,
                errors: scanResult.errors,
              };
            } else {
              // Return full registry
              const registry = fusionLathePostDeltaRegistryEngine.getRegistry();
              result = { posts: registry.posts, count: registry.postCount };
            }
            break;
          }

          // MS8: Tribal Knowledge Integration (U-LAT57-60)
          case "lathe_tribal_activate": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            const context = {
              decision_type: params.decision_type || "turning_roughing",
              material: params.material,
              iso_group: params.iso_group,
              operation: params.operation || "turning",
              machine: params.machine_id,
              controller: params.controller,
              tool_type: params.tool_type,
              tool_diameter_mm: params.tool_diameter_mm,
              hardness_hrc: params.hardness_hrc,
              keywords: params.keywords,
            };
            result = tribalKnowledgeActivationEngine.activate(context, { limit: params.limit || 5 });
            break;
          }

          case "lathe_tribal_speedfeed": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            const context = {
              decision_type: "speed_feed" as const,
              material: params.material,
              iso_group: params.iso_group,
              operation: params.operation || "turning",
              machine: params.machine_id,
              cutting_speed: params.cutting_speed,
              feed_rate: params.feed_rate,
              depth_of_cut: params.depth_of_cut,
            };
            const activation = tribalKnowledgeActivationEngine.activate(context, { limit: 5 });
            const modifiers = tribalKnowledgeActivationEngine.getParameterModifiers(activation);
            result = { activation, modifiers };
            break;
          }

          case "lathe_tribal_postprocessor": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            const ppParams = {
              controller: params.controller || "generic",
              machine_type: "lathe",
              operation: params.operation,
              material: params.material,
              feature: params.feature,
            };
            result = tribalKnowledgeActivationEngine.integrateForPP(ppParams);
            break;
          }

          case "lathe_tribal_quality": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            const context = {
              decision_type: "surface_finish" as const,
              material: params.material,
              iso_group: params.iso_group,
              operation: params.operation || "turning_finishing",
              target_ra_um: params.target_ra_um,
              tool_type: params.tool_type,
            };
            result = tribalKnowledgeActivationEngine.activate(context, { limit: 5 });
            break;
          }

          case "lathe_tribal_autoprogram": {
            const { tribalKnowledgeActivationEngine } = await import("../../engines/TribalKnowledgeActivationEngine.js");
            const context = {
              decision_type: params.operation?.includes("thread") ? "threading" as const : "turning_roughing" as const,
              material: params.material,
              iso_group: params.iso_group,
              operation: params.operation,
              machine: params.machine_id,
              controller: params.controller,
            };
            result = tribalKnowledgeActivationEngine.activate(context, { limit: 8 });
            break;
          }

          // MS8: Lathe Awareness Snapshot (U-LAT64)
          case "lathe_awareness_snapshot": {
            // Return current lathe domain awareness state via facade engine
            const { latheMasterOrchestratorFacadeEngine } = await import("../../engines/LatheMasterOrchestratorFacadeEngine.js");
            result = latheMasterOrchestratorFacadeEngine.getLatheSnapshot();
            break;
          }

          // MS12: Family planning (U-LAT85)
          case "lathe_family_planning": {
            const { lathePartFamilyPlanningEngine } = await import("../../engines/LathePartFamilyPlanningEngine.js");
            const customer = params.customer ?? "unknown";
            const partSpec = {
              part_family: params.part_family,
              part_complexity: params.part_complexity ?? "moderate",
              lot_size: params.lot_size ?? 1,
              family_parts_expected: params.family_parts_expected ?? 1,
              features: params.features,
              material: params.material,
              variable_dimensions: params.variable_dimensions,
            };
            result = lathePartFamilyPlanningEngine.analyzeFamilyPotential(partSpec, customer);
            break;
          }

          // MS12: Macro ROI (U-LAT86)
          case "lathe_macro_roi": {
            const { lathePartFamilyPlanningEngine } = await import("../../engines/LathePartFamilyPlanningEngine.js");
            const customer = params.customer ?? "unknown";
            const partSpec = {
              part_family: params.part_family,
              part_complexity: params.part_complexity ?? "moderate",
              lot_size: params.lot_size ?? 1,
              family_parts_expected: params.family_parts_expected ?? 1,
              features: params.features,
              material: params.material,
              variable_dimensions: params.variable_dimensions,
            };
            const macroInvestmentHr = params.macro_investment_hr ?? 2;
            result = lathePartFamilyPlanningEngine.computeMacroROI(partSpec, macroInvestmentHr, customer);
            break;
          }

          // MS11: Estimate programming cost (U-LAT79)
          case "lathe_estimate_programming_cost": {
            const { latheProgrammingCostEngine } = await import("../../engines/LatheProgrammingCostEngine.js");
            result = latheProgrammingCostEngine.estimateProgrammingCost(
              params.style ?? "hardcode",
              params.part_complexity ?? "moderate",
              params.lot_size ?? 1,
              {
                profile_id: params.profile_id,
                cam_seat_cost_per_hr: params.cam_seat_cost_per_hr,
                programmer_rate_per_hr: params.programmer_rate_per_hr,
                machine_rate_per_hr: params.machine_rate_per_hr,
                setup_rate_per_hr: params.setup_rate_per_hr,
                feature_surcharge_pct: params.feature_surcharge_pct,
              }
            );
            break;
          }

          // MS11: Compare programming approaches (U-LAT80)
          case "lathe_compare_programming_approaches": {
            const { latheProgrammingCostEngine } = await import("../../engines/LatheProgrammingCostEngine.js");
            result = latheProgrammingCostEngine.compareApproaches({
              controller: params.controller,
              part_complexity: params.part_complexity ?? "moderate",
              lot_size: params.lot_size ?? 1,
              has_threading: params.has_threading,
              has_live_tooling: params.has_live_tooling,
              requires_5axis: params.requires_5axis,
              available_cam_seats: params.available_cam_seats,
              options: params.options,
            });
            break;
          }

          // MS11: Break-even analysis (U-LAT81)
          case "lathe_break_even_analysis": {
            const { latheProgrammingCostEngine } = await import("../../engines/LatheProgrammingCostEngine.js");
            result = latheProgrammingCostEngine.breakEvenAnalysis(
              params.macro_investment_hr ?? 2,
              params.lot_sizes ?? [10, 50, 100, 500],
              params.part_complexity ?? "moderate",
              params.options ?? {}
            );
            break;
          }

          // MS10: Find similar programs (U-LAT73)
          case "lathe_find_similar_programs": {
            const { latheProgramCatalogEngine } = await import("../../engines/LatheProgramCatalogEngine.js");
            const partSpec = {
              controller: params.controller,
              customer: params.customer,
              material: params.material,
              part_family: params.part_family,
              features: params.features,
              part_complexity: params.part_complexity,
              has_threading: params.has_threading,
              has_live_tooling: params.has_live_tooling,
            };
            const limit = typeof params.limit === "number" ? params.limit : 10;
            result = {
              matches: latheProgramCatalogEngine.findSimilarPrograms(partSpec, limit),
              query: partSpec,
              catalog_size: latheProgramCatalogEngine.size(),
            };
            break;
          }

          // MS10: Programming history by customer (U-LAT74)
          case "lathe_programming_history": {
            const { latheProgramCatalogEngine } = await import("../../engines/LatheProgramCatalogEngine.js");
            const customer = params.customer ?? "";
            if (!customer) {
              result = { error: "customer is required" };
              break;
            }
            result = latheProgramCatalogEngine.getProgrammingHistory(String(customer));
            break;
          }

          // MS10: Catalog stats / pie chart data (U-LAT75)
          case "lathe_catalog_stats": {
            const { latheProgramCatalogEngine } = await import("../../engines/LatheProgramCatalogEngine.js");
            result = {
              distribution: latheProgramCatalogEngine.getStyleDistribution(),
              stats: latheProgramCatalogEngine.getStats(),
            };
            break;
          }

          // MS9: Programming Style Selector (U-LAT68)
          case "lathe_select_programming_style": {
            const { latheProgrammingStyleSelectorEngine } = await import("../../engines/LatheProgrammingStyleSelectorEngine.js");
            result = latheProgrammingStyleSelectorEngine.selectProgrammingStyle({
              controller: params.controller ?? "okuma_osp_p300",
              part_complexity: params.part_complexity ?? "moderate",
              lot_size: params.lot_size ?? 1,
              family_parts_expected: params.family_parts_expected ?? 1,
              operator_skill_level: params.operator_skill_level ?? "intermediate",
              available_cam_seats: params.available_cam_seats ?? 0,
              time_constraint: params.time_constraint ?? "normal",
              machine_availability: params.machine_availability ?? "shared",
              has_threading: params.has_threading,
              has_live_tooling: params.has_live_tooling,
              requires_5axis: params.requires_5axis,
              material: params.material,
              shop_rate_usd_hr: params.shop_rate_usd_hr,
              programming_rate_usd_hr: params.programming_rate_usd_hr,
            });
            break;
          }

          // MS9: Programming Cost Comparison (U-LAT69)
          case "lathe_compare_programming_costs": {
            const { latheProgrammingStyleSelectorEngine } = await import("../../engines/LatheProgrammingStyleSelectorEngine.js");
            result = latheProgrammingStyleSelectorEngine.compareProgrammingCosts({
              controller: params.controller ?? "okuma_osp_p300",
              part_complexity: params.part_complexity ?? "moderate",
              lot_size: params.lot_size ?? 1,
              family_parts_expected: params.family_parts_expected ?? 1,
              operator_skill_level: params.operator_skill_level ?? "intermediate",
              available_cam_seats: params.available_cam_seats ?? 0,
              time_constraint: params.time_constraint ?? "normal",
              machine_availability: params.machine_availability ?? "shared",
              has_threading: params.has_threading,
              has_live_tooling: params.has_live_tooling,
              requires_5axis: params.requires_5axis,
              material: params.material,
              shop_rate_usd_hr: params.shop_rate_usd_hr,
              programming_rate_usd_hr: params.programming_rate_usd_hr,
            });
            break;
          }

          // MS8: Lathe Master Orchestrator Facade (U-LAT61)
          case "lathe_orchestrate_facade": {
            const { latheMasterOrchestratorFacadeEngine } = await import("../../engines/LatheMasterOrchestratorFacadeEngine.js");
            const orchRequest = {
              type: params.type || "quick",
              material: params.material,
              material_iso: params.material_iso,
              operation: params.operation,
              machine_id: params.machine_id,
              controller: params.controller,
              tool_diameter_mm: params.tool_diameter_mm,
              tool_type: params.tool_type,
              rpm: params.rpm,
              cutting_speed_m_min: params.cutting_speed_m_min,
              feed_mm_rev: params.feed_mm_rev,
              depth_of_cut_mm: params.depth_of_cut_mm,
              hardness_hrc: params.hardness_hrc,
              target_ra_um: params.target_ra_um,
              workholding: params.workholding,
              has_live_tooling: params.has_live_tooling,
              has_sub_spindle: params.has_sub_spindle,
              has_y_axis: params.has_y_axis,
              include_tribal: params.include_tribal ?? true,
              include_physics: params.include_physics ?? true,
              program_text: params.program_text,
              part_geometry: params.part_geometry,
            };
            result = await latheMasterOrchestratorFacadeEngine.orchestrate(orchRequest);
            break;
          }

          default:
            result = { error: `Unknown action: ${action}` };
        }
        // PIPELINE-VAR U-PV03b: Auto-chain PostProcessor for any mill-turn result with program_text
        if ((result as any)?.program_text && (result as any).program_text.length > 0) {
          try {
            const { postProcessorPipelineEngine } = await import("../../engines/PostProcessorPipelineEngine.js");
            const ppOutput = await postProcessorPipelineEngine.process({
              gcode: (result as any).program_text,
              material: {
                name: (params as any)?.material?.name || (params as any)?.material?.material_name,
                iso_group: (params as any)?.material?.iso_group,
              },
              machine: {
                name: (params as any)?.machine_model || "generic-millturn",
              },
              optimization_target: "balanced",
            });
            if (ppOutput?.output_gcode) {
              (result as any).program_text = ppOutput.output_gcode;
              (result as any).postprocessor_applied = true;
            }
          } catch {
            // PostProcessor is non-blocking — fallback to original G-code
          }
        }
        // POST-CALCULATION HOOKS
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_turning] Post-calculation hook error: ${postErr}`);
        }

        // Cross-field physics validation for force-producing actions
        const physicsActions = new Set(["chuck_force", "tailstock", "part_off_force"]);
        if (physicsActions.has(action) && result && !result.error) {
          try {
            const material = params.material_id || params.material || "unknown";
            validateCrossFieldPhysics({ ...result, material, operation: action });
          } catch (physicsErr: any) {
            if (physicsErr?.name === "SafetyBlockError") throw physicsErr;
            log.warn(`[prism_turning] Cross-field physics check: ${physicsErr}`);
          }
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_turning");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
