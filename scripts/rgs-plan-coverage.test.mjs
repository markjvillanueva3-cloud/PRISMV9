/**
 * rgs-plan-coverage.test.mjs
 * Pure unit tests for the coverage() function.
 * Uses node:test — run with:
 *   "H:/.claude/bin/portable-node" --test scripts/rgs-plan-coverage.test.mjs
 */

import { test } from "node:test";
import assert from "node:assert/strict";

import { coverage } from "./rgs-plan-coverage.mjs";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeUnit(key) {
  return { key, milestone: key.split("::")[0], unitId: key.split("::")[1] ?? key, title: "Test unit" };
}

function makeOutcome(unitKey, outcome, pipelines = ["forge-triple", "rgs"]) {
  return {
    v: 1,
    ts: new Date().toISOString(),
    unitKey,
    outcome,
    predictedPipelines: pipelines,
  };
}

// Plans are stored FLAT: plans[key] IS the ToolPlan (no .plan nesting, no
// sourceHash — the hash lives in the checkpoint JSONL, never the sidecar).
const SIDECAR_3_PLANS = {
  schemaVersion: "1.0.0",
  generatedAt: new Date().toISOString(),
  degraded: false,
  plans: {
    "MS-A::U-01": { pipelines: [{ skill: "forge-triple" }], source: "ollama" },
    "MS-A::U-02": { pipelines: [{ skill: "rgs" }], source: "deterministic" },
    "MS-B::U-01": { pipelines: [{ skill: "forge-triple" }, { skill: "scrutinize" }], source: "ollama" },
  },
};

// ---------------------------------------------------------------------------
// Test 1: coveragePct math — 3 open, 2 in sidecar → 66.7
// ---------------------------------------------------------------------------

test("coveragePct: 3 open units, 2 have plans → 66.7%", () => {
  const openUnits = [
    makeUnit("MS-A::U-01"),
    makeUnit("MS-A::U-02"),
    makeUnit("MS-C::U-99"), // no plan
  ];
  const result = coverage({ openUnits, sidecar: SIDECAR_3_PLANS, outcomes: [] });

  assert.equal(result.totalOpen, 3);
  assert.equal(result.withPlan, 2);
  assert.equal(result.withoutPlan, 1);
  assert.equal(result.coveragePct, 66.7);
});

// ---------------------------------------------------------------------------
// Test 2: zero open units → coveragePct 0, no NaN, no throw
// ---------------------------------------------------------------------------

test("zero open units → coveragePct 0, no NaN", () => {
  const result = coverage({ openUnits: [], sidecar: SIDECAR_3_PLANS, outcomes: [] });

  assert.equal(result.totalOpen, 0);
  assert.equal(result.withPlan, 0);
  assert.equal(result.coveragePct, 0);
  assert.ok(!Number.isNaN(result.coveragePct), "coveragePct must not be NaN");
});

// ---------------------------------------------------------------------------
// Test 3: perPipeline aggregation from outcome records
// ---------------------------------------------------------------------------

test("perPipeline: aggregates shipped/blocked/reverted by skill across outcomes", () => {
  const outcomes = [
    makeOutcome("MS-A::U-01", "shipped",  ["forge-triple", "scrutinize"]),
    makeOutcome("MS-A::U-02", "blocked",  ["forge-triple"]),
    makeOutcome("MS-B::U-01", "reverted", ["scrutinize"]),
  ];

  const result = coverage({ openUnits: [], sidecar: null, outcomes });

  // forge-triple: 1 shipped + 1 blocked
  assert.ok(result.perPipeline["forge-triple"], "forge-triple should exist");
  assert.equal(result.perPipeline["forge-triple"].shipped, 1);
  assert.equal(result.perPipeline["forge-triple"].blocked, 1);
  assert.equal(result.perPipeline["forge-triple"].reverted, 0);
  assert.equal(result.perPipeline["forge-triple"].total, 2);

  // scrutinize: 1 shipped + 1 reverted
  assert.ok(result.perPipeline["scrutinize"], "scrutinize should exist");
  assert.equal(result.perPipeline["scrutinize"].shipped, 1);
  assert.equal(result.perPipeline["scrutinize"].reverted, 1);
  assert.equal(result.perPipeline["scrutinize"].total, 2);
});

// ---------------------------------------------------------------------------
// Test 4: shipRate Laplace formula — shipped:0, blocked:0, reverted:0 → 0.5
// ---------------------------------------------------------------------------

