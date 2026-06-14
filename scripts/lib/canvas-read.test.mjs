/**
 * canvas-read.test.mjs — real-assertion tests for the cheap canvas reader.
 *
 * Controlled fixtures (temp canvas + temp graph with set mtimes) drive exact-count
 * and staleness assertions; a final smoke runs against the LIVE PRISM-System-Map.canvas
 * with structural invariants (not brittle exact counts on a regenerated artifact).
 * Each test re-imports nothing — clearCache() between cases (process-lifetime cache).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import {
  loadCanvas,
  summarizeCanvas,
  canvasFiles,
  canvasNodesForDoc,
  computeStaleness,
  clearCache,
} from "./canvas-read-lib.mjs";

const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, "$1")), "..", "..");
const LIVE_CANVAS = path.join(ROOT, "knowledge", "PRISM-System-Map.canvas");

let _n = 0;
function tmp(name) {
  return path.join(os.tmpdir(), `canvas-read-test-${process.pid}-${_n++}-${name}`);
}
function writeCanvas(p, obj) {
  fs.writeFileSync(p, JSON.stringify(obj), "utf8");
  return p;
}

/** A representative fixture: 1 header + 3 file nodes across 2 layers + a non-hdr text
 *  + a galaxy node with no layer in its id; 2 edges. */
function fixtureCanvas() {
  return {
    nodes: [
      { id: "hdr-L0", type: "text", text: "# L0\n14 nodes · top 14 shown" },
      { id: "n0-L0-0", type: "file", file: "knowledge/wiki/architecture/cheap-node-access-ms0.md" },
      { id: "n1-L0-1", type: "file", file: "knowledge/wiki/architecture/system-viz-galaxy.md" },
      { id: "hdr-L3", type: "text", text: "# L3" },
      { id: "n0-L3-0", type: "file", file: "knowledge/wiki/lessons/foo.md" },
      { id: "hdr-Lgit", type: "text", text: "# Lgit\nrecent commits" },
      { id: "n0-Lgit-0", type: "file", file: "knowledge/wiki/code-tribal/learnings/bar.md" },
      { id: "free-text", type: "text", text: "L0 · Programmer" },
      { id: "galaxy-mill", type: "file", file: "mcp-server/src/engines/mill/MEMORY.md" },
    ],
    edges: [
      { id: "e1", fromNode: "n0-L0-0", toNode: "n1-L0-1" },
      { id: "e2", fromNode: "hdr-L0", toNode: "n0-L0-0" },
    ],
  };
}

test("loadCanvas: happy parse on a fixture (available, cached)", () => {
  clearCache();
  const p = writeCanvas(tmp("happy.canvas"), fixtureCanvas());
  const a = loadCanvas(p);
  assert.equal(a.error, null);
  assert.ok(a.canvas && Array.isArray(a.canvas.nodes));
  assert.equal(a.canvas.nodes.length, 9);
  // cached: second call returns the SAME object reference
  const b = loadCanvas(p);
  assert.strictEqual(a, b);
  fs.unlinkSync(p);
});

test("clearCache: forces a reload (new object after rewrite)", () => {
  clearCache();
  const p = writeCanvas(tmp("recache.canvas"), fixtureCanvas());
  const a = loadCanvas(p);
  clearCache();
  const b = loadCanvas(p);
  assert.notStrictEqual(a, b);
  assert.equal(b.canvas.nodes.length, 9);
  fs.unlinkSync(p);
});

test("summarizeCanvas: exact counts + layer grouping + header capture + samples", () => {
  clearCache();
  const p = writeCanvas(tmp("summary.canvas"), fixtureCanvas());
  const s = summarizeCanvas(p);
  assert.equal(s.available, true);
  assert.deepEqual(s.counts, { nodes: 9, file: 5, text: 4, other: 0, edges: 2 });
  const byLayer = Object.fromEntries(s.layers.map((l) => [l.layer, l]));
  // L0 carries 2 file nodes + the authored header (markdown # stripped, first line)
  assert.equal(byLayer.L0.fileCount, 2);
  assert.equal(byLayer.L0.header, "L0");
  assert.deepEqual(byLayer.L0.samples, ["cheap-node-access-ms0.md", "system-viz-galaxy.md"]);
  // L3 carries 1 file
  assert.equal(byLayer.L3.fileCount, 1);
  // Lgit is a valid alphabetic-suffix layer (NOT miscounted as "other")
  assert.equal(byLayer.Lgit.fileCount, 1);
  assert.equal(byLayer.Lgit.header, "Lgit");
  // the galaxy node (no layer in id) buckets under "other"
  assert.equal(byLayer.other.fileCount, 1);
  // structural sequence: L0 < L3 < Lgit < other
  assert.deepEqual(s.layers.map((l) => l.layer), ["L0", "L3", "Lgit", "other"]);
  fs.unlinkSync(p);
});

