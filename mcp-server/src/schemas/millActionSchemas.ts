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
};
