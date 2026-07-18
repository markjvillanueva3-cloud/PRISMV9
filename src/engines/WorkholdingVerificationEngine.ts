/**
 * WorkholdingVerificationEngine — CAMX-MS14/U06 (E1148)
 *
 * Verify workholding adequacy for every operation. Checks cutting force
 * versus grip force margin, part ejection risk, and datum shift risk.
 *
 * Safety model:
 *   1. Grip force check:
 *      F_grip >= SF * F_cutting / mu
 *      where mu = friction coefficient, SF = safety factor (typically 2.5)
 *
 *   2. Part ejection risk:
 *      Tangential cutting force vs. clamping normal force projected
 *      onto ejection axis. Risk = F_tangential / (F_clamp * mu)
 *
 *   3. Datum shift risk:
 *      Moment about datum point from cutting forces vs. restraining moment
 *      from clamping. Risk = M_cutting / M_clamping
 *
 *   4. Vibration amplification:
 *      If cutting frequency near workholding natural frequency,
 *      effective force amplified by Q-factor
 *
 * References:
 *   - Nee et al. "Advanced Fixture Design" (2004)
 *   - FixtureClampingEngine — basic clamping calculations
 *   - WorkholdingAnalysisEngine — workholding analysis
 *   - Hoffman "Jig and Fixture Design" 5th ed.
 *   - Industry standard: min safety factor 2.5 for manual clamps, 2.0 for hydraulic
 *
 * @module WorkholdingVerificationEngine
 * @shortcode E1148
 * @dispatcher camDispatcher
 * @actions workholding_verify, workholding_verify_all, workholding_min_safety
 * @milestone CAMX-MS14/U06
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// CONSTANTS
// ============================================================================

/** Default safety factor for manual clamping */
const DEFAULT_SF_MANUAL = 2.5;

/** Default safety factor for hydraulic clamping */
const DEFAULT_SF_HYDRAULIC = 2.0;

/** Default friction coefficient (steel on steel, dry) */
const DEFAULT_FRICTION_COEFF = 0.15;

/** Friction coefficients by jaw material */
const FRICTION_COEFFICIENTS: Record<string, number> = {
  "steel_smooth": 0.12,
  "steel_serrated": 0.25,
  "aluminum_smooth": 0.10,
  "aluminum_serrated": 0.22,
  "soft_jaws": 0.30,
  "rubber_pad": 0.50,
  "carbide_serrated": 0.35,
  "copper_smooth": 0.08,
};

/** Minimum acceptable safety factor — below this is CRITICAL */
const CRITICAL_SF_THRESHOLD = 1.0;

/** Warning threshold for safety factor */
const WARNING_SF_THRESHOLD = 1.5;

/** Maximum vibration Q-factor for amplification check */
const MAX_Q_FACTOR = 10;

/** Frequency proximity threshold for resonance warning [ratio] */
const RESONANCE_PROXIMITY = 0.15;

// ============================================================================
// TYPES
// ============================================================================

/** Cutting forces for an operation */
export interface VerifyCuttingForces {
  /** Tangential cutting force Fc [N] */
  Fc_N: number;
  /** Feed force Ff [N] */
  Ff_N?: number;
  /** Radial/passive force Fp [N] */
  Fp_N?: number;
  /** Torque about spindle axis [N*m] */
  torque_Nm?: number;
  /** Cutting frequency [Hz] — spindle RPM * z / 60 */
  cutting_freq_Hz?: number;
  /** Operation description */
  operation_name?: string;
}

/** Workholding configuration */
export interface WorkholdingConfig {
  /** Workholding type */
  type: "vise" | "3_jaw_chuck" | "4_jaw_chuck" | "collet" | "fixture_plate" | "vacuum" | "magnetic";
  /** Total clamping force available [N] */
  clamping_force_N: number;
  /** Number of clamping points */
  clamp_points: number;
  /** Jaw/pad material for friction coefficient lookup */
  jaw_material?: string;
  /** Override friction coefficient */
  friction_coefficient?: number;
  /** Clamping method (affects safety factor) */
  clamping_method?: "manual" | "hydraulic" | "pneumatic";
  /** Natural frequency of workholding setup [Hz] */
  natural_freq_Hz?: number;
  /** Q-factor (damping quality) of workholding [dimensionless] */
  Q_factor?: number;
  /** Distance from clamp to cutting point [mm] */
  clamp_to_cut_distance_mm?: number;
  /** Distance from datum to cutting point [mm] */
  datum_to_cut_distance_mm?: number;
}

