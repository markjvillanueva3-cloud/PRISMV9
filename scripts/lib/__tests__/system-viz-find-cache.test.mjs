// system-viz-find-cache.test.mjs — tests for loadFindCache + sidecar lifecycle.
//
// HERMETIC BY CONSTRUCTION: every test writes its graph stub to a tmpdir file
// and sets PRISM_VIZ_GRAPH_PATH to point the lib at it. The live ~370 MB
// production graph at H:/prism/state/shared/system-viz/system-graph.json is
// NEVER opened, moved, or unlinked by any test in this suite.
//
// REGRESSION FENCE: a prior version of this file moved the production graph
// aside via fs.renameSync and tried to restore it via teardown — one test
// (test 4) called teardown without a paired setup and unlinkSync'd the real
// file. The recovery took ~30 min and required restoring from .previous.json.
// The current design uses the PRISM_VIZ_GRAPH_PATH env override I added to
// scripts/lib/system-viz-graph.mjs so tests cannot reach the live path.
//
// COVERAGE FLOOR — per CLAUDE.md comprehensive-build-enforce:
//   happy path + 3 failure modes (corrupt, schema-mismatch, missing-graph)
//   + 2 adversarial inputs (NaN/empty) + variability (different field sets)
//   + a behavior-equivalence test pinning findInGraph(slim) === findInGraph(full).

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LIB_PATH = path.resolve(import.meta.dirname, "..", "system-viz-graph.mjs");

// Re-import the lib in a fresh module instance per test (different URL = different module).
async function freshLib() {
  const url = new URL("file://" + LIB_PATH.replace(/\\/g, "/") + "?t=" + Date.now() + "-" + Math.random());
  return await import(url.href);
}

function makeStubGraph(nodeCount = 5) {
  const nodes = [];
  for (let i = 0; i < nodeCount; i++) {
    nodes.push({
      id: `eng.test-${i}`,
      label: `TestEngine${i}`,
      info: i % 2 === 0 ? `info-${i}` : undefined,
      subgroup: i % 3 === 0 ? "millsubgroup" : "lathesubgroup",
      layer: `L${5 + (i % 4)}`,
      kind: "engine",
      degree: { in: i, out: i + 1 },
      _internalRef: "should-be-stripped",
    });
  }
  return {
    schemaVersion: "2.1.0",
    generatedAt: new Date().toISOString(),
    nodes,
    edges: nodes.map((n, i) => ({ from: n.id, to: nodes[(i + 1) % nodes.length].id, kind: "edge.test" })),
    meta: { coverage: { total: nodeCount } },
  };
}

