/**
 * Grinding + Misc Cycle Parameter Schemas — hyperMILL CAM Grinding & Misc
 *
 * U-HKC26: Zod schemas for 5 grinding cycle types and 3 miscellaneous cycle
 * types used in hyperMILL CAM. Grinding covers surface, cylindrical OD/ID,
 * centerless, and creep feed. Misc covers transformation, linking defaults,
 * and machine control cycles. DFM-critical parameters are tagged in metadata.
 *
 * AC Python call pattern:
 *   hm.grind.surface_grinding(wheel_speed=30, depth_per_pass=0.02, ...)
 *   hm.misc.transformation_cycle(transform_type="rotation", value=90, ...)
 *
 * @domain CAM-Grinding
 * @milestone HM-KC-MS4/U-HKC26
 */

import { z } from "zod";

// ── 1. Surface Grinding (12 params) ───────────────────────────────────────────

export const surfaceGrindingSchema = z.object({
  wheel_speed: z
    .number()
    .min(10)
    .max(80)
    .describe("Grinding wheel peripheral speed, m/s"),
  depth_per_pass: z
    .number()
    .min(0.001)
    .max(0.5)
    .describe("Depth of cut per grinding pass, mm (DFM-critical: exceeding causes burn)"),
  crossfeed: z
    .number()
    .min(0.1)
    .max(100)
    .describe("Crossfeed step between passes, mm"),
  table_speed: z
    .number()
    .min(0.1)
    .max(60)
    .describe("Table reciprocating speed, m/min"),
  spark_out_passes: z
    .number()
    .int()
    .min(0)
    .max(10)
    .describe("Number of spark-out (zero-infeed) passes for surface finish"),
  coolant_flow: z
    .number()
    .min(0.5)
    .max(200)
    .describe("Coolant flow rate, l/min"),
  dress_interval: z
    .number()
    .int()
    .min(1)
    .max(500)
    .describe("Number of passes between wheel dressing operations"),
  dress_depth: z
    .number()
    .min(0.001)
    .max(0.2)
    .describe("Depth of material removed from wheel during dressing, mm"),
  wheel_diameter: z
    .number()
    .min(50)
    .max(600)
    .describe("Grinding wheel outer diameter, mm"),
  wheel_width: z
    .number()
    .min(5)
    .max(200)
    .describe("Grinding wheel face width, mm"),
  surface_finish_target: z
    .number()
    .min(0.01)
    .max(10)
    .describe("Target surface roughness Ra, micrometers"),
  stock_removal_total: z
    .number()
    .min(0.01)
    .max(10)
    .describe("Total stock to be removed by grinding, mm"),
});

export type SurfaceGrinding = z.infer<typeof surfaceGrindingSchema>;

// ── 2. Cylindrical OD (12 params) ─────────────────────────────────────────────

export const cylindricalODSchema = z.object({
  wheel_speed: z
    .number()
    .min(10)
    .max(80)
    .describe("Grinding wheel peripheral speed, m/s"),
  infeed: z
    .number()
    .min(0.001)
    .max(0.5)
    .describe("Radial infeed per pass, mm (DFM-critical: excessive infeed causes burn/chatter)"),
  traverse_rate: z
    .number()
    .min(0.01)
    .max(50)
    .describe("Axial traverse rate per workpiece revolution, mm/rev"),
  plunge_mode: z
    .boolean()
    .default(false)
    .describe("Use plunge grinding (no traverse) instead of traverse grinding"),
  taper_angle: z
    .number()
    .min(-45)
    .max(45)
    .default(0)
    .describe("Taper angle for tapered cylindrical grinding, degrees"),
  dwell_at_ends: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe("Dwell time at traverse reversal points for spark-out, sec"),
  workpiece_speed: z
    .number()
    .min(1)
    .max(1000)
    .describe("Workpiece rotational speed, rpm"),
  spark_out_passes: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(2)
    .describe("Number of spark-out passes at final diameter"),
  coolant_flow: z
    .number()
    .min(0.5)
    .max(200)
    .describe("Coolant flow rate, l/min"),
  dress_interval: z
    .number()
    .int()
    .min(1)
    .max(500)
    .describe("Number of passes between wheel dressing"),
  stock_removal: z
    .number()
    .min(0.005)
    .max(5)
    .describe("Total radial stock to remove, mm"),
  roundness_target: z
    .number()
    .min(0.0005)
    .max(0.1)
    .describe("Target roundness tolerance, mm"),
});

export type CylindricalOD = z.infer<typeof cylindricalODSchema>;

// ── 3. Cylindrical ID (12 params) ─────────────────────────────────────────────