/** Part geometry for verification */
export interface VerifyPartGeometry {
  /** Part mass [kg] */
  mass_kg: number;
  /** Part length [mm] */
  length_mm?: number;
  /** Part width [mm] */
  width_mm?: number;
  /** Part height/thickness [mm] */
  height_mm?: number;
  /** Center of gravity offset from datum [mm] */
  cg_offset_mm?: number;
  /** Thin wall minimum thickness [mm] — triggers deformation check */
  min_wall_mm?: number;
}

/** Single operation verification result */
export interface OperationVerification {
  /** Operation name/index */
  operation: string;
  /** Overall verdict */
  verdict: "SAFE" | "WARNING" | "CRITICAL";
  /** Safety factor (grip vs cutting force) */
  safety_factor: number;
  /** Required minimum grip force [N] */
  required_grip_N: number;
  /** Available effective grip force [N] */
  available_grip_N: number;
  /** Part ejection risk [0-1] */
  ejection_risk: number;
  /** Datum shift risk [0-1] */
  datum_shift_risk: number;
  /** Vibration amplification factor [dimensionless] */
  vibration_amplification: number;
  /** Resonance warning */
  resonance_warning: boolean;
  /** Recommendations */
  recommendations: string[];
}

/** Full verification report */
export interface VerificationReport {
  /** Overall verdict (worst across all ops) */
  overall_verdict: "SAFE" | "WARNING" | "CRITICAL";
  /** Minimum safety factor across all operations */
  min_safety_factor: number;
  /** Operation with minimum safety factor */
  limiting_operation: string;
  /** Per-operation results */
  operations: OperationVerification[];
  /** Workholding type used */
  workholding_type: string;
  /** Friction coefficient used */
  friction_coefficient: number;
  /** Required safety factor standard */
  required_safety_factor: number;
  /** Global recommendations */
  recommendations: string[];
}

// ============================================================================
// ENGINE
// ============================================================================

export class WorkholdingVerificationEngine {
  /**
   * Verify workholding adequacy for a single operation.
   */
  verify(
    cutting_forces: VerifyCuttingForces,
    workholding: WorkholdingConfig,
    part_geometry?: VerifyPartGeometry,
  ): OperationVerification {
    const opName = cutting_forces.operation_name ?? "operation_1";

    log.info(`[WorkholdingVerification] Verifying ${opName}: Fc=${cutting_forces.Fc_N}N, clamp=${workholding.clamping_force_N}N`);

    // Determine friction coefficient
    const mu = workholding.friction_coefficient
      ?? FRICTION_COEFFICIENTS[workholding.jaw_material ?? ""]
      ?? DEFAULT_FRICTION_COEFF;

    // Determine required safety factor
    const requiredSF = workholding.clamping_method === "hydraulic"
      ? DEFAULT_SF_HYDRAULIC
      : DEFAULT_SF_MANUAL;

    // Resultant cutting force
    const Fc = cutting_forces.Fc_N;
    const Ff = cutting_forces.Ff_N ?? 0;
    const Fp = cutting_forces.Fp_N ?? 0;
    const resultantForce = Math.sqrt(Fc * Fc + Ff * Ff + Fp * Fp);

    // Required grip force: F_grip = SF * F_resultant / mu
    const requiredGrip = requiredSF * resultantForce / mu;

    // Available effective grip force (distributed across clamp points)
    const availableGrip = workholding.clamping_force_N;

    // Safety factor
    const safetyFactor = requiredGrip > 0 ? availableGrip / (resultantForce / mu) : 999;

    // Part ejection risk
    const ejectionRisk = this.computeEjectionRisk(cutting_forces, workholding, mu);

    // Datum shift risk
    const datumShiftRisk = this.computeDatumShiftRisk(cutting_forces, workholding, part_geometry, mu);

    // Vibration amplification
    const { amplification, resonanceWarning } = this.computeVibrationRisk(cutting_forces, workholding);

    // Effective safety factor (reduced by vibration amplification)
    const effectiveSF = safetyFactor / Math.max(amplification, 1);

    // Verdict
    let verdict: "SAFE" | "WARNING" | "CRITICAL";
    if (effectiveSF < CRITICAL_SF_THRESHOLD) {
      verdict = "CRITICAL";
    } else if (effectiveSF < WARNING_SF_THRESHOLD || ejectionRisk > 0.7 || datumShiftRisk > 0.7) {
      verdict = "WARNING";
    } else {
      verdict = "SAFE";
    }

    // Recommendations
    const recs = this.generateRecommendations(
      effectiveSF, ejectionRisk, datumShiftRisk, resonanceWarning,
      workholding, part_geometry, amplification,
    );

    return {
      operation: opName,
      verdict,
      safety_factor: Math.round(effectiveSF * 100) / 100,
      required_grip_N: Math.round(requiredGrip * 10) / 10,
      available_grip_N: Math.round(availableGrip * 10) / 10,
      ejection_risk: Math.round(ejectionRisk * 1000) / 1000,
      datum_shift_risk: Math.round(datumShiftRisk * 1000) / 1000,
      vibration_amplification: Math.round(amplification * 100) / 100,
      resonance_warning: resonanceWarning,
      recommendations: recs,
    };
  }

