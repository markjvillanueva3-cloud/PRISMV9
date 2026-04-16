/**
 * UncertaintyPropagationEngine — Rigorous Uncertainty Analysis for PRISM
 * ======================================================================
 * Provides comprehensive uncertainty quantification and propagation:
 *   - Monte Carlo uncertainty propagation
 *   - Analytical (GUM-compliant) uncertainty propagation
 *   - Sensitivity analysis (Sobol indices)
 *   - Correlation handling
 *   - Confidence interval estimation
 *   - Distribution fitting
 *
 * This engine ensures PRISM's calculations include proper uncertainty
 * bounds, critical for safety-critical manufacturing decisions.
 *
 * References:
 *   - ISO/IEC Guide 98-3:2008 (GUM)
 *   - NIST TN 1297 (Guidelines for Evaluating and Expressing Uncertainty)
 *
 * @module engines/UncertaintyPropagationEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Probability distribution types */
export type DistributionType =
  | "normal"       // Gaussian
  | "uniform"      // Rectangular
  | "triangular"   // Triangular
  | "lognormal"    // Log-normal
  | "weibull"      // Weibull (tool life)
  | "student_t";   // Student's t (small samples)

/** Uncertain value with distribution */
export interface UncertainValue {
  value: number;               // Best estimate (mean)
  uncertainty: number;         // Standard uncertainty (1σ)
  distribution: DistributionType;
  unit?: string;
  source?: string;             // Where this value came from
  degrees_of_freedom?: number; // For Type A uncertainties
  coverage_factor?: number;    // k-factor (default 2 for 95%)
  correlation_id?: string;     // For correlated variables
}

/** Correlation between uncertain values */
export interface Correlation {
  var1_id: string;
  var2_id: string;
  coefficient: number;  // -1 to +1
  type: "measured" | "assumed" | "modeled";
}

/** Sensitivity coefficient */
export interface SensitivityCoefficient {
  variable: string;
  partial_derivative: number;  // ∂f/∂x
  relative_contribution: number;  // Percentage of total variance
  rank: number;
}

/** Uncertainty budget entry */
export interface UncertaintyBudgetEntry {
  source: string;
  type: "A" | "B";  // Type A (statistical) or Type B (other)
  value: number;
  standard_uncertainty: number;
  sensitivity_coefficient: number;
  contribution_to_variance: number;
  degrees_of_freedom: number;
  notes?: string;
}

/** Complete uncertainty budget */
export interface UncertaintyBudget {
  quantity: string;
  result_value: number;
  combined_uncertainty: number;
  expanded_uncertainty: number;
  coverage_factor: number;
  coverage_probability: number;
  effective_dof: number;  // Welch-Satterthwaite
  entries: UncertaintyBudgetEntry[];
  correlations: Correlation[];
  sensitivity_analysis: SensitivityCoefficient[];
}

/** Monte Carlo sample */
export interface MonteCarloSample {
  inputs: Record<string, number>;
  output: number;
}

/** Monte Carlo result */
export interface MonteCarloResult {
  mean: number;
  standard_deviation: number;
  confidence_interval_95: [number, number];
  confidence_interval_99: [number, number];
  percentiles: Record<number, number>;  // 1, 5, 10, 25, 50, 75, 90, 95, 99
  samples: MonteCarloSample[];
  sample_count: number;
  convergence_achieved: boolean;
  convergence_metric: number;
  distribution_fit?: {
    type: DistributionType;
    parameters: Record<string, number>;
    goodness_of_fit: number;
  };
}

/** Sobol sensitivity indices */
export interface SobolIndices {
  first_order: Record<string, number>;   // Main effects
  total_order: Record<string, number>;   // Including interactions
  second_order?: Record<string, number>; // Pairwise interactions
  convergence: number;
  sample_count: number;
}

/** Input specification for uncertainty propagation */
export interface UncertaintyInput {
  id: string;
  value: UncertainValue;
  bounds?: { min: number; max: number };
}

/** Function to propagate uncertainty through */
export type UncertainFunction = (inputs: Record<string, number>) => number;

// ============================================================================
// ENGINE
// ============================================================================

export class UncertaintyPropagationEngine {
  private static readonly DEFAULT_COVERAGE_FACTOR = 2.0;  // 95% for normal
  private static readonly DEFAULT_SAMPLES = 10000;
  private static readonly CONVERGENCE_THRESHOLD = 0.001;

