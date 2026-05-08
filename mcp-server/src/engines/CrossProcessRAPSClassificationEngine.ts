/**
 * CrossProcessRAPSClassificationEngine — XPROC-NEURAL Tier 5 (T5-02d)
 *
 * Regularized Adaptive Prediction Sets — APS (Romano et al 2020) plus a
 * rank-penalty term that bounds set growth on hard inputs. Documented as
 * a future-extension hook in the APS engine header (1e81c888d); this is
 * that follow-up.
 *
 * Sibling stack:
 *   - CrossProcessConformalPredictionEngine        (regression intervals)
 *   - CrossProcessConformalClassificationEngine    (LAC — fd519f1ab)
 *   - ConformalCalibrationMonitorEngine            (drift detector — 6fa74fb27)
 *   - CrossProcessAPSClassificationEngine          (APS — 1e81c888d)
 *
 * Reference:
 *   - Angelopoulos, Bates, Jordan, Malik (2021). "Uncertainty Sets for
 *     Image Classifiers using Conformal Prediction." ICLR. (the canonical
 *     RAPS paper, in particular §3.2 on the regularization-rank penalty)
 *   - Romano, Sesia, Candès (2020). NeurIPS. (APS — RAPS reduces to APS
 *     when λ = 0)
 *
 * Algorithm (deterministic RAPS, no randomization for shop-floor reproducibility):
 *
 *   Score for label y given probs vector p:
 *     Sort classes descending by probs, stable ascending-index tiebreak.
 *     Find rank r ∈ {1,...,K} such that the r-th class is y.
 *     APS-base score: cum[r] = sum_{i=1..r} p[π(i)]   (cumulative top-r)
 *     RAPS penalty:   pen[r] = λ · max(0, r - k_reg)
 *     RAPS score:     s = cum[r] + pen[r]
 *
 *   The penalty is zero when r ≤ k_reg (the "free" rank window) and
 *   grows linearly past it. λ controls the slope. Calibration scores
 *   inherit the penalty term — it gets baked into q̂.
 *
 *   Calibration:
 *     For each (probs_i, y_i), compute s_i = RAPS score above.
 *     Sort ascending. q̂ = sortedScores[ceil((N+1)(1-α)) - 1].
 *     If rank > N → q̂ = +∞ (full-set fallback, unbounded penalty admits all).
 *
 *   Prediction set (greedy walk with per-rank penalty):
 *     Sort classes descending by probs.
 *     Walk r = 1..K, accumulating cum[r] = cum[r-1] + p[π(r)]
 *     and computing s[r] = cum[r] + λ·max(0, r-k_reg).
 *     Always include the r-th class.
 *     Stop the moment s[r] ≥ q̂. (At least argmax is always included.)
 *
 *     Equivalence to APS at λ = 0: pen ≡ 0 → s = cum, recovering APS exactly.
 *
 * Marginal coverage (Angelopoulos et al 2021, Thm 1):
 *   Same conformal guarantee as LAC and APS — for (X, Y) exchangeable
 *   with the calibration set,
 *     P(Y ∈ S(X)) ≥ 1 − α
 *   regardless of λ or k_reg. Tuning these only affects EFFICIENCY (set
 *   size distribution) and the upper-bound on set cardinality.
 *
 * Why it's safer than APS for production:
 *   On a high-K classification problem (e.g., the future 20-class material
 *   identifier extension), APS can return very large sets when the
 *   underlying classifier is uncertain. RAPS caps that pathology by
 *   penalizing classes added past rank k_reg. With λ tuned so q̂ ≈ k_reg
 *   for typical inputs, the average set size stays near k_reg even on
 *   adversarial / shifted inputs.
 *
 *   For our current 3-class problem (success/failure/operator_override),
 *   set sizes are already bounded by K=3, so the practical benefit shows
 *   up only as we extend to richer label spaces — but shipping the
 *   primitive now means the wiring is ready when we get there.
 *
 * Failure modes covered:
 *   1. Empty calibration on predictionSet → invalid_state
 *   2. probs not on simplex → invalid_input
 *   3. label outside [0, numClasses) → invalid_input
 *   4. probs.length != lockedNumClasses → invalid_input
 *   5. α outside (0, 1) → invalid_input
 *   6. λ < 0 → invalid_input (negative regularization is nonsensical)
 *   7. k_reg < 1 or > numClasses → invalid_input
 *   8. Pair count > MAX_CALIBRATION_PAIRS → invalid_input (DoS guard)
 *   9. Re-calibrate with append=false fully replaces + unlocks numClasses
 *  10. Re-calibrate with append=true requires lambda + k_reg unchanged
 *      (different reg = incompatible scores; merging would corrupt q̂)
 *  11. Tied probabilities → stable index-asc tiebreak (deterministic)
 *
 * Acceptance:
 *   λ=0 reproduces APS scores byte-for-byte on identical (probs, label)
 *   inputs. λ>0 yields strictly larger scores on r > k_reg (and equal on
 *   r ≤ k_reg). Marginal coverage holds on synthetic test data with both
 *   λ=0 and λ=0.1 against α=0.1.
 *
 * @module CrossProcessRAPSClassificationEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

const MAX_CALIBRATION_PAIRS = 100_000;
const DEFAULT_ALPHA = 0.1;
/** Default regularization weight λ. 0.01 is conservative — recovers APS-like
 *  behaviour on small-K problems while still capping set-size on rare
 *  high-K future extensions. The Angelopoulos et al ImageNet-1000
 *  experiments use λ=0.01 with k_reg=1 as the default sweet spot. */
