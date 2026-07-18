#!/usr/bin/env node
/**
 * Tests for build-cad-ocr-holdout.mjs pure helpers (U-DELTA-OCR-HOLDOUT).
 * node:test. Run: node scripts/build-cad-ocr-holdout.test.mjs
 *
 * R9: real blueprint-training-pairs shapes. isCleanForOcr gates the trustworthy trainable parts;
 * pairToOcrEntry maps a clean record to a holdout entry carrying BOTH a representative abs_path
 * (loadHoldout path-set) and part_number_normalized (leak-guard ID arm). Happy + failure + adversarial.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { isCleanForOcr, pairToOcrEntry } from "./build-cad-ocr-holdout.mjs";

// ---------- isCleanForOcr ----------
test("isCleanForOcr: exact|loose + a real source is clean; poison/miss/no-source are not", () => {
  assert.equal(isCleanForOcr({ match_confidence: "exact", has_cad: true }), true);
  assert.equal(isCleanForOcr({ match_confidence: "loose", has_program: true }), true);
  // poison labels -> not eval material
  assert.equal(isCleanForOcr({ match_confidence: "garbage", has_cad: true }), false);
  assert.equal(isCleanForOcr({ match_confidence: "ambiguous", has_program: true }), false);
  // miss = no label at all
  assert.equal(isCleanForOcr({ match_confidence: "miss", has_print: true }), false);
  // trustworthy tier but NO real answer-key source -> cannot grade
  assert.equal(isCleanForOcr({ match_confidence: "exact", has_program: false, has_cad: false }), false);
  // adversarial
  assert.equal(isCleanForOcr(null), false);
  assert.equal(isCleanForOcr(42), false);
  assert.equal(isCleanForOcr({}), false);
});

// ---------- pairToOcrEntry: happy ----------
test("pairToOcrEntry: maps a clean record to {abs_path, part_number_normalized, match_confidence}", () => {
  const rec = {
    part_number_normalized: "221178737",
    match_confidence: "exact",
    cad_files: [{ path: "H:/x/part.step" }],
    program_files: [{ path: "H:/x/prog.nc" }],
  };
  const e = pairToOcrEntry(rec);
  assert.equal(e.part_number_normalized, "221178737");
  assert.equal(e.abs_path, "H:/x/part.step"); // cad preferred over program
  assert.equal(e.match_confidence, "exact");
});

test("pairToOcrEntry: falls back to program_files when no cad_files", () => {
  const e = pairToOcrEntry({
    part_number_normalized: "999", match_confidence: "loose",
    cad_files: [], program_files: ["H:/x/onlyprog.min"],
  });
  assert.equal(e.abs_path, "H:/x/onlyprog.min");
  assert.equal(e.part_number_normalized, "999");
});

test("pairToOcrEntry: falls back to part_number when normalized is absent", () => {
  const e = pairToOcrEntry({ part_number: "RAW-123", match_confidence: "exact", cad_files: [{ filename: "p.stp" }] });
  assert.equal(e.part_number_normalized, "RAW-123");
  assert.equal(e.abs_path, "p.stp");
});

// ---------- pairToOcrEntry: failure/adversarial ----------
test("pairToOcrEntry: null when no part id or no answer-key path (untrackable -> excluded)", () => {
  assert.equal(pairToOcrEntry({ match_confidence: "exact", cad_files: [{ path: "x.step" }] }), null, "no part id");
  assert.equal(pairToOcrEntry({ part_number_normalized: "p1", match_confidence: "exact", cad_files: [], program_files: [] }), null, "no path");
  assert.equal(pairToOcrEntry(null), null);
  assert.equal(pairToOcrEntry(42), null);
  assert.equal(pairToOcrEntry({ part_number_normalized: "  ", match_confidence: "exact", cad_files: [{ path: "x.step" }] }), null, "blank part id");
});
