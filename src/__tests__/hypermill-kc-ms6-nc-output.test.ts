/**
 * HM-KC-MS6 NC Output + Simulation Extended Schema Tests
 *
 * Tests for U-HKC33 (Simulation Extended Schemas) and U-HKC34 (NC Output Schemas).
 * All tests validate specific values, ranges, and parsing behavior.
 *
 * @milestone HM-KC-MS6
 */

import { describe, it, expect } from "vitest";
import {
  perOperationTimeSchema,
  totalJobTimeSchema,
  timeComparisonSchema,
  codeReplaySchema,
  blockByBlockSchema,
  spindleLoadSchema,
  feedSpeedVerifySchema,
  batchCalculateSchema,
  batchSimulateSchema,
  batchPostSchema,
  collisionReportSchema,
  cycleTimeReportSchema,
  SIMULATION_EXTENDED_SCHEMA_MAP,
  SIMULATION_EXTENDED_METADATA,
  SIMULATION_EXTENDED_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/simulation/simulationExtendedSchemas.js";
import {
  singleCalculateSchema,
  calculateAllSchema,
  calculateSelectedSchema,
  calculateWithOptionsSchema,
  selectPostSchema,
  configurePostSchema,
  generateNCSchema,
  verifyNCSchema,
  perBlockSFSchema,
  thermalCompensationSchema,
  chatterAvoidanceSchema,
  ncArchiveSchema,
  ncTransferSchema,
  machineKinematicsConfigSchema,
  safetyConfigSchema,
  NC_OUTPUT_SCHEMA_MAP,
  NC_OUTPUT_METADATA,
  NC_OUTPUT_TOTAL_PARAM_COUNT,
} from "../schemas/hypermill/nc/ncOutputSchemas.js";

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC33: Simulation Extended Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC33: Simulation Extended Schemas", () => {
  // ── Schema map completeness ─────────────────────────────────────────────

  describe("Schema map completeness", () => {
    it("has exactly 12 types in SIMULATION_EXTENDED_SCHEMA_MAP", () => {
      const keys = Object.keys(SIMULATION_EXTENDED_SCHEMA_MAP);
      expect(keys).toHaveLength(12);
    });

    it("contains all expected type keys", () => {
      const keys = Object.keys(SIMULATION_EXTENDED_SCHEMA_MAP);
      expect(keys).toContain("per_operation_time");
      expect(keys).toContain("total_job_time");
      expect(keys).toContain("time_comparison");
      expect(keys).toContain("code_replay");
      expect(keys).toContain("block_by_block");
      expect(keys).toContain("spindle_load");
      expect(keys).toContain("feed_speed_verify");
      expect(keys).toContain("batch_calculate");
      expect(keys).toContain("batch_simulate");
      expect(keys).toContain("batch_post");
      expect(keys).toContain("collision_report");
      expect(keys).toContain("cycle_time_report");
    });

    it("has total param count >= 90", () => {
      expect(SIMULATION_EXTENDED_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(90);
    });

    it("has total param count exactly 97", () => {
      expect(SIMULATION_EXTENDED_TOTAL_PARAM_COUNT).toBe(97);
    });
  });

  // ── Metadata setters ───────────────────────────────────────────────────

  describe("Metadata AC Python setters", () => {
    it("all setters use hm.simulation.* namespace", () => {
      for (const [key, meta] of Object.entries(SIMULATION_EXTENDED_METADATA)) {
        expect(meta.acPythonSetter).toMatch(/^hm\.simulation\./);
        expect(meta.acPythonSetter).toBe(`hm.simulation.${key}`);
      }
    });

    it("per_operation_time setter is hm.simulation.per_operation_time", () => {
      expect(SIMULATION_EXTENDED_METADATA.per_operation_time.acPythonSetter).toBe(
        "hm.simulation.per_operation_time",
      );
    });

    it("batch_calculate setter is hm.simulation.batch_calculate", () => {
      expect(SIMULATION_EXTENDED_METADATA.batch_calculate.acPythonSetter).toBe(
        "hm.simulation.batch_calculate",
      );
    });
  });

  // ── DFM-CRITICAL: flag_zero_feed ──────────────────────────────────────

  describe("DFM-CRITICAL: flag_zero_feed", () => {
    it("feed_speed_verify has flag_zero_feed as DFM-critical", () => {
      const meta = SIMULATION_EXTENDED_METADATA.feed_speed_verify;
      expect(meta.dfmCriticalParams).toBeDefined();
      expect(meta.dfmCriticalParams).toContain("flag_zero_feed");
    });

    it("flag_zero_feed accepts boolean", () => {
      const result = feedSpeedVerifySchema.safeParse({
        verify_spindle_range: true,
        verify_feed_range: true,
        verify_rapid_limit: true,
        verify_programmed_vs_actual: false,
        tolerance_pct: 5,
        flag_zero_feed: true,
        flag_excessive_speed: false,
        report_violations: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.flag_zero_feed).toBe(true);
      }
    });
  });

  // ── Per-Operation Time schema ─────────────────────────────────────────

  describe("Per-Operation Time schema", () => {
    it("accepts valid per-operation time config", () => {
      const result = perOperationTimeSchema.safeParse({
        include_approach: true,
        include_retract: true,
        include_linking: false,
        rapid_override_pct: 80,
        feed_override_pct: 100,
        acceleration_model: "trapezoidal",
        machine_time_factor: 1.1,
        display_breakdown: true,
      });
      expect(result.success).toBe(true);
    });

    it("applies default rapid_override_pct of 100", () => {
      const result = perOperationTimeSchema.parse({
        include_approach: true,
        include_retract: true,
        include_linking: true,
        feed_override_pct: 100,
        acceleration_model: "none",
        machine_time_factor: 1.0,
        display_breakdown: false,
      });
      expect(result.rapid_override_pct).toBe(100);
    });

    it("rejects rapid_override_pct outside 1..100", () => {
      const result = perOperationTimeSchema.safeParse({
        include_approach: true,
        include_retract: true,
        include_linking: true,
        rapid_override_pct: 0,
        feed_override_pct: 100,
        acceleration_model: "none",
        machine_time_factor: 1.0,
        display_breakdown: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects invalid acceleration_model", () => {
      const result = perOperationTimeSchema.safeParse({
        include_approach: true,
        include_retract: true,
        include_linking: true,
        rapid_override_pct: 100,
        feed_override_pct: 100,
        acceleration_model: "linear",
        machine_time_factor: 1.0,
        display_breakdown: false,
      });
      expect(result.success).toBe(false);
    });

    it("rejects machine_time_factor below 0.5", () => {
      const result = perOperationTimeSchema.safeParse({
        include_approach: true,
        include_retract: true,
        include_linking: true,
        rapid_override_pct: 50,
        feed_override_pct: 100,
        acceleration_model: "s_curve",
        machine_time_factor: 0.3,
        display_breakdown: false,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Total Job Time schema ─────────────────────────────────────────────

  describe("Total Job Time schema", () => {
    it("applies default tool_change_time_sec of 8", () => {
      const result = totalJobTimeSchema.parse({
        include_tool_changes: true,
        include_probing: false,
        include_pallet_change: false,
        pallet_change_time_sec: 0,
        include_warmup: false,
        warmup_time_min: 0,
        shift_factor: 0.85,
        display_gantt: false,
      });
      expect(result.tool_change_time_sec).toBe(8);
    });

    it("applies default shift_factor of 0.85", () => {
      const result = totalJobTimeSchema.parse({
        include_tool_changes: false,
        include_probing: false,
        include_pallet_change: false,
        pallet_change_time_sec: 30,
        include_warmup: false,
        warmup_time_min: 0,
        display_gantt: false,
      });
      expect(result.shift_factor).toBeCloseTo(0.85);
    });
  });

  // ── Code Replay schema ────────────────────────────────────────────────

  describe("Code Replay schema", () => {
    it("accepts valid replay config", () => {
      const result = codeReplaySchema.safeParse({
        replay_mode: "continuous",
        start_line: 1,
        end_line: 5000,
        feed_override: 100,
        speed_override: 100,
        display_tool_path: true,
        display_machine_motion: false,
        pause_at_tool_change: true,
        record_deviation: false,
        max_line_count: 100000,
      });
      expect(result.success).toBe(true);
    });

    it("rejects feed_override above 200", () => {
      const result = codeReplaySchema.safeParse({
        replay_mode: "single_block",
        start_line: 1,
        end_line: 100,
        feed_override: 250,
        speed_override: 100,
        display_tool_path: true,
        display_machine_motion: false,
        pause_at_tool_change: false,
        record_deviation: false,
        max_line_count: 1000,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Batch Calculate schema ────────────────────────────────────────────

  describe("Batch Calculate schema", () => {
    it("applies default max_parallel of 4", () => {
      const result = batchCalculateSchema.parse({
        operations: "all",
        priority: "normal",
        notification_on_error: true,
        timeout_hours: 8,
        retry_on_failure: true,
        log_level: "info",
      });
      expect(result.max_parallel).toBe(4);
    });

    it("rejects max_parallel above 16", () => {
      const result = batchCalculateSchema.safeParse({
        operations: "all",
        max_parallel: 32,
        priority: "normal",
        notification_on_error: true,
        timeout_hours: 8,
        retry_on_failure: true,
        log_level: "info",
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Batch Post schema ─────────────────────────────────────────────────

  describe("Batch Post schema", () => {
    it("accepts array of selected operations", () => {
      const result = batchPostSchema.safeParse({
        post_all: false,
        selected_operations: ["OP001", "OP002", "OP003"],
        output_folder: "C:/NC_Output",
        overwrite_existing: false,
        verify_after_post: true,
        deliver_to_dnc: false,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.selected_operations).toHaveLength(3);
      }
    });
  });

  // ── Collision Report schema ───────────────────────────────────────────

  describe("Collision Report schema", () => {
    it("accepts valid collision report config", () => {
      const result = collisionReportSchema.safeParse({
        detail_level: "per_block",
        include_screenshots: true,
        screenshot_resolution: "high",
        export_format: "pdf",
        include_tool_info: true,
        include_coordinates: true,
        color_severity: true,
        auto_open: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Cycle Time Report schema ──────────────────────────────────────────

  describe("Cycle Time Report schema", () => {
    it("accepts xlsx export format", () => {
      const result = cycleTimeReportSchema.safeParse({
        include_per_operation: true,
        include_total: true,
        include_comparison: false,
        chart_type: "gantt",
        export_format: "xlsx",
        include_optimization_tips: true,
        auto_open: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.export_format).toBe("xlsx");
      }
    });
  });

  // ── Param count per metadata ──────────────────────────────────────────

  describe("Param counts match metadata", () => {
    it("per_operation_time has 8 params", () => {
      expect(SIMULATION_EXTENDED_METADATA.per_operation_time.paramCount).toBe(8);
    });

    it("total_job_time has 9 params", () => {
      expect(SIMULATION_EXTENDED_METADATA.total_job_time.paramCount).toBe(9);
    });

    it("code_replay has 10 params", () => {
      expect(SIMULATION_EXTENDED_METADATA.code_replay.paramCount).toBe(10);
    });

    it("batch_post has 6 params", () => {
      expect(SIMULATION_EXTENDED_METADATA.batch_post.paramCount).toBe(6);
    });

    it("cycle_time_report has 7 params", () => {
      expect(SIMULATION_EXTENDED_METADATA.cycle_time_report.paramCount).toBe(7);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════════
// U-HKC34: NC Output Schemas
// ═══════════════════════════════════════════════════════════════════════════════

describe("U-HKC34: NC Output Schemas", () => {
  // ── Schema map completeness ─────────────────────────────────────────────

  describe("Schema map completeness", () => {
    it("has exactly 15 types in NC_OUTPUT_SCHEMA_MAP", () => {
      const keys = Object.keys(NC_OUTPUT_SCHEMA_MAP);
      expect(keys).toHaveLength(15);
    });

    it("contains all expected type keys", () => {
      const keys = Object.keys(NC_OUTPUT_SCHEMA_MAP);
      expect(keys).toContain("single_calculate");
      expect(keys).toContain("calculate_all");
      expect(keys).toContain("calculate_selected");
      expect(keys).toContain("calculate_with_options");
      expect(keys).toContain("select_post");
      expect(keys).toContain("configure_post");
      expect(keys).toContain("generate_nc");
      expect(keys).toContain("verify_nc");
      expect(keys).toContain("per_block_sf");
      expect(keys).toContain("thermal_compensation");
      expect(keys).toContain("chatter_avoidance");
      expect(keys).toContain("nc_archive");
      expect(keys).toContain("nc_transfer");
      expect(keys).toContain("machine_kinematics_config");
      expect(keys).toContain("safety_config");
    });

    it("has total param count >= 140", () => {
      expect(NC_OUTPUT_TOTAL_PARAM_COUNT).toBeGreaterThanOrEqual(140);
    });

    it("has total param count exactly 145", () => {
      expect(NC_OUTPUT_TOTAL_PARAM_COUNT).toBe(145);
    });
  });

  // ── Metadata setters ───────────────────────────────────────────────────

  describe("Metadata AC Python setters", () => {
    it("all setters use hm.nc.* namespace", () => {
      for (const [key, meta] of Object.entries(NC_OUTPUT_METADATA)) {
        expect(meta.acPythonSetter).toMatch(/^hm\.nc\./);
        expect(meta.acPythonSetter).toBe(`hm.nc.${key}`);
      }
    });

    it("configure_post setter is hm.nc.configure_post", () => {
      expect(NC_OUTPUT_METADATA.configure_post.acPythonSetter).toBe(
        "hm.nc.configure_post",
      );
    });

    it("verify_nc setter is hm.nc.verify_nc", () => {
      expect(NC_OUTPUT_METADATA.verify_nc.acPythonSetter).toBe(
        "hm.nc.verify_nc",
      );
    });
  });

  // ── DFM-CRITICAL: safe_start_block ────────────────────────────────────

  describe("DFM-CRITICAL: safe_start_block", () => {
    it("configure_post has safe_start_block as DFM-critical", () => {
      const meta = NC_OUTPUT_METADATA.configure_post;
      expect(meta.dfmCriticalParams).toBeDefined();
      expect(meta.dfmCriticalParams).toContain("safe_start_block");
    });

    it("safe_start_block accepts boolean", () => {
      const result = configurePostSchema.safeParse({
        units: "metric",
        decimal_places: 4,
        modal_gcode: true,
        block_delete: false,
        optional_stop: false,
        sub_program_style: "inline",
        coordinate_output: "absolute",
        arc_output: "ijk",
        safe_start_block: true,
        safe_start_content: "G90 G21 G17 G40 G49 G80",
        tool_call_format: "t_m06",
        coolant_codes: "M08=flood,M09=off",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.safe_start_block).toBe(true);
      }
    });
  });

  // ── Single Calculate schema ───────────────────────────────────────────

  describe("Single Calculate schema", () => {
    it("accepts valid single calculate config", () => {
      const result = singleCalculateSchema.safeParse({
        operation_id: "OP_ROUGH_001",
        recalculate: false,
        use_cached: true,
        update_stock: true,
        log_calculation: true,
        compute_cycle_time: true,
      });
      expect(result.success).toBe(true);
    });

    it("applies default recalculate of false", () => {
      const result = singleCalculateSchema.parse({
        operation_id: "OP001",
        use_cached: true,
        update_stock: true,
        log_calculation: false,
        compute_cycle_time: true,
      });
      expect(result.recalculate).toBe(false);
    });

    it("allows optional tolerance_override", () => {
      const result = singleCalculateSchema.safeParse({
        operation_id: "OP001",
        recalculate: true,
        use_cached: false,
        tolerance_override: 0.01,
        update_stock: true,
        log_calculation: true,
        compute_cycle_time: true,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.tolerance_override).toBeCloseTo(0.01);
      }
    });
  });

  // ── Calculate Selected schema ─────────────────────────────────────────

  describe("Calculate Selected schema", () => {
    it("accepts array of operation IDs", () => {
      const result = calculateSelectedSchema.safeParse({
        operation_ids: ["OP001", "OP002", "OP003"],
        dependency_check: true,
        include_dependencies: true,
        recalculate_dependents: false,
        batch_mode: true,
        notification: true,
        priority: "high",
        timeout_min: 60,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.operation_ids).toHaveLength(3);
        expect(result.data.operation_ids[0]).toBe("OP001");
      }
    });
  });

  // ── Calculate With Options schema ─────────────────────────────────────

  describe("Calculate With Options schema", () => {
    it("applies default tolerance_factor of 1.0", () => {
      const result = calculateWithOptionsSchema.parse({
        quality_mode: "normal",
        use_gpu: false,
        memory_limit_mb: 4096,
        thread_count: 8,
        profile_performance: false,
        cache_strategy: "smart",
        incremental: true,
      });
      expect(result.tolerance_factor).toBeCloseTo(1.0);
    });

    it("rejects tolerance_factor below 0.1", () => {
      const result = calculateWithOptionsSchema.safeParse({
        tolerance_factor: 0.05,
        quality_mode: "high",
        use_gpu: true,
        memory_limit_mb: 8192,
        thread_count: 16,
        profile_performance: true,
        cache_strategy: "aggressive",
        incremental: true,
      });
      expect(result.success).toBe(false);
    });

    it("rejects thread_count above 32", () => {
      const result = calculateWithOptionsSchema.safeParse({
        tolerance_factor: 1.0,
        quality_mode: "ultra",
        use_gpu: true,
        memory_limit_mb: 16384,
        thread_count: 64,
        profile_performance: true,
        cache_strategy: "none",
        incremental: false,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Select Post schema ────────────────────────────────────────────────

  describe("Select Post schema", () => {
    it("accepts all 10 controller types", () => {
      const controllers = [
        "fanuc", "siemens", "haas", "mazak", "okuma",
        "heidenhain", "mitsubishi", "brother", "doosan", "generic",
      ];
      for (const ctrl of controllers) {
        const result = selectPostSchema.safeParse({
          post_name: `post_${ctrl}`,
          controller_type: ctrl,
          version: "2024.1",
          verify_compatibility: true,
          machine_match: true,
          alternative_posts: [],
          preview_output: false,
          line_numbering: true,
          line_increment: 10,
        });
        expect(result.success).toBe(true);
      }
    });

    it("applies default line_increment of 10", () => {
      const result = selectPostSchema.parse({
        post_name: "fanuc_30i",
        controller_type: "fanuc",
        version: "1.0",
        verify_compatibility: true,
        machine_match: true,
        alternative_posts: [],
        preview_output: false,
        line_numbering: true,
      });
      expect(result.line_increment).toBe(10);
    });
  });

  // ── Generate NC schema ────────────────────────────────────────────────

  describe("Generate NC schema", () => {
    it("applies default file_extension of .nc", () => {
      const result = generateNCSchema.parse({
        output_path: "C:/NC_Output",
        file_naming: "operation",
        header_comment: true,
        include_program_number: true,
        program_number: 1001,
        append_checksum: false,
        split_by_tool: false,
        max_file_size_mb: 10,
        encoding: "ascii",
        line_ending: "crlf",
      });
      expect(result.file_extension).toBe(".nc");
    });

    it("accepts custom name pattern", () => {
      const result = generateNCSchema.safeParse({
        output_path: "/home/cnc/output",
        file_extension: ".tap",
        file_naming: "custom",
        custom_name_pattern: "{job}_{op}_{date}",
        header_comment: true,
        include_program_number: false,
        append_checksum: true,
        split_by_tool: true,
        max_file_size_mb: 50,
        encoding: "utf8",
        line_ending: "lf",
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.custom_name_pattern).toBe("{job}_{op}_{date}");
      }
    });
  });

  // ── Verify NC schema ──────────────────────────────────────────────────

  describe("Verify NC schema", () => {
    it("verify_nc has check_missing_feeds as DFM-critical", () => {
      const meta = NC_OUTPUT_METADATA.verify_nc;
      expect(meta.dfmCriticalParams).toContain("check_missing_feeds");
      expect(meta.dfmCriticalParams).toContain("check_missing_speeds");
    });

    it("accepts valid verify config", () => {
      const result = verifyNCSchema.safeParse({
        syntax_check: true,
        gcode_standard: "iso6983",
        check_unreachable_blocks: true,
        check_missing_feeds: true,
        check_missing_speeds: true,
        check_tool_references: true,
        simulate_after_post: false,
        compare_to_source: true,
        deviation_tolerance: 0.005,
        report_warnings: true,
        report_errors: true,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Per-Block S/F schema ──────────────────────────────────────────────

  describe("Per-Block S/F schema", () => {
    it("applies default surface_finish_priority of 0.5", () => {
      const result = perBlockSFSchema.parse({
        enable_variable_sf: true,
        optimization_mode: "balanced",
        max_speed_increase_pct: 20,
        max_feed_increase_pct: 30,
        min_speed_decrease_pct: 10,
        physics_model: "kienzle",
        tool_life_priority: 0.7,
        mrr_priority: 0.3,
        smooth_transitions: true,
      });
      expect(result.surface_finish_priority).toBeCloseTo(0.5);
    });

    it("rejects max_speed_increase_pct above 50", () => {
      const result = perBlockSFSchema.safeParse({
        enable_variable_sf: true,
        optimization_mode: "aggressive",
        max_speed_increase_pct: 75,
        max_feed_increase_pct: 50,
        min_speed_decrease_pct: 10,
        physics_model: "hybrid",
        surface_finish_priority: 0.5,
        tool_life_priority: 0.5,
        mrr_priority: 0.5,
        smooth_transitions: true,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── Thermal Compensation schema ───────────────────────────────────────

  describe("Thermal Compensation schema", () => {
    it("applies default reference_temperature of 20", () => {
      const result = thermalCompensationSchema.parse({
        enable_thermal_comp: true,
        temperature_model: "analytical",
        expansion_coefficient: 0.0000117,
        max_compensation_um: 50,
        compensation_axis: "xyz",
        update_interval_blocks: 100,
        material_thermal_model: "steel",
        ambient_tracking: true,
        coolant_temperature_factor: 0.8,
      });
      expect(result.reference_temperature).toBe(20);
    });
  });

  // ── Chatter Avoidance schema ──────────────────────────────────────────

  describe("Chatter Avoidance schema", () => {
    it("applies default stability_margin of 0.2", () => {
      const result = chatterAvoidanceSchema.parse({
        enable_sld_check: true,
        sld_source: "computed",
        spindle_speed_shift_pct: 10,
        preferred_lobe: 3,
        avoid_critical_speeds: true,
        critical_speed_margin_pct: 5,
        depth_limit_from_sld: true,
        update_on_tool_change: true,
        report_instability: true,
      });
      expect(result.stability_margin).toBeCloseTo(0.2);
    });

    it("rejects preferred_lobe above 10", () => {
      const result = chatterAvoidanceSchema.safeParse({
        enable_sld_check: true,
        sld_source: "database",
        spindle_speed_shift_pct: 5,
        preferred_lobe: 15,
        avoid_critical_speeds: true,
        critical_speed_margin_pct: 3,
        depth_limit_from_sld: false,
        stability_margin: 0.3,
        update_on_tool_change: true,
        report_instability: false,
      });
      expect(result.success).toBe(false);
    });
  });

  // ── NC Archive schema ─────────────────────────────────────────────────

  describe("NC Archive schema", () => {
    it("applies default max_revisions of 10", () => {
      const result = ncArchiveSchema.parse({
        archive_path: "C:/NC_Archive",
        revision_control: true,
        compress_archive: true,
        compression_format: "zip",
        include_setup_sheet: true,
        include_tool_list: true,
        timestamp_format: "iso8601",
        retention_days: 365,
        dnc_sync: false,
      });
      expect(result.max_revisions).toBe(10);
    });
  });

  // ── NC Transfer schema ────────────────────────────────────────────────

  describe("NC Transfer schema", () => {
    it("accepts valid FTP transfer config", () => {
      const result = ncTransferSchema.safeParse({
        transfer_protocol: "sftp",
        host: "192.168.1.100",
        port: 22,
        remote_path: "/programs/",
        verify_transfer: true,
        auto_transfer: false,
        overwrite_remote: false,
        transfer_timeout_sec: 120,
      });
      expect(result.success).toBe(true);
    });

    it("accepts serial transfer with baud rate", () => {
      const result = ncTransferSchema.safeParse({
        transfer_protocol: "serial",
        host: "COM3",
        remote_path: "/",
        verify_transfer: true,
        auto_transfer: false,
        overwrite_remote: true,
        serial_baud_rate: 9600,
        serial_parity: "even",
        transfer_timeout_sec: 300,
      });
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.serial_baud_rate).toBe(9600);
      }
    });
  });

  // ── Machine Kinematics Config schema ──────────────────────────────────

  describe("Machine Kinematics Config schema", () => {
    it("accepts 5-axis trunnion config", () => {
      const result = machineKinematicsConfigSchema.safeParse({
        kinematic_model: "5axis_trunnion",
        rotary_a_range: 120,
        rotary_b_range: 0,
        rotary_c_range: 360,
        pivot_length: 250,
        tcp_enabled: true,
        linearization_tolerance: 0.01,
        singularity_avoidance: true,
        max_rotary_speed: 30,
        inverse_time_feed: false,
      });
      expect(result.success).toBe(true);
    });
  });

  // ── Safety Config schema ──────────────────────────────────────────────

  describe("Safety Config schema", () => {
    it("applies default spindle_off_at_end of true", () => {
      const result = safetyConfigSchema.parse({
        mandatory_program_stop: false,
        retract_to_home: true,
        home_position_g28: true,
        coolant_off_at_end: true,
        max_feedrate_clamp: 10000,
        max_spindle_speed_clamp: 20000,
        door_interlock_check: false,
        breakpoint_at_first_cut: false,
      });
      expect(result.spindle_off_at_end).toBe(true);
    });
  });

  // ── Combined totals ───────────────────────────────────────────────────

  describe("Combined totals", () => {
    it("simulation + nc output >= 230 params", () => {
      const combined = SIMULATION_EXTENDED_TOTAL_PARAM_COUNT + NC_OUTPUT_TOTAL_PARAM_COUNT;
      expect(combined).toBeGreaterThanOrEqual(230);
    });

    it("combined total is exactly 242", () => {
      const combined = SIMULATION_EXTENDED_TOTAL_PARAM_COUNT + NC_OUTPUT_TOTAL_PARAM_COUNT;
      expect(combined).toBe(242);
    });
  });

  // ── Param count per metadata ──────────────────────────────────────────

  describe("Param counts match metadata", () => {
    it("single_calculate has 7 params", () => {
      expect(NC_OUTPUT_METADATA.single_calculate.paramCount).toBe(7);
    });

    it("configure_post has 12 params", () => {
      expect(NC_OUTPUT_METADATA.configure_post.paramCount).toBe(12);
    });

    it("verify_nc has 11 params", () => {
      expect(NC_OUTPUT_METADATA.verify_nc.paramCount).toBe(11);
    });

    it("per_block_sf has 10 params", () => {
      expect(NC_OUTPUT_METADATA.per_block_sf.paramCount).toBe(10);
    });

    it("nc_archive has 10 params", () => {
      expect(NC_OUTPUT_METADATA.nc_archive.paramCount).toBe(10);
    });

    it("safety_config has 10 params", () => {
      expect(NC_OUTPUT_METADATA.safety_config.paramCount).toBe(10);
    });
  });
});
