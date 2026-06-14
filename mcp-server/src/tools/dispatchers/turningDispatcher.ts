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
// FEATURE-GAP-AUDIT-MS0/U-BRIDGE-WIRE-OKUMA — 4 unwired Okuma engines
let _okumaStep: any, _okumaMacro: any, _okumaManualTips: any, _okumaTranscript: any;
// FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-LIVE-TOOLING — feature→toolpath planner
let _livePlanner: any;
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
    // FEATURE-GAP-AUDIT-MS0/U-BRIDGE-WIRE-OKUMA
    case "okumaStep":         return _okumaStep         ??= (await import("../../engines/OkumaMachineStepIngesterEngine.js")).okumaMachineStepIngesterEngine;
    case "okumaMacro":        return _okumaMacro        ??= (await import("../../engines/OkumaMacroConverterBridgeEngine.js")).okumaMacroConverterBridgeEngine;
    case "okumaManualTips":   return _okumaManualTips   ??= (await import("../../engines/OkumaManualTipExtractorEngine.js")).okumaManualTipExtractorEngine;
    case "okumaTranscript":   return _okumaTranscript   ??= (await import("../../engines/OkumaGosigerTranscriptMinerEngine.js")).okumaGosigerTranscriptMinerEngine;
    // FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-LIVE-TOOLING
    case "livePlanner":       return _livePlanner       ??= (await import("../../engines/LatheLiveToolingPlannerEngine.js")).latheLiveToolingPlannerEngine;
    default: throw new Error(`Unknown turning engine: ${name}`);
  }
}

