#!/usr/bin/env node
/**
 * graphsage-predictor.test.mjs — node:test suite for U5 (U-NNG-GRAPHSAGE-
 * PREDICT) of NN-GRAPH-MS0 (GraphSAGE link-prediction inference).
 *
 * Load-bearing invariants this suite pins:
 *  - the predictor surfaces REAL signal — trained on a graph with three
 *    held-out intra-cluster edges, it ranks those genuinely-missing edges
 *    ABOVE cross-cluster non-edges (a predictor that cannot tell a likely
 *    missing link from an unlikely one is worthless, R9);
 *  - candidate generation yields only true 2-hop NON-edges, is bounded, and
 *    is deterministic;
 *  - scoring is leak-free of the calibrator contract — no calibrator means
 *    calibratedScore == rawScore (honest), never a fabricated probability;
 *  - a checkpoint trained on a different feature layout is REJECTED loudly,
 *    not applied to produce garbage embeddings.
 * Deterministic, hermetic, no stubs.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { createModel } from "./graphsage-model.mjs";
import { saveCheckpoint } from "./graphsage-checkpoint.mjs";
import { canonicalEdgeKey, runTrainingPipeline } from "./graphsage-train-pipeline.mjs";
import { buildAdjacency } from "./graph-random-walk.mjs";
import { FEATURE_DIM } from "./systemviz-node-feature-projector.mjs";
import {
  PREDICT_DEFAULTS,
  loadPredictor,
  embedGraph,
  scoreLink,
  collectCandidateLinks,
  rankPredictions,
  predictMissingLinks,
  parseArgs,
  main,
} from "./graphsage-predictor.mjs";

/** A K-cluster graph: every intra-cluster pair is an edge, one bridge per pair. */
function clusterGraph(K, per) {
  const nodes = [];
  const edges = [];
  const statuses = ["completed", "in_progress", "not_started"];
  for (let c = 0; c < K; c++) {
    for (let i = 0; i < per; i++) {
      nodes.push({ id: `${c}_${i}`, layer: `L${c}`, status: statuses[c % statuses.length] });
    }
  }
  for (let c = 0; c < K; c++) {
    for (let i = 0; i < per; i++) {
      for (let j = i + 1; j < per; j++) edges.push({ source: `${c}_${i}`, target: `${c}_${j}` });
    }
  }
  for (let c = 0; c < K; c++) edges.push({ source: `${c}_1`, target: `${(c + 1) % K}_1` });
  return { nodes, edges };
}

/**
 * Fully-dense clusters MINUS one held-out intra-cluster edge per cluster.
 * The held-out pairs are genuinely absent from the training graph — a model
 * that learned cluster structure should rank them as likely missing links.
 */
function denseMinusHeldout(K, per) {
  const nodes = [];
  const edges = [];
  const heldout = [];
  for (let c = 0; c < K; c++) {
    for (let i = 0; i < per; i++) {
      nodes.push({ id: `${c}_${i}`, layer: `L${c}`, status: ["completed", "in_progress", "not_started"][c % 3], svi: 0.5 + 0.1 * c });
    }
  }
  for (let c = 0; c < K; c++) {
    for (let i = 0; i < per; i++) {
      for (let j = i + 1; j < per; j++) {
        if (i === 0 && j === per - 1) {
          heldout.push([`${c}_${i}`, `${c}_${j}`]); // hold this intra edge out
          continue;
        }
        edges.push({ source: `${c}_${i}`, target: `${c}_${j}` });
      }
    }
  }
  for (let c = 0; c < K; c++) edges.push({ source: `${c}_1`, target: `${(c + 1) % K}_1` });
  return { graph: { nodes, edges }, heldout };
}

/** Cluster prefix of a `${cluster}_${index}` node id. */
const clusterOf = (id) => String(id).split("_")[0];

// Train once on the held-out-edge graph; the result is reused across the
// signal tests (training is the slow step — memoize it, keep the suite fast).
// The cached object MUST be treated read-only: scoreLink/rankPredictions are
// pure and embedGraph builds fresh Maps, so reuse is safe — a future test that
// mutates the shared model/graph would silently corrupt its siblings.
let _signal = null;
function signalSetup() {
  if (_signal) return _signal;
  const { graph, heldout } = denseMinusHeldout(3, 16);
  const trained = runTrainingPipeline({ graph, epochs: 60, maxNodes: 500, seed: 5, hiddenDim: 32, embedDim: 16 });
  const predictor = loadPredictor(JSON.stringify(trained.checkpoint));
  _signal = { graph, heldout, predictor };
  return _signal;
}