  /**
   * Propagate uncertainty using GUM analytical method (Taylor series)
   * This is the ISO-standard approach for most engineering applications.
   */
  static propagateAnalytical(
    inputs: UncertaintyInput[],
    func: UncertainFunction,
    correlations: Correlation[] = []
  ): UncertaintyBudget {
    log.info("[UncertaintyPropagation] Starting analytical propagation", {
      input_count: inputs.length,
      correlation_count: correlations.length,
    });

    // Calculate nominal output
    const nominalInputs: Record<string, number> = {};
    for (const input of inputs) {
      nominalInputs[input.id] = input.value.value;
    }
    const resultValue = func(nominalInputs);

    // Calculate sensitivity coefficients (numerical differentiation)
    const sensitivities: SensitivityCoefficient[] = [];
    const h = 1e-8;  // Step size for numerical derivative

    for (const input of inputs) {
      const inputsPlus = { ...nominalInputs };
      const inputsMinus = { ...nominalInputs };
      inputsPlus[input.id] = input.value.value + h;
      inputsMinus[input.id] = input.value.value - h;

      const derivative = (func(inputsPlus) - func(inputsMinus)) / (2 * h);

      sensitivities.push({
        variable: input.id,
        partial_derivative: derivative,
        relative_contribution: 0,  // Calculated below
        rank: 0,
      });
    }

    // Build uncertainty budget entries
    const entries: UncertaintyBudgetEntry[] = [];
    let totalVariance = 0;

    for (let i = 0; i < inputs.length; i++) {
      const input = inputs[i];
      const sensitivity = sensitivities[i];
      const contribution = Math.pow(sensitivity.partial_derivative * input.value.uncertainty, 2);

      entries.push({
        source: input.id,
        type: input.value.degrees_of_freedom !== undefined ? "A" : "B",
        value: input.value.value,
        standard_uncertainty: input.value.uncertainty,
        sensitivity_coefficient: sensitivity.partial_derivative,
        contribution_to_variance: contribution,
        degrees_of_freedom: input.value.degrees_of_freedom || Infinity,
        notes: input.value.source,
      });

      totalVariance += contribution;
    }

    // Add correlation contributions
    for (const corr of correlations) {
      const input1 = inputs.find(i => i.id === corr.var1_id);
      const input2 = inputs.find(i => i.id === corr.var2_id);
      const sens1 = sensitivities.find(s => s.variable === corr.var1_id);
      const sens2 = sensitivities.find(s => s.variable === corr.var2_id);

      if (input1 && input2 && sens1 && sens2) {
        const correlationContribution =
          2 * corr.coefficient *
          sens1.partial_derivative * input1.value.uncertainty *
          sens2.partial_derivative * input2.value.uncertainty;
        totalVariance += correlationContribution;
      }
    }

    // Combined standard uncertainty
    const combinedUncertainty = Math.sqrt(Math.max(0, totalVariance));

    // Update relative contributions
    for (let i = 0; i < sensitivities.length; i++) {
      sensitivities[i].relative_contribution = totalVariance > 0
        ? entries[i].contribution_to_variance / totalVariance
        : 0;
    }

    // Rank by contribution
    sensitivities.sort((a, b) => b.relative_contribution - a.relative_contribution);
    sensitivities.forEach((s, i) => s.rank = i + 1);

    // Effective degrees of freedom (Welch-Satterthwaite)
    const effectiveDof = this.welchSatterthwaite(entries, combinedUncertainty);

    // Coverage factor based on effective DOF
    const coverageFactor = this.getCoverageFactor(effectiveDof, 0.95);

    // Expanded uncertainty
    const expandedUncertainty = coverageFactor * combinedUncertainty;

    const budget: UncertaintyBudget = {
      quantity: "Calculated result",
      result_value: resultValue,
      combined_uncertainty: combinedUncertainty,
      expanded_uncertainty: expandedUncertainty,
      coverage_factor: coverageFactor,
      coverage_probability: 0.95,
      effective_dof: effectiveDof,
      entries,
      correlations,
      sensitivity_analysis: sensitivities,
    };

    log.info("[UncertaintyPropagation] Analytical propagation complete", {
      result: resultValue,
      combined_u: combinedUncertainty,
      expanded_u: expandedUncertainty,
      effective_dof: effectiveDof,
    });

    return budget;
  }

