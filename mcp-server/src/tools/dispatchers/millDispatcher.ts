/**
 * prism_mill — First-Class Milling Dispatcher (MILL-MASTER-P1-U01)
 *
 * Cohesion core for MILL-MASTER. Routes every mill action through
 * MillMasterOrchestratorFacadeEngine, which fans out to:
 *   - MillingAGIMasterEngine           (wisdom + validation)
 *   - MillingAGIOrchestrationEngine    (physics-state pipeline)
 *   - MillingUnifiedScienceOrchestrationEngine (7-domain synergy)
 *   - MillingEndToEndOrchestrationEngine (print-to-program)
 *
 * 46 actions grouped:
 *   - Facade routing  (7): orchestrate, quick, scientific, agi, validate, wisdom, print_to_program
 *   - Facade meta     (3): routing_map, self_awareness, coordinated_stats
 *   - AI layer        (5): agi_reason, agi_counterfactual, agi_explain, meta_adapt, rl_recommend
 *   - Scientific      (7): physics_analyze, force_kienzle, chatter_sld, thermal_predict,
 *                           wear_predict, deflection_check, surface_predict
 *   - Strategy+prog   (4): strategy_recommend, sequence_optimize, cycle_time_estimate, toolpath_validate
 *   - Machine+fix+hold(5): machine_select, capability_exploit, tool_holder_pair, fixture_select, workholding_force
 *   - Quality+meas    (4): setup_author, measurement_feedback, offset_adjust, probe_routine
 *   - Tribal+res      (3): tribal_search, resource_query, holder_recommend
 *   - Learn layer     (8): learn_ingest_pdf/video/programs, learn_harmonize, learn_train_model,
 *                           learn_eval, learn_deploy, learn_rollback
 *
 * Facade dependencies: MillMasterOrchestratorFacadeEngine (singleton)
 * Stub-but-not-placeholder: Actions that belong to future P-LEARN phase return
 * {pending: true, planned_phase: "P-LEARN-U0x"} so the schema is live and the
 * operator sees what's coming; no fake data is synthesized.
 */
import { z } from "zod";
import { log } from "../../utils/Logger.js";
import { slimResponse } from "../../utils/responseSlimmer.js";
import { validateActionParams, dispatcherError } from "../../utils/dispatcherMiddleware.js";
import { MILL_ACTION_SCHEMAS } from "../../schemas/millActionSchemas.js";
import { hookExecutor } from "../../engines/HookExecutor.js";

// Lazy engine loaders — facade is the primary; others are supplemental
let _facade: any;
let _agiMaster: any;
let _unifiedScience: any;
let _endToEnd: any;
let _agiOrch: any;
let _tribal: any;
let _resources: any;
let _holders: any;

async function getFacade(): Promise<any> {
  return (_facade ??= (await import("../../engines/MillMasterOrchestratorFacadeEngine.js"))
    .millMasterOrchestratorFacadeEngine);
}
async function getAGIMaster(): Promise<any> {
  return (_agiMaster ??= (await import("../../engines/MillingAGIMasterEngine.js"))
    .millingAGIMasterEngine);
}
async function getUnifiedScience(): Promise<any> {
  return (_unifiedScience ??= (await import("../../engines/MillingUnifiedScienceOrchestrationEngine.js"))
    .millingUnifiedScienceOrchestrationEngine);
}
async function getEndToEnd(): Promise<any> {
  return (_endToEnd ??= (await import("../../engines/MillingEndToEndOrchestrationEngine.js"))
    .millingEndToEndOrchestrationEngine);
}
async function getAGIOrch(): Promise<any> {
  return (_agiOrch ??= (await import("../../engines/MillingAGIOrchestrationEngine.js"))
    .millingAGIOrchestrationEngine);
}
async function getTribal(): Promise<any> {
  return (_tribal ??= (await import("../../engines/MillTribalKnowledgeEngine.js"))
    .millTribalKnowledgeEngine);
}
async function getResources(): Promise<any> {
  return (_resources ??= (await import("../../engines/MillResourceAwarenessEngine.js"))
    .millResourceAwarenessEngine);
}
async function getHolders(): Promise<any> {
  return (_holders ??= (await import("../../engines/ToolHolderRegistryEngine.js"))
    .toolHolderRegistryEngine);
}

// P4-U01-COL3: Collision engine lazy loader
let _collision: any;
async function getCollision(): Promise<any> {
  return (_collision ??= (await import("../../engines/MillKinematicsCollisionEngine.js"))
    .millKinematicsCollisionEngine);
}

// P4-U02-DIALECT: Controller dialect engine lazy loader
let _dialect: any;
async function getDialect(): Promise<any> {
  return (_dialect ??= (await import("../../engines/ControllerDialectEngine.js"))
    .controllerDialectEngine);
}

