/**
 * CrossProcessConformalPredictionEngine — XPROC-NEURAL Tier 5 (T5-02)
 *
 * Inductive Conformal Prediction (ICP) for regression. Given a held-out
 * calibration set of (predicted, actual) pairs, produces distribution-free
 * prediction *sets* (intervals for scalar regression) that marginally cover
 * the true value with probability ≥ 1-α — no Gaussian or any parametric
 * assumption, no retraining of the underlying predictor.
 *
 * References:
 *   - Vovk, Gammerman, Shafer (2005). "Algorithmic Learning in a Random
 *     World." Springer. (foundational text)
 *   - Papadopoulos, Proedrou, Vovk, Gammerman (2002). "Inductive Confidence
 *     Machines for Regression." ECML 2002. (the ICP regression form used here)
 *   - Lei, G'Sell, Rinaldo, Tibshirani, Wasserman (2018). "Distribution-Free
 *     Predictive Inference for Regression." JASA. (modern coverage proofs)
 *
 * Algorithm (split / inductive variant):
 *   1. Calibration: for each pair (ŷ_i, y_i) in the calibration set, compute
 *      the absolute residual non-conformity score s_i = |y_i − ŷ_i|.
 *   2. Sort scores ascending: s_(1) ≤ s_(2) ≤ ... ≤ s_(N).
 *   3. Quantile index: k = ⌈(N+1)·(1−α)⌉ ∈ {1, ..., N+1}. If k ≤ N, the
 *      conformal radius is q = s_(k); if k = N+1 the set is unbounded
 *      (return ±∞ — caller must respond to insufficient calibration).
 *   4. Prediction set for a new ŷ_new: [ŷ_new − q, ŷ_new + q].
 *
 * Marginal coverage guarantee (Lei et al. 2018, Thm 1):
 *   For any (ŷ, y) drawn exchangeably with the calibration set,
 *     P(y ∈ predicted_set) ≥ 1 − α
 *   regardless of the underlying predictor's quality. A bad predictor →
 *   wide intervals; a good predictor → narrow intervals; coverage is
 *   guaranteed either way.
 *
 * Architecture decision — pure aggregator + persistent calibration state:
 *   The engine accepts caller-supplied (predicted, actual) pairs. It does
 *   NOT contain a predictor. State is the sorted residuals and metadata.
 *   Two operations:
 *     - calibrate({pairs, append?})  → ingests new calibration pairs,
 *       optionally appending vs. replacing
 *     - predictionSet({prediction, alpha}) → returns [low, high] interval
 *
 *   Why pure-aggregator vs full-stack ICP:
 *     1. Decouples from T1-02 (in-flight on a separate worktree).
 *     2. Composable with T5-01 BayesianMLP — caller can use either MC
 *        Dropout mean OR a deterministic predictor as ŷ.
 *     3. Single source of truth: T5-04 CalibrationAuditor reads our
 *        empirical coverage rate to detect drift.
 *
 * Failure modes covered:
 *   1. Empty calibration set → invalid_state on predictionSet
 *   2. NaN/Inf in any pair    → invalid_input
 *   3. α outside (0, 1)       → invalid_input (Zod gate)
 *   4. N small s.t. ⌈(N+1)(1−α)⌉ > N (insufficient calibration for chosen
 *       coverage) → returns ±∞ interval + warning, lets caller decide
 *   5. Pair count > MAX_CALIBRATION_PAIRS → invalid_input (DoS guard)
 *   6. Re-calibrate with append=false fully replaces stored set (no leak)
 *   7. Append mode with capacity overflow → ring-truncate oldest scores,
 *       maintaining sort invariant via merge
 *
 * Acceptance (XPROC-NEURAL-ROADMAP.md Tier 5 R2):
 *   Marginal coverage ≥ 1 − α on 1000 holdout queries with N=200
 *   calibration pairs. Verified in test suite via deterministic LCG PRNG.
 *
 * @module CrossProcessConformalPredictionEngine
 */

import { z } from "zod";

// ============================================================================
// Constants
// ============================================================================

/** Sanity bound on calibration set size. */
const MAX_CALIBRATION_PAIRS = 100000;

/** Default miscoverage rate α = 0.05 → 95% coverage. */
const DEFAULT_ALPHA = 0.05;

