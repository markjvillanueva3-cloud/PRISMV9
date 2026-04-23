/**
 * Simulation Extended Parameter Schemas — hyperMILL Simulation
 *
 * U-HKC33: Zod schemas for 12 simulation-extended types covering
 * cycle time estimation, NC verification, nightSHIFT batch,
 * and report configuration.
 *
 * AC Python call pattern:
 *   hm.simulation.per_operation_time(include_approach=True, ...)
 *
 * @domain Simulation-Extended
 * @milestone HM-KC-MS6/U-HKC33
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Cycle Time Estimation (3 types, 25 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1a. Per-Operation Time (8 params) ────────────────────────────────────────

export const perOperationTimeSchema = z.object({
  include_approach: z
    .boolean()
    .describe("Include approach moves in cycle time calculation"),
  include_retract: z
    .boolean()
    .describe("Include retract moves in cycle time calculation"),
  include_linking: z
    .boolean()
    .describe("Include linking moves between passes in cycle time"),
  rapid_override_pct: z
    .number()
    .min(1)
    .max(100)
    .default(100)
    .describe("Rapid traverse override percentage, %"),
  feed_override_pct: z
    .number()
    .min(1)
    .max(200)
    .default(100)
    .describe("Cutting feed override percentage, %"),
  acceleration_model: z
    .enum(["none", "trapezoidal", "s_curve"])
    .describe("Machine acceleration model for realistic time estimation"),
  machine_time_factor: z
    .number()
    .min(0.5)
    .max(2.0)
    .default(1.0)
    .describe("Correction factor for machine-specific cycle time adjustment"),
  display_breakdown: z
    .boolean()
    .describe("Display per-move type time breakdown in results"),
});

export type PerOperationTime = z.infer<typeof perOperationTimeSchema>;

// ── 1b. Total Job Time (9 params) ────────────────────────────────────────────

export const totalJobTimeSchema = z.object({
  include_tool_changes: z
    .boolean()
    .describe("Include tool change time in total job time calculation"),
  tool_change_time_sec: z
    .number()
    .min(1)
    .max(120)
    .default(8)
    .describe("Average tool change duration, seconds"),
  include_probing: z
    .boolean()
    .describe("Include probing cycle time in total estimate"),
  include_pallet_change: z
    .boolean()
    .describe("Include pallet change time in total estimate"),
  pallet_change_time_sec: z
    .number()
    .describe("Average pallet change duration, seconds"),
  include_warmup: z
    .boolean()
    .describe("Include machine warmup time in total estimate"),
  warmup_time_min: z
    .number()
    .min(0)
    .max(30)
    .describe("Machine warmup duration, minutes"),
  shift_factor: z
    .number()
    .min(0.5)
    .max(1.0)
    .default(0.85)
    .describe("Shift efficiency factor accounting for operator breaks, setup, etc."),
  display_gantt: z
    .boolean()
    .describe("Display Gantt chart visualization of job timeline"),
});

export type TotalJobTime = z.infer<typeof totalJobTimeSchema>;

// ── 1c. Time Comparison (8 params) ───────────────────────────────────────────

export const timeComparisonSchema = z.object({
  compare_to_previous: z
    .boolean()
    .describe("Compare current cycle time to previous revision"),
  compare_to_baseline: z
    .boolean()
    .describe("Compare current cycle time to stored baseline"),
  baseline_source: z
    .string()
    .optional()
    .describe("Path or identifier for baseline cycle time data source"),
  show_delta_pct: z
    .boolean()
    .describe("Show percentage delta between compared cycle times"),
  optimize_suggestions: z
    .boolean()
    .describe("Generate optimization suggestions to reduce cycle time"),
  target_cycle_time_min: z
    .number()
    .describe("Target cycle time for alarm and optimization, minutes"),
  alarm_if_exceeded: z
    .boolean()
    .describe("Raise alarm if cycle time exceeds target"),
  report_format: z
    .enum(["summary", "detailed", "csv"])
    .describe("Output format for time comparison report"),
});

export type TimeComparison = z.infer<typeof timeComparisonSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. NC Verification (4 types, 35 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 2a. Code Replay (10 params) ──────────────────────────────────────────────

export const codeReplaySchema = z.object({
  replay_mode: z
    .enum(["continuous", "single_block", "skip_rapid"])
    .describe("NC code replay execution mode"),
  start_line: z
    .number()
    .int()
    .describe("Starting line number for replay"),
  end_line: z
    .number()
    .int()
    .describe("Ending line number for replay"),
  feed_override: z
    .number()
    .min(1)
    .max(200)
    .describe("Feed rate override during replay, %"),
  speed_override: z
    .number()
    .min(50)
    .max(150)
    .describe("Spindle speed override during replay, %"),
  display_tool_path: z
    .boolean()
    .describe("Display tool path visualization during replay"),
  display_machine_motion: z
    .boolean()
    .describe("Display full machine motion kinematics during replay"),
  pause_at_tool_change: z
    .boolean()
    .describe("Pause replay at each tool change for review"),
  record_deviation: z
    .boolean()
    .describe("Record deviation between programmed and simulated path"),
  max_line_count: z
    .number()
    .int()
    .min(1)
    .max(1000000)
    .describe("Maximum number of NC lines to process in replay"),
});

export type CodeReplay = z.infer<typeof codeReplaySchema>;

// ── 2b. Block-by-Block (8 params) ────────────────────────────────────────────

export const blockByBlockSchema = z.object({
  step_forward: z
    .boolean()
    .describe("Enable step-forward capability in block-by-block mode"),
  step_backward: z
    .boolean()
    .describe("Enable step-backward capability in block-by-block mode"),
  current_block: z
    .number()
    .int()
    .describe("Current block number being inspected"),
  display_gcode: z
    .boolean()
    .describe("Display raw G-code text for current block"),
  display_xyz: z
    .boolean()
    .describe("Display XYZ coordinate position for current block"),
  display_abc: z
    .boolean()
    .describe("Display ABC rotary axis position for current block"),
  display_feed: z
    .boolean()
    .describe("Display active feed rate for current block"),
  display_speed: z
    .boolean()
    .describe("Display active spindle speed for current block"),
});

export type BlockByBlock = z.infer<typeof blockByBlockSchema>;

// ── 2c. Spindle Load (9 params) ──────────────────────────────────────────────

export const spindleLoadSchema = z.object({
  compute_load: z
    .boolean()
    .describe("Enable spindle load computation during simulation"),
  load_model: z
    .enum(["kienzle", "empirical", "measured"])
    .describe("Spindle load calculation model (DFM)"),
  max_load_pct: z
    .number()
    .describe("Maximum allowable spindle load percentage (DFM)"),
  alarm_threshold_pct: z
    .number()
    .describe("Spindle load alarm threshold percentage"),
  display_chart: z
    .boolean()
    .describe("Display spindle load chart during simulation"),
  sample_interval_ms: z
    .number()
    .int()
    .min(1)
    .max(1000)
    .describe("Spindle load sampling interval, milliseconds"),
  average_window: z
    .number()
    .int()
    .describe("Moving average window size for load smoothing, samples"),
  peak_detection: z
    .boolean()
    .describe("Enable peak load detection and flagging"),
  export_load_data: z
    .boolean()
    .describe("Export spindle load data to external file for analysis"),
});

export type SpindleLoad = z.infer<typeof spindleLoadSchema>;

// ── 2d. Feed/Speed Verify (8 params) ─────────────────────────────────────────

export const feedSpeedVerifySchema = z.object({
  verify_spindle_range: z
    .boolean()
    .describe("Verify spindle speed is within machine spindle range (DFM)"),
  verify_feed_range: z
    .boolean()
    .describe("Verify feed rate is within machine axis feed range (DFM)"),
  verify_rapid_limit: z
    .boolean()
    .describe("Verify rapid traverse does not exceed machine limit"),
  verify_programmed_vs_actual: z
    .boolean()
    .describe("Compare programmed vs actual achievable feed/speed values"),
  tolerance_pct: z
    .number()
    .describe("Acceptable tolerance between programmed and actual values, %"),
  flag_zero_feed: z
    .boolean()
    .describe("Flag zero feed rate blocks as DFM-CRITICAL safety hazard"),
  flag_excessive_speed: z
    .boolean()
    .describe("Flag excessive spindle speed beyond tool rating"),
  report_violations: z
    .boolean()
    .describe("Generate report of all feed/speed violations found"),
});

export type FeedSpeedVerify = z.infer<typeof feedSpeedVerifySchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. nightSHIFT Batch (3 types, 22 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 3a. Batch Calculate (8 params) ───────────────────────────────────────────

export const batchCalculateSchema = z.object({
  operations: z
    .enum(["all", "selected", "modified"])
    .describe("Scope of operations to include in batch calculation"),
  max_parallel: z
    .number()
    .int()
    .min(1)
    .max(16)
    .default(4)
    .describe("Maximum parallel calculation threads"),
  priority: z
    .enum(["low", "normal", "high", "critical"])
    .describe("Batch job priority in nightSHIFT queue"),
  notification_email: z
    .string()
    .optional()
    .describe("Email address for batch completion notification"),
  notification_on_error: z
    .boolean()
    .default(true)
    .describe("Send email notification on batch calculation error"),
  timeout_hours: z
    .number()
    .min(1)
    .max(72)
    .default(8)
    .describe("Maximum batch calculation duration before timeout, hours"),
  retry_on_failure: z
    .boolean()
    .default(true)
    .describe("Retry failed operations automatically"),
  log_level: z
    .enum(["error", "warn", "info", "debug"])
    .describe("Logging verbosity for batch calculation"),
});

export type BatchCalculate = z.infer<typeof batchCalculateSchema>;

// ── 3b. Batch Simulate (8 params) ────────────────────────────────────────────

export const batchSimulateSchema = z.object({
  simulation_type: z
    .enum(["full", "quick", "collision_only"])
    .describe("Type of simulation to run in batch mode"),
  include_stock_verify: z
    .boolean()
    .default(true)
    .describe("Include stock model verification in batch simulation"),
  abort_on_collision: z
    .boolean()
    .default(true)
    .describe("Abort batch simulation on first collision detection"),
  save_animation: z
    .boolean()
    .default(false)
    .describe("Save simulation animation to file"),
  animation_format: z
    .enum(["mp4", "avi", "gif"])
    .describe("Output format for saved animation"),
  report_per_operation: z
    .boolean()
    .describe("Generate individual simulation report per operation"),
  aggregate_report: z
    .boolean()
    .describe("Generate aggregate simulation report for entire batch"),
  compress_results: z
    .boolean()
    .describe("Compress simulation results for storage"),
});

export type BatchSimulate = z.infer<typeof batchSimulateSchema>;

// ── 3c. Batch Post (6 params) ────────────────────────────────────────────────

export const batchPostSchema = z.object({
  post_all: z
    .boolean()
    .describe("Post-process all operations in the job"),
  selected_operations: z
    .array(z.string())
    .describe("List of operation IDs to post-process when post_all is false"),
  output_folder: z
    .string()
    .describe("Output folder path for generated NC files"),
  overwrite_existing: z
    .boolean()
    .default(false)
    .describe("Overwrite existing NC files in output folder"),
  verify_after_post: z
    .boolean()
    .default(true)
    .describe("Run NC verification after post-processing"),
  deliver_to_dnc: z
    .boolean()
    .default(false)
    .describe("Deliver generated NC files to DNC server automatically"),
});

export type BatchPost = z.infer<typeof batchPostSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. Report Config (2 types, 15 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 4a. Collision Report (8 params) ──────────────────────────────────────────

export const collisionReportSchema = z.object({
  detail_level: z
    .enum(["summary", "detailed", "per_block"])
    .describe("Level of detail in collision report"),
  include_screenshots: z
    .boolean()
    .describe("Include screenshots of collision locations in report"),
  screenshot_resolution: z
    .enum(["low", "medium", "high"])
    .describe("Resolution of collision screenshots"),
  export_format: z
    .enum(["pdf", "html", "csv"])
    .describe("Output format for collision report"),
  include_tool_info: z
    .boolean()
    .describe("Include tool information at collision point"),
  include_coordinates: z
    .boolean()
    .describe("Include XYZ coordinates of collision location"),
  color_severity: z
    .boolean()
    .describe("Color-code collision severity levels in report"),
  auto_open: z
    .boolean()
    .describe("Automatically open generated collision report"),
});

export type CollisionReport = z.infer<typeof collisionReportSchema>;

// ── 4b. Cycle Time Report (7 params) ─────────────────────────────────────────

export const cycleTimeReportSchema = z.object({
  include_per_operation: z
    .boolean()
    .describe("Include per-operation cycle time breakdown in report"),
  include_total: z
    .boolean()
    .describe("Include total cycle time summary in report"),
  include_comparison: z
    .boolean()
    .describe("Include comparison with previous or baseline cycle times"),
  chart_type: z
    .enum(["bar", "pie", "gantt"])
    .describe("Chart type for cycle time visualization"),
  export_format: z
    .enum(["pdf", "html", "csv", "xlsx"])
    .describe("Output format for cycle time report"),
  include_optimization_tips: z
    .boolean()
    .describe("Include optimization suggestions in report"),
  auto_open: z
    .boolean()
    .describe("Automatically open generated cycle time report"),
});

export type CycleTimeReport = z.infer<typeof cycleTimeReportSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Schema Map
// ═══════════════════════════════════════════════════════════════════════════════

/** All 12 simulation-extended schemas keyed by type */
export const SIMULATION_EXTENDED_SCHEMA_MAP = {
  per_operation_time: perOperationTimeSchema,
  total_job_time: totalJobTimeSchema,
  time_comparison: timeComparisonSchema,
  code_replay: codeReplaySchema,
  block_by_block: blockByBlockSchema,
  spindle_load: spindleLoadSchema,
  feed_speed_verify: feedSpeedVerifySchema,
  batch_calculate: batchCalculateSchema,
  batch_simulate: batchSimulateSchema,
  batch_post: batchPostSchema,
  collision_report: collisionReportSchema,
  cycle_time_report: cycleTimeReportSchema,
} as const;

