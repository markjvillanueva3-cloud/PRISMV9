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

export interface MillOperation {
  operation_type: "face" | "pocket" | "contour" | "drill" | "tap" | "bore" | "slot" | "3d_surface" | "adaptive";
  tool_number: number;
  tool_diameter_mm: number;
  tool_flutes: number;
  tool_description?: string;
  material_iso: ISOGroup;
  spindle_rpm: number;
  feed_mm_min: number;
  axial_depth_mm: number;
  radial_depth_mm?: number;
  coolant?: "flood" | "mist" | "tsc" | "off";
  coordinates: Array<{ x: number; y: number; z: number; type: "rapid" | "linear" | "arc_cw" | "arc_ccw" }>;
  arc_data?: Array<{ i?: number; j?: number; k?: number; r?: number }>;
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
    tool_change_position: { x: 0, y: 0, z: 100 }
  };

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

    // UltiMotion is a Hurco WinMax CONTROL-PANEL parameter — there is no
    // inline G-code for it. The previous emission of `G187 P3` was wrong
    // (G187 is Haas dialect; V11 would parse-error on it). Now we emit a
    // comment annotation only, matching the AdvancedPostProcessorEngine
    // hurco-controller dialect row (PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring).
    // The operator must verify UltiMotion + Smoothing Tolerance in the
    // WinMax UI before run-up.
    if (cfg.use_ultimotion) {
      gcode.push("(HURCO V11 UltiMotion: enable in WinMax UI - Settings → Performance → UltiMotion ON, Smoothing Tolerance ~0.005mm for finish)");
      tribalTipsApplied.push("UltiMotion intent recorded as comment annotation (Hurco V11 has no inline UltiMotion G-code)");
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

      gcode.push("");
      gcode.push(`(OPERATION ${i + 1}: ${op.operation_type.toUpperCase()})`);

      // Physics checks
      const checks = this.performPhysicsChecks(effectiveOp, gcode.length);
      physicsChecks.push(...checks);
      const failedChecks = checks.filter(c => !c.passed);
      if (failedChecks.length > 0) {
        warnings.push(...failedChecks.map(c => `Line ${c.line}: ${c.check}`));
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
      tribal_tips_applied: tribalTipsApplied
    };
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
    lines.push(`G${cfg.work_offset} (WORK OFFSET)`);

    return lines;
  }

  /**
   * Generate tool change sequence
   */
  private generateToolChange(op: MillOperation, cfg: HurcoPostConfig): string[] {
    const lines: string[] = [];
    const tcp = cfg.tool_change_position!;

    lines.push(`G91 G28 Z0 (Z RETRACT)`);
    lines.push(`T${op.tool_number} M06 (${op.tool_description || `TOOL ${op.tool_number}`})`);
    lines.push(`G43 H${op.tool_number} (TOOL LENGTH COMP)`);

    return lines;
  }

  /**
   * Generate spindle start with appropriate dwell
   */
  private generateSpindleStart(op: MillOperation, cfg: HurcoPostConfig, blockId?: string): string[] {
    const lines: string[] = [];

    // U-PPGM13: emit a labelled block carrying both S and F so the
    // sidecar gate (verifyBlockAnnotations) can cross-check both. The
    // label MUST match the corresponding entry in block_annotations[].
    // F is technically a feed word; setting it here is modal — first
    // motion command after this block uses the established feed.
    const label = blockId ? `${blockId} ` : "";
    lines.push(
      `${label}S${op.spindle_rpm} M03 F${op.feed_mm_min} (SPINDLE CW ${op.spindle_rpm} RPM, FEED ${op.feed_mm_min})`,
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
   * Perform physics checks on operation
   */
  private performPhysicsChecks(op: MillOperation, startLine: number): HurcoPostOutput["physics_checks"] {
    const checks: HurcoPostOutput["physics_checks"] = [];

    // Cutting speed check
    const Vc = (Math.PI * op.tool_diameter_mm * op.spindle_rpm) / 1000;
    const maxVc = this.getMaxCuttingSpeed(op.material_iso);
    checks.push({
      line: startLine,
      check: `Cutting speed ${Vc.toFixed(0)} m/min vs max ${maxVc} m/min for ISO ${op.material_iso}`,
      passed: Vc <= maxVc * 1.2,
      value: Vc,
      limit: maxVc
    });

    // Chip load check
    const fz = op.feed_mm_min / (op.spindle_rpm * op.tool_flutes);
    const minFz = 0.02;
    const maxFz = op.material_iso === "N" ? 0.25 : 0.15;
    checks.push({
      line: startLine,
      check: `Chip load ${fz.toFixed(3)} mm/tooth (range ${minFz}-${maxFz})`,
      passed: fz >= minFz && fz <= maxFz,
      value: fz,
      limit: maxFz
    });

    // Depth of cut check (Kienzle force consideration)
    // Fc = kc1_1 * ap * fz^(1 - mc) — Sandvik Coromant General Turning (2024), ISO 3685
    const kienzle = CANONICAL_KIENZLE[op.material_iso];
    const Fc = kienzle.kc1_1 * op.axial_depth_mm * Math.pow(fz, 1 - kienzle.mc);
    const maxForce = 2000; // N, rough limit for VMX24
    checks.push({
      line: startLine,
      check: `Cutting force ${Fc.toFixed(0)} N vs machine limit ${maxForce} N`,
      passed: Fc <= maxForce,
      value: Fc,
      limit: maxForce
    });

    // Spindle speed check
    const maxRpm = 10000; // VMX24 spindle max
    checks.push({
      line: startLine,
      check: `Spindle ${op.spindle_rpm} RPM vs max ${maxRpm} RPM`,
      passed: op.spindle_rpm <= maxRpm,
      value: op.spindle_rpm,
      limit: maxRpm
    });

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
      physics_checks: 4,
      features: [
        "UltiMotion high-speed mode",
        "G65 conversational macros",
        "Kienzle force validation",
        "Taylor tool life integration",
        "JM Die tribal knowledge",
        "Renishaw probe support"
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
