/**
 * cad-systematic-bias.mjs -- learn a per-(featureType, parameter) SYSTEMATIC generation bias from a
 * STREAM of correction plans, then pre-correct FUTURE first passes so they land on-target without a
 * 2nd pass. This is the operator's "build the algorithm so it continues to improve and eventually
 * gets to a point where it draws everything in one shot accurately." Stage 3 of the CAD one-shot chain:
 *   locate  -> cad-feature-correspondence.mjs   (WHERE is each feature wrong, id-free)
 *   fix     -> cad-correction-plan.mjs           (direct 2nd-pass edit list for the known-spec regime)
 *   PREVENT -> THIS                              (aggregate the fixes -> forward bias pre-correction)
 *
 * THE IDEA (pure statistics, compounding, immediate): if across many generated parts the AI draws
 * holes ~2% oversized with a consistent sign, that is a SYSTEMATIC bias -- not random noise. A
 * systematic bias is pre-correctable: feed the generator a target scaled by 1/(1+bias) so its own
 * bias lands the drawn feature exactly on the intended value. That shrinks first-pass error over
 * time, so more parts pass on the FIRST try. Distinct from -- and lighter than -- the LoRA training
 * feed (CADRegenFeedbackAdapterEngine): this needs only tens of samples and is deterministic, so it
 * corrects the generator while the neural feed is still accumulating data.
 *
 * HONEST GATING (R12): a group is declared biased ONLY with enough samples, a large-enough mean, AND
 * a consistent sign. Random error (mixed sign) and thin evidence are NOT pre-corrected -- pre-scaling
 * on noise would make first passes WORSE. PURE: no fs/clock/engine imports -> node:test-friendly.
 *
 * INPUT: an array whose elements are either planCorrections() results (objects with a .setEdits[])
 * or raw setEdit objects. Only NUMERIC set-edits carry a signed pctDelta = (drawn-intended)/intended*100.
 */

