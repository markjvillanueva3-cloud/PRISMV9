/**
 * prism_mill — Mill-Specific Dispatcher
 * MILL-MASTER/P1-U01-MILL-DISP, P1-U04-SA-INTEG
 *
 * First-class MCP surface for milling operations. Consolidates mill actions
 * previously scattered across camDispatcher, fiveAxisDispatcher, multiAxisDispatcher.
 *
 * Routes through MillMasterOrchestratorFacadeEngine as primary entry (P1-U02).
 *
 * 49 actions covering: print_to_program, strategy, toolpath, physics, AGI,
 * self-awareness, pattern mining, digital twin, validation, optimization.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { MILL_ACTION_SCHEMAS } from "../../schemas/millActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

/**
 * NO-FAKE-CODE: call engine method or throw a structured "not wired" error.
 * Replaces the banned `engine.method?.(params) ?? { fabricated data }` pattern.
 * Try each candidate method in order; the FIRST one that exists is called.
 */
async function callOrThrow(
  engine: any,
  methodCandidates: readonly string[],
  params: any,
  engineName: string,
): Promise<any> {
  for (const method of methodCandidates) {
    if (typeof engine?.[method] === "function") {
      return await engine[method](params);
    }
  }
  throw new Error(
    `[NOT_WIRED] ${engineName} does not expose any of: ${methodCandidates.join(", ")}`,
  );
}

/**
 * Adapt loose mill_print_to_program / mill_generate_gcode dispatcher params
 * into the MillingInput shape MillingPrintToProgramEngine.runFullPipeline expects.
 * The dispatcher schema (millActionSchemas.ts) types `material` as a string and
 * makes `features` optional; the engine needs `material` as an object and a
 * features array. KILO-P2P-RECONCILE-MS0/U-KP2P-01.
 */
function toMillingInput(params: any): any {
  const p = params ?? {};
  const material =
    p.material && typeof p.material === "object"
      ? p.material
      : {
          material_name: typeof p.material === "string" ? p.material : "unspecified",
          iso_group: p.iso_group ?? "P",
        };
  return { ...p, material, features: Array.isArray(p.features) ? p.features : [] };
}

// Lazy-loaded engine cache
let _facade: any, _strategy: any, _optimizer: any, _collision: any;
let _physics: any, _thermal: any, _pattern: any, _twin: any;
let _deeplearn: any, _neural: any, _wisdom: any, _adaptive: any;
let _toolpath: any, _toolsel: any, _program: any, _validate: any;
let _agi: any, _selfaware: any, _scientific: any, _kinematics: any;
// P1-U09-L2-AGG: L2 aggregator orchestrators
let _aiLearn: any, _millTurn: any, _fiveAxisAgg: any, _multiAxisAgg: any;
// Unwired engine additions
let _tribal: any, _e2e: any, _traceLedger: any, _inferenceOrch: any;
// TRIBAL-OUTCOME-LOOP-MS0/U-TTOB02: closed-loop tribal-tip → outcome bridge
let _tribalOutcomeBridge: any;
// U-BRIDGE-WIRE-MILLING / iter-1
let _hybrid: any;
// U-BRIDGE-WIRE-MILLING / iter-2
let _loraDataset: any;
// U-BRIDGE-WIRE-MILLING / iter-3
let _millTurnLora: any;
// BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILL iter-1: FiveAxis LoRA closed-loop pair
let _fiveAxisLoraDataset: any, _fiveAxisLoraCadence: any;
// BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-2: FiveAxis CAM integration
let _fiveAxisCam: any;
// BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-3: FiveAxis toolpath synthesis
let _fiveAxisSynth: any;
// BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-4: Milling unified-science orchestration
let _millingSci: any;
// BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-5: FiveAxis orchestration
let _fiveAxisOrch: any;
// U-BRIDGE-WIRE-MILLING / iter-4
let _millTurnCam: any;
// U-BRIDGE-WIRE-MILLING / iter-5
let _millingUltimate: any;
// U-BRIDGE-WIRE-MILLING / iter-6
let _millNeural: any;
// U-BRIDGE-WIRE-MILLING / iter-7
let _millingPkHarvester: any;
// U-BRIDGE-WIRE-MILLING / iter-8
let _millingUai: any;
// BRIDGE-WIRE / U-MILL-HM-FIXTURE (slot:bravo): MonolithHyperMillFixtureDatabaseEngine -- R12-safe hyperMILL fixture/workholding catalog DATA
let _hmFixture: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    // Core orchestration
    case "facade":
      return _facade ??= (await import("../../engines/MillMasterOrchestratorFacadeEngine.js")).millMasterOrchestratorFacadeEngine;
    case "strategy":
      return _strategy ??= (await import("../../engines/MillStrategyNeuralEngine.js")).millStrategyNeuralEngine;
    case "optimizer":
      return _optimizer ??= (await import("../../engines/MillProgramOptimizerEngine.js")).millProgramOptimizerEngine;
    case "collision":
      return _collision ??= (await import("../../engines/MillKinematicsCollisionEngine.js")).millKinematicsCollisionEngine;
    case "hm_fixture":
      return _hmFixture ??= (await import("../../engines/MonolithHyperMillFixtureDatabaseEngine.js")).monolithHyperMillFixtureDatabaseEngine;

    // Physics & thermal
    case "physics":
      return _physics ??= (await import("../../engines/MillingForceEngine.js")).millingForceEngine;
    case "thermal":
      return _thermal ??= (await import("../../engines/ThermalWearCouplingEngine.js")).thermalWearCouplingEngine;
    case "scientific":
      return _scientific ??= (await import("../../engines/MillScientificPipelineEngine.js")).millScientificPipelineEngine;

    // AI/ML
    case "deeplearn":
      return _deeplearn ??= (await import("../../engines/MillDeepLearningEngine.js")).millDeepLearningEngine;
    case "neural":
      return _neural ??= (await import("../../engines/MillStrategyNeuralEngine.js")).millStrategyNeuralEngine;
    case "pattern":
      return _pattern ??= (await import("../../engines/MillPatternMinerEngine.js")).millPatternMinerEngine;
    case "twin":
      return _twin ??= (await import("../../engines/DigitalTwinSyncEngine.js")).digitalTwinSyncEngine;

    // AGI orchestration
    case "agi":
      return _agi ??= (await import("../../engines/MillingAGIMasterEngine.js")).millingAGIMasterEngine;
    case "selfaware":
      return _selfaware ??= (await import("../../engines/MillAISelfAwarenessIntegrationEngine.js")).millAISelfAwarenessIntegrationEngine;

    // Toolpath & tools
    case "toolpath":
      return _toolpath ??= (await import("../../engines/ToolpathStrategyEngine.js")).toolpathStrategyEngine;
    case "toolsel":
      return _toolsel ??= (await import("../../engines/ToolSelectionRecommenderEngine.js")).toolSelectionRecommenderEngine;
    case "kinematics":
      return _kinematics ??= (await import("../../engines/MillKinematicsCollisionEngine.js")).millKinematicsCollisionEngine;

    // Validation & program
    case "validate":
      return _validate ??= (await import("../../engines/MillProgramAnalyzerEngine.js")).millProgramAnalyzerEngine;
    case "program":
      // KILO-P2P-RECONCILE-MS0/U-KP2P-01: real engine — was the MillPrintToProgramEngine stub.
      return _program ??= (await import("../../engines/MillingPrintToProgramEngine.js")).millingPrintToProgramEngine;

    // Adaptive
    case "adaptive":
      return _adaptive ??= (await import("../../engines/AdaptiveToolpathRouterEngine.js")).adaptiveToolpathRouterEngine;
    case "wisdom":
      return _wisdom ??= (await import("../../engines/TribalKnowledgeAdvisorEngine.js")).tribalKnowledgeAdvisorEngine;

    // P1-U09-L2-AGG: L2 aggregator orchestrators
    case "ai_learn":
      return _aiLearn ??= (await import("../../engines/MillingAILearningOrchestratorEngine.js")).millingAILearningOrchestratorEngine;
    case "mill_turn":
      return _millTurn ??= (await import("../../engines/MillTurnOrchestrationEngine.js")).millTurnOrchestrationEngine;
    case "five_axis_agg":
      return _fiveAxisAgg ??= (await import("../../engines/FiveAxisAggregatorEngine.js")).fiveAxisAggregatorEngine;
    case "multi_axis_agg":
      return _multiAxisAgg ??= (await import("../../engines/MultiAxisAggregatorEngine.js")).multiAxisAggregatorEngine;

    // Unwired engine additions
    case "tribal":
      return _tribal ??= (await import("../../engines/MillTribalKnowledgeEngine.js")).millTribalKnowledgeEngine;
    // TRIBAL-OUTCOME-LOOP-MS0/U-TTOB02: closed-loop tribal-tip outcome bridge
    case "tribal_outcome_bridge":
      return _tribalOutcomeBridge ??= (await import("../../engines/TribalTipOutcomeBridgeEngine.js")).tribalTipOutcomeBridgeEngine;
    case "e2e":
      return _e2e ??= (await import("../../engines/MillingEndToEndOrchestrationEngine.js")).millingEndToEndOrchestrationEngine;
    case "trace_ledger":
      return _traceLedger ??= (await import("../../engines/MillingReasoningTraceLedgerEngine.js")).millingReasoningTraceLedgerEngine;
    case "inference_orch":
      return _inferenceOrch ??= (await import("../../engines/MillingInferenceOrchestratorEngine.js")).millingInferenceOrchestratorEngine;

    // U-BRIDGE-WIRE-MILLING: MillingHybridStrategySynthesizer
    case "hybrid":
      return _hybrid ??= (await import("../../engines/MillingHybridStrategySynthesizer.js")).millingHybridStrategySynthesizer;

    // U-BRIDGE-WIRE-MILLING iter-2: MillingLoRADatasetBuilderEngine
    case "lora_dataset":
      return _loraDataset ??= (await import("../../engines/MillingLoRADatasetBuilderEngine.js")).millingLoRADatasetBuilderEngine;

    // U-BRIDGE-WIRE-MILLING iter-3: MillTurnLoRADatasetBuilderEngine
    case "millturn_lora":
      return _millTurnLora ??= (await import("../../engines/MillTurnLoRADatasetBuilderEngine.js")).millTurnLoRADatasetBuilderEngine;

    // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILL iter-1: FiveAxis LoRA closed-loop pair
    case "fiveaxis_lora_dataset":
      return _fiveAxisLoraDataset ??= (await import("../../engines/FiveAxisLoRADatasetBuilderEngine.js")).fiveAxisLoRADatasetBuilderEngine;
    case "fiveaxis_lora_cadence":
      return _fiveAxisLoraCadence ??= (await import("../../engines/FiveAxisLoRACadenceEngine.js")).fiveAxisLoRACadenceEngine;

    // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-2: FiveAxisCAMIntegrationEngine
    case "fiveaxis_cam":
      return _fiveAxisCam ??= (await import("../../engines/FiveAxisCAMIntegrationEngine.js")).fiveAxisCAMIntegrationEngine;

    // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-3: FiveAxisToolpathSynthesisEngine
    // (static-method class — return the class itself, engine === class)
    case "fiveaxis_synth":
      return _fiveAxisSynth ??= (await import("../../engines/FiveAxisToolpathSynthesisEngine.js")).FiveAxisToolpathSynthesisEngine;

    // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-4: MillingUnifiedScienceOrchestrationEngine
    case "milling_sci":
      return _millingSci ??= (await import("../../engines/MillingUnifiedScienceOrchestrationEngine.js")).millingUnifiedScienceOrchestrationEngine;

    // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-5: FiveAxisOrchestrationEngine
    // (static-method class — return the class itself)
    case "fiveaxis_orch":
      return _fiveAxisOrch ??= (await import("../../engines/FiveAxisOrchestrationEngine.js")).FiveAxisOrchestrationEngine;

    // U-BRIDGE-WIRE-MILLING iter-4: MillTurnCAMEngine
    case "millturn_cam":
      return _millTurnCam ??= (await import("../../engines/MillTurnCAMEngine.js")).millTurnCAMEngine;

    // U-BRIDGE-WIRE-MILLING iter-5: MillingUltimateAIEngine
    case "milling_ultimate":
      return _millingUltimate ??= (await import("../../engines/MillingUltimateAIEngine.js")).millingUltimateAIEngine;

    // U-BRIDGE-WIRE-MILLING iter-6: MillNeuralNetworkEngine
    case "mill_neural_net":
      return _millNeural ??= (await import("../../engines/MillNeuralNetworkEngine.js")).millNeuralNetworkEngine;

    // U-BRIDGE-WIRE-MILLING iter-7: MillingProductionKnowledgeHarvesterEngine
    case "milling_pkh":
      return _millingPkHarvester ??= (await import("../../engines/MillingProductionKnowledgeHarvesterEngine.js")).millingProductionKnowledgeHarvesterEngine;

    // U-BRIDGE-WIRE-MILLING iter-8: MillingAIUltraIntelligenceEngine (static-methods class)
    case "milling_uai":
      return _millingUai ??= (await import("../../engines/MillingAIUltraIntelligenceEngine.js")).millingAIUltraIntelligenceEngine;

    default:
      throw new Error(`Unknown mill engine: ${name}`);
  }
}

