/**
 * CAMConfidenceCalibrationEngine — CAM-EXHAUST-MS0/U-CAM119
 *
 * Decision-confidence calibration & uncertainty quantification for CAM AGI
 * decisions. Wraps the orchestrator's raw composite confidence into a
 * calibrated probability that the decision will actually be correct in
 * production, plus an uncertainty interval. Distinct from the existing
 * PredictionCalibrationEngine (Bayesian Kienzle/Taylor coefficient fitting)
 * and CalibrationEngine (Levenberg-Marquardt physics-model fitting).
 *
 * Methods (selectable per call, or auto-recommended by recommendMethod()):
 *
 *   1. histogram      — equal-width bins over [0,1]; calibrated = empirical
 *                        accuracy in the matching bin. Robust, low-data
 *                        baseline. Default.
 *   2. isotonic       — pool-adjacent-violators (PAV) algorithm enforces a
 *                        monotonic raw→calibrated mapping. Non-parametric
 *                        and asymptotically optimal under the calibration
 *                        loss. Good for >50 outcomes.
 *   3. platt          — fit P(correct | raw) = sigmoid(A·raw + B) via
 *                        Newton-Raphson on the log-likelihood. Parametric
 *                        and stable on small samples (<50 outcomes) when
 *                        the underlying confidence-accuracy relation is
 *                        approximately monotonic-S.
 *
 * Reliability metrics:
 *   - ECE (Expected Calibration Error) — weighted-mean |confidence - accuracy|
 *     across populated bins. ECE→0 ⇒ perfectly calibrated.
 *   - MCE (Maximum Calibration Error) — worst-bin gap. Robust to outliers.
 *   - Brier score — mean (predicted_prob - was_correct)² across all outcomes.
 *
 * Uncertainty interval: Wilson score 95% CI around the bin's empirical
 * accuracy (preferred over normal approx for small n / extreme p).
 *
 * Storage: per-task-kind ring buffer of outcomes (default cap 10000 each,
 * FIFO eviction). Per-process; persistence is intentionally out of scope.
 *
 * Integration: feeds CAMDeepLearningOrchestratorEngine output through
 * calibrateDecision(decision) to attach calibrated confidence + interval
 * without modifying the orchestrator.
 *
 * References:
 *   - Niculescu-Mizil & Caruana 2005 — "Predicting Good Probabilities With
 *     Supervised Learning" — empirical comparison of histogram/isotonic/Platt.
 *   - Guo et al. 2017 — "On Calibration of Modern Neural Networks" — ECE and
 *     reliability-diagram methodology.
 *   - Wilson 1927 — score interval for binomial proportions.
 *   - Platt 1999 — "Probabilistic Outputs for Support Vector Machines and
 *     Comparisons to Regularized Likelihood Methods."
 */

import type {
  AGIDecision,
  AGIDecisionTask,
} from "./CAMDeepLearningOrchestratorEngine.js";

// ═══════════════════════════════════════════════════════════════════════════
// CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/** Default histogram bin count (10 bins of width 0.1 over [0,1]). */
const DEFAULT_BIN_COUNT = 10;
/** Per-task-kind outcome ring buffer cap before FIFO eviction. */
const DEFAULT_OUTCOME_CAP = 10_000;
/** Minimum outcome count before histogram calibration is considered reliable. */
const MIN_HISTOGRAM_OUTCOMES = 20;
/** Minimum outcome count before isotonic regression is considered reliable. */
const MIN_ISOTONIC_OUTCOMES = 50;
/** Minimum outcome count before Platt scaling is considered reliable. */
const MIN_PLATT_OUTCOMES = 30;
/** Newton-Raphson max iterations for Platt sigmoid fit. */
const PLATT_MAX_ITER = 100;
/** Newton-Raphson convergence threshold for Platt parameter delta. */
const PLATT_CONVERGENCE_EPS = 1e-6;
/** Bayesian prior pseudo-counts to prevent log(0) / divide-by-zero in Platt. */
const PLATT_PRIOR_POS = 1;
const PLATT_PRIOR_NEG = 1;
/** Wilson 95% z-score (two-sided). */
const WILSON_Z_95 = 1.959963984540054;
/** Confidence range bounds — clamp inputs into this range to avoid NaN. */
const CONFIDENCE_MIN = 0;
const CONFIDENCE_MAX = 1;
/** Clamp epsilon to keep sigmoid logits finite during Platt fit. */
const SIGMOID_CLAMP_EPS = 1e-9;

