#!/usr/bin/env node
/**
 * measure-neighbor-vote-loo.mjs -- NON-DESTRUCTIVE leave-one-out (LOO) neighbor-vote
 * dispatcher classification over the codebase-wired engines (slot:india 2026-06-21).
 *
 * WHY: U-GNN-EDGE-CLASS-HOMOPHILY-MEASURE (commit 1580c44d98,
 * [[reference_gnn_edge_class_homophily_2026_06_21]]) PROVED the leak-free engine<->engine
 * edge subgraph is strongly homophilous (engine_import lift 4.63x, shared_test 5.07x,
 * shared_schema 2.09x; shared_physics 1.01x = excluded). The deployed tier-5 is
 * direct-embed cosine k-NN -- it throws away ALL edges. This is the MEASURE-BEFORE-BUILD
 * gate for the full neighbor-vote-vs-direct-embed unit: does a simple COUNT-BASED
 * neighbor vote over those homophilous edges actually predict an engine's dispatcher?
 *
 * METHOD (leave-one-out over the 3208 single-class codebase-wired engines): build an
 * undirected neighbor index from the leak-free edge augmentations -- engine_import
 * (direct eng<->eng) + shared_schema / shared_test (two engines sharing a schema/test
 * are 2-hop neighbours; physics EXCLUDED -- class-agnostic). For each engine with >=1
 * classifiable neighbour, predict its dispatcher by the majority class of its
 * NEIGHBOURS (the engine's own label never enters its own vote -> leave-one-out, no
 * leak). Accuracy over the COVERED set + coverage (covered / total) vs the base-rate
 * prior (always-predict-the-most-common-class). A LOO accuracy far above the base rate
 * at decent coverage green-lights the full head-to-head vs direct-embed; near the base
 * rate or low coverage redirects (the homophily exists but is not exploitable for
 * classification).
 *
 * LEAK DISCIPLINE: count-based vote of NEIGHBOUR labels only; the target's own label is
 * excluded from its vote by construction (it never votes for itself). action-engine
 * edges are not read here (they would leak the dispatcher label -- see the homophily
 * script header). Pure, deterministic (sorted tie-breaks; no RNG).
 *
 * Pure-export contract (for tests): buildNeighborIndex, neighborVote, looEvaluate,
 * baseRatePrior.
 *
 * NON-DESTRUCTIVE: reads the small per-type edge augmentations + dispatcher sources;
 * writes NOTHING.
 *
 * Run: node scripts/measure-neighbor-vote-loo.mjs [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { extractStem, buildStemToClass } from "./measure-edge-class-homophily.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");

/**
 * The leak-free, HOMOPHILOUS engine<->engine edge sources (from the homophily probe).
 * physics (lift 1.01x, class-agnostic) + action-engine (leaks the label) are EXCLUDED.
 * "direct" = both endpoints engines; "shared" = two engines sharing the intermediate.
 */
export const NEIGHBOR_EDGE_FILES = Object.freeze([
  { type: "engine_import", file: "engine-import-edges-augmentation.json", mode: "direct" },
  { type: "shared_schema", file: "schema-engine-edges-augmentation.json", mode: "shared" },
  { type: "shared_test", file: "test-coverage-edges-augmentation.json", mode: "shared" },
]);

/**
 * Build an undirected neighbour index Map<stem, Map<neighbourStem, weight>> over
 * classifiable engines, from a list of { mode, edges } groups. Direct edges link the
 * two engine endpoints; shared edges link every pair of engines that touch the same
 * intermediate node (2-hop). Each (a,b) accumulates `weightPerEdge` (default 1 ->
 * count-based vote); a pair linked by multiple types/intermediates accumulates. The
 * engine's own label is NOT stored here -- it is the classification target. Self-links
 * are skipped. Pure.
 *
 * @param {Array<{mode:string, edges:Array<{from:string,to:string}>}>} groups
 * @param {Map<string,string>} stemToClass  classifiable engines only
 * @param {number} [weightPerEdge=1]
 * @returns {Map<string, Map<string, number>>}
 */
