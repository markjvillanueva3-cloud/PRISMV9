// Tests for lathe-fleet-tool-reconcile.mjs — CLOSED-LOOP-MS0/U-CL8
// Real assertions on the composed reconciliation: op aggregation from real G-code, and the
// matched / needed-unpurchased / purchased-unused three-way split against a purchase corpus.
import { test } from "node:test";
import assert from "node:assert/strict";
import { aggregateOpsFromTexts, reconcileFleet } from "./lathe-fleet-tool-reconcile.mjs";

// Real Okuma program snippets — the canned cycle drives the inferred op (via U-CL4 inferOpsFromGcodes).
const ROUGH = "G95\nG50 S2000\nG96 S200\nG71 P1 Q2 U0.5 W0.1 D2000 F0.3\nM30\n";   // -> od_rough
const THREAD = "G97 S800\nG76 P010060 Q100 R0.05 X1 Z-10 F1.5\nM30\n";             // -> od_thread
const DRILL = "G97 S1200\nG74 R0.5 X0 Z-20 P0 Q3000 F0.1\nM30\n";                  // -> drill_axial
const PARTOFF = "G96 S180\nG50 S2500\nG75 R0.5 X0 Z-1 P3000 Q1500 F0.05\nM30\n";   // -> part_off

test("aggregateOpsFromTexts sums per-program op sets across the corpus", () => {
  const ops = aggregateOpsFromTexts([ROUGH, THREAD, THREAD, DRILL, PARTOFF]);
  assert.equal(ops.od_rough, 1);
  assert.equal(ops.od_thread, 2);
  assert.equal(ops.drill_axial, 1);
  assert.equal(ops.part_off, 1);
});

test("aggregateOpsFromTexts handles empty / null input", () => {
  assert.deepEqual(aggregateOpsFromTexts([]), {});
  assert.deepEqual(aggregateOpsFromTexts(null), {});
  assert.deepEqual(aggregateOpsFromTexts([""]), {});
});

test("reconcileFleet: turning ops demand insert/carbide-blank — matched against a corpus that has them", () => {
  const purchaseByType = {
    insert: { count: 212, spend: 53090 }, "carbide-blank": { count: 5372, spend: 4338880 },
    "end-mill": { count: 30, spend: 9000 }, "grinding-wheel": { count: 50, spend: 12000 },
  };
  const opFrequencies = aggregateOpsFromTexts([ROUGH, THREAD, PARTOFF]); // od_rough/od_thread/part_off
  const r = reconcileFleet({ purchaseByType, opFrequencies });
  // od_rough -> insert + carbide-blank; od_thread/part_off -> insert
  assert.ok(r.matched.includes("insert"));
  assert.ok(r.matched.includes("carbide-blank"));
  assert.deepEqual(r.usedToolTypes, ["carbide-blank", "insert"]);
  // end-mill + grinding-wheel are NOT demanded by any lathe turning op -> purchased-unused
  assert.deepEqual(r.purchasedUnused, ["end-mill", "grinding-wheel"]);
  assert.equal(r.unusedPurchasedSpend["end-mill"], 9000);
  assert.equal(r.unusedPurchasedSpend["grinding-wheel"], 12000);
  assert.equal(r.coverageRate, 1); // every demanded type was purchased
  assert.equal(r.matchedSpend.insert, 53090);
});

test("reconcileFleet: a boring op with no boring-bar purchase surfaces a procurement GAP", () => {
  const purchaseByType = { insert: { count: 100, spend: 25000 } }; // no boring-bar
  const r = reconcileFleet({ purchaseByType, opFrequencies: { bore_rough: 3, od_rough: 2 } });
  // bore_rough -> boring-bar + insert; insert purchased, boring-bar NOT
  assert.ok(r.neededUnpurchased.includes("boring-bar"));
  assert.ok(r.matched.includes("insert"));
  assert.ok(r.coverageRate !== null && r.coverageRate < 1); // demand not fully covered
});

test("reconcileFleet: empty program demand -> everything purchased is unused, coverage null", () => {
  const purchaseByType = { insert: { count: 10, spend: 100 }, tap: { count: 5, spend: 50 } };
  const r = reconcileFleet({ purchaseByType, opFrequencies: {} });
  assert.deepEqual(r.usedToolTypes, []);
  assert.deepEqual(r.purchasedUnused, ["insert", "tap"]);
  assert.equal(r.coverageRate, null); // no demand -> rate undefined, not 0
});
