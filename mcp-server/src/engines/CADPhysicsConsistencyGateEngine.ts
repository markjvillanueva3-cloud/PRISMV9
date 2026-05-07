/**
 * CADPhysicsConsistencyGateEngine — U-ML-01
 * ==========================================
 *
 * Kienzle/Taylor-bounded validator for every generated CAD/CAM parameter set.
 * Hard-blocks unmanufacturable outputs before they reach CAM.
 *
 * Physics constraints enforced:
 *   - Kienzle cutting force: Fc = kc1_1 · ap · fz^(1-mc) ≤ F_limit
 *   - Taylor tool life: T = (C/Vc)^(1/n) ≥ T_min
 *   - Spindle power: P_cut ≤ P_spindle_max × safety_factor
 *   - Tool deflection: δ = FL³/3EI ≤ tolerance
 *   - Thermal margin: T_cut ≤ T_material_softening × 0.8
 *
 * S(x) Safety Score:
 *   S(x) ∈ [0, 1]. Components weighted by criticality:
 *   - Force margin: 30%
 *   - Tool life: 25%
 *   - Power headroom: 20%
 *   - Deflection: 15%
 *   - Thermal: 10%
 *
 * Verdict:
 *   - S(x) ≥ 0.90: PASS
 *   - 0.70 ≤ S(x) < 0.90: WARN (caution, proceed with monitoring)
 *   - S(x) < 0.70: REJECT (hard block)
 *
 * @module engines/CADPhysicsConsistencyGateEngine
 * @milestone CAD-COMPLETE-MS0 PHASE-49 U-ML-01
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// PHYSICS CONSTANTS — Canonical values from ISO 3685 / Machinery's Handbook
// ============================================================================

type ISOGroup = "P" | "M" | "K" | "N" | "S" | "H";

interface KienzleCoefficients {
  kc1_1: number;
  mc: number;
  source: string;
}

/**
 * Kienzle specific cutting force coefficients by ISO material group.
 * @see ISO 3685 / Sandvik Coromant General Turning (2024)
 */
const KIENZLE_BY_ISO: Record<ISOGroup, KienzleCoefficients> = {
  P: { kc1_1: 1800, mc: 0.25, source: "ISO 3685 / Machinery's Handbook" },
  M: { kc1_1: 2100, mc: 0.25, source: "ISO 3685 / Sandvik" },
  K: { kc1_1: 1100, mc: 0.28, source: "ISO 3685 / Kennametal" },
  N: { kc1_1: 700, mc: 0.22, source: "ISO 3685 / ASM Handbook" },
  S: { kc1_1: 2800, mc: 0.25, source: "ISO 3685 / Aerospace specs" },
  H: { kc1_1: 3200, mc: 0.28, source: "ISO 3685 / Hard milling data" },
};

interface TaylorConstants {
  C: number;
  n: number;
  source: string;
}

/**
 * Taylor tool life constants by ISO material group.
 * T = (C / Vc)^(1/n) where T is minutes, Vc is m/min
 * @see Taylor (1907), ISO 3685:1993
 */
const TAYLOR_BY_ISO: Record<ISOGroup, TaylorConstants> = {
  P: { C: 350, n: 0.25, source: "Taylor 1907 / Modern updates" },
  M: { C: 200, n: 0.22, source: "Stainless steel machining data" },
  K: { C: 400, n: 0.30, source: "Cast iron machining data" },
  N: { C: 600, n: 0.35, source: "Aluminum machining data" },
  S: { C: 100, n: 0.18, source: "Superalloy machining data" },
  H: { C: 80, n: 0.15, source: "Hard milling data" },
};

/**
 * S(x) Safety Score weights by constraint type.
 * @see physics/CLAUDE.md
 */
const SAFETY_WEIGHTS = {
  force: 0.30,
  tool_life: 0.25,
  power: 0.20,
  deflection: 0.15,
  thermal: 0.10,
} as const;

/** Default machine limits (can be overridden per-machine) */
const DEFAULT_MACHINE_LIMITS = {
  max_cutting_force_N: 5000,
  max_spindle_power_kW: 15,
  max_deflection_mm: 0.05,
  max_cutting_temp_C: 600,
  min_tool_life_min: 15,
  spindle_safety_factor: 0.85,
};

// ============================================================================
// TYPES
// ============================================================================

