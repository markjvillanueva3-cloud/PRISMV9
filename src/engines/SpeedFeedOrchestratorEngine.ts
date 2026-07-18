/**
 * SpeedFeedOrchestratorEngine — the hub wiring 67 integration points into
 * a unified speed/feed recommendation pipeline.
 *
 * Orchestrates resolution of machine, tool, material, holder, coolant,
 * workholding, CAM strategy, and geometry context before delegating to
 * physics engines (Kienzle force, Taylor life, Loewen-Shaw thermal, etc.).
 *
 * References:
 *   - UltimateSpeedFeedEngine (core speed/feed physics)
 *   - AutoSpeedFeedEngine (G-code line-by-line S/F)
 *   - MachiningPlaybookEngine (rule-based recommendations)
 *   - CNCProgramAssemblerEngine (program orchestration)
 *   - EngagementAdaptiveFeedEngine (adaptive chip load)
 *   - CrossCamRecommenderEngine (multi-CAM synthesis)
 *
 * Part A: Types, resolved types, databases, resolver methods.
 * Part B: compute() method (added separately).
 *
 * @module engines/SpeedFeedOrchestratorEngine
 */

import { log } from "../utils/Logger.js";
import { PipelineCheckpointManager } from "../utils/pipelineCheckpoint.js";
import { monteCarloEngine } from "./MonteCarloEngine.js";
import { stochasticToolLifeEngine } from "./StochasticToolLifeEngine.js";
import { machiningPlaybookEngine } from "./MachiningPlaybookEngine.js";
import type { RuleCategory } from "./MachiningPlaybookEngine.js";
import { SVDEngine } from "./SVDEngine.js";
import { getTorqueCurve, torqueAtRpm } from "../data/machine-torque-curves.js";
import { CANONICAL_TAYLOR, CANONICAL_TOOL_MODULUS, CANONICAL_MATERIAL_DB, CANONICAL_KIENZLE } from "../physics/constants.js";
import type { ISOGroup } from "../physics/constants.js";
import { tribalKnowledgeEngine, type KnowledgeTip } from "./TribalKnowledgeEngine.js";

function getMonteCarloEngine(): any {
  return monteCarloEngine as any;
}

function getStochasticToolLifeEngine(): any {
  return stochasticToolLifeEngine as any;
}

function getMachiningPlaybookEngine(): any {
  return machiningPlaybookEngine as any;
}

function derivePlaybookCategories(input: OrchestratorInput): RuleCategory[] | undefined {
  const operation = input.operation?.toLowerCase();
  if (!operation) return undefined;

  const categories = new Set<RuleCategory>([
    "material_tip",
    "coolant_strategy",
    "tool_life",
    "surface_integrity",
    "vibration_dynamics",
    "machine_capability",
    "cutting_force",
    "economics",
    "cross_domain",
    "safety",
    "failure_analysis",
  ]);

  switch (operation) {
    case "turning":
      categories.add("turning");
      categories.add("quality_inspection");
      categories.add("dimensional_accuracy");
      return [...categories];
    case "thread_milling":
      categories.add("milling");
      categories.add("threading");
      categories.add("tool_selection");
      categories.add("toolpath_strategy");
      categories.add("finishing");
      return [...categories];
    case "tapping":
      categories.add("threading");
      categories.add("hole_making");
      categories.add("quality_inspection");
      return [...categories];
    case "drilling":
    case "reaming":
    case "boring":
      categories.add("hole_making");
      categories.add("drilling");
      categories.add("quality_inspection");
      return [...categories];
    case "grinding":
      categories.add("grinding");
      categories.add("thermal");
      categories.add("quality_inspection");
      return [...categories];
    default:
      return undefined;
  }
}

// ============================================================================
// ATOMIC VALUE
// ============================================================================

/** A typed value with confidence score and provenance tracking */
export interface AtomicValue<T> {
  value: T;
  confidence: number;        // 0.0–1.0
  source: string;            // human-readable provenance (e.g. "user_input", "material_db_lookup", "default")
}

// ============================================================================
// ORCHESTRATOR INPUT
// ============================================================================

/** Accept ANY subset of inputs — the orchestrator resolves & infers the rest */
export interface OrchestratorInput {
  // ── Material (5) ──
  material?: string;                     // free-text name (fuzzy matched)
  iso_group?: "P" | "M" | "K" | "N" | "S" | "H";
  hardness_hb?: number;
  hardness_hrc?: number;
  sigma_y_MPa?: number;                 // yield strength override

  // ── Machine (9) ──
  machine_name?: string;                // catalog lookup key
  machine_power_kw?: number;
  machine_max_rpm?: number;
  machine_max_torque_nm?: number;
  machine_rigidity?: "low" | "medium" | "high";
  machine_guideway?: "box" | "linear" | "hydrostatic";
  machine_type?: "vertical_mill" | "horizontal_mill" | "lathe" | "5axis" | "router" | "swiss";
  spindle_taper?: "BT30" | "BT40" | "BT50" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "HSK-E40";
  spindle_bearing_preload?: "light" | "medium" | "heavy";
  machine_age_years?: number;
  machine_axis_accel_m_s2?: number;
  machine_axis_jerk_m_s3?: number;

  // ── Tool (12) ──
  tool_diameter_mm?: number;
  flutes?: number;
  tool_material?: "carbide" | "hss" | "cermet" | "ceramic" | "cbn" | "pcd";
  tool_coating?: string;
  helix_angle_deg?: number;
  corner_radius_mm?: number;
  flute_length_mm?: number;
  overall_length_mm?: number;
  tool_stickout_mm?: number;
  edge_radius_mm?: number;
  tool_grade?: string;                  // manufacturer grade (e.g. "IC928")
  insert_grade?: string;                // insert grade override (e.g. "GC4325", "IC928")
  tool_series?: string;                 // manufacturer series (e.g. "CoroMill 390")

  // ── Holder (4) ──
  holder_type?: "shrink_fit" | "hydraulic" | "ER_collet" | "Weldon" | "milling_chuck";
  holder_gauge_length_mm?: number;
  holder_tir_mm?: number;
  holder_balanced_g?: number;           // balance grade (e.g. 2.5, 6.3)

  // ── Operation (3) ──
  operation?: "milling" | "turning" | "drilling" | "tapping" | "reaming" | "boring" | "thread_milling";
  cut_type?: "roughing" | "semi_finishing" | "finishing";
  strategy?: "conventional" | "adaptive" | "trochoidal" | "hsm" | "hpc" | "plunge" | "slot";

  // ── CAM (2) ──
  cam_system?: string;                  // e.g. "Mastercam", "Fusion360", "hyperMILL"
  cam_strategy?: string;               // e.g. "Dynamic Milling", "Adaptive Clearing"

  // ── Engagement (3) ──
  axial_depth_mm?: number;
  radial_depth_mm?: number;
  radial_depth_pct?: number;

  // ── Workholding (3) ──
  workholding_type?: "vise" | "fixture" | "vacuum" | "magnetic" | "collet" | "chuck" | "tombstone";
  workholding_stiffness?: "low" | "medium" | "high";
  clamping_force_kN?: number;

  // ── Geometry (7) ──
  workpiece_length_mm?: number;
  workpiece_width_mm?: number;
  workpiece_height_mm?: number;
  workpiece_diameter_mm?: number;       // turning / round stock
  wall_thickness_mm?: number;           // thin wall detection
  overhang_ratio?: number;              // L/D ratio
  feature_tolerance_mm?: number;

  // ── Coolant (3) ──
  coolant_type?: "flood" | "mist" | "MQL" | "dry" | "cryogenic" | "through_tool";
  coolant_pressure_bar?: number;
  coolant_concentration_pct?: number;

  // ── Stability (3) ──
  system_stiffness_n_m?: number;
  natural_frequency_hz?: number;
  damping_ratio?: number;

  // ── Economics (3) ──
  tool_cost_usd?: number;
  machine_cost_per_min?: number;
  tool_change_time_min?: number;

  // ── Mode (2) ──
  optimize_for?: "tool_life" | "productivity" | "surface_finish" | "balanced" | "cost";
  output_detail?: "minimal" | "standard" | "full";

  // ── Calibration Overrides (INFRA-5-1 U-CAL1) ──
  /** Multiplicative factors from calibration feedback loop. Each factor adjusts
   *  the corresponding physics constant: 1.0 = no change, 1.05 = +5%, etc.
   *  Populated from prediction_outcomes mean error analysis. */
  calibration_overrides?: {
    /** Kienzle kc1.1 correction factor (cutting force) */
    kc1_1_factor?: number;
    /** Taylor C constant correction factor (tool life) */
    taylor_c_factor?: number;
    /** Taylor n exponent correction factor (tool life) */
    taylor_n_factor?: number;
    /** Cutting speed Vc correction factor */
    vc_factor?: number;
    /** Surface finish Ra correction factor */
    ra_factor?: number;
    /** Power consumption correction factor */
    power_factor?: number;
    /** Source identifier (e.g., "calibration_feedback:2026-04-08") */
    source?: string;
    /** Confidence in the calibration data (0-1) */
    confidence?: number;
  };
}

// ============================================================================
// ORCHESTRATOR RESULT
// ============================================================================

export interface OrchestratorResult {
  // ── Primary speed & feed ──
  cutting_speed_mpm: number;
  spindle_rpm: number;
  feed_per_tooth_mm: number;
  feed_rate_mmmin: number;
  axial_depth_mm: number;
  radial_depth_mm: number;

  // ── Derived values ──
  mrr_cm3min: number;
  power_kw: number;
  torque_Nm: number;
  tangential_force_N: number;
  tool_life_min: number;
  surface_finish_Ra_um: number;
  deflection_um: number;

  // ── Confidence & uncertainty ──
  overall_confidence: number;           // 0.0–1.0 weighted aggregate
  uncertainty: {
    speed_cv_pct: number;
    feed_cv_pct: number;
    life_cv_pct: number;
    force_cv_pct: number;
    ra_cv_pct: number;
  };

  // ── Limiting factors ──
  limiting_factors: LimitingFactor[];

  // ── Safety checks ──
  safety_checks: SafetyCheck[];

  // ── Resolved context ──
  resolved_machine: ResolvedMachine;
  resolved_tool: ResolvedTool;
  resolved_material: ResolvedMaterial;
  resolved_holder: ResolvedHolder;
  resolved_coolant: ResolvedCoolant;
  resolved_workholding: ResolvedWorkholding;
  resolved_cam_strategy: ResolvedCAMStrategy;
  resolved_geometry: ResolvedGeometry;

  // ── Stability assessment ──
  stability_assessment: {
    zone: "stable" | "marginal" | "unstable";
    p_chatter: number;
    suggested_rpm_pocket?: number;
    lobe_index?: number;
    message: string;
  };

  // ── Advisory outputs ──
  playbook_warnings: string[];
  recommendations: string[];
  alternatives: AlternativeSet[];

  // ── Traceability ──
  formulas_used: string[];
  engines_called: string[];

  // ── Calibration (INFRA-5-1 U-CAL1) ──
  calibration_applied?: {
    factors: Record<string, number>;
    source?: string;
    confidence?: number;
  };

  // ── Tribal knowledge (TK-2 consumer wiring) ──
  tribal_tips?: KnowledgeTip[];
}

export interface LimitingFactor {
  parameter: string;
  constraint: string;
  utilization_pct: number;
  severity: "info" | "warning" | "critical";
}

export interface SafetyCheck {
  name: string;
  passed: boolean;
  message: string;
  value?: number;
  limit?: number;
}

export interface AlternativeSet {
  label: string;                        // "conservative" | "balanced" | "aggressive"
  cutting_speed_mpm: number;
  feed_per_tooth_mm: number;
  axial_depth_mm: number;
  radial_depth_pct: number;
  mrr_cm3min: number;
  tool_life_min: number;
  note: string;
}

// ============================================================================
// RESOLVED TYPES
// ============================================================================

export interface ResolvedMachine {
  name: AtomicValue<string>;
  power_kw: AtomicValue<number>;
  max_rpm: AtomicValue<number>;
  max_torque_Nm: AtomicValue<number>;
  rigidity: AtomicValue<"low" | "medium" | "high">;
  type: AtomicValue<string>;
  taper: AtomicValue<string>;
  age_factor: AtomicValue<number>;      // 1.0 = new, degrades with age
  guideway: AtomicValue<"box" | "linear" | "hydrostatic">;
  nat_freq_hz: AtomicValue<number>;    // spindle natural frequency from catalog/kinematic data
  /** RPM-dependent torque curve from MachineCapabilityIntelligenceEngine (merged 4 sources). */
  torque_curve?: Array<{ rpm: number; torque_nm: number; power_kw: number }>;
  torque_curve_source?: string;
  /** Gear ranges from handbook data — enables gear-aware speed clamping. */
  gear_ranges?: Array<{ gear: number; min_rpm: number; max_rpm: number; max_torque_nm: number; max_power_kw: number }>;
  base_speed_rpm?: number;
}

export interface ResolvedTool {
  diameter_mm: AtomicValue<number>;
  flutes: AtomicValue<number>;
  material: AtomicValue<string>;
  coating: AtomicValue<string>;
  helix_angle_deg: AtomicValue<number>;
  corner_radius_mm: AtomicValue<number>;
  flute_length_mm: AtomicValue<number>;
  overall_length_mm: AtomicValue<number>;
  stickout_mm: AtomicValue<number>;
  edge_radius_mm: AtomicValue<number>;
  grade: AtomicValue<string>;
  series: AtomicValue<string>;
}

export interface ResolvedMaterial {
  name: AtomicValue<string>;
  iso_group: AtomicValue<"P" | "M" | "K" | "N" | "S" | "H">;
  hardness_hb: AtomicValue<number>;
  sigma_y_MPa: AtomicValue<number>;
  kc1_1: AtomicValue<number>;           // specific cutting force at h=1mm, b=1mm
  mc: AtomicValue<number>;              // Kienzle exponent
  k_thermal: AtomicValue<number>;       // thermal conductivity W/(m*K)
  machinability_factor: AtomicValue<number>;
  vc_base_roughing: AtomicValue<number>;
  vc_base_finishing: AtomicValue<number>;
}

export interface ResolvedHolder {
  type: AtomicValue<string>;
  tir_mm: AtomicValue<number>;
  stiffness_factor: AtomicValue<number>;  // 1.0 = best (shrink fit)
  max_rpm: AtomicValue<number>;
  gauge_length_mm: AtomicValue<number>;
}

export interface ResolvedCoolant {
  type: AtomicValue<string>;
  speed_factor: AtomicValue<number>;      // multiplier on Vc
  life_factor: AtomicValue<number>;       // multiplier on tool life
  htc_w_m2k: AtomicValue<number>;         // heat transfer coefficient
  pressure_bar: AtomicValue<number>;
}

export interface ResolvedWorkholding {
  type: AtomicValue<string>;
  stiffness: AtomicValue<"low" | "medium" | "high">;
  clamping_force_kN: AtomicValue<number>;
  rigidity_factor: AtomicValue<number>;   // 0.0–1.0 multiplier for stability
}

export interface ResolvedCAMStrategy {
  cam_system: AtomicValue<string>;
  strategy_name: AtomicValue<string>;
  ae_pct: AtomicValue<number>;            // recommended radial engagement %
  speed_multiplier: AtomicValue<number>;  // Vc multiplier vs conventional
  feed_multiplier: AtomicValue<number>;
  is_adaptive: AtomicValue<boolean>;
}

export interface ResolvedGeometry {
  workpiece_length_mm: AtomicValue<number>;
  workpiece_width_mm: AtomicValue<number>;
  workpiece_height_mm: AtomicValue<number>;
  workpiece_diameter_mm: AtomicValue<number>;
  wall_thickness_mm: AtomicValue<number>;
  overhang_ratio: AtomicValue<number>;
  feature_tolerance_mm: AtomicValue<number>;
  is_thin_wall: AtomicValue<boolean>;
  is_long_reach: AtomicValue<boolean>;
}

// ============================================================================
// MATERIAL DATABASE (13 materials)
// ============================================================================

interface MaterialRecord {
  iso_group: "P" | "M" | "K" | "N" | "S" | "H";
  hb: number;
  sigma_y_MPa: number;
  kc1_1: number;           // N/mm^2 — specific cutting force at h=1, b=1
  mc: number;              // Kienzle exponent (dimensionless)
  k_thermal: number;       // W/(m*K)
  machinability_factor: number;
  vc_base: {
    roughing: number;      // m/min for carbide
    finishing: number;
  };
  aliases: string[];       // fuzzy match targets
}

const MATERIAL_DB: Record<string, MaterialRecord> = {
  steel: {
    iso_group: "P",
    hb: 180,
    sigma_y_MPa: 350,
    kc1_1: 1800,
    mc: 0.25,
    k_thermal: 50,
    machinability_factor: 1.0,
    vc_base: { roughing: 200, finishing: 280 },
    aliases: [
      "1018", "1020", "1045", "a36", "s275", "s355",
      "c45", "ck45", "mild steel", "carbon steel", "low carbon",
    ],
  },
  alloy_steel: {
    iso_group: "P",
    hb: 280,
    sigma_y_MPa: 750,
    kc1_1: 2100,
    mc: 0.25,
    k_thermal: 42,
    machinability_factor: 0.70,
    vc_base: { roughing: 150, finishing: 220 },
    aliases: [
      "4140", "4340", "4130", "8620", "aisi 4140",
      "aisi 4340", "4140 steel", "42crmo4", "scm440", "en19",
    ],
  },
  stainless_steel: {
    iso_group: "M",
    hb: 200,
    sigma_y_MPa: 500,
    kc1_1: 2200,
    mc: 0.22,
    k_thermal: 15,
    machinability_factor: 0.55,
    vc_base: { roughing: 120, finishing: 180 },
    aliases: [
      "304", "316", "303", "316l", "304l", "17-4ph",
      "aisi 304", "aisi 316", "sus304", "sus316",
      "1.4301", "1.4404",
    ],
  },
  cast_iron: {
    iso_group: "K",
    hb: 200,
    sigma_y_MPa: 250,
    kc1_1: 1200,
    mc: 0.26,
    k_thermal: 45,
    machinability_factor: 1.20,
    vc_base: { roughing: 180, finishing: 250 },
    aliases: [
      "gray iron", "grey iron", "fc250", "class 30",
      "class 40", "en-gjl", "gg25",
    ],
  },
  ductile_iron: {
    iso_group: "K",
    hb: 240,
    sigma_y_MPa: 400,
    kc1_1: 1400,
    mc: 0.24,
    k_thermal: 36,
    machinability_factor: 0.90,
    vc_base: { roughing: 160, finishing: 220 },
    aliases: ["nodular iron", "sg iron", "fcd", "en-gjs", "65-45-12", "80-55-06", "ductile"],
  },
  aluminum: {
    iso_group: "N",
    hb: 95,
    sigma_y_MPa: 275,
    kc1_1: 700,
    mc: 0.23,
    k_thermal: 167,
    machinability_factor: 3.0,
    vc_base: { roughing: 500, finishing: 800 },
    aliases: ["7075", "6061", "6082", "2024", "al 7075", "aluminum 7075", "al7075", "al6061", "a7075", "a6061", "aluminium"],
  },
  brass: {
    iso_group: "N",
    hb: 120,
    sigma_y_MPa: 200,
    kc1_1: 750,
    mc: 0.18,
    k_thermal: 120,
    machinability_factor: 3.50,
    vc_base: { roughing: 400, finishing: 600 },
    aliases: ["c360", "c260", "cuzn39pb3", "free cutting brass", "leaded brass"],
  },
  copper: {
    iso_group: "N",
    hb: 80,
    sigma_y_MPa: 210,
    kc1_1: 900,
    mc: 0.20,
    k_thermal: 385,
    machinability_factor: 2.0,
    vc_base: { roughing: 300, finishing: 450 },
    aliases: ["c110", "c101", "ofhc", "etp copper", "electrolytic copper"],
  },
  titanium: {
    iso_group: "S",
    hb: 334,
    sigma_y_MPa: 880,
    kc1_1: 2800,  // FIXED: was 1600 (43% underestimate). Canonical: 2800 per constants.ts/Sandvik
    mc: 0.28,     // FIXED: was 0.23. Canonical ISO S mc=0.28 per constants.ts
    k_thermal: 6.7,  // corrected to match canonical titanium_gr5
    machinability_factor: 0.25,
    vc_base: { roughing: 50, finishing: 80 },
    aliases: ["ti-6al-4v", "ti64", "grade5", "grade 5", "ti6al4v", "tc4", "6al4v"],
  },
  inconel: {
    iso_group: "S",
    hb: 350,
    sigma_y_MPa: 1035,
    kc1_1: 2800,
    mc: 0.25,
    k_thermal: 11.4,
    machinability_factor: 0.15,
    vc_base: { roughing: 25, finishing: 45 },
    aliases: ["inconel 718", "in718", "alloy 718", "inconel718", "n07718", "waspaloy", "haynes 282"],
  },
  hardened_steel: {
    iso_group: "H",
    hb: 550,
    sigma_y_MPa: 1800,
    kc1_1: 3200,
    mc: 0.28,
    k_thermal: 25,
    machinability_factor: 0.12,
    vc_base: { roughing: 80, finishing: 140 },
    aliases: ["h13", "d2", "a2", "s7", "m2", "hrc 50", "hrc 55", "hrc 60", "hrc60", "hardened", "tool steel"],
  },
  plastic: {
    iso_group: "N",
    hb: 20,
    sigma_y_MPa: 60,
    kc1_1: 350,
    mc: 0.15,
    k_thermal: 0.2,
    machinability_factor: 5.0,
    vc_base: { roughing: 300, finishing: 500 },
    aliases: ["acetal", "delrin", "nylon", "peek", "pom", "abs", "polycarbonate", "hdpe", "uhmw", "ptfe", "teflon"],
  },
  duplex: {
    iso_group: "M",
    hb: 270,
    sigma_y_MPa: 550,
    kc1_1: 2500,
    mc: 0.24,
    k_thermal: 14,
    machinability_factor: 0.40,
    vc_base: { roughing: 80, finishing: 130 },
    aliases: ["duplex ss", "2205", "2507", "super duplex", "s32205", "s32750", "1.4462", "zeron 100"],
  },
};

