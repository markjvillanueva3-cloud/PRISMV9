#!/usr/bin/env node
/**
 * measure-ghost-holdout-headtohead.mjs -- the DEPLOY DECISION for the GNN tier-5 edges
 * lever (slot:india 2026-06-21). The FINAL step of the edges-lever arc
 * ([[gnn-edges-lever]]): run the three classifiers on the LIVE deployed UNWIRED-ghost
 * holdout and decide -- with real AUROC / macro-F1 / Brier at the production gate --
 * whether the homophilous-edge signal should be wired into the deployed tier-5.
 *
 * THE ARC SO FAR (all on the codebase-WIRED set = a CEILING/proxy, real labels):
 *   homophily 4.63x ([[reference_gnn_edge_class_homophily_2026_06_21]]) -> neighbor-vote LOO
 *   0.767 ([[reference_gnn_neighbor_vote_loo_2026_06_21]]) -> head-to-head
 *   ([[reference_gnn_classify_headtohead_2026_06_21]]) -> confidence-hybrid tau=0.70 = 0.753
 *   = +0.0309 over direct-embed ([[reference_gnn_confidence_hybrid_2026_06_21]]).
 * This unit closes it on the REAL target -- the deployed UNWIRED ghosts -- via the
 * graph-free ghost-aware neighbor index ([[reference_gnn_ghost_neighbor_index_2026_06_21]]).
 *
 * THREE ARMS scored over the SAME seeded holdout (buildHoldout, deterministic):
 *   1. direct-embed  -- the DEPLOYED classifier (runAssessment directEmbed:true; raw
 *      768d-nomic cosine k-NN over ghost-node-embeddings.jsonl, NO edges).
 *   2. neighbor-vote -- count-based vote over the leak-free homophilous edges
 *      (import+schema+test) via buildGhostNeighborIndex + the shipped neighborVote.
 *      ABSTAINS (conf 0, miss) on a ghost with no wired neighbor.
 *   3. confidence-hybrid@tau -- trust the neighbor vote iff its purity >= tau, else fall
 *      back to the direct-embed prediction (full coverage). tau default 0.70 (the
 *      candidate from the confidence-hybrid unit; == GNN_DEFAULTS.minConf).
 *
 * LEAK DISCIPLINE (india soul): the neighbor arm uses buildGhostNeighborIndex, which makes
 * the held-out ghost the QUERY target (no label) and only WIRED engines the voters; a
 * held-out ghost whose stem is ALSO wired (in stemToClass) is EXCLUDED as a target
 * (wired precedence) so its real dispatcher label can never leak into its own vote. The
 * neighbor vote reads only its neighbours' labels. Direct-embed is leave-one-out inside
 * classifyUnknownGhosts (the held-out vector is removed from the reference pool).
 *
 * THE GATE (not accuracy): AUROC>=0.78 (global ranking) AND the EMITTED set at the
 * production gate (GNN_DEFAULTS.minConf) clears Brier<=0.15 + macro-F1>=0.55
 * (gradeSelectiveDeploy). The edges lever is WIRED into tier-5 ONLY IF the hybrid clears
 * the gate AND beats the deployed direct-embed's selective posture (more classes spanned
 * or higher coverage at the gate), STABLE across seeds. Else direct-embed stands.
 *
 * R12 CAVEAT: the hybrid mixes two confidence scales (neighbor purity vs cosine), so its
 * AUROC ranking is cross-scale and read with care; the DECISION rests on the selective
 * deploy point (what the production tier actually emits), multi-seed.
 *
 * Pure-export contract (graph-free, reference-tested): neighborArmSamples, hybridArmSamples,
 * scoreArm, decideHeadToHead. The 542MB graph is loaded only in main() (a subprocess
 * concern; run with --max-old-space-size=8192).
 *
 * NON-DESTRUCTIVE: reads the graph + edge augmentations + ghost embeddings; writes NOTHING
 * unless --out <path> is given (a JSON report; never touches NN-EVAL.json / the cache).
 *
 * Run: node --max-old-space-size=8192 scripts/measure-ghost-holdout-headtohead.mjs [--json] [--tau 0.7] [--seeds 1337,7,42] [--out <path>]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { readGraphStreaming } from "./lib/graph-io.mjs";
import {
  runAssessment, computeAUROC, computeMacroF1, computeBrier,
  selectiveDeployPoint, gradeSelectiveDeploy, GATE_THRESHOLDS,
} from "./lib/nn-graph-eval.mjs";
import { GNN_DEFAULTS } from "./seed-ghost-gnn-classify.mjs";
import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { buildStemToClass } from "./measure-edge-class-homophily.mjs";
import { buildGhostNeighborIndex, ghostNeighborCoverage } from "./lib/ghost-neighbor-index.mjs";
import { neighborVote, NEIGHBOR_EDGE_FILES } from "./measure-neighbor-vote-loo.mjs";
import { confidenceHybridVote } from "./measure-confidence-hybrid.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const GHOST_EMB = path.join(ROOT, "state", "shared", "nn-graph", "ghost-node-embeddings.jsonl");

const DEFAULT_TAU = 0.70;          // the confidence-hybrid candidate (== GNN_DEFAULTS.minConf)
const DEFAULT_SEEDS = Object.freeze([1337, 7, 42]); // multi-seed before any promote
const NONE = "(none)";             // the abstention sentinel (matches assessHoldout)

/** Round to 4 dp, or null when not finite. */
function round4(x) { return Number.isFinite(x) ? Math.round(x * 1e4) / 1e4 : null; }