export function buildNeighborIndex(groups, stemToClass, weightPerEdge = 1) {
  const idx = new Map();
  const map = stemToClass instanceof Map ? stemToClass : new Map();
  const w = Number.isFinite(weightPerEdge) && weightPerEdge > 0 ? weightPerEdge : 1;
  const link = (a, b) => {
    if (a === b) return;
    if (!map.has(a) || !map.has(b)) return; // both endpoints must be classifiable
    if (!idx.has(a)) idx.set(a, new Map());
    if (!idx.has(b)) idx.set(b, new Map());
    const ma = idx.get(a);
    const mb = idx.get(b);
    ma.set(b, (ma.get(b) || 0) + w);
    mb.set(a, (mb.get(a) || 0) + w);
  };
  for (const g of Array.isArray(groups) ? groups : []) {
    const edges = g && Array.isArray(g.edges) ? g.edges : [];
    if (g && g.mode === "direct") {
      for (const e of edges) {
        if (!e || typeof e !== "object") continue;
        const a = extractStem(e.from);
        const b = extractStem(e.to);
        if (a && b) link(a, b);
      }
    } else {
      // shared-intermediate: group classifiable engines by the non-engine endpoint,
      // then link every pair under each intermediate.
      const byIntermediate = new Map();
      for (const e of edges) {
        if (!e || typeof e !== "object") continue;
        const fromStem = extractStem(e.from);
        const toStem = extractStem(e.to);
        let engStem;
        let interId;
        if (fromStem && !toStem) { engStem = fromStem; interId = e.to; }
        else if (toStem && !fromStem) { engStem = toStem; interId = e.from; }
        else continue;
        if (typeof interId !== "string" || !interId) continue;
        if (!map.has(engStem)) continue;
        let s = byIntermediate.get(interId);
        if (!s) { s = new Set(); byIntermediate.set(interId, s); }
        s.add(engStem);
      }
      for (const s of byIntermediate.values()) {
        if (s.size < 2) continue;
        const arr = [...s];
        for (let i = 0; i < arr.length; i++) {
          for (let j = i + 1; j < arr.length; j++) link(arr[i], arr[j]);
        }
      }
    }
  }
  return idx;
}

/**
 * Weighted-majority neighbour vote for one engine. Sums neighbour weights by the
 * neighbour's dispatcher class; the top class wins. confidence = topWeight /
 * totalWeight (vote purity in [0,1]). The target's OWN label never enters (it is not
 * its own neighbour) -> leave-one-out, no leak. Ties broken by sorted class name
 * (deterministic). Returns { predicted, confidence, totalWeight, neighborCount } or
 * null when the engine has no classifiable neighbour. Pure.
 *
 * @param {string} stem  the target engine
 * @param {Map<string, Map<string, number>>} neighborIndex
 * @param {Map<string,string>} stemToClass
 * @returns {{predicted:string, confidence:number, totalWeight:number, neighborCount:number}|null}
 */
export function neighborVote(stem, neighborIndex, stemToClass) {
  const nbrs = neighborIndex instanceof Map ? neighborIndex.get(stem) : null;
  const map = stemToClass instanceof Map ? stemToClass : new Map();
  if (!(nbrs instanceof Map) || nbrs.size === 0) return null;
  const byClass = new Map();
  let total = 0;
  let neighborCount = 0;
  for (const [nbr, w] of nbrs) {
    const cls = map.get(nbr);
    if (cls === undefined) continue; // unclassifiable neighbour -> no vote
    byClass.set(cls, (byClass.get(cls) || 0) + w);
    total += w;
    neighborCount++;
  }
  if (total === 0) return null;
  let best = null;
  let bestW = -Infinity;
  for (const cls of [...byClass.keys()].sort()) { // sorted -> deterministic tie-break
    const wsum = byClass.get(cls);
    if (wsum > bestW) { bestW = wsum; best = cls; }
  }
  return { predicted: best, confidence: bestW / total, totalWeight: total, neighborCount };
}

/**
 * Base-rate prior accuracy: the accuracy of always predicting the most-common class.
 * The null model a neighbour-vote classifier must beat. Returns { accuracy, topClass,
 * total } ; accuracy null when the population is empty. Pure.
 *
 * @param {Iterable<string>} classes
 */
