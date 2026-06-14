/**
 * SpeedFeedNineAxisOrchestratorEngine — 9-axis comprehensive speed/feed orchestrator.
 *
 * THIN composition layer over UltimateSpeedFeedEngine.
 * Does NOT reinvent physics. Accepts an explicit 9-axis input model and
 * derives per-axis multipliers/constraints, then pipes through the canonical
 * UltimateSpeedFeedEngine.calculate() for the underlying physics, and
 * post-processes for 3 distinct operator-facing optimization modes plus
 * MRR ranking + ROI investment advice.
 *
 * 9 Axes:
 *   1. Machine    — kinematics, work envelope, build quality, way type, accuracy, G-force, weight, motion control
 *   2. Spindle    — HP, torque curve, diameter (collision), thru-tool coolant
 *   3. Controller — HSM, end-point control, smoothing, look-ahead, AICC
 *   4. Material   — type, hardness HB/HRC, ISO group
 *   5. Workholding — type, clamp force, parallel size, jaw depth, contact area, μ
 *   6. Tool holder — type, BigPlus, balance class (ISO 1940), runout TIR
 *   7. Tooling    — diameter, flutes, material, coating, helix, corner R, stickout
 *   8. Coolant    — type, brand, pH, concentration, flow, pressure
 *   9. Toolpath   — strategy, operation, cut type, DOC ap/ae, current params
 *
 * 3 Modes:
 *   - cost_batch       — Gilbert V_min_cost (large-batch, minimum $/part)
 *   - aggressive_rush  — Gilbert V_max_prod biased for MRR (rush jobs, factor tool cost)
 *   - prism_optimized  — Pareto knee on the MRR × cost-efficiency frontier
 *
 * Physics references (all canonical, NOT inlined here — calls
 * UltimateSpeedFeedEngine which imports from src/physics/constants.ts):
 *   - Kienzle force model:        Fc = kc1.1 × ap × fz^(1-mc)
 *   - Taylor tool life:           VT^n = C
 *   - Gilbert economic speed:     V_min_cost, V_max_prod
 *   - Altintas SLD chatter:       stability lobes
 *   - ISO 1940 balance grade:     G2.5 / G6.3 / G16 / G40 → max safe RPM
 *   - Brammertz surface finish:   Ra ~= fz^2/(32r) [nose cusp; canonical predictedRa() in constants.ts].
 *                                 NB 8r is the peak-to-valley Rt; Ra ~= Rt/4 -> 32r (using 8r as Ra is 4x unsafe).
 *
 * @module engines/SpeedFeedNineAxisOrchestratorEngine
 * @milestone OSCAR-SFC-9AXIS-MS0/U-OSC9-01
 * @author oscar (slot:oscar, 2026-05-25)
 */

import {
  UltimateSpeedFeedEngine,
  type UltimateSpeedFeedInput,
  type UltimateSpeedFeedResult,
  type ISOGroup,
  type Operation,
  type CutType,
  type ToolMaterial,
  type CoolantType,
} from "./UltimateSpeedFeedEngine.js";

// Canonical Kienzle exponent (mc) per ISO group -- imported, NEVER inlined. The
// workholding-retention derate converts an in-plane cutting-force overage into the
// correct feed-per-tooth reduction (Fc proportional to fz^(1-mc)), so it needs mc.
// (OSCAR-SFC-9AXIS-MS0/U-OSC-WORKHOLDING-FORCE-CAP)
import { CANONICAL_KIENZLE, predictedRa } from "../physics/constants.js";

// Auto-propagation bridge — every run() emission flows to post-processor,
// mill/lathe/wedm wizards, and the print-to-program pipeline without an
// explicit re-fetch by the downstream consumer. (OSCAR-SFC-9AXIS-MS0/U-OSC9-03)
// Best-effort: never throws back into the SFC computation path.
import { speedFeedPropagationBridgeEngine } from "./SpeedFeedPropagationBridgeEngine.js";

// Outcome-feedback bridge — closes audit F9 dangling wire. Every run() also
// captures the recommendation to the AI-ladder calibration ring buffer so
// SpeedFeedDeepLearningEngine can fold actuals back into calibrationFactors.
// (OSCAR-SFC-9AXIS-MS0/U-OSC9-08). Best-effort: never throws.
import { speedFeedOutcomeFeedbackBridgeEngine } from "./SpeedFeedOutcomeFeedbackBridgeEngine.js";

// ============================================================================
// 9-AXIS INPUT MODEL
// ============================================================================

export type MachineKinematics =
  | "3axis_vmc" | "3plus2" | "5axis_simultaneous"
  | "horizontal_mc" | "vertical_mc"
  | "lathe_2axis" | "millturn" | "swiss" | "wedm";

export type WayType = "linear_rail" | "box_way" | "hybrid_way" | "roller_bearing";

export type BuildQuality = "premium" | "production" | "economy";

export type MotionControl = "servo" | "linear_motor" | "stepper" | "direct_drive";

export type ControllerBrand =
  | "fanuc" | "siemens" | "heidenhain" | "okuma" | "haas"
  | "mazak" | "mitsubishi" | "fagor" | "hurco";

export type WorkholdingType =
  | "kurt_vise" | "soft_jaw" | "magnetic" | "vacuum"
  | "custom_fixture" | "tombstone" | "collet" | "chuck_3jaw" | "chuck_4jaw";

export type ToolHolderType =
  | "cat40" | "cat50" | "bt30" | "bt40" | "bt50"
  | "hsk_a40" | "hsk_a63" | "hsk_a100" | "capto_c5" | "capto_c6"
  | "shrink_fit" | "hydraulic" | "er_collet" | "mill_chuck";

/** ISO 1940 balance grade — max permissible residual unbalance */
export type BalanceClass = "g0_4" | "g1" | "g2_5" | "g6_3" | "g16" | "g40";

export interface NineAxisMachine {
  name?: string;
  kinematics?: MachineKinematics;
  work_envelope_mm?: { x: number; y: number; z: number };
  build_quality?: BuildQuality;
  way_type?: WayType;
  accuracy_um?: number;            // positioning accuracy (μm)
  g_force_max?: number;            // acceleration (m/s²)
  weight_kg?: number;              // machine mass — affects vibration damping
  motion_control?: MotionControl;
  rigidity?: "low" | "medium" | "high";
  power_kw?: number;
  max_rpm?: number;
  max_torque_nm?: number;
  base_rpm?: number;               // constant-torque region
  max_feed_mmmin?: number;
}

export interface NineAxisSpindle {
  hp?: number;
  /** Discrete (rpm, Nm) points of the spindle torque curve */
  torque_curve?: Array<{ rpm: number; torque_nm: number }>;
  diameter_mm?: number;            // for 3D collision check
  bigplus?: boolean;               // BigPlus contact face
  through_spindle_coolant?: boolean;
}

export interface NineAxisController {
  brand?: ControllerBrand;
  high_speed_machining?: boolean;  // HSM mode
  end_point_control?: boolean;     // EPC / look-ahead
  smoothing?: boolean;             // nano / contour smoothing
  look_ahead_blocks?: number;      // typical 60-1000
  ai_contour_control?: boolean;    // Fanuc AICC, Siemens Advanced Surface
  jerk_control?: boolean;
}

export interface NineAxisMaterial {
  name: string;
  hardness_hb?: number;
  hardness_hrc?: number;
  iso_group?: ISOGroup;
}

export interface NineAxisWorkholding {
  type?: WorkholdingType;
  clamp_force_available_kn?: number;
  parallel_size_mm?: number;       // Kurt vise jaw width or parallel under-stock
  jaw_depth_mm?: number;           // custom jaw clamping depth
  contact_area_mm2?: number;       // total clamp-workpiece contact area
  friction_coefficient?: number;   // typical 0.10–0.40
}

export interface NineAxisToolHolder {
  type?: ToolHolderType;
  bigplus?: boolean;
  balance_class?: BalanceClass;    // ISO 1940
  runout_tir_um?: number;          // total indicator readout (μm)
  clamp_force_kn?: number;
  operator_has_balancer?: boolean; // operator has balancing equipment
}

export interface NineAxisTooling {
  tool_diameter_mm: number;        // REQUIRED
  flutes?: number;
  tool_material?: ToolMaterial;
  coating?: string;                // TiAlN, AlTiN, AlCrN, diamond, etc.
  helix_angle_deg?: number;
  corner_radius_mm?: number;
  stickout_mm?: number;
  insert_type?: string;            // ISO insert designation
  tool_cost_usd?: number;
  regrindable?: boolean;
  regrinds_available?: number;
  regrind_cost_usd?: number;
}

export interface NineAxisCoolant {
  type?: CoolantType;
  brand?: string;
  ph?: number;                     // 8.8–9.2 ideal for water-soluble
  concentration_pct?: number;      // 5–10% typical
  flow_rate_lpm?: number;          // liters/min
  pressure_bar?: number;
  age_weeks?: number;
}

