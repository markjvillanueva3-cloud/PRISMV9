/**
 * Tests for scripts/pdf-corpus-watcher-sweep.mjs (U-VICTOR-C3).
 * Pure-core + appendExtractLog (tmp-file dependency injection, U-XRAY-GDT-WATCHER-LANE-CAPTURE).
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { diffScan, capExtractList, parseExtractLanes, appendExtractLog } from "./pdf-corpus-watcher-sweep.mjs";

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

// ============================================================================
// parseExtractLanes -- record which lane the extractor chose (text vs ocr).
// WHY: the scan-route unit (U-XRAY-GDT-CORPUS-SCAN-ROUTE) routes image-based
// drawing PDFs to the OCR lane; the watcher must durably log that outcome, not
// lose it to transient stdout. A parse miss MUST fail-soft to null so the caller
// falls back to exit-code-only logging (never throws mid-sweep).
// ============================================================================

test("parseExtractLanes: text-emitted summary -> lane=text, emitted=1, routedToOcr=0", () => {
  const stdout = JSON.stringify({
    results: [{ ok: true, path: "resources/x.pdf", lane: "text", routed_to_ocr: false }],
    emitted_count: 1,
    routed_to_ocr_count: 0,
  });
  const r = parseExtractLanes(stdout);
  assert.equal(r.emitted, 1);
  assert.equal(r.routedToOcr, 0);
  assert.equal(r.results[0].lane, "text");
  assert.equal(r.results[0].routed_to_ocr, false);
});

test("parseExtractLanes: ocr-routed drawing -> lane=ocr, routed_to_ocr=true, skip_reason kept", () => {
  const stdout = JSON.stringify({
    results: [{ ok: true, path: "resources/draw.pdf", lane: "ocr", routed_to_ocr: true, skip_reason: "image-based-no-structure" }],
    emitted_count: 0,
    routed_to_ocr_count: 1,
  });
  const r = parseExtractLanes(stdout);
  assert.equal(r.emitted, 0);
  assert.equal(r.routedToOcr, 1);
  assert.equal(r.results[0].lane, "ocr");
  assert.equal(r.results[0].routed_to_ocr, true);
  assert.equal(r.results[0].skip_reason, "image-based-no-structure");
});

test("parseExtractLanes: derives counts when run-level counts absent", () => {
  const stdout = JSON.stringify({
    results: [
      { path: "a.pdf", lane: "text", routed_to_ocr: false },
      { path: "b.pdf", lane: "ocr", routed_to_ocr: true, skip_reason: "no-text-layer" },
    ],
  });
  const r = parseExtractLanes(stdout);
  assert.equal(r.emitted, 1, "one text-lane result");
  assert.equal(r.routedToOcr, 1, "one ocr-routed result");
  assert.equal(r.results.length, 2);
});

test("parseExtractLanes: missing/garbage fields coerce to safe defaults", () => {
  const stdout = JSON.stringify({ results: [{ ok: false }, { path: 42, lane: "weird", routed_to_ocr: "yes" }] });
  const r = parseExtractLanes(stdout);
  assert.equal(r.results[0].path, null);
  assert.equal(r.results[0].lane, null);
  assert.equal(r.results[0].routed_to_ocr, false);
  assert.equal(r.results[0].skip_reason, null);
  assert.equal(r.results[1].path, null, "non-string path -> null");
  assert.equal(r.results[1].lane, null, "lane not in {text,ocr} -> null");
  assert.equal(r.results[1].routed_to_ocr, true, "truthy string coerces to true");
});

test("parseExtractLanes failure modes: empty / whitespace / null / non-string -> null", () => {
  for (const input of ["", "   ", null, undefined, 42, {}]) {
    assert.equal(parseExtractLanes(input), null);
  }
});

test("parseExtractLanes failure mode: non-JSON stdout -> null (fail-soft)", () => {
  assert.equal(parseExtractLanes("FATAL boom\nnot json at all"), null);
});

test("parseExtractLanes failure mode: JSON without a results array -> null", () => {
  assert.equal(parseExtractLanes(JSON.stringify({ emitted_count: 1 })), null);
  assert.equal(parseExtractLanes(JSON.stringify({ results: "notarray" })), null);
});

test("parseExtractLanes adversarial: JSON array / number / string literal -> null (not an object summary)", () => {
  assert.equal(parseExtractLanes("[1,2,3]"), null);
  assert.equal(parseExtractLanes("12345"), null);
  assert.equal(parseExtractLanes('"a string"'), null);
});

test("parseExtractLanes adversarial: results array present but empty -> zero counts, empty results", () => {
  const r = parseExtractLanes(JSON.stringify({ results: [], emitted_count: 0, routed_to_ocr_count: 0 }));
  assert.deepEqual(r, { emitted: 0, routedToOcr: 0, results: [] });
});

// ============================================================================
// appendExtractLog (I/O, tmp-file DI) -- verifies the load-bearing R12 claim:
// a null `lanes` (parse miss / spawn failure) still writes a durable
// kind:"extracted" record with the exit status, never silently dropped.
// ============================================================================

test("appendExtractLog: null lanes still writes a kind:extracted record + exit + stderr (fail-soft, R12)", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pdfwatch-"));
  try {
    const logPath = path.join(dir, "log.jsonl");
    appendExtractLog("resources/draw.pdf", null, 1, "FATAL boom", logPath);
    const lines = readFileSync(logPath, "utf-8").trim().split("\n");
    assert.equal(lines.length, 1);
    const rec = JSON.parse(lines[0]);
    assert.equal(rec.kind, "extracted");
    assert.equal(rec.path, "resources/draw.pdf");
    assert.equal(rec.exit, 1);
    assert.equal(rec.lane, null);
    assert.equal(rec.routed_to_ocr, false);
    assert.equal(rec.stderr_excerpt, "FATAL boom");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendExtractLog: populated lanes writes the chosen lane; no stderr_excerpt key on success", () => {
  const dir = mkdtempSync(path.join(os.tmpdir(), "pdfwatch-"));
  try {
    const logPath = path.join(dir, "log.jsonl");
    const lanes = parseExtractLanes(JSON.stringify({
      results: [{ path: "x.pdf", lane: "ocr", routed_to_ocr: true, skip_reason: "image-based-no-structure" }],
      emitted_count: 0,
      routed_to_ocr_count: 1,
    }));
    appendExtractLog("resources/x.pdf", lanes, 0, null, logPath);
    const rec = JSON.parse(readFileSync(logPath, "utf-8").trim());
    assert.equal(rec.kind, "extracted");
    assert.equal(rec.lane, "ocr");
    assert.equal(rec.routed_to_ocr, true);
    assert.equal(rec.skip_reason, "image-based-no-structure");
    assert.equal(rec.exit, 0);
    assert.ok(!("stderr_excerpt" in rec), "no stderr_excerpt key on a successful extract");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});