export type SimulationExtendedType = keyof typeof SIMULATION_EXTENDED_SCHEMA_MAP;

// ═══════════════════════════════════════════════════════════════════════════════
// Metadata
// ═══════════════════════════════════════════════════════════════════════════════

/** Metadata record for every simulation-extended type */
export interface SimulationExtendedMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each simulation-extended type with AC Python setter references */
export const SIMULATION_EXTENDED_METADATA: Record<SimulationExtendedType, SimulationExtendedMeta> = {
  per_operation_time: {
    paramCount: 8,
    acPythonSetter: "hm.simulation.per_operation_time",
    description: "Per-operation cycle time estimation with approach, retract, and linking breakdown",
  },
  total_job_time: {
    paramCount: 9,
    acPythonSetter: "hm.simulation.total_job_time",
    description: "Total job time estimation including tool changes, probing, pallet changes, and warmup",
  },
  time_comparison: {
    paramCount: 8,
    acPythonSetter: "hm.simulation.time_comparison",
    description: "Cycle time comparison against previous revisions or stored baselines",
  },
  code_replay: {
    paramCount: 10,
    acPythonSetter: "hm.simulation.code_replay",
    description: "NC code replay simulation with continuous, single-block, or skip-rapid modes",
  },
  block_by_block: {
    paramCount: 8,
    acPythonSetter: "hm.simulation.block_by_block",
    description: "Block-by-block NC code inspection with coordinate and G-code display",
  },
  spindle_load: {
    paramCount: 9,
    acPythonSetter: "hm.simulation.spindle_load",
    description: "Spindle load computation using Kienzle, empirical, or measured models",
    dfmCriticalParams: ["max_load_pct", "load_model"],
  },
  feed_speed_verify: {
    paramCount: 8,
    acPythonSetter: "hm.simulation.feed_speed_verify",
    description: "Feed rate and spindle speed verification against machine limits",
    dfmCriticalParams: ["verify_spindle_range", "verify_feed_range", "flag_zero_feed"],
  },
  batch_calculate: {
    paramCount: 8,
    acPythonSetter: "hm.simulation.batch_calculate",
    description: "nightSHIFT batch calculation with parallel processing and notifications",
  },
  batch_simulate: {
    paramCount: 8,
    acPythonSetter: "hm.simulation.batch_simulate",
    description: "nightSHIFT batch simulation with collision detection and stock verification",
  },
  batch_post: {
    paramCount: 6,
    acPythonSetter: "hm.simulation.batch_post",
    description: "nightSHIFT batch post-processing with DNC delivery option",
  },
  collision_report: {
    paramCount: 8,
    acPythonSetter: "hm.simulation.collision_report",
    description: "Collision detection report with screenshots, coordinates, and severity levels",
  },
  cycle_time_report: {
    paramCount: 7,
    acPythonSetter: "hm.simulation.cycle_time_report",
    description: "Cycle time report with per-operation breakdown and optimization tips",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Computed Totals
// ═══════════════════════════════════════════════════════════════════════════════

/** Total parameter count across all 12 simulation-extended schemas */
export const SIMULATION_EXTENDED_TOTAL_PARAM_COUNT = Object.values(
  SIMULATION_EXTENDED_METADATA,
).reduce((sum, meta) => sum + meta.paramCount, 0);
