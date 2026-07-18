/**
 * lathe-pair-accuracy.mjs -- slot:whiskey  [exact per-PAIR closeness scorer]
 * ==========================================================================
 * Scores a PRISM-generated turning op's speeds/feeds against a SPECIFIC reference
 * program's params (the paired JM-source / rev-over-rev program), giving a REAL
 * per-part exact-match number -- NOT band membership.
 *
 * Distinct from `lathe-band-score.mjs`, which scores a generated program against
 * the statistical p05..p95 CLOUD of the whole .MIN corpus (a value can be ~5x off
 * and still pass a wide band). This lib answers the sharper question the operator
 * asked -- "is the generated program 100% accurate vs the real program for THIS part"
 * -- by comparing param-for-param against ONE reference program.
 *
 * R5: code, not a model -- pure arithmetic. No I/O, no engine imports, no network;
 * fully unit-testable in isolation. The harness that FEEDS it matched gen<->ref
 * op-pairs (extract reference params from the .MIN + run runPipeline on the same
 * geometry) is the next increment -- this is the verifiable scoring CORE (R13).
 *
 * UNITS FIRST: the pipeline emits METRIC (cutting_speed_m_min, feed_mm_rev); the
 * JM .MIN corpus is an inch shop (SFM, IPR). We convert metric -> imperial via the
 * shared converters in lathe-band-score.mjs so both sides compare as SFM/IPR.
 */

import { sfmFromMetric, iprFromMmRev, classifyOpBand } from "./lathe-band-score.mjs";

/** +/-10% = "matches" -- the operator-stated verdict band (PRISM x HSMAdvisor x G-Wizard +-10%). */
export const DEFAULT_TOL_PCT = 10;

/**
 * Relative error % of a generated value vs a reference value.
 * Non-finite generated/reference, or a zero reference (no meaningful ratio),
 * return null (UNSCOREABLE) rather than NaN/Infinity -- the caller excludes nulls.
 */
export function relErrorPct(generated, reference) {
  if (!Number.isFinite(generated) || !Number.isFinite(reference) || reference === 0) return null;
  return (Math.abs(generated - reference) / Math.abs(reference)) * 100;
}

/** True iff generated is within +/-tolPct% of reference; null when unscoreable. */
export function withinTol(generated, reference, tolPct = DEFAULT_TOL_PCT) {
  const e = relErrorPct(generated, reference);
  return e === null ? null : e <= tolPct;
}

/** Median of the finite numbers in arr, or null when none are finite. */
export function medianFinite(arr) {
  const xs = arr.filter(Number.isFinite).sort((a, b) => a - b);
  if (!xs.length) return null;
  const m = Math.floor(xs.length / 2);
  return xs.length % 2 ? xs[m] : (xs[m - 1] + xs[m]) / 2;
}

/**
 * Score one op-pair on SFM + IPR. genOp/refOp carry the pipeline's metric fields
 * `{operation_type, cutting_speed_m_min, feed_mm_rev}`. Specialty ops (thread /
 * part_off / groove) are flagged `scored:false` -- their feed regime (thread lead =
 * pitch, part-off intentionally slow) is not an SFM/IPR closeness comparison (R12,
 * same exclusion as the band score).
 */
export function scoreOpPair(genOp, refOp, opts = {}) {
  const tol = opts.tolPct ?? DEFAULT_TOL_PCT;
  const opType = genOp?.operation_type ?? refOp?.operation_type;
  const band = classifyOpBand(opType);
  const genSfm = sfmFromMetric(genOp?.cutting_speed_m_min);
  const refSfm = sfmFromMetric(refOp?.cutting_speed_m_min);
  const genIpr = iprFromMmRev(genOp?.feed_mm_rev);
  const refIpr = iprFromMmRev(refOp?.feed_mm_rev);
  return {
    operation_type: opType,
    band,
    scored: band !== "specialty",
    sfm: { generated: genSfm, reference: refSfm, rel_error_pct: relErrorPct(genSfm, refSfm), within_tol: withinTol(genSfm, refSfm, tol) },
    ipr: { generated: genIpr, reference: refIpr, rel_error_pct: relErrorPct(genIpr, refIpr), within_tol: withinTol(genIpr, refIpr, tol) },
  };
}

/**
 * Pair a generated op-list against a reference op-list by (operation_type, ordinal-within-type):
 * the k-th `rough` of generated <-> the k-th `rough` of reference, etc. Ops with no counterpart of
 * the same type (an extra rough on one side) are DROPPED -- you can only score what genuinely pairs
 * (R12: no fabricated comparison). Returns `[{generated, reference}]` ready for scorePairSet.
 *
 * This is a deliberately simple type-ordinal alignment -- adequate when both programs follow the same
 * op sequence (the common print-to-program / rev-over-rev case). A future increment can add a richer
 * alignment (by feature/diameter) when sequences diverge.
 */
export function matchOpPairsByType(genOps, refOps) {
  const byType = (ops) => {
    const m = new Map();
    for (const o of Array.isArray(ops) ? ops : []) {
      const t = o?.operation_type;
      if (t == null) continue;
      if (!m.has(t)) m.set(t, []);
      m.get(t).push(o);
    }
    return m;
  };
  const g = byType(genOps);
  const r = byType(refOps);
  const pairs = [];
  for (const [t, gList] of g) {
    const rList = r.get(t) ?? [];
    const n = Math.min(gList.length, rList.length);
    for (let i = 0; i < n; i++) pairs.push({ generated: gList[i], reference: rList[i] });
  }
  return pairs;
}