export interface NineAxisToolpath {
  strategy?: "conventional" | "adaptive" | "trochoidal" | "hsm" | "hpc" | "plunge" | "slot";
  operation?: Operation;
  cut_type?: CutType;
  axial_depth_mm?: number;         // ap
  radial_depth_mm?: number;        // ae
  radial_depth_pct?: number;       // ae/D ratio
  target_ra_um?: number;           // desired finish quality (Ra, um) -- caps fz via Ra~=fz^2/(32r)
  current_rpm?: number;            // operator's current params (for delta)
  current_feed_mmmin?: number;
  current_doc_mm?: number;
}

export type OptimizationMode = "cost_batch" | "aggressive_rush" | "prism_optimized";

export interface NineAxisInput {
  machine?: NineAxisMachine;
  spindle?: NineAxisSpindle;
  controller?: NineAxisController;
  material: NineAxisMaterial;       // REQUIRED
  workholding?: NineAxisWorkholding;
  tool_holder?: NineAxisToolHolder;
  tooling: NineAxisTooling;          // REQUIRED (diameter at minimum)
  coolant?: NineAxisCoolant;
  toolpath?: NineAxisToolpath;
  mode?: OptimizationMode;           // default "prism_optimized"
  batch_size?: number;               // for cost-amortization
  /** Workpiece volume to remove (cm³). REQUIRED for cycle_time/cost_per_part output.
   *  If omitted, cycle_time_min and cost_per_part_usd return null with a warning. */
  part_volume_cm3?: number;
  /** Optional: full tool library for MRR ranking. */
  tool_library?: Array<{
    label: string;
    diameter_mm: number;
    flutes: number;
    tool_material: ToolMaterial;
    coating?: string;
    cost_usd: number;
  }>;
}

// ============================================================================
// AXIS DERIVED FACTORS
// ============================================================================

export interface AxisFactors {
  /** Machine rigidity factor — 0.8 (low) to 1.2 (premium box-way) */
  machine_rigidity_factor: number;
  /** Controller smoothing factor — 1.0 baseline, +5-50% for HSM/AICC/look-ahead */
  controller_smoothing_factor: number;
  /** Workholding safety factor — required_clamp_force / available_clamp_force */
  workholding_safety_factor: number;
  /** Max safe RPM from ISO 1940 balance + operator capability */
  holder_balance_max_rpm: number;
  /** Coolant effectiveness vs flood baseline (0.5 dry → 1.5 cryo) */
  coolant_effectiveness: number;
  /** Toolpath chip-thinning factor (1.0 conventional → 0.5 trochoidal) */
  toolpath_engagement_factor: number;
  /** Notes per-axis */
  notes: string[];
}

// ============================================================================
// MODE-SPECIFIC RECOMMENDATION
// ============================================================================

export interface ModeRecommendation {
  mode: OptimizationMode;
  cutting_speed_mpm: number;
  spindle_rpm: number;
  feed_rate_mmmin: number;
  feed_per_tooth_mm: number;
  axial_depth_mm: number;
  radial_depth_mm: number;
  mrr_cm3min: number;
  tool_life_min: number;
  /** Null when part_volume_cm3 not provided in input — never fabricated. */
  cost_per_part_usd: number | null;
  /** Null when part_volume_cm3 not provided in input — never fabricated. */
  cycle_time_min: number | null;
  mode_explanation: string;
}

// ============================================================================
// MRR RANKING (TOOL-LIBRARY CROSS-CHECK)
// ============================================================================

export interface MRRRankingEntry {
  rank: number;
  config_label: string;
  tool_diameter_mm: number;
  flutes: number;
  tool_material: ToolMaterial;
  coating?: string;
  mrr_cm3min: number;
  cost_per_part_usd: number;
  tool_life_min: number;
  /** Combined score: normalized MRR × (1 / normalized cost) */
  score: number;
}

// ============================================================================
// ROI INVESTMENT ADVISOR
// ============================================================================

export interface ROIInvestmentSuggestion {
  investment: string;
  price_usd_range: [number, number];
  cost_per_part_after_usd: number;
  mrr_increase_pct: number;
  tool_life_multiplier: number;
  /** Number of parts to recover the investment */
  payback_parts: number;
  /** Composite ROI score — higher = better */
  roi_score: number;
}

export interface ROIPopup {
  show_popup: boolean;
  current_cost_per_part_usd: number;
  suggestions: ROIInvestmentSuggestion[];
}

// ============================================================================
// SPINDLE TUNING ADVICE (HOLDER + TOOLING + BALANCE)
// ============================================================================

export interface SpindleTuning {
  sweet_spot_rpm: number;
  /** Required balance class for the chosen RPM */
  required_balance_class: BalanceClass;
  /** Operator's holder meets the requirement */
  balance_ok: boolean;
  coast_down_advisory: string;
  /** If operator doesn't have balancer, the safe RPM with their current setup */
  derated_safe_rpm: number;
}

// ============================================================================
// FULL RESULT
// ============================================================================

export interface NineAxisResult {
  mode: OptimizationMode;
  /** Full canonical SFC physics result */
  sfc: UltimateSpeedFeedResult;
  /** Per-axis derived factors */
  axis_factors: AxisFactors;
  /** Mode-specific recommendation (cost_batch / aggressive_rush / prism_optimized) */
  recommendation: ModeRecommendation;
  /** Top-N tool configurations ranked by MRR × cost-efficiency */
  mrr_ranking: MRRRankingEntry[];
  /** ROI investment popup */
  roi_investment: ROIPopup;
  /** Spindle sweet-spot tuning */
  spindle_tuning: SpindleTuning;
  /** Workholding feasibility check */
  workholding_check: {
    required_clamp_force_kn: number;
    available_clamp_force_kn: number;
    safety_factor: number;
    feasible: boolean;
    notes: string[];
  };
  warnings: string[];
  recommendations: string[];
  /** All 9 axis sections resolved (with defaults applied) */
  resolved_axes: Required<Omit<NineAxisInput, "tool_library" | "mode" | "batch_size">>;
}

// ============================================================================
// CONSTANTS — derived from canonical sources, NOT inlined physics
// ============================================================================

/**
 * Way-type rigidity multipliers — affects effective DOC + chatter margin.
 * Source: Altintas (Manufacturing Automation, 2nd ed), Tlusty (Mfg Processes).
 */
const WAY_TYPE_RIGIDITY: Record<WayType, number> = {
  linear_rail: 0.95,    // high speed, slightly less damping
  box_way: 1.15,        // heavy roughing, max damping
  hybrid_way: 1.00,
  roller_bearing: 0.90, // lowest damping
};

const BUILD_QUALITY_RIGIDITY: Record<BuildQuality, number> = {
  premium: 1.10,
  production: 1.00,
  economy: 0.85,
};

/**
 * Controller feature feed-rate multipliers.
 * Source: Fanuc 30i AICC manual, Siemens Sinumerik 840D Advanced Surface,
 * Heidenhain iTNC530 TCPM, real-world shop-floor calibration.
 */
const CONTROLLER_HSM_MULT = 1.30;          // HSM mode
const CONTROLLER_AICC_MULT = 1.15;         // AI contour control
const CONTROLLER_SMOOTHING_MULT = 1.08;    // nano-smoothing
const CONTROLLER_EPC_MULT = 1.10;          // end-point control
const CONTROLLER_LOOK_AHEAD_MULT_MAX = 1.20;   // >400-block look-ahead
const CONTROLLER_LOOK_AHEAD_MULT_STD = 1.05;   // 60-400-block look-ahead (standard); also the default-config reference if controller is ever wired to the default mode (physics-review 2026-06-09)

/**
 * Coolant effectiveness multipliers.
 * Source: Komanduri & Hou thermal model, Sandvik Coromant coolant guide.
 */
const COOLANT_EFFECTIVENESS: Record<CoolantType, number> = {
  flood: 1.00,         // baseline
  through_tool: 1.25,  // high-pressure thru-tool
  mist: 0.85,
  mql: 0.90,
  air_blast: 0.70,
  dry: 0.60,
  cryogenic: 1.40,
};

// Ceiling on the COMPOUNDED coolant_effectiveness (base type x pH/age penalties x TSC bonus). It
// feeds a post-engine MRR scalar that bypasses the core power/torque envelope, so it must be bounded.
// Set ABOVE the legitimate cryogenic base (1.40) -- a 1.08 clamp would WRONGLY crush cryogenic/
// through_tool -- so it only bounds runaway STACKING, never the base table. Process-scaling bound, not a kc.
const COOLANT_EFFECTIVENESS_MAX = 1.45;
// Through-spindle-coolant delivery bonus (heat extraction + chip evacuation -> modestly higher
// achievable feed/MRR). Applied ONLY to a non-thru coolant TYPE: the `through_tool` type (1.25) and
// `cryogenic` (1.40) already model their own delivery, so stacking TSC on them would double-count.
const TSC_EFFECTIVENESS_BONUS = 1.08;

/**
 * Toolpath strategy chip-thinning / engagement factors.
 * Source: HSMWorks adaptive clearing whitepaper, Sandvik trochoidal guide.
 */