  /**
   * Propagate uncertainty using Monte Carlo simulation
   * Better for non-linear functions and non-normal distributions.
   */
  static propagateMonteCarlo(
    inputs: UncertaintyInput[],
    func: UncertainFunction,
    sampleCount: number = this.DEFAULT_SAMPLES,
    correlations: Correlation[] = []
  ): MonteCarloResult {
    log.info("[UncertaintyPropagation] Starting Monte Carlo propagation", {
      input_count: inputs.length,
      sample_count: sampleCount,
    });

    const samples: MonteCarloSample[] = [];
    const outputs: number[] = [];

    // Generate correlated samples if needed
    const correlationMatrix = this.buildCorrelationMatrix(inputs, correlations);

    for (let i = 0; i < sampleCount; i++) {
      // Generate correlated random samples
      const sampleInputs = this.generateCorrelatedSamples(inputs, correlationMatrix);

      // Evaluate function
      const output = func(sampleInputs);

      // Handle NaN/Infinity
      if (isFinite(output)) {
        samples.push({ inputs: sampleInputs, output });
        outputs.push(output);
      }
    }

    // Calculate statistics
    const mean = this.calculateMean(outputs);
    const stdDev = this.calculateStdDev(outputs, mean);

    // Sort for percentiles
    const sorted = [...outputs].sort((a, b) => a - b);
    const percentiles: Record<number, number> = {
      1: sorted[Math.floor(outputs.length * 0.01)],
      5: sorted[Math.floor(outputs.length * 0.05)],
      10: sorted[Math.floor(outputs.length * 0.10)],
      25: sorted[Math.floor(outputs.length * 0.25)],
      50: sorted[Math.floor(outputs.length * 0.50)],
      75: sorted[Math.floor(outputs.length * 0.75)],
      90: sorted[Math.floor(outputs.length * 0.90)],
      95: sorted[Math.floor(outputs.length * 0.95)],
      99: sorted[Math.floor(outputs.length * 0.99)],
    };

    // 95% and 99% confidence intervals
    const ci95: [number, number] = [percentiles[2.5] || percentiles[5], percentiles[97.5] || percentiles[95]];
    const ci99: [number, number] = [percentiles[0.5] || percentiles[1], percentiles[99.5] || percentiles[99]];

    // Check convergence (compare first half to second half)
    const firstHalf = outputs.slice(0, Math.floor(outputs.length / 2));
    const secondHalf = outputs.slice(Math.floor(outputs.length / 2));
    const firstMean = this.calculateMean(firstHalf);
    const secondMean = this.calculateMean(secondHalf);
    const convergenceMetric = Math.abs(firstMean - secondMean) / mean;
    const convergenceAchieved = convergenceMetric < this.CONVERGENCE_THRESHOLD;

    // Fit distribution to output
    const distributionFit = this.fitDistribution(outputs);

    const result: MonteCarloResult = {
      mean,
      standard_deviation: stdDev,
      confidence_interval_95: ci95,
      confidence_interval_99: ci99,
      percentiles,
      samples: samples.slice(0, 100),  // Keep first 100 for debugging
      sample_count: samples.length,
      convergence_achieved: convergenceAchieved,
      convergence_metric: convergenceMetric,
      distribution_fit: distributionFit,
    };

    log.info("[UncertaintyPropagation] Monte Carlo complete", {
      mean,
      std_dev: stdDev,
      ci95,
      convergence: convergenceAchieved,
    });

    return result;
  }

