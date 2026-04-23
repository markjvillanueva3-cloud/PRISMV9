/**
 * Stay-Down / KeepDown Parameter Schemas — hyperMILL Linking
 *
 * U-HKC30: Zod schemas for 5 stay-down/keepdown profile types used across
 * hyperMILL toolpath linking. These profiles control how the tool behaves
 * between cuts — whether it retracts to clearance or stays near the part
 * surface to minimize non-cutting time.
 *
 * AC Python call pattern:
 *   hm.linking.staydown.basic(enabled=True, max_distance=500, gap_threshold=5, ...)
 *
 * @domain CAM-Linking-StayDown
 * @milestone HM-KC-MS5/U-HKC30
 */

import { z } from "zod";

// -- 1. Stay Down Basic (6 params) --------------------------------------------

export const stayDownBasicSchema = z.object({
  enabled: z
    .boolean()
    .default(false)
    .describe("Enable stay-down linking between adjacent cuts"),
  max_distance: z
    .number()
    .min(0)
    .max(10000)
    .describe("Maximum link distance before forcing a retract, mm"),
  gap_threshold: z
    .number()
    .min(0.1)
    .max(100)
    .describe("Gap distance threshold below which stay-down linking is applied, mm (DFM-critical: too large risks gouging)"),
  min_cut_length: z
    .number()
    .min(0)
    .describe("Minimum cut segment length to qualify for stay-down linking, mm"),
  link_feed: z
    .number()
    .min(0)
    .describe("Feed rate during stay-down linking moves between cuts, mm/min"),
  link_height: z
    .number()
    .min(0)
    .max(100)
    .describe("Height above part surface for stay-down linking traversal, mm"),
});

export type StayDownBasic = z.infer<typeof stayDownBasicSchema>;

// -- 2. Stay Down Optimized (7 params) ----------------------------------------

export const stayDownOptimizedSchema = z.object({
  optimization_level: z
    .enum(["none", "basic", "aggressive"])
    .describe("Stay-down optimization aggressiveness: none disables, aggressive maximizes time savings"),
  time_vs_safety: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("Trade-off weight between cycle time reduction (0) and collision safety (1)"),
  avoid_thin_walls: z
    .boolean()
    .default(true)
    .describe("Prevent stay-down links from traversing near thin wall features"),
  min_wall_thickness: z
    .number()
    .min(0)
    .describe("Minimum wall thickness threshold for thin-wall avoidance, mm"),
  retract_for_corners: z
    .boolean()
    .describe("Force retract at sharp internal corners where stay-down risks gouging"),
  corner_angle_threshold: z
    .number()
    .min(0)
    .max(180)
    .describe("Corner angle below which a retract is forced during stay-down, degrees"),
  cycle_time_savings_pct: z
    .number()
    .min(0)
    .max(100)
    .describe("Estimated cycle time savings from stay-down optimization, % (computed output)"),
});

export type StayDownOptimized = z.infer<typeof stayDownOptimizedSchema>;

// -- 3. KeepDown Mode (6 params) ----------------------------------------------

export const keepDownModeSchema = z.object({
  keepdown_height: z
    .number()
    .min(0)
    .max(100)
    .describe("Height above machined surface for keepdown traversal moves, mm"),
  keepdown_clearance: z
    .number()
    .min(0)
    .describe("Lateral clearance from part walls during keepdown moves, mm"),
  keepdown_feed: z
    .number()
    .min(0)
    .describe("Feed rate for keepdown linking moves between cut segments, mm/min"),
  apply_to_finishing: z
    .boolean()
    .default(false)
    .describe("Apply keepdown linking to finishing passes (conservative default off)"),
  apply_to_roughing: z
    .boolean()
    .default(true)
    .describe("Apply keepdown linking to roughing passes where cycle time savings are largest"),
  link_in_rapid: z
    .boolean()
    .default(false)
    .describe("Use rapid traverse for keepdown links instead of programmed feed"),
});

export type KeepDownMode = z.infer<typeof keepDownModeSchema>;

