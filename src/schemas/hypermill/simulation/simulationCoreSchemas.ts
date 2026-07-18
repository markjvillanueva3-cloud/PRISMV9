/**
 * Simulation Core Parameter Schemas — hyperMILL Simulation
 *
 * U-HKC32: Zod schemas for 13 simulation types covering machine config,
 * collision simulation, stock verification, and travel limits.
 * DFM-critical and DFM-BLOCKING parameters are tagged in metadata
 * for downstream validation gates.
 *
 * AC Python call pattern:
 *   hm.simulation.load_kinematic(machine_id="DMG_DMU50", machine_type="5axis", ...)
 *
 * @domain Simulation
 * @milestone HM-KC-MS6/U-HKC32
 */

import { z } from "zod";

// ============================================================================
// 1. MACHINE CONFIG (3 types, 35 params)
// ============================================================================

// ── 1a. Load Kinematic (12 params) ──────────────────────────────────────────

export const loadKinematicSchema = z.object({
  machine_id: z
    .string()
    .min(1)
    .describe("Unique machine identifier from machine catalog"),
  machine_type: z
    .enum(["3axis", "4axis", "5axis", "mill_turn", "lathe"])
    .describe("Machine kinematic class defining axis configuration"),
  kinematic_model: z
    .string()
    .min(1)
    .describe("Kinematic chain model file or definition name"),
  axis_names: z
    .array(z.string())
    .min(1)
    .describe("Ordered list of axis names in the kinematic chain"),
  rotary_a_range: z
    .number()
    .min(-360)
    .max(360)
    .describe("A-axis rotary travel range, degrees"),
  rotary_b_range: z
    .number()
    .min(-360)
    .max(360)
    .describe("B-axis rotary travel range, degrees"),
  rotary_c_range: z
    .number()
    .min(-360)
    .max(360)
    .describe("C-axis rotary travel range, degrees"),
  linear_x_range: z
    .number()
    .min(0)
    .max(50000)
    .describe("X-axis linear travel range, mm"),
  linear_y_range: z
    .number()
    .min(0)
    .max(50000)
    .describe("Y-axis linear travel range, mm"),
  linear_z_range: z
    .number()
    .min(0)
    .max(50000)
    .describe("Z-axis linear travel range, mm"),
  home_position_xyz: z
    .array(z.number())
    .length(3)
    .describe("Machine home position [X, Y, Z] in machine coordinates, mm"),
  tool_change_position_xyz: z
    .array(z.number())
    .length(3)
    .describe("Tool change position [X, Y, Z] in machine coordinates, mm"),
});

export type LoadKinematic = z.infer<typeof loadKinematicSchema>;

// ── 1b. Configure Axes (12 params) ──────────────────────────────────────────

export const configureAxesSchema = z.object({
  a_axis_type: z
    .enum(["rotary", "linear", "none"])
    .describe("A-axis motion type"),
  b_axis_type: z
    .enum(["rotary", "linear", "none"])
    .describe("B-axis motion type"),
  c_axis_type: z
    .enum(["rotary", "linear", "none"])
    .describe("C-axis motion type"),
  a_axis_direction: z
    .enum(["positive", "negative"])
    .describe("A-axis positive rotation direction convention"),
  b_axis_direction: z
    .enum(["positive", "negative"])
    .describe("B-axis positive rotation direction convention"),
  c_axis_direction: z
    .enum(["positive", "negative"])
    .describe("C-axis positive rotation direction convention"),
  pivot_point_x: z
    .number()
    .describe("Rotary axis pivot point X coordinate, mm"),
  pivot_point_y: z
    .number()
    .describe("Rotary axis pivot point Y coordinate, mm"),
  pivot_point_z: z
    .number()
    .describe("Rotary axis pivot point Z coordinate, mm"),
  head_type: z
    .enum(["fork", "nutator", "swivel", "direct"])
    .describe("Spindle head kinematic type"),
  table_type: z
    .enum(["rotary", "trunnion", "tilting", "fixed"])
    .describe("Table kinematic type"),
  spindle_bearing_count: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("Number of spindle bearings affecting rigidity and speed limits"),
});

export type ConfigureAxes = z.infer<typeof configureAxesSchema>;

// ── 1c. Set Limits (11 params) ──────────────────────────────────────────────

