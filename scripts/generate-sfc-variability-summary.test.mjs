// scripts/generate-sfc-variability-summary.test.mjs
// Tests for the bounded sfc-variability graph fold. The load-bearing guarantee:
// the 50K raw sfc-cell nodes are DROPPED (never enter the 834MB fleet graph),
// structural roosts are kept, dangling edges are pruned, and the drop is
// explicitly annotated (no silent loss).
// Run: node scripts/generate-sfc-variability-summary.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { isCell, boundedSummary, emptySummary } from "./generate-sfc-variability-summary.mjs";

function fixture() {
  return {
    generatedAt: "2026-06-24T00:00:00.000Z",
    nodes: [
      { id: "ghost.sfc-machine-types", layer: 8, kind: "ghost", metadata: { archetypes: 1 } }, // roost
      { id: "ghost.db.materials",      layer: 8, kind: "ghost" },                                // structural
      { id: "sfc.machine.vmc",         layer: 9, kind: "sfc-machine-type" },                     // structural
      { id: "sfc.cell.1",              layer: 10, kind: "sfc-cell" },
      { id: "sfc.cell.2",              layer: 10, kind: "sfc-cell" },
      { id: "sfc.cell.3",              layer: 10, kind: "sfc-cell" },
    ],
    edges: [
      { from: "ghost.sfc-machine-types", to: "sfc.machine.vmc", kind: "contains" },   // both structural -> kept
      { from: "ghost.sfc-machine-types", to: "ghost.db.materials", kind: "consults" },// both structural -> kept
      { from: "sfc.machine.vmc", to: "sfc.cell.1", kind: "has-cell" },                // -> cell, pruned at cap 0
      { source: "sfc.cell.2", target: "sfc.cell.3", kind: "sibling" },                // cell->cell, pruned at cap 0
    ],
  };
}

test("isCell: only sfc-cell kind is a cell", () => {
  assert.equal(isCell({ kind: "sfc-cell" }), true);
  assert.equal(isCell({ kind: "ghost" }), false);
  assert.equal(isCell(null), false);
  assert.equal(isCell({}), false);
});

test("boundedSummary cap=0: DROPS all cells, keeps structural, prunes dangling edges, annotates roost", () => {
  const aug = fixture();
  const s = boundedSummary(aug, { cellCap: 0 });
  // 3 structural nodes, ZERO cells in the graph
  assert.equal(s.newNodes.length, 3);
  assert.equal(s.newNodes.filter(n => n.kind === "sfc-cell").length, 0);
  // roost annotated with the aggregate (no silent drop)
  const roost = s.newNodes.find(n => n.id === "ghost.sfc-machine-types");
  assert.equal(roost.metadata.cellsAggregated, 3);
  assert.equal(roost.metadata.cellsSampledIntoGraph, 0);
  assert.equal(roost.metadata.archetypes, 1); // preserves existing metadata
  // only the 2 structural-to-structural edges survive
  assert.equal(s.newEdges.length, 2);
  assert.deepEqual(s.stats, {
    sourceNodes: 6, sourceEdges: 4, keptNodes: 3, droppedCells: 3, keptEdges: 2, droppedEdges: 2,
  });
});

test("boundedSummary cap=2: samples N cells, keeps edges to sampled cells", () => {
  const aug = fixture();
  const s = boundedSummary(aug, { cellCap: 2 });
  assert.equal(s.newNodes.length, 5); // 3 structural + 2 sampled cells (cell.1, cell.2)
  const roost = s.newNodes.find(n => n.id === "ghost.sfc-machine-types");
  assert.equal(roost.metadata.cellsAggregated, 3);
  assert.equal(roost.metadata.cellsSampledIntoGraph, 2);
  // machine->cell.1 now survives (cell.1 sampled); cell.2->cell.3 still pruned (cell.3 dropped)
  const ids = new Set(s.newEdges.map(e => `${e.from ?? e.source}->${e.to ?? e.target}`));
  assert.ok(ids.has("sfc.machine.vmc->sfc.cell.1"));
  assert.ok(!ids.has("sfc.cell.2->sfc.cell.3"));
});

test("boundedSummary: does NOT mutate the input aug (roost stays unannotated in source)", () => {
  const aug = fixture();
  boundedSummary(aug, { cellCap: 0 });
  const srcRoost = aug.nodes.find(n => n.id === "ghost.sfc-machine-types");
  assert.equal(srcRoost.metadata.cellsAggregated, undefined); // input untouched
});

test("boundedSummary: empty / null-ish aug -> empty arrays, never throws", () => {
  assert.deepEqual(boundedSummary({ nodes: [], edges: [] }).newNodes, []);
  assert.deepEqual(boundedSummary({}).newNodes, []);
  assert.deepEqual(boundedSummary(null).newNodes, []);
  assert.deepEqual(boundedSummary(undefined).newEdges, []);
});

test("emptySummary: valid no-op fold shape with sourceMissing flag", () => {
  const e = emptySummary("source-not-found");
  assert.deepEqual(e.newNodes, []);
  assert.deepEqual(e.newEdges, []);
  assert.equal(e.stats.sourceMissing, true);
  assert.equal(e.stats.reason, "source-not-found");
});
