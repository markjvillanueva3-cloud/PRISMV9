/**
 * regen-viz-merge-guard.test.mjs — unit tests for U-REGEN-VIZ-MERGE-FAILLOUD.
 *
 * Covers:
 *   - happy path (merge succeeded, augmentations folded in)
 *   - merge-fail (subprocess exit ≠ 0) → exit 2, post-merge stages must abort
 *   - merge-fail with signal kill (SIGKILL — the actual prod failure mode
 *     observed 2026-05-17 lima session under 97% commit-mem pressure)
 *   - silent no-op (exit 0 but graph node count unchanged with ≥1MB augs)
 *   - boundary: exactly AUG_BYTE_THRESHOLD bytes
 *   - low-aug-bytes (under threshold) — 0-delta is OK in FAST mode
 *   - pre-count==0 (couldn't read pre-merge graph) — fall through, never block
 *   - I/O helpers: readGraphNodeCount + readAugmentationByteTotal against a
 *     tmp fixture (verifies real fs paths, catches require()-in-ESM bug)
 */
import { test } from "node:test";
import assert from "node:assert";
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import {
  decideMergePostState,
  readGraphNodeCount,
  readAugmentationByteTotal,
  EXIT_OK,
  EXIT_MERGE_FAILED,
  EXIT_MERGE_NO_OP,
  AUG_BYTE_THRESHOLD,
} from "./regen-viz-merge-guard.mjs";

// ────────────────────────────────────────────────────────────────
// decideMergePostState — pure decision logic
// ────────────────────────────────────────────────────────────────

test("happy path: merge succeeded with node-count growth", () => {
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 145440,
    augTotalBytes: 35 * 1024 * 1024,
  });
  assert.strictEqual(r.abort, false);
  assert.strictEqual(r.exitCode, EXIT_OK);
  assert.strictEqual(r.reason, "ok");
});

test("merge-fail: exit !=0 → abort with EXIT_MERGE_FAILED", () => {
  const r = decideMergePostState({
    mergeStatus: 1,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 99352,
    augTotalBytes: 35 * 1024 * 1024,
  });
  assert.strictEqual(r.abort, true);
  assert.strictEqual(r.exitCode, EXIT_MERGE_FAILED);
  assert.strictEqual(r.reason, "merge-failed");
  assert.match(r.message, /exit=1/);
});

test("merge-fail: signal-kill (the actual lima prod failure mode) surfaces the signal", () => {
  // 2026-05-17 lima repro: merge subprocess emitted ZERO stderr before
  // failing — signature of SIGKILL from OS memory pressure where V8 didn't
  // get to print "JavaScript heap out of memory". The guard's message must
  // surface the signal so operators can distinguish OOM-kill from exit-1.
  const r = decideMergePostState({
    mergeStatus: null,
    mergeSignal: "SIGKILL",
    preMergeNodeCount: 99352,
    postMergeNodeCount: 99352,
    augTotalBytes: 35 * 1024 * 1024,
  });
  assert.strictEqual(r.abort, true);
  assert.strictEqual(r.exitCode, EXIT_MERGE_FAILED);
  assert.match(r.message, /SIGKILL/);
});

test("merge-fail: exit !=0 takes precedence over 0-delta (don't double-report)", () => {
  const r = decideMergePostState({
    mergeStatus: 1,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 99352,
    augTotalBytes: 35 * 1024 * 1024,
  });
  assert.strictEqual(r.reason, "merge-failed", "should report fail, not no-op");
});

test("silent no-op: exit 0 + 0 delta + ≥1MB augs → abort with EXIT_MERGE_NO_OP", () => {
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 99352,
    augTotalBytes: 35 * 1024 * 1024,
  });
  assert.strictEqual(r.abort, true);
  assert.strictEqual(r.exitCode, EXIT_MERGE_NO_OP);
  assert.strictEqual(r.reason, "merge-no-op");
  assert.match(r.message, /99352/);
  assert.match(r.message, /MB/);
});

test("silent no-op: post < pre (graph shrank — corrupted merge)", () => {
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 50000, // shrank!
    augTotalBytes: 35 * 1024 * 1024,
  });
  assert.strictEqual(r.abort, true);
  assert.strictEqual(r.reason, "merge-no-op");
});

