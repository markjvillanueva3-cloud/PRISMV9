/*
 * Tests for generate-cad-completion-augmentation.mjs (PA4-VIZ-CAD-GRAPH-UPDATE, slot:delta).
 * Hermetic: pure generate() with fixture graph + status, NO fs/git/graph-load (R9). Run the file
 * directly (node:test auto-runs on exit); `node --test <file>` ran 0 tests in this env (2026-06-17 note).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { generate, unitNodeId, unitColor } from "./generate-cad-completion-augmentation.mjs";

const emptyGraph = { nodes: [] };
// a realistic 3-unit slice: a shipped engine unit, an operator-gated merge, and the pending criticalNext
const status = (over = {}) => ({
  generated: "2026-06-26T00:00:00Z",
  shipped: 1, total: 3, criticalNext: "U-CAD-NURBS-STEP-EMIT", terminalDone: false,
  gates: { T1: "PENDING", T2: "PENDING", T3: "PENDING" },
  results: [
    { id: "U-MERGE-SLOT-DELTA", phase: "A", gate: null, op: true, title: "merge slot/delta", state: "PENDING", evidence: "432 ahead" },
    { id: "U-CAD-NURBS-STEP-EMIT", phase: "A", gate: null, title: "headless NURBS STEP emit", state: "PENDING", evidence: "no commit" },
    { id: "U-CAD-BOOLEAN", phase: "C", gate: null, title: "boolean", state: "SHIPPED", evidence: "engine on disk" },
  ],
  ...over,
});

test("unitNodeId: slugifies under the roost; null/empty safe", () => {
  assert.equal(unitNodeId("U-CAD-NURBS-STEP-EMIT"), "ghost.cad_completion.u-cad-nurbs-step-emit");
  assert.equal(unitNodeId(null), "ghost.cad_completion.");
  assert.equal(unitNodeId("U-CAD--WEIRD__id!!"), "ghost.cad_completion.u-cad-weird__id");
});

test("unitColor: shipped=green, op-gated=blue, plain-pending=amber", () => {
  assert.equal(unitColor({ state: "SHIPPED" }), "#22c55e");
  assert.equal(unitColor({ state: "PENDING", op: true }), "#3b82f6");
  assert.equal(unitColor({ state: "PENDING" }), "#f59e0b");
});

test("generate: happy path -> roost + per-unit nodes + critical-path edges (intent)", () => {
  const a = generate({ graph: emptyGraph, status: status() });
  assert.equal(a.error, undefined);
  // roost present
  const roost = a.newNodes.find((n) => n.id === "ghost.cad_completion");
  assert.ok(roost, "roost node emitted");
  assert.equal(roost.kind, "ghost-roost");
  assert.match(roost.label, /1\/3 shipped/);
  // one node per unit, parented to the roost
  const units = a.newNodes.filter((n) => n.kind === "cad-completion-unit");
  assert.equal(units.length, 3);
  for (const u of units) assert.equal(u.parent, "ghost.cad_completion");
  // criticalNext is flagged + highlighted red + *NEXT* label
  const crit = units.find((n) => n.unitId === "U-CAD-NURBS-STEP-EMIT");
  assert.equal(crit.critical, true);
  assert.equal(crit.color, "#ef4444");
  assert.match(crit.label, /\*NEXT\*/);
  // a shipped unit is built+green, an op-gated pending is blue
  assert.equal(units.find((n) => n.unitId === "U-CAD-BOOLEAN").status, "built");
  assert.equal(units.find((n) => n.unitId === "U-CAD-BOOLEAN").color, "#22c55e");
  assert.equal(units.find((n) => n.unitId === "U-MERGE-SLOT-DELTA").color, "#3b82f6");
  // critical-path edges only chain phase-A/B units (2 here: MERGE, NURBS) -> exactly 1 edge; C excluded
  assert.equal(a.newEdges.length, 1);
  assert.equal(a.newEdges[0].from, "ghost.cad_completion.u-merge-slot-delta");
  assert.equal(a.newEdges[0].to, "ghost.cad_completion.u-cad-nurbs-step-emit");
  assert.equal(a.newEdges[0].type, "cad-critical-path");
  // stats accuracy
  assert.equal(a.stats.shipped, 1);
  assert.equal(a.stats.pending, 2);
  assert.equal(a.stats.opGated, 1);
  assert.equal(a.stats.criticalNext, "U-CAD-NURBS-STEP-EMIT");
  assert.equal(a.stats.roostCreated, true);
});

test("generate: ADD-only -- existing roost + unit node are NOT re-emitted", () => {
  const graph = { nodes: [
    { id: "ghost.cad_completion", layer: "L8" },
    { id: "ghost.cad_completion.u-cad-boolean", layer: "L9" },
    { id: "ghost.priority_queue", layer: "L8" },
  ] };
  const a = generate({ graph, status: status() });
  assert.equal(a.newNodes.find((n) => n.id === "ghost.cad_completion"), undefined, "roost not re-emitted");
  assert.equal(a.newNodes.find((n) => n.id === "ghost.cad_completion.u-cad-boolean"), undefined, "existing unit not re-emitted");
  assert.equal(a.stats.roostCreated, false);
  // the two NOT-yet-present units still emit
  assert.equal(a.newNodes.filter((n) => n.kind === "cad-completion-unit").length, 2);
});

test("generate: failure modes -> structured error, never throw", () => {
  assert.equal(generate({ graph: null, status: status() }).error, "graph-missing-or-malformed");
  assert.equal(generate({ graph: emptyGraph, status: null }).error, "status-missing-or-malformed");
  assert.equal(generate({ graph: emptyGraph, status: { results: "nope" } }).error, "status-missing-or-malformed");
  assert.doesNotThrow(() => generate());
});

test("generate: no criticalNext -> no node flagged critical (adversarial)", () => {
  const a = generate({ graph: emptyGraph, status: status({ criticalNext: null }) });
  assert.equal(a.newNodes.filter((n) => n.critical).length, 0);
  assert.equal(a.newNodes.filter((n) => n.color === "#ef4444").length, 0);
});

test("generate: output is ASCII-only (ascii-guard / PS 5.1 safe)", () => {
  const a = generate({ graph: emptyGraph, status: status() });
  const json = JSON.stringify(a);
  assert.ok(/^[\x00-\x7F]*$/.test(json), "augmentation JSON must be ASCII-only");
});
