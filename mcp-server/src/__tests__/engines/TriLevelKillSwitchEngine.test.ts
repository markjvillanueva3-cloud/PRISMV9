/**
 * TriLevelKillSwitchEngine tests (U-LPR-KILL-SWITCH)
 *
 * Covers:
 *   - SLA config + validation
 *   - Trip recording + latency math
 *   - Dominance (L1 > L2 > L3 > OK)
 *   - Dispatcher gate closes only on L3
 *   - Reset: authorization + evidence + runbook flag
 *   - Compliance report: R-7 p95, pass/fail, violation rate
 */
import { describe, it, expect, beforeEach } from "vitest";
import { TriLevelKillSwitchEngine } from "../../engines/TriLevelKillSwitchEngine.js";

let eng: TriLevelKillSwitchEngine;

beforeEach(() => {
  eng = new TriLevelKillSwitchEngine();
});

// ──────────────────────────────────────────────────────────────────────
// Defaults + SLA
// ──────────────────────────────────────────────────────────────────────

describe("SLA configuration", () => {
  it("ships with plan-target defaults", () => {
    expect(eng.getSla("L1_PHYSICAL").ack_sla_ms).toBe(1000);
    expect(eng.getSla("L2_MTCONNECT").ack_sla_ms).toBe(500);
    expect(eng.getSla("L3_SOFTWARE").ack_sla_ms).toBe(2000);
  });

  it("L1 defaults to non-recoverable (workpiece must clear)", () => {
    expect(eng.getSla("L1_PHYSICAL").recoverable).toBe(false);
    expect(eng.getSla("L2_MTCONNECT").recoverable).toBe(true);
  });

  it("rejects non-positive sla", () => {
    expect(() => eng.setSla("L2_MTCONNECT", { ack_sla_ms: 0 })).toThrow(/ack_sla_ms/);
  });

  it("allows tightening the SLA", () => {
    eng.setSla("L2_MTCONNECT", { ack_sla_ms: 250 });
    expect(eng.getSla("L2_MTCONNECT").ack_sla_ms).toBe(250);
  });

  it("listSlas returns all three", () => {
    expect(eng.listSlas()).toHaveLength(3);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Trip + latency
// ──────────────────────────────────────────────────────────────────────

describe("trip recording", () => {
  it("records latency correctly when ack is after trip", () => {
    const t = 1_000_000;
    const ev = eng.trip({
      level: "L2_MTCONNECT",
      source: "mtconnect_alarm",
      reason: "collision predicted on Z-axis approach",
      tripped_at: t,
      now: t + 350,
    });
    expect(ev.ack_latency_ms).toBe(350);
    expect(ev.within_sla).toBe(true); // 350 < 500
  });

  it("flags SLA violation when latency exceeds budget", () => {
    const ev = eng.trip({
      level: "L2_MTCONNECT",
      source: "mtconnect_alarm",
      reason: "watchdog stall",
      tripped_at: 1000,
      now: 1600,
    });
    expect(ev.within_sla).toBe(false); // 600 > 500
  });

  it("rejects backwards-in-time ack", () => {
    expect(() =>
      eng.trip({
        level: "L3_SOFTWARE",
        source: "auto_rollback",
        reason: "p95 breach",
        tripped_at: 2000,
        now: 1000,
      }),
    ).toThrow(/precede tripped_at/);
  });

  it("rejects empty reason", () => {
    expect(() =>
      eng.trip({
        level: "L1_PHYSICAL",
        source: "operator",
        reason: "   ",
        tripped_at: 1,
        now: 2,
      }),
    ).toThrow(/reason required/);
  });

  it("attaches the correct runbook id per level", () => {
    const l1 = eng.trip({ level: "L1_PHYSICAL", source: "operator", reason: "e-stop", tripped_at: 1, now: 2 });
    const l2 = eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 1, now: 2 });
    const l3 = eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 1, now: 2 });
    expect(l1.runbook_id).toBe("RUNBOOK-L1-PHYSICAL-ESTOP");
    expect(l2.runbook_id).toBe("RUNBOOK-L2-MTCONNECT-FEEDHOLD");
    expect(l3.runbook_id).toBe("RUNBOOK-L3-AUTO-ROLLBACK");
  });
});

// ──────────────────────────────────────────────────────────────────────
// Dominance + gate
// ──────────────────────────────────────────────────────────────────────

