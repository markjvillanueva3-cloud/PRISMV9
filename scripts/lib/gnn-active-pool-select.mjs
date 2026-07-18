#!/usr/bin/env node
/**
 * gnn-active-pool-select.mjs -- GNN active-learning ghost selector
 *   (AI-SYSTEMS-IMPROVEMENTS #4, slot:india, OBSIDIAN-AI-SYNERGY 2026-06-10)
 *
 * WHY THIS EXISTS
 *   The tier-5 ghost-wiring classifier (`seed-ghost-gnn-classify.mjs`) PASSES the
 *   AUROC gate (0.808 >= 0.78) but FAILS macro-F1 (0.439 < 0.55). Root cause, measured
 *   over NN-GRAPH MS1+: the model is LABEL-STARVED, not architecture-starved -- minority
 *   dispatcher classes hold too few reference ghosts for the k-NN label-prop to vote
 *   them well, and macro-F1 is the *mean* of per-class F1 so the worst (minority)
 *   classes drag it down. Calibration is a measured DEAD-END (Murphy miscalibration is
 *   only 0.0197 of the 0.179 Brier -- `nn-graph-calibration-analysis.mjs`). The real
 *   lever is GROWING THE REFERENCE POOL with operator-labeled ghosts. But the operator
 *   cannot label every unlabeled ghost; this module ranks WHICH ghosts to label first
 *   so a small labeling budget buys the largest macro-F1 lift, then emits an operator
 *   worklist that seeds `vault-to-gnn-refpool.mjs` and closes the active-learning loop.
 *
 * METHOD -- pool-based active learning (Settles 2009), class-balanced acquisition:
 *     acquisition(t) = wU*uncertainty(t) + wB*classRarity(t)
 *   then a greedy DIVERSITY re-rank so the top-K is not monopolised by one predicted
 *   class (a budget spent entirely inside one class barely moves the macro mean).
 *     * uncertainty(t) = 1 - confidence(t)            least-confidence sampling; the
 *                          classifier's calibrated vote confidence (0..1).
 *     * classRarity(t) = 1 - refCount[pred]/maxRef    inverse ref-pool frequency over
 *                          the predicted dispatcher. A class with ZERO references
 *                          scores 1.0 -- it is unlearnable until seeded, so it is the
 *                          single most valuable thing to label. This is the term that
 *                          directly targets macro-F1.
 *     * diversity      = per-predicted-class geometric decay gamma during the greedy
 *                          pick (facility-location-lite at the CLASS level). This is the
 *                          honest diversity axis available here: the classifier runs
 *                          EDGELESS (`buildGhostSubgraph` -> edges:[]; embedding k-NN,
 *                          no message passing) and does not return per-node embeddings,
 *                          so there is no cheap pairwise/embedding diversity in this layer.
 *
 *   DELIBERATELY NOT a per-node graph-heterophily skip. The map (#4/#8) mentions
 *   "skip hostile-heterophily nodes", but that belongs to the FUTURE message-passing
 *   encoder (#8): the current direct-embed k-NN has no per-node neighbour
 *   class-agreement to gate on (heterophily here is a dataset-level property). Faking a
 *   per-node skip the substrate cannot compute would be dishonest -- left as a
 *   documented extension hook (`opts.heterophilyOf`) for when #8 lands.
 *
 * INPUTS (all available now -- one 713MB graph load, reused):
 *   * classifyUnknownGhosts(graph,{minConf:0}) -> every unlabeled target with its
 *     calibrated confidence/voteShare (minConf:0 disables the deploy gate so the
 *     LOW-confidence ghosts we want are returned, not filtered).
 *   * graph nodes with confidence >= refMinConf carry `.proposed_wiring` (the assigned
 *     dispatcher class) -> the labelled-pool class distribution for class-balance.
 *
 * OUTPUT: state/shared/nn-graph/active-label-worklist.{json,md} -- a ranked operator
 *   labeling worklist. CONSUMERS: `nn-graph-retrain-lifecycle.mjs` refreshes it
 *   (fail-soft) when the post-retrain eval macro-F1 is below gate; the operator labels
 *   the top-K; `vault-to-gnn-refpool.mjs` ingests the new labels; the next retrain
 *   lifts macro-F1. Active-learning loop closed.
 *
 * PURITY: computeAcquisition / diversityRerank / referenceClassDistribution are
 *   fs-free, network-free, and deterministic -- the unit-testable core. selectActivePool
 *   and the CLI are the thin I/O shell (classifier + graph injectable for tests).
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { isValidDispatcher } from "../seed-ghost-gnn-classify.mjs";
import { streamGraphArray } from "./graph-io.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", ".."); // scripts/lib -> repo root
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const OUT_DIR = path.join(ROOT, "state", "shared", "nn-graph");
const WORKLIST_JSON = path.join(OUT_DIR, "active-label-worklist.json");
const WORKLIST_MD = path.join(OUT_DIR, "active-label-worklist.md");
const GHOST_KIND = "ghost.unwired-engine";

export const ACTIVE_POOL_DEFAULTS = Object.freeze({
  weightUncertainty: 0.6, // wU -- least-confidence acquisition weight
  weightClassRarity: 0.4, // wB -- class-balance (macro-F1) acquisition weight
  diversityDecay: 0.6, // gamma -- same-class score multiplier per prior same-class pick
  topK: 50, // worklist length the operator is asked to label
  refMinConf: 0.8, // confidence at/above which a ghost counts as already-labeled
  rerankPoolCap: 800, // bound the O(n^2) greedy re-rank to the top-N base candidates
  heterophilySkipAbove: 1, // future #8 hook: skip nodes whose heterophily exceeds this (1 => never skip)
});

// -- small numeric guards (repo convention, mirrors seed-ghost-gnn-classify.mjs) --
function finiteOr(v, dflt, { min = -Infinity, max = Infinity } = {}) {
  const n = typeof v === "string" ? Number(v) : v;
  if (!Number.isFinite(n)) return dflt;
  return Math.min(max, Math.max(min, n));
}
const round4 = (x) => Math.round(x * 1e4) / 1e4;
const strLt = (a, b) => (a < b ? -1 : a > b ? 1 : 0); // stable lexical tie-break

/**
 * Count references per dispatcher class (`proposed_wiring`). PURE.
 * @param {Array<{proposed_wiring?:string}>} references
 * @returns {Map<string, number>} class -> reference count
 */
