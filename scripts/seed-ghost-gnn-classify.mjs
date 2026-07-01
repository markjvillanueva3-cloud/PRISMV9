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
import { readGraphStreaming, writeGraphStreamingAtomic } from "./lib/graph-io.mjs";
import { mcpToolToDispNodeId } from "./lib/viz-dispatcher-node-id.mjs";

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
  // GNN-F0 (2026-06-04): base-rate vote normalization. The AUROC-0.5 constant-vote
  // collapse was a class-prior monopoly — when the embedding is feature-starved
  // every target->reference cosine is near-uniform, so the raw weighted sum is
  // won by whichever class has the MOST references (prism_turning, 60/125). We
  // divide each class's accumulated weight by its reference-pool frequency so the
  // residual cosine signal, not the prior, picks the winner.
  baseRateAlpha: 1.0,   // Laplace smoothing on the per-class divisor (PRISM_NNG_BASE_RATE_ALPHA)
  minClassRefs: 2,      // a class needs >= this many references to be a confident winner (PRISM_NNG_MIN_CLASS_REFS); relaxes if the floor would empty the ballot
  // GNN-F0/2d: direct-embed inference. The deployed 8-d checkpoint + edgeless
  // subgraph produces UNIFORM per-target embeddings (every structural feature
  // collapses to 0 with no edges) → uniform cosines → constant vote regardless
  // of base-rate normalization. The direct-embed path BYPASSES the model: it
  // votes raw cosine k-NN over precomputed 768-d nomic vectors (distinct per
  // ghost — see scripts/build-node-embeddings.mjs --ghosts-only), which is what
  // actually breaks the AUROC-0.5 degeneracy. No checkpoint/model needed.
  directEmbed: false,   // PRISM_NNG_DIRECT_EMBED=1
  // GNN-F0 confidence calibration (2026-06-04) — OPT-IN (default OFF). Richer
  // source-signal embeddings left voteShare UNDERconfident, so we tried a monotone
  // isotonic confidence→P(correct) map fit by LEAVE-ONE-OUT on the reference pool
  // (leak-free; argmax untouched). EMPIRICAL RESULT: it REGRESSED both metrics on
  // the live holdout (AUROC 0.788→0.755, Brier 0.183→0.206). Root cause is
  // structural: LOO drops 1 reference while the eval holdout drops ~62 at once, so
  // the LOO reference pool is DENSER → LOO votes are systematically easier than
  // holdout votes → the calibrator transfers as OVER-confidence; isotonic flats also
  // add score ties that depress AUROC. Kept as tested, fail-soft infrastructure
  // behind PRISM_NNG_DIRECT_CALIBRATE=1; a correct fix needs a held-out calibration
  // split (or k-at-a-time LOO matching the holdout size). See the F0 spec.
  calibrateDirect: false,
});

/** Default precomputed ghost embeddings for the direct-embed path (768-d nomic,
 *  one distinct vector per ghost). Built by build-node-embeddings.mjs --ghosts-only. */
export const DEFAULT_DIRECT_EMBED_PATH = path.join(ROOT, "state", "shared", "nn-graph", "ghost-node-embeddings.jsonl");

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
    baseRateAlpha: finiteOr(pick(overrides.baseRateAlpha, env.PRISM_NNG_BASE_RATE_ALPHA), d.baseRateAlpha, { min: 0 }),
    minClassRefs: intOr(pick(overrides.minClassRefs, env.PRISM_NNG_MIN_CLASS_REFS), d.minClassRefs, 1),
    baseRateDisabled: env.PRISM_NNG_BASE_RATE_DISABLE === "1" || overrides.baseRateDisabled === true,
    directEmbed: env.PRISM_NNG_DIRECT_EMBED === "1" || overrides.directEmbed === true,
    directEmbedPath: pick(overrides.directEmbedPath, env.PRISM_NNG_DIRECT_EMBED_PATH) || DEFAULT_DIRECT_EMBED_PATH,
    // OPT-IN (default OFF — it regressed the live holdout, see GNN_DEFAULTS note);
    // PRISM_NNG_DIRECT_CALIBRATE=1 enables for experimentation.
    calibrateDirect: overrides.calibrateDirect !== undefined
      ? overrides.calibrateDirect === true
      : env.PRISM_NNG_DIRECT_CALIBRATE === "1",
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
 * Load precomputed ghost embeddings for the direct-embed path (GNN-F0/2d).
 * Returns Map<id, number[]> of dequantized UNIT vectors — `q * s` reconstructs
 * the L2-unit vector `quantize()` produced (unit = q*scale), so a dot product
 * of two is their cosine. Restricted to `neededIds` (the subgraph) to bound
 * memory. Fail-soft: a missing/unparseable file returns an empty Map so the
 * caller skips the tier rather than crashing (never fabricates zero vectors).
 */