// P4-U03-MACHDB: JM Die machine config engine lazy loader
let _machineDb: any;
async function getMachineDb(): Promise<any> {
  return (_machineDb ??= (await import("../../engines/JmDieMachineConfigEngine.js"))
    .jmDieMachineConfigEngine);
}

// P4-U05-VISE: Workholding force engine lazy loader
let _workholdingForce: any;
async function getWorkholdingForce(): Promise<any> {
  return (_workholdingForce ??= (await import("../../engines/WorkholdingForceEngine.js"))
    .workholdingForceEngine);
}

// P4-U06-SCI: Tool deflection and chatter stability engines
let _toolDeflection: any;
async function getToolDeflection(): Promise<any> {
  return (_toolDeflection ??= (await import("../../engines/ToolDeflectionPredictionEngine.js"))
    .toolDeflectionPredictionEngine);
}

let _chatterSLD: any;
async function getChatterSLD(): Promise<any> {
  return (_chatterSLD ??= (await import("../../engines/ChatterStabilityLobeEngine.js"))
    .chatterStabilityLobeEngine);
}

// P4-U07-PHYS: Physics prediction engines (thermal, wear, surface)
let _cuttingThermal: any;
async function getCuttingThermal(): Promise<any> {
  return (_cuttingThermal ??= (await import("../../engines/CuttingThermalEngine.js"))
    .cuttingThermalEngine);
}

let _toolWearRate: any;
async function getToolWearRate(): Promise<any> {
  return (_toolWearRate ??= (await import("../../engines/ToolWearRateEngine.js"))
    .toolWearRateEngine);
}

let _surfaceFinish: any;
async function getSurfaceFinish(): Promise<any> {
  return (_surfaceFinish ??= (await import("../../engines/SurfaceFinishPredictorEngine.js"))
    .surfaceFinishPredictorEngine);
}

// P4-U08-EST: Cycle time estimator engine lazy loader
let _cycleTimeEstimator: any;
async function getCycleTimeEstimator(): Promise<any> {
  return (_cycleTimeEstimator ??= (await import("../../engines/CycleTimeEstimatorEngine.js"))
    .cycleTimeEstimatorEngine);
}

// P4-U09-VAL: G-code validation engine lazy loader
let _gcodeValidator: any;
async function getGcodeValidator(): Promise<any> {
  return (_gcodeValidator ??= (await import("../../engines/GCodeValidationEngine.js"))
    .gcodeValidationEngine);
}

// P1-U09-L2-AGG: L2 aggregator lazy loaders
let _fiveAxisAgg: any;
async function getFiveAxisAggregator(): Promise<any> {
  return (_fiveAxisAgg ??= (await import("../../engines/FiveAxisAggregatorEngine.js"))
    .fiveAxisAggregatorEngine);
}

let _multiAxisAgg: any;
async function getMultiAxisAggregator(): Promise<any> {
  return (_multiAxisAgg ??= (await import("../../engines/MultiAxisAggregatorEngine.js"))
    .multiAxisAggregatorEngine);
}

let _millTurnOrch: any;
async function getMillTurnOrchestration(): Promise<any> {
  return (_millTurnOrch ??= (await import("../../engines/MillTurnOrchestrationEngine.js"))
    .millTurnOrchestrationEngine);
}

// P4-U11-OPT: Mill program optimizer lazy loader
let _millProgramOptimizer: any;
async function getMillProgramOptimizer(): Promise<any> {
  return (_millProgramOptimizer ??= (await import("../../engines/MillProgramOptimizerEngine.js"))
    .millProgramOptimizerEngine);
}

// P4-U12-5AX-DEC: Five-axis decision engine lazy loader
let _fiveAxisDecide: any;
async function getFiveAxisDecisionEngine(): Promise<any> {
  return (_fiveAxisDecide ??= (await import("../../engines/FiveAxisDecisionEngine.js"))
    .FiveAxisDecisionEngine);
}

