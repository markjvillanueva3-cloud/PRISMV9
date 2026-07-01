// scripts/lib/nn-graph-confusion-analysis.mjs
// GNN failure-mode analyzer (U-GNN-CONFUSION-ANALYSIS, slot:india 2026-06-30).
//
// THE QUESTION IT ANSWERS: the tier-5 GNN is BELOW-GATE (live NN-EVAL.json:
// AUROC 0.7525 < 0.78, macroF1 0.2834 < 0.55, Brier 0.22 > 0.15). AUROC is close;
// macroF1 is the binding failure. WHY? This decomposes the macroF1 gap from the
// REAL eval `samples` (truth/predicted per held node) into its drivers so the next
// retrain TARGETS the cause instead of guessing:
//   (1) TAIL-CLASS STARVATION -- classes with 1-2 held examples score F1=0 on a
//       single miss and drag the macro average. Quantified by recomputing macroF1
//       over classes with >= minExamples (the sensitivity curve).
//   (2) SYSTEMATIC CONFUSION -- which true class loses to which predicted class
//       (the dominant off-diagonal pairs). Names the ambiguous label boundaries.
//   (3) DOMINANT-CLASS ABSORPTION -- labels the model OVER-predicts (predicted-count
//       >> true-count): it defaults to popular dispatchers (prism_cam/prism_calc).
//
// Pure, deterministic, NO GPU, NO graph load -- reads only the eval JSON's samples.
// This is analysis of REAL eval output, never relabeling/fabrication (R9/R12).

/**
 * Per-class confusion stats from eval samples. Each sample: {truth, predicted}.
 * Returns a Map<class, {n, tp, fp, fn, precision, recall, f1, confusedWith}>.
 * `n` = held examples of the class (truth count). `confusedWith` = {predicted:count}
 * for this class's MISSES (truth=class, predicted!=class), most-frequent first.
 */
export function perClassStats(samples) {
  const rows = Array.isArray(samples) ? samples.filter((s) => s && typeof s === "object") : [];
  const classes = new Set();
  for (const s of rows) { if (s.truth) classes.add(s.truth); if (s.predicted) classes.add(s.predicted); }
  const out = new Map();
  for (const c of classes) {
    let tp = 0, fp = 0, fn = 0;
    const confused = {};
    for (const s of rows) {
      const isTruth = s.truth === c;
      const isPred = s.predicted === c;
      if (isTruth && isPred) tp++;
      else if (!isTruth && isPred) fp++;
      else if (isTruth && !isPred) { fn++; const p = String(s.predicted ?? "?"); confused[p] = (confused[p] || 0) + 1; }
    }
    const n = tp + fn; // held examples whose TRUTH is c
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    const confusedWith = Object.entries(confused).sort((a, b) => b[1] - a[1]).map(([predicted, count]) => ({ predicted, count }));
    out.set(c, { class: c, n, tp, fp, fn, precision, recall, f1, confusedWith });
  }
  return out;
}

/** Macro-F1 over the truth classes present (mean F1 of classes with n>=1 held example). */
export function macroF1(stats) {
  const truthClasses = [...stats.values()].filter((s) => s.n > 0);
  if (truthClasses.length === 0) return 0;
  return truthClasses.reduce((acc, s) => acc + s.f1, 0) / truthClasses.length;
}

/**
 * Sensitivity: macro-F1 if classes with FEWER than `minExamples` held examples are
 * EXCLUDED from the average. Isolates how much of the macroF1 depression is tail
 * starvation (structural -- needs more reference examples) vs genuine confusion.
 * Returns {minExamples, includedClasses, excludedClasses, macroF1}.
 */
export function macroF1Sensitivity(stats, minExamples) {
  const min = Number.isInteger(minExamples) && minExamples > 0 ? minExamples : 1;
  const kept = [...stats.values()].filter((s) => s.n >= min);
  const all = [...stats.values()].filter((s) => s.n > 0);
  const mf1 = kept.length ? kept.reduce((a, s) => a + s.f1, 0) / kept.length : 0;
  return { minExamples: min, includedClasses: kept.length, excludedClasses: all.length - kept.length, macroF1: mf1 };
}

