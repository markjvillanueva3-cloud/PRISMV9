#!/usr/bin/env node
/**
 * measure-confidence-hybrid.mjs -- NON-DESTRUCTIVE confidence-aware hybrid sweep for the
 * GNN tier-5 dispatcher classifier (slot:india 2026-06-21). Sharpens the edges lever.
 *
 * WHY: U-GNN-CLASSIFY-HEADTOHEAD (cd3f64fe26, [[reference_gnn_classify_headtohead_2026_06_21]])
 * showed the NAIVE neighbor-first hybrid (use neighbor-vote wherever an engine has edges,
 * else direct-embed) scores 0.7321 at full coverage -- only +0.0100 over direct-embed --
 * even though the neighbor vote is +4.5pt MORE accurate (0.7674) on its covered subset.
 * The naive blend dilutes that edge by trusting EVERY neighbor vote, including low-purity
 * ones. This unit sweeps a purity threshold tau: trust the neighbor vote ONLY when its
 * confidence (vote purity) clears tau, else fall back to direct-embed. The hypothesis:
 * a tau in (0,1) recovers more of the neighbor vote's subset accuracy at full coverage
 * than the naive tau=0 blend.
 *
 * METHOD (leave-one-out over the 3207 single-class codebase-wired engines, real labels,
 * NO 542MB graph -- reuses the .cwref-newemb.jsonl cache + the shipped neighborVote /
 * directEmbedVote): for each tau in the grid, predict every engine by the confidence-aware
 * rule and score accuracy at full coverage. Report the sweep + the best tau vs the naive
 * (tau=0) and pure-direct (tau>1) baselines.
 *
 * LEAK DISCIPLINE: both arms are leave-one-out (the target's own label/vector never enters
 * its own vote -- enforced inside the shipped neighborVote/directEmbedVote). Edges are the
 * leak-free homophilous set (import+schema+test; physics+action-engine excluded).
 *
 * R12: this is the wired-set CEILING/proxy; the deployed UNWIRED-ghost task is edge-sparser.
 * Accuracy is NOT the deploy gate (AUROC/macroF1/Brier on the ghost holdout). The best tau
 * found here is a CANDIDATE to carry into the ghost-holdout head-to-head, not a deploy value.
 *
 * Pure-export contract (for tests): confidenceHybridVote, sweepHybrid, bestThreshold.
 * NON-DESTRUCTIVE: reads cache + edge augmentations + dispatcher sources; writes NOTHING.
 *
 * Run: node scripts/measure-confidence-hybrid.mjs [--k N] [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { buildStemToClass } from "./measure-edge-class-homophily.mjs";
import { buildNeighborIndex, neighborVote, baseRatePrior } from "./measure-neighbor-vote-loo.mjs";
import { l2normalize, directEmbedVote } from "./measure-classify-headtohead.mjs";
import { loadLabeledVectors } from "./analyze-ghost-embed-separability.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const EMB_CACHE = path.join(ROOT, "state", "shared", "nn-graph", ".cwref-newemb.jsonl");

const DEFAULT_K = 10;
// tau grid: 0 == naive neighbor-first hybrid; values in (0,1] gate the neighbor vote by
// purity; a tau > 1 can never be cleared -> pure direct-embed (the lower baseline).
export const TAU_GRID = Object.freeze([0, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.01]);

const NEIGHBOR_EDGE_FILES = Object.freeze([
  { type: "engine_import", file: "engine-import-edges-augmentation.json", mode: "direct" },
  { type: "shared_schema", file: "schema-engine-edges-augmentation.json", mode: "shared" },
  { type: "shared_test", file: "test-coverage-edges-augmentation.json", mode: "shared" },
]);

/**
 * Confidence-aware hybrid prediction for one engine, given its precomputed neighbor vote
 * `nv` and direct-embed vote `dv` (either may be null). Rule: trust the neighbor vote when
 * it exists AND its confidence (vote purity) >= tau; otherwise fall back to the direct-embed
 * vote; if direct-embed is null too, fall back to the neighbor vote (last resort). Returns
 * { predicted, source } or null when neither arm produced a vote. Pure.
 *
 * tau=0 -> always trust a present neighbor vote (the naive hybrid). tau>1 -> never trust the
 * neighbor vote -> pure direct-embed (with neighbor as last resort only when dv is null).
 *
 * @param {{predicted:string,confidence:number}|null} nv
 * @param {{predicted:string,confidence:number}|null} dv
 * @param {number} tau
 */
