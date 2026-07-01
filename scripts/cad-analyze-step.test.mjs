/*
 * Tests for cad-analyze-step.mjs (slot:delta). Hermetic: parseStepText/classifyValidity are pure;
 * analyzeStep takes injected runPy/readImpl/existsImpl so no live python+cadquery env is needed (R9).
 * Run: node scripts/cad-analyze-step.test.mjs (node:test auto-runs on exit; pipe to tail).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseStepText, classifyValidity, analyzeStep } from "./cad-analyze-step.mjs";

const STEP_INCH = `ISO-10303-21;
HEADER;
FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));
ENDSEC;
DATA;
#1=CARTESIAN_POINT('',(0.,0.,0.));
#2=CARTESIAN_POINT('',(2.5,1.0,-0.5));
#3=CIRCLE('',#1,0.375);
#4=MANIFOLD_SOLID_BREP('',#5);
#5=CONVERSION_BASED_UNIT('INCH',#6);
ENDSEC;
END-ISO-10303-21;`;

const STEP_MM = STEP_INCH.replace(/CONVERSION_BASED_UNIT\('INCH',#6\)/, "SI_UNIT(.MILLI.,.METRE.)");

test("parseStepText: extracts schema, inch unit, entity count, coord range, radii, manifold flag", () => {
  const r = parseStepText(STEP_INCH);
  assert.equal(r.schema, "AUTOMOTIVE_DESIGN");
  assert.equal(r.unit, "inch");
  assert.equal(r.entityCount, 5);
  assert.deepEqual(r.coordRange, { min: -0.5, max: 2.5 });
  assert.deepEqual(r.radii, [0.375]);
  assert.equal(r.hasManifold, true);
});

test("parseStepText: detects mm (SI_UNIT .MILLI..METRE.)", () => {
  assert.equal(parseStepText(STEP_MM).unit, "mm");
});

test("parseStepText: empty/garbage -> unknown unit, 0 entities, null range, no manifold (fail-soft)", () => {
  const r = parseStepText("");
  assert.equal(r.unit, "unknown");
  assert.equal(r.entityCount, 0);
  assert.equal(r.coordRange, null);
  assert.deepEqual(r.radii, []);
  assert.equal(r.hasManifold, false);
  // null/undefined must not throw
  assert.equal(parseStepText(null).entityCount, 0);
  assert.equal(parseStepText(undefined).unit, "unknown");
});

test("parseStepText: large NURBS coord set does NOT overflow the stack (regression: Math.min(...coords) spread)", () => {
  // 60000 CARTESIAN_POINTs x 3 coords = 180000 coords. A `Math.min(...coords)` spread of this many
  // args overflows V8's call stack ("Maximum call stack size exceeded" on blisk.stp's 223 NURBS faces).
  // The single-pass min/max must handle it. [[reference_cad_analyze_step_nurbs_overflow_2026_06_26]]
  const parts = ["FILE_SCHEMA(('AUTOMOTIVE_DESIGN'));"];
  for (let i = 1; i <= 60000; i++) parts.push(`#${i}=CARTESIAN_POINT('',(${i}.0,${-i}.0,0.5));`);
  const r = parseStepText(parts.join("\n")); // must NOT throw
  assert.deepEqual(r.coordRange, { min: -60000, max: 60000 });
  assert.equal(r.entityCount, 60000);
});

test("classifyValidity: valid manifold solid -> exitCode 0", () => {
  const v = classifyValidity('{"valid":true,"solids":1,"faces":6}');
  assert.equal(v.valid, true);
  assert.equal(v.exitCode, 0);
  assert.equal(v.solids, 1);
  assert.equal(v.faces, 6);
});

test("classifyValidity: valid:false -> exitCode 1 (the false-fail bug this fixes is the INVERSE)", () => {
  const v = classifyValidity('{"valid":false,"error":"no solid"}');
  assert.equal(v.valid, false);
  assert.equal(v.exitCode, 1);
});

test("classifyValidity: valid:true but solids 0 -> invalid (defensive solids>=1 gate)", () => {
  const v = classifyValidity('{"valid":true,"solids":0}');
  assert.equal(v.valid, false);
  assert.equal(v.exitCode, 1);
});

test("classifyValidity: unparseable / empty (python itself failed) -> invalid + fail-loud reason", () => {
  for (const bad of ["", "not json", null, undefined]) {
    const v = classifyValidity(bad);
    assert.equal(v.exitCode, 1);
    assert.equal(v.valid, false);
    assert.match(v.error, /parseable|result/);
  }
});

test("classifyValidity: accepts an already-parsed object (not just a JSON string)", () => {
  const v = classifyValidity({ valid: true, solids: 2, faces: 11 });
  assert.equal(v.valid, true);
  assert.equal(v.exitCode, 0);
});

test("analyzeStep: no path -> exitCode 2 (usage)", () => {
  assert.equal(analyzeStep("").exitCode, 2);
  assert.equal(analyzeStep(undefined).exitCode, 2);
});

test("analyzeStep: file not found -> exitCode 2", () => {
  const r = analyzeStep("/no/such.step", { existsImpl: () => false });
  assert.equal(r.exitCode, 2);
  assert.match(r.error, /not found/);
});

test("analyzeStep: valid STEP -> ok true, exitCode 0, inspection populated (THE fix: valid -> pass)", () => {
  const r = analyzeStep("model.step", {
    existsImpl: () => true,
    readImpl: () => STEP_INCH,
    runPy: () => '{"valid":true,"solids":1,"faces":9}',
  });
  assert.equal(r.ok, true);
  assert.equal(r.exitCode, 0);
  assert.equal(r.solids, 1);
  assert.equal(r.inspect.unit, "inch");
  assert.deepEqual(r.inspect.radii, [0.375]);
});

test("analyzeStep: invalid STEP -> ok false, exitCode 1", () => {
  const r = analyzeStep("model.step", {
    existsImpl: () => true,
    readImpl: () => STEP_INCH,
    runPy: () => '{"valid":false,"error":"empty compound"}',
  });
  assert.equal(r.ok, false);
  assert.equal(r.exitCode, 1);
});

test("analyzeStep: python validator unavailable (empty stdout) -> exitCode 1, never a false pass", () => {
  const r = analyzeStep("model.step", { existsImpl: () => true, readImpl: () => STEP_INCH, runPy: () => "" });
  assert.equal(r.exitCode, 1);
  assert.equal(r.ok, false);
});
