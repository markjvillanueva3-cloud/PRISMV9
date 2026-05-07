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
};
