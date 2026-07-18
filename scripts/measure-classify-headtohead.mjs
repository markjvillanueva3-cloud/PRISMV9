#!/usr/bin/env node
/**
 * measure-classify-headtohead.mjs -- NON-DESTRUCTIVE head-to-head of the GNN tier-5
 * dispatcher classifiers (slot:india 2026-06-21). Completes the edges-lever arc.
 *
 * WHY: the deployed tier-5 is DIRECT-EMBED cosine k-NN over the node embeddings (it uses
 * NO edges). U-GNN-EDGE-CLASS-HOMOPHILY-MEASURE (1580c44d98) proved the leak-free
 * engine<->engine edges are homophilous (import 4.63x), and U-GNN-NEIGHBOR-VOTE-LOO
 * (0a2c081f04) proved a count-based neighbor vote over them classifies at 0.767 acc /
 * 2.88x base-rate. This unit runs all three classifiers HEAD-TO-HEAD on the SAME
 * leave-one-out population (the 3207 single-class codebase-wired engines, real labels)
 * so the comparison is apples-to-apples:
 *   - direct-embed  : cosine k-NN over the .cwref-newemb.jsonl vectors (the deployed mechanism)
 *   - neighbor-vote : count-vote over the homophilous leak-free edges (import+schema+test)
 *   - hybrid        : neighbor-vote where the engine has edges, direct-embed fallback otherwise
 * It answers: do the edges ADD value over direct-embed (does the hybrid beat direct-embed at
 * full coverage)? -- the decision gate for wiring a hybrid into the deployed tier-5.
 *
 * NO 542MB GRAPH: this runs on the codebase-wired set (real labels) using the existing
 * embedding cache, NOT the deployed unwired-ghost holdout. R12 PROXY CAVEAT: the deployed
 * task classifies UNWIRED ghosts (edge-sparser, ~62.5% edge-coverage measured); this
 * wired-set LOO is a CEILING/proxy and accuracy is NOT the deploy gate (AUROC/macroF1/Brier
 * on the ghost holdout via nn-graph-eval.mjs). The relative ORDERING of the three
 * classifiers, however, transfers: if the hybrid beats direct-embed here, the edges add
 * signal direct-embed lacks -- worth a full ghost-holdout head-to-head + retrain decision.
 *
 * LEAK DISCIPLINE: both arms are leave-one-out -- the target's own label/vector never
 * enters its own vote. Edges are leak-free (import/schema/test; physics+action-engine
 * excluded). Pure-export contract: cosine, l2normalize, directEmbedVote, headToHead.
 *
 * NON-DESTRUCTIVE: reads the embedding cache + edge augmentations + dispatcher sources;
 * writes NOTHING.
 *
 * Run: node scripts/measure-classify-headtohead.mjs [--k N] [--json]
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildEngineDispatcherMap } from "./lib/wired-engine-mapper.mjs";
import { buildStemToClass } from "./measure-edge-class-homophily.mjs";
import { buildNeighborIndex, neighborVote, baseRatePrior } from "./measure-neighbor-vote-loo.mjs";
import { loadLabeledVectors } from "./analyze-ghost-embed-separability.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const VIZ_DIR = path.join(ROOT, "state", "shared", "system-viz");
const DISPATCHERS_DIR = path.join(ROOT, "mcp-server", "src", "tools", "dispatchers");
const EMB_CACHE = path.join(ROOT, "state", "shared", "nn-graph", ".cwref-newemb.jsonl");

const DEFAULT_K = 10; // k-NN neighbors for the direct-embed vote
// Max coverage difference for the hybrid-vs-direct accuracy comparison to be like-for-like.
const COVERAGE_EPS = 0.02;

// Same homophilous leak-free edge set as the neighbor-vote probe.
const NEIGHBOR_EDGE_FILES = Object.freeze([
  { type: "engine_import", file: "engine-import-edges-augmentation.json", mode: "direct" },
  { type: "shared_schema", file: "schema-engine-edges-augmentation.json", mode: "shared" },
  { type: "shared_test", file: "test-coverage-edges-augmentation.json", mode: "shared" },
]);

/** L2-normalize a numeric vector into a Float64Array (zero/invalid -> zero vector). Pure. */
export function l2normalize(vec) {
  const arr = Array.isArray(vec) || ArrayBuffer.isView(vec) ? vec : [];
  const out = new Float64Array(arr.length);
  let norm = 0;
  for (let i = 0; i < arr.length; i++) {
    const x = arr[i];
    if (Number.isFinite(x)) { out[i] = x; norm += x * x; }
  }
  norm = Math.sqrt(norm);
  if (norm === 0) return out; // all-zero -> unchanged zero vector (cosine 0 with anything)
  for (let i = 0; i < out.length; i++) out[i] /= norm;
  return out;
}

