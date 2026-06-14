#!/usr/bin/env node
/**
 * nn-graph-eval.mjs — NN-GRAPH-MS0 / U-NNG-EVAL-HARNESS U7
 *
 * The assessment harness for the GNN tier-5 wiring classifier. It measures
 * whether the GraphSAGE classifier (U6 seed-ghost-gnn-classify) is good enough
 * to deploy, against the milestone's mandatory exit gates:
 *     AUROC >= 0.78   ·   macro-F1 >= 0.55   ·   Brier <= 0.15
 *
 * Method — leave-out holdout over the cascade's own high-confidence labels:
 *   1. The reference set is the ghost engines the keyword/sibling tiers already
 *      classified at high confidence: proposed_wiring is a valid dispatcher and
 *      confidence is at or above refMinConf.
 *   2. A seeded, deterministic fraction of them is HELD OUT — removed from the
 *      reference pool and handed to the GNN classifier as targets.
 *   3. The GNN's predicted dispatcher is compared to the held-out ghost's
 *      recorded label; its confidence is scored against correctness.
 *
 * HONESTY NOTE — this is an INTERNAL-CONSISTENCY metric, not ground truth. The
 * held-out labels come from the keyword/sibling tiers, which are themselves
 * heuristics, not verified wiring. A high score means the GNN's embedding space
 * agrees with those tiers — it groups same-dispatcher engines — it does NOT
 * prove the wiring is correct. The emitted report states this explicitly so no
 * downstream reader mistakes the number for accuracy-against-truth.
 *
 * Pure metric functions — computeAUROC, computeMacroF1, computeBrier,
 * bucketize, gradeMetrics — are exported and reference-tested. Consistent with
 * the NN-GRAPH-MS0 scripts/lib/*.mjs + node:test convention.
 *
 * Usage:
 *   node scripts/lib/nn-graph-eval.mjs
 *   node scripts/lib/nn-graph-eval.mjs --checkpoint c.json --holdout 200 --seed 7
 *   node scripts/lib/nn-graph-eval.mjs --out-dir state/shared/nn-graph
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadGnnCheckpoint, classifyUnknownGhosts, isValidDispatcher, GNN_DEFAULTS } from "../seed-ghost-gnn-classify.mjs";
import { mulberry32 } from "./graph-random-walk.mjs";
import { readGraphStreaming } from "./graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const OUT_DIR = path.join(ROOT, "state", "shared", "nn-graph");
const GHOST_KIND = "ghost.unwired-engine";
const REPORT_NAME = "NN-EVAL";

/** Mandatory exit gates for NN-GRAPH-MS0 (from the milestone envelope). */
export const GATE_THRESHOLDS = Object.freeze({ auroc: 0.78, macroF1: 0.55, brier: 0.15 });

export const HARNESS_DEFAULTS = Object.freeze({
  holdout: 200,        // held-out reference ghosts (capped at half the pool)
  seed: 1337,          // deterministic holdout shuffle
  refMinConf: 0.8,     // a ghost is a reference + holdout candidate at/above this
  buckets: 5,          // confidence buckets for the per-bucket Brier table
});

/** Round to 4 dp, or null when not finite. */
function round4(x) {
  return Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null;
}

/**
 * Area under the ROC curve via the rank-sum (Mann-Whitney U) identity, with
 * average ranks for ties. `scores` are predictions, `labels` are 0/1. Returns
 * a value in [0,1], or null when a class is absent or the inputs are invalid —
 * AUROC is undefined with only one class, and an honest null beats a fake 0.5.
 */
export function computeAUROC(scores, labels) {
  if (!Array.isArray(scores) || !Array.isArray(labels) ||
      scores.length !== labels.length || scores.length === 0) {
    return null;
  }
  for (const s of scores) if (!Number.isFinite(s)) return null;
  const order = scores.map((_, i) => i).sort((a, b) => scores[a] - scores[b]);
  const ranks = new Array(scores.length);
  for (let i = 0; i < order.length;) {
    let j = i;
    while (j + 1 < order.length && scores[order[j + 1]] === scores[order[i]]) j++;
    const avg = (i + j) / 2 + 1; // 1-based average rank across the tie group
    for (let k = i; k <= j; k++) ranks[order[k]] = avg;
    i = j + 1;
  }
  let nPos = 0, nNeg = 0, sumRankPos = 0;
  for (let i = 0; i < labels.length; i++) {
    if (labels[i] === 1) { nPos++; sumRankPos += ranks[i]; }
    else if (labels[i] === 0) { nNeg++; }
    else return null; // labels must be strictly 0/1
  }
  if (nPos === 0 || nNeg === 0) return null;
  return (sumRankPos - (nPos * (nPos + 1)) / 2) / (nPos * nNeg);
}

/**
 * Macro-averaged F1 over the union of predicted + truth classes. Returns
 * { macroF1, perClass: Map<class, {precision,recall,f1,support}> }. The class
 * set is the union of both arrays, so every class has either a prediction or a
 * truth instance.
 */
export function computeMacroF1(predicted, truth) {
  if (!Array.isArray(predicted) || !Array.isArray(truth) ||
      predicted.length !== truth.length || predicted.length === 0) {
    return { macroF1: null, perClass: new Map() };
  }
  const classes = new Set([...predicted, ...truth]);
  const perClass = new Map();
  let sumF1 = 0;
  for (const cls of classes) {
    let tp = 0, fp = 0, fn = 0;
    for (let i = 0; i < truth.length; i++) {
      const p = predicted[i] === cls, t = truth[i] === cls;
      if (p && t) tp++;
      else if (p) fp++;
      else if (t) fn++;
    }
    const precision = tp + fp > 0 ? tp / (tp + fp) : 0;
    const recall = tp + fn > 0 ? tp / (tp + fn) : 0;
    const f1 = precision + recall > 0 ? (2 * precision * recall) / (precision + recall) : 0;
    perClass.set(cls, { precision, recall, f1, support: tp + fn });
    sumF1 += f1;
  }
  return { macroF1: classes.size > 0 ? sumF1 / classes.size : null, perClass };
}

/**
 * Brier score — mean squared error of a probabilistic prediction against a
 * binary outcome. Lower is better; 0 is perfect. Returns null on invalid input
 * (non-finite probability, or an outcome that is not strictly 0/1).
 */
