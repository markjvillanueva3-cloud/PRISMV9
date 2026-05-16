#!/usr/bin/env node
/**
 * isotonic-calibrator.mjs — isotonic-regression probability calibration.
 * Component (a) of unit U-NNG-GRAPHSAGE-TRAIN (U4) of NN-GRAPH-MS0.
 *
 * Why this exists: a trained classifier's raw output score is rarely a
 * well-calibrated probability — a GraphSAGE link-predictor may emit 0.9 for
 * cases that are positive only 60% of the time. The NN-GRAPH-MS0 risk
 * register makes calibration MANDATORY ("isotonic moved to U4a mandatory")
 * because the 5th-tier inference gate keys on `confidence >= PRISM_NNG_MIN_CONF`
 * — an uncalibrated 0.7 is not a real 70%.
 *
 * Method — isotonic regression via Pool Adjacent Violators (PAV). Given
 * (rawScore, label) pairs, PAV fits the monotone non-decreasing step function
 * that minimizes squared error against the labels. It assumes only that a
 * higher raw score should never mean a lower true probability — no sigmoid /
 * Platt parametric-shape assumption. Linear time after the sort.
 *
 * The fit produces a compact, JSON-serializable `breakpoints` array (so the
 * U4 checkpoint loader can persist a calibrator as plain data); `predictCalibrated`
 * is a pure function over those breakpoints with clipped linear interpolation
 * between them — the same contract as sklearn IsotonicRegression(out_of_bounds=
 * 'clip').
 *
 * Pure + deterministic — no global state, ties broken deterministically.
 * Consistent with the U3 scripts/lib/*.mjs + node:test convention.
 */

/**
 * Below this many usable training pairs an isotonic fit overfits — the PAV
 * step function chases individual labels instead of a trend. The fit is still
 * returned (the data is real), but flagged `reliable:false` so a consumer
 * (U5 predict / U7 eval) can fall back to raw scores rather than trust a thin
 * calibration. A pragmatic floor, not a hard statistical threshold.
 */
export const MIN_RELIABLE_SAMPLES = 50;

/** Clamp to [0,1]; NaN falls through the `> 0` test to 0. */
function clamp01(x) {
  return x > 0 ? (x < 1 ? x : 1) : 0;
}

/**
 * Pool Adjacent Violators. `points` is a sequence of { y, w? } already in
 * the desired (ascending-x) order; `y` is the target, `w` the weight
 * (default 1). Returns monotone non-decreasing blocks [{ y, w, count }] —
 * `count` is how many input points the block absorbed, `y` their weighted
 * mean. Non-finite-y points are skipped; a non-positive/absent weight → 1.
 */
export function poolAdjacentViolators(points) {
  const blocks = [];
  if (!Array.isArray(points)) return blocks;
  for (const p of points) {
    if (!p || !Number.isFinite(Number(p.y))) continue;
    const w = Number.isFinite(Number(p.w)) && Number(p.w) > 0 ? Number(p.w) : 1;
    const y = Number(p.y);
    let cur = { sumW: w, sumWY: w * y, count: 1 };
    // Merge backward while the previous block's mean exceeds this one's
    // (a non-decreasing violation), pooling into the weighted mean.
    while (blocks.length > 0) {
      const prev = blocks[blocks.length - 1];
      if (prev.sumWY / prev.sumW <= cur.sumWY / cur.sumW) break;
      blocks.pop();
      cur = {
        sumW: prev.sumW + cur.sumW,
        sumWY: prev.sumWY + cur.sumWY,
        count: prev.count + cur.count,
      };
    }
    blocks.push(cur);
  }
  return blocks.map((b) => ({ y: b.sumWY / b.sumW, w: b.sumW, count: b.count }));
}

/**
 * Fit an isotonic calibration map from parallel `scores` / `labels` arrays.
 * Labels are expected in {0,1} (any finite value is mathematically accepted —
 * the fitted values are weighted label means). Non-finite (score,label) pairs
 * are dropped and counted (`dropped`) rather than poisoning the fit.
 *
 * Returns { breakpoints, fitted, n, dropped, reliable }:
 *   - breakpoints: [{x,y}] ascending in x, non-decreasing in y, 1-2 per PAV
 *     block (flat-run interiors are dropped — interpolation is exact without
 *     them). JSON-serializable: this IS the calibrator's persistable state.
 *   - fitted: false when no usable pair survived (breakpoints empty →
 *     predictCalibrated degrades to clamped identity).
 *   - reliable: fitted AND n >= MIN_RELIABLE_SAMPLES — a thin fit is real but
 *     overfits, so consumers should branch on this, not just `fitted`.
 *   - n: usable pair count · dropped: non-finite pairs discarded.
 *
 * Throws RangeError only on a caller error (non-array / length mismatch).
 */
