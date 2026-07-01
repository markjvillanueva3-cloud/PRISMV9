#!/usr/bin/env node
/**
 * Tests for lathe-step-profile-probe.mjs pure helpers -- slot:whiskey [KIENZLE G1].
 * Run: node scripts/lathe-step-profile-probe.test.mjs
 * (stepFileToProfile needs occt-import-js + a real STEP -> validated LIVE, not here:
 *  FASTENAL A15267-001 OP1 -> units=mm, 4 meshes, axis z, OD/ID profile.)
 * R9: real-value asserts on the units resolver + the occt mesh-vertex concatenator.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { resolveStepUnit, occtMeshVertices, occtMeshArrays } from "./lathe-step-profile-probe.mjs";

test("resolveStepUnit: mm from SI_UNIT(.MILLI.,.METRE.)", () => {
  assert.equal(resolveStepUnit("...UNIT(#1) SI_UNIT(.MILLI.,.METRE.); ..."), "mm");
});

test("resolveStepUnit: inch from CONVERSION_BASED_UNIT 0.0254 (the JM convention)", () => {
  const step = "#10=CONVERSION_BASED_UNIT('INCH',#11); #12=LENGTH_MEASURE_WITH_UNIT(LENGTH_MEASURE(0.0254),#13);";
  assert.equal(resolveStepUnit(step), "inch");
});

test("resolveStepUnit: bare INCH token fallback", () => {
  assert.equal(resolveStepUnit("...NAMED_UNIT ... 'INCH' ..."), "inch");
});

test("resolveStepUnit: unknown when no unit declared, and on bad input (units-first: never guess mm)", () => {
  assert.equal(resolveStepUnit("HEADER; no unit here"), "unknown");
  assert.equal(resolveStepUnit(null), "unknown");
  assert.equal(resolveStepUnit(42), "unknown");
});

test("occtMeshVertices: concatenates every mesh's position array in order", () => {
  const result = {
    meshes: [
      { attributes: { position: { array: [1, 2, 3, 4, 5, 6] } } },
      { attributes: { position: { array: [7, 8, 9] } } },
    ],
  };
  assert.deepEqual(occtMeshVertices(result), [1, 2, 3, 4, 5, 6, 7, 8, 9]);
});

test("occtMeshVertices: missing/empty meshes -> [] (no throw)", () => {
  assert.deepEqual(occtMeshVertices(null), []);
  assert.deepEqual(occtMeshVertices({}), []);
  assert.deepEqual(occtMeshVertices({ meshes: [] }), []);
  assert.deepEqual(occtMeshVertices({ meshes: [{ attributes: {} }] }), []); // mesh w/o position
});

test("occtMeshArrays: one entry per body (for segmentation), position-less meshes dropped", () => {
  const result = {
    meshes: [
      { attributes: { position: { array: [1, 2, 3] } } },
      { attributes: {} },                                   // no position -> dropped
      { attributes: { position: { array: [4, 5, 6, 7, 8, 9] } } },
    ],
  };
  const arrays = occtMeshArrays(result);
  assert.equal(arrays.length, 2, "two bodies with positions");
  assert.deepEqual([...arrays[0]], [1, 2, 3]);
  assert.deepEqual([...arrays[1]], [4, 5, 6, 7, 8, 9]);
  assert.deepEqual(occtMeshArrays(null), []);
});
