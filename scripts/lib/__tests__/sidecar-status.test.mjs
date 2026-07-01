// sidecar-status.test.mjs — tests for sidecarStatus (find-cache + graph-index
// freshness vs the live graph). The KEY thing under test is that the two
// sidecars use DIFFERENT freshness gates (find-cache = exact mtime+size;
// graph-index = sourceMtimeMs >= graph.mtime) and sidecarStatus mirrors each.
//
// HERMETIC: every test writes a tmp graph + tmp sidecars and points the lib at
// them via PRISM_VIZ_GRAPH_PATH / PRISM_VIZ_FIND_CACHE_PATH (the index path is
// derived from the find-cache dir). The live ~685MB production graph is NEVER
// opened. (Same fence as system-viz-find-cache.test.mjs.)

import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";

const LIB_PATH = path.resolve(import.meta.dirname, "..", "system-viz-graph.mjs");

async function freshLib() {
  const url = new URL("file://" + LIB_PATH.replace(/\\/g, "/") + "?t=" + Date.now() + "-" + Math.random());
  return await import(url.href);
}

function tmpDir(label) {
  return path.join(os.tmpdir(), `sidecar-status-${process.pid}-${label}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`);
}

function writeGraph(p) {
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify({ schemaVersion: "2.1.0", nodes: [{ id: "a" }], edges: [], meta: {} }), "utf8");
  return fs.statSync(p);
}
function writeFindCache(p, mtimeMs, size) {
  fs.writeFileSync(p, JSON.stringify({ schemaVersion: 1, generatedAt: "x", sourceMtimeMs: mtimeMs, sourceSize: size, nodes: [] }), "utf8");
}
function writeIndex(p, mtimeMs, sizeBytes) {
  fs.writeFileSync(p, JSON.stringify({ schemaVersion: 1, generatedAt: "x", sourceGraph: "g", sourceMtimeMs: mtimeMs, sourceSizeBytes: sizeBytes, nodeCount: 0, nodes: [], inverted: {} }), "utf8");
}

function setEnv(dir) {
  process.env.PRISM_VIZ_GRAPH_PATH = path.join(dir, "system-graph.json");
  process.env.PRISM_VIZ_FIND_CACHE_PATH = path.join(dir, "find-cache.json");
}
function clearEnv() {
  delete process.env.PRISM_VIZ_GRAPH_PATH;
  delete process.env.PRISM_VIZ_FIND_CACHE_PATH;
}

