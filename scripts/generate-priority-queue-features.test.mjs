#!/usr/bin/env node
/**
 * generate-priority-queue-features.test.mjs — node:test (real-value, R9).
 */

import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyUnit, safeId, generate,
  PRIORITY_ROOST_ID, PLANNED_PARENT, ROOST_LAYER, UNIT_LAYER,
  COLOR_BACKEND_DEV, COLOR_BRIDGE, COLOR_APP,
  PRIORITY_BACKEND_DEV, PRIORITY_BRIDGE, PRIORITY_APP, MAX_LABEL,
} from "./generate-priority-queue-features.mjs";

test("classifyUnit — backend-dev keyword milestones map to priority 0/blue", () => {
  for (const ms of ["BACKEND-DEVTOOLS-RGS6-MS0", "RGS-TOOL-AUTOINVOKE-MS1", "INFRA-NEURAL-MS1", "HOOK-SYNERGY-V2-MS0", "DEV-VELOCITY-AUTOTRIGGER-MS0", "CLEANUP-MS0", "SYSTEM-VIZ-BRAIN-MS0", "OLLAMA-PIPELINE-MS0", "MEMORY-COMPRESS-MS0", "CHECKIN-UPGRADE-MS0"]) {
    const c = classifyUnit({ milestone: ms });
    assert.equal(c.category, "backend-dev", `${ms} should be backend-dev`);
    assert.equal(c.priority, PRIORITY_BACKEND_DEV);
    assert.equal(c.color, COLOR_BACKEND_DEV);
  }
});

test("classifyUnit — backend-dev domains override even if milestone is app-ish", () => {
  for (const dom of ["hooks", "infra", "docs"]) {
    assert.equal(classifyUnit({ milestone: "CAM-EXHAUST-MS0", suggested_domain: dom }).category, "backend-dev");
  }
});

test("classifyUnit — bridge wins (source==='bridge')", () => {
  const c = classifyUnit({ source: "bridge", milestone: "ANYTHING" });
  assert.equal(c.category, "bridge");
  assert.equal(c.priority, PRIORITY_BRIDGE);
  assert.equal(c.color, COLOR_BRIDGE);
});

test("classifyUnit — app-functionality default", () => {
  for (const ms of ["CAM-EXHAUST-MS0", "MILL-MS3", "LATHE-PRO-MS3", "WEDM-PRODUCTION-MS0", "SFC-CALIBRATE-MS0"]) {
    const c = classifyUnit({ milestone: ms, suggested_domain: "mill" });
    assert.equal(c.category, "app-functionality", `${ms} should be app`);
    assert.equal(c.priority, PRIORITY_APP);
    assert.equal(c.color, COLOR_APP);
  }
});

test("classifyUnit — tolerates missing fields", () => {
  assert.equal(classifyUnit({}).category, "app-functionality");
  assert.equal(classifyUnit(null).category, "app-functionality");
});

test("safeId — non-alnum collapse + traversal guard", () => {
  assert.equal(safeId("U-PRI/001"), "u-pri-001");
  assert.equal(safeId(".."), "x");
});

test("generate — empty inventory emits roost only", () => {
  const { newNodes, stats } = generate({}, []);
  assert.equal(newNodes.length, 1);
  assert.equal(newNodes[0].id, PRIORITY_ROOST_ID);
  assert.equal(newNodes[0].parent, PLANNED_PARENT);
  assert.equal(newNodes[0].layer, ROOST_LAYER);
  assert.equal(stats.totalUnits, 0);
});

test("generate — mixed inventory: roost + sorted color-coded children", () => {
  const inv = {
    pending_units: [
      { unit_id: "U-CAM1", milestone: "CAM-EXHAUST-MS0", title: "CAM thing", suggested_domain: "cam" },
      { unit_id: "U-RGS1", milestone: "RGS-TOOL-AUTOINVOKE-MS1", title: "RGS thing", suggested_domain: "infra" },
    ],
    unconsolidated_prose: [
      { unit_id: "U-PROSE9", milestone: "REVENUE-MS0", title: "prose orphan" },
    ],
    bridge_units: {
      wiring: [{ id: "U-BRIDGE-WIRE-LATHE", title: "Wire lathe", domain: "Lathe", engine_count: 89, intent: "wire" }],
      deep_integration: [{ id: "U-BRIDGE-SFC-FUSION", title: "SFC→Fusion", from: "SFC", to: "Fusion", intent: "speeds feeds" }],
    },
  };
  const { newNodes, stats } = generate(inv, []);
  assert.equal(stats.totalUnits, 5); // 2 pending + 1 prose + 2 bridge
  assert.equal(stats.emitted, 5);

  const roost = newNodes.find((n) => n.id === PRIORITY_ROOST_ID);
  assert.ok(roost);
  const kids = newNodes.filter((n) => n.kind === "priority-unit");
  assert.equal(kids.length, 5);
  for (const k of kids) {
    assert.equal(k.parent, PRIORITY_ROOST_ID);
    assert.equal(k.layer, UNIT_LAYER);
    assert.equal(k.ghost, true);
    assert.ok([COLOR_BACKEND_DEV, COLOR_BRIDGE, COLOR_APP].includes(k.color));
  }

  // Stable order: priority asc — first child must be backend-dev (RGS or infra-domain).
  assert.equal(kids[0].priority, PRIORITY_BACKEND_DEV);
  // Bridge units come before app-functionality.
  const bridgeIdx = kids.findIndex((k) => k.category === "bridge");
  const appIdx = kids.findIndex((k) => k.category === "app-functionality");
  assert.ok(bridgeIdx < appIdx, `bridge (${bridgeIdx}) before app (${appIdx})`);

  assert.deepEqual(stats.byCategory, { "backend-dev": 1, "bridge": 2, "app-functionality": 2 });
});

test("generate — long label capped at MAX_LABEL", () => {
  const inv = { pending_units: [{ unit_id: "U-X", milestone: "M", title: "x".repeat(300) }] };
  const { newNodes } = generate(inv, []);
  const child = newNodes.find((n) => n.kind === "priority-unit");
  assert.ok(child.label.length <= MAX_LABEL);
});

test("generate — skips ids already in graph + roost already present", () => {
  const inv = { pending_units: [{ unit_id: "U-A", milestone: "RGS-MS0", title: "a" }] };
  const { newNodes, stats } = generate(inv, new Set([PRIORITY_ROOST_ID, "ghost.priority.u-a"]));
  assert.equal(stats.roostEmitted, 0);
  assert.equal(stats.emitted, 0);
  assert.equal(stats.skipped, 1);
  assert.equal(newNodes.length, 0);
});

test("generate — idempotent across two runs", () => {
  const inv = { pending_units: [{ unit_id: "U-A", milestone: "M", title: "a" }, { unit_id: "U-B", milestone: "RGS-MS0", title: "b" }] };
  assert.deepEqual(generate(inv, []), generate(inv, []));
});
