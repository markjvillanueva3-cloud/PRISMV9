/**
 * cad-feature-correspondence.mjs -- id-free feature correspondence for CAD generated-vs-original diff.
 * U-INDIA-CAD-FEATURE-CORRESPOND (slot:india, 2026-07-02, KIENZLE one-shot CAD lever #1).
 *
 * WHY: CADVisualDiffEngine already localizes per-feature/per-parameter changes -- but it matches
 * features BY STABLE ID, so it only works for same-tree REVISION diffs. A GENERATED model and its
 * ORIGINAL blueprint share NO ids, so that path falls back to CADGeometryComparisonEngine.compare =
 * AGGREGATE only (bbox/volume/topology) and cannot say WHICH feature is wrong. This module bridges
 * that gap: it aligns two INDEPENDENT FeatureSnapshot sets by (featureType + parameter similarity),
 * enabling per-feature error attribution for the gen-vs-original case -- the operator's "quickly
 * determine WHERE the issue is" so the 2nd pass repairs only the wrong feature (targeted, not full regen).
 *
 * FeatureSnapshot shape (matches mcp-server/src/schemas/cadVisualDiffSchema.ts):
 *   { id: string, featureType: string, parameters: Record<string, number|string|boolean> }
 * Position/size live INSIDE `parameters` (e.g. parameters.x, parameters.diameter, parameters.depth).
 *
 * MATCHING: TYPE-GATED greedy minimum-cost assignment (only same-featureType pairs are candidates;
 * the globally-lowest-cost pair is assigned first, each feature used at most once). Greedy is
 * O(n^2 log n) + deterministic; for the small feature counts of a machined part (~<50) it is an
 * adequate approximation of the optimal (Hungarian) assignment. Documented as greedy, NOT claimed
 * optimal (R12); Hungarian is the drop-in optimal upgrade if cross-swap cases ever matter.
 *
 * PURE: no I/O, no engine imports -> node:test-friendly. Composes with CADVisualDiffEngine's
 * ParameterDelta semantics (before=reference/intended, after=generated/drawn; numericDelta = drawn-intended).
 *
 * INTEGRATION SEAM (for delta, who owns the CAD closed-loop pipeline): feed this the FeatureSnapshot[]
 * extracted (FeatureRecognitionEngine) from the generated STEP + the reference STEP; route .rankedErrors
 * + .missing + .extra into CADRegenCorrectionEngine for a targeted 2nd pass. Left unwired here to avoid
 * colliding with delta's active CAD-CLOSED-LOOP-TRAIN hot path (R15-aware hand-off).
 */

/** Relative scale for a normalized delta (avoids div-by-zero; matches CADVisualDiffEngine). */
function scaleOf(a, b) {
  return Math.max(1, Math.abs(a), Math.abs(b));
}

/**
 * Per-parameter deltas between two parameter maps. Mirrors CADVisualDiffEngine.diffParameters:
 * { key, before, after, numericDelta?, percentDelta? }. `before` is the reference/intended value,
 * `after` is the generated/drawn value, so numericDelta > 0 = oversized, < 0 = undersized.
 * @param {Record<string, unknown>} before
 * @param {Record<string, unknown>} after
 * @returns {Array<{key:string, before:unknown, after:unknown, numericDelta?:number, percentDelta?:number}>}
 */
export function parameterDeltas(before, after) {
  const b0 = before ?? {};
  const a0 = after ?? {};
  const keys = new Set([...Object.keys(b0), ...Object.keys(a0)]);
  const out = [];
  for (const k of keys) {
    const b = b0[k];
    const a = a0[k];
    if (b === a) continue;
    const d = { key: k, before: b === undefined ? null : b, after: a === undefined ? null : a };
    if (typeof b === "number" && typeof a === "number") {
      d.numericDelta = a - b;
      if (Math.abs(b) > 1e-9) d.percentDelta = ((a - b) / b) * 100;
    }
    out.push(d);
  }
  return out.sort((x, y) => x.key.localeCompare(y.key));
}