test("boundary: aug bytes exactly at threshold + 0 delta → fail (>=)", () => {
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 99352,
    augTotalBytes: AUG_BYTE_THRESHOLD,
  });
  assert.strictEqual(r.abort, true);
  assert.strictEqual(r.reason, "merge-no-op");
});

test("boundary: aug bytes just below threshold + 0 delta → continue (FAST-mode tolerance)", () => {
  // FAST mode regen re-emits already-merged augmentations; a 0-delta there
  // is the *expected* idempotent outcome, not a corruption signal.
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 99352,
    augTotalBytes: AUG_BYTE_THRESHOLD - 1,
  });
  assert.strictEqual(r.abort, false);
  assert.strictEqual(r.reason, "ok");
});

test("pre-count 0: couldn't read pre-merge graph → don't block (no false positive)", () => {
  // readGraphNodeCount returns 0 on fs error; the guard must NOT then fire
  // a no-op assert (would mis-classify every fresh-checkout regen).
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: 0,
    postMergeNodeCount: 145440,
    augTotalBytes: 35 * 1024 * 1024,
  });
  assert.strictEqual(r.abort, false);
});

test("growth: any post > pre is acceptable (no minimum-growth threshold)", () => {
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 99353,
    augTotalBytes: 35 * 1024 * 1024,
  });
  assert.strictEqual(r.abort, false);
});

test("adversarial: NaN inputs do not throw, default-coerce to safe continue", () => {
  // V8 division-by-NaN cascades silently — the guard must be NaN-safe so a
  // bad upstream measurement doesn't fail-close the entire regen pipeline.
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: NaN,
    postMergeNodeCount: NaN,
    augTotalBytes: NaN,
  });
  assert.strictEqual(r.abort, false, "NaN inputs should fall through to OK");
});

test("adversarial: negative byte total (impossible but defensive)", () => {
  // statSync on a deleted file mid-walk could in theory return negative;
  // guard should treat as under-threshold (no 0-delta fire).
  const r = decideMergePostState({
    mergeStatus: 0,
    preMergeNodeCount: 99352,
    postMergeNodeCount: 99352,
    augTotalBytes: -1,
  });
  assert.strictEqual(r.abort, false);
});

// ────────────────────────────────────────────────────────────────
// I/O helpers — verify they actually work against the filesystem
// (catches the require()-in-ESM bug that would silently return 0 forever)
// ────────────────────────────────────────────────────────────────

test("readGraphNodeCount: reads real JSON file with nodes array", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "regen-viz-guard-"));
  try {
    const p = path.join(dir, "system-graph.json");
    fs.writeFileSync(p, JSON.stringify({
      meta: { version: 1 },
      nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
      edges: [],
    }));
    assert.strictEqual(readGraphNodeCount(p), 3);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readGraphNodeCount: missing file returns 0 (does NOT throw)", () => {
  assert.strictEqual(readGraphNodeCount("/no/such/file.json"), 0);
});

test("readGraphNodeCount: malformed JSON returns 0", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "regen-viz-guard-"));
  try {
    const p = path.join(dir, "bad.json");
    fs.writeFileSync(p, "{not json}");
    assert.strictEqual(readGraphNodeCount(p), 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readGraphNodeCount: nodes field missing returns 0", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "regen-viz-guard-"));
  try {
    const p = path.join(dir, "no-nodes.json");
    fs.writeFileSync(p, JSON.stringify({ meta: {} }));
    assert.strictEqual(readGraphNodeCount(p), 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readAugmentationByteTotal: sums only *-augmentation.json files", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "regen-viz-guard-"));
  try {
    fs.writeFileSync(path.join(dir, "fs-deep-augmentation.json"), "x".repeat(100));
    fs.writeFileSync(path.join(dir, "knowledge-augmentation.json"), "x".repeat(200));
    fs.writeFileSync(path.join(dir, "system-graph.json"), "x".repeat(9999)); // ignored
    fs.writeFileSync(path.join(dir, "augmentation.json"), "x".repeat(50)); // no leading -, ignored
    const total = readAugmentationByteTotal(dir);
    assert.strictEqual(total, 300, "only the two -augmentation.json files should count");
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("readAugmentationByteTotal: missing directory returns 0", () => {
  assert.strictEqual(readAugmentationByteTotal("/no/such/dir/"), 0);
});

test("readAugmentationByteTotal: empty directory returns 0", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "regen-viz-guard-"));
  try {
    assert.strictEqual(readAugmentationByteTotal(dir), 0);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});
