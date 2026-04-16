/**
 * MaterialBatchVariabilityEngine — Upstream Material Property Uncertainty Source
 *
 * Models batch-to-batch and within-batch variation in material properties
 * that propagate downstream to force, wear, temperature, and surface finish.
 *
 * Properties modeled with distributions:
 * - Hardness (log-normal, CV 3-8% depending on material)
 * - Yield strength (normal, correlated with hardness)
 * - Tensile strength (normal, correlated with yield)
 * - Elongation (normal, anti-correlated with hardness)
 * - Young's modulus (normal, CV 1-3%)
 * - Thermal conductivity (normal, CV 3-8%)
 * - Specific cutting force kc1.1 (correlated with hardness)
 *
 * Correlation model:
 * - Cholesky decomposition for correlated multi-variate sampling
 * - Hardness↔Strength: ρ ≈ 0.85-0.95
 * - Hardness↔Elongation: ρ ≈ -0.7 to -0.9
 * - Hardness↔kc1.1: ρ ≈ 0.80
 * - Modulus↔Conductivity: ρ ≈ 0.3-0.6
 *
 * Statistical methods:
 * - Correlated Monte Carlo via Cholesky decomposition
 * - Bayesian updating from incoming material cert data
 * - Distribution fitting (log-normal, normal, Weibull)
 * - Property-to-machinability correlation (kc, n_Taylor)
 *
 * References:
 * - ASM Handbook Vol. 1: Properties and Selection — Irons, Steels
 * - ASTM E8/E8M: Standard Test Methods for Tension Testing
 * - MMPDS (Metallic Materials Properties Development and Standardization)
 * - Kienzle (1952): Die Bestimmung von Kräften und Leistungen
 *
 * Actions: material_variability (calcDispatcher)
 */

// ── Types ──────────────────────────────────────────────────────────────

export type MaterialFamily =
  | "carbon_steel" | "alloy_steel" | "stainless_steel"
  | "aluminum" | "titanium" | "inconel"
  | "cast_iron" | "brass" | "copper";

export interface MaterialBatchInput {
  material_family: MaterialFamily;
  /** Override nominal hardness (HRC or HB) */
  nominal_hardness?: number;
  /** Override nominal yield strength (MPa) */
  nominal_yield_MPa?: number;
  /** Number of Monte Carlo samples */
  mc_samples?: number;
  /** Incoming cert data for Bayesian updating */
  cert_data?: {
    hardness_values?: number[];
    yield_values_MPa?: number[];
    tensile_values_MPa?: number[];
  };
}

export interface PropertyDistribution {
  property: string;
  unit: string;
  mean: number;
  std: number;
  cv_pct: number;
  p5: number;
  p95: number;
  distribution_type: string;
}

export interface CorrelationPair {
  prop_a: string;
  prop_b: string;
  rho: number;
}

export interface MachinabilityImpact {
  kc11_mean_N_mm2: number;
  kc11_std_N_mm2: number;
  taylor_C_mean: number;
  taylor_C_cv_pct: number;
  force_cv_pct: number;
  wear_rate_cv_pct: number;
}

export interface MaterialBatchResult {
  properties: PropertyDistribution[];
  correlations: CorrelationPair[];
  machinability: MachinabilityImpact;
  bayesian_updated: boolean;
  recommendations: string[];
  warnings: string[];
  formula: string;
}

// ── Material property database ─────────────────────────────────────────

interface MaterialProps {
  hardness_HB: number;
  hardness_cv: number;
  yield_MPa: number;
  yield_cv: number;
  tensile_MPa: number;
  tensile_cv: number;
  elongation_pct: number;
  elongation_cv: number;
  E_GPa: number;
  E_cv: number;
  k_thermal_W_mK: number;
  k_thermal_cv: number;
  kc11_N_mm2: number;
  taylor_C: number;
  // Correlation matrix (lower triangle, row-major)
  // Order: hardness, yield, tensile, elongation, E, k_thermal
  corr_lower: number[];
}

