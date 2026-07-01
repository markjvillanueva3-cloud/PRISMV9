/*
 * Tests for cad-gen-worklist-from-gold.mjs (slot:delta, 2026-06-26). Pure classifiers -- no I/O (R9).
 * Run: node scripts/cad-gen-worklist-from-gold.test.mjs (node:test auto-runs on exit; pipe to tail).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { classifyAndSpec, synthesize, existingSpecSet } from "./cad-gen-worklist-from-gold.mjs";

const dia = (v) => ({ type: "diameter", value_mm: v });
const lin = (v) => ({ type: "linear", value_mm: v });

test("classifyAndSpec: two distinct diameters + length -> turned bushing (OD>bore)", () => {
  const s = classifyAndSpec([dia(20), dia(10), lin(30)]);
  assert.equal(s, "a turned bushing: 20 mm outer diameter, 10 mm bore, 30 mm long");
});

test("classifyAndSpec: one diameter + length -> cylinder", () => {
  assert.equal(classifyAndSpec([dia(12.192), lin(19.05)]), "a 12.19 mm diameter cylinder 19.05 mm long");
});

test("classifyAndSpec: equal diameters (bore==OD) falls through to cylinder, never an invalid bushing", () => {
  // D[1] < D[0] is false -> not a bushing; uses the single largest D + L
  assert.equal(classifyAndSpec([dia(10), dia(10), lin(25)]), "a 10 mm diameter cylinder 25 mm long");
});

test("classifyAndSpec: no diameter + >=3 linear -> rectangular plate (3 largest)", () => {
  assert.equal(classifyAndSpec([lin(50), lin(30), lin(10), lin(5)]), "a 50 mm by 30 mm by 10 mm rectangular plate");
});

test("classifyAndSpec: ambiguous dim-soups -> null (never fabricate geometry, R12)", () => {
  assert.equal(classifyAndSpec([dia(10)]), null);                 // 1 diameter, no length
  assert.equal(classifyAndSpec([lin(10), lin(20)]), null);        // 2 linear, no diameter, <3
  assert.equal(classifyAndSpec([]), null);                        // empty
  assert.equal(classifyAndSpec(null), null);                      // malformed
});

test("classifyAndSpec: out-of-machinable-range dims are filtered before classifying", () => {
  // a 9999mm diameter is filtered -> remaining (10mm dia + 5mm lin) -> cylinder
  assert.equal(classifyAndSpec([dia(9999), dia(10), lin(5)]), "a 10 mm diameter cylinder 5 mm long");
  // sub-0.5mm dims filtered -> nothing left -> null
  assert.equal(classifyAndSpec([dia(0.1), lin(0.2)]), null);
});

test("classifyAndSpec: untrainable labels are ignored", () => {
  assert.equal(classifyAndSpec([dia(12), { type: "linear", value_mm: 30, trainable: false }]), null); // length not trainable -> no L
});

test("synthesize: dedups, skips nulls, caps at limit", () => {
  const recs = [
    { labels: [dia(20), dia(10), lin(30)] },  // bushing
    { labels: [dia(20), dia(10), lin(30)] },  // dup -> skipped
    { labels: [dia(12), lin(19)] },           // cylinder
    { labels: [dia(5)] },                      // null -> skipped
    { labels: [lin(50), lin(30), lin(10)] },  // plate
  ];
  const all = synthesize(recs, 50);
  assert.equal(all.length, 3);
  const capped = synthesize(recs, 2);
  assert.equal(capped.length, 2);
});

test("synthesize: respects the existing-spec set (idempotent re-run appends nothing already present)", () => {
  const recs = [{ labels: [dia(12), lin(19)] }];
  const spec = classifyAndSpec(recs[0].labels);
  assert.deepEqual(synthesize(recs, 50, new Set([spec])), []);
});

test("existingSpecSet: parses worklist, drops blanks + comments", () => {
  const set = existingSpecSet("a cube\n# comment\n\na 12 mm diameter cylinder 19 mm long\n");
  assert.equal(set.size, 2);
  assert.equal(set.has("a 12 mm diameter cylinder 19 mm long"), true);
});