/** Population mean of a numeric array (0 on empty). */
function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Median of a numeric array (0 on empty; average of the two middles for even length). */
function median(xs) {
  if (!xs.length) return 0;
  const s = [...xs].sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

/** Population standard deviation (0 on empty / single sample). */
function stdev(xs) {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
}

/** Fraction of samples sharing the majority sign (1.0 = perfectly consistent direction). Zeros ignored. */
function sameSignFraction(xs) {
  const pos = xs.filter((x) => x > 0).length;
  const neg = xs.filter((x) => x < 0).length;
  const nonZero = pos + neg;
  return nonZero ? Math.max(pos, neg) / nonZero : 0;
}

/** Flatten the NUMERIC set-edits (those carrying a finite pctDelta) from a mixed plan/edit array. */
function collectNumericEdits(input) {
  if (!Array.isArray(input)) throw new TypeError("cad-systematic-bias: input must be an array of plans or set-edits");
  const edits = [];
  for (const item of input) {
    if (item && Array.isArray(item.setEdits)) edits.push(...item.setEdits);
    else if (item && typeof item === "object" && "parameter" in item) edits.push(item);
  }
  return edits.filter((e) => e && e.numeric === true && typeof e.pctDelta === "number" && Number.isFinite(e.pctDelta));
}

/**
 * Detect systematic per-(featureType, parameter) generation bias from a stream of correction plans.
 * @param {Array} plansOrEdits - array of planCorrections() results and/or raw set-edit objects
 * @param {{minSamples?:number, minBiasPct?:number, consistency?:number}} [opts]
 *   minSamples: min edits in a group before it can be declared biased (default 8).
 *   minBiasPct: min |mean pctDelta| to count as a bias, not noise (default 1.0 %).
 *   consistency: min same-sign fraction for a directional bias (default 0.75).
 * @returns {{groups:Array, biasedCount:number, summary:object}}
 */
export function detectSystematicBias(plansOrEdits, opts = {}) {
  const minSamples = Number.isFinite(opts.minSamples) ? opts.minSamples : 8;
  const minBiasPct = Number.isFinite(opts.minBiasPct) ? opts.minBiasPct : 1.0;
  const consistency = Number.isFinite(opts.consistency) ? opts.consistency : 0.75;

  const edits = collectNumericEdits(plansOrEdits);
  const byKey = new Map();
  for (const e of edits) {
    const key = `${e.featureType}::${e.parameter}`;
    if (!byKey.has(key)) byKey.set(key, { featureType: e.featureType, parameter: e.parameter, pcts: [] });
    byKey.get(key).pcts.push(e.pctDelta);
  }

  const groups = [];
  for (const g of byKey.values()) {
    const n = g.pcts.length;
    const meanPct = mean(g.pcts);
    const medPct = median(g.pcts);
    const sigma = stdev(g.pcts);
    const ssf = sameSignFraction(g.pcts);
    const biased = n >= minSamples && Math.abs(meanPct) >= minBiasPct && ssf >= consistency;
    // pre-scale target so a systematic +mean% overshoot lands the drawn feature on the intended value:
    // drawn = target' * (1 + mean/100); target' = target / (1 + mean/100) => scale = 1/(1+mean/100).
    const suggestedScale = biased ? 1 / (1 + meanPct / 100) : 1;
    groups.push({
      featureType: g.featureType,
      parameter: g.parameter,
      n,
      meanPctDelta: meanPct,
      medianPctDelta: medPct,
      stdevPct: sigma,
      sameSignFraction: ssf,
      biased,
      suggestedScale,
      directive: biased
        ? `${g.featureType}.${g.parameter}: drawn ${meanPct > 0 ? "+" : ""}${round(meanPct, 2)}% ${meanPct > 0 ? "oversized" : "undersized"} across n=${n} (${Math.round(ssf * 100)}% same-sign, σ=${round(sigma, 2)}%) -> pre-scale generation target x${round(suggestedScale, 4)}`
        : `${g.featureType}.${g.parameter}: no systematic bias (n=${n}, mean ${round(meanPct, 2)}%, ${Math.round(ssf * 100)}% same-sign)`,
    });
  }
  // strongest bias first (by |mean|), among biased groups; unbiased groups trail.
  groups.sort((a, b) => Number(b.biased) - Number(a.biased) || Math.abs(b.meanPctDelta) - Math.abs(a.meanPctDelta));

  const biasedCount = groups.filter((g) => g.biased).length;
  return {
    groups,
    biasedCount,
    summary: {
      totalGroups: groups.length,
      biasedCount,
      totalSamples: edits.length,
      topBias: groups[0]?.biased ? groups[0].directive : null,
    },
  };
}

/**
 * Build a compact lookup { "featureType::parameter": { suggestedScale, meanPctDelta, n } } from ONLY
 * the biased groups -- the forward pre-correction model applied to future generation.
 */
export function buildBiasModel(groupsOrResult) {
  const groups = Array.isArray(groupsOrResult) ? groupsOrResult : (groupsOrResult?.groups ?? []);
  const model = {};
  for (const g of groups) {
    if (!g || !g.biased) continue;
    model[`${g.featureType}::${g.parameter}`] = {
      suggestedScale: g.suggestedScale,
      meanPctDelta: g.meanPctDelta,
      n: g.n,
    };
  }
  return model;
}

/**
 * Pre-correct a to-be-generated parameter value using a bias model, so the generator's own
 * systematic bias lands the drawn feature on target. Identity (returns value unchanged) when the
 * (featureType, parameter) has no learned bias -- never scales on absent evidence.
 * @param {string} featureType
 * @param {string} parameter
 * @param {number} value - the intended value the generator would otherwise aim for
 * @param {Record<string,{suggestedScale:number}>} biasModel - from buildBiasModel()
 * @returns {number} the pre-corrected target
 */
export function applyBiasPrecorrection(featureType, parameter, value, biasModel) {
  if (typeof value !== "number" || !Number.isFinite(value)) return value;
  const g = biasModel?.[`${featureType}::${parameter}`];
  if (!g || typeof g.suggestedScale !== "number" || !Number.isFinite(g.suggestedScale)) return value;
  return value * g.suggestedScale;
}

/** Round to `d` decimals for stable directive strings (scripts must be deterministic). */
function round(x, d) {
  const f = 10 ** d;
  return Math.round(x * f) / f;
}
