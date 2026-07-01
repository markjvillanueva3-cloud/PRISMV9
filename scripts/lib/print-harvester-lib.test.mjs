// scripts/lib/print-harvester-lib.test.mjs
// Tests for U-TDP02 batch print harvester pure core.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  migrateRegistry,
  derivePathId,
  inferPartClass,
  listCandidates,
  registerProcessed,
  summarizeRegistry,
  REGISTRY_SCHEMA_VERSION,
  PART_CLASS_HEURISTICS,
} from "./print-harvester-lib.mjs";

test("migrateRegistry: null yields v1 defaults", () => {
  const r = migrateRegistry(null);
  assert.equal(r.schemaVersion, REGISTRY_SCHEMA_VERSION);
  assert.deepEqual(r.processed, {});
  assert.equal(r.lastRunAt, null);
  assert.equal(r.totalRuns, 0);
});

test("migrateRegistry: preserves valid processed entries", () => {
  const input = {
    schemaVersion: 1,
    processed: { "a.pdf": { ts: "2026-05-18T00:00:00Z", part_class: "die", status: "ok" } },
    lastRunAt: "2026-05-18T00:00:00Z",
    totalRuns: 3,
  };
  const r = migrateRegistry(input);
  assert.deepEqual(r.processed, input.processed);
  assert.equal(r.totalRuns, 3);
});

test("migrateRegistry: rejects array processed, non-string lastRunAt, negative totalRuns", () => {
  const r = migrateRegistry({ processed: ["bad"], lastRunAt: 42, totalRuns: -5 });
  assert.deepEqual(r.processed, {});
  assert.equal(r.lastRunAt, null);
  assert.equal(r.totalRuns, 0);
});

test("migrateRegistry: does not mutate input", () => {
  const input = { processed: { "x": { ts: "t" } } };
  const r = migrateRegistry(input);
  r.processed["y"] = { ts: "added" };
  assert.equal(Object.keys(input.processed).length, 1);
});

test("derivePathId: normalizes backslashes + lowercases", () => {
  assert.equal(derivePathId("H:\\PRISM\\Test\\Punch.PDF"), "h:/prism/test/punch.pdf");
  assert.equal(derivePathId("foo/bar.pdf"), "foo/bar.pdf");
});

test("derivePathId: empty/non-string returns empty", () => {
  assert.equal(derivePathId(""), "");
  assert.equal(derivePathId(null), "");
  assert.equal(derivePathId(123), "");
});

test("inferPartClass: heuristic matches", () => {
  assert.equal(inferPartClass("test/punch-001.pdf"), "extrude_punch");
  assert.equal(inferPartClass("test/die-A.pdf"), "die");
  assert.equal(inferPartClass("Shaft Drawing.pdf"), "shaft");
  assert.equal(inferPartClass("BLISK-final.pdf"), "blisk");
});

test("inferPartClass: falls back to opts.default or general", () => {
  assert.equal(inferPartClass("unknown-thing.pdf"), "general");
  assert.equal(inferPartClass("unknown-thing.pdf", { default: "custom" }), "custom");
});

test("inferPartClass: empty/non-string returns fallback", () => {
  assert.equal(inferPartClass("", { default: "fb" }), "fb");
  assert.equal(inferPartClass(null, { default: "fb" }), "fb");
});

test("listCandidates happy: 3 new PDFs all returned", () => {
  const r = listCandidates(["a.pdf", "punch-1.pdf", "die-A.pdf"], null);
  assert.equal(r.newJobs.length, 3);
  assert.equal(r.skippedJobs.length, 0);
  const byPath = Object.fromEntries(r.newJobs.map((j) => [j.pdf_path, j.part_class]));
  assert.equal(byPath["a.pdf"], "general");
  assert.equal(byPath["punch-1.pdf"], "extrude_punch");
  assert.equal(byPath["die-A.pdf"], "die");
});

test("listCandidates: skips already-processed entries", () => {
  const reg = { processed: { "punch-1.pdf": { ts: "old" } } };
  const r = listCandidates(["punch-1.pdf", "punch-2.pdf"], reg);
  assert.equal(r.newJobs.length, 1);
  assert.equal(r.newJobs[0].pdf_path, "punch-2.pdf");
  assert.equal(r.skippedJobs.length, 1);
});

test("listCandidates: force=true re-processes everything", () => {
  const reg = { processed: { "punch-1.pdf": { ts: "old" } } };
  const r = listCandidates(["punch-1.pdf", "punch-2.pdf"], reg, { force: true });
  assert.equal(r.newJobs.length, 2);
  assert.equal(r.skippedJobs.length, 0);
});

test("listCandidates: max cap honored", () => {
  const r = listCandidates(["a.pdf", "b.pdf", "c.pdf", "d.pdf", "e.pdf"], null, { max: 3 });
  assert.equal(r.newJobs.length, 3);
  assert.equal(r.summary.capped, true);
});

