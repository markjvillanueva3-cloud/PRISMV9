/**
 * roadmap-to-viz-nodes.test.mjs — MS-VIZ-ROADMAP-BIND
 * Tests the canonical viz_node_id resolver, ghost-node schema, and reconciler.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  resolveVizNodeId,
  loadGraphNodeIds,
  reconcileRoadmapVsViz,
  REAL_TOP_PREFIXES,
  GHOST_NODE_SCHEMA,
} from "./roadmap-to-viz-nodes.mjs";

// --- resolveVizNodeId: engine ---
test("engine resolves to eng.<domain>.<name>", () => {
  const r = resolveVizNodeId({ kind: "engine", domain: "ai", name: "FooEngine" });
  assert.equal(r.vizNodeId, "eng.ai.fooengine");
  assert.equal(r.valid, true);
  assert.equal(r.kind, "engine");
});

test("engine name is lowercased + stripped of non-alphanumerics", () => {
  const r = resolveVizNodeId({ kind: "engine", domain: "AI", name: "Foo-Bar Engine!" });
  assert.equal(r.vizNodeId, "eng.ai.foobarengine");
  assert.equal(r.valid, true);
});

test("engine missing domain is invalid", () => {
  const r = resolveVizNodeId({ kind: "engine", name: "FooEngine" });
  assert.equal(r.vizNodeId, null);
  assert.equal(r.valid, false);
  assert.match(r.reason, /domain/);
});

test("engine missing name is invalid", () => {
  const r = resolveVizNodeId({ kind: "engine", domain: "ai" });
  assert.equal(r.vizNodeId, null);
  assert.equal(r.valid, false);
  assert.match(r.reason, /name/);
});

// --- resolveVizNodeId: dispatcher-action ---
test("dispatcher-action resolves to disp.<dispatcher>.action.<action>", () => {
  const r = resolveVizNodeId({ kind: "dispatcher-action", dispatcher: "prism_calc", action: "cutting_force" });
  assert.equal(r.vizNodeId, "disp.prismcalc.action.cuttingforce");
  assert.equal(r.valid, true);
});

test("dispatcher-action missing action is invalid", () => {
  const r = resolveVizNodeId({ kind: "dispatcher-action", dispatcher: "prism_calc" });
  assert.equal(r.valid, false);
  assert.match(r.reason, /action/);
});

// --- resolveVizNodeId: milestone-unit ---
test("milestone-unit with trailing-number unit resolves to ghost.ms.<ms>.u<NN>", () => {
  const r = resolveVizNodeId({ kind: "milestone-unit", milestone: "SYSTEM-VIZ-BRAIN-MS0", unitId: "U-P5-FOO-1" });
  assert.equal(r.vizNodeId, "ghost.ms.system-viz-brain-ms0.u01");
  assert.equal(r.valid, true);
});

test("milestone-unit without unitId resolves to ghost.ms.<ms>", () => {
  const r = resolveVizNodeId({ kind: "milestone-unit", milestone: "MS-VIZ-ROADMAP-BIND" });
  assert.equal(r.vizNodeId, "ghost.ms.ms-viz-roadmap-bind");
  assert.equal(r.valid, true);
});

test("milestone-unit non-numeric unit slug falls back to hyphen-slug", () => {
  const r = resolveVizNodeId({ kind: "milestone-unit", milestone: "MS-X", unitId: "U-DRIFT-DETECTOR" });
  assert.equal(r.vizNodeId, "ghost.ms.ms-x.drift-detector");
  assert.equal(r.valid, true);
});

test("milestone-unit missing milestone is invalid", () => {
  const r = resolveVizNodeId({ kind: "milestone-unit", unitId: "U-1" });
  assert.equal(r.valid, false);
  assert.match(r.reason, /milestone/);
});

// --- resolveVizNodeId: frontend-page / script / skill ---
test("frontend-page resolves to fe.page.<name> (singular, hyphen-stripped, live-graph shape)", () => {
  const r = resolveVizNodeId({ kind: "frontend-page", page: "Admin-Page" });
  assert.equal(r.vizNodeId, "fe.page.adminpage");
  assert.equal(r.valid, true);
});

test("script resolves to script.<name> with hyphens preserved", () => {
  const r = resolveVizNodeId({ kind: "script", name: "regen-viz" });
  assert.equal(r.vizNodeId, "script.regen-viz");
  assert.equal(r.valid, true);
});

test("skill resolves to skill.project.<name> with hyphens preserved", () => {
  const r = resolveVizNodeId({ kind: "skill", skill: "system-viz" });
  assert.equal(r.vizNodeId, "skill.project.system-viz");
  assert.equal(r.valid, true);
});

// --- resolveVizNodeId: failure / edge cases ---
test("null descriptor is invalid, not a throw", () => {
  const r = resolveVizNodeId(null);
  assert.equal(r.valid, false);
  assert.equal(r.vizNodeId, null);
});

test("non-object descriptor is invalid", () => {
  const r = resolveVizNodeId("engine");
  assert.equal(r.valid, false);
});

test("empty object yields unknown-kind invalid", () => {
  const r = resolveVizNodeId({});
  assert.equal(r.valid, false);
  assert.match(r.reason, /unknown kind/);
});

test("unrecognised kind is invalid with a helpful reason", () => {
  const r = resolveVizNodeId({ kind: "banana", name: "x" });
  assert.equal(r.valid, false);
  assert.match(r.reason, /unknown kind "banana"/);
});

test("kind is case-insensitive", () => {
  const r = resolveVizNodeId({ kind: "ENGINE", domain: "ai", name: "Foo" });
  assert.equal(r.vizNodeId, "eng.ai.foo");
  assert.equal(r.valid, true);
});

test("every resolvable kind produces a real top-prefix", () => {
  const cases = [
    { kind: "engine", domain: "d", name: "n" },
    { kind: "dispatcher-action", dispatcher: "d", action: "a" },
    { kind: "milestone-unit", milestone: "m" },
    { kind: "frontend-page", page: "p" },
    { kind: "script", name: "s" },
    { kind: "skill", name: "k" },
  ];
  for (const c of cases) {
    const r = resolveVizNodeId(c);
    assert.equal(r.valid, true, `${c.kind} should be valid, got: ${r.reason}`);
    assert.ok(REAL_TOP_PREFIXES.has(r.vizNodeId.split(".", 1)[0]), `${r.vizNodeId} top-prefix must be real`);
  }
});

// --- GHOST_NODE_SCHEMA ---
test("GHOST_NODE_SCHEMA has the required shape", () => {
  assert.equal(GHOST_NODE_SCHEMA.$schema, "prism/ghost-node/v1");
  assert.ok(Array.isArray(GHOST_NODE_SCHEMA.required));
  assert.ok(GHOST_NODE_SCHEMA.required.includes("id"));
  assert.ok(GHOST_NODE_SCHEMA.required.includes("milestone"));
  assert.equal(typeof GHOST_NODE_SCHEMA.fields, "object");
  assert.match(GHOST_NODE_SCHEMA.idPattern, /^ghost\.ms\./);
});

test("GHOST_NODE_SCHEMA is frozen (immutable)", () => {
  assert.ok(Object.isFrozen(GHOST_NODE_SCHEMA));
});

// --- loadGraphNodeIds ---
test("loadGraphNodeIds returns null for a missing graph file", () => {
  assert.equal(loadGraphNodeIds("state/shared/system-viz/__does_not_exist__.json"), null);
});

// --- reconcileRoadmapVsViz: failure modes ---
test("reconcile reports error for a missing graph", () => {
  const rep = reconcileRoadmapVsViz({ graphPath: "state/shared/system-viz/__nope__.json" });
  assert.equal(rep.ok, false);
  assert.match(rep.error, /graph missing/);
});

test("reconcile reports error for a missing milestones dir", () => {
  const rep = reconcileRoadmapVsViz({ milestonesDir: "mcp-server/data/__no_milestones__" });
  // graph may also be missing; either way ok:false with an error
  assert.equal(rep.ok, false);
  assert.ok(typeof rep.error === "string" && rep.error.length > 0);
});

// --- reconcileRoadmapVsViz: real E2E against the live milestones dir ---
test("reconcile E2E runs against the real milestones dir and classifies units", () => {
  const rep = reconcileRoadmapVsViz({});
  if (!rep.ok) {
    // Graph genuinely absent in this env — assert the failure is reported honestly, not swallowed.
    assert.match(rep.error, /graph missing|milestones dir missing/);
    return;
  }
  assert.equal(typeof rep.graphNodeCount, "number");
  assert.ok(rep.envelopes > 0, "should find at least one milestone envelope");
  assert.ok(rep.units > 0, "should find at least one unit");
  // every finding carries a class from the known set
  const known = new Set(["BOUND", "GHOST", "MISSING-ID", "UNRESOLVED", "BAD-ENVELOPE"]);
  for (const f of rep.findings) assert.ok(known.has(f.class), `unexpected class ${f.class}`);
  // byClass tallies must sum to the unit/finding count
  const sum = Object.values(rep.byClass).reduce((a, b) => a + b, 0);
  assert.equal(sum, rep.findings.length);
});

// --- the test that catches resolver-shape bugs: resolved ids must BIND to the live graph ---
test("resolved ids for known-real entities are live graph nodes (shape-correctness)", () => {
  const ids = loadGraphNodeIds("state/shared/system-viz/system-graph.json");
  if (ids == null) return; // graph genuinely absent — loadGraphNodeIds-null case already covered
  // These ids were verified present in system-graph.json. The resolver MUST reproduce
  // them exactly — if its slug/segment shape drifts, the id stops binding and this fails.
  const cases = [
    { unit: { kind: "skill", skill: "advisor-strategy" }, expect: "skill.project.advisor-strategy" },
    { unit: { kind: "frontend-page", page: "AdminPage" }, expect: "fe.page.adminpage" },
    { unit: { kind: "script", name: "add-jsdoc" }, expect: "script.add-jsdoc" },
  ];
  for (const c of cases) {
    const r = resolveVizNodeId(c.unit);
    assert.equal(r.vizNodeId, c.expect, `${c.unit.kind}: resolver must emit ${c.expect}`);
    assert.ok(ids.has(c.expect), `${c.expect} must be a live graph node — resolver output must actually bind`);
  }
});
