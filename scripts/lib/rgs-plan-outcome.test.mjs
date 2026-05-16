/**
 * rgs-plan-outcome.test.mjs
 * TDD tests for extractOutcomes — ≥7 cases, NO weak asserts.
 * Run: "H:/.claude/bin/portable-node" --test scripts/lib/rgs-plan-outcome.test.mjs
 */

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { extractOutcomes } from "./rgs-plan-outcome.mjs";

// ---------------------------------------------------------------------------
// Fixed clock for deterministic ts assertions
// ---------------------------------------------------------------------------
const FIXED_NOW = "2026-05-15T12:00:00.000Z";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------
const pickedBase = {
  unitKey: "U-FOO-01",
  sid: "claude-test-abc",
  predictedPipelines: ["build-doctor", "test-runner"],
};

const ledgerPassEntry = {
  notes: "U-FOO-01 shipped cleanly, all tests green",
  opusReviewed: true,
  claudeReviewed: true,
  codexReviewed: true,
};

const ledgerFailEntry = {
  notes: "Some other review notes without the unit id",
  opusReviewed: false,
  claudeReviewed: false,
  codexReviewed: false,
};

// ---------------------------------------------------------------------------
// T1 — commit body match → shipped
// ---------------------------------------------------------------------------
describe("T1: unit id in commit body → shipped", () => {
  it("picked unit whose id appears in a commit body is classified shipped", () => {
    const results = extractOutcomes(
      {
        scrutinyLedger: [],
        commitBodies: ["[CAD-FUSION-LIVE-MS0]/U-FOO-01: ship the engine"],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    const r = results[0];
    assert.equal(r.v, 1);
    assert.equal(r.unitKey, "U-FOO-01");
    assert.equal(r.outcome, "shipped");
    assert.deepEqual(r.predictedPipelines, pickedBase.predictedPipelines);
    assert.equal(r.ts, FIXED_NOW);
  });
});

// ---------------------------------------------------------------------------
// T2 — ledger PASS note match → shipped
// ---------------------------------------------------------------------------
describe("T2: unit id in ledger PASS note → shipped", () => {
  it("picked unit whose id appears in a pass-flagged ledger note is classified shipped", () => {
    const results = extractOutcomes(
      {
        scrutinyLedger: [ledgerPassEntry],
        commitBodies: ["unrelated commit body, no unit id here"],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].outcome, "shipped");
  });
});

// ---------------------------------------------------------------------------
// T3 — revertedKeys match → reverted
// ---------------------------------------------------------------------------
describe("T3: unit id in revertedKeys → reverted", () => {
  it("picked unit in revertedKeys is classified reverted (not blocked)", () => {
    const results = extractOutcomes(
      {
        scrutinyLedger: [],
        commitBodies: ["no relevant commit"],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(["U-FOO-01"]),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].outcome, "reverted");
  });
});

// ---------------------------------------------------------------------------
// T4 — no terminal signal → blocked (survivorship guard)
// ---------------------------------------------------------------------------
describe("T4: no terminal signal → blocked (survivorship-bias guard)", () => {
  it("picked unit with no commit/ledger/revert signal is classified blocked", () => {
    const results = extractOutcomes(
      {
        scrutinyLedger: [],
        commitBodies: ["chore: update readme", "fix: lint warning"],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].outcome, "blocked");
    assert.equal(results[0].unitKey, "U-FOO-01");
  });
});

// ---------------------------------------------------------------------------
// T5 — CONTRAPOSITIVE: ship commit prevents blocked classification
// ---------------------------------------------------------------------------
describe("T5: contrapositive — shipped unit is NOT classified blocked", () => {
  it("unit with matching commit body must never be blocked", () => {
    const results = extractOutcomes(
      {
        scrutinyLedger: [],
        commitBodies: ["[SCOPE]/U-FOO-01: implement feature done"],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    assert.notEqual(results[0].outcome, "blocked");
    assert.equal(results[0].outcome, "shipped");
  });
});

// ---------------------------------------------------------------------------
// T6 — empty pickedEvents → empty result
// ---------------------------------------------------------------------------
describe("T6: empty pickedEvents → empty array", () => {
  it("no picked events produces no outcome records", () => {
    const results = extractOutcomes(
      {
        scrutinyLedger: [ledgerPassEntry],
        commitBodies: ["[SCOPE]/U-BAR-99: ship bar"],
        pickedEvents: [],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 0);
    assert.ok(Array.isArray(results));
  });
});

// ---------------------------------------------------------------------------
// T7 — commit body with no U-id contributes nothing
// ---------------------------------------------------------------------------
describe("T7: commit body without U-id contributes nothing to shipped set", () => {
  it("commits mentioning 'unit' or random caps but no U-[A-Z0-9-]+ pattern do not ship anything", () => {
    const results = extractOutcomes(
      {
        scrutinyLedger: [],
        commitBodies: [
          "chore: bump version to 2.0",
          "feat: new UNIT without the prefix",
          "fix: UTILS refactor",
        ],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    assert.equal(results[0].outcome, "blocked", "no U-id in commits → blocked");
  });
});

// ---------------------------------------------------------------------------
// T8 — ledger FAIL note does NOT ship even if it mentions the unit
// ---------------------------------------------------------------------------
describe("T8: ledger FAIL note does not classify as shipped", () => {
  it("a failed ledger entry that mentions the unit id does not produce shipped", () => {
    const failEntryWithId = {
      notes: "U-FOO-01 failed review — stub assertions detected",
      opusReviewed: false,
      claudeReviewed: false,
      codexReviewed: false,
    };

    const results = extractOutcomes(
      {
        scrutinyLedger: [failEntryWithId],
        commitBodies: [],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    // A failed review with unit mention must NOT be shipped
    assert.equal(results[0].outcome, "blocked");
  });
});

// ---------------------------------------------------------------------------
// T10 — isLedgerPass boundary: exactly 1 arm passing → NOT shipped
// (threshold is passCount >= 2; a single-arm pass must NOT clear the gate)
// ---------------------------------------------------------------------------
describe("T10: ledger with exactly 1 arm passing does NOT classify as shipped", () => {
  it("one-arm-pass ledger entry mentioning the unit id produces blocked, not shipped", () => {
    const oneArmPass = {
      notes: "U-FOO-01 reviewed by arm A only",
      opusReviewed: true,   // 1 arm
      claudeReviewed: false,
      codexReviewed: false,
    };

    const results = extractOutcomes(
      {
        scrutinyLedger: [oneArmPass],
        commitBodies: [],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    // passCount === 1 < threshold 2 → ledger path must NOT ship
    assert.equal(
      results[0].outcome,
      "blocked",
      "1-arm ledger pass must not clear the passCount >= 2 gate"
    );
  });
});

// ---------------------------------------------------------------------------
// T11 — isLedgerPass boundary: exactly 2 arms passing → shipped
// (threshold is passCount >= 2; two arms meet the minimum)
// ---------------------------------------------------------------------------
describe("T11: ledger with exactly 2 arms passing DOES classify as shipped", () => {
  it("two-arm-pass ledger entry mentioning the unit id produces shipped", () => {
    const twoArmPass = {
      notes: "U-FOO-01 reviewed by arms A and B",
      opusReviewed: true,   // arm A
      claudeReviewed: true, // arm B
      codexReviewed: false, // arm C absent — still meets passCount >= 2
    };

    const results = extractOutcomes(
      {
        scrutinyLedger: [twoArmPass],
        commitBodies: [],
        pickedEvents: [pickedBase],
        revertedKeys: new Set(),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 1);
    // passCount === 2 >= threshold 2 → ledger path ships the unit
    assert.equal(
      results[0].outcome,
      "shipped",
      "2-arm ledger pass meets passCount >= 2 and must classify as shipped"
    );
  });
});

// ---------------------------------------------------------------------------
// T9 — multiple picked events classified independently
// ---------------------------------------------------------------------------
describe("T9: multiple picked events classified independently", () => {
  it("two picked units get correct outcomes independently", () => {
    const picked2 = {
      unitKey: "U-BAR-02",
      sid: "claude-test-xyz",
      predictedPipelines: ["forge-team"],
    };

    const results = extractOutcomes(
      {
        scrutinyLedger: [],
        commitBodies: ["[SCOPE]/U-FOO-01: done"],
        pickedEvents: [pickedBase, picked2],
        revertedKeys: new Set(["U-BAR-02"]),
      },
      { now: FIXED_NOW }
    );

    assert.equal(results.length, 2);
    const fooResult = results.find((r) => r.unitKey === "U-FOO-01");
    const barResult = results.find((r) => r.unitKey === "U-BAR-02");
    assert.ok(fooResult, "U-FOO-01 must have result");
    assert.ok(barResult, "U-BAR-02 must have result");
    assert.equal(fooResult.outcome, "shipped");
    assert.equal(barResult.outcome, "reverted");
  });
});
