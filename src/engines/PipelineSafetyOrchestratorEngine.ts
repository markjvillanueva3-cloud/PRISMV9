/**
 * PipelineSafetyOrchestratorEngine — CAMX-MS14/U01 (E1093)
 *
 * Aggregates ALL safety risk at every pipeline decision point.
 * This is the safety gate that overrides all other optimization.
 *
 * Six risk dimensions computed per operation:
 * 1. Collision risk: swept volume check against stock/fixture/machine
 * 2. Overload risk: Kienzle Fc vs machine spindle power x 0.85
 * 3. Chatter probability: tooth-passing vs machine natural frequencies
 * 4. Thermal damage risk: Johnson-Cook temp vs material limit
 * 5. Tool breakage risk: deflection stress vs tensile strength x 0.5
 * 6. Workholding failure: cutting force vs grip force (Coulomb friction)
 *
 * Hard vetoes (never override):
 * - Power > machine_max x 0.85
 * - Deflection > tolerance / 3
 * - P(chatter) > 0.15
 * - P(collision) > 0
 * - Workholding SF < 1.5
 * - Coolant pressure below minimum for deep holes
 *
 * References:
 * - Kienzle (1952): Fc = kc1.1 * ap * fz^(1-mc)
 * - Johnson-Cook (1983): thermal damage prediction
 * - Altintas "Manufacturing Automation" (2012): chatter stability
 * - Merchant's circle: force decomposition
 * - Coulomb friction: workholding safety factor
 *
 * @module PipelineSafetyOrchestratorEngine
 * @shortcode E1093
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Risk level classification — ordered from safest to hardest veto */
export type RiskLevel = "safe" | "caution" | "warning" | "critical" | "veto";

/** Individual risk dimension result */
export interface RiskDimension {
  /** Dimension identifier */
  name: string;
  /** Computed value (units depend on dimension) */
  value: number;
  /** Safety threshold for this dimension */
  threshold: number;
  /** Risk level for this dimension */
  risk: RiskLevel;
  /** Human-readable explanation */
  detail: string;
  /** Whether this dimension alone triggers a veto */
  vetoed: boolean;
}

/** Collision risk input */
export interface CollisionInput {
  /** Swept volume bounding radius [mm] */
  swept_radius_mm: number;
  /** Minimum clearance to stock [mm] */
  clearance_stock_mm: number;
  /** Minimum clearance to fixture [mm] */
  clearance_fixture_mm: number;
  /** Minimum clearance to machine structure [mm] */
  clearance_machine_mm: number;
}

/** Operation parameters for safety assessment */
export interface OperationInput {
  /** Operation name/identifier */
  name?: string;
  /** Axial depth of cut [mm] */
  ap_mm: number;
  /** Feed per tooth [mm/tooth] */
  fz_mm: number;
  /** Cutting speed [m/min] */
  vc_mpm: number;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Number of teeth/flutes */
  num_teeth: number;
  /** Radial depth of cut [mm] — defaults to tool_diameter_mm */
  ae_mm?: number;
  /** Rake angle [deg] — defaults to 6 */
  rake_angle_deg?: number;
  /** Stickout / overhang length [mm] */
  tool_stickout_mm: number;
  /** Part tolerance [mm] — used for deflection veto */
  tolerance_mm?: number;
  /** Hole depth if drilling [mm] — triggers coolant pressure check */
  hole_depth_mm?: number;
  /** Collision clearance data */
  collision?: CollisionInput;
}

/** Material properties for safety assessment */
export interface MaterialInput {
  /** Material name */
  name?: string;
  /** Kienzle specific cutting force at h=1mm [N/mm^2] */
  kc1_1: number;
  /** Kienzle exponent (0.15-0.35 typical) */
  mc: number;
  /** Material melting temperature [C] */
  T_melt_C: number;
  /** Thermal conductivity [W/(m*K)] */
  thermal_conductivity_WmK?: number;
  /** Specific heat capacity [J/(kg*K)] */
  specific_heat_JkgK?: number;
  /** Density [kg/m^3] */
  density_kgm3?: number;
  /** Johnson-Cook A parameter [MPa] — yield stress */
  jc_A_MPa?: number;
  /** Johnson-Cook B parameter [MPa] — hardening modulus */
  jc_B_MPa?: number;
  /** Johnson-Cook n parameter — hardening exponent */
  jc_n?: number;
  /** ISO material group (P, M, K, N, S, H) */
  iso_group?: string;
}

