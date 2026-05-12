/**
 * Safety Dispatcher Action Schemas
 * ==================================
 * Per-action Zod schemas for all 30 prism_safety actions.
 * STRICT mode: safety-critical — reject invalid params.
 *
 * Organized by handler: collision (8), coolant (5), spindle (5),
 * breakage (5), workholding (6), workholding-intelligence (1).
 *
 * @module schemas/safetyActionSchemas
 * @version 1.0.0
 * @milestone SYS-MS6-U02
 */

import { z } from "zod";
import type { ActionSchemaMap } from "./actionSchemaTypes.js";

// ============================================================================
// REUSABLE SUB-SCHEMAS
// ============================================================================

const posNum = z.number().positive();
const optPosNum = z.number().positive().optional();
const optNum = z.number().optional();
const optStr = z.string().optional();
const optBool = z.boolean().optional();

/** 3D coordinate */
const point3d = z.object({ x: z.number(), y: z.number(), z: z.number() }).passthrough();

/** Cutting forces (Fc, Ff, Fp) */
const forces3d = z.object({
  Fc: z.number(), Ff: z.number(), Fp: z.number(),
  torque: optNum,
}).passthrough();

/** Tool geometry (common across breakage/collision) */
const toolGeom = z.object({
  diameter: posNum,
  shankDiameter: optPosNum,
  fluteLength: optPosNum,
  overallLength: optPosNum,
  stickout: optPosNum,
  numberOfFlutes: z.number().int().positive().optional(),
  coreRatio: optPosNum,
  neckDiameter: optPosNum,
  toolId: optStr,
  toolType: optStr,
  holder: optStr,
}).passthrough();

/** Tool axis direction vector */
const toolAxis = z.object({ x: z.number(), y: z.number(), z: z.number() }).passthrough().optional();

/** Spindle type enum */
const spindleType = z.enum([
  "DIRECT_DRIVE", "BELT_DRIVE", "GEAR_DRIVE", "MOTORIZED", "HIGH_SPEED",
]).optional();

/** Operation type enum */
const operationType = z.enum([
  "ROUGHING", "FINISHING", "SEMI_FINISHING", "DRILLING", "TAPPING",
  "MILLING", "TURNING", "BORING", "REAMING", "THREADING",
]).optional();

/** Coolant delivery enum */
const deliveryType = z.enum([
  "FLOOD", "THROUGH_SPINDLE", "MQL", "AIR_BLAST", "DRY",
  "EXTERNAL_NOZZLE", "HIGH_PRESSURE",
]);

/** Material type enum (for coolant/breakage) */
const materialType = z.enum([
  "STEEL", "STAINLESS", "CAST_IRON", "ALUMINUM", "TITANIUM",
  "SUPERALLOY", "COPPER", "PLASTIC", "COMPOSITE",
]).optional();

/** Workholding type enum */
const workholdingType = z.enum([
  "VISE", "CHUCK", "COLLET", "VACUUM", "MAGNETIC",
  "FIXTURE", "CLAMP", "TOMBSTONE",
]);

// ============================================================================
// TYPED SUB-SCHEMAS (replacing z.any() for safety-critical validation)
// ============================================================================

/** Toolpath move — position + move type + optional feed/speed */
const toolpathMove = z.object({
  type: z.enum(["RAPID", "LINEAR", "ARC_CW", "ARC_CCW", "DWELL"]).optional(),
  x: optNum, y: optNum, z: optNum,
  a: optNum, b: optNum, c: optNum,
  feed: optNum,
  speed: optNum,
}).passthrough();

/** Axis travel limits (min/max range) */
const axisLimits = z.object({
  min: z.number(),
  max: z.number(),
}).passthrough();

/** Fixture geometry — bounding box + position + type */
const fixtureGeom = z.object({
  fixtureId: optStr,
  type: optStr,
  position: point3d.optional(),
  boundingBox: z.object({
    min: point3d, max: point3d,
  }).passthrough().optional(),
  height: optNum,
  width: optNum,
  length: optNum,
}).passthrough();

/** Workpiece geometry — material + bounding box + stock */
const workpieceGeom = z.object({
  workpieceId: optStr,
  material: optStr,
  position: point3d.optional(),
  boundingBox: z.object({
    min: point3d, max: point3d,
  }).passthrough().optional(),
  stockDiameter: optNum,
  stockLength: optNum,
  stockWidth: optNum,
  stockHeight: optNum,
}).passthrough();

