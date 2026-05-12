/**
 * ChangePointDetectionEngine — Detect structural breaks in a time series
 *
 * Phase 0.22 U-SPC7 from UNIVERSAL-SKILLS-SCRIPTS-HOOKS-PLAN. Implements two
 * detectors:
 *
 *   1. Binary segmentation — recursively split on the CUSUM-max statistic.
 *   2. CUSUM-based single-change detection (Page's statistic on mean).
 *
 * Returns change points as indices into the input series, sorted ascending.
 * No I/O. Pure arithmetic. Parametric Gaussian cost with pooled variance.
 *
 * References: Killick, Fearnhead, Eckley (2012) "Optimal detection of
 * changepoints with a linear computational cost" (PELT is referenced for
 * completeness; this engine uses the simpler binary-segmentation variant
 * which is adequate for the <10k-point series typical in PRISM).
 *
 * @module engines/ChangePointDetectionEngine
 * @milestone PP-0.22-U-SPC7
 */

export interface CpDetectConfig {
  /** Minimum segment length (inclusive). */
  minSegmentSize: number;
  /** Penalty (larger ⇒ fewer change points). Typical: 2·log(n)·σ². */
  penalty: number;
  /** Max recursion depth to cap exploding segment counts. */
  maxDepth?: number;
}

export const DEFAULT_CP_CONFIG: CpDetectConfig = Object.freeze({
  minSegmentSize: 5,
  penalty: 10,
  maxDepth: 10,
});

export interface ChangePoint {
  index: number; // split index; segment [start, index) vs [index, end)
  score: number; // test statistic
  leftMean: number;
  rightMean: number;
}

export class ChangePointDetectionEngine {
  private config: CpDetectConfig;

  constructor(config: CpDetectConfig = DEFAULT_CP_CONFIG) {
    this.validateConfig(config);
    this.config = config;
  }

  /**
   * Binary segmentation. Returns indices (0 < idx < n) where the series splits.
   */
  detect(values: readonly number[]): ChangePoint[] {
    if (!Array.isArray(values)) throw new Error("values must be an array");
    for (const v of values) if (!Number.isFinite(v)) throw new Error("all values must be finite");
    if (values.length < 2 * this.config.minSegmentSize) return [];

    const out: ChangePoint[] = [];
    this.segment(values, 0, values.length, out, 0);
    out.sort((a, b) => a.index - b.index);
    return out;
  }

  /** Page's CUSUM-of-deviations argmax; single change point. */
  detectSingle(values: readonly number[]): ChangePoint | null {
    if (values.length < 2) return null;
    const mean = this.mean(values, 0, values.length);
    let cum = 0;
    let best = -Infinity;
    let bestIdx = -1;
    for (let i = 0; i < values.length - 1; i += 1) {
      cum += values[i] - mean;
      const stat = Math.abs(cum);
      if (stat > best) {
        best = stat;
        bestIdx = i + 1;
      }
    }
    if (bestIdx < 0 || bestIdx === values.length) return null;
    return {
      index: bestIdx,
      score: round4(best),
      leftMean: round4(this.mean(values, 0, bestIdx)),
      rightMean: round4(this.mean(values, bestIdx, values.length)),
    };
  }

  setConfig(config: CpDetectConfig): void {
    this.validateConfig(config);
    this.config = config;
  }

  getConfig(): CpDetectConfig {
    return this.config;
  }

  // --- internals ---------------------------------------------------------

  private segment(
    values: readonly number[],
    start: number,
    end: number,
    out: ChangePoint[],
    depth: number
  ): void {
    const n = end - start;
    if (n < 2 * this.config.minSegmentSize) return;
    if (depth >= (this.config.maxDepth ?? DEFAULT_CP_CONFIG.maxDepth!)) return;

    const overallMean = this.mean(values, start, end);
    const totalSSE = this.sse(values, start, end, overallMean);
    let bestIdx = -1;
    let bestGain = 0;
    let bestLeftMean = 0;
    let bestRightMean = 0;

    for (let i = start + this.config.minSegmentSize; i <= end - this.config.minSegmentSize; i += 1) {
      const lm = this.mean(values, start, i);
      const rm = this.mean(values, i, end);
      const splitSSE = this.sse(values, start, i, lm) + this.sse(values, i, end, rm);
      const gain = totalSSE - splitSSE;
      if (gain > bestGain) {
        bestGain = gain;
        bestIdx = i;
        bestLeftMean = lm;
        bestRightMean = rm;
      }
    }

    if (bestIdx < 0 || bestGain < this.config.penalty) return;

    out.push({
      index: bestIdx,
      score: round4(bestGain),
      leftMean: round4(bestLeftMean),
      rightMean: round4(bestRightMean),
    });
    this.segment(values, start, bestIdx, out, depth + 1);
    this.segment(values, bestIdx, end, out, depth + 1);
  }

  private mean(values: readonly number[], start: number, end: number): number {
    let s = 0;
    for (let i = start; i < end; i += 1) s += values[i];
    return s / Math.max(1, end - start);
  }

  private sse(values: readonly number[], start: number, end: number, mean: number): number {
    let s = 0;
    for (let i = start; i < end; i += 1) {
      const d = values[i] - mean;
      s += d * d;
    }
    return s;
  }

  private validateConfig(c: CpDetectConfig): void {
    if (!Number.isInteger(c.minSegmentSize) || c.minSegmentSize < 2) {
      throw new Error("minSegmentSize must be integer ≥ 2");
    }
    if (!(c.penalty > 0)) throw new Error("penalty must be > 0");
    if (c.maxDepth !== undefined && (!Number.isInteger(c.maxDepth) || c.maxDepth < 1)) {
      throw new Error("maxDepth must be integer ≥ 1");
    }
  }
}

function round4(n: number): number {
  return Math.round(n * 10000) / 10000;
}

export const changePointDetectionEngine = new ChangePointDetectionEngine();