export function computeBrier(probs, outcomes) {
  if (!Array.isArray(probs) || !Array.isArray(outcomes) ||
      probs.length !== outcomes.length || probs.length === 0) {
    return null;
  }
  let sum = 0;
  for (let i = 0; i < probs.length; i++) {
    const p = probs[i], o = outcomes[i];
    if (!Number.isFinite(p) || (o !== 0 && o !== 1)) return null;
    sum += (p - o) * (p - o);
  }
  return sum / probs.length;
}

/**
 * Partition (prob, outcome) pairs into `nBuckets` equal-width confidence
 * buckets over [0,1]. Each bucket reports count, mean predicted probability,
 * empirical accuracy, and its own Brier score — the per-bucket calibration
 * view the milestone exit gate requires. Returns an array of bucket records.
 */
export function bucketize(probs, outcomes, nBuckets = HARNESS_DEFAULTS.buckets) {
  const n = Number.isInteger(nBuckets) && nBuckets > 0 ? nBuckets : HARNESS_DEFAULTS.buckets;
  const buckets = [];
  for (let b = 0; b < n; b++) {
    buckets.push({ lo: b / n, hi: (b + 1) / n, probs: [], outcomes: [] });
  }
  if (Array.isArray(probs) && Array.isArray(outcomes) && probs.length === outcomes.length) {
    for (let i = 0; i < probs.length; i++) {
      const p = probs[i];
      if (!Number.isFinite(p)) continue;
      let idx = Math.floor(Math.min(Math.max(p, 0), 1) * n);
      if (idx >= n) idx = n - 1; // p === 1 lands in the last bucket
      buckets[idx].probs.push(p);
      buckets[idx].outcomes.push(outcomes[i]);
    }
  }
  return buckets.map((bk) => {
    const count = bk.probs.length;
    const meanProb = count > 0 ? bk.probs.reduce((s, x) => s + x, 0) / count : null;
    const accuracy = count > 0 ? bk.outcomes.reduce((s, x) => s + (x === 1 ? 1 : 0), 0) / count : null;
    return {
      range: `[${bk.lo.toFixed(2)}, ${bk.hi.toFixed(2)})`,
      count,
      meanProb: round4(meanProb),
      accuracy: round4(accuracy),
      brier: count > 0 ? round4(computeBrier(bk.probs, bk.outcomes)) : null,
    };
  });
}

/**
 * Grade a metrics object against the gates. Returns { pass, verdict, failures }
 * — verdict is "deploy-ready" when every gate clears, else "shipped-research-only"
 * (the milestone's honest deferred-deploy outcome). A missing/non-finite metric
 * is a failure, never a silent pass.
 */
export function gradeMetrics(metrics, gates = GATE_THRESHOLDS) {
  const m = metrics || {};
  const failures = [];
  if (!Number.isFinite(m.auroc) || m.auroc < gates.auroc) {
    failures.push(`AUROC ${m.auroc == null ? "n/a" : m.auroc.toFixed(4)} < ${gates.auroc}`);
  }
  if (!Number.isFinite(m.macroF1) || m.macroF1 < gates.macroF1) {
    failures.push(`macro-F1 ${m.macroF1 == null ? "n/a" : m.macroF1.toFixed(4)} < ${gates.macroF1}`);
  }
  if (!Number.isFinite(m.brier) || m.brier > gates.brier) {
    failures.push(`Brier ${m.brier == null ? "n/a" : m.brier.toFixed(4)} > ${gates.brier}`);
  }
  return {
    pass: failures.length === 0,
    verdict: failures.length === 0 ? "deploy-ready" : "shipped-research-only",
    failures,
  };
}

/** Operating thresholds for the selective-deploy sweep (deploy confidence gates). */
export const SELECTIVE_THRESHOLDS = Object.freeze([0.4, 0.45, 0.5, 0.55, 0.6, 0.65, 0.7, 0.75, 0.8]);

/**
 * Selective-prediction risk-coverage curve. The GNN tier-5 is an ABSTAINING
 * tier: in production it emits a classification only when its confidence is at
 * or above the deploy gate, and DEFERS the rest to the LLM tier. So the deploy-
 * relevant quality is the EMITTED set's risk at each operating threshold τ, not
 * the full-holdout risk that also scores predictions the tier would never emit.
 *
 * WHY this is the correct scoring (not goalpost-moving): charging an abstaining
 * classifier for the abstention band it never emits understates a sound tier.
 * The textbook treatment for a classifier WITH a reject option is risk@coverage
 * (El-Yaniv & Wiener 2010). The full-holdout `grade` is ALWAYS retained beside
 * this — selective deployment is reported WITH its coverage, never instead of
 * the global number, so a reader sees exactly what fraction the tier deploys on.
 *
 * For each τ in `thresholds`, over the holdout samples with confidence >= τ:
 * coverage (emitted/total), Brier, macro-F1, accuracy, classes emitted — all via
 * the harness's OWN computeBrier / computeMacroF1 (one metric source, so the
 * selective numbers are directly comparable to the full-holdout grade).
 *
 * `samples` = [{ predicted, truth, confidence, correct }] (the assessHoldout shape).
 * Returns rows in ascending-τ order (descending coverage); empty when no samples.
 */
/** Score the EMITTED set at a single operating threshold τ (confidence >= τ).
 *  `n` is the full-holdout size (the coverage denominator). Returns null when the
 *  tier emits nothing at τ. Reuses the harness's own computeBrier / computeMacroF1. */
function selectiveRow(all, tau, n, gates) {
  const kept = all.filter((s) => s.confidence >= tau);
  if (kept.length === 0) return null;
  const probs = kept.map((s) => s.confidence);
  const labels = kept.map((s) => (s.correct ? 1 : 0));
  const predicted = kept.map((s) => s.predicted);
  const truth = kept.map((s) => s.truth);
  const brier = computeBrier(probs, labels);
  const macroF1 = computeMacroF1(predicted, truth).macroF1;
  const accuracy = labels.reduce((a, b) => a + b, 0) / kept.length;
  return {
    tau: round4(tau),
    coverage: round4(kept.length / n),
    emitted: kept.length,
    brier: round4(brier),
    macroF1: round4(macroF1),
    accuracy: round4(accuracy),
    classesEmitted: new Set(predicted).size,
    brierClears: Number.isFinite(brier) && brier <= gates.brier,
    macroF1Clears: Number.isFinite(macroF1) && macroF1 >= gates.macroF1,
  };
}

