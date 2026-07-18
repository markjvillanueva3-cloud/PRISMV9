/**
 * QuotingAccuracyEnhancementEngine — QUOTING-PIPELINE-MS0 / U-QP13 (accuracy upgrade)
 *
 * Four math-driven accuracy enhancements layered over the 6 QUOTING-PIPELINE engines:
 *
 *   1. Platt-scaling probability calibration for CameraIntakeRouter raw scores
 *      → converts ad-hoc 0..1 confidence into a calibrated posterior P(route|features)
 *      → Platt (1999): P = sigmoid(A·s + B); A, B fit from a labelled holdout set
 *
 *   2. OCR-confusion-weighted edit distance for ISO 1832 + vendor-name fuzzy matching
 *      → fixes the 0↔O, 1↔I, 5↔S, 8↔B class of OCR errors that the strict regex misses
 *      → confusion pairs cost 0.5 vs 1.0 for a generic substitution
 *      → match accepted iff weighted-distance ≤ 2.0 (tunable per-application)
 *
 *   3. Weibull survival prior for BOM replacement-interval predictions
 *      → P(part still alive at age t) = exp(-(t/η)^β), η = scale (~ mean life), β = shape
 *      → for industrial wear items β ≈ 2.5 (early-life mild, wear-out late)
 *      → produces P(replace within next N months) for proactive ordering
 *
 *   4. Interval-arithmetic uncertainty propagation for quote totals
 *      → reuses PROGRAM-PROOF-MS0/U-PP02 IntervalArithmeticPredicateEngine machinery
 *      → quote(material_cost, labor_cost, tooling_cost, overhead_pct, margin_pct) returns
 *        [lo, hi] guaranteed-correct bounds given each input as an interval (uncertainty band)
 *
 * Per CLAUDE.md R5: pure functions; no I/O. Per R12: every method has explicit
 * failure-mode returns — no silent NaN propagation.
 *
 * @milestone QUOTING-PIPELINE-MS0/U-QP13-ACCURACY-ENHANCEMENT
 * @author slot:charlie /goal-13 iter9, 2026-05-24
 */

import { intervalArithmeticPredicateEngine, type Interval } from "./IntervalArithmeticPredicateEngine.js";

// ─── 1. Platt-scaling probability calibration ───────────────────────

/**
 * Platt (1999) sigmoid: P_calibrated = 1 / (1 + exp(A·s + B)).
 * Defaults: A = -2, B = 0 — gives ~0.5 at score=0, ~0.88 at score=1, ~0.12 at score=-1.
 * These are starting-point priors; production deploys should re-fit A,B from a
 * 100-sample labelled holdout per route via MLE (Newton-Raphson, standard Platt fit).
 */
export interface PlattParams {
  /** Slope (always negative in Platt's convention) */
  A: number;
  /** Intercept */
  B: number;
}
export const DEFAULT_PLATT_PARAMS: PlattParams = { A: -2.0, B: 0.0 };

export function plattCalibrate(rawScore: number, params: PlattParams = DEFAULT_PLATT_PARAMS): number {
  // R12: NaN is undefined behavior — return 0 (fail-loud, not silent default).
  // ±Infinity is well-defined under the Lin formula limit; allow it through.
  if (Number.isNaN(rawScore)) return 0;
  const z = params.A * rawScore + params.B;
  // Lin et al. (2007) formula: P = 1 / (1 + exp(z)). Numerically stable.
  if (z === -Infinity) return 1;
  if (z === +Infinity) return 0;
  if (z >= 0) {
    const e = Math.exp(-z);
    return e / (1 + e); // = 1/(1+e^z) for z>=0
  } else {
    const e = Math.exp(z);
    return 1 / (1 + e); // = 1/(1+e^z) for z<0
  }
}

/**
 * Fit Platt parameters from a holdout via MLE (Newton-Raphson, 10 iterations).
 * Inputs: pairs of (rawScore, isPositive). Returns calibrated {A, B}.
 * Reference: Lin et al. (2007) "A note on Platt's probabilistic outputs for SVMs".
 */
