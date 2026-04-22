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

// Merge legacy + pipeline + ML optimizer + feature importance + transfer learning + online learning + thermal field + spark erosion schemas
const ALL_EDM_SCHEMAS = { ...EDM_ACTION_SCHEMAS, ...WEDM_PIPELINE_ACTION_SCHEMAS, ...WEDM_ML_OPTIMIZER_SCHEMAS, ...WEDM_FEATURE_IMPORTANCE_SCHEMAS, ...WEDM_TRANSFER_LEARNING_SCHEMAS, ...WEDM_ONLINE_LEARNING_SCHEMAS, ...WEDM_THERMAL_FIELD_SCHEMAS, ...WEDM_SPARK_EROSION_SCHEMAS, ...WEDM_GAP_VOLTAGE_SCHEMAS, ...WEDM_MRR_SCHEMAS, ...WEDM_WIRE_STRESS_SCHEMAS, ...WEDM_WIRE_TENSION_OPT_SCHEMAS };

// Legacy engine lazy loaders
let _electrode: any, _wire: any, _surface: any, _micro: any;
let _laser: any, _waterjet: any, _sinker: any;

// WEDM geometry parser lazy loader
let _geometryParser: any;

// WEDM-P2P pipeline engine lazy loaders
let _drawingInterp: any, _feasibility: any, _materialMachineWire: any;
let _startHoleSetup: any, _toolpathStrategy: any, _multiPass: any;
let _cuttingParamFlush: any, _wireSlugCornerTaper: any;
let _monitorSurface: any, _postProcessGCode: any;
let _costDocumentation: any, _qualityOrchestrator: any;
let _biMaterial: any;
let _mlParamOptimizer: any;
let _featureImportance: any;
let _transferLearning: any;
let _onlineLearning: any;
let _thermalField: any;
let _sparkErosion: any;
let _gapVoltage: any;
let _mrrPhysics: any;
let _wireStress: any;
let _wireTensionOpt: any;

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
    case "mlParamOptimizer": return _mlParamOptimizer ??= (await import("../../engines/WEDMMLParameterOptimizerEngine.js")).wedmMLParameterOptimizerEngine;
    case "featureImportance": return _featureImportance ??= (await import("../../engines/WEDMFeatureImportanceEngine.js")).wedmFeatureImportanceEngine;
    case "transferLearning": return _transferLearning ??= (await import("../../engines/WEDMTransferLearningEngine.js")).wedmTransferLearningEngine;
    case "onlineLearning": return _onlineLearning ??= (await import("../../engines/WEDMOnlineLearningEngine.js")).wedmOnlineLearningEngine;
    case "thermalField": return _thermalField ??= (await import("../../engines/WEDMThermalFieldEngine.js")).wedmThermalFieldEngine;
    case "sparkErosion": return _sparkErosion ??= (await import("../../engines/WEDMSparkErosionModelEngine.js")).wedmSparkErosionModelEngine;
    case "gapVoltage": return _gapVoltage ??= (await import("../../engines/WEDMGapVoltageControlEngine.js")).wedmGapVoltageControlEngine;
    case "mrrPhysics": return _mrrPhysics ??= (await import("../../engines/WEDMMRRPhysicsEngine.js")).wedmMRRPhysicsEngine;
    case "wireStress": return _wireStress ??= (await import("../../engines/WEDMWireStressAnalysisEngine.js")).wedmWireStressAnalysisEngine;
    case "wireTensionOpt": return _wireTensionOpt ??= (await import("../../engines/WEDMWireTensionOptimizerEngine.js")).wedmWireTensionOptimizerEngine;

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

  // WEDM geometry parser
  "wedm_parse_geometry", "wedm_validate_geometry",

  // WEDM-P2P pipeline actions
  "wedm_interpret_drawing", "wedm_classify_features", "wedm_calculate_passes",
  "wedm_assess_feasibility", "wedm_check_conductivity", "wedm_estimate_time",
  "wedm_assess_material", "wedm_select_machine", "wedm_select_wire", "wedm_full_selection", "wedm_machine_uv_travel",
  "wedm_plan_start_holes", "wedm_plan_setup",
  "wedm_generate_toolpath", "wedm_plan_tabs", "wedm_optimize_sequence",
  "wedm_plan_passes", "wedm_full_multipass",
  "wedm_optimize_params", "wedm_plan_flushing", "wedm_predict_wire_break",
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

  // CWEDM-MS0: Calculator orchestration (6-engine chain for speed/feed calculator wire_edm tab)
  "wedm_calculator_solve",
  // Forge-Triple: WEDM-MS0 + WEDM-MS1
  "wedm_studio_pipeline", "wedm_advanced_analysis",

  // WEDM-100PCT-MS0: Complete 30-stage orchestrator (physics-optimized, all dialects)
  "wedm_generate_complete_program",
  "wedm_generate_optimized_program", // forge-triple alias → routes to same orchestrator

  // WEDM-NEXT-MS0: ML Parameter Optimization (Bayesian)
  "wedm_ml_optimize_init", "wedm_ml_optimize_observe", "wedm_ml_optimize_status", "wedm_ml_optimize_close",

  // WEDM-NEXT-MS0: Feature Importance (SHAP-inspired)
  "wedm_feature_importance", "wedm_partial_dependence", "wedm_feature_interactions", "wedm_optimization_guidance",

  // WEDM-NEXT-MS0: Transfer Learning (cross-material/machine)
  "wedm_transfer_params", "wedm_material_similarity", "wedm_batch_transfer", "wedm_similar_materials", "wedm_validate_transfer",

  // WEDM-NEXT-MS0: Online Learning (incremental production feedback)
  "wedm_online_init", "wedm_online_predict", "wedm_online_update", "wedm_online_batch_update",
  "wedm_online_stats", "wedm_online_state", "wedm_online_reset", "wedm_online_export",
  "wedm_online_import", "wedm_online_list", "wedm_online_drift",

  // WEDM-NEXT-MS0: Thermal Field (FEM-based thermal prediction)
  "wedm_thermal_field", "wedm_thermal_transient", "wedm_thermal_recast",
  "wedm_thermal_validate", "wedm_thermal_materials", "wedm_thermal_optimize",

  // WEDM-BIZ-MS0: Spark Erosion Physics (DiBitonto-Sato hybrid model)
  "wedm_spark_erosion", "wedm_spark_erosion_compare", "wedm_spark_erosion_validate", "wedm_spark_erosion_cut_time",

  // WEDM-BIZ-MS0: Gap Voltage Control (discharge probability, servo optimization)
  "wedm_gap_voltage", "wedm_gap_voltage_validate", "wedm_gap_voltage_optimize_servo",
  "wedm_gap_voltage_compare_dielectrics", "wedm_gap_voltage_list_dielectrics",

  // WEDM-BIZ-MS0: MRR Physics (Klocke empirical + thermal coupling)
  "wedm_mrr_calculate", "wedm_mrr_cut_time", "wedm_mrr_compare_materials",
  "wedm_mrr_optimize", "wedm_mrr_validate", "wedm_mrr_list_materials", "wedm_mrr_list_wires",

  // WEDM-BIZ-MS0: Wire Stress Analysis (mechanical fatigue + thermal stress)
  "wedm_wire_stress_analyze", "wedm_wire_stress_optimize_tension", "wedm_wire_stress_accumulate_damage",

  // WEDM-BIZ-MS0: Wire Tension Optimizer (geometry + material → optimal tension)
  "wedm_wire_tension_optimize", "wedm_wire_tension_compare_scenarios",
] as const;

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
          // WEDM-NEXT-MS0: ML Parameter Optimization (Bayesian)
          // =================================================================
          case "wedm_ml_optimize_init": {
            const engine = await getEngine("mlParamOptimizer");
            result = engine.initializeOptimization({
              material: params.material,
              thickness: params.thickness,
              objective: params.objective,
              bounds: params.bounds,
              priorObservations: params.prior_observations
            });
            break;
          }
          case "wedm_ml_optimize_observe": {
            const engine = await getEngine("mlParamOptimizer");
            result = engine.addObservation(params.session_id, params.observation);
            break;
          }
          case "wedm_ml_optimize_status": {
            const engine = await getEngine("mlParamOptimizer");
            result = engine.getSessionStatus(params.session_id);
            break;
          }
          case "wedm_ml_optimize_close": {
            const engine = await getEngine("mlParamOptimizer");
            result = { closed: engine.closeSession(params.session_id) };
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
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