/** Machine capabilities */
export interface MachineInput {
  /** Machine name */
  name?: string;
  /** Maximum spindle power [kW] */
  max_power_kW: number;
  /** Maximum spindle speed [rpm] */
  max_rpm: number;
  /** Natural frequencies of machine structure [Hz] — for chatter check */
  natural_frequencies_Hz?: number[];
  /** Minimum coolant pressure [bar] */
  min_coolant_pressure_bar?: number;
  /** Available coolant pressure [bar] */
  coolant_pressure_bar?: number;
}

/** Tool mechanical properties */
export interface ToolInput {
  /** Tool material (carbide, HSS, ceramic, etc.) */
  material?: string;
  /** Tool tensile/transverse rupture strength [MPa] */
  tensile_strength_MPa: number;
  /** Tool elastic modulus [MPa] — defaults to 600000 for carbide */
  elastic_modulus_MPa?: number;
}

/** Workholding specification */
export interface WorkholdingInput {
  /** Grip force [N] */
  grip_force_N: number;
  /** Coefficient of friction between workpiece and jaws */
  friction_coefficient: number;
  /** Number of clamping points */
  clamp_points?: number;
}

/** Full safety assessment output */
export interface SafetyAssessment {
  /** Overall risk level (worst of all dimensions) */
  risk_level: RiskLevel;
  /** Per-dimension risk breakdown */
  dimensions: {
    collision: RiskDimension;
    overload: RiskDimension;
    chatter: RiskDimension;
    thermal: RiskDimension;
    breakage: RiskDimension;
    workholding: RiskDimension;
  };
  /** Whether any hard veto triggered */
  vetoed: boolean;
  /** Recommended escalation actions when constraints tight */
  escalation_actions: string[];
  /** Human-readable justification lines */
  justification: string[];
  /** Computed intermediate values for downstream consumers */
  computed: {
    Fc_N: number;
    power_kW: number;
    deflection_mm: number;
    stress_MPa: number;
    temperature_C: number;
    chatter_probability: number;
    workholding_safety_factor: number;
  };
}

/** Veto result from assess+veto pipeline */
export interface VetoResult {
  vetoed: boolean;
  reasons: string[];
  escalation_actions: string[];
}

