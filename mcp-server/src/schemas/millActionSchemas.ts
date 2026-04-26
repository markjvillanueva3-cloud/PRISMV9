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

const mill_generate_gcode = z
  .object({
    operations: z.array(z.record(z.string(), z.unknown())).min(1).describe("Planned operations."),
    controller: z.enum(["fanuc", "haas", "okuma", "mazak", "siemens", "heidenhain", "generic"]).optional(),
    program_number: z.number().int().positive().optional(),
    include_comments: z.boolean().optional(),
    safe_z_mm: z.number().optional(),
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
};
