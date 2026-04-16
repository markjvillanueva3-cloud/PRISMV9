/**
 * Lead-In / Lead-Out Parameter Schemas — hyperMILL Linking
 *
 * U-HKC28: Zod schemas for 8 lead-in/out profile types applied across
 * hyperMILL cycle families. Covers arc, line, helix, ramp, and plunge
 * approaches plus arc, line, and retract departures.
 *
 * AC Python call pattern:
 *   hm.linking.arc_lead_in(radius=5, arc_angle=90, arc_direction="auto", ...)
 *
 * @domain CAM-Linking
 * @milestone HM-KC-MS5/U-HKC28
 */

import { z } from "zod";

// ── 1. Arc Lead-In (8 params) ────────────────────────────────────────────────

export const arcLeadInSchema = z.object({
  radius: z
    .number()
    .min(0.1)
    .max(1000)
    .describe("Arc approach radius, mm (DFM: should be >= tool_radius for safe entry)"),
  arc_angle: z
    .number()
    .min(10)
    .max(360)
    .default(90)
    .describe("Arc sweep angle for lead-in approach, degrees"),
  arc_direction: z
    .enum(["cw", "ccw", "auto"])
    .describe("Arc rotation direction: clockwise, counter-clockwise, or auto-detect from cut direction"),
  overlap: z
    .number()
    .min(0)
    .max(500)
    .default(0)
    .describe("Overlap distance past start point to blend entry with cutting path, mm"),
  height_offset: z
    .number()
    .min(-500)
    .max(500)
    .default(0)
    .describe("Vertical offset of arc start relative to cut plane, mm"),
  tangential: z
    .boolean()
    .default(true)
    .describe("Constrain arc to be tangent to toolpath at entry point for smooth transition"),
  full_circle: z
    .boolean()
    .default(false)
    .describe("Use full 360-degree arc for lead-in instead of partial arc"),
  z_ramp: z
    .boolean()
    .default(false)
    .describe("Ramp in Z during arc lead-in for helical approach entry"),
});

export type ArcLeadIn = z.infer<typeof arcLeadInSchema>;

// ── 2. Line Lead-In (6 params) ───────────────────────────────────────────────

export const lineLeadInSchema = z.object({
  length: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Linear approach length from retract position to cut start, mm"),
  angle: z
    .number()
    .min(-90)
    .max(90)
    .default(0)
    .describe("Approach angle relative to toolpath tangent at entry, degrees"),
  perpendicular: z
    .boolean()
    .default(true)
    .describe("Approach perpendicular to contour rather than along tangent direction"),
  height_offset: z
    .number()
    .min(-500)
    .max(500)
    .default(0)
    .describe("Vertical offset of line start relative to cut plane, mm"),
  from_boundary: z
    .boolean()
    .default(false)
    .describe("Start lead-in from part boundary instead of calculated offset position"),
  overlap: z
    .number()
    .min(0)
    .max(500)
    .default(0)
    .describe("Overlap distance past start point for blending, mm"),
});

export type LineLeadIn = z.infer<typeof lineLeadInSchema>;

// ── 3. Helix Lead-In (8 params) ──────────────────────────────────────────────

export const helixLeadInSchema = z.object({
  helix_radius: z
    .number()
    .min(0.1)
    .max(1000)
    .describe("Helix radius for helical lead-in, mm (DFM: must fit in pocket)"),
  helix_angle: z
    .number()
    .min(0.5)
    .max(90)
    .default(3)
    .describe("Helix ramp angle, degrees (DFM: lower = safer chip load; typical 2-5 deg)"),
  pitch: z
    .number()
    .min(0.01)
    .max(500)
    .describe("Axial pitch per revolution of helix, mm"),
  revolutions: z
    .number()
    .min(0.5)
    .max(20)
    .default(2)
    .describe("Number of helical revolutions before reaching cut depth"),
  direction: z
    .enum(["cw", "ccw", "auto"])
    .describe("Helix rotation direction: clockwise, counter-clockwise, or auto from spindle direction"),
  center_offset: z
    .number()
    .min(-500)
    .max(500)
    .default(0)
    .describe("Offset of helix center from toolpath start position, mm"),
  min_diameter: z
    .number()
    .min(0.1)
    .max(2000)
    .describe("Minimum pocket/slot diameter that allows helical entry, mm"),
  variable_radius: z
    .boolean()
    .default(false)
    .describe("Enable variable radius helix that expands outward during descent"),
});

