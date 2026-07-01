/**
 * Probing Cycle Parameter Schemas — hyperMILL CAM Probing
 *
 * U-HKC26: Zod schemas for 8 probing cycle types used in hyperMILL CAM.
 * Covers setup probes, feature probes (bore/boss/web/surface), tool setters,
 * breakage detection, and in-process verification. DFM-critical parameters
 * are tagged in metadata for downstream validation gates.
 *
 * AC Python call pattern:
 *   hm.probe.setup_probe(probe_type="touch", calibration_diameter=6, ...)
 *
 * @domain CAM-Probing
 * @milestone HM-KC-MS4/U-HKC26
 */

import { z } from "zod";

// ── 1. Setup Probe (10 params) ────────────────────────────────────────────────

export const setupProbeSchema = z.object({
  probe_type: z
    .enum(["touch", "optical", "laser"])
    .describe("Probe sensor type: touch-trigger, optical, or laser scanning"),
  calibration_diameter: z
    .number()
    .min(1)
    .max(50)
    .describe("Calibration sphere diameter, mm"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .describe("Feed rate during probing approach move, mm/min (DFM-critical: too fast risks stylus damage)"),
  overtravel: z
    .number()
    .min(0)
    .max(10)
    .describe("Maximum permitted overtravel distance after trigger, mm"),
  retract_distance: z
    .number()
    .min(0.5)
    .max(50)
    .describe("Retract distance after probe trigger before next move, mm"),
  dwell_before_measure: z
    .number()
    .min(0)
    .max(10)
    .describe("Settling dwell time before recording measurement, sec"),
  repeat_count: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("Number of repeat measurements for averaging"),
  expected_value: z
    .number()
    .optional()
    .describe("Expected measurement value for calibration check, mm"),
  pre_clean_air_blast: z
    .boolean()
    .default(false)
    .describe("Air-blast clean the surface before probing to remove chips/coolant"),
  calibration_temperature: z
    .number()
    .min(10)
    .max(40)
    .default(20)
    .describe("Reference temperature for thermal compensation during calibration, deg C"),
});

export type SetupProbe = z.infer<typeof setupProbeSchema>;

// ── 2. Bore Probe (10 params) ─────────────────────────────────────────────────

export const boreProbeSchema = z.object({
  bore_diameter_nominal: z
    .number()
    .min(1)
    .max(2000)
    .describe("Nominal bore diameter to measure, mm"),
  tolerance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Allowable deviation from nominal diameter, mm"),
  measure_depth: z
    .number()
    .min(0.1)
    .max(1000)
    .describe("Depth inside bore at which measurement is taken, mm"),
  angular_positions: z
    .number()
    .int()
    .min(2)
    .max(8)
    .describe("Number of angular positions for diameter measurement (min 2 for single axis, 4+ for roundness)"),
  auto_correct_wcs: z
    .boolean()
    .default(false)
    .describe("Automatically update WCS origin based on measured bore center"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .describe("Probing approach feed rate, mm/min"),
  retract_distance: z
    .number()
    .min(0.5)
    .max(50)
    .default(5)
    .describe("Retract distance after trigger, mm"),
  print_result: z
    .boolean()
    .default(true)
    .describe("Output measured result to program log / HMI display"),
  store_to_variable: z
    .number()
    .int()
    .min(0)
    .max(999)
    .optional()
    .describe("Macro variable number to store measured diameter"),
  multi_level: z
    .boolean()
    .default(false)
    .describe("Measure bore at multiple Z-levels for cylindricity check"),
});

export type BoreProbe = z.infer<typeof boreProbeSchema>;

// ── 3. Boss Probe (9 params) ──────────────────────────────────────────────────

export const bossProbeSchema = z.object({
  boss_diameter_nominal: z
    .number()
    .min(1)
    .max(2000)
    .describe("Nominal boss (external cylinder) diameter to measure, mm"),
  tolerance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Allowable deviation from nominal boss diameter, mm"),
  approach_clearance: z
    .number()
    .min(0.5)
    .max(50)
    .describe("Clearance distance for approach moves around the boss, mm"),
  auto_correct: z
    .boolean()
    .default(false)
    .describe("Automatically update WCS or tool offset based on measured boss center"),
  measure_height: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Height above part datum at which boss is measured, mm"),
  angular_positions: z
    .number()
    .int()
    .min(2)
    .max(8)
    .default(4)
    .describe("Number of angular measurement positions around the boss"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .describe("Probing approach feed rate, mm/min"),
  retract_distance: z
    .number()
    .min(0.5)
    .max(50)
    .default(5)
    .describe("Retract distance after trigger, mm"),
  protect_surface: z
    .boolean()
    .default(true)
    .describe("Use reduced approach speed near boss surface to avoid marking"),
});

export type BossProbe = z.infer<typeof bossProbeSchema>;

// ── 4. Web Probe (9 params) ──────────────────────────────────────────────────

export const webProbeSchema = z.object({
  web_width: z
    .number()
    .min(0.5)
    .max(1000)
    .describe("Nominal web (thin wall) width to measure, mm"),
  web_axis: z
    .enum(["x", "y"])
    .describe("Machine axis along which the web width is measured"),
  overshoot: z
    .number()
    .min(0)
    .max(20)
    .describe("Overshoot distance beyond expected web surface for probe approach, mm"),
  centering: z
    .boolean()
    .default(true)
    .describe("Auto-center the probe on the web midpoint after initial measurement"),
  tolerance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Allowable deviation from nominal web width, mm"),
  measure_height: z
    .number()
    .min(-500)
    .max(500)
    .describe("Z-height at which web is measured, mm"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .describe("Probing approach feed rate, mm/min"),
  retract_distance: z
    .number()
    .min(0.5)
    .max(50)
    .default(5)
    .describe("Retract distance after trigger, mm"),
  repeat_count: z
    .number()
    .int()
    .min(1)
    .max(10)
    .default(1)
    .describe("Number of repeat measurements for averaging"),
});

export type WebProbe = z.infer<typeof webProbeSchema>;

// ── 5. Surface Probe (10 params) ──────────────────────────────────────────────

export const surfaceProbeSchema = z.object({
  surface_z_nominal: z
    .number()
    .min(-5000)
    .max(5000)
    .describe("Expected Z-height of the surface being probed, mm"),
  tolerance: z
    .number()
    .min(0.001)
    .max(5)
    .describe("Allowable deviation from nominal Z-height, mm"),
  probe_direction: z
    .enum(["z_minus", "normal", "custom"])
    .describe("Probe approach direction: straight Z-minus, surface normal, or custom vector"),
  multi_point: z
    .boolean()
    .default(false)
    .describe("Enable multi-point surface measurement (grid pattern)"),
  grid_x: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(1)
    .describe("Number of grid points in X direction for multi-point measurement"),
  grid_y: z
    .number()
    .int()
    .min(1)
    .max(50)
    .default(1)
    .describe("Number of grid points in Y direction for multi-point measurement"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .describe("Probing approach feed rate, mm/min"),
  retract_distance: z
    .number()
    .min(0.5)
    .max(50)
    .default(5)
    .describe("Retract distance after trigger, mm"),
  auto_correct_wcs: z
    .boolean()
    .default(false)
    .describe("Automatically update WCS Z-origin based on measured surface"),
  best_fit: z
    .boolean()
    .default(false)
    .describe("Apply best-fit algorithm when multi-point is active (least-squares plane)"),
});

export type SurfaceProbe = z.infer<typeof surfaceProbeSchema>;

// ── 6. Tool Setter (9 params) ─────────────────────────────────────────────────

export const toolSetterSchema = z.object({
  tool_length_check: z
    .boolean()
    .default(true)
    .describe("Measure tool length and update tool offset"),
  tool_diameter_check: z
    .boolean()
    .default(false)
    .describe("Measure tool diameter (requires spinning measurement or laser setter)"),
  breakage_detection: z
    .boolean()
    .default(false)
    .describe("Enable simple breakage detection as part of tool setting cycle"),
  max_length_deviation: z
    .number()
    .min(0.001)
    .max(10)
    .describe("Maximum acceptable tool length deviation from expected value, mm"),
  setter_position: z
    .enum(["fixed", "spindle"])
    .describe("Tool setter type: fixed (table-mounted) or spindle-mounted"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .describe("Feed rate during tool setter approach, mm/min"),
  spindle_speed_for_diameter: z
    .number()
    .int()
    .min(0)
    .max(5000)
    .default(0)
    .describe("Spindle speed for diameter measurement (0 = non-spinning), rpm"),
  expected_length: z
    .number()
    .min(1)
    .max(500)
    .optional()
    .describe("Expected tool length for deviation check, mm"),
  update_offset_table: z
    .boolean()
    .default(true)
    .describe("Automatically update CNC tool offset table with measured values"),
});

export type ToolSetter = z.infer<typeof toolSetterSchema>;

// ── 7. Tool Breakage (8 params) ───────────────────────────────────────────────

export const toolBreakageSchema = z.object({
  check_method: z
    .enum(["contact", "non_contact", "laser"])
    .describe("Breakage detection method: contact probe, non-contact sensor, or laser"),
  threshold_length: z
    .number()
    .min(0.1)
    .max(500)
    .describe("Minimum acceptable tool length — shorter triggers breakage alarm, mm"),
  auto_replace: z
    .boolean()
    .default(false)
    .describe("Automatically load redundant tool from magazine on breakage detection"),
  alarm_on_break: z
    .boolean()
    .default(true)
    .describe("Trigger machine alarm (M00/M01) when breakage is detected"),
  redundant_tool_number: z
    .number()
    .int()
    .min(0)
    .max(999)
    .optional()
    .describe("Tool number of redundant replacement tool in magazine"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .describe("Feed rate for breakage detection approach move, mm/min"),
  check_interval: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .default(1)
    .describe("Check tool every N operations (1 = every operation)"),
  log_result: z
    .boolean()
    .default(true)
    .describe("Log breakage check result to tool life management system"),
});

export type ToolBreakage = z.infer<typeof toolBreakageSchema>;

// ── 8. In-Process Verify (9 params) ───────────────────────────────────────────

export const inProcessVerifySchema = z.object({
  feature_type: z
    .enum(["bore", "boss", "surface", "pocket"])
    .describe("Type of machined feature being verified in-process"),
  tolerance_class: z
    .enum(["h6", "h7", "H7", "H8", "js6", "custom"])
    .describe("ISO tolerance class for pass/fail determination"),
  compensate_on_fail: z
    .boolean()
    .default(false)
    .describe("Automatically apply tool offset compensation when measurement exceeds tolerance"),
  max_compensation: z
    .number()
    .min(0.001)
    .max(1)
    .describe("Maximum permitted automatic compensation per axis, mm"),
  nominal_dimension: z
    .number()
    .min(0.1)
    .max(5000)
    .describe("Nominal dimension of the feature being verified, mm"),
  approach_feed: z
    .number()
    .min(10)
    .max(5000)
    .describe("Probing approach feed rate, mm/min"),
  alarm_on_out_of_tolerance: z
    .boolean()
    .default(true)
    .describe("Trigger alarm if measurement is out of tolerance and compensation is not enabled"),
  retry_with_finish_pass: z
    .boolean()
    .default(false)
    .describe("Automatically retry with a finish pass if measurement is slightly out of tolerance"),
  store_measurement: z
    .boolean()
    .default(true)
    .describe("Store measurement result in SPC data collection variable"),
});

export type InProcessVerify = z.infer<typeof inProcessVerifySchema>;

// ── Schema Map ────────────────────────────────────────────────────────────────

/** All 8 probing cycle schemas keyed by cycle type */
export const PROBING_SCHEMA_MAP = {
  setup_probe: setupProbeSchema,
  bore_probe: boreProbeSchema,
  boss_probe: bossProbeSchema,
  web_probe: webProbeSchema,
  surface_probe: surfaceProbeSchema,
  tool_setter: toolSetterSchema,
  tool_breakage: toolBreakageSchema,
  in_process_verify: inProcessVerifySchema,
} as const;

export type ProbingCycleType = keyof typeof PROBING_SCHEMA_MAP;

// ── Metadata ──────────────────────────────────────────────────────────────────

/** Metadata record for every probing cycle type */
export interface ProbingMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each probing cycle type with AC Python setter references */
export const PROBING_METADATA: Record<ProbingCycleType, ProbingMeta> = {
  setup_probe: {
    paramCount: Object.keys(setupProbeSchema.shape).length,
    acPythonSetter: "hm.probe.setup_probe",
    description: "Probe setup and calibration cycle with sphere qualification",
    dfmCriticalParams: ["approach_feed"],
  },
  bore_probe: {
    paramCount: Object.keys(boreProbeSchema.shape).length,
    acPythonSetter: "hm.probe.bore_probe",
    description: "Internal bore diameter measurement with multi-point and WCS correction",
  },
  boss_probe: {
    paramCount: Object.keys(bossProbeSchema.shape).length,
    acPythonSetter: "hm.probe.boss_probe",
    description: "External boss diameter measurement with auto-center correction",
  },
  web_probe: {
    paramCount: Object.keys(webProbeSchema.shape).length,
    acPythonSetter: "hm.probe.web_probe",
    description: "Thin wall web width measurement with centering and axis selection",
  },
  surface_probe: {
    paramCount: Object.keys(surfaceProbeSchema.shape).length,
    acPythonSetter: "hm.probe.surface_probe",
    description: "Surface Z-height measurement with optional multi-point grid and best-fit",
  },
  tool_setter: {
    paramCount: Object.keys(toolSetterSchema.shape).length,
    acPythonSetter: "hm.probe.tool_setter",
    description: "Tool length and diameter measurement with automatic offset update",
  },
  tool_breakage: {
    paramCount: Object.keys(toolBreakageSchema.shape).length,
    acPythonSetter: "hm.probe.tool_breakage",
    description: "Tool breakage detection with auto-replace and alarm support",
  },
  in_process_verify: {
    paramCount: Object.keys(inProcessVerifySchema.shape).length,
    acPythonSetter: "hm.probe.in_process_verify",
    description: "In-process feature verification with ISO tolerance class and auto-compensation",
  },
};

// ── Computed Totals ───────────────────────────────────────────────────────────

/** Total parameter count across all 8 probing cycle schemas */
export const PROBING_TOTAL_PARAM_COUNT = Object.values(PROBING_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