export const cylindricalIDSchema = z.object({
  wheel_speed: z
    .number()
    .min(10)
    .max(80)
    .describe("Grinding wheel peripheral speed, m/s"),
  bore_diameter: z
    .number()
    .min(5)
    .max(2000)
    .describe("Bore internal diameter being ground, mm"),
  wheel_diameter_ratio: z
    .number()
    .min(0.5)
    .max(0.9)
    .describe("Ratio of wheel diameter to bore diameter (0.5-0.9 optimal range)"),
  oscillation: z
    .boolean()
    .default(true)
    .describe("Enable axial oscillation of the grinding wheel inside the bore"),
  infeed: z
    .number()
    .min(0.001)
    .max(0.3)
    .describe("Radial infeed per pass, mm"),
  workpiece_speed: z
    .number()
    .min(1)
    .max(1000)
    .describe("Workpiece rotational speed, rpm"),
  oscillation_stroke: z
    .number()
    .min(0.5)
    .max(500)
    .describe("Axial oscillation stroke length, mm"),
  coolant_flow: z
    .number()
    .min(0.5)
    .max(200)
    .describe("Coolant flow rate, l/min"),
  spark_out_passes: z
    .number()
    .int()
    .min(0)
    .max(10)
    .default(2)
    .describe("Number of spark-out passes at final bore diameter"),
  stock_removal: z
    .number()
    .min(0.005)
    .max(5)
    .describe("Total radial stock to remove, mm"),
  bore_depth: z
    .number()
    .min(1)
    .max(1000)
    .describe("Depth of bore being ground, mm"),
  surface_finish_target: z
    .number()
    .min(0.01)
    .max(10)
    .describe("Target surface roughness Ra, micrometers"),
});

export type CylindricalID = z.infer<typeof cylindricalIDSchema>;

// ── 4. Centerless (12 params) ─────────────────────────────────────────────────

export const centerlessSchema = z.object({
  wheel_speed: z
    .number()
    .min(10)
    .max(80)
    .describe("Grinding wheel peripheral speed, m/s"),
  regulating_wheel_speed: z
    .number()
    .min(5)
    .max(500)
    .describe("Regulating (control) wheel rotational speed, rpm"),
  blade_angle: z
    .number()
    .min(0)
    .max(45)
    .describe("Work rest blade angle from horizontal, degrees"),
  part_diameter: z
    .number()
    .min(0.5)
    .max(500)
    .describe("Workpiece outer diameter, mm"),
  through_feed_rate: z
    .number()
    .min(0.1)
    .max(5000)
    .describe("Axial through-feed rate for through-feed grinding, mm/min"),
  infeed_amount: z
    .number()
    .min(0.001)
    .max(2)
    .describe("Total radial infeed for plunge centerless grinding, mm"),
  center_height: z
    .number()
    .min(-20)
    .max(20)
    .describe("Workpiece center height above/below wheel centerline, mm"),
  grind_mode: z
    .enum(["through_feed", "plunge", "end_feed"])
    .describe("Centerless grinding mode: through-feed, plunge, or end-feed"),
  coolant_flow: z
    .number()
    .min(0.5)
    .max(200)
    .describe("Coolant flow rate, l/min"),
  roundness_target: z
    .number()
    .min(0.0005)
    .max(0.1)
    .describe("Target roundness tolerance, mm"),
  regulating_wheel_diameter: z
    .number()
    .min(50)
    .max(400)
    .describe("Regulating wheel diameter, mm"),
  dress_interval: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .describe("Number of parts between wheel dressing"),
});

export type Centerless = z.infer<typeof centerlessSchema>;

// ── 5. Creep Feed (12 params) ─────────────────────────────────────────────────