const TOOLPATH_ENGAGEMENT: Record<NonNullable<NineAxisToolpath["strategy"]>, number> = {
  conventional: 1.00,
  adaptive: 0.45,       // ~10% radial → constant engagement
  trochoidal: 0.50,
  hsm: 0.55,
  hpc: 0.95,
  plunge: 1.00,
  slot: 1.00,
};

/**
 * ISO 1940 balance grade → max safe RPM at a typical 0.5kg toolholder + tool mass.
 * G = (e × ω) where e = mm/s permissible eccentricity.
 * Approximation: max_rpm ≈ G × 9550 / (radius_mm × 0.5kg) for typical holders.
 * Source: ISO 1940-1:2003 + Big Daishowa shrink-fit balance chart.
 */
const BALANCE_CLASS_MAX_RPM: Record<BalanceClass, number> = {
  g0_4: 60000,
  g1: 40000,
  g2_5: 24000,
  g6_3: 12000,
  g16: 8000,
  g40: 4000,
};

/**
 * Tool holder runout TIR baseline (μm).
 * Source: Big Daishowa, Schunk, Nikken catalog specs.
 */
const HOLDER_RUNOUT_TIR_UM: Record<ToolHolderType, number> = {
  cat40: 8, cat50: 8, bt30: 6, bt40: 6, bt50: 8,
  hsk_a40: 3, hsk_a63: 3, hsk_a100: 3,
  capto_c5: 3, capto_c6: 3,
  shrink_fit: 3,
  hydraulic: 5,
  er_collet: 12,
  mill_chuck: 15,
};

const HOLDER_CLAMP_FORCE_KN: Record<ToolHolderType, number> = {
  cat40: 8, cat50: 12, bt30: 5, bt40: 8, bt50: 12,
  hsk_a40: 12, hsk_a63: 20, hsk_a100: 35,
  capto_c5: 18, capto_c6: 25,
  shrink_fit: 50,
  hydraulic: 25,
  er_collet: 6,
  mill_chuck: 8,
};

/**
 * Workholding friction defaults (Hoffman, Jigs & Fixtures).
 */
const WORKHOLDING_FRICTION_DEFAULT: Record<WorkholdingType, number> = {
  kurt_vise: 0.25,
  soft_jaw: 0.30,
  magnetic: 0.40,
  vacuum: 0.15,
  custom_fixture: 0.25,
  tombstone: 0.25,
  collet: 0.30,
  chuck_3jaw: 0.30,
  chuck_4jaw: 0.30,
};

const WORKHOLDING_CLAMP_FORCE_DEFAULT_KN: Record<WorkholdingType, number> = {
  kurt_vise: 35,         // 6" Kurt at full handle force
  soft_jaw: 30,
  magnetic: 15,
  vacuum: 8,
  custom_fixture: 25,
  tombstone: 50,
  collet: 25,
  chuck_3jaw: 40,
  chuck_4jaw: 50,
};

/**
 * Form-closure credit: ratio of effective in-plane part retention to pure friction.
 * Prismatic/jawed holds bear the part against a rigid datum (fixed vise jaw, chuck bore,
 * tombstone face, fixture locating pins), so in-plane cutting drive force is reacted
 * MECHANICALLY, not by friction alone. Surface-preload holds (vacuum, magnetic) have NO
 * form closure -- preload only (the 1.0 SAFETY FLOOR; do NOT raise above 1.0 without a
 * normal-force re-derivation: magnetic/vacuum break-away is preload-limited, not
 * friction-multiplied). Without this credit a friction-only model over-derates routine
 * vise setups (a 6in Kurt vise would derate a normal 3000N steel cut).
 * Source: Hoffman, Jig & Fixture Design (form-closure vs force-closure); ASME B11.8.
 * Physics-reviewed 2026-06-09 (OSCAR-SFC-9AXIS-MS0/U-OSC-WORKHOLDING-FORCE-CAP).
 */
const WORKHOLDING_FORM_CLOSURE_FACTOR: Record<WorkholdingType, number> = {
  kurt_vise: 3.0,
  soft_jaw: 3.0,
  custom_fixture: 3.0,
  tombstone: 3.0,
  collet: 3.5,
  chuck_3jaw: 3.0,
  chuck_4jaw: 3.0,
  magnetic: 1.0,   // no form closure -- magnetic preload only (safety floor)
  vacuum: 1.0,     // no form closure -- atmospheric preload only (safety floor)
};

/**
 * Part-retention safety factor by cut type (ASME B11.8, matches ClampingForceEngine
 * SAFETY_FACTORS). Applied to the required (drive-force) side, once.
 */
const WORKHOLDING_RETENTION_SF: Record<string, number> = {
  roughing: 3.0,
  finishing: 2.0,
  general: 2.5,
};

/**
 * Minimum sustainable feed-per-tooth (mm/tooth) for the retention derate. Below this the
 * tool rubs/burnishes instead of cutting (built-up-edge / work-hardening floor); if the
 * workholding derate drives fz below it the cut is retention-infeasible -> fail loud
 * (R12) rather than silently emit an un-cuttable chip load.
 * Source: Sandvik minimum-chip-thickness guidance for carbide milling (~0.01-0.02 mm).
 */
const WORKHOLDING_DERATE_FZ_MIN_MM = 0.01;

/**
 * Finish-Ra cap (U-OSC-FINISH-RA-CAP). Minimum nose/corner radius [mm] below which the
 * kinematic finish model Ra ~= fz^2/(32r) is INVALID -- a square/sharp end mill leaves a
 * wall finish governed by runout/deflection/feed-marks, NOT a nose cusp. Below this the cap
 * is SKIPPED (never fabricate a radius -- physics-review 2026-06-09, CRITICAL ruling 3).
 */
const FINISH_RA_CAP_MIN_R_MM = 0.05;
/**
 * Finish-Ra cap chip-load floor [mm]. Mirrors WORKHOLDING_DERATE_FZ_MIN_MM: below the
 * minimum chip thickness the tool burnishes (the ploughing/BUE term dominates and finer
 * feed actually WORSENS Ra), so a target needing fz below this is feed-infeasible -> fail
 * loud (R12), clamp to the floor, and state the Ra target is NOT met.
 */
const FINISH_RA_CAP_FZ_MIN_MM = WORKHOLDING_DERATE_FZ_MIN_MM;

/** Mechanical horsepower -> kW (definitional SI: 1 hp = 745.699872 W). Unit conversion, not a physics constant. */
const HP_TO_KW = 0.745699872;

/**
 * Spindle drivetrain efficiency (fraction of rated power available at the cutter).
 * Matches the 0.85 the core engine applies for available_power_kw
 * (UltimateSpeedFeedEngine available_power_kw = rated x 0.85). Belt/gear/bearing losses.
 */
const SPINDLE_POWER_EFFICIENCY = 0.85;

// ============================================================================
// ENGINE
// ============================================================================

export class SpeedFeedNineAxisOrchestratorEngine {
  private readonly ultimate = new UltimateSpeedFeedEngine();

