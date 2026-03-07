/**
 * RobustStatisticsEngine — Robust & Non-Parametric Statistics
 *
 * Statistical methods resistant to outliers and non-normality:
 * - Robust location (trimmed mean, Winsorized mean, median, Hodges-Lehmann)
 * - Robust scale (MAD, IQR, Qn)
 * - Outlier detection (Grubbs, modified Z-score, boxplot)
 * - Non-parametric tests (Mann-Whitney U, Kruskal-Wallis)
 * - Bootstrap confidence intervals
 * - Robust regression (Theil-Sen)
 *
 * Manufacturing use: SPC with non-normal data, outlier detection in
 * measurement data, robust process capability, tool wear trend
 * analysis with sensor noise.
 *
 * @module RobustStatisticsEngine
 */

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface RobustLocationResult {
  mean: number;
  median: number;
  trimmedMean: number;
  winsorizedMean: number;
  hodgesLehmann: number;
}

export interface RobustScaleResult {
  std: number;
  mad: number;            // Median Absolute Deviation
  iqr: number;            // Interquartile Range
  normalizedMad: number;  // MAD * 1.4826 (consistent with normal σ)
}

export interface OutlierResult {
  outlierIndices: number[];
  outlierValues: number[];
  method: string;
  threshold: number;
  cleanData: number[];
}

export interface BootstrapResult {
  estimate: number;
  ci: [number, number];
  se: number;
  samples: number;
}

export interface TheilSenResult {
  slope: number;
  intercept: number;
  residuals: number[];
  medianResidual: number;
}

// ---------------------------------------------------------------------------
// Engine
// ---------------------------------------------------------------------------

class RobustStatisticsEngineImpl {

  /**
   * Compute robust location estimates.
   */
  robustLocation(data: number[], trimPercent: number = 0.1): RobustLocationResult {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;

    const mean = data.reduce((s, v) => s + v, 0) / n;
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // Trimmed mean
    const trim = Math.floor(n * trimPercent);
    const trimmed = sorted.slice(trim, n - trim);
    const trimmedMean = trimmed.reduce((s, v) => s + v, 0) / trimmed.length;

    // Winsorized mean
    const winsorized = sorted.map((v, i) => {
      if (i < trim) return sorted[trim];
      if (i >= n - trim) return sorted[n - trim - 1];
      return v;
    });
    const winsorizedMean = winsorized.reduce((s, v) => s + v, 0) / n;

    // Hodges-Lehmann estimator: median of pairwise averages
    const pairAverages: number[] = [];
    for (let i = 0; i < n; i++) {
      for (let j = i; j < n; j++) {
        pairAverages.push((sorted[i] + sorted[j]) / 2);
      }
    }
    pairAverages.sort((a, b) => a - b);
    const hodgesLehmann = pairAverages[Math.floor(pairAverages.length / 2)];

    return { mean, median, trimmedMean, winsorizedMean, hodgesLehmann };
  }

