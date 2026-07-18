/**
 * Tests for cad-geometric-embedding.mjs (slot:delta, U-CAD-GEOMETRIC-EMBEDDING-BACKEND core).
 * Reference-value + intent asserts (R9): the load-bearing test is the SEPARATION property -- same-archetype
 * parts must be MORE cosine-similar than cross-archetype parts, and mean recall@1 must be perfect on
 * well-separated archetypes. A featurizer that regressed to a constant (or lost the surface histogram)
 * would pass "vector has length 16" but FAIL these. Synthetic bundles mirror the real reference corpus:
 * freeform rotors (blisk/impeller, B_SPLINE_SURFACE-dominant), prismatic blocks (cubes, plane-only),
 * cylindrical shafts (CYLINDRICAL_SURFACE-dominant, elongated).
 *   run: node --test scripts/lib/cad-geometric-embedding.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  geometricFeatureVector,
  cosineSim,
  recallAtK,
  meanRecallAtK,
  GEOM_FEATURE_DIM,
  SURFACE_KINDS,
} from "./cad-geometric-embedding.mjs";

const ALL_KINDS = SURFACE_KINDS;
/** Build a raw geometric bundle from dims + a partial surface-kind map (+ optional radii). */
function bundle(dims, kinds, radii = []) {
  const surfaceKinds = Object.fromEntries(ALL_KINDS.map((k) => [k, kinds[k] || 0]));
  const totalSurfaces = Object.values(surfaceKinds).reduce((a, b) => a + b, 0);
  const curvedSurfaceCount = ALL_KINDS.filter((k) => k !== "plane").reduce((a, k) => a + surfaceKinds[k], 0);
  const sorted = [...dims].sort((a, b) => b - a);
  const rad = [...radii].filter((r) => r > 0).sort((a, b) => a - b);
  return {
    dims: sorted, maxExtentMm: sorted[0], surfaceKinds, totalSurfaces, curvedSurfaceCount,
    radiiMm: rad, medianRadiusMm: rad.length ? rad[Math.floor((rad.length - 1) / 2)] : 0,
  };
}

// Real reference-corpus archetypes (dims/entity counts from CADGeometryComparisonEngine.reference-parts).
const BLISK = bundle([1206.9, 1206.9, 310], { bspline: 328, toroidal: 10, cylindrical: 5, plane: 2 });
const IMPELLER = bundle([763, 290, 290], { bspline: 405, cylindrical: 8, plane: 4 });
const CUBE_50 = bundle([50, 50, 50], { plane: 6 });
const CUBE_80 = bundle([80, 80, 80], { plane: 6 });
const SHAFT_100 = bundle([100, 20, 20], { cylindrical: 1, plane: 2 }, [10]);
const SHAFT_80 = bundle([80, 16, 16], { cylindrical: 1, plane: 2 }, [8]);

const LABELED = [
  { label: "freeform", vec: geometricFeatureVector(BLISK) },
  { label: "freeform", vec: geometricFeatureVector(IMPELLER) },
  { label: "prismatic", vec: geometricFeatureVector(CUBE_50) },
  { label: "prismatic", vec: geometricFeatureVector(CUBE_80) },
  { label: "cylindrical", vec: geometricFeatureVector(SHAFT_100) },
  { label: "cylindrical", vec: geometricFeatureVector(SHAFT_80) },
];

test("vector: fixed dim, all components finite and in [0,1], deterministic", () => {
  const v = geometricFeatureVector(BLISK);
  assert.equal(v.length, GEOM_FEATURE_DIM);
  for (const x of v) { assert.ok(Number.isFinite(x), "no NaN/Infinity"); assert.ok(x >= 0 && x <= 1, `component in [0,1]: ${x}`); }
  const v2 = geometricFeatureVector(BLISK);
  assert.deepEqual(Array.from(v), Array.from(v2), "same bundle -> identical vector (deterministic)");
});