export const setLimitsSchema = z.object({
  max_spindle_speed: z
    .number()
    .min(1)
    .max(200000)
    .describe("Maximum spindle speed, RPM (DFM-critical)"),
  max_feed_rate: z
    .number()
    .min(1)
    .max(100000)
    .describe("Maximum programmed feed rate, mm/min (DFM-critical)"),
  max_rapid: z
    .number()
    .min(1)
    .max(200000)
    .describe("Maximum rapid traverse rate, mm/min"),
  min_spindle_speed: z
    .number()
    .min(0)
    .max(200000)
    .describe("Minimum spindle speed, RPM"),
  acceleration_limit: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Maximum axis acceleration, m/s^2"),
  jerk_limit: z
    .number()
    .min(0.01)
    .max(1000)
    .describe("Maximum axis jerk, m/s^3"),
  max_tool_weight: z
    .number()
    .min(0.01)
    .max(500)
    .describe("Maximum allowable tool weight, kg"),
  max_tool_length: z
    .number()
    .min(1)
    .max(2000)
    .describe("Maximum allowable tool length, mm"),
  max_tool_diameter: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Maximum allowable tool diameter, mm"),
  coolant_pressure_max: z
    .number()
    .min(1)
    .max(1000)
    .describe("Maximum coolant pressure, bar"),
  spindle_power: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Spindle motor power rating, kW"),
});

export type SetLimits = z.infer<typeof setLimitsSchema>;

// ============================================================================
// 2. COLLISION SIMULATION (4 types, 45 params)
// ============================================================================

// ── 2a. Full Simulation (12 params) ─────────────────────────────────────────

export const fullSimulationSchema = z.object({
  check_scope: z
    .enum(["all", "selected", "range"])
    .describe("Scope of operations to check for collision"),
  collision_tolerance: z
    .number()
    .min(0.001)
    .max(10)
    .describe("Minimum clearance distance to flag as collision, mm (DFM-critical)"),
  near_miss_distance: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Distance threshold to flag near-miss events, mm"),
  check_tool: z
    .boolean()
    .describe("Include tool body in collision detection"),
  check_holder: z
    .boolean()
    .describe("Include tool holder in collision detection"),
  check_spindle: z
    .boolean()
    .describe("Include spindle housing in collision detection"),
  check_fixtures: z
    .boolean()
    .describe("Include workholding fixtures in collision detection"),
  check_part: z
    .boolean()
    .describe("Include workpiece part body in collision detection"),
  animation_speed: z
    .enum(["real_time", "2x", "5x", "10x", "max"])
    .describe("Simulation playback speed multiplier"),
  save_results: z
    .boolean()
    .describe("Persist collision check results to project"),
  halt_on_collision: z
    .boolean()
    .default(true)
    .describe("Stop NC output generation on detected collision (DFM-BLOCKING)"),
  display_collision_zone: z
    .boolean()
    .describe("Highlight collision zone geometry in 3D view"),
});

export type FullSimulation = z.infer<typeof fullSimulationSchema>;

// ── 2b. Quick Check (10 params) ─────────────────────────────────────────────

export const quickCheckSchema = z.object({
  scope: z
    .enum(["all", "current", "selected"])
    .describe("Scope of operations for quick collision check"),
  tolerance: z
    .number()
    .min(0.001)
    .max(10)
    .describe("Collision detection tolerance, mm"),
  check_rapid_only: z
    .boolean()
    .describe("Only check rapid traverse moves for collision"),
  approximate_model: z
    .boolean()
    .describe("Use simplified bounding-box model for faster check"),
  skip_safe_zones: z
    .boolean()
    .describe("Skip collision check in declared safe zones"),
  timeout_seconds: z
    .number()
    .int()
    .min(1)
    .max(86400)
    .describe("Maximum computation time before aborting check, seconds"),
  report_near_miss: z
    .boolean()
    .describe("Include near-miss events in the report"),
  near_miss_threshold: z
    .number()
    .min(0.01)
    .max(100)
    .describe("Distance threshold for near-miss classification, mm"),
  parallel_check: z
    .boolean()
    .describe("Enable multi-threaded parallel collision checking"),
  max_threads: z
    .number()
    .int()
    .min(1)
    .max(128)
    .describe("Maximum thread count for parallel collision check"),
});

