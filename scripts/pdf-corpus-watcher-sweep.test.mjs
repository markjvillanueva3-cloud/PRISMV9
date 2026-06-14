/**
 * Tests for scripts/pdf-corpus-watcher-sweep.mjs (U-VICTOR-C3).
 * Pure-core only.
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { diffScan, capExtractList } from "./pdf-corpus-watcher-sweep.mjs";

// ============================================================================
// diffScan
// ============================================================================

test("diffScan classifies new/modified/unchanged/removed", () => {
  const seen = {
    "resources/a.pdf": { size: 100, mtimeMs: 1000 },
    "resources/b.pdf": { size: 200, mtimeMs: 2000 },
    "resources/removed.pdf": { size: 50, mtimeMs: 500 },
  };
  const current = [
    { path: "resources/a.pdf", size: 100, mtimeMs: 1000 },  // unchanged
    { path: "resources/b.pdf", size: 250, mtimeMs: 2500 },  // modified (size+mtime)
    { path: "resources/c.pdf", size: 300, mtimeMs: 3000 },  // new
  ];
  const d = diffScan(current, seen);
  assert.equal(d.unchanged.length, 1);
  assert.equal(d.modified.length, 1);
  assert.equal(d.new.length, 1);
  assert.equal(d.removed.length, 1);
  assert.equal(d.modified[0].path, "resources/b.pdf");
  assert.equal(d.new[0].path, "resources/c.pdf");
  assert.equal(d.removed[0].path, "resources/removed.pdf");
});

test("diffScan: modified iff size OR mtime differs", () => {
  const seen = { "a.pdf": { size: 100, mtimeMs: 1000 } };
  // Same size, new mtime → modified
  let d = diffScan([{ path: "a.pdf", size: 100, mtimeMs: 1500 }], seen);
  assert.equal(d.modified.length, 1);
  // New size, same mtime → modified
  d = diffScan([{ path: "a.pdf", size: 200, mtimeMs: 1000 }], seen);
  assert.equal(d.modified.length, 1);
  // Both same → unchanged
  d = diffScan([{ path: "a.pdf", size: 100, mtimeMs: 1000 }], seen);
  assert.equal(d.unchanged.length, 1);
});

test("diffScan: empty inputs", () => {
  const d1 = diffScan([], {});
  assert.equal(d1.new.length, 0);
  assert.equal(d1.modified.length, 0);
  assert.equal(d1.unchanged.length, 0);
  assert.equal(d1.removed.length, 0);

  // Seen but nothing scanned → all removed
  const d2 = diffScan([], { "a.pdf": { size: 1, mtimeMs: 1 } });
  assert.equal(d2.removed.length, 1);
});

test("diffScan handles non-array / non-object inputs", () => {
  const d1 = diffScan(null, null);
  assert.equal(d1.new.length, 0);
  const d2 = diffScan("not array", "not object");
  assert.equal(d2.new.length, 0);
});

test("diffScan ignores malformed scan entries", () => {
  const d = diffScan([null, undefined, { /* no path */ }, "string"], {});
  assert.equal(d.new.length, 0);
});

// ============================================================================
// capExtractList
// ============================================================================

test("capExtractList caps at maxFire", () => {
  const diff = {
    new: [
      { path: "a.pdf" }, { path: "b.pdf" }, { path: "c.pdf" },
    ],
    modified: [
      { path: "d.pdf" }, { path: "e.pdf" }, { path: "f.pdf" },
    ],
  };
  const cap = capExtractList(diff, 4);
  assert.equal(cap.length, 4);
});

test("capExtractList default cap is 5", () => {
  const diff = { new: Array.from({ length: 20 }, (_, i) => ({ path: `${i}.pdf` })) };
  const cap = capExtractList(diff);
  assert.equal(cap.length, 5);
});

test("capExtractList: empty diff returns []", () => {
  assert.deepEqual(capExtractList({}, 5), []);
  assert.deepEqual(capExtractList({ new: [], modified: [] }, 5), []);
});

test("capExtractList: maxFire=0 returns []", () => {
  const diff = { new: [{ path: "a.pdf" }] };
  assert.deepEqual(capExtractList(diff, 0), []);
});

test("capExtractList: maxFire negative clamped to 0", () => {
  const diff = { new: [{ path: "a.pdf" }] };
  assert.deepEqual(capExtractList(diff, -5), []);
});

test("capExtractList: new entries come before modified", () => {
  const diff = {
    new: [{ path: "new1.pdf" }, { path: "new2.pdf" }],
    modified: [{ path: "mod1.pdf" }, { path: "mod2.pdf" }],
  };
  const cap = capExtractList(diff, 3);
  assert.equal(cap[0].path, "new1.pdf");
  assert.equal(cap[1].path, "new2.pdf");
  assert.equal(cap[2].path, "mod1.pdf");
});