export type HelixLeadIn = z.infer<typeof helixLeadInSchema>;

// ── 4. Ramp Lead-In (6 params) ───────────────────────────────────────────────

export const rampLeadInSchema = z.object({
  ramp_angle: z
    .number()
    .min(0.5)
    .max(45)
    .describe("Ramp angle for linear descent into material, degrees (DFM: lower = safer)"),
  ramp_length: z
    .number()
    .min(0.1)
    .max(5000)
    .describe("Total horizontal ramp distance, mm"),
  zigzag: z
    .boolean()
    .default(true)
    .describe("Use back-and-forth zigzag ramping instead of single-direction ramp"),
  ramp_width: z
    .number()
    .min(0.01)
    .max(500)
    .describe("Width of ramp cut perpendicular to ramp direction, mm"),
  max_depth_per_ramp: z
    .number()
    .min(0.01)
    .max(500)
    .describe("Maximum axial depth per ramp pass before re-entry, mm"),
  overlap_distance: z
    .number()
    .min(0)
    .max(500)
    .default(0)
    .describe("Overlap distance at bottom of ramp for smooth blending, mm"),
});

export type RampLeadIn = z.infer<typeof rampLeadInSchema>;

// ── 5. Plunge Lead-In (5 params) ─────────────────────────────────────────────

export const plungeLeadInSchema = z.object({
  plunge_feed: z
    .number()
    .min(1)
    .max(10000)
    .describe("Feed rate during plunge entry, mm/min (DFM: typically 30-50% of cutting feed)"),
  center_cutting_required: z
    .boolean()
    .describe("Tool must have center-cutting geometry for plunge entry (DFM-critical: non-center-cutting tools WILL break)"),
  pre_drill_depth: z
    .number()
    .min(0)
    .max(1000)
    .optional()
    .describe("Pre-drilled pilot hole depth to avoid full plunge load, mm"),
  retract_between_plunges: z
    .number()
    .min(0)
    .max(500)
    .default(2)
    .describe("Retract distance between successive plunge moves for chip clearing, mm"),
  spiral_plunge: z
    .boolean()
    .default(false)
    .describe("Convert plunge to spiral interpolation for reduced axial load"),
});

export type PlungeLeadIn = z.infer<typeof plungeLeadInSchema>;

// ── 6. Arc Lead-Out (6 params) ───────────────────────────────────────────────

export const arcLeadOutSchema = z.object({
  radius: z
    .number()
    .min(0.1)
    .max(1000)
    .describe("Arc departure radius, mm"),
  arc_angle: z
    .number()
    .min(10)
    .max(360)
    .default(90)
    .describe("Arc sweep angle for lead-out departure, degrees"),
  direction: z
    .enum(["cw", "ccw", "auto"])
    .describe("Arc rotation direction for departure"),
  tangential: z
    .boolean()
    .default(true)
    .describe("Constrain arc to be tangent to toolpath at exit point for smooth departure"),
  extend_past: z
    .number()
    .min(0)
    .max(500)
    .default(0)
    .describe("Extend cutting past nominal end point before lead-out begins, mm"),
  height_lift: z
    .number()
    .min(0)
    .max(500)
    .default(0)
    .describe("Vertical lift during arc lead-out for clearance, mm"),
});

export type ArcLeadOut = z.infer<typeof arcLeadOutSchema>;

// ── 7. Line Lead-Out (5 params) ──────────────────────────────────────────────

export const lineLeadOutSchema = z.object({
  length: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Linear departure length from cut end to retract position, mm"),
  angle: z
    .number()
    .min(-90)
    .max(90)
    .default(0)
    .describe("Departure angle relative to toolpath tangent at exit, degrees"),
  perpendicular: z
    .boolean()
    .default(true)
    .describe("Depart perpendicular to contour rather than along tangent direction"),
  extend_past: z
    .number()
    .min(0)
    .max(500)
    .default(0)
    .describe("Extend cutting past nominal end point before lead-out begins, mm"),
  height_lift: z
    .number()
    .min(0)
    .max(500)
    .default(0)
    .describe("Vertical lift during line lead-out for clearance, mm"),
});