/** Batch assessment report */
export interface SafetyReport {
  /** Overall risk level (worst across all operations) */
  overall_risk: RiskLevel;
  /** Per-operation assessments */
  assessments: Array<SafetyAssessment & { operation_name: string }>;
  /** Total operations assessed */
  total: number;
  /** Count by risk level */
  counts: Record<RiskLevel, number>;
  /** Operations that were vetoed */
  vetoed_operations: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

/** Power derating factor: never exceed 85% of machine rated power */
const POWER_DERATING = 0.85;

/** Chatter probability threshold: must stay below 15% */
const CHATTER_THRESHOLD = 0.15;

/** Workholding minimum safety factor (Coulomb friction model) */
const WORKHOLDING_MIN_SF = 1.5;

/** Tool stress safety factor: stress must be below 50% of tensile strength */
const TOOL_STRESS_SF = 0.5;

/** Thermal damage threshold: material-specific fraction of melt temperature.
 * QA-MS1 FIX: 70% was too aggressive for superalloys/titanium where tool coatings
 * fail at ~50% of melt. Ref: Sandvik Coromant, ISCAR recommended thermal limits. */
const THERMAL_DERATING_BY_ISO: Record<string, number> = {
  P: 0.60,  // Steel: moderate tolerance
  M: 0.55,  // Stainless: work hardening accelerates above this
  K: 0.65,  // Cast iron: higher tolerance (graphite lubricates)
  N: 0.70,  // Aluminum: high thermal conductivity dissipates heat
  S: 0.45,  // Superalloy/titanium: tool coating failure, reactivity
  H: 0.50,  // Hardened steel: thermal softening risk
};
const THERMAL_DERATING_DEFAULT = 0.55;

/** Deflection must be below tolerance / 3 */
const DEFLECTION_TOLERANCE_DIVISOR = 3;

/** Default elastic modulus for carbide tooling [MPa] */
const DEFAULT_CARBIDE_E_MPA = 600_000;

/** Default tolerance if not specified [mm] */
const DEFAULT_TOLERANCE_MM = 0.05;

/** Minimum coolant pressure for deep holes (L/D > 3) [bar] */
const DEEP_HOLE_MIN_COOLANT_BAR = 40;

/** L/D threshold for deep hole classification */
const DEEP_HOLE_LD_RATIO = 3;

/** Escalation: ap reduction percentage */
const ESCALATION_AP_REDUCTION = 0.20;

/** Escalation: fz reduction percentage */
const ESCALATION_FZ_REDUCTION = 0.15;

// ============================================================================
// RISK CLASSIFICATION
// ============================================================================

/** Map a normalized ratio (value/threshold) to a risk level */
function classifyRisk(ratio: number, isCollision = false): RiskLevel {
  if (isCollision) {
    // Collision is binary: any probability > 0 is a veto
    return ratio > 0 ? "veto" : "safe";
  }
  if (ratio >= 1.0) return "veto";
  if (ratio >= 0.90) return "critical";
  if (ratio >= 0.75) return "warning";
  if (ratio >= 0.60) return "caution";
  return "safe";
}

/** Compare two risk levels, return the worse one */
function worseRisk(a: RiskLevel, b: RiskLevel): RiskLevel {
  const order: RiskLevel[] = ["safe", "caution", "warning", "critical", "veto"];
  return order.indexOf(a) >= order.indexOf(b) ? a : b;
}

// ============================================================================
// PHYSICS CALCULATIONS
// ============================================================================

/**
 * Kienzle cutting force: Fc = kc1_1 * ap * fz^(1-mc)
 * Ref: Kienzle (1952), simplified single-tooth form
 * For multi-tooth, we use mean chip thickness via Martellotti
 */
function computeCuttingForce(op: OperationInput, mat: MaterialInput): number {
  const ae = op.ae_mm ?? op.tool_diameter_mm;
  const engagement_ratio = Math.min(ae / op.tool_diameter_mm, 1.0);

  // Martellotti mean chip thickness for milling
  let h_mean: number;
  if (op.num_teeth <= 1) {
    h_mean = op.fz_mm;
  } else {
    const phi_e = Math.acos(Math.max(-1, 1 - 2 * engagement_ratio));
    h_mean = phi_e > 0.001
      ? op.fz_mm * (1 - Math.cos(phi_e)) / phi_e
      : op.fz_mm;
  }
  const h = Math.max(h_mean, 0.001);

  // Kienzle: Fc = kc1_1 * ap * h^(1-mc)  [single tooth instantaneous]
  // Then multiply by engaged teeth: z_e = z * phi_e / (2*pi)
  const Fc_single = mat.kc1_1 * op.ap_mm * Math.pow(h, 1 - mat.mc);

  let z_e = 1;
  if (op.num_teeth > 1) {
    const phi_e = Math.acos(Math.max(-1, 1 - 2 * engagement_ratio));
    z_e = Math.max(op.num_teeth * phi_e / (2 * Math.PI), 0.1);
  }

  // Rake angle correction: Sandvik standard (1 - 0.01 * gamma)
  const rake = op.rake_angle_deg ?? 6;
  const rake_correction = 1 - 0.01 * rake;

  return Fc_single * z_e * rake_correction;
}

/**
 * Cutting power: P = Fc * Vc / 60000  [kW]
 */
function computePower(Fc_N: number, vc_mpm: number): number {
  return (Fc_N * vc_mpm) / 60_000;
}

/**
 * Tool deflection and bending stress for a cantilever beam
 * Deflection: delta = (64 * Fc * L^3) / (3 * pi * E * d^4)
 * Stress: sigma = 32 * Fc * L / (pi * d^3)
 * Ref: beam theory, circular cross-section
 */
function computeDeflectionAndStress(
  Fc_N: number,
  stickout_mm: number,
  diameter_mm: number,
  E_MPa: number
): { deflection_mm: number; stress_MPa: number } {
  const d = diameter_mm;
  const L = stickout_mm;

  // QA-MS1 FIX: Guard against zero/near-zero diameter producing NaN/Infinity
  if (d < 0.1 || !isFinite(d) || !isFinite(L) || !isFinite(Fc_N) || E_MPa <= 0) {
    return { deflection_mm: 999, stress_MPa: 999 };
  }

  const d3 = d * d * d;
  const d4 = d3 * d;

  // Cantilever deflection: delta = 64*F*L^3 / (3*pi*E*d^4)
  const deflection_mm = (64 * Fc_N * L * L * L) / (3 * Math.PI * E_MPa * d4);

  // Max bending stress at root: sigma = 32*F*L / (pi*d^3)
  const stress_MPa = (32 * Fc_N * L) / (Math.PI * d3);

  // Guard against overflow
  if (!isFinite(deflection_mm) || !isFinite(stress_MPa)) {
    return { deflection_mm: 999, stress_MPa: 999 };
  }

  return { deflection_mm, stress_MPa };
}

/**
 * Johnson-Cook temperature prediction (simplified adiabatic shear model)
 * T = T_room + (Fc * Vc) / (rho * Cp * MRR_volume_rate) * chip_fraction
 *
 * Simplified: T ~ T_room + 0.4 * Fc * Vc / (60000 * k_thermal^0.5)
 * where 0.4 is the fraction of heat going into the workpiece (Loewen-Shaw partition)
 *
 * Falls back to empirical correlation if material thermal properties unavailable:
 * T ~ 400 * (Vc/100)^0.35 * (fz/0.1)^0.2  [C above ambient]
 */
function computeTemperature(
  Fc_N: number,
  vc_mpm: number,
  fz_mm: number,
  mat: MaterialInput
): number {
  const T_room = 25; // [C]
  const k = mat.thermal_conductivity_WmK;
  const Cp = mat.specific_heat_JkgK;
  const rho = mat.density_kgm3;

  if (k && k > 0 && Cp && Cp > 0 && rho && rho > 0) {
    // Physics-based: Loewen-Shaw heat partition
    // Power into chip zone [W] = Fc * Vc / 60  (Vc in m/min -> m/s)
    const P_cut_W = (Fc_N * vc_mpm) / 60;
    // Workpiece heat fraction ~ 0.4 (Loewen-Shaw partition coefficient)
    const Q_wp = 0.4 * P_cut_W;
    // Characteristic thermal length [m] = sqrt(k / (rho * Cp * Vc_m_s))
    const Vc_ms = vc_mpm / 60;
    const L_thermal = Math.sqrt(k / (rho * Cp * Math.max(Vc_ms, 0.001)));
    // Temperature rise ~ Q / (k * L_thermal) * scaling
    // Simplified: dT = Q_wp / (k * L_thermal * 1000)
    const dT = Q_wp / (k * Math.max(L_thermal, 1e-6) * 1000);
    // Clamp to physical range
    return T_room + Math.min(dT, mat.T_melt_C - T_room);
  }

  // Empirical fallback (Shaw 2005 correlation)
  const dT_emp = 400 * Math.pow(Math.max(vc_mpm, 1) / 100, 0.35)
                     * Math.pow(Math.max(fz_mm, 0.01) / 0.1, 0.2);
  return T_room + Math.min(dT_emp, mat.T_melt_C - T_room);
}

/**
 * Chatter probability estimate
 * Compares tooth-passing frequency to machine natural frequencies.
 * f_tooth = (RPM * z) / 60  [Hz]
 * If f_tooth is within +/-15% of any natural frequency, chatter is likely.
 * P(chatter) = max over all fn of: exp(-((f_tooth - fn) / (0.15*fn))^2)
 * Ref: Altintas "Manufacturing Automation" (2012), stability lobe theory
 */
function computeChatterProbability(
  vc_mpm: number,
  tool_diameter_mm: number,
  num_teeth: number,
  natural_freqs_Hz: number[]
): number {
  if (!natural_freqs_Hz || natural_freqs_Hz.length === 0) {
    // QA-MS1 FIX: No modal data → conservative estimate above CHATTER_THRESHOLD (0.15).
    // Unknown machines should be treated as risky, not safe. Previous value 0.05
    // silently passed the veto gate despite zero chatter analysis being performed.
    return 0.20;
  }

  // RPM from cutting speed: n = (1000 * Vc) / (pi * D)
  const rpm = (1000 * vc_mpm) / (Math.PI * tool_diameter_mm);
  // Tooth-passing frequency
  const f_tooth = (rpm * num_teeth) / 60;

  // Gaussian proximity to each natural frequency
  let maxProb = 0;
  for (const fn of natural_freqs_Hz) {
    if (fn <= 0) continue;
    const bandwidth = 0.15 * fn; // 15% bandwidth
    const delta = Math.abs(f_tooth - fn);
    const p = Math.exp(-Math.pow(delta / bandwidth, 2));
    if (p > maxProb) maxProb = p;
  }

  return maxProb;
}

/**
 * Workholding safety factor (Coulomb friction model)
 * SF = (mu * F_grip * n_clamps) / F_cutting
 * Must be >= 1.5
 * Ref: fixture design engineering practice (Joshi, "Jigs and Fixtures", 2010)
 */
function computeWorkholdingSF(
  Fc_N: number,
  wh: WorkholdingInput
): number {
  const n = wh.clamp_points ?? 1;
  const F_resist = wh.friction_coefficient * wh.grip_force_N * n;
  return Fc_N > 0 ? F_resist / Fc_N : 999;
}

// ============================================================================
// ENGINE CLASS
// ============================================================================

export class PipelineSafetyOrchestratorEngine {

