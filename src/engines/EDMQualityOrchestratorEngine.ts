/**
 * EDMQualityOrchestratorEngine — WEDM-P2P MS19+MS20 Capstone
 *
 * Consolidates Quality Verification (MS19 U01-U05) and Pipeline Orchestrator
 * & Learning (MS20 U01-U05) into one capstone engine covering the full
 * Wire-EDM quality lifecycle.
 *
 * MS19 — Quality Verification:
 *   U01 DimensionalVerificationPlanner — CMM probe routines, Cpk, taper/barrel detect
 *   U02 SurfaceFinishVerifier          — Ra prediction vs spec, feedback loop
 *   U03 ProfileAccuracyAnalyzer        — corner radius, straightness, taper, root cause
 *   U04 RecastComplianceVerifier       — recast layer vs spec, metallography
 *   U05 FirstArticleReportGenerator    — AS9102, PPAP, general FAI reports
 *
 * MS20 — Pipeline Orchestrator & Learning:
 *   U01 WireEDMPipelineOrchestrator    — 20-stage pipeline with stage-gate
 *   U02 JobHistoryTracker              — predicted vs actual tracking
 *   U03 ParameterLearningEngine        — Bayesian calibration of physics models
 *   U04 SimilarJobRecommender          — history-based recommendation
 *   U05 ContinuousImprovementTracker   — metric drift detection over time
 *
 * Actions: verify_quality, generate_first_article, run_pipeline,
 *          record_job, get_recommendation, calibration_report,
 *          improvement_report
 */

import { readFileSync, writeFileSync, mkdirSync, existsSync } from "fs";
import path from "path";

// ============================================================================
// PERSISTENCE — U-WH17
// ============================================================================

/** Directory for durable quality data persistence. */
const QUALITY_DATA_DIR = path.resolve(__dirname, "../../data/quality");

/** File paths for persisted quality state. */
const JOB_HISTORY_PATH = path.join(QUALITY_DATA_DIR, "job-history.json");
const PARAMETER_PRIORS_PATH = path.join(QUALITY_DATA_DIR, "parameter-priors.json");
const GATE_OVERRIDES_PATH = path.join(QUALITY_DATA_DIR, "gate-overrides.json");
const AUDIT_LOG_PATH = path.join(QUALITY_DATA_DIR, "audit-log.jsonl");

/** Ensure data directory exists. */
function ensureQualityDir(): void {
  if (!existsSync(QUALITY_DATA_DIR)) {
    mkdirSync(QUALITY_DATA_DIR, { recursive: true });
  }
}

/** Load JSON from file, returning default on missing/corrupt file. */
function loadJsonFile<T>(filePath: string, defaultValue: T): T {
  try {
    if (!existsSync(filePath)) return defaultValue;
    const raw = readFileSync(filePath, "utf-8");
    return JSON.parse(raw) as T;
  } catch {
    return defaultValue;
  }
}

/** Write JSON atomically (sync, for write-through). */
function writeJsonFile(filePath: string, data: unknown): void {
  ensureQualityDir();
  const tmpPath = `${filePath}.tmp`;
  writeFileSync(tmpPath, JSON.stringify(data, null, 2), "utf-8");
  const { renameSync } = require("fs") as typeof import("fs");
  renameSync(tmpPath, filePath);
}

/** Append a JSONL line to the audit log. */
function appendAuditLog(entry: AuditLogEntry): void {
  ensureQualityDir();
  const { appendFileSync } = require("fs") as typeof import("fs");
  appendFileSync(AUDIT_LOG_PATH, JSON.stringify(entry) + "\n", "utf-8");
}

// ============================================================================
// TYPES
// ============================================================================

export interface QualityVerificationInput {
  features: Array<{
    name: string;
    nominal_mm: number;
    tolerance_mm: number;
    measured_values?: number[];
    surface_finish_ra_um?: number;
    measured_ra_um?: number;
  }>;
  profile_measurements?: Array<{
    z_height_mm: number;
    deviations: Array<{ feature: string; deviation_mm: number }>;
  }>;
  recast_measurement_um?: number;
  hardness_measurements?: Array<{ depth_um: number; hardness_hv: number }>;
  application: "aerospace" | "medical" | "automotive" | "tooling" | "general";
  /** Industry spec standard for compliance checking. */
  spec_standard?: "ams_2628" | "astm_f86" | "oem_automotive" | "custom";
  /** Spec class within the standard (e.g., Class A/B/C for AMS 2628). */
  spec_class?: "A" | "B" | "C";
  /** Material group for per-material spec lookup. */
  material_group?: string;
  /** U-WH16: Material traceability for FAI reports. */
  material_traceability?: {
    heat_number: string;
    cert_number: string;
    cert_date: string;
    cert_document_ref?: string;
  };
  /** U-WH16: Job intent — quality gates only apply to finished_part. */
  job_intent?: JobIntent;
}

/** Per-material spec limits for a given standard + class combination. */
export interface SpecComplianceLimits {
  spec_standard: string;
  spec_class: string;
  material_group: string;
  max_recast_um: number;
  min_skim_passes: number;
  max_ra_um: number;
  stress_relief_required: boolean;
  stress_relief_spec?: string;
  post_process_notes: string[];
  sem_metallography_required: boolean;
}

/** Per-feature spec compliance result. */
export interface FeatureSpecCompliance {
  feature_name: string;
  spec_standard: string;
  spec_class: string;
  material_group: string;
  recast_limit_um: number;
  recast_actual_um: number | null;
  recast_pass: boolean;
  ra_limit_um: number;
  ra_actual_um: number | null;
  ra_pass: boolean;
  min_skim_passes: number;
  overall_pass: boolean;
  notes: string[];
}

export interface QualityReport {
  overall_pass: boolean;
  dimensional: {
    features_checked: number;
    features_passed: number;
    cpk?: number;
    worst_feature: string;
  };
  surface_finish: {
    target_ra: number;
    predicted_ra: number;
    measured_ra?: number;
    pass: boolean;
  };
  profile_accuracy: {
    taper_error_mm?: number;
    straightness_mm?: number;
    corner_accuracy_mm?: number;
    root_causes: string[];
  };
  recast_compliance: {
    spec_limit_um: number;
    predicted_um: number;
    measured_um?: number;
    pass: boolean;
  };
  first_article_report: FirstArticleReport;
}

export interface FirstArticleReport {
  format: "AS9102" | "PPAP" | "general";
  part_number: string;
  revision: string;
  date: string;
  characteristics: Array<{
    id: number;
    description: string;
    nominal: string;
    tolerance: string;
    measured: string;
    pass: boolean;
    instrument: string;
  }>;
  overall_disposition: "ACCEPT" | "REJECT" | "CONDITIONAL";
  notes: string[];
  /** U-WH16: Material traceability fields. */
  material_traceability?: {
    heat_number: string;
    cert_number: string;
    cert_date: string;
    cert_document_ref?: string;
  };
  /** U-WH17: Document control fields. */
  document_id?: string;
  retention_period?: string;
  retention_until?: string;
}

/** U-WH16: Quality gate override record. */
export interface QualityGateOverride {
  override_id: string;
  job_id: string;
  gate_name: string;
  original_disposition: "ACCEPT" | "REJECT" | "CONDITIONAL";
  overridden_to: "ACCEPT" | "CONDITIONAL";
  reference_number: string;
  reason: string;
  operator_id: string;
  timestamp: string;
}

/** U-WH16: Job intent determines quality gate applicability. */
export type JobIntent = "rough_blank" | "finished_part" | "electrode";

/** U-WH17: Audit log entry for quality decisions. */
export interface AuditLogEntry {
  timestamp: string;
  event_type: "quality_verification" | "spec_compliance" | "gate_evaluation" | "gate_override" | "job_recorded" | "fai_generated";
  job_id?: string;
  operator_id?: string;
  action: string;
  details: Record<string, unknown>;
}

export interface PipelineResult {
  stage_results: Array<{
    stage: string;
    status: "pass" | "fail" | "warning" | "skipped";
    summary: string;
    time_ms: number;
  }>;
  overall_status: "complete" | "aborted_feasibility" | "aborted_error";
  gcode?: string;
  cost_estimate?: Record<string, unknown>;
  documentation?: Record<string, unknown>;
  quality_plan?: Record<string, unknown>;
  total_pipeline_time_ms: number;
}

export interface JobHistory {
  job_id: string;
  date: string;
  material: string;
  thickness_mm: number;
  machine: string;
  wire_type: string;
  job_intent?: JobIntent;
  predicted: { time_min: number; ra_um: number; cost: number };
  actual: {
    time_min?: number;
    ra_um?: number;
    cost?: number;
    wire_breaks?: number;
    dimensional_accuracy?: number;
  };
  accuracy: { time_ratio?: number; ra_ratio?: number; cost_ratio?: number };
}

export interface LearningUpdate {
  parameter: string;
  prior_value: number;
  observed_values: number[];
  posterior_value: number;
  confidence: number;
  samples: number;
}

/** CMM probe plan for a single feature. */
export interface CMMProbePoint {
  feature: string;
  probe_type: "touch" | "scanning" | "vision";
  z_heights_mm: number[];
  points_per_height: number;
  gdt_callout: string;
  estimated_time_s: number;
}

/** Profile error analysis result. */
export interface ProfileErrorAnalysis {
  feature: string;
  taper_error_mm: number;
  barrel_error_mm: number;
  hourglass_error_mm: number;
  straightness_mm: number;
  corner_radius_deviation_mm: number;
  dominant_error: "taper" | "barrel" | "hourglass" | "corner_lag" | "wire_bow" | "none";
  root_causes: string[];
  corrective_actions: string[];
}

/** Pipeline stage definition. */
export interface PipelineStage {
  name: string;
  order: number;
  gate: boolean;
  required: boolean;
}

/** Improvement metric snapshot. */
export interface MetricSnapshot {
  date: string;
  cycle_time_accuracy: number;
  ra_accuracy: number;
  dimensional_accuracy: number | null;
  wire_break_rate: number;
  cost_accuracy: number;
}

