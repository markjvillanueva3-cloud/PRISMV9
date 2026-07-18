#!/usr/bin/env node
/**
 * generate-cadcam-training-corpus-features.test.mjs — pure-fn tests.
 * Run: node --test scripts/generate-cadcam-training-corpus-features.test.mjs
 */
import { test } from "node:test";
import { strict as assert } from "node:assert";
import {
  generate, SCHEMA_VERSION,
  ROOST_ID, CAD_PIVOT_ID, CAM_PIVOT_ID, PLANNED_PARENT,
  ROOST_LAYER, PIVOT_LAYER, SOURCE_LAYER, MAX_LABEL,
} from "./generate-cadcam-training-corpus-features.mjs";

const sampleCorpus = {
  cad: [
    { slug: "drawing_a", id: "x/a.pdf", kind: "blueprint-pdf", source_type: "pdf" },
    { slug: "drawing_b", id: "x/b.pdf", kind: "blueprint-pdf", source_type: "pdf" },
  ],
  cam: [
    { slug: "catalog_c", id: "y/c.pdf", kind: "resource-catalog", source_type: "pdf" },
    { slug: "course_d",  id: "z/d",     kind: "mit-ocw",         source_type: "course" },
    { slug: "manual_e",  id: "y/e.pdf", kind: "manual-pdf",      source_type: "pdf" },
  ],
};

test("generate emits roost + both pivots + one leaf per cad/cam entry", () => {
  const { newNodes, stats } = generate(sampleCorpus, []);
  // 1 roost + 2 pivots + 2 cad leaves + 3 cam leaves = 8
  assert.equal(newNodes.length, 8);
  assert.equal(stats.roostEmitted, 1);
  assert.equal(stats.cadPivotEmitted, 1);
  assert.equal(stats.camPivotEmitted, 1);
  assert.equal(stats.leavesEmitted, 5);
  assert.equal(stats.leavesSkipped, 0);
  assert.equal(stats.cadEntries, 2);
  assert.equal(stats.camEntries, 3);
});

test("roost parents to ghost.planned_features at L8", () => {
  const { newNodes } = generate(sampleCorpus, []);
  const roost = newNodes.find(n => n.id === ROOST_ID);
  assert.ok(roost);
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, ROOST_LAYER);
  assert.equal(roost.kind, "ghost-roost");
  assert.equal(roost.ghost, true);
});

test("cad pivot parents to roost; cam pivot parents to roost", () => {
  const { newNodes } = generate(sampleCorpus, []);
  const cadPivot = newNodes.find(n => n.id === CAD_PIVOT_ID);
  const camPivot = newNodes.find(n => n.id === CAM_PIVOT_ID);
  assert.equal(cadPivot.parent, ROOST_ID);
  assert.equal(camPivot.parent, ROOST_ID);
  assert.equal(cadPivot.layer, PIVOT_LAYER);
  assert.equal(camPivot.layer, PIVOT_LAYER);
});

test("cad leaves parent to cad pivot; cam leaves parent to cam pivot", () => {
  const { newNodes } = generate(sampleCorpus, []);
  const cadLeaves = newNodes.filter(n => n.kind === "training-source" && n.parent === CAD_PIVOT_ID);
  const camLeaves = newNodes.filter(n => n.kind === "training-source" && n.parent === CAM_PIVOT_ID);
  assert.equal(cadLeaves.length, 2);
  assert.equal(camLeaves.length, 3);
  for (const n of [...cadLeaves, ...camLeaves]) assert.equal(n.layer, SOURCE_LAYER);
});

test("leaf info encodes audience routing (cad→delta, cam→kilo)", () => {
  const { newNodes } = generate(sampleCorpus, []);
  const cadLeaf = newNodes.find(n => n.id === "training-source.cad.drawing_a");
  const camLeaf = newNodes.find(n => n.id === "training-source.cam.catalog_c");
  assert.match(cadLeaf.info, /→delta/);
  assert.match(camLeaf.info, /→kilo/);
});

