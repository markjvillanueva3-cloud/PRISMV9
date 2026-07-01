/**
 * Tests for parsePartNumber / groupByPart -- the Rung C join key.
 * Run: node scripts/lib/lathe-part-number.test.mjs   (node:test auto-runs on exit).
 * R9: each case encodes a REAL JM filename convention; a wrong split mis-pairs
 * a generated program to the wrong source program (silent corruption of the score).
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { parsePartNumber, groupByPart } from "./lathe-part-number.mjs";

test("trailing -<letter> is a revision", () => {
  assert.deepEqual(parsePartNumber("A9099735-B.MIN"), { partNumber: "A9099735", revision: "B" });
});

test("no trailing rev letter -> whole stem is the part", () => {
  assert.deepEqual(parsePartNumber("A9102203.MIN"), { partNumber: "A9102203", revision: null });
});

test("hyphenated part with rev: 11-10715-0-A", () => {
  assert.deepEqual(parsePartNumber("11-10715-0-A.nc"), { partNumber: "11-10715-0", revision: "A" });
});

test("hyphenated part ending in a digit keeps no rev: A-11-10583-0", () => {
  assert.deepEqual(parsePartNumber("A-11-10583-0.nc"), { partNumber: "A-11-10583-0", revision: null });
});

test("strips directory prefix", () => {
  assert.deepEqual(
    parsePartNumber("H:/PRISM/JM DIE/CNC LATHE/AGRATI/A9099735-B.MIN"),
    { partNumber: "A9099735", revision: "B" },
  );
});

test("empty / null inputs fail soft", () => {
  assert.deepEqual(parsePartNumber(""), { partNumber: null, revision: null });
  assert.deepEqual(parsePartNumber(null), { partNumber: null, revision: null });
});

test("case-insensitive: lowercase normalizes to uppercase part", () => {
  assert.equal(parsePartNumber("wcc1.step").partNumber, "WCC1");
});

test("groupByPart collapses revisions of the same part", () => {
  const g = groupByPart(["A9099735-B.MIN", "A9099735-C.MIN", "A9102203.MIN"]);
  assert.equal(g.get("A9099735").length, 2);
  assert.equal(g.get("A9102203").length, 1);
  assert.equal(g.size, 2);
});