/**
 * Cosine similarity of two vectors. Mismatched lengths use the shorter; a zero-norm
 * vector yields 0 (never NaN). Returns a value in [-1,1]. Pure.
 */
export function cosine(a, b) {
  const va = Array.isArray(a) || ArrayBuffer.isView(a) ? a : [];
  const vb = Array.isArray(b) || ArrayBuffer.isView(b) ? b : [];
  const n = Math.min(va.length, vb.length);
  let dot = 0;
  let na = 0;
  let nb = 0;
  for (let i = 0; i < n; i++) {
    const x = va[i];
    const y = vb[i];
    if (!Number.isFinite(x) || !Number.isFinite(y)) continue;
    dot += x * y;
    na += x * x;
    nb += y * y;
  }
  if (na === 0 || nb === 0) return 0;
  return dot / (Math.sqrt(na) * Math.sqrt(nb));
}

/**
 * Direct-embed leave-one-out vote for one engine: cosine k-NN over all OTHER classifiable
 * engines' (pre-normalized) vectors, weighted-majority vote of the top-k neighbors' classes
 * (cosine weight, negatives clamped to 0), confidence = topWeight/totalWeight. The target's
 * own vector is excluded (LOO). Deterministic sorted tie-break. Returns
 * { predicted, confidence, neighborCount } or null when no classifiable neighbor / zero
 * total weight. `normVecByStem` must already be L2-normalized so cosine == dot. Pure.
 *
 * @param {string} stem
 * @param {Map<string, Float64Array>} normVecByStem  pre-normalized vectors
 * @param {Map<string, string>} stemToClass
 * @param {number} [k=DEFAULT_K]
 */
