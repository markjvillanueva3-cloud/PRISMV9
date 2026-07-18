/**
 * cad-correction-plan.mjs -- DIRECT target-correction planner for the GENERATED-FROM-SPEC regime.
 * U-INDIA-CAD-CORRECTION-PLAN (slot:india, 2026-07-02, KIENZLE one-shot CAD lever #1b).
 *
 * WHY (the regime distinction that makes this NOT a duplicate of CADRegenCorrectionEngine):
 *   - CADRegenCorrectionEngine (delta, Stage-6) is an ITERATIVE convergence corrector for the
 *     UNKNOWN-TARGET case -- reverse-engineering a proprietary part whose intended param values are
 *     unknown, so it searches (proportional / secant / coordinate-descent) and needs a hand-built
 *     influenceMap (metric -> param). Correct tool when you must DISCOVER the target.
 *   - This planner is for the KNOWN-TARGET case -- the AI generated a model FROM A SPEC, so every
 *     intended value IS known. `cad-feature-correspondence.correspondFeatures()` already pairs each
 *     drawn feature to its intended feature id-free and emits the exact per-parameter delta. When the
 *     target is known there is nothing to iterate: the correction is a DIRECT edit list
 *     (set drawn param X -> intended value Y; add the missing feature; remove the hallucinated one).
 *     This is the operator's "2nd pass generates a perfect comparison" -- a deterministic, one-shot
 *     repair plan, worst-error-first, that a regenerator (or an LLM re-draw prompt) applies directly.
 *
 * COMPOSES (does not edit) `cad-feature-correspondence.mjs`. PURE: no fs, no clock, no engine imports
 * -> node:test-friendly. Tolerance gating mirrors delta's dimDivergence philosophy (abs floor OR pct
 * band = in-tolerance) so sub-micron float noise never becomes a spurious edit.
 *
 * INTEGRATION SEAM (delta owns the hot path): feed FeatureRecognition snapshots of the generated STEP
 * + the reference STEP into correspondFeatures(), pass the result here, then apply .rankedActions --
 * structural adds/removes first, then the most-wrong dimensions -- to regenerate. `.summary.perfect`
 * === true is the one-shot success signal (nothing to fix). Left unwired here (R15-aware hand-off).
 */

import { correspondFeatures } from "./cad-feature-correspondence.mjs";

/** Round to a clean magnitude for directive strings (10.2 stays 10.2; kills 10.19999999). */
function fmtNum(x) {
  if (typeof x !== "number" || !Number.isFinite(x)) return String(x);
  return String(Math.round(x * 1e6) / 1e6);
}

/** Render a param value for a directive: quote strings so a categorical change reads unambiguously. */
function fmtVal(v) {
  return typeof v === "string" ? `"${v}"` : fmtNum(v);
}

/**
 * A numeric drawn param is IN tolerance (no edit) iff it is within the absolute band OR (when a pct
 * band is configured) within the percent band. Disjunctive = a large-abs-but-small-relative error on
 * a big dimension is forgiven by pctTol; a small-abs error is forgiven by absTol. Matches the
 * abs-floor + relative-band shape delta uses in cad-gen-dim-correction.dimDivergence.
 */
function withinTolerance(absDelta, pctDelta, absTol, pctTol) {
  if (absDelta <= absTol) return true;
  if (pctTol > 0 && typeof pctDelta === "number" && Number.isFinite(pctDelta) && Math.abs(pctDelta) <= pctTol)
    return true;
  return false;
}

/**
 * Build a DIRECT correction plan from an id-free feature-correspondence result.
 * @param {{matched:Array, missing:Array, extra:Array}} correspondence - correspondFeatures() output
 * @param {{absTol?:number, pctTol?:number}} [opts]
 *   absTol: absolute in-tolerance band (default 1e-6 -> only float noise is skipped; fix every real delta).
 *   pctTol: percent in-tolerance band (default 0 = disabled; set e.g. 0.5 to forgive <=0.5% relative error).
 * @returns {{setEdits:Array, addFeatures:Array, removeFeatures:Array, rankedActions:Array, summary:object}}
 */
