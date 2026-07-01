// SYSTEM-VIZ-HIGH-ROI-AUDIT-2026-05-20 G4 tests.

import { test } from "node:test";
import assert from "node:assert/strict";

import {
  detectDeadPixels,
  renderDeadPixelMarkdown,
  classifyDeadEdgeType,
  ADVISORY_EDGE_TYPES,
} from "./system-viz-dead-pixel-detector.mjs";

// ---- shape + invalid-input handling ------------------------------------

test("detectDeadPixels: null → error result, no throw", () => {
  const r = detectDeadPixels(null);
  assert.equal(r.error, "invalid-graph");
  assert.equal(r.deadPixels.length, 0);
});

test("detectDeadPixels: missing edges array → error", () => {
  const r = detectDeadPixels({ nodes: [] });
  assert.equal(r.error, "invalid-graph");
});

test("detectDeadPixels: empty graph → 0 dead pixels", () => {
  const r = detectDeadPixels({ nodes: [], edges: [] });
  assert.equal(r.deadEdgeCount, 0);
  assert.equal(r.nodeCount, 0);
  assert.equal(r.edgeCount, 0);
});

// ---- happy path --------------------------------------------------------

test("detectDeadPixels: clean graph has zero dead pixels", () => {
  const graph = {
    nodes: [{ id: "a" }, { id: "b" }, { id: "c" }],
    edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }],
  };
  const r = detectDeadPixels(graph);
  assert.equal(r.deadEdgeCount, 0);
  assert.equal(r.orphanTargets.length, 0);
});

test("detectDeadPixels: catches edge to absent target", () => {
  const graph = {
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ from: "a", to: "missing-target" }],
  };
  const r = detectDeadPixels(graph);
  assert.equal(r.deadEdgeCount, 1);
  assert.equal(r.deadPixels[0].missingSide, "to");
  assert.equal(r.deadPixels[0].to, "missing-target");
  assert.equal(r.orphanTargets[0].id, "missing-target");
  assert.equal(r.orphanTargets[0].inboundCount, 1);
});

test("detectDeadPixels: catches edge from absent source", () => {
  const graph = {
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ from: "missing-source", to: "a" }],
  };
  const r = detectDeadPixels(graph);
  assert.equal(r.deadEdgeCount, 1);
  assert.equal(r.deadPixels[0].missingSide, "from");
});

test("detectDeadPixels: edge with both sides missing flags 'both'", () => {
  const r = detectDeadPixels({
    nodes: [{ id: "a" }],
    edges: [{ from: "missing-1", to: "missing-2" }],
  });
  assert.equal(r.deadEdgeCount, 1);
  assert.equal(r.deadPixels[0].missingSide, "both");
});

test("detectDeadPixels: source/target field alt names also work", () => {
  const r = detectDeadPixels({
    nodes: [{ id: "a" }],
    edges: [{ source: "a", target: "missing" }],
  });
  assert.equal(r.deadEdgeCount, 1);
  assert.equal(r.deadPixels[0].to, "missing");
});

test("detectDeadPixels: malformed edges counted as skipped", () => {
  const r = detectDeadPixels({
    nodes: [{ id: "a" }],
    edges: [null, "string", {}, { from: "a" }, { to: "a" }, { from: "a", to: "a" }],
  });
  assert.equal(r.skippedEdges, 5);
  assert.equal(r.deadEdgeCount, 0);
});

test("detectDeadPixels: orphanTargets ranked by inbound count", () => {
  const nodes = [{ id: "src1" }, { id: "src2" }, { id: "src3" }];
  const edges = [
    { from: "src1", to: "popular-missing" },
    { from: "src2", to: "popular-missing" },
    { from: "src3", to: "popular-missing" },
    { from: "src1", to: "lonely-missing" },
  ];
  const r = detectDeadPixels({ nodes, edges });
  assert.equal(r.orphanTargets.length, 2);
  assert.equal(r.orphanTargets[0].id, "popular-missing");
  assert.equal(r.orphanTargets[0].inboundCount, 3);
  assert.equal(r.orphanTargets[1].id, "lonely-missing");
  assert.equal(r.orphanTargets[1].inboundCount, 1);
});

test("detectDeadPixels: deadEdgesBySourceLayer groups by source node's layer", () => {
  const r = detectDeadPixels({
    nodes: [
      { id: "n1", layer: "L7" },
      { id: "n2", layer: "L7" },
      { id: "n3", layer: "L4" },
    ],
    edges: [
      { from: "n1", to: "missing-1" },
      { from: "n2", to: "missing-2" },
      { from: "n3", to: "missing-3" },
    ],
  });
  assert.equal(r.deadEdgesBySourceLayer.L7, 2);
  assert.equal(r.deadEdgesBySourceLayer.L4, 1);
});

