/**
 * NC Output Parameter Schemas — hyperMILL NC
 *
 * U-HKC34: Zod schemas for 15 NC output types covering
 * calculation options, post-processor configuration, PPP enhancement,
 * and NC file generation/verification.
 *
 * AC Python call pattern:
 *   hm.nc.single_calculate(operation_id="OP001", recalculate=False, ...)
 *
 * @domain NC-Output
 * @milestone HM-KC-MS6/U-HKC34
 */

import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════════════
// 1. Calculation Options (4 types, 30 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1a. Single Calculate (7 params) ──────────────────────────────────────────

export const singleCalculateSchema = z.object({
  operation_id: z
    .string()
    .describe("Unique identifier of the operation to calculate"),
  recalculate: z
    .boolean()
    .default(false)
    .describe("Force recalculation even if results are cached"),
  use_cached: z
    .boolean()
    .default(true)
    .describe("Use cached calculation results if available"),
  tolerance_override: z
    .number()
    .optional()
    .describe("Override default machining tolerance, mm"),
  update_stock: z
    .boolean()
    .default(true)
    .describe("Update stock model after calculation completes"),
  log_calculation: z
    .boolean()
    .describe("Log calculation details for debugging and audit"),
  compute_cycle_time: z
    .boolean()
    .default(true)
    .describe("Compute estimated cycle time during calculation"),
});

export type SingleCalculate = z.infer<typeof singleCalculateSchema>;

// ── 1b. Calculate All (7 params) ─────────────────────────────────────────────

export const calculateAllSchema = z.object({
  scope: z
    .enum(["all", "modified", "errors_only"])
    .describe("Scope of operations to calculate"),
  sequential: z
    .boolean()
    .default(false)
    .describe("Calculate operations sequentially instead of in parallel"),
  max_parallel: z
    .number()
    .int()
    .describe("Maximum number of parallel calculation threads"),
  skip_calculated: z
    .boolean()
    .default(true)
    .describe("Skip operations that already have valid calculation results"),
  force_recalculate: z
    .boolean()
    .describe("Force recalculation of all operations regardless of cache"),
  update_stock_model: z
    .boolean()
    .describe("Update intermediate stock models between operations"),
  abort_on_error: z
    .boolean()
    .default(false)
    .describe("Abort entire batch if any single calculation fails"),
});

export type CalculateAll = z.infer<typeof calculateAllSchema>;

// ── 1c. Calculate Selected (8 params) ────────────────────────────────────────

export const calculateSelectedSchema = z.object({
  operation_ids: z
    .array(z.string())
    .describe("Array of operation IDs to calculate"),
  dependency_check: z
    .boolean()
    .default(true)
    .describe("Check operation dependencies before calculating"),
  include_dependencies: z
    .boolean()
    .default(true)
    .describe("Automatically include dependent operations in calculation"),
  recalculate_dependents: z
    .boolean()
    .default(false)
    .describe("Recalculate downstream dependent operations"),
  batch_mode: z
    .boolean()
    .describe("Use batch calculation mode for selected operations"),
  notification: z
    .boolean()
    .describe("Send notification when calculation completes"),
  priority: z
    .enum(["normal", "high"])
    .describe("Calculation priority in processing queue"),
  timeout_min: z
    .number()
    .describe("Maximum calculation duration before timeout, minutes"),
});

export type CalculateSelected = z.infer<typeof calculateSelectedSchema>;

// ── 1d. Calculate With Options (8 params) ────────────────────────────────────

export const calculateWithOptionsSchema = z.object({
  tolerance_factor: z
    .number()
    .min(0.1)
    .max(10)
    .default(1.0)
    .describe("Tolerance scaling factor relative to default"),
  quality_mode: z
    .enum(["draft", "normal", "high", "ultra"])
    .describe("Calculation quality mode affecting resolution and accuracy"),
  use_gpu: z
    .boolean()
    .default(false)
    .describe("Use GPU acceleration for supported calculations"),
  memory_limit_mb: z
    .number()
    .int()
    .describe("Maximum memory allocation for calculation, MB"),
  thread_count: z
    .number()
    .int()
    .min(1)
    .max(32)
    .describe("Number of CPU threads to use for calculation"),
  profile_performance: z
    .boolean()
    .describe("Profile calculation performance for optimization analysis"),
  cache_strategy: z
    .enum(["none", "aggressive", "smart"])
    .describe("Caching strategy for intermediate calculation results"),
  incremental: z
    .boolean()
    .default(true)
    .describe("Use incremental calculation updating only changed regions"),
});

