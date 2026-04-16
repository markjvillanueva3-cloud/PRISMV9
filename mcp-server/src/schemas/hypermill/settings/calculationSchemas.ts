/**
 * Calculation Settings Parameter Schemas — hyperMILL System Settings
 *
 * U-HKC36: Zod schemas for ~20 calculation system settings covering
 * tolerances, geometry checks, parallel calculation, behavior, and
 * toolpath optimization controls.
 *
 * AC Python call pattern:
 *   hm.settings.calculation_tolerance(tolerance=0.01, smoothing_tolerance=0.005, ...)
 *
 * @domain Settings / Calculation
 * @milestone HM-KC-MS7/U-HKC36
 */

import { z } from "zod";

// ============================================================================
// 1. CALCULATION TOLERANCE SETTINGS (4 params)
// ============================================================================

export const calculationToleranceSettingsSchema = z.object({
  tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.01)
    .describe("General calculation tolerance, mm (0.0001–1.0)"),
  smoothing_tolerance: z
    .number()
    .min(0.001)
    .max(0.05)
    .default(0.005)
    .describe("Toolpath smoothing tolerance controlling path deviation, mm"),
  chordal_tolerance: z
    .number()
    .min(0.0001)
    .max(0.5)
    .default(0.005)
    .describe("Chordal deviation tolerance for arc/spline approximation, mm"),
  angular_tolerance: z
    .number()
    .min(0.001)
    .max(5.0)
    .default(0.1)
    .describe("Angular tolerance for surface normal approximation, degrees"),
});

export type CalculationToleranceSettings = z.infer<typeof calculationToleranceSettingsSchema>;

// ============================================================================
// 2. GEOMETRY CHECK SETTINGS (4 params)
// ============================================================================

export const geometryCheckSettingsSchema = z.object({
  check_enabled: z
    .boolean()
    .default(true)
    .describe("Enable automatic geometry validation before calculation"),
  check_level: z
    .enum(["basic", "full", "strict"])
    .default("full")
    .describe("Depth of geometry check: basic (fast), full (standard), strict (exhaustive)"),
  fix_on_check: z
    .boolean()
    .default(false)
    .describe("Attempt automatic geometry repair when issues are detected"),
  log_results: z
    .boolean()
    .default(true)
    .describe("Write geometry check results to the session log"),
});

export type GeometryCheckSettings = z.infer<typeof geometryCheckSettingsSchema>;

// ============================================================================
// 3. PARALLEL CALCULATION SETTINGS (4 params)
// ============================================================================

export const parallelCalculationSettingsSchema = z.object({
  parallel_enabled: z
    .boolean()
    .default(true)
    .describe("Enable multi-threaded parallel toolpath calculation"),
  max_threads: z
    .number()
    .int()
    .min(1)
    .max(32)
    .default(4)
    .describe("Maximum number of CPU threads for parallel calculation (1–32)"),
  calculation_priority: z
    .enum(["low", "normal", "high"])
    .default("normal")
    .describe("OS scheduling priority for calculation processes"),
  memory_limit_mb: z
    .number()
    .int()
    .min(256)
    .max(131072)
    .default(4096)
    .describe("Maximum RAM allocated to calculation processes, MB"),
});

export type ParallelCalculationSettings = z.infer<typeof parallelCalculationSettingsSchema>;

// ============================================================================
// 4. CALCULATION BEHAVIOR SETTINGS (4 params)
// ============================================================================

export const calculationBehaviorSettingsSchema = z.object({
  auto_calculate_on_change: z
    .boolean()
    .default(false)
    .describe("Automatically re-calculate operations when parameters change"),
  show_progress: z
    .boolean()
    .default(true)
    .describe("Display progress indicator during calculation"),
  cancel_on_error: z
    .boolean()
    .default(true)
    .describe("Abort the entire calculation batch when a single operation fails"),
  timeout_minutes: z
    .number()
    .int()
    .min(1)
    .max(1440)
    .default(60)
    .describe("Maximum calculation wall-clock time before automatic cancellation, minutes"),
});

export type CalculationBehaviorSettings = z.infer<typeof calculationBehaviorSettingsSchema>;

// ============================================================================
// 5. OPTIMIZATION SETTINGS (5 params)
// ============================================================================

export const optimizationSettingsSchema = z.object({
  optimize_toolpath: z
    .boolean()
    .default(true)
    .describe("Enable global toolpath optimization post-calculation"),
  reduce_air_cuts: z
    .boolean()
    .default(true)
    .describe("Remove unnecessary air-cutting moves from calculated toolpath"),
  smooth_transitions: z
    .boolean()
    .default(true)
    .describe("Insert smooth blending arcs at toolpath direction changes"),
  arc_fitting_enabled: z
    .boolean()
    .default(true)
    .describe("Fit circular arcs to linear toolpath segments where possible"),
  arc_tolerance: z
    .number()
    .min(0.0001)
    .max(1.0)
    .default(0.01)
    .describe("Maximum deviation allowed when fitting arcs to linear moves, mm"),
});

export type OptimizationSettings = z.infer<typeof optimizationSettingsSchema>;

// ============================================================================
// Schema Map (5 types, 21 params total)
// ============================================================================

/** All 5 calculation settings schemas keyed by type */
export const CALCULATION_SETTINGS_SCHEMA_MAP: Record<string, z.ZodObject<z.ZodRawShape>> = {
  calculation_tolerance: calculationToleranceSettingsSchema,
  geometry_check: geometryCheckSettingsSchema,
  parallel_calculation: parallelCalculationSettingsSchema,
  calculation_behavior: calculationBehaviorSettingsSchema,
  optimization: optimizationSettingsSchema,
};

export type CalculationSettingsType = keyof typeof CALCULATION_SETTINGS_SCHEMA_MAP;

// ============================================================================
// Metadata
// ============================================================================

export interface CalculationSettingsMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
}

export const CALCULATION_SETTINGS_METADATA: Record<CalculationSettingsType, CalculationSettingsMeta> = {
  calculation_tolerance: {
    paramCount: 4,
    acPythonSetter: "hm.settings.calculation_tolerance",
    description: "General, smoothing, chordal, and angular tolerances for toolpath calculation",
  },
  geometry_check: {
    paramCount: 4,
    acPythonSetter: "hm.settings.geometry_check",
    description: "Pre-calculation geometry validation level, auto-fix, and logging",
  },
  parallel_calculation: {
    paramCount: 4,
    acPythonSetter: "hm.settings.parallel_calculation",
    description: "Multi-threaded calculation configuration: thread count, priority, memory limit",
  },
  calculation_behavior: {
    paramCount: 4,
    acPythonSetter: "hm.settings.calculation_behavior",
    description: "Auto-calculate triggers, progress display, error handling, and timeout",
  },
  optimization: {
    paramCount: 5,
    acPythonSetter: "hm.settings.optimization",
    description: "Post-calculation toolpath optimization: air cuts, transitions, arc fitting",
  },
};

// ============================================================================
// Computed Totals
// ============================================================================

/** Total parameter count across all 5 calculation settings schemas */
export const CALCULATION_SETTINGS_TOTAL_PARAM_COUNT = Object.values(CALCULATION_SETTINGS_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
