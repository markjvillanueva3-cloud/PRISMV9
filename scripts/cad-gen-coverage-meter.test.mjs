/*
 * Tests for cad-gen-coverage-meter.mjs pure helpers (slot:delta, 2026-06-26). Hermetic: mergeCounts is
 * pure; rootCadEngineFiles takes an injectable enginesDir scanned against a temp fixture (R9, no repo
 * coupling). Run: node scripts/cad-gen-coverage-meter.test.mjs (node:test auto-runs on exit; pipe to tail).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { mergeCounts, rootCadEngineFiles } from "./cad-gen-coverage-meter.mjs";

test("mergeCounts: accumulates per-category counts into dst, returns dst", () => {
  const dst = { holes: 2, patterns: 1 };
  const out = mergeCounts(dst, { holes: 3, fillet: 4 });
  assert.equal(out, dst); // in place
  assert.deepEqual(dst, { holes: 5, patterns: 1, fillet: 4 });
});

test("mergeCounts: null/empty/undefined src is a no-op (fail-soft)", () => {
  assert.deepEqual(mergeCounts({ a: 1 }, null), { a: 1 });
  assert.deepEqual(mergeCounts({ a: 1 }, undefined), { a: 1 });
  assert.deepEqual(mergeCounts({ a: 1 }, {}), { a: 1 });
});

test("rootCadEngineFiles: only root CAD*Engine.ts WITH the gen signature; excludes infra/subdirs/non-CAD", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "cadmeter-"));
  try {
    const gen = "import cq from 'cadquery'; // emits geometry";
    fs.writeFileSync(path.join(dir, "CADDieDesignEngine.ts"), gen);
    fs.writeFileSync(path.join(dir, "CADPatternEngine.ts"), gen);
    fs.writeFileSync(path.join(dir, "CadSweepEngine.ts"), "uses build123d to loft"); // mixed-case + gen sig -> included
    // CAD-named INFRA engine with NO generation signature -> MUST be excluded (the over-fold P1 fix).
    fs.writeFileSync(path.join(dir, "CADTransactionEngine.ts"), "class CADTransactionEngine { commit() {} }");
    fs.writeFileSync(path.join(dir, "SpeedFeedEngine.ts"), gen);    // not CAD name -> excluded
    fs.writeFileSync(path.join(dir, "CADReadme.md"), gen);          // not *Engine.ts -> excluded
    fs.mkdirSync(path.join(dir, "cad"));                            // a galaxy SUBDIR ...
    fs.writeFileSync(path.join(dir, "cad", "CADFooEngine.ts"), gen); // ... its file must NOT be returned (no double-count)
    const got = rootCadEngineFiles(dir).map((p) => path.basename(p));
    assert.deepEqual(got, ["CADDieDesignEngine.ts", "CADPatternEngine.ts", "CadSweepEngine.ts"]);
  } finally {
    fs.rmSync(dir, { recursive: true, force: true });
  }
});

test("rootCadEngineFiles: missing dir -> [] (fail-soft, never throws)", () => {
  assert.deepEqual(rootCadEngineFiles("/no/such/engines/dir/xyz"), []);
});