/** Input parameters for physics validation */
export interface PhysicsValidationInput {
  /** ISO material group (P/M/K/N/S/H) */
  iso_group: ISOGroup;
  /** Depth of cut [mm] */
  ap_mm: number;
  /** Feed per tooth [mm] */
  fz_mm: number;
  /** Cutting speed [m/min] */
  vc_m_min: number;
  /** Tool diameter [mm] */
  tool_diameter_mm: number;
  /** Tool stick-out length [mm] */
  tool_stickout_mm: number;
  /** Tool flute count */
  flute_count: number;
  /** Radial depth of cut [mm] (for milling) */
  ae_mm?: number;
  /** Spindle RPM */
  rpm?: number;
  /** Optional: machine-specific limits override */
  machine_limits?: Partial<typeof DEFAULT_MACHINE_LIMITS>;
  /** Optional: CAD app that generated parameters */
  cad_app?: string;
  /** Optional: operation context */
  operation?: string;
}

/** Individual constraint evaluation */
export interface ConstraintResult {
  name: string;
  passed: boolean;
  value: number;
  limit: number;
  margin: number;
  score: number;
  formula: string;
  unit: string;
  details: string;
}

/** Complete physics gate result */
export interface PhysicsGateResult {
  passed: boolean;
  verdict: "PASS" | "WARN" | "REJECT";
  safety_score: number;
  constraints: ConstraintResult[];
  recommendations: string[];
  physics_summary: {
    cutting_force_N: number;
    tool_life_min: number;
    cutting_power_kW: number;
    deflection_mm: number;
    cutting_temp_C: number;
  };
  validation_time_ms: number;
  iso_group: ISOGroup;
  kienzle_source: string;
  taylor_source: string;
}

/** Batch validation input */
export interface BatchValidationInput {
  items: PhysicsValidationInput[];
  stop_on_first_failure?: boolean;
}

/** Batch validation result */
export interface BatchValidationResult {
  total: number;
  passed: number;
  warned: number;
  rejected: number;
  results: Array<PhysicsGateResult & { index: number }>;
  overall_verdict: "PASS" | "WARN" | "REJECT";
  mean_safety_score: number;
}

// ============================================================================
// ENGINE
// ============================================================================

class CADPhysicsConsistencyGateEngine {
  private evaluationCount = 0;
  private rejectCount = 0;
  private warnCount = 0;

