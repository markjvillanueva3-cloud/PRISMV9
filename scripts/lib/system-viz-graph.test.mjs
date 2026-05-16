import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";
import { loadGraph, findInGraph, __test } from "./system-viz-graph.mjs";

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

// ---------------------------------------------------------------------------
// P1 / U-CACHE-LIB — cache + throw-path coverage
// ---------------------------------------------------------------------------

test("readAndParse throws descriptive read error on a missing path", () => {
  const bogus = path.join(os.tmpdir(), "prism-no-such-graph-" + Date.now() + ".json");
  assert.throws(
    () => __test.readAndParse(bogus),
    (e) => e instanceof Error
      && /Cannot read graph at/.test(e.message)
      && e.message.includes(bogus)
      && /generate-system-viz\.mjs/.test(e.message),
    "missing file must throw the descriptive read error naming the path + remedy"
  );
});

test("readAndParse throws descriptive PARSE error (distinct from read) on malformed JSON", () => {
  const bad = path.join(os.tmpdir(), "prism-bad-graph-" + Date.now() + ".json");
  fs.writeFileSync(bad, "{ not valid json ", "utf8");
  try {
    assert.throws(
      () => __test.readAndParse(bad),
      (e) => e instanceof Error && /Cannot parse graph at/.test(e.message),
      "malformed JSON must throw the descriptive PARSE error, not the read error"
    );
  } finally {
    fs.rmSync(bad, { force: true });
  }
});

test("loadGraph caches: two consecutive zero-arg calls return the SAME object reference", { skip: !HAVE_GRAPH }, () => {
  __test.resetCache();
  const a = loadGraph();
  const b = loadGraph();
  assert.strictEqual(a, b, "second call must be a cache hit (identical reference, no re-parse)");
  assert.ok(__test.peekCache(), "cache must be populated after a non-fresh load");
});

test("loadGraph({fresh:true}) bypasses cache: distinct reference, deepEqual content, cache not poisoned", { skip: !HAVE_GRAPH }, () => {
  __test.resetCache();
  const cached = loadGraph();
  const fresh = loadGraph({ fresh: true });
  assert.notStrictEqual(cached, fresh, "fresh:true must return a NEW parse, not the cached object");
  assert.equal(fresh.nodes.length, cached.nodes.length, "fresh parse must be structurally equivalent");
  // The fresh call must not have replaced the shared cache entry.
  const after = loadGraph();
  assert.strictEqual(after, cached, "fresh:true must NOT poison the shared cache");
});

test("loadGraph cold after resetCache returns a fresh reference", { skip: !HAVE_GRAPH }, () => {
  __test.resetCache();
  const a = loadGraph();
  __test.resetCache();
  const b = loadGraph();
  assert.notStrictEqual(a, b, "after resetCache the next load must re-parse (new reference)");
  assert.deepEqual(a.meta ?? null, b.meta ?? null, "re-parse must yield equivalent content");
});

test("PRISM_VIZ_GRAPH_NO_CACHE=1 disables caching (every call re-parses)", { skip: !HAVE_GRAPH }, () => {
  __test.resetCache();
  const prev = process.env.PRISM_VIZ_GRAPH_NO_CACHE;
  process.env.PRISM_VIZ_GRAPH_NO_CACHE = "1";
  try {
    const a = loadGraph();
    const b = loadGraph();
    assert.notStrictEqual(a, b, "with NO_CACHE=1 each call must re-parse (distinct references)");
    assert.equal(__test.peekCache(), null, "NO_CACHE=1 must not populate the cache");
  } finally {
    if (prev === undefined) delete process.env.PRISM_VIZ_GRAPH_NO_CACHE;
    else process.env.PRISM_VIZ_GRAPH_NO_CACHE = prev;
  }
});

test("cache invalidates when the graph file mtime advances", { skip: !HAVE_GRAPH }, () => {
  __test.resetCache();
  const first = loadGraph();
  // Advance mtime WITHOUT changing content (size identical) to prove the
  // mtime arm of the sentinel triggers a re-parse independently of size.
  const p = __test.graphPath();
  const future = new Date(Date.now() + 5000);
  fs.utimesSync(p, future, future);
  const second = loadGraph();
  assert.notStrictEqual(first, second, "mtime advance must invalidate the cache (re-parse)");
  assert.equal(second.nodes.length, first.nodes.length, "content unchanged across the mtime touch");
});