export function riskCoverageCurve(samples, gates = GATE_THRESHOLDS, thresholds = SELECTIVE_THRESHOLDS) {
  const all = Array.isArray(samples) ? samples.filter((s) => s && Number.isFinite(s.confidence)) : [];
  const n = all.length;
  if (n === 0) return [];
  const th = Array.isArray(thresholds) && thresholds.length ? thresholds : SELECTIVE_THRESHOLDS;
  return th.map((tau) => selectiveRow(all, tau, n, gates)).filter(Boolean);
}

/**
 * The deploy operating point for the abstaining tier, anchored on the PRODUCTION
 * confidence gate (the τ tier-5 actually deploys at — `GNN_DEFAULTS.minConf`, 0.7;
 * NOT the most-favorable coverage point). `found` is whether the EMITTED set at
 * the production gate clears both Brier and macro-F1. We deliberately do NOT pick
 * the lowest-τ / max-coverage clearing point as the deploy verdict — production
 * runs at a fixed gate, and picking the most-favorable τ on a small holdout would
 * exploit sampling noise (the macro-F1 curve is non-monotone). The max-coverage
 * clearing point is still surfaced (`maxCoveragePoint`) as the "if the gate were
 * lowered" tradeoff, and `robustAboveGate` reports whether EVERY τ at/above the
 * production gate clears (a stable operating regime, not a lone spike).
 *
 * AUROC is NOT thresholded here — it stays the GLOBAL ranking metric (it certifies
 * the confidence ordering that makes the abstention valid).
 *
 * opts: { productionMinConf = GNN_DEFAULTS.minConf, thresholds = SELECTIVE_THRESHOLDS }.
 */
export function selectiveDeployPoint(samples, gates = GATE_THRESHOLDS, opts = {}) {
  const all = Array.isArray(samples) ? samples.filter((s) => s && Number.isFinite(s.confidence)) : [];
  const n = all.length;
  const productionMinConf = Number.isFinite(opts.productionMinConf)
    ? opts.productionMinConf
    : GNN_DEFAULTS.minConf;
  const thresholds = Array.isArray(opts.thresholds) && opts.thresholds.length ? opts.thresholds : SELECTIVE_THRESHOLDS;
  if (n === 0) {
    return { found: false, productionMinConf: round4(productionMinConf), productionPoint: null, maxCoveragePoint: null, robustAboveGate: false, totalClasses: 0 };
  }
  // Distinct TRUTH classes across the full holdout — the denominator for "the
  // emitted set spans K of M dispatcher classes" (a macro-F1 of 1.0 over a
  // concentrated 2-of-6 emitted set must not read as "perfect across all classes").
  const totalClasses = new Set(all.map((s) => s.truth)).size;
  const curve = riskCoverageCurve(samples, gates, thresholds);
  // Production deploy point: the emitted set at the REAL production gate.
  const productionPoint = selectiveRow(all, productionMinConf, n, gates);
  const found = !!(productionPoint && productionPoint.brierClears && productionPoint.macroF1Clears);
  // Max-coverage clearing point (supplementary "if the gate were lowered" tradeoff).
  const maxCoveragePoint = curve.find((r) => r.brierClears && r.macroF1Clears) || null;
  // Robust = clears at the production gate AND at every grid threshold above it
  // (a stable regime, not a lone noise spike at one τ).
  const aboveGate = curve.filter((r) => r.tau >= round4(productionMinConf));
  const robustAboveGate = found && aboveGate.length > 0 && aboveGate.every((r) => r.brierClears && r.macroF1Clears);
  return { found, productionMinConf: round4(productionMinConf), productionPoint, maxCoveragePoint, robustAboveGate, totalClasses };
}

/**
 * Grade the tier as an abstaining (selective) deployer AT ITS PRODUCTION GATE.
 * The global AUROC must clear its gate (it certifies the confidence order the
 * abstention relies on), AND the emitted set at the production confidence gate
 * must clear Brier + macro-F1. This NEVER replaces the full-holdout `gradeMetrics`
 * — it is an ADDITIONAL deploy-relevant verdict that reports its coverage. The
 * verdict is anchored on the production gate, not the most-favorable τ.
 */
export function gradeSelectiveDeploy(metrics, deployPoint, gates = GATE_THRESHOLDS) {
  const m = metrics || {};
  const dp = deployPoint || { found: false };
  const op = dp.productionPoint || null;
  const aurocPass = Number.isFinite(m.auroc) && m.auroc >= gates.auroc;
  const failures = [];
  if (!aurocPass) failures.push(`AUROC ${Number.isFinite(m.auroc) ? m.auroc.toFixed(4) : "n/a"} < ${gates.auroc} (global ranking)`);
  if (!dp.found) {
    failures.push(op
      ? `at the production gate τ=${dp.productionMinConf} the emitted set fails: ${[op.brierClears ? null : `Brier ${op.brier} > ${gates.brier}`, op.macroF1Clears ? null : `macro-F1 ${op.macroF1} < ${gates.macroF1}`].filter(Boolean).join(", ")}`
      : `the tier emits nothing at the production gate τ=${dp.productionMinConf}`);
  }
  const pass = aurocPass && dp.found;
  const totalClasses = Number.isFinite(dp.totalClasses) ? dp.totalClasses : null;
  const classesEmitted = op && Number.isFinite(op.classesEmitted) ? op.classesEmitted : null;
  // Concentrated = the emitted set spans fewer classes than the full holdout, so
  // its macro-F1 is averaged over only a SUBSET of dispatcher classes (the high-
  // confidence band tends to be the easy cluster) — surfaced so a 1.0 is not read
  // as "perfect across all dispatchers".
  const concentrated = classesEmitted !== null && totalClasses !== null && classesEmitted < totalClasses;
  return {
    pass,
    verdict: pass ? "deploy-ready-selective" : "no-deployable-operating-point",
    failures,
    productionGate: dp.productionMinConf,
    operatingPoint: op
      ? { tau: op.tau, coverage: op.coverage, emitted: op.emitted, brier: op.brier, macroF1: op.macroF1, accuracy: op.accuracy, classesEmitted, totalClasses }
      : null,
    maxCoveragePoint: dp.maxCoveragePoint
      ? { tau: dp.maxCoveragePoint.tau, coverage: dp.maxCoveragePoint.coverage, brier: dp.maxCoveragePoint.brier, macroF1: dp.maxCoveragePoint.macroF1 }
      : null,
    robustAboveGate: dp.robustAboveGate === true,
    concentrated,
    globalAuroc: round4(m.auroc),
    note: `Anchored on the PRODUCTION confidence gate (GNN_DEFAULTS.minConf), NOT the most-favorable τ. tier-5 emits above the gate and DEFERS the rest (coverage<1) to the LLM tier. AUROC is the full-holdout ranking metric; Brier+macro-F1 are the emitted-set quality at the production gate.${concentrated ? ` NOTE: the emitted set spans only ${classesEmitted} of ${totalClasses} dispatcher classes — macro-F1 is over that subset (the high-confidence band is concentrated), NOT all classes.` : ""} Full-holdout grade is retained for transparency. maxCoveragePoint shows the tradeoff if the gate were lowered.`,
  };
}

