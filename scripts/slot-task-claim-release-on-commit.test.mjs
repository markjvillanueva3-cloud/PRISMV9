// Tests for parseUnitsFromSubject — PER-SLOT-CLAIM-MS0/U-PSC04
// Run: node --test H:/prism/scripts/slot-task-claim-release-on-commit.test.mjs

import { test } from "node:test";
import assert from "node:assert/strict";
import { parseUnitsFromSubject } from "./slot-task-claim-release-on-commit.mjs";

test("parses basic [MILESTONE]/U-ID subject", () => {
  const r = parseUnitsFromSubject("[PER-SLOT-CLAIM-MS0]/U-PSC01: foo");
  assert.deepEqual(r, ["PER-SLOT-CLAIM-MS0::U-PSC01"]);
});

test("parses [MAIN] [SCOPE]/U-ID pattern (worktree-route prefix)", () => {
  const r = parseUnitsFromSubject("[MAIN] [PER-SLOT-CLAIM-MS0]/U-PSC01+U-PSC02: foo");
  // Two units joined by +
  assert.equal(r.length, 2);
  assert.ok(r.includes("PER-SLOT-CLAIM-MS0::U-PSC01"));
  assert.ok(r.includes("PER-SLOT-CLAIM-MS0::U-PSC02"));
});

test("expands combined unit-ids like U-A+U-B+U-C", () => {
  const r = parseUnitsFromSubject("[AUDIT-SYNERGY-MS0]/U-MEMORY-COMPRESS+PERSLOT-WRAP+MD2HTML: 5-unit synergy pass");
  assert.equal(r.length, 3);
  assert.ok(r.includes("AUDIT-SYNERGY-MS0::U-MEMORY-COMPRESS"));
  assert.ok(r.includes("AUDIT-SYNERGY-MS0::PERSLOT-WRAP"));
  assert.ok(r.includes("AUDIT-SYNERGY-MS0::MD2HTML"));
});

test("empty / null / non-string inputs return []", () => {
  assert.deepEqual(parseUnitsFromSubject(""), []);
  assert.deepEqual(parseUnitsFromSubject(null), []);
  assert.deepEqual(parseUnitsFromSubject(undefined), []);
  assert.deepEqual(parseUnitsFromSubject(42), []);
});

test("subjects with no [MILESTONE]/U-ID pattern return []", () => {
  assert.deepEqual(parseUnitsFromSubject("Initial commit"), []);
  assert.deepEqual(parseUnitsFromSubject("fix typo in readme"), []);
  assert.deepEqual(parseUnitsFromSubject("[lowercase-not-allowed]/U-X"), []);
});

test("deduplicates repeated unit-ids in same subject", () => {
  const r = parseUnitsFromSubject("[MS]/U-1+U-1: foo");
  assert.deepEqual(r, ["MS::U-1"]);
});

test("strips trailing colon notation from unit id", () => {
  const r = parseUnitsFromSubject("[MS]/U-1:detail: rest");
  assert.deepEqual(r, ["MS::U-1"]);
});

test("matches multiple [MILESTONE]/U-ID groups in one subject", () => {
  const r = parseUnitsFromSubject("[MS-A]/U-1 and also [MS-B]/U-99 combined");
  assert.equal(r.length, 2);
  assert.ok(r.includes("MS-A::U-1"));
  assert.ok(r.includes("MS-B::U-99"));
});

test("handles long subject with many tokens (hostile input bound)", () => {
  const long = "[MS]/" + "U-".repeat(50) + "X";
  const r = parseUnitsFromSubject(long);
  // The regex has {1,200} cap on the id chunk — should produce SOMETHING but
  // not crash. Either matches with trimmed chunks or returns empty.
  assert.ok(Array.isArray(r));
});

test("regex respects trailing-context boundaries (subject + body merge)", () => {
  // Multi-line: real git subjects are single-line but defensive check.
  const r = parseUnitsFromSubject("[MS-A]/U-1\n[MS-B]/U-2");
  // Both should parse since regex doesn't anchor to start/end.
  assert.equal(r.length, 2);
});
