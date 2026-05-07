/**
 * RegressionBaselineEngine tests (U-LPR-REGRESSION-BASELINE)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  RegressionBaselineEngine,
  type BaselineEntry,
  type TestRun,
} from "../../engines/RegressionBaselineEngine.js";

let eng: RegressionBaselineEngine;

const SHA = (seed: string): string => (seed + "0".repeat(64)).slice(0, 64);

function baseline(overrides: Partial<BaselineEntry> = {}): BaselineEntry {
  return {
    test_id: "lathe.turn.roughing",
    expected_result_sha256: SHA("a1"),
    baseline_p95_ms: 100,
    sample_count: 50,
    frozen_at: 1_000_000,
    frozen_by: "qa-lead",
    ...overrides,
  };
}

function run(overrides: Partial<TestRun> = {}): TestRun {
  return {
    test_id: "lathe.turn.roughing",
    result_sha256: SHA("a1"),
    duration_ms: 90,
    passed: true,
    run_at: 2_000_000,
    ...overrides,
  };
}

beforeEach(() => {
  eng = new RegressionBaselineEngine();
});

// ──────────────────────────────────────────────────────────────────────
// freeze validation
// ──────────────────────────────────────────────────────────────────────

describe("freeze", () => {
  it("locks a non-empty baseline", () => {
    const n = eng.freeze([baseline()], "qa-lead");
    expect(n).toBe(1);
    expect(eng.listBaseline()).toHaveLength(1);
  });

  it("rejects empty baseline", () => {
    expect(() => eng.freeze([], "qa")).toThrow(/empty/);
  });

  it("rejects missing frozen_by", () => {
    expect(() => eng.freeze([baseline()], "  ")).toThrow(/frozen_by/);
  });

  it("rejects bad sha256", () => {
    expect(() =>
      eng.freeze([baseline({ expected_result_sha256: "ZZZ" })], "qa"),
    ).toThrow(/64-hex/);
  });

  it("rejects non-positive p95", () => {
    expect(() =>
      eng.freeze([baseline({ baseline_p95_ms: 0 })], "qa"),
    ).toThrow(/baseline_p95_ms/);
  });

  it("rejects duplicate test_id in batch", () => {
    expect(() =>
      eng.freeze([baseline(), baseline()], "qa"),
    ).toThrow(/duplicate/);
  });

  it("freeze replaces prior baseline", () => {
    eng.freeze([baseline()], "qa");
    eng.freeze([baseline({ test_id: "other.test", baseline_p95_ms: 50 })], "qa");
    expect(eng.getBaseline("lathe.turn.roughing")).toBeNull();
    expect(eng.getBaseline("other.test")).not.toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────
// quarantine
// ──────────────────────────────────────────────────────────────────────

describe("quarantine", () => {
  beforeEach(() => {
    eng.freeze([baseline()], "qa");
  });

  it("requires ≥20 char reason", () => {
    expect(() =>
      eng.quarantineTest({
        test_id: "lathe.turn.roughing",
        reason: "flaky",
        filed_at: 1,
        filed_by: "qa",
      }),
    ).toThrow(/reason/);
  });

  it("rejects quarantine of unknown test", () => {
    expect(() =>
      eng.quarantineTest({
        test_id: "unknown.test",
        reason: "this reason is long enough to pass the 20-char minimum",
        filed_at: 1,
        filed_by: "qa",
      }),
    ).toThrow(/not in baseline/);
  });

  it("rejects expires_at ≤ filed_at", () => {
    expect(() =>
      eng.quarantineTest({
        test_id: "lathe.turn.roughing",
        reason: "this reason is long enough to pass the 20-char minimum",
        filed_at: 1000,
        expires_at: 500,
        filed_by: "qa",
      }),
    ).toThrow(/expires_at/);
  });

  it("isQuarantined respects expires_at sunset", () => {
    eng.quarantineTest({
      test_id: "lathe.turn.roughing",
      reason: "this reason is long enough to pass the 20-char minimum",
      filed_at: 1_000,
      expires_at: 2_000,
      filed_by: "qa",
    });
    expect(eng.isQuarantined("lathe.turn.roughing", 1_500)).toBe(true);
    expect(eng.isQuarantined("lathe.turn.roughing", 2_500)).toBe(false);
  });

  it("liftQuarantine removes entry", () => {
    eng.quarantineTest({
      test_id: "lathe.turn.roughing",
      reason: "this reason is long enough to pass the 20-char minimum",
      filed_at: 1,
      filed_by: "qa",
    });
    expect(eng.liftQuarantine("lathe.turn.roughing")).toBe(true);
    expect(eng.isQuarantined("lathe.turn.roughing")).toBe(false);
  });

  it("listQuarantine excludes expired entries", () => {
    eng.quarantineTest({
      test_id: "lathe.turn.roughing",
      reason: "this reason is long enough to pass the 20-char minimum",
      filed_at: 1_000,
      expires_at: 2_000,
      filed_by: "qa",
    });
    expect(eng.listQuarantine(1_500)).toHaveLength(1);
    expect(eng.listQuarantine(2_500)).toHaveLength(0);
  });
});

// ──────────────────────────────────────────────────────────────────────
// evaluate — CI diff-gate
// ──────────────────────────────────────────────────────────────────────

describe("evaluate", () => {
  beforeEach(() => {
    eng.freeze([baseline()], "qa");
  });

  it("passes with matching hash + timing within budget", () => {
    const r = eng.evaluate([run({ duration_ms: 100 })]);
    expect(r.passed).toBe(true);
    expect(r.hard_breaches).toHaveLength(0);
  });

  it("hard-breaches RESULT_DIFF when hash mismatches", () => {
    const r = eng.evaluate([run({ result_sha256: SHA("bb") })]);
    expect(r.passed).toBe(false);
    expect(r.hard_breaches).toHaveLength(1);
    expect(r.hard_breaches[0].kind).toBe("RESULT_DIFF");
  });

  it("quarantined RESULT_DIFF downgraded to soft", () => {
    eng.quarantineTest({
      test_id: "lathe.turn.roughing",
      reason: "intentionally flaky pending refactor FOR-123",
      filed_at: 1,
      filed_by: "qa",
    });
    const r = eng.evaluate([run({ result_sha256: SHA("bb") })]);
    expect(r.passed).toBe(true);
    expect(r.soft_breaches).toHaveLength(1);
    expect(r.soft_breaches[0].kind).toBe("RESULT_DIFF");
  });

  it("soft TIMING_REGRESS within 1× budget", () => {
    // baseline 100ms, slowdown_cap = 120ms, hard_cap = 140ms
    const r = eng.evaluate([run({ duration_ms: 130 })]); // 130 > 120 but < 140
    expect(r.passed).toBe(true);
    expect(r.soft_breaches.some((b) => b.kind === "TIMING_REGRESS")).toBe(true);
  });

  it("hard TIMING_REGRESS beyond 2× budget", () => {
    const r = eng.evaluate([run({ duration_ms: 250 })]); // > 140ms hard cap
    expect(r.passed).toBe(false);
    expect(r.hard_breaches.some((b) => b.kind === "TIMING_REGRESS")).toBe(true);
  });

  it("tracks missing_tests and new_tests", () => {
    const r = eng.evaluate([run({ test_id: "new.test", result_sha256: SHA("c1") })]);
    expect(r.missing_tests).toContain("lathe.turn.roughing");
    expect(r.new_tests).toContain("new.test");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Flaky detection
// ──────────────────────────────────────────────────────────────────────

describe("FLAKY detection", () => {
  beforeEach(() => {
    eng.freeze([baseline()], "qa");
  });

  function runBatch(passRate: number, count: number): TestRun[] {
    const runs: TestRun[] = [];
    for (let i = 0; i < count; i++) {
      runs.push(
        run({
          passed: i / count < passRate,
          run_at: 1_000_000 + i,
        }),
      );
    }
    return runs;
  }

  it("flags test with >1 % fail rate over ≥100 runs", () => {
    const runs = runBatch(0.95, 100); // 5 % fail → definitely flaky
    const r = eng.evaluate(runs, { flaky_min_runs: 100 });
    const flaky = r.hard_breaches.find((b) => b.kind === "FLAKY");
    expect(flaky).toBeDefined();
  });

  it("skips flag when <100 runs available", () => {
    const runs = runBatch(0.5, 50);
    const r = eng.evaluate(runs, { flaky_min_runs: 100 });
    const flaky = r.hard_breaches.find((b) => b.kind === "FLAKY");
    expect(flaky).toBeUndefined();
  });

  it("quarantined flaky test stays hidden", () => {
    eng.quarantineTest({
      test_id: "lathe.turn.roughing",
      reason: "known flakiness tracked in JIRA FOR-999 pending fix",
      filed_at: 1,
      filed_by: "qa",
    });
    const runs = runBatch(0.9, 100);
    const r = eng.evaluate(runs, { flaky_min_runs: 100 });
    const flaky = r.hard_breaches.find((b) => b.kind === "FLAKY");
    expect(flaky).toBeUndefined();
  });

  it("rejects invalid flaky threshold", () => {
    expect(() =>
      eng.evaluate([], { flaky_threshold: 0 }),
    ).toThrow(/flaky_threshold/);
    expect(() =>
      eng.evaluate([], { flaky_threshold: 1.5 }),
    ).toThrow(/flaky_threshold/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// observedP95
// ──────────────────────────────────────────────────────────────────────

describe("observedP95", () => {
  it("computes R-7 quantile over recent buffer", () => {
    eng.freeze([baseline()], "qa");
    // 10 runs [10..100] → p95 R-7 = 9*0.95 = 8.55
    // sorted[8]=90, sorted[9]=100 → 90 + 0.55*10 = 95.5
    for (let i = 1; i <= 10; i++) {
      eng.recordRun(run({ duration_ms: i * 10, result_sha256: SHA("a1") }));
    }
    expect(eng.observedP95("lathe.turn.roughing")).toBeCloseTo(95.5, 5);
  });

  it("returns null for unknown test", () => {
    expect(eng.observedP95("missing")).toBeNull();
  });
});

// ──────────────────────────────────────────────────────────────────────
// Snapshot persistence
// ──────────────────────────────────────────────────────────────────────

describe("toSnapshot + loadSnapshot", () => {
  it("round-trips baseline + quarantine", () => {
    eng.freeze([baseline()], "qa");
    eng.quarantineTest({
      test_id: "lathe.turn.roughing",
      reason: "tracked in FOR-42 pending fix before next release window",
      filed_at: 1,
      filed_by: "qa",
    });
    const snap = eng.toSnapshot();
    expect(snap.schemaVersion).toBe(1);
    const eng2 = new RegressionBaselineEngine();
    eng2.loadSnapshot(snap);
    expect(eng2.listBaseline()).toHaveLength(1);
    expect(eng2.listQuarantine()).toHaveLength(1);
  });

  it("rejects unknown schemaVersion", () => {
    expect(() =>
      eng.loadSnapshot({
        schemaVersion: 99,
        baseline: [],
        quarantine: [],
      }),
    ).toThrow(/schemaVersion/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// recordRun validation
// ──────────────────────────────────────────────────────────────────────

describe("recordRun", () => {
  it("rejects bad sha256", () => {
    expect(() =>
      eng.recordRun(run({ result_sha256: "nothex" })),
    ).toThrow(/result_sha256/);
  });

  it("rejects negative duration", () => {
    expect(() =>
      eng.recordRun(run({ duration_ms: -1 })),
    ).toThrow(/duration_ms/);
  });
});
