/**
 * prism_cam — CAM/Toolpath Dispatcher
 *
 * 55+ actions: toolpath_generate, toolpath_simulate, toolpath_optimize,
 *   post_process, collision_check_full, stock_update, tool_assembly,
 *   fixture_setup, nesting_optimize, clearance_plane,
 *   sequence_operations, linking_move, cam_strategy_recommend,
 *   cam_safety_validate, cam_multiaxis_recommend, cam_material_map,
 *   cam_cycle_catalog, lathe_post_process, probe_generate,
 *   subprogram_call, subprogram_pattern, cam_controller_catalog,
 *   cam_cycle_defaults, cam_thread_lookup, advanced_post_enhance,
 *   cam_translate, cam_compare_controllers, cam_material_recommend,
 *   cam_multicam_recommend, cam_multicam_list, cam_multicam_compare,
 *   cam_multicam_flagship, cam_ext_recommend, cam_ext_list, cam_ext_compare,
 *   cam_ext_flagship, cam_ext_search, post_feed_optimize, post_feed_analyze,
 *   gcode_transpile, gcode_transpile_dialects, gcode_transpile_cycles,
 *   stability_rpm_rewrite, stability_rpm_analyze
 *
 * Engine dependencies: CAMKernelEngine, ToolpathGenerationEngine,
 *   PostProcessorEngine, CollisionDetectionEngine, StockModelEngine,
 *   ToolAssemblyEngine, ModularFixtureLayoutEngine,
 *   HyperMillStrategyEngine, HyperMillSafetyHooks,
 *   LathePostProcessorEngine, ProbingCycleEngine, SubprogramEngine,
 *   PostProcessorFeedOptimizerEngine, InstantaneousEngagementEngine,
 *   MultiCAMPostEngine, ProductionToolpathEngine, PostProcessorAPIEngine,
 *   ScalableCAMOrchestratorEngine, UnifiedCAMPipelineEngine,
 *   SmartToolSelectorEngine, AdaptiveToolpathRouterEngine,
 *   CumulativeStockChainEngine, FeatureClusteringEngine, ProductionPackageEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_CAM_SCHEMAS } from "../../schemas/camActionSchemas.js";
import { ACTION_POST_PROCESSOR_EXT_SCHEMAS } from "../../schemas/postProcessorExtActionSchemas.js";
import { ACTION_ADVANCED_SCIENCE_SCHEMAS } from "../../schemas/advancedScienceActionSchemas.js";
import { ACTION_CNC_PROGRAMMING_SCHEMAS } from "../../schemas/cncProgrammingActionSchemas.js";
import { ACTION_CK_PIPELINE_SCHEMAS } from "../../schemas/ckPipelineActionSchemas.js";
const MERGED_CAM_SCHEMAS = { ...ACTION_CAM_SCHEMAS, ...ACTION_POST_PROCESSOR_EXT_SCHEMAS, ...ACTION_ADVANCED_SCIENCE_SCHEMAS, ...ACTION_CNC_PROGRAMMING_SCHEMAS, ...ACTION_CK_PIPELINE_SCHEMAS };
import { hookExecutor } from "../../engines/HookExecutor.js";

let _cam: any, _toolpath: any, _post: any, _collision: any, _stock: any, _toolAsm: any, _fixture: any, _hmStrategy: any, _hmSafety: any, _hmMultiAxis: any, _hmMaterialMap: any, _hmCycleCatalog: any, _hmController: any, _hmCycleDefaults: any, _hmThread: any, _lathePost: any, _probing: any, _subprogram: any, _nesting: any, _tpSim: any, _advPost: any, _portability: any, _multiCam: any, _feedOpt: any, _transpiler: any, _stabilityRPM: any, _probeGen: any, _cycleTimeEst: any, _gcodeSafety: any, _thermal: any, _energy: any, _kinematic: any, _setupSheet: any, _autoSF: any, _instEngage: any, _multiCamPost: any, _prodToolpath: any, _ppAPI: any, _scalableOrch: any, _unifiedPipe: any, _smartTool: any, _adaptRouter: any, _cumStock: any, _featCluster: any, _prodPackage: any, _edmAsm: any, _grindAsm: any, _laserAsm: any, _wjAsm: any, _multiProc: any, _millTurn: any, _selfLearn: any;
async function getEngine(name: string): Promise<any> {
  switch (name) {
    case "cam": return _cam ??= (await import("../../engines/CAMKernelEngine.js")).camKernelEngine;
    case "toolpath": return _toolpath ??= (await import("../../engines/ToolpathGenerationEngine.js")).toolpathGenerationEngine;
    case "post": return _post ??= (await import("../../engines/PostProcessorEngine.js")).postProcessorEngine;
    case "collision": return _collision ??= (await import("../../engines/CollisionDetectionEngine.js")).collisionDetectionEngine;
    case "stock": return _stock ??= (await import("../../engines/StockModelEngine.js")).stockModelEngine;
    case "toolasm": return _toolAsm ??= (await import("../../engines/ToolAssemblyEngine.js")).toolAssemblyEngine;
    case "fixture": return _fixture ??= (await import("../../engines/ModularFixtureLayoutEngine.js")).modularFixtureLayoutEngine;
    case "hmStrategy": return _hmStrategy ??= (await import("../../engines/HyperMillStrategyEngine.js")).hyperMillStrategyEngine;
    case "hmSafety": return _hmSafety ??= await import("../../engines/HyperMillSafetyHooks.js");
    case "hmMultiAxis": return _hmMultiAxis ??= (await import("../../engines/HyperMillMultiAxisEngine.js")).hyperMillMultiAxisEngine;
    case "hmMaterialMap": return _hmMaterialMap ??= (await import("../../engines/HyperMillMaterialMapEngine.js")).hyperMillMaterialMapEngine;
    case "hmCycleCatalog": return _hmCycleCatalog ??= (await import("../../engines/HyperMillCycleCatalogEngine.js")).hyperMillCycleCatalogEngine;
    case "lathePost": return _lathePost ??= (await import("../../engines/LathePostProcessorEngine.js")).lathePostProcessorEngine;
    case "probing": return _probing ??= (await import("../../engines/ProbingCycleEngine.js")).probingCycleEngine;
    case "subprogram": return _subprogram ??= (await import("../../engines/SubprogramEngine.js")).subprogramEngine;
    case "nesting": return _nesting ??= (await import("../../engines/NestingEngine.js")).nestingEngine;
    case "tpSim": return _tpSim ??= (await import("../../engines/ToolpathSimulationEngine.js")).toolpathSimulationEngine;
    case "hmController": return _hmController ??= (await import("../../engines/HyperMillControllerCatalogEngine.js")).hyperMillControllerCatalogEngine;
    case "hmCycleDefaults": return _hmCycleDefaults ??= (await import("../../engines/HyperMillCycleDefaultsEngine.js")).hyperMillCycleDefaultsEngine;
    case "hmThread": return _hmThread ??= (await import("../../engines/HyperMillThreadStandardEngine.js")).hyperMillThreadStandardEngine;
    case "advPost": return _advPost ??= new (await import("../../engines/AdvancedPostProcessorEngine.js")).AdvancedPostProcessorEngine();
    case "portability": return _portability ??= (await import("../../engines/CamKnowledgePortabilityEngine.js")).camKnowledgePortabilityEngine;
    case "multiCam": return _multiCam ??= (await import("../../engines/MultiCamStrategyEngine.js")).multiCamStrategyEngine;
    case "feedOpt": return _feedOpt ??= (await import("../../engines/PostProcessorFeedOptimizerEngine.js")).postProcessorFeedOptimizer;
    case "transpiler": return _transpiler ??= (await import("../../engines/GCodeTranspilerEngine.js")).gcodeTranspiler;
    case "stabilityRPM": return _stabilityRPM ??= (await import("../../engines/StabilityRPMRewriterEngine.js")).stabilityRPMRewriter;
    case "probeGen": return _probeGen ??= (await import("../../engines/ProbeRoutineGeneratorEngine.js")).probeRoutineGeneratorEngine;
    case "cycleTimeEst": return _cycleTimeEst ??= (await import("../../engines/CycleTimeEstimatorEngine.js")).cycleTimeEstimatorEngine;
    case "gcodeSafety": return _gcodeSafety ??= (await import("../../engines/GCodeSafetyAnalyzerEngine.js")).gcSafetyAnalyzer;
    case "thermal": return _thermal ??= (await import("../../engines/ToolpathThermalEngine.js")).toolpathThermalEngine;
    case "energy": return _energy ??= (await import("../../engines/GCodeEnergyOptimizerEngine.js")).gcodeEnergyOptimizerEngine;
    case "kinematic": return _kinematic ??= (await import("../../engines/MultiAxisKinematicEngine.js")).multiAxisKinematicEngine;
    case "setupSheet": return _setupSheet ??= (await import("../../engines/SetupSheetFromGCodeEngine.js")).setupSheetFromGCodeEngine;
    case "autoSF": return _autoSF ??= (await import("../../engines/AutoSpeedFeedEngine.js")).autoSpeedFeedEngine;
    case "pipeline": return (await import("../../engines/GCodeIntelligencePipelineEngine.js")).gcodeIntelligencePipeline;
    case "machineMatcher": return (await import("../../engines/MachineMatcherEngine.js")).machineMatcherEngine;
    case "wearComp": return (await import("../../engines/ToolWearCompensationEngine.js")).toolWearCompensationEngine;
    case "mfgStats": return (await import("../../engines/ManufacturingStatisticsEngine.js")).manufacturingStatisticsEngine;
    case "cuttingMath": return (await import("../../engines/AdvancedCuttingMathEngine.js")).advancedCuttingMathEngine;
    case "cuttingPhysics": return (await import("../../engines/AdvancedCuttingPhysicsEngine.js")).advancedCuttingPhysicsEngine;
    case "reliability": return (await import("../../engines/ReliabilityEngineeringEngine.js")).reliabilityEngineeringEngine;
    case "machineAccuracy": return (await import("../../engines/MachineGeometricAccuracyEngine.js")).machineGeometricAccuracyEngine;
    case "spm": return (await import("../../engines/StatisticalProcessMonitoringEngine.js")).statisticalProcessMonitoringEngine;
    case "constitutive": return (await import("../../engines/ConstitutiveModelEngine.js")).constitutiveModelEngine;
    case "wearPhysics": return (await import("../../engines/AdvancedWearPhysicsEngine.js")).advancedWearPhysicsEngine;
    case "susLCA": return (await import("../../engines/SustainabilityLCAEngine.js")).sustainabilityLCAEngine;
    case "coolant": return (await import("../../engines/CoolantDynamicsEngine.js")).coolantDynamicsEngine;
    case "assembler": return (await import("../../engines/CNCProgramAssemblerEngine.js")).cncProgramAssemblerEngine;
    case "motionDyn": return (await import("../../engines/MotionDynamicsProfileEngine.js")).motionDynamicsProfileEngine;
    case "engageAdapt": return (await import("../../engines/EngagementAdaptiveFeedEngine.js")).engagementAdaptiveFeedEngine;
    case "postPipeline": return (await import("../../engines/PostProcessorPipelineEngine.js")).postProcessorPipelineEngine;
    case "controllerDialect": return (await import("../../engines/ControllerDialectEngine.js")).controllerDialectEngine;
    case "fiveAxis": return (await import("../../engines/FiveAxisPostEngine.js")).fiveAxisPostEngine;
    case "ppVerify": return (await import("../../engines/PostProcessorVerificationEngine.js")).postProcessorVerificationEngine;
    case "instEngage": return _instEngage ??= (await import("../../engines/InstantaneousEngagementEngine.js")).instantaneousEngagementEngine;
    case "multiCamPost": return _multiCamPost ??= (await import("../../engines/MultiCAMPostEngine.js")).multiCAMPostEngine;
    case "prodToolpath": return _prodToolpath ??= (await import("../../engines/ProductionToolpathEngine.js")).productionToolpathEngine;
    case "ppAPI": return _ppAPI ??= (await import("../../engines/PostProcessorAPIEngine.js")).postProcessorAPIEngine;
    case "scalableOrch": return _scalableOrch ??= (await import("../../engines/ScalableCAMOrchestratorEngine.js")).scalableCAMOrchestratorEngine;
    case "unifiedPipe": return _unifiedPipe ??= (await import("../../engines/UnifiedCAMPipelineEngine.js")).unifiedCAMPipelineEngine;
    case "smartTool": return _smartTool ??= (await import("../../engines/SmartToolSelectorEngine.js")).smartToolSelectorEngine;
    case "adaptRouter": return _adaptRouter ??= (await import("../../engines/AdaptiveToolpathRouterEngine.js")).adaptiveToolpathRouterEngine;
    case "cumStock": return _cumStock ??= (await import("../../engines/CumulativeStockChainEngine.js")).cumulativeStockChainEngine;
    case "featCluster": return _featCluster ??= (await import("../../engines/FeatureClusteringEngine.js")).featureClusteringEngine;
    case "prodPackage": return _prodPackage ??= (await import("../../engines/ProductionPackageEngine.js")).productionPackageEngine;
    case "fiveAxisInteg": return (await import("../../engines/FiveAxisToolpathIntegrationEngine.js")).fiveAxisToolpathIntegrationEngine;
    case "camOrch": return (await import("../../engines/CAMKernelOrchestratorEngine.js")).camKernelOrchestratorEngine;
    case "edmAsm": return _edmAsm ??= new (await import("../../engines/EDMProgramAssemblerEngine.js")).EDMProgramAssemblerEngine();
    case "grindAsm": return _grindAsm ??= new (await import("../../engines/GrindingProgramAssemblerEngine.js")).GrindingProgramAssemblerEngine();
    case "laserAsm": return _laserAsm ??= new (await import("../../engines/LaserProgramAssemblerEngine.js")).LaserProgramAssemblerEngine();
    case "wjAsm": return _wjAsm ??= new (await import("../../engines/WaterjetProgramAssemblerEngine.js")).WaterjetProgramAssemblerEngine();
    case "multiProc": return _multiProc ??= new (await import("../../engines/MultiProcessCAMRouterEngine.js")).MultiProcessCAMRouterEngine();
    case "millTurn": return _millTurn ??= (await import("../../engines/MillTurnSwissPipelineEngine.js")).millTurnSwissPipelineEngine;
    case "selfLearn": return _selfLearn ??= (await import("../../engines/SelfLearningCAMEngine.js")).selfLearningCAMEngine;
    default: throw new Error(`Unknown CAM engine: ${name}`);
  }
}

const ACTIONS = [
  "toolpath_generate", "toolpath_simulate", "toolpath_optimize",
  "post_process", "collision_check_full", "stock_update",
  "tool_assembly", "fixture_setup", "nesting_optimize",
  "clearance_plane", "sequence_operations", "linking_move",
  "cam_strategy_recommend", "cam_safety_validate",
  "cam_multiaxis_recommend", "cam_material_map",
  "cam_cycle_catalog",
  "lathe_post_process", "probe_generate",
  "subprogram_call", "subprogram_pattern",
  "cam_controller_catalog",
  "cam_cycle_defaults",
  "cam_thread_lookup",
  "advanced_post_enhance",
  "cam_translate",
  "cam_compare_controllers",
  "cam_material_recommend",
  "cam_multicam_recommend",
  "cam_multicam_list",
  "cam_multicam_compare",
  "cam_multicam_flagship",
  "cam_ext_recommend",
  "cam_ext_list",
  "cam_ext_compare",
  "cam_ext_flagship",
  "cam_ext_search",
  "post_feed_optimize",
  "post_feed_analyze",
  "gcode_transpile",
  "gcode_transpile_dialects",
  "gcode_transpile_cycles",
  "stability_rpm_rewrite",
  "stability_rpm_analyze",
  "auto_speed_feed_optimize", "auto_speed_feed_analyze", "auto_speed_feed_batch",
  "gcode_intelligence_pipeline",
  "pp_run_full", "pp_run_partial", "pp_analyze", "pp_reoptimize", "pp_resolve_context",
  "dialect_list", "dialect_translate", "dialect_features",
  "five_axis_tcpc", "five_axis_singularity", "five_axis_linearize",
  "pp_verify", "pp_backplot",
  "machine_match", "machine_quick_match",
  "wear_compensate", "wear_analyze",
  "stats_process_capability", "stats_spc_chart", "stats_weibull",
  "stats_monte_carlo_tolerance", "stats_anova", "stats_regression",
  "stats_oee", "stats_gage_rr",
  "math_chip_mechanics", "math_thermal_models", "math_wear_models",
  "math_surface_integrity", "math_timoshenko_deflection",
  "math_taguchi", "math_topsis", "math_desirability",
  "cross_cam_recommend",
  "cross_cam_synthesize",
  // Post-processor innovations (7 engines, 21 actions)
  "probe_wcs_setup",
  "probe_inspection",
  "probe_tool_measure",
  "probe_first_article",
  "cycle_time_estimate",
  "cycle_time_compare",
  "cycle_time_bottlenecks",
  "gcode_safety_analyze",
  "gcode_safety_fix",
  "thermal_analyze",
  "thermal_distortion",
  "thermal_optimize",
  "energy_analyze",
  "energy_optimize",
  "kinematic_singularity",
  "kinematic_transform",
  "kinematic_optimize",
  "kinematic_reachability",
  "setup_sheet_generate",
  "setup_sheet_tools",
  "setup_sheet_operations",
  // Advanced Science (58 actions — 8 engines)
  "sci_oxley", "sci_oblique", "sci_size_effect", "sci_recht_shear", "sci_chip_breaking", "sci_process_damping",
  "rel_cox_hazards", "rel_competing_risks", "rel_wiener_rul", "rel_gamma_degradation",
  "rel_bayesian_rul", "rel_optimal_replacement", "rel_delay_time", "rel_renewal_theory",
  "acc_21_error_model", "acc_abbe_offset", "acc_volumetric", "acc_ball_bar", "acc_thermal_error",
  "spm_hotelling_t2", "spm_pca_monitoring", "spm_hmm_condition", "spm_bootstrap_ci", "spm_sprt",
  "spm_combined_spc", "spm_doe_generate", "spm_rsm", "spm_nbi_optimization",
  "const_zerilli_armstrong", "const_mts", "const_voce", "const_ptw",
  "const_paris_law", "const_norton_creep", "const_larson_miller", "const_hollomon", "const_machinability",
  "wear_stochastic", "wear_fick_crater", "wear_notch", "wear_lognormal_life",
  "wear_rabinowicz", "wear_flank_ode", "wear_combined_mechanisms",
  "sus_lifecycle_assessment", "sus_eco_efficiency", "sus_exergy", "sus_gutowski_energy",
  "sus_coolant_lifecycle", "sus_stochastic_economics", "sus_total_cost_ownership",
  "cool_reynolds_flow", "cool_tsc_pressure", "cool_mql_spray", "cool_jet_coherence",
  "cool_chip_transport", "cool_komanduri_thermal", "cool_cryogenic",
  // CNC Programming (17 actions — 3 engines)
  "program_assemble", "program_batch_sf", "program_cycle_time",
  "motion_trapezoidal", "motion_scurve", "motion_corner_velocity", "motion_look_ahead",
  "motion_axis_decompose", "motion_feed_effectiveness", "motion_optimize_feed",
  "engage_adapt_feed", "engage_calc_engagement", "engage_chip_thinning",
  "engage_constant_force", "engage_constant_mrr", "engage_thermal_balance", "engage_ramp_transition", "master_post_process",
  "cnc_simulate", "cnc_simulate_report", "cnc_simulate_physics", "cnc_simulate_predictive",
  // Orphan CAM engines (11 engines, 30 actions)
  "instantaneous_engagement_analyze", "instantaneous_engagement_optimal_sf",
  "multi_cam_post_list", "multi_cam_post_scaffold", "multi_cam_post_sequence", "multi_cam_post_millturn", "multi_cam_post_phase_b",
  "production_toolpath_generate", "production_toolpath_gcode", "production_toolpath_cost", "production_toolpath_chatter_rpm",
  "pp_api_start", "pp_api_stop", "pp_api_status",
  "scalable_cam_orchestrate",
  "unified_cam_pipeline",
  "smart_tool_select",
  "adaptive_toolpath_route", "adaptive_toolpath_list_algorithms",
  "cumulative_stock_chain",
  "feature_clustering_cluster",
  "production_package_assemble",
  "five_axis_contour", "five_axis_port", "five_axis_singularity_manage",
  "five_axis_collision_avoid", "five_axis_roughing",
  // CK-MS7 — CAM Kernel Orchestrator (3 actions)
  "cam_generate", "cam_turn", "cam_simulate",
  // PIPE-MS0 — Print-to-Program Pipeline (3 actions)
  "print_to_program_full", "print_to_program_plan", "print_to_program_validate",
  // CK Pipeline (7 engines, 36 actions)
  // EDM
  "edm_wire_program", "edm_sinker_program", "edm_micro_program", "edm_cycle_time", "edm_uncertainty",
  // Grinding
  "grind_surface_program", "grind_cylindrical_program", "grind_centerless_program", "grind_creepfeed_program", "grind_uncertainty",
  // Laser
  "laser_cut_program", "laser_mark_program", "laser_weld_program", "laser_drill_program", "laser_uncertainty",
  // Waterjet
  "waterjet_abrasive_program", "waterjet_pure_program", "waterjet_taper_program", "waterjet_depth_program", "waterjet_uncertainty",
  // Multi-process
  "multi_process_route", "multi_process_analyze", "multi_process_sequence",
  "multi_process_cost", "multi_process_alternatives", "multi_process_consolidate",
  // Mill-turn / Swiss
  "mill_turn_live_tooling", "mill_turn_sub_spindle", "mill_turn_multi_channel", "mill_turn_bar_feeder", "mill_turn_swiss",
  // Self-learning
  "self_learn_record", "self_learn_twin_sync", "self_learn_rank_strategy", "self_learn_anomaly", "self_learn_fleet",
  // CAM Kernel Unified (CK Track)
  "cam_unified_generate", "cam_complex_generate", "cam_production_toolpath",
  "cam_multi_process", "cam_mill_turn", "cam_5axis_convert",
  "cam_advanced_strategy", "cam_smart_tool", "cam_verify",
  "cam_chatter_rpm", "cam_cost_feature",
  "cam_intelligent_sequence", "cam_list_actions",
] as const;

/** Registers cam dispatcher.
 * @param server - MCP server instance
  * @returns void
 */
