/**
 * Tests for subgraph-retrieve.mjs (U-SUBGRAPH-RETRIEVE, slot:alpha).
 *
 * Real reference-value / algebraic-invariant assertions (R9) over hermetic
 * fixtures: an in-memory adjacency for bfsSubgraph, a temp file for loadAdjacency
 * (so the fail-loud + cache paths exercise real disk), and DI seams for
 * retrieveSubgraph (no 96MB/65MB sidecar touched). Happy + >=3 failure modes +
 * >=2 adversarial inputs.
 *
 * Run directly: node scripts/lib/subgraph-retrieve.test.mjs  (node:test auto-runs).
 */

import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

import { loadAdjacency, bfsSubgraph, retrieveSubgraph, __test } from "./subgraph-retrieve.mjs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

// Linear-ish graph: seedA -> n1 -> n3 (out chain); seedA <- n2 (in edge).
const ADJ_BASIC = {
  seedA: { out: [{ id: "n1", type: "wired_to" }], in: [{ id: "n2", type: "contains" }] },
  n1: { out: [{ id: "n3", type: "documents" }], in: [] },
  n2: { out: [], in: [] },
  n3: { out: [], in: [] },
};

function tmpAdjFile(obj) {
  const p = path.join(os.tmpdir(), `prism-subgraph-test-${process.pid}-${Math.round(performance.now())}.json`);
  fs.writeFileSync(p, typeof obj === "string" ? obj : JSON.stringify(obj), "utf8");
  return p;
}

// ---------------------------------------------------------------------------
// loadAdjacency
// ---------------------------------------------------------------------------

test("loadAdjacency: parses a valid sidecar and returns the adjacency map", () => {
  __test.resetCache();
  const p = tmpAdjFile({ schemaVersion: "1.0.0", adjacency: ADJ_BASIC });
  process.env.PRISM_VIZ_ADJ_PATH = p;
  try {
    const data = loadAdjacency();
    assert.equal(typeof data.adjacency, "object");
    assert.deepEqual(data.adjacency.seedA.out, [{ id: "n1", type: "wired_to" }]);
  } finally {
    delete process.env.PRISM_VIZ_ADJ_PATH;
    fs.unlinkSync(p);
    __test.resetCache();
  }
});

test("loadAdjacency: FAILS LOUD when the file is missing (no silent empty)", () => {
  __test.resetCache();
  process.env.PRISM_VIZ_ADJ_PATH = path.join(os.tmpdir(), "prism-subgraph-DOES-NOT-EXIST.json");
  try {
    assert.throws(() => loadAdjacency(), /Cannot stat node-adjacency.*build-viz-adjacency/s);
  } finally {
    delete process.env.PRISM_VIZ_ADJ_PATH;
    __test.resetCache();
  }
});

test("loadAdjacency: FAILS LOUD on corrupt JSON", () => {
  __test.resetCache();
  const p = tmpAdjFile("{ this is not json ");
  process.env.PRISM_VIZ_ADJ_PATH = p;
  try {
    assert.throws(() => loadAdjacency(), /Cannot parse node-adjacency/);
  } finally {
    delete process.env.PRISM_VIZ_ADJ_PATH;
    fs.unlinkSync(p);
    __test.resetCache();
  }
});

test("loadAdjacency: FAILS LOUD on schema mismatch (no adjacency map)", () => {
  __test.resetCache();
  const p = tmpAdjFile({ schemaVersion: "1.0.0", nodes: [] }); // no `adjacency`
  process.env.PRISM_VIZ_ADJ_PATH = p;
  try {
    assert.throws(() => loadAdjacency(), /missing the 'adjacency' map/);
  } finally {
    delete process.env.PRISM_VIZ_ADJ_PATH;
    fs.unlinkSync(p);
    __test.resetCache();
  }
});

test("loadAdjacency: in-process cache returns the SAME object for an unchanged file", () => {
  __test.resetCache();
  const p = tmpAdjFile({ adjacency: ADJ_BASIC });
  process.env.PRISM_VIZ_ADJ_PATH = p;
  try {
    const a = loadAdjacency();
    const b = loadAdjacency();
    assert.equal(a, b, "second call must return the cached instance");
    const c = loadAdjacency({ fresh: true });
    assert.notEqual(a, c, "fresh:true must bypass the cache (new parse)");
  } finally {
    delete process.env.PRISM_VIZ_ADJ_PATH;
    fs.unlinkSync(p);
    __test.resetCache();
  }
});

