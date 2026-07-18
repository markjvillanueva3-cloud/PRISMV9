#!/usr/bin/env node
/**
 * graphsage-train-pipeline.test.mjs — node:test suite for U4 component (d) of
 * NN-GRAPH-MS0 (the end-to-end GraphSAGE training pipeline orchestrator).
 *
 * Load-bearing invariants this suite pins:
 *  - the pipeline genuinely LEARNS — on a graph with a crisp cluster signal
 *    the held-out AUROC lands well above the 0.5 random baseline (a test that
 *    cannot tell a working model from a broken one is worthless, R9);
 *  - the train/test split is a true partition with no edge in both halves, and
 *    a real edge is never sampled as an evaluation negative (no leakage);
 *  - the run is seed-deterministic — identical inputs reconstruct an identical
 *    checkpoint — and degenerate inputs are SKIPPED, not silently shipped;
 *  - argument parsing rejects malformed flags loudly, and the CLI writes a
 *    checkpoint that round-trips through loadCheckpoint.
 * Deterministic, hermetic, no stubs.
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { mulberry32 } from "./graph-random-walk.mjs";
import { createModel } from "./graphsage-model.mjs";
import { loadCheckpoint } from "./graphsage-checkpoint.mjs";
import { FEATURE_DIM } from "./systemviz-node-feature-projector.mjs";
import {
  PIPELINE_DEFAULTS,
  canonicalEdgeKey,
  collectUndirectedEdges,
  splitEdges,
  buildTrainAdjacency,
  sampleEvalNegatives,
  evaluatePipeline,
  extractNodeTypes,
  sampleStratifiedEvalNegatives,
  loadEmbeddingFeatures,
  runTrainingPipeline,
  parseArgs,
  main,
} from "./graphsage-train-pipeline.mjs";

/**
 * A K-cluster graph: every intra-cluster node pair is an edge (a crisp
 * link-prediction signal — same-cluster pairs ARE edges, cross-cluster ones
 * are not), plus one bridge per consecutive cluster pair.
 */
function clusterGraph(K, per) {
  const nodes = [];
  const edges = [];
  const statuses = ["completed", "in_progress", "not_started", "beta"];
  for (let c = 0; c < K; c++) {
    for (let i = 0; i < per; i++) {
      nodes.push({ id: `${c}_${i}`, layer: `L${c}`, status: statuses[c % statuses.length], svi: 0.5 + 0.1 * c });
    }
  }
  for (let c = 0; c < K; c++) {
    for (let i = 0; i < per; i++) {
      for (let j = i + 1; j < per; j++) edges.push({ source: `${c}_${i}`, target: `${c}_${j}` });
    }
  }
  for (let c = 0; c < K; c++) edges.push({ source: `${c}_0`, target: `${(c + 1) % K}_0` });
  return { nodes, edges };
}

/** A simple symmetric adjacency Map from an undirected edge list. */
function adjOf(pairs) {
  const m = new Map();
  for (const [u, v] of pairs) {
    if (!m.has(u)) m.set(u, []);
    if (!m.has(v)) m.set(v, []);
    if (!m.get(u).includes(v)) m.get(u).push(v);
    if (!m.get(v).includes(u)) m.get(v).push(u);
  }
  return m;
}

describe("canonicalEdgeKey", () => {
  it("is order-independent", () => {
    assert.equal(canonicalEdgeKey("a", "b"), canonicalEdgeKey("b", "a"));
  });

  it("distinguishes distinct pairs", () => {
    assert.notEqual(canonicalEdgeKey("a", "b"), canonicalEdgeKey("a", "c"));
  });

  it("does not collide when an id contains the would-be separator", () => {
    // a single-char separator would alias ("a","b,c") and ("a,b","c") — the
    // JSON.stringify form does not.
    assert.notEqual(canonicalEdgeKey("a", "b,c"), canonicalEdgeKey("a,b", "c"));
    assert.notEqual(canonicalEdgeKey("a", 'b"c'), canonicalEdgeKey('a"b', "c"));
  });
});

describe("collectUndirectedEdges", () => {
  it("returns each undirected edge exactly once from a symmetric map", () => {
    const adj = adjOf([["a", "b"], ["b", "c"], ["a", "c"]]);
    const { edges, edgeKeySet } = collectUndirectedEdges(adj);
    assert.equal(edges.length, 3);
    assert.equal(edgeKeySet.size, 3);
  });

  it("skips self-loops", () => {
    const adj = new Map([["a", ["a", "b"]], ["b", ["a"]]]);
    const { edges } = collectUndirectedEdges(adj);
    assert.equal(edges.length, 1);
    assert.deepEqual(edges[0].slice().sort(), ["a", "b"]);
  });

  it("returns empty for a non-Map input", () => {
    const { edges, edgeKeySet } = collectUndirectedEdges(null);
    assert.equal(edges.length, 0);
    assert.equal(edgeKeySet.size, 0);
  });

  it("edgeKeySet has one key per undirected edge", () => {
    const adj = adjOf([["x", "y"], ["y", "z"]]);
    const { edges, edgeKeySet } = collectUndirectedEdges(adj);
    assert.equal(edgeKeySet.size, edges.length);
  });
});

describe("splitEdges", () => {
  const edges = Array.from({ length: 50 }, (_, i) => [`a${i}`, `b${i}`]);

  it("partitions the edge set with no overlap", () => {
    const { trainEdges, testEdges } = splitEdges(edges, 0.2, mulberry32(1));
    assert.equal(trainEdges.length + testEdges.length, edges.length);
    const trainKeys = new Set(trainEdges.map(([u, v]) => canonicalEdgeKey(u, v)));
    for (const [u, v] of testEdges) {
      assert.ok(!trainKeys.has(canonicalEdgeKey(u, v)), "an edge must not be in both halves");
    }
  });

  it("honors the test fraction (approximately)", () => {
    const { testEdges } = splitEdges(edges, 0.2, mulberry32(1));
    assert.equal(testEdges.length, 10); // round(50 * 0.2)
  });

  it("always keeps at least one train edge, even at testFraction 1", () => {
    const { trainEdges, testEdges } = splitEdges(edges, 1, mulberry32(1));
    assert.equal(trainEdges.length, 1);
    assert.equal(testEdges.length, 49);
  });

  it("returns both empty for an empty edge list", () => {
    const { trainEdges, testEdges } = splitEdges([], 0.2, mulberry32(1));
    assert.equal(trainEdges.length, 0);
    assert.equal(testEdges.length, 0);
  });

  it("a single edge yields one train edge and no test edge", () => {
    const { trainEdges, testEdges } = splitEdges([["a", "b"]], 0.5, mulberry32(1));
    assert.equal(trainEdges.length, 1);
    assert.equal(testEdges.length, 0);
  });

  it("is deterministic for a fixed seed", () => {
    const a = splitEdges(edges, 0.3, mulberry32(7));
    const b = splitEdges(edges, 0.3, mulberry32(7));
    assert.deepEqual(a.trainEdges, b.trainEdges);
    assert.deepEqual(a.testEdges, b.testEdges);
  });
});

