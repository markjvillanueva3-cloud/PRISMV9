/**
 * PRISM MCP Server — Metrology Uncertainty Engine
 *
 * GUM (Guide to the Expression of Uncertainty in Measurement) compliant
 * measurement uncertainty analysis for manufacturing metrology.
 *
 * Implements:
 *   - GUM Type A evaluation (statistical analysis of repeated observations)
 *   - GUM Type B evaluation (rectangular, triangular, U-shaped, normal)
 *   - Combined standard uncertainty (uncorrelated & correlated)
 *   - Expanded uncertainty with Welch-Satterthwaite effective DOF
 *   - CMM measurement uncertainty (probe, temperature, fixture, MPE, CTE)
 *   - Gage R&R analysis (AIAG MSA method)
 *   - Measurement decision risk (ASME B89.7.3.1 guard banding)
 *   - Surface texture uncertainty (Ra measurement)
 *
 * References:
 *   JCGM 100:2008 (GUM), ISO 14253-2, AIAG MSA 4th ed.,
 *   ASME B89.7.3.1-2001, ISO 15530-3
 *
 * Exported singleton: metrologyUncertaintyEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES & INTERFACES
// ============================================================================

/** Distribution type for Type B uncertainty evaluation */
export type TypeBDistribution = "rectangular" | "triangular" | "u-shaped" | "normal";

/** A single uncertainty source (budget line) */
export interface UncertaintySource {
  /** Descriptive name */
  name: string;
  /** Standard uncertainty value */
  standardUncertainty: number;
  /** Sensitivity coefficient (default 1) */
  sensitivityCoefficient?: number;
  /** Degrees of freedom (Infinity for Type B) */
  degreesOfFreedom: number;
  /** Type A or Type B */
  type: "A" | "B";
  /** Distribution (Type B only) */
  distribution?: TypeBDistribution;
}

/** Result of Type A evaluation */
export interface TypeAResult {
  /** Sample mean */
  mean: number;
  /** Sample standard deviation */
  standardDeviation: number;
  /** Standard uncertainty u_A = s / sqrt(n) */
  standardUncertainty: number;
  /** Effective degrees of freedom (n - 1) */
  degreesOfFreedom: number;
  /** Number of measurements */
  n: number;
}

/** Result of Type B evaluation */
export interface TypeBResult {
  /** Standard uncertainty */
  standardUncertainty: number;
  /** Distribution used */
  distribution: TypeBDistribution;
  /** Half-width of the distribution */
  halfWidth: number;
  /** Degrees of freedom (Infinity for Type B) */
  degreesOfFreedom: number;
}

/** Result of combined uncertainty calculation */
export interface CombinedUncertaintyResult {
  /** Combined standard uncertainty u_c */
  combinedUncertainty: number;
  /** Welch-Satterthwaite effective degrees of freedom */
  effectiveDOF: number;
  /** Individual contributions (ci^2 * ui^2) */
  contributions: Array<{ name: string; contribution: number; percentage: number }>;
}

/** Result of expanded uncertainty calculation */
export interface ExpandedUncertaintyResult {
  /** Combined standard uncertainty */
  combinedUncertainty: number;
  /** Coverage factor k */
  coverageFactor: number;
  /** Expanded uncertainty U = k * u_c */
  expandedUncertainty: number;
  /** Confidence level (e.g., 0.95) */
  confidenceLevel: number;
  /** Effective degrees of freedom */
  effectiveDOF: number;
}

/** CMM uncertainty input parameters */
export interface CMMUncertaintyInput {
  /** Measured length in mm */
  measuredLength: number;
  /** Part material (for CTE lookup) */
  partMaterial: string;
  /** Ambient temperature in deg C */
  ambientTemperature: number;
  /** Temperature uncertainty in deg C */
  temperatureUncertainty: number;
  /** Probe repeatability standard deviation in mm */
  probeRepeatability: number;
  /** CMM MPE specification (optional — uses database if omitted) */
  cmmMPE?: { a: number; b: number };
  /** CMM manufacturer for MPE lookup */
  cmmManufacturer?: string;
  /** Fixture repeatability in mm (optional, default 0.001) */
  fixtureRepeatability?: number;
  /** Scale CTE in 1/K (optional, default 11.5e-6 for steel scale) */
  scaleCTE?: number;
}

/** CMM uncertainty result */
export interface CMMUncertaintyResult {
  /** Total CMM standard uncertainty */
  totalUncertainty: number;
  /** Probe repeatability contribution */
  probeUncertainty: number;
  /** Temperature-induced uncertainty */
  temperatureUncertainty: number;
  /** CTE mismatch uncertainty */
  cteMismatchUncertainty: number;
  /** Fixture uncertainty */
  fixtureUncertainty: number;
  /** MPE-based uncertainty */
  mpeUncertainty: number;
  /** Temperature correction applied (mm) */
  temperatureCorrection: number;
  /** Expanded uncertainty at 95% (k=2) */
  expandedUncertainty: number;
}