  /**
   * Calculate Sobol sensitivity indices using Saltelli method
   */
  static calculateSobolIndices(
    inputs: UncertaintyInput[],
    func: UncertainFunction,
    sampleCount: number = 1024
  ): SobolIndices {
    log.info("[UncertaintyPropagation] Calculating Sobol indices", {
      input_count: inputs.length,
      sample_count: sampleCount,
    });

    const n = inputs.length;
    const firstOrder: Record<string, number> = {};
    const totalOrder: Record<string, number> = {};

    // Generate base matrices A and B
    const matrixA = this.generateSobolMatrix(inputs, sampleCount);
    const matrixB = this.generateSobolMatrix(inputs, sampleCount);

    // Evaluate f(A) and f(B)
    const fA: number[] = [];
    const fB: number[] = [];

    for (let i = 0; i < sampleCount; i++) {
      fA.push(func(matrixA[i]));
      fB.push(func(matrixB[i]));
    }

    const fMean = (this.calculateMean(fA) + this.calculateMean(fB)) / 2;
    const totalVariance = this.calculateVariance([...fA, ...fB]);

    // Calculate first-order and total-order indices for each input
    for (let j = 0; j < n; j++) {
      const inputId = inputs[j].id;

      // Create matrix AB_i (A with column i from B)
      const matrixABi: Record<string, number>[] = [];
      for (let i = 0; i < sampleCount; i++) {
        const row = { ...matrixA[i] };
        row[inputId] = matrixB[i][inputId];
        matrixABi.push(row);
      }

      // Evaluate f(AB_i)
      const fABi: number[] = [];
      for (let i = 0; i < sampleCount; i++) {
        fABi.push(func(matrixABi[i]));
      }

      // First-order index: Si = V[E[Y|Xi]] / V[Y]
      let firstOrderVar = 0;
      for (let i = 0; i < sampleCount; i++) {
        firstOrderVar += fB[i] * (fABi[i] - fA[i]);
      }
      firstOrderVar /= sampleCount;
      firstOrder[inputId] = totalVariance > 0 ? firstOrderVar / totalVariance : 0;

      // Total-order index: STi = 1 - V[E[Y|X~i]] / V[Y]
      let totalOrderVar = 0;
      for (let i = 0; i < sampleCount; i++) {
        totalOrderVar += Math.pow(fA[i] - fABi[i], 2);
      }
      totalOrderVar /= (2 * sampleCount);
      totalOrder[inputId] = totalVariance > 0 ? totalOrderVar / totalVariance : 0;
    }

    // Check convergence (sum of first-order should be ~1 if no interactions)
    const sumFirstOrder = Object.values(firstOrder).reduce((a, b) => a + b, 0);
    const convergence = Math.abs(sumFirstOrder - 1.0);

    const result: SobolIndices = {
      first_order: firstOrder,
      total_order: totalOrder,
      convergence,
      sample_count: sampleCount,
    };

    log.info("[UncertaintyPropagation] Sobol indices complete", {
      first_order: firstOrder,
      total_order: totalOrder,
      convergence,
    });

    return result;
  }

  /**
   * Create an uncertain value from measurement data (Type A)
   */
  static fromMeasurements(
    measurements: number[],
    unit?: string,
    source?: string
  ): UncertainValue {
    const n = measurements.length;
    if (n < 2) {
      throw new Error("Need at least 2 measurements for Type A uncertainty");
    }

    const mean = this.calculateMean(measurements);
    const stdDev = this.calculateStdDev(measurements, mean);
    const standardUncertainty = stdDev / Math.sqrt(n);  // Standard error of mean

    return {
      value: mean,
      uncertainty: standardUncertainty,
      distribution: n > 30 ? "normal" : "student_t",
      unit,
      source,
      degrees_of_freedom: n - 1,
    };
  }

  /**
   * Create an uncertain value from specification/manual (Type B)
   */
  static fromSpecification(
    value: number,
    tolerance: number,
    distribution: DistributionType = "uniform",
    unit?: string,
    source?: string
  ): UncertainValue {
    let uncertainty: number;

    switch (distribution) {
      case "uniform":
        // For uniform distribution, a = tolerance, u = a / sqrt(3)
        uncertainty = tolerance / Math.sqrt(3);
        break;
      case "triangular":
        // For triangular distribution, u = a / sqrt(6)
        uncertainty = tolerance / Math.sqrt(6);
        break;
      case "normal":
        // Assume tolerance is 2σ (95%)
        uncertainty = tolerance / 2;
        break;
      default:
        uncertainty = tolerance / 2;
    }

    return {
      value,
      uncertainty,
      distribution,
      unit,
      source,
      degrees_of_freedom: Infinity,  // Type B
    };
  }

