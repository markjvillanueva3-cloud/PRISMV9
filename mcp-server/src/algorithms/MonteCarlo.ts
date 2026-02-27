/**
 * Monte Carlo Simulation — Uncertainty Quantification
 *
 * Statistical simulation for manufacturing process reliability analysis.
 * Supports normal, uniform, triangular, and lognormal input distributions.
 * Computes confidence intervals, failure probability, and sensitivity indices.
 *
 * References:
 * - Metropolis, N. & Ulam, S. (1949). "The Monte Carlo Method"
 * - Saltelli, A. (2002). "Sensitivity Analysis for Importance Assessment"
 *
 * @module algorithms/MonteCarlo
 */

import type {
  Algorithm, AlgorithmMeta, ValidationResult, ValidationIssue, WithWarnings,
} from "./types.js";

export type MCDistribution = "normal" | "uniform" | "triangular" | "lognormal";

export interface MCVariable {
  name: string;
  distribution: MCDistribution;
  /** Mean (normal/lognormal) or min (uniform/triangular). */
  param1: number;
  /** Std dev (normal/lognormal) or max (uniform/triangular). */
  param2: number;
  /** Mode for triangular distribution. */
  param3?: number;
}

export interface MonteCarloInput {
  /** Input variable distributions. */
  variables: MCVariable[];
  /** Number of simulation samples. Default 10000. */
  samples?: number;
  /** Failure threshold — probability of output exceeding this. */
  failure_threshold?: number;
  /** Confidence level for interval [0-1]. Default 0.95. */
  confidence_level?: number;
  /** Seed for reproducibility. */
  seed?: number;
}

export interface MonteCarloOutput extends WithWarnings {
  mean: number;
  std_dev: number;
  median: number;
  confidence_interval: [number, number];
  confidence_level: number;
  failure_probability: number;
  percentiles: { p5: number; p25: number; p50: number; p75: number; p95: number };
  sensitivity_indices: Record<string, number>;
  samples_run: number;
  calculation_method: string;
}

function mulberry32(seed: number) {
  let s = seed | 0;
  return () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}

export class MonteCarlo implements Algorithm<MonteCarloInput, MonteCarloOutput> {

  validate(input: MonteCarloInput): ValidationResult {
    const issues: ValidationIssue[] = [];
    if (!input.variables?.length) issues.push({ field: "variables", message: "At least 1 variable required", severity: "error" });
    input.variables?.forEach((v, i) => {
      if (!v.name) issues.push({ field: `variables[${i}].name`, message: "Name required", severity: "error" });
      if (v.distribution === "triangular" && v.param3 === undefined) {
        issues.push({ field: `variables[${i}].param3`, message: "Mode required for triangular", severity: "error" });
      }
      if (v.distribution === "normal" && v.param2 <= 0) {
        issues.push({ field: `variables[${i}].param2`, message: "Std dev must be > 0", severity: "error" });
      }
    });
    if ((input.samples ?? 10000) < 100) issues.push({ field: "samples", message: "At least 100 samples recommended", severity: "warning" });
    return { valid: issues.filter(i => i.severity === "error").length === 0, issues };
  }

  calculate(input: MonteCarloInput): MonteCarloOutput {
    const warnings: string[] = [];
    const { variables } = input;
    const nSamples = input.samples ?? 10000;
    const confLevel = input.confidence_level ?? 0.95;
    const threshold = input.failure_threshold ?? Infinity;
    const rand = mulberry32(input.seed ?? Date.now());

    // Box-Muller for normal random
    const randn = () => {
      const u1 = rand(), u2 = rand();
      return Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
    };

    const sample = (v: MCVariable): number => {
      switch (v.distribution) {
        case "normal": return v.param1 + v.param2 * randn();
        case "uniform": return v.param1 + rand() * (v.param2 - v.param1);
        case "triangular": {
          const u = rand();
          const { param1: a, param2: b, param3: c = (a + b) / 2 } = v;
          const fc = (c - a) / (b - a);
          return u < fc
            ? a + Math.sqrt(u * (b - a) * (c - a))
            : b - Math.sqrt((1 - u) * (b - a) * (b - c));
        }
        case "lognormal": return Math.exp(v.param1 + v.param2 * randn());
        default: return v.param1;
      }
    };

    // Default output function: product of all variables (e.g., MRR = speed × feed × depth)
    const outputFn = (vals: number[]) => vals.reduce((p, v) => p * v, 1);

    // Run simulation
    const results: number[] = [];
    const varSamples: number[][] = variables.map(() => []);

    for (let s = 0; s < nSamples; s++) {
      const vals = variables.map((v, i) => {
        const sv = sample(v);
        varSamples[i].push(sv);
        return sv;
      });
      results.push(outputFn(vals));
    }

    // Statistics
    results.sort((a, b) => a - b);
    const mean = results.reduce((s, v) => s + v, 0) / nSamples;
    const variance = results.reduce((s, v) => s + (v - mean) ** 2, 0) / (nSamples - 1);
    const std_dev = Math.sqrt(variance);
    const median = results[Math.floor(nSamples / 2)];

    const alphaHalf = (1 - confLevel) / 2;
    const ciLow = results[Math.floor(alphaHalf * nSamples)];
    const ciHigh = results[Math.floor((1 - alphaHalf) * nSamples)];

    const failCount = results.filter(v => v > threshold).length;
    const failure_probability = failCount / nSamples;

    const percentiles = {
      p5: results[Math.floor(0.05 * nSamples)],
      p25: results[Math.floor(0.25 * nSamples)],
      p50: median,
      p75: results[Math.floor(0.75 * nSamples)],
      p95: results[Math.floor(0.95 * nSamples)],
    };

    // First-order sensitivity indices (variance-based, Sobol)
    const sensitivity_indices: Record<string, number> = {};
    for (let i = 0; i < variables.length; i++) {
      const varMean = varSamples[i].reduce((s, v) => s + v, 0) / nSamples;
      const cov = varSamples[i].reduce((s, v, j) => s + (v - varMean) * (results[j] - mean), 0) / (nSamples - 1);
      const varVariance = varSamples[i].reduce((s, v) => s + (v - varMean) ** 2, 0) / (nSamples - 1);
      sensitivity_indices[variables[i].name] = variance > 0 ? Math.abs(cov * cov / (varVariance * variance)) : 0;
    }

    return {
      mean, std_dev, median,
      confidence_interval: [ciLow, ciHigh],
      confidence_level: confLevel,
      failure_probability,
      percentiles,
      sensitivity_indices,
      samples_run: nSamples,
      warnings,
      calculation_method: `Monte Carlo simulation (${nSamples} samples, ${confLevel * 100}% CI)`,
    };
  }

  getMetadata(): AlgorithmMeta {
    return {
      id: "monte-carlo",
      name: "Monte Carlo Simulation",
      description: "Uncertainty quantification via random sampling with sensitivity analysis",
      formula: "P(failure) = N(X > threshold) / N_total; CI = [X_{α/2}, X_{1-α/2}]",
      reference: "Metropolis & Ulam (1949); Saltelli (2002)",
      safety_class: "standard",
      domain: "optimization",
      inputs: { variables: "Input distributions", samples: "Number of iterations", failure_threshold: "Max acceptable value" },
      outputs: { mean: "Expected value", failure_probability: "P(exceed threshold)", sensitivity_indices: "Sobol first-order indices" },
    };
  }
}