  /**
   * Run the 9-axis orchestration. Returns a NineAxisResult containing the full
   * canonical UltimateSpeedFeedResult, axis-derived factors, mode-specific
   * recommendation, MRR ranking across the optional tool library, ROI
   * investment popup, spindle tuning advice, and workholding feasibility.
   *
   * @param input  Explicit 9-axis input. Only material.name and tooling.tool_diameter_mm
   *               are required — every other field has a sane domain default.
   */
  run(input: NineAxisInput): NineAxisResult {
    if (!input.material?.name) {
      throw new Error("NineAxisInput.material.name is required");
    }
    if (!input.tooling?.tool_diameter_mm || input.tooling.tool_diameter_mm <= 0) {
      throw new Error("NineAxisInput.tooling.tool_diameter_mm is required and must be > 0");
    }

    const mode = input.mode ?? "prism_optimized";
    const warnings: string[] = [];
    const recommendations: string[] = [];

    // ──────────────────────────────────────────────────────────────────
    // Step 1: Derive per-axis multipliers
    // ──────────────────────────────────────────────────────────────────
    const axis_factors = this.deriveAxisFactors(input, warnings);

    // ──────────────────────────────────────────────────────────────────
    // Step 2: Translate 9-axis input → UltimateSpeedFeedInput
    // ──────────────────────────────────────────────────────────────────
    const ufInput = this.translateToUltimate(input, axis_factors, mode);

    // ──────────────────────────────────────────────────────────────────
    // Step 3: Run UltimateSpeedFeedEngine (canonical physics)
    // ──────────────────────────────────────────────────────────────────
    const sfc = this.ultimate.calculate(ufInput);

    // ──────────────────────────────────────────────────────────────────
    // Step 4: Build mode-specific recommendation
    // ──────────────────────────────────────────────────────────────────
    const recommendation = this.buildModeRecommendation(sfc, mode, axis_factors, input, warnings);

    // ──────────────────────────────────────────────────────────────────
    // Step 5: MRR ranking across tool library
    // ──────────────────────────────────────────────────────────────────
    const mrr_ranking = this.rankToolLibrary(input, axis_factors);

    // ──────────────────────────────────────────────────────────────────
    // Step 6: ROI investment popup
    // ──────────────────────────────────────────────────────────────────
    const roi_investment = this.computeROIPopup(input, recommendation);

    // ──────────────────────────────────────────────────────────────────
    // Step 7: Spindle tuning (holder + balance + operator capability)
    // ──────────────────────────────────────────────────────────────────
    const spindle_tuning = this.computeSpindleTuning(input, recommendation.spindle_rpm);

    // ──────────────────────────────────────────────────────────────────
    // Step 8: Workholding feasibility check
    // ──────────────────────────────────────────────────────────────────
    const workholding_check = this.checkWorkholding(input, sfc, axis_factors);

    // Aggregate warnings/recommendations from steps
    warnings.push(...sfc.warnings);
    recommendations.push(...sfc.recommendations);
    if (!spindle_tuning.balance_ok) {
      warnings.push(
        `Holder balance class insufficient for ${recommendation.spindle_rpm} RPM — derate to ${spindle_tuning.derated_safe_rpm} RPM or upgrade to ${spindle_tuning.required_balance_class}`,
      );
    }
    if (!workholding_check.feasible) {
      warnings.push(
        `Workholding inadequate — required ${workholding_check.required_clamp_force_kn.toFixed(1)} kN, available ${workholding_check.available_clamp_force_kn.toFixed(1)} kN`,
      );
    }

    // ──────────────────────────────────────────────────────────────────
    // Step 9: Resolve all 9 axes (with defaults) for traceability
    // ──────────────────────────────────────────────────────────────────
    const resolved_axes = this.resolveAxes(input);

    const result: NineAxisResult = {
      mode,
      sfc,
      axis_factors,
      recommendation,
      mrr_ranking,
      roi_investment,
      spindle_tuning,
      workholding_check,
      warnings,
      recommendations,
      resolved_axes,
    };

    // Auto-propagation — best-effort; never throws back into SFC path.
    // Every run() emission auto-publishes to the propagation bridge so
    // post-processors + mill/lathe/wedm wizards + print-to-program pipeline
    // see the new snapshot without an explicit re-fetch.
    try {
      speedFeedPropagationBridgeEngine.publish(input, result);
    } catch (_err) {
      // Best-effort — propagation failure must not break the SFC recommendation
    }

    // Outcome-feedback capture — closes audit F9. The AI-ladder calibration
    // sink reads from this ring buffer to fold actuals back into
    // calibrationFactors. Best-effort: never throws.
    try {
      speedFeedOutcomeFeedbackBridgeEngine.capture(input, result);
    } catch (_err) {
      // Best-effort — outcome-feedback failure must not break SFC
    }

    return result;
  }

  // ──────────────────────────────────────────────────────────────────
  // Axis-factor derivation
  // ──────────────────────────────────────────────────────────────────