test("listCandidates: non-pdf paths skipped with error log", () => {
  const r = listCandidates(["a.pdf", "b.txt", "c.docx", "d.pdf"], null);
  assert.equal(r.newJobs.length, 2);
  assert.equal(r.summary.errorCount, 2);
});

test("listCandidates: non-array walkResult fails-soft", () => {
  const r = listCandidates("not an array", null);
  assert.equal(r.newJobs.length, 0);
  assert.equal(r.summary.walked, 0);
});

test("listCandidates: case-insensitive registry hit", () => {
  const reg = { processed: { "h:/test/punch.pdf": { ts: "old" } } };
  const r = listCandidates(["H:\\Test\\PUNCH.PDF"], reg);
  assert.equal(r.skippedJobs.length, 1);
  assert.equal(r.newJobs.length, 0);
});

test("registerProcessed: marks new jobs with ts + part_class + status", () => {
  const jobs = [
    { pdf_path: "a.pdf", part_class: "die", status: "ok" },
    { pdf_path: "b.pdf", part_class: "shaft" },
  ];
  const r = registerProcessed(null, jobs, { now: () => "2026-05-18T16:00:00Z" });
  assert.equal(r.processed["a.pdf"].part_class, "die");
  assert.equal(r.processed["a.pdf"].status, "ok");
  assert.equal(r.processed["b.pdf"].part_class, "shaft");
  assert.equal(r.processed["b.pdf"].status, "ok");
  assert.equal(r.lastRunAt, "2026-05-18T16:00:00Z");
  assert.equal(r.totalRuns, 1);
});

test("registerProcessed: idempotent on same jobs", () => {
  let reg = null;
  reg = registerProcessed(reg, [{ pdf_path: "a.pdf", part_class: "die" }]);
  const firstRuns = reg.totalRuns;
  reg = registerProcessed(reg, [{ pdf_path: "a.pdf", part_class: "die" }]);
  assert.equal(Object.keys(reg.processed).length, 1);
  assert.equal(reg.totalRuns, firstRuns + 1);
});

test("registerProcessed: skips malformed jobs without crash", () => {
  const r = registerProcessed(null, [
    null,
    { pdf_path: "" },
    { pdf_path: "valid.pdf", part_class: "die" },
  ]);
  assert.equal(Object.keys(r.processed).length, 1);
});

test("registerProcessed: failed jobs still recorded (training signal)", () => {
  const r = registerProcessed(null, [{ pdf_path: "fail.pdf", part_class: "die", status: "failed" }]);
  assert.equal(r.processed["fail.pdf"].status, "failed");
});

test("summarizeRegistry: empty yields zero counts", () => {
  const s = summarizeRegistry(null);
  assert.equal(s.totalProcessed, 0);
  assert.deepEqual(s.byPartClass, {});
});

test("summarizeRegistry: aggregates correctly", () => {
  const reg = {
    processed: {
      "a.pdf": { part_class: "die", status: "ok" },
      "b.pdf": { part_class: "die", status: "ok" },
      "c.pdf": { part_class: "shaft", status: "failed" },
      "d.pdf": { part_class: "extrude_punch", status: "ok" },
    },
  };
  const s = summarizeRegistry(reg);
  assert.equal(s.totalProcessed, 4);
  assert.deepEqual(s.byPartClass, { die: 2, shaft: 1, extrude_punch: 1 });
  assert.deepEqual(s.byStatus, { ok: 3, failed: 1 });
});

test("ADVERSARIAL: 10K walk results doesn't crash + max cap honored", () => {
  // 10000 items, every 3rd is a .pdf → ~3334 PDFs. max=1000 < pdf count → capped=true.
  const walked = Array.from({ length: 10000 }, (_, i) => (i % 3 === 0 ? "f" + i + ".pdf" : "f" + i + ".txt"));
  const r = listCandidates(walked, null, { max: 1000 });
  assert.equal(r.newJobs.length, 1000);
  assert.equal(r.summary.capped, true);

  // Sanity: with no max, all PDFs come through (and capped=false)
  const rNoCap = listCandidates(walked, null);
  assert.ok(rNoCap.newJobs.length > 3000);
  assert.equal(rNoCap.summary.capped, false);
});

test("PART_CLASS_HEURISTICS: every entry has both fields", () => {
  assert.ok(PART_CLASS_HEURISTICS.length >= 5);
  for (const h of PART_CLASS_HEURISTICS) {
    assert.equal(typeof h.token, "string");
    assert.equal(typeof h.part_class, "string");
    assert.ok(h.token.length > 0);
    assert.ok(h.part_class.length > 0);
  }
});

test("R12: listCandidates surfaces errorCount + first 10 errors (never silent)", () => {
  const walked = Array.from({ length: 12 }, () => "no-extension");
  const r = listCandidates(walked, null);
  assert.equal(r.summary.errorCount, 12);
  assert.equal(r.summary.errors.length, 10);
});
