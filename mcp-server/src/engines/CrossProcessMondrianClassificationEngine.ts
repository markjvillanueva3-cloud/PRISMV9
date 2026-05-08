/**
 * CrossProcessMondrianClassificationEngine — XPROC-NEURAL Tier 5 (T5-02f)
 *
 * Class-conditional split-conformal classification (Mondrian conformal,
 * Vovk 2003). Where LAC/APS/RAPS guarantee MARGINAL coverage
 *   P(Y ∈ S(X)) ≥ 1 − α
 * — averaged over the joint distribution of (X, Y) — Mondrian guarantees
 * coverage CONDITIONAL on the true class:
 *   P(Y ∈ S(X) | Y = c) ≥ 1 − α   for every class c
 *
 * Why this matters for the cross-process NN's 3-class problem
 * (success / failure / operator_override): the labels are imbalanced —
 * operator_override is rare. Marginal coverage of 90% is technically met
 * even if operator_override is under-covered at 60% as long as
 * success and failure are covered at 95%+. Mondrian forces each class
 * to its own α floor, which is exactly the safety guarantee a shop
 * floor needs: every outcome category is honestly bracketed, even the
 * uncommon ones.
 *
 * Sibling stack:
 *   - CrossProcessConformalClassificationEngine    (LAC — fd519f1ab)
 *   - CrossProcessAPSClassificationEngine          (APS — 1e81c888d)
 *   - CrossProcessRAPSClassificationEngine         (RAPS — d4dd74e96)
 *   - ConformalCalibrationMonitorEngine            (drift detector — 6fa74fb27)
 *   - ConformalPredictionLogEngine                 (predictor↔monitor bridge — 208a13df3)
 *
 * References:
 *   - Vovk, Lindsay, Nouretdinov, Gammerman (2003). "Mondrian Confidence
 *     Machine." On-line Compression Modelling project, working paper.
 *     (the foundational treatment of bucket-conditional conformal)
 *   - Angelopoulos, Bates (2023). "Conformal Prediction: A Gentle
 *     Introduction." Foundations and Trends in ML, §5.1 (class-conditional).
 *   - Sadinle, Lei, Wasserman (2019). "Least Ambiguous Set-Valued
 *     Classifiers with Bounded Error Levels." JASA. (LAC — the
 *     non-conformity score used inside each Mondrian bucket here.)
 *
 * Algorithm (Mondrian-LAC, deterministic):
 *
 *   Calibration:
 *     For each (probs_i, y_i), compute s_i = 1 − probs_i[y_i].
 *     Append s_i to bucket[y_i] (one sorted array per class).
 *
 *   Per-class threshold:
 *     For each class c:
 *       N_c = |bucket[c]|
 *       k_c = ceil((N_c + 1) · (1 − α))
 *       If k_c ≤ N_c → q̂[c] = bucket[c]_sorted[k_c]
 *       Else        → q̂[c] = 1   (insufficient cal — full inclusion for c)
 *
 *   Prediction set:
 *     S(x) = { c : 1 − probs[c] ≤ q̂[c] }
 *           = { c : probs[c] ≥ 1 − q̂[c] }
 *     (Argmax fallback retained for the degenerate q̂[c]=0 edge — same
 *      handling as LAC.)
 *
 * Per-class coverage proof sketch (Vovk 2003):
 *   The calibration scores in bucket[c] are exchangeable with any new
 *   test score generated under the same conditional distribution
 *   P(score | Y = c). The standard split-conformal quantile argument
 *   then applies inside each bucket independently. So each per-class
 *   coverage probability is ≥ 1 − α.
 *
 *   The MARGINAL coverage is then a weighted average:
 *     P(Y ∈ S) = Σ_c P(Y = c) · P(Y ∈ S | Y = c) ≥ 1 − α
 *   so Mondrian also marginally covers — strictly stronger than LAC.
 *
 * Trade-off: per-class buckets need enough data each. With N_c too small
 * for the chosen α, that class falls back to full-label inclusion. The
 * test suite exercises this case explicitly.
 *
 * Failure modes covered:
 *   1. Empty calibration on predictionSet              → invalid_state
 *   2. probs not on simplex (NaN/Inf/sum != 1)         → invalid_input
 *   3. label outside [0, numClasses)                   → invalid_input
 *   4. probs.length != lockedNumClasses                → invalid_input
 *   5. α outside (0, 1)                                → invalid_input (Zod gate)
 *   6. Pair count > MAX_CALIBRATION_PAIRS              → invalid_input (DoS guard)
 *   7. Re-calibrate with append=false replaces + unlocks numClasses
 *   8. Bucket starvation (N_c < ceil((N_c+1)(1-α)))    → q̂[c]=1 + warning,
 *      coverage trivially met for that class (full set)
 *   9. Class c never observed in calibration           → q̂[c]=1 (treated
 *      as zero-data bucket — never excludes c at test time)
 *  10. Tied probabilities                              → deterministic via
 *      argmax index ties broken by ascending index (LAC-compatible)
 *
 * @module CrossProcessMondrianClassificationEngine
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

export interface PerClassStats {
  /** Class label index. */
  cls: number;
  /** Number of calibration pairs observed for this class. */
  size: number;
  /** Empirical mean / median / max LAC score in this bucket. */
  meanScore: number;
  medianScore: number;
  maxScore: number;
  minScore: number;
}