  private deriveAxisFactors(input: NineAxisInput, warnings: string[]): AxisFactors {
    const notes: string[] = [];

    // Axis 1 — Machine rigidity
    const m = input.machine ?? {};
    const wayMult = WAY_TYPE_RIGIDITY[m.way_type ?? "hybrid_way"];
    const buildMult = BUILD_QUALITY_RIGIDITY[m.build_quality ?? "production"];
    let machine_rigidity_factor = wayMult * buildMult;
    if (m.weight_kg && m.weight_kg > 5000) machine_rigidity_factor *= 1.05; // heavy machine
    notes.push(
      `Machine rigidity factor ${machine_rigidity_factor.toFixed(3)} (way=${m.way_type ?? "hybrid"}, build=${m.build_quality ?? "production"})`,
    );

    // Axis 3 — Controller smoothing
    const c = input.controller ?? {};
    let controller_smoothing_factor = 1.0;
    if (c.high_speed_machining) controller_smoothing_factor *= CONTROLLER_HSM_MULT;
    if (c.ai_contour_control) controller_smoothing_factor *= CONTROLLER_AICC_MULT;
    if (c.smoothing) controller_smoothing_factor *= CONTROLLER_SMOOTHING_MULT;
    if (c.end_point_control) controller_smoothing_factor *= CONTROLLER_EPC_MULT;
    if (c.look_ahead_blocks && c.look_ahead_blocks > 400) {
      controller_smoothing_factor *= CONTROLLER_LOOK_AHEAD_MULT_MAX;
    } else if (c.look_ahead_blocks && c.look_ahead_blocks > 60) {
      controller_smoothing_factor *= CONTROLLER_LOOK_AHEAD_MULT_STD;
    }
    // Cap at 1.8 — extremely aggressive
    controller_smoothing_factor = Math.min(controller_smoothing_factor, 1.8);
    notes.push(`Controller smoothing factor ${controller_smoothing_factor.toFixed(3)}`);

    // Axis 6 — Holder balance max RPM
    const h = input.tool_holder ?? {};
    const balanceClass = h.balance_class ?? "g6_3";
    let holder_balance_max_rpm = BALANCE_CLASS_MAX_RPM[balanceClass];
    if (!h.operator_has_balancer && (balanceClass === "g0_4" || balanceClass === "g1" || balanceClass === "g2_5")) {
      // Operator can't actually achieve the rated balance without equipment
      holder_balance_max_rpm = BALANCE_CLASS_MAX_RPM.g6_3;
      notes.push(`Operator lacks balancer — derated to G6.3 max RPM ${holder_balance_max_rpm}`);
    }

    // Axis 8 — Coolant effectiveness
    const cool = input.coolant ?? {};
    let coolant_effectiveness = COOLANT_EFFECTIVENESS[cool.type ?? "flood"];
    if (cool.ph !== undefined && cool.type !== "dry" && cool.type !== "air_blast" && cool.type !== "mql") {
      // water-soluble — pH degradation
      if (cool.ph < 8.5 || cool.ph > 9.5) {
        coolant_effectiveness *= 0.85;
        warnings.push(`Coolant pH ${cool.ph} out of 8.8–9.2 ideal range — reduces effectiveness 15%`);
      }
    }
    if (cool.age_weeks && cool.age_weeks > 26) {
      coolant_effectiveness *= 0.90;
      warnings.push(`Coolant age ${cool.age_weeks} weeks — recommend dump+refresh`);
    }
    // U-OSC-SPINDLE-TSC: through-spindle coolant delivery raises achievable MRR (heat extraction +
    // chip evacuation) on a coolant TYPE that does not already model thru-tool delivery. Gated off
    // `through_tool` (1.25) + `cryogenic` (1.40) to avoid double-counting their built-in delivery.
    // MRR-only effect (vc/rpm/fz unchanged); the Taylor tool-life credit stays inside the core engine.
    if (input.spindle?.through_spindle_coolant === true && cool.type !== "through_tool" && cool.type !== "cryogenic") {
      coolant_effectiveness *= TSC_EFFECTIVENESS_BONUS;
    }
    // Clamp the COMPOUNDED factor: it feeds the post-engine MRR scalar (see the mode branches), which
    // bypasses the core power/torque envelope -- so the stacked type x penalties x TSC must be bounded.
    coolant_effectiveness = Math.min(coolant_effectiveness, COOLANT_EFFECTIVENESS_MAX);

    // Axis 9 — Toolpath engagement
    const tp = input.toolpath ?? {};
    const toolpath_engagement_factor = TOOLPATH_ENGAGEMENT[tp.strategy ?? "conventional"];

    // Axis 5 — Workholding safety factor (computed in checkWorkholding, placeholder here)
    const workholding_safety_factor = 1.0; // resolved later

    return {
      machine_rigidity_factor,
      controller_smoothing_factor,
      workholding_safety_factor,
      holder_balance_max_rpm,
      coolant_effectiveness,
      toolpath_engagement_factor,
      notes,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Translate 9-axis → UltimateSpeedFeedInput
  // ──────────────────────────────────────────────────────────────────

  private translateToUltimate(
    input: NineAxisInput,
    factors: AxisFactors,
    mode: OptimizationMode,
  ): UltimateSpeedFeedInput {
    const m = input.machine ?? {};
    const t = input.tooling;
    const tp = input.toolpath ?? {};
    const cool = input.coolant ?? {};
    const h = input.tool_holder ?? {};

    // Mode → optimize_for translation
    const optimizeFor: UltimateSpeedFeedInput["optimize_for"] =
      mode === "cost_batch"
        ? "tool_life"          // Gilbert V_min_cost
        : mode === "aggressive_rush"
        ? "productivity"        // Gilbert V_max_prod
        : "balanced";           // Pareto knee

    return {
      material: input.material.name,
      iso_group: input.material.iso_group,
      hardness_hb: input.material.hardness_hb,
      hardness_hrc: input.material.hardness_hrc,

      tool_diameter_mm: t.tool_diameter_mm,
      flutes: t.flutes,
      tool_material: t.tool_material,
      tool_coating: t.coating,
      helix_angle_deg: t.helix_angle_deg,
      corner_radius_mm: t.corner_radius_mm,
      tool_stickout_mm: t.stickout_mm,

      operation: tp.operation,
      cut_type: tp.cut_type,
      strategy: tp.strategy,

      axial_depth_mm: tp.axial_depth_mm,
      radial_depth_mm: tp.radial_depth_mm,
      radial_depth_pct: tp.radial_depth_pct,

      machine_power_kw: m.power_kw,
      machine_max_rpm: Math.min(
        m.max_rpm ?? Infinity,
        factors.holder_balance_max_rpm,
      ),
      machine_max_torque_nm: m.max_torque_nm,
      machine_rigidity: m.rigidity,

      coolant: cool.type,

      // Runout — sum of spindle + holder + tool TIR
      holder_runout_mm: h.runout_tir_um
        ? h.runout_tir_um / 1000
        : h.type
        ? HOLDER_RUNOUT_TIR_UM[h.type] / 1000
        : undefined,

      // Economics
      tool_cost_usd: t.tool_cost_usd,
      regrindable: t.regrindable,
      regrinds_available: t.regrinds_available,
      regrind_cost_usd: t.regrind_cost_usd,

      optimize_for: optimizeFor,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Build mode-specific recommendation
  // ──────────────────────────────────────────────────────────────────

  private buildModeRecommendation(
    sfc: UltimateSpeedFeedResult,
    mode: OptimizationMode,
    factors: AxisFactors,
    input: NineAxisInput,
    warnings: string[],
  ): ModeRecommendation {
    // sfc is ALREADY mode-correct because translateToUltimate() passes the right
    // optimize_for to UltimateSpeedFeedEngine. We READ canonical values directly
    // here — no inlined Taylor exponents (per CLAUDE.md "NEVER inline Taylor").
    // All scaling math lives in UltimateSpeedFeedEngine which sources kc1.1 / n / C
    // from src/physics/constants.ts.
    let vc = sfc.cutting_speed.value;
    let rpm = sfc.spindle_rpm.value;
    let fz = sfc.feed_per_tooth.value;
    let feed = sfc.feed_rate.value;
    let ap = sfc.axial_depth.value;
    let ae = sfc.radial_depth.value;
    let mrr = sfc.mrr.value;
    let life = sfc.tool_life.life_minutes.value;
    const sfcCostPerPart = sfc.tool_life.cost_per_part?.value;
    let explanation = "";

    if (mode === "cost_batch") {
      explanation =
        `Cost-batch mode — Gilbert V_min_cost (longest tool life × lowest $/part). ` +
        `Optimal for batches ≥${input.batch_size ?? 100} parts. SFC engine used optimize_for=tool_life.`;
    } else if (mode === "aggressive_rush") {
      // Apply controller smoothing as a feed/MRR multiplier — this is a controller
      // capability (HSM/AICC/smoothing increases achievable feed at constant chip-load),
      // NOT a tool-life adjustment. Tool life remains the canonical SFC value.
      feed *= factors.controller_smoothing_factor;
      mrr *= factors.controller_smoothing_factor;
      explanation =
        `Aggressive-rush mode — Gilbert V_max_prod biased by controller smoothing (${factors.controller_smoothing_factor.toFixed(2)}×). ` +
        `SFC engine used optimize_for=productivity; controller multiplier applies to feed/MRR only.`;
    } else {
      // PRISM-optimized — Pareto knee. Use sfc.alternatives.balanced as the
      // canonical Pareto-knee values from UltimateSpeedFeedEngine, then apply
      // 9-axis multipliers ONLY to MRR (rigidity × coolant). Vc/RPM/fz are
      // already the engine-computed Pareto-knee values.
      const alt = sfc.alternatives.balanced;
      vc = alt.vc;
      rpm = (alt.vc / sfc.cutting_speed.value) * sfc.spindle_rpm.value;
      fz = alt.fz;
      ap = alt.ap;
      // Honor an operator-supplied radial engagement (toolpath.radial_depth_mm/_pct). The SFC
      // engine ALREADY resolved it into sfc.radial_depth.value AND computed sfc.forces at that
      // SAME ae (hex chip thickness, UltimateSpeedFeedEngine STEP 9) using the >0 truthy rule
      // below -- so reading the resolved value keeps the downstream workholding + spindle-power
      // clamps force-consistent (they read sfc.forces, which already reflect this ae; no separate
      // re-derivation needed). Absent any radial input we fall back to the balanced Pareto-knee
      // alternative's table ae_pct -- backward-compatible (the vendor gauntlet sets no radial
      // input, so it stays byte-identical). Match the engine's >0 truthiness (2199-2214): a 0 /
      // NaN / negative radial is "not provided", never an inert zero-width cut.
      const tpRadMm = input.toolpath?.radial_depth_mm;
      const tpRadPct = input.toolpath?.radial_depth_pct;
      const userGaveRadial =
        (Number.isFinite(tpRadMm) && (tpRadMm as number) > 0) ||
        (Number.isFinite(tpRadPct) && (tpRadPct as number) > 0);
      ae = userGaveRadial
        ? sfc.radial_depth.value
        : (alt.ae_pct / 100) * input.tooling.tool_diameter_mm;
      feed = fz * (input.tooling.flutes ?? 4) * rpm;
      // U-OSC-CONTROLLER-FEATURES: controller smoothing (HSM / AICC / nano-smoothing / end-point
      // control) raises the achievable FEED at constant chip-load on the default Pareto-knee path
      // too, not only in aggressive_rush. It is a controller CAPABILITY (the machine holds the
      // already-validated feed through corners), NOT a cutting-mechanics change: fz and vc stay
      // canonical, so Kienzle Fc = kc1.1*ap*fz^(1-mc) and Taylor T = (C/Vc)^(1/n) are untouched and
      // need no force re-check. mrr is derived from the smoothed feed below (applied ONCE, no
      // double-count). When no controller features are set the factor is 1.0 (backward-compatible).
      // cost_batch deliberately omits this (V_min_cost must not be inflated by smoothing capability).
      feed *= factors.controller_smoothing_factor;
      mrr = (ap * ae * feed) / 1000;
      mrr *= factors.machine_rigidity_factor * factors.coolant_effectiveness;
      // life stays at sfc.tool_life.life_minutes -- already balanced-mode value
      explanation =
        `PRISM-optimized mode -- Pareto knee on MRR x cost-efficiency frontier with 9-axis MRR multipliers ` +
        `(rigidity ${factors.machine_rigidity_factor.toFixed(2)}, coolant ${factors.coolant_effectiveness.toFixed(2)}, ` +
        `controller ${factors.controller_smoothing_factor.toFixed(2)}). ` +
        `Tool life sourced from SFC engine balanced alternative.`;
    }

    // Sanity clamp — never exceed machine envelope or balance limit
    const maxRpm = Math.min(
      input.machine?.max_rpm ?? Infinity,
      factors.holder_balance_max_rpm,
    );
    if (Number.isFinite(maxRpm) && rpm > maxRpm) {
      const scale = maxRpm / rpm;
      rpm = maxRpm;
      feed *= scale;
      vc *= scale;
      mrr *= scale;
    }

    // Workholding-adequacy derate (part-retention safety). OSCAR-SFC-9AXIS-MS0/
    // U-OSC-WORKHOLDING-FORCE-CAP, physics-reviewed 2026-06-09.
    // The IN-PLANE drive force (tangential + radial) is what the workholding must resist;
    // axial (vertical in milling) is reacted by the part seating on parallels, so it is
    // EXCLUDED -- including it (the full resultant) over-derates routine setups. Effective
    // hold capacity = clamp x friction x form-closure-credit-per-type, so a seated vise/
    // chuck/tombstone is NOT regressed while vacuum/magnetic holds are correctly flagged.
    // SAFE direction only (derates feed/fz/MRR, never raises); speed/RPM untouched.
    const whType = input.workholding?.type ?? "kurt_vise";
    const whClampN =
      (input.workholding?.clamp_force_available_kn ?? WORKHOLDING_CLAMP_FORCE_DEFAULT_KN[whType]) * 1000;
    const whMu = input.workholding?.friction_coefficient ?? WORKHOLDING_FRICTION_DEFAULT[whType];
    const whFormClosure = WORKHOLDING_FORM_CLOSURE_FACTOR[whType];
    const fTan = sfc.forces?.tangential_force_N?.value;
    const fRad = sfc.forces?.radial_force_N?.value;
    const kien = CANONICAL_KIENZLE[input.material.iso_group];
    if (
      Number.isFinite(fTan) && Number.isFinite(fRad) && kien &&
      Number.isFinite(whClampN) && whClampN > 0 && whMu > 0 && whFormClosure > 0
    ) {
      const fDrive = Math.hypot(fTan as number, fRad as number); // in-plane horizontal force (N)
      const whSf =
        WORKHOLDING_RETENTION_SF[input.toolpath?.cut_type ?? "roughing"] ?? WORKHOLDING_RETENTION_SF.general;
      const cEff = whClampN * whMu * whFormClosure;               // effective in-plane retention (N)
      const retentionRatio = (fDrive * whSf) / cEff;
      if (retentionRatio > 1.0 && fDrive > 0) {
        // Fc proportional to fz^(1-mc): to cut the drive force by 1/retentionRatio, reduce
        // fz by retentionRatio^(-1/(1-mc)). mc canonical (CANONICAL_KIENZLE), never inlined.
        const fzScale = Math.pow(1 / retentionRatio, 1 / (1 - kien.mc));
        fz *= fzScale;
        feed *= fzScale;  // Vf = fz x flutes x rpm -> scales with fz (preserves mode-specific feed basis)
        mrr *= fzScale;
        if (fz < WORKHOLDING_DERATE_FZ_MIN_MM) {
          warnings.push(
            `Workholding ${whType} (${(whClampN / 1000).toFixed(0)}kN x mu${whMu} x form-closure ${whFormClosure} = ` +
            `${cEff.toFixed(0)}N hold) cannot retain the part at a sustainable chip load ` +
            `(retention ratio ${retentionRatio.toFixed(2)}, derated fz ${fz.toFixed(4)}mm < ${WORKHOLDING_DERATE_FZ_MIN_MM}mm floor). ` +
            `Add clamps, raise clamp force, reduce DOC, or change workholding -- cut is part-retention-infeasible.`,
          );
        } else {
          warnings.push(
            `Workholding-adequacy derate: ${whType} in-plane retention ratio ${retentionRatio.toFixed(2)} ` +
            `(drive ${fDrive.toFixed(0)}N x SF ${whSf} vs ${cEff.toFixed(0)}N effective hold) -> ` +
            `feed/fz x ${fzScale.toFixed(2)} for part-retention safety.`,
          );
        }
      }
    }
    // Spindle-power clamp (achievability). OSCAR-SFC-9AXIS-MS0/U-OSC-SPINDLE-POWER-CLAMP.
    // A speed/feed CALCULATOR must recommend an ACHIEVABLE cut: required cutting power
    // P = Fc x Vc / 60000 must fit the LIMITING of machine vs spindle rated power (x drivetrain
    // efficiency). Only engages when the operator supplies a power input (machine.power_kw or
    // spindle.hp); absent both, no clamp (preserves prior behaviour -- the core engine already
    // carries its own power advisory). SAFE direction only (derates feed/fz/MRR, never raises).
    // Runs AFTER the workholding derate, so Fc is recomputed at the CURRENT (already-derated)
    // chip load and Vc, and the more-binding of the two constraints wins.
    const machineKw = input.machine?.power_kw;
    const spindleKw = input.spindle?.hp != null ? input.spindle.hp * HP_TO_KW : undefined;
    const ratedKw = [machineKw, spindleKw].filter(
      (x): x is number => typeof x === "number" && Number.isFinite(x) && x > 0,
    );
    if (ratedKw.length > 0 && kien) {
      const availKw = Math.min(...ratedKw) * SPINDLE_POWER_EFFICIENCY; // limiting element at the cutter
      const fzOrig = sfc.feed_per_tooth.value;
      const fcOrig = sfc.forces?.tangential_force_N?.value;
      if (Number.isFinite(fcOrig) && Number.isFinite(fzOrig) && (fzOrig as number) > 0 && fz > 0) {
        // Fc proportional to fz^(1-mc): scale the engine's corrected force to the current chip load.
        const fcNow = (fcOrig as number) * Math.pow(fz / (fzOrig as number), 1 - kien.mc);
        const reqKw = (fcNow * vc) / 60000; // P = Fc x Vc / 60000
        if (availKw > 0 && reqKw > availKw) {
          // P proportional to fz^(1-mc) at fixed Vc: reduce fz to bring power within the envelope.
          const powerScale = Math.pow(availKw / reqKw, 1 / (1 - kien.mc));
          fz *= powerScale;
          feed *= powerScale;
          mrr *= powerScale;
          warnings.push(
            `Spindle-power clamp: required ${reqKw.toFixed(1)}kW > available ${availKw.toFixed(1)}kW ` +
            `(limiting of machine/spindle rated x ${SPINDLE_POWER_EFFICIENCY} drivetrain eff) -> ` +
            `feed/fz x ${powerScale.toFixed(2)} to fit the power envelope. Reduce DOC or use a higher-power spindle for more MRR.`,
          );
        }
      }
    }

    // Holder/total-runout tool-LIFE advisory. OSCAR-SFC-9AXIS-MS0/U-OSC-HOLDER-RUNOUT-DEDUP.
    // The core engine (UltimateSpeedFeedEngine, U-OSC-RUNOUT-LIFE-DERATE) now folds the runout
    // life reduction (runout_impact.life_reduction_pct, RSS of spindle+holder+tool TIR vs chip
    // load) DIRECTLY into sfc.tool_life.life_minutes -- so `life` (read above) is ALREADY derated,
    // ONCE, by the engine. This block must NOT re-apply it: a prior `life *= keep` here predated
    // the engine derate and, once the engine owned the model, double-counted it (tool_life_min
    // collapsed to raw * keep^2). We REUSE the engine's single model (R8 -- no fork) and only
    // SURFACE the advisory so the operator sees the cause + the recovery path. tool_holder.type
    // remains LIVE because translateToUltimate() maps type -> HOLDER_RUNOUT_TIR_UM -> the engine.
    const runoutLifePct = sfc.runout_impact?.life_reduction_pct?.value;
    if (Number.isFinite(runoutLifePct) && (runoutLifePct as number) > 0) {
      warnings.push(
        `Holder-runout tool-life impact: TIR reduces tool life ~${(runoutLifePct as number).toFixed(0)}% ` +
        `(runout_impact -- RSS spindle+holder+tool TIR vs chip load; already folded into tool_life by ` +
        `the SFC engine). A higher-precision holder (shrink-fit/HSK, ~3um TIR) recovers life.`,
      );
    }

    // Finish-Ra cap (U-OSC-FINISH-RA-CAP). Kinematic nose-cusp ceiling on fz so the
    // predicted finish meets an operator-requested target_ra_um. MIN-ceiling ONLY (never
    // raises fz); placed LAST so it ceilings the already workholding/power-derated fz and
    // the most-binding constraint wins (physics-review 2026-06-09, GO verdict). Ra ~=
    // fz^2/(32r) (Boothroyd & Knight; Sandvik 2024), inverted via the canonical predictedRa
    // (Ra = K*fz^2 with K = predictedRa(1, r)) so NO constant is inlined and the cap
    // round-trips with the core's own forward Ra. Speed/RPM untouched (finish is a
    // feed-direction effect). The core has NO Ra->fz inversion (verified by physics-review)
    // so this is a NEW constraint, not a double-count of cut_type (a category fz-row pick).
    const targetRaUm = input.toolpath?.target_ra_um;
    if (Number.isFinite(targetRaUm) && (targetRaUm as number) > 0) {
      const noseR = input.tooling.corner_radius_mm;
      if (!Number.isFinite(noseR) || (noseR as number) <= FINISH_RA_CAP_MIN_R_MM) {
        warnings.push(
          `Finish-Ra cap SKIPPED: target_ra_um=${targetRaUm} needs a nose/corner radius but ` +
          `corner_radius_mm=${noseR ?? "none"} (<= ${FINISH_RA_CAP_MIN_R_MM}mm). Ra~=fz^2/(32r) models a ` +
          `round-nosed cusp; square-end wall finish is set by runout/deflection, not nose cusp. ` +
          `Provide a corner_radius_mm or accept the category fz.`,
        );
      } else {
        // fz_max from Ra = K*fz^2, K = predictedRa(1mm, r) [um per mm^2]; K>0 since r>min.
        const kRaPerFz2 = predictedRa(1, noseR as number);
        const fzRaMax = Math.sqrt((targetRaUm as number) / kRaPerFz2);
        if (fzRaMax > 0 && fzRaMax < fz) {
          if (fzRaMax < FINISH_RA_CAP_FZ_MIN_MM) {
            // Infeasible by feed alone -- fail loud (R12). Clamp to floor; target NOT met.
            const scale = FINISH_RA_CAP_FZ_MIN_MM / fz;
            fz = FINISH_RA_CAP_FZ_MIN_MM;
            feed *= scale;
            mrr *= scale;
            warnings.push(
              `Finish-Ra cap: target Ra ${targetRaUm}um needs fz ${fzRaMax.toFixed(4)}mm < ` +
              `${FINISH_RA_CAP_FZ_MIN_MM}mm rubbing floor (nose r=${noseR}mm). Target NOT met at the ` +
              `floor -- increase nose radius, add a skim/finish pass, or use grinding/honing.`,
            );
          } else {
            const scale = fzRaMax / fz;
            fz = fzRaMax;
            feed *= scale;
            mrr *= scale;
            warnings.push(
              `Finish-Ra cap: fz capped to ${fz.toFixed(4)}mm (x${scale.toFixed(2)}) so predicted ` +
              `Ra~=fz^2/(32r) meets target ${targetRaUm}um at nose r=${noseR}mm. Speed/RPM unchanged.`,
            );
          }
        }
        // else fzRaMax >= fz -> no-op: the category fz already meets the requested Ra.
      }
    }

    if (rpm < 50) rpm = 50;
    if (feed < 10) feed = 10;

    // Cycle time + cost-per-part — REQUIRES part_volume_cm3. No fabrication.
    // Per [[feedback_fail_loud]]: return null + warning rather than hardcoded fake.
    let cycle_time_min: number | null = null;
    let costPerPart: number | null = null;
    const partVolumeCm3 = input.part_volume_cm3;

    if (partVolumeCm3 !== undefined && partVolumeCm3 > 0 && mrr > 0) {
      cycle_time_min = partVolumeCm3 / mrr;
      // Cost from SFC engine if available, else derive from cycle time + tool wear.
      // Machine cost rate sourced from input (input.tooling extension) — never hardcoded.
      if (sfcCostPerPart !== undefined && sfcCostPerPart > 0) {
        costPerPart = sfcCostPerPart;
      } else if (life > 0 && input.tooling.tool_cost_usd) {
        const partsPerTool = life / cycle_time_min;
        // No machine rate inlined here — operator-supplied or omitted.
        // For tool-cost component only (machine cost requires explicit rate input).
        costPerPart = input.tooling.tool_cost_usd / Math.max(partsPerTool, 1);
      }
    } else if (partVolumeCm3 === undefined) {
      warnings.push(
        "cycle_time_min and cost_per_part_usd are null — provide input.part_volume_cm3 (cm³ of material to remove) to compute.",
      );
    }

    return {
      mode,
      cutting_speed_mpm: round(vc, 1),
      spindle_rpm: Math.round(rpm),
      feed_rate_mmmin: Math.round(feed),
      feed_per_tooth_mm: round(fz, 4),
      axial_depth_mm: round(ap, 3),
      radial_depth_mm: round(ae, 3),
      mrr_cm3min: round(mrr, 2),
      tool_life_min: round(life, 1),
      cost_per_part_usd: costPerPart !== null ? round(costPerPart, 4) : null,
      cycle_time_min: cycle_time_min !== null ? round(cycle_time_min, 2) : null,
      mode_explanation: explanation,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // MRR ranking across the operator's tool library
  // ──────────────────────────────────────────────────────────────────

  private rankToolLibrary(input: NineAxisInput, factors: AxisFactors): MRRRankingEntry[] {
    const library = input.tool_library;
    if (!library || library.length === 0) {
      // Return a single-row ranking of the current tool
      return [
        {
          rank: 1,
          config_label: "current_tool",
          tool_diameter_mm: input.tooling.tool_diameter_mm,
          flutes: input.tooling.flutes ?? 4,
          tool_material: input.tooling.tool_material ?? "carbide",
          coating: input.tooling.coating,
          mrr_cm3min: 0,
          cost_per_part_usd: 0,
          tool_life_min: 0,
          score: 0,
        },
      ];
    }

    const entries: MRRRankingEntry[] = library.map((tool, idx) => {
      // Run a quick UltimateSpeedFeedEngine pass for each tool config
      const ufInput: UltimateSpeedFeedInput = this.translateToUltimate(
        {
          ...input,
          tooling: {
            ...input.tooling,
            tool_diameter_mm: tool.diameter_mm,
            flutes: tool.flutes,
            tool_material: tool.tool_material,
            coating: tool.coating,
            tool_cost_usd: tool.cost_usd,
          },
        },
        factors,
        "prism_optimized",
      );

      try {
        const result = this.ultimate.calculate(ufInput);
        const mrr = result.mrr.value * factors.machine_rigidity_factor * factors.coolant_effectiveness;
        const life = result.tool_life.life_minutes.value;
        const costPerPart = result.tool_life.cost_per_part?.value ?? tool.cost_usd / 50;
        const score = costPerPart > 0 ? mrr / costPerPart : 0;
        return {
          rank: idx + 1,
          config_label: tool.label,
          tool_diameter_mm: tool.diameter_mm,
          flutes: tool.flutes,
          tool_material: tool.tool_material,
          coating: tool.coating,
          mrr_cm3min: round(mrr, 2),
          cost_per_part_usd: round(costPerPart, 4),
          tool_life_min: round(life, 1),
          score: round(score, 3),
        };
      } catch {
        return {
          rank: idx + 1,
          config_label: tool.label,
          tool_diameter_mm: tool.diameter_mm,
          flutes: tool.flutes,
          tool_material: tool.tool_material,
          coating: tool.coating,
          mrr_cm3min: 0,
          cost_per_part_usd: 0,
          tool_life_min: 0,
          score: 0,
        };
      }
    });

    entries.sort((a, b) => b.score - a.score);
    entries.forEach((e, i) => {
      e.rank = i + 1;
    });
    return entries;
  }

  // ──────────────────────────────────────────────────────────────────
  // ROI investment popup
  // ──────────────────────────────────────────────────────────────────

  private computeROIPopup(
    input: NineAxisInput,
    rec: ModeRecommendation,
  ): ROIPopup {
    const current_cost_per_part_usd = rec.cost_per_part_usd;
    const suggestions: ROIInvestmentSuggestion[] = [];

    // Suggestion 1 — Premium coated carbide (TiAlN/AlTiN nano)
    if (!input.tooling.coating || input.tooling.coating.toLowerCase().includes("uncoated")) {
      suggestions.push({
        investment: "Premium PVD-coated carbide insert (Sandvik GC1135 / Kennametal KCFM45)",
        price_usd_range: [80, 180],
        cost_per_part_after_usd: current_cost_per_part_usd * 0.70,
        mrr_increase_pct: 30,
        tool_life_multiplier: 2.5,
        payback_parts: Math.ceil(150 / Math.max(current_cost_per_part_usd * 0.30, 0.01)),
        roi_score: 0.85,
      });
    }

    // Suggestion 2 — Shrink-fit holder upgrade
    const holder = input.tool_holder?.type;
    if (holder && (holder === "er_collet" || holder === "mill_chuck")) {
      suggestions.push({
        investment: "Shrink-fit holder (Big Daishowa BBT40-SK16 / Schunk TRIBOS)",
        price_usd_range: [350, 800],
        cost_per_part_after_usd: current_cost_per_part_usd * 0.85,
        mrr_increase_pct: 15,
        tool_life_multiplier: 1.6,
        payback_parts: Math.ceil(600 / Math.max(current_cost_per_part_usd * 0.15, 0.01)),
        roi_score: 0.72,
      });
    }

    // Suggestion 3 — Higher balance class for HSM
    const balance = input.tool_holder?.balance_class ?? "g6_3";
    if ((balance === "g16" || balance === "g40" || balance === "g6_3") && rec.spindle_rpm > 8000) {
      suggestions.push({
        investment: "G2.5 balanced holder + balancing service (REGO-FIX powRgrip / Haimer 3D Sensor)",
        price_usd_range: [200, 600],
        cost_per_part_after_usd: current_cost_per_part_usd * 0.80,
        mrr_increase_pct: 20,
        tool_life_multiplier: 1.4,
        payback_parts: Math.ceil(400 / Math.max(current_cost_per_part_usd * 0.20, 0.01)),
        roi_score: 0.78,
      });
    }

    // Suggestion 4 — HSM machine controller upgrade
    if (input.controller?.high_speed_machining !== true && rec.spindle_rpm > 6000) {
      suggestions.push({
        investment: "Controller HSM/AICC option (Fanuc AICC II / Siemens Top Surface)",
        price_usd_range: [5000, 18000],
        cost_per_part_after_usd: current_cost_per_part_usd * 0.65,
        mrr_increase_pct: 30,
        tool_life_multiplier: 1.2,
        payback_parts: Math.ceil(12000 / Math.max(current_cost_per_part_usd * 0.35, 0.01)),
        roi_score: 0.55,
      });
    }

    // Suggestion 5 — Through-spindle coolant
    if (input.spindle?.through_spindle_coolant !== true && input.toolpath?.operation === "drilling") {
      suggestions.push({
        investment: "Through-spindle coolant (TSC) — 70 bar minimum",
        price_usd_range: [8000, 25000],
        cost_per_part_after_usd: current_cost_per_part_usd * 0.60,
        mrr_increase_pct: 40,
        tool_life_multiplier: 2.0,
        payback_parts: Math.ceil(18000 / Math.max(current_cost_per_part_usd * 0.40, 0.01)),
        roi_score: 0.68,
      });
    }

    suggestions.sort((a, b) => b.roi_score - a.roi_score);
    const show_popup = suggestions.length > 0 && suggestions[0]!.roi_score > 0.50;

    return {
      show_popup,
      current_cost_per_part_usd: round(current_cost_per_part_usd, 4),
      suggestions,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Spindle tuning advisory
  // ──────────────────────────────────────────────────────────────────

  private computeSpindleTuning(input: NineAxisInput, target_rpm: number): SpindleTuning {
    const h = input.tool_holder ?? {};
    const opBal = h.operator_has_balancer === true;
    const declared = h.balance_class ?? "g6_3";

    // Determine required class for target RPM
    let required: BalanceClass = "g6_3";
    if (target_rpm > 24000) required = "g1";
    else if (target_rpm > 12000) required = "g2_5";
    else if (target_rpm > 8000) required = "g6_3";
    else required = "g16";

    // Effective class operator can deliver
    const effective: BalanceClass = opBal ? declared : (
      ["g0_4", "g1", "g2_5"].includes(declared) ? "g6_3" : declared
    );

    const balance_ok = BALANCE_CLASS_MAX_RPM[effective] >= target_rpm;
    const derated_safe_rpm = balance_ok
      ? target_rpm
      : BALANCE_CLASS_MAX_RPM[effective];

    // Sweet spot — typically 80-90% of derated max, snapped to round 500
    const sweet_spot_rpm = Math.round((derated_safe_rpm * 0.85) / 500) * 500;

    const coast_down_advisory = !balance_ok
      ? `Spindle-up gradually (500 RPM/sec ramp), feed listening for resonance changes. ` +
        `If audible chatter > vibration, drop ~10% RPM and re-test. Target sweet-spot ${sweet_spot_rpm} RPM.`
      : `Direct ramp to ${target_rpm} RPM OK with G${required.replace("g", "").replace("_", ".")} balance.`;

    return {
      sweet_spot_rpm,
      required_balance_class: required,
      balance_ok,
      coast_down_advisory,
      derated_safe_rpm,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Workholding feasibility — clamp force vs cutting force
  // ──────────────────────────────────────────────────────────────────

  private checkWorkholding(
    input: NineAxisInput,
    sfc: UltimateSpeedFeedResult,
    factors: AxisFactors,
  ): NineAxisResult["workholding_check"] {
    const w = input.workholding ?? {};
    const type = w.type ?? "kurt_vise";
    const friction = w.friction_coefficient ?? WORKHOLDING_FRICTION_DEFAULT[type];

    // Resultant cutting force (N)
    const Fcut = sfc.forces.resultant_force_N.value;

    // Required clamp force: F_clamp ≥ Fcut × SF / μ (sliding) — SF=2.0 dynamic
    const SF = 2.0;
    const required_clamp_force_n = (Fcut * SF) / Math.max(friction, 0.05);
    const required_clamp_force_kn = required_clamp_force_n / 1000;

    const available_clamp_force_kn = w.clamp_force_available_kn ?? WORKHOLDING_CLAMP_FORCE_DEFAULT_KN[type];
    const safety_factor = available_clamp_force_kn / Math.max(required_clamp_force_kn, 0.001);
    const feasible = safety_factor >= 1.5;

    factors.workholding_safety_factor = safety_factor;

    const notes: string[] = [
      `Cutting force resultant: ${Fcut.toFixed(0)} N`,
      `Required clamp (μ=${friction}, SF=${SF}): ${required_clamp_force_kn.toFixed(1)} kN`,
      `Available (${type}): ${available_clamp_force_kn.toFixed(1)} kN`,
      `Safety factor: ${safety_factor.toFixed(2)}× ${feasible ? "✓" : "FAIL (need ≥1.5)"}`,
    ];

    if (w.parallel_size_mm && w.parallel_size_mm < 25 && type === "kurt_vise") {
      notes.push(`Kurt vise parallel ${w.parallel_size_mm}mm is small — consider 50mm parallels for better grip`);
    }
    if (w.contact_area_mm2 && w.contact_area_mm2 > 0) {
      const pressure_mpa = (available_clamp_force_kn * 1000) / w.contact_area_mm2;
      notes.push(`Contact pressure: ${pressure_mpa.toFixed(1)} MPa`);
      if (pressure_mpa > 50 && input.material.name.toLowerCase().includes("aluminum")) {
        notes.push("WARNING: Pressure may deform aluminum part — increase contact area or reduce clamp force");
      }
    }

    return {
      required_clamp_force_kn: round(required_clamp_force_kn, 2),
      available_clamp_force_kn: round(available_clamp_force_kn, 2),
      safety_factor: round(safety_factor, 2),
      feasible,
      notes,
    };
  }

  // ──────────────────────────────────────────────────────────────────
  // Resolve all 9 axes (with defaults) for traceability
  // ──────────────────────────────────────────────────────────────────

  private resolveAxes(input: NineAxisInput): NineAxisResult["resolved_axes"] {
    return {
      machine: {
        name: input.machine?.name ?? "default_3axis_vmc",
        kinematics: input.machine?.kinematics ?? "3axis_vmc",
        work_envelope_mm: input.machine?.work_envelope_mm ?? { x: 1000, y: 600, z: 600 },
        build_quality: input.machine?.build_quality ?? "production",
        way_type: input.machine?.way_type ?? "hybrid_way",
        accuracy_um: input.machine?.accuracy_um ?? 10,
        g_force_max: input.machine?.g_force_max ?? 10,
        weight_kg: input.machine?.weight_kg ?? 5000,
        motion_control: input.machine?.motion_control ?? "servo",
        rigidity: input.machine?.rigidity ?? "medium",
        power_kw: input.machine?.power_kw ?? 15,
        max_rpm: input.machine?.max_rpm ?? 10000,
        max_torque_nm: input.machine?.max_torque_nm ?? 100,
        base_rpm: input.machine?.base_rpm ?? 1500,
        max_feed_mmmin: input.machine?.max_feed_mmmin ?? 15000,
      },
      spindle: {
        hp: input.spindle?.hp ?? 20,
        torque_curve: input.spindle?.torque_curve ?? [
          { rpm: 0, torque_nm: 100 },
          { rpm: 1500, torque_nm: 100 },
          { rpm: 10000, torque_nm: 15 },
        ],
        diameter_mm: input.spindle?.diameter_mm ?? 150,
        bigplus: input.spindle?.bigplus ?? false,
        through_spindle_coolant: input.spindle?.through_spindle_coolant ?? false,
      },
      controller: {
        brand: input.controller?.brand ?? "fanuc",
        high_speed_machining: input.controller?.high_speed_machining ?? false,
        end_point_control: input.controller?.end_point_control ?? false,
        smoothing: input.controller?.smoothing ?? false,
        look_ahead_blocks: input.controller?.look_ahead_blocks ?? 64,
        ai_contour_control: input.controller?.ai_contour_control ?? false,
        jerk_control: input.controller?.jerk_control ?? false,
      },
      material: input.material,
      workholding: {
        type: input.workholding?.type ?? "kurt_vise",
        clamp_force_available_kn:
          input.workholding?.clamp_force_available_kn ?? WORKHOLDING_CLAMP_FORCE_DEFAULT_KN.kurt_vise,
        parallel_size_mm: input.workholding?.parallel_size_mm ?? 50,
        jaw_depth_mm: input.workholding?.jaw_depth_mm ?? 25,
        contact_area_mm2: input.workholding?.contact_area_mm2 ?? 2500,
        friction_coefficient:
          input.workholding?.friction_coefficient ?? WORKHOLDING_FRICTION_DEFAULT.kurt_vise,
      },
      tool_holder: {
        type: input.tool_holder?.type ?? "cat40",
        bigplus: input.tool_holder?.bigplus ?? false,
        balance_class: input.tool_holder?.balance_class ?? "g6_3",
        runout_tir_um:
          input.tool_holder?.runout_tir_um ?? HOLDER_RUNOUT_TIR_UM[input.tool_holder?.type ?? "cat40"],
        clamp_force_kn:
          input.tool_holder?.clamp_force_kn ?? HOLDER_CLAMP_FORCE_KN[input.tool_holder?.type ?? "cat40"],
        operator_has_balancer: input.tool_holder?.operator_has_balancer ?? false,
      },
      tooling: input.tooling,
      coolant: {
        type: input.coolant?.type ?? "flood",
        brand: input.coolant?.brand ?? "generic",
        ph: input.coolant?.ph ?? 9.0,
        concentration_pct: input.coolant?.concentration_pct ?? 8,
        flow_rate_lpm: input.coolant?.flow_rate_lpm ?? 30,
        pressure_bar: input.coolant?.pressure_bar ?? 5,
        age_weeks: input.coolant?.age_weeks ?? 4,
      },
      toolpath: {
        strategy: input.toolpath?.strategy ?? "conventional",
        operation: input.toolpath?.operation ?? "milling",
        cut_type: input.toolpath?.cut_type ?? "roughing",
        axial_depth_mm: input.toolpath?.axial_depth_mm ?? input.tooling.tool_diameter_mm * 0.5,
        radial_depth_mm:
          input.toolpath?.radial_depth_mm ?? input.tooling.tool_diameter_mm * 0.4,
        radial_depth_pct: input.toolpath?.radial_depth_pct ?? 40,
        current_rpm: input.toolpath?.current_rpm ?? 0,
        current_feed_mmmin: input.toolpath?.current_feed_mmmin ?? 0,
        current_doc_mm: input.toolpath?.current_doc_mm ?? 0,
      },
    };
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function round(n: number, digits: number): number {
  const f = Math.pow(10, digits);
  return Math.round(n * f) / f;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const speedFeedNineAxisOrchestratorEngine = new SpeedFeedNineAxisOrchestratorEngine();