test("canvasFiles: deduped sorted backbone list (file nodes only)", () => {
  clearCache();
  const p = writeCanvas(tmp("files.canvas"), fixtureCanvas());
  const files = canvasFiles(p);
  assert.equal(files.length, 5);
  // sorted; text nodes excluded
  assert.deepEqual(files, [...files].sort());
  assert.ok(files.includes("knowledge/wiki/architecture/cheap-node-access-ms0.md"));
  assert.ok(!files.some((f) => f.includes("Programmer")));
  fs.unlinkSync(p);
});

test("canvasNodesForDoc: exact hit returns node id + layer + file", () => {
  clearCache();
  const p = writeCanvas(tmp("doc.canvas"), fixtureCanvas());
  const r = canvasNodesForDoc("architecture/cheap-node-access-ms0", { canvasPath: p });
  assert.equal(r.found, true);
  assert.equal(r.key, "architecture/cheap-node-access-ms0");
  assert.equal(r.total, 1);
  assert.equal(r.nodes[0].id, "n0-L0-0");
  assert.equal(r.nodes[0].layer, "L0");
  assert.equal(r.nodes[0].file, "knowledge/wiki/architecture/cheap-node-access-ms0.md");
  fs.unlinkSync(p);
});

test("canvasNodesForDoc: ADVERSARIAL backslash path normalizes to the same key (Windows)", () => {
  clearCache();
  const p = writeCanvas(tmp("bs.canvas"), fixtureCanvas());
  const r = canvasNodesForDoc("knowledge\\wiki\\lessons\\foo.md", { canvasPath: p });
  assert.equal(r.found, true);
  assert.equal(r.nodes[0].id, "n0-L3-0");
  fs.unlinkSync(p);
});

test("canvasNodesForDoc: ADVERSARIAL substring is NOT a false match, but is suggested", () => {
  clearCache();
  const p = writeCanvas(tmp("sub.canvas"), fixtureCanvas());
  const r = canvasNodesForDoc("foo", { canvasPath: p }); // bare basename, not the full key
  assert.equal(r.found, false); // "foo" !== "lessons/foo" — no over-match
  assert.ok(r.suggestions.includes("lessons/foo"));
  // positive control: the FULL key DOES match — so this test fails if normalization
  // ever broke the real hit, not just if it stopped rejecting the substring.
  const hit = canvasNodesForDoc("lessons/foo", { canvasPath: p });
  assert.equal(hit.found, true);
  assert.equal(hit.nodes[0].id, "n0-L3-0");
  fs.unlinkSync(p);
});

test("canvasNodesForDoc: miss with no basename match → empty suggestions", () => {
  clearCache();
  const p = writeCanvas(tmp("miss.canvas"), fixtureCanvas());
  const r = canvasNodesForDoc("architecture/does-not-exist-xyz", { canvasPath: p });
  assert.equal(r.found, false);
  assert.deepEqual(r.suggestions, []);
  fs.unlinkSync(p);
});

test("canvasNodesForDoc: MEMORY-SLUG join — bare slug matches a memories/<type>/ file node", () => {
  // The join's load-bearing claim: the canvas key space agrees with vault-backlinks
  // for BOTH wiki paths AND memory slugs. This pins the memory half (the
  // knowledge/memories/<type>/ prefix-strip branch of normalizeVaultKey) — a regression
  // there would silently break the canvas→graph join for every memory-backed node.
  clearCache();
  const p = writeCanvas(tmp("memslug.canvas"), {
    nodes: [
      { id: "hdr-L8", type: "text", text: "# L8" },
      { id: "n0-L8-0", type: "file", file: "knowledge/memories/feedback/feedback_canvas_join_demo.md" },
    ],
    edges: [],
  });
  // queried as a bare snake_case slug (how an agent reading the memory would name it)
  const r = canvasNodesForDoc("feedback_canvas_join_demo", { canvasPath: p });
  assert.equal(r.found, true);
  assert.equal(r.key, "feedback_canvas_join_demo");
  assert.equal(r.nodes[0].id, "n0-L8-0");
  assert.equal(r.nodes[0].layer, "L8");
  fs.unlinkSync(p);
});