/** Obstacle geometry (fixture or workpiece reference) */
const obstacleGeom = z.object({
  position: point3d.optional(),
  boundingBox: z.object({
    min: point3d, max: point3d,
  }).passthrough().optional(),
  radius: optNum,
  height: optNum,
  type: optStr,
}).passthrough();

/** Full toolpath reference (for report/near-miss actions) */
const toolpathRef = z.object({
  toolpathId: optStr,
  tool: toolGeom.optional(),
  moves: z.array(toolpathMove).optional(),
  workOffset: optStr,
}).passthrough();

/** Machine config reference (for report actions) */
const machineRef = z.object({
  machineId: optStr,
  xLimits: axisLimits.optional(),
  yLimits: axisLimits.optional(),
  zLimits: axisLimits.optional(),
}).passthrough();

/** Spindle head geometry */
const spindleHeadGeom = z.object({
  diameter: optNum,
  length: optNum,
  type: optStr,
}).passthrough();

/** Vacuum spec for workholding */
const vacuumSpecSchema = z.object({
  suctionArea: optNum,
  pressure: optNum,
  sealType: optStr,
}).passthrough();

/** Magnetic spec for workholding */
const magneticSpecSchema = z.object({
  holdingForce: optNum,
  polePitch: optNum,
  type: optStr,
}).passthrough();

/** Force direction vector */
const forceDirectionSchema = z.object({
  x: z.number(), y: z.number(), z: z.number(),
}).passthrough();

/** Support location */
const supportLocation = z.object({
  position: point3d.optional(),
  x: optNum, y: optNum, z: optNum,
  type: optStr,
  force: optNum,
}).passthrough();

/** Surface condition enum */
const surfaceCondition = z.enum([
  "DRY", "OILY", "COOLANT_WET", "CLEAN", "ROUGH",
]).optional();

// ============================================================================
// COLLISION ACTIONS (8)
// ============================================================================

const check_toolpath_collision = z.object({
  toolpath: z.object({
    toolpathId: optStr,
    tool: toolGeom,
    moves: z.array(toolpathMove).min(1),
    workOffset: optStr,
  }).passthrough(),
  machine: z.object({
    machineId: optStr,
    xLimits: axisLimits.optional(),
    yLimits: axisLimits.optional(),
    zLimits: axisLimits.optional(),
  }).passthrough(),
  fixtures: z.array(fixtureGeom),
  workpiece: workpieceGeom.optional(),
}).passthrough();

const validate_rapid_moves = z.object({
  toolpath: z.object({
    tool: z.object({ diameter: posNum }).passthrough(),
    moves: z.array(toolpathMove).min(1),
  }).passthrough(),
  machine: machineRef,
  fixtures: z.array(fixtureGeom),
  safeZ: optNum,
}).passthrough();

const check_fixture_clearance = z.object({
  position: point3d,
  tool: z.object({
    diameter: posNum,
    fluteLength: posNum,
    overallLength: posNum,
    shankDiameter: optPosNum,
  }).passthrough(),
  fixtures: z.array(fixtureGeom).min(1),
  toolAxis,
  minClearance: z.number().nonnegative().default(2.0),
}).passthrough();

const calculate_safe_approach = z.object({
  target: point3d,
  toolRadius: posNum,
  obstacles: z.array(obstacleGeom),
  clearance: z.number().nonnegative().default(2.0),
  preferredDirection: z.string().default("Z_PLUS"),
}).passthrough();

const detect_near_miss = z.object({
  toolpath: toolpathRef,
  obstacles: z.array(obstacleGeom),
  threshold: z.number().positive().default(5.0),
  reportAll: z.boolean().default(false),
}).passthrough();

const generate_collision_report = z.object({
  toolpath: toolpathRef,
  machine: machineRef,
  fixtures: z.array(fixtureGeom),
  workpiece: workpieceGeom.optional(),
  includeNearMisses: z.boolean().default(true),
  nearMissThreshold: z.number().positive().default(5.0),
}).passthrough();

const validate_tool_clearance = z.object({
  tool: toolGeom,
  position: point3d,
  toolAxis,
  obstacles: z.array(obstacleGeom),
}).passthrough();

const check_5axis_head_clearance = z.object({
  position: point3d,
  toolAxis: point3d,
  machine: z.object({
    machineId: optStr,
    spindleHead: spindleHeadGeom.optional(),
  }).passthrough(),
  fixtures: z.array(fixtureGeom).optional(),
  workpiece: workpieceGeom.optional(),
  aAngle: optNum,
  bAngle: optNum,
  cAngle: optNum,
}).passthrough();

// ============================================================================
// COOLANT ACTIONS (5)
// ============================================================================

