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
});

describe("PIPELINE_DEFAULTS", () => {
  it("is frozen and carries the documented knobs", () => {
    assert.ok(Object.isFrozen(PIPELINE_DEFAULTS));
    for (const k of ["maxNodes", "hiddenDim", "embedDim", "epochs", "testFraction", "seed"]) {
      assert.ok(Number.isFinite(PIPELINE_DEFAULTS[k]), `${k} must be a finite default`);
    }
  });
});
