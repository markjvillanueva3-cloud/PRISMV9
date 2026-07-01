// quoting-actuals-match.mjs -- pure distribution-match of PRISM's predicted quote
// distribution against the REAL settled-price actuals extracted from JM Orders-Closed POs
// (U-QP-EMIT-STANDALONE-ACTUALS -> orders-closed-actuals.jsonl, $355M / 6,718 actuals).
//
// U-QP-TRAINCYCLE-FEED (slot:charlie). This is the gate-SAFE consumption path: an ADVISORY
// calibration signal (how far PRISM's predictions sit from reality), mirroring the existing
// outbound real_distribution_match. It NEVER alters the calibration factor and NEVER touches
// the PLACEHOLDER_MARKERS provenance gate (the actuals are REAL, not placeholders). The factor
// promotion stays gated by CoV in QuotingClosedLoopEngine -- untouched.
//
// No inline shop-rate/margin constants (charlie soul) -- only generic distribution stats.

import { readFileSync } from "node:fs";

/** Median of a sorted numeric array. Pure. */
function median(sorted) {
  const n = sorted.length;
  if (n === 0) return null;
  const mid = Math.floor(n / 2);
  return n % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/** Percentile (linear interp on the sorted array). Pure. */
function percentile(sorted, p) {
  const n = sorted.length;
  if (n === 0) return null;
  if (n === 1) return sorted[0];
  const idx = (p / 100) * (n - 1);
  const lo = Math.floor(idx), hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (sorted[hi] - sorted[lo]) * (idx - lo);
}

/** Summarize a price distribution. Pure. Returns null on empty/invalid. */
export function summarizeDistribution(values) {
  const clean = (Array.isArray(values) ? values : [])
    .map((v) => (typeof v === "number" ? v : Number(v)))
    .filter((v) => Number.isFinite(v) && v > 0)
    .sort((a, b) => a - b);
  if (clean.length === 0) return null;
  const total = clean.reduce((s, v) => s + v, 0);
  return {
    n: clean.length,
    total,
    mean: total / clean.length,
    median: median(clean),
    p25: percentile(clean, 25),
    p75: percentile(clean, 75),
    min: clean[0],
    max: clean[clean.length - 1],
  };
}

/**
 * Compare a PREDICTED price distribution against the REAL actuals distribution. Pure.
 * Returns an ADVISORY match block (median_ratio, within_band_pct) -- never a factor.
 *
 * @param {number[]} predicted  PRISM's predicted FMV/quote prices
 * @param {number[]} actual     real settled prices (Orders-Closed actuals)
 * @param {{bandPct?: number}} [opts]  band for within_band_pct (default 0.25 = +/-25%)
 */
export function matchPredictedToActuals(predicted, actual, opts = {}) {
  const bandPct = Number.isFinite(opts.bandPct) ? opts.bandPct : 0.25;
  const pred = summarizeDistribution(predicted);
  const act = summarizeDistribution(actual);
  if (!pred || !act) {
    return { ok: false, reason: !act ? "no-actuals" : "no-predictions", advisory: true };
  }
  // Median ratio: predicted / actual. ~1.0 = calibrated; >1 = PRISM over-quotes vs reality.
  const medianRatio = act.median > 0 ? pred.median / act.median : null;
  // Fraction of predictions within +/-bandPct of the actual MEDIAN (coarse single-reference
  // band -- per-part pairing is the precise form, deferred).
  const lo = act.median * (1 - bandPct), hi = act.median * (1 + bandPct);
  const predClean = (Array.isArray(predicted) ? predicted : []).filter((v) => Number.isFinite(v) && v > 0);
  const withinBand = predClean.filter((v) => v >= lo && v <= hi).length;
  const withinBandPct = predClean.length ? withinBand / predClean.length : 0;
  let verdict;
  if (medianRatio == null) verdict = "indeterminate";
  else if (medianRatio >= 0.9 && medianRatio <= 1.1) verdict = "calibrated";
  else if (medianRatio > 1.1) verdict = "over-quoting";
  else verdict = "under-quoting";
  return {
    ok: true,
    advisory: true,
    predicted_median: pred.median,
    actual_median: act.median,
    median_ratio: medianRatio,
    within_band_pct: withinBandPct,
    band_pct: bandPct,
    predicted_n: pred.n,
    actual_n: act.n,
    actual_total_usd: act.total,
    verdict,
    units_note: "predicted FMV vs real Orders-Closed settled price; ADVISORY -- never alters the factor",
  };
}

/**
 * Load real settled-price values from an orders-closed-actuals.jsonl output (the wrapping
 * { actuals: [...] } object). `opts.readImpl` injectable for hermetic tests (default fs).
 *
 * @param {string} path
 * @param {{readImpl?: function, minConfidence?: number}} [opts]
 * @returns {{ prices: number[], count: number, withMinConf: number, source: string }|null}
 */
export function loadActualPrices(path, opts = {}) {
  const read = typeof opts.readImpl === "function" ? opts.readImpl : (p) => readFileSync(p, "utf8");
  const minConf = Number.isFinite(opts.minConfidence) ? opts.minConfidence : 0;
  let raw;
  try { raw = read(path); } catch { return null; }
  let parsed;
  try { parsed = JSON.parse(raw); } catch { return null; }
  const actuals = Array.isArray(parsed?.actuals) ? parsed.actuals : [];
  const eligible = actuals.filter((a) => (a?.extraction_confidence ?? 0) >= minConf);
  const prices = eligible
    .map((a) => Number(a?.actual_invoice_usd))
    .filter((v) => Number.isFinite(v) && v > 0);
  return { prices, count: actuals.length, withMinConf: eligible.length, source: path };
}
