/**
 * PostProcessor Dispatcher Action Schemas
 * ========================================
 * Per-action Zod schemas for all 75 prism_pp actions.
 * Organized by category: generate, analyze, optimize, validate, physics, neural, tribal, controller, kinematics,
 * strategy, troubleshoot, formula, learning, graph.
 *
 * @module schemas/ppActionSchemas
 * @version 1.1.0
 * @milestone PP-DISPATCHER, PP-WIRE-MS1
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE FIELD SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();
const optStr = z.string().optional();
const optBool = z.boolean().optional();

/** Controller type enum */
const controllerType = z.enum([
  "fanuc", "haas", "siemens", "heidenhain", "mazak", "okuma",
  "brother", "mitsubishi", "hurco", "doosan", "dmg_mori", "makino",
  "generic"
]).optional();

/** Machine type enum */
const machineType = z.enum([
  "3_axis", "4_axis", "5_axis", "lathe", "mill_turn", "swiss"
]).optional();

/** Optimization target enum */
const optimizationTarget = z.enum([
  "cycle_time", "tool_life", "surface_finish", "energy", "balanced"
]).optional();

/** Material ISO group */
const isoGroup = z.enum(["P", "M", "K", "N", "S", "H"]).optional();

// ============================================================================
// PP_GENERATE: G-code generation schemas (6 actions)
// ============================================================================

const pp_generate_gcode = z.object({
  moves: z.array(z.object({
    type: z.enum(["rapid", "feed", "arc_cw", "arc_ccw", "drill", "tap", "bore", "comment"]),
    x: optNum, y: optNum, z: optNum,
    a: optNum, b: optNum, c: optNum,
    i: optNum, j: optNum, k: optNum,
    feed: optPosNum,
    text: optStr,
  })).optional(),
  controller: controllerType,
  toolNumber: z.number().int().min(1).max(999).optional(),
  rpm: optPosNum,
  feedRate: optPosNum,
  coolant: z.enum(["flood", "mist", "air", "tsc", "none"]).optional(),
  workOffset: optStr,
}).passthrough();

const pp_generate_header = z.object({
  programNumber: z.number().int().min(1).max(9999).optional(),
  programName: z.string().max(256).optional(),
  controller: controllerType,
  comment: optStr,
  includeDate: optBool,
}).passthrough();

const pp_generate_safe_start = z.object({
  controller: controllerType,
  machineType: machineType,
  includeWorkOffset: optBool,
  includeG28: optBool,
}).passthrough();

const pp_generate_tool_change = z.object({
  toolNumber: z.number().int().min(1).max(999),
  rpm: posNum,
  coolant: z.enum(["flood", "mist", "air", "tsc", "none"]).optional(),
  controller: controllerType,
  lengthOffset: z.number().int().optional(),
  radiusOffset: z.number().int().optional(),
}).passthrough();

const pp_generate_canned_cycle = z.object({
  cycleType: z.enum(["drill", "peck", "tap", "bore", "ream", "deep_hole", "back_bore"]),
  depth: posNum,
  retract: posNum,
  feed: posNum,
  controller: controllerType,
  peckDepth: optPosNum,
  dwell: optPosNum,
  pitch: optPosNum,
}).passthrough();

const pp_generate_subroutine = z.object({
  subroutineNumber: z.number().int().min(1).max(9999),
  controller: controllerType,
  repeatCount: z.number().int().min(1).max(9999).optional(),
  isLocal: optBool,
}).passthrough();

// ============================================================================
// PP_ANALYZE: Analysis schemas (6 actions)
// ============================================================================

const pp_analyze_cps = z.object({
  filePath: z.string().optional(),
  content: z.string().optional(),
}).passthrough();

const pp_analyze_gcode = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
}).passthrough();

const pp_analyze_safety = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
  machineType: machineType,
  machineLimits: z.object({
    xMin: optNum, xMax: optNum,
    yMin: optNum, yMax: optNum,
    zMin: optNum, zMax: optNum,
    aMin: optNum, aMax: optNum,
    bMin: optNum, bMax: optNum,
    cMin: optNum, cMax: optNum,
    maxRpm: optPosNum,
    maxFeed: optPosNum,
  }).optional(),
}).passthrough();