describe("buildTrainAdjacency", () => {
  it("builds a symmetric adjacency map", () => {
    const adj = buildTrainAdjacency([["a", "b"], ["b", "c"]]);
    assert.ok(adj.get("a").includes("b"));
    assert.ok(adj.get("b").includes("a"));
    assert.ok(adj.get("b").includes("c"));
    assert.ok(adj.get("c").includes("b"));
  });

  it("deduplicates a repeated edge", () => {
    const adj = buildTrainAdjacency([["a", "b"], ["a", "b"], ["b", "a"]]);
    assert.equal(adj.get("a").filter((x) => x === "b").length, 1);
  });

  it("skips self-loops", () => {
    const adj = buildTrainAdjacency([["a", "a"], ["a", "b"]]);
    assert.ok(!(adj.get("a") || []).includes("a"));
    assert.ok(adj.get("a").includes("b"));
  });
});

describe("sampleEvalNegatives", () => {
  it("never returns a real edge", () => {
    const adj = adjOf([["a", "b"], ["b", "c"], ["c", "d"], ["a", "d"]]);
    const { edgeKeySet } = collectUndirectedEdges(adj);
    const negs = sampleEvalNegatives(["a", "b", "c", "d"], edgeKeySet, 10, mulberry32(3));
    for (const [u, v] of negs) {
      assert.ok(!edgeKeySet.has(canonicalEdgeKey(u, v)), `${u}-${v} is a real edge`);
    }
  });

  it("never returns a self-loop", () => {
    const negs = sampleEvalNegatives(["a", "b", "c", "d"], new Set(), 20, mulberry32(3));
    for (const [u, v] of negs) assert.notEqual(u, v);
  });

  it("returns at most `count` and no duplicates", () => {
    const negs = sampleEvalNegatives(["a", "b", "c", "d", "e"], new Set(), 4, mulberry32(9));
    assert.ok(negs.length <= 4);
    const keys = new Set(negs.map(([u, v]) => canonicalEdgeKey(u, v)));
    assert.equal(keys.size, negs.length);
  });

  it("terminates (does not hang) on a saturated graph", () => {
    // 3 nodes, all 3 possible edges present — zero negatives exist.
    const adj = adjOf([["a", "b"], ["b", "c"], ["a", "c"]]);
    const { edgeKeySet } = collectUndirectedEdges(adj);
    const negs = sampleEvalNegatives(["a", "b", "c"], edgeKeySet, 10, mulberry32(1));
    assert.equal(negs.length, 0);
  });

  it("returns empty for fewer than two nodes", () => {
    assert.equal(sampleEvalNegatives(["solo"], new Set(), 5, mulberry32(1)).length, 0);
  });

  it("is deterministic for a fixed seed", () => {
    const a = sampleEvalNegatives(["a", "b", "c", "d"], new Set(), 3, mulberry32(4));
    const b = sampleEvalNegatives(["a", "b", "c", "d"], new Set(), 3, mulberry32(4));
    assert.deepEqual(a, b);
  });
});

describe("evaluatePipeline", () => {
  function tinyFeatures(ids) {
    const m = new Map();
    for (let k = 0; k < ids.length; k++) {
      const f = new Float64Array(FEATURE_DIM);
      for (let i = 0; i < FEATURE_DIM; i++) f[i] = ((k + 1) * (i + 1)) % 5 / 5;
      m.set(ids[k], f);
    }
    return m;
  }

  it("scores test edges as positives and negatives as 0", () => {
    const ids = ["a", "b", "c", "d"];
    const model = createModel({ inputDim: FEATURE_DIM, hiddenDim: 4, embedDim: 3, seed: 1 });
    const adj = buildTrainAdjacency([["a", "b"], ["c", "d"]]);
    const out = evaluatePipeline(model, adj, tinyFeatures(ids), [["a", "b"]], [["a", "c"]]);
    assert.equal(out.scores.length, 2);
    assert.deepEqual(out.labels, [1, 0]);
    for (const s of out.scores) assert.ok(s >= 0 && s <= 1, "a sigmoid score is in [0,1]");
  });

  it("auroc is null when only one class is present", () => {
    const ids = ["a", "b", "c"];
    const model = createModel({ inputDim: FEATURE_DIM, hiddenDim: 4, embedDim: 3, seed: 1 });
    const adj = buildTrainAdjacency([["a", "b"]]);
    const out = evaluatePipeline(model, adj, tinyFeatures(ids), [["a", "b"]], []);
    assert.equal(out.auroc, null);
  });

  it("skips a pair whose endpoint has no embedding", () => {
    const ids = ["a", "b"];
    const model = createModel({ inputDim: FEATURE_DIM, hiddenDim: 4, embedDim: 3, seed: 1 });
    const adj = buildTrainAdjacency([["a", "b"]]);
    const out = evaluatePipeline(model, adj, tinyFeatures(ids), [["a", "ghost"]], []);
    assert.equal(out.scores.length, 0);
  });
});

