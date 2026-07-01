/**
 * Entry Method Parameter Schemas — hyperMILL Linking
 *
 * U-HKC30: Zod schemas for 6 entry method profile types used across hyperMILL
 * toolpath linking. Each profile defines how a cutter enters the material at
 * the start of a cut or when re-engaging after a retract.
 *
 * AC Python call pattern:
 *   hm.linking.entry.ramp(ramp_angle=3, ramp_length=20, ramp_direction="zigzag", ...)
 *
 * @domain CAM-Linking-Entry
 * @milestone HM-KC-MS5/U-HKC30
 */

import { z } from "zod";

// -- 1. Ramp Entry (8 params) ------------------------------------------------

export const rampEntrySchema = z.object({
  ramp_angle: z
    .number()
    .min(0.5)
    .max(45)
    .describe("Ramp inclination angle, degrees (DFM-critical: too steep risks cutter damage)"),
  ramp_length: z
    .number()
    .min(0)
    .describe("Linear ramp distance projected onto XY plane, mm"),
  ramp_direction: z
    .enum(["along_cut", "zigzag", "one_way"])
    .describe("Ramp traversal pattern: along cut path, zigzag back-and-forth, or one-way linear"),
  max_depth_per_ramp: z
    .number()
    .min(0)
    .describe("Maximum axial depth achieved per single ramp pass, mm"),
  overlap: z
    .number()
    .min(0)
    .describe("Overlap distance between successive ramp passes for smooth floor, mm"),
  ramp_feed: z
    .number()
    .min(0)
    .describe("Feed rate during ramp entry motion, mm/min"),
  ramp_width: z
    .number()
    .min(0)
    .optional()
    .describe("Optional lateral width limit for ramp cut to avoid wall interference, mm"),
  center_or_edge: z
    .enum(["center", "edge"])
    .describe("Ramp reference position: tool center or cutting edge alignment"),
});

export type RampEntry = z.infer<typeof rampEntrySchema>;

// -- 2. Helical Entry (8 params) ----------------------------------------------

export const helicalEntrySchema = z.object({
  helix_diameter: z
    .number()
    .min(0)
    .describe("Helix circle diameter for entry, mm (DFM-critical: must be < pocket width)"),
  helix_angle: z
    .number()
    .min(0.5)
    .max(15)
    .describe("Helix descent angle per revolution, degrees (DFM-critical: tool-dependent limit)"),
  revolutions: z
    .number()
    .min(0.5)
    .max(20)
    .describe("Number of helical revolutions to reach target depth"),
  direction: z
    .enum(["cw", "ccw", "auto"])
    .describe("Helix rotation direction: clockwise, counter-clockwise, or auto from spindle"),
  center_offset: z
    .number()
    .min(0)
    .describe("Offset of helix center from programmed entry point, mm"),
  plunge_per_rev: z
    .number()
    .min(0)
    .describe("Axial plunge depth per helical revolution, mm"),
  min_helix_diameter: z
    .number()
    .min(0)
    .describe("Minimum allowable helix diameter before switching to plunge, mm"),
  variable_helix: z
    .boolean()
    .describe("Enable variable-diameter helix that widens as depth increases"),
});

export type HelicalEntry = z.infer<typeof helicalEntrySchema>;

// -- 3. Plunge Entry (6 params) -----------------------------------------------

export const plungeEntrySchema = z.object({
  plunge_feed: z
    .number()
    .min(0)
    .describe("Axial plunge feed rate, mm/min (DFM-critical: exceeding limit causes tool breakage)"),
  require_center_cutting: z
    .boolean()
    .describe("Require center-cutting tool geometry for plunge entry (DFM-critical: non-center-cutting tools WILL break)"),
  retract_between: z
    .number()
    .min(0)
    .describe("Retract height between successive plunge pecks for chip clearing, mm"),
  plunge_depth: z
    .number()
    .min(0)
    .describe("Total axial depth for a single plunge entry, mm"),
  overlap: z
    .number()
    .min(0)
    .describe("Overlap between adjacent plunge positions for full area coverage, mm"),
  spiral_plunge: z
    .boolean()
    .describe("Use spiral interpolation during plunge for reduced axial load"),
});

export type PlungeEntry = z.infer<typeof plungeEntrySchema>;

// -- 4. Pre-Drill Entry (6 params) --------------------------------------------