  /**
   * Verify all operations against the same workholding setup.
   */
  verifyAllOperations(
    operations: VerifyCuttingForces[],
    workholding: WorkholdingConfig,
    part_geometry?: VerifyPartGeometry,
  ): VerificationReport {
    log.info(`[WorkholdingVerification] Verifying ${operations.length} operations`);

    const mu = workholding.friction_coefficient
      ?? FRICTION_COEFFICIENTS[workholding.jaw_material ?? ""]
      ?? DEFAULT_FRICTION_COEFF;

    const requiredSF = workholding.clamping_method === "hydraulic"
      ? DEFAULT_SF_HYDRAULIC
      : DEFAULT_SF_MANUAL;

    const results = operations.map((op, i) => {
      const labeled = { ...op, operation_name: op.operation_name ?? `op_${i + 1}` };
      return this.verify(labeled, workholding, part_geometry);
    });

    // Find worst
    let minSF = Infinity;
    let limitingOp = "";
    let worstVerdict: "SAFE" | "WARNING" | "CRITICAL" = "SAFE";

    for (const r of results) {
      if (r.safety_factor < minSF) {
        minSF = r.safety_factor;
        limitingOp = r.operation;
      }
      if (r.verdict === "CRITICAL") worstVerdict = "CRITICAL";
      else if (r.verdict === "WARNING" && worstVerdict !== "CRITICAL") worstVerdict = "WARNING";
    }

    // Global recommendations
    const globalRecs: string[] = [];
    if (worstVerdict === "CRITICAL") {
      globalRecs.push("CRITICAL: One or more operations exceed workholding capacity. DO NOT PROCEED without re-fixturing.");
      globalRecs.push(`Limiting operation: ${limitingOp} with safety factor ${minSF.toFixed(2)}`);
    }
    if (results.some(r => r.resonance_warning)) {
      globalRecs.push("RESONANCE WARNING: Consider changing RPM or adding damping to avoid resonance.");
    }
    if (results.filter(r => r.verdict !== "SAFE").length > results.length / 2) {
      globalRecs.push("Majority of operations have marginal safety factors. Consider upgrading workholding system.");
    }

    return {
      overall_verdict: worstVerdict,
      min_safety_factor: Math.round(minSF * 100) / 100,
      limiting_operation: limitingOp,
      operations: results,
      workholding_type: workholding.type,
      friction_coefficient: mu,
      required_safety_factor: requiredSF,
      recommendations: globalRecs,
    };
  }

  /**
   * Get the minimum safety factor across a set of operations.
   */
  getMinSafetyFactor(
    operations: VerifyCuttingForces[],
    workholding: WorkholdingConfig,
    part_geometry?: VerifyPartGeometry,
  ): { min_safety_factor: number; limiting_operation: string; verdict: string } {
    const report = this.verifyAllOperations(operations, workholding, part_geometry);
    return {
      min_safety_factor: report.min_safety_factor,
      limiting_operation: report.limiting_operation,
      verdict: report.overall_verdict,
    };
  }

  // ── Private ──────────────────────────────────────────────────────────────

  /** Compute part ejection risk */
  private computeEjectionRisk(
    forces: VerifyCuttingForces,
    workholding: WorkholdingConfig,
    mu: number,
  ): number {
    // Tangential force tries to eject part
    // Friction from clamping resists ejection
    const tangentialForce = forces.Fc_N;
    const frictionalResistance = workholding.clamping_force_N * mu;

    if (frictionalResistance <= 0) return 1.0;

    const ratio = tangentialForce / frictionalResistance;
    // Risk is 0 when ratio < 0.3, increases to 1.0 when ratio >= 1.0
    return Math.min(1.0, Math.max(0, (ratio - 0.3) / 0.7));
  }