/** A small trained predictor over a plain cluster graph (for mechanics tests). */
function quickPredictor() {
  const trained = runTrainingPipeline({ graph: clusterGraph(3, 10), epochs: 20, maxNodes: 500, seed: 3 });
  return { graph: clusterGraph(3, 10), predictor: loadPredictor(JSON.stringify(trained.checkpoint)) };
}

describe("loadPredictor", () => {
  it("loads a checkpoint object into a predictor handle", () => {
    const trained = runTrainingPipeline({ graph: clusterGraph(2, 8), epochs: 10, maxNodes: 500, seed: 1 });
    const p = loadPredictor(trained.checkpoint);
    assert.ok(p.model && p.model.config, "predictor must carry a model");
    assert.equal(p.model.layers.length, 2);
  });

  it("loads a checkpoint from a JSON string", () => {
    const trained = runTrainingPipeline({ graph: clusterGraph(2, 8), epochs: 10, maxNodes: 500, seed: 1 });
    const p = loadPredictor(JSON.stringify(trained.checkpoint));
    assert.ok(p.model.config.inputDim === FEATURE_DIM);
  });

  it("carries a bundled calibrator from a U4 checkpoint", () => {
    const trained = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 20, maxNodes: 500, seed: 5 });
    const p = loadPredictor(trained.checkpoint);
    assert.ok(p.calibrator, "a U4-trained checkpoint bundles a calibrator");
  });

  it("reports calibrator null when the checkpoint bundled none", () => {
    const model = createModel({ inputDim: FEATURE_DIM, hiddenDim: 4, embedDim: 3, seed: 1 });
    const p = loadPredictor(saveCheckpoint(model)); // no calibrator option
    assert.equal(p.calibrator, null);
  });

  it("throws on a corrupt checkpoint", () => {
    assert.throws(() => loadPredictor("{not a checkpoint"), /corrupt/);
  });
});

describe("embedGraph", () => {
  it("embeds every node of the graph", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings, nodeIds } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    assert.equal(embeddings.size, nodeIds.length);
    assert.equal(embeddings.size, graph.nodes.length);
    for (const z of embeddings.values()) assert.equal(z.length, predictor.model.config.embedDim);
  });

  it("flags truncated when the graph exceeds maxNodes", () => {
    const { graph, predictor } = quickPredictor();
    const { truncated, embeddings } = embedGraph(predictor.model, graph, { maxNodes: 10 });
    assert.equal(truncated, true);
    assert.ok(embeddings.size <= 10);
  });

  it("throws when the checkpoint inputDim does not match the feature layout", () => {
    // a model trained on a 6-d feature layout cannot embed an 8-d graph
    const wrong = createModel({ inputDim: 6, hiddenDim: 4, embedDim: 3, seed: 1 });
    assert.throws(() => embedGraph(wrong, clusterGraph(2, 6)), /mismatch/);
  });

  it("throws on a non-model argument", () => {
    assert.throws(() => embedGraph(null, clusterGraph(2, 6)), TypeError);
  });
});

describe("scoreLink", () => {
  it("returns raw and calibrated scores in [0,1]", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const s = scoreLink(embeddings, predictor.calibrator, "0_0", "0_3");
    assert.ok(s.rawScore >= 0 && s.rawScore <= 1);
    assert.ok(s.calibratedScore >= 0 && s.calibratedScore <= 1);
    assert.equal(s.u, "0_0");
    assert.equal(s.v, "0_3");
  });

  it("returns null when an endpoint has no embedding", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    assert.equal(scoreLink(embeddings, predictor.calibrator, "0_0", "ghost-node"), null);
  });

  it("calibratedScore equals rawScore when no calibrator is supplied", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const s = scoreLink(embeddings, null, "0_0", "0_3");
    assert.equal(s.calibratedScore, s.rawScore);
  });
});