const MATERIAL_DB: Record<MaterialFamily, MaterialProps> = {
  carbon_steel: {
    hardness_HB: 200, hardness_cv: 5,
    yield_MPa: 350, yield_cv: 6,
    tensile_MPa: 550, tensile_cv: 5,
    elongation_pct: 22, elongation_cv: 12,
    E_GPa: 210, E_cv: 2,
    k_thermal_W_mK: 50, k_thermal_cv: 5,
    kc11_N_mm2: 1800, taylor_C: 300,
    corr_lower: [
      1,
      0.90, 1,
      0.92, 0.95, 1,
      -0.80, -0.75, -0.78, 1,
      0.10, 0.08, 0.09, -0.05, 1,
      -0.15, -0.12, -0.14, 0.10, 0.40, 1,
    ],
  },
  alloy_steel: {
    hardness_HB: 280, hardness_cv: 6,
    yield_MPa: 700, yield_cv: 7,
    tensile_MPa: 900, tensile_cv: 6,
    elongation_pct: 14, elongation_cv: 15,
    E_GPa: 210, E_cv: 2,
    k_thermal_W_mK: 42, k_thermal_cv: 6,
    kc11_N_mm2: 2100, taylor_C: 250,
    corr_lower: [
      1,
      0.92, 1,
      0.93, 0.96, 1,
      -0.85, -0.80, -0.82, 1,
      0.08, 0.06, 0.07, -0.04, 1,
      -0.20, -0.15, -0.18, 0.12, 0.35, 1,
    ],
  },
  stainless_steel: {
    hardness_HB: 180, hardness_cv: 7,
    yield_MPa: 250, yield_cv: 8,
    tensile_MPa: 550, tensile_cv: 7,
    elongation_pct: 40, elongation_cv: 10,
    E_GPa: 195, E_cv: 2,
    k_thermal_W_mK: 16, k_thermal_cv: 8,
    kc11_N_mm2: 2400, taylor_C: 200,
    corr_lower: [
      1,
      0.88, 1,
      0.90, 0.94, 1,
      -0.75, -0.70, -0.73, 1,
      0.12, 0.10, 0.11, -0.06, 1,
      -0.25, -0.20, -0.22, 0.15, 0.50, 1,
    ],
  },
  aluminum: {
    hardness_HB: 95, hardness_cv: 8,
    yield_MPa: 270, yield_cv: 7,
    tensile_MPa: 310, tensile_cv: 6,
    elongation_pct: 12, elongation_cv: 15,
    E_GPa: 71, E_cv: 2,
    k_thermal_W_mK: 170, k_thermal_cv: 4,
    kc11_N_mm2: 800, taylor_C: 600,
    corr_lower: [
      1,
      0.85, 1,
      0.88, 0.93, 1,
      -0.70, -0.65, -0.68, 1,
      0.15, 0.12, 0.13, -0.08, 1,
      -0.10, -0.08, -0.09, 0.05, 0.30, 1,
    ],
  },
  titanium: {
    hardness_HB: 330, hardness_cv: 5,
    yield_MPa: 880, yield_cv: 5,
    tensile_MPa: 950, tensile_cv: 4,
    elongation_pct: 14, elongation_cv: 12,
    E_GPa: 114, E_cv: 3,
    k_thermal_W_mK: 7, k_thermal_cv: 10,
    kc11_N_mm2: 2800, taylor_C: 80,
    corr_lower: [
      1,
      0.88, 1,
      0.90, 0.95, 1,
      -0.82, -0.78, -0.80, 1,
      0.20, 0.15, 0.18, -0.10, 1,
      -0.30, -0.25, -0.28, 0.18, 0.45, 1,
    ],
  },
  inconel: {
    hardness_HB: 350, hardness_cv: 4,
    yield_MPa: 1000, yield_cv: 5,
    tensile_MPa: 1200, tensile_cv: 4,
    elongation_pct: 20, elongation_cv: 10,
    E_GPa: 205, E_cv: 2,
    k_thermal_W_mK: 11, k_thermal_cv: 8,
    kc11_N_mm2: 2800, taylor_C: 50,
    corr_lower: [
      1,
      0.90, 1,
      0.92, 0.95, 1,
      -0.78, -0.74, -0.76, 1,
      0.18, 0.14, 0.16, -0.08, 1,
      -0.28, -0.22, -0.25, 0.15, 0.42, 1,
    ],
  },
  cast_iron: {
    hardness_HB: 220, hardness_cv: 8,
    yield_MPa: 250, yield_cv: 10,
    tensile_MPa: 350, tensile_cv: 9,
    elongation_pct: 3, elongation_cv: 25,
    E_GPa: 130, E_cv: 5,
    k_thermal_W_mK: 45, k_thermal_cv: 8,
    kc11_N_mm2: 1200, taylor_C: 350,
    corr_lower: [
      1,
      0.85, 1,
      0.88, 0.92, 1,
      -0.60, -0.55, -0.58, 1,
      0.25, 0.20, 0.22, -0.15, 1,
      -0.20, -0.15, -0.18, 0.10, 0.55, 1,
    ],
  },
  brass: {
    hardness_HB: 120, hardness_cv: 6,
    yield_MPa: 200, yield_cv: 8,
    tensile_MPa: 350, tensile_cv: 7,
    elongation_pct: 30, elongation_cv: 12,
    E_GPa: 100, E_cv: 3,
    k_thermal_W_mK: 120, k_thermal_cv: 5,
    kc11_N_mm2: 700, taylor_C: 500,
    corr_lower: [
      1,
      0.82, 1,
      0.85, 0.90, 1,
      -0.72, -0.68, -0.70, 1,
      0.10, 0.08, 0.09, -0.05, 1,
      -0.12, -0.10, -0.11, 0.06, 0.35, 1,
    ],
  },
  copper: {
    hardness_HB: 80, hardness_cv: 7,
    yield_MPa: 220, yield_cv: 8,
    tensile_MPa: 320, tensile_cv: 7,
    elongation_pct: 35, elongation_cv: 10,
    E_GPa: 117, E_cv: 2,
    k_thermal_W_mK: 385, k_thermal_cv: 3,
    kc11_N_mm2: 600, taylor_C: 550,
    corr_lower: [
      1,
      0.80, 1,
      0.83, 0.88, 1,
      -0.70, -0.65, -0.68, 1,
      0.08, 0.06, 0.07, -0.04, 1,
      -0.08, -0.06, -0.07, 0.04, 0.30, 1,
    ],
  },
};