describe("runTrainingPipeline", () => {
  it("trains end-to-end and returns a checkpoint that loadCheckpoint accepts", () => {
    const r = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 20, maxNodes: 500, seed: 5 });
    assert.equal(r.skipped, false);
    assert.match(r.metrics.trainedAt, /^\d{4}-\d\d-\d\dT/, "trainedAt must be an ISO timestamp");
    const round = loadCheckpoint(JSON.stringify(r.checkpoint));
    assert.equal(round.model.layers.length, 2);
    assert.equal(round.model.layers[1].activation, "linear");
  });

  it("genuinely learns — held-out AUROC is well above the 0.5 random baseline", () => {
    // Deterministic: a fixed graph + seed yields exactly one AUROC. The dense
    // cluster signal is crisp, so a correctly-wired pipeline clears 0.78 (the
    // milestone exit gate); a broken pipeline collapses to ~0.5.
    const r = runTrainingPipeline({
      graph: clusterGraph(3, 16),
      epochs: 60,
      maxNodes: 500,
      seed: 5,
      hiddenDim: 32,
      embedDim: 16,
      testFraction: 0.2,
    });
    assert.equal(r.skipped, false);
    assert.ok(r.metrics.auroc > 0.78, `expected AUROC > 0.78, got ${r.metrics.auroc}`);
  });

  it("trains successfully and reports a finite final loss", () => {
    const r = runTrainingPipeline({ graph: clusterGraph(3, 14), epochs: 80, maxNodes: 500, seed: 2 });
    assert.equal(r.metrics.trained, true);
    assert.ok(Number.isFinite(r.metrics.finalLoss), "finalLoss must be a real number");
  });

  it("skips a graph with no edges field at all (no throw)", () => {
    // normalizeGraph throws on a missing edges array — the pipeline must
    // screen for it and return {skipped} per its documented contract.
    const r = runTrainingPipeline({ graph: { nodes: [{ id: "a" }, { id: "b" }] } });
    assert.equal(r.skipped, true);
    assert.match(r.reason, /no usable edges/);
  });

  it("skips a graph with no edges instead of shipping a degenerate checkpoint", () => {
    const r = runTrainingPipeline({ graph: { nodes: [{ id: "a" }, { id: "b" }], edges: [] }, epochs: 5 });
    assert.equal(r.skipped, true);
    assert.match(r.reason, /no usable edges/);
    assert.equal(r.checkpoint, undefined);
  });

  it("is seed-deterministic — identical inputs reconstruct identical weights", () => {
    const opts = { graph: clusterGraph(2, 10), epochs: 25, maxNodes: 500, seed: 8 };
    const a = runTrainingPipeline(opts);
    const b = runTrainingPipeline(opts);
    // Compares layers only — metadata.trainedAt is wall-clock and would differ.
    assert.deepEqual(a.checkpoint.layers, b.checkpoint.layers);
  });

  it("a different seed produces different weights", () => {
    const a = runTrainingPipeline({ graph: clusterGraph(2, 10), epochs: 25, maxNodes: 500, seed: 8 });
    const b = runTrainingPipeline({ graph: clusterGraph(2, 10), epochs: 25, maxNodes: 500, seed: 9 });
    assert.notDeepEqual(a.checkpoint.layers, b.checkpoint.layers);
  });

  it("input dimension equals the feature projector dimension", () => {
    const r = runTrainingPipeline({ graph: clusterGraph(2, 10), epochs: 10, maxNodes: 500, seed: 1 });
    assert.equal(r.metrics.inputDim, FEATURE_DIM);
    assert.equal(r.checkpoint.config.inputDim, FEATURE_DIM);
  });

  it("emits no non-finite number in the bundled metrics", () => {
    const r = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 20, maxNodes: 500, seed: 5 });
    for (const [k, v] of Object.entries(r.metrics)) {
      if (typeof v === "number") {
        assert.ok(Number.isFinite(v), `metrics.${k} must be finite (got ${v})`);
      }
    }
  });

  it("bundles the calibrator into the checkpoint", () => {
    const r = runTrainingPipeline({ graph: clusterGraph(3, 14), epochs: 20, maxNodes: 500, seed: 5 });
    assert.ok(r.checkpoint.calibrator, "calibrator must be bundled");
    assert.equal(typeof r.checkpoint.calibrator.reliable, "boolean");
  });

  it("uses an injected loadGraphFn when no graph is passed", () => {
    let calls = 0;
    const loadGraphFn = () => {
      calls++;
      return clusterGraph(2, 9);
    };
    const r = runTrainingPipeline({ loadGraphFn, epochs: 10, maxNodes: 500, seed: 1 });
    assert.equal(calls, 1);
    assert.equal(r.skipped, false);
  });

  it("flags truncated when the node count exceeds maxNodes", () => {
    // clusterGraph(3,16) = 48 nodes > maxNodes 20 -> the cap engages exactly.
    const r = runTrainingPipeline({ graph: clusterGraph(3, 16), epochs: 10, maxNodes: 20, seed: 1 });
    assert.equal(r.metrics.truncated, true);
    assert.equal(r.metrics.cappedNodes, 20);
  });

  it("throws a TypeError on a non-object graph", () => {
    assert.throws(() => runTrainingPipeline({ graph: 42 }), TypeError);
  });
});

// U-GNN-HETEROPHILY-WIRE: the H2GCN feature-enrichment seam in runTrainingPipeline.
describe("runTrainingPipeline -- heterophily (H2GCN) feature enrichment", () => {
  it("heterophilyHops:0 (default) is a no-op -- metrics.heterophily null, inputDim unchanged", () => {
    const base = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 10, maxNodes: 500, seed: 5 });
    assert.equal(base.skipped, false);
    assert.equal(base.metrics.heterophily, null);
    // explicit 0 must equal the default (both no-op)
    const explicit0 = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 10, maxNodes: 500, seed: 5, heterophilyHops: 0 });
    assert.equal(explicit0.metrics.inputDim, base.metrics.inputDim);
    assert.equal(explicit0.metrics.heterophily, null);
    // PROVE byte-identity (don't just argue it): the hops:0 code path must reconstruct
    // the EXACT same trained weights as the legacy default (same seed). The block is
    // >0-gated and consumes no RNG, so layers must deep-equal -- mirrors the sibling
    // seed-determinism + LEGACY-PARITY assertions in this file.
    assert.deepEqual(explicit0.checkpoint.layers, base.checkpoint.layers);
  });

  it("PIPELINE_DEFAULTS pin heterophily off-by-default (a nonzero default would silently widen every fleet retrain)", () => {
    assert.equal(PIPELINE_DEFAULTS.heterophilyHops, 0);
    assert.equal(PIPELINE_DEFAULTS.heterophilyNormalize, "mean");
  });

  it("heterophilyHops>0 widens inputDim to egoDim*(1+hops) and still trains (createModel sees the new dim)", () => {
    const baseDim = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 5, maxNodes: 500, seed: 5 }).metrics.inputDim;
    const r2 = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 10, maxNodes: 500, seed: 5, heterophilyHops: 2 });
    assert.equal(r2.skipped, false, "must still train, not skip");
    assert.ok(r2.metrics.heterophily, "metrics.heterophily must be populated when hops>0");
    assert.equal(r2.metrics.heterophily.hops, 2);
    assert.equal(r2.metrics.heterophily.egoDim, baseDim);
    assert.equal(r2.metrics.heterophily.embeddingDim, baseDim * 3); // egoDim * (1 + 2)
    assert.equal(r2.metrics.inputDim, baseDim * 3, "inputDim must be reassigned to the widened dim before createModel");
    assert.equal(r2.metrics.heterophily.droppedEdges, 0, "train-edge endpoints are all in the feature set -> no drops");
    assert.equal(r2.metrics.heterophily.normalize, "mean");
    assert.ok(Number.isFinite(r2.metrics.finalLoss), "the widened-feature model must still train to a finite loss");
  });

  it("heterophilyHops=3 widens to egoDim*4 (stride parity with the lib)", () => {
    const baseDim = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 5, maxNodes: 500, seed: 7 }).metrics.inputDim;
    const r3 = runTrainingPipeline({ graph: clusterGraph(3, 12), epochs: 5, maxNodes: 500, seed: 7, heterophilyHops: 3 });
    assert.equal(r3.metrics.inputDim, baseDim * 4);
    assert.equal(r3.metrics.heterophily.embeddingDim, baseDim * 4);
  });
});

