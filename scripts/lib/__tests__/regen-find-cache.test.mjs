// regen-find-cache.test.mjs — tests for regenFindCache (offline find-cache writer).
//
// HERMETIC BY CONSTRUCTION: every test writes its graph stub to a tmp file and
// sets PRISM_VIZ_GRAPH_PATH + PRISM_VIZ_FIND_CACHE_PATH to tmp paths. The live
// ~685MB production graph at H:/prism/state/shared/system-viz/system-graph.json
// is NEVER opened, moved, or unlinked by any test here. (Same regression fence
// as the sibling system-viz-find-cache.test.mjs — see its header for the ~30min
// recovery that motivated the PRISM_VIZ_GRAPH_PATH override.)
//
// COVERAGE FLOOR — per CLAUDE.md comprehensive-build-enforce:
//   happy path + the drop-in-equivalence-with-the-lazy-writer test (the WHOLE
//   point — the eager writer must emit exactly what the lazy reader expects)
//   + 2 non-fatal reason paths (graph-missing, cache-disabled) + idempotent
//   re-gen after staleness. Real behavior, real reference values — no stubs.

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LIB_PATH = path.resolve(import.meta.dirname, "..", "system-viz-graph.mjs");

// Fresh module instance per test (distinct URL = distinct module) so the lib's
// module-scope _cache never leaks between cases.
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
      degree: { in: i, out: i + 1 },     // non-projected — must be stripped
      _internalRef: "should-be-stripped", // non-projected — must be stripped
    });
  }
  return {
    schemaVersion: "2.1.0",
    generatedAt: new Date().toISOString(),
    nodes,
    edges: [],
    meta: { coverage: { total: nodeCount } },
  };
}