/**
 * Neighbor-vote arm samples over a holdout. Each held-out ghost is classified by the
 * weighted-majority vote of its WIRED neighbours (the shipped neighborVote over a
 * ghost-aware index). A ghost with no wired neighbour ABSTAINS -> predicted "(none)",
 * confidence 0, correct false (the classifier was asked and did not deliver; hiding that
 * inflates the score -- same convention as assessHoldout). Leak-free: the ghost-aware
 * index already excludes a ghost whose stem is wired, and neighborVote reads only
 * neighbours' labels. Pure.
 *
 * @param {Array<{label:string, proposed_wiring:string}>} holdout
 * @param {Map<string, Map<string, number>>} ghostIndex  from buildGhostNeighborIndex
 * @param {Map<string,string>} stemToClass  wired engines (voters)
 * @returns {Array<{engine,predicted,truth,confidence,correct,source}>}
 */
export function neighborArmSamples(holdout, ghostIndex, stemToClass) {
  const out = [];
  for (const h of Array.isArray(holdout) ? holdout : []) {
    if (!h || typeof h.label !== "string") continue;
    const stem = h.label.toLowerCase();
    const nv = neighborVote(stem, ghostIndex, stemToClass);
    const predicted = nv ? nv.predicted : NONE;
    const confidence = nv && Number.isFinite(nv.confidence) ? nv.confidence : 0;
    out.push({
      engine: h.label,
      predicted,
      truth: h.proposed_wiring,
      confidence: round4(confidence),
      correct: predicted !== NONE && predicted === h.proposed_wiring,
      source: nv ? "neighbor" : "abstain",
    });
  }
  return out;
}

/**
 * Confidence-hybrid arm samples: trust the neighbour vote iff its purity >= tau, else the
 * direct-embed prediction (the shipped confidenceHybridVote). The hybrid's confidence is
 * the SOURCE arm's confidence -- neighbour purity when a neighbour vote is used, else the
 * direct-embed cosine (the documented cross-scale caveat). A ghost with neither arm ->
 * "(none)"/0. Full coverage when direct-embed has a vector for the ghost. Pure.
 *
 * @param {Array<{label:string, proposed_wiring:string}>} holdout
 * @param {Map<string, Map<string, number>>} ghostIndex
 * @param {Map<string,string>} stemToClass
 * @param {Map<string,{predicted:string,confidence:number}>} directByEngine  arm-1 votes keyed by label
 * @param {number} tau
 * @returns {Array<{engine,predicted,truth,confidence,correct,source}>}
 */
export function hybridArmSamples(holdout, ghostIndex, stemToClass, directByEngine, tau = DEFAULT_TAU) {
  const dmap = directByEngine instanceof Map ? directByEngine : new Map();
  const t = Number.isFinite(tau) ? tau : DEFAULT_TAU;
  const out = [];
  for (const h of Array.isArray(holdout) ? holdout : []) {
    if (!h || typeof h.label !== "string") continue;
    const stem = h.label.toLowerCase();
    const nv = neighborVote(stem, ghostIndex, stemToClass);
    const dv = dmap.get(h.label) || null;
    const hv = confidenceHybridVote(nv, dv, t);
    let predicted = NONE;
    let confidence = 0;
    let source = "abstain";
    if (hv) {
      predicted = hv.predicted;
      source = hv.source;
      if ((hv.source === "neighbor" || hv.source === "neighbor-fallback") && nv && Number.isFinite(nv.confidence)) {
        confidence = nv.confidence;
      } else if (dv && Number.isFinite(dv.confidence)) {
        confidence = dv.confidence;
      }
    }
    out.push({
      engine: h.label,
      predicted,
      truth: h.proposed_wiring,
      confidence: round4(confidence),
      correct: predicted !== NONE && predicted === h.proposed_wiring,
      source,
    });
  }
  return out;
}