test("canvasNodesForDoc: ADVERSARIAL empty/non-string query → key '' found:false, no throw", () => {
  clearCache();
  const p = writeCanvas(tmp("empty.canvas"), fixtureCanvas());
  for (const q of ["", null, undefined, 42, {}]) {
    const r = canvasNodesForDoc(q, { canvasPath: p });
    assert.equal(r.found, false);
    assert.equal(r.key, "");
    assert.deepEqual(r.nodes, []);
  }
  fs.unlinkSync(p);
});

test("staleness: graph NEWER than canvas → stale with reason; graph OLDER → fresh", () => {
  clearCache();
  const c = writeCanvas(tmp("stale.canvas"), fixtureCanvas());
  const g = path.join(os.tmpdir(), `canvas-read-test-${process.pid}-graph-${_n++}.json`);
  fs.writeFileSync(g, "{}", "utf8");
  // canvas at T, graph at T+120s → stale
  const base = Math.floor(Date.now() / 1000);
  fs.utimesSync(c, base, base);
  fs.utimesSync(g, base + 120, base + 120);
  const sStale = computeStaleness(c, g);
  assert.equal(sStale.stale, true);
  assert.match(sStale.staleReason, /newer than this canvas/);
  // graph older than canvas → fresh
  fs.utimesSync(g, base - 120, base - 120);
  const sFresh = computeStaleness(c, g);
  assert.equal(sFresh.stale, false);
  assert.equal(sFresh.staleReason, null);
  // within 1s tolerance → fresh (not cry-wolf)
  fs.utimesSync(g, base, base);
  assert.equal(computeStaleness(c, g).stale, false);
  // missing graph → fresh (don't judge)
  assert.equal(computeStaleness(c, path.join(os.tmpdir(), "no-such-graph.json")).stale, false);
  fs.unlinkSync(c);
  fs.unlinkSync(g);
});

test("FAILURE: missing canvas → fail-soft unavailable, never throws", () => {
  clearCache();
  const p = path.join(os.tmpdir(), `canvas-read-test-${process.pid}-absent-${_n++}.canvas`);
  const a = loadCanvas(p);
  assert.equal(a.canvas, null);
  assert.match(a.error, /not found/);
  assert.equal(summarizeCanvas(p).available, false);
  assert.equal(canvasNodesForDoc("architecture/x", { canvasPath: p }).unavailable, true);
  assert.deepEqual(canvasFiles(p), []);
});

test("FAILURE: malformed JSON → fail-soft error, never throws", () => {
  clearCache();
  const p = path.join(os.tmpdir(), `canvas-read-test-${process.pid}-bad-${_n++}.canvas`);
  fs.writeFileSync(p, "{ this is not json", "utf8");
  const a = loadCanvas(p);
  assert.equal(a.canvas, null);
  assert.match(a.error, /read failed/);
  fs.unlinkSync(p);
});

test("FAILURE: no .nodes array → 'malformed' error", () => {
  clearCache();
  const p = writeCanvas(tmp("nonodes.canvas"), { edges: [] });
  const a = loadCanvas(p);
  assert.equal(a.canvas, null);
  assert.match(a.error, /no \.nodes array/);
  fs.unlinkSync(p);
});

test("SMOKE: live PRISM-System-Map.canvas — structural invariants", () => {
  clearCache();
  if (!fs.existsSync(LIVE_CANVAS)) {
    // canvas only exists once regen-viz has run on this machine — skip cleanly if absent
    return;
  }
  const s = summarizeCanvas(LIVE_CANVAS);
  assert.equal(s.available, true);
  // file + text + other === total (no node type unaccounted for)
  assert.equal(s.counts.file + s.counts.text + s.counts.other, s.counts.nodes);
  assert.ok(s.counts.file > 100, `expected a curated backbone (>100 file nodes), got ${s.counts.file}`);
  assert.ok(s.counts.text > 0, "expected layer header text nodes");
  assert.ok(s.layers.length > 0, "expected at least one layer group");
  // every layer reports a non-negative count and an array of samples
  for (const l of s.layers) {
    assert.ok(l.fileCount >= 0);
    assert.ok(Array.isArray(l.samples));
  }
  // canvasFiles agrees with the file count and is deduped+sorted
  const files = canvasFiles(LIVE_CANVAS);
  assert.ok(files.length <= s.counts.file); // dedupe may shrink, never grow
  assert.deepEqual(files, [...new Set(files)].sort());
});