test("detectDeadPixels: missingByPrefix groups by id-prefix (first dotted segment)", () => {
  const r = detectDeadPixels({
    nodes: [{ id: "src1" }, { id: "src2" }, { id: "src3" }],
    edges: [
      { from: "src1", to: "fs.module1" },
      { from: "src2", to: "fs.module2" },
      { from: "src3", to: "wiki.entry1" },
    ],
  });
  assert.equal(r.missingByPrefix.fs, 2);
  assert.equal(r.missingByPrefix.wiki, 1);
});

test("detectDeadPixels: id without dot uses entire id as prefix", () => {
  const r = detectDeadPixels({
    nodes: [{ id: "src" }],
    edges: [{ from: "src", to: "no-dot-here" }],
  });
  assert.equal(r.missingByPrefix["no-dot-here"], 1);
});

test("detectDeadPixels: topOrphans caps output list", () => {
  const nodes = [];
  const edges = [];
  for (let i = 0; i < 100; i++) {
    nodes.push({ id: `src${i}` });
    edges.push({ from: `src${i}`, to: `miss${i}` });
  }
  const r = detectDeadPixels({ nodes, edges }, { topOrphans: 10 });
  assert.equal(r.orphanTargets.length, 10);
});

test("detectDeadPixels: deadPixels.length caps at maxDeadPixelExamples but deadEdgeCount counts all", () => {
  const nodes = [];
  const edges = [];
  for (let i = 0; i < 600; i++) {
    nodes.push({ id: `src${i}` });
    edges.push({ from: `src${i}`, to: `miss${i}` });
  }
  const r = detectDeadPixels({ nodes, edges }, { maxDeadPixelExamples: 500 });
  assert.equal(r.deadPixels.length, 500);
  assert.equal(r.deadEdgeCount, 600);
});

test("detectDeadPixels: nodes without id are skipped from membership set", () => {
  const r = detectDeadPixels({
    nodes: [{ id: "a" }, null, { foo: "no-id" }, { id: "b" }],
    edges: [{ from: "a", to: "b" }],
  });
  assert.equal(r.deadEdgeCount, 0);
  assert.equal(r.nodeCount, 2);
});

// ---- renderDeadPixelMarkdown ------------------------------------------

test("renderDeadPixelMarkdown: produces non-empty report with key sections", () => {
  const r = detectDeadPixels({
    nodes: [{ id: "src", layer: "L7" }],
    edges: [{ from: "src", to: "missing.thing" }],
  });
  const md = renderDeadPixelMarkdown(r);
  assert.match(md, /system-viz dead-pixel sweep/);
  assert.match(md, /Top.*orphan targets/);
  assert.match(md, /missing\.thing/);
  assert.match(md, /layer=L7/);
  assert.match(md, /Missing ids by prefix/);
});

test("renderDeadPixelMarkdown: handles clean graph gracefully", () => {
  const r = detectDeadPixels({
    nodes: [{ id: "a" }, { id: "b" }],
    edges: [{ from: "a", to: "b" }],
  });
  const md = renderDeadPixelMarkdown(r);
  assert.match(md, /Dead edges: 0/);
  assert.match(md, /every referenced id exists/);
});

test("renderDeadPixelMarkdown: error result rendered loudly", () => {
  const r = detectDeadPixels(null);
  const md = renderDeadPixelMarkdown(r);
  assert.match(md, /ERROR:/);
});

// ---- regression-guard: realistic small graph mimicking PRISM shape -----

test("detectDeadPixels: realistic PRISM-shape graph", () => {
  const nodes = [
    { id: "eng.kienzle", layer: "L7" },
    { id: "disp.prism_calc", layer: "L4" },
    { id: "test.kienzle", layer: "L8" },
    { id: "wiki.kienzle", layer: "L10" },
  ];
  const edges = [
    { from: "disp.prism_calc", to: "eng.kienzle" },
    { from: "test.kienzle", to: "eng.kienzle" },
    { from: "eng.kienzle", to: "wiki.kienzle" },
    // dead: refers to engine never extracted
    { from: "disp.prism_calc", to: "eng.taylor" },
    { from: "disp.prism_calc", to: "eng.taylor" }, // duplicate dead ref
    // dead: missing source
    { from: "ghost.unwired-engine.WeirdEngine", to: "disp.prism_calc" },
  ];
  const r = detectDeadPixels({ nodes, edges });
  assert.equal(r.deadEdgeCount, 3);
  assert.equal(r.orphanTargets[0].id, "eng.taylor");
  assert.equal(r.orphanTargets[0].inboundCount, 2);
  assert.equal(r.missingByPrefix.eng, 2);
  assert.equal(r.missingByPrefix.ghost, 1);
  assert.equal(r.deadEdgesBySourceLayer.L4, 2); // 2 dead from disp
  assert.equal(r.deadEdgesBySourceLayer["?"], 1); // 1 from unknown-layer source
});