describe("parseArgs", () => {
  it("parses numeric flags", () => {
    const a = parseArgs(["--epochs", "40", "--seed", "7", "--max-nodes", "1000"]);
    assert.equal(a.epochs, 40);
    assert.equal(a.seed, 7);
    assert.equal(a.maxNodes, 1000);
  });

  it("parses the --graph and --out string flags", () => {
    const a = parseArgs(["--graph", "/tmp/g.json", "--out", "/tmp/c.json"]);
    assert.equal(a.graph, "/tmp/g.json");
    assert.equal(a.out, "/tmp/c.json");
  });

  it("parses --help", () => {
    assert.equal(parseArgs(["--help"]).help, true);
    assert.equal(parseArgs(["-h"]).help, true);
  });

  it("throws on an unknown flag", () => {
    assert.throws(() => parseArgs(["--bogus"]), /unknown argument/);
  });

  it("throws when a flag is missing its value", () => {
    assert.throws(() => parseArgs(["--graph"]), /needs a value/);
    assert.throws(() => parseArgs(["--epochs"]), /needs a finite number/);
  });

  it("throws when a numeric flag gets a non-numeric value", () => {
    assert.throws(() => parseArgs(["--epochs", "lots"]), /needs a finite number/);
  });

  it("returns an empty object for no arguments", () => {
    assert.deepEqual(parseArgs([]), {});
  });

  it("parses --heterophily-hops (numeric) and --heterophily-normalize (string)", () => {
    const a = parseArgs(["--heterophily-hops", "2", "--heterophily-normalize", "sum"]);
    assert.equal(a.heterophilyHops, 2);
    assert.equal(a.heterophilyNormalize, "sum");
  });

  it("throws when --heterophily-hops is non-numeric / --heterophily-normalize is valueless", () => {
    assert.throws(() => parseArgs(["--heterophily-hops", "two"]), /needs a finite number/);
    assert.throws(() => parseArgs(["--heterophily-normalize"]), /needs a value/);
  });
});

describe("main (CLI)", () => {
  let tmpDir;

  function withTmp(fn) {
    tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), "gsage-pipe-"));
    try {
      return fn(tmpDir);
    } finally {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }

  it("--help prints usage and returns 0", () => {
    assert.equal(main(["--help"]), 0);
  });

  it("returns 2 on an unparseable argument", () => {
    assert.equal(main(["--bogus"]), 2);
  });

  it("returns 2 when --graph points at a missing file", () => {
    assert.equal(main(["--graph", path.join(os.tmpdir(), "does-not-exist-graph.json")]), 2);
  });

  it("trains a graph file and writes a checkpoint that round-trips", () => {
    withTmp((dir) => {
      const graphPath = path.join(dir, "graph.json");
      const outPath = path.join(dir, "checkpoint.json");
      fs.writeFileSync(graphPath, JSON.stringify(clusterGraph(3, 12)));
      const code = main(["--graph", graphPath, "--out", outPath, "--epochs", "15", "--seed", "5"]);
      assert.equal(code, 0);
      assert.ok(fs.existsSync(outPath), "checkpoint file must exist");
      const round = loadCheckpoint(fs.readFileSync(outPath, "utf8"));
      assert.equal(round.model.layers.length, 2);
    });
  });

  it("returns 1 when the graph file has no edges", () => {
    withTmp((dir) => {
      const graphPath = path.join(dir, "empty.json");
      fs.writeFileSync(graphPath, JSON.stringify({ nodes: [{ id: "a" }], edges: [] }));
      assert.equal(main(["--graph", graphPath, "--out", path.join(dir, "c.json")]), 1);
    });
  });

  it("threads --heterophily-hops through to the pipeline (widens the persisted checkpoint inputDim)", () => {
    withTmp((dir) => {
      const graphPath = path.join(dir, "graph.json");
      fs.writeFileSync(graphPath, JSON.stringify(clusterGraph(3, 12)));
      const baseOut = path.join(dir, "base.json");
      const h2Out = path.join(dir, "h2.json");
      assert.equal(main(["--graph", graphPath, "--out", baseOut, "--epochs", "8", "--seed", "5"]), 0);
      assert.equal(main(["--graph", graphPath, "--out", h2Out, "--epochs", "8", "--seed", "5", "--heterophily-hops", "2"]), 0);
      const base = JSON.parse(fs.readFileSync(baseOut, "utf8"));
      const h2 = JSON.parse(fs.readFileSync(h2Out, "utf8"));
      // The CLI flag must reach runTrainingPipeline: hops=2 widens inputDim to 3x ego.
      assert.equal(h2.metadata.inputDim, base.metadata.inputDim * 3);
      assert.equal(h2.metadata.heterophily.hops, 2);
      assert.equal(base.metadata.heterophily, null);
    });
  });
});

// ──────────────────────────────────────────────────────────────────────────
// U-NNG-PIPELINE-STRATIFIED-WIRE: stratified negative-sampling integration.
//
// The trainer's stratified sampler already exists (graphsage-trainer.mjs ::
// sampleStratifiedNegativeEdges). This unit wires it through the pipeline:
//   - extractNodeTypes() pulls a node->type Map from the raw graph;
//   - sampleStratifiedEvalNegatives() draws eval negatives whose type
//     distribution matches the positive marginal (so eval AUROC measures
//     the same distribution the model is trained on);
//   - runTrainingPipeline() opts in via `nodeTypeField` + `negPHard` and
//     stamps stratification status into the metrics block.
//
// Real-value invariants pinned below: (a) byte-identical legacy path when
// nodeTypeField is unset (the deferred deploy gate must not regress), (b)
// stratified negatives never return real edges, (c) marginal-weighted
// bucket selection actually concentrates negatives on the heavy-marginal
// types, (d) CLI flag round-trip.

describe("extractNodeTypes", () => {
  it("returns null when fieldName is null", () => {
    const g = { nodes: [{ id: "a", layer: "L0" }], edges: [] };
    assert.equal(extractNodeTypes(g, null), null);
  });

  it("returns null when fieldName is an empty string", () => {
    const g = { nodes: [{ id: "a", layer: "L0" }], edges: [] };
    assert.equal(extractNodeTypes(g, ""), null);
  });

  it("returns null when no node carries the named field", () => {
    const g = { nodes: [{ id: "a" }, { id: "b" }], edges: [] };
    assert.equal(extractNodeTypes(g, "layer"), null);
  });

  it("returns null when the graph is null / not an object", () => {
    assert.equal(extractNodeTypes(null, "layer"), null);
    assert.equal(extractNodeTypes("not an object", "layer"), null);
  });

  it("returns a Map<id,type> for nodes carrying the field", () => {
    const g = {
      nodes: [
        { id: "a", layer: "L0" },
        { id: "b", layer: "L1" },
        { id: "c", layer: "L0" },
      ],
      edges: [],
    };
    const m = extractNodeTypes(g, "layer");
    assert.ok(m instanceof Map);
    assert.equal(m.size, 3);
    assert.equal(m.get("a"), "L0");
    assert.equal(m.get("b"), "L1");
    assert.equal(m.get("c"), "L0");
  });

  it("skips nodes without an id", () => {
    const g = { nodes: [{ layer: "L0" }, { id: "b", layer: "L1" }], edges: [] };
    const m = extractNodeTypes(g, "layer");
    assert.equal(m.size, 1);
    assert.equal(m.get("b"), "L1");
  });

  it("skips nodes whose field is undefined / null", () => {
    const g = {
      nodes: [
        { id: "a", layer: undefined },
        { id: "b", layer: null },
        { id: "c", layer: "L1" },
      ],
      edges: [],
    };
    const m = extractNodeTypes(g, "layer");
    assert.equal(m.size, 1);
    assert.equal(m.get("c"), "L1");
  });

  it("treats numeric and boolean type labels as opaque scalar keys", () => {
    const g = {
      nodes: [{ id: "a", kind: 3 }, { id: "b", kind: 3 }, { id: "c", kind: false }],
      edges: [],
    };
    const m = extractNodeTypes(g, "kind");
    assert.equal(m.size, 3);
    assert.equal(m.get("a"), 3);
    assert.equal(m.get("c"), false);
  });
});

