// scripts/lib/dimension-set-score.mjs
//
// U-PSGB-XRAY-CLOSED-LOOP — the measurement core of the OCR closed loop.
// Given a set of OCR-extracted dimensions and a set of GROUND-TRUTH dimensions
// (from CAD geometry, a CNC program, or a synthetic label), score how well the
// OCR read the print: precision / recall / F1 / mean-abs-error, plus the explicit
// missed (truth dims the OCR didn't find) and extra (dims the OCR produced that
// aren't real — potential hallucinations) lists.
//
// Pure + deterministic (no I/O, no VLM) so it is the same scorer for every
// ground-truth source. Matching is by VALUE in millimetres (the pipeline's
// canonical unit) within a relative-percent tolerance plus an absolute floor
// (so a 0.5mm feature isn't held to an impossibly tight 1% = 0.005mm window).
//
// Tolerance rationale: OCR + CAD round differently (2.500" vs 2.5"), and a real
// print's stated nominal vs a CAD's computed extent differ by the part's actual
// tolerance band. 1% + 0.05mm absorbs formatting/rounding without matching a
// genuinely-different dimension. Both knobs are caller-overridable.

export const DEFAULT_TOL_PCT = 1.0;   // relative tolerance, percent of the larger magnitude
export const DEFAULT_TOL_ABS_MM = 0.05; // absolute floor in mm (small-feature guard)

/** Coerce a dimension (number or {nominal_mm}/{mm}/{value}) to a finite mm number, else null. */
export function dimToMm(d) {
  if (d === null || d === undefined) return null; // Number(null)===0 footgun — guard first
  if (typeof d === "boolean") return null;        // Number(true)===1 footgun — a bool is not a dim
  if (typeof d === "number") return Number.isFinite(d) ? d : null;
  if (typeof d === "object") {
    const v = d.nominal_mm ?? d.mm ?? d.value ?? d.nominal;
    if (v === null || v === undefined || v === "") return null;
    const n = Number(v);
    return Number.isFinite(n) ? n : null;
  }
  if (typeof d === "string" && d.trim() === "") return null; // Number("")===0 footgun
  const n = Number(d);
  return Number.isFinite(n) ? n : null;
}

/** True if two mm values match within max(absMm, pct% of the larger magnitude). */
export function dimMatches(a, b, opts = {}) {
  const pct = Number.isFinite(opts.pct) ? opts.pct : DEFAULT_TOL_PCT;
  const absMm = Number.isFinite(opts.absMm) ? opts.absMm : DEFAULT_TOL_ABS_MM;
  if (!Number.isFinite(a) || !Number.isFinite(b)) return false;
  const tol = Math.max(absMm, (pct / 100) * Math.max(Math.abs(a), Math.abs(b)));
  return Math.abs(a - b) <= tol;
}

// Type-aware matching is ON by default — a more honest training signal (a diameter must not
// match a linear/angular of equal magnitude). Bare-number inputs (no type) fall back to
// value-only automatically, so the legacy contract is preserved; pass opts.typeAware=false
// to force the old value-only "value-recovery" metric for everything.
export const DEFAULT_TYPE_AWARE = true;

// Non-informative type strings that mean "the producer didn't actually classify this" — these
// MUST collapse to null (value-only fallback), NOT be treated as a distinct equality class.
// CRITICAL: parseVisionResponse (ollama-vision-extract-lib.mjs) defaults every extracted dim to
// type:"unknown" (the literal string, not null) when the VLM omits a type. Without this, a real
// OCR extraction would score matched=0 against typed ground truth — silently zeroing the training
// signal. (Caught in scrutiny — the value-only fallback must key on the PRODUCER's actual sentinel.)
const TYPE_SENTINELS = new Set(["unknown", "unspecified", "none", "n/a", "na", "null", "undefined", "?"]);

/** Extract a normalized dimension type from a dim object (`type`, or the legacy `kind` alias); null
 *  if unknown OR a non-informative sentinel (→ value-only fallback). */
export function dimType(d) {
  if (d && typeof d === "object") {
    const t = d.type ?? d.kind;
    if (typeof t === "string" && t.trim()) {
      const norm = t.trim().toLowerCase();
      return TYPE_SENTINELS.has(norm) ? null : norm;
    }
  }
  return null; // bare number / no type / sentinel → unknown
}

/**
 * Type compatibility for a candidate match. An UNKNOWN type (null) on either side → compatible
 * (value-only fallback, preserving bare-number back-compat). Two KNOWN types must be equal — this
 * is what stops a value-only false positive (e.g. an OCR'd diameter Ø45 pairing a truth angular 45°
 * or a linear 45 mm of equal magnitude).
 */
export function typesCompatible(a, b) {
  if (a == null || b == null) return true;
  return a === b;
}

/**
 * Score an extracted dimension set against a ground-truth set.
 * @param {Array} extracted  OCR dims (numbers or {nominal_mm, type?})
 * @param {Array} truth      ground-truth dims (numbers or {nominal_mm, type?})
 * @param {{pct?:number, absMm?:number, typeAware?:boolean}} [opts]
 * @returns {{precision:number|null, recall:number|null, f1:number|null,
 *            mae_mm:number|null, matched:number, n_extracted:number, n_truth:number,
 *            missed_mm:number[], extra_mm:number[], type_aware:boolean,
 *            pairs:Array<{truth:number,got:number,delta_mm:number,truth_type:(string|null),got_type:(string|null)}>}}
 */
