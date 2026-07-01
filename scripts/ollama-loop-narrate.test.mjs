// scripts/ollama-loop-narrate.test.mjs
// U-VERIFIED-OFFLOAD-LOOPNARRATE (2026-06-09, slot:alpha): the loop narrator must
// (1) decide passed from the test EXIT CODE only -- a model that says the opposite
// CANNOT flip the verdict, (2) accept a non-empty model narration, (3) fall back to a
// deterministic narration on empty/unreachable model. Hermetic via injected runImpl
// -- NO network (R9: assert exact values + the honesty invariant).
import { test } from "node:test";
import assert from "node:assert/strict";

import { fallbackNarration, narrateIteration, parseCliArgs, isCleanExitZero } from "./ollama-loop-narrate.mjs";

const DIFF_1 = "--- a/scripts/foo.mjs\n+++ b/scripts/foo.mjs\n@@ @@\n+const x = 1;";
const DIFF_4 = [
  "--- a/a.mjs", "+++ b/a.mjs", "@@ @@", "+1",
  "--- a/b.mjs", "+++ b/b.mjs", "@@ @@", "+2",
  "--- a/c.mjs", "+++ b/c.mjs", "@@ @@", "+3",
  "--- a/d.mjs", "+++ b/d.mjs", "@@ @@", "+4",
].join("\n");

// ---- fallbackNarration (deterministic) ----
test("fallbackNarration: no files -> generic line with the pass status", () => {
  assert.equal(fallbackNarration("", true), "Iteration complete; tests passed.");
  assert.equal(fallbackNarration("", false), "Iteration complete; tests FAILED.");
});

test("fallbackNarration: one file -> basename + status", () => {
  assert.equal(fallbackNarration(DIFF_1, true), "Iteration touched 1 file(s): foo.mjs; tests passed.");
});

test("fallbackNarration: >3 files -> first 3 named + (+N more)", () => {
  assert.equal(fallbackNarration(DIFF_4, false), "Iteration touched 4 file(s): a.mjs, b.mjs, c.mjs (+1 more); tests FAILED.");
});

test("fallbackNarration: /dev/null deletions excluded", () => {
  const del = "--- a/gone.mjs\n+++ /dev/null\n@@ @@\n-1\n--- a/kept.mjs\n+++ b/kept.mjs\n@@ @@\n+2";
  assert.equal(fallbackNarration(del, true), "Iteration touched 1 file(s): kept.mjs; tests passed.");
});

// ---- narrateIteration: THE honesty invariant (exit code decides, model cannot flip) ----
test("narrateIteration: testExit 0 => passed TRUE even when the model narrates failure", async () => {
  const r = await narrateIteration({ testExit: 0, diff: DIFF_1, runImpl: async () => "Everything broke and the tests failed badly." });
  assert.equal(r.passed, true); // exit code is ground truth, NOT the model's words
  assert.equal(r.source, "ollama");
});

test("narrateIteration: testExit 1 => passed FALSE even when the model narrates success", async () => {
  const r = await narrateIteration({ testExit: 1, diff: DIFF_1, runImpl: async () => "All tests passed, everything is great!" });
  assert.equal(r.passed, false); // a hallucinated 'all good' can NEVER flip a real failure
  assert.equal(r.source, "ollama");
});

test("narrateIteration: a non-empty model narration is accepted (source ollama)", async () => {
  const r = await narrateIteration({ testExit: 0, diff: DIFF_1, runImpl: async () => "Added a constant to foo.mjs; the suite passed." });
  assert.equal(r.source, "ollama");
  assert.equal(r.verified, true);
  assert.equal(r.summary, "Added a constant to foo.mjs; the suite passed.");
});

test("narrateIteration: empty/unreachable model -> deterministic fallback narration", async () => {
  const r = await narrateIteration({ testExit: 1, diff: DIFF_1, runImpl: async () => "" });
  assert.equal(r.source, "fallback");
  assert.equal(r.summary, "Iteration touched 1 file(s): foo.mjs; tests FAILED.");
  assert.equal(r.passed, false);
});

test("narrateIteration: a too-short narration -> fallback (advisory text must be useful)", async () => {
  const r = await narrateIteration({ testExit: 0, diff: DIFF_1, runImpl: async () => "ok" });
  assert.equal(r.source, "fallback");
  assert.equal(r.passed, true);
});

test("narrateIteration: non-numeric/missing testExit is treated as NOT passed (fail-safe)", async () => {
  const r = await narrateIteration({ testExit: undefined, diff: DIFF_1, runImpl: async () => "some narration text here" });
  assert.equal(r.passed, false);
});

// ---- isCleanExitZero: FAIL-CLOSED (the U-...-LOOPNARRATE arm-B BLOCKER) ----
test("isCleanExitZero: clean integer 0 (number or string) -> true", () => {
  assert.equal(isCleanExitZero(0), true);
  assert.equal(isCleanExitZero("0"), true);
  assert.equal(isCleanExitZero(" 0 "), true);
});

test("isCleanExitZero: non-zero exit codes -> false", () => {
  assert.equal(isCleanExitZero(1), false);
  assert.equal(isCleanExitZero("1"), false);
  assert.equal(isCleanExitZero(2), false);
  assert.equal(isCleanExitZero(-1), false);
});

test("isCleanExitZero: malformed/empty/falsy that Number() coerces to 0 -> FALSE (fail-closed)", () => {
  // these all satisfy Number(x)===0 -- the pre-fix fail-OPEN bug. Must be NOT passed.
  for (const bad of ["", "   ", null, undefined, false, [], "0.0", "abc", {}]) {
    assert.equal(isCleanExitZero(bad), false, `expected ${JSON.stringify(bad)} -> false`);
  }
});

test("narrateIteration: an EMPTY exit code does NOT read as passed (fail-closed end-to-end)", async () => {
  const r = await narrateIteration({ testExit: "", diff: DIFF_1, runImpl: async () => "model claims all green" });
  assert.equal(r.passed, false); // Number('')===0 would have been a silent PASS pre-fix
});

test("narrateIteration: null/false exit codes do NOT read as passed", async () => {
  const rn = await narrateIteration({ testExit: null, diff: DIFF_1, runImpl: async () => "ok all good here" });
  const rf = await narrateIteration({ testExit: false, diff: DIFF_1, runImpl: async () => "ok all good here" });
  assert.equal(rn.passed, false);
  assert.equal(rf.passed, false);
});

// ---- parseCliArgs ----
test("parseCliArgs: --test-exit + --diff parsed (raw strings; validated downstream)", () => {
  const r = parseCliArgs(["--test-exit", "0", "--diff", "some diff text"]);
  assert.equal(r.testExit, "0");
  assert.equal(r.diff, "some diff text");
});

test("parseCliArgs: missing --test-exit -> undefined (main rejects it)", () => {
  const r = parseCliArgs(["--diff", "x"]);
  assert.equal(r.testExit, undefined);
  assert.equal(r.diff, "x");
});

test("parseCliArgs: --test-output captured", () => {
  const r = parseCliArgs(["--test-exit", "1", "--test-output", "@out.txt"]);
  assert.equal(r.testExit, "1");
  assert.equal(r.testOutputArg, "@out.txt");
});
