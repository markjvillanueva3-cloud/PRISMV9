/**
 * CrossProcessAPSClassificationEngine — XPROC-NEURAL Tier 5 (T5-02c)
 *
 * Adaptive Prediction Sets (APS) — split-conformal classification with
 * **smaller average set size** than LAC at the same marginal coverage on
 * heteroskedastic data. Documented as the future-extension hook in the
 * LAC engine's header (fd519f1ab); this is that follow-up.
 *
 * Sibling to:
 *   - CrossProcessConformalPredictionEngine        (regression intervals)
 *   - CrossProcessConformalClassificationEngine    (LAC — fd519f1ab)
 *   - ConformalCalibrationMonitorEngine            (drift detector — 6fa74fb27)
 *
 * Reference:
 *   - Romano, Sesia, Candès (2020). "Classification with Valid and
 *     Adaptive Coverage." NeurIPS. (the canonical APS paper)
 *   - Angelopoulos, Bates, Jordan, Malik (2021). "Uncertainty Sets for
 *     Image Classifiers using Conformal Prediction." ICLR. (RAPS — the
 *     regularised variant; we ship the un-regularised APS form here.)
 *
 * Algorithm (deterministic APS — no randomization for shop-floor
 * reproducibility):
 *
 *   Score for label y given probs vector p:
 *     Sort classes by probs descending: π(1), π(2), ..., π(K).
 *     Find rank r such that π(r) = y.
 *     s(p, y) = sum_{i=1..r} p[π(i)]   ← cumulative top-r probability
 *
 *   Why it's adaptive:
 *     LAC's score 1 - p[y] depends ONLY on the true class's probability.
 *     APS rolls in the cumulative mass of all classes ranked above y, so:
 *       - When the model is confident (one class near 1), correct labels
 *         get tiny scores AND incorrect-but-runner-up classes get scores
 *         near 1 → calibration quantile q̂ stays small → singletons.
 *       - When the model is unsure (uniform prior), correct labels
 *         get scores around (rank/K), incorrect labels also → q̂ grows
 *         → larger sets, but EVERY correct case is covered.
 *
 *   Calibration:
 *     For each (probs_i, y_i), compute s_i = APS score above.
 *     Sort ascending. Quantile rank k = ⌈(N+1)·(1−α)⌉.
 *     If k ≤ N → q̂ = s_(k); if k = N+1 → q̂ = 1 (full set fallback).
 *
 *   Prediction set (greedy unfolding):
 *     Sort classes descending by probs.
 *     Walk r = 1..K, accumulating cumulative top-r probability.
 *     At each step, the class added is included iff cumulative ≤ q̂
 *     OR it's the first class (we always include argmax to preserve
 *     coverage when q̂ is degenerately small — same edge-case handling
 *     as LAC).
 *
 *     Equivalently: smallest set {π(1), ..., π(r)} such that
 *     sum_{i=1..r} probs[π(i)] >= q̂ — and the r-th class is the
 *     boundary class.
 *
 * Marginal coverage (Romano et al. 2020, Thm 1):
 *   For (X, Y) exchangeable with the calibration set,
 *     P(Y ∈ S(X)) ≥ 1 − α
 *   Same guarantee as LAC; the difference is set-size efficiency.
 *
 * Failure modes covered:
 *   1. Empty calibration on predictionSet → invalid_state
 *   2. probs not on simplex (NaN/Inf/sum != 1) → invalid_input
 *   3. label outside [0, numClasses) → invalid_input
 *   4. probs.length != lockedNumClasses → invalid_input (catches drift)
 *   5. α outside (0, 1) → invalid_input
 *   6. Pair count > MAX_CALIBRATION_PAIRS → invalid_input (DoS guard)
 *   7. Re-calibrate with append=false fully replaces + unlocks numClasses
 *   8. N too small for chosen α → q̂ defaults to 1 + warning + fullSet
 *   9. Tied probabilities — APS rank tiebreak deterministic via stable
 *      sort, so re-running the same input always returns the same set.
 *
 * Acceptance:
 *   On synthetic heteroskedastic data (some easy + some hard inputs)
 *   APS average set size is ≤ LAC at the same alpha, while marginal
 *   coverage stays >= 1 − α − 1/N tolerance. Verified deterministically
 *   in the test suite via LCG seed.
 *
 * @module CrossProcessAPSClassificationEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

const MAX_CALIBRATION_PAIRS = 100_000;
const DEFAULT_ALPHA = 0.1;
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
});

const PredictionSetInputSchema = z.object({
  probs: z.array(z.number().finite().min(0).max(1)).min(2).max(MAX_NUM_CLASSES),
  alpha: z.number().gt(0).lt(1).default(DEFAULT_ALPHA),
});

// ============================================================================
// Public types
// ============================================================================

export interface CalibrationStats {
  size: number;
  numClasses: number;
  meanScore: number;
  medianScore: number;
  maxScore: number;
  minScore: number;
}

export interface CalibrateOk {
  ok: true;
  stats: CalibrationStats;
  appendedCount: number;
  totalCount: number;
}

export interface PredictionSetOk {
  ok: true;
  /** Sorted ascending integer class labels in the prediction set. */
  classes: number[];
  /** Cardinality of the set — between 1 and numClasses. */
  size: number;
  /** APS quantile threshold q̂. */
  qHat: number;
  /** Rank used (1-indexed). */
  rankUsed: number;
  /** Calibration set size at predict time. */
  calibrationSize: number;
  alpha: number;
  /** True iff k > N → fall back to full label set. */
  fullSet: boolean;
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
}