/**
 * Detect a DEGENERATE classifier — one whose holdout output carries no ranking
 * signal, so the AUROC it yields is an artifact (~0.5 by tie-breaking), NOT a
 * near-miss. This is the honesty guard that stops a collapsed model from
 * reading as "almost passing": a constant-confidence vote and a real 0.77 both
 * score below 0.78, but only one is worth tuning.
 *
 * Two collapse modes:
 *   - constant-confidence: every target gets the SAME confidence → zero ranking
 *     signal → AUROC is uninformative. This is the AUROC-INVALIDATING signature
 *     (`isDegenerate` keys off it).
 *   - single-class: every target gets the SAME predicted dispatcher → the vote
 *     has collapsed to the reference-pool class prior. On its own (with varying
 *     confidence) it still ranks, so it is reported but does NOT set
 *     `isDegenerate`.
 *
 * Needs >= 2 holdout samples to mean anything (one sample is trivially
 * "constant"); below that it reports `insufficient-holdout`, never degenerate.
 *
 * BOUNDARY (necessary, not sufficient): this catches EXACT confidence-collapse
 * (one distinct value at round4 precision). It does NOT catch NEAR-collapse — a
 * model emitting e.g. {0.40, 0.40, 0.40, 0.4001} has 2 distinct confidences, is
 * NOT flagged, yet its AUROC is still near-meaningless (0 or 1 on the lone odd
 * sample). So `isDegenerate:false` means "not a CONSTANT-vote artifact", NOT
 * "the AUROC is trustworthy". The numeric deploy gate (gradeMetrics) still
 * fails these on the real metric; this flag only rescues the one deceptive case
 * where a fully-collapsed model reads as a ~0.5 near-miss.
 *
 * Pure + exported for reference tests.
 *
 * @param {number[]} scores    per-target confidence (the AUROC ranking signal)
 * @param {string[]} predicted per-target predicted dispatcher
 * @returns {{isDegenerate:boolean, mode:string, distinctConfidences:number,
 *   distinctPredictions:number, dominantClass:(string|null),
 *   dominantShare:(number|null), detail:string}}
 */
export function detectDegeneracy(scores, predicted) {
  const s = Array.isArray(scores) ? scores.filter((x) => Number.isFinite(x)) : [];
  const p = Array.isArray(predicted) ? predicted : [];
  const base = {
    isDegenerate: false, mode: "none",
    distinctConfidences: 0, distinctPredictions: 0,
    dominantClass: null, dominantShare: null, detail: "",
  };
  if (s.length < 2) {
    return { ...base, mode: "insufficient-holdout", distinctConfidences: s.length,
      detail: "fewer than 2 finite-confidence targets — degeneracy not assessable" };
  }
  // Distinct confidences at the harness reporting precision (round4). A model
  // that emits ONE confidence for every input is not ranking anything.
  const distinctConfidences = new Set(s.map((x) => round4(x))).size;
  // Distinct predicted classes + the dominant-class share.
  const counts = new Map();
  for (const cls of p) counts.set(cls, (counts.get(cls) || 0) + 1);
  let dominantClass = null, dominantCount = 0;
  for (const [cls, c] of counts) if (c > dominantCount) { dominantCount = c; dominantClass = cls; }
  const distinctPredictions = counts.size;
  const dominantShare = p.length > 0 ? round4(dominantCount / p.length) : null;

  const constantConfidence = distinctConfidences <= 1;
  const singleClass = distinctPredictions <= 1;
  const isDegenerate = constantConfidence; // only the confidence collapse voids AUROC
  let mode = "none";
  if (constantConfidence && singleClass) mode = "constant-vote";   // full collapse to class prior
  else if (constantConfidence) mode = "constant-confidence";
  else if (singleClass) mode = "single-class";

  let detail;
  if (constantConfidence) {
    detail = `every target scored at one confidence (${round4(s[0])})`
      + (singleClass ? ` and all predicted \`${dominantClass}\`` : "")
      + " — AUROC carries no ranking signal (artifact of the tie, not a near-miss)";
  } else if (singleClass) {
    detail = `all predictions = \`${dominantClass}\` but confidence varies — collapsed to the reference-pool class prior`;
  } else {
    detail = "discriminating (varied confidence + classes)";
  }
  return { isDegenerate, mode, distinctConfidences, distinctPredictions, dominantClass, dominantShare, detail };
}

/** Fisher-Yates shuffle of a copy of `arr`, deterministic for a fixed seed. */
function seededShuffle(arr, seed) {
  const out = arr.slice();
  const rng = mulberry32(seed);
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const t = out[i]; out[i] = out[j]; out[j] = t;
  }
  return out;
}

/**
 * Build the leave-out holdout: every high-confidence reference ghost, split
 * (seeded) into a held-out test set and the remaining reference pool. The
 * holdout is capped at half the pool so the GNN always has references to vote
 * with. Returns { holdout, poolSize, requested }.
 */
