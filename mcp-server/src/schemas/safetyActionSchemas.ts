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
  // U-WIRE-KILLSWITCH: read-only TriLevelKillSwitch actions (slot:papa 2026-06-11)
  killswitch_state: z.object({}).passthrough(),
  killswitch_gate: z.object({}).passthrough(),
  killswitch_stats: z.object({}).passthrough(),
  killswitch_trips: z.object({
    level: z.enum(["L1_PHYSICAL", "L2_MTCONNECT", "L3_SOFTWARE"]).optional(),
    since: z.number().optional(),
    limit: z.number().optional(),
  }).passthrough(),
  killswitch_compliance: z.object({ since: z.number().optional() }).passthrough(),
  // U-WIRE-SBOM: read-only SBOMReviewEngine actions (slot:papa 2026-06-13)
  sbom_stats: z.object({}).passthrough(),
  sbom_posture: z.object({}).passthrough(),
  sbom_components: z.object({
    type: z.enum(["npm", "pypi", "cargo", "go", "maven", "nuget", "gem", "rpm", "deb", "apk", "other"]).optional(),
    direct_only: z.boolean().optional(),
  }).passthrough(),
  sbom_vulnerabilities: z.object({
    severity: z.enum(["none", "low", "medium", "high", "critical"]).optional(),
    component_id: z.string().optional(),
  }).passthrough(),
  sbom_remediations: z.object({
    status: z.enum(["open", "in_progress", "resolved", "accepted_risk", "false_positive"]).optional(),
    overdue_only: z.boolean().optional(),
  }).passthrough(),
  // U-WIRE-WETRUN-FSM: WetRunStateMachineEngine wet-run safety FSM (slot:papa 2026-06-14)
  wetrun_start_session: z.object({
    session_id: z.string().min(1), tenant_id: z.string().min(1), part_id: z.string(),
    machine_id: z.string(), operator: z.string(), now: z.number().optional(),
  }).passthrough(),
  wetrun_record_part: z.object({
    session_id: z.string().min(1), passed: z.boolean(),
    root_cause: z.string().optional(), now: z.number().optional(),
  }).passthrough(),
  wetrun_record_safety_event: z.object({
    session_id: z.string().min(1),
    kind: z.enum(["kill_switch_l1", "kill_switch_l2", "collision", "workholding_slip", "spindle_overrun", "tool_breakage", "other"]),
    severity: z.enum(["critical", "high", "medium"]),
    detail: z.string(), now: z.number().optional(),
  }).passthrough(),
  wetrun_get_session: z.object({ session_id: z.string().min(1) }).passthrough(),
  wetrun_list_sessions: z.object({
    state: z.enum(["WET_PASS", "WET_SOFT_FAIL", "WET_HARD_FAIL", "QUARANTINE", "RESOLVED"]).optional(),
    tenant_id: z.string().optional(),
  }).passthrough(),
  wetrun_list_transitions: z.object({ session_id: z.string().optional(), since: z.number().optional() }).passthrough(),
  wetrun_list_scrap_events: z.object({ session_id: z.string().optional() }).passthrough(),
  wetrun_list_safety_events: z.object({ session_id: z.string().optional() }).passthrough(),
  // U-WIRE-WETFREEZE: WetRunChangeFreezeEngine change-freeze windows (slot:papa 2026-06-14)
  wetfreeze_declare_window: z.object({
    id: z.string().min(1), name: z.string(),
    kind: z.enum(["quarter_end", "audit", "customer_visit", "regulatory", "holiday", "emergency"]),
    start_ts: z.number(), end_ts: z.number(), declared_by: z.string(), approved_by: z.string(),
    reason: z.string(), declared_at: z.number(),
  }).passthrough(),
  wetfreeze_grant_override: z.object({
    window_id: z.string().min(1),
    change_kinds: z.array(z.enum(["wet_run_authorization", "program_release", "deviation", "post_processor_change", "tool_library_update"])).min(1),
    granted_by: z.string(), granted_to: z.string(), expires_at: z.number(), reason: z.string(), granted_at: z.number(),
  }).passthrough(),
  wetfreeze_check: z.object({
    now_ts: z.number(),
    change_kind: z.enum(["wet_run_authorization", "program_release", "deviation", "post_processor_change", "tool_library_update"]),
  }).passthrough(),
  wetfreeze_list_active: z.object({ now_ts: z.number() }).passthrough(),
  wetfreeze_get_window: z.object({ id: z.string().min(1) }).passthrough(),
  wetfreeze_get_override: z.object({ override_id: z.string().min(1) }).passthrough(),
  wetfreeze_list_windows: z.object({}).passthrough(),
  wetfreeze_list_overrides: z.object({}).passthrough(),
  // U-WIRE-WETRET: WetRunRetentionPolicyEngine compliance-retention lifecycle (slot:papa 2026-06-14)
  wetret_register: z.object({
    artifact_id: z.string().min(1), pilot_id: z.string().min(1),
    kind: z.enum(["program_revision", "session_log", "ncr_record", "fai_report", "comms_log_entry", "scrap_ledger_row", "deviation_record", "post_mortem_doc", "tool_library_snapshot"]),
    regimes: z.array(z.enum(["ITAR", "AS9100", "ISO_9001", "IATF_16949", "FDA_21CFR820", "INTERNAL_RND"])).min(1),
    created_at: z.number(),
  }).passthrough(),
  wetret_can_purge: z.object({ artifact_id: z.string().min(1), now_ts: z.number() }).passthrough(),
  wetret_schedule_purge: z.object({
    artifact_id: z.string().min(1), target_purge_at: z.number(),
    scheduled_by: z.string(), approver: z.string(), reason: z.string(),
  }).passthrough(),
  wetret_cancel_purge: z.object({ artifact_id: z.string().min(1), cancelled_by: z.string(), reason: z.string() }).passthrough(),
  wetret_execute_purge: z.object({ artifact_id: z.string().min(1), purged_at: z.number() }).passthrough(),
  wetret_set_legal_hold: z.object({
    artifact_id: z.string().min(1), set_by: z.string(), approver: z.string(), reason: z.string(), set_at: z.number(),
  }).passthrough(),
  wetret_release_legal_hold: z.object({
    artifact_id: z.string().min(1), released_by: z.string(), approver: z.string(), reason: z.string(), released_at: z.number(),
  }).passthrough(),
  wetret_get: z.object({ artifact_id: z.string().min(1) }).passthrough(),
  wetret_list: z.object({ pilot_id: z.string().optional() }).passthrough(),
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
  // OCTOPUS-NEURAL-MS0/U-OCN05: dynamic N-of-M quorum from diff classification
  quorum_required: z.object({
    files: z.array(z.object({
      path: z.string().min(1),
      added_lines: z.number().int().min(0).optional(),
      removed_lines: z.number().int().min(0).optional(),
      patch: z.string().optional(),
    })).default([]).describe("Diff files (path + optional size/patch hints)"),
    commit_subject: z.string().optional().describe("Commit subject — searched for SAFETY/PHYSICS hint signals"),
  }).passthrough().describe("Classify a diff and return the recommended scrutiny quorum (1-of-1 to 5-of-5) — engine: ConsensusQuorumEngine"),

  // WIRE-UNWIRED-MS0/U-WIRE-WEDMGOV: read-only WEDM autonomy-state inspection
  wedm_governance_path: z.object({}).passthrough()
    .describe("Resolve the canonical filepath for the WEDM autonomy state file (no params)."),
  wedm_governance_read: z.object({
    file_path: z.string().min(1).optional().describe("Override the default governance file path (optional)."),
    filePath: z.string().min(1).optional().describe("camelCase alias for file_path."),
  }).passthrough()
    .describe("Read the WEDM autonomy state file as-is (no engine mutation). Returns null if the file does not exist."),
  wedm_governance_snapshot: z.object({
    file_path: z.string().min(1).optional().describe("Override the default governance file path (optional)."),
    filePath: z.string().min(1).optional().describe("camelCase alias for file_path."),
  }).passthrough()
    .describe("Read the WEDM autonomy state file and return an AutonomySnapshot-shaped projection (level + version + history)."),

  // MS-CRITWIRE/U-CW-03 (oscar iter25 2026-05-24) — Altintas SLD safety gate
  chatter_stability_gate: z.object({
    tool: z.object({
      diameter_mm: posNum.describe("Tool diameter, mm"),
      flute_count: z.number().int().positive().describe("Number of flutes/teeth"),
      overhang_mm: posNum.describe("Tool overhang from holder gauge line, mm"),
      material: z.enum(["carbide", "hss", "cermet"]).describe("Tool body material"),
    }).passthrough(),
    workpiece: z.object({
      iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO machining group"),
      kc11_mpa: optPosNum.describe("Optional specific cutting force override (defaults to canonical kc1.1 per ISO group)"),
    }).passthrough(),
    machine: z.object({
      machine_id: optStr.describe("MachineRegistry FRF lookup ID"),
      natural_frequency_hz: z.number().positive().finite().optional().describe("Manual override for tool-tip natural frequency, Hz"),
      damping_ratio: z.number().positive().max(1).optional().describe("Manual override for damping ratio (0 < ζ ≤ 1 — physical bound; >1 is overdamped, no chatter possible)"),
      stiffness_n_um: z.number().positive().finite().optional().describe("Manual override for stiffness, N/μm"),
      max_rpm: z.number().positive().finite().describe("Spindle max rpm"),
      min_rpm: z.number().positive().finite().optional().describe("Spindle min rpm"),
    }).passthrough(),
    cutting: z.object({
      radial_immersion_ratio: z.number().min(0).max(1).describe("ae/D ratio (0-1)"),
      up_milling: z.boolean().describe("true=up-milling, false=down-milling"),
    }).passthrough(),
    rpm_range: z.tuple([z.number().positive().finite(), z.number().positive().finite()]).optional().describe("Optional rpm-window for the SLD sweep"),
    rpm_points: z.number().int().positive().optional().describe("Optional rpm-sample count"),
    proposed_rpm: z.number().positive().finite().describe("Proposed spindle rpm at the operating point"),
    proposed_ap_mm: z.number().positive().finite().describe("Proposed axial depth of cut, mm, at the operating point"),
    safety_factor: z.number().min(1).finite().optional().describe("Safety factor applied to lobe ap-ceiling (default 1.25; must be ≥ 1)"),
  }).passthrough()
    .describe("Altintas single-DoF stability-lobe safety gate. Computes the SLD envelope and verifies the proposed (rpm, ap_mm) lies below the lobe ceiling at that rpm with the configured safety factor. Encodes the Re[Φ(ωc)]≥0 regenerative-chatter onset guard via the engine's lobe envelope. Returns {safe, reason, max_stable_ap_mm_at_rpm, optimal_rpm, chatter_frequency_hz, active_lobe_number, recommendations}."),

  // MS-CRITWIRE/U-CW-04 (oscar iter26 2026-05-24) — Coolant supply adequacy gate
  coolant_supply_adequacy_gate: z.object({
    pipe_diameter_mm: z.number().positive().finite().describe("Pipe/channel inner diameter, mm"),
    pipe_length_mm: z.number().positive().finite().describe("Pipe/channel length, mm"),
    flow_rate_lpm: z.number().positive().finite().describe("Flow rate, L/min"),
    nozzle_diameter_mm: z.number().positive().finite().describe("Nozzle diameter, mm"),
    supply_pressure_bar: z.number().positive().finite().describe("Supply pressure, bar"),
    coolant_density_kg_m3: z.number().positive().finite().optional().describe("Coolant density, kg/m³ (default 1000)"),
    viscosity_Pa_s: z.number().positive().finite().optional().describe("Dynamic viscosity, Pa·s (default 0.001)"),
    roughness_um: z.number().nonnegative().finite().optional().describe("Pipe roughness, µm (default 15)"),
    p_atm_bar: z.number().positive().finite().optional().describe("Atmospheric pressure, bar (default 1.01325)"),
    nozzle_Cv: z.number().positive().max(1).optional().describe("Nozzle discharge coefficient (default 0.85; 0 < Cv ≤ 1)"),
    nozzle_to_cut_distance_mm: z.number().positive().finite().describe("Distance from nozzle exit to the cut zone, mm — gate verifies jet coherence reaches this distance"),
    min_required_pressure_bar: z.number().positive().finite().describe("Operator-specified minimum effective pressure at the nozzle exit, bar — gate fails LOUD if delivered pressure undercuts this floor"),
  }).passthrough()
    .describe("Coolant supply adequacy safety gate. Runs Darcy-Weisbach + jet-coherence on the supply chain (CoolantOptimizationPhysicsEngine.fluidDelivery), then verifies (a) effective nozzle pressure ≥ floor, (b) jet coherence reaches the cut zone, (c) flow is turbulent (laminar collapses coherence), (d) no engine warnings. Returns {safe, reason, effective_nozzle_pressure_bar, jet_coherence_length_mm, flow_regime, reynolds_number, engine_warnings, recommendations}."),

  // MS-CRITWIRE/U-CW-05 (oscar iter27 2026-05-24) — Spindle torque adequacy gate
  spindle_torque_adequacy_gate: z.object({
    program: z.object({
      program_id: z.string().min(1).optional(),
      operations: z.array(z.object({
        op_number: z.number().int(),
        spindle_rpm: z.number(),
        cutting_force_n: z.number(),
        cutting_speed_m_min: z.number(),
      }).passthrough()).min(1).describe("Per-operation cutting plan (op_number, spindle_rpm, cutting_force_n, cutting_speed_m_min — matches ToolpathProgram operation shape)"),
    }).passthrough().describe("Toolpath program with per-operation cutting parameters"),
    machine: z.object({
      max_power_kW: z.number().positive().finite().describe("Spindle peak power, kW — constant-power region above base_rpm"),
      max_torque_Nm: z.number().positive().finite().describe("Spindle peak torque, Nm — constant-torque region below base_rpm"),
      base_rpm: z.number().positive().finite().optional().describe("Base rpm where torque-curve transitions from constant-torque to constant-power; derived from 9549×P_max/T_max if omitted"),
      max_rpm: z.number().positive().finite().describe("Hard upper rpm limit; ops above this BLOCK regardless of torque"),
    }).passthrough().describe("Spindle envelope spec (constant-torque + constant-power two-region curve)"),
    safe_utilisation_pct: z.number().min(0).max(100).optional().describe("Safe-band utilisation ceiling (default 85; Sandvik §3.4 15-20% headroom doctrine)"),
  }).passthrough()
    .describe("Spindle torque adequacy safety gate. STRICT policy — only overall.status === SAFE passes; WARNING band (≥safe_threshold but ≤100%) maps to safe=false because the safety surface refuses operating without headroom for runout + Kienzle uncertainty + interrupted-cut spikes. Returns {safe, reason, overall_status, worst_utilisation_pct, worst_case_op_number, any_torque_failure, any_rpm_over_max, any_nan_input, recommendations}."),

  // ──────────────────────────────────────────────────────────────────────
  // WIRE-SAFETY-GATES-MS0/U-VICTOR-SAFETY-GATES (slot:victor, 2026-05-26)
  // Half-wire closure: 13 gate-engine actions had dispatch logic + action-sets
  // + ALL_ACTIONS enum membership but no schemas → silent Zod-validation skip
  // per H:/.claude/rules/schemas.md ("schemas must match dispatcher z.enum
  // exactly"). These minimal passthrough schemas register the action contract;
  // the engine-side already does its own input validation (each is a singleton
  // wired in safetyDispatcher.ts lines 888-939). Future units can tighten each
  // schema per its specific engine API.
  // ──────────────────────────────────────────────────────────────────────
  workholding_retrofit_advise: z.object({}).passthrough()
    .describe("WorkholdingRetrofitAdvisorEngine — diagnose existing fixture runout / check fixture viability / recommend retrofit. Engine selects between diagnoseRunout / checkFixtureViability / run() based on the input shape."),
  swiss_collision_check: z.object({
    config: z.unknown().optional().describe("Swiss-type machine config (guide bushing, bar feeder, sub-spindle envelope)"),
    state: z.unknown().optional().describe("Current cutting state (tool positions, sub-spindle handoff state)"),
  }).passthrough()
    .describe("SwissTypeCollisionEngine.checkAll — Swiss-type collision detector across guide-bushing + main-spindle + sub-spindle envelopes."),
  corrigibility_gate_evaluate: z.object({
    nowMs: z.number().int().nonnegative().optional().describe("Reference timestamp (epoch ms) for gate evaluation; defaults to now()"),
  }).passthrough()
    .describe("CorrigibilityGateEngine.evaluate — AI-safety corrigibility gate. Verifies the system still accepts operator override under all current conditions. AI-safety critical."),
  workholding_selection_select: z.object({}).passthrough()
    .describe("WorkholdingSelectionEngine.select / quickSelect — recommend workholding (vise / vacuum / magnetic / 3R / fixture) given part geometry + material + tolerance + batch size."),
  pre_wet_run_chaos_gate: z.object({
    bundle_hash: z.string().optional().describe("Build/bundle hash being evaluated"),
    now: z.number().int().nonnegative().optional().describe("Reference timestamp (epoch ms); defaults to now()"),
  }).passthrough()
    .describe("PreWetRunChaosGateEngine.buildReport — chaos-engineering gate before a wet (live-cutting) run. Forces N rollback scenarios + rollback-budget verification per the MANDATORY_SCENARIOS contract."),
  mou_stall_gate_compute: z.object({
    now: z.number().int().nonnegative().optional().describe("Reference timestamp (epoch ms) for deadline evaluation; defaults to now()"),
  }).passthrough()
    .describe("MOUStallGateEngine.computeGate — Memorandum-of-Understanding stall gate. Aggregates registered blockers + their deadlines; returns gate decision (open / hold / escalate)."),
  pilot_phase_exit_evaluate: z.object({}).passthrough()
    .describe("PilotPhaseExitGateEngine.evaluate — phase-exit promotion gate (pilot → production). Verifies all promotion criteria (signoffs + numeric thresholds + temporal-leakage check) before exit is allowed."),
  inference_lora_gate_apply: z.object({}).passthrough()
    .describe("InferenceLoRAGateEngine.apply — verifies a LoRA-adapter inference call is bounded to the adapter's residual envelope. Refuses inference if residual exceeds the registered field-level bound. Safety-critical for AI inference in production."),
  promotion_gate_evaluate: z.object({}).passthrough()
    .describe("PromotionGateEngine.evaluate — promotion gate (e.g. canary → full rollout). Aggregates observations recorded via record(), applies the gate criteria, returns evaluation result + temporal-leakage check."),
  gate_failure_history_record: z.object({}).passthrough()
    .describe("GateFailureHistoryEngine — record a gate failure event OR retrieve the history. Engine selects between record() (when ts/event present) and listHistory() based on input shape."),
  git_safety_check: z.object({
    training_max_ts: z.string().optional().describe("ISO-8601 max timestamp in the training set (for temporal-leakage check)"),
    test_min_ts: z.string().optional().describe("ISO-8601 min timestamp in the test set"),
  }).passthrough()
    .describe("GitSafetyEngine.assertNoTemporalLeakage — verifies training-set max-timestamp < test-set min-timestamp (no look-ahead leakage) before model promotion."),
  stock_boundary_gate_check: z.object({}).passthrough()
    .describe("StockBoundaryGateEngine.check / evaluate / run — verifies the proposed toolpath stays within the stock boundary (no air-cuts + no over-cuts) given stock geometry + workholding."),
  archive_catalog_ingest: z.object({}).passthrough()
    .describe("ArchiveToPartsCatalogIngesterEngine.ingest — ingests an archive (zip/tar of historical part programs) into the parts catalog. Idempotent — repeated ingests of the same archive are no-ops."),
  query_workholding_fixtures: z.object({
    fixtureTypeId: optStr.describe("Look up one fixture-type spec by id (e.g. 'vise', 'hydraulic_vise', 'chuck_3jaw', 'collet_chuck')"),
    productId: optStr.describe("Look up one workholding product spec by id"),
    category: optStr.describe("List fixture types in a category: standard|premium|turning|specialty|custom|production|id_clamping"),
    manufacturer: optStr.describe("List products by EXACT (case-insensitive) manufacturer name: Kurt | Schunk | Lang Technik | Mitee-Bite (partial names like 'Lang' do not match)"),
  }).passthrough()
    .describe("MonolithWorkholdingDatabaseEngine — read-only fixture-type + product catalog query. Keys are evaluated in PRIORITY order (fixtureTypeId → productId → category → manufacturer); only the highest-priority present key is honored. No key → full catalog listing (fixtureTypes + products)."),
};
