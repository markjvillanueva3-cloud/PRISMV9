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
    constraints: z.record(z.string(), z.unknown()).optional().describe("Additional constraints"),
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
  }),

  /** Auto-route to correct master post engine by machine model */
  master_post_by_machine: z.object({
    machine_model: z.string().describe("Machine model identifier (e.g., 'HURCO_VMX24', 'OKUMA_LB250', 'MITSUBISHI_MV1200R')"),
    operations: z.array(z.unknown()).min(1).describe("Operations array (schema validated by routed engine)"),
    config: z.record(z.string(), z.unknown()).optional().describe("Config object (schema validated by routed engine)"),
  }),

  // WEDM-WIRE-MS0: lightweight orphan engine wiring (verify + tier6 gate + pre-flight)
  wedm_program_verify: z.object({}).passthrough().describe("VerificationInput for WEDMProgramVerificationEngine.verify() - passthrough until interface surfaced"),
  wedm_tier6_geom_validate: z.object({}).passthrough().describe("Tier6GeomInput for WEDMTier6GeomGateEngine.validate() - passthrough until interface surfaced"),
  wedm_preflight_checklist: z.object({}).passthrough().describe("PreFlightInput for WEDMPreFlightCheckEngine.generateChecklist() - passthrough until interface surfaced"),
  // WEDM-WIRE-MS0/Batch2: wire-break risk + setup sheet + job-pattern learner
  wedm_wire_break_risk: z.object({}).passthrough().describe("WireBreakRiskInput for WEDMWireBreakRiskCostEngine.calculate() - passthrough until interface surfaced"),
  wedm_setup_sheet_generate: z.object({
    program_result: z.record(z.string(), z.unknown()).describe("WEDMProgramResult from a prior wedm_program_* action"),
    hardness_hrc: z.number().min(0).max(80).optional().describe("Workpiece hardness HRC (default 60)"),
  }).passthrough(),
  wedm_job_pattern_learn: z.object({
    jobs: z.array(z.record(z.string(), z.unknown())).min(1).describe("JobRecord[] array - past WEDM jobs to learn patterns from"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch3: corner physics + dielectric correction + current density guard
  wedm_corner_analyze: z.object({
    input: z.record(z.string(), z.unknown()).describe("CornerAnalysisInput - corner geometry + wire/material context for WEDMCornerPhysicsEngine.analyzeCorner()"),
  }).passthrough(),
  wedm_dielectric_correct: z.object({
    input: z.record(z.string(), z.unknown()).describe("DielectricCorrectionInput - dielectric type + temperature + flow context for WEDMDielectricCorrectionEngine.calculateCorrectedGap()"),
  }).passthrough(),
  wedm_current_density_validate: z.object({
    input: z.record(z.string(), z.unknown()).describe("CurrentDensityInput - wire spec + peak current for WEDMCurrentDensityGuardEngine.validate()"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch4: HAZ + gap voltage + deviation-to-tip
  wedm_haz_predict: z.object({
    input: z.record(z.string(), z.unknown()).describe("HAZInput - heat-affected-zone prediction context (energy, material, dielectric) for WEDMHeatAffectedZoneEngine.predict()"),
  }).passthrough(),
  wedm_gap_voltage_calc: z.object({
    input: z.record(z.string(), z.unknown()).describe("GapVoltageInput - gap voltage controller context for WEDMGapVoltageControlEngine.calculate()"),
  }).passthrough(),
  wedm_deviation_to_tip: z.object({
    deviations: z.array(z.record(z.string(), z.unknown())).min(1).describe("DeviationRecord[] - prior cut deviations to learn tribal tips from"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch5: kerf width + MRR physics + dielectric flush adjust
  wedm_kerf_predict: z.object({
    input: z.record(z.string(), z.unknown()).describe("KerfWidthInput - wire diameter + spark gap + material context for WEDMKerfWidthEngine.predict()"),
  }).passthrough(),
  wedm_mrr_calc: z.object({
    input: z.record(z.string(), z.unknown()).describe("MRRInput - thermal/material removal rate physics input for WEDMMRRPhysicsEngine.calculate()"),
  }).passthrough(),
  wedm_dielectric_flush_adjust: z.object({
    input: z.record(z.string(), z.unknown()).describe("DielectricFlushAdjustInput - dielectric flow + pressure + cut depth for WEDMDielectricFlushAdjustEngine.calculate()"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch6: machine state ingest + spark DB resolve + kalman fusion
  wedm_machine_state_ingest: z.object({
    reading: z.record(z.string(), z.unknown()).describe("WEDMSensorReading - sensor packet (gap voltage/current/feed/etc) to ingest into rolling state"),
    now_ms: z.number().optional().describe("Optional epoch ms timestamp override (defaults to Date.now())"),
  }).passthrough(),
  wedm_material_spark_resolve: z.object({
    query: z.string().min(1).describe("Material name or alias to resolve to a WEDMSparkSignature (e.g. 'D2', 'A2_HRC60')"),
  }).passthrough(),
  wedm_kalman_fuse: z.object({
    reading: z.record(z.string(), z.unknown()).describe("WEDMSensorReading - raw sensor packet to fuse via Kalman filter into WEDMFusedState"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch7: job cost + job creator + job outcome record
  wedm_job_cost_calc: z.object({
    input: z.record(z.string(), z.unknown()).describe("JobCostInput - operation list + machine + material for WEDMJobCostEngine.calculateJobCost()"),
  }).passthrough(),
  wedm_job_create: z.object({
    program: z.record(z.string(), z.unknown()).describe("WEDMProgramResult from a prior wedm_program_* action — drives operation list + NC text"),
    options: z.record(z.string(), z.unknown()).optional().describe("JobOptions — quantity, notes, customer, due date"),
    quote: z.record(z.string(), z.unknown()).optional().describe("Quote — optional quote tying job to a sales order"),
  }).passthrough(),
  wedm_job_outcome_record: z.object({
    input: z.unknown().describe("Job outcome record — actual cycle time, scrap, deviations (validated by engine)"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch8: DXF closure validate + drift detect + calibration report
  wedm_dxf_closure_validate: z.object({
    segments: z.array(z.record(z.string(), z.unknown())).min(1).describe("DXFSegment[] - DXF entity segments to validate for closure (gaps/overlaps/near-misses)"),
  }).passthrough(),
  wedm_drift_detect: z.object({
    input: z.record(z.string(), z.unknown()).describe("DriftInput - rolling stats input for WEDMDriftDetectionEngine.detect()"),
  }).passthrough(),
  wedm_calibration_report: z.object({
    input: z.record(z.string(), z.unknown()).describe("CalibrationInput - calibration measurements for WEDMCalibrationReportEngine.generate()"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch9: neighbor query + formula fusion + ML observation
  wedm_neighbor_nearest: z.object({
    cell: z.record(z.string(), z.unknown()).describe("CellQuery - lattice cell query (material/wire/dielectric/etc) for WEDMNeighborQueryEngine.nearestForCell()"),
    opts: z.record(z.string(), z.unknown()).optional().describe("QueryOptions - optional k/distance overrides"),
  }).passthrough(),
  wedm_neural_formula_fuse: z.object({
    estimators: z.array(z.record(z.string(), z.unknown())).min(1).describe("FormulaEstimate[] - estimator outputs to fuse via Neural ensemble"),
    ctx: z.record(z.string(), z.unknown()).describe("FusionContext - material/dielectric/wire context for WEDMNeuralFormulaFusionEngine.fuse()"),
  }).passthrough(),
  wedm_ml_observe: z.object({
    session_id: z.string().min(1).describe("ML optimization session ID (created by upstream session_init action)"),
    observation: z.record(z.string(), z.unknown()).describe("WEDMObservation - measured outcome for the prior parameter suggestion"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch10: learning loop recommend + batch process + lattice graph build
  wedm_learning_recommend: z.object({
    material: z.string().min(1).describe("Material name (e.g. 'D2', 'A2_HRC60') for WEDMLearningLoopEngine.getRecommendations()"),
    thickness_mm: z.number().describe("Workpiece thickness in mm (binned to nearest 5mm internally)"),
  }).passthrough(),
  wedm_batch_process: z.object({
    input: z.record(z.string(), z.unknown()).describe("BatchInput - profiles + grouping strategy for WEDMMultiProfileBatchEngine.processBatch()"),
  }).passthrough(),
  wedm_lattice_build: z.object({
    opts: z.record(z.string(), z.unknown()).optional().describe("BuildOptions - optional lattice build params (defaults supplied if omitted)"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch11: post dialect route + power density guard + program compare
  wedm_post_route: z.object({
    input: z.record(z.string(), z.unknown()).describe("WEDMPostInput - controller dialect + program context for WEDMPostDialectRouterEngine.route()"),
  }).passthrough(),
  wedm_power_density_validate: z.object({
    input: z.record(z.string(), z.unknown()).describe("PowerDensityInput - peak power + spark area for WEDMPowerDensityGuardEngine.validate()"),
  }).passthrough(),
  wedm_program_compare: z.object({
    reference_nc: z.string().describe("Reference NC program text (golden master)"),
    generated_nc: z.string().describe("Generated NC program text to compare against reference"),
    options: z.record(z.string(), z.unknown()).optional().describe("Optional comparison options (filename hints, tolerance overrides)"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch12: print-to-program (async) + overage approval + credit cost
  wedm_print_to_program: z.object({
    input: z.record(z.string(), z.unknown()).describe("WEDMGenerateInput - print + material + thickness + machine context for WEDMPrintToProgramEngine.generate() (async, awaits self-awareness lookup)"),
  }).passthrough(),
  wedm_overage_request: z.object({
    input: z.record(z.string(), z.unknown()).describe("OverageRequestInput - job_id + overage_amount + reason for WEDMOverageApprovalEngine.createRequest()"),
  }).passthrough(),
  wedm_credit_cost_calc: z.object({
    input: z.record(z.string(), z.unknown()).describe("CreditCostInput - cycle time + power + dielectric usage for WEDMCreditCostEngine.calculate()"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch13: post Mitsubishi + Fanuc + Makino (controller-specific generate)
  wedm_post_mitsubishi: z.object({
    input: z.record(z.string(), z.unknown()).describe("WEDMPostInput - controller-specific post for WEDMPostMitsubishiEngine.generate() — emits Mitsubishi-dialect G-code with E-code condition references"),
  }).passthrough(),
  wedm_post_fanuc: z.object({
    input: z.record(z.string(), z.unknown()).describe("WEDMPostInput - controller-specific post for WEDMPostFanucEngine.generate() — emits Fanuc-dialect G-code with C-code condition labels"),
  }).passthrough(),
  wedm_post_makino: z.object({
    input: z.record(z.string(), z.unknown()).describe("WEDMPostInput - controller-specific post for WEDMPostMakinoEngine.generate() — emits Makino-dialect G-code"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch14: post Sodick + Agie + DWG import (async)
  wedm_post_sodick: z.object({
    input: z.record(z.string(), z.unknown()).describe("WEDMPostInput - controller-specific post for WEDMPostSodickEngine.generate() — emits Sodick-dialect G-code with E/S tech-table conditions"),
  }).passthrough(),
  wedm_post_agie: z.object({
    input: z.record(z.string(), z.unknown()).describe("WEDMPostInput - controller-specific post for WEDMPostAgieEngine.generate() — emits AgieCharmilles-dialect G-code with TEC/pulse table"),
  }).passthrough(),
  wedm_dwg_import: z.object({
    input: z.record(z.string(), z.unknown()).describe("DwgImportInput - DWG file path + converter config for WEDMDwgImportEngine.import() (async, shells out to LibreDWG/ODA)"),
  }).passthrough(),
  // WEDM-WIRE-MS0/Batch15: Ra predictor + recast depth + pulse limit
  wedm_ra_predict: z.object({
    input: z.record(z.string(), z.unknown()).describe("RaPredictionInput - cut params + material context for WEDMRaPredictorEngine.predict() — surface roughness Ra prediction"),
  }).passthrough(),
  wedm_recast_depth_predict: z.object({
    input: z.record(z.string(), z.unknown()).describe("RecastPredictionInput - energy + material context for WEDMRecastDepthPredictorEngine.predict() — recast layer depth"),
  }).passthrough(),
  wedm_pulse_limit_validate: z.object({
    input: z.record(z.string(), z.unknown()).describe("PulseLimitInput - pulse on-time + off-time + peak current for WEDMPulseLimitEngine.validate() — safety limit gate"),
  }).passthrough(),
};