export function buildHoldout(graph, opts = {}) {
  const refMinConf = Number.isFinite(opts.refMinConf) ? opts.refMinConf : HARNESS_DEFAULTS.refMinConf;
  const seed = Number.isInteger(opts.seed) ? opts.seed : HARNESS_DEFAULTS.seed;
  const requested = Number.isInteger(opts.holdout) && opts.holdout > 0 ? opts.holdout : HARNESS_DEFAULTS.holdout;

  const nodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  // Label-unique pool: a held-out ghost is scored by label, so a duplicate-label
  // ghost would collapse in the holdout Set and over-count `n` (and U6's
  // label-keyed partition would thin the reference pool). First label wins.
  const seenLabel = new Set();
  const pool = [];
  for (const n of nodes) {
    if (!n || n.kind !== GHOST_KIND || typeof n.label !== "string") continue;
    if (!isValidDispatcher(n.proposed_wiring)) continue;
    if (!Number.isFinite(n.confidence) || n.confidence < refMinConf) continue;
    if (seenLabel.has(n.label)) continue;
    seenLabel.add(n.label);
    pool.push(n);
  }

  // Flat split (legacy): a uniform seeded shuffle inherits the pool's class skew
  // (~45% prism_turning), so a minority class like prism_calc can get ZERO holdout
  // samples. macroF1 averages per-class F1 over union(predicted,truth), so a class
  // with no truth sample that is ever predicted scores F1=0 and DRAGS the average —
  // artificially capping macroF1 (the binding deploy gate). Kept for A/B via
  // opts.stratify === false / --flat-holdout.
  if (opts.stratify === false) {
    const cap = Math.floor(pool.length / 2); // keep at least half as references
    const k = Math.min(requested, cap);
    const holdout = k > 0 ? seededShuffle(pool, seed).slice(0, k) : [];
    return { holdout, poolSize: pool.length, requested, stratified: false };
  }

  // Stratified split (default): hold out ~half of EACH class (seeded) so every class
  // with >=2 pool members is represented in the holdout truth AND retains >=1
  // reference. A 1-sample class stays a reference only (cannot both hold out and
  // leave a reference). This makes macroF1 a fair per-class average; class skew in
  // the REMAINING references is already handled by the shipped base-rate
  // normalization in voteDispatcher. (spec GNN-DEGENERATE-FIX 1b)
  const byClass = new Map();
  for (const n of pool) {
    const c = n.proposed_wiring;
    if (!byClass.has(c)) byClass.set(c, []);
    byClass.get(c).push(n);
  }
  const holdout = [];
  let heldClasses = 0;
  let singletonClasses = 0;
  for (const c of [...byClass.keys()].sort()) { // sorted class order → reproducible
    const members = seededShuffle(byClass.get(c), seed);
    if (members.length < 2) { singletonClasses++; continue; } // reference-only
    const hk = Math.floor(members.length / 2); // 1..len-1 → always leaves >=1 reference
    for (let i = 0; i < hk; i++) holdout.push(members[i]);
    heldClasses++;
  }
  // Respect the requested cap deterministically (rarely binds — holdout ~ pool/2).
  const finalHoldout = (requested > 0 && holdout.length > requested)
    ? seededShuffle(holdout, seed).slice(0, requested)
    : holdout;
  return { holdout: finalHoldout, poolSize: pool.length, requested, stratified: true, heldClasses, singletonClasses };
}

/**
 * Run the GNN classifier against a holdout and score it. `predictor` is a
 * loaded predictor handle. Returns { n, skipped?, metrics, buckets, samples }.
 * A held-out ghost the classifier declines to resolve counts as a miss
 * (confidence 0, predicted "(none)") — the classifier was asked and did not
 * deliver; hiding that would inflate the score.
 */
export function assessHoldout(graph, predictor, opts = {}) {
  const { holdout, poolSize, stratified, heldClasses } = buildHoldout(graph, opts);
  if (holdout.length === 0) {
    return { n: 0, skipped: true, poolSize,
      reason: poolSize < 2 ? "insufficient-reference-pool" : "empty-holdout",
      metrics: {}, buckets: [], samples: [] };
  }
  const targetNames = new Set(holdout.map((h) => h.label));
  const res = classifyUnknownGhosts(graph, {
    env: {},
    predictor,
    targetNames,
    minConf: 0, // the assessment wants every prediction, not the deployment gate
    refMinConf: Number.isFinite(opts.refMinConf) ? opts.refMinConf : HARNESS_DEFAULTS.refMinConf,
    // GNN-F0/2d: direct-embed votes raw nomic cosine (no model). Forwarded from runAssessment.
    directEmbed: opts.directEmbed === true,
    directEmbedPath: opts.directEmbedPath,
  });
  if (res.skipped) {
    return { n: 0, skipped: true, reason: `classifier-skipped: ${res.reason}`,
      metrics: {}, buckets: [], samples: [] };
  }
  const byEngine = new Map(res.classifications.map((c) => [c.engine, c]));

  const scores = [];   // confidence
  const labels = [];   // correct? 1/0
  const predicted = [];
  const truth = [];
  const samples = [];
  for (const ghost of holdout) {
    const c = byEngine.get(ghost.label);
    const trueDisp = ghost.proposed_wiring;
    const predDisp = c ? c.dispatcher : "(none)";
    const conf = c && Number.isFinite(c.confidence) ? c.confidence : 0;
    const correct = predDisp === trueDisp ? 1 : 0;
    scores.push(conf);
    labels.push(correct);
    predicted.push(predDisp);
    truth.push(trueDisp);
    samples.push({ engine: ghost.label, predicted: predDisp, truth: trueDisp, confidence: round4(conf), correct: !!correct });
  }

  const f1 = computeMacroF1(predicted, truth);
  const accuracy = labels.reduce((s, x) => s + x, 0) / labels.length;
  const metrics = {
    auroc: round4(computeAUROC(scores, labels)),
    macroF1: round4(f1.macroF1),
    brier: round4(computeBrier(scores, labels)),
    accuracy: round4(accuracy),
  };
  // Validity guard: is this AUROC a real signal or a tie-break artifact of a
  // collapsed classifier? Computed from the prediction confidences + classes
  // the model actually produced (not the gate numbers) — see detectDegeneracy.
  const degeneracy = detectDegeneracy(scores, predicted);
  // Selective-prediction view: score tier-5 as the abstaining tier it is (emit
  // above τ, defer the rest to the LLM tier). Reuses the same metric functions.
  const selCurve = riskCoverageCurve(samples, GATE_THRESHOLDS);
  const selDeploy = selectiveDeployPoint(samples, GATE_THRESHOLDS);
  return {
    n: holdout.length,
    skipped: false,
    metrics,
    degeneracy,
    stratified,
    heldClasses,
    buckets: bucketize(scores, labels, opts.buckets),
    perClass: f1.perClass,
    selective: { curve: selCurve, deployPoint: selDeploy },
    samples,
  };
}

