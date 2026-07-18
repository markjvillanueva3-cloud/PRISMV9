/**
 * Tests for cad-geometric-retrieve.mjs (slot:delta, U-CAD-GEOMEMBED-RETRIEVE). Hermetic (no filesystem).
 * Intent asserts (R9): retrieval must RANK by geometric similarity (nearest first) and an out-of-corpus
 * query part must retrieve same-archetype corpus parts -- the actual "find precedents for a new part"
 * capability, not just a self-recall echo.
 *   run: node --test scripts/cad-geometric-retrieve.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { loadIndex, retrieve, retrieveByStepText, recallAtKOverIndex, precedentCheck, defaultIndexPath } from "./cad-geometric-retrieve.mjs";
import { geometricFeatureVector, meanRecallAtK } from "./lib/cad-geometric-embedding.mjs";

const MM = "#1=( LENGTH_UNIT() NAMED_UNIT(*) SI_UNIT(.MILLI.,.METRE.) );";
const freeformStep = (h) => [
  "ISO-10303-21;", "DATA;", MM,
  "#10=CARTESIAN_POINT('',(0.,0.,0.));", `#11=CARTESIAN_POINT('',(${h}.,50.,50.));`,
  "#20=VERTEX_POINT('',#10);", "#21=VERTEX_POINT('',#11);",
  "#40=B_SPLINE_SURFACE_WITH_KNOTS('',(#1),.UNSPECIFIED.);", "#41=B_SPLINE_SURFACE_WITH_KNOTS('',(#2),.UNSPECIFIED.);",
  "#42=TOROIDAL_SURFACE('',#50,5.,1.);", "ENDSEC;",
].join("\n");
const prismaticStep = [
  "ISO-10303-21;", "DATA;", MM,
  "#10=CARTESIAN_POINT('',(0.,0.,0.));", "#11=CARTESIAN_POINT('',(50.,50.,50.));",
  "#20=VERTEX_POINT('',#10);", "#21=VERTEX_POINT('',#11);",
  "#40=PLANE('',#50);", "#41=PLANE('',#51);", "#42=PLANE('',#52);", "ENDSEC;",
].join("\n");

test("loadIndex: parses jsonl rows, skips torn lines + vectorless rows (fail-soft)", () => {
  const jsonl = [
    JSON.stringify({ path: "a.step", geometryClass: "freeform", vector: [1, 0, 0] }),
    "{ torn",
    JSON.stringify({ path: "b.step", geometryClass: "prismatic" }), // no vector -> skipped
    JSON.stringify({ path: "c.step", geometryClass: "curved", vector: [0, 1, 0] }),
  ].join("\n");
  const rows = loadIndex("x.jsonl", { readFileImpl: () => jsonl });
  assert.equal(rows.length, 2, "a + c (b has no vector, torn line dropped)");
  assert.deepEqual(rows.map((r) => r.path), ["a.step", "c.step"]);
});

test("retrieve: ranks by cosine desc, honors k, excludes the query's own path", () => {
  const idx = [
    { path: "a.step", geometryClass: "freeform", vector: [1, 0, 0] },
    { path: "b.step", geometryClass: "freeform", vector: [0.9, 0.1, 0] },
    { path: "c.step", geometryClass: "prismatic", vector: [0, 0, 1] },
  ];
  const hits = retrieve([1, 0, 0], idx, 2);
  assert.equal(hits.length, 2);
  assert.equal(hits[0].path, "a.step", "exact match ranks first");
  assert.equal(hits[1].path, "b.step", "near match second, prismatic last");
  const excl = retrieve([1, 0, 0], idx, 2, { excludePath: "a.step" });
  assert.equal(excl[0].path, "b.step", "self excluded -> nearest OTHER is b");
});

test("retrieveByStepText: a NEW freeform part retrieves the freeform corpus part over the prismatic one", () => {
  // index built from REAL featurized parts (one freeform, one prismatic)
  const index = [
    { path: "corpus-freeform.step", geometryClass: "freeform", vector: Array.from(geometricFeatureVector(freeformStep(100))) },
    { path: "corpus-prismatic.step", geometryClass: "prismatic", vector: Array.from(geometricFeatureVector(prismaticStep)) },
  ];
  const hits = retrieveByStepText(freeformStep(120), index, 2); // query: a DIFFERENT freeform part
  assert.equal(hits[0].geometryClass, "freeform", "new freeform part -> nearest corpus part is freeform");
  assert.ok(hits[0].sim > hits[1].sim, "freeform corpus part is strictly more similar than the prismatic one");
});

test("recallAtKOverIndex: equals meanRecallAtK on the labeled set", () => {
  const idx = [
    { path: "a", geometryClass: "freeform", vector: [1, 0] },
    { path: "b", geometryClass: "freeform", vector: [0.9, 0.1] },
    { path: "c", geometryClass: "prismatic", vector: [0, 1] },
    { path: "d", geometryClass: "prismatic", vector: [0.1, 0.9] },
  ];
  const direct = meanRecallAtK(idx.map((r) => ({ label: r.geometryClass, vec: r.vector })), 1);
  assert.equal(recallAtKOverIndex(idx, 1), direct);
  assert.equal(recallAtKOverIndex(idx, 1), 1.0, "well-separated 2-class set -> perfect recall@1");
});

test("retrieve: empty index / k<=0 -> empty (no throw)", () => {
  assert.deepEqual(retrieve([1, 0], [], 5), []);
  assert.deepEqual(retrieve([1, 0], [{ path: "a", vector: [1, 0] }], 0), []);
});

test("precedentCheck: a generated freeform part -> predictedClass freeform, not outlier, topK ranked", () => {
  const index = [
    { path: "c-free1.step", geometryClass: "freeform", vector: Array.from(geometricFeatureVector(freeformStep(100))) },
    { path: "c-free2.step", geometryClass: "freeform", vector: Array.from(geometricFeatureVector(freeformStep(150))) },
    { path: "c-prism.step", geometryClass: "prismatic", vector: Array.from(geometricFeatureVector(prismaticStep)) },
  ];
  const pc = precedentCheck(freeformStep(120), index, 3);
  assert.equal(pc.applicable, true);
  assert.equal(pc.predictedClass, "freeform", "majority of top-3 are freeform");
  assert.equal(pc.nearestClass, "freeform");
  assert.equal(pc.isOutlier, false, "high similarity to a corpus part -> not an outlier");
  assert.equal(pc.topK.length, 3);
  assert.ok(pc.topK[0].sim >= pc.topK[1].sim, "topK is ranked");
});

test("precedentCheck: outlier flag respects the threshold", () => {
  const index = [{ path: "a.step", geometryClass: "freeform", vector: Array.from(geometricFeatureVector(freeformStep(100))) }];
  assert.equal(precedentCheck(freeformStep(100), index, 1, { outlierThreshold: 1.1 }).isOutlier, true, "threshold above max sim -> outlier");
  assert.equal(precedentCheck(freeformStep(100), index, 1, { outlierThreshold: 0 }).isOutlier, false, "threshold 0 -> never outlier");
});

test("precedentCheck: empty index -> applicable false (no throw)", () => {
  assert.equal(precedentCheck(freeformStep(100), [], 5).applicable, false);
});

test("defaultIndexPath: returns a .jsonl path (full-corpus preferred, ref fallback)", () => {
  const p = defaultIndexPath();
  assert.ok(typeof p === "string" && p.endsWith(".jsonl"), "resolves to an index jsonl path");
});