/** Histogram of how many TRUTH classes have exactly k held examples (k=1,2,3,...). */
export function tailHistogram(stats) {
  const hist = {};
  for (const s of stats.values()) { if (s.n > 0) hist[s.n] = (hist[s.n] || 0) + 1; }
  return hist;
}

/** Top systematic confusion pairs (truth -> predicted) across all samples, by count. */
export function topConfusionPairs(samples, k = 15) {
  const rows = Array.isArray(samples) ? samples : [];
  const pairs = {};
  for (const s of rows) {
    if (!s || s.truth === s.predicted) continue;
    const key = `${s.truth} -> ${s.predicted}`;
    pairs[key] = (pairs[key] || 0) + 1;
  }
  return Object.entries(pairs).sort((a, b) => b[1] - a[1]).slice(0, k).map(([pair, count]) => ({ pair, count }));
}

/**
 * Dominant-class absorption: labels the model OVER-predicts. For each predicted
 * class, predictedCount vs trueCount; ratio>1 means the model emits it more often
 * than it should (defaulting to a popular dispatcher). Sorted by absorption surplus.
 */
export function absorptionStats(samples, k = 10) {
  const rows = Array.isArray(samples) ? samples : [];
  const trueC = {}, predC = {};
  for (const s of rows) {
    if (!s) continue;
    if (s.truth) trueC[s.truth] = (trueC[s.truth] || 0) + 1;
    if (s.predicted) predC[s.predicted] = (predC[s.predicted] || 0) + 1;
  }
  const labels = new Set([...Object.keys(trueC), ...Object.keys(predC)]);
  return [...labels]
    .map((c) => ({ class: c, predicted: predC[c] || 0, truth: trueC[c] || 0, surplus: (predC[c] || 0) - (trueC[c] || 0) }))
    .filter((r) => r.surplus > 0)
    .sort((a, b) => b.surplus - a.surplus)
    .slice(0, k);
}

/**
 * Phantom-prediction labels: classes the model PREDICTS at least once but that are
 * NEVER a true holdout label (true-count 0). These are wasted prediction mass AND
 * label-space PRUNE CANDIDATES -- a class the model can emit but that has no held
 * ground truth cannot help macroF1 and only absorbs misclassifications. Sorted by
 * predicted-count (worst offenders first). Distinct from absorptionStats (which
 * includes over-predicted classes that DO have some true examples).
 */
export function phantomPredictions(samples) {
  const rows = Array.isArray(samples) ? samples : [];
  const trueC = {}, predC = {};
  for (const s of rows) {
    if (!s) continue;
    if (s.truth) trueC[s.truth] = (trueC[s.truth] || 0) + 1;
    if (s.predicted) predC[s.predicted] = (predC[s.predicted] || 0) + 1;
  }
  return Object.keys(predC)
    .filter((c) => (trueC[c] || 0) === 0)
    .map((c) => ({ class: c, predicted: predC[c], truth: 0 }))
    .sort((a, b) => b.predicted - a.predicted);
}

/**
 * Label-health summary for the retrain's label-space hygiene step: how much of the
 * model's prediction mass lands on phantom (true-count-0) classes, and the prune list.
 */
export function labelHealthReport(samples) {
  const rows = Array.isArray(samples) ? samples : [];
  const phantoms = phantomPredictions(samples);
  const phantomMass = phantoms.reduce((a, p) => a + p.predicted, 0);
  const totalPreds = rows.filter((s) => s && s.predicted).length;
  return {
    phantomClasses: phantoms.length,
    phantomPredictionMass: phantomMass,
    phantomMassPct: totalPreds > 0 ? +(100 * phantomMass / totalPreds).toFixed(1) : 0,
    pruneCandidates: phantoms.map((p) => p.class),
  };
}