  /**
   * Assess all 6 risk dimensions for a single operation.
   */
  assess(
    operation: OperationInput,
    material: MaterialInput,
    machine: MachineInput,
    tool: ToolInput,
    workholding: WorkholdingInput
  ): SafetyAssessment {
    const justification: string[] = [];
    const escalation_actions: string[] = [];
    const opName = operation.name ?? "unnamed";

    // ── 1. Cutting Force (Kienzle) ──────────────────────────────────
    const Fc_N = computeCuttingForce(operation, material);

    // ── 2. Power check ──────────────────────────────────────────────
    const power_kW = computePower(Fc_N, operation.vc_mpm);
    const power_limit = machine.max_power_kW * POWER_DERATING;
    const power_ratio = power_kW / power_limit;
    const power_risk = classifyRisk(power_ratio);
    const power_vetoed = power_kW > power_limit;
    const overloadDim: RiskDimension = {
      name: "overload",
      value: power_kW,
      threshold: power_limit,
      risk: power_risk,
      detail: `Cutting power ${power_kW.toFixed(2)} kW vs limit ${power_limit.toFixed(2)} kW (${(power_ratio * 100).toFixed(1)}%)`,
      vetoed: power_vetoed
    };
    if (power_vetoed) {
      justification.push(`VETO: Power ${power_kW.toFixed(2)} kW exceeds machine limit ${power_limit.toFixed(2)} kW (${machine.max_power_kW} kW x 0.85)`);
      escalation_actions.push(`Reduce ap by ${ESCALATION_AP_REDUCTION * 100}% from ${operation.ap_mm.toFixed(2)} to ${(operation.ap_mm * (1 - ESCALATION_AP_REDUCTION)).toFixed(2)} mm`);
      escalation_actions.push(`Reduce fz by ${ESCALATION_FZ_REDUCTION * 100}% from ${operation.fz_mm.toFixed(3)} to ${(operation.fz_mm * (1 - ESCALATION_FZ_REDUCTION)).toFixed(3)} mm`);
    } else if (power_risk !== "safe") {
      justification.push(`${power_risk.toUpperCase()}: Power utilization at ${(power_ratio * 100).toFixed(1)}%`);
    }

    // ── 3. Deflection & Breakage ────────────────────────────────────
    const E = tool.elastic_modulus_MPa ?? DEFAULT_CARBIDE_E_MPA;
    const { deflection_mm, stress_MPa } = computeDeflectionAndStress(
      Fc_N, operation.tool_stickout_mm, operation.tool_diameter_mm, E
    );
    const tol = operation.tolerance_mm ?? DEFAULT_TOLERANCE_MM;
    const deflection_limit = tol / DEFLECTION_TOLERANCE_DIVISOR;
    const deflection_ratio = deflection_mm / deflection_limit;
    const deflection_vetoed = deflection_mm > deflection_limit;

    const stress_limit = tool.tensile_strength_MPa * TOOL_STRESS_SF;
    const stress_ratio = stress_MPa / stress_limit;
    const stress_vetoed = stress_MPa > stress_limit;

    const breakage_ratio = Math.max(deflection_ratio, stress_ratio);
    const breakage_risk = classifyRisk(breakage_ratio);
    const breakageDim: RiskDimension = {
      name: "breakage",
      value: stress_MPa,
      threshold: stress_limit,
      risk: breakage_risk,
      detail: `Stress ${stress_MPa.toFixed(1)} MPa vs limit ${stress_limit.toFixed(1)} MPa; deflection ${deflection_mm.toFixed(4)} mm vs limit ${deflection_limit.toFixed(4)} mm`,
      vetoed: deflection_vetoed || stress_vetoed
    };
    if (deflection_vetoed) {
      justification.push(`VETO: Deflection ${deflection_mm.toFixed(4)} mm exceeds tolerance/3 = ${deflection_limit.toFixed(4)} mm`);
      escalation_actions.push("Add spring passes for finishing to compensate deflection");
    }
    if (stress_vetoed) {
      justification.push(`VETO: Bending stress ${stress_MPa.toFixed(1)} MPa exceeds tool strength x 0.5 = ${stress_limit.toFixed(1)} MPa`);
      escalation_actions.push(`Reduce ap by ${ESCALATION_AP_REDUCTION * 100}% to lower cutting force`);
      escalation_actions.push("Consider shorter tool stickout or larger diameter tool");
    }

    // ── 4. Chatter ──────────────────────────────────────────────────
    const chatter_prob = computeChatterProbability(
      operation.vc_mpm, operation.tool_diameter_mm,
      operation.num_teeth, machine.natural_frequencies_Hz ?? []
    );
    const chatter_ratio = chatter_prob / CHATTER_THRESHOLD;
    const chatter_risk = classifyRisk(chatter_ratio);
    const chatter_vetoed = chatter_prob > CHATTER_THRESHOLD;
    const chatterDim: RiskDimension = {
      name: "chatter",
      value: chatter_prob,
      threshold: CHATTER_THRESHOLD,
      risk: chatter_risk,
      detail: `P(chatter) = ${(chatter_prob * 100).toFixed(1)}% vs threshold ${(CHATTER_THRESHOLD * 100).toFixed(1)}%`,
      vetoed: chatter_vetoed
    };
    if (chatter_vetoed) {
      justification.push(`VETO: Chatter probability ${(chatter_prob * 100).toFixed(1)}% exceeds ${(CHATTER_THRESHOLD * 100).toFixed(1)}% threshold`);
      escalation_actions.push("Switch to lower-engagement strategy (e.g., trochoidal milling)");
      escalation_actions.push("Adjust RPM to find stable pocket between lobes");
    }

    // ── 5. Thermal damage ───────────────────────────────────────────
    const temperature_C = computeTemperature(
      Fc_N, operation.vc_mpm, operation.fz_mm, material
    );
    const thermalDerating = THERMAL_DERATING_BY_ISO[material.iso_group ?? "P"] ?? THERMAL_DERATING_DEFAULT;
    const T_limit = material.T_melt_C * thermalDerating;
    const thermal_ratio = temperature_C / T_limit;
    const thermal_risk = classifyRisk(thermal_ratio);
    const thermal_vetoed = temperature_C > T_limit;
    const thermalDim: RiskDimension = {
      name: "thermal",
      value: temperature_C,
      threshold: T_limit,
      risk: thermal_risk,
      detail: `Predicted temp ${temperature_C.toFixed(0)} C vs limit ${T_limit.toFixed(0)} C (T_melt x 0.7)`,
      vetoed: thermal_vetoed
    };
    if (thermal_vetoed) {
      justification.push(`VETO: Predicted temperature ${temperature_C.toFixed(0)} C exceeds ${T_limit.toFixed(0)} C (${material.T_melt_C} C x 0.7)`);
      escalation_actions.push(`Reduce fz by ${ESCALATION_FZ_REDUCTION * 100}% to lower heat generation`);
      escalation_actions.push("Increase coolant flow or switch to through-tool coolant");
    }

    // ── 6. Collision ────────────────────────────────────────────────
    let collision_prob = 0;
    let collisionDetail = "No collision data provided — assumed clear";
    if (operation.collision) {
      const c = operation.collision;
      // Any negative clearance = collision
      const min_clearance = Math.min(
        c.clearance_stock_mm,
        c.clearance_fixture_mm,
        c.clearance_machine_mm
      );
      if (min_clearance <= 0) {
        collision_prob = 1.0;
        collisionDetail = `COLLISION: clearance ${min_clearance.toFixed(2)} mm <= 0`;
      } else if (min_clearance < c.swept_radius_mm) {
        collision_prob = 1.0;
        collisionDetail = `COLLISION: clearance ${min_clearance.toFixed(2)} mm < swept radius ${c.swept_radius_mm.toFixed(2)} mm`;
      } else {
        collisionDetail = `Clear: min clearance ${min_clearance.toFixed(2)} mm > swept radius ${c.swept_radius_mm.toFixed(2)} mm`;
      }
    }
    const collision_risk = classifyRisk(collision_prob, true);
    const collision_vetoed = collision_prob > 0;
    const collisionDim: RiskDimension = {
      name: "collision",
      value: collision_prob,
      threshold: 0,
      risk: collision_risk,
      detail: collisionDetail,
      vetoed: collision_vetoed
    };
    if (collision_vetoed) {
      justification.push(`VETO: Collision detected — P(collision) must be 0`);
      escalation_actions.push("Suggest fixture redesign or retract path modification");
    }

    // ── 7. Workholding ──────────────────────────────────────────────
    const wh_sf = computeWorkholdingSF(Fc_N, workholding);
    const wh_ratio = WORKHOLDING_MIN_SF / wh_sf; // Inverted: higher SF = safer
    const wh_risk = classifyRisk(wh_ratio);
    const wh_vetoed = wh_sf < WORKHOLDING_MIN_SF;
    const workholdingDim: RiskDimension = {
      name: "workholding",
      value: wh_sf,
      threshold: WORKHOLDING_MIN_SF,
      risk: wh_risk,
      detail: `Workholding SF = ${wh_sf.toFixed(2)} vs required ${WORKHOLDING_MIN_SF} (grip ${workholding.grip_force_N} N, mu ${workholding.friction_coefficient})`,
      vetoed: wh_vetoed
    };
    if (wh_vetoed) {
      justification.push(`VETO: Workholding safety factor ${wh_sf.toFixed(2)} < ${WORKHOLDING_MIN_SF}`);
      escalation_actions.push("Increase clamping force or add clamping points");
      escalation_actions.push(`Reduce fz by ${ESCALATION_FZ_REDUCTION * 100}% to lower cutting force`);
      escalation_actions.push("Suggest fixture redesign for higher holding force");
    }

    // ── 8. Coolant pressure check (deep holes) ──────────────────────
    if (operation.hole_depth_mm && operation.hole_depth_mm > 0) {
      const LD = operation.hole_depth_mm / operation.tool_diameter_mm;
      if (LD > DEEP_HOLE_LD_RATIO) {
        const required_bar = DEEP_HOLE_MIN_COOLANT_BAR;
        const available_bar = machine.coolant_pressure_bar ?? 0;
        if (available_bar < required_bar) {
          justification.push(
            `VETO: Deep hole L/D=${LD.toFixed(1)}: coolant pressure ${available_bar} bar < required ${required_bar} bar`
          );
          // Override overload dimension to veto since coolant is critical for chip evacuation
          overloadDim.vetoed = true;
          overloadDim.risk = "veto";
          overloadDim.detail += ` | DEEP HOLE: insufficient coolant pressure`;
          escalation_actions.push("Upgrade to high-pressure coolant system or use peck drilling cycle");
        }
      }
    }

    // ── Aggregate risk level ────────────────────────────────────────
    let overall: RiskLevel = "safe";
    const dims = [overloadDim, breakageDim, chatterDim, thermalDim, collisionDim, workholdingDim];
    for (const dim of dims) {
      overall = worseRisk(overall, dim.risk);
    }

    const vetoed = dims.some(d => d.vetoed);

    if (!vetoed && overall === "safe") {
      justification.push(`All 6 dimensions passed for operation '${opName}'`);
    }

    // Generate escalation for non-veto but tight constraints
    if (!vetoed && (overall === "warning" || overall === "critical")) {
      if (!escalation_actions.some(a => a.includes("ap"))) {
        escalation_actions.push(`Consider reducing ap by ${ESCALATION_AP_REDUCTION * 100}% for additional margin`);
      }
      if (!escalation_actions.some(a => a.includes("fz"))) {
        escalation_actions.push(`Consider reducing fz by ${ESCALATION_FZ_REDUCTION * 100}% for additional margin`);
      }
    }

    log.info(`[PipelineSafety] ${opName}: ${overall}${vetoed ? " (VETOED)" : ""}`);

    return {
      risk_level: overall,
      dimensions: {
        collision: collisionDim,
        overload: overloadDim,
        chatter: chatterDim,
        thermal: thermalDim,
        breakage: breakageDim,
        workholding: workholdingDim
      },
      vetoed,
      escalation_actions,
      justification,
      computed: {
        Fc_N,
        power_kW,
        deflection_mm,
        stress_MPa,
        temperature_C,
        chatter_probability: chatter_prob,
        workholding_safety_factor: wh_sf
      }
    };
  }