function tmpPaths(label) {
  const base = path.join(os.tmpdir(), `regen-find-cache-test-${process.pid}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
  return { graph: base + ".graph.json", cache: base + ".cache.json" };
}

function writeStubGraph(graphPath, graphObj) {
  fs.mkdirSync(path.dirname(graphPath), { recursive: true });
  fs.writeFileSync(graphPath, JSON.stringify(graphObj), "utf8");
}

function cleanup(paths) {
  for (const p of [paths.graph, paths.cache]) { try { fs.unlinkSync(p); } catch {} }
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
// HAPPY PATH — offline generate writes a fresh sidecar with the slim projection.
// ============================================================================
test("happy: regenFindCache writes a fresh sidecar (ok, projected, schemaVersion 1)", async () => {
  const paths = tmpPaths("happy");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(12));
  try {
    const lib = await freshLib();
    const r = lib.regenFindCache();
    assert.equal(r.ok, true, r.reason || "should succeed");
    assert.equal(r.nodeCount, 12);
    assert.equal(fs.existsSync(paths.cache), true, "sidecar written");
    assert.ok(r.bytes > 0, "reports byte size");
    const sidecar = JSON.parse(fs.readFileSync(paths.cache, "utf8"));
    assert.equal(sidecar.schemaVersion, 1);
    assert.equal(sidecar.nodes.length, 12);
    assert.equal(sidecar.nodes[0].degree, undefined, "non-projected fields stripped");
    assert.equal(sidecar.nodes[0]._internalRef, undefined);
    assert.equal(sidecar.nodes[0].label, "TestEngine0");
  } finally { clearEnv(); cleanup(paths); }
});

// ============================================================================
// DROP-IN EQUIVALENCE — the offline-written sidecar is consumed as a cache-HIT
// by the lazy loadFindCache (no re-parse), proving byte-format compatibility.
// THIS is the whole point: the eager writer must produce exactly what the lazy
// reader expects, so the next `find` pays NO cold parse.
// ============================================================================
test("drop-in: offline sidecar is a fresh cache-hit for loadFindCache (no cold parse next)", async () => {
  const paths = tmpPaths("dropin");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(8));
  try {
    const lib = await freshLib();
    lib.regenFindCache();
    // readSidecarIfFresh returns non-null ONLY when the sidecar is valid AND
    // fresh vs the live graph stat — i.e. the next `find` will NOT re-parse.
    const fresh = lib.__test.readSidecarIfFresh();
    assert.notEqual(fresh, null, "offline sidecar is fresh → no cold parse");
    assert.equal(fresh.nodes.length, 8);
    const r = lib.loadFindCache();
    assert.equal(r.nodes.length, 8);
    assert.equal(r.nodes[0].label, "TestEngine0");
  } finally { clearEnv(); cleanup(paths); }
});

// ============================================================================
// NON-FATAL 1 — graph file missing → ok:false reason, no throw, no sidecar.
// ============================================================================
test("graph-missing: ok:false reason=graph-missing, no sidecar written", async () => {
  const paths = tmpPaths("nograph");
  setEnv(paths); // graph file intentionally NOT created
  try {
    const lib = await freshLib();
    const r = lib.regenFindCache();
    assert.equal(r.ok, false);
    assert.equal(r.reason, "graph-missing");
    assert.equal(fs.existsSync(paths.cache), false, "no sidecar against a missing graph");
  } finally { clearEnv(); cleanup(paths); }
});

// ============================================================================
// NON-FATAL 2 — disable knob → ok:false reason=cache-disabled, no write.
// ============================================================================
test("disable knob: ok:false reason=cache-disabled, no sidecar written", async () => {
  const paths = tmpPaths("disable");
  setEnv(paths);
  process.env.PRISM_VIZ_FIND_CACHE_DISABLE = "1";
  writeStubGraph(paths.graph, makeStubGraph(3));
  try {
    const lib = await freshLib();
    const r = lib.regenFindCache();
    assert.equal(r.ok, false);
    assert.equal(r.reason, "cache-disabled");
    assert.equal(fs.existsSync(paths.cache), false, "knob suppresses the write");
  } finally { clearEnv(); cleanup(paths); }
});

// ============================================================================
// IDEMPOTENT — re-gen after the graph mtime moves rewrites a fresh sidecar.
// (Confirms the offline writer self-heals staleness the same way the lazy path
// invalidates on mtime/size drift.)
// ============================================================================
test("idempotent: re-gen after graph mtime moves restores freshness", async () => {
  const paths = tmpPaths("idem");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(4));
  try {
    const lib = await freshLib();
    assert.equal(lib.regenFindCache().ok, true);
    // Move graph mtime forward → the just-written sidecar is now stale.
    const future = (Date.now() + 5000) / 1000;
    fs.utimesSync(paths.graph, future, future);
    assert.equal(lib.__test.readSidecarIfFresh(), null, "sidecar stale after mtime move");
    // Re-gen → fresh again.
    assert.equal(lib.regenFindCache().ok, true);
    assert.notEqual(lib.__test.readSidecarIfFresh(), null, "re-gen restored freshness");
  } finally { clearEnv(); cleanup(paths); }
});

// ============================================================================
// IDEMPOTENCE FAST-PATH — a second call with no graph change must SKIP the parse
// (reason "already-fresh") and NOT rewrite the sidecar. This is what makes
// regenFindCache cheap to call defensively (the cache-status → self-heal path).
// ============================================================================
test("fast-path: fresh sidecar is skipped (reason=already-fresh), not re-written", async () => {
  const paths = tmpPaths("skipfresh");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(5));
  try {
    const lib = await freshLib();
    const r1 = lib.regenFindCache();
    assert.equal(r1.ok, true);
    assert.notEqual(r1.reason, "already-fresh", "first call must actually build, not skip");
    const m1 = fs.statSync(paths.cache).mtimeMs;
    // Second call, graph unchanged → must take the fast path (no parse, no rewrite).
    const r2 = lib.regenFindCache();
    assert.equal(r2.ok, true);
    assert.equal(r2.reason, "already-fresh", "fresh sidecar must be skipped");
    assert.equal(r2.nodeCount, 5, "skip path still reports the node count");
    assert.equal(fs.statSync(paths.cache).mtimeMs, m1, "fresh sidecar must NOT be rewritten");
  } finally { clearEnv(); cleanup(paths); }
});

// ============================================================================
// noteCount — projectForFind derives a STRUCTURAL brain-coverage count from each
// node's knowledge.{wikiEntries,memoryEntries}; set ONLY when >0 (undocumented
// nodes carry no field → zero cache bloat). NOT a searched field.
// ============================================================================
test("noteCount: derived from knowledge arrays; absent when zero/missing", async () => {
  const paths = tmpPaths("notecount");
  setEnv(paths);
  fs.mkdirSync(path.dirname(paths.graph), { recursive: true });
  fs.writeFileSync(paths.graph, JSON.stringify({
    schemaVersion: "2.1.0", generatedAt: "x", edges: [], meta: {},
    nodes: [
      { id: "eng.a", label: "A", layer: "L5", kind: "engine", knowledge: { wikiEntries: ["w1", "w2"], memoryEntries: ["m1"] } },
      { id: "eng.b", label: "B", layer: "L5", kind: "engine", knowledge: { wikiEntries: [] } },
      { id: "eng.c", label: "C", layer: "L5", kind: "engine" },
    ],
  }), "utf8");
  try {
    const lib = await freshLib();
    assert.equal(lib.regenFindCache().ok, true);
    const sidecar = JSON.parse(fs.readFileSync(paths.cache, "utf8"));
    const byId = Object.fromEntries(sidecar.nodes.map((n) => [n.id, n]));
    assert.equal(byId["eng.a"].noteCount, 3, "wiki(2)+mem(1)=3");
    assert.equal(byId["eng.b"].noteCount, undefined, "empty arrays → no field (no bloat)");
    assert.equal(byId["eng.c"].noteCount, undefined, "no knowledge → no field");
  } finally { clearEnv(); cleanup(paths); }
});

// ============================================================================
// force — regenFindCache({force:true}) bypasses the idempotence fast-path so a
// CHANGED projection (e.g. the new noteCount field) actually redeploys even when
// the existing cache is mtime-fresh.
// ============================================================================
test("force: {force:true} rebuilds past the already-fresh fast-path", async () => {
  const paths = tmpPaths("force");
  setEnv(paths);
  writeStubGraph(paths.graph, makeStubGraph(4));
  try {
    const lib = await freshLib();
    assert.equal(lib.regenFindCache().ok, true);
    assert.equal(lib.regenFindCache().reason, "already-fresh", "plain re-call hits the fast-path");
    const rf = lib.regenFindCache({ force: true });
    assert.equal(rf.ok, true);
    assert.notEqual(rf.reason, "already-fresh", "force must bypass the fast-path and rebuild");
  } finally { clearEnv(); cleanup(paths); }
});
