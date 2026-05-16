#!/usr/bin/env node
/**
 * graphsage-predictor.mjs — GraphSAGE link-prediction inference. Unit
 * U-NNG-GRAPHSAGE-PREDICT (U5) of NN-GRAPH-MS0.
 *
 * Loads a checkpoint trained by U4 (graphsage-train-pipeline), embeds a graph
 * with the frozen weights, and scores candidate MISSING edges — the "wiring
 * links the graph does not have yet but probably should". Each prediction
 * carries a raw score and, when the checkpoint bundled an isotonic calibrator,
 * a calibrated probability.
 *
 * Pipeline:
 *   loadCheckpoint (graphsage-checkpoint)   frozen model + bundled calibrator
 *   normalizeGraph (edge-typology-norm)     core edge types
 *   buildAdjacency (graph-random-walk)      adjacency, capped at maxNodes
 *   projectGraphFeatures (feature-proj)     8-d symbolic node features
 *   forward (graphsage-model)               node embeddings (no training cache)
 *   linkScore + predictCalibrated           raw + calibrated edge probability
 *
 * Candidate generation is 2-hop: a node's neighbour-of-neighbour that is NOT
 * already a direct neighbour is a plausible-but-missing link. The candidate
 * set is bounded (per-node and global caps) so inference never explodes on
 * the 372k-node graph. Pure + deterministic given a fixed graph. Consistent
 * with the NN-GRAPH-MS0 scripts/lib/*.mjs + node:test convention.
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import { loadCheckpoint } from "./graphsage-checkpoint.mjs";
import { normalizeGraph } from "./edge-typology-normalizer.mjs";
import { buildAdjacency } from "./graph-random-walk.mjs";
import { projectGraphFeatures, FEATURE_DIM } from "./systemviz-node-feature-projector.mjs";
import { forward, linkScore } from "./graphsage-model.mjs";
import { predictCalibrated } from "./isotonic-calibrator.mjs";
import { loadGraph } from "./system-viz-graph.mjs";
import { canonicalEdgeKey } from "./graphsage-train-pipeline.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const DEFAULT_CHECKPOINT = path.join(ROOT, "state", "shared", "nn-graph", "graphsage-checkpoint.json");

export const PREDICT_DEFAULTS = Object.freeze({
  maxNodes: 6000,             // embedding forward is full-batch — cap for memory
  maxCandidatesPerNode: 20,   // 2-hop candidates collected per source node
  maxCandidates: 20000,       // global ceiling on the candidate set
  topK: 50,                   // ranked predictions returned
});

/**
 * Load a trained checkpoint into a predictor handle. `input` is the JSON
 * string OR the parsed checkpoint object. Returns { model, calibrator,
 * metadata } — `calibrator` is null when the checkpoint bundled none.
 */
export function loadPredictor(input) {
  const { model, calibrator, metadata } = loadCheckpoint(input);
  return { model, calibrator: calibrator ?? null, metadata: metadata ?? null };
}

/** Breakpoints of a bundled calibrator, or null when there is no usable one. */
function calibratorBreakpoints(calibrator) {
  if (calibrator && Array.isArray(calibrator.breakpoints) && calibrator.breakpoints.length > 0) {
    return calibrator.breakpoints;
  }
  return null;
}

/**
 * Embed every (capped) node of a graph with a frozen model. Returns
 * { embeddings: Map<id, Float64Array>, adjacency, nodeIds, truncated }.
 * Throws RangeError if the model's input dimension does not
 * match the feature projector — a checkpoint trained on a different feature
 * layout cannot be applied (a clear failure beats garbage embeddings).
 */
export function embedGraph(model, graph, opts = {}) {
  if (!model || !model.config) {
    throw new TypeError("graphsage-predictor: model must be a loaded checkpoint model");
  }
  const maxNodes = Number.isInteger(opts.maxNodes) && opts.maxNodes > 0
    ? opts.maxNodes
    : PREDICT_DEFAULTS.maxNodes;

  const normalized = normalizeGraph(graph);
  const { adj, nodeIds, truncated } = buildAdjacency(normalized, { undirected: true, maxNodes });
  const projected = projectGraphFeatures(normalized);
  if (model.config.inputDim !== projected.dim) {
    throw new RangeError(
      `graphsage-predictor: checkpoint inputDim ${model.config.inputDim} does not match the ` +
      `feature projector dim ${projected.dim} (${FEATURE_DIM}) — checkpoint/feature-layout mismatch`);
  }

  const features = new Map();
  for (const id of nodeIds) {
    const f = projected.features.get(id);
    if (f) features.set(id, f);
  }
  const { embeddings } = forward(model, adj, features, { buildCache: false });
  return { embeddings, adjacency: adj, nodeIds: [...features.keys()], truncated: !!truncated };
}