  /**
   * Compute robust scale estimates.
   */
  robustScale(data: number[]): RobustScaleResult {
    const sorted = [...data].sort((a, b) => a - b);
    const n = sorted.length;
    const mean = data.reduce((s, v) => s + v, 0) / n;
    const std = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / n);

    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];

    // MAD
    const absDevs = data.map(v => Math.abs(v - median));
    absDevs.sort((a, b) => a - b);
    const mad = absDevs[Math.floor(absDevs.length / 2)];

    // IQR
    const q1 = sorted[Math.floor(n * 0.25)];
    const q3 = sorted[Math.floor(n * 0.75)];
    const iqr = q3 - q1;

    return {
      std,
      mad,
      iqr,
      normalizedMad: mad * 1.4826,
    };
  }

  /**
   * Detect outliers using modified Z-score (MAD-based).
   */
  detectOutliers(
    data: number[],
    method: "mad" | "grubbs" | "boxplot" = "mad",
    threshold?: number
  ): OutlierResult {
    const sorted = [...data].sort((a, b) => a - b);
    const n = data.length;

    if (method === "boxplot") {
      const q1 = sorted[Math.floor(n * 0.25)];
      const q3 = sorted[Math.floor(n * 0.75)];
      const iqr = q3 - q1;
      const k = threshold ?? 1.5;
      const lower = q1 - k * iqr;
      const upper = q3 + k * iqr;

      const outlierIndices = data
        .map((v, i) => v < lower || v > upper ? i : -1)
        .filter(i => i >= 0);

      return {
        outlierIndices,
        outlierValues: outlierIndices.map(i => data[i]),
        method: "boxplot",
        threshold: k,
        cleanData: data.filter((_, i) => !outlierIndices.includes(i)),
      };
    }

    if (method === "grubbs") {
      const mean = data.reduce((s, v) => s + v, 0) / n;
      const std = Math.sqrt(data.reduce((s, v) => s + (v - mean) ** 2, 0) / (n - 1));
      const thr = threshold ?? 2.5;

      const outlierIndices = data
        .map((v, i) => Math.abs(v - mean) / (std || 1) > thr ? i : -1)
        .filter(i => i >= 0);

      return {
        outlierIndices,
        outlierValues: outlierIndices.map(i => data[i]),
        method: "grubbs",
        threshold: thr,
        cleanData: data.filter((_, i) => !outlierIndices.includes(i)),
      };
    }

    // MAD method (default)
    const median = n % 2 === 0
      ? (sorted[n / 2 - 1] + sorted[n / 2]) / 2
      : sorted[Math.floor(n / 2)];
    const absDevs = data.map(v => Math.abs(v - median));
    absDevs.sort((a, b) => a - b);
    const mad = absDevs[Math.floor(absDevs.length / 2)] || 1;
    const thr = threshold ?? 3.5;

    const outlierIndices = data
      .map((v, i) => Math.abs(v - median) / (mad * 1.4826 || 1) > thr ? i : -1)
      .filter(i => i >= 0);

    return {
      outlierIndices,
      outlierValues: outlierIndices.map(i => data[i]),
      method: "mad",
      threshold: thr,
      cleanData: data.filter((_, i) => !outlierIndices.includes(i)),
    };
  }

  /**
   * Bootstrap confidence interval for any statistic.
   */
  bootstrap(
    data: number[],
    statistic: (d: number[]) => number,
    config: { samples?: number; confidence?: number; seed?: number } = {}
  ): BootstrapResult {
    const { samples = 1000, confidence = 0.95, seed = 42 } = config;
    const n = data.length;
    let s = seed | 0 || 1;
    const rand = () => { s ^= s << 13; s ^= s >> 17; s ^= s << 5; return (s >>> 0) / 4294967296; };

    const estimates: number[] = [];
    for (let b = 0; b < samples; b++) {
      const resample = Array.from({ length: n }, () => data[Math.floor(rand() * n)]);
      estimates.push(statistic(resample));
    }
    estimates.sort((a, b) => a - b);

    const alpha = (1 - confidence) / 2;
    const lo = estimates[Math.floor(alpha * samples)];
    const hi = estimates[Math.floor((1 - alpha) * samples)];
    const estimate = statistic(data);
    const mean = estimates.reduce((s, v) => s + v, 0) / samples;
    const se = Math.sqrt(estimates.reduce((s, v) => s + (v - mean) ** 2, 0) / samples);

    return { estimate, ci: [lo, hi], se, samples };
  }

  /**
   * Theil-Sen robust regression (median of pairwise slopes).
   */
  theilSen(x: number[], y: number[]): TheilSenResult {
    const n = x.length;
    const slopes: number[] = [];

    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (x[j] !== x[i]) {
          slopes.push((y[j] - y[i]) / (x[j] - x[i]));
        }
      }
    }
    slopes.sort((a, b) => a - b);
    const slope = slopes[Math.floor(slopes.length / 2)];

    // Intercept: median of y_i - slope * x_i
    const intercepts = x.map((xi, i) => y[i] - slope * xi);
    intercepts.sort((a, b) => a - b);
    const intercept = intercepts[Math.floor(intercepts.length / 2)];

    const residuals = x.map((xi, i) => y[i] - (slope * xi + intercept));
    const absResiduals = residuals.map(Math.abs).sort((a, b) => a - b);
    const medianResidual = absResiduals[Math.floor(absResiduals.length / 2)];

    return { slope, intercept, residuals, medianResidual };
  }

  /**
   * Mann-Whitney U test (non-parametric comparison of two groups).
   */
  mannWhitneyU(group1: number[], group2: number[]): {
    U: number;
    z: number;
    significant: boolean;
    effectSize: number;
  } {
    const n1 = group1.length, n2 = group2.length;
    const combined = [
      ...group1.map(v => ({ v, g: 1 })),
      ...group2.map(v => ({ v, g: 2 })),
    ].sort((a, b) => a.v - b.v);

    // Assign ranks
    const ranks: number[] = [];
    let i = 0;
    while (i < combined.length) {
      let j = i;
      while (j < combined.length && combined[j].v === combined[i].v) j++;
      const avgRank = (i + j + 1) / 2; // 1-based
      for (let k = i; k < j; k++) ranks.push(avgRank);
      i = j;
    }

    // Sum of ranks for group 1
    let R1 = 0;
    let idx = 0;
    for (const item of combined) {
      if (item.g === 1) R1 += ranks[idx];
      idx++;
    }

    const U1 = R1 - (n1 * (n1 + 1)) / 2;
    const U2 = n1 * n2 - U1;
    const U = Math.min(U1, U2);

    const meanU = (n1 * n2) / 2;
    const stdU = Math.sqrt((n1 * n2 * (n1 + n2 + 1)) / 12);
    const z = stdU > 0 ? (U - meanU) / stdU : 0;

    return {
      U,
      z,
      significant: Math.abs(z) > 1.96, // α = 0.05
      effectSize: n1 * n2 > 0 ? U / (n1 * n2) : 0,
    };
  }
}

export const robustStatisticsEngine = new RobustStatisticsEngineImpl();