export const preDrillEntrySchema = z.object({
  pre_drill_diameter: z
    .number()
    .min(0)
    .describe("Diameter of pre-drilled entry hole, mm"),
  pre_drill_depth: z
    .number()
    .min(0)
    .describe("Depth of pre-drilled entry hole, mm"),
  alignment_tolerance: z
    .number()
    .min(0)
    .describe("Maximum misalignment between pre-drilled hole and toolpath entry, mm"),
  use_existing_hole: z
    .boolean()
    .describe("Use an existing hole in the part as entry point instead of drilling new"),
  pre_drill_tool: z
    .string()
    .optional()
    .describe("Tool identifier for the pre-drilling operation, if separate from main tool"),
  approach_from_hole: z
    .boolean()
    .default(true)
    .describe("Begin toolpath approach from the pre-drilled hole center"),
});

export type PreDrillEntry = z.infer<typeof preDrillEntrySchema>;

// -- 5. Tangential Entry (5 params) -------------------------------------------

export const tangentialEntrySchema = z.object({
  approach_radius: z
    .number()
    .min(0)
    .describe("Arc radius for tangential approach to cut boundary, mm"),
  approach_angle: z
    .number()
    .min(0)
    .max(360)
    .describe("Sweep angle of the tangential approach arc, degrees"),
  smooth_transition: z
    .boolean()
    .default(true)
    .describe("Enable curvature-continuous transition from approach arc to cut path"),
  approach_feed: z
    .number()
    .min(0)
    .describe("Feed rate during tangential approach motion, mm/min"),
  z_ramp: z
    .boolean()
    .default(false)
    .describe("Apply simultaneous Z ramping during tangential arc approach"),
});

export type TangentialEntry = z.infer<typeof tangentialEntrySchema>;

// -- 6. Direct Entry (4 params) -----------------------------------------------

export const directEntrySchema = z.object({
  approach_feed: z
    .number()
    .min(0)
    .describe("Feed rate for direct linear approach to cutting start, mm/min"),
  approach_clearance: z
    .number()
    .min(0)
    .default(2)
    .describe("Clearance distance above material surface before engaging cut, mm"),
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking during direct approach move"),
  decelerate_before_cut: z
    .boolean()
    .default(true)
    .describe("Decelerate to cutting feed before material engagement to reduce impact"),
});

export type DirectEntry = z.infer<typeof directEntrySchema>;

// -- Schema Map ---------------------------------------------------------------

/** All 6 entry method profile schemas keyed by entry type */
export const ENTRY_METHOD_SCHEMA_MAP = {
  ramp: rampEntrySchema,
  helical: helicalEntrySchema,
  plunge: plungeEntrySchema,
  pre_drill: preDrillEntrySchema,
  tangential: tangentialEntrySchema,
  direct: directEntrySchema,
} as const;

export type EntryMethodType = keyof typeof ENTRY_METHOD_SCHEMA_MAP;

// -- Metadata -----------------------------------------------------------------

/** Metadata record for every entry method profile type */
export interface EntryMethodMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each entry method profile type with AC Python setter references */
export const ENTRY_METHOD_METADATA: Record<EntryMethodType, EntryMethodMeta> = {
  ramp: {
    paramCount: 8,
    acPythonSetter: "hm.linking.entry.ramp",
    description: "Ramp entry with controlled angle descent for gradual material engagement",
    dfmCriticalParams: ["ramp_angle"],
  },
  helical: {
    paramCount: 8,
    acPythonSetter: "hm.linking.entry.helical",
    description: "Helical interpolation entry for pocket and cavity operations",
    dfmCriticalParams: ["helix_diameter", "helix_angle"],
  },
  plunge: {
    paramCount: 6,
    acPythonSetter: "hm.linking.entry.plunge",
    description: "Axial plunge entry requiring center-cutting tool geometry",
    dfmCriticalParams: ["plunge_feed", "require_center_cutting"],
  },
  pre_drill: {
    paramCount: 6,
    acPythonSetter: "hm.linking.entry.pre_drill",
    description: "Entry through a pre-drilled hole to avoid full-width slot engagement",
  },
  tangential: {
    paramCount: 5,
    acPythonSetter: "hm.linking.entry.tangential",
    description: "Smooth tangential arc approach for contour and profile operations",
  },
  direct: {
    paramCount: 4,
    acPythonSetter: "hm.linking.entry.direct",
    description: "Direct linear approach for open-face and accessible entry positions",
  },
};

// -- Computed Totals ----------------------------------------------------------

/** Total parameter count across all 6 entry method profile schemas */
export const ENTRY_METHOD_TOTAL_PARAM_COUNT = Object.values(ENTRY_METHOD_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
