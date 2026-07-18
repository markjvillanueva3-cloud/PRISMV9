// Tests for cad-topology-validity.mjs (U-CADGEN-TOPOLOGY-VALIDITY, slot:delta 2026-07-04).
// node:test. The KERNEL check itself (cadquery isValid) is smoke-verified separately on real gens
// (cube/cylinder/flange/bushing/plate-with-hole all valid=true -- the holed cases the deleted regex gate
// got WRONG). These tests pin the node orchestration hermetically (injected runner -> no python spawn):
// batch parsing (skipping the OCCT font-warning line), the valid/invalid/unanalyzable summary, and the
// single-path + empty-input paths.
//   run: node --test scripts/cad-topology-validity.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBatch, validateSteps, validateStep, summarize } from "./cad-topology-validity.mjs";

test("parseBatch skips the OCCT font warning + torn lines, keeps JSON objects", () => {
  const text = [
    "'name' table stringOffset incorrect. Expected: 222; Actual: 224", // OCCT warning to stdout
    JSON.stringify({ path: "a.step", valid: true, V: 8, E: 12, F: 6, solids: 1 }),
    "{ this is a torn line",                                            // partial -> skipped
    JSON.stringify({ path: "b.step", valid: false }),
    "",
  ].join("\n");
  const rows = parseBatch(text);
  assert.equal(rows.length, 2);
  assert.equal(rows[0].path, "a.step"); assert.equal(rows[0].valid, true);
  assert.equal(rows[1].valid, false);
});

test("validateSteps uses the injected runner; empty input -> []", () => {
  const runner = (paths) => paths.map((p) => ({ path: p, valid: true, V: 1, E: 1, F: 1, solids: 1, error: null }));
  const r = validateSteps(["x.step", "y.step"], { runner });
  assert.equal(r.length, 2);
  assert.equal(r[0].valid, true);
  assert.deepEqual(validateSteps([], { runner }), []);
  assert.deepEqual(validateSteps(null, { runner }), []);
});

test("validateStep returns the single result, with a no-result fallback", () => {
  const runner = (paths) => paths.map((p) => ({ path: p, valid: false, error: null }));
  assert.equal(validateStep("z.step", { runner }).valid, false);
  const empty = validateStep("q.step", { runner: () => [] });
  assert.equal(empty.valid, null); assert.equal(empty.error, "no-result");
});

test("summarize counts valid / INVALID (false) / unanalyzable (null) and lists invalids", () => {
  const results = [
    { path: "ok1.step", valid: true },
    { path: "ok2.step", valid: true },
    { path: "bad.step", valid: false },     // kernel read it and it is topologically invalid
    { path: "gone.step", valid: null, error: "missing" }, // could not analyze -- NOT counted invalid
  ];
  const s = summarize(results);
  assert.equal(s.total, 4);
  assert.equal(s.valid, 2);
  assert.equal(s.invalid, 1, "only valid===false counts as INVALID (a real defect signal)");
  assert.equal(s.unanalyzable, 1, "valid===null (missing/error) is unanalyzable, not a defect");
  assert.deepEqual(s.invalidPaths, ["bad.step"]);
});
