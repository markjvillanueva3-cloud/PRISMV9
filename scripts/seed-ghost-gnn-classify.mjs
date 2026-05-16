#!/usr/bin/env node
/**
 * seed-ghost-gnn-classify.mjs — NN-GRAPH-MS0 / U-NNG-INFERENCE-FIFTH-TIER (U6)
 *
 * The 5th tier of the wiring-inference cascade. The first four tiers —
 * keyword -> expanded-keyword -> sibling-prefix -> LLM (seed-ghost-llm-classify)
 * — classify UNKNOWN ghost.unwired-engine nodes into a dispatcher. This tier
 * adds a GraphSAGE-derived classifier and runs it *before* the LLM tier: any
 * UNKNOWN it resolves with confidence >= PRISM_NNG_MIN_CONF is pre-empted out
 * of the (slow, ~0.55-confidence) Ollama batch.
 *
 * Method — GraphSAGE-embedding k-NN label propagation:
 *   1. Load a checkpoint trained by U4 (graphsage-train-pipeline). No checkpoint
 *      => graceful skip; the LLM tier handles every engine exactly as today.
 *   2. The reference set is the cascade's own high-confidence output: ghost
 *      engines whose proposed_wiring is a real prism_* dispatcher AND whose
 *      confidence >= PRISM_NNG_REF_MIN_CONF (the keyword tier, ~0.85).
 *   3. Embed an edgeless subgraph of {targets + references} with the frozen
 *      model (unwired engines are graph-isolated — they carry one proposed-wire
 *      edge and nothing else — so the honest signal is the model's learned
 *      transform of each node's symbolic features, not message passing).
 *   4. For each UNKNOWN target, score the link to every reference with the
 *      model's link head, take the top-K, and take a confidence-weighted vote
 *      of their dispatchers. The winning vote share is the prediction
 *      confidence (capped — a propagated label is never as hard as a keyword
 *      hit).
 *
 * Hybrid is the floor, the GNN is the ceiling: this tier only ever *augments*.
 * PRISM_NNG_DISABLE=1 reverts behaviour to the 4-tier cascade exactly.
 *
 * Pure + deterministic given a fixed graph + checkpoint. Consistent with the
 * NN-GRAPH-MS0 scripts/lib/*.mjs + node:test convention; this file lives in
 * scripts/ alongside its sibling seed-ghost-llm-classify.mjs.
 *
 * Usage:
 *   node scripts/seed-ghost-gnn-classify.mjs --dry-run
 *   node scripts/seed-ghost-gnn-classify.mjs --apply
 *   node scripts/seed-ghost-gnn-classify.mjs --apply --min-conf 0.75 --limit 50
 *   node scripts/seed-ghost-gnn-classify.mjs --checkpoint path/to/checkpoint.json
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadPredictor, embedGraph, scoreLink } from "./lib/graphsage-predictor.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");

/** Default checkpoint — same location graphsage-predictor writes/reads. */
export const DEFAULT_CHECKPOINT = path.join(ROOT, "state", "shared", "nn-graph", "graphsage-checkpoint.json");

/** Graph node kind for the unwired engines this tier classifies. */
export const GHOST_KIND = "ghost.unwired-engine";

/** A dispatcher label the cascade emits — prism_calc, prism_turning, ... */
export const DISPATCHER_RE = /^prism_[a-z0-9_]+$/;

export const GNN_DEFAULTS = Object.freeze({
  minConf: 0.7,         // GNN gate fires only at/above this (PRISM_NNG_MIN_CONF)
  refMinConf: 0.8,      // a ghost is a vote-reference only at/above this confidence
  topK: 15,             // nearest references that vote per target
  maxNodes: 2000,       // subgraph embedding cap (the ghost set is < 1000)
  confidenceCap: 0.8,   // a propagated label never claims keyword-tier hardness
});