// ============================================================================
// BOTH FRESH — find-cache exact (mtime+size) AND index >= graph mtime.
// ============================================================================
test("both fresh: find-cache exact-match + index >= graph mtime", async () => {
  const dir = tmpDir("fresh"); setEnv(dir);
  try {
    const st = writeGraph(path.join(dir, "system-graph.json"));
    writeFindCache(path.join(dir, "find-cache.json"), st.mtimeMs, st.size);
    writeIndex(path.join(dir, "system-graph-index.json"), st.mtimeMs, st.size);
    const lib = await freshLib();
    const r = lib.sidecarStatus();
    assert.equal(r.graph.exists, true);
    assert.equal(r.findCache.fresh, true, r.findCache.reason);
    assert.equal(r.index.fresh, true, r.index.reason);
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ============================================================================
// FIND-CACHE STALE — size mismatch trips the EXACT gate (index still fresh).
// ============================================================================
test("find-cache stale: size mismatch → stale (exact gate)", async () => {
  const dir = tmpDir("fcstale"); setEnv(dir);
  try {
    const st = writeGraph(path.join(dir, "system-graph.json"));
    writeFindCache(path.join(dir, "find-cache.json"), st.mtimeMs, st.size + 1); // wrong size
    writeIndex(path.join(dir, "system-graph-index.json"), st.mtimeMs, st.size);
    const lib = await freshLib();
    const r = lib.sidecarStatus();
    assert.equal(r.findCache.fresh, false, "exact gate catches size drift");
    assert.equal(r.index.fresh, true);
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ============================================================================
// INDEX STALE — sidecar older than the graph trips the GTE gate.
// ============================================================================
test("index stale: sidecar older than graph → stale (gte gate)", async () => {
  const dir = tmpDir("idxstale"); setEnv(dir);
  try {
    const st = writeGraph(path.join(dir, "system-graph.json"));
    writeFindCache(path.join(dir, "find-cache.json"), st.mtimeMs, st.size);
    writeIndex(path.join(dir, "system-graph-index.json"), st.mtimeMs - 10000, st.size); // older
    const lib = await freshLib();
    const r = lib.sidecarStatus();
    assert.equal(r.index.fresh, false, r.index.reason);
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ============================================================================
// GATE-DISTINCTION GUARD — a sidecar NEWER than the graph is FRESH under the
// index gte gate but would be STALE under the find-cache exact gate. This is
// the load-bearing test: it proves the two gates are genuinely different and
// sidecarStatus applies each correctly (not one gate to both).
// ============================================================================
test("gate distinction: index newer-than-graph is fresh (gte), find-cache same is stale (exact)", async () => {
  const dir = tmpDir("gatedist"); setEnv(dir);
  try {
    const st = writeGraph(path.join(dir, "system-graph.json"));
    const newer = st.mtimeMs + 10000;
    writeIndex(path.join(dir, "system-graph-index.json"), newer, st.size);     // newer → gte fresh
    writeFindCache(path.join(dir, "find-cache.json"), newer, st.size);         // newer → exact STALE (!= )
    const lib = await freshLib();
    const r = lib.sidecarStatus();
    assert.equal(r.index.fresh, true, "gte gate: newer sidecar is fresh");
    assert.equal(r.findCache.fresh, false, "exact gate: newer mtime != graph → stale");
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ============================================================================
// MISSING — no graph + no sidecars → fail-soft exists:false, never fresh.
// ============================================================================
test("missing graph + sidecars → exists:false, not fresh (fail-soft)", async () => {
  const dir = tmpDir("missing"); setEnv(dir);
  try {
    fs.mkdirSync(dir, { recursive: true }); // dir exists, files do not
    const lib = await freshLib();
    const r = lib.sidecarStatus();
    assert.equal(r.graph.exists, false);
    assert.equal(r.findCache.exists, false);
    assert.equal(r.findCache.fresh, false);
    assert.equal(r.index.exists, false);
    assert.equal(r.index.fresh, false);
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ============================================================================
// FRACTION-AWARE REGEX GUARD — the raison d'être of sidecarHead (the 2026-06-01
// false-STALE bug). Force a sub-ms-fractional graph mtime via utimesSync, store
// the FULL float in the sidecar, assert FRESH; then store a FLOORED mtime and
// assert STALE. A floored regex (`\d+` without the `(?:\.\d+)?` capture) would
// read only the integer part of the full-float sidecar → mismatch → STALE,
// failing the first assertion. Skips loudly on a filesystem with no sub-ms res.
// ============================================================================
test("fraction-aware: fractional graph mtime + full-float sidecar → fresh; floored → stale", async () => {
  const dir = tmpDir("frac"); setEnv(dir);
  try {
    const gp = path.join(dir, "system-graph.json");
    writeGraph(gp);
    fs.utimesSync(gp, 1700000000.123456, 1700000000.123456); // sub-ms fraction
    const st = fs.statSync(gp);
    if (st.mtimeMs % 1 === 0) { console.log("# skip frac-guard: filesystem has no sub-ms mtime resolution"); return; }
    writeFindCache(path.join(dir, "find-cache.json"), st.mtimeMs, st.size); // FULL float
    const lib = await freshLib();
    assert.equal(lib.sidecarStatus().findCache.fresh, true, "full-fraction sidecar must be FRESH (floored regex would say STALE)");
    writeFindCache(path.join(dir, "find-cache.json"), Math.floor(st.mtimeMs), st.size); // floored
    const lib2 = await freshLib();
    assert.equal(lib2.sidecarStatus().findCache.fresh, false, "floored sourceMtimeMs vs fractional graph mtime → STALE");
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ============================================================================
// HEAD LACKS sourceMtimeMs — a writer that ordered `nodes` first (pushing the
// freshness fields past byte 512) must report not-fresh with a clear reason,
// NOT silently treat the sidecar as fresh.
// ============================================================================
test("head missing sourceMtimeMs → not fresh, reason=no-sourceMtimeMs-in-head", async () => {
  const dir = tmpDir("nohdr"); setEnv(dir);
  try {
    const st = writeGraph(path.join(dir, "system-graph.json"));
    const pad = "x".repeat(600); // pushes the real fields past byte 512
    fs.writeFileSync(path.join(dir, "find-cache.json"),
      JSON.stringify({ nodes: [{ id: pad }], sourceMtimeMs: st.mtimeMs, sourceSize: st.size }), "utf8");
    const lib = await freshLib();
    const r = lib.sidecarStatus();
    assert.equal(r.findCache.exists, true);
    assert.equal(r.findCache.fresh, false, "fields past byte 512 → cannot confirm fresh");
    assert.equal(r.findCache.reason, "no-sourceMtimeMs-in-head");
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ============================================================================
// sourceSize ABSENT — the find-cache exact gate requires size; a sidecar missing
// it must be STALE (null !== size), never a false-fresh.
// ============================================================================
test("find-cache missing sourceSize → stale (exact gate needs size)", async () => {
  const dir = tmpDir("nosize"); setEnv(dir);
  try {
    const st = writeGraph(path.join(dir, "system-graph.json"));
    fs.writeFileSync(path.join(dir, "find-cache.json"),
      JSON.stringify({ schemaVersion: 1, generatedAt: "x", sourceMtimeMs: st.mtimeMs, nodes: [] }), "utf8"); // no sourceSize
    const lib = await freshLib();
    assert.equal(lib.sidecarStatus().findCache.fresh, false, "missing sourceSize → exact gate stale");
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});

// ============================================================================
// MIXED STATE — graph + find-cache present, index MISSING (the realistic state
// right after a find-cache regen but before an index rebuild). cache-status
// must surface index MISSING so the CLI exit gate returns non-zero.
// ============================================================================
test("mixed: graph + find-cache present, index missing → index exists:false", async () => {
  const dir = tmpDir("mixed"); setEnv(dir);
  try {
    const st = writeGraph(path.join(dir, "system-graph.json"));
    writeFindCache(path.join(dir, "find-cache.json"), st.mtimeMs, st.size); // index intentionally absent
    const lib = await freshLib();
    const r = lib.sidecarStatus();
    assert.equal(r.findCache.fresh, true);
    assert.equal(r.index.exists, false);
    assert.equal(r.index.fresh, false);
  } finally { clearEnv(); fs.rmSync(dir, { recursive: true, force: true }); }
});
