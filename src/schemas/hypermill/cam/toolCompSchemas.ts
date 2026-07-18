/**
 * Tool Compensation Parameter Schemas — hyperMILL CAM
 *
 * U-HKC21: Zod schemas for 4 tool compensation profile types used across
 * hyperMILL cycle families. Each profile defines how cutter compensation,
 * wear offsets, and TCP tracking are applied for different operation classes.
 *
 * AC Python call pattern:
 *   hm.comp.milling(comp_type="wear", comp_direction="left", comp_register=1, ...)
 *
 * @domain CAM-ToolCompensation
 * @milestone HM-KC-MS3/U-HKC21
 */

import { z } from "zod";

// ── 1. Milling Compensation (15 params) ───────────────────────────────────────

export const millingCompSchema = z.object({
  comp_type: z
    .enum(["none", "computer", "wear", "reverse"])
    .describe("Compensation mode: none, computer (CAM-computed), wear (CNC register), or reverse"),
  comp_direction: z
    .enum(["left", "right"])
    .describe("Cutter compensation direction relative to toolpath: left (G41) or right (G42)"),
  comp_register: z
    .number()
    .int()
    .min(0)
    .max(999)
    .describe("Tool wear offset register number in CNC controller"),
  wear_offset_x: z
    .number()
    .min(-10)
    .max(10)
    .default(0)
    .describe("Wear compensation offset in X axis, mm"),
  wear_offset_y: z
    .number()
    .min(-10)
    .max(10)
    .default(0)
    .describe("Wear compensation offset in Y axis, mm"),
  wear_offset_z: z
    .number()
    .min(-10)
    .max(10)
    .default(0)
    .describe("Wear compensation offset in Z axis, mm"),
  lead_in_comp: z
    .boolean()
    .default(true)
    .describe("Apply cutter compensation during lead-in approach moves"),
  lead_out_comp: z
    .boolean()
    .default(true)
    .describe("Apply cutter compensation during lead-out retract moves"),
  comp_in_rapid: z
    .boolean()
    .default(false)
    .describe("Allow cutter compensation activation during rapid traverse (G00)"),
  corner_type: z
    .enum(["sharp", "round"])
    .default("sharp")
    .describe("Corner handling during cutter comp: sharp (insert) or round (roll)"),
  min_arc_radius: z
    .number()
    .min(0.001)
    .max(100)
    .default(0.5)
    .describe("Minimum arc radius for comp arc insertion at corners, mm"),
  tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.01)
    .describe("Compensation path tolerance for linearization of offset arcs, mm"),
  approach_type: z
    .enum(["linear", "arc", "perpendicular"])
    .default("linear")
    .describe("Approach geometry for cutter comp engagement"),
  retract_type: z
    .enum(["linear", "arc", "perpendicular"])
    .default("linear")
    .describe("Retract geometry for cutter comp disengagement"),
  diameter_offset: z
    .number()
    .min(-5)
    .max(5)
    .default(0)
    .describe("Additional diameter offset for fine tool size adjustment, mm"),
});

export type MillingComp = z.infer<typeof millingCompSchema>;

// ── 2. Turning Compensation (14 params) ───────────────────────────────────────

export const turningCompSchema = z.object({
  comp_type: z
    .enum(["none", "computer", "wear", "reverse"])
    .describe("Compensation mode for turning operations"),
  nose_radius_comp: z
    .boolean()
    .default(true)
    .describe("Enable tool nose radius compensation (TNRC / G41/G42) for profile accuracy"),
  nose_radius: z
    .number()
    .min(0.05)
    .max(12.7)
    .describe("Tool nose radius for compensation calculation, mm"),
  tool_orientation: z
    .number()
    .int()
    .min(1)
    .max(9)
    .describe("Tool orientation code (1-9) defining insert position relative to cutting direction"),
  wear_offset_x: z
    .number()
    .min(-10)
    .max(10)
    .default(0)
    .describe("Wear compensation offset in X axis (diameter), mm"),
  wear_offset_z: z
    .number()
    .min(-10)
    .max(10)
    .default(0)
    .describe("Wear compensation offset in Z axis (length), mm"),
  imaginary_tip: z
    .number()
    .int()
    .min(1)
    .max(8)
    .describe("Imaginary tool tip position code (1-8) for TNRC direction"),
  comp_register: z
    .number()
    .int()
    .min(0)
    .max(999)
    .describe("Tool offset register number in CNC controller"),
  geometry_offset_x: z
    .number()
    .min(-500)
    .max(500)
    .default(0)
    .describe("Geometry offset in X for tool measurement, mm"),
  geometry_offset_z: z
    .number()
    .min(-500)
    .max(500)
    .default(0)
    .describe("Geometry offset in Z for tool measurement, mm"),
  finish_allowance: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe("Additional finish allowance applied through compensation, mm"),
  comp_cancel_mode: z
    .enum(["linear", "rapid", "block_end"])
    .default("linear")
    .describe("Mode for cancelling compensation (G40): linear move, rapid, or at block end"),
  constant_surface_speed: z
    .boolean()
    .default(true)
    .describe("Apply CSS (G96) compensation for diameter changes during profiling"),
  max_spindle_speed: z
    .number()
    .min(100)
    .max(20000)
    .default(5000)
    .describe("Maximum spindle speed clamp during CSS mode, RPM"),
});

export type TurningComp = z.infer<typeof turningCompSchema>;

// ── 3. Drilling Compensation (12 params) ──────────────────────────────────────