function freshState(): EngineState {
  return { sortedScores: [], lockedNumClasses: -1 };
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
 * Compute the APS score for label `label` given probs vector.
 *
 * Definition: rank classes descending by probability (stable sort —
 * ties resolved by class index ascending, so the same input always
 * yields the same score). Find the rank r where the true label lands.
 * s = cumulative probability of the top-r classes.
 *
 * Equivalent closed form:
 *   s(p, y) = p[y] + sum_{c: p[c] > p[y]} p[c]
 *           + (sum of p[c] for c < y with p[c] === p[y])
 *
 * We compute it via the explicit sorted-rank walk because that's what
 * the prediction-set side will mirror — keeping both sides in lockstep
 * eliminates a class of bugs from rank-tiebreak inconsistency.
 */
function apsScore(probs: readonly number[], label: number): number {
  // Build descending-sorted index list with stable tiebreak (smaller
  // class index wins on ties). This matches the prediction-set walk.
  const order: number[] = new Array(probs.length);
  for (let i = 0; i < probs.length; i++) order[i] = i;
  order.sort((a, b) => {
    const pa = probs[a];
    const pb = probs[b];
    if (pa !== pb) return pb - pa; // descending probability
    return a - b;                   // ascending index on tie (stable)
  });
  let cumulative = 0;
  for (let r = 0; r < order.length; r++) {
    cumulative += probs[order[r]];
    if (order[r] === label) return cumulative;
  }
  // Unreachable iff label was in [0, K) — defensive return for tsc.
  return cumulative;
}

/**
 * Build the APS prediction set: greedy descending walk, including the
 * class at each rank until the cumulative score reaches q̂. The class
 * AT the boundary is included (the smallest set whose cumulative
 * probability ≥ q̂). Always includes argmax to preserve coverage at
 * degenerately small q̂.
 */
function apsPredictionSet(probs: readonly number[], qHat: number): number[] {
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
    // Floating-point tolerance: 1e-12 covers double-precision rounding
    // accumulated through K probability adds; smaller than the SIMPLEX
    // tolerance so it can never disagree with the calibration math.
    if (cumulative >= qHat - 1e-12) break;
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

/**
 * CrossProcessAPSClassificationEngine — adaptive split-conformal
 * classification (Romano et al. 2020). Tighter average set size than
 * LAC at the same marginal coverage.
 */
export class CrossProcessAPSClassificationEngine {
  /**
   * Ingest calibration pairs. Computes APS scores and merges them into
   * the sorted state, locking the class count on first call.
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
    const { pairs, append, numClasses: declaredNumClasses } = parsed.data;
    const inferredK = pairs[0].probs.length;
    const targetK = declaredNumClasses ?? (state.lockedNumClasses > 0 && append ? state.lockedNumClasses : inferredK);
    if (targetK < 2 || targetK > MAX_NUM_CLASSES) {
      return { ok: false, error: "invalid_input", message: `calibrate: numClasses ${targetK} outside [2, ${MAX_NUM_CLASSES}]` };
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
      newScores[p] = apsScore(probs, label);
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
    state = { sortedScores: merged, lockedNumClasses: targetK };
    return {
      ok: true,
      stats: { size: merged.length, numClasses: targetK, ...summarize(merged) },
      appendedCount: pairs.length,
      totalCount: merged.length,
    };
  }

  /**
   * Compute the APS prediction set for a new probability vector. Set is
   * the smallest descending-by-probability prefix whose cumulative
   * probability mass exceeds q̂.
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
    if (n === 0) {
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
    const rank = Math.ceil((n + 1) * (1 - alpha));
    let qHat: number;
    let fullSet = false;
    const warnings: string[] = [];
    if (rank > n) {
      qHat = 1;
      fullSet = true;
      warnings.push(
        `insufficient calibration: rank ${rank} > N=${n}; falling back to full label set. Add more calibration pairs or relax alpha.`,
      );
    } else {
      qHat = state.sortedScores[rank - 1];
    }
    const classes = apsPredictionSet(probs, qHat);
    return {
      ok: true,
      classes,
      size: classes.length,
      qHat,
      rankUsed: rank,
      calibrationSize: n,
      alpha,
      fullSet,
      warnings,
    };
  }

  static getStats(): CalibrationStats {
    return {
      size: state.sortedScores.length,
      numClasses: state.lockedNumClasses < 0 ? 0 : state.lockedNumClasses,
      ...summarize(state.sortedScores),
    };
  }

  static reset(): void {
    state = freshState();
  }

  static constants(): {
    MAX_CALIBRATION_PAIRS: number;
    DEFAULT_ALPHA: number;
    SIMPLEX_SUM_TOLERANCE: number;
    MAX_NUM_CLASSES: number;
  } {
    return { MAX_CALIBRATION_PAIRS, DEFAULT_ALPHA, SIMPLEX_SUM_TOLERANCE, MAX_NUM_CLASSES };
  }
}

export const crossProcessAPSClassificationEngine = CrossProcessAPSClassificationEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessAPSClassification(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_aps_calibrate":
      return CrossProcessAPSClassificationEngine.calibrate(params);
    case "xproc_aps_set":
      return CrossProcessAPSClassificationEngine.predictionSet(params);
    case "xproc_aps_stats":
      return CrossProcessAPSClassificationEngine.getStats();
    case "xproc_aps_reset":
      CrossProcessAPSClassificationEngine.reset();
      return { ok: true };
    case "xproc_aps_constants":
      return CrossProcessAPSClassificationEngine.constants();
    default:
      throw new Error(`crossProcessAPSClassification: unknown action '${action}'`);
  }
}