// ---------------------------------------------------------------------------
// bfsSubgraph
// ---------------------------------------------------------------------------

test("bfsSubgraph: expands the connected neighborhood with correct depths + via edges", () => {
  const r = bfsSubgraph(["seedA"], ADJ_BASIC, { maxDepth: 2, maxNodes: 40, direction: "both" });
  const byId = Object.fromEntries(r.nodes.map((n) => [n.id, n]));
  assert.equal(r.seedCount, 1);
  assert.equal(byId.seedA.depth, 0);
  assert.equal(byId.seedA.seed, true);
  assert.equal(byId.n1.depth, 1);
  assert.equal(byId.n2.depth, 1);
  assert.equal(byId.n3.depth, 2, "n3 is reached at depth 2 via n1");
  // relationship is preserved (the 'how to approach' signal)
  assert.deepEqual(byId.n1.via, [{ from: "seedA", type: "wired_to", dir: "out" }]);
  assert.deepEqual(byId.n2.via, [{ from: "seedA", type: "contains", dir: "in" }]);
  assert.equal(r.truncated, false);
});

test("bfsSubgraph: maxDepth bounds the walk (depth-2 node excluded at maxDepth=1)", () => {
  const r = bfsSubgraph(["seedA"], ADJ_BASIC, { maxDepth: 1 });
  const ids = r.nodes.map((n) => n.id).sort();
  assert.deepEqual(ids, ["n1", "n2", "seedA"]);
});

test("bfsSubgraph: maxNodes is a HARD cap that reports truncated (no silent drop, R12)", () => {
  const r = bfsSubgraph(["seedA"], ADJ_BASIC, { maxDepth: 2, maxNodes: 2 });
  assert.equal(r.nodes.length, 2, "exactly the cap, no more");
  assert.equal(r.truncated, true, "truncation must be surfaced");
});

test("bfsSubgraph: seeds exceeding maxNodes are RETAINED but set truncated (honest cap, R12)", () => {
  // Regression for the per-file-scrutiny P1: the budget bounds the neighborhood,
  // never drops a real seed hit, but must flag the overrun rather than lie.
  const r = bfsSubgraph(["s1", "s2", "s3"], ADJ_BASIC, { maxNodes: 2 });
  assert.equal(r.nodes.length, 3, "all 3 seeds retained (no real hit dropped)");
  assert.equal(r.truncated, true, "seeds-over-budget must surface truncated:true");
});

test("retrieveSubgraph: seedLimit > maxNodes surfaces truncated (cap cannot lie)", () => {
  const many = { nodes: [] };
  for (let i = 0; i < 10; i++) many.nodes.push({ id: `seed${i}`, label: `Seed match ${i}`, layer: "L6" });
  const di = { loadFindCache: () => many, loadAdjacency: () => ({ adjacency: {} }) };
  const r = retrieveSubgraph("seed match", { seedLimit: 10, maxNodes: 3 }, di);
  assert.equal(r.counts.seeds, 10);
  assert.equal(r.truncated, true);
});

test("bfsSubgraph: direction='out' follows only out edges; 'in' only in", () => {
  const out = bfsSubgraph(["seedA"], ADJ_BASIC, { direction: "out" }).nodes.map((n) => n.id).sort();
  assert.deepEqual(out, ["n1", "n3", "seedA"], "out chain only (no n2)");
  const inn = bfsSubgraph(["seedA"], ADJ_BASIC, { direction: "in" }).nodes.map((n) => n.id).sort();
  assert.deepEqual(inn, ["n2", "seedA"], "in edge only (no n1/n3)");
});

test("bfsSubgraph: orphan seed (no adjacency entry) returns just the seed, not truncated", () => {
  const r = bfsSubgraph(["ghost"], ADJ_BASIC, {});
  assert.deepEqual(r.nodes.map((n) => n.id), ["ghost"]);
  assert.equal(r.nodes[0].seed, true);
  assert.equal(r.truncated, false);
});

test("bfsSubgraph: a node reached by two seeds records BOTH via relationships", () => {
  const adj = {
    s1: { out: [{ id: "shared", type: "a" }], in: [] },
    s2: { out: [{ id: "shared", type: "b" }], in: [] },
    shared: { out: [], in: [] },
  };
  const r = bfsSubgraph(["s1", "s2"], adj, {});
  const shared = r.nodes.find((n) => n.id === "shared");
  assert.equal(shared.depth, 1);
  assert.equal(shared.via.length, 2, "two distinct relationships recorded");
  const froms = shared.via.map((v) => v.from).sort();
  assert.deepEqual(froms, ["s1", "s2"]);
});