export interface CalibrationStats {
  size: number;
  numClasses: number;
  perClass: PerClassStats[];
  /** Smallest bucket size — quick read on whether any class is starved. */
  minBucketSize: number;
  /** Largest bucket size. */
  maxBucketSize: number;
}

export interface CalibrateOk {
  ok: true;
  stats: CalibrationStats;
  appendedCount: number;
  totalCount: number;
}

export interface PerClassThreshold {
  cls: number;
  qHat: number;
  rankUsed: number;
  /** True iff this class's bucket was too small for chosen α (fallback). */
  starved: boolean;
}

export interface PredictionSetOk {
  ok: true;
  /** Sorted ascending class labels in the prediction set. */
  classes: number[];
  /** Cardinality of the set — between 1 and numClasses. */
  size: number;
  /** Per-class q̂ used to build the set (one entry per class). */
  thresholds: PerClassThreshold[];
  calibrationSize: number;
  alpha: number;
  /** True iff at least one bucket was starved → set may include extra classes. */
  anyStarved: boolean;
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
  /** Per-class sorted score arrays. buckets[c] is sorted ascending. */
  buckets: number[][];
  lockedNumClasses: number;
  /** Total pair count across all buckets — for the MAX_CALIBRATION_PAIRS guard. */
  totalSize: number;
}

