#!/usr/bin/env node
/**
 * edge-typology-normalizer.test.mjs — tests for NN-GRAPH-MS0/U-NNG-EDGE-NORMALIZE
 * Run: node --test scripts/lib/edge-typology-normalizer.test.mjs
 */
import { test, describe } from "node:test";
import assert from "node:assert/strict";
import {
  EDGE_TYPE_MAP,
  EDGE_TYPE_MAP_VERSION,
  CORE_EDGE_TYPES,
  normalizeEdgeType,
  normalizeGraph,
  rawTypesForCore,
  coreTypeCounts,
} from "./edge-typology-normalizer.mjs";

describe("EDGE_TYPE_MAP + CORE_EDGE_TYPES constants", () => {
  test("CORE_EDGE_TYPES has exactly 7 entries", () => {
    assert.equal(CORE_EDGE_TYPES.length, 7);
  });

  test("CORE_EDGE_TYPES contains the documented 7", () => {
    const expected = ["imports", "calls", "references", "contains", "wires", "composes", "ghost-wire"];
    assert.deepEqual([...CORE_EDGE_TYPES], expected);
  });

  test("CORE_EDGE_TYPES is frozen", () => {
    assert.throws(() => { CORE_EDGE_TYPES.push("new-type"); });
  });

  test("EDGE_TYPE_MAP is frozen", () => {
    assert.throws(() => { EDGE_TYPE_MAP["xyz"] = "imports"; });
  });

  test("EDGE_TYPE_MAP_VERSION is 1", () => {
    assert.equal(EDGE_TYPE_MAP_VERSION, 1);
  });

  test("EDGE_TYPE_MAP_VERSION is a positive integer", () => {
    assert.ok(Number.isInteger(EDGE_TYPE_MAP_VERSION) && EDGE_TYPE_MAP_VERSION > 0);
  });

  test("every value in EDGE_TYPE_MAP is one of the 7 core types", () => {
    const coreSet = new Set(CORE_EDGE_TYPES);
    for (const [raw, core] of Object.entries(EDGE_TYPE_MAP)) {
      assert.ok(coreSet.has(core), `${raw} → ${core} (not in CORE_EDGE_TYPES)`);
    }
  });

  test("every raw type appears exactly once", () => {
    const keys = Object.keys(EDGE_TYPE_MAP);
    const unique = new Set(keys);
    assert.equal(keys.length, unique.size);
  });
});

describe("normalizeEdgeType", () => {
  test("known raw types map correctly", () => {
    assert.equal(normalizeEdgeType("engine_import"), "imports");
    assert.equal(normalizeEdgeType("lazy_import"), "imports");
    assert.equal(normalizeEdgeType("fs-contains"), "contains");
    assert.equal(normalizeEdgeType("wiki_link"), "references");
    assert.equal(normalizeEdgeType("suggested_peer"), "composes");
    assert.equal(normalizeEdgeType("register"), "wires");
    assert.equal(normalizeEdgeType("hook_invoke"), "calls");
    assert.equal(normalizeEdgeType("ghost-wire"), "ghost-wire");
  });

  test("unknown raw type → 'ghost-wire' (safe default)", () => {
    assert.equal(normalizeEdgeType("totally-fake-type"), "ghost-wire");
    assert.equal(normalizeEdgeType("xyz_unknown"), "ghost-wire");
  });

  test("empty string → 'ghost-wire'", () => {
    assert.equal(normalizeEdgeType(""), "ghost-wire");
  });

  test("non-string input → 'ghost-wire' (no crash)", () => {
    assert.equal(normalizeEdgeType(null), "ghost-wire");
    assert.equal(normalizeEdgeType(undefined), "ghost-wire");
    assert.equal(normalizeEdgeType(123), "ghost-wire");
    assert.equal(normalizeEdgeType({}), "ghost-wire");
    assert.equal(normalizeEdgeType([]), "ghost-wire");
  });

  test("case-sensitive — uppercase variant is treated as unknown", () => {
    // "IMPORTS" (caps) is NOT in the map; only lowercase "imports" target
    assert.equal(normalizeEdgeType("Engine_Import"), "ghost-wire");
    assert.equal(normalizeEdgeType("FS-CONTAINS"), "ghost-wire");
  });

  test("normalizing an already-core-type works (idempotent on core)", () => {
    // 'contains' is BOTH a raw type AND a core type → maps to 'contains' (itself)
    assert.equal(normalizeEdgeType("contains"), "contains");
    assert.equal(normalizeEdgeType("ghost-wire"), "ghost-wire");
  });
});

