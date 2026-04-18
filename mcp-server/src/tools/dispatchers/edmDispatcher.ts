/**
 * prism_edm — Non-Traditional Machining Dispatcher
 *
 * 16 legacy + 35 WEDM pipeline + 1 calculator orchestration = 52 total.
 *
 * Legacy engines: ElectrodeDesignEngine, WireEDMSettingsEngine,
 *   EDMSurfaceIntegrityEngine, MicroEDMEngine, LaserCuttingEngine,
 *   WaterjetCuttingEngine, SinkerEDMCalculatorEngine
 *
 * WEDM-P2P pipeline engines (12):
 *   EDMDrawingInterpretationEngine, EDMFeasibilityEngine,
 *   EDMMaterialMachineWireEngine, EDMStartHoleSetupEngine,
 *   EDMToolpathStrategyEngine, EDMMultiPassStrategyEngine,
 *   EDMCuttingParamFlushEngine, EDMWireSlugCornerTaperEngine,
 *   EDMMonitorSurfaceIntegrityEngine, EDMPostProcessGCodeEngine,
 *   EDMCostDocumentationEngine, EDMQualityOrchestratorEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { EDM_ACTION_SCHEMAS } from "../../schemas/edmActionSchemas.js";
import { WEDM_PIPELINE_ACTION_SCHEMAS } from "../../schemas/wedmPipelineActionSchemas.js";
import { WEDM_ML_OPTIMIZER_SCHEMAS } from "../../schemas/wedmMLOptimizerSchemas.js";
import { WEDM_FEATURE_IMPORTANCE_SCHEMAS } from "../../schemas/wedmFeatureImportanceSchemas.js";
import { WEDM_TRANSFER_LEARNING_SCHEMAS } from "../../schemas/wedmTransferLearningSchemas.js";
import { WEDM_ONLINE_LEARNING_SCHEMAS } from "../../schemas/wedmOnlineLearningSchemas.js";
import { WEDM_THERMAL_FIELD_SCHEMAS } from "../../schemas/wedmThermalFieldSchemas.js";
import { WEDM_SPARK_EROSION_SCHEMAS } from "../../schemas/wedmSparkErosionSchemas.js";
import { WEDM_GAP_VOLTAGE_SCHEMAS } from "../../schemas/wedmGapVoltageSchemas.js";
import { WEDM_MRR_SCHEMAS } from "../../schemas/wedmMRRSchemas.js";
import { WEDM_WIRE_STRESS_SCHEMAS } from "../../schemas/wedmWireStressSchemas.js";
import { WEDM_WIRE_TENSION_OPT_SCHEMAS } from "../../schemas/wedmWireTensionOptSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";
import { consultAwareness, extractAwarenessKeywords, wrapWithAwareness, type AwarenessConsultResult } from "./awarenessMiddleware.js";

// Merge legacy + pipeline + ML optimizer + feature importance + transfer learning + online learning + thermal field + spark erosion schemas
const ALL_EDM_SCHEMAS = { ...EDM_ACTION_SCHEMAS, ...WEDM_PIPELINE_ACTION_SCHEMAS, ...WEDM_ML_OPTIMIZER_SCHEMAS, ...WEDM_FEATURE_IMPORTANCE_SCHEMAS, ...WEDM_TRANSFER_LEARNING_SCHEMAS, ...WEDM_ONLINE_LEARNING_SCHEMAS, ...WEDM_THERMAL_FIELD_SCHEMAS, ...WEDM_SPARK_EROSION_SCHEMAS, ...WEDM_GAP_VOLTAGE_SCHEMAS, ...WEDM_MRR_SCHEMAS, ...WEDM_WIRE_STRESS_SCHEMAS, ...WEDM_WIRE_TENSION_OPT_SCHEMAS };

// Legacy engine lazy loaders
let _electrode: any, _wire: any, _surface: any, _micro: any;
let _laser: any, _waterjet: any, _sinker: any;
let _coldHeadingConfigurator: any; // ELEC-PIPE-MS0
let _trilobeElectrodeGeometry: any; // ELEC-PIPE Session 8
let _eccentricTurning: any; // ELEC-PIPE Session 8
let _electrodeAIReasoning: any; // ELEC-PIPE-AI-HARDEN
let _electrodeDeepLearning: any; // ELEC-PIPE-DEEP-AI
let _electrodeAdvancedAI: any; // ELEC-PIPE-ULTRA-AI
let _electrodeUltimateAI: any; // ELEC-PIPE-OMEGA-AI

// WEDM geometry parser lazy loader
let _geometryParser: any;

// WEDM-P2P pipeline engine lazy loaders
let _drawingInterp: any, _feasibility: any, _materialMachineWire: any;
let _startHoleSetup: any, _toolpathStrategy: any, _multiPass: any;
let _cuttingParamFlush: any, _wireSlugCornerTaper: any;
let _monitorSurface: any, _postProcessGCode: any;
let _costDocumentation: any, _qualityOrchestrator: any;
let _biMaterial: any;
let _feedbackCalibration: any, _calibrationReport: any, _programParser: any;
let _wireEDMDeepAIHardening: any;
let _wedmCalculatorAI: any;
let _wedmScheduling: any;
let _wedmProductionReadiness: any;
let _wedmProgramIndex: any;
// WEDM Neural AI Engine lazy loaders (WEDM-HARDEN-MS1)
let _wedmNeuralTraining: any;
let _wedmBatchAnalyzer: any;
let _wedmProgramOptimizer: any;
let _wedmProgramNeuralAnalysis: any;
// WEDM Knowledge Synthesis Engine (WEDM-SYNTH-MS1)
let _wedmKnowledgeSynthesis: any;
// WEDM Predictive Intelligence Engine (WEDM-PREDICT-MS1)
let _wedmPredictiveIntelligence: any;
// WEDM Deep Neural Reasoning Engine (WEDM-NEURAL-REASON-MS1)
let _wedmDeepNeuralReasoning: any;
// MS-P1-100PCT U-P1-02: Citation verification
let _wedmCitationCheck: any;

async function getEngine(name: string): Promise<any> {
  switch (name) {
    // Legacy engines
    case "electrode": return _electrode ??= (await import("../../engines/ElectrodeDesignEngine.js")).electrodeDesignEngine;
    case "wire": return _wire ??= (await import("../../engines/WireEDMSettingsEngine.js")).wireEDMSettingsEngine;
    case "surface": return _surface ??= (await import("../../engines/EDMSurfaceIntegrityEngine.js")).edmSurfaceIntegrityEngine;
    case "micro": return _micro ??= (await import("../../engines/MicroEDMEngine.js")).microEDMEngine;
    case "laser": return _laser ??= (await import("../../engines/LaserCuttingEngine.js")).laserCuttingEngine;
    case "waterjet": return _waterjet ??= (await import("../../engines/WaterjetCuttingEngine.js")).waterjetCuttingEngine;
    case "sinker": return _sinker ??= (await import("../../engines/SinkerEDMCalculatorEngine.js")).sinkerEDMCalculatorEngine;
    case "coldHeadingConfigurator": return _coldHeadingConfigurator ??= (await import("../../engines/ColdHeadingToolConfiguratorEngine.js")).coldHeadingToolConfiguratorEngine;
    case "trilobeElectrodeGeometry": return _trilobeElectrodeGeometry ??= (await import("../../engines/TrilobeElectrodeGeometryEngine.js")).trilobeElectrodeGeometryEngine;
    case "eccentricTurning": return _eccentricTurning ??= (await import("../../engines/EccentricTurningEngine.js")).eccentricTurningEngine;
    case "electrodeAIReasoning": return _electrodeAIReasoning ??= (await import("../../engines/ElectrodeAIReasoningEngine.js")).electrodeAIReasoningEngine;
    case "electrodeDeepLearning": return _electrodeDeepLearning ??= (await import("../../engines/ElectrodeDeepLearningEngine.js")).electrodeDeepLearningEngine;
    case "electrodeAdvancedAI": return _electrodeAdvancedAI ??= (await import("../../engines/ElectrodeAdvancedAIEngine.js")).electrodeAdvancedAIEngine;
    case "electrodeUltimateAI": return _electrodeUltimateAI ??= (await import("../../engines/ElectrodeUltimateAIEngine.js")).electrodeUltimateAIEngine;

    // WEDM-P2P pipeline engines
    case "geometryParser": return _geometryParser ??= (await import("../../engines/DXFGeometryParserEngine.js")).dxfGeometryParserEngine;
    case "drawingInterp": return _drawingInterp ??= (await import("../../engines/EDMDrawingInterpretationEngine.js")).edmDrawingInterpretationEngine;
    case "feasibility": return _feasibility ??= (await import("../../engines/EDMFeasibilityEngine.js")).edmFeasibilityEngine;
    case "materialMachineWire": return _materialMachineWire ??= (await import("../../engines/EDMMaterialMachineWireEngine.js")).edmMaterialMachineWireEngine;
    case "startHoleSetup": return _startHoleSetup ??= (await import("../../engines/EDMStartHoleSetupEngine.js")).edmStartHoleSetupEngine;
    case "toolpathStrategy": return _toolpathStrategy ??= (await import("../../engines/EDMToolpathStrategyEngine.js")).edmToolpathStrategyEngine;
    case "multiPass": return _multiPass ??= (await import("../../engines/EDMMultiPassStrategyEngine.js")).edmMultiPassStrategyEngine;
    case "cuttingParamFlush": return _cuttingParamFlush ??= (await import("../../engines/EDMCuttingParamFlushEngine.js")).edmCuttingParamFlushEngine;
    case "wireSlugCornerTaper": return _wireSlugCornerTaper ??= (await import("../../engines/EDMWireSlugCornerTaperEngine.js")).edmWireSlugCornerTaperEngine;
    case "monitorSurface": return _monitorSurface ??= (await import("../../engines/EDMMonitorSurfaceIntegrityEngine.js")).edmMonitorSurfaceIntegrityEngine;
    case "postProcessGCode": return _postProcessGCode ??= (await import("../../engines/EDMPostProcessGCodeEngine.js")).edmPostProcessGCodeEngine;
    case "costDocumentation": return _costDocumentation ??= (await import("../../engines/EDMCostDocumentationEngine.js")).edmCostDocumentationEngine;
    case "qualityOrchestrator": return _qualityOrchestrator ??= (await import("../../engines/EDMQualityOrchestratorEngine.js")).edmQualityOrchestratorEngine;
    case "biMaterial": return _biMaterial ??= (await import("../../engines/EDMBiMaterialCompensationEngine.js")).edmBiMaterialCompensationEngine;
    case "feedbackCalibration": return _feedbackCalibration ??= (await import("../../engines/WEDMFeedbackCalibrationEngine.js")).wedmFeedbackCalibrationEngine;
    case "calibrationReport": return _calibrationReport ??= new (await import("../../engines/WEDMCalibrationReportEngine.js")).WEDMCalibrationReportEngine();
    case "programParser": return _programParser ??= new (await import("../../engines/WireEDMProgramParserEngine.js")).WireEDMProgramParserEngine();
    case "wireEDMDeepAIHardening": return _wireEDMDeepAIHardening ??= (await import("../../engines/WireEDMDeepAIHardeningEngine.js")).wireEDMDeepAIHardeningEngine;
    case "wedmCalculatorAI": return _wedmCalculatorAI ??= (await import("../../engines/WEDMCalculatorAIEngine.js")).wedmCalculatorAIEngine;
    case "wedmScheduling": return _wedmScheduling ??= (await import("../../engines/WEDMSchedulingEngine.js")).wedmSchedulingEngine;
    case "wedmProductionReadiness": return _wedmProductionReadiness ??= (await import("../../engines/WEDMProductionReadinessEngine.js")).wedmProductionReadinessEngine;
    case "wedmProgramIndex": return _wedmProgramIndex ??= (await import("../../engines/WedmProgramIndexEngine.js")).WedmProgramIndexEngine;
    // WEDM Neural AI Engines (WEDM-HARDEN-MS1)
    case "wedmNeuralTraining": return _wedmNeuralTraining ??= (await import("../../engines/WEDMNeuralTrainingEngine.js")).wedmNeuralTrainingEngine;
    case "wedmBatchAnalyzer": return _wedmBatchAnalyzer ??= (await import("../../engines/WEDMBatchProgramAnalyzerEngine.js")).wedmBatchProgramAnalyzerEngine;
    case "wedmProgramOptimizer": return _wedmProgramOptimizer ??= (await import("../../engines/WEDMProgramOptimizerEngine.js")).wedmProgramOptimizerEngine;
    case "wedmProgramNeuralAnalysis": return _wedmProgramNeuralAnalysis ??= (await import("../../engines/WEDMProgramNeuralAnalysisEngine.js")).wedmProgramNeuralAnalysisEngine;
    // WEDM Knowledge Synthesis Engine (WEDM-SYNTH-MS1)
    case "wedmKnowledgeSynthesis": return _wedmKnowledgeSynthesis ??= (await import("../../engines/WireEDMKnowledgeSynthesisEngine.js")).wireEDMKnowledgeSynthesisEngine;
    // WEDM Predictive Intelligence Engine (WEDM-PREDICT-MS1)
    case "wedmPredictiveIntelligence": return _wedmPredictiveIntelligence ??= (await import("../../engines/WireEDMPredictiveIntelligenceEngine.js")).wireEDMPredictiveIntelligenceEngine;
    // WEDM Deep Neural Reasoning Engine (WEDM-NEURAL-REASON-MS1)
    case "wedmDeepNeuralReasoning": return _wedmDeepNeuralReasoning ??= (await import("../../engines/WireEDMDeepNeuralReasoningEngine.js")).wireEDMDeepNeuralReasoningEngine;
    // MS-P1-100PCT U-P1-02: Citation verification
    case "wedmCitationCheck": return _wedmCitationCheck ??= (await import("../../engines/WEDMCitationCheckEngine.js")).wedmCitationCheckEngine;

    default: throw new Error(`Unknown engine: ${name}`);
  }
}

/**
 * Shape bridges: normalize frontend parameter shapes to match Zod schemas
 * and engine expectations. Runs before Zod validation so frontend callers
 * can send simplified/flat params while engines receive correct structures.
 */
function bridgeWedmInput(action: string, params: Record<string, any>): Record<string, any> {
  switch (action) {
    // ── Feasibility: compute workpiece from features bounding box if missing ──
    case "wedm_assess_feasibility":
    case "wedm_check_conductivity":
    case "wedm_estimate_time": {
      if (!params.workpiece && Array.isArray(params.features) && params.features.length > 0) {
        let maxThickness = params.overall_thickness_mm ?? 25;
        let maxLength = 0;
        let maxWidth = 0;
        for (const f of params.features) {
          const d = f.dimensions_mm ?? {};
          maxLength = Math.max(maxLength, d.length ?? f.profile_length_mm ?? 50);
          maxWidth = Math.max(maxWidth, d.width ?? 50);
          if (d.depth) maxThickness = Math.max(maxThickness, d.depth);
        }
        return { ...params, workpiece: {
          thickness_mm: maxThickness, length_mm: maxLength || 100,
          width_mm: maxWidth || 100, height_mm: maxThickness,
        }};
      }
      return params;
    }

    // ── Toolpath: accept features or profiles_classified as aliases for profiles ──
    case "wedm_generate_toolpath":
    case "wedm_plan_tabs":
    case "wedm_optimize_sequence": {
      if (!params.profiles) {
        const src = params.profiles_classified ?? params.features;
        if (Array.isArray(src) && src.length > 0) {
          return { ...params, profiles: src.map((f: any) => ({
            name: f.name ?? f.id ?? "profile",
            type: f.type ?? f.profile_type ?? "closed_external",
            contour_points: f.contour_points ?? [],
            profile_length_mm: f.profile_length_mm ?? f.perimeter_mm ?? 100,
            min_corner_radius_mm: f.min_corner_radius_mm,
            taper_angle_deg: f.taper_angle_deg,
            tolerance_mm: f.tolerance_mm,
            start_hole_id: f.start_hole_id,
            is_critical_surface: f.is_critical_surface,
          }))};
        }
      }
      return params;
    }

    // ── MultiPass: alias workpiece_thickness_mm → thickness_mm ──
    case "wedm_plan_passes":
    case "wedm_full_multipass": {
      const bridged = { ...params };
      if (!bridged.thickness_mm && bridged.workpiece_thickness_mm) {
        bridged.thickness_mm = bridged.workpiece_thickness_mm;
      }
      if (!bridged.profile_length_mm) {
        bridged.profile_length_mm = bridged.total_cut_length_mm ?? bridged.total_profile_length_mm;
      }
      return bridged;
    }

    default:
      return params;
  }
}