// ═══════════════════════════════════════════════════════════════════════════
// TYPES
// ═══════════════════════════════════════════════════════════════════════════

export type CalibrationMethod = "histogram" | "isotonic" | "platt" | "raw";

export interface CalibrationOutcome {
  decisionId: string;
  task: AGIDecisionTask;
  predictedConfidence: number;
  wasCorrect: boolean;
  recordedAt: number;
}

export interface ReliabilityBin {
  binIndex: number;
  /** Inclusive low edge of the bin, [0, 1]. */
  lower: number;
  /** Exclusive upper edge of the bin (last bin uses inclusive 1). */
  upper: number;
  /** Number of outcomes whose predicted confidence fell in this bin. */
  count: number;
  /** Mean predicted confidence inside the bin. */
  meanConfidence: number;
  /** Empirical accuracy = correct / count. */
  accuracy: number;
  /** Wilson 95% lower bound on accuracy. */
  accuracyLower95: number;
  /** Wilson 95% upper bound on accuracy. */
  accuracyUpper95: number;
}

export interface CalibrationMetrics {
  task: AGIDecisionTask | "all";
  outcomeCount: number;
  /** Brier score (mean squared error). Lower is better. */
  brierScore: number;
  /** Expected Calibration Error — weighted across populated bins. */
  ece: number;
  /** Maximum Calibration Error — worst-bin gap. */
  mce: number;
  /** Per-bin reliability data (empty if no outcomes). */
  bins: ReliabilityBin[];
  /** Method recommended given current outcome count + variance. */
  recommendedMethod: CalibrationMethod;
}

export interface CalibrateResult {
  rawConfidence: number;
  calibratedConfidence: number;
  /** [low, high] 95% interval around the calibrated value. */
  uncertaintyInterval: [number, number];
  method: CalibrationMethod;
  /** True when the calibration mapping was actually applied (sufficient data). */
  calibrated: boolean;
  /** Optional explanation for why this method was chosen / fell back. */
  rationale: string;
}

export interface CalibrationOptions {
  method?: CalibrationMethod;
  task?: AGIDecisionTask;
  /** Override bin count for histogram method (default 10). */
  binCount?: number;
}

// ═══════════════════════════════════════════════════════════════════════════
// ENGINE
// ═══════════════════════════════════════════════════════════════════════════

export class CAMConfidenceCalibrationEngine {
  private static outcomesByTask: Map<AGIDecisionTask, CalibrationOutcome[]> = new Map();
  private static globalOutcomes: CalibrationOutcome[] = [];
  private static outcomeCap: number = DEFAULT_OUTCOME_CAP;

  /** Override the per-task ring-buffer cap. Tests use small caps to verify FIFO. */
  static setOutcomeCap(cap: number): void {
    if (!Number.isFinite(cap) || cap < 1) {
      throw new Error(`outcomeCap must be a positive integer, got ${cap}`);
    }
    this.outcomeCap = Math.floor(cap);
    this.evictAll();
  }

  /** Drop all stored outcomes. Test hook. */
  static clearOutcomes(): void {
    this.outcomesByTask.clear();
    this.globalOutcomes = [];
  }

  /** Total outcome count, optionally filtered by task. */
  static getOutcomeCount(task?: AGIDecisionTask): number {
    if (task) {
      return this.outcomesByTask.get(task)?.length ?? 0;
    }
    return this.globalOutcomes.length;
  }