const DEFAULT_LAMBDA = 0.01;
/** Default regularization rank k_reg. 1 means "every class added past the
 *  argmax incurs a small penalty"; with the small DEFAULT_LAMBDA this
 *  nudges sets toward singletons without blocking necessary widening. */
const DEFAULT_K_REG = 1;
const SIMPLEX_SUM_TOLERANCE = 1e-4;
const MAX_NUM_CLASSES = 1024;

// ============================================================================
// Schemas
// ============================================================================

const PairSchema = z.object({
  probs: z.array(z.number().finite().min(0).max(1)).min(2).max(MAX_NUM_CLASSES),
  label: z.number().int().nonnegative(),
});

const CalibrateInputSchema = z.object({
  pairs: z.array(PairSchema).min(1).max(MAX_CALIBRATION_PAIRS),
  append: z.boolean().default(true),
  numClasses: z.number().int().min(2).max(MAX_NUM_CLASSES).optional(),
  /** Regularization weight. Must match across appends (different λ ⇒
   *  incompatible scores; q̂ would be invalid on a merged set). */
  lambda: z.number().min(0).optional(),
  /** Regularization rank — penalty fires when the true-label rank exceeds
   *  this. Must satisfy 1 ≤ k_reg ≤ numClasses. */
  kReg: z.number().int().min(1).optional(),
});

const PredictionSetInputSchema = z.object({
  probs: z.array(z.number().finite().min(0).max(1)).min(2).max(MAX_NUM_CLASSES),
  alpha: z.number().gt(0).lt(1).default(DEFAULT_ALPHA),
});

// ============================================================================
// Public types
// ============================================================================

export interface RegularizationConfig {
  lambda: number;
  kReg: number;
}

export interface CalibrationStats {
  size: number;
  numClasses: number;
  meanScore: number;
  medianScore: number;
  maxScore: number;
  minScore: number;
  reg: RegularizationConfig;
}

export interface CalibrateOk {
  ok: true;
  stats: CalibrationStats;
  appendedCount: number;
  totalCount: number;
}

export interface PredictionSetOk {
  ok: true;
  classes: number[];
  size: number;
  qHat: number;
  rankUsed: number;
  calibrationSize: number;
  alpha: number;
  fullSet: boolean;
  reg: RegularizationConfig;
  warnings: string[];
}