/**
 * Score one candidate link. Returns { u, v, rawScore, calibratedScore } — or
 * null when either endpoint has no embedding. `calibratedScore` equals
 * `rawScore` when no calibrator is supplied (honest — uncalibrated).
 */
export function scoreLink(embeddings, calibrator, u, v) {
  const zu = embeddings.get(u);
  const zv = embeddings.get(v);
  if (!zu || !zv) return null;
  const rawScore = linkScore(zu, zv);
  const breakpoints = calibratorBreakpoints(calibrator);
  const calibratedScore = breakpoints ? predictCalibrated(breakpoints, rawScore) : rawScore;
  return { u, v, rawScore, calibratedScore };
}

/**
 * Collect 2-hop candidate (missing) links: a node's neighbour-of-neighbour
 * that is not already a direct neighbour and not the node itself. The
 * adjacency is symmetric, so a node's `direct` neighbour set already names
 * every existing edge incident to it — excluding `direct` is therefore a
 * complete "is this already an edge" test, and every emitted pair is a true
 * non-edge. Bounded by `maxCandidatesPerNode` and `maxCandidates`.
 * Deterministic — iterates the adjacency in insertion order. Returns
 * [[u, v], ...].
 */
export function collectCandidateLinks(adjacency, opts = {}) {
  const perNode = Number.isInteger(opts.maxCandidatesPerNode) && opts.maxCandidatesPerNode > 0
    ? opts.maxCandidatesPerNode
    : PREDICT_DEFAULTS.maxCandidatesPerNode;
  const globalCap = Number.isInteger(opts.maxCandidates) && opts.maxCandidates > 0
    ? opts.maxCandidates
    : PREDICT_DEFAULTS.maxCandidates;

  const out = [];
  const seen = new Set(); // candidate keys already emitted (cross-node dedup)
  if (!(adjacency instanceof Map)) return out;

  for (const [u, nbrs] of adjacency) {
    if (out.length >= globalCap) break;
    if (!Array.isArray(nbrs)) continue;
    const direct = new Set(nbrs);
    let perNodeCount = 0;
    for (const w of nbrs) {
      if (perNodeCount >= perNode || out.length >= globalCap) break;
      const hop2 = adjacency.get(w);
      if (!Array.isArray(hop2)) continue;
      for (const x of hop2) {
        if (perNodeCount >= perNode || out.length >= globalCap) break;
        if (x === u || direct.has(x)) continue; // self, or already an edge
        const key = canonicalEdgeKey(u, x);
        if (seen.has(key)) continue;
        seen.add(key);
        out.push([u, x]);
        perNodeCount++;
      }
    }
  }
  return out;
}

/**
 * Score + rank candidate links, highest calibrated probability first. Returns
 * the top `topK` as [{ u, v, rawScore, calibratedScore }]. Ties break by raw
 * score then by canonical edge key, so the ranking is fully deterministic.
 */
export function rankPredictions(embeddings, calibrator, candidates, opts = {}) {
  const topK = Number.isInteger(opts.topK) && opts.topK > 0 ? opts.topK : PREDICT_DEFAULTS.topK;
  const scored = [];
  for (const [u, v] of Array.isArray(candidates) ? candidates : []) {
    const s = scoreLink(embeddings, calibrator, u, v);
    if (s) scored.push(s);
  }
  scored.sort((a, b) =>
    (b.calibratedScore - a.calibratedScore) ||
    (b.rawScore - a.rawScore) ||
    (canonicalEdgeKey(a.u, a.v) < canonicalEdgeKey(b.u, b.v) ? -1 : 1));
  return scored.slice(0, topK);
}

/**
 * End-to-end prediction: embed the graph with a loaded predictor, collect
 * bounded 2-hop candidate links, and return the top-K ranked predictions.
 * Returns { predictions, stats }.
 */
export function predictMissingLinks(predictor, graph, opts = {}) {
  if (!predictor || !predictor.model) {
    throw new TypeError("graphsage-predictor: predictor must come from loadPredictor()");
  }
  const { embeddings, adjacency, nodeIds, truncated } = embedGraph(predictor.model, graph, opts);
  const candidates = collectCandidateLinks(adjacency, opts);
  const predictions = rankPredictions(embeddings, predictor.calibrator, candidates, opts);
  return {
    predictions,
    stats: {
      nodeCount: nodeIds.length,
      candidateCount: candidates.length,
      returned: predictions.length,
      truncated,
      calibrated: calibratorBreakpoints(predictor.calibrator) !== null,
    },
  };
}