const pp_analyze_optimization = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
  targetMetric: optimizationTarget,
}).passthrough();

const pp_analyze_controller_fit = z.object({
  gcode: z.string().min(1),
  targetController: controllerType,
  sourceController: controllerType,
}).passthrough();

const pp_analyze_complexity = z.object({
  gcode: z.string().min(1),
}).passthrough();

// ============================================================================
// PP_OPTIMIZE: Optimization schemas (6 actions)
// ============================================================================

const pp_optimize_feed = z.object({
  gcode: z.string().min(1),
  material: z.object({
    name: optStr,
    isoGroup: isoGroup,
    hardness: optPosNum,
  }).optional(),
  tool: z.object({
    diameter: optPosNum,
    flutes: z.number().int().min(1).max(20).optional(),
    type: optStr,
  }).optional(),
  aggressiveness: z.number().min(0).max(1).optional(),
}).passthrough();

const pp_optimize_motion = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
  tolerance: optPosNum,
  reduceRapids: optBool,
  optimizeArcs: optBool,
}).passthrough();

const pp_optimize_cycle_time = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
  rapidRate: optPosNum,
  maxFeedOverride: z.number().min(1).max(200).optional(),
}).passthrough();

const pp_optimize_tool_life = z.object({
  gcode: z.string().min(1),
  material: z.object({
    name: optStr,
    isoGroup: isoGroup,
    hardness: optPosNum,
  }).optional(),
  targetToolLife: optPosNum,
}).passthrough();

const pp_optimize_surface_finish = z.object({
  gcode: z.string().min(1),
  targetRa: optPosNum,
  material: z.object({
    name: optStr,
    isoGroup: isoGroup,
  }).optional(),
}).passthrough();

const pp_optimize_energy = z.object({
  gcode: z.string().min(1),
  machineEfficiency: z.number().min(0.1).max(1).optional(),
  prioritizeSpindle: optBool,
}).passthrough();

// ============================================================================
// PP_VALIDATE: Safety validation schemas (6 actions)
// ============================================================================

const pp_validate_program = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
  strictMode: optBool,
}).passthrough();

const pp_validate_limits = z.object({
  gcode: z.string().min(1),
  machineLimits: z.object({
    xMin: z.number(), xMax: z.number(),
    yMin: z.number(), yMax: z.number(),
    zMin: z.number(), zMax: z.number(),
    aMin: optNum, aMax: optNum,
    bMin: optNum, bMax: optNum,
    cMin: optNum, cMax: optNum,
    maxRpm: optPosNum,
    maxFeed: optPosNum,
  }),
}).passthrough();

const pp_validate_collisions = z.object({
  gcode: z.string().min(1),
  stockDimensions: z.object({
    x: posNum, y: posNum, z: posNum,
  }).optional(),
  fixtureModel: optStr,
}).passthrough();

const pp_validate_forces = z.object({
  gcode: z.string().min(1),
  material: z.object({
    name: optStr,
    isoGroup: isoGroup,
    hardness: optPosNum,
  }),
  tool: z.object({
    diameter: posNum,
    flutes: z.number().int().min(1).max(20),
  }),
  maxForce: optPosNum,
}).passthrough();

const pp_validate_thermal = z.object({
  gcode: z.string().min(1),
  material: z.object({
    name: optStr,
    meltingPoint: optPosNum,
  }).optional(),
  coolant: z.enum(["flood", "mist", "air", "none"]).optional(),
  maxTemperature: optPosNum,
}).passthrough();

const pp_validate_syntax = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
}).passthrough();

// ============================================================================
// PP_PHYSICS: Physics-aware schemas (6 actions)
// ============================================================================

const pp_physics_forces = z.object({
  depthOfCut: posNum,
  feed: posNum,
  cuttingSpeed: posNum,
  material: z.object({
    isoGroup: isoGroup,
    kc1_1: optPosNum,
    mc: z.number().min(0).max(1).optional(),
  }).optional(),
  tool: z.object({
    diameter: posNum,
    approachAngle: optPosNum,
  }).optional(),
}).passthrough();

