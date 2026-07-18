// generate-token-savings-pivot-features.test.mjs
// Pure tests for the generate() function — no FS, no merge step.

import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, TSP_ROOST_ID, PLANNED_PARENT, ROOST_LAYER, CHILD_LAYER } from "./generate-token-savings-pivot-features.mjs";

test("generate — empty sidecar: emits roost only with no-fires info", () => {
  const r = generate(null, []);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.totalFires, 0);
  assert.equal(r.stats.classifierChildren, 0);
  assert.equal(r.stats.toolChildren, 0);
  assert.equal(r.newNodes.length, 1);
  const roost = r.newNodes[0];
  assert.equal(roost.id, TSP_ROOST_ID);
  assert.equal(roost.parent, PLANNED_PARENT);
  assert.equal(roost.layer, ROOST_LAYER);
  assert.equal(roost.kind, "ghost-roost");
  assert.match(roost.info, /no fires recorded yet/);
});

test("generate — sidecar with fires: roost + per-classifier + per-tool children", () => {
  const sidecar = {
    totalFires: 5,
    byClassifier: { isBroadGrep: 1, isVerboseBash: 2, isLargeRead: 1, isBroadGlob: 1 },
    byToolName: { Grep: 1, Bash: 2, Read: 1, Glob: 1 },
  };
  const r = generate(sidecar, []);
  assert.equal(r.stats.roostEmitted, 1);
  assert.equal(r.stats.totalFires, 5);
  assert.equal(r.stats.classifierChildren, 4);
  assert.equal(r.stats.toolChildren, 4);
  assert.equal(r.newNodes.length, 1 + 4 + 4);

  const classifierNode = r.newNodes.find(n => n.id === "tsp.classifier.isVerboseBash");
  assert.ok(classifierNode);
  assert.equal(classifierNode.parent, TSP_ROOST_ID);
  assert.equal(classifierNode.layer, CHILD_LAYER);
  assert.equal(classifierNode.kind, "tsp-classifier");
  assert.match(classifierNode.label, /isVerboseBash \(2 fires\)/);

  const toolNode = r.newNodes.find(n => n.id === "tsp.tool.Bash");
  assert.ok(toolNode);
  assert.equal(toolNode.kind, "tsp-tool");
  assert.match(toolNode.label, /Bash \(2 fires\)/);
});

test("generate — existing roost id: skipped, only children emitted", () => {
  const sidecar = { totalFires: 1, byClassifier: { isBroadGrep: 1 }, byToolName: { Grep: 1 } };
  const r = generate(sidecar, [TSP_ROOST_ID]);
  assert.equal(r.stats.roostEmitted, 0);
  assert.equal(r.stats.classifierChildren, 1);
  assert.equal(r.stats.toolChildren, 1);
  assert.equal(r.newNodes.length, 2); // no roost, just children
});

test("generate — existing classifier id: skipped", () => {
  const sidecar = { totalFires: 2, byClassifier: { isBroadGrep: 1, isLargeRead: 1 }, byToolName: {} };
  const r = generate(sidecar, ["tsp.classifier.isBroadGrep"]);
  assert.equal(r.stats.classifierChildren, 1);
  const ids = r.newNodes.map(n => n.id);
  assert.ok(!ids.includes("tsp.classifier.isBroadGrep"));
  assert.ok(ids.includes("tsp.classifier.isLargeRead"));
});

test("generate — sidecar with non-object byClassifier: fail-soft", () => {
  const sidecar = { totalFires: 5, byClassifier: null, byToolName: "broken" };
  const r = generate(sidecar, []);
  assert.equal(r.stats.classifierChildren, 0);
  assert.equal(r.stats.toolChildren, 0);
  assert.equal(r.stats.roostEmitted, 1);
});

test("generate — children sorted by fire count desc", () => {
  const sidecar = {
    totalFires: 10,
    byClassifier: { isBroadGrep: 1, isVerboseBash: 5, isLargeRead: 3 },
    byToolName: {},
  };
  const r = generate(sidecar, []);
  const classifierLabels = r.newNodes.filter(n => n.kind === "tsp-classifier").map(n => n.label);
  assert.match(classifierLabels[0], /isVerboseBash \(5/);
  assert.match(classifierLabels[1], /isLargeRead \(3/);
  assert.match(classifierLabels[2], /isBroadGrep \(1/);
});

test("generate — Set existingNodeIds is accepted (matches misc-tasks pattern)", () => {
  const sidecar = { totalFires: 1, byClassifier: { isBroadGrep: 1 }, byToolName: {} };
  const r = generate(sidecar, new Set([TSP_ROOST_ID]));
  assert.equal(r.stats.roostEmitted, 0);
  assert.equal(r.stats.classifierChildren, 1);
});
