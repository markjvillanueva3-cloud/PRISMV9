/**
 * Mill Dispatcher Action Schemas
 * ===============================
 * Per-action Zod schemas for `prism_mill` dispatcher.
 * MILL-MASTER/P1-U01-MILL-DISP, P1-U04-SA-INTEG
 *
 * 49 actions covering: print-to-program pipeline, strategy, toolpath,
 * physics, collision, tool selection, AI/AGI, self-awareness, digital twin, scientific pipeline.
 *
 * @module schemas/millActionSchemas
 * @version 1.1.0
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";
// MS-PRINT-PROGRAM-LOOP / U-PPL-A5: re-use engine's exported schema as the
// single source of truth (Reviewer B P1-1 anti-drift fix). The engine
// exports MillPartGeometryInputSchema specifically so the dispatcher schema
// can re-use it without duplicating fields. ./describe() can layer on top.
import {
  MillPartGeometryInputSchema,
  MillPartFamilySchema,
  MILL_PART_CLASSIFY_BATCH_MAX,
} from "../engines/MillPartClassifierEngine.js";

// ─── Shared enums & primitives ──────────────────────────────────────────────

/** ISO material group codes */
const isoMaterialGroup = z
  .enum(["P", "M", "K", "N", "S", "H"])
  .describe("ISO material group (P=steel, M=stainless, K=cast iron, N=aluminum, S=superalloy, H=hardened).");

/** Milling strategy types */
const millingStrategy = z
  .enum([
    "roughing",
    "finishing",
    "adaptive_clearing",
    "prism_forces",
    "hsm",
    "trochoidal",
    "peel_milling",
    "plunge_milling",
    "rest_machining",
    "pencil",
    "waterline",
    "scallop",
  ])
  .describe("Milling strategy type.");

/** Toolpath types */
const toolpathType = z
  .enum([
    "pocket",
    "contour",
    "face",
    "slot",
    "drill",
    "bore",
    "thread_mill",
    "engrave",
    "adaptive",
    "3d_finishing",
  ])
  .describe("Toolpath operation type.");

/** Tool geometry definition */
const toolGeometry = z
  .object({
    diameter_mm: z.number().positive().describe("Tool diameter in mm."),
    flutes: z.number().int().positive().describe("Number of flutes."),
    flute_length_mm: z.number().positive().optional().describe("Flute length in mm."),
    overall_length_mm: z.number().positive().optional().describe("Overall tool length in mm."),
    corner_radius_mm: z.number().nonnegative().optional().describe("Corner radius for bull nose tools."),
    helix_angle_deg: z.number().optional().describe("Helix angle in degrees."),
    coating: z.string().optional().describe("Tool coating (TiAlN, AlCrN, etc)."),
  })
  .passthrough();

/** Cutting parameters */
const cuttingParams = z
  .object({
    rpm: z.number().positive().optional().describe("Spindle speed in RPM."),
    feed_mmpm: z.number().positive().optional().describe("Feed rate in mm/min."),
    feed_per_tooth: z.number().positive().optional().describe("Feed per tooth in mm."),
    doc_mm: z.number().positive().optional().describe("Depth of cut in mm."),
    woc_mm: z.number().positive().optional().describe("Width of cut in mm."),
    radial_engagement: z.number().min(0).max(1).optional().describe("Radial engagement as fraction."),
    axial_engagement: z.number().min(0).max(1).optional().describe("Axial engagement as fraction."),
    coolant: z.enum(["flood", "mist", "through_spindle", "air", "none"]).optional(),
  })
  .passthrough();

/** Machine configuration */
const machineConfig = z
  .object({
    machine_id: z.string().optional().describe("Machine identifier."),
    max_rpm: z.number().positive().optional().describe("Max spindle RPM."),
    max_power_kw: z.number().positive().optional().describe("Max spindle power in kW."),
    max_torque_nm: z.number().positive().optional().describe("Max torque in Nm."),
    travel_x_mm: z.number().positive().optional(),
    travel_y_mm: z.number().positive().optional(),
    travel_z_mm: z.number().positive().optional(),
    has_4th_axis: z.boolean().optional(),
    has_5th_axis: z.boolean().optional(),
  })
  .passthrough();

// ─── PRINT-TO-PROGRAM PIPELINE ──────────────────────────────────────────────

const mill_print_to_program = z
  .object({
    part_description: z.string().min(1).optional().describe("Natural language part description."),
    features: z.array(z.record(z.string(), z.unknown())).optional().describe("Extracted or specified features."),
    material: z.string().optional().describe("Material spec (e.g., '6061-T6')."),
    iso_group: isoMaterialGroup.optional(),
    machine: machineConfig.optional(),
    output_format: z.enum(["gcode", "nc", "tap"]).optional(),
  })
  .passthrough();

const mill_feature_recognize = z
  .object({
    geometry: z.unknown().optional().describe("CAD geometry input (STEP, BREP, mesh)."),
    filepath: z.string().optional().describe("Path to CAD file."),
    recognition_depth: z.enum(["basic", "standard", "deep"]).optional(),
  })
  .passthrough();

const mill_process_plan = z
  .object({
    features: z.array(z.record(z.string(), z.unknown())).min(1).describe("Features to plan operations for."),
    material: z.string().optional(),
    iso_group: isoMaterialGroup.optional(),
    machine: machineConfig.optional(),
    optimize_for: z.enum(["time", "quality", "tool_life", "balanced"]).optional(),
  })
  .passthrough();

// KILO-P2P-RECONCILE-MS0/U-KP2P-01: mill_generate_gcode routes to
// MillingPrintToProgramEngine.runFullPipeline, which is features-driven and
// emits the G-code in result.program_text. The legacy operations[]-required
// schema backed the MillPrintToProgramEngine stub (never ran — no real caller
// depends on it), so this schema now mirrors mill_print_to_program. Extra
// fields (controller, program_number, etc.) still reach the engine via
// .passthrough().
const mill_generate_gcode = z
  .object({
    part_description: z.string().min(1).optional().describe("Natural language part description."),
    features: z.array(z.record(z.string(), z.unknown())).optional().describe("Extracted or specified features."),
    material: z.string().optional().describe("Material spec (e.g., '6061-T6')."),
    iso_group: isoMaterialGroup.optional(),
    machine: machineConfig.optional(),
    output_format: z.enum(["gcode", "nc", "tap"]).optional(),
  })
  .passthrough();

const mill_validate_program = z
  .object({
    gcode: z.string().min(1).optional().describe("G-code program to validate."),
    filepath: z.string().optional().describe("Path to NC file."),
    machine: machineConfig.optional(),
    check_collisions: z.boolean().optional(),
    check_limits: z.boolean().optional(),
  })
  .passthrough();

// ─── STRATEGY SELECTION ─────────────────────────────────────────────────────

const mill_strategy_select = z
  .object({
    feature_type: z.string().optional().describe("Feature type (pocket, boss, face, etc)."),
    material: z.string().optional(),
    iso_group: isoMaterialGroup.optional(),
    depth_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    tolerance_mm: z.number().positive().optional(),
    surface_finish_ra: z.number().positive().optional(),
  })
  .passthrough();

const mill_strategy_recommend = z
  .object({
    context: z.record(z.string(), z.unknown()).optional().describe("Full machining context."),
    constraints: z.array(z.string()).optional().describe("Strategy constraints."),
    top_n: z.number().int().positive().optional().describe("Number of recommendations."),
  })
  .passthrough();

const mill_strategy_compare = z
  .object({
    strategies: z.array(millingStrategy).min(2).describe("Strategies to compare."),
    context: z.record(z.string(), z.unknown()).optional(),
    metrics: z.array(z.enum(["cycle_time", "tool_wear", "surface_finish", "mrr"])).optional(),
  })
  .passthrough();

