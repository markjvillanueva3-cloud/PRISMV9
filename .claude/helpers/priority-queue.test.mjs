#!/usr/bin/env node
import test from "node:test";
import assert from "node:assert/strict";
import { collectUnits, buildShippedIds, buildClaimedIds, rankUnits } from "./priority-queue.mjs";

test("collectUnits — flattens pending + prose + bridge into one list", () => {
  const units = collectUnits({
    pending_units: [{ unit_id: "U-P1", milestone: "M0", title: "p" }],
    unconsolidated_prose: [{ unit_id: "U-PR1", milestone: "M1", title: "prose" }],
    bridge_units: {
      wiring: [{ id: "U-BW1", title: "wire", domain: "X", engine_count: 5, intent: "i" }],
      deep_integration: [{ id: "U-BD1", title: "deep", from: "A", to: "B", intent: "i" }],
    },
  });
  assert.equal(units.length, 4);
  assert.equal(units.find((u) => u._source === "pending").unit_id, "U-P1");
  assert.equal(units.find((u) => u._source === "unconsolidated-prose").unit_id, "U-PR1");
  assert.equal(units.find((u) => u._source === "bridge-wiring").unit_id, "U-BW1");
  assert.equal(units.find((u) => u._source === "bridge-deep").source, "bridge");
});

test("buildShippedIds — only shipped:true units, normalized uppercase", () => {
  const ids = buildShippedIds({
    milestones: {
      A: { units: [{ id: "u-a1", shipped: true }, { id: "U-A2", shipped: false }, { id: "u-a3", shipped: true }] },
    },
  });
  assert.ok(ids.has("U-A1"));
  assert.ok(ids.has("U-A3"));
  assert.equal(ids.has("U-A2"), false);
  assert.equal(ids.size, 2);
});

test("buildClaimedIds — extracts U-... tokens from slot topics (soft filter)", () => {
  // Topics where the unit id is the terminal token (or followed by a
  // non-[A-Z0-9-] separator): the greedy regex captures it. Real PRISM topics
  // rarely embed unit ids today; this filter is reserved for future when slot
  // state carries an explicit unit_id field. Strict claim enforcement lives in
  // commit-ownership-guard at commit time.
  const claimed = buildClaimedIds({
    slots: {
      alpha: { topic: "alpha-U-FOO01" },
      bravo: { topic: "no-unit-here" },
      charlie: { topic: "work on U-BAR-99" },
    },
  });
  assert.ok(claimed.has("U-FOO01"));
  assert.ok(claimed.has("U-BAR-99"));
  assert.equal(claimed.size, 2);
});

test("rankUnits — backend-dev first, then bridge, then app; excludes shipped", () => {
  const units = [
    { unit_id: "U-CAM1", milestone: "CAM-EXHAUST-MS0", title: "cam" },                    // app
    { unit_id: "U-RGS1", milestone: "RGS-TOOL-AUTOINVOKE-MS1", title: "rgs" },             // backend-dev
    { unit_id: "U-SHIPPED", milestone: "CAM-MS0", title: "shipped" },                      // excluded
    { unit_id: "U-BR1", source: "bridge", milestone: "BRIDGE-DEEP", title: "bridge" },     // bridge
  ];
  const ranked = rankUnits(units, new Set(["U-SHIPPED"]));
  assert.equal(ranked.length, 3);
  assert.equal(ranked[0].unit_id, "U-RGS1");     // backend-dev first
  assert.equal(ranked[1].unit_id, "U-BR1");      // bridge second
  assert.equal(ranked[2].unit_id, "U-CAM1");     // app last
  assert.equal(ranked[0]._category, "backend-dev");
  assert.equal(ranked[1]._category, "bridge");
  assert.equal(ranked[2]._category, "app-functionality");
});

test("rankUnits — drops looks_completed units", () => {
  const units = [
    { unit_id: "U-A", milestone: "M", title: "a", looks_completed: true },
    { unit_id: "U-B", milestone: "M", title: "b" },
  ];
  const ranked = rankUnits(units, new Set());
  assert.equal(ranked.length, 1);
  assert.equal(ranked[0].unit_id, "U-B");
});

test("rankUnits — tiebreaker: same priority → milestone asc then unit_id asc", () => {
  const units = [
    { unit_id: "U-B", milestone: "Z-MS0", title: "b" },
    { unit_id: "U-A", milestone: "Z-MS0", title: "a" },
    { unit_id: "U-C", milestone: "A-MS0", title: "c" },
  ];
  const ranked = rankUnits(units, new Set());
  // All app — sort by milestone asc, then unit_id asc
  assert.equal(ranked[0].unit_id, "U-C");  // A-MS0
  assert.equal(ranked[1].unit_id, "U-A");  // Z-MS0 / U-A
  assert.equal(ranked[2].unit_id, "U-B");  // Z-MS0 / U-B
});

test("rankUnits — tolerates empty / no exclude", () => {
  assert.equal(rankUnits([], new Set()).length, 0);
  assert.equal(rankUnits([], null).length, 0);
});