export const creepFeedSchema = z.object({
  wheel_speed: z
    .number()
    .min(10)
    .max(80)
    .describe("Grinding wheel peripheral speed, m/s"),
  depth_of_cut: z
    .number()
    .min(0.01)
    .max(5)
    .describe("Depth of cut per pass, mm (DFM-critical: high DOC with slow table speed)"),
  table_speed: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Table feed speed during creep-feed pass, mm/min"),
  continuous_dress: z
    .boolean()
    .default(false)
    .describe("Enable continuous dressing during grinding for consistent wheel sharpness"),
  burn_risk_threshold: z
    .number()
    .min(100)
    .max(1000)
    .describe("Workpiece surface temperature threshold for burn detection, deg C (DFM-critical: exceeding causes metallurgical damage)"),
  coolant_pressure: z
    .number()
    .min(1)
    .max(200)
    .describe("High-pressure coolant delivery pressure, bar"),
  coolant_flow: z
    .number()
    .min(5)
    .max(500)
    .describe("Coolant flow rate for creep-feed flooding, l/min"),
  dress_ratio: z
    .number()
    .min(0.1)
    .max(5)
    .default(1)
    .describe("Dressing speed ratio (dresser speed / wheel speed) for continuous dressing"),
  wheel_porosity: z
    .enum(["dense", "medium", "open"])
    .describe("Wheel structure/porosity classification affecting chip clearance"),
  nozzle_alignment: z
    .boolean()
    .default(true)
    .describe("Verify coolant nozzle alignment to grinding zone before cycle start"),
  spark_out_passes: z
    .number()
    .int()
    .min(0)
    .max(5)
    .default(1)
    .describe("Number of spark-out passes after final depth"),
  stock_removal_total: z
    .number()
    .min(0.01)
    .max(20)
    .describe("Total stock to be removed by creep-feed grinding, mm"),
});

export type CreepFeed = z.infer<typeof creepFeedSchema>;

// ── 6. Transformation Cycle (8 params) ────────────────────────────────────────

export const transformationCycleSchema = z.object({
  transform_type: z
    .enum(["rotation", "translation", "mirror", "scale"])
    .describe("Type of geometric transformation to apply to the toolpath"),
  value: z
    .number()
    .describe("Transformation value: degrees for rotation, mm for translation, factor for scale"),
  axis: z
    .enum(["x", "y", "z"])
    .describe("Axis about/along which the transformation is applied"),
  apply_to: z
    .enum(["current", "all", "selected"])
    .describe("Scope of transformation: current operation, all operations, or selected subset"),
  repeat_count: z
    .number()
    .int()
    .min(1)
    .max(360)
    .default(1)
    .describe("Number of times to repeat the transformation (e.g., 4x 90-degree rotation)"),
  cumulative: z
    .boolean()
    .default(true)
    .describe("Each repetition is cumulative (adds to previous) vs. independent"),
  include_reference: z
    .boolean()
    .default(true)
    .describe("Include the original (untransformed) operation in output"),
  preserve_approach: z
    .boolean()
    .default(true)
    .describe("Preserve approach/retract moves after transformation"),
  mirror_plane_offset: z
    .number()
    .min(-5000)
    .max(5000)
    .default(0)
    .describe("Offset distance from mirror plane origin for mirror transformations, mm"),
});

export type TransformationCycle = z.infer<typeof transformationCycleSchema>;

// ── 7. Linking Defaults (9 params) ────────────────────────────────────────────

export const linkingDefaultsSchema = z.object({
  link_mode: z
    .enum(["clearance", "direct", "optimized"])
    .describe("Linking strategy between operations: clearance plane, direct, or optimized path"),
  min_height: z
    .number()
    .min(-5000)
    .max(5000)
    .describe("Minimum safe linking height above part, mm"),
  rapid_height: z
    .number()
    .min(-5000)
    .max(5000)
    .describe("Height at which rapid traverse moves are executed, mm"),
  avoid_fixtures: z
    .boolean()
    .default(true)
    .describe("Enable fixture avoidance during linking moves"),
  lead_in_mode: z
    .enum(["arc", "linear", "helical", "none"])
    .default("arc")
    .describe("Lead-in approach geometry for each operation entry"),
  lead_out_mode: z
    .enum(["arc", "linear", "helical", "none"])
    .default("arc")
    .describe("Lead-out exit geometry for each operation exit"),
  retract_type: z
    .enum(["incremental", "absolute"])
    .default("absolute")
    .describe("Retract height interpretation: incremental from surface or absolute Z"),
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking during linking moves"),
  rapid_feed_override: z
    .number()
    .min(1)
    .max(100)
    .default(100)
    .describe("Rapid traverse feed override percentage, %"),
  safe_zone_margin: z
    .number()
    .min(0.5)
    .max(100)
    .default(5)
    .describe("Additional margin around fixtures/clamps for safe linking moves, mm"),
});

export type LinkingDefaults = z.infer<typeof linkingDefaultsSchema>;

// ── 8. Machine Control (10 params) ────────────────────────────────────────────