describe("normalizeGraph", () => {
  test("rejects non-object input", () => {
    assert.throws(() => normalizeGraph(null));
    assert.throws(() => normalizeGraph(undefined));
    assert.throws(() => normalizeGraph("not a graph"));
    assert.throws(() => normalizeGraph(42));
  });

  test("rejects object without edges array", () => {
    assert.throws(() => normalizeGraph({}));
    assert.throws(() => normalizeGraph({ nodes: [], edges: "not array" }));
  });

  test("accepts empty graph", () => {
    const g = { nodes: [], edges: [] };
    const out = normalizeGraph(g);
    assert.deepEqual(out.edges, []);
    assert.deepEqual(out.nodes, []);
  });

  test("normalizes every edge type", () => {
    const g = {
      nodes: [{ id: "a" }, { id: "b" }],
      edges: [
        { from: "a", to: "b", type: "engine_import" },
        { from: "a", to: "b", type: "wiki_link" },
        { from: "a", to: "b", type: "fs-contains" },
      ],
    };
    const out = normalizeGraph(g);
    assert.equal(out.edges[0].type, "imports");
    assert.equal(out.edges[1].type, "references");
    assert.equal(out.edges[2].type, "contains");
  });

  test("preserves rawType on every edge", () => {
    const g = {
      nodes: [],
      edges: [{ from: "a", to: "b", type: "lazy_import" }],
    };
    const out = normalizeGraph(g);
    assert.equal(out.edges[0].type, "imports");
    assert.equal(out.edges[0].rawType, "lazy_import");
  });

  test("does NOT mutate the input graph", () => {
    const g = {
      nodes: [],
      edges: [{ from: "a", to: "b", type: "wiki_link" }],
    };
    const before = JSON.stringify(g);
    normalizeGraph(g);
    assert.equal(JSON.stringify(g), before, "input must not be mutated");
  });

  test("idempotent — normalizing twice equals normalizing once", () => {
    const g = {
      nodes: [],
      edges: [
        { from: "a", to: "b", type: "engine_import" },
        { from: "a", to: "b", type: "unknown_type_xyz" },
      ],
    };
    const once = normalizeGraph(g);
    const twice = normalizeGraph(once);
    assert.deepEqual(twice.edges, once.edges);
  });

  test("preserves edge count exactly", () => {
    const g = {
      nodes: [],
      edges: Array.from({ length: 100 }, (_, i) => ({
        from: `n${i}`, to: `n${i+1}`, type: i % 2 ? "engine_import" : "wiki_link",
      })),
    };
    const out = normalizeGraph(g);
    assert.equal(out.edges.length, 100);
  });

  test("preserves node array reference", () => {
    const nodes = [{ id: "a" }, { id: "b" }];
    const g = { nodes, edges: [] };
    const out = normalizeGraph(g);
    assert.equal(out.nodes, nodes, "nodes should be passed through by reference");
  });

  test("preserves edge metadata other than type", () => {
    const g = {
      nodes: [],
      edges: [{ from: "a", to: "b", type: "fire", weight: 0.7, intensity: 0.4, custom: "x" }],
    };
    const out = normalizeGraph(g);
    assert.equal(out.edges[0].weight, 0.7);
    assert.equal(out.edges[0].intensity, 0.4);
    assert.equal(out.edges[0].custom, "x");
  });

  test("attaches edgeTypologyVersion to output meta", () => {
    const g = { nodes: [], edges: [] };
    const out = normalizeGraph(g);
    assert.equal(out.meta.edgeTypologyVersion, EDGE_TYPE_MAP_VERSION);
  });

  test("preserves pre-existing meta fields", () => {
    const g = { nodes: [], edges: [], meta: { generatedAt: "2026-05-16", count: 1 } };
    const out = normalizeGraph(g);
    assert.equal(out.meta.generatedAt, "2026-05-16");
    assert.equal(out.meta.count, 1);
    assert.equal(out.meta.edgeTypologyVersion, EDGE_TYPE_MAP_VERSION);
  });

  test("missing edge.type → ghost-wire", () => {
    const g = { nodes: [], edges: [{ from: "a", to: "b" }] };
    const out = normalizeGraph(g);
    assert.equal(out.edges[0].type, "ghost-wire");
    assert.equal(out.edges[0].rawType, "ghost-wire");
  });
});

describe("rawTypesForCore", () => {
  test("returns the raw types mapping to a given core", () => {
    const imports = rawTypesForCore("imports");
    assert.ok(imports.includes("engine_import"));
    assert.ok(imports.includes("lazy_import"));
    assert.ok(imports.includes("import"));
  });

  test("unknown core → empty array", () => {
    assert.deepEqual(rawTypesForCore("nonexistent"), []);
  });

  test("every core has at least one raw type mapping to it", () => {
    for (const core of CORE_EDGE_TYPES) {
      assert.ok(rawTypesForCore(core).length > 0, `${core} has zero raw mappings`);
    }
  });
});

describe("coreTypeCounts", () => {
  test("counts core-type distribution across edges", () => {
    const g = {
      nodes: [],
      edges: [
        { type: "engine_import" }, { type: "engine_import" }, { type: "engine_import" },
        { type: "wiki_link" }, { type: "wiki_link" },
        { type: "fs-contains" },
      ],
    };
    const counts = coreTypeCounts(g);
    assert.equal(counts.imports, 3);
    assert.equal(counts.references, 2);
    assert.equal(counts.contains, 1);
    assert.equal(counts.calls, 0);
  });

  test("returns all 7 core types in the result even when zero", () => {
    const counts = coreTypeCounts({ nodes: [], edges: [] });
    for (const core of CORE_EDGE_TYPES) {
      assert.equal(counts[core], 0);
    }
  });

  test("graceful on invalid input", () => {
    const counts = coreTypeCounts(null);
    assert.equal(counts.imports, 0);
    assert.equal(counts["ghost-wire"] ?? 0, 0);
  });

  test("counts always sum to graph.edges.length", () => {
    const g = {
      nodes: [],
      edges: Array.from({ length: 50 }, (_, i) => ({
        type: ["engine_import", "wiki_link", "fs-contains", "totally-unknown"][i % 4],
      })),
    };
    const counts = coreTypeCounts(g);
    const sum = Object.values(counts).reduce((a, b) => a + b, 0);
    assert.equal(sum, 50);
  });
});