export interface OpErr {
  ok: false;
  error: "invalid_input" | "invalid_state";
  message: string;
}

export type CalibrateResult = CalibrateOk | OpErr;
export type PredictionSetResult = PredictionSetOk | OpErr;

// ============================================================================
// Engine state
// ============================================================================

interface EngineState {
  sortedScores: number[];
  lockedNumClasses: number;
  lockedReg: RegularizationConfig | null;
}

function freshState(): EngineState {
  return { sortedScores: [], lockedNumClasses: -1, lockedReg: null };
}

let state: EngineState = freshState();

// ============================================================================
// Helpers
// ============================================================================

function isOnSimplex(probs: readonly number[]): boolean {
  let sum = 0;
  for (const p of probs) {
    if (!Number.isFinite(p) || p < 0 || p > 1) return false;
    sum += p;
  }
  return Math.abs(sum - 1) <= SIMPLEX_SUM_TOLERANCE;
}

/**
 * Compute the RAPS score for label `label` given probs vector under the
 * specified (lambda, kReg) regularization. Uses stable descending sort
 * with ascending-index tiebreak to match the prediction-set walk exactly.
 */
function rapsScore(
  probs: readonly number[],
  label: number,
  lambda: number,
  kReg: number,
): number {
  const order: number[] = new Array(probs.length);
  for (let i = 0; i < probs.length; i++) order[i] = i;
  order.sort((a, b) => {
    const pa = probs[a];
    const pb = probs[b];
    if (pa !== pb) return pb - pa;
    return a - b;
  });
  let cumulative = 0;
  for (let r = 0; r < order.length; r++) {
    cumulative += probs[order[r]];
    if (order[r] === label) {
      // Ranks are 1-indexed in the paper; r is 0-indexed here, so the
      // paper's "r" is (r + 1).
      const oneBasedRank = r + 1;
      const penalty = lambda * Math.max(0, oneBasedRank - kReg);
      return cumulative + penalty;
    }
  }
  return cumulative;
}

/**
 * Build the RAPS prediction set: greedy descending walk, including each
 * rank's class until the cumulative+penalty score crosses q̂. Always
 * includes argmax to preserve coverage at degenerate-small q̂.
 */
function rapsPredictionSet(
  probs: readonly number[],
  qHat: number,
  lambda: number,
  kReg: number,
): number[] {
  const order: number[] = new Array(probs.length);
  for (let i = 0; i < probs.length; i++) order[i] = i;
  order.sort((a, b) => {
    const pa = probs[a];
    const pb = probs[b];
    if (pa !== pb) return pb - pa;
    return a - b;
  });
  const included: number[] = [];
  let cumulative = 0;
  for (let r = 0; r < order.length; r++) {
    cumulative += probs[order[r]];
    included.push(order[r]);
    const oneBasedRank = r + 1;
    const score = cumulative + lambda * Math.max(0, oneBasedRank - kReg);
    if (score >= qHat - 1e-12) break;
  }
  return included.sort((a, b) => a - b);
}

function mergeIntoSorted(sortedDest: number[], incoming: number[]): number[] {
  if (incoming.length === 0) return sortedDest;
  const incomingSorted = [...incoming].sort((a, b) => a - b);
  const out: number[] = new Array(sortedDest.length + incomingSorted.length);
  let i = 0, j = 0, k = 0;
  while (i < sortedDest.length && j < incomingSorted.length) {
    if (sortedDest[i] <= incomingSorted[j]) out[k++] = sortedDest[i++];
    else out[k++] = incomingSorted[j++];
  }
  while (i < sortedDest.length) out[k++] = sortedDest[i++];
  while (j < incomingSorted.length) out[k++] = incomingSorted[j++];
  return out;
}

function summarize(sorted: number[]): { meanScore: number; medianScore: number; maxScore: number; minScore: number } {
  const n = sorted.length;
  if (n === 0) return { meanScore: 0, medianScore: 0, maxScore: 0, minScore: 0 };
  let sum = 0;
  for (const v of sorted) sum += v;
  const mid = n >> 1;
  const median = (n & 1) === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { meanScore: sum / n, medianScore: median, maxScore: sorted[n - 1], minScore: sorted[0] };
}

