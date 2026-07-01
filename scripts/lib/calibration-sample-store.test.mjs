#!/usr/bin/env node
/**
 * calibration-sample-store.test.mjs -- node:test coverage for the durable
 * cross-run calibration-sample accumulation store (Unit A).
 *
 * Run directly (node:test auto-runs on exit): `node calibration-sample-store.test.mjs`
 * (NOT `node --test <file>` -- that ran 0 tests in this env, per CLAUDE.md).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, writeFileSync, readFileSync, existsSync, rmSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  DEFAULT_SAMPLE_CAP,
  isValidSample,
  parseCalibrationStore,
  mergeCalibrationSamples,
  serializeCalibrationSamples,
  stampSamples,
  summarizeCalibrationStore,
  loadCalibrationStore,
  appendCalibrationStore,
  resetCalibrationStore,
} from "./calibration-sample-store.mjs";
import { calibrateAgreement } from "./ocr-training-loop-lib.mjs";
import { MIN_RELIABLE_SAMPLES } from "./isotonic-calibrator.mjs";

// -- isValidSample -----------------------------------------------------------

test("isValidSample: accepts a well-formed sample", () => {
  assert.equal(isValidSample({ f: 1.0, correct: true }), true);
  assert.equal(isValidSample({ f: 0.5, correct: false }), true);
  assert.equal(isValidSample({ f: 0.0001, correct: true, source: "program-gt" }), true);
});

test("isValidSample: rejects out-of-range / wrong-type fields (poison guard)", () => {
  assert.equal(isValidSample({ f: 0, correct: true }), false, "f must be > 0");
  assert.equal(isValidSample({ f: 1.5, correct: true }), false, "f must be <= 1");
  assert.equal(isValidSample({ f: NaN, correct: true }), false, "f must be finite");
  assert.equal(isValidSample({ f: 0.5, correct: 1 }), false, "correct must be a strict boolean, not 1");
  assert.equal(isValidSample({ f: 0.5, correct: "true" }), false, "correct must be a strict boolean, not a string");
  assert.equal(isValidSample({ correct: true }), false, "missing f");
  assert.equal(isValidSample(null), false);
  assert.equal(isValidSample(42), false);
});

// -- parseCalibrationStore ---------------------------------------------------

test("parseCalibrationStore: parses valid JSONL, preserving provenance", () => {
  const text =
    '{"f":1,"correct":true,"source":"synthetic-gt","ts":"2026-06-23T00:00:00.000Z"}\n' +
    '{"f":0.5,"correct":false,"source":"program-gt"}\n';
  const got = parseCalibrationStore(text);
  assert.equal(got.length, 2);
  assert.equal(got[0].source, "synthetic-gt");
  assert.equal(got[1].source, "program-gt");
  assert.equal(got[1].correct, false);
});

test("parseCalibrationStore: tolerant -- skips blank lines, malformed JSON, invalid samples", () => {
  const text =
    '{"f":1,"correct":true}\n' +
    "\n" + // blank
    "not json at all\n" + // malformed
    '{"f":2,"correct":true}\n' + // f>1 invalid
    '{"f":0.7,"correct":"yes"}\n' + // correct not boolean
    '{"f":0.7,"correct":true}'; // valid, NO trailing newline (torn-last-line shape)
  const got = parseCalibrationStore(text);
  assert.equal(got.length, 2, "only the 2 valid samples survive");
  assert.deepEqual(got.map((s) => s.f), [1, 0.7]);
});

test("parseCalibrationStore: empty / non-string -> []", () => {
  assert.deepEqual(parseCalibrationStore(""), []);
  assert.deepEqual(parseCalibrationStore(null), []);
  assert.deepEqual(parseCalibrationStore(undefined), []);
});

// -- mergeCalibrationSamples -------------------------------------------------

test("mergeCalibrationSamples: concatenates persisted then fresh (fresh at tail)", () => {
  const persisted = [{ f: 1, correct: true }, { f: 0.5, correct: false }];
  const fresh = [{ f: 0.5, correct: true }];
  const r = mergeCalibrationSamples(persisted, fresh);
  assert.equal(r.merged.length, 3);
  assert.equal(r.persistedCount, 2);
  assert.equal(r.freshCount, 1);
  assert.equal(r.capped, false);
  assert.equal(r.merged[2].correct, true, "fresh is last");
});

test("mergeCalibrationSamples: ring-buffer caps to most-recent, ALWAYS keeps fresh", () => {
  const persisted = Array.from({ length: 10 }, (_, i) => ({ f: 0.5, correct: i % 2 === 0 }));
  const fresh = [{ f: 1, correct: true }, { f: 1, correct: false }];
  const r = mergeCalibrationSamples(persisted, fresh, { cap: 5 });
  assert.equal(r.totalBeforeCap, 12);
  assert.equal(r.capped, true);
  assert.equal(r.merged.length, 5);
  // the 2 fresh (tail) must survive the cap
  assert.equal(r.merged[3].f, 1);
  assert.equal(r.merged[4].f, 1);
});

test("mergeCalibrationSamples: filters invalid rows from a hand-edited store", () => {
  const persisted = [{ f: 1, correct: true }, { f: 9, correct: true }, { junk: 1 }];
  const r = mergeCalibrationSamples(persisted, [{ f: 0.5, correct: false }]);
  assert.equal(r.persistedCount, 1, "only the 1 valid persisted survives");
  assert.equal(r.merged.length, 2);
});

test("mergeCalibrationSamples: empty inputs", () => {
  assert.equal(mergeCalibrationSamples([], []).merged.length, 0);
  assert.equal(mergeCalibrationSamples(null, null).merged.length, 0);
  assert.equal(mergeCalibrationSamples([{ f: 1, correct: true }], null).merged.length, 1);
});

// -- serialize + stamp -------------------------------------------------------

test("serializeCalibrationSamples: round-trips through parse", () => {
  const samples = [{ f: 1, correct: true, source: "synthetic-gt", ts: "t" }, { f: 0.5, correct: false, source: "program-gt", ts: "t" }];
  const text = serializeCalibrationSamples(samples);
  assert.ok(text.endsWith("\n"));
  assert.deepEqual(parseCalibrationStore(text).map((s) => [s.f, s.correct]), [[1, true], [0.5, false]]);
});

test("serializeCalibrationSamples: empty -> empty string (no spurious blank line)", () => {
  assert.equal(serializeCalibrationSamples([]), "");
  assert.equal(serializeCalibrationSamples([{ junk: 1 }]), "", "invalid-only -> empty");
});

test("stampSamples: stamps source+ts, preserves pre-existing provenance", () => {
  const stamped = stampSamples([{ f: 1, correct: true }, { f: 0.5, correct: false, source: "program-gt", ts: "orig" }], {
    source: "synthetic-gt",
    ts: "2026-06-23T00:00:00.000Z",
  });
  assert.equal(stamped[0].source, "synthetic-gt");
  assert.equal(stamped[0].ts, "2026-06-23T00:00:00.000Z");
  assert.equal(stamped[1].source, "program-gt", "existing source preserved");
  assert.equal(stamped[1].ts, "orig", "existing ts preserved");
});

// -- I/O wrappers ------------------------------------------------------------

test("load/append round-trip accumulates across simulated runs", () => {
  const dir = mkdtempSync(join(tmpdir(), "cal-store-"));
  const path = join(dir, "nested", "calibration-samples.jsonl"); // nested -> exercises mkdir
  try {
    assert.deepEqual(loadCalibrationStore(path), [], "absent store -> []");

    // run 1
    const w1 = appendCalibrationStore(path, [{ f: 1, correct: true }, { f: 0.5, correct: false }], { source: "synthetic-gt" });
    assert.equal(w1, 2);
    assert.equal(loadCalibrationStore(path).length, 2);

    // run 2 -- accumulates, does NOT clobber
    const w2 = appendCalibrationStore(path, [{ f: 0.5, correct: true }], { source: "program-gt" });
    assert.equal(w2, 1);
    const all = loadCalibrationStore(path);
    assert.equal(all.length, 3, "store ACCUMULATES across runs");
    assert.equal(all.filter((s) => s.source === "program-gt").length, 1);
    assert.ok(all.every((s) => typeof s.ts === "string"), "every row stamped with ts");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("appendCalibrationStore: no valid samples -> writes nothing, returns 0", () => {
  const dir = mkdtempSync(join(tmpdir(), "cal-store-"));
  const path = join(dir, "s.jsonl");
  try {
    assert.equal(appendCalibrationStore(path, [{ junk: 1 }], {}), 0);
    assert.equal(existsSync(path), false, "no file created for an all-invalid append");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

test("resetCalibrationStore: truncates", () => {
  const dir = mkdtempSync(join(tmpdir(), "cal-store-"));
  const path = join(dir, "s.jsonl");
  try {
    appendCalibrationStore(path, [{ f: 1, correct: true }], {});
    assert.equal(loadCalibrationStore(path).length, 1);
    assert.equal(resetCalibrationStore(path), true);
    assert.equal(readFileSync(path, "utf8"), "");
    assert.deepEqual(loadCalibrationStore(path), []);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
});

// -- THE PROOF: accumulation crosses MIN_RELIABLE -> reliable flips true ------

test("accumulation flips calibration reliable:false -> true across MIN_RELIABLE", () => {
  assert.equal(MIN_RELIABLE_SAMPLES, 50, "guard: this proof assumes the documented floor");

  // a single under-powered run: fewer than MIN_RELIABLE samples
  const oneRun = Array.from({ length: 24 }, (_, i) => ({ f: i % 2 === 0 ? 1 : 0.5, correct: i % 3 !== 0 }));
  const calOneRun = calibrateAgreement(oneRun);
  assert.equal(calOneRun.calibrated, true);
  assert.equal(calOneRun.reliable, false, "24 samples is under-powered (the live problem)");

  // simulate 3 accumulated runs persisted + this run's fresh, merged
  const persisted = Array.from({ length: 48 }, (_, i) => ({ f: i % 2 === 0 ? 1 : 0.5, correct: i % 3 !== 0 }));
  const fresh = Array.from({ length: 24 }, (_, i) => ({ f: i % 2 === 0 ? 1 : 0.5, correct: i % 3 !== 0 }));
  const merged = mergeCalibrationSamples(persisted, fresh).merged;
  assert.equal(merged.length, 72);
  const calAccum = calibrateAgreement(merged);
  assert.equal(calAccum.reliable, true, "accumulated 72 >= 50 -> reliable, the whole point of Unit A");
  // the calibration is still valid (monotone isotonic, same byF shape) -- accumulation only adds power
  assert.ok(calAccum.byF.length > 0);
  assert.equal(calAccum.totalN, 72);
});

test("DEFAULT_SAMPLE_CAP is a sane bound well above MIN_RELIABLE", () => {
  assert.ok(DEFAULT_SAMPLE_CAP >= MIN_RELIABLE_SAMPLES * 10);
});

// -- summarizeCalibrationStore (observability) -------------------------------

test("summarizeCalibrationStore: total + correctRate + per-source breakdown", () => {
  const samples = [
    { f: 1, correct: true, source: "synthetic-gt" },
    { f: 0.5, correct: false, source: "synthetic-gt" },
    { f: 1, correct: true, source: "program-gt" },
    { f: 1, correct: false }, // no source -> "unknown"
  ];
  const s = summarizeCalibrationStore(samples);
  assert.equal(s.total, 4);
  assert.equal(s.correct, 2);
  assert.equal(s.incorrect, 2);
  assert.equal(s.correctRate, 0.5);
  assert.deepEqual(s.bySource, { "synthetic-gt": 2, "program-gt": 1, unknown: 1 });
});

test("summarizeCalibrationStore: filters invalid rows; empty -> zeros", () => {
  const s = summarizeCalibrationStore([{ f: 9, correct: true }, { junk: 1 }, { f: 0.5, correct: true, source: "program-gt" }]);
  assert.equal(s.total, 1);
  assert.deepEqual(s.bySource, { "program-gt": 1 });
  const empty = summarizeCalibrationStore([]);
  assert.equal(empty.total, 0);
  assert.equal(empty.correctRate, 0);
  assert.deepEqual(empty.bySource, {});
});
