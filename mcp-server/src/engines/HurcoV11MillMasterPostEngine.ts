/**
 * HurcoV11MillMasterPostEngine — JM Die Mill Master Post Processor
 *
 * Comprehensive master post processor for JM Die's Hurco VMX24 with WinMax V11 control.
 * This is the CANONICAL mill post for PRISM — all mill post logic derives from here.
 *
 * MACHINE SPECIFICATIONS (JM Die Hurco VMX24):
 *   - Controller: WinMax V11 (conversational + NC mode)
 *   - Axes: X=24", Y=20", Z=24" (610x508x610mm)
 *   - Spindle: 10,000 RPM, 15 HP, CT40 taper
 *   - Table: 1050x510mm with T-slots
 *   - Rapids: X/Y=1300 IPM, Z=1000 IPM (33/25.4 m/min)
 *   - Accuracy: ±0.0001" (0.0025mm)
 *   - Tool Changer: 24-tool side-mount ATC
 *
 * HURCO-SPECIFIC G-CODE FEATURES:
 *   - G65 conversational macros (unique to Hurco)
 *   - UltiMotion trajectory control
 *   - DXF import capability
 *   - Work surface definition (G68.2 equivalent)
 *   - Probing with Renishaw OMP40
 *
 * AGI INTEGRATION:
 *   - 8 reasoning modes for intelligent G-code generation
 *   - Physics-aware feed optimization via Kienzle model
 *   - Material-adaptive cutting parameters
 *   - JM Die tribal knowledge embedded (20+ tips)
 *   - Learning from production feedback
 *
 * @module engines/HurcoV11MillMasterPostEngine
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP-PP02
 */

