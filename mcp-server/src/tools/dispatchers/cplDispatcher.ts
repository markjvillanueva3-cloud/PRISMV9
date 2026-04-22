/**
 * cplDispatcher — CAM-Pipeline Track Dispatcher
 *
 * Routes all CPL-track engine actions. Covers:
 * - CPL-MS2: Novel algorithms (clothoid, PH curves, Voronoi, minimum jerk, etc.)
 * - CPL-MS1: Pipeline integration (servo lag, rotary axis, cut reorder, etc.)
 * - CPL-MS3: Pipeline architecture (voxel IPW, learning feedback, multi-process, etc.)
 * - CPL-MS4: CAM kernel extensions (DFM, nesting, NL CAM, G-code diff, etc.)
 *
 * @module cplDispatcher
 */

import { z } from "zod";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { ACTION_CPL_SCHEMAS } from "../../schemas/cplActionSchemas.js";

// ─── Action Schema ──────────────────────────────────────────────────

const cplActionSchema = z.enum([
  // Novel Algorithms (CPL-MS2)
  "clothoid_blend",
  "ph_interpolate",
  "ph_constant_feed",
  "voronoi_pocket",
  "voronoi_engagement",
  "minimum_jerk_segment",
  "minimum_jerk_plan",
  "wear_map",
  "wear_compensate",
  "wear_life_extension",
  "contact_hertz",
  "contact_full_integrity",
  "multi_body_frf",
  "multi_body_stability",
  "thermal_field_simulate",
  "thermal_field_route",
  "stochastic_route_optimize",
  "stochastic_pareto",
  "inverse_thermal_compensate",
  "inverse_thermal_warmup",
  // Pipeline Integration (CPL-MS1)
  "servo_lag_compensate",
  "rotary_axis_check",
  "controller_compatibility",
  "bar_stock_analyze",
  "bar_stock_chatter",
  "tolerance_verify",
  "cut_reorder",
  "hole_reorder",
  "learning_corrections",
  "distortion_predict",
  "fixture_plan",
  "trochoidal_variable_depth",
  "gdt_propagate",
  // Pipeline Architecture (CPL-MS3)
  "pipeline_record_predictions",
  "pipeline_submit_actuals",
  "pipeline_calibration",
  "output_variants",
  "route_features",
  "parallel_optimize",
  "voxel_init",
  "voxel_subtract",
  "voxel_volume",
  "voxel_thin_walls",
  "tolerance_driven_params",
  // CAM Kernel Extensions (CPL-MS4)
  "turning_profile",
  "nest_2d",
  "parse_dxf",
  "parse_svg",
  "nl_cam_command",
  "gcode_diff",
  "dfm_analyze",
  "dfm_feedback",
  "cam_validate",
  "integration_test",
]);

type CplAction = z.infer<typeof cplActionSchema>;

// ─── Dispatcher ─────────────────────────────────────────────────────