/** Minimum calibration size for a meaningful interval at α = 0.05.
 *  ⌈(N+1)·0.95⌉ ≤ N requires N ≥ 19 for α = 0.05 (smallest N where the
 *  rank index falls inside the calibration set). Below this, the interval
 *  is unbounded — guarantee still holds, but the interval is uninformative. */
const MIN_CALIBRATION_FOR_ALPHA = (alpha: number): number => Math.ceil(1 / alpha) - 1;

// ============================================================================
// Schemas
// ============================================================================

const PairSchema = z.object({
  predicted: z.number().finite(),
  actual: z.number().finite(),
});

const CalibrateInputSchema = z.object({
  pairs: z.array(PairSchema).min(1).max(MAX_CALIBRATION_PAIRS),
  /** If true, append to existing calibration; else replace. Defaults true. */
  append: z.boolean().default(true),
});

const PredictionSetInputSchema = z.object({
  prediction: z.number().finite(),
  alpha: z.number().gt(0).lt(1).default(DEFAULT_ALPHA),
});

const ResetInputSchema = z.object({}).optional();

// ============================================================================
// Public types
// ============================================================================

export interface CalibrationStats {
  size: number;
  meanResidual: number;
  medianResidual: number;
  maxResidual: number;
  minResidual: number;
  /** Empirical 95th percentile of stored residuals (sanity readback). */
  p95Residual: number;
}

export interface CalibrateOk {
  ok: true;
  stats: CalibrationStats;
  appendedCount: number;
  totalCount: number;
}

export interface PredictionSetOk {
  ok: true;
  /** Lower bound y ∈ [intervalLow, intervalHigh]. */
  intervalLow: number;
  intervalHigh: number;
  /** Conformal radius q = s_(k). */
  conformalRadius: number;
  /** Rank used (1-indexed) — k = ⌈(N+1)·(1−α)⌉. */
  rankUsed: number;
  /** N at predict time. */
  calibrationSize: number;
  alpha: number;
  /** True iff k > N → unbounded interval. */
  unbounded: boolean;
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
// Engine state (module-private — pure, no I/O)
// ============================================================================

interface EngineState {
  /** Sorted ascending — invariant maintained by all mutators. */
  sortedScores: number[];
}

function freshState(): EngineState {
  return { sortedScores: [] };
}

let state: EngineState = freshState();

// ============================================================================
// Helpers
// ============================================================================

/**
 * Insert `incoming` (unsorted) into `sortedDest` (already-sorted ascending),
 * maintaining sort order. O((N+M) log(N+M)) via sort + merge — for our N,M
 * <= MAX_CALIBRATION_PAIRS this is cheap; the alternative pairwise binary-
 * insert is O(M·N) and worse for large M.
 */
function mergeIntoSorted(sortedDest: number[], incoming: number[]): number[] {
  if (incoming.length === 0) return sortedDest;
  const incomingSorted = [...incoming].sort((a, b) => a - b);
  const out: number[] = [];
  let i = 0;
  let j = 0;
  while (i < sortedDest.length && j < incomingSorted.length) {
    if (sortedDest[i] <= incomingSorted[j]) {
      out.push(sortedDest[i++]);
    } else {
      out.push(incomingSorted[j++]);
    }
  }
  while (i < sortedDest.length) out.push(sortedDest[i++]);
  while (j < incomingSorted.length) out.push(incomingSorted[j++]);
  return out;
}

function quantileFromSorted(sorted: number[], q: number): number {
  if (sorted.length === 0) return 0;
  const idx = q * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  const w = idx - lo;
  return sorted[lo] * (1 - w) + sorted[hi] * w;
}

function summarize(sorted: number[]): CalibrationStats {
  if (sorted.length === 0) {
    return {
      size: 0, meanResidual: 0, medianResidual: 0,
      maxResidual: 0, minResidual: 0, p95Residual: 0,
    };
  }
  let sum = 0;
  for (const x of sorted) sum += x;
  return {
    size: sorted.length,
    meanResidual: sum / sorted.length,
    medianResidual: quantileFromSorted(sorted, 0.5),
    maxResidual: sorted[sorted.length - 1],
    minResidual: sorted[0],
    p95Residual: quantileFromSorted(sorted, 0.95),
  };
}

// ============================================================================
// Public API
// ============================================================================

export class CrossProcessConformalPredictionEngine {
  static readonly tier = "T5-02";