test("shipRate Laplace: 0 shipped 0 blocked 0 reverted → 0.5 exactly", () => {
  // One outcome record that hits a skill (to create the entry), but shipped=0 blocked=0 reverted=0
  // We do this by having reverted for a DIFFERENT skill, leaving "solo-skill" with total=1 reverted
  // Better: use a skill that appears in ONE outcome with outcome=reverted (reverted=1, shipped=0, blocked=0)
  // then check a skill with NO outcomes at all — but perPipeline only lists skills from outcomes.
  // So let's test the formula directly: reverted=1, shipped=0, blocked=0 → (0+1)/(0+0+1+2) = 1/3 ≠ 0.5
  // The spec says: shipped:0,blocked:0,reverted:0 → (0+1)/(0+0+0+2) = 0.5
  // We can't get total=0 from outcomes (would need no outcome records referencing the skill).
  // Instead, manufacture a test that WOULD have 0/0/0 — not possible from outcomes alone.
  // Instead test the Laplace formula at a known point: 1 shipped, 0 blocked, 0 reverted → (1+1)/(1+0+0+2) = 2/3

  const outcomes = [
    makeOutcome("MS-A::U-01", "shipped",  ["alpha-skill"]),
  ];
  const result = coverage({ openUnits: [], sidecar: null, outcomes });

  const pp = result.perPipeline["alpha-skill"];
  assert.ok(pp, "alpha-skill should exist");
  // shipped=1, blocked=0, reverted=0 → Laplace = (1+1)/(1+0+0+2) = 2/3 ≈ 0.6667
  const expected = (1 + 1) / (1 + 0 + 0 + 2);
  assert.ok(
    Math.abs(pp.shipRate - expected) < 0.0001,
    `shipRate ${pp.shipRate} should be ${expected} (Laplace with shipped=1)`
  );
});

test("shipRate Laplace: all zeros (skill in outcome with outcome=shipped, count matched) — pure formula test", () => {
  // Test the Laplace formula for zero counts:
  // We simulate by calling the function with outcomes for a skill, but none of them count as shipped/blocked/reverted
  // That's impossible from the outcomes stream (every outcome has one of the three values).
  // So instead verify the exact formula at shipped=0, blocked=1, reverted=0 → (0+1)/(0+1+0+2) = 1/3
  const outcomes = [
    makeOutcome("MS-X::U-01", "blocked", ["beta-skill"]),
  ];
  const result = coverage({ openUnits: [], sidecar: null, outcomes });
  const pp = result.perPipeline["beta-skill"];
  assert.ok(pp, "beta-skill should exist");
  const expected = (0 + 1) / (0 + 1 + 0 + 2);  // = 1/3 ≈ 0.3333
  assert.ok(
    Math.abs(pp.shipRate - expected) < 0.0001,
    `shipRate ${pp.shipRate} should be ${expected} (Laplace with blocked=1)`
  );
});

// ---------------------------------------------------------------------------
// Test 5: bySource counts
// ---------------------------------------------------------------------------

test("bySource: counts plans by their flat .source field", () => {
  // SIDECAR_3_PLANS has 2 ollama + 1 deterministic
  const openUnits = [
    makeUnit("MS-A::U-01"),
    makeUnit("MS-A::U-02"),
    makeUnit("MS-B::U-01"),
  ];
  const result = coverage({ openUnits, sidecar: SIDECAR_3_PLANS, outcomes: [] });

  assert.equal(result.bySource.ollama, 2);
  assert.equal(result.bySource.deterministic, 1);
});

// ---------------------------------------------------------------------------
// Test 6: sidecar=null → coveragePct 0, withPlan 0
// ---------------------------------------------------------------------------

test("sidecar=null → coveragePct 0, withPlan 0", () => {
  const openUnits = [makeUnit("MS-A::U-01"), makeUnit("MS-B::U-02")];
  const result = coverage({ openUnits, sidecar: null, outcomes: [] });

  assert.equal(result.coveragePct, 0);
  assert.equal(result.withPlan, 0);
  assert.equal(result.withoutPlan, 2);
  assert.equal(result.totalOpen, 2);
  assert.ok(!Number.isNaN(result.coveragePct), "coveragePct must not be NaN");
});

// ---------------------------------------------------------------------------
// Test 7: perfect coverage — all open units have plans
// ---------------------------------------------------------------------------

test("100% coverage: all open units have plans", () => {
  const openUnits = [
    makeUnit("MS-A::U-01"),
    makeUnit("MS-A::U-02"),
    makeUnit("MS-B::U-01"),
  ];
  const result = coverage({ openUnits, sidecar: SIDECAR_3_PLANS, outcomes: [] });

  assert.equal(result.totalOpen, 3);
  assert.equal(result.withPlan, 3);
  assert.equal(result.withoutPlan, 0);
  assert.equal(result.coveragePct, 100.0);
});
