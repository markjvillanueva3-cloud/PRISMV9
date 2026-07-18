/*
 * Tests for cad-gen-validate.mjs (slot:delta). Hermetic: injected check-runner (R9 -- never spawn
 * real python/cadquery). Run: node scripts/cad-gen-validate.test.mjs (node:test auto-runs; pipe tail).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { findStagedSteps, classifyValidation, summarizeValidation, runValidation } from "./cad-gen-validate.mjs";

test("classifyValidation: valid solid -> valid; counts captured", () => {
  const r = classifyValidation("/d/model.step", '{"valid":true,"solids":1,"faces":6}');
  assert.equal(r.valid, true);
  assert.equal(r.solids, 1);
  assert.equal(r.faces, 6);
});

test("classifyValidation: import error -> invalid, error captured (failure mode)", () => {
  const r = classifyValidation("/d/model.step", '{"valid":false,"error":"STEP parse failed"}');
  assert.equal(r.valid, false);
  assert.match(r.error, /parse failed/);
});

test("classifyValidation: non-JSON / empty -> invalid no-parse (adversarial)", () => {
  assert.equal(classifyValidation("/d/x.step", "garbage not json").valid, false);
  assert.equal(classifyValidation("/d/x.step", "").error, "no-parse");
  assert.equal(classifyValidation("/d/x.step", '{"solids":1}').error, "no-parse"); // missing boolean valid
});

test("classifyValidation: multi-line stdout -> parses LAST json line", () => {
  const r = classifyValidation("/d/m.step", "warn: font table\n{\"valid\":true,\"solids\":2,\"faces\":12}");
  assert.equal(r.valid, true);
  assert.equal(r.solids, 2);
});

test("summarizeValidation: valid-rate + avgFaces over VALID only", () => {
  const s = summarizeValidation([
    { valid: true, faces: 6 }, { valid: true, faces: 10 }, { valid: false, faces: 0 },
  ]);
  assert.equal(s.total, 3);
  assert.equal(s.valid, 2);
  assert.equal(s.invalid, 1);
  assert.equal(s.validRate, 0.667);
  assert.equal(s.avgFaces, 8); // (6+10)/2, invalid excluded
});

test("summarizeValidation: empty -> 0 rate, no divide-by-zero", () => {
  assert.equal(summarizeValidation([]).validRate, 0);
  assert.equal(summarizeValidation([]).avgFaces, 0);
});

test("runValidation: injected runner, respects limit, classifies each (no real spawn)", () => {
  const steps = ["/a/model.step", "/b/model.step", "/c/model.step"];
  const runner = (p) => (p.includes("/b/") ? '{"valid":false,"error":"bad"}' : '{"valid":true,"solids":1,"faces":6}');
  const res = runValidation({ steps, runner, limit: 0, log: () => {} });
  assert.equal(res.length, 3);
  assert.equal(res.filter((r) => r.valid).length, 2);
  assert.equal(res.find((r) => r.step.includes("/b/")).valid, false);
  // limit caps
  assert.equal(runValidation({ steps, runner, limit: 1, log: () => {} }).length, 1);
});

test("findStagedSteps: locates model.step recursively, ignores other files", () => {
  const tmp = fs.mkdtempSync(path.join(os.tmpdir(), "cadval-"));
  fs.mkdirSync(path.join(tmp, "part-a-123"));
  fs.writeFileSync(path.join(tmp, "part-a-123", "model.step"), "STEP");
  fs.writeFileSync(path.join(tmp, "part-a-123", "model.py"), "code");
  const found = findStagedSteps(tmp);
  assert.equal(found.length, 1);
  assert.ok(found[0].endsWith("model.step"));
  assert.equal(findStagedSteps(path.join(tmp, "nope")).length, 0); // missing dir -> []
  fs.rmSync(tmp, { recursive: true, force: true });
});
