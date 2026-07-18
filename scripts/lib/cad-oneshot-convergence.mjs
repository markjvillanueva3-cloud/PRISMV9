/**
 * cad-oneshot-convergence.mjs -- MEASURE whether the CAD one-shot chain is actually converging the
 * generator toward drawing every part right on the FIRST pass, and honestly BOUND the best first-pass
 * accuracy the forward pre-correction lever alone can reach. Stage 4 (the metric) of the chain:
 *   locate  -> cad-feature-correspondence.mjs   (WHERE each feature is wrong, id-free)
 *   fix     -> cad-correction-plan.mjs           (2nd-pass edit list)
 *   prevent -> cad-systematic-bias.mjs           (forward pre-correction from accumulated bias)
 *   MEASURE -> THIS                              (is first-pass error actually shrinking? how low can it go?)
 *
 * WHY (R12 / no-fabrication): the prevent stage ASSUMES pre-correction reduces first-pass error; this
 * stage PROVES it -- or refuses to. The correction plan is SPARSE: cad-correction-plan.withinTolerance()
 * emits an edit ONLY for an OUT-OF-tolerance feature, so per part the defect count (numeric setEdits +
 * categorical setEdits + addFeatures + removeFeatures) IS the first-pass error count, and a part with ZERO
 * total defects is one-shot clean (== plan.summary.perfect). Feed a STREAM of planCorrections() results in
 * generation order and this reports:
 *   (1) first-pass accuracy NOW -- one-shot rate + mean defects/part + mean |pctDelta|,
 *   (2) the TREND               -- least-squares slope of defects over the stream (improving?), with an
 *       r2 reliability gate that REFUSES to project a parts-to-one-shot horizon on a noisy fit,
 *   (3) the HONEST BOUND        -- decompose the pctDelta energy into a SYSTEMATIC (pre-correctable) and
 *       a RANDOM (irreducible-by-prescaling) part; the random residual is the FLOOR on first-pass numeric RMS
 *       error the pre-correction lever can reach. Going lower needs the neural/LoRA feed. The bound is an
 *       UPPER BOUND ON ACCURACY that a RE-GENERATION must realize -- never a post-hoc gain (mirrors the
 *       GNN growthCeiling/prunePhantomCeiling discipline).
 *
 * PURE: no fs/clock/engine imports -> node:test-friendly, deterministic. Consumes the SAME plan/edit
 * shape cad-systematic-bias.mjs does (planCorrections() results with .setEdits[]), and reuses
 * detectSystematicBias() so the bound is tied to EXACTLY the biases the prevent stage would apply.
 *
 * DISTINCT FROM cad-fusion-geom-diff.mjs (U-CADTP-GEOM-DIFF): that is a SPATIAL comparator of ONE
 * part-pair (reference model snapshot vs candidate snapshot -> per-feature geometric diff + a similarity
 * "convergence" score for that single pair). THIS is a TEMPORAL/statistical metric over a STREAM of MANY
 * parts' correction PLANS -- the training-analytics question "is the generator getting closer to one-shot
 * across the corpus, and how low can first-pass error honestly go", not "how different are these two
 * models". Complementary: geom-diff feeds the plan; this aggregates plans over time.
 */

import { detectSystematicBias } from "./cad-systematic-bias.mjs";

/** Population mean of a numeric array (0 on empty). */
function mean(xs) {
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0;
}

/** Root-mean-square of a numeric array (0 on empty). */
function rms(xs) {
  return xs.length ? Math.sqrt(mean(xs.map((x) => x * x))) : 0;
}

/**
 * Ordinary-least-squares fit y = slope*x + intercept over paired arrays, plus r2 (coefficient of
 * determination). Degenerate cases are honest, not NaN: <2 points or zero x-variance -> slope 0
 * (a flat line at mean y); zero y-variance -> r2 0 (a flat target has no trend to explain).
 */
function leastSquares(xs, ys) {
  const n = xs.length;
  if (n < 2) return { slope: 0, intercept: ys[0] ?? 0, r2: 0, n };
  let sx = 0, sy = 0, sxx = 0, sxy = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sx += xs[i]; sy += ys[i]; sxx += xs[i] * xs[i]; sxy += xs[i] * ys[i]; syy += ys[i] * ys[i];
  }
  const denX = n * sxx - sx * sx;
  const meanY = sy / n;
  if (denX === 0) return { slope: 0, intercept: meanY, r2: 0, n };
  const slope = (n * sxy - sx * sy) / denX;
  const intercept = (sy - slope * sx) / n;
  const denY = n * syy - sy * sy;
  const r2 = denY === 0 ? 0 : (n * sxy - sx * sy) ** 2 / (denX * denY);
  return { slope, intercept, r2, n };
}