export type QuickCheck = z.infer<typeof quickCheckSchema>;

// ── 2c. Per-Operation Check (11 params) ─────────────────────────────────────

export const perOperationCheckSchema = z.object({
  operation_id: z
    .string()
    .min(1)
    .describe("Target operation identifier for collision check"),
  detailed_report: z
    .boolean()
    .describe("Generate detailed collision report with timestamps and locations"),
  check_approach: z
    .boolean()
    .describe("Check approach moves for collision"),
  check_retract: z
    .boolean()
    .describe("Check retract moves for collision"),
  check_linking: z
    .boolean()
    .describe("Check linking/transition moves for collision"),
  check_cut: z
    .boolean()
    .describe("Check cutting moves for collision"),
  min_clearance: z
    .number()
    .min(0.001)
    .max(100)
    .describe("Minimum required clearance distance, mm"),
  export_collision_points: z
    .boolean()
    .describe("Export collision point coordinates to file"),
  collision_point_format: z
    .enum(["csv", "json", "xml"])
    .describe("File format for exported collision point data"),
  include_tool_change: z
    .boolean()
    .describe("Include tool change motion in collision check"),
  verify_holder_fit: z
    .boolean()
    .describe("Verify holder geometry fits workpiece cavity during approach"),
});

export type PerOperationCheck = z.infer<typeof perOperationCheckSchema>;

// ── 2d. Per-Block Check (12 params) ─────────────────────────────────────────

export const perBlockCheckSchema = z.object({
  start_block: z
    .number()
    .int()
    .min(0)
    .describe("NC program start block number for check range"),
  end_block: z
    .number()
    .int()
    .min(0)
    .describe("NC program end block number for check range"),
  step_mode: z
    .enum(["continuous", "single_block", "skip_rapid"])
    .describe("Block stepping mode during collision simulation"),
  highlight_collision: z
    .boolean()
    .describe("Visually highlight blocks with detected collisions"),
  collision_color: z
    .string()
    .default("#FF0000")
    .describe("Color for collision highlight display, hex string"),
  pause_on_collision: z
    .boolean()
    .default(true)
    .describe("Pause simulation playback when collision is detected"),
  record_tool_path: z
    .boolean()
    .describe("Record tool center point path during simulation"),
  show_material_removal: z
    .boolean()
    .describe("Display progressive material removal during simulation"),
  show_rest_material: z
    .boolean()
    .describe("Display remaining rest material during simulation"),
  deviation_check: z
    .boolean()
    .describe("Check tool path deviation from programmed geometry"),
  max_deviation: z
    .number()
    .min(0.0001)
    .max(10)
    .describe("Maximum allowable tool path deviation, mm"),
  block_feed_override: z
    .number()
    .min(0)
    .max(300)
    .describe("Feed rate override percentage for block simulation, %"),
});

export type PerBlockCheck = z.infer<typeof perBlockCheckSchema>;

// ============================================================================
// 3. STOCK VERIFICATION (3 types, 35 params)
// ============================================================================

// ── 3a. Material Removal (12 params) ────────────────────────────────────────

export const materialRemovalSchema = z.object({
  verification_tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .describe("Tolerance for material removal verification comparison, mm"),
  display_mode: z
    .enum(["solid", "wireframe", "transparent"])
    .describe("3D display rendering mode for verification model"),
  color_by_operation: z
    .boolean()
    .describe("Color removed material regions by originating operation"),
  rest_material_color: z
    .string()
    .describe("Display color for remaining stock material, hex string"),
  removed_material_color: z
    .string()
    .describe("Display color for removed material volume, hex string"),
  comparison_reference: z
    .enum(["finished_part", "stock", "previous_op"])
    .describe("Reference geometry for material removal comparison"),
  section_view: z
    .boolean()
    .describe("Enable cross-section view of verification model"),
  section_plane: z
    .enum(["xy", "xz", "yz"])
    .describe("Plane orientation for section view cutting plane"),
  animation: z
    .boolean()
    .describe("Animate material removal progression over time"),
  save_each_operation: z
    .boolean()
    .describe("Save intermediate stock state after each operation"),
  export_stl: z
    .boolean()
    .describe("Export verification result as STL mesh file"),
  stl_quality: z
    .enum(["coarse", "medium", "fine"])
    .describe("Mesh resolution quality for STL export"),
});