  /**
   * Record a labeled outcome. The orchestrator emits a confidence; later the
   * shop floor reports whether the chosen value was actually correct (based
   * on operator override, downstream success/failure, or A/B comparison).
   */
  static recordOutcome(args: {
    decisionId: string;
    task: AGIDecisionTask;
    predictedConfidence: number;
    wasCorrect: boolean;
    recordedAt?: number;
  }): CalibrationOutcome {
    if (!args || typeof args.decisionId !== "string" || args.decisionId.length === 0) {
      throw new Error("recordOutcome: decisionId must be a non-empty string");
    }
    if (typeof args.task !== "string" || args.task.length === 0) {
      throw new Error("recordOutcome: task must be a non-empty string");
    }
    if (typeof args.predictedConfidence !== "number" || !Number.isFinite(args.predictedConfidence)) {
      throw new Error("recordOutcome: predictedConfidence must be a finite number");
    }
    if (typeof args.wasCorrect !== "boolean") {
      throw new Error("recordOutcome: wasCorrect must be a boolean");
    }

    const outcome: CalibrationOutcome = {
      decisionId: args.decisionId,
      task: args.task,
      predictedConfidence: clampConfidence(args.predictedConfidence),
      wasCorrect: args.wasCorrect,
      recordedAt: args.recordedAt ?? Date.now(),
    };

    let perTask = this.outcomesByTask.get(args.task);
    if (!perTask) {
      perTask = [];
      this.outcomesByTask.set(args.task, perTask);
    }
    perTask.push(outcome);
    this.globalOutcomes.push(outcome);
    this.evictForTask(args.task);
    this.evictGlobal();
    return outcome;
  }

  /**
   * Calibrate a raw confidence value into a calibrated probability + interval.
   * If insufficient historical outcomes exist, falls back to method="raw"
   * with a wide default interval and calibrated=false.
   */
  static calibrate(rawConfidence: number, opts: CalibrationOptions = {}): CalibrateResult {
    if (typeof rawConfidence !== "number" || !Number.isFinite(rawConfidence)) {
      throw new Error("calibrate: rawConfidence must be a finite number");
    }
    const raw = clampConfidence(rawConfidence);
    const requestedMethod: CalibrationMethod = opts.method ?? "histogram";
    const binCount = Math.max(2, Math.floor(opts.binCount ?? DEFAULT_BIN_COUNT));
    const outcomes = this.getOutcomes(opts.task);

    if (outcomes.length === 0) {
      return {
        rawConfidence: raw,
        calibratedConfidence: raw,
        uncertaintyInterval: [CONFIDENCE_MIN, CONFIDENCE_MAX],
        method: "raw",
        calibrated: false,
        rationale: `no outcomes recorded${opts.task ? ` for task=${opts.task}` : ""}; returning raw confidence with full uncertainty`,
      };
    }

    // Resolve the actual method based on data sufficiency for the request.
    const resolved = this.resolveMethod(requestedMethod, outcomes.length);

    if (resolved === "histogram") {
      return this.calibrateHistogram(raw, outcomes, binCount);
    }
    if (resolved === "isotonic") {
      return this.calibrateIsotonic(raw, outcomes);
    }
    if (resolved === "platt") {
      return this.calibratePlatt(raw, outcomes);
    }

    // Fallback (resolved === "raw"): not enough data for any method.
    return {
      rawConfidence: raw,
      calibratedConfidence: raw,
      uncertaintyInterval: this.wilsonInterval(raw, outcomes.length),
      method: "raw",
      calibrated: false,
      rationale: `insufficient outcomes (${outcomes.length}) for method=${requestedMethod}; minimum thresholds: histogram=${MIN_HISTOGRAM_OUTCOMES}, platt=${MIN_PLATT_OUTCOMES}, isotonic=${MIN_ISOTONIC_OUTCOMES}`,
    };
  }

  /**
   * Convenience: take an orchestrator AGIDecision and return a calibrated
   * version with calibratedConfidence + uncertaintyInterval attached. When
   * no explicit method is provided, the best available method is chosen
   * automatically via recommendMethod() — isotonic when ≥50 outcomes,
   * histogram when ≥20, else falls back to raw.
   */
  static calibrateDecision<V>(
    decision: AGIDecision<V>,
    opts: CalibrationOptions = {}
  ): CalibrateResult {
    if (!decision || typeof decision !== "object") {
      throw new Error("calibrateDecision: decision must be a non-null AGIDecision");
    }
    const task = opts.task ?? decision.task;
    const method = opts.method ?? this.recommendMethod(task);
    return this.calibrate(decision.confidence, { ...opts, task, method });
  }

