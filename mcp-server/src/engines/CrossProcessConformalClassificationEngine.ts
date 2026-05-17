/**
 * CrossProcessConformalClassificationEngine — XPROC-NEURAL Tier 5 (T5-02b)
 *
 * Inductive Conformal Prediction (split conformal) for multi-class
 * classification. Wraps a probability-emitting classifier (e.g., the
 * cross-process neural learner's softmax) with prediction *sets* that
 * marginally cover the true label with probability ≥ 1−α — distribution-
 * free, no parametric assumption, no retraining of the underlying model.
 *
 * Sibling engine to CrossProcessConformalPredictionEngine (which handles
 * regression intervals via |y − ŷ| residuals). This one uses the LAC
 * non-conformity score (1 − p̂(y)) for classification prediction sets.
 *
 * References:
 *   - Vovk, Gammerman, Shafer (2005). "Algorithmic Learning in a Random
 *     World." Springer. (foundational text for conformal prediction)
 *   - Sadinle, Lei, Wasserman (2019). "Least Ambiguous Set-Valued
 *     Classifiers with Bounded Error Levels." JASA. (LAC score, the
 *     1 − p̂(y) form used here — minimises set size for fixed coverage
 *     among class-conditional methods)
 *   - Romano, Sesia, Candès (2020). "Classification with Valid and
 *     Adaptive Coverage." NeurIPS. (the APS adaptive variant — listed
 *     here as future-extension; this engine ships LAC first, which is
 *     simpler and has tighter marginal coverage at the cost of slightly
 *     larger sets on low-confidence inputs.)
 *   - Angelopoulos, Bates (2023). "A Gentle Introduction to Conformal
 *     Prediction and Distribution-Free Uncertainty Quantification."
 *     (modern unified treatment + worked examples)
 *
 * Algorithm (split / inductive LAC):
 *   1. Calibration: for each (probs_i, y_i) pair in the calibration set,
 *      compute s_i = 1 − probs_i[y_i].   ← non-conformity score
 *   2. Sort scores ascending: s_(1) ≤ s_(2) ≤ ... ≤ s_(N).
 *   3. Quantile index: k = ⌈(N+1)·(1−α)⌉ ∈ {1, ..., N+1}.
 *      If k ≤ N → q̂ = s_(k); if k = N+1 → q̂ = 1 (full label set returned).
 *   4. Prediction set for new probs vector: { c : 1 − probs[c] ≤ q̂ }
 *      = { c : probs[c] ≥ 1 − q̂ }.
 *
 * Marginal coverage guarantee (Sadinle et al. 2019, Thm 1):
 *   For any new (X, Y) drawn exchangeably with the calibration set,
 *     P(Y ∈ predicted_set(X)) ≥ 1 − α
 *   regardless of the underlying classifier's quality. A bad classifier →
 *   large prediction sets; a sharp classifier → singletons; coverage is
 *   guaranteed marginally either way.
 *
 * Architecture decision — pure aggregator + persistent calibration state:
 *   The engine accepts caller-supplied (probs, true_label) pairs from the
 *   calibration split. It does NOT contain a classifier (the cross-process
 *   neural learner is the upstream producer). State is the sorted LAC
 *   scores plus the class-count (locked at first calibrate to enforce
 *   shape consistency across calibrate / predictionSet calls).
 *
 *   Two operations:
 *     - calibrate({pairs, append?, numClasses?}) → ingests calibration
 *       pairs (probs vector + integer class label) and computes scores
 *     - predictionSet({probs, alpha}) → returns {classes, sizes}
 *
 *   Why pure-aggregator vs full-stack:
 *     1. Decouples from T1-02 (CrossProcessNeuralLearningEngine — file
 *        is currently held by another session per file-claim-guard).
 *     2. Composable with any classifier whose output is a probability
 *        simplex over {0, ..., K−1}.
 *     3. T5-04 CalibrationAuditor consumes the empirical coverage rate
 *        from this engine to detect distribution drift.
 *
 * Failure modes covered:
 *   1. Empty calibration set on predictionSet → invalid_state (no q̂).
 *   2. probs not on simplex (negative, > 1, or sum != 1 ± epsilon),
 *      NaN/Inf inputs → invalid_input.
 *   3. label outside [0, numClasses) → invalid_input.
 *   4. probs.length !== lockedNumClasses on either calibrate or
 *      predictionSet → invalid_input (catches mid-flight class-count
 *      drift that would otherwise silently corrupt scores).
 *   5. α outside (0, 1) → invalid_input (Zod gate).
 *   6. Pair count > MAX_CALIBRATION_PAIRS → invalid_input (DoS guard).
 *   7. Re-calibrate with append=false fully replaces stored set + resets
 *      lockedNumClasses (the only safe way to switch class counts).
 *   8. N < ⌈(N+1)(1−α)⌉ (insufficient calibration for chosen coverage)
 *      → q̂ defaults to 1, prediction set = full label set + warning.
 *
 * Acceptance:
 *   Marginal coverage ≥ 1 − α − 1/N tolerance on 2000 holdout queries
 *   with N=300 calibration pairs across all classes — verified in tests
 *   via deterministic LCG PRNG + 5-class synthetic gaussian-mixture data.
 *
 * @module CrossProcessConformalClassificationEngine
 */

