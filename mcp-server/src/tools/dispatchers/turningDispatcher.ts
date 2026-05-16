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
// OBSIDIAN-AUTOMATE-MS3/U-PROBE-EXPOSE
let _omvProbe: any;
// OBSIDIAN-AUTOMATE-MS3/U-WIRE-LATHE-BATCH11
let _firstPiece: any, _envBreach: any, _auxAxis: any, _drf: any;
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
    // OBSIDIAN-AUTOMATE-MS3/U-PROBE-EXPOSE
    case "omvProbe": return _omvProbe ??= (await import("../../engines/LatheOnMachineProbeCycleEngine.js")).latheOnMachineProbeCycleEngine;
    // OBSIDIAN-AUTOMATE-MS3/U-WIRE-LATHE-BATCH11
    case "firstPiece": return _firstPiece ??= (await import("../../engines/LatheFirstPieceApprovalEngine.js")).latheFirstPieceApprovalEngine;
    case "envBreach": return _envBreach ??= (await import("../../engines/LatheEnvelopeBreachReplayEngine.js")).latheEnvelopeBreachReplayEngine;
    case "auxAxis": return _auxAxis ??= (await import("../../engines/LatheAuxAxisTimingEngine.js")).latheAuxAxisTimingEngine;
    case "drf": return _drf ??= (await import("../../engines/LatheDatumReferenceFrameEngine.js")).latheDatumReferenceFrameEngine;
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
  // MS-PRINT-PROGRAM-LOOP/U-PPL-A1: structural fingerprint + cluster classify
  "turning_min_fingerprint", "turning_min_classify",
  // MS-PRINT-PROGRAM-LOOP/U-PPL-B1: program reoptimization orchestrator (lathe arm)
  "lathe_program_reoptimize",
  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH1: 6 unwired lathe engines
  "lathe_css_optimize",                  // LatheCSSOptimizerEngine.optimize
  "lathe_chip_predict_type",             // LatheChipMechanicsEngine.predictChipType
  "lathe_coolant_advise",                // LatheCoolantAdvisorEngine.advise
  "lathe_birdnest_predict",              // LatheBirdNestPredictorEngine.predict
  "lathe_coaxiality_runout_validate",    // LatheCoaxialityRunoutValidatorEngine.validate
  "lathe_block_time_profile",            // LatheBlockTimeProfilerEngine.profile

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH2: 6 unwired AI/intelligence/knowledge engines
  "lathe_anomaly_detect_program",        // LatheAnomalyDetectionEngine.detectProgramAnomalies
  "lathe_causal_build_model",            // LatheCausalInferenceEngine.buildCausalModel
  "lathe_ensemble_stats",                // LatheEnsembleLearningEngine.getStats
  "lathe_changeover_stats",              // LatheChangeoverBriefEngine.getStats
  "lathe_jmdie_extract_customer",        // LatheJMDieKnowledgeEngine.extractCustomerPatterns
  "lathe_metallurgy_tool_steel_db",      // LatheMetallurgyEngine.getToolSteelDatabase

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH3: 6 unwired knowledge/predictive/troubleshoot engines
  "lathe_knowledge_harvest_programs",    // LatheKnowledgeHarvesterEngine.harvestFromPrograms
  "lathe_program_analyze",               // LatheProgramOptimizerEngine.analyzeProgram
  "lathe_expert_material_strategy",      // LatheExpertAdvisorEngine.getMaterialStrategy
  "lathe_machine_get_profile",           // LatheMachineIntelligenceEngine.getMachineProfile
  "lathe_troubleshoot_overhang",         // LatheTroubleshootingIntelligenceEngine.analyzeToolOverhang
  "lathe_predictive_tool_wear",          // LathePredictiveIntelligenceEngine.predictToolWear

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH4: 6 unwired tribal/science/reasoning engines
  "lathe_tribal_stats",                  // LatheTribalInjectorEngine.getStats
  "lathe_unified_science_version",       // LatheUnifiedScienceEngine.getVersion
  "lathe_unified_science_recommend",     // LatheUnifiedScienceEngine.recommendParameters
  "lathe_kinematics_get_machine_specs",  // LatheKinematicsDeepLearningEngine.getMachineSpecs
  "lathe_neural_intel_stats",            // LatheNeuralIntelligenceEngine.getStatistics
  "lathe_jmdie_extract_operations",      // LatheJMDieKnowledgeEngine.extractOperationSequences

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH5: 6 unwired LoRA-cadence/post-uncertainty/deep-reasoning engines
  "lathe_lora_cadence_state",            // LatheLoRACadenceEngine.getState
  "lathe_lora_cadence_should_trigger",   // LatheLoRACadenceEngine.shouldTriggerRun
  "lathe_lora_cadence_active_version",   // LatheLoRACadenceEngine.getActiveVersion
  "lathe_deep_reasoning_record_outcome", // LatheDeepReasoningEngine.recordOutcome
  "lathe_post_uncertainty_analyze_block",// LathePostGeneratorUncertaintyEngine.analyzeBlock
  "lathe_post_uncertainty_prod_ready",   // LathePostGeneratorUncertaintyEngine.isProductionReady

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH6: 6 unwired feedback/stock/deviation/signoff/engagement/chuck engines (stats surfaces)
  "lathe_actual_feedback_tuning_stats",  // LatheActualFeedbackTuningEngine.getStats
  "lathe_stock_evolution_stats",         // LatheStockEvolutionEngine.getStats
  "lathe_deviation_map_stats",           // LatheDeviationMapEngine.getStats
  "lathe_program_signoff_stats",         // LatheProgramSignoffDossierEngine.getStats
  "lathe_block_engagement_stats",        // LatheBlockEngagementSimulatorEngine.getStats
  "lathe_chuck_jaw_setup_stats",         // LatheChuckJawSetupEngine.getStats

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH7: 6 unwired LoRA pipeline/cron/registry/health/drift/verification engines
  "lathe_lora_pipeline_estimated_duration", // LatheLoRAPipelineEngine.getEstimatedDuration
  "lathe_lora_cron_schedule_summary",       // LatheLoRACronJobEngine.getScheduleSummary
  "lathe_lora_registry_stats",              // LatheLoRAModelRegistryEngine.getStats
  "lathe_lora_health_summary",              // LatheLoRAHealthMonitorEngine.getSummary
  "lathe_lora_drift_config",                // LatheLoRADriftDetectorEngine.getConfig
  "lathe_lora_verification_test_cases",     // LatheLoRAVerificationEngine.getTestCases

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH8: 6 unwired LoRA voter/combiner/deployment/cache/refinement/attention engines
  "lathe_lora_voter_stats",                 // LatheLoRAEnsembleVoterEngine.getStats
  "lathe_lora_combiner_stats",              // LatheLoRAEnsembleCombinerEngine.getStats
  "lathe_lora_deployment_stats",            // LatheLoRADeploymentEngine.getStats
  "lathe_lora_embedding_cache_stats",       // LatheLoRAEmbeddingCacheEngine.getStats
  "lathe_lora_adaptive_refinement_stats",   // LatheLoRAAdaptiveRefinementEngine.getStats
  "lathe_lora_attention_analyzer_stats",    // LatheLoRAAttentionAnalyzerEngine.getStats

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH9: 6 unwired LoRA benchmark/continual/dataset/ensemble-orch/experiment/hyperparam engines
  "lathe_lora_benchmark_test_cases",        // LatheLoRABenchmarkSuiteEngine.getTestCases
  "lathe_lora_continual_buffer_stats",      // LatheLoRAContinualLearningEngine.getBufferStats
  "lathe_lora_dataset_stats",               // LatheLoRADatasetBuilderEngine.getStats
  "lathe_lora_ensemble_orch_stats",         // LatheLoRAEnsembleOrchestratorEngine.getStats
  "lathe_lora_experiment_stats",            // LatheLoRAExperimentTrackerEngine.getStats
  "lathe_lora_hyperparam_presets",          // LatheLoRAHyperparameterOptimizerEngine.listPresets

  // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH10: 6 unwired LoRA cadence-orch/knowledge-graph/master-orch/model-selector/monitoring/resource-mgr engines
  "lathe_lora_cadence_orch_config",         // LatheLoRACadenceOrchestratorEngine.getConfig
  "lathe_lora_knowledge_graph_stats",       // LatheLoRAKnowledgeGraphEngine.getStats
  "lathe_lora_master_orch_stats",           // LatheLoRAMasterOrchestratorEngine.getStats
  "lathe_lora_model_selector_stats",        // LatheLoRAModelSelectorEngine.getStats
  "lathe_lora_monitoring_stats",            // LatheLoRAMonitoringEngine.getStats
  "lathe_lora_resource_manager_stats",      // LatheLoRAResourceManagerEngine.getStats

  // OBSIDIAN-AUTOMATE-MS3/U-PROBE-EXPOSE: surface LatheOnMachineProbeCycleEngine
  "lathe_omv_probe_generate",               // LatheOnMachineProbeCycleEngine.generate (Renishaw OMV macro G-code)
  "lathe_omv_probe_stats",                  // LatheOnMachineProbeCycleEngine.getStats (supported cycles + ref)

  // OBSIDIAN-AUTOMATE-MS3/U-WIRE-LATHE-BATCH11: 4 small lathe orphans
  "lathe_first_piece_approval_evaluate",    // LatheFirstPieceApprovalEngine.evaluate
  "lathe_first_piece_approval_stats",       // LatheFirstPieceApprovalEngine.getStats
  "lathe_envelope_breach_replay",           // LatheEnvelopeBreachReplayEngine.replay
  "lathe_envelope_breach_replay_stats",     // LatheEnvelopeBreachReplayEngine.getStats
  "lathe_aux_axis_timing_analyze",          // LatheAuxAxisTimingEngine.analyze
  "lathe_aux_axis_timing_stats",            // LatheAuxAxisTimingEngine.getStats
  "lathe_datum_reference_frame_assign",     // LatheDatumReferenceFrameEngine.assign
  "lathe_datum_reference_frame_stats",      // LatheDatumReferenceFrameEngine.getStats

  // MACRO-DOMAIN-MS0/U-MACRO-LIB: macro library cross-wire (NON-safety-critical lookup + template placement)
  // Mirrors prism_cad — the engine lives in CAD because part-folder layout is CAD-owned, but lathe macros
  // are turning-domain so this dispatcher must surface them too. Same engine, same schemas, same params.
  "macro_library_list",                     // MacroLibraryEngine.listMacros — the 4 OSP lathe macros + parsed VC variable maps
  "macro_match_family",                     // MacroLibraryEngine.matchFamily — match part → wafer-insert / casing / casing-counterbore / top-hat-casing
  "macro_place_template",                   // MacroLibraryEngine.placeMacroTemplate — copy macro as _MACRO-TEMPLATE_*.min into <part>/CNC PROGRAM/ (DO-NOT-RUN-AS-IS header)
  "macro_fanout_dry_run",                   // MacroLibraryEngine.fanoutDryRun — scan _PART LIBRARY/, report matchable parts per macro family
  "macro_fill_candidate",                   // MS0-U2: MacroFillOrchestratorEngine.fillCandidate — fill VC vars from print dims + call U3 generator (SAFETY-CRITICAL: returns candidate, NEVER a file)
  "macro_gate_candidate",                   // MS0-U4: MacroCandidateGateEngine.gateCandidate — S(x) ≥ 0.70 HARD BLOCK + envelope + spindle + material sanity → dossier (LOAD-BEARING SAFETY)
  "macro_emit_per_machine",                 // MS0-U5: MacroPerMachineEmitterEngine.emitPerMachine — per-machine re-gate + .MIN emit (SAFETY-CRITICAL: file ONLY when that machine's S(x) ≥ 0.70)
  "macro_bulk_emit_batch",                  // MS0-U6: MacroBulkEmitOrchestratorEngine.emitBatch — gated bulk path, refuses batch n if n-1 not approved, every emit needsOperatorReview
  "macro_approve_batch",                    // MS0-U6: MacroBulkEmitOrchestratorEngine.approveBatch — operator approves batch n, creating _BATCH_<n>_APPROVED marker

  // TRAINING-LEARNING-MS0/U1: LathePartFamilyTemplateExtractorEngine surfaces
  "lathe_training_corpus_status",           // catalogCorpus — per-family counts + customers + coverage
  "lathe_training_template_match",          // extractTemplate — emit TrainingTemplate for one family (optionally writes <family>.json)
  "lathe_training_template_list",           // listTemplates — on-disk template directory listing

  // TRAINING-LEARNING-MS0/U-TL-U5: LathePartFamilyMatcherEngine — query-side matcher
  "lathe_part_family_match",                // matchPartFamily — rank families by signal similarity for a descriptor

  // TRAINING-LEARNING-MS0/U-TL-U6: TrainingTemplateContinuousLearningEngine
  "training_ingest_lathe_outcome",          // ingestLatheOutcome — append shipped-job outcome to lathe ledger

  // WIRE-UNWIRED-MS0/U-WIRE-TURNINSP: TurningInspectionPlanEngine
  "turning_inspection_plan",                // generate — first-article + production inspection plan (AQL/ISO/AS9102)

  // WIRE-UNWIRED-MS0/U-WIRE-PARTOFF: LathePartoffSafetyRailEngine (SAFETY-CRITICAL)
  "lathe_partoff_safety_gate",              // evaluate — 7-gate parting-off go/no-go rail

  // WIRE-UNWIRED-MS0/U-WIRE-LWH: LatheWorkholdingEngine (SAFETY-RELEVANT — ISO 10218)
  "lathe_workholding_select_jaw",           // selectJaw — decision tree across 7 jaw types
  "lathe_workholding_trilobe",              // calculateTrilobe — thin-ring 3-jaw distortion (Nee & Tao)
  "lathe_workholding_face_driver",          // calculateFaceDriver — pin-circle torque transmission
  "lathe_workholding_expanding_mandrel",    // calculateExpandingMandrel — Lame thick-wall grip
  "lathe_workholding_magnetic_chuck",       // calculateMagneticChuck — ferrous-only holding force
  "lathe_workholding_stock_form",           // stockFormRecommendation — jaw + G71/G72/G73 selection

  // WIRE-UNWIRED-MS0/U-WIRE-LSO: LatheSequenceOptimizerEngine (LATHE-PRO-MS3/U-LPS02)
  "lathe_sequence_optimize",                // optimize — multi-criteria operation sequencing w/ hard constraints
  "lathe_sequence_validate",                // validateSequence — return hard-constraint violation list

  // WIRE-UNWIRED-MS0/U-WIRE-TWP: TurningWearPredictionEngine (LATHE-PRO-MS1 U-LPR14/15/16)
  "turning_wear_per_op",                    // accumulatePerOperation — Usui dW/dt + per-station accumulation
  "turning_wear_chip_form",                 // predictChipForm — ISO-group → chip type → wear mode mapping
  "turning_wear_batch_life",                // predictBatchLife — parts-per-edge + change schedule + Vc optimization

  // WIRE-UNWIRED-MS0/U-WIRE-TTW: TurningToolpathWearEngine (LATHE-PRO-MS1/U-LPR12)
  "turning_toolpath_wear",                  // accumulateWear — CSS-aware per-segment wear + interrupted-cut shock + engagement factor
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
          // ─────────────────────────────────────────────────────────────────
          // MS-PRINT-PROGRAM-LOOP/U-PPL-A1: TurningMinFingerprintEngine
          // Wraps with { success, data } envelope (partFamilyMatch pattern)
          // so downstream consumers can branch on success WITHOUT unpacking
          // the engine's discriminated {ok: true|false} shape.
          // ─────────────────────────────────────────────────────────────────
          case "turning_min_fingerprint": {
            const { turningMinFingerprintEngine } = await import("../../engines/TurningMinFingerprintEngine.js");
            const { okumaOSPParserEngine } = await import("../../engines/OkumaOSPParserEngine.js");
            const p = params as { text?: string; base64?: string; filename?: string };
            // Schema already enforces exactly-one-of text/base64.
            const raw = p.text !== undefined
              ? Buffer.from(p.text, "utf8")
              : Buffer.from(p.base64 as string, "base64");
            const parseFn = okumaOSPParserEngine.parse.bind(okumaOSPParserEngine);
            const data = turningMinFingerprintEngine.fromBytes(raw, parseFn, p.filename);
            result = { success: true, data };
            break;
          }
          case "turning_min_classify": {
            const { turningMinFingerprintEngine, DEFAULT_DISTANCE_THRESHOLD } =
              await import("../../engines/TurningMinFingerprintEngine.js");
            const p = params as {
              fingerprint: Parameters<typeof turningMinFingerprintEngine.classify>[0];
              anchors: Parameters<typeof turningMinFingerprintEngine.classify>[1];
              threshold?: number;
            };
            const data = turningMinFingerprintEngine.classify(
              p.fingerprint,
              p.anchors,
              p.threshold ?? DEFAULT_DISTANCE_THRESHOLD,
            );
            result = { success: true, data };
            break;
          }
          // ─────────────────────────────────────────────────────────────────
          // MS-PRINT-PROGRAM-LOOP/U-PPL-B1: ProgramReoptimizationOrchestrator
          // (lathe arm — prism_cam/prism_mill/prism_dev wiring is U-PPL-B2)
          // ─────────────────────────────────────────────────────────────────
          case "lathe_program_reoptimize": {
            const { programReoptimizationOrchestratorEngine } =
              await import("../../engines/ProgramReoptimizationOrchestratorEngine.js");
            const p = params as Parameters<
              typeof programReoptimizationOrchestratorEngine.reoptimize
            >[0];
            // Force lathe routing through this dispatcher (it IS the lathe one)
            // unless the caller explicitly overrides.
            const data = await programReoptimizationOrchestratorEngine.reoptimize({
              ...p,
              process: p.process ?? "lathe",
            });
            result = { success: data.ok, data };
            break;
          }
          // ─────────────────────────────────────────────────────────────────
          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH1: 6 unwired lathe engines
          // ─────────────────────────────────────────────────────────────────
          case "lathe_css_optimize": {
            const { latheCSSOptimizerEngine } = await import("../../engines/LatheCSSOptimizerEngine.js");
            result = latheCSSOptimizerEngine.optimize(params as Parameters<typeof latheCSSOptimizerEngine.optimize>[0]);
            break;
          }
          case "lathe_chip_predict_type": {
            const { latheChipMechanicsEngine } = await import("../../engines/LatheChipMechanicsEngine.js");
            const p = params as { conditions: Parameters<typeof latheChipMechanicsEngine.predictChipType>[0]; material: Parameters<typeof latheChipMechanicsEngine.predictChipType>[1] };
            if (!p.conditions || !p.material) throw new Error("lathe_chip_predict_type requires 'conditions' and 'material'");
            result = latheChipMechanicsEngine.predictChipType(p.conditions, p.material);
            break;
          }
          case "lathe_coolant_advise": {
            const { latheCoolantAdvisorEngine } = await import("../../engines/LatheCoolantAdvisorEngine.js");
            result = latheCoolantAdvisorEngine.advise(params as Parameters<typeof latheCoolantAdvisorEngine.advise>[0]);
            break;
          }
          case "lathe_birdnest_predict": {
            const { latheBirdNestPredictorEngine } = await import("../../engines/LatheBirdNestPredictorEngine.js");
            result = latheBirdNestPredictorEngine.predict(params as Parameters<typeof latheBirdNestPredictorEngine.predict>[0]);
            break;
          }
          case "lathe_coaxiality_runout_validate": {
            const { latheCoaxialityRunoutValidatorEngine } = await import("../../engines/LatheCoaxialityRunoutValidatorEngine.js");
            result = latheCoaxialityRunoutValidatorEngine.validate(params as Parameters<typeof latheCoaxialityRunoutValidatorEngine.validate>[0]);
            break;
          }
          case "lathe_block_time_profile": {
            const { latheBlockTimeProfilerEngine } = await import("../../engines/LatheBlockTimeProfilerEngine.js");
            result = latheBlockTimeProfilerEngine.profile(params as Parameters<typeof latheBlockTimeProfilerEngine.profile>[0]);
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH2: 6 unwired AI/intelligence/knowledge engines
          case "lathe_anomaly_detect_program": {
            const { latheAnomalyDetectionEngine } = await import("../../engines/LatheAnomalyDetectionEngine.js");
            const program = (params as { program: Parameters<typeof latheAnomalyDetectionEngine.detectProgramAnomalies>[0] }).program
                          ?? (params as Parameters<typeof latheAnomalyDetectionEngine.detectProgramAnomalies>[0]);
            if (!program || typeof program.program_id !== "string" || !Array.isArray(program.blocks)) {
              throw new Error("lathe_anomaly_detect_program requires {program_id, blocks[]}");
            }
            result = latheAnomalyDetectionEngine.detectProgramAnomalies(program);
            break;
          }
          case "lathe_causal_build_model": {
            const { latheCausalInferenceEngine } = await import("../../engines/LatheCausalInferenceEngine.js");
            const p = params as { domain: Parameters<typeof latheCausalInferenceEngine.buildCausalModel>[0] };
            if (typeof p.domain !== "string") throw new Error("lathe_causal_build_model requires 'domain'");
            result = latheCausalInferenceEngine.buildCausalModel(p.domain);
            break;
          }
          case "lathe_ensemble_stats": {
            const { latheEnsembleLearningEngine } = await import("../../engines/LatheEnsembleLearningEngine.js");
            result = latheEnsembleLearningEngine.getStats();
            break;
          }
          case "lathe_changeover_stats": {
            const { latheChangeoverBriefEngine } = await import("../../engines/LatheChangeoverBriefEngine.js");
            result = latheChangeoverBriefEngine.getStats();
            break;
          }
          case "lathe_jmdie_extract_customer": {
            const { latheJMDieKnowledgeEngine } = await import("../../engines/LatheJMDieKnowledgeEngine.js");
            const p = params as { customer: string };
            if (typeof p.customer !== "string" || p.customer.length === 0) {
              throw new Error("lathe_jmdie_extract_customer requires non-empty 'customer'");
            }
            result = latheJMDieKnowledgeEngine.extractCustomerPatterns(p.customer);
            break;
          }
          case "lathe_metallurgy_tool_steel_db": {
            const { latheMetallurgyEngine } = await import("../../engines/LatheMetallurgyEngine.js");
            result = { tool_steels: latheMetallurgyEngine.getToolSteelDatabase() };
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH3: 6 unwired knowledge/predictive/troubleshoot engines
          case "lathe_knowledge_harvest_programs": {
            const { latheKnowledgeHarvesterEngine } = await import("../../engines/LatheKnowledgeHarvesterEngine.js");
            result = latheKnowledgeHarvesterEngine.harvestFromPrograms();
            break;
          }
          case "lathe_program_analyze": {
            const { latheProgramOptimizerEngine } = await import("../../engines/LatheProgramOptimizerEngine.js");
            const p = params as { content: string; file_path?: string };
            if (typeof p.content !== "string") throw new Error("lathe_program_analyze requires 'content' (string)");
            result = latheProgramOptimizerEngine.analyzeProgram(p.content, p.file_path);
            break;
          }
          case "lathe_expert_material_strategy": {
            const { latheExpertAdvisorEngine } = await import("../../engines/LatheExpertAdvisorEngine.js");
            const p = params as { category: Parameters<typeof latheExpertAdvisorEngine.getMaterialStrategy>[0] };
            if (typeof p.category !== "string") throw new Error("lathe_expert_material_strategy requires 'category'");
            result = latheExpertAdvisorEngine.getMaterialStrategy(p.category);
            break;
          }
          case "lathe_machine_get_profile": {
            const { latheMachineIntelligenceEngine } = await import("../../engines/LatheMachineIntelligenceEngine.js");
            const p = params as { machine_type: Parameters<typeof latheMachineIntelligenceEngine.getMachineProfile>[0] };
            if (typeof p.machine_type !== "string") throw new Error("lathe_machine_get_profile requires 'machine_type'");
            result = latheMachineIntelligenceEngine.getMachineProfile(p.machine_type);
            break;
          }
          case "lathe_troubleshoot_overhang": {
            const { latheTroubleshootingIntelligenceEngine } = await import("../../engines/LatheTroubleshootingIntelligenceEngine.js");
            const p = params as {
              tool_setup: Parameters<typeof latheTroubleshootingIntelligenceEngine.analyzeToolOverhang>[0];
              cutting_params: Parameters<typeof latheTroubleshootingIntelligenceEngine.analyzeToolOverhang>[1];
            };
            if (!p.tool_setup || !p.cutting_params) {
              throw new Error("lathe_troubleshoot_overhang requires {tool_setup, cutting_params}");
            }
            result = latheTroubleshootingIntelligenceEngine.analyzeToolOverhang(p.tool_setup, p.cutting_params);
            break;
          }
          case "lathe_predictive_tool_wear": {
            const { lathePredictiveIntelligenceEngine } = await import("../../engines/LathePredictiveIntelligenceEngine.js");
            const p = params as {
              conditions: Parameters<typeof lathePredictiveIntelligenceEngine.predictToolWear>[0];
              tool_state: Parameters<typeof lathePredictiveIntelligenceEngine.predictToolWear>[1];
              cycle_time_per_part_sec: number;
            };
            if (!p.conditions || !p.tool_state || typeof p.cycle_time_per_part_sec !== "number") {
              throw new Error("lathe_predictive_tool_wear requires {conditions, tool_state, cycle_time_per_part_sec}");
            }
            result = lathePredictiveIntelligenceEngine.predictToolWear(p.conditions, p.tool_state, p.cycle_time_per_part_sec);
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH4: 6 unwired tribal/science/reasoning engines
          case "lathe_tribal_stats": {
            const { latheTribalInjectorEngine } = await import("../../engines/LatheTribalInjectorEngine.js");
            result = latheTribalInjectorEngine.getStats();
            break;
          }
          case "lathe_unified_science_version": {
            const { latheUnifiedScienceEngine } = await import("../../engines/LatheUnifiedScienceEngine.js");
            result = { version: latheUnifiedScienceEngine.getVersion() };
            break;
          }
          case "lathe_unified_science_recommend": {
            const { latheUnifiedScienceEngine } = await import("../../engines/LatheUnifiedScienceEngine.js");
            const p = params as {
              material: Parameters<typeof latheUnifiedScienceEngine.recommendParameters>[0];
              target: Parameters<typeof latheUnifiedScienceEngine.recommendParameters>[1];
            };
            if (!p.material || !p.target) {
              throw new Error("lathe_unified_science_recommend requires {material, target}");
            }
            result = latheUnifiedScienceEngine.recommendParameters(p.material, p.target);
            break;
          }
          case "lathe_kinematics_get_machine_specs": {
            const { latheKinematicsDeepLearningEngine } = await import("../../engines/LatheKinematicsDeepLearningEngine.js");
            const p = params as { machine_id: string };
            if (typeof p.machine_id !== "string" || p.machine_id.length === 0) {
              throw new Error("lathe_kinematics_get_machine_specs requires non-empty 'machine_id'");
            }
            const specs = latheKinematicsDeepLearningEngine.getMachineSpecs(p.machine_id);
            result = { machine_id: p.machine_id, specs };
            break;
          }
          case "lathe_neural_intel_stats": {
            const { latheNeuralIntelligenceEngine } = await import("../../engines/LatheNeuralIntelligenceEngine.js");
            result = latheNeuralIntelligenceEngine.getStatistics();
            break;
          }
          case "lathe_jmdie_extract_operations": {
            const { latheJMDieKnowledgeEngine } = await import("../../engines/LatheJMDieKnowledgeEngine.js");
            result = { operation_sequences: latheJMDieKnowledgeEngine.extractOperationSequences() };
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH5: 6 unwired LoRA-cadence/post-uncertainty/deep-reasoning engines
          case "lathe_lora_cadence_state": {
            const { latheLoRACadenceEngine } = await import("../../engines/LatheLoRACadenceEngine.js");
            result = latheLoRACadenceEngine.getState();
            break;
          }
          case "lathe_lora_cadence_should_trigger": {
            const { latheLoRACadenceEngine } = await import("../../engines/LatheLoRACadenceEngine.js");
            result = latheLoRACadenceEngine.shouldTriggerRun();
            break;
          }
          case "lathe_lora_cadence_active_version": {
            const { latheLoRACadenceEngine } = await import("../../engines/LatheLoRACadenceEngine.js");
            const v = latheLoRACadenceEngine.getActiveVersion();
            result = { active_version: v };
            break;
          }
          case "lathe_deep_reasoning_record_outcome": {
            const { latheDeepReasoningEngine } = await import("../../engines/LatheDeepReasoningEngine.js");
            const p = params as {
              plan_id: string;
              outcome: Parameters<typeof latheDeepReasoningEngine.recordOutcome>[1];
            };
            if (typeof p.plan_id !== "string" || !p.outcome) {
              throw new Error("lathe_deep_reasoning_record_outcome requires {plan_id, outcome}");
            }
            result = latheDeepReasoningEngine.recordOutcome(p.plan_id, p.outcome);
            break;
          }
          case "lathe_post_uncertainty_analyze_block": {
            const { lathePostGeneratorUncertaintyEngine } = await import("../../engines/LathePostGeneratorUncertaintyEngine.js");
            const p = params as { block: string; line_number: number };
            if (typeof p.block !== "string" || typeof p.line_number !== "number") {
              throw new Error("lathe_post_uncertainty_analyze_block requires {block, line_number}");
            }
            result = lathePostGeneratorUncertaintyEngine.analyzeBlock(p.block, p.line_number);
            break;
          }
          case "lathe_post_uncertainty_prod_ready": {
            const { lathePostGeneratorUncertaintyEngine } = await import("../../engines/LathePostGeneratorUncertaintyEngine.js");
            const gcode = (params as { gcode: string[] }).gcode
                       ?? (params as { lines: string[] }).lines;
            if (!Array.isArray(gcode)) throw new Error("lathe_post_uncertainty_prod_ready requires 'gcode' (string[])");
            result = lathePostGeneratorUncertaintyEngine.isProductionReady(gcode);
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH6: 6 unwired feedback/stock/deviation/signoff/engagement/chuck engines (stats surfaces)
          case "lathe_actual_feedback_tuning_stats": {
            const { latheActualFeedbackTuningEngine } = await import("../../engines/LatheActualFeedbackTuningEngine.js");
            result = latheActualFeedbackTuningEngine.getStats();
            break;
          }
          case "lathe_stock_evolution_stats": {
            const { latheStockEvolutionEngine } = await import("../../engines/LatheStockEvolutionEngine.js");
            result = latheStockEvolutionEngine.getStats();
            break;
          }
          case "lathe_deviation_map_stats": {
            const { latheDeviationMapEngine } = await import("../../engines/LatheDeviationMapEngine.js");
            result = latheDeviationMapEngine.getStats();
            break;
          }
          case "lathe_program_signoff_stats": {
            const { latheProgramSignoffDossierEngine } = await import("../../engines/LatheProgramSignoffDossierEngine.js");
            result = latheProgramSignoffDossierEngine.getStats();
            break;
          }
          case "lathe_block_engagement_stats": {
            const { latheBlockEngagementSimulatorEngine } = await import("../../engines/LatheBlockEngagementSimulatorEngine.js");
            result = latheBlockEngagementSimulatorEngine.getStats();
            break;
          }
          case "lathe_chuck_jaw_setup_stats": {
            const { latheChuckJawSetupEngine } = await import("../../engines/LatheChuckJawSetupEngine.js");
            result = latheChuckJawSetupEngine.getStats();
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH7: 6 unwired LoRA pipeline/cron/registry/health/drift/verification engines
          case "lathe_lora_pipeline_estimated_duration": {
            const { latheLoRAPipelineEngine } = await import("../../engines/LatheLoRAPipelineEngine.js");
            result = latheLoRAPipelineEngine.getEstimatedDuration();
            break;
          }
          case "lathe_lora_cron_schedule_summary": {
            const { latheLoRACronJobEngine } = await import("../../engines/LatheLoRACronJobEngine.js");
            result = { summary: latheLoRACronJobEngine.getScheduleSummary() };
            break;
          }
          case "lathe_lora_registry_stats": {
            const { latheLoRAModelRegistryEngine } = await import("../../engines/LatheLoRAModelRegistryEngine.js");
            result = latheLoRAModelRegistryEngine.getStats();
            break;
          }
          case "lathe_lora_health_summary": {
            const { latheLoRAHealthMonitorEngine } = await import("../../engines/LatheLoRAHealthMonitorEngine.js");
            result = { summary: latheLoRAHealthMonitorEngine.getSummary() };
            break;
          }
          case "lathe_lora_drift_config": {
            const { latheLoRADriftDetectorEngine } = await import("../../engines/LatheLoRADriftDetectorEngine.js");
            result = latheLoRADriftDetectorEngine.getConfig();
            break;
          }
          case "lathe_lora_verification_test_cases": {
            const { latheLoRAVerificationEngine } = await import("../../engines/LatheLoRAVerificationEngine.js");
            result = { test_cases: latheLoRAVerificationEngine.getTestCases() };
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH8: 6 unwired LoRA voter/combiner/deployment/cache/refinement/attention engines
          case "lathe_lora_voter_stats": {
            const { latheLoRAEnsembleVoterEngine } = await import("../../engines/LatheLoRAEnsembleVoterEngine.js");
            result = latheLoRAEnsembleVoterEngine.getStats();
            break;
          }
          case "lathe_lora_combiner_stats": {
            const { latheLoRAEnsembleCombinerEngine } = await import("../../engines/LatheLoRAEnsembleCombinerEngine.js");
            result = latheLoRAEnsembleCombinerEngine.getStats();
            break;
          }
          case "lathe_lora_deployment_stats": {
            const { latheLoRADeploymentEngine } = await import("../../engines/LatheLoRADeploymentEngine.js");
            result = latheLoRADeploymentEngine.getStats();
            break;
          }
          case "lathe_lora_embedding_cache_stats": {
            const { latheLoRAEmbeddingCacheEngine } = await import("../../engines/LatheLoRAEmbeddingCacheEngine.js");
            result = latheLoRAEmbeddingCacheEngine.getStats();
            break;
          }
          case "lathe_lora_adaptive_refinement_stats": {
            const { latheLoRAAdaptiveRefinementEngine } = await import("../../engines/LatheLoRAAdaptiveRefinementEngine.js");
            result = latheLoRAAdaptiveRefinementEngine.getStats();
            break;
          }
          case "lathe_lora_attention_analyzer_stats": {
            const { latheLoRAAttentionAnalyzerEngine } = await import("../../engines/LatheLoRAAttentionAnalyzerEngine.js");
            result = latheLoRAAttentionAnalyzerEngine.getStats();
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH9: 6 unwired LoRA benchmark/continual/dataset/ensemble-orch/experiment/hyperparam engines
          case "lathe_lora_benchmark_test_cases": {
            const { latheLoRABenchmarkSuiteEngine } = await import("../../engines/LatheLoRABenchmarkSuiteEngine.js");
            result = { test_cases: latheLoRABenchmarkSuiteEngine.getTestCases() };
            break;
          }
          case "lathe_lora_continual_buffer_stats": {
            const { latheLoRAContinualLearningEngine } = await import("../../engines/LatheLoRAContinualLearningEngine.js");
            result = latheLoRAContinualLearningEngine.getBufferStats();
            break;
          }
          case "lathe_lora_dataset_stats": {
            const { latheLoRADatasetBuilderEngine } = await import("../../engines/LatheLoRADatasetBuilderEngine.js");
            result = latheLoRADatasetBuilderEngine.getStats();
            break;
          }
          case "lathe_lora_ensemble_orch_stats": {
            const { latheLoRAEnsembleOrchestratorEngine } = await import("../../engines/LatheLoRAEnsembleOrchestratorEngine.js");
            result = latheLoRAEnsembleOrchestratorEngine.getStats();
            break;
          }
          case "lathe_lora_experiment_stats": {
            const { latheLoRAExperimentTrackerEngine } = await import("../../engines/LatheLoRAExperimentTrackerEngine.js");
            result = latheLoRAExperimentTrackerEngine.getStats();
            break;
          }
          case "lathe_lora_hyperparam_presets": {
            const { latheLoRAHyperparameterOptimizerEngine } = await import("../../engines/LatheLoRAHyperparameterOptimizerEngine.js");
            result = { presets: latheLoRAHyperparameterOptimizerEngine.listPresets() };
            break;
          }

          // ENGINE-WIRE-LATHE-MS0/U-WIRE-LATHE-BATCH10: 6 unwired LoRA cadence-orch/knowledge-graph/master-orch/model-selector/monitoring/resource-mgr engines
          case "lathe_lora_cadence_orch_config": {
            const { latheLoRACadenceOrchestratorEngine } = await import("../../engines/LatheLoRACadenceOrchestratorEngine.js");
            result = latheLoRACadenceOrchestratorEngine.getConfig();
            break;
          }
          case "lathe_lora_knowledge_graph_stats": {
            const { latheLoRAKnowledgeGraphEngine } = await import("../../engines/LatheLoRAKnowledgeGraphEngine.js");
            result = latheLoRAKnowledgeGraphEngine.getStats();
            break;
          }
          case "lathe_lora_master_orch_stats": {
            const { latheLoRAMasterOrchestratorEngine } = await import("../../engines/LatheLoRAMasterOrchestratorEngine.js");
            result = latheLoRAMasterOrchestratorEngine.getStats();
            break;
          }
          case "lathe_lora_model_selector_stats": {
            const { latheLoRAModelSelectorEngine } = await import("../../engines/LatheLoRAModelSelectorEngine.js");
            result = latheLoRAModelSelectorEngine.getStats();
            break;
          }
          case "lathe_lora_monitoring_stats": {
            const { latheLoRAMonitoringEngine } = await import("../../engines/LatheLoRAMonitoringEngine.js");
            result = latheLoRAMonitoringEngine.getStats();
            break;
          }
          case "lathe_lora_resource_manager_stats": {
            const { latheLoRAResourceManagerEngine } = await import("../../engines/LatheLoRAResourceManagerEngine.js");
            result = latheLoRAResourceManagerEngine.getStats();
            break;
          }

          // OBSIDIAN-AUTOMATE-MS3/U-PROBE-EXPOSE: surface LatheOnMachineProbeCycleEngine
          case "lathe_omv_probe_generate": {
            const engine = await getEngine("omvProbe");
            const cycle = params.cycle;
            const nominalMm = params.nominal_mm ?? params.nominalMm;
            const tolMm = params.tol_mm ?? params.tolMm;
            if (!cycle || nominalMm === undefined || tolMm === undefined) {
              result = { error: "cycle, nominal_mm, and tol_mm are required" };
              break;
            }
            result = engine.generate({
              cycle,
              nominal_mm: nominalMm,
              tol_mm: tolMm,
              probe_feed_mm_min: params.probe_feed_mm_min ?? params.probeFeedMmMin,
              approach_mm: params.approach_mm ?? params.approachMm,
              macro_override: params.macro_override ?? params.macroOverride,
              wcs: params.wcs,
              axis: params.axis,
              probe_stylus_length_mm: params.probe_stylus_length_mm ?? params.probeStylusLengthMm,
            });
            break;
          }
          case "lathe_omv_probe_stats": {
            const engine = await getEngine("omvProbe");
            result = engine.getStats();
            break;
          }

          // OBSIDIAN-AUTOMATE-MS3/U-WIRE-LATHE-BATCH11: 4 small lathe orphans
          case "lathe_first_piece_approval_evaluate": {
            const engine = await getEngine("firstPiece");
            result = engine.evaluate({
              job_id: params.job_id ?? params.jobId,
              part_number: params.part_number ?? params.partNumber,
              operator: params.operator,
              inspector: params.inspector,
              readings: params.readings,
              warning_band_fraction: params.warning_band_fraction ?? params.warningBandFraction,
              instrument_uncertainty_mm: params.instrument_uncertainty_mm ?? params.instrumentUncertaintyMm,
            });
            break;
          }
          case "lathe_first_piece_approval_stats": {
            const engine = await getEngine("firstPiece");
            result = engine.getStats();
            break;
          }
          case "lathe_envelope_breach_replay": {
            const engine = await getEngine("envBreach");
            result = engine.replay({
              blocks: params.blocks,
              envelope: params.envelope,
            });
            break;
          }
          case "lathe_envelope_breach_replay_stats": {
            const engine = await getEngine("envBreach");
            result = engine.getStats();
            break;
          }
          case "lathe_aux_axis_timing_analyze": {
            const engine = await getEngine("auxAxis");
            result = engine.analyze({
              operations: params.operations,
              turret: params.turret,
              rapid_rate: params.rapid_rate ?? params.rapidRate,
              spindle_accel: params.spindle_accel ?? params.spindleAccel,
              turret_base_index_s: params.turret_base_index_s ?? params.turretBaseIndexS,
              turret_step_time_s: params.turret_step_time_s ?? params.turretStepTimeS,
            });
            break;
          }
          case "lathe_aux_axis_timing_stats": {
            const engine = await getEngine("auxAxis");
            result = engine.getStats();
            break;
          }
          case "lathe_datum_reference_frame_assign": {
            const engine = await getEngine("drf");
            result = engine.assign({
              part_id: params.part_id ?? params.partId,
              features: params.features,
              fixed_primary: params.fixed_primary ?? params.fixedPrimary,
              fixed_secondary: params.fixed_secondary ?? params.fixedSecondary,
              fixed_tertiary: params.fixed_tertiary ?? params.fixedTertiary,
            });
            break;
          }
          case "lathe_datum_reference_frame_stats": {
            const engine = await getEngine("drf");
            result = engine.getStats();
            break;
          }

          // ── TRAINING-LEARNING-MS0/U1: LathePartFamilyTemplateExtractorEngine ──
          // Engine returns discriminated `{ok: true|false, error?, family?, detail?}` —
          // bridge `data.ok` → dispatcher `success` so callers that branch on `.success`
          // don't treat path-traversal-blocked writes / missing-snapshots as success.
          // Pattern mirrors `macro_place_template` (line ~1036).
          case "lathe_training_corpus_status": {
            const { lathePartFamilyTemplateExtractorEngine } = await import("../../engines/LathePartFamilyTemplateExtractorEngine.js");
            const data = lathePartFamilyTemplateExtractorEngine.catalogCorpus({
              snapshot: (params as any).snapshot,
              snapshotPath: (params as any).snapshotPath ?? (params as any).snapshot_path,
            });
            result = data.ok
              ? { success: true, data }
              : { success: false, error: (data as any).error, detail: (data as any).detail, data };
            break;
          }
          case "lathe_training_template_match": {
            const { lathePartFamilyTemplateExtractorEngine } = await import("../../engines/LathePartFamilyTemplateExtractorEngine.js");
            const data = await lathePartFamilyTemplateExtractorEngine.extractTemplate(
              String((params as any).family),
              {
                snapshot: (params as any).snapshot,
                snapshotPath: (params as any).snapshotPath ?? (params as any).snapshot_path,
                outDir: (params as any).outDir ?? (params as any).out_dir,
                dryRun: (params as any).dryRun ?? (params as any).dry_run,
              },
            );
            result = data.ok
              ? { success: true, data }
              : { success: false, error: (data as any).error, family: (data as any).family, detail: (data as any).detail, data };
            break;
          }
          case "lathe_training_template_list": {
            const { lathePartFamilyTemplateExtractorEngine } = await import("../../engines/LathePartFamilyTemplateExtractorEngine.js");
            const data = lathePartFamilyTemplateExtractorEngine.listTemplates({
              dir: (params as any).dir,
            });
            // listTemplates always returns ok:true today, but keep the same defensive
            // pattern so a future error-path widening doesn't silently mask failures.
            result = data.ok
              ? { success: true, data }
              : { success: false, error: (data as any).error, detail: (data as any).detail, data };
            break;
          }
          case "lathe_part_family_match": {
            // TRAINING-LEARNING-MS0/U-TL-U5 — LathePartFamilyMatcherEngine
            const { lathePartFamilyMatcherEngine } = await import("../../engines/LathePartFamilyMatcherEngine.js");
            const p = params as Record<string, unknown>;
            const descriptor = (p.descriptor && typeof p.descriptor === "object" ? p.descriptor : p) as Record<string, unknown>;
            const opts = (p.opts && typeof p.opts === "object" ? p.opts : {}) as Record<string, unknown>;
            const data = lathePartFamilyMatcherEngine.matchPartFamily(descriptor as any, {
              topK: typeof opts.topK === "number" ? opts.topK : (typeof opts.top_k === "number" ? opts.top_k as number : undefined),
              minSimilarity: typeof opts.minSimilarity === "number" ? opts.minSimilarity : (typeof opts.min_similarity === "number" ? opts.min_similarity as number : undefined),
              dir: typeof opts.dir === "string" ? opts.dir as string : undefined,
              weights: (opts.weights && typeof opts.weights === "object") ? opts.weights as any : undefined,
              keywordsOnly: typeof opts.keywordsOnly === "boolean" ? opts.keywordsOnly as boolean : (typeof opts.keywords_only === "boolean" ? opts.keywords_only as boolean : undefined),
            });
            result = data.ok
              ? { success: true, data }
              : { success: false, error: data.error, detail: data.detail, data };
            break;
          }
          case "training_ingest_lathe_outcome": {
            // TRAINING-LEARNING-MS0/U-TL-U6 — TrainingTemplateContinuousLearningEngine.ingestLatheOutcome
            const { trainingTemplateContinuousLearningEngine } = await import("../../engines/TrainingTemplateContinuousLearningEngine.js");
            const p = params as Record<string, unknown>;
            const outcome = (p.outcome_input && typeof p.outcome_input === "object" ? p.outcome_input : p) as Record<string, unknown>;
            const opts = (p.opts && typeof p.opts === "object" ? p.opts : {}) as Record<string, unknown>;
            const data = trainingTemplateContinuousLearningEngine.ingestLatheOutcome(outcome as any, {
              dir: typeof opts.dir === "string" ? opts.dir as string : undefined,
            });
            result = data.ok
              ? { success: true, data }
              : { success: false, error: data.error, detail: data.detail, data };
            break;
          }

          // ── Macro library (NON-safety-critical lookup + template placement; SAME engine + schemas as prism_cad) ──
          case "macro_library_list": {
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.listMacros({ dir: params.dir ?? params.macroSourceDir ?? params.macro_source_dir });
            result = { success: true, data };
            break;
          }
          case "macro_match_family": {
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.matchFamily({
              geometry: params.geometry,
              features: params.features,
              nameText: params.nameText ?? params.name_text,
              counterborePresent: params.counterborePresent ?? params.counterbore_present,
              flangeStepPresent: params.flangeStepPresent ?? params.flange_step_present,
              odTaperPresent: params.odTaperPresent ?? params.od_taper_present,
              idTaperPresent: params.idTaperPresent ?? params.id_taper_present,
            });
            result = { success: true, data };
            break;
          }
          case "macro_place_template": {
            const pn = params.partNumber ?? params.part_number;
            if (pn == null || String(pn).trim() === "") {
              return dispatcherError(new Error("macro_place_template requires part_number"), action, "prism_turning");
            }
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.placeMacroTemplate({
              partNumber: pn,
              customer: params.customer,
              family: params.family,
              match: params.match,
              libraryRoot: params.libraryRoot ?? params.library_root,
              macroSourceDir: params.macroSourceDir ?? params.macro_source_dir,
              dryRun: (params.dryRun ?? params.dry_run) === true,
            });
            result = { success: data.placed || data.dryRun === true, data };
            break;
          }
          case "macro_fanout_dry_run": {
            const { macroLibraryEngine } = await import("../../engines/MacroLibraryEngine.js");
            const data = macroLibraryEngine.fanoutDryRun({
              libraryRoot: params.libraryRoot ?? params.library_root,
              limit: typeof params.limit === "number" ? params.limit : undefined,
              sampleSize: typeof (params.sampleSize ?? params.sample_size) === "number" ? (params.sampleSize ?? params.sample_size) : undefined,
            });
            result = { success: true, data };
            break;
          }

          // MS0-U2 (SAFETY-CRITICAL): MacroFillOrchestratorEngine.
          // Input: { features: PartPrintFeatures, target_machine: string }
          // Returns a *candidate* — NEVER a file. The candidate must pass MS0-U4
          // before any .MIN emission. The orchestrator REJECTS missing required VCs
          // (does not guess) and the underlying generator REJECTS physically
          // impossible configs. Calculated VCs stay as expressions (VC130/VC150
          // match /VC111.*VC110/ and /VC121.*VC120/ — asserted defense-in-depth).
          case "macro_fill_candidate": {
            const { macroFillOrchestratorEngine } = await import("../../engines/MacroFillOrchestratorEngine.js");
            const features = params.features;
            const targetMachine = params.target_machine ?? params.targetMachine;
            if (!features) {
              return dispatcherError(new Error("macro_fill_candidate requires features (PartPrintFeatures)"), action, "prism_turning");
            }
            if (!targetMachine || String(targetMachine).trim() === "") {
              return dispatcherError(new Error("macro_fill_candidate requires target_machine (e.g. 'OKUMA_LB-3000-EX')"), action, "prism_turning");
            }
            const data = macroFillOrchestratorEngine.fillCandidate(features, String(targetMachine));
            result = { success: true, data };
            break;
          }

          // MS0-U4 (LOAD-BEARING SAFETY): MacroCandidateGateEngine.
          // Input: { candidate: MacroFillCandidate } (from U2)
          // Returns { passed, sxScore, safetyRecord, failingChecks, dossier }.
          // On FAIL: dossier=null and the result carries NO file/path/gcode-output
          // property — emit NOTHING is asserted at type level.
          // S(x) ≥ 0.70 HARD BLOCK — no override in this pipeline.
          case "macro_gate_candidate": {
            const { macroCandidateGateEngine } = await import("../../engines/MacroCandidateGateEngine.js");
            const candidate = params.candidate;
            if (!candidate) {
              return dispatcherError(new Error("macro_gate_candidate requires candidate (MacroFillCandidate from macro_fill_candidate)"), action, "prism_turning");
            }
            const data = macroCandidateGateEngine.gateCandidate(candidate);
            result = { success: data.passed, data };
            break;
          }

          // MS0-U6 (SAFETY-CRITICAL, BULK PATH): MacroBulkEmitOrchestratorEngine.
          // emitBatch: refuses if batch n-1 not approved. Each batch produces
          // _MACRO_BATCH_<n>_REVIEW.md + appends _MACRO_BULK_LOG.md +
          // _MACRO_NEEDS_HUMAN.md. Companion Stop hook `macro-bulk-emit-guard`
          // (MINIMAL_ALLOWLIST) blocks Stop until every batch ran in window
          // has a corresponding _BATCH_<n>_APPROVED marker.
          case "macro_bulk_emit_batch": {
            const { macroBulkEmitOrchestratorEngine } = await import("../../engines/MacroBulkEmitOrchestratorEngine.js");
            if (typeof params.batchNumber !== "number") {
              return dispatcherError(new Error("macro_bulk_emit_batch requires batchNumber (integer >= 0)"), action, "prism_turning");
            }
            if (!params.libraryRoot || typeof params.libraryRoot !== "string") {
              return dispatcherError(new Error("macro_bulk_emit_batch requires libraryRoot (string)"), action, "prism_turning");
            }
            if (!Array.isArray(params.parts)) {
              return dispatcherError(new Error("macro_bulk_emit_batch requires parts: BulkPartInput[]"), action, "prism_turning");
            }
            const data = macroBulkEmitOrchestratorEngine.emitBatch({
              batchNumber: params.batchNumber,
              libraryRoot: params.libraryRoot,
              parts: params.parts,
              batchSize: params.batchSize,
              borderlineThreshold: params.borderlineThreshold,
              fillMachineHint: params.fillMachineHint,
              approvedEnvVarName: params.approvedEnvVarName,
              dryRun: params.dryRun,
            });
            result = { success: data.emitted.length > 0, data };
            break;
          }

          // MS0-U6: approve a completed batch so batch n+1 can proceed.
          case "macro_approve_batch": {
            const { macroBulkEmitOrchestratorEngine } = await import("../../engines/MacroBulkEmitOrchestratorEngine.js");
            if (typeof params.batchNumber !== "number") {
              return dispatcherError(new Error("macro_approve_batch requires batchNumber (integer >= 0)"), action, "prism_turning");
            }
            if (!params.libraryRoot || typeof params.libraryRoot !== "string") {
              return dispatcherError(new Error("macro_approve_batch requires libraryRoot (string)"), action, "prism_turning");
            }
            if (!params.approvedBy || typeof params.approvedBy !== "string") {
              return dispatcherError(new Error("macro_approve_batch requires approvedBy (operator identity)"), action, "prism_turning");
            }
            const data = macroBulkEmitOrchestratorEngine.approveBatch({
              batchNumber: params.batchNumber,
              libraryRoot: params.libraryRoot,
              approvedBy: params.approvedBy,
              approvalNote: params.approvalNote,
            });
            result = { success: data.approved, data };
            break;
          }

          // MS0-U5 (SAFETY-CRITICAL): MacroPerMachineEmitterEngine.
          // Input: { dossier: SignoffDossier (passed=true), partRef: {customerName, partNumber, libraryRoot?, ...}, targetMachines?: string[] }
          // Returns { machines: PerMachineResult[], summary, needsOperatorReview: true, emittedAt }.
          // HARD RULE: a per-machine result emits a .MIN file ONLY when THAT machine's
          // gate passed at S(x) ≥ 0.70 AND zero BLOCKED signatures. Non-Okuma controllers
          // exit with form: "dialect-translation-pending" and file=null.
          case "macro_emit_per_machine": {
            const { macroPerMachineEmitterEngine } = await import("../../engines/MacroPerMachineEmitterEngine.js");
            const dossier = params.dossier;
            const partRef = params.partRef;
            if (!dossier) {
              return dispatcherError(new Error("macro_emit_per_machine requires dossier (SignoffDossier from macro_gate_candidate)"), action, "prism_turning");
            }
            if (!partRef) {
              return dispatcherError(new Error("macro_emit_per_machine requires partRef ({customerName, partNumber, libraryRoot?, ...})"), action, "prism_turning");
            }
            const data = macroPerMachineEmitterEngine.emitPerMachine({
              dossier,
              partRef,
              targetMachines: params.targetMachines,
            });
            result = { success: data.summary.filesEmitted > 0, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-TURNINSP: TurningInspectionPlanEngine.
          // Pure computation — ANSI/ASQ Z1.4 AQL sampling, ISO 1101/12181 form
          // measurement, AS9102 first-article. No clamping force, no I/O.
          case "turning_inspection_plan": {
            const { turningInspectionPlanEngine } = await import("../../engines/TurningInspectionPlanEngine.js");
            const data = turningInspectionPlanEngine.generate(params as any);
            result = { success: true, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-PARTOFF: LathePartoffSafetyRailEngine.
          // SAFETY-CRITICAL — parting-off 7-gate rail (overhang, SFM, feed,
          // chip clearance, chip breaker vs UTS, workholding, sub-spindle
          // purge). result.success mirrors verdict.passed: any hard_block
          // gate failure flips it false so callers can short-circuit on
          // BLOCKED before reading the verdict body.
          case "lathe_partoff_safety_gate": {
            const { lathePartoffSafetyRailEngine } = await import("../../engines/LathePartoffSafetyRailEngine.js");
            const data = lathePartoffSafetyRailEngine.evaluate(params as any);
            result = { success: data.passed, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-LWH: LatheWorkholdingEngine — 6 surfaces
          // SAFETY-RELEVANT: ISO 10218 SF=2.5 minimum enforced in-engine.
          // The 6 cases share one lazy import to minimize cold-start cost.
          case "lathe_workholding_select_jaw":
          case "lathe_workholding_trilobe":
          case "lathe_workholding_face_driver":
          case "lathe_workholding_expanding_mandrel":
          case "lathe_workholding_magnetic_chuck":
          case "lathe_workholding_stock_form": {
            const { latheWorkholdingEngine } = await import("../../engines/LatheWorkholdingEngine.js");
            let data: unknown;
            switch (action) {
              case "lathe_workholding_select_jaw":
                data = latheWorkholdingEngine.selectJaw(params as any);
                break;
              case "lathe_workholding_trilobe":
                data = latheWorkholdingEngine.calculateTrilobe(params as any);
                break;
              case "lathe_workholding_face_driver":
                data = latheWorkholdingEngine.calculateFaceDriver(params as any);
                break;
              case "lathe_workholding_expanding_mandrel":
                data = latheWorkholdingEngine.calculateExpandingMandrel(params as any);
                break;
              case "lathe_workholding_magnetic_chuck":
                data = latheWorkholdingEngine.calculateMagneticChuck(params as any);
                break;
              case "lathe_workholding_stock_form":
                data = latheWorkholdingEngine.stockFormRecommendation(
                  (params as any).stock_form,
                  (params as any).grip_diameter_mm,
                  (params as any).wall_thickness_mm,
                );
                break;
            }
            result = { success: true, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-LSO: LatheSequenceOptimizerEngine — 2 surfaces
          // Hard constraints (face first / part-off last / center-drill before
          // drill / rough before finish / thread after OD-finish / G97 for
          // drill+tap+ream) are non-overridable; soft objectives are
          // multi-criteria weighted (cycle-time, tool-life, tool-changes,
          // thermal). The result's spindle_modes Map is serialized to a plain
          // object so it survives the JSON wire boundary.
          // Reference: Peter Smid CNC Programming Handbook Ch. 2,
          // Machinery's Handbook 31st Ed. Process Planning.
          case "lathe_sequence_optimize":
          case "lathe_sequence_validate": {
            const { latheSequenceOptimizerEngine } = await import("../../engines/LatheSequenceOptimizerEngine.js");
            let data: unknown;
            switch (action) {
              case "lathe_sequence_optimize": {
                const r = latheSequenceOptimizerEngine.optimize(
                  (params as any).operations,
                  (params as any).constraints ?? {},
                );
                // Map → object so MCP JSON wire keeps the spindle-mode mapping.
                const spindle_modes: Record<string, string> = {};
                for (const [k, v] of r.spindle_modes) spindle_modes[k] = v;
                data = { ...r, spindle_modes };
                break;
              }
              case "lathe_sequence_validate":
                data = {
                  violations: latheSequenceOptimizerEngine.validateSequence(
                    (params as any).operations,
                  ),
                };
                break;
            }
            result = { success: true, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-TWP: TurningWearPredictionEngine — 3 surfaces
          // Combines Usui wear (dW/dt = A·σn·Vs·exp(-B/θ)) + Kienzle force +
          // Loewen-Shaw temperature + ISO-3685 VB_max + Sandvik chip-form
          // taxonomy. The 3 cases share one lazy import to amortize cold-start.
          // accumulatePerOperation returns a station_wear Record keyed by
          // numeric station — already JSON-safe (numbers become string keys
          // through JSON.stringify), no Map serialization needed here.
          // Reference: Usui, Shirakashi & Kitagawa (1978); Loewen & Shaw (1954);
          // Altintas "Manufacturing Automation" §§2.3, 4.5; ISO 3685:1993.
          case "turning_wear_per_op":
          case "turning_wear_chip_form":
          case "turning_wear_batch_life": {
            const { turningWearPredictionEngine } = await import("../../engines/TurningWearPredictionEngine.js");
            let data: unknown;
            switch (action) {
              case "turning_wear_per_op":
                data = turningWearPredictionEngine.accumulatePerOperation(params as any);
                break;
              case "turning_wear_chip_form": {
                const p = params as any;
                data = turningWearPredictionEngine.predictChipForm(
                  p.iso_group, p.vc_m_min, p.f_mm_rev, p.ap_mm,
                );
                break;
              }
              case "turning_wear_batch_life":
                data = turningWearPredictionEngine.predictBatchLife(params as any);
                break;
            }
            result = { success: true, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-TTW: TurningToolpathWearEngine — 1 surface
          // Toolpath-aware wear integration along turning segments. Models:
          //   • CSS speed modulation across diameter changes (Vc varies with D)
          //   • Interrupted-cut shock loading (1+0.5·min(intr/4,1) multiplier)
          //   • Engagement factor (ap/nose_radius)^0.15 — wear concentration
          //   • VB linear model: VB = VB_max · life_fraction (ISO 3685:1993)
          // Different from TurningWearPredictionEngine (per-op Usui): this one
          // integrates over toolpath SEGMENTS with variable Vc due to CSS.
          // Reference: Sandvik "CSS and tool life" application note; ISO 3685:1993.
          case "turning_toolpath_wear": {
            const { turningToolpathWearEngine } = await import("../../engines/TurningToolpathWearEngine.js");
            const data = turningToolpathWearEngine.accumulateWear(params as any);
            result = { success: true, data };
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
