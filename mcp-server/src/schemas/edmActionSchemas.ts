/**
 * Zod schemas for legacy EDM dispatcher actions
 * @description Schema definitions for electrode design, wire settings,
 * surface integrity, micro EDM, laser, waterjet, and sinker EDM actions
 */
import { z } from 'zod';

// ─── ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH2: 6 unwired WEDM engines ─────

const point2D = z.object({ x: z.number(), y: z.number() }).describe("2D point.");
const boundingBox = z
  .object({
    min: point2D,
    max: point2D,
    width_mm: z.number().positive(),
    height_mm: z.number().positive(),
  })
  .describe("Axis-aligned bounding box.");

/** wedm_adaptive_pass_count — WEDMAdaptivePassEngine.calculatePassCount */
const wedm_adaptive_pass_count = z
  .object({
    target_tolerance_mm: z.number().positive().describe("Target dimensional tolerance (mm)."),
    thickness_mm: z.number().positive().describe("Workpiece thickness (mm)."),
    surface_finish_Ra_um: z.number().positive().optional(),
    material: z.string().optional(),
    wire_diameter_mm: z.number().positive().optional(),
    spark_gap_mm: z.number().positive().optional(),
    total_offset_mm: z.number().positive().optional(),
  })
  .passthrough()
  .describe("AdaptivePassInput for WEDM pass-count calculation.");

/** wedm_adaptive_offsets — WEDMAdaptivePassEngine.calculateOffsets */
const wedm_adaptive_offsets = z
  .object({
    totalPasses: z.number().int().positive().describe("Total number of passes (>= 1)."),
    totalOffset: z.number().positive().describe("Total radial offset to distribute (mm)."),
  })
  .passthrough()
  .describe("Pass-count + total-offset for offset distribution.");

/** wedm_accessibility_analyze — WEDMAccessibilityEngine.analyze */
const wedm_accessibility_analyze = z
  .object({
    profiles: z
      .array(
        z.object({
          name: z.string().min(1),
          path: z.array(point2D).min(2),
          is_through: z.boolean(),
        }),
      )
      .min(1)
      .describe("Wire-path profiles."),
    start_holes: z
      .array(
        z.object({
          id: z.string().min(1),
          x_mm: z.number(),
          y_mm: z.number(),
          diameter_mm: z.number().positive(),
          depth_mm: z.number().positive(),
          method: z.string().min(1),
          serves_profiles: z.array(z.string()),
          auto_thread_compatible: z.boolean(),
        }),
      )
      .describe("Start-hole plan."),
    clamps: z
      .array(
        z.object({
          id: z.string().min(1),
          type: z.string().min(1),
          footprint: boundingBox,
          height_mm: z.number().nonnegative(),
          over_top: z.boolean(),
        }),
      )
      .describe("Workholding clamps."),
    workpiece: z
      .object({
        bounds: boundingBox,
        thickness_mm: z.number().positive(),
        origin: point2D,
      })
      .describe("Workpiece footprint."),
    wire_envelope: z
      .object({
        upper_guide_z_mm: z.number(),
        lower_guide_z_mm: z.number(),
        max_taper_deg: z.number().nonnegative(),
      })
      .optional(),
    min_clamp_clearance_mm: z.number().nonnegative().optional(),
    min_edge_clearance_mm: z.number().nonnegative().optional(),
    min_wall_thickness_mm: z.number().nonnegative().optional(),
  })
  .passthrough()
  .describe("ProfileAccessInput for WEDM accessibility analysis.");

/** wedm_current_density_validate — WEDMCurrentDensityGuardEngine.validate */
const wedm_current_density_validate = z
  .object({
    current_A: z.number().positive().describe("Discharge current (Amps)."),
    wire_diameter_mm: z.number().positive().describe("Wire diameter (mm)."),
    wire_material: z.string().optional(),
    wire_spec_id: z.string().optional(),
    safety_margin: z.number().min(0).max(1).optional(),
  })
  .passthrough()
  .describe("CurrentDensityInput for current-density safety validation.");

/** wedm_benchmark_classify — WEDMBenchmarkToleranceEngine.classify */
const wedm_benchmark_classify = z
  .object({
    deviation_pct: z.number().describe("Deviation from benchmark (percent, signed)."),
    key: z
      .enum([
        "area_cutting_rate_pct",
        "kerf_width_pct",
        "surface_finish_ra_pct",
        "d2_rough_speed_pct",
        "offset_cascade_pct",
        "rough_speed_pct_default",
      ])
      .describe("Benchmark band key."),
  })
  .passthrough()
  .describe("Classify a deviation against a published WEDM benchmark band.");

/** wedm_archive_backfill_state — WEDMArchiveBackfillEngine.getState */
const wedm_archive_backfill_state = z
  .object({})
  .passthrough()
  .describe("No-arg backfill-state read.");

// ─── ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH3: 6 unwired analogy/autonomy/blackboard/calibration engines ─

/** wedm_analogy_retrieve — WEDMAnalogicalReasoningEngine.retrieve */
const wedm_analogy_retrieve = z
  .object({
    material: z.string().min(1).describe("WEDM material key (e.g. D2, A2, M2, S7, H13, WC)."),
    thickness_mm: z.number().positive().describe("Workpiece thickness (mm)."),
    perimeter_mm: z.number().positive().describe("Cut perimeter length (mm)."),
    ra_target_um: z.number().positive().optional().describe("Optional surface-finish target (µm Ra)."),
    mrr_class: z.enum(["low", "medium", "high"]).optional(),
    top_n: z.number().int().positive().optional().describe("Top-N case retrieval count."),
  })
  .passthrough()
  .describe("WEDMAnalogyQuery for case-based-reasoning retrieval.");

