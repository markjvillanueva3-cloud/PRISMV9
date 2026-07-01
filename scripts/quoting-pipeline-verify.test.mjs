/**
 * quoting-pipeline-verify — iter23 unit test for parseTapSummary + aggregateSummaries.
 *
 * Run: node --test scripts/quoting-pipeline-verify.test.mjs
 *
 * @milestone QUOTING-SYNERGY-MS0/U-QP-PIPELINE-VERIFY (charlie /goal-yolo iter23)
 */

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseTapSummary, aggregateSummaries, computeOk } from "./quoting-pipeline-verify.mjs";

// ---------- parseTapSummary: happy path ----------

const REFERENCE_TAP = `
# Subtest: example test 1
ok 1 - first
# Subtest: example test 2
ok 2 - second
1..21
# tests 21
# pass 21
# fail 0
# cancelled 0
# skipped 0
# todo 0
# duration_ms 92.5
`;

test("parseTapSummary: parses real node --test summary block", () => {
  const r = parseTapSummary(REFERENCE_TAP);
  assert.equal(r.tests, 21);
  assert.equal(r.pass, 21);
  assert.equal(r.fail, 0);
  assert.equal(r.skipped, 0);
});

test("parseTapSummary: parses the Node>=24 info-sigil summary (the live 0-tests bug)", () => {
  // Node 24's node:test emits "<U+2139> tests N" (info source glyph), NOT "# tests N".
  // The original /^# / regex matched ZERO lines under Node 24 -> the whole verify
  // reported tests:0. This pins the both-sigil parse so it can never silently drift back.
  const NODE24_TAP = "ℹ tests 20\nℹ pass 20\nℹ fail 0\nℹ skipped 0";
  const r = parseTapSummary(NODE24_TAP);
  assert.equal(r.tests, 20);
  assert.equal(r.pass, 20);
  assert.equal(r.fail, 0);
  assert.equal(r.skipped, 0);
});

test("parseTapSummary: mixed # and info sigils both counted", () => {
  // Defensive: a stream that carries both sigils still parses each key. The loop
  // ASSIGNS (last-write-wins per key), it does not sum -- here each key appears
  // once so the distinction is moot; the point is both sigils are recognized.
  const r = parseTapSummary("# tests 5\nℹ pass 5\n# fail 0");
  assert.equal(r.tests, 5);
  assert.equal(r.pass, 5);
  assert.equal(r.fail, 0);
});

test("parseTapSummary: detects fails", () => {
  const tap = "# tests 10\n# pass 8\n# fail 2\n# skipped 0";
  const r = parseTapSummary(tap);
  assert.equal(r.fail, 2);
  assert.equal(r.pass, 8);
});

test("parseTapSummary: detects skipped", () => {
  const tap = "# tests 5\n# pass 3\n# fail 0\n# skipped 2";
  const r = parseTapSummary(tap);
  assert.equal(r.skipped, 2);
});

// ---------- parseTapSummary: adversarial ----------

test("parseTapSummary: empty string yields all zeros", () => {
  const r = parseTapSummary("");
  assert.deepEqual(r, { tests: 0, pass: 0, fail: 0, skipped: 0 });
});

test("parseTapSummary: non-string returns zeros", () => {
  for (const bad of [null, undefined, 42, {}, []]) {
    const r = parseTapSummary(bad);
    assert.deepEqual(r, { tests: 0, pass: 0, fail: 0, skipped: 0 });
  }
});

test("parseTapSummary: no summary lines yields zeros", () => {
  const r = parseTapSummary("ok 1 - test passed\nok 2 - test passed");
  assert.deepEqual(r, { tests: 0, pass: 0, fail: 0, skipped: 0 });
});

test("parseTapSummary: malformed numbers ignored", () => {
  const r = parseTapSummary("# tests abc\n# pass NaN\n# fail 5");
  // Bad lines silently skipped; only the well-formed "# fail 5" counts
  assert.equal(r.fail, 5);
  assert.equal(r.tests, 0);
  assert.equal(r.pass, 0);
});

test("parseTapSummary: extra whitespace tolerated", () => {
  const tap = "#   tests   42\n#  pass  42";
  const r = parseTapSummary(tap);
  // Format requires single-space after # — strict match. Extra whitespace
  // means the regex won't fire on the "extra-whitespace" variant.
  // This documents the contract; future test runners that emit different
  // whitespace need a parser update.
  assert.equal(r.tests, 0);
});

test("parseTapSummary: out-of-order summary lines OK", () => {
  const tap = "# fail 0\n# tests 21\n# pass 21\n# skipped 0";
  const r = parseTapSummary(tap);
  assert.equal(r.tests, 21);
  assert.equal(r.pass, 21);
});

test("parseTapSummary: shape stability — exact 4 keys", () => {
  const r = parseTapSummary("# tests 1");
  assert.deepEqual(Object.keys(r).sort(), ["fail", "pass", "skipped", "tests"]);
});

// ---------- aggregateSummaries: happy path ----------

test("aggregateSummaries: 3-file successful run", () => {
  const perFile = [
    { file: "a.test.mjs", tests: 5, pass: 5, fail: 0, skipped: 0, exit_code: 0 },
    { file: "b.test.mjs", tests: 10, pass: 10, fail: 0, skipped: 0, exit_code: 0 },
    { file: "c.test.mjs", tests: 3, pass: 3, fail: 0, skipped: 0, exit_code: 0 },
  ];
  const agg = aggregateSummaries(perFile);
  assert.equal(agg.file_count, 3);
  assert.equal(agg.tests, 18);
  assert.equal(agg.pass, 18);
  assert.equal(agg.fail, 0);
  assert.deepEqual(agg.fail_files, []);
});