export function fitIsotonicCalibrator(scores, labels) {
  if (!Array.isArray(scores) || !Array.isArray(labels) || scores.length !== labels.length) {
    throw new RangeError(
      "isotonic-calibrator: scores and labels must be equal-length arrays " +
      `(got ${Array.isArray(scores) ? scores.length : typeof scores} / ` +
      `${Array.isArray(labels) ? labels.length : typeof labels})`
    );
  }

  const pairs = [];
  let dropped = 0;
  for (let i = 0; i < scores.length; i++) {
    const s = Number(scores[i]);
    const l = Number(labels[i]);
    if (!Number.isFinite(s) || !Number.isFinite(l)) { dropped++; continue; }
    pairs.push({ x: s, y: l });
  }
  const n = pairs.length;
  if (n === 0) return { breakpoints: [], fitted: false, n: 0, dropped, reliable: false };

  // Sort by score; deterministic tie-break by label so the fit is stable.
  pairs.sort((a, b) => (a.x - b.x) || (a.y - b.y));

  // Pool exact-score ties into one weighted point — a score must map to a
  // single calibrated value, so identical x cannot straddle two PAV blocks.
  const points = [];
  for (const p of pairs) {
    const last = points[points.length - 1];
    if (last && last.x === p.x) {
      last.sumY += p.y;
      last.w += 1;
    } else {
      points.push({ x: p.x, sumY: p.y, w: 1 });
    }
  }
  const pavInput = points.map((d) => ({ y: d.sumY / d.w, w: d.w }));
  const blocks = poolAdjacentViolators(pavInput);

  // Expand blocks back over the score axis → compact breakpoints. A block
  // spanning points[idx .. idx+count-1] contributes its first x (and its
  // last x, when the block is wider than one point) at the block's value.
  const breakpoints = [];
  let idx = 0;
  for (const b of blocks) {
    const startX = points[idx].x;
    const endX = points[idx + b.count - 1].x;
    breakpoints.push({ x: startX, y: b.y });
    if (endX !== startX) breakpoints.push({ x: endX, y: b.y });
    idx += b.count;
  }
  return { breakpoints, fitted: true, n, dropped, reliable: n >= MIN_RELIABLE_SAMPLES };
}

/**
 * Calibrate one raw score. `breakpoints` is `fitIsotonicCalibrator(...).breakpoints`.
 * Out-of-range scores clip to the nearest endpoint; in-range scores are
 * linearly interpolated between the two surrounding breakpoints. An empty
 * breakpoint set (unfitted calibrator) degrades to clamped identity — a
 * no-information calibrator must not distort its input.
 */
export function predictCalibrated(breakpoints, x) {
  const xv = Number(x);
  if (!Array.isArray(breakpoints) || breakpoints.length === 0) {
    return Number.isFinite(xv) ? clamp01(xv) : 0;
  }
  const first = breakpoints[0];
  const last = breakpoints[breakpoints.length - 1];
  if (!Number.isFinite(xv)) return first.y; // degenerate input → low-end clip
  if (xv <= first.x) return first.y;
  if (xv >= last.x) return last.y;

  // Binary search for the bracketing interval [lo, hi].
  let lo = 0;
  let hi = breakpoints.length - 1;
  while (hi - lo > 1) {
    const mid = (lo + hi) >> 1;
    if (breakpoints[mid].x <= xv) lo = mid;
    else hi = mid;
  }
  const a = breakpoints[lo];
  const b = breakpoints[hi];
  if (b.x === a.x) return b.y; // coincident x — defensive, dedup makes it rare
  const t = (xv - a.x) / (b.x - a.x);
  return a.y + t * (b.y - a.y);
}

/** Calibrate a whole array of raw scores; convenience over predictCalibrated. */
export function calibrateScores(breakpoints, scores) {
  if (!Array.isArray(scores)) return [];
  return scores.map((s) => predictCalibrated(breakpoints, s));
}

/**
 * Brier score — mean squared error of probabilistic predictions, the standard
 * calibration metric (lower is better; the NN-GRAPH-MS0 exit gate is
 * Brier <= 0.15). Throws RangeError on a length mismatch; an empty input has
 * no defined Brier and returns NaN (loud — surfaces in any report).
 */
export function brierScore(predicted, actual) {
  if (!Array.isArray(predicted) || !Array.isArray(actual) || predicted.length !== actual.length) {
    throw new RangeError("isotonic-calibrator: predicted and actual must be equal-length arrays");
  }
  if (predicted.length === 0) return NaN;
  let sum = 0;
  for (let i = 0; i < predicted.length; i++) {
    const d = Number(predicted[i]) - Number(actual[i]);
    sum += d * d;
  }
  return sum / predicted.length;
}