test("existing-id set suppresses re-emission (idempotency)", () => {
  const seeded = new Set([ROOST_ID, CAD_PIVOT_ID, CAM_PIVOT_ID,
    "training-source.cad.drawing_a", "training-source.cam.catalog_c"]);
  const { newNodes, stats } = generate(sampleCorpus, seeded);
  // 2 cad leaves - 1 already-seen = 1; 3 cam leaves - 1 already-seen = 2; total 3
  assert.equal(newNodes.length, 3);
  assert.equal(stats.roostEmitted, 0);
  assert.equal(stats.cadPivotEmitted, 0);
  assert.equal(stats.camPivotEmitted, 0);
  assert.equal(stats.leavesEmitted, 3);
  assert.equal(stats.leavesSkipped, 2);
});

test("handles empty corpus without crashing", () => {
  const { newNodes, stats } = generate({ cad: [], cam: [] }, []);
  // Still emits the 3 ghost-roost scaffolding nodes (roost + 2 pivots)
  assert.equal(newNodes.length, 3);
  assert.equal(stats.leavesEmitted, 0);
  assert.equal(stats.cadEntries, 0);
  assert.equal(stats.camEntries, 0);
});

test("handles malformed corpus (null/missing arrays) without crashing", () => {
  const r1 = generate({}, []);
  const r2 = generate(null, []);
  const r3 = generate({ cad: null, cam: undefined }, []);
  for (const r of [r1, r2, r3]) {
    assert.equal(r.stats.cadEntries, 0);
    assert.equal(r.stats.camEntries, 0);
    assert.equal(r.newNodes.length, 3); // scaffolding only
  }
});

test("label is truncated to MAX_LABEL", () => {
  const longSlug = "x".repeat(200);
  const { newNodes } = generate({ cad: [{ slug: longSlug, id: "x", kind: "blueprint-pdf", source_type: "pdf" }], cam: [] }, []);
  const leaf = newNodes.find(n => n.kind === "training-source");
  assert.ok(leaf.label.length <= MAX_LABEL);
});

test("Set vs Array existingNodeIds both work", () => {
  const r1 = generate(sampleCorpus, [ROOST_ID]);
  const r2 = generate(sampleCorpus, new Set([ROOST_ID]));
  assert.equal(r1.stats.roostEmitted, 0);
  assert.equal(r2.stats.roostEmitted, 0);
  // Both still emit pivots + leaves
  assert.equal(r1.newNodes.length, r2.newNodes.length);
});

test("SCHEMA_VERSION is semver-like", () => {
  assert.match(SCHEMA_VERSION, /^\d+\.\d+\.\d+$/);
});

test("newEdges array is present (empty by design — parent links carry hierarchy)", () => {
  const { newEdges } = generate(sampleCorpus, []);
  assert.ok(Array.isArray(newEdges));
  assert.equal(newEdges.length, 0);
});

test("leaf info includes kind + source_type", () => {
  const { newNodes } = generate(sampleCorpus, []);
  const courseLeaf = newNodes.find(n => n.id === "training-source.cam.course_d");
  assert.match(courseLeaf.info, /mit-ocw/);
  assert.match(courseLeaf.info, /course/);
});

test("pivot labels show entry count", () => {
  const { newNodes } = generate(sampleCorpus, []);
  const cadPivot = newNodes.find(n => n.id === CAD_PIVOT_ID);
  const camPivot = newNodes.find(n => n.id === CAM_PIVOT_ID);
  assert.match(cadPivot.label, /\(2\)/);
  assert.match(camPivot.label, /\(3\)/);
});

test("re-running with the same idsSet is byte-stable for newNodes", () => {
  const r1 = generate(sampleCorpus, []);
  const r2 = generate(sampleCorpus, []);
  assert.deepEqual(r1.newNodes, r2.newNodes);
});
