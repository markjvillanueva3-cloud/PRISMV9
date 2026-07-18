/**
 * Tests for cam-corpus-order-learn.mjs — the offline loop's self-improve step (learn op-order
 * from corpus pairwise preferences; flag where LATHE_OP_ORDER contradicts JM). Concrete values.
 *
 *   node --test scripts/lib/cam-corpus-order-learn.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { learnPairwiseOrder, compareToLatheOrder } from "./cam-corpus-order-learn.mjs";

test("consensus order: families ranked by corpus pairwise dominance", () => {
  // 3 programs all do facing -> OD_roughing -> parting_cutoff
  const seqs = [
    ["facing", "OD_roughing", "parting_cutoff"],
    ["facing", "OD_roughing", "parting_cutoff"],
    ["facing", "OD_roughing", "parting_cutoff"],
  ];
  const r = learnPairwiseOrder(seqs);
  assert.deepEqual(r.suggestedOrder, ["facing", "OD_roughing", "parting_cutoff"]);
  // facing beats both -> copeland +2; parting loses both -> -2
  assert.equal(r.copeland.facing, 2);
  assert.equal(r.copeland.parting_cutoff, -2);
  const fp = r.pairs.find((p) => (p.a === "facing" && p.b === "parting_cutoff") || (p.a === "parting_cutoff" && p.b === "facing"));
  assert.equal(fp.confidence, 1); // unanimous
  assert.deepEqual(fp.dominant, ["facing", "parting_cutoff"]);
});

test("majority (not unanimous) still picks the dominant order with fractional confidence", () => {
  const seqs = [
    ["drilling_centering", "OD_roughing"], // drill before rough (minority)
    ["OD_roughing", "drilling_centering"], // rough before drill
    ["OD_roughing", "drilling_centering"],
    ["OD_roughing", "drilling_centering"], // 3 of 4 -> rough before drill
  ];
  const r = learnPairwiseOrder(seqs);
  const p = r.pairs[0];
  assert.equal(p.total, 4);
  assert.deepEqual(p.dominant, ["OD_roughing", "drilling_centering"]);
  assert.equal(p.confidence, 0.75);
});

test("compareToLatheOrder flags a contradiction (PRISM drills before JM's rough-first)", () => {
  // JM strongly does OD_roughing before drilling_centering (90/100)
  const seqs = [];
  for (let i = 0; i < 90; i++) seqs.push(["OD_roughing", "drilling_centering"]);
  for (let i = 0; i < 10; i++) seqs.push(["drilling_centering", "OD_roughing"]);
  const learned = learnPairwiseOrder(seqs);
  // current LATHE_OP_ORDER puts drilling_centering(20) BEFORE OD_roughing(30) -> contradicts JM
  const lathe = { drilling_centering: 20, OD_roughing: 30 };
  const dis = compareToLatheOrder(learned, lathe, { minSupport: 20, minConfidence: 0.7 });
  assert.equal(dis.length, 1);
  assert.equal(dis[0].x, "OD_roughing");
  assert.equal(dis[0].y, "drilling_centering");
  assert.equal(dis[0].jm_confidence, 0.9);
  assert.match(dis[0].recommendation, /move 'OD_roughing' before 'drilling_centering'/);
});

test("compareToLatheOrder: agreement -> no disagreement; low-support pair ignored", () => {
  const seqs = [];
  for (let i = 0; i < 50; i++) seqs.push(["facing", "OD_roughing"]); // JM: facing first (agrees w/ lathe)
  seqs.push(["grooving", "facing"]); // a single low-support oddity
  const learned = learnPairwiseOrder(seqs);
  const lathe = { facing: 10, OD_roughing: 30, grooving: 60 };
  const dis = compareToLatheOrder(learned, lathe, { minSupport: 20, minConfidence: 0.7 });
  // facing-before-OD_roughing agrees; grooving-before-facing has support 1 (< 20) -> ignored
  assert.equal(dis.length, 0);
});

test("throws on bad input", () => {
  assert.throws(() => learnPairwiseOrder(null), /required/);
});