export async function cplDispatcher(input: { action: string; [key: string]: unknown }): Promise<unknown> {
  const action = cplActionSchema.parse(input.action) as CplAction;
  const { action: _a, ...params } = input;
  const validation = validateActionParams(action, params as Record<string, unknown>, ACTION_CPL_SCHEMAS);
  if (!validation.valid) {
    return { error: `Invalid params for '${action}': ${validation.errorMessage}` };
  }

  switch (action) {
    // ═══ Novel Algorithms ═══
    case "clothoid_blend": {
      const { ClothoidBlendingEngine } = await import("../../engines/ClothoidBlendingEngine.js");
      const eng = new ClothoidBlendingEngine();
      return eng.blendCorners(input as any);
    }
    case "ph_interpolate": {
      const { phCurveToolpathEngine } = await import("../../engines/PHCurveToolpathEngine.js");
      return phCurveToolpathEngine.interpolatePath(input.waypoints as any, input.tangents as any);
    }
    case "ph_constant_feed": {
      const { phCurveToolpathEngine } = await import("../../engines/PHCurveToolpathEngine.js");
      return phCurveToolpathEngine.constantFeedParameterization(input.segment as any, input.target_feed as number);
    }
    case "voronoi_pocket": {
      const { VoronoiMedialAxisPocketEngine } = await import("../../engines/VoronoiMedialAxisPocketEngine.js");
      const eng = new VoronoiMedialAxisPocketEngine();
      return eng.generatePocketToolpath(input as any);
    }
    case "voronoi_engagement": {
      const { VoronoiMedialAxisPocketEngine } = await import("../../engines/VoronoiMedialAxisPocketEngine.js");
      const eng = new VoronoiMedialAxisPocketEngine();
      return eng.computeEngagementProfile(input.toolpath as any, input.boundary as any, input.tool_diameter as number);
    }
    case "minimum_jerk_segment": {
      const { minimumJerkTrajectoryEngine: eng } = await import("../../engines/MinimumJerkTrajectoryEngine.js");
      return eng.minimumJerkSegment(
        input.x0 as number, input.v0 as number, input.a0 as number,
        input.xf as number, input.vf as number, input.af as number,
        input.T as number,
      );
    }
    case "minimum_jerk_plan": {
      const { minimumJerkTrajectoryEngine: eng } = await import("../../engines/MinimumJerkTrajectoryEngine.js");
      return eng.planTrajectory(input.waypoints as any, input.constraints as any);
    }
    case "wear_map": {
      const { wearPatternRefinishEngine: eng } = await import("../../engines/WearPatternRefinishEngine.js");
      return eng.mapWearProfile(input.measurements as any);
    }
    case "wear_compensate": {
      const { wearPatternRefinishEngine: eng } = await import("../../engines/WearPatternRefinishEngine.js");
      return eng.generateCompensatingPass(input.error_profile as any, input.original_path as any, input.params as any);
    }
    case "wear_life_extension": {
      const { wearPatternRefinishEngine: eng } = await import("../../engines/WearPatternRefinishEngine.js");
      return eng.estimateLifeExtension(input.profile as any, input.threshold_mm as number);
    }
    case "contact_hertz": {
      const { ContactMechanicsSurfaceEngine } = await import("../../engines/ContactMechanicsSurfaceEngine.js");
      const eng = new ContactMechanicsSurfaceEngine();
      return eng.hertzContact(input.normal_force_N as number, input.tool as any, input.workpiece as any);
    }
    case "contact_full_integrity": {
      const { ContactMechanicsSurfaceEngine } = await import("../../engines/ContactMechanicsSurfaceEngine.js");
      const eng = new ContactMechanicsSurfaceEngine();
      return eng.fullIntegrityAnalysis(input.conditions as any, input.tool as any, input.workpiece as any);
    }
    case "multi_body_frf": {
      const { MultiBodyVibrationEngine } = await import("../../engines/MultiBodyVibrationEngine.js");
      const eng = new MultiBodyVibrationEngine();
      const system = input.system as any ?? eng.quickSetup(
        input.tool as string, input.holder as string,
        input.spindle as string, input.workpiece as string,
      );
      return eng.computeSystemFRF(system, input.freq_range as any, input.num_points as number);
    }
    case "multi_body_stability": {
      const { MultiBodyVibrationEngine } = await import("../../engines/MultiBodyVibrationEngine.js");
      const eng = new MultiBodyVibrationEngine();
      const system = input.system as any ?? eng.quickSetup(
        input.tool as string, input.holder as string,
        input.spindle as string, input.workpiece as string,
      );
      const frf = eng.computeSystemFRF(system);
      return eng.stabilityLobesCoupled(system, frf, input.flute_count as number, input.kc1_1 as number);
    }
    case "thermal_field_simulate": {
      const { thermalFieldToolpathEngine: eng } = await import("../../engines/ThermalFieldToolpathEngine.js");
      return eng.simulateCuttingThermal(input.grid as any, input.path as any, input.Vc as number, input.feed as number, input.ap as number, input.ae as number, input.material as any);
    }
    case "thermal_field_route": {
      const { thermalFieldToolpathEngine: eng } = await import("../../engines/ThermalFieldToolpathEngine.js");
      return eng.routeToolpath(input.grid as any, input.passes as any, input.threshold as number, input.material as any);
    }
    case "stochastic_route_optimize": {
      const { stochasticToolpathRoutingEngine: eng } = await import("../../engines/StochasticToolpathRoutingEngine.js");
      const variants = eng.sampleVariants(input.pocket as any, input.N as number ?? 100, input.perturbation as any ?? {});
      const evaluated = variants.map((v: any) => eng.evaluateVariant(v, input.material as any, input.tool as any));
      const pareto = eng.buildParetoFront(evaluated);
      return eng.selectOptimal(pareto, input.priority as any ?? "balanced");
    }
    case "stochastic_pareto": {
      const { stochasticToolpathRoutingEngine: eng } = await import("../../engines/StochasticToolpathRoutingEngine.js");
      return eng.buildParetoFront(input.evaluations as any);
    }
    case "inverse_thermal_compensate": {
      const { InverseThermalCompensationEngine } = await import("../../engines/InverseThermalCompensationEngine.js");
      const eng = new InverseThermalCompensationEngine();
      const field = eng.predictThermalField(input.machine as any, input.run_time_min as number);
      return eng.computeCompensation(field, input.coordinates as any);
    }
    case "inverse_thermal_warmup": {
      const { InverseThermalCompensationEngine } = await import("../../engines/InverseThermalCompensationEngine.js");
      const eng = new InverseThermalCompensationEngine();
      return eng.warmUpProfile(input.machine as any, input.max_time_min as number);
    }

    // ═══ Pipeline Integration ═══
    case "servo_lag_compensate": {
      const { MotionCompensationEngine } = await import("../../engines/MotionCompensationEngine.js");
      const eng = new MotionCompensationEngine();
      return eng.servoLagCompensation(input.blocks as any, input.params as any);
    }
    case "rotary_axis_check": {
      const { MotionCompensationEngine } = await import("../../engines/MotionCompensationEngine.js");
      const eng = new MotionCompensationEngine();
      return eng.rotaryAxisLimits(input.blocks as any, input.params as any);
    }
    case "controller_compatibility": {
      const { MotionCompensationEngine } = await import("../../engines/MotionCompensationEngine.js");
      const eng = new MotionCompensationEngine();
      return eng.checkControllerCompatibility(input.dialect as string, input.features as any);
    }
    case "bar_stock_analyze": {
      const { BarStockVibrationEngine } = await import("../../engines/BarStockVibrationEngine.js");
      const eng = new BarStockVibrationEngine();
      return eng.analyze(input.bar as any);
    }
    case "bar_stock_chatter": {
      const { BarStockVibrationEngine } = await import("../../engines/BarStockVibrationEngine.js");
      const eng = new BarStockVibrationEngine();
      return eng.chatterCheck(input.bar as any, input.rpm as number, input.flute_count as number);
    }
    case "tolerance_verify": {
      const { ToolpathIntegrationEngine } = await import("../../engines/ToolpathIntegrationEngine.js");
      const eng = new ToolpathIntegrationEngine();
      return eng.verifyToleranceBand(input.original as any, input.smoothed as any, input.tolerance_mm as number);
    }
    case "cut_reorder": {
      const { ToolpathIntegrationEngine } = await import("../../engines/ToolpathIntegrationEngine.js");
      const eng = new ToolpathIntegrationEngine();
      return eng.reorderCuts(input.cuts as any, input.start as any);
    }
    case "hole_reorder": {
      const { ToolpathIntegrationEngine } = await import("../../engines/ToolpathIntegrationEngine.js");
      const eng = new ToolpathIntegrationEngine();
      return eng.reorderHolePattern(input.holes as any, input.start as any);
    }
    case "learning_corrections": {
      const { ToolpathIntegrationEngine } = await import("../../engines/ToolpathIntegrationEngine.js");
      const eng = new ToolpathIntegrationEngine();
      return eng.applyLearningCorrections(input.blocks as any, input.factors as any);
    }
    case "distortion_predict": {
      const { ManufacturingIntegrationEngine } = await import("../../engines/ManufacturingIntegrationEngine.js");
      const eng = new ManufacturingIntegrationEngine();
      return eng.predictSetupDistortion(input.operations as any, input.material as any, input.stock_dims as any);
    }
    case "fixture_plan": {
      const { ManufacturingIntegrationEngine } = await import("../../engines/ManufacturingIntegrationEngine.js");
      const eng = new ManufacturingIntegrationEngine();
      return eng.planFixtureLayout(input.part_dims as any, input.operations as any, input.fixture_type as any);
    }
    case "trochoidal_variable_depth": {
      const { ManufacturingIntegrationEngine } = await import("../../engines/ManufacturingIntegrationEngine.js");
      const eng = new ManufacturingIntegrationEngine();
      return eng.variableDepthTrochoidal(input.pocket as any, input.tool as any, input.material as any);
    }
    case "gdt_propagate": {
      const { ManufacturingIntegrationEngine } = await import("../../engines/ManufacturingIntegrationEngine.js");
      const eng = new ManufacturingIntegrationEngine();
      return eng.propagateGDTUncertainty(input.features as any, input.capability as any);
    }

    // ═══ Pipeline Architecture ═══
    case "pipeline_record_predictions":
    case "pipeline_submit_actuals":
    case "pipeline_calibration":
    case "output_variants":
    case "route_features":
    case "parallel_optimize":
    case "voxel_init":
    case "voxel_subtract":
    case "voxel_volume":
    case "voxel_thin_walls":
    case "tolerance_driven_params": {
      const { PipelineArchitectureEngine } = await import("../../engines/PipelineArchitectureEngine.js");
      const eng = new PipelineArchitectureEngine();
      if (action === "route_features") return eng.routeFeatures(input.features as any);
      if (action === "parallel_optimize") return eng.optimizeParallelOps(input.operations as any, input.channels as number);
      if (action === "voxel_init") return eng.initializeVoxelGrid(input.dims as any, input.resolution as number);
      if (action === "voxel_volume") return eng.getVolumeRemaining(input.grid as any);
      if (action === "tolerance_driven_params") return eng.selectParametersForTolerance(input.target_cpk as number, input.tolerance_mm as number, input.sources as any);
      if (action === "output_variants") return eng.generateOutputVariants(input.pipeline_output as any, input.formats as any);
      if (action === "pipeline_calibration") return eng.getCalibrationReport();
      return { status: "delegated", action };
    }

    // ═══ CAM Kernel Extensions ═══
    case "turning_profile":
    case "nest_2d":
    case "parse_dxf":
    case "parse_svg":
    case "nl_cam_command":
    case "gcode_diff":
    case "dfm_analyze":
    case "dfm_feedback":
    case "cam_validate":
    case "integration_test": {
      // Lazy-load CPL-MS4 engines with method routing
      try {
        const { camKernelExtensionEngine: eng } = await import("../../engines/CAMKernelExtensionEngine.js");
        const methodMap: Record<string, string> = {
          turning_profile: "generateTurningProfile",
          nest_2d: "nestParts2D",
          parse_dxf: "parseDXF",
          parse_svg: "parseSVG",
          nl_cam_command: "interpretNLCommand",
          gcode_diff: "diffGCode",
        };
        const method = methodMap[action];
        if (method && typeof (eng as any)[method] === "function") {
          return (eng as any)[method](input.data ?? input);
        }
      } catch { /* engine not available */ }
      try {
        const valPath = "../../engines/CAMKernelValidationEngine.js";
        const valMod = await import(/* webpackIgnore: true */ valPath);
        const eng = new valMod.CAMKernelValidationEngine();
        const methodMap: Record<string, string> = {
          dfm_analyze: "analyzeDFM",
          dfm_feedback: "generateDFMFeedback",
          cam_validate: "validateCAMInput",
          integration_test: "runIntegrationTest",
        };
        const method = methodMap[action];
        if (method && typeof (eng as any)[method] === "function") {
          return (eng as any)[method](input.data ?? input);
        }
      } catch { /* engine not available */ }
      return { error: `Engine not available for action: ${action}` };
    }

    default:
      return { error: `Unknown CPL action: ${action}` };
  }
}

/** Action count for registry */
export const CPL_ACTION_COUNT = cplActionSchema.options.length;

/** Schema for validation */
export { cplActionSchema };