const validate_coolant_flow = z.object({
  delivery: deliveryType,
  coolantType: z.string().default("WATER_SOLUBLE"),
  flowRate: posNum,
  pressure: posNum,
  operation: z.string().min(1),
  toolDiameter: posNum,
  cuttingSpeed: posNum,
  feedRate: z.number().positive().default(100),
  holeDepth: optPosNum,
  materialType,
  hasThroughCoolant: optBool,
}).passthrough();

const check_through_spindle_coolant = z.object({
  pressure: posNum,
  flowRate: z.number().positive().default(20),
  toolDiameter: posNum,
  holeDepth: posNum,
  materialType,
  hasThroughCoolant: z.boolean().default(true),
  coolantHoleDiameter: optPosNum,
}).passthrough();

const calculate_chip_evacuation = z.object({
  toolDiameter: posNum,
  holeDepth: posNum,
  availablePressure: posNum,
  availableFlow: posNum,
  materialType,
  delivery: deliveryType.default("THROUGH_SPINDLE"),
}).passthrough();

const validate_mql_parameters = z.object({
  oilFlowRate: posNum,
  airPressure: posNum,
  operation: z.string().min(1),
  toolDiameter: posNum,
  cuttingSpeed: z.number().positive().default(150),
  feedRate: z.number().positive().default(100),
  materialType,
}).passthrough();

const get_coolant_recommendations = z.object({
  operation: z.string().min(1),
  materialType: z.string().min(1),
  toolDiameter: posNum,
  holeDepth: optPosNum,
  cuttingSpeed: optPosNum,
}).passthrough();

// ============================================================================
// SPINDLE ACTIONS (5)
// ============================================================================

const check_spindle_torque = z.object({
  requiredTorque: posNum,
  targetSpeed: posNum,
  spindleType,
  ratedTorque: optPosNum,
  peakTorque: optPosNum,
  cornerSpeed: optPosNum,
  operationType,
  isInterrupted: optBool,
}).passthrough();

const check_spindle_power = z.object({
  requiredPower: posNum,
  targetSpeed: posNum,
  spindleType,
  ratedPower: optPosNum,
  peakPower: optPosNum,
  cornerSpeed: optPosNum,
  operationType,
  duration: optPosNum,
}).passthrough();

const validate_spindle_speed = z.object({
  requestedSpeed: posNum,
  spindleType,
  minSpeed: optPosNum,
  maxSpeed: optPosNum,
  cornerSpeed: optPosNum,
  ratedTorque: optPosNum,
  ratedPower: optPosNum,
  currentLoad: z.number().nonnegative().default(0),
  loadType: z.enum(["TORQUE", "POWER"]).default("TORQUE"),
}).passthrough();

const monitor_spindle_thermal = z.object({
  currentTemperature: z.number(),
  loadPercent: z.number().nonnegative(),
  spindleType,
  coolingType: z.enum(["OIL_JET", "AIR", "WATER", "NONE"]).default("OIL_JET"),
  maxTemperature: optPosNum,
  warningTemperature: optPosNum,
  runTime: z.number().nonnegative().default(0),
  plannedDuration: optPosNum,
  ambientTemperature: optNum,
}).passthrough();

const get_spindle_safe_envelope = z.object({
  spindle: z.object({
    type: z.string().min(1),
    ratedPower: posNum,
    peakPower: optPosNum,
    ratedTorque: posNum,
    peakTorque: optPosNum,
    minSpeed: optPosNum,
    maxSpeed: posNum,
    cornerSpeed: optPosNum,
    maxTemperature: optPosNum,
    coolingType: optStr,
  }).passthrough(),
  requirements: z.object({
    requiredTorque: posNum,
    requiredPower: posNum,
    targetSpeed: posNum,
    operationType,
    duration: optPosNum,
    isInterrupted: optBool,
  }).passthrough(),
  currentState: z.object({
    temperature: z.number().default(30),
    runTime: z.number().nonnegative().default(0),
  }).passthrough().optional(),
}).passthrough();

// ============================================================================
// TOOL BREAKAGE ACTIONS (5)
// ============================================================================