  /**
   * Compute reliability metrics (ECE, MCE, Brier, per-bin accuracy) for the
   * recorded outcome history. Filter by task or aggregate across all tasks.
   */
  static metrics(opts: { task?: AGIDecisionTask; binCount?: number } = {}): CalibrationMetrics {
    const outcomes = this.getOutcomes(opts.task);
    const binCount = Math.max(2, Math.floor(opts.binCount ?? DEFAULT_BIN_COUNT));

    if (outcomes.length === 0) {
      return {
        task: opts.task ?? "all",
        outcomeCount: 0,
        brierScore: 0,
        ece: 0,
        mce: 0,
        bins: [],
        recommendedMethod: "raw",
      };
    }

    const bins = this.buildBins(outcomes, binCount);

    // ECE = Σ (n_b / N) · |confidence_b - accuracy_b|, only over populated bins.
    let weightedGap = 0;
    let mce = 0;
    for (const b of bins) {
      if (b.count === 0) continue;
      const gap = Math.abs(b.meanConfidence - b.accuracy);
      weightedGap += (b.count / outcomes.length) * gap;
      if (gap > mce) mce = gap;
    }

    // Brier = mean (p - y)²
    let brierSum = 0;
    for (const o of outcomes) {
      const y = o.wasCorrect ? 1 : 0;
      brierSum += (o.predictedConfidence - y) ** 2;
    }
    const brierScore = brierSum / outcomes.length;

    return {
      task: opts.task ?? "all",
      outcomeCount: outcomes.length,
      brierScore,
      ece: weightedGap,
      mce,
      bins,
      recommendedMethod: this.recommendMethod(opts.task),
    };
  }