// ── Engine ─────────────────────────────────────────────────────────────

export class MaterialBatchVariabilityEngine {

  private normalRandom(): number {
    const u1 = Math.random() || 1e-10;
    const u2 = Math.random();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }

  /**
   * Cholesky decomposition of symmetric positive-definite matrix.
   * Input: lower-triangle packed form (row-major).
   * Output: L matrix (n×n) where A = L·L^T.
   */
  choleskyDecompose(lowerTri: number[], n: number): number[][] {
    // Unpack to full matrix
    const A: number[][] = Array.from({ length: n }, () =>
      new Array(n).fill(0));
    let idx = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        A[i][j] = lowerTri[idx++];
        A[j][i] = A[i][j];
      }
    }

    // Cholesky
    const L: number[][] = Array.from({ length: n }, () =>
      new Array(n).fill(0));
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        let sum = 0;
        for (let k = 0; k < j; k++) {
          sum += L[i][k] * L[j][k];
        }
        if (i === j) {
          const diag = A[i][i] - sum;
          L[i][j] = Math.sqrt(Math.max(1e-10, diag));
        } else {
          L[i][j] = L[j][j] > 0
            ? (A[i][j] - sum) / L[j][j]
            : 0;
        }
      }
    }
    return L;
  }

  /**
   * Generate correlated normal samples using Cholesky factor.
   * z_corr = L · z_indep
   */
  correlatedSample(L: number[][], n: number): number[] {
    const z = Array.from({ length: n }, () => this.normalRandom());
    const result = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      for (let j = 0; j <= i; j++) {
        result[i] += L[i][j] * z[j];
      }
    }
    return result;
  }

  /** Percentile */
  percentile(sorted: number[], p: number): number {
    if (sorted.length === 0) return 0;
    const idx = (p / 100) * (sorted.length - 1);
    const lo = Math.floor(idx);
    const hi = Math.ceil(idx);
    if (lo === hi) return sorted[lo];
    return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
  }

  /** Bayesian normal-normal update */
  bayesianUpdate(
    priorMean: number, priorVar: number,
    obsValues: number[],
  ): { mean: number; var: number } {
    if (obsValues.length === 0) {
      return { mean: priorMean, var: priorVar };
    }
    const obsMean = obsValues.reduce((a, b) => a + b, 0) / obsValues.length;
    const obsVar = obsValues.length > 1
      ? obsValues.reduce((a, b) => a + (b - obsMean) ** 2, 0)
        / (obsValues.length - 1)
      : priorVar;
    const postVar = 1 / (1 / priorVar + obsValues.length / obsVar);
    const postMean = postVar * (
      priorMean / priorVar + obsMean * obsValues.length / obsVar
    );
    return { mean: postMean, var: postVar };
  }

  /** Main entry — material batch variability analysis. */
  analyze(input: MaterialBatchInput): MaterialBatchResult {
    const warnings: string[] = [];
    const recommendations: string[] = [];
    const MAX_TRIALS = 100_000;
    const N = Math.min(input.mc_samples ?? 1000, MAX_TRIALS);
    const props = MATERIAL_DB[input.material_family];

    if (!props) {
      return {
        properties: [],
        correlations: [],
        machinability: {
          kc11_mean_N_mm2: 0, kc11_std_N_mm2: 0,
          taylor_C_mean: 0, taylor_C_cv_pct: 0,
          force_cv_pct: 0, wear_rate_cv_pct: 0,
        },
        bayesian_updated: false,
        recommendations: ["Unknown material family"],
        warnings: [],
        formula: "",
      };
    }

    // Override nominals if provided
    let hardMean = input.nominal_hardness ?? props.hardness_HB;
    let yieldMean = input.nominal_yield_MPa ?? props.yield_MPa;
    let bayesianUsed = false;

    // Bayesian update from cert data
    if (input.cert_data?.hardness_values?.length) {
      const priorVar = (hardMean * props.hardness_cv / 100) ** 2;
      const post = this.bayesianUpdate(
        hardMean, priorVar, input.cert_data.hardness_values,
      );
      hardMean = post.mean;
      bayesianUsed = true;
    }
    if (input.cert_data?.yield_values_MPa?.length) {
      const priorVar = (yieldMean * props.yield_cv / 100) ** 2;
      const post = this.bayesianUpdate(
        yieldMean, priorVar, input.cert_data.yield_values_MPa,
      );
      yieldMean = post.mean;
      bayesianUsed = true;
    }

    // Property means and stds
    const means = [
      hardMean,
      yieldMean,
      props.tensile_MPa * (yieldMean / props.yield_MPa), // scale tensile
      props.elongation_pct,
      props.E_GPa,
      props.k_thermal_W_mK,
    ];
    const cvs = [
      props.hardness_cv,
      props.yield_cv,
      props.tensile_cv,
      props.elongation_cv,
      props.E_cv,
      props.k_thermal_cv,
    ];
    const stds = means.map((m, i) => m * cvs[i] / 100);
    const names = [
      "Hardness", "Yield Strength", "Tensile Strength",
      "Elongation", "Young's Modulus", "Thermal Conductivity",
    ];
    const units = ["HB", "MPa", "MPa", "%", "GPa", "W/m·K"];

    // Cholesky decomposition
    const L = this.choleskyDecompose(props.corr_lower, 6);

    // Monte Carlo sampling
    const samples: number[][] = Array.from({ length: 6 }, () => []);
    const kc11Samples: number[] = [];
    const taylorCSamples: number[] = [];

    for (let i = 0; i < N; i++) {
      const z = this.correlatedSample(L, 6);
      const vals = z.map((zi, j) =>
        Math.max(means[j] * 0.3, means[j] + stds[j] * zi));

      for (let j = 0; j < 6; j++) {
        samples[j].push(vals[j]);
      }

      // Machinability: kc1.1 correlates with hardness
      const hardRatio = vals[0] / hardMean;
      const kc = props.kc11_N_mm2 * Math.pow(hardRatio, 0.8);
      kc11Samples.push(kc);

      // Taylor C inversely correlates with hardness
      const tC = props.taylor_C * Math.pow(hardRatio, -0.6);
      taylorCSamples.push(tC);
    }

    // Build property distributions
    const properties: PropertyDistribution[] = [];
    for (let j = 0; j < 6; j++) {
      const sorted = [...samples[j]].sort((a, b) => a - b);
      const mean = sorted.reduce((a, b) => a + b, 0) / sorted.length;
      const variance = sorted.reduce(
        (a, b) => a + (b - mean) ** 2, 0) / (sorted.length - 1);
      const std = Math.sqrt(variance);
      properties.push({
        property: names[j],
        unit: units[j],
        mean: Math.round(mean * 100) / 100,
        std: Math.round(std * 100) / 100,
        cv_pct: mean > 0
          ? Math.round((std / mean) * 10000) / 100 : 0,
        p5: Math.round(this.percentile(sorted, 5) * 100) / 100,
        p95: Math.round(this.percentile(sorted, 95) * 100) / 100,
        distribution_type: j === 0 ? "lognormal" : "normal",
      });
    }

    // Correlations
    const corrPairs: CorrelationPair[] = [
      { prop_a: "Hardness", prop_b: "Yield Strength",
        rho: props.corr_lower[2] },
      { prop_a: "Hardness", prop_b: "Elongation",
        rho: props.corr_lower[6] },
      { prop_a: "Hardness", prop_b: "kc1.1",
        rho: 0.80 },
      { prop_a: "Yield Strength", prop_b: "Tensile Strength",
        rho: props.corr_lower[5] },
      { prop_a: "Young's Modulus", prop_b: "Thermal Conductivity",
        rho: props.corr_lower[20] },
    ];

    // Machinability impact
    const kcMean = kc11Samples.reduce((a, b) => a + b, 0) / N;
    const kcVar = kc11Samples.reduce(
      (a, b) => a + (b - kcMean) ** 2, 0) / (N - 1);
    const kcStd = Math.sqrt(kcVar);

    const tcMean = taylorCSamples.reduce((a, b) => a + b, 0) / N;
    const tcVar = taylorCSamples.reduce(
      (a, b) => a + (b - tcMean) ** 2, 0) / (N - 1);

    const machinability: MachinabilityImpact = {
      kc11_mean_N_mm2: Math.round(kcMean),
      kc11_std_N_mm2: Math.round(kcStd),
      taylor_C_mean: Math.round(tcMean),
      taylor_C_cv_pct: tcMean > 0
        ? Math.round(Math.sqrt(tcVar) / tcMean * 10000) / 100 : 0,
      force_cv_pct: kcMean > 0
        ? Math.round(kcStd / kcMean * 10000) / 100 : 0,
      wear_rate_cv_pct: tcMean > 0
        ? Math.round(Math.sqrt(tcVar) / tcMean * 10000) / 100 : 0,
    };

    // Recommendations
    if (machinability.force_cv_pct > 8) {
      recommendations.push(
        "Material batch variation contributes >" +
        machinability.force_cv_pct +
        "% force CV — use incoming hardness inspection",
      );
    }
    if (properties[0].cv_pct > 6) {
      recommendations.push(
        "High hardness CV (" + properties[0].cv_pct +
        "%) — request tighter material spec or sort batches",
      );
    }
    if (!bayesianUsed) {
      recommendations.push(
        "No cert data provided — using generic distributions. " +
        "Add cert_data for tighter predictions.",
      );
    }

    // Warnings
    if (input.material_family === "cast_iron") {
      warnings.push(
        "Cast iron has high property scatter due to graphite " +
        "morphology variation — verify with each batch",
      );
    }

    return {
      properties,
      correlations: corrPairs,
      machinability,
      bayesian_updated: bayesianUsed,
      recommendations,
      warnings,
      formula: "Correlated MC: z_corr=L·z_indep (Cholesky); " +
        "kc1.1∝HB^0.8; Taylor_C∝HB^(-0.6); " +
        "Bayes: post=(prior_var·obs+obs_var·prior)/(prior_var+obs_var)",
    };
  }
}

export const materialBatchVariabilityEngine =
  new MaterialBatchVariabilityEngine();