const USAGE = `graphsage-predictor — rank missing wiring links with a trained GraphSAGE model

Usage: node scripts/lib/graphsage-predictor.mjs [options]

  --checkpoint <path>   trained checkpoint JSON (default: state/shared/nn-graph/graphsage-checkpoint.json)
  --graph <path>        graph JSON to predict over (default: the system-viz graph)
  --out <path>          write the ranked predictions JSON here (optional)
  --top-k <n>           predictions to return (default ${PREDICT_DEFAULTS.topK})
  --max-nodes <n>       cap the node set for memory (default ${PREDICT_DEFAULTS.maxNodes})
  --help                show this help`;

const NUMERIC_FLAGS = { "--top-k": "topK", "--max-nodes": "maxNodes" };
const STRING_FLAGS = { "--checkpoint": "checkpoint", "--graph": "graph", "--out": "out" };

/** Parse argv into a plain options object; throws on a malformed/unknown flag. */
export function parseArgs(argv) {
  const args = Array.isArray(argv) ? argv : [];
  const out = {};
  for (let i = 0; i < args.length; i++) {
    const flag = args[i];
    if (flag === "--help" || flag === "-h") {
      out.help = true;
      continue;
    }
    if (STRING_FLAGS[flag]) {
      const value = args[++i];
      if (value === undefined) throw new Error(`graphsage-predictor: ${flag} needs a value`);
      out[STRING_FLAGS[flag]] = value;
      continue;
    }
    if (NUMERIC_FLAGS[flag]) {
      const raw = args[++i];
      const num = Number(raw);
      if (raw === undefined || !Number.isFinite(num)) {
        throw new Error(`graphsage-predictor: ${flag} needs a finite number (got ${raw})`);
      }
      out[NUMERIC_FLAGS[flag]] = num;
      continue;
    }
    throw new Error(`graphsage-predictor: unknown argument "${flag}" (try --help)`);
  }
  return out;
}

const fmt = (x) => (x == null ? "n/a" : Number(x).toFixed(4));

/** CLI entry point. Returns a process exit code. */
export function main(argv) {
  let args;
  try {
    args = parseArgs(argv);
  } catch (e) {
    console.error(e.message);
    return 2;
  }
  if (args.help) {
    console.log(USAGE);
    return 0;
  }

  const checkpointPath = args.checkpoint ? path.resolve(args.checkpoint) : DEFAULT_CHECKPOINT;
  let predictor;
  try {
    predictor = loadPredictor(fs.readFileSync(checkpointPath, "utf8"));
  } catch (e) {
    console.error(`graphsage-predictor: cannot load checkpoint ${checkpointPath} — ${e.message}`);
    return 2;
  }

  let graph;
  try {
    graph = args.graph ? JSON.parse(fs.readFileSync(args.graph, "utf8")) : loadGraph();
  } catch (e) {
    console.error(`graphsage-predictor: cannot load graph — ${e.message}`);
    return 2;
  }

  let result;
  try {
    result = predictMissingLinks(predictor, graph, {
      topK: args.topK,
      maxNodes: args.maxNodes,
    });
  } catch (e) {
    console.error(`graphsage-predictor: ${e.message}`);
    return 1;
  }

  if (args.out) {
    try {
      const outPath = path.resolve(args.out);
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, JSON.stringify(result, null, 2));
    } catch (e) {
      console.error(`graphsage-predictor: cannot write --out — ${e.message}`);
      return 1;
    }
  }

  const s = result.stats;
  console.log(
    `graphsage-predictor: ${s.nodeCount} nodes${s.truncated ? " (capped)" : ""}, ` +
    `${s.candidateCount} candidates, ${s.calibrated ? "calibrated" : "uncalibrated"} — ` +
    `top ${result.predictions.length}:`);
  for (const p of result.predictions) {
    console.log(`  ${p.u}  ->  ${p.v}   calibrated=${fmt(p.calibratedScore)}  raw=${fmt(p.rawScore)}`);
  }
  return 0;
}

const __isMain = (() => {
  try {
    return import.meta.url === pathToFileURL(process.argv[1] || "").href;
  } catch {
    return false;
  }
})();
if (__isMain) process.exit(main(process.argv.slice(2)));
