/**
 * OkumaOSPMillMasterPostEngine — Okuma OSP-P300M / OSP-P500M Mill Master Post
 *
 * Closes the OSP-P*M HARD-REJECT branch in master_post_by_machine
 * (camDispatcher.ts:5444-5454, U-PPGW12) by providing the long-pending
 * Okuma-mill emission path. Mirror of HurcoV11MillMasterPostEngine —
 * same `MillOperation` shape, same `BlockAnnotation[]` flow established
 * by U-PPGM13/M14, same Kienzle/Taylor physics gate.
 *
 * MACHINE TARGETS:
 *   - Okuma MB-V series (3-axis VMC) on OSP-P300M
 *   - Okuma MU-V series (5-axis VMC) on OSP-P500M
 *   - Genos M-series (entry mill) on OSP-P300M
 *
 * OSP-P*M DIALECT (sourced from ControllerDialectEngine.dialects, NOT
 * hardcoded — single source of truth):
 *   - Work offset: G15 H1 (vs Fanuc G54)
 *   - Tool change: T{n} on its own line, then M6 (two-line)
 *   - Canned cycles: G81 (drill), G83 (peck), G73 (deep), G84 (tap),
 *     G85 (bore/ream), G87 (back-bore), G80 (cancel)
 *   - Probing: G65 P88xx series (P8810 datum, P8811 surface/corner,
 *     P8812 bore/boss, P8823 tool length)
 *   - Sub-program: M98 P{num} / M99 return
 *   - Comments: parentheses, mandatory decimal point
 *   - Arcs: IJK incremental
 *   - P500-only: Super-NURBS (G05.1 Q1), 5-axis TCPC (G43.5)
 *
 * BLOCK ANNOTATION FLOW (PPG-WIRE-MS0/U-PPGM13 contract):
 *   For each operation we emit a labelled spindle-start block of the form
 *     `N{100+i*10} S{rpm} M3 F{feed} (...)`
 *   and push a matching `BlockAnnotation` onto `output.block_annotations`.
 *   Caller (typically camDispatcher) threads the array into
 *   `sealMasterPostOutput` which seals a v1.1.0 sidecar and (optionally)
 *   runs `verifyBlockAnnotations` at a chosen tier.
 *
 * Physics constants are imported from `physics/constants.ts`. No inlining
 * of kc1_1, mc, Taylor C/n, or any material/tool literals — enforced by
 * the magic-number-detector hook.
 *
 * @milestone PPG-WIRE-MS5/U-PPGW-OkumaMill
 */