/**
 * STARVED truth classes -- the actionable form of FINDING 1 (tail-class starvation
 * is the dominant macroF1 driver). A truth class with `n` held examples below
 * `threshold` (default 5 -- the point the sensitivity curve nears the 0.55 gate) is
 * the #1 retrain lever: the next GPU session must GROW its reference/held examples.
 * Returns one row per starved truth class: {class, n, deficit} where
 * deficit = threshold - n (how many MORE examples to reach the threshold), sorted
 * worst-first (fewest examples first, then class name for determinism).
 * Only TRUTH classes (n>=1) qualify -- a true-count-0 label is a PHANTOM, a different
 * defect handled by phantomPredictions(), never a "starved" class to grow.
 * Pure derivation from real eval stats -- never relabeling/fabrication (R9/R12).
 */
export function starvedClassTargets(stats, threshold = 5) {
  const min = Number.isInteger(threshold) && threshold > 0 ? threshold : 5;
  const rows = stats instanceof Map ? [...stats.values()] : [];
  return rows
    .filter((s) => s && s.n >= 1 && s.n < min)
    .map((s) => ({ class: s.class, n: s.n, deficit: min - s.n }))
    .sort((a, b) => (a.n - b.n) || String(a.class).localeCompare(String(b.class)));
}

/**
 * Consolidated NO-GPU retrain target manifest for the india GPU session: the three
 * deterministic levers from the holdout -- FINDINGS 1/2/4 -- as ONE machine-readable
 * artifact the retrain consumes instead of re-deriving from prose. Reuses the existing
 * exports; adds the per-class growth deficits and a summary. `opts.starveThreshold`
 * overrides the starvation threshold (default 5). Pure, deterministic, never throws.
 *   - starvedClasses: grow reference examples for these (the #1 macroF1 lever)
 *   - absorptionSinks: over-predicted labels to ANCHOR or remove (FINDING 2)
 *   - phantomPrune:    predicted-but-true-count-0 labels to drop from the output space (FINDING 4)
 */
export function retrainTargetManifest(evalDoc, opts = {}) {
  const samples = (evalDoc && Array.isArray(evalDoc.samples)) ? evalDoc.samples : [];
  const threshold = Number.isInteger(opts.starveThreshold) && opts.starveThreshold > 0 ? opts.starveThreshold : 5;
  const stats = perClassStats(samples);
  const starvedClasses = starvedClassTargets(stats, threshold);
  // Uncapped: the manifest is the COMPLETE consolidated lever set for the retrain
  // (starvedClasses/phantomPrune are already uncapped) -- the top-10 cap is only for
  // the human-facing formatReport, not this machine-readable artifact.
  const absorptionSinks = absorptionStats(samples, Number.MAX_SAFE_INTEGER);
  const phantomPrune = phantomPredictions(samples).map((p) => p.class);
  return {
    holdoutN: samples.length,
    starveThreshold: threshold,
    starvedClasses,
    absorptionSinks,
    phantomPrune,
    summary: {
      starvedCount: starvedClasses.length,
      totalExamplesNeeded: starvedClasses.reduce((a, s) => a + s.deficit, 0),
      sinkCount: absorptionSinks.length,
      phantomCount: phantomPrune.length,
    },
  };
}

/** Full analysis bundle from an eval doc with a `samples` array. */
export function analyzeEval(evalDoc) {
  const samples = (evalDoc && Array.isArray(evalDoc.samples)) ? evalDoc.samples : [];
  const stats = perClassStats(samples);
  const sens = [1, 2, 3, 5].map((m) => macroF1Sensitivity(stats, m));
  return {
    holdoutN: samples.length,
    truthClasses: [...stats.values()].filter((s) => s.n > 0).length,
    macroF1: macroF1(stats),
    accuracy: samples.length ? samples.filter((s) => s && s.correct === true).length / samples.length : 0,
    tailHistogram: tailHistogram(stats),
    macroF1Sensitivity: sens,
    starvedTargets: starvedClassTargets(stats, 5),
    topConfusionPairs: topConfusionPairs(samples),
    absorption: absorptionStats(samples),
    labelHealth: labelHealthReport(samples),
    worstClasses: [...stats.values()].filter((s) => s.n >= 2 && s.f1 < 0.34)
      .sort((a, b) => a.f1 - b.f1)
      .slice(0, 12)
      .map((s) => ({ class: s.class, n: s.n, f1: +s.f1.toFixed(3), confusedWith: s.confusedWith.slice(0, 3) })),
  };
}