export type MaterialRemoval = z.infer<typeof materialRemovalSchema>;

// ── 3b. Rest Material (12 params) ───────────────────────────────────────────

export const restMaterialSchema = z.object({
  min_rest_threshold: z
    .number()
    .min(0.001)
    .max(50)
    .describe("Minimum rest material thickness to flag for additional operations, mm (DFM-critical)"),
  display_rest: z
    .boolean()
    .describe("Display rest material regions in 3D view"),
  rest_color: z
    .string()
    .describe("Display color for rest material regions, hex string"),
  highlight_excess: z
    .boolean()
    .describe("Highlight regions with excessive remaining material"),
  excess_threshold: z
    .number()
    .min(0.001)
    .max(50)
    .describe("Threshold for excess material highlighting, mm"),
  rest_volume_compute: z
    .boolean()
    .describe("Compute total rest material volume"),
  rest_mass_compute: z
    .boolean()
    .describe("Compute rest material mass using material density"),
  material_density: z
    .number()
    .min(0.1)
    .max(25000)
    .describe("Material density for mass computation, kg/m^3"),
  compare_to_target: z
    .boolean()
    .describe("Compare rest material against target finish geometry"),
  target_tolerance: z
    .number()
    .min(0.001)
    .max(10)
    .describe("Tolerance for target geometry comparison, mm"),
  export_rest_model: z
    .boolean()
    .describe("Export rest material model as mesh file"),
  auto_detect_uncut: z
    .boolean()
    .describe("Automatically detect uncut regions requiring additional passes"),
});

export type RestMaterial = z.infer<typeof restMaterialSchema>;

// ── 3c. Gouge Detection (11 params) ─────────────────────────────────────────

export const gougeDetectionSchema = z.object({
  gouge_tolerance: z
    .number()
    .min(0.001)
    .max(0.5)
    .describe("Maximum allowable gouge depth before flagging, mm (DFM-CRITICAL)"),
  detect_mode: z
    .enum(["surface", "volume", "both"])
    .describe("Gouge detection method: surface-only, volumetric, or combined"),
  highlight_gouges: z
    .boolean()
    .describe("Visually highlight detected gouge regions in 3D view"),
  gouge_color: z
    .string()
    .default("#FF0000")
    .describe("Display color for gouge highlight regions, hex string"),
  max_gouge_depth: z
    .number()
    .min(0.0001)
    .max(10)
    .describe("Maximum gouge depth to report — deeper gouges always flagged, mm"),
  report_gouge_locations: z
    .boolean()
    .describe("Include XYZ coordinates of gouge locations in report"),
  gouge_coordinate_system: z
    .enum(["wcs", "machine", "part"])
    .describe("Coordinate system for gouge location reporting"),
  auto_fix_suggestion: z
    .boolean()
    .describe("Generate automatic fix suggestions for detected gouges"),
  block_nc_on_gouge: z
    .boolean()
    .default(false)
    .describe("Block NC code output when gouges are detected (DFM-BLOCKING)"),
  export_gouge_report: z
    .boolean()
    .describe("Export gouge detection report to file"),
  severity_classification: z
    .enum(["minor", "major", "critical"])
    .describe("Gouge severity classification threshold for reporting"),
});

export type GougeDetection = z.infer<typeof gougeDetectionSchema>;

// ============================================================================
// 4. TRAVEL LIMITS (3 types, 30 params)
// ============================================================================

// ── 4a. Axis Travel Check (10 params) ───────────────────────────────────────