export function referenceClassDistribution(references) {
  const dist = new Map();
  if (!Array.isArray(references)) return dist;
  for (const r of references) {
    const cls = r && typeof r.proposed_wiring === "string" ? r.proposed_wiring : null;
    if (!cls) continue;
    dist.set(cls, (dist.get(cls) || 0) + 1);
  }
  return dist;
}

/**
 * Extract the labelled reference ghosts from a raw graph: kind==ghost.unwired-engine,
 * confidence >= refMinConf, and a VALID dispatcher `proposed_wiring` (the SAME
 * isValidDispatcher gate the classifier's partitionGhosts applies -- not merely a
 * non-empty string, else an UNKNOWN/uppercase target at confidence>=cut would be
 * miscounted as a reference and skew classRarity, the term this module exists to
 * compute). The only divergence from partitionGhosts is its target-label
 * self-exclusion, negligible for the class DISTRIBUTION since targets sit below the
 * confidence cut. PURE.
 */
export function extractReferences(graph, refMinConf = ACTIVE_POOL_DEFAULTS.refMinConf) {
  const out = [];
  const nodes = (graph && Array.isArray(graph.nodes)) ? graph.nodes : [];
  const rmc = finiteOr(refMinConf, ACTIVE_POOL_DEFAULTS.refMinConf, { min: 0, max: 1 });
  for (const n of nodes) {
    if (!n || n.kind !== GHOST_KIND) continue;
    if (!Number.isFinite(n.confidence) || n.confidence < rmc) continue;
    if (typeof n.proposed_wiring !== "string" || !isValidDispatcher(n.proposed_wiring)) continue;
    out.push(n);
  }
  return out;
}

/**
 * Score + rank unlabeled targets by class-balanced uncertainty acquisition. PURE.
 * Malformed entries (no engine name, non-finite confidence) are skipped -- never
 * NaN-propagated into the ranking.
 *
 * @param {Array<{engine:string,dispatcher?:string,confidence:number,voteShare?:number}>} classifications
 * @param {Map<string,number>} refDist  reference class distribution
 * @param {object} [opts]  weight/decay overrides + optional heterophilyOf(engine)->0..1
 * @returns {Array} base-sorted scored items (acquisition desc, engine asc tie-break)
 */