export function plattFit(samples: Array<{ rawScore: number; isPositive: boolean }>): PlattParams {
  if (samples.length < 4) return DEFAULT_PLATT_PARAMS; // R12: undersample → safe defaults
  const N = samples.length;
  const Npos = samples.filter((s) => s.isPositive).length;
  const Nneg = N - Npos;
  if (Npos === 0 || Nneg === 0) return DEFAULT_PLATT_PARAMS; // R12: single-class → safe defaults
  // Lin et al. target smoothing
  const tPos = (Npos + 1) / (Npos + 2);
  const tNeg = 1 / (Nneg + 2);

  let A = 0;
  let B = Math.log(Nneg / Npos);
  for (let iter = 0; iter < 50; iter++) {
    // Hessian-Newton step
    let h11 = 1e-12, h22 = 1e-12, h21 = 0, g1 = 0, g2 = 0;
    for (const s of samples) {
      const t = s.isPositive ? tPos : tNeg;
      const fApB = s.rawScore * A + B;
      let p: number, q: number;
      if (fApB >= 0) {
        p = Math.exp(-fApB) / (1 + Math.exp(-fApB));
        q = 1 / (1 + Math.exp(-fApB));
      } else {
        p = 1 / (1 + Math.exp(fApB));
        q = Math.exp(fApB) / (1 + Math.exp(fApB));
      }
      const d2 = p * q;
      h11 += s.rawScore * s.rawScore * d2;
      h22 += d2;
      h21 += s.rawScore * d2;
      const d1 = t - p;
      g1 += s.rawScore * d1;
      g2 += d1;
    }
    if (Math.abs(g1) < 1e-5 && Math.abs(g2) < 1e-5) break;
    const det = h11 * h22 - h21 * h21;
    if (Math.abs(det) < 1e-18) break;
    const dA = -(h22 * g1 - h21 * g2) / det;
    const dB = -(-h21 * g1 + h11 * g2) / det;
    A += dA;
    B += dB;
  }
  return { A, B };
}

// ─── 2. OCR-confusion-weighted edit distance ────────────────────────

/**
 * Pairs of characters commonly confused by camera-OCR pipelines.
 * Substituting within a pair costs 0.5 instead of the standard 1.0.
 * Reference: ICDAR confusion-matrix tables for Tesseract + cloud-OCR (2019-2024).
 */
const OCR_CONFUSION_PAIRS: Array<[string, string]> = [
  ["0", "O"], ["0", "Q"], ["0", "D"],
  ["1", "I"], ["1", "L"], ["1", "T"],
  ["5", "S"],
  ["8", "B"],
  ["2", "Z"],
  ["6", "G"],
  ["9", "g"], ["g", "q"],
  ["m", "n"], ["n", "u"], ["u", "v"],
  ["c", "e"], ["e", "o"],
  ["r", "n"], ["h", "b"],
];
const CONFUSION_COST = 0.5;
const GENERIC_SUB_COST = 1.0;

function subCost(a: string, b: string): number {
  if (a === b) return 0;
  const A = a.toUpperCase();
  const B = b.toUpperCase();
  if (A === B) return 0; // case-only difference
  for (const [x, y] of OCR_CONFUSION_PAIRS) {
    if ((A === x.toUpperCase() && B === y.toUpperCase()) || (A === y.toUpperCase() && B === x.toUpperCase())) {
      return CONFUSION_COST;
    }
  }
  return GENERIC_SUB_COST;
}

/**
 * Weighted Levenshtein where common OCR-confusion swaps cost 0.5.
 * O(|a|·|b|) time + space. Returns Infinity on null/undefined input (R12).
 */
export function ocrWeightedEditDistance(a: string, b: string): number {
  if (typeof a !== "string" || typeof b !== "string") return Infinity;
  const m = a.length, n = b.length;
  if (m === 0) return n;
  if (n === 0) return m;
  const dp: number[][] = Array.from({ length: m + 1 }, () => new Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const c = subCost(a[i - 1], b[j - 1]);
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,           // delete
        dp[i][j - 1] + 1,           // insert
        dp[i - 1][j - 1] + c,       // substitute (confusion-weighted)
      );
    }
  }
  return dp[m][n];
}

/**
 * Fuzzy-match a query SKU against a candidate set. Returns the best match
 * iff weighted-distance ≤ maxDistance (default 2.0).
 */
export interface FuzzyMatchResult {
  matched: string | null;
  distance: number;
  /** Confidence = 1 - (distance / |query|) clamped to [0, 1] */
  confidence: number;
}

export function fuzzyMatchSku(query: string, candidates: string[], maxDistance = 2.0): FuzzyMatchResult {
  if (typeof query !== "string" || query.length === 0 || candidates.length === 0) {
    return { matched: null, distance: Infinity, confidence: 0 };
  }
  let best = { sku: "", dist: Infinity };
  for (const c of candidates) {
    const d = ocrWeightedEditDistance(query, c);
    if (d < best.dist) best = { sku: c, dist: d };
  }
  if (best.dist > maxDistance) return { matched: null, distance: best.dist, confidence: 0 };
  const confidence = Math.max(0, Math.min(1, 1 - best.dist / Math.max(1, query.length)));
  return { matched: best.sku, distance: best.dist, confidence };
}

// ─── 3. Weibull survival prior for BOM replacement intervals ────────

/**
 * Weibull survival function: S(t) = exp(-(t/η)^β).
 * Probability that a wear part is STILL alive at age t (months).
 *   - η (eta, scale): characteristic life — ≈ MTTF for β=1, near-mean for β=2.5
 *   - β (beta, shape): <1 = early failures, =1 = constant rate (Poisson), >1 = wear-out
 * Industrial wear items typically β ∈ [2, 4]; we default β=2.5 per Weibull++ tables.
 *
 * Per R12: invalid inputs (negative time, η≤0, β≤0, NaN/∞) → return NaN, not silent 0/1.
 */
