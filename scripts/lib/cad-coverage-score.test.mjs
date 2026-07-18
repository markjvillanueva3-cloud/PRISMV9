/**
 * cad-coverage-score.test.mjs -- pure-function coverage for the deterministic CAD-gen coverage meter.
 * R9: reference values are hand-computed from a small fixed hits matrix; a regression in the union /
 * threshold / percent math fails a concrete number, not a shape stub.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { CATEGORIES, coverageState, scoreCoverage } from "./cad-coverage-score.mjs";

const ESSENTIAL_COUNT = CATEGORIES.filter((c) => c.essential).length;

test("coverageState: threshold bands (default deep>=5, shallow>=1)", () => {
  assert.equal(coverageState(0), "absent");
  assert.equal(coverageState(1), "shallow");
  assert.equal(coverageState(4), "shallow");
  assert.equal(coverageState(5), "covered");
  assert.equal(coverageState(99), "covered");
});

test("coverageState: custom thresholds honored", () => {
  assert.equal(coverageState(3, { deepThreshold: 3, shallowThreshold: 1 }), "covered");
  assert.equal(coverageState(2, { deepThreshold: 3, shallowThreshold: 2 }), "shallow");
  assert.equal(coverageState(1, { deepThreshold: 3, shallowThreshold: 2 }), "absent");
});

test("scoreCoverage: per-category union state across galaxies + totalHits", () => {
  const hits = {
    cad: { "sketch-additive": 7, "dress-up": 3, generative: 0 },
    "cad-fusion-live": { "sketch-additive": 2, "sheet-metal": 1 },
  };
  const { perCategory } = scoreCoverage(hits);
  // sketch-additive: cad deep(7) + fusion shallow(2) -> union "covered", 9 hits, 2 covering galaxies
  assert.equal(perCategory["sketch-additive"].state, "covered");
  assert.equal(perCategory["sketch-additive"].totalHits, 9);
  assert.equal(perCategory["sketch-additive"].coveringGalaxies.length, 2);
  // dress-up: only shallow(3) -> "shallow"
  assert.equal(perCategory["dress-up"].state, "shallow");
  assert.equal(perCategory["dress-up"].totalHits, 3);
  // sheet-metal: only shallow(1) -> "shallow"
  assert.equal(perCategory["sheet-metal"].state, "shallow");
  // generative: 0 -> "absent"
  assert.equal(perCategory["generative"].state, "absent");
  assert.equal(perCategory["generative"].totalHits, 0);
});

test("scoreCoverage: per-galaxy buckets", () => {
  const hits = {
    cad: { "sketch-additive": 7, "dress-up": 3 },
    "cad-fusion-live": { "sketch-additive": 2, "sheet-metal": 1 },
  };
  const { perGalaxy } = scoreCoverage(hits);
  assert.deepEqual(perGalaxy.cad.covered, ["sketch-additive"]);
  assert.deepEqual(perGalaxy.cad.shallow, ["dress-up"]);
  assert.equal(perGalaxy.cad.absentCount, CATEGORIES.length - 2);
  assert.deepEqual(perGalaxy["cad-fusion-live"].covered, []);
  assert.deepEqual(perGalaxy["cad-fusion-live"].shallow.sort(), ["sheet-metal", "sketch-additive"]);
  assert.equal(perGalaxy["cad-fusion-live"].absentCount, CATEGORIES.length - 2);
});

test("scoreCoverage: totals percentages + essential-gap detection", () => {
  const hits = {
    cad: { "sketch-additive": 7, "dress-up": 3 },          // covered, shallow
    "cad-fusion-live": { "sheet-metal": 1 },                // shallow
  };
  const { totals } = scoreCoverage(hits);
  assert.equal(totals.categories, CATEGORIES.length);
  assert.equal(totals.covered, 1);   // sketch-additive only
  assert.equal(totals.shallow, 2);   // dress-up + sheet-metal
  assert.equal(totals.absent, CATEGORIES.length - 3);
  // 1/24 = 4.2% ; (1+2)/24 = 12.5%
  assert.equal(totals.coveredPct, Math.round((1 / CATEGORIES.length) * 1000) / 10);
  assert.equal(totals.touchedPct, Math.round((3 / CATEGORIES.length) * 1000) / 10);
  // essential gaps = essential categories at union "absent". sketch-additive(covered), dress-up(shallow),
  // sheet-metal(shallow) are NOT gaps; every other essential bucket is.
  assert.equal(totals.essentialGaps.includes("sketch-additive"), false);
  assert.equal(totals.essentialGaps.includes("dress-up"), false);
  assert.equal(totals.essentialGaps.includes("sheet-metal"), false);
  assert.equal(totals.essentialGaps.includes("holes"), true);
  assert.equal(totals.essentialGaps.includes("sketch-subtractive"), true);
  assert.equal(totals.essentialGaps.length, ESSENTIAL_COUNT - 3);
});

test("scoreCoverage: adversarial empty/missing input -> all absent, no throw", () => {
  for (const bad of [{}, null, undefined]) {
    const { totals, perGalaxy } = scoreCoverage(bad);
    assert.equal(totals.covered, 0);
    assert.equal(totals.shallow, 0);
    assert.equal(totals.absent, CATEGORIES.length);
    assert.equal(totals.coveredPct, 0);
    assert.equal(totals.essentialGaps.length, ESSENTIAL_COUNT);
    assert.deepEqual(perGalaxy, {});
  }
});

test("scoreCoverage: non-numeric hit values coerce to 0 (no NaN leak)", () => {
  const { perCategory, totals } = scoreCoverage({ cad: { "sketch-additive": "lots", "dress-up": null } });
  assert.equal(perCategory["sketch-additive"].state, "absent");
  assert.equal(perCategory["sketch-additive"].totalHits, 0);
  assert.equal(Number.isNaN(totals.coveredPct), false);
});