export function baseRatePrior(classes) {
  const counts = new Map();
  let total = 0;
  for (const c of classes || []) { counts.set(c, (counts.get(c) || 0) + 1); total++; }
  if (total === 0) return { accuracy: null, topClass: null, total: 0 };
  let topClass = null;
  let topCount = 0;
  for (const c of [...counts.keys()].sort()) {
    const n = counts.get(c);
    if (n > topCount) { topCount = n; topClass = c; }
  }
  return { accuracy: topCount / total, topClass, total };
}

/**
 * Leave-one-out evaluation: predict every classifiable engine's dispatcher by its
 * neighbour vote (its own label excluded), and score against its true label. Returns
 * { total, covered, correct, accuracy, coverage, baseRate, lift, avgNeighbors,
 *   perConfidence }. accuracy is over the COVERED set (engines with >=1 classifiable
 *   neighbour); coverage = covered / total. lift = accuracy / baseRate. Pure.
 *
 * @param {Map<string, Map<string, number>>} neighborIndex
 * @param {Map<string,string>} stemToClass
 */
export function looEvaluate(neighborIndex, stemToClass) {
  const map = stemToClass instanceof Map ? stemToClass : new Map();
  const total = map.size;
  let covered = 0;
  let correct = 0;
  let neighborSum = 0;
  // Confidence-banded accuracy (selective-deploy preview): >=0.7 is the production gate.
  const bands = [0.5, 0.6, 0.7, 0.8];
  const banded = bands.map((tau) => ({ tau, covered: 0, correct: 0 }));
  for (const [stem, trueCls] of map) {
    const v = neighborVote(stem, neighborIndex, map);
    if (!v) continue;
    covered++;
    neighborSum += v.neighborCount;
    const hit = v.predicted === trueCls ? 1 : 0;
    correct += hit;
    for (const b of banded) {
      if (v.confidence >= b.tau) { b.covered++; b.correct += hit; }
    }
  }
  const base = baseRatePrior(map.values());
  const accuracy = covered > 0 ? correct / covered : null;
  const coverage = total > 0 ? covered / total : null;
  const lift = accuracy != null && base.accuracy != null && base.accuracy > 0 ? accuracy / base.accuracy : null;
  return {
    total,
    covered,
    correct,
    accuracy,
    coverage,
    baseRate: base.accuracy,
    baseClass: base.topClass,
    lift,
    avgNeighbors: covered > 0 ? neighborSum / covered : null,
    perConfidence: banded.map((b) => ({
      tau: b.tau,
      coverage: total > 0 ? b.covered / total : null,
      accuracy: b.covered > 0 ? b.correct / b.covered : null,
    })),
  };
}

/** Read a `{ newEdges }` augmentation; [] on any failure (fail-soft, R12). */
function readEdges(file) {
  try {
    const obj = JSON.parse(fs.readFileSync(path.join(VIZ_DIR, file), "utf8"));
    if (Array.isArray(obj.newEdges)) return obj.newEdges;
    if (Array.isArray(obj.edges)) return obj.edges;
    return [];
  } catch {
    return [];
  }
}

const fmt = (x) => (x == null ? "n/a" : Number(x).toFixed(4));
const pct = (x) => (x == null ? "n/a" : (x * 100).toFixed(1) + "%");

