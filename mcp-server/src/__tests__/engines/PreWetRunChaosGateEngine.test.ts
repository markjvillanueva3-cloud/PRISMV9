/**
 * PreWetRunChaosGateEngine tests (U-LPR-CHAOS-DRILL)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  PreWetRunChaosGateEngine,
  MANDATORY_SCENARIOS,
  DEFAULT_ROLLBACK_BUDGET_MS,
  type ChaosScenarioId,
} from "../../engines/PreWetRunChaosGateEngine.js";

const HASH = "a1b2c3d4e5f6abcd";
let eng: PreWetRunChaosGateEngine;

function ok(scenario: ChaosScenarioId, latency = 20_000, id?: string) {
  return eng.recordExecution({
    execution_id: id ?? `X-${scenario}-${latency}`,
    bundle_hash: HASH,
    scenario_id: scenario,
    injected_at: 1_000,
    detected_at: 1_200,
    rollback_triggered_at: 1_500,
    rollback_completed_at: 1_500 + latency,
    evidence: `scenario ${scenario} rolled back cleanly`,
    operator: "qa-lead",
  });
}

beforeEach(() => {
  eng = new PreWetRunChaosGateEngine();
});

describe("budget + constants", () => {
  it("defaults to 60 000 ms", () => {
    expect(eng.getBudget()).toBe(DEFAULT_ROLLBACK_BUDGET_MS);
    expect(DEFAULT_ROLLBACK_BUDGET_MS).toBe(60_000);
  });

  it("mandatory set covers MTConnect loss, tenant collision, LoRA poison", () => {
    expect(MANDATORY_SCENARIOS).toContain("mtconnect_stream_loss");
    expect(MANDATORY_SCENARIOS).toContain("tenant_id_collision");
    expect(MANDATORY_SCENARIOS).toContain("lora_poison");
  });

  it("rejects non-positive budget", () => {
    expect(() => eng.setBudget(0)).toThrow(/>0/);
    expect(() => eng.setBudget(-100)).toThrow(/>0/);
  });

  it("rejects insane budget", () => {
    expect(() => eng.setBudget(1_000_000)).toThrow(/sanity ceiling/);
  });

  it("allows tightening the budget", () => {
    eng.setBudget(30_000);
    expect(eng.getBudget()).toBe(30_000);
  });
});

// ──────────────────────────────────────────────────────────────────────
// recordExecution outcome computation
// ──────────────────────────────────────────────────────────────────────

describe("recordExecution", () => {
  it("classifies passed when latency ≤ budget", () => {
    const ex = ok("mtconnect_stream_loss", 20_000);
    expect(ex.outcome).toBe("passed");
    expect(ex.latency_ms).toBe(20_000 + 500); // 1500 → 1500+20000 trigger_to_complete; injected=1000 → latency=20500
  });

  it("classifies failed_latency when latency > budget", () => {
    const ex = ok("mtconnect_stream_loss", 70_000);
    expect(ex.outcome).toBe("failed_latency");
  });

  it("classifies failed_no_detection when detected_at is missing", () => {
    const ex = eng.recordExecution({
      execution_id: "X1",
      bundle_hash: HASH,
      scenario_id: "tenant_id_collision",
      injected_at: 1000,
      evidence: "injected but no detection signal seen",
      operator: "q",
    });
    expect(ex.outcome).toBe("failed_no_detection");
    expect(ex.latency_ms).toBeUndefined();
  });

  it("classifies failed_no_rollback when rollback path never completed", () => {
    const ex = eng.recordExecution({
      execution_id: "X2",
      bundle_hash: HASH,
      scenario_id: "lora_poison",
      injected_at: 1000,
      detected_at: 1100,
      rollback_triggered_at: 1200,
      evidence: "detected + triggered but never completed",
      operator: "q",
    });
    expect(ex.outcome).toBe("failed_no_rollback");
  });

  it("rejects bad bundle_hash", () => {
    expect(() =>
      eng.recordExecution({
        execution_id: "X",
        bundle_hash: "nothex!!",
        scenario_id: "lora_poison",
        injected_at: 1,
        evidence: "xxxxxxxxxx",
        operator: "q",
      }),
    ).toThrow(/bundle_hash/);
  });

  it("rejects duplicate execution_id", () => {
    ok("lora_poison", 10_000, "DUP");
    expect(() => ok("lora_poison", 5_000, "DUP")).toThrow(/already recorded/);
  });

  it("rejects backwards rollback timestamp", () => {
    expect(() =>
      eng.recordExecution({
        execution_id: "X",
        bundle_hash: HASH,
        scenario_id: "lora_poison",
        injected_at: 5000,
        detected_at: 5001,
        rollback_triggered_at: 4000,
        rollback_completed_at: 4500,
        evidence: "bad timing data",
        operator: "q",
      }),
    ).toThrow(/cannot precede/);
  });

  it("rejects short evidence", () => {
    expect(() =>
      eng.recordExecution({
        execution_id: "X",
        bundle_hash: HASH,
        scenario_id: "lora_poison",
        injected_at: 1,
        evidence: "short",
        operator: "q",
      }),
    ).toThrow(/evidence/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Gate report
// ──────────────────────────────────────────────────────────────────────

describe("buildReport", () => {
  it("fails when no executions exist", () => {
    const r = eng.buildReport(HASH);
    expect(r.passed).toBe(false);
    expect(r.failure_reasons.length).toBe(MANDATORY_SCENARIOS.length);
  });

  it("fails when only 2 of 3 mandatory scenarios pass", () => {
    ok("mtconnect_stream_loss");
    ok("tenant_id_collision");
    const r = eng.buildReport(HASH);
    expect(r.passed).toBe(false);
    expect(r.failure_reasons.some((x) => x.includes("lora_poison"))).toBe(true);
  });

  it("passes when all mandatory scenarios have ≥1 passed execution within budget", () => {
    ok("mtconnect_stream_loss");
    ok("tenant_id_collision");
    ok("lora_poison");
    const r = eng.buildReport(HASH);
    expect(r.passed).toBe(true);
    expect(r.failure_reasons).toHaveLength(0);
  });

  it("picks best_latency = fastest passed run across multiple attempts", () => {
    ok("lora_poison", 50_000, "slow");
    ok("lora_poison", 10_000, "fast");
    ok("mtconnect_stream_loss");
    ok("tenant_id_collision");
    const r = eng.buildReport(HASH);
    const lora = r.scenarios.find((s) => s.scenario_id === "lora_poison")!;
    // 10_000 + 500 offset
    expect(lora.best_latency_ms).toBe(10_500);
    expect(r.passed).toBe(true);
  });

  it("fails if a mandatory scenario only has over-budget passed runs", () => {
    ok("mtconnect_stream_loss", 80_000);
    ok("tenant_id_collision");
    ok("lora_poison");
    const r = eng.buildReport(HASH);
    expect(r.passed).toBe(false);
    expect(r.failure_reasons.some((x) => x.includes("mtconnect_stream_loss"))).toBe(true);
  });

  it("does not require optional scenarios to have runs", () => {
    ok("mtconnect_stream_loss");
    ok("tenant_id_collision");
    ok("lora_poison");
    const r = eng.buildReport(HASH);
    const dispatcherStorm = r.scenarios.find((s) => s.scenario_id === "dispatcher_storm")!;
    expect(dispatcherStorm.executions).toBe(0);
    expect(dispatcherStorm.mandatory).toBe(false);
    expect(r.passed).toBe(true);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Token issuance
// ──────────────────────────────────────────────────────────────────────

describe("issueToken", () => {
  function passAll(): void {
    ok("mtconnect_stream_loss");
    ok("tenant_id_collision");
    ok("lora_poison");
  }

  it("refuses token for failing bundle", () => {
    ok("mtconnect_stream_loss");
    expect(() =>
      eng.issueToken({ bundle_hash: HASH, issued_by: "release-eng" }),
    ).toThrow(/gate not passed/);
  });

  it("issues token with deterministic signature", () => {
    passAll();
    const t1 = eng.issueToken({
      bundle_hash: HASH,
      issued_by: "release-eng",
      now: 2_000_000,
    });
    // New engine, same inputs → same signature
    const eng2 = new PreWetRunChaosGateEngine();
    ok.call(null); // no-op typing guard
    // Seed eng2 with identical data
    for (const s of MANDATORY_SCENARIOS) {
      eng2.recordExecution({
        execution_id: `X-${s}-20000`,
        bundle_hash: HASH,
        scenario_id: s,
        injected_at: 1_000,
        detected_at: 1_200,
        rollback_triggered_at: 1_500,
        rollback_completed_at: 21_500,
        evidence: `scenario ${s} rolled back cleanly`,
        operator: "qa-lead",
      });
    }
    const t2 = eng2.issueToken({
      bundle_hash: HASH,
      issued_by: "release-eng",
      now: 2_000_000,
    });
    expect(t1.signature).toBe(t2.signature);
    expect(t1.report_snapshot.passed).toBe(true);
    expect(/^[a-f0-9]{8}$/.test(t1.signature)).toBe(true);
  });

  it("rejects empty issuer", () => {
    passAll();
    expect(() => eng.issueToken({ bundle_hash: HASH, issued_by: "  " })).toThrow(/issued_by/);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Admin + stats
// ──────────────────────────────────────────────────────────────────────

describe("listExecutions + stats", () => {
  it("filters by bundle_hash, scenario_id, outcome", () => {
    ok("mtconnect_stream_loss", 10_000);
    ok("mtconnect_stream_loss", 80_000, "slow-mt");
    ok("tenant_id_collision");
    expect(eng.listExecutions({ scenario_id: "mtconnect_stream_loss" })).toHaveLength(2);
    expect(eng.listExecutions({ outcome: "failed_latency" })).toHaveLength(1);
    expect(eng.listExecutions({ bundle_hash: "no-match" })).toHaveLength(0);
  });

  it("stats aggregates totals + average passed latency", () => {
    ok("mtconnect_stream_loss", 10_000); // 10500
    ok("tenant_id_collision", 20_000);   // 20500
    ok("lora_poison", 30_000);           // 30500
    const s = eng.getStats();
    expect(s.total_executions).toBe(3);
    expect(s.executions_by_outcome.passed).toBe(3);
    // mean of 10500, 20500, 30500 = 20500
    expect(s.average_passed_latency_ms).toBe(20_500);
  });

  it("clearAll resets state + budget", () => {
    ok("mtconnect_stream_loss");
    eng.setBudget(30_000);
    eng.clearAll();
    expect(eng.getStats().total_executions).toBe(0);
    expect(eng.getBudget()).toBe(DEFAULT_ROLLBACK_BUDGET_MS);
  });
});
