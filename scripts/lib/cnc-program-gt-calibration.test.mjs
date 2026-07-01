#!/usr/bin/env node
/**
 * cnc-program-gt-calibration.test.mjs -- node:test coverage for
 * programGtAgreementSamples (U-XRAY-PROGRAM-GT-CALIB): the program-GT analog of
 * the synthetic perDimCorrectness that turns fused OCR dims into {f,correct}
 * calibration samples using the CNC program as the answer key.
 *
 * Isolated test file (the function is a new, self-contained export bridging the
 * GT scorer and the calibration store); kept separate from the large
 * cnc-program-gt-lib.test.mjs to avoid perturbing the existing suite.
 *
 * Run directly: `node cnc-program-gt-calibration.test.mjs` (node:test auto-runs).
 */

import test from "node:test";
import assert from "node:assert/strict";
import { programGtAgreementSamples, scorePartAgainstProgram } from "./cnc-program-gt-lib.mjs";

const INCH_TO_MM = 25.4;

// A program GT with two distinct callout diameters (inch): 0.5" and 1.0".
const GT = { calloutDimsIn: [0.5, 1.0, 0.5 /* dup collapses */] };

// helper: a fused dim at a given mm value with an agreement (corroboration/n_models)
const dim = (value_mm, corroboration, n_models) => ({ value_mm, corroboration, n_models });

test("emits {f,correct} grounded in the program: f=corroboration/n_models, correct=matches a machined dia", () => {
  const fused = [
    dim(0.5 * INCH_TO_MM, 2, 2), // 12.7mm, both models agree -> f=1.0, matches 0.5" GT -> correct
    dim(1.0 * INCH_TO_MM, 1, 2), // 25.4mm, 1-of-2 -> f=0.5, matches 1.0" GT -> correct
    dim(0.731 * INCH_TO_MM, 2, 2), // 18.57mm, full agreement but NO matching GT dia -> correct=false
  ];
  const s = programGtAgreementSamples(fused, GT, { relTol: 0.02 });
  assert.equal(s.length, 3);
  assert.deepEqual(s[0], { f: 1, correct: true });
  assert.deepEqual(s[1], { f: 0.5, correct: true });
  assert.deepEqual(s[2], { f: 1, correct: false }, "a confidently-agreed dim that is NOT a real machined dia is a false sample (the calibration signal we want)");
});

test("correctness label agrees with the recall scorer (same dimMatchesProgram contract)", () => {
  const fused = [dim(0.5 * INCH_TO_MM, 2, 2), dim(0.9 * INCH_TO_MM, 2, 2)];
  const samples = programGtAgreementSamples(fused, GT, { relTol: 0.02 });
  const score = scorePartAgainstProgram(fused.map((d) => d.value_mm), GT, { relTol: 0.02 });
  // 0.5" matches, 0.9" does not -> 1 correct sample, and the scorer agrees (1 ocrMatched)
  assert.equal(samples.filter((x) => x.correct).length, 1);
  assert.equal(score.ocrMatched, 1);
});

test("gates out single-model dims (no real agreement signal)", () => {
  const fused = [dim(0.5 * INCH_TO_MM, 1, 1)]; // n_models=1 -> excluded
  assert.deepEqual(programGtAgreementSamples(fused, GT), []);
  // minModels override
  assert.equal(programGtAgreementSamples([dim(0.5 * INCH_TO_MM, 1, 1)], GT, { minModels: 1 }).length, 1);
});

test("no callout GT -> [] (correctness unlabelable without an answer key)", () => {
  assert.deepEqual(programGtAgreementSamples([dim(12.7, 2, 2)], { calloutDimsIn: [] }), []);
  assert.deepEqual(programGtAgreementSamples([dim(12.7, 2, 2)], {}), []);
  assert.deepEqual(programGtAgreementSamples([dim(12.7, 2, 2)], null), []);
});

test("skips malformed fused dims (non-finite/zero value_mm, missing fields)", () => {
  const fused = [
    dim(NaN, 2, 2),
    dim(0, 2, 2),
    { corroboration: 2, n_models: 2 }, // no value_mm
    dim(0.5 * INCH_TO_MM, 2, 2), // the one valid
  ];
  const s = programGtAgreementSamples(fused, GT);
  assert.equal(s.length, 1);
  assert.equal(s[0].correct, true);
});

test("clamps an out-of-range agreement fraction (corroboration > n_models -> skip)", () => {
  const fused = [dim(0.5 * INCH_TO_MM, 3, 2)]; // f=1.5 -> not a usable sample
  assert.deepEqual(programGtAgreementSamples(fused, GT), []);
});

test("empty/garbage fused input -> []", () => {
  assert.deepEqual(programGtAgreementSamples([], GT), []);
  assert.deepEqual(programGtAgreementSamples(null, GT), []);
  assert.deepEqual(programGtAgreementSamples("nope", GT), []);
});

test("diameterOnly (default): EXCLUDES a known non-diameter dim, KEEPS a known diameter", () => {
  // a linear dim is NOT in the diameter answer-key: a value-match would be a false correct=true and a
  // value-miss a false correct=false. Both must be EXCLUDED (the calibration false-negative fix).
  const linMatch = { value_mm: 0.5 * INCH_TO_MM, corroboration: 2, n_models: 2, type: "linear" };
  const linMiss = { value_mm: 0.731 * INCH_TO_MM, corroboration: 2, n_models: 2, type: "linear" };
  const diaMatch = { value_mm: 0.5 * INCH_TO_MM, corroboration: 2, n_models: 2, type: "diameter" };
  const out = programGtAgreementSamples([linMatch, linMiss, diaMatch], GT);
  assert.equal(out.length, 1, "only the diameter-typed dim is adjudicated");
  assert.deepEqual(out[0], { f: 1, correct: true });
});

test("diameterOnly: UNKNOWN type is kept (value-only fallback, like typesCompatible(null,*))", () => {
  const untyped = dim(0.5 * INCH_TO_MM, 2, 2); // no type field
  const sentinel = { value_mm: 1.0 * INCH_TO_MM, corroboration: 2, n_models: 2, type: "unknown" }; // sentinel -> null
  const out = programGtAgreementSamples([untyped, sentinel], GT);
  assert.equal(out.length, 2, "untyped + sentinel-typed dims fall through to value-only adjudication");
  assert.ok(out.every((s) => s.correct === true));
});

test("diameterOnly:false emits all dim types (escape hatch)", () => {
  const lin = { value_mm: 0.9 * INCH_TO_MM, corroboration: 2, n_models: 2, type: "linear" };
  assert.equal(programGtAgreementSamples([lin], GT).length, 0, "default excludes the linear dim");
  assert.equal(programGtAgreementSamples([lin], GT, { diameterOnly: false }).length, 1, "opt-out includes it");
});

test("samples are store-valid (consumable by calibration-sample-store.isValidSample)", async () => {
  const { isValidSample } = await import("./calibration-sample-store.mjs");
  const fused = [dim(0.5 * INCH_TO_MM, 2, 2), dim(1.0 * INCH_TO_MM, 1, 2)];
  const s = programGtAgreementSamples(fused, GT);
  assert.ok(s.length > 0);
  assert.ok(s.every(isValidSample), "every emitted sample must pass the store's validity gate");
});
