/**
 * PermutationTestEngine — Distribution-Free Hypothesis Testing via Resampling
 *
 * Non-parametric statistical tests using permutation/randomization methods:
 *   - Two-sample permutation test (mean/median/KS)
 *   - Paired permutation test (sign-flip)
 *   - Correlation permutation test (Pearson/Spearman)
 *   - ANOVA permutation test (F-ratio)
 *   - Bootstrap confidence intervals (percentile/BCa/basic)
 *   - Manufacturing process comparison
 *
 * @module engines/PermutationTestEngine
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

export interface TwoSampleTestInput {
  sample_a: number[];
  sample_b: number[];
  statistic?: "mean_diff" | "median_diff" | "ks";
  alternative?: "two_sided" | "greater" | "less";
  n_permutations?: number;
  seed?: number;
}

export interface TwoSampleTestResult {
  observed_statistic: number;
  p_value: number;
  null_distribution: {
    mean: number;
    std: number;
    percentiles: Record<string, number>;
  };
  significant_at_005: boolean;
  significant_at_001: boolean;
  power_estimate?: number;
  effect_size: number;
  n_permutations_actual: number;
}

export interface PairedTestInput {
  before: number[];
  after: number[];
  statistic?: "mean_diff" | "median_diff";
  n_permutations?: number;
  alternative?: "two_sided" | "greater" | "less";
  seed?: number;
}

export interface PairedTestResult extends TwoSampleTestResult {
  mean_difference: number;
  ci_95: [number, number];
}

export interface CorrelationTestInput {
  x: number[];
  y: number[];
  method?: "pearson" | "spearman";
  n_permutations?: number;
  alternative?: "two_sided" | "greater" | "less";
  seed?: number;
}

export interface CorrelationTestResult {
  observed_correlation: number;
  p_value: number;
  null_distribution: {
    mean: number;
    std: number;
    percentiles: Record<string, number>;
  };
  significant: boolean;
  ci_95_bootstrap: [number, number];
}

export interface AnovaPermutationInput {
  groups: number[][];
  n_permutations?: number;
  seed?: number;
}

export interface PairwiseComparison {
  group_i: number;
  group_j: number;
  p_value: number;
}

export interface AnovaPermutationResult {
  observed_f: number;
  p_value: number;
  null_distribution: {
    mean: number;
    std: number;
    percentiles: Record<string, number>;
  };
  pairwise_comparisons: PairwiseComparison[];
}

export interface BootstrapCIInput {
  data: number[];
  statistic?: "mean" | "median" | "std" | "trimmed_mean";
  n_bootstrap?: number;
  method?: "percentile" | "bca" | "basic";
  confidence?: number;
  seed?: number;
}

export interface BootstrapCIResult {
  point_estimate: number;
  ci: [number, number];
  method_used: string;
  se_bootstrap: number;
  bias: number;
  bias_corrected_estimate: number;
}

export interface ManufacturingComparisonInput {
  process_a: number[];
  process_b: number[];
  metric?: "mean" | "variance" | "cpk";
  test_type?: "independent" | "paired";
  seed?: number;
}

export interface ManufacturingComparisonResult {
  better_process: "a" | "b" | "no_difference";
  p_value: number;
  effect_size: number;
  practical_significance: boolean;
  recommendation: string;
}

// ============================================================================
// SEEDED PRNG (Mulberry32)
// ============================================================================

function mulberry32(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function mean(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0) / arr.length;
}

function median(arr: number[]): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0
    ? (sorted[mid - 1] + sorted[mid]) / 2
    : sorted[mid];
}

function std(arr: number[], ddof = 1): number {
  const m = mean(arr);
  const ss = arr.reduce((s, v) => s + (v - m) ** 2, 0);
  return Math.sqrt(ss / (arr.length - ddof));
}

function trimmedMean(arr: number[], proportion = 0.1): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const trim = Math.floor(sorted.length * proportion);
  const trimmed = sorted.slice(trim, sorted.length - trim);
  return mean(trimmed);
}

function percentile(arr: number[], p: number): number {
  const sorted = [...arr].sort((a, b) => a - b);
  const idx = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

function computePercentiles(arr: number[]): Record<string, number> {
  return {
    "2.5": percentile(arr, 2.5),
    "5": percentile(arr, 5),
    "25": percentile(arr, 25),
    "50": percentile(arr, 50),
    "75": percentile(arr, 75),
    "95": percentile(arr, 95),
    "97.5": percentile(arr, 97.5),
  };
}

function shuffle(arr: number[], rng: () => number): number[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

function ksStatistic(a: number[], b: number[]): number {
  const allVals = [...a, ...b].sort((x, y) => x - y);
  let maxD = 0;
  for (const v of allVals) {
    const ecdfA = a.filter((x) => x <= v).length / a.length;
    const ecdfB = b.filter((x) => x <= v).length / b.length;
    maxD = Math.max(maxD, Math.abs(ecdfA - ecdfB));
  }
  return maxD;
}

function pearsonCorrelation(x: number[], y: number[]): number {
  const n = x.length;
  const mx = mean(x);
  const my = mean(y);
  let num = 0, dx = 0, dy = 0;
  for (let i = 0; i < n; i++) {
    const xi = x[i] - mx;
    const yi = y[i] - my;
    num += xi * yi;
    dx += xi * xi;
    dy += yi * yi;
  }
  const denom = Math.sqrt(dx * dy);
  return denom === 0 ? 0 : num / denom;
}

function spearmanCorrelation(x: number[], y: number[]): number {
  const rank = (arr: number[]): number[] => {
    const indexed = arr.map((v, i) => ({ v, i }));
    indexed.sort((a, b) => a.v - b.v);
    const ranks = new Array(arr.length);
    let i = 0;
    while (i < indexed.length) {
      let j = i;
      while (j < indexed.length && indexed[j].v === indexed[i].v) j++;
      const avgRank = (i + j - 1) / 2 + 1;
      for (let k = i; k < j; k++) ranks[indexed[k].i] = avgRank;
      i = j;
    }
    return ranks;
  };
  return pearsonCorrelation(rank(x), rank(y));
}

function cohensD(a: number[], b: number[]): number {
  const ma = mean(a);
  const mb = mean(b);
  const na = a.length;
  const nb = b.length;
  const sa = std(a);
  const sb = std(b);
  const pooled = Math.sqrt(((na - 1) * sa * sa + (nb - 1) * sb * sb) / (na + nb - 2));
  return pooled === 0 ? 0 : (ma - mb) / pooled;
}

function computePValue(
  observed: number,
  distribution: number[],
  alternative: "two_sided" | "greater" | "less"
): number {
  const n = distribution.length;
  if (n === 0) return 1;
  switch (alternative) {
    case "greater":
      return distribution.filter((v) => v >= observed).length / n;
    case "less":
      return distribution.filter((v) => v <= observed).length / n;
    case "two_sided":
    default: {
      const absObs = Math.abs(observed);
      return distribution.filter((v) => Math.abs(v) >= absObs).length / n;
    }
  }
}

// Normal CDF approximation (Abramowitz & Stegun)
function normalCDF(x: number): number {
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const p = 0.3275911;
  const sign = x < 0 ? -1 : 1;
  const t = 1.0 / (1.0 + p * Math.abs(x) / Math.SQRT2);
  const y =
    1.0 -
    (((((a5 * t + a4) * t + a3) * t + a2) * t + a1) * t) *
      Math.exp((-x * x) / 2);
  return 0.5 * (1.0 + sign * y);
}

// Inverse normal (rational approximation)
function normalQuantile(p: number): number {
  if (p <= 0) return -Infinity;
  if (p >= 1) return Infinity;
  if (p === 0.5) return 0;
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2,
    1.383577518672690e2, -3.066479806614716e1, 2.506628277459239e0,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2,
    6.680131188771972e1, -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838e0,
    -2.549732539343734e0, 4.374664141464968e0, 2.938163982698783e0,
  ];
  const d = [
    7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996e0,
    3.754408661907416e0,
  ];
  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number, r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  } else if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) *
        q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  } else {
    q = Math.sqrt(-2 * Math.log(1 - p));
    return (
      -(
        (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q +
          c[5]) /
        ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
      )
    );
  }
}

// ============================================================================
// ENGINE
// ============================================================================

export class PermutationTestEngine {
  /**
   * Two-sample permutation test for difference in means, medians, or KS statistic.
   */
  twoSampleTest(params: TwoSampleTestInput): TwoSampleTestResult {
    const {
      sample_a,
      sample_b,
      statistic = "mean_diff",
      alternative = "two_sided",
      n_permutations = 10000,
      seed,
    } = params;

    log.info("PermutationTestEngine.twoSampleTest", {
      na: sample_a.length,
      nb: sample_b.length,
      statistic,
      alternative,
      n_permutations,
    });

    const rng = seed !== undefined ? mulberry32(seed) : () => Math.random();
    const na = sample_a.length;
    const pooled = [...sample_a, ...sample_b];

    const computeStat = (a: number[], b: number[]): number => {
      switch (statistic) {
        case "mean_diff":
          return mean(a) - mean(b);
        case "median_diff":
          return median(a) - median(b);
        case "ks":
          return ksStatistic(a, b);
        default:
          return mean(a) - mean(b);
      }
    };

    const observed = computeStat(sample_a, sample_b);

    const nullDist: number[] = [];
    for (let i = 0; i < n_permutations; i++) {
      const shuffled = shuffle(pooled, rng);
      const permA = shuffled.slice(0, na);
      const permB = shuffled.slice(na);
      nullDist.push(computeStat(permA, permB));
    }

    const pValue = computePValue(observed, nullDist, alternative);
    const effectSize = cohensD(sample_a, sample_b);

    return {
      observed_statistic: observed,
      p_value: pValue,
      null_distribution: {
        mean: mean(nullDist),
        std: std(nullDist, 1),
        percentiles: computePercentiles(nullDist),
      },
      significant_at_005: pValue < 0.05,
      significant_at_001: pValue < 0.01,
      effect_size: effectSize,
      n_permutations_actual: n_permutations,
    };
  }

  /**
   * Paired permutation test using sign-flipping of differences.
   */
  pairedTest(params: PairedTestInput): PairedTestResult {
    const {
      before,
      after,
      statistic = "mean_diff",
      n_permutations = 10000,
      alternative = "two_sided",
      seed,
    } = params;

    log.info("PermutationTestEngine.pairedTest", {
      n: before.length,
      statistic,
      alternative,
    });

    if (before.length !== after.length) {
      throw new Error("before and after arrays must have the same length");
    }

    const rng = seed !== undefined ? mulberry32(seed) : () => Math.random();
    const diffs = before.map((b, i) => after[i] - b);

    const computeStat = (d: number[]): number => {
      return statistic === "median_diff" ? median(d) : mean(d);
    };

    const observed = computeStat(diffs);

    const nullDist: number[] = [];
    for (let i = 0; i < n_permutations; i++) {
      const flipped = diffs.map((d) => (rng() < 0.5 ? d : -d));
      nullDist.push(computeStat(flipped));
    }

    const pValue = computePValue(observed, nullDist, alternative);

    // Bootstrap CI for mean difference
    const bootstrapMeans: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const sample: number[] = [];
      for (let j = 0; j < diffs.length; j++) {
        sample.push(diffs[Math.floor(rng() * diffs.length)]);
      }
      bootstrapMeans.push(mean(sample));
    }
    bootstrapMeans.sort((a, b) => a - b);
    const ci95: [number, number] = [
      percentile(bootstrapMeans, 2.5),
      percentile(bootstrapMeans, 97.5),
    ];

    const effectSize = std(diffs) === 0 ? 0 : mean(diffs) / std(diffs);

    return {
      observed_statistic: observed,
      p_value: pValue,
      null_distribution: {
        mean: mean(nullDist),
        std: std(nullDist, 1),
        percentiles: computePercentiles(nullDist),
      },
      significant_at_005: pValue < 0.05,
      significant_at_001: pValue < 0.01,
      effect_size: effectSize,
      n_permutations_actual: n_permutations,
      mean_difference: mean(diffs),
      ci_95: ci95,
    };
  }

  /**
   * Permutation test for correlation significance.
   */
  correlationTest(params: CorrelationTestInput): CorrelationTestResult {
    const {
      x,
      y,
      method = "pearson",
      n_permutations = 10000,
      alternative = "two_sided",
      seed,
    } = params;

    log.info("PermutationTestEngine.correlationTest", {
      n: x.length,
      method,
      alternative,
    });

    if (x.length !== y.length) {
      throw new Error("x and y arrays must have the same length");
    }

    const rng = seed !== undefined ? mulberry32(seed) : () => Math.random();

    const corrFn =
      method === "spearman" ? spearmanCorrelation : pearsonCorrelation;

    const observed = corrFn(x, y);

    const nullDist: number[] = [];
    for (let i = 0; i < n_permutations; i++) {
      const shuffledY = shuffle(y, rng);
      nullDist.push(corrFn(x, shuffledY));
    }

    const pValue = computePValue(observed, nullDist, alternative);

    // Bootstrap CI for correlation
    const bootstrapCorrs: number[] = [];
    for (let i = 0; i < 2000; i++) {
      const indices = Array.from({ length: x.length }, () =>
        Math.floor(rng() * x.length)
      );
      const bx = indices.map((idx) => x[idx]);
      const by = indices.map((idx) => y[idx]);
      bootstrapCorrs.push(corrFn(bx, by));
    }
    bootstrapCorrs.sort((a, b) => a - b);

    return {
      observed_correlation: observed,
      p_value: pValue,
      null_distribution: {
        mean: mean(nullDist),
        std: std(nullDist, 1),
        percentiles: computePercentiles(nullDist),
      },
      significant: pValue < 0.05,
      ci_95_bootstrap: [
        percentile(bootstrapCorrs, 2.5),
        percentile(bootstrapCorrs, 97.5),
      ],
    };
  }

  /**
   * Permutation-based one-way ANOVA with pairwise comparisons.
   */
  anovaPermutation(params: AnovaPermutationInput): AnovaPermutationResult {
    const { groups, n_permutations = 10000, seed } = params;

    log.info("PermutationTestEngine.anovaPermutation", {
      k: groups.length,
      sizes: groups.map((g) => g.length),
    });

    const rng = seed !== undefined ? mulberry32(seed) : () => Math.random();

    const computeF = (grps: number[][]): number => {
      const allData = grps.flat();
      const grandMean = mean(allData);
      const k = grps.length;
      const N = allData.length;

      let ssBetween = 0;
      let ssWithin = 0;
      for (const g of grps) {
        const gm = mean(g);
        ssBetween += g.length * (gm - grandMean) ** 2;
        for (const v of g) {
          ssWithin += (v - gm) ** 2;
        }
      }

      const dfBetween = k - 1;
      const dfWithin = N - k;
      if (dfWithin <= 0 || ssWithin === 0) return 0;
      return (ssBetween / dfBetween) / (ssWithin / dfWithin);
    };

    const observedF = computeF(groups);

    // Pool all data, permute group assignments
    const allData = groups.flat();
    const sizes = groups.map((g) => g.length);

    const nullDist: number[] = [];
    for (let i = 0; i < n_permutations; i++) {
      const shuffled = shuffle(allData, rng);
      const permGroups: number[][] = [];
      let offset = 0;
      for (const sz of sizes) {
        permGroups.push(shuffled.slice(offset, offset + sz));
        offset += sz;
      }
      nullDist.push(computeF(permGroups));
    }

    const pValue = nullDist.filter((v) => v >= observedF).length / nullDist.length;

    // Pairwise comparisons
    const pairwise: PairwiseComparison[] = [];
    for (let i = 0; i < groups.length; i++) {
      for (let j = i + 1; j < groups.length; j++) {
        const result = this.twoSampleTest({
          sample_a: groups[i],
          sample_b: groups[j],
          n_permutations: Math.min(n_permutations, 5000),
          seed: seed !== undefined ? seed + i * 1000 + j : undefined,
        });
        pairwise.push({
          group_i: i,
          group_j: j,
          p_value: result.p_value,
        });
      }
    }

    return {
      observed_f: observedF,
      p_value: pValue,
      null_distribution: {
        mean: mean(nullDist),
        std: std(nullDist, 1),
        percentiles: computePercentiles(nullDist),
      },
      pairwise_comparisons: pairwise,
    };
  }

  /**
   * Bootstrap confidence interval for a statistic (percentile, BCa, or basic).
   */
  bootstrapConfidenceInterval(params: BootstrapCIInput): BootstrapCIResult {
    const {
      data,
      statistic = "mean",
      n_bootstrap = 10000,
      method = "bca",
      confidence = 0.95,
      seed,
    } = params;

    log.info("PermutationTestEngine.bootstrapConfidenceInterval", {
      n: data.length,
      statistic,
      method,
      confidence,
    });

    const rng = seed !== undefined ? mulberry32(seed) : () => Math.random();

    const computeStat = (arr: number[]): number => {
      switch (statistic) {
        case "mean":
          return mean(arr);
        case "median":
          return median(arr);
        case "std":
          return std(arr);
        case "trimmed_mean":
          return trimmedMean(arr);
        default:
          return mean(arr);
      }
    };

    const observed = computeStat(data);

    // Generate bootstrap samples
    const bootStats: number[] = [];
    for (let i = 0; i < n_bootstrap; i++) {
      const sample: number[] = [];
      for (let j = 0; j < data.length; j++) {
        sample.push(data[Math.floor(rng() * data.length)]);
      }
      bootStats.push(computeStat(sample));
    }
    bootStats.sort((a, b) => a - b);

    const alpha = 1 - confidence;
    const seBoot = std(bootStats, 1);
    const bias = mean(bootStats) - observed;
    const biasCorrected = observed - bias;

    let ci: [number, number];

    if (method === "percentile") {
      ci = [
        percentile(bootStats, (alpha / 2) * 100),
        percentile(bootStats, (1 - alpha / 2) * 100),
      ];
    } else if (method === "basic") {
      const lo = percentile(bootStats, (alpha / 2) * 100);
      const hi = percentile(bootStats, (1 - alpha / 2) * 100);
      ci = [2 * observed - hi, 2 * observed - lo];
    } else {
      // BCa method
      // Bias correction: z0
      const propBelow =
        bootStats.filter((v) => v < observed).length / bootStats.length;
      const z0 = normalQuantile(Math.max(0.0001, Math.min(0.9999, propBelow)));

      // Acceleration: jackknife
      const n = data.length;
      const jackStats: number[] = [];
      for (let i = 0; i < n; i++) {
        const jackSample = [...data.slice(0, i), ...data.slice(i + 1)];
        jackStats.push(computeStat(jackSample));
      }
      const jackMean = mean(jackStats);
      const diffs = jackStats.map((v) => jackMean - v);
      const sumCubed = diffs.reduce((s, d) => s + d ** 3, 0);
      const sumSquared = diffs.reduce((s, d) => s + d ** 2, 0);
      const acc =
        sumSquared === 0 ? 0 : sumCubed / (6 * Math.pow(sumSquared, 1.5));

      // Adjusted percentiles
      const zAlphaLo = normalQuantile(alpha / 2);
      const zAlphaHi = normalQuantile(1 - alpha / 2);

      const adjLo = normalCDF(
        z0 + (z0 + zAlphaLo) / (1 - acc * (z0 + zAlphaLo))
      );
      const adjHi = normalCDF(
        z0 + (z0 + zAlphaHi) / (1 - acc * (z0 + zAlphaHi))
      );

      ci = [
        percentile(bootStats, Math.max(0.01, Math.min(99.99, adjLo * 100))),
        percentile(bootStats, Math.max(0.01, Math.min(99.99, adjHi * 100))),
      ];
    }

    return {
      point_estimate: observed,
      ci,
      method_used: method,
      se_bootstrap: seBoot,
      bias,
      bias_corrected_estimate: biasCorrected,
    };
  }

  /**
   * Manufacturing process comparison with practical significance assessment.
   */
  manufacturingComparison(
    params: ManufacturingComparisonInput
  ): ManufacturingComparisonResult {
    const {
      process_a,
      process_b,
      metric = "mean",
      test_type = "independent",
      seed,
    } = params;

    log.info("PermutationTestEngine.manufacturingComparison", {
      na: process_a.length,
      nb: process_b.length,
      metric,
      test_type,
    });

    let pValue: number;
    let effectSize: number;
    let observedDiff: number;

    if (metric === "variance") {
      // Compare variances using ratio
      const varA = std(process_a) ** 2;
      const varB = std(process_b) ** 2;
      observedDiff = varA - varB;
      effectSize = varB === 0 ? 0 : Math.abs(Math.log(varA / varB));

      const rng = seed !== undefined ? mulberry32(seed) : () => Math.random();
      const pooled = [...process_a, ...process_b];
      const na = process_a.length;
      let count = 0;
      const nPerms = 10000;
      for (let i = 0; i < nPerms; i++) {
        const shuffled = shuffle(pooled, rng);
        const permVarA = std(shuffled.slice(0, na)) ** 2;
        const permVarB = std(shuffled.slice(na)) ** 2;
        if (Math.abs(permVarA - permVarB) >= Math.abs(observedDiff)) count++;
      }
      pValue = count / nPerms;
    } else if (metric === "cpk") {
      // Compare Cpk (use overall range as spec limits)
      const all = [...process_a, ...process_b];
      const allMean = mean(all);
      const allStd = std(all);
      const usl = allMean + 3 * allStd;
      const lsl = allMean - 3 * allStd;

      const cpk = (data: number[]): number => {
        const m = mean(data);
        const s = std(data);
        if (s === 0) return Infinity;
        return Math.min((usl - m) / (3 * s), (m - lsl) / (3 * s));
      };

      const cpkA = cpk(process_a);
      const cpkB = cpk(process_b);
      observedDiff = cpkA - cpkB;
      effectSize = Math.abs(observedDiff);

      const rng = seed !== undefined ? mulberry32(seed) : () => Math.random();
      const pooled = [...process_a, ...process_b];
      const na = process_a.length;
      let count = 0;
      const nPerms = 10000;
      for (let i = 0; i < nPerms; i++) {
        const shuffled = shuffle(pooled, rng);
        const permCpkA = cpk(shuffled.slice(0, na));
        const permCpkB = cpk(shuffled.slice(na));
        if (Math.abs(permCpkA - permCpkB) >= Math.abs(observedDiff)) count++;
      }
      pValue = count / nPerms;
    } else {
      // Mean comparison
      if (test_type === "paired") {
        const result = this.pairedTest({
          before: process_a,
          after: process_b,
          n_permutations: 10000,
          seed,
        });
        pValue = result.p_value;
        effectSize = result.effect_size;
        observedDiff = result.mean_difference;
      } else {
        const result = this.twoSampleTest({
          sample_a: process_a,
          sample_b: process_b,
          n_permutations: 10000,
          seed,
        });
        pValue = result.p_value;
        effectSize = result.effect_size;
        observedDiff = result.observed_statistic;
      }
    }

    const significant = pValue < 0.05;
    const practicalSignificance = significant && Math.abs(effectSize) > 0.5;

    let betterProcess: "a" | "b" | "no_difference" = "no_difference";
    if (significant) {
      if (metric === "variance") {
        // Lower variance is better
        betterProcess =
          std(process_a) < std(process_b) ? "a" : "b";
      } else if (metric === "cpk") {
        // Higher Cpk is better
        betterProcess = observedDiff > 0 ? "a" : "b";
      } else {
        // For mean, context-dependent; assume closer to target is better
        // Default: higher precision (lower variance) with similar mean
        betterProcess = observedDiff > 0 ? "a" : "b";
      }
    }

    let recommendation: string;
    if (!significant) {
      recommendation =
        "No statistically significant difference between processes. Either process is acceptable.";
    } else if (!practicalSignificance) {
      recommendation = `Process ${betterProcess} is statistically better (p=${pValue.toFixed(4)}) but the effect size (${Math.abs(effectSize).toFixed(3)}) suggests the practical difference may be negligible.`;
    } else {
      recommendation = `Process ${betterProcess} is significantly better (p=${pValue.toFixed(4)}, effect size=${Math.abs(effectSize).toFixed(3)}). Recommend switching to process ${betterProcess}.`;
    }

    return {
      better_process: betterProcess,
      p_value: pValue,
      effect_size: effectSize,
      practical_significance: practicalSignificance,
      recommendation,
    };
  }
}

export const permutationTestEngine = new PermutationTestEngine();