/** Pure markdown render of an analyzeEval() bundle -- the operator-facing report. */
export function formatReport(a) {
  const L = [];
  L.push(`# GNN failure-mode analysis (holdoutN=${a.holdoutN}, ${a.truthClasses} truth classes)`);
  L.push(`macroF1=${a.macroF1.toFixed(4)} | accuracy=${a.accuracy.toFixed(3)}`);
  L.push(``);
  L.push(`## macroF1 sensitivity to tail-class exclusion (starvation drag)`);
  for (const s of a.macroF1Sensitivity) {
    L.push(`- >= ${s.minExamples} example(s): macroF1 ${s.macroF1.toFixed(4)} (${s.includedClasses} kept, ${s.excludedClasses} tail excluded)`);
  }
  const th = a.tailHistogram;
  L.push(`- tail: ${th["1"] || 0} class(es) with 1 example, ${th["2"] || 0} with 2 (of ${a.truthClasses})`);
  L.push(``);
  if (Array.isArray(a.starvedTargets) && a.starvedTargets.length) {
    const need = a.starvedTargets.reduce((acc, s) => acc + s.deficit, 0);
    L.push(`## starved truth classes -- grow reference examples (the #1 macroF1 lever, FINDING 1)`);
    L.push(`- ${a.starvedTargets.length} class(es) below 5 held examples; +${need} reference example(s) needed to lift all to threshold`);
    for (const s of a.starvedTargets.slice(0, 20)) L.push(`- ${s.class}: ${s.n} held -> need +${s.deficit}`);
    L.push(``);
  }
  L.push(`## top confusion pairs (truth -> predicted)`);
  for (const p of a.topConfusionPairs.slice(0, 10)) L.push(`- ${p.pair} x${p.count}`);
  L.push(``);
  L.push(`## dominant-class absorption (over-predicted "sink" labels)`);
  for (const r of a.absorption) L.push(`- ${r.class}: predicted ${r.predicted} vs true ${r.truth} (surplus +${r.surplus})`);
  if (a.labelHealth) {
    L.push(``);
    L.push(`## label hygiene -- PHANTOM classes (predicted but true-count 0; prune candidates)`);
    L.push(`- ${a.labelHealth.phantomClasses} phantom class(es) absorb ${a.labelHealth.phantomPredictionMass} predictions (${a.labelHealth.phantomMassPct}% of all)`);
    if (a.labelHealth.pruneCandidates.length) L.push(`- prune candidates: ${a.labelHealth.pruneCandidates.join(", ")}`);
  }
  return L.join("\n");
}

const _isMain = (() => {
  try { return process.argv[1] && process.argv[1].replace(/\\/g, "/").endsWith("nn-graph-confusion-analysis.mjs"); }
  catch { return false; }
})();
if (_isMain) {
  (async () => {
    const fs = await import("node:fs");
    const path = await import("node:path");
    const { fileURLToPath } = await import("node:url");
    const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
    const evalPath = path.join(root, "state", "shared", "nn-graph", "NN-EVAL.json");
    let ev;
    try { ev = JSON.parse(fs.readFileSync(evalPath, "utf8")); }
    catch (e) { process.stderr.write(`[nn-graph-confusion-analysis] cannot read ${evalPath}: ${e?.message || e}\n`); process.exit(1); }
    // --manifest emits the machine-readable retrain target manifest (for the GPU session); default is the markdown report.
    if (process.argv.slice(2).includes("--manifest")) process.stdout.write(JSON.stringify(retrainTargetManifest(ev), null, 2) + "\n");
    else process.stdout.write(formatReport(analyzeEval(ev)) + "\n");
  })();
}