describe("sampleStratifiedEvalNegatives", () => {
  it("falls back to uniform when nodeType is missing", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const edgeKeySet = new Set();
    // Two seeded runs must produce IDENTICAL negatives — the legacy uniform
    // sampler is byte-identical when stratification is unusable (the
    // deploy-gate retry depends on this fallback being lossless).
    const out1 = sampleStratifiedEvalNegatives(ids, edgeKeySet, 4, mulberry32(7));
    const out2 = sampleEvalNegatives(ids, edgeKeySet, 4, mulberry32(7));
    assert.deepEqual(out1, out2);
  });

  it("falls back to uniform when typeMarginal is empty", () => {
    const ids = ["a", "b", "c", "d", "e"];
    const edgeKeySet = new Set();
    const nodeType = new Map([["a", "X"], ["b", "X"], ["c", "Y"]]);
    const out1 = sampleStratifiedEvalNegatives(ids, edgeKeySet, 3, mulberry32(7),
      { nodeType, typeMarginal: new Map(), pHard: 0.7 });
    const out2 = sampleEvalNegatives(ids, edgeKeySet, 3, mulberry32(7));
    assert.deepEqual(out1, out2);
  });

  it("never returns a real edge", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const edgeKeySet = new Set([
      canonicalEdgeKey("a", "b"),
      canonicalEdgeKey("c", "d"),
      canonicalEdgeKey("e", "f"),
    ]);
    const nodeType = new Map([
      ["a", "X"], ["b", "X"], ["c", "X"],
      ["d", "Y"], ["e", "Y"], ["f", "Y"],
    ]);
    const typeMarginal = new Map([["X", 2], ["Y", 2]]);
    const negs = sampleStratifiedEvalNegatives(ids, edgeKeySet, 20, mulberry32(1),
      { nodeType, typeMarginal, pHard: 0.7 });
    for (const [u, v] of negs) {
      assert.ok(!edgeKeySet.has(canonicalEdgeKey(u, v)),
        `stratified sampler returned a real edge ${u}-${v}`);
      assert.notEqual(u, v, "stratified sampler returned a self-loop");
    }
  });

  it("concentrates intra-type pairs when pHard=1.0 and a hard bucket exists", () => {
    // Bigger fixture: 12 ids per type yields 12*11/2 = 66 distinct intra-type
    // pairs per bucket. Asking for 60 negs stays under the saturation ceiling
    // and gives the seen-set room to find every draw without exhausting the
    // attempts budget.
    const ids = [];
    const nodeType = new Map();
    for (let i = 0; i < 12; i++) { ids.push(`x${i}`); nodeType.set(`x${i}`, "X"); }
    for (let i = 0; i < 12; i++) { ids.push(`y${i}`); nodeType.set(`y${i}`, "Y"); }
    const edgeKeySet = new Set(); // no real edges -> nothing rejected
    const typeMarginal = new Map([["X", 1], ["Y", 1]]);
    const wanted = 60;
    const negs = sampleStratifiedEvalNegatives(ids, edgeKeySet, wanted, mulberry32(13),
      { nodeType, typeMarginal, pHard: 1.0 });
    let intra = 0, cross = 0;
    for (const [u, v] of negs) {
      if (nodeType.get(u) === nodeType.get(v)) intra++;
      else cross++;
    }
    // pHard=1.0 + every type has a hard bucket => every returned negative
    // MUST be intra-type. That's the unit's defining invariant — any cross
    // pair is a bug, not a "weaken the assertion" candidate (R9 / R12).
    assert.ok(negs.length >= wanted * 0.9,
      `expected ~${wanted} samples (got ${negs.length})`);
    assert.equal(cross, 0, `pHard=1 must produce 0 cross-type pairs (got ${cross})`);
    assert.ok(intra >= wanted * 0.9, `pHard=1 must produce ~${wanted} intra-type pairs (got ${intra})`);
  });

  it("mirrors per-type marginal mass when pHard=0", () => {
    // 30 ids per type -> 60*59/2 = 1770 distinct pairs, plenty of room
    // for the marginal-weighted draw without seen-set saturation. The X
    // marginal share is 4/5 so each endpoint draw is ~80% X under the
    // per-endpoint marginal-matched path (pHard=0 forces cross/independent
    // draws only). 400 negs -> 800 endpoint draws should give the law of
    // large numbers room to land near 0.8.
    const ids = [];
    const nodeType = new Map();
    for (let i = 0; i < 30; i++) { ids.push(`x${i}`); nodeType.set(`x${i}`, "X"); }
    for (let i = 0; i < 30; i++) { ids.push(`y${i}`); nodeType.set(`y${i}`, "Y"); }
    const edgeKeySet = new Set();
    const typeMarginal = new Map([["X", 4], ["Y", 1]]); // 4:1 mass on X
    const negs = sampleStratifiedEvalNegatives(ids, edgeKeySet, 400, mulberry32(5),
      { nodeType, typeMarginal, pHard: 0.0 });
    let xEnd = 0, yEnd = 0;
    for (const [u, v] of negs) {
      xEnd += (nodeType.get(u) === "X" ? 1 : 0) + (nodeType.get(v) === "X" ? 1 : 0);
      yEnd += (nodeType.get(u) === "Y" ? 1 : 0) + (nodeType.get(v) === "Y" ? 1 : 0);
    }
    const total = xEnd + yEnd;
    assert.ok(total >= 600, `expected >=600 endpoint draws (got ${total})`);
    // Theoretical X share = 4/5 = 0.8. Empirically the marginal-matched draw
    // lands inside [0.72, 0.88] across the seeded run (one sigma of slack);
    // a uniform-over-nodes draw would land near 0.5, which falls well
    // outside the lower bound — so this distinguishes the marginal path
    // from a silent degradation.
    const xShare = xEnd / total;
    assert.ok(xShare > 0.72 && xShare < 0.88,
      `marginal-mass-weighted draw expected X-share in (0.72,0.88), got ${xShare.toFixed(3)}`);
  });

  it("is deterministic for a fixed seed", () => {
    const ids = ["a", "b", "c", "d", "e", "f"];
    const edgeKeySet = new Set([canonicalEdgeKey("a", "b")]);
    const nodeType = new Map([["a", "X"], ["b", "Y"], ["c", "X"], ["d", "Y"], ["e", "X"], ["f", "Y"]]);
    const typeMarginal = new Map([["X", 3], ["Y", 3]]);
    const opts = { nodeType, typeMarginal, pHard: 0.7 };
    const a = sampleStratifiedEvalNegatives(ids, edgeKeySet, 8, mulberry32(42), opts);
    const b = sampleStratifiedEvalNegatives(ids, edgeKeySet, 8, mulberry32(42), opts);
    assert.deepEqual(a, b);
  });

  it("returns empty for fewer than two nodes", () => {
    assert.deepEqual(sampleStratifiedEvalNegatives([], new Set(), 5, mulberry32(1)), []);
    assert.deepEqual(sampleStratifiedEvalNegatives(["only"], new Set(), 5, mulberry32(1)), []);
  });
});