const pp_physics_thermal = z.object({
  cuttingSpeed: posNum,
  feed: posNum,
  depthOfCut: posNum,
  material: z.object({
    name: optStr,
    thermalConductivity: optPosNum,
  }).optional(),
  coolant: z.enum(["flood", "mist", "air", "cryogenic", "none"]).optional(),
}).passthrough();

const pp_physics_deflection = z.object({
  toolDiameter: posNum,
  toolLength: posNum,
  overhang: posNum,
  cuttingForce: posNum,
  toolMaterial: z.enum(["carbide", "hss", "ceramic"]).optional(),
}).passthrough();

const pp_physics_stability = z.object({
  rpm: posNum,
  depthOfCut: posNum,
  toolDiameter: posNum,
  toolLength: posNum,
  flutes: z.number().int().min(1).max(20),
  material: z.object({
    isoGroup: isoGroup,
  }).optional(),
}).passthrough();

const pp_physics_surface = z.object({
  feed: posNum,
  toolNoseRadius: posNum,
  cuttingSpeed: optPosNum,
  material: z.object({
    isoGroup: isoGroup,
  }).optional(),
}).passthrough();

const pp_physics_wear = z.object({
  cuttingSpeed: posNum,
  feed: posNum,
  depthOfCut: posNum,
  material: z.object({
    isoGroup: isoGroup,
    hardness: optPosNum,
  }).optional(),
  toolCoating: z.enum(["TiN", "TiAlN", "AlTiN", "TiCN", "DLC", "uncoated"]).optional(),
}).passthrough();

// ============================================================================
// PP_NEURAL: Neural network schemas (5 actions)
// ============================================================================

const pp_neural_predict = z.object({
  input: z.record(z.any()),
  targetVariable: z.string().optional(),
  model: z.enum(["feedforward", "lstm", "transformer"]).optional(),
}).passthrough();

const pp_neural_classify = z.object({
  gcode: z.string().optional(),
  features: z.record(z.any()).optional(),
  classType: z.enum(["controller", "operation", "material", "machine"]).optional(),
}).passthrough();

const pp_neural_optimize = z.object({
  gcode: z.string().min(1),
  objective: z.enum(["cycle_time", "tool_life", "surface_finish", "energy"]).optional(),
  constraints: z.record(z.any()).optional(),
}).passthrough();

const pp_neural_anomaly = z.object({
  gcode: z.string().min(1),
  threshold: z.number().min(0).max(1).optional(),
}).passthrough();

const pp_neural_learn = z.object({
  samples: z.array(z.object({
    input: z.record(z.any()),
    output: z.record(z.any()),
  })).optional(),
  model: z.enum(["feedforward", "lstm", "transformer"]).optional(),
}).passthrough();

// ============================================================================
// PP_TRIBAL: Tribal knowledge schemas (5 actions)
// ============================================================================

const pp_tribal_query = z.object({
  controller: controllerType,
  operation: optStr,
  material: optStr,
  keywords: z.array(z.string()).optional(),
  maxResults: z.number().int().min(1).max(50).optional(),
}).passthrough();

const pp_tribal_apply = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
  tips: z.array(z.string()).optional(),
  autoApply: optBool,
}).passthrough();

const pp_tribal_suggest = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
  context: z.object({
    material: optStr,
    operation: optStr,
    machine: optStr,
  }).optional(),
}).passthrough();

const pp_tribal_validate = z.object({
  gcode: z.string().min(1),
  controller: controllerType,
  strictness: z.enum(["strict", "moderate", "lenient"]).optional(),
}).passthrough();

const pp_tribal_contribute = z.object({
  tip: z.string().min(10).max(1000),
  controller: controllerType,
  category: z.enum(["safety", "optimization", "best_practice", "warning", "tip"]).optional(),
  source: optStr,
}).passthrough();

