/**
 * CAM Action Schemas — Zod validation schemas for camDispatcher actions
 */
import { z } from "zod";

export const ACTION_CAM_SCHEMAS: Record<string, z.ZodType> = {
  lathe_masterpost_regression_run: z.object({
    machines: z.array(z.string()).optional(),
    jobs: z.array(z.string()).optional(),
    validators: z.array(z.enum(["syntax", "safety", "envelope", "dialect", "timing"])).optional(),
    updateBaseline: z.boolean().optional(),
    diffOnly: z.boolean().optional(),
  }),
  lathe_masterpost_regression_lock: z.object({
    cells: z.array(z.object({ machineId: z.string(), jobId: z.string() })).optional(),
    force: z.boolean().optional(),
  }),
  lathe_masterpost_regression_diff: z.object({
    machineId: z.string().optional(),
    jobId: z.string().optional(),
    threshold: z.number().optional(),
  }),
  lathe_masterpost_regression_stats: z.object({}),
  lathe_masterpost_regression_clear: z.object({}),

  // Deep Reasoning Engine actions
  lathe_masterpost_deep_explain: z.object({
    machineId: z.string().describe("Target machine ID"),
    operation: z.string().optional().describe("Operation type (turning, boring, threading, etc.)"),
    constraints: z.record(z.string(), z.any()).optional().describe("Additional constraints"),
  }),
  lathe_masterpost_deep_causal: z.object({
    machineId: z.string().describe("Machine ID for causal inference"),
    operation: z.string().optional().describe("Operation context"),
  }),
  lathe_masterpost_deep_counterfactual: z.object({
    machineId: z.string().describe("Machine ID for counterfactual analysis"),
    hypotheticalChange: z.string().describe("Hypothetical change to analyze"),
  }),
  lathe_masterpost_deep_history: z.object({
    limit: z.number().optional().describe("Max trace entries to return"),
  }),
  lathe_masterpost_deep_stats: z.object({}),
  lathe_masterpost_deep_clear: z.object({}),

  // Ensemble Cross-Check Engine actions
  lathe_masterpost_ensemble_run: z.object({
    machineId: z.string().describe("Machine ID for ensemble run"),
    program: z.string().describe("G-code program to check"),
    operation: z.string().optional().describe("Operation type"),
  }),
  lathe_masterpost_ensemble_candidates: z.object({
    machineId: z.string().describe("Machine ID to find candidates for"),
    operation: z.string().optional().describe("Operation type filter"),
  }),
  lathe_masterpost_ensemble_ambiguous: z.object({
    machineId: z.string().describe("Machine ID to check for ambiguity"),
  }),
  lathe_masterpost_ensemble_divergences: z.object({
    outputs: z.array(z.object({
      postId: z.string(),
      gcode: z.array(z.string()),
    })).describe("Post outputs to compare"),
    threshold: z.number().optional().describe("Divergence threshold (0-1)"),
  }),
  lathe_masterpost_ensemble_history: z.object({
    limit: z.number().optional().describe("Max results to return"),
  }),
  lathe_masterpost_ensemble_stats: z.object({}),
  lathe_masterpost_ensemble_clear: z.object({}),

  // ============================================================================
  // MASTER POST ENGINES (JM Die canonical posts) — PPG-WIRE-MS0
  // ============================================================================

  /** Hurco V11 Mill master post - JM Die canonical mill post with WinMax V11 */
  master_post_hurco_v11: z.object({
    operations: z.array(z.object({
      operation_type: z.enum([
        "face", "pocket", "contour", "drill", "tap", "bore", "slot", "3d_surface", "adaptive"
      ]).describe("Mill operation type"),
      tool_number: z.number().int().min(1).max(99).describe("Tool station number (T01-T99)"),
      tool_diameter_mm: z.number().positive().describe("Tool diameter in mm"),
      tool_flutes: z.number().int().min(1).max(12).describe("Number of flutes"),
      tool_description: z.string().optional().describe("Tool description for comments"),
      material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
      spindle_rpm: z.number().positive().describe("Spindle RPM"),
      feed_mm_min: z.number().positive().describe("Feed rate mm/min"),
      axial_depth_mm: z.number().positive().describe("Axial depth of cut mm"),
      radial_depth_mm: z.number().positive().optional().describe("Radial depth of cut mm"),
      coolant: z.enum(["flood", "mist", "tsc", "off"]).optional().describe("Coolant mode"),
      coordinates: z.array(z.object({
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
        z: z.number().describe("Z coordinate"),
        type: z.enum(["rapid", "linear", "arc_cw", "arc_ccw"]).describe("Move type"),
      })).min(1).describe("Toolpath coordinates"),
      arc_data: z.array(z.object({
        i: z.number().optional().describe("Arc center I offset"),
        j: z.number().optional().describe("Arc center J offset"),
        k: z.number().optional().describe("Arc center K offset"),
        r: z.number().optional().describe("Arc radius"),
      })).optional().describe("Arc center data (matches coordinates array)"),
    })).min(1).describe("Array of mill operations to post-process"),
    config: z.object({
      program_number: z.number().int().min(1).max(9999).optional().describe("O-number (default: 1)"),
      program_comment: z.string().optional().describe("Program header comment"),
      use_conversational: z.boolean().optional().describe("Use Hurco G65 conversational macros"),
      use_ultimotion: z.boolean().optional().describe("Enable UltiMotion high-speed mode"),
      coolant_mode: z.enum(["flood", "mist", "tsc", "off"]).optional().describe("Default coolant mode"),
      work_offset: z.number().int().min(54).max(59).optional().describe("G54-G59 work offset"),
      units: z.enum(["metric", "inch"]).optional().describe("Output units (default: metric)"),
      safe_z_mm: z.number().optional().describe("Safe Z retract position"),
      tool_change_position: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }).optional().describe("Tool change position"),
    }).optional().describe("Post processor configuration"),
  }),

  /** Okuma LB250II-M lathe master post — JM Die canonical lathe post with OSP-P300L */
  master_post_okuma_b250: z.object({
    operations: z.array(z.object({
      operation_type: z.enum([
        "od_rough", "od_finish", "id_rough", "id_finish",
        "face", "groove", "thread", "drill", "bore", "part_off", "c_mill"
      ]).describe("Lathe operation type"),
      tool_number: z.number().int().min(1).max(99).describe("Tool station number (T01-T99)"),
      tool_orientation: z.number().int().min(1).max(9).describe("ISO tool orientation 1-9"),
      insert_radius_mm: z.number().positive().describe("Insert nose radius in mm"),
      tool_description: z.string().optional().describe("Tool description for comments"),
      material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
      spindle_rpm: z.number().positive().optional().describe("Direct RPM (mutually exclusive with CSS)"),
      css_m_min: z.number().positive().optional().describe("G96 constant surface speed m/min"),
      css_max_rpm: z.number().positive().optional().describe("G50 spindle speed clamp"),
      feed_mm_rev: z.number().positive().describe("Feed rate mm/rev"),
      depth_of_cut_mm: z.number().positive().describe("Depth of cut mm"),
      start_x: z.number().describe("Start X coordinate (diameter)"),
      start_z: z.number().describe("Start Z coordinate"),
      end_x: z.number().describe("End X coordinate (diameter)"),
      end_z: z.number().describe("End Z coordinate"),
      thread_pitch_mm: z.number().positive().optional().describe("Thread pitch for G76"),
      thread_depth_mm: z.number().positive().optional().describe("Thread depth for G76"),
      thread_passes: z.number().int().positive().optional().describe("Number of threading passes"),
      groove_width_mm: z.number().positive().optional().describe("Groove width for grooving ops"),
      coolant: z.enum(["flood", "off"]).optional().describe("Coolant mode"),
    })).min(1).describe("Array of turning operations to post-process"),
    config: z.object({
      program_number: z.number().int().min(1).max(9999).optional().describe("O-number (default: 1)"),
      program_comment: z.string().optional().describe("Program header comment"),
      units: z.enum(["metric", "inch"]).optional().describe("Output units (default: metric)"),
      work_offset: z.number().int().min(54).max(59).optional().describe("G54-G59 work offset"),
      safe_z_mm: z.number().optional().describe("Safe Z retract position"),
      chuck_pressure: z.enum(["high", "medium", "low"]).optional().describe("Chuck clamping pressure"),
      use_css: z.boolean().optional().describe("Use G96 constant surface speed (default: true)"),
      css_max_rpm: z.number().positive().optional().describe("G50 spindle clamp RPM (default: 3500)"),
      sub_spindle_enabled: z.boolean().optional().describe("Enable sub-spindle sync codes"),
      live_tooling_enabled: z.boolean().optional().describe("Enable live tooling M-codes"),
      c_axis_enabled: z.boolean().optional().describe("Enable C-axis positioning"),
      tailstock_position_mm: z.number().optional().describe("Tailstock engagement position"),
    }).optional().describe("Post processor configuration"),
  }),

  /**
   * Okuma OSP-P300M / OSP-P500M mill master post — closes the OSP-P*M
   * HARD-REJECT branch in master_post_by_machine. Same MillOperation shape
   * as Hurco V11; family flag selects 3-axis (P300M / MB-V) vs 5-axis
   * (P500M / MU-V) dialect rows in ControllerDialectEngine.
   * PPG-WIRE-MS5/U-PPGW-OkumaMill.
   */
  master_post_okuma_osp: z.object({
    operations: z.array(z.object({
      operation_type: z.enum([
        "face", "pocket", "contour", "drill", "tap", "bore", "slot", "3d_surface", "adaptive"
      ]).describe("Mill operation type"),
      tool_number: z.number().int().min(1).max(99).describe("Tool station number (T01-T99)"),
      tool_diameter_mm: z.number().positive().describe("Tool diameter in mm"),
      tool_flutes: z.number().int().min(1).max(12).describe("Number of flutes"),
      tool_description: z.string().optional().describe("Tool description for comments"),
      material_iso: z.enum(["P", "M", "K", "N", "S", "H"]).describe("ISO material group"),
      spindle_rpm: z.number().positive().describe("Spindle RPM"),
      feed_mm_min: z.number().positive().describe("Feed rate mm/min"),
      axial_depth_mm: z.number().positive().describe("Axial depth of cut mm"),
      radial_depth_mm: z.number().positive().optional().describe("Radial depth of cut mm"),
      coolant: z.enum(["flood", "mist", "tsc", "off"]).optional().describe("Coolant mode"),
      coordinates: z.array(z.object({
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
        z: z.number().describe("Z coordinate"),
        type: z.enum(["rapid", "linear", "arc_cw", "arc_ccw"]).describe("Move type"),
      })).min(1).describe("Toolpath coordinates"),
      arc_data: z.array(z.object({
        i: z.number().optional().describe("Arc center I offset"),
        j: z.number().optional().describe("Arc center J offset"),
        k: z.number().optional().describe("Arc center K offset"),
        r: z.number().optional().describe("Arc radius"),
      })).optional().describe("Arc center data (matches coordinates array)"),
    })).min(1).describe("Array of mill operations to post-process"),
    config: z.object({
      program_number: z.number().int().min(1).max(9999).optional().describe("O-number (default: 1000)"),
      program_comment: z.string().optional().describe("Program header comment"),
      osp_family: z.enum(["P300", "P500"]).optional().describe("OSP family (P300M or P500M); default P300"),
      use_super_nurbs: z.boolean().optional().describe("Enable G05.1 Q1 Super-NURBS (P500 only — ignored on P300)"),
      coolant_mode: z.enum(["flood", "mist", "tsc", "off"]).optional().describe("Default coolant mode"),
      work_offset_index: z.number().int().min(1).max(99).optional().describe("H index for G15 H{n} work offset (default: 1)"),
      units: z.enum(["metric", "inch"]).optional().describe("Output units (default: metric)"),
      safe_z_mm: z.number().optional().describe("Safe Z retract position"),
      tool_change_position: z.object({
        x: z.number(),
        y: z.number(),
        z: z.number(),
      }).optional().describe("Tool change position"),
      max_spindle_rpm: z.number().positive().optional().describe("Override spindle ceiling (default: 12000 P300, 15000 P500)"),
    }).optional().describe("Post processor configuration"),
    verify_tier: z.enum(["sim", "proven_out", "production", "shop_floor"]).optional().describe("Tier for sealMasterPostOutput post-emit verifier (omit to skip gate)"),
  }),

  /** Mitsubishi MV1200R Wire EDM master post — JM Die canonical wire EDM post with M700V/M800 */
  master_post_mitsubishi_mv1200r: z.object({
    operations: z.array(z.object({
      operation_type: z.enum(["profile", "taper", "no_core", "open_path", "start_hole"]).describe("Wire EDM operation type"),
      pass: z.enum(["rough", "skim1", "skim2", "skim3", "skim4"]).describe("Cutting pass (rough first, then skim passes)"),
      start_x: z.number().describe("Wire start X position (mm)"),
      start_y: z.number().describe("Wire start Y position (mm)"),
      profile_points: z.array(z.object({
        x: z.number().describe("X coordinate"),
        y: z.number().describe("Y coordinate"),
        u: z.number().optional().describe("U taper offset (for taper cuts)"),
        v: z.number().optional().describe("V taper offset (for taper cuts)"),
        type: z.enum(["line", "arc_cw", "arc_ccw"]).describe("Move type"),
        r: z.number().optional().describe("Arc radius (for arc moves)"),
        i: z.number().optional().describe("Arc center I offset"),
        j: z.number().optional().describe("Arc center J offset"),
      })).min(1).describe("Profile geometry points"),
      material: z.object({
        name: z.string().describe("Material name (e.g., 'D2 Tool Steel')"),
        iso_group: z.enum(["P", "M", "K", "N", "S", "H"]).optional().describe("ISO material group"),
        hardness_hrc: z.number().optional().describe("Hardness in HRC"),
        conductivity_relative: z.number().optional().describe("Electrical conductivity relative to copper (0-1)"),
      }).describe("Workpiece material"),
      thickness_mm: z.number().positive().describe("Part thickness in mm"),
      wire: z.object({
        diameter_mm: z.number().positive().optional().describe("Wire diameter (default: 0.25mm brass)"),
        tension_g: z.number().positive().optional().describe("Wire tension in grams"),
        speed_mmin: z.number().positive().optional().describe("Wire feed speed m/min"),
      }).optional().describe("Wire parameters"),
      power_setting: z.string().optional().describe("E-pack power condition (E1-E20)"),
      on_time_us: z.number().positive().optional().describe("Spark on-time microseconds"),
      off_time_us: z.number().positive().optional().describe("Spark off-time microseconds"),
      servo_voltage_v: z.number().optional().describe("Servo reference voltage"),
      flushing_pressure: z.enum(["low", "medium", "high", "auto"]).optional().describe("Flushing pressure"),
      taper_angle_deg: z.number().optional().describe("Taper angle in degrees (for taper cuts)"),
      taper_height_mm: z.number().positive().optional().describe("Taper height from bottom"),
      land_height_mm: z.number().positive().optional().describe("Straight land height at top"),
      offset_direction: z.enum(["left", "right", "center"]).describe("Offset compensation direction"),
      offset_override_mm: z.number().optional().describe("Manual offset override (uses physics calc if omitted)"),
    })).min(1).describe("Array of wire EDM operations to post-process"),
    config: z.object({
      program_number: z.number().int().min(1).max(9999).optional().describe("O-number (default: 1)"),
      program_comment: z.string().optional().describe("Program header comment"),
      units: z.enum(["metric", "inch"]).optional().describe("Output units (default: metric)"),
      submerged: z.boolean().optional().describe("Submerged cutting mode (default: true)"),
      auto_wire_thread: z.boolean().optional().describe("Enable automatic wire threading"),
      wire_diameter_mm: z.number().positive().optional().describe("Default wire diameter for all ops"),
      e_pack_base: z.string().optional().describe("Base E-pack condition number"),
      corner_control: z.boolean().optional().describe("Enable corner slowdown (default: true)"),
      backup_on_break_mm: z.number().optional().describe("Backup distance on wire break"),
      dialect: z.enum(["M700V", "M800"]).optional().describe("Controller dialect (default: M800)"),
      set_work_origin: z.boolean().optional().describe("Output G92 work origin block"),
      adaptive_control: z.boolean().optional().describe("Enable adaptive spark control"),
    }).optional().describe("Wire EDM post processor configuration"),
    verify_tier: z.enum(["sim", "proven_out", "production", "shop_floor"]).optional().describe("PPG-WIRE-MS6/U-PPGM17d — when set, run verifyWEDMBlockAnnotations and attach the WEDMVerifyResult to the response. Tier semantics: sim ±20% drift / proven_out ±10% / production ±5% (HARD_BLOCK) / shop_floor ±2% + heat-soak invariant + servo voltage range gate."),
  }),

  /** Auto-route to correct master post engine by machine model */
  master_post_by_machine: z.object({
    machine_model: z.string().describe("Machine model identifier (e.g., 'HURCO_VMX24', 'OKUMA_LB250', 'MITSUBISHI_MV1200R')"),
    operations: z.array(z.any()).min(1).describe("Operations array (schema validated by routed engine)"),
    config: z.record(z.string(), z.any()).optional().describe("Config object (schema validated by routed engine)"),
  }),

  // ENGINE-WIRE-CAM-MS0/U-WIRE-CAM-BATCH1: 6 unwired CAM engines
  cam_recommend: z.object({
    analysis: z.record(z.string(), z.unknown()).describe("PartAnalysis object — see CAMRecommendEngine"),
    machineType: z.string().optional().describe("Optional machine type ('mill', 'lathe', etc.)"),
  }).passthrough(),
  cam_strategy_optimal_select: z.object({}).passthrough().describe(
    "Forwarded to OptimalStrategySelectionEngine.selectOptimal — see engine for shape",
  ),
  cam_toolpath_force_profile: z.object({
    segments: z.array(z.unknown()).min(1).describe("Toolpath segments to analyze"),
  }).passthrough(),
  cam_toolpath_segment_optimize: z.object({
    segments: z.array(z.unknown()).min(1).describe("Toolpath segments"),
    constraints: z.unknown().optional().describe("Optional optimization constraints"),
  }).passthrough(),
  cam_toolpath_strategy_route: z.object({
    material: z.string().optional().describe("Material name"),
    operation: z.string().optional().describe("Operation type"),
    priority: z.enum(["speed", "quality", "tool_life", "cost"]).optional().describe("Optimization priority"),
  }).passthrough(),
  cam_hsm_dwell_at_corner: z.object({
    corner: z.record(z.string(), z.unknown()).describe("CornerGeometry object"),
    servo: z.record(z.string(), z.unknown()).describe("MachineServo object"),
    hsm: z.record(z.string(), z.unknown()).describe("HSMParameters object"),
  }).passthrough(),

  // ENGINE-WIRE-POST-MS0/U-WIRE-POST-BATCH1: 6 unwired post processor engines
  post_gcode_snippet_get: z.object({
    id: z.string().min(1).describe("Snippet id"),
  }).passthrough(),
  post_gcode_snippet_fill: z.object({
    id: z.string().min(1).describe("Snippet id"),
    params: z.record(z.string(), z.union([z.string(), z.number()])).describe("Template variable substitutions"),
  }).passthrough(),
  post_gcode_tokenize: z.object({
    gcode: z.string().min(1).describe("Raw G-code program"),
  }).passthrough(),
  post_fanuc_legacy_profile: z.object({
    model: z.string().optional().describe("Optional Fanuc legacy model id (omitted = list all)"),
  }).passthrough(),
  post_okuma_legacy_detect: z.object({
    program_lines: z.array(z.string()).min(1).describe("Program text split into lines"),
  }).passthrough(),
  post_siemens_legacy_profile: z.object({
    machineType: z.string().min(1).describe("Machine type (e.g., '3_axis_lathe')"),
    controllerSeries: z.string().optional().describe("Optional controller series filter"),
  }).passthrough(),

  // U-DOCU-04 / MS-DOCU-INGEST: BlueprintProgramJoinEngine query-layer lookups.
  // Mirrors program_for_print / print_for_program in devActionSchemas.ts. Strict
  // single-param objects (no .passthrough()) — path options are intentionally NOT
  // accepted: the actions always query the default Docustrata/.index v6 join, so
  // there is no arbitrary-file-read surface and no cross-action cache poisoning.
  cam_program_for_print: z.object({
    part_number: z.string().min(1).describe("Part number from a print / title block — loose-normalized before lookup (op-prefix / material-code / rev-letter stripped)"),
  }),
  cam_print_for_program: z.object({
    program_path: z.string().min(1).describe("Program/CAD file path (any slash style, any case) — returns the print(s) joined to it"),
  }),
};