export function loadDirectEmbeddings(filePath, neededIds, { readFileImpl = fs.readFileSync } = {}) {
  const out = new Map();
  let raw;
  try {
    raw = readFileImpl(filePath, "utf8");
  } catch {
    return out;
  }
  for (const line of raw.split(/\r?\n/)) {
    const t = line.trim();
    if (t.length === 0 || t.startsWith('{"__meta')) continue;
    let rec;
    try { rec = JSON.parse(t); } catch { continue; }
    const id = rec && typeof rec.id === "string" ? rec.id : null;
    if (!id || (neededIds instanceof Set && !neededIds.has(id))) continue;
    const q = rec.q;
    const s = typeof rec.s === "number" && Number.isFinite(rec.s) ? rec.s : 1;
    if (!Array.isArray(q) || q.length === 0) continue;
    out.set(id, q.map((x) => x * s));
  }
  return out;
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

  // GNN-F0 base-rate normalization. The AUROC-0.5 constant-vote collapse was a
  // class-prior monopoly: feature-starved embeddings make every target->reference
  // cosine near-uniform, so the raw weighted sum is won by whichever class has the
  // MOST references (prism_turning, 60/125) — for EVERY target, hence one constant
  // prediction. We divide each class's accumulated weight by its FULL reference-
  // pool frequency (+Laplace alpha) so the residual cosine signal, not the prior,
  // picks the winner. A minClassRefs support floor keeps a single noisy rare-class
  // reference from flipping the vote; it relaxes if the floor would empty the
  // ballot (tiny pool) so a confident call is still produced. `baseRateDisabled`
  // reproduces the legacy raw-sum path byte-for-byte (rollback knob).
  const baseRateDisabled = opts.baseRateDisabled === true;
  const baseRateAlpha = finiteOr(opts.baseRateAlpha, GNN_DEFAULTS.baseRateAlpha, { min: 0 });
  const minClassRefs = intOr(opts.minClassRefs, GNN_DEFAULTS.minClassRefs, 1);
  let refFreq = null;
  if (!baseRateDisabled) {
    refFreq = new Map();
    for (const ref of references || []) {
      if (ref && typeof ref.proposed_wiring === "string") {
        refFreq.set(ref.proposed_wiring, (refFreq.get(ref.proposed_wiring) || 0) + 1);
      }
    }
  }
  // Math.max guards the (operator alpha=0 AND a hand-built disjoint references)
  // footgun where refFreq.get(cls) could be 0 → divide-by-zero; unreachable via
  // partitionGhosts (every voted class is in references) but cheap defence.
  const normWeight = ([cls, w]) => [cls, baseRateDisabled ? w : w / Math.max(1e-9, (refFreq.get(cls) || 0) + baseRateAlpha)];
  let normEntries;
  if (baseRateDisabled) {
    normEntries = [...votes.entries()];
  } else {
    normEntries = [...votes.entries()].filter(([cls]) => (refFreq.get(cls) || 0) >= minClassRefs).map(normWeight);
    if (normEntries.length === 0) normEntries = [...votes.entries()].map(normWeight); // floor fallback
  }
  // OPT-IN per-class separability re-weight (U-GNN-SEP-VOTE-WEIGHT). Scales each class's normalized
  // weight by a caller-supplied factor (>=0) keyed by dispatcher; a class absent from the map keeps
  // factor 1. DEFAULT (no Map) = byte-identical -- no deployed caller passes it. The factor POLICY
  // (e.g. derive from embedding-separability margin so separable classes are boosted to clear the
  // gate and entangled classes are damped) lives in the CALLER, keeping this a generic hook. An
  // all-zero map collapses normTotal to 0 and the existing null guard below fires (no fake vote).
  const sepWeights = opts.separabilityWeights instanceof Map ? opts.separabilityWeights : null;
  if (sepWeights) {
    normEntries = normEntries.map(([cls, w]) => {
      const f = sepWeights.get(cls);
      return [cls, w * (Number.isFinite(f) && f >= 0 ? f : 1)];
    });
  }
  const normTotal = normEntries.reduce((s, [, w]) => s + w, 0);
  if (normTotal <= 0 || normEntries.length === 0) return null;

  // Winner + runner-up on normalized weights, ties broken by dispatcher name.
  const ranked = normEntries.sort((a, b) =>
    (b[1] - a[1]) || (a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0));
  const [winner, winnerVotes] = ranked[0];
  const runnerUpVotes = ranked.length > 1 ? ranked[1][1] : 0;
  const voteShare = winnerVotes / normTotal;
  return {
    dispatcher: winner,
    confidence: Math.min(cap, voteShare),
    voteShare,
    margin: (winnerVotes - runnerUpVotes) / normTotal,
    k: top.length,
  };
}