test("edge: empty/degenerate bundle -> all-finite vector, cosine with it is 0 (never NaN)", () => {
  const zero = geometricFeatureVector({});
  assert.equal(zero.length, GEOM_FEATURE_DIM);
  for (const x of zero) assert.ok(Number.isFinite(x));
  assert.equal(cosineSim(zero, geometricFeatureVector(BLISK)), 0, "zero-norm vector -> cosine 0, not NaN");
});

test("SEPARATION (R9 intent): same-archetype cosine > cross-archetype cosine", () => {
  const blisk = geometricFeatureVector(BLISK), impeller = geometricFeatureVector(IMPELLER);
  const cube50 = geometricFeatureVector(CUBE_50), cube80 = geometricFeatureVector(CUBE_80);
  const shaft100 = geometricFeatureVector(SHAFT_100), shaft80 = geometricFeatureVector(SHAFT_80);
  // freeform rotors cluster: blisk~impeller beats blisk~(cube|shaft)
  assert.ok(cosineSim(blisk, impeller) > cosineSim(blisk, cube50), "blisk closer to impeller than to a cube");
  assert.ok(cosineSim(blisk, impeller) > cosineSim(blisk, shaft100), "blisk closer to impeller than to a shaft");
  // prismatic cubes cluster: cube~cube beats cube~(rotor|shaft)
  assert.ok(cosineSim(cube50, cube80) > cosineSim(cube50, blisk), "cube closer to cube than to a rotor");
  assert.ok(cosineSim(cube50, cube80) > cosineSim(cube50, shaft100), "cube closer to cube than to a shaft");
  // cylindrical shafts cluster: shaft~shaft beats shaft~(rotor|cube)
  assert.ok(cosineSim(shaft100, shaft80) > cosineSim(shaft100, blisk), "shaft closer to shaft than to a rotor");
  assert.ok(cosineSim(shaft100, shaft80) > cosineSim(shaft100, cube50), "shaft closer to shaft than to a cube");
});

test("recall@1: every part's nearest neighbor shares its archetype (mean recall@1 == 1.0)", () => {
  assert.equal(meanRecallAtK(LABELED, 1), 1.0, "perfect nearest-neighbor archetype retrieval");
  // a hash-of-tokens backend (the thing this replaces) would score ~chance here.
});

test("recall@k: query blisk -> its top-1 is the other freeform rotor", () => {
  const r = recallAtK(LABELED, 0, 1); // index 0 = blisk
  assert.equal(r, 1.0, "blisk's nearest is impeller (freeform)");
});

test("cosineSim: guards + basic correctness", () => {
  assert.equal(cosineSim(null, [1]), 0);
  assert.equal(cosineSim([1, 0], [1, 0]), 1, "identical unit vectors -> 1");
  assert.ok(Math.abs(cosineSim([1, 0], [0, 1])) < 1e-9, "orthogonal -> 0");
  assert.equal(cosineSim([0, 0], [1, 1]), 0, "zero norm -> 0, not NaN");
});

test("string input path: geometricFeatureVector accepts STEP text (reuses extractors)", () => {
  // minimal plane-only STEP with 2 vertex-referenced points + a PLANE -> prismatic, non-degenerate.
  const stepText = [
    "ISO-10303-21;", "DATA;",
    "#1=(LENGTH_UNIT()NAMED_UNIT(*)SI_UNIT(.MILLI.,.METRE.));",
    "#10=CARTESIAN_POINT('',(0.,0.,0.));", "#11=CARTESIAN_POINT('',(10.,20.,30.));",
    "#20=VERTEX_POINT('',#10);", "#21=VERTEX_POINT('',#11);",
    "#30=PLANE('',#40);",
    "ENDSEC;", "END-ISO-10303-21;",
  ].join("\n");
  const v = geometricFeatureVector(stepText);
  assert.equal(v.length, GEOM_FEATURE_DIM);
  assert.ok(v[4] > 0, "plane fraction > 0 (a plane entity was parsed)");
  for (const x of v) assert.ok(Number.isFinite(x));
});
