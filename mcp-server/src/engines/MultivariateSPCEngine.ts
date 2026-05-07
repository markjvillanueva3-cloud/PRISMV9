/**
 * MultivariateSPCEngine — Hotelling T² and MEWMA multivariate control charts
 *
 * Phase 0.22 U-SPC6. Monitors several correlated quality characteristics
 * jointly. Univariate charts on correlated variables miss shifts that a
 * joint metric detects; Hotelling's T² statistic is the multivariate
 * analogue of the univariate z²:
 *
 *   T²_i = (x_i − μ)ᵀ Σ⁻¹ (x_i − μ)       (Hotelling 1947)
 *
 * For a Phase II chart with known μ and Σ the UCL is approximated by the
 * chi-squared critical value χ²_{p, α}. We use the common shop-floor
 * threshold α = 0.0027 (≈ 3σ for p = 1 after Bonferroni-like framing).
 *
 * MEWMA (Lowry et al. 1992) applies exponential smoothing to a multivariate
 * stream before computing the statistic:
 *
 *   z_i = λ·x_i + (1 − λ)·z_{i−1},  z_0 = μ
 *   Σ_zᵢ = (λ/(2−λ)) · (1 − (1−λ)^{2i}) · Σ
 *   T²_i = (z_i − μ)ᵀ Σ_zᵢ⁻¹ (z_i − μ)
 *
 * References: AIAG SPC 2nd ed. Ch. IV; NIST/SEMATECH e-Handbook §6.3.3.4.
 *
 * @module engines/MultivariateSPCEngine
 * @milestone PP-0.22-U-SPC6
 */

import { z } from "zod";

export const MvSpcConfigSchema = z.object({
  mean: z.array(z.number().finite()).nonempty(),
  /** Covariance matrix as row-major [p][p]; must be symmetric positive-definite. */
  covariance: z.array(z.array(z.number().finite()).nonempty()).nonempty(),
  /** Chi-square tail probability α for UCL (default 0.0027). */
  alpha: z.number().positive().lt(1).optional(),
});

export type MvSpcConfig = z.infer<typeof MvSpcConfigSchema>;

export interface HotellingPoint {
  index: number;
  t2: number;
  ucl: number;
  alarm: boolean;
}

export interface MewmaConfig extends MvSpcConfig {
  /** Smoothing constant in (0, 1]. 0.1–0.2 typical. */
  lambda: number;
}

export interface MewmaPoint extends HotellingPoint {
  zBar: number[];
}

const DEFAULT_ALPHA = 0.0027;

export class MultivariateSPCEngine {
  private readonly p: number;
  private readonly mean: number[];
  private readonly covariance: number[][];
  private readonly covarianceInverse: number[][];
  private readonly alpha: number;
  private readonly ucl: number;

  constructor(config: MvSpcConfig) {
    const parsed = MvSpcConfigSchema.parse(config);
    this.p = parsed.mean.length;
    if (parsed.covariance.length !== this.p || parsed.covariance.some((row) => row.length !== this.p)) {
      throw new Error(`covariance must be ${this.p}×${this.p}`);
    }
    if (!MultivariateSPCEngine.isSymmetric(parsed.covariance)) {
      throw new Error("covariance must be symmetric");
    }
    this.mean = [...parsed.mean];
    this.covariance = parsed.covariance.map((r) => [...r]);
    this.covarianceInverse = MultivariateSPCEngine.invertSymmetric(this.covariance);
    this.alpha = parsed.alpha ?? DEFAULT_ALPHA;
    this.ucl = MultivariateSPCEngine.chiSquareCritical(this.p, this.alpha);
  }

  getUcl(): number {
    return round4(this.ucl);
  }

  /** T² statistic for a single observation vector. */
  hotellingT2(observation: readonly number[]): HotellingPoint {
    this.validateObservation(observation);
    const deviation = observation.map((v, i) => v - this.mean[i]);
    const t2 = quadratic(deviation, this.covarianceInverse);
    return { index: 0, t2: round4(t2), ucl: round4(this.ucl), alarm: t2 > this.ucl };
  }

  /** T² for each observation in a stream (independent evaluation per point). */
  hotellingStream(observations: ReadonlyArray<readonly number[]>): HotellingPoint[] {
    return observations.map((obs, idx) => {
      const p = this.hotellingT2(obs);
      return { ...p, index: idx };
    });
  }

  /** MEWMA stream; smooths observations before computing T² on the smoothed vector. */
  mewmaStream(observations: ReadonlyArray<readonly number[]>, lambda: number): MewmaPoint[] {
    if (!(lambda > 0 && lambda <= 1)) throw new Error("lambda must be in (0, 1]");
    const results: MewmaPoint[] = [];
    let z = [...this.mean];
    for (let i = 0; i < observations.length; i += 1) {
      const obs = observations[i];
      this.validateObservation(obs);
      z = z.map((zi, j) => lambda * obs[j] + (1 - lambda) * zi);
      const scale = (lambda / (2 - lambda)) * (1 - Math.pow(1 - lambda, 2 * (i + 1)));
      const deviation = z.map((v, j) => v - this.mean[j]);
      const scaledInverse = this.covarianceInverse.map((row) => row.map((v) => v / scale));
      const t2 = quadratic(deviation, scaledInverse);
      results.push({
        index: i,
        t2: round4(t2),
        ucl: round4(this.ucl),
        alarm: t2 > this.ucl,
        zBar: z.map((v) => round4(v)),
      });
    }
    return results;
  }