export const axisTravelCheckSchema = z.object({
  check_linear_x: z
    .boolean()
    .default(true)
    .describe("Enable X-axis linear travel limit checking"),
  check_linear_y: z
    .boolean()
    .default(true)
    .describe("Enable Y-axis linear travel limit checking"),
  check_linear_z: z
    .boolean()
    .default(true)
    .describe("Enable Z-axis linear travel limit checking"),
  check_rotary_a: z
    .boolean()
    .default(true)
    .describe("Enable A-axis rotary travel limit checking"),
  check_rotary_b: z
    .boolean()
    .default(true)
    .describe("Enable B-axis rotary travel limit checking"),
  check_rotary_c: z
    .boolean()
    .default(true)
    .describe("Enable C-axis rotary travel limit checking"),
  margin_mm: z
    .number()
    .min(0)
    .max(50)
    .default(5)
    .describe("Safety margin for linear axis travel limits, mm"),
  margin_deg: z
    .number()
    .min(0)
    .max(10)
    .default(2)
    .describe("Safety margin for rotary axis travel limits, degrees"),
  block_on_exceed: z
    .boolean()
    .default(true)
    .describe("Block NC output when travel limits are exceeded (DFM-BLOCKING)"),
  report_exceeded_axes: z
    .boolean()
    .default(true)
    .describe("Report which axes exceeded travel limits"),
});

export type AxisTravelCheck = z.infer<typeof axisTravelCheckSchema>;

// ── 4b. Rotary Limits (10 params) ───────────────────────────────────────────

export const rotaryLimitsSchema = z.object({
  a_min: z
    .number()
    .min(-360)
    .max(360)
    .describe("A-axis minimum rotary travel limit, degrees"),
  a_max: z
    .number()
    .min(-360)
    .max(360)
    .describe("A-axis maximum rotary travel limit, degrees"),
  b_min: z
    .number()
    .min(-360)
    .max(360)
    .describe("B-axis minimum rotary travel limit, degrees"),
  b_max: z
    .number()
    .min(-360)
    .max(360)
    .describe("B-axis maximum rotary travel limit, degrees"),
  c_min: z
    .number()
    .min(-360)
    .max(360)
    .describe("C-axis minimum rotary travel limit, degrees"),
  c_max: z
    .number()
    .min(-360)
    .max(360)
    .describe("C-axis maximum rotary travel limit, degrees"),
  wrap_around: z
    .boolean()
    .default(false)
    .describe("Allow axis wrap-around past 360 degrees"),
  shortest_path: z
    .boolean()
    .default(true)
    .describe("Use shortest rotary path for positioning moves"),
  singularity_zone_start: z
    .number()
    .min(-360)
    .max(360)
    .describe("Start angle of kinematic singularity zone, degrees"),
  singularity_zone_end: z
    .number()
    .min(-360)
    .max(360)
    .describe("End angle of kinematic singularity zone, degrees"),
});

export type RotaryLimits = z.infer<typeof rotaryLimitsSchema>;

// ── 4c. Singularity Avoidance (10 params) ───────────────────────────────────

export const singularityAvoidanceSchema = z.object({
  singularity_check: z
    .boolean()
    .default(true)
    .describe("Enable kinematic singularity detection during simulation"),
  singularity_threshold: z
    .number()
    .min(0.1)
    .max(10)
    .describe("Angular proximity threshold for singularity warning, degrees (DFM-critical)"),
  avoidance_strategy: z
    .enum(["tilt_away", "retract", "split_path"])
    .describe("Strategy for avoiding kinematic singularity during 5-axis motion"),
  max_tilt_deviation: z
    .number()
    .min(0.01)
    .max(45)
    .describe("Maximum tilt angle deviation allowed for singularity avoidance, degrees"),
  warning_zone: z
    .number()
    .min(0.1)
    .max(30)
    .describe("Angular range for singularity warning zone, degrees"),
  critical_zone: z
    .number()
    .min(0.01)
    .max(15)
    .describe("Angular range for singularity critical zone — motion blocked, degrees"),
  auto_split: z
    .boolean()
    .describe("Automatically split toolpath segments crossing singularity zone"),
  split_tolerance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Tolerance for toolpath segment splitting at singularity boundary, degrees"),
  report_singularities: z
    .boolean()
    .describe("Include singularity events in simulation report"),
  alternative_solution_count: z
    .number()
    .int()
    .min(1)
    .max(5)
    .describe("Number of alternative kinematic solutions to evaluate at singularity"),
});

export type SingularityAvoidance = z.infer<typeof singularityAvoidanceSchema>;

// ============================================================================
// Schema Map (13 types)
// ============================================================================