  /**
   * Pick a calibration method given the available data. Prefer isotonic when
   * we have enough outcomes (asymptotically optimal); fall back to histogram
   * for moderate samples; Platt for small but non-trivial samples; "raw"
   * when insufficient.
   */
  static recommendMethod(task?: AGIDecisionTask): CalibrationMethod {
    const n = this.getOutcomes(task).length;
    if (n >= MIN_ISOTONIC_OUTCOMES) return "isotonic";
    if (n >= MIN_HISTOGRAM_OUTCOMES) return "histogram";
    if (n >= MIN_PLATT_OUTCOMES) return "platt";
    return "raw";
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALIBRATION METHOD IMPLEMENTATIONS
  // ─────────────────────────────────────────────────────────────────────────

  private static calibrateHistogram(
    raw: number,
    outcomes: CalibrationOutcome[],
    binCount: number
  ): CalibrateResult {
    const bins = this.buildBins(outcomes, binCount);
    const idx = Math.min(binCount - 1, Math.floor(raw * binCount));
    const bin = bins[idx];
    if (bin.count === 0) {
      // Empty bin → fall back to raw with bin's wilson interval (degenerate).
      return {
        rawConfidence: raw,
        calibratedConfidence: raw,
        uncertaintyInterval: this.wilsonInterval(raw, outcomes.length),
        method: "histogram",
        calibrated: false,
        rationale: `histogram bin ${idx} ([${bin.lower.toFixed(2)}, ${bin.upper.toFixed(2)}]) is empty; falling back to raw`,
      };
    }
    return {
      rawConfidence: raw,
      calibratedConfidence: bin.accuracy,
      uncertaintyInterval: [bin.accuracyLower95, bin.accuracyUpper95],
      method: "histogram",
      calibrated: true,
      rationale: `histogram bin ${idx} ([${bin.lower.toFixed(2)}, ${bin.upper.toFixed(2)}]) accuracy=${bin.accuracy.toFixed(3)} from ${bin.count} outcomes`,
    };
  }

  private static calibrateIsotonic(
    raw: number,
    outcomes: CalibrationOutcome[]
  ): CalibrateResult {
    // 1. Sort outcomes by predicted confidence ascending.
    const sorted = [...outcomes].sort(
      (a, b) => a.predictedConfidence - b.predictedConfidence
    );
    // 2. Build sequence of (x_i, y_i) where y_i ∈ {0, 1}.
    const pav = poolAdjacentViolators(sorted.map((o) => (o.wasCorrect ? 1 : 0)));
    // 3. Find the segment containing raw and return its fitted value.
    let calibrated = pav[0];
    for (let i = 0; i < sorted.length; i++) {
      if (sorted[i].predictedConfidence > raw) break;
      calibrated = pav[i];
    }
    return {
      rawConfidence: raw,
      calibratedConfidence: calibrated,
      uncertaintyInterval: this.wilsonInterval(calibrated, outcomes.length),
      method: "isotonic",
      calibrated: true,
      rationale: `isotonic regression (PAV) over ${outcomes.length} outcomes; calibrated value=${calibrated.toFixed(3)}`,
    };
  }

  private static calibratePlatt(
    raw: number,
    outcomes: CalibrationOutcome[]
  ): CalibrateResult {
    // Fit P(y=1 | x) = sigmoid(A·x + B). Newton-Raphson on log-likelihood with
    // Bayesian smoothing (PLATT_PRIOR_POS / PLATT_PRIOR_NEG) to prevent
    // overconfidence on small samples.
    let A = 0;
    let B = 0;
    const xs = outcomes.map((o) => o.predictedConfidence);
    const ys = outcomes.map((o) => (o.wasCorrect ? 1 : 0));
    const positivePrior = PLATT_PRIOR_POS;
    const negativePrior = PLATT_PRIOR_NEG;

    for (let iter = 0; iter < PLATT_MAX_ITER; iter++) {
      let g1 = 0;
      let g2 = 0;
      let h11 = 0;
      let h22 = 0;
      let h21 = 0;

      for (let i = 0; i < xs.length; i++) {
        const f = A * xs[i] + B;
        const p = sigmoid(f);
        const t =
          ys[i] === 1
            ? (positivePrior + 1) / (positivePrior + 2)
            : 1 / (negativePrior + 2);
        const d1 = p - t;
        const d2 = p * (1 - p) + SIGMOID_CLAMP_EPS;
        g1 += xs[i] * d1;
        g2 += d1;
        h11 += xs[i] * xs[i] * d2;
        h22 += d2;
        h21 += xs[i] * d2;
      }

      const det = h11 * h22 - h21 * h21;
      if (Math.abs(det) < SIGMOID_CLAMP_EPS) break;
      const dA = (h22 * g1 - h21 * g2) / det;
      const dB = (-h21 * g1 + h11 * g2) / det;
      A -= dA;
      B -= dB;
      if (Math.abs(dA) < PLATT_CONVERGENCE_EPS && Math.abs(dB) < PLATT_CONVERGENCE_EPS) {
        break;
      }
    }

    const calibrated = clampConfidence(sigmoid(A * raw + B));
    return {
      rawConfidence: raw,
      calibratedConfidence: calibrated,
      uncertaintyInterval: this.wilsonInterval(calibrated, outcomes.length),
      method: "platt",
      calibrated: true,
      rationale: `Platt scaling (A=${A.toFixed(3)}, B=${B.toFixed(3)}) over ${outcomes.length} outcomes`,
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // INTERNAL HELPERS
  // ─────────────────────────────────────────────────────────────────────────

  private static getOutcomes(task?: AGIDecisionTask): CalibrationOutcome[] {
    if (task) {
      return this.outcomesByTask.get(task) ?? [];
    }
    return this.globalOutcomes;
  }

  private static buildBins(
    outcomes: CalibrationOutcome[],
    binCount: number
  ): ReliabilityBin[] {
    const bins: ReliabilityBin[] = [];
    for (let i = 0; i < binCount; i++) {
      bins.push({
        binIndex: i,
        lower: i / binCount,
        upper: (i + 1) / binCount,
        count: 0,
        meanConfidence: 0,
        accuracy: 0,
        accuracyLower95: 0,
        accuracyUpper95: 0,
      });
    }
    const sums = bins.map(() => ({ confSum: 0, correct: 0 }));
    for (const o of outcomes) {
      const idx = Math.min(binCount - 1, Math.floor(o.predictedConfidence * binCount));
      bins[idx].count++;
      sums[idx].confSum += o.predictedConfidence;
      if (o.wasCorrect) sums[idx].correct++;
    }
    for (let i = 0; i < binCount; i++) {
      const b = bins[i];
      if (b.count === 0) continue;
      b.meanConfidence = sums[i].confSum / b.count;
      b.accuracy = sums[i].correct / b.count;
      const [lo, hi] = this.wilsonInterval(b.accuracy, b.count);
      b.accuracyLower95 = lo;
      b.accuracyUpper95 = hi;
    }
    return bins;
  }

  /**
   * Wilson score 95% confidence interval for a binomial proportion. Preferred
   * over the normal approximation for small n or extreme p — never produces
   * out-of-range bounds and has correct coverage near 0 and 1.
   */
  private static wilsonInterval(p: number, n: number): [number, number] {
    if (n <= 0) return [CONFIDENCE_MIN, CONFIDENCE_MAX];
    const z = WILSON_Z_95;
    const z2 = z * z;
    const denom = 1 + z2 / n;
    const center = (p + z2 / (2 * n)) / denom;
    const radius = (z * Math.sqrt((p * (1 - p)) / n + z2 / (4 * n * n))) / denom;
    return [
      Math.max(CONFIDENCE_MIN, center - radius),
      Math.min(CONFIDENCE_MAX, center + radius),
    ];
  }

  private static resolveMethod(
    requested: CalibrationMethod,
    n: number
  ): CalibrationMethod {
    if (requested === "raw") return "raw";
    if (requested === "isotonic") {
      return n >= MIN_ISOTONIC_OUTCOMES ? "isotonic" : n >= MIN_HISTOGRAM_OUTCOMES ? "histogram" : "raw";
    }
    if (requested === "platt") {
      return n >= MIN_PLATT_OUTCOMES ? "platt" : "raw";
    }
    // requested === "histogram"
    return n >= MIN_HISTOGRAM_OUTCOMES ? "histogram" : "raw";
  }

  private static evictForTask(task: AGIDecisionTask): void {
    const arr = this.outcomesByTask.get(task);
    if (!arr) return;
    while (arr.length > this.outcomeCap) {
      arr.shift();
    }
  }

  private static evictGlobal(): void {
    while (this.globalOutcomes.length > this.outcomeCap) {
      this.globalOutcomes.shift();
    }
  }

  private static evictAll(): void {
    for (const [, arr] of this.outcomesByTask) {
      while (arr.length > this.outcomeCap) {
        arr.shift();
      }
    }
    while (this.globalOutcomes.length > this.outcomeCap) {
      this.globalOutcomes.shift();
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// PURE HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

function clampConfidence(c: number): number {
  if (!Number.isFinite(c)) return CONFIDENCE_MIN;
  if (c < CONFIDENCE_MIN) return CONFIDENCE_MIN;
  if (c > CONFIDENCE_MAX) return CONFIDENCE_MAX;
  return c;
}

function sigmoid(x: number): number {
  if (x >= 0) {
    const e = Math.exp(-x);
    return 1 / (1 + e);
  }
  const e = Math.exp(x);
  return e / (1 + e);
}

/**
 * Pool-adjacent-violators algorithm (Ayer et al. 1955). Given a sequence of
 * binary observations (0/1) sorted by their independent variable, produce the
 * monotonically non-decreasing sequence of fitted values that minimizes
 * squared error. This is the L2-optimal isotonic regression.
 *
 * O(n) amortized — the inner while loop merges blocks at most n times across
 * the entire scan.
 */
function poolAdjacentViolators(ys: number[]): number[] {
  const n = ys.length;
  if (n === 0) return [];
  // Each "block" stores its sum, count, and starting index.
  const blockSums: number[] = [];
  const blockCounts: number[] = [];
  for (let i = 0; i < n; i++) {
    blockSums.push(ys[i]);
    blockCounts.push(1);
    // Merge with previous block while it violates monotonicity.
    while (blockSums.length > 1) {
      const lastIdx = blockSums.length - 1;
      const prevMean = blockSums[lastIdx - 1] / blockCounts[lastIdx - 1];
      const curMean = blockSums[lastIdx] / blockCounts[lastIdx];
      if (prevMean <= curMean) break;
      blockSums[lastIdx - 1] += blockSums[lastIdx];
      blockCounts[lastIdx - 1] += blockCounts[lastIdx];
      blockSums.pop();
      blockCounts.pop();
    }
  }
  // Expand block means back to per-element fitted values.
  const fitted: number[] = [];
  for (let b = 0; b < blockSums.length; b++) {
    const mean = blockSums[b] / blockCounts[b];
    for (let k = 0; k < blockCounts[b]; k++) fitted.push(mean);
  }
  return fitted;
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export const camConfidenceCalibrationEngine = CAMConfidenceCalibrationEngine;