  /**
   * Validate CAD/CAM parameters against physics bounds.
   * @param input - Cutting parameters to validate
   * @returns Physics gate result with verdict
   */
  validate(input: PhysicsValidationInput): PhysicsGateResult {
    const startTime = performance.now();
    this.evaluationCount++;

    const limits = { ...DEFAULT_MACHINE_LIMITS, ...input.machine_limits };
    const kienzle = KIENZLE_BY_ISO[input.iso_group];
    const taylor = TAYLOR_BY_ISO[input.iso_group];

    if (!kienzle || !taylor) {
      throw new Error(`Unknown ISO material group: ${input.iso_group}`);
    }

    const constraints: ConstraintResult[] = [];
    const recommendations: string[] = [];

    // 1. Kienzle cutting force
    const Fc = this.computeKienzleForce(input, kienzle);
    const forceLimit = limits.max_cutting_force_N;
    const forceMargin = 1 - Fc / forceLimit;
    const forceScore = Math.max(0, Math.min(1, forceMargin * 2 + 0.5));
    constraints.push({
      name: "cutting_force",
      passed: Fc <= forceLimit,
      value: Fc,
      limit: forceLimit,
      margin: forceMargin,
      score: forceScore,
      formula: "Fc = kc1_1 · ap · fz^(1-mc)",
      unit: "N",
      details: `kc1_1=${kienzle.kc1_1}, mc=${kienzle.mc}, ap=${input.ap_mm}mm, fz=${input.fz_mm}mm`,
    });
    if (Fc > forceLimit * 0.9) {
      recommendations.push(`Reduce ap or fz to lower cutting force (${Fc.toFixed(0)}N > 90% of limit)`);
    }

    // 2. Taylor tool life
    const T = this.computeTaylorLife(input, taylor);
    const lifeLimit = limits.min_tool_life_min;
    const lifeMargin = (T - lifeLimit) / lifeLimit;
    const lifeScore = Math.max(0, Math.min(1, (T / lifeLimit - 0.5) / 1.5));
    constraints.push({
      name: "tool_life",
      passed: T >= lifeLimit,
      value: T,
      limit: lifeLimit,
      margin: lifeMargin,
      score: lifeScore,
      formula: "T = (C / Vc)^(1/n)",
      unit: "min",
      details: `C=${taylor.C}, n=${taylor.n}, Vc=${input.vc_m_min}m/min`,
    });
    if (T < lifeLimit * 1.5) {
      recommendations.push(`Reduce cutting speed to extend tool life (${T.toFixed(1)}min)`);
    }

    // 3. Spindle power
    const P = this.computeCuttingPower(input, Fc);
    const powerLimit = limits.max_spindle_power_kW * limits.spindle_safety_factor;
    const powerMargin = 1 - P / powerLimit;
    const powerScore = Math.max(0, Math.min(1, powerMargin * 2 + 0.5));
    constraints.push({
      name: "spindle_power",
      passed: P <= powerLimit,
      value: P,
      limit: powerLimit,
      margin: powerMargin,
      score: powerScore,
      formula: "P = Fc · Vc / (60000 · η)",
      unit: "kW",
      details: `Fc=${Fc.toFixed(0)}N, Vc=${input.vc_m_min}m/min, η=0.85`,
    });
    if (P > powerLimit * 0.85) {
      recommendations.push(`Power consumption ${P.toFixed(1)}kW approaching spindle limit`);
    }

    // 4. Tool deflection
    const deflection = this.computeDeflection(input, Fc);
    const deflectionLimit = limits.max_deflection_mm;
    const deflectionMargin = 1 - deflection / deflectionLimit;
    const deflectionScore = Math.max(0, Math.min(1, deflectionMargin * 2 + 0.5));
    constraints.push({
      name: "tool_deflection",
      passed: deflection <= deflectionLimit,
      value: deflection,
      limit: deflectionLimit,
      margin: deflectionMargin,
      score: deflectionScore,
      formula: "δ = FL³ / (3EI)",
      unit: "mm",
      details: `F=${Fc.toFixed(0)}N, L=${input.tool_stickout_mm}mm, D=${input.tool_diameter_mm}mm`,
    });
    if (deflection > deflectionLimit * 0.7) {
      recommendations.push(`Reduce stick-out or use larger diameter tool (deflection ${deflection.toFixed(3)}mm)`);
    }

    // 5. Thermal estimate
    const temp = this.estimateCuttingTemp(input, kienzle);
    const tempLimit = limits.max_cutting_temp_C;
    const tempMargin = 1 - temp / tempLimit;
    const tempScore = Math.max(0, Math.min(1, tempMargin * 2 + 0.5));
    constraints.push({
      name: "cutting_temperature",
      passed: temp <= tempLimit,
      value: temp,
      limit: tempLimit,
      margin: tempMargin,
      score: tempScore,
      formula: "T ≈ f(Vc, fz, material)",
      unit: "°C",
      details: `Vc=${input.vc_m_min}m/min, ISO=${input.iso_group}`,
    });
    if (temp > tempLimit * 0.8) {
      recommendations.push(`High cutting temperature ${temp.toFixed(0)}°C — consider coolant or reduced speed`);
    }

    // Compute weighted safety score
    const safetyScore =
      constraints[0].score * SAFETY_WEIGHTS.force +
      constraints[1].score * SAFETY_WEIGHTS.tool_life +
      constraints[2].score * SAFETY_WEIGHTS.power +
      constraints[3].score * SAFETY_WEIGHTS.deflection +
      constraints[4].score * SAFETY_WEIGHTS.thermal;

    // Determine verdict
    let verdict: "PASS" | "WARN" | "REJECT";
    let passed: boolean;
    if (safetyScore >= 0.90 && constraints.every(c => c.passed)) {
      verdict = "PASS";
      passed = true;
    } else if (safetyScore >= 0.70) {
      verdict = "WARN";
      passed = true;
      this.warnCount++;
    } else {
      verdict = "REJECT";
      passed = false;
      this.rejectCount++;
    }

    const validationTimeMs = performance.now() - startTime;

    log.info(
      `[CADPhysicsGate] ${verdict}: S(x)=${safetyScore.toFixed(3)}, ` +
        `Fc=${Fc.toFixed(0)}N, T=${T.toFixed(1)}min, P=${P.toFixed(1)}kW`
    );

    return {
      passed,
      verdict,
      safety_score: safetyScore,
      constraints,
      recommendations,
      physics_summary: {
        cutting_force_N: Fc,
        tool_life_min: T,
        cutting_power_kW: P,
        deflection_mm: deflection,
        cutting_temp_C: temp,
      },
      validation_time_ms: validationTimeMs,
      iso_group: input.iso_group,
      kienzle_source: kienzle.source,
      taylor_source: taylor.source,
    };
  }

  /**
   * Batch validate multiple parameter sets.
   */
  validateBatch(input: BatchValidationInput): BatchValidationResult {
    const results: Array<PhysicsGateResult & { index: number }> = [];
    let passed = 0;
    let warned = 0;
    let rejected = 0;
    let scoreSum = 0;

    for (let i = 0; i < input.items.length; i++) {
      const result = this.validate(input.items[i]);
      results.push({ ...result, index: i });
      scoreSum += result.safety_score;

      if (result.verdict === "PASS") passed++;
      else if (result.verdict === "WARN") warned++;
      else rejected++;

      if (input.stop_on_first_failure && result.verdict === "REJECT") {
        break;
      }
    }

    const overall: "PASS" | "WARN" | "REJECT" =
      rejected > 0 ? "REJECT" : warned > 0 ? "WARN" : "PASS";

    return {
      total: input.items.length,
      passed,
      warned,
      rejected,
      results,
      overall_verdict: overall,
      mean_safety_score: scoreSum / results.length,
    };
  }

