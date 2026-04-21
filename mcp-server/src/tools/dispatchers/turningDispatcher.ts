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
import { consultAwareness, extractAwarenessKeywords, wrapWithAwareness, type AwarenessConsultResult } from "./awarenessMiddleware.js";

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
  // LATHE-PRO-MS6a: Swiss multi-channel G-code emission (U-LPM01..U-LPM03)
  "turning_swiss_channel_emit", "turning_swiss_sync_verify_schedule", "turning_swiss_part_transfer",
  // LATHE-PRO-MS6a: Channel balancing + simultaneous-cut collision (U-LPM04..U-LPM05)
  "turning_swiss_channel_balance", "turning_swiss_collision_check",
  // LATHE-PRO-MS6b: Swiss production intelligence (U-LPS21..U-LPS23)
  "turning_swiss_guide_bush_decide", "turning_swiss_back_work_op2", "turning_swiss_gang_layout",
  // LATHE-PRO-MS6b: Bar-stock management + unmanned readiness (U-LPS24..U-LPS25)
  "turning_swiss_bar_management", "turning_swiss_unmanned_score",
  // LATHE-PRO-MS7: Chip control + coolant strategy (U-LPC01..U-LPC06)
  "turning_chip_breaker_validate", "turning_chip_wrapping_risk",
  "turning_chip_unmanned_score", "turning_coolant_strategy", "turning_chip_analysis",
  // LATHE-PRO-MS8: GD&T, inspection & metrology intelligence (U-LPQ01..U-LPQ08)
  "turning_inspection_plan", "turning_fai_generate", "turning_cmm_program",
  "turning_spc_predict", "turning_gage_rr_check", "turning_quality_package",
  // LATHE-PRO-MS9: Quality compliance AS9100/ISO 13485/FDA (U-LPR01..U-LPR06)
  "turning_biocompat_check", "turning_compliance_check",
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
  // LATHE-PRO gap-fill: workholding + sync + rules + stock feed
  "lathe_mandrel_analyze",
  "lathe_face_driver_torque",
  "lathe_sync_verify",
  "lathe_trilobe_deformation",
  "lathe_rules_generate",
  "lathe_stock_feed_validate",
  "lathe_stock_feed_advance",
  "lathe_stock_feed_yield",
  // LATHE-PRO-MS5: CSS / hard turning / coolant / time / economic speed
  "lathe_css_optimize",
  "lathe_css_select_mode",
  "lathe_hard_turn_decide",
  "lathe_coolant_advise",
  "lathe_op_time_breakdown",
  "lathe_gilbert_economic",
  // LATHE-PRO-MS6: grinding replacement / bar cut plan / inspection plan
  "lathe_grind_replace_evaluate",
  "lathe_bar_cut_plan",
  "lathe_inspection_plan",
  // LATHE-PRO-MS7: bird-nest / parting chip clearance / sub-spindle purge
  "lathe_birdnest_predict",
  "lathe_parting_chip_clearance",
  "lathe_subspindle_purge_plan",
  // LATHE-PRO-MS8: GD&T, inspection & metrology intelligence
  "lathe_gdt_callout_parse",
  "lathe_datum_reference_frame",
  "lathe_coax_runout_validate",
  "lathe_roundness_sampling_plan",
  "lathe_gage_rr_msa",
  "lathe_inverse_stackup_allocate",
  "lathe_fcf_syntax_validate",
  "lathe_profile_deviation_analyze",
  // LATHE-PRO-MS9: AS9100 / ISO 13485 / FDA compliance intelligence
  "lathe_iso13485_evaluate",
  "lathe_nadcap_qualify",
  "lathe_dhf_evaluate",
  "lathe_process_validation_iqoqpq",
  "lathe_capa_evaluate",
  "lathe_iso14971_risk",
  "lathe_eco_validate",
  "lathe_counterfeit_assess",
  // LATHE-PRO-MS10: Cost optimization & batch economics
  "lathe_bar_feed_pitch",
  "lathe_bar_remnant_plan",
  "lathe_part_cost_model",
  "lathe_aux_axis_timing",
  "lathe_feedback_tune",
  // LATHE-PRO-MS11: Shop floor integration & deployment
  "lathe_dnc_transfer",
  "lathe_mtconnect_status",
  "lathe_changeover_brief",
  "lathe_first_piece_approve",
  "lathe_probe_cycle",
  "lathe_chuck_jaw_setup",
  "lathe_tool_offset_sync",
  "lathe_operator_audit",
  // LATHE-PRO-MS12: Simulation, verification & visualization
  "lathe_block_engagement_sim",
  "lathe_stock_evolution",
  "lathe_envelope_breach_replay",
  "lathe_block_time_profile",
  "lathe_deviation_map",
  "lathe_program_backtrace",
  "lathe_program_signoff_dossier",
  "lathe_replay_frame_compile",
  // LATHE-MASTER U-LTH24: Post-processor generator full pipeline
  "postgen_full",
  // LATHE-PRO-V3 MS2 / U-LPT01: Wear-to-offset superposition
  "turning_offset_compensation",
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

        // MILL-AGI-P0.1: Awareness middleware — consult PRISM knowledge before execution
        let awareness: AwarenessConsultResult | null = null;
        try {
          const keywords = extractAwarenessKeywords(action, params);
          awareness = await consultAwareness({
            dispatcher: "turning",
            action,
            keywords,
          });
        } catch { /* awareness failure is non-blocking */ }

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
          // LATHE-PRO-MS6a: Swiss multi-channel G-code emission (U-LPM01..U-LPM03)
          case "turning_swiss_channel_emit": {
            const { swissChannelFileEmitterEngine: sce } = await import("../../engines/SwissChannelFileEmitterEngine.js");
            result = sce.emit(params as any);
            break;
          }
          case "turning_swiss_sync_verify_schedule": {
            const { syncCodeVerificationEngine: sve } = await import("../../engines/SyncCodeVerificationEngine.js");
            result = sve.verifySchedule(params as any);
            break;
          }
          case "turning_swiss_part_transfer": {
            const { swissPartTransferSequenceEngine: spt } = await import("../../engines/SwissPartTransferSequenceEngine.js");
            result = spt.generate(params as any);
            break;
          }
          // LATHE-PRO-MS6a: Channel balancing + simultaneous-cut collision (U-LPM04..U-LPM05)
          case "turning_swiss_channel_balance": {
            const { swissChannelGanttSchedulerEngine: sgs } = await import("../../engines/SwissChannelGanttSchedulerEngine.js");
            result = sgs.balance(params as any);
            break;
          }
          case "turning_swiss_collision_check": {
            const { multiChannelCollisionEngine: mcc } = await import("../../engines/MultiChannelCollisionEngine.js");
            result = mcc.check(params as any);
            break;
          }
          // LATHE-PRO-MS6b: Swiss production intelligence (U-LPS21..U-LPS23)
          case "turning_swiss_guide_bush_decide": {
            const { swissGuideBushDecisionEngine: gbe } = await import("../../engines/SwissGuideBushDecisionEngine.js");
            result = gbe.decide(params as any);
            break;
          }
          case "turning_swiss_back_work_op2": {
            const { swissBackWorkingOp2Engine: bwe } = await import("../../engines/SwissBackWorkingOp2Engine.js");
            result = bwe.generate(params as any);
            break;
          }
          case "turning_swiss_gang_layout": {
            const { swissGangSlideTurretEngine: sge } = await import("../../engines/SwissGangSlideTurretEngine.js");
            result = sge.layout(params as any);
            break;
          }
          // LATHE-PRO-MS6b: Bar-stock management + unmanned readiness (U-LPS24..U-LPS25)
          case "turning_swiss_bar_management": {
            const { swissBarProductionEngine: bpe } = await import("../../engines/SwissBarProductionEngine.js");
            result = bpe.plan(params as any);
            break;
          }
          case "turning_swiss_unmanned_score": {
            const { swissUnmannedReadinessEngine: ure } = await import("../../engines/SwissUnmannedReadinessEngine.js");
            result = ure.assess(params as any);
            break;
          }
          // LATHE-PRO-MS7: Chip control + coolant strategy (U-LPC01..U-LPC06)
          case "turning_chip_breaker_validate": {
            const { turningChipbreakerCatalogEngine: cce } = await import("../../engines/TurningChipbreakerCatalogEngine.js");
            result = cce.validate(params as any);
            break;
          }
          case "turning_chip_wrapping_risk": {
            const { turningChipWrappingRiskEngine: cwr } = await import("../../engines/TurningChipWrappingRiskEngine.js");
            result = cwr.assess(params as any);
            break;
          }
          case "turning_chip_unmanned_score": {
            const { turningChipUnmannedScoreEngine: cus } = await import("../../engines/TurningChipUnmannedScoreEngine.js");
            result = cus.assess(params as any);
            break;
          }
          case "turning_coolant_strategy": {
            const { coolantStrategyEngine: cse } = await import("../../engines/CoolantStrategyEngine.js");
            result = cse.calculate(params as any);
            break;
          }
          // LATHE-PRO-MS8: GD&T, inspection & metrology intelligence (U-LPQ01..U-LPQ08)
          case "turning_inspection_plan": {
            const { turningInspectionPlanEngine: tipe } = await import("../../engines/TurningInspectionPlanEngine.js");
            result = tipe.generate(params as any);
            break;
          }
          case "turning_fai_generate": {
            const { firstArticleInspectionPipelineEngine: faiE } = await import("../../engines/FirstArticleInspectionPipelineEngine.js");
            const p = params as any;
            const fai = await faiE.runFAI(p);
            const forms = p.fai_id ? faiE.generateForms(p.fai_id) : undefined;
            result = { fai, forms };
            break;
          }
          case "turning_cmm_program": {
            const { cmmPathPlanningEngine: cmm } = await import("../../engines/CMMPathPlanningEngine.js");
            result = cmm.planPath(params as any);
            break;
          }
          case "turning_spc_predict": {
            const { processCapabilityPredictionEngine: pcp } = await import("../../engines/ProcessCapabilityPredictionEngine.js");
            result = pcp.predict(params as any);
            break;
          }
          case "turning_gage_rr_check": {
            const { metrologyUncertaintyEngine: mue } = await import("../../engines/MetrologyUncertaintyEngine.js");
            result = mue.gageRR(params as any);
            break;
          }
          case "turning_quality_package": {
            const { turningQualityComplianceEngine: tqc } = await import("../../engines/TurningQualityComplianceEngine.js");
            const p = params as any;
            const requirements = tqc.planRequirements(p);
            result = p.produced ? tqc.checkPackage(requirements, p.produced) : requirements;
            break;
          }
          // LATHE-PRO-MS9: Quality compliance AS9100/ISO 13485/FDA (U-LPR01..U-LPR06)
          case "turning_biocompat_check": {
            const { turningBiocompatibleMaterialGuardEngine: bcg } = await import("../../engines/TurningBiocompatibleMaterialGuardEngine.js");
            result = bcg.check(params as any);
            break;
          }
          case "turning_compliance_check": {
            const { turningComplianceCheckEngine: tcc } = await import("../../engines/TurningComplianceCheckEngine.js");
            result = tcc.check(params as any);
            break;
          }
          case "turning_chip_analysis": {
            // Omnibus action: run chip-breaker validate + wrapping-risk + unmanned score in one call.
            const p = params as any;
            const [cceMod, cwrMod, cusMod] = await Promise.all([
              import("../../engines/TurningChipbreakerCatalogEngine.js"),
              import("../../engines/TurningChipWrappingRiskEngine.js"),
              import("../../engines/TurningChipUnmannedScoreEngine.js"),
            ]);
            const breaker = p.chipbreaker ? cceMod.turningChipbreakerCatalogEngine.validate(p.chipbreaker) : undefined;
            const wrapping = p.wrapping ? cwrMod.turningChipWrappingRiskEngine.assess(p.wrapping) : undefined;
            const unmanned = p.unmanned ? cusMod.turningChipUnmannedScoreEngine.assess({
              ...p.unmanned,
              wrapping_risk_score: p.unmanned.wrapping_risk_score ?? wrapping?.risk_score ?? 0,
              mitigations_applied: p.unmanned.mitigations_applied ?? wrapping?.mitigations.length ?? 0,
            }) : undefined;
            result = { breaker, wrapping, unmanned };
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

          // LATHE-PRO: Expanding mandrel grip + torque analysis
          case "lathe_mandrel_analyze": {
            const { expandingMandrelEngine } = await import("../../engines/ExpandingMandrelEngine.js");
            result = expandingMandrelEngine.analyze({
              mandrel: params.mandrel,
              part: params.part,
              actuator_force_n: params.actuator_force_n ?? 5000,
              rpm: params.rpm ?? 2000,
              mu: params.mu,
              cutting_force_n: params.cutting_force_n,
            });
            break;
          }

          // LATHE-PRO: Face driver pin-drive torque capacity
          case "lathe_face_driver_torque": {
            const { faceDriverTorqueEngine } = await import("../../engines/FaceDriverTorqueEngine.js");
            result = faceDriverTorqueEngine.analyze(
              params.driver,
              params.part_material,
              params.required_torque_nm
            );
            break;
          }

          // LATHE-PRO: Multi-channel sync-code verification
          case "lathe_sync_verify": {
            const { syncCodeVerificationEngine } = await import("../../engines/SyncCodeVerificationEngine.js");
            result = syncCodeVerificationEngine.verify(
              params.programs ?? [],
              params.dialect ?? "okuma"
            );
            break;
          }

          // LATHE-PRO: 3-jaw chuck trilobe deformation
          case "lathe_trilobe_deformation": {
            const { trilobeDeformationEngine } = await import("../../engines/TrilobeDeformationEngine.js");
            result = trilobeDeformationEngine.analyze({
              bore_radius_mm: params.bore_radius_mm ?? 50,
              wall_thickness_mm: params.wall_thickness_mm ?? 5,
              grip_length_mm: params.grip_length_mm ?? 40,
              total_clamp_force_n: params.total_clamp_force_n ?? 10000,
              jaw_count: params.jaw_count ?? 3,
              part_youngs_mpa: params.part_youngs_mpa,
              finish_tolerance_mm: params.finish_tolerance_mm,
            });
            break;
          }

          // LATHE-PRO: Generate machining rule envelopes
          case "lathe_rules_generate": {
            const { turningRulesGeneratorEngine } = await import("../../engines/TurningRulesGeneratorEngine.js");
            result = turningRulesGeneratorEngine.generate({
              material: params.material ?? "4140",
              iso_group: params.iso_group,
              operation: params.operation,
              tool_type: params.tool_type,
              machine_class: params.machine_class,
            });
            break;
          }

          // LATHE-PRO: Stock feed cycle validation
          case "lathe_stock_feed_validate": {
            const { stockFeedCycleEngine } = await import("../../engines/StockFeedCycleEngine.js");
            const state = stockFeedCycleEngine.createState(params.bar, params.part);
            if (typeof params.remaining_bar_mm === "number") {
              state.remaining_bar_mm = params.remaining_bar_mm;
            }
            result = {
              validation: stockFeedCycleEngine.validateFeed(state),
              state,
            };
            break;
          }

          // LATHE-PRO: Advance one stock feed cycle
          case "lathe_stock_feed_advance": {
            const { stockFeedCycleEngine } = await import("../../engines/StockFeedCycleEngine.js");
            const state = params.state ?? stockFeedCycleEngine.createState(params.bar, params.part);
            const event = stockFeedCycleEngine.advanceCycle(state);
            result = { event, state };
            break;
          }

          // LATHE-PRO: Stock yield report
          case "lathe_stock_feed_yield": {
            const { stockFeedCycleEngine } = await import("../../engines/StockFeedCycleEngine.js");
            result = stockFeedCycleEngine.getYield(params.bar, params.part);
            break;
          }

          // LATHE-PRO-MS5: Constant Surface Speed optimization (G96/G50 clamp)
          case "lathe_css_optimize": {
            const { latheCSSOptimizerEngine } = await import("../../engines/LatheCSSOptimizerEngine.js");
            result = latheCSSOptimizerEngine.optimize({
              Vc_m_min: params.Vc_m_min ?? params.vc_m_min,
              max_od_mm: params.max_od_mm,
              min_od_mm: params.min_od_mm,
              rated_max_rpm: params.rated_max_rpm,
              min_rpm: params.min_rpm,
              cut_length_mm: params.cut_length_mm,
              f_mm_rev: params.f_mm_rev,
            });
            break;
          }

          // LATHE-PRO-MS5: G96 vs G97 mode selection for a single feature
          case "lathe_css_select_mode": {
            const { latheCSSOptimizerEngine } = await import("../../engines/LatheCSSOptimizerEngine.js");
            result = latheCSSOptimizerEngine.selectMode(
              params.Vc_m_min ?? params.vc_m_min,
              params.diameter_mm,
              params.rated_max_rpm,
              params.feature_length_mm
            );
            break;
          }

          // LATHE-PRO-MS5: Hard turning (CBN/ceramic) vs grind decision
          case "lathe_hard_turn_decide": {
            const { hardTurningDecisionEngine } = await import("../../engines/HardTurningDecisionEngine.js");
            result = hardTurningDecisionEngine.decide({
              hardness_hrc: params.hardness_hrc,
              target_ra_um: params.target_ra_um,
              target_tolerance_mm: params.target_tolerance_mm,
              feature: params.feature ?? "od",
              lot_size: params.lot_size ?? 1,
              diameter_mm: params.diameter_mm,
              length_over_diameter: params.length_over_diameter,
              shop_has_grinder: params.shop_has_grinder,
              cbn_cost_per_edge_usd: params.cbn_cost_per_edge_usd,
              grind_cost_per_part_usd: params.grind_cost_per_part_usd,
              setup_hours: params.setup_hours,
            });
            break;
          }

          // LATHE-PRO-MS5: Coolant mode advisor (flood/HPC/mist/MQL/dry/cryo)
          case "lathe_coolant_advise": {
            const { latheCoolantAdvisorEngine } = await import("../../engines/LatheCoolantAdvisorEngine.js");
            result = latheCoolantAdvisorEngine.advise({
              iso_group: params.iso_group,
              operation: params.operation,
              tool_material: params.tool_material,
              Vc_m_min: params.Vc_m_min ?? params.vc_m_min,
              ap_mm: params.ap_mm,
              deep_hole: params.deep_hole,
              hard_turning: params.hard_turning,
              cryo_available: params.cryo_available,
              sustainability_priority: params.sustainability_priority,
              thru_spindle_available: params.thru_spindle_available,
            });
            break;
          }

          // LATHE-PRO-MS5: Detailed per-bucket time breakdown for a lathe op
          case "lathe_op_time_breakdown": {
            const { latheOpTimeBreakdownEngine } = await import("../../engines/LatheOpTimeBreakdownEngine.js");
            result = latheOpTimeBreakdownEngine.compute({
              cut_length_mm: params.cut_length_mm,
              feed_mm_min: params.feed_mm_min,
              pass_count: params.pass_count,
              rapid_travel_mm: params.rapid_travel_mm,
              rapid_feed_mm_min: params.rapid_feed_mm_min,
              tool_changes: params.tool_changes,
              tool_change_sec: params.tool_change_sec,
              thread_cycles: params.thread_cycles,
              thread_cycle_sec: params.thread_cycle_sec,
              probe_sequences: params.probe_sequences,
              probe_sec_each: params.probe_sec_each,
              chip_pause_interval_sec: params.chip_pause_interval_sec,
              chip_pause_duration_sec: params.chip_pause_duration_sec,
              spindle_rpm: params.spindle_rpm,
              spindle_accel_rps2: params.spindle_accel_rps2,
              load_unload_sec: params.load_unload_sec,
              fixed_overhead_sec: params.fixed_overhead_sec,
            });
            break;
          }

          // LATHE-PRO-MS5: Gilbert min-cost / min-time economic Vc
          case "lathe_gilbert_economic": {
            const { gilbertEconomicSpeedEngine } = await import("../../engines/GilbertEconomicSpeedEngine.js");
            result = gilbertEconomicSpeedEngine.compute({
              K_T: params.K_T ?? params.k_t,
              n: params.n,
              machining_cost_per_sec_usd: params.machining_cost_per_sec_usd,
              tool_change_time_sec: params.tool_change_time_sec,
              tool_cost_per_edge_usd: params.tool_cost_per_edge_usd,
              cut_length_mm: params.cut_length_mm,
              f_mm_rev: params.f_mm_rev,
              diameter_mm: params.diameter_mm,
              revenue_per_part_usd: params.revenue_per_part_usd,
              rpm_clamp: params.rpm_clamp,
            });
            break;
          }

          // LATHE-PRO-MS6: grind-replacement feasibility + cost/time savings
          case "lathe_grind_replace_evaluate": {
            const { grindingReplacementEngine } = await import("../../engines/GrindingReplacementEngine.js");
            result = grindingReplacementEngine.evaluate({
              baseline: params.baseline,
              hardness_hrc: params.hardness_hrc,
              length_over_diameter: params.length_over_diameter,
              diameter_mm: params.diameter_mm,
              wall_thickness_mm: params.wall_thickness_mm,
              lot_size: params.lot_size,
              residual_stress_requirement: params.residual_stress_requirement,
              concentricity_mm: params.concentricity_mm,
              turret_precision_mm: params.turret_precision_mm,
              cbn_cycle_sec_estimate: params.cbn_cycle_sec_estimate,
              cbn_cost_per_part_usd_estimate: params.cbn_cost_per_part_usd_estimate,
            });
            break;
          }

          // LATHE-PRO-MS6: FFD 1D bar stock cut plan
          case "lathe_bar_cut_plan": {
            const { barStockCutPlanEngine } = await import("../../engines/BarStockCutPlanEngine.js");
            result = barStockCutPlanEngine.plan({
              requirements: params.requirements,
              bar_options: params.bar_options,
              kerf_mm: params.kerf_mm,
            });
            break;
          }

          // LATHE-PRO-MS6: inspection plan generator
          case "lathe_inspection_plan": {
            const { turningInspectionPlanEngine } = await import("../../engines/TurningInspectionPlanEngine.js");
            result = turningInspectionPlanEngine.generate({
              part_id: params.part_id,
              lot_size: params.lot_size,
              features: params.features,
              regulatory_regime: params.regulatory_regime,
              cmm_available: params.cmm_available,
              probe_available: params.probe_available,
            });
            break;
          }

          // LATHE-PRO-MS7: bird-nest chip wrap risk prediction
          case "lathe_birdnest_predict": {
            const { latheBirdNestPredictorEngine } = await import("../../engines/LatheBirdNestPredictorEngine.js");
            result = latheBirdNestPredictorEngine.predict({
              material_iso_group: params.material_iso_group,
              ductility: params.ductility,
              vc_m_min: params.vc_m_min,
              feed_mm_rev: params.feed_mm_rev,
              doc_mm: params.doc_mm,
              clearance_length_mm: params.clearance_length_mm,
              length_over_diameter: params.length_over_diameter,
              lead_angle_deg: params.lead_angle_deg,
              chipbreaker: params.chipbreaker,
              coolant: params.coolant,
              inverted_mounting: params.inverted_mounting,
            });
            break;
          }

          // LATHE-PRO-MS7: parting / deep grooving chip clearance
          case "lathe_parting_chip_clearance": {
            const { lathePartingChipClearanceEngine } = await import("../../engines/LathePartingChipClearanceEngine.js");
            result = lathePartingChipClearanceEngine.evaluate({
              blade_width_mm: params.blade_width_mm,
              slot_depth_mm: params.slot_depth_mm,
              bar_od_mm: params.bar_od_mm,
              feed_mm_rev: params.feed_mm_rev,
              vc_m_min: params.vc_m_min,
              coolant_pressure_bar: params.coolant_pressure_bar,
              nozzle_diameter_mm: params.nozzle_diameter_mm,
              coolant_targeted: params.coolant_targeted,
              material_iso_group: params.material_iso_group,
              peck_depth_mm: params.peck_depth_mm,
            });
            break;
          }

          // LATHE-PRO-MS7: sub-spindle transfer purge timing
          case "lathe_subspindle_purge_plan": {
            const { latheSubSpindleTransferPurgeEngine } = await import("../../engines/LatheSubSpindleTransferPurgeEngine.js");
            result = latheSubSpindleTransferPurgeEngine.plan({
              main_rpm: params.main_rpm,
              decel_rps2: params.decel_rps2,
              transfer_length_mm: params.transfer_length_mm,
              transfer_diameter_mm: params.transfer_diameter_mm,
              material_iso_group: params.material_iso_group,
              coolant_pressure_bar: params.coolant_pressure_bar,
              air_blast_available: params.air_blast_available,
              air_blast_pressure_bar: params.air_blast_pressure_bar,
              synchronous_transfer: params.synchronous_transfer,
              controller: params.controller,
            });
            break;
          }

          // LATHE-PRO-MS8: parse FCF callout text
          case "lathe_gdt_callout_parse": {
            const { gdtCalloutParserEngine } = await import("../../engines/GDTCalloutParserEngine.js");
            if (params.line1 && params.line2) {
              result = gdtCalloutParserEngine.parseComposite(params.line1, params.line2);
            } else {
              result = gdtCalloutParserEngine.parse(params.callout ?? params.line1 ?? "");
            }
            break;
          }

          // LATHE-PRO-MS8: build A|B|C datum reference frame
          case "lathe_datum_reference_frame": {
            const { latheDatumReferenceFrameEngine } = await import("../../engines/LatheDatumReferenceFrameEngine.js");
            result = latheDatumReferenceFrameEngine.assign({
              part_id: params.part_id ?? "part",
              features: params.features ?? [],
              fixed_primary: params.fixed_primary,
              fixed_secondary: params.fixed_secondary,
              fixed_tertiary: params.fixed_tertiary,
            });
            break;
          }

          // LATHE-PRO-MS8: coaxiality/runout TIR stackup validation
          case "lathe_coax_runout_validate": {
            const { latheCoaxialityRunoutValidatorEngine } = await import("../../engines/LatheCoaxialityRunoutValidatorEngine.js");
            result = latheCoaxialityRunoutValidatorEngine.validate({
              callout: params.callout ?? "circular_runout",
              tolerance_mm: params.tolerance_mm,
              feature_diameter_mm: params.feature_diameter_mm,
              feature_length_mm: params.feature_length_mm,
              spindle_runout_mm: params.spindle_runout_mm,
              chuck_runout_mm: params.chuck_runout_mm,
              toolsetup_offset_mm: params.toolsetup_offset_mm,
              cutting_force_n: params.cutting_force_n,
              overhang_mm: params.overhang_mm,
              part_e_gpa: params.part_e_gpa,
              cpk_target: params.cpk_target,
            });
            break;
          }

          // LATHE-PRO-MS8: roundness/cylindricity sampling plan (ISO 12181)
          case "lathe_roundness_sampling_plan": {
            const { roundnessCylindricitySamplingEngine } = await import("../../engines/RoundnessCylindricitySamplingEngine.js");
            result = roundnessCylindricitySamplingEngine.plan({
              feature: params.feature ?? "roundness",
              method: params.method ?? "rotary_datum",
              tolerance_mm: params.tolerance_mm,
              diameter_mm: params.diameter_mm,
              length_mm: params.length_mm,
              expected_upr: params.expected_upr,
              filter_cutoff_upr: params.filter_cutoff_upr,
              precision_class: params.precision_class,
            });
            break;
          }

          // LATHE-PRO-MS8: Gage R&R / Measurement System Analysis
          case "lathe_gage_rr_msa": {
            const { gageRRMSAEngine } = await import("../../engines/GageRRMSAEngine.js");
            result = gageRRMSAEngine.analyze({
              measurements: params.measurements ?? [],
              tolerance_width: params.tolerance_width,
              method: params.method,
              process_sigma: params.process_sigma,
            });
            break;
          }

          // LATHE-PRO-MS8: inverse stackup — allocate assembly tol to components
          case "lathe_inverse_stackup_allocate": {
            const { inverseStackupAllocatorEngine } = await import("../../engines/InverseStackupAllocatorEngine.js");
            result = inverseStackupAllocatorEngine.allocate({
              assembly_tolerance_mm: params.assembly_tolerance_mm,
              method: params.method ?? "rss",
              components: params.components ?? [],
            });
            break;
          }

          // LATHE-PRO-MS8: FCF syntax validator
          case "lathe_fcf_syntax_validate": {
            const { fcfSyntaxValidatorEngine } = await import("../../engines/FCFSyntaxValidatorEngine.js");
            result = fcfSyntaxValidatorEngine.validate({
              fcf: params.fcf,
              feature_size_mm: params.feature_size_mm,
              is_feature_of_size: params.is_feature_of_size,
            });
            break;
          }

          // LATHE-PRO-MS8: profile deviation analysis
          case "lathe_profile_deviation_analyze": {
            const { profileDeviationAnalyzerEngine } = await import("../../engines/ProfileDeviationAnalyzerEngine.js");
            result = profileDeviationAnalyzerEngine.analyze({
              basis: params.basis ?? [],
              measured: params.measured ?? [],
              tolerance_mm: params.tolerance_mm,
              zone_type: params.zone_type,
              best_fit: params.best_fit,
            });
            break;
          }

          // LATHE-PRO-MS9: AS9100 / ISO 13485 / FDA compliance intelligence
          case "lathe_iso13485_evaluate": {
            const { iso13485QmsEngine } = await import("../../engines/ISO13485QMSEngine.js");
            result = iso13485QmsEngine.evaluate({
              device_class: params.device_class,
              sterile: params.sterile,
              implantable: params.implantable,
              software_containing: params.software_containing,
              evidence: params.evidence ?? [],
            });
            break;
          }

          case "lathe_nadcap_qualify": {
            const { nadcapProcessQualificationEngine } = await import("../../engines/NadcapProcessQualificationEngine.js");
            result = nadcapProcessQualificationEngine.qualify({
              process: params.process,
              cycle_months: params.cycle_months,
              last_audit_date: params.last_audit_date,
              line_items: params.line_items ?? [],
              operator_certs: params.operator_certs,
              tus_last_date: params.tus_last_date,
              accredited: params.accredited,
            });
            break;
          }

          case "lathe_dhf_evaluate": {
            const { designHistoryFileEngine } = await import("../../engines/DesignHistoryFileEngine.js");
            result = designHistoryFileEngine.evaluate({
              device_name: params.device_name ?? "device",
              device_class: params.device_class,
              risk_level: params.risk_level,
              artifacts: params.artifacts ?? [],
            });
            break;
          }

          case "lathe_process_validation_iqoqpq": {
            const { processValidationIQOQPQEngine } = await import("../../engines/ProcessValidationIQOQPQEngine.js");
            result = processValidationIQOQPQEngine.validate({
              process_name: params.process_name ?? "process",
              iq_items: params.iq_items ?? [],
              oq_runs: params.oq_runs ?? [],
              pq_runs: params.pq_runs ?? [],
              min_oq_replicates: params.min_oq_replicates,
              min_pq_runs: params.min_pq_runs,
              target_cpk: params.target_cpk,
            });
            break;
          }

          case "lathe_capa_evaluate": {
            const { capaWorkflowEngine } = await import("../../engines/CAPAWorkflowEngine.js");
            result = capaWorkflowEngine.evaluate({
              record: params.record,
              min_dwell_days: params.min_dwell_days,
              overdue_escalate_days: params.overdue_escalate_days,
              now: params.now,
            });
            break;
          }

          case "lathe_iso14971_risk": {
            const { iso14971RiskManagementEngine } = await import("../../engines/ISO14971RiskManagementEngine.js");
            result = iso14971RiskManagementEngine.evaluate({
              device_name: params.device_name ?? "device",
              intended_use: params.intended_use ?? "",
              hazards: params.hazards ?? [],
              acceptable_threshold: params.acceptable_threshold,
              alarp_upper: params.alarp_upper,
            });
            break;
          }

          case "lathe_eco_validate": {
            const { engineeringChangeOrderEngine } = await import("../../engines/EngineeringChangeOrderEngine.js");
            result = engineeringChangeOrderEngine.validate({
              record: params.record,
              now: params.now,
              class_i_approvers: params.class_i_approvers,
              class_ii_approvers: params.class_ii_approvers,
            });
            break;
          }

          case "lathe_counterfeit_assess": {
            const { counterfeitPartPreventionEngine } = await import("../../engines/CounterfeitPartPreventionEngine.js");
            result = counterfeitPartPreventionEngine.assess({
              part_number: params.part_number ?? "unknown",
              quantity: params.quantity ?? 1,
              critical_application: params.critical_application ?? false,
              provenance: params.provenance,
              auth_tests: params.auth_tests ?? [],
              packaging_intact_oem_seal: params.packaging_intact_oem_seal ?? false,
              esd_packaging_correct: params.esd_packaging_correct ?? false,
              reel_label_matches: params.reel_label_matches ?? false,
              ocm_coc_present: params.ocm_coc_present ?? false,
              lot_traceability_complete: params.lot_traceability_complete ?? false,
              gidep_prior_hit: params.gidep_prior_hit,
            });
            break;
          }

          // LATHE-PRO-MS10: Cost optimization & batch economics
          case "lathe_bar_feed_pitch": {
            const { barFeedPitchOptimizerEngine } = await import("../../engines/BarFeedPitchOptimizerEngine.js");
            result = barFeedPitchOptimizerEngine.optimize({
              part_length_mm: params.part_length_mm,
              quantity_needed: params.quantity_needed ?? 1,
              bar_length_mm: params.bar_length_mm,
              cutoff_kerf_mm: params.cutoff_kerf_mm,
              bar_end_loss_mm: params.bar_end_loss_mm,
              bar_head_face_mm: params.bar_head_face_mm,
              candidate_bar_diameters_mm: params.candidate_bar_diameters_mm,
              bar_diameter_mm: params.bar_diameter_mm,
              part_max_diameter_mm: params.part_max_diameter_mm,
              material_density_kgm3: params.material_density_kgm3,
              material_price_per_kg: params.material_price_per_kg,
              part_mass_kg: params.part_mass_kg,
            });
            break;
          }

          case "lathe_bar_remnant_plan": {
            const { barRemnantManagementEngine } = await import("../../engines/BarRemnantManagementEngine.js");
            result = barRemnantManagementEngine.plan(
              params.inventory ?? [],
              {
                part_length_mm: params.part_length_mm,
                quantity_needed: params.quantity_needed ?? 1,
                diameter_mm: params.diameter_mm,
                material: params.material,
                diameter_tol_mm: params.diameter_tol_mm,
                cutoff_kerf_mm: params.cutoff_kerf_mm,
                bar_head_face_mm: params.bar_head_face_mm,
                min_feasible_length_mm: params.min_feasible_length_mm,
                material_price_per_kg: params.material_price_per_kg,
                material_density_kgm3: params.material_density_kgm3,
              },
            );
            break;
          }

          case "lathe_part_cost_model": {
            const { lathePartCostModelEngine } = await import("../../engines/LathePartCostModelEngine.js");
            result = lathePartCostModelEngine.compute({
              cycle_time_s: params.cycle_time_s,
              machine_rate_per_hr: params.machine_rate_per_hr,
              operations: params.operations ?? [],
              part_mass_kg: params.part_mass_kg ?? 0,
              waste_mass_kg: params.waste_mass_kg ?? 0,
              material_price_per_kg: params.material_price_per_kg ?? 0,
              setup_time_s: params.setup_time_s ?? 0,
              setup_rate_per_hr: params.setup_rate_per_hr ?? 0,
              batch_size: params.batch_size ?? 1,
              scrap_rate: params.scrap_rate,
              spindle_power_kw: params.spindle_power_kw,
              energy_price_per_kwh: params.energy_price_per_kwh,
              secondary_ops: params.secondary_ops,
            });
            break;
          }

          case "lathe_aux_axis_timing": {
            const { latheAuxAxisTimingEngine } = await import("../../engines/LatheAuxAxisTimingEngine.js");
            result = latheAuxAxisTimingEngine.analyze({
              operations: params.operations ?? [],
              rapid_rate_mm_min: params.rapid_rate_mm_min,
              spindle_accel_rpm_s: params.spindle_accel_rpm_s,
              turret: params.turret ?? "BMT",
              turret_base_index_s: params.turret_base_index_s,
              turret_step_time_s: params.turret_step_time_s,
              coolant_settle_s: params.coolant_settle_s,
              chuck_actuate_s: params.chuck_actuate_s,
              tailstock_cycle_s: params.tailstock_cycle_s,
              part_catcher_cycle_s: params.part_catcher_cycle_s,
              lookahead_per_corner_s: params.lookahead_per_corner_s,
              live_tool_engage_s: params.live_tool_engage_s,
            });
            break;
          }

          case "lathe_feedback_tune": {
            const { latheActualFeedbackTuningEngine } = await import("../../engines/LatheActualFeedbackTuningEngine.js");
            result = latheActualFeedbackTuningEngine.tune({
              records: params.records ?? [],
              alpha: params.alpha,
              taylor: params.taylor ?? {},
              cycle_time_k: params.cycle_time_k,
              baseline_scrap_rate: params.baseline_scrap_rate,
              kc_scale: params.kc_scale,
              outlier_reject_ratio: params.outlier_reject_ratio,
            });
            break;
          }

          // LATHE-PRO-MS11: Shop floor integration & deployment
          case "lathe_dnc_transfer": {
            const { dncFileTransferEngine } = await import("../../engines/DNCFileTransferEngine.js");
            result = dncFileTransferEngine.buildTransfer({
              program_number: params.program_number,
              controller: params.controller ?? "fanuc",
              protocol: params.protocol ?? "rs232",
              program: params.program ?? params.program_body ?? "",
              baud: params.baud,
              max_size_bytes: params.max_size_bytes,
            });
            break;
          }

          case "lathe_mtconnect_status": {
            const { mtConnectLiveStatusEngine } = await import("../../engines/MTConnectLiveStatusEngine.js");
            result = mtConnectLiveStatusEngine.parse({
              items: params.items ?? [],
              total_blocks: params.total_blocks,
            });
            break;
          }

          case "lathe_changeover_brief": {
            const { latheChangeoverBriefEngine } = await import("../../engines/LatheChangeoverBriefEngine.js");
            result = latheChangeoverBriefEngine.generate(params as any);
            break;
          }

          case "lathe_first_piece_approve": {
            const { latheFirstPieceApprovalEngine } = await import("../../engines/LatheFirstPieceApprovalEngine.js");
            result = latheFirstPieceApprovalEngine.evaluate({
              job_id: params.job_id,
              part_number: params.part_number,
              operator: params.operator,
              inspector: params.inspector,
              readings: params.readings ?? [],
              warning_band_fraction: params.warning_band_fraction,
              instrument_uncertainty_mm: params.instrument_uncertainty_mm,
            });
            break;
          }

          case "lathe_probe_cycle": {
            const { latheOnMachineProbeCycleEngine } = await import("../../engines/LatheOnMachineProbeCycleEngine.js");
            result = latheOnMachineProbeCycleEngine.generate({
              cycle: params.cycle,
              nominal_mm: params.nominal_mm,
              tol_mm: params.tol_mm,
              probe_feed_mm_min: params.probe_feed_mm_min,
              approach_mm: params.approach_mm,
              macro_override: params.macro_override,
              wcs: params.wcs,
              axis: params.axis,
              probe_stylus_length_mm: params.probe_stylus_length_mm,
            });
            break;
          }

          case "lathe_chuck_jaw_setup": {
            const { latheChuckJawSetupEngine } = await import("../../engines/LatheChuckJawSetupEngine.js");
            result = latheChuckJawSetupEngine.compute({
              part_od_mm: params.part_od_mm,
              part_od_tol_mm: params.part_od_tol_mm,
              clamp_force_kn: params.clamp_force_kn,
              jaw_modulus_mpa: params.jaw_modulus_mpa,
              jaw_contact_area_mm2: params.jaw_contact_area_mm2,
              jaw_mass_kg: params.jaw_mass_kg,
              jaw_centroid_radius_mm: params.jaw_centroid_radius_mm,
              chuck_rated_max_rpm: params.chuck_rated_max_rpm,
              operating_rpm: params.operating_rpm,
              step_required: params.step_required,
              step_z_mm: params.step_z_mm,
              use_master_pressure: params.use_master_pressure,
            });
            break;
          }

          case "lathe_tool_offset_sync": {
            const { cncToolOffsetPersistenceEngine } = await import("../../engines/CNCToolOffsetPersistenceEngine.js");
            result = cncToolOffsetPersistenceEngine.sync({
              controller_records: params.controller_records ?? [],
              erp_records: params.erp_records ?? [],
              wear_band_mm: params.wear_band_mm,
              error_threshold_mm: params.error_threshold_mm,
            });
            break;
          }

          case "lathe_operator_audit": {
            const { operatorActionAuditTrailEngine } = await import("../../engines/OperatorActionAuditTrailEngine.js");
            result = operatorActionAuditTrailEngine.record({
              new_events: params.new_events,
              existing_trail: params.existing_trail,
              filter_machine_id: params.filter_machine_id,
              filter_operator_id: params.filter_operator_id,
              filter_from: params.filter_from,
              filter_to: params.filter_to,
              limit: params.limit,
            });
            break;
          }

          // LATHE-PRO-MS12: Simulation, verification & visualization
          case "lathe_block_engagement_sim": {
            const { latheBlockEngagementSimulatorEngine } = await import("../../engines/LatheBlockEngagementSimulatorEngine.js");
            result = latheBlockEngagementSimulatorEngine.simulate({
              blocks: params.blocks ?? [],
              stock_od_mm: params.stock_od_mm,
              nose_radius_mm: params.nose_radius_mm,
            });
            break;
          }

          case "lathe_stock_evolution": {
            const { latheStockEvolutionEngine } = await import("../../engines/LatheStockEvolutionEngine.js");
            result = latheStockEvolutionEngine.evolve({
              initial_od_mm: params.initial_od_mm,
              initial_length_mm: params.initial_length_mm,
              initial_id_mm: params.initial_id_mm,
              passes: params.passes ?? [],
              sample_step_mm: params.sample_step_mm,
            });
            break;
          }

          case "lathe_envelope_breach_replay": {
            const { latheEnvelopeBreachReplayEngine } = await import("../../engines/LatheEnvelopeBreachReplayEngine.js");
            result = latheEnvelopeBreachReplayEngine.replay({
              blocks: params.blocks ?? [],
              envelope: params.envelope,
            });
            break;
          }

          case "lathe_block_time_profile": {
            const { latheBlockTimeProfilerEngine } = await import("../../engines/LatheBlockTimeProfilerEngine.js");
            result = latheBlockTimeProfilerEngine.profile({
              blocks: params.blocks ?? [],
              top_n: params.top_n,
            });
            break;
          }

          case "lathe_deviation_map": {
            const { latheDeviationMapEngine } = await import("../../engines/LatheDeviationMapEngine.js");
            result = latheDeviationMapEngine.compare({
              commanded: params.commanded ?? [],
              actual: params.actual ?? [],
              tolerance_r_mm: params.tolerance_r_mm,
            });
            break;
          }

          case "lathe_program_backtrace": {
            const { latheProgramBacktraceEngine } = await import("../../engines/LatheProgramBacktraceEngine.js");
            result = latheProgramBacktraceEngine.trace({
              blocks: params.blocks ?? [],
              failing_block_n: params.failing_block_n,
              max_depth: params.max_depth,
            });
            break;
          }

          case "lathe_program_signoff_dossier": {
            const { latheProgramSignoffDossierEngine } = await import("../../engines/LatheProgramSignoffDossierEngine.js");
            result = latheProgramSignoffDossierEngine.assemble({
              program_id: params.program_id,
              engagement: params.engagement,
              stock: params.stock,
              breach: params.breach,
              time: params.time,
              deviation: params.deviation,
              deviation_tol_mm: params.deviation_tol_mm,
            });
            break;
          }

          case "lathe_replay_frame_compile": {
            const { latheReplayFrameCompilerEngine } = await import("../../engines/LatheReplayFrameCompilerEngine.js");
            result = latheReplayFrameCompilerEngine.compile({
              program_id: params.program_id,
              blocks: params.blocks ?? [],
              fps: params.fps,
            });
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

          // LATHE-MASTER U-LTH24: Full post-processor generator pipeline
          case "postgen_full": {
            const { PostgenValidatorSkipGuardHook } = await import("../../hooks/PostgenValidatorSkipGuardHook.js");
            const { LathePostGeneratorSpecIngestEngine } = await import("../../engines/LathePostGeneratorSpecIngestEngine.js");
            const { LathePostGeneratorDialectEngine } = await import("../../engines/LathePostGeneratorDialectEngine.js");
            const { LatheSwissPostGeneratorEngine } = await import("../../engines/LatheSwissPostGeneratorEngine.js");
            const { LathePostGeneratorValidatorWiringEngine } = await import("../../engines/LathePostGeneratorValidatorWiringEngine.js");
            const { LathePostRegressionTestGeneratorEngine } = await import("../../engines/LathePostRegressionTestGeneratorEngine.js");
            const { LathePostKnowledgeGraphEngine } = await import("../../engines/LathePostKnowledgeGraphEngine.js");
            const { LathePostGeneratorActiveLearningEngine } = await import("../../engines/LathePostGeneratorActiveLearningEngine.js");
            const { LathePostGeneratorUncertaintyEngine } = await import("../../engines/LathePostGeneratorUncertaintyEngine.js");

            const controller = params.controller ?? "fanuc-31it";
            const stages: any[] = [];
            const warnings: string[] = [];
            const errors: string[] = [];

            // 1. Preflight safety check
            const preflight = PostgenValidatorSkipGuardHook.preflight({
              controller,
              skip_categories: params.skip_categories,
              skip_validators: params.skip_validators,
              override_safety: params.override_safety,
            });
            stages.push({ stage: "preflight", ...preflight });
            if (!preflight.proceed && !params.override_safety) {
              result = { success: false, error: preflight.message, stages };
              break;
            }

            // 2. Spec ingestion (if provided)
            let controllerSpec: any = null;
            if (params.spec_text) {
              const ingestEngine = new LathePostGeneratorSpecIngestEngine();
              const ingestResult = ingestEngine.ingestFromText(params.spec_text, controller);
              controllerSpec = ingestResult.controller;
              stages.push({ stage: "ingest", success: ingestResult.success, controller: controllerSpec });
            }

            // 3. Skeleton generation
            const dialectEngine = new LathePostGeneratorDialectEngine();
            const dialect = params.dialect ?? dialectEngine.detectDialect(controller);
            const skeleton = dialectEngine.generateSkeleton(dialect, {
              features: params.features,
              reference_programs: params.reference_programs,
            });
            stages.push({ stage: "skeleton", dialect, blocks: skeleton.structure?.length ?? 0 });

            // 4. Transfer learning (Swiss-type if applicable)
            let transfer: any = null;
            if (params.source_controller || dialect === "citizen" || dialect === "tsugami") {
              const swissEngine = new LatheSwissPostGeneratorEngine();
              transfer = swissEngine.transferFromFanuc(
                params.source_controller ?? "fanuc-31it",
                controller,
                { mode: params.transfer_mode ?? "full" }
              );
              stages.push({ stage: "transfer", patterns: transfer?.mappings?.length ?? 0 });
            }

            // 5. Validation
            const validators = LathePostGeneratorValidatorWiringEngine.listValidators();
            const gcode = params.gcode ?? skeleton.sample_output ?? ["G28 U0 W0", "T0101", "M30"];
            const validation = LathePostGeneratorValidatorWiringEngine.validateProgram(
              gcode,
              validators.map(v => ({ ...v, enabled: true, strict: params.strict_mode ?? false }))
            );
            stages.push({ stage: "validate", passed: validation.passed, failed: validation.failed });

            // 6. Regression test generation
            let testResult: any = null;
            if (params.generate_tests !== false && params.reference_programs?.length) {
              testResult = LathePostRegressionTestGeneratorEngine.generateTest({
                gcode: params.reference_programs[0].split("\n"),
                program_id: params.program_id ?? "O0001",
                controller,
              });
              stages.push({ stage: "test_gen", patterns: testResult.patterns_found });
            }

            // 7. Knowledge graph registration
            const kgEngine = new LathePostKnowledgeGraphEngine();
            const kgNode = kgEngine.getNode(controller);
            const kgStats = kgEngine.getStats();
            stages.push({ stage: "knowledge_graph", registered: !!kgNode, stats: kgStats });

            // 8. Uncertainty analysis
            const uncertaintyEngine = new LathePostGeneratorUncertaintyEngine(params.uncertainty_config);
            const uncertainty = uncertaintyEngine.analyzeProgram(
              gcode,
              params.program_id ?? "O0001",
              controller
            );
            stages.push({
              stage: "uncertainty",
              confidence: uncertainty.overall_confidence,
              flagged: uncertainty.flagged_blocks,
            });

            // 9. Production readiness
            const prodReady = uncertaintyEngine.isProductionReady(gcode);

            result = {
              success: validation.success && prodReady.ready,
              controller,
              dialect,
              stages,
              validation_summary: {
                total: validation.total_validators,
                passed: validation.passed,
                failed: validation.failed,
              },
              uncertainty_summary: {
                overall_confidence: uncertainty.overall_confidence,
                flagged_blocks: uncertainty.flagged_blocks,
                risk_distribution: uncertainty.risk_distribution,
              },
              production_ready: prodReady.ready,
              blockers: prodReady.blockers,
              recommendations: uncertainty.recommendations,
              warnings,
              errors,
            };
            break;
          }

          // LATHE-PRO-V3 MS2 / U-LPT01: Wear-to-offset superposition
          case "turning_offset_compensation": {
            const { latheOffsetSuperpositionEngine } = await import("../../engines/LatheOffsetSuperpositionEngine.js");
            result = latheOffsetSuperpositionEngine.calculate(params as any);
            break;
          }

          // P0.2: Local LLM + LoRA Policy (U-LTH69-76)
          case "lathe_lora_build_dataset": {
            const { latheLoRADatasetBuilderEngine } = await import("../../engines/LatheLoRADatasetBuilderEngine.js");
            if (params.config) {
              latheLoRADatasetBuilderEngine.setConfig(params.config);
            }
            if (params.validate_path) {
              result = latheLoRADatasetBuilderEngine.validateDataset(params.validate_path);
            } else {
              result = await latheLoRADatasetBuilderEngine.build();
            }
            break;
          }

          case "lathe_lora_generate_training": {
            const { latheLoRATrainingScriptEngine } = await import("../../engines/LatheLoRATrainingScriptEngine.js");
            if (params.config) {
              latheLoRATrainingScriptEngine.setConfig(params.config);
            }
            if (params.preset) {
              latheLoRATrainingScriptEngine.applyPreset(params.preset);
            }
            const validation = latheLoRATrainingScriptEngine.validateConfig();
            result = {
              ...latheLoRATrainingScriptEngine.generateScript(),
              validation,
              inference_script: latheLoRATrainingScriptEngine.generateInferenceScript(),
            };
            break;
          }

          case "lathe_lora_evaluate": {
            const { latheLoRAEvalHarnessEngine } = await import("../../engines/LatheLoRAEvalHarnessEngine.js");
            if (params.config) {
              latheLoRAEvalHarnessEngine.setConfig(params.config);
            }
            if (params.sample) {
              result = latheLoRAEvalHarnessEngine.evaluateSample(
                params.sample.instruction,
                params.sample.input,
                params.sample.expected,
                params.sample.generated,
                params.sample.latency_ms
              );
            } else {
              result = {
                script: latheLoRAEvalHarnessEngine.generateEvalScript(),
                config: latheLoRAEvalHarnessEngine.getConfig(),
              };
            }
            break;
          }

          case "lathe_lora_merge_quant": {
            const { latheLoRAMergeQuantEngine } = await import("../../engines/LatheLoRAMergeQuantEngine.js");
            if (params.config) {
              latheLoRAMergeQuantEngine.setConfig(params.config);
            }
            result = {
              merge_script: latheLoRAMergeQuantEngine.generateMergeScript(),
              quant_script: latheLoRAMergeQuantEngine.generateQuantScript(),
              pipeline_script: latheLoRAMergeQuantEngine.generateFullPipeline(),
              size_estimate: latheLoRAMergeQuantEngine.estimateSize(params.model_name || "llama-3-8b"),
              validation: latheLoRAMergeQuantEngine.validateConfig(),
              recommendation: params.use_case ? latheLoRAMergeQuantEngine.recommendFormat(params.use_case) : undefined,
            };
            break;
          }

          case "lathe_lora_ollama_deploy": {
            const { latheOllamaIntegrationEngine } = await import("../../engines/LatheOllamaIntegrationEngine.js");
            if (params.config) {
              latheOllamaIntegrationEngine.setConfig(params.config);
            }
            result = {
              modelfile: latheOllamaIntegrationEngine.generateModelfile(),
              commands: {
                create: latheOllamaIntegrationEngine.getCreateCommand(),
                run: latheOllamaIntegrationEngine.getRunCommand(),
                show: latheOllamaIntegrationEngine.getShowCommand(),
              },
              deploy_script: latheOllamaIntegrationEngine.generateDeployScript(),
              health_check: latheOllamaIntegrationEngine.getHealthCheckScript(),
              python_client: latheOllamaIntegrationEngine.generatePythonClient(),
              validation: latheOllamaIntegrationEngine.validateConfig(),
            };
            break;
          }

          case "lathe_lora_pipeline_run": {
            const { latheLoRAPipelineEngine } = await import("../../engines/LatheLoRAPipelineEngine.js");
            if (params.config) {
              latheLoRAPipelineEngine.setConfig(params.config);
            }
            if (params.init) {
              result = latheLoRAPipelineEngine.initializePipeline();
            } else if (params.start_stage) {
              result = latheLoRAPipelineEngine.startStage(params.start_stage);
            } else if (params.complete_stage) {
              result = latheLoRAPipelineEngine.completeStage(
                params.complete_stage,
                params.outputs,
                params.metrics
              );
            } else {
              result = {
                script: latheLoRAPipelineEngine.generatePipelineScript(),
                report: latheLoRAPipelineEngine.generateReport(),
                state: latheLoRAPipelineEngine.getState(),
                validation: latheLoRAPipelineEngine.validateConfig(),
                estimate: latheLoRAPipelineEngine.getEstimatedDuration(),
              };
            }
            break;
          }

          case "lathe_lora_cadence_status": {
            const { latheLoRACadenceEngine } = await import("../../engines/LatheLoRACadenceEngine.js");
            if (params.config) {
              latheLoRACadenceEngine.setConfig(params.config);
            }
            if (params.record_programs) {
              latheLoRACadenceEngine.recordNewPrograms(params.record_programs);
            }
            if (params.start_run) {
              result = latheLoRACadenceEngine.startRun(params.trigger || "manual", params.notes);
            } else if (params.complete_run) {
              result = latheLoRACadenceEngine.completeRun(
                params.complete_run,
                params.metrics,
                params.model_path
              );
            } else if (params.promote_version) {
              result = latheLoRACadenceEngine.promoteVersion(params.promote_version);
            } else {
              result = {
                summary: latheLoRACadenceEngine.getSummary(),
                should_trigger: latheLoRACadenceEngine.shouldTriggerRun(),
                cron: latheLoRACadenceEngine.getCronExpression(),
                run_history: latheLoRACadenceEngine.getRunHistory(5),
                version_history: latheLoRACadenceEngine.getVersionHistory(5),
                active_version: latheLoRACadenceEngine.getActiveVersion(),
              };
            }
            break;
          }

          case "lathe_lora_inference": {
            const { latheOllamaIntegrationEngine } = await import("../../engines/LatheOllamaIntegrationEngine.js");
            if (params.config) {
              latheOllamaIntegrationEngine.setConfig(params.config);
            }
            const request = latheOllamaIntegrationEngine.buildGenerateRequest(
              params.instruction,
              params.input
            );
            result = {
              request,
              api_url: latheOllamaIntegrationEngine.getApiUrl("generate"),
              curl: latheOllamaIntegrationEngine.getCurlGenerate(params.instruction),
            };
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
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(wrapWithAwareness(result, awareness))) }] };
    }
  );
}