/** Gage R&R input data */
export interface GageRRInput {
  /**
   * Measurement data: measurements[operator][part][repeat]
   * operators × parts × repeats
   */
  measurements: number[][][];
  /** Part tolerance (for %GRR calculation) */
  tolerance: number;
}

/** Gage R&R result (AIAG MSA method) */
export interface GageRRResult {
  /** Equipment Variation (repeatability) */
  EV: number;
  /** Appraiser Variation (reproducibility) */
  AV: number;
  /** Gage R&R = sqrt(EV^2 + AV^2) */
  GRR: number;
  /** Part Variation */
  PV: number;
  /** Total Variation = sqrt(GRR^2 + PV^2) */
  TV: number;
  /** %EV = EV/TV * 100 */
  percentEV: number;
  /** %AV = AV/TV * 100 */
  percentAV: number;
  /** %GRR = GRR/tolerance * 100 */
  percentGRR: number;
  /** Number of distinct categories ndc = 1.41 * PV / GRR */
  ndc: number;
  /** Decision: acceptable / marginal / unacceptable */
  decision: "acceptable" | "marginal" | "unacceptable";
}

/** Measurement decision risk result */
export interface DecisionRiskResult {
  /** Conformance probability */
  conformanceProbability: number;
  /** Guard-banded acceptance zone width */
  guardBandedZone: number;
  /** Original tolerance zone width */
  toleranceZone: number;
  /** Consumer risk (false accept probability) */
  consumerRisk: number;
  /** Producer risk (false reject probability) */
  producerRisk: number;
  /** Measured value */
  measuredValue: number;
}

/** Surface texture uncertainty result */
export interface SurfaceTextureUncertaintyResult {
  /** Measured Ra value */
  measuredRa: number;
  /** Combined standard uncertainty of Ra */
  standardUncertainty: number;
  /** Expanded uncertainty (k=2, 95%) */
  expandedUncertainty: number;
  /** Relative uncertainty as percentage */
  relativeUncertaintyPercent: number;
  /** Individual source contributions */
  contributions: {
    cutoff: number;
    stylus: number;
    traverseSpeed: number;
    filter: number;
    repeatability: number;
  };
}

// ============================================================================
// DATABASES
// ============================================================================

/**
 * CMM MPE specifications: MPE_E = a + b * L (μm, L in mm)
 * Generic representative specs by manufacturer tier.
 */
const CMM_MPE_DATABASE: Record<string, { a: number; b: number; description: string }> = {
  zeiss: { a: 1.5, b: 3.0e-3, description: "Zeiss CONTURA/PRISMO class (MPE_E = 1.5 + L/333 μm)" },
  hexagon: { a: 1.7, b: 3.5e-3, description: "Hexagon Global/Brown&Sharpe class (MPE_E = 1.7 + L/286 μm)" },
  mitutoyo: { a: 1.7, b: 3.0e-3, description: "Mitutoyo Crysta-Apex class (MPE_E = 1.7 + L/333 μm)" },
  generic: { a: 2.5, b: 4.0e-3, description: "Generic shop-floor CMM (MPE_E = 2.5 + L/250 μm)" },
};

/**
 * Standard gage uncertainties (standard uncertainty in mm).
 * Values represent typical calibrated instrument uncertainty at 95% (divided by 2).
 */
export const GAGE_UNCERTAINTY_DATABASE: Record<string, { uncertainty_mm: number; description: string }> = {
  micrometer_0_25: { uncertainty_mm: 0.001, description: "Outside micrometer 0-25mm, calibrated" },
  micrometer_25_50: { uncertainty_mm: 0.0015, description: "Outside micrometer 25-50mm, calibrated" },
  micrometer_50_75: { uncertainty_mm: 0.002, description: "Outside micrometer 50-75mm, calibrated" },
  caliper_150: { uncertainty_mm: 0.01, description: "Digital caliper 0-150mm" },
  caliper_300: { uncertainty_mm: 0.015, description: "Digital caliper 0-300mm" },
  indicator_0001: { uncertainty_mm: 0.0005, description: "Dial indicator 0.001mm resolution" },
  indicator_001: { uncertainty_mm: 0.005, description: "Dial indicator 0.01mm resolution" },
  ring_gage: { uncertainty_mm: 0.0005, description: "Calibrated ring gage (Class XX)" },
  plug_gage: { uncertainty_mm: 0.0005, description: "Calibrated plug gage (Class XX)" },
  height_gage: { uncertainty_mm: 0.005, description: "Digital height gage 0-300mm" },
  bore_gage: { uncertainty_mm: 0.002, description: "Bore gage with setting ring" },
  gage_block_0: { uncertainty_mm: 0.00005, description: "Grade 0 gage block" },
  gage_block_1: { uncertainty_mm: 0.0001, description: "Grade 1 gage block" },
  gage_block_k: { uncertainty_mm: 0.00003, description: "Grade K gage block" },
};

/**
 * Material CTE (coefficient of thermal expansion) in 1/K (×10^-6).
 * Values at approximately 20°C.
 */