/**
 * Score an arm's sample set the SAME way assessHoldout grades the deployed tier: full-holdout
 * AUROC / macro-F1 / Brier / accuracy + the selective deploy point at the production gate.
 * `samples` are the {predicted,truth,confidence,correct} shape. Reuses the harness's OWN
 * metric functions so all arms are directly comparable. Pure.
 *
 * @param {Array} samples
 * @param {object} gates
 * @param {number} minConf  production gate (default GNN_DEFAULTS.minConf)
 */
export function scoreArm(samples, gates = GATE_THRESHOLDS, minConf = GNN_DEFAULTS.minConf) {
  const list = Array.isArray(samples) ? samples : [];
  const n = list.length;
  const scores = list.map((s) => s.confidence);
  const labels = list.map((s) => (s.correct ? 1 : 0));
  const predicted = list.map((s) => s.predicted);
  const truth = list.map((s) => s.truth);
  const covered = list.filter((s) => s.predicted !== NONE).length;
  const metrics = {
    auroc: round4(computeAUROC(scores, labels)),
    macroF1: round4(computeMacroF1(predicted, truth).macroF1),
    brier: round4(computeBrier(scores, labels)),
    accuracy: n > 0 ? round4(labels.reduce((a, b) => a + b, 0) / n) : null,
  };
  const deployPoint = selectiveDeployPoint(list, gates, { productionMinConf: minConf });
  const deployGrade = gradeSelectiveDeploy(metrics, deployPoint, gates);
  return { n, covered, coverage: n > 0 ? round4(covered / n) : null, metrics, selective: { deployPoint, deployGrade } };
}

/**
 * The deploy decision: should the edges lever (neighbour vote / hybrid) be wired into the
 * deployed tier-5? Compares each arm's selective-deploy posture against the deployed
 * direct-embed baseline. The rule (gate-respecting): wire the hybrid ONLY IF it PASSES the
 * selective gate AND beats direct-embed by spanning MORE dispatcher classes at the gate OR
 * higher coverage at the gate -- otherwise the deployed direct-embed stands. Pure.
 *
 * @param {{direct:object, neighbor:object, hybrid:object}} arms  scoreArm results
 * @returns {{wireEdges:boolean, recommendation:string, reasons:string[]}}
 */
export function decideHeadToHead(arms) {
  const a = arms || {};
  const reasons = [];
  const op = (arm) => (arm && arm.selective && arm.selective.deployGrade && arm.selective.deployGrade.operatingPoint) || null;
  const grade = (arm) => (arm && arm.selective && arm.selective.deployGrade) || { pass: false };

  const dOp = op(a.direct), hOp = op(a.hybrid);
  const dPass = grade(a.direct).pass, hPass = grade(a.hybrid).pass;

  if (!a.direct || !a.hybrid) {
    return { wireEdges: false, recommendation: "inconclusive", reasons: ["missing direct or hybrid arm result"] };
  }
  reasons.push(`direct-embed: ${dPass ? "PASSES" : "fails"} selective gate${dOp ? ` (coverage ${dOp.coverage}, ${dOp.classesEmitted}/${dOp.totalClasses} classes)` : ""}`);
  reasons.push(`hybrid@tau: ${hPass ? "PASSES" : "fails"} selective gate${hOp ? ` (coverage ${hOp.coverage}, ${hOp.classesEmitted}/${hOp.totalClasses} classes)` : ""}`);

  if (!hPass) {
    reasons.push("hybrid does not pass the selective gate -> edges do NOT improve the deployed tier.");
    return { wireEdges: false, recommendation: "keep direct-embed (hybrid below gate)", reasons };
  }
  // hybrid passes -- does it BEAT direct-embed's posture?
  const moreClasses = !!(hOp && dOp && Number.isFinite(hOp.classesEmitted) && Number.isFinite(dOp.classesEmitted) && hOp.classesEmitted > dOp.classesEmitted);
  const moreCoverage = !!(hOp && dOp && Number.isFinite(hOp.coverage) && Number.isFinite(dOp.coverage) && hOp.coverage > dOp.coverage);
  const robust = grade(a.hybrid).robustAboveGate === true;
  if ((moreClasses || moreCoverage) && robust) {
    reasons.push(`hybrid beats direct-embed (${moreClasses ? "more classes" : ""}${moreClasses && moreCoverage ? " + " : ""}${moreCoverage ? "more coverage" : ""}) AND is robust above the gate.`);
    return { wireEdges: true, recommendation: "WIRE the confidence-hybrid into tier-5", reasons };
  }
  reasons.push(`hybrid passes but does not beat direct-embed (moreClasses=${moreClasses}, moreCoverage=${moreCoverage}, robust=${robust}).`);
  return { wireEdges: false, recommendation: "keep direct-embed (hybrid not better)", reasons };
}