export function scoreDimensionSet(extracted, truth, opts = {}) {
  const typeAware = opts.typeAware === undefined ? DEFAULT_TYPE_AWARE : !!opts.typeAware;
  const exT = (Array.isArray(extracted) ? extracted : []).map((d) => ({ mm: dimToMm(d), type: dimType(d) })).filter((e) => e.mm !== null);
  const trT = (Array.isArray(truth) ? truth : []).map((d) => ({ mm: dimToMm(d), type: dimType(d) })).filter((e) => e.mm !== null);
  const ex = exT.map((e) => e.mm);
  const tr = trT.map((e) => e.mm);

  // OPTIMAL (max-cardinality) assignment via Kuhn's augmenting-path bipartite matching. Replaces the
  // old closest-first greedy, which UNDERCOUNTED when two truth dims sat closer than the tolerance band
  // (truth [100,100.9] vs got [100.5,101.4] → greedy 1, optimal 2). The matched COUNT is now provably
  // maximal — the load-bearing metric, since it drives precision/recall/F1 and thus the training gradient.
  // Adjacency is sorted by |delta| so the matching prefers the closest pairing among max-cardinality
  // solutions (MAE is near-optimal; count is exact). Type-aware (default) filters infeasible cross-type
  // pairs before matching (a value-only false positive otherwise inflates the score); opts.typeAware=false
  // restores the legacy value-only metric.
  const adj = [];
  for (let i = 0; i < trT.length; i++) {
    const list = [];
    for (let j = 0; j < exT.length; j++) {
      if (!dimMatches(tr[i], ex[j], opts)) continue;
      if (typeAware && !typesCompatible(trT[i].type, exT[j].type)) continue;
      list.push({ j, delta: Math.abs(tr[i] - ex[j]) });
    }
    list.sort((p, q) => p.delta - q.delta || p.j - q.j);
    adj.push(list.map((e) => e.j));
  }
  const matchTr = new Array(trT.length).fill(-1); // truth i → ex j
  const matchEx = new Array(exT.length).fill(-1); // ex j → truth i
  const augment = (i, seen) => {
    for (const j of adj[i]) {
      if (seen[j]) continue;
      seen[j] = true;
      if (matchEx[j] === -1 || augment(matchEx[j], seen)) {
        matchEx[j] = i; matchTr[i] = j; return true;
      }
    }
    return false;
  };
  for (let i = 0; i < trT.length; i++) augment(i, new Array(exT.length).fill(false));

  const pairs = [];
  for (let i = 0; i < trT.length; i++) {
    const j = matchTr[i];
    if (j === -1) continue;
    pairs.push({ truth: tr[i], got: ex[j], delta_mm: +(ex[j] - tr[i]).toFixed(4), truth_type: trT[i].type, got_type: exT[j].type });
  }
  const matched = pairs.length;
  const missed_mm = tr.filter((_, i) => matchTr[i] === -1);
  const extra_mm = ex.filter((_, j) => matchEx[j] === -1);
  const precision = ex.length ? +(matched / ex.length).toFixed(4) : null;
  const recall = tr.length ? +(matched / tr.length).toFixed(4) : null;
  const f1 = (precision !== null && recall !== null && precision + recall > 0)
    ? +((2 * precision * recall) / (precision + recall)).toFixed(4) : (precision === null && recall === null ? null : 0);
  const mae_mm = matched ? +(pairs.reduce((s, p) => s + Math.abs(p.delta_mm), 0) / matched).toFixed(4) : null;
  return { precision, recall, f1, mae_mm, matched, n_extracted: ex.length, n_truth: tr.length, missed_mm, extra_mm, pairs, type_aware: typeAware };
}

/** Aggregate per-print scores into a corpus accuracy roll-up. */
export function aggregateScores(scores) {
  const arr = (Array.isArray(scores) ? scores : []).filter((s) => s && typeof s === "object");
  if (!arr.length) return { prints: 0, micro_precision: null, micro_recall: null, micro_f1: null, mean_mae_mm: null, total_matched: 0, total_truth: 0, total_extracted: 0 };
  let m = 0, t = 0, e = 0, maeSum = 0, maeN = 0;
  for (const s of arr) {
    m += s.matched || 0; t += s.n_truth || 0; e += s.n_extracted || 0;
    if (Number.isFinite(s.mae_mm)) { maeSum += s.mae_mm; maeN++; }
  }
  const micro_precision = e ? +(m / e).toFixed(4) : null;
  const micro_recall = t ? +(m / t).toFixed(4) : null;
  const micro_f1 = (micro_precision && micro_recall && micro_precision + micro_recall > 0)
    ? +((2 * micro_precision * micro_recall) / (micro_precision + micro_recall)).toFixed(4) : 0;
  return {
    prints: arr.length, micro_precision, micro_recall, micro_f1,
    mean_mae_mm: maeN ? +(maeSum / maeN).toFixed(4) : null,
    total_matched: m, total_truth: t, total_extracted: e,
  };
}