  /** Compute datum shift risk from moment analysis */
  private computeDatumShiftRisk(
    forces: VerifyCuttingForces,
    workholding: WorkholdingConfig,
    geometry: VerifyPartGeometry | undefined,
    mu: number,
  ): number {
    const leverArm = workholding.clamp_to_cut_distance_mm ?? 50; // mm
    const datumArm = workholding.datum_to_cut_distance_mm ?? leverArm;

    // Cutting moment about datum
    const resultantForce = Math.sqrt(
      forces.Fc_N * forces.Fc_N +
      (forces.Ff_N ?? 0) * (forces.Ff_N ?? 0)
    );
    const cuttingMoment = resultantForce * datumArm / 1000; // N*m

    // Clamping restraining moment
    const clampingMoment = workholding.clamping_force_N * mu * leverArm / 1000; // N*m

    // Add torque if present
    const totalCuttingMoment = cuttingMoment + (forces.torque_Nm ?? 0);

    if (clampingMoment <= 0) return 1.0;

    const ratio = totalCuttingMoment / clampingMoment;
    return Math.min(1.0, Math.max(0, (ratio - 0.2) / 0.8));
  }

  /** Compute vibration amplification risk */
  private computeVibrationRisk(
    forces: VerifyCuttingForces,
    workholding: WorkholdingConfig,
  ): { amplification: number; resonanceWarning: boolean } {
    if (!forces.cutting_freq_Hz || !workholding.natural_freq_Hz) {
      return { amplification: 1.0, resonanceWarning: false };
    }

    const freqRatio = forces.cutting_freq_Hz / workholding.natural_freq_Hz;
    const Q = workholding.Q_factor ?? 5;

    // Check resonance proximity
    const resonanceWarning = Math.abs(freqRatio - 1.0) < RESONANCE_PROXIMITY;

    // Amplification factor: 1 / sqrt((1-r^2)^2 + (r/Q)^2)
    const r2 = freqRatio * freqRatio;
    const denom = Math.sqrt((1 - r2) * (1 - r2) + (freqRatio / Q) * (freqRatio / Q));
    const amplification = Math.min(MAX_Q_FACTOR, denom > 0.01 ? 1 / denom : MAX_Q_FACTOR);

    return { amplification, resonanceWarning };
  }

  /** Generate actionable recommendations */
  private generateRecommendations(
    sf: number,
    ejectionRisk: number,
    datumShiftRisk: number,
    resonanceWarning: boolean,
    workholding: WorkholdingConfig,
    geometry: VerifyPartGeometry | undefined,
    amplification: number,
  ): string[] {
    const recs: string[] = [];

    if (sf < CRITICAL_SF_THRESHOLD) {
      const neededForce = Math.round(workholding.clamping_force_N / sf * DEFAULT_SF_MANUAL);
      recs.push(`CRITICAL: Safety factor ${sf.toFixed(2)} below 1.0. Increase clamping force to ${neededForce}N or reduce cutting parameters.`);
    } else if (sf < WARNING_SF_THRESHOLD) {
      recs.push(`WARNING: Safety factor ${sf.toFixed(2)} is marginal. Consider reducing depth of cut or feed rate.`);
    }

    if (ejectionRisk > 0.7) {
      recs.push("HIGH ejection risk. Use serrated jaws or soft jaws conforming to part geometry.");
    } else if (ejectionRisk > 0.4) {
      recs.push("Moderate ejection risk. Consider adding a stop or using higher-friction jaw surfaces.");
    }

    if (datumShiftRisk > 0.7) {
      recs.push("HIGH datum shift risk. Add locating pin or reduce moment arm between cut and clamp.");
    } else if (datumShiftRisk > 0.4) {
      recs.push("Moderate datum shift risk. Verify datum contact surfaces are clean and burr-free.");
    }

    if (resonanceWarning) {
      recs.push("RESONANCE WARNING: Cutting frequency near workholding natural frequency. Change RPM to avoid harmonic excitation.");
    } else if (amplification > 1.5) {
      recs.push(`Vibration amplification factor ${amplification.toFixed(1)}x. Consider adding damping pads.`);
    }

    if (geometry?.min_wall_mm && geometry.min_wall_mm < 2.0) {
      recs.push(`Thin wall detected (${geometry.min_wall_mm}mm). Reduce clamping force to prevent deformation; consider vacuum or wax fixturing.`);
    }

    if (recs.length === 0) {
      recs.push("Workholding verified adequate for this operation.");
    }

    return recs;
  }
}

// ── Singleton ────────────────────────────────────────────────────────────────

export const workholdingVerificationEngine = new WorkholdingVerificationEngine();
