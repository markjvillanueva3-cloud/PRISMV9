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
};