/**
 * Per-part first-pass metrics from a STREAM of planCorrections() results (generation order).
 * planCorrections() returns THREE separate arrays (cad-correction-plan.mjs): `setEdits[]` (param changes,
 * each numeric:true with a pctDelta OR numeric:false categorical), `addFeatures[]` (missing features), and
 * `removeFeatures[]` (extraneous features). A part is one-shot clean iff ALL THREE are empty (equivalently
 * plan.summary.perfect) -- so structural + categorical defects MUST be counted, not just numeric ones, or a
 * part that is merely missing a feature would be mis-scored as one-shot.
 * @param {Array} plans
 * @returns {Array<{index:number, numericDefects:number, categoricalDefects:number, structuralDefects:number,
 *   totalDefects:number, rmsPctDelta:number, maxPctDelta:number}>}
 */
export function perPartMetrics(plans) {
  if (!Array.isArray(plans)) throw new TypeError("cad-oneshot-convergence: plans must be an array of planCorrections() results");
  return plans.map((plan, index) => {
    const setEdits = plan && Array.isArray(plan.setEdits) ? plan.setEdits : [];
    const numericEdits = setEdits.filter((e) => e && e.numeric === true);
    const categoricalDefects = setEdits.length - numericEdits.length; // numeric:false param changes
    const structuralDefects =
      (plan && Array.isArray(plan.addFeatures) ? plan.addFeatures.length : 0) +
      (plan && Array.isArray(plan.removeFeatures) ? plan.removeFeatures.length : 0);
    const mags = numericEdits
      .filter((e) => typeof e.pctDelta === "number" && Number.isFinite(e.pctDelta))
      .map((e) => Math.abs(e.pctDelta));
    return {
      index,
      numericDefects: numericEdits.length,
      categoricalDefects,
      structuralDefects,
      totalDefects: numericEdits.length + categoricalDefects + structuralDefects,
      rmsPctDelta: rms(mags),
      maxPctDelta: mags.length ? Math.max(...mags) : 0,
    };
  });
}

/**
 * Measure first-pass convergence + honestly bound the pre-correctable one-shot accuracy.
 * @param {Array} plans - stream of planCorrections() results in generation order
 * @param {{minSamples?:number, minBiasPct?:number, consistency?:number, minR2?:number}} [opts]
 *   minSamples/minBiasPct/consistency: forwarded to detectSystematicBias() so the bound reflects EXACTLY
 *     the biases the prevent stage would apply (defaults 8 / 1.0% / 0.75).
 *   minR2: reliability floor below which the parts-to-one-shot horizon is REFUSED (default 0.30).
 * @returns {object}
 */
