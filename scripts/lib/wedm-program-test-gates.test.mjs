/**
 * Tests for the closed-loop test runner (Phase C of print->program).
 * node --test scripts/lib/wedm-program-test-gates.test.mjs
 */
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  runCascadeGate,
  envelopeGate,
  inventoryGate,
  wellFormedGate,
  composeProgramTestGates,
  runClosedLoopTest,
} from "./wedm-program-test-gates.mjs";

const SCHED = [
  "Pass 1 (rough): E1230, 0.12 ipm, H1 offset 0.0085 in",
  "Pass 2 (skim): E1240, 0.24 ipm, H2 offset 0.0064 in",
  "Pass 3 (skim): E1250, 0.21 ipm, H3 offset 0.0058 in",
].join("\n");
const AP003 = SCHED.replace("H3 offset 0.0058 in", "H3 offset 0.0090 in");

test("runCascadeGate — valid schedule passes; AP003 fails with a blocker", () => {
  assert.equal(runCascadeGate(SCHED).pass, true);
  const bad = runCascadeGate(AP003);
  assert.equal(bad.pass, false);
  assert.equal(bad.gate, "cascade_correctness");
  assert.ok(bad.blockers.some((b) => /AP003/.test(b)));
});

test("envelopeGate / inventoryGate — wrap engine results into gate shape", () => {
  assert.deepEqual(envelopeGate({ feasible: true, blockers: [] }), { gate: "feasibility", pass: true, blockers: [] });
  const inv = inventoryGate({ can_cut: false, blockers: ["wire 0.1mm not stocked"] });
  assert.equal(inv.gate, "inventory");
  assert.equal(inv.pass, false);
  assert.deepEqual(inv.blockers, ["wire 0.1mm not stocked"]);
});

test("composeProgramTestGates — ACCEPT only when every gate passes", () => {
  const allPass = composeProgramTestGates([
    { gate: "cascade_correctness", pass: true, blockers: [] },
    { gate: "feasibility", pass: true, blockers: [] },
    { gate: "inventory", pass: true, blockers: [] },
  ]);
  assert.equal(allPass.pass, true);
  assert.equal(allPass.passed, 3);
  assert.deepEqual(allPass.failed_gates, []);
});

test("composeProgramTestGates — one failing gate FAILS the program + collects blockers", () => {
  const r = composeProgramTestGates([
    { gate: "cascade_correctness", pass: true, blockers: [] },
    { gate: "inventory", pass: false, blockers: ["D2 raw stock not on hand"] },
    { gate: "discharge_safety", pass: false, blockers: ["S(x) 0.91 < 0.98"] },
  ]);
  assert.equal(r.pass, false);
  assert.deepEqual(r.failed_gates.sort(), ["discharge_safety", "inventory"]);
  assert.ok(r.blockers.some((b) => /inventory: D2 raw stock/.test(b)));
  assert.ok(r.blockers.some((b) => /discharge_safety: S\(x\)/.test(b)));
});

test("composeProgramTestGates — no gates => fail-safe (not a silent pass)", () => {
  const r = composeProgramTestGates([]);
  assert.equal(r.pass, false);
  assert.deepEqual(r.failed_gates, ["no_gates_run"]);
});

test("runClosedLoopTest — full stack: cascade(run) + injected gates compose to one verdict", () => {
  const r = runClosedLoopTest({
    scheduleText: SCHED,
    envelopeResult: { feasible: true, blockers: [] },
    inventoryResult: { can_cut: true, blockers: [] },
    safetyResult: { pass: true },
    postLintResult: { pass: true },
  });
  assert.equal(r.pass, true);
  assert.equal(r.total, 6); // cascade + well_formed + feasibility + inventory + safety + post_lint
});

test("runClosedLoopTest — a real AP003 program is REJECTED even if inventory+envelope ok", () => {
  const r = runClosedLoopTest({
    scheduleText: AP003,
    envelopeResult: { feasible: true, blockers: [] },
    inventoryResult: { can_cut: true, blockers: [] },
  });
  assert.equal(r.pass, false);
  assert.ok(r.failed_gates.includes("cascade_correctness"));
});

test("runClosedLoopTest — omitted gates are skipped, not failed", () => {
  const r = runClosedLoopTest({ scheduleText: SCHED }); // cascade + well_formed (text present)
  assert.equal(r.total, 2);
  assert.equal(r.pass, true);
});

test("wellFormedGate — clean cascade passes; garbled-with-valid-subsequence is REJECTED", () => {
  assert.equal(wellFormedGate(SCHED).pass, true);
  // a valid 2-pass cascade buried in lots of noise lines -> low coherence -> fail
  const noisy = [
    "Pass 1 (rough): E1230, 0.12 ipm, H1 offset 0.0085 in",
    "Pass 2 (skim): E1240, 0.24 ipm, H2 offset 0.0064 in",
    "blah blah wire_diameter stuff", "more noise 0.3 mm", "E125 (skim): garbled",
    "wire-0.5 mm; wire-0.5", "random tokens here", "and more filler text",
  ].join("\n");
  const g = wellFormedGate(noisy);
  assert.equal(g.pass, false);
  assert.equal(g.gate, "well_formed");
  assert.ok(g.blockers.some((b) => /coherence/.test(b)));
});

test("wellFormedGate — fewer than 2 pass-lines (prose) fails", () => {
  const prose = "To generate a toolpath we first define the geometry and then compute the passes.";
  const g = wellFormedGate(prose);
  assert.equal(g.pass, false);
  assert.ok(g.blockers.some((b) => /fewer than 2/.test(b)));
});

test("wellFormedGate — empty output fails (not a silent pass)", () => {
  assert.equal(wellFormedGate("").pass, false);
});