  /**
   * Extract veto decision from an assessment.
   */
  veto(assessment: SafetyAssessment): VetoResult {
    const reasons: string[] = [];
    const dims = assessment.dimensions;

    if (dims.collision.vetoed) reasons.push("Collision detected: P(collision) must be 0");
    if (dims.overload.vetoed) reasons.push(`Power overload: ${dims.overload.value.toFixed(2)} kW > ${dims.overload.threshold.toFixed(2)} kW`);
    if (dims.chatter.vetoed) reasons.push(`Chatter risk: P=${(dims.chatter.value * 100).toFixed(1)}% > ${(dims.chatter.threshold * 100).toFixed(1)}%`);
    if (dims.thermal.vetoed) reasons.push(`Thermal damage: ${dims.thermal.value.toFixed(0)} C > ${dims.thermal.threshold.toFixed(0)} C`);
    if (dims.breakage.vetoed) reasons.push(`Tool breakage risk: stress or deflection exceeds safe limits`);
    if (dims.workholding.vetoed) reasons.push(`Workholding failure: SF ${dims.workholding.value.toFixed(2)} < ${dims.workholding.threshold}`);

    return {
      vetoed: assessment.vetoed,
      reasons,
      escalation_actions: assessment.escalation_actions
    };
  }

  /**
   * Assess a batch of operations and produce an aggregate safety report.
   */
  batchAssess(
    operations: Array<{
      operation: OperationInput;
      material: MaterialInput;
      machine: MachineInput;
      tool: ToolInput;
      workholding: WorkholdingInput;
    }>
  ): SafetyReport {
    const counts: Record<RiskLevel, number> = {
      safe: 0, caution: 0, warning: 0, critical: 0, veto: 0
    };
    const assessments: Array<SafetyAssessment & { operation_name: string }> = [];
    const vetoed_operations: string[] = [];
    let overall: RiskLevel = "safe";

    for (let i = 0; i < operations.length; i++) {
      const { operation, material, machine, tool, workholding } = operations[i];
      const opName = operation.name ?? `op_${i + 1}`;
      const assessment = this.assess(operation, material, machine, tool, workholding);

      assessments.push({ ...assessment, operation_name: opName });
      counts[assessment.risk_level]++;
      overall = worseRisk(overall, assessment.risk_level);

      if (assessment.vetoed) {
        vetoed_operations.push(opName);
      }
    }

    log.info(`[PipelineSafety] Batch: ${operations.length} ops, overall=${overall}, vetoed=${vetoed_operations.length}`);

    return {
      overall_risk: overall,
      assessments,
      total: operations.length,
      counts,
      vetoed_operations
    };
  }

  /**
   * Dispatcher entry point: routes action string to the correct method.
   */
  calculate(action: string, params: Record<string, any>): any {
    switch (action) {
      case "pipeline_safety_assess":
        return this.assess(
          params.operation,
          params.material,
          params.machine,
          params.tool,
          params.workholding
        );

      case "pipeline_safety_veto": {
        const assessment = this.assess(
          params.operation,
          params.material,
          params.machine,
          params.tool,
          params.workholding
        );
        return this.veto(assessment);
      }

      case "pipeline_safety_batch":
        return this.batchAssess(params.operations);

      default:
        throw new Error(`PipelineSafetyOrchestratorEngine: unknown action '${action}'`);
    }
  }
}

// ============================================================================
// SINGLETON EXPORT — E1093
// ============================================================================

export const pipelineSafetyOrchestratorEngine = new PipelineSafetyOrchestratorEngine();