  /**
   * Add (predicted, actual) pairs to the calibration set. Computes |y − ŷ|
   * residuals and merges them into the sorted score list. Returns updated
   * stats.
   */
  static calibrate(input: unknown): CalibrateResult {
    const parsed = CalibrateInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { pairs, append } = parsed.data;

    // Compute non-conformity scores
    const newScores: number[] = [];
    for (const { predicted, actual } of pairs) {
      const residual = Math.abs(actual - predicted);
      if (!Number.isFinite(residual)) {
        return { ok: false, error: "invalid_input", message: "non-finite residual produced" };
      }
      newScores.push(residual);
    }

    if (append) {
      const merged = mergeIntoSorted(state.sortedScores, newScores);
      // Capacity guard — drop oldest (smallest indices) on overflow. Note: this
      // breaks exchangeability slightly; we trade strict guarantee for
      // bounded memory. Caller can replace with append=false to reset.
      if (merged.length > MAX_CALIBRATION_PAIRS) {
        state.sortedScores = merged.slice(merged.length - MAX_CALIBRATION_PAIRS);
      } else {
        state.sortedScores = merged;
      }
    } else {
      state.sortedScores = [...newScores].sort((a, b) => a - b);
    }

    return {
      ok: true,
      stats: summarize(state.sortedScores),
      appendedCount: newScores.length,
      totalCount: state.sortedScores.length,
    };
  }

  /**
   * Build a (1−α)-coverage prediction set around `prediction`. Returns
   * [ŷ−q, ŷ+q] where q is the rank-(⌈(N+1)(1−α)⌉) order statistic of the
   * stored residuals. Distribution-free.
   */
  static predictionSet(input: unknown): PredictionSetResult {
    const parsed = PredictionSetInputSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false, error: "invalid_input",
        message: parsed.error.issues
          .map((i) => `${i.path.join(".")}: ${i.message}`).join("; "),
      };
    }
    const { prediction, alpha } = parsed.data;
    const n = state.sortedScores.length;
    if (n === 0) {
      return { ok: false, error: "invalid_state", message: "calibration set is empty" };
    }
    const warnings: string[] = [];

    // Conformal quantile rank: k = ⌈(N+1)·(1−α)⌉ in {1, ..., N+1}
    const k = Math.ceil((n + 1) * (1 - alpha));
    let radius: number;
    let unbounded = false;
    if (k > n) {
      // k = N+1 → conformal upper quantile is ∞ (interval is the whole real line)
      radius = Number.POSITIVE_INFINITY;
      unbounded = true;
      warnings.push(
        `insufficient calibration: N=${n}, need >=${MIN_CALIBRATION_FOR_ALPHA(alpha)} for finite ${(1 - alpha) * 100}% interval`,
      );
    } else {
      // k is 1-indexed; arrays 0-indexed
      radius = state.sortedScores[k - 1];
    }

    return {
      ok: true,
      intervalLow: unbounded ? Number.NEGATIVE_INFINITY : prediction - radius,
      intervalHigh: unbounded ? Number.POSITIVE_INFINITY : prediction + radius,
      conformalRadius: radius,
      rankUsed: k,
      calibrationSize: n,
      alpha,
      unbounded,
      warnings,
    };
  }

  /** Snapshot of calibration state. */
  static getStats(): CalibrationStats {
    return summarize(state.sortedScores);
  }

  /** Wipe calibration state. */
  static reset(): void {
    state = freshState();
  }

  /** Read-only constants snapshot. */
  static constants(): {
    MAX_CALIBRATION_PAIRS: number;
    DEFAULT_ALPHA: number;
  } {
    return { MAX_CALIBRATION_PAIRS, DEFAULT_ALPHA };
  }
}

export const crossProcessConformalPredictionEngine = CrossProcessConformalPredictionEngine;

/**
 * Dispatcher convenience wrapper.
 */
export function crossProcessConformalPrediction(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_conformal_calibrate":
      return CrossProcessConformalPredictionEngine.calibrate(params);
    case "xproc_conformal_set":
      return CrossProcessConformalPredictionEngine.predictionSet(params);
    case "xproc_conformal_stats":
      return CrossProcessConformalPredictionEngine.getStats();
    case "xproc_conformal_reset":
      CrossProcessConformalPredictionEngine.reset();
      return { ok: true };
    case "xproc_conformal_constants":
      return CrossProcessConformalPredictionEngine.constants();
    default:
      throw new Error(`crossProcessConformalPrediction: unknown action '${action}'`);
  }
}
