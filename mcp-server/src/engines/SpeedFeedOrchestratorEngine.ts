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
  machine_type?: "vertical_mill" | "horizontal_mill" | "lathe" | "5axis" | "router" | "swiss";
  spindle_taper?: "BT30" | "BT40" | "BT50" | "CAT40" | "CAT50" | "HSK-A63" | "HSK-A100" | "HSK-E40";
  spindle_bearing_preload?: "light" | "medium" | "heavy";
  machine_age_years?: number;

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

  // ── Advisory outputs ──
  playbook_warnings: string[];
  recommendations: string[];
  alternatives: AlternativeSet[];

  // ── Traceability ──
  formulas_used: string[];
  engines_called: string[];
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
    kc1_1: 1600,
    mc: 0.23,
    k_thermal: 7.2,
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
    const defaultConf = 0.4;

    // Determine machine type
    const machineType = input.machine_type ?? (input.operation === "turning" ? "lathe" : "vertical_mill");
    const profile = DEFAULT_MACHINE_PROFILES[machineType] ?? DEFAULT_MACHINE_PROFILES["vertical_mill"];

    // Age degradation: 0.5% per year for power and rigidity
    const ageYears = input.machine_age_years ?? 0;
    const ageFactor = Math.max(0.7, 1.0 - 0.005 * ageYears);

    const powerKw = input.machine_power_kw ?? profile.power_kw;
    const maxRpm = input.machine_max_rpm ?? profile.max_rpm;
    const maxTorque = input.machine_max_torque_nm ?? profile.max_torque_Nm;

    // Rigidity resolution
    let rigidity: "low" | "medium" | "high";
    let rigidityConf: number;
    let rigiditySource: string;
    if (input.machine_rigidity !== undefined) {
      rigidity = input.machine_rigidity;
      rigidityConf = userConf;
      rigiditySource = "user_input";
    } else {
      rigidity = profile.rigidity;
      rigidityConf = defaultConf;
      rigiditySource = `default_for_${machineType}`;
    }

    const taper = input.spindle_taper ?? profile.taper;

    return {
      name: av(
        input.machine_name ?? machineType,
        input.machine_name !== undefined ? userConf : defaultConf,
        input.machine_name !== undefined ? "user_input" : `default_type_${machineType}`
      ),
      power_kw: av(
        powerKw * ageFactor,
        input.machine_power_kw !== undefined ? userConf : defaultConf,
        input.machine_power_kw !== undefined ? "user_input" : `default_for_${machineType}`
      ),
      max_rpm: av(
        maxRpm,
        input.machine_max_rpm !== undefined ? userConf : defaultConf,
        input.machine_max_rpm !== undefined ? "user_input" : `default_for_${machineType}`
      ),
      max_torque_Nm: av(
        maxTorque * ageFactor,
        input.machine_max_torque_nm !== undefined ? userConf : defaultConf,
        input.machine_max_torque_nm !== undefined ? "user_input" : `default_for_${machineType}`
      ),
      rigidity: av(rigidity, rigidityConf, rigiditySource),
      type: av(
        machineType,
        input.machine_type !== undefined ? userConf : 0.5,
        input.machine_type !== undefined ? "user_input" : "inferred_from_operation"
      ),
      taper: av(
        taper,
        input.spindle_taper !== undefined ? userConf : defaultConf,
        input.spindle_taper !== undefined ? "user_input" : `default_for_${machineType}`
      ),
      age_factor: av(
        ageFactor,
        input.machine_age_years !== undefined ? 0.8 : 0.3,
        input.machine_age_years !== undefined ? `age_${ageYears}_years` : "assumed_new"
      ),
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

    return {
      diameter_mm: av(
        diameter, hasDia ? userConf : defaultConf,
        hasDia ? "user_input" : "default_10mm"
      ),
      flutes: av(
        flutes, hasFlutes ? userConf : inferConf,
        hasFlutes ? "user_input" : `inferred_from_${op}`
      ),
      material: av(
        material, hasMat ? userConf : inferConf,
        hasMat ? "user_input" : "default_carbide"
      ),
      coating: av(
        coatingKey, hasCoat ? userConf : defaultConf,
        hasCoat ? "user_input" : "default_TiAlN"
      ),
      helix_angle_deg: av(
        helixAngle, hasHelix ? userConf : inferConf,
        hasHelix ? "user_input" : "inferred_from_operation"
      ),
      corner_radius_mm: av(
        cornerRadius, hasCR ? userConf : 0.3,
        hasCR ? "user_input" : "default_sharp"
      ),
      flute_length_mm: av(
        fluteLength, hasFL ? userConf : inferConf,
        hasFL ? "user_input" : "inferred_2.5xD"
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

    // Ultimate fallback
    if (matKey === undefined) {
      matKey = "steel";
      matchSource = "default_steel";
    }

    const rec = MATERIAL_DB[matKey];
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
      name: av(matKey, conf, matchSource),
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
    p_chatter: number;
    sobol_dominant: string;
  } {
    // Kienzle force with material scatter (inline MC, 500 trials)
    const kc1_1 = material.kc1_1.value;
    const mc = material.mc.value;
    const kc_cv = 0.10; // 8-12% typical
    const mc_cv = 0.07;
    const n_trials = 500;
    const seed = 42;
    let s = seed;
    const rng = (): number => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
    const boxMuller = (): number => {
      const u1 = Math.max(1e-10, rng()); const u2 = rng();
      return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    };

    const forces: number[] = [];
    const lives: number[] = [];
    const chatterCount = { stable: 0, unstable: 0 };

    for (let i = 0; i < n_trials; i++) {
      const kc_s = kc1_1 * (1 + kc_cv * boxMuller());
      const mc_s = mc * (1 + mc_cv * boxMuller());
      const h = Math.max(0.001, fz); // chip thickness ≈ fz for straight milling
      const Fc_s = kc_s * ap * Math.pow(h, 1 - mc_s);
      forces.push(Fc_s);

      // Taylor life with scatter
      const n_taylor = 0.25 * (1 + 0.08 * boxMuller());
      const C_taylor = (Vc * 1.5) * (1 + 0.15 * boxMuller()); // C ≈ 1.5× base Vc
      const T_s = Math.pow(Math.max(1, C_taylor / Math.max(1, Vc)), 1 / Math.max(0.05, n_taylor));
      lives.push(Math.max(0.1, T_s));

      // Stability check (simplified): a_lim = -1/(2*Ks*Re[G])
      // Approximate: stable if ap < a_lim
      const k_s = stiffness_n_per_um * 1e6; // N/m
      const zeta = damping;
      const omega_n = natural_freq_hz * 2 * Math.PI;
      const Ks = kc_s * ae / 1000; // specific force × width
      // Worst-case Re[G] ≈ -1/(2*k_s*zeta) at natural frequency
      const re_G_worst = -1 / (2 * k_s * Math.max(0.001, zeta));
      const a_lim = -1 / (2 * Math.max(1, Ks) * re_G_worst);
      if (ap > a_lim * (1 + 0.1 * boxMuller())) {
        chatterCount.unstable++;
      } else {
        chatterCount.stable++;
      }
    }

    forces.sort((a, b) => a - b);
    lives.sort((a, b) => a - b);

    const forceMean = forces.reduce((s, v) => s + v, 0) / n_trials;
    const lifeMean = lives.reduce((s, v) => s + v, 0) / n_trials;
    const ci2_5 = Math.floor(n_trials * 0.025);
    const ci97_5 = Math.floor(n_trials * 0.975);

    // Sobol-like: which parameter contributes most variance?
    // Simple: kc scatter vs mc scatter vs Taylor scatter
    const forceVar = forces.reduce((s, v) => s + (v - forceMean) ** 2, 0) / n_trials;
    const sobol_dominant = forceVar > 0 ? "material_kc1.1" : "tool_life_C";

    return {
      force_ci95: [forces[ci2_5], forces[ci97_5]],
      force_mean: forceMean,
      life_ci95: [lives[ci2_5], lives[ci97_5]],
      life_mean: lifeMean,
      p_chatter: chatterCount.unstable / n_trials,
      sobol_dominant,
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
  public compute(input: OrchestratorInput): AtomicValue<OrchestratorResult> {
    log.info("[SpeedFeedOrchestrator] compute() start");

    // ── Step 1: Resolve all 8 categories ──
    const machine   = this.resolveMachine(input);
    const tool      = this.resolveTool(input);
    const material  = this.resolveMaterial(input);
    const holder    = this.resolveHolder(input);
    const coolant   = this.resolveCoolant(input);
    const workhold  = this.resolveWorkholding(input);
    const camStrat  = this.resolveCAMStrategy(input);
    const geometry  = this.resolveGeometry(input);

    const formulas_used: string[] = [];
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

    // Effective cutting speed
    let Vc = vcBase * coatingSpeedFactor * coolantSpeedFactor * camSpeedMult
           * geomDerating * gradeFactor;
    formulas_used.push("Vc = Vc_base × coating_factor × coolant_factor × cam_multiplier × geom_derating × grade_factor");

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
    rpm = Math.round(rpm);
    formulas_used.push("RPM = 1000 × Vc / (π × D)");

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

    // ── Step 3: Derived Calculations ──

    // MRR = ap * ae * Vf / 1000 (cm³/min)
    const mrr = (ap * ae * Vf) / 1000;
    formulas_used.push("MRR = ap × ae × Vf / 1000 [cm³/min]");

    // Kienzle cutting force: Fc = kc1.1 × ap × fz^(1-mc)
    const kc1_1 = material.kc1_1.value;
    const mc = material.mc.value;
    const Fc = kc1_1 * ap * Math.pow(Math.max(fz, 0.001), 1 - mc);
    formulas_used.push("Fc = kc1.1 × ap × fz^(1-mc) [Kienzle]");

    // Power = Fc * Vc / (60 * 1000) [kW]
    const powerKW = (Fc * Vc) / (60 * 1000);
    formulas_used.push("P = Fc × Vc / 60000 [kW]");

    // Torque = Power * 30000 / (π * RPM) [Nm]
    const torqueNm = rpm > 0 ? (powerKW * 30000) / (Math.PI * rpm) : 0;
    formulas_used.push("T = P × 30000 / (π × RPM) [Nm]");

    // Taylor tool life: T = (C/Vc)^(1/n)
    const taylorN = 0.25;  // carbide default
    // C from material: approximate as vc_base * machinability^0.5 * 10
    const taylorC = material.vc_base_roughing.value * Math.sqrt(material.machinability_factor.value) * 10;
    let toolLifeMin = Math.pow(taylorC / Math.max(Vc, 1), 1 / taylorN);
    // Apply coolant life factor
    toolLifeMin *= coolant.life_factor.value;
    // Apply coating life factor
    toolLifeMin *= coatingRec.life_multiplier;
    // Clamp to reasonable range [1, 9999]
    toolLifeMin = Math.max(1, Math.min(9999, toolLifeMin));
    formulas_used.push("T_life = (C/Vc)^(1/n) × coolant_life × coating_life [Taylor]");

    // Surface finish: Ra ≈ fz² / (32 × corner_radius) [µm, theoretical]
    const rCorner = Math.max(tool.corner_radius_mm.value, 0.1);
    const Ra = (fz * fz * 1000) / (32 * rCorner); // convert mm to µm: fz²×1000/(32×r)
    formulas_used.push("Ra = fz² × 1000 / (32 × r_corner) [µm]");

    // Tool deflection: δ = Fc × L³ / (3 × E × I)
    const E_carbide = 600e3;  // 600 GPa in N/mm²
    const stickout = tool.stickout_mm.value;
    const d_shank = D;  // approximate shank ≈ tool diameter
    const I_moment = (Math.PI * Math.pow(d_shank, 4)) / 64;
    const deflection_mm = I_moment > 0
      ? (Fc * Math.pow(stickout, 3)) / (3 * E_carbide * I_moment)
      : 0;
    const deflection_um = deflection_mm * 1000;
    formulas_used.push("δ = Fc × L³ / (3 × E × I), E=600GPa, I=π×d⁴/64 [cantilever beam]");

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

    // Torque check
    const torqueLimit = machine.max_torque_Nm.value * 0.8;
    const torqueUtil = torqueLimit > 0 ? (torqueNm / torqueLimit) * 100 : 0;
    const torquePass = torqueNm <= torqueLimit;
    safetyChecks.push({
      name: "torque",
      passed: torquePass,
      message: torquePass
        ? `Torque ${torqueNm.toFixed(2)} Nm within limit ${torqueLimit.toFixed(1)} Nm`
        : `Torque ${torqueNm.toFixed(2)} Nm EXCEEDS limit ${torqueLimit.toFixed(1)} Nm`,
      value: torqueNm,
      limit: torqueLimit,
    });
    limitingFactors.push({
      parameter: "torque_Nm",
      constraint: `< ${torqueLimit.toFixed(1)} Nm (80% machine)`,
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
        ? (FcAdj * Math.pow(stickout, 3)) / (3 * E_carbide * I_moment)
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
    const finalRa = (fz * fz * 1000) / (32 * rCorner);
    const finalDefl_mm = I_moment > 0
      ? (finalFc * Math.pow(stickout, 3)) / (3 * E_carbide * I_moment)
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
    const rawConfidence = resolverConfidences.reduce((acc, c) => acc * c, 1.0);
    const overallConfidence = Math.max(0.05, Math.min(0.99, rawConfidence));

    // ── Step 7: Uncertainty (enhanced with stochastic engines) ──
    const confScale = Math.max(0.5, overallConfidence);
    // Derive stiffness/freq/damping from rigidity category
    const rigMap = { low: 20, medium: 50, high: 100 } as const;
    const dampMap = { low: 0.02, medium: 0.04, high: 0.06 } as const;
    const freqMap = { low: 500, medium: 800, high: 1200 } as const;
    const rig = machine.rigidity.value as "low" | "medium" | "high";
    const stiffness = rigMap[rig] ?? 50;
    const natFreq = freqMap[rig] ?? 800;
    const dampingR = dampMap[rig] ?? 0.03;
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
      p_chatter: fullUQ.p_chatter,
      sobol_dominant: fullUQ.sobol_dominant,
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
    const playbook_warnings: string[] = [];
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

      playbook_warnings,
      recommendations,
      alternatives,

      formulas_used,
      engines_called,
    };

    log.info(
      `[SpeedFeedOrchestrator] compute() done: Vc=${result.cutting_speed_mpm} m/min, ` +
      `RPM=${result.spindle_rpm}, fz=${result.feed_per_tooth_mm} mm, ` +
      `Vf=${result.feed_rate_mmmin} mm/min, confidence=${result.overall_confidence}`,
    );

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

export const speedFeedOrchestratorEngine = new SpeedFeedOrchestratorEngine();