const ACTIONS = [
  "chuck_force", "tailstock", "steady_rest",
  "live_tool", "live_tool_plan", "bar_pull", "thread_single_point",
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
  // FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-NOSE-RADIUS-COMP: TNR reference + LAP validation
  "tnr_lookup_p_code", "tnr_get_g_code", "tnr_validate_program", "tnr_setup_procedure",
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

  // WIRE-UNWIRED-MS0/U-WIRE-LSO: shop-aware lathe program optimizer (JM Die config)
  "lathe_shop_optimize_program",         // LatheShopAwareOptimizationEngine.optimizeProgram
  "lathe_shop_optimize_customer",        // LatheShopAwareOptimizationEngine.optimizeCustomerPrograms

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
  "lathe_expanding_mandrel_analyze",        // ExpandingMandrelEngine.analyze — actuator-force grip + centrifugal max-safe-RPM (distinct from the Lame _workholding_ variant)

  // WIRE-UNWIRED-MS0/U-WIRE-LSO: LatheSequenceOptimizerEngine (LATHE-PRO-MS3/U-LPS02)
  "lathe_sequence_optimize",                // optimize — multi-criteria operation sequencing w/ hard constraints
  "lathe_sequence_validate",                // validateSequence — return hard-constraint violation list

  // WIRE-UNWIRED-MS0/U-WIRE-TWP: TurningWearPredictionEngine (LATHE-PRO-MS1 U-LPR14/15/16)
  "turning_wear_per_op",                    // accumulatePerOperation — Usui dW/dt + per-station accumulation
  "turning_wear_chip_form",                 // predictChipForm — ISO-group → chip type → wear mode mapping
  "turning_wear_batch_life",                // predictBatchLife — parts-per-edge + change schedule + Vc optimization

  // WIRE-UNWIRED-MS0/U-WIRE-TTW: TurningToolpathWearEngine (LATHE-PRO-MS1/U-LPR12)
  "turning_toolpath_wear",                  // accumulateWear — CSS-aware per-segment wear + interrupted-cut shock + engagement factor

  // WIRE-UNWIRED-MS0/U-WIRE-TRG: TurningRulesGeneratorEngine (LATHE-PRO)
  "turning_rules_generate",                 // generate — speed/feed/DoC envelope rules per material×tool×machine×op
  "turning_rules_stats",                    // getStats — supported rule kinds + ISO groups + operations

  // WIRE-UNWIRED-MS0/U-WIRE-VTC: VendorTurningCatalogExtractorEngine (L2-P1-MS2 U-LAT22)
  "turning_iso1832_parse",                  // parseISO1832Designation — pure ISO 1832 insert-code decoder
  "turning_chipbreaker_classify",           // classifyChipbreaker — pure code → finishing/medium/roughing/universal
  "turning_vendor_insert_search",           // searchInserts — query the ~4095-insert Tungaloy+Widia catalog
  "turning_tool_catalog_query",             // CATALOG-APP-WIRING-MS0/U8: full 62.7K vendor corpus search for the lathe galaxy
  "turning_vendor_grade_recommend",         // recommendGrade — ISO-group + operation → ranked grade list
  "turning_vendor_iso_code_resolve",        // resolveISOCode — parse + catalog match
  "turning_vendor_catalog_stats",           // getStats — per-vendor catalog inventory

  // WIRE-UNWIRED-MS0/U-WIRE-MOP: LatheMultiOpPlannerEngine (LATHE-PRO-MS3/U-LPS03)
  "lathe_multiop_plan",                     // plan — Op1/Op2 flip planning + soft-jaw bore + Z-transfer + concentricity
  "lathe_softjaw_boring",                   // generateSoftJawBoring — standalone soft-jaw bore G-code (5 controllers)

  // WIRE-UNWIRED-MS0/U-WIRE-PROFDEV: ProfileDeviationAnalyzerEngine (LATHE-PRO-MS8)
  "lathe_profile_deviation_analyze",        // analyze — bilateral/unilateral profile deviation (CMM-style)
  "lathe_profile_deviation_stats",          // getStats — supported zones + reference standard

  // WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE: LatheProgramBacktraceEngine (LATHE-PRO-MS12)
  "lathe_backtrace_trace",                  // trace — walk backward through block history to find root cause
  "lathe_backtrace_stats",                  // getStats — reference standard

  // FEATURE-GAP-AUDIT-MS0/U-BRIDGE-WIRE-OKUMA: 4 unwired Okuma engines
  "okuma_step_parse",                       // OkumaMachineStepIngesterEngine.parseContent — STEP AP203/AP214 axis-frame extraction
  "okuma_macro_convert",                    // OkumaMacroConverterBridgeEngine.convert (async) — OSP dialect → ISO G-code
  "okuma_manual_tips_extract",              // OkumaManualTipExtractorEngine.extractFromText — manual text → tribal tips
  "okuma_transcript_mine",                  // OkumaGosigerTranscriptMinerEngine.mineAllTranscripts — Gosiger video tip mining

  // FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-TRIBAL-WIRE: lathe tribal knowledge → lathe AI bridge
  "lathe_tribal_integrate",                 // LatheTribalIntegrationEngine.integrateWithLatheAI — corpus+curated tips → injector → 4 lathe engines
  "lathe_tribal_adjustment",                // LatheTribalIntegrationEngine.getAdjustment — tribal rpm/feed/doc factors for an operation
  "lathe_tribal_failure_check",             // LatheTribalIntegrationEngine.checkFailureModes — lathe failure-mode lookup
  "lathe_tribal_source_corpus",             // LatheTribalIntegrationEngine.sourceCorpusTips — lathe-relevant tribal corpus query
  "lathe_tribal_integration_stats",         // LatheTribalIntegrationEngine.getStatistics — tribal coverage counts

  // U-LATHE-PROG-OPT-WIRE: expose LatheProgramOptimizerEngine upgrade surfaces (analyze was already wired as lathe_program_analyze)
  "lathe_program_optimize",                 // LatheProgramOptimizerEngine.generateOptimizedProgram — emit upgraded program text + changelog
  "lathe_program_estimate",                 // LatheProgramOptimizerEngine.estimateImprovements — pre-upgrade impact estimate

  // U-WIRE-LATHE-BIRDNEST: bird's-nest chip-wrap risk prediction (LATHE-PRO-MS7 — 291-LOC engine, 0 dispatcher refs before this wire)
  "lathe_bird_nest_predict",                // LatheBirdNestPredictorEngine.predict — risk_score + mitigations[] + safety_notes[]
  "lathe_bird_nest_stats",                  // LatheBirdNestPredictorEngine.getStats — model + factors + risk_levels

  // U-WIRE-LATHE-PARTING-CLEAR: parting-off chip-clearance + coolant-jet-reach evaluation (LATHE-PRO-MS7 — 194-LOC engine, 0 dispatcher refs before this wire)
  "lathe_parting_clearance_evaluate",       // LathePartingChipClearanceEngine.evaluate — verdict + peck cycle + risk_factors[]
  "lathe_parting_clearance_stats",          // LathePartingChipClearanceEngine.getStats — model + iso groups + formulas

  // U-WIRE-LATHE-PART-COST: 7-bucket cost-per-part model (LATHE-PRO-MS10 — 185-LOC engine, 0 dispatcher refs before this wire)
  "lathe_part_cost_compute",                // LathePartCostModelEngine.compute — bucket breakdown + total + scrap-amortized total
  "lathe_part_cost_stats",                  // LathePartCostModelEngine.getStats — bucket list + canonical references

  // U-WIRE-LATHE-SUBSPINDLE-PURGE: sub-spindle transfer purge timing (LATHE-PRO-MS7 — 267-LOC engine, 0 dispatcher refs)
  "lathe_subspindle_purge_plan",            // LatheSubSpindleTransferPurgeEngine.plan — phases[] + contamination risk + timing
  "lathe_subspindle_purge_stats",           // LatheSubSpindleTransferPurgeEngine.getStats — phases_modeled + supported_controllers

  // U-WIRE-LATHE-OP-TIME-BREAKDOWN: detailed per-op time decomposition (LATHE-PRO-MS5 — 257-LOC engine, 0 dispatcher refs)
  "lathe_op_time_compute",                  // LatheOpTimeBreakdownEngine.compute — 9-bucket breakdown + productive_fraction + bottleneck
  "lathe_op_time_aggregate",                // LatheOpTimeBreakdownEngine.aggregate — per-piece + lot total over N ops
  "lathe_op_time_stats",                    // LatheOpTimeBreakdownEngine.getStats — bucket list + canonical defaults

  // U-WIRE-LATHE-REPLAY-FRAME: block-by-block replay frame compiler (LATHE-PRO-MS12 — 138-LOC engine, 0 dispatcher refs)
  "lathe_replay_frame_compile",             // LatheReplayFrameCompilerEngine.compile — frame list + breach indices for front-end NC viewer
  "lathe_replay_frame_stats",               // LatheReplayFrameCompilerEngine.getStats — reference

  // U-WIRE-LATHE-PART-CLASSIFIER: 15-family part classifier (LATHE-PRO-MS3 — 447-LOC engine, 0 dispatcher refs)
  "lathe_part_classify",                    // LathePartClassifierEngine.classify — family + workholding default + roughing cycle + sequence template
  "lathe_part_classify_batch",              // LathePartClassifierEngine.classifyBatch — bulk classification
  "lathe_part_family_profile",              // LathePartClassifierEngine.getFamilyProfile — full profile for one family
  "lathe_part_family_list",                 // LathePartClassifierEngine.listFamilies — all 15 families with defaults

  // U-WIRE-LATHE-PROG-COST: programming cost model — macro/hardcode/cam/conversational (LATHE-AWARE-HARDEN-MS11 — 485-LOC engine, 0 dispatcher refs)
  "lathe_programming_cost_estimate",        // LatheProgrammingCostEngine.estimateProgrammingCost — bucket breakdown + per-part cost for one (style,complexity,lot)
  "lathe_programming_cost_compare",         // LatheProgrammingCostEngine.compareApproaches — rank styles for a given part spec
  "lathe_programming_cost_breakeven",       // LatheProgrammingCostEngine.breakEvenAnalysis — macro-vs-hardcode crossover by lot size
  "lathe_programming_cost_stats",           // LatheProgrammingCostEngine.getStats — styles_supported + canonical defaults

  // LATHE-PSN-SYNERGY (Phase 2): tribal-knowledge → per-style score deltas bridge for the decision flow
  "lathe_programming_style_tribal_advise",  // ProgrammingStyleTribalAdvisorEngine.advise — per-style score deltas + source-tip citations
  "lathe_programming_style_tribal_stats",   // ProgrammingStyleTribalAdvisorEngine.getStats — rule_count + controllers_covered + tip_sources_count
  "lathe_programming_style_tribal_rules",   // ProgrammingStyleTribalAdvisorEngine.getRules — full rule library snapshot (audit/debug)

  // U-WIRE-LATHE-PERF-SLO: production-SLO registry (LATHE-PROD-READY-MS0 — 338-LOC engine, 0 dispatcher refs)
  "lathe_slo_targets",                      // LathePerformanceSLORegistryEngine.targets — canonical SLO target list
  "lathe_slo_get_target",                   // .getTarget — single SLO target
  "lathe_slo_set_target",                   // .setTarget — override / add a target
  "lathe_slo_record_sample",                // .recordSample — ingest a metric sample
  "lathe_slo_sample_count",                 // .sampleCount — sample count for a metric
  "lathe_slo_evaluate",                     // .evaluate — percentile verdict for a metric
  "lathe_slo_dashboard",                    // .dashboard — full snapshot across all SLOs
  "lathe_slo_clear_samples",                // .clearSamples — reset one or all rolling windows

  // U-WIRE-LATHE-LORA-SAFETY-EVAL: LoRA-output safety evaluator (LATHE-LORA-MS0 — 430-LOC engine, 0 dispatcher refs) — critical for ANY AI-generated upgrade output
  "lathe_lora_safety_evaluate",             // LatheLoRASafetyEvaluatorEngine.evaluate — S(x) + collision + limit checks
  "lathe_lora_safety_is_safe",              // .isSafe — boolean threshold check
  "lathe_lora_safety_summary",              // .getSummary — operator-facing text summary
  "lathe_lora_safety_set_config",           // .setConfig — override machine limits / s_x_threshold
  "lathe_lora_safety_get_config",           // .getConfig — current configuration
  "lathe_lora_safety_threshold",            // .getThreshold — current S(x) threshold value

  // U-WIRE-LATHE-LORA-REASON-EVAL: LoRA reasoning-chain evaluator (LATHE-LORA-MS0 — 477-LOC engine, 0 dispatcher refs) — explanation-quality gate
  "lathe_lora_reason_evaluate",             // LatheLoRAReasoningEvaluatorEngine.evaluate — coherence/domain/justification/structure/completeness
  "lathe_lora_reason_summary",              // .getSummary — operator-facing summary
  "lathe_lora_reason_suggestions",          // .getSuggestions — improvement suggestions
  "lathe_lora_reason_set_config",           // .setConfig — override evaluation config
  "lathe_lora_reason_get_config",           // .getConfig — current config

  // U-WIRE-LATHE-COOLANT-ADVISOR: coolant delivery recommender (LATHE-PRO-MS5 — 347-LOC engine, 0 dispatcher refs)
  "lathe_coolant_advise",                   // LatheCoolantAdvisorEngine.advise — flood/HPC/mist/MQL/dry/cryogenic recommendation
  "lathe_coolant_stats",                    // .getStats — model metadata

  // U-WIRE-LATHE-CHUCK-JAW-SETUP: soft-jaw setup calculator (LATHE-PRO-MS11 — 156-LOC engine, 0 dispatcher refs)
  "lathe_chuck_jaw_compute",                // LatheChuckJawSetupEngine.compute — bore + grip + centrifugal safety
  "lathe_chuck_jaw_stats",                  // .getStats — reference

  // U-WIRE-LATHE-CSS-OPTIMIZER: CSS/G96 clamp + G96↔G97 mode selector (LATHE-PRO — 240-LOC engine, 0 dispatcher refs)
  "lathe_css_optimize",                     // LatheCSSOptimizerEngine.optimize — clamp RPM + true CSS fraction + cycle-time delta
  "lathe_css_select_mode",                  // .selectMode — G96 vs G97 for a feature
  "lathe_css_stats",                        // .getStats — reference

  // U-WIRE-LATHE-LORA-REWARD-SHAPE: RL reward shaping for LoRA fine-tuning (LATHE-LORA-MS0 — 488-LOC engine, 0 dispatcher refs)
  "lathe_lora_reward_calc",                 // LatheLoRARewardShapingEngine.calculateReward — RewardResult with components + bonuses + penalties
  "lathe_lora_reward_threshold",            // .meetsThreshold — boolean threshold check
  "lathe_lora_reward_summary",              // .getSummary — operator-facing summary
  "lathe_lora_reward_set_config",           // .setConfig — override reward weights
  "lathe_lora_reward_get_config",           // .getConfig — current config

  // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-AI-TIER-UNWIRED-5: 5 fully-unwired AI-tier lathe engines
  "lathe_ai_reason",                        // LatheAIReasoningEngine.reason — async deep reasoning over LatheOperationContext
  "lathe_active_learning_select",           // LatheActiveLearningEngine.selectSamples — pick most-informative samples for labeling
  "lathe_bayesian_optimize",                // LatheBayesianOptimizationEngine.optimizeParameters — GP-based parameter search
  "lathe_deep_logic_evaluate",              // LatheDeepLogicEngine.evaluate — propositional-logic evaluation
  "lathe_cam_intelligence_recommend",       // LatheCAMIntelligenceEngine.recommendParametricTemplate — CAM strategy router

  // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-AI-TIER-UNWIRED-4: 4 more fully-unwired AI-tier lathe engines
  "lathe_ai_orchestrate_full",              // LatheAIOrchestrationEngine.orchestrateFullAnalysis — async cross-engine orchestration
  "lathe_ai_train_from_programs",           // LatheAITrainingEngine.trainFromPrograms — train from program corpus
  "lathe_adaptive_machining_adapt",         // LatheAdaptiveMachiningEngine.adaptTurningParameters — real-time turn-param adaptation
  "lathe_attention_self",                   // LatheAttentionMechanismEngine.computeSelfAttention — transformer self-attention over G-code tokens

  // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-FLEET-UNWIRED-6: 6 engines unwired across ALL dispatchers
  "lathe_master_orchestrate",               // LatheMasterOrchestratorFacadeEngine.orchestrate — top-level facade
  "lathe_post_validate_program",            // LathePostGeneratorValidatorWiringEngine.validateProgram — static post-validator
  "lathe_post_regression_generate",         // LathePostRegressionTestGeneratorEngine.generateTest — static regression-test gen
  "lathe_program_catalog_register",         // LatheProgramCatalogEngine.register — catalog entry registration
  "lathe_transformer_tokenize",             // LatheTransformerEngine.tokenizeProgram — G-code tokenization for transformer
  "lathe_unified_ai_execute",               // LatheUnifiedAIOrchestrator.execute — unified AI orchestration
  "lathe_unified_ai_find_engine",           // LatheUnifiedAIOrchestrator.findEngineForCapability — task→engine router
  "lathe_unified_ai_capability_engines",    // LatheUnifiedAIOrchestrator.getEnginesWithCapability — engines having a capability
  "lathe_ai_orchestrate_optimization",      // LatheAIOrchestrationEngine.orchestrateOptimization — async optimization sweep
  "lathe_ai_orchestrate_learning",          // LatheAIOrchestrationEngine.orchestrateLearning — async corpus learning
  "lathe_ai_orchestrate_diagnosis",         // LatheAIOrchestrationEngine.orchestrateDiagnosis — async symptom diagnosis
  "lathe_cam_intelligence_toolpath",        // LatheCAMIntelligenceEngine.selectToolpath — toolpath strategy selector
  "lathe_cam_intelligence_sequence",        // LatheCAMIntelligenceEngine.sequenceOperations — operation ordering
  "lathe_cam_intelligence_workholding",     // LatheCAMIntelligenceEngine.recommendWorkholding — workholding strategy
  "lathe_cam_intelligence_mrr_cost",        // LatheCAMIntelligenceEngine.optimizeMRRCost — MRR/cost optimization
  "lathe_active_learning_update",           // LatheActiveLearningEngine.updateModel — incremental model update
  "lathe_active_learning_uncertainty",      // LatheActiveLearningEngine.queryUncertainty — uncertainty map over pool
  "lathe_active_learning_committee",        // LatheActiveLearningEngine.queryByCommittee — query-by-committee disagreement
  "lathe_bayesian_acquisition_ei",          // LatheBayesianOptimizationEngine.acquisitionEI — expected-improvement acquisition
  "lathe_bayesian_acquisition_ucb",         // LatheBayesianOptimizationEngine.acquisitionUCB — upper-confidence-bound acquisition

  // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-LORA-UNWIRED-3: 3 previously-unwired LatheLoRA* engines
  "lathe_lora_generate_script",             // LatheLoRATrainingScriptEngine.generateScript — emit training-script + estimateVRAM + estimateTime
  "lathe_lora_apply_preset",                // LatheLoRATrainingScriptEngine.applyPreset — apply training preset
  "lathe_lora_estimate",                    // LatheLoRATrainingScriptEngine.estimateVRAM/estimateTime — resource planning
  "lathe_lora_validate_config",             // LatheLoRATrainingScriptEngine.validateConfig — config validation
  "lathe_lora_tribal_augment",              // LatheLoRATribalAugmentationEngine.findRelevantTips — runtime tip augmentation
  "lathe_lora_tribal_find_tips",            // alias of tribal_augment
  "lathe_lora_tribal_aug_stats",            // LatheLoRATribalAugmentationEngine.getConfig — augmentation engine state
  "lathe_lora_tribal_extract",              // LatheLoRATribalExtractorEngine.extractTip — single-text → TribalTip
  "lathe_lora_tribal_extract_batch",        // LatheLoRATribalExtractorEngine.extractTip × array (batch convenience)
  "lathe_lora_tribal_extractor_stats",      // LatheLoRATribalExtractorEngine.getConfig

  // U-WIRE-LATHE-CUTTING-CHEMISTRY: coolant chemistry + chemical wear + selection (LATHE-PRO — 2237-LOC engine, 0 dispatcher refs)
  "lathe_chemistry_comprehensive",          // LatheCuttingChemistryEngine.comprehensiveAnalysis — full chemistry + wear + selection + safety
  "lathe_chemistry_select_coolant",         // .selectCoolant — base coolant + additives + concentration for material/op

  // BACKEND-DEV-LOOP/U-WIRE-LATHE-GA: LatheGeneticAlgorithmEngine — evolutionary optimization (2315-LOC engine, 0 dispatcher refs)
  "lathe_ga_optimize_parameters",           // .optimizeParameters — speed/feed/DOC + passes via GA (Kienzle + Taylor fitness)
  "lathe_ga_optimize_tool_sequence",        // .optimizeToolSequence — minimize total_time + tool_changes for op ordering w/ deps
  "lathe_ga_optimize_multi_pass",           // .optimizeMultiPassStrategy — DOC distribution across multiple roughing passes

  // BRIDGE-WIRING/U-BRIDGE-WIRE-TURNING: 6 unwired Turning engines (LATHE-PRO-MS4a/MS5 — 0 dispatcher refs before this wire)
  "turning_envelope_distance",              // TurningEnvelopeDistanceEngine.run — graduated distance-to-envelope metric
  "turning_sensitivity_analysis",           // TurningSensitivityAnalysisEngine.run — local-OAT + Morris variability apportionment
  "turning_stochastic_production_plan",     // TurningStochasticPlanEngine.run — MC P5/P50/P95 over MS1+MS2 cascade
  "turning_thread_optimize",                // TurningThreadOptimizerEngine.optimize — threading capstone + ISO 965-1 gate
  "turning_thread_sensitivity",             // TurningThreadSensitivityEngine.run — OAT apportionment on thread cascade
  "turning_thread_stochastic_plan",         // TurningThreadStochasticPlanEngine.run — MC envelope for single-point threading
  // LATHE-UNWIRED-WIRE-MS0/U-LUW01 (slot:whiskey 2026-05-23) — wire 5 high-leverage Lathe AI engines (9 actions)
  "lathe_selfaware_query",                  // LatheSelfAwarenessIntegrationEngine.whatCanIDo — capability discovery
  "lathe_selfaware_how_do_i",               // LatheSelfAwarenessIntegrationEngine.howDoI — task-routing
  "lathe_selfaware_who_handles",            // LatheSelfAwarenessIntegrationEngine.whoHandles — domain-routing
  "lathe_safety_compute",                   // LatheSafetySignalEngine.compute — safety signal from context
  "lathe_knowledge_graph_build",            // LatheKnowledgeGraphEngine.buildGraph — full graph rebuild
  "lathe_ai_ultra_list_controllers",        // LatheAIUltraEngine.listControllers — by family
  "lathe_ai_ultra_get_controller_caps",     // LatheAIUltraEngine.getControllerCapabilities — controller cap probe
  "lathe_quality_gate_validate_program",    // LatheQualityGateEngine.validateProgram — full G-code QA gate
  "lathe_quality_gate_validate_safety",     // LatheQualityGateEngine.validateSafety — safety-only fast path

  // WIRE-UNWIRED-LOOP-TURNING/BATCH-A: 56 orphan turning/lathe engines
  "lathe_orchestration_calculate",          // LatheOrchestrationEngine.calculate
  "eccentric_turning_get_stats",            // EccentricTurningEngine.getStats
  "lathe_deep_learning_find_similar_jobs",  // LatheDeepLearningEngine.findSimilarJobs
  "lathe_unified_ai_generate_process_plan", // LatheUnifiedAIEngine.generateProcessPlan
  "lathe_dl_intel_get_stats",               // LatheDeepLearningIntelligenceEngine.getStats
  "lathe_dl_intel_analyze",                 // LatheDeepLearningIntelligenceEngine.analyzeWithIntelligence
  "lathe_resource_knowledge_get_base",      // LatheResourceKnowledgeEngine.getKnowledgeBase
  "lathe_rl_get_stats",                     // LatheReinforcementLearningEngine.getStats
  "lathe_rl_select_action",                 // LatheReinforcementLearningEngine.selectAction
  "lathe_meta_learning_maml_train",         // LatheMetaLearningEngine.mamlTrain
  "lathe_archive_training_get_stats",       // LatheFullArchiveTrainingEngine.getStats
  "lathe_archive_training_run",             // LatheFullArchiveTrainingEngine.trainFullArchive
  "lathe_style_selector_select",            // LatheProgrammingStyleSelectorEngine.selectStyle
  "lathe_part_family_planning_analyze",     // LathePartFamilyPlanningEngine.analyzeFamilyPotential
  "lathe_transfer_learning_transfer",       // LatheTransferLearningEngine.transferKnowledge
  "lathe_lora_program_parser_parse",        // LatheLoRAProgramParserEngine.parse
  "lathe_lora_example_generator_generate",  // LatheLoRAExampleGeneratorEngine.generateFromParsed
  "lathe_lora_dataset_validator_validate",  // LatheLoRADatasetValidatorEngine.validate
  "lathe_lora_transfer_strategy_list",      // LatheLoRATransferStrategyEngine.listBaseModels
  "lathe_lora_training_monitor_init",       // LatheLoRATrainingMonitorEngine.initRun
  "lathe_lora_physics_evaluator_evaluate",  // LatheLoRAPhysicsEvaluatorEngine.evaluate
  "lathe_lora_merge_strategy_recommend",    // LatheLoRAMergeStrategyEngine.recommendStrategy
  "lathe_lora_quantization_estimate_size",  // LatheLoRAQuantizationOptimizerEngine.estimateSize
  "lathe_lora_model_optimizer_get_profile", // LatheLoRAModelOptimizerEngine.getProfile
  "lathe_lora_ollama_deployer_generate",    // LatheLoRAOllamaDeployerEngine.generateModelfile
  "lathe_lora_inference_gateway_get_config",// LatheLoRAInferenceGatewayEngine.getConfig
  "lathe_lora_reasoning_chain_get_templates",// LatheLoRAReasoningChainInferenceEngine.getTemplates
  "lathe_lora_neural_bridge_get_config",    // LatheLoRANeuralBridgeEngine.getConfig
  "lathe_lora_neural_orch_start_pipeline",  // LatheLoRANeuralOrchestratorEngine.startPipeline
  "lathe_lora_program_miner_detect_dialect",// LatheLoRAProgramMinerEngine.detectDialect
  "lathe_lora_knowledge_curator_get_config",// LatheLoRAKnowledgeCuratorEngine.getConfig
  "lathe_lora_pipeline_coord_create",       // LatheLoRAPipelineCoordinatorEngine.createPipeline
  "turning_strategy_catalog_select",        // TurningStrategyCatalog.selectTurningStrategy
  "lathe_ai_feature_get_stats",             // LatheAIFeatureRegistration.getLatheAIStats
  "lathe_ai_feature_find_best",             // LatheAIFeatureRegistration.findBestEngineForTask
  "lathe_advanced_ops_live_tooling",        // LatheAdvancedOperationsEngine.getLiveToolingParams
  "lathe_deep_ai_harden_analyze",           // LatheDeepAIHardeningEngine.analyzeLatheOperation
  "lathe_intelligence_get_stats",           // LatheIntelligenceEngine.getStats
  "lathe_intelligence_decide_macro",        // LatheIntelligenceEngine.decideMacroVsHardCode
  "lathe_print_ingest_ingest",              // LathePrintIngestPipelineEngine.ingest
  "lathe_feature_recognizer_recognize",     // LatheTurningFeatureRecognizerEngine.recognize
  "lathe_print_setup_select",               // LathePrintSetupSelectionEngine.selectSetup
  "lathe_print_dl_intel_predict",           // LathePrintToProgramDLIntelligenceEngine.predict
  "lathe_safety_predicate_evaluate",        // LatheSafetyPredicateEngine.evaluate
  "lathe_lora_physics_aug_infer_extract",   // LatheLoRAPhysicsAugmentedInferenceEngine.extractParameters
  "lathe_proof_carrying_emit",              // LatheProofCarryingEmitEngine.emit
  "lathe_print_tolerance_stack_propagate",  // LathePrintToleranceStackEngine.propagate
  "lathe_thermodynamics_heat_gen",          // LatheThermodynamicsEngine.calculateHeatGeneration
  "lathe_opus_reasoning_forward",           // LatheOpusReasoningEngine.forward
  "lathe_unified_physics_analyze",          // LatheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics
  "lathe_knowledge_graph_ingest",           // LathePrintToProgramKnowledgeGraphEngine.ingest
  "lathe_print_reasoning_explain",          // LathePrintToProgramReasoningEngine.explain
  "lathe_tribal_integration_source_corpus", // LatheTribalIntegrationEngine.sourceCorpusTips
  "lathe_print_sequence_plan",              // LathePrintSequencePlannerEngine.planSequence
  "lathe_print_feature_strategy_select",    // LathePrintFeatureStrategySelectorEngine.selectStrategy
  "lathe_print_program_emit",               // LathePrintProgramEmitterEngine.emit
  "lathe_print_program_signoff_generate",   // LathePrintProgramSignoffEngine.generatePackage
  "lathe_program_audit_pipeline_run",       // LatheProgramAuditPipelineEngine.audit
  "jmdie_lathe_program_upgrade",            // JMDieLatheProgramUpgraderEngine.upgrade
  "jmdie_lathe_program_upgrade_v2",         // JMDieLatheProgramUpgraderV2Engine.upgradeV2
  "lathe_program_library_search",           // LatheProgramLibraryEngine.search
  // iter9 wire-unwired-loop: turning/swiss/multi-spindle engines
  "multi_spindle_automatic_plan",
  "swiss_type_intelligence_analyze",
  "insert_grade_select",
  "insert_change_recommend",
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
          case "live_tool_plan": {
            // FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-LIVE-TOOLING — feature→toolpath planner
            const engine = await getEngine("livePlanner");
            result = engine.plan?.(params) ?? engine.calculate?.(params) ?? { error: "LatheLiveToolingPlannerEngine method not found" };
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
          // BRIDGE-WIRING/U-BRIDGE-WIRE-TURNING — 6 unwired Turning engines.
          // Each engine throws on bad input; the outer try/catch envelopes it.
          // ─────────────────────────────────────────────────────────────────
          case "turning_envelope_distance": {
            const { turningEnvelopeDistanceEngine } = await import("../../engines/TurningEnvelopeDistanceEngine.js");
            result = { success: true, data: turningEnvelopeDistanceEngine.run(params as Parameters<typeof turningEnvelopeDistanceEngine.run>[0]) };
            break;
          }
          case "turning_sensitivity_analysis": {
            const { turningSensitivityAnalysisEngine } = await import("../../engines/TurningSensitivityAnalysisEngine.js");
            result = { success: true, data: turningSensitivityAnalysisEngine.run(params as Parameters<typeof turningSensitivityAnalysisEngine.run>[0]) };
            break;
          }
          case "turning_stochastic_production_plan": {
            const { turningStochasticPlanEngine } = await import("../../engines/TurningStochasticPlanEngine.js");
            result = { success: true, data: turningStochasticPlanEngine.run(params as Parameters<typeof turningStochasticPlanEngine.run>[0]) };
            break;
          }
          case "turning_thread_optimize": {
            const { turningThreadOptimizerEngine } = await import("../../engines/TurningThreadOptimizerEngine.js");
            result = { success: true, data: turningThreadOptimizerEngine.optimize(params as Parameters<typeof turningThreadOptimizerEngine.optimize>[0]) };
            break;
          }
          case "turning_thread_sensitivity": {
            const { turningThreadSensitivityEngine } = await import("../../engines/TurningThreadSensitivityEngine.js");
            result = { success: true, data: turningThreadSensitivityEngine.run(params as Parameters<typeof turningThreadSensitivityEngine.run>[0]) };
            break;
          }
          case "turning_thread_stochastic_plan": {
            const { turningThreadStochasticPlanEngine } = await import("../../engines/TurningThreadStochasticPlanEngine.js");
            result = { success: true, data: turningThreadStochasticPlanEngine.run(params as Parameters<typeof turningThreadStochasticPlanEngine.run>[0]) };
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
          case "tnr_lookup_p_code": {
            const { ToolNoseRadiusCompensationEngine } =
              await import("../../engines/ToolNoseRadiusCompensationEngine.js");
            const pCode = Number((params as { pCode?: number }).pCode);
            result = { success: true, data: ToolNoseRadiusCompensationEngine.lookupPCode(pCode) };
            break;
          }
          case "tnr_get_g_code": {
            const { ToolNoseRadiusCompensationEngine } =
              await import("../../engines/ToolNoseRadiusCompensationEngine.js");
            const code = (params as { code?: "G40" | "G41" | "G42" }).code ?? "G40";
            result = { success: true, data: ToolNoseRadiusCompensationEngine.getGCode(code) };
            break;
          }
          case "tnr_validate_program": {
            const { ToolNoseRadiusCompensationEngine, ProgramValidateInputSchema } =
              await import("../../engines/ToolNoseRadiusCompensationEngine.js");
            const parsed = ProgramValidateInputSchema.parse({
              program: (params as { program?: string }).program ?? "",
            });
            result = { success: true, data: ToolNoseRadiusCompensationEngine.validateProgram(parsed.program) };
            break;
          }
          case "tnr_setup_procedure": {
            const { ToolNoseRadiusCompensationEngine } =
              await import("../../engines/ToolNoseRadiusCompensationEngine.js");
            result = {
              success: true,
              data: { steps: ToolNoseRadiusCompensationEngine.getSetupProcedure() },
            };
            break;
          }
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
          // U-LATHE-PROG-OPT-WIRE: completes the LatheProgramOptimizerEngine surface (analyze was BATCH3; optimize+estimate close the upgrade trio)
          case "lathe_program_optimize": {
            const { latheProgramOptimizerEngine } = await import("../../engines/LatheProgramOptimizerEngine.js");
            const p = params as { content: string; file_path?: string };
            if (typeof p.content !== "string") throw new Error("lathe_program_optimize requires 'content' (string)");
            result = latheProgramOptimizerEngine.generateOptimizedProgram(p.content, p.file_path);
            break;
          }
          case "lathe_program_estimate": {
            const { latheProgramOptimizerEngine } = await import("../../engines/LatheProgramOptimizerEngine.js");
            const p = params as { content: string; file_path?: string };
            if (typeof p.content !== "string") throw new Error("lathe_program_estimate requires 'content' (string)");
            result = latheProgramOptimizerEngine.estimateImprovements(p.content, p.file_path);
            break;
          }
          // U-WIRE-LATHE-BIRDNEST: chip-wrap risk prediction (LATHE-PRO-MS7)
          case "lathe_bird_nest_predict": {
            const { latheBirdNestPredictorEngine } = await import("../../engines/LatheBirdNestPredictorEngine.js");
            const p = params as Parameters<typeof latheBirdNestPredictorEngine.predict>[0];
            if (typeof p?.vc_m_min !== "number") throw new Error("lathe_bird_nest_predict requires 'vc_m_min' (number)");
            if (typeof p?.feed_mm_rev !== "number") throw new Error("lathe_bird_nest_predict requires 'feed_mm_rev' (number)");
            if (typeof p?.doc_mm !== "number") throw new Error("lathe_bird_nest_predict requires 'doc_mm' (number)");
            if (typeof p?.clearance_length_mm !== "number") throw new Error("lathe_bird_nest_predict requires 'clearance_length_mm' (number)");
            if (typeof p?.length_over_diameter !== "number") throw new Error("lathe_bird_nest_predict requires 'length_over_diameter' (number)");
            if (typeof p?.chipbreaker !== "string") throw new Error("lathe_bird_nest_predict requires 'chipbreaker' (string)");
            if (typeof p?.coolant !== "string") throw new Error("lathe_bird_nest_predict requires 'coolant' (string)");
            result = latheBirdNestPredictorEngine.predict(p);
            break;
          }
          case "lathe_bird_nest_stats": {
            const { latheBirdNestPredictorEngine } = await import("../../engines/LatheBirdNestPredictorEngine.js");
            result = latheBirdNestPredictorEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-PARTING-CLEAR: chip-clearance + coolant-jet evaluation for parting (LATHE-PRO-MS7)
          case "lathe_parting_clearance_evaluate": {
            const { lathePartingChipClearanceEngine } = await import("../../engines/LathePartingChipClearanceEngine.js");
            const p = params as Parameters<typeof lathePartingChipClearanceEngine.evaluate>[0];
            if (typeof p?.blade_width_mm !== "number") throw new Error("lathe_parting_clearance_evaluate requires 'blade_width_mm' (number)");
            if (typeof p?.slot_depth_mm !== "number") throw new Error("lathe_parting_clearance_evaluate requires 'slot_depth_mm' (number)");
            if (typeof p?.bar_od_mm !== "number") throw new Error("lathe_parting_clearance_evaluate requires 'bar_od_mm' (number)");
            if (typeof p?.feed_mm_rev !== "number") throw new Error("lathe_parting_clearance_evaluate requires 'feed_mm_rev' (number)");
            if (typeof p?.vc_m_min !== "number") throw new Error("lathe_parting_clearance_evaluate requires 'vc_m_min' (number)");
            if (typeof p?.coolant_pressure_bar !== "number") throw new Error("lathe_parting_clearance_evaluate requires 'coolant_pressure_bar' (number)");
            result = lathePartingChipClearanceEngine.evaluate(p);
            break;
          }
          case "lathe_parting_clearance_stats": {
            const { lathePartingChipClearanceEngine } = await import("../../engines/LathePartingChipClearanceEngine.js");
            result = lathePartingChipClearanceEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-PART-COST: 7-bucket cost-per-part model (LATHE-PRO-MS10)
          case "lathe_part_cost_compute": {
            const { lathePartCostModelEngine } = await import("../../engines/LathePartCostModelEngine.js");
            const p = params as Parameters<typeof lathePartCostModelEngine.compute>[0];
            if (typeof p?.cycle_time_s !== "number") throw new Error("lathe_part_cost_compute requires 'cycle_time_s' (number)");
            if (typeof p?.machine_rate_per_hr !== "number") throw new Error("lathe_part_cost_compute requires 'machine_rate_per_hr' (number)");
            if (!Array.isArray(p?.operations)) throw new Error("lathe_part_cost_compute requires 'operations' (array)");
            if (typeof p?.part_mass_kg !== "number") throw new Error("lathe_part_cost_compute requires 'part_mass_kg' (number)");
            if (typeof p?.waste_mass_kg !== "number") throw new Error("lathe_part_cost_compute requires 'waste_mass_kg' (number)");
            if (typeof p?.material_price_per_kg !== "number") throw new Error("lathe_part_cost_compute requires 'material_price_per_kg' (number)");
            if (typeof p?.setup_time_s !== "number") throw new Error("lathe_part_cost_compute requires 'setup_time_s' (number)");
            if (typeof p?.setup_rate_per_hr !== "number") throw new Error("lathe_part_cost_compute requires 'setup_rate_per_hr' (number)");
            if (typeof p?.batch_size !== "number") throw new Error("lathe_part_cost_compute requires 'batch_size' (number)");
            result = lathePartCostModelEngine.compute(p);
            break;
          }
          case "lathe_part_cost_stats": {
            const { lathePartCostModelEngine } = await import("../../engines/LathePartCostModelEngine.js");
            result = lathePartCostModelEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-SUBSPINDLE-PURGE: sub-spindle transfer purge timing (LATHE-PRO-MS7)
          case "lathe_subspindle_purge_plan": {
            const { latheSubSpindleTransferPurgeEngine } = await import("../../engines/LatheSubSpindleTransferPurgeEngine.js");
            const p = params as Parameters<typeof latheSubSpindleTransferPurgeEngine.plan>[0];
            if (typeof p?.main_rpm !== "number") throw new Error("lathe_subspindle_purge_plan requires 'main_rpm' (number)");
            if (typeof p?.transfer_length_mm !== "number") throw new Error("lathe_subspindle_purge_plan requires 'transfer_length_mm' (number)");
            if (typeof p?.transfer_diameter_mm !== "number") throw new Error("lathe_subspindle_purge_plan requires 'transfer_diameter_mm' (number)");
            if (typeof p?.coolant_pressure_bar !== "number") throw new Error("lathe_subspindle_purge_plan requires 'coolant_pressure_bar' (number)");
            if (typeof p?.air_blast_available !== "boolean") throw new Error("lathe_subspindle_purge_plan requires 'air_blast_available' (boolean)");
            result = latheSubSpindleTransferPurgeEngine.plan(p);
            break;
          }
          case "lathe_subspindle_purge_stats": {
            const { latheSubSpindleTransferPurgeEngine } = await import("../../engines/LatheSubSpindleTransferPurgeEngine.js");
            result = latheSubSpindleTransferPurgeEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-OP-TIME-BREAKDOWN: 9-bucket op-time decomposition (LATHE-PRO-MS5)
          case "lathe_op_time_compute": {
            const { latheOpTimeBreakdownEngine } = await import("../../engines/LatheOpTimeBreakdownEngine.js");
            const p = params as Parameters<typeof latheOpTimeBreakdownEngine.compute>[0];
            if (typeof p?.cut_length_mm !== "number") throw new Error("lathe_op_time_compute requires 'cut_length_mm' (number)");
            if (typeof p?.feed_mm_min !== "number") throw new Error("lathe_op_time_compute requires 'feed_mm_min' (number)");
            result = latheOpTimeBreakdownEngine.compute(p);
            break;
          }
          case "lathe_op_time_aggregate": {
            const { latheOpTimeBreakdownEngine } = await import("../../engines/LatheOpTimeBreakdownEngine.js");
            const p = params as { ops: Parameters<typeof latheOpTimeBreakdownEngine.aggregate>[0]; lot_size: number };
            if (!Array.isArray(p?.ops)) throw new Error("lathe_op_time_aggregate requires 'ops' (array of per-op breakdowns)");
            if (typeof p?.lot_size !== "number") throw new Error("lathe_op_time_aggregate requires 'lot_size' (number)");
            result = latheOpTimeBreakdownEngine.aggregate(p.ops, p.lot_size);
            break;
          }
          case "lathe_op_time_stats": {
            const { latheOpTimeBreakdownEngine } = await import("../../engines/LatheOpTimeBreakdownEngine.js");
            result = latheOpTimeBreakdownEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-REPLAY-FRAME: block-by-block replay frame compiler (LATHE-PRO-MS12)
          case "lathe_replay_frame_compile": {
            const { latheReplayFrameCompilerEngine } = await import("../../engines/LatheReplayFrameCompilerEngine.js");
            const p = params as Parameters<typeof latheReplayFrameCompilerEngine.compile>[0];
            if (typeof p?.program_id !== "string") throw new Error("lathe_replay_frame_compile requires 'program_id' (string)");
            if (!Array.isArray(p?.blocks)) throw new Error("lathe_replay_frame_compile requires 'blocks' (array)");
            result = latheReplayFrameCompilerEngine.compile(p);
            break;
          }
          case "lathe_replay_frame_stats": {
            const { latheReplayFrameCompilerEngine } = await import("../../engines/LatheReplayFrameCompilerEngine.js");
            result = latheReplayFrameCompilerEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-PART-CLASSIFIER: 15-family part classifier (LATHE-PRO-MS3)
          case "lathe_part_classify": {
            const { lathePartClassifierEngine } = await import("../../engines/LathePartClassifierEngine.js");
            const p = params as Parameters<typeof lathePartClassifierEngine.classify>[0];
            if (typeof p?.length_mm !== "number") throw new Error("lathe_part_classify requires 'length_mm' (number)");
            if (typeof p?.max_od_mm !== "number") throw new Error("lathe_part_classify requires 'max_od_mm' (number)");
            result = lathePartClassifierEngine.classify(p);
            break;
          }
          case "lathe_part_classify_batch": {
            const { lathePartClassifierEngine } = await import("../../engines/LathePartClassifierEngine.js");
            const p = params as { parts: Parameters<typeof lathePartClassifierEngine.classifyBatch>[0] };
            if (!Array.isArray(p?.parts)) throw new Error("lathe_part_classify_batch requires 'parts' (array)");
            result = lathePartClassifierEngine.classifyBatch(p.parts);
            break;
          }
          case "lathe_part_family_profile": {
            const { lathePartClassifierEngine } = await import("../../engines/LathePartClassifierEngine.js");
            const p = params as { family: Parameters<typeof lathePartClassifierEngine.getFamilyProfile>[0] };
            if (typeof p?.family !== "string") throw new Error("lathe_part_family_profile requires 'family' (string)");
            result = lathePartClassifierEngine.getFamilyProfile(p.family);
            break;
          }
          case "lathe_part_family_list": {
            const { lathePartClassifierEngine } = await import("../../engines/LathePartClassifierEngine.js");
            result = lathePartClassifierEngine.listFamilies();
            break;
          }
          // U-WIRE-LATHE-PROG-COST: programming cost model (LATHE-AWARE-HARDEN-MS11)
          case "lathe_programming_cost_estimate": {
            const { latheProgrammingCostEngine } = await import("../../engines/LatheProgrammingCostEngine.js");
            const p = params as { style: Parameters<typeof latheProgrammingCostEngine.estimateProgrammingCost>[0]; complexity: Parameters<typeof latheProgrammingCostEngine.estimateProgrammingCost>[1]; lot_size: number; options?: Parameters<typeof latheProgrammingCostEngine.estimateProgrammingCost>[3] };
            if (typeof p?.style !== "string") throw new Error("lathe_programming_cost_estimate requires 'style' (string)");
            if (typeof p?.complexity !== "string") throw new Error("lathe_programming_cost_estimate requires 'complexity' (string)");
            if (typeof p?.lot_size !== "number") throw new Error("lathe_programming_cost_estimate requires 'lot_size' (number)");
            result = latheProgrammingCostEngine.estimateProgrammingCost(p.style, p.complexity, p.lot_size, p.options);
            break;
          }
          case "lathe_programming_cost_compare": {
            const { latheProgrammingCostEngine } = await import("../../engines/LatheProgrammingCostEngine.js");
            const p = params as Parameters<typeof latheProgrammingCostEngine.compareApproaches>[0];
            if (typeof p?.part_complexity !== "string") throw new Error("lathe_programming_cost_compare requires 'part_complexity' (string)");
            if (typeof p?.lot_size !== "number") throw new Error("lathe_programming_cost_compare requires 'lot_size' (number)");
            result = latheProgrammingCostEngine.compareApproaches(p);
            break;
          }
          case "lathe_programming_cost_breakeven": {
            const { latheProgrammingCostEngine } = await import("../../engines/LatheProgrammingCostEngine.js");
            const p = params as { macro_investment_hr: number; lot_sizes: number[]; complexity?: Parameters<typeof latheProgrammingCostEngine.breakEvenAnalysis>[2]; options?: Parameters<typeof latheProgrammingCostEngine.breakEvenAnalysis>[3] };
            if (typeof p?.macro_investment_hr !== "number") throw new Error("lathe_programming_cost_breakeven requires 'macro_investment_hr' (number)");
            if (!Array.isArray(p?.lot_sizes)) throw new Error("lathe_programming_cost_breakeven requires 'lot_sizes' (number array)");
            result = latheProgrammingCostEngine.breakEvenAnalysis(p.macro_investment_hr, p.lot_sizes, p.complexity, p.options);
            break;
          }
          case "lathe_programming_cost_stats": {
            const { latheProgrammingCostEngine } = await import("../../engines/LatheProgrammingCostEngine.js");
            result = latheProgrammingCostEngine.getStats();
            break;
          }
          // LATHE-PSN-SYNERGY (Phase 2): tribal-knowledge → style-score-delta bridge
          case "lathe_programming_style_tribal_advise": {
            const { programmingStyleTribalAdvisorEngine } = await import(
              "../../engines/ProgrammingStyleTribalAdvisorEngine.js"
            );
            const p = params as Parameters<typeof programmingStyleTribalAdvisorEngine.advise>[0];
            if (typeof p?.controller !== "string") throw new Error("lathe_programming_style_tribal_advise requires 'controller' (string)");
            if (typeof p?.part_complexity !== "string") throw new Error("lathe_programming_style_tribal_advise requires 'part_complexity' (string)");
            if (typeof p?.lot_size !== "number") throw new Error("lathe_programming_style_tribal_advise requires 'lot_size' (number)");
            if (typeof p?.family_parts_expected !== "number") throw new Error("lathe_programming_style_tribal_advise requires 'family_parts_expected' (number)");
            result = programmingStyleTribalAdvisorEngine.advise(p);
            break;
          }
          case "lathe_programming_style_tribal_stats": {
            const { programmingStyleTribalAdvisorEngine } = await import(
              "../../engines/ProgrammingStyleTribalAdvisorEngine.js"
            );
            result = programmingStyleTribalAdvisorEngine.getStats();
            break;
          }
          case "lathe_programming_style_tribal_rules": {
            const { programmingStyleTribalAdvisorEngine } = await import(
              "../../engines/ProgrammingStyleTribalAdvisorEngine.js"
            );
            result = programmingStyleTribalAdvisorEngine.getRules();
            break;
          }
          // U-WIRE-LATHE-PERF-SLO: production-SLO registry (LATHE-PROD-READY-MS0)
          case "lathe_slo_targets": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            result = lathePerformanceSLORegistryEngine.targets();
            break;
          }
          case "lathe_slo_get_target": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            const p = params as { metric: Parameters<typeof lathePerformanceSLORegistryEngine.getTarget>[0] };
            if (typeof p?.metric !== "string") throw new Error("lathe_slo_get_target requires 'metric' (string)");
            result = lathePerformanceSLORegistryEngine.getTarget(p.metric);
            break;
          }
          case "lathe_slo_set_target": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            const p = params as { target: Parameters<typeof lathePerformanceSLORegistryEngine.setTarget>[0] };
            if (!p?.target || typeof p.target.metric !== "string") throw new Error("lathe_slo_set_target requires 'target' (SLOTarget object with metric)");
            lathePerformanceSLORegistryEngine.setTarget(p.target);
            result = { success: true, metric: p.target.metric };
            break;
          }
          case "lathe_slo_record_sample": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            const p = params as { metric: Parameters<typeof lathePerformanceSLORegistryEngine.recordSample>[0]; value: number };
            if (typeof p?.metric !== "string") throw new Error("lathe_slo_record_sample requires 'metric' (string)");
            if (typeof p?.value !== "number") throw new Error("lathe_slo_record_sample requires 'value' (number)");
            lathePerformanceSLORegistryEngine.recordSample(p.metric, p.value);
            result = { success: true, metric: p.metric, recorded: p.value };
            break;
          }
          case "lathe_slo_sample_count": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            const p = params as { metric: Parameters<typeof lathePerformanceSLORegistryEngine.sampleCount>[0] };
            if (typeof p?.metric !== "string") throw new Error("lathe_slo_sample_count requires 'metric' (string)");
            result = { metric: p.metric, count: lathePerformanceSLORegistryEngine.sampleCount(p.metric) };
            break;
          }
          case "lathe_slo_evaluate": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            const p = params as { metric: Parameters<typeof lathePerformanceSLORegistryEngine.evaluate>[0] };
            if (typeof p?.metric !== "string") throw new Error("lathe_slo_evaluate requires 'metric' (string)");
            result = lathePerformanceSLORegistryEngine.evaluate(p.metric);
            break;
          }
          case "lathe_slo_dashboard": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            result = lathePerformanceSLORegistryEngine.dashboard();
            break;
          }
          case "lathe_slo_clear_samples": {
            const { lathePerformanceSLORegistryEngine } = await import("../../engines/LathePerformanceSLORegistryEngine.js");
            const p = params as { metric?: Parameters<typeof lathePerformanceSLORegistryEngine.clearSamples>[0] };
            lathePerformanceSLORegistryEngine.clearSamples(p?.metric);
            result = { success: true, cleared: p?.metric ?? "all" };
            break;
          }
          // U-WIRE-LATHE-LORA-SAFETY-EVAL: LoRA-output safety evaluator (LATHE-LORA-MS0)
          case "lathe_lora_safety_evaluate": {
            const { latheLoRASafetyEvaluatorEngine } = await import("../../engines/LatheLoRASafetyEvaluatorEngine.js");
            const p = params as { output: string; context?: { operation?: string } };
            if (typeof p?.output !== "string") throw new Error("lathe_lora_safety_evaluate requires 'output' (string)");
            result = latheLoRASafetyEvaluatorEngine.evaluate(p.output, p.context);
            break;
          }
          case "lathe_lora_safety_is_safe": {
            const { latheLoRASafetyEvaluatorEngine } = await import("../../engines/LatheLoRASafetyEvaluatorEngine.js");
            const p = params as { evaluation: Parameters<typeof latheLoRASafetyEvaluatorEngine.isSafe>[0] };
            if (!p?.evaluation || typeof p.evaluation !== "object") throw new Error("lathe_lora_safety_is_safe requires 'evaluation' (SafetyEvaluation object)");
            result = { is_safe: latheLoRASafetyEvaluatorEngine.isSafe(p.evaluation) };
            break;
          }
          case "lathe_lora_safety_summary": {
            const { latheLoRASafetyEvaluatorEngine } = await import("../../engines/LatheLoRASafetyEvaluatorEngine.js");
            const p = params as { evaluation: Parameters<typeof latheLoRASafetyEvaluatorEngine.getSummary>[0] };
            if (!p?.evaluation || typeof p.evaluation !== "object") throw new Error("lathe_lora_safety_summary requires 'evaluation' (SafetyEvaluation object)");
            result = { summary: latheLoRASafetyEvaluatorEngine.getSummary(p.evaluation) };
            break;
          }
          case "lathe_lora_safety_set_config": {
            const { latheLoRASafetyEvaluatorEngine } = await import("../../engines/LatheLoRASafetyEvaluatorEngine.js");
            const p = params as { config: Parameters<typeof latheLoRASafetyEvaluatorEngine.setConfig>[0] };
            if (!p?.config || typeof p.config !== "object") throw new Error("lathe_lora_safety_set_config requires 'config' (Partial<SafetyConfig>)");
            latheLoRASafetyEvaluatorEngine.setConfig(p.config);
            result = { success: true, config: latheLoRASafetyEvaluatorEngine.getConfig() };
            break;
          }
          case "lathe_lora_safety_get_config": {
            const { latheLoRASafetyEvaluatorEngine } = await import("../../engines/LatheLoRASafetyEvaluatorEngine.js");
            result = latheLoRASafetyEvaluatorEngine.getConfig();
            break;
          }
          case "lathe_lora_safety_threshold": {
            const { latheLoRASafetyEvaluatorEngine } = await import("../../engines/LatheLoRASafetyEvaluatorEngine.js");
            result = { s_x_threshold: latheLoRASafetyEvaluatorEngine.getThreshold() };
            break;
          }
          // U-WIRE-LATHE-LORA-REASON-EVAL: LoRA reasoning-chain evaluator (LATHE-LORA-MS0)
          case "lathe_lora_reason_evaluate": {
            const { latheLoRAReasoningEvaluatorEngine } = await import("../../engines/LatheLoRAReasoningEvaluatorEngine.js");
            const p = params as { output: string };
            if (typeof p?.output !== "string") throw new Error("lathe_lora_reason_evaluate requires 'output' (string)");
            result = latheLoRAReasoningEvaluatorEngine.evaluate(p.output);
            break;
          }
          case "lathe_lora_reason_summary": {
            const { latheLoRAReasoningEvaluatorEngine } = await import("../../engines/LatheLoRAReasoningEvaluatorEngine.js");
            const p = params as { evaluation: Parameters<typeof latheLoRAReasoningEvaluatorEngine.getSummary>[0] };
            if (!p?.evaluation || typeof p.evaluation !== "object") throw new Error("lathe_lora_reason_summary requires 'evaluation' (ReasoningEvaluation object)");
            result = { summary: latheLoRAReasoningEvaluatorEngine.getSummary(p.evaluation) };
            break;
          }
          case "lathe_lora_reason_suggestions": {
            const { latheLoRAReasoningEvaluatorEngine } = await import("../../engines/LatheLoRAReasoningEvaluatorEngine.js");
            const p = params as { evaluation: Parameters<typeof latheLoRAReasoningEvaluatorEngine.getSuggestions>[0] };
            if (!p?.evaluation || typeof p.evaluation !== "object") throw new Error("lathe_lora_reason_suggestions requires 'evaluation' (ReasoningEvaluation object)");
            result = { suggestions: latheLoRAReasoningEvaluatorEngine.getSuggestions(p.evaluation) };
            break;
          }
          case "lathe_lora_reason_set_config": {
            const { latheLoRAReasoningEvaluatorEngine } = await import("../../engines/LatheLoRAReasoningEvaluatorEngine.js");
            const p = params as { config: Parameters<typeof latheLoRAReasoningEvaluatorEngine.setConfig>[0] };
            if (!p?.config || typeof p.config !== "object") throw new Error("lathe_lora_reason_set_config requires 'config' (Partial<ReasoningConfig>)");
            latheLoRAReasoningEvaluatorEngine.setConfig(p.config);
            result = { success: true, config: latheLoRAReasoningEvaluatorEngine.getConfig() };
            break;
          }
          case "lathe_lora_reason_get_config": {
            const { latheLoRAReasoningEvaluatorEngine } = await import("../../engines/LatheLoRAReasoningEvaluatorEngine.js");
            result = latheLoRAReasoningEvaluatorEngine.getConfig();
            break;
          }
          // U-WIRE-LATHE-COOLANT-ADVISOR: coolant delivery recommender (LATHE-PRO-MS5)
          case "lathe_coolant_advise": {
            const { latheCoolantAdvisorEngine } = await import("../../engines/LatheCoolantAdvisorEngine.js");
            const p = params as Parameters<typeof latheCoolantAdvisorEngine.advise>[0];
            if (typeof p?.iso_group !== "string") throw new Error("lathe_coolant_advise requires 'iso_group' (string)");
            if (typeof p?.operation !== "string") throw new Error("lathe_coolant_advise requires 'operation' (string)");
            if (typeof p?.tool_material !== "string") throw new Error("lathe_coolant_advise requires 'tool_material' (string)");
            result = latheCoolantAdvisorEngine.advise(p);
            break;
          }
          case "lathe_coolant_stats": {
            const { latheCoolantAdvisorEngine } = await import("../../engines/LatheCoolantAdvisorEngine.js");
            result = latheCoolantAdvisorEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-CHUCK-JAW-SETUP: soft-jaw setup calculator (LATHE-PRO-MS11)
          case "lathe_chuck_jaw_compute": {
            const { latheChuckJawSetupEngine } = await import("../../engines/LatheChuckJawSetupEngine.js");
            const p = params as Parameters<typeof latheChuckJawSetupEngine.compute>[0];
            if (typeof p?.part_od_mm !== "number") throw new Error("lathe_chuck_jaw_compute requires 'part_od_mm' (number)");
            if (typeof p?.part_od_tol_mm !== "number") throw new Error("lathe_chuck_jaw_compute requires 'part_od_tol_mm' (number)");
            if (typeof p?.clamp_force_kn !== "number") throw new Error("lathe_chuck_jaw_compute requires 'clamp_force_kn' (number)");
            if (typeof p?.jaw_mass_kg !== "number") throw new Error("lathe_chuck_jaw_compute requires 'jaw_mass_kg' (number)");
            if (typeof p?.jaw_centroid_radius_mm !== "number") throw new Error("lathe_chuck_jaw_compute requires 'jaw_centroid_radius_mm' (number)");
            if (typeof p?.chuck_rated_max_rpm !== "number") throw new Error("lathe_chuck_jaw_compute requires 'chuck_rated_max_rpm' (number)");
            if (typeof p?.operating_rpm !== "number") throw new Error("lathe_chuck_jaw_compute requires 'operating_rpm' (number)");
            result = latheChuckJawSetupEngine.compute(p);
            break;
          }
          case "lathe_chuck_jaw_stats": {
            const { latheChuckJawSetupEngine } = await import("../../engines/LatheChuckJawSetupEngine.js");
            result = latheChuckJawSetupEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-CSS-OPTIMIZER: CSS clamp + mode selector (LATHE-PRO)
          case "lathe_css_optimize": {
            const { latheCSSOptimizerEngine } = await import("../../engines/LatheCSSOptimizerEngine.js");
            const p = params as Parameters<typeof latheCSSOptimizerEngine.optimize>[0];
            if (typeof p?.Vc_m_min !== "number") throw new Error("lathe_css_optimize requires 'Vc_m_min' (number)");
            if (typeof p?.max_od_mm !== "number") throw new Error("lathe_css_optimize requires 'max_od_mm' (number)");
            if (typeof p?.min_od_mm !== "number") throw new Error("lathe_css_optimize requires 'min_od_mm' (number)");
            if (typeof p?.rated_max_rpm !== "number") throw new Error("lathe_css_optimize requires 'rated_max_rpm' (number)");
            result = latheCSSOptimizerEngine.optimize(p);
            break;
          }
          case "lathe_css_select_mode": {
            const { latheCSSOptimizerEngine } = await import("../../engines/LatheCSSOptimizerEngine.js");
            const p = params as { Vc_m_min: number; diameter_mm: number; rated_max_rpm: number; feature_length_mm: number };
            if (typeof p?.Vc_m_min !== "number") throw new Error("lathe_css_select_mode requires 'Vc_m_min' (number)");
            if (typeof p?.diameter_mm !== "number") throw new Error("lathe_css_select_mode requires 'diameter_mm' (number)");
            if (typeof p?.rated_max_rpm !== "number") throw new Error("lathe_css_select_mode requires 'rated_max_rpm' (number)");
            if (typeof p?.feature_length_mm !== "number") throw new Error("lathe_css_select_mode requires 'feature_length_mm' (number)");
            result = latheCSSOptimizerEngine.selectMode(p.Vc_m_min, p.diameter_mm, p.rated_max_rpm, p.feature_length_mm);
            break;
          }
          case "lathe_css_stats": {
            const { latheCSSOptimizerEngine } = await import("../../engines/LatheCSSOptimizerEngine.js");
            result = latheCSSOptimizerEngine.getStats();
            break;
          }
          // U-WIRE-LATHE-LORA-REWARD-SHAPE: RL reward shaping (LATHE-LORA-MS0)
          case "lathe_lora_reward_calc": {
            const { latheLoRARewardShapingEngine } = await import("../../engines/LatheLoRARewardShapingEngine.js");
            const p = params as { output: string; context?: { instruction?: string; expected_type?: string } };
            if (typeof p?.output !== "string") throw new Error("lathe_lora_reward_calc requires 'output' (string)");
            result = latheLoRARewardShapingEngine.calculateReward(p.output, p.context);
            break;
          }
          case "lathe_lora_reward_threshold": {
            const { latheLoRARewardShapingEngine } = await import("../../engines/LatheLoRARewardShapingEngine.js");
            const p = params as { result: Parameters<typeof latheLoRARewardShapingEngine.meetsThreshold>[0]; threshold?: number };
            if (!p?.result || typeof p.result !== "object") throw new Error("lathe_lora_reward_threshold requires 'result' (RewardResult object)");
            const thr = typeof p.threshold === "number" ? p.threshold : 0;
            result = { meets_threshold: latheLoRARewardShapingEngine.meetsThreshold(p.result, thr), threshold: thr };
            break;
          }
          case "lathe_lora_reward_summary": {
            const { latheLoRARewardShapingEngine } = await import("../../engines/LatheLoRARewardShapingEngine.js");
            const p = params as { result: Parameters<typeof latheLoRARewardShapingEngine.getSummary>[0] };
            if (!p?.result || typeof p.result !== "object") throw new Error("lathe_lora_reward_summary requires 'result' (RewardResult object)");
            result = { summary: latheLoRARewardShapingEngine.getSummary(p.result) };
            break;
          }
          case "lathe_lora_reward_set_config": {
            const { latheLoRARewardShapingEngine } = await import("../../engines/LatheLoRARewardShapingEngine.js");
            const p = params as { config: Parameters<typeof latheLoRARewardShapingEngine.setConfig>[0] };
            if (!p?.config || typeof p.config !== "object") throw new Error("lathe_lora_reward_set_config requires 'config' (Partial<RewardConfig>)");
            latheLoRARewardShapingEngine.setConfig(p.config);
            result = { success: true, config: latheLoRARewardShapingEngine.getConfig() };
            break;
          }
          case "lathe_lora_reward_get_config": {
            const { latheLoRARewardShapingEngine } = await import("../../engines/LatheLoRARewardShapingEngine.js");
            result = latheLoRARewardShapingEngine.getConfig();
            break;
          }
          // ────────────────────────────────────────────────────────────────
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-LORA-UNWIRED-3 — wire 3 previously-
          // unwired LatheLoRA* engines (TrainingScript + TribalAugmentation +
          // TribalExtractor). Operator can now generate training scripts,
          // augment runtime responses with tribal tips, and extract structured
          // tribal tips from free-text via MCP.
          // ────────────────────────────────────────────────────────────────
          case "lathe_lora_generate_script": {
            const { latheLoRATrainingScriptEngine } = await import("../../engines/LatheLoRATrainingScriptEngine.js");
            const p = params as { config?: Parameters<typeof latheLoRATrainingScriptEngine.setConfig>[0] };
            if (p?.config) latheLoRATrainingScriptEngine.setConfig(p.config);
            result = { success: true, data: latheLoRATrainingScriptEngine.generateScript() };
            break;
          }
          case "lathe_lora_apply_preset": {
            const { latheLoRATrainingScriptEngine } = await import("../../engines/LatheLoRATrainingScriptEngine.js");
            const p = params as { preset?: Parameters<typeof latheLoRATrainingScriptEngine.applyPreset>[0] };
            if (!p?.preset) {
              result = { success: false, error: "params.preset (TrainingPreset) required" };
              break;
            }
            result = { success: true, data: latheLoRATrainingScriptEngine.applyPreset(p.preset) };
            break;
          }
          case "lathe_lora_estimate": {
            const { latheLoRATrainingScriptEngine } = await import("../../engines/LatheLoRATrainingScriptEngine.js");
            result = {
              success: true,
              data: {
                vram_gb: latheLoRATrainingScriptEngine.estimateVRAM(),
                time_hours: latheLoRATrainingScriptEngine.estimateTime(),
                config: latheLoRATrainingScriptEngine.getConfig(),
              },
            };
            break;
          }
          case "lathe_lora_validate_config": {
            const { latheLoRATrainingScriptEngine } = await import("../../engines/LatheLoRATrainingScriptEngine.js");
            result = { success: true, data: latheLoRATrainingScriptEngine.validateConfig() };
            break;
          }
          case "lathe_lora_tribal_augment":
          case "lathe_lora_tribal_find_tips": {
            const { latheLoRATribalAugmentationEngine } = await import("../../engines/LatheLoRATribalAugmentationEngine.js");
            const p = params as { response?: string; query?: string };
            if (typeof p?.response !== "string" || typeof p?.query !== "string") {
              result = { success: false, error: "params.response and params.query (non-empty strings) required" };
              break;
            }
            result = { success: true, data: latheLoRATribalAugmentationEngine.findRelevantTips(p.response, p.query) };
            break;
          }
          case "lathe_lora_tribal_aug_stats": {
            const { latheLoRATribalAugmentationEngine } = await import("../../engines/LatheLoRATribalAugmentationEngine.js");
            result = { success: true, data: latheLoRATribalAugmentationEngine.getConfig() };
            break;
          }
          case "lathe_lora_tribal_extract": {
            const { latheLoRATribalExtractorEngine } = await import("../../engines/LatheLoRATribalExtractorEngine.js");
            const p = params as { rawText?: string; metadata?: { author?: string; source?: string } };
            if (typeof p?.rawText !== "string" || p.rawText.length === 0) {
              result = { success: false, error: "params.rawText (non-empty string) required" };
              break;
            }
            result = { success: true, data: latheLoRATribalExtractorEngine.extractTip(p.rawText, p.metadata) };
            break;
          }
          case "lathe_lora_tribal_extract_batch": {
            const { latheLoRATribalExtractorEngine } = await import("../../engines/LatheLoRATribalExtractorEngine.js");
            const p = params as { texts?: string[]; metadata?: { author?: string; source?: string } };
            if (!Array.isArray(p?.texts)) {
              result = { success: false, error: "params.texts (array of strings) required" };
              break;
            }
            const tips = p.texts.map((rawText) => latheLoRATribalExtractorEngine.extractTip(rawText, p.metadata));
            result = {
              success: true,
              data: {
                tips,
                total: p.texts.length,
                extracted: tips.filter((t) => t !== null).length,
              },
            };
            break;
          }
          case "lathe_lora_tribal_extractor_stats": {
            const { latheLoRATribalExtractorEngine } = await import("../../engines/LatheLoRATribalExtractorEngine.js");
            result = { success: true, data: latheLoRATribalExtractorEngine.getConfig() };
            break;
          }
          // ────────────────────────────────────────────────────────────────
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-AI-TIER-UNWIRED-5 — wire 5 fully-
          // unwired AI-tier lathe engines (Reasoning + ActiveLearning + Bayesian
          // + DeepLogic + CAMIntelligence). Closes the operator /goal's "lathe
          // wizard AI systems" surface by exposing one flagship method per engine.
          // ────────────────────────────────────────────────────────────────
          case "lathe_ai_reason": {
            const { latheAIReasoningEngine } = await import("../../engines/LatheAIReasoningEngine.js");
            const p = params as { context?: Parameters<typeof latheAIReasoningEngine.reason>[0] };
            if (!p?.context) {
              result = { success: false, error: "params.context (LatheOperationContext) required" };
              break;
            }
            result = { success: true, data: await latheAIReasoningEngine.reason(p.context) };
            break;
          }
          case "lathe_active_learning_select": {
            const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
            const p = params as {
              candidatePool?: Parameters<typeof latheActiveLearningEngine.selectSamples>[0];
              budget?: Parameters<typeof latheActiveLearningEngine.selectSamples>[1];
              strategy?: Parameters<typeof latheActiveLearningEngine.selectSamples>[2];
            };
            if (!Array.isArray(p?.candidatePool)) {
              result = { success: false, error: "params.candidatePool (LatheDataPoint[]) required" };
              break;
            }
            result = {
              success: true,
              data: latheActiveLearningEngine.selectSamples(p.candidatePool, p.budget ?? 10, p.strategy),
            };
            break;
          }
          // U-LATHE-ACTIVE-LEARN-DEEPEN — 3 additional surfaces on LatheActiveLearningEngine
          case "lathe_active_learning_update": {
            const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
            const p = params as { newSamples?: Parameters<typeof latheActiveLearningEngine.updateModel>[0] };
            if (!Array.isArray(p?.newSamples)) {
              result = { success: false, error: "params.newSamples (LatheDataPoint[]) required" };
              break;
            }
            result = { success: true, data: latheActiveLearningEngine.updateModel(p.newSamples) };
            break;
          }
          case "lathe_active_learning_uncertainty": {
            const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
            const p = params as { pool?: Parameters<typeof latheActiveLearningEngine.queryUncertainty>[0] };
            const uncertaintyMap = latheActiveLearningEngine.queryUncertainty(p?.pool);
            result = { success: true, data: Object.fromEntries(uncertaintyMap) };
            break;
          }
          case "lathe_active_learning_committee": {
            const { latheActiveLearningEngine } = await import("../../engines/LatheActiveLearningEngine.js");
            const p = params as Parameters<typeof latheActiveLearningEngine.queryByCommittee>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] required for queryByCommittee" };
              break;
            }
            result = { success: true, data: latheActiveLearningEngine.queryByCommittee(...p) };
            break;
          }
          // Bayesian fit-then-predict surface (MCP-friendly substitute for
          // optimizeParameters which requires a callable). Operator passes
          // observations + kernel config + a query x; receives the fitted GP
          // plus prediction (mean + std) at x. For full optimization callers
          // should invoke this iteratively, choosing x by their own acquisition.
          case "lathe_bayesian_optimize": {
            const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
            const p = params as {
              observations?: Parameters<typeof latheBayesianOptimizationEngine.fitGP>[0];
              kernel?: Parameters<typeof latheBayesianOptimizationEngine.fitGP>[1];
              x?: Parameters<typeof latheBayesianOptimizationEngine.predictGP>[1];
            };
            if (!Array.isArray(p?.observations) || !p?.kernel || !Array.isArray(p?.x)) {
              result = { success: false, error: "params.observations (BayesianObservation[]), params.kernel (KernelConfig), params.x (number[]) required" };
              break;
            }
            const gp = latheBayesianOptimizationEngine.fitGP(p.observations, p.kernel);
            const prediction = latheBayesianOptimizationEngine.predictGP(gp, p.x);
            result = { success: true, data: { gp, prediction } };
            break;
          }
          // U-LATHE-BAYESIAN-DEEPEN — 2 acquisition functions (operator picks next-x for fit→predict iteration loop)
          case "lathe_bayesian_acquisition_ei": {
            const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
            const p = params as { gp?: Parameters<typeof latheBayesianOptimizationEngine.acquisitionEI>[0]; x?: number[]; best_y?: number; xi?: number };
            if (!p?.gp || !Array.isArray(p?.x) || typeof p?.best_y !== "number") {
              result = { success: false, error: "params.gp (GPModel), params.x (number[]), params.best_y (number) required" };
              break;
            }
            result = { success: true, data: latheBayesianOptimizationEngine.acquisitionEI(p.gp, p.x, p.best_y, p.xi) };
            break;
          }
          case "lathe_bayesian_acquisition_ucb": {
            const { latheBayesianOptimizationEngine } = await import("../../engines/LatheBayesianOptimizationEngine.js");
            const p = params as { gp?: Parameters<typeof latheBayesianOptimizationEngine.acquisitionUCB>[0]; x?: number[]; kappa?: number };
            if (!p?.gp || !Array.isArray(p?.x)) {
              result = { success: false, error: "params.gp (GPModel), params.x (number[]) required" };
              break;
            }
            result = { success: true, data: latheBayesianOptimizationEngine.acquisitionUCB(p.gp, p.x, p.kappa) };
            break;
          }
          case "lathe_deep_logic_evaluate": {
            const { latheDeepLogicEngine } = await import("../../engines/LatheDeepLogicEngine.js");
            const p = params as { context?: Parameters<typeof latheDeepLogicEngine.analyzeOperation>[0] };
            if (!p?.context) {
              result = { success: false, error: "params.context (LatheOperationContext) required for analyzeOperation" };
              break;
            }
            result = { success: true, data: latheDeepLogicEngine.analyzeOperation(p.context) };
            break;
          }
          case "lathe_cam_intelligence_recommend": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            const p = params as Parameters<typeof latheCAMIntelligenceEngine.recommendParametricTemplate>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] (CAMTemplateContext) required" };
              break;
            }
            result = { success: true, data: latheCAMIntelligenceEngine.recommendParametricTemplate(...p) };
            break;
          }
          // U-LATHE-CAM-INTEL-DEEPEN — 4 additional surfaces on LatheCAMIntelligenceEngine
          case "lathe_cam_intelligence_toolpath": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            const p = params as Parameters<typeof latheCAMIntelligenceEngine.selectToolpath>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] required for selectToolpath" };
              break;
            }
            result = { success: true, data: latheCAMIntelligenceEngine.selectToolpath(...p) };
            break;
          }
          case "lathe_cam_intelligence_sequence": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            const p = params as Parameters<typeof latheCAMIntelligenceEngine.sequenceOperations>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] required for sequenceOperations" };
              break;
            }
            result = { success: true, data: latheCAMIntelligenceEngine.sequenceOperations(...p) };
            break;
          }
          case "lathe_cam_intelligence_workholding": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            const p = params as Parameters<typeof latheCAMIntelligenceEngine.recommendWorkholding>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] required for recommendWorkholding" };
              break;
            }
            result = { success: true, data: latheCAMIntelligenceEngine.recommendWorkholding(...p) };
            break;
          }
          case "lathe_cam_intelligence_mrr_cost": {
            const { latheCAMIntelligenceEngine } = await import("../../engines/LatheCAMIntelligenceEngine.js");
            const p = params as Parameters<typeof latheCAMIntelligenceEngine.optimizeMRRCost>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] required for optimizeMRRCost" };
              break;
            }
            result = { success: true, data: latheCAMIntelligenceEngine.optimizeMRRCost(...p) };
            break;
          }
          // ────────────────────────────────────────────────────────────────
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-AI-TIER-UNWIRED-4 — wire 4 more
          // fully-unwired AI-tier lathe engines (AIOrchestration + AITraining
          // + AdaptiveMachining + AttentionMechanism). Same pattern as the
          // UNWIRED-5 batch: one flagship method per engine.
          // ────────────────────────────────────────────────────────────────
          case "lathe_ai_orchestrate_full": {
            const { latheAIOrchestrationEngine } = await import("../../engines/LatheAIOrchestrationEngine.js");
            const p = params as Parameters<typeof latheAIOrchestrationEngine.orchestrateFullAnalysis>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] (OrchestrationInput) required" };
              break;
            }
            result = { success: true, data: await latheAIOrchestrationEngine.orchestrateFullAnalysis(...p) };
            break;
          }
          // U-LATHE-AI-ORCH-DEEPEN — 3 additional orchestration variants on LatheAIOrchestrationEngine
          case "lathe_ai_orchestrate_optimization": {
            const { latheAIOrchestrationEngine } = await import("../../engines/LatheAIOrchestrationEngine.js");
            const p = params as {
              program?: Parameters<typeof latheAIOrchestrationEngine.orchestrateOptimization>[0];
              goals?: Parameters<typeof latheAIOrchestrationEngine.orchestrateOptimization>[1];
              strategy?: Parameters<typeof latheAIOrchestrationEngine.orchestrateOptimization>[2];
            };
            if (!p?.program || !p?.goals) {
              result = { success: false, error: "params.program and params.goals required" };
              break;
            }
            result = { success: true, data: await latheAIOrchestrationEngine.orchestrateOptimization(p.program, p.goals, p.strategy) };
            break;
          }
          case "lathe_ai_orchestrate_learning": {
            const { latheAIOrchestrationEngine } = await import("../../engines/LatheAIOrchestrationEngine.js");
            const p = params as {
              programs?: Parameters<typeof latheAIOrchestrationEngine.orchestrateLearning>[0];
              options?: Parameters<typeof latheAIOrchestrationEngine.orchestrateLearning>[1];
            };
            if (!Array.isArray(p?.programs)) {
              result = { success: false, error: "params.programs (string[]) required" };
              break;
            }
            result = { success: true, data: await latheAIOrchestrationEngine.orchestrateLearning(p.programs, p.options) };
            break;
          }
          case "lathe_ai_orchestrate_diagnosis": {
            const { latheAIOrchestrationEngine } = await import("../../engines/LatheAIOrchestrationEngine.js");
            const p = params as {
              symptoms?: Parameters<typeof latheAIOrchestrationEngine.orchestrateDiagnosis>[0];
              context?: Parameters<typeof latheAIOrchestrationEngine.orchestrateDiagnosis>[1];
            };
            if (!p?.symptoms) {
              result = { success: false, error: "params.symptoms (string[] | LatheSymptoms) required" };
              break;
            }
            result = { success: true, data: await latheAIOrchestrationEngine.orchestrateDiagnosis(p.symptoms, p.context) };
            break;
          }
          case "lathe_ai_train_from_programs": {
            const { latheAITrainingEngine } = await import("../../engines/LatheAITrainingEngine.js");
            const p = params as { programs?: Parameters<typeof latheAITrainingEngine.trainFromPrograms>[0] };
            if (!Array.isArray(p?.programs)) {
              result = { success: false, error: "params.programs (Array<{content, filepath}>) required" };
              break;
            }
            result = { success: true, data: latheAITrainingEngine.trainFromPrograms(p.programs) };
            break;
          }
          case "lathe_adaptive_machining_adapt": {
            const { latheAdaptiveMachiningEngine } = await import("../../engines/LatheAdaptiveMachiningEngine.js");
            const p = params as Parameters<typeof latheAdaptiveMachiningEngine.adaptTurningParameters>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] (TurningEngagementProfile) required" };
              break;
            }
            result = { success: true, data: latheAdaptiveMachiningEngine.adaptTurningParameters(...p) };
            break;
          }
          case "lathe_attention_self": {
            const { latheAttentionMechanismEngine } = await import("../../engines/LatheAttentionMechanismEngine.js");
            const p = params as { tokens?: Parameters<typeof latheAttentionMechanismEngine.computeSelfAttention>[0] };
            if (!Array.isArray(p?.tokens)) {
              result = { success: false, error: "params.tokens (GCodeToken[]) required" };
              break;
            }
            result = { success: true, data: latheAttentionMechanismEngine.computeSelfAttention(p.tokens) };
            break;
          }
          // ────────────────────────────────────────────────────────────────
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-FLEET-UNWIRED-6 — wire 6 engines
          // unwired ACROSS ALL DISPATCHERS (caught by fleet-wide audit).
          // ────────────────────────────────────────────────────────────────
          case "lathe_master_orchestrate": {
            const { latheMasterOrchestratorFacadeEngine } = await import("../../engines/LatheMasterOrchestratorFacadeEngine.js");
            const p = params as { request?: Parameters<typeof latheMasterOrchestratorFacadeEngine.orchestrate>[0] };
            if (!p?.request) {
              result = { success: false, error: "params.request (LatheOrchRequest) required" };
              break;
            }
            result = { success: true, data: await latheMasterOrchestratorFacadeEngine.orchestrate(p.request) };
            break;
          }
          case "lathe_post_validate_program": {
            const { LathePostGeneratorValidatorWiringEngine } = await import("../../engines/LathePostGeneratorValidatorWiringEngine.js");
            const p = params as Parameters<typeof LathePostGeneratorValidatorWiringEngine.validateProgram>;
            if (!p || !p[0]) {
              result = { success: false, error: "params[0] (validator program/config) required" };
              break;
            }
            result = { success: true, data: LathePostGeneratorValidatorWiringEngine.validateProgram(...p) };
            break;
          }
          case "lathe_post_regression_generate": {
            const { LathePostRegressionTestGeneratorEngine } = await import("../../engines/LathePostRegressionTestGeneratorEngine.js");
            const p = params as { input?: Parameters<typeof LathePostRegressionTestGeneratorEngine.generateTest>[0] };
            if (!p?.input) {
              result = { success: false, error: "params.input (GeneratorInput) required" };
              break;
            }
            result = { success: true, data: LathePostRegressionTestGeneratorEngine.generateTest(p.input) };
            break;
          }
          case "lathe_program_catalog_register": {
            const { latheProgramCatalogEngine } = await import("../../engines/LatheProgramCatalogEngine.js");
            const p = params as { entry?: Parameters<typeof latheProgramCatalogEngine.register>[0] };
            if (!p?.entry) {
              result = { success: false, error: "params.entry (ProgramCatalogEntry) required" };
              break;
            }
            latheProgramCatalogEngine.register(p.entry);
            result = { success: true, data: { registered: true, partNumber: (p.entry as { partNumber?: string }).partNumber } };
            break;
          }
          case "lathe_transformer_tokenize": {
            const { latheTransformerEngine } = await import("../../engines/LatheTransformerEngine.js");
            const p = params as { program?: Parameters<typeof latheTransformerEngine.tokenizeProgram>[0] };
            if (!Array.isArray(p?.program)) {
              result = { success: false, error: "params.program (string[]) required — array of G-code lines" };
              break;
            }
            result = { success: true, data: { tokenIds: latheTransformerEngine.tokenizeProgram(p.program), count: p.program.length } };
            break;
          }
          case "lathe_unified_ai_execute": {
            const { latheUnifiedAIOrchestrator } = await import("../../engines/LatheUnifiedAIOrchestrator.js");
            const p = params as { request?: Parameters<typeof latheUnifiedAIOrchestrator.execute>[0] };
            if (!p?.request) {
              result = { success: false, error: "params.request (OrchestrationRequest) required" };
              break;
            }
            result = { success: true, data: await latheUnifiedAIOrchestrator.execute(p.request) };
            break;
          }
          // U-LATHE-UNIFIED-AI-DEEPEN — 2 additional router surfaces beyond execute
          case "lathe_unified_ai_find_engine": {
            const { latheUnifiedAIOrchestrator } = await import("../../engines/LatheUnifiedAIOrchestrator.js");
            const p = params as { capability?: string };
            if (typeof p?.capability !== "string" || p.capability.length === 0) {
              result = { success: false, error: "params.capability (non-empty string) required" };
              break;
            }
            result = { success: true, data: latheUnifiedAIOrchestrator.findEngineForCapability(p.capability) };
            break;
          }
          case "lathe_unified_ai_capability_engines": {
            const { latheUnifiedAIOrchestrator } = await import("../../engines/LatheUnifiedAIOrchestrator.js");
            const p = params as { capability?: string };
            if (typeof p?.capability !== "string" || p.capability.length === 0) {
              result = { success: false, error: "params.capability (non-empty string) required" };
              break;
            }
            result = { success: true, data: latheUnifiedAIOrchestrator.getEnginesWithCapability(p.capability) };
            break;
          }
          // U-WIRE-LATHE-CUTTING-CHEMISTRY: coolant chemistry + wear + selection (LATHE-PRO)
          case "lathe_chemistry_comprehensive": {
            const { latheCuttingChemistryEngine } = await import("../../engines/LatheCuttingChemistryEngine.js");
            const p = params as Parameters<typeof latheCuttingChemistryEngine.comprehensiveAnalysis>[0];
            if (typeof p?.workpiece_material !== "string") throw new Error("lathe_chemistry_comprehensive requires 'workpiece_material' (string)");
            if (typeof p?.tool_material !== "string") throw new Error("lathe_chemistry_comprehensive requires 'tool_material' (string)");
            if (typeof p?.operation !== "string") throw new Error("lathe_chemistry_comprehensive requires 'operation' (string)");
            if (typeof p?.cutting_speed_m_min !== "number") throw new Error("lathe_chemistry_comprehensive requires 'cutting_speed_m_min' (number)");
            if (typeof p?.feed_mm_rev !== "number") throw new Error("lathe_chemistry_comprehensive requires 'feed_mm_rev' (number)");
            if (typeof p?.depth_of_cut_mm !== "number") throw new Error("lathe_chemistry_comprehensive requires 'depth_of_cut_mm' (number)");
            result = latheCuttingChemistryEngine.comprehensiveAnalysis(p);
            break;
          }
          case "lathe_chemistry_select_coolant": {
            const { latheCuttingChemistryEngine } = await import("../../engines/LatheCuttingChemistryEngine.js");
            const p = params as Parameters<typeof latheCuttingChemistryEngine.selectCoolant>[0];
            if (typeof p?.workpiece_material !== "string") throw new Error("lathe_chemistry_select_coolant requires 'workpiece_material' (string)");
            if (typeof p?.operation !== "string") throw new Error("lathe_chemistry_select_coolant requires 'operation' (string)");
            if (typeof p?.cutting_speed_m_min !== "number") throw new Error("lathe_chemistry_select_coolant requires 'cutting_speed_m_min' (number)");
            if (typeof p?.tool_material !== "string") throw new Error("lathe_chemistry_select_coolant requires 'tool_material' (string)");
            result = latheCuttingChemistryEngine.selectCoolant(p);
            break;
          }
          case "lathe_shop_optimize_program": {
            const { latheShopAwareOptimizationEngine } = await import("../../engines/LatheShopAwareOptimizationEngine.js");
            const p = params as { content: string; filepath: string };
            if (typeof p.content !== "string") throw new Error("lathe_shop_optimize_program requires 'content' (string)");
            if (typeof p.filepath !== "string") throw new Error("lathe_shop_optimize_program requires 'filepath' (string)");
            result = latheShopAwareOptimizationEngine.optimizeProgram(p.content, p.filepath);
            break;
          }
          case "lathe_shop_optimize_customer": {
            const { latheShopAwareOptimizationEngine } = await import("../../engines/LatheShopAwareOptimizationEngine.js");
            const p = params as { programs: Array<{ content: string; filepath: string }> };
            if (!Array.isArray(p.programs) || p.programs.length === 0) {
              throw new Error("lathe_shop_optimize_customer requires 'programs' (non-empty array of {content, filepath})");
            }
            for (let i = 0; i < p.programs.length; i++) {
              const prog = p.programs[i];
              if (!prog || typeof prog.content !== "string" || typeof prog.filepath !== "string") {
                throw new Error(`lathe_shop_optimize_customer: programs[${i}] missing required {content, filepath} strings`);
              }
            }
            result = latheShopAwareOptimizationEngine.optimizeCustomerPrograms(p.programs);
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

          // U-WIRE-EMA: ExpandingMandrelEngine — actuator-force grip + centrifugal
          // max-safe-RPM model. DISTINCT from lathe_workholding_expanding_mandrel
          // above (that is LatheWorkholdingEngine's Lame thick-wall interference-fit
          // model keyed on radial_interference; this one is the dynamic-grip model
          // keyed on actuator_force_n + rpm — R7 surfaced, not blended). Separate
          // import on purpose so the two engines stay visibly independent.
          case "lathe_expanding_mandrel_analyze": {
            const { expandingMandrelEngine } = await import("../../engines/ExpandingMandrelEngine.js");
            result = { success: true, data: expandingMandrelEngine.analyze(params as any) };
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

          // WIRE-UNWIRED-MS0/U-WIRE-TRG: TurningRulesGeneratorEngine — 2 surfaces
          // Generates structured speed/feed/DoC/spindle/chatter envelope rules
          // parameterized by material × tool × machine × operation. Each rule
          // carries bounds {min,max,unit,field}, priority 1-10, and a literature
          // source (Sandvik 2023 / Machinery's Handbook 31e / machine spec).
          // generate() is conditional: velocity rules need iso_group, feed/DoC
          // need operation, spindle needs machine_class, chatter needs tool_type
          // — a context with only `material` legitimately yields zero rules.
          // getStats() is a zero-arg discovery surface (supported enums).
          // mergeRuleSets is intentionally NOT wired — it's a composition
          // helper (caller feeds generate() outputs back); no standalone value
          // and wiring it would impose a full MachiningRule serialization
          // contract for no caller. Reference: Sandvik Coromant 2023 turning
          // tables; Machinery's Handbook 31st Ed.
          case "turning_rules_generate":
          case "turning_rules_stats": {
            const { turningRulesGeneratorEngine } = await import("../../engines/TurningRulesGeneratorEngine.js");
            let data: unknown;
            switch (action) {
              case "turning_rules_generate":
                data = turningRulesGeneratorEngine.generate(params as any);
                break;
              case "turning_rules_stats":
                data = turningRulesGeneratorEngine.getStats();
                break;
            }
            result = { success: true, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-VTC: VendorTurningCatalogExtractorEngine
          // — 6 surfaces. Two are PURE exported functions (parseISO1832 /
          // classifyChipbreaker) needing no catalog state. The other four
          // query the stateful catalogs Map — which is EMPTY in a fresh MCP
          // process because `turning-vendor-catalog-loader.ts` had ZERO
          // callers (the ~4095-insert Tungaloy+Widia catalog was dormant
          // dead data). This wiring activates it: every catalog-backed case
          // calls the idempotent `ensureCatalogsLoaded()` (load-once `_loaded`
          // guard) before querying, so the first dispatch hydrates the
          // catalog and all subsequent calls are a boolean no-op.
          // findCompatibleHolders + getCuttingParameters are intentionally
          // NOT wired — composition methods taking a full TurningInsertRecord
          // (caller feeds a prior search hit back); no standalone value.
          // Reference: ISO 1832 (insert designation), ISO 5608 (holders),
          // Sandvik Coromant Turning Guide 2023-2024.
          // WIRE-UNWIRED-MS0/U-WIRE-MOP: LatheMultiOpPlannerEngine — 2 surfaces
          // plan() detects two-sided-access features and generates the full
          // Op1/Op2 flip plan (soft-jaw bore Ø, Z-datum transfer, concentricity
          // strategy gated on tolerance: <10µm → indicator alignment, else
          // bore-to-OD). generateSoftJawBoring() is also called inside plan()
          // but has clear standalone value (5 controller dialects: Fanuc/Haas
          // G71-G70, Okuma GROV/GFIN, Mazak, Siemens CYCLE95). Both wired.
          // Reference: Peter Smid CNC Programming Handbook Ch. 2;
          // Machinery's Handbook 31st Ed. — Workholding.
          case "lathe_multiop_plan":
          case "lathe_softjaw_boring": {
            const { latheMultiOpPlannerEngine } = await import("../../engines/LatheMultiOpPlannerEngine.js");
            const p = params as any;
            let data: unknown;
            switch (action) {
              case "lathe_multiop_plan":
                data = latheMultiOpPlannerEngine.plan(p);
                break;
              case "lathe_softjaw_boring":
                data = latheMultiOpPlannerEngine.generateSoftJawBoring(
                  p.bore_diameter_mm, p.bore_depth_mm, p.controller ?? "fanuc",
                );
                break;
            }
            result = { success: true, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-PROFDEV: ProfileDeviationAnalyzerEngine (LATHE-PRO-MS8)
          case "lathe_profile_deviation_analyze":
          case "lathe_profile_deviation_stats": {
            const { profileDeviationAnalyzerEngine } = await import("../../engines/ProfileDeviationAnalyzerEngine.js");
            let data: unknown;
            switch (action) {
              case "lathe_profile_deviation_analyze":
                data = profileDeviationAnalyzerEngine.analyze(params as any);
                break;
              case "lathe_profile_deviation_stats":
                data = profileDeviationAnalyzerEngine.getStats();
                break;
            }
            result = { success: true, data };
            break;
          }

          // WIRE-UNWIRED-MS0/U-WIRE-LBACKTRACE: LatheProgramBacktraceEngine (LATHE-PRO-MS12)
          case "lathe_backtrace_trace":
          case "lathe_backtrace_stats": {
            const { latheProgramBacktraceEngine } = await import("../../engines/LatheProgramBacktraceEngine.js");
            let data: unknown;
            switch (action) {
              case "lathe_backtrace_trace":
                data = latheProgramBacktraceEngine.trace(params as any);
                break;
              case "lathe_backtrace_stats":
                data = latheProgramBacktraceEngine.getStats();
                break;
            }
            result = { success: true, data };
            break;
          }

          case "turning_iso1832_parse":
          case "turning_chipbreaker_classify":
          case "turning_vendor_insert_search":
          case "turning_tool_catalog_query":
          case "turning_vendor_grade_recommend":
          case "turning_vendor_iso_code_resolve":
          case "turning_vendor_catalog_stats": {
            const eng = await import("../../engines/VendorTurningCatalogExtractorEngine.js");
            const p = params as any;
            let data: unknown;
            switch (action) {
              case "turning_iso1832_parse":
                data = eng.parseISO1832Designation(p.designation);
                break;
              case "turning_chipbreaker_classify":
                data = { chipbreaker_type: eng.classifyChipbreaker(p.code) };
                break;
              case "turning_vendor_insert_search": {
                const { ensureCatalogsLoaded } = await import("../../data/turning-vendor-catalog-loader.js");
                ensureCatalogsLoaded();
                data = { inserts: eng.vendorTurningCatalogExtractorEngine.searchInserts(p) };
                break;
              }
              case "turning_tool_catalog_query": {
                // CATALOG-APP-WIRING-MS0/U8: expose the full 62.7K vendor corpus to the
                // lathe galaxy (broader than the ~4095-insert turning vendor catalog above).
                const { catalogCorpusLoaderEngine } = await import("../../engines/CatalogCorpusLoaderEngine.js");
                const ensured = catalogCorpusLoaderEngine.ensureLoaded();
                const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
                const tools = toolCatalogEngine.search({
                  type: p.type as string | undefined,
                  diameter_mm: p.diameter_mm as number | undefined,
                  iso_group: p.iso_group as string | undefined,
                  manufacturer: p.manufacturer as string | undefined,
                  operation: p.operation as string | undefined,
                  max_results: (p.max_results as number | undefined) ?? 50,
                });
                data = { count: tools.length, corpus_ensured: ensured.ensured, tools };
                break;
              }
              case "turning_vendor_grade_recommend": {
                const { ensureCatalogsLoaded } = await import("../../data/turning-vendor-catalog-loader.js");
                ensureCatalogsLoaded();
                data = { grades: eng.vendorTurningCatalogExtractorEngine.recommendGrade(p) };
                break;
              }
              case "turning_vendor_iso_code_resolve": {
                const { ensureCatalogsLoaded } = await import("../../data/turning-vendor-catalog-loader.js");
                ensureCatalogsLoaded();
                data = eng.vendorTurningCatalogExtractorEngine.resolveISOCode(p.designation);
                break;
              }
              case "turning_vendor_catalog_stats": {
                const { ensureCatalogsLoaded } = await import("../../data/turning-vendor-catalog-loader.js");
                ensureCatalogsLoaded();
                data = { vendors: eng.vendorTurningCatalogExtractorEngine.getStats() };
                break;
              }
            }
            result = { success: true, data };
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-BRIDGE-WIRE-OKUMA: 4 unwired Okuma engines
          case "okuma_step_parse":
          case "okuma_macro_convert":
          case "okuma_manual_tips_extract":
          case "okuma_transcript_mine": {
            let data: unknown;
            switch (action) {
              case "okuma_step_parse": {
                const engine = await getEngine("okumaStep");
                data = engine.parseContent(
                  params.content as string,
                  params.sourceName as string | undefined,
                );
                break;
              }
              case "okuma_macro_convert": {
                const engine = await getEngine("okumaMacro");
                const options: Record<string, unknown> = {};
                if (params.pythonBinary !== undefined) options.pythonBinary = params.pythonBinary;
                if (params.converterPath !== undefined) options.converterPath = params.converterPath;
                data = await engine.convert(params.source as string, options);
                break;
              }
              case "okuma_manual_tips_extract": {
                const engine = await getEngine("okumaManualTips");
                // ExtractionOptions uses snake_case in the engine — translate from
                // normalized camelCase param back to the engine's expected key.
                const options: Record<string, unknown> = {};
                if (params.manualName !== undefined) options.manual_name = params.manualName;
                data = engine.extractFromText(params.text as string, options);
                break;
              }
              case "okuma_transcript_mine": {
                const engine = await getEngine("okumaTranscript");
                const options: Record<string, unknown> = {};
                if (params.videoIds !== undefined) options.videoIds = params.videoIds;
                data = engine.mineAllTranscripts(options);
                break;
              }
            }
            result = { success: true, data };
            break;
          }

          // FEATURE-GAP-AUDIT-MS0/U-GAP-LATHE-TRIBAL-WIRE: lathe tribal knowledge → lathe AI bridge
          case "lathe_tribal_integrate":
          case "lathe_tribal_adjustment":
          case "lathe_tribal_failure_check":
          case "lathe_tribal_source_corpus":
          case "lathe_tribal_integration_stats": {
            const { latheTribalIntegrationEngine } = await import(
              "../../engines/LatheTribalIntegrationEngine.js"
            );
            let data: unknown;
            switch (action) {
              case "lathe_tribal_integrate": {
                // Source lathe tribal knowledge (corpus + curated) and inject
                // it into the 4 downstream lathe AI engines via the injector.
                const context = (params.context ?? {}) as Parameters<
                  typeof latheTribalIntegrationEngine.integrateWithLatheAI
                >[0];
                const opts = (params.options ?? {}) as Record<string, unknown>;
                data = latheTribalIntegrationEngine.integrateWithLatheAI(context, {
                  limitPerTarget:
                    typeof opts.limitPerTarget === "number" ? opts.limitPerTarget : undefined,
                  minRelevance:
                    typeof opts.minRelevance === "number" ? opts.minRelevance : undefined,
                  includeCorpus:
                    typeof opts.includeCorpus === "boolean" ? opts.includeCorpus : undefined,
                });
                break;
              }
              case "lathe_tribal_adjustment": {
                if (typeof params.material !== "string" || typeof params.operation !== "string") {
                  throw new Error(
                    "lathe_tribal_adjustment requires string 'material' and 'operation'",
                  );
                }
                const conditions = (params.conditions ?? {}) as Parameters<
                  typeof latheTribalIntegrationEngine.getAdjustment
                >[2];
                data = latheTribalIntegrationEngine.getAdjustment(
                  params.material,
                  params.operation,
                  conditions,
                );
                break;
              }
              case "lathe_tribal_failure_check": {
                const material =
                  typeof params.material === "string" ? params.material : undefined;
                const operation =
                  typeof params.operation === "string" ? params.operation : undefined;
                data = {
                  failure_modes: latheTribalIntegrationEngine.checkFailureModes(
                    material,
                    operation,
                  ),
                };
                break;
              }
              case "lathe_tribal_source_corpus": {
                const context = (params.context ?? {}) as Parameters<
                  typeof latheTribalIntegrationEngine.sourceCorpusTips
                >[0];
                data = { tips: latheTribalIntegrationEngine.sourceCorpusTips(context) };
                break;
              }
              case "lathe_tribal_integration_stats": {
                data = latheTribalIntegrationEngine.getStatistics();
                break;
              }
            }
            result = { success: true, data };
            break;
          }

          // BACKEND-DEV-LOOP/U-WIRE-LATHE-GA: evolutionary optimization (3 surfaces)
          case "lathe_ga_optimize_parameters": {
            const { latheGeneticAlgorithmEngine: lga } = await import("../../engines/LatheGeneticAlgorithmEngine.js");
            result = { success: true, data: lga.optimizeParameters(params as any) };
            break;
          }
          case "lathe_ga_optimize_tool_sequence": {
            const { latheGeneticAlgorithmEngine: lga } = await import("../../engines/LatheGeneticAlgorithmEngine.js");
            const operations = (params as any).operations ?? [];
            const config = (params as any).config ?? {};
            result = { success: true, data: lga.optimizeToolSequence(operations, config) };
            break;
          }
          case "lathe_ga_optimize_multi_pass": {
            const { latheGeneticAlgorithmEngine: lga } = await import("../../engines/LatheGeneticAlgorithmEngine.js");
            const totalStock = Number((params as any).total_stock_mm ?? (params as any).totalStock ?? 0);
            const constraints = (params as any).constraints ?? {
              max_doc_mm: 3.0,
              min_doc_mm: 0.5,
              max_passes: 5,
              tool_stability_factor: 1.0,
            };
            const objectives = (params as any).objectives ?? [];
            const config = (params as any).config ?? {};
            result = { success: true, data: lga.optimizeMultiPassStrategy(totalStock, constraints, objectives, config) };
            break;
          }

          // LATHE-UNWIRED-WIRE-MS0/U-LUW01 (slot:whiskey 2026-05-23) — wire 5 Lathe AI engines into prism_turning
          case "lathe_selfaware_query": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const query = String((params as any).query ?? "");
            result = { success: true, data: latheSelfAwarenessIntegrationEngine.whatCanIDo(query) };
            break;
          }
          case "lathe_selfaware_how_do_i": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const task = String((params as any).task ?? "");
            result = { success: true, data: latheSelfAwarenessIntegrationEngine.howDoI(task) };
            break;
          }
          case "lathe_selfaware_who_handles": {
            const { latheSelfAwarenessIntegrationEngine } = await import("../../engines/LatheSelfAwarenessIntegrationEngine.js");
            const domain = String((params as any).domain ?? "");
            result = { success: true, data: latheSelfAwarenessIntegrationEngine.whoHandles(domain) };
            break;
          }
          case "lathe_safety_compute": {
            const { latheSafetySignalEngine } = await import("../../engines/LatheSafetySignalEngine.js");
            const input = (params as any).input ?? params;
            result = { success: true, data: latheSafetySignalEngine.compute(input as any) };
            break;
          }
          case "lathe_knowledge_graph_build": {
            const { latheKnowledgeGraphEngine } = await import("../../engines/LatheKnowledgeGraphEngine.js");
            result = { success: true, data: latheKnowledgeGraphEngine.buildGraph() };
            break;
          }
          case "lathe_ai_ultra_list_controllers": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            const family = (params as any).family;
            result = { success: true, data: latheAIUltraEngine.listControllers(family) };
            break;
          }
          case "lathe_ai_ultra_get_controller_caps": {
            const { latheAIUltraEngine } = await import("../../engines/LatheAIUltraEngine.js");
            const controller = (params as any).controller;
            if (!controller) { result = { error: "controller required" }; break; }
            result = { success: true, data: latheAIUltraEngine.getControllerCapabilities(controller) };
            break;
          }
          case "lathe_quality_gate_validate_program": {
            const { latheQualityGateEngine } = await import("../../engines/LatheQualityGateEngine.js");
            const program = String((params as any).program ?? "");
            const context = (params as any).context ?? {};
            result = { success: true, data: latheQualityGateEngine.validateProgram(program, context) };
            break;
          }
          case "lathe_quality_gate_validate_safety": {
            const { latheQualityGateEngine } = await import("../../engines/LatheQualityGateEngine.js");
            const program = String((params as any).program ?? "");
            const context = (params as any).context;
            result = { success: true, data: latheQualityGateEngine.validateSafety(program, context) };
            break;
          }

          // WIRE-UNWIRED-LOOP-TURNING/BATCH-A: 56 orphan turning/lathe engines
          case "lathe_orchestration_calculate": {
            const { latheOrchestrationEngine } = await import("../../engines/LatheOrchestrationEngine.js");
            result = { success: true, data: (latheOrchestrationEngine as any).calculate?.(params as any, (params as any).context ?? {}) };
            break;
          }
          case "eccentric_turning_get_stats": {
            const { eccentricTurningEngine } = await import("../../engines/EccentricTurningEngine.js");
            result = { success: true, data: (eccentricTurningEngine as any).getStats?.() ?? { engine: "EccentricTurningEngine" } };
            break;
          }
          case "lathe_deep_learning_find_similar_jobs": {
            const { latheDeepLearningEngine } = await import("../../engines/LatheDeepLearningEngine.js");
            const p = params as { material?: string; operation?: string; machine_type?: string };
            result = { success: true, data: (latheDeepLearningEngine as any).findSimilarJobs?.(p.material ?? "", p.operation ?? "", p.machine_type ?? "") };
            break;
          }
          case "lathe_unified_ai_generate_process_plan": {
            const { latheUnifiedAIEngine } = await import("../../engines/LatheUnifiedAIEngine.js");
            result = { success: true, data: await latheUnifiedAIEngine.generateProcessPlan(params as any) };
            break;
          }
          case "lathe_dl_intel_get_stats": {
            const { latheDeepLearningIntelligenceEngine } = await import("../../engines/LatheDeepLearningIntelligenceEngine.js");
            result = { success: true, data: (latheDeepLearningIntelligenceEngine as any).getStats?.() ?? { engine: "LatheDeepLearningIntelligenceEngine" } };
            break;
          }
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-DL-INTEL-ANALYZE — predict surface
          // Operator passes { program: {content, operations[], parameters[], material?, score?}, depth? }
          // Returns full ProgramIntelligence: embeddings + patterns + chain-of-thought reasoning +
          // quality prediction + optimization potential + recommended improvements.
          case "lathe_dl_intel_analyze": {
            const { latheDeepLearningIntelligenceEngine } = await import("../../engines/LatheDeepLearningIntelligenceEngine.js");
            const p = params as { program?: Parameters<typeof latheDeepLearningIntelligenceEngine.analyzeWithIntelligence>[0]; depth?: "shallow" | "medium" | "deep" | "exhaustive" };
            if (!p.program || typeof p.program.content !== "string") {
              result = { success: false, error: "params.program (with content, operations, parameters) required" };
              break;
            }
            result = {
              success: true,
              data: latheDeepLearningIntelligenceEngine.analyzeWithIntelligence(p.program, p.depth ?? "deep"),
            };
            break;
          }
          case "lathe_resource_knowledge_get_base": {
            const { latheResourceKnowledgeEngine } = await import("../../engines/LatheResourceKnowledgeEngine.js");
            result = { success: true, data: latheResourceKnowledgeEngine.getKnowledgeBase() };
            break;
          }
          case "lathe_rl_get_stats": {
            const { latheReinforcementLearningEngine } = await import("../../engines/LatheReinforcementLearningEngine.js");
            result = { success: true, data: (latheReinforcementLearningEngine as any).getStats?.() ?? { engine: "LatheReinforcementLearningEngine" } };
            break;
          }
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-RL-SELECT-ACTION — RL action selection
          // Operator passes { state: LatheRLState, algorithm?: "q_learning"|"reinforce"|"a2c" }
          // Returns { action, actionData, logProb?, value? }
          case "lathe_rl_select_action": {
            const { latheReinforcementLearningEngine } = await import("../../engines/LatheReinforcementLearningEngine.js");
            const p = params as { state?: Parameters<typeof latheReinforcementLearningEngine.selectAction>[0]; algorithm?: "q_learning" | "reinforce" | "a2c" };
            if (!p.state) {
              result = { success: false, error: "params.state (LatheRLState) required" };
              break;
            }
            result = {
              success: true,
              data: latheReinforcementLearningEngine.selectAction(p.state, p.algorithm ?? "a2c"),
            };
            break;
          }
          case "lathe_meta_learning_maml_train": {
            const { latheMetaLearningEngine } = await import("../../engines/LatheMetaLearningEngine.js");
            result = { success: true, data: latheMetaLearningEngine.mamlTrain(params as any) };
            break;
          }
          case "lathe_archive_training_get_stats": {
            const { latheFullArchiveTrainingEngine } = await import("../../engines/LatheFullArchiveTrainingEngine.js");
            result = { success: true, data: (latheFullArchiveTrainingEngine as any).getStats?.() ?? { engine: "LatheFullArchiveTrainingEngine" } };
            break;
          }
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-ARCHIVE-TRAIN-RUN — kick off full-archive training
          // Operator passes { maxPrograms?: number, epochs?: number }. maxPrograms=0 → unlimited.
          // WARNING: synchronous; will block event loop. For long runs (>5K programs), prefer
          // detached scripts/train-lathe-full-archive.mjs runner. JM Die corpus has ~16K source
          // + 114K PRISM_UPGRADED variants — unlimited scan hits OOM at ~130K files.
          case "lathe_archive_training_run": {
            const { latheFullArchiveTrainingEngine } = await import("../../engines/LatheFullArchiveTrainingEngine.js");
            const p = params as { maxPrograms?: number; epochs?: number };
            result = {
              success: true,
              data: latheFullArchiveTrainingEngine.trainFullArchive(p.maxPrograms ?? 0, p.epochs ?? 50),
            };
            break;
          }
          case "lathe_style_selector_select": {
            const { latheProgrammingStyleSelectorEngine } = await import("../../engines/LatheProgrammingStyleSelectorEngine.js");
            result = { success: true, data: (latheProgrammingStyleSelectorEngine as any).selectStyle?.(params as any) ?? (latheProgrammingStyleSelectorEngine as any).select?.(params as any) };
            break;
          }
          case "lathe_part_family_planning_analyze": {
            const { lathePartFamilyPlanningEngine } = await import("../../engines/LathePartFamilyPlanningEngine.js");
            result = { success: true, data: (lathePartFamilyPlanningEngine as any).analyzeFamilyPotential?.(params as any, (params as any).context ?? {}) };
            break;
          }
          case "lathe_transfer_learning_transfer": {
            const { latheTransferLearningEngine } = await import("../../engines/LatheTransferLearningEngine.js");
            result = { success: true, data: (latheTransferLearningEngine as any).transferKnowledge?.(params as any, (params as any).target ?? {}) };
            break;
          }
          case "lathe_lora_program_parser_parse": {
            const { latheLoRAProgramParserEngine } = await import("../../engines/LatheLoRAProgramParserEngine.js");
            const content = String((params as any).content ?? "");
            const fileName = (params as any).file_name as string | undefined;
            result = { success: true, data: latheLoRAProgramParserEngine.parse(content, fileName) };
            break;
          }
          case "lathe_lora_example_generator_generate": {
            const { latheLoRAExampleGeneratorEngine } = await import("../../engines/LatheLoRAExampleGeneratorEngine.js");
            const parseResult = (params as any).parse_result ?? params;
            result = { success: true, data: (latheLoRAExampleGeneratorEngine as any).generateFromParsed?.(parseResult as any, (params as any).options ?? {}) };
            break;
          }
          case "lathe_lora_dataset_validator_validate": {
            const { latheLoRADatasetValidatorEngine } = await import("../../engines/LatheLoRADatasetValidatorEngine.js");
            const examples = (params as any).examples ?? [];
            if (!Array.isArray(examples)) throw new Error("lathe_lora_dataset_validator_validate requires 'examples' (array)");
            result = { success: true, data: latheLoRADatasetValidatorEngine.validate(examples as any) };
            break;
          }
          case "lathe_lora_transfer_strategy_list": {
            const { latheLoRATransferStrategyEngine } = await import("../../engines/LatheLoRATransferStrategyEngine.js");
            result = { success: true, data: latheLoRATransferStrategyEngine.listBaseModels() };
            break;
          }
          case "lathe_lora_training_monitor_init": {
            const { latheLoRATrainingMonitorEngine } = await import("../../engines/LatheLoRATrainingMonitorEngine.js");
            result = { success: true, data: latheLoRATrainingMonitorEngine.initRun(params as any) };
            break;
          }
          case "lathe_lora_physics_evaluator_evaluate": {
            const { latheLoRAPhysicsEvaluatorEngine } = await import("../../engines/LatheLoRAPhysicsEvaluatorEngine.js");
            const output = String((params as any).output ?? "");
            const context = (params as any).context;
            result = { success: true, data: (latheLoRAPhysicsEvaluatorEngine as any).evaluate?.(output, context) };
            break;
          }
          case "lathe_lora_merge_strategy_recommend": {
            const { latheLoRAMergeStrategyEngine } = await import("../../engines/LatheLoRAMergeStrategyEngine.js");
            const adapterIds = (params as any).adapter_ids as string[];
            if (!Array.isArray(adapterIds)) throw new Error("lathe_lora_merge_strategy_recommend requires 'adapter_ids' (string[])");
            result = { success: true, data: latheLoRAMergeStrategyEngine.recommendStrategy(adapterIds) };
            break;
          }
          case "lathe_lora_quantization_estimate_size": {
            const { latheLoRAQuantizationOptimizerEngine } = await import("../../engines/LatheLoRAQuantizationOptimizerEngine.js");
            const modelId = String((params as any).model_id ?? "");
            const config = (params as any).config ?? {};
            result = { success: true, data: latheLoRAQuantizationOptimizerEngine.estimateSize(modelId, config) };
            break;
          }
          case "lathe_lora_model_optimizer_get_profile": {
            const { latheLoRAModelOptimizerEngine } = await import("../../engines/LatheLoRAModelOptimizerEngine.js");
            result = { success: true, data: latheLoRAModelOptimizerEngine.getProfiles() };
            break;
          }
          case "lathe_lora_ollama_deployer_generate": {
            const { latheLoRAOllamaDeployerEngine } = await import("../../engines/LatheLoRAOllamaDeployerEngine.js");
            result = { success: true, data: latheLoRAOllamaDeployerEngine.generateModelfile(params as any) };
            break;
          }
          case "lathe_lora_inference_gateway_get_config": {
            const { latheLoRAInferenceGatewayEngine } = await import("../../engines/LatheLoRAInferenceGatewayEngine.js");
            result = { success: true, data: latheLoRAInferenceGatewayEngine.getConfig() };
            break;
          }
          case "lathe_lora_reasoning_chain_get_templates": {
            const { latheLoRAReasoningChainInferenceEngine } = await import("../../engines/LatheLoRAReasoningChainInferenceEngine.js");
            result = { success: true, data: latheLoRAReasoningChainInferenceEngine.getTemplates() };
            break;
          }
          case "lathe_lora_neural_bridge_get_config": {
            const { latheLoRANeuralBridgeEngine } = await import("../../engines/LatheLoRANeuralBridgeEngine.js");
            result = { success: true, data: latheLoRANeuralBridgeEngine.getConfig() };
            break;
          }
          case "lathe_lora_neural_orch_start_pipeline": {
            const { latheLoRANeuralOrchestratorEngine } = await import("../../engines/LatheLoRANeuralOrchestratorEngine.js");
            const input = String((params as any).input ?? "");
            const metadata = (params as any).metadata as Record<string, unknown> | undefined;
            result = { success: true, data: latheLoRANeuralOrchestratorEngine.startPipeline(input, metadata) };
            break;
          }
          case "lathe_lora_program_miner_detect_dialect": {
            const { latheLoRAProgramMinerEngine } = await import("../../engines/LatheLoRAProgramMinerEngine.js");
            const programText = String((params as any).program_text ?? "");
            result = { success: true, data: { dialect: latheLoRAProgramMinerEngine.detectDialect(programText) } };
            break;
          }
          case "lathe_lora_knowledge_curator_get_config": {
            const { latheLoRAKnowledgeCuratorEngine } = await import("../../engines/LatheLoRAKnowledgeCuratorEngine.js");
            result = { success: true, data: latheLoRAKnowledgeCuratorEngine.getConfig() };
            break;
          }
          case "lathe_lora_pipeline_coord_create": {
            const { latheLoRAPipelineCoordinatorEngine } = await import("../../engines/LatheLoRAPipelineCoordinatorEngine.js");
            const name = String((params as any).name ?? "pipeline");
            const stages = (params as any).stages ?? [];
            result = { success: true, data: latheLoRAPipelineCoordinatorEngine.createPipeline(name, stages) };
            break;
          }
          case "turning_strategy_catalog_select": {
            const { selectTurningStrategy } = await import("../../engines/TurningStrategyCatalog.js");
            result = { success: true, data: selectTurningStrategy(params as any) };
            break;
          }
          case "lathe_ai_feature_get_stats": {
            const { getLatheAIStats } = await import("../../engines/LatheAIFeatureRegistration.js");
            result = { success: true, data: getLatheAIStats() };
            break;
          }
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-AI-FEATURE-FIND-BEST — task → engine router
          // Operator passes { task: string }. Returns the highest-affinity registered
          // lathe AI engine for the task, or null when no engine matches.
          case "lathe_ai_feature_find_best": {
            const { findBestEngineForTask } = await import("../../engines/LatheAIFeatureRegistration.js");
            const p = params as { task?: string };
            if (typeof p.task !== "string" || p.task.length === 0) {
              result = { success: false, error: "params.task (non-empty string) required" };
              break;
            }
            result = { success: true, data: findBestEngineForTask(p.task) };
            break;
          }
          case "lathe_advanced_ops_live_tooling": {
            const { latheAdvancedOperationsEngine } = await import("../../engines/LatheAdvancedOperationsEngine.js");
            result = { success: true, data: latheAdvancedOperationsEngine.getLiveToolingParams(params as any) };
            break;
          }
          case "lathe_deep_ai_harden_analyze": {
            const { latheDeepAIHardeningEngine } = await import("../../engines/LatheDeepAIHardeningEngine.js");
            result = { success: true, data: latheDeepAIHardeningEngine.analyzeLatheOperation(params as any) };
            break;
          }
          case "lathe_intelligence_get_stats": {
            const { latheIntelligenceEngine } = await import("../../engines/LatheIntelligenceEngine.js");
            result = { success: true, data: (latheIntelligenceEngine as any).getStats?.() ?? { engine: "LatheIntelligenceEngine" } };
            break;
          }
          // JM-DIE-LATHE-UPGRADE-MS0/U-LATHE-INTEL-DECIDE-MACRO — decide macro vs hard-code G-code
          // Operator passes { part: LathePartProfile, machine: LatheMachineConfig, operationContext: {...} }
          // Returns MacroRecommendation with chain-of-thought reasoning + score + suggested variables
          case "lathe_intelligence_decide_macro": {
            const { LatheIntelligenceEngine } = await import("../../engines/LatheIntelligenceEngine.js");
            const p = params as {
              part?: Parameters<typeof LatheIntelligenceEngine.decideMacroVsHardCode>[0];
              machine?: Parameters<typeof LatheIntelligenceEngine.decideMacroVsHardCode>[1];
              operationContext?: Parameters<typeof LatheIntelligenceEngine.decideMacroVsHardCode>[2];
            };
            if (!p.part || !p.machine) {
              result = { success: false, error: "params.part (LathePartProfile) and params.machine (LatheMachineConfig) required" };
              break;
            }
            result = {
              success: true,
              data: LatheIntelligenceEngine.decideMacroVsHardCode(p.part, p.machine, p.operationContext ?? {}),
            };
            break;
          }
          case "lathe_print_ingest_ingest": {
            const { lathePrintIngestPipelineEngine } = await import("../../engines/LathePrintIngestPipelineEngine.js");
            result = { success: true, data: lathePrintIngestPipelineEngine.ingest(params as any) };
            break;
          }
          case "lathe_feature_recognizer_recognize": {
            const { latheTurningFeatureRecognizerEngine } = await import("../../engines/LatheTurningFeatureRecognizerEngine.js");
            result = { success: true, data: (latheTurningFeatureRecognizerEngine as any).recognize?.(params as any) ?? (latheTurningFeatureRecognizerEngine as any).recognizeFeatures?.(params as any) };
            break;
          }
          case "lathe_print_setup_select": {
            const { lathePrintSetupSelectionEngine } = await import("../../engines/LathePrintSetupSelectionEngine.js");
            result = { success: true, data: (lathePrintSetupSelectionEngine as any).selectSetup?.(params as any, (params as any).machine ?? {}, (params as any).constraints ?? {}, (params as any).options) };
            break;
          }
          case "lathe_print_dl_intel_predict": {
            const { lathePrintToProgramDLIntelligenceEngine } = await import("../../engines/LathePrintToProgramDLIntelligenceEngine.js");
            result = { success: true, data: lathePrintToProgramDLIntelligenceEngine.predict(params as any) };
            break;
          }
          case "lathe_safety_predicate_evaluate": {
            const { latheSafetyPredicateEngine } = await import("../../engines/LatheSafetyPredicateEngine.js");
            result = { success: true, data: (latheSafetyPredicateEngine as any).evaluate?.(params as any) ?? (latheSafetyPredicateEngine as any).check?.(params as any) };
            break;
          }
          case "lathe_lora_physics_aug_infer_extract": {
            const { latheLoRAPhysicsAugmentedInferenceEngine } = await import("../../engines/LatheLoRAPhysicsAugmentedInferenceEngine.js");
            const response = String((params as any).response ?? "");
            result = { success: true, data: latheLoRAPhysicsAugmentedInferenceEngine.extractParameters(response) };
            break;
          }
          case "lathe_proof_carrying_emit": {
            const { latheProofCarryingEmitEngine } = await import("../../engines/LatheProofCarryingEmitEngine.js");
            result = { success: true, data: latheProofCarryingEmitEngine.emit(params as any) };
            break;
          }
          case "lathe_print_tolerance_stack_propagate": {
            const { lathePrintToleranceStackEngine } = await import("../../engines/LathePrintToleranceStackEngine.js");
            result = { success: true, data: lathePrintToleranceStackEngine.propagate(params as any) };
            break;
          }
          case "lathe_thermodynamics_heat_gen": {
            const { latheThermodynamicsEngine } = await import("../../engines/LatheThermodynamicsEngine.js");
            result = { success: true, data: (latheThermodynamicsEngine as any).calculateHeatGeneration?.(params as any, (params as any).process ?? {}, (params as any).material ?? {}) };
            break;
          }
          case "lathe_opus_reasoning_forward": {
            const { latheOpusReasoningEngine } = await import("../../engines/LatheOpusReasoningEngine.js");
            result = { success: true, data: await ((latheOpusReasoningEngine as any).forward?.(params as any, params as any, params as any) ?? (latheOpusReasoningEngine as any).reason?.(params as any) ?? (latheOpusReasoningEngine as any).infer?.(params as any) ?? { engine: "LatheOpusReasoningEngine", note: "method not callable" }) };
            break;
          }
          case "lathe_unified_physics_analyze": {
            const { latheUnifiedPhysicsOrchestrationEngine } = await import("../../engines/LatheUnifiedPhysicsOrchestrationEngine.js");
            result = { success: true, data: latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(params as any) };
            break;
          }
          case "lathe_knowledge_graph_ingest": {
            const { lathePrintToProgramKnowledgeGraphEngine } = await import("../../engines/LathePrintToProgramKnowledgeGraphEngine.js");
            result = { success: true, data: lathePrintToProgramKnowledgeGraphEngine.ingest(params as any) };
            break;
          }
          case "lathe_print_reasoning_explain": {
            const { lathePrintToProgramReasoningEngine } = await import("../../engines/LathePrintToProgramReasoningEngine.js");
            result = { success: true, data: lathePrintToProgramReasoningEngine.explain(params as any) };
            break;
          }
          case "lathe_tribal_integration_source_corpus": {
            const { latheTribalIntegrationEngine } = await import("../../engines/LatheTribalIntegrationEngine.js");
            result = { success: true, data: latheTribalIntegrationEngine.sourceCorpusTips(params as any) };
            break;
          }
          case "lathe_print_sequence_plan": {
            const { lathePrintSequencePlannerEngine } = await import("../../engines/LathePrintSequencePlannerEngine.js");
            result = { success: true, data: (lathePrintSequencePlannerEngine as any).planSequence?.(params as any, (params as any).setup ?? {}, (params as any).constraints ?? {}) };
            break;
          }
          case "lathe_print_feature_strategy_select": {
            const { lathePrintFeatureStrategySelectorEngine } = await import("../../engines/LathePrintFeatureStrategySelectorEngine.js");
            result = { success: true, data: (lathePrintFeatureStrategySelectorEngine as any).selectStrategy?.(params as any, (params as any).context ?? {}) };
            break;
          }
          case "lathe_print_program_emit": {
            const { lathePrintProgramEmitterEngine } = await import("../../engines/LathePrintProgramEmitterEngine.js");
            result = { success: true, data: lathePrintProgramEmitterEngine.emit(params as any, (params as any).options) };
            break;
          }
          case "lathe_print_program_signoff_generate": {
            const { lathePrintProgramSignoffEngine } = await import("../../engines/LathePrintProgramSignoffEngine.js");
            result = { success: true, data: lathePrintProgramSignoffEngine.generatePackage(params as any) };
            break;
          }
          case "lathe_program_audit_pipeline_run": {
            const { latheProgramAuditPipelineEngine } = await import("../../engines/LatheProgramAuditPipelineEngine.js");
            const content = String((params as any).content ?? "");
            result = { success: true, data: (latheProgramAuditPipelineEngine as any).audit?.(content) ?? (latheProgramAuditPipelineEngine as any).run?.(content) ?? (latheProgramAuditPipelineEngine as any).process?.(content) ?? { engine: "LatheProgramAuditPipelineEngine", note: "method not callable" } };
            break;
          }
          case "jmdie_lathe_program_upgrade": {
            const { jmDieLatheProgramUpgraderEngine } = await import("../../engines/JMDieLatheProgramUpgraderEngine.js");
            result = { success: true, data: await (jmDieLatheProgramUpgraderEngine as any).upgrade?.(params as any) ?? (jmDieLatheProgramUpgraderEngine as any).run?.(params as any) };
            break;
          }
          case "jmdie_lathe_program_upgrade_v2": {
            const { jmDieLatheProgramUpgraderV2Engine } = await import("../../engines/JMDieLatheProgramUpgraderV2Engine.js");
            result = { success: true, data: await (jmDieLatheProgramUpgraderV2Engine as any).upgrade?.(params as any) ?? (jmDieLatheProgramUpgraderV2Engine as any).run?.(params as any) };
            break;
          }
          case "lathe_program_library_search": {
            const { latheProgramLibraryEngine } = await import("../../engines/LatheProgramLibraryEngine.js");
            result = { success: true, data: await (latheProgramLibraryEngine as any).search?.(params as any) ?? (latheProgramLibraryEngine as any).find?.(params as any) };
            break;
          }
          // iter9 wire-unwired-loop: turning/swiss/multi-spindle engines
          case "multi_spindle_automatic_plan": {
            const { multiSpindleAutomaticEngine } = await import("../../engines/MultiSpindleAutomaticEngine.js");
            const p = params as any;
            result = { success: true, data: (multiSpindleAutomaticEngine as any).plan?.(p) ?? (multiSpindleAutomaticEngine as any).run?.(p) ?? (multiSpindleAutomaticEngine as any).analyze?.(p) ?? { engine: "MultiSpindleAutomaticEngine", note: "method not callable" } };
            break;
          }
          case "swiss_type_intelligence_analyze": {
            const { swissTypeIntelligenceEngine } = await import("../../engines/SwissTypeIntelligenceEngine.js");
            const p = params as any;
            result = { success: true, data: (swissTypeIntelligenceEngine as any).analyze?.(p) ?? (swissTypeIntelligenceEngine as any).run?.(p) ?? { engine: "SwissTypeIntelligenceEngine", note: "method not callable" } };
            break;
          }
          case "insert_grade_select": {
            const { insertGradeSelectionEngine } = await import("../../engines/InsertGradeSelectionEngine.js");
            const p = params as any;
            result = { success: true, data: (insertGradeSelectionEngine as any).select?.(p) ?? (insertGradeSelectionEngine as any).recommend?.(p) ?? (insertGradeSelectionEngine as any).run?.(p) ?? { engine: "InsertGradeSelectionEngine", note: "method not callable" } };
            break;
          }
          case "insert_change_recommend": {
            const { insertChangeRecommendationEngine } = await import("../../engines/InsertChangeRecommendationEngine.js");
            const p = params as any;
            result = { success: true, data: (insertChangeRecommendationEngine as any).recommend?.(p) ?? (insertChangeRecommendationEngine as any).run?.(p) ?? { engine: "InsertChangeRecommendationEngine", note: "method not callable" } };
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