/**
 * End-to-end assessment. Loads the graph + a checkpoint (or uses opts.predictor),
 * builds the holdout, scores it, and grades. Returns a result object — never
 * throws on a missing checkpoint: `deferred:true` means the harness is ready
 * but no trained model exists yet (the expected pre-training state).
 */
export function runAssessment(opts = {}) {
  let graph = opts.graph;
  if (!graph) {
    // U-NN-PREDICTOR-EMBED-WIRE follow-up (2026-05-24, slot papa): the live
    // system-viz graph crossed V8's ~512MB max-string-length. Use the streaming
    // reader for any graph >256MB. Preserve the test seam (readFileImpl) so
    // unit tests that inject smaller graphs still take the legacy path.
    const graphPath = opts.graphPath || GRAPH_PATH;
    try {
      if (!opts.readFileImpl) {
        let st = null;
        try { st = fs.statSync(graphPath); } catch { /* fall through to text */ }
        if (st && Number.isFinite(st.size) && st.size > 256 * 1024 * 1024) {
          graph = readGraphStreaming(graphPath);
        }
      }
      if (!graph) {
        graph = JSON.parse((opts.readFileImpl || fs.readFileSync)(graphPath, "utf8"));
      }
    } catch (err) {
      if (err && err.code === "ERR_STRING_TOO_LONG") {
        try { graph = readGraphStreaming(graphPath); }
        catch (sErr) {
          return { deferred: true, reason: `graph-load-failed: ${sErr && sErr.message ? sErr.message : sErr}` };
        }
      } else {
        return { deferred: true, reason: `graph-load-failed: ${err && err.message ? err.message : err}` };
      }
    }
  }
  // GNN-F0/2d: direct-embed mode votes raw nomic cosine over precomputed ghost
  // vectors — no trained checkpoint/model is consulted, so it must not defer on a
  // missing checkpoint. The embeddings file IS the classifier.
  const directEmbed = opts.directEmbed === true || process.env.PRISM_NNG_DIRECT_EMBED === "1";
  let predictor = opts.predictor;
  // An injected predictor (test path) counts as a present model — a real
  // checkpoint is only consulted when no predictor was supplied.
  let checkpointPresent = !!predictor || directEmbed;
  let checkpointMeta = directEmbed ? { embeddingMode: "direct", note: "raw-768d-nomic cosine, no trained model" } : null;
  if (!predictor && !directEmbed) {
    const ckptPath = opts.checkpoint || path.join(OUT_DIR, "graphsage-checkpoint.json");
    const loaded = loadGnnCheckpoint(ckptPath, { readFileImpl: opts.readFileImpl });
    if (!loaded.ok) {
      return { deferred: true, reason: loaded.reason, checkpointPresent: false,
        note: "The GNN tier-5 harness is built and tested; a trained checkpoint (U4 pipeline) is required to produce metrics." };
    }
    predictor = loaded.predictor;
    checkpointPresent = true;
    // Best-effort: surface the trained link-prediction diagnostic so a
    // deferred report stays informative. Absence must never break the report.
    try {
      const ckpt = JSON.parse((opts.readFileImpl || fs.readFileSync)(ckptPath, "utf8"));
      checkpointMeta = ckpt && ckpt.metadata ? ckpt.metadata : null;
    } catch { /* metadata is optional context, not load-bearing */ }
  }
  const scored = assessHoldout(graph, predictor, { ...opts, directEmbed });
  if (scored.skipped) {
    return { deferred: true, reason: scored.reason, checkpointPresent,
      poolSize: scored.poolSize, checkpointMeta };
  }
  const grade = gradeMetrics(scored.metrics);
  // Additional selective-deploy verdict (the tier as an abstaining classifier).
  // NEVER replaces `grade` — both are reported so the full-holdout number stays visible.
  const selective = scored.selective || { curve: [], deployPoint: { found: false } };
  const deployGrade = gradeSelectiveDeploy(scored.metrics, selective.deployPoint);
  return {
    deferred: false,
    assessedAt: opts.now || new Date().toISOString(),
    holdoutN: scored.n,
    // GNN-F0/2d: self-document which classifier produced these metrics — "direct"
    // = raw-768d-nomic cosine k-NN (degeneracy fix); "model" = the trained 8-d
    // checkpoint. A reader must never confuse a direct-embed number for a model number.
    embeddingMode: directEmbed ? "direct" : "model",
    checkpointPresent,
    // GNN-F0 1b: which holdout split produced these metrics. "stratified" (default)
    // guarantees every >=2-sample class is in the holdout truth, so macroF1 is a
    // fair per-class average; "flat" inherits the pool skew (a minority class can
    // get 0 holdout, dragging macroF1). A reader must not compare across splits.
    holdoutSplit: scored.stratified === false ? "flat" : "stratified",
    heldClasses: scored.heldClasses,
    gates: GATE_THRESHOLDS,
    metrics: scored.metrics,
    degeneracy: scored.degeneracy,
    buckets: scored.buckets,
    grade,
    selective: { curve: selective.curve, deployPoint: selective.deployPoint, deployGrade },
    samples: scored.samples,
  };
}

/** JSON-safe fixed-precision formatter; non-finite degrades to "n/a". */
const fmtNum = (x) =>
  x == null || !Number.isFinite(Number(x)) ? "n/a" : Number(x).toFixed(4);