export function oneShotConvergence(plans, opts = {}) {
  const minR2 = Number.isFinite(opts.minR2) ? opts.minR2 : 0.30;
  const per = perPartMetrics(plans);
  const nParts = per.length;

  // (1) first-pass accuracy NOW
  const oneShotCleanParts = per.filter((p) => p.totalDefects === 0).length;
  const firstPass = {
    nParts,
    oneShotCleanParts,
    oneShotRate: nParts ? oneShotCleanParts / nParts : 0,
    meanNumericDefects: mean(per.map((p) => p.numericDefects)),
    meanTotalDefects: mean(per.map((p) => p.totalDefects)),
    meanRmsPctDelta: mean(per.map((p) => p.rmsPctDelta)),
    meanMaxPctDelta: mean(per.map((p) => p.maxPctDelta)),
  };

  // (2) trend of total defects over the stream
  const xs = per.map((p) => p.index);
  const fit = leastSquares(xs, per.map((p) => p.totalDefects));
  const eps = 1e-9;
  const direction = fit.slope < -eps ? "improving" : fit.slope > eps ? "worsening" : "flat";
  let projectedPartsToOneShot = null;
  let projectionNote;
  if (nParts < 2) {
    projectionNote = "need >=2 parts to fit a trend";
  } else if (direction !== "improving") {
    projectionNote = `not improving (slope ${round(fit.slope, 4)} defects/part) -- no horizon`;
  } else if (fit.r2 < minR2) {
    projectionNote = `trend too noisy to project (r2 ${round(fit.r2, 3)} < ${minR2}) -- REFUSED (no fabricated horizon)`;
  } else if (fit.intercept <= 0) {
    projectedPartsToOneShot = 0;
    projectionNote = "already at/under zero-defect intercept";
  } else {
    const xZero = -fit.intercept / fit.slope; // predicted part index where defects reach 0
    projectedPartsToOneShot = Math.max(0, Math.ceil(xZero) - (nParts - 1));
    projectionNote = `IF the linear trend holds, ~${projectedPartsToOneShot} more parts to a zero-defect first pass (extrapolation, not a guarantee)`;
  }
  const trend = {
    slope: fit.slope, intercept: fit.intercept, r2: fit.r2, direction,
    projectedPartsToOneShot, note: projectionNote,
  };

  // (3) HONEST BOUND: split pctDelta energy into systematic (pre-correctable) vs random (irreducible).
  // Per group g: E[x^2] = mean_g^2 + stdev_g^2. Pre-correcting a BIASED group drives mean_g -> 0, leaving
  // only its within-group variance stdev_g^2. Unbiased groups are untouched (their mean is noise/mixed-sign).
  const det = detectSystematicBias(plans, opts);
  let Ntot = 0, msTotal = 0, msAfter = 0;
  for (const g of det.groups) {
    const n = g.n, m2 = g.meanPctDelta ** 2, s2 = g.stdevPct ** 2;
    Ntot += n;
    msTotal += n * (m2 + s2);
    msAfter += g.biased ? n * s2 : n * (m2 + s2);
  }
  const currentRmsPct = Ntot ? Math.sqrt(msTotal / Ntot) : 0;
  const precorrectedFloorRmsPct = Ntot ? Math.sqrt(msAfter / Ntot) : 0;
  const removableRmsPct = Math.sqrt(Math.max(0, currentRmsPct ** 2 - precorrectedFloorRmsPct ** 2));
  const bound = {
    numericEditCount: Ntot,
    biasedGroupCount: det.biasedCount,
    currentRmsPct,                 // measured now (FLOOR of accuracy = current first-pass error)
    precorrectedFloorRmsPct,       // best first-pass numeric RMS the pre-correction lever alone reaches (CEILING of accuracy)
    removableRmsPct,               // the systematic energy pre-correction removes
    reductionPct: currentRmsPct - precorrectedFloorRmsPct,
    note:
      Ntot === 0
        ? "no numeric first-pass error to bound (all parts one-shot clean on numeric params)"
        : "UPPER BOUND on accuracy -- requires RE-GENERATION with pre-corrected targets to realize; the random residual (precorrectedFloorRmsPct) needs the neural/LoRA feed to reduce further. Never a post-hoc gain.",
  };

  const summary = {
    nParts,
    oneShotRate: firstPass.oneShotRate,
    direction,
    currentRmsPct,
    precorrectedFloorRmsPct,
    line:
      nParts === 0
        ? "no parts"
        : `one-shot ${Math.round(firstPass.oneShotRate * 100)}% (${oneShotCleanParts}/${nParts}), defects ${direction} (slope ${round(fit.slope, 3)}/part), first-pass numeric RMS ${round(currentRmsPct, 2)}% -> pre-correctable floor ${round(precorrectedFloorRmsPct, 2)}%`,
  };

  return { firstPass, trend, bound, perPart: per, summary };
}

/** Multi-line CLI report. */
export function formatConvergenceReport(result) {
  const { firstPass: f, trend: t, bound: b, summary: s } = result;
  const lines = [];
  lines.push("CAD one-shot convergence");
  lines.push(`  parts:        ${f.nParts}  |  one-shot ${Math.round(f.oneShotRate * 100)}% (${f.oneShotCleanParts}/${f.nParts})`);
  lines.push(`  defects/part: mean ${round(f.meanTotalDefects, 2)} (numeric ${round(f.meanNumericDefects, 2)})  |  first-pass numeric RMS ${round(f.meanRmsPctDelta, 2)}%`);
  lines.push(`  trend:        ${t.direction}  slope ${round(t.slope, 4)}/part  r2 ${round(t.r2, 3)}`);
  lines.push(`                ${t.note}`);
  lines.push(`  honest bound: current RMS ${round(b.currentRmsPct, 2)}%  ->  pre-correctable floor ${round(b.precorrectedFloorRmsPct, 2)}%  (removable ${round(b.removableRmsPct, 2)}%, ${b.biasedGroupCount} biased groups)`);
  lines.push(`                ${b.note}`);
  lines.push(`  ${s.line}`);
  return lines.join("\n");
}

/** Round to `d` decimals for stable output strings (deterministic). */
function round(x, d) {
  const factor = 10 ** d;
  return Math.round(x * factor) / factor;
}