const ACTIONS = [
  // Facade routing
  "mill_orchestrate", "mill_quick", "mill_scientific", "mill_agi",
  "mill_validate", "mill_wisdom", "mill_print_to_program",
  // Facade meta
  "mill_routing_map", "mill_self_awareness", "mill_coordinated_stats",
  // AI layer
  "mill_agi_reason", "mill_agi_counterfactual", "mill_agi_explain",
  "mill_meta_adapt", "mill_rl_recommend",
  // Scientific
  "mill_physics_analyze", "mill_force_kienzle", "mill_chatter_sld",
  "mill_thermal_predict", "mill_wear_predict", "mill_deflection_check",
  "mill_surface_predict",
  // Strategy + program
  "mill_strategy_recommend", "mill_sequence_optimize",
  "mill_cycle_time_estimate", "mill_toolpath_validate",
  // Machine + fixture + holder
  "mill_machine_select", "mill_capability_exploit", "mill_tool_holder_pair",
  "mill_fixture_select", "mill_workholding_force", "mill_workholding_chuck",
  // Quality + measurement
  "mill_setup_author", "mill_measurement_feedback", "mill_offset_adjust",
  "mill_probe_routine",
  // Tribal + resources
  "mill_tribal_search", "mill_resource_query", "mill_holder_recommend",
  // Learn layer (P-LEARN)
  "mill_learn_ingest_pdf", "mill_learn_ingest_video", "mill_learn_ingest_programs",
  "mill_learn_harmonize", "mill_learn_train_model", "mill_learn_eval",
  "mill_learn_deploy", "mill_learn_rollback",
  // P4-U01-COL3: Collision detection
  "mill_collision_check", "mill_rapid_clearance", "mill_adaptive_stepdown",
  // P4-U02-DIALECT: Controller dialect reconciliation
  "mill_dialect_get", "mill_dialect_list", "mill_dialect_translate",
  "mill_dialect_validate", "mill_dialect_features",
  // P4-U03-MACHDB: JM Die machine database
  "mill_machine_db_get", "mill_machine_db_list", "mill_machine_db_filter",
  "mill_machine_db_mills", "mill_machine_db_capabilities",
  // P1-U09-L2-AGG: L2 aggregator actions
  "mill_five_axis_aggregate", "mill_multi_axis_aggregate", "mill_turn_orchestrate",
  // P4-U11-OPT: Program optimizer
  "mill_program_optimize",
  // P4-U12-5AX-DEC: Five-axis decision
  "mill_five_axis_decide",
] as const;

type MillAction = (typeof ACTIONS)[number];

/** Future-phase marker — distinguishes planned actions from stubs. */
function pending(phaseUnit: string, reason: string): Record<string, unknown> {
  return {
    pending: true,
    planned_phase: phaseUnit,
    reason,
    action_callable: true,
    data_available: false,
  };
}

/**
 * Routes a mill action through the facade + supporting engines.
 *
 * @param action — Mill dispatcher action name
 * @param params — Normalized + schema-validated parameters
 * @returns Structured result (never a raw primitive)
 */