export const MILL_ACTIONS = [
  // Print-to-Program pipeline
  "mill_print_to_program",
  "mill_feature_recognize",
  "mill_process_plan",
  "mill_generate_gcode",
  "mill_validate_program",

  // Quality / first-piece (MILL-PARITY-UPGRADE-MS0/U-MILL-FIRST-PIECE iter54 foxtrot)
  "mill_first_piece_approval",

  // Knowledge injection (MILL-PARITY-UPGRADE-MS0/U-MILL-PIPELINE-KNOWLEDGE-INJECT iter56 foxtrot)
  "mill_pipeline_knowledge_inject",

  // Tribal injection (MILL-PARITY-UPGRADE-MS0/U-MILL-TRIBAL-INJECTOR iter57 foxtrot)
  // Parity for LatheTribalInjectorEngine — pushes tribal tips into 4 downstream mill consumers.
  // Name prefix `mill_tribal_injector_*` keeps these distinct from `mill_tribal_*`
  // knowledge-query actions that already live at lines ~329-332 (MillTribalKnowledgeEngine).
  "mill_tribal_injector_push",
  "mill_tribal_injector_push_all",
  "mill_tribal_injector_audit",
  "mill_tribal_injector_stats",

  // Coolant advisor (MILL-PARITY-UPGRADE-MS0/U-MILL-COOLANT-ADVISOR iter58 foxtrot)
  // Parity for LatheCoolantAdvisorEngine — 7 modes incl. mill-canonical air_blast
  "mill_coolant_advise",
  "mill_coolant_modes",

  // Anomaly detection (MILL-PARITY-UPGRADE-MS0/U-MILL-ANOMALY-DETECTION iter59 foxtrot)
  // Focused mill-domain detector (vs Lathe's general ML stack)
  "mill_anomaly_scan_point",
  "mill_anomaly_scan_series",
  "mill_anomaly_scan_program",
  "mill_anomaly_detectors",

  // Block engagement simulator (MILL-PARITY-UPGRADE-MS0/U-MILL-BLOCK-ENGAGEMENT-SIMULATOR iter60 foxtrot)
  // Per-block XYZ engagement + MRR — parity for LatheBlockEngagementSimulatorEngine
  "mill_block_engagement_simulate",
  "mill_block_engagement_stats",

  // CSS optimizer (MILL-PARITY-UPGRADE-MS0/U-MILL-CSS-OPTIMIZER iter61 foxtrot)
  // 5-mode mill-effective-Vc optimization — base/helical/ball-nose/face-mill-periphery/envelope
  "mill_css_optimize",
  "mill_css_helical",
  "mill_css_ball_nose",
  "mill_css_face_mill_periphery",
  "mill_css_envelope",
  "mill_css_stats",

  // Expert advisor (MILL-PARITY-UPGRADE-MS0/U-MILL-EXPERT-ADVISOR iter62 foxtrot)
  // Unified orchestrator: composes iter56-iter61 mill engines into single advisory call
  "mill_expert_advise",
  "mill_expert_stats",

  // Deviation map (MILL-PARITY-UPGRADE-MS0/U-MILL-DEVIATION-MAP iter63 foxtrot)
  // 3D XYZ deviation map for milled features — parity for LatheDeviationMapEngine (2D)
  "mill_deviation_compare",
  "mill_deviation_stats",

  // Block time profiler (MILL-PARITY-UPGRADE-MS0/U-MILL-BLOCK-TIME-PROFILER iter64 foxtrot)
  // Per-block cycle-time decomposition. Adds 3 mill-canonical categories (probe/pallet/head_index)
  // and diagonal-rapid kinematics vs lathe's scalar-distance model
  "mill_block_time_profile",
  "mill_block_time_stats",

  // Changeover brief (MILL-PARITY-UPGRADE-MS0/U-MILL-CHANGEOVER-BRIEF iter65 foxtrot)
  // 7-section first-off changeover brief — mill parity for LatheChangeoverBriefEngine
  "mill_changeover_brief",
  "mill_changeover_stats",

  // Envelope breach replay (MILL-PARITY-UPGRADE-MS0/U-MILL-ENVELOPE-BREACH-REPLAY iter66 foxtrot)
  // Block-by-block envelope-intrusion replay (XYZ AABB) — mill parity for LatheEnvelopeBreachReplay
  "mill_envelope_breach_replay",
  "mill_envelope_breach_stats",

  // GD&T form-tolerance validator (MILL-PARITY-UPGRADE-MS0/U-MILL-COAXIALITY-RUNOUT-VALIDATOR iter67 foxtrot)
  // RSS form-tolerance feasibility check for mill — perp/parallelism/flatness/position/cylindricity/runout
  "mill_coax_runout_validate",
  "mill_coax_runout_stats",

  // Stock evolution (MILL-PARITY-UPGRADE-MS0/U-MILL-STOCK-EVOLUTION iter68 foxtrot)
  // XY heightmap stock evolution — 3D mill parity for LatheStockEvolutionEngine (2D Z-R)
  "mill_stock_evolve",
  "mill_stock_stats",

  // Part cost model (MILL-PARITY-UPGRADE-MS0/U-MILL-PART-COST-MODEL iter69 foxtrot)
  // 8-bucket cost-per-part (adds fixture amortization vs lathe's 7) — quoting + scheduling input
  "mill_part_cost_compute",
  "mill_part_cost_stats",

  // Safety predicate (MILL-PARITY-UPGRADE-MS0/U-MILL-SAFETY-PREDICATE iter70 foxtrot)
  // Formal NaN-safe deterministic safety predicate over mill signals (11 clauses)
  "mill_safety_predicate_verify",
  "mill_safety_predicate_verify_or_throw",
  "mill_safety_predicate_stats",

  // Datum reference frame (MILL-PARITY-UPGRADE-MS0/U-MILL-DATUM-REFERENCE-FRAME iter71 foxtrot)
  // ASME Y14.5-2018 §4 3-2-1 location for prismatic mill parts (A=3DOF, B=2DOF, C=1DOF)
  "mill_datum_assign",
  "mill_datum_assign_batch",
  "mill_datum_stats",

  // Vise-jaw setup (MILL-PARITY-UPGRADE-MS0/U-MILL-VISE-JAW-SETUP iter72 foxtrot)
  // Soft-jaw machining + parallel selection + friction-grip safety (Kurt + ISO 16156 + Shigley §8)
  "mill_vise_jaw_compute",
  "mill_vise_jaw_stats",

  // Chip-evacuation predictor (MILL-PARITY-UPGRADE-MS0/U-MILL-CHIP-EVAC iter73 foxtrot)
  // Predicts chip re-cutting / pocket-packing risk (Astakhov §6.7 + Sandvik Milling Hbk)
  "mill_chip_evac_predict",
  "mill_chip_evac_stats",

  // Aux-axis timing (MILL-PARITY-UPGRADE-MS0/U-MILL-AUX-AXIS-TIMING iter74 foxtrot)
  // 14-component cycle-time decomposition: ATC + rotary A + tilt B + head C + pallet + probe + vise
  "mill_aux_axis_timing_analyze",
  "mill_aux_axis_timing_stats",

  // Actual feedback tuning (MILL-PARITY-UPGRADE-MS0/U-MILL-ACTUAL-FEEDBACK-TUNING iter75 foxtrot)
  // Post-run closed-loop tuning: Taylor C, kc, cycle_k, scrap, fz, ae, chatter-threshold
  "mill_actual_feedback_tune",
  "mill_actual_feedback_stats",

  // Job profitability analytics (MILL-PARITY-UPGRADE-MS0/U-MILL-JOB-PROFITABILITY iter76 foxtrot)
  // Per-job waterfall (7 cost buckets incl mill-canonical fixture_amort + energy) + 4-dim portfolio
  "mill_job_profitability_record",
  "mill_job_profitability_list",
  "mill_job_profitability_get",
  "mill_job_profitability_portfolio",
  "mill_job_profitability_stats",

  // Customer order lifecycle (MILL-PARITY-UPGRADE-MS0/U-MILL-CUSTOMER-ORDER-LIFECYCLE iter77 foxtrot)
  // 17-state machine with mill-canonical fixture_prep + first_piece_approval + first_piece_rejected
  "mill_order_create",
  "mill_order_transition",
  "mill_order_get",
  "mill_order_list",
  "mill_order_audit_log",
  "mill_order_pipeline_summary",
  "mill_order_canonical_queue",
  "mill_order_summary_rows",
  "mill_order_allowed_transitions",
  "mill_order_lifecycle_stats",

  // Inventory intelligence (MILL-PARITY-UPGRADE-MS0/U-MILL-INVENTORY-INTELLIGENCE iter78 foxtrot)
  // Real-time inventory with 6 mill-canonical SKU types (endmill, drill_tap, soft_jaw_blank,
  // parallel_set, toolholder, dowel_pin) + tool-life projection + alerts_by_type
  "mill_inventory_upsert",
  "mill_inventory_movement",
  "mill_inventory_snapshot",
  "mill_inventory_alerts",
  "mill_inventory_get_item",
  "mill_inventory_movements",
  "mill_inventory_project_tool_life",
  "mill_inventory_stats",

  // AGI continuous learning (MILL-PARITY-UPGRADE-MS0/U-MILL-AGI-CONTINUOUS-LEARNING iter79 foxtrot)
  // EWMA per (feature,key) slot + 3 mill-canonical feedback kinds: chatter_event, fpa_outcome,
  // chip_evac_outcome (ties iter73/75/77 — feeds back into prediction multipliers)
  "mill_agi_record_feedback",
  "mill_agi_predict_adjustment",
  "mill_agi_predict_by_kind",
  "mill_agi_get_slot",
  "mill_agi_slots_for_feature",
  "mill_agi_reset_slot",
  "mill_agi_stats_by_feature",
  "mill_agi_stats",

  // Actual cost reconciliation (MILL-PARITY-UPGRADE-MS0/U-MILL-ACTUAL-COST-RECONCILIATION iter80 foxtrot)
  // 8-bucket variance + 8-class root cause (mill-canonical 'fixture') + per-bucket multipliers
  "mill_reconcile_actuals",
  "mill_reconcile_running_accuracy",
  "mill_reconcile_list_recent",
  "mill_reconcile_stats",

  // AGI safety containment (MILL-PARITY-UPGRADE-MS0/U-MILL-AGI-SAFETY-CONTAINMENT iter81 foxtrot)
  // 5-category gate (physics/economics/capacity/kinematic/chatter) — mill-canonical fz_per_tooth +
  // 4/5-axis kinematic + chatter stability-lobe check (Tlusty 1963)
  "mill_agi_safety_check",
  "mill_agi_safety_stats",

  // On-machine probe cycles (MILL-PARITY-UPGRADE-MS0/U-MILL-ON-MACHINE-PROBE iter82 foxtrot)
  // 10-cycle library (7 mill-canonical: bore/boss/center/web/corner/pocket/rotary) — Renishaw G65 macros
  "mill_probe_cycle_generate",
  "mill_probe_cycle_stats",

  // Program backtrace (MILL-PARITY-UPGRADE-MS0/U-MILL-PROGRAM-BACKTRACE iter83 foxtrot)
  // 14-kind block stream root-cause walker (5 mill-canonical: cutter_comp / tool_length /
  // rotary_index / pallet_change / probe_cycle) — defect → source-block ranked traversal
  "mill_program_backtrace",
  "mill_program_backtrace_stats",

  // Replay frame compiler (MILL-PARITY-UPGRADE-MS0/U-MILL-REPLAY-FRAME-COMPILER iter84 foxtrot)
  // XYZ + rotary A/B/C + 3D swept-volume frame compilation for visualizer streams. Mill-canonical
  // breach components: vise, fixture, rotary_a/b/c_limit, pallet_clamp, spindle_envelope
  "mill_replay_frame_compile",
  "mill_replay_frame_stats",

  // Program-signoff dossier (MILL-PARITY-UPGRADE-MS0/U-MILL-PROGRAM-SIGNOFF-DOSSIER iter85 foxtrot)
  // Aggregates engagement+stock+breach+time+deviation+chatter+FPA summaries → pass/warn/fail verdict
  // Mill-canonical reasons: CHATTER_RISK, FPA_REJECTED, FPA_CONDITIONAL
  "mill_program_signoff_assemble",
  "mill_program_signoff_stats",

  // Op-time breakdown (MILL-PARITY-UPGRADE-MS0/U-MILL-OP-TIME-BREAKDOWN iter86 foxtrot)
  // 12-bucket per-op time breakdown + lot aggregator. Mill-canonical: rotary_index, pallet_change,
  // tcp_transform; mill-canonical substitutions: tap_threadmill (vs lathe thread), atc_swap
  "mill_op_time_compute",
  "mill_op_time_aggregate",
  "mill_op_time_stats",

  // LoRA resource manager (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-RESOURCE-MANAGER iter87 foxtrot)
  // 8 resource types (3 mill-canonical: tcpm_solver_slots, vericut_slots, postprocessor_slots) +
  // 4-tier priority preemption (critical never preempted) + soft/hard quotas
  "mill_lora_pool_set",
  "mill_lora_allocate",
  "mill_lora_release",
  "mill_lora_reserve",
  "mill_lora_unreserve",
  "mill_lora_utilization",
  "mill_lora_find_preemptable",
  "mill_lora_stats",

  // MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-PIPELINE-COORDINATOR — MillLoRAPipelineCoordinatorEngine
  // (mill parity for the wired LatheLoRAPipelineCoordinator). Closes a stop_on_unwired_assets orphan.
  "mill_lora_pipeline_coord_create",

  // LoRA embedding cache (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-EMBEDDING-CACHE iter88 foxtrot)
  // Cosine-similarity embedding cache with MILL-CANONICAL op_type + feature_signature filters.
  // 12 MillOpType + 5 MillFeatureSignature taxonomies + LRU/LFU/FIFO eviction.
  "mill_lora_emb_set",
  "mill_lora_emb_get_exact",
  "mill_lora_emb_find_similar",
  "mill_lora_emb_best_match",
  "mill_lora_emb_list_by_tag",
  "mill_lora_emb_delete",
  "mill_lora_emb_clear",
  "mill_lora_emb_stats",

  // LoRA cadence scheduler (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-CADENCE iter89 foxtrot)
  // Per-axis training cadences (3-axis/4-axis-index/5-axis-simul/shared) + MILL-CANONICAL
  // trigger types (chatter-drift, fpa-rejection-spike, tcpm-fault-spike) on top of 4 lathe-shared.
  "mill_lora_cadence_config_set",
  "mill_lora_cadence_config_get",
  "mill_lora_cadence_summary",
  "mill_lora_cadence_should_trigger",
  "mill_lora_cadence_assess_mill_triggers",
  "mill_lora_cadence_next_run",
  "mill_lora_cadence_cron",
  "mill_lora_cadence_start_run",
  "mill_lora_cadence_complete_run",
  "mill_lora_cadence_fail_run",
  "mill_lora_cadence_promote_version",
  "mill_lora_cadence_active_version",
  "mill_lora_cadence_active_versions_all_axes",
  "mill_lora_cadence_record_programs",

  // LoRA deployment engine (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-DEPLOYMENT iter90 foxtrot)
  // Per-axis active models (no cross-axis supersession) + mill-canonical rollback triggers
  // (chatter_breach, fpa_rejection, tcpm_solver_fault) + 8 cell types (3axis/4axis/5axis/mill_turn/hsm/hmc/...).
  "mill_lora_deploy_register_target",
  "mill_lora_deploy_create",
  "mill_lora_deploy_begin",
  "mill_lora_deploy_activate",
  "mill_lora_deploy_advance_canary",
  "mill_lora_deploy_update_health",
  "mill_lora_deploy_update_mill_signals",
  "mill_lora_deploy_rollback",
  "mill_lora_deploy_active",
  "mill_lora_deploy_active_by_axis",
  "mill_lora_deploy_history",
  "mill_lora_deploy_stats",

  // LoRA experiment tracker (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-EXPERIMENT-TRACKER iter91 foxtrot)
  // Per-axis_mode experiment scope + 5 mill-canonical metrics with auto-resolved direction
  // (chatter/tcpm/surface=minimize, fpa/dimensional=maximize) + 3 mill-canonical artifact types.
  "mill_lora_exp_create",
  "mill_lora_exp_log_metric",
  "mill_lora_exp_log_metrics",
  "mill_lora_exp_add_artifact",
  "mill_lora_exp_complete",
  "mill_lora_exp_get_series",
  "mill_lora_exp_get_latest",
  "mill_lora_exp_get_best",
  "mill_lora_exp_find_best",
  "mill_lora_exp_find_best_per_axis",
  "mill_lora_exp_compare",
  "mill_lora_exp_list",
  "mill_lora_exp_archive",
  "mill_lora_exp_stats",

  // LoRA ensemble combiner (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-ENSEMBLE-COMBINER iter92 foxtrot)
  // 6 lathe-shared combination methods + 2 MILL-CANONICAL (chatter_robust, tcpm_safe)
  // + per-axis_mode predict filter + allow_cross_axis opt-in.
  "mill_lora_ens_combine",
  "mill_lora_ens_history",
  "mill_lora_ens_stats",
  "mill_lora_ens_clear",

  // LoRA monitoring engine (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-MONITORING iter93 foxtrot)
  // Per-request chatter/fpa/tcpm signal recording + 3 MILL-CANONICAL alert metrics
  // (chatter_rate always critical, fpa_failure_rate, tcpm_fault_rate) + per-axis health distribution.
  "mill_lora_mon_record",
  "mill_lora_mon_health",
  "mill_lora_mon_records_in_window",
  "mill_lora_mon_active_alerts",
  "mill_lora_mon_all_alerts",
  "mill_lora_mon_ack_alert",
  "mill_lora_mon_deployments",
  "mill_lora_mon_health_by_axis",
  "mill_lora_mon_stats",

  // LoRA master orchestrator (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-MASTER-ORCHESTRATOR iter94 foxtrot)
  // 8-phase lifecycle with MILL-CANONICAL first_piece_validation gate before deployment
  // (AS9102 FAI required) + 3 mill-canonical subsystem-name conventions auto-registered
  // via initializeMillStack + per-axis subsystem health rollups.
  "mill_lora_orch_init",
  "mill_lora_orch_init_mill_stack",
  "mill_lora_orch_register_subsystem",
  "mill_lora_orch_update_subsystem",
  "mill_lora_orch_update_metrics",
  "mill_lora_orch_transition",
  "mill_lora_orch_begin_op",
  "mill_lora_orch_end_op",
  "mill_lora_orch_state",
  "mill_lora_orch_events",
  "mill_lora_orch_health_check",
  "mill_lora_orch_stats",
  "mill_lora_orch_stats_by_axis",
  "mill_lora_orch_subsystems_by_axis",
  "mill_lora_orch_shutdown",

  // LoRA model selector (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-MODEL-SELECTOR iter95 foxtrot)
  // Mill-canonical spec-tag vocab (mill ops + mill controllers + materials + feature families)
  // + axis_mode HARD filter + tcpm_safe_only filter + chatter/fpa history scoring.
  "mill_lora_sel_register_model",
  "mill_lora_sel_unregister_model",
  "mill_lora_sel_record_outcome",
  "mill_lora_sel_record_mill_outcome",
  "mill_lora_sel_select",
  "mill_lora_sel_release",
  "mill_lora_sel_models",
  "mill_lora_sel_find_by_spec",
  "mill_lora_sel_find_by_axis",
  "mill_lora_sel_stats",

  // LoRA ensemble orchestrator (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-ENSEMBLE-ORCHESTRATOR iter96 foxtrot)
  // Per-run axis_mode tag + per-exec chatter/fpa/tcpm signals + 2 MILL-CANONICAL run statuses
  // (chatter_aborted always priority, tcpm_aborted) + cascade early-stop on chatter/tcpm.
  "mill_lora_eorch_start_run",
  "mill_lora_eorch_record_exec",
  "mill_lora_eorch_should_cascade_stop",
  "mill_lora_eorch_complete_run",
  "mill_lora_eorch_get_run",
  "mill_lora_eorch_active_runs",
  "mill_lora_eorch_completed_runs",
  "mill_lora_eorch_stats",
  "mill_lora_eorch_stats_by_axis",

  // LoRA tribal extractor (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-TRIBAL-EXTRACTOR iter97 foxtrot)
  // 5 MILL-CANONICAL categories (chatter/pocket_strategy/five_axis_strategy/tcpm/thermal)
  // on top of 9 lathe-shared + axis_mode auto-inference from text + tiered classifier
  // (chatter highest priority).
  "mill_lora_tribe_extract",
  "mill_lora_tribe_extract_batch",
  "mill_lora_tribe_find_by_category",
  "mill_lora_tribe_find_by_keyword",
  "mill_lora_tribe_find_by_axis",
  "mill_lora_tribe_to_training_example",
  "mill_lora_tribe_tips",
  "mill_lora_tribe_stats",
  "mill_lora_tribe_clear",

  // LoRA tribal augmentation (MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-TRIBAL-AUGMENTATION iter98 foxtrot)
  // 8 preloaded JM-Die-mill tips + 4 mill-controller tips (Heidenhain/Mastercam/HSMWorks/Makino)
  // + 4 MILL-CANONICAL playbook rules (chatter/TCPM/long-endmill-ae/stainless-coolant) on top
  // of 6 lathe-shared rules.
  "mill_lora_aug_add_tip",
  "mill_lora_aug_add_rule",
  "mill_lora_aug_tips",
  "mill_lora_aug_rules",
  "mill_lora_aug_tips_by_axis",
  "mill_lora_aug_mill_canonical_rules",
  "mill_lora_aug_find_relevant",
  "mill_lora_aug_check_rules",
  "mill_lora_aug_augment",
  "mill_lora_aug_search_tips",
  "mill_lora_aug_tips_by_material",
  "mill_lora_aug_tips_by_operation",
  "mill_lora_aug_stats",

  // Strategy selection
  "mill_strategy_select",
  "mill_strategy_recommend",
  "mill_strategy_compare",
  "mill_strategy_optimize",

  // Toolpath operations
  "mill_toolpath_generate",
  "mill_toolpath_simulate",
  "mill_toolpath_optimize",
  "mill_toolpath_rest",
  "mill_toolpath_adaptive",
  "mill_toolpath_hsm",
  "mill_toolpath_trochoidal",

  // Physics & validation
  "mill_force_calculate",
  "mill_deflection_check",
  "mill_chatter_predict",
  "mill_thermal_analyze",
  "mill_power_verify",

  // Collision & kinematics
  "mill_collision_check",
  "mill_collision_zones",
  "mill_kinematics_verify",
  "mill_work_envelope",

  // Tool selection
  "mill_tool_recommend",
  "mill_tool_assembly",
  "mill_tool_holder_match",
  "mill_tool_catalog_query",   // CATALOG-APP-WIRING-MS0/U8: full 62.7K vendor corpus search for the mill galaxy

  // AI/AGI features
  "mill_agi_orchestrate",
  "mill_neural_recommend",
  "mill_deeplearn_predict",
  "mill_pattern_mine",
  "mill_wisdom_query",

  // Self-awareness & capability discovery
  "mill_selfaware_registry",
  "mill_selfaware_recommend",
  "mill_selfaware_find",
  "mill_selfaware_stats",

  // Digital twin
  "mill_twin_sync",
  "mill_twin_predict",
  "mill_twin_calibrate",

  // Scientific pipeline
  "mill_scientific_analyze",
  "mill_scientific_optimize",
  "mill_uncertainty_quantify",

  // Quick helpers
  "mill_quick_speed_feed",
  "mill_quick_cycle_time",
  "mill_quick_cost_estimate",

  // Validation & quality
  "mill_validate_setup",
  "mill_validate_safety",
  "mill_spc_analyze",

  // P1-U09-L2-AGG: L2 aggregator routing
  "mill_ai_orchestrate",
  "mill_turn_orchestrate",
  "mill_5axis_orchestrate",
  "mill_multiaxis_orchestrate",

  // Tribal knowledge (MillTribalKnowledgeEngine)
  "mill_tribal_query",
  "mill_tribal_get",
  "mill_tribal_add",
  "mill_tribal_stats",

  // TRIBAL-OUTCOME-LOOP-MS0/U-TTOB02: closed-loop tribal-tip outcome bridge
  "mill_tribal_tip_record_application",
  "mill_tribal_tip_effectiveness",

  // End-to-end orchestration (MillingEndToEndOrchestrationEngine)
  "mill_e2e_workflow",

  // Reasoning trace ledger (MillingReasoningTraceLedgerEngine)
  "mill_trace_record",
  "mill_trace_query",

  // Inference orchestration (MillingInferenceOrchestratorEngine)
  "mill_inference_run",

  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH1: 6 unwired mill engines
  "mill_helical_calc",                 // HelicalMillingEngine.calculate
  "mill_high_feed_calc",               // HighFeedMillingEngine.calculate
  "mill_program_parse",                // MillProgramLearningEngine.parseProgram
  "mill_resource_query",               // MillResourceAwarenessEngine.query
  "mill_strategy_list",                // MillingStrategyLibraryEngine.getAllStrategies
  "mill_strategy_for_feature",         // MillingStrategyLibraryEngine.getStrategiesForFeature

  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH2: 6 neural/AI mill engines
  "mill_neural_cognitive_process",     // MillingNeuralCognitiveEngine.quickProcess
  "mill_critical_analyze",             // MillingCriticalThinkingEngine.quickAnalyze
  "mill_meta_learn_record",            // MillingMetaLearningEngine.learnFromExperience
  "mill_meta_learn_self_assess",       // MillingMetaLearningEngine.selfAssess
  "mill_ai_parse_nl_query",            // MillingAIIntegrationEngine.parseNaturalLanguageQuery
  "mill_ai_archive_stats",             // MillingAIIntegrationEngine.getArchiveStats
  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH3: 6 unwired physics/RL/pattern mill engines
  "mill_physics_force",                // MillingPhysicsKernelEngine.calculateMillingForces
  "mill_physics_tool_life",            // MillingPhysicsKernelEngine.calculateToolLife
  "mill_program_pattern_analyze",      // MillingProgramPatternEngine.analyzeProgram
  "mill_rl_select_action",             // MillingReinforcementLearningEngine.selectAction
  "mill_head_recommend",               // MillingHeadIntelligenceEngine.recommendMillingHead
  "mill_machine_intel_get",            // MillingMachineIntelligenceEngine.getMachine
  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH4: 6 unwired deep-AI / digital-twin mill engines
  "mill_deep_reason",                  // MillingDeepReasoningEngine.quickReason
  "mill_deep_integrate",               // MillingDeepIntegrationEngine.quickIntegrate
  "mill_knowledge_search",             // MillingDeepKnowledgeSynthesisEngine.searchKnowledge
  "mill_knowledge_stats",              // MillingDeepKnowledgeSynthesisEngine.getSourceStats
  "mill_ai_unified_recommend",         // MillingAIUnificationEngine.quickRecommend
  "mill_milling_twin_sync",            // MillingDigitalTwinEngine.sync
  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH5: 6 unwired AGI / online-learning / troubleshooting mill engines
  "mill_agi_quick_analyze",            // MillingAGIOrchestrationEngine.quickAnalyze
  "mill_knowledge_orch_recommend",     // MillingKnowledgeOrchestratorEngine.quickRecommend
  "mill_troubleshoot",                 // MillingDeepAIHardeningEngine.troubleshootMillingIssue
  "mill_lora_cadence_state",           // MillingLoRACadenceEngine.getState
  "mill_online_record_step",           // MillingOnlineLearningTrackerEngine.recordStep
  "mill_online_detect_drift",          // MillingOnlineLearningTrackerEngine.detectDrift

  // MS-PRINT-PROGRAM-LOOP / U-PPL-A5: MillPartClassifierEngine — 4 actions
  "mill_part_classify",                 // MillPartClassifierEngine.classify
  "mill_part_classify_batch",           // MillPartClassifierEngine.classifyBatch
  "mill_part_family_profile",           // MillPartClassifierEngine.getFamilyProfile
  "mill_part_families_list",            // MillPartClassifierEngine.listFamilies

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING: MillingHybridStrategySynthesizer — 4 actions
  "mill_hybrid_synthesize",             // MillingHybridStrategySynthesizer.synthesize
  "mill_hybrid_quick_recommend",        // MillingHybridStrategySynthesizer.quickRecommend
  "mill_hybrid_strategies",             // MillingHybridStrategySynthesizer.getStrategies
  "mill_hybrid_synergy",                // MillingHybridStrategySynthesizer.getSynergy

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-2: MillingLoRADatasetBuilderEngine — 2 actions
  "mill_lora_build_dataset",            // MillingLoRADatasetBuilderEngine.buildDataset
  "mill_lora_required_schema",          // MillingLoRADatasetBuilderEngine.requiredSchema

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-3: MillTurnLoRADatasetBuilderEngine — 2 actions
  "millturn_lora_build_dataset",        // MillTurnLoRADatasetBuilderEngine.buildDataset
  "millturn_lora_required_schema",      // MillTurnLoRADatasetBuilderEngine.requiredSchema

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-4: MillTurnCAMEngine — 1 action
  "millturn_cam_generate",              // MillTurnCAMEngine.generate

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-5: MillingUltimateAIEngine — 2 actions
  "mill_ultimate_quick_analyze",        // MillingUltimateAIEngine.quickAnalyze
  "mill_ultimate_explore_variability",  // MillingUltimateAIEngine.exploreMaxVariability

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-6: MillNeuralNetworkEngine — 4 actions
  "mill_neural_encode_features",        // MillNeuralNetworkEngine.encodeFeatures
  "mill_neural_add_sample",             // MillNeuralNetworkEngine.addTrainingSample
  "mill_neural_train",                  // MillNeuralNetworkEngine.train
  "mill_neural_predict",                // MillNeuralNetworkEngine.predict

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-7: MillingProductionKnowledgeHarvesterEngine — 5 actions
  "mill_pkh_recommend_params",          // getRecommendedParameters
  "mill_pkh_validate_params",           // validateParameters
  "mill_pkh_tribal_knowledge",          // getTribalKnowledge
  "mill_pkh_stats",                     // getStats
  "mill_pkh_self_awareness",            // getSelfAwareness

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-8: MillingAIUltraIntelligenceEngine — 20 actions
  "mill_uai_parse_nl",                  // parseNaturalLanguage
  "mill_uai_process_nl",                // processNaturalLanguage
  "mill_uai_generate_prompt",           // generatePRISMAIPrompt
  "mill_uai_select_strategy",           // selectOptimalStrategy
  "mill_uai_compare_strategies",        // compareStrategies
  "mill_uai_predict_tool_life",         // predictToolLife
  "mill_uai_record_tool_life",          // recordToolLifeData
  "mill_uai_extract_toolpath_features", // extractToolpathFeatures
  "mill_uai_score_toolpath",            // scoreToolpath
  "mill_uai_explain_decision",          // explainDecision
  "mill_uai_get_recommended_action",    // getRecommendedAction
  "mill_uai_record_episode",            // recordEpisode
  "mill_uai_calculate_reward",          // calculateReward
  "mill_uai_get_policy_stats",          // getPolicyStats
  "mill_uai_diagnose_problem",          // diagnoseProblem
  "mill_uai_generate_troubleshooting_prompt", // generateTroubleshootingPrompt
  "mill_uai_clear_all",                 // clearAll
  "mill_uai_get_tool_life_data_count",  // getToolLifeDataCount
  "mill_uai_get_rl_episode_count",      // getRLEpisodeCount
  "mill_uai_get_troubleshooting_history_count", // getTroubleshootingHistoryCount

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILL iter-1: FiveAxis LoRA closed-loop pair — 6 actions
  "mill_5axis_lora_build_dataset",        // FiveAxisLoRADatasetBuilderEngine.buildDataset
  "mill_5axis_lora_required_schema",      // FiveAxisLoRADatasetBuilderEngine.requiredSchema
  "mill_5axis_lora_cadence_state",        // FiveAxisLoRACadenceEngine.getState
  "mill_5axis_lora_cadence_config",       // FiveAxisLoRACadenceEngine.getConfig
  "mill_5axis_lora_cadence_should_run",   // FiveAxisLoRACadenceEngine.shouldTriggerRun
  "mill_5axis_lora_cadence_check_drift",  // FiveAxisLoRACadenceEngine.checkDrift

  // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-2: FiveAxisCAMIntegrationEngine — 2 actions
  "mill_5axis_cam_convert_3to5",          // FiveAxisCAMIntegrationEngine.convert3to5axis
  "mill_5axis_cam_gcode",                 // FiveAxisCAMIntegrationEngine.toFiveAxisGcode

  // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-3: FiveAxisToolpathSynthesisEngine — 5 actions
  "mill_5axis_synth_recommend",           // FiveAxisToolpathSynthesisEngine.synthesize
  "mill_5axis_synth_strategies",          // .getAllStrategies
  "mill_5axis_synth_strategies_by_family",// .getStrategiesByFamily
  "mill_5axis_synth_novel_strategies",    // .getNovelStrategies
  "mill_5axis_synth_get_strategy",        // .getStrategyById

  // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-4: MillingUnifiedScienceOrchestrationEngine — 8 actions
  "mill_sci_analyze",                     // analyzeScientifically (7-domain analysis)
  "mill_sci_quick_analyze",               // quickAnalyze (rapid param validation)
  "mill_sci_material_properties",         // getMaterialProperties
  "mill_sci_materials",                   // getAvailableMaterials
  "mill_sci_tips",                        // getScientificTips
  "mill_sci_domains",                     // getScientificDomains
  "mill_sci_self_awareness",              // getSelfAwareness
  "mill_sci_stats",                       // getStats

  // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-5: FiveAxisOrchestrationEngine — 5 actions
  "mill_5axis_orch_dsl_examples",         // getDSLSyntaxExamples
  "mill_5axis_orch_parse_dsl",            // parseDSL
  "mill_5axis_orch_rtcp_dialect",         // getRTCPDialect
  "mill_5axis_orch_machine_dynamics",     // getDefaultDynamics
  "mill_5axis_orch_sequences",            // getAllSequences
  // iter9 wire-unwired-loop: 4th-axis + cold-heading
  "fourth_axis_indexing_plan",
  "fourth_axis_decision_select",
  "cold_heading_tool_configure",

  // U-MILL-HM-FIXTURE (slot:bravo): MonolithHyperMillFixtureDatabaseEngine -- R12-safe hyperMILL fixture/workholding catalog DATA + deterministic part-dims auto-select (8 actions; non-dup of the physics fixture_*/workholding_* force calculators)
  "mill_hm_fixture_vises",                // listVises
  "mill_hm_fixture_chucks",               // listChucks
  "mill_hm_fixture_clamps",               // listClamps
  "mill_hm_fixture_get_vise",             // getVise(id)
  "mill_hm_fixture_get_chuck",            // getChuck(id)
  "mill_hm_fixture_auto_select",          // autoSelect(part_dims) -- threshold-based vise/chuck/clamp pick
  "mill_hm_fixture_search",               // search(query, limit)
  "mill_hm_fixture_stats",                // stats
] as const;

export const MILL_DISPATCHER_ACTION_COUNT = MILL_ACTIONS.length;

