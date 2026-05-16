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

import { loadGnnCheckpoint, classifyUnknownGhosts, isValidDispatcher } from "../seed-ghost-gnn-classify.mjs";
import { mulberry32 } from "./graph-random-walk.mjs";

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

  const cap = Math.floor(pool.length / 2); // keep at least half as references
  const k = Math.min(requested, cap);
  const holdout = k > 0 ? seededShuffle(pool, seed).slice(0, k) : [];
  return { holdout, poolSize: pool.length, requested };
}

/**
 * Run the GNN classifier against a holdout and score it. `predictor` is a
 * loaded predictor handle. Returns { n, skipped?, metrics, buckets, samples }.
 * A held-out ghost the classifier declines to resolve counts as a miss
 * (confidence 0, predicted "(none)") — the classifier was asked and did not
 * deliver; hiding that would inflate the score.
 */
export function assessHoldout(graph, predictor, opts = {}) {
  const { holdout, poolSize } = buildHoldout(graph, opts);
  if (holdout.length === 0) {
    return { n: 0, skipped: true, reason: poolSize < 2 ? "insufficient-reference-pool" : "empty-holdout",
      metrics: {}, buckets: [], samples: [] };
  }
  const targetNames = new Set(holdout.map((h) => h.label));
  const res = classifyUnknownGhosts(graph, {
    env: {},
    predictor,
    targetNames,
    minConf: 0, // the assessment wants every prediction, not the deployment gate
    refMinConf: Number.isFinite(opts.refMinConf) ? opts.refMinConf : HARNESS_DEFAULTS.refMinConf,
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
  return {
    n: holdout.length,
    skipped: false,
    metrics,
    buckets: bucketize(scores, labels, opts.buckets),
    perClass: f1.perClass,
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
    try {
      graph = JSON.parse((opts.readFileImpl || fs.readFileSync)(opts.graphPath || GRAPH_PATH, "utf8"));
    } catch (err) {
      return { deferred: true, reason: `graph-load-failed: ${err && err.message ? err.message : err}` };
    }
  }
  let predictor = opts.predictor;
  if (!predictor) {
    const loaded = loadGnnCheckpoint(opts.checkpoint || path.join(OUT_DIR, "graphsage-checkpoint.json"),
      { readFileImpl: opts.readFileImpl });
    if (!loaded.ok) {
      return { deferred: true, reason: loaded.reason,
        note: "The GNN tier-5 harness is built and tested; a trained checkpoint (U4 pipeline) is required to produce metrics." };
    }
    predictor = loaded.predictor;
  }
  const scored = assessHoldout(graph, predictor, opts);
  if (scored.skipped) {
    return { deferred: true, reason: scored.reason };
  }
  const grade = gradeMetrics(scored.metrics);
  return {
    deferred: false,
    assessedAt: opts.now || new Date().toISOString(),
    holdoutN: scored.n,
    gates: GATE_THRESHOLDS,
    metrics: scored.metrics,
    buckets: scored.buckets,
    grade,
    samples: scored.samples,
  };
}

/** Render a result from runAssessment as the report markdown body. */
export function renderReport(result) {
  const L = [`# NN-GRAPH-MS0 GNN Tier-5 Assessment — ${REPORT_NAME}`, ""];
  if (result.deferred) {
    L.push(`**Status: DEFERRED** — ${result.reason}`, "");
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
  L.push("## Per-bucket calibration", "", "| Confidence | Count | Mean prob | Accuracy | Brier |", "|---|---|---|---|---|");
  for (const b of result.buckets) {
    L.push(`| ${b.range} | ${b.count} | ${b.meanProb ?? "—"} | ${b.accuracy ?? "—"} | ${b.brier ?? "—"} |`);
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