/** Read a `{ newEdges }` augmentation; [] on failure (fail-soft, R12). */
function readEdges(file) {
  try {
    const obj = JSON.parse(fs.readFileSync(path.join(VIZ_DIR, file), "utf8"));
    if (Array.isArray(obj.newEdges)) return obj.newEdges;
    if (Array.isArray(obj.edges)) return obj.edges;
    return [];
  } catch { return []; }
}

const fmt = (x) => (x == null ? "n/a" : Number(x).toFixed(4));
const pct = (x) => (x == null ? "n/a" : (x * 100).toFixed(1) + "%");

function parseArgs(argv) {
  const out = { tau: DEFAULT_TAU, seeds: [...DEFAULT_SEEDS], json: false, out: null };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--json") out.json = true;
    else if (a === "--tau") { const v = parseFloat(argv[++i]); if (Number.isFinite(v)) out.tau = v; }
    else if (a === "--seeds") { out.seeds = String(argv[++i] || "").split(",").map((s) => parseInt(s, 10)).filter(Number.isInteger); }
    else if (a === "--out") out.out = argv[++i];
  }
  if (!out.seeds.length) out.seeds = [...DEFAULT_SEEDS];
  return out;
}

/** Run the three arms for ONE seed against a loaded graph + prebuilt stemToClass/groups. */
function runSeed(graph, stemToClass, groups, seed, tau) {
  // Arm 1 -- the DEPLOYED direct-embed classifier. runAssessment calls buildHoldout(graph,
  // {seed,...}) internally, so its samples ARE the seeded holdout (label=engine, truth=proposed_wiring).
  const arm1 = runAssessment({ graph, directEmbed: true, directEmbedPath: GHOST_EMB, seed });
  if (arm1.deferred) return { seed, deferred: true, reason: arm1.reason };
  const samples1 = Array.isArray(arm1.samples) ? arm1.samples : [];
  const holdout = samples1.map((s) => ({ label: s.engine, proposed_wiring: s.truth }));
  const directByEngine = new Map(samples1.map((s) => [s.engine, { predicted: s.predicted, confidence: s.confidence }]));

  // Ghost-aware neighbour index over THIS seed's holdout stems (leak-free by construction).
  const ghostStems = new Set(holdout.map((h) => h.label.toLowerCase()));
  const ghostIndex = buildGhostNeighborIndex(groups, ghostStems, stemToClass);
  const cov = ghostNeighborCoverage(ghostIndex, ghostStems);

  const samples2 = neighborArmSamples(holdout, ghostIndex, stemToClass);
  const samples3 = hybridArmSamples(holdout, ghostIndex, stemToClass, directByEngine, tau);

  const direct = scoreArm(samples1);
  const neighbor = scoreArm(samples2);
  const hybrid = scoreArm(samples3);
  const decision = decideHeadToHead({ direct, neighbor, hybrid });
  return {
    seed,
    holdoutN: holdout.length,
    neighborCoverage: { covered: cov.covered, total: cov.total, coverage: round4(cov.coverage), avgNeighbors: round4(cov.avgNeighbors) },
    arms: { direct, neighbor, hybrid },
    decision,
  };
}

function armLine(name, arm) {
  const m = arm.metrics;
  const dg = arm.selective.deployGrade;
  const op = dg.operatingPoint;
  return `  ${name.padEnd(16)} AUROC ${fmt(m.auroc)}  macroF1 ${fmt(m.macroF1)}  Brier ${fmt(m.brier)}  acc ${fmt(m.accuracy)}  cov ${pct(arm.coverage)}\n`
    + `  ${" ".padEnd(16)} selective@tau=${dg.productionGate}: ${dg.verdict}`
    + (op ? ` (cov ${pct(op.coverage)}, ${op.classesEmitted}/${op.totalClasses} classes, Brier ${fmt(op.brier)}, macroF1 ${fmt(op.macroF1)})` : "");
}