export const MATERIAL_CTE_DATABASE: Record<string, { cte: number; name: string }> = {
  aluminum_6061: { cte: 23.6e-6, name: "Aluminum 6061-T6" },
  aluminum_7075: { cte: 23.4e-6, name: "Aluminum 7075-T6" },
  steel_1045: { cte: 11.5e-6, name: "AISI 1045 Steel" },
  steel_4140: { cte: 11.2e-6, name: "AISI 4140 Steel" },
  stainless_304: { cte: 17.3e-6, name: "Stainless Steel 304" },
  stainless_316: { cte: 16.0e-6, name: "Stainless Steel 316" },
  titanium_ti6al4v: { cte: 8.6e-6, name: "Ti-6Al-4V" },
  copper_c110: { cte: 17.0e-6, name: "Copper C110" },
  brass_c360: { cte: 20.5e-6, name: "Brass C360" },
  cast_iron_gray: { cte: 10.5e-6, name: "Gray Cast Iron" },
  inconel_718: { cte: 13.0e-6, name: "Inconel 718" },
  invar: { cte: 1.2e-6, name: "Invar 36" },
};

/**
 * t-distribution critical values at 95.45% confidence (two-sided).
 * Index = degrees of freedom (1..50, then Infinity → 2.0).
 */
const T_TABLE_95: Record<number, number> = {
  1: 12.706, 2: 4.303, 3: 3.182, 4: 2.776, 5: 2.571,
  6: 2.447, 7: 2.365, 8: 2.306, 9: 2.262, 10: 2.228,
  11: 2.201, 12: 2.179, 13: 2.160, 14: 2.145, 15: 2.131,
  16: 2.120, 17: 2.110, 18: 2.101, 19: 2.093, 20: 2.086,
  25: 2.060, 30: 2.042, 40: 2.021, 50: 2.009, 60: 2.000,
  80: 1.990, 100: 1.984, 200: 1.972, 500: 1.965,
};

/**
 * K1 constants for Gage R&R (AIAG MSA, d2* values by number of trials/repeats)
 * K1 = 1 / d2*
 */
const K1_TABLE: Record<number, number> = {
  2: 0.8862,  // 1/1.128
  3: 0.5908,  // 1/1.693
  4: 0.4857,  // 1/2.059
  5: 0.4299,  // 1/2.326
};

/**
 * K2 constants for Gage R&R (AIAG MSA, d2* values by number of operators)
 * K2 = 1 / d2*
 */
const K2_TABLE: Record<number, number> = {
  2: 0.7071,  // 1/1.414
  3: 0.5231,  // 1/1.912
  4: 0.4467,  // 1/2.239
  5: 0.4030,  // 1/2.481
};

/**
 * K3 constants for Part Variation (AIAG MSA, d2* values by number of parts)
 */
const K3_TABLE: Record<number, number> = {
  2: 0.7071, 3: 0.5231, 4: 0.4467, 5: 0.4030,
  6: 0.3742, 7: 0.3534, 8: 0.3375, 9: 0.3249, 10: 0.3146,
};

// ============================================================================
// ENGINE CLASS
// ============================================================================

/**
 * MetrologyUncertaintyEngine — GUM-compliant measurement uncertainty analysis.
 *
 * Provides complete uncertainty budgets for manufacturing metrology including
 * Type A/B evaluation, combined/expanded uncertainty, CMM measurement,
 * Gage R&R, decision risk, and surface texture uncertainty.
 */
export class MetrologyUncertaintyEngine {
  // --------------------------------------------------------------------------
  // Type A Evaluation
  // --------------------------------------------------------------------------

  /**
   * GUM Type A uncertainty evaluation from repeated measurements.
   *
   * u_A = s / sqrt(n), where s = sample standard deviation.
   * Effective DOF = n - 1.
   *
   * @param measurements - Array of repeated measurement values
   * @returns TypeAResult with mean, std dev, uncertainty, DOF
   * @throws Error if fewer than 2 measurements
   *
   * @example
   * ```ts
   * const result = engine.typeAEvaluation([10.01, 10.02, 9.99, 10.00, 10.01]);
   * // result.standardUncertainty ≈ 0.005
   * ```
   */
  typeAEvaluation(measurements: number[]): TypeAResult {
    const n = measurements.length;
    if (n < 2) {
      throw new Error("Type A evaluation requires at least 2 measurements");
    }

    const mean = measurements.reduce((s, v) => s + v, 0) / n;
    const sumSqDiff = measurements.reduce((s, v) => s + (v - mean) ** 2, 0);
    const stdDev = Math.sqrt(sumSqDiff / (n - 1));
    const uncertainty = stdDev / Math.sqrt(n);

    log.debug(`[MetrologyUncertainty] Type A: n=${n}, mean=${mean.toFixed(6)}, s=${stdDev.toFixed(6)}, u_A=${uncertainty.toFixed(6)}`);

    return {
      mean,
      standardDeviation: stdDev,
      standardUncertainty: uncertainty,
      degreesOfFreedom: n - 1,
      n,
    };
  }

