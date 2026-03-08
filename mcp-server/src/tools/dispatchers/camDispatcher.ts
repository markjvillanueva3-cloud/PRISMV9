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
 *   cam_multicam_flagship, post_feed_optimize, post_feed_analyze,
 *   gcode_transpile, gcode_transpile_dialects, gcode_transpile_cycles,
 *   stability_rpm_rewrite, stability_rpm_analyze
 *
 * Engine dependencies: CAMKernelEngine, ToolpathGenerationEngine,
 *   PostProcessorEngine, CollisionDetectionEngine, StockModelEngine,
 *   ToolAssemblyEngine, ModularFixtureLayoutEngine,
 *   HyperMillStrategyEngine, HyperMillSafetyHooks,
 *   LathePostProcessorEngine, ProbingCycleEngine, SubprogramEngine,
 *   PostProcessorFeedOptimizerEngine
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { dispatcherError, validateActionParams } from "../../utils/dispatcherMiddleware.js";
import { ACTION_CAM_SCHEMAS } from "../../schemas/camActionSchemas.js";
import { ACTION_POST_PROCESSOR_EXT_SCHEMAS } from "../../schemas/postProcessorExtActionSchemas.js";
const MERGED_CAM_SCHEMAS = { ...ACTION_CAM_SCHEMAS, ...ACTION_POST_PROCESSOR_EXT_SCHEMAS };
import { hookExecutor } from "../../engines/HookExecutor.js";

let _cam: any, _toolpath: any, _post: any, _collision: any, _stock: any, _toolAsm: any, _fixture: any, _hmStrategy: any, _hmSafety: any, _hmMultiAxis: any, _hmMaterialMap: any, _hmCycleCatalog: any, _hmController: any, _hmCycleDefaults: any, _hmThread: any, _lathePost: any, _probing: any, _subprogram: any, _nesting: any, _tpSim: any, _advPost: any, _portability: any, _multiCam: any, _feedOpt: any, _transpiler: any, _stabilityRPM: any, _probeGen: any, _cycleTimeEst: any, _gcodeSafety: any, _thermal: any, _energy: any, _kinematic: any, _setupSheet: any, _autoSF: any;
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
  "post_feed_optimize",
  "post_feed_analyze",
  "gcode_transpile",
  "gcode_transpile_dialects",
  "gcode_transpile_cycles",
  "stability_rpm_rewrite",
  "stability_rpm_analyze",
  "auto_speed_feed_optimize", "auto_speed_feed_analyze", "auto_speed_feed_batch",
  "gcode_intelligence_pipeline", "machine_match", "machine_quick_match",
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