  /**
   * Combine multiple uncertainty sources (RSS for independent)
   */
  static combineUncertainties(
    uncertainties: number[],
    correlations?: Array<{ i: number; j: number; r: number }>
  ): number {
    // Uncorrelated: RSS
    let variance = 0;
    for (const u of uncertainties) {
      variance += u * u;
    }

    // Add correlation terms
    if (correlations) {
      for (const corr of correlations) {
        variance += 2 * corr.r * uncertainties[corr.i] * uncertainties[corr.j];
      }
    }

    return Math.sqrt(Math.max(0, variance));
  }

  /**
   * Format uncertainty result for display
   */
  static formatResult(
    value: number,
    uncertainty: number,
    coverageFactor: number = 2.0,
    unit?: string
  ): string {
    const expanded = uncertainty * coverageFactor;

    // Determine significant figures based on uncertainty
    const uncertaintyMagnitude = Math.floor(Math.log10(Math.abs(expanded)));
    const precision = Math.max(0, -uncertaintyMagnitude + 1);

    const formattedValue = value.toFixed(precision);
    const formattedUncertainty = expanded.toFixed(precision);
    const unitStr = unit ? ` ${unit}` : "";

    return `${formattedValue} ± ${formattedUncertainty}${unitStr} (k=${coverageFactor})`;
  }

  /**
   * Validate uncertainty budget completeness
   */
  static validateBudget(budget: UncertaintyBudget): {
    valid: boolean;
    warnings: string[];
    errors: string[];
  } {
    const warnings: string[] = [];
    const errors: string[] = [];

    // Check all entries have positive uncertainty
    for (const entry of budget.entries) {
      if (entry.standard_uncertainty <= 0) {
        errors.push(`Entry ${entry.source} has non-positive uncertainty`);
      }
      if (entry.degrees_of_freedom <= 0) {
        errors.push(`Entry ${entry.source} has invalid degrees of freedom`);
      }
    }

    // Check combined uncertainty is positive
    if (budget.combined_uncertainty <= 0) {
      errors.push("Combined uncertainty is non-positive");
    }

    // Check coverage factor is reasonable
    if (budget.coverage_factor < 1 || budget.coverage_factor > 4) {
      warnings.push(`Unusual coverage factor: ${budget.coverage_factor}`);
    }

    // Check effective DOF
    if (budget.effective_dof < 1) {
      errors.push("Effective degrees of freedom too low");
    }

    // Check sensitivity contributions sum to ~1
    const totalContribution = budget.sensitivity_analysis.reduce(
      (sum, s) => sum + s.relative_contribution, 0
    );
    if (Math.abs(totalContribution - 1.0) > 0.1) {
      warnings.push(`Sensitivity contributions sum to ${totalContribution.toFixed(2)}, not 1.0`);
    }

    return {
      valid: errors.length === 0,
      warnings,
      errors,
    };
  }

  // ============================================================================
  // PRIVATE HELPERS
  // ============================================================================