/** Render a result from runAssessment as the report markdown body. */
export function renderReport(result) {
  const L = [`# NN-GRAPH-MS0 GNN Tier-5 Assessment — ${REPORT_NAME}`, ""];
  if (result.deferred) {
    L.push(`**Status: DEFERRED** — ${result.reason}`, "");
    // A present-but-ungradeable checkpoint is a *different* state from no
    // checkpoint at all. Reporting the generic "re-run once a checkpoint
    // exists" prose here would actively misstate that a model was trained.
    if (result.checkpointPresent) {
      const cm = result.checkpointMeta;
      // Only the embedded training metadata (epochs, finalLoss, trainedAt) is
      // empirical proof the model was actually trained. "A predictor loaded"
      // alone does NOT justify the strong "U4 blocker resolved" claim — an
      // untrained / zero-weight / metadata-less checkpoint loads identically.
      if (cm) {
        L.push("A trained GraphSAGE checkpoint **is present and loaded cleanly** — the",
          "U4 training-pipeline blocker is resolved.", "");
      } else {
        L.push("A GraphSAGE checkpoint **loaded cleanly**, but it carries no embedded",
          "training metadata — training provenance is **unverified** (the U4",
          "pipeline stamps `metadata`; its absence means this model's origin",
          "cannot be confirmed from the checkpoint alone).", "");
      }
      L.push("The deploy gate cannot be graded yet for a **data-side** reason, not",
        "a code-side one:", "");
      const pool = Number.isFinite(result.poolSize) ? result.poolSize : 0;
      L.push(`- Reference pool in the current system-viz graph: **${pool}** high-`,
        "  confidence ghost classifications (a leave-out holdout needs >= 2). The",
        "  tier-5 gate is dormant by data — the `ghost.unwired-engine` count",
        "  fluctuates 0..811 with each system-viz regeneration and is currently",
        "  at the low end.", "");
      if (cm) {
        L.push("Trained-checkpoint link-prediction diagnostic (the pretext task —",
          "expected weak on this heterophilous, type-imbalanced graph; this is",
          "NOT the deploy gate):", "",
          `- AUROC ${fmtNum(cm.auroc)} · Brier(raw) ${fmtNum(cm.brierRaw)} · Brier(cal) ${fmtNum(cm.brierCalibrated)}`,
          `- epochs ${cm.epochs ?? "?"} · finalLoss ${fmtNum(cm.finalLoss)} · calibrator ${cm.calibratorReliable ? "reliable" : "low-sample"} (n=${cm.calibratorN ?? "?"})`,
          "");
      }
      L.push("**Unblock:** re-run after a system-viz regeneration that yields >= 2",
        "high-confidence reference ghosts (no retraining needed — only the graph",
        "data must change):", "",
        "```",
        "node scripts/lib/nn-graph-eval.mjs --checkpoint state/shared/nn-graph/graphsage-checkpoint.json",
        "```");
      return L.join("\n") + "\n";
    }
    if (result.note) L.push(result.note, "");
    L.push("The assessment harness is built and unit-tested. Re-run it once a",
      "trained checkpoint exists to produce metrics.");
    return L.join("\n") + "\n";
  }
  const m = result.metrics, g = result.grade;
  L.push(`**Assessed:** ${result.assessedAt}  ·  **Holdout:** ${result.holdoutN} reference ghosts`, "");
  L.push("> Internal-consistency metric — measures whether the GNN agrees with the",
    "> keyword/sibling tiers' high-confidence labels. NOT verified ground truth.", "");
  L.push("## Mandatory gates", "");
  L.push("| Metric | Value | Gate | Result |", "|---|---|---|---|");
  L.push(`| AUROC | ${m.auroc ?? "n/a"} | >= ${result.gates.auroc} | ${Number.isFinite(m.auroc) && m.auroc >= result.gates.auroc ? "PASS" : "FAIL"} |`);
  L.push(`| macro-F1 | ${m.macroF1 ?? "n/a"} | >= ${result.gates.macroF1} | ${Number.isFinite(m.macroF1) && m.macroF1 >= result.gates.macroF1 ? "PASS" : "FAIL"} |`);
  L.push(`| Brier | ${m.brier ?? "n/a"} | <= ${result.gates.brier} | ${Number.isFinite(m.brier) && m.brier <= result.gates.brier ? "PASS" : "FAIL"} |`);
  L.push(`| accuracy | ${m.accuracy ?? "n/a"} | (informational) | — |`, "");
  L.push(`**Verdict: ${g.verdict.toUpperCase()}**`, "");
  if (!g.pass) L.push("Gate failures: " + g.failures.join("; "), "");
  // Honesty guard: a degenerate (constant-vote) classifier scores ~0.5 by tie-
  // break, NOT by being close. Surface it so the verdict is never misread as a
  // near-miss that threshold-tuning could rescue.
  const d = result.degeneracy;
  if (d && d.isDegenerate) {
    L.push("",
      `> ⚠ **DEGENERATE CLASSIFIER (${d.mode})** — ${d.detail}.`,
      "> This AUROC is **below-gate by degeneracy, not by a small margin**: the model" +
      (d.dominantClass ? ` collapsed to the reference-pool class prior (every prediction → \`${d.dominantClass}\`, share ${d.dominantShare})` : " emits one confidence for every input") +
      ". Threshold tuning cannot help — the embeddings/vote must actually separate classes first.");
  }
  L.push("");
  L.push("## Per-bucket calibration", "", "| Confidence | Count | Mean prob | Accuracy | Brier |", "|---|---|---|---|---|");
  for (const b of result.buckets) {
    L.push(`| ${b.range} | ${b.count} | ${b.meanProb ?? "—"} | ${b.accuracy ?? "—"} | ${b.brier ?? "—"} |`);
  }
  // Selective deployment — the tier-5 GNN abstains below its confidence gate
  // (defers to the LLM tier), so its deploy quality is the EMITTED set's risk at
  // each operating τ. The full-holdout grade above is the all-coverage number.
  const sel = result.selective;
  if (sel && Array.isArray(sel.curve) && sel.curve.length > 0) {
    L.push("", "## Selective deployment (risk-coverage)", "",
      "> Tier-5 ABSTAINS below its confidence gate and defers to the LLM tier, so the",
      "> deploy-relevant quality is the EMITTED set's risk at each operating τ — not the",
      "> full-holdout risk (which scores predictions the tier never emits). The full-holdout",
      "> grade above is retained; this is reported WITH its coverage, never instead of it.", "");
    L.push("| τ (gate) | Coverage | Emitted | Brier | macro-F1 | Accuracy | Brier≤gate | macroF1≥gate |",
      "|---|---|---|---|---|---|---|---|");
    for (const r of sel.curve) {
      L.push(`| ${r.tau} | ${(r.coverage * 100).toFixed(1)}% | ${r.emitted} | ${r.brier ?? "—"} | ${r.macroF1 ?? "—"} | ${r.accuracy ?? "—"} | ${r.brierClears ? "✓" : "✗"} | ${r.macroF1Clears ? "✓" : "✗"} |`);
    }
    const dg = sel.deployGrade;
    if (dg) {
      L.push("");
      if (dg.pass && dg.operatingPoint) {
        const op = dg.operatingPoint;
        const classStr = Number.isFinite(op.classesEmitted) && Number.isFinite(op.totalClasses)
          ? ` Emitted set spans **${op.classesEmitted}/${op.totalClasses}** dispatcher classes${dg.concentrated ? " (concentrated — macro-F1 is over that subset, NOT all classes)" : ""}.`
          : "";
        L.push(`**Production deploy gate: τ=${dg.productionGate}** (GNN_DEFAULTS.minConf) → coverage `
          + `${(op.coverage * 100).toFixed(1)}% (${op.emitted}/${result.holdoutN} emitted), Brier ${op.brier} `
          + `(≤ ${result.gates.brier}), macro-F1 ${op.macroF1} (≥ ${result.gates.macroF1}), accuracy ${op.accuracy}; `
          + `global AUROC ${dg.globalAuroc} (≥ ${result.gates.auroc}).${classStr}`);
        if (dg.maxCoveragePoint && dg.maxCoveragePoint.tau < dg.productionGate) {
          const mp = dg.maxCoveragePoint;
          L.push("", `_Tradeoff: lowering the gate to τ=${mp.tau} would raise coverage to `
            + `${(mp.coverage * 100).toFixed(1)}% (Brier ${mp.brier}, macro-F1 ${mp.macroF1}) — supplementary, not the deployed point._`);
        }
        L.push("", `**Selective verdict: ${dg.verdict.toUpperCase()}** — at the production gate, tier-5 deploys on the `
          + `${(op.coverage * 100).toFixed(0)}% it is confident about; the remaining `
          + `${(100 - op.coverage * 100).toFixed(0)}% defers to the LLM tier. `
          + `Operating regime ${dg.robustAboveGate ? "is **robust** (every τ at/above the gate clears)" : "is **NOT robust** (some τ above the gate fails — treat as provisional)"}.`);
      } else {
        L.push(`**Selective verdict: ${dg.verdict.toUpperCase()}** — ${dg.failures.join("; ")}.`);
        if (dg.maxCoveragePoint) {
          const mp = dg.maxCoveragePoint;
          L.push("", `_(A lower gate τ=${mp.tau} would clear at ${(mp.coverage * 100).toFixed(1)}% coverage, but production runs at τ=${dg.productionGate}.)_`);
        }
      }
    }
    L.push("", "_Small-holdout caveat: this verdict is fit on "
      + `${result.holdoutN} holdout samples; the operating point is the fixed production gate (not tuned to the holdout), but re-confirm as the reference pool grows._`);
  }
  return L.join("\n") + "\n";
}

