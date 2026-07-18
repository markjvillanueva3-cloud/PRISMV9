/**
 * Tests for the Phase D3 print->program generation grader.
 *   node --test scripts/eval-wedm-print2program.test.mjs
 *
 * Verifies INTENT (R9): a correct cascade generation is ACCEPTED, an AP003
 * (non-monotonic H-offset) generation is REJECTED even when other gates pass,
 * the "Toolpath type:" header is stripped before grading, and the fail-loud
 * accept-rate gate throws below floor / is report-only when floor is null.
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import { gradeGenerations, assertAcceptRate } from "./eval-wedm-print2program.mjs";

const GOOD = [
  "Pass 1 (rough): E1230, 0.12 ipm, H1 offset 0.0085 in",
  "Pass 2 (skim): E1240, 0.24 ipm, H2 offset 0.0064 in",
  "Pass 3 (skim): E1250, 0.21 ipm, H3 offset 0.0058 in",
].join("\n");
const AP003 = GOOD.replace("H3 offset 0.0058 in", "H3 offset 0.0090 in"); // H rises => invalid

test("a correct cascade generation is accepted; an AP003 one is rejected", () => {
  const r = gradeGenerations([
    { generated: GOOD },
    { generated: AP003 },
  ]);
  assert.equal(r.n, 2);
  assert.equal(r.accepted, 1);
  assert.equal(r.rejected, 1);
  assert.equal(r.accept_rate, 0.5);
  assert.equal(r.by_failed_gate.cascade_correctness, 1);
});

test("strips a 'Toolpath type:' header line before grading", () => {
  const r = gradeGenerations([{ output: "Toolpath type: straight_profile_multipass (family X).\n" + GOOD }]);
  assert.equal(r.accepted, 1);
});

test("a generation is rejected if ANY injected gate fails (inventory) even with a good cascade", () => {
  const r = gradeGenerations([
    { generated: GOOD, inventoryResult: { can_cut: false, blockers: ["0.10mm wire not stocked"] } },
  ]);
  assert.equal(r.accepted, 0);
  assert.equal(r.by_failed_gate.inventory, 1);
});

test("assertAcceptRate throws below floor, returns result at/above floor", () => {
  const r = gradeGenerations([{ generated: GOOD }, { generated: AP003 }]); // 0.5
  assert.throws(() => assertAcceptRate(r, 0.9), /accept_rate 0.500 < floor 0.9/);
  assert.equal(assertAcceptRate(r, 0.5), r); // exactly at floor passes
  assert.equal(assertAcceptRate(r, null), r); // report-only
});

test("empty generation set => accept_rate 0 and the gate throws", () => {
  const r = gradeGenerations([]);
  assert.equal(r.accept_rate, 0);
  assert.throws(() => assertAcceptRate(r, 0.5), /0 generations/);
});