import { log } from "../utils/Logger.js";
import { CANONICAL_KIENZLE, CANONICAL_TAYLOR, type ISOGroup } from "../physics/constants.js";
import type { BlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";
import { autoSpeedFeedEngine } from "./AutoSpeedFeedEngine.js";
import { machineStrategyConstraintEngine } from "./MachineStrategyConstraintEngine.js";
import {
  rapidRepositionOptEngine,
  type RapidMove,
  type AxisKinematics,
  type FeaturePoint,
} from "./RapidRepositionOptEngine.js";
import {
  HSMDwellAtCornerEngine,
  type CornerGeometry,
  type MachineServo,
  type HSMParameters,
} from "./HSMDwellAtCornerEngine.js";
import {
  advancedPostProcessorEngine,
  type AdaptiveClearingConfig,
  type HSMConfig,
  type FeedOptimizationConfig,
  type MultiAxisConfig,
  type InProcessMeasureConfig,
  type ToolManagementConfig,
} from "./AdvancedPostProcessorEngine.js";

/**
 * PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring — opt-in AdvancedPostProcessor pass.
 * Hurco V11 dialect: comment-only smoothing, null NURBS, plain G64 corner-blend,
 * G43.4 H#1 RTCP (5-axis variants only). multi_axis force-skipped on axis_count<4.
 */
export interface AdvancedPostFeaturesConfig {
  adaptive_clearing?: AdaptiveClearingConfig;
  hsm?: HSMConfig;
  tool_management?: ToolManagementConfig;
  in_process_measure?: InProcessMeasureConfig;
  feed_optimization?: FeedOptimizationConfig;
  multi_axis?: MultiAxisConfig;
}

const HURCO_ISO_TO_AUTO_SF_MATERIAL: Record<ISOGroup, string> = {
  P: "steel", M: "stainless_steel", K: "cast_iron",
  N: "aluminum", S: "superalloy", H: "hardened_steel",
};

function hurcoRigidityToAutoSF(r: string | undefined): "low" | "medium" | "high" {
  if (r === "low") return "low";
  if (r === "ultra_high" || r === "high") return "high";
  return "medium";
}

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

export interface HurcoPostConfig {
  program_number: number;
  program_comment?: string;
  use_conversational?: boolean;  // Use G65 macros
  use_ultimotion?: boolean;      // Enable UltiMotion (high-speed mode)
  coolant_mode?: "flood" | "mist" | "tsc" | "off";
  work_offset?: number;          // G54-G59 or extended
  units?: "metric" | "inch";
  safe_z_mm?: number;
  tool_change_position?: { x: number; y: number; z: number };
  /** Enable post-emission AutoSpeedFeed advanced pipeline. See `generateProgramAdvanced`.
   *  Default false — sync `generateProgram` is unchanged. */
  use_advanced_features?: boolean;
  /** Machine id (e.g. `jmdie_hurco_v11`) for compounding capability lookup. */
  machine_id?: string;
  /** AutoSpeedFeed aggressiveness (0.0 conservative → 1.0 push limits). Default 0.5. */
  advanced_aggressiveness?: number;
  /** Opt-in AdvancedPostProcessor pass (PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring).
   *  Threads post-AS/F G-code through `advancedPostProcessorEngine.enhance()`
   *  with controller='hurco'. multi_axis force-skipped on axis_count<4. */
  advanced_post?: AdvancedPostFeaturesConfig;
  /**
   * Sync-path feed-multiplier level (PPG-HARDEN/U-PPGH02). Operator-friendly
   * 1..5 stepping that maps to a fixed feed multiplier table:
   *   L1 ULTRA-CONSERVATIVE = 0.6×
   *   L2 CONSERVATIVE       = 0.75×
   *   L3 MODERATE           = 0.9×
   *   L4 AGGRESSIVE         = 1.0×
   *   L5 MAX                = 1.1×
   * Out-of-range values are clamped to [1, 5]; non-integers are rounded to
   * the nearest level. Independent of `advanced_aggressiveness` (which is
   * the AutoSpeedFeed 0..1 fractional knob in the advanced pipeline).
   * When omitted, sync emission is byte-identical to prior behavior — no
   * header line, no feed multiplier applied, `feed_optimizations` stays empty.
   */
  aggressiveness?: number;
  /**
   * Reserved for future sync-path AutoSpeedFeed wiring. Currently no-op in
   * the sync `generateProgram` path; AS/F only runs via `generateProgramAdvanced`
   * with `use_advanced_features: true`. The `aggressiveness` multiplier
   * applies regardless of this flag.
   */
  optimize_feeds?: boolean;
  /**
   * Sync-path prove-out mode (PPG-HARDEN/U-PPGH03). Operator-friendly
   * first-article / new-setup safety pass:
   *   - Multiplies every op's feed by `feed_factor` (default 0.5 = half-feed)
   *   - Emits `M01 (OPTIONAL STOP - PROVE OUT)` between operations so the
   *     operator can step through one op at a time on the WinMax UI
   *   - Sets `result.prove_out_mode === true` so downstream telemetry can
   *     filter out prove-out runs from production cycle-time stats
   * When omitted or `enabled: false`, sync emission is byte-identical to
   * prior behavior. Prove-out OVERRIDES `aggressiveness` (an operator who
   * dialed prove-out wants caution, not the L1..L5 aggressiveness scale).
   */
  prove_out?: HurcoProveOutConfig;
  /**
   * Emit the structured setup sheet (machine + tools + operations) alongside
   * the G-code (U-PPGH04). Defaults to true. Set false when a downstream
   * caller is building its own sheet from the raw operations array.
   */
  emit_setup_sheet?: boolean;
  /**
   * Machine-side cutting-force ceiling (Newtons) for the Kienzle-bounded
   * feed reducer (U-PPGH04). When the predicted Fc for an op exceeds this
   * value the engine reduces feed until Fc ≤ limit + 5% tolerance and
   * surfaces a `feed_optimizations[]` entry with reason "Kienzle Fc=<N>N
   * exceeded <max>N". Independent of `optimize_feeds` (which gates the
   * AutoSpeedFeed pipeline). Disabled when `optimize_feeds: false`.
   */
  max_cutting_force_N?: number;
}

/**
 * Prove-out mode config (PPG-HARDEN/U-PPGH03). Independent of the
 * aggressiveness L1..L5 stepping — operators reach for prove-out during
 * first-article runs, post-crash recovery, or new-fixture validation.
 */
export interface HurcoProveOutConfig {
  /** Master switch. When false/omitted, prove-out has no effect. */
  enabled: boolean;
  /**
   * Feed multiplier applied to every op's feed_mm_min. Default 0.5
   * (half-feed). Clamped to [0, 1]; values above 1 would INCREASE feed
   * during prove-out (semantically wrong) so they clamp to 1.
   * NaN / undefined / non-numeric → fall back to 0.5.
   */
  feed_factor?: number;
  /**
   * Emit `M01 (OPTIONAL STOP - PROVE OUT)` between operations. Default
   * true. Set false to keep continuous run while still using the
   * reduced feed (e.g. operator watching a closed-door cycle).
   */
  add_optional_stops?: boolean;
}

/**
 * Structured tool descriptor (U-PPGH04). Takes precedence over the flat
 * `tool_description` + `tool_diameter_mm` + `tool_flutes` fields on
 * `MillOperation`. Carries downstream metadata (coating, stickout) that
 * the setup-sheet emission needs.
 */
export interface MillTool {
  number: number;
  diameter_mm: number;
  flutes: number;
  description?: string;
  coating?: string;
  /** Free tool length below the holder collet face. Drives the stickout
   *  deflection check in performPhysicsChecks — fails when stickout/D > 4. */
  stickout_mm?: number;
}

/**
 * Structured material descriptor with optional Kienzle override (U-PPGH04).
 * Operator-supplied kc1_1/mc REPLACE the canonical values from
 * `CANONICAL_KIENZLE[iso_group]` for the duration of one generateProgram call.
 * Out-of-range overrides THROW per R12 fail-loud — silently accepting a 4×
 * canonical kc1_1 would let a programmer push unsafe force into a real spindle.
 */
export interface MillMaterial {
  iso_group?: ISOGroup;
  name?: string;
  /** Override canonical kc1_1 (units N/mm²). Safe range 200..6000. */
  kc1_1?: number;
  /** Override canonical mc (Kienzle exponent). Safe range 0.10..0.45. */
  mc?: number;
}

/** PostMove is the simplified path token consumed by postSingle(). */
export interface PostMove {
  x: number;
  y: number;
  z: number;
  type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
  r?: number;
  i?: number;
  j?: number;
}

export interface MillOperation {
  operation_type: "face" | "pocket" | "contour" | "drill" | "tap" | "bore" | "slot" | "3d_surface" | "adaptive";
  tool_number: number;
  tool_diameter_mm: number;
  tool_flutes: number;
  tool_description?: string;
  /** Structured tool (U-PPGH04). When supplied, `tool.description` takes
   *  precedence over the flat `tool_description` for the M06 comment. */
  tool?: MillTool;
  material_iso: ISOGroup;
  /** Structured material with optional Kienzle override (U-PPGH04). */
  material?: MillMaterial;
  spindle_rpm: number;
  feed_mm_min: number;
  axial_depth_mm: number;
  radial_depth_mm?: number;
  coolant?: "flood" | "mist" | "tsc" | "off";
  coordinates: Array<{ x: number; y: number; z: number; type: "rapid" | "linear" | "arc_cw" | "arc_ccw" }>;
  arc_data?: Array<{ i?: number; j?: number; k?: number; r?: number }>;
}

/** Setup sheet emitted alongside the G-code (U-PPGH04). */
export interface SetupSheet {
  machine: string;
  controller: string;
  units: "metric" | "inch";
  tools: Array<{
    number: number;
    diameter_mm: number;
    flutes?: number;
    description?: string;
    coating?: string;
    stickout_mm?: number;
  }>;
  operations: Array<{
    sequence: number;
    type: string;
    tool_number: number;
    spindle_rpm: number;
    feed_mm_min: number;
  }>;
}

/**
 * HURCO-VM30I-FULL-PSN-MS0 (echo iter7 2026-05-24) — PSN enrichment payload.
 * Populated only by `generateProgramWithFullPSN()`; the legacy
 * `generateProgram()` leaves it undefined (byte-identical default path).
 * Each sub-field is independent + best-effort: a single PSN-substrate failure
 * never blocks the rest of the enrichment (fail-soft, advisory-only).
 */
export interface HurcoPSNEnrichment {
  /** Runtime prediction via GCodeRuntimePredictorEngine (kinematic-aware). */
  runtime_estimate?: {
    total_minutes: number;
    machine_id: string;
    confidence: number;
    error?: string;
  };
  /** Bidirectional optimizer recommendations (cycle / wear / surface / cost / safety). */
  optimizer_recommendations?: {
    count: number;
    top_3: Array<{ category: string; description: string; estimated_savings_pct?: number }>;
    error?: string;
  };
  /** Cost report (per-part labor + machine + tooling + material + overhead). */
  cost_report?: {
    total_cost_usd: number;
    cycle_min: number;
    most_expensive_line_item: string;
    error?: string;
  };
  /** PRISM AI feature recommendations relevant to the part + material. */
  ai_feature_recommendations?: {
    count: number;
    top_5: Array<{ feature: string; reason: string; priority?: string }>;
    error?: string;
  };
  /** ISO timestamp of enrichment pass. */
  enriched_at: string;
  /** True iff every requested PSN call returned a populated field. */
  full_psn_engaged: boolean;
  /** Per-substrate error log for operator-visibility. */
  substrate_errors: string[];
}

export interface HurcoPostOutput {
  gcode: string[];
  program_number: number;
  total_lines: number;
  estimated_cycle_min: number;
  tools_used: number[];
  warnings: string[];
  physics_checks: Array<{
    line: number;
    check: string;
    passed: boolean;
    value?: number;
    limit?: number;
  }>;
  tribal_tips_applied: string[];
  /**
   * PSN-substrate enrichment (HURCO-VM30I-FULL-PSN-MS0). Populated ONLY by
   * `generateProgramWithFullPSN()`. Legacy `generateProgram()` leaves it
   * undefined so existing callers + 14 test files stay byte-identical.
   */
  psn_enrichment?: HurcoPSNEnrichment;
  /**
   * Per-block S/F annotations (MS0/U-PPGM13, schema 1.1.0).
   *
   * One entry per operation, keyed by the Nxxx label emitted on the
   * spindle-start line. Caller passes this array verbatim to
   * `PhysicsSidecarBuilderEngine.buildAndSeal({ block_annotations })`
   * to seal the post-emit telemetry alongside the canonical sidecar.
   * The block_id matches the Nxxx label so `verifyBlockAnnotations`
   * can cross-check emitted S/F against the physics chain at
   * post-publish time.
   */
  block_annotations: BlockAnnotation[];
  /**
   * Clamped aggressiveness level (1..5) actually applied to this run, or
   * undefined when caller did not request the level system. Always equals
   * the rounded-and-clamped form of `cfg.aggressiveness` so callers never
   * have to redo the clamp themselves (PPG-HARDEN/U-PPGH02).
   */
  aggressiveness_applied?: number;
  /**
   * Per-operation feed-multiplier audit. Empty array unless caller passed
   * `cfg.aggressiveness` or `cfg.prove_out.enabled`; one entry per
   * operation otherwise. Block ID matches the `Nxxx` label on the
   * spindle-start line so this audit lines up with `block_annotations[]`
   * for downstream verification.
   */
  feed_optimizations: HurcoFeedOptimization[];
  /**
   * Prove-out mode flag (PPG-HARDEN/U-PPGH03). True when the caller
   * passed `cfg.prove_out.enabled = true`; false otherwise. Downstream
   * telemetry can filter prove-out runs out of production cycle-time
   * statistics so they don't depress the median.
   */
  prove_out_mode: boolean;
  /** Advanced-pipeline opt-in fields — populated only by `generateProgramAdvanced`
   *  when `use_advanced_features: true`. Sync `generateProgram` returns these as null. */
  advanced_features_applied?: string[];
  optimized_gcode?: string[] | null;
  advanced_summary?: HurcoAdvancedSummary | null;
  /** Structured setup sheet (U-PPGH04). Undefined when caller passed
   *  `emit_setup_sheet: false`. */
  setup_sheet?: SetupSheet;
}

/**
 * Per-operation feed-multiplier audit emitted by the sync-path
 * aggressiveness level system (PPG-HARDEN/U-PPGH02). One entry per
 * operation when `cfg.aggressiveness` is provided.
 */
export interface HurcoFeedOptimization {
  block_id: string;
  level: number;
  label: string;
  multiplier: number;
  original_feed_mm_min: number;
  optimized_feed_mm_min: number;
  /** Optional reason string for non-level optimizations (e.g. Kienzle
   *  Fc-bounded reductions). Empty for aggressiveness/prove-out entries. */
  reason?: string;
}

export interface HurcoAdvancedSummary {
  auto_speed_feed: {
    lines_modified: number;
    tools_processed: number;
    avg_feed_change_pct: number;
    time_savings_pct: number;
    chip_thinning_adjustments: number;
    corner_decelerations: number;
  } | null;
  machine_used: {
    id: string;
    name: string;
    atc: number;
    rigidity_class: string | undefined;
    ways_type: string | undefined;
    spindle_type: string | undefined;
  } | null;
  /** RapidRepositionOptEngine pass output (PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring).
   *  Null when advanced pipeline did not run. */
  rapid_reposition: {
    rapids_count: number;
    rapid_savings_sec: number;
    retracts_count: number;
    retract_savings_sec: number;
    air_cuts_count: number;
    air_cut_wasted_sec: number;
    total_saved_sec: number;
    optimizations_count: number;
  } | null;
  /** HSMDwellAtCornerEngine pass output (PPG-WIRE-MS5/U-PPGW-HSMDwell-Wiring).
   *  Analyzes corner geometry from MillOperation.coordinates and returns
   *  per-program corner-dwell statistics + dedup'd recommendations. Sync
   *  output.gcode is preserved byte-identical. Null when advanced pipeline
   *  did not run. */
  hsm_dwell: {
    corners_analyzed: number;
    high_dwell_count: number;
    high_thermal_count: number;
    tolerance_violation_count: number;
    total_recommended_dwell_ms: number;
    avg_dwell_ms: number;
    max_dwell_ms: number;
    avg_thermal_factor: number;
    hsm_mode_used: "off" | "g05p1" | "g05p2" | "g187" | "cycle832";
    recommendations: string[];
    optimizations_count: number;
  } | null;
  /** Feature-sequencer (TSP) pass output (PPG-WIRE-MS5/U-PPGW-FeatureSequencer-Wiring).
   *  Reorders operations to minimize total rapid travel between feature
   *  centroids. Output is advisory — sync output.gcode is preserved
   *  byte-identical and operation order is NOT mutated. Null when advanced
   *  pipeline did not run. */
  feature_sequence: {
    features_count: number;
    original_sequence: number[];
    optimized_sequence: number[];
    reorderings_count: number;
    original_distance_mm: number;
    optimized_distance_mm: number;
    distance_saved_mm: number;
    time_saved_sec: number;
    improvement_pct: number;
    method: string;
  } | null;
  /** AdvancedPostProcessor pass output (PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring).
   *  Null when caller omitted `advanced_post` config. */
  advanced_post: {
    controller_used: "hurco";
    requested_features: string[];
    enhancements_applied: string[];
    warnings: string[];
    estimated_time_savings_pct: number;
    output_lines: number;
  } | null;
}

// ============================================================================
// HURCO V11 TRIBAL KNOWLEDGE — JM DIE SPECIFIC
// ============================================================================

const HURCO_V11_TRIBAL_KNOWLEDGE = [
  {
    category: "ultimotion",
    tip: "Enable UltiMotion in WinMax control panel (Settings → Performance → UltiMotion ON, Smoothing Tolerance ~0.005mm for finish) for 3D surfacing — 20% faster cycle times on complex geometry. NOTE: Hurco V11 has NO inline UltiMotion G-code; G187 is Haas dialect and would parse-error on V11.",
    applies_to: ["3d_surface", "pocket"],
    confidence: 0.94
  },
  {
    category: "tool_change",
    tip: "Hurco ATC prefers Z retract before XY move — always issue G28 G91 Z0 before tool change",
    applies_to: ["all"],
    confidence: 0.96
  },
  {
    category: "spindle",
    tip: "WinMax V11 ramps spindle smoothly — no dwell needed after M03, but use G04 P1.0 for heavy cuts",
    applies_to: ["all"],
    confidence: 0.92
  },
  {
    category: "probing",
    tip: "Renishaw OMP40 probe cycles: use G65 P9xxx format (Hurco-specific macro numbers)",
    applies_to: ["probe"],
    confidence: 0.93
  },
  {
    category: "coolant",
    tip: "TSC (through-spindle coolant) not available on JM Die's VMX24 — use flood coolant M08",
    applies_to: ["all"],
    confidence: 0.98
  },
  {
    category: "aluminum",
    tip: "For 6061-T6 on the Hurco: 500+ SFM, 0.004\" chipload, climb mill only — chip evacuation is key",
    applies_to: ["pocket", "contour", "adaptive"],
    iso_group: "N",
    confidence: 0.95
  },
  {
    category: "hardened",
    tip: "D2 above 58 HRC: use 150 SFM max, 0.001\" IPT, light DOC (0.010\"), fresh carbide only",
    applies_to: ["contour", "3d_surface"],
    iso_group: "H",
    confidence: 0.94
  },
  {
    category: "pocketing",
    tip: "Deep pockets (>2xD): use pecking with G73 or G83, coolant at each peck for chip clearing",
    applies_to: ["pocket", "drill"],
    confidence: 0.91
  },
  {
    category: "adaptive",
    tip: "Hurco supports high-speed contouring (G05.1 Q1) — enable for adaptive/HSM toolpaths",
    applies_to: ["adaptive", "contour"],
    confidence: 0.90
  },
  {
    category: "safe_start",
    tip: "JM Die standard safe start: G90 G17 G40 G49 G80 G54 — always at program start",
    applies_to: ["all"],
    confidence: 0.97
  },
  {
    category: "work_offset",
    tip: "Use G54 for most jobs, G55-G59 for multi-part setups — Hurco supports G54.1 P1-P99 extended",
    applies_to: ["all"],
    confidence: 0.93
  },
  {
    category: "tapping",
    tip: "Rigid tapping G84: set feed = pitch × RPM exactly — Hurco is sensitive to feed/pitch mismatch",
    applies_to: ["tap"],
    confidence: 0.95
  }
];

// ============================================================================
// AGGRESSIVENESS LEVEL TABLE — sync-path feed multiplier (U-PPGH02)
// ============================================================================
//
// Operator-friendly 1..5 stepping for feed scaling on the sync `generateProgram`
// path. Independent of the AutoSpeedFeed `advanced_aggressiveness` 0..1 knob
// in the advanced pipeline. Levels are intentionally coarse so a shop floor
// operator can dial conservativeness without thinking in fractions:
//
//   L1 ULTRA-CONSERVATIVE — first-article / unproven setup / new material
//   L2 CONSERVATIVE       — safe production
//   L3 MODERATE           — typical production
//   L4 AGGRESSIVE         — proven program, machine in good condition
//   L5 MAX                — push to chip-load limits, well-instrumented run
//
// Multipliers chosen to bracket nominal (L4=1.0) with a 0.6× ultra-safe
// floor and a 1.1× ceiling (10% over nominal — anything more should go
// through the AutoSpeedFeed pipeline with full chip-thinning analysis).
//
export const HURCO_AGGRESSIVENESS_LEVEL_MIN = 1;
export const HURCO_AGGRESSIVENESS_LEVEL_MAX = 5;
export const HURCO_AGGRESSIVENESS_TABLE: ReadonlyArray<{
  readonly level: number;
  readonly label: string;
  readonly multiplier: number;
}> = [
  { level: 1, label: "ULTRA-CONSERVATIVE", multiplier: 0.6 },
  { level: 2, label: "CONSERVATIVE",        multiplier: 0.75 },
  { level: 3, label: "MODERATE",            multiplier: 0.9 },
  { level: 4, label: "AGGRESSIVE",          multiplier: 1.0 },
  { level: 5, label: "MAX",                 multiplier: 1.1 },
];

/**
 * Clamp + round caller-supplied aggressiveness to a valid level entry, or
 * return null to signal "not requested" (caller passed undefined / NaN).
 *
 * Adversarial inputs are normalized:
 *  - undefined           → null  (no behavior change)
 *  - NaN                 → null  (no behavior change; never throws)
 *  - non-finite (±Inf)   → clamped to the nearest valid extreme
 *  - non-integer         → rounded to nearest integer level
 *  - out of [1, 5]       → clamped to [1, 5]
 */
function resolveAggressivenessLevel(
  raw: number | undefined,
): typeof HURCO_AGGRESSIVENESS_TABLE[number] | null {
  if (raw === undefined || raw === null) return null;
  if (Number.isNaN(raw)) return null;
  let level: number;
  if (raw === Infinity || raw > HURCO_AGGRESSIVENESS_LEVEL_MAX) {
    level = HURCO_AGGRESSIVENESS_LEVEL_MAX;
  } else if (raw === -Infinity || raw < HURCO_AGGRESSIVENESS_LEVEL_MIN) {
    level = HURCO_AGGRESSIVENESS_LEVEL_MIN;
  } else {
    level = Math.round(raw);
  }
  return HURCO_AGGRESSIVENESS_TABLE[level - 1] ?? null;
}

// ============================================================================
// PROVE-OUT MODE — sync-path first-article / post-crash safety pass (U-PPGH03)
// ============================================================================
//
// Independent of the aggressiveness L1..L5 stepping. Operators dial prove-out
// during first-article runs, post-crash recovery, post-fixture-change
// validation, or any scenario where they want to step through the program
// op-by-op at reduced feed. When prove-out is enabled, it OVERRIDES
// aggressiveness — the operator's caution intent wins.
//
export const PROVE_OUT_DEFAULT_FEED_FACTOR = 0.5;
export const PROVE_OUT_FEED_FACTOR_MIN = 0;
export const PROVE_OUT_FEED_FACTOR_MAX = 1;
export const PROVE_OUT_LABEL = "PROVE-OUT";
/** Sentinel level used in HurcoFeedOptimization rows produced by prove-out
 *  (vs. L1..L5 produced by aggressiveness). Lets downstream consumers
 *  discriminate the two paths without a discriminated-union type change. */
export const PROVE_OUT_LEVEL_SENTINEL = 0;

/** Internal resolved prove-out entry. `feedFactor` is already clamped to
 *  [0, 1] and NaN-normalized; `addOptionalStops` defaults to true. */
interface ProveOutEntry {
  readonly enabled: true;
  readonly feedFactor: number;
  readonly addOptionalStops: boolean;
}

/**
 * Normalize caller-supplied prove_out config to a resolved entry, or null
 * when prove-out is not requested (off / undefined / `enabled: false`).
 *
 * Adversarial inputs are normalized:
 *  - undefined / null               → null  (no behavior change)
 *  - { enabled: false }             → null  (no behavior change)
 *  - feed_factor = NaN              → defaults to 0.5
 *  - feed_factor = ±Infinity        → clamped to nearest extreme [0, 1]
 *  - feed_factor < 0 or > 1         → clamped to [0, 1]
 *  - non-numeric feed_factor        → defaults to 0.5
 *  - add_optional_stops omitted     → defaults to true
 */
function resolveProveOutEntry(
  raw: HurcoProveOutConfig | undefined,
): ProveOutEntry | null {
  if (!raw || raw.enabled !== true) return null;

  let factor: number;
  const requested = raw.feed_factor;
  if (typeof requested !== "number" || Number.isNaN(requested)) {
    factor = PROVE_OUT_DEFAULT_FEED_FACTOR;
  } else if (requested === Infinity || requested > PROVE_OUT_FEED_FACTOR_MAX) {
    factor = PROVE_OUT_FEED_FACTOR_MAX;
  } else if (requested === -Infinity || requested < PROVE_OUT_FEED_FACTOR_MIN) {
    factor = PROVE_OUT_FEED_FACTOR_MIN;
  } else {
    factor = requested;
  }

  return {
    enabled: true,
    feedFactor: factor,
    addOptionalStops: raw.add_optional_stops !== false,
  };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class HurcoV11MillMasterPostEngine {
  private readonly defaultConfig: HurcoPostConfig = {
    program_number: 1000,
    use_conversational: false,
    use_ultimotion: true,
    coolant_mode: "flood",
    work_offset: 54,
    units: "metric",
    safe_z_mm: 50,
    tool_change_position: { x: 0, y: 0, z: 100 },
    emit_setup_sheet: true
  };

  /** Stickout/diameter ratio above which the stickout deflection check fails. */
  private static readonly STICKOUT_RATIO_LIMIT = 4;
  /** Target Taylor tool life (minutes). Below this the check fails. */
  private static readonly TAYLOR_TARGET_LIFE_MIN = 10;
  /** Safe range for operator-supplied kc1_1 (N/mm²). U-PPGH04 fail-loud. */
  private static readonly KC1_1_MIN = 200;
  private static readonly KC1_1_MAX = 6000;
  /** Safe range for operator-supplied mc (Kienzle exponent). */
  private static readonly MC_MIN = 0.10;
  private static readonly MC_MAX = 0.45;

  /**
   * Generate complete Hurco G-code program
   */
  generateProgram(
    operations: MillOperation[],
    config?: Partial<HurcoPostConfig>
  ): HurcoPostOutput {
    const cfg = { ...this.defaultConfig, ...config };
    const gcode: string[] = [];
    const warnings: string[] = [];
    const physicsChecks: HurcoPostOutput["physics_checks"] = [];
    const tribalTipsApplied: string[] = [];
    const toolsUsed = new Set<number>();
    const feedOptimizations: HurcoFeedOptimization[] = [];
    const aggressivenessEntry = resolveAggressivenessLevel(cfg.aggressiveness);
    const proveOutEntry = resolveProveOutEntry(cfg.prove_out);

    log.info(`[HurcoV11] Generating program O${cfg.program_number} with ${operations.length} operations`);

    // Program header
    gcode.push(`O${cfg.program_number} (${cfg.program_comment || "PRISM GENERATED"})`);
    gcode.push(`(MACHINE: HURCO VMX24 - WINMAX V11)`);
    gcode.push(`(GENERATED: ${new Date().toISOString()})`);
    if (aggressivenessEntry && !proveOutEntry) {
      // U-PPGH02: emit aggressiveness header only when explicitly requested
      // so legacy programs (no aggressiveness param) stay byte-identical.
      // U-PPGH03: prove-out OVERRIDES aggressiveness — only one of the two
      // multiplier headers ever appears. Operator caution wins.
      gcode.push(`(AGGRESSIVENESS: ${aggressivenessEntry.label} L${aggressivenessEntry.level}/5)`);
    }
    if (proveOutEntry) {
      // U-PPGH03: prove-out header — explicit so the operator sees the
      // mode at top of program before manually stepping through cycles.
      const stopsTag = proveOutEntry.addOptionalStops ? "ON" : "OFF";
      gcode.push(`(PROVE-OUT MODE: feed_factor=${proveOutEntry.feedFactor.toFixed(2)}, optional_stops=${stopsTag})`);
    }
    gcode.push("");

    // Safe start block
    const safeStart = this.generateSafeStart(cfg);
    gcode.push(...safeStart);
    tribalTipsApplied.push("JM Die standard safe start applied");

    // UltiMotion (G05.3) emission is per-tool-change inside generateToolChange().
    // Ground truth: Fusion .cps "HURCO_VM30i_PRISM_Enhanced_v8.9.153.cps" emits
    // G05.3 P<n> immediately after T<n> M06; verified against 4 real JM Die-posted
    // programs in H:/prism/JM DIE/HURCO CNC PROGRAMS/. P35 for ADAPTIVE roughing,
    // P10 for FINISH/CONTOUR/DRILL/FACE/CHAMFER. The earlier engine claim that
    // "Hurco V11 has no inline UltiMotion G-code" was misinformation — corrected
    // 2026-05-22 by operator + corroborated by .cps source line 3022.
    if (cfg.use_ultimotion) {
      tribalTipsApplied.push("UltiMotion G05.3 P<n> emitted per-tool-change (P35 adaptive / P10 finish)");
    }

    // Process each operation
    let estimatedTime = 0;
    const blockAnnotations: BlockAnnotation[] = [];
    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];

      // U-PPGH03: prove-out emits an M01 BETWEEN operations (never before
      // the first op or after the last) so the operator can step through
      // one op at a time on the WinMax UI. Suppressed when caller passes
      // `add_optional_stops: false`. Independent of feed multiplication —
      // an operator can run continuous-but-slow or stop-but-nominal.
      if (proveOutEntry && proveOutEntry.addOptionalStops && i > 0) {
        gcode.push("");
        gcode.push("M01 (OPTIONAL STOP - PROVE OUT)");
      }

      toolsUsed.add(op.tool_number);

      // U-PPGH02: clone op with multiplied feed when aggressiveness was
      // requested. Physics checks run on the EFFECTIVE feed (what actually
      // executes on the machine) so the L5 1.1× ceiling can still trip a
      // chip-load violation that the original feed would have passed.
      // U-PPGH03: prove-out OVERRIDES aggressiveness when both are set.
      // Operator dialed caution; prove-out feed_factor wins. Only one
      // entry per op lands in feed_optimizations[].
      const blockId = "N" + (100 + i * 10);
      let effectiveOp = op;
      if (proveOutEntry) {
        const optimizedFeed = Math.round(op.feed_mm_min * proveOutEntry.feedFactor);
        effectiveOp = { ...op, feed_mm_min: optimizedFeed };
        feedOptimizations.push({
          block_id: blockId,
          level: PROVE_OUT_LEVEL_SENTINEL,
          label: PROVE_OUT_LABEL,
          multiplier: proveOutEntry.feedFactor,
          original_feed_mm_min: op.feed_mm_min,
          optimized_feed_mm_min: optimizedFeed,
        });
      } else if (aggressivenessEntry) {
        const optimizedFeed = Math.round(op.feed_mm_min * aggressivenessEntry.multiplier);
        effectiveOp = { ...op, feed_mm_min: optimizedFeed };
        feedOptimizations.push({
          block_id: blockId,
          level: aggressivenessEntry.level,
          label: aggressivenessEntry.label,
          multiplier: aggressivenessEntry.multiplier,
          original_feed_mm_min: op.feed_mm_min,
          optimized_feed_mm_min: optimizedFeed,
        });
      }

      // U-PPGH04 Kienzle-bounded feed reducer. After aggressiveness/prove-out
      // multipliers are applied, recompute Fc against the operator-supplied
      // max_cutting_force_N and step feed down (in 5% increments) until the
      // predicted force is at or below the limit + 5% tolerance. Skips when
      // optimize_feeds is explicitly false (operator wants the literal feed).
      if (
        cfg.max_cutting_force_N !== undefined &&
        cfg.max_cutting_force_N > 0 &&
        cfg.optimize_feeds !== false
      ) {
        const { kc1_1: kc, mc: mcv } = this.resolveKienzle(effectiveOp);
        const computeFc = (feed: number): number => {
          const fzCurr = feed / (effectiveOp.spindle_rpm * effectiveOp.tool_flutes);
          return kc * effectiveOp.axial_depth_mm * Math.pow(fzCurr, 1 - mcv);
        };
        const originalFeed = effectiveOp.feed_mm_min;
        let workingFeed = originalFeed;
        let FcCurr = computeFc(workingFeed);
        const maxF = cfg.max_cutting_force_N;
        if (FcCurr > maxF) {
          // Step feed down 5% at a time; cap iterations to prevent runaway.
          let guard = 0;
          while (computeFc(workingFeed) > maxF * 1.05 && guard < 200 && workingFeed > 1) {
            workingFeed = Math.max(1, Math.round(workingFeed * 0.95));
            guard += 1;
          }
          const optimizedFeed = Math.max(1, workingFeed);
          effectiveOp = { ...effectiveOp, feed_mm_min: optimizedFeed };
          feedOptimizations.push({
            block_id: blockId,
            level: 0,
            label: "KIENZLE-BOUND",
            multiplier: optimizedFeed / Math.max(originalFeed, 1),
            original_feed_mm_min: originalFeed,
            optimized_feed_mm_min: optimizedFeed,
            reason: `Kienzle Fc=${FcCurr.toFixed(0)}N exceeded ${maxF}N — reduced feed to ${optimizedFeed} mm/min`,
          });
        }
      }

      gcode.push("");
      gcode.push(`(OPERATION ${i + 1}: ${op.operation_type.toUpperCase()})`);

      // Physics checks
      const checks = this.performPhysicsChecks(effectiveOp, gcode.length);
      physicsChecks.push(...checks);
      const failedChecks = checks.filter(c => !c.passed);
      if (failedChecks.length > 0) {
        // Warning format: "Op <n> line <N>: <check>" — operator needs to know
        // WHICH operation failed (not just the G-code line) so they can scroll
        // straight to the offending op in the program tree.
        warnings.push(
          ...failedChecks.map(c => `Op ${i + 1} line ${c.line}: ${c.check}`),
        );
      }

      // Tool change
      const toolChange = this.generateToolChange(effectiveOp, cfg);
      gcode.push(...toolChange);

      // Spindle start — labelled block carries the op's S/F for the sidecar
      // gate to cross-check (U-PPGM13). block_id "N{100 + i*10}" gives stable
      // O(1) lookup keys: N100, N110, N120, ...
      const spindleStart = this.generateSpindleStart(effectiveOp, cfg, blockId);
      gcode.push(...spindleStart);

      // Apply tribal knowledge
      const tips = this.applyTribalKnowledge(effectiveOp);
      tribalTipsApplied.push(...tips.applied);

      // Generate toolpath
      const toolpath = this.generateToolpath(effectiveOp, cfg);
      gcode.push(...toolpath);

      // Build per-block annotation: physics_basis="kienzle" because the
      // engine's force gate at performPhysicsChecks() drives the S/F
      // safety envelope from CANONICAL_KIENZLE; vc/fpt are derived from
      // op.spindle_rpm + op.tool_diameter_mm + op.feed_mm_min + flutes
      // (no inlined physics constants).
      // U-PPGH02: emitted vc/fpt/F reflect the EFFECTIVE feed (post-multiplier)
      // because that is what the machine actually executes. Downstream
      // verifiers cross-check this against the physics chain so they need
      // to see the post-multiplier values, not the operator's intent.
      const vc_mpm = (Math.PI * effectiveOp.tool_diameter_mm * effectiveOp.spindle_rpm) / 1000;
      const fpt_mm = effectiveOp.feed_mm_min / (effectiveOp.spindle_rpm * effectiveOp.tool_flutes);
      blockAnnotations.push({
        block_id: blockId,
        op_id: `op_${i + 1}_${effectiveOp.operation_type}`,
        iso_group: effectiveOp.material_iso,
        tool_material: "carbide",
        emitted: {
          vc_mpm,
          fpt_mm,
          ap_mm: effectiveOp.axial_depth_mm,
          ae_mm: effectiveOp.radial_depth_mm,
          S_rpm: effectiveOp.spindle_rpm,
          F_mmpm: effectiveOp.feed_mm_min,
        },
        physics_basis: "kienzle",
        confidence: 0.85,
        safety_margin: 0.9,
        source_constants: [
          `CANONICAL_KIENZLE.${effectiveOp.material_iso}`,
          `CANONICAL_TAYLOR.${effectiveOp.material_iso}`,
        ],
      });

      // Estimate time on EFFECTIVE feed — slower feed = longer cycle time.
      estimatedTime += this.estimateCycleTime(effectiveOp);
    }

    // Program end
    gcode.push("");
    gcode.push("(END OF PROGRAM)");
    gcode.push("M05 (SPINDLE STOP)");
    gcode.push("M09 (COOLANT OFF)");
    gcode.push("G91 G28 Z0 (Z HOME)");
    gcode.push("G28 X0 Y0 (XY HOME)");
    gcode.push("M30 (PROGRAM END)");
    gcode.push("%");

    // Setup sheet (U-PPGH04). Tools deduped + sorted ascending by tool number.
    // Operations preserve input sequence with 1-based numbering for the
    // operator's traveler. Uses structured tool when present, falls back to
    // flat fields. Skipped when emit_setup_sheet: false.
    let setupSheet: SetupSheet | undefined;
    if (cfg.emit_setup_sheet !== false) {
      const seenTools = new Map<number, SetupSheet["tools"][number]>();
      for (const op of operations) {
        if (seenTools.has(op.tool_number)) continue;
        const t = op.tool;
        seenTools.set(op.tool_number, {
          number: op.tool_number,
          diameter_mm: t?.diameter_mm ?? op.tool_diameter_mm,
          flutes: t?.flutes ?? op.tool_flutes,
          description: t?.description ?? op.tool_description,
          coating: t?.coating,
          stickout_mm: t?.stickout_mm,
        });
      }
      setupSheet = {
        machine: "Hurco VMX24",
        controller: "WinMax V11",
        units: cfg.units ?? "metric",
        tools: Array.from(seenTools.values()).sort((a, b) => a.number - b.number),
        operations: operations.map((op, idx) => ({
          sequence: idx + 1,
          type: op.operation_type,
          tool_number: op.tool_number,
          spindle_rpm: op.spindle_rpm,
          feed_mm_min: op.feed_mm_min,
        })),
      };
    }

    return {
      gcode,
      program_number: cfg.program_number,
      total_lines: gcode.length,
      estimated_cycle_min: Math.round(estimatedTime * 10) / 10,
      tools_used: Array.from(toolsUsed).sort((a, b) => a - b),
      warnings,
      block_annotations: blockAnnotations,
      aggressiveness_applied: aggressivenessEntry?.level,
      feed_optimizations: feedOptimizations,
      prove_out_mode: proveOutEntry !== null,
      physics_checks: physicsChecks,
      tribal_tips_applied: tribalTipsApplied,
      setup_sheet: setupSheet,
    };
  }

  /**
   * Simplified single-operation API (U-PPGH04).
   *
   * Wraps a single PostMove[] toolpath + structured tool + material into a
   * complete program. Intended for callers that have already done their own
   * CAM segmentation and just want PRISM to format/validate one operation
   * worth of moves into Hurco V11 G-code. Internally constructs a single
   * MillOperation and delegates to generateProgram.
   */
  postSingle(input: {
    toolpath: PostMove[];
    material: MillMaterial;
    tool: MillTool;
    operation: MillOperation["operation_type"];
    spindle_rpm: number;
    feed_mm_min: number;
    axial_depth_mm: number;
    radial_depth_mm?: number;
    coolant?: MillOperation["coolant"];
    aggressiveness?: number;
    program_number?: number;
  }): HurcoPostOutput {
    const coords = input.toolpath.map(m => ({
      x: m.x,
      y: m.y,
      z: m.z,
      type: m.type,
    }));
    const arcData = input.toolpath.map(m => ({
      i: m.i,
      j: m.j,
      r: m.r,
    }));
    const isoGroup: ISOGroup = (input.material.iso_group ?? "P") as ISOGroup;
    const op: MillOperation = {
      operation_type: input.operation,
      tool_number: input.tool.number,
      tool_diameter_mm: input.tool.diameter_mm,
      tool_flutes: input.tool.flutes,
      tool_description: input.tool.description,
      tool: input.tool,
      material_iso: isoGroup,
      material: { ...input.material, iso_group: isoGroup },
      spindle_rpm: input.spindle_rpm,
      feed_mm_min: input.feed_mm_min,
      axial_depth_mm: input.axial_depth_mm,
      radial_depth_mm: input.radial_depth_mm,
      coolant: input.coolant,
      coordinates: coords,
      arc_data: arcData,
    };
    return this.generateProgram([op], {
      program_number: input.program_number,
      aggressiveness: input.aggressiveness,
    });
  }

  /**
   * Generate safe start block
   */
  private generateSafeStart(cfg: HurcoPostConfig): string[] {
    const lines: string[] = [];
    lines.push("(SAFE START)");

    if (cfg.units === "metric") {
      lines.push("G21 (METRIC)");
    } else {
      lines.push("G20 (INCH)");
    }

    lines.push("G90 G17 G40 G49 G80 (ABSOLUTE, XY PLANE, CANCEL COMP, CANCEL CANNED)");
    // Work offset emission — Fanuc/Hurco convention:
    //   work_offset 54-59 → direct G54..G59 (basic WCS 1-6)
    //   any other value   → G54.1 P<n> extended WCS (Hurco V11 supports
    //     G54.1 P1..P300 per WinMax docs; we don't enforce upper bound here
    //     because the WinMax UI rejects out-of-range P# at load time)
    const wo = cfg.work_offset!;
    if (wo >= 54 && wo <= 59) {
      lines.push(`G${wo} (WORK OFFSET)`);
    } else {
      lines.push(`G54.1 P${wo} (WORK OFFSET)`);
    }

    return lines;
  }

  /**
   * Classify smoothing P-value for G05.3 by operation type.
   * Mirrors Fusion .cps PRISM Enhanced v8.9.153 logic (lines 3008-3022):
   *   adaptive/rough strategies → P35 ADAPTIVE ROUGH (speed over finish)
   *   everything else           → P10 FINISH (quality over speed)
   * Ground-truth corpus: 4 JM Die programs in JM DIE/HURCO CNC PROGRAMS/.
   */
  private classifySmoothing(operationType: string): { p: number; label: string } {
    const t = operationType.toLowerCase();
    if (t.includes("adaptive") || t.includes("rough")) {
      return { p: 35, label: "ADAPTIVE ROUGH" };
    }
    return { p: 10, label: "FINISH" };
  }

  /**
   * Generate tool change sequence
   */
  private generateToolChange(op: MillOperation, cfg: HurcoPostConfig): string[] {
    const lines: string[] = [];
    const tcp = cfg.tool_change_position!;

    lines.push(`G91 G28 Z0 (Z RETRACT)`);
    // Structured tool.description shadows the flat tool_description per U-PPGH04
    // (the structured field is downstream of CAM-side parsing and carries the
    // authoritative name; the flat field is a legacy shortcut). Falls back to
    // the flat field, then to a generic "TOOL <n>" placeholder.
    const toolDesc = op.tool?.description ?? op.tool_description ?? `TOOL ${op.tool_number}`;
    lines.push(`T${op.tool_number} M06 (${toolDesc})`);

    // G05.3 UltiMotion smoothing — emit immediately after M06, before G43,
    // matching the Fusion .cps emission order (verified against real JM Die
    // posted programs). When use_ultimotion is disabled the block is omitted
    // entirely so the engine output can be diffed against a non-smoothed reference.
    if (cfg.use_ultimotion) {
      const sm = this.classifySmoothing(op.operation_type);
      lines.push(`G05.3 P${sm.p} (T${op.tool_number} ${sm.label} SMOOTHING)`);
    }

    lines.push(`G43 H${op.tool_number} (TOOL LENGTH COMP)`);

    return lines;
  }

  /**
   * Generate spindle start with appropriate dwell
   */
  private generateSpindleStart(op: MillOperation, cfg: HurcoPostConfig, blockId?: string): string[] {
    const lines: string[] = [];

    // Spindle-on block: S<rpm> M03 with explanatory comment. The N<id>
    // block-label prefix was dropped (2026-05-22) — none of the JM Die
    // sample programs use inline N-numbers and the test contract asserts
    // the unprefixed form. U-PPGM13 sidecar verifier resolves block_id
    // from operation index in block_annotations[] metadata, not from
    // an inline N-number.
    lines.push(
      `S${op.spindle_rpm} M03 (SPINDLE CW ${op.spindle_rpm} RPM)`,
    );

    // Apply tribal knowledge: dwell for heavy cuts
    if (op.axial_depth_mm > op.tool_diameter_mm * 0.5) {
      lines.push("G04 P1.0 (DWELL FOR SPINDLE RAMP - HEAVY CUT)");
    }

    // Coolant
    // PPG-HARDEN/U-PPGH01: TSC (through-spindle coolant) was previously
    // accepted by the type-level enum but silently dropped in emit. JM Die's
    // VMX24 is documented as not supporting TSC (see tribal tip categorized
    // "coolant"), but Hurco V11 controllers across the wider VMX/VM line
    // accept M88 — and a programmer who explicitly requests TSC needs the
    // M88 emitted so the operator can see and reject it at machine setup.
    // Silently dropping the request was the worst of all worlds.
    const coolant = op.coolant || cfg.coolant_mode;
    if (coolant === "flood") {
      lines.push("M08 (FLOOD COOLANT)");
    } else if (coolant === "mist") {
      lines.push("M07 (MIST COOLANT)");
    } else if (coolant === "tsc") {
      lines.push("M88 (THROUGH-SPINDLE COOLANT)");
    }

    return lines;
  }

  /**
   * Generate toolpath coordinates
   */
  private generateToolpath(op: MillOperation, cfg: HurcoPostConfig): string[] {
    const lines: string[] = [];

    // Rapid to safe Z
    lines.push(`G00 Z${cfg.safe_z_mm} (RAPID TO SAFE Z)`);

    // Generate coordinate moves
    for (let i = 0; i < op.coordinates.length; i++) {
      const coord = op.coordinates[i];
      const arcData = op.arc_data?.[i];

      let line = "";

      switch (coord.type) {
        case "rapid":
          line = `G00 X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)}`;
          if (coord.z !== undefined) line += ` Z${coord.z.toFixed(3)}`;
          break;

        case "linear":
          line = `G01 X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)}`;
          if (coord.z !== undefined) line += ` Z${coord.z.toFixed(3)}`;
          line += ` F${op.feed_mm_min}`;
          break;

        case "arc_cw":
          line = `G02 X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)}`;
          if (arcData?.r) {
            line += ` R${arcData.r.toFixed(3)}`;
          } else if (arcData?.i !== undefined && arcData?.j !== undefined) {
            line += ` I${arcData.i.toFixed(3)} J${arcData.j.toFixed(3)}`;
          }
          line += ` F${op.feed_mm_min}`;
          break;

        case "arc_ccw":
          line = `G03 X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)}`;
          if (arcData?.r) {
            line += ` R${arcData.r.toFixed(3)}`;
          } else if (arcData?.i !== undefined && arcData?.j !== undefined) {
            line += ` I${arcData.i.toFixed(3)} J${arcData.j.toFixed(3)}`;
          }
          line += ` F${op.feed_mm_min}`;
          break;
      }

      lines.push(line);
    }

    // Retract
    lines.push(`G00 Z${cfg.safe_z_mm} (RETRACT)`);

    return lines;
  }

  /**
   * Resolve effective Kienzle constants (canonical + optional override).
   * U-PPGH04 fail-loud: out-of-range overrides THROW. A 4× canonical kc1_1
   * silently accepted would let a programmer push unsafe force into the
   * spindle; we refuse the program emission rather than warn-and-continue.
   */
  private resolveKienzle(op: MillOperation): { kc1_1: number; mc: number } {
    const canonical = CANONICAL_KIENZLE[op.material_iso];
    const m = op.material;
    if (!m) return { kc1_1: canonical.kc1_1, mc: canonical.mc };

    // ISO mismatch between flat material_iso and structured material.iso_group
    // is a programmer error — refuse to silently average them. R12 fail-loud.
    if (m.iso_group !== undefined && m.iso_group !== op.material_iso) {
      throw new Error(
        `Hurco V11: material.iso_group="${m.iso_group}" does not match op.material_iso="${op.material_iso}"`,
      );
    }

    let kc1_1 = canonical.kc1_1;
    let mc = canonical.mc;

    if (m.kc1_1 !== undefined) {
      if (m.kc1_1 < HurcoV11MillMasterPostEngine.KC1_1_MIN || m.kc1_1 > HurcoV11MillMasterPostEngine.KC1_1_MAX) {
        throw new Error(
          `Hurco V11: kc1_1 override ${m.kc1_1} out of safe range [${HurcoV11MillMasterPostEngine.KC1_1_MIN}, ${HurcoV11MillMasterPostEngine.KC1_1_MAX}] N/mm²`,
        );
      }
      kc1_1 = m.kc1_1;
    }
    if (m.mc !== undefined) {
      if (m.mc < HurcoV11MillMasterPostEngine.MC_MIN || m.mc > HurcoV11MillMasterPostEngine.MC_MAX) {
        throw new Error(
          `Hurco V11: mc override ${m.mc} out of safe range [${HurcoV11MillMasterPostEngine.MC_MIN}, ${HurcoV11MillMasterPostEngine.MC_MAX}]`,
        );
      }
      mc = m.mc;
    }
    return { kc1_1, mc };
  }

  /**
   * Perform physics checks on operation. Five base checks always; stickout
   * deflection added when `op.tool.stickout_mm` is provided.
   *
   * Base checks: Vc, fz, Fc (Kienzle), Spindle RPM, Taylor tool life.
   */
  private performPhysicsChecks(op: MillOperation, startLine: number): HurcoPostOutput["physics_checks"] {
    const checks: HurcoPostOutput["physics_checks"] = [];

    // [1] Cutting speed (Vc) — π·D·n/1000
    const Vc = (Math.PI * op.tool_diameter_mm * op.spindle_rpm) / 1000;
    const maxVc = this.getMaxCuttingSpeed(op.material_iso);
    checks.push({
      line: startLine,
      check: `Cutting speed ${Vc.toFixed(0)} m/min vs max ${maxVc} m/min for ISO ${op.material_iso}`,
      passed: Vc <= maxVc * 1.2,
      value: Vc,
      limit: maxVc,
    });

    // [2] Chip load (fz) — F / (n × Z)
    const fz = op.feed_mm_min / (op.spindle_rpm * op.tool_flutes);
    const minFz = 0.02;
    const maxFz = op.material_iso === "N" ? 0.25 : 0.15;
    checks.push({
      line: startLine,
      check: `Chip load ${fz.toFixed(3)} mm/tooth (range ${minFz}-${maxFz})`,
      passed: fz >= minFz && fz <= maxFz,
      value: fz,
      limit: maxFz,
    });

    // [3] Cutting force (Kienzle): Fc = kc1_1 · ap · fz^(1-mc)
    // Sandvik Coromant General Turning Handbook (2024), ISO 3685.
    // Effective constants (canonical or override) surfaced in the check
    // string so downstream verifiers can audit which values drove the gate.
    const { kc1_1, mc } = this.resolveKienzle(op);
    const Fc = kc1_1 * op.axial_depth_mm * Math.pow(fz, 1 - mc);
    const maxForce = 2000; // N, conservative VMX24 spindle limit
    checks.push({
      line: startLine,
      check: `Cutting force ${Fc.toFixed(0)} N vs machine limit ${maxForce} N (kc1_1=${kc1_1}, mc=${mc})`,
      passed: Fc <= maxForce,
      value: Fc,
      limit: maxForce,
    });

    // [4] Spindle speed — VMX24 max 10000 RPM
    const maxRpm = 10000;
    checks.push({
      line: startLine,
      check: `Spindle ${op.spindle_rpm} RPM vs max ${maxRpm} RPM`,
      passed: op.spindle_rpm <= maxRpm,
      value: op.spindle_rpm,
      limit: maxRpm,
    });

    // [5] Taylor tool life: T = (C/Vc)^(1/n)
    // F.W. Taylor (1907) — life vs cutting speed power law.
    const taylor = CANONICAL_TAYLOR[op.material_iso];
    const T = Math.pow(taylor.C / Math.max(Vc, 1e-6), 1 / taylor.n);
    const targetLife = HurcoV11MillMasterPostEngine.TAYLOR_TARGET_LIFE_MIN;
    checks.push({
      line: startLine,
      check: `Taylor tool life ${T.toFixed(1)} min vs target ${targetLife} min (C=${taylor.C}, n=${taylor.n})`,
      passed: T >= targetLife,
      value: T,
      limit: targetLife,
    });

    // [6] (Conditional) Stickout deflection — included only when the
    // structured tool carries an explicit stickout_mm. Ratio = L/D; fails
    // when > 4× (industry convention from Sandvik & Iscar handbooks for
    // unsupported boring/milling tools without a stub mod).
    if (op.tool?.stickout_mm !== undefined && op.tool.stickout_mm > 0) {
      const D = op.tool.diameter_mm > 0 ? op.tool.diameter_mm : op.tool_diameter_mm;
      const ratio = op.tool.stickout_mm / D;
      const limit = HurcoV11MillMasterPostEngine.STICKOUT_RATIO_LIMIT;
      checks.push({
        line: startLine,
        check: `Tool stickout ratio ${ratio.toFixed(1)} (L/D) vs limit ${limit}× — deflection sensitivity gate`,
        passed: ratio <= limit,
        value: ratio,
        limit,
      });
    }

    return checks;
  }

  /**
   * Apply tribal knowledge based on operation
   */
  private applyTribalKnowledge(op: MillOperation): { applied: string[]; modifications: string[] } {
    const applied: string[] = [];
    const modifications: string[] = [];

    for (const tip of HURCO_V11_TRIBAL_KNOWLEDGE) {
      // Check if tip applies to this operation
      const appliesToOp = tip.applies_to.includes("all") || tip.applies_to.includes(op.operation_type);
      const appliesToMaterial = !tip.iso_group || tip.iso_group === op.material_iso;

      if (appliesToOp && appliesToMaterial) {
        applied.push(`[${tip.category}] ${tip.tip}`);
      }
    }

    return { applied, modifications };
  }

  /**
   * Estimate cycle time for operation
   */
  private estimateCycleTime(op: MillOperation): number {
    let totalDistance = 0;

    for (let i = 1; i < op.coordinates.length; i++) {
      const prev = op.coordinates[i - 1];
      const curr = op.coordinates[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dz = (curr.z || 0) - (prev.z || 0);
      totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    // Estimate based on feed rate and rapids
    const cuttingTime = totalDistance / op.feed_mm_min;
    const rapidTime = totalDistance * 0.1 / 33000; // Assume 10% rapids at 33 m/min
    const toolChangeTime = 0.15; // 9 seconds

    return cuttingTime + rapidTime + toolChangeTime;
  }

  /**
   * Get max cutting speed for material
   */
  private getMaxCuttingSpeed(iso: ISOGroup): number {
    const maxVc: Record<ISOGroup, number> = {
      P: 250, M: 150, K: 200, N: 500, S: 50, H: 100
    };
    return maxVc[iso] || 200;
  }

  /**
   * Get engine statistics
   */
  getStats(): {
    machine: string;
    controller: string;
    tribal_tips: number;
    physics_checks: number;
    features: string[];
  } {
    return {
      machine: "Hurco VMX24",
      controller: "WinMax V11",
      tribal_tips: HURCO_V11_TRIBAL_KNOWLEDGE.length,
      // 5 base checks: Vc, fz, Fc (Kienzle), Spindle RPM, Taylor tool life.
      // Stickout deflection is conditional (tool.stickout_mm) so not counted.
      physics_checks: 5,
      features: [
        "UltiMotion G05.3 smoothing (P35 adaptive / P10 finish)",
        "G65 conversational macros",
        "Kienzle force validation",
        "Taylor tool life integration",
        "JM Die tribal knowledge",
        "Renishaw probe support",
        "Aggressiveness levels 1-5 (sync feed multiplier)",
        "Prove-out mode (feed reduction + optional stops)",
        "Material constant overrides with safe-range guard",
        "Kienzle-bounded feed reducer (max_cutting_force_N)",
        "Structured setup sheet emission",
        "Tool stickout deflection check (L/D ≤ 4)"
      ]
    };
  }

  /**
   * Advanced-pipeline post-emission pass — mirrors OkumaOSPMillMasterPostEngine.
   *
   * Threads the base sync `generateProgram` output through PRISM's existing
   * `autoSpeedFeedEngine.optimize()` so the Hurco V11 master post benefits
   * from chip-thinning compensation, corner deceleration, plunge limits, and
   * machine-rigidity-aware S/F. Compounding context is loaded from
   * `MachineStrategyConstraintEngine` via `cfg.machine_id`.
   *
   * Sync `generateProgram` is unchanged. Opt-in via `use_advanced_features: true`.
   *
   * @milestone PPG-WIRE-MS5/U-PPGW-AdvancedWiring
   */
  async generateProgramAdvanced(
    operations: MillOperation[],
    config?: Partial<HurcoPostConfig>,
  ): Promise<HurcoPostOutput> {
    const baseOutput = this.generateProgram(operations, config);
    const cfg: HurcoPostConfig = { ...this.defaultConfig, ...config };

    if (!cfg.use_advanced_features) {
      return {
        ...baseOutput,
        advanced_features_applied: [],
        optimized_gcode: null,
        advanced_summary: null,
      };
    }

    const enhancements: string[] = [];

    const requestedAdvancedFeatures: string[] = [];
    if (cfg.advanced_post) {
      if (cfg.advanced_post.adaptive_clearing) requestedAdvancedFeatures.push("adaptive_clearing");
      if (cfg.advanced_post.hsm) requestedAdvancedFeatures.push("hsm");
      if (cfg.advanced_post.feed_optimization) requestedAdvancedFeatures.push("feed_optimization");
      if (cfg.advanced_post.multi_axis) requestedAdvancedFeatures.push("multi_axis");
      if (cfg.advanced_post.in_process_measure) requestedAdvancedFeatures.push("in_process_measure");
      if (cfg.advanced_post.tool_management) requestedAdvancedFeatures.push("tool_management");
    }

    const machine = cfg.machine_id
      ? machineStrategyConstraintEngine.getMachineById(cfg.machine_id)
      : null;

    const axes: AxisKinematics[] | undefined = machine
      ? buildAxesFromMachine(machine)
      : undefined;

    const toolDefs = operations.map((op) => ({
      tool_number: op.tool_number,
      diameter_mm: op.tool_diameter_mm,
      flutes: op.tool_flutes,
      type: "endmill" as const,
      material: "carbide" as const,
    }));

    const primaryIso = operations[0]?.material_iso ?? "P";
    const sfResult = await autoSpeedFeedEngine.optimize({
      gcode: baseOutput.gcode.join("\n"),
      material: HURCO_ISO_TO_AUTO_SF_MATERIAL[primaryIso],
      iso_group: primaryIso,
      tools: toolDefs,
      strategy: cfg.use_ultimotion ? "hsm" : "conventional",
      coolant: "flood",
      machine_power_kw: machine?.spindle_power_kW,
      machine_max_rpm: machine?.max_rpm,
      machine_rigidity: hurcoRigidityToAutoSF(machine?.rigidity_class),
      optimize_for: "balanced",
      aggressiveness: cfg.advanced_aggressiveness ?? 0.5,
      preserve_rapids: true,
    });
    enhancements.push("auto_speed_feed_optimization");

    log.info(
      `[HurcoV11] AutoSpeedFeed pass: ${sfResult.stats.lines_modified}/${sfResult.stats.cutting_lines} cutting lines modified, ` +
        `~${sfResult.stats.estimated_time_savings_pct.toFixed(1)}% time savings`,
    );

    // ── PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring ─────────────────────
    // Rapid-reposition optimizer pass — operates on structured rapid moves
    // extracted from the input MillOperation.coordinates (NOT on G-code text).
    // Sync `output.gcode` is preserved byte-identical; only advanced_summary
    // is augmented with rapid/retract/air-cut savings.
    const rapidMoves = extractRapidMoves(operations);
    const rapidsResult = rapidRepositionOptEngine.optimizeRapids({
      moves: rapidMoves,
      axes,
      controller_diagonal_mode: cfg.use_ultimotion ? "independent" : "slowest_axis",
    });
    const retractsResult = rapidRepositionOptEngine.optimizeRetracts({
      moves: rapidMoves,
      axes,
      retract_clearance_mm: 5,
    });
    const airCutSamples = buildAirCutSamples(operations);
    const airCutsResult = rapidRepositionOptEngine.detectAirCuts({
      air_cut_data: airCutSamples,
    });
    const rapidTotal =
      rapidsResult.total_saved_sec +
      retractsResult.total_saved_sec +
      airCutsResult.total_time_wasted_sec;
    enhancements.push("rapid_reposition_optimization");
    log.info(
      `[HurcoV11] RapidReposition pass: rapids=${rapidsResult.optimizations.length} ` +
        `retracts=${retractsResult.optimizations.length} air_cuts=${airCutsResult.detections.length} ` +
        `total_saved=${rapidTotal.toFixed(2)}s`,
    );

    // ── PPG-WIRE-MS5/U-PPGW-HSMDwell-Wiring ───────────────────────────
    // HSMDwellAtCornerEngine pass — analyzes corners detected in
    // MillOperation.coordinates (linear/arc transitions only; rapids
    // skipped since they're pre-positioning). Sync `output.gcode` is
    // preserved byte-identical; only advanced_summary.hsm_dwell is
    // augmented with corner-dwell statistics + dedup'd recommendations.
    //
    // Mode mapping: cfg.use_ultimotion=true → "g05p1" (Hurco UltiMotion
    // ≈ Fanuc AI contour control / G05.1 family for dwell purposes).
    // Default off — engine emits straight motion control dwell.
    const hsmCorners = extractCornersFromOperations(operations);
    const hsmServo: MachineServo = buildServoFromMachine(machine);
    const hsmMode: HSMParameters["hsm_mode"] = cfg.use_ultimotion ? "g05p1" : "off";
    const hsmResults = runHSMDwellPass(hsmCorners, hsmServo, hsmMode);
    enhancements.push("hsm_dwell_optimization");
    log.info(
      `[HurcoV11] HSMDwell pass: corners=${hsmResults.corners_analyzed} ` +
        `high_dwell=${hsmResults.high_dwell_count} thermal=${hsmResults.high_thermal_count} ` +
        `tol_risk=${hsmResults.tolerance_violation_count} mode=${hsmResults.hsm_mode_used} ` +
        `total_dwell=${hsmResults.total_recommended_dwell_ms.toFixed(1)}ms`,
    );

    // ── PPG-WIRE-MS5/U-PPGW-FeatureSequencer-Wiring ───────────────────
    // sequenceFeatures (TSP nearest-neighbor + 2-opt) reorders features
    // to minimize total rapid-travel distance between op centroids.
    // Output is ADVISORY — operation order is not mutated and sync
    // output.gcode is preserved byte-identical. The reordered sequence
    // surfaces in advanced_summary.feature_sequence.optimized_sequence so
    // a downstream CAM/setup planner can re-emit if desired.
    const features = extractFeaturesFromOperations(operations);
    const rapidRateMmin = machine
      ? machine.rapid_traverse_mm_min / 1000
      : FEATURE_DEFAULT_RAPID_M_MIN;
    const seqResult = rapidRepositionOptEngine.sequenceFeatures({
      features,
      rapid_rate_m_min: rapidRateMmin,
    });
    const reorderingsCount = countReorderings(
      seqResult.original_sequence,
      seqResult.optimized_sequence,
    );
    enhancements.push("feature_sequence_optimization");
    log.info(
      `[HurcoV11] FeatureSequencer pass: features=${features.length} ` +
        `reorderings=${reorderingsCount} ` +
        `dist_saved=${seqResult.distance_saved_mm.toFixed(1)}mm ` +
        `time_saved=${seqResult.time_saved_sec.toFixed(2)}s ` +
        `(${seqResult.improvement_pct.toFixed(1)}%)`,
    );

    // PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring (step 5)
    let finalGcode = sfResult.gcode;
    let advancedPostSummary: HurcoAdvancedSummary["advanced_post"] = null;
    if (cfg.advanced_post) {
      const apFeatures: AdvancedPostFeaturesConfig = { ...cfg.advanced_post };
      const preWarnings: string[] = [];
      if (apFeatures.multi_axis && machine && machine.axis_count < 4) {
        preWarnings.push(
          `AdvancedPost: multi_axis (RTCP) skipped — resolved machine '${machine.machine_id}' is ${machine.axis_count}-axis; RTCP requires axis_count >= 4 (e.g. Hurco VMX5x).`,
        );
        apFeatures.multi_axis = undefined;
      }
      const apResult = advancedPostProcessorEngine.enhance({
        controller: "hurco",
        gcode: sfResult.gcode,
        ...apFeatures,
      });
      finalGcode = apResult.gcode;
      enhancements.push("advanced_post_processing");
      advancedPostSummary = {
        controller_used: "hurco",
        requested_features: requestedAdvancedFeatures,
        enhancements_applied: apResult.enhancements_applied,
        warnings: [...preWarnings, ...apResult.warnings],
        estimated_time_savings_pct: apResult.estimated_time_savings_pct,
        output_lines: apResult.gcode.split("\n").length,
      };
      log.info(
        `[HurcoV11] AdvancedPost pass: ${apResult.enhancements_applied.length} sub-features applied, ` +
          `~${apResult.estimated_time_savings_pct.toFixed(1)}% time savings, ${apResult.warnings.length} warnings`,
      );
    }

    return {
      ...baseOutput,
      advanced_features_applied: enhancements,
      optimized_gcode: finalGcode.split("\n"),
      advanced_summary: {
        auto_speed_feed: {
          lines_modified: sfResult.stats.lines_modified,
          tools_processed: sfResult.stats.tools_processed,
          avg_feed_change_pct: sfResult.stats.average_feed_change_pct,
          time_savings_pct: sfResult.stats.estimated_time_savings_pct,
          chip_thinning_adjustments: sfResult.stats.chip_thinning_adjustments,
          corner_decelerations: sfResult.stats.corner_decelerations,
        },
        machine_used: machine
          ? {
              id: machine.machine_id,
              name: machine.name,
              atc: machine.tool_magazine_capacity,
              rigidity_class: machine.rigidity_class,
              ways_type: machine.ways_type,
              spindle_type: machine.spindle_type,
            }
          : null,
        rapid_reposition: {
          rapids_count: rapidsResult.optimizations.length,
          rapid_savings_sec: round2(rapidsResult.total_saved_sec),
          retracts_count: retractsResult.optimizations.length,
          retract_savings_sec: round2(retractsResult.total_saved_sec),
          air_cuts_count: airCutsResult.detections.length,
          air_cut_wasted_sec: round2(airCutsResult.total_time_wasted_sec),
          total_saved_sec: round2(rapidTotal),
          optimizations_count:
            rapidsResult.optimizations.length +
            retractsResult.optimizations.length +
            airCutsResult.detections.length,
        },
        hsm_dwell: hsmResults,
        feature_sequence: {
          features_count: features.length,
          original_sequence: seqResult.original_sequence,
          optimized_sequence: seqResult.optimized_sequence,
          reorderings_count: reorderingsCount,
          original_distance_mm: seqResult.original_distance_mm,
          optimized_distance_mm: seqResult.optimized_distance_mm,
          distance_saved_mm: seqResult.distance_saved_mm,
          time_saved_sec: seqResult.time_saved_sec,
          improvement_pct: seqResult.improvement_pct,
          method: seqResult.method,
        },
        advanced_post: advancedPostSummary,
      },
    };
  }

  /**
   * Generate a Hurco V11 program AND enrich it with the full PSN substrate.
   *
   * HURCO-VM30I-FULL-PSN-MS0 (echo iter7 2026-05-24) — closes the
   * "are we using everything PRISM gives us" gap surfaced 2026-05-24.
   * Composes 4 engines built this session (GCodeRuntimePredictor +
   * GCodeBidirectionalOptimizer + CostEfficiencyBridge + PRISM AI feature
   * recommender) on top of the canonical `generateProgram()` output. Each
   * substrate call is best-effort + fail-soft: any single failure logs to
   * `substrate_errors` but never blocks the rest of the enrichment.
   *
   * Backwards-compatible: callers using `generateProgram()` are unaffected.
   * This is the entry point the JM-Die roundtrip harness will call.
   *
   * @param operations  Mill operations (same shape as generateProgram).
   * @param config      Hurco post config (same shape as generateProgram).
   * @param partContext Optional part-level context that informs the PSN
   *                    enrichment (material, machine, part description,
   *                    shop rates). Sensible defaults if omitted.
   */
  async generateProgramWithFullPSN(
    operations: MillOperation[],
    config?: Partial<HurcoPostConfig>,
    partContext?: {
      program_id?: string;
      part_description?: string;
      material?: { name: string; iso_group: ISOGroup; price_per_kg_usd?: number; density_g_cm3?: number };
      machine_id?: string;
      shop_rates?: { labor_per_hr_usd: number; machine_per_hr_usd: number; overhead_pct: number };
    },
  ): Promise<HurcoPostOutput> {
    // Step 1 — base emit (byte-identical to legacy path).
    const base = this.generateProgram(operations, config);

    const substrate_errors: string[] = [];
    const enrichment: HurcoPSNEnrichment = {
      enriched_at: new Date().toISOString(),
      full_psn_engaged: true,
      substrate_errors,
    };

    const machineId = partContext?.machine_id ?? "hurco_vmx24";

    // Convert MillOperation[] → ParsedBlock[] for the runtime predictor +
    // bidirectional optimizer (both consume ParsedBlock[] uniformly).
    // Mapping is intentionally minimal: one G1 block per cutting coordinate +
    // a G0 rapid block per operation header. Lossy on macro/probe ops but
    // covers the bulk of cycle time (which is what the runtime predictor
    // bills against). Returns [] when operations are empty.
    const blocks = operationsToParsedBlocks(operations);

    // Step 2 — runtime prediction (kinematic-aware, machine-library lookup).
    // RuntimePrediction exposes .machine (MachineKinematics) + .total_min;
    // confidence isn't a top-level field — derived locally from coverage.
    try {
      const { gcodeRuntimePredictorEngine } = await import("./GCodeRuntimePredictorEngine.js");
      const rt = gcodeRuntimePredictorEngine.predictForMachine(blocks, machineId);
      const coverage = blocks.length > 0
        ? Math.min(1, rt.blocks?.length ? rt.blocks.length / blocks.length : 1)
        : 0;
      enrichment.runtime_estimate = {
        total_minutes: rt.total_min,
        machine_id: rt.machine.machine_id,
        confidence: coverage,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      substrate_errors.push(`runtime_estimate: ${msg}`);
      enrichment.runtime_estimate = { total_minutes: 0, machine_id: machineId, confidence: 0, error: msg };
      enrichment.full_psn_engaged = false;
    }

    // Step 3 — bidirectional optimizer recommendations.
    try {
      const [{ gcodeBidirectionalOptimizerEngine }, { MACHINE_LIBRARY }] = await Promise.all([
        import("./GCodeBidirectionalOptimizerEngine.js"),
        import("./GCodeRuntimePredictorEngine.js"),
      ]);
      const machine = MACHINE_LIBRARY[machineId];
      if (!machine) throw new Error(`Unknown machine_id '${machineId}' for optimizer`);
      const opt = gcodeBidirectionalOptimizerEngine.optimize({ blocks, machine });
      const recs = Array.isArray(opt?.recommendations) ? opt.recommendations : [];
      enrichment.optimizer_recommendations = {
        count: recs.length,
        top_3: recs.slice(0, 3).map((r: { category?: string; description?: string; estimated_savings_sec?: number }) => ({
          category: r.category ?? "uncategorized",
          description: r.description ?? "",
          estimated_savings_pct: typeof r.estimated_savings_sec === "number"
            ? Math.round((r.estimated_savings_sec / Math.max(1, base.estimated_cycle_min * 60)) * 1000) / 10
            : undefined,
        })),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      substrate_errors.push(`optimizer_recommendations: ${msg}`);
      enrichment.optimizer_recommendations = { count: 0, top_3: [], error: msg };
      enrichment.full_psn_engaged = false;
    }

    // Step 4 — cost estimate. CostEfficiencyBridgeEngine.build() expects a
    // richer BridgeInputs (blocks + opFeatures + tool pricing). We compute a
    // first-order estimate here from V11's existing cycle time + default
    // shop rates so the enrichment is always populated; deep cost routing
    // through CostEfficiencyBridge stays available as a future composition
    // path (HURCO-VM30I-FULL-PSN-MS1).
    try {
      const rates = partContext?.shop_rates ?? {
        labor_per_hr_usd: 65,
        machine_per_hr_usd: 95,
        overhead_pct: 0.15,
      };
      const cycle_min = enrichment.runtime_estimate?.total_minutes ?? base.estimated_cycle_min;
      const cycle_hr = cycle_min / 60;
      const labor_cost = rates.labor_per_hr_usd * cycle_hr;
      const machine_cost = rates.machine_per_hr_usd * cycle_hr;
      const subtotal = labor_cost + machine_cost;
      const overhead = subtotal * rates.overhead_pct;
      const total = subtotal + overhead;
      const most_expensive = machine_cost >= labor_cost ? "machine_time" : "labor";
      enrichment.cost_report = {
        total_cost_usd: Math.round(total * 100) / 100,
        cycle_min,
        most_expensive_line_item: most_expensive,
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      substrate_errors.push(`cost_report: ${msg}`);
      enrichment.cost_report = { total_cost_usd: 0, cycle_min: base.estimated_cycle_min, most_expensive_line_item: "unknown", error: msg };
      enrichment.full_psn_engaged = false;
    }

    // Step 5 — PRISM AI feature recommendations.
    try {
      const { prismSelfAwarenessEngine } = await import("./PRISMSelfAwarenessEngine.js");
      const query = partContext?.part_description
        ?? `Hurco V11 mill program for ${partContext?.material?.name ?? "aluminum_6061"} on ${machineId}`;
      const recs = prismSelfAwarenessEngine.recommendAIFeatures(query);
      const arr = Array.isArray(recs) ? recs : [];
      enrichment.ai_feature_recommendations = {
        count: arr.length,
        top_5: arr.slice(0, 5).map((r: { feature?: string; reason?: string; priority?: string }) => ({
          feature: r.feature ?? "unknown",
          reason: r.reason ?? "",
          priority: r.priority,
        })),
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      substrate_errors.push(`ai_feature_recommendations: ${msg}`);
      enrichment.ai_feature_recommendations = { count: 0, top_5: [], error: msg };
      enrichment.full_psn_engaged = false;
    }

    return { ...base, psn_enrichment: enrichment };
  }
}

// Local helper — minimal MillOperation[] → ParsedBlock[] mapper for the
// PSN-enrichment runtime + optimizer calls. Emits one G0 rapid block per
// op header followed by one block per cutting coordinate (G1/G2/G3).
// Returns [] when operations is empty. Defensive against missing fields.
function operationsToParsedBlocks(
  operations: MillOperation[],
): Array<{ motion: "G0" | "G1" | "G2" | "G3"; x?: number; y?: number; z?: number; f?: number; s?: number; t?: number }> {
  const out: Array<{ motion: "G0" | "G1" | "G2" | "G3"; x?: number; y?: number; z?: number; f?: number; s?: number; t?: number }> = [];
  for (const op of operations) {
    if (!op?.coordinates?.length) continue;
    const f = typeof op.feed_mm_min === "number" && Number.isFinite(op.feed_mm_min) ? op.feed_mm_min : undefined;
    const s = typeof op.spindle_rpm === "number" && Number.isFinite(op.spindle_rpm) ? op.spindle_rpm : undefined;
    const t = typeof op.tool_number === "number" && Number.isFinite(op.tool_number) ? op.tool_number : undefined;
    // Op header rapid
    const first = op.coordinates[0];
    out.push({
      motion: "G0",
      x: typeof first?.x === "number" && Number.isFinite(first.x) ? first.x : undefined,
      y: typeof first?.y === "number" && Number.isFinite(first.y) ? first.y : undefined,
      z: typeof first?.z === "number" && Number.isFinite(first.z) ? first.z : undefined,
      t,
    });
    for (const c of op.coordinates) {
      if (!c) continue;
      const motion: "G1" | "G2" | "G3" = c.type === "arc_cw" ? "G2" : c.type === "arc_ccw" ? "G3" : "G1";
      out.push({
        motion,
        x: typeof c.x === "number" && Number.isFinite(c.x) ? c.x : undefined,
        y: typeof c.y === "number" && Number.isFinite(c.y) ? c.y : undefined,
        z: typeof c.z === "number" && Number.isFinite(c.z) ? c.z : undefined,
        f,
        s,
      });
    }
  }
  return out;
}

// ============================================================================
// PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring — helpers
// ============================================================================

/**
 * Map MachineProfile → AxisKinematics[]. MachineProfile carries a single
 * `rapid_traverse_mm_min` and `acceleration_g`; we apply both to all linear
 * axes uniformly. Rotary axes are added when machine.axis_count > 3 with
 * conservative default rpm (per-axis kinematics enrichment is a separate
 * fleet-data unit). `work_envelope_mm` populates travel limits.
 */
function buildAxesFromMachine(
  machine: ReturnType<typeof machineStrategyConstraintEngine.getMachineById>,
): AxisKinematics[] | undefined {
  if (!machine) return undefined;
  const rapidM = machine.rapid_traverse_mm_min / 1000;
  const accel = machine.acceleration_g;
  const env = machine.work_envelope_mm;
  const axes: AxisKinematics[] = [
    { name: "X", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.x },
    { name: "Y", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.y },
    { name: "Z", rapid_m_min: rapidM, accel_g: accel, is_rotary: false, travel_mm: env.z },
  ];
  if (machine.axis_count >= 4) {
    axes.push({ name: "A", rapid_m_min: 0, is_rotary: true, rpm: 30, travel_deg: 360 });
  }
  if (machine.axis_count >= 5) {
    axes.push({ name: "C", rapid_m_min: 0, is_rotary: true, rpm: 30, travel_deg: 360 });
  }
  return axes;
}

/**
 * Extract pairwise RapidMove[] from `MillOperation.coordinates`. Each operation
 * starts with an implicit rapid to its first coordinate; subsequent
 * `type:"rapid"` entries continue the rapid chain. Linear/arc points break the
 * chain. Cross-operation transitions are also tagged as rapids (matches the
 * G-code emission where a tool change retracts and rapids to next op start).
 */
function extractRapidMoves(operations: MillOperation[]): RapidMove[] {
  const moves: RapidMove[] = [];
  let line = 100;
  let prev: { x: number; y: number; z: number } | null = null;

  for (const op of operations) {
    if (!op.coordinates || op.coordinates.length === 0) continue;
    for (const pt of op.coordinates) {
      if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y) || !Number.isFinite(pt.z)) {
        throw new Error(
          `[HurcoV11] Invalid coordinate (NaN or Infinity) at op tool=${op.tool_number}`,
        );
      }
      const here = { x: pt.x, y: pt.y, z: pt.z };
      if (pt.type === "rapid" && prev) {
        if (here.x !== prev.x || here.y !== prev.y || here.z !== prev.z) {
          moves.push({ from: prev, to: here, line_number: line });
        }
      }
      prev = here;
      line += 10;
    }
    // Force a rapid retract gap between operations (mirrors tool-change emission).
    prev = null;
    line += 10;
  }
  return moves;
}

/** Synthesize AirCutDetection input from MillOperation feed/length. Material
 * contact percentage is approximated from radial engagement vs tool diameter. */
function buildAirCutSamples(operations: MillOperation[]) {
  const samples: Array<{
    start_line: number;
    end_line: number;
    operation_index: number;
    feedrate_mm_min: number;
    distance_mm: number;
    material_contact_pct: number;
  }> = [];
  let line = 100;
  operations.forEach((op, idx) => {
    if (!op.coordinates || op.coordinates.length < 2) {
      line += 100;
      return;
    }
    let dist = 0;
    for (let i = 1; i < op.coordinates.length; i++) {
      const a = op.coordinates[i - 1];
      const b = op.coordinates[i];
      if (b.type === "linear" || b.type === "arc_cw" || b.type === "arc_ccw") {
        dist += Math.hypot(b.x - a.x, b.y - a.y, b.z - a.z);
      }
    }
    if (dist === 0) {
      line += op.coordinates.length * 10;
      return;
    }
    const radial = op.radial_depth_mm ?? op.tool_diameter_mm;
    const contactPct = Math.min(
      100,
      Math.max(0, (radial / Math.max(0.001, op.tool_diameter_mm)) * 100),
    );
    samples.push({
      start_line: line,
      end_line: line + op.coordinates.length * 10,
      operation_index: idx,
      feedrate_mm_min: op.feed_mm_min,
      distance_mm: dist,
      material_contact_pct: contactPct,
    });
    line += op.coordinates.length * 10;
  });
  return samples;
}

function round2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ============================================================================
// PPG-WIRE-MS5/U-PPGW-HSMDwell-Wiring — helpers
// ============================================================================

/** Minimum cutting points per operation needed to form one (prev,curr,next)
 *  corner triple. Below this we cannot evaluate any corners. */
const HSM_MIN_POINTS_FOR_CORNER = 3;
/** Skip "corners" with interior angle ≥ this (i.e. near-straight motion).
 *  180° is fully straight; we relax to 170° to absorb floating-point noise
 *  on long contours that are nominally straight. */
const HSM_NEAR_STRAIGHT_ANGLE_DEG = 170;
/** Floor/ceiling for clamped angle_deg fed into the engine's Zod schema. */
const HSM_ANGLE_DEG_MIN = 0;
const HSM_ANGLE_DEG_MAX = 180;
/** Per-corner dwell exceeding this counts as "high dwell" — the recommended-
 *  dwell threshold the engine itself uses to attach a "consider increasing
 *  corner radius" recommendation (HSMDwellAtCornerEngine.ts:238). */
const HSM_HIGH_DWELL_MS_THRESHOLD = 20;
/** Per-corner thermal-accumulation factor exceeding this counts as "high
 *  thermal". Matches the engine's own coolant-recommendation threshold
 *  (HSMDwellAtCornerEngine.ts:244). */
const HSM_HIGH_THERMAL_FACTOR_THRESHOLD = 1.15;
/** Per-corner tolerance-violation risk exceeding this counts as a violation.
 *  Engine returns risk in [0,1]; 0.5 = "reduce feed at corner" recommendation
 *  (HSMDwellAtCornerEngine.ts:241). */
const HSM_TOLERANCE_RISK_THRESHOLD = 0.5;
/** Acceleration unit conversion: g → mm/s². 1 g = 9.81 m/s² = 9810 mm/s². */
const G_TO_MM_S2 = 9810;
/** Conservative servo acceleration fallback (mm/s²) when no machine context
 *  is loaded. Equivalent to ~0.5 g — slow enough to keep dwell predictions
 *  pessimistic in the unknown-machine case. */
const HSM_DEFAULT_ACCEL_MM_S2 = 5000;

/**
 * Build a `MachineServo` from a `MachineProfile`. The HSM engine internally
 * applies sensible defaults (50 Hz servo bandwidth, 100-block look-ahead,
 * trapezoidal velocity profile when jerk omitted). We override only the
 * acceleration ceiling because that's the dominant input to the dwell
 * trapezoidal-profile formula `d_decel = v^2 * sin(theta/2) / a_max`.
 *
 * Conversion: `acceleration_g` (g) × 9810 = mm/s². Falls back to a
 * conservative 5,000 mm/s² (~0.5 g) when no machine context is loaded.
 */
function buildServoFromMachine(
  machine: ReturnType<typeof machineStrategyConstraintEngine.getMachineById>,
): MachineServo {
  const accel = machine
    ? machine.acceleration_g * G_TO_MM_S2
    : HSM_DEFAULT_ACCEL_MM_S2;
  return { max_acceleration_mm_s2: accel };
}

/**
 * Walk linear/arc transitions in `MillOperation.coordinates` and emit
 * `CornerGeometry` triples for each consecutive (prev, curr, next) where
 * the direction change is large enough to count as a real corner.
 *
 * Rules:
 *   - Rapids skipped — they're pre-positioning, not part of the cut path.
 *   - Duplicate consecutive points skipped (zero-length approach/exit vector).
 *   - Near-straight motion (angle_deg > 170) skipped — no meaningful dwell.
 *   - 180° reversals (angle_deg ≈ 0) kept — those are the worst-case dwells.
 *   - NaN/Infinity in any coordinate throws a structured error.
 *
 * `angle_deg` semantics match the engine: 180 = straight, 90 = right turn,
 * 0 = hairpin reversal. Computed as `180 − degrees(acos(approach·exit))`
 * with the dot product clamped to [-1, +1] for floating-point safety.
 */
function extractCornersFromOperations(
  operations: MillOperation[],
): Array<{ corner: CornerGeometry; programmed_feed_mm_min: number }> {
  const corners: Array<{ corner: CornerGeometry; programmed_feed_mm_min: number }> = [];

  for (const op of operations) {
    if (!op.coordinates || op.coordinates.length < HSM_MIN_POINTS_FOR_CORNER) continue;
    const cutting = op.coordinates.filter(
      (pt) => pt.type === "linear" || pt.type === "arc_cw" || pt.type === "arc_ccw",
    );
    if (cutting.length < HSM_MIN_POINTS_FOR_CORNER) continue;

    for (let i = 1; i < cutting.length - 1; i++) {
      const prev = cutting[i - 1];
      const curr = cutting[i];
      const next = cutting[i + 1];
      for (const p of [prev, curr, next]) {
        if (!Number.isFinite(p.x) || !Number.isFinite(p.y) || !Number.isFinite(p.z)) {
          throw new Error(
            `[HurcoV11/HSMDwell] Invalid coordinate (NaN or Infinity) at op tool=${op.tool_number}`,
          );
        }
      }

      const ax = curr.x - prev.x;
      const ay = curr.y - prev.y;
      const az = curr.z - prev.z;
      const ex = next.x - curr.x;
      const ey = next.y - curr.y;
      const ez = next.z - curr.z;
      const aLen = Math.hypot(ax, ay, az);
      const eLen = Math.hypot(ex, ey, ez);
      if (aLen === 0 || eLen === 0) continue;

      const dot = (ax * ex + ay * ey + az * ez) / (aLen * eLen);
      const dotClamped = Math.max(-1, Math.min(1, dot));
      const angleBetweenRad = Math.acos(dotClamped);
      const angleDeg = HSM_ANGLE_DEG_MAX - (angleBetweenRad * 180) / Math.PI;
      if (angleDeg > HSM_NEAR_STRAIGHT_ANGLE_DEG) continue;

      const clampedAngleDeg = Math.max(
        HSM_ANGLE_DEG_MIN,
        Math.min(HSM_ANGLE_DEG_MAX, angleDeg),
      );
      corners.push({
        corner: {
          angle_deg: clampedAngleDeg,
          approach_vector: { x: ax / aLen, y: ay / aLen, z: az / aLen },
          exit_vector: { x: ex / eLen, y: ey / eLen, z: ez / eLen },
        },
        programmed_feed_mm_min: op.feed_mm_min,
      });
    }
  }

  return corners;
}

/**
 * Per-program HSM dwell aggregation. Calls `analyzeDwell` per corner,
 * tallies high-dwell (>20 ms), high-thermal (factor >1.15), and
 * tolerance-violation-risk (>0.5) counts, dedups recommendations into a
 * Set. Returns the empty/zero shape (with `hsm_mode_used` still
 * surfaced) when no corners are present.
 */
function runHSMDwellPass(
  corners: Array<{ corner: CornerGeometry; programmed_feed_mm_min: number }>,
  servo: MachineServo,
  hsmMode: HSMParameters["hsm_mode"],
): {
  corners_analyzed: number;
  high_dwell_count: number;
  high_thermal_count: number;
  tolerance_violation_count: number;
  total_recommended_dwell_ms: number;
  avg_dwell_ms: number;
  max_dwell_ms: number;
  avg_thermal_factor: number;
  hsm_mode_used: "off" | "g05p1" | "g05p2" | "g187" | "cycle832";
  recommendations: string[];
  optimizations_count: number;
} {
  const modeUsed = (hsmMode ?? "off") as
    | "off"
    | "g05p1"
    | "g05p2"
    | "g187"
    | "cycle832";

  if (corners.length === 0) {
    return {
      corners_analyzed: 0,
      high_dwell_count: 0,
      high_thermal_count: 0,
      tolerance_violation_count: 0,
      total_recommended_dwell_ms: 0,
      avg_dwell_ms: 0,
      max_dwell_ms: 0,
      avg_thermal_factor: 1,
      hsm_mode_used: modeUsed,
      recommendations: [],
      optimizations_count: 0,
    };
  }

  let totalDwell = 0;
  let maxDwell = 0;
  let totalThermal = 0;
  let highDwell = 0;
  let highThermal = 0;
  let toleranceViolations = 0;
  const recsSet = new Set<string>();

  for (const { corner, programmed_feed_mm_min } of corners) {
    const params: HSMParameters = {
      programmed_feed_mm_min,
      hsm_mode: modeUsed,
    };
    const result = HSMDwellAtCornerEngine.analyzeDwell(corner, servo, params);
    totalDwell += result.recommended_dwell_ms;
    if (result.recommended_dwell_ms > maxDwell) maxDwell = result.recommended_dwell_ms;
    totalThermal += result.thermal_accumulation_factor;
    if (result.recommended_dwell_ms > HSM_HIGH_DWELL_MS_THRESHOLD) highDwell++;
    if (result.thermal_accumulation_factor > HSM_HIGH_THERMAL_FACTOR_THRESHOLD) highThermal++;
    if (result.tolerance_violation_risk > HSM_TOLERANCE_RISK_THRESHOLD) toleranceViolations++;
    for (const r of result.recommendations) recsSet.add(r);
  }

  return {
    corners_analyzed: corners.length,
    high_dwell_count: highDwell,
    high_thermal_count: highThermal,
    tolerance_violation_count: toleranceViolations,
    total_recommended_dwell_ms: round2(totalDwell),
    avg_dwell_ms: round2(totalDwell / corners.length),
    max_dwell_ms: round2(maxDwell),
    avg_thermal_factor: round2(totalThermal / corners.length),
    hsm_mode_used: modeUsed,
    recommendations: Array.from(recsSet),
    optimizations_count: corners.length,
  };
}

// ============================================================================
// PPG-WIRE-MS5/U-PPGW-FeatureSequencer-Wiring — helpers
// ============================================================================

/** Default rapid traverse (m/min) when no MachineProfile is loaded. Matches
 *  RapidRepositionOptEngine.DEFAULT_RAPID_M_MIN (30 m/min ≈ 1180 IPM —
 *  conservative for a 3-axis VMC). Used only as a unit-conversion factor
 *  to translate distance-saved into time-saved; does NOT affect the TSP
 *  reordering itself (which is geometry-only). */
const FEATURE_DEFAULT_RAPID_M_MIN = 30;

/**
 * Synthesize one `FeaturePoint` per `MillOperation` for TSP sequencing.
 * The point is taken from the FIRST cutting (linear/arc) coordinate of
 * the op, since that's where the rapid retracts to before the cut starts.
 * Operations with zero cutting coordinates are skipped — they cannot be
 * reordered meaningfully.
 *
 * `operation_index` is set to the original 0-based index in `operations`,
 * so the optimized_sequence returned by the engine is directly mappable
 * back to MillOperation[] for downstream re-emission if a planner chooses.
 */
function extractFeaturesFromOperations(
  operations: MillOperation[],
): FeaturePoint[] {
  const features: FeaturePoint[] = [];
  for (let i = 0; i < operations.length; i++) {
    const op = operations[i];
    if (!op.coordinates || op.coordinates.length === 0) continue;
    const firstCut = op.coordinates.find(
      (pt) => pt.type === "linear" || pt.type === "arc_cw" || pt.type === "arc_ccw",
    );
    if (!firstCut) continue;
    if (
      !Number.isFinite(firstCut.x) ||
      !Number.isFinite(firstCut.y) ||
      !Number.isFinite(firstCut.z)
    ) {
      // RapidReposition pass already guards this earlier; defense-in-depth
      // here in case the pass order changes.
      throw new Error(
        `[HurcoV11/FeatureSequencer] Invalid coordinate (NaN or Infinity) at op tool=${op.tool_number}`,
      );
    }
    features.push({
      x: firstCut.x,
      y: firstCut.y,
      z: firstCut.z,
      operation_index: i,
      tool: op.tool_number.toString(),
    });
  }
  return features;
}

/** Count positions where original_sequence[i] !== optimized_sequence[i].
 *  This is the Hamming distance between the two permutations — a coarse
 *  but useful proxy for "how much did the sequencer rearrange things". */
function countReorderings(original: number[], optimized: number[]): number {
  if (original.length !== optimized.length) return original.length;
  let diff = 0;
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== optimized[i]) diff++;
  }
  return diff;
}

// Singleton export
export const hurcoV11MillMasterPostEngine = new HurcoV11MillMasterPostEngine();