describe("collectCandidateLinks", () => {
  function adjOf(graph) {
    const { adj } = buildAdjacency(graph, { undirected: true, maxNodes: 1000 });
    return adj;
  }

  it("returns only true non-edges", () => {
    const adj = adjOf(clusterGraph(3, 8));
    const cands = collectCandidateLinks(adj, {});
    for (const [u, v] of cands) {
      assert.ok(!(adj.get(u) || []).includes(v), `${u}-${v} is already an edge`);
      assert.notEqual(u, v);
    }
  });

  it("every candidate is a 2-hop pair and never a direct (1-hop) neighbour", () => {
    const adj = adjOf(clusterGraph(3, 8));
    const cands = collectCandidateLinks(adj, {});
    assert.ok(cands.length > 0, "the dense cluster graph must yield candidates");
    for (const [u, v] of cands) {
      assert.ok(!(adj.get(u) || []).includes(v), `${u}-${v} must not be a 1-hop neighbour`);
      const twoHop = (adj.get(u) || []).some((w) => (adj.get(w) || []).includes(v));
      assert.ok(twoHop, `${u}-${v} is not reachable in two hops`);
    }
  });

  it("honors the global candidate cap", () => {
    const cands = collectCandidateLinks(adjOf(clusterGraph(3, 10)), { maxCandidates: 5 });
    assert.ok(cands.length <= 5);
  });

  it("emits no duplicate candidate pair", () => {
    const cands = collectCandidateLinks(adjOf(clusterGraph(3, 8)), {});
    const keys = new Set(cands.map(([u, v]) => canonicalEdgeKey(u, v)));
    assert.equal(keys.size, cands.length);
  });

  it("is deterministic for a fixed graph", () => {
    const adj = adjOf(clusterGraph(3, 8));
    assert.deepEqual(collectCandidateLinks(adj, {}), collectCandidateLinks(adj, {}));
  });

  it("returns empty for a non-Map adjacency", () => {
    assert.deepEqual(collectCandidateLinks(null, {}), []);
  });
});

describe("rankPredictions", () => {
  it("ranks by calibrated score, highest first", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings, adjacency } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const cands = collectCandidateLinks(adjacency, {});
    const ranked = rankPredictions(embeddings, predictor.calibrator, cands, { topK: 10 });
    for (let i = 1; i < ranked.length; i++) {
      assert.ok(ranked[i - 1].calibratedScore >= ranked[i].calibratedScore, "ranking must be non-increasing");
    }
  });

  it("honors topK", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings, adjacency } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const cands = collectCandidateLinks(adjacency, {});
    const ranked = rankPredictions(embeddings, predictor.calibrator, cands, { topK: 3 });
    assert.ok(ranked.length <= 3);
  });

  it("is deterministic (stable tie-break)", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings, adjacency } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const cands = collectCandidateLinks(adjacency, {});
    const a = rankPredictions(embeddings, predictor.calibrator, cands, { topK: 8 });
    const b = rankPredictions(embeddings, predictor.calibrator, cands, { topK: 8 });
    assert.deepEqual(a, b);
  });

  it("skips candidates whose endpoint has no embedding", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const ranked = rankPredictions(embeddings, predictor.calibrator, [["0_0", "ghost"]], { topK: 5 });
    assert.equal(ranked.length, 0);
  });

  it("returns empty for no candidates", () => {
    const { graph, predictor } = quickPredictor();
    const { embeddings } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    assert.deepEqual(rankPredictions(embeddings, predictor.calibrator, [], {}), []);
  });
});

describe("link-prediction signal (R9 — the predictor must surface real missing links)", () => {
  it("scores every held-out intra-cluster edge above every cross-cluster non-edge", () => {
    const { predictor, graph, heldout } = signalSetup();
    const { embeddings } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const crossPairs = [["0_3", "1_7"], ["0_5", "2_9"], ["1_4", "2_11"]];
    const heldScores = heldout.map(([u, v]) => scoreLink(embeddings, predictor.calibrator, u, v).calibratedScore);
    const crossScores = crossPairs.map(([u, v]) => scoreLink(embeddings, predictor.calibrator, u, v).calibratedScore);
    const minHeld = Math.min(...heldScores);
    const maxCross = Math.max(...crossScores);
    // A trained model yields a wide margin (~0.49 on this fixture); an untrained
    // model collapses every score to one value (margin 0). The 0.2 floor proves
    // the predictor surfaces LEARNED signal, not a lucky 3-vs-3 ordering.
    assert.ok(minHeld - maxCross > 0.2,
      `held-out intra-cluster edges (min ${minHeld}) must outscore cross-cluster ` +
      `non-edges (max ${maxCross}) by a clear margin`);
  });

  it("ranks the held-out intra-cluster edges at the very top of a mixed candidate list", () => {
    const { predictor, graph, heldout } = signalSetup();
    const { embeddings } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const crossPairs = [["0_3", "1_7"], ["0_5", "2_9"], ["1_4", "2_11"]];
    const ranked = rankPredictions(embeddings, predictor.calibrator, [...heldout, ...crossPairs], { topK: 6 });
    const topCluster = ranked.slice(0, heldout.length);
    for (const p of topCluster) {
      assert.equal(clusterOf(p.u), clusterOf(p.v), `top prediction ${p.u}-${p.v} must be an intra-cluster link`);
    }
  });
});