/** wedm_analogy_size — WEDMAnalogicalReasoningEngine.size */
const wedm_analogy_size = z
  .object({})
  .passthrough()
  .describe("No-arg analogy-case-base size read.");

/** wedm_autonomy_can — WEDMAutonomyEngine.can */
const wedm_autonomy_can = z
  .object({
    capability: z
      .enum([
        "suggest_parameters",
        "auto_adjust_parameters",
        "execute_job_supervised",
        "execute_job_unattended",
        "self_modify_policy",
      ])
      .describe("Autonomy capability to check against current level."),
  })
  .passthrough()
  .describe("Check if current autonomy level permits the named capability.");

/** wedm_blackboard_post — WEDMBlackboardEngine.post */
const wedm_blackboard_post = z
  .object({
    namespace: z.string().min(1).describe("Blackboard namespace (slash-separated)."),
    key: z.string().min(1).describe("Entry key within the namespace."),
    value: z.unknown().describe("Entry value (any JSON-serializable)."),
    tag: z
      .enum(["observation", "hypothesis", "constraint", "decision", "warning"])
      .describe("Entry classification tag."),
    source: z.string().min(1).describe("Source identifier (engine/agent name)."),
    opts: z
      .object({
        ttlMs: z.number().int().positive().optional(),
        confidence: z.number().min(0).max(1).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .describe("Post a tagged entry to the WEDM blackboard.");

/** wedm_blackboard_read — WEDMBlackboardEngine.read */
const wedm_blackboard_read = z
  .object({
    namespace: z.string().min(1).describe("Blackboard namespace."),
    key: z.string().min(1).describe("Entry key within the namespace."),
  })
  .passthrough()
  .describe("Read latest blackboard entry for namespace+key (or null).");

// ─── ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH4: 6 unwired learning/drift/dialect/failsafe/diagnosis/fixture engines ─

/** wedm_learning_snapshot — WEDMContinuousLearningEngine.snapshot */
const wedm_learning_snapshot = z
  .object({
    material: z.string().min(1).describe("Material key for which to fetch learning snapshot."),
  })
  .passthrough()
  .describe("Snapshot of continuous-learning state for a material.");

/** wedm_dialect_verify — WEDMControllerDialectVerifierEngine.verify */
const wedm_dialect_verify = z
  .object({
    program_text: z.string().min(1).describe("Full emitted G-code program (multi-line)."),
    expected_controller: z.string().min(1).describe("Declared controller (canonical key or synonym)."),
    min_signature_hits: z.number().int().nonnegative().optional(),
  })
  .passthrough()
  .describe("Verify program_text dialect matches expected_controller via signature scoring.");

/** wedm_drift_detect — WEDMDriftDetectionEngine.detect */
const wedm_drift_detect = z
  .object({
    modelId: z.string().min(1).describe("Identifier of model to evaluate for drift."),
    baseline: z.record(z.string(), z.unknown()).describe("Baseline DriftWindow."),
    current: z.record(z.string(), z.unknown()).describe("Current DriftWindow."),
    threshold: z.number().positive().optional(),
    buckets: z.number().int().positive().optional(),
  })
  .passthrough()
  .describe("Run drift detection (PSI + Page-Hinkley) on baseline vs current windows.");

/** wedm_failsafe_from_clearance — WEDMFailsafeEngine.planFromClearance */
const wedm_failsafe_from_clearance = z
  .object({
    pose: z.record(z.string(), z.unknown()).optional(),
    pass: z.boolean().optional(),
    minClearance_mm: z.number().optional(),
    events: z.array(z.record(z.string(), z.unknown())).optional(),
  })
  .passthrough()
  .describe("ClearanceReport — failsafe planner derives recovery actions from clearance violations.");

/** wedm_fault_diagnose — WEDMFaultDiagnosisEngine.diagnose */
const wedm_fault_diagnose = z
  .object({
    symptoms: z
      .array(z.record(z.string(), z.unknown()))
      .min(1)
      .describe("ObservedSymptom array (variable, direction, severity)."),
    max_hops: z.number().int().positive().optional(),
    top_n: z.number().int().positive().optional(),
  })
  .passthrough()
  .describe("Causal-graph fault diagnosis from observed symptoms.");

/** wedm_fixture_interference — WEDMFixtureInterferenceEngine.analyze */
const wedm_fixture_interference = z
  .object({
    workpiece: z.record(z.string(), z.unknown()).describe("WorkpieceFootprint."),
    clamps: z.array(z.record(z.string(), z.unknown())).describe("ClampRegion[]."),
    profiles: z.array(z.record(z.string(), z.unknown())).describe("ProfileTrajectory[]."),
    wire_envelope: z.record(z.string(), z.unknown()).optional(),
    min_clearance_mm: z.number().positive().optional(),
  })
  .passthrough()
  .describe("FixtureInterferenceInput — wire path vs clamp clearance check.");

/** wedm_offset_spc — WEDMOffsetSPCEngine.analyze (ARC-MS10/muS-D54..D55) */
const wedm_offset_spc = z
  .object({
    subgroups: z
      .array(z.array(z.number()).min(2))
      .min(2)
      .describe("Subgroups of measured wire-offset values, µm (each subgroup size 2..10)."),
    nominalOffsetUm: z
      .number()
      .positive()
      .optional()
      .describe("Target / programmed nominal offset, µm — for the compensation calc."),
    specLimitsUm: z
      .object({
        lower: z.number().describe("Lower spec limit, µm."),
        upper: z.number().describe("Upper spec limit, µm."),
      })
      .optional()
      .describe("Offset dimensional spec limits, µm, for Cp/Cpk."),
    context: z
      .object({
        wireDiameterMm: z.number().positive().optional().describe("Wire diameter, mm."),
        passNumber: z.number().int().positive().optional().describe("Cut pass number."),
        dielectric: z.string().optional().describe("Dielectric fluid identifier."),
      })
      .optional()
      .describe("Optional WEDM context to sharpen root-cause hypotheses."),
  })
  .passthrough()
  .describe("X-bar/R SPC + Western Electric rules on a measured wire-EDM offset series.");

// ─── ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH5: 6 unwired credit/deviation/dielectric/exception/active-query engines ─

/** wedm_credit_cost_calc — WEDMCreditCostEngine.calculate */
const wedm_credit_cost_calc = z
  .object({
    perimeter_mm: z.number().positive().describe("Cut perimeter (mm)."),
    thickness_mm: z.number().positive().describe("Workpiece thickness (mm)."),
    passes: z.number().int().positive().describe("Number of passes."),
    taper_count: z.number().int().nonnegative().optional(),
  })
  .passthrough()
  .describe("Compute job cost in credits from cutting area + passes.");

/** wedm_deviation_analyze — WEDMDeviationToTipEngine.analyze */
const wedm_deviation_analyze = z
  .array(
    z
      .object({
        job_id: z.string().min(1),
        deviation_type: z.enum([
          "surface_finish",
          "cut_speed",
          "wire_consumption",
          "cycle_time",
          "accuracy",
        ]),
        predicted_value: z.number(),
        actual_value: z.number(),
        unit: z.string().min(1),
        material: z.string().min(1),
        thickness_mm: z.number().positive(),
        wire_type: z.string().min(1),
      })
      .passthrough(),
  )
  .min(1)
  .describe("Array of DeviationRecord — engine analyzes for tip-generation patterns.");

/** wedm_dielectric_flush_calc — WEDMDielectricFlushAdjustEngine.calculate */
const wedm_dielectric_flush_calc = z
  .object({
    baseline_flush_pressure_bar: z.number().positive().describe("Baseline flush pressure (bar)."),
    conductivity_uS_cm: z.number().positive().describe("Measured dielectric conductivity (µS/cm)."),
    thickness_mm: z.number().positive().optional(),
  })
  .passthrough()
  .describe("DielectricFlushAdjustInput — adjust flush pressure for conductivity + thickness.");

/** wedm_exception_handle — WEDMExceptionHandlerEngine.handle */
const wedm_exception_handle = z
  .object({
    type: z
      .enum([
        "wire_break",
        "short_circuit",
        "open_circuit",
        "tank_low",
        "resistivity_high",
        "resistivity_low",
        "servo_fault",
        "axis_overrun",
        "wire_tension_out",
        "filter_clogged",
      ])
      .describe("Exception type for recovery-policy lookup."),
    message: z.string().optional(),
    at: z.string().optional(),
    context: z.record(z.string(), z.unknown()).optional(),
  })
  .passthrough()
  .describe("WEDMException for recovery plan lookup via DEFAULT_POLICY ladder.");

/** wedm_exception_record — WEDMExceptionHandlerEngine.recordOutcome */
const wedm_exception_record = z
  .object({
    type: z.enum([
      "wire_break",
      "short_circuit",
      "open_circuit",
      "tank_low",
      "resistivity_high",
      "resistivity_low",
      "servo_fault",
      "axis_overrun",
      "wire_tension_out",
      "filter_clogged",
    ]),
    success: z.boolean().describe("Whether the recovery action succeeded."),
  })
  .passthrough()
  .describe("Record exception-recovery outcome for policy adaptation.");

/** wedm_active_query_grid — WEDMActiveQueryEngine.generateCandidateGrid */
const wedm_active_query_grid = z
  .object({
    features: z.record(z.string(), z.unknown()).describe("UnknownMaterialFeatures (engine-defined shape)."),
    opts: z
      .object({
        spreadMin: z.number().positive().optional(),
        spreadMax: z.number().positive().optional(),
        stepsPerAxis: z.number().int().min(2).optional(),
        centre: z.record(z.string(), z.unknown()).optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough()
  .describe("Generate candidate WEDMRecipe grid for active learning.");

/** wedm_calibration_generate — WEDMCalibrationReportEngine.generate */
const wedm_calibration_generate = z
  .object({
    shop_program: z
      .object({
        filename: z.string().min(1),
        material_iso_group: z.enum(["P", "M", "K", "N", "S", "H"]),
        thickness_mm: z.number().positive(),
        wire_diameter_mm: z.number().positive(),
        num_passes: z.number().int().positive(),
        offsets_mm: z.array(z.number()),
        feeds_mmmin: z.array(z.number().nullable()),
        e_codes: z.array(z.string()),
        has_taper: z.boolean(),
        has_adaptive_control: z.boolean(),
        is_bimaterial: z.boolean().optional(),
        hardness_hrc: z.number().optional(),
      })
      .passthrough()
      .describe("Parsed program parameters from WireEDMProgramParserEngine."),
  })
  .passthrough()
  .describe("CalibrationInput to compare shop program against published benchmarks.");

// ─── ENGINE-WIRE-WEDM-MS0/U-WIRE-WEDM-BATCH6: 6 unwired audit/awareness/dxf/degradation/ewc engines ─

const AUTONOMY_AUDIT_ACTIONS = [
  "promote", "demote", "manual_promote", "manual_degrade", "status_read", "history_read",
] as const;
const AUTONOMY_AUDIT_OUTCOMES = ["success", "denied", "failed"] as const;

/** wedm_autonomy_audit_record — WEDMAutonomyAuditEngine.record */
const wedm_autonomy_audit_record = z
  .object({
    action: z.enum(AUTONOMY_AUDIT_ACTIONS).describe("HTTP action against the autonomy API."),
    user_id: z.string().nullable().describe("Auth principal."),
    user_roles: z.array(z.string()).default([]).describe("Auth roles from Bearer."),
    remote_ip: z.string().nullable().default(null),
    actor: z.string().nullable().default(null),
    reason: z.string().nullable().default(null),
    level_from: z.number().nullable().default(null),
    level_to: z.number().nullable().default(null),
    outcome: z.enum(AUTONOMY_AUDIT_OUTCOMES).describe("Outcome of the request."),
    error: z.string().nullable().default(null),
    counter_signed: z.boolean().default(false),
  })
  .passthrough()
  .describe("Append a tamper-evident autonomy-audit log entry.");

/** wedm_awareness_register_dispatcher — WEDMAwarenessAdoptionEngine.registerDispatcher */
const wedm_awareness_register_dispatcher = z
  .object({
    dispatcher: z.string().min(1).describe("Dispatcher name (e.g. 'prism_edm')."),
    actions: z.array(z.string().min(1)).min(1).describe("List of action names exposed by the dispatcher."),
  })
  .passthrough()
  .describe("Register a dispatcher's WEDM-relevant action surface for adoption tracking.");

/** wedm_dxf_validate — WEDMDXFClosureValidatorEngine.validate */
const wedm_dxf_validate = z
  .array(
    z
      .object({
        id: z.string().min(1),
        type: z.enum(["line", "arc", "circle", "polyline", "spline"]),
        start: z.object({ x: z.number(), y: z.number() }),
        end: z.object({ x: z.number(), y: z.number() }),
        center: z.object({ x: z.number(), y: z.number() }).optional(),
        radius: z.number().optional(),
        bulge: z.number().optional(),
      })
      .passthrough(),
  )
  .min(1)
  .describe("Validate DXF segment closure (gap/overlap/winding/self-intersect).");

/** wedm_degradation_update — WEDMDegradationModelEngine.update */
const wedm_degradation_update = z
  .object({
    dt_hours: z.number().positive().describe("Tick length in hours."),
    wire_tension_gf: z.number().nonnegative(),
    wire_feed_mm_s: z.number().nonnegative(),
    discharge_current_A: z.number().nonnegative(),
    pulse_on_us: z.number().nonnegative(),
    pulses: z.number().nonnegative(),
    conductivity_uS_cm: z.number().nonnegative(),
    flow_L_min: z.number().nonnegative(),
    debris_rate_mg_hr: z.number().nonnegative(),
    pulse_energy_mJ: z.number().nonnegative(),
  })
  .passthrough()
  .describe("Apply incremental usage delta and return updated degradation snapshot.");

/** wedm_degradation_snapshot — WEDMDegradationModelEngine.snapshot */
const wedm_degradation_snapshot = z
  .object({})
  .passthrough()
  .describe("Read current degradation snapshot (no input required).");

/** wedm_ewc_list_slots — WEDMEWCMemoryEngine.listSlots */
const wedm_ewc_list_slots = z
  .object({})
  .passthrough()
  .describe("List EWC consolidation slots (no input required).");

// OBSIDIAN-AUTOMATE-MS3/U-WEDM-FEEDBACK-EXPOSE: surface WEDMFeedbackCalibrationEngine
const wedm_feedback_submit = z.object({
  material: z.string().min(1).describe("Material code (e.g. D2, 304SS, INC718)"),
  thickness_mm: z.number().positive().describe("Workpiece thickness in mm"),
  predicted_ra_um: z.number().nonnegative().describe("Predicted surface finish Ra (µm) from program generation"),
  actual_ra_um: z.number().nonnegative().describe("Actual measured surface finish Ra (µm)"),
  predicted_time_min: z.number().positive().describe("Predicted cycle time (min)"),
  actual_time_min: z.number().positive().describe("Actual cycle time (min)"),
  notes: z.string().optional().describe("Operator notes"),
  wire_breaks: z.number().int().nonnegative().optional().describe("Wire breaks during job"),
  machine: z.string().optional().describe("Machine identifier (for stratification)"),
}).describe("Submit operator feedback to update Bayesian calibration constants (k_ra, eta_mrr).");

const wedm_feedback_get_calibration = z.object({
  material: z.string().min(1).describe("Material to retrieve calibration constants for"),
}).describe("Get current Bayesian calibration constants and sample count for a material.");

const wedm_feedback_history = z.object({
  limit: z.number().int().positive().max(500).optional().describe("Max history rows to return (default 20)"),
}).describe("Get recent feedback submission history with timestamps.");

const wedm_feedback_reset = z.object({
  material: z.string().min(1).describe("Material to reset calibration for"),
}).describe("Reset calibration constants for a material back to defaults.");

// ─── BRIDGE-WIRING/U-WIRE-TRILOBE-ELECTRODE-GEOMETRY ────────────────────────
// TrilobeElectrodeGeometryEngine — parametric trilobe (taptite) electrode
// geometry generator. Op-discriminator over 3 methods (generate/get_profile/
// stats). 'op' is z.enum (NOT z.string) per schemas.md. The generate op carries
// the full TrilobeInput; lobe_count is fixed at 3 by the dispatcher (taptite
// invariant) so it is intentionally absent from the schema.
const trilobe_electrode_geometry = z.object({
  op: z.enum(["generate", "get_profile", "stats"])
    .describe("TrilobeElectrodeGeometryEngine method discriminator"),
  // ── generate op fields ──
  part_number: z.string().min(1).optional()
    .describe("Part/order number (generate op only)"),
  customer: z.string().optional()
    .describe("Customer name (generate op, optional)"),
  stages: z.array(z.object({
    c_dia_in: z.number().positive().describe("Major diameter across lobe crests [inches]"),
    e_dia_in: z.number().positive().describe("Minor diameter across valleys [inches]"),
    z_start_in: z.number().nonnegative().describe("Stage start Z [inches from datum]"),
    z_end_in: z.number().nonnegative().describe("Stage end Z [inches from datum]"),
  })).optional()
    .describe("Trilobe stages — C/E diameter pairs per Z range (generate op only; up to 3 for triple taptite)"),
  lead_angle_deg: z.number().nonnegative().optional()
    .describe("Lead angle for helical trilobes [degrees] — 0 for straight (generate op; default 0)"),
  total_length_in: z.number().positive().optional()
    .describe("Total electrode length [inches] (generate op only)"),
  shank_dia_in: z.number().positive().optional()
    .describe("Shank diameter [inches] for holder interface (generate op; default 0.5)"),
  draft_deg: z.number().nonnegative().optional()
    .describe("Draft angle [degrees], typically 0-5 (generate op; default 0)"),
  undersize_in: z.number().nonnegative().optional()
    .describe("Undersize for spark-gap compensation [inches] (generate op; default 0)"),
  oversize_in: z.number().nonnegative().optional()
    .describe("Oversize for rough electrodes [inches] (generate op; default 0)"),
  target_finish_Ra_um: z.number().positive().optional()
    .describe("Target surface finish [Ra µm] (generate op; default 1.6)"),
  workpiece_material: z.enum(["D2", "M2", "S7", "A2", "H13", "carbide"]).optional()
    .describe("Workpiece material — drives AI electrode-material + spark-gap recommendation (generate op; default D2)"),
  export_step: z.boolean().optional()
    .describe("Emit STEP (AP214) CAM export (generate op; default false)"),
  export_dxf: z.boolean().optional()
    .describe("Emit DXF 2D profile for WEDM (generate op; default false)"),
  export_gcode: z.boolean().optional()
    .describe("Emit Okuma OSP-P300 polar-interpolation G-code (generate op; default false)"),
  // ── get_profile op fields ──
  c_dia: z.number().positive().optional()
    .describe("Major diameter [inches] for a single-section profile preview (get_profile op only)"),
  e_dia: z.number().positive().optional()
    .describe("Minor diameter [inches] for a single-section profile preview (get_profile op only)"),
  rotation_deg: z.number().optional()
    .describe("Phase rotation [degrees] for the previewed profile (get_profile op; default 0)"),
}).describe("TrilobeElectrodeGeometryEngine — parametric trilobe/taptite electrode geometry + CAM exports (STEP/DXF/G-code). Op selects method; generate is async (includes an AI spark-gap recommendation). Per-op required fields validated by the dispatcher with fail-loud ok({error}).");

// ─── U-WIRE-BACKLOG-WEDM-POST-ROUTER (slot:india) ────────────────────────
// Schemas for the 6 WEDMPostDialectRouterEngine actions. The router fronts
// 5 vendor engines (Mitsubishi/Sodick/Makino/Agie/Fanuc) and 9 controller
// dialects. Schemas validate the dispatcher boundary; the engine performs
// further unsupported-controller checks and returns {success:false,…} on
// emission errors. Names mirror the controller union exported by
// WEDMPostTypes — we use z.string() here (not a strict enum) because the
// engine's getSupportedControllers() is the single source of truth and we
// don't want a duplicated enum to drift.

/** Operation shape mirrored from WEDMPostTypes.WEDMOperation. */
const wedm_post_operation = z
  .object({
    type: z.string().min(1).describe("Operation type, e.g. 'profile', 'taper', 'pierce'."),
    pass: z.string().min(1).describe("Pass identifier, e.g. 'rough', 'skim1', 'skim2'."),
  })
  .passthrough()
  .describe("WEDM post operation row.");

/** Common input shape for generate / convert / roundtrip emission endpoints. */
const wedm_post_emission_input = z
  .object({
    controller: z.string().min(1).describe("Controller id; must be one returned by wedm_post_supported_controllers."),
    thickness_mm: z.number().positive().optional().describe("Workpiece thickness in millimetres."),
    operations: z.array(wedm_post_operation).default([]).describe("Ordered list of WEDM operations to emit."),
  })
  .passthrough()
  .describe("WEDMPostInput — vendor engines may read additional optional fields.");

/** wedm_post_supported_controllers — list of supported controller ids (no params). */
const wedm_post_supported_controllers = z
  .object({})
  .strict()
  .describe("List all controller ids the master-post router can dispatch to (9 across 5 vendors). Takes no params; .strict() rejects accidental keys fail-loud.");

/** wedm_post_dialect_config — display config for one controller. */
const wedm_post_dialect_config = z
  .object({
    controller: z.string().min(1).describe("Controller id to introspect."),
  })
  .passthrough()
  .describe("Get the dialect display config (name, manufacturer, dialect_name) for one controller.");

/** wedm_post_select_by_machine — auto-detect controller from a machine description string. */
const wedm_post_select_by_machine = z
  .object({
    machine_description: z
      .string()
      .optional()
      .describe("Free-text machine description (e.g. 'Mitsubishi FA20S Advance')."),
  })
  .passthrough()
  .describe("Resolve a controller id from a shop-profile machine description.");

/** wedm_post_generate — emit G-code via the vendor engine for the chosen controller. */
const wedm_post_generate = wedm_post_emission_input.describe(
  "Generate vendor G-code for the specified controller.",
);

/** wedm_post_convert — emit the same plan through TWO controllers for cross-dialect compare.
 *  Omits `controller` from the base emission input — convert reads `source_dialect` and
 *  `target_dialect` and the engine internally spreads `{...input, controller: sourceDialect}`
 *  for each emit. Forcing operators to pass a third `controller` field on top of the
 *  source/target pair was a P1 caller-surprise in the first scrutiny pass. */
const wedm_post_convert = wedm_post_emission_input
  .omit({ controller: true })
  .extend({
    source_dialect: z.string().min(1).describe("Source controller id."),
    target_dialect: z.string().min(1).describe("Target controller id."),
  })
  .describe("Emit one plan through two controllers (cross-dialect comparison / roundtrip move). Reads source_dialect + target_dialect — no top-level controller field required.");

/** wedm_post_roundtrip — emit + re-parse via the same engine for OS-04 verification. */
const wedm_post_roundtrip = wedm_post_emission_input.describe(
  "Emit and immediately re-parse via the same vendor engine; returns {output, parsed}.",
);

/** sinker_agi_master — SinkerAGIMasterEngine.reason (AGI-MASTER-PARITY-MS30/P0-U02) */
const sinker_agi_master = z
  .object({
    intent: z
      .string()
      .min(1)
      .describe("Free-text description of the sinker-EDM task to plan."),
    reasoningMode: z
      .enum(["chain_of_thought", "multi_path", "deductive", "analogical"])
      .optional()
      .describe("Reasoning mode for the trace; defaults to chain_of_thought."),
    material: z
      .string()
      .optional()
      .describe("Electrode/workpiece material — folded into intent matching."),
    constraints: z
      .array(z.string())
      .optional()
      .describe("Free-text process constraints — folded into intent matching."),
  })
  .describe(
    "SinkerAGIMasterInput — route a die-sinking-EDM intent to an ordered plan of prism_edm actions.",
  );

/** laser_agi_master — LaserAGIMasterEngine.reason (AGI-MASTER-PARITY-MS30/P0-U03) */
const laser_agi_master = z
  .object({
    intent: z
      .string()
      .min(1)
      .describe("Free-text description of the laser-machining task to plan."),
    reasoningMode: z
      .enum(["chain_of_thought", "multi_path", "deductive", "analogical"])
      .optional()
      .describe("Reasoning mode for the trace; defaults to chain_of_thought."),
    material: z
      .string()
      .optional()
      .describe("Workpiece material — folded into intent matching."),
    constraints: z
      .array(z.string())
      .optional()
      .describe("Free-text process constraints — folded into intent matching."),
  })
  .describe(
    "LaserAGIMasterInput — route a laser-machining intent to an ordered plan of dispatcher actions.",
  );

/** waterjet_agi_master — WaterjetAGIMasterEngine.reason (AGI-MASTER-PARITY-MS30/P0-U04) */
const waterjet_agi_master = z
  .object({
    intent: z
      .string()
      .min(1)
      .describe("Free-text description of the waterjet-machining task to plan."),
    reasoningMode: z
      .enum(["chain_of_thought", "multi_path", "deductive", "analogical"])
      .optional()
      .describe("Reasoning mode for the trace; defaults to chain_of_thought."),
    material: z
      .string()
      .optional()
      .describe("Workpiece material — folded into intent matching."),
    constraints: z
      .array(z.string())
      .optional()
      .describe("Free-text process constraints — folded into intent matching."),
  })
  .describe(
    "WaterjetAGIMasterInput — route a waterjet-machining intent to an ordered plan of dispatcher actions.",
  );

/** wafer_die_code_decode — WaferDieCodeEngine.decode (ARC-MS6/muS-C23) */
const wafer_die_code_decode = z
  .object({
    code: z
      .string()
      .min(1)
      .describe("Wafer-die code / filename, e.g. WAFER880X334X145.MIN."),
    unit_scale: z
      .number()
      .positive()
      .optional()
      .describe("Multiplier from code values to real dimensions."),
    unit: z
      .string()
      .min(1)
      .optional()
      .describe("Unit label for the scaled view (supply alongside unit_scale)."),
    axis_labels: z
      .array(z.string().min(1))
      .optional()
      .describe("Override the default length/width/height axis labels."),
  })
  .describe(
    "WaferDieCodeInput — decode a wafer die-code filename into parametric geometry.",
  );

/** electrode_material_decide — ElectrodeMaterialDecisionEngine.decide (ARC-MS6/muS-C21) */
const electrode_material_decide = z
  .object({
    workpiece_material: z
      .string()
      .min(1)
      .describe(
        "Workpiece material (free text — normalized to 7 known classes internally).",
      ),
    workpiece_hardness_HRC: z
      .number()
      .min(0)
      .max(80)
      .optional()
      .describe("Workpiece hardness (HRC); default 55."),
    surface_finish_target_Ra_um: z
      .number()
      .positive()
      .optional()
      .describe("Target surface finish (µm Ra); default 1.6."),
    cavity_depth_mm: z.number().positive().optional(),
    cavity_width_mm: z.number().positive().optional(),
    num_cavities: z.number().int().min(1).optional(),
    tolerance_mm: z.number().positive().optional(),
    has_sharp_corners: z.boolean().optional(),
    has_deep_ribs: z.boolean().optional(),
    cost_priority: z
      .enum(["low_cost", "balanced", "performance"])
      .optional()
      .describe("Cost vs performance dial; default balanced."),
  })
  .describe(
    "ElectrodeMaterialDecisionInput — pick the best electrode material for a sinker-EDM job.",
  );

/** electrode_pairing_group — ElectrodePairingEngine.pair (ARC-MS6/muS-C22) */
const electrode_pairing_group = z
  .object({
    files: z
      .array(z.string().min(1))
      .describe(
        "Electrode filenames to group (typically from a directory listing).",
      ),
    electrode_dimensions_mm: z
      .record(
        z.string(),
        z.object({
          length: z.number().positive(),
          width: z.number().positive(),
        }),
      )
      .optional()
      .describe(
        "Optional per-file XY dimensions (key = exact filename) for sizing-rule validation.",
      ),
    warn_on_incomplete: z
      .boolean()
      .optional()
      .describe("Emit a result warning for incomplete sets (default true)."),
  })
  .describe(
    "ElectrodePairingInput — group rough/semi/finish electrode filenames into per-cavity sets.",
  );

/** sinker_edm_electrode_cost — SinkerElectrodeCostEngine.estimate (ARC-MS6/muS-C25) */
const sinker_edm_electrode_cost = z
  .object({
    electrode_volume_mm3: z
      .number()
      .positive()
      .describe("Net finished electrode solid volume (mm³)."),
    num_electrodes: z
      .number()
      .int()
      .min(1)
      .describe("Total electrodes in the set (rough+semi+finish × cavities)."),
    electrode_material: z
      .enum([
        "graphite_fine",
        "graphite_std",
        "copper",
        "copper_tungsten",
        "tellurium_copper",
      ])
      .describe("Electrode stock material."),
    burn_time_min: z
      .number()
      .nonnegative()
      .describe(
        "Total sinker-EDM cavity burn time (min) — job total, not per electrode.",
      ),
    stock_oversize_factor: z
      .number()
      .min(1)
      .optional()
      .describe("Blank-to-net volume ratio (≥1); default 1.5."),
    wear_ratio_pct: z
      .number()
      .nonnegative()
      .optional()
      .describe("Electrode wear ratio (%) — advisory note only."),
    material_cost_per_cm3: z
      .number()
      .positive()
      .optional()
      .describe("Override electrode material cost (USD/cm³)."),
    milling_mrr_mm3_per_min: z
      .number()
      .positive()
      .optional()
      .describe("Override CNC milling MRR (mm³/min)."),
    mill_rate_per_hr: z
      .number()
      .positive()
      .optional()
      .describe("CNC mill machine rate (USD/hr); default 75."),
    edm_rate_per_hr: z
      .number()
      .positive()
      .optional()
      .describe("Sinker-EDM machine rate (USD/hr); default 85."),
    setup_min_per_electrode: z
      .number()
      .nonnegative()
      .optional()
      .describe("Setup time per electrode (min); default 15."),
    finish_overhead_min: z
      .number()
      .nonnegative()
      .optional()
      .describe("Finishing-pass overhead per electrode (min); default 10."),
  })
  .describe(
    "SinkerElectrodeCostInput — estimate the fully-loaded cost (material/milling/setup/burn) of a sinker-EDM electrode set.",
  );

/** wedm_program_compare — WEDMProgramComparisonEngine.compare (U-WIRE-WEDM-PROGRAM-COMPARE-1) */
const wedm_program_compare = z
  .object({
    reference_nc: z
      .string()
      .min(1)
      .describe("Reference (real shop) NC program text."),
    generated_nc: z
      .string()
      .min(1)
      .describe("PRISM-generated NC program text to compare against the reference."),
    reference_filename: z
      .string()
      .min(1)
      .optional()
      .describe("Optional reference filename (for the report). Default 'reference.nc'."),
    generated_filename: z
      .string()
      .min(1)
      .optional()
      .describe("Optional generated filename (for the report). Default 'generated.nc'."),
    tolerances: z
      .object({
        pass_count_tol: z.number().int().nonnegative().optional(),
        offset_rel_tol: z.number().positive().optional(),
        feed_rel_tol: z.number().positive().optional(),
        contour_rel_tol: z.number().positive().optional(),
      })
      .optional()
      .describe(
        "Optional override of comparison tolerances (pass count absolute, others relative fraction).",
      ),
  })
  .describe(
    "WEDMProgramComparisonInput — diff a real-shop reference WEDM NC program against a PRISM-generated one. Returns per-parameter deviations + weighted match score + production_ready gate (overall_match ≥ 0.85 AND no critical deviations).",
  );

/** wedm_wire_spool_consumption — WEDMWireSpoolConsumptionEngine.calculate (U-WIRE-WEDM-OUTCOME-3) */
const wedm_wire_spool_consumption = z
  .object({
    total_wire_m: z
      .number()
      .positive()
      .describe("Total wire required for the full WEDM job (m)."),
    spool_capacity_m: z
      .number()
      .positive()
      .describe("Usable wire length on a fresh spool (m)."),
    wire_remaining_m: z
      .number()
      .nonnegative()
      .optional()
      .describe(
        "Wire remaining on the currently loaded spool (m); must be ≤ spool_capacity_m. Defaults to a fresh spool.",
      ),
    auto_threader_available: z
      .boolean()
      .optional()
      .describe("Use auto-threader timing instead of manual threading."),
    machine_rate_usd_hr: z
      .number()
      .nonnegative()
      .optional()
      .describe("Machine burden rate (USD/hr) for spool-change downtime costing."),
  })
  .describe(
    "WireSpoolConsumptionInput — project WEDM wire-spool consumption + mid-job spool-change risk.",
  );

/** wedm_taper_error_budget — WEDMTaperErrorBudgetEngine.calculate (U-WIRE-WEDM-OUTCOME-3) */
const wedm_taper_error_budget = z
  .object({
    taper_angle_deg: z
      .number()
      .gt(-90)
      .lt(90)
      .describe("Programmed taper angle (deg); positive = outward-opening. Must be in (-90, 90)."),
    part_height_mm: z
      .number()
      .positive()
      .describe("Part height / cut thickness (mm)."),
    guide_span_mm: z
      .number()
      .positive()
      .optional()
      .describe("Upper-to-lower guide span (mm); defaults to spec."),
    upper_guide_tolerance_um: z
      .number()
      .nonnegative()
      .optional()
      .describe("Upper guide per-side positional tolerance (µm); default 3."),
    lower_guide_tolerance_um: z
      .number()
      .nonnegative()
      .optional()
      .describe("Lower guide per-side positional tolerance (µm); default 3."),
    auto_calibration: z
      .boolean()
      .optional()
      .describe("Auto-calibration active (halves residual calibration error); default true."),
    guide_style: z
      .enum(["standard", "extended"])
      .optional()
      .describe("Guide style — sets the max programmable taper angle; default standard."),
  })
  .describe(
    "TaperErrorBudgetInput — WEDM taper programming error budget + UV travel + IT-class prediction.",
  );

/** wedm_slug_tab_retention — WEDMSlugTabRetentionEngine.calculate (U-WIRE-WEDM-OUTCOME-3) */
const wedm_slug_tab_retention = z
  .object({
    slug_area_mm2: z
      .number()
      .positive()
      .describe("Planform area of the slug cross-section (mm²)."),
    part_thickness_mm: z
      .number()
      .positive()
      .describe("Plate / cut-height thickness (mm) — drives both weight and tab cross-section."),
    material_density_kg_m3: z
      .number()
      .positive()
      .describe("Workpiece density (kg/m³)."),
    sigma_y_MPa: z
      .number()
      .positive()
      .describe("Workpiece yield strength (MPa)."),
    tab_count: z
      .number()
      .int()
      .nonnegative()
      .describe("Number of retention tabs (non-negative integer)."),
    tab_width_mm: z
      .number()
      .nonnegative()
      .describe("Width of each tab (mm); must be ≥ 0.1 when tab_count > 0."),
    dynamic_factor: z
      .number()
      .positive()
      .optional()
      .describe("Dielectric-surge dynamic multiplier; default 3.0 for WEDM."),
  })
  .describe(
    "WEDMSlugTabRetentionInput — slug-retention safety factor for WEDM through-cut features.",
  );

export const EDM_ACTION_SCHEMAS: Record<string, z.ZodTypeAny> = {
  // Legacy EDM actions - validation delegated to individual engines.
  // BATCH2 schemas added for stricter validation.
  wedm_adaptive_pass_count,
  wedm_adaptive_offsets,
  wedm_accessibility_analyze,
  wedm_current_density_validate,
  wedm_benchmark_classify,
  wedm_archive_backfill_state,

  // BATCH3 schemas: analogy / autonomy / blackboard / calibration
  wedm_analogy_retrieve,
  wedm_analogy_size,
  wedm_autonomy_can,
  wedm_blackboard_post,
  wedm_blackboard_read,
  wedm_calibration_generate,

  // BATCH4 schemas: learning / drift / dialect / failsafe / diagnosis / fixture
  wedm_learning_snapshot,
  wedm_dialect_verify,
  wedm_drift_detect,
  wedm_failsafe_from_clearance,
  wedm_fault_diagnose,
  wedm_fixture_interference,
  wedm_offset_spc,
  sinker_agi_master,
  laser_agi_master,
  waterjet_agi_master,
  sinker_edm_electrode_cost,
  electrode_pairing_group,
  electrode_material_decide,
  wafer_die_code_decode,
  wedm_wire_spool_consumption,
  wedm_taper_error_budget,
  wedm_slug_tab_retention,
  wedm_program_compare,

  // BATCH5 schemas: credit / deviation / dielectric / exception / active-query
  wedm_credit_cost_calc,
  wedm_deviation_analyze,
  wedm_dielectric_flush_calc,
  wedm_exception_handle,
  wedm_exception_record,
  wedm_active_query_grid,

  // BATCH6 schemas: audit / awareness / dxf-closure / degradation / EWC-memory
  wedm_autonomy_audit_record,
  wedm_awareness_register_dispatcher,
  wedm_dxf_validate,
  wedm_degradation_update,
  wedm_degradation_snapshot,
  wedm_ewc_list_slots,

  // OBSIDIAN-AUTOMATE-MS3/U-WEDM-FEEDBACK-EXPOSE
  wedm_feedback_submit,
  wedm_feedback_get_calibration,
  wedm_feedback_history,
  wedm_feedback_reset,

  // BRIDGE-WIRING/U-WIRE-TRILOBE-ELECTRODE-GEOMETRY
  trilobe_electrode_geometry,

  // U-WIRE-BACKLOG-WEDM-POST-ROUTER (slot:india) — 6 actions wiring the
  // WEDMPostDialectRouterEngine (master-post over 5 vendor engines).
  wedm_post_supported_controllers,
  wedm_post_dialect_config,
  wedm_post_select_by_machine,
  wedm_post_generate,
  wedm_post_convert,
  wedm_post_roundtrip,
};
