/**
 * Tests for cad-geometric-corpus-report.mjs (slot:delta, U-CAD-GEOMEMBED-COHERENCE). Hermetic.
 * Intent asserts (R9): the SEPARATION number must be large for orthogonal archetype clusters and ~0 for
 * overlapping ones -- i.e. it must actually measure whether the featurizer discriminates, not return a
 * constant. A hash-backend corpus would score separation ~0 here.
 *   run: node --test scripts/cad-geometric-corpus-report.test.mjs
 */
import test from "node:test";
import assert from "node:assert/strict";
import { centroid, corpusCoherence } from "./cad-geometric-corpus-report.mjs";

test("centroid: mean vector; empty -> null", () => {
  assert.deepEqual(centroid([[1, 2], [3, 4]]), [2, 3]);
  assert.deepEqual(centroid([[2, 0, 4], [0, 4, 0]]), [1, 2, 2]);
  assert.equal(centroid([]), null);
  assert.equal(centroid("nope"), null);
});

test("corpusCoherence: orthogonal archetype clusters -> high cohesion, low inter, high separation", () => {
  const rows = [
    { geometryClass: "freeform", vector: [1, 0, 0] },
    { geometryClass: "freeform", vector: [0.95, 0.05, 0] },
    { geometryClass: "prismatic", vector: [0, 0, 1] },
    { geometryClass: "prismatic", vector: [0, 0.05, 0.95] },
  ];
  const rep = corpusCoherence(rows);
  assert.equal(rep.totalParts, 4);
  assert.equal(rep.classCount, 2);
  assert.equal(rep.byClass.freeform.count, 2);
  assert.equal(rep.byClass.prismatic.count, 2);
  assert.ok(rep.byClass.freeform.cohesion > 0.99, "tight cluster -> cohesion ~1");
  assert.ok(rep.meanInterClassSim < 0.1, "orthogonal centroids -> low inter-class sim");
  assert.ok(rep.separation > 0.8, "well-separated archetypes -> high separation");
  assert.equal(rep.recallAt1, 1.0, "each part's nearest neighbour is same-class -> perfect recall@1 (the true signal)");
});

test("corpusCoherence: overlapping classes -> separation ~0 (the not-discriminating signal)", () => {
  const rows = [
    { geometryClass: "a", vector: [1, 0] }, { geometryClass: "a", vector: [0.99, 0.01] },
    { geometryClass: "b", vector: [0.99, 0.02] }, { geometryClass: "b", vector: [0.98, 0.03] },
  ];
  assert.ok(corpusCoherence(rows).separation < 0.05, "near-identical centroids -> ~0 separation");
});

test("corpusCoherence: single class -> no inter-class pairs, separation = cohesion", () => {
  const rep = corpusCoherence([{ geometryClass: "x", vector: [1, 0] }, { geometryClass: "x", vector: [0, 1] }]);
  assert.equal(rep.classCount, 1);
  assert.equal(rep.meanInterClassSim, 0, "one class -> no inter-class pair");
  assert.equal(rep.separation, rep.meanCohesion, "separation collapses to cohesion");
});

test("corpusCoherence: empty / vectorless -> zeros, no throw", () => {
  const empty = corpusCoherence([]);
  assert.equal(empty.totalParts, 0);
  assert.equal(empty.separation, 0);
  assert.equal(empty.recallAt1, 0, "no parts -> recall 0, no throw");
  assert.equal(corpusCoherence([{ geometryClass: "a" }]).totalParts, 0, "vectorless rows filtered out");
});