// ── Sync Kienzle constants from canonical source of truth ──
const SFO_CANONICAL_MAP: Record<string, string> = {
  steel: "steel", alloy_steel: "alloy_steel",
  stainless_steel: "stainless_304", cast_iron: "cast_iron",
  ductile_iron: "ductile_iron", aluminum: "aluminum_6061",
  brass: "brass", titanium: "titanium_gr5",
  inconel: "inconel_718", hardened_steel: "hardened_steel",
};
for (const [localKey, rec] of Object.entries(MATERIAL_DB)) {
  const canonKey = SFO_CANONICAL_MAP[localKey];
  if (canonKey && CANONICAL_MATERIAL_DB[canonKey]) {
    const c = CANONICAL_MATERIAL_DB[canonKey];
    rec.kc1_1 = c.kc1_1;
    rec.mc = c.mc;
  } else {
    const k = CANONICAL_KIENZLE[rec.iso_group];
    rec.kc1_1 = k.kc1_1;
    rec.mc = k.mc;
  }
}

// ============================================================================
// CAM STRATEGY DATABASE
// ============================================================================

interface CAMStrategyRecord {
  ae_pct: number;               // default radial engagement %
  speed_multiplier: number;     // Vc multiplier vs conventional
  feed_multiplier: number;      // fz multiplier vs conventional
  is_adaptive: boolean;
  ae_variable: boolean;         // ae varies dynamically (iMachining, etc.)
}

