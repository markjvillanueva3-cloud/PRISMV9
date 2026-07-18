/**
 * Allowance Parameter Schemas — hyperMILL Machining Allowance
 *
 * U-HKC14: Zod schemas for 3 allowance types used in hyperMILL machining
 * configuration. Each schema defines the parameter set the AC Python API
 * accepts when configuring radial/axial allowances, XY/corner allowances,
 * and negative allowance safety controls.
 *
 * AC Python call pattern:
 *   hm.allowance.radial_axial(radial_allowance=0.5, axial_allowance=0.3, ...)
 *
 * @domain Fixture-Allowance
 * @milestone HM-KC-MS2/U-HKC14
 */

import { z } from "zod";

// ── Shared types ─────────────────────────────────────────────────────────────

/** Metadata record for every allowance type */
export interface AllowanceMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

// ── 1. Radial/Axial Allowance (5 params) ───────────────────────────────────

export const radialAxialSchema = z.object({
  radial_allowance: z
    .number()
    .min(-5)
    .max(50)
    .default(0.5)
    .describe("Radial (side) material allowance, mm"),
  axial_allowance: z
    .number()
    .min(-5)
    .max(50)
    .default(0.3)
    .describe("Axial (floor/bottom) material allowance, mm"),
  apply_mode: z
    .enum(["uniform", "per_surface", "per_feature"])
    .describe("How allowance values are applied to surfaces"),
  inherited_from: z
    .string()
    .optional()
    .describe("Reference to parent operation whose allowance this inherits (optional)"),
  locked: z
    .boolean()
    .default(false)
    .describe("Lock allowance values to prevent accidental modification"),
});

export type RadialAxial = z.infer<typeof radialAxialSchema>;

// ── 2. XY + Corner Allowance (5 params) ────────────────────────────────────

export const xyCornerSchema = z.object({
  xy_allowance: z
    .number()
    .min(-5)
    .max(50)
    .default(0.5)
    .describe("XY plane (lateral) allowance, mm"),
  corner_radius_allowance: z
    .number()
    .min(0)
    .max(10)
    .default(0)
    .describe("Additional allowance at internal corner radii, mm"),
  floor_allowance: z
    .number()
    .min(-5)
    .max(50)
    .default(0.3)
    .describe("Floor (Z-bottom) allowance, mm"),
  blend_transition: z
    .boolean()
    .default(true)
    .describe("Smooth blending between different allowance regions"),
  display_stock_model: z
    .boolean()
    .default(true)
    .describe("Display remaining stock model visualization with allowances applied"),
});

export type XYCorner = z.infer<typeof xyCornerSchema>;

// ── 3. Negative Allowance (4 params) ───────────────────────────────────────

export const negativeAllowanceSchema = z.object({
  allow_negative: z
    .boolean()
    .default(false)
    .describe("Allow negative allowance — DFM-BLOCKING: cuts INTO finished surface"),
  max_negative_depth: z
    .number()
    .min(-10)
    .max(0)
    .default(-0.5)
    .describe("Maximum negative allowance depth, mm (must be <= 0)"),
  negative_confirmation: z
    .boolean()
    .default(false)
    .describe("Explicit confirmation required before applying negative allowance"),
  warning_threshold: z
    .number()
    .min(-5)
    .max(0)
    .default(-0.1)
    .describe("Warn when negative allowance exceeds this threshold, mm"),
});

export type NegativeAllowance = z.infer<typeof negativeAllowanceSchema>;

// ── Schema Map ──────────────────────────────────────────────────────────────

/** All allowance schemas keyed by allowance type */
export const ALLOWANCE_SCHEMA_MAP = {
  radial_axial: radialAxialSchema,
  xy_corner: xyCornerSchema,
  negative_allowance: negativeAllowanceSchema,
} as const;

export type AllowanceType = keyof typeof ALLOWANCE_SCHEMA_MAP;

// ── Metadata ────────────────────────────────────────────────────────────────

/** Metadata for each allowance type with AC Python setter references */
export const ALLOWANCE_METADATA: Record<AllowanceType, AllowanceMeta> = {
  radial_axial: {
    paramCount: 5,
    acPythonSetter: "hm.allowance.radial_axial",
    description: "Radial and axial material allowance for semi-finish and finish operations",
  },
  xy_corner: {
    paramCount: 5,
    acPythonSetter: "hm.allowance.xy_corner",
    description: "XY plane and corner radius allowance with stock model visualization",
  },
  negative_allowance: {
    paramCount: 4,
    acPythonSetter: "hm.allowance.negative_allowance",
    description: "Negative allowance control — DFM-blocking safety gate for cutting into finished surfaces",
    dfmCriticalParams: ["allow_negative", "max_negative_depth"],
  },
};

// ── Computed totals ─────────────────────────────────────────────────────────

/** Total parameter count across all 3 allowance type schemas */
export const ALLOWANCE_TOTAL_PARAM_COUNT = Object.values(ALLOWANCE_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