/**
 * Normalized match COST between a generated feature g and a reference feature r. Infinity when
 * featureType differs (a hole is never a pocket). Otherwise the mean normalized absolute difference
 * over parameters, with a fixed penalty for non-numeric mismatches / one-sided keys. Lower = better.
 * @param {{featureType:string, parameters?:Record<string,unknown>}} g
 * @param {{featureType:string, parameters?:Record<string,unknown>}} r
 * @param {{missingKeyPenalty?:number}} [opts]
 * @returns {number}
 */
export function featureCost(g, r, opts = {}) {
  if (g.featureType !== r.featureType) return Infinity;
  const missingKeyPenalty = opts.missingKeyPenalty ?? 0.5;
  const gp = g.parameters ?? {};
  const rp = r.parameters ?? {};
  const keys = new Set([...Object.keys(gp), ...Object.keys(rp)]);
  let sum = 0;
  let n = 0;
  for (const k of keys) {
    const gv = gp[k];
    const rv = rp[k];
    if (typeof gv === "number" && typeof rv === "number") {
      sum += Math.abs(gv - rv) / scaleOf(gv, rv);
      n += 1;
    } else if (gv !== rv) {
      sum += missingKeyPenalty;
      n += 1;
    }
  }
  return n === 0 ? 0 : sum / n;
}

/**
 * Type-gated greedy minimum-cost correspondence between two INDEPENDENT feature sets.
 * @param {Array<{id:string, featureType:string, parameters?:Record<string,unknown>}>} generated - drawn model
 * @param {Array<{id:string, featureType:string, parameters?:Record<string,unknown>}>} reference - original/intended
 * @param {{maxCost?:number, missingKeyPenalty?:number, perfectEps?:number}} [opts]
 * @returns {{matched:Array, missing:Array, extra:Array, rankedErrors:Array, summary:object}}
 */
export function correspondFeatures(generated, reference, opts = {}) {
  if (!Array.isArray(generated) || !Array.isArray(reference)) {
    throw new TypeError("correspondFeatures: generated and reference must both be arrays");
  }
  const maxCost = opts.maxCost ?? Infinity;
  const perfectEps = opts.perfectEps ?? 1e-6;

  // All valid candidate pairs (same type, cost within maxCost).
  const cands = [];
  for (let gi = 0; gi < generated.length; gi++) {
    for (let ri = 0; ri < reference.length; ri++) {
      const cost = featureCost(generated[gi], reference[ri], opts);
      if (Number.isFinite(cost) && cost <= maxCost) cands.push({ gi, ri, cost });
    }
  }
  // Greedy: lowest cost first; deterministic tie-break by (gi, ri).
  cands.sort((a, b) => a.cost - b.cost || a.gi - b.gi || a.ri - b.ri);

  const usedG = new Set();
  const usedR = new Set();
  const matched = [];
  for (const c of cands) {
    if (usedG.has(c.gi) || usedR.has(c.ri)) continue;
    usedG.add(c.gi);
    usedR.add(c.ri);
    matched.push({
      generated: generated[c.gi],
      reference: reference[c.ri],
      cost: c.cost,
      parameterDeltas: parameterDeltas(reference[c.ri].parameters ?? {}, generated[c.gi].parameters ?? {}),
    });
  }

  const missing = reference.filter((_, ri) => !usedR.has(ri)); // intended but NOT drawn -> generator missed it
  const extra = generated.filter((_, gi) => !usedG.has(gi)); // drawn but NOT intended -> hallucinated
  const rankedErrors = [...matched].sort((a, b) => b.cost - a.cost); // most-wrong matched feature first
  const worst = rankedErrors[0] ?? null;

  return {
    matched,
    missing,
    extra,
    rankedErrors,
    summary: {
      matchedCount: matched.length,
      missingCount: missing.length,
      extraCount: extra.length,
      worstFeatureId: worst ? worst.generated.id : null,
      worstCost: worst ? worst.cost : 0,
      // one-shot perfect iff nothing missing/extra AND every matched pair is within perfectEps
      perfect: missing.length === 0 && extra.length === 0 && matched.every((m) => m.cost < perfectEps),
    },
  };
}