export function confidenceHybridVote(nv, dv, tau) {
  const t = Number.isFinite(tau) ? tau : 0;
  const nvOk = nv && typeof nv.predicted === "string" && Number.isFinite(nv.confidence);
  const dvOk = dv && typeof dv.predicted === "string";
  if (nvOk && nv.confidence >= t) return { predicted: nv.predicted, source: "neighbor" };
  if (dvOk) return { predicted: dv.predicted, source: "direct" };
  if (nvOk) return { predicted: nv.predicted, source: "neighbor-fallback" };
  return null;
}

/**
 * Sweep the tau grid over the LOO population. Precomputes each engine's neighbor + direct
 * votes ONCE (the votes are tau-independent), then scores every tau against the cached
 * votes -- O(pop * (kNN + |grid|)) rather than re-voting per tau. Returns
 * { population, baseRate, baseClass, rows: [{tau, accuracy, coverage, covered, correct,
 *   neighborUsed}] }. accuracy is over the COVERED set; coverage = covered/population.
 * Pure (votes injectable via opts for tests).
 *
 * @param {Map<string,string>} stemToClass
 * @param {Map<string,Float64Array>} normVecByStem
 * @param {Map<string,Map<string,number>>} neighborIndex
 * @param {object} [opts] { k=DEFAULT_K, taus=TAU_GRID, votesByStem? }
 */
export function sweepHybrid(stemToClass, normVecByStem, neighborIndex, opts = {}) {
  const map = stemToClass instanceof Map ? stemToClass : new Map();
  const vecs = normVecByStem instanceof Map ? normVecByStem : new Map();
  const k = Number.isInteger(opts.k) && opts.k > 0 ? opts.k : DEFAULT_K;
  const taus = Array.isArray(opts.taus) && opts.taus.length ? opts.taus : TAU_GRID;

  // population = classifiable AND embeddable (so direct-embed is always defined).
  const pop = [];
  for (const stem of map.keys()) if (vecs.has(stem)) pop.push(stem);

  // Precompute votes once per engine (tau-independent). Tests can inject votesByStem.
  const votes = opts.votesByStem instanceof Map ? opts.votesByStem : new Map();
  if (!(opts.votesByStem instanceof Map)) {
    for (const stem of pop) {
      votes.set(stem, {
        nv: neighborVote(stem, neighborIndex, map),
        dv: directEmbedVote(stem, vecs, map, k),
        truth: map.get(stem),
      });
    }
  }

  const rows = [];
  for (const tau of taus) {
    let covered = 0;
    let correct = 0;
    let neighborUsed = 0;
    for (const stem of pop) {
      const v = votes.get(stem);
      if (!v) continue;
      const hv = confidenceHybridVote(v.nv, v.dv, tau);
      if (!hv) continue;
      covered++;
      if (hv.source === "neighbor" || hv.source === "neighbor-fallback") neighborUsed++;
      if (hv.predicted === v.truth) correct++;
    }
    rows.push({
      tau,
      covered,
      correct,
      neighborUsed,
      accuracy: covered > 0 ? correct / covered : null,
      coverage: pop.length > 0 ? covered / pop.length : null,
    });
  }

  const classes = pop.map((s) => map.get(s));
  const base = baseRatePrior(classes);
  return { population: pop.length, baseRate: base.accuracy, baseClass: base.topClass, rows };
}

/**
 * Pick the row with the highest accuracy (ties -> the LOWER tau, i.e. more neighbor usage,
 * which is the cheaper-to-trust / higher-coverage-of-the-edge-signal choice). Returns the
 * winning row, or null when no row has a finite accuracy. Pure.
 */
export function bestThreshold(rows) {
  const list = Array.isArray(rows) ? rows.filter((r) => r && Number.isFinite(r.accuracy)) : [];
  if (list.length === 0) return null;
  let best = list[0];
  for (const r of list) {
    if (r.accuracy > best.accuracy || (r.accuracy === best.accuracy && r.tau < best.tau)) best = r;
  }
  return best;
}

/** Read a `{ newEdges }` augmentation; [] on failure (fail-soft, R12). */
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

function parseK(argv) {
  const i = argv.indexOf("--k");
  if (i >= 0 && argv[i + 1] !== undefined) {
    const v = parseInt(argv[i + 1], 10);
    if (Number.isInteger(v) && v > 0) return v;
  }
  return DEFAULT_K;
}