export function planCorrections(correspondence, opts = {}) {
  if (!correspondence || typeof correspondence !== "object") {
    throw new TypeError("planCorrections: correspondence result object required");
  }
  const matched = Array.isArray(correspondence.matched) ? correspondence.matched : [];
  const missing = Array.isArray(correspondence.missing) ? correspondence.missing : [];
  const extra = Array.isArray(correspondence.extra) ? correspondence.extra : [];
  const absTol = typeof opts.absTol === "number" && opts.absTol >= 0 ? opts.absTol : 1e-6;
  const pctTol = typeof opts.pctTol === "number" && opts.pctTol >= 0 ? opts.pctTol : 0;

  const setEdits = [];
  for (const m of matched) {
    const refId = m.reference?.id;
    const genId = m.generated?.id;
    const featureType = m.reference?.featureType ?? m.generated?.featureType ?? "feature";
    for (const d of Array.isArray(m.parameterDeltas) ? m.parameterDeltas : []) {
      // parameterDeltas semantics: before = reference/intended (= target `to`), after = generated/drawn (= `from`).
      const from = d.after;
      const to = d.before;
      const numeric = typeof d.numericDelta === "number" && Number.isFinite(d.numericDelta);
      if (numeric) {
        const absDelta = Math.abs(d.numericDelta);
        const pctDelta = typeof d.percentDelta === "number" ? d.percentDelta : undefined;
        if (withinTolerance(absDelta, pctDelta, absTol, pctTol)) continue; // in-tol -> already correct
        const pctClause =
          typeof pctDelta === "number" && Number.isFinite(pctDelta)
            ? ` (drawn ${pctDelta > 0 ? "+" : ""}${fmtNum(pctDelta)}%)`
            : "";
        setEdits.push({
          kind: "set",
          featureType,
          referenceId: refId,
          generatedId: genId,
          parameter: d.key,
          from,
          to,
          absDelta,
          pctDelta,
          numeric: true,
          directive: `set ${d.key} on ${featureType}[${refId}]: ${fmtNum(from)} -> ${fmtNum(to)}${pctClause}`,
        });
      } else {
        // categorical / one-sided param change -> always an edit toward the intended value (no tolerance).
        setEdits.push({
          kind: "set",
          featureType,
          referenceId: refId,
          generatedId: genId,
          parameter: d.key,
          from,
          to,
          numeric: false,
          directive: `set ${d.key} on ${featureType}[${refId}]: ${fmtVal(from)} -> ${fmtVal(to)}`,
        });
      }
    }
  }

  const addFeatures = missing.map((r) => ({
    kind: "add",
    featureType: r.featureType,
    referenceId: r.id,
    parameters: r.parameters ?? {},
    directive: `add missing ${r.featureType}[${r.id}]`,
  }));

  const removeFeatures = extra.map((g) => ({
    kind: "remove",
    featureType: g.featureType,
    generatedId: g.id,
    directive: `remove extraneous ${g.featureType}[${g.id}]`,
  }));

  // rankedActions: structural errors (missing/extra) are the biggest fidelity misses -> tier 0;
  // a categorical param mistake -> tier 1; a numeric dimension error -> tier 2, worst-|pct| first.
  const tierOf = (a) =>
    a.kind === "add" || a.kind === "remove" ? 0 : a.kind === "set" && a.numeric === false ? 1 : 2;
  const severityOf = (a) => {
    if (a.kind === "add" || a.kind === "remove") return Infinity;
    if (a.kind === "set" && a.numeric === false) return Infinity;
    const pct = typeof a.pctDelta === "number" && Number.isFinite(a.pctDelta) ? Math.abs(a.pctDelta) : null;
    return pct !== null ? pct : (typeof a.absDelta === "number" ? a.absDelta : 0);
  };
  const rankedActions = [...addFeatures, ...removeFeatures, ...setEdits].sort((a, b) => {
    const dt = tierOf(a) - tierOf(b);
    if (dt !== 0) return dt;
    return severityOf(b) - severityOf(a);
  });

  const totalActions = rankedActions.length;
  return {
    setEdits,
    addFeatures,
    removeFeatures,
    rankedActions,
    summary: {
      setCount: setEdits.length,
      addCount: addFeatures.length,
      removeCount: removeFeatures.length,
      totalActions,
      perfect: totalActions === 0, // nothing to fix -> the generate pass was one-shot accurate
      worstDirective: rankedActions[0]?.directive ?? null,
    },
  };
}

/**
 * Convenience: run id-free correspondence on two independent feature snapshot sets, then plan the
 * direct correction in one call. `opts` flows to BOTH stages (maxCost/perfectEps for correspondence;
 * absTol/pctTol for the plan) -- their keys are disjoint so there is no collision.
 * @param {Array} generated - drawn model FeatureSnapshot[]
 * @param {Array} reference - original/intended FeatureSnapshot[]
 * @param {object} [opts]
 */
export function planCorrectionsFrom(generated, reference, opts = {}) {
  return planCorrections(correspondFeatures(generated, reference, opts), opts);
}