const predict_tool_breakage = z.object({
  tool: z.object({
    diameter: posNum,
    shankDiameter: posNum,
    fluteLength: posNum,
    overallLength: posNum,
    stickout: posNum,
    numberOfFlutes: z.number().int().positive(),
    coreRatio: optPosNum,
    neckDiameter: optPosNum,
  }).passthrough(),
  forces: forces3d,
  conditions: z.object({
    feedPerTooth: posNum,
    axialDepth: posNum,
    radialDepth: posNum,
    cuttingSpeed: z.number().positive().default(100),
    spindleSpeed: z.number().positive().default(5000),
  }).passthrough(),
  toolMaterial: z.string().default("CARBIDE"),
  workpieceMaterial: optStr,
  operationType,
  isInterrupted: optBool,
  cyclesAccumulated: optNum,
  tolerance: optNum,
}).passthrough();

const calculate_tool_stress = z.object({
  tool: z.object({
    diameter: posNum,
    shankDiameter: posNum,
    stickout: posNum,
    numberOfFlutes: z.number().int().positive().optional(),
    fluteLength: optPosNum,
    overallLength: optPosNum,
    coreRatio: optPosNum,
    neckDiameter: optPosNum,
  }).passthrough(),
  forces: forces3d,
  toolMaterial: z.string().default("CARBIDE"),
  isInterrupted: z.boolean().default(false),
}).passthrough();

const check_chip_load_limits = z.object({
  toolDiameter: posNum,
  feedPerTooth: posNum,
  radialDepth: posNum,
  stickout: optPosNum,
  toolMaterial: z.string().default("CARBIDE"),
  workpieceMaterial: z.string().default("STEEL"),
  numberOfFlutes: z.number().int().positive().default(4),
  cuttingSpeed: z.number().positive().default(100),
  axialDepth: optPosNum,
  spindleSpeed: z.number().positive().default(5000),
}).passthrough();

const estimate_tool_fatigue = z.object({
  tool: z.object({
    diameter: posNum,
    shankDiameter: posNum,
    stickout: posNum,
    numberOfFlutes: z.number().int().positive().optional(),
    fluteLength: optPosNum,
    overallLength: optPosNum,
    coreRatio: optPosNum,
  }).passthrough(),
  forces: forces3d,
  toolMaterial: z.string().default("CARBIDE"),
  cyclesAccumulated: z.number().nonnegative(),
  isInterrupted: z.boolean().default(false),
}).passthrough();

const get_safe_cutting_limits = z.object({
  tool: z.object({
    diameter: posNum,
    shankDiameter: posNum,
    fluteLength: posNum,
    stickout: posNum,
    overallLength: optPosNum,
    numberOfFlutes: z.number().int().positive().default(4),
  }).passthrough(),
  toolMaterial: z.string().default("CARBIDE"),
  operationType: z.string().default("FINISHING"),
  workpieceMaterial: z.string().default("STEEL"),
}).passthrough();

// ============================================================================
// WORKHOLDING ACTIONS (6)
// ============================================================================

const calculate_clamp_force_required = z.object({
  cuttingForces: forces3d,
  workholdingType,
  surfaceCondition: surfaceCondition.default("DRY"),
  appliedClampForce: posNum,
  maxClampForce: optPosNum,
  operationType,
  isInterrupted: z.boolean().default(false),
  frictionOverride: optPosNum,
  safetyFactorOverride: optPosNum,
}).passthrough();

const validate_workholding_setup = z.object({
  operation: z.object({
    operationType: z.string().min(1),
    cuttingForces: forces3d,
    forceApplicationPoint: point3d,
    isInterrupted: z.boolean().default(false),
  }).passthrough(),
  workpiece: z.object({
    material: z.string().min(1),
    elasticModulus: posNum,
    yieldStrength: optPosNum,
    length: posNum,
    width: posNum,
    height: posNum,
    wallThickness: optPosNum,
    weight: optPosNum,
  }).passthrough(),
  clampConfiguration: z.object({
    deviceType: z.string().min(1),
    surfaceCondition: optStr,
    clampLocations: z.array(z.object({
      id: optStr,
      x: z.number(), y: z.number(), z: z.number(),
      forceDirection: forceDirectionSchema,
      clampForce: posNum,
    }).passthrough()).min(1),
    supportLocations: z.array(supportLocation).optional(),
    partOrientation: z.string().min(1),
  }).passthrough(),
  tolerance: optNum,
  vacuumSpec: vacuumSpecSchema.optional(),
  magneticSpec: magneticSpecSchema.optional(),
}).passthrough();

const check_pullout_resistance = z.object({
  axialForce: posNum,
  totalClampForce: posNum,
  workholdingType,
  surfaceCondition: surfaceCondition.default("DRY"),
  numberOfJaws: z.number().int().positive().default(2),
  safetyFactor: z.number().positive().default(2.5),
}).passthrough();

