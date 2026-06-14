/**
 * Unit tests for U-NN-EMBED-COVERAGE-PRIORITIZE — the helpers that fix the
 * 23/5977 embedding hit rate by reordering graph nodes so embedded ones are
 * selected first by buildAdjacency's slice(0, maxNodes).
 *
 * slot:india /goal-psn-self-improving iter4
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  loadEmbeddingNodeIds,
  prioritizeEmbeddedNodes,
} from "./graphsage-train-pipeline.mjs";

// ============================================================================
// loadEmbeddingNodeIds
// ============================================================================

describe("loadEmbeddingNodeIds", () => {
  it("returns empty Set when filePath is null/empty/non-string", () => {
    assert.equal(loadEmbeddingNodeIds(null).size, 0);
    assert.equal(loadEmbeddingNodeIds("").size, 0);
    assert.equal(loadEmbeddingNodeIds(42).size, 0);
  });

  it("returns empty Set when readFileImpl throws (file missing)", () => {
    const ids = loadEmbeddingNodeIds("nonexistent.jsonl", {
      readFileImpl: () => { throw new Error("ENOENT"); },
    });
    assert.equal(ids.size, 0);
  });

  it("parses 3 valid node ids, skips __meta header + ragged lines", () => {
    const fake =
      `{"__meta":true,"model":"nomic-embed-text","dim":768,"count":3}\n` +
      `{"n":"reg.postprocessorregistry","q":[1,2,3]}\n` +
      `{"n":"vault.wiki.foo","q":[4,5,6]}\n` +
      `not-json-skipped\n` +
      `{"n":"p.operator","q":[7,8,9]}\n`;
    const ids = loadEmbeddingNodeIds("fake.jsonl", { readFileImpl: () => fake });
    assert.equal(ids.size, 3);
    assert.equal(ids.has("reg.postprocessorregistry"), true);
    assert.equal(ids.has("vault.wiki.foo"), true);
    assert.equal(ids.has("p.operator"), true);
  });

  it("skips rows where n is non-string or empty", () => {
    const fake =
      `{"n":"a","q":[1]}\n` +
      `{"n":42,"q":[2]}\n` +
      `{"n":"","q":[3]}\n` +
      `{"q":[4]}\n` +
      `{"n":"b","q":[5]}\n`;
    const ids = loadEmbeddingNodeIds("f.jsonl", { readFileImpl: () => fake });
    assert.equal(ids.size, 2);
    assert.equal(ids.has("a"), true);
    assert.equal(ids.has("b"), true);
  });

  it("handles file with no trailing newline", () => {
    const fake = `{"n":"x","q":[1]}\n{"n":"y","q":[2]}`;
    const ids = loadEmbeddingNodeIds("f.jsonl", { readFileImpl: () => fake });
    assert.equal(ids.size, 2);
  });

  it("does NOT load vectors (cheap pre-scan invariant)", () => {
    // 1000 embedded ids with 768-d vectors. Helper reads but only retains ids.
    const lines = ["{\"__meta\":true,\"dim\":768}"];
    for (let i = 0; i < 1000; i++) {
      lines.push(JSON.stringify({ n: `node-${i}`, q: new Array(768).fill(i) }));
    }
    const fake = lines.join("\n");
    const ids = loadEmbeddingNodeIds("f.jsonl", { readFileImpl: () => fake });
    assert.equal(ids.size, 1000);
    assert.equal(ids.has("node-0"), true);
    assert.equal(ids.has("node-999"), true);
    // Set holds only strings — no vector arrays in memory
    for (const v of ids) assert.equal(typeof v, "string");
  });
});

// ============================================================================
// prioritizeEmbeddedNodes
// ============================================================================

describe("prioritizeEmbeddedNodes", () => {
  it("returns input unchanged when embeddedIds is empty (legacy parity)", () => {
    const g = { nodes: [{ id: "a" }, { id: "b" }, { id: "c" }] };
    const out = prioritizeEmbeddedNodes(g, new Set());
    assert.strictEqual(out, g);
  });

  it("returns input unchanged when graph.nodes is empty", () => {
    const g = { nodes: [] };
    const out = prioritizeEmbeddedNodes(g, new Set(["x"]));
    assert.strictEqual(out, g);
  });

  it("returns input unchanged when not a graph object", () => {
    assert.strictEqual(prioritizeEmbeddedNodes(null, new Set(["x"])), null);
    assert.strictEqual(prioritizeEmbeddedNodes(undefined, new Set(["x"])), undefined);
  });

  it("partitions: 3 covered first, 2 uncovered after, stable within group", () => {
    const g = {
      nodes: [
        { id: "u1" },     // uncovered
        { id: "c1" },     // covered
        { id: "u2" },     // uncovered
        { id: "c2" },     // covered
        { id: "c3" },     // covered
      ],
      edges: [{ source: "c1", target: "u1" }],
    };
    const embedded = new Set(["c1", "c2", "c3"]);
    const out = prioritizeEmbeddedNodes(g, embedded);
    assert.deepEqual(out.nodes.map((n) => n.id), ["c1", "c2", "c3", "u1", "u2"]);
    // Edges preserved verbatim
    assert.deepEqual(out.edges, g.edges);
    // Input never mutated
    assert.deepEqual(g.nodes.map((n) => n.id), ["u1", "c1", "u2", "c2", "c3"]);
  });

  it("all nodes covered → first N stays first N (reordering only happens for partitioning)", () => {
    const g = { nodes: [{ id: "a" }, { id: "b" }, { id: "c" }] };
    const out = prioritizeEmbeddedNodes(g, new Set(["a", "b", "c"]));
    assert.deepEqual(out.nodes.map((n) => n.id), ["a", "b", "c"]);
  });

  it("none covered → returns NEW object with same order (no embedded nodes to move forward)", () => {
    const g = { nodes: [{ id: "a" }, { id: "b" }, { id: "c" }] };
    const out = prioritizeEmbeddedNodes(g, new Set(["x", "y"]));
    // Object identity differs (we always copy when embeddedIds is non-empty) but content matches
    assert.notStrictEqual(out, g);
    assert.deepEqual(out.nodes.map((n) => n.id), ["a", "b", "c"]);
  });

  it("handles null/undefined node ids gracefully — treats as uncovered", () => {
    const g = {
      nodes: [
        { id: "a" },
        { id: null },
        { id: undefined },
        { id: "b" },
      ],
    };
    const out = prioritizeEmbeddedNodes(g, new Set(["a", "b"]));
    assert.deepEqual(out.nodes.map((n) => n.id), ["a", "b", null, undefined]);
  });

  it("integration: slice(0, 4) on 6-node graph picks 3/3 covered when prioritized (vs 1/3 without)", () => {
    // Simulates the actual bug: graph has 6 nodes, cap is 4, embedded set is
    // last 3 nodes. Without prioritization, slice picks {u1, u2, u3, c1} → 1 hit.
    // With prioritization, slice picks {c1, c2, c3, u1} → 3 hits.
    const g = {
      nodes: [
        { id: "u1" }, { id: "u2" }, { id: "u3" },
        { id: "c1" }, { id: "c2" }, { id: "c3" },
      ],
    };
    const embedded = new Set(["c1", "c2", "c3"]);
    const prioritized = prioritizeEmbeddedNodes(g, embedded);
    const sliced = prioritized.nodes.slice(0, 4).map((n) => n.id);
    const hits = sliced.filter((id) => embedded.has(id)).length;
    assert.equal(hits, 3); // was 1 without prioritization
  });
});