export function computeAcquisition(classifications, refDist, opts = {}) {
  const wU = finiteOr(opts.weightUncertainty, ACTIVE_POOL_DEFAULTS.weightUncertainty, { min: 0, max: 1 });
  const wB = finiteOr(opts.weightClassRarity, ACTIVE_POOL_DEFAULTS.weightClassRarity, { min: 0, max: 1 });
  const heteroSkip = finiteOr(opts.heterophilySkipAbove, ACTIVE_POOL_DEFAULTS.heterophilySkipAbove, { min: 0, max: 1 }); // default 1 => never skip
  const heterophilyOf = typeof opts.heterophilyOf === "function" ? opts.heterophilyOf : null;
  const dist = refDist instanceof Map ? refDist : new Map();
  let maxRef = 0;
  for (const c of dist.values()) if (c > maxRef) maxRef = c;

  const scored = [];
  let skippedMalformed = 0;
  let skippedHetero = 0;
  for (const c of (Array.isArray(classifications) ? classifications : [])) {
    if (!c || typeof c.engine !== "string" || c.engine.length === 0) { skippedMalformed++; continue; }
    const conf = finiteOr(c.confidence, null, { min: 0, max: 1 });
    if (conf === null) { skippedMalformed++; continue; }
    const pred = typeof c.dispatcher === "string" && c.dispatcher.length > 0 ? c.dispatcher : "(unknown)";
    // Optional future #8 extension: skip nodes the message-passing encoder cannot help.
    if (heterophilyOf) {
      const h = finiteOr(heterophilyOf(c.engine), 0, { min: 0, max: 1 });
      if (h > heteroSkip) { skippedHetero++; continue; }
    }
    const uncertainty = round4(1 - conf);
    const refCount = dist.get(pred) || 0;
    // rarity: 1.0 when the class has zero references (unlearnable until seeded);
    // inverse-frequency against the most-represented class otherwise.
    const classRarity = maxRef > 0 ? round4(1 - refCount / maxRef) : 1;
    const acquisition = round4(wU * uncertainty + wB * classRarity);
    scored.push({
      engine: c.engine,
      predictedDispatcher: pred,
      confidence: round4(conf),
      voteShare: Number.isFinite(c.voteShare) ? round4(c.voteShare) : null,
      uncertainty,
      classRefCount: refCount,
      classRarity,
      acquisition,
    });
  }
  scored.sort((a, b) => b.acquisition - a.acquisition || strLt(a.engine, b.engine));
  // stash diagnostics the caller can read (consumed by selectActivePool poolStats)
  scored._skippedMalformed = skippedMalformed;
  scored._skippedHetero = skippedHetero;
  return scored;
}

/**
 * Greedy class-diversity re-rank. Each already-selected same-class pick multiplies a
 * candidate's effective score by gamma^(timesClassPicked), so the worklist spreads
 * across dispatcher classes instead of stacking one. Bounded to the top `rerankPoolCap`
 * base candidates (the greedy is O(n^2)); the remainder keep base order and are
 * appended. PURE + deterministic (eff ties broken by engine name). Does not mutate input.
 */
export function diversityRerank(scored, opts = {}) {
  const gamma = finiteOr(opts.diversityDecay, ACTIVE_POOL_DEFAULTS.diversityDecay, { min: 0, max: 1 });
  const cap = Math.max(0, Math.floor(finiteOr(opts.rerankPoolCap, ACTIVE_POOL_DEFAULTS.rerankPoolCap, { min: 0 })));
  const base = Array.isArray(scored) ? scored : [];
  const head = base.slice(0, cap).map((x) => ({ ...x }));
  const tail = base.slice(cap).map((x) => ({ ...x }));

  const remaining = head;
  const picked = [];
  const classPicks = new Map();
  while (remaining.length > 0) {
    let bestIdx = -1;
    let best = null;
    let bestEff = -Infinity;
    for (let i = 0; i < remaining.length; i++) {
      const r = remaining[i];
      const seen = classPicks.get(r.predictedDispatcher) || 0;
      const eff = r.acquisition * Math.pow(gamma, seen);
      if (eff > bestEff || (eff === bestEff && best && strLt(r.engine, best.engine) < 0)) {
        bestEff = eff;
        bestIdx = i;
        best = r;
      }
    }
    const chosen = remaining.splice(bestIdx, 1)[0];
    chosen.effectiveScore = round4(bestEff);
    picked.push(chosen);
    classPicks.set(chosen.predictedDispatcher, (classPicks.get(chosen.predictedDispatcher) || 0) + 1);
  }
  const merged = picked.concat(tail.map((x) => ({ ...x, effectiveScore: x.acquisition })));
  merged.forEach((m, i) => { m.rank = i + 1; });
  return merged;
}

