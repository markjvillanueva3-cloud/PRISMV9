/**
 * Retract Policy Parameter Schemas -- hyperMILL Linking
 *
 * U-HKC29: Zod schemas for 6 retract policy types used in hyperMILL linking
 * configuration. Each schema defines the parameter set the AC Python API accepts
 * when configuring retract behavior during toolpath linking moves.
 *
 * AC Python call pattern:
 *   hm.linking.retract.full_retract(retract_height=50, rapid_retract=true, ...)
 *
 * @domain Linking-Retract
 * @milestone HM-KC-MS5/U-HKC29
 */

import { z } from "zod";

// -- Shared types -------------------------------------------------------------

/** Metadata record for every retract policy type */
export interface RetractMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// -- 1. Full Retract (5 params) -----------------------------------------------

export const fullRetractSchema = z.object({
  retract_height: z
    .number()
    .min(0)
    .max(10000)
    .describe("Full retract height above reference, mm"),
  rapid_retract: z
    .boolean()
    .default(true)
    .describe("Use rapid traverse (G0) for retract move"),
  retract_feed: z
    .number()
    .min(1)
    .max(100000)
    .describe("Feed rate during retract when not using rapid, mm/min"),
  orient_on_retract: z
    .boolean()
    .default(false)
    .describe("Orient spindle on retract for indexed operations"),
  coolant_off_on_retract: z
    .boolean()
    .default(false)
    .describe("Turn off coolant during retract move"),
});

export type FullRetract = z.infer<typeof fullRetractSchema>;

// -- 2. Minimal Retract (5 params) --------------------------------------------

export const minimalRetractSchema = z.object({
  retract_distance: z
    .number()
    .min(0.5)
    .max(100)
    .default(2)
    .describe("Minimal retract distance above cut surface, mm"),
  above_stock: z
    .number()
    .min(0)
    .max(1000)
    .describe("Height above stock top for minimal retract, mm"),
  feed_on_retract: z
    .boolean()
    .default(false)
    .describe("Use cutting feed rate instead of rapid for retract"),
  safety_offset: z
    .number()
    .min(0.5)
    .max(50)
    .default(1)
    .describe("Safety offset from computed retract position, mm (DFM-critical)"),
  collision_check: z
    .boolean()
    .default(true)
    .describe("Enable collision checking during minimal retract"),
});

export type MinimalRetract = z.infer<typeof minimalRetractSchema>;

// -- 3. No Retract / Stay Down (5 params) -------------------------------------

export const noRetractSchema = z.object({
  max_traverse_distance: z
    .number()
    .min(0)
    .max(10000)
    .describe("Maximum distance for stay-down traverse between cuts, mm"),
  gap_threshold: z
    .number()
    .min(0.1)
    .max(100)
    .describe("Gap distance below which tool stays down, mm (DFM-critical)"),
  min_cut_length: z
    .number()
    .min(0)
    .max(10000)
    .describe("Minimum cut length to qualify for stay-down linking, mm"),
  link_feed: z
    .number()
    .min(1)
    .max(100000)
    .describe("Feed rate for stay-down link moves, mm/min"),
  collision_clearance: z
    .number()
    .min(0)
    .max(500)
    .describe("Clearance distance for collision avoidance in stay-down mode, mm"),
});

export type NoRetract = z.infer<typeof noRetractSchema>;

// -- 4. Clearance Plane Retract (4 params) ------------------------------------

export const clearancePlaneRetractSchema = z.object({
  clearance_z: z
    .number()
    .min(-10000)
    .max(10000)
    .describe("Clearance plane Z height for retract, mm"),
  incremental: z
    .boolean()
    .default(false)
    .describe("Interpret clearance_z as incremental from current position"),
  approach_clearance: z
    .number()
    .min(0)
    .max(1000)
    .describe("Additional clearance above plane for approach moves, mm"),
  rapid_from_clearance: z
    .boolean()
    .default(true)
    .describe("Use rapid traverse from clearance plane to next position"),
});