export const machineControlSchema = z.object({
  spindle_orient: z
    .number()
    .min(0)
    .max(360)
    .default(0)
    .describe("Spindle orientation angle for oriented stop, degrees"),
  m_code_before: z
    .string()
    .max(50)
    .default("")
    .describe("M-code(s) to execute before the operation (e.g., 'M8 M52')"),
  m_code_after: z
    .string()
    .max(50)
    .default("")
    .describe("M-code(s) to execute after the operation (e.g., 'M9 M53')"),
  wait_for_spindle: z
    .boolean()
    .default(true)
    .describe("Wait for spindle to reach commanded speed before cutting"),
  dwell: z
    .number()
    .min(0)
    .max(60)
    .default(0)
    .describe("Programmable dwell time, sec"),
  coolant_on: z
    .boolean()
    .default(true)
    .describe("Enable coolant for this operation"),
  coolant_mode: z
    .enum(["flood", "mist", "through_spindle", "air_blast", "mql", "off"])
    .default("flood")
    .describe("Coolant delivery mode"),
  clamp_axis: z
    .enum(["none", "a", "b", "c", "ab", "ac", "bc", "abc"])
    .default("none")
    .describe("Rotary axis clamping for rigidity during machining"),
  chip_conveyor: z
    .boolean()
    .default(true)
    .describe("Enable chip conveyor during operation"),
  sub_program_call: z
    .string()
    .max(100)
    .default("")
    .describe("Sub-program or macro call to execute (e.g., 'O9100' or 'G65 P9100')"),
  optional_stop: z
    .boolean()
    .default(false)
    .describe("Insert M01 optional stop before this operation for operator inspection"),
});

export type MachineControl = z.infer<typeof machineControlSchema>;

// ── Schema Map ────────────────────────────────────────────────────────────────

/** All 8 grinding + misc cycle schemas keyed by cycle type (5 grinding + 3 misc) */
export const GRINDING_SCHEMA_MAP = {
  surface_grinding: surfaceGrindingSchema,
  cylindrical_od: cylindricalODSchema,
  cylindrical_id: cylindricalIDSchema,
  centerless: centerlessSchema,
  creep_feed: creepFeedSchema,
  transformation_cycle: transformationCycleSchema,
  linking_defaults: linkingDefaultsSchema,
  machine_control: machineControlSchema,
} as const;

export type GrindingCycleType = keyof typeof GRINDING_SCHEMA_MAP;

// ── Metadata ──────────────────────────────────────────────────────────────────

/** Metadata record for every grinding/misc cycle type */
export interface GrindingMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each grinding/misc cycle type with AC Python setter references */
export const GRINDING_METADATA: Record<GrindingCycleType, GrindingMeta> = {
  surface_grinding: {
    paramCount: Object.keys(surfaceGrindingSchema.shape).length,
    acPythonSetter: "hm.grind.surface_grinding",
    description: "Surface grinding with reciprocating table and crossfeed for flat surfaces",
    dfmCriticalParams: ["depth_per_pass"],
  },
  cylindrical_od: {
    paramCount: Object.keys(cylindricalODSchema.shape).length,
    acPythonSetter: "hm.grind.cylindrical_od",
    description: "Cylindrical OD grinding with traverse or plunge mode and taper support",
    dfmCriticalParams: ["infeed"],
  },
  cylindrical_id: {
    paramCount: Object.keys(cylindricalIDSchema.shape).length,
    acPythonSetter: "hm.grind.cylindrical_id",
    description: "Internal cylindrical grinding with oscillation and wheel diameter ratio control",
  },
  centerless: {
    paramCount: Object.keys(centerlessSchema.shape).length,
    acPythonSetter: "hm.grind.centerless",
    description: "Centerless grinding with through-feed, plunge, or end-feed modes",
  },
  creep_feed: {
    paramCount: Object.keys(creepFeedSchema.shape).length,
    acPythonSetter: "hm.grind.creep_feed",
    description: "Creep-feed grinding with deep DOC, continuous dressing, and burn detection",
    dfmCriticalParams: ["depth_of_cut", "burn_risk_threshold"],
  },
  transformation_cycle: {
    paramCount: Object.keys(transformationCycleSchema.shape).length,
    acPythonSetter: "hm.misc.transformation_cycle",
    description: "Geometric transformation cycle for rotation, translation, mirror, or scale of toolpaths",
  },
  linking_defaults: {
    paramCount: Object.keys(linkingDefaultsSchema.shape).length,
    acPythonSetter: "hm.misc.linking_defaults",
    description: "Default linking parameters for inter-operation moves with collision avoidance",
  },
  machine_control: {
    paramCount: Object.keys(machineControlSchema.shape).length,
    acPythonSetter: "hm.misc.machine_control",
    description: "Machine control overrides for spindle orient, M-codes, coolant, and clamping",
  },
};

// ── Computed Totals ───────────────────────────────────────────────────────────

/** Total parameter count across all 8 grinding + misc cycle schemas */
export const GRINDING_TOTAL_PARAM_COUNT = Object.values(GRINDING_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
