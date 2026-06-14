#!/usr/bin/env node
/**
 * Tests for viz-engine-node-id-canon.mjs — engine.<ClassName> → eng.<domain>.<name>
 * edge-target canonicalization. Real assertions (reference values + the live
 * dead-edge scenario that motivated it), NOT toBeDefined stubs.
 */
import { test } from "node:test";
import assert from "node:assert/strict";

import { buildEngineAliasIndex, canonicalizeEngineEdgeTargets, canonicalizeGraphEdgeTargets } from "./viz-engine-node-id-canon.mjs";

// --- buildEngineAliasIndex -------------------------------------------------

test("indexes per-engine nodes by lowercase class name", () => {
  const idx = buildEngineAliasIndex([
    { id: "eng.calc.kienzleforcemodelengine" },
    { id: "eng.ai.airesourcelearningengine" },
  ]);
  assert.equal(idx.get("kienzleforcemodelengine"), "eng.calc.kienzleforcemodelengine");
  assert.equal(idx.get("airesourcelearningengine"), "eng.ai.airesourcelearningengine");
});

test("deterministic multi-domain pick: prefer fewest segments, then non-other, then lexicographic", () => {
  // Same class in three domains + a nested sub-engine variant.
  const idx = buildEngineAliasIndex([
    { id: "eng.other.kienzleforcemodelengine" },               // 3 seg, other-domain
    { id: "eng.physics.kienzleforcemodelengine" },             // 3 seg, named
    { id: "eng.calc.kienzleforcemodelengine" },                // 3 seg, named, lex-smallest
    { id: "eng.ai.parentengine.kienzleforcemodelengine" },     // 4 seg, nested — must lose on nseg
  ]);
  // calc wins: tie on nseg(3) with physics+other → non-other beats other → calc < physics.
  assert.equal(idx.get("kienzleforcemodelengine"), "eng.calc.kienzleforcemodelengine");
});

test("non-other is preferred even when other-domain id is lexicographically smaller", () => {
  const idx = buildEngineAliasIndex([
    { id: "eng.other.aaaengine" },   // lex-smallest but other
    { id: "eng.zzz.aaaengine" },     // named domain
  ]);
  assert.equal(idx.get("aaaengine"), "eng.zzz.aaaengine");
});

test("L5 domain-CLUSTER nodes (2-segment eng.<domain>) are NOT indexed as engines", () => {
  const idx = buildEngineAliasIndex([
    { id: "eng.other" }, { id: "eng.mill" }, { id: "eng.calc" },
  ]);
  assert.equal(idx.size, 0, "2-seg cluster nodes must not pollute the engine alias index");
});

test("ignores non-eng nodes + malformed entries (fail-soft)", () => {
  const idx = buildEngineAliasIndex([
    { id: "disp.calcdispatcher" }, { id: "engine.KienzleForceModelEngine" },
    { id: "vault.wiki.x" }, {}, null, { id: 42 }, undefined,
  ]);
  assert.equal(idx.size, 0);
});

// --- canonicalizeEngineEdgeTargets -----------------------------------------

const liveNodes = [
  { id: "eng.ai.airesourcelearningengine" },
  { id: "eng.ai.masterAitrainingledgerengine".toLowerCase() },
  { id: "eng.calc.kienzleforcemodelengine" },
  { id: "pdf-extract.handbook-a" },
];

test("remaps engine.<Pascal> target (to) to canonical eng.<domain>.<name> — the live dead-edge scenario", () => {
  const graph = {
    nodes: liveNodes,
    edges: [
      { source: "pdf-extract.handbook-a", target: "engine.AIResourceLearningEngine", type: "feeds-training" },
    ],
  };
  const stats = canonicalizeEngineEdgeTargets(graph);
  assert.equal(graph.edges[0].target, "eng.ai.airesourcelearningengine");
  assert.equal(stats.remapped, 1);
  assert.equal(stats.unresolved, 0);
});

test("remaps the from/to endpoint convention too (not just source/target)", () => {
  const graph = {
    nodes: liveNodes,
    edges: [{ from: "x", to: "engine.KienzleForceModelEngine", type: "bridge-to-engine" }],
  };
  canonicalizeEngineEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "eng.calc.kienzleforcemodelengine");
});