// ---- U-VIZ-G4-DEAD-EDGE-CLASSIFY: advisory vs defect -------------------

test("classifyDeadEdgeType: advisory bridge types vs structural defects", () => {
  assert.equal(classifyDeadEdgeType("bridge-to-engine"), "advisory");
  assert.equal(classifyDeadEdgeType("enriches-engine"), "advisory");
  assert.equal(classifyDeadEdgeType("feeds-training"), "advisory");
  assert.equal(classifyDeadEdgeType("ghost-wire"), "advisory");
  assert.equal(classifyDeadEdgeType("invokes"), "defect");
  assert.equal(classifyDeadEdgeType("contains"), "defect");
  assert.equal(classifyDeadEdgeType("wire_target"), "defect");
  assert.equal(classifyDeadEdgeType("(untyped)"), "defect", "an untyped dead edge is a defect, not advisory");
  assert.equal(classifyDeadEdgeType("totally-unknown"), "defect");
});

test("ADVISORY_EDGE_TYPES is a frozen set covering the pdf-course bridge edge types", () => {
  assert.ok(ADVISORY_EDGE_TYPES instanceof Set);
  assert.ok(Object.isFrozen(ADVISORY_EDGE_TYPES));
  for (const t of ["bridge-to-engine", "enriches-engine", "feeds-training", "feeds-dispatcher", "ghost-wire", "proposed-wire"]) {
    assert.ok(ADVISORY_EDGE_TYPES.has(t), `${t} should be advisory`);
  }
});

test("detectDeadPixels: deadEdgesByType + deadEdgesByClass split a mixed dead set", () => {
  const graph = {
    nodes: [
      { id: "pdf-extract.h", layer: "L9" },
      { id: "disp.calcdispatcher", layer: "L4" },
    ],
    edges: [
      // advisory: bridges to a not-yet-built engine (target missing)
      { source: "pdf-extract.h", target: "engine.ToolLifeEngine", type: "bridge-to-engine" },
      { source: "pdf-extract.h", target: "engine.MaterialRegistryEngine", type: "enriches-engine" },
      { source: "pdf-extract.h", target: "engine.X", type: "feeds-training" },
      // defect: structural edges to a missing node
      { source: "pdf-extract.h", target: "engine.Y", type: "invokes" },
      { source: "pdf-extract.h", target: "engine.Z", type: "wire_target" },
      // untyped dead edge → defect
      { source: "pdf-extract.h", target: "engine.Q" },
      // a LIVE edge (both endpoints exist) — must not be counted
      { source: "pdf-extract.h", target: "disp.calcdispatcher", type: "feeds-dispatcher" },
    ],
  };
  const r = detectDeadPixels(graph);
  assert.equal(r.deadEdgeCount, 6);
  assert.equal(r.deadEdgesByType["bridge-to-engine"], 1);
  assert.equal(r.deadEdgesByType["enriches-engine"], 1);
  assert.equal(r.deadEdgesByType["feeds-training"], 1);
  assert.equal(r.deadEdgesByType["invokes"], 1);
  assert.equal(r.deadEdgesByType["wire_target"], 1);
  assert.equal(r.deadEdgesByType["(untyped)"], 1);
  assert.equal(r.deadEdgesByClass.advisory, 3, "bridge-to-engine + enriches-engine + feeds-training");
  assert.equal(r.deadEdgesByClass.defect, 3, "invokes + wire_target + untyped");
  // the live feeds-dispatcher edge was NOT counted as dead
  assert.equal(r.deadEdgesByType["feeds-dispatcher"], undefined);
});

test("detectDeadPixels: invalid graph returns zeroed class/type fields (no throw)", () => {
  const r = detectDeadPixels(null);
  assert.deepEqual(r.deadEdgesByType, {});
  assert.deepEqual(r.deadEdgesByClass, { advisory: 0, defect: 0 });
});

test("renderDeadPixelMarkdown includes the advisory/defect headline + by-type section", () => {
  const graph = {
    nodes: [{ id: "a", layer: "L9" }],
    edges: [
      { source: "a", target: "missing1", type: "bridge-to-engine" },
      { source: "a", target: "missing2", type: "invokes" },
    ],
  };
  const md = renderDeadPixelMarkdown(detectDeadPixels(graph));
  assert.match(md, /advisory \(intentional gap-surfacing/);
  assert.match(md, /DEFECT \(structural edges/);
  assert.match(md, /bridge-to-engine\s+\[advisory\]/);
  assert.match(md, /invokes\s+\[defect\]/);
});