async function executeAction(action: MillAction, params: Record<string, any>): Promise<any> {
  const facade = await getFacade();

  switch (action) {
    // ── Facade routing ─────────────────────────────────────────
    case "mill_orchestrate":
      return facade.orchestrate(params);
    case "mill_quick":
      return facade.orchestrate({ ...params, type: "quick" });
    case "mill_scientific":
      return facade.orchestrate({ ...params, type: "scientific" });
    case "mill_agi":
      return facade.orchestrate({ ...params, type: "agi" });
    case "mill_validate":
      return facade.orchestrate({ ...params, type: "validate" });
    case "mill_wisdom":
      return facade.orchestrate({ ...params, type: "wisdom" });
    case "mill_print_to_program":
      return facade.orchestrate({ ...params, type: "print_to_program" });

    // ── Facade meta ─────────────────────────────────────────────
    case "mill_routing_map":
      return facade.getRoutingMap();
    case "mill_self_awareness":
      return facade.getSelfAwareness();
    case "mill_coordinated_stats":
      return facade.getCoordinatedStats();

    // ── AI layer (routes through facade type=agi) ──────────────
    case "mill_agi_reason":
      return facade.orchestrate({ ...params, type: "agi" });
    case "mill_agi_counterfactual": {
      const agi = await getAGIMaster();
      if (typeof agi.counterfactual === "function") return agi.counterfactual(params);
      return facade.orchestrate({ ...params, type: "agi" });
    }
    case "mill_agi_explain": {
      const agi = await getAGIMaster();
      if (typeof agi.explain === "function") return agi.explain(params);
      return facade.orchestrate({ ...params, type: "agi" });
    }
    case "mill_meta_adapt": {
      const orch = await getAGIOrch();
      if (typeof orch.metaAdapt === "function") return orch.metaAdapt(params);
      return { note: "meta-adapt invoked via AGI orch", result: facade.orchestrate({ ...params, type: "agi" }) };
    }
    case "mill_rl_recommend": {
      const orch = await getAGIOrch();
      if (typeof orch.rlRecommend === "function") return orch.rlRecommend(params);
      return facade.orchestrate({ ...params, type: "agi" });
    }

    // ── Scientific layer ────────────────────────────────────────
    case "mill_physics_analyze":
      return facade.orchestrate({ ...params, type: "scientific" });
    case "mill_force_kienzle": {
      const uni = await getUnifiedScience();
      const Vc = params.cutting_speed_m_min ?? 100;
      const fz = params.feed_per_tooth_mm;
      const ap = params.axial_depth_mm;
      const ae = params.radial_depth_mm ?? 6;
      const D = params.tool_diameter_mm;
      return uni.quickAnalyze(params.material, Vc, fz, ap, ae, D);
    }
    case "mill_chatter_sld": {
      const sld = await getChatterSLD();
      return sld.compute({
        tool: {
          diameter_mm: params.tool_diameter_mm,
          flute_count: params.tool_flutes ?? 4,
          overhang_mm: params.tool_overhang_mm,
          material: params.tool_material ?? "carbide",
        },
        workpiece: {
          iso_group: params.material_iso ?? "P",
          kc11_mpa: params.kc11_mpa,
        },
        machine: {
          machine_id: params.machine_id,
          natural_frequency_hz: params.natural_frequency_hz,
          damping_ratio: params.damping_ratio,
          stiffness_n_um: params.stiffness_n_um,
          max_rpm: params.max_rpm,
          min_rpm: params.min_rpm,
        },
        cutting: {
          radial_immersion_ratio: params.radial_immersion_ratio ?? 0.5,
          up_milling: params.up_milling ?? false,
          cutting_speed_mpm: params.cutting_speed_mpm,
        },
        rpm_range: params.min_rpm && params.max_rpm ? [params.min_rpm, params.max_rpm] : undefined,
        process_damping: params.process_damping_clearance_deg ? {
          clearance_angle_deg: params.process_damping_clearance_deg,
          wear_land_mm: params.process_damping_wear_land_mm,
        } : undefined,
      });
    }
    case "mill_deflection_check": {
      const defl = await getToolDeflection();
      return defl.calculate({
        tool_diameter_mm: params.tool_diameter_mm,
        tool_overhang_mm: params.tool_overhang_mm,
        cutting_force_N: params.cutting_force_n,
        force_direction: params.force_direction,
        tool_material: params.tool_material,
        holder_diameter_mm: params.holder_diameter_mm,
        holder_length_mm: params.holder_length_mm,
        flute_count: params.flute_count,
        helix_angle_deg: params.helix_angle_deg,
        tolerance_target_mm: params.tolerance_target_mm,
      });
    }
    case "mill_thermal_predict": {
      const thermal = await getCuttingThermal();
      const Vc = params.cutting_speed_m_min ?? params.cutting_speed_mpm ?? 100;
      const f = params.feed_per_tooth_mm ?? params.feed_mm ?? 0.1;
      const ap = params.axial_depth_mm ?? params.depth_of_cut_mm ?? 2;
      const shearStrength = params.shear_strength_mpa ?? 400;
      const shearAngle = (params.shear_angle_deg ?? 25) * Math.PI / 180;
      const rakeAngle = (params.rake_angle_deg ?? 6) * Math.PI / 180;
      const shearResult = thermal.shearPlaneTemperature({
        cuttingSpeed: Vc,
        feed: f,
        shearStrength,
        shearAngle,
        rakeAngle,
        material: {
          density: params.material_density_kg_m3,
          specificHeat: params.material_specific_heat_j_kgk,
          thermalConductivity: params.material_thermal_conductivity_w_mk,
          ambientTemp: params.ambient_temp_c ?? 25,
        },
      });
      const interfaceResult = thermal.toolChipInterfaceTemp({
        cuttingSpeed: Vc,
        feed: f,
        depthOfCut: ap,
        specificCuttingEnergy: params.specific_cutting_energy_j_mm3 ?? 3.5,
        material: {
          density: params.material_density_kg_m3,
          specificHeat: params.material_specific_heat_j_kgk,
          thermalConductivity: params.material_thermal_conductivity_w_mk,
          ambientTemp: params.ambient_temp_c ?? 25,
        },
        tool: {
          thermalConductivity: params.tool_thermal_conductivity_w_mk,
          density: params.tool_density_kg_m3,
          specificHeat: params.tool_specific_heat_j_kgk,
        },
      });
      const partitionResult = thermal.heatPartition({
        cuttingSpeed: Vc,
        workMaterial: params.work_material,
        toolMaterial: params.tool_material,
      });
      return {
        shear_zone: shearResult,
        interface: interfaceResult,
        heat_partition: partitionResult,
        summary: {
          peak_temperature_c: Math.max(shearResult.shearZoneTemp_C, interfaceResult.interfaceTemperature_C),
          tool_average_temp_c: interfaceResult.toolAverageTemp_C,
          heat_to_chip_pct: partitionResult.toChip_percent,
          heat_to_tool_pct: partitionResult.toTool_percent,
          heat_regime: shearResult.heatRegime,
        },
      };
    }
    case "mill_wear_predict": {
      const wear = await getToolWearRate();
      const result = wear.calculate({
        cutting_speed_mpm: params.cutting_speed_m_min ?? params.cutting_speed_mpm ?? 100,
        feed_mm: params.feed_per_tooth_mm ?? params.feed_mm ?? 0.15,
        depth_of_cut_mm: params.axial_depth_mm ?? params.depth_of_cut_mm ?? 1,
        tool_material: params.tool_substrate ?? params.tool_material ?? "carbide",
        work_material: params.work_material ?? "steel",
        current_flank_wear_mm: params.current_flank_wear_mm,
        max_flank_wear_mm: params.max_flank_wear_mm ?? 0.3,
        cutting_time_min: params.cutting_time_min,
      });
      return result;
    }
    case "mill_surface_predict": {
      const surface = await getSurfaceFinish();
      const segments = params.segments ?? [{
        x: 0, y: 0, z: 0,
        ae_mm: params.radial_depth_mm ?? params.stepover_mm ?? 1,
        ap_mm: params.axial_depth_mm ?? 2,
        rpm: params.spindle_rpm ?? 10000,
        feed_mmmin: params.feed_rate_mmmin ?? 1000,
        fz_mm: params.feed_per_tooth_mm,
      }];
      const tool = params.tool ?? {
        type: params.tool_type ?? "flat",
        diameter_mm: params.tool_diameter_mm ?? 10,
        corner_radius_mm: params.corner_radius_mm,
        flute_count: params.flute_count ?? 4,
        edge_radius_um: params.edge_radius_um ?? 5,
      };
      const result = surface.predict({
        segments,
        tool,
        algorithm: params.algorithm,
        target_ra_um: params.target_ra_um ?? 1.6,
        material: params.material ?? params.work_material,
        coolant: params.coolant_mode ?? params.coolant,
      });
      return result;
    }

    // ── Strategy + program ──────────────────────────────────────
    case "mill_strategy_recommend":
      return facade.orchestrate({ ...params, type: "agi" });
    case "mill_sequence_optimize":
      return pending("P73-U05-SEQUENCE-OPTIMIZE", "MillOperationSequenceOptimizerEngine lands in P73");
    case "mill_cycle_time_estimate": {
      // P4-U08-EST: Direct wiring to CycleTimeEstimatorEngine
      // Physics: S-curve velocity profiles, corner deceleration, servo settling,
      // block processing overhead, tool change time, spindle accel
      const estimator = await getCycleTimeEstimator();
      const controllerType = (params.controller ?? "fanuc").toLowerCase();
      const config = {
        controller: controllerType as "fanuc" | "haas" | "siemens" | "heidenhain" | "mazak" | "okuma",
        machine_profile: params.machine_profile,
        include_breakdown: params.include_breakdown ?? true,
        path_tolerance: params.path_tolerance ?? 0.01,
        model_look_ahead: params.model_look_ahead ?? true,
        kinematics_override: params.kinematics_override,
      };
      return estimator.estimateFromGCode(params.gcode, config);
    }
    case "mill_toolpath_validate": {
      // P4-U09-VAL: Direct wiring to GCodeValidationEngine
      // Modal state tracking, arc geometry, G/M-code support per controller,
      // machine envelope checking
      const validator = await getGcodeValidator();
      const controller = (params.controller ?? "FANUC").toUpperCase() as "FANUC" | "HAAS" | "MAZAK";
      const result = validator.validate(params.gcode, controller);
      // Optionally check machine envelope if provided
      if (params.machine_envelope && typeof validator.checkEnvelope === "function") {
        const envelopeResult = validator.checkEnvelope(params.gcode, params.machine_envelope);
        return { ...result, envelope: envelopeResult };
      }
      return result;
    }

    // ── Machine + fixture + holder ──────────────────────────────
    case "mill_machine_select":
      return pending("P73-U02-MACHINE-PICK", "MillMachineSelectionEngine lands in P73");
    case "mill_capability_exploit":
      return pending("P73-U03-CAPABILITY-EXPLOIT", "MillMaxCapabilityEngine lands in P73");
    case "mill_tool_holder_pair":
      return pending("P73-U04-TOOL-HOLDER-PAIR", "MillToolHolderPairingEngine lands in P73");
    case "mill_fixture_select":
      return pending("P52", "Workholding exhaustive catalog + selector lands in P52");
    case "mill_workholding_force": {
      const wh = await getWorkholdingForce();
      return wh.clampForce({
        cutting_force_n: params.cutting_force_n,
        workholding_type: params.workholding_type,
        friction_coefficient: params.friction_coefficient,
        safety_factor: params.safety_factor,
        num_clamps: params.num_clamps,
        workpiece_mass_kg: params.workpiece_mass_kg,
      });
    }
    case "mill_workholding_chuck": {
      const wh = await getWorkholdingForce();
      return wh.chuckForce({
        cutting_force_tangential_n: params.cutting_force_tangential_n,
        cutting_force_radial_n: params.cutting_force_radial_n,
        workpiece_diameter_mm: params.workpiece_diameter_mm,
        chuck_diameter_mm: params.chuck_diameter_mm,
        rpm: params.rpm,
        workpiece_mass_kg: params.workpiece_mass_kg,
        num_jaws: params.num_jaws,
        friction_coefficient: params.friction_coefficient,
        safety_factor: params.safety_factor,
      });
    }

    // ── Quality + measurement ───────────────────────────────────
    case "mill_setup_author":
      return pending("P73-U01-SETUP-AUTHOR", "MillSetupAuthoringEngine lands in P73");
    case "mill_measurement_feedback":
      return pending("P73-U06-MEASUREMENT-FEEDBACK", "MillMeasurementFeedbackEngine lands in P73");
    case "mill_offset_adjust": {
      // Sanity gate — operator approval is MANDATORY for NC-side correction
      if (!params.operator_approved) {
        return {
          applied: false,
          reason: "operator_approval_required",
          policy: "NC-side correction requires explicit operator gate (P73-U06 contract)",
        };
      }
      return pending("P73-U06-MEASUREMENT-FEEDBACK", "Applied-correction log lands in P73");
    }
    case "mill_probe_routine":
      return pending("P59", "Probe-macro authoring lands in P59 Inspection Exhaustive");

    // ── Tribal + resources ──────────────────────────────────────
    case "mill_tribal_search": {
      const tribal = await getTribal();
      return tribal.query(params);
    }
    case "mill_resource_query": {
      const res = await getResources();
      return res.query(params);
    }
    case "mill_holder_recommend": {
      const holders = await getHolders();
      return holders.recommendForTool(
        params.tool_diameter_mm,
        params.spindle_taper,
        params.rpm,
        params.operation_class ?? "rough",
      );
    }

    // ── Learn layer (all stubbed to P-LEARN with specific unit) ─
    case "mill_learn_ingest_pdf":
      return pending("P-LEARN-U01-MILL-PDF-HARVEST", "MillPDFCorpusHarvesterEngine wraps /pdf-learn");
    case "mill_learn_ingest_video":
      return pending("P-LEARN-U02-MILL-VIDEO-HARVEST", "MillVideoCorpusHarvesterEngine wraps /video-learn");
    case "mill_learn_ingest_programs":
      return pending("P-LEARN-U03-MILL-PROGRAM-HARVEST", "JM Die + online program harvester");
    case "mill_learn_harmonize":
      return pending("P-LEARN-U04-MILL-CORPUS-HARMONIZE", "Dedup/ITAR/license/splits");
    case "mill_learn_train_model":
      return pending("P-LEARN-U05-to-U09", `Trainer for ${params.model ?? "unknown model"}`);
    case "mill_learn_eval":
      return pending("P-LEARN-U10-MILL-EVAL-HARNESS", "Held-out eval + deployment gate");
    case "mill_learn_deploy":
      return pending("P-LEARN-U10-MILL-EVAL-HARNESS", "Deployment gate + model registry");
    case "mill_learn_rollback":
      return pending("P-LEARN-U10-MILL-EVAL-HARNESS", "Model registry rollback");

    // ═══════════════════════════════════════════════════════════════════════
    // P4-U01-COL3: COLLISION DETECTION
    // ═══════════════════════════════════════════════════════════════════════

    case "mill_collision_check": {
      const collision = await getCollision();
      const result = collision.checkToolpathCollisions(
        params.toolpath,
        params.tool,
        params.holder ?? null,
        params.obstacles,
        params.safety_margin_mm ?? 2.0
      );
      return slimResponse({
        action: "mill_collision_check",
        ...result,
      });
    }

    case "mill_rapid_clearance": {
      const collision = await getCollision();
      const result = collision.validateRapidClearance(
        params.rapid_points,
        params.obstacles,
        params.clearance_mm ?? 5.0
      );
      return slimResponse({
        action: "mill_rapid_clearance",
        ...result,
      });
    }

    case "mill_adaptive_stepdown": {
      const collision = await getCollision();
      const result = collision.calculateAdaptiveStepDown(
        params.tool_position,
        params.tool,
        params.obstacles,
        params.programmed_doc_mm,
        params.safety_margin_mm ?? 2.0
      );
      return slimResponse({
        action: "mill_adaptive_stepdown",
        ...result,
      });
    }

    // ── P4-U02-DIALECT: Controller dialect reconciliation ──────────
    case "mill_dialect_get": {
      const dialect = await getDialect();
      const info = dialect.getDialect(params.controller);
      return slimResponse({
        action: "mill_dialect_get",
        controller: params.controller,
        dialect: info,
      });
    }

    case "mill_dialect_list": {
      const dialect = await getDialect();
      const dialects = dialect.listDialects();
      return slimResponse({
        action: "mill_dialect_list",
        count: dialects.length,
        dialects,
      });
    }

    case "mill_dialect_translate": {
      const dialect = await getDialect();
      const translated = dialect.translateCannedCycle(
        params.cycle,
        params.from_controller,
        params.to_controller
      );
      return slimResponse({
        action: "mill_dialect_translate",
        original: params.cycle,
        from: params.from_controller,
        to: params.to_controller,
        translated,
      });
    }

    case "mill_dialect_validate": {
      const dialect = await getDialect();
      const validation = dialect.validateLine(params.controller, params.line);
      return slimResponse({
        action: "mill_dialect_validate",
        controller: params.controller,
        line: params.line,
        ...validation,
      });
    }

    case "mill_dialect_features": {
      const dialect = await getDialect();
      const codes = dialect.getFeatureCodes(params.controller, params.operation_type);
      return slimResponse({
        action: "mill_dialect_features",
        controller: params.controller,
        operation_type: params.operation_type,
        feature_codes: codes,
      });
    }

    // ── P4-U03-MACHDB: JM Die machine database ─────────────────────
    case "mill_machine_db_get": {
      const db = await getMachineDb();
      const config = db.getConfig(params.machine_id);
      if (!config) {
        return slimResponse({
          action: "mill_machine_db_get",
          success: false,
          error: `Machine not found: ${params.machine_id}`,
        });
      }
      return slimResponse({
        action: "mill_machine_db_get",
        success: true,
        machine: config,
      });
    }

    case "mill_machine_db_list": {
      const db = await getMachineDb();
      const machines = db.getAllConfigs();
      return slimResponse({
        action: "mill_machine_db_list",
        count: machines.length,
        machines: machines.map((m: any) => ({
          id: m.id,
          name: m.name,
          oem: m.oem,
          type: m.type,
          status: m.status,
        })),
      });
    }

    case "mill_machine_db_filter": {
      const db = await getMachineDb();
      let machines: any[];
      if (params.filter_type === "type") {
        machines = db.getByType(params.filter_value);
      } else if (params.filter_type === "oem") {
        machines = db.getByOem(params.filter_value);
      } else {
        machines = db.getAllConfigs();
      }
      return slimResponse({
        action: "mill_machine_db_filter",
        filter: { type: params.filter_type, value: params.filter_value },
        count: machines.length,
        machines,
      });
    }

    case "mill_machine_db_mills": {
      const db = await getMachineDb();
      const mills = db.getMills();
      return slimResponse({
        action: "mill_machine_db_mills",
        count: mills.length,
        mills,
      });
    }

    case "mill_machine_db_capabilities": {
      const db = await getMachineDb();
      const config = db.getConfig(params.machine_id);
      if (!config) {
        return slimResponse({
          action: "mill_machine_db_capabilities",
          success: false,
          error: `Machine not found: ${params.machine_id}`,
        });
      }
      return slimResponse({
        action: "mill_machine_db_capabilities",
        success: true,
        machine_id: config.id,
        capabilities: {
          axes: config.axes,
          spindle: config.spindle,
          work_envelope: config.workEnvelope,
          tool_capacity: config.toolCapacity,
          coolant_modes: config.coolantModes,
          probing: config.probing,
          controller: config.controller,
          g_code_dialect: config.gCodeDialect,
        },
      });
    }

    // ── P1-U09-L2-AGG: L2 aggregators ─────────────────────────
    case "mill_five_axis_aggregate": {
      const agg = await getFiveAxisAggregator();
      const op = params.op as string;
      if (op === "list") return { members: agg.list(), count: agg.count() };
      if (op === "count") return { count: agg.count() };
      if (op === "self_awareness") return agg.getSelfAwareness();
      if (op === "invoke") {
        const member = params.member;
        const method = params.method;
        const args = Array.isArray(params.args) ? params.args : [];
        return await agg.invoke(member, method, ...args);
      }
      return { error: `Unknown op for mill_five_axis_aggregate: ${op}` };
    }
    case "mill_multi_axis_aggregate": {
      const agg = await getMultiAxisAggregator();
      const op = params.op as string;
      if (op === "list") return { members: agg.list(), count: agg.count() };
      if (op === "count") return { count: agg.count() };
      if (op === "self_awareness") return agg.getSelfAwareness();
      if (op === "invoke") {
        const member = params.member;
        const method = params.method;
        const args = Array.isArray(params.args) ? params.args : [];
        return await agg.invoke(member, method, ...args);
      }
      return { error: `Unknown op for mill_multi_axis_aggregate: ${op}` };
    }
    case "mill_turn_orchestrate": {
      const orch = await getMillTurnOrchestration();
      const op = params.op as string;
      if (op === "list") return { members: orch.list(), count: orch.count() };
      if (op === "count") return { count: orch.count() };
      if (op === "self_awareness") return orch.getSelfAwareness();
      if (op === "route") return orch.route(params.ctx ?? {});
      if (op === "invoke") {
        const member = params.member;
        const method = params.method;
        const args = Array.isArray(params.args) ? params.args : [];
        return await orch.invoke(member, method, ...args);
      }
      return { error: `Unknown op for mill_turn_orchestrate: ${op}` };
    }

    // ── P4-U11-OPT: Program optimizer ─────────────────────────
    case "mill_program_optimize": {
      const opt = await getMillProgramOptimizer();
      const op = params.op as string;
      if (op === "list") return { optimizations: opt.getOptimizations() };
      if (op === "report") return { report: opt.generateReport() };
      if (op === "optimize") {
        if (typeof params.file_path !== "string") {
          return { error: "mill_program_optimize op=optimize requires string file_path" };
        }
        const result = await opt.optimizeProgram(params.file_path);
        return result ?? { error: `Could not optimize ${params.file_path}` };
      }
      return { error: `Unknown op for mill_program_optimize: ${op}` };
    }

    // ── P4-U12-5AX-DEC: Five-axis decision ────────────────────
    case "mill_five_axis_decide": {
      const DecisionCls = await getFiveAxisDecisionEngine();
      // Build full input — use OKUMA default if machine not provided
      const { OKUMA_M460V_5AX } = await import("../../engines/FiveAxisDecisionEngine.js");
      const input = {
        part_features: params.part_features ?? [],
        machine: params.machine ?? OKUMA_M460V_5AX,
        tool: params.tool,
        material: params.material,
        batch_size: params.batch_size,
        operator_skill: params.operator_skill,
        feed_rate_mm_per_min: params.feed_rate_mm_per_min,
        include_reasoning: params.include_reasoning ?? false,
        use_llm_reasoning: params.use_llm_reasoning ?? false,
      };
      return DecisionCls.decide(input);
    }

    default:
      return { error: `Unknown action: ${action as string}` };
  }
}