describe("runTrainingPipeline — stratified wiring", () => {
  it("byte-identical legacy path when nodeTypeField is unset", () => {
    // The deploy-gate retry hinges on the legacy uniform path being unchanged
    // for callers that don't opt in. Identical-input -> identical-checkpoint
    // is the surrogate for byte-identical RNG consumption.
    const graph = clusterGraph(3, 5);
    const a = runTrainingPipeline({ graph, epochs: 4, batchSize: 8, maxNodes: 60 });
    const b = runTrainingPipeline({ graph, epochs: 4, batchSize: 8, maxNodes: 60 });
    assert.deepEqual(a.checkpoint.weights, b.checkpoint.weights);
    assert.equal(a.metrics.stratifiedNegatives, false);
    assert.equal(a.metrics.nodeTypeField, null);
    assert.equal(a.metrics.typeMarginalSize, 0);
    assert.equal(a.metrics.negPHard, null);
  });

  it("activates stratification when nodeTypeField points at a populated field", () => {
    const graph = clusterGraph(3, 5);
    const result = runTrainingPipeline({
      graph, epochs: 4, batchSize: 8, maxNodes: 60,
      nodeTypeField: "layer", negPHard: 0.5,
    });
    assert.equal(result.metrics.stratifiedNegatives, true);
    assert.equal(result.metrics.nodeTypeField, "layer");
    assert.ok(result.metrics.typeMarginalSize >= 2,
      `expected >=2 types in marginal (got ${result.metrics.typeMarginalSize})`);
    assert.equal(result.metrics.negPHard, 0.5);
  });

  it("falls back to legacy uniform path when nodeTypeField names a missing field", () => {
    // The fixture has `layer` but not `kind` — a typo should NOT silently
    // degrade. extractNodeTypes returns null, the metrics carry
    // stratifiedNegatives:false, and the legacy uniform RNG path runs.
    const graph = clusterGraph(3, 5);
    const a = runTrainingPipeline({
      graph, epochs: 4, batchSize: 8, maxNodes: 60, nodeTypeField: "kind",
    });
    const b = runTrainingPipeline({ graph, epochs: 4, batchSize: 8, maxNodes: 60 });
    assert.equal(a.metrics.stratifiedNegatives, false);
    assert.deepEqual(a.checkpoint.weights, b.checkpoint.weights);
  });

  it("stratified run produces a finite AUROC + writes a loadable checkpoint", () => {
    const graph = clusterGraph(3, 5);
    const result = runTrainingPipeline({
      graph, epochs: 8, batchSize: 12, maxNodes: 60,
      nodeTypeField: "layer", negPHard: 0.5,
    });
    assert.equal(result.skipped, false);
    if (result.metrics.auroc !== null) {
      assert.ok(Number.isFinite(result.metrics.auroc),
        `stratified AUROC must be finite (got ${result.metrics.auroc})`);
    }
    assert.ok(Number.isFinite(result.metrics.finalLoss),
      `stratified finalLoss must be finite (got ${result.metrics.finalLoss})`);
    // checkpoint round-trip — the metric block is bundled into the metadata
    // so the deploy-gate consumer (state/shared/nn-graph/NN-EVAL.json) sees
    // the stratification status.
    const ck = loadCheckpoint(result.checkpoint);
    assert.equal(ck.metadata.stratifiedNegatives, true);
    assert.equal(ck.metadata.nodeTypeField, "layer");
  });
});

describe("parseArgs — stratified flags", () => {
  it("parses --node-type-field as a string", () => {
    const a = parseArgs(["--node-type-field", "layer"]);
    assert.equal(a.nodeTypeField, "layer");
  });

  it("parses --neg-p-hard as a number", () => {
    const a = parseArgs(["--neg-p-hard", "0.42"]);
    assert.equal(a.negPHard, 0.42);
  });

  it("throws when --node-type-field is missing its value", () => {
    assert.throws(() => parseArgs(["--node-type-field"]),
      /needs a value/);
  });

  it("throws when --neg-p-hard receives a non-numeric value", () => {
    assert.throws(() => parseArgs(["--neg-p-hard", "abc"]),
      /needs a finite number/);
  });
});

describe("PIPELINE_DEFAULTS", () => {
  it("is frozen and carries the documented knobs", () => {
    assert.ok(Object.isFrozen(PIPELINE_DEFAULTS));
    for (const k of ["maxNodes", "hiddenDim", "embedDim", "epochs", "testFraction", "seed"]) {
      assert.ok(Number.isFinite(PIPELINE_DEFAULTS[k]), `${k} must be a finite default`);
    }
  });

  it("carries the NN-1 embeddingSource knob (default off)", () => {
    assert.equal(PIPELINE_DEFAULTS.embeddingSource, null);
  });
});

// ─── NN-GRAPH-MS2 U-NNG-768D-FEATURES ──────────────────────────────────────
// The model-side lever for the AUROC=0.096 deferred-deploy-gate: swap the 8-d
// projected hand-features for the wiki brain's existing 768-d nomic-embed-text
// vectors. These tests pin the loader's intent (R9) and prove the
// runTrainingPipeline wiring against real on-disk fixtures (the "hermetic fakes
// don't prove production wiring" oracle — see [[reference_rgs_tool_autoinvoke_ms1]]
// and [[reference_fleet_reaper_tier1_2026_05_17]]).