function main() {
  const asJson = process.argv.slice(2).includes("--json");

  const stemToClass = buildStemToClass(buildEngineDispatcherMap(DISPATCHERS_DIR));
  if (stemToClass.size === 0) {
    console.error("measure-neighbor-vote-loo: no single-class engines resolved -- cannot measure");
    return 1;
  }

  const groups = NEIGHBOR_EDGE_FILES.map((s) => ({ mode: s.mode, type: s.type, edges: readEdges(s.file) }));
  const neighborIndex = buildNeighborIndex(groups, stemToClass);
  const result = looEvaluate(neighborIndex, stemToClass);

  // GREEN-LIGHT the full neighbor-vote-vs-direct-embed unit when LOO accuracy clears a
  // useful absolute bar AND beats the base-rate prior by a clear margin at decent
  // coverage. Otherwise the homophily is real but not exploitable for classification.
  const greenLight = result.accuracy != null && result.lift != null
    && result.accuracy >= 0.5 && result.lift >= 1.5 && result.coverage != null && result.coverage >= 0.5;

  // R12 CAVEAT (scrutiny arm-B P1->fixed): this LOO ran on the edge-DENSE codebase-WIRED
  // set (real labels). The DEPLOYED task classifies UNWIRED ghosts, which are by definition
  // less integrated -> edge-SPARSER -> the deployed holdout will likely see LOWER coverage
  // (and possibly lower accuracy). This accuracy is a CEILING/PROXY, not the deployed number.
  // It is ALSO not the deploy gate: green-light means "worth building the head-to-head", NOT
  // "deploy-ready" -- the gate is AUROC>=0.78 / macroF1>=0.55 / Brier<=0.15 on the ghost holdout.
  const CAVEAT = "LOO ran on the edge-dense WIRED set (avg "
    + (result.avgNeighbors == null ? "?" : result.avgNeighbors.toFixed(1))
    + " nbrs, " + pct(result.coverage) + " coverage) = a CEILING; unwired ghosts are edge-sparser so the "
    + "deployed holdout will likely score LOWER. accuracy is NOT the deploy gate (AUROC/macroF1/Brier on the ghost holdout).";

  if (asJson) {
    console.log(JSON.stringify({
      generatedAt: new Date().toISOString(),
      singleClassEngines: stemToClass.size,
      edgeTypes: NEIGHBOR_EDGE_FILES.map((s) => s.type),
      result,
      greenLight,
      caveat: CAVEAT,
    }, null, 2));
    return 0;
  }

  console.log("measure-neighbor-vote-loo -- leave-one-out neighbor-vote dispatcher classification");
  console.log("  (leak-free homophilous edges: engine_import + shared_schema + shared_test; physics + action-engine excluded)");
  console.log("");
  console.log(`  single-class engines (total):  ${result.total}`);
  console.log(`  covered (>=1 classifiable nbr): ${result.covered}  (coverage ${pct(result.coverage)})`);
  console.log(`  avg classifiable neighbors:     ${fmt(result.avgNeighbors)}`);
  console.log(`  LOO accuracy (over covered):    ${fmt(result.accuracy)}`);
  console.log(`  base-rate prior (predict ${result.baseClass}): ${fmt(result.baseRate)}`);
  console.log(`  lift over base rate:            ${fmt(result.lift)}x`);
  console.log("");
  console.log("  confidence-banded (selective-deploy preview; tau=0.7 is the production gate):");
  console.log("  tau    coverage   accuracy");
  for (const b of result.perConfidence) {
    console.log(`  ${b.tau.toFixed(2)}   ${pct(b.coverage).padStart(7)}    ${fmt(b.accuracy)}`);
  }
  console.log("");
  console.log(`  GREEN-LIGHT full head-to-head vs direct-embed: ${greenLight ? "YES" : "NO"}`);
  if (greenLight) {
    console.log("    neighbor-vote LOO accuracy clears 0.5 AND >= 1.5x base rate at >= 50% coverage -> the");
    console.log("    homophilous edges ARE exploitable for classification. NEXT: build the full neighbor-vote");
    console.log("    classifier over the deployed unwired-ghost holdout and score it head-to-head vs direct-embed");
    console.log("    (reuse buildHoldout + computeAUROC/macroF1/Brier + selectiveDeployPoint @ GNN_DEFAULTS.minConf).");
  } else {
    console.log("    LOO accuracy/coverage below the green-light bar -> the homophily is real but a count-based");
    console.log("    neighbor vote does not classify well enough here. Re-examine (lift-weighted vote, 1-hop-only,");
    console.log("    or confirm the redirect: ref-pool growth / a different embedding model).");
  }
  console.log("");
  console.log(`  CAVEAT (R12): ${CAVEAT}`);
  return 0;
}

const isMain = (() => {
  try {
    return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
})();
if (isMain) process.exit(main());