  // --------------------------------------------------------------------------
  // Type B Evaluation
  // --------------------------------------------------------------------------

  /**
   * GUM Type B uncertainty evaluation from assumed distribution.
   *
   * - Rectangular: u = a / sqrt(3)
   * - Triangular:  u = a / sqrt(6)
   * - U-shaped:    u = a / sqrt(2)
   * - Normal:      u = a / k (k = coverage factor, default 2)
   *
   * @param halfWidth - Half-width 'a' of the distribution (or expanded uncertainty for normal)
   * @param distribution - Distribution type
   * @param coverageFactor - Coverage factor for normal distribution (default 2)
   * @returns TypeBResult with standard uncertainty
   *
   * @example
   * ```ts
   * // Rectangular ±0.01 mm
   * const result = engine.typeBEvaluation(0.01, "rectangular");
   * // result.standardUncertainty ≈ 0.00577
   * ```
   */
  typeBEvaluation(halfWidth: number, distribution: TypeBDistribution, coverageFactor: number = 2): TypeBResult {
    if (halfWidth < 0) {
      throw new Error("Half-width must be non-negative");
    }

    let uncertainty: number;
    switch (distribution) {
      case "rectangular":
        uncertainty = halfWidth / Math.sqrt(3);
        break;
      case "triangular":
        uncertainty = halfWidth / Math.sqrt(6);
        break;
      case "u-shaped":
        uncertainty = halfWidth / Math.sqrt(2);
        break;
      case "normal":
        uncertainty = halfWidth / coverageFactor;
        break;
      default:
        throw new Error(`Unknown distribution: ${distribution}`);
    }

    log.debug(`[MetrologyUncertainty] Type B (${distribution}): a=${halfWidth}, u_B=${uncertainty.toFixed(6)}`);

    return {
      standardUncertainty: uncertainty,
      distribution,
      halfWidth,
      degreesOfFreedom: Infinity,
    };
  }

  // --------------------------------------------------------------------------
  // Combined Standard Uncertainty
  // --------------------------------------------------------------------------

  /**
   * Calculate combined standard uncertainty from multiple sources (uncorrelated).
   *
   * u_c = sqrt( Σ ci² × ui² )
   *
   * Uses Welch-Satterthwaite for effective DOF:
   * ν_eff = u_c⁴ / Σ( ci⁴ × ui⁴ / νi )
   *
   * @param sources - Array of uncertainty sources with sensitivity coefficients
   * @returns Combined uncertainty result with contributions breakdown
   *
   * @example
   * ```ts
   * const result = engine.combinedUncertainty([
   *   { name: "gage", standardUncertainty: 0.001, sensitivityCoefficient: 1, degreesOfFreedom: Infinity, type: "B" },
   *   { name: "repeat", standardUncertainty: 0.002, sensitivityCoefficient: 1, degreesOfFreedom: 9, type: "A" },
   * ]);
   * ```
   */
  combinedUncertainty(sources: UncertaintySource[]): CombinedUncertaintyResult {
    if (sources.length === 0) {
      return { combinedUncertainty: 0, effectiveDOF: Infinity, contributions: [] };
    }

    // Calculate contributions
    const contribs = sources.map((s) => {
      const ci = s.sensitivityCoefficient ?? 1;
      const contrib = (ci * s.standardUncertainty) ** 2;
      return { name: s.name, ci, ui: s.standardUncertainty, contrib, dof: s.degreesOfFreedom };
    });

    const ucSquared = contribs.reduce((sum, c) => sum + c.contrib, 0);
    const uc = Math.sqrt(ucSquared);

    // Welch-Satterthwaite effective DOF
    const effectiveDOF = this._welchSatterthwaite(
      uc,
      contribs.map((c) => ({ ci: c.ci, ui: c.ui, dof: c.dof }))
    );

    const totalContrib = ucSquared || 1;
    const contributions = contribs.map((c) => ({
      name: c.name,
      contribution: c.contrib,
      percentage: (c.contrib / totalContrib) * 100,
    }));

    log.debug(`[MetrologyUncertainty] Combined: u_c=${uc.toFixed(6)}, ν_eff=${effectiveDOF.toFixed(1)}`);

    return { combinedUncertainty: uc, effectiveDOF, contributions };
  }