test("aggregateSummaries: mixed pass/fail flags fail_files correctly", () => {
  const perFile = [
    { file: "a.test.mjs", tests: 5, pass: 5, fail: 0, exit_code: 0 },
    { file: "b.test.mjs", tests: 10, pass: 8, fail: 2, exit_code: 1 },
    { file: "c.test.mjs", tests: 3, pass: 3, fail: 0, exit_code: 0 },
  ];
  const agg = aggregateSummaries(perFile);
  assert.equal(agg.fail, 2);
  assert.deepEqual(agg.fail_files, ["b.test.mjs"]);
});

test("aggregateSummaries: non-zero exit_code with zero fail still flags as fail (e.g. crash)", () => {
  const perFile = [
    { file: "crashed.test.mjs", tests: 0, pass: 0, fail: 0, exit_code: 137 },
  ];
  const agg = aggregateSummaries(perFile);
  assert.equal(agg.fail, 0);
  assert.deepEqual(agg.fail_files, ["crashed.test.mjs"]);
});

test("aggregateSummaries: empty array yields zeroed", () => {
  const agg = aggregateSummaries([]);
  assert.equal(agg.file_count, 0);
  assert.equal(agg.tests, 0);
  assert.deepEqual(agg.fail_files, []);
});

test("aggregateSummaries: null/undefined/non-array yields zeroed", () => {
  for (const bad of [null, undefined, "not array", 42, {}]) {
    const agg = aggregateSummaries(bad);
    assert.equal(agg.file_count, 0);
    assert.equal(agg.tests, 0);
  }
});

test("aggregateSummaries: skips null/undefined entries gracefully", () => {
  const perFile = [
    { file: "a.test.mjs", tests: 5, pass: 5, fail: 0, exit_code: 0 },
    null,
    undefined,
    "not an object",
    { file: "b.test.mjs", tests: 3, pass: 3, fail: 0, exit_code: 0 },
  ];
  const agg = aggregateSummaries(perFile);
  assert.equal(agg.file_count, 2);
  assert.equal(agg.tests, 8);
});

test("aggregateSummaries: stable 6-key shape", () => {
  const agg = aggregateSummaries([]);
  assert.deepEqual(Object.keys(agg).sort(), ["fail", "fail_files", "file_count", "pass", "skipped", "tests"]);
});

test("aggregateSummaries: missing fields default to 0", () => {
  const perFile = [{ file: "partial.test.mjs", exit_code: 0 }]; // no test counts at all
  const agg = aggregateSummaries(perFile);
  assert.equal(agg.tests, 0);
  assert.equal(agg.pass, 0);
  assert.equal(agg.file_count, 1);
});

// ---------- integration: parseTapSummary + aggregateSummaries roundtrip ----------

test("integration: parse + aggregate composes correctly", () => {
  const tap1 = "# tests 10\n# pass 10\n# fail 0\n# skipped 0";
  const tap2 = "# tests 5\n# pass 4\n# fail 1\n# skipped 0";
  const f1 = { file: "a.test.mjs", ...parseTapSummary(tap1), exit_code: 0 };
  const f2 = { file: "b.test.mjs", ...parseTapSummary(tap2), exit_code: 1 };
  const agg = aggregateSummaries([f1, f2]);
  assert.equal(agg.tests, 15);
  assert.equal(agg.pass, 14);
  assert.equal(agg.fail, 1);
  assert.deepEqual(agg.fail_files, ["b.test.mjs"]);
});

// ---------- computeOk: R12 fail-loud on a dead runner (no tests collected) ----------

test("computeOk: genuine all-pass run is ok:true", () => {
  const agg = aggregateSummaries([
    { file: "a.test.mjs", tests: 10, pass: 10, fail: 0, exit_code: 0 },
  ]);
  assert.equal(computeOk(agg), true);
});

test("computeOk: ZERO tests collected is ok:FALSE (the dead-runner false-green this guard exists for)", () => {
  // The exact live failure: discovered files ran but reported 0 tests -> agg.fail===0
  // with agg.tests===0. A bare startsWith("..")-style vacuous pass is the bug; ok must be false.
  const agg = aggregateSummaries([
    { file: "a.test.mjs", tests: 0, pass: 0, fail: 0, exit_code: 0 },
    { file: "b.test.mjs", tests: 0, pass: 0, fail: 0, exit_code: 0 },
  ]);
  assert.equal(agg.tests, 0);
  assert.equal(agg.fail, 0); // vacuously zero -- the trap
  assert.equal(agg.fail_files.length, 0); // exit_code 0 so not flagged here
  assert.equal(computeOk(agg), false); // ...but ok must be FALSE: no tests ran
});

test("computeOk: a real failure is ok:false", () => {
  const agg = aggregateSummaries([
    { file: "a.test.mjs", tests: 10, pass: 8, fail: 2, exit_code: 1 },
  ]);
  assert.equal(computeOk(agg), false);
});

test("computeOk: a crashed file (exit!=0, 0 fails) is ok:false via fail_files", () => {
  const agg = aggregateSummaries([
    { file: "crashed.test.mjs", tests: 0, pass: 0, fail: 0, exit_code: 137 },
  ]);
  assert.equal(computeOk(agg), false);
});

test("computeOk: empty/non-object aggregate is ok:false (never vacuous-true)", () => {
  for (const bad of [null, undefined, "nope", 42, {}, aggregateSummaries([])]) {
    assert.equal(computeOk(bad), false);
  }
});

test("computeOk: pass with tests but a non-array fail_files still resolves (defensive)", () => {
  assert.equal(computeOk({ tests: 5, fail: 0, fail_files: undefined }), true);
  assert.equal(computeOk({ tests: 5, fail: 0, fail_files: ["x"] }), false);
});