// ============================================================================
// PP_TRIBAL_ACTIVE: Activated tribal knowledge schemas (5 actions) — PP-TRIBAL-ACTIVATION
// ============================================================================

const decisionType = z.enum([
  "speed_feed", "toolpath_strategy", "controller_output", "problem_diagnosis",
  "tool_selection", "workholding", "surface_finish", "threading", "drilling",
  "milling_pocket", "milling_profile", "turning_roughing", "turning_finishing",
  "multi_axis", "general"
]).optional();

const pp_tribal_active_context = z.object({
  context: z.object({
    decision_type: decisionType.unwrap(),
    material: optStr,
    iso_group: isoGroup,
    operation: optStr,
    machine: optStr,
    controller: controllerType,
    tool_type: optStr,
    tool_diameter_mm: optPosNum,
    target_ra_um: optPosNum,
    symptom: optStr,
    cam_system: optStr,
    keywords: z.array(z.string()).optional(),
    hardness_hrc: optPosNum,
    cutting_speed: optPosNum,
    feed_rate: optPosNum,
    depth_of_cut: optPosNum,
  }).optional(),
  decision_type: decisionType,
  material: optStr,
  operation: optStr,
  controller: controllerType,
}).passthrough();

const pp_tribal_active_operation = z.object({
  operation: z.string().min(1).describe("Operation type (e.g., 'pocket', 'thread', 'drill')"),
  limit: z.number().int().min(1).max(50).optional().describe("Max tips to return"),
}).passthrough();

const pp_tribal_active_material = z.object({
  material: z.string().min(1).describe("Material name or ISO group (e.g., 'titanium', 'D2', 'M')"),
  limit: z.number().int().min(1).max(50).optional().describe("Max tips to return"),
}).passthrough();

const pp_tribal_active_controller = z.object({
  controller: z.string().min(1).describe("Controller type (e.g., 'fanuc', 'siemens', 'okuma')"),
  limit: z.number().int().min(1).max(50).optional().describe("Max tips to return"),
}).passthrough();

const pp_tribal_active_integrate = z.object({
  controller: z.string().min(1).describe("Controller type for PP integration"),
  machine_type: optStr.describe("Machine type (3_axis, 5_axis, lathe, etc.)"),
  gcode: optStr.describe("G-code being generated"),
  operation: optStr.describe("Operation type"),
  material: optStr.describe("Material being machined"),
  feature: optStr.describe("Specific feature being output"),
}).passthrough();

// ============================================================================
// PP_CONTROLLER: Controller-specific schemas (5 actions)
// ============================================================================

const pp_controller_capabilities = z.object({
  controller: controllerType.unwrap(),
}).passthrough();

const pp_controller_translate = z.object({
  gcode: z.string().min(1),
  sourceController: controllerType,
  targetController: controllerType.unwrap(),
  preserveComments: optBool,
}).passthrough();

const pp_controller_optimize = z.object({
  gcode: z.string().min(1),
  controller: controllerType.unwrap(),
  useControllerFeatures: optBool,
}).passthrough();

const pp_controller_validate = z.object({
  gcode: z.string().min(1),
  controller: controllerType.unwrap(),
  firmwareVersion: optStr,
}).passthrough();

const pp_controller_recommend = z.object({
  operation: z.enum(["milling", "turning", "drilling", "tapping", "5_axis", "probing"]),
  controller: controllerType,
  material: optStr,
}).passthrough();

// ============================================================================
// PP_KINEMATICS: Machine kinematics schemas (5 actions)
// ============================================================================

const pp_kinematics_analyze = z.object({
  machineType: z.enum(["3_axis", "4_axis", "5_axis_table_table", "5_axis_table_head", "5_axis_head_head"]),
  workEnvelope: z.object({
    x: posNum, y: posNum, z: posNum,
  }).optional(),
}).passthrough();

const pp_kinematics_transform = z.object({
  points: z.array(z.object({
    x: z.number(), y: z.number(), z: z.number(),
    a: optNum, b: optNum, c: optNum,
  })),
  mode: z.enum(["rtcp", "tcpm", "tcp", "none"]).optional(),
  toolLength: optPosNum,
  pivotPoint: z.object({ x: z.number(), y: z.number(), z: z.number() }).optional(),
}).passthrough();