// ============================================================================
// Engine API
// ============================================================================

export class CrossProcessRAPSClassificationEngine {
  /**
   * Ingest calibration pairs. Computes RAPS scores under the given
   * (lambda, kReg) regularization and merges into the sorted state.
   * Locks numClasses + regularization on first call.
   */
  static calibrate(input: unknown): CalibrateResult {
    const parsed = CalibrateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `calibrate: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const { pairs, append, numClasses: declaredNumClasses, lambda: declaredLambda, kReg: declaredKReg } = parsed.data;

    const inferredK = pairs[0].probs.length;
    const targetK = declaredNumClasses
      ?? (state.lockedNumClasses > 0 && append ? state.lockedNumClasses : inferredK);
    if (targetK < 2 || targetK > MAX_NUM_CLASSES) {
      return { ok: false, error: "invalid_input", message: `calibrate: numClasses ${targetK} outside [2, ${MAX_NUM_CLASSES}]` };
    }

    // Resolve regularization. Append must reuse the locked config; replace
    // takes the new declared values (or defaults).
    let lambda: number;
    let kReg: number;
    if (append && state.lockedReg !== null) {
      lambda = declaredLambda ?? state.lockedReg.lambda;
      kReg = declaredKReg ?? state.lockedReg.kReg;
      if (lambda !== state.lockedReg.lambda || kReg !== state.lockedReg.kReg) {
        return {
          ok: false,
          error: "invalid_input",
          message: `calibrate: append with reg (lambda=${lambda}, kReg=${kReg}) but engine locked at (lambda=${state.lockedReg.lambda}, kReg=${state.lockedReg.kReg}); use append=false to switch`,
        };
      }
    } else {
      lambda = declaredLambda ?? DEFAULT_LAMBDA;
      kReg = declaredKReg ?? DEFAULT_K_REG;
    }
    if (lambda < 0) {
      return { ok: false, error: "invalid_input", message: `calibrate: lambda must be >= 0 (got ${lambda})` };
    }
    if (kReg < 1 || kReg > targetK) {
      return { ok: false, error: "invalid_input", message: `calibrate: kReg ${kReg} outside [1, ${targetK}]` };
    }

    if (append && state.lockedNumClasses > 0 && state.lockedNumClasses !== targetK) {
      return {
        ok: false,
        error: "invalid_input",
        message: `calibrate: append with numClasses=${targetK} but engine locked at ${state.lockedNumClasses}; use append=false to switch`,
      };
    }

    const newScores: number[] = new Array(pairs.length);
    for (let p = 0; p < pairs.length; p++) {
      const { probs, label } = pairs[p];
      if (probs.length !== targetK) {
        return { ok: false, error: "invalid_input", message: `calibrate: pair ${p} has ${probs.length} classes, expected ${targetK}` };
      }
      if (label < 0 || label >= targetK) {
        return { ok: false, error: "invalid_input", message: `calibrate: pair ${p} label ${label} outside [0, ${targetK})` };
      }
      if (!isOnSimplex(probs)) {
        return { ok: false, error: "invalid_input", message: `calibrate: pair ${p} probs not on simplex` };
      }
      newScores[p] = rapsScore(probs, label, lambda, kReg);
    }
    const sortedBefore = append ? state.sortedScores : [];
    const merged = mergeIntoSorted(sortedBefore, newScores);
    if (merged.length > MAX_CALIBRATION_PAIRS) {
      return {
        ok: false,
        error: "invalid_input",
        message: `calibrate: total ${merged.length} exceeds MAX_CALIBRATION_PAIRS=${MAX_CALIBRATION_PAIRS}`,
      };
    }
    state = {
      sortedScores: merged,
      lockedNumClasses: targetK,
      lockedReg: { lambda, kReg },
    };
    return {
      ok: true,
      stats: { size: merged.length, numClasses: targetK, ...summarize(merged), reg: { lambda, kReg } },
      appendedCount: pairs.length,
      totalCount: merged.length,
    };
  }

  /**
   * Compute the RAPS prediction set for a new probability vector under
   * the locked (lambda, kReg) regularization.
   */
  static predictionSet(input: unknown): PredictionSetResult {
    const parsed = PredictionSetInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false,
        error: "invalid_input",
        message: `predictionSet: ${parsed.error.issues.map((i) => i.message).join("; ")}`,
      };
    }
    const { probs, alpha } = parsed.data;
    const n = state.sortedScores.length;
    if (n === 0 || state.lockedReg === null) {
      return { ok: false, error: "invalid_state", message: "predictionSet: calibration set is empty — call calibrate() first" };
    }
    const k = state.lockedNumClasses;
    if (probs.length !== k) {
      return {
        ok: false,
        error: "invalid_input",
        message: `predictionSet: probs.length=${probs.length} does not match locked numClasses=${k}`,
      };
    }
    if (!isOnSimplex(probs)) {
      return { ok: false, error: "invalid_input", message: `predictionSet: probs not on simplex` };
    }
    const { lambda, kReg } = state.lockedReg;
    const rank = Math.ceil((n + 1) * (1 - alpha));
    let qHat: number;
    let fullSet = false;
    const warnings: string[] = [];
    if (rank > n) {
      // Insufficient calibration: q̂ saturates above any possible score
      // (max score = 1 + λ·(K-kReg)) so the walk always reaches break.
      qHat = 1 + lambda * Math.max(0, k - kReg) + 1;
      fullSet = true;
      warnings.push(
        `insufficient calibration: rank ${rank} > N=${n}; falling back to full label set. Add more pairs or relax alpha.`,
      );
    } else {
      qHat = state.sortedScores[rank - 1];
    }
    const classes = rapsPredictionSet(probs, qHat, lambda, kReg);
    return {
      ok: true,
      classes,
      size: classes.length,
      qHat,
      rankUsed: rank,
      calibrationSize: n,
      alpha,
      fullSet,
      reg: { lambda, kReg },
      warnings,
    };
  }

  static getStats(): CalibrationStats {
    return {
      size: state.sortedScores.length,
      numClasses: state.lockedNumClasses < 0 ? 0 : state.lockedNumClasses,
      ...summarize(state.sortedScores),
      reg: state.lockedReg ?? { lambda: DEFAULT_LAMBDA, kReg: DEFAULT_K_REG },
    };
  }

  static reset(): void {
    state = freshState();
  }

  static constants(): {
    MAX_CALIBRATION_PAIRS: number;
    DEFAULT_ALPHA: number;
    DEFAULT_LAMBDA: number;
    DEFAULT_K_REG: number;
    SIMPLEX_SUM_TOLERANCE: number;
    MAX_NUM_CLASSES: number;
  } {
    return {
      MAX_CALIBRATION_PAIRS,
      DEFAULT_ALPHA,
      DEFAULT_LAMBDA,
      DEFAULT_K_REG,
      SIMPLEX_SUM_TOLERANCE,
      MAX_NUM_CLASSES,
    };
  }
}

export const crossProcessRAPSClassificationEngine = CrossProcessRAPSClassificationEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessRAPSClassification(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_raps_calibrate":
      return CrossProcessRAPSClassificationEngine.calibrate(params);
    case "xproc_raps_set":
      return CrossProcessRAPSClassificationEngine.predictionSet(params);
    case "xproc_raps_stats":
      return CrossProcessRAPSClassificationEngine.getStats();
    case "xproc_raps_reset":
      CrossProcessRAPSClassificationEngine.reset();
      return { ok: true };
    case "xproc_raps_constants":
      return CrossProcessRAPSClassificationEngine.constants();
    default:
      throw new Error(`crossProcessRAPSClassification: unknown action '${action}'`);
  }
}