const mill_strategy_optimize = z
  .object({
    strategy: millingStrategy,
    parameters: cuttingParams.optional(),
    objective: z.enum(["minimize_time", "maximize_quality", "minimize_cost", "balanced"]).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

// ─── TOOLPATH OPERATIONS ────────────────────────────────────────────────────

const mill_toolpath_generate = z
  .object({
    geometry: z.unknown().optional().describe("Target geometry."),
    strategy: millingStrategy.optional(),
    tool: toolGeometry.optional(),
    parameters: cuttingParams.optional(),
    stock: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const mill_toolpath_simulate = z
  .object({
    toolpath: z.unknown().optional().describe("Toolpath data."),
    gcode: z.string().optional(),
    stock: z.record(z.string(), z.unknown()).optional(),
    tool: toolGeometry.optional(),
    time_step_s: z.number().positive().optional(),
  })
  .passthrough();

const mill_toolpath_optimize = z
  .object({
    toolpath: z.unknown().optional(),
    objective: z.enum(["cycle_time", "tool_life", "surface_finish", "mrr"]).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const mill_toolpath_rest = z
  .object({
    previous_tool: toolGeometry.describe("Tool used in previous operation."),
    current_tool: toolGeometry.describe("Current smaller tool."),
    stock_model: z.unknown().optional(),
    strategy: millingStrategy.optional(),
  })
  .passthrough();

const mill_toolpath_adaptive = z
  .object({
    geometry: z.unknown().optional(),
    tool: toolGeometry.optional(),
    max_engagement: z.number().min(0).max(1).optional().describe("Maximum radial engagement."),
    target_chip_load: z.number().positive().optional(),
    helix_ramp_angle_deg: z.number().optional(),
  })
  .passthrough();

const mill_toolpath_hsm = z
  .object({
    geometry: z.unknown().optional(),
    tool: toolGeometry.optional(),
    target_sfm: z.number().positive().optional().describe("Target surface feet per minute."),
    max_scallop_mm: z.number().positive().optional(),
    smoothing: z.boolean().optional(),
  })
  .passthrough();

const mill_toolpath_trochoidal = z
  .object({
    geometry: z.unknown().optional(),
    tool: toolGeometry.optional(),
    stepover_percent: z.number().min(1).max(100).optional(),
    slot_width_mm: z.number().positive().optional(),
    full_depth: z.boolean().optional(),
  })
  .passthrough();

// ─── PHYSICS & VALIDATION ───────────────────────────────────────────────────

const mill_force_calculate = z
  .object({
    material: z.string().optional(),
    iso_group: isoMaterialGroup.optional(),
    tool: toolGeometry.optional(),
    parameters: cuttingParams.optional(),
    kc1_1: z.number().positive().optional().describe("Specific cutting force (override)."),
    mc: z.number().optional().describe("Kienzle exponent (override)."),
  })
  .passthrough();

const mill_deflection_check = z
  .object({
    tool: toolGeometry,
    overhang_mm: z.number().positive().describe("Tool overhang from holder."),
    cutting_force_n: z.number().positive().optional(),
    holder_stiffness: z.number().positive().optional(),
    tolerance_mm: z.number().positive().optional(),
  })
  .passthrough();

const mill_chatter_predict = z
  .object({
    tool: toolGeometry.optional(),
    material: z.string().optional(),
    parameters: cuttingParams.optional(),
    frf_data: z.unknown().optional().describe("Frequency response function data."),
    rpm_range: z.tuple([z.number().positive(), z.number().positive()]).optional(),
  })
  .passthrough();

const mill_thermal_analyze = z
  .object({
    material: z.string().optional(),
    tool: toolGeometry.optional(),
    parameters: cuttingParams.optional(),
    coolant_type: z.string().optional(),
    duration_min: z.number().positive().optional(),
  })
  .passthrough();

const mill_power_verify = z
  .object({
    material: z.string().optional(),
    iso_group: isoMaterialGroup.optional(),
    tool: toolGeometry.optional(),
    parameters: cuttingParams.optional(),
    machine: machineConfig.optional(),
    safety_factor: z.number().min(1).optional(),
  })
  .passthrough();

// ─── COLLISION & KINEMATICS ─────────────────────────────────────────────────

const mill_collision_check = z
  .object({
    toolpath: z.unknown().optional(),
    gcode: z.string().optional(),
    tool_assembly: z.record(z.string(), z.unknown()).optional(),
    stock: z.record(z.string(), z.unknown()).optional(),
    fixtures: z.array(z.record(z.string(), z.unknown())).optional(),
    clearance_mm: z.number().positive().optional(),
  })
  .passthrough();

const mill_collision_zones = z
  .object({
    machine: machineConfig.optional(),
    setup: z.record(z.string(), z.unknown()).optional(),
    tool_assembly: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const mill_kinematics_verify = z
  .object({
    toolpath: z.unknown().optional(),
    machine: machineConfig.optional(),
    axis_limits: z.record(z.string(), z.tuple([z.number(), z.number()])).optional(),
    feed_rate_limits: z.record(z.string(), z.number()).optional(),
  })
  .passthrough();

const mill_work_envelope = z
  .object({
    machine: machineConfig.optional(),
    part_bounds: z.record(z.string(), z.number()).optional(),
    fixture_height_mm: z.number().optional(),
    tool_length_mm: z.number().optional(),
  })
  .passthrough();

// ─── TOOL SELECTION ─────────────────────────────────────────────────────────

const mill_tool_recommend = z
  .object({
    operation: toolpathType.optional(),
    material: z.string().optional(),
    iso_group: isoMaterialGroup.optional(),
    feature_dimensions: z.record(z.string(), z.number()).optional(),
    tolerance_mm: z.number().positive().optional(),
    surface_finish_ra: z.number().positive().optional(),
    top_n: z.number().int().positive().optional(),
  })
  .passthrough();

const mill_tool_assembly = z
  .object({
    tool: toolGeometry.optional(),
    holder: z.string().optional().describe("Holder spec (e.g., 'BT40-ER32')."),
    collet: z.string().optional(),
    extension: z.number().optional().describe("Extension length mm."),
    validate_runout: z.boolean().optional(),
  })
  .passthrough();

const mill_tool_holder_match = z
  .object({
    tool: toolGeometry.optional(),
    machine_spindle: z.string().optional().describe("Spindle interface (BT40, HSK63, etc)."),
    required_reach_mm: z.number().positive().optional(),
    preferred_holder_types: z.array(z.string()).optional(),
  })
  .passthrough();

// ─── AI/AGI FEATURES ────────────────────────────────────────────────────────

const mill_agi_orchestrate = z
  .object({
    intent: z.string().min(1).describe("Natural language machining intent."),
    context: z.record(z.string(), z.unknown()).optional(),
    autonomous: z.boolean().optional().describe("Enable autonomous decision-making."),
    explain: z.boolean().optional().describe("Include reasoning explanation."),
  })
  .passthrough();

const mill_neural_recommend = z
  .object({
    input_features: z.record(z.string(), z.unknown()).describe("Feature vector for neural model."),
    model_id: z.string().optional().describe("Specific model to use."),
    threshold: z.number().min(0).max(1).optional(),
  })
  .passthrough();

const mill_deeplearn_predict = z
  .object({
    input: z.record(z.string(), z.unknown()).describe("Model input."),
    output_type: z.enum(["classification", "regression", "sequence"]).optional(),
    model_id: z.string().optional(),
  })
  .passthrough();

const mill_pattern_mine = z
  .object({
    programs: z.array(z.string()).optional().describe("NC programs to analyze."),
    pattern_type: z.enum(["speed_feed", "strategy", "tool_sequence", "operation"]).optional(),
    min_support: z.number().min(0).max(1).optional(),
  })
  .passthrough();

const mill_wisdom_query = z
  .object({
    query: z.string().min(1).describe("Tribal knowledge query."),
    domain: z.enum(["milling", "tooling", "workholding", "material", "strategy"]).optional(),
    limit: z.number().int().positive().optional(),
  })
  .passthrough();

// ─── SELF-AWARENESS & CAPABILITY DISCOVERY ──────────────────────────────────

const mill_selfaware_registry = z
  .object({
    refresh: z.boolean().optional().describe("Force registry refresh."),
  })
  .passthrough();

const mill_selfaware_recommend = z
  .object({
    task: z.string().min(1).describe("Task description for feature recommendations."),
    query: z.string().optional().describe("Alternative to task parameter."),
  })
  .passthrough();

const mill_selfaware_find = z
  .object({
    query: z.string().min(1).describe("Query to find matching milling engines."),
    task: z.string().optional().describe("Alternative to query parameter."),
  })
  .passthrough();

const mill_selfaware_stats = z
  .object({
    category: z
      .enum(["orchestrator", "agi", "physics", "kinematics", "lora", "neural", "strategy", "validation", "tribal"])
      .optional()
      .describe("Filter stats by category."),
  })
  .passthrough();

// ─── DIGITAL TWIN ───────────────────────────────────────────────────────────

const mill_twin_sync = z
  .object({
    machine_id: z.string().min(1).describe("Machine identifier."),
    state: z.record(z.string(), z.unknown()).optional().describe("Current machine state."),
    timestamp: z.string().optional(),
  })
  .passthrough();

const mill_twin_predict = z
  .object({
    machine_id: z.string().min(1),
    horizon_minutes: z.number().positive().optional(),
    predict: z.array(z.enum(["tool_wear", "temperature", "vibration", "power"])).optional(),
  })
  .passthrough();

const mill_twin_calibrate = z
  .object({
    machine_id: z.string().min(1),
    actual_measurements: z.array(z.record(z.string(), z.unknown())).optional(),
    calibration_type: z.enum(["geometric", "thermal", "dynamic"]).optional(),
  })
  .passthrough();

// ─── SCIENTIFIC PIPELINE ────────────────────────────────────────────────────

const mill_scientific_analyze = z
  .object({
    data: z.record(z.string(), z.unknown()).describe("Scientific analysis input."),
    analysis_type: z.enum(["sensitivity", "uncertainty", "optimization", "regression"]).optional(),
    parameters: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough();

const mill_scientific_optimize = z
  .object({
    objective: z.string().describe("Optimization objective function."),
    variables: z.array(z.record(z.string(), z.unknown())).describe("Decision variables."),
    constraints: z.array(z.record(z.string(), z.unknown())).optional(),
    method: z.enum(["gradient", "genetic", "particle_swarm", "bayesian"]).optional(),
  })
  .passthrough();

const mill_uncertainty_quantify = z
  .object({
    model: z.string().describe("Model identifier."),
    input_distributions: z.record(z.string(), z.unknown()).describe("Input uncertainty distributions."),
    method: z.enum(["monte_carlo", "latin_hypercube", "polynomial_chaos"]).optional(),
    samples: z.number().int().positive().optional(),
  })
  .passthrough();

// ─── QUICK HELPERS ──────────────────────────────────────────────────────────

const mill_quick_speed_feed = z
  .object({
    material: z.string().optional(),
    iso_group: isoMaterialGroup.optional(),
    tool_diameter_mm: z.number().positive(),
    flutes: z.number().int().positive().optional(),
    operation: toolpathType.optional(),
  })
  .passthrough();

const mill_quick_cycle_time = z
  .object({
    gcode: z.string().optional(),
    toolpath_length_mm: z.number().positive().optional(),
    feed_mmpm: z.number().positive().optional(),
    rapid_feed_mmpm: z.number().positive().optional(),
    tool_changes: z.number().int().nonnegative().optional(),
  })
  .passthrough();

const mill_quick_cost_estimate = z
  .object({
    cycle_time_min: z.number().positive().optional(),
    tool_cost: z.number().nonnegative().optional(),
    machine_rate_per_hour: z.number().positive().optional(),
    material_cost: z.number().nonnegative().optional(),
    setup_time_min: z.number().nonnegative().optional(),
  })
  .passthrough();

// ─── VALIDATION & QUALITY ───────────────────────────────────────────────────

const mill_validate_setup = z
  .object({
    workholding: z.record(z.string(), z.unknown()).optional(),
    part: z.record(z.string(), z.unknown()).optional(),
    tools: z.array(toolGeometry).optional(),
    machine: machineConfig.optional(),
  })
  .passthrough();

const mill_validate_safety = z
  .object({
    gcode: z.string().optional(),
    toolpath: z.unknown().optional(),
    check_spindle_limits: z.boolean().optional(),
    check_feed_limits: z.boolean().optional(),
    check_rapid_moves: z.boolean().optional(),
  })
  .passthrough();

const mill_spc_analyze = z
  .object({
    measurements: z.array(z.number()).describe("Measurement data points."),
    spec_limits: z.object({
      usl: z.number().describe("Upper spec limit."),
      lsl: z.number().describe("Lower spec limit."),
      target: z.number().optional(),
    }),
    subgroup_size: z.number().int().positive().optional(),
    chart_type: z.enum(["xbar_r", "xbar_s", "individual_mr"]).optional(),
  })
  .passthrough();

// ─── P1-U09-L2-AGG: L2 AGGREGATOR SCHEMAS ──────────────────────────────────

const mill_ai_orchestrate = z
  .object({
    request_type: z
      .enum([
        "ai_reasoning",
        "strategy_lookup",
        "rl_train",
        "pattern_mine",
        "online_update",
        "reasoning_trace",
        "meta_learn",
        "neural_predict",
        "deep_predict",
      ])
      .describe("Which AI/ML sub-engine to route to."),
    intent: z.string().optional().describe("Natural-language intent (for ai_reasoning)."),
    context: z.record(z.string(), z.any()).optional().describe("Domain context."),
    dataset_id: z.string().optional().describe("Dataset identifier (for pattern_mine, rl_train)."),
    episode_count: z.number().int().nonnegative().optional().describe("RL training episodes."),
    reward: z.number().optional().describe("RL reward signal."),
    query: z.string().optional().describe("Query string (for strategy_lookup, reasoning_trace)."),
    features: z.record(z.string(), z.any()).optional().describe("Feature vector for prediction."),
    model_id: z.string().optional().describe("Model identifier."),
  })
  .passthrough();

const mill_turn_orchestrate = z
  .object({
    request_type: z
      .enum(["cam_generate", "swiss_pipeline", "sub_spindle", "live_tool", "multi_channel", "bar_feeder"])
      .describe("Which mill-turn operation to route."),
    machine_class: z
      .enum(["integrex", "swiss", "lb_series", "ctx", "wt_series", "generic"])
      .optional()
      .describe("Mill-turn machine class."),
    part_geometry: z.record(z.string(), z.any()).optional().describe("Part geometry description."),
    operations: z.array(z.record(z.string(), z.any())).optional().describe("Operation list."),
    bar_diameter_mm: z.number().positive().optional().describe("Bar stock diameter in mm."),
    bar_length_mm: z.number().positive().optional().describe("Bar stock length in mm."),
    sub_spindle_enabled: z.boolean().optional().describe("Sub-spindle transfer enabled."),
    live_tool_spindle_rpm: z.number().optional().describe("Live tool spindle RPM."),
    channels: z.number().int().positive().optional().describe("Number of synchronized channels."),
  })
  .passthrough();

const mill_5axis_orchestrate = z
  .object({
    request_type: z
      .enum([
        "orchestrate",
        "ai_ultra",
        "deep_learn",
        "cam_integrate",
        "toolpath_fuse",
        "toolpath_synth",
        "post_process",
        "decide",
        "cad_template",
        "rtcp_check",
      ])
      .describe("Which 5-axis sub-engine to route to."),
    kinematics: z
      .enum(["head_head", "head_table", "table_table", "gantry", "generic"])
      .optional()
      .describe("5-axis kinematics configuration."),
    part: z.record(z.string(), z.any()).optional().describe("Part definition."),
    tool: z.record(z.string(), z.any()).optional().describe("Tool definition."),
    lead_angle_deg: z.number().optional().describe("Lead angle in degrees."),
    tilt_angle_deg: z.number().optional().describe("Tilt angle in degrees."),
    tool_axis: z.tuple([z.number(), z.number(), z.number()]).optional().describe("Tool axis vector [i, j, k]."),
    strategy: z.string().optional().describe("Strategy name."),
    gcode: z.string().optional().describe("G-code input (for post_process)."),
    controller: z.string().optional().describe("Controller identifier."),
  })
  .passthrough();

const mill_multiaxis_orchestrate = z
  .object({
    request_type: z
      .enum(["kinematic_fk", "kinematic_ik", "print_to_prog", "validate_reach"])
      .describe("Which multi-axis operation to route."),
    axis_count: z.union([z.literal(4), z.literal(5), z.literal(6)]).optional().describe("Axis count: 4, 5, or 6."),
    joint_values: z.array(z.number()).optional().describe("Joint angles (for FK)."),
    tcp_target: z
      .object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
        a: z.number().optional(),
        b: z.number().optional(),
        c: z.number().optional(),
      })
      .optional()
      .describe("Target TCP pose (for IK)."),
    part: z.record(z.string(), z.any()).optional().describe("Part definition."),
    machine: z.record(z.string(), z.any()).optional().describe("Machine configuration."),
  })
  .passthrough();

// ─── TRIBAL KNOWLEDGE (MillTribalKnowledgeEngine) ──────────────────────────

const mill_tribal_query = z
  .object({
    category: z
      .enum([
        "speed_feed", "workholding", "coolant", "chatter", "tool_life",
        "surface_finish", "setup", "thin_wall", "deep_pocket", "hardened_material",
        "hsm", "finish_milling", "rough_milling", "face_milling", "chamfering",
        "threading", "drilling_in_mill", "fixture", "post_processor", "safety",
      ])
      .optional()
      .describe("Filter by tribal knowledge category."),
    material: z.string().optional().describe("Filter by material keyword."),
    machine: z.string().optional().describe("Filter by machine type."),
    cam: z.string().optional().describe("Filter by CAM system."),
    min_confidence: z.number().min(0).max(1).optional().describe("Minimum confidence threshold."),
    keyword: z.string().optional().describe("Keyword search in rule/rationale."),
  })
  .passthrough();

const mill_tribal_get = z
  .object({
    id: z.string().min(1).describe("Tribal tip ID to retrieve."),
  })
  .passthrough();

const mill_tribal_add = z
  .object({
    id: z.string().min(1).describe("Unique tip ID."),
    category: z.string().min(1).describe("Tip category."),
    rule: z.string().min(1).describe("The tribal rule/tip."),
    rationale: z.string().min(1).describe("Why this rule works."),
    source: z.string().min(1).describe("Source of the knowledge."),
    confidence: z.number().min(0).max(1).describe("Confidence score 0-1."),
    machine_types: z.array(z.string()).optional(),
    materials: z.array(z.string()).optional(),
    cam_systems: z.array(z.string()).optional(),
  })
  .passthrough();

const mill_tribal_stats = z.object({}).passthrough();

// ─── END-TO-END ORCHESTRATION (MillingEndToEndOrchestrationEngine) ─────────

const mill_e2e_workflow = z
  .object({
    part_number: z.string().min(1).describe("Part number."),
    revision: z.string().min(1).describe("Part revision."),
    part_name: z.string().min(1).describe("Part name."),
    material: z.string().min(1).describe("Material specification."),
    material_iso: isoMaterialGroup.describe("ISO material group."),
    job_id: z.string().optional().describe("Optional job identifier."),
    customer: z.string().optional().describe("Customer name."),
    quantity: z.number().int().positive().optional().describe("Quantity to produce."),
    due_date: z.string().optional().describe("Due date ISO string."),
    machine_id: z.string().optional().describe("Target machine ID."),
    priority: z.enum(["low", "normal", "high", "urgent"]).optional(),
  })
  .passthrough();

// ─── REASONING TRACE LEDGER (MillingReasoningTraceLedgerEngine) ────────────

const mill_trace_record = z
  .object({
    dispatcher: z.string().min(1).describe("Dispatcher that generated this trace."),
    action: z.string().min(1).describe("Action invoked."),
    keywords: z.array(z.string()).describe("Keywords for this trace."),
    awareness_used: z.boolean().describe("Whether AI self-awareness was consulted."),
    confidence: z.number().min(0).max(1).optional().describe("Confidence of the decision."),
    engines_consulted: z.array(z.string()).optional(),
    formulas_applied: z.array(z.string()).optional(),
    reasoning_path: z.string().optional(),
  })
  .passthrough();

const mill_trace_query = z
  .object({
    count: z.number().int().positive().optional().describe("Number of recent traces to return."),
    filter: z.record(z.string(), z.unknown()).optional().describe("Filter criteria."),
  })
  .passthrough();

// ─── INFERENCE ORCHESTRATION (MillingInferenceOrchestratorEngine) ──────────

const mill_inference_run = z
  .object({
    targets: z
      .array(z.enum(["cutting_force", "tool_wear", "surface_roughness", "cycle_time", "power", "chatter_risk"]))
      .min(1)
      .describe("Prediction targets."),
    conditions: z
      .object({
        material: z.string().optional(),
        material_iso: isoMaterialGroup.optional(),
        tool_diameter_mm: z.number().positive().optional(),
        depth_of_cut_mm: z.number().positive().optional(),
        feed_per_tooth_mm: z.number().positive().optional(),
        cutting_speed_mpm: z.number().positive().optional(),
        radial_engagement_pct: z.number().min(0).max(100).optional(),
      })
      .passthrough()
      .describe("Cutting conditions for inference."),
    use_ensemble: z.boolean().optional().describe("Use ensemble of models."),
    confidence_threshold: z.number().min(0).max(1).optional(),
    timeout_ms: z.number().positive().optional(),
  })
  .passthrough();

// ─── ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH2: 6 unwired neural/AI mill engines ─

/** mill_neural_cognitive_process — MillingNeuralCognitiveEngine.quickProcess */
const mill_neural_cognitive_process = z
  .object({
    query: z.string().min(1).describe("Cognitive query / problem statement."),
    intent: z
      .enum(["analyze", "optimize", "predict", "diagnose", "recommend", "explain", "generate"])
      .describe("Cognitive intent."),
    material: z.string().optional(),
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
    hardness_hrc: z.number().optional(),
    operation: z.string().optional(),
    feature_type: z.string().optional(),
    current_params: z.record(z.string(), z.unknown()).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .describe("Cognitive input for neural cognitive quickProcess.");

/** mill_critical_analyze — MillingCriticalThinkingEngine.quickAnalyze */
const mill_critical_analyze = z
  .object({
    problem: z.string().min(1).describe("Problem or question to analyze."),
    domain: z
      .enum(["parameters", "strategy", "tool_selection", "quality", "cost", "general"])
      .describe("Critical-thinking domain."),
    material: z.string().optional(),
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
    hardness_hrc: z.number().optional(),
    operation: z.string().optional(),
    feature_type: z.string().optional(),
    current_parameters: z.record(z.string(), z.unknown()).optional(),
    constraints: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .describe("CriticalThinkingRequest for quickAnalyze.");

/** mill_meta_learn_record — MillingMetaLearningEngine.learnFromExperience */
const mill_meta_learn_record = z
  .object({
    id: z.string().min(1).describe("Experience id (unique)."),
    timestamp: z.string().min(1).describe("ISO timestamp."),
    operation: z.string().min(1),
    material: z.string().min(1),
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"]),
    feature_type: z.string().min(1),
    tool_type: z.string().min(1),
    tool_diameter_mm: z.number().positive(),
    rpm: z.number().positive(),
    feed_mm_min: z.number().positive(),
    doc_mm: z.number().nonnegative(),
    woc_mm: z.number().nonnegative(),
    success: z.boolean(),
    cycle_time_min: z.number().nonnegative().optional(),
    tool_life_achieved_min: z.number().nonnegative().optional(),
    surface_finish_ra: z.number().nonnegative().optional(),
    part_quality_score: z.number().min(0).max(1).optional(),
    machine: z.string().optional(),
    customer: z.string().optional(),
    operator_notes: z.string().optional(),
  })
  .passthrough()
  .describe("OperationExperience record for meta-learning.");

/** mill_meta_learn_self_assess — MillingMetaLearningEngine.selfAssess */
const mill_meta_learn_self_assess = z
  .object({})
  .passthrough()
  .describe("No-arg self-assessment (returns prediction accuracy + improvement areas).");

/** mill_ai_parse_nl_query — MillingAIIntegrationEngine.parseNaturalLanguageQuery */
const mill_ai_parse_nl_query = z
  .object({
    query: z.string().min(1).describe("Natural-language milling query."),
  })
  .passthrough()
  .describe("Parse NL query into intent + entities for milling AI.");

/** mill_ai_archive_stats — MillingAIIntegrationEngine.getArchiveStats */
const mill_ai_archive_stats = z
  .object({})
  .passthrough()
  .describe("No-arg JM-Die program-archive statistics.");

// ─── ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH3: 6 unwired physics/RL/pattern mill engines ─

/** mill_physics_force — MillingPhysicsKernelEngine.calculateMillingForces */
const mill_physics_force = z
  .object({
    kc1_1: z.number().positive().describe("Kienzle specific cutting force coefficient (N/mm²)."),
    mc: z.number().min(0).max(1).describe("Kienzle exponent (dimensionless, typically 0.15–0.35)."),
    ap: z.number().positive().describe("Axial depth of cut (mm)."),
    fz: z.number().positive().describe("Feed per tooth (mm)."),
    helix_angle_deg: z.number().min(0).max(89).optional().describe("Tool helix angle (deg)."),
    tool_diameter_mm: z.number().positive().optional().describe("Tool diameter (mm)."),
    ae: z.number().positive().optional().describe("Radial depth of cut (mm)."),
  })
  .passthrough()
  .describe("MillingForceInput — Kienzle force calculation with helix decomposition.");

/** mill_physics_tool_life — MillingPhysicsKernelEngine.calculateToolLife */
const mill_physics_tool_life = z
  .object({
    C: z.number().positive().describe("Taylor constant (m/min at T=1 min)."),
    n: z.number().positive().describe("Taylor exponent (dimensionless, typically 0.1–0.5)."),
    Vc: z.number().positive().describe("Cutting speed (m/min)."),
    coating: z.string().optional().describe("Coating type for adjustment factor."),
    p: z.number().positive().optional().describe("Extended Taylor feed exponent."),
    q: z.number().positive().optional().describe("Extended Taylor depth exponent."),
    f: z.number().positive().optional().describe("Feed rate (mm/rev) for extended Taylor."),
    ap: z.number().positive().optional().describe("Axial depth (mm) for extended Taylor."),
    iso_group: z.string().optional().describe("ISO material group (P/M/K/N/S/H)."),
  })
  .passthrough()
  .describe("ToolLifeInput — Taylor or extended Taylor tool life calculation.");

/** mill_program_pattern_analyze — MillingProgramPatternEngine.analyzeProgram */
const mill_program_pattern_analyze = z
  .object({
    ncCode: z.string().min(1).describe("Raw NC/G-code program text."),
    sourcePath: z.string().optional().describe("Optional source file path for traceability."),
  })
  .passthrough()
  .describe("Analyze NC program for tools, operations, and milling patterns.");

/** mill_rl_select_action — MillingReinforcementLearningEngine.selectAction */
const mill_rl_select_action = z
  .object({
    state: z
      .object({
        cutting_speed_mpm: z.number(),
        feed_per_tooth_mm: z.number(),
        axial_depth_mm: z.number(),
        radial_depth_mm: z.number(),
        tool_wear_vb_mm: z.number().nonnegative(),
        spindle_load_percent: z.number().min(0).max(200),
        vibration_level: z.number().nonnegative(),
        temperature_c: z.number(),
        surface_roughness_um: z.number().nonnegative(),
        material_hardness_hrc: z.number(),
      })
      .describe("Current MillingState observation."),
    explore: z.boolean().optional().describe("If true, ε-greedy exploration; else greedy."),
  })
  .passthrough()
  .describe("DQN policy: select cutting-parameter adjustment action from state.");

/** mill_head_recommend — MillingHeadIntelligenceEngine.recommendMillingHead */
const mill_head_recommend = z
  .object({
    operations: z
      .array(
        z.object({
          type: z.string().min(1),
          angles: z.array(z.number()),
          powerRequired_kW: z.number().nonnegative(),
          interpolation: z.boolean(),
        }),
      )
      .min(1)
      .describe("Planned milling operations with angle and power requirements."),
    constraints: z
      .object({
        budget: z.enum(["low", "medium", "high"]),
        accuracy_mm: z.number().positive(),
        production: z.boolean(),
      })
      .describe("Selection constraints: budget tier, target accuracy, production flag."),
  })
  .passthrough()
  .describe("Recommend optimal milling head (orthogonal/universal/B-axis) for operation set.");

/** mill_machine_intel_get — MillingMachineIntelligenceEngine.getMachine */
const mill_machine_intel_get = z
  .object({
    id: z.string().min(1).describe("Machine profile identifier."),
  })
  .passthrough()
  .describe("Look up MillingMachineProfile by id from machine intelligence cache.");

// ─── ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH4: 6 unwired deep-AI / digital-twin mill engines ─

/** mill_deep_reason — MillingDeepReasoningEngine.quickReason */
const mill_deep_reason = z
  .object({
    query: z.string().min(1).describe("Free-form milling query."),
    context: z
      .object({
        material: z.string().optional(),
        material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).optional(),
        hardness_hrc: z.number().optional(),
        operation: z.string().optional(),
        tool_type: z.string().optional(),
        tool_diameter_mm: z.number().positive().optional(),
        machine: z.string().optional(),
        controller: z.string().optional(),
        customer: z.string().optional(),
        tolerance_mm: z.number().positive().optional(),
        surface_finish_ra: z.number().positive().optional(),
        depth_mm: z.number().positive().optional(),
      })
      .passthrough()
      .describe("MillingContext used to find supporting evidence."),
  })
  .passthrough()
  .describe("Quick milling reasoning over tribal knowledge + physics evidence.");

/** mill_deep_integrate — MillingDeepIntegrationEngine.quickIntegrate */
const mill_deep_integrate = z
  .object({
    material: z.string().min(1).describe("Material trade name (e.g. '4140', 'D2', 'Ti-6Al-4V')."),
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group."),
    hardness_hrc: z.number().optional(),
    operation: z.string().min(1).describe("Operation type (e.g. 'roughing', 'finishing')."),
    feature_type: z.string().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    tool_type: z.string().optional(),
    machine: z.string().optional(),
    controller: z.string().optional(),
    customer: z.string().optional(),
    surface_finish_ra: z.number().positive().optional(),
    tolerance_mm: z.number().positive().optional(),
  })
  .passthrough()
  .describe("MillingIntegrationContext for quick-integrate parameter recommendation.");

/** mill_knowledge_search — MillingDeepKnowledgeSynthesisEngine.searchKnowledge */
const mill_knowledge_search = z
  .object({
    query: z.string().min(1).describe("Knowledge-base search query."),
  })
  .passthrough()
  .describe("Search synthesized milling knowledge (tips, physics notes, formulas).");

/** mill_knowledge_stats — MillingDeepKnowledgeSynthesisEngine.getSourceStats */
const mill_knowledge_stats = z
  .object({})
  .passthrough()
  .describe("No-arg knowledge-source coverage statistics.");

/** mill_ai_unified_recommend — MillingAIUnificationEngine.quickRecommend */
const mill_ai_unified_recommend = z
  .object({
    material: z.string().min(1),
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"]),
    hardness_hrc: z.number().optional(),
    operation: z.string().min(1),
    feature_type: z.string().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    depth_mm: z.number().positive().optional(),
    width_mm: z.number().positive().optional(),
    length_mm: z.number().positive().optional(),
  })
  .passthrough()
  .describe("UnifiedMillingRequest for unified-system quick recommendation.");

/** mill_milling_twin_sync — MillingDigitalTwinEngine.sync (distinct from legacy mill_twin_sync) */
const mill_milling_twin_sync = z
  .object({
    spindle: z
      .object({
        speed_rpm: z.number().nonnegative().optional(),
        load_percent: z.number().min(0).max(200).optional(),
        power_kw: z.number().nonnegative().optional(),
        temperature_c: z.number().optional(),
      })
      .passthrough()
      .optional(),
    axes: z
      .object({
        x_position_mm: z.number().optional(),
        y_position_mm: z.number().optional(),
        z_position_mm: z.number().optional(),
        feedrate_mmpm: z.number().nonnegative().optional(),
      })
      .passthrough()
      .optional(),
    coolant: z
      .object({
        active: z.boolean().optional(),
        type: z.enum(["flood", "mql", "cryogenic", "dry"]).optional(),
        flow_rate_lpm: z.number().nonnegative().optional(),
        temperature_c: z.number().optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .describe("Partial<MachineState> for MillingDigitalTwinEngine.sync (anomalies + drift).");

// ─── ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH5: 6 unwired AGI / online-learning / troubleshooting mill engines ─

/** mill_agi_quick_analyze — MillingAGIOrchestrationEngine.quickAnalyze */
const mill_agi_quick_analyze = z
  .object({
    material: z.string().min(1).describe("Material trade name (e.g. '4140', 'Ti-6Al-4V')."),
    tool_diameter_mm: z.number().positive().describe("Tool diameter (mm)."),
    cutting_speed_m_min: z.number().positive().describe("Cutting speed Vc (m/min)."),
    feed_per_tooth_mm: z.number().positive().describe("Feed per tooth fz (mm)."),
    axial_depth_mm: z.number().positive().describe("Axial depth of cut ap (mm)."),
  })
  .passthrough()
  .describe("AGI orchestrator quick-analyze: force, power, MRR, tool life, quality.");

/** mill_knowledge_orch_recommend — MillingKnowledgeOrchestratorEngine.quickRecommend */
const mill_knowledge_orch_recommend = z
  .object({
    material: z.string().min(1).describe("Material trade name."),
    material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group."),
    feature_type: z.string().min(1).describe("Feature type (e.g. 'pocket', 'slot', 'face')."),
    dimensions: z
      .object({
        length_mm: z.number().positive().optional(),
        width_mm: z.number().positive().optional(),
        depth_mm: z.number().positive().optional(),
      })
      .passthrough()
      .optional()
      .describe("Optional feature dimensions in mm."),
    hardness_hrc: z.number().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    machine: z.string().optional(),
    controller: z.string().optional(),
    customer: z.string().optional(),
  })
  .passthrough()
  .describe("Knowledge-orchestrator quick recommendation: rpm, feed, strategy, confidence, reasoning.");

/** mill_troubleshoot — MillingDeepAIHardeningEngine.troubleshootMillingIssue */
const mill_troubleshoot = z
  .object({
    symptoms: z
      .array(z.string().min(1))
      .min(1)
      .describe("Operator-observed symptoms (chatter, finish, dimensional, etc.)."),
    material: z.string().optional(),
    operation: z.string().optional(),
    tool_type: z.string().optional(),
    tool_diameter_mm: z.number().positive().optional(),
    chatter_detected: z.boolean().optional(),
    surface_finish_ra: z.number().positive().optional(),
  })
  .passthrough()
  .describe("Deep-AI troubleshoot: symptoms → root causes + reasoning chain.");

/** mill_lora_cadence_state — MillingLoRACadenceEngine.getState (no-arg) */
const mill_lora_cadence_state = z
  .object({})
  .passthrough()
  .describe("No-arg snapshot of LoRA fine-tuning cadence state.");

/** mill_online_record_step — MillingOnlineLearningTrackerEngine.recordStep */
const mill_online_record_step = z
  .object({
    timestamp: z.number().describe("Unix timestamp (ms) of the training step."),
    prediction_error: z.number().describe("Prediction error for this step."),
    model_loss: z.number().nonnegative().describe("Model loss value."),
    learning_rate: z.number().positive().describe("Current learning rate (must be > 0)."),
    samples_seen: z.number().int().nonnegative().describe("Cumulative samples seen."),
    feature_importance: z
      .record(z.string(), z.number())
      .describe("Feature-name → importance weight map."),
  })
  .passthrough()
  .describe("Record an online-learning step: drift detection + LR adjust + checkpoint flag.");

/** mill_online_detect_drift — MillingOnlineLearningTrackerEngine.detectDrift */
const mill_online_detect_drift = z
  .object({
    error: z.number().describe("Latest prediction error to feed into drift detector."),
  })
  .passthrough()
  .describe("Detect distribution drift from a single error sample.");

// ─── MS-PRINT-PROGRAM-LOOP / U-PPL-A5: MillPartClassifierEngine actions ─────
//
// Reviewer B P1-1 anti-drift fix (2026-05-15): re-use the engine's exported
// schemas as the single source of truth. The previous hand-typed duplicate
// of MillPartGeometryInputSchema would drift the moment anyone bumps a
// constraint (e.g., MAX_FEATURE_LABEL_LEN) in only one place. By importing,
// any future engine change propagates to the dispatcher automatically.

/** mill_part_classify — MillPartClassifierEngine.classify */
const mill_part_classify = MillPartGeometryInputSchema
  .describe("Classify a single milled part into a family (prismatic/pocket_2_5d/mold_3d/thin_wall) with workholding + strategy + sequence defaults.");

/** mill_part_classify_batch — MillPartClassifierEngine.classifyBatch */
const mill_part_classify_batch = z
  .object({
    parts: z.array(MillPartGeometryInputSchema).min(0).max(MILL_PART_CLASSIFY_BATCH_MAX)
      .describe(`Array of part geometry inputs (capped at ${MILL_PART_CLASSIFY_BATCH_MAX} to bound memory).`),
  })
  .strict()
  .describe("Batch-classify multiple mill parts in one call (same per-part shape).");

/** mill_part_family_profile — MillPartClassifierEngine.getFamilyProfile */
const mill_part_family_profile = z
  .object({
    family: MillPartFamilySchema.describe("Mill part family to look up the default profile for."),
  })
  .strict()
  .describe("Get the default workholding + strategy + sequence profile for a known family without running the classifier.");

/** mill_part_families_list — MillPartClassifierEngine.listFamilies (no-arg) */
const mill_part_families_list = z
  .object({})
  .strict()
  .describe("List all 4 mill part families with their default workholding + strategy + thermal.");

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING ────────────────────────────
// MillingHybridStrategySynthesizer — 4 actions wiring the pure-transform
// synthesizer engine into prism_mill (iter-1 of U-BRIDGE-WIRE-MILLING).

const HybridFeatureType = z.enum([
  "pocket", "face", "slot", "contour", "cavity", "profile", "drilling",
]);
const HybridStrategyType = z.enum([
  "trochoidal", "plunge", "hsm", "conventional", "hfm", "rest",
  "pencil", "spiral", "ramp", "helical", "3_axis", "5_axis",
]);
const HybridPriority = z.enum(["speed", "quality", "cost", "tool_life", "balanced"]);
const HybridMachineAxes = z.union([z.literal(3), z.literal(4), z.literal(5)]);

/** mill_hybrid_synthesize — MillingHybridStrategySynthesizer.synthesize(request) */
const mill_hybrid_synthesize = z
  .object({
    feature_type: HybridFeatureType.describe("Feature shape being synthesized for."),
    depth_mm: z.number().nonnegative().optional().describe("Feature depth in mm."),
    width_mm: z.number().nonnegative().optional().describe("Feature width in mm."),
    length_mm: z.number().nonnegative().optional().describe("Feature length in mm."),
    corner_radius_mm: z.number().nonnegative().optional().describe("Internal corner radius in mm."),
    material_iso: z.string().optional().describe("ISO material group letter (P, M, K, N, S, H)."),
    hardness_hrc: z.number().optional().describe("Workpiece hardness in HRC."),
    tolerance_mm: z.number().nonnegative().optional().describe("Required dimensional tolerance in mm."),
    surface_finish_ra: z.number().nonnegative().optional().describe("Required surface finish Ra (μm)."),
    machine_axes: HybridMachineAxes.optional().describe("Machine axis count: 3, 4, or 5."),
    max_rpm: z.number().positive().optional().describe("Machine max spindle RPM."),
    max_feedrate: z.number().positive().optional().describe("Machine max feedrate (mm/min)."),
    priority: HybridPriority.optional().describe("Optimization priority for the synthesis."),
    tool_diameter_mm: z.number().positive().optional().describe("Cutter diameter in mm."),
    max_tool_overhang: z.number().positive().optional().describe("Max tool overhang in mm."),
  })
  .passthrough()
  .describe("Synthesize a hybrid milling strategy (primary + secondary + workflow) for the given feature + material + machine.");

/** mill_hybrid_quick_recommend — MillingHybridStrategySynthesizer.quickRecommend(request) */
const mill_hybrid_quick_recommend = z
  .object({
    feature_type: HybridFeatureType.describe("Feature shape to recommend a strategy for."),
    depth_mm: z.number().nonnegative().optional().describe("Feature depth in mm."),
    width_mm: z.number().nonnegative().optional().describe("Feature width in mm."),
    material_iso: z.string().optional().describe("ISO material group letter."),
    hardness_hrc: z.number().optional().describe("Workpiece hardness in HRC."),
    machine_axes: HybridMachineAxes.optional().describe("Machine axis count."),
    priority: HybridPriority.optional().describe("Optimization priority."),
    tool_diameter_mm: z.number().positive().optional().describe("Cutter diameter in mm."),
  })
  .passthrough()
  .describe("Quick single-strategy recommendation (skips full hybrid analysis) for the given feature.");

/** mill_hybrid_strategies — MillingHybridStrategySynthesizer.getStrategies() (no-arg) */
const mill_hybrid_strategies = z
  .object({})
  .strict()
  .describe("List all known milling strategies with their best-for / limitations / cost-time-quality factors.");

/** mill_hybrid_synergy — MillingHybridStrategySynthesizer.getSynergy(primary, secondary) */
const mill_hybrid_synergy = z
  .object({
    primary: HybridStrategyType.describe("Primary strategy in the pair."),
    secondary: HybridStrategyType.describe("Secondary strategy in the pair."),
  })
  .strict()
  .describe("Return the synergy score + workflow for a primary+secondary strategy pair.");

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-2 ─────────────────────
// MillingLoRADatasetBuilderEngine — 2 actions wiring the LoRA fine-tuning
// dataset builder into prism_mill. Required-feature schema enforced by the
// engine itself; this Zod schema just guards the top-level call shape.

const RawJobSchema = z
  .object({
    id: z.string().min(1).describe("Stable job identifier (e.g. program filename + rev)."),
    fingerprint: z.record(z.string(), z.union([z.string(), z.number()]))
      .describe("Feature fingerprint keys for geometry hashing."),
    features: z.record(z.string(), z.unknown())
      .describe("Free-form feature map — embedded in instruction/input."),
    actual: z.record(z.string(), z.unknown())
      .describe("Actual observed result (CMM, cycle time, pierce outcome, etc.)."),
    weight: z.number().positive().optional().describe("Optional row weight (1.0 = typical)."),
    labels: z.array(z.string()).optional().describe("Optional category labels."),
  })
  .passthrough();

const DatasetSplitConfigSchema = z
  .object({
    trainRatio: z.number().min(0).max(1).describe("Train split ratio."),
    valRatio: z.number().min(0).max(1).describe("Validation split ratio."),
    testRatio: z.number().min(0).max(1).describe("Test split ratio."),
    seed: z.number().int().describe("Deterministic split seed (mulberry32)."),
    stratifyBy: z.string().optional().describe("Optional stratification axis (a key on every fingerprint)."),
  })
  .strict();

/** mill_lora_build_dataset — MillingLoRADatasetBuilderEngine.buildDataset(jobs, split?) */
const mill_lora_build_dataset = z
  .object({
    jobs: z.array(RawJobSchema).min(1).describe("RawJob array — milling jobs with features+actual."),
    split: DatasetSplitConfigSchema.optional().describe("Optional split config (defaults to DEFAULT_SPLIT)."),
  })
  .passthrough()
  .describe("Build a LoRA fine-tuning dataset (Alpaca-format) from milling RawJob records.");

/** mill_lora_required_schema — MillingLoRADatasetBuilderEngine.requiredSchema (no-arg) */
const mill_lora_required_schema = z
  .object({})
  .strict()
  .describe("Return the required feature + actual key schema for milling LoRA datasets.");

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-3 ─────────────────────
// MillTurnLoRADatasetBuilderEngine — mill-turn LoRA dataset (sibling of iter-2,
// adds channel_count + sub_spindle + wait_ms_per_sync + channel_imbalance_ratio
// to the required-key set; otherwise identical contract).

/** millturn_lora_build_dataset — MillTurnLoRADatasetBuilderEngine.buildDataset(jobs, split?) */
const millturn_lora_build_dataset = z
  .object({
    jobs: z.array(RawJobSchema).min(1).describe("RawJob array — mill-turn jobs with features+actual."),
    split: DatasetSplitConfigSchema.optional().describe("Optional split config."),
  })
  .passthrough()
  .describe("Build a LoRA fine-tuning dataset (Alpaca-format) from mill-turn RawJob records.");

/** millturn_lora_required_schema — MillTurnLoRADatasetBuilderEngine.requiredSchema (no-arg) */
const millturn_lora_required_schema = z
  .object({})
  .strict()
  .describe("Return the required feature + actual key schema for mill-turn LoRA datasets.");

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-4 ─────────────────────
// MillTurnCAMEngine — multi-channel mill-turn / Swiss program generator.

const MillTurnOperationSchema = z
  .object({
    id: z.string().min(1).describe("Operation id (unique per program)."),
    type: z.string().min(1).describe("Operation type (e.g. od_rough, drill, mill_pocket)."),
    spindle: z.enum(["main", "sub"]).describe("Spindle the op runs on."),
    turret: z.number().int().optional().describe("Turret index."),
    channel: z.number().int().optional().describe("Channel number for multi-channel sync."),
    position: z.object({
      x: z.number(),
      z: z.number(),
      y: z.number().optional(),
      c_deg: z.number().optional(),
    }).optional(),
    dimensions: z.object({
      diameter_mm: z.number().positive().optional(),
      depth_mm: z.number().positive().optional(),
      length_mm: z.number().positive().optional(),
      width_mm: z.number().positive().optional(),
    }).passthrough().optional(),
    tool: z.object({
      type: z.string(),
      diameter_mm: z.number().positive().optional(),
      is_live: z.boolean().optional(),
      rpm: z.number().positive().optional(),
    }).passthrough().optional(),
    params: z.object({
      speed_mpm: z.number().positive().optional(),
      feed_mmrev: z.number().positive().optional(),
      feed_mmmin: z.number().positive().optional(),
      doc_mm: z.number().positive().optional(),
    }).passthrough().optional(),
    requires_ops: z.array(z.string()).optional().describe("Dependency: op ids that must complete first."),
  })
  .passthrough();

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-5 ─────────────────────
// MillingUltimateAIEngine — deep-reasoning + Pareto + max-variability AI.

const UltimateMillingContextSchema = z
  .object({
    part_name: z.string().optional(),
    customer: z.string().optional(),
    material: z.string().min(1).describe("Workpiece material string (e.g. 'AISI 1045')."),
    material_iso: z.string().min(1).describe("ISO group letter or sub-group."),
    hardness_hrc: z.number().optional(),
    material_condition: z.enum(["annealed","normalized","hardened","tempered"]).optional(),
    feature_type: z.string().min(1).describe("Feature type (e.g. 'pocket', 'face', 'slot')."),
    dimensions: z.object({
      length_mm: z.number().nonnegative().optional(),
      width_mm: z.number().nonnegative().optional(),
      depth_mm: z.number().nonnegative().optional(),
      diameter_mm: z.number().nonnegative().optional(),
      wall_thickness_mm: z.number().nonnegative().optional(),
    }).passthrough(),
    geometry_complexity: z.enum(["simple","moderate","complex","extreme"]).describe("Geometry complexity tier."),
    tolerance_mm: z.number().nonnegative().optional(),
    surface_finish_ra: z.number().nonnegative().optional(),
    geometric_tolerance: z.string().optional(),
    machine: z.string().optional(),
    controller: z.string().optional(),
    spindle_max_rpm: z.number().positive().optional(),
    spindle_power_kw: z.number().positive().optional(),
    axes: z.union([z.literal(3), z.literal(4), z.literal(5)]).optional(),
    max_cycle_time_min: z.number().positive().optional(),
    tool_budget_usd: z.number().positive().optional(),
    batch_size: z.number().int().positive().optional(),
    exploration_depth: z.enum(["shallow","moderate","deep","exhaustive"]).optional(),
    allow_unconventional: z.boolean().optional(),
  })
  .passthrough();

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-8 ─────────────────────
// MillingAIUltraIntelligenceEngine — 20 static-method ultra-AI surface.
// Schemas validate top-level shape only; the engine's own type system handles
// nested object validation (its inputs are large structured types — keeping
// these Zod schemas as object-with-passthrough avoids 200+ lines of duplicated
// field definitions while still catching missing-key cases).

const UaiNlInputSchema = z.object({ input: z.string().min(1) }).passthrough();
const UaiIntentSchema = z.object({ intent: z.record(z.string(), z.unknown()) }).passthrough();
const UaiRequestSchema = z.object({ request: z.record(z.string(), z.unknown()) }).passthrough();
const UaiInputSchema = z.object({ input: z.record(z.string(), z.unknown()) }).passthrough();
const UaiStateSchema = z.object({ state: z.record(z.string(), z.unknown()) }).passthrough();
const UaiEpisodeSchema = z.object({ episode: z.record(z.string(), z.unknown()) }).passthrough();
const UaiToolLifeRecordSchema = z.object({
  input: z.record(z.string(), z.unknown()),
  actualLife: z.number().positive(),
}).passthrough();
const UaiPredActualSchema = z.object({
  ra_um: z.number().nonnegative(),
  cycle_min: z.number().nonnegative(),
  tool_life_min: z.number().nonnegative(),
}).passthrough();
const UaiRewardSchema = z.object({
  predicted: UaiPredActualSchema,
  actual: UaiPredActualSchema,
  scrap: z.boolean(),
  rework: z.boolean(),
}).passthrough();
const UaiNoArg = z.object({}).strict();
const UaiAnyObject = z.record(z.string(), z.unknown());

const mill_uai_parse_nl = UaiNlInputSchema.describe("Parse a natural-language milling query into a MillingNLIntent.");
const mill_uai_process_nl = UaiNlInputSchema.describe("End-to-end NL → MillingResult pipeline.");
const mill_uai_generate_prompt = UaiIntentSchema.describe("Generate a PRISM-AI prompt from a parsed MillingNLIntent.");
const mill_uai_select_strategy = UaiRequestSchema.describe("Select the optimal strategy for a StrategyAnalysisRequest.");
const mill_uai_compare_strategies = UaiRequestSchema.describe("Compare candidate strategies for a StrategyAnalysisRequest.");
const mill_uai_predict_tool_life = UaiInputSchema.describe("Predict tool life from a MillingToolLifeInput.");
const mill_uai_record_tool_life = UaiToolLifeRecordSchema.describe("Record observed tool life for a job (RL training corpus).");
const mill_uai_extract_toolpath_features = UaiAnyObject.describe("Extract feature vector from a toolpath context.");
const mill_uai_score_toolpath = UaiAnyObject.describe("Score a toolpath against the trained policy.");
const mill_uai_explain_decision = UaiRequestSchema.describe("Generate an explainable response for an ExplainableMillingRequest.");
const mill_uai_get_recommended_action = UaiStateSchema.describe("Get RL-recommended action for a MillingRLState.");
const mill_uai_record_episode = UaiEpisodeSchema.describe("Record a completed RL episode for policy training.");
const mill_uai_calculate_reward = UaiRewardSchema.describe("Compute scalar RL reward from predicted/actual + scrap/rework flags.");
const mill_uai_get_policy_stats = UaiNoArg.describe("Return the current MillingRLPolicy stats.");
const mill_uai_diagnose_problem = UaiRequestSchema.describe("Diagnose a milling problem from a MillingTroubleshootingRequest.");
const mill_uai_generate_troubleshooting_prompt = UaiRequestSchema.describe("Generate an LLM prompt for a milling troubleshooting request.");
const mill_uai_clear_all = UaiNoArg.describe("Clear all in-memory state (tool-life data + RL episodes + history).");
const mill_uai_get_tool_life_data_count = UaiNoArg.describe("Return the number of recorded tool-life samples.");
const mill_uai_get_rl_episode_count = UaiNoArg.describe("Return the number of recorded RL episodes.");
const mill_uai_get_troubleshooting_history_count = UaiNoArg.describe("Return the number of recorded troubleshooting events.");

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-7 ─────────────────────
// MillingProductionKnowledgeHarvesterEngine — shop-data harvested params.

const mill_pkh_recommend_params = z
  .object({
    material: z.string().min(1).describe("Material name (matched against harvested MATERIAL_PATTERNS)."),
    toolDiameter: z.number().positive().describe("Tool diameter (mm)."),
    operation: z.string().min(1).describe("Operation type (e.g. 'rough_pocket', 'finish_profile')."),
  })
  .passthrough()
  .describe("Return SFM/chip-load/DOC/WOC ranges + confidence harvested from shop production data.");

const mill_pkh_validate_params = z
  .object({
    spindle_rpm: z.number().positive(),
    feed_mm_min: z.number().positive(),
    doc_mm: z.number().positive(),
    tool_diameter_mm: z.number().positive(),
    flutes: z.number().int().positive(),
    material: z.string().min(1),
  })
  .passthrough()
  .describe("Validate live parameters against harvested norms; return warnings + suggestions + deviation score.");

const mill_pkh_tribal_knowledge = z
  .object({
    category: z.string().optional().describe("Optional category filter."),
    material: z.string().optional().describe("Optional material substring filter."),
  })
  .passthrough()
  .describe("Return harvested tribal-knowledge items sorted by confidence.");

const mill_pkh_stats = z.object({}).strict()
  .describe("Comprehensive harvester statistics (programs, customers, tribal tips, etc.).");

const mill_pkh_self_awareness = z.object({}).strict()
  .describe("Engine self-awareness manifest (capabilities, coverage, gaps).");

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-6 ─────────────────────
// MillNeuralNetworkEngine — neural net for milling parameter prediction.

const NeuralMaterialIso = z.enum(["P","M","K","N","S","H"]);
const NeuralToolType = z.enum([
  "spot_drill","twist_drill","flat_endmill","ball_endmill","insert_endmill",
  "face_mill","chamfer_mill","tap","reamer","boring_bar",
]);
const NeuralOpType = z.enum([
  "face","rough_profile","finish_profile","rough_pocket","finish_pocket",
  "drill","peck_drill","tap","chamfer","contour","3d_rough","3d_finish",
]);

const NeuralFeatureInputSchema = z.object({
  materialIso: NeuralMaterialIso.describe("ISO material group P/M/K/N/S/H."),
  toolType: NeuralToolType.describe("Tool type one-hot key."),
  operationType: NeuralOpType.describe("Operation type one-hot key."),
  toolDiameterMm: z.number().positive().describe("Tool diameter (mm)."),
  rpm: z.number().positive().describe("Current/seed spindle RPM."),
  feed: z.number().positive().describe("Current/seed feed (mm/min)."),
  doc: z.number().positive().describe("Depth of cut (mm)."),
  zLevelCount: z.number().int().nonnegative().describe("Number of Z-levels."),
  cutterComp: z.boolean().describe("Cutter comp G41/G42 active."),
});

/** mill_neural_encode_features — encodeFeatures(...positional 10-arg) */
const mill_neural_encode_features = NeuralFeatureInputSchema.extend({
  isProven: z.boolean().describe("Job is from proven-program corpus."),
})
  .describe("Encode milling-job features into the neural network input vector.");

/** mill_neural_add_sample — addTrainingSample(...positional 13-arg) */
const mill_neural_add_sample = NeuralFeatureInputSchema.extend({
  isProven: z.boolean(),
  targetRPM: z.number().positive().describe("Ground-truth RPM target."),
  targetFeed: z.number().positive().describe("Ground-truth feed target (mm/min)."),
  targetDOC: z.number().positive().describe("Ground-truth DOC target (mm)."),
})
  .describe("Add a training sample (features + labels) to the neural net's corpus.");

/** mill_neural_train — train (no-arg) */
const mill_neural_train = z.object({}).strict()
  .describe("Train the neural net on the accumulated sample corpus; returns {loss, epochs}.");

/** mill_neural_predict — predict(...positional 9-arg, no isProven) */
const mill_neural_predict = NeuralFeatureInputSchema
  .describe("Predict optimized rpm/feed/doc + confidence + anomaly score for a milling op.");

/** mill_ultimate_quick_analyze — MillingUltimateAIEngine.quickAnalyze(ctx) */
const mill_ultimate_quick_analyze = UltimateMillingContextSchema
  .describe("Quick neural+tribal recommendation: strategy + rpm/feed/doc parameters + confidence + reasoning.");

/** mill_ultimate_explore_variability — MillingUltimateAIEngine.exploreMaxVariability(ctx) */
const mill_ultimate_explore_variability = UltimateMillingContextSchema
  .describe("Exhaustive exploration: Pareto frontier + hybrid approaches + novel combinations + variability score.");

/** millturn_cam_generate — MillTurnCAMEngine.generate(operations, config) */
const millturn_cam_generate = z
  .object({
    operations: z.array(MillTurnOperationSchema).min(1).describe("Mill-turn operations (≥1)."),
    config: z.object({
      material_iso_group: z.enum(["P","M","K","N","S","H"]).describe("ISO material group letter."),
      bar_diameter_mm: z.number().positive().optional(),
      bar_length_mm: z.number().positive().optional(),
      part_length_mm: z.number().positive().optional(),
      machine_type: z.enum(["mill_turn","swiss","vtl"]).describe("Mill-turn / Swiss / VTL family."),
      max_main_rpm: z.number().positive().optional(),
      max_sub_rpm: z.number().positive().optional(),
      max_live_rpm: z.number().positive().optional(),
      program_number: z.number().int().optional(),
    }).passthrough(),
  })
  .passthrough()
  .describe("Generate complete mill-turn / Swiss program with multi-channel sync, sub-spindle transfer, and bar management.");

// ─── BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILL iter-1 ───────────────────────
// FiveAxis LoRA closed-loop pair — 5-axis dataset builder (tilt/TCPC-aware,
// singularity-weighted) + weekly retrain-cadence scheduler. Both are pure
// transforms; the dataset builder reuses RawJobSchema/DatasetSplitConfigSchema.

/** mill_5axis_lora_build_dataset — FiveAxisLoRADatasetBuilderEngine.buildDataset(jobs, split?) */
const mill_5axis_lora_build_dataset = z
  .object({
    jobs: z
      .array(RawJobSchema)
      .min(1)
      .describe("RawJob array — 5-axis jobs with features (tilt_deg, tcpc_enabled, ...) + actual surface_ra_um."),
    split: DatasetSplitConfigSchema.optional().describe("Optional split config (defaults to DEFAULT_SPLIT)."),
  })
  .passthrough()
  .describe("Build a LoRA fine-tuning dataset (Alpaca-format) from 5-axis RawJob records.");

/** mill_5axis_lora_required_schema — FiveAxisLoRADatasetBuilderEngine.requiredSchema (no-arg) */
const mill_5axis_lora_required_schema = z
  .object({})
  .strict()
  .describe("Return the required feature + actual key schema for 5-axis LoRA datasets.");

/** mill_5axis_lora_cadence_state — FiveAxisLoRACadenceEngine.getState (no-arg) */
const mill_5axis_lora_cadence_state = z
  .object({})
  .passthrough()
  .describe("No-arg snapshot of the 5-axis LoRA retrain-cadence state.");

/** mill_5axis_lora_cadence_config — FiveAxisLoRACadenceEngine.getConfig (no-arg) */
const mill_5axis_lora_cadence_config = z
  .object({})
  .passthrough()
  .describe("No-arg snapshot of the 5-axis LoRA retrain-cadence config (weekly defaults).");

/** mill_5axis_lora_cadence_should_run — FiveAxisLoRACadenceEngine.shouldTriggerRun (no-arg) */
const mill_5axis_lora_cadence_should_run = z
  .object({})
  .passthrough()
  .describe("Decide whether a 5-axis LoRA retrain should trigger now (cadence + min-new-jobs gate).");

/** mill_5axis_lora_cadence_check_drift — FiveAxisLoRACadenceEngine.checkDrift(currentScore, baselineScore) */
const mill_5axis_lora_cadence_check_drift = z
  .object({
    currentScore: z.number().describe("Current adapter performance score."),
    baselineScore: z.number().describe("Baseline performance score to compare against."),
  })
  .passthrough()
  .describe("Detect performance drift vs baseline; flags whether a 5-axis LoRA retrain should be triggered.");

// ─── BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-2 ─────────────────────────────
// FiveAxisCAMIntegrationEngine — 3-axis→5-axis conversion + 5-axis G-code.
// Segment/config records stay free-form (z.record) — the engine owns the
// domain validation; the schema only enforces the array/object shapes.

/** mill_5axis_cam_convert_3to5 — FiveAxisCAMIntegrationEngine.convert3to5axis(segments3, config) */
const mill_5axis_cam_convert_3to5 = z
  .object({
    segments3: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .describe("3-axis path segments (x,y,z,feed_mmmin,rpm,type + optional surface normals nx,ny,nz)."),
    config: z
      .record(z.string(), z.unknown())
      .describe("FiveAxisConfig — machine_type, a/b/c axis ranges, lead/lean angles, RTCP + singularity flags."),
  })
  .passthrough()
  .describe("Convert a 3-axis toolpath to 5-axis: tool axis from surface normals + lead/lean tilt.");

/** mill_5axis_cam_gcode — FiveAxisCAMIntegrationEngine.toFiveAxisGcode(segments, config) */
const mill_5axis_cam_gcode = z
  .object({
    segments: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .describe("5-axis segments (x,y,z,i,j,k,a_deg,b_deg,feed_mmmin,rpm,type)."),
    config: z
      .object({ rpm: z.number().positive().describe("Spindle speed (rev/min).") })
      .passthrough()
      .describe("FiveAxisConfig + numeric rpm + optional program_number."),
  })
  .passthrough()
  .describe("Emit 5-axis G-code (A/B rotary, optional G43.4/G43.5 RTCP) from 5-axis segments.");

// ─── BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-3 ─────────────────────────────
// FiveAxisToolpathSynthesisEngine — 5-axis strategy synthesis + catalog reads.
// The synthesis input is a deep nested record (geometry/material/tool/machine);
// the engine owns the structural validation, so the schema only enforces the
// top-level 'input' object.

/** mill_5axis_synth_recommend — FiveAxisToolpathSynthesisEngine.synthesize(input) */
const mill_5axis_synth_recommend = z
  .object({
    input: z
      .record(z.string(), z.unknown())
      .describe("FiveAxisSynthesisInput — geometry, material, tool, machine, batch_size, operator_skill, prefer_novel, use_ai_reasoning."),
  })
  .passthrough()
  .describe("Recommend a 5-axis toolpath strategy from geometry + physics (catalog scoring + singularity/RTCP analysis).");

/** mill_5axis_synth_strategies — FiveAxisToolpathSynthesisEngine.getAllStrategies (no-arg) */
const mill_5axis_synth_strategies = z
  .object({})
  .passthrough()
  .describe("Return the full 5-axis strategy catalog.");

/** mill_5axis_synth_strategies_by_family — getStrategiesByFamily(family) */
const mill_5axis_synth_strategies_by_family = z
  .object({
    family: z.string().min(1).describe("FiveAxisFamily filter (e.g. point_milling, impeller_machining, swarf_cutting)."),
  })
  .passthrough()
  .describe("Return 5-axis strategies belonging to one family.");

/** mill_5axis_synth_novel_strategies — getNovelStrategies (no-arg) */
const mill_5axis_synth_novel_strategies = z
  .object({})
  .passthrough()
  .describe("Return the PRISM-novel 5-axis strategies from the catalog.");

/** mill_5axis_synth_get_strategy — getStrategyById(id) */
const mill_5axis_synth_get_strategy = z
  .object({
    id: z.string().min(1).describe("Strategy id (e.g. hm_5x_shape_offset)."),
  })
  .passthrough()
  .describe("Look up a single 5-axis strategy by id; returns found=false when absent.");

// ─── BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-4 ─────────────────────────────
// MillingUnifiedScienceOrchestrationEngine — 7-domain scientific analysis +
// rapid parameter validation + material/domain catalog reads.

/** mill_sci_analyze — analyzeScientifically(material, conditions) */
const mill_sci_analyze = z
  .object({
    material: z.string().min(1).describe("Material key (e.g. 4140, Ti-6Al-4V) — falls back to 4140 if unknown."),
    conditions: z
      .record(z.string(), z.unknown())
      .describe("CuttingConditions — speeds/feeds, tool geometry, tool material, coolant."),
  })
  .passthrough()
  .describe("Comprehensive 7-domain scientific analysis of a milling operation.");

/** mill_sci_quick_analyze — quickAnalyze(material, Vc, fz, ap, ae, D) */
const mill_sci_quick_analyze = z
  .object({
    material: z.string().min(1).describe("Material key (falls back to 4140 if unknown)."),
    Vc: z.number().positive().describe("Cutting speed (m/min)."),
    fz: z.number().positive().describe("Feed per tooth (mm)."),
    ap: z.number().positive().describe("Axial depth of cut (mm)."),
    ae: z.number().positive().describe("Radial depth of cut (mm)."),
    D: z.number().positive().describe("Tool diameter (mm)."),
  })
  .passthrough()
  .describe("Rapid milling parameter validation — Kienzle force, temperature, stability, Taylor life.");

/** mill_sci_material_properties — getMaterialProperties(material) */
const mill_sci_material_properties = z
  .object({
    material: z.string().min(1).describe("Material key to look up."),
  })
  .passthrough()
  .describe("Return material properties from the science material database (found=false when absent).");

/** mill_sci_materials — getAvailableMaterials (no-arg) */
const mill_sci_materials = z
  .object({})
  .passthrough()
  .describe("List the material keys available in the science material database.");

/** mill_sci_tips — getScientificTips(domain) */
const mill_sci_tips = z
  .object({
    domain: z.string().min(1).describe("Scientific domain (mechanics, thermodynamics, metallurgy, tribology, dynamics, chemistry, fluid_mechanics)."),
  })
  .passthrough()
  .describe("Return scientific tribal tips for one domain.");

/** mill_sci_domains — getScientificDomains (no-arg) */
const mill_sci_domains = z
  .object({})
  .passthrough()
  .describe("List the 7 scientific domains the engine analyzes.");

/** mill_sci_self_awareness — getSelfAwareness (no-arg) */
const mill_sci_self_awareness = z
  .object({})
  .passthrough()
  .describe("Return the engine's self-awareness / system-capability snapshot.");

/** mill_sci_stats — getStats (no-arg) */
const mill_sci_stats = z
  .object({})
  .passthrough()
  .describe("Return the engine's request/usage statistics.");

// ─── BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-5 ─────────────────────────────
// FiveAxisOrchestrationEngine — 5-axis DSL parsing + RTCP controller dialects
// + machine-dynamics catalog + operation-sequence registry.

/** mill_5axis_orch_dsl_examples — getDSLSyntaxExamples (no-arg) */
const mill_5axis_orch_dsl_examples = z
  .object({})
  .passthrough()
  .describe("Return example 5-axis orchestration DSL snippets.");

/** mill_5axis_orch_parse_dsl — parseDSL(source) */
const mill_5axis_orch_parse_dsl = z
  .object({
    source: z.string().min(1).describe("5-axis orchestration DSL source text to parse into a DSLScript."),
  })
  .passthrough()
  .describe("Parse a 5-axis orchestration DSL script (returns id/name/ast/variables/commands).");

/** mill_5axis_orch_rtcp_dialect — getRTCPDialect(controller) */
const mill_5axis_orch_rtcp_dialect = z
  .object({
    controller: z.string().min(1).describe("Controller type (fanuc, heidenhain, siemens, ...)."),
  })
  .passthrough()
  .describe("Return the RTCP G-code dialect (activation/deactivation codes) for a controller.");

/** mill_5axis_orch_machine_dynamics — getDefaultDynamics(machineId) */
const mill_5axis_orch_machine_dynamics = z
  .object({
    machine_id: z.string().min(1).describe("Machine identifier to look up default dynamics for."),
  })
  .passthrough()
  .describe("Return default machine dynamics (axis limits, accelerations) for a machine id.");

/** mill_5axis_orch_sequences — getAllSequences (no-arg) */
const mill_5axis_orch_sequences = z
  .object({})
  .passthrough()
  .describe("Return all registered 5-axis operation sequences.");

// ─── EXPORT ─────────────────────────────────────────────────────────────────

/**
 * Map of action name → Zod schema for validation.
 * Actions not in this map pass validation with any params (backward compatibility).
 */
export const MILL_ACTION_SCHEMAS: ActionSchemaMap = {
  // Print-to-program pipeline
  mill_print_to_program,
  mill_feature_recognize,
  mill_process_plan,
  mill_generate_gcode,
  mill_validate_program,

  // Strategy selection
  mill_strategy_select,
  mill_strategy_recommend,
  mill_strategy_compare,
  mill_strategy_optimize,

  // Toolpath operations
  mill_toolpath_generate,
  mill_toolpath_simulate,
  mill_toolpath_optimize,
  mill_toolpath_rest,
  mill_toolpath_adaptive,
  mill_toolpath_hsm,
  mill_toolpath_trochoidal,

  // Physics & validation
  mill_force_calculate,
  mill_deflection_check,
  mill_chatter_predict,
  mill_thermal_analyze,
  mill_power_verify,

  // Collision & kinematics
  mill_collision_check,
  mill_collision_zones,
  mill_kinematics_verify,
  mill_work_envelope,

  // Tool selection
  mill_tool_recommend,
  mill_tool_assembly,
  mill_tool_holder_match,

  // AI/AGI features
  mill_agi_orchestrate,
  mill_neural_recommend,
  mill_deeplearn_predict,
  mill_pattern_mine,
  mill_wisdom_query,

  // Self-awareness & capability discovery
  mill_selfaware_registry,
  mill_selfaware_recommend,
  mill_selfaware_find,
  mill_selfaware_stats,

  // Digital twin
  mill_twin_sync,
  mill_twin_predict,
  mill_twin_calibrate,

  // Scientific pipeline
  mill_scientific_analyze,
  mill_scientific_optimize,
  mill_uncertainty_quantify,

  // Quick helpers
  mill_quick_speed_feed,
  mill_quick_cycle_time,
  mill_quick_cost_estimate,

  // Validation & quality
  mill_validate_setup,
  mill_validate_safety,
  mill_spc_analyze,

  // P1-U09-L2-AGG: L2 aggregator routing
  mill_ai_orchestrate,
  mill_turn_orchestrate,
  mill_5axis_orchestrate,
  mill_multiaxis_orchestrate,

  // Tribal knowledge (MillTribalKnowledgeEngine)
  mill_tribal_query,
  mill_tribal_get,
  mill_tribal_add,
  mill_tribal_stats,

  // End-to-end orchestration (MillingEndToEndOrchestrationEngine)
  mill_e2e_workflow,

  // Reasoning trace ledger (MillingReasoningTraceLedgerEngine)
  mill_trace_record,
  mill_trace_query,

  // Inference orchestration (MillingInferenceOrchestratorEngine)
  mill_inference_run,

  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH2: 6 neural/AI mill engines
  mill_neural_cognitive_process,
  mill_critical_analyze,
  mill_meta_learn_record,
  mill_meta_learn_self_assess,
  mill_ai_parse_nl_query,
  mill_ai_archive_stats,

  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH3: 6 unwired physics/RL/pattern mill engines
  mill_physics_force,
  mill_physics_tool_life,
  mill_program_pattern_analyze,
  mill_rl_select_action,
  mill_head_recommend,
  mill_machine_intel_get,

  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH4: 6 unwired deep-AI / digital-twin mill engines
  mill_deep_reason,
  mill_deep_integrate,
  mill_knowledge_search,
  mill_knowledge_stats,
  mill_ai_unified_recommend,
  mill_milling_twin_sync,

  // ENGINE-WIRE-MILL-MS0/U-WIRE-MILL-BATCH5: 6 unwired AGI / online-learning / troubleshooting mill engines
  mill_agi_quick_analyze,
  mill_knowledge_orch_recommend,
  mill_troubleshoot,
  mill_lora_cadence_state,
  mill_online_record_step,
  mill_online_detect_drift,

  // MS-PRINT-PROGRAM-LOOP / U-PPL-A5: MillPartClassifierEngine — 4 actions
  mill_part_classify,
  mill_part_classify_batch,
  mill_part_family_profile,
  mill_part_families_list,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING: MillingHybridStrategySynthesizer — 4 actions
  mill_hybrid_synthesize,
  mill_hybrid_quick_recommend,
  mill_hybrid_strategies,
  mill_hybrid_synergy,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-2: MillingLoRADatasetBuilderEngine — 2 actions
  mill_lora_build_dataset,
  mill_lora_required_schema,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-3: MillTurnLoRADatasetBuilderEngine — 2 actions
  millturn_lora_build_dataset,
  millturn_lora_required_schema,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-4: MillTurnCAMEngine — 1 action
  millturn_cam_generate,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-5: MillingUltimateAIEngine — 2 actions
  mill_ultimate_quick_analyze,
  mill_ultimate_explore_variability,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-6: MillNeuralNetworkEngine — 4 actions
  mill_neural_encode_features,
  mill_neural_add_sample,
  mill_neural_train,
  mill_neural_predict,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-7: MillingProductionKnowledgeHarvesterEngine — 5 actions
  mill_pkh_recommend_params,
  mill_pkh_validate_params,
  mill_pkh_tribal_knowledge,
  mill_pkh_stats,
  mill_pkh_self_awareness,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILLING iter-8: MillingAIUltraIntelligenceEngine — 20 actions
  mill_uai_parse_nl,
  mill_uai_process_nl,
  mill_uai_generate_prompt,
  mill_uai_select_strategy,
  mill_uai_compare_strategies,
  mill_uai_predict_tool_life,
  mill_uai_record_tool_life,
  mill_uai_extract_toolpath_features,
  mill_uai_score_toolpath,
  mill_uai_explain_decision,
  mill_uai_get_recommended_action,
  mill_uai_record_episode,
  mill_uai_calculate_reward,
  mill_uai_get_policy_stats,
  mill_uai_diagnose_problem,
  mill_uai_generate_troubleshooting_prompt,
  mill_uai_clear_all,
  mill_uai_get_tool_life_data_count,
  mill_uai_get_rl_episode_count,
  mill_uai_get_troubleshooting_history_count,

  // BRIDGE-CONSOLIDATED / U-BRIDGE-WIRE-MILL iter-1: FiveAxis LoRA closed-loop pair — 6 actions
  mill_5axis_lora_build_dataset,
  mill_5axis_lora_required_schema,
  mill_5axis_lora_cadence_state,
  mill_5axis_lora_cadence_config,
  mill_5axis_lora_cadence_should_run,
  mill_5axis_lora_cadence_check_drift,

  // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-2: FiveAxisCAMIntegrationEngine — 2 actions
  mill_5axis_cam_convert_3to5,
  mill_5axis_cam_gcode,

  // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-3: FiveAxisToolpathSynthesisEngine — 5 actions
  mill_5axis_synth_recommend,
  mill_5axis_synth_strategies,
  mill_5axis_synth_strategies_by_family,
  mill_5axis_synth_novel_strategies,
  mill_5axis_synth_get_strategy,

  // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-4: MillingUnifiedScienceOrchestrationEngine — 8 actions
  mill_sci_analyze,
  mill_sci_quick_analyze,
  mill_sci_material_properties,
  mill_sci_materials,
  mill_sci_tips,
  mill_sci_domains,
  mill_sci_self_awareness,
  mill_sci_stats,

  // BRIDGE-WIRING / U-BRIDGE-WIRE-MILL iter-5: FiveAxisOrchestrationEngine — 5 actions
  mill_5axis_orch_dsl_examples,
  mill_5axis_orch_parse_dsl,
  mill_5axis_orch_rtcp_dialect,
  mill_5axis_orch_machine_dynamics,
  mill_5axis_orch_sequences,
};