/** True when `label` is a syntactically valid prism_* dispatcher name. */
export function isValidDispatcher(label) {
  return typeof label === "string" && DISPATCHER_RE.test(label);
}

/**
 * Coerce `raw` to a number, or `null` when it is not a meaningful numeric
 * input. Guards the `Number("")===0` / `Number(null)===0` footgun: an empty
 * or blank env var must fall back to a default, never silently become 0.
 */
function toNumberOrNull(raw) {
  if (typeof raw === "number") return raw;
  if (typeof raw === "string" && raw.trim() !== "") return Number(raw);
  return null;
}

/** Parse `raw` to a finite number clamped to [min,max], else `fallback`. */
function finiteOr(raw, fallback, { min = -Infinity, max = Infinity } = {}) {
  const n = toNumberOrNull(raw);
  if (n === null || !Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}

/** Parse `raw` to an integer >= min, else `fallback`. */
function intOr(raw, fallback, min = 1) {
  const n = toNumberOrNull(raw);
  if (n === null || !Number.isInteger(n) || n < min) return fallback;
  return n;
}

/**
 * Resolve runtime config from env + explicit overrides. Overrides win over
 * env, env wins over GNN_DEFAULTS. Garbage env values fall back to the
 * default (a malformed knob must never crash the cascade).
 */
export function resolveGnnConfig(env = process.env, overrides = {}) {
  const d = GNN_DEFAULTS;
  const pick = (o, e) => (o !== undefined ? o : e);
  return {
    disabled: env.PRISM_NNG_DISABLE === "1" || overrides.disabled === true,
    minConf: finiteOr(pick(overrides.minConf, env.PRISM_NNG_MIN_CONF), d.minConf, { min: 0, max: 1 }),
    refMinConf: finiteOr(pick(overrides.refMinConf, env.PRISM_NNG_REF_MIN_CONF), d.refMinConf, { min: 0, max: 1 }),
    topK: intOr(pick(overrides.topK, env.PRISM_NNG_TOPK), d.topK),
    maxNodes: intOr(overrides.maxNodes, d.maxNodes),
    confidenceCap: finiteOr(overrides.confidenceCap, d.confidenceCap, { min: 0, max: 1 }),
    checkpointPath: pick(overrides.checkpoint, env.PRISM_NNG_CHECKPOINT) || DEFAULT_CHECKPOINT,
  };
}

/**
 * Load a trained checkpoint into a predictor handle. Returns
 * { ok:true, predictor } or { ok:false, reason } — a missing checkpoint
 * ("no-checkpoint") is the expected pre-U7 state, not an error.
 */
export function loadGnnCheckpoint(checkpointPath, { readFileImpl = fs.readFileSync } = {}) {
  let raw;
  try {
    raw = readFileImpl(checkpointPath, "utf8");
  } catch (err) {
    if (err && err.code === "ENOENT") return { ok: false, reason: "no-checkpoint" };
    return { ok: false, reason: `checkpoint-read-failed: ${err && err.message ? err.message : err}` };
  }
  try {
    return { ok: true, predictor: loadPredictor(raw) };
  } catch (err) {
    return { ok: false, reason: `checkpoint-load-failed: ${err && err.message ? err.message : err}` };
  }
}

/**
 * Split the graph's ghost.unwired-engine nodes into targets (to classify) and
 * references (to vote with). Targets: when `targetNames` (a Set of labels) is
 * given, the ghosts whose label is in it; otherwise the UNKNOWN ghosts.
 * References: ghosts with a valid prism_* proposed_wiring and a finite
 * confidence >= refMinConf, minus anything that is also a target.
 * Returns { targets, references } as arrays of the real graph node objects.
 */
export function partitionGhosts(graph, { refMinConf, targetNames = null } = {}) {
  const nodes = graph && Array.isArray(graph.nodes) ? graph.nodes : [];
  const ghosts = nodes.filter((n) => n && n.kind === GHOST_KIND && typeof n.id === "string");
  const minConf = finiteOr(refMinConf, GNN_DEFAULTS.refMinConf, { min: 0, max: 1 });

  const isTarget = targetNames instanceof Set
    ? (n) => targetNames.has(n.label)
    : (n) => n.proposed_wiring === "UNKNOWN";

  const targets = [];
  const targetIds = new Set();
  const targetLabels = new Set();
  for (const n of ghosts) {
    if (!isTarget(n)) continue;
    targets.push(n);
    targetIds.add(n.id);
    if (typeof n.label === "string") targetLabels.add(n.label);
  }
  const references = [];
  for (const n of ghosts) {
    // Exclude a target from its own reference set by BOTH id and label: graph
    // node ids and labels are independent, so a duplicate-label ghost would
    // otherwise feed the cascade's own guess for this engine back into the vote.
    if (targetIds.has(n.id)) continue;
    if (typeof n.label === "string" && targetLabels.has(n.label)) continue;
    if (!isValidDispatcher(n.proposed_wiring)) continue;
    if (!Number.isFinite(n.confidence) || n.confidence < minConf) continue;
    references.push(n);
  }
  return { targets, references };
}

/**
 * Build the edgeless subgraph fed to the embedder: every distinct target +
 * reference node, no edges. Unwired engines are graph-isolated, so embedding
 * them in their (proposed-wire-only) neighbourhood would leak the cascade's
 * own guesses; an edgeless subgraph scores each engine purely on the model's
 * learned transform of its symbolic features. Returns { nodes, edges:[] }.
 */
export function buildGhostSubgraph(targets, references) {
  const nodes = [];
  const seen = new Set();
  for (const n of [...(targets || []), ...(references || [])]) {
    if (!n || typeof n.id !== "string" || seen.has(n.id)) continue;
    seen.add(n.id);
    nodes.push(n);
  }
  return { nodes, edges: [] };
}

/**
 * Confidence-weighted k-NN vote for one target. Scores the link from `target`
 * to every reference, keeps the top-K by calibrated score, and votes each
 * reference's dispatcher with weight (score * reference confidence). Returns
 * { dispatcher, confidence, voteShare, margin, k } — or null when no reference
 * could be scored (e.g. the target has no embedding).
 */
export function voteDispatcher(target, embeddings, references, opts = {}) {
  const topK = intOr(opts.topK, GNN_DEFAULTS.topK);
  const calibrator = opts.calibrator ?? null;
  const cap = finiteOr(opts.confidenceCap, GNN_DEFAULTS.confidenceCap, { min: 0, max: 1 });

  const scored = [];
  for (const ref of references || []) {
    // Skip the target itself by id OR label (defence-in-depth for direct-API
    // callers that hand-build `references` — partitionGhosts already excludes).
    // Guard the label compare on a string target.label: two label-less nodes
    // must not collide via `undefined === undefined`.
    if (!ref || ref.id === target.id ||
        (typeof target.label === "string" && ref.label === target.label)) continue;
    const s = scoreLink(embeddings, calibrator, target.id, ref.id);
    if (!s || !Number.isFinite(s.calibratedScore)) continue;
    scored.push({ ref, score: s.calibratedScore });
  }
  if (scored.length === 0) return null;

  // Deterministic order: score desc, then reference confidence desc, then id asc.
  scored.sort((a, b) =>
    (b.score - a.score) ||
    (b.ref.confidence - a.ref.confidence) ||
    (a.ref.id < b.ref.id ? -1 : a.ref.id > b.ref.id ? 1 : 0));
  const top = scored.slice(0, topK);

  const votes = new Map(); // Map (never a bare object) — proposed_wiring is untrusted-ish
  let total = 0;
  for (const { ref, score } of top) {
    const w = Math.max(0, score) * Math.max(0, ref.confidence);
    if (w <= 0) continue;
    votes.set(ref.proposed_wiring, (votes.get(ref.proposed_wiring) || 0) + w);
    total += w;
  }
  if (total <= 0 || votes.size === 0) return null;

  // Winner + runner-up, ties broken by dispatcher name for determinism.
  const ranked = [...votes.entries()].sort((a, b) =>
    (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const [winner, winnerVotes] = ranked[0];
  const runnerUpVotes = ranked.length > 1 ? ranked[1][1] : 0;
  const voteShare = winnerVotes / total;
  return {
    dispatcher: winner,
    confidence: Math.min(cap, voteShare),
    voteShare,
    margin: (winnerVotes - runnerUpVotes) / total,
    k: top.length,
  };
}

/**
 * Classify the UNKNOWN ghost engines of `graph`. Returns
 * { skipped, reason, classifications, stats }:
 *   - skipped:true  — the GNN tier could not contribute (disabled / no
 *                     checkpoint / no references / embed failure); the caller
 *                     falls back to the LLM tier for every engine.
 *   - skipped:false — the tier ran; `classifications` holds the engines it
 *                     resolved at/above the confidence gate (possibly empty).
 * Each classification: { engine, dispatcher, confidence, reason, voteShare }.
 *
 * `opts.predictor` injects a preloaded predictor (skips checkpoint IO — the
 * test seam). `opts.targetNames` (Set of labels) scopes the targets.
 */
export function classifyUnknownGhosts(graph, opts = {}) {
  const cfg = resolveGnnConfig(opts.env ?? process.env, opts);
  const empty = (skipped, reason, stats = {}) => ({ skipped, reason, classifications: [], stats });

  if (cfg.disabled) return empty(true, "disabled");

  let predictor = opts.predictor;
  if (!predictor) {
    const loaded = loadGnnCheckpoint(cfg.checkpointPath, { readFileImpl: opts.readFileImpl });
    if (!loaded.ok) return empty(true, loaded.reason);
    predictor = loaded.predictor;
  }
  if (!predictor || !predictor.model) return empty(true, "invalid-predictor");

  const partition = partitionGhosts(graph, {
    refMinConf: cfg.refMinConf,
    targetNames: opts.targetNames ?? null,
  });
  const references = partition.references;
  // `--limit` bounds the WORK (embed + vote), not just the output — slicing the
  // targets here keeps compute, --apply scope, and reported stats all honest.
  let targets = partition.targets;
  if (Number.isFinite(opts.limit) && opts.limit >= 0 && targets.length > opts.limit) {
    targets = targets.slice(0, opts.limit);
  }
  if (targets.length === 0) {
    // Scoped (gate) path with zero matches => the GNN genuinely cannot
    // contribute (likely a label/schema mismatch) => skipped:true so the LLM
    // tier handles all. Unscoped (standalone) zero-UNKNOWN is a benign no-op.
    const scoped = opts.targetNames instanceof Set && opts.targetNames.size > 0;
    return empty(scoped, scoped ? "no-targets-matched" : "no-targets",
      { targets: 0, references: references.length });
  }
  if (references.length === 0) {
    return empty(true, "no-references", { targets: targets.length, references: 0 });
  }

  const subgraph = buildGhostSubgraph(targets, references);
  let embeddings;
  try {
    const res = embedGraph(predictor.model, subgraph, {
      maxNodes: Math.max(cfg.maxNodes, subgraph.nodes.length + 1),
    });
    embeddings = res.embeddings;
  } catch (err) {
    return empty(true, `embed-failed: ${err && err.message ? err.message : err}`,
      { targets: targets.length, references: references.length });
  }

  const classifications = [];
  for (const target of targets) {
    const v = voteDispatcher(target, embeddings, references, {
      topK: cfg.topK,
      calibrator: predictor.calibrator,
      confidenceCap: cfg.confidenceCap,
    });
    if (!v || v.confidence < cfg.minConf) continue;
    classifications.push({
      engine: target.label,
      dispatcher: v.dispatcher,
      confidence: Math.round(v.confidence * 1e4) / 1e4,
      voteShare: Math.round(v.voteShare * 1e4) / 1e4,
      reason: `GNN tier-5 k-NN label-prop (voteShare ${v.voteShare.toFixed(2)}, k=${v.k})`,
    });
  }
  return {
    skipped: false,
    reason: classifications.length > 0 ? "classified" : "below-threshold",
    classifications,
    stats: {
      targets: targets.length,
      references: references.length,
      embedded: embeddings.size,
      classified: classifications.length,
      calibrated: predictor.calibrator != null,
    },
  };
}

/** Parse + JSON-load a graph file. Returns the parsed object (throws on error). */
function readGraph(graphPath, readFileImpl = fs.readFileSync) {
  return JSON.parse(readFileImpl(graphPath, "utf8"));
}

/**
 * Gate entry point for seed-ghost-llm-classify.mjs. Given the `unknowns` list
 * the LLM script already built ([{ id, name, path }]), load the graph and
 * classify exactly those engines. Read-only — never writes the graph (the LLM
 * script owns the single merge+write). Returns the classifyUnknownGhosts
 * shape; a graph-load failure degrades to skipped (the LLM tier still runs).
 */
export function gnnClassifyUnknowns(unknowns, opts = {}) {
  if (!Array.isArray(unknowns) || unknowns.length === 0) {
    return { skipped: false, reason: "no-unknowns", classifications: [], stats: {} };
  }
  let graph;
  try {
    graph = readGraph(opts.graphPath ?? GRAPH_PATH, opts.readFileImpl);
  } catch (err) {
    return {
      skipped: true,
      reason: `graph-load-failed: ${err && err.message ? err.message : err}`,
      classifications: [],
      stats: {},
    };
  }
  const targetNames = new Set(unknowns.map((u) => u && u.name).filter((x) => typeof x === "string"));
  return classifyUnknownGhosts(graph, { ...opts, targetNames });
}

function atomicWrite(filePath, content) {
  const tmp = filePath + ".tmp";
  fs.writeFileSync(tmp, content);
  const delays = [50, 100, 200, 400, 800, 1600];
  for (let i = 0; i <= delays.length; i++) {
    try { fs.renameSync(tmp, filePath); return; }
    catch (err) {
      const code = err && err.code;
      if (code !== "EBUSY" && code !== "EPERM" && code !== "EACCES" && code !== "EEXIST") throw err;
      if (i === delays.length) throw new Error(`rename retry exhausted: ${filePath}`);
      const until = Date.now() + delays[i];
      while (Date.now() < until) { /* spin */ }
    }
  }
}

/**
 * Apply GNN classifications to the graph in place: update each ghost node and
 * append a proposed-wire edge. Returns { nodesUpdated, edgesAdded }.
 */
export function applyGnnClassifications(graph, classifications) {
  const byName = new Map();
  for (const n of graph.nodes || []) {
    if (n && n.kind === GHOST_KIND) byName.set(n.label, n);
  }
  const edgeKeys = new Set((graph.edges || []).map((e) => `${e.from}::${e.to}::${e.type || ""}`));
  let nodesUpdated = 0, edgesAdded = 0;
  for (const c of classifications) {
    // Re-validate at this export boundary — a direct caller may hand-build
    // `classifications`; never write an unvalidated dispatcher into the graph.
    if (!c || !isValidDispatcher(c.dispatcher) || !Number.isFinite(c.confidence)) continue;
    const node = byName.get(c.engine);
    if (!node) continue;
    const reason = typeof c.reason === "string" && c.reason ? c.reason : "GNN tier-5 classification";
    node.proposed_wiring = c.dispatcher;
    node.confidence = c.confidence;
    node.reason = reason;
    node.info = `Unwired engine — proposed wiring: ${c.dispatcher} (confidence ${c.confidence.toFixed(2)}, reason: ${reason})`;
    nodesUpdated++;
    const edge = {
      from: node.id,
      to: `dispatcher.${c.dispatcher}`,
      type: "ghost-wire",
      relation: "proposed-wire",
      status: "proposed",
      intensity: c.confidence,
    };
    const key = `${edge.from}::${edge.to}::${edge.type}`;
    if (!edgeKeys.has(key)) { (graph.edges || (graph.edges = [])).push(edge); edgeKeys.add(key); edgesAdded++; }
  }
  return { nodesUpdated, edgesAdded };
}

export function parseArgs(argv) {
  const out = { dryRun: false, apply: false, limit: Infinity, checkpoint: undefined, minConf: undefined };
  const args = Array.isArray(argv) ? argv : [];
  for (let i = 0; i < args.length; i++) {
    const a = args[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--apply") out.apply = true;
    else if (a === "--limit") out.limit = intOr(args[++i], Infinity);
    else if (a === "--checkpoint") out.checkpoint = args[++i];
    else if (a === "--min-conf") out.minConf = finiteOr(args[++i], undefined, { min: 0, max: 1 });
    else if (a === "--help" || a === "-h") { out.help = true; }
    else throw new Error(`seed-ghost-gnn-classify: unknown argument "${a}" (try --help)`);
  }
  if (!out.dryRun && !out.apply) out.dryRun = true;
  return out;
}

const USAGE = `seed-ghost-gnn-classify — GNN tier-5 dispatcher inference for UNKNOWN ghost engines

Usage: node scripts/seed-ghost-gnn-classify.mjs [options]

  --dry-run            classify + report, do not write the graph (default)
  --apply              write the resolved classifications into the graph
  --limit <n>          classify at most n UNKNOWN engines
  --checkpoint <path>  trained checkpoint JSON (default: state/shared/nn-graph/...)
  --min-conf <f>       confidence gate (default ${GNN_DEFAULTS.minConf}; env PRISM_NNG_MIN_CONF)
  --help               show this help

Env: PRISM_NNG_DISABLE=1 reverts to the 4-tier cascade · PRISM_NNG_REF_MIN_CONF · PRISM_NNG_TOPK`;

/** CLI entry point. Returns a process exit code. */
export function main(argv) {
  let opts;
  try { opts = parseArgs(argv); }
  catch (err) { console.error(err.message); return 2; }
  if (opts.help) { console.log(USAGE); return 0; }

  let graph;
  try { graph = readGraph(GRAPH_PATH); }
  catch (err) { console.error(`seed-ghost-gnn-classify: cannot load graph — ${err.message}`); return 2; }

  const result = classifyUnknownGhosts(graph, {
    checkpoint: opts.checkpoint,
    minConf: opts.minConf,
    limit: opts.limit,
  });

  if (result.skipped) {
    console.log(`GNN tier-5 skipped (${result.reason}) — no graph change.`);
    return 0;
  }
  const classifications = result.classifications;
  console.log(
    `GNN tier-5: ${result.stats.targets} UNKNOWN target(s), ${result.stats.references} reference(s) — ` +
    `${classifications.length} classified at/above the gate.`);
  for (const c of classifications) {
    console.log(`  ${c.engine}  ->  ${c.dispatcher}   confidence=${c.confidence.toFixed(4)}  (${c.reason})`);
  }
  if (classifications.length === 0) return 0;

  if (opts.dryRun) {
    console.log(`DRY-RUN — would update ${classifications.length} ghost node(s). Re-run with --apply.`);
    return 0;
  }
  const { nodesUpdated, edgesAdded } = applyGnnClassifications(graph, classifications);
  atomicWrite(GRAPH_PATH, JSON.stringify(graph, null, 2));
  console.log(`APPLIED — nodes updated=${nodesUpdated}, edges added=${edgesAdded}.`);
  return 0;
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; }
  catch { return false; }
})();
if (__isMain) process.exit(main(process.argv.slice(2)));