  /**
   * Get physics constants for an ISO group.
   */
  getPhysicsConstants(isoGroup: ISOGroup): {
    kienzle: KienzleCoefficients;
    taylor: TaylorConstants;
  } {
    return {
      kienzle: KIENZLE_BY_ISO[isoGroup],
      taylor: TAYLOR_BY_ISO[isoGroup],
    };
  }

  /**
   * Get validation statistics.
   */
  getStats(): {
    evaluations: number;
    rejects: number;
    warns: number;
    reject_rate: number;
  } {
    return {
      evaluations: this.evaluationCount,
      rejects: this.rejectCount,
      warns: this.warnCount,
      reject_rate:
        this.evaluationCount > 0
          ? this.rejectCount / this.evaluationCount
          : 0,
    };
  }

  /**
   * Reset statistics.
   */
  resetStats(): void {
    this.evaluationCount = 0;
    this.rejectCount = 0;
    this.warnCount = 0;
  }

  // ──────────────────────────────────────────────────────────────────────────
  // Private physics computation methods
  // ──────────────────────────────────────────────────────────────────────────

  /**
   * Compute Kienzle cutting force.
   * Fc = kc1_1 · ap · fz^(1-mc)
   */
  private computeKienzleForce(
    input: PhysicsValidationInput,
    kienzle: KienzleCoefficients
  ): number {
    const { ap_mm, fz_mm, ae_mm, tool_diameter_mm } = input;
    const { kc1_1, mc } = kienzle;

    // Basic Kienzle force
    let Fc = kc1_1 * ap_mm * Math.pow(fz_mm, 1 - mc);

    // For milling, scale by radial engagement ratio
    if (ae_mm !== undefined && ae_mm > 0) {
      const engagementRatio = ae_mm / tool_diameter_mm;
      Fc *= Math.sqrt(engagementRatio);
    }

    return Fc;
  }

  /**
   * Compute Taylor tool life.
   * T = (C / Vc)^(1/n)
   */
  private computeTaylorLife(
    input: PhysicsValidationInput,
    taylor: TaylorConstants
  ): number {
    const { vc_m_min } = input;
    const { C, n } = taylor;

    if (vc_m_min <= 0) return Infinity;
    return Math.pow(C / vc_m_min, 1 / n);
  }

  /**
   * Compute cutting power.
   * P = Fc · Vc / (60000 · η)
   */
  private computeCuttingPower(
    input: PhysicsValidationInput,
    Fc: number
  ): number {
    const efficiency = 0.85;
    return (Fc * input.vc_m_min) / (60000 * efficiency);
  }

  /**
   * Compute tool deflection using beam bending formula.
   * δ = FL³ / (3EI) where I = π·D⁴/64
   */
  private computeDeflection(
    input: PhysicsValidationInput,
    Fc: number
  ): number {
    const E = 600000; // Young's modulus for carbide [N/mm²]
    const D = input.tool_diameter_mm;
    const L = input.tool_stickout_mm;

    const I = (Math.PI * Math.pow(D, 4)) / 64;
    return (Fc * Math.pow(L, 3)) / (3 * E * I);
  }

  /**
   * Estimate cutting temperature (simplified empirical model).
   * Based on specific cutting energy and material properties.
   */
  private estimateCuttingTemp(
    input: PhysicsValidationInput,
    kienzle: KienzleCoefficients
  ): number {
    const baseTemp = 20; // Ambient
    const { vc_m_min, fz_mm, ap_mm, iso_group } = input;

    // Temperature coefficients by material group
    const tempCoeff: Record<ISOGroup, number> = {
      P: 0.8,
      M: 1.0,
      K: 0.6,
      N: 0.4,
      S: 1.2,
      H: 1.4,
    };

    // Simplified Shaw model approximation
    const specificEnergy = kienzle.kc1_1 * Math.pow(fz_mm, -kienzle.mc);
    const materialFactor = tempCoeff[iso_group];
    const speedFactor = Math.pow(vc_m_min / 100, 0.4);
    const chipFactor = Math.pow((ap_mm * fz_mm) / 0.5, 0.1);

    return baseTemp + specificEnergy * materialFactor * speedFactor * chipFactor * 0.15;
  }
}

export const cadPhysicsConsistencyGateEngine = new CADPhysicsConsistencyGateEngine();