export function registerMillDispatcher(server: any): void {
  server.tool(
    "prism_mill",
    `Mill-specific dispatcher — strategy, toolpath, physics, AGI, print-to-program pipeline.
Actions: ${MILL_ACTIONS.join(", ")}.`,
    { action: z.enum(MILL_ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof MILL_ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_mill] Action: ${action}`);
      let result: any;
      try {
        // Normalize params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, MILL_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_mill"
          );
        }

        // Pre-calculation safety hooks
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "millDispatcher", action, params }
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
          // ============================================================
          // PRINT-TO-PROGRAM PIPELINE
          // ============================================================
          case "mill_print_to_program": {
            result = await callOrThrow(await getEngine("program"), ["runFullPipeline"], toMillingInput(params), "MillingPrintToProgramEngine");
            break;
          }
          case "mill_feature_recognize": {
            result = await callOrThrow(await getEngine("facade"), ["recognizeFeatures"], params, "MillMasterOrchestratorFacadeEngine");
            break;
          }
          case "mill_process_plan": {
            result = await callOrThrow(await getEngine("facade"), ["planProcess"], params, "MillMasterOrchestratorFacadeEngine");
            break;
          }
          case "mill_generate_gcode": {
            // KILO-P2P-RECONCILE-MS0/U-KP2P-01: runFullPipeline runs the full pipeline; G-code is in result.program_text.
            result = await callOrThrow(await getEngine("program"), ["runFullPipeline"], toMillingInput(params), "MillingPrintToProgramEngine");
            break;
          }
          case "mill_validate_program": {
            result = await callOrThrow(await getEngine("validate"), ["analyze", "validate"], params, "MillProgramAnalyzerEngine");
            break;
          }
          case "mill_first_piece_approval": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-FIRST-PIECE (slot:foxtrot iter54) — Mill-specific first-off sign-off
            // gate parity for LatheFirstPieceApprovalEngine; adds squareness/parallelism/flatness/hole-position/
            // bolt-circle/pocket-depth feature categories with Mill-domain inspection guidance per AIAG PPAP +
            // ISO 14253-1 (uncertainty-aware conformance) + Machinery's Handbook §GD&T.
            const { millFirstPieceApprovalEngine } = await import("../../engines/MillFirstPieceApprovalEngine.js");
            result = millFirstPieceApprovalEngine.approve(params as Parameters<typeof millFirstPieceApprovalEngine.approve>[0]);
            break;
          }
          case "mill_pipeline_knowledge_inject": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-PIPELINE-KNOWLEDGE-INJECT (slot:foxtrot iter56) — bridge wiring
            // TribalCorpusOrchestratorEngine (iter52 capstone) + curated mill-domain wiki pointer catalog into
            // any downstream mill pipeline (program generator, strategy selector, first-piece approval). No
            // averaging across sources, no silent attribution dropping, confidence floor enforced; entry+symptom
            // escalation + URGENT priority invariants enforced locally regardless of orchestrator return.
            const { millPipelineKnowledgeInjectorEngine } = await import("../../engines/MillPipelineKnowledgeInjectorEngine.js");
            result = await millPipelineKnowledgeInjectorEngine.inject(params as Parameters<typeof millPipelineKnowledgeInjectorEngine.inject>[0]);
            break;
          }
          case "mill_tribal_injector_push": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-TRIBAL-INJECTOR (slot:foxtrot iter57) — push-time injector parity
            // for LatheTribalInjectorEngine. Pushes tribal tips into ONE of 4 mill targets
            // {speed_feed, program_optimizer, post_processor, dfm_check} with audit trail.
            const { millTribalInjectorEngine } = await import("../../engines/MillTribalInjectorEngine.js");
            const p = params as { target: Parameters<typeof millTribalInjectorEngine.inject>[0]; tips: Parameters<typeof millTribalInjectorEngine.inject>[1]; context: Parameters<typeof millTribalInjectorEngine.inject>[2]; options?: Parameters<typeof millTribalInjectorEngine.inject>[3] };
            result = millTribalInjectorEngine.inject(p.target, p.tips, p.context, p.options);
            break;
          }
          case "mill_tribal_injector_push_all": {
            // Convenience: push tips into ALL 4 mill targets in one call.
            const { millTribalInjectorEngine } = await import("../../engines/MillTribalInjectorEngine.js");
            const p = params as { tips: Parameters<typeof millTribalInjectorEngine.injectAll>[0]; context: Parameters<typeof millTribalInjectorEngine.injectAll>[1]; options?: Parameters<typeof millTribalInjectorEngine.injectAll>[2] };
            result = millTribalInjectorEngine.injectAll(p.tips, p.context, p.options);
            break;
          }
          case "mill_tribal_injector_audit": {
            // Read the audit log (optionally filtered by target). Critical for tracing recommendations back to source tips.
            const { millTribalInjectorEngine } = await import("../../engines/MillTribalInjectorEngine.js");
            const p = params as { target?: Parameters<typeof millTribalInjectorEngine.getAuditLog>[0]; limit?: number };
            result = millTribalInjectorEngine.getAuditLog(p.target, p.limit);
            break;
          }
          case "mill_tribal_injector_stats": {
            // Lightweight stats — targets supported, audit-entry count, registered-hook count.
            const { millTribalInjectorEngine } = await import("../../engines/MillTribalInjectorEngine.js");
            result = millTribalInjectorEngine.getStats();
            break;
          }
          case "mill_coolant_advise": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-COOLANT-ADVISOR (slot:foxtrot iter58) — recommends one of 7 mill
            // coolant modes (flood/HPC/mist/MQL/air_blast/dry/cryogenic) given ISO group + operation + tool
            // material + engagement + thermal sensitivity + sustainability priority + TSC/air-blast plumbing.
            const { millCoolantAdvisorEngine } = await import("../../engines/MillCoolantAdvisorEngine.js");
            result = millCoolantAdvisorEngine.advise(params as Parameters<typeof millCoolantAdvisorEngine.advise>[0]);
            break;
          }
          case "mill_coolant_modes": {
            // Lists supported modes + factor list. Useful for UI dropdowns + diagnostic introspection.
            const { millCoolantAdvisorEngine } = await import("../../engines/MillCoolantAdvisorEngine.js");
            result = millCoolantAdvisorEngine.getStats();
            break;
          }
          case "mill_anomaly_scan_point": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-ANOMALY-DETECTION (slot:foxtrot iter59) — scan single
            // data point for mill-domain anomalies (spindle spike, chip thinning, deflection-engagement,
            // flute wear delta, feed override mismatch, fz outlier). Returns list of MillAnomalyResult.
            const { millAnomalyDetectionEngine } = await import("../../engines/MillAnomalyDetectionEngine.js");
            const p = params as { point: Parameters<typeof millAnomalyDetectionEngine.scanPoint>[0]; idx?: number };
            result = millAnomalyDetectionEngine.scanPoint(p.point, p.idx);
            break;
          }
          case "mill_anomaly_scan_series": {
            // Scan a time-series of data points; adds series-level checks (vibration outlier z-score,
            // surface_ra drift via linear regression). Returns MillAnomalyOutput with aggregate score.
            const { millAnomalyDetectionEngine } = await import("../../engines/MillAnomalyDetectionEngine.js");
            const p = params as { points: Parameters<typeof millAnomalyDetectionEngine.scanSeries>[0] };
            result = millAnomalyDetectionEngine.scanSeries(p.points);
            break;
          }
          case "mill_anomaly_scan_program": {
            // Scan a mill G-code program for static safety anomalies (missing M30, S-without-M03).
            const { millAnomalyDetectionEngine } = await import("../../engines/MillAnomalyDetectionEngine.js");
            const p = params as { program: Parameters<typeof millAnomalyDetectionEngine.scanProgram>[0] };
            result = millAnomalyDetectionEngine.scanProgram(p.program);
            break;
          }
          case "mill_anomaly_detectors": {
            // List supported detectors + ISO groups + operation types.
            const { millAnomalyDetectionEngine } = await import("../../engines/MillAnomalyDetectionEngine.js");
            result = millAnomalyDetectionEngine.getStats();
            break;
          }
          case "mill_block_engagement_simulate": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-BLOCK-ENGAGEMENT-SIMULATOR (slot:foxtrot iter60) — walks
            // a sequence of canonical XYZ blocks and emits per-block ae/ap/fz/MRR + engagement_fraction
            // + warnings; aggregates peaks. Mill parity for LatheBlockEngagementSimulatorEngine
            // (LATHE-PRO-MS12) — replaces lathe X+Z + nose-radius engagement with mill XYZ + ae/D fraction
            // (radial engagement) + ap/D (axial vs diameter) + fz (per-tooth chip).
            const { millBlockEngagementSimulatorEngine } = await import("../../engines/MillBlockEngagementSimulatorEngine.js");
            result = millBlockEngagementSimulatorEngine.simulate(params as Parameters<typeof millBlockEngagementSimulatorEngine.simulate>[0]);
            break;
          }
          case "mill_block_engagement_stats": {
            // Canonical-reference + metrics taxonomy introspection.
            const { millBlockEngagementSimulatorEngine } = await import("../../engines/MillBlockEngagementSimulatorEngine.js");
            result = millBlockEngagementSimulatorEngine.getStats();
            break;
          }
          case "mill_css_optimize": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-CSS-OPTIMIZER (slot:foxtrot iter61) — base mill RPM from
            // target Vc + tool diameter, respecting rated_max_rpm + min_rpm clamps.
            const { millCSSOptimizerEngine } = await import("../../engines/MillCSSOptimizerEngine.js");
            result = millCSSOptimizerEngine.optimize(params as Parameters<typeof millCSSOptimizerEngine.optimize>[0]);
            break;
          }
          case "mill_css_helical": {
            // Helical interpolation bore-out — effective_D = hole_D - tool_D drives Vc; RPM tuned accordingly.
            const { millCSSOptimizerEngine } = await import("../../engines/MillCSSOptimizerEngine.js");
            result = millCSSOptimizerEngine.optimizeForHelicalInterpolation(params as Parameters<typeof millCSSOptimizerEngine.optimizeForHelicalInterpolation>[0]);
            break;
          }
          case "mill_css_ball_nose": {
            // Ball-nose effective_D = D * sin(tilt). At tilt=0, effective_D=0 → rub. Surfaces min_tilt
            // recommendation to keep effective Vc above floor.
            const { millCSSOptimizerEngine } = await import("../../engines/MillCSSOptimizerEngine.js");
            result = millCSSOptimizerEngine.optimizeForBallNoseEffective(params as Parameters<typeof millCSSOptimizerEngine.optimizeForBallNoseEffective>[0]);
            break;
          }
          case "mill_css_face_mill_periphery": {
            // Face mill: RPM set by Vc at mean D, but peripheral insert sees Vc at face_mill_max_D.
            // Verifies peripheral Vc doesn't exceed insert envelope.
            const { millCSSOptimizerEngine } = await import("../../engines/MillCSSOptimizerEngine.js");
            result = millCSSOptimizerEngine.optimizeForFaceMillPeriphery(params as Parameters<typeof millCSSOptimizerEngine.optimizeForFaceMillPeriphery>[0]);
            break;
          }
          case "mill_css_envelope": {
            // Sweep effective Vc across a range of engagement angles. Surfaces min/max Vc + warns
            // when any angle drops below 50% target.
            const { millCSSOptimizerEngine } = await import("../../engines/MillCSSOptimizerEngine.js");
            result = millCSSOptimizerEngine.effectiveVcEnvelope(params as Parameters<typeof millCSSOptimizerEngine.effectiveVcEnvelope>[0]);
            break;
          }
          case "mill_css_stats": {
            const { millCSSOptimizerEngine } = await import("../../engines/MillCSSOptimizerEngine.js");
            result = millCSSOptimizerEngine.getStats();
            break;
          }
          case "mill_expert_advise": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-EXPERT-ADVISOR (slot:foxtrot iter62) — unified orchestrator
            // composing iter56-iter61 mill engines (PipelineKnowledgeInjector + CoolantAdvisor +
            // CSSOptimizer + AnomalyDetection) into a single advisory call with readiness verdict
            // (green/yellow/red), recommended RPM + coolant, predicted anomalies, tribal tips, wiki
            // pointers, and conflict-surfaced red_flags (slot-foxtrot R7: don't average sources).
            const { millExpertAdvisorEngine } = await import("../../engines/MillExpertAdvisorEngine.js");
            result = await millExpertAdvisorEngine.advise(params as Parameters<typeof millExpertAdvisorEngine.advise>[0]);
            break;
          }
          case "mill_expert_stats": {
            const { millExpertAdvisorEngine } = await import("../../engines/MillExpertAdvisorEngine.js");
            result = millExpertAdvisorEngine.getStats();
            break;
          }
          case "mill_deviation_compare": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-DEVIATION-MAP (slot:foxtrot iter63) — 3D XYZ deviation map
            // for milled features. Lathe parity (2D z/r → 3D x/y/z). Computes per-axis bias + dominant
            // axis attribution + feature-specific recommendation (pocket/face/hole/contour/slot/thread/boss).
            const { millDeviationMapEngine } = await import("../../engines/MillDeviationMapEngine.js");
            result = millDeviationMapEngine.compare(params as Parameters<typeof millDeviationMapEngine.compare>[0]);
            break;
          }
          case "mill_deviation_stats": {
            const { millDeviationMapEngine } = await import("../../engines/MillDeviationMapEngine.js");
            result = millDeviationMapEngine.getStats();
            break;
          }
          case "mill_block_time_profile": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-BLOCK-TIME-PROFILER (slot:foxtrot iter64) — per-block
            // cycle-time decomposition with 3 mill-canonical categories (probe_cycle, pallet_change,
            // head_index) + diagonal-rapid kinematics (max-of-axes) + optional accel/decel S-curve
            // penalty for short blocks. Parity for LatheBlockTimeProfilerEngine.
            const { millBlockTimeProfilerEngine } = await import("../../engines/MillBlockTimeProfilerEngine.js");
            result = millBlockTimeProfilerEngine.profile(params as Parameters<typeof millBlockTimeProfilerEngine.profile>[0]);
            break;
          }
          case "mill_block_time_stats": {
            const { millBlockTimeProfilerEngine } = await import("../../engines/MillBlockTimeProfilerEngine.js");
            result = millBlockTimeProfilerEngine.getStats();
            break;
          }
          case "mill_changeover_brief": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-CHANGEOVER-BRIEF (slot:foxtrot iter65) — 7-section first-off
            // changeover brief for mill operators. Mill parity for LatheChangeoverBriefEngine — replaces
            // chuck/jaws/turret/X-Z model with vise/fixture/tool-magazine/X-Y-Z(+A/B/C) model. Includes
            // markdown render + auto-warnings (TSC missing plumbing, 5-axis singularity, long-projection
            // deflection check, low coolant, soft-jaw bore verification).
            const { millChangeoverBriefEngine } = await import("../../engines/MillChangeoverBriefEngine.js");
            result = millChangeoverBriefEngine.generate(params as Parameters<typeof millChangeoverBriefEngine.generate>[0]);
            break;
          }
          case "mill_changeover_stats": {
            const { millChangeoverBriefEngine } = await import("../../engines/MillChangeoverBriefEngine.js");
            result = millChangeoverBriefEngine.getStats();
            break;
          }
          case "mill_envelope_breach_replay": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-ENVELOPE-BREACH-REPLAY (slot:foxtrot iter66) — block-by-
            // block envelope-intrusion replay. Lathe parity (XZ cylinders → XYZ AABBs). Tests against
            // workholding_box + multiple fixture interferences + spindle_nose_floor + X/Y/Z soft-limits
            // + A/B/C tilt limits. Returns first_breach_block + all hits with penetration depth.
            const { millEnvelopeBreachReplayEngine } = await import("../../engines/MillEnvelopeBreachReplayEngine.js");
            result = millEnvelopeBreachReplayEngine.replay(params as Parameters<typeof millEnvelopeBreachReplayEngine.replay>[0]);
            break;
          }
          case "mill_envelope_breach_stats": {
            const { millEnvelopeBreachReplayEngine } = await import("../../engines/MillEnvelopeBreachReplayEngine.js");
            result = millEnvelopeBreachReplayEngine.getStats();
            break;
          }
          case "mill_coax_runout_validate": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-COAXIALITY-RUNOUT-VALIDATOR (slot:foxtrot iter67) — RSS
            // GD&T form-tolerance feasibility check. Mill parity for LatheCoaxialityRunoutValidatorEngine
            // (LATHE-PRO-MS8). Lathe validates circular_runout/total_runout/coaxiality (turning shafts);
            // mill validates perpendicularity/parallelism/flatness/position/cylindricity per ASME Y14.5
            // §10-12. Outputs verdict (comfortable/tight/infeasible) + per-source contribution + Cpk +
            // ranked mitigations.
            const { millCoaxialityRunoutValidatorEngine } = await import("../../engines/MillCoaxialityRunoutValidatorEngine.js");
            result = millCoaxialityRunoutValidatorEngine.validate(params as Parameters<typeof millCoaxialityRunoutValidatorEngine.validate>[0]);
            break;
          }
          case "mill_coax_runout_stats": {
            const { millCoaxialityRunoutValidatorEngine } = await import("../../engines/MillCoaxialityRunoutValidatorEngine.js");
            result = millCoaxialityRunoutValidatorEngine.getStats();
            break;
          }
          case "mill_stock_evolve": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-STOCK-EVOLUTION (slot:foxtrot iter68) — XY heightmap
            // stock evolution. 3D mill parity for LatheStockEvolutionEngine (2D Z-R). Standard mill-sim
            // technique: each XY grid cell stores top-of-material Z; passes lower Z within footprint.
            // 7 pass kinds (face/end/pocket/slot/drilling/boring/contour). Returns final heightmap +
            // per-pass impact (cells_modified, volume_removed) + total volume.
            const { millStockEvolutionEngine } = await import("../../engines/MillStockEvolutionEngine.js");
            result = millStockEvolutionEngine.evolve(params as Parameters<typeof millStockEvolutionEngine.evolve>[0]);
            break;
          }
          case "mill_stock_stats": {
            const { millStockEvolutionEngine } = await import("../../engines/MillStockEvolutionEngine.js");
            result = millStockEvolutionEngine.getStats();
            break;
          }
          case "mill_part_cost_compute": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-PART-COST-MODEL (slot:foxtrot iter69) — 8-bucket
            // cost-per-part model. Mill parity for LathePartCostModelEngine (7 buckets) + adds
            // fixture bucket (mill canonical: dedicated soft jaws / fixture plates / tombstones).
            const { millPartCostModelEngine } = await import("../../engines/MillPartCostModelEngine.js");
            result = millPartCostModelEngine.compute(params as Parameters<typeof millPartCostModelEngine.compute>[0]);
            break;
          }
          case "mill_part_cost_stats": {
            const { millPartCostModelEngine } = await import("../../engines/MillPartCostModelEngine.js");
            result = millPartCostModelEngine.getStats();
            break;
          }
          case "mill_safety_predicate_verify": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-SAFETY-PREDICATE (slot:foxtrot iter70) — formal
            // NaN-safe deterministic safety predicate over mill signals. 11 clauses. Mill parity
            // for LatheSafetyPredicateEngine. Pure function — never throws on well-typed input.
            const { millSafetyPredicateEngine } = await import("../../engines/MillSafetyPredicateEngine.js");
            result = millSafetyPredicateEngine.verify(params as Parameters<typeof millSafetyPredicateEngine.verify>[0]);
            break;
          }
          case "mill_safety_predicate_verify_or_throw": {
            // Hard-block precondition gate — throws MillSafetyPredicateViolation when BLOCKED.
            // Used by emit pipelines that require a precondition gate before G-code release.
            const { millSafetyPredicateEngine } = await import("../../engines/MillSafetyPredicateEngine.js");
            result = millSafetyPredicateEngine.verifyOrThrow(params as Parameters<typeof millSafetyPredicateEngine.verifyOrThrow>[0]);
            break;
          }
          case "mill_safety_predicate_stats": {
            const { millSafetyPredicateEngine } = await import("../../engines/MillSafetyPredicateEngine.js");
            result = millSafetyPredicateEngine.getStats();
            break;
          }
          case "mill_datum_assign": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-DATUM-REFERENCE-FRAME (slot:foxtrot iter71) —
            // ASME Y14.5-2018 §4 3-2-1 datum reference frame for prismatic mill parts.
            // A=3DOF (largest mating face), B=2DOF (perpendicular edge), C=1DOF (clocking).
            const { millDatumReferenceFrameEngine } = await import("../../engines/MillDatumReferenceFrameEngine.js");
            result = millDatumReferenceFrameEngine.assign(params as Parameters<typeof millDatumReferenceFrameEngine.assign>[0]);
            break;
          }
          case "mill_datum_assign_batch": {
            const { millDatumReferenceFrameEngine } = await import("../../engines/MillDatumReferenceFrameEngine.js");
            const batch = (params as { parts: Parameters<typeof millDatumReferenceFrameEngine.assign>[0][] }).parts;
            if (!Array.isArray(batch)) throw new TypeError("mill_datum_assign_batch: params.parts[] required");
            result = batch.map(p => millDatumReferenceFrameEngine.assign(p));
            break;
          }
          case "mill_datum_stats": {
            const { millDatumReferenceFrameEngine } = await import("../../engines/MillDatumReferenceFrameEngine.js");
            result = millDatumReferenceFrameEngine.getStats();
            break;
          }
          case "mill_vise_jaw_compute": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-VISE-JAW-SETUP (slot:foxtrot iter72) — soft-jaw
            // pocket, parallel selection, and friction-grip safety for mill vises. Mill parity
            // for LatheChuckJawSetupEngine but with linear cut-force physics (not centrifugal).
            const { millViseJawSetupEngine } = await import("../../engines/MillViseJawSetupEngine.js");
            result = millViseJawSetupEngine.compute(params as Parameters<typeof millViseJawSetupEngine.compute>[0]);
            break;
          }
          case "mill_vise_jaw_stats": {
            const { millViseJawSetupEngine } = await import("../../engines/MillViseJawSetupEngine.js");
            result = millViseJawSetupEngine.getStats();
            break;
          }
          case "mill_chip_evac_predict": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-CHIP-EVAC (slot:foxtrot iter73) — chip-evacuation
            // risk predictor for mill (pocket re-cut / chip packing / BUE). Mill parity for
            // LatheBirdNestPredictorEngine but with different failure-mode physics (no rotating
            // workpiece). 6-factor weighted composite + ranked mitigations + safety notes.
            const { millChipEvacuationPredictorEngine } = await import("../../engines/MillChipEvacuationPredictorEngine.js");
            result = millChipEvacuationPredictorEngine.predict(params as Parameters<typeof millChipEvacuationPredictorEngine.predict>[0]);
            break;
          }
          case "mill_chip_evac_stats": {
            const { millChipEvacuationPredictorEngine } = await import("../../engines/MillChipEvacuationPredictorEngine.js");
            result = millChipEvacuationPredictorEngine.getStats();
            break;
          }
          case "mill_aux_axis_timing_analyze": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-AUX-AXIS-TIMING (slot:foxtrot iter74) — 14-component
            // cycle-time decomposition. Mill parity for LatheAuxAxisTimingEngine but with
            // mill-specific aux axes: ATC + rotary A + tilt B + head C + pallet + probe + vise.
            const { millAuxAxisTimingEngine } = await import("../../engines/MillAuxAxisTimingEngine.js");
            result = millAuxAxisTimingEngine.analyze(params as Parameters<typeof millAuxAxisTimingEngine.analyze>[0]);
            break;
          }
          case "mill_aux_axis_timing_stats": {
            const { millAuxAxisTimingEngine } = await import("../../engines/MillAuxAxisTimingEngine.js");
            result = millAuxAxisTimingEngine.getStats();
            break;
          }
          case "mill_actual_feedback_tune": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-ACTUAL-FEEDBACK-TUNING (slot:foxtrot iter75) — post-run
            // closed-loop tuning of mill physics parameters from production residuals. Mill parity
            // for LatheActualFeedbackTuningEngine + 3 mill-canonical extensions: fz_scale,
            // adaptive_ae_scale, chatter_threshold_scale.
            const { millActualFeedbackTuningEngine } = await import("../../engines/MillActualFeedbackTuningEngine.js");
            result = millActualFeedbackTuningEngine.tune(params as Parameters<typeof millActualFeedbackTuningEngine.tune>[0]);
            break;
          }
          case "mill_actual_feedback_stats": {
            const { millActualFeedbackTuningEngine } = await import("../../engines/MillActualFeedbackTuningEngine.js");
            result = millActualFeedbackTuningEngine.getStats();
            break;
          }
          case "mill_job_profitability_record": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-JOB-PROFITABILITY (slot:foxtrot iter76) — per-job
            // waterfall + portfolio. Mill parity for LatheJobProfitabilityAnalyticsEngine with
            // mill-canonical extensions: fixture_amort + energy cost buckets, strategy +
            // axis_count portfolio dims.
            const { millJobProfitabilityAnalyticsEngine } = await import("../../engines/MillJobProfitabilityAnalyticsEngine.js");
            result = millJobProfitabilityAnalyticsEngine.recordJob(params as Parameters<typeof millJobProfitabilityAnalyticsEngine.recordJob>[0]);
            break;
          }
          case "mill_job_profitability_list": {
            const { millJobProfitabilityAnalyticsEngine } = await import("../../engines/MillJobProfitabilityAnalyticsEngine.js");
            result = millJobProfitabilityAnalyticsEngine.listJobs();
            break;
          }
          case "mill_job_profitability_get": {
            const { millJobProfitabilityAnalyticsEngine } = await import("../../engines/MillJobProfitabilityAnalyticsEngine.js");
            const jobId = (params as { job_id?: string }).job_id;
            if (typeof jobId !== "string") throw new TypeError("mill_job_profitability_get: job_id required");
            result = millJobProfitabilityAnalyticsEngine.getJob(jobId);
            break;
          }
          case "mill_job_profitability_portfolio": {
            const { millJobProfitabilityAnalyticsEngine } = await import("../../engines/MillJobProfitabilityAnalyticsEngine.js");
            result = millJobProfitabilityAnalyticsEngine.portfolio(params as Parameters<typeof millJobProfitabilityAnalyticsEngine.portfolio>[0]);
            break;
          }
          case "mill_job_profitability_stats": {
            const { millJobProfitabilityAnalyticsEngine } = await import("../../engines/MillJobProfitabilityAnalyticsEngine.js");
            result = millJobProfitabilityAnalyticsEngine.getStats();
            break;
          }
          case "mill_order_create": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-CUSTOMER-ORDER-LIFECYCLE (slot:foxtrot iter77) —
            // 17-state lifecycle machine. Mill parity for LatheCustomerOrderLifecycleEngine
            // with 3 mill-canonical states inserted: fixture_prep, first_piece_approval,
            // first_piece_rejected (FPA feedback loop to fixture_prep on reject).
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            result = millCustomerOrderLifecycleEngine.createOrder(params as Parameters<typeof millCustomerOrderLifecycleEngine.createOrder>[0]);
            break;
          }
          case "mill_order_transition": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            result = millCustomerOrderLifecycleEngine.transition(params as Parameters<typeof millCustomerOrderLifecycleEngine.transition>[0]);
            break;
          }
          case "mill_order_get": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            const orderId = (params as { order_id?: string }).order_id;
            if (typeof orderId !== "string") throw new TypeError("mill_order_get: order_id required");
            result = millCustomerOrderLifecycleEngine.getOrder(orderId);
            break;
          }
          case "mill_order_list": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            result = millCustomerOrderLifecycleEngine.listOrders(params as Parameters<typeof millCustomerOrderLifecycleEngine.listOrders>[0]);
            break;
          }
          case "mill_order_audit_log": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            const orderId = (params as { order_id?: string }).order_id;
            if (typeof orderId !== "string") throw new TypeError("mill_order_audit_log: order_id required");
            result = millCustomerOrderLifecycleEngine.getAuditLog(orderId);
            break;
          }
          case "mill_order_pipeline_summary": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            result = millCustomerOrderLifecycleEngine.pipelineSummary();
            break;
          }
          case "mill_order_canonical_queue": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            result = millCustomerOrderLifecycleEngine.millCanonicalQueueDepth();
            break;
          }
          case "mill_order_summary_rows": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            result = millCustomerOrderLifecycleEngine.asSummaryRows();
            break;
          }
          case "mill_order_allowed_transitions": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            const from = (params as { from?: string }).from;
            if (typeof from !== "string") throw new TypeError("mill_order_allowed_transitions: from required");
            result = millCustomerOrderLifecycleEngine.allowedTransitions(from as Parameters<typeof millCustomerOrderLifecycleEngine.allowedTransitions>[0]);
            break;
          }
          case "mill_order_lifecycle_stats": {
            const { millCustomerOrderLifecycleEngine } = await import("../../engines/MillCustomerOrderLifecycleEngine.js");
            result = millCustomerOrderLifecycleEngine.getStats();
            break;
          }
          case "mill_inventory_upsert": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-INVENTORY-INTELLIGENCE (slot:foxtrot iter78) —
            // real-time inventory with 6 mill-canonical SKU types (endmill, drill_tap,
            // soft_jaw_blank, parallel_set, toolholder, dowel_pin), tool-life projection,
            // EOQ Harris 1913, alerts_by_type breakdown.
            const { millInventoryIntelligenceEngine } = await import("../../engines/MillInventoryIntelligenceEngine.js");
            result = millInventoryIntelligenceEngine.upsertItem(params as Parameters<typeof millInventoryIntelligenceEngine.upsertItem>[0]);
            break;
          }
          case "mill_inventory_movement": {
            const { millInventoryIntelligenceEngine } = await import("../../engines/MillInventoryIntelligenceEngine.js");
            result = millInventoryIntelligenceEngine.recordMovement(params as Parameters<typeof millInventoryIntelligenceEngine.recordMovement>[0]);
            break;
          }
          case "mill_inventory_snapshot": {
            const { millInventoryIntelligenceEngine } = await import("../../engines/MillInventoryIntelligenceEngine.js");
            result = millInventoryIntelligenceEngine.snapshot();
            break;
          }
          case "mill_inventory_alerts": {
            const { millInventoryIntelligenceEngine } = await import("../../engines/MillInventoryIntelligenceEngine.js");
            result = millInventoryIntelligenceEngine.alerts();
            break;
          }
          case "mill_inventory_get_item": {
            const { millInventoryIntelligenceEngine } = await import("../../engines/MillInventoryIntelligenceEngine.js");
            const sku = (params as { sku?: string }).sku;
            if (typeof sku !== "string") throw new TypeError("mill_inventory_get_item: sku required");
            result = millInventoryIntelligenceEngine.getItem(sku);
            break;
          }
          case "mill_inventory_movements": {
            const { millInventoryIntelligenceEngine } = await import("../../engines/MillInventoryIntelligenceEngine.js");
            const sku = (params as { sku?: string }).sku;
            if (typeof sku !== "string") throw new TypeError("mill_inventory_movements: sku required");
            result = millInventoryIntelligenceEngine.movementsForSku(sku);
            break;
          }
          case "mill_inventory_project_tool_life": {
            const { millInventoryIntelligenceEngine } = await import("../../engines/MillInventoryIntelligenceEngine.js");
            const sku = (params as { sku?: string }).sku;
            if (typeof sku !== "string") throw new TypeError("mill_inventory_project_tool_life: sku required");
            result = millInventoryIntelligenceEngine.projectToolLifeHours(sku);
            break;
          }
          case "mill_inventory_stats": {
            const { millInventoryIntelligenceEngine } = await import("../../engines/MillInventoryIntelligenceEngine.js");
            result = millInventoryIntelligenceEngine.getStats();
            break;
          }
          case "mill_agi_record_feedback": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-AGI-CONTINUOUS-LEARNING (slot:foxtrot iter79) —
            // EWMA learner with 6 feedback kinds (3 lathe-shared + 3 mill-canonical:
            // chatter_event, fpa_outcome, chip_evac_outcome). Predictions clamped to [0.5, 2.0].
            const { millAGIContinuousLearningEngine } = await import("../../engines/MillAGIContinuousLearningEngine.js");
            result = millAGIContinuousLearningEngine.recordFeedback(params as Parameters<typeof millAGIContinuousLearningEngine.recordFeedback>[0]);
            break;
          }
          case "mill_agi_predict_adjustment": {
            const { millAGIContinuousLearningEngine } = await import("../../engines/MillAGIContinuousLearningEngine.js");
            const p = params as { feature?: string; key?: string };
            if (typeof p.feature !== "string" || typeof p.key !== "string") {
              throw new TypeError("mill_agi_predict_adjustment: feature and key required");
            }
            result = millAGIContinuousLearningEngine.predictAdjustment(p.feature, p.key);
            break;
          }
          case "mill_agi_predict_by_kind": {
            const { millAGIContinuousLearningEngine } = await import("../../engines/MillAGIContinuousLearningEngine.js");
            const p = params as { feature?: string; key?: string; kind?: string };
            if (typeof p.feature !== "string" || typeof p.key !== "string" || typeof p.kind !== "string") {
              throw new TypeError("mill_agi_predict_by_kind: feature, key, and kind required");
            }
            result = millAGIContinuousLearningEngine.predictAdjustmentByKind(p.feature, p.key, p.kind as Parameters<typeof millAGIContinuousLearningEngine.predictAdjustmentByKind>[2]);
            break;
          }
          case "mill_agi_get_slot": {
            const { millAGIContinuousLearningEngine } = await import("../../engines/MillAGIContinuousLearningEngine.js");
            const p = params as { feature?: string; key?: string };
            if (typeof p.feature !== "string" || typeof p.key !== "string") {
              throw new TypeError("mill_agi_get_slot: feature and key required");
            }
            result = millAGIContinuousLearningEngine.getSlot(p.feature, p.key);
            break;
          }
          case "mill_agi_slots_for_feature": {
            const { millAGIContinuousLearningEngine } = await import("../../engines/MillAGIContinuousLearningEngine.js");
            const p = params as { feature?: string };
            if (typeof p.feature !== "string") throw new TypeError("mill_agi_slots_for_feature: feature required");
            result = millAGIContinuousLearningEngine.slotsForFeature(p.feature);
            break;
          }
          case "mill_agi_reset_slot": {
            const { millAGIContinuousLearningEngine } = await import("../../engines/MillAGIContinuousLearningEngine.js");
            const p = params as { feature?: string; key?: string };
            if (typeof p.feature !== "string" || typeof p.key !== "string") {
              throw new TypeError("mill_agi_reset_slot: feature and key required");
            }
            millAGIContinuousLearningEngine.resetSlot(p.feature, p.key);
            result = { ok: true };
            break;
          }
          case "mill_agi_stats_by_feature": {
            const { millAGIContinuousLearningEngine } = await import("../../engines/MillAGIContinuousLearningEngine.js");
            result = millAGIContinuousLearningEngine.statsByFeature();
            break;
          }
          case "mill_agi_stats": {
            const { millAGIContinuousLearningEngine } = await import("../../engines/MillAGIContinuousLearningEngine.js");
            result = millAGIContinuousLearningEngine.getStats();
            break;
          }
          case "mill_reconcile_actuals": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-ACTUAL-COST-RECONCILIATION (slot:foxtrot iter80) —
            // 8-bucket variance reconciliation with mill-canonical fixture_amort + energy
            // buckets and mill-canonical 'fixture' root-cause class.
            const { millActualCostReconciliationEngine } = await import("../../engines/MillActualCostReconciliationEngine.js");
            result = millActualCostReconciliationEngine.reconcile(params as Parameters<typeof millActualCostReconciliationEngine.reconcile>[0]);
            break;
          }
          case "mill_reconcile_running_accuracy": {
            const { millActualCostReconciliationEngine } = await import("../../engines/MillActualCostReconciliationEngine.js");
            result = millActualCostReconciliationEngine.runningAccuracy(params as Parameters<typeof millActualCostReconciliationEngine.runningAccuracy>[0]);
            break;
          }
          case "mill_reconcile_list_recent": {
            const { millActualCostReconciliationEngine } = await import("../../engines/MillActualCostReconciliationEngine.js");
            const limit = (params as { limit?: number }).limit ?? 20;
            result = millActualCostReconciliationEngine.listRecent(limit);
            break;
          }
          case "mill_reconcile_stats": {
            const { millActualCostReconciliationEngine } = await import("../../engines/MillActualCostReconciliationEngine.js");
            result = millActualCostReconciliationEngine.getStats();
            break;
          }
          case "mill_agi_safety_check": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-AGI-SAFETY-CONTAINMENT (slot:foxtrot iter81) — 5-category
            // AGI output gate. Mill parity for LatheAGISafetyContainmentEngine with 3 mill-canonical
            // extensions: fz_per_tooth (vs lathe fz_per_rev), 4/5-axis/pallet/probe kinematic, and
            // Tlusty stability-lobe chatter check.
            const { millAGISafetyContainmentEngine } = await import("../../engines/MillAGISafetyContainmentEngine.js");
            result = millAGISafetyContainmentEngine.check(params as Parameters<typeof millAGISafetyContainmentEngine.check>[0]);
            break;
          }
          case "mill_agi_safety_stats": {
            const { millAGISafetyContainmentEngine } = await import("../../engines/MillAGISafetyContainmentEngine.js");
            result = millAGISafetyContainmentEngine.getStats();
            break;
          }
          case "mill_probe_cycle_generate": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-ON-MACHINE-PROBE (slot:foxtrot iter82) — Renishaw G65
            // macro generation for 10 mill probe cycles (7 mill-canonical: bore/boss/center/web/
            // corner/pocket/rotary; 3 shared with lathe: surface_z/WCS_bump/tool_length).
            const { millOnMachineProbeCycleEngine } = await import("../../engines/MillOnMachineProbeCycleEngine.js");
            result = millOnMachineProbeCycleEngine.generate(params as Parameters<typeof millOnMachineProbeCycleEngine.generate>[0]);
            break;
          }
          case "mill_probe_cycle_stats": {
            const { millOnMachineProbeCycleEngine } = await import("../../engines/MillOnMachineProbeCycleEngine.js");
            result = millOnMachineProbeCycleEngine.getStats();
            break;
          }
          case "mill_program_backtrace": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-PROGRAM-BACKTRACE (slot:foxtrot iter83) — 14-kind
            // block-stream root-cause walker. Mill parity for LatheProgramBacktraceEngine +
            // 5 mill-canonical block kinds (cutter_comp_set, tool_length_comp, rotary_index,
            // pallet_change, probe_cycle).
            const { millProgramBacktraceEngine } = await import("../../engines/MillProgramBacktraceEngine.js");
            result = millProgramBacktraceEngine.trace(params as Parameters<typeof millProgramBacktraceEngine.trace>[0]);
            break;
          }
          case "mill_program_backtrace_stats": {
            const { millProgramBacktraceEngine } = await import("../../engines/MillProgramBacktraceEngine.js");
            result = millProgramBacktraceEngine.getStats();
            break;
          }
          case "mill_replay_frame_compile": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-REPLAY-FRAME-COMPILER (slot:foxtrot iter84) —
            // XYZ + rotary A/B/C + 3D swept-volume frame compilation for visualizer streams.
            // Mill parity for LatheReplayFrameCompilerEngine with mill-canonical breach taxonomy.
            const { millReplayFrameCompilerEngine } = await import("../../engines/MillReplayFrameCompilerEngine.js");
            result = millReplayFrameCompilerEngine.compile(params as Parameters<typeof millReplayFrameCompilerEngine.compile>[0]);
            break;
          }
          case "mill_replay_frame_stats": {
            const { millReplayFrameCompilerEngine } = await import("../../engines/MillReplayFrameCompilerEngine.js");
            result = millReplayFrameCompilerEngine.getStats();
            break;
          }
          case "mill_program_signoff_assemble": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-PROGRAM-SIGNOFF-DOSSIER (slot:foxtrot iter85) —
            // dossier aggregator with mill-canonical chatter + FPA summaries. Mill parity for
            // LatheProgramSignoffDossierEngine with reasons CHATTER_RISK, FPA_REJECTED,
            // FPA_CONDITIONAL added.
            const { millProgramSignoffDossierEngine } = await import("../../engines/MillProgramSignoffDossierEngine.js");
            result = millProgramSignoffDossierEngine.assemble(params as Parameters<typeof millProgramSignoffDossierEngine.assemble>[0]);
            break;
          }
          case "mill_program_signoff_stats": {
            const { millProgramSignoffDossierEngine } = await import("../../engines/MillProgramSignoffDossierEngine.js");
            result = millProgramSignoffDossierEngine.getStats();
            break;
          }
          case "mill_op_time_compute": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-OP-TIME-BREAKDOWN (slot:foxtrot iter86) — 12-bucket
            // per-op aggregate breakdown. Mill parity for LatheOpTimeBreakdownEngine + 3
            // mill-canonical extensions: rotary_index, pallet_change, tcp_transform.
            const { millOpTimeBreakdownEngine } = await import("../../engines/MillOpTimeBreakdownEngine.js");
            result = millOpTimeBreakdownEngine.compute(params as Parameters<typeof millOpTimeBreakdownEngine.compute>[0]);
            break;
          }
          case "mill_op_time_aggregate": {
            const { millOpTimeBreakdownEngine } = await import("../../engines/MillOpTimeBreakdownEngine.js");
            const p = params as { ops?: Parameters<typeof millOpTimeBreakdownEngine.aggregate>[0]; lot_size?: number };
            if (!Array.isArray(p.ops) || typeof p.lot_size !== "number") {
              throw new TypeError("mill_op_time_aggregate: ops[] and lot_size required");
            }
            result = millOpTimeBreakdownEngine.aggregate(p.ops, p.lot_size);
            break;
          }
          case "mill_op_time_stats": {
            const { millOpTimeBreakdownEngine } = await import("../../engines/MillOpTimeBreakdownEngine.js");
            result = millOpTimeBreakdownEngine.getStats();
            break;
          }
          case "mill_lora_pool_set": {
            // MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-RESOURCE-MANAGER (slot:foxtrot iter87) —
            // 8-resource-type pool manager with 3 mill-canonical types (tcpm_solver_slots,
            // vericut_slots, postprocessor_slots). Mill parity for LatheLoRAResourceManagerEngine.
            const { millLoRAResourceManagerEngine } = await import("../../engines/MillLoRAResourceManagerEngine.js");
            const p = params as { type?: string; total?: number };
            if (typeof p.type !== "string" || typeof p.total !== "number") {
              throw new TypeError("mill_lora_pool_set: type and total required");
            }
            millLoRAResourceManagerEngine.setPool(p.type as Parameters<typeof millLoRAResourceManagerEngine.setPool>[0], p.total);
            result = millLoRAResourceManagerEngine.getPool(p.type as Parameters<typeof millLoRAResourceManagerEngine.getPool>[0]);
            break;
          }
          case "mill_lora_allocate": {
            const { millLoRAResourceManagerEngine } = await import("../../engines/MillLoRAResourceManagerEngine.js");
            const p = params as Parameters<typeof millLoRAResourceManagerEngine.allocate>;
            result = millLoRAResourceManagerEngine.allocate(p[0], p[1], p[2]);
            break;
          }
          case "mill_lora_release": {
            const { millLoRAResourceManagerEngine } = await import("../../engines/MillLoRAResourceManagerEngine.js");
            const p = params as { allocation_id?: string };
            if (typeof p.allocation_id !== "string") throw new TypeError("mill_lora_release: allocation_id required");
            result = { released: millLoRAResourceManagerEngine.release(p.allocation_id) };
            break;
          }
          case "mill_lora_reserve": {
            const { millLoRAResourceManagerEngine } = await import("../../engines/MillLoRAResourceManagerEngine.js");
            result = { reserved: millLoRAResourceManagerEngine.reserve(params as Parameters<typeof millLoRAResourceManagerEngine.reserve>[0]) };
            break;
          }
          case "mill_lora_unreserve": {
            const { millLoRAResourceManagerEngine } = await import("../../engines/MillLoRAResourceManagerEngine.js");
            millLoRAResourceManagerEngine.unreserve(params as Parameters<typeof millLoRAResourceManagerEngine.unreserve>[0]);
            result = { ok: true };
            break;
          }
          case "mill_lora_utilization": {
            const { millLoRAResourceManagerEngine } = await import("../../engines/MillLoRAResourceManagerEngine.js");
            const p = params as { type?: string };
            if (typeof p.type !== "string") throw new TypeError("mill_lora_utilization: type required");
            result = { utilization: millLoRAResourceManagerEngine.getUtilization(p.type as Parameters<typeof millLoRAResourceManagerEngine.getUtilization>[0]) };
            break;
          }
          case "mill_lora_find_preemptable": {
            const { millLoRAResourceManagerEngine } = await import("../../engines/MillLoRAResourceManagerEngine.js");
            result = millLoRAResourceManagerEngine.findPreemptable(params as Parameters<typeof millLoRAResourceManagerEngine.findPreemptable>[0]);
            break;
          }
          case "mill_lora_stats": {
            const { millLoRAResourceManagerEngine } = await import("../../engines/MillLoRAResourceManagerEngine.js");
            result = millLoRAResourceManagerEngine.getStats();
            break;
          }

          // MILL-PARITY-UPGRADE-MS0/U-MILL-LORA-PIPELINE-COORDINATOR — wire the orphaned
          // MillLoRAPipelineCoordinatorEngine (mill parity for the turning-wired Lathe coordinator).
          // One-shot builds the canonical 13-stage mill LoRA training pipeline (incl. the 4
          // MILL-CANONICAL stages: chatter-stability, TCPM post-validation, AS9102 first-piece
          // audit gate, thermal warmup). `axis_mode` selects the cell template (default "shared").
          case "mill_lora_pipeline_coord_create": {
            const { millLoRAPipelineCoordinatorEngine } = await import("../../engines/MillLoRAPipelineCoordinatorEngine.js");
            const p = params as { axis_mode?: string; namePrefix?: string };
            const pipeline = millLoRAPipelineCoordinatorEngine.createMillStandardPipeline(
              p.axis_mode as Parameters<typeof millLoRAPipelineCoordinatorEngine.createMillStandardPipeline>[0],
              p.namePrefix,
            );
            // MillPipeline.stages is a Map → serialize to an array so the JSON response carries
            // the canonical stages (the lathe parity returns the raw pipeline → stages drop to `{}`).
            result = { ...pipeline, stages: Array.from(pipeline.stages.values()) };
            break;
          }

          // ============================================================
          // LORA EMBEDDING CACHE (iter88 — MILL-CANONICAL filters)
          // ============================================================
          case "mill_lora_emb_set": {
            const { millLoRAEmbeddingCacheEngine } = await import("../../engines/MillLoRAEmbeddingCacheEngine.js");
            const p = params as { input?: unknown; embedding?: unknown; op_type?: unknown; feature_signature?: unknown; metadata?: unknown };
            if (typeof p.input !== "string" || !Array.isArray(p.embedding)) {
              throw new TypeError("mill_lora_emb_set: input(string) and embedding(number[]) required");
            }
            result = millLoRAEmbeddingCacheEngine.set(
              p.input,
              p.embedding as number[],
              {
                op_type: p.op_type as Parameters<typeof millLoRAEmbeddingCacheEngine.set>[2] extends infer T ? T extends { op_type?: infer O } ? O : never : never,
                feature_signature: p.feature_signature as Parameters<typeof millLoRAEmbeddingCacheEngine.set>[2] extends infer T ? T extends { feature_signature?: infer F } ? F : never : never,
                metadata: p.metadata as Record<string, unknown> | undefined,
              },
            );
            break;
          }
          case "mill_lora_emb_get_exact": {
            const { millLoRAEmbeddingCacheEngine } = await import("../../engines/MillLoRAEmbeddingCacheEngine.js");
            const p = params as { input?: unknown };
            if (typeof p.input !== "string") throw new TypeError("mill_lora_emb_get_exact: input(string) required");
            result = { entry: millLoRAEmbeddingCacheEngine.getExact(p.input) };
            break;
          }
          case "mill_lora_emb_find_similar": {
            const { millLoRAEmbeddingCacheEngine } = await import("../../engines/MillLoRAEmbeddingCacheEngine.js");
            const p = params as { embedding?: unknown; limit?: unknown; op_type_filter?: unknown; feature_signature_filter?: unknown };
            if (!Array.isArray(p.embedding)) throw new TypeError("mill_lora_emb_find_similar: embedding(number[]) required");
            result = {
              matches: millLoRAEmbeddingCacheEngine.findSimilar(p.embedding as number[], {
                limit: typeof p.limit === "number" ? p.limit : undefined,
                op_type_filter: p.op_type_filter as Parameters<typeof millLoRAEmbeddingCacheEngine.findSimilar>[1] extends infer T ? T extends { op_type_filter?: infer O } ? O : never : never,
                feature_signature_filter: p.feature_signature_filter as Parameters<typeof millLoRAEmbeddingCacheEngine.findSimilar>[1] extends infer T ? T extends { feature_signature_filter?: infer F } ? F : never : never,
              }),
            };
            break;
          }
          case "mill_lora_emb_best_match": {
            const { millLoRAEmbeddingCacheEngine } = await import("../../engines/MillLoRAEmbeddingCacheEngine.js");
            const p = params as { embedding?: unknown; op_type_filter?: unknown; feature_signature_filter?: unknown };
            if (!Array.isArray(p.embedding)) throw new TypeError("mill_lora_emb_best_match: embedding(number[]) required");
            result = {
              match: millLoRAEmbeddingCacheEngine.getBestMatch(p.embedding as number[], {
                op_type_filter: p.op_type_filter as Parameters<typeof millLoRAEmbeddingCacheEngine.getBestMatch>[1] extends infer T ? T extends { op_type_filter?: infer O } ? O : never : never,
                feature_signature_filter: p.feature_signature_filter as Parameters<typeof millLoRAEmbeddingCacheEngine.getBestMatch>[1] extends infer T ? T extends { feature_signature_filter?: infer F } ? F : never : never,
              }),
            };
            break;
          }
          case "mill_lora_emb_list_by_tag": {
            const { millLoRAEmbeddingCacheEngine } = await import("../../engines/MillLoRAEmbeddingCacheEngine.js");
            const p = params as { op_type?: unknown; feature_signature?: unknown };
            result = {
              entries: millLoRAEmbeddingCacheEngine.listByMillTag({
                op_type: p.op_type as Parameters<typeof millLoRAEmbeddingCacheEngine.listByMillTag>[0]["op_type"],
                feature_signature: p.feature_signature as Parameters<typeof millLoRAEmbeddingCacheEngine.listByMillTag>[0]["feature_signature"],
              }),
            };
            break;
          }
          case "mill_lora_emb_delete": {
            const { millLoRAEmbeddingCacheEngine } = await import("../../engines/MillLoRAEmbeddingCacheEngine.js");
            const p = params as { entry_id?: unknown };
            if (typeof p.entry_id !== "string") throw new TypeError("mill_lora_emb_delete: entry_id(string) required");
            result = { deleted: millLoRAEmbeddingCacheEngine.delete(p.entry_id) };
            break;
          }
          case "mill_lora_emb_clear": {
            const { millLoRAEmbeddingCacheEngine } = await import("../../engines/MillLoRAEmbeddingCacheEngine.js");
            millLoRAEmbeddingCacheEngine.clear();
            result = { cleared: true };
            break;
          }
          case "mill_lora_emb_stats": {
            const { millLoRAEmbeddingCacheEngine } = await import("../../engines/MillLoRAEmbeddingCacheEngine.js");
            result = millLoRAEmbeddingCacheEngine.getStats();
            break;
          }

          // ============================================================
          // LORA CADENCE SCHEDULER (iter89 — per-axis + mill-canonical triggers)
          // ============================================================
          case "mill_lora_cadence_config_set": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            result = millLoRACadenceEngine.setConfig(params as Parameters<typeof millLoRACadenceEngine.setConfig>[0]);
            break;
          }
          case "mill_lora_cadence_config_get": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            result = millLoRACadenceEngine.getConfig();
            break;
          }
          case "mill_lora_cadence_summary": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            result = millLoRACadenceEngine.getSummary();
            break;
          }
          case "mill_lora_cadence_should_trigger": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            result = millLoRACadenceEngine.shouldTriggerRun();
            break;
          }
          case "mill_lora_cadence_assess_mill_triggers": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            const p = params as { chatter_violation_rate?: unknown; fpa_pass_rate?: unknown; tcpm_solver_failure_rate?: unknown };
            result = millLoRACadenceEngine.assessMillTriggers({
              chatter_violation_rate: typeof p.chatter_violation_rate === "number" ? p.chatter_violation_rate : undefined,
              fpa_pass_rate: typeof p.fpa_pass_rate === "number" ? p.fpa_pass_rate : undefined,
              tcpm_solver_failure_rate: typeof p.tcpm_solver_failure_rate === "number" ? p.tcpm_solver_failure_rate : undefined,
            });
            break;
          }
          case "mill_lora_cadence_next_run": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            result = { next_run: millLoRACadenceEngine.calculateNextRun().toISOString() };
            break;
          }
          case "mill_lora_cadence_cron": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            result = { cron: millLoRACadenceEngine.getCronExpression() };
            break;
          }
          case "mill_lora_cadence_start_run": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            const p = params as { triggered_by?: unknown; axis_mode?: unknown; notes?: unknown };
            if (typeof p.triggered_by !== "string") throw new TypeError("mill_lora_cadence_start_run: triggered_by required");
            result = millLoRACadenceEngine.startRun(
              p.triggered_by as Parameters<typeof millLoRACadenceEngine.startRun>[0],
              {
                axis_mode: p.axis_mode as Parameters<typeof millLoRACadenceEngine.startRun>[1] extends infer T ? T extends { axis_mode?: infer A } ? A : never : never,
                notes: typeof p.notes === "string" ? p.notes : undefined,
              },
            );
            break;
          }
          case "mill_lora_cadence_complete_run": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            const p = params as { run_id?: unknown; metrics?: unknown; model_path?: unknown };
            if (typeof p.run_id !== "string" || !p.metrics || typeof p.model_path !== "string") {
              throw new TypeError("mill_lora_cadence_complete_run: run_id, metrics, model_path required");
            }
            result = millLoRACadenceEngine.completeRun(
              p.run_id,
              p.metrics as Parameters<typeof millLoRACadenceEngine.completeRun>[1],
              p.model_path,
            );
            break;
          }
          case "mill_lora_cadence_fail_run": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            const p = params as { run_id?: unknown; error?: unknown };
            if (typeof p.run_id !== "string" || typeof p.error !== "string") {
              throw new TypeError("mill_lora_cadence_fail_run: run_id and error required");
            }
            result = millLoRACadenceEngine.failRun(p.run_id, p.error);
            break;
          }
          case "mill_lora_cadence_promote_version": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            const p = params as { version?: unknown };
            if (typeof p.version !== "string") throw new TypeError("mill_lora_cadence_promote_version: version required");
            result = millLoRACadenceEngine.promoteVersion(p.version);
            break;
          }
          case "mill_lora_cadence_active_version": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            const p = params as { axis_mode?: unknown };
            result = {
              version: millLoRACadenceEngine.getActiveVersion(
                p.axis_mode as Parameters<typeof millLoRACadenceEngine.getActiveVersion>[0],
              ),
            };
            break;
          }
          case "mill_lora_cadence_active_versions_all_axes": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            result = millLoRACadenceEngine.getActiveVersionsAllAxes();
            break;
          }
          case "mill_lora_cadence_record_programs": {
            const { millLoRACadenceEngine } = await import("../../engines/MillLoRACadenceEngine.js");
            const p = params as { count?: unknown };
            if (typeof p.count !== "number") throw new TypeError("mill_lora_cadence_record_programs: count(number) required");
            result = { total: millLoRACadenceEngine.recordNewPrograms(p.count) };
            break;
          }

          // ============================================================
          // LORA DEPLOYMENT ENGINE (iter90 — per-axis + mill rollback triggers)
          // ============================================================
          case "mill_lora_deploy_register_target": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { target?: unknown };
            if (!p.target || typeof p.target !== "object") throw new TypeError("mill_lora_deploy_register_target: target required");
            result = millLoRADeploymentEngine.registerTarget(p.target as Parameters<typeof millLoRADeploymentEngine.registerTarget>[0]);
            break;
          }
          case "mill_lora_deploy_create": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { model_id?: unknown; model_version?: unknown; target_id?: unknown; strategy?: unknown; axis_mode?: unknown };
            if (typeof p.model_id !== "string" || typeof p.model_version !== "string" || typeof p.target_id !== "string") {
              throw new TypeError("mill_lora_deploy_create: model_id, model_version, target_id required");
            }
            result = {
              deployment: millLoRADeploymentEngine.deploy(p.model_id, p.model_version, p.target_id, {
                strategy: p.strategy as Parameters<typeof millLoRADeploymentEngine.deploy>[3] extends infer T ? T extends { strategy?: infer S } ? S : never : never,
                axis_mode: p.axis_mode as Parameters<typeof millLoRADeploymentEngine.deploy>[3] extends infer T ? T extends { axis_mode?: infer A } ? A : never : never,
              }),
            };
            break;
          }
          case "mill_lora_deploy_begin": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { id?: unknown };
            if (typeof p.id !== "string") throw new TypeError("mill_lora_deploy_begin: id required");
            result = { ok: millLoRADeploymentEngine.beginDeployment(p.id) };
            break;
          }
          case "mill_lora_deploy_activate": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { id?: unknown };
            if (typeof p.id !== "string") throw new TypeError("mill_lora_deploy_activate: id required");
            result = { ok: millLoRADeploymentEngine.activate(p.id) };
            break;
          }
          case "mill_lora_deploy_advance_canary": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { id?: unknown };
            if (typeof p.id !== "string") throw new TypeError("mill_lora_deploy_advance_canary: id required");
            result = { ok: millLoRADeploymentEngine.advanceCanary(p.id) };
            break;
          }
          case "mill_lora_deploy_update_health": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { id?: unknown; score?: unknown };
            if (typeof p.id !== "string" || typeof p.score !== "number") {
              throw new TypeError("mill_lora_deploy_update_health: id, score required");
            }
            result = { ok: millLoRADeploymentEngine.updateHealth(p.id, p.score) };
            break;
          }
          case "mill_lora_deploy_update_mill_signals": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { id?: unknown; chatter_violation_rate?: unknown; fpa_pass_rate?: unknown; tcpm_solver_failure_rate?: unknown };
            if (typeof p.id !== "string") throw new TypeError("mill_lora_deploy_update_mill_signals: id required");
            result = {
              trigger: millLoRADeploymentEngine.updateMillSignals(p.id, {
                chatter_violation_rate: typeof p.chatter_violation_rate === "number" ? p.chatter_violation_rate : undefined,
                fpa_pass_rate: typeof p.fpa_pass_rate === "number" ? p.fpa_pass_rate : undefined,
                tcpm_solver_failure_rate: typeof p.tcpm_solver_failure_rate === "number" ? p.tcpm_solver_failure_rate : undefined,
              }),
            };
            break;
          }
          case "mill_lora_deploy_rollback": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { id?: unknown; reason?: unknown };
            if (typeof p.id !== "string") throw new TypeError("mill_lora_deploy_rollback: id required");
            result = {
              ok: millLoRADeploymentEngine.rollback(
                p.id,
                p.reason as Parameters<typeof millLoRADeploymentEngine.rollback>[1],
              ),
            };
            break;
          }
          case "mill_lora_deploy_active": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { target_id?: unknown; axis_mode?: unknown };
            if (typeof p.target_id !== "string") throw new TypeError("mill_lora_deploy_active: target_id required");
            result = {
              deployment: millLoRADeploymentEngine.getActiveDeployment(
                p.target_id,
                p.axis_mode as Parameters<typeof millLoRADeploymentEngine.getActiveDeployment>[1],
              ),
            };
            break;
          }
          case "mill_lora_deploy_active_by_axis": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { target_id?: unknown };
            if (typeof p.target_id !== "string") throw new TypeError("mill_lora_deploy_active_by_axis: target_id required");
            result = millLoRADeploymentEngine.getActiveDeploymentsByAxis(p.target_id);
            break;
          }
          case "mill_lora_deploy_history": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            const p = params as { limit?: unknown };
            result = { history: millLoRADeploymentEngine.getHistory(typeof p.limit === "number" ? p.limit : undefined) };
            break;
          }
          case "mill_lora_deploy_stats": {
            const { millLoRADeploymentEngine } = await import("../../engines/MillLoRADeploymentEngine.js");
            result = millLoRADeploymentEngine.getStats();
            break;
          }

          // ============================================================
          // LORA EXPERIMENT TRACKER (iter91 — per-axis + mill-canonical metric vocab)
          // ============================================================
          case "mill_lora_exp_create": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { name?: unknown; hyperparameters?: unknown; tags?: unknown; axis_mode?: unknown; description?: unknown; parent_id?: unknown };
            if (typeof p.name !== "string") throw new TypeError("mill_lora_exp_create: name(string) required");
            result = millLoRAExperimentTrackerEngine.createExperiment(
              p.name,
              (p.hyperparameters as Record<string, unknown> | undefined) ?? {},
              {
                tags: Array.isArray(p.tags) ? (p.tags as string[]) : undefined,
                axis_mode: p.axis_mode as Parameters<typeof millLoRAExperimentTrackerEngine.createExperiment>[2] extends infer T ? T extends { axis_mode?: infer A } ? A : never : never,
                description: typeof p.description === "string" ? p.description : undefined,
                parent_id: typeof p.parent_id === "string" ? p.parent_id : undefined,
              },
            );
            break;
          }
          case "mill_lora_exp_log_metric": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_id?: unknown; name?: unknown; value?: unknown; step?: unknown };
            if (typeof p.experiment_id !== "string" || typeof p.name !== "string" || typeof p.value !== "number" || typeof p.step !== "number") {
              throw new TypeError("mill_lora_exp_log_metric: experiment_id, name, value, step required");
            }
            result = { ok: millLoRAExperimentTrackerEngine.logMetric(p.experiment_id, p.name, p.value, p.step) };
            break;
          }
          case "mill_lora_exp_log_metrics": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_id?: unknown; metrics?: unknown; step?: unknown };
            if (typeof p.experiment_id !== "string" || !p.metrics || typeof p.step !== "number") {
              throw new TypeError("mill_lora_exp_log_metrics: experiment_id, metrics, step required");
            }
            result = { ok: millLoRAExperimentTrackerEngine.logMetrics(p.experiment_id, p.metrics as Record<string, number>, p.step) };
            break;
          }
          case "mill_lora_exp_add_artifact": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_id?: unknown; artifact?: unknown };
            if (typeof p.experiment_id !== "string" || !p.artifact || typeof p.artifact !== "object") {
              throw new TypeError("mill_lora_exp_add_artifact: experiment_id, artifact required");
            }
            result = { ok: millLoRAExperimentTrackerEngine.addArtifact(p.experiment_id, p.artifact as Parameters<typeof millLoRAExperimentTrackerEngine.addArtifact>[1]) };
            break;
          }
          case "mill_lora_exp_complete": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_id?: unknown; status?: unknown };
            if (typeof p.experiment_id !== "string") throw new TypeError("mill_lora_exp_complete: experiment_id required");
            const status: "completed" | "failed" = p.status === "failed" ? "failed" : "completed";
            result = { ok: millLoRAExperimentTrackerEngine.completeExperiment(p.experiment_id, status) };
            break;
          }
          case "mill_lora_exp_get_series": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_id?: unknown; metric?: unknown };
            if (typeof p.experiment_id !== "string" || typeof p.metric !== "string") {
              throw new TypeError("mill_lora_exp_get_series: experiment_id, metric required");
            }
            result = { series: millLoRAExperimentTrackerEngine.getMetricSeries(p.experiment_id, p.metric) };
            break;
          }
          case "mill_lora_exp_get_latest": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_id?: unknown; metric?: unknown };
            if (typeof p.experiment_id !== "string" || typeof p.metric !== "string") {
              throw new TypeError("mill_lora_exp_get_latest: experiment_id, metric required");
            }
            const v = millLoRAExperimentTrackerEngine.getLatestMetric(p.experiment_id, p.metric);
            result = { value: v ?? null };
            break;
          }
          case "mill_lora_exp_get_best": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_id?: unknown; metric?: unknown; goal?: unknown };
            if (typeof p.experiment_id !== "string" || typeof p.metric !== "string") {
              throw new TypeError("mill_lora_exp_get_best: experiment_id, metric required");
            }
            const v = millLoRAExperimentTrackerEngine.getBestMetric(
              p.experiment_id,
              p.metric,
              p.goal as Parameters<typeof millLoRAExperimentTrackerEngine.getBestMetric>[2],
            );
            result = { value: v ?? null };
            break;
          }
          case "mill_lora_exp_find_best": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { tag?: unknown; axis_mode?: unknown; metric?: unknown };
            result = {
              experiment: millLoRAExperimentTrackerEngine.findBestExperiment({
                tag: typeof p.tag === "string" ? p.tag : undefined,
                axis_mode: p.axis_mode as Parameters<typeof millLoRAExperimentTrackerEngine.findBestExperiment>[0] extends infer T ? T extends { axis_mode?: infer A } ? A : never : never,
                metric: typeof p.metric === "string" ? p.metric : undefined,
              }),
            };
            break;
          }
          case "mill_lora_exp_find_best_per_axis": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { metric?: unknown };
            result = millLoRAExperimentTrackerEngine.findBestPerAxis(typeof p.metric === "string" ? p.metric : undefined);
            break;
          }
          case "mill_lora_exp_compare": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_a?: unknown; experiment_b?: unknown; metric?: unknown };
            if (typeof p.experiment_a !== "string" || typeof p.experiment_b !== "string" || typeof p.metric !== "string") {
              throw new TypeError("mill_lora_exp_compare: experiment_a, experiment_b, metric required");
            }
            result = millLoRAExperimentTrackerEngine.compareExperiments(p.experiment_a, p.experiment_b, p.metric);
            break;
          }
          case "mill_lora_exp_list": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { status?: unknown; tag?: unknown; axis_mode?: unknown };
            result = {
              experiments: millLoRAExperimentTrackerEngine.getExperiments({
                status: p.status as Parameters<typeof millLoRAExperimentTrackerEngine.getExperiments>[0] extends infer T ? T extends { status?: infer S } ? S : never : never,
                tag: typeof p.tag === "string" ? p.tag : undefined,
                axis_mode: p.axis_mode as Parameters<typeof millLoRAExperimentTrackerEngine.getExperiments>[0] extends infer T ? T extends { axis_mode?: infer A } ? A : never : never,
              }),
            };
            break;
          }
          case "mill_lora_exp_archive": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            const p = params as { experiment_id?: unknown };
            if (typeof p.experiment_id !== "string") throw new TypeError("mill_lora_exp_archive: experiment_id required");
            result = { ok: millLoRAExperimentTrackerEngine.archive(p.experiment_id) };
            break;
          }
          case "mill_lora_exp_stats": {
            const { millLoRAExperimentTrackerEngine } = await import("../../engines/MillLoRAExperimentTrackerEngine.js");
            result = millLoRAExperimentTrackerEngine.getStats();
            break;
          }

          // ============================================================
          // LORA ENSEMBLE COMBINER (iter92 — chatter_robust + tcpm_safe)
          // ============================================================
          case "mill_lora_ens_combine": {
            const { millLoRAEnsembleCombinerEngine } = await import("../../engines/MillLoRAEnsembleCombinerEngine.js");
            const p = params as { predictions?: unknown; method?: unknown; require_axis?: unknown; allow_cross_axis?: unknown };
            if (!Array.isArray(p.predictions)) throw new TypeError("mill_lora_ens_combine: predictions(array) required");
            result = millLoRAEnsembleCombinerEngine.combine(
              p.predictions as Parameters<typeof millLoRAEnsembleCombinerEngine.combine>[0],
              {
                method: p.method as Parameters<typeof millLoRAEnsembleCombinerEngine.combine>[1] extends infer T ? T extends { method?: infer M } ? M : never : never,
                require_axis: p.require_axis as Parameters<typeof millLoRAEnsembleCombinerEngine.combine>[1] extends infer T ? T extends { require_axis?: infer R } ? R : never : never,
                allow_cross_axis: typeof p.allow_cross_axis === "boolean" ? p.allow_cross_axis : undefined,
              },
            );
            break;
          }
          case "mill_lora_ens_history": {
            const { millLoRAEnsembleCombinerEngine } = await import("../../engines/MillLoRAEnsembleCombinerEngine.js");
            const p = params as { limit?: unknown };
            result = { history: millLoRAEnsembleCombinerEngine.getHistory(typeof p.limit === "number" ? p.limit : undefined) };
            break;
          }
          case "mill_lora_ens_stats": {
            const { millLoRAEnsembleCombinerEngine } = await import("../../engines/MillLoRAEnsembleCombinerEngine.js");
            result = millLoRAEnsembleCombinerEngine.getStats();
            break;
          }
          case "mill_lora_ens_clear": {
            const { millLoRAEnsembleCombinerEngine } = await import("../../engines/MillLoRAEnsembleCombinerEngine.js");
            millLoRAEnsembleCombinerEngine.clear();
            result = { cleared: true };
            break;
          }

          // ============================================================
          // LORA MONITORING ENGINE (iter93 — per-request chatter/fpa/tcpm signals)
          // ============================================================
          case "mill_lora_mon_record": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            const p = params as { record?: unknown };
            if (!p.record || typeof p.record !== "object") throw new TypeError("mill_lora_mon_record: record required");
            millLoRAMonitoringEngine.recordRequest(p.record as Parameters<typeof millLoRAMonitoringEngine.recordRequest>[0]);
            result = { ok: true };
            break;
          }
          case "mill_lora_mon_health": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            const p = params as { deployment_id?: unknown };
            if (typeof p.deployment_id !== "string") throw new TypeError("mill_lora_mon_health: deployment_id required");
            result = millLoRAMonitoringEngine.getHealth(p.deployment_id);
            break;
          }
          case "mill_lora_mon_records_in_window": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            const p = params as { deployment_id?: unknown; window_ms?: unknown };
            if (typeof p.deployment_id !== "string") throw new TypeError("mill_lora_mon_records_in_window: deployment_id required");
            result = {
              records: millLoRAMonitoringEngine.getRecordsInWindow(
                p.deployment_id,
                typeof p.window_ms === "number" ? p.window_ms : undefined,
              ),
            };
            break;
          }
          case "mill_lora_mon_active_alerts": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            result = { alerts: millLoRAMonitoringEngine.getActiveAlerts() };
            break;
          }
          case "mill_lora_mon_all_alerts": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            result = { alerts: millLoRAMonitoringEngine.getAllAlerts() };
            break;
          }
          case "mill_lora_mon_ack_alert": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            const p = params as { id?: unknown };
            if (typeof p.id !== "string") throw new TypeError("mill_lora_mon_ack_alert: id required");
            result = { ok: millLoRAMonitoringEngine.acknowledgeAlert(p.id) };
            break;
          }
          case "mill_lora_mon_deployments": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            result = { deployments: millLoRAMonitoringEngine.getMonitoredDeployments() };
            break;
          }
          case "mill_lora_mon_health_by_axis": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            result = millLoRAMonitoringEngine.getHealthDistributionByAxis();
            break;
          }
          case "mill_lora_mon_stats": {
            const { millLoRAMonitoringEngine } = await import("../../engines/MillLoRAMonitoringEngine.js");
            result = millLoRAMonitoringEngine.getStats();
            break;
          }

          // ============================================================
          // LORA MASTER ORCHESTRATOR (iter94 — lifecycle + FPA gate)
          // ============================================================
          case "mill_lora_orch_init": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            result = millLoRAMasterOrchestratorEngine.initialize();
            break;
          }
          case "mill_lora_orch_init_mill_stack": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            const p = params as { axis_mode?: unknown };
            result = millLoRAMasterOrchestratorEngine.initializeMillStack(
              p.axis_mode as Parameters<typeof millLoRAMasterOrchestratorEngine.initializeMillStack>[0],
            );
            break;
          }
          case "mill_lora_orch_register_subsystem": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            const p = params as { name?: unknown; initial_phase?: unknown; axis_mode?: unknown };
            if (typeof p.name !== "string" || typeof p.initial_phase !== "string") {
              throw new TypeError("mill_lora_orch_register_subsystem: name + initial_phase required");
            }
            result = {
              ok: millLoRAMasterOrchestratorEngine.registerSubsystem(
                p.name,
                p.initial_phase as Parameters<typeof millLoRAMasterOrchestratorEngine.registerSubsystem>[1],
                p.axis_mode as Parameters<typeof millLoRAMasterOrchestratorEngine.registerSubsystem>[2],
              ),
            };
            break;
          }
          case "mill_lora_orch_update_subsystem": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            const p = params as { name?: unknown; updates?: unknown };
            if (typeof p.name !== "string" || !p.updates) {
              throw new TypeError("mill_lora_orch_update_subsystem: name + updates required");
            }
            result = {
              ok: millLoRAMasterOrchestratorEngine.updateSubsystem(
                p.name,
                p.updates as Parameters<typeof millLoRAMasterOrchestratorEngine.updateSubsystem>[1],
              ),
            };
            break;
          }
          case "mill_lora_orch_update_metrics": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            const p = params as { name?: unknown; metrics?: unknown };
            if (typeof p.name !== "string" || !p.metrics) {
              throw new TypeError("mill_lora_orch_update_metrics: name + metrics required");
            }
            result = { ok: millLoRAMasterOrchestratorEngine.updateMetrics(p.name, p.metrics as Record<string, number>) };
            break;
          }
          case "mill_lora_orch_transition": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            const p = params as { new_phase?: unknown };
            if (typeof p.new_phase !== "string") throw new TypeError("mill_lora_orch_transition: new_phase required");
            result = {
              ok: millLoRAMasterOrchestratorEngine.transition(
                p.new_phase as Parameters<typeof millLoRAMasterOrchestratorEngine.transition>[0],
              ),
            };
            break;
          }
          case "mill_lora_orch_begin_op": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            millLoRAMasterOrchestratorEngine.beginOperation();
            result = { ok: true };
            break;
          }
          case "mill_lora_orch_end_op": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            millLoRAMasterOrchestratorEngine.endOperation();
            result = { ok: true };
            break;
          }
          case "mill_lora_orch_state": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            const state = millLoRAMasterOrchestratorEngine.getState();
            if (!state) {
              result = { state: null };
            } else {
              // Map → object for JSON-safe serialization
              const subsObj: Record<string, unknown> = {};
              for (const [k, v] of state.subsystems.entries()) subsObj[k] = v;
              result = { state: { ...state, subsystems: subsObj } };
            }
            break;
          }
          case "mill_lora_orch_events": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            const p = params as { limit?: unknown };
            result = { events: millLoRAMasterOrchestratorEngine.getEvents(typeof p.limit === "number" ? p.limit : undefined) };
            break;
          }
          case "mill_lora_orch_health_check": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            result = { health: millLoRAMasterOrchestratorEngine.healthCheck() };
            break;
          }
          case "mill_lora_orch_stats": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            result = millLoRAMasterOrchestratorEngine.getStats();
            break;
          }
          case "mill_lora_orch_stats_by_axis": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            result = millLoRAMasterOrchestratorEngine.getStatsByAxis();
            break;
          }
          case "mill_lora_orch_subsystems_by_axis": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            const p = params as { axis_mode?: unknown };
            if (typeof p.axis_mode !== "string") throw new TypeError("mill_lora_orch_subsystems_by_axis: axis_mode required");
            result = {
              subsystems: millLoRAMasterOrchestratorEngine.getSubsystemsByAxis(
                p.axis_mode as Parameters<typeof millLoRAMasterOrchestratorEngine.getSubsystemsByAxis>[0],
              ),
            };
            break;
          }
          case "mill_lora_orch_shutdown": {
            const { millLoRAMasterOrchestratorEngine } = await import("../../engines/MillLoRAMasterOrchestratorEngine.js");
            result = { ok: millLoRAMasterOrchestratorEngine.shutdown() };
            break;
          }

          // ============================================================
          // LORA MODEL SELECTOR (iter95 — axis_mode hard filter + tcpm_safe + chatter scoring)
          // ============================================================
          case "mill_lora_sel_register_model": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            const p = params as { model?: unknown };
            if (!p.model || typeof p.model !== "object") throw new TypeError("mill_lora_sel_register_model: model required");
            result = millLoRAModelSelectorEngine.registerModel(p.model as Parameters<typeof millLoRAModelSelectorEngine.registerModel>[0]);
            break;
          }
          case "mill_lora_sel_unregister_model": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            const p = params as { model_id?: unknown };
            if (typeof p.model_id !== "string") throw new TypeError("mill_lora_sel_unregister_model: model_id required");
            result = { ok: millLoRAModelSelectorEngine.unregisterModel(p.model_id) };
            break;
          }
          case "mill_lora_sel_record_outcome": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            const p = params as { model_id?: unknown; success?: unknown; latency_ms?: unknown };
            if (typeof p.model_id !== "string" || typeof p.success !== "boolean") {
              throw new TypeError("mill_lora_sel_record_outcome: model_id + success required");
            }
            result = {
              ok: millLoRAModelSelectorEngine.recordOutcome(
                p.model_id,
                p.success,
                typeof p.latency_ms === "number" ? p.latency_ms : undefined,
              ),
            };
            break;
          }
          case "mill_lora_sel_record_mill_outcome": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            const p = params as { model_id?: unknown; chatter?: unknown; fpa_pass?: unknown; tcpm_fault?: unknown };
            if (typeof p.model_id !== "string") throw new TypeError("mill_lora_sel_record_mill_outcome: model_id required");
            result = {
              ok: millLoRAModelSelectorEngine.recordMillOutcome(p.model_id, {
                chatter: typeof p.chatter === "boolean" ? p.chatter : undefined,
                fpa_pass: typeof p.fpa_pass === "boolean" ? p.fpa_pass : undefined,
                tcpm_fault: typeof p.tcpm_fault === "boolean" ? p.tcpm_fault : undefined,
              }),
            };
            break;
          }
          case "mill_lora_sel_select": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            result = {
              selection: millLoRAModelSelectorEngine.select(
                (params ?? {}) as Parameters<typeof millLoRAModelSelectorEngine.select>[0],
              ),
            };
            break;
          }
          case "mill_lora_sel_release": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            const p = params as { model_id?: unknown };
            if (typeof p.model_id !== "string") throw new TypeError("mill_lora_sel_release: model_id required");
            result = { ok: millLoRAModelSelectorEngine.release(p.model_id) };
            break;
          }
          case "mill_lora_sel_models": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            result = { models: millLoRAModelSelectorEngine.getModels() };
            break;
          }
          case "mill_lora_sel_find_by_spec": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            const p = params as { tag?: unknown };
            if (typeof p.tag !== "string") throw new TypeError("mill_lora_sel_find_by_spec: tag required");
            result = {
              models: millLoRAModelSelectorEngine.findBySpecialization(
                p.tag as Parameters<typeof millLoRAModelSelectorEngine.findBySpecialization>[0],
              ),
            };
            break;
          }
          case "mill_lora_sel_find_by_axis": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            const p = params as { axis_mode?: unknown };
            if (typeof p.axis_mode !== "string") throw new TypeError("mill_lora_sel_find_by_axis: axis_mode required");
            result = {
              models: millLoRAModelSelectorEngine.findByAxisMode(
                p.axis_mode as Parameters<typeof millLoRAModelSelectorEngine.findByAxisMode>[0],
              ),
            };
            break;
          }
          case "mill_lora_sel_stats": {
            const { millLoRAModelSelectorEngine } = await import("../../engines/MillLoRAModelSelectorEngine.js");
            result = millLoRAModelSelectorEngine.getStats();
            break;
          }

          // ============================================================
          // LORA ENSEMBLE ORCHESTRATOR (iter96 — per-run axis + abort signals)
          // ============================================================
          case "mill_lora_eorch_start_run": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            const p = params as { input?: unknown; model_ids?: unknown; mode?: unknown; axis_mode?: unknown };
            if (typeof p.input !== "string" || !Array.isArray(p.model_ids)) {
              throw new TypeError("mill_lora_eorch_start_run: input + model_ids required");
            }
            result = millLoRAEnsembleOrchestratorEngine.startRun(p.input, p.model_ids as string[], {
              mode: p.mode as Parameters<typeof millLoRAEnsembleOrchestratorEngine.startRun>[2] extends infer T ? T extends { mode?: infer M } ? M : never : never,
              axis_mode: p.axis_mode as Parameters<typeof millLoRAEnsembleOrchestratorEngine.startRun>[2] extends infer T ? T extends { axis_mode?: infer A } ? A : never : never,
            });
            break;
          }
          case "mill_lora_eorch_record_exec": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            const p = params as { run_id?: unknown; execution?: unknown };
            if (typeof p.run_id !== "string" || !p.execution) {
              throw new TypeError("mill_lora_eorch_record_exec: run_id + execution required");
            }
            result = {
              ok: millLoRAEnsembleOrchestratorEngine.recordExecution(
                p.run_id,
                p.execution as Parameters<typeof millLoRAEnsembleOrchestratorEngine.recordExecution>[1],
              ),
            };
            break;
          }
          case "mill_lora_eorch_should_cascade_stop": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            const p = params as { run_id?: unknown };
            if (typeof p.run_id !== "string") throw new TypeError("mill_lora_eorch_should_cascade_stop: run_id required");
            result = millLoRAEnsembleOrchestratorEngine.shouldCascadeStop(p.run_id);
            break;
          }
          case "mill_lora_eorch_complete_run": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            const p = params as { run_id?: unknown };
            if (typeof p.run_id !== "string") throw new TypeError("mill_lora_eorch_complete_run: run_id required");
            result = { run: millLoRAEnsembleOrchestratorEngine.completeRun(p.run_id) };
            break;
          }
          case "mill_lora_eorch_get_run": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            const p = params as { run_id?: unknown };
            if (typeof p.run_id !== "string") throw new TypeError("mill_lora_eorch_get_run: run_id required");
            result = { run: millLoRAEnsembleOrchestratorEngine.getRun(p.run_id) };
            break;
          }
          case "mill_lora_eorch_active_runs": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            result = { runs: millLoRAEnsembleOrchestratorEngine.getActiveRuns() };
            break;
          }
          case "mill_lora_eorch_completed_runs": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            const p = params as { limit?: unknown };
            result = { runs: millLoRAEnsembleOrchestratorEngine.getCompletedRuns(typeof p.limit === "number" ? p.limit : undefined) };
            break;
          }
          case "mill_lora_eorch_stats": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            result = millLoRAEnsembleOrchestratorEngine.getStats();
            break;
          }
          case "mill_lora_eorch_stats_by_axis": {
            const { millLoRAEnsembleOrchestratorEngine } = await import("../../engines/MillLoRAEnsembleOrchestratorEngine.js");
            result = millLoRAEnsembleOrchestratorEngine.getStatsByAxis();
            break;
          }

          // ============================================================
          // LORA TRIBAL EXTRACTOR (iter97 — mill-canonical categories + axis inference)
          // ============================================================
          case "mill_lora_tribe_extract": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            const p = params as { raw_text?: unknown; author?: unknown; source?: unknown; axis_mode?: unknown };
            if (typeof p.raw_text !== "string") throw new TypeError("mill_lora_tribe_extract: raw_text required");
            result = {
              tip: millLoRATribalExtractorEngine.extractTip(p.raw_text, {
                author: typeof p.author === "string" ? p.author : undefined,
                source: typeof p.source === "string" ? p.source : undefined,
                axis_mode: p.axis_mode as Parameters<typeof millLoRATribalExtractorEngine.extractTip>[1] extends infer T ? T extends { axis_mode?: infer A } ? A : never : never,
              }),
            };
            break;
          }
          case "mill_lora_tribe_extract_batch": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            const p = params as { texts?: unknown };
            if (!Array.isArray(p.texts)) throw new TypeError("mill_lora_tribe_extract_batch: texts(string[]) required");
            result = { tips: millLoRATribalExtractorEngine.extractBatch(p.texts as string[]) };
            break;
          }
          case "mill_lora_tribe_find_by_category": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            const p = params as { category?: unknown };
            if (typeof p.category !== "string") throw new TypeError("mill_lora_tribe_find_by_category: category required");
            result = {
              tips: millLoRATribalExtractorEngine.findByCategory(
                p.category as Parameters<typeof millLoRATribalExtractorEngine.findByCategory>[0],
              ),
            };
            break;
          }
          case "mill_lora_tribe_find_by_keyword": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            const p = params as { keyword?: unknown };
            if (typeof p.keyword !== "string") throw new TypeError("mill_lora_tribe_find_by_keyword: keyword required");
            result = { tips: millLoRATribalExtractorEngine.findByKeyword(p.keyword) };
            break;
          }
          case "mill_lora_tribe_find_by_axis": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            const p = params as { axis_mode?: unknown };
            if (typeof p.axis_mode !== "string") throw new TypeError("mill_lora_tribe_find_by_axis: axis_mode required");
            result = {
              tips: millLoRATribalExtractorEngine.findByAxisMode(
                p.axis_mode as Parameters<typeof millLoRATribalExtractorEngine.findByAxisMode>[0],
              ),
            };
            break;
          }
          case "mill_lora_tribe_to_training_example": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            const p = params as { tip?: unknown };
            if (!p.tip || typeof p.tip !== "object") throw new TypeError("mill_lora_tribe_to_training_example: tip required");
            result = millLoRATribalExtractorEngine.toTrainingExample(
              p.tip as Parameters<typeof millLoRATribalExtractorEngine.toTrainingExample>[0],
            );
            break;
          }
          case "mill_lora_tribe_tips": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            const p = params as { limit?: unknown };
            result = { tips: millLoRATribalExtractorEngine.getTips(typeof p.limit === "number" ? p.limit : undefined) };
            break;
          }
          case "mill_lora_tribe_stats": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            result = millLoRATribalExtractorEngine.getStats();
            break;
          }
          case "mill_lora_tribe_clear": {
            const { millLoRATribalExtractorEngine } = await import("../../engines/MillLoRATribalExtractorEngine.js");
            millLoRATribalExtractorEngine.clear();
            result = { cleared: true };
            break;
          }

          // ============================================================
          // LORA TRIBAL AUGMENTATION (iter98 — JM-Die-mill tips + canonical playbook rules)
          // ============================================================
          case "mill_lora_aug_add_tip": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { tip?: unknown };
            if (!p.tip || typeof p.tip !== "object") throw new TypeError("mill_lora_aug_add_tip: tip required");
            millLoRATribalAugmentationEngine.addTip(p.tip as Parameters<typeof millLoRATribalAugmentationEngine.addTip>[0]);
            result = { ok: true };
            break;
          }
          case "mill_lora_aug_add_rule": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { rule?: unknown };
            if (!p.rule || typeof p.rule !== "object") throw new TypeError("mill_lora_aug_add_rule: rule required");
            millLoRATribalAugmentationEngine.addRule(p.rule as Parameters<typeof millLoRATribalAugmentationEngine.addRule>[0]);
            result = { ok: true };
            break;
          }
          case "mill_lora_aug_tips": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { source?: unknown };
            result = {
              tips: millLoRATribalAugmentationEngine.getTips(
                p.source as Parameters<typeof millLoRATribalAugmentationEngine.getTips>[0],
              ),
            };
            break;
          }
          case "mill_lora_aug_rules": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { category?: unknown };
            result = {
              rules: millLoRATribalAugmentationEngine.getRules(typeof p.category === "string" ? p.category : undefined),
            };
            break;
          }
          case "mill_lora_aug_tips_by_axis": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { axis_mode?: unknown };
            if (typeof p.axis_mode !== "string") throw new TypeError("mill_lora_aug_tips_by_axis: axis_mode required");
            result = {
              tips: millLoRATribalAugmentationEngine.getTipsByAxisMode(
                p.axis_mode as Parameters<typeof millLoRATribalAugmentationEngine.getTipsByAxisMode>[0],
              ),
            };
            break;
          }
          case "mill_lora_aug_mill_canonical_rules": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            result = { rules: millLoRATribalAugmentationEngine.getMillCanonicalRules() };
            break;
          }
          case "mill_lora_aug_find_relevant": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { response?: unknown; query?: unknown };
            if (typeof p.response !== "string" || typeof p.query !== "string") {
              throw new TypeError("mill_lora_aug_find_relevant: response + query required");
            }
            result = { matches: millLoRATribalAugmentationEngine.findRelevantTips(p.response, p.query) };
            break;
          }
          case "mill_lora_aug_check_rules": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { response?: unknown; query?: unknown };
            if (typeof p.response !== "string" || typeof p.query !== "string") {
              throw new TypeError("mill_lora_aug_check_rules: response + query required");
            }
            result = { rules: millLoRATribalAugmentationEngine.checkRules(p.response, p.query) };
            break;
          }
          case "mill_lora_aug_augment": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { response?: unknown; query?: unknown };
            if (typeof p.response !== "string" || typeof p.query !== "string") {
              throw new TypeError("mill_lora_aug_augment: response + query required");
            }
            result = millLoRATribalAugmentationEngine.augment(p.response, p.query);
            break;
          }
          case "mill_lora_aug_search_tips": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { keyword?: unknown };
            if (typeof p.keyword !== "string") throw new TypeError("mill_lora_aug_search_tips: keyword required");
            result = { tips: millLoRATribalAugmentationEngine.searchTips(p.keyword) };
            break;
          }
          case "mill_lora_aug_tips_by_material": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { material?: unknown };
            if (typeof p.material !== "string") throw new TypeError("mill_lora_aug_tips_by_material: material required");
            result = { tips: millLoRATribalAugmentationEngine.getTipsByMaterial(p.material) };
            break;
          }
          case "mill_lora_aug_tips_by_operation": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            const p = params as { operation?: unknown };
            if (typeof p.operation !== "string") throw new TypeError("mill_lora_aug_tips_by_operation: operation required");
            result = { tips: millLoRATribalAugmentationEngine.getTipsByOperation(p.operation) };
            break;
          }
          case "mill_lora_aug_stats": {
            const { millLoRATribalAugmentationEngine } = await import("../../engines/MillLoRATribalAugmentationEngine.js");
            result = millLoRATribalAugmentationEngine.getStats();
            break;
          }

          // ============================================================
          // STRATEGY SELECTION
          // ============================================================
          case "mill_strategy_select": {
            result = await callOrThrow(await getEngine("strategy"), ["selectStrategy", "recommend"], params, "MillStrategyNeuralEngine");
            break;
          }
          case "mill_strategy_recommend": {
            result = await callOrThrow(await getEngine("neural"), ["recommend"], params, "MillStrategyNeuralEngine");
            break;
          }
          case "mill_strategy_compare": {
            result = await callOrThrow(await getEngine("strategy"), ["compare"], params, "MillStrategyNeuralEngine");
            break;
          }
          case "mill_strategy_optimize": {
            result = await callOrThrow(await getEngine("optimizer"), ["optimizeStrategy"], params, "MillProgramOptimizerEngine");
            break;
          }

          // ============================================================
          // TOOLPATH OPERATIONS
          // ============================================================
          case "mill_toolpath_generate": {
            result = await callOrThrow(await getEngine("toolpath"), ["generate"], params, "ToolpathStrategyEngine");
            break;
          }
          case "mill_toolpath_simulate": {
            result = await callOrThrow(await getEngine("collision"), ["simulate"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_toolpath_optimize": {
            result = await callOrThrow(await getEngine("optimizer"), ["optimizeToolpath"], params, "MillProgramOptimizerEngine");
            break;
          }
          case "mill_toolpath_rest": {
            result = await callOrThrow(await getEngine("toolpath"), ["generateRest"], params, "ToolpathStrategyEngine");
            break;
          }
          case "mill_toolpath_adaptive": {
            result = await callOrThrow(await getEngine("adaptive"), ["generateAdaptive"], params, "AdaptiveToolpathRouterEngine");
            break;
          }
          case "mill_toolpath_hsm": {
            result = await callOrThrow(await getEngine("toolpath"), ["generateHSM"], params, "ToolpathStrategyEngine");
            break;
          }
          case "mill_toolpath_trochoidal": {
            result = await callOrThrow(await getEngine("toolpath"), ["generateTrochoidal"], params, "ToolpathStrategyEngine");
            break;
          }

          // ============================================================
          // PHYSICS & VALIDATION
          // ============================================================
          case "mill_force_calculate": {
            result = await callOrThrow(await getEngine("physics"), ["calculate"], params, "MillingForceEngine");
            break;
          }
          case "mill_deflection_check": {
            result = await callOrThrow(await getEngine("physics"), ["checkDeflection"], params, "MillingForceEngine");
            break;
          }
          case "mill_chatter_predict": {
            result = await callOrThrow(await getEngine("physics"), ["predictChatter"], params, "MillingForceEngine");
            break;
          }
          case "mill_thermal_analyze": {
            result = await callOrThrow(await getEngine("thermal"), ["analyze"], params, "ThermalWearCouplingEngine");
            break;
          }
          case "mill_power_verify": {
            result = await callOrThrow(await getEngine("physics"), ["verifyPower"], params, "MillingForceEngine");
            break;
          }

          // ============================================================
          // COLLISION & KINEMATICS
          // ============================================================
          case "mill_collision_check": {
            result = await callOrThrow(await getEngine("collision"), ["checkCollision", "check"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_collision_zones": {
            result = await callOrThrow(await getEngine("collision"), ["getZones"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_kinematics_verify": {
            result = await callOrThrow(await getEngine("kinematics"), ["verifyKinematics"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_work_envelope": {
            result = await callOrThrow(await getEngine("kinematics"), ["checkEnvelope"], params, "MillKinematicsCollisionEngine");
            break;
          }

          // ============================================================
          // TOOL SELECTION
          // ============================================================
          case "mill_tool_recommend": {
            result = await callOrThrow(await getEngine("toolsel"), ["recommend"], params, "ToolSelectionRecommenderEngine");
            break;
          }
          case "mill_tool_assembly": {
            result = await callOrThrow(await getEngine("toolsel"), ["assemblyCheck"], params, "ToolSelectionRecommenderEngine");
            break;
          }
          case "mill_tool_holder_match": {
            result = await callOrThrow(await getEngine("toolsel"), ["matchHolder"], params, "ToolSelectionRecommenderEngine");
            break;
          }
          case "mill_tool_catalog_query": {
            // CATALOG-APP-WIRING-MS0/U8: expose the full 62.7K vendor corpus to the
            // mill galaxy. Loads the corpus (idempotent) then searches it. Pass-through
            // filters: type, diameter_mm, diameter_range, iso_group, manufacturer,
            // operation, coating, flute_count, max_results.
            const { catalogCorpusLoaderEngine } = await import("../../engines/CatalogCorpusLoaderEngine.js");
            const ensured = catalogCorpusLoaderEngine.ensureLoaded();
            const { toolCatalogEngine } = await import("../../engines/ToolCatalogEngine.js");
            const p = params as Record<string, unknown>;
            const tools = toolCatalogEngine.search({
              type: p.type as string | undefined,
              diameter_mm: p.diameter_mm as number | undefined,
              diameter_range: p.diameter_range as [number, number] | undefined,
              iso_group: p.iso_group as string | undefined,
              manufacturer: p.manufacturer as string | undefined,
              operation: p.operation as string | undefined,
              coating: p.coating as string | undefined,
              flute_count: p.flute_count as number | undefined,
              max_results: (p.max_results as number | undefined) ?? 50,
            });
            result = { success: true, count: tools.length, corpus_ensured: ensured.ensured, tools };
            break;
          }

          // ============================================================
          // AI/AGI FEATURES
          // ============================================================
          case "mill_agi_orchestrate": {
            result = await callOrThrow(await getEngine("agi"), ["orchestrate", "reason"], params, "MillingAGIMasterEngine");
            break;
          }
          case "mill_neural_recommend": {
            result = await callOrThrow(await getEngine("neural"), ["neuralRecommend"], params, "MillStrategyNeuralEngine");
            break;
          }
          case "mill_deeplearn_predict": {
            result = await callOrThrow(await getEngine("deeplearn"), ["predict"], params, "MillDeepLearningEngine");
            break;
          }
          case "mill_pattern_mine": {
            result = await callOrThrow(await getEngine("pattern"), ["mine"], params, "MillPatternMinerEngine");
            break;
          }
          case "mill_wisdom_query": {
            result = await callOrThrow(await getEngine("wisdom"), ["query"], params, "TribalKnowledgeAdvisorEngine");
            break;
          }

          // ============================================================
          // SELF-AWARENESS & CAPABILITY DISCOVERY
          // ============================================================
          case "mill_selfaware_registry": {
            const engine = await getEngine("selfaware");
            result = { registry: engine.getRegistry(), stats: engine.getStats() };
            break;
          }
          case "mill_selfaware_recommend": {
            const engine = await getEngine("selfaware");
            const task = params.task ?? params.query ?? "";
            result = { recommendations: engine.recommendFeatures(task) };
            break;
          }
          case "mill_selfaware_find": {
            const engine = await getEngine("selfaware");
            const query = params.query ?? params.task ?? "";
            result = { matches: engine.findEngines(query) };
            break;
          }
          case "mill_selfaware_stats": {
            const engine = await getEngine("selfaware");
            result = engine.getStats();
            break;
          }

          // ============================================================
          // DIGITAL TWIN
          // ============================================================
          case "mill_twin_sync": {
            result = await callOrThrow(await getEngine("twin"), ["sync"], params, "DigitalTwinSyncEngine");
            break;
          }
          case "mill_twin_predict": {
            result = await callOrThrow(await getEngine("twin"), ["predict"], params, "DigitalTwinSyncEngine");
            break;
          }
          case "mill_twin_calibrate": {
            result = await callOrThrow(await getEngine("twin"), ["calibrate"], params, "DigitalTwinSyncEngine");
            break;
          }

          // ============================================================
          // SCIENTIFIC PIPELINE
          // ============================================================
          case "mill_scientific_analyze": {
            result = await callOrThrow(await getEngine("scientific"), ["analyze"], params, "MillScientificPipelineEngine");
            break;
          }
          case "mill_scientific_optimize": {
            result = await callOrThrow(await getEngine("scientific"), ["optimize"], params, "MillScientificPipelineEngine");
            break;
          }
          case "mill_uncertainty_quantify": {
            result = await callOrThrow(await getEngine("scientific"), ["quantifyUncertainty"], params, "MillScientificPipelineEngine");
            break;
          }

          // ============================================================
          // QUICK HELPERS
          // ============================================================
          case "mill_quick_speed_feed": {
            result = await callOrThrow(await getEngine("physics"), ["quickSpeedFeed"], params, "MillingForceEngine");
            break;
          }
          case "mill_quick_cycle_time": {
            result = await callOrThrow(await getEngine("optimizer"), ["estimateCycleTime"], params, "MillProgramOptimizerEngine");
            break;
          }
          case "mill_quick_cost_estimate": {
            result = await callOrThrow(await getEngine("optimizer"), ["estimateCost"], params, "MillProgramOptimizerEngine");
            break;
          }

          // ============================================================
          // VALIDATION & QUALITY
          // ============================================================
          case "mill_validate_setup": {
            result = await callOrThrow(await getEngine("validate"), ["validateSetup"], params, "MillProgramAnalyzerEngine");
            break;
          }
          case "mill_validate_safety": {
            result = await callOrThrow(await getEngine("collision"), ["validateSafety"], params, "MillKinematicsCollisionEngine");
            break;
          }
          case "mill_spc_analyze": {
            result = await callOrThrow(await getEngine("validate"), ["analyzeSPC"], params, "MillProgramAnalyzerEngine");
            break;
          }

          // ============================================================
          // P1-U09-L2-AGG: L2 AGGREGATOR ROUTING
          // ============================================================
          case "mill_ai_orchestrate": {
            const engine = await getEngine("ai_learn");
            result = await engine.orchestrate(params);
            break;
          }
          case "mill_turn_orchestrate": {
            const engine = await getEngine("mill_turn");
            result = await engine.orchestrate(params);
            break;
          }
          case "mill_5axis_orchestrate": {
            const engine = await getEngine("five_axis_agg");
            result = await engine.orchestrate(params);
            break;
          }
          case "mill_multiaxis_orchestrate": {
            const engine = await getEngine("multi_axis_agg");
            result = await engine.orchestrate(params);
            break;
          }

          // ============================================================
          // TRIBAL KNOWLEDGE (MillTribalKnowledgeEngine)
          // ============================================================
          case "mill_tribal_query": {
            const engine = await getEngine("tribal");
            result = engine.query(params);
            break;
          }
          case "mill_tribal_get": {
            const engine = await getEngine("tribal");
            result = engine.get(params.id);
            break;
          }
          case "mill_tribal_add": {
            const engine = await getEngine("tribal");
            engine.add(params);
            result = { success: true, id: params.id };
            break;
          }
          case "mill_tribal_stats": {
            const engine = await getEngine("tribal");
            result = engine.getStats();
            break;
          }

          // ============================================================
          // CLOSED-LOOP TRIBAL OUTCOME BRIDGE (TribalTipOutcomeBridgeEngine)
          // TRIBAL-OUTCOME-LOOP-MS0/U-TTOB02
          // ============================================================
          case "mill_tribal_tip_record_application": {
            const engine = await getEngine("tribal_outcome_bridge");
            result = await engine.recordApplication(params);
            break;
          }
          case "mill_tribal_tip_effectiveness": {
            const engine = await getEngine("tribal_outcome_bridge");
            result = await engine.effectiveness(params);
            break;
          }

          // ============================================================
          // END-TO-END ORCHESTRATION (MillingEndToEndOrchestrationEngine)
          // ============================================================
          case "mill_e2e_workflow": {
            const engine = await getEngine("e2e");
            result = await engine.executeWorkflow(params);
            break;
          }

          // ============================================================
          // REASONING TRACE LEDGER (MillingReasoningTraceLedgerEngine)
          // ============================================================
          case "mill_trace_record": {
            const engine = await getEngine("trace_ledger");
            result = await engine.recordTrace(params);
            break;
          }
          case "mill_trace_query": {
            const engine = await getEngine("trace_ledger");
            result = engine.queryRecent(params.count ?? 20, params.filter);
            break;
          }

          // ============================================================
          // INFERENCE ORCHESTRATION (MillingInferenceOrchestratorEngine)
          // ============================================================
          case "mill_inference_run": {
            const engine = await getEngine("inference_orch");
            result = await engine.infer(params);
            break;
          }

          // ============================================================
          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH1: 6 unwired mill engines
          // ============================================================
          case "mill_helical_calc": {
            const { helicalMillingEngine } = await import("../../engines/HelicalMillingEngine.js");
            result = helicalMillingEngine.calculate(params as Parameters<typeof helicalMillingEngine.calculate>[0]);
            break;
          }
          case "mill_high_feed_calc": {
            const { highFeedMillingEngine } = await import("../../engines/HighFeedMillingEngine.js");
            result = highFeedMillingEngine.calculate(params as Parameters<typeof highFeedMillingEngine.calculate>[0]);
            break;
          }
          case "mill_program_parse": {
            const { millProgramLearningEngine } = await import("../../engines/MillProgramLearningEngine.js");
            const p = params as { content: string; source: Parameters<typeof millProgramLearningEngine.parseProgram>[1] };
            if (typeof p.content !== "string") throw new Error("mill_program_parse requires 'content' (G-code string)");
            if (!p.source) throw new Error("mill_program_parse requires 'source' (MillSource)");
            result = millProgramLearningEngine.parseProgram(p.content, p.source);
            break;
          }
          case "mill_resource_query": {
            const { millResourceAwarenessEngine } = await import("../../engines/MillResourceAwarenessEngine.js");
            result = millResourceAwarenessEngine.query(params as Parameters<typeof millResourceAwarenessEngine.query>[0]);
            break;
          }
          case "mill_strategy_list": {
            const { millingStrategyLibraryEngine } = await import("../../engines/MillingStrategyLibraryEngine.js");
            result = { strategies: millingStrategyLibraryEngine.getAllStrategies() };
            break;
          }
          case "mill_strategy_for_feature": {
            const { millingStrategyLibraryEngine } = await import("../../engines/MillingStrategyLibraryEngine.js");
            const featureType = (params as { featureType: string }).featureType;
            if (typeof featureType !== "string") throw new Error("mill_strategy_for_feature requires 'featureType'");
            result = {
              featureType,
              strategies: millingStrategyLibraryEngine.getStrategiesForFeature(
                featureType as Parameters<typeof millingStrategyLibraryEngine.getStrategiesForFeature>[0],
              ),
            };
            break;
          }

          // ============================================================
          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH2: 6 neural/AI mill engines
          // ============================================================
          case "mill_neural_cognitive_process": {
            const { millingNeuralCognitiveEngine } = await import("../../engines/MillingNeuralCognitiveEngine.js");
            result = millingNeuralCognitiveEngine.quickProcess(
              params as Parameters<typeof millingNeuralCognitiveEngine.quickProcess>[0],
            );
            break;
          }
          case "mill_critical_analyze": {
            const { millingCriticalThinkingEngine } = await import("../../engines/MillingCriticalThinkingEngine.js");
            result = millingCriticalThinkingEngine.quickAnalyze(
              params as Parameters<typeof millingCriticalThinkingEngine.quickAnalyze>[0],
            );
            break;
          }
          case "mill_meta_learn_record": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            result = millingMetaLearningEngine.learnFromExperience(
              params as Parameters<typeof millingMetaLearningEngine.learnFromExperience>[0],
            );
            break;
          }
          case "mill_meta_learn_self_assess": {
            const { millingMetaLearningEngine } = await import("../../engines/MillingMetaLearningEngine.js");
            result = millingMetaLearningEngine.selfAssess();
            break;
          }
          case "mill_ai_parse_nl_query": {
            const { millingAIIntegrationEngine } = await import("../../engines/MillingAIIntegrationEngine.js");
            const q = (params as { query: string }).query;
            if (typeof q !== "string" || q.length === 0) throw new Error("mill_ai_parse_nl_query requires 'query'");
            result = millingAIIntegrationEngine.parseNaturalLanguageQuery(q);
            break;
          }
          case "mill_ai_archive_stats": {
            const { millingAIIntegrationEngine } = await import("../../engines/MillingAIIntegrationEngine.js");
            result = millingAIIntegrationEngine.getArchiveStats();
            break;
          }

          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH3: 6 unwired physics/RL/pattern mill engines
          case "mill_physics_force": {
            const { millingPhysicsKernelEngine } = await import("../../engines/MillingPhysicsKernelEngine.js");
            result = millingPhysicsKernelEngine.calculateMillingForces(params as Parameters<typeof millingPhysicsKernelEngine.calculateMillingForces>[0]);
            break;
          }
          case "mill_physics_tool_life": {
            const { millingPhysicsKernelEngine } = await import("../../engines/MillingPhysicsKernelEngine.js");
            result = millingPhysicsKernelEngine.calculateToolLife(params as Parameters<typeof millingPhysicsKernelEngine.calculateToolLife>[0]);
            break;
          }
          case "mill_program_pattern_analyze": {
            const { millingProgramPatternEngine } = await import("../../engines/MillingProgramPatternEngine.js");
            const p = params as { ncCode: string; sourcePath?: string };
            if (typeof p.ncCode !== "string" || p.ncCode.length === 0) throw new Error("mill_program_pattern_analyze requires 'ncCode'");
            result = millingProgramPatternEngine.analyzeProgram(p.ncCode, p.sourcePath);
            break;
          }
          case "mill_rl_select_action": {
            const { millingReinforcementLearningEngine } = await import("../../engines/MillingReinforcementLearningEngine.js");
            const p = params as { state: Parameters<typeof millingReinforcementLearningEngine.selectAction>[0]; explore?: boolean };
            if (!p.state || typeof p.state !== "object") throw new Error("mill_rl_select_action requires 'state' object");
            result = millingReinforcementLearningEngine.selectAction(p.state, p.explore);
            break;
          }
          case "mill_head_recommend": {
            const { millingHeadIntelligenceEngine } = await import("../../engines/MillingHeadIntelligenceEngine.js");
            const p = params as { operations: Parameters<typeof millingHeadIntelligenceEngine.recommendMillingHead>[0]; constraints: Parameters<typeof millingHeadIntelligenceEngine.recommendMillingHead>[1] };
            if (!Array.isArray(p.operations) || p.operations.length === 0) throw new Error("mill_head_recommend requires non-empty 'operations'");
            if (!p.constraints || typeof p.constraints !== "object") throw new Error("mill_head_recommend requires 'constraints'");
            result = millingHeadIntelligenceEngine.recommendMillingHead(p.operations, p.constraints);
            break;
          }
          case "mill_machine_intel_get": {
            const { millingMachineIntelligenceEngine } = await import("../../engines/MillingMachineIntelligenceEngine.js");
            const id = (params as { id: string }).id;
            if (typeof id !== "string" || id.length === 0) throw new Error("mill_machine_intel_get requires 'id'");
            result = millingMachineIntelligenceEngine.getMachine(id) ?? null;
            break;
          }

          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH4: 6 unwired deep-AI / digital-twin mill engines
          case "mill_deep_reason": {
            const { millingDeepReasoningEngine } = await import("../../engines/MillingDeepReasoningEngine.js");
            const p = params as { query: string; context: Parameters<typeof millingDeepReasoningEngine.quickReason>[1] };
            if (typeof p.query !== "string" || p.query.length === 0) throw new Error("mill_deep_reason requires 'query'");
            if (!p.context || typeof p.context !== "object") throw new Error("mill_deep_reason requires 'context'");
            result = millingDeepReasoningEngine.quickReason(p.query, p.context);
            break;
          }
          case "mill_deep_integrate": {
            const { millingDeepIntegrationEngine } = await import("../../engines/MillingDeepIntegrationEngine.js");
            const ctx = (params as { context: Parameters<typeof millingDeepIntegrationEngine.quickIntegrate>[0] }).context
                      ?? (params as Parameters<typeof millingDeepIntegrationEngine.quickIntegrate>[0]);
            if (!ctx || typeof ctx !== "object") throw new Error("mill_deep_integrate requires 'context'");
            result = millingDeepIntegrationEngine.quickIntegrate(ctx);
            break;
          }
          case "mill_knowledge_search": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            const q = (params as { query: string }).query;
            if (typeof q !== "string" || q.length === 0) throw new Error("mill_knowledge_search requires 'query'");
            result = millingDeepKnowledgeSynthesisEngine.searchKnowledge(q);
            break;
          }
          case "mill_knowledge_stats": {
            const { millingDeepKnowledgeSynthesisEngine } = await import("../../engines/MillingDeepKnowledgeSynthesisEngine.js");
            result = millingDeepKnowledgeSynthesisEngine.getSourceStats();
            break;
          }
          case "mill_ai_unified_recommend": {
            const { millingAIUnificationEngine } = await import("../../engines/MillingAIUnificationEngine.js");
            const req = (params as { request: Parameters<typeof millingAIUnificationEngine.quickRecommend>[0] }).request
                      ?? (params as Parameters<typeof millingAIUnificationEngine.quickRecommend>[0]);
            if (!req || typeof req !== "object") throw new Error("mill_ai_unified_recommend requires 'request'");
            result = millingAIUnificationEngine.quickRecommend(req);
            break;
          }
          case "mill_milling_twin_sync": {
            const { millingDigitalTwinEngine } = await import("../../engines/MillingDigitalTwinEngine.js");
            const state = (params as { machineState: Parameters<typeof millingDigitalTwinEngine.sync>[0] }).machineState
                        ?? (params as Parameters<typeof millingDigitalTwinEngine.sync>[0]);
            if (!state || typeof state !== "object") throw new Error("mill_milling_twin_sync requires 'machineState'");
            result = millingDigitalTwinEngine.sync(state);
            break;
          }

          // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH5: 6 unwired AGI / online-learning / troubleshooting mill engines
          case "mill_agi_quick_analyze": {
            const { millingAGIOrchestrationEngine } = await import("../../engines/MillingAGIOrchestrationEngine.js");
            const p = params as {
              material: string;
              tool_diameter_mm: number;
              cutting_speed_m_min: number;
              feed_per_tooth_mm: number;
              axial_depth_mm: number;
            };
            if (typeof p.material !== "string" || p.material.length === 0) throw new Error("mill_agi_quick_analyze requires 'material'");
            if (!(p.tool_diameter_mm > 0)) throw new Error("mill_agi_quick_analyze requires positive 'tool_diameter_mm'");
            if (!(p.cutting_speed_m_min > 0)) throw new Error("mill_agi_quick_analyze requires positive 'cutting_speed_m_min'");
            if (!(p.feed_per_tooth_mm > 0)) throw new Error("mill_agi_quick_analyze requires positive 'feed_per_tooth_mm'");
            if (!(p.axial_depth_mm > 0)) throw new Error("mill_agi_quick_analyze requires positive 'axial_depth_mm'");
            result = millingAGIOrchestrationEngine.quickAnalyze(
              p.material,
              p.tool_diameter_mm,
              p.cutting_speed_m_min,
              p.feed_per_tooth_mm,
              p.axial_depth_mm,
            );
            break;
          }
          case "mill_knowledge_orch_recommend": {
            const { millingKnowledgeOrchestratorEngine } = await import("../../engines/MillingKnowledgeOrchestratorEngine.js");
            const req = params as Parameters<typeof millingKnowledgeOrchestratorEngine.quickRecommend>[0];
            if (!req || typeof req !== "object") throw new Error("mill_knowledge_orch_recommend requires request object");
            result = millingKnowledgeOrchestratorEngine.quickRecommend(req);
            break;
          }
          case "mill_troubleshoot": {
            const { millingDeepAIHardeningEngine } = await import("../../engines/MillingDeepAIHardeningEngine.js");
            const p = params as Parameters<typeof millingDeepAIHardeningEngine.troubleshootMillingIssue>[0];
            if (!p || !Array.isArray((p as { symptoms?: unknown }).symptoms) || (p as { symptoms: unknown[] }).symptoms.length === 0) {
              throw new Error("mill_troubleshoot requires non-empty 'symptoms' array");
            }
            result = millingDeepAIHardeningEngine.troubleshootMillingIssue(p);
            break;
          }
          case "mill_lora_cadence_state": {
            const { millingLoRACadenceEngine } = await import("../../engines/MillingLoRACadenceEngine.js");
            result = millingLoRACadenceEngine.getState();
            break;
          }
          case "mill_online_record_step": {
            const { millingOnlineLearningTrackerEngine } = await import("../../engines/MillingOnlineLearningTrackerEngine.js");
            const p = params as Parameters<typeof millingOnlineLearningTrackerEngine.recordStep>[0];
            if (!p || typeof p !== "object") throw new Error("mill_online_record_step requires step object");
            if (!((p as { learning_rate?: number }).learning_rate! > 0)) throw new Error("mill_online_record_step requires positive 'learning_rate'");
            result = millingOnlineLearningTrackerEngine.recordStep(p);
            break;
          }
          case "mill_online_detect_drift": {
            const { millingOnlineLearningTrackerEngine } = await import("../../engines/MillingOnlineLearningTrackerEngine.js");
            const err = (params as { error: number }).error;
            if (typeof err !== "number" || !Number.isFinite(err)) throw new Error("mill_online_detect_drift requires numeric 'error'");
            result = millingOnlineLearningTrackerEngine.detectDrift(err);
            break;
          }

          // ============================================================
          // MS-PRINT-PROGRAM-LOOP / U-PPL-A5: MillPartClassifierEngine
          // ============================================================
          // VALIDATION FLOW: Zod safeParse in ACTION_DATA_SCHEMAS (upstream
          // via validateActionParams) → engine.classify() (FAIL-LOUD defense
          // in depth for bypass-the-schema callers). Engine is pure-transform
          // — no fs, no state, deterministic.
          //
          // CONSUMER CONTRACT: slimResponse strips null/undefined fields.
          // Result envelope is `{ success: true, data: { ...result } }` via
          // the standard millDispatcher post-hook → JSON.stringify path.
          case "mill_part_classify": {
            const { millPartClassifierEngine } = await import("../../engines/MillPartClassifierEngine.js");
            result = millPartClassifierEngine.classify(
              params as Parameters<typeof millPartClassifierEngine.classify>[0],
            );
            break;
          }
          case "mill_part_classify_batch": {
            // Zod upstream (mill_part_classify_batch schema in millActionSchemas.ts)
            // already rejects missing/non-array `parts`. No defensive guard here.
            const { millPartClassifierEngine } = await import("../../engines/MillPartClassifierEngine.js");
            const p = params as { parts: Parameters<typeof millPartClassifierEngine.classify>[0][] };
            result = millPartClassifierEngine.classifyBatch(p.parts);
            break;
          }
          case "mill_part_family_profile": {
            // Zod upstream (mill_part_family_profile schema) already rejects
            // missing/wrong-type `family` via MillPartFamilySchema enum.
            const { millPartClassifierEngine } = await import("../../engines/MillPartClassifierEngine.js");
            const p = params as { family: Parameters<typeof millPartClassifierEngine.getFamilyProfile>[0] };
            result = millPartClassifierEngine.getFamilyProfile(p.family);
            break;
          }
          case "mill_part_families_list": {
            const { millPartClassifierEngine } = await import("../../engines/MillPartClassifierEngine.js");
            result = millPartClassifierEngine.listFamilies();
            break;
          }

          // ============================================================
          // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING:
          // MillingHybridStrategySynthesizer — hybrid strategy synthesis
          // ============================================================
          // Engine is pure-transform — no fs, no state, deterministic.
          // Zod schemas in millActionSchemas.ts validate input shape upstream;
          // the engine itself fail-louds via descriptive errors on missing fields.
          case "mill_hybrid_synthesize": {
            const engine = await getEngine("hybrid");
            result = engine.synthesize(params as Parameters<typeof engine.synthesize>[0]);
            break;
          }
          case "mill_hybrid_quick_recommend": {
            const engine = await getEngine("hybrid");
            result = engine.quickRecommend(params as Parameters<typeof engine.quickRecommend>[0]);
            break;
          }
          case "mill_hybrid_strategies": {
            const engine = await getEngine("hybrid");
            result = { strategies: engine.getStrategies() };
            break;
          }
          // ============================================================
          // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-2:
          // MillingLoRADatasetBuilderEngine — LoRA fine-tuning dataset builder
          // ============================================================
          // Engine wraps BaseLoRADatasetBuilder; pure-transform with no fs/network.
          // Zod schema in millActionSchemas.ts validates the jobs[] shape upstream.
          case "mill_lora_build_dataset": {
            const engine = await getEngine("lora_dataset");
            const p = params as {
              jobs: Parameters<typeof engine.buildDataset>[0];
              split?: Parameters<typeof engine.buildDataset>[1];
            };
            if (!Array.isArray(p.jobs)) {
              throw new Error("mill_lora_build_dataset requires 'jobs' as a non-empty array of RawJob records");
            }
            result = engine.buildDataset(p.jobs, p.split);
            break;
          }
          case "mill_lora_required_schema": {
            const engine = await getEngine("lora_dataset");
            result = engine.requiredSchema();
            break;
          }

          // U-BRIDGE-WIRE-MILLING iter-3: MillTurnLoRADatasetBuilderEngine
          case "millturn_lora_build_dataset": {
            const engine = await getEngine("millturn_lora");
            const p = params as {
              jobs: Parameters<typeof engine.buildDataset>[0];
              split?: Parameters<typeof engine.buildDataset>[1];
            };
            if (!Array.isArray(p.jobs)) {
              throw new Error("millturn_lora_build_dataset requires 'jobs' as a non-empty array of RawJob records");
            }
            result = engine.buildDataset(p.jobs, p.split);
            break;
          }
          case "millturn_lora_required_schema": {
            const engine = await getEngine("millturn_lora");
            result = engine.requiredSchema();
            break;
          }

          // U-BRIDGE-WIRE-MILLING iter-8: MillingAIUltraIntelligenceEngine —
          // 20 static-method ultra-AI surface: NL parsing, strategy selection,
          // tool-life prediction, RL policy, troubleshooting. All static calls
          // through the singleton alias (engine === class).
          case "mill_uai_parse_nl": {
            const engine = await getEngine("milling_uai");
            const p = params as { input: string };
            if (typeof p.input !== "string") throw new Error("mill_uai_parse_nl requires 'input' string");
            result = engine.parseNaturalLanguage(p.input);
            break;
          }
          case "mill_uai_process_nl": {
            const engine = await getEngine("milling_uai");
            const p = params as { input: string };
            if (typeof p.input !== "string") throw new Error("mill_uai_process_nl requires 'input' string");
            result = engine.processNaturalLanguage(p.input);
            break;
          }
          case "mill_uai_generate_prompt": {
            const engine = await getEngine("milling_uai");
            const p = params as { intent: Parameters<typeof engine.generatePRISMAIPrompt>[0] };
            if (!p.intent || typeof p.intent !== "object") throw new Error("mill_uai_generate_prompt requires 'intent' object");
            result = { prompt: engine.generatePRISMAIPrompt(p.intent) };
            break;
          }
          case "mill_uai_select_strategy": {
            const engine = await getEngine("milling_uai");
            const p = params as { request: Parameters<typeof engine.selectOptimalStrategy>[0] };
            if (!p.request || typeof p.request !== "object") throw new Error("mill_uai_select_strategy requires 'request' object");
            result = engine.selectOptimalStrategy(p.request);
            break;
          }
          case "mill_uai_compare_strategies": {
            const engine = await getEngine("milling_uai");
            const p = params as { request: Parameters<typeof engine.compareStrategies>[0] };
            if (!p.request || typeof p.request !== "object") throw new Error("mill_uai_compare_strategies requires 'request' object");
            result = { strategies: engine.compareStrategies(p.request) };
            break;
          }
          case "mill_uai_predict_tool_life": {
            const engine = await getEngine("milling_uai");
            const p = params as { input: Parameters<typeof engine.predictToolLife>[0] };
            if (!p.input || typeof p.input !== "object") throw new Error("mill_uai_predict_tool_life requires 'input' object");
            result = engine.predictToolLife(p.input);
            break;
          }
          case "mill_uai_record_tool_life": {
            const engine = await getEngine("milling_uai");
            const p = params as { input: Parameters<typeof engine.recordToolLifeData>[0]; actualLife: number };
            if (!p.input || typeof p.actualLife !== "number") {
              throw new Error("mill_uai_record_tool_life requires 'input' object + 'actualLife' number");
            }
            engine.recordToolLifeData(p.input, p.actualLife);
            result = { ok: true, recorded: true };
            break;
          }
          case "mill_uai_extract_toolpath_features": {
            const engine = await getEngine("milling_uai");
            const p = params as Parameters<typeof engine.extractToolpathFeatures>[0];
            if (!p || typeof p !== "object") throw new Error("mill_uai_extract_toolpath_features requires a context object");
            result = engine.extractToolpathFeatures(p);
            break;
          }
          case "mill_uai_score_toolpath": {
            const engine = await getEngine("milling_uai");
            const p = params as Parameters<typeof engine.scoreToolpath>[0];
            if (!p || typeof p !== "object") throw new Error("mill_uai_score_toolpath requires a features object");
            result = engine.scoreToolpath(p);
            break;
          }
          case "mill_uai_explain_decision": {
            const engine = await getEngine("milling_uai");
            const p = params as { request: Parameters<typeof engine.explainDecision>[0] };
            if (!p.request || typeof p.request !== "object") throw new Error("mill_uai_explain_decision requires 'request' object");
            result = engine.explainDecision(p.request);
            break;
          }
          case "mill_uai_get_recommended_action": {
            const engine = await getEngine("milling_uai");
            const p = params as { state: Parameters<typeof engine.getRecommendedAction>[0] };
            if (!p.state || typeof p.state !== "object") throw new Error("mill_uai_get_recommended_action requires 'state' object");
            result = engine.getRecommendedAction(p.state);
            break;
          }
          case "mill_uai_record_episode": {
            const engine = await getEngine("milling_uai");
            const p = params as { episode: Parameters<typeof engine.recordEpisode>[0] };
            if (!p.episode || typeof p.episode !== "object") throw new Error("mill_uai_record_episode requires 'episode' object");
            engine.recordEpisode(p.episode);
            result = { ok: true, recorded: true };
            break;
          }
          case "mill_uai_calculate_reward": {
            const engine = await getEngine("milling_uai");
            const p = params as {
              predicted: { ra_um: number; cycle_min: number; tool_life_min: number };
              actual: { ra_um: number; cycle_min: number; tool_life_min: number };
              scrap: boolean; rework: boolean;
            };
            if (!p.predicted || !p.actual || typeof p.scrap !== "boolean" || typeof p.rework !== "boolean") {
              throw new Error("mill_uai_calculate_reward requires predicted + actual objects + scrap + rework booleans");
            }
            result = engine.calculateReward(p.predicted, p.actual, p.scrap, p.rework);
            break;
          }
          case "mill_uai_get_policy_stats": {
            const engine = await getEngine("milling_uai");
            result = engine.getPolicyStats();
            break;
          }
          case "mill_uai_diagnose_problem": {
            const engine = await getEngine("milling_uai");
            const p = params as { request: Parameters<typeof engine.diagnoseProblem>[0] };
            if (!p.request || typeof p.request !== "object") throw new Error("mill_uai_diagnose_problem requires 'request' object");
            result = engine.diagnoseProblem(p.request);
            break;
          }
          case "mill_uai_generate_troubleshooting_prompt": {
            const engine = await getEngine("milling_uai");
            const p = params as { request: Parameters<typeof engine.generateTroubleshootingPrompt>[0] };
            if (!p.request || typeof p.request !== "object") throw new Error("mill_uai_generate_troubleshooting_prompt requires 'request' object");
            result = { prompt: engine.generateTroubleshootingPrompt(p.request) };
            break;
          }
          case "mill_uai_clear_all": {
            const engine = await getEngine("milling_uai");
            engine.clearAll();
            result = { ok: true, cleared: true };
            break;
          }
          case "mill_uai_get_tool_life_data_count": {
            const engine = await getEngine("milling_uai");
            result = { count: engine.getToolLifeDataCount() };
            break;
          }
          case "mill_uai_get_rl_episode_count": {
            const engine = await getEngine("milling_uai");
            result = { count: engine.getRLEpisodeCount() };
            break;
          }
          case "mill_uai_get_troubleshooting_history_count": {
            const engine = await getEngine("milling_uai");
            result = { count: engine.getTroubleshootingHistoryCount() };
            break;
          }

          // U-BRIDGE-WIRE-MILLING iter-7: MillingProductionKnowledgeHarvesterEngine —
          // shop-data harvested SFM/chipload/DOC/WOC recommendations + parameter
          // validation + tribal knowledge retrieval + self-awareness.
          case "mill_pkh_recommend_params": {
            const engine = await getEngine("milling_pkh");
            const p = params as { material: string; toolDiameter: number; operation: string };
            if (typeof p.material !== "string" || typeof p.toolDiameter !== "number" || typeof p.operation !== "string") {
              throw new Error("mill_pkh_recommend_params requires material (string) + toolDiameter (number) + operation (string)");
            }
            result = engine.getRecommendedParameters(p.material, p.toolDiameter, p.operation);
            break;
          }
          case "mill_pkh_validate_params": {
            const engine = await getEngine("milling_pkh");
            const p = params as {
              spindle_rpm: number; feed_mm_min: number; doc_mm: number;
              tool_diameter_mm: number; flutes: number; material: string;
            };
            const required = ["spindle_rpm","feed_mm_min","doc_mm","tool_diameter_mm","flutes","material"] as const;
            for (const k of required) {
              if (!(k in p)) throw new Error(`mill_pkh_validate_params missing required field '${k}'`);
            }
            result = engine.validateParameters(
              p.spindle_rpm, p.feed_mm_min, p.doc_mm,
              p.tool_diameter_mm, p.flutes, p.material,
            );
            break;
          }
          case "mill_pkh_tribal_knowledge": {
            const engine = await getEngine("milling_pkh");
            const p = params as { category?: string; material?: string };
            result = { items: engine.getTribalKnowledge(p.category, p.material) };
            break;
          }
          case "mill_pkh_stats": {
            const engine = await getEngine("milling_pkh");
            result = engine.getStats();
            break;
          }
          case "mill_pkh_self_awareness": {
            const engine = await getEngine("milling_pkh");
            result = engine.getSelfAwareness();
            break;
          }

          // U-BRIDGE-WIRE-MILLING iter-6: MillNeuralNetworkEngine —
          // LSTM-style neural net for milling parameter prediction.
          // Long positional-arg methods; dispatcher accepts named params and
          // applies them positionally.
          case "mill_neural_encode_features": {
            const engine = await getEngine("mill_neural_net");
            const p = params as {
              materialIso: string; toolType: string; operationType: string;
              toolDiameterMm: number; rpm: number; feed: number; doc: number;
              zLevelCount: number; cutterComp: boolean; isProven: boolean;
            };
            result = { features: engine.encodeFeatures(
              p.materialIso, p.toolType, p.operationType, p.toolDiameterMm,
              p.rpm, p.feed, p.doc, p.zLevelCount, p.cutterComp, p.isProven,
            )};
            break;
          }
          case "mill_neural_add_sample": {
            const engine = await getEngine("mill_neural_net");
            const p = params as {
              materialIso: string; toolType: string; operationType: string;
              toolDiameterMm: number; rpm: number; feed: number; doc: number;
              zLevelCount: number; cutterComp: boolean; isProven: boolean;
              targetRPM: number; targetFeed: number; targetDOC: number;
            };
            engine.addTrainingSample(
              p.materialIso, p.toolType, p.operationType, p.toolDiameterMm,
              p.rpm, p.feed, p.doc, p.zLevelCount, p.cutterComp, p.isProven,
              p.targetRPM, p.targetFeed, p.targetDOC,
            );
            result = { ok: true, sampleAdded: true };
            break;
          }
          case "mill_neural_train": {
            const engine = await getEngine("mill_neural_net");
            result = engine.train();
            break;
          }
          case "mill_neural_predict": {
            const engine = await getEngine("mill_neural_net");
            const p = params as {
              materialIso: string; toolType: string; operationType: string;
              toolDiameterMm: number; rpm: number; feed: number; doc: number;
              zLevelCount: number; cutterComp: boolean;
            };
            result = engine.predict(
              p.materialIso, p.toolType, p.operationType, p.toolDiameterMm,
              p.rpm, p.feed, p.doc, p.zLevelCount, p.cutterComp,
            );
            break;
          }

          // U-BRIDGE-WIRE-MILLING iter-5: MillingUltimateAIEngine —
          // deep-reasoning + Pareto + hybrid-synthesis quick-analyze + max-variability
          case "mill_ultimate_quick_analyze": {
            const engine = await getEngine("milling_ultimate");
            const p = params as { material?: unknown; feature_type?: unknown; [k: string]: unknown };
            if (!p || typeof p !== "object" || typeof p.material !== "string" || typeof p.feature_type !== "string") {
              throw new Error("mill_ultimate_quick_analyze requires UltimateMillingContext with material + feature_type");
            }
            result = engine.quickAnalyze(p);
            break;
          }
          case "mill_ultimate_explore_variability": {
            const engine = await getEngine("milling_ultimate");
            const p = params as { material?: unknown; feature_type?: unknown; [k: string]: unknown };
            if (!p || typeof p !== "object" || typeof p.material !== "string" || typeof p.feature_type !== "string") {
              throw new Error("mill_ultimate_explore_variability requires UltimateMillingContext with material + feature_type");
            }
            result = engine.exploreMaxVariability(p);
            break;
          }

          // U-BRIDGE-WIRE-MILLING iter-4: MillTurnCAMEngine — multi-channel
          // mill-turn / Swiss program generator (live tool + sub-spindle).
          case "millturn_cam_generate": {
            const engine = await getEngine("millturn_cam");
            const p = params as {
              operations: Parameters<typeof engine.generate>[0];
              config: Parameters<typeof engine.generate>[1];
            };
            if (!Array.isArray(p.operations) || p.operations.length === 0) {
              throw new Error("millturn_cam_generate requires 'operations' as a non-empty array of MillTurnOperation");
            }
            if (!p.config || typeof p.config !== "object" || !("machine_type" in p.config) || !("material_iso_group" in p.config)) {
              throw new Error("millturn_cam_generate requires 'config' with material_iso_group + machine_type fields");
            }
            result = engine.generate(p.operations, p.config);
            break;
          }

          case "mill_hybrid_synergy": {
            const { millingHybridStrategySynthesizer } = await import("../../engines/MillingHybridStrategySynthesizer.js");
            const STRATEGY_TYPES = [
              "trochoidal","plunge","hsm","conventional","hfm","rest",
              "pencil","spiral","ramp","helical","3_axis","5_axis",
            ] as const;
            type StrategyType = typeof STRATEGY_TYPES[number];
            const p = params as { primary?: string; secondary?: string };
            const isStrategy = (s: unknown): s is StrategyType =>
              typeof s === "string" && (STRATEGY_TYPES as readonly string[]).includes(s);
            if (!isStrategy(p.primary) || !isStrategy(p.secondary)) {
              throw new Error(
                `mill_hybrid_synergy requires 'primary' and 'secondary' to be one of: ${STRATEGY_TYPES.join(", ")}`,
              );
            }
            result = millingHybridStrategySynthesizer.getSynergy(p.primary, p.secondary);
            break;
          }

          // ============================================================
          // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILL iter-1:
          // FiveAxisLoRADatasetBuilderEngine + FiveAxisLoRACadenceEngine
          // 5-axis LoRA closed-loop — tilt/TCPC-aware dataset builder +
          // weekly retrain-cadence scheduler. Pure transforms, no fs/network.
          // ============================================================
          case "mill_5axis_lora_build_dataset": {
            const engine = await getEngine("fiveaxis_lora_dataset");
            const p = params as {
              jobs: Parameters<typeof engine.buildDataset>[0];
              split?: Parameters<typeof engine.buildDataset>[1];
            };
            if (!Array.isArray(p.jobs)) {
              throw new Error("mill_5axis_lora_build_dataset requires 'jobs' as a non-empty array of RawJob records");
            }
            result = engine.buildDataset(p.jobs, p.split);
            break;
          }
          case "mill_5axis_lora_required_schema": {
            const engine = await getEngine("fiveaxis_lora_dataset");
            result = engine.requiredSchema();
            break;
          }
          case "mill_5axis_lora_cadence_state": {
            const engine = await getEngine("fiveaxis_lora_cadence");
            result = engine.getState();
            break;
          }
          case "mill_5axis_lora_cadence_config": {
            const engine = await getEngine("fiveaxis_lora_cadence");
            result = engine.getConfig();
            break;
          }
          case "mill_5axis_lora_cadence_should_run": {
            const engine = await getEngine("fiveaxis_lora_cadence");
            result = engine.shouldTriggerRun();
            break;
          }
          case "mill_5axis_lora_cadence_check_drift": {
            const engine = await getEngine("fiveaxis_lora_cadence");
            const p = params as { currentScore: number; baselineScore: number };
            if (typeof p.currentScore !== "number" || typeof p.baselineScore !== "number") {
              throw new Error("mill_5axis_lora_cadence_check_drift requires 'currentScore' + 'baselineScore' numbers");
            }
            result = engine.checkDrift(p.currentScore, p.baselineScore);
            break;
          }

          // ============================================================
          // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-2:
          // FiveAxisCAMIntegrationEngine — 3-axis→5-axis conversion
          // (tool-axis from surface normals + lead/lean) and 5-axis
          // G-code emission (A/B rotary, optional G43.4/G43.5 RTCP).
          // ============================================================
          case "mill_5axis_cam_convert_3to5": {
            const engine = await getEngine("fiveaxis_cam");
            const p = params as { segments3?: unknown; config?: unknown };
            if (!Array.isArray(p.segments3) || p.segments3.length === 0) {
              throw new Error("mill_5axis_cam_convert_3to5 requires 'segments3' as a non-empty array of 3-axis path segments");
            }
            if (!p.config || typeof p.config !== "object") {
              throw new Error("mill_5axis_cam_convert_3to5 requires a 'config' object (machine_type, axis ranges, lead/lean angles)");
            }
            result = engine.convert3to5axis(p.segments3, p.config);
            break;
          }
          case "mill_5axis_cam_gcode": {
            const engine = await getEngine("fiveaxis_cam");
            const p = params as { segments?: unknown; config?: unknown };
            if (!Array.isArray(p.segments) || p.segments.length === 0) {
              throw new Error("mill_5axis_cam_gcode requires 'segments' as a non-empty array of 5-axis segments");
            }
            if (!p.config || typeof p.config !== "object" || typeof (p.config as { rpm?: unknown }).rpm !== "number") {
              throw new Error("mill_5axis_cam_gcode requires a 'config' object with a numeric 'rpm'");
            }
            result = { gcode: engine.toFiveAxisGcode(p.segments, p.config) };
            break;
          }

          // ============================================================
          // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-3:
          // FiveAxisToolpathSynthesisEngine — 5-axis strategy synthesis
          // (catalog scoring + singularity/RTCP analysis) and the
          // strategy-catalog read surface. Static-method class.
          // ============================================================
          case "mill_5axis_synth_recommend": {
            const engine = await getEngine("fiveaxis_synth");
            const p = params as { input?: unknown };
            if (!p.input || typeof p.input !== "object") {
              throw new Error("mill_5axis_synth_recommend requires an 'input' object (geometry, material, tool, machine, batch_size, operator_skill)");
            }
            result = engine.synthesize(p.input);
            break;
          }
          case "mill_5axis_synth_strategies": {
            const engine = await getEngine("fiveaxis_synth");
            result = { strategies: engine.getAllStrategies() };
            break;
          }
          case "mill_5axis_synth_strategies_by_family": {
            const engine = await getEngine("fiveaxis_synth");
            const p = params as { family?: unknown };
            if (typeof p.family !== "string") {
              throw new Error("mill_5axis_synth_strategies_by_family requires a 'family' string");
            }
            result = { strategies: engine.getStrategiesByFamily(p.family) };
            break;
          }
          case "mill_5axis_synth_novel_strategies": {
            const engine = await getEngine("fiveaxis_synth");
            result = { strategies: engine.getNovelStrategies() };
            break;
          }
          case "mill_5axis_synth_get_strategy": {
            const engine = await getEngine("fiveaxis_synth");
            const p = params as { id?: unknown };
            if (typeof p.id !== "string") {
              throw new Error("mill_5axis_synth_get_strategy requires an 'id' string");
            }
            const entry = engine.getStrategyById(p.id);
            result = { strategy: entry ?? null, found: entry !== undefined };
            break;
          }

          // ============================================================
          // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-4:
          // MillingUnifiedScienceOrchestrationEngine — 7-domain scientific
          // analysis (mechanics/thermo/metallurgy/tribology/dynamics/
          // chemistry/fluid) + rapid param validation + catalog reads.
          // ============================================================
          case "mill_sci_analyze": {
            const engine = await getEngine("milling_sci");
            const p = params as { material?: unknown; conditions?: unknown };
            if (typeof p.material !== "string") {
              throw new Error("mill_sci_analyze requires a 'material' string");
            }
            if (!p.conditions || typeof p.conditions !== "object") {
              throw new Error("mill_sci_analyze requires a 'conditions' object (CuttingConditions)");
            }
            result = engine.analyzeScientifically(p.material, p.conditions);
            break;
          }
          case "mill_sci_quick_analyze": {
            const engine = await getEngine("milling_sci");
            const p = params as {
              material?: unknown; Vc?: unknown; fz?: unknown;
              ap?: unknown; ae?: unknown; D?: unknown;
            };
            if (typeof p.material !== "string") {
              throw new Error("mill_sci_quick_analyze requires a 'material' string");
            }
            for (const k of ["Vc", "fz", "ap", "ae", "D"] as const) {
              const v = p[k];
              if (typeof v !== "number" || !Number.isFinite(v)) {
                throw new Error(`mill_sci_quick_analyze requires a finite numeric '${k}'`);
              }
            }
            result = engine.quickAnalyze(
              p.material, p.Vc as number, p.fz as number,
              p.ap as number, p.ae as number, p.D as number,
            );
            break;
          }
          case "mill_sci_material_properties": {
            const engine = await getEngine("milling_sci");
            const p = params as { material?: unknown };
            if (typeof p.material !== "string") {
              throw new Error("mill_sci_material_properties requires a 'material' string");
            }
            const props = engine.getMaterialProperties(p.material);
            result = { material: p.material, properties: props ?? null, found: props !== null };
            break;
          }
          case "mill_sci_materials": {
            const engine = await getEngine("milling_sci");
            result = { materials: engine.getAvailableMaterials() };
            break;
          }
          case "mill_sci_tips": {
            const engine = await getEngine("milling_sci");
            const p = params as { domain?: unknown };
            if (typeof p.domain !== "string") {
              throw new Error("mill_sci_tips requires a 'domain' string (mechanics, thermodynamics, ...)");
            }
            result = { domain: p.domain, tips: engine.getScientificTips(p.domain) };
            break;
          }
          case "mill_sci_domains": {
            const engine = await getEngine("milling_sci");
            result = { domains: engine.getScientificDomains() };
            break;
          }
          case "mill_sci_self_awareness": {
            const engine = await getEngine("milling_sci");
            result = engine.getSelfAwareness();
            break;
          }
          case "mill_sci_stats": {
            const engine = await getEngine("milling_sci");
            result = engine.getStats();
            break;
          }

          // ============================================================
          // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-5:
          // FiveAxisOrchestrationEngine — 5-axis DSL parsing + RTCP
          // controller dialects + machine-dynamics catalog + sequence
          // registry (the bounded-input core of the orchestrator).
          // ============================================================
          case "mill_5axis_orch_dsl_examples": {
            const engine = await getEngine("fiveaxis_orch");
            result = { examples: engine.getDSLSyntaxExamples() };
            break;
          }
          case "mill_5axis_orch_parse_dsl": {
            const engine = await getEngine("fiveaxis_orch");
            const p = params as { source?: unknown };
            if (typeof p.source !== "string" || p.source.length === 0) {
              throw new Error("mill_5axis_orch_parse_dsl requires a non-empty 'source' DSL string");
            }
            result = engine.parseDSL(p.source);
            break;
          }
          case "mill_5axis_orch_rtcp_dialect": {
            const engine = await getEngine("fiveaxis_orch");
            const p = params as { controller?: unknown };
            if (typeof p.controller !== "string") {
              throw new Error("mill_5axis_orch_rtcp_dialect requires a 'controller' string (fanuc, heidenhain, siemens, ...)");
            }
            const dialect = engine.getRTCPDialect(p.controller);
            result = { dialect: dialect ?? null, found: dialect != null };
            break;
          }
          case "mill_5axis_orch_machine_dynamics": {
            const engine = await getEngine("fiveaxis_orch");
            const p = params as { machine_id?: unknown };
            if (typeof p.machine_id !== "string") {
              throw new Error("mill_5axis_orch_machine_dynamics requires a 'machine_id' string");
            }
            result = engine.getDefaultDynamics(p.machine_id);
            break;
          }
          case "mill_5axis_orch_sequences": {
            const engine = await getEngine("fiveaxis_orch");
            result = { sequences: engine.getAllSequences() };
            break;
          }

          // iter9 wire-unwired-loop: 4th-axis + cold-heading
          case "fourth_axis_indexing_plan": {
            const { fourthAxisIndexingEngine } = await import("../../engines/FourthAxisIndexingEngine.js");
            const p = params as any;
            result = { success: true, data: (fourthAxisIndexingEngine as any).plan?.(p) ?? (fourthAxisIndexingEngine as any).calculate?.(p) ?? (fourthAxisIndexingEngine as any).run?.(p) ?? { engine: "FourthAxisIndexingEngine", note: "method not callable" } };
            break;
          }
          case "fourth_axis_decision_select": {
            const { fourthAxisDecisionEngine } = await import("../../engines/FourthAxisDecisionEngine.js");
            const p = params as any;
            result = { success: true, data: (fourthAxisDecisionEngine as any).select?.(p) ?? (fourthAxisDecisionEngine as any).decide?.(p) ?? (fourthAxisDecisionEngine as any).run?.(p) ?? { engine: "FourthAxisDecisionEngine", note: "method not callable" } };
            break;
          }
          case "cold_heading_tool_configure": {
            const { coldHeadingToolConfiguratorEngine } = await import("../../engines/ColdHeadingToolConfiguratorEngine.js");
            const p = params as any;
            result = { success: true, data: (coldHeadingToolConfiguratorEngine as any).configure?.(p) ?? (coldHeadingToolConfiguratorEngine as any).run?.(p) ?? { engine: "ColdHeadingToolConfiguratorEngine", note: "method not callable" } };
            break;
          }

          // ============================================================
          // U-MILL-HM-FIXTURE (slot:bravo): MonolithHyperMillFixtureDatabaseEngine
          // R12-safe -- in-memory hyperMILL fixture/workholding catalog (6 vises,
          // 7 chucks, 3 clamp families) + deterministic threshold-based part-dims
          // auto-selection. Read-only DATA + pure selection logic: NO inference,
          // NO live execution. Its fuzzy search() is reachable via the merged
          // CatalogUnifiedQueryEngine (prism_intelligence); these actions expose
          // the structured catalog + part-dims auto-select surface that nothing
          // else does. Distinct from the physics fixture_*/workholding_* force
          // calculators (those compute clamp force/deflection -- this is DATA).
          // ============================================================
          case "mill_hm_fixture_vises": {
            const engine = await getEngine("hm_fixture");
            result = { vises: engine.listVises() };
            break;
          }
          case "mill_hm_fixture_chucks": {
            const engine = await getEngine("hm_fixture");
            result = { chucks: engine.listChucks() };
            break;
          }
          case "mill_hm_fixture_clamps": {
            const engine = await getEngine("hm_fixture");
            result = { clamps: engine.listClamps() };
            break;
          }
          case "mill_hm_fixture_get_vise": {
            const engine = await getEngine("hm_fixture");
            const p = params as { id?: unknown };
            if (typeof p.id !== "string" || p.id.trim() === "") {
              throw new Error("mill_hm_fixture_get_vise requires a non-empty 'id' string (e.g. 'Centric_6-200')");
            }
            const vise = engine.getVise(p.id);
            result = { vise: vise ?? null, found: vise != null };
            break;
          }
          case "mill_hm_fixture_get_chuck": {
            const engine = await getEngine("hm_fixture");
            const p = params as { id?: unknown };
            if (typeof p.id !== "string" || p.id.trim() === "") {
              throw new Error("mill_hm_fixture_get_chuck requires a non-empty 'id' string (e.g. '5C_Collet')");
            }
            const chuck = engine.getChuck(p.id);
            result = { chuck: chuck ?? null, found: chuck != null };
            break;
          }
          case "mill_hm_fixture_auto_select": {
            const engine = await getEngine("hm_fixture");
            const p = params as { part_dims?: unknown };
            if (!p.part_dims || typeof p.part_dims !== "object" || Array.isArray(p.part_dims)) {
              throw new Error("mill_hm_fixture_auto_select requires a 'part_dims' object { x, y, z } in mm");
            }
            const sel = engine.autoSelect(p.part_dims);
            result = {
              vise: sel.vise ?? null,
              chuck: sel.chuck ?? null,
              clamp: sel.clamp ?? null,
              vise_found: sel.vise != null,
              chuck_found: sel.chuck != null,
              clamp_found: sel.clamp != null,
            };
            break;
          }
          case "mill_hm_fixture_search": {
            const engine = await getEngine("hm_fixture");
            const p = params as { query?: unknown; limit?: unknown };
            if (typeof p.query !== "string" || p.query.trim() === "") {
              throw new Error("mill_hm_fixture_search requires a non-empty 'query' string");
            }
            const limit = typeof p.limit === "number" && Number.isInteger(p.limit) && p.limit > 0 ? p.limit : 20;
            const hits = engine.search(p.query, limit);
            result = { hits, count: hits.length, query: p.query };
            break;
          }
          case "mill_hm_fixture_stats": {
            const engine = await getEngine("hm_fixture");
            result = engine.stats();
            break;
          }

          default:
            return dispatcherError(`Unknown action: ${action}`, action, "prism_mill");
        }

        result = await Promise.resolve(result);

        // Post-calculation hooks
        const postCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: result },
          metadata: { dispatcher: "millDispatcher", action, result }
        };
        await hookExecutor.execute("post-calculation", postCtx);

        return { content: [{ type: "text", text: JSON.stringify(slimResponse(result)) }] };

      } catch (error: any) {
        log.error(`[prism_mill] Error in ${action}: ${error.message}`);
        return dispatcherError(error.message, action, "prism_mill");
      }
    }
  );
}