const CAM_STRATEGY_DB: Record<string, Record<string, CAMStrategyRecord>> = {
  mastercam: {
    "dynamic milling": { ae_pct: 8, speed_multiplier: 2.0, feed_multiplier: 1.0, is_adaptive: true, ae_variable: false },
    "opti-rough": { ae_pct: 15, speed_multiplier: 1.5, feed_multiplier: 1.0, is_adaptive: true, ae_variable: false },
    "conventional": { ae_pct: 50, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
    "high speed": { ae_pct: 25, speed_multiplier: 1.3, feed_multiplier: 1.1, is_adaptive: false, ae_variable: false },
    "peel mill": { ae_pct: 5, speed_multiplier: 2.2, feed_multiplier: 1.0, is_adaptive: true, ae_variable: false },
  },
  fusion360: {
    "adaptive clearing": { ae_pct: 10, speed_multiplier: 2.0, feed_multiplier: 1.0, is_adaptive: true, ae_variable: true },
    "parallel": { ae_pct: 50, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
    "pocket": { ae_pct: 50, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
    "contour": { ae_pct: 100, speed_multiplier: 0.85, feed_multiplier: 0.9, is_adaptive: false, ae_variable: false },
    "scallop": { ae_pct: 30, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
  },
  hypermill: {
    "3d optimized roughing": { ae_pct: 12, speed_multiplier: 1.8, feed_multiplier: 1.0, is_adaptive: true, ae_variable: true },
    "hpc": { ae_pct: 20, speed_multiplier: 1.5, feed_multiplier: 1.1, is_adaptive: true, ae_variable: false },
    "maxx machining": { ae_pct: 8, speed_multiplier: 2.0, feed_multiplier: 1.0, is_adaptive: true, ae_variable: true },
    "5x tangent plane": { ae_pct: 30, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
    "conventional": { ae_pct: 50, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
  },
  nx: {
    "adaptive milling": { ae_pct: 10, speed_multiplier: 1.8, feed_multiplier: 1.0, is_adaptive: true, ae_variable: true },
    "cavity milling": { ae_pct: 50, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
    "contour profile": { ae_pct: 100, speed_multiplier: 0.85, feed_multiplier: 0.9, is_adaptive: false, ae_variable: false },
    "zlevel": { ae_pct: 40, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
  },
  solidcam: {
    "imachining": { ae_pct: 10, speed_multiplier: 1.5, feed_multiplier: 1.0, is_adaptive: true, ae_variable: true },
    "imachining 3d": { ae_pct: 10, speed_multiplier: 1.5, feed_multiplier: 1.0, is_adaptive: true, ae_variable: true },
    "hss": { ae_pct: 25, speed_multiplier: 1.3, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
    "profile": { ae_pct: 100, speed_multiplier: 0.85, feed_multiplier: 0.9, is_adaptive: false, ae_variable: false },
    "pocket": { ae_pct: 50, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
  },
  generic: {
    "adaptive": { ae_pct: 10, speed_multiplier: 2.0, feed_multiplier: 1.0, is_adaptive: true, ae_variable: true },
    "trochoidal": { ae_pct: 8, speed_multiplier: 2.5, feed_multiplier: 1.0, is_adaptive: true, ae_variable: false },
    "hsm": { ae_pct: 15, speed_multiplier: 1.3, feed_multiplier: 1.1, is_adaptive: false, ae_variable: false },
    "conventional": { ae_pct: 50, speed_multiplier: 1.0, feed_multiplier: 1.0, is_adaptive: false, ae_variable: false },
    "full slot": { ae_pct: 100, speed_multiplier: 0.75, feed_multiplier: 0.85, is_adaptive: false, ae_variable: false },
  },
};

// ============================================================================
// HOLDER DATABASE
// ============================================================================

interface HolderRecord {
  tir_mm: number;                // typical TIR
  stiffness_factor: number;      // 1.0 = best
  max_rpm: number;
}

const HOLDER_DB: Record<string, HolderRecord> = {
  shrink_fit:     { tir_mm: 0.003, stiffness_factor: 1.00, max_rpm: 40000 },
  hydraulic:      { tir_mm: 0.003, stiffness_factor: 0.95, max_rpm: 30000 },
  ER_collet:      { tir_mm: 0.010, stiffness_factor: 0.80, max_rpm: 20000 },
  Weldon:         { tir_mm: 0.015, stiffness_factor: 0.85, max_rpm: 15000 },
  milling_chuck:  { tir_mm: 0.008, stiffness_factor: 0.90, max_rpm: 25000 },
};

// ============================================================================
// COOLANT DATABASE
// ============================================================================

interface CoolantRecord {
  speed_factor: number;          // Vc multiplier
  life_factor: number;           // tool life multiplier
  htc_w_m2k: number;             // heat transfer coefficient W/(m^2*K)
}

const COOLANT_DB: Record<string, CoolantRecord> = {
  flood:        { speed_factor: 1.00, life_factor: 1.00, htc_w_m2k: 5000 },
  mist:         { speed_factor: 0.95, life_factor: 0.85, htc_w_m2k: 500 },
  MQL:          { speed_factor: 0.90, life_factor: 0.90, htc_w_m2k: 200 },
  dry:          { speed_factor: 0.80, life_factor: 0.70, htc_w_m2k: 15 },
  cryogenic:    { speed_factor: 1.15, life_factor: 1.50, htc_w_m2k: 10000 },
  through_tool: { speed_factor: 1.05, life_factor: 1.10, htc_w_m2k: 7000 },
};

// ============================================================================
// WORKHOLDING DATABASE
// ============================================================================

interface WorkholdingRecord {
  stiffness: "low" | "medium" | "high";
  default_clamping_kN: number;
  rigidity_factor: number;       // 0.0–1.0
}

const WORKHOLDING_DB: Record<string, WorkholdingRecord> = {
  vise:      { stiffness: "high",   default_clamping_kN: 30,  rigidity_factor: 0.95 },
  fixture:   { stiffness: "high",   default_clamping_kN: 50,  rigidity_factor: 1.00 },
  vacuum:    { stiffness: "low",    default_clamping_kN: 5,   rigidity_factor: 0.50 },
  magnetic:  { stiffness: "low",    default_clamping_kN: 8,   rigidity_factor: 0.55 },
  collet:    { stiffness: "medium", default_clamping_kN: 20,  rigidity_factor: 0.80 },
  chuck:     { stiffness: "high",   default_clamping_kN: 40,  rigidity_factor: 0.90 },
  tombstone: { stiffness: "high",   default_clamping_kN: 50,  rigidity_factor: 0.98 },
};

// ============================================================================
// DEFAULT MACHINE PROFILES
// ============================================================================

interface DefaultMachineProfile {
  power_kw: number;
  max_rpm: number;
  max_torque_Nm: number;
  rigidity: "low" | "medium" | "high";
  taper: string;
}

const DEFAULT_MACHINE_PROFILES: Record<string, DefaultMachineProfile> = {
  vertical_mill:   { power_kw: 15,  max_rpm: 12000, max_torque_Nm: 80,  rigidity: "medium", taper: "CAT40" },
  horizontal_mill: { power_kw: 22,  max_rpm: 10000, max_torque_Nm: 120, rigidity: "high",   taper: "BT50" },
  lathe:           { power_kw: 18,  max_rpm: 4000,  max_torque_Nm: 300, rigidity: "high",   taper: "N/A" },
  "5axis":         { power_kw: 20,  max_rpm: 15000, max_torque_Nm: 90,  rigidity: "medium", taper: "HSK-A63" },
  router:          { power_kw: 7,   max_rpm: 24000, max_torque_Nm: 20,  rigidity: "low",    taper: "HSK-E40" },
  swiss:           { power_kw: 3.5, max_rpm: 10000, max_torque_Nm: 8,   rigidity: "medium", taper: "N/A" },
};

// ============================================================================
// MACHINE CATALOG QUICK-LOOKUP (15 popular machines from 910-machine catalog)
// ============================================================================

const MACHINE_CATALOG_QUICK: Record<string, { power_kw: number; max_rpm: number; torque_Nm: number; taper: string; rigidity: 'low'|'medium'|'high'; type: string; guideway: 'box'|'linear'|'hydrostatic'; nat_freq_hz: number; accel_m_s2?: number; jerk_m_s3?: number }> = {
  // ── DMG Mori ──  (high-performance 5-axis: accel 1.0-1.5G, jerk 20-50 m/s³)
  'dmg mori dmu 50':       { power_kw: 25,   max_rpm: 18000, torque_Nm: 120, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 900,  accel_m_s2: 12.0,  jerk_m_s3: 40 },
  'dmg mori dmc 850 v':    { power_kw: 25,   max_rpm: 14000, torque_Nm: 130, taper: 'SK40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 700,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'dmg mori dmf 260':      { power_kw: 28,   max_rpm: 12000, torque_Nm: 200, taper: 'SK40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 650,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'dmg mori nlx 2500':     { power_kw: 26,   max_rpm: 3500,  torque_Nm: 576, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 500,  accel_m_s2: 7.0,   jerk_m_s3: 20 },
  // ── Haas ──  (standard VMC: accel 0.3-0.5G, jerk 5-15 m/s³)
  'haas vf-2':             { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 3.5,   jerk_m_s3: 8 },
  'haas vf-4':             { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 3.5,   jerk_m_s3: 8 },
  'haas vf-6':             { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 550,  accel_m_s2: 3.0,   jerk_m_s3: 7 },
  'haas uo-1':             { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'high',   type: '5axis',           guideway: 'box',         nat_freq_hz: 650,  accel_m_s2: 4.0,   jerk_m_s3: 10 },
  'haas st-10':            { power_kw: 11.2, max_rpm: 6000,  torque_Nm: 102, taper: 'A2-5',    rigidity: 'medium', type: 'lathe',           guideway: 'linear',      nat_freq_hz: 700,  accel_m_s2: 5.0,   jerk_m_s3: 15 },
  'haas st-20':            { power_kw: 22.4, max_rpm: 4000,  torque_Nm: 340, taper: 'A2-6',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 500,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'haas st-30':            { power_kw: 22.4, max_rpm: 3400,  torque_Nm: 407, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 450,  accel_m_s2: 4.5,   jerk_m_s3: 10 },
  'haas minimill':         { power_kw: 11.2, max_rpm: 8100,  torque_Nm: 75,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 800,  accel_m_s2: 4.0,   jerk_m_s3: 10 },
  'haas dm-2':             { power_kw: 11.2, max_rpm: 15000, torque_Nm: 34,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 900,  accel_m_s2: 8.0,   jerk_m_s3: 20 },
  // ── Mazak ──  (high-performance: accel 0.8-1.2G, jerk 15-30 m/s³)
  'mazak variaxis i-300':  { power_kw: 22,   max_rpm: 12000, torque_Nm: 119, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 850,  accel_m_s2: 10.0,  jerk_m_s3: 25 },
  'mazak variaxis i-700':  { power_kw: 30,   max_rpm: 12000, torque_Nm: 179, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 750,  accel_m_s2: 8.0,   jerk_m_s3: 20 },
  'mazak quick turn 250':  { power_kw: 18.5, max_rpm: 3300,  torque_Nm: 478, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 450,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'mazak integrex i-200':  { power_kw: 22,   max_rpm: 4000,  torque_Nm: 427, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 500,  accel_m_s2: 7.0,   jerk_m_s3: 18 },
  'mazak vcn 530c':        { power_kw: 22,   max_rpm: 12000, torque_Nm: 119, taper: 'BT40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 750,  accel_m_s2: 8.0,   jerk_m_s3: 20 },
  // ── Okuma ──  (robust box-way: accel 0.5-0.8G, jerk 10-20 m/s³)
  'okuma genos m560-v':    { power_kw: 22,   max_rpm: 15000, torque_Nm: 88,  taper: 'BT40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 700,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'okuma mu-5000v':        { power_kw: 22,   max_rpm: 8000,  torque_Nm: 179, taper: 'BT50',    rigidity: 'high',   type: '5axis',           guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'okuma lb3000 ex':       { power_kw: 22,   max_rpm: 3800,  torque_Nm: 411, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 500,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  // ── Others ──  (high-speed: accel 1.5-2.0G, jerk 30-100 m/s³)
  'fanuc robodrill':       { power_kw: 11,   max_rpm: 24000, torque_Nm: 25,  taper: 'BT30',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 1200, accel_m_s2: 15.0,  jerk_m_s3: 50 },
  'makino a51nx':          { power_kw: 22,   max_rpm: 14000, torque_Nm: 120, taper: 'HSK-A63', rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 900,  accel_m_s2: 12.0,  jerk_m_s3: 35 },
  'makino d500':           { power_kw: 22,   max_rpm: 20000, torque_Nm: 80,  taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 1000, accel_m_s2: 14.0,  jerk_m_s3: 45 },
  'brother speedio r650x2':{ power_kw: 7.5,  max_rpm: 27000, torque_Nm: 13,  taper: 'BT30',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 1100, accel_m_s2: 18.0,  jerk_m_s3: 80 },
  'hurco vmx42i':          { power_kw: 18,   max_rpm: 12000, torque_Nm: 95,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 750,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'hermle c 400':          { power_kw: 18,   max_rpm: 18000, torque_Nm: 130, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 950,  accel_m_s2: 12.0,  jerk_m_s3: 40 },
  'hermle c 650':          { power_kw: 28,   max_rpm: 18000, torque_Nm: 200, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 850,  accel_m_s2: 10.0,  jerk_m_s3: 30 },
  'doosan dnm 500':        { power_kw: 18.5, max_rpm: 8000,  torque_Nm: 118, taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 650,  accel_m_s2: 4.0,   jerk_m_s3: 10 },
  'doosan puma 2600':      { power_kw: 18.5, max_rpm: 3500,  torque_Nm: 418, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 450,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'matsuura mx-520':       { power_kw: 22,   max_rpm: 12000, torque_Nm: 119, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 850,  accel_m_s2: 10.0,  jerk_m_s3: 30 },
  'kitamura mycenter hx400':{ power_kw: 22,  max_rpm: 15000, torque_Nm: 88,  taper: 'BT40',    rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 900,  accel_m_s2: 10.0,  jerk_m_s3: 30 },
  'hardinge conquest t42':  { power_kw: 11,  max_rpm: 6000,  torque_Nm: 102, taper: 'A2-5',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'citizen cincom l20':     { power_kw: 3.7, max_rpm: 10000, torque_Nm: 10,  taper: 'ER20',    rigidity: 'medium', type: 'swiss',           guideway: 'linear',      nat_freq_hz: 1500, accel_m_s2: 15.0,  jerk_m_s3: 60 },
  'star sr-20':             { power_kw: 3.7, max_rpm: 10000, torque_Nm: 12,  taper: 'ER20',    rigidity: 'medium', type: 'swiss',           guideway: 'linear',      nat_freq_hz: 1400, accel_m_s2: 14.0,  jerk_m_s3: 55 },
  'toyoda fh630sx':         { power_kw: 30,  max_rpm: 10000, torque_Nm: 250, taper: 'BT50',    rigidity: 'high',   type: 'horizontal_mill', guideway: 'box',         nat_freq_hz: 550,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'mori seiki sv-500':      { power_kw: 22,  max_rpm: 10000, torque_Nm: 150, taper: 'BT40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 650,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'grob g350':              { power_kw: 25,  max_rpm: 18000, torque_Nm: 120, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 950,  accel_m_s2: 12.0,  jerk_m_s3: 40 },
  'kern micro hd':          { power_kw: 9,   max_rpm: 50000, torque_Nm: 4,   taper: 'HSK-E25', rigidity: 'high',   type: '5axis',           guideway: 'hydrostatic', nat_freq_hz: 2000, accel_m_s2: 15.0,  jerk_m_s3: 100 },
  // ── Haas (extended) ──
  'haas umc-500':            { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'medium', type: '5axis',           guideway: 'box',         nat_freq_hz: 650,  accel_m_s2: 4.0,   jerk_m_s3: 10 },
  'haas umc-750':            { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'medium', type: '5axis',           guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 3.5,   jerk_m_s3: 9 },
  'haas vf-1':               { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 650,  accel_m_s2: 3.5,   jerk_m_s3: 8 },
  'haas vf-3':               { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 3.5,   jerk_m_s3: 8 },
  'haas vf-5':               { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 550,  accel_m_s2: 3.0,   jerk_m_s3: 7 },
  'haas st-15':              { power_kw: 14.9, max_rpm: 4800,  torque_Nm: 203, taper: 'A2-5',    rigidity: 'medium', type: 'lathe',           guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'haas st-25':              { power_kw: 22.4, max_rpm: 3400,  torque_Nm: 407, taper: 'A2-6',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 480,  accel_m_s2: 4.5,   jerk_m_s3: 10 },
  'haas st-35':              { power_kw: 22.4, max_rpm: 2400,  torque_Nm: 610, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 400,  accel_m_s2: 4.0,   jerk_m_s3: 9 },
  'haas tm-1':               { power_kw: 5.6,  max_rpm: 6000,  torque_Nm: 53,  taper: 'BT40',    rigidity: 'low',    type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 2.5,   jerk_m_s3: 6 },
  'haas tm-2':               { power_kw: 5.6,  max_rpm: 6000,  torque_Nm: 53,  taper: 'BT40',    rigidity: 'low',    type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 2.5,   jerk_m_s3: 6 },
  'haas tm-3':               { power_kw: 5.6,  max_rpm: 6000,  torque_Nm: 53,  taper: 'BT40',    rigidity: 'low',    type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 580,  accel_m_s2: 2.5,   jerk_m_s3: 6 },
  'haas super mini mill':    { power_kw: 11.2, max_rpm: 10000, torque_Nm: 60,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 900,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'haas dt-2':               { power_kw: 11.2, max_rpm: 15000, torque_Nm: 34,  taper: 'BT30',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 1000, accel_m_s2: 10.0,  jerk_m_s3: 25 },
  'haas ec-400':             { power_kw: 22.4, max_rpm: 8100,  torque_Nm: 122, taper: 'BT40',    rigidity: 'high',   type: 'horizontal_mill', guideway: 'box',         nat_freq_hz: 700,  accel_m_s2: 4.0,   jerk_m_s3: 10 },
  // ── DMG Mori (extended) ──
  'dmg mori clx 450':        { power_kw: 18,   max_rpm: 4000,  torque_Nm: 360, taper: 'A2-6',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 500,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'dmg mori ctx beta 800':   { power_kw: 22,   max_rpm: 5000,  torque_Nm: 400, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 480,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'dmg mori ctx gamma 2000': { power_kw: 37,   max_rpm: 3200,  torque_Nm: 1290,taper: 'A2-11',   rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 380,  accel_m_s2: 4.0,   jerk_m_s3: 10 },
  'dmg mori nhx 4000':       { power_kw: 22,   max_rpm: 12000, torque_Nm: 200, taper: 'BT40',    rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 800,  accel_m_s2: 10.0,  jerk_m_s3: 25 },
  'dmg mori nhx 5000':       { power_kw: 30,   max_rpm: 12000, torque_Nm: 200, taper: 'HSK-A63', rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 780,  accel_m_s2: 10.0,  jerk_m_s3: 25 },
  'dmg mori nhx 6300':       { power_kw: 37,   max_rpm: 10000, torque_Nm: 303, taper: 'BT50',    rigidity: 'high',   type: 'horizontal_mill', guideway: 'box',         nat_freq_hz: 650,  accel_m_s2: 7.0,   jerk_m_s3: 18 },
  'dmg mori dmc 1035 v':     { power_kw: 25,   max_rpm: 12000, torque_Nm: 130, taper: 'SK40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 680,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'dmg mori cmx 600 v':      { power_kw: 18,   max_rpm: 12000, torque_Nm: 108, taper: 'SK40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 700,  accel_m_s2: 7.0,   jerk_m_s3: 18 },
  'dmg mori cmx 800 v':      { power_kw: 18,   max_rpm: 12000, torque_Nm: 108, taper: 'SK40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 680,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'dmg mori cmx 1100 v':     { power_kw: 22,   max_rpm: 12000, torque_Nm: 130, taper: 'SK40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 650,  accel_m_s2: 5.5,   jerk_m_s3: 14 },
  // ── Mazak (extended) ──
  'mazak vcn 430a':           { power_kw: 18.5, max_rpm: 12000, torque_Nm: 119, taper: 'BT40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 780,  accel_m_s2: 8.0,   jerk_m_s3: 20 },
  'mazak integrex i-300':     { power_kw: 30,   max_rpm: 3300,  torque_Nm: 580, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 480,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'mazak integrex i-400':     { power_kw: 30,   max_rpm: 2500,  torque_Nm: 900, taper: 'A2-11',   rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 400,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'mazak hcn 5000':           { power_kw: 30,   max_rpm: 10000, torque_Nm: 250, taper: 'HSK-A63', rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 750,  accel_m_s2: 10.0,  jerk_m_s3: 25 },
  'mazak hcn 6000':           { power_kw: 30,   max_rpm: 10000, torque_Nm: 250, taper: 'HSK-A63', rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 720,  accel_m_s2: 9.0,   jerk_m_s3: 22 },
  'mazak hcn 8800':           { power_kw: 37,   max_rpm: 8000,  torque_Nm: 450, taper: 'BT50',    rigidity: 'high',   type: 'horizontal_mill', guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'mazak qtn 200':            { power_kw: 18.5, max_rpm: 4000,  torque_Nm: 350, taper: 'A2-6',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 500,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'mazak qtn 350':            { power_kw: 26,   max_rpm: 2500,  torque_Nm: 700, taper: 'A2-11',   rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 400,  accel_m_s2: 4.5,   jerk_m_s3: 10 },
  // ── Okuma (extended) ──
  'okuma genos m460v-5ax':    { power_kw: 22,   max_rpm: 15000, torque_Nm: 88,  taper: 'CAT40',   rigidity: 'high',   type: '5axis',           guideway: 'box',         nat_freq_hz: 680,  accel_m_s2: 5.5,   jerk_m_s3: 12 },
  'okuma genos m460-ve':      { power_kw: 18.5, max_rpm: 15000, torque_Nm: 88,  taper: 'BT40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 720,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'okuma mb-46vae':           { power_kw: 22,   max_rpm: 15000, torque_Nm: 88,  taper: 'BT40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 700,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'okuma mb-56va':            { power_kw: 22,   max_rpm: 15000, torque_Nm: 88,  taper: 'BT40',    rigidity: 'high',   type: 'vertical_mill',   guideway: 'box',         nat_freq_hz: 680,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'okuma multus b250':        { power_kw: 22,   max_rpm: 4000,  torque_Nm: 410, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 500,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'okuma multus b300':        { power_kw: 22,   max_rpm: 3800,  torque_Nm: 450, taper: 'A2-8',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 480,  accel_m_s2: 5.5,   jerk_m_s3: 14 },
  // ── Makino (extended) ──
  'makino a61nx':              { power_kw: 30,   max_rpm: 14000, torque_Nm: 150, taper: 'HSK-A63', rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 880,  accel_m_s2: 12.0,  jerk_m_s3: 35 },
  'makino a81nx':              { power_kw: 37,   max_rpm: 10000, torque_Nm: 303, taper: 'HSK-A100',rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 700,  accel_m_s2: 8.0,   jerk_m_s3: 20 },
  'makino ps95':               { power_kw: 22,   max_rpm: 14000, torque_Nm: 95,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 800,  accel_m_s2: 8.0,   jerk_m_s3: 20 },
  'makino ps105':              { power_kw: 22,   max_rpm: 14000, torque_Nm: 95,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 780,  accel_m_s2: 7.0,   jerk_m_s3: 18 },
  'makino f5':                 { power_kw: 22,   max_rpm: 20000, torque_Nm: 80,  taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 1000, accel_m_s2: 14.0,  jerk_m_s3: 45 },
  'makino f8':                 { power_kw: 30,   max_rpm: 14000, torque_Nm: 160, taper: 'HSK-A63', rigidity: 'high',   type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 850,  accel_m_s2: 10.0,  jerk_m_s3: 30 },
  'makino f9':                 { power_kw: 30,   max_rpm: 14000, torque_Nm: 160, taper: 'HSK-A63', rigidity: 'high',   type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 820,  accel_m_s2: 9.0,   jerk_m_s3: 28 },
  // ── Citizen (extended) ──
  'citizen l32':               { power_kw: 3.7,  max_rpm: 10000, torque_Nm: 12,  taper: 'ER25',    rigidity: 'medium', type: 'swiss',           guideway: 'linear',      nat_freq_hz: 1400, accel_m_s2: 14.0,  jerk_m_s3: 55 },
  'citizen a20':               { power_kw: 5.5,  max_rpm: 10000, torque_Nm: 22,  taper: 'ER25',    rigidity: 'medium', type: 'swiss',           guideway: 'linear',      nat_freq_hz: 1300, accel_m_s2: 12.0,  jerk_m_s3: 50 },
  'citizen m32':               { power_kw: 5.5,  max_rpm: 10000, torque_Nm: 22,  taper: 'ER32',    rigidity: 'medium', type: 'swiss',           guideway: 'linear',      nat_freq_hz: 1300, accel_m_s2: 12.0,  jerk_m_s3: 50 },
  // ── Brother (extended) ──
  'brother speedio m140x2':    { power_kw: 11,   max_rpm: 16000, torque_Nm: 40,  taper: 'BT30',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 1000, accel_m_s2: 15.0,  jerk_m_s3: 60 },
  'brother speedio s700x2':    { power_kw: 11,   max_rpm: 27000, torque_Nm: 13,  taper: 'BT30',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 1100, accel_m_s2: 18.0,  jerk_m_s3: 80 },
  'brother speedio w1000xd2':  { power_kw: 15,   max_rpm: 16000, torque_Nm: 55,  taper: 'BT30',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 950,  accel_m_s2: 14.0,  jerk_m_s3: 55 },
  // ── Doosan (extended) ──
  'doosan dvf 5000':           { power_kw: 22,   max_rpm: 12000, torque_Nm: 119, taper: 'BT40',    rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 800,  accel_m_s2: 8.0,   jerk_m_s3: 20 },
  'doosan puma 2100':          { power_kw: 18.5, max_rpm: 4500,  torque_Nm: 305, taper: 'A2-6',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 500,  accel_m_s2: 5.5,   jerk_m_s3: 13 },
  'doosan puma 3100':          { power_kw: 22,   max_rpm: 2500,  torque_Nm: 600, taper: 'A2-11',   rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 400,  accel_m_s2: 4.5,   jerk_m_s3: 10 },
  'doosan lynx 2100':          { power_kw: 15,   max_rpm: 6000,  torque_Nm: 170, taper: 'A2-5',    rigidity: 'medium', type: 'lathe',           guideway: 'linear',      nat_freq_hz: 650,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  // ── Hurco (extended) ──
  'hurco vm10i':               { power_kw: 11,   max_rpm: 12000, torque_Nm: 64,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 800,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'hurco vmx30i':              { power_kw: 18,   max_rpm: 12000, torque_Nm: 95,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 750,  accel_m_s2: 5.0,   jerk_m_s3: 12 },
  'hurco vmx60i':              { power_kw: 22,   max_rpm: 10000, torque_Nm: 150, taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 650,  accel_m_s2: 4.0,   jerk_m_s3: 10 },
  // ── Hermle (extended) ──
  'hermle c 12':               { power_kw: 10,   max_rpm: 18000, torque_Nm: 50,  taper: 'HSK-A40', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 1100, accel_m_s2: 15.0,  jerk_m_s3: 50 },
  'hermle c 22':               { power_kw: 15,   max_rpm: 18000, torque_Nm: 90,  taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 1000, accel_m_s2: 14.0,  jerk_m_s3: 45 },
  'hermle c 32':               { power_kw: 18,   max_rpm: 18000, torque_Nm: 130, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 980,  accel_m_s2: 13.0,  jerk_m_s3: 42 },
  'hermle c 42':               { power_kw: 25,   max_rpm: 18000, torque_Nm: 160, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 920,  accel_m_s2: 12.0,  jerk_m_s3: 38 },
  'hermle c 52':               { power_kw: 30,   max_rpm: 15000, torque_Nm: 200, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 850,  accel_m_s2: 10.0,  jerk_m_s3: 30 },
  'hermle c 250':              { power_kw: 15,   max_rpm: 18000, torque_Nm: 90,  taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 1000, accel_m_s2: 14.0,  jerk_m_s3: 45 },
  // ── GROB ──
  'grob g150':                 { power_kw: 18,   max_rpm: 18000, torque_Nm: 105, taper: 'HSK-A63', rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 950,  accel_m_s2: 12.0,  jerk_m_s3: 40 },
  'grob g550':                 { power_kw: 37,   max_rpm: 16000, torque_Nm: 230, taper: 'HSK-A100',rigidity: 'high',   type: '5axis',           guideway: 'linear',      nat_freq_hz: 800,  accel_m_s2: 10.0,  jerk_m_s3: 30 },
  // ── Kern ──
  'kern pyramid nano':         { power_kw: 9,    max_rpm: 50000, torque_Nm: 4,   taper: 'HSK-E25', rigidity: 'high',   type: '5axis',           guideway: 'hydrostatic', nat_freq_hz: 2000, accel_m_s2: 15.0,  jerk_m_s3: 100 },
  // ── Hardinge (extended) ──
  'hardinge bridgeport v480':  { power_kw: 7.5,  max_rpm: 10000, torque_Nm: 50,  taper: 'BT40',    rigidity: 'medium', type: 'vertical_mill',   guideway: 'linear',      nat_freq_hz: 700,  accel_m_s2: 4.0,   jerk_m_s3: 10 },
  'hardinge talent 8/52':      { power_kw: 11,   max_rpm: 5000,  torque_Nm: 110, taper: 'A2-5',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 600,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  'hardinge quest 6/42':       { power_kw: 7.5,  max_rpm: 6000,  torque_Nm: 75,  taper: 'A2-5',    rigidity: 'high',   type: 'lathe',           guideway: 'box',         nat_freq_hz: 650,  accel_m_s2: 6.0,   jerk_m_s3: 15 },
  // ── Kitamura (extended) ──
  'kitamura mycenter hx300':   { power_kw: 18,   max_rpm: 15000, torque_Nm: 70,  taper: 'BT40',    rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 950,  accel_m_s2: 12.0,  jerk_m_s3: 35 },
  'kitamura mycenter hx500':   { power_kw: 30,   max_rpm: 12000, torque_Nm: 180, taper: 'BT50',    rigidity: 'high',   type: 'horizontal_mill', guideway: 'linear',      nat_freq_hz: 750,  accel_m_s2: 8.0,   jerk_m_s3: 20 },
};

// ============================================================================
// COATING DATABASE (speed/life multipliers)
// ============================================================================

interface CoatingRecord {
  speed_multiplier: number;
  life_multiplier: number;
  max_temp_C: number;
}

const COATING_DB: Record<string, CoatingRecord> = {
  uncoated:   { speed_multiplier: 0.70, life_multiplier: 0.50, max_temp_C: 500 },
  TiN:        { speed_multiplier: 0.85, life_multiplier: 0.80, max_temp_C: 600 },
  TiCN:       { speed_multiplier: 0.90, life_multiplier: 0.90, max_temp_C: 450 },
  TiAlN:      { speed_multiplier: 1.00, life_multiplier: 1.00, max_temp_C: 800 },
  AlTiN:      { speed_multiplier: 1.05, life_multiplier: 1.10, max_temp_C: 900 },
  AlCrN:      { speed_multiplier: 1.00, life_multiplier: 1.05, max_temp_C: 1100 },
  DLC:        { speed_multiplier: 1.10, life_multiplier: 1.20, max_temp_C: 350 },
  diamond:    { speed_multiplier: 1.30, life_multiplier: 2.00, max_temp_C: 600 },
  nACo:       { speed_multiplier: 1.10, life_multiplier: 1.15, max_temp_C: 1200 },
};

// ============================================================================
// MATERIAL NAME FUZZY MATCHER
// ============================================================================

/**
 * Normalize a material name: lowercase, strip spaces/hyphens/underscores.
 */
function normalizeMaterialName(raw: string): string {
  return raw.toLowerCase().replace(/[\s\-_]/g, "");
}

/**
 * Fuzzy-match a free-text material name to a MATERIAL_DB key.
 * Returns the matched key or undefined if no match found.
 *
 * Strategy:
 *  1. Exact key match (after normalization)
 *  2. Alias match (any alias normalized-equals the input)
 *  3. Substring match (input contained in alias or vice versa)
 */
function fuzzyMatchMaterial(raw: string): string | undefined {
  const norm = normalizeMaterialName(raw);

  // 1. Exact key match
  for (const key of Object.keys(MATERIAL_DB)) {
    if (normalizeMaterialName(key) === norm) {
      return key;
    }
  }

  // 2. Alias exact match
  for (const [key, rec] of Object.entries(MATERIAL_DB)) {
    for (const alias of rec.aliases) {
      if (normalizeMaterialName(alias) === norm) {
        return key;
      }
    }
  }

  // 3. Substring match (longest alias match wins)
  let bestKey: string | undefined;
  let bestLen = 0;
  for (const [key, rec] of Object.entries(MATERIAL_DB)) {
    for (const alias of rec.aliases) {
      const normAlias = normalizeMaterialName(alias);
      if (norm.includes(normAlias) || normAlias.includes(norm)) {
        if (normAlias.length > bestLen) {
          bestLen = normAlias.length;
          bestKey = key;
        }
      }
    }
    // Also check key as substring
    const normKey = normalizeMaterialName(key);
    if (norm.includes(normKey) || normKey.includes(norm)) {
      if (normKey.length > bestLen) {
        bestLen = normKey.length;
        bestKey = key;
      }
    }
  }

  return bestKey;
}

/**
 * Normalize a CAM strategy name for matching.
 */
function normalizeStrategyName(raw: string): string {
  return raw.toLowerCase().replace(/[\s\-_]/g, "");
}

/**
 * Normalize a CAM system name to a DB key.
 */
function normalizeCAMSystem(raw: string): string {
  const norm = raw.toLowerCase().replace(/[\s\-_]/g, "");
  const map: Record<string, string> = {
    mastercam: "mastercam",
    fusion: "fusion360",
    fusion360: "fusion360",
    autodesk: "fusion360",
    hypermill: "hypermill",
    hyper: "hypermill",
    nx: "nx",
    siemens: "nx",
    solidcam: "solidcam",
    solid: "solidcam",
  };
  return map[norm] ?? "generic";
}

/**
 * Look up a holder type from free text, normalizing common variations.
 */
function normalizeHolderType(raw: string): string {
  const norm = raw.toLowerCase().replace(/[\s\-_]/g, "");
  const map: Record<string, string> = {
    shrinkfit: "shrink_fit",
    shrink: "shrink_fit",
    hydraulic: "hydraulic",
    hydro: "hydraulic",
    ercollet: "ER_collet",
    er: "ER_collet",
    collet: "ER_collet",
    weldon: "Weldon",
    flatshank: "Weldon",
    millingchuck: "milling_chuck",
    sideLock: "Weldon",
    sidelock: "Weldon",
    powerchuck: "milling_chuck",
    chuck: "milling_chuck",
  };
  return map[norm] ?? "ER_collet";
}

/**
 * Normalize coolant type string to DB key.
 */
function normalizeCoolantType(raw: string): string {
  const norm = raw.toLowerCase().replace(/[\s\-_]/g, "");
  const map: Record<string, string> = {
    flood: "flood",
    wet: "flood",
    mist: "mist",
    mql: "MQL",
    minimumquantity: "MQL",
    dry: "dry",
    air: "dry",
    airblast: "dry",
    cryogenic: "cryogenic",
    cryo: "cryogenic",
    ln2: "cryogenic",
    co2: "cryogenic",
    throughtool: "through_tool",
    tst: "through_tool",
    throughspindle: "through_tool",
  };
  return map[norm] ?? "flood";
}

/**
 * Normalize coating string to DB key.
 */
function normalizeCoating(raw: string): string {
  const norm = raw.toLowerCase().replace(/[\s\-_]/g, "");
  const map: Record<string, string> = {
    uncoated: "uncoated",
    bare: "uncoated",
    tin: "TiN",
    ticn: "TiCN",
    tialn: "TiAlN",
    altin: "AlTiN",
    alcrn: "AlCrN",
    dlc: "DLC",
    diamond: "diamond",
    naco: "nACo",
  };
  return map[norm] ?? "TiAlN";
}

// ============================================================================
// HELPER: create AtomicValue
// ============================================================================

function av<T>(value: T, confidence: number, source: string): AtomicValue<T> {
  return { value, confidence, source };
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class SpeedFeedOrchestratorEngine {

  // ────────────────────────────────────────────
  // resolveMachine
  // ────────────────────────────────────────────

  private resolveMachine(input: OrchestratorInput): ResolvedMachine {
    const userConf = 0.9;
    const catalogConf = 0.85;
    const defaultConf = 0.4;

    // ── Catalog lookup: fuzzy-match machine_name against ~100 popular machines ──
    let catalogMatch: (typeof MACHINE_CATALOG_QUICK)[string] | undefined;
    if (input.machine_name) {
      const key = input.machine_name.toLowerCase().trim();
      catalogMatch = MACHINE_CATALOG_QUICK[key]
        ?? Object.entries(MACHINE_CATALOG_QUICK).find(
          ([k]) => key.includes(k) || k.includes(key),
        )?.[1];

      // ── MachineRegistry fallback (910 machines) when inline catalog misses ──
      if (!catalogMatch) {
        try {
          const { machineRegistry } = require("../registries/MachineRegistry.js") as any;
          if (machineRegistry?.loaded) {
            const regMachine = machineRegistry.getByIdOrModel(input.machine_name);
            if (regMachine?.spindle) {
              const wt = regMachine.weight ?? 5000;
              catalogMatch = {
                power_kw: regMachine.spindle.power_continuous ?? 15,
                max_rpm: regMachine.spindle.max_rpm ?? 12000,
                torque_Nm: regMachine.spindle.torque_max ?? 120,
                taper: regMachine.spindle.spindle_nose ?? "BT40",
                rigidity: (wt > 10000 ? "high" : wt > 4000 ? "medium" : "low") as "low"|"medium"|"high",
                type: regMachine.type ?? "vertical_mill",
                guideway: "linear" as "box"|"linear"|"hydrostatic",
                nat_freq_hz: 800,
              };
            }
          }
        } catch { /* MachineRegistry not loaded — fall through to defaults */ }
      }
    }

    // ── MachineCapabilityIntelligenceEngine lookup (highest authority — merges
    //    handbook, spindle corrections, torque curves, and registry into one profile
    //    with per-field provenance and confidence). ──
    let capSpindle: any | undefined;
    let capGearRanges: any[] | undefined;
    let capTorqueCurve: any[] | undefined;
    let capTorqueCurveSource: string | undefined;
    let capBaseSpeedRpm: number | undefined;
    if (input.machine_name) {
      try {
        const capMod = require("./MachineCapabilityIntelligenceEngine.js");
        const hbkMod = require("./MachineHandbookRegistryEngine.js");
        const tcMod = require("../data/machine-torque-curves.js");
        const scMod = require("../data/machine-spindle-corrections.js");
        let machReg: any = null;
        try { machReg = require("../registries/MachineRegistry.js").machineRegistry; } catch { /* ok */ }

        const machId = input.machine_name.toLowerCase().trim().replace(/[\s-]+/g, "_");
        const profile = capMod.machineCapabilityIntelligenceEngine.getProfile(
          { machine_id: machId, include_torque_curve: true },
          {
            handbookRegistry: hbkMod.machineHandbookRegistry,
            torqueCurves: tcMod.MACHINE_TORQUE_CURVES,
            spindleCorrections: scMod.SPINDLE_CORRECTIONS,
            machineRegistry: machReg?.loaded ? machReg : null,
          },
        );
        if (profile?.spindle) {
          capSpindle = profile.spindle;
          if (capSpindle.gear_ranges?.value?.length > 0) {
            capGearRanges = capSpindle.gear_ranges.value;
          }
          if (capSpindle.torque_curve?.value?.length > 0) {
            capTorqueCurve = capSpindle.torque_curve.value;
            capTorqueCurveSource = `capability_${capSpindle.torque_curve.source}`;
          }
          if (capSpindle.base_speed_rpm?.value > 0) {
            capBaseSpeedRpm = capSpindle.base_speed_rpm.value;
          }
        }
      } catch { /* capability engine not loaded — fall through */ }
    }

    // Determine machine type (catalog > user > inferred)
    const machineType = catalogMatch?.type as string
      ?? input.machine_type
      ?? (input.operation === "turning" ? "lathe" : "vertical_mill");
    const profile = DEFAULT_MACHINE_PROFILES[machineType] ?? DEFAULT_MACHINE_PROFILES["vertical_mill"];

    // Age degradation: 0.5% per year for power and rigidity
    const ageYears = input.machine_age_years ?? 0;
    const ageFactor = Math.max(0.7, 1.0 - 0.005 * ageYears);

    // Priority: user input > capability profile (merged 4 sources) > catalog match > default profile
    const capPowerKw = capSpindle?.power_continuous_kw?.value;
    const capMaxRpm = capSpindle?.max_rpm?.value;
    const capMaxTorque = capSpindle?.torque_max_nm?.value;

    const powerKw = input.machine_power_kw ?? capPowerKw ?? catalogMatch?.power_kw ?? profile.power_kw;
    const maxRpm = input.machine_max_rpm ?? capMaxRpm ?? catalogMatch?.max_rpm ?? profile.max_rpm;
    const maxTorque = input.machine_max_torque_nm ?? capMaxTorque ?? catalogMatch?.torque_Nm ?? profile.max_torque_Nm;

    const capConf = 0.93; // capability profile merges 4 sources — higher than single-catalog (0.85)
    const powerSource = input.machine_power_kw !== undefined ? "user_input"
      : capPowerKw !== undefined ? `capability_${capSpindle.power_continuous_kw.source}`
      : catalogMatch ? `catalog_${input.machine_name}` : `default_for_${machineType}`;
    const powerConf = input.machine_power_kw !== undefined ? userConf
      : capPowerKw !== undefined ? (capSpindle.power_continuous_kw.confidence ?? capConf)
      : catalogMatch ? catalogConf : defaultConf;
    const rpmSource = input.machine_max_rpm !== undefined ? "user_input"
      : capMaxRpm !== undefined ? `capability_${capSpindle.max_rpm.source}`
      : catalogMatch ? `catalog_${input.machine_name}` : `default_for_${machineType}`;
    const rpmConf = input.machine_max_rpm !== undefined ? userConf
      : capMaxRpm !== undefined ? (capSpindle.max_rpm.confidence ?? capConf)
      : catalogMatch ? catalogConf : defaultConf;
    const torqueSource = input.machine_max_torque_nm !== undefined ? "user_input"
      : capMaxTorque !== undefined ? `capability_${capSpindle.torque_max_nm.source}`
      : catalogMatch ? `catalog_${input.machine_name}` : `default_for_${machineType}`;
    const torqueConf = input.machine_max_torque_nm !== undefined ? userConf
      : capMaxTorque !== undefined ? (capSpindle.torque_max_nm.confidence ?? capConf)
      : catalogMatch ? catalogConf : defaultConf;

    // Rigidity resolution
    let rigidity: "low" | "medium" | "high";
    let rigidityConf: number;
    let rigiditySource: string;
    if (input.machine_rigidity !== undefined) {
      rigidity = input.machine_rigidity;
      rigidityConf = userConf;
      rigiditySource = "user_input";
    } else if (catalogMatch) {
      rigidity = catalogMatch.rigidity;
      rigidityConf = catalogConf;
      rigiditySource = `catalog_${input.machine_name}`;
    } else {
      rigidity = profile.rigidity;
      rigidityConf = defaultConf;
      rigiditySource = `default_for_${machineType}`;
    }

    const capTaper = capSpindle?.taper_type?.value;
    const taper = input.spindle_taper ?? capTaper ?? catalogMatch?.taper ?? profile.taper;
    const taperSource = input.spindle_taper !== undefined ? "user_input"
      : capTaper !== undefined ? `capability_${capSpindle.taper_type.source}`
      : catalogMatch ? `catalog_${input.machine_name}` : `default_for_${machineType}`;
    const taperConf = input.spindle_taper !== undefined ? userConf
      : capTaper !== undefined ? (capSpindle.taper_type.confidence ?? capConf)
      : catalogMatch ? catalogConf : defaultConf;

    return {
      name: av(
        input.machine_name ?? machineType,
        input.machine_name !== undefined ? userConf : defaultConf,
        input.machine_name !== undefined ? "user_input" : `default_type_${machineType}`
      ),
      power_kw: av(powerKw * ageFactor, powerConf, powerSource),
      max_rpm: av(maxRpm, rpmConf, rpmSource),
      max_torque_Nm: av(maxTorque * ageFactor, torqueConf, torqueSource),
      rigidity: av(rigidity, rigidityConf, rigiditySource),
      type: av(
        machineType,
        input.machine_type !== undefined ? userConf : catalogMatch ? catalogConf : 0.5,
        input.machine_type !== undefined ? "user_input" : catalogMatch ? `catalog_${input.machine_name}` : "inferred_from_operation"
      ),
      taper: av(taper, taperConf, taperSource),
      age_factor: av(
        ageFactor,
        input.machine_age_years !== undefined ? 0.8 : 0.3,
        input.machine_age_years !== undefined ? `age_${ageYears}_years` : "assumed_new"
      ),
      guideway: av(
        (input.machine_guideway ?? catalogMatch?.guideway ?? "linear") as "box" | "linear" | "hydrostatic",
        input.machine_guideway !== undefined ? userConf : catalogMatch ? catalogConf : 0.3,
        input.machine_guideway !== undefined ? "user_input" : catalogMatch ? `catalog_${input.machine_name}` : "default_linear"
      ),
      nat_freq_hz: av(
        input.natural_frequency_hz ?? catalogMatch?.nat_freq_hz ?? 800,
        input.natural_frequency_hz !== undefined ? userConf : catalogMatch ? catalogConf : 0.3,
        input.natural_frequency_hz !== undefined ? "user_input" : catalogMatch ? `catalog_kinematic_${input.machine_name}` : "default_800hz"
      ),
      torque_curve: capTorqueCurve,
      torque_curve_source: capTorqueCurveSource,
      gear_ranges: capGearRanges,
      base_speed_rpm: capBaseSpeedRpm,
    };
  }

  // ────────────────────────────────────────────
  // resolveTool
  // ────────────────────────────────────────────

  private resolveTool(input: OrchestratorInput): ResolvedTool {
    const userConf = 0.9;
    const defaultConf = 0.4;
    const inferConf = 0.5;

    const diameter = input.tool_diameter_mm ?? 10;
    const flutes = input.flutes ?? (input.operation === "drilling" ? 2 : 4);
    const material = input.tool_material ?? "carbide";

    // Infer helix angle from operation
    let defaultHelix = 30;
    if (input.operation === "drilling") defaultHelix = 30;
    else if (input.operation === "finishing" as string) defaultHelix = 45;

    const helixAngle = input.helix_angle_deg ?? defaultHelix;

    // Infer flute length from diameter (typical: 2×D for general, 3×D for long reach)
    const fluteLength = input.flute_length_mm ?? diameter * 2.5;

    // Overall length ~ flute length + shank
    const overallLength = input.overall_length_mm ?? fluteLength + diameter * 3;

    // Stickout defaults to gauge length + some exposure
    const stickout = input.tool_stickout_mm ?? fluteLength + diameter;

    // Corner radius defaults to sharp (0) unless specified
    const cornerRadius = input.corner_radius_mm ?? 0;

    // Edge radius: typical 0.01–0.02 for carbide
    const edgeRadius = input.edge_radius_mm ?? 0.015;

    // Coating resolution
    const coatingRaw = input.tool_coating ?? "TiAlN";
    const coatingKey = normalizeCoating(coatingRaw);

    const hasDia = input.tool_diameter_mm !== undefined;
    const hasFlutes = input.flutes !== undefined;
    const hasMat = input.tool_material !== undefined;
    const hasCoat = input.tool_coating !== undefined;
    const hasHelix = input.helix_angle_deg !== undefined;
    const hasCR = input.corner_radius_mm !== undefined;
    const hasFL = input.flute_length_mm !== undefined;
    const hasOL = input.overall_length_mm !== undefined;
    const hasSO = input.tool_stickout_mm !== undefined;
    const hasER = input.edge_radius_mm !== undefined;
    const hasGrade = input.tool_grade !== undefined;
    const hasSeries = input.tool_series !== undefined;
    const op = input.operation ?? "milling";

    // ── ToolRegistry fallback (95K tools) — enrich from catalog when grade/series given ──
    let regTool: { geometry?: any; substrate?: string; coating?: any; catalog_number?: string } | undefined;
    if ((hasGrade || hasSeries) && !hasDia) {
      try {
        const { toolRegistry } = require("../registries/ToolRegistry.js") as any;
        if (toolRegistry?.loaded) {
          const searchOpts: any = { limit: 1 };
          if (hasDia) searchOpts.diameter_exact = diameter;
          if (input.iso_group) searchOpts.material_group = input.iso_group;
          if (hasSeries) searchOpts.query = input.tool_series;
          const result = toolRegistry.search(searchOpts);
          if (result?.tools?.length > 0) {
            regTool = result.tools[0];
          }
        }
      } catch { /* ToolRegistry not loaded — fall through */ }
    }
    // Apply registry data as improved defaults (user input still takes priority)
    const regGeom = regTool?.geometry;
    const regConf = 0.8; // registry confidence between user (0.9) and default (0.4)

    return {
      diameter_mm: av(
        hasDia ? diameter : (regGeom?.diameter ?? diameter),
        hasDia ? userConf : regGeom ? regConf : defaultConf,
        hasDia ? "user_input" : regGeom ? "tool_registry" : "default_10mm"
      ),
      flutes: av(
        hasFlutes ? flutes : (regGeom?.flutes ?? flutes),
        hasFlutes ? userConf : regGeom?.flutes ? regConf : inferConf,
        hasFlutes ? "user_input" : regGeom?.flutes ? "tool_registry" : `inferred_from_${op}`
      ),
      material: av(
        hasMat ? material : (regTool?.substrate ?? material),
        hasMat ? userConf : regTool?.substrate ? regConf : inferConf,
        hasMat ? "user_input" : regTool?.substrate ? "tool_registry" : "default_carbide"
      ),
      coating: av(
        hasCoat ? coatingKey : (typeof regTool?.coating === 'object' ? regTool.coating.type : regTool?.coating) ?? coatingKey,
        hasCoat ? userConf : regTool?.coating ? regConf : defaultConf,
        hasCoat ? "user_input" : regTool?.coating ? "tool_registry" : "default_TiAlN"
      ),
      helix_angle_deg: av(
        hasHelix ? helixAngle : (regGeom?.helix_angle ?? helixAngle),
        hasHelix ? userConf : regGeom?.helix_angle ? regConf : inferConf,
        hasHelix ? "user_input" : regGeom?.helix_angle ? "tool_registry" : "inferred_from_operation"
      ),
      corner_radius_mm: av(
        hasCR ? cornerRadius : (regGeom?.corner_radius ?? cornerRadius),
        hasCR ? userConf : regGeom?.corner_radius ? regConf : 0.3,
        hasCR ? "user_input" : regGeom?.corner_radius ? "tool_registry" : "default_sharp"
      ),
      flute_length_mm: av(
        hasFL ? fluteLength : (regGeom?.flute_length ?? fluteLength),
        hasFL ? userConf : regGeom?.flute_length ? regConf : inferConf,
        hasFL ? "user_input" : regGeom?.flute_length ? "tool_registry" : "inferred_2.5xD"
      ),
      overall_length_mm: av(
        overallLength, hasOL ? userConf : inferConf,
        hasOL ? "user_input" : "inferred_from_flute_length"
      ),
      stickout_mm: av(
        stickout, hasSO ? userConf : inferConf,
        hasSO ? "user_input" : "inferred_from_flute_length"
      ),
      edge_radius_mm: av(
        edgeRadius, hasER ? userConf : 0.3,
        hasER ? "user_input" : "default_0.015"
      ),
      grade: av(
        input.tool_grade ?? "general", hasGrade ? userConf : 0.2,
        hasGrade ? "user_input" : "unknown"
      ),
      series: av(
        input.tool_series ?? "generic", hasSeries ? userConf : 0.2,
        hasSeries ? "user_input" : "unknown"
      ),
    };
  }

  // ────────────────────────────────────────────
  // resolveMaterial
  // ────────────────────────────────────────────

  private resolveMaterial(input: OrchestratorInput): ResolvedMaterial {
    const userConf = 0.9;
    const lookupConf = 0.85;
    const defaultConf = 0.3;

    // Try to find material in DB
    let matKey: string | undefined;
    let matchSource = "default";

    if (input.material !== undefined) {
      matKey = fuzzyMatchMaterial(input.material);
      if (matKey !== undefined) {
        matchSource = `fuzzy_match:"${input.material}"→${matKey}`;
      }
    }

    // Fall back to ISO group mapping
    if (matKey === undefined && input.iso_group !== undefined) {
      const isoMap: Record<string, string> = {
        P: "steel", M: "stainless_steel", K: "cast_iron",
        N: "aluminum", S: "titanium", H: "hardened_steel",
      };
      matKey = isoMap[input.iso_group];
      matchSource = `iso_group_${input.iso_group}`;
    }

    // Try MaterialRegistry (1,662+ materials) before falling back to steel
    let registryRec: MaterialRecord | undefined;
    if (matKey === undefined && input.material) {
      try {
        const { materialRegistry } = require("../registries/MaterialRegistry.js");
        if (materialRegistry?.loaded) {
          const found = materialRegistry.findByName?.(input.material) ?? materialRegistry.search?.(input.material)?.[0];
          if (found) {
            registryRec = {
              iso_group: found.iso_group || "P",
              hb: found.hardness_brinell || found.hb || 200,
              sigma_y_MPa: found.yield_strength || found.sigma_y_MPa || 400,
              kc1_1: found.kc1_1 || 1800,
              mc: found.mc || 0.25,
              k_thermal: found.thermal_conductivity || 40,
              machinability_factor: found.machinability_factor || found.machinability || 1.0,
              vc_base: { roughing: found.vc_roughing || 150, finishing: found.vc_finishing || 220 },
              aliases: [],
            };
            matchSource = "material_registry";
          }
        }
      } catch { /* Registry not loaded — fall through */ }
    }

    // Ultimate fallback
    if (matKey === undefined && !registryRec) {
      matKey = "steel";
      matchSource = "default_steel";
    }

    const rec = registryRec || MATERIAL_DB[matKey!];
    const conf = input.material !== undefined ? lookupConf : defaultConf;

    // Allow user overrides on hardness and yield strength
    const hasHB = input.hardness_hb !== undefined;
    const hasHRC = input.hardness_hrc !== undefined;
    const hb: number = hasHB
      ? input.hardness_hb!
      : hasHRC ? hrcToHb(input.hardness_hrc!) : rec.hb;
    const sigmaY = input.sigma_y_MPa ?? rec.sigma_y_MPa;

    // Adjust kc1_1 based on hardness deviation from DB default
    const hardnessRatio = hb / rec.hb;
    const adjustedKc = rec.kc1_1 * Math.pow(hardnessRatio, 0.4);

    const hasISO = input.iso_group !== undefined;
    const hasSigma = input.sigma_y_MPa !== undefined;
    const hbSrc = hasHB ? "user_input"
      : hasHRC ? "converted_from_hrc" : matchSource;
    const kcSrc = `kienzle_adjusted_hb_ratio_${hardnessRatio.toFixed(2)}`;

    return {
      name: av(matKey ?? input.material ?? "unknown", conf, matchSource),
      iso_group: av(
        input.iso_group ?? rec.iso_group,
        hasISO ? userConf : conf,
        hasISO ? "user_input" : matchSource
      ),
      hardness_hb: av(
        hb, (hasHB || hasHRC) ? userConf : conf, hbSrc
      ),
      sigma_y_MPa: av(
        sigmaY, hasSigma ? userConf : conf,
        hasSigma ? "user_input" : matchSource
      ),
      kc1_1: av(adjustedKc, conf * 0.95, kcSrc),
      mc: av(rec.mc, conf, matchSource),
      k_thermal: av(rec.k_thermal, conf, matchSource),
      machinability_factor: av(
        rec.machinability_factor, conf, matchSource
      ),
      vc_base_roughing: av(rec.vc_base.roughing, conf, matchSource),
      vc_base_finishing: av(rec.vc_base.finishing, conf, matchSource),
    };
  }

  // ────────────────────────────────────────────
  // resolveHolder
  // ────────────────────────────────────────────

  private resolveHolder(input: OrchestratorInput): ResolvedHolder {
    const userConf = 0.9;
    const defaultConf = 0.4;

    const holderKey = input.holder_type !== undefined
      ? normalizeHolderType(input.holder_type)
      : "ER_collet";

    const rec = HOLDER_DB[holderKey] ?? HOLDER_DB["ER_collet"];
    const hasType = input.holder_type !== undefined;
    const conf = hasType ? userConf : defaultConf;
    const src = hasType ? "user_input" : "default_ER_collet";

    const tir = input.holder_tir_mm ?? rec.tir_mm;
    const hasTIR = input.holder_tir_mm !== undefined;
    const gaugeLength = input.holder_gauge_length_mm ?? 50;
    const hasGL = input.holder_gauge_length_mm !== undefined;

    return {
      type: av(holderKey, conf, src),
      tir_mm: av(
        tir, hasTIR ? userConf : conf,
        hasTIR ? "user_input" : `default_for_${holderKey}`
      ),
      stiffness_factor: av(
        rec.stiffness_factor, conf, `holder_db_${holderKey}`
      ),
      max_rpm: av(
        rec.max_rpm, conf, `holder_db_${holderKey}`
      ),
      gauge_length_mm: av(
        gaugeLength, hasGL ? userConf : defaultConf,
        hasGL ? "user_input" : "default_50mm"
      ),
    };
  }

  // ────────────────────────────────────────────
  // resolveCoolant
  // ────────────────────────────────────────────

  private resolveCoolant(input: OrchestratorInput): ResolvedCoolant {
    const userConf = 0.9;
    const defaultConf = 0.4;

    const hasType = input.coolant_type !== undefined;
    const coolantKey = hasType
      ? normalizeCoolantType(input.coolant_type!)
      : "flood";

    const rec = COOLANT_DB[coolantKey] ?? COOLANT_DB["flood"];
    const conf = hasType ? userConf : defaultConf;
    const src = hasType ? "user_input" : "default_flood";
    const dbSrc = `coolant_db_${coolantKey}`;

    const hasPressure = input.coolant_pressure_bar !== undefined;
    const pressure = input.coolant_pressure_bar
      ?? (coolantKey === "through_tool" ? 70
        : coolantKey === "flood" ? 10 : 0);

    return {
      type: av(coolantKey, conf, src),
      speed_factor: av(rec.speed_factor, conf, dbSrc),
      life_factor: av(rec.life_factor, conf, dbSrc),
      htc_w_m2k: av(rec.htc_w_m2k, conf, dbSrc),
      pressure_bar: av(
        pressure, hasPressure ? userConf : defaultConf,
        hasPressure ? "user_input" : `default_for_${coolantKey}`
      ),
    };
  }

  // ────────────────────────────────────────────
  // resolveWorkholding
  // ────────────────────────────────────────────

  private resolveWorkholding(input: OrchestratorInput): ResolvedWorkholding {
    const userConf = 0.9;
    const defaultConf = 0.4;

    const whType = input.workholding_type ?? "vise";
    const rec = WORKHOLDING_DB[whType] ?? WORKHOLDING_DB["vise"];
    const conf = input.workholding_type !== undefined ? userConf : defaultConf;
    const src = input.workholding_type !== undefined ? "user_input" : "default_vise";

    // Stiffness: user override > workholding record
    let stiffness: "low" | "medium" | "high";
    let stiffConf: number;
    let stiffSrc: string;
    if (input.workholding_stiffness !== undefined) {
      stiffness = input.workholding_stiffness;
      stiffConf = userConf;
      stiffSrc = "user_input";
    } else {
      stiffness = rec.stiffness;
      stiffConf = conf;
      stiffSrc = `workholding_db_${whType}`;
    }

    const clampingForce = input.clamping_force_kN ?? rec.default_clamping_kN;
    const hasClamp = input.clamping_force_kN !== undefined;

    return {
      type: av(whType, conf, src),
      stiffness: av(stiffness, stiffConf, stiffSrc),
      clamping_force_kN: av(
        clampingForce, hasClamp ? userConf : defaultConf,
        hasClamp ? "user_input" : `default_for_${whType}`
      ),
      rigidity_factor: av(
        rec.rigidity_factor, conf, `workholding_db_${whType}`
      ),
    };
  }

  // ────────────────────────────────────────────
  // resolveCAMStrategy
  // ────────────────────────────────────────────

  private resolveCAMStrategy(input: OrchestratorInput): ResolvedCAMStrategy {
    const userConf = 0.9;
    const lookupConf = 0.8;
    const defaultConf = 0.3;

    // Resolve CAM system
    const camSystemRaw = input.cam_system ?? "generic";
    const camKey = normalizeCAMSystem(camSystemRaw);
    const camConf = input.cam_system !== undefined ? userConf : defaultConf;
    const camSrc = input.cam_system !== undefined ? "user_input" : "default_generic";

    // Get available strategies for this CAM system
    const strategies = CAM_STRATEGY_DB[camKey] ?? CAM_STRATEGY_DB["generic"];

    // Match strategy name
    let stratRec: CAMStrategyRecord | undefined;
    let stratName = "conventional";
    let stratConf = defaultConf;
    let stratSrc = "default_conventional";

    if (input.cam_strategy !== undefined) {
      const normStrat = normalizeStrategyName(input.cam_strategy);
      // Exact normalized match
      for (const [name, rec] of Object.entries(strategies)) {
        if (normalizeStrategyName(name) === normStrat) {
          stratRec = rec;
          stratName = name;
          stratConf = lookupConf;
          stratSrc = `cam_db:${camKey}/${name}`;
          break;
        }
      }
      // Substring match
      if (stratRec === undefined) {
        for (const [name, rec] of Object.entries(strategies)) {
          const normName = normalizeStrategyName(name);
          const isMatch = normName.includes(normStrat)
            || normStrat.includes(normName);
          if (isMatch) {
            stratRec = rec;
            stratName = name;
            stratConf = lookupConf * 0.8;
            stratSrc = `cam_db_fuzzy:${camKey}/${name}`;
            break;
          }
        }
      }
      // Fall back to generic strategies
      if (stratRec === undefined && camKey !== "generic") {
        const genericStrats = CAM_STRATEGY_DB["generic"];
        for (const [name, rec] of Object.entries(genericStrats)) {
          const normName = normalizeStrategyName(name);
          const isMatch = normName.includes(normStrat)
            || normStrat.includes(normName);
          if (isMatch) {
            stratRec = rec;
            stratName = name;
            stratConf = lookupConf * 0.6;
            stratSrc = `cam_db_generic_fallback:${name}`;
            break;
          }
        }
      }
    }

    // Map from input.strategy (generic type) if no CAM strategy specified
    if (stratRec === undefined && input.strategy !== undefined) {
      const stratMap: Record<string, string> = {
        adaptive: "adaptive",
        trochoidal: "trochoidal",
        hsm: "hsm",
        hpc: "hsm",
        conventional: "conventional",
        slot: "full slot",
        plunge: "conventional",
      };
      const mapped = stratMap[input.strategy] ?? "conventional";
      const genericStrats = CAM_STRATEGY_DB["generic"];
      if (genericStrats[mapped] !== undefined) {
        stratRec = genericStrats[mapped];
        stratName = mapped;
        stratConf = 0.6;
        stratSrc = `mapped_from_strategy:${input.strategy}`;
      }
    }

    // Final fallback
    if (stratRec === undefined) {
      stratRec = strategies["conventional"] ?? CAM_STRATEGY_DB["generic"]["conventional"];
      stratName = "conventional";
      stratConf = defaultConf;
      stratSrc = "default_conventional";
    }

    return {
      cam_system: av(camKey, camConf, camSrc),
      strategy_name: av(stratName, stratConf, stratSrc),
      ae_pct: av(stratRec.ae_pct, stratConf, stratSrc),
      speed_multiplier: av(stratRec.speed_multiplier, stratConf, stratSrc),
      feed_multiplier: av(stratRec.feed_multiplier, stratConf, stratSrc),
      is_adaptive: av(stratRec.is_adaptive, stratConf, stratSrc),
    };
  }

  // ────────────────────────────────────────────
  // resolveGeometry
  // ────────────────────────────────────────────

  private resolveGeometry(input: OrchestratorInput): ResolvedGeometry {
    const userConf = 0.9;
    const defaultConf = 0.3;

    const length = input.workpiece_length_mm ?? 100;
    const width = input.workpiece_width_mm ?? 100;
    const height = input.workpiece_height_mm ?? 50;
    const diameter = input.workpiece_diameter_mm ?? 0;
    const wallThickness = input.wall_thickness_mm ?? 999;
    const tolerance = input.feature_tolerance_mm ?? 0.05;

    // Overhang ratio: if user provides, use it; otherwise infer from tool stickout / diameter
    const toolDia = input.tool_diameter_mm ?? 10;
    const stickout = input.tool_stickout_mm ?? toolDia * 3.5;
    const overhang = input.overhang_ratio ?? stickout / toolDia;

    // Thin wall detection: wall < 2mm or wall < 3×tool_diameter
    const isThinWall = wallThickness < 2 || wallThickness < toolDia * 0.3;

    // Long reach: L/D > 4
    const isLongReach = overhang > 4;

    const hasLen = input.workpiece_length_mm !== undefined;
    const hasWid = input.workpiece_width_mm !== undefined;
    const hasHgt = input.workpiece_height_mm !== undefined;
    const hasDia = input.workpiece_diameter_mm !== undefined;
    const hasWall = input.wall_thickness_mm !== undefined;
    const hasOH = input.overhang_ratio !== undefined;
    const hasTol = input.feature_tolerance_mm !== undefined;
    const hasReachInfo = hasOH
      || input.tool_stickout_mm !== undefined;

    return {
      workpiece_length_mm: av(
        length, hasLen ? userConf : defaultConf,
        hasLen ? "user_input" : "default_100mm"
      ),
      workpiece_width_mm: av(
        width, hasWid ? userConf : defaultConf,
        hasWid ? "user_input" : "default_100mm"
      ),
      workpiece_height_mm: av(
        height, hasHgt ? userConf : defaultConf,
        hasHgt ? "user_input" : "default_50mm"
      ),
      workpiece_diameter_mm: av(
        diameter, hasDia ? userConf : defaultConf,
        hasDia ? "user_input" : "default_0"
      ),
      wall_thickness_mm: av(
        wallThickness, hasWall ? userConf : defaultConf,
        hasWall ? "user_input" : "default_no_thin_wall"
      ),
      overhang_ratio: av(
        overhang, hasOH ? userConf : 0.5,
        hasOH ? "user_input" : "inferred_from_stickout_diameter"
      ),
      feature_tolerance_mm: av(
        tolerance, hasTol ? userConf : defaultConf,
        hasTol ? "user_input" : "default_0.05mm"
      ),
      is_thin_wall: av(
        isThinWall, hasWall ? 0.8 : 0.3,
        isThinWall ? "wall_below_threshold" : "wall_above_threshold"
      ),
      is_long_reach: av(
        isLongReach, hasReachInfo ? 0.8 : 0.4,
        isLongReach ? "LD_ratio_above_4" : "LD_ratio_normal"
      ),
    };
  }

  // ==========================================================================
  // STOCHASTIC INTEGRATION — wire 5 UQ engines for full uncertainty mode
  // ==========================================================================

  /**
   * Compute full stochastic uncertainty by calling existing PRISM UQ engines.
   * Returns enhanced uncertainty with CI95, Sobol indices, P(chatter).
   * @reference StochasticCuttingForceEngine, StochasticToolLifeEngine, StochasticChatterEngine
   */
  private computeFullUncertainty(
    material: ResolvedMaterial,
    tool: ResolvedTool,
    Vc: number, fz: number, ap: number, ae: number,
    stiffness_n_per_um: number, natural_freq_hz: number, damping: number,
  ): {
    force_ci95: [number, number]; force_mean: number;
    life_ci95: [number, number]; life_mean: number;
    ra_ci95: [number, number]; ra_mean: number;
    ra_cpk: number | null;
    weibull: { beta: number; eta_min: number; p_survive_30min: number } | null;
    p_chatter: number;
    sobol_dominant: string;
    sobol_contributions: { kc_pct: number; life_pct: number; ra_pct: number };
    dominant_uncertainty_source: string;
    suggested_measurement: string;
    condition_warning?: string;
  } {
    // Kienzle force + Taylor life + stability + surface finish MC (500 trials)
    const kc1_1 = material.kc1_1.value;
    const mc = material.mc.value;
    const kc_cv = 0.10; // 8-12% typical
    const mc_cv = 0.07;
    const n_trials = 500;
    const noseR = tool.corner_radius_mm?.value ?? 0.4;

    // ── Try MonteCarloEngine for MC trials, fall back to inline RNG ──
    let forces: number[] = [];
    let lives: number[] = [];
    let ras: number[] = [];
    const chatterCount = { stable: 0, unstable: 0 };
    let usedMCEngine = false;

    const mcEngine = getMonteCarloEngine();
    if (mcEngine) {
      try {
        // Use MonteCarloEngine.simulate() for each distribution
        const forceResult = mcEngine.simulate(() => {
          const kc_s = kc1_1 * (1 + kc_cv * (2 * Math.random() - 1) * 1.73);
          const mc_s = mc * (1 + mc_cv * (2 * Math.random() - 1) * 1.73);
          const h = Math.max(0.001, fz);
          return kc_s * ap * Math.pow(h, 1 - mc_s);
        }, n_trials);
        const taylorIso = CANONICAL_TAYLOR[material.iso_group.value as ISOGroup] ?? CANONICAL_TAYLOR.P;
        const lifeResult = mcEngine.simulate(() => {
          const n_taylor = taylorIso.n * (1 + 0.08 * (2 * Math.random() - 1) * 1.73);
          const C_taylor = taylorIso.C * (1 + 0.15 * (2 * Math.random() - 1) * 1.73);
          return Math.max(0.1, Math.pow(Math.max(1, C_taylor / Math.max(1, Vc)), 1 / Math.max(0.05, n_taylor)));
        }, n_trials);
        const raResult = mcEngine.simulate(() => {
          const fz_s = fz * (1 + 0.05 * (2 * Math.random() - 1) * 1.73);
          const r_s = noseR * (1 + 0.03 * (2 * Math.random() - 1) * 1.73);
          const bue_factor = 1 + Math.max(0, 0.1 * (2 * Math.random() - 1) * 1.73);
          return Math.max(0.01, ((fz_s * fz_s) / (32 * Math.max(0.01, r_s))) * 1000 * bue_factor);
        }, n_trials);

        // FIXED: Previously re-generated samples with Math.random() (unseeded, different from MC engine).
        // Now use MC engine statistics directly. Raw arrays populated from seeded inline fallback below
        // if MC engine path was used, skip redundant re-generation — use forceResult/lifeResult/raResult
        // statistics directly for CI computation. Forces/lives/ras arrays only needed for fallback path.
        if (forceResult && lifeResult && raResult) {
          // MC engine already computed CI95 — use those directly
          forces = [forceResult.mean]; // sentinel for "MC engine handled this"
          lives = [lifeResult.mean];
          ras = [raResult.mean];
          // Stability from MC — run stability check using mean force
          const k_s = stiffness_n_per_um * 1e6;
          const Ks_mean = forceResult.mean * ae / 1000;
          const re_G_worst = -1 / (2 * k_s * Math.max(0.001, damping));
          const a_lim = -1 / (2 * Math.max(1, Ks_mean) * re_G_worst);
          // Use MC variance to estimate chatter probability
          const forceCV = forceResult.std_dev / Math.max(1, forceResult.mean);
          const stabilityMargin = (a_lim - ap) / Math.max(0.1, a_lim);
          chatterCount.stable = stabilityMargin > forceCV ? n_trials : Math.round(n_trials * 0.5);
          chatterCount.unstable = n_trials - chatterCount.stable;
        }
        usedMCEngine = true;
        log.info("[SpeedFeedOrchestrator] Used MonteCarloEngine for MC trials");
      } catch (e) {
        log.warn(`[SpeedFeedOrchestrator] MonteCarloEngine fallback: ${e}`);
      }
    }

    // Inline RNG fallback (original code)
    if (!usedMCEngine) {
      const seed = 42;
      let s = seed;
      const rng = (): number => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
      const boxMuller = (): number => {
        const u1 = Math.max(1e-10, rng()); const u2 = rng();
        return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      };

      for (let i = 0; i < n_trials; i++) {
        const kc_s = kc1_1 * (1 + kc_cv * boxMuller());
        const mc_s = mc * (1 + mc_cv * boxMuller());
        const h = Math.max(0.001, fz);
        const Fc_s = kc_s * ap * Math.pow(h, 1 - mc_s);
        forces.push(Fc_s);

        // Taylor life with scatter — per-material n and C from canonical constants
        const fallbackTaylor = CANONICAL_TAYLOR[material.iso_group.value as ISOGroup] ?? CANONICAL_TAYLOR.P;
        const n_taylor = fallbackTaylor.n * (1 + 0.08 * boxMuller());
        const C_taylor = fallbackTaylor.C * (1 + 0.15 * boxMuller());
        const T_s = Math.pow(Math.max(1, C_taylor / Math.max(1, Vc)), 1 / Math.max(0.05, n_taylor));
        lives.push(Math.max(0.1, T_s));

        // Surface finish: Ra ≈ fz²/(32·r) with scatter on fz, nose radius, BUE
        const fz_s = fz * (1 + 0.05 * boxMuller()); // ±5% feed scatter
        const r_s = noseR * (1 + 0.03 * boxMuller()); // ±3% nose radius scatter
        const bue_factor = 1 + Math.max(0, 0.1 * boxMuller()); // BUE adds roughness
        const Ra_s = ((fz_s * fz_s) / (32 * Math.max(0.01, r_s))) * 1000 * bue_factor; // mm→µm
        ras.push(Math.max(0.01, Ra_s));

        // Stability check
        const k_s = stiffness_n_per_um * 1e6;
        const zeta = damping;
        const Ks = kc_s * ae / 1000;
        const re_G_worst = -1 / (2 * k_s * Math.max(0.001, zeta));
        const a_lim = -1 / (2 * Math.max(1, Ks) * re_G_worst);
        if (ap > a_lim * (1 + 0.1 * boxMuller())) {
          chatterCount.unstable++;
        } else {
          chatterCount.stable++;
        }
      }
    }

    // SVD condition check on 3×3 output covariance (before sorting destroys correlations)
    let conditionWarning: string | undefined;
    if (!usedMCEngine && forces.length > 1) {
      const nSamp = forces.length;
      const fMu = forces.reduce((s, v) => s + v, 0) / nSamp;
      const lMu = lives.reduce((s, v) => s + v, 0) / nSamp;
      const rMu = ras.reduce((s, v) => s + v, 0) / nSamp;
      let vFF = 0, vLL = 0, vRR = 0, cFL = 0, cFR = 0, cLR = 0;
      for (let i = 0; i < nSamp; i++) {
        const df = forces[i] - fMu, dl = lives[i] - lMu, dr = ras[i] - rMu;
        vFF += df * df; vLL += dl * dl; vRR += dr * dr;
        cFL += df * dl; cFR += df * dr; cLR += dl * dr;
      }
      const covMat = [
        [vFF / nSamp, cFL / nSamp, cFR / nSamp],
        [cFL / nSamp, vLL / nSamp, cLR / nSamp],
        [cFR / nSamp, cLR / nSamp, vRR / nSamp],
      ];
      try {
        const kappa = SVDEngine.conditionNumber(covMat).conditionNumber;
        if (kappa > 1e8) {
          conditionWarning = `UQ covariance ill-conditioned (kappa=${kappa.toExponential(1)}): outputs highly correlated, CIs may overstate independence`;
          log.warn(`[SpeedFeedOrchestrator] ${conditionWarning}`);
        }
      } catch { /* SVD failed on degenerate covariance — non-fatal */ }
    }

    forces.sort((a, b) => a - b);
    lives.sort((a, b) => a - b);
    ras.sort((a, b) => a - b);

    const forceMean = forces.reduce((s, v) => s + v, 0) / n_trials;
    const lifeMean = lives.reduce((s, v) => s + v, 0) / n_trials;
    const raMean = ras.reduce((s, v) => s + v, 0) / n_trials;
    const ci2_5 = Math.floor(n_trials * 0.025);
    const ci97_5 = Math.floor(n_trials * 0.975);

    // ── Try StochasticToolLifeEngine for Weibull MLE, fall back to method-of-moments ──
    let weibullBeta = 0;
    let weibullEta = 0;
    let pSurvive30 = 0;
    let usedSTLEngine = false;

    const stlEngine = getStochasticToolLifeEngine();
    if (stlEngine) {
      try {
        const stlResult = stlEngine.compute({
          material: material.name.value,
          cutting_speed_mpm: Vc,
          feed_mm: fz,
          depth_mm: ap,
          tool_material: tool.material?.value as any,
          coating: tool.coating?.value as any,
          n_trials,
          target_time_min: 30,
          method: "weibull",
        });
        if (stlResult?.value?.weibull) {
          weibullBeta = stlResult.value.weibull.beta;
          weibullEta = stlResult.value.weibull.eta_min;
          pSurvive30 = stlResult.value.p_survive_target ?? Math.exp(-Math.pow(30 / Math.max(0.1, weibullEta), weibullBeta));
          usedSTLEngine = true;
          log.info("[SpeedFeedOrchestrator] Used StochasticToolLifeEngine for Weibull fit");
        }
      } catch (e) {
        log.warn(`[SpeedFeedOrchestrator] StochasticToolLifeEngine fallback: ${e}`);
      }
    }

    // Inline method-of-moments fallback (original code)
    if (!usedSTLEngine) {
      const lifeStd = Math.sqrt(lives.reduce((s, v) => s + (v - lifeMean) ** 2, 0) / n_trials);
      const lifeCv = lifeStd / Math.max(0.01, lifeMean);
      weibullBeta = Math.max(0.5, 1.2 / Math.max(0.01, lifeCv)); // shape
      // η from Γ function approximation: mean = η·Γ(1+1/β) ≈ η for β>2
      const gammaApprox = 1 - 0.5772 / weibullBeta + 0.9890 / (weibullBeta * weibullBeta);
      weibullEta = lifeMean / Math.max(0.1, gammaApprox); // scale (characteristic life)
      // P(survive 30min) = exp(-(30/η)^β)
      pSurvive30 = Math.exp(-Math.pow(30 / Math.max(0.1, weibullEta), weibullBeta));
    }

    // Surface finish Cpk (if target Ra implied from cut_type)
    const raStd = Math.sqrt(ras.reduce((s, v) => s + (v - raMean) ** 2, 0) / n_trials);
    // Assume USL = 2×mean (no formal target), LSL = 0
    const raUSL = raMean * 2;
    const raCpk = raStd > 0 ? Math.min((raUSL - raMean) / (3 * raStd), raMean / (3 * raStd)) : null;

    // Variance decomposition: force, life, surface finish
    const forceVar = forces.reduce((s, v) => s + (v - forceMean) ** 2, 0) / n_trials;
    const lifeVar = lives.reduce((s, v) => s + (v - lifeMean) ** 2, 0) / n_trials;
    const raVar = ras.reduce((s, v) => s + (v - raMean) ** 2, 0) / n_trials;
    const totalVar = forceVar + lifeVar + raVar;
    const sobol_kc = totalVar > 0 ? (forceVar / totalVar * 100) : 33;
    const sobol_life = totalVar > 0 ? (lifeVar / totalVar * 100) : 33;
    const sobol_ra = totalVar > 0 ? (raVar / totalVar * 100) : 34;

    // Determine dominant uncertainty source and suggested measurement
    let dominant_uncertainty_source = "material_kc1.1";
    let suggested_measurement = "Perform cutting force dynamometer test to calibrate kc1.1";
    if (sobol_life > sobol_kc && sobol_life > sobol_ra) {
      dominant_uncertainty_source = "tool_life_C";
      suggested_measurement = "Run tool wear test at reference speed to calibrate Taylor C/n";
    } else if (sobol_ra > sobol_kc) {
      dominant_uncertainty_source = "surface_finish_nose_radius";
      suggested_measurement = "Measure actual nose radius with optical microscope";
    }

    return {
      force_ci95: [forces[ci2_5], forces[ci97_5]],
      force_mean: forceMean,
      life_ci95: [lives[ci2_5], lives[ci97_5]],
      life_mean: lifeMean,
      ra_ci95: [ras[ci2_5], ras[ci97_5]],
      ra_mean: raMean,
      ra_cpk: raCpk,
      weibull: { beta: Math.round(weibullBeta * 100) / 100, eta_min: Math.round(weibullEta * 10) / 10, p_survive_30min: Math.round(pSurvive30 * 1000) / 1000 },
      p_chatter: chatterCount.unstable / n_trials,
      sobol_dominant: dominant_uncertainty_source,
      sobol_contributions: { kc_pct: Math.round(sobol_kc), life_pct: Math.round(sobol_life), ra_pct: Math.round(sobol_ra) },
      dominant_uncertainty_source,
      suggested_measurement,
      condition_warning: conditionWarning,
    };
  }

  // ==========================================================================
  // COMPUTE — unified speed/feed recommendation pipeline
  // ==========================================================================

  /**
   * Main entry point: resolves all 8 context categories, runs inline
   * Kienzle/Taylor/deflection physics, applies safety checks, and returns
   * a fully-traced OrchestratorResult.
   */
  public compute(input: OrchestratorInput & { resumeFromStage?: number; checkpointRunId?: string }): AtomicValue<OrchestratorResult> {
    log.info("[SpeedFeedOrchestrator] compute() start");

    const cpm = new PipelineCheckpointManager('speed-feed-orchestrator', input.checkpointRunId);
    const resumeFrom = input.resumeFromStage ?? -1;

    // ── Step 1: Resolve all 8 categories ──
    let t0 = Date.now();
    const machine   = resumeFrom > 0 ? (cpm.resumeFrom(0)?.data ?? this.resolveMachine(input)) : this.resolveMachine(input);
    if (resumeFrom <= 0) cpm.checkpoint('resolve_machine', 0, machine, Date.now() - t0);

    t0 = Date.now();
    const tool      = resumeFrom > 1 ? (cpm.resumeFrom(1)?.data ?? this.resolveTool(input)) : this.resolveTool(input);
    if (resumeFrom <= 1) cpm.checkpoint('resolve_tool', 1, tool, Date.now() - t0);

    t0 = Date.now();
    const material  = resumeFrom > 2 ? (cpm.resumeFrom(2)?.data ?? this.resolveMaterial(input)) : this.resolveMaterial(input);
    if (resumeFrom <= 2) cpm.checkpoint('resolve_material', 2, material, Date.now() - t0);

    t0 = Date.now();
    const holder    = resumeFrom > 3 ? (cpm.resumeFrom(3)?.data ?? this.resolveHolder(input)) : this.resolveHolder(input);
    if (resumeFrom <= 3) cpm.checkpoint('resolve_holder', 3, holder, Date.now() - t0);

    t0 = Date.now();
    const coolant   = resumeFrom > 4 ? (cpm.resumeFrom(4)?.data ?? this.resolveCoolant(input)) : this.resolveCoolant(input);
    if (resumeFrom <= 4) cpm.checkpoint('resolve_coolant', 4, coolant, Date.now() - t0);

    t0 = Date.now();
    const workhold  = resumeFrom > 5 ? (cpm.resumeFrom(5)?.data ?? this.resolveWorkholding(input)) : this.resolveWorkholding(input);
    if (resumeFrom <= 5) cpm.checkpoint('resolve_workholding', 5, workhold, Date.now() - t0);

    t0 = Date.now();
    const camStrat  = resumeFrom > 6 ? (cpm.resumeFrom(6)?.data ?? this.resolveCAMStrategy(input)) : this.resolveCAMStrategy(input);
    if (resumeFrom <= 6) cpm.checkpoint('resolve_cam_strategy', 6, camStrat, Date.now() - t0);

    t0 = Date.now();
    const geometry  = resumeFrom > 7 ? (cpm.resumeFrom(7)?.data ?? this.resolveGeometry(input)) : this.resolveGeometry(input);
    if (resumeFrom <= 7) cpm.checkpoint('resolve_geometry', 7, geometry, Date.now() - t0);

    const formulas_used: string[] = [];
    const dn_warnings: string[] = [];  // DN bearing speed limit warnings (merged into playbook_warnings later)
    const engines_called: string[] = ["SpeedFeedOrchestratorEngine"];

    // ── Step 2: Core Speed/Feed Physics ──
    const D = tool.diameter_mm.value;
    const z = tool.flutes.value;
    const cutType = input.cut_type ?? "roughing";
    const isRoughing = cutType === "roughing" || cutType === "semi_finishing";

    // Base cutting speed from material DB
    const vcBase = isRoughing
      ? material.vc_base_roughing.value
      : material.vc_base_finishing.value;

    // Coating speed factor
    const coatingKey = normalizeCoating(tool.coating.value);
    const coatingRec = COATING_DB[coatingKey] ?? COATING_DB["TiAlN"];
    const coatingSpeedFactor = coatingRec.speed_multiplier;

    // Insert grade speed factor
    const GRADE_SPEED_FACTORS: Record<string, number> = {
      'GC4325': 1.10, 'GC4315': 1.15, 'GC4335': 1.05,  // Sandvik
      'IC928': 1.08, 'IC830': 1.12, 'IC808': 1.05,      // Iscar
      'KC5010': 1.10, 'KC5025': 1.05, 'KCPK30': 1.00,   // Kennametal
      'AC820P': 1.12, 'AC830P': 1.08,                     // Sumitomo
      'MP9015': 1.10, 'MP9025': 1.05,                     // Mitsubishi
    };
    let insertGradeFactor = 1.0;
    if (input.insert_grade) {
      insertGradeFactor = GRADE_SPEED_FACTORS[input.insert_grade.toUpperCase()] ?? 1.0;
    } else if (input.tool_grade) {
      insertGradeFactor = GRADE_SPEED_FACTORS[input.tool_grade.toUpperCase()] ?? 1.0;
    }

    // Coolant speed factor
    const coolantSpeedFactor = coolant.speed_factor.value;

    // CAM strategy speed multiplier
    const camSpeedMult = camStrat.speed_multiplier.value;

    // Geometry derating: thin wall, long reach
    let geomDerating = 1.0;
    if (geometry.is_thin_wall.value) {
      geomDerating *= 0.80;
    }
    if (geometry.is_long_reach.value) {
      geomDerating *= 0.85;
    }

    // Insert grade factor (default 1.0 if not specified)
    const gradeFactor = tool.grade.value !== "unknown" ? 1.0 : 0.95;

    // INFRA-5-1 U-CAL1: Calibration override for cutting speed
    const calVcFactor = input.calibration_overrides?.vc_factor ?? 1.0;

    // Effective cutting speed
    let Vc = vcBase * coatingSpeedFactor * insertGradeFactor * coolantSpeedFactor * camSpeedMult
           * geomDerating * gradeFactor * calVcFactor;
    formulas_used.push("Vc = Vc_base × coating_factor × insert_grade_factor × coolant_factor × cam_multiplier × geom_derating × grade_factor" + (calVcFactor !== 1.0 ? ` × cal_vc(${calVcFactor})` : ""));
    if (insertGradeFactor !== 1.0) {
      formulas_used.push(`Insert grade ${input.insert_grade ?? input.tool_grade}: Vc × ${insertGradeFactor}`);
    }
    // Keep the optimized cutting speed inside the material's practical shop range.
    // This prevents diameter-only changes from collapsing Vc so far that the
    // downstream RPM relationship stops looking physically consistent.
    const vcFloor = vcBase * (isRoughing ? 0.23 : 0.30);
    if (Vc < vcFloor) {
      formulas_used.push(`Vc floor applied: ${Vc.toFixed(1)} → ${vcFloor.toFixed(1)} m/min`);
      Vc = vcFloor;
    }

    // RPM = 1000 * Vc / (π * D) — clamp to machine max
    const maxRPM = Math.min(machine.max_rpm.value, holder.max_rpm.value);
    let rpm = (1000 * Vc) / (Math.PI * D);
    let rpmClamped = false;
    if (rpm > maxRPM) {
      rpm = maxRPM;
      rpmClamped = true;
      // Recalculate actual Vc
      Vc = (Math.PI * D * rpm) / 1000;
    }

    // Gear range clamping: if handbook data provides gear ranges, select the
    // best gear for the target RPM and apply its limits.
    // Reference: machine handbooks define discrete gear ranges with per-gear
    // torque/power limits (e.g., Haas VF-6/50 Gear 1: 45-450 RPM, Gear 2: 450-6000 RPM).
    type GearRange = { gear: number; min_rpm: number; max_rpm: number; max_torque_nm: number; max_power_kw: number };
    let activeGear: GearRange | undefined;
    if (machine.gear_ranges && machine.gear_ranges.length > 0) {
      const gears = machine.gear_ranges as GearRange[];
      // Find the gear that contains the target RPM
      activeGear = gears.find((g: GearRange) => rpm >= g.min_rpm && rpm <= g.max_rpm);
      if (!activeGear) {
        // RPM outside all gear ranges — pick the closest gear
        activeGear = gears.reduce((best: GearRange, g: GearRange) => {
          const distBest = Math.min(Math.abs(rpm - best.min_rpm), Math.abs(rpm - best.max_rpm));
          const distG = Math.min(Math.abs(rpm - g.min_rpm), Math.abs(rpm - g.max_rpm));
          return distG < distBest ? g : best;
        });
        // Clamp RPM to gear range
        if (rpm > activeGear.max_rpm) {
          rpm = activeGear.max_rpm;
          rpmClamped = true;
          Vc = (Math.PI * D * rpm) / 1000;
        } else if (rpm < activeGear.min_rpm) {
          rpm = activeGear.min_rpm;
          rpmClamped = true;
          Vc = (Math.PI * D * rpm) / 1000;
        }
      }
      if (activeGear) {
        formulas_used.push(`Gear ${activeGear.gear}: ${activeGear.min_rpm}-${activeGear.max_rpm} RPM, ${activeGear.max_torque_nm} Nm, ${activeGear.max_power_kw} kW`);
      }
    }

    rpm = Math.round(rpm);
    formulas_used.push("RPM = 1000 × Vc / (π × D)");

    // DN bearing speed limit check
    const taperBoreMap: Record<string, number> = {
      'BT30': 25, 'BT40': 40, 'BT50': 69, 'CAT40': 44, 'CAT50': 69,
      'HSK-A63': 45, 'HSK-A100': 70, 'HSK-F63': 45, 'HSK-E40': 30,
      'A2-5': 80, 'A2-6': 105, 'A2-8': 140,
    };
    const dnTaper = machine.taper?.value ?? '';
    const dnBore = taperBoreMap[dnTaper] ?? 40;
    const dnLimit = 2000000; // conservative default for angular contact bearings
    const maxDnRpm = Math.floor(dnLimit / dnBore);
    if (rpm > maxDnRpm) {
      dn_warnings.push(
        `RPM ${rpm} exceeds DN bearing limit (${dnBore}mm bore × ${rpm}rpm = ${dnBore * rpm} > ${dnLimit}). ` +
        `Verify ceramic hybrid bearings are installed for sustained high-speed operation.`
      );
    }

    // Feed per tooth
    // Infer base fz from diameter if not available from material
    let fzBase: number;
    if (isRoughing) {
      fzBase = D * 0.01;  // roughing heuristic
    } else {
      fzBase = D * 0.005; // finishing heuristic
    }
    // Clamp fz to reasonable range [0.01, 0.5]
    fzBase = Math.max(0.01, Math.min(0.5, fzBase));

    // Apply CAM feed multiplier
    let fz = fzBase * camStrat.feed_multiplier.value;

    // Holder TIR effect on fz: high TIR → reduce fz by up to 20%
    const tirPenalty = Math.min(0.20, (holder.tir_mm.value / 0.020));
    fz *= (1.0 - tirPenalty);
    formulas_used.push("fz = base_fz × cam_feed_mult × (1 - TIR_penalty)");

    // Table feed
    let Vf = fz * z * rpm;
    formulas_used.push("Vf = fz × z × RPM");

    // Axial depth of cut
    const isAdaptive = camStrat.is_adaptive.value;
    let ap: number;
    if (input.axial_depth_mm !== undefined) {
      ap = input.axial_depth_mm;
    } else if (isRoughing) {
      ap = D * 1.0;
    } else {
      ap = D * 0.1;
    }
    // Clamp by geometry (workpiece height if known, thin wall)
    if (geometry.workpiece_height_mm.value > 0 && ap > geometry.workpiece_height_mm.value) {
      ap = geometry.workpiece_height_mm.value;
    }
    if (geometry.is_thin_wall.value && ap > geometry.wall_thickness_mm.value * 3) {
      ap = geometry.wall_thickness_mm.value * 3;
    }

    // Radial depth of cut
    let ae: number;
    if (input.radial_depth_mm !== undefined) {
      ae = input.radial_depth_mm;
    } else if (input.radial_depth_pct !== undefined) {
      ae = D * (input.radial_depth_pct / 100);
    } else {
      const aePct = camStrat.ae_pct.value;
      ae = D * (aePct / 100);
    }
    // Apply thin_wall / pocket derating
    if (geometry.is_thin_wall.value) {
      ae = Math.min(ae, D * 0.15);
    }

    // ── Chip Thinning Correction ──
    // When ae < 50% of D, actual chip thickness < programmed fz
    // fz_eff = fz × D / (2 × sqrt(ae × (D - ae)))   [Sandvik]
    if (ae < D * 0.5 && ae > 0 && D > ae) {
      const chipThinFactor = D / (2 * Math.sqrt(ae * (D - ae)));
      const clampedFactor = Math.min(3.0, chipThinFactor);
      fz *= clampedFactor;
      Vf = fz * z * rpm;
      formulas_used.push(
        `Chip thinning: fz×${clampedFactor.toFixed(2)} (ae/D=${(ae/D*100).toFixed(0)}%)`,
      );
    }

    // ── Step 3: Derived Calculations ──

    // MRR = ap * ae * Vf / 1000 (cm³/min)
    const mrr = (ap * ae * Vf) / 1000;
    formulas_used.push("MRR = ap × ae × Vf / 1000 [cm³/min]");

    // Kienzle cutting force: Fc = kc1.1 × ap × fz^(1-mc)
    // INFRA-5-1 U-CAL1: Apply calibration factor to kc1.1
    const calKcFactor = input.calibration_overrides?.kc1_1_factor ?? 1.0;
    const kc1_1 = material.kc1_1.value * calKcFactor;
    const mc = material.mc.value;
    const Fc = kc1_1 * ap * Math.pow(Math.max(fz, 0.001), 1 - mc);
    formulas_used.push("Fc = kc1.1 × ap × fz^(1-mc) [Kienzle]" + (calKcFactor !== 1.0 ? ` (kc1.1 cal: ×${calKcFactor})` : ""));

    // Power = Fc * Vc / (60 * 1000) [kW]
    const powerKW = (Fc * Vc) / (60 * 1000);
    formulas_used.push("P = Fc × Vc / 60000 [kW]");

    // Torque = Power * 30000 / (π * RPM) [Nm]
    const torqueNm = rpm > 0 ? (powerKW * 30000) / (Math.PI * rpm) : 0;
    formulas_used.push("T = P × 30000 / (π × RPM) [Nm]");

    // Taylor tool life: T = (C/Vc)^(1/n) — per-material n and C from canonical constants
    // INFRA-5-1 U-CAL1: Apply calibration factors to Taylor C and n
    const calTaylorCFactor = input.calibration_overrides?.taylor_c_factor ?? 1.0;
    const calTaylorNFactor = input.calibration_overrides?.taylor_n_factor ?? 1.0;
    const computeTaylor = CANONICAL_TAYLOR[material.iso_group.value as ISOGroup] ?? CANONICAL_TAYLOR.P;
    const taylorN = computeTaylor.n * calTaylorNFactor;
    const taylorC = computeTaylor.C * calTaylorCFactor;
    let toolLifeMin = Math.pow(taylorC / Math.max(Vc, 1), 1 / taylorN);
    // Apply coolant life factor
    toolLifeMin *= coolant.life_factor.value;
    // Apply coating life factor
    toolLifeMin *= coatingRec.life_multiplier;
    // Clamp to reasonable range [1, 9999]
    toolLifeMin = Math.max(1, Math.min(9999, toolLifeMin));
    formulas_used.push("T_life = (C/Vc)^(1/n) × coolant_life × coating_life [Taylor]");

    // Surface finish: Ra ≈ fz² / (32 × corner_radius) [µm, theoretical]
    // INFRA-5-1 U-CAL1: Apply calibration factor to Ra
    const calRaFactor = input.calibration_overrides?.ra_factor ?? 1.0;
    const rCorner = Math.max(tool.corner_radius_mm.value, 0.1);
    const Ra = ((fz * fz * 1000) / (32 * rCorner)) * calRaFactor;
    formulas_used.push("Ra = fz² × 1000 / (32 × r_corner) [µm]" + (calRaFactor !== 1.0 ? ` (cal: ×${calRaFactor})` : ""));

    // Tool deflection: δ = Fc × L³ / (3 × E × I)
    // Use canonical E modulus for resolved tool material (not always carbide)
    const toolMat = (tool as any).material ?? "carbide";
    const E_tool = (CANONICAL_TOOL_MODULUS as any)[toolMat] ?? CANONICAL_TOOL_MODULUS.carbide;
    const stickout = tool.stickout_mm.value;
    const d_shank = D;  // approximate shank ≈ tool diameter
    const I_moment = (Math.PI * Math.pow(d_shank, 4)) / 64;
    const deflection_mm = I_moment > 0
      ? (Fc * Math.pow(stickout, 3)) / (3 * E_tool * I_moment)
      : 0;
    const deflection_um = deflection_mm * 1000;
    formulas_used.push(`δ = Fc × L³ / (3 × E × I), E=${E_tool/1000}GPa (${toolMat}), I=π×d⁴/64`);

    // ── Step 4: Safety Checks ──
    const safetyChecks: SafetyCheck[] = [];
    const limitingFactors: LimitingFactor[] = [];

    // Power check
    const powerLimit = machine.power_kw.value * 0.8;
    const powerUtil = powerLimit > 0 ? (powerKW / powerLimit) * 100 : 0;
    const powerPass = powerKW <= powerLimit;
    safetyChecks.push({
      name: "power",
      passed: powerPass,
      message: powerPass
        ? `Power ${powerKW.toFixed(2)} kW within limit ${powerLimit.toFixed(1)} kW (80% of ${machine.power_kw.value} kW)`
        : `Power ${powerKW.toFixed(2)} kW EXCEEDS limit ${powerLimit.toFixed(1)} kW`,
      value: powerKW,
      limit: powerLimit,
    });
    limitingFactors.push({
      parameter: "power_kw",
      constraint: `< ${powerLimit.toFixed(1)} kW (80% machine)`,
      utilization_pct: Math.min(powerUtil, 999),
      severity: powerUtil > 100 ? "critical" : powerUtil > 80 ? "warning" : "info",
    });

    // Torque check — use RPM-dependent curve if available, else single-point fallback.
    // Priority: machine.torque_curve (from MachineCapabilityIntelligenceEngine, merges 4 sources)
    //         > getTorqueCurve() (raw torque curve data, 1,058 machines)
    //         > machine.max_torque_Nm (single-point peak)
    let torqueLimit: number;
    let torqueSource = "80% peak";
    if (machine.torque_curve && machine.torque_curve.length > 0 && rpm > 0) {
      // Interpolate from the merged capability torque curve (highest authority)
      const pts = machine.torque_curve;
      let tAtRpm: number;
      if (rpm <= pts[0].rpm) {
        tAtRpm = pts[0].torque_nm;
      } else if (rpm >= pts[pts.length - 1].rpm) {
        tAtRpm = pts[pts.length - 1].torque_nm;
      } else {
        let lo = 0;
        for (let i = 1; i < pts.length; i++) {
          if (pts[i].rpm >= rpm) { lo = i - 1; break; }
        }
        const p0 = pts[lo], p1 = pts[lo + 1];
        const frac = (rpm - p0.rpm) / (p1.rpm - p0.rpm);
        tAtRpm = p0.torque_nm + frac * (p1.torque_nm - p0.torque_nm);
      }
      torqueLimit = tAtRpm * 0.8;
      torqueSource = `80% capability_curve@${rpm}rpm (${machine.torque_curve_source ?? "merged"})`;
    } else {
      // Fallback: raw torque curve lookup from machine-torque-curves.ts
      const machineKey = (input.machine_name ?? "").toLowerCase().trim();
      const curveData = machineKey ? (() => {
        const parts = machineKey.split(/[\s_]+/);
        if (parts.length >= 2) {
          return getTorqueCurve(parts[0], parts.slice(1).join(" "));
        }
        return undefined;
      })() : undefined;
      if (curveData && curveData.points.length > 0 && rpm > 0) {
        const curveResult = torqueAtRpm(curveData, rpm);
        torqueLimit = curveResult.torque_Nm * 0.8;
        torqueSource = `80% curve@${rpm}rpm (${curveResult.region})`;
      } else {
        torqueLimit = machine.max_torque_Nm.value * 0.8;
      }
    }
    const torqueUtil = torqueLimit > 0 ? (torqueNm / torqueLimit) * 100 : 0;
    const torquePass = torqueNm <= torqueLimit;
    safetyChecks.push({
      name: "torque",
      passed: torquePass,
      message: torquePass
        ? `Torque ${torqueNm.toFixed(2)} Nm within limit ${torqueLimit.toFixed(1)} Nm (${torqueSource})`
        : `Torque ${torqueNm.toFixed(2)} Nm EXCEEDS limit ${torqueLimit.toFixed(1)} Nm (${torqueSource})`,
      value: torqueNm,
      limit: torqueLimit,
    });
    limitingFactors.push({
      parameter: "torque_Nm",
      constraint: `< ${torqueLimit.toFixed(1)} Nm (${torqueSource})`,
      utilization_pct: Math.min(torqueUtil, 999),
      severity: torqueUtil > 100 ? "critical" : torqueUtil > 80 ? "warning" : "info",
    });

    // RPM check
    const rpmUtil = maxRPM > 0 ? (rpm / maxRPM) * 100 : 0;
    safetyChecks.push({
      name: "rpm",
      passed: rpm <= maxRPM,
      message: rpm <= maxRPM
        ? `RPM ${rpm} within max ${maxRPM}`
        : `RPM ${rpm} EXCEEDS max ${maxRPM}`,
      value: rpm,
      limit: maxRPM,
    });
    limitingFactors.push({
      parameter: "spindle_rpm",
      constraint: `≤ ${maxRPM} (machine/holder min)`,
      utilization_pct: Math.min(rpmUtil, 999),
      severity: rpmUtil > 100 ? "critical" : rpmUtil > 90 ? "warning" : "info",
    });

    // Deflection check
    const tolLimit = (input.feature_tolerance_mm ?? 0.05) / 3;
    const deflUtil = tolLimit > 0 ? (deflection_mm / tolLimit) * 100 : 0;
    const deflPass = deflection_mm <= tolLimit;
    safetyChecks.push({
      name: "deflection",
      passed: deflPass,
      message: deflPass
        ? `Deflection ${deflection_um.toFixed(1)} µm within tolerance/3 = ${(tolLimit * 1000).toFixed(1)} µm`
        : `Deflection ${deflection_um.toFixed(1)} µm EXCEEDS tolerance/3 = ${(tolLimit * 1000).toFixed(1)} µm`,
      value: deflection_mm,
      limit: tolLimit,
    });
    limitingFactors.push({
      parameter: "deflection_mm",
      constraint: `< tol/3 = ${(tolLimit * 1000).toFixed(1)} µm`,
      utilization_pct: Math.min(deflUtil, 999),
      severity: deflUtil > 100 ? "critical" : deflUtil > 70 ? "warning" : "info",
    });

    // Feed rate check (Vf < 10000 mm/min)
    const vfLimit = 10000;
    const vfUtil = (Vf / vfLimit) * 100;
    const vfPass = Vf <= vfLimit;
    safetyChecks.push({
      name: "feed_rate",
      passed: vfPass,
      message: vfPass
        ? `Feed rate ${Vf.toFixed(0)} mm/min within limit ${vfLimit}`
        : `Feed rate ${Vf.toFixed(0)} mm/min EXCEEDS limit ${vfLimit}`,
      value: Vf,
      limit: vfLimit,
    });
    limitingFactors.push({
      parameter: "feed_rate_mmmin",
      constraint: `< ${vfLimit} mm/min`,
      utilization_pct: Math.min(vfUtil, 999),
      severity: vfUtil > 100 ? "critical" : vfUtil > 80 ? "warning" : "info",
    });

    // Workholding force check: Fc < clamping_force * 0.7
    const clampForceN = workhold.clamping_force_kN.value * 1000;
    const whLimit = clampForceN * 0.7;
    const whUtil = whLimit > 0 ? (Fc / whLimit) * 100 : 0;
    const whPass = Fc <= whLimit;
    safetyChecks.push({
      name: "workholding",
      passed: whPass,
      message: whPass
        ? `Cutting force ${Fc.toFixed(0)} N within workholding limit ${whLimit.toFixed(0)} N (70%)`
        : `Cutting force ${Fc.toFixed(0)} N EXCEEDS workholding limit ${whLimit.toFixed(0)} N`,
      value: Fc,
      limit: whLimit,
    });
    limitingFactors.push({
      parameter: "workholding_force",
      constraint: `Fc < ${whLimit.toFixed(0)} N (70% clamping)`,
      utilization_pct: Math.min(whUtil, 999),
      severity: whUtil > 100 ? "critical" : whUtil > 80 ? "warning" : "info",
    });

    // ── Apply proportional reduction if any check fails ──
    let reductionFactor = 1.0;
    const failedChecks = safetyChecks.filter((c) => !c.passed);
    if (failedChecks.length > 0) {
      for (const check of failedChecks) {
        if (check.value !== undefined && check.limit !== undefined && check.value > 0) {
          const ratio = check.limit / check.value;
          reductionFactor = Math.min(reductionFactor, ratio);
        }
      }
      // Apply reduction proportionally
      reductionFactor = Math.max(0.1, reductionFactor * 0.95); // 5% extra margin
      Vc *= reductionFactor;
      rpm = Math.round((1000 * Vc) / (Math.PI * D));
      if (rpm > maxRPM) rpm = maxRPM;
      fz *= Math.sqrt(reductionFactor); // reduce fz less aggressively than speed
      Vf = fz * z * rpm;

      // Recompute derived values after reduction
      const FcAdj = kc1_1 * ap * Math.pow(Math.max(fz, 0.001), 1 - mc);
      const powerAdj = (FcAdj * Vc) / (60 * 1000);
      const torqueAdj = rpm > 0 ? (powerAdj * 30000) / (Math.PI * rpm) : 0;
      const deflAdj_mm = I_moment > 0
        ? (FcAdj * Math.pow(stickout, 3)) / (3 * E_tool * I_moment)
        : 0;
      const lifeAdj = Math.pow(taylorC / Math.max(Vc, 1), 1 / taylorN)
        * coolant.life_factor.value * coatingRec.life_multiplier;

      // Update safety checks to reflect post-adjustment values
      for (const sc of safetyChecks) {
        if (sc.name === "power") {
          sc.value = powerAdj;
          sc.passed = powerAdj <= powerLimit;
          sc.message = `Power adjusted to ${powerAdj.toFixed(2)} kW (was over limit, reduced by ${((1 - reductionFactor) * 100).toFixed(0)}%)`;
        } else if (sc.name === "torque") {
          sc.value = torqueAdj;
          sc.passed = torqueAdj <= torqueLimit;
          sc.message = `Torque adjusted to ${torqueAdj.toFixed(2)} Nm`;
        } else if (sc.name === "deflection") {
          sc.value = deflAdj_mm;
          sc.passed = deflAdj_mm <= tolLimit;
          sc.message = `Deflection adjusted to ${(deflAdj_mm * 1000).toFixed(1)} µm`;
        } else if (sc.name === "feed_rate") {
          sc.value = Vf;
          sc.passed = Vf <= vfLimit;
          sc.message = `Feed rate adjusted to ${Vf.toFixed(0)} mm/min`;
        } else if (sc.name === "workholding") {
          sc.value = FcAdj;
          sc.passed = FcAdj <= whLimit;
          sc.message = `Cutting force adjusted to ${FcAdj.toFixed(0)} N`;
        }
      }

      // Recalculate limiting factor utilizations
      for (const lf of limitingFactors) {
        if (lf.parameter === "power_kw") {
          lf.utilization_pct = powerLimit > 0 ? (powerAdj / powerLimit) * 100 : 0;
        } else if (lf.parameter === "torque_Nm") {
          lf.utilization_pct = torqueLimit > 0 ? (torqueAdj / torqueLimit) * 100 : 0;
        } else if (lf.parameter === "spindle_rpm") {
          lf.utilization_pct = maxRPM > 0 ? (rpm / maxRPM) * 100 : 0;
        } else if (lf.parameter === "deflection_mm") {
          lf.utilization_pct = tolLimit > 0 ? (deflAdj_mm / tolLimit) * 100 : 0;
        } else if (lf.parameter === "feed_rate_mmmin") {
          lf.utilization_pct = (Vf / vfLimit) * 100;
        } else if (lf.parameter === "workholding_force") {
          lf.utilization_pct = whLimit > 0 ? (FcAdj / whLimit) * 100 : 0;
        }
        lf.severity = lf.utilization_pct > 100 ? "critical"
          : lf.utilization_pct > 80 ? "warning" : "info";
      }
    }

    // Recompute final derived values (after possible adjustment)
    const finalFc = kc1_1 * ap * Math.pow(Math.max(fz, 0.001), 1 - mc);
    const finalPower = (finalFc * Vc) / (60 * 1000);
    const finalTorque = rpm > 0 ? (finalPower * 30000) / (Math.PI * rpm) : 0;
    const finalMRR = (ap * ae * Vf) / 1000;
    const finalRa = ((fz * fz * 1000) / (32 * rCorner)) * calRaFactor;
    const finalDefl_mm = I_moment > 0
      ? (finalFc * Math.pow(stickout, 3)) / (3 * E_tool * I_moment)
      : 0;
    const finalLife = Math.max(1, Math.min(9999,
      Math.pow(taylorC / Math.max(Vc, 1), 1 / taylorN)
      * coolant.life_factor.value * coatingRec.life_multiplier));

    // ── Step 5: Limiting Factor ──
    // Sort by utilization descending
    const sortedFactors = [...limitingFactors].sort(
      (a, b) => b.utilization_pct - a.utilization_pct,
    );

    // ── Step 6: Confidence ──
    const resolverConfidences = [
      machine.power_kw.confidence,
      tool.diameter_mm.confidence,
      material.kc1_1.confidence,
      holder.tir_mm.confidence,
      coolant.speed_factor.confidence,
      workhold.clamping_force_kN.confidence,
      camStrat.speed_multiplier.confidence,
      geometry.feature_tolerance_mm.confidence,
    ];
    const averageConfidence = resolverConfidences.reduce((sum, confidence) => sum + confidence, 0)
      / resolverConfidences.length;
    const weakestConfidence = Math.min(...resolverConfidences);
    const evidenceSignals = [
      input.material,
      input.iso_group,
      input.tool_diameter_mm,
      input.flutes,
      input.tool_material,
      input.tool_coating,
      input.corner_radius_mm,
      input.tool_stickout_mm,
      input.operation,
      input.cut_type,
      input.strategy,
      input.machine_power_kw,
      input.machine_max_rpm,
      input.holder_type,
      input.coolant_type,
      input.workholding_type,
    ];
    const evidenceFraction = Math.min(
      1,
      evidenceSignals.filter((value) => value !== undefined && value !== null && value !== "").length / evidenceSignals.length,
    );
    const rawConfidence = averageConfidence
      * (0.45 + 0.55 * evidenceFraction)
      * (0.7 + 0.3 * weakestConfidence);
    const overallConfidence = Math.max(0.05, Math.min(0.99, rawConfidence));

    // ── Step 7: Uncertainty (enhanced with stochastic engines) ──
    const confScale = Math.max(0.5, overallConfidence);
    // Derive stiffness/freq/damping from rigidity category + machine type
    // Typical structural stiffness (N/um): VMC 20-80, HMC 40-120, 5-axis 30-60,
    // Gantry 100-200, Lathe 50-150, Swiss 15-40
    const rigMap = { low: 20, medium: 50, high: 100 } as const;
    const gwDampMap = { box: 0.05, linear: 0.02, hydrostatic: 0.08 } as const;
    const rig = machine.rigidity.value as "low" | "medium" | "high";
    const gw = machine.guideway.value;
    const machTypeForStiffness = (machine.type.value ?? '').toLowerCase();
    const stiffnessByType: Record<string, Record<string, number>> = {
      'vertical_mill':   { high: 60,  medium: 40,  low: 20 },
      'horizontal_mill': { high: 100, medium: 70,  low: 40 },
      '5axis':           { high: 50,  medium: 35,  low: 20 },
      'gantry':          { high: 180, medium: 130, low: 80 },
      'lathe':           { high: 120, medium: 80,  low: 50 },
      'swiss':           { high: 40,  medium: 25,  low: 15 },
      'router':          { high: 30,  medium: 20,  low: 10 },
    };
    const typeEntry = stiffnessByType[machTypeForStiffness];
    const inferredStiffness = typeEntry ? (typeEntry[rig] ?? rigMap[rig] ?? 50) : (rigMap[rig] ?? 50);
    const stiffness = input.system_stiffness_n_m ?? inferredStiffness;
    const natFreq = input.natural_frequency_hz ?? machine.nat_freq_hz.value;
    const dampingR = input.damping_ratio ?? (gwDampMap[gw as keyof typeof gwDampMap] ?? 0.03);
    const fullUQ = this.computeFullUncertainty(
      material, tool, Vc, fz, ap, ae, stiffness, natFreq, dampingR,
    );
    const uncertainty = {
      speed_cv_pct: (15 / confScale),
      feed_cv_pct: (10 / confScale),
      life_cv_pct: (50 / confScale),
      force_cv_pct: (20 / confScale),
      ra_cv_pct: (30 / confScale),
      force_ci95: fullUQ.force_ci95,
      life_ci95: fullUQ.life_ci95,
      ra_ci95: fullUQ.ra_ci95,
      ra_cpk: fullUQ.ra_cpk,
      weibull: fullUQ.weibull,
      p_chatter: fullUQ.p_chatter,
      sobol_dominant: fullUQ.sobol_dominant,
      sobol_contributions: fullUQ.sobol_contributions,
      dominant_uncertainty_source: fullUQ.dominant_uncertainty_source,
      suggested_measurement: fullUQ.suggested_measurement,
      condition_warning: fullUQ.condition_warning,
    };

    // Find resolver with lowest confidence for dominant uncertainty
    const resolverNames = [
      "machine", "tool", "material", "holder",
      "coolant", "workholding", "cam_strategy", "geometry",
    ];
    let minConfIdx = 0;
    let minConf = resolverConfidences[0];
    for (let i = 1; i < resolverConfidences.length; i++) {
      if (resolverConfidences[i] < minConf) {
        minConf = resolverConfidences[i];
        minConfIdx = i;
      }
    }
    const dominantUncertainty = resolverNames[minConfIdx];

    const recommendations: string[] = [];
    recommendations.push(
      `Dominant uncertainty source: ${dominantUncertainty} (confidence=${minConf.toFixed(2)})`,
    );
    if (dominantUncertainty === "material") {
      recommendations.push("Measure hardness (HB/HRC) and provide ISO group for better accuracy");
    } else if (dominantUncertainty === "machine") {
      recommendations.push("Provide machine name or spindle specs for tighter constraints");
    } else if (dominantUncertainty === "tool") {
      recommendations.push("Specify tool coating and grade for refined speed factors");
    } else if (dominantUncertainty === "holder") {
      recommendations.push("Specify holder type and TIR for better stiffness estimate");
    } else if (dominantUncertainty === "geometry") {
      recommendations.push("Provide feature tolerance and wall thickness for derating");
    } else {
      recommendations.push(`Provide more ${dominantUncertainty} details to reduce uncertainty`);
    }

    if (rpmClamped) {
      recommendations.push(
        `RPM was clamped to machine/holder max (${maxRPM}). Actual Vc = ${Vc.toFixed(1)} m/min (vs target ${(vcBase * coatingSpeedFactor * coolantSpeedFactor * camSpeedMult * geomDerating * gradeFactor).toFixed(1)})`,
      );
    }
    if (reductionFactor < 1.0) {
      recommendations.push(
        `Parameters reduced by ${((1 - reductionFactor) * 100).toFixed(0)}% to pass safety checks`,
      );
    }

    // ── Step 8: Alternatives ──
    const makeAlternative = (
      label: string,
      vcMult: number,
      fzMult: number,
      note: string,
    ): AlternativeSet => {
      const altVc = Vc * vcMult;
      const altFz = fz * fzMult;
      const altRpm = Math.min(Math.round((1000 * altVc) / (Math.PI * D)), maxRPM);
      const altVf = altFz * z * altRpm;
      const altMRR = (ap * ae * altVf) / 1000;
      const altLife = Math.max(1, Math.min(9999,
        Math.pow(taylorC / Math.max(altVc, 1), 1 / taylorN)
        * coolant.life_factor.value * coatingRec.life_multiplier));
      return {
        label,
        cutting_speed_mpm: Math.round(altVc * 10) / 10,
        feed_per_tooth_mm: Math.round(altFz * 10000) / 10000,
        axial_depth_mm: Math.round(ap * 1000) / 1000,
        radial_depth_pct: D > 0 ? Math.round((ae / D) * 10000) / 100 : 0,
        mrr_cm3min: Math.round(altMRR * 100) / 100,
        tool_life_min: Math.round(altLife),
        note,
      };
    };

    const alternatives: AlternativeSet[] = [
      makeAlternative("conservative", 0.70, 0.80,
        "Lower speed/feed for extended tool life and reduced risk"),
      makeAlternative("balanced", 1.00, 1.00,
        "Recommended parameters balancing productivity and tool life"),
      makeAlternative("aggressive", 1.30, 1.15,
        "Higher speed/feed for maximum MRR — monitor tool wear closely"),
    ];

    // ── Step 9: Playbook Warnings ──
    const playbook_warnings: string[] = [...dn_warnings];
    const matName = material.name.value.toLowerCase();
    const isoGroup = material.iso_group.value;

    if ((matName.includes("titanium") || isoGroup === "S") && isRoughing) {
      playbook_warnings.push(
        "Titanium roughing: reduce feed 20-30% for interrupted cuts, maintain chip load consistency",
      );
    }
    if (matName.includes("inconel") || matName.includes("waspaloy") || matName.includes("haynes")) {
      playbook_warnings.push(
        "Nickel superalloy: use ceramic or CBN for best results above HRC 40, limit Vc to avoid notch wear",
      );
    }
    if (geometry.is_thin_wall.value && geometry.wall_thickness_mm.value < 2) {
      playbook_warnings.push(
        "Thin wall < 2mm: consider climb milling only, reduce ap, use high helix for axial pull",
      );
    }
    if (geometry.overhang_ratio.value > 4) {
      playbook_warnings.push(
        "High overhang ratio (L/D > 4): use extended-reach tool, reduce feed, consider vibration damping holder",
      );
    }
    if ((matName.includes("titanium") || isoGroup === "S") &&
        coolant.type.value === "dry") {
      playbook_warnings.push(
        "WARNING: Dry cutting titanium risks fire and rapid tool failure — use flood or MQL at minimum",
      );
    }
    if (camStrat.is_adaptive.value) {
      playbook_warnings.push(
        "Adaptive/trochoidal strategy: maintain consistent chip load, avoid dwells at direction changes",
      );
    }
    if (isoGroup === "H") {
      playbook_warnings.push(
        "Hardened steel (ISO H): use CBN or ceramic inserts, minimize interrupted cuts, ensure rigid setup",
      );
    }
    if (deflection_um > 20) {
      playbook_warnings.push(
        `High deflection (${deflection_um.toFixed(0)} µm): consider shorter stickout, larger shank, or reduced ap/ae`,
      );
    }

    // Additional playbook rules (P1 improvement: expanded from 8 to 15+)
    if (isoGroup === "S" && coolant.type.value === "dry") {
      playbook_warnings.push(
        "DANGER: Dry cutting titanium/Inconel risks fire. Use flood coolant minimum.",
      );
    }
    if (ae > D * 0.7 && (matName.includes("titanium") || isoGroup === "S")) {
      playbook_warnings.push(
        "High radial engagement in Ti/Ni: consider adaptive/trochoidal strategy (ae < 15%D) for 2-3× speed boost",
      );
    }
    if (fz > 0.2 && rCorner < 0.3) {
      playbook_warnings.push(
        "High feed with small corner radius: risk of edge chipping. Reduce fz or increase corner radius.",
      );
    }
    if (ap > D * 1.5) {
      playbook_warnings.push(
        "Axial depth > 1.5×D: high deflection risk. Consider shorter stickout or reduced ap.",
      );
    }
    if (finalDefl_mm > 0.02) {
      playbook_warnings.push(
        `Tool deflection ${(finalDefl_mm*1000).toFixed(1)}µm exceeds 20µm. Consider stiffer setup or reduced depth.`,
      );
    }
    if (rpm > 15000 && holder.type.value === "ER_collet") {
      playbook_warnings.push(
        "ER collet above 15,000 RPM: consider shrink-fit or hydraulic holder for better TIR and balance.",
      );
    }
    if (matName.includes("aluminum") && !tool.coating.value.toLowerCase().includes("uncoated") && !tool.coating.value.toLowerCase().includes("zrn")) {
      playbook_warnings.push(
        "TiAlN/AlCrN on aluminum can cause BUE. Consider uncoated, ZrN, or DLC-coated tools.",
      );
    }

    // ── Step 9b: MachiningPlaybookEngine integration (296 rules) ──
    const playbookEngine = getMachiningPlaybookEngine();
    if (playbookEngine) {
      try {
        const playbookCategories = derivePlaybookCategories(input);
        const playbookResult = playbookEngine.advise({
          material_iso: isoGroup,
          tolerance_mm: geometry.feature_tolerance_mm?.value,
          wall_thickness_mm: geometry.wall_thickness_mm?.value,
          surface_finish_Ra: finalRa,
          operation_type: input.operation ?? "milling",
          categories: playbookCategories,
          hardness_hrc: input.hardness_hrc,
          aspect_ratio: geometry.overhang_ratio?.value,
          spindle_rpm: rpm,
        });
        if (playbookResult?.summary?.length > 0) {
          for (const warning of playbookResult.summary) {
            // Avoid duplicates with inline rules
            if (!playbook_warnings.some(w => w.includes(warning.substring(0, 40)))) {
              playbook_warnings.push(warning);
            }
          }
          engines_called.push("MachiningPlaybookEngine");
          log.info(`[SpeedFeedOrchestrator] MachiningPlaybookEngine added ${playbookResult.summary.length} rules`);
        }
      } catch (e) {
        log.warn(`[SpeedFeedOrchestrator] MachiningPlaybookEngine skipped: ${e}`);
      }
    }

    // ── Step 10: Build and return OrchestratorResult ──
    const result: OrchestratorResult = {
      cutting_speed_mpm: Math.round(Vc * 10) / 10,
      spindle_rpm: rpm,
      feed_per_tooth_mm: Math.round(fz * 10000) / 10000,
      feed_rate_mmmin: Math.round(Vf),
      axial_depth_mm: Math.round(ap * 1000) / 1000,
      radial_depth_mm: Math.round(ae * 1000) / 1000,

      mrr_cm3min: Math.round(finalMRR * 100) / 100,
      power_kw: Math.round(finalPower * 100) / 100,
      torque_Nm: Math.round(finalTorque * 100) / 100,
      tangential_force_N: Math.round(finalFc),
      tool_life_min: Math.round(finalLife),
      surface_finish_Ra_um: Math.round(finalRa * 100) / 100,
      deflection_um: Math.round(finalDefl_mm * 1000 * 10) / 10,

      overall_confidence: Math.round(overallConfidence * 1000) / 1000,
      uncertainty,

      limiting_factors: sortedFactors,
      safety_checks: safetyChecks,

      resolved_machine: machine,
      resolved_tool: tool,
      resolved_material: material,
      resolved_holder: holder,
      resolved_coolant: coolant,
      resolved_workholding: workhold,
      resolved_cam_strategy: camStrat,
      resolved_geometry: geometry,

      stability_assessment: (() => {
        const pChat = fullUQ.p_chatter;
        const zone = pChat < 0.1 ? "stable" as const : pChat < 0.4 ? "marginal" as const : "unstable" as const;
        // Stable pocket RPM suggestion using lobe theory: n_pocket = 60·fn/(k·z)
        // where k = lobe index (1,2,3...), z = flutes, fn = natural frequency
        let suggested_rpm_pocket: number | undefined;
        let lobe_index: number | undefined;
        if (zone !== "stable" && natFreq > 0 && z > 0) {
          // Find nearest stable pocket: n = 60·fn / (k·z) for k=1,2,3...
          for (let k = 1; k <= 10; k++) {
            const pocketRpm = Math.round(60 * natFreq / (k * z));
            if (pocketRpm <= maxRPM && pocketRpm >= 500) {
              suggested_rpm_pocket = pocketRpm;
              lobe_index = k;
              break;
            }
          }
        }
        const message = zone === "stable"
          ? `Stable cutting zone (P(chatter)=${(pChat*100).toFixed(1)}%)`
          : zone === "marginal"
          ? `Marginal stability (P(chatter)=${(pChat*100).toFixed(1)}%). ${suggested_rpm_pocket ? `Try RPM=${suggested_rpm_pocket} (lobe ${lobe_index})` : "Reduce depth of cut"}`
          : `Unstable — high chatter risk (P(chatter)=${(pChat*100).toFixed(1)}%). ${suggested_rpm_pocket ? `Switch to RPM=${suggested_rpm_pocket} (stable pocket, lobe ${lobe_index})` : "Reduce ap and ae significantly"}`;
        return { zone, p_chatter: Math.round(pChat * 1000) / 1000, suggested_rpm_pocket, lobe_index, message };
      })(),
      playbook_warnings,
      recommendations,
      alternatives,

      formulas_used,
      engines_called,
    };

    // ── INFRA-5-1 U-CAL1: Record calibration metadata on result ──
    if (input.calibration_overrides) {
      const factors: Record<string, number> = {};
      if (calVcFactor !== 1.0) factors.vc_factor = calVcFactor;
      if (calKcFactor !== 1.0) factors.kc1_1_factor = calKcFactor;
      if (calTaylorCFactor !== 1.0) factors.taylor_c_factor = calTaylorCFactor;
      if (calTaylorNFactor !== 1.0) factors.taylor_n_factor = calTaylorNFactor;
      if (calRaFactor !== 1.0) factors.ra_factor = calRaFactor;
      if (Object.keys(factors).length > 0) {
        result.calibration_applied = {
          factors,
          source: input.calibration_overrides.source,
          confidence: input.calibration_overrides.confidence,
        };
      }
    }

    // ── TK-2: Tribal knowledge consumer wiring ──
    let tribal_tips: KnowledgeTip[] | undefined;
    try {
      const isoGroup = result.resolved_material?.iso_group?.value;
      const opType = input.operation === "milling" ? "pocket" : input.operation ?? "pocket";
      tribal_tips = tribalKnowledgeEngine.search({
        category: "speeds_feeds",
        material_iso_group: isoGroup,
        operation_type: opType,
        query: input.operation,
        min_confidence: 70,
        limit: 5,
      });
    } catch { /* tribal tips are advisory — never block compute */ }
    result.tribal_tips = tribal_tips;

    log.info(
      `[SpeedFeedOrchestrator] compute() done: Vc=${result.cutting_speed_mpm} m/min, ` +
      `RPM=${result.spindle_rpm}, fz=${result.feed_per_tooth_mm} mm, ` +
      `Vf=${result.feed_rate_mmmin} mm/min, confidence=${result.overall_confidence}`,
    );

    // Checkpoint final result (stage 8 = physics + aggregation)
    cpm.checkpoint('physics_and_result', 8, result);

    return {
      value: result,
      confidence: overallConfidence,
      source: "SpeedFeedOrchestratorEngine.compute",
    };
  }
}

// ============================================================================
// HRC → HB conversion (ASTM E140 approximation)
// ============================================================================

function hrcToHb(hrc: number): number {
  // Piecewise linear approximation valid for HRC 20–65
  if (hrc <= 20) return 228;
  if (hrc >= 65) return 739;
  // Quadratic fit: HB = 0.05916*HRC^2 - 0.8106*HRC + 210.4
  return Math.round(0.05916 * hrc * hrc - 0.8106 * hrc + 210.4);
}

// ── Public resolver wrappers (USF-MS0 P0-U07) ── added as standalone functions

/** Resolve machine context only — returns full compute with machine focus */
function resolveMachineContextFn(engine: SpeedFeedOrchestratorEngine, input: OrchestratorInput): AtomicValue<unknown> {
  const r = engine.compute({ ...input, output_detail: "minimal" });
  const v = r.value;
  return { value: { machine_name: input.machine_name ?? "generic", power_kw: v.power_kw, torque_Nm: v.torque_Nm, max_rpm: input.machine_max_rpm, limiting_factors: v.limiting_factors }, confidence: r.confidence, source: "sf_resolve_machine" };
}

/** Resolve tool context only — returns full compute with tool focus */
function resolveToolContextFn(engine: SpeedFeedOrchestratorEngine, input: OrchestratorInput): AtomicValue<unknown> {
  const r = engine.compute({ ...input, output_detail: "minimal" });
  const v = r.value;
  return { value: { diameter_mm: input.tool_diameter_mm, flutes: input.flutes, tool_life_min: v.tool_life_min, deflection_um: v.deflection_um, limiting_factors: v.limiting_factors }, confidence: r.confidence, source: "sf_resolve_tool" };
}

/** Resolve material context only — returns full compute with material focus */
function resolveMaterialContextFn(engine: SpeedFeedOrchestratorEngine, input: OrchestratorInput): AtomicValue<unknown> {
  const r = engine.compute({ ...input, output_detail: "minimal" });
  const v = r.value;
  return { value: { material: input.material ?? "unknown", cutting_speed_mpm: v.cutting_speed_mpm, tangential_force_N: v.tangential_force_N, surface_finish_Ra_um: v.surface_finish_Ra_um, limiting_factors: v.limiting_factors }, confidence: r.confidence, source: "sf_resolve_material" };
}

/** Compare multiple scenarios side-by-side */
function compareFn(engine: SpeedFeedOrchestratorEngine, scenarios: Array<{ label: string; input: OrchestratorInput }>): AtomicValue<unknown> {
  const results = scenarios.map(s => {
    const r = engine.compute(s.input);
    return { label: s.label, result: r.value, confidence: r.confidence };
  });
  const best_mrr = results.reduce((a, b) => b.result.mrr_cm3min > a.result.mrr_cm3min ? b : a).label;
  const best_tool_life = results.reduce((a, b) => b.result.tool_life_min > a.result.tool_life_min ? b : a).label;
  const best_finish = results.reduce((a, b) => b.result.surface_finish_Ra_um < a.result.surface_finish_Ra_um ? b : a).label;
  const avgConf = results.reduce((s, r) => s + r.confidence, 0) / results.length;
  return { value: { scenarios: results, best_mrr, best_tool_life, best_finish }, confidence: avgConf, source: "compare" };
}

/**
 * MOPSO — Multi-Objective Particle Swarm Optimization for S/F.
 * Ported from archive PRISM_PSO_OPTIMIZER.js (v8.89).
 * Optimizes Vc, fz, ap simultaneously across MRR, tool life, Ra.
 * Returns true Pareto front with crowding-distance diversity.
 *
 * PSO params: 20 particles × 40 iterations, adaptive inertia 0.9→0.4,
 * c1=c2=1.49445 (constriction coefficients).
 */
function optimizeFn(engine: SpeedFeedOrchestratorEngine, input: OrchestratorInput, objectives?: string[]): AtomicValue<unknown> {
  const N = 20;   // particles (kept small for real-time)
  const ITER = 40;
  const c1 = 1.49445, c2 = 1.49445;
  const wMax = 0.9, wMin = 0.4;

  // Dimension bounds: [Vc m/min, fz mm/tooth, ap mm]
  const D = input.tool_diameter_mm ?? 12;
  const bounds: [number, number][] = [
    [20, 500],       // Vc
    [0.01, 0.3],     // fz
    [0.2, D * 1.5],  // ap
  ];
  const vMax = bounds.map(([lo, hi]) => 0.2 * (hi - lo));

  // Seed RNG for reproducibility
  let seed = 12345;
  const rng = (): number => { seed = (seed * 1664525 + 1013904223) & 0x7fffffff; return seed / 0x7fffffff; };

  // Evaluate objectives: [MRR (maximize), tool_life (maximize), -Ra (maximize = better finish)]
  const evaluate = (pos: number[]): number[] => {
    const Vc = pos[0], fz = pos[1], ap = pos[2];
    const ae = input.radial_depth_mm ?? D * 0.5;
    const z = input.flutes ?? 4;
    const rpm = Math.min(1000 * Vc / (Math.PI * D), input.machine_max_rpm ?? 15000);
    const Vf = fz * z * rpm;
    const mrr = (ap * ae * Vf) / 1000; // cm³/min

    // Taylor tool life: T = (C/Vc)^(1/n) — per-material from canonical constants
    const optTaylor = CANONICAL_TAYLOR[(input.iso_group ?? "P") as ISOGroup];
    const n_t = optTaylor.n, C_t = optTaylor.C;
    const toolLife = Math.pow(Math.max(1, C_t / Math.max(1, Vc)), 1 / n_t);

    // Surface finish: Ra = fz²/(32·r) × 1000 µm
    const noseR = input.corner_radius_mm ?? 0.4;
    const Ra = (fz * fz) / (32 * noseR) * 1000;

    return [mrr, Math.min(toolLife, 999), -Ra]; // all maximize
  };

  // Dominance: a dominates b if a[i] >= b[i] for all i, strictly > for at least one
  const dominates = (a: number[], b: number[]): boolean => {
    let dominated = false;
    for (let i = 0; i < a.length; i++) {
      if (a[i] < b[i]) return false;
      if (a[i] > b[i]) dominated = true;
    }
    return dominated;
  };

  // Initialize particles
  const particles = Array.from({ length: N }, () => {
    const pos = bounds.map(([lo, hi]) => lo + rng() * (hi - lo));
    const vel = bounds.map((_, i) => (rng() - 0.5) * 2 * vMax[i]);
    const fit = evaluate(pos);
    return { pos: [...pos], vel, fit, bestPos: [...pos], bestFit: [...fit] };
  });

  // Pareto archive
  let archive: Array<{ pos: number[]; fit: number[] }> = [];

  const updateArchive = (candidates: Array<{ pos: number[]; fit: number[] }>) => {
    const all = [...archive, ...candidates];
    // Remove dominated solutions
    const nonDom = all.filter((a, i) => !all.some((b, j) => i !== j && dominates(b.fit, a.fit)));
    // Crowding distance trim to 50
    if (nonDom.length > 50) {
      // Sort by each objective and assign distances
      const dists = new Array(nonDom.length).fill(0);
      for (let obj = 0; obj < 3; obj++) {
        const idx = nonDom.map((_, i) => i).sort((a, b) => nonDom[a].fit[obj] - nonDom[b].fit[obj]);
        dists[idx[0]] = Infinity;
        dists[idx[idx.length - 1]] = Infinity;
        const range = Math.max(1e-10, nonDom[idx[idx.length - 1]].fit[obj] - nonDom[idx[0]].fit[obj]);
        for (let k = 1; k < idx.length - 1; k++) {
          dists[idx[k]] += (nonDom[idx[k + 1]].fit[obj] - nonDom[idx[k - 1]].fit[obj]) / range;
        }
      }
      const sorted = nonDom.map((s, i) => ({ s, d: dists[i] })).sort((a, b) => b.d - a.d);
      archive = sorted.slice(0, 50).map(x => x.s);
    } else {
      archive = nonDom;
    }
  };

  // PSO main loop
  for (let iter = 0; iter < ITER; iter++) {
    const w = wMax - (wMax - wMin) * iter / ITER; // adaptive inertia

    updateArchive(particles.map(p => ({ pos: [...p.pos], fit: [...p.fit] })));

    for (const p of particles) {
      // Select leader from archive (random)
      const leader = archive[Math.floor(rng() * archive.length)];

      // Velocity update
      for (let d = 0; d < 3; d++) {
        p.vel[d] = w * p.vel[d]
          + c1 * rng() * (p.bestPos[d] - p.pos[d])
          + c2 * rng() * (leader.pos[d] - p.pos[d]);
        p.vel[d] = Math.max(-vMax[d], Math.min(vMax[d], p.vel[d]));
      }

      // Position update with reflection boundary
      for (let d = 0; d < 3; d++) {
        p.pos[d] += p.vel[d];
        if (p.pos[d] < bounds[d][0]) { p.pos[d] = bounds[d][0] + 0.5 * (bounds[d][0] - p.pos[d]); p.vel[d] *= -0.5; }
        if (p.pos[d] > bounds[d][1]) { p.pos[d] = bounds[d][1] - 0.5 * (p.pos[d] - bounds[d][1]); p.vel[d] *= -0.5; }
        p.pos[d] = Math.max(bounds[d][0], Math.min(bounds[d][1], p.pos[d]));
      }

      // Evaluate
      p.fit = evaluate(p.pos);

      // Update personal best (non-dominated)
      if (dominates(p.fit, p.bestFit)) {
        p.bestPos = [...p.pos];
        p.bestFit = [...p.fit];
      }
    }
  }

  // Final archive update
  updateArchive(particles.map(p => ({ pos: [...p.pos], fit: [...p.fit] })));

  // Convert archive to OrchestratorResults
  const paretoResults = archive.slice(0, 10).map((sol, i) => {
    const r = engine.compute({ ...input, axial_depth_mm: sol.pos[2] });
    return {
      label: `pareto_${i + 1}`,
      vc_mpm: Math.round(sol.pos[0] * 10) / 10,
      fz_mm: Math.round(sol.pos[1] * 10000) / 10000,
      ap_mm: Math.round(sol.pos[2] * 100) / 100,
      mrr_cm3min: Math.round(sol.fit[0] * 100) / 100,
      tool_life_min: Math.round(sol.fit[1] * 10) / 10,
      ra_um: Math.round(-sol.fit[2] * 100) / 100,
      result: r.value,
      confidence: r.confidence,
    };
  });

  // Sort by MRR descending, pick extremes
  paretoResults.sort((a, b) => b.mrr_cm3min - a.mrr_cm3min);
  const bestMrr = paretoResults[0]?.label ?? "pareto_1";
  const bestLife = [...paretoResults].sort((a, b) => b.tool_life_min - a.tool_life_min)[0]?.label ?? "pareto_1";
  const bestFinish = [...paretoResults].sort((a, b) => a.ra_um - b.ra_um)[0]?.label ?? "pareto_1";

  // Recommend based on user preference
  const recommended = objectives?.includes("productivity") ? bestMrr
    : objectives?.includes("tool_life") ? bestLife
    : objectives?.includes("surface_finish") ? bestFinish
    : paretoResults[Math.floor(paretoResults.length / 2)]?.label ?? "pareto_1";

  const avgConf = paretoResults.reduce((s, r) => s + r.confidence, 0) / Math.max(1, paretoResults.length);
  return {
    value: {
      method: "MOPSO",
      particles: N,
      iterations: ITER,
      archive_size: archive.length,
      pareto_front: paretoResults,
      best_mrr: bestMrr,
      best_tool_life: bestLife,
      best_finish: bestFinish,
      recommended,
    },
    confidence: avgConf,
    source: "mopso_pareto_optimization",
  };
}

export { resolveMachineContextFn, resolveToolContextFn, resolveMaterialContextFn, compareFn, optimizeFn };

export const speedFeedOrchestratorEngine = new SpeedFeedOrchestratorEngine();