function main() {
  const argv = process.argv.slice(2);
  const asJson = argv.includes("--json");
  const k = parseK(argv);

  const stemToClass = buildStemToClass(buildEngineDispatcherMap(DISPATCHERS_DIR));
  if (stemToClass.size === 0) { console.error("measure-confidence-hybrid: no single-class engines -- cannot measure"); return 1; }

  let embText;
  try { embText = fs.readFileSync(EMB_CACHE, "utf8"); }
  catch { console.error(`measure-confidence-hybrid: embedding cache missing (${path.relative(ROOT, EMB_CACHE)})`); return 1; }
  const rawVecs = loadLabeledVectors(embText);
  const normVecByStem = new Map();
  for (const [name, vec] of rawVecs) {
    const stem = String(name).toLowerCase();
    if (!normVecByStem.has(stem)) normVecByStem.set(stem, l2normalize(vec));
  }
  if (normVecByStem.size === 0) { console.error("measure-confidence-hybrid: no embedding vectors loaded"); return 1; }

  const groups = NEIGHBOR_EDGE_FILES.map((s) => ({ mode: s.mode, edges: readEdges(s.file) }));
  const neighborIndex = buildNeighborIndex(groups, stemToClass);

  const sweep = sweepHybrid(stemToClass, normVecByStem, neighborIndex, { k });
  const naive = sweep.rows.find((r) => r.tau === 0) || null;          // neighbor-first hybrid
  const pureDirect = sweep.rows.find((r) => r.tau > 1) || null;       // tau never cleared
  const best = bestThreshold(sweep.rows);

  // The confidence-aware blend HELPS when the best tau is interior (>0 and <=1) AND beats
  // the naive tau=0 blend by any margin. A best at tau=0 means purity-gating does not help.
  const helps = !!(best && naive && best.accuracy != null && naive.accuracy != null
    && best.tau > 0 && best.tau <= 1 && best.accuracy > naive.accuracy);

  if (asJson) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), k, population: sweep.population,
      baseRate: sweep.baseRate, baseClass: sweep.baseClass, rows: sweep.rows, naive, pureDirect, best, helps }, null, 2));
    return 0;
  }

  console.log(`measure-confidence-hybrid -- tau sweep over ${sweep.population} single-class wired engines (k=${k}, LOO)`);
  console.log(`  base-rate prior (predict ${sweep.baseClass}): ${fmt(sweep.baseRate)}`);
  console.log("");
  console.log("  tau     accuracy   coverage   neighborUsed   note");
  for (const r of sweep.rows) {
    const note = r.tau === 0 ? "naive neighbor-first hybrid" : r.tau > 1 ? "pure direct-embed" : "";
    console.log(`  ${r.tau.toFixed(2)}   ${fmt(r.accuracy).padStart(7)}   ${pct(r.coverage).padStart(7)}   ${String(r.neighborUsed).padStart(8)}     ${note}`);
  }
  console.log("");
  const dNaive = best && naive && best.accuracy != null && naive.accuracy != null ? best.accuracy - naive.accuracy : null;
  const dDirect = best && pureDirect && best.accuracy != null && pureDirect.accuracy != null ? best.accuracy - pureDirect.accuracy : null;
  console.log(`  BEST tau=${best ? best.tau.toFixed(2) : "n/a"} -> accuracy ${fmt(best && best.accuracy)} (coverage ${pct(best && best.coverage)})`);
  console.log(`    vs naive neighbor-first (tau=0) ${fmt(naive && naive.accuracy)}: ${dNaive == null ? "n/a" : (dNaive >= 0 ? "+" : "") + dNaive.toFixed(4)}`);
  console.log(`    vs pure direct-embed           ${fmt(pureDirect && pureDirect.accuracy)}: ${dDirect == null ? "n/a" : (dDirect >= 0 ? "+" : "") + dDirect.toFixed(4)}`);
  console.log("");
  console.log(`  CONFIDENCE-GATING HELPS (best tau interior AND beats naive): ${helps ? "YES" : "NO"}`);
  if (helps) {
    console.log(`    purity-gating the neighbor vote at tau=${best.tau.toFixed(2)} recovers more of its subset accuracy than the`);
    console.log("    naive always-trust blend. Carry this tau as a CANDIDATE into the ghost-holdout head-to-head (the real gate).");
  } else {
    console.log("    purity-gating does not beat the naive neighbor-first blend on this population -- the neighbor vote is");
    console.log("    already net-positive at all purities here, OR direct-embed wins the low-purity cases by a wash. The naive");
    console.log("    hybrid stands; the next lever is the ghost-holdout head-to-head with the real gate (AUROC/macroF1/Brier).");
  }
  console.log("");
  console.log("  R12 CAVEAT: wired-set LOO is a CEILING/proxy for the edge-sparser deployed UNWIRED-ghost task; accuracy is NOT");
  console.log("  the deploy gate. The best tau is a CANDIDATE for the ghost-holdout head-to-head, not a deploy value. (deterministic full-LOO; k-sensitive.)");
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) process.exit(main());