/**
 * Pure assembly from PRE-COMPUTED classifications + references. PURE (fs/network-free).
 * This is the seam the R15 consumer (`nn-graph-retrain-lifecycle.mjs`) calls after its
 * own post-retrain eval -- it already holds `classifications`/`stats`, so it pays NO
 * second classify pass and NO 713MB reload. `selectActivePool` is the convenience
 * wrapper that classifies first.
 * @param {object} a
 * @param {Array}  a.classifications  classifier output (each {engine,dispatcher,confidence,voteShare})
 * @param {Array}  a.references       labelled reference ghosts (each with .proposed_wiring)
 * @param {object} [a.classifierStats] {targets,classified,mode}
 * @param {boolean}[a.classifierSkipped]
 * @param {string} [a.classifierReason]
 * @returns {{worklist:Array, poolStats:object}}
 */
export function selectFromClassifications({
  classifications, references, classifierStats, classifierSkipped, classifierReason, ...opts
} = {}) {
  const cls = Array.isArray(classifications) ? classifications : [];
  const refList = Array.isArray(references) ? references : [];
  const refDist = referenceClassDistribution(refList);

  const scored = computeAcquisition(cls, refDist, opts);
  const worklist = diversityRerank(scored, opts);

  const targets = Number.isFinite(classifierStats?.targets) ? classifierStats.targets : cls.length;
  const classified = Number.isFinite(classifierStats?.classified) ? classifierStats.classified : cls.length;
  return {
    worklist,
    poolStats: {
      unlabeledTargets: targets,
      voted: classified,
      // targets the classifier returned no vote for (no scorable reference neighbour /
      // no embedding). Under the minConf:0 invariant selectActivePool enforces this is
      // exactly the label-starved no-neighbour count; a caller passing stats from a
      // GATED run should read it as "targets without a returned vote".
      unvoted: Math.max(0, targets - classified),
      scored: scored.length,
      skippedMalformed: scored._skippedMalformed || 0,
      skippedHeterophily: scored._skippedHetero || 0,
      references: refList.length,
      labelledClasses: refDist.size,
      classDistribution: Object.fromEntries([...refDist.entries()].sort((a, b) => b[1] - a[1])),
      classifierMode: classifierStats?.mode ?? null,
      classifierSkipped: classifierSkipped === true,
      classifierReason: classifierReason ?? null,
    },
  };
}

/**
 * Full selection over a loaded graph: classify (minConf:0 so low-confidence targets
 * survive) then assemble. The classifier is injectable so the 713MB graph load and the
 * real model are mocked in tests. Callers that ALREADY hold classifications should use
 * `selectFromClassifications` directly to avoid a redundant classify pass.
 * @returns {{worklist:Array, poolStats:object}}
 */
export function selectActivePool({ graph, classifyImpl, refMinConf, ...opts } = {}) {
  const rmc = finiteOr(refMinConf, ACTIVE_POOL_DEFAULTS.refMinConf, { min: 0, max: 1 });
  if (typeof classifyImpl !== "function") {
    throw new TypeError("selectActivePool: classifyImpl(graph, opts) is required");
  }
  // minConf:0 -> the deploy gate is disabled so LOW-confidence (high-acquisition)
  // targets are returned with their real confidence, not filtered out.
  const res = classifyImpl(graph, { ...opts, minConf: 0, refMinConf: rmc }) || {};
  const references = extractReferences(graph, rmc);
  return selectFromClassifications({
    classifications: res.classifications,
    references,
    classifierStats: res.stats,
    classifierSkipped: res.skipped === true,
    classifierReason: res.reason,
    ...opts,
  });
}