export type LineLeadOut = z.infer<typeof lineLeadOutSchema>;

// ── 8. Retract Lead-Out (5 params) ───────────────────────────────────────────

export const retractLeadOutSchema = z.object({
  retract_type: z
    .enum(["rapid", "feed", "controlled"])
    .describe("Retract motion type: rapid (G0), feed-rate (G1), or controlled deceleration"),
  retract_distance: z
    .number()
    .min(0.1)
    .max(1000)
    .describe("Retract distance above cut surface before rapid traverse, mm"),
  retract_feed: z
    .number()
    .min(1)
    .max(50000)
    .describe("Feed rate during retract when type is feed or controlled, mm/min"),
  retract_to_clearance: z
    .boolean()
    .default(true)
    .describe("Retract fully to clearance plane instead of incremental distance"),
  decelerate: z
    .boolean()
    .default(false)
    .describe("Apply controlled deceleration profile during retract to reduce tool shock"),
});

export type RetractLeadOut = z.infer<typeof retractLeadOutSchema>;

// ── Schema Map ───────────────────────────────────────────────────────────────

/** All 8 lead-in/out profile schemas keyed by profile type */
export const LEAD_IN_OUT_SCHEMA_MAP = {
  arc_lead_in: arcLeadInSchema,
  line_lead_in: lineLeadInSchema,
  helix_lead_in: helixLeadInSchema,
  ramp_lead_in: rampLeadInSchema,
  plunge_lead_in: plungeLeadInSchema,
  arc_lead_out: arcLeadOutSchema,
  line_lead_out: lineLeadOutSchema,
  retract_lead_out: retractLeadOutSchema,
} as const;

export type LeadInOutProfileType = keyof typeof LEAD_IN_OUT_SCHEMA_MAP;

// ── Metadata ─────────────────────────────────────────────────────────────────

/** Metadata record for every lead-in/out profile type */
export interface LeadInOutMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each lead-in/out profile type with AC Python setter references */
export const LEAD_IN_OUT_METADATA: Record<LeadInOutProfileType, LeadInOutMeta> = {
  arc_lead_in: {
    paramCount: 8,
    acPythonSetter: "hm.linking.arc_lead_in",
    description: "Arc approach into cutting path with configurable radius, angle, and tangency",
    dfmCriticalParams: ["radius"],
  },
  line_lead_in: {
    paramCount: 6,
    acPythonSetter: "hm.linking.line_lead_in",
    description: "Linear approach into cutting path with configurable length, angle, and perpendicularity",
  },
  helix_lead_in: {
    paramCount: 8,
    acPythonSetter: "hm.linking.helix_lead_in",
    description: "Helical interpolation approach for pocket entry with controlled ramp angle",
    dfmCriticalParams: ["helix_radius", "helix_angle"],
  },
  ramp_lead_in: {
    paramCount: 6,
    acPythonSetter: "hm.linking.ramp_lead_in",
    description: "Linear ramp descent into material with optional zigzag pattern",
    dfmCriticalParams: ["ramp_angle"],
  },
  plunge_lead_in: {
    paramCount: 5,
    acPythonSetter: "hm.linking.plunge_lead_in",
    description: "Direct vertical plunge entry requiring center-cutting tool geometry",
    dfmCriticalParams: ["plunge_feed", "center_cutting_required"],
  },
  arc_lead_out: {
    paramCount: 6,
    acPythonSetter: "hm.linking.arc_lead_out",
    description: "Arc departure from cutting path with configurable radius and tangency",
  },
  line_lead_out: {
    paramCount: 5,
    acPythonSetter: "hm.linking.line_lead_out",
    description: "Linear departure from cutting path with configurable length and angle",
  },
  retract_lead_out: {
    paramCount: 5,
    acPythonSetter: "hm.linking.retract_lead_out",
    description: "Retract motion from cut surface with rapid, feed-rate, or controlled deceleration",
  },
};

// ── Computed Totals ──────────────────────────────────────────────────────────

/** Total parameter count across all 8 lead-in/out profile schemas */
export const LEAD_IN_OUT_TOTAL_PARAM_COUNT = Object.values(LEAD_IN_OUT_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