import { z } from "zod";

import { feedbackBusEngine } from "./FeedbackBusEngine.js";

/**
 * Bus topic published after every successful `predictionSet()` call.
 * NN-STACK-INTEG-MS0/U-NN-INTEG-04.
 *
 * Payload shape:
 * ```
 * {
 *   classes:         number[];   // sorted ascending class labels in the set
 *   size:            number;     // |classes|
 *   qHat:            number;     // conformal threshold s_(k)
 *   rankUsed:        number;     // k = ceil((N+1)*(1-alpha))
 *   alpha:           number;     // miscoverage rate
 *   calibrationSize: number;     // N at predict time
 *   fullSet:         boolean;    // true when rank > N (insufficient cal)
 *   ts:              string;     // ISO timestamp
 * }
 * ```
 *
 * Disable: `PRISM_NN_INTEG_DISABLE=1`. Fire-and-forget — a bus error never
 * fails the prediction (Sadinle 2019 marginal coverage guarantee is
 * unaffected by downstream subscriber state).
 */
export const CONFORMAL_CLASSIFICATION_COMPUTED_TOPIC = "conformal.classification.computed";

// ============================================================================
// Constants
// ============================================================================

/** Sanity bound on calibration set size. */
const MAX_CALIBRATION_PAIRS = 100_000;

/** Default miscoverage rate α = 0.1 → 90% coverage. (Classification
 *  defaults are typically a touch wider than the 0.05 used for regression
 *  intervals because softmax outputs from a small net carry more variance
 *  than residuals from a tuned regressor.) */
const DEFAULT_ALPHA = 0.1;

/** Tolerance for probability-simplex sum check (probs.sum ≈ 1). Loose
 *  enough to admit single-precision-rounded inputs, tight enough to catch
 *  systematic shape errors (caller forgot softmax, etc). */
const SIMPLEX_SUM_TOLERANCE = 1e-4;

/** Max sane number of classes — guard against integer-overflow attacks
 *  from caller-supplied numClasses. */
const MAX_NUM_CLASSES = 1024;

// ============================================================================
// Schemas
// ============================================================================

const PairSchema = z.object({
  /** Probability simplex over the K classes. probs[c] = P(class=c). */
  probs: z.array(z.number().finite().min(0).max(1)).min(2).max(MAX_NUM_CLASSES),
  /** Integer class label in [0, numClasses). */
  label: z.number().int().nonnegative(),
});

const CalibrateInputSchema = z.object({
  pairs: z.array(PairSchema).min(1).max(MAX_CALIBRATION_PAIRS),
  /** If true, append to existing calibration; else replace. Default true. */
  append: z.boolean().default(true),
  /** Class count lock. Optional on first call (inferred); required to
   *  match across subsequent appends. Use append=false to switch. */
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
  /** s_(N) — largest non-conformity score in the calibration set. */
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
  /** Conformal threshold q̂ = s_(k). probs[c] ≥ 1 − q̂ for c in set. */
  qHat: number;
  /** Rank used (1-indexed) — k = ⌈(N+1)·(1−α)⌉. */
  rankUsed: number;
  /** Calibration set size at predict time. */
  calibrationSize: number;
  alpha: number;
  /** True iff k > N → fall back to full label set (insufficient cal). */
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
// Engine state (module-private — pure, no I/O)
// ============================================================================

interface EngineState {
  /** Sorted ascending — invariant maintained by all mutators. */
  sortedScores: number[];
  /** Class count locked on first calibrate. -1 = unlocked / fresh. */
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
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i];
    if (!Number.isFinite(p) || p < 0 || p > 1) return false;
    sum += p;
  }
  return Math.abs(sum - 1) <= SIMPLEX_SUM_TOLERANCE;
}

/**
 * Insert `incoming` (unsorted) into `sortedDest` (already-sorted ascending),
 * maintaining sort order. O((N+M) log(N+M)) via sort + merge — for N,M up
 * to MAX_CALIBRATION_PAIRS this is cheap; pairwise binary-insert is
 * O(M·N) and worse for large M.
 */
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
 * CrossProcessConformalClassificationEngine — split-conformal classification
 * via LAC (Sadinle et al. 2019). Pure aggregator over caller-supplied
 * (probs, label) calibration pairs.
 */