  /**
   * Calculate combined standard uncertainty with correlation (covariance matrix).
   *
   * u_c = sqrt( Σ Σ ci × cj × u(xi,xj) )
   *
   * @param sensitivityCoefficients - Array of sensitivity coefficients ci
   * @param covarianceMatrix - Covariance matrix u(xi, xj). Diagonal = ui².
   * @returns Combined standard uncertainty value
   */
  combinedUncertaintyCorrelated(sensitivityCoefficients: number[], covarianceMatrix: number[][]): number {
    const n = sensitivityCoefficients.length;
    if (covarianceMatrix.length !== n || covarianceMatrix.some((row) => row.length !== n)) {
      throw new Error("Covariance matrix dimensions must match number of sensitivity coefficients");
    }

    let ucSquared = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        ucSquared += sensitivityCoefficients[i] * sensitivityCoefficients[j] * covarianceMatrix[i][j];
      }
    }

    if (ucSquared < 0) {
      throw new Error("Negative combined variance — check covariance matrix is positive semi-definite");
    }

    return Math.sqrt(ucSquared);
  }

  // --------------------------------------------------------------------------
  // Expanded Uncertainty
  // --------------------------------------------------------------------------

  /**
   * Calculate expanded uncertainty U = k × u_c.
   *
   * Coverage factor k is obtained from t-distribution using the Welch-Satterthwaite
   * effective degrees of freedom at the specified confidence level (default 95%).
   *
   * @param sources - Uncertainty sources for budget
   * @param confidenceLevel - Desired confidence level (default 0.95)
   * @returns Expanded uncertainty result
   *
   * @example
   * ```ts
   * const result = engine.expandedUncertainty(sources, 0.95);
   * // result.expandedUncertainty = k * u_c
   * ```
   */
  expandedUncertainty(sources: UncertaintySource[], confidenceLevel: number = 0.95): ExpandedUncertaintyResult {
    const combined = this.combinedUncertainty(sources);
    const k = this._coverageFactorFromDOF(combined.effectiveDOF, confidenceLevel);
    const expanded = k * combined.combinedUncertainty;

    log.debug(`[MetrologyUncertainty] Expanded: U=${expanded.toFixed(6)} (k=${k.toFixed(3)}, ν_eff=${combined.effectiveDOF.toFixed(1)})`);

    return {
      combinedUncertainty: combined.combinedUncertainty,
      coverageFactor: k,
      expandedUncertainty: expanded,
      confidenceLevel,
      effectiveDOF: combined.effectiveDOF,
    };
  }

  // --------------------------------------------------------------------------
  // CMM Measurement Uncertainty
  // --------------------------------------------------------------------------

  /**
   * Calculate CMM measurement uncertainty per ISO 15530-3.
   *
   * Sources: probe repeatability, temperature effects (correction + CTE mismatch),
   * fixture, and machine MPE.
   *
   * Temperature correction: ΔL = L × α × (T - 20°C)
   * CTE mismatch: u_CTE = L × |α_part - α_scale| × u_T
   *
   * @param input - CMM measurement parameters
   * @returns CMM uncertainty result with all contributions
   */
  cmmUncertainty(input: CMMUncertaintyInput): CMMUncertaintyResult {
    const {
      measuredLength,
      partMaterial,
      ambientTemperature,
      temperatureUncertainty,
      probeRepeatability,
      fixtureRepeatability = 0.001,
      scaleCTE = 11.5e-6,
    } = input;

    // Look up part CTE
    const materialKey = partMaterial.toLowerCase().replace(/[\s-]/g, "_");
    const materialData = MATERIAL_CTE_DATABASE[materialKey];
    const partCTE = materialData ? materialData.cte : 11.5e-6; // default to steel

    // Look up CMM MPE
    const mpeSpec = input.cmmMPE ?? this._lookupCMMMPE(input.cmmManufacturer);
    // MPE_E in μm → mm: (a + b*L) / 1000
    const mpeValue = (mpeSpec.a + mpeSpec.b * measuredLength) / 1000;
    // MPE as rectangular distribution
    const mpeUncertainty = mpeValue / Math.sqrt(3);

    // Temperature correction: ΔL = L × α_part × (T - 20)
    const tempCorrection = measuredLength * partCTE * (ambientTemperature - 20);

    // Temperature uncertainty contribution
    // u_temp = L × α_part × u_T (rectangular on temperature)
    const tempUncertainty = measuredLength * partCTE * (temperatureUncertainty / Math.sqrt(3));

    // CTE mismatch uncertainty
    // u_CTE = L × |α_part - α_scale| × u_T
    const cteDiff = Math.abs(partCTE - scaleCTE);
    const cteUncertainty = measuredLength * cteDiff * (temperatureUncertainty / Math.sqrt(3));

    // Probe repeatability (already a standard uncertainty)
    const probeU = probeRepeatability;

    // Fixture repeatability (Type B rectangular)
    const fixtureU = fixtureRepeatability / Math.sqrt(3);

    // Combined (RSS)
    const totalU = Math.sqrt(
      probeU ** 2 + tempUncertainty ** 2 + cteUncertainty ** 2 + fixtureU ** 2 + mpeUncertainty ** 2
    );

    log.debug(
      `[MetrologyUncertainty] CMM: L=${measuredLength}mm, ` +
      `u_probe=${probeU.toFixed(6)}, u_temp=${tempUncertainty.toFixed(6)}, ` +
      `u_CTE=${cteUncertainty.toFixed(6)}, u_fix=${fixtureU.toFixed(6)}, ` +
      `u_MPE=${mpeUncertainty.toFixed(6)}, u_total=${totalU.toFixed(6)}`
    );

    return {
      totalUncertainty: totalU,
      probeUncertainty: probeU,
      temperatureUncertainty: tempUncertainty,
      cteMismatchUncertainty: cteUncertainty,
      fixtureUncertainty: fixtureU,
      mpeUncertainty: mpeUncertainty,
      temperatureCorrection: tempCorrection,
      expandedUncertainty: 2 * totalU,
    };
  }

  // --------------------------------------------------------------------------
  // Gage R&R (AIAG MSA)
  // --------------------------------------------------------------------------

  /**
   * Gage R&R analysis per AIAG MSA 4th edition (Average & Range method).
   *
   * EV = R̄ × K1 (Equipment Variation / Repeatability)
   * AV = sqrt((X̄_diff × K2)² - EV²/(n×r)) (Appraiser Variation / Reproducibility)
   * GRR = sqrt(EV² + AV²)
   * %GRR = GRR / tolerance × 100
   * ndc = 1.41 × PV / GRR
   *
   * Decision thresholds:
   *   <10%  = acceptable
   *   10-30% = marginal
   *   >30%  = unacceptable
   *
   * @param input - Gage R&R measurement data and tolerance
   * @returns Complete Gage R&R analysis result
   */
  gageRR(input: GageRRInput): GageRRResult {
    const { measurements, tolerance } = input;
    const numOperators = measurements.length;
    const numParts = measurements[0].length;
    const numRepeats = measurements[0][0].length;

    // Validate
    if (numOperators < 2) throw new Error("Gage R&R requires at least 2 operators");
    if (numParts < 2) throw new Error("Gage R&R requires at least 2 parts");
    if (numRepeats < 2) throw new Error("Gage R&R requires at least 2 repeats");

    const K1 = K1_TABLE[numRepeats];
    const K2 = K2_TABLE[numOperators];
    const K3 = K3_TABLE[numParts];

    if (!K1 || !K2 || !K3) {
      throw new Error(`K-constants not available for ${numRepeats} repeats, ${numOperators} operators, ${numParts} parts`);
    }

    // Calculate range for each operator×part, then average range per operator
    const operatorRanges: number[] = [];
    for (let op = 0; op < numOperators; op++) {
      let rangeSum = 0;
      for (let part = 0; part < numParts; part++) {
        const vals = measurements[op][part];
        const range = Math.max(...vals) - Math.min(...vals);
        rangeSum += range;
      }
      operatorRanges.push(rangeSum / numParts);
    }
    const Rbar = operatorRanges.reduce((s, v) => s + v, 0) / numOperators;

    // EV (Equipment Variation = Repeatability)
    const EV = Rbar * K1;

    // Operator averages
    const operatorMeans: number[] = [];
    for (let op = 0; op < numOperators; op++) {
      let total = 0;
      let count = 0;
      for (let part = 0; part < numParts; part++) {
        for (let rep = 0; rep < numRepeats; rep++) {
          total += measurements[op][part][rep];
          count++;
        }
      }
      operatorMeans.push(total / count);
    }
    const Xbar_diff = Math.max(...operatorMeans) - Math.min(...operatorMeans);

    // AV (Appraiser Variation = Reproducibility)
    const avSquared = (Xbar_diff * K2) ** 2 - (EV ** 2) / (numParts * numRepeats);
    const AV = avSquared > 0 ? Math.sqrt(avSquared) : 0;

    // GRR
    const GRR = Math.sqrt(EV ** 2 + AV ** 2);

    // Part Variation (PV)
    const partMeans: number[] = [];
    for (let part = 0; part < numParts; part++) {
      let total = 0;
      let count = 0;
      for (let op = 0; op < numOperators; op++) {
        for (let rep = 0; rep < numRepeats; rep++) {
          total += measurements[op][part][rep];
          count++;
        }
      }
      partMeans.push(total / count);
    }
    const Rp = Math.max(...partMeans) - Math.min(...partMeans);
    const PV = Rp * K3;

    // Total Variation
    const TV = Math.sqrt(GRR ** 2 + PV ** 2);

    // Percentages
    const percentEV = TV > 0 ? (EV / TV) * 100 : 0;
    const percentAV = TV > 0 ? (AV / TV) * 100 : 0;
    const percentGRR = tolerance > 0 ? (GRR / tolerance) * 100 : 0;

    // Number of distinct categories
    const ndc = GRR > 0 ? Math.floor(1.41 * (PV / GRR)) : Infinity;

    // Decision
    let decision: "acceptable" | "marginal" | "unacceptable";
    if (percentGRR < 10) decision = "acceptable";
    else if (percentGRR <= 30) decision = "marginal";
    else decision = "unacceptable";

    log.debug(
      `[MetrologyUncertainty] Gage R&R: EV=${EV.toFixed(6)}, AV=${AV.toFixed(6)}, GRR=${GRR.toFixed(6)}, %GRR=${percentGRR.toFixed(1)}%, ndc=${ndc}, decision=${decision}`
    );

    return { EV, AV, GRR, PV, TV, percentEV, percentAV, percentGRR, ndc, decision };
  }

  // --------------------------------------------------------------------------
  // Measurement Decision Risk (ASME B89.7.3.1)
  // --------------------------------------------------------------------------

  /**
   * Measurement decision risk analysis per ASME B89.7.3.1.
   *
   * Conformance probability: P(conform) = Φ((USL-x)/u) - Φ((LSL-x)/u)
   * Guard banding: acceptance zone = tolerance - 2×U
   * Consumer risk: probability of accepting nonconforming part
   * Producer risk: probability of rejecting conforming part
   *
   * @param measuredValue - The measured dimension
   * @param lsl - Lower specification limit
   * @param usl - Upper specification limit
   * @param measurementUncertainty - Standard measurement uncertainty
   * @param coverageFactor - Coverage factor for guard banding (default 2)
   * @returns Decision risk analysis result
   */
  measurementDecisionRisk(
    measuredValue: number,
    lsl: number,
    usl: number,
    measurementUncertainty: number,
    coverageFactor: number = 2
  ): DecisionRiskResult {
    const tolerance = usl - lsl;
    const expandedU = coverageFactor * measurementUncertainty;
    const guardBandedZone = Math.max(0, tolerance - 2 * expandedU);

    // Conformance probability using normal CDF
    const zUpper = (usl - measuredValue) / measurementUncertainty;
    const zLower = (lsl - measuredValue) / measurementUncertainty;
    const conformanceProbability = this._normalCDF(zUpper) - this._normalCDF(zLower);

    // Consumer risk: P(actual out of spec | measured in spec)
    // Approximate as 1 - conformanceProbability when measurement is near boundary
    const distToNearest = Math.min(Math.abs(measuredValue - lsl), Math.abs(measuredValue - usl));
    const zBoundary = distToNearest / measurementUncertainty;
    const consumerRisk = 1 - this._normalCDF(zBoundary);

    // Producer risk: P(measured out of spec | actual in spec)
    // Guard band shrinks acceptance zone → produces false rejects
    const guardBandWidth = expandedU;
    const zGuard = guardBandWidth / measurementUncertainty;
    const producerRisk = 2 * (1 - this._normalCDF(zGuard));

    log.debug(
      `[MetrologyUncertainty] Decision risk: P(conform)=${(conformanceProbability * 100).toFixed(2)}%, consumer=${(consumerRisk * 100).toFixed(2)}%, producer=${(producerRisk * 100).toFixed(2)}%`
    );

    return {
      conformanceProbability,
      guardBandedZone,
      toleranceZone: tolerance,
      consumerRisk,
      producerRisk,
      measuredValue,
    };
  }

  // --------------------------------------------------------------------------
  // Surface Texture Uncertainty
  // --------------------------------------------------------------------------

  /**
   * Calculate Ra measurement uncertainty from contributing sources.
   *
   * u_Ra = sqrt(u_cutoff² + u_stylus² + u_speed² + u_filter² + u_repeat²)
   *
   * Typical relative uncertainty: 5-15% of measured Ra.
   *
   * @param measuredRa - Measured Ra value in μm
   * @param cutoffUncertainty - Cutoff filter uncertainty in μm (default 2% of Ra)
   * @param stylusUncertainty - Stylus tip uncertainty in μm (default 3% of Ra)
   * @param traverseSpeedUncertainty - Traverse speed uncertainty in μm (default 1% of Ra)
   * @param filterUncertainty - Digital filter uncertainty in μm (default 2% of Ra)
   * @param repeatabilityUncertainty - Repeatability std dev in μm (default 3% of Ra)
   * @returns Surface texture uncertainty result
   */
  surfaceTextureUncertainty(
    measuredRa: number,
    cutoffUncertainty?: number,
    stylusUncertainty?: number,
    traverseSpeedUncertainty?: number,
    filterUncertainty?: number,
    repeatabilityUncertainty?: number
  ): SurfaceTextureUncertaintyResult {
    // Default uncertainties as percentage of measured Ra
    const uCutoff = cutoffUncertainty ?? measuredRa * 0.02;
    const uStylus = stylusUncertainty ?? measuredRa * 0.03;
    const uSpeed = traverseSpeedUncertainty ?? measuredRa * 0.01;
    const uFilter = filterUncertainty ?? measuredRa * 0.02;
    const uRepeat = repeatabilityUncertainty ?? measuredRa * 0.03;

    const uCombined = Math.sqrt(uCutoff ** 2 + uStylus ** 2 + uSpeed ** 2 + uFilter ** 2 + uRepeat ** 2);
    const expandedU = 2 * uCombined;
    const relativePercent = measuredRa > 0 ? (expandedU / measuredRa) * 100 : 0;

    log.debug(
      `[MetrologyUncertainty] Surface texture: Ra=${measuredRa}μm, u_c=${uCombined.toFixed(4)}μm, U=${expandedU.toFixed(4)}μm (${relativePercent.toFixed(1)}%)`
    );

    return {
      measuredRa,
      standardUncertainty: uCombined,
      expandedUncertainty: expandedU,
      relativeUncertaintyPercent: relativePercent,
      contributions: {
        cutoff: uCutoff ** 2,
        stylus: uStylus ** 2,
        traverseSpeed: uSpeed ** 2,
        filter: uFilter ** 2,
        repeatability: uRepeat ** 2,
      },
    };
  }

  // --------------------------------------------------------------------------
  // Utility: Lookup helpers
  // --------------------------------------------------------------------------

  /**
   * Get gage uncertainty from the database.
   *
   * @param gageType - Key from GAGE_UNCERTAINTY_DATABASE
   * @returns Standard uncertainty in mm, or undefined if not found
   */
  getGageUncertainty(gageType: string): number | undefined {
    return GAGE_UNCERTAINTY_DATABASE[gageType]?.uncertainty_mm;
  }

  /**
   * Get material CTE from the database.
   *
   * @param material - Key from MATERIAL_CTE_DATABASE
   * @returns CTE in 1/K, or undefined if not found
   */
  getMaterialCTE(material: string): number | undefined {
    const key = material.toLowerCase().replace(/[\s-]/g, "_");
    return MATERIAL_CTE_DATABASE[key]?.cte;
  }

  /**
   * List available materials in CTE database.
   */
  listMaterials(): Array<{ key: string; name: string; cte: number }> {
    return Object.entries(MATERIAL_CTE_DATABASE).map(([key, data]) => ({
      key,
      name: data.name,
      cte: data.cte,
    }));
  }

  /**
   * List available gage types in the uncertainty database.
   */
  listGages(): Array<{ key: string; description: string; uncertainty_mm: number }> {
    return Object.entries(GAGE_UNCERTAINTY_DATABASE).map(([key, data]) => ({
      key,
      description: data.description,
      uncertainty_mm: data.uncertainty_mm,
    }));
  }

  // --------------------------------------------------------------------------
  // Private Helpers
  // --------------------------------------------------------------------------

  /**
   * Welch-Satterthwaite effective degrees of freedom.
   * ν_eff = u_c⁴ / Σ(ci⁴ × ui⁴ / νi)
   */
  private _welchSatterthwaite(uc: number, sources: Array<{ ci: number; ui: number; dof: number }>): number {
    if (uc === 0) return Infinity;

    const uc4 = uc ** 4;
    let denominator = 0;
    for (const s of sources) {
      if (s.dof === Infinity) continue; // Type B with infinite DOF doesn't contribute
      const term = (s.ci * s.ui) ** 4 / s.dof;
      denominator += term;
    }

    if (denominator === 0) return Infinity;
    return uc4 / denominator;
  }

  /**
   * Look up CMM MPE specification from database.
   */
  private _lookupCMMMPE(manufacturer?: string): { a: number; b: number } {
    if (!manufacturer) return CMM_MPE_DATABASE.generic;
    const key = manufacturer.toLowerCase();
    return CMM_MPE_DATABASE[key] ?? CMM_MPE_DATABASE.generic;
  }

  /**
   * Get coverage factor k from effective DOF (using t-distribution at 95%).
   */
  private _coverageFactorFromDOF(dof: number, _confidenceLevel: number = 0.95): number {
    if (!isFinite(dof) || dof > 500) return 2.0; // Normal approximation

    const roundedDOF = Math.round(dof);
    if (roundedDOF < 1) return 2.0;

    // Direct lookup
    if (T_TABLE_95[roundedDOF]) return T_TABLE_95[roundedDOF];

    // Interpolate between nearest table entries
    const keys = Object.keys(T_TABLE_95).map(Number).sort((a, b) => a - b);
    let lower = keys[0];
    let upper = keys[keys.length - 1];

    for (let i = 0; i < keys.length - 1; i++) {
      if (keys[i] <= roundedDOF && keys[i + 1] >= roundedDOF) {
        lower = keys[i];
        upper = keys[i + 1];
        break;
      }
    }

    const tLower = T_TABLE_95[lower];
    const tUpper = T_TABLE_95[upper];
    const fraction = (roundedDOF - lower) / (upper - lower);
    return tLower + fraction * (tUpper - tLower);
  }

  /**
   * Standard normal cumulative distribution function (CDF).
   * Uses Abramowitz & Stegun rational approximation (error < 7.5e-8).
   */
  private _normalCDF(z: number): number {
    if (z < -8) return 0;
    if (z > 8) return 1;

    const sign = z < 0 ? -1 : 1;
    const x = Math.abs(z);

    // Abramowitz & Stegun 26.2.17
    const b1 = 0.319381530;
    const b2 = -0.356563782;
    const b3 = 1.781477937;
    const b4 = -1.821255978;
    const b5 = 1.330274429;
    const p = 0.2316419;

    const t = 1 / (1 + p * x);
    const pdf = Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
    const cdf = 1 - pdf * t * (b1 + t * (b2 + t * (b3 + t * (b4 + t * b5))));

    return sign === 1 ? cdf : 1 - cdf;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

/** Singleton instance */
export const metrologyUncertaintyEngine = new MetrologyUncertaintyEngine();