export function main(argv) {
  const opts = parseArgs(argv);
  let graph;
  try { graph = readGraphStreaming(GRAPH_PATH); }
  catch (err) { console.error(`measure-ghost-holdout-headtohead: graph load failed -- ${err && err.message ? err.message : err}`); return 1; }

  const stemToClass = buildStemToClass(buildEngineDispatcherMap(DISPATCHERS_DIR));
  if (stemToClass.size === 0) { console.error("measure-ghost-holdout-headtohead: no single-class wired engines -- cannot measure"); return 1; }
  const groups = NEIGHBOR_EDGE_FILES.map((s) => ({ mode: s.mode, edges: readEdges(s.file) }));

  const seedResults = opts.seeds.map((seed) => runSeed(graph, stemToClass, groups, seed, opts.tau));
  const live = seedResults.filter((r) => !r.deferred);

  // Multi-seed aggregate decision: wire ONLY IF the hybrid wins on EVERY seed (no single-seed claim).
  const wireEverySeed = live.length > 0 && live.every((r) => r.decision.wireEdges);
  const aggregate = {
    seeds: opts.seeds,
    liveSeeds: live.length,
    wireEdges: wireEverySeed,
    recommendation: live.length === 0
      ? "inconclusive (all seeds deferred -- pool not loadable)"
      : wireEverySeed
        ? "WIRE the confidence-hybrid into tier-5 (passes + beats direct-embed on every seed)"
        : "KEEP direct-embed -- the edges lever does not beat the deployed classifier on the live ghost holdout",
  };

  const report = {
    generatedAt: new Date().toISOString(),
    tau: opts.tau,
    productionGate: GNN_DEFAULTS.minConf,
    gates: GATE_THRESHOLDS,
    stemToClassSize: stemToClass.size,
    seedResults,
    aggregate,
  };

  if (opts.json) { console.log(JSON.stringify(report, null, 2)); }
  else {
    console.log("measure-ghost-holdout-headtohead -- GNN tier-5 edges-lever DEPLOY DECISION (ghost holdout)");
    console.log(`  tau=${opts.tau}  production gate=${GNN_DEFAULTS.minConf}  gates: AUROC>=${GATE_THRESHOLDS.auroc} macroF1>=${GATE_THRESHOLDS.macroF1} Brier<=${GATE_THRESHOLDS.brier}`);
    console.log(`  wired single-class engines (voters): ${stemToClass.size}`);
    for (const r of seedResults) {
      console.log("");
      if (r.deferred) { console.log(`  seed ${r.seed}: DEFERRED -- ${r.reason}`); continue; }
      const nc = r.neighborCoverage;
      console.log(`  === seed ${r.seed} -- holdoutN ${r.holdoutN}, neighbor-coverage ${nc.covered}/${nc.total} (${pct(nc.coverage)}) avgNbrs ${fmt(nc.avgNeighbors)} ===`);
      console.log(armLine("direct-embed", r.arms.direct));
      console.log(armLine("neighbor-vote", r.arms.neighbor));
      console.log(armLine("hybrid@tau", r.arms.hybrid));
      console.log(`  -> seed decision: ${r.decision.recommendation}`);
    }
    console.log("");
    console.log(`  AGGREGATE (multi-seed): ${aggregate.recommendation}`);
    console.log(`  WIRE EDGES INTO TIER-5: ${aggregate.wireEdges ? "YES" : "NO"}`);
    console.log("");
    console.log("  R12: the hybrid's confidence mixes neighbour purity + cosine (cross-scale AUROC -- read with care);");
    console.log("  the DECISION rests on the selective deploy point (what the production tier emits), required on EVERY seed.");
  }

  if (opts.out) {
    try { fs.writeFileSync(opts.out, JSON.stringify(report, null, 2)); console.log(`\n  wrote ${opts.out}`); }
    catch (err) { console.error(`  could not write --out ${opts.out}: ${err && err.message ? err.message : err}`); return 1; }
  }
  return 0;
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; }
  catch { return false; }
})();
if (__isMain) process.exit(main(process.argv.slice(2)));