import { log } from "../utils/Logger.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  type ISOGroup,
} from "../physics/constants.js";
import type { BlockAnnotation } from "../schemas/postPhysicsSidecarSchema.js";
import { controllerDialectEngine } from "./ControllerDialectEngine.js";
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
 * Controller='okuma' table row carries OSP-correct codes (G08 P1, G06.2 NURBS,
 * G43.4 H#1 RTCP). multi_axis force-skipped on P300 (3-axis MB-V family).
 */
export interface AdvancedPostFeaturesConfig {
  adaptive_clearing?: AdaptiveClearingConfig;
  hsm?: HSMConfig;
  tool_management?: ToolManagementConfig;
  in_process_measure?: InProcessMeasureConfig;
  feed_optimization?: FeedOptimizationConfig;
  multi_axis?: MultiAxisConfig;
}

/** Map ISO machinability group → coarse material name accepted by AutoSpeedFeed. */
const ISO_GROUP_TO_AUTO_SF_MATERIAL: Record<ISOGroup, string> = {
  P: "steel",
  M: "stainless_steel",
  K: "cast_iron",
  N: "aluminum",
  S: "superalloy",
  H: "hardened_steel",
};

/** Map MachineCapabilities.rigidity_class → AutoSpeedFeedInput.machine_rigidity (3-band). */
function rigidityToAutoSF(r: string | undefined): "low" | "medium" | "high" {
  if (r === "low") return "low";
  if (r === "ultra_high" || r === "high") return "high";
  return "medium";
}

// ============================================================================
// TYPES
// ============================================================================

export type OSPFamily = "P300" | "P500";

/** Tool-length compensation emission mode.
 * - `G43_H`  — Fanuc-style `G43 H{tool}` (engine default; matches OSP defaults)
 * - `G56_HA` — Okuma OSP-MA-H native call `G56 HA` (single static call, no tool#)
 *   Source: hyperMILL post `OSPM_MT_TabAC_MUx_R01w_E03.def:50` toollength_comp_on
 */
export type ToolLengthCompMode = "G43_H" | "G56_HA";

/** Super-NURBS / nano-smoothing emission code.
 * - `G05.1_Q1` — older OSP-P*M manual / generic mill (engine default)
 * - `G131`     — Okuma Genos M460V on OSP-P300MA-H (current JM Die standard)
 *   Source: PRISM-modified Fusion post `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:99`
 */
export type SuperNurbsCode = "G05.1_Q1" | "G131";

/** 5-axis tool centerpoint management emission mode.
 * - `G43.4`     — Fanuc-style TCP (engine default)
 * - `G169_G170` — Okuma OSP-P*M native TCP control: G169 on, G170 off
 *   Source: PRISM-modified Fusion post `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:47,515`
 */
export type TCPMode = "G43.4" | "G169_G170";

export interface OkumaOSPMillPostConfig {
  program_number: number;
  program_comment?: string;
  /** P300 → OSP-P300M (3-axis MB-V), P500 → OSP-P500M (5-axis MU-V). */
  osp_family: OSPFamily;
  /** Enable Super-NURBS nano-smoothing (P500 only — ignored on P300). Code emitted is governed by `super_nurbs_code`. */
  use_super_nurbs?: boolean;
  /** Super-NURBS emission code. Default `G05.1_Q1`. JM Die Genos M460V uses `G131`. */
  super_nurbs_code?: SuperNurbsCode;
  /** 5-axis TCP emission mode. Default `G43.4` (Fanuc-style). JM Die uses `G169_G170` (Okuma native). */
  tcp_mode?: TCPMode;
  /** Tool-length compensation emission. Default `G43_H`. JM Die uses `G56_HA`. */
  tool_length_comp_mode?: ToolLengthCompMode;
  /** Zero-pad N-line numbers to this width (e.g. 4 → `N0100`). Default 0 = unpadded `N100`.
   *  JM Die hyperMILL post specifies `N_x_format = "N%04ld"` (4-digit zero-pad). */
  n_number_pad_digits?: number;
  coolant_mode?: "flood" | "mist" | "tsc" | "off";
  /** H index used in `G15 H{n}` work-offset call. Default 1. JM Die uses 15 for 3-axis, 25 for 5-axis. */
  work_offset_index?: number;
  units?: "metric" | "inch";
  safe_z_mm?: number;
  tool_change_position?: { x: number; y: number; z: number };
  /** Override default spindle ceiling. Default: 12 000 RPM (P300) / 15 000 RPM (P500). */
  max_spindle_rpm?: number;
  /** Emit `CALL OO88 ... PP={fixture_offset_wcs}` + `G15 H{fixture_offset_wcs}` macro
   *  preamble before each 5-axis (3d_surface / adaptive) operation on P500.
   *  Default `false` = skip (3-axis flows + Fusion-style TCPM emission unchanged).
   *  Source: PRISM-modified Fusion post `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:2333-2347`. */
  use_call_oo88?: boolean;
  /** WCS slot reserved for the OO88 fixture-offset macro output. Default 51.
   *  HARD-RESERVED: the engine throws if `work_offset_index === fixture_offset_wcs`
   *  (operator must never assign the macro slot manually — matches `.cps:2953-2954`). */
  fixture_offset_wcs?: number;
  /** Enable post-emission advanced-pipeline pass. When true, `generateProgramAdvanced()`
   *  threads the base G-code through `autoSpeedFeedEngine.optimize()` for chip-thinning,
   *  corner deceleration, and physics-aware S/F per cutting line. Default false (the
   *  sync `generateProgram()` path is unchanged). */
  use_advanced_features?: boolean;
  /** Machine id from `MachineStrategyConstraintEngine` (e.g. `jmdie_okuma_genos_m460v_5ax`)
   *  used to load the compounding capability context (rigidity, ways, spindle, taper)
   *  fed to the AutoSpeedFeed optimizer. */
  machine_id?: string;
  /** Aggressiveness for the AutoSpeedFeed pass. 0.0 (conservative) → 1.0 (push limits).
   *  Default 0.5. Ignored unless `use_advanced_features` is true. */
  advanced_aggressiveness?: number;
  /** Opt-in AdvancedPostProcessor pass (PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring).
   *  multi_axis force-skipped on P300 (3-axis); pushed warning surfaces. */
  advanced_post?: AdvancedPostFeaturesConfig;
}

/**
 * JM Die Company production preset for the Okuma Genos M460V-5AX
 * (OSP-P300MA-H control). Activates the shop's house conventions:
 *
 * | Field                    | JM Die value | Source                                                                                |
 * |--------------------------|--------------|---------------------------------------------------------------------------------------|
 * | `work_offset_index`      | 15           | `OSPM_MT_TabAC_MUx_R01w_E03.def:18`  (`workoffset := "S:15"`)                         |
 * | `tool_length_comp_mode`  | `G56_HA`     | `OSPM_MT_TabAC_MUx_R01w_E03.def:50`  (`toollength_comp_on := "S:G56 HA"`)             |
 * | `super_nurbs_code`       | `G131`       | `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:99` (`Super NURBS smoothing (G131)`)    |
 * | `tcp_mode`               | `G169_G170`  | `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:47,515`                                  |
 * | `n_number_pad_digits`    | 4            | `OSPM_MT_TabAC_MUx_R01w_E03.def:118` (`N_x_format := "S:N%04ld"`)                     |
 * | `osp_family`             | `P300`       | `.cps:99`  (Genos M460V ships with OSP-P300MA-H, not P500)                            |
 *
 * Both source posts are cross-validated: any field the .cps and .def disagree
 * on uses the .cps value (live PRISM-modified post in active production). The
 * .def file is from 2023; the .cps reflects the v8.9.x evolution including
 * iMachining adaptive integration.
 *
 * Spread onto user config: `engine.generateProgram(ops, { ...JM_DIE_PRESET, program_number: 1234 })`.
 */
export const JM_DIE_PRESET: Partial<OkumaOSPMillPostConfig> = {
  osp_family: "P300",
  work_offset_index: 15,
  tool_length_comp_mode: "G56_HA",
  super_nurbs_code: "G131",
  tcp_mode: "G169_G170",
  n_number_pad_digits: 4,
  use_call_oo88: true,
  fixture_offset_wcs: 51,
};

export interface MillOperation {
  operation_type:
    | "face"
    | "pocket"
    | "contour"
    | "drill"
    | "tap"
    | "bore"
    | "slot"
    | "3d_surface"
    | "adaptive";
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
  coordinates: Array<{
    x: number;
    y: number;
    z: number;
    type: "rapid" | "linear" | "arc_cw" | "arc_ccw";
  }>;
  arc_data?: Array<{ i?: number; j?: number; k?: number; r?: number }>;
  /** Indexed A-axis (table tilt) angle in degrees. Used by the CALL OO88
   *  fixture-offset macro on P500 5-axis ops. Default 0 = horizontal table.
   *  Genos M460V trunnion travel: [-110°, +10°]. */
  rotary_a_deg?: number;
  /** Indexed C-axis (table rotation) angle in degrees. Default 0. */
  rotary_c_deg?: number;
}

export interface AdvancedPipelineSummary {
  /** AutoSpeedFeedEngine post-pass results — non-null when feature ran. */
  auto_speed_feed: {
    lines_modified: number;
    tools_processed: number;
    avg_feed_change_pct: number;
    time_savings_pct: number;
    chip_thinning_adjustments: number;
    corner_decelerations: number;
  } | null;
  /** Machine context loaded from MachineStrategyConstraintEngine. */
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
   *  byte-identical and operation order is NOT mutated. */
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
  /** AdvancedPostProcessor pass output (PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring). */
  advanced_post: {
    controller_used: "okuma";
    requested_features: string[];
    enhancements_applied: string[];
    warnings: string[];
    estimated_time_savings_pct: number;
    output_lines: number;
  } | null;
}

/**
 * HURCO-VM30I-FULL-PSN-MS0/MS1 (echo iter18 2026-05-25) — PSN enrichment
 * payload for the Okuma OSP master post (mirrors HurcoPSNEnrichment shape
 * so cross-vendor reporters can consume both via a structural typecheck).
 *
 * Populated only by `generateProgramWithFullPSN()`; the legacy synchronous
 * `generateProgram()` leaves `psn_enrichment` undefined so all existing
 * Okuma test files stay byte-identical. Each substrate sub-field is
 * independent + best-effort: a single PSN-substrate failure never blocks
 * the rest of the enrichment (fail-soft, advisory-only — engine NEVER
 * throws from a substrate; throw means the caller hit the legacy WCS
 * collision gate, which is shared with `generateProgram()`).
 */
export interface OkumaOSPMillPSNEnrichment {
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
  /** Cost report (per-part labor + machine + overhead). First-order estimate
   *  derived from runtime + shop_rates; deep CostEfficiencyBridge routing
   *  is reserved for future composition (HURCO-VM30I-FULL-PSN-MS1+). */
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

export interface OkumaOSPMillPostOutput {
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
  /** Advanced-pipeline output — populated only when `generateProgramAdvanced` is called
   *  with `use_advanced_features: true`. Sync `generateProgram()` returns null here. */
  advanced_features_applied?: string[];
  /** Optimized G-code emitted by AutoSpeedFeed when advanced pipeline ran. Otherwise null. */
  optimized_gcode?: string[] | null;
  /** Per-engine advanced summary. Null when advanced pipeline did not run. */
  advanced_summary?: AdvancedPipelineSummary | null;
  /**
   * Per-block S/F annotations (schema 1.1.0). One entry per operation,
   * keyed by the Nxxx label emitted on the spindle-start line. Caller
   * passes verbatim to `sealMasterPostOutput` for sidecar+verify.
   */
  block_annotations: BlockAnnotation[];
  /**
   * PSN-substrate enrichment (HURCO-VM30I-FULL-PSN-MS0/MS1, echo iter18).
   * Populated ONLY by `generateProgramWithFullPSN()`. Legacy
   * `generateProgram()` leaves it undefined so existing callers stay
   * byte-identical (no existing Okuma test file is touched by this field).
   */
  psn_enrichment?: OkumaOSPMillPSNEnrichment;
}

// ============================================================================
// TRIBAL KNOWLEDGE — OKUMA OSP-P*M
// ============================================================================
//
// 22-tip pool merging two authoritative sources from the JM Die archive
// (8 legacy + 14 new mined from the JM Die hyperMILL .def and Fusion .cps):
//   1. hyperMILL post .def — `OSPM_MT_TabAC_MUx_R01w_E03.def` (OPEN MIND
//      hyperPOST 2021.2, Okuma Genos M460V-5AX OSP, dated Oct 2023). The
//      post-processor configuration shipped to JM Die's hyperMILL CAM seat.
//   2. PRISM-modified Fusion 360 / Inventor CAM .cps —
//      `OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps` (Autodesk HSM post,
//      v8.9.x, ~5 000 lines including iMachining adaptive integration,
//      OSP-P300MA-H control specific). Live in production.
//
// Where the two posts disagree, the .cps wins (newer + currently used).
// Examples of corrections: M51 is COOLANT_THROUGH_TOOL not coolant2; M12
// is COOLANT_AIR (air blast) not TSC; A-axis travel is [-110, +10] not
// [-110, +20]; Super-NURBS is G131 (Genos M460V via OSP-MA-H) not G05.1 Q1.
//
// Each tip carries a `source` citation so the engine can surface provenance
// during emission (`tribal_tips_applied` list) and so a shop-floor reader
// can grep back to the .def/.cps line that justified the rule.

interface OkumaMillTip {
  category: string;
  tip: string;
  applies_to: string[];
  iso_group?: ISOGroup;
  osp_family?: OSPFamily;
  confidence: number;
  /** Provenance: `<file>:<line>` or short citation. Optional for legacy tips. */
  source?: string;
}

const OKUMA_OSP_MILL_TRIBAL_KNOWLEDGE: OkumaMillTip[] = [
  // --- existing tips (Okuma manual + lathe-side cross-reference) -------------
  {
    category: "work_offset",
    tip: "Use G15 H1 for primary work offset; G15 H2..H99 for multi-part. P300 supports 48 offsets, P500 supports 99 — see ControllerDialect.features.work_offset_count",
    applies_to: ["all"],
    confidence: 0.95,
    source: "OSP-P300/P500 programming manual §4.2",
  },
  {
    // Informational hint surfaced whenever a P500 receives a 3d_surface or
    // adaptive op. Distinct from the `[super_nurbs]` confirmation pushed
    // by the emission path so tests can tell "tip available" apart from
    // "feature actually fired".
    category: "super_nurbs_hint",
    tip: "P500: enable Super-NURBS smoothing for 3D surfaces. Code is G05.1 Q1 (generic) or G131 (Genos M460V on OSP-P300MA-H). Cancel before drilling/tapping",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.93,
    source: "OSP manual §6.1 + cps:99",
  },
  {
    category: "tool_change",
    tip: "OSP-P*M tool change is two-line: `T{n}` to load, then `M6` to swap. Combining (`T{n} M6`) is rejected by some firmware revisions — keep them on separate lines",
    applies_to: ["all"],
    confidence: 0.96,
    source: "OSP manual §3.4 + .cps section header",
  },
  {
    category: "probing",
    tip: "Renishaw probing on OSP uses G65 P8810 (datum), P8811 (surface/corner Z), P8812 (bore/boss). Different macro IDs from Fanuc P9810-series — do NOT carry Fanuc programs across",
    applies_to: ["all"],
    confidence: 0.92,
    source: "OSP manual §8.1 (Renishaw macro pack)",
  },
  {
    category: "rigid_tap",
    tip: "G84 with feed = pitch × RPM is rigid-tap on OSP — controller auto-syncs spindle/feed. No M29 mode-switch needed (unlike Fanuc)",
    applies_to: ["tap"],
    confidence: 0.94,
    source: "OSP manual §5.7",
  },
  {
    category: "feed_units",
    tip: "OSP-P*M defaults to G94 (feed/min). Drill/tap canned cycles use feed/min as well — do NOT switch to G95 mid-program; some OSP firmware keeps F modally and silently mis-feeds",
    applies_to: ["drill", "tap", "bore"],
    confidence: 0.91,
    source: "OSP manual §5.3 + .def F_mode_tapping:1",
  },
  {
    category: "hardened",
    tip: "D2 above 58 HRC: 150 SFM max, 0.001\" IPT, light DOC (0.010\"), fresh carbide. Same as Hurco — material physics, not controller",
    applies_to: ["contour", "3d_surface"],
    iso_group: "H",
    confidence: 0.94,
    source: "Sandvik general turning + JM Die D2 jobs",
  },
  {
    category: "aluminum",
    tip: "6061-T6 on Okuma mill: 500+ SFM, 0.004\" chipload, climb mill only — high spindle taper rigidity (BBT-40/HSK-A63 on MU-V) handles 800+ SFM cleanly",
    applies_to: ["pocket", "contour", "adaptive"],
    iso_group: "N",
    confidence: 0.95,
    source: "Kennametal cutting data + JM Die 6061 jobs",
  },

  // --- new tips mined from JM Die hyperMILL .def -----------------------------
  {
    category: "jm_die_workoffset",
    tip: "JM Die starts work offsets at G15 H15 (3-axis) and G15 H25 (5-axis simultaneous). H51 is RESERVED for the CALL OO88 fixture-offset macro — never assign H51 manually",
    applies_to: ["all"],
    confidence: 0.97,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:18,99 + cps:889,2953",
  },
  {
    category: "jm_die_tool_length",
    tip: "JM Die emits `G56 HA` (single static call) for tool-length compensation, NOT `G43 H{tool}`. The `HA` register is the active-tool length set by Okuma's tool-length-measure cycle. Use `JM_DIE_PRESET` config to enable",
    applies_to: ["all"],
    confidence: 0.96,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:50",
  },
  {
    category: "jm_die_n_format",
    tip: "JM Die hyperMILL post zero-pads N-numbers to 4 digits (`N0100`, `N0110`, ...). Set `n_number_pad_digits: 4` to match. Block annotations stay in sync via the same formatter",
    applies_to: ["all"],
    confidence: 0.95,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:118 (N_x_format)",
  },
  {
    category: "jm_die_program_end",
    tip: "Final M-code is M30 (program end + rewind). Genos M460V will not auto-rewind on M02 — always use M30",
    applies_to: ["all"],
    confidence: 0.99,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:27",
  },
  {
    category: "jm_die_brake_codes",
    tip: "5-axis indexed positioning: A-axis (R1) clamp/unclamp = M10/M11; C-axis (R2) clamp/unclamp = M26/M27. Always clamp before any cut, unclamp before next index move",
    applies_to: ["3d_surface", "contour", "adaptive"],
    osp_family: "P500",
    confidence: 0.95,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:28-31",
  },
  {
    category: "jm_die_boring_cycle",
    tip: "Boring uses G86 (feed-in / dwell / rapid-out, no shift). Fine boring uses G76 with shift Q0.1\" — the small Q-shift prevents the insert from kissing the bore wall on retract",
    applies_to: ["bore"],
    confidence: 0.94,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:83-84",
  },
  {
    category: "jm_die_tap_cycle",
    tip: "Tapping cycle pair G74 (left-hand) / G84 (right-hand) is the JM Die default. Both invoke rigid tap on OSP-P*M — no M29 mode switch (Fanuc holdover)",
    applies_to: ["tap"],
    confidence: 0.94,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:85",
  },
  {
    category: "jm_die_tilt_5x",
    tip: "JM Die's hyperMILL post emits 5-axis as TILT-ANGLES, not TCPM. Operator manually drives A/C with G15 work-offset baked into part zero. The `tcp_mode: 'G169_G170'` config switches to TCP for Fusion-style adaptive jobs",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.93,
    source: "OSPM_MT_TabAC_MUx_R01w_E03.def:102 (5X_output_mode:tilt_angles)",
  },

  // --- new tips mined from JM Die PRISM-modified Fusion .cps ------------------
  {
    category: "jm_die_control_variant",
    tip: "JM Die's Genos M460V ships with OSP-P300MA-H control (Mill-Advanced-High-precision), not generic P300M. The 'A' enables iMachining variable-feed; the 'H' enables G08 P1 high-precision mode and G131 Super-NURBS",
    applies_to: ["all"],
    osp_family: "P300",
    confidence: 0.97,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:99",
  },
  {
    category: "jm_die_tcp",
    tip: "5-axis TCP control on the Genos M460V uses G169 (TCP on) / G170 (TCP off), NOT Fanuc-style G43.4. With `tcp_mode: 'G169_G170'` the engine emits the Okuma-native pair",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.96,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:47,515",
  },
  {
    category: "jm_die_super_nurbs",
    tip: "On OSP-P300MA-H, Super-NURBS is `G131` (NOT G05.1 Q1). The OSP-MA-H firmware exposes the G131 alias for nano-smoothing. With `super_nurbs_code: 'G131'` the engine emits the correct token. G05.1 Q1 still works as a fallback on plain P300M",
    applies_to: ["3d_surface", "adaptive"],
    confidence: 0.95,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:99",
  },
  {
    category: "jm_die_high_precision",
    tip: "G08 P1 enables OSP-MA-H high-precision mode — tightens look-ahead window and reduces corner radius blending. JM Die wraps full 5-axis adaptive ops in G08 P1 ... G08 P0",
    applies_to: ["3d_surface", "adaptive"],
    confidence: 0.93,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:27,442",
  },
  {
    category: "jm_die_coolant_canon",
    tip: "Authoritative coolant map (per Fusion .cps overrides older .def): M8=flood, M7=mist, M51=coolant-through-tool (TSC), M12=air blast (NOT TSC), M339=air-through-tool (MQL), M8+M51=flood+TSC combined, M9=off",
    applies_to: ["all"],
    confidence: 0.96,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:798-806",
  },
  {
    category: "jm_die_a_axis_range",
    tip: "Genos M460V trunnion A-axis travel is [-110°, +10°] (per current .cps). The .def file historically listed +20° — the .cps reflects the current physical limit after MU500 trunnion calibration",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.95,
    source: "cps:1095,1109,1122 (overrides def:122-123)",
  },
  {
    category: "jm_die_call_oo88",
    tip: "5-axis fixture-offset macro `CALL OO88 PX=0 PY=0 PZ=0 PA={a} PC={c} PH={user_offset} PP=51` followed by `G15 H51` — rewrites WCS 51 in-place from the operator's input H-offset and the indexed A/C angles. WCS 51 is HARD-RESERVED: the engine throws if user assigns work_offset_index === 51",
    applies_to: ["3d_surface", "adaptive"],
    osp_family: "P500",
    confidence: 0.96,
    source: "OKUMA-M460V-5AX-Ai Enhanced-(iMachining).cps:2333-2347,2953-2954 + .def:95 (PLANE:CALL_OO88)",
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class OkumaOSPMillMasterPostEngine {
  private readonly defaultConfig: OkumaOSPMillPostConfig = {
    program_number: 1000,
    osp_family: "P300",
    use_super_nurbs: false,
    coolant_mode: "flood",
    work_offset_index: 1,
    units: "metric",
    safe_z_mm: 50,
    tool_change_position: { x: 0, y: 0, z: 100 },
  };

  /**
   * Generate a complete Okuma OSP-P*M G-code program.
   *
   * @param operations one or more MillOperation entries
   * @param config     optional overrides (merged onto defaults)
   * @returns          gcode + sidecar-ready block_annotations + physics report
   */
  generateProgram(
    operations: MillOperation[],
    config?: Partial<OkumaOSPMillPostConfig>,
  ): OkumaOSPMillPostOutput {
    const cfg: OkumaOSPMillPostConfig = { ...this.defaultConfig, ...config };

    // WCS-51 reservation guard — the OO88 macro recalculates the offset stored
    // in `fixture_offset_wcs` (default 51) every time it fires. If the operator
    // also uses that same H-slot for normal work, the macro silently overwrites
    // their setup. Mirrors the .cps:2953-2954 self-check.
    const fixtureWcs = cfg.fixture_offset_wcs ?? 51;
    if (cfg.use_call_oo88 && (cfg.work_offset_index ?? 1) === fixtureWcs) {
      throw new Error(
        `OkumaOSPMill: work_offset_index=${cfg.work_offset_index} collides with fixture_offset_wcs=${fixtureWcs}. ` +
          `WCS ${fixtureWcs} is reserved for the CALL OO88 macro output — pick a different work_offset_index.`,
      );
    }

    const dialectId = cfg.osp_family === "P500" ? "okuma_osp_p500" : "okuma_osp_p300";
    const dialect = controllerDialectEngine.getDialect(dialectId);

    const gcode: string[] = [];
    const warnings: string[] = [];
    const physicsChecks: OkumaOSPMillPostOutput["physics_checks"] = [];
    const tribalTipsApplied: string[] = [];
    const toolsUsed = new Set<number>();

    log.info(
      `[OkumaOSPMill] Generating program O${cfg.program_number} on ${dialect.display_name} with ${operations.length} operations`,
    );

    // Header — parentheses comments per dialect (comment_open/comment_close)
    gcode.push(`O${cfg.program_number} ${this.fmtComment(dialect, cfg.program_comment ?? "PRISM GENERATED")}`);
    gcode.push(this.fmtComment(dialect, `MACHINE: OKUMA OSP-${cfg.osp_family}M`));
    gcode.push(this.fmtComment(dialect, `GENERATED: ${new Date().toISOString()}`));
    gcode.push("");

    // Safe start (dialect-driven: G90 G21 G17 G40 G80)
    gcode.push(this.fmtComment(dialect, "SAFE START"));
    gcode.push(cfg.units === "inch" ? "G20" : "G21");
    gcode.push(dialect.safe_start);

    // Work offset: G15 H{n}
    const offsetIdx = cfg.work_offset_index ?? 1;
    gcode.push(
      `${dialect.work_offsets.format.replace("{n}", String(offsetIdx))} ${this.fmtComment(dialect, "WORK OFFSET")}`,
    );

    // Super-NURBS (P500 only)
    if (cfg.use_super_nurbs && cfg.osp_family === "P500" && dialect.features.hsc_mode) {
      // Super-NURBS open — honor `super_nurbs_code` config.
      // Default uses dialect.features.hsc_mode.on (`G05.1 Q1`). JM Die's
      // OSP-P300MA-H Genos M460V uses the OSP-MA-H native alias `G131 P1`.
      const nurbsOn = cfg.super_nurbs_code === "G131"
        ? "G131 P1"
        : dialect.features.hsc_mode.on;
      gcode.push(`${nurbsOn} ${this.fmtComment(dialect, "SUPER-NURBS / HSC ON")}`);
      tribalTipsApplied.push(
        cfg.super_nurbs_code === "G131"
          ? "[jm_die_super_nurbs] G131 P1 emitted (OSP-P300MA-H native nano-smoothing)"
          : "[super_nurbs] P500 Super-NURBS enabled for high-speed contour"
      );
    }

    let estimatedTime = 0;
    const blockAnnotations: BlockAnnotation[] = [];

    for (let i = 0; i < operations.length; i++) {
      const op = operations[i];
      toolsUsed.add(op.tool_number);

      gcode.push("");
      gcode.push(this.fmtComment(dialect, `OPERATION ${i + 1}: ${op.operation_type.toUpperCase()}`));

      // Physics gate
      const checks = this.performPhysicsChecks(op, gcode.length, cfg);
      physicsChecks.push(...checks);
      const failedChecks = checks.filter((c) => !c.passed);
      if (failedChecks.length > 0) {
        warnings.push(...failedChecks.map((c) => `Line ${c.line}: ${c.check}`));
      }

      // Tool change — dialect.tool_change_sequence is two-line on Okuma
      gcode.push("G91 G28 Z0");
      for (const line of dialect.tool_change_sequence) {
        gcode.push(line.replace("{tool}", String(op.tool_number)));
      }
      // Tool-length compensation — honor `tool_length_comp_mode` config.
      // Default `G43_H` matches OSP-P*M generic emission. JM Die's hyperMILL
      // post specifies `G56 HA` (single static call against active-tool
      // length register set by Okuma's tool-length-measure cycle).
      const tlcLine = cfg.tool_length_comp_mode === "G56_HA"
        ? `G56 HA ${this.fmtComment(dialect, op.tool_description ?? `TOOL ${op.tool_number}`)}`
        : `G43 H${op.tool_number} ${this.fmtComment(dialect, op.tool_description ?? `TOOL ${op.tool_number}`)}`;
      gcode.push(tlcLine);
      if (cfg.tool_length_comp_mode === "G56_HA") {
        tribalTipsApplied.push("[jm_die_tool_length] G56 HA emitted (tool-length-comp via active register)");
      }

      // CALL OO88 fixture-offset macro — emitted before the spindle-start line
      // for indexed 5-axis ops on P500 when use_call_oo88 is set. Recalculates
      // WCS `fixture_offset_wcs` (default 51) from the input H-offset and the
      // op's A/C angles, then loads it via `G15 H{wcs}`.
      const isFiveAxisOp = op.operation_type === "3d_surface" || op.operation_type === "adaptive";
      if (cfg.use_call_oo88 && cfg.osp_family === "P500" && isFiveAxisOp) {
        const aDeg = op.rotary_a_deg ?? 0;
        const cDeg = op.rotary_c_deg ?? 0;
        const userOffset = cfg.work_offset_index ?? 1;
        gcode.push(
          `CALL OO88 PX=0.000 PY=0.000 PZ=0.000 PA=${aDeg.toFixed(3)} PC=${cDeg.toFixed(3)} PH=${userOffset} PP=${fixtureWcs}`,
        );
        gcode.push(`G15 H${fixtureWcs} ${this.fmtComment(dialect, "OO88 RECALCULATED OFFSET")}`);
        tribalTipsApplied.push(
          `[jm_die_call_oo88] OO88 macro emitted for ${op.operation_type} at A=${aDeg.toFixed(1)} C=${cDeg.toFixed(1)} (PP=${fixtureWcs})`,
        );
      }

      // Spindle start with N-label so verifyBlockAnnotations can cross-check.
      // Format matches Hurco/B250 contract: `N{label} S{rpm} M3 F{feed} (...)`.
      // Block ID — honor `n_number_pad_digits` (JM Die uses 4 = `N0100`).
      // Default 0 = unpadded (`N100`). The same blockId threads into the
      // BlockAnnotation entry below so the sidecar verifier matches.
      const blockNum = 100 + i * 10;
      const padDigits = cfg.n_number_pad_digits ?? 0;
      const blockId = padDigits > 0
        ? "N" + String(blockNum).padStart(padDigits, "0")
        : "N" + blockNum;
      const spindleLine =
        `${blockId} S${op.spindle_rpm} ${dialect.spindle_cw} F${op.feed_mm_min} ` +
        this.fmtComment(dialect, `SPINDLE CW ${op.spindle_rpm} RPM, FEED ${op.feed_mm_min}`);
      gcode.push(spindleLine);

      // Coolant
      const coolant = op.coolant ?? cfg.coolant_mode;
      if (coolant === "flood") {
        gcode.push(`${dialect.coolant_flood} ${this.fmtComment(dialect, "FLOOD COOLANT")}`);
      } else if (coolant === "mist") {
        gcode.push(`${dialect.coolant_mist} ${this.fmtComment(dialect, "MIST COOLANT")}`);
      }

      // Tribal knowledge filter
      const tips = this.applyTribalKnowledge(op, cfg);
      tribalTipsApplied.push(...tips);

      // Toolpath
      const toolpath = this.generateToolpath(op, cfg, dialect);
      gcode.push(...toolpath);

      // Sidecar annotation — vc / fpt derived from canonical formulae
      // (vc = π·D·N/1000, fpt = F/(N·z)). No inlined physics constants.
      const vc_mpm = (Math.PI * op.tool_diameter_mm * op.spindle_rpm) / 1000;
      const fpt_mm = op.feed_mm_min / (op.spindle_rpm * op.tool_flutes);
      blockAnnotations.push({
        block_id: blockId,
        op_id: `op_${i + 1}_${op.operation_type}`,
        iso_group: op.material_iso,
        tool_material: "carbide",
        emitted: {
          vc_mpm,
          fpt_mm,
          ap_mm: op.axial_depth_mm,
          ae_mm: op.radial_depth_mm,
          S_rpm: op.spindle_rpm,
          F_mmpm: op.feed_mm_min,
        },
        physics_basis: "kienzle",
        confidence: 0.85,
        safety_margin: 0.9,
        source_constants: [
          `CANONICAL_KIENZLE.${op.material_iso}`,
          `CANONICAL_TAYLOR.${op.material_iso}`,
        ],
      });

      estimatedTime += this.estimateCycleTime(op);
    }

    // Footer
    gcode.push("");
    gcode.push(this.fmtComment(dialect, "END OF PROGRAM"));
    if (cfg.use_super_nurbs && cfg.osp_family === "P500" && dialect.features.hsc_mode) {
      const nurbsOff = cfg.super_nurbs_code === "G131"
        ? "G131 P0"
        : dialect.features.hsc_mode.off;
      gcode.push(`${nurbsOff} ${this.fmtComment(dialect, "SUPER-NURBS OFF")}`);
    }
    gcode.push(`${dialect.spindle_stop} ${this.fmtComment(dialect, "SPINDLE STOP")}`);
    gcode.push(`${dialect.coolant_off} ${this.fmtComment(dialect, "COOLANT OFF")}`);
    gcode.push("G91 G28 Z0");
    gcode.push("G28 X0 Y0");
    for (const line of dialect.program_end) {
      gcode.push(line);
    }

    return {
      gcode,
      program_number: cfg.program_number,
      total_lines: gcode.length,
      estimated_cycle_min: Math.round(estimatedTime * 10) / 10,
      tools_used: Array.from(toolsUsed).sort((a, b) => a - b),
      warnings,
      block_annotations: blockAnnotations,
      physics_checks: physicsChecks,
      tribal_tips_applied: tribalTipsApplied,
    };
  }

  // --------------------------------------------------------------------------
  // Internal helpers
  // --------------------------------------------------------------------------

  private fmtComment(
    dialect: ReturnType<typeof controllerDialectEngine.getDialect>,
    text: string,
  ): string {
    return `${dialect.comment_open}${text}${dialect.comment_close}`;
  }

  private generateToolpath(
    op: MillOperation,
    cfg: OkumaOSPMillPostConfig,
    dialect: ReturnType<typeof controllerDialectEngine.getDialect>,
  ): string[] {
    const lines: string[] = [];
    lines.push(`${dialect.rapid_code} Z${(cfg.safe_z_mm ?? 50).toFixed(3)}`);

    for (let i = 0; i < op.coordinates.length; i++) {
      const coord = op.coordinates[i];
      const arc = op.arc_data?.[i];
      let line = "";
      switch (coord.type) {
        case "rapid":
          line = `${dialect.rapid_code} X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)} Z${coord.z.toFixed(3)}`;
          break;
        case "linear":
          line = `${dialect.linear_code} X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)} Z${coord.z.toFixed(3)} F${op.feed_mm_min}`;
          break;
        case "arc_cw":
        case "arc_ccw": {
          const arcCode = coord.type === "arc_cw" ? dialect.cw_arc_code : dialect.ccw_arc_code;
          line = `${arcCode} X${coord.x.toFixed(3)} Y${coord.y.toFixed(3)}`;
          // Dialect arc_format = "ijk_incremental" for OSP — prefer I/J over R
          if (arc?.i !== undefined && arc?.j !== undefined) {
            line += ` I${arc.i.toFixed(3)} J${arc.j.toFixed(3)}`;
          } else if (arc?.r !== undefined) {
            line += ` R${arc.r.toFixed(3)}`;
          }
          line += ` F${op.feed_mm_min}`;
          break;
        }
      }
      lines.push(line);
    }

    lines.push(`${dialect.rapid_code} Z${(cfg.safe_z_mm ?? 50).toFixed(3)}`);
    return lines;
  }

  /**
   * Per-op physics gate: cutting speed, chip load, Kienzle force, spindle
   * ceiling. All constants imported from physics/constants.ts — no inlined
   * material literals. Mirrors Hurco's gate so the block-annotation
   * `confidence` and `safety_margin` fields stay comparable across mills.
   *
   * Kienzle reference: Fc = kc1_1 · ap · fz^(1 - mc), Sandvik Coromant
   * General Turning (2024), ISO 3685 baseline.
   */
  private performPhysicsChecks(
    op: MillOperation,
    startLine: number,
    cfg: OkumaOSPMillPostConfig,
  ): OkumaOSPMillPostOutput["physics_checks"] {
    const checks: OkumaOSPMillPostOutput["physics_checks"] = [];

    const Vc = (Math.PI * op.tool_diameter_mm * op.spindle_rpm) / 1000;
    const maxVc = this.getMaxCuttingSpeed(op.material_iso);
    checks.push({
      line: startLine,
      check: `Cutting speed ${Vc.toFixed(0)} m/min vs max ${maxVc} m/min for ISO ${op.material_iso}`,
      passed: Vc <= maxVc * 1.2,
      value: Vc,
      limit: maxVc,
    });

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

    const kienzle = CANONICAL_KIENZLE[op.material_iso];
    const Fc = kienzle.kc1_1 * op.axial_depth_mm * Math.pow(fz, 1 - kienzle.mc);
    // Spindle taper rigidity guides the force ceiling: BBT-40 (P300 MB-V)
    // ~ 2000 N realistic chip-load envelope; HSK-A63 (P500 MU-V) similar.
    // Tracked under PPG-HARDEN/U-HARDEN02 if we tighten this further.
    const maxForce = 2000;
    checks.push({
      line: startLine,
      check: `Cutting force ${Fc.toFixed(0)} N vs spindle limit ${maxForce} N`,
      passed: Fc <= maxForce,
      value: Fc,
      limit: maxForce,
    });

    const maxRpm =
      cfg.max_spindle_rpm ?? (cfg.osp_family === "P500" ? 15000 : 12000);
    checks.push({
      line: startLine,
      check: `Spindle ${op.spindle_rpm} RPM vs max ${maxRpm} RPM`,
      passed: op.spindle_rpm <= maxRpm,
      value: op.spindle_rpm,
      limit: maxRpm,
    });

    // Reference Taylor for traceability — surfaces in source_constants
    void CANONICAL_TAYLOR[op.material_iso];

    return checks;
  }

  private applyTribalKnowledge(op: MillOperation, cfg: OkumaOSPMillPostConfig): string[] {
    const applied: string[] = [];
    for (const tip of OKUMA_OSP_MILL_TRIBAL_KNOWLEDGE) {
      const opMatch = tip.applies_to.includes("all") || tip.applies_to.includes(op.operation_type);
      const isoMatch = !tip.iso_group || tip.iso_group === op.material_iso;
      const familyMatch = !tip.osp_family || tip.osp_family === cfg.osp_family;
      if (opMatch && isoMatch && familyMatch) {
        applied.push(`[${tip.category}] ${tip.tip}`);
      }
    }
    return applied;
  }

  private estimateCycleTime(op: MillOperation): number {
    let totalDistance = 0;
    for (let i = 1; i < op.coordinates.length; i++) {
      const prev = op.coordinates[i - 1];
      const curr = op.coordinates[i];
      const dx = curr.x - prev.x;
      const dy = curr.y - prev.y;
      const dz = (curr.z ?? 0) - (prev.z ?? 0);
      totalDistance += Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    const cuttingTime = totalDistance / op.feed_mm_min;
    const rapidTime = (totalDistance * 0.1) / 33000;
    const toolChangeTime = 0.15;
    return cuttingTime + rapidTime + toolChangeTime;
  }

  /** Conservative per-ISO cutting-speed ceiling for the gate's 1.2× tolerance. */
  private getMaxCuttingSpeed(iso: ISOGroup): number {
    const maxVc: Record<ISOGroup, number> = {
      P: 250,
      M: 150,
      K: 200,
      N: 500,
      S: 50,
      H: 100,
    };
    return maxVc[iso] ?? 200;
  }

  /** Diagnostic surface — used by `getStats` MCP introspection. */
  getStats(family: OSPFamily = "P300"): {
    machine: string;
    controller: string;
    tribal_tips: number;
    physics_checks: number;
    features: string[];
  } {
    return {
      machine: family === "P500" ? "Okuma MU-V (5-axis)" : "Okuma MB-V / Genos M",
      controller: `OSP-${family}M`,
      tribal_tips: OKUMA_OSP_MILL_TRIBAL_KNOWLEDGE.length,
      physics_checks: 4,
      features: [
        "Dialect-driven syntax via ControllerDialectEngine",
        "Kienzle force gate (CANONICAL_KIENZLE)",
        "Taylor tool-life reference (CANONICAL_TAYLOR)",
        "G15 H{n} work offsets",
        "G65 P88xx Renishaw probing",
        ...(family === "P500" ? ["Super-NURBS (G05.1 Q1)", "5-axis TCPC (G43.5)"] : []),
      ],
    };
  }

  /**
   * Advanced-pipeline post-emission pass.
   *
   * Threads the base sync `generateProgram()` output through PRISM's existing
   * advanced engines so the master post benefits from features the user has
   * already built but had not yet been wired in:
   *
   *   1. `autoSpeedFeedEngine.optimize()` — physics-aware S/F per cutting line:
   *        chip thinning compensation, corner deceleration, plunge feed limits,
   *        spindle-power-aware ceiling, machine-rigidity-band-aware aggressiveness.
   *        Uses MachineStrategyConstraintEngine for the compounding context
   *        (rigidity_class, ways_type, spindle_type → AutoSpeedFeedInput).
   *
   * Future passes (intentionally additive — extend this method, never replace):
   *   2. `rapidRepositionOptEngine.*` — feature sequencing, retract optimization,
   *        air-cut detection, magazine-aware tool-change reordering.
   *   3. `advancedPostProcessorEngine.enhance()` — HSM/NURBS interpolation,
   *        adaptive clearing, RTCP, in-process measurement integration.
   *
   * Sync `generateProgram()` is unchanged and remains the canonical contract;
   * this method is opt-in via `cfg.use_advanced_features = true` and returns
   * the SAME shape augmented with `optimized_gcode` + `advanced_summary`.
   *
   * @milestone PPG-WIRE-MS5/U-PPGW-AdvancedWiring
   */
  async generateProgramAdvanced(
    operations: MillOperation[],
    config?: Partial<OkumaOSPMillPostConfig>,
  ): Promise<OkumaOSPMillPostOutput> {
    const baseOutput = this.generateProgram(operations, config);
    const cfg: OkumaOSPMillPostConfig = { ...this.defaultConfig, ...config };

    if (!cfg.use_advanced_features) {
      return {
        ...baseOutput,
        advanced_features_applied: [],
        optimized_gcode: null,
        advanced_summary: null,
      };
    }

    const requestedAdvancedFeatures: string[] = [];
    if (cfg.advanced_post) {
      if (cfg.advanced_post.adaptive_clearing) requestedAdvancedFeatures.push("adaptive_clearing");
      if (cfg.advanced_post.hsm) requestedAdvancedFeatures.push("hsm");
      if (cfg.advanced_post.feed_optimization) requestedAdvancedFeatures.push("feed_optimization");
      if (cfg.advanced_post.multi_axis) requestedAdvancedFeatures.push("multi_axis");
      if (cfg.advanced_post.in_process_measure) requestedAdvancedFeatures.push("in_process_measure");
      if (cfg.advanced_post.tool_management) requestedAdvancedFeatures.push("tool_management");
    }

    const enhancements: string[] = [];

    // ── Resolve compounding machine context (optional — falls back to defaults) ──
    const machine = cfg.machine_id
      ? machineStrategyConstraintEngine.getMachineById(cfg.machine_id)
      : null;

    const axes: AxisKinematics[] | undefined = machine
      ? buildAxesFromMachine(machine)
      : undefined;

    // ── 1. AutoSpeedFeed pass over the base G-code ──────────────────────────
    // Build the tool definition list from operation metadata. Material is
    // resolved per-program from the first op's ISO group (acceptable because
    // a single emitted program runs against one stock material in practice).
    const toolDefs = operations.map((op) => ({
      tool_number: op.tool_number,
      diameter_mm: op.tool_diameter_mm,
      flutes: op.tool_flutes,
      type: "endmill" as const,
      material: "carbide" as const,
    }));

    const primaryIso = operations[0]?.material_iso ?? "P";
    const sfInput = {
      gcode: baseOutput.gcode.join("\n"),
      material: ISO_GROUP_TO_AUTO_SF_MATERIAL[primaryIso],
      iso_group: primaryIso,
      tools: toolDefs,
      strategy: "hsm" as const,
      coolant: "flood" as const,
      machine_power_kw: machine?.spindle_power_kW,
      machine_max_rpm: machine?.max_rpm,
      machine_rigidity: rigidityToAutoSF(machine?.rigidity_class),
      optimize_for: "balanced" as const,
      aggressiveness: cfg.advanced_aggressiveness ?? 0.5,
      preserve_rapids: true,
    };

    const sfResult = await autoSpeedFeedEngine.optimize(sfInput);
    enhancements.push("auto_speed_feed_optimization");

    log.info(
      `[OkumaOSPMill] AutoSpeedFeed pass: ${sfResult.stats.lines_modified}/${sfResult.stats.cutting_lines} cutting lines modified, ` +
        `~${sfResult.stats.estimated_time_savings_pct.toFixed(1)}% time savings`,
    );

    // ── 2. PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring ──────────────────────
    // RapidRepositionOptEngine pass — operates on structured rapid moves
    // extracted from MillOperation.coordinates (NOT on emitted G-code).
    // Sync `output.gcode` is preserved byte-identical; only advanced_summary
    // is augmented with rapid/retract/air-cut savings.
    const rapidMoves = extractRapidMoves(operations);
    const rapidsResult = rapidRepositionOptEngine.optimizeRapids({
      moves: rapidMoves,
      axes,
      controller_diagonal_mode: cfg.use_super_nurbs ? "independent" : "slowest_axis",
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
      `[OkumaOSPMill] RapidReposition pass: rapids=${rapidsResult.optimizations.length} ` +
        `retracts=${retractsResult.optimizations.length} air_cuts=${airCutsResult.detections.length} ` +
        `total_saved=${rapidTotal.toFixed(2)}s`,
    );

    // ── 3. PPG-WIRE-MS5/U-PPGW-HSMDwell-Wiring ─────────────────────────
    // HSMDwellAtCornerEngine pass — analyzes corners detected in
    // MillOperation.coordinates (linear/arc transitions only; rapids
    // skipped). Sync `output.gcode` is preserved byte-identical; only
    // advanced_summary.hsm_dwell is augmented with corner-dwell stats +
    // dedup'd recommendations.
    //
    // Mode mapping: cfg.use_super_nurbs=true → "g05p1" (Okuma G05.1 Q1
    // Super-NURBS / G131 nano-class smoothing collapses to the same dwell
    // family for analysis purposes — both engage look-ahead smoothing).
    // Default off — engine emits straight motion control dwell.
    const hsmCorners = extractCornersFromOperations(operations);
    const hsmServo: MachineServo = buildServoFromMachine(machine);
    const hsmMode: HSMParameters["hsm_mode"] = cfg.use_super_nurbs ? "g05p1" : "off";
    const hsmResults = runHSMDwellPass(hsmCorners, hsmServo, hsmMode);
    enhancements.push("hsm_dwell_optimization");
    log.info(
      `[OkumaOSPMill] HSMDwell pass: corners=${hsmResults.corners_analyzed} ` +
        `high_dwell=${hsmResults.high_dwell_count} thermal=${hsmResults.high_thermal_count} ` +
        `tol_risk=${hsmResults.tolerance_violation_count} mode=${hsmResults.hsm_mode_used} ` +
        `total_dwell=${hsmResults.total_recommended_dwell_ms.toFixed(1)}ms`,
    );

    // ── 4. PPG-WIRE-MS5/U-PPGW-FeatureSequencer-Wiring ─────────────────
    // sequenceFeatures (TSP nearest-neighbor + 2-opt) reorders features
    // to minimize total rapid travel between op centroids. Output is
    // advisory — operation order is not mutated and sync output.gcode is
    // preserved byte-identical. The reordered sequence surfaces in
    // advanced_summary.feature_sequence.optimized_sequence so a
    // downstream CAM/setup planner can re-emit if desired.
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
      `[OkumaOSPMill] FeatureSequencer pass: features=${features.length} ` +
        `reorderings=${reorderingsCount} ` +
        `dist_saved=${seqResult.distance_saved_mm.toFixed(1)}mm ` +
        `time_saved=${seqResult.time_saved_sec.toFixed(2)}s ` +
        `(${seqResult.improvement_pct.toFixed(1)}%)`,
    );

    // PPG-WIRE-MS5/U-PPGW-AdvancedPost-Wiring (step 5)
    let finalGcode = sfResult.gcode;
    let advancedPostSummary: AdvancedPipelineSummary["advanced_post"] = null;
    if (cfg.advanced_post) {
      const apFeatures: AdvancedPostFeaturesConfig = { ...cfg.advanced_post };
      const preWarnings: string[] = [];
      if (apFeatures.multi_axis && cfg.osp_family === "P300") {
        preWarnings.push(
          "AdvancedPost: multi_axis (RTCP) skipped — P300 family is 3-axis MB-V, RTCP requires P500 (5-axis MU-V).",
        );
        apFeatures.multi_axis = undefined;
      }
      const apResult = advancedPostProcessorEngine.enhance({
        controller: "okuma",
        gcode: sfResult.gcode,
        ...apFeatures,
      });
      finalGcode = apResult.gcode;
      enhancements.push("advanced_post_processing");
      advancedPostSummary = {
        controller_used: "okuma",
        requested_features: requestedAdvancedFeatures,
        enhancements_applied: apResult.enhancements_applied,
        warnings: [...preWarnings, ...apResult.warnings],
        estimated_time_savings_pct: apResult.estimated_time_savings_pct,
        output_lines: apResult.gcode.split("\n").length,
      };
      log.info(
        `[OkumaOSPMill] AdvancedPost pass: ${apResult.enhancements_applied.length} sub-features applied, ` +
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
          rapid_savings_sec: roundOkuma2(rapidsResult.total_saved_sec),
          retracts_count: retractsResult.optimizations.length,
          retract_savings_sec: roundOkuma2(retractsResult.total_saved_sec),
          air_cuts_count: airCutsResult.detections.length,
          air_cut_wasted_sec: roundOkuma2(airCutsResult.total_time_wasted_sec),
          total_saved_sec: roundOkuma2(rapidTotal),
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
   * HURCO-VM30I-FULL-PSN-MS0/MS1 (echo iter18 2026-05-25) — Okuma PSN-engaged
   * variant of `generateProgram()`. Composes the same 4 PSN substrates as
   * `HurcoV11MillMasterPostEngine.generateProgramWithFullPSN()`:
   *
   *   • GCodeRuntimePredictorEngine.predictForMachine() — kinematic runtime
   *   • GCodeBidirectionalOptimizerEngine.optimize() — recommendations
   *   • First-order cost estimate (labor + machine + overhead via shop_rates)
   *   • PRISMSelfAwarenessEngine.recommendAIFeatures() — relevant features
   *
   * Returns the legacy `OkumaOSPMillPostOutput` extended with an optional
   * `psn_enrichment: OkumaOSPMillPSNEnrichment` field. Every substrate call
   * is wrapped in try/catch — one failure populates an `error` sub-field
   * and toggles `full_psn_engaged: false`, never the legacy fields. Legacy
   * `generateProgram()` leaves `psn_enrichment` undefined so all existing
   * Okuma test files stay byte-identical (anti-regression).
   *
   * @param operations  Mill operations (same shape as generateProgram).
   * @param config      Okuma post config (same shape as generateProgram).
   * @param partContext Optional part-level context (material, machine_id,
   *                    shop_rates, part_description). Sensible defaults.
   */
  async generateProgramWithFullPSN(
    operations: MillOperation[],
    config?: Partial<OkumaOSPMillPostConfig>,
    partContext?: {
      program_id?: string;
      part_description?: string;
      material?: { name: string; iso_group: ISOGroup; price_per_kg_usd?: number; density_g_cm3?: number };
      machine_id?: string;
      shop_rates?: { labor_per_hr_usd: number; machine_per_hr_usd: number; overhead_pct: number };
    },
  ): Promise<OkumaOSPMillPostOutput> {
    // Step 1 — base emit (byte-identical to legacy path).
    const base = this.generateProgram(operations, config);

    const substrate_errors: string[] = [];
    const enrichment: OkumaOSPMillPSNEnrichment = {
      enriched_at: new Date().toISOString(),
      full_psn_engaged: true,
      substrate_errors,
    };

    // Default machine: the registered MACHINE_LIBRARY id for the JM Die
    // Okuma Genos M460V-5AX. Reviewer A flagged the previous default
    // `"okuma_genos_m460v"` as a silent-substrate-failure trap: that id
    // is NOT in `GCodeRuntimePredictorEngine.MACHINE_LIBRARY` (only
    // `"okuma_m460v"` is registered), so the runtime + optimizer try/catch
    // blocks would both swallow `Unknown machine_id` errors while the
    // catch path echoed the input string back into `runtime_estimate.machine_id`,
    // masking the failure (R12 violation — `full_psn_engaged: false` shipped
    // undetected on every default-machine call). Operator overrides via
    // `partContext.machine_id` for other Okuma variants.
    const machineId = partContext?.machine_id ?? "okuma_m460v";

    // Convert MillOperation[] → ParsedBlock[] for the runtime predictor +
    // bidirectional optimizer. Same minimal mapping as V11: one G0 header
    // rapid per op + one G1/G2/G3 block per cutting coordinate. Lossy on
    // macro/probe ops; covers cycle-time-dominant cutting moves.
    const blocks = operationsToParsedBlocksForOkuma(operations);

    // Step 2 — runtime prediction (kinematic-aware, machine-library lookup).
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

    // Step 4 — first-order cost estimate (mirrors V11 calc; deep
    // CostEfficiencyBridge routing reserved for future PSN-MS1).
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
      // Compare RATES not absolute costs — when cycle_hr === 0 (runtime
      // substrate miss + base.estimated_cycle_min === 0), absolute costs
      // are both 0 and the strict-greater comparison degenerates. Rate
      // ratio is the load-bearing signal: whichever per-hour rate wins
      // will always dominate the cost at any cycle_hr > 0. V11 uses
      // absolute-cost `>=` which produces correct results only when
      // cycle_hr > 0; this Okuma variant is the cycle-hr-invariant form.
      const most_expensive = rates.machine_per_hr_usd > rates.labor_per_hr_usd
        ? "machine_time"
        : "labor";
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
        ?? `Okuma OSP-${config?.osp_family ?? this.defaultConfig.osp_family ?? "P300"}M program for ${partContext?.material?.name ?? "aluminum_6061"} on ${machineId}`;
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
// PSN-enrichment runtime + optimizer calls. Mirrors HurcoV11's helper
// (intentionally NOT shared yet to keep both engines self-contained;
// promotion to a shared module is HURCO-VM30I-FULL-PSN-MS1 candidate).
// Emits one G0 rapid per op header followed by one block per cutting
// coordinate (G1/G2/G3). Returns [] when operations is empty.
// Defensive against missing fields (Number.isFinite gates).
function operationsToParsedBlocksForOkuma(
  operations: MillOperation[],
): Array<{ motion: "G0" | "G1" | "G2" | "G3"; x?: number; y?: number; z?: number; f?: number; s?: number; t?: number }> {
  const out: Array<{ motion: "G0" | "G1" | "G2" | "G3"; x?: number; y?: number; z?: number; f?: number; s?: number; t?: number }> = [];
  for (const op of operations) {
    if (!op?.coordinates?.length) continue;
    const f = typeof op.feed_mm_min === "number" && Number.isFinite(op.feed_mm_min) ? op.feed_mm_min : undefined;
    const s = typeof op.spindle_rpm === "number" && Number.isFinite(op.spindle_rpm) ? op.spindle_rpm : undefined;
    const t = typeof op.tool_number === "number" && Number.isFinite(op.tool_number) ? op.tool_number : undefined;
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
        t,
      });
    }
  }
  return out;
}

// Singleton export — matches HurcoV11 / OkumaB250 export shape.
export const okumaOSPMillMasterPostEngine = new OkumaOSPMillMasterPostEngine();

// ============================================================================
// PPG-WIRE-MS5/U-PPGW-RapidReposition-Wiring — helpers
// ============================================================================

/** Map MachineProfile → AxisKinematics[]. Single rapid_traverse + accel_g
 *  applied uniformly across linear axes. Rotary axes added when axis_count>3. */
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
    axes.push({ name: "B", rapid_m_min: 0, is_rotary: true, rpm: 30, travel_deg: 240 });
  }
  if (machine.axis_count >= 5) {
    axes.push({ name: "C", rapid_m_min: 0, is_rotary: true, rpm: 30, travel_deg: 360 });
  }
  return axes;
}

/** Pairwise RapidMove[] from MillOperation.coordinates. Cross-op transitions
 *  also break the chain (matches the post's tool-change retract emission). */
function extractRapidMoves(operations: MillOperation[]): RapidMove[] {
  const moves: RapidMove[] = [];
  let line = 100;
  let prev: { x: number; y: number; z: number } | null = null;
  for (const op of operations) {
    if (!op.coordinates || op.coordinates.length === 0) continue;
    for (const pt of op.coordinates) {
      if (!Number.isFinite(pt.x) || !Number.isFinite(pt.y) || !Number.isFinite(pt.z)) {
        throw new Error(
          `[OkumaOSPMill] Invalid coordinate (NaN or Infinity) at op tool=${op.tool_number}`,
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
    prev = null;
    line += 10;
  }
  return moves;
}

/** Synthesize AirCutDetection input from MillOperation feed/length. */
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

function roundOkuma2(v: number): number {
  return Math.round(v * 100) / 100;
}

// ============================================================================
// PPG-WIRE-MS5/U-PPGW-HSMDwell-Wiring — helpers
// ============================================================================

/** Minimum cutting points per operation needed to form one (prev,curr,next)
 *  corner triple. Below this we cannot evaluate any corners. */
const HSM_MIN_POINTS_FOR_CORNER = 3;
/** Skip "corners" with interior angle ≥ this (i.e. near-straight motion).
 *  180° is fully straight; we relax to 170° to absorb floating-point noise. */
const HSM_NEAR_STRAIGHT_ANGLE_DEG = 170;
/** Floor/ceiling for clamped angle_deg fed into the engine's Zod schema. */
const HSM_ANGLE_DEG_MIN = 0;
const HSM_ANGLE_DEG_MAX = 180;
/** Per-corner dwell exceeding this counts as "high dwell" (engine's own
 *  recommendation threshold — HSMDwellAtCornerEngine.ts:238). */
const HSM_HIGH_DWELL_MS_THRESHOLD = 20;
/** Per-corner thermal-accumulation factor exceeding this counts as "high
 *  thermal" (engine's coolant-recommendation threshold — :244). */
const HSM_HIGH_THERMAL_FACTOR_THRESHOLD = 1.15;
/** Per-corner tolerance-violation risk in [0,1] — 0.5 = "reduce feed at
 *  corner" recommendation (engine — :241). */
const HSM_TOLERANCE_RISK_THRESHOLD = 0.5;
/** Acceleration unit conversion: g → mm/s². */
const G_TO_MM_S2 = 9810;
/** Conservative servo acceleration fallback (mm/s²) when no machine context
 *  is loaded. ~0.5 g — pessimistic for the unknown-machine case. */
const HSM_DEFAULT_ACCEL_MM_S2 = 5000;

/**
 * Build a `MachineServo` from a `MachineProfile`. We override only the
 * acceleration ceiling because that's the dominant input to the engine's
 * trapezoidal-profile dwell formula. Other servo fields (jerk, bandwidth,
 * look-ahead) fall back to engine defaults — see HSMDwellAtCornerEngine.
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
 * Rapids skipped (pre-positioning, not part of cut path). Duplicate points
 * skipped (zero-length vector). Near-straight motion skipped. Hairpin
 * reversals kept (worst-case dwells). NaN/Infinity throws.
 *
 * `angle_deg` semantics match the engine: 180=straight, 90=right turn,
 * 0=hairpin. Computed as `180 − degrees(acos(approach·exit))` with the
 * dot product clamped to [-1, +1] for floating-point safety.
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
            `[OkumaOSPMill/HSMDwell] Invalid coordinate (NaN or Infinity) at op tool=${op.tool_number}`,
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
 * tallies high-dwell, high-thermal, and tolerance-violation-risk counts,
 * dedups recommendations into a Set. Returns the empty/zero shape (with
 * `hsm_mode_used` still surfaced) when no corners are present.
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
    total_recommended_dwell_ms: roundOkuma2(totalDwell),
    avg_dwell_ms: roundOkuma2(totalDwell / corners.length),
    max_dwell_ms: roundOkuma2(maxDwell),
    avg_thermal_factor: roundOkuma2(totalThermal / corners.length),
    hsm_mode_used: modeUsed,
    recommendations: Array.from(recsSet),
    optimizations_count: corners.length,
  };
}

// ============================================================================
// PPG-WIRE-MS5/U-PPGW-FeatureSequencer-Wiring — helpers
// ============================================================================

/** Default rapid traverse (m/min) when no MachineProfile is loaded. Matches
 *  RapidRepositionOptEngine.DEFAULT_RAPID_M_MIN. Used only as the unit-
 *  conversion factor for time-saved; does NOT affect TSP geometry. */
const FEATURE_DEFAULT_RAPID_M_MIN = 30;

/**
 * Synthesize one `FeaturePoint` per `MillOperation` for TSP sequencing.
 * The point is taken from the FIRST cutting (linear/arc) coordinate of
 * the op. Operations with zero cutting coordinates are skipped.
 *
 * `operation_index` is set to the original 0-based index in `operations`,
 * making `optimized_sequence` directly mappable back to MillOperation[]
 * for downstream re-emission.
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
      throw new Error(
        `[OkumaOSPMill/FeatureSequencer] Invalid coordinate (NaN or Infinity) at op tool=${op.tool_number}`,
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

/** Hamming distance between original and optimized permutations. */
function countReorderings(original: number[], optimized: number[]): number {
  if (original.length !== optimized.length) return original.length;
  let diff = 0;
  for (let i = 0; i < original.length; i++) {
    if (original[i] !== optimized[i]) diff++;
  }
  return diff;
}