/** All 13 simulation core schemas keyed by type */
export const SIMULATION_CORE_SCHEMA_MAP = {
  // Machine Config
  load_kinematic: loadKinematicSchema,
  configure_axes: configureAxesSchema,
  set_limits: setLimitsSchema,
  // Collision Simulation
  full_simulation: fullSimulationSchema,
  quick_check: quickCheckSchema,
  per_operation_check: perOperationCheckSchema,
  per_block_check: perBlockCheckSchema,
  // Stock Verification
  material_removal: materialRemovalSchema,
  rest_material: restMaterialSchema,
  gouge_detection: gougeDetectionSchema,
  // Travel Limits
  axis_travel_check: axisTravelCheckSchema,
  rotary_limits: rotaryLimitsSchema,
  singularity_avoidance: singularityAvoidanceSchema,
} as const;

export type SimulationCoreType = keyof typeof SIMULATION_CORE_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

/** Metadata record for every simulation core type */
export interface SimulationCoreMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
  /** DFM-BLOCKING flags: parameters that gate NC output */
  dfmBlockingParams?: string[];
}

/** Metadata for each simulation core type with AC Python setter references */
export const SIMULATION_CORE_METADATA: Record<SimulationCoreType, SimulationCoreMeta> = {
  // ── Machine Config ──
  load_kinematic: {
    paramCount: 12,
    acPythonSetter: "hm.simulation.load_kinematic",
    description: "Load machine kinematic model with axis definitions and travel ranges",
  },
  configure_axes: {
    paramCount: 12,
    acPythonSetter: "hm.simulation.configure_axes",
    description: "Configure axis types, directions, pivot points, and head/table kinematics",
  },
  set_limits: {
    paramCount: 11,
    acPythonSetter: "hm.simulation.set_limits",
    description: "Set machine performance limits for spindle, feed, tool, and coolant",
    dfmCriticalParams: ["max_spindle_speed", "max_feed_rate"],
  },
  // ── Collision Simulation ──
  full_simulation: {
    paramCount: 12,
    acPythonSetter: "hm.simulation.full_simulation",
    description: "Full collision simulation with configurable scope, tolerance, and component checks",
    dfmCriticalParams: ["collision_tolerance"],
    dfmBlockingParams: ["halt_on_collision"],
  },
  quick_check: {
    paramCount: 10,
    acPythonSetter: "hm.simulation.quick_check",
    description: "Fast approximate collision check with configurable threading and timeout",
  },
  per_operation_check: {
    paramCount: 11,
    acPythonSetter: "hm.simulation.per_operation_check",
    description: "Per-operation collision check with detailed approach/retract/linking analysis",
  },
  per_block_check: {
    paramCount: 12,
    acPythonSetter: "hm.simulation.per_block_check",
    description: "Per-block NC program collision check with material removal visualization",
  },
  // ── Stock Verification ──
  material_removal: {
    paramCount: 12,
    acPythonSetter: "hm.simulation.material_removal",
    description: "Material removal verification with section view, animation, and STL export",
  },
  rest_material: {
    paramCount: 12,
    acPythonSetter: "hm.simulation.rest_material",
    description: "Rest material analysis with volume/mass computation and uncut detection",
    dfmCriticalParams: ["min_rest_threshold"],
  },
  gouge_detection: {
    paramCount: 11,
    acPythonSetter: "hm.simulation.gouge_detection",
    description: "Gouge detection with severity classification and automatic fix suggestions",
    dfmCriticalParams: ["gouge_tolerance"],
    dfmBlockingParams: ["block_nc_on_gouge"],
  },
  // ── Travel Limits ──
  axis_travel_check: {
    paramCount: 10,
    acPythonSetter: "hm.simulation.axis_travel_check",
    description: "Axis travel limit checking with configurable safety margins",
    dfmBlockingParams: ["block_on_exceed"],
  },
  rotary_limits: {
    paramCount: 10,
    acPythonSetter: "hm.simulation.rotary_limits",
    description: "Rotary axis limit configuration with wrap-around and singularity zone definition",
  },
  singularity_avoidance: {
    paramCount: 10,
    acPythonSetter: "hm.simulation.singularity_avoidance",
    description: "Kinematic singularity detection and avoidance with configurable strategies",
    dfmCriticalParams: ["singularity_threshold"],
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all 13 simulation core schemas */
export const SIMULATION_CORE_TOTAL_PARAM_COUNT = Object.values(SIMULATION_CORE_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