  /**
   * Estimate mean + covariance from an in-control reference sample (Phase I).
   * Returns configuration suitable for constructing a Phase II engine.
   */
  static fitFromReference(
    observations: ReadonlyArray<readonly number[]>,
    alpha: number = DEFAULT_ALPHA,
  ): MvSpcConfig {
    if (observations.length < 2) throw new Error("need ≥2 observations");
    const p = observations[0].length;
    for (const obs of observations) {
      if (obs.length !== p) throw new Error("inconsistent observation dimensions");
      for (const v of obs) if (!Number.isFinite(v)) throw new Error("observations must be finite");
    }
    const n = observations.length;
    const mean = new Array<number>(p).fill(0);
    for (const obs of observations) for (let j = 0; j < p; j += 1) mean[j] += obs[j];
    for (let j = 0; j < p; j += 1) mean[j] /= n;

    const covariance = Array.from({ length: p }, () => new Array<number>(p).fill(0));
    for (const obs of observations) {
      for (let i = 0; i < p; i += 1) {
        for (let j = 0; j < p; j += 1) {
          covariance[i][j] += (obs[i] - mean[i]) * (obs[j] - mean[j]);
        }
      }
    }
    const divisor = n - 1;
    for (let i = 0; i < p; i += 1) {
      for (let j = 0; j < p; j += 1) {
        covariance[i][j] /= divisor;
      }
    }
    return { mean, covariance, alpha };
  }

  /** Chi-square critical value via Wilson–Hilferty cube-root approximation. */
  static chiSquareCritical(df: number, alpha: number): number {
    if (!(df > 0)) throw new Error("df must be > 0");
    if (!(alpha > 0 && alpha < 1)) throw new Error("alpha must be in (0, 1)");
    const z = normalQuantile(1 - alpha);
    const term = 1 - 2 / (9 * df) + z * Math.sqrt(2 / (9 * df));
    return df * Math.pow(term, 3);
  }

  private validateObservation(obs: readonly number[]): void {
    if (obs.length !== this.p) throw new Error(`observation must have length ${this.p}`);
    for (const v of obs) if (!Number.isFinite(v)) throw new Error("observation must be finite");
  }

  private static isSymmetric(m: readonly (readonly number[])[]): boolean {
    const n = m.length;
    for (let i = 0; i < n; i += 1) {
      for (let j = i + 1; j < n; j += 1) {
        if (Math.abs(m[i][j] - m[j][i]) > 1e-12) return false;
      }
    }
    return true;
  }

  /** Gauss–Jordan inversion for small symmetric matrices. Throws on singular. */
  private static invertSymmetric(matrix: readonly (readonly number[])[]): number[][] {
    const n = matrix.length;
    const aug: number[][] = matrix.map((row, i) => {
      const r = [...row];
      for (let j = 0; j < n; j += 1) r.push(i === j ? 1 : 0);
      return r;
    });

    for (let col = 0; col < n; col += 1) {
      let pivot = col;
      for (let row = col + 1; row < n; row += 1) {
        if (Math.abs(aug[row][col]) > Math.abs(aug[pivot][col])) pivot = row;
      }
      if (Math.abs(aug[pivot][col]) < 1e-14) {
        throw new Error("covariance is singular (not positive-definite)");
      }
      if (pivot !== col) [aug[col], aug[pivot]] = [aug[pivot], aug[col]];
      const pivotVal = aug[col][col];
      for (let j = 0; j < 2 * n; j += 1) aug[col][j] /= pivotVal;
      for (let row = 0; row < n; row += 1) {
        if (row === col) continue;
        const factor = aug[row][col];
        if (factor === 0) continue;
        for (let j = 0; j < 2 * n; j += 1) aug[row][j] -= factor * aug[col][j];
      }
    }
    return aug.map((row) => row.slice(n));
  }
}

function quadratic(v: readonly number[], mInv: readonly (readonly number[])[]): number {
  const n = v.length;
  let total = 0;
  for (let i = 0; i < n; i += 1) {
    let inner = 0;
    for (let j = 0; j < n; j += 1) inner += mInv[i][j] * v[j];
    total += v[i] * inner;
  }
  return total;
}

/**
 * Acklam (2003) rational approximation of the inverse normal CDF. Absolute
 * error < 4.5e−4 on (0, 1), sufficient for control-limit work.
 */
function normalQuantile(p: number): number {
  if (!(p > 0 && p < 1)) throw new Error("p must be in (0, 1)");
  const a = [
    -3.969683028665376e1, 2.209460984245205e2, -2.759285104469687e2, 1.38357751867269e2,
    -3.066479806614716e1, 2.506628277459239,
  ];
  const b = [
    -5.447609879822406e1, 1.615858368580409e2, -1.556989798598866e2, 6.680131188771972e1,
    -1.328068155288572e1,
  ];
  const c = [
    -7.784894002430293e-3, -3.223964580411365e-1, -2.400758277161838, -2.549732539343734,
    4.374664141464968, 2.938163982698783,
  ];
  const d = [7.784695709041462e-3, 3.224671290700398e-1, 2.445134137142996, 3.754408661907416];

  const pLow = 0.02425;
  const pHigh = 1 - pLow;
  let q: number;
  let r: number;
  if (p < pLow) {
    q = Math.sqrt(-2 * Math.log(p));
    return (
      (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
      ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
    );
  }
  if (p <= pHigh) {
    q = p - 0.5;
    r = q * q;
    return (
      ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) /
      (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1)
    );
  }
  q = Math.sqrt(-2 * Math.log(1 - p));
  return (
    -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) /
    ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1)
  );
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const multivariateSPCEngine = MultivariateSPCEngine;