export function registerCamDispatcher(server: any): void {
  server.tool(
    "prism_cam",
    `CAM/Toolpath dispatcher — toolpath generation, simulation, optimization, post-processing, collision detection, fixturing.
Actions: ${ACTIONS.join(", ")}.
Params vary by action — pass relevant fields in params object.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: typeof ACTIONS[number]; params?: Record<string, any> }) => {
      log.info(`[prism_cam] Action: ${action}`);
      let result: any;
      try {
        // H1-MS2: Auto-normalize snake_case → camelCase params
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch { /* normalizer not available */ }

        // Zod schema validation
        const validation = validateActionParams(action, params, MERGED_CAM_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_cam",
          );
        }

        // PRE-TOOLPATH SAFETY HOOKS — collision detection, G-code safety, toolpath safety
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "camDispatcher", action, params }
        };
        const preResult = await hookExecutor.execute("pre-toolpath", hookCtx);
        if (preResult.blocked) {
          return {
            content: [{ type: "text", text: JSON.stringify({
              blocked: true, blocker: preResult.blockedBy,
              reason: preResult.summary, action,
            }) }]
          };
        }

        switch (action) {
          case "toolpath_generate": {
            const engine = await getEngine("toolpath");
            result = engine.generate?.(params) ?? engine.compute?.(params) ?? { toolpath: "generated", params };
            break;
          }
          case "toolpath_simulate": {
            const engine = await getEngine("tpSim");
            result = engine.simulate(params.moves ?? [], {
              feed_rate_mmmin: params.feed_rate_mmmin ?? 1000,
              rapid_rate_mmmin: params.rapid_rate_mmmin ?? 10000,
              tool_diameter: params.tool_diameter,
              stock_bounds: params.stock_bounds,
              fixture_bounds: params.fixture_bounds,
            });
            break;
          }
          case "toolpath_optimize": {
            const engine = await getEngine("toolpath");
            result = engine.optimize?.(params) ?? { optimized: true, params };
            break;
          }
          case "post_process": {
            const engine = await getEngine("post");
            result = engine.process?.(params) ?? engine.compute?.(params) ?? { post_processed: true, controller: params.controller };
            break;
          }
          case "collision_check_full": {
            const engine = await getEngine("collision");
            result = engine.checkFull(
              params.bodies ?? [],
              params.moves ?? [],
              params.safety_margin_mm ?? 2,
            );
            break;
          }
          case "stock_update": {
            const engine = await getEngine("stock");
            if (params.create) {
              result = engine.create(params.stock ?? params, params.part_volume_mm3 ?? 0);
            } else if (params.analyze) {
              result = engine.analyze(params.stock_id, params.material ?? "steel", params.cost_per_kg ?? 5);
            } else {
              result = engine.removeVolume(params.stock_id, {
                operation_id: params.operation_id ?? "op-1",
                operation_type: params.operation_type ?? "roughing",
                volume_removed_mm3: params.volume_removed_mm3 ?? 0,
                tool_used: params.tool_used ?? "unknown",
                time_sec: params.time_sec ?? 0,
              }) ?? { error: `Stock not found: ${params.stock_id}` };
            }
            break;
          }
          case "tool_assembly": {
            const engine = await getEngine("toolasm");
            result = engine.assemble?.(params) ?? engine.compute?.(params) ?? { assembly: params };
            break;
          }
          case "fixture_setup": {
            const engine = await getEngine("fixture");
            result = engine.layout?.(params) ?? { fixture: params };
            break;
          }
          case "nesting_optimize": {
            const engine = await getEngine("nesting");
            if (params.compare_stock) {
              result = engine.compareStock(params.parts ?? [], params.stocks ?? []);
            } else {
              result = engine.nest(
                params.parts ?? [],
                params.stock ?? { width_mm: 1220, height_mm: 2440, thickness_mm: 6, material: "steel" },
                params.kerf_mm ?? 3,
              );
            }
            break;
          }
          case "clearance_plane": {
            const engine = await getEngine("cam");
            result = engine.computeClearancePlane(
              params.stockTopZ ?? 0,
              params.fixtureTopZ ?? 0,
              params.workpieceTopZ ?? 0,
              params.marginMm ?? 5,
            );
            break;
          }
          case "sequence_operations": {
            const engine = await getEngine("cam");
            result = engine.sequenceOperations(
              params.operations ?? [],
            );
            break;
          }
          case "linking_move": {
            const engine = await getEngine("cam");
            result = engine.generateLinkingMove(
              params.fromPos ?? { x: 0, y: 0, z: 0 },
              params.toPos ?? { x: 0, y: 0, z: 0 },
              params.config ?? {
                globalClearanceZ: 50,
                linkingMode: "z_clearance",
                minClearanceMm: 5,
              },
            );
            break;
          }
          case "cam_strategy_recommend": {
            const engine = await getEngine("hmStrategy");
            result = engine.recommend(params) ?? { error: "HyperMillStrategyEngine.recommend returned null" };
            break;
          }
          case "cam_multiaxis_recommend": {
            const hmMA = await getEngine("hmMultiAxis");
            if (params.list) {
              result = hmMA.listStrategies();
            } else if (params.defaults) {
              result = hmMA.getDefaults(params.domain ?? "milling");
            } else if (!params.geometry || !params.goal) {
              result = { error: "cam_multiaxis_recommend requires 'geometry' and 'goal' params (or 'list'/'defaults' flags)" };
            } else {
              result = hmMA.calculate(params);
            }
            break;
          }
          case "cam_material_map": {
            const hmMat = await getEngine("hmMaterialMap");
            if (params.quality_id) {
              result = hmMat.lookupByQualityId(params.quality_id) ?? { error: `No material found for quality_id: ${params.quality_id}` };
            } else if (params.search) {
              result = hmMat.searchByName(params.search);
            } else if (params.iso_group) {
              result = hmMat.getByIsoGroup(params.iso_group);
            } else if (params.list_groups) {
              result = hmMat.listGroups();
            } else if (params.list_cutters) {
              result = hmMat.listCutterMaterials();
            } else {
              result = {
                groups: hmMat.listGroups(),
                totalQualities: hmMat.totalQualities(),
                cutterMaterials: hmMat.listCutterMaterials(),
              };
            }
            break;
          }
          case "cam_cycle_catalog": {
            const hmCC = await getEngine("hmCycleCatalog");
            if (params.search) {
              result = hmCC.search(params.search);
            } else if (params.category) {
              result = hmCC.byCategory(params.category);
            } else if (params.code) {
              result = hmCC.lookupByCode(params.code)
                ?? { error: `No cycle found for code: ${params.code}` };
            } else if (params.stats) {
              result = hmCC.stats();
            } else {
              result = hmCC.stats();
            }
            break;
          }
          case "cam_safety_validate": {
            const hmSafety = await getEngine("hmSafety");
            const validations = [
              params.clearance_plane ? hmSafety.validateClearancePlane(params) : null,
              params.allowance != null ? hmSafety.validateNegativeAllowance(params) : null,
              params.geometry_check != null ? hmSafety.validateGeometryCheckEnabled(params) : null,
              params.measurement_system ? hmSafety.validateMeasurementSystem(params) : null,
              params.insert_type ? hmSafety.validateTurningHPM(params) : null,
              params.rest_material ? hmSafety.validateRestMaterialToolChange(params) : null,
            ].filter(Boolean);
            const blocked = validations.filter((v: any) => v?.severity === "BLOCK");
            result = {
              validations,
              safe: blocked.length === 0,
              blocked_count: blocked.length,
              warning_count: validations.length - blocked.length,
            };
            break;
          }
          case "lathe_post_process": {
            const lp = await getEngine("lathePost");
            result = lp.process(params.input ?? params, params.config ?? params);
            break;
          }
          case "probe_generate": {
            const pr = await getEngine("probing");
            result = pr.generate(params, params.config ?? {
              controller: params.controller ?? "renishaw_haas",
              probe_tool_number: params.probe_tool_number ?? 99,
              feed_rate: params.feed_rate ?? 500,
              retract_distance: params.retract_distance ?? 2,
              overtravel: params.overtravel ?? 10,
              work_offset_to_set: params.work_offset_to_set,
              print_result: params.print_result ?? true,
            });
            break;
          }
          case "subprogram_call": {
            const sub = await getEngine("subprogram");
            result = sub.generateCall(
              { program_number: params.program_number ?? 1000,
                repeat_count: params.repeat_count,
                arguments: params.arguments },
              params.controller ?? "fanuc"
            );
            break;
          }
          case "subprogram_pattern": {
            const sub = await getEngine("subprogram");
            result = sub.generatePatternRepeat(
              { subprogram_number: params.subprogram_number ?? 1000,
                positions: params.positions ?? [],
                return_to_zero: params.return_to_zero ?? true },
              params.controller ?? "fanuc"
            );
            break;
          }
          case "cam_cycle_defaults": {
            const hmCD = await getEngine("hmCycleDefaults");
            if (params.code) {
              if (params.resolve) {
                result = hmCD.resolveDefaults(params.code, {
                  toolDiameter: params.tool_diameter,
                  toolRadius: params.tool_radius,
                  toolCornerRadius: params.tool_corner_radius,
                  machineTolerance: params.machine_tolerance,
                  jobFeed: params.job_feed,
                }) ?? { error: `No cycle found: ${params.code}` };
              } else {
                result = hmCD.getByCode(params.code)
                  ?? { error: `No cycle found: ${params.code}` };
              }
            } else if (params.search) {
              result = hmCD.search(params.search);
            } else if (params.category) {
              result = hmCD.byCategory(params.category);
            } else if (params.formulas) {
              result = hmCD.withFormulas();
            } else if (params.stats) {
              result = hmCD.stats();
            } else {
              result = hmCD.listAll();
            }
            break;
          }
          case "cam_thread_lookup": {
            const hmTh = await getEngine("hmThread");
            if (params.search) {
              result = hmTh.search(params.search);
            } else if (params.size) {
              result = hmTh.findBySize(params.size, params.pitch);
            } else if (params.tap_drill) {
              const drill = hmTh.getTapDrill(params.tap_drill);
              result = drill != null
                ? { designation: params.tap_drill, tapDrill: drill }
                : { error: `No thread found: ${params.tap_drill}` };
            } else if (params.minor_dia) {
              const dia = hmTh.getMinorDia(params.minor_dia);
              result = dia != null
                ? { designation: params.minor_dia, minorDia: dia }
                : { error: `No thread found: ${params.minor_dia}` };
            } else if (params.standard) {
              result = hmTh.getStandard(params.standard)
                ?? { error: `No standard found: ${params.standard}` };
            } else if (params.stats) {
              result = hmTh.stats();
            } else {
              result = hmTh.listStandards();
            }
            break;
          }
          case "cam_controller_catalog": {
            const hmCtrl = await getEngine("hmController");
            if (params.search) {
              result = hmCtrl.search(params.search);
            } else if (params.family) {
              result = hmCtrl.getFamily(params.family)
                ?? { error: `No controller family found: ${params.family}` };
            } else if (params.axis_count) {
              result = hmCtrl.byAxisCount(params.axis_count);
            } else if (params.capability) {
              result = hmCtrl.byCapability(params.capability);
            } else if (params.dialect) {
              result = hmCtrl.getDialect(params.dialect)
                ?? { error: `No dialect found: ${params.dialect}` };
            } else if (params.stats) {
              result = hmCtrl.stats();
            } else {
              result = hmCtrl.listFamilies();
            }
            break;
          }
          case "advanced_post_enhance": {
            const advPost = await getEngine("advPost");
            result = advPost.enhance({
              controller: params.controller ?? "fanuc",
              gcode: params.gcode ?? "",
              adaptive_clearing: params.adaptive_clearing,
              hsm: params.hsm,
              tool_management: params.tool_management,
              in_process_measure: params.in_process_measure,
              feed_optimization: params.feed_optimization,
              multi_axis: params.multi_axis,
            });
            break;
          }
          case "cam_translate": {
            const port = await getEngine("portability");
            if (params.list_intents) {
              result = port.listIntents();
            } else if (params.list_controllers) {
              result = port.listControllers();
            } else if (params.controller_features) {
              result = port.controllerFeatures(params.controller_features);
            } else if (params.stats) {
              result = port.stats();
            } else {
              result = port.translate({
                intent: params.intent ?? "rough_3d",
                material: params.material ?? { name: params.material_name ?? "1045 Steel" },
                tool: params.tool ?? { diameter: params.tool_diameter ?? 10 },
                machine: params.machine ?? { controller: params.controller ?? "fanuc", axis_count: params.axis_count },
                tolerance: params.tolerance,
                allowance: params.allowance,
                depth: params.depth,
                width: params.width,
                source_cam: params.source_cam,
                enhance: params.enhance,
              });
            }
            break;
          }
          case "cam_compare_controllers": {
            const port = await getEngine("portability");
            result = port.compareControllers({
              intent: params.intent ?? "rough_3d",
              material: params.material ?? { name: params.material_name ?? "1045 Steel" },
              tool: params.tool ?? { diameter: params.tool_diameter ?? 10 },
              tolerance: params.tolerance,
              axis_count: params.axis_count,
              source_cam: params.source_cam,
            });
            break;
          }
          case "cam_material_recommend": {
            const port = await getEngine("portability");
            result = port.materialRecommendation(
              params.material ?? { name: params.material_name ?? "1045 Steel", iso_group: params.iso_group, hardness_hrc: params.hardness_hrc }
            );
            break;
          }
          case "cam_multicam_recommend": {
            const mc = await getEngine("multiCam");
            result = mc.recommend({
              camSystem: params.cam_system ?? params.camSystem,
              geometryType: params.geometry_type ?? params.geometryType,
              operationGoal: params.operation_goal ?? params.operationGoal,
              materialGroup: params.material_group ?? params.materialGroup,
              toolDiameterMm: params.tool_diameter_mm ?? params.toolDiameterMm,
              wallAngleDeg: params.wall_angle_deg ?? params.wallAngleDeg,
              hasPreviousRoughing: params.has_previous_roughing ?? params.hasPreviousRoughing,
              axisCount: params.axis_count ?? params.axisCount,
            });
            break;
          }
          case "cam_multicam_list": {
            const mc = await getEngine("multiCam");
            if (params.cam_system ?? params.camSystem) {
              result = mc.listStrategies(params.cam_system ?? params.camSystem);
            } else {
              result = { systems: mc.listSystems(), stats: mc.stats() };
            }
            break;
          }
          case "cam_multicam_compare": {
            const mc = await getEngine("multiCam");
            result = mc.compareAcrossSystems(
              params.geometry_type ?? params.geometryType,
              params.operation_goal ?? params.operationGoal
            );
            break;
          }
          case "cam_multicam_flagship": {
            const mc = await getEngine("multiCam");
            const sys = params.cam_system ?? params.camSystem;
            if (sys) {
              result = mc.getFlagship(sys);
            } else {
              const all: Record<string, any> = {};
              for (const s of mc.listSystems()) { all[s] = mc.getFlagship(s); }
              result = all;
            }
            break;
          }
          // ── Extended Multi-CAM (13 additional CAM systems) ──────────
          case "cam_ext_recommend": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            result = mce.recommend({
              camSystem: params.cam_system ?? params.camSystem,
              geometryType: params.geometry_type ?? params.geometryType,
              operationGoal: params.operation_goal ?? params.operationGoal,
              materialGroup: params.material_group ?? params.materialGroup,
              toolDiameterMm: params.tool_diameter_mm ?? params.toolDiameterMm,
              wallAngleDeg: params.wall_angle_deg ?? params.wallAngleDeg,
              hasPreviousRoughing: params.has_previous_roughing ?? params.hasPreviousRoughing,
              axisCount: params.axis_count ?? params.axisCount,
            });
            break;
          }
          case "cam_ext_list": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            if (params.cam_system ?? params.camSystem) {
              result = mce.listStrategies(params.cam_system ?? params.camSystem);
            } else {
              result = { systems: mce.listSystems(), stats: mce.stats() };
            }
            break;
          }
          case "cam_ext_compare": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            result = mce.compareAcrossSystems(
              params.geometry_type ?? params.geometryType,
              params.operation_goal ?? params.operationGoal
            );
            break;
          }
          case "cam_ext_flagship": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            const sys = params.cam_system ?? params.camSystem;
            if (sys) {
              result = mce.getFlagship(sys);
            } else {
              const all: Record<string, any> = {};
              for (const s of mce.listSystems()) { all[s] = mce.getFlagship(s); }
              result = all;
            }
            break;
          }
          case "cam_ext_search": {
            const { multiCamStrategyEngineExt: mce } = await import("../../engines/MultiCamStrategyEngineExt.js");
            result = mce.search(params.query ?? params.q ?? "", params.limit ?? 20);
            break;
          }
          case "post_feed_optimize": {
            const fo = await getEngine("feedOpt");
            result = fo.optimize(params.gcode, {
              toolDiameter_mm: params.tool_diameter_mm ?? params.toolDiameter_mm,
              toolFlutes: params.tool_flutes ?? params.toolFlutes,
              radialDepth_mm: params.radial_depth_mm ?? params.radialDepth_mm,
              axialDepth_mm: params.axial_depth_mm ?? params.axialDepth_mm,
              material: params.material,
              spindleRPM: params.spindle_rpm ?? params.spindleRPM,
              nominalFeed_mmmin: params.nominal_feed_mmmin ?? params.nominalFeed_mmmin,
              cornerSlowdownFactor: params.corner_slowdown_factor,
              plungeRateFactor: params.plunge_rate_factor,
              arcMinRadius_mm: params.arc_min_radius_mm,
              maxFeedIncrease: params.max_feed_increase,
              enableChipThinning: params.enable_chip_thinning,
              enableCornerDecel: params.enable_corner_decel,
              enableArcLimiting: params.enable_arc_limiting,
              enablePlungeLimiting: params.enable_plunge_limiting,
              enableStabilityCheck: params.enable_stability_check,
              stabilityMaxDoc_mm: params.stability_max_doc_mm,
            });
            break;
          }
          case "post_feed_analyze": {
            const fo = await getEngine("feedOpt");
            result = fo.analyze(params.gcode, {
              toolDiameter_mm: params.tool_diameter_mm ?? params.toolDiameter_mm,
              toolFlutes: params.tool_flutes ?? params.toolFlutes,
              radialDepth_mm: params.radial_depth_mm ?? params.radialDepth_mm,
              axialDepth_mm: params.axial_depth_mm ?? params.axialDepth_mm,
              material: params.material,
              spindleRPM: params.spindle_rpm ?? params.spindleRPM,
              nominalFeed_mmmin: params.nominal_feed_mmmin ?? params.nominalFeed_mmmin,
              cornerSlowdownFactor: params.corner_slowdown_factor,
              plungeRateFactor: params.plunge_rate_factor,
              arcMinRadius_mm: params.arc_min_radius_mm,
              maxFeedIncrease: params.max_feed_increase,
              enableChipThinning: params.enable_chip_thinning,
              enableCornerDecel: params.enable_corner_decel,
              enableArcLimiting: params.enable_arc_limiting,
              enablePlungeLimiting: params.enable_plunge_limiting,
              enableStabilityCheck: params.enable_stability_check,
              stabilityMaxDoc_mm: params.stability_max_doc_mm,
            });
            break;
          }
          case "gcode_transpile": {
            const tr = await getEngine("transpiler");
            result = tr.transpile(params.gcode, {
              source: params.source ?? params.source_dialect,
              target: params.target ?? params.target_dialect,
              preserveComments: params.preserve_comments,
              addTranslationNotes: params.add_translation_notes,
              safeStartBlock: params.safe_start_block,
              convertCycles: params.convert_cycles,
              convertWorkOffsets: params.convert_work_offsets,
            });
            break;
          }
          case "gcode_transpile_dialects": {
            const tr = await getEngine("transpiler");
            result = tr.listDialects();
            break;
          }
          case "gcode_transpile_cycles": {
            const tr = await getEngine("transpiler");
            result = tr.listCycleTranslations();
            break;
          }
          case "stability_rpm_rewrite": {
            const sr = await getEngine("stabilityRPM");
            result = sr.rewrite(params.gcode, {
              lobes: params.lobes ?? params.sld_lobes,
              toolFlutes: params.tool_flutes ?? params.toolFlutes,
              currentDoc_mm: params.current_doc_mm ?? params.axial_depth_mm,
              rpmSearchRange: params.rpm_search_range,
              preferHigherRPM: params.prefer_higher_rpm,
              minRPM: params.min_rpm,
              maxRPM: params.max_rpm,
              feedPerTooth_mm: params.feed_per_tooth_mm,
            });
            break;
          }
          case "stability_rpm_analyze": {
            const sr = await getEngine("stabilityRPM");
            result = sr.analyzeChatterRisk(params.gcode, {
              lobes: params.lobes ?? params.sld_lobes,
              toolFlutes: params.tool_flutes ?? params.toolFlutes,
              currentDoc_mm: params.current_doc_mm ?? params.axial_depth_mm,
              rpmSearchRange: params.rpm_search_range,
              preferHigherRPM: params.prefer_higher_rpm,
              minRPM: params.min_rpm,
              maxRPM: params.max_rpm,
              feedPerTooth_mm: params.feed_per_tooth_mm,
            });
            break;
          }
          case "cross_cam_recommend": {
            const { crossCamRecommenderEngine } = await import("../../engines/CrossCamRecommenderEngine.js");
            const ccResult = crossCamRecommenderEngine.compute({
              geometry: { type: params.geometry_type || "pocket_2d",
                dimensions_mm: params.dimensions_mm || { length: 100, width: 80, depth: 30 },
                corner_radius_mm: params.corner_radius_mm },
              material: { class: params.material_class || "steel_4140",
                iso_group: params.iso_group || "P", hardness_hrc: params.hardness_hrc },
              machine: { spindle_power_kw: params.spindle_power_kw || 15,
                max_rpm: params.max_rpm || 10000, axis_count: params.axis_count || 3,
                controller: params.controller },
              tool: { diameter_mm: params.tool_diameter_mm || 10,
                flute_count: params.flute_count || 4,
                material: params.tool_material || "carbide",
                overhang_mm: params.overhang_mm || 40 },
              constraints: { priority: params.priority || "balanced",
                max_cycle_time_min: params.max_cycle_time_min,
                max_surface_roughness_um: params.max_surface_roughness_um },
              available_cam_systems: params.cam_systems,
            });
            result = ccResult;
            break;
          }
          case "cross_cam_synthesize": {
            const { crossCamRecommenderEngine: sEng } = await import("../../engines/CrossCamRecommenderEngine.js");
            const sr = sEng.compute({
              geometry: { type: params.geometry_type || "pocket_3d",
                dimensions_mm: params.dimensions_mm || { length: 150, width: 100, depth: 50 },
                corner_radius_mm: params.corner_radius_mm || 3 },
              material: { class: params.material_class || "aluminum_6061",
                iso_group: params.iso_group || "N" },
              machine: { spindle_power_kw: params.spindle_power_kw || 15,
                max_rpm: params.max_rpm || 12000, axis_count: params.axis_count || 3 },
              tool: { diameter_mm: params.tool_diameter_mm || 12,
                flute_count: params.flute_count || 3,
                material: params.tool_material || "carbide",
                overhang_mm: params.overhang_mm || 45 },
              constraints: { priority: params.priority || "balanced",
                max_cycle_time_min: params.max_cycle_time_min,
                max_surface_roughness_um: params.max_surface_roughness_um },
            });
            result = {
              hybrid_plan: sr.value.hybrid_recommendation,
              best_overall: sr.value.best_overall,
              trade_offs: sr.value.trade_off_analysis,
              physics: sr.value.physics_summary,
              strategy_count: sr.value.ranked_strategies.length,
            };
            break;
          }
          // ================================================================
          // POST-PROCESSOR INNOVATIONS (7 engines, 21 actions)
          // ================================================================

          // --- Probe Routine Generator (4 actions) ---
          case "probe_wcs_setup": {
            const eng = await getEngine("probeGen");
            result = eng.generateWCSSetup(params);
            break;
          }
          case "probe_inspection": {
            const eng = await getEngine("probeGen");
            result = eng.generatePartInspection(params);
            break;
          }
          case "probe_tool_measure": {
            const eng = await getEngine("probeGen");
            result = eng.generateToolMeasurement(params);
            break;
          }
          case "probe_first_article": {
            const eng = await getEngine("probeGen");
            result = eng.generateFirstArticle(params);
            break;
          }

          // --- Cycle Time Estimator (3 actions) ---
          case "cycle_time_estimate": {
            const eng = await getEngine("cycleTimeEst");
            result = eng.estimateFromGCode(params.gcode, {
              controller: params.controller,
              machine_profile: params.machine_profile,
              machine_name: params.machine_name,
              include_breakdown: params.include_breakdown,
            });
            break;
          }
          case "cycle_time_compare": {
            const eng = await getEngine("cycleTimeEst");
            result = eng.compareEstimates(params.gcode, params.machines);
            break;
          }
          case "cycle_time_bottlenecks": {
            const eng = await getEngine("cycleTimeEst");
            result = eng.identifyBottlenecks(params.gcode, {
              controller: params.controller,
              machine_profile: params.machine_profile,
              top_n: params.top_n,
            });
            break;
          }

          // --- G-Code Safety Analyzer (2 actions) ---
          case "gcode_safety_analyze": {
            const eng = await getEngine("gcodeSafety");
            result = eng.analyze(params.gcode, {
              controller: params.controller,
              tool_data: params.tool_data,
              machine_envelope: params.machine_envelope,
              strictness: params.strictness,
            });
            break;
          }
          case "gcode_safety_fix": {
            const eng = await getEngine("gcodeSafety");
            result = eng.autoFix(params.gcode, {
              controller: params.controller,
              fix_level: params.fix_level,
            });
            break;
          }

          // --- Toolpath Thermal Analysis (3 actions) ---
          case "thermal_analyze": {
            const eng = await getEngine("thermal");
            result = eng.analyzeHeatAccumulation({
              gcode: params.gcode,
              material: params.material,
              tool_diameter: params.tool_diameter,
              workpiece_dimensions: params.workpiece_dimensions,
              coolant_type: params.coolant_type,
              ambient_temp: params.ambient_temp,
            });
            break;
          }
          case "thermal_distortion": {
            const eng = await getEngine("thermal");
            result = eng.predictDistortion({
              gcode: params.gcode,
              material: params.material,
              workpiece_dimensions: params.workpiece_dimensions,
              critical_dimensions: params.critical_dimensions,
              coolant_type: params.coolant_type,
            });
            break;
          }
          case "thermal_optimize": {
            const eng = await getEngine("thermal");
            result = eng.optimizeCuttingSequence({
              gcode: params.gcode,
              material: params.material,
              critical_features: params.critical_features,
            });
            break;
          }

          // --- Energy Optimizer (2 actions) ---
          case "energy_analyze": {
            const eng = await getEngine("energy");
            result = eng.analyzeEnergyConsumption(params.gcode, {
              machine_power_kw: params.machine_power_kw,
              spindle_efficiency: params.spindle_efficiency,
              coolant_pump_kw: params.coolant_pump_kw,
              electricity_rate: params.electricity_rate,
            });
            break;
          }
          case "energy_optimize": {
            const eng = await getEngine("energy");
            result = eng.optimizeForEnergy(params.gcode, {
              machine_power_kw: params.machine_power_kw,
              strategies: params.strategies,
            });
            break;
          }

          // --- Multi-Axis Kinematics (4 actions) ---
          case "kinematic_singularity": {
            const eng = await getEngine("kinematic");
            result = eng.detectSingularities(params.gcode, params.kinematics, {
              tolerance_deg: params.tolerance_deg,
            });
            break;
          }
          case "kinematic_transform": {
            const eng = await getEngine("kinematic");
            result = eng.transformCoordinates(params.gcode, params.from_kinematics, params.to_kinematics);
            break;
          }
          case "kinematic_optimize": {
            const eng = await getEngine("kinematic");
            result = eng.optimizeRotaryMotion(params.gcode, params.kinematics);
            break;
          }
          case "kinematic_reachability": {
            const eng = await getEngine("kinematic");
            result = eng.analyzeReachability(params.gcode, params.kinematics);
            break;
          }

          // --- Setup Sheet from G-Code (3 actions) ---
          case "setup_sheet_generate": {
            const eng = await getEngine("setupSheet");
            result = eng.generateSetupSheet(params.gcode, {
              controller: params.controller,
              part_number: params.part_number,
              operation_name: params.operation_name,
              include_tool_list: params.include_tool_list,
              include_offsets: params.include_offsets,
              include_safety: params.include_safety,
            });
            break;
          }
          case "setup_sheet_tools": {
            const eng = await getEngine("setupSheet");
            result = eng.generateToolList(params.gcode, params.controller);
            break;
          }
          case "setup_sheet_operations": {
            const eng = await getEngine("setupSheet");
            result = eng.generateOperationSequence(params.gcode, params.controller);
            break;
          }

          
          case "auto_speed_feed_optimize": {
            const eng = await getEngine("autoSF");
            result = await eng.optimize(params);
            break;
          }
          case "auto_speed_feed_analyze": {
            const eng = await getEngine("autoSF");
            result = await eng.analyze(params);
            break;
          }
          case "auto_speed_feed_batch": {
            const eng = await getEngine("autoSF");
            result = await eng.batchCalculate(
              params.material, params.iso_group, params.tools,
              params.machine_power_kw, params.machine_max_rpm, params.optimize_for,
            );
            break;
          }
          case "gcode_intelligence_pipeline": {
            const eng = await getEngine("pipeline");
            result = await eng.run(params);
            break;
          }
          case "pp_run_full": {
            const eng = await getEngine("postPipeline");
            result = await eng.process(params);
            break;
          }
          case "pp_run_partial": {
            const eng = await getEngine("postPipeline");
            result = await eng.process(params);
            break;
          }
          case "pp_analyze": {
            const eng = await getEngine("postPipeline");
            result = await eng.analyze(params);
            break;
          }
          case "pp_reoptimize": {
            const eng = await getEngine("postPipeline");
            result = await eng.reoptimize(params);
            break;
          }
          case "five_axis_tcpc": {
            const eng = await getEngine("fiveAxis");
            result = eng.getTCPCCodes(params.controller, params.tool_offset);
            break;
          }
          case "five_axis_singularity": {
            const eng = await getEngine("fiveAxis");
            result = eng.detectSingularities(params.blocks, params.config);
            break;
          }
          case "five_axis_linearize": {
            const eng = await getEngine("fiveAxis");
            result = eng.linearize(params.blocks, params.tolerance_mm);
            break;
          }
          case "pp_verify": {
            const eng = await getEngine("ppVerify");
            result = eng.verify(params);
            break;
          }
          case "pp_backplot": {
            const eng = await getEngine("ppVerify");
            result = eng.backplotVerify(params.gcode, params.original_points, params.tolerance_mm);
            break;
          }
          case "dialect_list": {
            const eng = await getEngine("controllerDialect");
            result = eng.listDialects();
            break;
          }
          case "dialect_translate": {
            const eng = await getEngine("controllerDialect");
            result = eng.translateCannedCycle(params.cycle, params.from, params.to);
            break;
          }
          case "dialect_features": {
            const eng = await getEngine("controllerDialect");
            result = eng.getFeatureCodes(params.controller, params.operation_type ?? "balanced");
            break;
          }
          case "pp_resolve_context": {
            const eng = await getEngine("postPipeline");
            result = await eng.process({ ...params, stages: { speed_feed: false, engagement_analysis: false, safety_analysis: false, playbook_rules: false, wear_progression: false, thermal_tracking: false, gcode_generation: false } });
            result = { machine: result.resolved?.machine, material: result.resolved?.material, tools: result.resolved?.tools, holders: result.resolved?.holders, coolant: result.resolved?.coolant };
            break;
          }
          case "machine_match": {
            const eng = await getEngine("machineMatcher");
            result = eng.match(params);
            break;
          }
          case "machine_quick_match": {
            const eng = await getEngine("machineMatcher");
            result = eng.quickMatch(params.gcode, params.material);
            break;
          }
          case "wear_compensate": {
            const eng = await getEngine("wearComp");
            result = eng.compensate(params);
            break;
          }
          case "wear_analyze": {
            const eng = await getEngine("wearComp");
            result = eng.analyze(params);
            break;
          }

          // Manufacturing Statistics (8 actions)
          case "stats_process_capability": {
            result = (await getEngine("mfgStats")).processCapability(params);
            break;
          }
          case "stats_spc_chart": {
            result = (await getEngine("mfgStats")).spcChart(params);
            break;
          }
          case "stats_weibull": {
            result = (await getEngine("mfgStats")).weibullAnalysis(params);
            break;
          }
          case "stats_monte_carlo_tolerance": {
            result = (await getEngine("mfgStats")).monteCarloTolerance(params);
            break;
          }
          case "stats_anova": {
            result = (await getEngine("mfgStats")).anova(params);
            break;
          }
          case "stats_regression": {
            result = (await getEngine("mfgStats")).regression(params);
            break;
          }
          case "stats_oee": {
            result = (await getEngine("mfgStats")).oee(params);
            break;
          }
          case "stats_gage_rr": {
            result = (await getEngine("mfgStats")).gageRR(params);
            break;
          }

          // Advanced Cutting Math (8 actions)
          case "math_chip_mechanics": {
            result = (await getEngine("cuttingMath")).chipMechanics(params);
            break;
          }
          case "math_thermal_models": {
            result = (await getEngine("cuttingMath")).thermalModels(params);
            break;
          }
          case "math_wear_models": {
            result = (await getEngine("cuttingMath")).wearModels(params);
            break;
          }
          case "math_surface_integrity": {
            result = (await getEngine("cuttingMath")).surfaceIntegrity(params);
            break;
          }
          case "math_timoshenko_deflection": {
            result = (await getEngine("cuttingMath")).timoshenkoDeflection(params);
            break;
          }
          case "math_taguchi": {
            result = (await getEngine("cuttingMath")).taguchiDOE(params.factors, params.responses);
            break;
          }
          case "math_topsis": {
            result = (await getEngine("cuttingMath")).topsis(params);
            break;
          }
          case "math_desirability": {
            result = (await getEngine("cuttingMath")).desirability(params.responses);
            break;
          }

          // ── Advanced Cutting Physics (6) ─────────────────────────
          case "sci_oxley": { result = (await getEngine("cuttingPhysics")).oxleyPredictive(params); break; }
          case "sci_oblique": { result = (await getEngine("cuttingPhysics")).obliqueCutting(params); break; }
          case "sci_size_effect": { result = (await getEngine("cuttingPhysics")).sizeEffect(params); break; }
          case "sci_recht_shear": { result = (await getEngine("cuttingPhysics")).rechtShearInstability(params); break; }
          case "sci_chip_breaking": { result = (await getEngine("cuttingPhysics")).chipBreakingCriterion(params); break; }
          case "sci_process_damping": { result = (await getEngine("cuttingPhysics")).processDamping(params); break; }

          // ── Reliability Engineering (8) ──────────────────────────
          case "rel_cox_hazards": { result = (await getEngine("reliability")).coxProportionalHazards(params); break; }
          case "rel_competing_risks": { result = (await getEngine("reliability")).competingRisks(params); break; }
          case "rel_wiener_rul": { result = (await getEngine("reliability")).wienerDegradation(params); break; }
          case "rel_gamma_degradation": { result = (await getEngine("reliability")).gammaDegradation(params); break; }
          case "rel_bayesian_rul": { result = (await getEngine("reliability")).bayesianRUL(params); break; }
          case "rel_optimal_replacement": { result = (await getEngine("reliability")).optimalReplacement(params); break; }
          case "rel_delay_time": { result = (await getEngine("reliability")).delayTimeModel(params); break; }
          case "rel_renewal_theory": { result = (await getEngine("reliability")).renewalTheory(params); break; }

          // ── Machine Geometric Accuracy (5) ──────────────────────
          case "acc_21_error_model": { result = (await getEngine("machineAccuracy")).twentyOneErrorModel(params); break; }
          case "acc_abbe_offset": { result = (await getEngine("machineAccuracy")).abbeOffset(params); break; }
          case "acc_volumetric": { result = (await getEngine("machineAccuracy")).volumetricAccuracy(params); break; }
          case "acc_ball_bar": { result = (await getEngine("machineAccuracy")).ballBarAnalysis(params); break; }
          case "acc_thermal_error": { result = (await getEngine("machineAccuracy")).thermalErrorModel(params); break; }

          // ── Statistical Process Monitoring (9) ──────────────────
          case "spm_hotelling_t2": { result = (await getEngine("spm")).hotellingT2(params); break; }
          case "spm_pca_monitoring": { result = (await getEngine("spm")).pcaProcessMonitoring(params); break; }
          case "spm_hmm_condition": { result = (await getEngine("spm")).hiddenMarkovModel(params); break; }
          case "spm_bootstrap_ci": { result = (await getEngine("spm")).bootstrapCI(params); break; }
          case "spm_sprt": { result = (await getEngine("spm")).sprt(params); break; }
          case "spm_combined_spc": { result = (await getEngine("spm")).combinedSPCScheme(params); break; }
          case "spm_doe_generate": { result = (await getEngine("spm")).doeGenerator(params); break; }
          case "spm_rsm": { result = (await getEngine("spm")).responseSurfaceMethodology(params); break; }
          case "spm_nbi_optimization": { result = (await getEngine("spm")).nbiOptimization(params); break; }

          // ── Constitutive Models (9) ─────────────────────────────
          case "const_zerilli_armstrong": { result = (await getEngine("constitutive")).zerilliArmstrong(params); break; }
          case "const_mts": { result = (await getEngine("constitutive")).mechanicalThresholdStress(params); break; }
          case "const_voce": { result = (await getEngine("constitutive")).voceHardening(params); break; }
          case "const_ptw": { result = (await getEngine("constitutive")).prestonTonksWallace(params); break; }
          case "const_paris_law": { result = (await getEngine("constitutive")).parisLaw(params); break; }
          case "const_norton_creep": { result = (await getEngine("constitutive")).nortonCreep(params); break; }
          case "const_larson_miller": { result = (await getEngine("constitutive")).larsonMiller(params); break; }
          case "const_hollomon": { result = (await getEngine("constitutive")).hollomonHardening(params); break; }
          case "const_machinability": { result = (await getEngine("constitutive")).machinabilityIndex(params); break; }

          // ── Advanced Wear Physics (7) ───────────────────────────
          case "wear_stochastic": { result = (await getEngine("wearPhysics")).kannateyAsibuStochastic(params); break; }
          case "wear_fick_crater": { result = (await getEngine("wearPhysics")).fickCraterWear(params); break; }
          case "wear_notch": { result = (await getEngine("wearPhysics")).notchWear(params); break; }
          case "wear_lognormal_life": { result = (await getEngine("wearPhysics")).logNormalToolLife(params); break; }
          case "wear_rabinowicz": { result = (await getEngine("wearPhysics")).rabinowiczAbrasiveWear(params); break; }
          case "wear_flank_ode": { result = (await getEngine("wearPhysics")).flankWearODE(params); break; }
          case "wear_combined_mechanisms": { result = (await getEngine("wearPhysics")).combinedWearMechanisms(params); break; }

          // ── Sustainability & LCA (7) ────────────────────────────
          case "sus_lifecycle_assessment": { result = (await getEngine("susLCA")).lifecycleAssessment(params); break; }
          case "sus_eco_efficiency": { result = (await getEngine("susLCA")).ecoEfficiencyFrontier(params); break; }
          case "sus_exergy": { result = (await getEngine("susLCA")).exergyAnalysis(params); break; }
          case "sus_gutowski_energy": { result = (await getEngine("susLCA")).gutowskiEnergyModel(params); break; }
          case "sus_coolant_lifecycle": { result = (await getEngine("susLCA")).coolantLifecycleEnergy(params); break; }
          case "sus_stochastic_economics": { result = (await getEngine("susLCA")).stochasticToolLifeEconomics(params); break; }
          case "sus_total_cost_ownership": { result = (await getEngine("susLCA")).totalCostOfOwnership(params); break; }

          // ── Coolant Dynamics (7) ────────────────────────────────
          case "cool_reynolds_flow": { result = (await getEngine("coolant")).reynoldsChannelFlow(params); break; }
          case "cool_tsc_pressure": { result = (await getEngine("coolant")).throughSpindlePressureDrop(params); break; }
          case "cool_mql_spray": { result = (await getEngine("coolant")).mqlSprayModel(params); break; }
          case "cool_jet_coherence": { result = (await getEngine("coolant")).jetCoherence(params); break; }
          case "cool_chip_transport": { result = (await getEngine("coolant")).chipTransportDrag(params); break; }
          case "cool_komanduri_thermal": { result = (await getEngine("coolant")).komanduriHouThermal(params); break; }
          case "cool_cryogenic": { result = (await getEngine("coolant")).cryogenicMachiningThermal(params); break; }

          // ── CNC Program Assembler ──────────────────────────────────────
          case "program_assemble": { result = await (await getEngine("assembler")).assembleProgram(params as any); break; }
          case "program_batch_sf": { result = await (await getEngine("assembler")).calculateBatchSpeedFeed(params as any); break; }
          case "program_cycle_time": { result = await (await getEngine("assembler")).estimateCycleTime(params as any); break; }

          // ── Motion Dynamics Profile ────────────────────────────────────
          case "motion_trapezoidal": { const p = params as any; result = (await getEngine("motionDyn")).trapezoidalProfile(p.distance_mm, p.v_commanded_mmmin, p.v_entry_mmmin ?? 0, p.v_exit_mmmin ?? 0, p.max_accel_mm_s2); break; }
          case "motion_scurve": { const p = params as any; result = (await getEngine("motionDyn")).sCurveProfile(p.distance_mm, p.v_commanded_mmmin, p.v_entry_mmmin ?? 0, p.v_exit_mmmin ?? 0, p.max_accel_mm_s2, p.max_jerk_mm_s3); break; }
          case "motion_corner_velocity": { const p = params as any; result = (await getEngine("motionDyn")).cornerVelocity(p.v1_direction, p.v2_direction, p.max_accel_mm_s2, p.corner_tolerance_mm); break; }
          case "motion_look_ahead": { const p = params as any; result = (await getEngine("motionDyn")).simulateLookAhead(p.segments, p.kinematics); break; }
          case "motion_axis_decompose": { const p = params as any; result = (await getEngine("motionDyn")).axisDecomposition(p.feed_mmmin, p.direction, p.axis_limits); break; }
          case "motion_feed_effectiveness": { const p = params as any; result = (await getEngine("motionDyn")).feedEffectiveness(p.segments, p.kinematics); break; }
          case "motion_optimize_feed": { const p = params as any; result = (await getEngine("motionDyn")).optimizeFeedProfile(p.segments, p.kinematics); break; }

          // ── Engagement Adaptive Feed ───────────────────────────────────
          case "engage_adapt_feed": {
            result = (await getEngine("engageAdapt")).adaptFeed(params as any);
            break;
          }
          case "engage_calc_engagement": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).calculateEngagement(
              p.tool_diameter_mm, p.radial_depth_mm, p.move_type
            );
            break;
          }
          case "engage_chip_thinning": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).chipThinningFactor(
              p.engagement_deg, p.tool_diameter_mm, p.radial_depth_mm, p.model
            );
            break;
          }
          case "engage_constant_force": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).constantForceFeed(
              p.nominal_fz_mm, p.nominal_engagement_deg, p.new_engagement_deg,
              p.kc1_1, p.mc
            );
            break;
          }
          case "engage_constant_mrr": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).constantMRRFeed(
              p.nominal_fz_mm, p.nominal_ae_mm, p.new_ae_mm
            );
            break;
          }
          case "engage_thermal_balance": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).thermalBalanceFeed(
              p.nominal_fz_mm, p.nominal_ae_mm, p.new_ae_mm,
              p.cutting_speed_mmin, p.axial_depth_mm, p.kc1_1,
              { conductivity_w_mk: p.conductivity_w_mk, rho_c_jm3k: p.rho_c_jm3k }
            );
            break;
          }
          case "engage_ramp_transition": {
            const p = params as any;
            result = (await getEngine("engageAdapt")).rampFeedTransition(
              p.feed_before_mmmin, p.feed_after_mmmin,
              p.ramp_distance_mm, p.num_points
            );
            break;
          }

          case "master_post_process": {
            const { masterPostProcessorEngine } = await import("../../engines/MasterPostProcessorEngine.js");
            result = masterPostProcessorEngine.process(
              (params as any).segments || [],
              params as any
            );
            break;
          }
          case "cnc_simulate": {
            const { cncSimulationPipelineEngine } = await import("../../engines/CNCSimulationPipelineEngine.js");
            result = cncSimulationPipelineEngine.simulate({
              gcode_blocks: (params.gcode as string ?? "").split("\n"),
              machine_brand: params.machine_brand as string,
              machine_model: params.machine_model as string,
              tool_diameter_mm: params.tool_diameter_mm as number,
              tool_length_mm: params.tool_length_mm as number,
              material: params.material as string,
            });
            break;
          }
          case "cnc_simulate_report": {
            const { cncSimulationPipelineEngine: simPipe } = await import("../../engines/CNCSimulationPipelineEngine.js");
            const { simulationReportEngine } = await import("../../engines/SimulationReportEngine.js");
            const simRes = simPipe.simulate({
              gcode_blocks: (params.gcode as string ?? "").split("\n"),
              material: params.material as string,
            });
            result = simulationReportEngine.generateReport(simRes);
            break;
          }
          case "cnc_simulate_physics": {
            const { physicsAwareSimulationEngine } = await import("../../engines/PhysicsAwareSimulationEngine.js");
            result = physicsAwareSimulationEngine.computeBlockPhysics({
              cutting_speed_m_min: params.cutting_speed_m_min as number ?? 150,
              feed_mm_rev: params.feed_mm_rev as number ?? 0.2,
              depth_of_cut_mm: params.depth_of_cut_mm as number ?? 3,
              width_of_cut_mm: params.width_of_cut_mm as number ?? 6,
              tool_diameter_mm: params.tool_diameter_mm as number ?? 12,
              tool_length_mm: params.tool_length_mm as number ?? 50,
              tool_flutes: params.tool_flutes as number ?? 4,
              material: params.material as string ?? "steel",
            });
            break;
          }
          case "cnc_simulate_predictive": {
            const { predictiveSimulationEngine } = await import("../../engines/PredictiveSimulationEngine.js");
            result = predictiveSimulationEngine.predict({
              tools: params.tools as any ?? [],
              blocks: params.blocks as any ?? [],
              workpiece_material: params.workpiece_material as string ?? "steel",
            });
            break;
          }
          // ── InstantaneousEngagementEngine (2 actions) ──
          case "instantaneous_engagement_analyze": {
            const eng = await getEngine("instEngage");
            result = eng.analyzeToolpath(params as any);
            break;
          }
          case "instantaneous_engagement_optimal_sf": {
            const eng = await getEngine("instEngage");
            result = eng.computeOptimalSF(params as any);
            break;
          }
          // ── MultiCAMPostEngine (5 actions) ──
          case "multi_cam_post_list": {
            const eng = await getEngine("multiCamPost");
            result = eng.listCAMSystems();
            break;
          }
          case "multi_cam_post_scaffold": {
            const eng = await getEngine("multiCamPost");
            result = eng.getPostScaffold(params.system as any, params.controller as string);
            break;
          }
          case "multi_cam_post_sequence": {
            const eng = await getEngine("multiCamPost");
            result = eng.getMachineSequence(params as any);
            break;
          }
          case "multi_cam_post_millturn": {
            const eng = await getEngine("multiCamPost");
            result = eng.getMillTurnChannels(params.controller as string);
            break;
          }
          case "multi_cam_post_phase_b": {
            const eng = await getEngine("multiCamPost");
            result = eng.getPhaseBCommand(params as any);
            break;
          }
          // ── ProductionToolpathEngine (4 actions) ──
          case "production_toolpath_generate": {
            const eng = await getEngine("prodToolpath");
            result = eng.generateProduction(params as any);
            break;
          }
          case "production_toolpath_gcode": {
            const eng = await getEngine("prodToolpath");
            result = eng.toGcode(params as any);
            break;
          }
          case "production_toolpath_cost": {
            const eng = await getEngine("prodToolpath");
            result = eng.costPerFeature(params as any);
            break;
          }
          case "production_toolpath_chatter_rpm": {
            const eng = await getEngine("prodToolpath");
            result = eng.selectChatterSafeRPM(params as any);
            break;
          }
          // ── PostProcessorAPIEngine (3 actions) ──
          case "pp_api_start": {
            const eng = await getEngine("ppAPI");
            result = await eng.start(params as any);
            break;
          }
          case "pp_api_stop": {
            const eng = await getEngine("ppAPI");
            result = await eng.stop();
            break;
          }
          case "pp_api_status": {
            const eng = await getEngine("ppAPI");
            result = eng.status();
            break;
          }
          // ── ScalableCAMOrchestratorEngine (1 action) ──
          case "scalable_cam_orchestrate": {
            const eng = await getEngine("scalableOrch");
            result = eng.process(params as any);
            break;
          }
          // ── UnifiedCAMPipelineEngine (1 action) ──
          case "unified_cam_pipeline": {
            const eng = await getEngine("unifiedPipe");
            result = eng.generate(params as any);
            break;
          }
          // ── SmartToolSelectorEngine (1 action) ──
          case "smart_tool_select": {
            const eng = await getEngine("smartTool");
            result = eng.select(params as any);
            break;
          }
          // ── AdaptiveToolpathRouterEngine (2 actions) ──
          case "adaptive_toolpath_route": {
            const eng = await getEngine("adaptRouter");
            result = eng.route(params as any);
            break;
          }
          case "adaptive_toolpath_list_algorithms": {
            const eng = await getEngine("adaptRouter");
            result = eng.listAlgorithms();
            break;
          }
          // ── CumulativeStockChainEngine (1 action) ──
          case "cumulative_stock_chain": {
            const eng = await getEngine("cumStock");
            result = eng.chain(params as any);
            break;
          }
          // ── FeatureClusteringEngine (1 action) ──
          case "feature_clustering_cluster": {
            const eng = await getEngine("featCluster");
            result = eng.cluster(params.features as any);
            break;
          }
          // ── ProductionPackageEngine (1 action) ──
          case "production_package_assemble": {
            const eng = await getEngine("prodPackage");
            result = eng.assemble(params as any);
            break;
          }
          case "five_axis_contour": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_contour", params);
            break;
          }
          case "five_axis_port": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_port", params);
            break;
          }
          case "five_axis_singularity_manage": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_singularity_manage", params);
            break;
          }
          case "five_axis_collision_avoid": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_collision_avoid", params);
            break;
          }
          case "five_axis_roughing": {
            const eng = await getEngine("fiveAxisInteg");
            result = eng.calculate("five_axis_roughing", params);
            break;
          }
          // ── CK-MS7: CAMKernelOrchestratorEngine (3 actions) ──
          case "cam_generate": {
            const eng = await getEngine("camOrch");
            result = eng.calculate("cam_generate", params);
            break;
          }
          case "cam_turn": {
            const eng = await getEngine("camOrch");
            result = eng.calculate("cam_turn", params);
            break;
          }
          case "cam_simulate": {
            const eng = await getEngine("camOrch");
            result = eng.calculate("cam_simulate", params);
            break;
          }
          // PIPE-MS0 — Print-to-Program Pipeline
          case "print_to_program_full": {
            const { printToProgramPipelineEngine } = await import("../../engines/PrintToProgramPipelineEngine.js");
            result = printToProgramPipelineEngine.calculate("print_to_program_full", params);
            break;
          }
          case "print_to_program_plan": {
            const { printToProgramPipelineEngine: ptpPlan } = await import("../../engines/PrintToProgramPipelineEngine.js");
            result = ptpPlan.calculate("print_to_program_plan", params);
            break;
          }
          case "print_to_program_validate": {
            const { printToProgramPipelineEngine: ptpVal } = await import("../../engines/PrintToProgramPipelineEngine.js");
            result = ptpVal.calculate("print_to_program_validate", params);
            break;
          }
          // ── CK-MS7: EDMProgramAssemblerEngine (5 actions) ──
          case "edm_wire_program": {
            const eng = await getEngine("edmAsm");
            result = eng.assembleWireEDM(params);
            break;
          }
          case "edm_sinker_program": {
            const eng = await getEngine("edmAsm");
            result = eng.assembleSinkerEDM(params);
            break;
          }
          case "edm_micro_program": {
            const eng = await getEngine("edmAsm");
            result = eng.assembleMicroEDM(params);
            break;
          }
          case "edm_cycle_time": {
            const eng = await getEngine("edmAsm");
            result = eng.estimateCycleTime(params);
            break;
          }
          case "edm_uncertainty": {
            const eng = await getEngine("edmAsm");
            result = eng.computeUncertainty(params);
            break;
          }
          // ── CK-MS7: GrindingProgramAssemblerEngine (5 actions) ──
          case "grind_surface_program": {
            const eng = await getEngine("grindAsm");
            result = eng.assembleSurfaceGrind(params);
            break;
          }
          case "grind_cylindrical_program": {
            const eng = await getEngine("grindAsm");
            result = eng.assembleCylindricalGrind(params);
            break;
          }
          case "grind_centerless_program": {
            const eng = await getEngine("grindAsm");
            result = eng.assembleCenterlessGrind(params);
            break;
          }
          case "grind_creepfeed_program": {
            const eng = await getEngine("grindAsm");
            result = eng.assembleCreepFeedGrind(params);
            break;
          }
          case "grind_uncertainty": {
            const eng = await getEngine("grindAsm");
            result = eng.computeUncertainty(params);
            break;
          }
          // ── CK-MS7: LaserProgramAssemblerEngine (5 actions) ──
          case "laser_cut_program": {
            const eng = await getEngine("laserAsm");
            result = eng.assembleLaserCut(params);
            break;
          }
          case "laser_mark_program": {
            const eng = await getEngine("laserAsm");
            result = eng.assembleLaserMark(params);
            break;
          }
          case "laser_weld_program": {
            const eng = await getEngine("laserAsm");
            result = eng.assembleLaserWeld(params);
            break;
          }
          case "laser_drill_program": {
            const eng = await getEngine("laserAsm");
            result = eng.assembleLaserDrill(params);
            break;
          }
          case "laser_uncertainty": {
            const eng = await getEngine("laserAsm");
            result = eng.computeUncertainty(params);
            break;
          }
          // ── CK-MS7: WaterjetProgramAssemblerEngine (5 actions) ──
          case "waterjet_abrasive_program": {
            const eng = await getEngine("wjAsm");
            result = eng.assembleAbrasiveWJ(params);
            break;
          }
          case "waterjet_pure_program": {
            const eng = await getEngine("wjAsm");
            result = eng.assemblePureWJ(params);
            break;
          }
          case "waterjet_taper_program": {
            const eng = await getEngine("wjAsm");
            result = eng.assembleTaperCompensated(params);
            break;
          }
          case "waterjet_depth_program": {
            const eng = await getEngine("wjAsm");
            result = eng.assembleControlledDepth(params);
            break;
          }
          case "waterjet_uncertainty": {
            const eng = await getEngine("wjAsm");
            result = eng.computeUncertainty(params);
            break;
          }
          // ── CK-MS7: MultiProcessCAMRouterEngine (6 actions) ──
          case "multi_process_route": {
            const eng = await getEngine("multiProc");
            result = eng.routePart(params);
            break;
          }
          case "multi_process_analyze": {
            const eng = await getEngine("multiProc");
            result = eng.analyzeFeatures(params.features, params);
            break;
          }
          case "multi_process_sequence": {
            const eng = await getEngine("multiProc");
            result = eng.sequenceProcesses(params.analyses, params);
            break;
          }
          case "multi_process_cost": {
            const eng = await getEngine("multiProc");
            result = eng.estimateCost(params.route, params.batch_size ?? 1);
            break;
          }
          case "multi_process_alternatives": {
            const eng = await getEngine("multiProc");
            result = eng.compareProcessAlternatives(params.feature, params);
            break;
          }
          case "multi_process_consolidate": {
            const eng = await getEngine("multiProc");
            result = eng.suggestConsolidation(params.route);
            break;
          }
          // ── CK-MS7: MillTurnSwissPipelineEngine (5 actions) ──
          case "mill_turn_live_tooling": {
            const eng = await getEngine("millTurn");
            result = eng.calculateLiveTool(params);
            break;
          }
          case "mill_turn_sub_spindle": {
            const eng = await getEngine("millTurn");
            result = eng.calculateSubSpindleTransfer(params);
            break;
          }
          case "mill_turn_multi_channel": {
            const eng = await getEngine("millTurn");
            result = eng.calculateMultiChannel(params);
            break;
          }
          case "mill_turn_bar_feeder": {
            const eng = await getEngine("millTurn");
            result = eng.calculateBarFeeder(params);
            break;
          }
          case "mill_turn_swiss": {
            const eng = await getEngine("millTurn");
            result = eng.calculateSwissMachining(params);
            break;
          }
          // ── CK-MS7: SelfLearningCAMEngine (5 actions) ──
          case "self_learn_record": {
            const eng = await getEngine("selfLearn");
            result = eng.cutToLearn(params);
            break;
          }
          case "self_learn_twin_sync": {
            const eng = await getEngine("selfLearn");
            result = eng.digitalTwinSync(params);
            break;
          }
          case "self_learn_rank_strategy": {
            const eng = await getEngine("selfLearn");
            result = eng.strategyRanking(params);
            break;
          }
          case "self_learn_anomaly": {
            const eng = await getEngine("selfLearn");
            result = eng.anomalyRelearn(params);
            break;
          }
          case "self_learn_fleet": {
            const eng = await getEngine("selfLearn");
            result = eng.fleetLearn(params);
            break;
          }
          // ── CAM Kernel Unified Actions (CK Track) ──────────
          case "cam_unified_generate":
          case "cam_complex_generate":
          case "cam_production_toolpath":
          case "cam_multi_process":
          case "cam_mill_turn":
          case "cam_5axis_convert":
          case "cam_advanced_strategy":
          case "cam_smart_tool":
          case "cam_verify":
          case "cam_chatter_rpm":
          case "cam_cost_feature": {
            const { dispatchCAMAction } = await import("../../engines/CAMKernelDispatcherBridge.js");
            result = dispatchCAMAction(action as any, params);
            break;
          }
          case "cam_intelligent_sequence": {
            const { intelligentSequencingEngine } = await import("../../engines/IntelligentSequencingEngine.js");
            result = intelligentSequencingEngine.sequence(params.operations ?? []);
            break;
          }
          case "cam_list_actions": {
            const { listCAMActions } = await import("../../engines/CAMKernelDispatcherBridge.js");
            result = listCAMActions();
            break;
          }
          default:
            result = { error: `Unknown action: ${action}` };
        }
        // POST-TOOLPATH HOOKS
        try {
          await hookExecutor.execute("post-toolpath", {
            ...hookCtx, metadata: { ...hookCtx.metadata, result }
          });
        } catch (postErr) {
          log.warn(`[prism_cam] Post-toolpath hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_cam");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    }
  );
}