/** Registers the milling dispatcher with the MCP server.
 * @param server - MCP server instance
 * @returns void
 */
export function registerMillDispatcher(server: any): void {
  server.tool(
    "prism_mill",
    `Milling dispatcher (MILL-MASTER cohesion core). Single entry for all milling AI orchestration.
Routes through MillMasterOrchestratorFacadeEngine → 4 sub-orchestrators + 3 resource engines.
46 actions across facade routing, AI reasoning, scientific physics, strategy/program, machine/fixture/holder, quality/measurement, tribal/resources, and P-LEARN training pipeline.
Actions: ${ACTIONS.join(", ")}.`,
    { action: z.enum(ACTIONS), params: z.record(z.string(), z.any()).optional() },
    async ({ action, params: rawParams = {} }: { action: MillAction; params?: Record<string, any> }) => {
      log.info(`[prism_mill] Action: ${action}`);
      let result: any;
      try {
        // Parameter normalization (snake_case → camelCase where engines expect it)
        let params = rawParams;
        try {
          const { normalizeParams } = await import("../../utils/paramNormalizer.js");
          params = normalizeParams(rawParams);
        } catch {
          /* normalizer not available — use raw */
        }

        // Per-action Zod validation — STRICT (safety-critical)
        const validation = validateActionParams(action, params, MILL_ACTION_SCHEMAS);
        if (!validation.valid) {
          return dispatcherError(
            `Invalid params for '${action}': ${validation.errorMessage}`,
            action,
            "prism_mill",
          );
        }

        // Pre-calculation safety hooks — blocking
        const hookCtx = {
          operation: action,
          target: { type: "calculation" as const, id: action, data: params },
          metadata: { dispatcher: "millDispatcher", action, params },
        };
        const preResult = await hookExecutor.execute("pre-calculation", hookCtx);
        if (preResult.blocked) {
          return {
            content: [
              {
                type: "text",
                text: JSON.stringify({
                  blocked: true,
                  blocker: preResult.blockedBy,
                  reason: preResult.summary,
                  action,
                }),
              },
            ],
          };
        }

        result = await executeAction(action, params);

        // Post-calculation hooks — non-blocking
        try {
          await hookExecutor.execute("post-calculation", {
            ...hookCtx,
            metadata: { ...hookCtx.metadata, result },
          });
        } catch (postErr) {
          log.warn(`[prism_mill] Post-calculation hook error: ${postErr}`);
        }
      } catch (error: any) {
        if (error?.name === "SafetyBlockError") throw error;
        return dispatcherError(error, action, "prism_mill");
      }
      return { content: [{ type: "text" as const, text: JSON.stringify(slimResponse(result)) }] };
    },
  );
}

export { ACTIONS as MILL_DISPATCHER_ACTIONS };
