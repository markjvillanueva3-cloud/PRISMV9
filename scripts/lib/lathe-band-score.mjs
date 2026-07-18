/**
 * lathe-band-score.mjs -- slot:whiskey  [U-W2C: Rung C-CAD scoring core]
 * ==========================================================================
 * Pure, deterministic scoring of a PRISM-generated turning program's
 * speeds/feeds against the Rung A empirical ground-truth cloud mined from the
 * real JM Okuma .MIN corpus (state/shared/dashboards/lathe-jmdie-param-accuracy.json
 * -> op_parameter_reference[<op>].{sfm,feed_ipr} percentile bands).
 *
 * This is the SCORING leg of the closed-loop geometry test (Rung C-CAD):
 *   print PDF -> vision OCR -> TurningInput -> runPipeline -> operations[]
 *   -> THIS LIB scores each op's cutting_speed_m_min/feed_mm_rev vs the bands.
 *
 * R5: code, not a model -- pure arithmetic + interval membership.
 * No I/O, no network, no engine imports -- fully unit-testable in isolation.
 *
 * Units note (UNITS FIRST): the pipeline emits METRIC (cutting_speed_m_min,
 * feed_mm_rev); the empirical bands are IMPERIAL (SFM, IPR) because the JM
 * .MIN corpus is an inch shop. We convert pipeline metric -> imperial before
 * comparing so both sides are SFM/IPR.
 */

/** Exact m/min -> surface feet per minute. 1 m = 3.280839895 ft. */
export const SFM_PER_M_MIN = 3.280839895;

/** m/min -> SFM (surface ft/min). */
export function sfmFromMetric(m_min) {
  return m_min * SFM_PER_M_MIN;
}

/** mm/rev -> IPR (inch/rev). 1 inch = 25.4 mm. */
export function iprFromMmRev(mm_rev) {
  return mm_rev / 25.4;
}

/**
 * Map a TurningOpType to the op_parameter_reference band key.
 * rough  : material-removal heavy (rough/bore_rough)
 * finish : light finishing (finish/groove_finish/taper)
 * drill  : axial drilling (drill/center_drill)
 * specialty: threading / parting / grooving -- specialized feed regimes
 *            (thread lead = pitch, part_off intentionally slow) that the
 *            general SFM/IPR cloud does NOT describe -> EXCLUDED from the
 *            band score (R12: do not score against a band that does not apply).
 */
export function classifyOpBand(opType) {
  const t = String(opType || "").toLowerCase();
  if (t.includes("thread") || t.includes("part_off") || t === "groove") return "specialty";
  if (t.includes("drill")) return "drill"; // drill, center_drill
  if (t.includes("rough")) return "rough"; // od_rough,id_rough,face_rough,bore_rough
  if (t.includes("finish") || t === "taper") return "finish";
  return "specialty"; // unknown -> not band-scored (honest)
}

/**
 * Interval membership against a percentile band {p05,p25,p50,p75,p95}.
 * Returns BOTH a loose sanity band (p05..p95) and a tight typical band
 * (p25..p75) so the report distinguishes "physically plausible" from
 * "matches the typical real-program value".
 * Non-finite / negative values are never in band (R: adversarial NaN/Inf).
 */
export function bandMembership(value, stats) {
  const ok = Number.isFinite(value) && value >= 0 && stats && Number.isFinite(stats.p05);
  if (!ok) {
    return { value, valid: false, in_p05_p95: false, in_p25_p75: false, p50: stats?.p50 ?? null };
  }
  return {
    value,
    valid: true,
    in_p05_p95: value >= stats.p05 && value <= stats.p95,
    in_p25_p75: value >= stats.p25 && value <= stats.p75,
    p50: stats.p50,
  };
}

/**
 * Score a single planned op vs the bands. Returns null-scored entry for
 * specialty ops or ops missing a matching band / cutting params.
 * @param op   a TurningPlannedOp ({operation_type, cutting_params:{cutting_speed_m_min,feed_mm_rev}})
 * @param opRef op_parameter_reference from the Rung A dashboard
 */
export function scoreOp(op, opRef) {
  const band = classifyOpBand(op?.operation_type);
  const cp = op?.cutting_params || {};
  const ref = opRef?.[band];
  const base = {
    op_number: op?.op_number ?? null,
    operation_type: op?.operation_type ?? null,
    band,
    scored: false,
    reason: null,
    sfm: null,
    ipr: null,
  };
  if (band === "specialty") return { ...base, reason: "specialty-op-not-band-scored" };
  if (!ref || !ref.sfm || !ref.feed_ipr) return { ...base, reason: `no-band-for:${band}` };
  const sfmVal = sfmFromMetric(Number(cp.cutting_speed_m_min));
  const iprVal = iprFromMmRev(Number(cp.feed_mm_rev));
  const sfm = bandMembership(sfmVal, ref.sfm);
  const ipr = bandMembership(iprVal, ref.feed_ipr);
  if (!sfm.valid && !ipr.valid) return { ...base, reason: "no-valid-cutting-params", sfm, ipr };
  return { ...base, scored: true, sfm, ipr };
}

/**
 * Score a whole program's operations against the empirical cloud.
 * Reports loose (p05-p95) and tight (p25-p75) in-band rates for SFM and IPR
 * over the band-scorable ops only (specialty ops are counted but excluded).
 * Empty / all-specialty programs return null rates (never NaN) -- R12.
 */
export function scoreProgram(operations, opRef) {
  const ops = Array.isArray(operations) ? operations : [];
  const per_op = ops.map((o) => scoreOp(o, opRef));
  const scored = per_op.filter((s) => s.scored);
  const n = scored.length;
  const cnt = (sel) => scored.filter(sel).length;
  const pct = (k) => (n > 0 ? Math.round((k / n) * 1000) / 10 : null);

  const sfmLoose = cnt((s) => s.sfm?.in_p05_p95);
  const sfmTight = cnt((s) => s.sfm?.in_p25_p75);
  const iprLoose = cnt((s) => s.ipr?.in_p05_p95);
  const iprTight = cnt((s) => s.ipr?.in_p25_p75);
  const bothLoose = cnt((s) => s.sfm?.in_p05_p95 && s.ipr?.in_p05_p95);

  return {
    total_ops: ops.length,
    band_scored_ops: n,
    specialty_ops: per_op.filter((s) => s.band === "specialty").length,
    sfm_in_band_pct: pct(sfmLoose),       // loose (p05-p95) sanity floor
    sfm_typical_pct: pct(sfmTight),       // tight (p25-p75) typical-value match
    ipr_in_band_pct: pct(iprLoose),
    ipr_typical_pct: pct(iprTight),
    both_in_band_pct: pct(bothLoose),
    per_op,
  };
}
