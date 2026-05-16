import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadGraph, findInGraph } from "./system-viz-graph.mjs";

// Resolve the graph path from the lib's own ROOT logic so we stay in sync.
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..", "..");
const GRAPH_PATH = path.join(ROOT, "state", "shared", "system-viz", "system-graph.json");
const HAVE_GRAPH = fs.existsSync(GRAPH_PATH);

// ---------------------------------------------------------------------------
// Real-graph tests — skipped gracefully when the 324 MB graph file is absent
// ---------------------------------------------------------------------------

test("loadGraph returns graph with nodes array >1000", { skip: !HAVE_GRAPH }, () => {
  const G = loadGraph();
  assert.ok(Array.isArray(G.nodes) && G.nodes.length > 1000, `got ${G?.nodes?.length}`);
});

test("findInGraph kienzle returns ≥1 real match", { skip: !HAVE_GRAPH }, () => {
  const G = loadGraph();
  const hits = findInGraph(G, "kienzle", { limit: 5 });
  assert.ok(hits.length >= 1);
  assert.ok(hits.every(h => /kienzle/i.test(h.label + " " + h.id + " " + (h.info||""))));
});

test("findInGraph is pure (idempotent)", { skip: !HAVE_GRAPH }, () => {
  const G = loadGraph();
  assert.deepEqual(findInGraph(G,"tool",{limit:3}), findInGraph(G,"tool",{limit:3}));
});

test("findInGraph respects limit", { skip: !HAVE_GRAPH }, () => {
  const G = loadGraph();
  assert.ok(findInGraph(G,"engine",{limit:2}).length <= 2);
});

// ---------------------------------------------------------------------------
// Hermetic tests — use a fake in-memory graph, no disk I/O
// ---------------------------------------------------------------------------

const fakeG = {
  nodes: [
    { id: "KienzleForceModel", label: "Kienzle Force Model", info: "cutting force", layer: "L5" },
    { id: "FooEngine",         label: "Foo Engine",          info: "",               layer: "L5" },
    { id: "BarTool",           label: "Bar Tool",            info: "tooling",        layer: "L7" },
  ],
};

test("findInGraph hermetic: kienzle query returns ≥1 hit matching /kienzle/i on label+id+info", () => {
  const hits = findInGraph(fakeG, "kienzle", { limit: 5 });
  assert.ok(hits.length >= 1, `expected ≥1 hit, got ${hits.length}`);
  assert.ok(
    hits.every(h => /kienzle/i.test(h.label + " " + h.id + " " + (h.info ?? ""))),
    "every hit must match /kienzle/i on label+id+info"
  );
});

test("findInGraph hermetic: limit=1 on 'engine' query returns exactly 1 result", () => {
  const hits = findInGraph(fakeG, "engine", { limit: 1 });
  assert.equal(hits.length, 1, `expected exactly 1 hit (limit respected), got ${hits.length}`);
});

test("findInGraph hermetic: purity — same query twice returns deepEqual results", () => {
  assert.deepEqual(
    findInGraph(fakeG, "tool", { limit: 5 }),
    findInGraph(fakeG, "tool", { limit: 5 }),
    "findInGraph must be pure — identical inputs must produce deepEqual outputs"
  );
});