  private static calculateMean(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  private static calculateStdDev(values: number[], mean?: number): number {
    if (values.length < 2) return 0;
    const m = mean ?? this.calculateMean(values);
    const variance = values.reduce((sum, v) => sum + Math.pow(v - m, 2), 0) / (values.length - 1);
    return Math.sqrt(variance);
  }

  private static calculateVariance(values: number[]): number {
    const mean = this.calculateMean(values);
    return values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
  }

  private static welchSatterthwaite(
    entries: UncertaintyBudgetEntry[],
    combinedUncertainty: number
  ): number {
    if (combinedUncertainty === 0) return Infinity;

    const uc4 = Math.pow(combinedUncertainty, 4);
    let denominator = 0;

    for (const entry of entries) {
      const ui4 = Math.pow(entry.contribution_to_variance, 2);
      const vi = entry.degrees_of_freedom;
      if (vi < Infinity) {
        denominator += ui4 / vi;
      }
    }

    if (denominator === 0) return Infinity;
    return Math.floor(uc4 / denominator);
  }

  private static getCoverageFactor(dof: number, probability: number): number {
    // Student's t values for common probabilities
    const tTable: Record<number, Record<number, number>> = {
      0.95: {
        1: 12.71, 2: 4.30, 3: 3.18, 4: 2.78, 5: 2.57,
        6: 2.45, 7: 2.36, 8: 2.31, 9: 2.26, 10: 2.23,
        15: 2.13, 20: 2.09, 30: 2.04, 50: 2.01, 100: 1.98,
        Infinity: 1.96,
      },
      0.99: {
        1: 63.66, 2: 9.92, 3: 5.84, 4: 4.60, 5: 4.03,
        6: 3.71, 7: 3.50, 8: 3.36, 9: 3.25, 10: 3.17,
        15: 2.95, 20: 2.85, 30: 2.75, 50: 2.68, 100: 2.63,
        Infinity: 2.58,
      },
    };

    const probTable = tTable[probability] || tTable[0.95];

    // Find closest DOF in table
    const dofs = Object.keys(probTable).map(k => k === "Infinity" ? Infinity : parseInt(k));
    let closestDof = dofs[0];
    for (const d of dofs) {
      if (d <= dof) closestDof = d;
    }

    return probTable[closestDof] || this.DEFAULT_COVERAGE_FACTOR;
  }

  private static buildCorrelationMatrix(
    inputs: UncertaintyInput[],
    correlations: Correlation[]
  ): number[][] {
    const n = inputs.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    // Diagonal = 1
    for (let i = 0; i < n; i++) {
      matrix[i][i] = 1;
    }

    // Fill in correlations
    for (const corr of correlations) {
      const i = inputs.findIndex(inp => inp.id === corr.var1_id);
      const j = inputs.findIndex(inp => inp.id === corr.var2_id);
      if (i >= 0 && j >= 0) {
        matrix[i][j] = corr.coefficient;
        matrix[j][i] = corr.coefficient;
      }
    }

    return matrix;
  }

  private static generateCorrelatedSamples(
    inputs: UncertaintyInput[],
    correlationMatrix: number[][]
  ): Record<string, number> {
    const n = inputs.length;
    const result: Record<string, number> = {};

    // Cholesky decomposition for correlated samples
    const L = this.choleskyDecomposition(correlationMatrix);

    // Generate independent standard normal samples
    const z: number[] = [];
    for (let i = 0; i < n; i++) {
      z.push(this.boxMullerNormal());
    }

    // Apply Cholesky factor to correlate
    const correlated: number[] = [];
    for (let i = 0; i < n; i++) {
      let sum = 0;
      for (let j = 0; j <= i; j++) {
        sum += L[i][j] * z[j];
      }
      correlated.push(sum);
    }

    // Transform to actual distributions
    for (let i = 0; i < n; i++) {
      const input = inputs[i];
      const u = this.normalCDF(correlated[i]);  // Uniform on [0,1]

      result[input.id] = this.inverseTransform(input.value, u);
    }

    return result;
  }

  private static choleskyDecomposition(matrix: number[][]): number[][] {
    const n = matrix.length;
    const L: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));

    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        if (i === j) {
          L[i][j] = Math.sqrt(Math.max(0, matrix[i][i] - sum));
        } else {
          L[i][j] = L[j][j] !== 0 ? (matrix[i][j] - sum) / L[j][j] : 0;
        }
      }
    }

    return L;
  }

  private static boxMullerNormal(): number {
    const u1 = Math.random();
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  private static normalCDF(x: number): number {
    // Approximation of standard normal CDF
    const a1 = 0.254829592;
    const a2 = -0.284496736;
    const a3 = 1.421413741;
    const a4 = -1.453152027;
    const a5 = 1.061405429;
    const p = 0.3275911;

    const sign = x < 0 ? -1 : 1;
    x = Math.abs(x) / Math.sqrt(2);
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);

    return 0.5 * (1.0 + sign * y);
  }

  private static inverseTransform(uv: UncertainValue, u: number): number {
    // Transform uniform [0,1] to target distribution
    switch (uv.distribution) {
      case "normal":
        // Inverse normal CDF (approximation)
        return uv.value + uv.uncertainty * this.inverseNormalCDF(u);

      case "uniform":
        const halfRange = uv.uncertainty * Math.sqrt(3);
        return uv.value - halfRange + 2 * halfRange * u;

      case "triangular":
        const a = uv.value - uv.uncertainty * Math.sqrt(6);
        const b = uv.value + uv.uncertainty * Math.sqrt(6);
        const c = uv.value;  // Mode at center
        if (u < (c - a) / (b - a)) {
          return a + Math.sqrt(u * (b - a) * (c - a));
        } else {
          return b - Math.sqrt((1 - u) * (b - a) * (b - c));
        }

      case "lognormal":
        const mu = Math.log(uv.value / Math.sqrt(1 + Math.pow(uv.uncertainty / uv.value, 2)));
        const sigma = Math.sqrt(Math.log(1 + Math.pow(uv.uncertainty / uv.value, 2)));
        return Math.exp(mu + sigma * this.inverseNormalCDF(u));

      case "weibull":
        // Assume shape k=2 (common for tool life)
        const k = 2;
        const lambda = uv.value / 0.886;  // Mean = lambda * Gamma(1 + 1/k)
        return lambda * Math.pow(-Math.log(1 - u), 1 / k);

      default:
        return uv.value + uv.uncertainty * this.inverseNormalCDF(u);
    }
  }

  private static inverseNormalCDF(p: number): number {
    // Rational approximation (Abramowitz and Stegun)
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;

    const a = [
      -3.969683028665376e+01, 2.209460984245205e+02,
      -2.759285104469687e+02, 1.383577518672690e+02,
      -3.066479806614716e+01, 2.506628277459239e+00
    ];
    const b = [
      -5.447609879822406e+01, 1.615858368580409e+02,
      -1.556989798598866e+02, 6.680131188771972e+01, -1.328068155288572e+01
    ];
    const c = [
      -7.784894002430293e-03, -3.223964580411365e-01,
      -2.400758277161838e+00, -2.549732539343734e+00,
      4.374664141464968e+00, 2.938163982698783e+00
    ];
    const d = [
      7.784695709041462e-03, 3.224671290700398e-01,
      2.445134137142996e+00, 3.754408661907416e+00
    ];

    const pLow = 0.02425;
    const pHigh = 1 - pLow;

    let q: number, r: number;

    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q /
        (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    }
  }

  private static generateSobolMatrix(
    inputs: UncertaintyInput[],
    sampleCount: number
  ): Record<string, number>[] {
    const matrix: Record<string, number>[] = [];

    for (let i = 0; i < sampleCount; i++) {
      const row: Record<string, number> = {};
      for (const input of inputs) {
        const u = Math.random();
        row[input.id] = this.inverseTransform(input.value, u);
      }
      matrix.push(row);
    }

    return matrix;
  }

  private static fitDistribution(values: number[]): {
    type: DistributionType;
    parameters: Record<string, number>;
    goodness_of_fit: number;
  } | undefined {
    if (values.length < 30) return undefined;

    const mean = this.calculateMean(values);
    const stdDev = this.calculateStdDev(values, mean);
    const skewness = this.calculateSkewness(values, mean, stdDev);
    const kurtosis = this.calculateKurtosis(values, mean, stdDev);

    // Check for normal (skewness ~0, kurtosis ~3)
    if (Math.abs(skewness) < 0.5 && Math.abs(kurtosis - 3) < 1) {
      return {
        type: "normal",
        parameters: { mean, std_dev: stdDev },
        goodness_of_fit: 1 - (Math.abs(skewness) + Math.abs(kurtosis - 3)) / 4,
      };
    }

    // Check for lognormal (positive skewness)
    if (skewness > 0.5 && values.every(v => v > 0)) {
      const logValues = values.map(v => Math.log(v));
      const logMean = this.calculateMean(logValues);
      const logStd = this.calculateStdDev(logValues, logMean);
      return {
        type: "lognormal",
        parameters: { mu: logMean, sigma: logStd },
        goodness_of_fit: 0.8,
      };
    }

    // Default to normal
    return {
      type: "normal",
      parameters: { mean, std_dev: stdDev },
      goodness_of_fit: 0.7,
    };
  }

  private static calculateSkewness(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 0;
    const n = values.length;
    const m3 = values.reduce((sum, v) => sum + Math.pow(v - mean, 3), 0) / n;
    return m3 / Math.pow(stdDev, 3);
  }

  private static calculateKurtosis(values: number[], mean: number, stdDev: number): number {
    if (stdDev === 0) return 3;
    const n = values.length;
    const m4 = values.reduce((sum, v) => sum + Math.pow(v - mean, 4), 0) / n;
    return m4 / Math.pow(stdDev, 4);
  }
}

// Export singleton
export const uncertaintyPropagationEngine = new UncertaintyPropagationEngine();