const pp_kinematics_limits = z.object({
  gcode: z.string().min(1),
  axisLimits: z.object({
    x: z.tuple([z.number(), z.number()]),
    y: z.tuple([z.number(), z.number()]),
    z: z.tuple([z.number(), z.number()]),
    a: z.tuple([z.number(), z.number()]).optional(),
    b: z.tuple([z.number(), z.number()]).optional(),
    c: z.tuple([z.number(), z.number()]).optional(),
  }),
}).passthrough();

const pp_kinematics_singularity = z.object({
  gcode: z.string().optional(),
  toolpathPoints: z.array(z.object({
    x: z.number(), y: z.number(), z: z.number(),
    a: optNum, b: optNum, c: optNum,
  })).optional(),
  machineType: z.enum(["5_axis_table_table", "5_axis_table_head", "5_axis_head_head"]).optional(),
}).passthrough();

const pp_kinematics_optimize = z.object({
  gcode: z.string().min(1),
  machineType: z.enum(["3_axis", "4_axis", "5_axis_table_table", "5_axis_table_head", "5_axis_head_head"]),
  preferredAxes: z.array(z.enum(["A", "B", "C"])).optional(),
  avoidSingularities: optBool,
}).passthrough();

// ============================================================================
// PP_STRATEGY: Feature strategy KB schemas (PP-WIRE-MS1) (5 actions)
// ============================================================================

/** Feature type for strategy lookup */
const featureType = z.enum([
  "pocket", "slot", "contour", "face", "hole", "bore", "thread", "freeform", "wall", "rib"
]).optional();

/** Machine axes configuration */
const machineAxes = z.enum(["3-axis", "3+2", "5-axis"]).optional();

/** Operation type */
const operationType = z.enum(["roughing", "semi-finishing", "finishing"]).optional();

const pp_strategy_query = z.object({
  feature_type: featureType,
  iso_group: isoGroup,
  machine_axes: machineAxes,
  operation: operationType,
  special_conditions: z.array(z.string()).optional(),
}).passthrough();

const pp_strategy_best = z.object({
  feature_type: featureType.unwrap(),
  iso_group: isoGroup.unwrap(),
  machine_axes: machineAxes.unwrap(),
  operation: operationType.unwrap(),
}).passthrough();

const pp_strategy_list = z.object({
  feature_type: featureType,
}).passthrough();

const pp_strategy_add = z.object({
  rule: z.object({
    id: z.string().optional(),
    feature_type: featureType.unwrap(),
    iso_group: isoGroup.unwrap(),
    machine_axes: machineAxes.unwrap(),
    operation: operationType.unwrap(),
    strategy: z.string(),
    ae_pct: z.number().min(0).max(100),
    ap_factor: z.number().positive(),
    vc_mult: z.number().positive(),
    fz_mult: z.number().positive(),
    physics_basis: z.string().optional(),
    confidence: z.number().min(0).max(1).optional(),
  }),
}).passthrough();

const pp_strategy_stats = z.object({}).passthrough();

// ============================================================================
// PP_TROUBLESHOOT: Root cause diagnosis schemas (PP-WIRE-MS1) (4 actions)
// ============================================================================

/** Problem domain for troubleshooting */
const problemDomain = z.enum([
  "surface_finish", "dimensional_accuracy", "tool_breakage", "chatter_vibration",
  "chip_problems", "thermal_issues", "machine_alarms", "workholding"
]);

const pp_troubleshoot_start = z.object({
  domain: problemDomain,
  symptoms: z.array(z.string()).optional(),
}).passthrough();

const pp_troubleshoot_answer = z.object({
  session_id: z.string(),
  answer: z.string(),
}).passthrough();

const pp_troubleshoot_quick = z.object({
  domain: problemDomain,
  symptoms: z.array(z.string()).min(1),
}).passthrough();