// -- 4. Collision Avoidance Linking (5 params) --------------------------------

export const collisionAvoidanceLinkingSchema = z.object({
  fixture_clearance: z
    .number()
    .min(1)
    .max(100)
    .describe("Minimum clearance from fixture elements during linking moves, mm (DFM-critical: collision risk)"),
  clamp_avoidance: z
    .boolean()
    .default(true)
    .describe("Enable automatic clamp detection and avoidance during linking"),
  holder_check: z
    .boolean()
    .default(true)
    .describe("Include tool holder geometry in collision checking for linking moves"),
  shank_clearance: z
    .number()
    .min(0)
    .describe("Additional clearance margin for tool shank during linking, mm"),
  simulation_verify: z
    .boolean()
    .default(false)
    .describe("Run full simulation verification of linking moves for collision detection"),
});

export type CollisionAvoidanceLinking = z.infer<typeof collisionAvoidanceLinkingSchema>;

// -- 5. Cycle Time Optimizer (5 params) ---------------------------------------

export const cycleTimeOptimizerSchema = z.object({
  optimize_retracts: z
    .boolean()
    .default(true)
    .describe("Minimize retract heights to reduce non-cutting air time"),
  optimize_transitions: z
    .boolean()
    .default(true)
    .describe("Optimize transition moves between cut segments for shortest path"),
  merge_similar_heights: z
    .boolean()
    .default(true)
    .describe("Merge linking moves at similar Z heights to reduce unnecessary Z changes"),
  rapid_traverse_optimization: z
    .boolean()
    .default(true)
    .describe("Optimize rapid traverse paths using shortest-distance routing"),
  estimated_savings_pct: z
    .number()
    .min(0)
    .max(100)
    .describe("Estimated cycle time savings from retract/transition optimization, % (computed output)"),
});

export type CycleTimeOptimizer = z.infer<typeof cycleTimeOptimizerSchema>;

// -- Schema Map ---------------------------------------------------------------

/** All 5 stay-down/keepdown profile schemas keyed by profile type */
export const STAY_DOWN_SCHEMA_MAP = {
  basic: stayDownBasicSchema,
  optimized: stayDownOptimizedSchema,
  keepdown: keepDownModeSchema,
  collision_avoidance: collisionAvoidanceLinkingSchema,
  cycle_time: cycleTimeOptimizerSchema,
} as const;

export type StayDownProfileType = keyof typeof STAY_DOWN_SCHEMA_MAP;

// -- Metadata -----------------------------------------------------------------

/** Metadata record for every stay-down/keepdown profile type */
export interface StayDownMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each stay-down/keepdown profile type with AC Python setter references */
export const STAY_DOWN_METADATA: Record<StayDownProfileType, StayDownMeta> = {
  basic: {
    paramCount: 6,
    acPythonSetter: "hm.linking.staydown.basic",
    description: "Basic stay-down linking with distance and gap thresholds",
    dfmCriticalParams: ["gap_threshold"],
  },
  optimized: {
    paramCount: 7,
    acPythonSetter: "hm.linking.staydown.optimized",
    description: "Optimized stay-down with thin-wall avoidance and corner-aware retracts",
  },
  keepdown: {
    paramCount: 6,
    acPythonSetter: "hm.linking.staydown.keepdown",
    description: "KeepDown mode for roughing-focused low-height linking traversal",
  },
  collision_avoidance: {
    paramCount: 5,
    acPythonSetter: "hm.linking.staydown.collision_avoidance",
    description: "Collision-aware linking with fixture, clamp, and holder clearance checks",
    dfmCriticalParams: ["fixture_clearance"],
  },
  cycle_time: {
    paramCount: 5,
    acPythonSetter: "hm.linking.staydown.cycle_time",
    description: "Cycle time optimizer reducing air time through retract and transition tuning",
  },
};

// -- Computed Totals ----------------------------------------------------------

/** Total parameter count across all 5 stay-down/keepdown profile schemas */
export const STAY_DOWN_TOTAL_PARAM_COUNT = Object.values(STAY_DOWN_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
