/**
 * system-viz-graph-findcache.test.mjs -- hermetic coverage for the
 * loadFindCache() serve-stale-then-async-heal fallback (2026-06-09 durable
 * OOM fix, slot:sierra).
 *
 * THE CONTRACT UNDER TEST: loadFindCache()'s stale/absent fallback MUST NOT call
 * loadGraph() (which materializes the ~643MB graph into V8 heap -> OOM inside a
 * ~1500ms hook budget). Instead it serves the STALE sidecar's nodes (stale:true)
 * or a fail-soft empty result (cold), and fires a DETACHED + DEBOUNCED
 * regen-find-cache subprocess so the next call self-heals.
 *
 * HERMETIC: every test points PRISM_VIZ_FIND_CACHE_PATH at a per-test temp dir,
 * writes a small fixture sidecar (NOT the real 643MB graph, NO real 643MB I/O),
 * and injects spawn / loadGraph / now via the loadFindCache DI seams. The
 * injected loadGraph THROWS, so any test in which the fallback wrongly reached
 * loadGraph fails loud. R9: real values + real behavior assertions, no stubs
 * that hide intent.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { loadFindCache, findInGraph, __test } from "./system-viz-graph.mjs";

// ---------------------------------------------------------------------------
// Test harness: per-test temp sidecar + a loadGraph that THROWS if ever called
// (proves the stale/cold fallback never materializes the graph).
// ---------------------------------------------------------------------------

function mkTmpDir() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-findcache-"));
}

// A loadGraph seam that fails loud the instant the fallback touches it. The
// whole point of the fix is that the stale/cold path NEVER reaches loadGraph.
function explodingLoadGraph() {
  throw new Error("loadGraph MUST NOT be called in the stale/cold fallback path");
}

// Minimal sidecar fixture -- the slim-node shape loadFindCache returns + the
// freshness fields readSidecarIfFresh checks. Sized in bytes, not megabytes.
function writeSidecarFixture(cachePath, { fresh, graphPath }) {
  // When fresh:true we mirror the live graph's stat so readSidecarIfFresh()
  // treats it as a hit. When fresh:false (stale) we deliberately mismatch.
  let sourceMtimeMs = 1, sourceSize = 1;
  if (fresh && graphPath) {
    const st = fs.statSync(graphPath);
    sourceMtimeMs = st.mtimeMs;
    sourceSize = st.size;
  }
  const sidecar = {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    sourceMtimeMs,
    sourceSize,
    nodes: [
      { id: "KienzleForceModel", label: "Kienzle Force Model", info: "cutting force", layer: "L5" },
      { id: "FooEngine", label: "Foo Engine", info: "", layer: "L5" },
    ],
  };
  fs.writeFileSync(cachePath, JSON.stringify(sidecar), "utf8");
}

// Write a tiny "graph" file so readSidecarIfFresh's statSync(graphPath()) and the
// fresh-fixture path have a real file to stat. This is a few-byte JSON, NEVER the
// 643MB graph -- the fallback under test never parses it (loadGraph is injected).
function writeTinyGraph(graphPath) {
  fs.writeFileSync(graphPath, JSON.stringify({ nodes: [{ id: "x", label: "x" }] }), "utf8");
}

// Spy spawn seam: records calls, returns an object with a no-op unref (matches
// the ChildProcess.unref() contract spawnDebouncedRegen calls).
function makeSpawnSpy() {
  const calls = [];
  const fn = (...args) => { calls.push(args); return { unref() {} }; };
  return { fn, calls };
}

// Run a block with PRISM_VIZ_FIND_CACHE_PATH + PRISM_VIZ_GRAPH_PATH pinned to a
// temp dir, restoring env afterwards. Returns the chosen paths.
function withTempEnv(run) {
  const dir = mkTmpDir();
  const cachePath = path.join(dir, "find-cache.json");
  const graphPath = path.join(dir, "system-graph.json");
  const prevCache = process.env.PRISM_VIZ_FIND_CACHE_PATH;
  const prevGraph = process.env.PRISM_VIZ_GRAPH_PATH;
  const prevDisable = process.env.PRISM_VIZ_FIND_CACHE_DISABLE;
  process.env.PRISM_VIZ_FIND_CACHE_PATH = cachePath;
  process.env.PRISM_VIZ_GRAPH_PATH = graphPath;
  delete process.env.PRISM_VIZ_FIND_CACHE_DISABLE;
  try {
    return run({ dir, cachePath, graphPath });
  } finally {
    if (prevCache === undefined) delete process.env.PRISM_VIZ_FIND_CACHE_PATH;
    else process.env.PRISM_VIZ_FIND_CACHE_PATH = prevCache;
    if (prevGraph === undefined) delete process.env.PRISM_VIZ_GRAPH_PATH;
    else process.env.PRISM_VIZ_GRAPH_PATH = prevGraph;
    if (prevDisable === undefined) delete process.env.PRISM_VIZ_FIND_CACHE_DISABLE;
    else process.env.PRISM_VIZ_FIND_CACHE_DISABLE = prevDisable;
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  }
}

// ---------------------------------------------------------------------------
// 1. FRESH sidecar -> plain hit, no stale flag, NO spawn.
// ---------------------------------------------------------------------------
test("fresh sidecar -> plain cache hit (no stale flag, no regen spawn)", () => {
  withTempEnv(({ cachePath, graphPath }) => {
    writeTinyGraph(graphPath);
    writeSidecarFixture(cachePath, { fresh: true, graphPath });
    const spawnSpy = makeSpawnSpy();

    const res = loadFindCache({}, {
      _spawn: spawnSpy.fn,
      _loadGraph: explodingLoadGraph,
    });

    assert.ok(Array.isArray(res.nodes) && res.nodes.length === 2, "fresh hit returns the sidecar nodes");
    assert.equal(res.stale, undefined, "fresh hit must NOT carry a stale flag");
    assert.equal(res.cold, undefined, "fresh hit must NOT carry a cold flag");
    assert.equal(spawnSpy.calls.length, 0, "fresh hit must NOT spawn a regen");
    // The fresh hit must be findable -- prove the projection round-trips findInGraph.
    const hits = findInGraph(res, "kienzle", { limit: 5 });
    assert.ok(hits.length >= 1, "fresh-hit nodes are searchable via findInGraph");
  });
});

// ---------------------------------------------------------------------------
// 2. STALE sidecar present -> returns the stale nodes WITH stale:true AND spawns
//    the regen exactly once. loadGraph (injected) must NOT be called.
// ---------------------------------------------------------------------------
test("stale sidecar -> serves stale nodes (stale:true) + spawns regen once, never loadGraph", () => {
  withTempEnv(({ cachePath, graphPath }) => {
    writeTinyGraph(graphPath);
    // fresh:false -> sourceMtimeMs/Size deliberately mismatch the live graph,
    // so readSidecarIfFresh() rejects it as stale but the bytes still parse.
    writeSidecarFixture(cachePath, { fresh: false, graphPath });
    const spawnSpy = makeSpawnSpy();

    const res = loadFindCache({}, {
      _spawn: spawnSpy.fn,
      _loadGraph: explodingLoadGraph, // throws if the fallback wrongly hits it
      _now: () => 0, // ensure no pre-existing lock debounces us
    });

    assert.equal(res.stale, true, "stale path must flag stale:true");
    assert.notEqual(res.cold, true, "a present-but-stale sidecar is NOT cold");
    assert.ok(Array.isArray(res.nodes) && res.nodes.length === 2, "stale path serves the stale sidecar nodes");
    assert.equal(spawnSpy.calls.length, 1, "stale path must spawn the regen exactly once");
    // Prove the detached spawn flags: detached:true + stdio:'ignore'.
    const [, , opts] = spawnSpy.calls[0];
    assert.equal(opts.detached, true, "regen spawn must be detached");
    assert.equal(opts.stdio, "ignore", "regen spawn stdio must be ignore");
    // The served stale nodes are still searchable (the value of serve-stale).
    assert.ok(findInGraph(res, "foo", { limit: 5 }).length >= 1, "stale nodes remain searchable");
  });
});

// ---------------------------------------------------------------------------
// 3. COLD (no sidecar) -> fail-soft empty (stale:true, cold:true), spawns regen
//    once, and PROVES loadGraph is never invoked (injected loadGraph throws).
// ---------------------------------------------------------------------------
test("cold (no sidecar) -> fail-soft empty {stale,cold} + spawn once + loadGraph NEVER called", () => {
  withTempEnv(({ cachePath, graphPath }) => {
    writeTinyGraph(graphPath);
    // Deliberately do NOT write a sidecar -> cold start.
    assert.equal(fs.existsSync(cachePath), false, "precondition: no sidecar on disk (cold)");
    const spawnSpy = makeSpawnSpy();

    let loadGraphCalled = false;
    const res = loadFindCache({}, {
      _spawn: spawnSpy.fn,
      _loadGraph: () => { loadGraphCalled = true; throw new Error("loadGraph called in cold path"); },
      _now: () => 0,
    });

    assert.equal(loadGraphCalled, false, "PROOF: loadGraph must NEVER be called in the cold fallback");
    assert.deepEqual(res.nodes, [], "cold path returns an empty nodes array");
    assert.equal(res.stale, true, "cold path flags stale:true");
    assert.equal(res.cold, true, "cold path flags cold:true");
    assert.equal(spawnSpy.calls.length, 1, "cold path must spawn the regen exactly once");
    // findInGraph over the empty result must return [] -- the caller renders
    // "Found 0 node(s)" rather than crashing (fail-soft for the hot path).
    assert.deepEqual(findInGraph(res, "anything", { limit: 5 }), [], "empty cold result is safe to search");
  });
});

// ---------------------------------------------------------------------------
// 4. DEBOUNCE: a fresh regen lock (< 60s old) -> the next stale/cold call does
//    NOT spawn again.
// ---------------------------------------------------------------------------
test("debounce: a fresh regen lock (<60s) suppresses a second spawn", () => {
  withTempEnv(({ cachePath, graphPath }) => {
    writeTinyGraph(graphPath);
    writeSidecarFixture(cachePath, { fresh: false, graphPath }); // stale
    const spawnSpy = makeSpawnSpy();

    // Pin "now" to a fixed clock so the lock written by call #1 is, to call #2,
    // 0ms old -- well inside the 60s debounce window.
    const fixedNow = () => 1_000_000;

    const first = loadFindCache({}, { _spawn: spawnSpy.fn, _loadGraph: explodingLoadGraph, _now: fixedNow });
    const second = loadFindCache({}, { _spawn: spawnSpy.fn, _loadGraph: explodingLoadGraph, _now: fixedNow });

    assert.equal(first.stale, true, "first stale call serves stale");
    assert.equal(second.stale, true, "second stale call still serves stale");
    assert.equal(spawnSpy.calls.length, 1, "debounce: only the FIRST call spawns; the second is suppressed");
    // Sanity: the lock file actually exists (the debounce signal is real, on disk).
    assert.ok(fs.existsSync(__test.regenLockPath()), "the debounce lock file was written");
  });
});

// ---------------------------------------------------------------------------
// 4b. DEBOUNCE EXPIRES: a lock older than 60s -> a new spawn IS issued.
//     Proves the debounce is a sliding window, not a permanent suppressor (R9:
//     the test fails if the window logic is inverted or the lock never expires).
// ---------------------------------------------------------------------------
test("debounce expiry: a lock older than the window allows a new spawn", () => {
  withTempEnv(({ cachePath, graphPath }) => {
    writeTinyGraph(graphPath);
    writeSidecarFixture(cachePath, { fresh: false, graphPath }); // stale
    const spawnSpy = makeSpawnSpy();
    const win = __test.regenDebounceMs();

    // Call #1 at t=0 writes the lock.
    loadFindCache({}, { _spawn: spawnSpy.fn, _loadGraph: explodingLoadGraph, _now: () => 0 });
    assert.equal(spawnSpy.calls.length, 1, "first call spawns");

    // Call #2 at t = window + 1 -> the lock is now stale, so a new spawn fires.
    loadFindCache({}, { _spawn: spawnSpy.fn, _loadGraph: explodingLoadGraph, _now: () => win + 1 });
    assert.equal(spawnSpy.calls.length, 2, "after the debounce window expires, a new spawn is issued");
  });
});

// ---------------------------------------------------------------------------
// 5. SPAWN FAILURE -> no throw; loadFindCache still returns its (stale) result.
// ---------------------------------------------------------------------------
test("spawn failure is fail-safe: loadFindCache still returns (no throw)", () => {
  withTempEnv(({ cachePath, graphPath }) => {
    writeTinyGraph(graphPath);
    writeSidecarFixture(cachePath, { fresh: false, graphPath }); // stale
    const throwingSpawn = () => { throw new Error("spawn EACCES / ENOENT"); };

    let res;
    assert.doesNotThrow(() => {
      res = loadFindCache({}, { _spawn: throwingSpawn, _loadGraph: explodingLoadGraph, _now: () => 0 });
    }, "a spawn failure must NEVER throw into loadFindCache");
    assert.equal(res.stale, true, "even on spawn failure the stale result is returned");
    assert.ok(Array.isArray(res.nodes) && res.nodes.length === 2, "stale nodes still served despite spawn failure");
  });
});

// ---------------------------------------------------------------------------
// 5b. SPAWN FAILURE on a COLD start -> still fail-soft empty, no throw.
// ---------------------------------------------------------------------------
test("spawn failure on cold start is fail-safe (empty result, no throw)", () => {
  withTempEnv(({ cachePath, graphPath }) => {
    writeTinyGraph(graphPath);
    // no sidecar -> cold
    const throwingSpawn = () => { throw new Error("spawn failed"); };
    let res;
    assert.doesNotThrow(() => {
      res = loadFindCache({}, { _spawn: throwingSpawn, _loadGraph: explodingLoadGraph, _now: () => 0 });
    }, "cold-path spawn failure must not throw");
    assert.deepEqual(res.nodes, [], "cold + spawn-fail still returns empty nodes");
    assert.equal(res.cold, true, "cold flag preserved despite spawn failure");
  });
});

// ---------------------------------------------------------------------------
// 6. CORRUPT sidecar -> treated as COLD (cannot serve garbage), not a crash.
//    Guards the readSidecarNodesUnchecked fail-soft -> null path.
// ---------------------------------------------------------------------------
test("corrupt sidecar -> treated as cold (empty result), no throw", () => {
  withTempEnv(({ cachePath, graphPath }) => {
    writeTinyGraph(graphPath);
    fs.writeFileSync(cachePath, "{ not valid json", "utf8"); // corrupt
    const spawnSpy = makeSpawnSpy();
    let res;
    assert.doesNotThrow(() => {
      res = loadFindCache({}, { _spawn: spawnSpy.fn, _loadGraph: explodingLoadGraph, _now: () => 0 });
    }, "a corrupt sidecar must not throw -- it degrades to cold");
    assert.deepEqual(res.nodes, [], "corrupt sidecar serves nothing (cold)");
    assert.equal(res.cold, true, "corrupt sidecar is treated as cold");
    assert.equal(spawnSpy.calls.length, 1, "corrupt sidecar still triggers a heal regen");
  });
});

// ---------------------------------------------------------------------------
// 7. readSidecarNodesUnchecked unit coverage: present-valid -> nodes; absent
//    -> null; corrupt -> null; schema-missing-nodes -> null.
// ---------------------------------------------------------------------------
test("readSidecarNodesUnchecked: present/absent/corrupt/schema-mismatch", () => {
  withTempEnv(({ cachePath }) => {
    // absent
    assert.equal(__test.readSidecarNodesUnchecked(), null, "absent sidecar -> null");
    // valid
    fs.writeFileSync(cachePath, JSON.stringify({ nodes: [{ id: "a" }] }), "utf8");
    const n = __test.readSidecarNodesUnchecked();
    assert.ok(Array.isArray(n) && n.length === 1, "valid sidecar -> nodes array");
    // corrupt
    fs.writeFileSync(cachePath, "{bad", "utf8");
    assert.equal(__test.readSidecarNodesUnchecked(), null, "corrupt sidecar -> null");
    // schema missing nodes
    fs.writeFileSync(cachePath, JSON.stringify({ notNodes: 1 }), "utf8");
    assert.equal(__test.readSidecarNodesUnchecked(), null, "no nodes array -> null");
  });
});