describe("predictMissingLinks", () => {
  it("returns ranked predictions and a stats block end-to-end", () => {
    const { graph, predictor } = quickPredictor();
    const r = predictMissingLinks(predictor, graph, { topK: 10, maxNodes: 500 });
    assert.ok(Array.isArray(r.predictions));
    assert.ok(r.predictions.length <= 10);
    assert.equal(r.stats.returned, r.predictions.length);
    assert.equal(r.stats.calibrated, true);
    assert.equal(typeof r.stats.nodeCount, "number");
    assert.equal(typeof r.stats.candidateCount, "number");
  });

  it("every prediction is a non-edge with scores in [0,1]", () => {
    const { graph, predictor } = quickPredictor();
    const { adjacency } = embedGraph(predictor.model, graph, { maxNodes: 500 });
    const r = predictMissingLinks(predictor, graph, { topK: 20, maxNodes: 500 });
    for (const p of r.predictions) {
      assert.ok(!(adjacency.get(p.u) || []).includes(p.v), `${p.u}-${p.v} is already an edge`);
      assert.ok(p.calibratedScore >= 0 && p.calibratedScore <= 1);
      assert.ok(p.rawScore >= 0 && p.rawScore <= 1);
    }
  });

  it("throws on a non-predictor argument", () => {
    assert.throws(() => predictMissingLinks({}, clusterGraph(2, 6)), TypeError);
  });
});

describe("parseArgs", () => {
  it("parses string and numeric flags", () => {
    const a = parseArgs(["--checkpoint", "/c.json", "--graph", "/g.json", "--top-k", "25", "--max-nodes", "900"]);
    assert.equal(a.checkpoint, "/c.json");
    assert.equal(a.graph, "/g.json");
    assert.equal(a.topK, 25);
    assert.equal(a.maxNodes, 900);
  });

  it("parses --help", () => {
    assert.equal(parseArgs(["--help"]).help, true);
  });

  it("throws on an unknown flag", () => {
    assert.throws(() => parseArgs(["--nope"]), /unknown argument/);
  });

  it("throws when a flag is missing its value", () => {
    assert.throws(() => parseArgs(["--checkpoint"]), /needs a value/);
    assert.throws(() => parseArgs(["--top-k"]), /needs a finite number/);
  });
});

describe("main (CLI)", () => {
  function withTmp(fn) {
    const dir = fs.mkdtempSync(path.join(os.tmpdir(), "gsage-pred-"));
    try {
      return fn(dir);
    } finally {
      fs.rmSync(dir, { recursive: true, force: true });
    }
  }

  it("--help returns 0", () => {
    assert.equal(main(["--help"]), 0);
  });

  it("returns 2 on an unparseable argument", () => {
    assert.equal(main(["--bogus"]), 2);
  });

  it("returns 2 when the checkpoint file is missing", () => {
    assert.equal(main(["--checkpoint", path.join(os.tmpdir(), "no-such-checkpoint.json")]), 2);
  });

  it("loads a checkpoint + graph and prints ranked predictions", () => {
    withTmp((dir) => {
      const graph = clusterGraph(3, 12);
      const trained = runTrainingPipeline({ graph, epochs: 15, maxNodes: 500, seed: 5 });
      const cpPath = path.join(dir, "cp.json");
      const graphPath = path.join(dir, "graph.json");
      const outPath = path.join(dir, "predictions.json");
      fs.writeFileSync(cpPath, JSON.stringify(trained.checkpoint));
      fs.writeFileSync(graphPath, JSON.stringify(graph));
      const code = main(["--checkpoint", cpPath, "--graph", graphPath, "--out", outPath, "--top-k", "5"]);
      assert.equal(code, 0);
      assert.ok(fs.existsSync(outPath), "the --out predictions file must exist");
      const written = JSON.parse(fs.readFileSync(outPath, "utf8"));
      assert.ok(Array.isArray(written.predictions));
      assert.ok(written.predictions.length <= 5);
    });
  });
});

describe("PREDICT_DEFAULTS", () => {
  it("is frozen and carries the documented knobs", () => {
    assert.ok(Object.isFrozen(PREDICT_DEFAULTS));
    for (const k of ["maxNodes", "maxCandidatesPerNode", "maxCandidates", "topK"]) {
      assert.ok(Number.isInteger(PREDICT_DEFAULTS[k]), `${k} must be an integer default`);
    }
  });
});