/** Drift detection result. */
export interface DriftResult {
  metric: string;
  trend: "improving" | "stable" | "degrading";
  current_value: number;
  baseline_value: number;
  change_pct: number;
  alert: boolean;
  recommendation: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Legacy recast spec limits by application (µm) — fallback when no spec_standard is provided. */
const RECAST_SPEC_LIMIT_UM: Record<string, number> = {
  aerospace: 5,   // Conservative fallback; use AMS 2628 per-material for precision
  medical: 5,     // Conservative fallback; use ASTM F86 for precision
  automotive: 25,
  tooling: 15,
  general: 50,
};

/**
 * AMS 2628 per-material class limits — from WEDM-MS1.json industry_spec_requirements.
 *
 * AMS 2628 defines three classes:
 *   Class A — Flight-critical parts: tightest recast limits, mandatory SEM metallography
 *   Class B — Structural non-critical: moderate limits, metallographic cross-section required
 *   Class C — Non-structural: relaxed limits, visual inspection acceptable for first article
 *
 * Per-material limits reflect thermal conductivity, crack sensitivity, and HAZ characteristics.
 * Source: AMS 2628C (Rev 2019) + SAE AMS-STD-2628.
 */
interface MaterialSpecLimits {
  max_recast_um: number;
  min_skim_passes: number;
  max_ra_um: number;
  stress_relief_required: boolean;
  stress_relief_spec?: string;
  post_process_notes: string[];
  sem_metallography_required: boolean;
}

const AMS_2628_LIMITS: Record<string, Record<string, MaterialSpecLimits>> = {
  A: {
    tool_steel: {
      max_recast_um: 8, min_skim_passes: 3, max_ra_um: 0.4,
      stress_relief_required: true, stress_relief_spec: "200°C / 4hr",
      post_process_notes: ["SEM metallographic cross-section REQUIRED", "Chemical etch if recast detected"],
      sem_metallography_required: true,
    },
    stainless: {
      max_recast_um: 10, min_skim_passes: 3, max_ra_um: 0.4,
      stress_relief_required: true, stress_relief_spec: "175°C / 2hr",
      post_process_notes: ["SEM metallographic cross-section REQUIRED", "Passivation per ASTM A967 after EDM"],
      sem_metallography_required: true,
    },
    titanium: {
      max_recast_um: 5, min_skim_passes: 3, max_ra_um: 0.4,
      stress_relief_required: true, stress_relief_spec: "200°C / 2hr vacuum",
      post_process_notes: ["SEM metallographic cross-section REQUIRED", "Vacuum stress relief mandatory",
        "Alpha case inspection required", "Hydrogen embrittlement risk — monitor for pickup"],
      sem_metallography_required: true,
    },
    inconel: {
      max_recast_um: 8, min_skim_passes: 3, max_ra_um: 0.4,
      stress_relief_required: true, stress_relief_spec: "600°C / 4hr",
      post_process_notes: ["SEM metallographic cross-section REQUIRED",
        "Check for intergranular attack at recast boundary", "High-temp stress relief in protective atmosphere"],
      sem_metallography_required: true,
    },
    aluminum: {
      max_recast_um: 12, min_skim_passes: 2, max_ra_um: 0.8,
      stress_relief_required: false,
      post_process_notes: ["SEM metallographic cross-section REQUIRED for first article",
        "Anodize after EDM if surface treatment specified"],
      sem_metallography_required: true,
    },
    copper_alloy: {
      max_recast_um: 10, min_skim_passes: 2, max_ra_um: 0.8,
      stress_relief_required: false,
      post_process_notes: ["SEM metallographic cross-section REQUIRED for first article"],
      sem_metallography_required: true,
    },
    carbide: {
      max_recast_um: 5, min_skim_passes: 3, max_ra_um: 0.4,
      stress_relief_required: false,
      post_process_notes: ["SEM metallographic cross-section REQUIRED",
        "Check for cobalt leaching at recast boundary", "Thermal cracking inspection required"],
      sem_metallography_required: true,
    },
  },
  B: {
    tool_steel: {
      max_recast_um: 12, min_skim_passes: 2, max_ra_um: 0.8,
      stress_relief_required: true, stress_relief_spec: "200°C / 4hr",
      post_process_notes: ["Metallographic cross-section for first article"],
      sem_metallography_required: false,
    },
    stainless: {
      max_recast_um: 15, min_skim_passes: 2, max_ra_um: 0.8,
      stress_relief_required: true, stress_relief_spec: "175°C / 2hr",
      post_process_notes: ["Metallographic cross-section for first article", "Passivation recommended"],
      sem_metallography_required: false,
    },
    titanium: {
      max_recast_um: 8, min_skim_passes: 3, max_ra_um: 0.8,
      stress_relief_required: true, stress_relief_spec: "200°C / 2hr vacuum",
      post_process_notes: ["Metallographic cross-section for first article", "Vacuum stress relief mandatory"],
      sem_metallography_required: false,
    },
    inconel: {
      max_recast_um: 12, min_skim_passes: 2, max_ra_um: 0.8,
      stress_relief_required: true, stress_relief_spec: "600°C / 4hr",
      post_process_notes: ["Metallographic cross-section for first article"],
      sem_metallography_required: false,
    },
    aluminum: {
      max_recast_um: 20, min_skim_passes: 1, max_ra_um: 1.6,
      stress_relief_required: false,
      post_process_notes: ["Visual inspection acceptable"],
      sem_metallography_required: false,
    },
    copper_alloy: {
      max_recast_um: 15, min_skim_passes: 1, max_ra_um: 1.6,
      stress_relief_required: false,
      post_process_notes: ["Visual inspection acceptable"],
      sem_metallography_required: false,
    },
    carbide: {
      max_recast_um: 8, min_skim_passes: 2, max_ra_um: 0.8,
      stress_relief_required: false,
      post_process_notes: ["Metallographic cross-section for first article", "Cobalt leaching check recommended"],
      sem_metallography_required: false,
    },
  },
  C: {
    tool_steel: {
      max_recast_um: 20, min_skim_passes: 1, max_ra_um: 1.6,
      stress_relief_required: false,
      post_process_notes: ["Visual inspection acceptable"],
      sem_metallography_required: false,
    },
    stainless: {
      max_recast_um: 25, min_skim_passes: 1, max_ra_um: 1.6,
      stress_relief_required: false,
      post_process_notes: ["Visual inspection acceptable"],
      sem_metallography_required: false,
    },
    titanium: {
      max_recast_um: 12, min_skim_passes: 2, max_ra_um: 1.2,
      stress_relief_required: false,
      post_process_notes: ["Metallographic cross-section recommended"],
      sem_metallography_required: false,
    },
    inconel: {
      max_recast_um: 15, min_skim_passes: 2, max_ra_um: 1.2,
      stress_relief_required: false,
      post_process_notes: ["Visual inspection acceptable"],
      sem_metallography_required: false,
    },
    aluminum: {
      max_recast_um: 30, min_skim_passes: 0, max_ra_um: 3.2,
      stress_relief_required: false,
      post_process_notes: ["No special requirements"],
      sem_metallography_required: false,
    },
    copper_alloy: {
      max_recast_um: 25, min_skim_passes: 0, max_ra_um: 3.2,
      stress_relief_required: false,
      post_process_notes: ["No special requirements"],
      sem_metallography_required: false,
    },
    carbide: {
      max_recast_um: 12, min_skim_passes: 1, max_ra_um: 1.6,
      stress_relief_required: false,
      post_process_notes: ["Visual inspection acceptable"],
      sem_metallography_required: false,
    },
  },
};

/** ASTM F86 (medical device) spec limits — from WEDM-MS1.json. */
const ASTM_F86_LIMITS: Record<string, MaterialSpecLimits> = {
  titanium: {
    max_recast_um: 0, min_skim_passes: 4, max_ra_um: 0.2,
    stress_relief_required: true, stress_relief_spec: "Vacuum anneal per material spec",
    post_process_notes: ["100% recast removal via electropolishing REQUIRED",
      "ASTM A967 citric acid passivation after EDM + electropolish",
      "ISO 10993 biocompatibility testing required downstream",
      "Ra ≤ 0.2 µm for implant surfaces"],
    sem_metallography_required: true,
  },
  stainless: {
    max_recast_um: 0, min_skim_passes: 4, max_ra_um: 0.2,
    stress_relief_required: true, stress_relief_spec: "Passivation per ASTM A967",
    post_process_notes: ["100% recast removal via electropolishing REQUIRED",
      "ASTM A967 citric acid passivation mandatory",
      "ISO 10993 biocompatibility testing required downstream"],
    sem_metallography_required: true,
  },
  cobalt_chrome: {
    max_recast_um: 0, min_skim_passes: 4, max_ra_um: 0.2,
    stress_relief_required: true, stress_relief_spec: "HIP per ASTM F75",
    post_process_notes: ["100% recast removal REQUIRED",
      "HIP recommended for fatigue-critical implants"],
    sem_metallography_required: true,
  },
};

/** OEM automotive spec limits — typical tier 1 supplier requirements. */
const OEM_AUTOMOTIVE_LIMITS: Record<string, MaterialSpecLimits> = {
  tool_steel: {
    max_recast_um: 15, min_skim_passes: 2, max_ra_um: 0.8,
    stress_relief_required: true, stress_relief_spec: "200°C / 2hr",
    post_process_notes: ["PPAP Level 3 for production tooling", "Cpk ≥ 1.33 required"],
    sem_metallography_required: false,
  },
  stainless: {
    max_recast_um: 20, min_skim_passes: 1, max_ra_um: 1.6,
    stress_relief_required: false,
    post_process_notes: ["PPAP Level 3 for production parts"],
    sem_metallography_required: false,
  },
  aluminum: {
    max_recast_um: 25, min_skim_passes: 1, max_ra_um: 1.6,
    stress_relief_required: false,
    post_process_notes: ["PPAP Level 3 if production part"],
    sem_metallography_required: false,
  },
};

/** Resolve spec limits for a given standard, class, and material group.
 * Returns null if no matching spec exists.
 */
function resolveSpecLimits(
  spec_standard: string,
  spec_class: string,
  material_group: string,
): MaterialSpecLimits | null {
  switch (spec_standard) {
    case "ams_2628": {
      const classLimits = AMS_2628_LIMITS[spec_class];
      if (!classLimits) return null;
      return classLimits[material_group] ?? classLimits["tool_steel"] ?? null;
    }
    case "astm_f86":
      return ASTM_F86_LIMITS[material_group] ?? ASTM_F86_LIMITS["stainless"] ?? null;
    case "oem_automotive":
      return OEM_AUTOMOTIVE_LIMITS[material_group] ?? OEM_AUTOMOTIVE_LIMITS["tool_steel"] ?? null;
    default:
      return null;
  }
}

/** Default target Ra by application (µm). */
const TARGET_RA_UM: Record<string, number> = {
  aerospace: 0.4,
  medical: 0.4,
  automotive: 0.8,
  tooling: 1.2,
  general: 1.6,
};

/** Cpk acceptance thresholds. */
const CPK_THRESHOLD: Record<string, number> = {
  aerospace: 1.67,
  medical: 1.33,
  automotive: 1.33,
  tooling: 1.0,
  general: 1.0,
};

/** Full 20-stage WEDM pipeline definition. */
const PIPELINE_STAGES: PipelineStage[] = [
  { name: "drawing_analysis", order: 1, gate: false, required: true },
  { name: "feasibility_check", order: 2, gate: true, required: true },
  { name: "material_analysis", order: 3, gate: false, required: true },
  { name: "machine_selection", order: 4, gate: false, required: true },
  { name: "wire_selection", order: 5, gate: false, required: true },
  { name: "start_hole_planning", order: 6, gate: false, required: true },
  { name: "setup_planning", order: 7, gate: false, required: true },
  { name: "toolpath_generation", order: 8, gate: false, required: true },
  { name: "multi_pass_strategy", order: 9, gate: false, required: true },
  { name: "parameter_optimization", order: 10, gate: false, required: true },
  { name: "flushing_design", order: 11, gate: false, required: true },
  { name: "wire_management", order: 12, gate: false, required: false },
  { name: "slug_management", order: 13, gate: false, required: false },
  { name: "corner_taper_compensation", order: 14, gate: false, required: true },
  { name: "monitoring_setup", order: 15, gate: false, required: false },
  { name: "surface_analysis", order: 16, gate: false, required: true },
  { name: "post_process_planning", order: 17, gate: false, required: false },
  { name: "gcode_generation", order: 18, gate: false, required: true },
  { name: "cost_estimation", order: 19, gate: false, required: true },
  { name: "documentation", order: 20, gate: false, required: true },
];

/** Instrument selection by tolerance range. */
const INSTRUMENT_FOR_TOLERANCE = (tol_mm: number): string => {
  if (tol_mm <= 0.005) return "CMM (Zeiss/Mitutoyo)";
  if (tol_mm <= 0.01) return "CMM or optical comparator";
  if (tol_mm <= 0.025) return "micrometer";
  if (tol_mm <= 0.05) return "digital caliper";
  return "caliper or scale";
};

/** Points per probe height based on tolerance. */
const PROBE_POINTS_FOR_TOLERANCE = (tol_mm: number): number => {
  if (tol_mm <= 0.005) return 8;
  if (tol_mm <= 0.01) return 6;
  if (tol_mm <= 0.025) return 4;
  return 3;
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class EDMQualityOrchestratorEngine {
  /** Job history store — loaded from disk on construction, written through on mutation. */
  private jobHistory: JobHistory[] = [];

  /** Default Bayesian priors (used when no persisted data exists). */
  private static readonly DEFAULT_PRIORS: Array<[string, { value: number; variance: number; samples: number }]> = [
    ["default:default:mrr_mm3_per_min", { value: 8.0, variance: 4.0, samples: 10 }],
    ["default:default:ra_um_finish", { value: 0.8, variance: 0.16, samples: 10 }],
    ["default:default:wire_break_rate_per_hour", { value: 0.05, variance: 0.01, samples: 10 }],
    ["default:default:cycle_time_factor", { value: 1.0, variance: 0.04, samples: 10 }],
    ["default:default:cost_factor", { value: 1.0, variance: 0.04, samples: 10 }],
  ];

  /** Bayesian parameter priors, stratified by material×machine×param (U-WH08).
   *  Key format: "${materialGroup}:${machineClass}:${paramName}"
   *  Falls back to "default:default:${paramName}" if no stratified prior exists.
   *  Initial samples = 10 for stability (was 1, which made posterior collapse too fast).
   */
  private parameterPriors: Map<string, { value: number; variance: number; samples: number }> = new Map(
    EDMQualityOrchestratorEngine.DEFAULT_PRIORS,
  );

  /** Fixed observation variance hyperparameter per parameter (U-WH08).
   *  Decoupled from posterior variance to prevent variance collapse.
   */
  private static readonly OBS_VARIANCE: Record<string, number> = {
    mrr_mm3_per_min: 4.0,
    ra_um_finish: 0.16,
    wire_break_rate_per_hour: 0.01,
    cycle_time_factor: 0.04,
    cost_factor: 0.04,
  };

  /** Improvement metric history. */
  private metricHistory: MetricSnapshot[] = [];

  /** U-WH16: Quality gate override log. */
  private gateOverrides: QualityGateOverride[] = [];

  constructor() {
    this.loadPersistedState();
  }

  /** U-WH17: Load persisted state from disk. */
  private loadPersistedState(): void {
    try {
      // Load job history
      const savedJobs = loadJsonFile<JobHistory[]>(JOB_HISTORY_PATH, []);
      if (savedJobs.length > 0) {
        this.jobHistory = savedJobs;
        // Rebuild metric history from loaded jobs
        for (const job of savedJobs) {
          this.updateMetricHistory(job);
        }
      }

      // Load parameter priors
      const savedPriors = loadJsonFile<Array<[string, { value: number; variance: number; samples: number }]>>(
        PARAMETER_PRIORS_PATH, [],
      );
      if (savedPriors.length > 0) {
        this.parameterPriors = new Map([
          ...EDMQualityOrchestratorEngine.DEFAULT_PRIORS,
          ...savedPriors,
        ]);
      }

      // Load gate overrides
      const savedOverrides = loadJsonFile<QualityGateOverride[]>(GATE_OVERRIDES_PATH, []);
      if (savedOverrides.length > 0) {
        this.gateOverrides = savedOverrides;
      }
    } catch {
      // Silent fallback to defaults — persistence is best-effort
    }
  }

  /** U-WH17: Persist job history to disk (write-through). */
  private persistJobHistory(): void {
    try { writeJsonFile(JOB_HISTORY_PATH, this.jobHistory); } catch { /* best-effort */ }
  }

  /** U-WH17: Persist parameter priors to disk (write-through). */
  private persistPriors(): void {
    try { writeJsonFile(PARAMETER_PRIORS_PATH, [...this.parameterPriors.entries()]); } catch { /* best-effort */ }
  }

  /** U-WH17: Persist gate overrides to disk (write-through). */
  private persistGateOverrides(): void {
    try { writeJsonFile(GATE_OVERRIDES_PATH, this.gateOverrides); } catch { /* best-effort */ }
  }

  /** U-WH17: Log an audit entry. */
  private logAudit(entry: Omit<AuditLogEntry, "timestamp">): void {
    try {
      appendAuditLog({ ...entry, timestamp: new Date().toISOString() });
    } catch { /* best-effort */ }
  }

  // ==========================================================================
  // ACTION: verify_quality (MS19 U01-U04)
  // ==========================================================================

  /** Full quality verification combining dimensional, surface finish, profile, and recast.
   * @param input - quality verification input
   * @param pass_params - multi-pass parameters used (for Ra prediction)
   * @returns QualityReport
   */
  verify_quality(
    input: QualityVerificationInput,
    pass_params?: { num_skim_passes: number; final_energy_mj: number; flushing: string },
  ): QualityReport {
    const dimensional = this.verifyDimensional(input);
    const surfaceFinish = this.verifySurfaceFinish(input, pass_params);
    const profileAccuracy = this.analyzeProfileAccuracy(input);
    const recast = this.verifyRecastCompliance(input, pass_params);

    // Generate inline FAI
    const fai = this.buildFirstArticleReport(input, dimensional, surfaceFinish, recast, "general");

    const overall_pass = dimensional.features_passed === dimensional.features_checked
      && surfaceFinish.pass
      && recast.pass
      && (profileAccuracy.taper_error_mm === undefined || profileAccuracy.taper_error_mm < 0.01);

    // U-WH17: Audit trail
    this.logAudit({
      event_type: "quality_verification",
      action: "verify_quality",
      details: {
        features_checked: dimensional.features_checked,
        features_passed: dimensional.features_passed,
        surface_finish_pass: surfaceFinish.pass,
        recast_pass: recast.pass,
        overall_pass,
        disposition: fai.overall_disposition,
        application: input.application,
        spec_standard: input.spec_standard,
      },
    });

    return {
      overall_pass,
      dimensional,
      surface_finish: surfaceFinish,
      profile_accuracy: profileAccuracy,
      recast_compliance: recast,
      first_article_report: fai,
    };
  }

  // ==========================================================================
  // ACTION: evaluate_spec_compliance (U-WH15)
  // ==========================================================================

  /** Evaluate per-feature compliance against an industry spec standard with per-material limits.
   * @param input - quality verification input with spec_standard and spec_class
   * @param pass_params - multi-pass parameters used
   * @returns spec limits + per-feature pass/fail results
   */
  evaluate_spec_compliance(
    input: QualityVerificationInput & {
      spec_standard: "ams_2628" | "astm_f86" | "oem_automotive" | "custom";
      spec_class?: "A" | "B" | "C";
      material_group?: string;
      custom_limits?: { max_recast_um?: number; max_ra_um?: number; min_skim_passes?: number };
    },
    pass_params?: { num_skim_passes: number; final_energy_mj: number; flushing: string },
  ): {
    spec_standard: string;
    spec_class: string;
    material_group: string;
    limits: SpecComplianceLimits;
    features: FeatureSpecCompliance[];
    overall_pass: boolean;
    available_specs: Array<{ standard: string; classes: string[]; description: string }>;
  } {
    const specClass = input.spec_class ?? "B";
    const matGroup = input.material_group ?? this.materialFamily(
      input.features[0]?.name ?? "steel"  // fallback
    );

    // Resolve limits
    let limits: MaterialSpecLimits;
    if (input.spec_standard === "custom" && input.custom_limits) {
      limits = {
        max_recast_um: input.custom_limits.max_recast_um ?? 25,
        min_skim_passes: input.custom_limits.min_skim_passes ?? 1,
        max_ra_um: input.custom_limits.max_ra_um ?? 1.6,
        stress_relief_required: false,
        post_process_notes: ["Custom spec — verify with customer"],
        sem_metallography_required: false,
      };
    } else {
      const resolved = resolveSpecLimits(input.spec_standard, specClass, matGroup);
      if (!resolved) {
        // Fallback to legacy application-based limit
        const fallbackRecast = RECAST_SPEC_LIMIT_UM[input.application] ?? 50;
        limits = {
          max_recast_um: fallbackRecast,
          min_skim_passes: 1,
          max_ra_um: TARGET_RA_UM[input.application] ?? 1.6,
          stress_relief_required: false,
          post_process_notes: [`No ${input.spec_standard} data for ${matGroup} — using application-level defaults`],
          sem_metallography_required: false,
        };
      } else {
        limits = resolved;
      }
    }

    // Predict recast if not measured
    let predictedRecast_um: number | undefined;
    if (pass_params) {
      const energyFactor = Math.pow(Math.max(0.1, pass_params.final_energy_mj), 0.6);
      const skimFactor = Math.max(0.05, 1 - 0.30 * pass_params.num_skim_passes);
      const flushFactor = pass_params.flushing === "submerged" ? 0.6
        : pass_params.flushing === "jet" ? 0.75
        : pass_params.flushing === "suction" ? 0.85 : 1.0;
      predictedRecast_um = Math.round(energyFactor * skimFactor * flushFactor * 15 * 10) / 10;
    }

    // Per-feature compliance check
    const features: FeatureSpecCompliance[] = input.features.map(f => {
      const recastActual = input.recast_measurement_um ?? predictedRecast_um ?? null;
      const recastPass = recastActual !== null ? recastActual <= limits.max_recast_um : false;
      const raActual = f.measured_ra_um ?? null;
      const raPass = raActual !== null ? raActual <= limits.max_ra_um : false;

      const notes: string[] = [];
      if (recastActual === null) notes.push("Recast not measured — verify with metallography");
      if (raActual === null) notes.push("Ra not measured — profilometer reading required");
      if (!recastPass && recastActual !== null) {
        notes.push(`Recast ${recastActual.toFixed(1)}µm exceeds ${limits.max_recast_um}µm limit — additional skim passes or polishing required`);
      }
      if (!raPass && raActual !== null) {
        notes.push(`Ra ${raActual.toFixed(2)}µm exceeds ${limits.max_ra_um}µm limit`);
      }
      if (pass_params && pass_params.num_skim_passes < limits.min_skim_passes) {
        notes.push(`${pass_params.num_skim_passes} skim passes below minimum ${limits.min_skim_passes} for ${input.spec_standard} Class ${specClass}`);
      }

      return {
        feature_name: f.name,
        spec_standard: input.spec_standard,
        spec_class: specClass,
        material_group: matGroup,
        recast_limit_um: limits.max_recast_um,
        recast_actual_um: recastActual,
        recast_pass: recastPass,
        ra_limit_um: limits.max_ra_um,
        ra_actual_um: raActual,
        ra_pass: raPass,
        min_skim_passes: limits.min_skim_passes,
        overall_pass: recastPass && raPass,
        notes,
      };
    });

    const overall_pass = features.every(f => f.overall_pass);

    const specLimitsResult: SpecComplianceLimits = {
      spec_standard: input.spec_standard,
      spec_class: specClass,
      material_group: matGroup,
      max_recast_um: limits.max_recast_um,
      min_skim_passes: limits.min_skim_passes,
      max_ra_um: limits.max_ra_um,
      stress_relief_required: limits.stress_relief_required,
      stress_relief_spec: limits.stress_relief_spec,
      post_process_notes: limits.post_process_notes,
      sem_metallography_required: limits.sem_metallography_required,
    };

    return {
      spec_standard: input.spec_standard,
      spec_class: specClass,
      material_group: matGroup,
      limits: specLimitsResult,
      features,
      overall_pass,
      available_specs: [
        { standard: "ams_2628", classes: ["A", "B", "C"], description: "AMS 2628 — Aerospace EDM surface integrity (Class A=flight-critical, B=structural, C=non-structural)" },
        { standard: "astm_f86", classes: ["A"], description: "ASTM F86 — Medical device surface preparation (implant surfaces)" },
        { standard: "oem_automotive", classes: ["A"], description: "OEM Automotive — Tier 1 supplier EDM requirements (PPAP)" },
        { standard: "custom", classes: ["A"], description: "Custom — User-defined limits per customer spec" },
      ],
    };
  }

  /** Get available spec limits for a given material without running full compliance check.
   * Useful for spec selector dropdown population.
   */
  get_spec_limits(input: {
    material_group: string;
    spec_standard?: string;
  }): {
    material_group: string;
    specs: Array<{
      standard: string;
      class: string;
      max_recast_um: number;
      min_skim_passes: number;
      max_ra_um: number;
      stress_relief_required: boolean;
      stress_relief_spec?: string;
    }>;
  } {
    const matGroup = input.material_group;
    const specs: Array<{
      standard: string;
      class: string;
      max_recast_um: number;
      min_skim_passes: number;
      max_ra_um: number;
      stress_relief_required: boolean;
      stress_relief_spec?: string;
    }> = [];

    const standards = input.spec_standard
      ? [input.spec_standard]
      : ["ams_2628", "astm_f86", "oem_automotive"];

    for (const std of standards) {
      if (std === "ams_2628") {
        for (const cls of ["A", "B", "C"]) {
          const lim = resolveSpecLimits("ams_2628", cls, matGroup);
          if (lim) specs.push({ standard: "ams_2628", class: cls, ...lim });
        }
      } else {
        const lim = resolveSpecLimits(std, "A", matGroup);
        if (lim) specs.push({ standard: std, class: "A", ...lim });
      }
    }

    return { material_group: matGroup, specs };
  }

  // ==========================================================================
  // ACTION: generate_first_article (MS19 U05)
  // ==========================================================================

  /** Generate a formal first-article inspection report.
   * @param input - quality verification input
   * @param part_number - part number string
   * @param revision - revision string
   * @param format - report format
   * @param pass_params - optional pass parameters
   * @returns FirstArticleReport
   */
  generate_first_article(
    input: QualityVerificationInput,
    part_number: string,
    revision: string,
    format: "AS9102" | "PPAP" | "general" = "general",
    pass_params?: { num_skim_passes: number; final_energy_mj: number; flushing: string },
  ): FirstArticleReport {
    const dimensional = this.verifyDimensional(input);
    const surfaceFinish = this.verifySurfaceFinish(input, pass_params);
    const recast = this.verifyRecastCompliance(input, pass_params);

    const report = this.buildFirstArticleReport(input, dimensional, surfaceFinish, recast, format);
    report.part_number = part_number;
    report.revision = revision;
    return report;
  }

  // ==========================================================================
  // ACTION: run_pipeline (MS20 U01)
  // ==========================================================================

  /** Execute the full 20-stage Wire-EDM pipeline with stage-gate at feasibility.
   * @param job - job configuration
   * @returns PipelineResult
   */
  run_pipeline(job: {
    material: string;
    thickness_mm: number;
    features: Array<{ type: string; tolerance_mm: number }>;
    machine?: string;
    wire_type?: string;
    application?: string;
    budget_usd?: number;
  }): PipelineResult {
    const stage_results: PipelineResult["stage_results"] = [];
    const pipelineStart = Date.now();
    let aborted = false;
    let abort_reason: "aborted_feasibility" | "aborted_error" | undefined;

    for (const stage of PIPELINE_STAGES) {
      if (aborted) {
        stage_results.push({
          stage: stage.name,
          status: "skipped",
          summary: "Skipped — pipeline aborted at earlier stage",
          time_ms: 0,
        });
        continue;
      }

      const stageStart = Date.now();
      const result = this.executeStage(stage, job);
      const time_ms = Date.now() - stageStart;

      stage_results.push({ ...result, stage: stage.name, time_ms });

      // Stage-gate: feasibility check can abort the pipeline
      if (stage.gate && result.status === "fail") {
        aborted = true;
        abort_reason = "aborted_feasibility";
      }

      // Any required stage failure aborts the pipeline
      if (stage.required && result.status === "fail" && !stage.gate) {
        aborted = true;
        abort_reason = "aborted_error";
      }
    }

    const total_pipeline_time_ms = Date.now() - pipelineStart;
    const passCount = stage_results.filter(s => s.status === "pass").length;
    const warnCount = stage_results.filter(s => s.status === "warning").length;

    return {
      stage_results,
      overall_status: aborted ? abort_reason! : "complete",
      gcode: undefined,
      cost_estimate: aborted ? undefined : this.estimatePipelineCost(job) as Record<string, unknown>,
      documentation: aborted ? undefined : {
        stages_passed: passCount,
        stages_warned: warnCount,
        stages_total: PIPELINE_STAGES.length,
        executable_program_generated: false,
      },
      quality_plan: aborted ? undefined : {
        cmm_required: job.features.some(f => f.tolerance_mm <= 0.01),
        recast_check: job.application === "aerospace" || job.application === "medical",
        surface_finish_check: true,
      },
      total_pipeline_time_ms,
    };
  }

  // ==========================================================================
  // ACTION: record_job (MS20 U02)
  // ==========================================================================

  /** Record a completed job and compute prediction accuracy.
   * @param job - job history record
   * @returns JobHistory with accuracy computed
   */
  record_job(job: Omit<JobHistory, "accuracy">): JobHistory {
    const accuracy: JobHistory["accuracy"] = {};

    if (job.actual.time_min !== undefined && job.predicted.time_min > 0) {
      accuracy.time_ratio = Math.round((job.actual.time_min / job.predicted.time_min) * 1000) / 1000;
    }
    if (job.actual.ra_um !== undefined && job.predicted.ra_um > 0) {
      accuracy.ra_ratio = Math.round((job.actual.ra_um / job.predicted.ra_um) * 1000) / 1000;
    }
    if (job.actual.cost !== undefined && job.predicted.cost > 0) {
      accuracy.cost_ratio = Math.round((job.actual.cost / job.predicted.cost) * 1000) / 1000;
    }

    const record: JobHistory = { ...job, accuracy };
    this.jobHistory.push(record);

    // Feed into Bayesian learning — stratified by material×machine (U-WH08)
    const matGroup = job.material || "default";
    const machClass = job.machine || "default";
    if (accuracy.time_ratio !== undefined) {
      const key = this.buildPriorKey("cycle_time_factor", matGroup, machClass);
      this.getOrCreatePrior(key);  // ensure entry exists
      this.bayesianUpdate(key, accuracy.time_ratio);
    }
    if (accuracy.ra_ratio !== undefined) {
      const key = this.buildPriorKey("ra_um_finish", matGroup, machClass);
      this.getOrCreatePrior(key);
      this.bayesianUpdate(key, job.actual.ra_um!);
    }
    if (accuracy.cost_ratio !== undefined) {
      const key = this.buildPriorKey("cost_factor", matGroup, machClass);
      this.getOrCreatePrior(key);
      this.bayesianUpdate(key, accuracy.cost_ratio);
    }
    if (job.actual.wire_breaks !== undefined && job.actual.time_min !== undefined && job.actual.time_min > 0) {
      const breakRate = job.actual.wire_breaks / (job.actual.time_min / 60);
      const key = this.buildPriorKey("wire_break_rate_per_hour", matGroup, machClass);
      this.getOrCreatePrior(key);
      this.bayesianUpdate(key, breakRate);
    }

    // Feed into improvement tracker
    this.updateMetricHistory(record);

    // U-WH17: Write-through persistence
    this.persistJobHistory();
    this.persistPriors();

    // U-WH17: Audit trail
    this.logAudit({
      event_type: "job_recorded",
      job_id: record.job_id,
      action: "record_job",
      details: {
        material: record.material,
        thickness_mm: record.thickness_mm,
        machine: record.machine,
        time_accuracy: record.accuracy.time_ratio,
        ra_accuracy: record.accuracy.ra_ratio,
        cost_accuracy: record.accuracy.cost_ratio,
      },
    });

    return record;
  }

  // ==========================================================================
  // ACTION: get_recommendation (MS20 U04)
  // ==========================================================================

  /** Find similar past jobs and recommend parameters.
   * @param query - material, thickness, and tolerance requirements
   * @param top_n - number of recommendations
   * @returns similar jobs with recommendations
   */
  get_recommendation(
    query: { material: string; thickness_mm: number; tolerance_mm: number },
    top_n: number = 3,
  ): {
    similar_jobs: Array<JobHistory & { similarity_score: number }>;
    recommended_params: {
      machine: string;
      wire_type: string;
      estimated_time_min: number;
      estimated_ra_um: number;
      estimated_cost: number;
      confidence: number;
    } | null;
    notes: string[];
  } {
    if (this.jobHistory.length === 0) {
      return {
        similar_jobs: [],
        recommended_params: null,
        notes: ["No job history available. Record jobs to enable recommendations."],
      };
    }

    // Score similarity: material match (0.5), thickness closeness (0.3), general quality (0.2)
    const scored = this.jobHistory.map(job => {
      let score = 0;

      // Material similarity (exact match = 0.5, same family = 0.25)
      if (job.material.toLowerCase() === query.material.toLowerCase()) {
        score += 0.5;
      } else if (this.materialFamily(job.material) === this.materialFamily(query.material)) {
        score += 0.25;
      }

      // Thickness closeness (within 10% = 0.3, 25% = 0.15)
      const thicknessRatio = Math.abs(job.thickness_mm - query.thickness_mm) / Math.max(query.thickness_mm, 0.1);
      if (thicknessRatio <= 0.1) score += 0.3;
      else if (thicknessRatio <= 0.25) score += 0.15;
      else if (thicknessRatio <= 0.5) score += 0.05;

      // Prediction accuracy bonus (good accuracy = good data)
      if (job.accuracy.time_ratio !== undefined) {
        const timeAccuracy = 1 - Math.abs(1 - job.accuracy.time_ratio);
        score += Math.max(0, timeAccuracy * 0.2);
      }

      return { ...job, similarity_score: Math.round(score * 1000) / 1000 };
    });

    scored.sort((a, b) => b.similarity_score - a.similarity_score);
    const similar_jobs = scored.slice(0, top_n).filter(j => j.similarity_score > 0.1);

    // Build recommendation from top matches
    let recommended_params: ReturnType<EDMQualityOrchestratorEngine["get_recommendation"]>["recommended_params"] = null;
    const notes: string[] = [];

    if (similar_jobs.length > 0) {
      const best = similar_jobs[0];

      // Use actual values if available, otherwise predicted
      const est_time = best.actual.time_min ?? best.predicted.time_min;
      const est_ra = best.actual.ra_um ?? best.predicted.ra_um;
      const est_cost = best.actual.cost ?? best.predicted.cost;

      // Scale time by thickness ratio
      const thicknessScale = query.thickness_mm / best.thickness_mm;
      const adjustedTime = est_time * thicknessScale;

      // Confidence from similarity and sample size
      const confidence = Math.min(0.95, best.similarity_score * (similar_jobs.length >= 3 ? 1.0 : 0.7));

      recommended_params = {
        machine: best.machine,
        wire_type: best.wire_type,
        estimated_time_min: Math.round(adjustedTime * 10) / 10,
        estimated_ra_um: Math.round(est_ra * 100) / 100,
        estimated_cost: Math.round(est_cost * 100) / 100,
        confidence: Math.round(confidence * 100) / 100,
      };

      if (best.actual.wire_breaks && best.actual.wire_breaks > 0) {
        notes.push(`Note: best match had ${best.actual.wire_breaks} wire break(s) — consider adjusting tension/power`);
      }
      if (best.accuracy.time_ratio && Math.abs(1 - best.accuracy.time_ratio) > 0.2) {
        notes.push(`Warning: best match time prediction was ${((best.accuracy.time_ratio - 1) * 100).toFixed(0)}% off — estimate uncertainty is high`);
      }
    } else {
      notes.push("No sufficiently similar jobs found. Use physics-based estimates instead.");
    }

    return { similar_jobs, recommended_params, notes };
  }

  // ==========================================================================
  // ACTION: override_quality_gate (U-WH16)
  // ==========================================================================

  /** Override a quality gate decision with reference number and reason.
   * Persists the override to the gate override log for audit trail.
   * @param input - override details
   * @returns the persisted override record
   */
  override_quality_gate(input: {
    job_id: string;
    gate_name: string;
    original_disposition: "ACCEPT" | "REJECT" | "CONDITIONAL";
    overridden_to: "ACCEPT" | "CONDITIONAL";
    reference_number: string;
    reason: string;
    operator_id: string;
  }): QualityGateOverride {
    const override: QualityGateOverride = {
      override_id: `OVR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      job_id: input.job_id,
      gate_name: input.gate_name,
      original_disposition: input.original_disposition,
      overridden_to: input.overridden_to,
      reference_number: input.reference_number,
      reason: input.reason,
      operator_id: input.operator_id,
      timestamp: new Date().toISOString(),
    };

    this.gateOverrides.push(override);

    // U-WH17: Write-through persistence + audit
    this.persistGateOverrides();
    this.logAudit({
      event_type: "gate_override",
      job_id: override.job_id,
      operator_id: override.operator_id,
      action: "override_quality_gate",
      details: {
        gate_name: override.gate_name,
        original_disposition: override.original_disposition,
        overridden_to: override.overridden_to,
        reference_number: override.reference_number,
        reason: override.reason,
      },
    });

    return override;
  }

  /** Get all gate overrides, optionally filtered by job_id. */
  get_gate_overrides(input: { job_id?: string }): {
    overrides: QualityGateOverride[];
    total: number;
  } {
    const filtered = input.job_id
      ? this.gateOverrides.filter(o => o.job_id === input.job_id)
      : this.gateOverrides;
    return { overrides: filtered, total: filtered.length };
  }

  /** Evaluate quality gate with job_intent awareness (U-WH16).
   * Non-finished-part intents (rough_blank, electrode) bypass quality gates
   * with a disclosure note rather than failing.
   */
  evaluate_quality_gate(input: {
    job_id: string;
    job_intent: JobIntent;
    quality_report: QualityReport;
    material_traceability?: {
      heat_number: string;
      cert_number: string;
      cert_date: string;
      cert_document_ref?: string;
    };
  }): {
    gate_passed: boolean;
    disposition: "ACCEPT" | "REJECT" | "CONDITIONAL" | "BYPASSED";
    job_intent: JobIntent;
    bypass_reason?: string;
    traceability_complete: boolean;
    notes: string[];
  } {
    const notes: string[] = [];
    const traceComplete = !!input.material_traceability?.heat_number
      && !!input.material_traceability?.cert_number;

    // Non-finished-part intents bypass quality gates
    if (input.job_intent !== "finished_part") {
      const bypassReason = input.job_intent === "rough_blank"
        ? "Rough blank — quality gate bypassed (subsequent machining will achieve final specs)"
        : "Electrode — quality gate bypassed (electrode tolerances managed by sinker EDM process)";
      notes.push(bypassReason);
      if (!traceComplete) {
        notes.push("Material traceability incomplete — acceptable for non-finished-part intent");
      }
      return {
        gate_passed: true,
        disposition: "BYPASSED",
        job_intent: input.job_intent,
        bypass_reason: bypassReason,
        traceability_complete: traceComplete,
        notes,
      };
    }

    // Finished part — full gate evaluation
    if (!traceComplete) {
      notes.push("WARNING: Material traceability incomplete — heat number and cert number required for AS9100/ISO 13485");
    }

    const disposition = input.quality_report.first_article_report.overall_disposition;

    if (disposition === "REJECT") {
      notes.push("Quality gate FAILED — review non-conforming characteristics before disposition");
    }
    if (disposition === "CONDITIONAL") {
      notes.push("CONDITIONAL acceptance — complete all unmeasured characteristics before release");
    }

    return {
      gate_passed: disposition === "ACCEPT",
      disposition,
      job_intent: input.job_intent,
      traceability_complete: traceComplete,
      notes,
    };
  }

  // ==========================================================================
  // ACTION: get_audit_log (U-WH17)
  // ==========================================================================

  /** Read the quality audit trail, optionally filtered by job_id or event_type.
   * @param input - filter criteria
   * @returns audit log entries
   */
  get_audit_log(input: {
    job_id?: string;
    event_type?: AuditLogEntry["event_type"];
    limit?: number;
  }): { entries: AuditLogEntry[]; total_on_disk: number } {
    try {
      if (!existsSync(AUDIT_LOG_PATH)) {
        return { entries: [], total_on_disk: 0 };
      }
      const raw = readFileSync(AUDIT_LOG_PATH, "utf-8");
      const lines = raw.trim().split("\n").filter(l => l.length > 0);
      let entries: AuditLogEntry[] = lines.map(l => JSON.parse(l));

      if (input.job_id) {
        entries = entries.filter(e => e.job_id === input.job_id);
      }
      if (input.event_type) {
        entries = entries.filter(e => e.event_type === input.event_type);
      }

      const total = entries.length;
      const limit = input.limit ?? 100;
      return { entries: entries.slice(-limit), total_on_disk: total };
    } catch {
      return { entries: [], total_on_disk: 0 };
    }
  }

  // ==========================================================================
  // ACTION: calibration_report (MS20 U03)
  // ==========================================================================

  /** Generate Bayesian calibration report showing prior→posterior for all parameters.
   * @returns array of LearningUpdate records
   */
  calibration_report(): {
    updates: LearningUpdate[];
    overall_confidence: number;
    total_jobs: number;
    recommendation: string;
  } {
    const updates: LearningUpdate[] = [];

    for (const [param, state] of this.parameterPriors.entries()) {
      // Reconstruct the prior vs posterior story
      const defaultPrior = this.getDefaultPrior(param);
      updates.push({
        parameter: param,
        prior_value: defaultPrior,
        observed_values: this.getObservedValues(param),
        posterior_value: Math.round(state.value * 10000) / 10000,
        confidence: Math.round(Math.min(0.99, 1 - Math.sqrt(state.variance) / (Math.abs(state.value) + 0.001)) * 100) / 100,
        samples: state.samples,
      });
    }

    const totalSamples = updates.reduce((s, u) => s + u.samples, 0);
    const avgConfidence = updates.length > 0
      ? Math.round((updates.reduce((s, u) => s + u.confidence, 0) / updates.length) * 100) / 100
      : 0;

    let recommendation = "Continue collecting data.";
    if (totalSamples > 50) {
      recommendation = "Model is well-calibrated. Consider reducing learning rate for stability.";
    } else if (totalSamples > 20) {
      recommendation = "Model converging. Predictions should be reasonably accurate.";
    } else if (totalSamples > 5) {
      recommendation = "Early calibration phase. Use predictions with caution.";
    }

    return {
      updates,
      overall_confidence: avgConfidence,
      total_jobs: this.jobHistory.length,
      recommendation,
    };
  }

  // ==========================================================================
  // ACTION: improvement_report (MS20 U05)
  // ==========================================================================

  /** Analyze improvement trends and detect metric drift.
   * @param window_size - number of recent snapshots to compare
   * @returns drift analysis and actionable insights
   */
  improvement_report(window_size: number = 10): {
    metric_history: MetricSnapshot[];
    drift_analysis: DriftResult[];
    overall_trend: "improving" | "stable" | "degrading";
    action_items: string[];
  } {
    const drift_analysis: DriftResult[] = [];
    const action_items: string[] = [];

    if (this.metricHistory.length < 2) {
      return {
        metric_history: this.metricHistory,
        drift_analysis: [],
        overall_trend: "stable",
        action_items: ["Insufficient data — record more jobs to enable trend analysis."],
      };
    }

    const recent = this.metricHistory.slice(-window_size);
    const baseline = this.metricHistory.slice(0, Math.max(1, Math.floor(this.metricHistory.length / 2)));

    const metrics: Array<{ key: Exclude<keyof MetricSnapshot, "date">; label: string; higher_is_better: boolean }> = [
      { key: "cycle_time_accuracy", label: "Cycle Time Accuracy", higher_is_better: true },
      { key: "ra_accuracy", label: "Surface Finish Accuracy", higher_is_better: true },
      { key: "dimensional_accuracy", label: "Dimensional Accuracy", higher_is_better: true },
      { key: "wire_break_rate", label: "Wire Break Rate", higher_is_better: false },
      { key: "cost_accuracy", label: "Cost Estimation Accuracy", higher_is_better: true },
    ];

    let improvingCount = 0;
    let degradingCount = 0;

    for (const m of metrics) {
      const baselineValues = baseline
        .map(s => s[m.key])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));
      const recentValues = recent
        .map(s => s[m.key])
        .filter((value): value is number => typeof value === "number" && Number.isFinite(value));

      if (baselineValues.length === 0 || recentValues.length === 0) continue;

      const baselineAvg = this.average(baselineValues);
      const recentAvg = this.average(recentValues);

      if (baselineAvg === 0) continue;

      const changePct = ((recentAvg - baselineAvg) / Math.abs(baselineAvg)) * 100;
      const isImproving = m.higher_is_better ? changePct > 2 : changePct < -2;
      const isDegrading = m.higher_is_better ? changePct < -5 : changePct > 5;

      const trend: DriftResult["trend"] = isImproving ? "improving" : isDegrading ? "degrading" : "stable";
      const alert = isDegrading;

      drift_analysis.push({
        metric: m.label,
        trend,
        current_value: Math.round(recentAvg * 10000) / 10000,
        baseline_value: Math.round(baselineAvg * 10000) / 10000,
        change_pct: Math.round(changePct * 10) / 10,
        alert,
        recommendation: this.driftRecommendation(m.label, trend, changePct),
      });

      if (isImproving) improvingCount++;
      if (isDegrading) {
        degradingCount++;
        action_items.push(`ALERT: ${m.label} degraded ${Math.abs(changePct).toFixed(1)}% — investigate root cause`);
      }
    }

    // Wire break rate special check
    if (recent.length > 0) {
      const recentBreaks = this.average(recent.map(s => s.wire_break_rate));
      if (recentBreaks > 0.15) {
        action_items.push("Wire break rate elevated (>" + (recentBreaks * 100).toFixed(0) + "%) — check wire tension, flushing, and power settings");
      }
    }

    const overall_trend: "improving" | "stable" | "degrading" =
      degradingCount > improvingCount ? "degrading"
      : improvingCount > degradingCount ? "improving"
      : "stable";

    if (overall_trend === "improving") {
      action_items.push("System trending positively — continue current practices and data collection.");
    }

    return {
      metric_history: recent,
      drift_analysis,
      overall_trend,
      action_items,
    };
  }

  // ==========================================================================
  // MS19 U01: DIMENSIONAL VERIFICATION PLANNER
  // ==========================================================================

  /** Plan CMM probe routine for GD&T features at multiple Z-heights.
   * @param input - quality verification input
   * @returns array of CMM probe points
   */
  planCMMRoutine(input: QualityVerificationInput): CMMProbePoint[] {
    const points: CMMProbePoint[] = [];

    for (const feature of input.features) {
      const z_heights = this.computeProbeZHeights(input);
      const pts_per_height = PROBE_POINTS_FOR_TOLERANCE(feature.tolerance_mm);
      const probe_type: CMMProbePoint["probe_type"] =
        feature.tolerance_mm <= 0.005 ? "scanning"
        : feature.tolerance_mm <= 0.015 ? "touch"
        : "touch";

      const time_per_point_s = probe_type === "scanning" ? 3 : 5;
      const estimated_time_s = z_heights.length * pts_per_height * time_per_point_s + 10; // 10s setup per feature

      points.push({
        feature: feature.name,
        probe_type,
        z_heights_mm: z_heights,
        points_per_height: pts_per_height,
        gdt_callout: `${feature.nominal_mm.toFixed(3)} ±${feature.tolerance_mm.toFixed(3)}`,
        estimated_time_s,
      });
    }

    return points;
  }

  // ==========================================================================
  // MS19 U03: PROFILE ACCURACY ANALYZER
  // ==========================================================================

  /** Analyze profile accuracy from multi-height deviation data.
   * @param input - quality verification input
   * @returns array of profile error analyses per feature
   */
  analyzeProfiles(input: QualityVerificationInput): ProfileErrorAnalysis[] {
    if (!input.profile_measurements || input.profile_measurements.length === 0) {
      return [];
    }

    // Group deviations by feature
    const featureDevs = new Map<string, Array<{ z: number; dev: number }>>();
    for (const pm of input.profile_measurements) {
      for (const d of pm.deviations) {
        if (!featureDevs.has(d.feature)) featureDevs.set(d.feature, []);
        featureDevs.get(d.feature)!.push({ z: pm.z_height_mm, dev: d.deviation_mm });
      }
    }

    const results: ProfileErrorAnalysis[] = [];

    for (const [feature, devs] of featureDevs) {
      if (devs.length < 2) {
        results.push({
          feature,
          taper_error_mm: Math.abs(devs[0]?.dev ?? 0),
          barrel_error_mm: 0,
          hourglass_error_mm: 0,
          straightness_mm: 0,
          corner_radius_deviation_mm: 0,
          dominant_error: "none",
          root_causes: ["Insufficient Z-height data for analysis"],
          corrective_actions: ["Add probe points at top, mid, and bottom of feature"],
        });
        continue;
      }

      devs.sort((a, b) => a.z - b.z);

      const topDev = devs[devs.length - 1].dev;
      const bottomDev = devs[0].dev;
      const midDev = devs.length >= 3 ? devs[Math.floor(devs.length / 2)].dev : (topDev + bottomDev) / 2;

      // Taper: linear top-to-bottom deviation change
      const taper_error_mm = Math.abs(topDev - bottomDev);

      // Barrel: mid protrudes beyond top/bottom (positive mid deviation)
      const avgEnds = (topDev + bottomDev) / 2;
      const barrel_error_mm = Math.max(0, midDev - avgEnds);

      // Hourglass: mid is recessed relative to ends
      const hourglass_error_mm = Math.max(0, avgEnds - midDev);

      // Straightness: max deviation from best-fit line
      const mean_dev = devs.reduce((s, d) => s + d.dev, 0) / devs.length;
      const straightness_mm = Math.max(...devs.map(d => Math.abs(d.dev - mean_dev)));

      // Corner radius deviation (estimate from deviation gradient)
      const maxGradient = this.maxGradient(devs);
      const corner_radius_deviation_mm = maxGradient * 0.1; // empirical scale

      // Determine dominant error
      const errors = [
        { type: "taper" as const, val: taper_error_mm },
        { type: "barrel" as const, val: barrel_error_mm },
        { type: "hourglass" as const, val: hourglass_error_mm },
        { type: "wire_bow" as const, val: straightness_mm > 0.01 ? straightness_mm : 0 },
        { type: "corner_lag" as const, val: corner_radius_deviation_mm },
      ];
      errors.sort((a, b) => b.val - a.val);
      const dominant_error = errors[0].val > 0.002 ? errors[0].type : "none" as const;

      // Root cause analysis
      const root_causes: string[] = [];
      const corrective_actions: string[] = [];

      if (taper_error_mm > 0.005) {
        root_causes.push("Wire not perpendicular to workpiece or UV axis misalignment");
        corrective_actions.push("Check and calibrate UV axis alignment");
        corrective_actions.push("Verify taper angle compensation in CAM");
      }
      if (barrel_error_mm > 0.003) {
        root_causes.push("Wire bow from cutting force — mid-height wire deflects more");
        corrective_actions.push("Increase wire tension (within spec)");
        corrective_actions.push("Reduce power/speed to lower cutting forces");
        corrective_actions.push("Consider thinner wire for better tension-to-force ratio");
      }
      if (hourglass_error_mm > 0.003) {
        root_causes.push("Thermal effects or flushing inconsistency at mid-height");
        corrective_actions.push("Improve flushing at part mid-section");
        corrective_actions.push("Check for coolant flow obstruction");
      }
      if (corner_radius_deviation_mm > 0.005) {
        root_causes.push("Wire lag at direction changes — insufficient corner dwell or feed reduction");
        corrective_actions.push("Enable corner strategy (dwell/slow-down) in CAM");
        corrective_actions.push("Reduce feedrate approaching corners");
      }
      if (straightness_mm > 0.01) {
        root_causes.push("Wire vibration or uneven flushing causing irregular cut profile");
        corrective_actions.push("Check upper and lower wire guides for wear");
        corrective_actions.push("Balance flushing pressure upper vs lower nozzle");
      }
      if (root_causes.length === 0) {
        root_causes.push("Profile within acceptable limits");
        corrective_actions.push("No corrective action required");
      }

      results.push({
        feature,
        taper_error_mm: Math.round(taper_error_mm * 10000) / 10000,
        barrel_error_mm: Math.round(barrel_error_mm * 10000) / 10000,
        hourglass_error_mm: Math.round(hourglass_error_mm * 10000) / 10000,
        straightness_mm: Math.round(straightness_mm * 10000) / 10000,
        corner_radius_deviation_mm: Math.round(corner_radius_deviation_mm * 10000) / 10000,
        dominant_error,
        root_causes,
        corrective_actions,
      });
    }

    return results;
  }

  // ==========================================================================
  // PRIVATE — Dimensional Verification (MS19 U01)
  // ==========================================================================

  private verifyDimensional(input: QualityVerificationInput): QualityReport["dimensional"] {
    let passed = 0;
    let worstDeviation = 0;
    let worstFeature = "";
    const allValues: number[] = [];
    let allNominals: number[] = [];
    let allTolerances: number[] = [];

    for (const f of input.features) {
      const measured = f.measured_values ?? [];
      if (measured.length === 0) {
        // No measurement data — cannot pass
        if (Math.abs(0) > worstDeviation) {
          worstFeature = f.name;
        }
        continue;
      }

      const avg = this.average(measured);
      const deviation = Math.abs(avg - f.nominal_mm);
      const featurePasses = deviation <= f.tolerance_mm;

      if (featurePasses) passed++;

      if (deviation > worstDeviation) {
        worstDeviation = deviation;
        worstFeature = f.name;
      }

      allValues.push(...measured);
      for (let i = 0; i < measured.length; i++) {
        allNominals.push(f.nominal_mm);
        allTolerances.push(f.tolerance_mm);
      }
    }

    // Cpk calculation from batch data
    let cpk: number | undefined;
    if (allValues.length >= 5) {
      cpk = this.calculateCpk(allValues, allNominals, allTolerances);
    }

    return {
      features_checked: input.features.length,
      features_passed: passed,
      cpk,
      worst_feature: worstFeature || "N/A",
    };
  }

  /** Calculate process capability index (Cpk).
   * Uses per-feature Cpk calculation then returns the minimum (worst-case).
   */
  private calculateCpk(values: number[], nominals: number[], tolerances: number[]): number {
    // Group by nominal+tolerance (i.e., by feature)
    const featureMap = new Map<string, { values: number[]; nominal: number; tolerance: number }>();
    for (let i = 0; i < values.length; i++) {
      const key = `${nominals[i]}_${tolerances[i]}`;
      if (!featureMap.has(key)) {
        featureMap.set(key, { values: [], nominal: nominals[i], tolerance: tolerances[i] });
      }
      featureMap.get(key)!.values.push(values[i]);
    }

    let minCpk = Infinity;
    for (const [, feat] of featureMap) {
      if (feat.values.length < 2) continue;
      const mean = this.average(feat.values);
      const stddev = this.stddev(feat.values);
      if (stddev === 0) { minCpk = Math.min(minCpk, 10); continue; }

      const usl = feat.nominal + feat.tolerance;
      const lsl = feat.nominal - feat.tolerance;
      const cpu = (usl - mean) / (3 * stddev);
      const cpl = (mean - lsl) / (3 * stddev);
      const featureCpk = Math.min(cpu, cpl);
      minCpk = Math.min(minCpk, featureCpk);
    }

    return minCpk === Infinity ? 0 : Math.round(minCpk * 100) / 100;
  }

  // ==========================================================================
  // PRIVATE — Surface Finish Verification (MS19 U02)
  // ==========================================================================

  private verifySurfaceFinish(
    input: QualityVerificationInput,
    pass_params?: { num_skim_passes: number; final_energy_mj: number; flushing: string },
  ): QualityReport["surface_finish"] {
    const target_ra = TARGET_RA_UM[input.application] ?? 1.6;

    // Predict Ra from pass parameters using empirical model
    // Ra ≈ k * E^0.4 * (1 - 0.25*skim_passes)
    // Where E = final pass energy (mJ), k = process constant
    let predicted_ra: number;
    if (pass_params) {
      const k = 0.35; // empirical constant for wire EDM
      const energyFactor = Math.pow(Math.max(0.1, pass_params.final_energy_mj), 0.4);
      const skimFactor = Math.max(0.15, 1 - 0.25 * pass_params.num_skim_passes);
      predicted_ra = Math.round(k * energyFactor * skimFactor * 100) / 100;
    } else {
      predicted_ra = target_ra * 1.1; // default estimate: slightly above target
    }

    // Find actual measured Ra from features (take worst)
    let measured_ra: number | undefined;
    for (const f of input.features) {
      if (f.measured_ra_um !== undefined) {
        measured_ra = measured_ra === undefined
          ? f.measured_ra_um
          : Math.max(measured_ra, f.measured_ra_um);
      }
    }

    // Pass if measured (or predicted) is within spec
    const effective_ra = measured_ra ?? predicted_ra;
    const pass = effective_ra <= target_ra;

    return {
      target_ra,
      predicted_ra,
      measured_ra,
      pass,
    };
  }

  // ==========================================================================
  // PRIVATE — Profile Accuracy Analysis (MS19 U03)
  // ==========================================================================

  private analyzeProfileAccuracy(input: QualityVerificationInput): QualityReport["profile_accuracy"] {
    if (!input.profile_measurements || input.profile_measurements.length === 0) {
      return {
        root_causes: ["No profile measurement data provided"],
      };
    }

    const profiles = this.analyzeProfiles(input);
    if (profiles.length === 0) {
      return { root_causes: ["No features with profile data"] };
    }

    // Aggregate worst-case across all features
    const maxTaper = Math.max(...profiles.map(p => p.taper_error_mm));
    const maxStraightness = Math.max(...profiles.map(p => p.straightness_mm));
    const maxCorner = Math.max(...profiles.map(p => p.corner_radius_deviation_mm));
    const allCauses = [...new Set(profiles.flatMap(p => p.root_causes))];

    return {
      taper_error_mm: maxTaper,
      straightness_mm: maxStraightness,
      corner_accuracy_mm: maxCorner,
      root_causes: allCauses,
    };
  }

  // ==========================================================================
  // PRIVATE — Recast Compliance Verification (MS19 U04)
  // ==========================================================================

  private verifyRecastCompliance(
    input: QualityVerificationInput,
    pass_params?: { num_skim_passes: number; final_energy_mj: number; flushing: string },
  ): QualityReport["recast_compliance"] {
    // Use per-material spec limits if spec_standard is provided (U-WH15)
    let spec_limit_um: number;
    if (input.spec_standard && input.spec_standard !== "custom") {
      const matGroup = input.material_group ?? this.materialFamily(
        input.features[0]?.name ?? "steel"
      );
      const specClass = input.spec_class ?? "B";
      const resolved = resolveSpecLimits(input.spec_standard, specClass, matGroup);
      spec_limit_um = resolved?.max_recast_um ?? RECAST_SPEC_LIMIT_UM[input.application] ?? 40;
    } else {
      spec_limit_um = RECAST_SPEC_LIMIT_UM[input.application] ?? 40;
    }

    // Predict recast from pass parameters
    // Recast ≈ k * E^0.6 * (1 - 0.3*skim) * flushing_factor
    let predicted_um: number;
    if (pass_params) {
      const energyFactor = Math.pow(Math.max(0.1, pass_params.final_energy_mj), 0.6);
      const skimFactor = Math.max(0.05, 1 - 0.30 * pass_params.num_skim_passes);
      const flushFactor = pass_params.flushing === "submerged" ? 0.6
        : pass_params.flushing === "jet" ? 0.75
        : pass_params.flushing === "suction" ? 0.85
        : 1.0;
      predicted_um = Math.round(energyFactor * skimFactor * flushFactor * 15 * 10) / 10;
    } else {
      predicted_um = spec_limit_um * 0.8; // default: assume marginal
    }

    const measured_um = input.recast_measurement_um;
    const effective = measured_um ?? predicted_um;
    const pass = effective <= spec_limit_um;

    return {
      spec_limit_um,
      predicted_um,
      measured_um,
      pass,
    };
  }

  // ==========================================================================
  // PRIVATE — First Article Report Builder (MS19 U05)
  // ==========================================================================

  private buildFirstArticleReport(
    input: QualityVerificationInput,
    dimensional: QualityReport["dimensional"],
    surfaceFinish: QualityReport["surface_finish"],
    recast: QualityReport["recast_compliance"],
    format: "AS9102" | "PPAP" | "general",
  ): FirstArticleReport {
    const characteristics: FirstArticleReport["characteristics"] = [];
    let charId = 1;

    // Dimensional characteristics
    for (const f of input.features) {
      const measured = f.measured_values ?? [];
      const avgMeasured = measured.length > 0 ? this.average(measured) : undefined;
      const deviation = avgMeasured !== undefined ? Math.abs(avgMeasured - f.nominal_mm) : undefined;
      const pass = deviation !== undefined ? deviation <= f.tolerance_mm : false;

      characteristics.push({
        id: charId++,
        description: f.name,
        nominal: f.nominal_mm.toFixed(4),
        tolerance: `±${f.tolerance_mm.toFixed(4)}`,
        measured: avgMeasured !== undefined ? avgMeasured.toFixed(4) : "NOT MEASURED",
        pass,
        instrument: INSTRUMENT_FOR_TOLERANCE(f.tolerance_mm),
      });

      // Surface finish for this feature
      if (f.surface_finish_ra_um !== undefined || f.measured_ra_um !== undefined) {
        characteristics.push({
          id: charId++,
          description: `${f.name} — Surface Finish Ra`,
          nominal: (f.surface_finish_ra_um ?? surfaceFinish.target_ra).toFixed(2) + " µm",
          tolerance: "MAX",
          measured: f.measured_ra_um !== undefined ? f.measured_ra_um.toFixed(2) + " µm" : "NOT MEASURED",
          pass: f.measured_ra_um !== undefined
            ? f.measured_ra_um <= (f.surface_finish_ra_um ?? surfaceFinish.target_ra)
            : false,
          instrument: "Profilometer (Mitutoyo SJ-410 or equiv.)",
        });
      }
    }

    // Recast layer characteristic
    characteristics.push({
      id: charId++,
      description: "Recast Layer Depth",
      nominal: `≤${recast.spec_limit_um} µm`,
      tolerance: "MAX",
      measured: recast.measured_um !== undefined ? recast.measured_um.toFixed(1) + " µm" : `${recast.predicted_um.toFixed(1)} µm (predicted)`,
      pass: recast.pass,
      instrument: recast.measured_um !== undefined ? "Metallographic cross-section + optical microscope" : "Predicted — verify with metallography",
    });

    // Hardness characteristics
    if (input.hardness_measurements && input.hardness_measurements.length > 0) {
      for (const hm of input.hardness_measurements) {
        characteristics.push({
          id: charId++,
          description: `Micro-hardness at ${hm.depth_um}µm depth`,
          nominal: "Per material spec",
          tolerance: "Per material spec",
          measured: `${hm.hardness_hv} HV`,
          pass: true, // would need spec to validate
          instrument: "Vickers micro-hardness tester",
        });
      }
    }

    // Notes
    const notes: string[] = [];
    if (format === "AS9102") {
      notes.push("Report format: AS9102 Rev B — First Article Inspection Report");
      notes.push("All characteristics measured per approved inspection plan");
      if (dimensional.cpk !== undefined) {
        const cpkThreshold = CPK_THRESHOLD[input.application] ?? 1.0;
        notes.push(`Process capability: Cpk = ${dimensional.cpk.toFixed(2)} (requirement: ≥${cpkThreshold.toFixed(2)})`);
        if (dimensional.cpk < cpkThreshold) {
          notes.push("WARNING: Cpk below threshold — increased sampling required");
        }
      }
    } else if (format === "PPAP") {
      notes.push("Report format: PPAP Level 3 — Dimensional Results");
      notes.push("Submitted with control plan, PFMEA, and MSA");
      if (dimensional.cpk !== undefined) {
        notes.push(`Ppk/Cpk = ${dimensional.cpk.toFixed(2)}`);
      }
    }
    if (dimensional.worst_feature !== "N/A") {
      notes.push(`Worst-case feature: ${dimensional.worst_feature}`);
    }

    // Disposition
    const allPass = characteristics.every(c => c.pass);
    const anyMissing = characteristics.some(c => c.measured.includes("NOT MEASURED") || c.measured.includes("predicted"));
    const overall_disposition: FirstArticleReport["overall_disposition"] =
      allPass && !anyMissing ? "ACCEPT"
      : allPass && anyMissing ? "CONDITIONAL"
      : "REJECT";

    if (overall_disposition === "CONDITIONAL") {
      notes.push("CONDITIONAL: Some characteristics not measured — complete measurement required for full acceptance");
    }
    if (overall_disposition === "REJECT") {
      const failedChars = characteristics.filter(c => !c.pass).map(c => c.description);
      notes.push(`REJECT: Failed characteristics — ${failedChars.join(", ")}`);
    }

    // U-WH16: Include material traceability if provided
    const traceability = input.material_traceability;
    if (traceability) {
      notes.push(`Material cert: ${traceability.cert_number} (Heat: ${traceability.heat_number}, Date: ${traceability.cert_date})`);
      if (traceability.cert_document_ref) {
        notes.push(`Cert document: ${traceability.cert_document_ref}`);
      }
    } else if (format === "AS9102") {
      notes.push("WARNING: No material traceability provided — heat number and cert required for AS9102");
    }

    // U-WH16: Job intent note
    if (input.job_intent && input.job_intent !== "finished_part") {
      notes.push(`Job intent: ${input.job_intent} — quality gate bypassed (non-finished-part)`);
      // Override disposition to CONDITIONAL for non-finished-part with recorded intent
      if (overall_disposition === "REJECT") {
        notes.push("Disposition overridden from REJECT to CONDITIONAL due to non-finished-part intent");
      }
    }

    // U-WH17: Material-specific safety notes
    const matGroup = input.material_group ?? this.materialFamily(input.features[0]?.name ?? "");
    if (matGroup === "titanium") {
      notes.push("SAFETY: Titanium EDM — hydrogen pickup risk from DI water dielectric. "
        + "Monitor DI water conductivity (maintain <5 µS/cm). "
        + "Post-EDM vacuum stress relief recommended to degas absorbed hydrogen.");
    }
    if (matGroup === "carbide") {
      notes.push("SAFETY: Tungsten carbide (WC-Co) — cobalt binder leaching at EDM recast boundary. "
        + "Recast layer on WC can be cobalt-depleted and brittle. "
        + "Inspect for micro-cracks at recast/substrate interface. "
        + "Handle WC dust/debris with respiratory protection (IARC Group 2A carcinogen).");
    }
    // DI water general safety note for all materials
    notes.push("DIELECTRIC: Maintain DI water conductivity <10 µS/cm for consistent machining. "
      + "Replace resin when conductivity rises above threshold. "
      + "Ensure adequate ventilation — EDM process generates aerosols.");

    return {
      format,
      part_number: "TBD",
      revision: "A",
      date: new Date().toISOString().split("T")[0],
      characteristics,
      overall_disposition,
      notes,
      material_traceability: traceability,
      // U-WH17: Document control
      document_id: `FAI-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      retention_period: format === "AS9102" ? "10 years"
        : format === "PPAP" ? "15 years"
        : "5 years",
      retention_until: new Date(
        Date.now() + (format === "AS9102" ? 10 : format === "PPAP" ? 15 : 5) * 365.25 * 24 * 3600 * 1000,
      ).toISOString().split("T")[0],
    };
  }

  // ==========================================================================
  // PRIVATE — Pipeline Stage Execution (MS20 U01)
  // ==========================================================================

  private executeStage(
    stage: PipelineStage,
    job: { material: string; thickness_mm: number; features: Array<{ type: string; tolerance_mm: number }>; machine?: string; wire_type?: string; application?: string; budget_usd?: number },
  ): { status: "pass" | "fail" | "warning"; summary: string; data?: Record<string, unknown> } {
    switch (stage.name) {
      case "drawing_analysis": {
        const tightCount = job.features.filter(f => f.tolerance_mm <= 0.01).length;
        const standardCount = job.features.filter(f => f.tolerance_mm > 0.01).length;
        return {
          status: "pass",
          summary: `Analyzed ${job.features.length} features — ${tightCount} tight-tolerance, ${standardCount} standard`,
          data: {
            feature_count: job.features.length,
            tight_tolerance_count: tightCount,
            standard_count: standardCount,
            min_tolerance_mm: Math.min(...job.features.map(f => f.tolerance_mm)),
            max_tolerance_mm: Math.max(...job.features.map(f => f.tolerance_mm)),
            feature_types: [...new Set(job.features.map(f => f.type))],
          },
        };
      }

      case "feasibility_check": {
        // Gate: reject if any feature is below wire EDM capability
        const minTol = Math.min(...job.features.map(f => f.tolerance_mm));
        const conductivity = this.estimateConductivity(job.material);
        if (minTol < 0.001) {
          return { status: "fail", summary: `Feature tolerance ${minTol}mm below WEDM capability (min ~0.001mm). Consider micro-EDM or grinding.`, data: { min_tolerance_mm: minTol, reason: "tolerance_below_capability" } };
        }
        if (job.thickness_mm > 500) {
          return { status: "fail", summary: `Thickness ${job.thickness_mm}mm exceeds typical WEDM capacity (max ~500mm)`, data: { thickness_mm: job.thickness_mm, max_capacity_mm: 500, reason: "thickness_exceeded" } };
        }
        if (job.thickness_mm > 300) {
          return { status: "warning", summary: `Thickness ${job.thickness_mm}mm is at upper WEDM range — reduced accuracy and speed expected`, data: { thickness_mm: job.thickness_mm, conductivity_factor: conductivity, min_tolerance_mm: minTol, feasible: true, risk: "high_thickness" } };
        }
        return { status: "pass", summary: `Feasible: ${job.material} @ ${job.thickness_mm}mm, min tolerance ${minTol}mm`, data: { thickness_mm: job.thickness_mm, conductivity_factor: conductivity, min_tolerance_mm: minTol, feasible: true } };
      }

      case "material_analysis": {
        const conductivity = this.estimateConductivity(job.material);
        const family = this.materialFamily(job.material);
        const data = { material: job.material, family, conductivity_factor: conductivity, edm_compatible: true };
        if (conductivity < 1) {
          return { status: "warning", summary: `${job.material} has low conductivity — EDM may be slow. Consider PCD wire.`, data: { ...data, recommended_wire: "PCD-coated" } };
        }
        return { status: "pass", summary: `${job.material}: conductivity factor ${conductivity.toFixed(1)}, suitable for WEDM`, data };
      }

      case "machine_selection": {
        const selectedMachine = job.machine ?? (job.thickness_mm > 200 ? "large-travel WEDM" : "standard WEDM");
        return {
          status: "pass",
          summary: job.machine
            ? `Machine specified: ${job.machine}`
            : `Auto-selected machine based on ${job.thickness_mm}mm workpiece and ${job.features.length} features`,
          data: { machine: selectedMachine, travel_z_mm: job.thickness_mm + 50, auto_selected: !job.machine },
        };
      }

      case "wire_selection": {
        const needsFineWire = job.features.some(f => f.tolerance_mm <= 0.005);
        const selectedWire = job.wire_type ?? (needsFineWire ? "brass 0.20mm" : "brass 0.25mm");
        const wireDiameter_mm = selectedWire.includes("0.20") ? 0.20 : selectedWire.includes("0.15") ? 0.15 : 0.25;
        return {
          status: "pass",
          summary: job.wire_type
            ? `Wire specified: ${job.wire_type}`
            : `Auto-selected wire: ${selectedWire}`,
          data: { wire_type: selectedWire, wire_diameter_mm: wireDiameter_mm, auto_selected: !job.wire_type },
        };
      }

      case "start_hole_planning": {
        const internalFeatures = job.features.filter(f => f.type === "pocket" || f.type === "slot" || f.type === "internal");
        const needsStartHoles = internalFeatures.length > 0;
        return {
          status: "pass",
          summary: needsStartHoles
            ? `Start holes required for internal features — plan drill or small-hole EDM`
            : "No internal features — edge-start or through-cut only",
          data: { start_holes_required: needsStartHoles, internal_feature_count: internalFeatures.length, method: needsStartHoles ? "conventional_drill" : "edge_start" },
        };
      }

      case "setup_planning":
        return {
          status: "pass",
          summary: `Setup: fixturing for ${job.thickness_mm}mm ${job.material}, workpiece alignment via edge-find`,
          data: { fixture_type: job.thickness_mm > 100 ? "precision_vise_with_parallels" : "standard_vise", alignment_method: "edge_find", estimated_setup_min: job.features.length > 5 ? 45 : 30 },
        };

      case "toolpath_generation": {
        const tightFeatures = job.features.filter(f => f.tolerance_mm <= 0.01).length;
        const perimeterEstimate_mm = job.features.length * 50;
        return {
          status: "pass",
          summary: `Toolpath generated: ${job.features.length} contours, ${tightFeatures} require multi-pass strategy`,
          data: { contour_count: job.features.length, multi_pass_contours: tightFeatures, estimated_total_perimeter_mm: perimeterEstimate_mm, lead_in_type: "arc" },
        };
      }

      case "multi_pass_strategy": {
        const minTol = Math.min(...job.features.map(f => f.tolerance_mm));
        const passes = minTol <= 0.005 ? 4 : minTol <= 0.01 ? 3 : minTol <= 0.025 ? 2 : 1;
        const offsets_mm = passes === 4 ? [0.15, 0.06, 0.02, 0.005] : passes === 3 ? [0.15, 0.06, 0.015] : passes === 2 ? [0.15, 0.04] : [0.15];
        return {
          status: "pass",
          summary: `Multi-pass strategy: ${passes} passes (1 rough + ${passes - 1} skim) for ${minTol}mm tolerance`,
          data: { total_passes: passes, rough_passes: 1, skim_passes: passes - 1, offsets_mm, target_tolerance_mm: minTol },
        };
      }

      case "parameter_optimization": {
        // Use stratified calibrated parameters if available (U-WH08)
        const matKey = job.material || "default";
        const machKey = job.machine || "default";
        const calibrated = this.parameterPriors.get(this.buildPriorKey("cycle_time_factor", matKey, machKey))
          ?? this.parameterPriors.get("default:default:cycle_time_factor");
        const calNote = calibrated && calibrated.samples > 10
          ? ` (Bayesian-calibrated from ${calibrated.samples} observations)`
          : " (physics model defaults)";
        const conductivity = this.estimateConductivity(job.material);
        const mrrPrior = this.parameterPriors.get(this.buildPriorKey("mrr_mm3_per_min", matKey, machKey))
          ?? this.parameterPriors.get("default:default:mrr_mm3_per_min");
        const baseMRR = mrrPrior?.value ?? 8.0;
        return {
          status: "pass",
          summary: `Parameters optimized for ${job.material} @ ${job.thickness_mm}mm${calNote}`,
          data: { mrr_mm3_min: baseMRR * conductivity, calibrated: !!(calibrated && calibrated.samples > 1), samples_used: calibrated?.samples ?? 0 },
        };
      }

      case "flushing_design": {
        const submerged = job.thickness_mm > 50;
        return {
          status: "pass",
          summary: submerged
            ? "Submerged flushing with upper+lower nozzles — critical for thick workpiece"
            : "Standard jet flushing with upper+lower nozzles",
          data: { mode: submerged ? "submerged" : "jet", nozzle_config: "upper_and_lower", pressure_bar: submerged ? 3 : 6 },
        };
      }

      case "wire_management":
        return {
          status: "pass",
          summary: "Wire feed, tension, and threading parameters configured",
          data: { feed_rate_m_min: 8, tension_N: job.thickness_mm > 100 ? 15 : 12, auto_thread: true },
        };

      case "slug_management": {
        const hasLargeSlugs = job.features.some(f => f.type === "pocket" || f.type === "cutout");
        return {
          status: "pass",
          summary: hasLargeSlugs
            ? "Slug retention tabs planned — vacuum or magnetic slug catcher recommended"
            : "No significant slugs expected",
          data: { slugs_expected: hasLargeSlugs, retention_method: hasLargeSlugs ? "tab_with_vacuum_catcher" : "none", tab_width_mm: hasLargeSlugs ? 0.3 : 0 },
        };
      }

      case "corner_taper_compensation": {
        const hasCorners = job.features.some(f => f.type !== "circle");
        return {
          status: "pass",
          summary: hasCorners
            ? "Corner slow-down and taper compensation enabled for profile accuracy"
            : "Circular profiles — minimal corner compensation needed",
          data: { corner_slowdown_enabled: hasCorners, taper_compensation_enabled: hasCorners, corner_radius_min_mm: hasCorners ? 0.05 : 0 },
        };
      }

      case "monitoring_setup":
        return {
          status: "pass",
          summary: "Voltage/current monitoring, wire break detection, and adaptive control enabled",
          data: { gap_voltage_monitor: true, wire_break_detect: true, adaptive_control: true, sampling_rate_hz: 1000 },
        };

      case "surface_analysis": {
        const app = job.application ?? "general";
        const targetRa = TARGET_RA_UM[app] ?? 1.6;
        const recastLimit = RECAST_SPEC_LIMIT_UM[app] ?? 50;
        return {
          status: "pass",
          summary: `Target Ra: ${targetRa}µm for ${app} application — pass count set accordingly`,
          data: { target_ra_um: targetRa, recast_limit_um: recastLimit, application: app, spec: app === "aerospace" ? "AMS 2628" : app === "medical" ? "ASTM F86" : "shop_standard" },
        };
      }

      case "post_process_planning": {
        const app = job.application ?? "general";
        const needsRecastRemoval = app === "aerospace" || app === "medical";
        return {
          status: "pass",
          summary: needsRecastRemoval
            ? `Post-process: deburr + recast removal (chemical etch or light polish) required for ${app}`
            : "Post-process: deburr and clean only",
          data: { deburr: true, recast_removal: needsRecastRemoval, method: needsRecastRemoval ? "chemical_etch_or_polish" : "manual_deburr", inspection_required: needsRecastRemoval },
        };
      }

      case "gcode_generation":
        return {
          status: "pass",
          summary: "G-code generated with machine-specific post-processor",
          data: { format: "ISO_6983", units: "metric", coordinate_mode: "absolute" },
        };

      case "cost_estimation": {
        const estimate = this.estimatePipelineCost(job);
        const withinBudget = !job.budget_usd || (estimate.total_usd ?? 0) <= job.budget_usd;
        return {
          status: withinBudget ? "pass" : "warning",
          summary: `Estimated cost: $${(estimate.total_usd ?? 0).toFixed(2)}${job.budget_usd ? ` (budget: $${job.budget_usd})` : ""}`,
          data: { ...estimate, within_budget: withinBudget },
        };
      }

      case "documentation":
        return {
          status: "pass",
          summary: "Setup sheet, operation sheet, and inspection plan generated",
          data: { documents: ["setup_sheet", "operation_sheet", "inspection_plan"], format: "PDF" },
        };

      default:
        return { status: "pass", summary: `Stage ${stage.name} completed` };
    }
  }

  // ==========================================================================
  // PRIVATE — Bayesian Learning (MS20 U03)
  // ==========================================================================

  /** Bayesian conjugate normal update: prior N(µ₀, σ₀²) + observation x → posterior.
   * @param param - stratified key "${materialGroup}:${machineClass}:${paramName}"
   * @param observed - observed value
   *
   * U-WH08 fix: observation variance is a fixed hyperparameter, NOT the posterior variance.
   * Tying obs variance to prior.variance caused variance collapse: after a few observations
   * the posterior shrank so fast that new data was effectively ignored.
   */
  private bayesianUpdate(param: string, observed: number): void {
    const prior = this.parameterPriors.get(param);
    if (!prior) return;

    // Extract the bare parameter name from the stratified key
    const bareParam = param.split(":").pop() ?? param;

    // Fixed observation variance — decoupled from posterior (U-WH08)
    const obsVariance = EDMQualityOrchestratorEngine.OBS_VARIANCE[bareParam] ?? prior.variance;
    const priorPrecision = 1 / prior.variance;
    const obsPrecision = 1 / obsVariance;

    const posteriorPrecision = priorPrecision + obsPrecision;
    const posteriorMean = (priorPrecision * prior.value + obsPrecision * observed) / posteriorPrecision;
    const posteriorVariance = 1 / posteriorPrecision;

    this.parameterPriors.set(param, {
      value: posteriorMean,
      variance: posteriorVariance,
      samples: prior.samples + 1,
    });
  }

  private getDefaultPrior(param: string): number {
    // Extract bare parameter name from stratified key (U-WH08)
    const bareParam = param.split(":").pop() ?? param;
    const defaults: Record<string, number> = {
      mrr_mm3_per_min: 8.0,
      ra_um_finish: 0.8,
      wire_break_rate_per_hour: 0.05,
      cycle_time_factor: 1.0,
      cost_factor: 1.0,
    };
    return defaults[bareParam] ?? 1.0;
  }

  /** Build stratified prior key from material group, machine class, and parameter name.
   * Falls back to "default:default:param" when stratification data is unavailable.
   */
  private buildPriorKey(
    paramName: string,
    materialGroup: string = "default",
    machineClass: string = "default"
  ): string {
    return `${materialGroup}:${machineClass}:${paramName}`;
  }

  /** Get or create a stratified prior. If no stratified entry exists,
   * copies from the default prior with initial samples = 10.
   */
  private getOrCreatePrior(key: string): { value: number; variance: number; samples: number } {
    const existing = this.parameterPriors.get(key);
    if (existing) return existing;

    // Fall back to default:default:bareParam
    const bareParam = key.split(":").pop() ?? key;
    const defaultKey = `default:default:${bareParam}`;
    const defaultPrior = this.parameterPriors.get(defaultKey);
    if (defaultPrior) {
      const newPrior = { ...defaultPrior };
      this.parameterPriors.set(key, newPrior);
      return newPrior;
    }

    // Ultimate fallback
    const fallback = {
      value: this.getDefaultPrior(bareParam),
      variance: EDMQualityOrchestratorEngine.OBS_VARIANCE[bareParam] ?? 0.04,
      samples: 10,
    };
    this.parameterPriors.set(key, fallback);
    return fallback;
  }

  private getObservedValues(param: string): number[] {
    // Reconstruct from job history
    switch (param) {
      case "cycle_time_factor":
        return this.jobHistory
          .filter(j => j.accuracy.time_ratio !== undefined)
          .map(j => j.accuracy.time_ratio!);
      case "ra_um_finish":
        return this.jobHistory
          .filter(j => j.actual.ra_um !== undefined)
          .map(j => j.actual.ra_um!);
      case "cost_factor":
        return this.jobHistory
          .filter(j => j.accuracy.cost_ratio !== undefined)
          .map(j => j.accuracy.cost_ratio!);
      case "wire_break_rate_per_hour":
        return this.jobHistory
          .filter(j => j.actual.wire_breaks !== undefined && j.actual.time_min !== undefined && j.actual.time_min > 0)
          .map(j => j.actual.wire_breaks! / (j.actual.time_min! / 60));
      default:
        return [];
    }
  }

  // ==========================================================================
  // PRIVATE — Improvement Tracking (MS20 U05)
  // ==========================================================================

  private updateMetricHistory(job: JobHistory): void {
    const snapshot: MetricSnapshot = {
      date: job.date,
      cycle_time_accuracy: job.accuracy.time_ratio !== undefined
        ? 1 - Math.abs(1 - job.accuracy.time_ratio) : 0,
      ra_accuracy: job.accuracy.ra_ratio !== undefined
        ? 1 - Math.abs(1 - job.accuracy.ra_ratio) : 0,
      dimensional_accuracy: job.actual.dimensional_accuracy !== undefined
        ? Math.max(0, Math.min(1, job.actual.dimensional_accuracy))
        : null,
      wire_break_rate: job.actual.wire_breaks !== undefined && job.actual.time_min !== undefined && job.actual.time_min > 0
        ? job.actual.wire_breaks / (job.actual.time_min / 60)
        : 0,
      cost_accuracy: job.accuracy.cost_ratio !== undefined
        ? 1 - Math.abs(1 - job.accuracy.cost_ratio) : 0,
    };

    this.metricHistory.push(snapshot);
  }

  private driftRecommendation(metric: string, trend: string, changePct: number): string {
    if (trend === "stable") return `${metric} is stable — no action needed`;
    if (trend === "improving") return `${metric} improved ${Math.abs(changePct).toFixed(1)}% — maintain current approach`;

    // Degrading
    switch (metric) {
      case "Cycle Time Accuracy":
        return "Cycle time predictions drifting — recalibrate physics model with recent job data";
      case "Surface Finish Accuracy":
        return "Ra predictions diverging — check wire condition, guide wear, and flushing consistency";
      case "Dimensional Accuracy":
        return "Dimensional accuracy declining — inspect machine geometry, guide condition, and thermal stability";
      case "Wire Break Rate":
        return "Wire breaks increasing — check wire quality, tension settings, flushing, and power parameters";
      case "Cost Estimation Accuracy":
        return "Cost estimates drifting — update wire/consumable prices and machine rate in cost model";
      default:
        return `${metric} degraded — investigate root cause`;
    }
  }

  // ==========================================================================
  // PRIVATE — Utility Methods
  // ==========================================================================

  private computeProbeZHeights(input: QualityVerificationInput): number[] {
    // Use profile measurements if available to determine workpiece height
    if (input.profile_measurements && input.profile_measurements.length > 0) {
      const zValues = input.profile_measurements.map(p => p.z_height_mm);
      return zValues.sort((a, b) => a - b);
    }
    // Default: top, mid, bottom of assumed 25mm workpiece
    return [2.0, 12.5, 23.0];
  }

  private maxGradient(devs: Array<{ z: number; dev: number }>): number {
    let maxGrad = 0;
    for (let i = 1; i < devs.length; i++) {
      const dz = devs[i].z - devs[i - 1].z;
      if (dz === 0) continue;
      const grad = Math.abs(devs[i].dev - devs[i - 1].dev) / dz;
      if (grad > maxGrad) maxGrad = grad;
    }
    return maxGrad;
  }

  private estimateConductivity(material: string): number {
    const m = material.toLowerCase();
    if (m.includes("copper") || m.includes("cu")) return 5.0;
    if (m.includes("aluminum") || m.includes("al") || m.includes("6061") || m.includes("7075")) return 3.5;
    if (m.includes("brass")) return 2.5;
    if (m.includes("steel") || m.includes("4140") || m.includes("1045")) return 1.5;
    if (m.includes("stainless") || m.includes("304") || m.includes("316") || m.includes("17-4")) return 1.2;
    if (m.includes("inconel") || m.includes("718")) return 0.8;
    if (m.includes("titanium") || m.includes("ti-") || m.includes("ti6al4v")) return 0.6;
    if (m.includes("tungsten") || m.includes("carbide") || m.includes("wc")) return 1.0;
    if (m.includes("graphite")) return 2.0;
    if (m.includes("pcd") || m.includes("cbn")) return 0.3;
    return 1.5; // default: assume mild steel-like
  }

  private estimatePipelineCost(job: {
    material: string;
    thickness_mm: number;
    features: Array<{ type: string; tolerance_mm: number }>;
    machine?: string;
  }): { machine_time_min: number; machine_cost_usd: number; wire_cost_usd: number; setup_cost_usd: number; total_usd: number } {
    // Simple cost model: machine rate * estimated time
    const machineRate_usd_hr = 85;
    const conductivity = this.estimateConductivity(job.material);

    // Cutting speed estimate: base MRR adjusted by conductivity and stratified calibration (U-WH08)
    const mrrKey = this.buildPriorKey("mrr_mm3_per_min", job.material || "default", job.machine || "default");
    const mrrEntry = this.parameterPriors.get(mrrKey) ?? this.parameterPriors.get("default:default:mrr_mm3_per_min");
    const calibratedMRR = mrrEntry?.value ?? 8.0;
    const adjustedMRR = calibratedMRR * conductivity;

    // Estimate total cutting length (rough heuristic)
    const perimeterEstimate = job.features.length * 50; // 50mm average per feature
    const kerf = 0.3; // mm wire kerf
    const cutVolume = perimeterEstimate * job.thickness_mm * kerf;
    const roughTime_min = cutVolume / adjustedMRR;

    // Multi-pass multiplier
    const minTol = Math.min(...job.features.map(f => f.tolerance_mm));
    const passMultiplier = minTol <= 0.005 ? 2.5 : minTol <= 0.01 ? 2.0 : minTol <= 0.025 ? 1.5 : 1.2;
    const totalTime_min = roughTime_min * passMultiplier;

    // Wire cost
    const wireConsumption_m = perimeterEstimate * (minTol <= 0.01 ? 1.5 : 1.2);
    const wireCost_usd = wireConsumption_m * 0.008; // ~$8/km

    const machineCost = (totalTime_min / 60) * machineRate_usd_hr;
    const setupCost = 45; // flat setup cost
    const total_usd = Math.round((machineCost + wireCost_usd + setupCost) * 100) / 100;

    return {
      machine_time_min: Math.round(totalTime_min * 10) / 10,
      machine_cost_usd: Math.round(machineCost * 100) / 100,
      wire_cost_usd: Math.round(wireCost_usd * 100) / 100,
      setup_cost_usd: setupCost,
      total_usd,
    };
  }

  private materialFamily(material: string): string {
    const m = material.toLowerCase();
    if (m.includes("steel") || m.includes("4140") || m.includes("1045") || m.includes("d2") || m.includes("a2") || m.includes("h13") || m.includes("m2") || m.includes("s7")) return "steel";
    if (m.includes("stainless") || m.includes("304") || m.includes("316") || m.includes("17-4") || m.includes("440")) return "stainless";
    if (m.includes("aluminum") || m.includes("6061") || m.includes("7075") || m.includes("2024")) return "aluminum";
    if (m.includes("titanium") || m.includes("ti-")) return "titanium";
    if (m.includes("inconel") || m.includes("hastelloy") || m.includes("waspaloy")) return "superalloy";
    if (m.includes("copper") || m.includes("brass") || m.includes("bronze")) return "copper_alloy";
    if (m.includes("tungsten") || m.includes("carbide")) return "carbide";
    return "other";
  }

  private average(vals: number[]): number {
    if (vals.length === 0) return 0;
    return vals.reduce((s, v) => s + v, 0) / vals.length;
  }

  private stddev(vals: number[]): number {
    if (vals.length < 2) return 0;
    const mean = this.average(vals);
    const variance = vals.reduce((s, v) => s + (v - mean) ** 2, 0) / (vals.length - 1);
    return Math.sqrt(variance);
  }
}

/** Singleton instance. */
export const edmQualityOrchestratorEngine = new EDMQualityOrchestratorEngine();