// -------------------------------- report writers --------------------------------
function renderWorklistMarkdown(result, meta) {
  const { worklist, poolStats } = result;
  const topK = meta.topK;
  const top = worklist.slice(0, topK);
  const lines = [];
  lines.push(`# GNN active-learning label worklist`);
  lines.push("");
  lines.push(`> Generated by \`scripts/lib/gnn-active-pool-select.mjs\` (AI-SYSTEMS #4, slot:india).`);
  lines.push(`> Label the top-${topK} ghosts below (assign the correct dispatcher) and feed them to`);
  lines.push(`> \`scripts/vault-to-gnn-refpool.mjs\` -> the next \`nn-graph-retrain-lifecycle\` run lifts macro-F1.`);
  lines.push(`> Acquisition = ${meta.weightUncertainty}*uncertainty + ${meta.weightClassRarity}*classRarity, greedy class-diversity re-rank (gamma=${meta.diversityDecay}).`);
  lines.push("");
  lines.push(`- generatedAt: ${meta.generatedAt}`);
  lines.push(`- unlabeled targets: **${poolStats.unlabeledTargets}** (voted ${poolStats.voted}, unvoted ${poolStats.unvoted})`);
  lines.push(`- reference pool: **${poolStats.references}** labelled ghosts across **${poolStats.labelledClasses}** dispatcher classes`);
  if (poolStats.classifierSkipped) {
    lines.push(`- WARNING classifier skipped: \`${poolStats.classifierReason}\` (worklist may be empty -- check direct-embed vectors / checkpoint)`);
  }
  lines.push("");
  lines.push(`| # | engine (ghost) | predicted dispatcher | conf | uncertainty | class refs | rarity | acquisition |`);
  lines.push(`|--:|----------------|----------------------|-----:|------------:|-----------:|-------:|------------:|`);
  for (const w of top) {
    lines.push(`| ${w.rank} | \`${w.engine}\` | ${w.predictedDispatcher} | ${w.confidence} | ${w.uncertainty} | ${w.classRefCount} | ${w.classRarity} | ${w.acquisition} |`);
  }
  lines.push("");
  // surface the most label-starved classes (lowest ref counts) as the macro-F1 levers
  const starved = Object.entries(poolStats.classDistribution)
    .sort((a, b) => a[1] - b[1]).slice(0, 8)
    .map(([c, n]) => `${c}(${n})`).join(", ");
  lines.push(`**Most label-starved classes (lowest ref counts -- biggest macro-F1 levers):** ${starved || "n/a"}`);
  lines.push("");
  return lines.join("\n");
}

export function writeWorklist(result, opts = {}) {
  const writeFileImpl = opts.writeFileImpl || fs.writeFileSync;
  const mkdirImpl = opts.mkdirImpl || ((d) => fs.mkdirSync(d, { recursive: true }));
  const outJson = opts.jsonPath || WORKLIST_JSON;
  const outMd = opts.mdPath || WORKLIST_MD;
  const topK = Math.max(1, Math.floor(finiteOr(opts.topK, ACTIVE_POOL_DEFAULTS.topK, { min: 1 })));
  const meta = {
    generatedAt: opts.generatedAt || new Date().toISOString(),
    topK,
    weightUncertainty: finiteOr(opts.weightUncertainty, ACTIVE_POOL_DEFAULTS.weightUncertainty, { min: 0, max: 1 }),
    weightClassRarity: finiteOr(opts.weightClassRarity, ACTIVE_POOL_DEFAULTS.weightClassRarity, { min: 0, max: 1 }),
    diversityDecay: finiteOr(opts.diversityDecay, ACTIVE_POOL_DEFAULTS.diversityDecay, { min: 0, max: 1 }),
  };
  mkdirImpl(path.dirname(outJson));
  const json = {
    schemaVersion: "1.0.0",
    ...meta,
    poolStats: result.poolStats,
    worklist: result.worklist.slice(0, topK),
  };
  writeFileImpl(outJson, JSON.stringify(json, null, 2));
  writeFileImpl(outMd, renderWorklistMarkdown(result, meta));
  return { jsonPath: outJson, mdPath: outMd, written: Math.min(topK, result.worklist.length) };
}

// ----------------------------------- CLI -----------------------------------
function parseArgs(argv) {
  const out = { graphPath: GRAPH_PATH, topK: ACTIVE_POOL_DEFAULTS.topK, json: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--graph") out.graphPath = argv[++i];
    else if (a === "--top" || a === "--topK") out.topK = finiteOr(argv[++i], ACTIVE_POOL_DEFAULTS.topK, { min: 1 });
    else if (a === "--wU") out.weightUncertainty = finiteOr(argv[++i], undefined, { min: 0, max: 1 });
    else if (a === "--wB") out.weightClassRarity = finiteOr(argv[++i], undefined, { min: 0, max: 1 });
    else if (a === "--gamma") out.diversityDecay = finiteOr(argv[++i], undefined, { min: 0, max: 1 });
    else if (a === "--refMinConf") out.refMinConf = finiteOr(argv[++i], undefined, { min: 0, max: 1 });
    else if (a === "--model-mode") out.directEmbed = false; // opt OUT of the production direct-embed path
    else if (a === "--direct-embed") out.directEmbed = true;
    else if (a === "--json") out.json = true;
    else if (a === "--help" || a === "-h") out.help = true;
  }
  return out;
}

