// scripts/lib/sfc-corpus-analyze-lib.mjs
//
// SFC-JM-ACCURACY -- pure statistics core for analyzing the as-programmed JM
// parameter corpus (output of sfc-jm-program-corpus.mjs). Given the programmed
// spindle/feed values bucketed by (machineClass, spindleMode), it computes the
// shop's own distribution and flags ops that are statistical outliers -- the
// "the programs are written by amateurs, use them as the guideline to TEST
// AGAINST" candidates the operator named. An IQR-fence outlier is a program whose
// programmed value the shop's OWN body of work disagrees with; those are the
// highest-priority cases for PRISM's SFC to re-adjudicate.
//
// Shop-relative (IQR within a bucket) is unit-agnostic WITHIN a bucket (all rows
// share the same programming convention), so it is robust to the fact that most
// JM .MIN programs omit G20/G21. A secondary GROSS-physical screen (absolute
// bounds) is provided but is explicitly assumption-labeled (JM inch convention).
//
// PURE: no fs / no fetch.

/** Exact percentile of a numeric array (linear interpolation). Not mutating. */
export function percentile(values, p) {
  if (!Array.isArray(values) || values.length === 0) return null;
  if (p <= 0) return Math.min(...values);
  if (p >= 100) return Math.max(...values);
  const sorted = [...values].sort((a, b) => a - b);
  const rank = (p / 100) * (sorted.length - 1);
  const lo = Math.floor(rank);
  const hi = Math.ceil(rank);
  if (lo === hi) return sorted[lo];
  const frac = rank - lo;
  return sorted[lo] * (1 - frac) + sorted[hi] * frac;
}

/** Five-number-plus summary of a numeric sample. */
export function summarize(values) {
  const clean = (values || []).filter((v) => Number.isFinite(v));
  if (clean.length === 0) return { n: 0 };
  const sorted = [...clean].sort((a, b) => a - b);
  const at = (p) => percentile(sorted, p);
  return {
    n: clean.length,
    min: sorted[0],
    p10: at(10),
    p25: at(25),
    median: at(50),
    p75: at(75),
    p90: at(90),
    max: sorted[sorted.length - 1],
  };
}

/** Tukey IQR fences from a summary (1.5*IQR). Values outside are outliers. */
export function iqrFences(summary, k = 1.5) {
  if (!summary || summary.n < 4 || summary.p25 == null || summary.p75 == null) return null;
  const iqr = summary.p75 - summary.p25;
  return {
    iqr,
    lower: summary.p25 - k * iqr,
    upper: summary.p75 + k * iqr,
  };
}

/** Classify a value against fences: 'low' | 'high' | 'normal'. */
export function classifyAgainstFences(value, fences) {
  if (fences == null || !Number.isFinite(value)) return "normal";
  if (value < fences.lower) return "low";
  if (value > fences.upper) return "high";
  return "normal";
}

// Absolute physical sanity bounds. Lathe CSS surface speed is interpreted in the
// program's units: m/min if metric, else sfm (JM inch convention -- LABELED, not
// silently assumed). RPM + feed bounds are unit-convention bounded conservatively
// so only GROSS errors trip (a real amateur fat-finger, not a borderline choice).
export const GROSS_BOUNDS = Object.freeze({
  css_sfm: { min: 20, max: 1500 },      // turning surface speed, sfm (inch convention)
  css_mmin: { min: 6, max: 460 },       // turning surface speed, m/min (metric)
  rpm: { min: 20, max: 30000 },         // direct spindle rpm
  feed_per_rev_ipr: { min: 0.0002, max: 0.08 },   // ipr (inch)
  feed_per_rev_mmr: { min: 0.005, max: 2.0 },      // mm/rev (metric)
  feed_per_min_ipm: { min: 0.1, max: 800 },        // ipm (inch)
  feed_per_min_mmm: { min: 2, max: 20000 },        // mm/min (metric)
});

/**
 * Gross-physical sanity flags for one op. `metric` selects the unit interpretation.
 * Returns an array of flag strings (empty = nothing gross).
 */
export function grossFlags(op, units) {
  const metric = units === "metric";
  const out = [];
  const s = op.spindleValue;
  if (Number.isFinite(s)) {
    if (op.spindleMode === "css") {
      const b = metric ? GROSS_BOUNDS.css_mmin : GROSS_BOUNDS.css_sfm;
      if (s < b.min) out.push("css-too-low");
      else if (s > b.max) out.push("css-too-high");
    } else if (op.spindleMode === "rpm") {
      if (s < GROSS_BOUNDS.rpm.min) out.push("rpm-too-low");
      else if (s > GROSS_BOUNDS.rpm.max) out.push("rpm-too-high");
    }
  }
  const f = op.feed;
  if (Number.isFinite(f)) {
    if (op.feedMode === "per_rev") {
      const b = metric ? GROSS_BOUNDS.feed_per_rev_mmr : GROSS_BOUNDS.feed_per_rev_ipr;
      if (f < b.min) out.push("feed-too-low");
      else if (f > b.max) out.push("feed-too-high");
    } else if (op.feedMode === "per_min") {
      const b = metric ? GROSS_BOUNDS.feed_per_min_mmm : GROSS_BOUNDS.feed_per_min_ipm;
      if (f < b.min) out.push("feed-too-low");
      else if (f > b.max) out.push("feed-too-high");
    }
  }
  return out;
}

/** The bucket key for an op: machineClass x spindleMode (the comparison group). */
export function bucketKey(machineCategory, spindleMode) {
  return `${machineCategory || "unknown"}|${spindleMode || "unknown"}`;
}