/**
 * Build a REPRESENTATIVE reference op per band: the MEDIAN SFM/feed over that band's
 * OD-comparable ops. PRISM emits ONE canonical od_rough + od_finish; a real JM .MIN has
 * many ops per band including near-center finish/face cuts (a G97 cut at X~0.04in is
 * genuinely ~7 SFM -- correct physics, NOT a parse bug). Pairing PRISM's single OD op
 * against the k-th JM op of that band lands on whichever op is first (often near-center),
 * fabricating divergence. The representative = the median of the band's OD ops
 * (dia_in >= minDiaIn). Ops with UNKNOWN dia_in are kept (missing data must not silently
 * drop a real op); a band whose every op is near-center yields NO representative (dropped,
 * R12 -- no fabricated comparison). Returns Map<band, {operation_type, cutting_speed_m_min,
 * feed_mm_rev, n_band, n_used}>. Specialty bands (thread/part-off/groove) are excluded.
 */
export function representativeRefByBand(refOps, opts = {}) {
  const minDiaIn = opts.minDiaIn ?? 0.2; // ~5mm: excludes centerline drill / part-off-to-center / face-to-center ops
  const byBand = new Map();
  for (const o of Array.isArray(refOps) ? refOps : []) {
    const band = classifyOpBand(o?.operation_type);
    if (band === "specialty") continue;
    if (!byBand.has(band)) byBand.set(band, []);
    byBand.get(band).push(o);
  }
  const rep = new Map();
  for (const [band, ops] of byBand) {
    const used = ops.filter((o) => o?.dia_in == null || o.dia_in >= minDiaIn);
    if (!used.length) continue; // every op near-center -> no OD representative for this band
    const medVc = medianFinite(used.map((o) => o?.cutting_speed_m_min));
    const medFeed = medianFinite(used.map((o) => o?.feed_mm_rev));
    if (medVc == null && medFeed == null) continue; // nothing scoreable
    rep.set(band, { operation_type: band, cutting_speed_m_min: medVc, feed_mm_rev: medFeed, n_band: ops.length, n_used: used.length });
  }
  return rep;
}

/**
 * Pair each generated op against the REPRESENTATIVE (median OD) reference op of its band
 * (representativeRefByBand), not the k-th same-type ref op. Robust when the reference program
 * has many ops per band while the generated program has one canonical op per band (the
 * print-to-program case). At most one pairing per band (the first generated op of that band).
 * Bands with no OD representative are dropped (honest, R12). Returns `[{generated, reference}]`.
 */
export function matchOpBandRepresentative(genOps, refOps, opts = {}) {
  const rep = representativeRefByBand(refOps, opts);
  const pairs = [];
  const seen = new Set();
  for (const g of Array.isArray(genOps) ? genOps : []) {
    const band = classifyOpBand(g?.operation_type);
    if (band === "specialty" || seen.has(band)) continue;
    const r = rep.get(band);
    if (!r) continue;
    pairs.push({ generated: g, reference: r });
    seen.add(band);
  }
  return pairs;
}

/**
 * Aggregate already-matched gen<->ref op-pairs into a per-part accuracy report.
 * Excludes specialty + unscoreable ops from the closeness %. Verdict:
 *   match     -- BOTH median SFM err AND median IPR err <= tol
 *   close     -- both within 2x tol
 *   divergent -- otherwise
 *   no-scoreable-ops -- nothing comparable (all specialty / unscoreable)
 *
 * @param {Array<{generated:object, reference:object}>} opPairs
 */
export function scorePairSet(opPairs, opts = {}) {
  const tol = opts.tolPct ?? DEFAULT_TOL_PCT;
  const list = Array.isArray(opPairs) ? opPairs : [];
  const scored = list.map((p) => scoreOpPair(p.generated, p.reference, { tolPct: tol })).filter((s) => s.scored);
  const sfmErrs = scored.map((s) => s.sfm.rel_error_pct).filter((x) => x !== null);
  const iprErrs = scored.map((s) => s.ipr.rel_error_pct).filter((x) => x !== null);
  const n = scored.length;
  const sfmWithin = scored.filter((s) => s.sfm.within_tol === true).length;
  const iprWithin = scored.filter((s) => s.ipr.within_tol === true).length;
  const medSfm = medianFinite(sfmErrs);
  const medIpr = medianFinite(iprErrs);
  const within = (m) => m !== null && m <= tol;
  const within2x = (m) => m !== null && m <= tol * 2;
  const verdict = n === 0 ? "no-scoreable-ops"
    : (within(medSfm) && within(medIpr)) ? "match"
    : (within2x(medSfm) && within2x(medIpr)) ? "close"
    : "divergent";
  const round1 = (x) => (x === null ? null : Math.round(x * 10) / 10);
  return {
    n_ops_scored: n,
    tol_pct: tol,
    sfm_within_pct: n ? Math.round((sfmWithin / n) * 1000) / 10 : null,
    ipr_within_pct: n ? Math.round((iprWithin / n) * 1000) / 10 : null,
    median_sfm_error_pct: round1(medSfm),
    median_ipr_error_pct: round1(medIpr),
    verdict,
  };
}