async function main() {
  const opts = parseArgs(process.argv.slice(2));
  if (opts.help) {
    process.stdout.write(
      `gnn-active-pool-select -- rank unlabeled ghosts for operator labeling (active learning)\n\n` +
      `  node scripts/lib/gnn-active-pool-select.mjs [--top 50] [--wU 0.6] [--wB 0.4] [--gamma 0.6] [--json]\n\n` +
      `Writes ${path.relative(ROOT, WORKLIST_JSON)} + .md. Attacks the macro-F1 gate by\n` +
      `prioritising high-uncertainty ghosts in label-starved dispatcher classes.\n`,
    );
    return 0;
  }
  // The full system graph is >512MB (exceeds V8's max string), so JSON.parse(readFileSync
  // utf8) throws "Cannot create a string longer than 0x1fffffe8". Stream ONLY the
  // ghost.unwired-engine nodes (a small subset) via the canonical buffer reader
  // (`streamGraphArray` reads a Buffer + parses each element individually). The
  // classifier's partitionGhosts looks at no other node kind, so a ghost-only graph is
  // a complete input for both targets and references.
  const ghosts = [];
  let totalNodes = 0;
  try {
    totalNodes = streamGraphArray(opts.graphPath, "nodes", (n) => {
      if (n && n.kind === GHOST_KIND) ghosts.push(n);
    });
  } catch (err) {
    process.stderr.write(`[active-pool] cannot stream graph ${opts.graphPath}: ${err?.message || err}\n`);
    return 2;
  }
  if (totalNodes === 0) {
    process.stderr.write(`[active-pool] no nodes streamed from ${opts.graphPath} (missing/empty/no "nodes" array)\n`);
    return 2;
  }
  process.stderr.write(`[active-pool] streamed ${ghosts.length} ghost.unwired-engine nodes of ${totalNodes} total\n`);
  const graph = { nodes: ghosts };
  // Default to the PRODUCTION-validated direct-embed path (raw-768d nomic cosine); the
  // model path collapses to a uniform constant vote (the AUROC-0.5 root cause that
  // direct-embed fixed). `--model-mode` opts out; an explicit flag/env still wins.
  if (opts.directEmbed === undefined) opts.directEmbed = true;
  const { classifyUnknownGhosts } = await import("../seed-ghost-gnn-classify.mjs");
  const result = selectActivePool({ graph, classifyImpl: classifyUnknownGhosts, ...opts });
  const out = writeWorklist(result, opts);
  if (opts.json) {
    process.stdout.write(JSON.stringify({ ...out, poolStats: result.poolStats }, null, 2) + "\n");
  } else {
    const ps = result.poolStats;
    process.stdout.write(
      `[active-pool] ${ps.scored} scored / ${ps.unlabeledTargets} unlabeled * ` +
      `${ps.references} refs / ${ps.labelledClasses} classes * ` +
      `mode=${ps.classifierMode}${ps.classifierSkipped ? ` SKIPPED(${ps.classifierReason})` : ""}\n` +
      `[active-pool] wrote top-${out.written} worklist -> ${path.relative(ROOT, out.jsonPath)} (+ .md)\n`,
    );
    const top5 = result.worklist.slice(0, 5)
      .map((w) => `  #${w.rank} ${w.engine} -> ${w.predictedDispatcher} (acq ${w.acquisition}, conf ${w.confidence})`)
      .join("\n");
    if (top5) process.stdout.write(top5 + "\n");
  }
  return 0;
}

// run only when invoked directly (not when imported by tests)
const invokedDirectly = (() => {
  try { return process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url); }
  catch { return false; }
})();
if (invokedDirectly) {
  main().then((code) => process.exit(code)).catch((err) => {
    process.stderr.write(`[active-pool] fatal: ${err?.stack || err}\n`);
    process.exit(1);
  });
}