export const drillingCompSchema = z.object({
  length_comp: z
    .boolean()
    .default(true)
    .describe("Enable tool length compensation (G43/G44) for drilling operations"),
  length_offset_register: z
    .number()
    .int()
    .min(0)
    .max(999)
    .describe("Tool length offset register number in CNC controller"),
  diameter_comp: z
    .boolean()
    .default(false)
    .describe("Enable diameter compensation for helical bore milling operations"),
  breakout_detection: z
    .boolean()
    .default(false)
    .describe("Enable tool breakage detection via load monitoring during drilling"),
  length_wear_offset: z
    .number()
    .min(-5)
    .max(5)
    .default(0)
    .describe("Tool length wear offset for gradual drill shortening, mm"),
  diameter_wear_offset: z
    .number()
    .min(-1)
    .max(1)
    .default(0)
    .describe("Tool diameter wear offset for bore size compensation, mm"),
  thermal_comp: z
    .boolean()
    .default(false)
    .describe("Enable thermal growth compensation for spindle/tool expansion"),
  reference_point: z
    .enum(["tip", "shoulder", "gauge_line"])
    .default("tip")
    .describe("Tool reference point for length compensation measurement"),
  multi_offset_mode: z
    .boolean()
    .default(false)
    .describe("Use separate offset registers for roughing and finishing tools"),
  auto_measure: z
    .boolean()
    .default(false)
    .describe("Enable automatic tool measurement cycle before drilling"),
  comp_direction: z
    .enum(["positive", "negative"])
    .default("positive")
    .describe("Length compensation direction: positive (G43) or negative (G44)"),
  probe_after_drill: z
    .boolean()
    .default(false)
    .describe("Execute probing cycle after drilling to verify hole position/depth"),
});

export type DrillingComp = z.infer<typeof drillingCompSchema>;

// ── 4. Multi-Axis Compensation (13 params) ────────────────────────────────────

export const multiAxisCompSchema = z.object({
  tcpm_mode: z
    .boolean()
    .default(false)
    .describe("Enable Tool Center Point Management for maintaining TCP during rotary motion"),
  pivot_comp: z
    .enum(["none", "command", "inverse"])
    .describe("Pivot point compensation mode: none, command (G43.4/G43.5), or inverse"),
  gauge_point: z
    .enum(["tip", "center", "custom"])
    .default("tip")
    .describe("Tool gauge reference point for multi-axis TCP calculation"),
  tcp_tracking: z
    .boolean()
    .default(true)
    .describe("Enable real-time TCP tracking for accurate 5-axis positioning"),
  rotary_axis_comp: z
    .boolean()
    .default(false)
    .describe("Enable rotary axis geometric error compensation"),
  gauge_length: z
    .number()
    .min(10)
    .max(500)
    .describe("Tool gauge length from spindle face to tool tip, mm"),
  gauge_radius: z
    .number()
    .min(0)
    .max(100)
    .default(0)
    .describe("Tool gauge radius for non-tip gauge points, mm"),
  kinematic_model: z
    .enum(["table_table", "head_head", "head_table", "nutating"])
    .describe("Machine kinematic configuration for correct pivot compensation"),
  singularity_tolerance: z
    .number()
    .min(0.001)
    .max(5)
    .default(0.1)
    .describe("Angular tolerance near rotary axis singularity for path splitting, degrees"),
  tilted_plane_comp: z
    .boolean()
    .default(false)
    .describe("Enable tilted working plane compensation (G68.2) for angled features"),
  fixture_offset_rotation: z
    .boolean()
    .default(false)
    .describe("Apply fixture offset rotation for multi-axis WCS alignment"),
  dynamic_work_offset: z
    .boolean()
    .default(false)
    .describe("Enable dynamic work offset updates during multi-axis motion"),
  comp_smoothing: z
    .boolean()
    .default(true)
    .describe("Enable compensation path smoothing for continuous 5-axis motion"),
});

export type MultiAxisComp = z.infer<typeof multiAxisCompSchema>;

// ── Schema Map ────────────────────────────────────────────────────────────────

/** All 4 tool compensation profile schemas keyed by profile type */
export const TOOL_COMP_SCHEMA_MAP = {
  milling: millingCompSchema,
  turning: turningCompSchema,
  drilling: drillingCompSchema,
  multi_axis: multiAxisCompSchema,
} as const;

export type ToolCompProfileType = keyof typeof TOOL_COMP_SCHEMA_MAP;

// ── Metadata ──────────────────────────────────────────────────────────────────

/** Metadata record for every tool compensation profile type */
export interface ToolCompMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
}

/** Metadata for each tool compensation profile type with AC Python setter references */
export const TOOL_COMP_METADATA: Record<ToolCompProfileType, ToolCompMeta> = {
  milling: {
    paramCount: 15,
    acPythonSetter: "hm.comp.milling",
    description: "Milling cutter compensation with G41/G42 direction, wear registers, and corner handling",
  },
  turning: {
    paramCount: 14,
    acPythonSetter: "hm.comp.turning",
    description: "Turning tool compensation with TNRC, nose radius, and imaginary tip orientation",
  },
  drilling: {
    paramCount: 12,
    acPythonSetter: "hm.comp.drilling",
    description: "Drilling tool compensation with length/diameter offset registers and breakage detection",
  },
  multi_axis: {
    paramCount: 13,
    acPythonSetter: "hm.comp.multi_axis",
    description: "Multi-axis tool compensation with TCPM, pivot compensation, and kinematic model support",
  },
};

// ── Computed Totals ───────────────────────────────────────────────────────────

/** Total parameter count across all 4 tool compensation profile schemas */
export const TOOL_COMP_TOTAL_PARAM_COUNT = Object.values(TOOL_COMP_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
