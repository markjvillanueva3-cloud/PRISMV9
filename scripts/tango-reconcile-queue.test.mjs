// tango-reconcile-queue.test.mjs -- verifyIdsInSubjects correctness.
// Run: node --test scripts/tango-reconcile-queue.test.mjs
import { test } from "node:test";
import assert from "node:assert/strict";
import { verifyIdsInSubjects } from "./tango-reconcile-queue.mjs";

test("exact-token match: id present as a maximal commit-subject token -> hit", () => {
  const h = verifyIdsInSubjects(["U-CK11"], ["[COMMAND-KERNEL-MS0]/U-CK11: per-category scrutiny"]);
  assert.ok(h.has("U-CK11"));
  assert.match(h.get("U-CK11"), /^U-CK11 \|/); // note leads with the matched token
});

test("PREFIX NON-COLLISION: short id must NOT match a longer id that contains it", () => {
  // The bug: "-" is valid WITHIN a unit-id, so a boundary regex let "U-A1" match
  // "U-A1-ARCHETYPE..." (a DIFFERENT unit). Maximal-token equality forbids it.
  const h = verifyIdsInSubjects(["U-A1"], ["[DELTA-OLLAMA-EFFICIENCY-MS0]/U-A1-ARCHETYPE-LABELER: x"]);
  assert.equal(h.has("U-A1"), false, "U-A1 must NOT match U-A1-ARCHETYPE-LABELER");
});

test("PREFIX NON-COLLISION: compound bridge prefix", () => {
  const h = verifyIdsInSubjects(["U-BRIDGE-LEARN-CAM"], ["[PSN-DORMANCY-AUDIT-MS0]/U-BRIDGE-LEARN-CAM-SFC: y"]);
  assert.equal(h.has("U-BRIDGE-LEARN-CAM"), false, "prefix of a longer compound id must not match");
});

test("longer id IS matched when it is the maximal token", () => {
  const h = verifyIdsInSubjects(["U-A1-ARCHETYPE-LABELER"], ["[MS]/U-A1-ARCHETYPE-LABELER: x"]);
  assert.ok(h.has("U-A1-ARCHETYPE-LABELER"));
});

test("token past 100 chars is still matched (note-slice regression)", () => {
  const longSubj = "[MAIN] [ACP-MS0]/P0-U05-FOLLOWUP: " + "x".repeat(80) + " then U-AIMAX11 lands here";
  const h = verifyIdsInSubjects(["U-AIMAX11"], [longSubj]);
  assert.ok(h.has("U-AIMAX11"), "a token beyond char 100 must still match");
  assert.match(h.get("U-AIMAX11"), /^U-AIMAX11 \|/);
});

test("subject with no U-* token -> no hit", () => {
  const h = verifyIdsInSubjects(["U-CK11"], ["[MS]/P0-U05-FOLLOWUP-HANDOFF: update handoff"]);
  assert.equal(h.size, 0);
});

test("case-insensitive id normalization", () => {
  const h = verifyIdsInSubjects(["u-ck11"], ["[MS]/U-CK11: x"]);
  assert.ok(h.has("U-CK11"));
});

test("multiple ids, first-match-wins note", () => {
  const h = verifyIdsInSubjects(["U-FOO", "U-BAR"], ["[MS]/U-FOO: a", "[MS]/U-FOO: dup", "[MS]/U-BAR: b"]);
  assert.equal(h.size, 2);
  assert.ok(h.get("U-FOO").includes(": a"));
});