export interface WeibullParams {
  eta: number;
  beta: number;
}

export function weibullSurvival(t: number, params: WeibullParams): number {
  if (!Number.isFinite(t) || t < 0) return NaN;
  if (!Number.isFinite(params.eta) || params.eta <= 0) return NaN;
  if (!Number.isFinite(params.beta) || params.beta <= 0) return NaN;
  return Math.exp(-Math.pow(t / params.eta, params.beta));
}

export function weibullReplaceProbability(currentAgeMonths: number, lookAheadMonths: number, params: WeibullParams): number {
  const sNow = weibullSurvival(currentAgeMonths, params);
  const sLater = weibullSurvival(currentAgeMonths + lookAheadMonths, params);
  if (!Number.isFinite(sNow) || !Number.isFinite(sLater)) return NaN;
  if (sNow <= 0) return 1;
  return Math.max(0, Math.min(1, 1 - sLater / sNow));
}

/**
 * Convert a flat `replacement_interval_months` (used by U-QP05 BOM) into a
 * Weibull-conditioned replacement probability for proactive-ordering decisions.
 * The flat interval is interpreted as η (characteristic life); β defaults to 2.5.
 */
export function bomReplacementUrgency(intervalMonths: number, currentAgeMonths: number, lookAheadMonths = 1, beta = 2.5): number {
  if (intervalMonths === null || !Number.isFinite(intervalMonths) || intervalMonths <= 0) return NaN;
  return weibullReplaceProbability(currentAgeMonths, lookAheadMonths, { eta: intervalMonths, beta });
}

// ─── 4. Interval-arithmetic quote uncertainty propagation ───────────

/**
 * Quote = (material + labor + tooling) · (1 + overhead) · (1 + margin)
 *
 * Each input as an Interval [lo, hi] — outputs the guaranteed-correct quote
 * interval. Reuses PROGRAM-PROOF-MS0/U-PP02 IntervalArithmeticPredicateEngine
 * (rounded outward, ULP-safe). Surfaces uncertainty to the quote consumer
 * instead of presenting a fake-precise single number.
 */
export interface QuoteInputs {
  material_cost: Interval;
  labor_cost: Interval;
  tooling_cost: Interval;
  /** Overhead percentage as Interval (e.g. 0.15 ± 0.02 → {lo: 0.13, hi: 0.17}) */
  overhead_pct: Interval;
  /** Profit margin percentage as Interval */
  margin_pct: Interval;
}

export interface QuoteIntervalResult {
  quote: Interval;
  /** Midpoint convenience */
  midpoint: number;
  /** Half-width (= (hi-lo)/2) — caller's uncertainty budget */
  half_width: number;
  /** Relative uncertainty = half_width / midpoint (NaN if midpoint=0) */
  relative_uncertainty: number;
}

export function quoteIntervalArithmetic(inputs: QuoteInputs): QuoteIntervalResult {
  const eng = intervalArithmeticPredicateEngine;
  // subtotal = material + labor + tooling
  const sub1 = eng.add(inputs.material_cost, inputs.labor_cost);
  const subtotal = eng.add(sub1, inputs.tooling_cost);
  // with-overhead = subtotal · (1 + overhead)
  const oneMinusEpsilon = { lo: 1, hi: 1 };
  const onePlusOverhead = eng.add(oneMinusEpsilon, inputs.overhead_pct);
  const withOverhead = eng.mul(subtotal, onePlusOverhead);
  // final = with-overhead · (1 + margin)
  const onePlusMargin = eng.add(oneMinusEpsilon, inputs.margin_pct);
  const quote = eng.mul(withOverhead, onePlusMargin);
  const midpoint = (quote.lo + quote.hi) / 2;
  const half_width = (quote.hi - quote.lo) / 2;
  const relative_uncertainty = midpoint !== 0 ? half_width / Math.abs(midpoint) : NaN;
  return { quote, midpoint, half_width, relative_uncertainty };
}

// ─── Singleton ──────────────────────────────────────────────────────

export class QuotingAccuracyEnhancementEngine {
  plattCalibrate = plattCalibrate;
  plattFit = plattFit;
  ocrWeightedEditDistance = ocrWeightedEditDistance;
  fuzzyMatchSku = fuzzyMatchSku;
  weibullSurvival = weibullSurvival;
  weibullReplaceProbability = weibullReplaceProbability;
  bomReplacementUrgency = bomReplacementUrgency;
  quoteIntervalArithmetic = quoteIntervalArithmetic;
}

export const quotingAccuracyEnhancementEngine = new QuotingAccuracyEnhancementEngine();
