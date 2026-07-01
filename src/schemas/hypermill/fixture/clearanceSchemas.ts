/**
 * Clearance/Heights Parameter Schemas — hyperMILL Fixture Setup
 *
 * U-HKC14: Zod schemas for 4 clearance/height operation types used in hyperMILL
 * fixture and toolpath configuration. Each schema defines the parameter set the
 * AC Python API accepts when configuring clearance planes, retract heights, feed
 * heights, and link heights.
 *
 * AC Python call pattern:
 *   hm.clearance.clearance_plane(mode="relative", z_value=50, safety_margin=5, ...)
 *
 * @domain Fixture-Clearance
 * @milestone HM-KC-MS2/U-HKC14
 */

import { z } from "zod";

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every clearance operation type */
export interface ClearanceMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Clearance Plane (6 params) ──────────────────────────────────────────

export const clearancePlaneSchema = z.object({
  mode: z
    .enum(["absolute", "relative", "incremental"])
    .default("relative")
    .describe("Clearance plane positioning mode"),
  z_value: z
    .number()
    .min(-10000)
    .max(10000)
    .describe("Clearance plane Z height, mm"),
  apply_to: z
    .enum(["all_operations", "current_only", "operation_group"])
    .describe("Scope of clearance plane application"),
  reference: z
    .enum(["wcs_origin", "stock_top", "part_top", "fixture_top"])
    .default("stock_top")
    .describe("Reference datum for clearance plane Z value"),
  safety_margin: z
    .number()
    .min(0)
    .max(200)
    .default(5.0)
    .refine((v) => v > 0, { message: "safety_margin must be > 0 for safety (DFM-critical)" })
    .describe("Safety margin above reference surface, mm (DFM-critical: must be > 0)"),
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking against fixture and workholding geometry"),
});

export type ClearancePlane = z.infer<typeof clearancePlaneSchema>;

// ── 2. Retract Heights (6 params) ──────────────────────────────────────────

export const retractHeightsSchema = z.object({
  retract_mode: z
    .enum(["clearance_plane", "incremental", "absolute"])
    .describe("Retract height positioning mode"),
  retract_height: z
    .number()
    .min(0)
    .max(10000)
    .default(50)
    .describe("Primary retract height above reference, mm"),
  rapid_to_retract: z
    .boolean()
    .default(true)
    .describe("Use rapid traverse (G0) to reach retract height"),
  second_retract: z
    .boolean()
    .default(false)
    .describe("Enable secondary retract height for additional clearance"),
  second_retract_height: z
    .number()
    .min(0)
    .max(10000)
    .default(100)
    .describe("Secondary retract height above reference, mm"),
  between_operations: z
    .boolean()
    .default(true)
    .describe("Retract between operations in a sequence"),
});

export type RetractHeights = z.infer<typeof retractHeightsSchema>;

// ── 3. Feed Heights (6 params) ─────────────────────────────────────────────

export const feedHeightsSchema = z.object({
  feed_height_mode: z
    .enum(["absolute", "relative_to_top", "incremental"])
    .describe("Feed height positioning mode"),
  feed_height: z
    .number()
    .min(-1000)
    .max(10000)
    .default(2.0)
    .describe("Height at which rapid transitions to feed rate, mm"),
  rapid_to_feed: z
    .boolean()
    .default(true)
    .describe("Use rapid traverse (G0) to reach feed height"),
  plunge_feed_rate: z
    .number()
    .min(1)
    .max(10000)
    .default(500)
    .describe("Feed rate for plunge moves from feed height to cut, mm/min (DFM-critical)"),
  approach_type: z
    .enum(["direct", "ramp", "helix", "arc"])
    .describe("Tool approach strategy from feed height to cut depth"),
  approach_angle: z
    .number()
    .min(0)
    .max(90)
    .default(3.0)
    .describe("Ramp/helix approach angle, degrees"),
});

export type FeedHeights = z.infer<typeof feedHeightsSchema>;

// ── 4. Link Heights (6 params) ─────────────────────────────────────────────

export const linkHeightsSchema = z.object({
  link_mode: z
    .enum(["clearance", "direct", "optimized"])
    .default("optimized")
    .describe("Link movement strategy between toolpath segments"),
  min_link_height: z
    .number()
    .min(0)
    .max(1000)
    .default(2.0)
    .describe("Minimum link height above part surface, mm"),
  optimize_rapids: z
    .boolean()
    .default(true)
    .describe("Optimize rapid movements to minimize air cutting time"),
  avoid_clamps: z
    .boolean()
    .default(true)
    .describe("Route link movements to avoid clamp and fixture obstacles"),
  clamp_clearance: z
    .number()
    .min(0)
    .max(100)
    .default(5.0)
    .describe("Minimum clearance distance from clamp surfaces, mm"),
  max_link_distance: z
    .number()
    .min(0)
    .max(10000)
    .default(0)
    .describe("Maximum link movement distance — 0 = unlimited, mm"),
});

export type LinkHeights = z.infer<typeof linkHeightsSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All clearance schemas keyed by operation type */
export const CLEARANCE_SCHEMA_MAP = {
  clearance_plane: clearancePlaneSchema,
  retract_heights: retractHeightsSchema,
  feed_heights: feedHeightsSchema,
  link_heights: linkHeightsSchema,
} as const;

export type ClearanceOperationType = keyof typeof CLEARANCE_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata for each clearance operation type with AC Python setter references */
export const CLEARANCE_METADATA: Record<ClearanceOperationType, ClearanceMeta> = {
  clearance_plane: {
    paramCount: 6,
    acPythonSetter: "hm.clearance.clearance_plane",
    description: "Clearance plane definition for safe tool positioning above workpiece",
    dfmCriticalParams: ["safety_margin"],
  },
  retract_heights: {
    paramCount: 6,
    acPythonSetter: "hm.clearance.retract_heights",
    description: "Retract height configuration for tool withdrawal between operations",
  },
  feed_heights: {
    paramCount: 6,
    acPythonSetter: "hm.clearance.feed_heights",
    description: "Feed height transition from rapid to cutting feed rate",
    dfmCriticalParams: ["plunge_feed_rate"],
  },
  link_heights: {
    paramCount: 6,
    acPythonSetter: "hm.clearance.link_heights",
    description: "Link movement height for connecting toolpath segments with obstacle avoidance",
  },
};

// ── Computed totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 4 clearance operation schemas */
export const CLEARANCE_TOTAL_PARAM_COUNT = Object.values(CLEARANCE_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
