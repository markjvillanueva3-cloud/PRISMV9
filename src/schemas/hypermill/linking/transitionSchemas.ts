/**
 * Transition Parameter Schemas -- hyperMILL Linking
 *
 * U-HKC29: Zod schemas for 4 transition types used in hyperMILL linking
 * configuration. Each schema defines the parameter set the AC Python API accepts
 * when configuring transition behavior between toolpath segments.
 *
 * AC Python call pattern:
 *   hm.linking.transition.direct(feed_mode="rapid", collision_check=true, ...)
 *
 * @domain Linking-Transition
 * @milestone HM-KC-MS5/U-HKC29
 */

import { z } from "zod";

// -- Shared types -------------------------------------------------------------

/** Metadata record for every transition type */
export interface TransitionMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// -- 1. Direct Transition (4 params) ------------------------------------------

export const directTransitionSchema = z.object({
  feed_mode: z
    .enum(["rapid", "cutting", "reduced"])
    .describe("Feed mode for direct transition between cuts"),
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking during direct transition"),
  max_direct_distance: z
    .number()
    .min(0)
    .max(10000)
    .describe("Maximum distance for direct transition before fallback, mm"),
  abort_if_collision: z
    .boolean()
    .default(true)
    .describe("Abort direct transition and use safe path if collision detected"),
});

export type DirectTransition = z.infer<typeof directTransitionSchema>;

// -- 2. Arc Transition (5 params) ---------------------------------------------

export const arcTransitionSchema = z.object({
  arc_radius: z
    .number()
    .min(0.1)
    .max(10000)
    .describe("Radius of arc transition move, mm"),
  arc_plane: z
    .enum(["xy", "xz", "yz", "auto"])
    .describe("Plane in which arc transition is executed"),
  tangent_entry: z
    .boolean()
    .default(true)
    .describe("Use tangential entry into cut from arc"),
  tangent_exit: z
    .boolean()
    .default(true)
    .describe("Use tangential exit from cut into arc"),
  arc_height: z
    .number()
    .min(0)
    .max(10000)
    .default(0)
    .describe("Additional height offset for arc transition, mm"),
});

export type ArcTransition = z.infer<typeof arcTransitionSchema>;

// -- 3. Via Clearance Transition (4 params) -----------------------------------

export const viaClearanceTransitionSchema = z.object({
  clearance_height: z
    .number()
    .min(0)
    .max(10000)
    .describe("Clearance height for transition via safe plane, mm"),
  approach_feed: z
    .number()
    .min(1)
    .max(100000)
    .describe("Feed rate for approach from clearance to cut, mm/min"),
  retract_feed: z
    .number()
    .min(1)
    .max(100000)
    .describe("Feed rate for retract from cut to clearance, mm/min"),
  optimize_path: z
    .boolean()
    .default(true)
    .describe("Optimize transition path to minimize total travel distance"),
});

export type ViaClearanceTransition = z.infer<typeof viaClearanceTransitionSchema>;

// -- 4. Gap Handling (5 params) -----------------------------------------------

export const gapHandlingSchema = z.object({
  gap_action: z
    .enum(["keep_contact", "retract", "skip", "bridge"])
    .describe("Action to take when a gap is encountered in the toolpath"),
  gap_threshold: z
    .number()
    .min(0.1)
    .max(100)
    .describe("Minimum gap distance to trigger gap action, mm (DFM-critical)"),
  bridge_feed: z
    .number()
    .min(1)
    .max(100000)
    .describe("Feed rate for bridging across gaps, mm/min"),
  min_bridge_length: z
    .number()
    .min(0)
    .max(10000)
    .describe("Minimum bridge length before gap action triggers, mm"),
  gap_detection_mode: z
    .enum(["auto", "manual"])
    .describe("Gap detection mode: auto uses toolpath analysis, manual uses user thresholds"),
});

export type GapHandling = z.infer<typeof gapHandlingSchema>;

// -- Schema Map ---------------------------------------------------------------

/** All transition schemas keyed by transition type */
export const TRANSITION_SCHEMA_MAP = {
  direct: directTransitionSchema,
  arc: arcTransitionSchema,
  via_clearance: viaClearanceTransitionSchema,
  gap_handling: gapHandlingSchema,
} as const;

export type TransitionType = keyof typeof TRANSITION_SCHEMA_MAP;

// -- Metadata -----------------------------------------------------------------

/** Metadata for each transition type with AC Python setter references */
export const TRANSITION_METADATA: Record<TransitionType, TransitionMeta> = {
  direct: {
    paramCount: 4,
    acPythonSetter: "hm.linking.transition.direct",
    description: "Direct linear transition between adjacent toolpath segments",
  },
  arc: {
    paramCount: 5,
    acPythonSetter: "hm.linking.transition.arc",
    description: "Arc transition with tangential entry/exit for smooth tool motion",
  },
  via_clearance: {
    paramCount: 4,
    acPythonSetter: "hm.linking.transition.via_clearance",
    description: "Transition via clearance plane for safe repositioning between cuts",
  },
  gap_handling: {
    paramCount: 5,
    acPythonSetter: "hm.linking.transition.gap_handling",
    description: "Gap detection and handling strategy for discontinuous toolpaths",
    dfmCriticalParams: ["gap_threshold"],
  },
};

// -- Computed totals ----------------------------------------------------------

/** Total parameter count across all 4 transition schemas */
export const TRANSITION_TOTAL_PARAM_COUNT = Object.values(TRANSITION_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