export class CrossProcessConformalClassificationEngine {
  /**
   * Ingest calibration pairs. Computes LAC non-conformity scores and
   * merges into the sorted state, locking the class count on first call
   * (or after a replace).
   *
   * @param input — { pairs, append?, numClasses? }
   * @returns CalibrateOk on success or OpErr on shape/value violation
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

    // Resolve numClasses: explicit > inferred from first pair > current lock
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

    // Validate every pair against simplex + class-count + label-range.
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
        return { ok: false, error: "invalid_input", message: `calibrate: pair ${p} probs not on simplex (sum != 1 within ${SIMPLEX_SUM_TOLERANCE} or has negative/>1 entry)` };
      }
      newScores[p] = 1 - probs[label];
    }

    // Apply append vs replace.
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

    const summary = summarize(merged);
    return {
      ok: true,
      stats: { size: merged.length, numClasses: targetK, ...summary },
      appendedCount: pairs.length,
      totalCount: merged.length,
    };
  }

  /**
   * Compute a prediction set for a new probability vector. Set membership:
   * c ∈ S(x) ⇔ probs[c] ≥ 1 − q̂, where q̂ is the (1−α)·(N+1)/N quantile
   * of the LAC scores from the calibration set.
   *
   * @param input — { probs, alpha }
   * @returns PredictionSetOk on success or OpErr if state or shape invalid
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

    // Conformal rank index: k_idx = ⌈(N+1)·(1−α)⌉.
    const rank = Math.ceil((n + 1) * (1 - alpha));
    let qHat: number;
    let fullSet = false;
    const warnings: string[] = [];
    if (rank > n) {
      // Insufficient calibration for chosen alpha → coverage trivially 1.
      qHat = 1;
      fullSet = true;
      warnings.push(
        `insufficient calibration: rank ${rank} > N=${n}; falling back to full label set. Add more calibration pairs or relax alpha.`,
      );
    } else {
      // sortedScores is 0-indexed; rank is 1-indexed.
      qHat = state.sortedScores[rank - 1];
    }

    // Build the set: every class c with probs[c] ≥ 1 − q̂.
    const threshold = 1 - qHat;
    const classes: number[] = [];
    for (let c = 0; c < probs.length; c++) {
      if (probs[c] >= threshold) classes.push(c);
    }
    // Edge case: q̂ exactly 0 from a perfect-on-cal classifier — threshold
    // becomes 1 and only classes with probs[c]=1 enter the set. If probs
    // is non-degenerate (no entry exactly 1), the set could be empty. To
    // preserve the marginal-coverage guarantee we always include the
    // argmax in that case (see Sadinle 2019 §3 — the set must be
    // non-empty for the inequality probs[c] ≥ 1−q̂ to bind on the true
    // class with the chosen rank).
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
      warnings.push("empty-set fallback: argmax included to preserve coverage on degenerate threshold");
    }

    const out: PredictionSetOk = {
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

    // Fire-and-forget broadcast — subscribers see every successful prediction.
    // NN-STACK-INTEG-MS0/U-NN-INTEG-04. Gated by PRISM_NN_INTEG_DISABLE=1.
    // Bus errors NEVER fail the prediction (Sadinle 2019 marginal coverage
    // guarantee is decoupled from downstream subscriber state).
    if (process.env.PRISM_NN_INTEG_DISABLE !== "1") {
      try {
        feedbackBusEngine.publish(CONFORMAL_CLASSIFICATION_COMPUTED_TOPIC, {
          classes: out.classes,
          size: out.size,
          qHat: out.qHat,
          rankUsed: out.rankUsed,
          alpha: out.alpha,
          calibrationSize: out.calibrationSize,
          fullSet: out.fullSet,
          ts: new Date().toISOString(),
        });
      } catch {
        // swallowed — fire-and-forget contract
      }
    }

    return out;
  }

  /** Snapshot of calibration state. */
  static getStats(): CalibrationStats {
    const summary = summarize(state.sortedScores);
    return {
      size: state.sortedScores.length,
      numClasses: state.lockedNumClasses < 0 ? 0 : state.lockedNumClasses,
      ...summary,
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

export const crossProcessConformalClassificationEngine = CrossProcessConformalClassificationEngine;

/**
 * Dispatcher convenience wrapper. Routes 5 actions through the engine.
 */
export function crossProcessConformalClassification(
  action: string,
  params: Record<string, unknown>,
): unknown {
  switch (action) {
    case "xproc_conformal_classify_calibrate":
      return CrossProcessConformalClassificationEngine.calibrate(params);
    case "xproc_conformal_classify_set":
      return CrossProcessConformalClassificationEngine.predictionSet(params);
    case "xproc_conformal_classify_stats":
      return CrossProcessConformalClassificationEngine.getStats();
    case "xproc_conformal_classify_reset":
      CrossProcessConformalClassificationEngine.reset();
      return { ok: true };
    case "xproc_conformal_classify_constants":
      return CrossProcessConformalClassificationEngine.constants();
    default:
      throw new Error(`crossProcessConformalClassification: unknown action '${action}'`);
  }
}