test("a genuinely-missing engine (no eng.* alias) is left unchanged + counted as unresolved", () => {
  const graph = {
    nodes: liveNodes,
    edges: [{ source: "pdf-extract.x", target: "engine.TotallyMadeUpEngine", type: "feeds-training" }],
  };
  const stats = canonicalizeEngineEdgeTargets(graph);
  assert.equal(graph.edges[0].target, "engine.TotallyMadeUpEngine", "missing engine must stay an honest dead pixel");
  assert.equal(stats.remapped, 0);
  assert.equal(stats.unresolved, 1);
  assert.equal(stats.distinctMissing, 1);
});

test("STRICTLY DEAD→LIVE: an already-canonical eng.* edge is never touched", () => {
  const graph = {
    nodes: liveNodes,
    edges: [{ source: "pdf-extract.x", target: "eng.calc.kienzleforcemodelengine", type: "feeds-training" }],
  };
  const before = JSON.parse(JSON.stringify(graph.edges));
  const stats = canonicalizeEngineEdgeTargets(graph);
  assert.deepEqual(graph.edges, before);
  assert.equal(stats.remapped, 0);
  assert.equal(stats.unresolved, 0);
});

test("drops a remapped edge that would exactly duplicate an existing edge (no inflation)", () => {
  const graph = {
    nodes: liveNodes,
    edges: [
      // already-canonical edge:
      { source: "pdf-extract.handbook-a", target: "eng.ai.airesourcelearningengine", type: "feeds-training" },
      // dead edge that, once remapped, collides with the above:
      { source: "pdf-extract.handbook-a", target: "engine.AIResourceLearningEngine", type: "feeds-training" },
    ],
  };
  const stats = canonicalizeEngineEdgeTargets(graph);
  assert.equal(graph.edges.length, 1, "the remapped duplicate must be dropped");
  assert.equal(graph.edges[0].target, "eng.ai.airesourcelearningengine");
  assert.equal(stats.dropped, 1);
});

test("handles both endpoints being engine.* on one edge", () => {
  const graph = {
    nodes: [{ id: "eng.calc.a" }, { id: "eng.calc.b" }],
    edges: [{ from: "engine.A", to: "engine.B", type: "x" }],
  };
  canonicalizeEngineEdgeTargets(graph);
  assert.equal(graph.edges[0].from, "eng.calc.a");
  assert.equal(graph.edges[0].to, "eng.calc.b");
});

test("empty / missing graph is fail-soft (no throw, zero stats)", () => {
  assert.deepEqual(canonicalizeEngineEdgeTargets({ nodes: [], edges: [] }), { remapped: 0, dropped: 0, unresolved: 0, distinctMissing: 0 });
  assert.deepEqual(canonicalizeEngineEdgeTargets({}), { remapped: 0, dropped: 0, unresolved: 0, distinctMissing: 0 });
  assert.deepEqual(canonicalizeEngineEdgeTargets(null), { remapped: 0, dropped: 0, unresolved: 0, distinctMissing: 0 });
});

test("multiple distinct missing engines counted once each", () => {
  const graph = {
    nodes: liveNodes,
    edges: [
      { source: "a", target: "engine.MissingOne", type: "t" },
      { source: "b", target: "engine.MissingOne", type: "t" }, // same missing class twice
      { source: "c", target: "engine.MissingTwo", type: "t" },
    ],
  };
  const stats = canonicalizeEngineEdgeTargets(graph);
  assert.equal(stats.unresolved, 3, "3 endpoints unresolved");
  assert.equal(stats.distinctMissing, 2, "2 distinct missing class names");
});

// --- canonicalizeGraphEdgeTargets (unified engine + dispatcher) ------------

// A graph whose dispatcher nodes use the canonical file-derived ids.
const graphWithDispNodes = [
  { id: "disp.calcdispatcher" }, { id: "disp.camdispatcher" }, { id: "disp.aireasoningdispatcher" },
  { id: "eng.ai.airesourcelearningengine" }, { id: "eng.calc.kienzleforcemodelengine" },
  { id: "pdf-extract.h" },
];