const ACTIONS = [
  // Legacy actions
  "electrode_design", "wire_settings", "surface_integrity", "micro_edm",
  "laser_calculate", "laser_materials", "laser_machines", "laser_gas_recommend",
  "waterjet_calculate", "waterjet_materials", "waterjet_abrasives", "waterjet_quality_levels",
  "sinker_calculate", "sinker_materials", "sinker_vdi_scale", "sinker_recommend",

  // Electrode pipeline (ELEC-PIPE-MS0)
  "electrode_configure_tooling", "electrode_job_get", "electrode_job_list", "electrode_configurator_stats",

  // Trilobe electrode geometry (ELEC-PIPE Session 8)
  "trilobe_generate", "trilobe_preview", "trilobe_stats",

  // Eccentric turning (ELEC-PIPE Session 8)
  "eccentric_turning_generate", "eccentric_turning_controllers", "eccentric_turning_validate",

  // Electrode AI reasoning (ELEC-PIPE-AI-HARDEN)
  "electrode_ai_material", "electrode_ai_spark_gap", "electrode_ai_trilobe",
  "electrode_ai_turning", "electrode_ai_cam", "electrode_ai_full_design",
  "electrode_ai_reasoning_chain", "electrode_ai_stats",

  // Electrode Deep Learning (ELEC-PIPE-DEEP-AI)
  "electrode_deep_wear", "electrode_deep_finish", "electrode_deep_force",
  "electrode_deep_optimize", "electrode_deep_comprehensive",
  "electrode_deep_feedback", "electrode_deep_stats",

  // Electrode Advanced AI (ELEC-PIPE-ULTRA-AI)
  "electrode_ultra_feature_importance", "electrode_ultra_counterfactual",
  "electrode_ultra_consensus", "electrode_ultra_anomaly",
  "electrode_ultra_active_learning", "electrode_ultra_causal_effect",
  "electrode_ultra_causal_dag", "electrode_ultra_ensemble",
  "electrode_ultra_comprehensive", "electrode_ultra_stats",

  // Electrode Ultimate AI (ELEC-PIPE-OMEGA-AI)
  "electrode_omega_transformer", "electrode_omega_gnn", "electrode_omega_lstm_wear",
  "electrode_omega_vae_encode", "electrode_omega_pinn",
  "electrode_omega_tree_of_thoughts", "electrode_omega_self_consistency",
  "electrode_omega_verify_reasoning", "electrode_omega_reflexion", "electrode_omega_react",
  "electrode_omega_store_episode", "electrode_omega_retrieve_episodes",
  "electrode_omega_query_kg", "electrode_omega_infer_kg",
  "electrode_omega_deep_ensemble", "electrode_omega_mc_dropout", "electrode_omega_conformal",
  "electrode_omega_hierarchical_plan", "electrode_omega_curriculum_status",
  "electrode_omega_comprehensive", "electrode_omega_stats",

  // WEDM geometry parser
  "wedm_parse_geometry", "wedm_validate_geometry",

  // WEDM-P2P pipeline actions
  "wedm_interpret_drawing", "wedm_classify_features", "wedm_calculate_passes",
  "wedm_assess_feasibility", "wedm_check_conductivity", "wedm_estimate_time",
  "wedm_assess_material", "wedm_select_machine", "wedm_select_wire", "wedm_full_selection", "wedm_machine_uv_travel",
  "wedm_plan_start_holes", "wedm_plan_setup",
  "wedm_generate_toolpath", "wedm_plan_tabs", "wedm_optimize_sequence",
  "wedm_plan_passes", "wedm_full_multipass",
  "wedm_optimize_params", "wedm_plan_flushing", "wedm_predict_wire_break", "wedm_plan_break_recovery",
  "wedm_plan_wire_management", "wedm_calculate_corners", "wedm_solve_taper",
  "wedm_monitor_process", "wedm_assess_surface_integrity", "wedm_check_spec",
  "wedm_plan_post_process", "wedm_generate_gcode",
  "wedm_estimate_cost", "wedm_generate_setup_sheet", "wedm_full_documentation",
  "wedm_verify_quality", "wedm_run_pipeline", "wedm_record_job", "wedm_get_recommendation",
  "wedm_evaluate_spec_compliance", "wedm_get_spec_limits",
  "wedm_override_quality_gate", "wedm_get_gate_overrides", "wedm_evaluate_quality_gate",
  "wedm_get_audit_log",

  // EDMBiMaterialCompensationEngine
  "wedm_bimaterial_optimize", "wedm_bimaterial_transition_risk", "wedm_bimaterial_infer_zones",
  "wedm_bimaterial_uv_compensation",

  // Feedback loop — calibration, program parsing, feedback submission
  "wedm_submit_feedback", "wedm_calibration_report", "wedm_parse_program",

  // Photo-to-quote shortcut
  "wedm_photo_to_quote",

  // CWEDM-MS0: Calculator orchestration (6-engine chain for speed/feed calculator wire_edm tab)
  "wedm_calculator_solve",
  // Forge-Triple: WEDM-MS0 + WEDM-MS1
  "wedm_studio_pipeline", "wedm_advanced_analysis",

  // WEDM-100PCT-MS0: Complete 30-stage orchestrator (physics-optimized, all dialects)
  "wedm_generate_complete_program",
  "wedm_generate_optimized_program", // forge-triple alias → routes to same orchestrator

  // U-WGAP06: Machine Reservation (Book-Ahead)
  "wedm_reserve_machine", "wedm_check_availability", "wedm_cancel_reservation",

  // U-WGAP09: Pre-flight safety checklist
  "wedm_preflight_check",

  // WEDM-CAL-MS4 U-CAL21: Production readiness scoring
  "wedm_production_readiness",

  // WEDM-MASTER-AI-MS1: Master AI Orchestration
  "wedm_master_ai_analyze",
  "wedm_master_ai_parameters",
  "wedm_master_ai_troubleshoot",
  "wedm_master_ai_optimize",
  "wedm_master_ai_generate",

  // WEDM-REASON-MS1: Deep Reasoning
  "wedm_reason",
  "wedm_reason_causal",
  "wedm_reason_diagnose",
  "wedm_reason_analogies",
  "wedm_reason_probabilistic",

  // WEDM-NEURAL-ORCH-MS1: Neural Orchestration
  "wedm_orchestrate",
  "wedm_orchestrate_quick",
  "wedm_orchestrate_cost",
  "wedm_orchestrate_troubleshoot",
  "wedm_orchestrate_compare",
  "wedm_orchestrate_feedback",

  // WEDM-SELF-AWARE-MS1: Self-Awareness Integration
  "wedm_ai_query",
  "wedm_ai_capabilities",
  "wedm_ai_tribal_search",
  "wedm_ai_validate",
  "wedm_ai_recommend_engine",
  "wedm_ai_jmdie_context",

  // WEDM-DEEP-LOGIC-MS1: Deep Logic Engine
  "wedm_logic_reason",
  "wedm_logic_counterfactual",
  "wedm_logic_hypothesis",
  "wedm_logic_inference",
  "wedm_logic_constraint",
  "wedm_logic_decision",
  "wedm_logic_test_hypothesis",

  // WEDM-SYNTH-MS1: Knowledge Synthesis Engine
  "wedm_synth_query",
  "wedm_synth_counterfactual",
  "wedm_synth_hypotheses",
  "wedm_synth_learn",
  "wedm_synth_transfer",
  "wedm_synth_status",

  // WEDM-PREDICT-MS1: Predictive Intelligence Engine
  "wedm_predict_full",
  "wedm_predict_ra",
  "wedm_predict_time",
  "wedm_predict_risk",
  "wedm_predict_cost",
  "wedm_predict_quality",
  "wedm_predict_status",

  // WEDM-NEURAL-REASON-MS1: Deep Neural Reasoning Engine
  "wedm_neural_reason",
  "wedm_neural_reason_deep",
  "wedm_neural_ecode_lookup",
  "wedm_neural_material_embedding",
  "wedm_neural_status",

  // MS-P1-100PCT U-P1-02: Citation verification
  "wedm_citation_check",
  "wedm_citation_report",
  "wedm_synthetics_list",

  // MS-P1.5-ONESHOT: Print→Program one-shot spine (U-P1.5-OS-03..07)
  "wedm_auto_bridge",          // AutoPrintToProgramBridgeEngine — process-type routing
  "wedm_post_dialect",         // WEDMPostDialectRouterEngine — multi-controller post
  "wedm_collision_check",      // WEDMWirePathCollisionEngine — swept-volume collision
  "wedm_verify_program",       // WEDMProgramVerificationEngine — end-of-pipeline gate
] as const;

// MS-P0.5-COORD U-P0.5-COORD-01: Register dispatcher actions with adoption engine (once, at module load)
import("../../engines/WEDMAwarenessAdoptionEngine.js").then(({ wedmAwarenessAdoptionEngine }) => {
  wedmAwarenessAdoptionEngine.registerDispatcher({ dispatcher: "edm", actions: ACTIONS });
}).catch(() => { /* adoption engine optional — fails open */ });