export type CalculateWithOptions = z.infer<typeof calculateWithOptionsSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 2. Post-Processor (4 types, 45 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 2a. Select Post (10 params) ──────────────────────────────────────────────

export const selectPostSchema = z.object({
  post_name: z
    .string()
    .describe("Name of the post-processor to select"),
  controller_type: z
    .enum([
      "fanuc", "siemens", "haas", "mazak", "okuma",
      "heidenhain", "mitsubishi", "brother", "doosan", "generic",
    ])
    .describe("Target CNC controller type"),
  dialect: z
    .string()
    .optional()
    .describe("Controller-specific dialect or sub-variant"),
  version: z
    .string()
    .describe("Post-processor version string"),
  verify_compatibility: z
    .boolean()
    .default(true)
    .describe("Verify post-processor compatibility with current machine model"),
  machine_match: z
    .boolean()
    .describe("Validate post matches the assigned machine kinematic model"),
  alternative_posts: z
    .array(z.string())
    .describe("List of alternative post-processor names for fallback"),
  preview_output: z
    .boolean()
    .describe("Preview NC output before committing to generation"),
  line_numbering: z
    .boolean()
    .default(true)
    .describe("Enable N-word line numbering in NC output"),
  line_increment: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Line number increment between NC blocks"),
});

export type SelectPost = z.infer<typeof selectPostSchema>;

// ── 2b. Configure Post (12 params) ──────────────────────────────────────────

export const configurePostSchema = z.object({
  units: z
    .enum(["metric", "inch"])
    .describe("NC output unit system"),
  decimal_places: z
    .number()
    .int()
    .min(1)
    .max(8)
    .default(4)
    .describe("Number of decimal places for coordinate output"),
  modal_gcode: z
    .boolean()
    .default(true)
    .describe("Use modal G-codes (omit repeated G-codes on consecutive lines)"),
  block_delete: z
    .boolean()
    .default(false)
    .describe("Enable block delete (/) prefix on optional blocks"),
  optional_stop: z
    .boolean()
    .default(false)
    .describe("Insert M01 optional stop between operations"),
  sub_program_style: z
    .enum(["inline", "external", "macro"])
    .describe("Sub-program output style for repeated geometry"),
  coordinate_output: z
    .enum(["absolute", "incremental", "mixed"])
    .describe("Coordinate output mode (G90/G91)"),
  arc_output: z
    .enum(["ijk", "r", "auto"])
    .describe("Arc interpolation output format (IJK center or R radius)"),
  safe_start_block: z
    .boolean()
    .describe("Include safety start block at program beginning (DFM-CRITICAL)"),
  safe_start_content: z
    .string()
    .describe("Content of the safety start block (G-codes for safe initial state)"),
  tool_call_format: z
    .enum(["t_m06", "t_only", "macro"])
    .describe("Tool call output format in NC program"),
  coolant_codes: z
    .string()
    .describe("Custom coolant M-code mapping string"),
});

export type ConfigurePost = z.infer<typeof configurePostSchema>;

// ── 2c. Generate NC (12 params) ──────────────────────────────────────────────

export const generateNCSchema = z.object({
  output_path: z
    .string()
    .describe("Output directory path for generated NC files"),
  file_extension: z
    .string()
    .default(".nc")
    .describe("File extension for generated NC files"),
  file_naming: z
    .enum(["operation", "sequential", "custom"])
    .describe("File naming convention for generated NC files"),
  custom_name_pattern: z
    .string()
    .optional()
    .describe("Custom file naming pattern when file_naming is 'custom'"),
  header_comment: z
    .boolean()
    .default(true)
    .describe("Include program header comment block with job info"),
  include_program_number: z
    .boolean()
    .describe("Include O-word program number in NC output"),
  program_number: z
    .number()
    .int()
    .optional()
    .describe("Program number (O-word) for NC output"),
  append_checksum: z
    .boolean()
    .default(false)
    .describe("Append checksum to end of NC file for integrity verification"),
  split_by_tool: z
    .boolean()
    .default(false)
    .describe("Split NC output into separate files per tool"),
  max_file_size_mb: z
    .number()
    .describe("Maximum NC file size before splitting, MB"),
  encoding: z
    .enum(["ascii", "utf8"])
    .describe("Character encoding for NC output file"),
  line_ending: z
    .enum(["crlf", "lf"])
    .describe("Line ending style for NC output file"),
});

export type GenerateNC = z.infer<typeof generateNCSchema>;

// ── 2d. Verify NC (11 params) ────────────────────────────────────────────────

export const verifyNCSchema = z.object({
  syntax_check: z
    .boolean()
    .default(true)
    .describe("Perform G-code syntax validation"),
  gcode_standard: z
    .enum(["iso6983", "eia_rs274", "custom"])
    .describe("G-code standard for syntax validation"),
  check_unreachable_blocks: z
    .boolean()
    .describe("Check for unreachable code blocks after M30/M02"),
  check_missing_feeds: z
    .boolean()
    .describe("Check for missing feed rate declarations (DFM)"),
  check_missing_speeds: z
    .boolean()
    .describe("Check for missing spindle speed declarations (DFM)"),
  check_tool_references: z
    .boolean()
    .describe("Verify all tool references match available tools in magazine"),
  simulate_after_post: z
    .boolean()
    .default(false)
    .describe("Run full simulation after post-processing for verification"),
  compare_to_source: z
    .boolean()
    .describe("Compare NC output back to source toolpath for deviation"),
  deviation_tolerance: z
    .number()
    .describe("Maximum allowable deviation between source and NC, mm"),
  report_warnings: z
    .boolean()
    .default(true)
    .describe("Include warnings in verification report"),
  report_errors: z
    .boolean()
    .default(true)
    .describe("Include errors in verification report"),
});

export type VerifyNC = z.infer<typeof verifyNCSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 3. PPP Enhancement (3 types, 30 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 3a. Per-Block S/F (10 params) ────────────────────────────────────────────

export const perBlockSFSchema = z.object({
  enable_variable_sf: z
    .boolean()
    .default(false)
    .describe("Enable per-block variable speed/feed optimization"),
  optimization_mode: z
    .enum(["conservative", "balanced", "aggressive"])
    .describe("Speed/feed optimization aggressiveness level"),
  max_speed_increase_pct: z
    .number()
    .min(0)
    .max(50)
    .describe("Maximum spindle speed increase from nominal, %"),
  max_feed_increase_pct: z
    .number()
    .min(0)
    .max(100)
    .describe("Maximum feed rate increase from nominal, %"),
  min_speed_decrease_pct: z
    .number()
    .describe("Minimum spindle speed decrease from nominal, %"),
  physics_model: z
    .enum(["kienzle", "empirical", "hybrid"])
    .describe("Physics model for cutting force prediction"),
  surface_finish_priority: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("Surface finish quality priority weight (0=ignore, 1=maximum)"),
  tool_life_priority: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("Tool life preservation priority weight (0=ignore, 1=maximum)"),
  mrr_priority: z
    .number()
    .min(0)
    .max(1)
    .default(0.5)
    .describe("Material removal rate priority weight (0=ignore, 1=maximum)"),
  smooth_transitions: z
    .boolean()
    .default(true)
    .describe("Smooth speed/feed transitions between adjacent blocks"),
});

export type PerBlockSF = z.infer<typeof perBlockSFSchema>;

// ── 3b. Thermal Compensation (10 params) ─────────────────────────────────────

export const thermalCompensationSchema = z.object({
  enable_thermal_comp: z
    .boolean()
    .default(false)
    .describe("Enable thermal expansion compensation in NC output"),
  temperature_model: z
    .enum(["analytical", "fem", "empirical"])
    .describe("Thermal deformation prediction model"),
  expansion_coefficient: z
    .number()
    .describe("Material linear thermal expansion coefficient, 1/deg C"),
  reference_temperature: z
    .number()
    .default(20)
    .describe("Reference temperature for zero thermal expansion, deg C"),
  max_compensation_um: z
    .number()
    .min(0)
    .max(100)
    .describe("Maximum thermal compensation magnitude, micrometers"),
  compensation_axis: z
    .enum(["z_only", "xyz", "custom"])
    .describe("Axes to apply thermal compensation"),
  update_interval_blocks: z
    .number()
    .int()
    .describe("Number of NC blocks between thermal compensation updates"),
  material_thermal_model: z
    .enum(["steel", "aluminum", "titanium", "generic"])
    .describe("Material-specific thermal behavior model"),
  ambient_tracking: z
    .boolean()
    .describe("Track ambient temperature changes during machining"),
  coolant_temperature_factor: z
    .number()
    .describe("Coolant temperature influence factor on thermal compensation"),
});

export type ThermalCompensation = z.infer<typeof thermalCompensationSchema>;

// ── 3c. Chatter Avoidance (10 params) ────────────────────────────────────────

export const chatterAvoidanceSchema = z.object({
  enable_sld_check: z
    .boolean()
    .default(false)
    .describe("Enable stability lobe diagram check for chatter avoidance"),
  sld_source: z
    .enum(["computed", "measured", "database"])
    .describe("Source for stability lobe diagram data"),
  spindle_speed_shift_pct: z
    .number()
    .min(0)
    .max(20)
    .describe("Maximum spindle speed shift to find stable lobe, %"),
  preferred_lobe: z
    .number()
    .int()
    .min(1)
    .max(10)
    .describe("Preferred stability lobe number for speed selection"),
  avoid_critical_speeds: z
    .boolean()
    .describe("Avoid critical resonant spindle speeds"),
  critical_speed_margin_pct: z
    .number()
    .describe("Safety margin around critical speeds, %"),
  depth_limit_from_sld: z
    .boolean()
    .describe("Limit axial depth of cut based on SLD stable boundary"),
  stability_margin: z
    .number()
    .min(0)
    .max(1)
    .default(0.2)
    .describe("Safety margin below SLD stable boundary (0=at boundary, 1=very conservative)"),
  update_on_tool_change: z
    .boolean()
    .default(true)
    .describe("Recompute SLD when tool changes (different dynamics)"),
  report_instability: z
    .boolean()
    .describe("Report detected instability zones in NC output log"),
});

export type ChatterAvoidance = z.infer<typeof chatterAvoidanceSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 4. NC File Management (2 types, 20 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 4a. NC Archive (10 params) ───────────────────────────────────────────────

export const ncArchiveSchema = z.object({
  archive_path: z
    .string()
    .describe("Archive directory path for NC file storage"),
  revision_control: z
    .boolean()
    .default(true)
    .describe("Enable revision tracking for archived NC files"),
  max_revisions: z
    .number()
    .int()
    .min(1)
    .max(100)
    .default(10)
    .describe("Maximum number of revisions to retain per NC file"),
  compress_archive: z
    .boolean()
    .default(true)
    .describe("Compress archived NC files to save storage"),
  compression_format: z
    .enum(["zip", "gzip", "lz4"])
    .describe("Compression format for archived NC files"),
  include_setup_sheet: z
    .boolean()
    .default(true)
    .describe("Include setup sheet alongside archived NC file"),
  include_tool_list: z
    .boolean()
    .default(true)
    .describe("Include tool list alongside archived NC file"),
  timestamp_format: z
    .enum(["iso8601", "unix", "custom"])
    .describe("Timestamp format for archive file naming"),
  retention_days: z
    .number()
    .int()
    .min(1)
    .max(3650)
    .default(365)
    .describe("Archive retention period before auto-purge, days"),
  dnc_sync: z
    .boolean()
    .default(false)
    .describe("Sync archived files to DNC server automatically"),
});

export type NCArchive = z.infer<typeof ncArchiveSchema>;

// ── 4b. NC Transfer (10 params) ──────────────────────────────────────────────

export const ncTransferSchema = z.object({
  transfer_protocol: z
    .enum(["ftp", "sftp", "smb", "serial", "usb"])
    .describe("File transfer protocol to CNC machine"),
  host: z
    .string()
    .describe("Target host address for network transfer"),
  port: z
    .number()
    .int()
    .min(1)
    .max(65535)
    .optional()
    .describe("Network port for file transfer"),
  remote_path: z
    .string()
    .describe("Remote directory path on CNC controller"),
  verify_transfer: z
    .boolean()
    .default(true)
    .describe("Verify file integrity after transfer completes"),
  auto_transfer: z
    .boolean()
    .default(false)
    .describe("Automatically transfer NC file after post-processing"),
  overwrite_remote: z
    .boolean()
    .default(false)
    .describe("Overwrite existing file on remote CNC controller"),
  serial_baud_rate: z
    .number()
    .int()
    .optional()
    .describe("Serial port baud rate for RS-232 transfer"),
  serial_parity: z
    .enum(["none", "even", "odd"])
    .optional()
    .describe("Serial port parity setting"),
  transfer_timeout_sec: z
    .number()
    .min(5)
    .max(3600)
    .default(120)
    .describe("Maximum transfer duration before timeout, seconds"),
});

export type NCTransfer = z.infer<typeof ncTransferSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// 5. Post Config (2 types, 20 params)
// ═══════════════════════════════════════════════════════════════════════════════

// ── 5a. Machine Kinematics Config (10 params) ────────────────────────────────

export const machineKinematicsConfigSchema = z.object({
  kinematic_model: z
    .enum(["3axis", "4axis_rotary", "5axis_trunnion", "5axis_swivel", "5axis_nutator", "mill_turn"])
    .describe("Machine kinematic configuration type"),
  rotary_a_range: z
    .number()
    .min(-360)
    .max(360)
    .describe("A-axis rotary travel range, degrees"),
  rotary_b_range: z
    .number()
    .min(-360)
    .max(360)
    .describe("B-axis rotary travel range, degrees"),
  rotary_c_range: z
    .number()
    .min(-720)
    .max(720)
    .describe("C-axis rotary travel range, degrees"),
  pivot_length: z
    .number()
    .describe("Distance from rotary center to tool tip, mm"),
  tcp_enabled: z
    .boolean()
    .default(true)
    .describe("Enable Tool Center Point (RTCP/TCP) management in NC output"),
  linearization_tolerance: z
    .number()
    .min(0.001)
    .max(1.0)
    .default(0.01)
    .describe("Tolerance for 5-axis linearization of rotary moves, mm"),
  singularity_avoidance: z
    .boolean()
    .default(true)
    .describe("Enable singularity avoidance for 5-axis configurations"),
  max_rotary_speed: z
    .number()
    .min(1)
    .max(100)
    .describe("Maximum rotary axis speed, rpm"),
  inverse_time_feed: z
    .boolean()
    .default(false)
    .describe("Use inverse time feed (G93) for multi-axis moves"),
});

export type MachineKinematicsConfig = z.infer<typeof machineKinematicsConfigSchema>;

// ── 5b. Safety Config (10 params) ────────────────────────────────────────────

export const safetyConfigSchema = z.object({
  mandatory_program_stop: z
    .boolean()
    .default(false)
    .describe("Insert M00 mandatory stop after each tool change"),
  retract_to_home: z
    .boolean()
    .default(true)
    .describe("Retract to machine home position at program end"),
  home_position_g28: z
    .boolean()
    .default(true)
    .describe("Use G28 for home position return (vs G53)"),
  spindle_off_at_end: z
    .boolean()
    .default(true)
    .describe("Ensure spindle stop (M05) at program end"),
  coolant_off_at_end: z
    .boolean()
    .default(true)
    .describe("Ensure coolant off (M09) at program end"),
  max_feedrate_clamp: z
    .number()
    .min(1)
    .max(100000)
    .describe("Maximum feed rate safety clamp, mm/min"),
  max_spindle_speed_clamp: z
    .number()
    .min(1)
    .max(100000)
    .describe("Maximum spindle speed safety clamp, rpm"),
  door_interlock_check: z
    .boolean()
    .default(false)
    .describe("Include door interlock verification in program header"),
  breakpoint_at_first_cut: z
    .boolean()
    .default(false)
    .describe("Insert optional stop before first cutting move for dry-run verification"),
  emergency_retract_macro: z
    .string()
    .optional()
    .describe("Custom macro call for emergency retract sequence"),
});

export type SafetyConfig = z.infer<typeof safetyConfigSchema>;

// ═══════════════════════════════════════════════════════════════════════════════
// Schema Map
// ═══════════════════════════════════════════════════════════════════════════════

/** All 15 NC output schemas keyed by type */
export const NC_OUTPUT_SCHEMA_MAP = {
  single_calculate: singleCalculateSchema,
  calculate_all: calculateAllSchema,
  calculate_selected: calculateSelectedSchema,
  calculate_with_options: calculateWithOptionsSchema,
  select_post: selectPostSchema,
  configure_post: configurePostSchema,
  generate_nc: generateNCSchema,
  verify_nc: verifyNCSchema,
  per_block_sf: perBlockSFSchema,
  thermal_compensation: thermalCompensationSchema,
  chatter_avoidance: chatterAvoidanceSchema,
  nc_archive: ncArchiveSchema,
  nc_transfer: ncTransferSchema,
  machine_kinematics_config: machineKinematicsConfigSchema,
  safety_config: safetyConfigSchema,
} as const;

export type NCOutputType = keyof typeof NC_OUTPUT_SCHEMA_MAP;

// ═══════════════════════════════════════════════════════════════════════════════
// Metadata
// ═══════════════════════════════════════════════════════════════════════════════

/** Metadata record for every NC output type */
export interface NCOutputMeta {
  /** Number of Zod-validated parameters */
  paramCount: number;
  /** AC Python setter call template */
  acPythonSetter: string;
  /** Human-readable description */
  description: string;
  /** DFM flags: which parameters have manufacturing-critical ranges */
  dfmCriticalParams?: string[];
}

/** Metadata for each NC output type with AC Python setter references */
export const NC_OUTPUT_METADATA: Record<NCOutputType, NCOutputMeta> = {
  single_calculate: {
    paramCount: 7,
    acPythonSetter: "hm.nc.single_calculate",
    description: "Single operation calculation with cache and stock model control",
  },
  calculate_all: {
    paramCount: 7,
    acPythonSetter: "hm.nc.calculate_all",
    description: "Calculate all operations with scope filtering and parallel processing",
  },
  calculate_selected: {
    paramCount: 8,
    acPythonSetter: "hm.nc.calculate_selected",
    description: "Calculate selected operations with dependency resolution",
  },
  calculate_with_options: {
    paramCount: 8,
    acPythonSetter: "hm.nc.calculate_with_options",
    description: "Calculate with advanced options: quality mode, GPU, threading, caching",
  },
  select_post: {
    paramCount: 10,
    acPythonSetter: "hm.nc.select_post",
    description: "Select and configure post-processor for target CNC controller",
  },
  configure_post: {
    paramCount: 12,
    acPythonSetter: "hm.nc.configure_post",
    description: "Configure post-processor output format, units, and safety blocks",
    dfmCriticalParams: ["safe_start_block"],
  },
  generate_nc: {
    paramCount: 12,
    acPythonSetter: "hm.nc.generate_nc",
    description: "Generate NC output files with naming, splitting, and encoding options",
  },
  verify_nc: {
    paramCount: 11,
    acPythonSetter: "hm.nc.verify_nc",
    description: "Verify NC output for syntax, missing feeds/speeds, and tool references",
    dfmCriticalParams: ["check_missing_feeds", "check_missing_speeds"],
  },
  per_block_sf: {
    paramCount: 10,
    acPythonSetter: "hm.nc.per_block_sf",
    description: "Per-block variable speed/feed optimization with multi-objective priorities",
  },
  thermal_compensation: {
    paramCount: 10,
    acPythonSetter: "hm.nc.thermal_compensation",
    description: "Thermal expansion compensation with material-specific models",
  },
  chatter_avoidance: {
    paramCount: 10,
    acPythonSetter: "hm.nc.chatter_avoidance",
    description: "Chatter avoidance via stability lobe diagram and spindle speed shifting",
  },
  nc_archive: {
    paramCount: 10,
    acPythonSetter: "hm.nc.nc_archive",
    description: "NC file archiving with revision control and compression",
  },
  nc_transfer: {
    paramCount: 10,
    acPythonSetter: "hm.nc.nc_transfer",
    description: "NC file transfer to CNC machine via FTP, serial, or USB",
  },
  machine_kinematics_config: {
    paramCount: 10,
    acPythonSetter: "hm.nc.machine_kinematics_config",
    description: "Machine kinematic model configuration for multi-axis NC output",
  },
  safety_config: {
    paramCount: 10,
    acPythonSetter: "hm.nc.safety_config",
    description: "NC program safety configuration for stops, retracts, and interlocks",
  },
};

// ═══════════════════════════════════════════════════════════════════════════════
// Computed Totals
// ═══════════════════════════════════════════════════════════════════════════════

/** Total parameter count across all 15 NC output schemas */
export const NC_OUTPUT_TOTAL_PARAM_COUNT = Object.values(NC_OUTPUT_METADATA).reduce(
  (sum, meta) => sum + meta.paramCount,
  0,
);