describe("loadEmbeddingFeatures (NN-1: 768d-feature loader)", () => {
  const META = `{"__meta":true,"model":"nomic","dim":3,"count":2}`;
  const ROW_A = `{"n":"a","q":[127,0,-127]}`;
  const ROW_B = `{"n":"b","q":[64,64,64]}`;
  const fixture = (lines) => `${lines.join("\n")}\n`;

  it("dequantizes int8 q exactly via q[i]/127", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a", "b"]), {
      readFileImpl: () => fixture([META, ROW_A, ROW_B]),
    });
    assert.equal(r.dim, 3);
    assert.equal(r.hit, 2);
    assert.deepEqual(r.features.get("a"), [1, 0, -1]); // 127/127 · 0/127 · -127/127
    for (const x of r.features.get("b")) assert.ok(Math.abs(x - 64 / 127) < 1e-12);
  });

  it("restricts results to wanted nodeIds (no extras leak through)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => fixture([META, ROW_A, ROW_B]),
    });
    assert.equal(r.hit, 1);
    assert.ok(r.features.has("a"));
    assert.ok(!r.features.has("b"));
  });

  it("infers dim from the first data row when no __meta is present", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => fixture([ROW_A]),
    });
    assert.equal(r.dim, 3);
    assert.equal(r.hit, 1);
  });

  it("skips ragged data rows (q.length !== dim) without failing the run", () => {
    const ragged = `{"n":"c","q":[1,2]}`; // dim=3 vs q.length=2 → skip
    const r = loadEmbeddingFeatures("x", new Set(["a", "c"]), {
      readFileImpl: () => fixture([META, ROW_A, ragged]),
    });
    assert.equal(r.hit, 1);
    assert.ok(r.features.has("a"));
    assert.ok(!r.features.has("c"));
  });

  it("returns null when the injected reader throws (fail-soft)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => { throw new Error("ENOENT"); },
    });
    assert.equal(r, null);
  });

  it("returns null when the default fs reader fails on a nonexistent path", () => {
    const ghost = path.join(
      os.tmpdir(),
      `nn1-ghost-loader-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
    );
    const r = loadEmbeddingFeatures(ghost, new Set(["a"]));
    assert.equal(r, null);
  });

  it("rejects a row that parses to null (defensive null-obj guard)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => fixture([META, "null", ROW_A]),
    });
    assert.equal(r.hit, 1);
    assert.equal(r.scanned, 3); // null still counts as scanned but is rejected
  });

  it("rejects a row that parses to an array (typeof [] === 'object', defensive)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => fixture([META, '["arr","not","row"]', ROW_A]),
    });
    assert.equal(r.hit, 1);
  });

  it("rejects a malformed __meta header with non-numeric dim (infers from first data row)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => fixture([`{"__meta":true,"dim":"3"}`, ROW_A]),
    });
    assert.equal(r.dim, 3); // inferred from ROW_A's q.length, not "3"
    assert.equal(r.hit, 1);
  });

  it("rejects a malformed __meta header with non-positive dim (infers from first data row)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => fixture([`{"__meta":true,"dim":0}`, ROW_A]),
    });
    assert.equal(r.dim, 3);
    assert.equal(r.hit, 1);
  });

  it("returns null on empty raw input", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), { readFileImpl: () => "" });
    assert.equal(r, null);
  });

  it("returns null when nodeIds is empty", () => {
    const r = loadEmbeddingFeatures("x", new Set(), {
      readFileImpl: () => fixture([META, ROW_A]),
    });
    assert.equal(r, null);
  });

  it("returns {dim, hit:0} when zero rows match — preserves dim so the predictor can zero-pad (U-NN-PREDICTOR-EMBED-WIRE follow-up 2026-05-24)", () => {
    // Pre-2026-05-24 behavior: returned null on zero matches, forcing the
    // 8-d projected fallback. For a 768-d-trained checkpoint, that crashed
    // the predictor's inputDim guard. New honest semantics: return the dim
    // declared by the source + hit=0, so the predictor can zero-pad eval-
    // subgraph nodes and produce uninformative-but-runnable predictions
    // instead of deferring forever.
    const r = loadEmbeddingFeatures("x", new Set(["z"]), {
      readFileImpl: () => fixture([META, ROW_A, ROW_B]),
    });
    assert.ok(r && typeof r === "object", "must return a result object, not null");
    assert.ok(Number.isFinite(r.dim) && r.dim > 0, `dim must be a positive finite number (got ${r && r.dim})`);
    assert.equal(r.hit, 0, "hit=0 surfaces the no-overlap signal");
    assert.ok(r.features instanceof Map && r.features.size === 0, "features map must be empty");
  });

  it("trainer-side gate still rejects zero-hit results (preserves projected fallback for training)", () => {
    // The pre-2026-05-24 invariant that protected the trainer is the
    // `emb.hit > 0` gate at the call site in graphsage-train-pipeline.mjs:500,
    // NOT a null return from this loader. This test pins the contract: the
    // loader hands back a valid result with hit=0, and downstream consumers
    // decide whether to use embedding-features or fall back to projected.
    const r = loadEmbeddingFeatures("x", new Set(["z"]), {
      readFileImpl: () => fixture([META, ROW_A, ROW_B]),
    });
    const trainerWouldUseEmbedding = r && Number.isFinite(r.dim) && r.dim > 0 && r.hit > 0;
    assert.equal(trainerWouldUseEmbedding, false, "trainer's hit>0 gate correctly rejects zero-overlap");
  });

  it("rejects a non-string filePath defensively", () => {
    assert.equal(loadEmbeddingFeatures(null, new Set(["a"])), null);
    assert.equal(loadEmbeddingFeatures(42, new Set(["a"])), null);
    assert.equal(loadEmbeddingFeatures("", new Set(["a"])), null);
  });

  it("treats non-finite q components as 0 (defensive dequant)", () => {
    const row = `{"n":"a","q":[null,127,null]}`;
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => fixture([`{"__meta":true,"dim":3}`, row]),
    });
    assert.deepEqual(r.features.get("a"), [0, 1, 0]);
  });

  it("survives JSON.parse errors on individual rows (skips them, never throws)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => fixture([META, "not-json", ROW_A]),
    });
    assert.equal(r.hit, 1);
    assert.ok(r.features.has("a"));
  });

  it("counts every non-empty line in `scanned` (visibility for operators)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a", "b"]), {
      readFileImpl: () => fixture([META, ROW_A, ROW_B]),
    });
    assert.equal(r.scanned, 3); // meta + 2 data rows
  });

  it("does not require a trailing newline (last line still parsed)", () => {
    const r = loadEmbeddingFeatures("x", new Set(["a"]), {
      readFileImpl: () => `${META}\n${ROW_A}`,
    });
    assert.equal(r.hit, 1);
  });

  it("accepts an array nodeIds (auto-wraps into a Set)", () => {
    const r = loadEmbeddingFeatures("x", ["a"], {
      readFileImpl: () => fixture([META, ROW_A]),
    });
    assert.equal(r.hit, 1);
  });
});

describe("runTrainingPipeline — NN-1 (768d embedding feature source)", () => {
  /** Build a tiny on-disk JSONL embedding file for real-wiring tests. */
  function writeEmbFixture(graph, dim = 4) {
    const tmp = path.join(
      os.tmpdir(),
      `nn1-emb-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
    );
    const lines = [JSON.stringify({ __meta: true, model: "fixture", dim, count: graph.nodes.length })];
    for (const n of graph.nodes) {
      const q = new Array(dim);
      let h = 0;
      for (let i = 0; i < n.id.length; i++) h = ((h * 31) + n.id.charCodeAt(i)) | 0;
      for (let i = 0; i < dim; i++) q[i] = ((h + i * 7) % 127);
      lines.push(JSON.stringify({ n: n.id, q }));
    }
    fs.writeFileSync(tmp, lines.join("\n") + "\n");
    return tmp;
  }

  it("activates embedding feature mode when --embedding-source is set (REAL-WIRING)", () => {
    const graph = clusterGraph(3, 5); // 15 nodes
    const embPath = writeEmbFixture(graph, 16);
    try {
      const r = runTrainingPipeline({ graph, embeddingSource: embPath, epochs: 2, maxNodes: 50 });
      assert.equal(r.skipped, false);
      assert.equal(r.metrics.featureSource, "embedding");
      assert.equal(r.metrics.inputDim, 16);
      assert.equal(r.metrics.embeddingDim, 16);
      // Exact equality (not >=) so an inflated hit count fails this test.
      assert.equal(r.metrics.embeddingHitCount, 15);
      assert.equal(r.metrics.embeddingMissCount, 0); // fixture covers every node
    } finally {
      try { fs.unlinkSync(embPath); } catch {}
    }
  });

  it("LEGACY-PARITY: byte-identical metrics when embeddingSource is unset vs null (R12 invariant)", () => {
    const graph = clusterGraph(3, 5);
    const a = runTrainingPipeline({ graph, epochs: 2, maxNodes: 50 });
    const b = runTrainingPipeline({ graph, epochs: 2, maxNodes: 50, embeddingSource: null });
    // Full deepEqual minus trainedAt (the only non-deterministic field). A
    // drift in cappedNodes / edgeCount / brierRaw / calibratorN / etc. now
    // fails this — much tighter than asserting a hand-picked subset.
    const stripTs = (m) => {
      const { trainedAt, ...rest } = m;
      return rest;
    };
    assert.deepEqual(stripTs(a.metrics), stripTs(b.metrics));
    // Explicit invariants for documentation + grep-ability:
    assert.equal(a.metrics.featureSource, "projected");
    assert.equal(a.metrics.inputDim, FEATURE_DIM);
    assert.equal(a.metrics.embeddingDim, null);
    assert.equal(a.metrics.embeddingHitCount, 0);
    assert.equal(a.metrics.embeddingMissCount, 0);
  });

  it("PARTIAL-HIT: nodes absent from the embedding file get zero-vectors + emit honest miss count", () => {
    // This is the realistic deploy-gate config — the live wiki has embeddings
    // for ~80-95% of system-viz nodes, never 100%. The zero-fill behavior is
    // load-bearing for the production retrain that lifts AUROC above 0.78.
    const graph = clusterGraph(3, 5); // 15 nodes
    const present = graph.nodes.slice(0, 9); // 9 covered
    const tmp = path.join(
      os.tmpdir(),
      `nn1-partial-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
    );
    const lines = [JSON.stringify({ __meta: true, dim: 4 })];
    for (const n of present) lines.push(JSON.stringify({ n: n.id, q: [1, 2, 3, 4] }));
    fs.writeFileSync(tmp, lines.join("\n") + "\n");
    try {
      const r = runTrainingPipeline({ graph, embeddingSource: tmp, epochs: 2, maxNodes: 50 });
      assert.equal(r.skipped, false);
      assert.equal(r.metrics.featureSource, "embedding");
      assert.equal(r.metrics.inputDim, 4);
      assert.equal(r.metrics.embeddingDim, 4);
      assert.equal(r.metrics.embeddingHitCount, 9);
      assert.equal(r.metrics.embeddingMissCount, 6); // 15 - 9
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  });

  it("FAIL-SOFT: a nonexistent embedding file falls through to the projected path", () => {
    const graph = clusterGraph(3, 4);
    // Cross-platform tmpdir-based "guaranteed-absent" path.
    const ghost = path.join(
      os.tmpdir(),
      `nn1-ghost-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
    );
    const r = runTrainingPipeline({
      graph,
      embeddingSource: ghost,
      epochs: 2,
      maxNodes: 40,
    });
    assert.equal(r.skipped, false);
    assert.equal(r.metrics.featureSource, "projected");
    assert.equal(r.metrics.inputDim, FEATURE_DIM);
    assert.equal(r.metrics.embeddingDim, null);
  });

  it("FAIL-SOFT: a zero-hit embedding file (no matching ids) falls through to projected", () => {
    const graph = clusterGraph(3, 4);
    const tmp = path.join(
      os.tmpdir(),
      `nn1-zero-${Date.now()}-${Math.random().toString(36).slice(2)}.jsonl`,
    );
    fs.writeFileSync(
      tmp,
      `{"__meta":true,"dim":4}\n{"n":"NOMATCH_a","q":[1,2,3,4]}\n{"n":"NOMATCH_b","q":[5,6,7,8]}\n`,
    );
    try {
      const r = runTrainingPipeline({ graph, embeddingSource: tmp, epochs: 2, maxNodes: 40 });
      assert.equal(r.metrics.featureSource, "projected");
      assert.equal(r.metrics.inputDim, FEATURE_DIM);
    } finally {
      try { fs.unlinkSync(tmp); } catch {}
    }
  });

  it("threads opts.readFileImpl through into loadEmbeddingFeatures (hermetic injection)", () => {
    const graph = clusterGraph(2, 4);
    const lines = [JSON.stringify({ __meta: true, dim: 8 })];
    for (const n of graph.nodes) {
      const q = new Array(8);
      for (let i = 0; i < 8; i++) q[i] = (n.id.charCodeAt(0) + i) % 127;
      lines.push(JSON.stringify({ n: n.id, q }));
    }
    const raw = lines.join("\n");
    const r = runTrainingPipeline({
      graph,
      embeddingSource: "memory-only.jsonl",
      readFileImpl: () => raw,
      epochs: 2,
      maxNodes: 40,
    });
    assert.equal(r.metrics.featureSource, "embedding");
    assert.equal(r.metrics.inputDim, 8);
    assert.equal(r.metrics.embeddingDim, 8);
  });

  it("checkpoint round-trip preserves the NN-1 metric fields", () => {
    const graph = clusterGraph(3, 5);
    const embPath = writeEmbFixture(graph, 12);
    const ckptPath = path.join(
      os.tmpdir(),
      `nn1-ckpt-${Date.now()}-${Math.random().toString(36).slice(2)}.json`,
    );
    try {
      const r = runTrainingPipeline({ graph, embeddingSource: embPath, epochs: 2, maxNodes: 50 });
      fs.writeFileSync(ckptPath, JSON.stringify(r.checkpoint, null, 2));
      // Pure-disk round-trip: write -> read -> parse. The loadCheckpoint API
      // expects a parsed object (not a path), and verifying its exact contract
      // is outside NN-1's scope — what we pin here is that the NN-1 metric
      // fields survive JSON serialization intact.
      const loaded = JSON.parse(fs.readFileSync(ckptPath, "utf8"));
      assert.equal(loaded.metadata.featureSource, "embedding");
      assert.equal(loaded.metadata.embeddingDim, 12);
      assert.equal(loaded.metadata.inputDim, 12);
      // Exact equality (not >=) to fail on inflated counts.
      assert.equal(loaded.metadata.embeddingHitCount, 15);
      assert.equal(loaded.metadata.embeddingMissCount, 0);
    } finally {
      try { fs.unlinkSync(embPath); } catch {}
      try { fs.unlinkSync(ckptPath); } catch {}
    }
  });
});

describe("parseArgs — --embedding-source (NN-1 CLI surface)", () => {
  it("accepts --embedding-source <path>", () => {
    const a = parseArgs(["--embedding-source", "/tmp/x.jsonl"]);
    assert.equal(a.embeddingSource, "/tmp/x.jsonl");
  });

  it("throws when --embedding-source has no value", () => {
    assert.throws(() => parseArgs(["--embedding-source"]), /needs a value/);
  });
});