/** Registers edm dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerEdmDispatcher(server: any): void {
  server.tool(
    "prism_edm",
    `Non-traditional machining: EDM (electrode, wire, surface, micro, sinker), laser cutting, waterjet, and full WEDM-P2P pipeline (drawing→feasibility→material→toolpath→multi-pass→cutting→wire/slug/corner→monitor→post-process→G-code→cost→quality).
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_edm] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Shape bridge: normalize frontend shapes before validation
        params = bridgeWedmInput(action, params);

        // Zod schema validation — all actions
        const validation = validateActionParams(action, params, ALL_EDM_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_edm"
          );
        }

        // PRE-CALCULATION SAFETY HOOKS — recast layer, dielectric safety
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "edmDispatcher", action, params }
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

        // MS-P0.5-COORD U-P0.5-COORD-08: Multi-agent dispatch coordination
        // (awareness + bridge + ledger invoked via one facade; fails open)
        let _awareness: any = null;
        let _awarenessKeywords: string[] = [];
        let _entryAt = Date.now();
        try {
          const { wedmMultiAgentDispatchEngine } = await import("../../engines/WEDMMultiAgentDispatchEngine.js");
          const _coord = await wedmMultiAgentDispatchEngine.coordinateDispatch({
            dispatcher: "edm", action, params: params as any,
          });
          _awareness = _coord.summary;
          _awarenessKeywords = _coord.keywords;
          _entryAt = _coord.entryAt;
        } catch { /* fails open — never blocks execution */ }

        switch (action) {
          // =================================================================
          // LEGACY ACTIONS
          // =================================================================
          case "electrode_design": {
            const engine = await getEngine("electrode");
            result = engine.design?.(params) ?? engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "ElectrodeDesign method not found" };
            break;
          }
          case "wire_settings": {
            const engine = await getEngine("wire");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "WireEDMSettings method not found" };
            break;
          }
          case "surface_integrity": {
            const engine = await getEngine("surface");
            result = engine.assess?.(params) ?? engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "EDMSurfaceIntegrity method not found" };
            break;
          }
          case "micro_edm": {
            const engine = await getEngine("micro");
            result = engine.calculate?.(params) ?? engine.compute?.(params) ?? { error: "MicroEDM method not found" };
            break;
          }

          // --- Laser Cutting (reverse-engineered from monolith) ---
          case "laser_calculate": {
            const engine = await getEngine("laser");
            result = engine.calculateParams(params);
            break;
          }
          case "laser_materials": {
            const engine = await getEngine("laser");
            result = engine.listMaterials();
            break;
          }
          case "laser_machines": {
            const engine = await getEngine("laser");
            result = engine.listMachines();
            break;
          }
          case "laser_gas_recommend": {
            const engine = await getEngine("laser");
            result = engine.recommendGas(
              params.material ?? "mild_steel",
              params.priority ?? "quality"
            );
            break;
          }

          // --- Waterjet Cutting (reverse-engineered from monolith) ---
          case "waterjet_calculate": {
            const engine = await getEngine("waterjet");
            result = engine.calculateParams(params);
            break;
          }
          case "waterjet_materials": {
            const engine = await getEngine("waterjet");
            result = engine.listMaterials();
            break;
          }
          case "waterjet_abrasives": {
            const engine = await getEngine("waterjet");
            result = engine.listAbrasives();
            break;
          }
          case "waterjet_quality_levels": {
            const engine = await getEngine("waterjet");
            result = engine.listQualityLevels();
            break;
          }

          // --- Sinker EDM Calculator (reverse-engineered from monolith) ---
          case "sinker_calculate": {
            const engine = await getEngine("sinker");
            result = engine.calculate(params);
            break;
          }
          case "sinker_materials": {
            const engine = await getEngine("sinker");
            result = {
              electrode: engine.listElectrodeMaterials(),
              workpiece: engine.listWorkpieceMaterials(),
            };
            break;
          }
          case "sinker_vdi_scale": {
            const engine = await getEngine("sinker");
            result = engine.listVDIScale();
            break;
          }
          case "sinker_recommend": {
            const engine = await getEngine("sinker");
            result = engine.recommendSettings(params);
            break;
          }

          // =================================================================
          // ELECTRODE PIPELINE (ELEC-PIPE-MS0) — ColdHeadingToolConfigurator
          // AI-integrated tooling configurator replacing Excel macro
          // =================================================================
          case "electrode_configure_tooling": {
            const engine = await getEngine("coldHeadingConfigurator");
            result = await engine.configure(params);
            break;
          }
          case "electrode_job_get": {
            const engine = await getEngine("coldHeadingConfigurator");
            const job = engine.getJob(params.job_id);
            if (!job) {
              result = { success: false, error: `Job not found: ${params.job_id}` };
            } else {
              result = { success: true, job };
            }
            break;
          }
          case "electrode_job_list": {
            const engine = await getEngine("coldHeadingConfigurator");
            result = {
              success: true,
              jobs: engine.listJobs(params.limit ?? 20),
            };
            break;
          }
          case "electrode_configurator_stats": {
            const engine = await getEngine("coldHeadingConfigurator");
            result = {
              success: true,
              stats: engine.stats(),
            };
            break;
          }

          // =================================================================
          // TRILOBE ELECTRODE GEOMETRY (ELEC-PIPE Session 8)
          // Replaces Excel VBA macro for trilobe/taptite electrode generation
          // =================================================================
          case "trilobe_generate": {
            const engine = await getEngine("trilobeElectrodeGeometry");
            result = await engine.generate(params);
            break;
          }
          case "trilobe_preview": {
            const engine = await getEngine("trilobeElectrodeGeometry");
            result = {
              success: true,
              profile: engine.getProfile(
                params.c_dia_in,
                params.e_dia_in,
                params.rotation_deg ?? 0
              ),
            };
            break;
          }
          case "trilobe_stats": {
            const engine = await getEngine("trilobeElectrodeGeometry");
            result = {
              success: true,
              stats: engine.stats(),
            };
            break;
          }

          // =================================================================
          // ECCENTRIC TURNING (ELEC-PIPE Session 8)
          // C-axis polar interpolation for turned trilobe electrodes
          // =================================================================
          case "eccentric_turning_generate": {
            const engine = await getEngine("eccentricTurning");
            const errors = engine.validateInput(params);
            if (errors.length > 0) {
              result = { success: false, errors };
            } else {
              result = await engine.generate(params);
            }
            break;
          }
          case "eccentric_turning_controllers": {
            const engine = await getEngine("eccentricTurning");
            result = {
              success: true,
              controllers: engine.getSupportedControllers(),
            };
            break;
          }
          case "eccentric_turning_validate": {
            const engine = await getEngine("eccentricTurning");
            const errors = engine.validateInput(params);
            result = {
              success: errors.length === 0,
              valid: errors.length === 0,
              errors,
            };
            break;
          }

          // =================================================================
          // ELECTRODE AI REASONING (ELEC-PIPE-AI-HARDEN)
          // Deep reasoning chains for electrode design decisions
          // =================================================================
          case "electrode_ai_material": {
            const engine = await getEngine("electrodeAIReasoning");
            result = await engine.reasonElectrodeMaterial(
              params.workpiece_material,
              params.target_finish_Ra_um,
              params.tolerance_mm ?? 0.01,
              params.num_cavities ?? 1
            );
            break;
          }
          case "electrode_ai_spark_gap": {
            const engine = await getEngine("electrodeAIReasoning");
            result = await engine.reasonSparkGap(
              params.electrode_material,
              params.workpiece_material,
              params.target_finish_Ra_um
            );
            break;
          }
          case "electrode_ai_trilobe": {
            const engine = await getEngine("electrodeAIReasoning");
            result = await engine.reasonTrilobeGeometry(
              params.c_dia_in,
              params.e_dia_in,
              params.lead_angle_deg ?? 0,
              params.total_length_in,
              params.target_finish_Ra_um
            );
            break;
          }
          case "electrode_ai_turning": {
            const engine = await getEngine("electrodeAIReasoning");
            result = await engine.reasonEccentricCompensation(
              params.c_dia_in,
              params.e_dia_in,
              params.max_spindle_rpm ?? 1500,
              params.workpiece_material
            );
            break;
          }
          case "electrode_ai_cam": {
            const engine = await getEngine("electrodeAIReasoning");
            result = await engine.reasonMultiCAM(
              params.geometry_complexity,
              params.axes_required,
              params.helical ?? false,
              params.user_expertise ?? "intermediate"
            );
            break;
          }
          case "electrode_ai_full_design": {
            const engine = await getEngine("electrodeAIReasoning");
            result = await engine.fullElectrodeDesign(params);
            break;
          }
          case "electrode_ai_reasoning_chain": {
            const engine = await getEngine("electrodeAIReasoning");
            const chain = engine.getReasoningChain(params.chain_id);
            if (!chain) {
              result = { success: false, error: `Reasoning chain not found: ${params.chain_id}` };
            } else {
              result = { success: true, chain };
            }
            break;
          }
          case "electrode_ai_stats": {
            const engine = await getEngine("electrodeAIReasoning");
            result = {
              success: true,
              stats: engine.stats(),
            };
            break;
          }

          // =================================================================
          // ELECTRODE DEEP LEARNING (ELEC-PIPE-DEEP-AI)
          // Neural networks, Monte Carlo, Bayesian optimization, self-learning
          // =================================================================
          case "electrode_deep_wear": {
            const engine = await getEngine("electrodeDeepLearning");
            result = engine.predictWear(
              params.discharge_energy_mJ,
              params.num_cavities ?? 1,
              params.workpiece_hardness_HRC,
              params.electrode_grain_size_um,
              params.surface_area_mm2,
              params.depth_mm
            );
            break;
          }
          case "electrode_deep_finish": {
            const engine = await getEngine("electrodeDeepLearning");
            result = engine.predictSurfaceFinish(
              params.discharge_energy_mJ,
              params.num_skim_passes ?? 2,
              params.electrode_grain_size_um,
              params.duty_cycle,
              params.spark_gap_mm
            );
            break;
          }
          case "electrode_deep_force": {
            const engine = await getEngine("electrodeDeepLearning");
            result = engine.predictForceVariation(
              params.c_dia_in,
              params.e_dia_in,
              params.rpm ?? 1500,
              params.feed_ipr ?? 0.003,
              params.workpiece_material
            );
            break;
          }
          case "electrode_deep_optimize": {
            const engine = await getEngine("electrodeDeepLearning");
            result = engine.optimizeParameters(
              params.target_finish_Ra_um,
              params.max_wear_ratio ?? 1.0,
              {
                min_grain_size_um: params.min_grain_size_um ?? 1,
                max_grain_size_um: params.max_grain_size_um ?? 15,
                min_passes: params.min_passes ?? 1,
                max_passes: params.max_passes ?? 5,
              }
            );
            break;
          }
          case "electrode_deep_comprehensive": {
            const engine = await getEngine("electrodeDeepLearning");
            result = await engine.comprehensiveAnalysis(params);
            break;
          }
          case "electrode_deep_feedback": {
            const engine = await getEngine("electrodeDeepLearning");
            engine.recordFeedback(params.job_id, params.predicted, params.actual);
            result = {
              success: true,
              message: `Feedback recorded for job ${params.job_id}`,
              stats: engine.getSelfLearningStats(),
            };
            break;
          }
          case "electrode_deep_stats": {
            const engine = await getEngine("electrodeDeepLearning");
            result = {
              success: true,
              stats: engine.stats(),
              self_learning: engine.getSelfLearningStats(),
            };
            break;
          }

          // =================================================================
          // ELEC-PIPE-ULTRA-AI: ElectrodeAdvancedAIEngine
          // =================================================================
          case "electrode_ultra_feature_importance": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              feature_importance: engine.computeFeatureImportance({
                discharge_energy_mJ: params.discharge_energy_mJ,
                num_cavities: params.num_cavities ?? 1,
                workpiece_hardness_HRC: params.workpiece_hardness_HRC,
                electrode_grain_size_um: params.electrode_grain_size_um,
                surface_area_mm2: params.surface_area_mm2 ?? 500,
                depth_mm: params.depth_mm ?? 25,
              }),
            };
            break;
          }
          case "electrode_ultra_counterfactual": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              counterfactuals: engine.generateCounterfactuals(
                {
                  discharge_energy_mJ: params.discharge_energy_mJ,
                  electrode_grain_size_um: params.electrode_grain_size_um,
                  duty_cycle: params.duty_cycle,
                  num_skim_passes: params.num_skim_passes ?? 2,
                  spark_gap_mm: params.spark_gap_mm,
                },
                params.target_Ra_um
              ),
            };
            break;
          }
          case "electrode_ultra_consensus": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              consensus: engine.runExpertConsensus({
                discharge_energy_mJ: params.discharge_energy_mJ,
                duty_cycle: params.duty_cycle,
                electrode_grain_size_um: params.electrode_grain_size_um,
                workpiece_hardness_HRC: params.workpiece_hardness_HRC,
                num_cavities: params.num_cavities ?? 1,
                target_Ra_um: params.target_Ra_um,
                c_dia_in: params.c_dia_in,
                e_dia_in: params.e_dia_in,
              }),
            };
            break;
          }
          case "electrode_ultra_anomaly": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              anomaly: engine.detectAnomaly({
                discharge_energy_mJ: params.discharge_energy_mJ,
                duty_cycle: params.duty_cycle,
                electrode_grain_size_um: params.electrode_grain_size_um,
                workpiece_hardness_HRC: params.workpiece_hardness_HRC,
                spark_gap_mm: params.spark_gap_mm,
                num_passes: params.num_passes ?? 2,
                c_dia_in: params.c_dia_in,
                e_dia_in: params.e_dia_in,
              }),
            };
            break;
          }
          case "electrode_ultra_active_learning": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              priority_queue: engine.recommendFeedbackPriority(params.jobs),
            };
            break;
          }
          case "electrode_ultra_causal_effect": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              causal_effect: engine.estimateCausalEffect(
                params.cause,
                params.effect,
                params.intervention_value
              ),
            };
            break;
          }
          case "electrode_ultra_causal_dag": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              dag: engine.getCausalDAG(),
              node_count: engine.getCausalDAG().length,
            };
            break;
          }
          case "electrode_ultra_ensemble": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              ensemble: engine.ensemblePredict(params.prediction_type, {
                discharge_energy_mJ: params.discharge_energy_mJ,
                num_cavities: params.num_cavities,
                workpiece_hardness_HRC: params.workpiece_hardness_HRC,
                electrode_grain_size_um: params.electrode_grain_size_um,
                surface_area_mm2: params.surface_area_mm2,
                depth_mm: params.depth_mm,
                num_skim_passes: params.num_skim_passes,
                duty_cycle: params.duty_cycle,
                spark_gap_mm: params.spark_gap_mm,
                c_dia_in: params.c_dia_in,
                e_dia_in: params.e_dia_in,
                rpm: params.rpm,
                feed_ipr: params.feed_ipr,
                workpiece_material: params.workpiece_material,
              }),
            };
            break;
          }
          case "electrode_ultra_comprehensive": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              analysis: await engine.comprehensiveAdvancedAnalysis({
                discharge_energy_mJ: params.discharge_energy_mJ,
                duty_cycle: params.duty_cycle,
                electrode_grain_size_um: params.electrode_grain_size_um,
                workpiece_hardness_HRC: params.workpiece_hardness_HRC,
                workpiece_material: params.workpiece_material,
                num_cavities: params.num_cavities ?? 1,
                num_skim_passes: params.num_skim_passes ?? 2,
                spark_gap_mm: params.spark_gap_mm,
                target_finish_Ra_um: params.target_finish_Ra_um,
                surface_area_mm2: params.surface_area_mm2,
                depth_mm: params.depth_mm,
                c_dia_in: params.c_dia_in,
                e_dia_in: params.e_dia_in,
                rpm: params.rpm,
                feed_ipr: params.feed_ipr,
              }),
            };
            break;
          }
          case "electrode_ultra_stats": {
            const engine = await getEngine("electrodeAdvancedAI");
            result = {
              success: true,
              stats: engine.stats(),
            };
            break;
          }

          // =================================================================
          // ELEC-PIPE-OMEGA-AI: ElectrodeUltimateAIEngine
          // =================================================================
          case "electrode_omega_transformer": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              attention: engine.runTransformerAttention(params.params),
            };
            break;
          }
          case "electrode_omega_gnn": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              embeddings: engine.runGNN(),
            };
            break;
          }
          case "electrode_omega_lstm_wear": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              wear_progression: engine.predictWearProgression({
                discharge_energy_mJ: params.discharge_energy_mJ,
                num_passes: params.num_passes ?? 3,
              }),
            };
            break;
          }
          case "electrode_omega_vae_encode": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              latent: engine.encodeToLatent(params.params),
            };
            break;
          }
          case "electrode_omega_pinn": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              prediction: engine.predictWithPhysicsConstraints({
                discharge_energy_mJ: params.discharge_energy_mJ,
                duty_cycle: params.duty_cycle,
                electrode_grain_um: params.electrode_grain_um,
                workpiece_hardness: params.workpiece_hardness,
              }),
            };
            break;
          }
          case "electrode_omega_tree_of_thoughts": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              exploration: engine.exploreWithToT(params.problem),
            };
            break;
          }
          case "electrode_omega_self_consistency": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              consistency: engine.runSelfConsistency(params.problem, params.num_chains),
            };
            break;
          }
          case "electrode_omega_verify_reasoning": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              verification: engine.verifyReasoning(params.reasoning),
            };
            break;
          }
          case "electrode_omega_reflexion": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              reflexion: engine.reflectOnOutcome(params.attempt, params.outcome, params.success),
            };
            break;
          }
          case "electrode_omega_react": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              trace: engine.executeReActLoop(params.goal),
            };
            break;
          }
          case "electrode_omega_store_episode": {
            const engine = await getEngine("electrodeUltimateAI");
            engine.storeEpisode({
              job_id: params.job_id,
              embedding: params.embedding,
              params: params.params,
              outcome: params.outcome,
              success: params.success,
              lessons: params.lessons,
            });
            result = {
              success: true,
              message: `Episode ${params.job_id} stored`,
            };
            break;
          }
          case "electrode_omega_retrieve_episodes": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              episodes: engine.retrieveSimilarEpisodes(params.query_params, params.k),
            };
            break;
          }
          case "electrode_omega_query_kg": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              triples: engine.queryKnowledgeGraph(params.subject, params.predicate, params.object),
            };
            break;
          }
          case "electrode_omega_infer_kg": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              inferred_facts: engine.inferFromKnowledgeGraph(params.entity),
            };
            break;
          }
          case "electrode_omega_deep_ensemble": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              ensemble: engine.runDeepEnsemble(params.params),
            };
            break;
          }
          case "electrode_omega_mc_dropout": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              mc_dropout: engine.runMCDropout(params.params, params.num_samples),
            };
            break;
          }
          case "electrode_omega_conformal": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              conformal: engine.predictWithConformal(params.prediction, params.coverage),
            };
            break;
          }
          case "electrode_omega_hierarchical_plan": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              plan: engine.generateHierarchicalPlan({
                workpiece_material: params.workpiece_material,
                target_finish_Ra: params.target_finish_Ra,
                num_cavities: params.num_cavities ?? 1,
              }),
            };
            break;
          }
          case "electrode_omega_curriculum_status": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              curriculum: engine.getCurriculumState(),
            };
            break;
          }
          case "electrode_omega_comprehensive": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              analysis: await engine.comprehensiveUltimateAnalysis({
                discharge_energy_mJ: params.discharge_energy_mJ,
                duty_cycle: params.duty_cycle,
                electrode_grain_size_um: params.electrode_grain_size_um,
                workpiece_hardness_HRC: params.workpiece_hardness_HRC,
                workpiece_material: params.workpiece_material,
                num_cavities: params.num_cavities ?? 1,
                num_passes: params.num_passes ?? 3,
                target_finish_Ra_um: params.target_finish_Ra_um,
              }),
            };
            break;
          }
          case "electrode_omega_stats": {
            const engine = await getEngine("electrodeUltimateAI");
            result = {
              success: true,
              stats: engine.stats(),
            };
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 0. DXFGeometryParserEngine
          // =================================================================
          case "wedm_parse_geometry": {
            const engine = await getEngine("geometryParser");
            const format = params.format ?? "dxf";
            const parseResult = engine.parseGeometryFile(params.content ?? "", format);
            result = {
              contours: parseResult.contours,
              features: engine.toPartFeatures(parseResult.contours),
              issues: parseResult.issues,
              entity_count: parseResult.entity_count,
              source_format: parseResult.source_format,
            };
            break;
          }
          case "wedm_validate_geometry": {
            const engine = await getEngine("geometryParser");
            const parseResult = engine.parseGeometryFile(params.content ?? "", params.format ?? "dxf");
            const validationIssues = engine.validateForWireEDM(
              parseResult.contours,
              params.wire_diameter_mm,
              params.spark_gap_mm,
            );
            result = {
              contours: parseResult.contours.length,
              parse_issues: parseResult.issues,
              validation_issues: validationIssues,
              can_proceed: validationIssues.filter((i: any) => i.severity === "error").length === 0,
            };
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 1. EDMDrawingInterpretationEngine
          // =================================================================
          case "wedm_interpret_drawing": {
            const engine = await getEngine("drawingInterp");
            result = engine.interpret(params);
            break;
          }
          case "wedm_classify_features": {
            const engine = await getEngine("drawingInterp");
            result = engine.classifyFeaturesAction(params);
            break;
          }
          case "wedm_calculate_passes": {
            const engine = await getEngine("drawingInterp");
            result = engine.calculatePassesAction(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 2. EDMFeasibilityEngine
          // =================================================================
          case "wedm_assess_feasibility": {
            const engine = await getEngine("feasibility");
            result = engine.assess(params);
            break;
          }
          case "wedm_check_conductivity": {
            const engine = await getEngine("feasibility");
            result = engine.check_conductivity(params);
            break;
          }
          case "wedm_estimate_time": {
            const engine = await getEngine("feasibility");
            result = engine.estimate_time(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 3. EDMMaterialMachineWireEngine
          // =================================================================
          case "wedm_assess_material": {
            const engine = await getEngine("materialMachineWire");
            result = engine.assessMaterial(params);
            break;
          }
          case "wedm_select_machine": {
            const engine = await getEngine("materialMachineWire");
            result = engine.selectMachine(params);
            break;
          }
          case "wedm_select_wire": {
            const engine = await getEngine("materialMachineWire");
            result = engine.selectWire(params);
            break;
          }
          case "wedm_full_selection": {
            const engine = await getEngine("materialMachineWire");
            const fullResult = engine.fullSelection(params);
            // Bridge: flatten nested selection for frontend quick-access
            result = {
              ...fullResult,
              recommended_machine: fullResult.machine_selection?.recommended_machine,
              recommended_wire_type: fullResult.wire_selection?.recommended_type,
              recommended_wire_diameter_mm: fullResult.wire_diameter_optimization?.optimal_diameter_mm,
              recommended_tension_N: fullResult.wire_tension?.recommended_tension_N,
              estimated_wire_cost_usd: fullResult.wire_cost?.total_cost,
              machinability_rating: fullResult.material_assessment?.machinability_rating,
            };
            break;
          }

          case "wedm_machine_uv_travel": {
            const engine = await getEngine("materialMachineWire");
            result = engine.getUvTravel(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 4. EDMStartHoleSetupEngine
          // =================================================================
          case "wedm_plan_start_holes": {
            const engine = await getEngine("startHoleSetup");
            result = engine.action_plan_start_holes(params);
            break;
          }
          case "wedm_plan_setup": {
            const engine = await getEngine("startHoleSetup");
            result = engine.action_plan_setup(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 5. EDMToolpathStrategyEngine
          // =================================================================
          case "wedm_generate_toolpath": {
            const engine = await getEngine("toolpathStrategy");
            result = engine.generate_toolpath(params);
            break;
          }
          case "wedm_plan_tabs": {
            const engine = await getEngine("toolpathStrategy");
            result = engine.plan_tabs(params);
            break;
          }
          case "wedm_optimize_sequence": {
            const engine = await getEngine("toolpathStrategy");
            result = engine.optimize_sequence(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 6. EDMMultiPassStrategyEngine
          // =================================================================
          case "wedm_plan_passes": {
            const engine = await getEngine("multiPass");
            result = engine.plan_passes(params);
            break;
          }
          case "wedm_full_multipass": {
            const engine = await getEngine("multiPass");
            result = engine.full_plan(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 7. EDMCuttingParamFlushEngine
          // =================================================================
          case "wedm_optimize_params": {
            const engine = await getEngine("cuttingParamFlush");
            result = engine.optimizeParams(params);
            break;
          }
          case "wedm_plan_flushing": {
            const engine = await getEngine("cuttingParamFlush");
            result = engine.planFlushing(params);
            break;
          }
          case "wedm_predict_wire_break": {
            const engine = await getEngine("cuttingParamFlush");
            result = engine.predictWireBreakRisk(params);
            break;
          }

          case "wedm_plan_break_recovery": {
            const engine = await getEngine("cuttingParamFlush");
            result = engine.calculateBreakRecovery(
              params.break_position_mm ?? params.breakPosition_mm ?? 50,
              params.pass_number ?? params.passNumber ?? 1,
              params.material ?? "D2",
              params.thickness_mm ?? 25,
              params.wire_type ?? "brass_0.25"
            );
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 8. EDMWireSlugCornerTaperEngine
          // =================================================================
          case "wedm_plan_wire_management": {
            const engine = await getEngine("wireSlugCornerTaper");
            result = engine.planWireManagement(params);
            break;
          }
          case "wedm_calculate_corners": {
            const engine = await getEngine("wireSlugCornerTaper");
            result = engine.calculateCornerCompensation(params);
            break;
          }
          case "wedm_solve_taper": {
            const engine = await getEngine("wireSlugCornerTaper");
            result = engine.solveTaper(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 9. EDMMonitorSurfaceIntegrityEngine
          // =================================================================
          case "wedm_monitor_process": {
            const engine = await getEngine("monitorSurface");
            result = engine.monitorProcess(params);
            break;
          }
          case "wedm_assess_surface_integrity": {
            const engine = await getEngine("monitorSurface");
            result = engine.assessSurfaceIntegrity(params);
            break;
          }
          case "wedm_check_spec": {
            const engine = await getEngine("monitorSurface");
            result = engine.checkSpecCompliance(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 10. EDMPostProcessGCodeEngine
          // =================================================================
          case "wedm_plan_post_process": {
            const engine = await getEngine("postProcessGCode");
            result = engine.plan_post_process(params);
            break;
          }
          case "wedm_generate_gcode": {
            const engine = await getEngine("postProcessGCode");
            // Bridge: merge start_holes into profiles, add default approach/departure
            const startHoleArr = Array.isArray(params.start_holes) ? params.start_holes : [];
            const gcodeProfiles = (params.profiles ?? []).map((p: any, i: number) => {
              const hole = startHoleArr[i];
              return {
                ...p,
                start_hole: p.start_hole ?? (hole
                  ? { x: hole.x_mm, y: hole.y_mm }
                  : { x: 0, y: 0 }),
                approach: p.approach ?? { type: "perpendicular", length_mm: 5 },
                departure: p.departure ?? { type: "perpendicular", length_mm: 3 },
                contour_points: p.contour_points ?? [],
              };
            });
            result = engine.generate_gcode({ ...params, profiles: gcodeProfiles });
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 11. EDMCostDocumentationEngine
          // =================================================================
          case "wedm_estimate_cost": {
            const engine = await getEngine("costDocumentation");
            // Bridge: build nested machine_time/wire/consumables from flat params
            const costInput = (params.machine_time && params.wire && params.consumables)
              ? params
              : {
                  part_id: params.part_id ?? params.job_id ?? "wedm-job",
                  material: params.material,
                  quantity: params.quantity,
                  overhead_pct: params.overhead_pct,
                  margin_pct: params.margin_pct,
                  compare_processes: params.compare_processes,
                  machine_time: {
                    machine_rate_per_hr: params.machine_rate_per_hr ?? 85,
                    setup_hrs: params.setup_hrs ?? 0.5,
                    cutting_hrs: params.cutting_hrs ?? 1,
                    tab_cutting_hrs: params.tab_cutting_hrs,
                    threading_time_per_event_hr: params.threading_time_per_event_hr,
                    threading_events: params.threading_events ?? (params.num_profiles ?? 1),
                    idle_hrs: params.idle_hrs,
                  },
                  wire: {
                    wire_type: params.wire_type ?? "brass",
                    wire_diameter_mm: params.wire_diameter_mm ?? 0.25,
                    cutting_hrs: params.cutting_hrs ?? 1,
                    wire_speed_mm_per_min: params.wire_speed_mm_per_min ?? 200,
                    spool_size_kg: params.spool_size_kg ?? 5,
                  },
                  consumables: {
                    cutting_hrs: params.cutting_hrs ?? 1,
                    nozzle_sets: params.nozzle_sets ?? 1,
                    start_holes: params.start_holes_count ?? params.num_profiles ?? 1,
                    guides_replaced: params.guides_replaced ?? 0,
                    filters_replaced: params.filters_replaced ?? 1,
                    resin_hrs_since_last_change: params.resin_hrs_since_last_change,
                    resin_change_interval_hrs: params.resin_change_interval_hrs ?? 100,
                  },
                };
            result = engine.estimateCost(costInput);
            break;
          }
          case "wedm_generate_setup_sheet": {
            const engine = await getEngine("costDocumentation");
            // Bridge: build structured engine input from flat frontend params
            const sheetInput = {
              program: params.program ?? params.part_number ?? "WEDM-001",
              revision: params.revision,
              machine: params.machine ?? "Unspecified",
              material: params.material,
              material_hardness: params.material_hardness,
              dimensions: params.dimensions ?? `${params.thickness_mm ?? 0}mm thick`,
              weight_kg: params.weight_kg ?? 0,
              wire_type: params.wire_type ?? "brass",
              wire_diameter_mm: params.wire_diameter_mm ?? 0.25,
              wire_spool_kg: params.wire_spool_kg,
              dielectric_type: params.dielectric_type,
              fixture_type: params.fixture_type,
              datum_method: params.datum_method,
              start_holes: params.start_holes,
              tech_tables: params.tech_tables,
              setup_min: params.setup_min,
              cutting_min: params.cutting_min,
              operator: params.operator,
              job_number: params.job_number ?? params.job_id,
              drawing_ref: params.drawing_ref ?? params.part_number,
              special_instructions: params.special_instructions,
              tolerance_mm: params.tolerance_mm,
              target_ra_um: params.target_ra_um,
              num_profiles: params.num_profiles,
              num_start_holes: params.num_start_holes,
              total_passes: params.total_passes,
            };
            result = engine.generateSetupSheet(sheetInput);
            break;
          }
          case "wedm_full_documentation": {
            const engine = await getEngine("costDocumentation");
            result = engine.fullPackage(params);
            break;
          }

          // =================================================================
          // WEDM-P2P PIPELINE: 12. EDMQualityOrchestratorEngine
          // =================================================================
          case "wedm_verify_quality": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.verify_quality(params, params.pass_params);
            break;
          }
          case "wedm_run_pipeline": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.run_pipeline(params);
            break;
          }
          case "wedm_record_job": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.record_job(params);
            break;
          }
          case "wedm_get_recommendation": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.get_recommendation(params);
            break;
          }
          case "wedm_evaluate_spec_compliance": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.evaluate_spec_compliance(params, params.pass_params);
            break;
          }
          case "wedm_get_spec_limits": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.get_spec_limits(params);
            break;
          }
          case "wedm_override_quality_gate": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.override_quality_gate(params);
            break;
          }
          case "wedm_get_gate_overrides": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.get_gate_overrides(params);
            break;
          }
          case "wedm_evaluate_quality_gate": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.evaluate_quality_gate(params);
            break;
          }
          case "wedm_get_audit_log": {
            const engine = await getEngine("qualityOrchestrator");
            result = engine.get_audit_log(params);
            break;
          }

          // =================================================================
          // WEDM PIPELINE: 13. EDMBiMaterialCompensationEngine
          // =================================================================
          case "wedm_bimaterial_optimize": {
            const engine = await getEngine("biMaterial");
            result = engine.optimize(params);
            break;
          }
          case "wedm_bimaterial_transition_risk": {
            const engine = await getEngine("biMaterial");
            result = engine.analyzeTransitionRisk(params);
            break;
          }
          case "wedm_bimaterial_infer_zones": {
            const engine = await getEngine("biMaterial");
            result = engine.inferZones(params);
            break;
          }
          case "wedm_bimaterial_uv_compensation": {
            const engine = await getEngine("biMaterial");
            result = engine.computeUVCompensation(params);
            break;
          }

          // ── Feedback Loop: Calibration, Program Parsing, Feedback ──

          case "wedm_submit_feedback": {
            const engine = await getEngine("feedbackCalibration");
            result = engine.submit_feedback({
              material: params.material,
              thickness_mm: params.thickness_mm,
              pass_number: params.pass_number,
              measured_ra_um: params.measured_ra_um,
              measured_mrr_mm2_min: params.measured_mrr_mm2_min,
              wire_break: params.wire_break ?? false,
              notes: params.notes,
            });
            break;
          }

          case "wedm_calibration_report": {
            const engine = await getEngine("calibrationReport");
            result = engine.generate({
              shop_program: {
                filename: params.filename ?? "unknown.NC",
                material_iso_group: params.material_iso_group ?? "P",
                thickness_mm: params.thickness_mm ?? 25,
                wire_diameter_mm: params.wire_diameter_mm ?? 0.25,
                num_passes: params.num_passes ?? (params.offsets_mm?.length ?? 4),
                offsets_mm: params.offsets_mm ?? [],
                feeds_mmmin: params.feeds_mmmin ?? [],
                e_codes: params.e_codes ?? [],
                has_taper: params.has_taper ?? false,
                has_adaptive_control: params.has_adaptive_control ?? true,
                is_bimaterial: params.is_bimaterial,
                hardness_hrc: params.hardness_hrc,
              },
            });
            break;
          }

          case "wedm_parse_program": {
            const engine = await getEngine("programParser");
            result = engine.parse(params.program_text ?? params.nc_text ?? "");
            break;
          }

          case "wedm_photo_to_quote": {
            // Photo → OCR → feasibility + cost estimate (no full program generation)
            const { blueprintVisionOCREngine } = await import("../../engines/BlueprintVisionOCREngine.js");
            const ocrResult = await blueprintVisionOCREngine.quickExtract({
              image: params.image ?? { type: "base64", data: params.image_base64 },
              expected_units: params.expected_units,
            });
            const material = params.material ?? ocrResult.material ?? "steel";
            const thickness = params.thickness_mm ?? ocrResult.thickness_mm ?? 25;
            const ocrAny = ocrResult as Record<string, unknown>;
            const perimeter = (ocrAny.total_perimeter_mm as number) ?? 100;

            // Quick multi-pass estimate for costing
            const mpEngine = await getEngine("multiPass");
            const plan = mpEngine.full_plan({
              material,
              thickness_mm: thickness,
              profile_length_mm: perimeter,
              tolerance_mm: ocrResult.tightest_tolerance_mm ?? 0.01,
              target_ra_um: 0.8,
            });

            // Quick cost estimate
            const costEngine = await getEngine("costDocumentation");
            const cost = costEngine.estimateCost({
              machine_time: {
                setup_hrs: 0.5,
                cutting_hrs: plan.total_time_min / 60,
                machine_rate_per_hr: params.machine_rate_per_hr ?? 85,
              },
              wire: {
                type: "brass",
                length_m: plan.total_wire_m,
              },
            });

            result = {
              material_detected: material,
              thickness_mm: thickness,
              estimated_perimeter_mm: perimeter,
              passes: plan.total_passes,
              estimated_cutting_time_min: plan.total_time_min,
              estimated_wire_m: plan.total_wire_m,
              cost_estimate: cost,
              confidence: (ocrAny.confidence as string) ?? "low",
              ocr_summary: ocrResult,
            };
            break;
          }

          // ── CWEDM-MS0: Calculator orchestration (6-engine serial chain) ──
          case "wedm_calculator_solve": {
            // 6-engine serial chain: settings → multipass → cutting → corners → surface → cost
            // Data dependencies require sequential execution (each engine's output feeds the next).
            const wireEngine = await getEngine("wire");
            const settingsResult = wireEngine.calculate?.({
              wire_type: params.wire_type ?? "brass",
              workpiece_material: params.material ?? params.workpiece_material ?? "D2",
              thickness_mm: params.thickness_mm ?? 50,
              hardness_hrc: params.workpiece_hardness_HRC ?? params.hardness_hrc ?? 50,
              target_finish_um: params.target_Ra_um ?? 0.8,
              target_accuracy_mm: params.tolerance_mm ?? 0.01,
              taper_deg: params.taper_deg ?? 0,
              submerged: params.is_submerged ?? true,
            }) ?? {};

            const multiPassEngine = await getEngine("multiPass");
            const multiPassResult = multiPassEngine.plan_passes?.({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 50,
              profile_length_mm: params.profile_length_mm ?? 100,
              tolerance_mm: params.tolerance_mm ?? 0.01,
              target_Ra_um: params.target_Ra_um ?? 0.8,
              wire_type: params.wire_type ?? "brass",
              wire_diameter_mm: params.wire_diameter_mm ?? 0.25,
              hardness_hrc: params.workpiece_hardness_HRC ?? 50,
            }) ?? {};

            const cuttingEngine = await getEngine("cuttingParamFlush");
            const cuttingResult = cuttingEngine.optimize_params?.({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 50,
              wire_type: params.wire_type ?? "brass",
              wire_diameter_mm: params.wire_diameter_mm ?? 0.25,
              pass_type: "rough",
              target_Ra_um: params.target_Ra_um ?? 0.8,
              machine_controller: params.machine_controller ?? "fanuc",
            }) ?? {};

            const cornerEngine = await getEngine("wireSlugCornerTaper");
            const cornerResult = cornerEngine.calculate_corners?.({
              profiles: params.profiles ?? [],
              wire_type: params.wire_type ?? "brass",
              wire_diameter_mm: params.wire_diameter_mm ?? 0.25,
              thickness_mm: params.thickness_mm ?? 50,
            }) ?? {};
            const taperResult = params.taper_deg && params.taper_deg > 0
              ? (cornerEngine.solve_taper?.({
                  taper_deg: params.taper_deg,
                  thickness_mm: params.thickness_mm ?? 50,
                  wire_diameter_mm: params.wire_diameter_mm ?? 0.25,
                  guide_distance_mm: params.guide_distance_mm ?? 60,
                }) ?? {})
              : undefined;

            const surfaceEngine = await getEngine("monitorSurface");
            const surfaceResult = surfaceEngine.assess_surface_integrity?.({
              edm_type: "wire",
              material: params.material ?? "D2",
              hardness_hrc: params.workpiece_hardness_HRC ?? 50,
              pulse_on_us: cuttingResult?.per_pass?.[0]?.t_on_us ?? settingsResult?.t_on_us ?? 1.2,
              pulse_energy_mJ: cuttingResult?.per_pass?.[0]?.energy_mJ ?? 0.5,
              skim_count: multiPassResult?.passes?.filter?.((p: any) => p.type !== "rough")?.length ?? 3,
              application: params.application ?? "general",
            }) ?? {};

            const totalTimeMin = multiPassResult?.total_time_min
              ?? (multiPassResult?.passes ?? []).reduce((s: number, p: any) => s + (p.time_min ?? 0), 0);
            const cuttingHrs = totalTimeMin / 60;
            const costEngine = await getEngine("costDocumentation");
            const costResult = costEngine.estimate_cost?.({
              machine_rate_per_hr: params.machine_rate_per_hr ?? 85,
              setup_hrs: params.setup_hrs ?? 0.5,
              cutting_hrs: cuttingHrs || 1,
              wire_type: params.wire_type ?? "brass",
              wire_length_m: multiPassResult?.total_wire_m ?? 100,
              quantity: params.quantity ?? 1,
              material: params.material ?? "D2",
              post_process_operations: surfaceResult?.remediation?.operations ?? [],
            }) ?? {};

            result = {
              first_cut_speed_mm_min: settingsResult?.first_cut_speed_mm_min ?? settingsResult?.first_cut_speed ?? 0,
              skim_speeds: settingsResult?.skim_speeds ?? [],
              wire_tension_N: settingsResult?.wire_tension_N ?? settingsResult?.wire_tension ?? 0,
              flushing_pressure_bar: settingsResult?.flushing_pressure_bar ?? settingsResult?.flushing_pressure ?? 0,
              power_pct: settingsResult?.power_pct ?? 0,
              passes: multiPassResult?.passes ?? [],
              total_time_min: totalTimeMin,
              total_wire_m: multiPassResult?.total_wire_m ?? 0,
              estimated_cost: costResult,
              wire_break_risk: cuttingResult?.wire_break_risk ?? { probability: 0, severity: "low", factors: [], mitigations: [] },
              corner_compensation: cornerResult?.corners ?? [],
              surface_integrity: surfaceResult,
              taper: taperResult,
              recommendations: [
                ...(settingsResult?.recommendations ?? []),
                ...(multiPassResult?.recommendations ?? []),
                ...(surfaceResult?.recommendations ?? []),
              ],
              safety_score: surfaceResult?.safety_critical ? 0.6 : 0.9,
            };
            break;
          }

          // Forge-Triple: WEDM-MS0 + WEDM-MS1
          case "wedm_studio_pipeline": {
            const { EDMProgramAssemblerEngine } = await import("../../engines/EDMProgramAssemblerEngine.js");
            const eng = new EDMProgramAssemblerEngine();
            result = eng.assembleWireEDM(params as any);
            break;
          }
          case "wedm_advanced_analysis": {
            const { EDMProgramAssemblerEngine } = await import("../../engines/EDMProgramAssemblerEngine.js");
            const eng = new EDMProgramAssemblerEngine();
            result = eng.computeUncertainty(params as any);
            break;
          }

          case "wedm_generate_complete_program":
          case "wedm_generate_optimized_program": {
            const { wedmCompleteOrchestrationEngine } = await import("../../engines/WEDMCompleteOrchestrationEngine.js");
            result = await wedmCompleteOrchestrationEngine.generateCompleteProgram(params as any);
            break;
          }

          // =================================================================
          // U-WGAP06: WEDMSchedulingEngine — Machine Reservation (Book-Ahead)
          // TEMP: Disabled — engine file removed
          // =================================================================
          // case "wedm_reserve_machine": { ... }
          // case "wedm_check_availability": { ... }
          // case "wedm_cancel_reservation": { ... }

          // =================================================================
          // U-WGAP09: Pre-flight safety checklist
          // =================================================================
          case "wedm_preflight_check": {
            const { wedmPreFlightCheckEngine } = await import("../../engines/WEDMPreFlightCheckEngine.js");
            result = wedmPreFlightCheckEngine.generateChecklist({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              wire_type: params.wire_type,
              wire_diameter_mm: params.wire_diameter_mm,
              taper_angle_deg: params.taper_angle_deg,
              submerged: params.submerged,
              flush_pressure_bar: params.flush_pressure_bar,
              hardness_hrc: params.hardness_hrc,
              controller: params.controller,
              num_profiles: params.num_profiles,
              estimated_time_min: params.estimated_time_min,
              is_unattended: params.is_unattended,
            });
            break;
          }

          // =================================================================
          // WEDM-CAL-MS4 U-CAL21: Production Readiness Score
          // =================================================================
          case "wedm_production_readiness": {
            const { wedmProductionReadinessEngine } = await import("../../engines/WEDMProductionReadinessEngine.js");
            if (params.persist) {
              const { path: outPath, report } = wedmProductionReadinessEngine.persist({
                prediction_accuracy: params.prediction_accuracy,
                bayesian_priors: params.bayesian_priors,
                test_results: params.test_results,
                calibration_reports: params.calibration_reports,
              });
              result = { path: outPath, ...report };
            } else {
              result = wedmProductionReadinessEngine.generate({
                prediction_accuracy: params.prediction_accuracy,
                bayesian_priors: params.bayesian_priors,
                test_results: params.test_results,
                calibration_reports: params.calibration_reports,
              });
            }
            break;
          }

          // =================================================================
          // WEDM-HARDEN-MS1: WireEDMDeepAIHardeningEngine (8 actions)
          // =================================================================
          case "wedm_ai_analyze": {
            const engine = await getEngine("wireEDMDeepAIHardening");
            result = engine.analyzeWEDMOperation({
              name: params.part_name ?? "Part",
              material: {
                name: params.material ?? "D2",
                iso_group: params.iso_group ?? "H",
                hardness_hrc: params.hardness_hrc,
              },
              geometry: {
                thickness_mm: params.thickness_mm ?? 25,
                taper_angle_deg: params.taper_angle_deg ?? 0,
                min_corner_radius_mm: params.min_corner_radius_mm,
                cut_length_mm: params.cut_length_mm,
                has_slug: params.has_slug,
              },
              tolerance_mm: params.tolerance_mm ?? 0.01,
              target_ra_um: params.target_ra_um ?? 0.8,
              jm_die_category: params.jm_die_category,
              customer: params.customer,
            }, params.target_finish);
            break;
          }
          case "wedm_ai_optimize": {
            const engine = await getEngine("wireEDMDeepAIHardening");
            result = engine.optimizeWEDMStrategy(
              {
                name: params.part_name ?? "Part",
                material: {
                  name: params.material ?? "D2",
                  iso_group: params.iso_group ?? "H",
                  hardness_hrc: params.hardness_hrc,
                },
                geometry: {
                  thickness_mm: params.thickness_mm ?? 25,
                  taper_angle_deg: params.taper_angle_deg ?? 0,
                  min_corner_radius_mm: params.min_corner_radius_mm,
                },
                tolerance_mm: params.tolerance_mm ?? 0.01,
                target_ra_um: params.target_ra_um ?? 0.8,
              },
              {
                num_passes: params.num_passes ?? 4,
                e_code_family: params.e_code_family,
                on_time_us: params.on_time_us,
                off_time_us: params.off_time_us,
              },
              {
                priority: params.priority ?? "balanced",
                target_ra_um: params.target_ra_um,
                max_cycle_time_min: params.max_cycle_time_min,
              }
            );
            break;
          }
          case "wedm_ai_validate_setup": {
            const engine = await getEngine("wireEDMDeepAIHardening");
            result = engine.validateWEDMSetup({
              machine_id: params.machine_id ?? "mitsubishi_fa20s",
              controller: params.controller ?? "mitsubishi_m800",
              wire: {
                type: params.wire_type ?? "plain_brass",
                diameter_mm: params.wire_diameter_mm ?? 0.25,
              },
              part: {
                name: params.part_name ?? "Part",
                material: {
                  name: params.material ?? "D2",
                  iso_group: params.iso_group ?? "H",
                },
                geometry: {
                  thickness_mm: params.thickness_mm ?? 25,
                  taper_angle_deg: params.taper_angle_deg ?? 0,
                  start_hole_diameter_mm: params.start_hole_diameter_mm,
                },
                tolerance_mm: params.tolerance_mm ?? 0.01,
                target_ra_um: params.target_ra_um ?? 0.8,
              },
              params: {
                num_passes: params.num_passes ?? 4,
              },
              water_resistivity_mohm_cm: params.water_resistivity_mohm_cm,
              workholding: params.workholding ?? "magnetic_chuck",
              uses_h_registers: params.uses_h_registers ?? true,
            });
            break;
          }
          case "wedm_ai_troubleshoot": {
            const engine = await getEngine("wireEDMDeepAIHardening");
            result = engine.troubleshootWEDM({
              machine_id: params.machine_id,
              material: params.material,
              symptoms: params.symptoms ?? [],
              wire_breaks_per_hour: params.wire_breaks_per_hour,
              measured_ra_um: params.measured_ra_um,
              dimensional_error_mm: params.dimensional_error_mm,
              water_resistivity_mohm_cm: params.water_resistivity_mohm_cm,
              break_location: params.break_location,
              burn_marks_visible: params.burn_marks_visible,
            });
            break;
          }
          case "wedm_ai_select_wire": {
            const engine = await getEngine("wireEDMDeepAIHardening");
            result = engine.selectWireType(
              {
                name: params.material ?? "D2",
                iso_group: params.iso_group ?? "H",
                hardness_hrc: params.hardness_hrc,
              },
              params.thickness_mm ?? 25,
              params.target_ra_um
            );
            break;
          }
          case "wedm_ai_cycle_time": {
            const engine = await getEngine("wireEDMDeepAIHardening");
            result = engine.calculateCycleTime(
              {
                name: params.part_name ?? "Part",
                material: {
                  name: params.material ?? "D2",
                  iso_group: params.iso_group ?? "H",
                },
                geometry: {
                  thickness_mm: params.thickness_mm ?? 25,
                  taper_angle_deg: params.taper_angle_deg ?? 0,
                  cut_length_mm: params.cut_length_mm ?? 100,
                  num_start_holes: params.num_start_holes,
                },
                tolerance_mm: params.tolerance_mm ?? 0.01,
                target_ra_um: params.target_ra_um ?? 0.8,
              },
              {
                num_passes: params.num_passes ?? 4,
              },
              {
                type: params.wire_type ?? "plain_brass",
                diameter_mm: params.wire_diameter_mm ?? 0.25,
              }
            );
            break;
          }
          case "wedm_ai_jm_die_profile": {
            const engine = await getEngine("wireEDMDeepAIHardening");
            result = engine.getJMDieMachineProfile();
            break;
          }
          case "wedm_ai_query_knowledge": {
            const engine = await getEngine("wireEDMDeepAIHardening");
            result = {
              tips: engine.queryTribalKnowledge(params.query ?? ""),
              query: params.query,
            };
            break;
          }

          // =================================================================
          // WEDM Calculator AI Engine (WEDM-CALC-AI)
          // =================================================================
          case "wedm_calc_ai_calculate": {
            const engine = await getEngine("wedmCalculatorAI");
            result = await engine.calculate({
              material: {
                name: params.material ?? "D2",
                iso_group: params.iso_group ?? "H",
                hardness_hrc: params.hardness_hrc,
                conductivity_pct: params.conductivity_pct,
                carbide_content_pct: params.carbide_content_pct,
              },
              thickness_mm: params.thickness_mm ?? 25,
              target_ra_um: params.target_ra_um,
              target_tolerance_mm: params.target_tolerance_mm,
              taper_angle_deg: params.taper_angle_deg ?? 0,
              wire_diameter_mm: params.wire_diameter_mm,
              machine: params.machine,
              priority: params.priority ?? "balanced",
            });
            break;
          }
          case "wedm_calc_ai_quick": {
            const engine = await getEngine("wedmCalculatorAI");
            result = engine.calculateQuick({
              material: {
                name: params.material ?? "D2",
                iso_group: params.iso_group ?? "H",
                hardness_hrc: params.hardness_hrc,
              },
              thickness_mm: params.thickness_mm ?? 25,
              target_ra_um: params.target_ra_um,
              wire_diameter_mm: params.wire_diameter_mm,
              priority: params.priority ?? "balanced",
            });
            break;
          }
          case "wedm_calc_ai_select_wire": {
            const engine = await getEngine("wedmCalculatorAI");
            result = await engine.selectWireWithAI({
              material: {
                name: params.material ?? "D2",
                iso_group: params.iso_group ?? "H",
                hardness_hrc: params.hardness_hrc,
                carbide_content_pct: params.carbide_content_pct,
              },
              thickness_mm: params.thickness_mm ?? 25,
              target_ra_um: params.target_ra_um,
            });
            break;
          }

          // =================================================================
          // WEDM Scheduling AI Actions
          // =================================================================
          case "wedm_schedule_reserve": {
            const engine = await getEngine("wedmScheduling");
            result = engine.reserveMachine({
              machine_id: params.machine_id,
              machine_name: params.machine_name,
              job_id: params.job_id,
              job_name: params.job_name,
              material: params.material,
              estimated_hours: params.estimated_hours ?? 1,
              starts_at: params.starts_at,
              ends_at: params.ends_at,
              created_by: params.created_by,
            });
            break;
          }
          case "wedm_schedule_check": {
            const engine = await getEngine("wedmScheduling");
            result = engine.checkAvailability({
              machine_id: params.machine_id,
              starts_at: params.starts_at,
              ends_at: params.ends_at,
            });
            break;
          }
          case "wedm_schedule_list": {
            const engine = await getEngine("wedmScheduling");
            result = engine.listReservations(params.machine_id);
            break;
          }
          case "wedm_schedule_cancel": {
            const engine = await getEngine("wedmScheduling");
            result = engine.cancelReservation(params.reservation_id);
            break;
          }
          case "wedm_schedule_ai_suggest": {
            const engine = await getEngine("wedmScheduling");
            result = await engine.suggestOptimalSlotWithAI({
              estimated_hours: params.estimated_hours ?? 1,
              material: params.material,
              priority: params.priority,
              preferred_shift: params.preferred_shift,
              within_days: params.within_days ?? 7,
            });
            break;
          }
          case "wedm_schedule_ai_analyze": {
            const engine = await getEngine("wedmScheduling");
            result = await engine.analyzeScheduleWithAI();
            break;
          }

          // =================================================================
          // WEDM Production Readiness AI Actions
          // =================================================================
          case "wedm_readiness_generate": {
            const engine = await getEngine("wedmProductionReadiness");
            result = engine.generate(params.input ?? {});
            break;
          }
          case "wedm_readiness_persist": {
            const engine = await getEngine("wedmProductionReadiness");
            result = engine.persist(params.input ?? {});
            break;
          }
          case "wedm_readiness_ai_analyze": {
            const engine = await getEngine("wedmProductionReadiness");
            const report = engine.generate(params.input ?? {});
            result = await engine.analyzeWithAI(report);
            break;
          }
          case "wedm_readiness_ai_gap": {
            const engine = await getEngine("wedmProductionReadiness");
            const report = engine.generate(params.input ?? {});
            result = await engine.analyzeGapWithAI(report, params.target_score ?? 95);
            break;
          }
          case "wedm_readiness_ai_prioritize": {
            const engine = await getEngine("wedmProductionReadiness");
            const report = engine.generate(params.input ?? {});
            result = await engine.prioritizeCalibrationWithAI(report);
            break;
          }

          // =================================================================
          // WEDM Feedback Calibration AI Actions
          // =================================================================
          case "wedm_feedback_submit": {
            const engine = await getEngine("feedbackCalibration");
            result = engine.submit_feedback({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              predicted_ra_um: params.predicted_ra_um ?? 1.0,
              actual_ra_um: params.actual_ra_um ?? 1.2,
              predicted_time_min: params.predicted_time_min ?? 60,
              actual_time_min: params.actual_time_min ?? 65,
              notes: params.notes,
              wire_breaks: params.wire_breaks,
              machine: params.machine,
            });
            break;
          }
          case "wedm_feedback_get_calibration": {
            const engine = await getEngine("feedbackCalibration");
            result = engine.get_calibration(params.material ?? "D2");
            break;
          }
          case "wedm_feedback_get_history": {
            const engine = await getEngine("feedbackCalibration");
            result = engine.get_history(params.limit ?? 20);
            break;
          }
          case "wedm_feedback_reset": {
            const engine = await getEngine("feedbackCalibration");
            engine.reset_calibration(params.material ?? "D2");
            result = { success: true, material: params.material };
            break;
          }
          case "wedm_feedback_ai_analyze": {
            const engine = await getEngine("feedbackCalibration");
            result = await engine.analyzeWithAI(params.material ?? "D2", params.recent_count ?? 10);
            break;
          }
          case "wedm_feedback_ai_predict": {
            const engine = await getEngine("feedbackCalibration");
            result = await engine.predictCalibrationWithAI(params.material ?? "D2", params.similar_material);
            break;
          }
          case "wedm_feedback_ai_troubleshoot": {
            const engine = await getEngine("feedbackCalibration");
            result = await engine.troubleshootWithAI(params.material ?? "D2", params.symptom ?? "high_ra_deviation");
            break;
          }

          // =================================================================
          // WEDM Program Index AI Actions
          // =================================================================
          case "wedm_program_index_harvest": {
            const Engine = await getEngine("wedmProgramIndex");
            result = await Engine.harvest();
            break;
          }
          case "wedm_program_index_audit": {
            const Engine = await getEngine("wedmProgramIndex");
            result = await Engine.audit();
            break;
          }
          case "wedm_program_index_ai_patterns": {
            const Engine = await getEngine("wedmProgramIndex");
            const harvestResult = await Engine.harvest();
            result = await Engine.analyzePatternWithAI(harvestResult);
            break;
          }
          case "wedm_program_index_ai_customer": {
            const Engine = await getEngine("wedmProgramIndex");
            const harvestResult = await Engine.harvest();
            result = await Engine.analyzeCustomerWithAI(harvestResult, params.customer ?? "ITW");
            break;
          }
          case "wedm_program_index_ai_similar": {
            const Engine = await getEngine("wedmProgramIndex");
            const harvestResult = await Engine.harvest();
            result = await Engine.findSimilarProgramsWithAI(harvestResult, {
              customer: params.customer,
              partNameHints: params.hints ?? [],
              programType: params.program_type,
            });
            break;
          }

          // =================================================================
          // WEDM Calibration Report AI Actions
          // =================================================================
          case "wedm_calibration_ai_analyze": {
            const engine = await getEngine("calibrationReport");
            const report = engine.generate(params);
            result = await engine.analyzeWithAI(report, params.machine_model);
            break;
          }
          case "wedm_calibration_ai_optimize_pass": {
            const engine = await getEngine("calibrationReport");
            result = await engine.optimizePassWithAI(params.pass_analysis, params.material_group ?? "P");
            break;
          }

          // =================================================================
          // WEDM Neural Training Engine Actions (WEDM-HARDEN-MS1)
          // Maximum mathematical AI: Bayesian, GP, Neural, Klocke, Kunieda, Taylor, Weibull, Monte Carlo
          // =================================================================
          case "wedm_neural_load_training": {
            const engine = await getEngine("wedmNeuralTraining");
            const count = engine.loadTrainingData();
            result = { success: true, data_points_loaded: count, state: engine.getTrainingState() };
            break;
          }
          case "wedm_neural_train": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.train(params.epochs ?? 100, params.learning_rate ?? 0.001, params.momentum ?? 0.9);
            break;
          }
          case "wedm_neural_predict_ra": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.predictRa(params.discharge_current_A ?? 8, params.on_time_us ?? 10, params.feed_rate_mm_min ?? 2);
            break;
          }
          case "wedm_neural_predict_mrr": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.predictMRR(params.discharge_current_A ?? 8, params.on_time_us ?? 10, params.pulse_frequency_kHz ?? 50, params.material ?? "steel");
            break;
          }
          case "wedm_neural_predict_wire_life": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.predictWireLife(params.wire_speed_m_min ?? 10, params.wire_tension_g ?? 1200);
            break;
          }
          case "wedm_neural_predict_break_risk": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.predictWireBreakRisk(params.cutting_time_min ?? 60, params.thickness_mm ?? 25, params.material_hardness ?? 60, params.corner_radius_mm ?? 1.0);
            break;
          }
          case "wedm_neural_forward_pass": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.forwardPass(params.features ?? {
              thickness_mm: 25, material_hardness_idx: 0.85, material_conductivity_idx: 0.5,
              pass_count: 4, e_family_idx: 0, h1_offset_mm: 0.2, final_offset_mm: 0.12,
              feed_rate_idx: 0.5, wire_diameter_mm: 0.25, wire_type_idx: 0, has_taper: 0, has_adaptive: 1
            });
            break;
          }
          case "wedm_neural_bayesian_update": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.updateBayesian(params.param ?? "klocke_C", params.observation ?? 0.45, params.observation_variance ?? 0.01);
            break;
          }
          case "wedm_neural_bayesian_estimate": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.getBayesianEstimate(params.param ?? "klocke_C");
            break;
          }
          case "wedm_neural_gp_predict": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.gpPredict(params.train_x ?? [], params.train_y ?? [], params.test_x ?? [25, 0.5, 4]);
            break;
          }
          case "wedm_neural_monte_carlo": {
            const engine = await getEngine("wedmNeuralTraining");
            const objFunc = (p: Record<string, number>) => Math.pow(p.feed - 2.5, 2) + Math.pow(p.offset - 0.2, 2);
            result = engine.monteCarloOptimize(objFunc, params.param_bounds ?? { feed: { min: 1, max: 5 }, offset: { min: 0.1, max: 0.3 } }, params.num_samples ?? 500);
            break;
          }
          case "wedm_neural_optimizations": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.generateOptimizations(params.material ?? "D2", params.thickness_mm ?? 25, params.target_ra_um ?? 1.0, params.current_params);
            break;
          }
          case "wedm_neural_ai_analyze": {
            const engine = await getEngine("wedmNeuralTraining");
            result = await engine.analyzeWithDeepAI({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              target_ra_um: params.target_ra_um ?? 1.0,
              tolerance_mm: params.tolerance_mm ?? 0.01,
              has_taper: params.has_taper ?? false,
            });
            break;
          }
          case "wedm_neural_state": {
            const engine = await getEngine("wedmNeuralTraining");
            result = engine.getTrainingState();
            break;
          }
          case "wedm_neural_reset": {
            const engine = await getEngine("wedmNeuralTraining");
            engine.reset();
            result = { success: true, message: "Neural training state reset" };
            break;
          }

          // =================================================================
          // WEDM Batch Program Analyzer Actions
          // =================================================================
          case "wedm_batch_harvest": {
            const engine = await getEngine("wedmBatchAnalyzer");
            result = await engine.harvestAllPrograms();
            break;
          }
          case "wedm_batch_analyze": {
            const engine = await getEngine("wedmBatchAnalyzer");
            result = await engine.batchAnalyze(params.limit);
            break;
          }
          case "wedm_batch_analyze_single": {
            const engine = await getEngine("wedmBatchAnalyzer");
            result = await engine.analyzeProgram(params.file_path);
            break;
          }
          case "wedm_batch_save_results": {
            const engine = await getEngine("wedmBatchAnalyzer");
            result = await engine.saveAnalysisResults();
            break;
          }

          // =================================================================
          // WEDM Program Optimizer Actions (NEW - not duplicates)
          // =================================================================
          case "wedm_optimizer_program": {
            const engine = await getEngine("wedmProgramOptimizer");
            result = engine.optimizeProgram(params.program_content ?? "");
            break;
          }
          case "wedm_optimizer_validate": {
            const engine = await getEngine("wedmProgramOptimizer");
            result = engine.validateForJMDie(params.optimized_program);
            break;
          }
          case "wedm_optimizer_estimate": {
            const engine = await getEngine("wedmProgramOptimizer");
            result = engine.estimateImprovement(params.original ?? "", params.optimized ?? "");
            break;
          }
          case "wedm_optimizer_batch": {
            const engine = await getEngine("wedmProgramOptimizer");
            result = await engine.batchOptimize(params.program_paths ?? []);
            break;
          }

          // =================================================================
          // WEDM Program Neural Analysis Actions
          // =================================================================
          case "wedm_program_neural_analyze": {
            const engine = await getEngine("wedmProgramNeuralAnalysis");
            result = await engine.analyzeProgram(params.program_content ?? "", params.material, params.thickness_mm);
            break;
          }
          case "wedm_program_neural_validate_order": {
            const engine = await getEngine("wedmProgramNeuralAnalysis");
            result = engine.validateOperationOrder(params.e_codes ?? [], params.h_offsets ?? {});
            break;
          }
          case "wedm_program_neural_optimize": {
            const engine = await getEngine("wedmProgramNeuralAnalysis");
            result = engine.optimizeParameters(params.current_params ?? {}, params.material ?? "tool_steel", params.thickness_mm ?? 25);
            break;
          }
          case "wedm_program_neural_break_risk": {
            const engine = await getEngine("wedmProgramNeuralAnalysis");
            result = engine.predictWireBreakRisk(params.program_params ?? {});
            break;
          }
          case "wedm_program_neural_suggest": {
            const engine = await getEngine("wedmProgramNeuralAnalysis");
            result = engine.suggestImprovements(params.analysis_result);
            break;
          }

          // =================================================================
          // WEDM-MASTER-AI-MS1: Master AI Orchestration
          // Full AI coordination of all 16 Wire EDM engines
          // =================================================================
          case "wedm_master_ai_analyze": {
            const { wireEDMMasterAIEngine } = await import("../../engines/WireEDMMasterAIEngine.js");
            result = await wireEDMMasterAIEngine.analyze({
              domain: params.domain ?? "parameter_selection",
              depth: params.depth ?? "standard",
              material: params.material,
              thickness_mm: params.thickness_mm,
              target_ra_um: params.target_ra_um,
              tolerance_mm: params.tolerance_mm,
              wire_type: params.wire_type,
              wire_diameter_mm: params.wire_diameter_mm,
              customer: params.customer,
              question: params.question,
              program_content: params.program_content,
              current_params: params.current_params,
              constraints: params.constraints,
              include_counterfactuals: params.include_counterfactuals ?? true,
              include_tribal_knowledge: params.include_tribal_knowledge ?? true,
              jm_die_context: params.jm_die_context ?? true,
            });
            break;
          }
          case "wedm_master_ai_parameters": {
            const { wireEDMMasterAIEngine } = await import("../../engines/WireEDMMasterAIEngine.js");
            result = await wireEDMMasterAIEngine.analyzeParameters(
              params.material ?? "D2",
              params.thickness_mm ?? 25,
              params.target_ra_um ?? 0.8,
              { depth: params.depth, include_counterfactuals: params.include_counterfactuals }
            );
            break;
          }
          case "wedm_master_ai_troubleshoot": {
            const { wireEDMMasterAIEngine } = await import("../../engines/WireEDMMasterAIEngine.js");
            result = await wireEDMMasterAIEngine.troubleshoot(
              params.problem ?? "Unknown wire EDM issue",
              {
                material: params.material,
                thickness_mm: params.thickness_mm,
                current_params: params.current_params,
                symptoms: params.symptoms,
              }
            );
            break;
          }
          case "wedm_master_ai_optimize": {
            const { wireEDMMasterAIEngine } = await import("../../engines/WireEDMMasterAIEngine.js");
            result = await wireEDMMasterAIEngine.optimizeProgram(
              params.program_content ?? "",
              params.target_improvements ?? ["quality", "speed"]
            );
            break;
          }
          case "wedm_master_ai_generate": {
            const { wireEDMMasterAIEngine } = await import("../../engines/WireEDMMasterAIEngine.js");
            result = await wireEDMMasterAIEngine.generateProgram(
              params.material ?? "D2",
              params.thickness_mm ?? 25,
              params.target_ra_um ?? 0.8,
              params.geometry
            );
            break;
          }

          // =================================================================
          // WEDM-REASON-MS1: Deep Reasoning Engine
          // Claude Opus-level causal, diagnostic, analogical reasoning
          // =================================================================
          case "wedm_reason": {
            const { wireEDMDeepReasoningEngine } = await import("../../engines/WireEDMDeepReasoningEngine.js");
            result = wireEDMDeepReasoningEngine.reason(
              params.query ?? params.question ?? "What should I do?",
              {
                material: params.material,
                thickness_mm: params.thickness_mm,
                symptoms: params.symptoms,
                observations: params.observations,
                target_ra_um: params.target_ra_um,
              }
            );
            break;
          }
          case "wedm_reason_causal": {
            const { wireEDMDeepReasoningEngine } = await import("../../engines/WireEDMDeepReasoningEngine.js");
            if (params.find_root_cause) {
              result = wireEDMDeepReasoningEngine.findRootCause(params.effect ?? params.query);
            } else {
              result = wireEDMDeepReasoningEngine.buildCausalChain(
                params.cause ?? params.query,
                params.target_effect
              );
            }
            break;
          }
          case "wedm_reason_diagnose": {
            const { wireEDMDeepReasoningEngine } = await import("../../engines/WireEDMDeepReasoningEngine.js");
            result = wireEDMDeepReasoningEngine.diagnose(
              params.symptoms ?? [params.query ?? "unknown issue"]
            );
            break;
          }
          case "wedm_reason_analogies": {
            const { wireEDMDeepReasoningEngine } = await import("../../engines/WireEDMDeepReasoningEngine.js");
            result = wireEDMDeepReasoningEngine.findAnalogies(
              params.scenario ?? params.query ?? "standard cutting"
            );
            break;
          }
          case "wedm_reason_probabilistic": {
            const { wireEDMDeepReasoningEngine } = await import("../../engines/WireEDMDeepReasoningEngine.js");
            result = wireEDMDeepReasoningEngine.estimateWithUncertainty(
              params.parameter ?? "surface_roughness",
              {
                material: params.material,
                thickness_mm: params.thickness_mm,
                num_passes: params.num_passes,
              }
            );
            break;
          }

          // =================================================================
          // WEDM-NEURAL-ORCH-MS1: Neural Orchestration
          // Claude Opus-level intelligent orchestration combining all AI
          // =================================================================
          case "wedm_orchestrate": {
            const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
            result = wireEDMNeuralOrchestrationEngine.orchestrate({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              target_ra_um: params.target_ra_um,
              geometry: params.geometry,
              priority: params.priority ?? "balanced",
              constraints: params.constraints,
              context: params.context,
              observations: params.observations,
              symptoms: params.symptoms,
            });
            break;
          }
          case "wedm_orchestrate_quick": {
            const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
            result = wireEDMNeuralOrchestrationEngine.getQuickParameters(
              params.material ?? "D2",
              params.thickness_mm ?? 25,
              params.target_ra_um
            );
            break;
          }
          case "wedm_orchestrate_cost": {
            const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
            result = wireEDMNeuralOrchestrationEngine.optimizeForCost({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              target_ra_um: params.target_ra_um,
              priority: params.priority,
            });
            break;
          }
          case "wedm_orchestrate_troubleshoot": {
            const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
            result = wireEDMNeuralOrchestrationEngine.troubleshoot(
              params.symptoms ?? [params.problem ?? "unknown issue"]
            );
            break;
          }
          case "wedm_orchestrate_compare": {
            const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
            result = wireEDMNeuralOrchestrationEngine.compareStrategies(
              {
                material: params.material ?? "D2",
                thickness_mm: params.thickness_mm ?? 25,
              },
              params.strategy_ids ?? ["physics_standard", "neural_optimized", "tribal_jmdie"]
            );
            break;
          }
          case "wedm_orchestrate_feedback": {
            const { wireEDMNeuralOrchestrationEngine } = await import("../../engines/WireEDMNeuralOrchestrationEngine.js");
            result = wireEDMNeuralOrchestrationEngine.recordFeedback({
              decision_id: params.decision_id ?? "unknown",
              actual_ra_um: params.actual_ra_um,
              actual_cycle_time_min: params.actual_cycle_time_min,
              actual_wire_m: params.actual_wire_m,
              success: params.success ?? true,
              issues: params.issues,
              timestamp: new Date().toISOString(),
            });
            break;
          }

          // =================================================================
          // WEDM-SELF-AWARE-MS1: Self-Awareness Integration
          // Claude Opus-level AI integration with PRISM self-awareness
          // =================================================================
          case "wedm_ai_query": {
            const { wireEDMSelfAwarenessIntegrationEngine } = await import("../../engines/WireEDMSelfAwarenessIntegrationEngine.js");
            result = await wireEDMSelfAwarenessIntegrationEngine.query({
              question: params.question ?? params.query ?? "What should I do?",
              context: {
                material: params.material,
                thickness_mm: params.thickness_mm,
                target_ra_um: params.target_ra_um,
                machine: params.machine,
                symptoms: params.symptoms,
                customer: params.customer,
              },
              depth: params.depth ?? "standard",
            });
            break;
          }
          case "wedm_ai_capabilities": {
            const { wireEDMSelfAwarenessIntegrationEngine } = await import("../../engines/WireEDMSelfAwarenessIntegrationEngine.js");
            result = wireEDMSelfAwarenessIntegrationEngine.getCapabilityManifest();
            break;
          }
          case "wedm_ai_tribal_search": {
            const { wireEDMSelfAwarenessIntegrationEngine } = await import("../../engines/WireEDMSelfAwarenessIntegrationEngine.js");
            result = wireEDMSelfAwarenessIntegrationEngine.searchTribalKnowledge(
              params.query ?? params.keyword ?? "wire break",
              params.limit ?? 5
            );
            break;
          }
          case "wedm_ai_validate": {
            const { wireEDMSelfAwarenessIntegrationEngine } = await import("../../engines/WireEDMSelfAwarenessIntegrationEngine.js");
            result = wireEDMSelfAwarenessIntegrationEngine.validateApproach({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              num_passes: params.num_passes ?? 4,
              target_ra_um: params.target_ra_um ?? 0.8,
              wire_diameter: params.wire_diameter,
            });
            break;
          }
          case "wedm_ai_recommend_engine": {
            const { wireEDMSelfAwarenessIntegrationEngine } = await import("../../engines/WireEDMSelfAwarenessIntegrationEngine.js");
            result = wireEDMSelfAwarenessIntegrationEngine.getRecommendedEngine(
              params.task ?? params.question ?? "What parameters should I use?"
            );
            break;
          }
          case "wedm_ai_jmdie_context": {
            const { wireEDMSelfAwarenessIntegrationEngine } = await import("../../engines/WireEDMSelfAwarenessIntegrationEngine.js");
            result = wireEDMSelfAwarenessIntegrationEngine.getJMDieWEDMContext();
            break;
          }

          // =================================================================
          // WEDM-DEEP-LOGIC-MS1: Deep Logic Engine
          // Claude Opus-level counterfactual, hypothesis, and constraint logic
          // =================================================================
          case "wedm_logic_reason": {
            const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
            result = wireEDMDeepLogicEngine.reason(
              params.query ?? params.question ?? "What should I do?",
              {
                material: params.material,
                thickness_mm: params.thickness_mm,
                target_ra_um: params.target_ra_um,
                num_passes: params.num_passes,
                symptoms: params.symptoms,
              }
            );
            break;
          }
          case "wedm_logic_counterfactual": {
            const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
            result = wireEDMDeepLogicEngine.analyzeCounterfactuals(
              {
                material: params.material ?? "D2",
                thickness_mm: params.thickness_mm ?? 25,
                num_passes: params.num_passes ?? 4,
                on_time_us: params.on_time_us ?? 4,
                wire_diameter: params.wire_diameter ?? "0.25",
              },
              params.parameters_to_vary
            );
            break;
          }
          case "wedm_logic_hypothesis": {
            const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
            result = wireEDMDeepLogicEngine.generateHypotheses(
              params.observation ?? params.query ?? "Unknown observation",
              { material: params.material, thickness_mm: params.thickness_mm }
            );
            break;
          }
          case "wedm_logic_inference": {
            const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
            result = wireEDMDeepLogicEngine.buildInferenceChain(
              params.goal ?? "Determine optimal parameters",
              params.mode ?? "deductive",
              {
                material: params.material,
                thickness_mm: params.thickness_mm,
                target_ra_um: params.target_ra_um,
              }
            );
            break;
          }
          case "wedm_logic_constraint": {
            const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
            result = wireEDMDeepLogicEngine.solveConstraints({
              target_ra_um: params.target_ra_um ?? 0.8,
              max_cycle_time_min: params.max_cycle_time_min ?? 60,
              max_wire_consumption_m: params.max_wire_consumption_m,
              thickness_mm: params.thickness_mm ?? 25,
            });
            break;
          }
          case "wedm_logic_decision": {
            const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
            result = wireEDMDeepLogicEngine.analyzeDecision(
              params.question ?? "Which strategy should I use?",
              {
                material: params.material,
                thickness_mm: params.thickness_mm,
                target_ra_um: params.target_ra_um,
              }
            );
            break;
          }
          case "wedm_logic_test_hypothesis": {
            const { wireEDMDeepLogicEngine } = await import("../../engines/WireEDMDeepLogicEngine.js");
            result = wireEDMDeepLogicEngine.testHypothesis(
              {
                id: params.hypothesis_id ?? "H001",
                statement: params.statement ?? "Unknown hypothesis",
                confidence: params.confidence ?? 0.5,
                supporting_evidence: params.supporting_evidence ?? [],
                contradicting_evidence: params.contradicting_evidence ?? [],
                tests_required: params.tests_required ?? [],
                implications: params.implications ?? [],
              },
              params.new_evidence
            );
            break;
          }

          // ══════════════════════════════════════════════════════════════════
          // WEDM-SYNTH-MS1: Knowledge Synthesis Engine Actions
          // ══════════════════════════════════════════════════════════════════

          case "wedm_synth_query": {
            const engine = await getEngine("wedmKnowledgeSynthesis");
            result = await engine.synthesize({
              question: params.question,
              context: params.context,
              require_sources: params.require_sources,
              exclude_sources: params.exclude_sources,
              confidence_threshold: params.confidence_threshold,
              max_hypotheses: params.max_hypotheses,
            });
            break;
          }

          case "wedm_synth_counterfactual": {
            const engine = await getEngine("wedmKnowledgeSynthesis");
            const response = await engine.synthesize({
              question: `What if ${params.variation_description ?? "parameters changed"}?`,
              context: params.context,
            });
            result = {
              counterfactuals: response.counterfactuals_considered,
              recommendations: response.action_recommendations,
            };
            break;
          }

          case "wedm_synth_hypotheses": {
            const engine = await getEngine("wedmKnowledgeSynthesis");
            const response = await engine.synthesize({
              question: params.problem_statement ?? "What is causing this issue?",
              context: params.context,
            });
            result = response.hypothesis_evaluation ?? {
              hypotheses: [],
              best_hypothesis: null,
              recommendation: "No hypothesis evaluation available",
            };
            break;
          }

          case "wedm_synth_learn": {
            const engine = await getEngine("wedmKnowledgeSynthesis");
            result = engine.recordOutcome(
              params.scenario ?? {},
              params.prediction ?? {},
              params.actual_outcome ?? {}
            );
            break;
          }

          case "wedm_synth_transfer": {
            const engine = await getEngine("wedmKnowledgeSynthesis");
            result = engine.transferKnowledge(
              params.source_domain ?? "wire_edm",
              params.target_domain ?? "sinker_edm",
              params.concepts ?? ["thermal", "surface_finish"]
            );
            break;
          }

          case "wedm_synth_status": {
            const engine = await getEngine("wedmKnowledgeSynthesis");
            result = engine.getStatus();
            break;
          }

          // ══════════════════════════════════════════════════════════════════
          // WEDM-PREDICT-MS1: Predictive Intelligence Engine Actions
          // ══════════════════════════════════════════════════════════════════

          case "wedm_predict_full": {
            const engine = await getEngine("wedmPredictiveIntelligence");
            result = await engine.predict({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              wire_diameter_mm: params.wire_diameter_mm,
              num_passes: params.num_passes,
              target_ra_um: params.target_ra_um,
              target_tolerance_mm: params.target_tolerance_mm,
              machine: params.machine,
              urgency: params.urgency,
              customer: params.customer,
              job_type: params.job_type,
            });
            break;
          }

          case "wedm_predict_ra": {
            const engine = await getEngine("wedmPredictiveIntelligence");
            const full = await engine.predict({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              num_passes: params.num_passes,
              target_ra_um: params.target_ra_um,
            });
            result = full.predictions.surface_finish;
            break;
          }

          case "wedm_predict_time": {
            const engine = await getEngine("wedmPredictiveIntelligence");
            const full = await engine.predict({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              num_passes: params.num_passes,
            });
            result = full.predictions.cut_time;
            break;
          }

          case "wedm_predict_risk": {
            const engine = await getEngine("wedmPredictiveIntelligence");
            const full = await engine.predict({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              urgency: params.urgency,
            });
            result = full.predictions.wire_break_risk;
            break;
          }

          case "wedm_predict_cost": {
            const engine = await getEngine("wedmPredictiveIntelligence");
            const full = await engine.predict({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              num_passes: params.num_passes,
            });
            result = full.predictions.cost;
            break;
          }

          case "wedm_predict_quality": {
            const engine = await getEngine("wedmPredictiveIntelligence");
            const full = await engine.predict({
              material: params.material ?? "D2",
              thickness_mm: params.thickness_mm ?? 25,
              num_passes: params.num_passes,
              target_ra_um: params.target_ra_um,
              target_tolerance_mm: params.target_tolerance_mm,
            });
            result = full.predictions.quality_score;
            break;
          }

          case "wedm_predict_status": {
            const engine = await getEngine("wedmPredictiveIntelligence");
            result = engine.getStatus();
            break;
          }

          // ══════════════════════════════════════════════════════════════════
          // WEDM-NEURAL-REASON-MS1: Deep Neural Reasoning Engine Actions
          // ══════════════════════════════════════════════════════════════════

          case "wedm_neural_reason": {
            const engine = await getEngine("wedmDeepNeuralReasoning");
            result = await engine.reason({
              question: params.question ?? "What parameters should I use?",
              context: {
                material: params.material,
                thickness_mm: params.thickness_mm,
                target_ra_um: params.target_ra_um,
                machine: params.machine,
                wire_diameter_mm: params.wire_diameter_mm,
                constraints: params.constraints,
                preferences: params.preferences,
              },
              reasoning_depth: "standard",
            });
            break;
          }

          case "wedm_neural_reason_deep": {
            const engine = await getEngine("wedmDeepNeuralReasoning");
            result = await engine.reason({
              question: params.question ?? "Deep analysis needed",
              context: {
                material: params.material,
                thickness_mm: params.thickness_mm,
                target_ra_um: params.target_ra_um,
                machine: params.machine,
                wire_diameter_mm: params.wire_diameter_mm,
                constraints: params.constraints,
                preferences: params.preferences,
              },
              reasoning_depth: params.depth ?? "deep",
            });
            break;
          }

          case "wedm_neural_ecode_lookup": {
            const engine = await getEngine("wedmDeepNeuralReasoning");
            result = engine.getECodeForThickness(params.thickness_mm ?? 25);
            break;
          }

          case "wedm_neural_material_embedding": {
            const engine = await getEngine("wedmDeepNeuralReasoning");
            result = {
              material: params.material ?? "D2",
              embedding: engine.getMaterialEmbedding(params.material ?? "D2"),
            };
            break;
          }

          case "wedm_neural_status": {
            const engine = await getEngine("wedmDeepNeuralReasoning");
            result = engine.getStatus();
            break;
          }

          // ══════════════════════════════════════════════════════════════════
          // MS-P1-100PCT U-P1-02: Citation verification actions
          // ══════════════════════════════════════════════════════════════════

          case "wedm_citation_check": {
            const engine = await getEngine("wedmCitationCheck");
            const engineName = params.engine as string | undefined;
            if (engineName) {
              result = await engine.checkEngine(engineName);
            } else {
              result = await engine.checkAllWEDMEngines();
            }
            break;
          }

          case "wedm_citation_report": {
            const engine = await getEngine("wedmCitationCheck");
            const files = params.files as string[] | undefined;
            result = { report: await engine.generateReport(files) };
            break;
          }

          case "wedm_synthetics_list": {
            const engine = await getEngine("wedmCitationCheck");
            result = { engines: await engine.getEnginesWithSynthetics() };
            break;
          }

          // ═══════════════════════════════════════════════════════════════════
          // WEDM-NEXT-MS0 U-WN02: Feature Importance Engine
          // ═══════════════════════════════════════════════════════════════════
          case "wedm_feature_importance": {
            const engine = await getEngine("featureImportance");
            result = engine.computeImportance(
              params.data ?? [],
              params.target_outcome ?? "mrr",
              { nPermutations: params.n_permutations }
            );
            break;
          }
          case "wedm_partial_dependence": {
            const engine = await getEngine("featureImportance");
            result = engine.computePartialDependence(
              params.data ?? [],
              params.feature,
              params.outcome ?? "mrr",
              { nPoints: params.n_points }
            );
            break;
          }
          case "wedm_feature_interactions": {
            const engine = await getEngine("featureImportance");
            result = engine.computeInteractions(
              params.data ?? [],
              params.outcome ?? "mrr"
            );
            break;
          }
          case "wedm_optimization_guidance": {
            const engine = await getEngine("featureImportance");
            const importance = engine.computeImportance(
              params.data ?? [],
              params.target_outcome ?? "mrr",
              { nPermutations: params.n_permutations ?? 10 }
            );
            result = engine.getOptimizationGuidance(
              importance,
              params.target_outcome ?? "mrr",
              params.direction ?? "maximize"
            );
            break;
          }

          // ═══════════════════════════════════════════════════════════════════
          // WEDM-NEXT-MS0 U-WN03: Transfer Learning Engine
          // ═══════════════════════════════════════════════════════════════════
          case "wedm_transfer_params": {
            const engine = await getEngine("transferLearning");
            result = engine.transfer({
              sourceMaterial: params.source_material,
              targetMaterial: params.target_material,
              sourceMachine: params.source_machine,
              targetMachine: params.target_machine,
              sourceParameters: params.source_parameters,
              sourceOutcomes: params.source_outcomes,
            });
            break;
          }
          case "wedm_material_similarity": {
            const engine = await getEngine("transferLearning");
            result = engine.computeMaterialSimilarity(
              params.source_material,
              params.target_material
            );
            break;
          }
          case "wedm_batch_transfer": {
            const engine = await getEngine("transferLearning");
            result = engine.batchTransfer(
              params.source_parameters,
              params.source_material,
              params.target_materials,
              params.source_machine,
              params.target_machine
            );
            break;
          }
          case "wedm_similar_materials": {
            const engine = await getEngine("transferLearning");
            result = engine.findSimilarMaterials(params.material, params.top_n ?? 3);
            break;
          }
          case "wedm_validate_transfer": {
            const engine = await getEngine("transferLearning");
            result = engine.validateTransfer(params.parameters, params.target_material);
            break;
          }

          // ═══════════════════════════════════════════════════════════════════
          // WEDM-NEXT-MS0 U-WN04: Online Learning Engine
          // ═══════════════════════════════════════════════════════════════════
          case "wedm_online_init": {
            const engine = await getEngine("onlineLearning");
            result = engine.initializeModel(params.material, params.machine_id);
            break;
          }
          case "wedm_online_predict": {
            const engine = await getEngine("onlineLearning");
            result = engine.predict(
              params.material,
              params.parameters,
              params.thickness,
              params.machine_id
            );
            break;
          }
          case "wedm_online_update": {
            const engine = await getEngine("onlineLearning");
            result = engine.updateFromFeedback(params.feedback);
            break;
          }
          case "wedm_online_batch_update": {
            const engine = await getEngine("onlineLearning");
            result = engine.batchUpdate(params.feedback_list);
            break;
          }
          case "wedm_online_stats": {
            const engine = await getEngine("onlineLearning");
            result = engine.getStats(params.material, params.machine_id);
            break;
          }
          case "wedm_online_state": {
            const engine = await getEngine("onlineLearning");
            result = engine.getModelState(params.material, params.machine_id);
            break;
          }
          case "wedm_online_reset": {
            const engine = await getEngine("onlineLearning");
            result = { reset: engine.resetModel(params.material, params.machine_id) };
            break;
          }
          case "wedm_online_export": {
            const engine = await getEngine("onlineLearning");
            result = engine.exportModel(params.material, params.machine_id);
            break;
          }
          case "wedm_online_import": {
            const engine = await getEngine("onlineLearning");
            result = { imported: engine.importModel(params.model_id, params.state, params.history) };
            break;
          }
          case "wedm_online_list": {
            const engine = await getEngine("onlineLearning");
            result = { models: engine.listModels() };
            break;
          }
          case "wedm_online_drift": {
            const engine = await getEngine("onlineLearning");
            result = engine.detectDrift(params.material, params.machine_id);
            break;
          }

          // =================================================================
          // WEDM THERMAL FIELD (P2-THERMAL U-WN05)
          // =================================================================
          case "wedm_thermal_field": {
            const engine = await getEngine("thermalField");
            result = engine.computeThermalFieldSimple(params.material, params.parameters, params.thickness);
            if (params.includeTransient) {
              result.transient = engine.computeTransientAnalysisSimple(params.material, params.parameters, 10);
            }
            break;
          }
          case "wedm_thermal_transient": {
            const engine = await getEngine("thermalField");
            result = engine.computeTransientAnalysisSimple(params.material, params.parameters, params.pulseCount, params.timeResolution);
            break;
          }
          case "wedm_thermal_recast": {
            const engine = await getEngine("thermalField");
            result = engine.estimateRecastLayerSimple(params.material, params.parameters, params.passType, params.flushingEfficiency);
            break;
          }
          case "wedm_thermal_validate": {
            const engine = await getEngine("thermalField");
            result = engine.validateParametersSimple(params.material, params.parameters, params.targetRecast, params.targetHAZ);
            break;
          }
          case "wedm_thermal_materials": {
            const engine = await getEngine("thermalField");
            result = engine.listMaterialsByCategory(params.category);
            break;
          }
          case "wedm_thermal_optimize": {
            const engine = await getEngine("thermalField");
            result = engine.optimizeForRecast(params.material, params.targetRecast, params.targetMRR, params.constraints);
            break;
          }

          // =================================================================
          // WEDM SPARK EROSION MODEL (WEDM-BIZ-MS0 U-WB01)
          // DiBitonto-Sato hybrid: crater geometry, MRR, Ra, energy per spark
          // =================================================================
          case "wedm_spark_erosion": {
            const engine = await getEngine("sparkErosion");
            result = engine.calculate({
              material: params.material,
              thickness_mm: params.thickness_mm,
              pulse_on_us: params.pulse_on_us,
              pulse_off_us: params.pulse_off_us,
              current_A: params.current_A,
              voltage_V: params.voltage_V,
              wire_diameter_mm: params.wire_diameter_mm,
            });
            break;
          }
          case "wedm_spark_erosion_compare": {
            const engine = await getEngine("sparkErosion");
            result = engine.compareMaterials({
              materials: params.materials,
              thickness_mm: params.thickness_mm,
              pulse_on_us: params.pulse_on_us,
              pulse_off_us: params.pulse_off_us,
              current_A: params.current_A,
            });
            break;
          }
          case "wedm_spark_erosion_validate": {
            const engine = await getEngine("sparkErosion");
            result = engine.validateParameters({
              material: params.material,
              thickness_mm: params.thickness_mm,
              pulse_on_us: params.pulse_on_us,
              pulse_off_us: params.pulse_off_us,
              current_A: params.current_A,
              wire_diameter_mm: params.wire_diameter_mm,
            });
            break;
          }
          case "wedm_spark_erosion_cut_time": {
            const engine = await getEngine("sparkErosion");
            result = engine.predictCutTime({
              material: params.material,
              thickness_mm: params.thickness_mm,
              pulse_on_us: params.pulse_on_us,
              pulse_off_us: params.pulse_off_us,
              current_A: params.current_A,
              cut_length_mm: params.cut_length_mm,
              wire_diameter_mm: params.wire_diameter_mm,
            });
            break;
          }

          // ── WEDM-BIZ-MS0: Gap Voltage Control ──────────────────────────────────
          case "wedm_gap_voltage": {
            const engine = await getEngine("gapVoltage");
            result = engine.calculate({
              dielectric_type: params.dielectric_type,
              debris_ppm: params.debris_ppm,
              gap_distance_um: params.gap_distance_um,
              peak_current_A: params.peak_current_A,
              pulse_on_us: params.pulse_on_us,
              workpiece_material: params.workpiece_material,
            });
            break;
          }

          case "wedm_gap_voltage_validate": {
            const engine = await getEngine("gapVoltage");
            result = engine.validateParameters({
              dielectric_type: params.dielectric_type,
              debris_ppm: params.debris_ppm,
              gap_distance_um: params.gap_distance_um,
              peak_current_A: params.peak_current_A,
              pulse_on_us: params.pulse_on_us,
              workpiece_material: params.workpiece_material,
            });
            break;
          }

          case "wedm_gap_voltage_optimize_servo": {
            const engine = await getEngine("gapVoltage");
            result = engine.optimizeServo(
              params.target_discharge_probability,
              params.dielectric_type,
              params.max_debris_ppm,
            );
            break;
          }

          case "wedm_gap_voltage_compare_dielectrics": {
            const engine = await getEngine("gapVoltage");
            result = engine.compareDielectrics(
              params.debris_ppm,
              params.gap_distance_um,
            );
            break;
          }

          case "wedm_gap_voltage_list_dielectrics": {
            const engine = await getEngine("gapVoltage");
            result = engine.listDielectrics();
            break;
          }

          // ── WEDM-BIZ-MS0: MRR Physics ───────────────────────────────────────
          case "wedm_mrr_calculate": {
            const engine = await getEngine("mrrPhysics");
            result = engine.calculate(params);
            break;
          }

          case "wedm_mrr_cut_time": {
            const engine = await getEngine("mrrPhysics");
            result = engine.estimateCutTime(
              {
                material: params.material,
                thickness_mm: params.thickness_mm,
                wire_type: params.wire_type,
                wire_diameter_mm: params.wire_diameter_mm,
                pulse_on_us: params.pulse_on_us,
                pulse_off_us: params.pulse_off_us,
                current_A: params.current_A,
                voltage_V: params.voltage_V,
                servo: params.servo,
                flushing_pressure_bar: params.flushing_pressure_bar,
              },
              params.profile_length_mm,
              {
                num_skim_passes: params.num_skim_passes,
                num_start_holes: params.num_start_holes,
                include_setup: params.include_setup,
              }
            );
            break;
          }

          case "wedm_mrr_compare_materials": {
            const engine = await getEngine("mrrPhysics");
            result = engine.compareMaterials(params.materials, {
              thickness_mm: params.thickness_mm,
              pulse_on_us: params.pulse_on_us,
              pulse_off_us: params.pulse_off_us,
              current_A: params.current_A,
            });
            break;
          }

          case "wedm_mrr_optimize": {
            const engine = await getEngine("mrrPhysics");
            result = engine.optimizeForMRR(
              params.target_mrr_mm3_min,
              params.material,
              params.thickness_mm,
              {
                max_current_A: params.max_current_A,
                max_pulse_on_us: params.max_pulse_on_us,
                min_surface_finish: params.min_surface_finish,
              }
            );
            break;
          }

          case "wedm_mrr_validate": {
            const engine = await getEngine("mrrPhysics");
            result = engine.validateAgainstEmpirical(
              {
                material: params.material,
                thickness_mm: params.thickness_mm,
                wire_type: params.wire_type,
                wire_diameter_mm: params.wire_diameter_mm,
                pulse_on_us: params.pulse_on_us,
                pulse_off_us: params.pulse_off_us,
                current_A: params.current_A,
                voltage_V: params.voltage_V,
                servo: params.servo,
                flushing_pressure_bar: params.flushing_pressure_bar,
              },
              params.measured_mrr_mm3_min
            );
            break;
          }

          case "wedm_mrr_list_materials": {
            const engine = await getEngine("mrrPhysics");
            result = engine.listMaterials();
            break;
          }

          case "wedm_mrr_list_wires": {
            const engine = await getEngine("mrrPhysics");
            result = engine.listWireTypes();
            break;
          }

          case "wedm_wire_stress_analyze": {
            const engine = await getEngine("wireStress");
            result = engine.analyze(params);
            break;
          }

          case "wedm_wire_stress_optimize_tension": {
            const engine = await getEngine("wireStress");
            result = engine.optimizeTension(params);
            break;
          }

          case "wedm_wire_stress_accumulate_damage": {
            const engine = await getEngine("wireStress");
            result = engine.accumulateDamage(params.segments);
            break;
          }

          case "wedm_wire_tension_optimize": {
            const engine = await getEngine("wireTensionOpt");
            result = engine.optimize(params);
            break;
          }

          case "wedm_wire_tension_compare_scenarios": {
            const engine = await getEngine("wireTensionOpt");
            result = engine.compareScenarios(params.scenarios);
            break;
          }

          default:
            result = { error: `Unknown action: ${action}` };
        }
        // POST-CALCULATION HOOKS
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_edm] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_edm");
      }
      // MS-P0.5-COORD: attach awareness summary when present (metadata, non-blocking)
      if (_awareness && result && typeof result === "object" && !Array.isArray(result)) {
        (result as any)._awareness = _awareness;
      }
      // MS-P0.5-COORD U-08: unified outcome recording via multi-agent dispatch engine
      try {
        const { wedmMultiAgentDispatchEngine } = await import("../../engines/WEDMMultiAgentDispatchEngine.js");
        const isError = result && typeof result === "object" && "error" in (result as any);
        wedmMultiAgentDispatchEngine.recordOutcome({
          dispatcher: "edm",
          action,
          keywords: _awarenessKeywords,
          entryAt: _entryAt,
          success: !isError,
          awareness_used: !!_awareness,
          error: isError ? String((result as any).error) : undefined,
        });
      } catch { /* ledger never blocks */ }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