const USAGE = `nn-graph-eval — assess the GNN tier-5 wiring classifier against the NN-GRAPH-MS0 gates

Usage: node scripts/lib/nn-graph-eval.mjs [options]

  --checkpoint <path>  trained checkpoint JSON (default: state/shared/nn-graph/graphsage-checkpoint.json)
  --graph <path>       graph JSON (default: the system-viz graph)
  --out-dir <path>     where to write the report files (default: state/shared/nn-graph)
  --holdout <n>        held-out reference ghosts (default 200, capped at half the pool)
  --seed <n>           deterministic holdout shuffle seed (default 1337)
  --no-write           print the report, do not write report files
  --help               show this help`;

export function parseArgs(argv) {
  const out = {};
  const args = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--help" || a === "-h") out.help = true;
    else if (a === "--no-write") out.noWrite = true;
    else if (a === "--checkpoint") out.checkpoint = args[++i];
    else if (a === "--graph") out.graphPath = args[++i];
    else if (a === "--out-dir") out.outDir = args[++i];
    else if (a === "--holdout") out.holdout = Number(args[++i]);
    else if (a === "--seed") out.seed = Number(args[++i]);
    else if (a === "--flat-holdout") out.stratify = false; // legacy uniform split (A/B)
    else throw new Error(`nn-graph-eval: unknown argument "${a}" (try --help)`);
  }
  return out;
}

/** CLI entry point. Returns a process exit code. */
export function main(argv) {
  let opts;
  try { opts = parseArgs(argv); }
  catch (err) { console.error(err.message); return 2; }
  if (opts.help) { console.log(USAGE); return 0; }

  const result = runAssessment({
    graphPath: opts.graphPath,
    checkpoint: opts.checkpoint,
    holdout: Number.isFinite(opts.holdout) ? opts.holdout : undefined,
    seed: Number.isInteger(opts.seed) ? opts.seed : undefined,
  });
  const report = renderReport(result);
  console.log(report);

  if (!opts.noWrite) {
    const outDir = opts.outDir ? path.resolve(opts.outDir) : OUT_DIR;
    try {
      fs.mkdirSync(outDir, { recursive: true });
      fs.writeFileSync(path.join(outDir, REPORT_NAME + ".md"), report);
      fs.writeFileSync(path.join(outDir, REPORT_NAME + ".json"), JSON.stringify(result, null, 2));
      console.log(`Wrote ${REPORT_NAME}.{md,json} to ${outDir}`);
    } catch (err) {
      console.error(`nn-graph-eval: cannot write report — ${err.message}`);
      return 1;
    }
  }
  // A deferred assessment (no checkpoint) is not a harness failure — exit 0.
  return 0;
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; }
  catch { return false; }
})();
if (__isMain) process.exit(main(process.argv.slice(2)));
