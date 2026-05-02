/**
 * prism_turning â€” Turning-Specific Dispatcher
 * *** SAFETY CRITICAL *** â€” clamping forces affect workpiece ejection risk
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
let _cpkSurrogate: any, _insertLife: any, _offsetComp: any, _robustOpt: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "chuck": return _chuck ??= (await import("../../engines/ChuckJawForceEngine.js")).chuckJawForceEngine;
    case "tail": return _tail ??= (await import("../../engines/TailstockForceEngine.js")).tailstockForceEngine;
    case "steady": return _steady ??= (await import("../../engines/SteadyRestPlacementEngine.js")).steadyRestPlacementEngine;
    case "live": return _live ??= (await import("../../engines/LiveToolingEngine.js")).liveToolingEngine;
    case "bar": return _bar ??= (await import("../../engines/BarPullerTimingEngine.js")).barPullerTimingEngine;
    case "thread": return _thread ??= (await import("../../engines/SinglePointThreadEngine.js")).singlePointThreadEngine;
    case "partoff": return _partoff ??= (await import("../../engines/PartOffForceEngine.js")).partOffForceEngine;
    case "cpkSurrogate": return _cpkSurrogate ??= (await import("../../engines/TurningCpkSurrogateEngine.js")).turningCpkSurrogateEngine;
    case "insertLife": return _insertLife ??= (await import("../../engines/TurningInsertLifeEngine.js")).turningInsertLifeEngine;
    case "offsetComp": return _offsetComp ??= (await import("../../engines/TurningOffsetCompensationEngine.js")).turningOffsetCompensationEngine;
    case "robustOpt": return _robustOpt ??= (await import("../../engines/TurningRobustOptimizerEngine.js")).turningRobustOptimizerEngine;
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
  // WIRE-MS0/U-WIRE06: HardTurning orphan engines
  "hard_turn_decide", "hard_turn_optimize",
  // LATHE-PRO-MS6: Bar stock cut planning
  "bar_stock_cut_plan",
  // CAM-EXHAUST-MS0: Cpk/life/offset/optimizer engines
  "turning_cpk_surrogate", "turning_insert_life",
  "turning_offset_wear", "turning_offset_probe",
  "turning_robust_optimize",
  // INTEL-OLLAMA-OBSIDIAN-MS1/P1-U04: Swiss-type orphan engine wiring
  "swiss_route_decide", "swiss_guide_feed_limits", "swiss_guide_clearance",
  "swiss_part_transfer", "swiss_emit_channel_files",
  // LATHE-WIRE-MS0: lightweight orphan engine wiring (turning analytics)
  "turning_predict_batch_life", "turning_thread_optimize", "lathe_classify_part",
  // LATHE-WIRE-MS0/Batch2: safety signals + multi-op planning + sequence optimization
  "lathe_safety_signals", "lathe_multi_op_plan", "lathe_sequence_optimize",
  // LATHE-WIRE-MS0/Batch3: partoff safety rail + SLO registry + job scheduling
  "lathe_partoff_safety_eval", "lathe_slo_evaluate", "lathe_job_schedule",
  // LATHE-WIRE-MS0/Batch4: cost reconcile + job profitability + inventory upsert
  "lathe_cost_reconcile", "lathe_job_profitability_record", "lathe_inventory_upsert",
  // LATHE-WIRE-MS0/Batch5: print pipeline (strategy plan + sequence plan + setup select)
  "lathe_print_strategy_plan", "lathe_print_sequence_plan", "lathe_print_setup_select",
  // LATHE-WIRE-MS0/Batch6: post processor + dialect validator + spec ingest
  "lathe_post_process", "lathe_post_dialect_compare", "lathe_post_spec_ingest",
  // LATHE-WIRE-MS0/Batch7: print pipeline (emit + signoff + ingest)
  "lathe_print_program_emit", "lathe_print_program_signoff", "lathe_print_ingest",
  // LATHE-WIRE-MS0/Batch8: customer order + ERP orchestrator + master post router
  "lathe_customer_order_create", "lathe_erp_full", "lathe_masterpost_route",
  // LATHE-WIRE-MS0/Batch9: master post API (emit + validate + audit)
  "lathe_masterpost_emit", "lathe_masterpost_validate", "lathe_masterpost_audit",
  // LATHE-WIRE-MS0/Batch10: AI sequence + auto quote + orchestration pipeline
  "lathe_ai_optimize_sequence", "lathe_auto_quote", "lathe_orchestrate",
  // LATHE-WIRE-MS0/Batch11: feature recognize + tolerance stack + toolpath generate
  "lathe_feature_recognize", "lathe_tolerance_stack_analyze", "lathe_toolpath_generate",
  // LATHE-WIRE-MS0/Batch12: workholding jaw + safety predicate verify + proof-carrying emit
  "lathe_workholding_jaw_select", "lathe_safety_predicate_verify", "lathe_proof_carrying_emit",
  // LATHE-WIRE-MS0/Batch13: master post explain + ensemble cross-check + unified output
  "lathe_masterpost_explain", "lathe_masterpost_ensemble", "lathe_masterpost_unified_output",
  // LATHE-WIRE-MS0/Batch14: print-to-program AI trio (reasoning + knowledge graph + DL prediction)
  "lathe_p2p_reasoning_explain", "lathe_p2p_knowledge_graph_ingest", "lathe_p2p_dl_predict",
  // LATHE-WIRE-MS0/Batch15: dialect post + PO automation + adaptive recorder (3 engines)
  "lathe_post_dialect_generate", "lathe_po_build", "lathe_adaptive_record",
  // LATHE-WIRE-MS0/Batch16: AGI continuous learning + feature bridge + safety containment (3 engines)
  "lathe_agi_continuous_record", "lathe_agi_feature_reason", "lathe_agi_safety_check",
  // LATHE-WIRE-MS0/Batch17: LoRA cadence + dataset stats + drift detection (3 engines)
  "lathe_lora_cadence_status", "lathe_lora_dataset_stats", "lathe_lora_drift_detect",
  // LATHE-WIRE-MS0/Batch18: LoRA refinement + deployment + benchmark suite (3 engines)
  "lathe_lora_refinement_start", "lathe_lora_deploy_register", "lathe_lora_benchmark_test_cases",
  // LATHE-WIRE-MS0/Batch19: LoRA attention + validator + example generator (3 engines)
  "lathe_lora_attention_stats", "lathe_lora_dataset_validate_one", "lathe_lora_example_gen_stats",
  // LATHE-WIRE-MS0/Batch20: ensemble voter + embedding cache + AGI knowledge graph (3 engines)
  "lathe_lora_ensemble_vote", "lathe_lora_embedding_stats", "lathe_agi_kg_query",
] as const;

/** Registers turning dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerTurningDispatcher(server: any): void {
  server.tool(
    "prism_turning",
    `Turning-specific dispatcher â€” SAFETY CRITICAL. Chuck jaw force, tailstock, steady rest, live tooling, bar puller, single-point threading.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_turning] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case â†’ camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation â€” SAFETY CRITICAL
        const validation = validateActionParams(action, params, TURNING_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_turning"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS â€” blocks unsafe turning params
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
          // WIRE-MS0/U-WIRE06: HardTurning orphan engines
          case "hard_turn_decide": {
            const { hardTurningDecisionEngine } = await import("../../engines/HardTurningDecisionEngine.js");
            result = hardTurningDecisionEngine.decide(params as any);
            break;
          }
          case "hard_turn_optimize": {
            const { hardTurningCapstoneEngine } = await import("../../engines/HardTurningCapstoneEngine.js");
            result = hardTurningCapstoneEngine.optimize(params as any);
            break;
          }
          case "bar_stock_cut_plan": {
            const { barStockCutPlanEngine } = await import("../../engines/BarStockCutPlanEngine.js");
            result = barStockCutPlanEngine.plan(params as Parameters<typeof barStockCutPlanEngine.plan>[0]);
            break;
          }
          case "turning_cpk_surrogate": {
            const { turningCpkSurrogateEngine } = await import("../../engines/TurningCpkSurrogateEngine.js");
            result = turningCpkSurrogateEngine.predict(params as Parameters<typeof turningCpkSurrogateEngine.predict>[0]);
            break;
          }
          case "turning_insert_life": {
            const { turningInsertLifeEngine } = await import("../../engines/TurningInsertLifeEngine.js");
            result = turningInsertLifeEngine.predictLife(params as Parameters<typeof turningInsertLifeEngine.predictLife>[0]);
            break;
          }
          case "turning_offset_wear": {
            const { turningOffsetCompensationEngine } = await import("../../engines/TurningOffsetCompensationEngine.js");
            result = turningOffsetCompensationEngine.wearToOffset(params as Parameters<typeof turningOffsetCompensationEngine.wearToOffset>[0]);
            break;
          }
          case "turning_offset_probe": {
            const { turningOffsetCompensationEngine } = await import("../../engines/TurningOffsetCompensationEngine.js");
            result = turningOffsetCompensationEngine.generateProbingCycle(params as Parameters<typeof turningOffsetCompensationEngine.generateProbingCycle>[0]);
            break;
          }
          case "turning_robust_optimize": {
            const { turningRobustOptimizerEngine } = await import("../../engines/TurningRobustOptimizerEngine.js");
            result = turningRobustOptimizerEngine.run(params as Parameters<typeof turningRobustOptimizerEngine.run>[0]);
            break;
          }
          // INTEL-OLLAMA-OBSIDIAN-MS1/P1-U04: Swiss-type orphan engine wiring
          case "swiss_route_decide": {
            const { swissTypeDecisionEngine } = await import("../../engines/SwissTypeDecisionEngine.js");
            result = swissTypeDecisionEngine.decide(params as Parameters<typeof swissTypeDecisionEngine.decide>[0]);
            break;
          }
          case "swiss_guide_feed_limits": {
            const { swissGuideBushingPhysicsEngine } = await import("../../engines/SwissGuideBushingPhysicsEngine.js");
            const mode = (params.mode ?? "gb_on") as "gb_on" | "gb_off";
            const max_def = typeof params.max_deflection_mm === "number" ? params.max_deflection_mm : undefined;
            result = swissGuideBushingPhysicsEngine.feedLimits(mode, params as never, max_def);
            break;
          }
          case "swiss_guide_clearance": {
            const { swissGuideBushingPhysicsEngine } = await import("../../engines/SwissGuideBushingPhysicsEngine.js");
            result = swissGuideBushingPhysicsEngine.recommendClearance(params as never);
            break;
          }
          case "swiss_part_transfer": {
            const { swissPartTransferSequenceEngine } = await import("../../engines/SwissPartTransferSequenceEngine.js");
            result = swissPartTransferSequenceEngine.generate(params as never);
            break;
          }
          case "swiss_emit_channel_files": {
            const { swissChannelFileEmitterEngine } = await import("../../engines/SwissChannelFileEmitterEngine.js");
            result = swissChannelFileEmitterEngine.emit(params as never);
            break;
          }
          // ── LATHE-WIRE-MS0: lightweight orphan engine wiring ──
          case "turning_predict_batch_life": {
            const { turningWearPredictionEngine } = await import("../../engines/TurningWearPredictionEngine.js");
            try {
              result = turningWearPredictionEngine.predictBatchLife(params as Parameters<typeof turningWearPredictionEngine.predictBatchLife>[0]);
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "turning_thread_optimize": {
            const { turningThreadOptimizerEngine } = await import("../../engines/TurningThreadOptimizerEngine.js");
            try {
              result = turningThreadOptimizerEngine.optimize(params as Parameters<typeof turningThreadOptimizerEngine.optimize>[0]);
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_classify_part": {
            const { lathePartClassifierEngine } = await import("../../engines/LathePartClassifierEngine.js");
            try {
              result = lathePartClassifierEngine.classify(params as Parameters<typeof lathePartClassifierEngine.classify>[0]);
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          // ── LATHE-WIRE-MS0/Batch2: safety + planning + sequencing ──
          case "lathe_safety_signals": {
            const { latheSafetySignalEngine } = await import("../../engines/LatheSafetySignalEngine.js");
            try {
              result = latheSafetySignalEngine.compute(params as Parameters<typeof latheSafetySignalEngine.compute>[0]);
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_multi_op_plan": {
            const { latheMultiOpPlannerEngine } = await import("../../engines/LatheMultiOpPlannerEngine.js");
            try {
              result = latheMultiOpPlannerEngine.plan(params as Parameters<typeof latheMultiOpPlannerEngine.plan>[0]);
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_sequence_optimize": {
            const { latheSequenceOptimizerEngine } = await import("../../engines/LatheSequenceOptimizerEngine.js");
            const ops = (params as Record<string, unknown>).operations;
            if (!Array.isArray(ops)) { result = { success: false, error: "operations array required" }; break; }
            try {
              const constraints = (params as Record<string, unknown>).constraints;
              result = latheSequenceOptimizerEngine.optimize(
                ops as Parameters<typeof latheSequenceOptimizerEngine.optimize>[0],
                constraints as Parameters<typeof latheSequenceOptimizerEngine.optimize>[1],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_partoff_safety_eval": {
            const { lathePartoffSafetyRailEngine } = await import("../../engines/LathePartoffSafetyRailEngine.js");
            const op = (params as Record<string, unknown>).op;
            if (!op || typeof op !== "object") { result = { success: false, error: "op required (PartoffOpSpec)" }; break; }
            try {
              result = lathePartoffSafetyRailEngine.evaluate(
                op as Parameters<typeof lathePartoffSafetyRailEngine.evaluate>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_slo_evaluate": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            const metric = (params as Record<string, unknown>).metric;
            if (!metric || typeof metric !== "object") { result = { success: false, error: "metric required (LatheSLOMetric)" }; break; }
            try {
              result = lathePerformanceSLORegistryEngine.evaluate(
                metric as Parameters<typeof lathePerformanceSLORegistryEngine.evaluate>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_job_schedule": {
            const { latheJobSchedulingEngine } = await import("../../engines/LatheJobSchedulingEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (ScheduleInput)" }; break; }
            try {
              result = latheJobSchedulingEngine.schedule(
                input as Parameters<typeof latheJobSchedulingEngine.schedule>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_cost_reconcile": {
            const { latheActualCostReconciliationEngine } = await import("../../engines/LatheActualCostReconciliationEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (ReconcileInput)" }; break; }
            try {
              result = latheActualCostReconciliationEngine.reconcile(
                input as Parameters<typeof latheActualCostReconciliationEngine.reconcile>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_job_profitability_record": {
            const { latheJobProfitabilityAnalyticsEngine } = await import("../../engines/LatheJobProfitabilityAnalyticsEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (RecordJobInput)" }; break; }
            try {
              result = latheJobProfitabilityAnalyticsEngine.recordJob(
                input as Parameters<typeof latheJobProfitabilityAnalyticsEngine.recordJob>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_inventory_upsert": {
            const { latheInventoryIntelligenceEngine } = await import("../../engines/LatheInventoryIntelligenceEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (UpsertItemInput)" }; break; }
            try {
              result = latheInventoryIntelligenceEngine.upsertItem(
                input as Parameters<typeof latheInventoryIntelligenceEngine.upsertItem>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_print_strategy_plan": {
            const { lathePrintFeatureStrategySelectorEngine } = await import("../../engines/LathePrintFeatureStrategySelectorEngine.js");
            const features = (params as Record<string, unknown>).features;
            const material = (params as Record<string, unknown>).material;
            if (!Array.isArray(features)) { result = { success: false, error: "features array required (FeatureInput[])" }; break; }
            if (!material || typeof material !== "object") { result = { success: false, error: "material required (MaterialInput)" }; break; }
            try {
              const machine = (params as Record<string, unknown>).machine;
              const tolerance = (params as Record<string, unknown>).tolerance;
              result = lathePrintFeatureStrategySelectorEngine.generateStrategyPlan(
                features as Parameters<typeof lathePrintFeatureStrategySelectorEngine.generateStrategyPlan>[0],
                material as Parameters<typeof lathePrintFeatureStrategySelectorEngine.generateStrategyPlan>[1],
                machine as Parameters<typeof lathePrintFeatureStrategySelectorEngine.generateStrategyPlan>[2],
                tolerance as Parameters<typeof lathePrintFeatureStrategySelectorEngine.generateStrategyPlan>[3],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_print_sequence_plan": {
            const { lathePrintSequencePlannerEngine } = await import("../../engines/LathePrintSequencePlannerEngine.js");
            const strategyPlan = (params as Record<string, unknown>).strategy_plan;
            const stock = (params as Record<string, unknown>).stock;
            const features = (params as Record<string, unknown>).features;
            if (!strategyPlan || typeof strategyPlan !== "object") { result = { success: false, error: "strategy_plan required (StrategyPlan)" }; break; }
            if (!stock || typeof stock !== "object") { result = { success: false, error: "stock required (StockInput)" }; break; }
            if (!Array.isArray(features)) { result = { success: false, error: "features array required (FeatureInput[])" }; break; }
            try {
              result = lathePrintSequencePlannerEngine.planSequence(
                strategyPlan as Parameters<typeof lathePrintSequencePlannerEngine.planSequence>[0],
                stock as Parameters<typeof lathePrintSequencePlannerEngine.planSequence>[1],
                features as Parameters<typeof lathePrintSequencePlannerEngine.planSequence>[2],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_print_setup_select": {
            const { lathePrintSetupSelectionEngine } = await import("../../engines/LathePrintSetupSelectionEngine.js");
            const geometry = (params as Record<string, unknown>).geometry;
            const material = (params as Record<string, unknown>).material;
            const loads = (params as Record<string, unknown>).loads;
            if (!geometry || typeof geometry !== "object") { result = { success: false, error: "geometry required (PartGeometry)" }; break; }
            if (!material || typeof material !== "object") { result = { success: false, error: "material required (MaterialInput)" }; break; }
            if (!loads || typeof loads !== "object") { result = { success: false, error: "loads required (CuttingLoadInput)" }; break; }
            try {
              const chucks = (params as Record<string, unknown>).chucks;
              result = lathePrintSetupSelectionEngine.selectSetup(
                geometry as Parameters<typeof lathePrintSetupSelectionEngine.selectSetup>[0],
                material as Parameters<typeof lathePrintSetupSelectionEngine.selectSetup>[1],
                loads as Parameters<typeof lathePrintSetupSelectionEngine.selectSetup>[2],
                chucks as Parameters<typeof lathePrintSetupSelectionEngine.selectSetup>[3],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_post_process": {
            const { lathePostProcessorEngine } = await import("../../engines/LathePostProcessorEngine.js");
            const input = (params as Record<string, unknown>).input;
            const config = (params as Record<string, unknown>).config;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (LatheInput)" }; break; }
            if (!config || typeof config !== "object") { result = { success: false, error: "config required (LathePostConfig)" }; break; }
            try {
              result = lathePostProcessorEngine.process(
                input as Parameters<typeof lathePostProcessorEngine.process>[0],
                config as Parameters<typeof lathePostProcessorEngine.process>[1],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_post_dialect_compare": {
            const { lathePostProcessorDialectValidatorEngine } = await import("../../engines/LathePostProcessorDialectValidatorEngine.js");
            const refPath = (params as Record<string, unknown>).reference_path;
            const refContent = (params as Record<string, unknown>).reference_content;
            const genContent = (params as Record<string, unknown>).generated_content;
            if (typeof refPath !== "string") { result = { success: false, error: "reference_path string required" }; break; }
            if (typeof refContent !== "string") { result = { success: false, error: "reference_content string required" }; break; }
            if (typeof genContent !== "string") { result = { success: false, error: "generated_content string required" }; break; }
            try {
              result = lathePostProcessorDialectValidatorEngine.compare(refPath, refContent, genContent);
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_post_spec_ingest": {
            const { lathePostGeneratorSpecIngestEngine } = await import("../../engines/LathePostGeneratorSpecIngestEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (SpecIngestionInput)" }; break; }
            try {
              result = lathePostGeneratorSpecIngestEngine.ingest(
                input as Parameters<typeof lathePostGeneratorSpecIngestEngine.ingest>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_print_program_emit": {
            const { lathePrintProgramEmitterEngine } = await import("../../engines/LathePrintProgramEmitterEngine.js");
            const program = (params as Record<string, unknown>).program;
            const options = (params as Record<string, unknown>).options;
            if (!program || typeof program !== "object") { result = { success: false, error: "program required (ToolpathProgram)" }; break; }
            if (!options || typeof options !== "object") { result = { success: false, error: "options required (EmitOptions)" }; break; }
            try {
              result = lathePrintProgramEmitterEngine.emit(
                program as Parameters<typeof lathePrintProgramEmitterEngine.emit>[0],
                options as Parameters<typeof lathePrintProgramEmitterEngine.emit>[1],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_print_program_signoff": {
            const { lathePrintProgramSignoffEngine } = await import("../../engines/LathePrintProgramSignoffEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (SignoffInput)" }; break; }
            try {
              result = lathePrintProgramSignoffEngine.generatePackage(
                input as Parameters<typeof lathePrintProgramSignoffEngine.generatePackage>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_print_ingest": {
            const { lathePrintIngestPipelineEngine } = await import("../../engines/LathePrintIngestPipelineEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required ({raw_text, filename?, format?, page_count?})" }; break; }
            const rawText = (input as Record<string, unknown>).raw_text;
            if (typeof rawText !== "string" || rawText.length === 0) { result = { success: false, error: "input.raw_text non-empty string required" }; break; }
            try {
              result = lathePrintIngestPipelineEngine.ingest(
                input as Parameters<typeof lathePrintIngestPipelineEngine.ingest>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_customer_order_create": {
            const { latheCustomerOrderLifecycleEngine } = await import("../../engines/LatheCustomerOrderLifecycleEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (CreateOrderInput)" }; break; }
            try {
              result = latheCustomerOrderLifecycleEngine.createOrder(
                input as Parameters<typeof latheCustomerOrderLifecycleEngine.createOrder>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_erp_full": {
            const { latheERPOrchestratorEngine } = await import("../../engines/LatheERPOrchestratorEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (ERPFullInput)" }; break; }
            try {
              result = latheERPOrchestratorEngine.erpFull(
                input as Parameters<typeof latheERPOrchestratorEngine.erpFull>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_masterpost_route": {
            const { latheMasterPostRouterEngine } = await import("../../engines/LatheMasterPostRouterEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (LatheRouteInput)" }; break; }
            try {
              result = latheMasterPostRouterEngine.route(
                input as Parameters<typeof latheMasterPostRouterEngine.route>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_masterpost_emit": {
            const { latheMasterPostAPIEngine } = await import("../../engines/LatheMasterPostAPIEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (EmitInput)" }; break; }
            try {
              result = latheMasterPostAPIEngine.emit(
                input as Parameters<typeof latheMasterPostAPIEngine.emit>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_masterpost_validate": {
            const { latheMasterPostAPIEngine } = await import("../../engines/LatheMasterPostAPIEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (ValidateInput)" }; break; }
            try {
              result = latheMasterPostAPIEngine.validate(
                input as Parameters<typeof latheMasterPostAPIEngine.validate>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_masterpost_audit": {
            const { latheMasterPostAPIEngine } = await import("../../engines/LatheMasterPostAPIEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (AuditInput)" }; break; }
            try {
              result = latheMasterPostAPIEngine.audit(
                input as Parameters<typeof latheMasterPostAPIEngine.audit>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_ai_optimize_sequence": {
            const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
            const operations = (params as Record<string, unknown>).operations;
            if (!Array.isArray(operations)) { result = { success: false, error: "operations array required (id+type+tool_type+priority? per element)" }; break; }
            try {
              result = latheAIReasoningEngine.optimizeSequence(
                operations as Parameters<typeof latheAIReasoningEngine.optimizeSequence>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_auto_quote": {
            const { latheAutoQuoteFromPrintEngine } = await import("../../engines/LatheAutoQuoteFromPrintEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (AutoQuoteInput)" }; break; }
            try {
              result = latheAutoQuoteFromPrintEngine.generateQuote(
                input as Parameters<typeof latheAutoQuoteFromPrintEngine.generateQuote>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_orchestrate": {
            const { latheOrchestrationEngine } = await import("../../engines/LatheOrchestrationEngine.js");
            const orchInput = (params as Record<string, unknown>).input;
            const orchAction = (params as Record<string, unknown>).orch_action;
            if (!orchInput || typeof orchInput !== "object") { result = { success: false, error: "input required (LatheOrchestrationInput)" }; break; }
            try {
              const actionTag = typeof orchAction === "string" ? orchAction : "default";
              result = latheOrchestrationEngine.calculate(
                actionTag,
                orchInput as Parameters<typeof latheOrchestrationEngine.calculate>[1],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_feature_recognize": {
            const { latheTurningFeatureRecognizerEngine } = await import("../../engines/LatheTurningFeatureRecognizerEngine.js");
            const intake = (params as Record<string, unknown>).intake;
            if (!intake || typeof intake !== "object") { result = { success: false, error: "intake required (BlueprintIntake)" }; break; }
            try {
              result = latheTurningFeatureRecognizerEngine.recognize(
                intake as Parameters<typeof latheTurningFeatureRecognizerEngine.recognize>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_tolerance_stack_analyze": {
            const { lathePrintToleranceStackEngine } = await import("../../engines/LathePrintToleranceStackEngine.js");
            const features = (params as Record<string, unknown>).features;
            const budgetMm = (params as Record<string, unknown>).budget_mm;
            if (!Array.isArray(features)) { result = { success: false, error: "features array required (RecognizedFeature[])" }; break; }
            if (typeof budgetMm !== "number" || !Number.isFinite(budgetMm)) { result = { success: false, error: "budget_mm finite number required" }; break; }
            try {
              result = lathePrintToleranceStackEngine.analyzeStacks(
                features as Parameters<typeof lathePrintToleranceStackEngine.analyzeStacks>[0],
                budgetMm,
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_toolpath_generate": {
            const { lathePrintToolpathGeneratorEngine } = await import("../../engines/LathePrintToolpathGeneratorEngine.js");
            const sequencePlan = (params as Record<string, unknown>).sequence_plan;
            const features = (params as Record<string, unknown>).features;
            const material = (params as Record<string, unknown>).material;
            if (!sequencePlan || typeof sequencePlan !== "object") { result = { success: false, error: "sequence_plan required (SequencePlan)" }; break; }
            if (!Array.isArray(features)) { result = { success: false, error: "features array required (FeatureInput[])" }; break; }
            if (!material || typeof material !== "object") { result = { success: false, error: "material required (MaterialInput)" }; break; }
            try {
              const limits = (params as Record<string, unknown>).limits;
              result = lathePrintToolpathGeneratorEngine.generateProgram(
                sequencePlan as Parameters<typeof lathePrintToolpathGeneratorEngine.generateProgram>[0],
                features as Parameters<typeof lathePrintToolpathGeneratorEngine.generateProgram>[1],
                material as Parameters<typeof lathePrintToolpathGeneratorEngine.generateProgram>[2],
                limits as Parameters<typeof lathePrintToolpathGeneratorEngine.generateProgram>[3],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_workholding_jaw_select": {
            const { latheWorkholdingEngine } = await import("../../engines/LatheWorkholdingEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (JawSelectionInput)" }; break; }
            try {
              result = latheWorkholdingEngine.selectJaw(
                input as Parameters<typeof latheWorkholdingEngine.selectJaw>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_safety_predicate_verify": {
            const { latheSafetyPredicateEngine } = await import("../../engines/LatheSafetyPredicateEngine.js");
            const signals = (params as Record<string, unknown>).signals;
            if (!signals || typeof signals !== "object") { result = { success: false, error: "signals required (LatheSafetySignals)" }; break; }
            try {
              const envelope = (params as Record<string, unknown>).envelope;
              result = latheSafetyPredicateEngine.verify(
                signals as Parameters<typeof latheSafetyPredicateEngine.verify>[0],
                envelope as Parameters<typeof latheSafetyPredicateEngine.verify>[1],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_proof_carrying_emit": {
            const { latheProofCarryingEmitEngine } = await import("../../engines/LatheProofCarryingEmitEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (ProofEmitInput)" }; break; }
            try {
              result = latheProofCarryingEmitEngine.emit(
                input as Parameters<typeof latheProofCarryingEmitEngine.emit>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_masterpost_explain": {
            const { latheMasterPostDeepReasoningEngine } = await import("../../engines/LatheMasterPostDeepReasoningEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (DeepReasoningInput)" }; break; }
            try {
              result = latheMasterPostDeepReasoningEngine.explainSelection(
                input as Parameters<typeof latheMasterPostDeepReasoningEngine.explainSelection>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_masterpost_ensemble": {
            const { latheMasterPostEnsembleCrossCheckEngine } = await import("../../engines/LatheMasterPostEnsembleCrossCheckEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (EnsembleInput)" }; break; }
            try {
              result = latheMasterPostEnsembleCrossCheckEngine.runEnsemble(
                input as Parameters<typeof latheMasterPostEnsembleCrossCheckEngine.runEnsemble>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_masterpost_unified_output": {
            const { LatheMasterPostUnifiedOutputEngine } = await import("../../engines/LatheMasterPostUnifiedOutputEngine.js");
            const config = (params as Record<string, unknown>).config;
            if (!config || typeof config !== "object") { result = { success: false, error: "config required (UnifiedHeaderConfig)" }; break; }
            try {
              result = LatheMasterPostUnifiedOutputEngine.generateUnifiedOutput(
                config as Parameters<typeof LatheMasterPostUnifiedOutputEngine.generateUnifiedOutput>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_p2p_reasoning_explain": {
            const { lathePrintToProgramReasoningEngine } = await import("../../engines/LathePrintToProgramReasoningEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (ReasoningInput)" }; break; }
            try {
              result = lathePrintToProgramReasoningEngine.explain(
                input as Parameters<typeof lathePrintToProgramReasoningEngine.explain>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_p2p_knowledge_graph_ingest": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import("../../engines/LathePrintToProgramKnowledgeGraphEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (IngestionInput)" }; break; }
            try {
              result = lathePrintToProgramKnowledgeGraphEngine.ingest(
                input as Parameters<typeof lathePrintToProgramKnowledgeGraphEngine.ingest>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_p2p_dl_predict": {
            const { lathePrintToProgramDLIntelligenceEngine } = await import("../../engines/LathePrintToProgramDLIntelligenceEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (DLInput)" }; break; }
            try {
              result = lathePrintToProgramDLIntelligenceEngine.predict(
                input as Parameters<typeof lathePrintToProgramDLIntelligenceEngine.predict>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          // ============================================================
          // LATHE-WIRE-MS0/Batch15: dialect post + PO automation + adaptive recorder
          // ============================================================
          case "lathe_post_dialect_generate": {
            const { lathePostGeneratorDialectEngine } = await import("../../engines/LathePostGeneratorDialectEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (DialectGenerationInput)" }; break; }
            try {
              result = lathePostGeneratorDialectEngine.generate(
                input as Parameters<typeof lathePostGeneratorDialectEngine.generate>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_po_build": {
            const { lathePurchaseOrderAutomationEngine } = await import("../../engines/LathePurchaseOrderAutomationEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (BuildPOInput)" }; break; }
            try {
              result = lathePurchaseOrderAutomationEngine.build(
                input as Parameters<typeof lathePurchaseOrderAutomationEngine.build>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_adaptive_record": {
            const { latheAdaptiveMachiningEngine } = await import("../../engines/LatheAdaptiveMachiningEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (TurningEngagementProfile)" }; break; }
            try {
              latheAdaptiveMachiningEngine.recordOperation(
                input as Parameters<typeof latheAdaptiveMachiningEngine.recordOperation>[0],
              );
              result = { success: true, history_size: latheAdaptiveMachiningEngine.getOperationHistory().length };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          // ============================================================
          // LATHE-WIRE-MS0/Batch16: AGI continuous learning + feature bridge + safety
          // ============================================================
          case "lathe_agi_continuous_record": {
            const { latheAGIContinuousLearningEngine } = await import("../../engines/LatheAGIContinuousLearningEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (RecordFeedbackInput)" }; break; }
            try {
              result = latheAGIContinuousLearningEngine.recordFeedback(
                input as Parameters<typeof latheAGIContinuousLearningEngine.recordFeedback>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_agi_feature_reason": {
            const { latheAGIFeatureBridgeEngine } = await import("../../engines/LatheAGIFeatureBridgeEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (AGIReasonInput)" }; break; }
            try {
              result = latheAGIFeatureBridgeEngine.reason(
                input as Parameters<typeof latheAGIFeatureBridgeEngine.reason>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_agi_safety_check": {
            const { latheAGISafetyContainmentEngine } = await import("../../engines/LatheAGISafetyContainmentEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (SafetyCheckInput)" }; break; }
            try {
              result = latheAGISafetyContainmentEngine.check(
                input as Parameters<typeof latheAGISafetyContainmentEngine.check>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          // ============================================================
          // LATHE-WIRE-MS0/Batch17: LoRA cadence + dataset stats + drift detection
          // ============================================================
          case "lathe_lora_cadence_status": {
            const { latheLoRACadenceEngine } = await import("../../engines/LatheLoRACadenceEngine.js");
            try {
              result = {
                success: true,
                trigger: latheLoRACadenceEngine.shouldTriggerRun(),
                state: latheLoRACadenceEngine.getState(),
                config: latheLoRACadenceEngine.getConfig(),
              };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_lora_dataset_stats": {
            const { latheLoRADatasetBuilderEngine } = await import("../../engines/LatheLoRADatasetBuilderEngine.js");
            try {
              result = { success: true, stats: latheLoRADatasetBuilderEngine.getStats() };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_lora_drift_detect": {
            const { latheLoRADriftDetectorEngine } = await import("../../engines/LatheLoRADriftDetectorEngine.js");
            const input = (params as Record<string, unknown>).input as Record<string, unknown> | undefined;
            const modelId = input && typeof input.modelId === "string" ? input.modelId : "";
            if (!modelId) { result = { success: false, error: "input.modelId (string) required" }; break; }
            try {
              result = {
                success: true,
                detections: latheLoRADriftDetectorEngine.detectDrift(modelId),
                needs_retraining: latheLoRADriftDetectorEngine.needsRetraining(modelId),
              };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          // ============================================================
          // LATHE-WIRE-MS0/Batch18: LoRA refinement + deployment + benchmark
          // ============================================================
          case "lathe_lora_refinement_start": {
            const { latheLoRAAdaptiveRefinementEngine } = await import("../../engines/LatheLoRAAdaptiveRefinementEngine.js");
            const input = (params as Record<string, unknown>).input as Record<string, unknown> | undefined;
            const query = input && typeof input.query === "string" ? input.query : "";
            const initialResponse = input && typeof input.initialResponse === "string" ? input.initialResponse : "";
            if (!query || !initialResponse) {
              result = { success: false, error: "input.query (string) and input.initialResponse (string) required" };
              break;
            }
            try {
              result = latheLoRAAdaptiveRefinementEngine.startSession(query, initialResponse);
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_lora_deploy_register": {
            const { latheLoRADeploymentEngine } = await import("../../engines/LatheLoRADeploymentEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (DeploymentTarget)" }; break; }
            try {
              result = latheLoRADeploymentEngine.registerTarget(
                input as Parameters<typeof latheLoRADeploymentEngine.registerTarget>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_lora_benchmark_test_cases": {
            const { latheLoRABenchmarkSuiteEngine } = await import("../../engines/LatheLoRABenchmarkSuiteEngine.js");
            try {
              result = {
                success: true,
                test_cases: latheLoRABenchmarkSuiteEngine.getTestCases(),
                config: latheLoRABenchmarkSuiteEngine.getConfig(),
              };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          // ============================================================
          // LATHE-WIRE-MS0/Batch19: LoRA attention + validator + example gen
          // ============================================================
          case "lathe_lora_attention_stats": {
            const { latheLoRAAttentionAnalyzerEngine } = await import("../../engines/LatheLoRAAttentionAnalyzerEngine.js");
            try {
              result = {
                success: true,
                stats: latheLoRAAttentionAnalyzerEngine.getStats(),
                config: latheLoRAAttentionAnalyzerEngine.getConfig(),
              };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_lora_dataset_validate_one": {
            const { latheLoRADatasetValidatorEngine } = await import("../../engines/LatheLoRADatasetValidatorEngine.js");
            const input = (params as Record<string, unknown>).input;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required (LoRAExample | TrainingExample)" }; break; }
            try {
              result = { success: true, issues: latheLoRADatasetValidatorEngine.validateSingle(
                input as Parameters<typeof latheLoRADatasetValidatorEngine.validateSingle>[0],
              ) };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_lora_example_gen_stats": {
            const { latheLoRAExampleGeneratorEngine } = await import("../../engines/LatheLoRAExampleGeneratorEngine.js");
            try {
              result = { success: true, stats: latheLoRAExampleGeneratorEngine.getStats() };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          // ============================================================
          // LATHE-WIRE-MS0/Batch20: ensemble voter + embedding cache + AGI KG
          // ============================================================
          case "lathe_lora_ensemble_vote": {
            const { latheLoRAEnsembleVoterEngine } = await import("../../engines/LatheLoRAEnsembleVoterEngine.js");
            const input = (params as Record<string, unknown>).input as Record<string, unknown> | undefined;
            if (!input || typeof input !== "object") { result = { success: false, error: "input required ({predictions, strategy?})" }; break; }
            const predictions = Array.isArray(input.predictions) ? input.predictions : null;
            if (!predictions) {
              result = { success: false, error: "input.predictions (ModelPrediction[]) required" };
              break;
            }
            try {
              result = latheLoRAEnsembleVoterEngine.vote(
                predictions as Parameters<typeof latheLoRAEnsembleVoterEngine.vote>[0],
                input.strategy as Parameters<typeof latheLoRAEnsembleVoterEngine.vote>[1],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_lora_embedding_stats": {
            const { latheLoRAEmbeddingCacheEngine } = await import("../../engines/LatheLoRAEmbeddingCacheEngine.js");
            try {
              result = { success: true, stats: latheLoRAEmbeddingCacheEngine.getStats() };
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
            break;
          }
          case "lathe_agi_kg_query": {
            const { latheAGIKnowledgeUnificationEngine } = await import("../../engines/LatheAGIKnowledgeUnificationEngine.js");
            const input = (params as Record<string, unknown>).input;
            try {
              result = latheAGIKnowledgeUnificationEngine.query(
                (input && typeof input === "object" ? input : {}) as Parameters<typeof latheAGIKnowledgeUnificationEngine.query>[0],
              );
            } catch (err) {
              result = { success: false, error: (err as Error).message };
            }
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
            // PostProcessor is non-blocking â€” fallback to original G-code
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