test("dispatcher.prism_calc → disp.calcdispatcher when the disp node EXISTS (the cumulative-graph fix)", () => {
  const graph = { nodes: graphWithDispNodes, edges: [
    { source: "pdf-extract.h", target: "dispatcher.prism_calc", type: "feeds-dispatcher" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].target, "disp.calcdispatcher");
  assert.equal(s.dispRemapped, 1);
  assert.equal(s.dispUnresolved, 0);
});

test("NODE-EXISTENCE GATE: dispatcher.prism_shop stays unchanged when disp.prism_shop has no node (honest dead pixel, never a new dead target)", () => {
  const graph = { nodes: graphWithDispNodes, edges: [
    { source: "pdf-extract.h", target: "dispatcher.prism_shop", type: "feeds-dispatcher" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].target, "dispatcher.prism_shop", "no disp.prism_shop node → must NOT remap to a fresh dead target");
  assert.equal(s.dispRemapped, 0);
  assert.equal(s.dispUnresolved, 1);
  assert.equal(s.distinctDispMissing, 1);
});

test("unified pass remaps engine AND dispatcher endpoints in one sweep", () => {
  const graph = { nodes: graphWithDispNodes, edges: [
    { source: "pdf-extract.h", target: "engine.AIResourceLearningEngine", type: "feeds-training" },
    { source: "pdf-extract.h", target: "dispatcher.prism_cam", type: "feeds-dispatcher" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].target, "eng.ai.airesourcelearningengine");
  assert.equal(graph.edges[1].target, "disp.camdispatcher");
  assert.equal(s.engRemapped, 1);
  assert.equal(s.dispRemapped, 1);
});

test("CUMULATIVE dedup: an accumulated dispatcher.prism_calc edge remaps onto an existing disp.calcdispatcher edge and is dropped", () => {
  const graph = { nodes: graphWithDispNodes, edges: [
    // the producer's new (correct) edge, already present from this regen:
    { source: "pdf-extract.h", target: "disp.calcdispatcher", type: "feeds-dispatcher" },
    // the stale accumulated edge from a prior merge — remaps onto the above key:
    { source: "pdf-extract.h", target: "dispatcher.prism_calc", type: "feeds-dispatcher" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges.length, 1, "the stale dispatcher.* edge must dedup-drop onto the canonical disp.* edge");
  assert.equal(graph.edges[0].target, "disp.calcdispatcher");
  assert.equal(s.dropped, 1);
});

test("disable-knob parity: unified pass leaves an already-canonical graph untouched (zero-stats)", () => {
  const graph = { nodes: graphWithDispNodes, edges: [
    { source: "pdf-extract.h", target: "disp.calcdispatcher", type: "feeds-dispatcher" },
    { source: "pdf-extract.h", target: "eng.calc.kienzleforcemodelengine", type: "bridge-to-engine" },
  ] };
  const before = JSON.parse(JSON.stringify(graph.edges));
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.deepEqual(graph.edges, before);
  assert.deepEqual(s, { engRemapped: 0, dispRemapped: 0, dropped: 0, engUnresolved: 0, dispUnresolved: 0, bareEngRemapped: 0, bareDispRemapped: 0, distinctEngMissing: 0, distinctDispMissing: 0 });
});

test("unified pass is fail-soft on empty/missing graph", () => {
  const zero = { engRemapped: 0, dispRemapped: 0, dropped: 0, engUnresolved: 0, dispUnresolved: 0, bareEngRemapped: 0, bareDispRemapped: 0, distinctEngMissing: 0, distinctDispMissing: 0 };
  assert.deepEqual(canonicalizeGraphEdgeTargets({ nodes: [], edges: [] }), zero);
  assert.deepEqual(canonicalizeGraphEdgeTargets(null), zero);
});

// --- bare-name edge-type-scoped canon (extracted-modules producer) ---------

test("bridge_to_existing with a BARE PascalCase engine name remaps to eng.<domain>.<name>", () => {
  const graph = { nodes: [{ id: "eng.calc.schedulingengine" }, { id: "extracted.mod.x" }], edges: [
    { from: "extracted.mod.x", to: "SchedulingEngine", type: "bridge_to_existing" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "eng.calc.schedulingengine");
  assert.equal(s.bareEngRemapped, 1);
});

test("wire_target with a BARE prism_* name remaps to disp.<file-id> (node-existence gated)", () => {
  const graph = { nodes: [{ id: "disp.calcdispatcher" }, { id: "extracted.mod.y" }], edges: [
    { from: "extracted.mod.y", to: "prism_calc", type: "wire_target" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "disp.calcdispatcher");
  assert.equal(s.bareDispRemapped, 1);
});

test("bare-name canon is EDGE-TYPE-GATED: an unrelated edge type with a bare name is NOT touched", () => {
  const graph = { nodes: [{ id: "eng.calc.schedulingengine" }, { id: "extracted.mod.z" }], edges: [
    // same bare target, but type 'invokes' (not a bare-name producer type) → left alone
    { from: "extracted.mod.z", to: "SchedulingEngine", type: "invokes" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "SchedulingEngine", "non-bridge/wire edge type must not be bare-remapped");
  assert.equal(s.bareEngRemapped, 0);
});

test("bare wire_target to a non-existent dispatcher stays unchanged (no fresh dead target)", () => {
  const graph = { nodes: [{ id: "extracted.mod.q" }], edges: [
    { from: "extracted.mod.q", to: "prism_shop", type: "wire_target" }, // no disp.prism_shop node
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "prism_shop");
  assert.equal(s.bareDispRemapped, 0);
});

test("a LIVE bridge_to_existing (target already a node) is not touched", () => {
  const graph = { nodes: [{ id: "eng.calc.schedulingengine" }, { id: "x" }], edges: [
    { from: "x", to: "eng.calc.schedulingengine", type: "bridge_to_existing" },
  ] };
  const before = JSON.parse(JSON.stringify(graph.edges));
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.deepEqual(graph.edges, before);
  assert.equal(s.bareEngRemapped, 0);
});

// --- eng.<wrong-domain> + disp.<wrong-name> re-resolve (already-prefixed but missing) ---

test("eng.<wrong-domain>.<name> MISSING re-resolves to the real eng.* node by last segment", () => {
  const graph = { nodes: [{ id: "eng.ai.agenticloopengine" }, { id: "x" }], edges: [
    { from: "x", to: "eng.other.agenticloopengine", type: "invokes" }, // wrong domain, missing
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "eng.ai.agenticloopengine");
  assert.equal(s.engRemapped, 1);
});

test("a LIVE eng.<domain>.<name> target is NOT touched (only missing ones re-resolve)", () => {
  const graph = { nodes: [{ id: "eng.ai.agenticloopengine" }, { id: "x" }], edges: [
    { from: "x", to: "eng.ai.agenticloopengine", type: "invokes" },
  ] };
  const before = JSON.parse(JSON.stringify(graph.edges));
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.deepEqual(graph.edges, before);
  assert.equal(s.engRemapped, 0);
});

test("eng.* missing with no last-segment alias stays unchanged (genuinely missing)", () => {
  const graph = { nodes: [{ id: "x" }], edges: [
    { from: "x", to: "eng.other.nosuchengine", type: "invokes" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "eng.other.nosuchengine");
  assert.equal(s.engUnresolved, 1);
});

test("disp.prism_data (wrong name, missing) re-resolves to disp.datadispatcher via the MCP table", () => {
  const graph = { nodes: [{ id: "disp.datadispatcher" }, { id: "x" }], edges: [
    { from: "x", to: "disp.prism_data", type: "ghost-wire-validation" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "disp.datadispatcher");
  assert.equal(s.dispRemapped, 1);
});

test("disp.* missing that does not re-resolve to a real node stays unchanged", () => {
  const graph = { nodes: [{ id: "x" }], edges: [
    { from: "x", to: "disp.unknown", type: "ghost-wire-validation" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "disp.unknown");
  assert.equal(s.dispUnresolved, 1);
});

test("engine.<Pascal> is still matched by the engine. branch, NOT the eng. branch (ordering)", () => {
  // engine.X startsWith eng. too — the engine. branch must win (checked first).
  const graph = { nodes: [{ id: "eng.calc.kienzleforcemodelengine" }, { id: "x" }], edges: [
    { from: "x", to: "engine.KienzleForceModelEngine", type: "bridge-to-engine" },
  ] };
  const s = canonicalizeGraphEdgeTargets(graph);
  assert.equal(graph.edges[0].to, "eng.calc.kienzleforcemodelengine");
  assert.equal(s.engRemapped, 1);
});