/**
 * Isotonic regression (Pool-Adjacent-Violators) → a monotone non-decreasing fit.
 * `pairs` = [{x, y}] with x the raw confidence and y∈{0,1} the correctness label.
 * Returns { xs, ys } breakpoints (sorted by x) or null when there is no data.
 * Monotone is the right inductive bias here: a higher vote-share is never less
 * likely to be correct, so we want the calibrated map to be non-decreasing.
 */
export function fitIsotonic(pairs) {
  const pts = (pairs || [])
    .filter((p) => p && Number.isFinite(p.x) && Number.isFinite(p.y))
    .sort((a, b) => a.x - b.x);
  if (pts.length === 0) return null;
  // PAV: merge adjacent blocks while the running means violate monotonicity.
  /** @type {Array<{ sumY: number, w: number, xmin: number, xmax: number, val: number }>} */
  const blocks = [];
  for (const p of pts) {
    let nb = { sumY: p.y, w: 1, xmin: p.x, xmax: p.x, val: p.y };
    while (blocks.length && blocks[blocks.length - 1].val >= nb.val) {
      const prev = blocks.pop();
      const sumY = prev.sumY + nb.sumY;
      const w = prev.w + nb.w;
      nb = { sumY, w, xmin: prev.xmin, xmax: nb.xmax, val: sumY / w };
    }
    blocks.push(nb);
  }
  const xs = [];
  const ys = [];
  for (const b of blocks) {
    xs.push(b.xmin); ys.push(b.val);
    if (b.xmax !== b.xmin) { xs.push(b.xmax); ys.push(b.val); }
  }
  return { xs, ys };
}

/** Apply an isotonic model to x with linear interpolation + flat extrapolation. */
export function applyIsotonic(model, x) {
  if (!model || !Array.isArray(model.xs) || model.xs.length === 0) return x;
  const { xs, ys } = model;
  if (x <= xs[0]) return ys[0];
  if (x >= xs[xs.length - 1]) return ys[ys.length - 1];
  for (let i = 1; i < xs.length; i++) {
    if (x <= xs[i]) {
      const x0 = xs[i - 1], x1 = xs[i];
      const t = x1 > x0 ? (x - x0) / (x1 - x0) : 0;
      return ys[i - 1] + t * (ys[i] - ys[i - 1]);
    }
  }
  return ys[ys.length - 1];
}

/**
 * Fit a leak-free confidence calibrator for the direct-embed path. For each
 * reference, re-vote using ONLY the OTHER references (leave-one-out) over the same
 * embeddings, pairing the produced confidence with whether the LOO prediction
 * matched that reference's own dispatcher. The holdout is never touched, so this
 * is honest post-hoc calibration. Returns an isotonic model (or null when there
 * is too little signal — < `minPairs` LOO votes, e.g. a tiny pool).
 */