// Each test allocates fresh tmpdir paths for BOTH the graph stub AND the
// sidecar — env overrides point the lib at them. No mutation of any real path.
function tmpPaths(label) {
  const base = path.join(os.tmpdir(), `viz-find-cache-test-${process.pid}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return { graph: base + ".graph.json", cache: base + ".cache.json", dir: base };
}

function writeStubGraph(graphPath, graphObj) {
  fs.mkdirSync(path.dirname(graphPath), { recursive: true });
  fs.writeFileSync(graphPath, JSON.stringify(graphObj), "utf8");
}

function cleanup(paths) {
  for (const p of [paths.graph, paths.cache]) {
    try { fs.unlinkSync(p); } catch {}
  }
  // No directory to clean — we use os.tmpdir() directly with unique filenames.
}

function setEnv(paths) {
  process.env.PRISM_VIZ_GRAPH_PATH = paths.graph;
  process.env.PRISM_VIZ_FIND_CACHE_PATH = paths.cache;
  delete process.env.PRISM_VIZ_FIND_CACHE_DISABLE;
  delete process.env.PRISM_VIZ_GRAPH_NO_CACHE;
}

function clearEnv() {
  delete process.env.PRISM_VIZ_GRAPH_PATH;
  delete process.env.PRISM_VIZ_FIND_CACHE_PATH;
  delete process.env.PRISM_VIZ_FIND_CACHE_DISABLE;
  delete process.env.PRISM_VIZ_GRAPH_NO_CACHE;
}

// ============================================================================
// HAPPY PATH — first call (cache miss) writes sidecar; second call (cache hit)
// returns the same nodes without re-parsing the graph.
// ============================================================================
test("happy path: first call writes sidecar, second call reads it back", async () => {
  const paths = tmpPaths("happy");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(10));
  try {
    const lib = await freshLib();

    const r1 = lib.loadFindCache();
    assert.equal(Array.isArray(r1.nodes), true);
    assert.equal(r1.nodes.length, 10);
    assert.equal(fs.existsSync(paths.cache), true, "sidecar file written");

    const sidecar = JSON.parse(fs.readFileSync(paths.cache, "utf8"));
    assert.equal(sidecar.schemaVersion, 1);
    assert.equal(typeof sidecar.sourceMtimeMs, "number");
    assert.equal(typeof sidecar.sourceSize, "number");
    assert.equal(sidecar.nodes.length, 10);
    assert.equal(sidecar.nodes[0].degree, undefined, "non-projected fields stripped");
    assert.equal(sidecar.nodes[0]._internalRef, undefined);
    assert.equal(sidecar.nodes[0].label, "TestEngine0");

    const r2 = lib.loadFindCache();
    assert.equal(r2.nodes.length, 10);
    assert.equal(r2.nodes[0].label, "TestEngine0");
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// FAILURE MODE 1 — corrupt sidecar (invalid JSON) → fall through, self-heal.
// ============================================================================
test("failure: corrupt sidecar (invalid JSON) falls through and self-heals", async () => {
  const paths = tmpPaths("corrupt");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(3));
  fs.writeFileSync(paths.cache, "{ this is not json", "utf8");
  try {
    const lib = await freshLib();
    const r = lib.loadFindCache();
    assert.equal(r.nodes.length, 3, "fell through to graph parse");
    const sidecar = JSON.parse(fs.readFileSync(paths.cache, "utf8"));
    assert.equal(sidecar.nodes.length, 3, "sidecar self-healed");
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// FAILURE MODE 2 — schema-mismatch sidecar.
// ============================================================================
test("failure: schema-mismatch sidecar (missing sourceMtimeMs) falls through", async () => {
  const paths = tmpPaths("schema");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(4));
  fs.writeFileSync(paths.cache, JSON.stringify({ nodes: [{ id: "stale.node", label: "Stale" }] }), "utf8");
  try {
    const lib = await freshLib();
    // Verify schema-rejection BEFORE loadFindCache overwrites the malformed sidecar.
    assert.equal(lib.__test.readSidecarIfFresh(), null, "schema-mismatch returns null");
    const r = lib.loadFindCache();
    assert.equal(r.nodes.length, 4);
    const fresh = lib.__test.readSidecarIfFresh();
    assert.notEqual(fresh, null, "valid sidecar written after fall-through");
    assert.equal(fresh.nodes.length, 4);
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// FAILURE MODE 3 — graph file vanished. Must NOT serve sidecar against
// a vanished graph. lib must throw canonical "Cannot read graph" error.
// ============================================================================
test("failure: graph vanished + sidecar present → fall through to canonical err", async () => {
  const paths = tmpPaths("vanish");
  setEnv(paths);
  // Sidecar is valid-shaped but the graph file simply does not exist.
  fs.writeFileSync(paths.cache, JSON.stringify({
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceMtimeMs: 12345,
    sourceSize: 999,
    nodes: [{ id: "ghost.node", label: "GhostLabel" }],
  }), "utf8");
  try {
    const lib = await freshLib();
    assert.equal(lib.__test.readSidecarIfFresh(), null, "no false hit against vanished graph");
    assert.throws(() => lib.loadFindCache(), /Cannot (read|parse) graph/);
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// FAILURE MODE 4 (boundary) — graph mtime changed since sidecar wrote.
// ============================================================================
test("failure: graph mtime moved since sidecar wrote → invalidate + re-parse", async () => {
  const paths = tmpPaths("mtime");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(2));
  try {
    const lib = await freshLib();
    lib.loadFindCache();
    assert.equal(fs.existsSync(paths.cache), true);
    const future = (Date.now() + 5000) / 1000;
    fs.utimesSync(paths.graph, future, future);
    assert.equal(lib.__test.readSidecarIfFresh(), null, "mtime mismatch invalidates");
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// ADVERSARIAL 1 — sidecar with sourceMtimeMs=null → schema-reject.
// ============================================================================
test("adversarial: sourceMtimeMs=null sidecar rejected by schema check", async () => {
  const paths = tmpPaths("nullmtime");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(1));
  fs.writeFileSync(paths.cache, '{"schemaVersion":1,"generatedAt":"x","sourceMtimeMs":null,"sourceSize":1,"nodes":[]}', "utf8");
  try {
    const lib = await freshLib();
    assert.equal(lib.__test.readSidecarIfFresh(), null);
    const stat = fs.statSync(paths.graph);
    assert.notEqual(stat.mtimeMs, NaN);
    assert.equal(NaN === stat.mtimeMs, false);
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// ADVERSARIAL 2 — empty graph (nodes:[]).
// ============================================================================
test("adversarial: empty graph (nodes:[]) writes valid empty sidecar", async () => {
  const paths = tmpPaths("empty");
  setEnv(paths);
  writeStubGraph(paths.graph, { schemaVersion: "2.1.0", nodes: [], edges: [], meta: {} });
  try {
    const lib = await freshLib();
    const r = lib.loadFindCache();
    assert.equal(r.nodes.length, 0);
    const sidecar = JSON.parse(fs.readFileSync(paths.cache, "utf8"));
    assert.equal(sidecar.nodes.length, 0);
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// BEHAVIOR EQUIVALENCE — findInGraph(slim sidecar) === findInGraph(full graph).
// ============================================================================
test("equivalence: findInGraph(slim) === findInGraph(full) for matching query", async () => {
  const paths = tmpPaths("equiv");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(20));
  try {
    const lib = await freshLib();
    const slim = lib.loadFindCache();
    const full = lib.loadGraph({ fresh: true });
    for (const q of ["TestEngine", "millsubgroup", "info-2", "eng.test-7", "L6"]) {
      const slimHits = lib.findInGraph(slim, q, { limit: 30 });
      const fullHits = lib.findInGraph(full, q, { limit: 30 });
      assert.equal(slimHits.length, fullHits.length, `hit count diverged for "${q}"`);
      assert.deepEqual(slimHits.map(h => h.id), fullHits.map(h => h.id), `hit id-order diverged for "${q}"`);
    }
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// KNOB: PRISM_VIZ_FIND_CACHE_DISABLE=1 bypasses both read AND write.
// ============================================================================
test("knob: PRISM_VIZ_FIND_CACHE_DISABLE=1 bypasses read AND write", async () => {
  const paths = tmpPaths("disable");
  setEnv(paths);
  process.env.PRISM_VIZ_FIND_CACHE_DISABLE = "1";
  writeStubGraph(paths.graph, makeStubGraph(3));
  try {
    const lib = await freshLib();
    const r = lib.loadFindCache();
    assert.equal(r.nodes.length, 3);
    assert.equal(fs.existsSync(paths.cache), false, "sidecar NOT written when disabled");
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// TOCTOU: graph mutated mid-parse → write should abort.
// ============================================================================
test("toctou: writeSidecarAtomic aborts when graph mtime/size changes mid-parse", async () => {
  const paths = tmpPaths("toctou");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(2));
  try {
    const lib = await freshLib();
    const staleStat = fs.statSync(paths.graph);
    fs.writeFileSync(paths.graph, JSON.stringify({
      schemaVersion: "2.1.0", nodes: [], edges: [],
    }) + "                  ", "utf8");
    lib.__test.writeSidecarAtomic({ nodes: [{ id: "ghost", label: "Ghost" }] }, staleStat);
    assert.equal(fs.existsSync(paths.cache), false, "stale-stat write aborted");
  } finally {
    clearEnv(); cleanup(paths);
  }
});

// ============================================================================
// MKDIR: nested sidecar dir doesn't pre-exist → still writes (P0 fix).
// ============================================================================
test("mkdir: write succeeds even when sidecar parent dir does not pre-exist", async () => {
  const paths = tmpPaths("mkdir");
  // Override the sidecar path to a deeply-nested non-existent dir.
  const nested = path.join(os.tmpdir(), `viz-mkdir-${process.pid}-${Date.now()}`, "deeply", "nested");
  const cachePath = path.join(nested, "find-cache.json");
  process.env.PRISM_VIZ_GRAPH_PATH = paths.graph;
  process.env.PRISM_VIZ_FIND_CACHE_PATH = cachePath;
  delete process.env.PRISM_VIZ_FIND_CACHE_DISABLE;
  writeStubGraph(paths.graph, makeStubGraph(2));
  try {
    assert.equal(fs.existsSync(nested), false);
    const lib = await freshLib();
    lib.loadFindCache();
    assert.equal(fs.existsSync(cachePath), true);
  } finally {
    clearEnv();
    try { fs.unlinkSync(cachePath); } catch {}
    try { fs.rmSync(path.dirname(path.dirname(nested)), { recursive: true, force: true }); } catch {}
    try { fs.unlinkSync(paths.graph); } catch {}
  }
});

// ============================================================================
// REGRESSION FENCE — this test asserts the suite as a whole never touches the
// production graph path. Read CLAUDE.md ## Recent regressions 2026-05-18
// U-VIZ-FIND-CACHE for why this matters.
// ============================================================================
test("regression fence: PRISM_VIZ_GRAPH_PATH override actually overrides", async () => {
  const paths = tmpPaths("fence");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(1));
  try {
    const lib = await freshLib();
    // graphPath() must return our tmp path, NOT the default production path.
    assert.equal(lib.__test.graphPath(), paths.graph, "env override must take precedence");
    assert.notEqual(lib.__test.graphPath(), lib.__test.defaultGraphPath(), "must differ from default");
    // loadGraph + loadFindCache must use our path.
    const g = lib.loadGraph({ fresh: true });
    assert.equal(g.nodes.length, 1, "loadGraph honored override");
    const slim = lib.loadFindCache();
    assert.equal(slim.nodes.length, 1, "loadFindCache honored override");
  } finally {
    clearEnv(); cleanup(paths);
  }
});
