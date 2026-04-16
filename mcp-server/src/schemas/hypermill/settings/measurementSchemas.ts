/**
 * Measurement System Parameter Schemas — hyperMILL Settings
 *
 * U-HKC37: Zod schemas for unit system, display precision, and unit consistency settings.
 *
 * AC Python call pattern:
 *   hm.settings.measurement.set_units(unit_system="metric", ...)
 *
 * @domain Settings / Measurement
 * @milestone HM-KC-MS7/U-HKC37
 */

import { z } from "zod";

// ============================================================================
// 1. MEASUREMENT SYSTEM SETTINGS (5 params)
// ============================================================================

export const measurementSystemSettingsSchema = z.object({
  unit_system: z
    .enum(["metric", "imperial"])
    .default("metric")
    .describe("Primary unit system for all dimensional values: metric (mm) or imperial (inch)"),
  decimal_places_linear: z
    .number()
    .int()
    .min(0)
    .max(6)
    .default(3)
    .describe("Number of decimal places displayed for linear dimensions (0–6, default 3)"),
  decimal_places_angular: z
    .number()
    .int()
    .min(0)
    .max(4)
    .default(1)
    .describe("Number of decimal places displayed for angular dimensions (0–4, default 1)"),
  angle_format: z
    .enum(["decimal_degrees", "dms"])
    .default("decimal_degrees")
    .describe("Display format for angles: decimal_degrees (DD.ddd) or dms (DD°MM'SS\")"),
  coordinate_display: z
    .enum(["absolute", "incremental"])
    .default("absolute")
    .describe("Coordinate display mode in the viewport: absolute (from WCS origin) or incremental (from last point)"),
});

export type MeasurementSystemSettings = z.infer<typeof measurementSystemSettingsSchema>;

// ============================================================================
// 2. MEASUREMENT CONSISTENCY SETTINGS (4 params)
// ============================================================================

export const measurementConsistencySettingsSchema = z.object({
  enforce_consistency: z
    .boolean()
    .default(true)
    .describe("Enforce unit consistency across all project parameters — warn if mixed units are detected"),
  warn_on_mixed_units: z
    .boolean()
    .default(true)
    .describe("Display a warning when mixed unit systems (metric + imperial) are detected in the same project"),
  auto_convert_on_import: z
    .boolean()
    .default(true)
    .describe("Automatically convert imported geometry and data to the active project unit system"),
  conversion_rounding_mode: z
    .enum(["round", "truncate", "ceil"])
    .default("round")
    .describe("Rounding mode applied when converting values between unit systems (round/truncate/ceil)"),
});

export type MeasurementConsistencySettings = z.infer<typeof measurementConsistencySettingsSchema>;

// ============================================================================
// Schema Map (2 types)
// ============================================================================

/** All measurement settings schemas keyed by type */
export const MEASUREMENT_SCHEMA_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  measurement_system: measurementSystemSettingsSchema,
  measurement_consistency: measurementConsistencySettingsSchema,
};

export type MeasurementSchemaType = keyof typeof MEASUREMENT_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

export interface MeasurementMeta {
  paramCount: number;
  acPythonSetter: string;
  description: string;
}

export const MEASUREMENT_METADATA: Record<string, MeasurementMeta> = {
  measurement_system: {
    paramCount: 5,
    acPythonSetter: "hm.settings.measurement.set_units",
    description: "Configure unit system, linear/angular decimal places, angle format, and coordinate display mode",
  },
  measurement_consistency: {
    paramCount: 4,
    acPythonSetter: "hm.settings.measurement.set_consistency",
    description: "Configure unit consistency enforcement, mixed-unit warnings, and import conversion behavior",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all measurement settings schemas */
export const MEASUREMENT_TOTAL_PARAM_COUNT = Object.values(MEASUREMENT_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
