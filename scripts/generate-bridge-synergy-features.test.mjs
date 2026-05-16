#!/usr/bin/env node
/**
 * generate-bridge-synergy-features.test.mjs — node:test suite (real-value, R9).
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  generate, safeId, BRIDGE_ROOST_ID, PLANNED_PARENT, ROOST_LAYER, UNIT_LAYER, MAX_LABEL,
} from "./generate-bridge-synergy-features.mjs";

const fixture = () => ({
  bridge_units: {
    wiring: [
      { id: "U-BRIDGE-WIRE-LATHE", title: "Wire 89 unwired Lathe engines", domain: "Lathe", engine_count: 89, intent: "connect lathe engines" },
      { id: "U-BRIDGE-WIRE-OTHER", title: "Wire 144 unwired Other engines", domain: "Other", engine_count: 144, intent: "connect other engines" },
    ],
    deep_integration: [
      { id: "U-BRIDGE-SFC-FUSION", title: "SFC → Fusion bridge", from: "SFC", to: "Fusion", intent: "speeds feeds into fusion" },
    ],
  },
});

test("safeId — collapse + traversal guard", () => {
  assert.equal(safeId("U-BRIDGE-WIRE-LATHE"), "u-bridge-wire-lathe");
  assert.equal(safeId("a/b"), "a-b");
  assert.equal(safeId(".."), "x");
  assert.equal(safeId(""), "x");
});

test("generate — empty inventory emits roost only", () => {
  const { newNodes, stats } = generate({ bridge_units: { wiring: [], deep_integration: [] } }, []);
  assert.equal(newNodes.length, 1);
  assert.equal(newNodes[0].id, BRIDGE_ROOST_ID);
  assert.equal(newNodes[0].kind, "ghost-roost");
  assert.equal(newNodes[0].parent, PLANNED_PARENT);
  assert.equal(newNodes[0].layer, ROOST_LAYER);
  assert.equal(stats.roostEmitted, 1);
});

test("generate — one child per wiring + deep-integration unit", () => {
  const { newNodes, stats } = generate(fixture(), []);
  assert.equal(newNodes.length, 4); // roost + 2 wiring + 1 deep
  assert.equal(stats.wiringEmitted, 2);
  assert.equal(stats.deepEmitted, 1);
  const children = newNodes.filter((n) => n.kind === "bridge-unit");
  assert.equal(children.length, 3);
  for (const c of children) {
    assert.equal(c.parent, BRIDGE_ROOST_ID);
    assert.equal(c.layer, UNIT_LAYER);
    assert.equal(c.ghost, true);
  }
});

test("generate — wiring vs deep-integration info tags differ", () => {
  const { newNodes } = generate(fixture(), []);
  const wire = newNodes.find((n) => n.id.includes("wire-lathe"));
  const deep = newNodes.find((n) => n.id.includes("sfc-fusion"));
  assert.ok(wire.info.startsWith("[wiring"));
  assert.ok(wire.info.includes("89 engines"));
  assert.ok(deep.info.startsWith("[deep-integration"));
  assert.ok(deep.info.includes("SFC → Fusion"));
});

test("generate — long label capped at MAX_LABEL", () => {
  const inv = { bridge_units: { wiring: [{ id: "U-X", title: "y".repeat(300), domain: "D", engine_count: 1, intent: "i" }], deep_integration: [] } };
  const { newNodes } = generate(inv, []);
  const child = newNodes.find((n) => n.kind === "bridge-unit");
  assert.ok(child.label.length <= MAX_LABEL);
});

test("generate — skips children + roost already in graph", () => {
  const { newNodes, stats } = generate(fixture(), new Set([BRIDGE_ROOST_ID, "ghost.bridge.u-bridge-wire-lathe"]));
  assert.equal(stats.roostEmitted, 0);
  assert.equal(stats.wiringEmitted, 1); // lathe skipped
  assert.equal(stats.skipped, 1);
  assert.ok(!newNodes.some((n) => n.id === BRIDGE_ROOST_ID));
});

test("generate — idempotent across two runs", () => {
  assert.deepEqual(generate(fixture(), []), generate(fixture(), []));
});

test("generate — tolerates missing/garbage inventory", () => {
  assert.equal(generate(null, []).newNodes.length, 1);
  assert.equal(generate({}, []).newNodes.length, 1);
  assert.equal(generate({ bridge_units: { wiring: "nope", deep_integration: null } }, []).stats.wiringUnits, 0);
});