const analyze_liftoff_moment = z.object({
  cuttingForces: forces3d,
  forceApplicationPoint: point3d,
  clampLocations: z.array(z.object({
    x: z.number(), y: z.number(), z: z.number(),
    clampForce: posNum,
    id: optStr,
  }).passthrough()).min(1),
  supportLocations: z.array(supportLocation).optional(),
  partWeight: optPosNum,
  partLength: optPosNum,
  safetyFactor: z.number().positive().default(2.0),
}).passthrough();

const calculate_part_deflection = z.object({
  cuttingForces: forces3d,
  workpiece: z.object({
    material: optStr,
    elasticModulus: posNum,
    yieldStrength: optPosNum,
    length: posNum,
    width: posNum,
    height: posNum,
    wallThickness: optPosNum,
  }).passthrough(),
  supportType: optStr,
  numberOfSupports: z.number().int().positive().optional(),
  numberOfClamps: z.number().int().positive().optional(),
  tolerance: posNum,
}).passthrough();

const validate_vacuum_fixture = z.object({
  fixtureType: z.enum(["VACUUM", "MAGNETIC"]),
  cuttingForces: forces3d,
  sealArea: posNum,
  vacuumPressure: z.number().positive().default(85),
  sealType: z.enum(["O_RING", "LIP_SEAL", "FLAT"]).default("O_RING"),
  surfaceFinishRa: optPosNum,
  sealEfficiency: optPosNum,
  magneticHoldingForce: optPosNum,
  partThickness: optPosNum,
  partPermeability: z.number().positive().default(100),
  safetyFactor: z.number().positive().default(2.0),
}).passthrough();

// ============================================================================
// WORKHOLDING INTELLIGENCE ACTION (1) — WorkholdingIntelligenceEngine.fixtureRecommend
// ============================================================================

/** recommend_workholding — given part + operation + peak cutting force, return the optimal
 * fixture (type, clamp positions, clamp force, contact area, setup time, cost) plus a deflection
 * + slip + safety-factor analysis with actionable flags. Wraps WorkholdingIntelligenceEngine. */
const recommend_workholding = z.object({
  part: z.object({
    material: z.string().min(1).describe("Workpiece material name (e.g. '4140', 'Aluminum 6061', 'Ti-6Al-4V')"),
    length_mm: posNum.describe("Part overall length, mm"),
    width_mm: posNum.describe("Part overall width, mm"),
    height_mm: posNum.describe("Part overall height, mm"),
    weight_kg: optPosNum.describe("Part weight, kg — estimated from dims + material density if omitted"),
    shape: z.enum(["prismatic", "round", "plate", "irregular"]).optional().describe("Part shape class"),
  }).passthrough().describe("Part geometry + material"),
  operation: z.string().min(1).describe("Machining operation (e.g. 'face milling', 'roughing', 'drilling')"),
  max_cutting_force_n: posNum.describe("Peak cutting force expected during the operation, N"),
  tolerance_mm: posNum.describe("Dimensional tolerance the part must hold, mm — drives the deflection check"),
  machine: optStr.describe("Machine ID/name — constrains the fixture envelope"),
  batch_size: z.number().int().positive().optional().describe("Batch size — biases ranking toward dedicated fixtures for larger batches"),
}).passthrough();

// ============================================================================
// SCHEMA REGISTRY
// ============================================================================

/** A C T I O N_ S A F E T Y_ S C H E M A S constant.
 */
export const ACTION_SAFETY_SCHEMAS: ActionSchemaMap = {
  // Collision (8)
  check_toolpath_collision,
  validate_rapid_moves,
  check_fixture_clearance,
  calculate_safe_approach,
  detect_near_miss,
  generate_collision_report,
  validate_tool_clearance,
  check_5axis_head_clearance,
  // Coolant (5)
  validate_coolant_flow,
  check_through_spindle_coolant,
  calculate_chip_evacuation,
  validate_mql_parameters,
  get_coolant_recommendations,
  // Spindle (5)
  check_spindle_torque,
  check_spindle_power,
  validate_spindle_speed,
  monitor_spindle_thermal,
  get_spindle_safe_envelope,
  // Tool Breakage (5)
  predict_tool_breakage,
  calculate_tool_stress,
  check_chip_load_limits,
  estimate_tool_fatigue,
  get_safe_cutting_limits,
  // Workholding (6)
  calculate_clamp_force_required,
  validate_workholding_setup,
  check_pullout_resistance,
  analyze_liftoff_moment,
  calculate_part_deflection,
  validate_vacuum_fixture,
  // Workholding Intelligence (1)
  recommend_workholding,
};