const pp_troubleshoot_common = z.object({
  domain: problemDomain,
}).passthrough();

// ============================================================================
// PP_FORMULA: Cross-disciplinary formula schemas (PP-WIRE-MS1) (5 actions)
// ============================================================================

/** Cross-disciplinary domain */
const crossDomain = z.enum([
  "physics", "biology", "economics", "information_theory", "statistics",
  "psychology", "chemistry", "electrical_engineering", "operations_research",
  "finance", "graph_theory", "chaos_theory", "music_theory", "ecology", "computer_science"
]).optional();

const pp_formula_apply = z.object({
  formulaName: z.string(),
  inputs: z.record(z.string(), z.number()),
}).passthrough();

const pp_formula_find = z.object({
  domain: crossDomain,
  keywords: z.array(z.string()).optional(),
}).passthrough();

const pp_formula_explain = z.object({
  formulaName: z.string(),
}).passthrough();

const pp_formula_list = z.object({
  domain: crossDomain,
}).passthrough();

const pp_formula_stats = z.object({}).passthrough();

// ============================================================================
// PP_LEARNING: MIT courses + algorithms schemas (PP-WIRE-MS1) (6 actions)
// ============================================================================

const pp_learning_reason = z.object({
  query: z.string().min(5),
}).passthrough();

const pp_learning_execute_formula = z.object({
  id: z.string(),
  args: z.array(z.number()).optional(),
}).passthrough();

const pp_learning_execute_algo = z.object({
  id: z.string(),
  config: z.record(z.string(), z.any()).optional(),
}).passthrough();

const pp_learning_search = z.object({
  query: z.string().min(2),
}).passthrough();

const pp_learning_patterns = z.object({}).passthrough();

const pp_learning_summary = z.object({}).passthrough();

// ============================================================================
// PP_GRAPH: Manufacturing knowledge graph schemas (PP-WIRE-MS1) (5 actions)
// ============================================================================

const pp_graph_query = z.object({
  query: z.string().optional(),
  nodeType: z.enum(["material", "tool", "machine", "operation", "strategy", "part", "tribal_tip"]).optional(),
  keywords: z.array(z.string()).optional(),
}).passthrough();

const pp_graph_recommend = z.object({
  material: z.string().optional(),
  operation: z.string().optional(),
  machine: z.string().optional(),
}).passthrough();

const pp_graph_gaps = z.object({
  minTips: z.number().int().min(1).optional(),
  maxGaps: z.number().int().min(1).optional(),
}).passthrough();

const pp_graph_tribal = z.object({
  startNode: z.string().optional(),
  depth: z.number().int().min(1).max(10).optional(),
}).passthrough();

const pp_graph_link = z.object({
  tipId: z.string(),
  nodeId: z.string(),
  relationship: z.enum(["related_to", "supports", "proves", "contradicts"]).optional(),
  weight: z.number().min(0).max(1).optional(),
}).passthrough();

// ============================================================================
// PP_WIRING: Asset wiring schemas (PP-WIRE-MS5-7) (9 actions)
// ============================================================================

/** Algorithm category filter */
const algorithmCategory = z.enum([
  "optimization", "prediction", "detection", "modeling", "analysis",
  "control", "geometry", "thermal", "wear", "vibration", "machine_learning", "signal_processing"
]).optional();

/** Reasoning category filter */
const reasoningCategory = z.enum([
  "decision_making", "diagnostic", "creative", "causal", "multi_path",
  "deep_thinking", "explanation", "scientific", "domain_specific", "orchestration"
]).optional();

/** Reasoning domain filter */
const reasoningDomain = z.enum([
  "general", "milling", "turning", "five_axis", "edm",
  "post_processor", "business", "quality", "optimization"
]).optional();

const pp_wiring_algorithms = z.object({
  category: algorithmCategory,
}).passthrough();

const pp_wiring_algorithms_orphans = z.object({}).passthrough();

const pp_wiring_algorithms_consumers = z.object({
  algorithmName: z.string(),
}).passthrough();