export type ClearancePlaneRetract = z.infer<typeof clearancePlaneRetractSchema>;

// -- 5. Conditional Retract (5 params) ----------------------------------------

export const conditionalRetractSchema = z.object({
  retract_if_gap_exceeds: z
    .number()
    .min(0)
    .max(10000)
    .describe("Retract only if gap between cuts exceeds this distance, mm"),
  retract_if_depth_changes: z
    .boolean()
    .describe("Retract when Z depth changes between successive cuts"),
  retract_on_direction_change: z
    .boolean()
    .describe("Retract when cutting direction reverses"),
  retract_on_tool_change: z
    .boolean()
    .default(true)
    .describe("Always retract before tool change operations"),
  retract_on_operation_change: z
    .boolean()
    .default(true)
    .describe("Always retract when switching to a new operation"),
});

export type ConditionalRetract = z.infer<typeof conditionalRetractSchema>;

// -- 6. Smart Retract (5 params) ----------------------------------------------

export const smartRetractSchema = z.object({
  optimization_mode: z
    .enum(["fastest", "safest", "balanced"])
    .default("balanced")
    .describe("Smart retract optimization strategy"),
  avoid_fixtures: z
    .boolean()
    .default(true)
    .describe("Route retract moves to avoid fixture geometry"),
  fixture_clearance: z
    .number()
    .min(0)
    .max(500)
    .describe("Minimum clearance from fixture surfaces during retract, mm"),
  max_link_height: z
    .number()
    .min(0)
    .max(10000)
    .describe("Maximum height for smart link retract moves, mm"),
  estimate_time_savings: z
    .boolean()
    .default(true)
    .describe("Calculate and report estimated cycle time savings"),
});

export type SmartRetract = z.infer<typeof smartRetractSchema>;

// -- Schema Map ---------------------------------------------------------------

/** All retract policy schemas keyed by policy type */
export const RETRACT_SCHEMA_MAP = {
  full_retract: fullRetractSchema,
  minimal_retract: minimalRetractSchema,
  no_retract: noRetractSchema,
  clearance_plane_retract: clearancePlaneRetractSchema,
  conditional_retract: conditionalRetractSchema,
  smart_retract: smartRetractSchema,
} as const;

export type RetractPolicyType = keyof typeof RETRACT_SCHEMA_MAP;

// -- Metadata -----------------------------------------------------------------

/** Metadata for each retract policy type with AC Python setter references */
export const RETRACT_METADATA: Record<RetractPolicyType, RetractMeta> = {
  full_retract: {
    paramCount: 5,
    acPythonSetter: "hm.linking.retract.full_retract",
    description: "Full retract to safe height between all cutting moves",
  },
  minimal_retract: {
    paramCount: 5,
    acPythonSetter: "hm.linking.retract.minimal_retract",
    description: "Minimal retract just above stock surface to reduce air time",
    dfmCriticalParams: ["safety_offset"],
  },
  no_retract: {
    paramCount: 5,
    acPythonSetter: "hm.linking.retract.no_retract",
    description: "Stay-down linking with no retract between adjacent cuts",
    dfmCriticalParams: ["gap_threshold"],
  },
  clearance_plane_retract: {
    paramCount: 4,
    acPythonSetter: "hm.linking.retract.clearance_plane_retract",
    description: "Retract to a defined clearance plane between operations",
  },
  conditional_retract: {
    paramCount: 5,
    acPythonSetter: "hm.linking.retract.conditional_retract",
    description: "Retract only when specific conditions are met (gap, depth change, etc.)",
  },
  smart_retract: {
    paramCount: 5,
    acPythonSetter: "hm.linking.retract.smart_retract",
    description: "AI-optimized retract with fixture avoidance and time estimation",
  },
};

// -- Computed totals ----------------------------------------------------------

/** Total parameter count across all 6 retract policy schemas */
export const RETRACT_TOTAL_PARAM_COUNT = Object.values(RETRACT_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
