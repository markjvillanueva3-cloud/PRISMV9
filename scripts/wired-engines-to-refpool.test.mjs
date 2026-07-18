// Tests for wired-engines-to-refpool.mjs (U-GNN-CODEBASE-WIRED-REFPOOL, slot:india).
// Pure-function coverage: extractWiredEngines (single/multi/invalid/empty), node shape,
// and the heap-reexec guard. Run directly: `node scripts/wired-engines-to-refpool.test.mjs`.
import { test } from "node:test";
import assert from "node:assert/strict";

import {
  extractWiredEngines,
  buildGhostFromWiredEngine,
  shouldReexecForHeap,
} from "./wired-engines-to-refpool.mjs";

test("extractWiredEngines -- single-dispatcher engine is an unambiguous ground-truth label", () => {
  const map = new Map([
    ["DrillingForceEngine", new Set(["prism_calc"])],
    ["ToolpathStrategyEngine", new Set(["prism_cam"])],
  ]);
  const { wirings, conflicts } = extractWiredEngines(map);
  assert.equal(conflicts.length, 0);
  assert.deepEqual(wirings, [
    { engine: "DrillingForceEngine", dispatcher: "prism_calc" },
    { engine: "ToolpathStrategyEngine", dispatcher: "prism_cam" },
  ], "both single-dispatcher engines emitted, sorted by name");
});

test("extractWiredEngines -- a MULTI-dispatcher engine is a conflict, NOT emitted (R12 no ambiguous label)", () => {
  const map = new Map([
    ["SharedPhysicsEngine", new Set(["prism_calc", "prism_safety"])],
    ["SoloEngine", new Set(["prism_ai"])],
  ]);
  const { wirings, conflicts } = extractWiredEngines(map);
  assert.deepEqual(wirings, [{ engine: "SoloEngine", dispatcher: "prism_ai" }], "only the single-dispatcher engine is a label");
  assert.equal(conflicts.length, 1);
  assert.equal(conflicts[0].engine, "SharedPhysicsEngine");
  assert.deepEqual(conflicts[0].dispatchers, ["prism_calc", "prism_safety"], "conflict records both dispatchers, sorted");
});

test("extractWiredEngines -- a syntactically-invalid (non-prism_) dispatcher namespace is filtered out", () => {
  // isValidDispatcher is a SYNTAX gate (any prism_* name passes); in real use every namespace
  // comes from dispatcherFileToNamespace (real dispatcher files), so the filter only drops
  // non-prism_ junk. These use clearly non-prism strings to exercise that guard.
  const map = new Map([
    ["BogusEngine", new Set(["not-a-dispatcher"])],
    ["RealEngine", new Set(["prism_calc"])],
    // an engine whose ONLY dispatchers are invalid -> dropped entirely (length 0 after filter)
    ["AllBogusEngine", new Set(["nope", "alsonope"])],
  ]);
  const { wirings, conflicts } = extractWiredEngines(map);
  assert.deepEqual(wirings, [{ engine: "RealEngine", dispatcher: "prism_calc" }]);
  assert.equal(conflicts.length, 0, "an all-invalid engine is dropped, not a conflict");
});

test("extractWiredEngines -- a valid+invalid mix collapses to the single VALID dispatcher (not a conflict)", () => {
  const map = new Map([["MixEngine", new Set(["prism_calc", "bogus"])]]);
  const { wirings, conflicts } = extractWiredEngines(map);
  assert.deepEqual(wirings, [{ engine: "MixEngine", dispatcher: "prism_calc" }], "invalid filtered -> 1 valid -> unambiguous label");
  assert.equal(conflicts.length, 0);
});

test("extractWiredEngines -- empty / null / non-Map inputs return empty (fail-soft)", () => {
  assert.deepEqual(extractWiredEngines(new Map()), { wirings: [], conflicts: [] });
  assert.deepEqual(extractWiredEngines(null), { wirings: [], conflicts: [] });
  assert.deepEqual(extractWiredEngines({}), { wirings: [], conflicts: [] }, "plain object (no .entries) -> empty");
  // blank engine name is skipped
  assert.deepEqual(extractWiredEngines(new Map([["   ", new Set(["prism_calc"])]])).wirings, []);
});

test("buildGhostFromWiredEngine -- node carries the codebase-wired id namespace, confidence 1.0, and a valid edge", () => {
  const { node, edge } = buildGhostFromWiredEngine({ engine: "DrillingForceEngine", dispatcher: "prism_calc" });
  assert.equal(node.id, "ghost.codebase-wired.DrillingForceEngine", "distinct id namespace (no collision with outcome/vault feeders)");
  assert.equal(node.label, "DrillingForceEngine");
  assert.equal(node.kind, "ghost.unwired-engine", "same reference kind the eval buildHoldout selects");
  assert.equal(node.proposed_wiring, "prism_calc");
  assert.equal(node.confidence, 1.0, "literal import = strongest ground truth, above the 0.8 ref gate");
  assert.equal(node.proposed_by, "wired-engines-to-refpool.mjs");
  assert.equal(node.source, "dispatcher-imports");
  assert.equal(node.ghost, true);
  assert.equal(edge.from, node.id);
  assert.equal(edge.relation, "proposed-wire");
  assert.equal(edge.intensity, 1.0);
  assert.ok(typeof edge.to === "string" && edge.to.length > 0, "edge resolves to a dispatcher node id");
});

test("shouldReexecForHeap -- only the graph-loading modes re-exec, and env/flag opt-outs win", () => {
  assert.equal(shouldReexecForHeap(["--apply"]), true, "--apply loads the graph -> bump heap");
  assert.equal(shouldReexecForHeap(["--revert"]), true, "--revert loads the graph -> bump heap");
  assert.equal(shouldReexecForHeap([]), false, "dry-run never loads the graph");
  assert.equal(shouldReexecForHeap(["--json"]), false, "json dry-run never loads the graph");
  assert.equal(shouldReexecForHeap(["--apply"], { PRISM_WIRED_REFPOOL_REEXEC: "1" }), false, "already re-exec'd -> don't loop");
  assert.equal(shouldReexecForHeap(["--apply"], { PRISM_WIRED_REFPOOL_NO_REEXEC: "1" }), false, "explicit opt-out");
  assert.equal(shouldReexecForHeap(["--apply"], {}, ["--max-old-space-size=8192"]), false, "heap flag already present -> skip redundant re-exec");
});