describe("level dominance + dispatcher gate", () => {
  it("gate open when no trips", () => {
    expect(eng.getActiveState().level).toBe("OK");
    expect(eng.dispatcherGateOpen()).toBe(true);
  });

  it("L3 alone closes dispatcher gate", () => {
    eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 0, now: 1 });
    expect(eng.dispatcherGateOpen()).toBe(false);
    expect(eng.getActiveState().level).toBe("L3_SOFTWARE");
  });

  it("L1 dominates L3 in active state", () => {
    eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 0, now: 1 });
    eng.trip({ level: "L1_PHYSICAL", source: "operator", reason: "x", tripped_at: 10, now: 11 });
    expect(eng.getActiveState().level).toBe("L1_PHYSICAL");
  });

  it("L2 dominates L3 but not L1", () => {
    eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 0, now: 1 });
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 10, now: 11 });
    expect(eng.getActiveState().level).toBe("L2_MTCONNECT");
  });

  it("L1 trip does NOT automatically close dispatcher gate", () => {
    // L1 means the machine has already stopped itself; dispatcher may
    // still be queried by an incident-responder. Gate is strictly the
    // L3 software lock.
    eng.trip({ level: "L1_PHYSICAL", source: "operator", reason: "x", tripped_at: 0, now: 1 });
    expect(eng.dispatcherGateOpen()).toBe(true);
    expect(eng.getActiveState().gate_open).toBe(false); // overall state reflects L1
  });
});

// ──────────────────────────────────────────────────────────────────────
// Reset
// ──────────────────────────────────────────────────────────────────────

describe("reset", () => {
  it("clears the specified level's active trip", () => {
    eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 0, now: 1 });
    eng.reset({
      level: "L3_SOFTWARE",
      authorized_by: "incident-commander",
      evidence: "burn rate back to nominal for 30min",
      runbook_completed: true,
    });
    expect(eng.dispatcherGateOpen()).toBe(true);
  });

  it("rejects reset on inactive level", () => {
    expect(() =>
      eng.reset({
        level: "L1_PHYSICAL",
        authorized_by: "x",
        evidence: "no incident",
        runbook_completed: true,
      }),
    ).toThrow(/no active trip/);
  });

  it("rejects short evidence", () => {
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 0, now: 1 });
    expect(() =>
      eng.reset({
        level: "L2_MTCONNECT",
        authorized_by: "x",
        evidence: "ok",
        runbook_completed: true,
      }),
    ).toThrow(/≥10 chars/);
  });

  it("records incomplete-runbook reset for audit", () => {
    eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 0, now: 1 });
    const r = eng.reset({
      level: "L3_SOFTWARE",
      authorized_by: "ops-lead",
      evidence: "policy override approved by CTO",
      runbook_completed: false,
    });
    expect(r.runbook_completed).toBe(false);
    expect(eng.listResets()).toHaveLength(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Listing + stats
// ──────────────────────────────────────────────────────────────────────

describe("listTrips + stats", () => {
  it("filters by level and source", () => {
    eng.trip({ level: "L1_PHYSICAL", source: "operator", reason: "x", tripped_at: 0, now: 1 });
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 100, now: 200 });
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_watchdog", reason: "x", tripped_at: 1000, now: 1100 });
    expect(eng.listTrips({ level: "L2_MTCONNECT" })).toHaveLength(2);
    expect(eng.listTrips({ source: "operator" })).toHaveLength(1);
    expect(eng.listTrips({ since: 500 })).toHaveLength(1);
  });

  it("stats computes averages + violation counts", () => {
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 0, now: 200 });
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 0, now: 600 });
    const s = eng.getStats();
    expect(s.trips_by_level.L2_MTCONNECT).toBe(2);
    expect(s.average_ack_latency_ms_by_level.L2_MTCONNECT).toBe(400);
    expect(s.sla_violations).toBe(1); // 600 > 500
  });
});

// ──────────────────────────────────────────────────────────────────────
// Compliance report
// ──────────────────────────────────────────────────────────────────────

describe("compliance report", () => {
  it("returns zero violations when all trips within SLA", () => {
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 0, now: 100 });
    eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 0, now: 1500 });
    const r = eng.complianceReport();
    expect(r.overall_pass).toBe(true);
    expect(r.violation_rate).toBe(0);
  });

  it("computes R-7 p95 latency per level", () => {
    // 10 samples at 100,200,…,1000 ms → p95 = 950 by R-7.
    for (let i = 1; i <= 10; i++) {
      eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 0, now: i * 100 });
    }
    const r = eng.complianceReport();
    expect(r.per_level.L3_SOFTWARE.p95_latency_ms).toBeCloseTo(955, 0);
  });

  it("violation rate = violations / total", () => {
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 0, now: 100 });
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "x", tripped_at: 0, now: 700 });
    const r = eng.complianceReport();
    expect(r.violation_rate).toBeCloseTo(0.5);
    expect(r.overall_pass).toBe(false);
  });

  it("since filter excludes older trips", () => {
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "old", tripped_at: 0, now: 800 });
    eng.trip({ level: "L2_MTCONNECT", source: "mtconnect_alarm", reason: "new", tripped_at: 10000, now: 10100 });
    const r = eng.complianceReport(5000);
    expect(r.per_level.L2_MTCONNECT.trips).toBe(1);
  });
});

// ──────────────────────────────────────────────────────────────────────
// Admin
// ──────────────────────────────────────────────────────────────────────

describe("clearAll", () => {
  it("resets all state", () => {
    eng.trip({ level: "L3_SOFTWARE", source: "auto_rollback", reason: "x", tripped_at: 0, now: 1 });
    eng.clearAll();
    expect(eng.getStats().total_trips).toBe(0);
    expect(eng.getActiveState().level).toBe("OK");
  });
});