export function directEmbedVote(stem, normVecByStem, stemToClass, k = DEFAULT_K) {
  const map = stemToClass instanceof Map ? stemToClass : new Map();
  const vecs = normVecByStem instanceof Map ? normVecByStem : new Map();
  const self = vecs.get(stem);
  if (!self) return null;
  const kInt = Number.isInteger(k) && k > 0 ? k : DEFAULT_K;
  const sims = [];
  for (const [other, vec] of vecs) {
    if (other === stem || !map.has(other)) continue;
    sims.push([other, cosine(self, vec)]);
  }
  if (sims.length === 0) return null;
  // Top-k by cosine desc; tie on cosine broken by stem name for determinism.
  sims.sort((a, b) => (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const top = sims.slice(0, kInt);
  const byClass = new Map();
  let total = 0;
  for (const [other, sim] of top) {
    const w = Math.max(0, sim);
    if (w === 0) continue;
    const cls = map.get(other);
    byClass.set(cls, (byClass.get(cls) || 0) + w);
    total += w;
  }
  if (total === 0) return null;
  let best = null;
  let bestW = -Infinity;
  for (const cls of [...byClass.keys()].sort()) {
    const wsum = byClass.get(cls);
    if (wsum > bestW) { bestW = wsum; best = cls; }
  }
  return { predicted: best, confidence: bestW / total, neighborCount: top.length };
}

/** Accuracy/coverage record from per-engine hit/covered tallies. */
function tally(total, covered, correct) {
  return {
    total,
    covered,
    correct,
    accuracy: covered > 0 ? correct / covered : null,
    coverage: total > 0 ? covered / total : null,
  };
}

/**
 * Head-to-head leave-one-out over the common population (engines that are single-class
 * AND have an embedding vector). Computes neighbor-vote, direct-embed, and hybrid
 * predictions per engine and scores each against the true label. The hybrid uses the
 * neighbor vote when the engine has >=1 classifiable edge-neighbor, else the direct-embed
 * vote. Returns { population, baseRate, baseClass, neighbor, direct, hybrid, agreement }.
 * Pure (no I/O).
 *
 * @param {Map<string,string>} stemToClass
 * @param {Map<string,Float64Array>} normVecByStem
 * @param {Map<string,Map<string,number>>} neighborIndex
 * @param {number} [k=DEFAULT_K]
 */
export function headToHead(stemToClass, normVecByStem, neighborIndex, k = DEFAULT_K) {
  const map = stemToClass instanceof Map ? stemToClass : new Map();
  const vecs = normVecByStem instanceof Map ? normVecByStem : new Map();
  // Common population: classifiable AND embeddable (both classifiers are defined).
  const pop = [];
  for (const stem of map.keys()) if (vecs.has(stem)) pop.push(stem);

  let nCov = 0, nCor = 0;          // neighbor-vote
  let dCov = 0, dCor = 0;          // direct-embed
  let hCov = 0, hCor = 0;          // hybrid
  let agreeBoth = 0, agreeCount = 0; // where both fire: do they agree?
  let hybridUsedNeighbor = 0;
  const classes = [];

  for (const stem of pop) {
    const trueCls = map.get(stem);
    classes.push(trueCls);
    const nv = neighborVote(stem, neighborIndex, map);
    const dv = directEmbedVote(stem, vecs, map, k);

    if (nv) { nCov++; if (nv.predicted === trueCls) nCor++; }
    if (dv) { dCov++; if (dv.predicted === trueCls) dCor++; }

    // hybrid: prefer neighbor-vote (the higher-precision arm) where it fires.
    const hv = nv || dv;
    if (hv) {
      hCov++;
      if (hv.predicted === trueCls) hCor++;
      if (nv) hybridUsedNeighbor++;
    }
    // agreement (informational): where BOTH fire, how often do they pick the same class?
    if (nv && dv) { agreeCount++; if (nv.predicted === dv.predicted) agreeBoth++; }
  }

  const base = baseRatePrior(classes);
  return {
    population: pop.length,
    baseRate: base.accuracy,
    baseClass: base.topClass,
    neighbor: tally(pop.length, nCov, nCor),
    direct: tally(pop.length, dCov, dCor),
    hybrid: tally(pop.length, hCov, hCor),
    agreement: {
      bothFired: agreeCount,
      agreed: agreeBoth,
      agreeRate: agreeCount > 0 ? agreeBoth / agreeCount : null,
      hybridUsedNeighbor,
    },
  };
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
  if (stemToClass.size === 0) { console.error("measure-classify-headtohead: no single-class engines -- cannot measure"); return 1; }

  let embText;
  try { embText = fs.readFileSync(EMB_CACHE, "utf8"); }
  catch { console.error(`measure-classify-headtohead: embedding cache missing (${path.relative(ROOT, EMB_CACHE)}); run measure-codebase-wired-refpool-auroc.mjs first`); return 1; }
  const rawVecs = loadLabeledVectors(embText); // Map<PascalName, vec>
  // Re-key to lowercased stem (matches edge endpoints + stemToClass) + L2-normalize.
  const normVecByStem = new Map();
  for (const [name, vec] of rawVecs) {
    const stem = String(name).toLowerCase();
    if (!normVecByStem.has(stem)) normVecByStem.set(stem, l2normalize(vec));
  }
  if (normVecByStem.size === 0) { console.error("measure-classify-headtohead: no embedding vectors loaded"); return 1; }

  const groups = NEIGHBOR_EDGE_FILES.map((s) => ({ mode: s.mode, edges: readEdges(s.file) }));
  const neighborIndex = buildNeighborIndex(groups, stemToClass);

  const r = headToHead(stemToClass, normVecByStem, neighborIndex, k);

  // Decision: do the edges ADD value? EDGES-ADD-VALUE fires when the hybrid beats
  // direct-embed by ANY positive margin at comparable coverage (within COVERAGE_EPS) --
  // a DIRECTIONAL signal that the homophilous edges classify the edge-covered subset
  // better than cosine k-NN, NOT a magnitude claim. The margin is surfaced explicitly
  // below (it is typically sub-1pt and k-sensitive) so a reader never mistakes the
  // directional YES for a strong result. The deploy decision is a separate ghost-holdout
  // gate (AUROC/macroF1/Brier), never this accuracy delta.
  const dA = r.direct.accuracy, hA = r.hybrid.accuracy, nA = r.neighbor.accuracy;
  const margin = hA != null && dA != null ? hA - dA : null;
  // Apples-to-apples guard (scrutiny arm-A P2): the margin only compares like-for-like
  // when the hybrid does not cover MORE engines than direct-embed (a degenerate-vector
  // engine that neighbor-vote covers but direct cannot would make hA/dA span different
  // populations). On the live run both are full-coverage; flag if a future cache change
  // breaks that so the delta is never read as same-population when it is not.
  const sameCoverage = r.hybrid.coverage != null && r.direct.coverage != null
    && Math.abs(r.hybrid.coverage - r.direct.coverage) <= COVERAGE_EPS;
  const edgesAddValue = margin != null && margin > 0 && sameCoverage;

  if (asJson) {
    console.log(JSON.stringify({ generatedAt: new Date().toISOString(), k, result: r, edgesAddValue }, null, 2));
    return 0;
  }

  console.log(`measure-classify-headtohead -- LOO over ${r.population} single-class wired engines (k=${k})`);
  console.log(`  base-rate prior (predict ${r.baseClass}): ${fmt(r.baseRate)}`);
  console.log("");
  console.log("  classifier      coverage   accuracy   covered/total");
  for (const [name, t] of [["direct-embed", r.direct], ["neighbor-vote", r.neighbor], ["hybrid", r.hybrid]]) {
    console.log(`  ${name.padEnd(14)} ${pct(t.coverage).padStart(8)}   ${fmt(t.accuracy).padStart(7)}   ${t.covered}/${t.total}`);
  }
  console.log("");
  console.log(`  agreement (where both fire): ${pct(r.agreement.agreeRate)} agree (${r.agreement.agreed}/${r.agreement.bothFired}); hybrid used neighbor-vote on ${r.agreement.hybridUsedNeighbor}`);
  console.log("");
  console.log(`  EDGES-ADD-VALUE (hybrid beats direct-embed by ANY margin at comparable coverage): ${edgesAddValue ? "YES" : "NO"}`);
  console.log(`    margin = hybrid ${fmt(hA)} - direct-embed ${fmt(dA)} = ${margin == null ? "n/a" : (margin >= 0 ? "+" : "") + margin.toFixed(4)}  (neighbor-vote ${fmt(nA)} on its ${pct(r.neighbor.coverage)} subset)`);
  if (!sameCoverage) {
    console.log(`    ! coverage mismatch: hybrid ${pct(r.hybrid.coverage)} vs direct ${pct(r.direct.coverage)} (> ${COVERAGE_EPS}) -- the accuracy delta is NOT like-for-like; interpret with care.`);
  }
  if (edgesAddValue) {
    console.log("    DIRECTIONAL yes: the homophilous edges classify the edge-covered subset better than cosine k-NN.");
    console.log("    The margin is MODEST and k-sensitive (full-LOO, deterministic, no seed variance) -- NOT a strong/deploy-ready result.");
    console.log("    NEXT: (a) a confidence-aware hybrid (override direct only when neighbor purity is high -- both arms emit confidence)");
    console.log("    likely beats the naive neighbor-first blend; (b) run this head-to-head on the deployed unwired-ghost holdout");
    console.log("    (nn-graph-eval buildHoldout + AUROC/macroF1/Brier) before any deploy decision -- accuracy here is NOT the gate.");
  } else {
    console.log("    on this population the edges do not beat direct-embed at comparable coverage; direct-embed cosine k-NN may");
    console.log("    already capture the same signal. Re-examine k / a confidence-aware blend / the lift-weighted vote.");
  }
  console.log("");
  console.log(`  R12 CAVEAT: wired-set LOO is a CEILING/proxy for the deployed UNWIRED-ghost task (edge-sparser, ~62.5% edge-cov);`);
  console.log("  the classifier ORDERING transfers but absolute numbers will be lower; accuracy is NOT the deploy gate (AUROC/macroF1/Brier).");
  return 0;
}

const isMain = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (isMain) process.exit(main());