export function fitDirectConfidenceCalibrator(references, embeddings, opts = {}) {
  const refs = Array.isArray(references) ? references : [];
  if (refs.length < 3) return null;
  const minPairs = intOr(opts.minPairs, 10, 1);
  const voteOpts = {
    topK: opts.topK,
    confidenceCap: opts.confidenceCap,
    baseRateAlpha: opts.baseRateAlpha,
    minClassRefs: opts.minClassRefs,
    baseRateDisabled: opts.baseRateDisabled,
    separabilityWeights: opts.separabilityWeights, // consistent with the main vote when the lever is on
    calibrator: null, // raw link scores; this fits the FINAL confidence, not link scores
  };
  const pairs = [];
  for (const held of refs) {
    const others = refs.filter((r) => r.id !== held.id);
    const v = voteDispatcher(held, embeddings, others, voteOpts);
    if (!v || !Number.isFinite(v.confidence)) continue;
    pairs.push({ x: v.confidence, y: v.dispatcher === held.proposed_wiring ? 1 : 0 });
  }
  if (pairs.length < minPairs) return null;
  return fitIsotonic(pairs);
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

  // Direct-embed (GNN-F0/2d) votes raw nomic cosine — no checkpoint/model needed.
  let predictor = opts.predictor;
  if (!cfg.directEmbed) {
    if (!predictor) {
      const loaded = loadGnnCheckpoint(cfg.checkpointPath, { readFileImpl: opts.readFileImpl });
      if (!loaded.ok) return empty(true, loaded.reason);
      predictor = loaded.predictor;
    }
    if (!predictor || !predictor.model) return empty(true, "invalid-predictor");
  }

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
  // Direct-embed (GNN-F0/2d) votes raw nomic cosine — no calibrator (the model's
  // isotonic calibrator was fit on 8-d link scores, meaningless for raw cosine).
  const calibrator = cfg.directEmbed ? null : predictor.calibrator;
  let embeddings;
  if (cfg.directEmbed) {
    // Load precomputed DISTINCT 768-d nomic vectors for the subgraph, bypassing
    // the 8-d edgeless-SAGE that collapsed every target to a uniform vector
    // (the actual root of the AUROC-0.5 constant-vote collapse). Memory-bounded
    // to the subgraph ids. Fail-soft if the embedding file is absent/empty.
    const needed = new Set(subgraph.nodes.map((n) => n.id));
    embeddings = loadDirectEmbeddings(cfg.directEmbedPath, needed, { readFileImpl: opts.readFileImpl });
    if (embeddings.size === 0) {
      return empty(true, `direct-embed-no-vectors: ${cfg.directEmbedPath}`,
        { targets: targets.length, references: references.length });
    }
  } else {
    try {
      // U-NN-PREDICTOR-EMBED-WIRE follow-up (2026-05-24, slot papa): forward the
      // checkpoint's baked-in embeddingSource to embedGraph so a 768-d checkpoint
      // applies the correct feature layout at inference. Without this forward, a
      // 768-d trained model fell back to 8-d projected features and the inputDim
      // guard threw "checkpoint/feature-layout mismatch" — defeating tier-5 eval.
      // Caller-supplied opts.embeddingSource still wins (test seam); the metadata
      // value is the production fallback.
      const embeddingSource =
        (typeof opts.embeddingSource === "string" && opts.embeddingSource.length > 0)
          ? opts.embeddingSource
          : (predictor.metadata && typeof predictor.metadata.embeddingSource === "string"
              && predictor.metadata.embeddingSource.length > 0
            ? predictor.metadata.embeddingSource
            : null);
      const res = embedGraph(predictor.model, subgraph, {
        maxNodes: Math.max(cfg.maxNodes, subgraph.nodes.length + 1),
        ...(embeddingSource ? { embeddingSource } : {}),
      });
      embeddings = res.embeddings;
    } catch (err) {
      return empty(true, `embed-failed: ${err && err.message ? err.message : err}`,
        { targets: targets.length, references: references.length });
    }
  }

  // GNN-F0 direct-embed confidence calibration (leak-free LOO over references, never
  // the holdout). Richer source-signal embeddings lifted the argmax (macroF1/acc) but
  // left voteShare UNDERconfident → Brier/AUROC regressed. The isotonic map realigns
  // confidence to empirical P(correct); the argmax is untouched. Model mode keeps its
  // own link-score calibrator. Fail-soft: null map (tiny pool) → raw confidence.
  let confCal = null;
  if (cfg.directEmbed && cfg.calibrateDirect) {
    confCal = fitDirectConfidenceCalibrator(references, embeddings, {
      topK: cfg.topK,
      confidenceCap: cfg.confidenceCap,
      baseRateAlpha: cfg.baseRateAlpha,
      minClassRefs: cfg.minClassRefs,
      baseRateDisabled: cfg.baseRateDisabled,
      // keep the LOO calibrator's votes consistent with the main vote when the lever is on.
      separabilityWeights: opts.separabilityWeights,
    });
  }

  const classifications = [];
  for (const target of targets) {
    const v = voteDispatcher(target, embeddings, references, {
      topK: cfg.topK,
      calibrator,
      confidenceCap: cfg.confidenceCap,
      baseRateAlpha: cfg.baseRateAlpha,
      minClassRefs: cfg.minClassRefs,
      baseRateDisabled: cfg.baseRateDisabled,
      // OPT-IN coverage lever (U-GNN-SEP-VOTE-WEIGHT): forwarded verbatim; absent = unchanged.
      separabilityWeights: opts.separabilityWeights,
    });
    if (!v) continue;
    // Report (and gate on) the calibrated confidence: a raw voteShare of 0.5 that is
    // empirically ~0.9-correct SHOULD pass the deployment gate. Eval runs minConf:0,
    // so calibration moves only AUROC/Brier there, not the classified set.
    const reportedConf = confCal
      ? Math.max(0, Math.min(1, applyIsotonic(confCal, v.confidence)))
      : v.confidence;
    if (reportedConf < cfg.minConf) continue;
    classifications.push({
      engine: target.label,
      dispatcher: v.dispatcher,
      confidence: Math.round(reportedConf * 1e4) / 1e4,
      voteShare: Math.round(v.voteShare * 1e4) / 1e4,
      reason: `GNN tier-5 k-NN label-prop (voteShare ${v.voteShare.toFixed(2)}, k=${v.k}${confCal ? ", calibrated" : ""})`,
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
      calibrated: calibrator != null,
      confidenceCalibrated: confCal != null,
      mode: cfg.directEmbed ? "direct-embed" : "model",
    },
  };
}

/** Parse + JSON-load a graph file. Returns the parsed object (throws on error).
 *  U-NN-PREDICTOR-EMBED-WIRE follow-up (2026-05-24, slot papa): use the
 *  streaming reader for graphs >256MB to bypass V8's max-string-length ceiling.
 *  Test seam (readFileImpl) preserved for the legacy synchronous path. */
function readGraph(graphPath, readFileImpl = fs.readFileSync) {
  if (readFileImpl === fs.readFileSync) {
    try {
      const st = fs.statSync(graphPath);
      if (st && Number.isFinite(st.size) && st.size > 256 * 1024 * 1024) {
        return readGraphStreaming(graphPath);
      }
    } catch {
      // fall through to the legacy text path so the upstream error message
      // shape (test-asserted) is preserved.
    }
  }
  try {
    return JSON.parse(readFileImpl(graphPath, "utf8"));
  } catch (e) {
    if (e && e.code === "ERR_STRING_TOO_LONG") {
      // Last-ditch streaming retry even when the seam is user-injected.
      return readGraphStreaming(graphPath);
    }
    throw e;
  }
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
      // U-VIZ-G4-DEAD-EDGE (2026-05-30 sierra): canonical file-derived disp node
      // id, not the dead `dispatcher.${c.dispatcher}`. GNN tier-5 builds its own
      // edge (does NOT route through classificationToGraphUpdate), so it needs
      // the same resolver as the LLM tier + seed-ghost-from-unwired.
      to: mcpToolToDispNodeId(c.dispatcher),
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
  writeGraphStreamingAtomic(GRAPH_PATH, graph);  // cap-safe: raw JSON.stringify on the >512MiB graph throws Invalid-string-length (U-VIZ-WRITER-CAPSAFE 2026-06-23)
  console.log(`APPLIED — nodes updated=${nodesUpdated}, edges added=${edgesAdded}.`);
  return 0;
}

const __isMain = (() => {
  try { return import.meta.url === pathToFileURL(process.argv[1] || "").href; }
  catch { return false; }
})();
if (__isMain) process.exit(main(process.argv.slice(2)));