function freshState(): EngineState {
  return { buckets: [], lockedNumClasses: -1, totalSize: 0 };
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
 * In-place insert of `incoming` (unsorted) into the sorted-ascending
 * `dest`. O((N+M) log(N+M)) sort + merge.
 */
function mergeSortedInto(dest: number[], incoming: number[]): number[] {
  if (incoming.length === 0) return dest;
  const incomingSorted = [...incoming].sort((a, b) => a - b);
  const out: number[] = new Array(dest.length + incomingSorted.length);
  let i = 0, j = 0, k = 0;
  while (i < dest.length && j < incomingSorted.length) {
    if (dest[i] <= incomingSorted[j]) out[k++] = dest[i++];
    else out[k++] = incomingSorted[j++];
  }
  while (i < dest.length) out[k++] = dest[i++];
  while (j < incomingSorted.length) out[k++] = incomingSorted[j++];
  return out;
}

function summarizeBucket(sorted: number[]): { meanScore: number; medianScore: number; maxScore: number; minScore: number } {
  const n = sorted.length;
  if (n === 0) return { meanScore: 0, medianScore: 0, maxScore: 0, minScore: 0 };
  let sum = 0;
  for (const v of sorted) sum += v;
  const mid = n >> 1;
  const median = (n & 1) === 1 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
  return { meanScore: sum / n, medianScore: median, maxScore: sorted[n - 1], minScore: sorted[0] };
}

function perClassThreshold(bucket: number[], alpha: number, cls: number): PerClassThreshold {
  const n = bucket.length;
  const rank = Math.ceil((n + 1) * (1 - alpha));
  if (n === 0 || rank > n) {
    // Starved: insufficient data for chosen α. q̂=1 means "always include c"
    // — preserves coverage trivially (set includes all candidate classes
    // for which the score 1 − p[c] ≤ 1, which is every class).
    return { cls, qHat: 1, rankUsed: rank, starved: true };
  }
  return { cls, qHat: bucket[rank - 1], rankUsed: rank, starved: false };
}

// ============================================================================
// Engine API
// ============================================================================

export class CrossProcessMondrianClassificationEngine {
  /**
   * Ingest (probs, label) pairs. Computes LAC scores 1 − probs[label] and
   * routes them into per-class buckets. Locks numClasses on first call.
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
    const targetK = declaredNumClasses
      ?? (state.lockedNumClasses > 0 && append ? state.lockedNumClasses : inferredK);
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

    // Validate every pair AND collect new scores into per-class lists
    // before mutating state, so a mid-batch validation error doesn't
    // leave the engine half-updated.
    const newPerClass: number[][] = Array.from({ length: targetK }, () => []);
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
      newPerClass[label].push(1 - probs[label]);
    }

    // Apply append vs replace.
    const baseBuckets: number[][] = append && state.buckets.length === targetK
      ? state.buckets.map((b) => [...b])
      : Array.from({ length: targetK }, () => []);
    let totalSize = 0;
    const mergedBuckets: number[][] = baseBuckets.map((b, c) => {
      const merged = mergeSortedInto(b, newPerClass[c]);
      totalSize += merged.length;
      return merged;
    });
    if (totalSize > MAX_CALIBRATION_PAIRS) {
      return {
        ok: false,
        error: "invalid_input",
        message: `calibrate: total ${totalSize} exceeds MAX_CALIBRATION_PAIRS=${MAX_CALIBRATION_PAIRS}`,
      };
    }
    state = { buckets: mergedBuckets, lockedNumClasses: targetK, totalSize };

    const perClass: PerClassStats[] = mergedBuckets.map((b, c) => ({
      cls: c,
      size: b.length,
      ...summarizeBucket(b),
    }));
    const sizes = perClass.map((p) => p.size);
    return {
      ok: true,
      stats: {
        size: totalSize,
        numClasses: targetK,
        perClass,
        minBucketSize: sizes.length === 0 ? 0 : Math.min(...sizes),
        maxBucketSize: sizes.length === 0 ? 0 : Math.max(...sizes),
      },
      appendedCount: pairs.length,
      totalCount: totalSize,
    };
  }

  /**
   * Compute the Mondrian prediction set for a probability vector. Uses
   * per-class q̂ thresholds derived from the per-class buckets at the
   * supplied α.
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
    if (state.totalSize === 0) {
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

    // Compute per-class thresholds.
    const thresholds: PerClassThreshold[] = state.buckets.map((b, c) => perClassThreshold(b, alpha, c));
    const warnings: string[] = [];
    const starvedClasses: number[] = thresholds.filter((t) => t.starved).map((t) => t.cls);
    const anyStarved = starvedClasses.length > 0;
    if (anyStarved) {
      warnings.push(
        `bucket starvation: classes [${starvedClasses.join(",")}] have N_c too small for alpha=${alpha}; falling back to q̂=1 (always-include) for those classes. Coverage on starved classes is trivially met but sets are wider.`,
      );
    }

    // Build set: include c iff (1 − probs[c]) ≤ q̂[c].
    const classes: number[] = [];
    for (let c = 0; c < probs.length; c++) {
      const score = 1 - probs[c];
      if (score <= thresholds[c].qHat + 1e-12) classes.push(c);
    }
    // Argmax-non-empty fallback (mirrors LAC engine).
    if (classes.length === 0) {
      let argmax = 0;
      let maxP = probs[0];
      for (let c = 1; c < probs.length; c++) {
        if (probs[c] > maxP) {
          maxP = probs[c];
          argmax = c;
        }
      }
      classes.push(argmax);
      warnings.push("empty-set fallback: argmax included to preserve coverage on degenerate per-class thresholds");
    }

    return {
      ok: true,
      classes,
      size: classes.length,
      thresholds,
      calibrationSize: state.totalSize,
      alpha,
      anyStarved,
      warnings,
    };
  }

  /** Snapshot calibration state (per-class breakdown). */
  static getStats(): CalibrationStats {
    const perClass: PerClassStats[] = state.buckets.map((b, c) => ({
      cls: c,
      size: b.length,
      ...summarizeBucket(b),
    }));
    const sizes = perClass.map((p) => p.size);
    return {
      size: state.totalSize,
      numClasses: state.lockedNumClasses < 0 ? 0 : state.lockedNumClasses,
      perClass,
      minBucketSize: sizes.length === 0 ? 0 : Math.min(...sizes),
      maxBucketSize: sizes.length === 0 ? 0 : Math.max(...sizes),
    };
  }

  /** Wipe calibration state (test-reset / drift-reset). */
  static reset(): void {
    state = freshState();
  }

  /** Read-only constants snapshot. */
  static constants(): {
    MAX_CALIBRATION_PAIRS: number;
    DEFAULT_ALPHA: number;
    SIMPLEX_SUM_TOLERANCE: number;
    MAX_NUM_CLASSES: number;
  } {
    return { MAX_CALIBRATION_PAIRS, DEFAULT_ALPHA, SIMPLEX_SUM_TOLERANCE, MAX_NUM_CLASSES };
  }
}

export const crossProcessMondrianClassificationEngine = CrossProcessMondrianClassificationEngine;

/** Dispatcher convenience wrapper. */
export function crossProcessMondrianClassification(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_mondrian_calibrate":
      return CrossProcessMondrianClassificationEngine.calibrate(params);
    case "xproc_mondrian_set":
      return CrossProcessMondrianClassificationEngine.predictionSet(params);
    case "xproc_mondrian_stats":
      return CrossProcessMondrianClassificationEngine.getStats();
    case "xproc_mondrian_reset":
      CrossProcessMondrianClassificationEngine.reset();
      return { ok: true };
    case "xproc_mondrian_constants":
      return CrossProcessMondrianClassificationEngine.constants();
    default:
      throw new Error(`crossProcessMondrianClassification: unknown action '${action}'`);
  }
}
