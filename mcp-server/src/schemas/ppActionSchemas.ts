/**
 * PostProcessor Dispatcher Action Schemas
 * ========================================
 * Per-action Zod schemas for all 50 prism_pp actions.
 * Organized by category: generate, analyze, optimize, validate, physics, neural, tribal, controller, kinematics.
 *
 * @module schemas/ppActionSchemas
 * @version 1.0.0
 * @milestone PP-DISPATCHER
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
};
