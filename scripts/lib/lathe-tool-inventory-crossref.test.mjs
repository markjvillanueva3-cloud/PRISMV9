// Tests for lathe-tool-inventory-crossref.mjs — CLOSED-LOOP-MS0/U-CL3
// Real fail-on-revert assertions: op→tool-type demand, matched/needed/unused partitioning,
// op-weight summing, coverage rate, arg parsing, adversarial inputs.
import { test } from "node:test";
import assert from "node:assert/strict";
import { crossRefToolTypes, parseOpFreqArg, OP_TO_TOOL_TYPES } from "./lathe-tool-inventory-crossref.mjs";

// Mirrors the real jm-tool-purchases.json `byType` shape.
const PURCHASES = {
  insert: { count: 212, spend: 53090.16 },
  "boring-bar": { count: 19, spend: 4619.16 },
  drill: { count: 149, spend: 21319.65 },
  "carbide-blank": { count: 5372, spend: 4338880.38 },
  "grinding-wheel": { count: 60, spend: 21332.7 },
};

test("crossRefToolTypes: turning ops fully covered by purchased insert/boring-bar/drill", () => {
  const r = crossRefToolTypes({
    purchaseByType: PURCHASES,
    opFrequencies: { od_thread: 4, od_rough: 2, bore_rough: 1, drill_axial: 1 },
  });
  // demanded: insert (od_thread+od_rough), carbide-blank (od_rough), boring-bar (bore_rough), drill (drill_axial)
  assert.deepEqual(r.matched, ["boring-bar", "carbide-blank", "drill", "insert"]);
  assert.deepEqual(r.neededUnpurchased, []);
  assert.equal(r.coverageRate, 1);
  assert.equal(r.matchedSpend.insert, 53090.16); // spend flowed through from purchase data
});

test("crossRefToolTypes: op-weight sums across ops that share a tool type", () => {
  const r = crossRefToolTypes({ purchaseByType: PURCHASES, opFrequencies: { od_thread: 4, od_rough: 2 } });
  // od_thread→insert(4); od_rough→insert(2)+carbide-blank(2) ⇒ insert weight = 6
  assert.equal(r.demandedTypes.insert, 6);
  assert.equal(r.demandedTypes["carbide-blank"], 2);
});

test("crossRefToolTypes: a needed type with no purchase record is flagged needed-unpurchased", () => {
  const r = crossRefToolTypes({ purchaseByType: { insert: { count: 1, spend: 1 } }, opFrequencies: { tap: 3 } });
  assert.deepEqual(r.neededUnpurchased, ["tap"]); // tap op needs a tap; none purchased
  assert.equal(r.coverageRate, 0);
});

test("crossRefToolTypes: purchased type no observed op needs is flagged purchased-unused", () => {
  const r = crossRefToolTypes({ purchaseByType: PURCHASES, opFrequencies: { od_thread: 1 } });
  // od_thread→insert only; grinding-wheel/boring-bar/drill/carbide-blank purchased but unused here
  assert.ok(r.purchasedUnused.includes("grinding-wheel"));
  assert.ok(r.purchasedUnused.includes("drill"));
  assert.ok(!r.purchasedUnused.includes("insert"));
});

test("crossRefToolTypes: ignores non-positive frequencies; empty input is safe", () => {
  const r = crossRefToolTypes({ purchaseByType: PURCHASES, opFrequencies: { od_rough: 0, face: -1 } });
  assert.deepEqual(r.demandedTypes, {});
  const empty = crossRefToolTypes({});
  assert.equal(empty.coverageRate, null);
  assert.deepEqual(empty.matched, []);
});

test("parseOpFreqArg: parses the CLI op:count list; tolerates garbage", () => {
  assert.deepEqual(parseOpFreqArg("od_thread:4,od_rough:2,face:1"), { od_thread: 4, od_rough: 2, face: 1 });
  assert.deepEqual(parseOpFreqArg(null), {});
  assert.deepEqual(parseOpFreqArg(""), {});
});

test("OP_TO_TOOL_TYPES: boring needs a boring-bar; drilling needs a drill (domain sanity)", () => {
  assert.ok(OP_TO_TOOL_TYPES.bore_rough.includes("boring-bar"));
  assert.ok(OP_TO_TOOL_TYPES.drill_axial.includes("drill"));
  assert.ok(OP_TO_TOOL_TYPES.od_thread.includes("insert"));
});