test("bfsSubgraph: ADVERSARIAL self-loop edge is skipped (no infinite/self node)", () => {
  const adj = { x: { out: [{ id: "x", type: "self" }], in: [] } };
  const r = bfsSubgraph(["x"], adj, {});
  assert.deepEqual(r.nodes.map((n) => n.id), ["x"], "self-loop must not add x again");
  assert.equal(r.nodes[0].via.length, 0);
});

test("bfsSubgraph: ADVERSARIAL malformed edges (null id / missing id) are skipped", () => {
  const adj = {
    x: { out: [{ id: null, type: "t" }, { type: "noid" }, { id: "y", type: "ok" }], in: [] },
    y: { out: [], in: [] },
  };
  const r = bfsSubgraph(["x"], adj, {});
  assert.deepEqual(r.nodes.map((n) => n.id).sort(), ["x", "y"], "only the well-formed edge expands");
});

test("bfsSubgraph: ADVERSARIAL empty/non-array seedIds yields an empty subgraph", () => {
  assert.deepEqual(bfsSubgraph([], ADJ_BASIC, {}).nodes, []);
  assert.deepEqual(bfsSubgraph(null, ADJ_BASIC, {}).nodes, []);
});

// ---------------------------------------------------------------------------
// retrieveSubgraph (full pipeline via DI)
// ---------------------------------------------------------------------------

function fcFixture(extra = {}) {
  return {
    nodes: [
      { id: "seedA", label: "Seed Alpha\nrow2", layer: "L6", kind: "engine" },
      { id: "n1", label: "Dispatcher One", layer: "L4", kind: "dispatcher", noteCount: 3 },
      { id: "n3", label: "Wiki Doc Three", layer: "L8", kind: "wiki" },
    ],
    ...extra,
  };
}

test("retrieveSubgraph: happy path returns connected, label-enriched, depth-sorted nodes", () => {
  const di = {
    loadFindCache: () => fcFixture(),
    loadAdjacency: () => ({ adjacency: ADJ_BASIC }),
  };
  const r = retrieveSubgraph("seed", { maxDepth: 2 }, di);
  assert.equal(r.counts.seeds, 1);
  assert.equal(r.seeds[0].id, "seedA");
  assert.equal(r.nodes[0].id, "seedA", "seed (depth 0) sorts first");
  const n1 = r.nodes.find((n) => n.id === "n1");
  assert.equal(n1.label, "Dispatcher One", "neighborhood label pulled from find-cache meta");
  assert.equal(n1.layer, "L4");
  assert.equal(n1.noteCount, 3);
  assert.equal(r.stale, false);
  assert.equal(r.cold, false);
});

test("retrieveSubgraph: empty query throws (R12, not a silent empty result)", () => {
  assert.throws(() => retrieveSubgraph("   ", {}, { loadFindCache: () => fcFixture(), loadAdjacency: () => ({ adjacency: {} }) }), /query is required/);
});

test("retrieveSubgraph: cold find-cache propagates cold/stale and yields 0 seeds", () => {
  const di = {
    loadFindCache: () => ({ nodes: [], cold: true, stale: true }),
    loadAdjacency: () => ({ adjacency: ADJ_BASIC }),
  };
  const r = retrieveSubgraph("seed", {}, di);
  assert.equal(r.counts.seeds, 0);
  assert.equal(r.nodes.length, 0);
  assert.equal(r.cold, true);
  assert.equal(r.stale, true);
});

test("retrieveSubgraph: a neighborhood node absent from find-cache still appears (label empty)", () => {
  // ADJ_BASIC has n2, but fcFixture meta omits n2 -> label "" but node present.
  const di = {
    loadFindCache: () => fcFixture(),
    loadAdjacency: () => ({ adjacency: ADJ_BASIC }),
  };
  const r = retrieveSubgraph("seed", { maxDepth: 1 }, di);
  const n2 = r.nodes.find((n) => n.id === "n2");
  assert.ok(n2, "n2 is in the neighborhood even without find-cache meta");
  assert.equal(n2.label, "", "missing meta yields empty label, not a crash");
});