const pp_wiring_reasoning = z.object({
  category: reasoningCategory,
  domain: reasoningDomain,
}).passthrough();

const pp_wiring_reasoning_orphans = z.object({}).passthrough();

const pp_wiring_reasoning_recommend = z.object({
  task: z.enum(["decision", "diagnosis", "optimization", "explanation", "creative"]),
}).passthrough();

const pp_wiring_summary = z.object({}).passthrough();

const pp_wiring_trends = z.object({}).passthrough();

const pp_wiring_priority = z.object({
  limit: z.number().int().min(1).max(50).optional(),
}).passthrough();

// ============================================================================
// EXPORT MAP
// ============================================================================

export const PP_ACTION_SCHEMAS: ActionSchemaMap = {
  // Generate
  pp_generate_gcode,
  pp_generate_header,
  pp_generate_safe_start,
  pp_generate_tool_change,
  pp_generate_canned_cycle,
  pp_generate_subroutine,

  // Analyze
  pp_analyze_cps,
  pp_analyze_gcode,
  pp_analyze_safety,
  pp_analyze_optimization,
  pp_analyze_controller_fit,
  pp_analyze_complexity,

  // Optimize
  pp_optimize_feed,
  pp_optimize_motion,
  pp_optimize_cycle_time,
  pp_optimize_tool_life,
  pp_optimize_surface_finish,
  pp_optimize_energy,

  // Validate
  pp_validate_program,
  pp_validate_limits,
  pp_validate_collisions,
  pp_validate_forces,
  pp_validate_thermal,
  pp_validate_syntax,

  // Physics
  pp_physics_forces,
  pp_physics_thermal,
  pp_physics_deflection,
  pp_physics_stability,
  pp_physics_surface,
  pp_physics_wear,

  // Neural
  pp_neural_predict,
  pp_neural_classify,
  pp_neural_optimize,
  pp_neural_anomaly,
  pp_neural_learn,

  // Tribal
  pp_tribal_query,
  pp_tribal_apply,
  pp_tribal_suggest,
  pp_tribal_validate,
  pp_tribal_contribute,

  // Tribal Active (PP-TRIBAL-ACTIVATION)
  pp_tribal_active_context,
  pp_tribal_active_operation,
  pp_tribal_active_material,
  pp_tribal_active_controller,
  pp_tribal_active_integrate,

  // Controller
  pp_controller_capabilities,
  pp_controller_translate,
  pp_controller_optimize,
  pp_controller_validate,
  pp_controller_recommend,

  // Kinematics
  pp_kinematics_analyze,
  pp_kinematics_transform,
  pp_kinematics_limits,
  pp_kinematics_singularity,
  pp_kinematics_optimize,

  // Strategy (PP-WIRE-MS1)
  pp_strategy_query,
  pp_strategy_best,
  pp_strategy_list,
  pp_strategy_add,
  pp_strategy_stats,

  // Troubleshoot (PP-WIRE-MS1)
  pp_troubleshoot_start,
  pp_troubleshoot_answer,
  pp_troubleshoot_quick,
  pp_troubleshoot_common,

  // Formula (PP-WIRE-MS1)
  pp_formula_apply,
  pp_formula_find,
  pp_formula_explain,
  pp_formula_list,
  pp_formula_stats,

  // Learning (PP-WIRE-MS1)
  pp_learning_reason,
  pp_learning_execute_formula,
  pp_learning_execute_algo,
  pp_learning_search,
  pp_learning_patterns,
  pp_learning_summary,

  // Graph (PP-WIRE-MS1)
  pp_graph_query,
  pp_graph_recommend,
  pp_graph_gaps,
  pp_graph_tribal,
  pp_graph_link,

  // Wiring (PP-WIRE-MS5-7)
  pp_wiring_algorithms,
  pp_wiring_algorithms_orphans,
  pp_wiring_algorithms_consumers,
  pp_wiring_reasoning,
  pp_wiring_reasoning_orphans,
  pp_wiring_reasoning_recommend,
  pp_wiring_summary,
  pp_wiring_trends,
  pp_wiring_priority,
};
