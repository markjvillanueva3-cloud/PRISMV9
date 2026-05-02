/**
 * QualityDashboardAlertHook.test.ts — INTEL-OLLAMA-OBSIDIAN-MS0/P9-U03
 *
 * Coverage tests for the pure functions exported by .claude/hooks/
 * quality-dashboard-alert.mjs. The Stop/PreCompact hook itself emits
 * stdout/stderr; this file exercises the decision logic without
 * spawning a real session.
 *
 * Coverage matrix (per comprehensive-build floor):
 *   Happy:
 *     1. critical alert → block=true with that alert in `blocking`
 *     2. high alert     → advisory, block=false
 *     3. acked critical → moves to `acked`, block=false
 *     4. acked high     → moves to `acked`, block=false
 *
 *   Failure modes:
 *     5. snapshot=null            → block=false, has_snapshot=false
 *     6. snapshot.alerts undefined → block=false (treated as empty)
 *     7. malformed alert (no severity) → silently dropped, no crash
 *
 *   Adversarial:
 *     8. multiple alerts of mixed severity → exact partitioning
 *     9. duplicate alert keys (same severity|category|message)
 *        → both ack with one acks entry (key dedups)
 *    10. severity outside the known set ("medium", "info") → ignored
 *        (only critical/high participate in block/advisory)
 *
 * Invariants:
 *    11. blocking + advisory + acked counts ≤ snapshot.alerts.length
 *    12. alertKey is symmetric: rebuilding from .severity/category/message
 *        equals the original key
 */
import { describe, it, expect } from "vitest";
// @ts-expect-error — JS ESM hook with no .d.ts; we exercise the pure exports
import { alertKey, buildAlertReport } from "../../../.claude/hooks/quality-dashboard-alert.mjs";

interface RawAlert {
  severity: string;
  category: string;
  message: string;
  timestamp: string;
}

interface AlertReport {
  block: boolean;
  blocking: RawAlert[];
  advisory: RawAlert[];
  acked: RawAlert[];
  summary: string;
  has_snapshot: boolean;
}

const CRITICAL_REGRESSION: RawAlert = {
  severity: "critical",
  category: "regression",
  message: "System Q dropped from 0.85 to 0.65",
  timestamp: "2026-05-02T03:00:00.000Z",
};

const HIGH_TESTS: RawAlert = {
  severity: "high",
  category: "tests",
  message: "Test pass rate=0.82 below 0.95",
  timestamp: "2026-05-02T03:00:00.000Z",
};

const MEDIUM_SCHEMAS: RawAlert = {
  severity: "medium",
  category: "schemas",
  message: "Schema coverage=72% below 80%",
  timestamp: "2026-05-02T03:00:00.000Z",
};

const INFO_NOTE: RawAlert = {
  severity: "info",
  category: "general",
  message: "Snapshot computed",
  timestamp: "2026-05-02T03:00:00.000Z",
};

function snap(...alerts: RawAlert[]) {
  return { alerts };
}

describe("alertKey — composite key generator (P9-U03)", () => {
  it("composes severity|category|message and excludes timestamp", () => {
    const k = alertKey(CRITICAL_REGRESSION);
    expect(k).toBe("critical|regression|System Q dropped from 0.85 to 0.65");
    // Rebuild with a different timestamp produces the SAME key — that's the contract
    const k2 = alertKey({ ...CRITICAL_REGRESSION, timestamp: "2099-01-01T00:00:00Z" });
    expect(k2).toBe(k);
  });

  it("is symmetric: rebuild from fields equals original", () => {
    const k = alertKey(HIGH_TESTS);
    const parts = k.split("|");
    expect(parts).toHaveLength(3);
    expect(parts[0]).toBe(HIGH_TESTS.severity);
    expect(parts[1]).toBe(HIGH_TESTS.category);
    expect(parts[2]).toBe(HIGH_TESTS.message);
  });
});

describe("buildAlertReport — happy path (P9-U03)", () => {
  it("(1) critical alert → block=true with that alert in `blocking`", () => {
    const r = buildAlertReport(snap(CRITICAL_REGRESSION), null) as AlertReport;
    expect(r.block).toBe(true);
    expect(r.blocking).toHaveLength(1);
    expect(r.blocking[0].severity).toBe("critical");
    expect(r.advisory).toHaveLength(0);
    expect(r.acked).toHaveLength(0);
    expect(r.summary).toMatch(/CRITICAL/);
  });

  it("(2) high alert → advisory only, block=false", () => {
    const r = buildAlertReport(snap(HIGH_TESTS), null) as AlertReport;
    expect(r.block).toBe(false);
    expect(r.blocking).toHaveLength(0);
    expect(r.advisory).toHaveLength(1);
    expect(r.advisory[0].severity).toBe("high");
    expect(r.summary).toMatch(/HIGH/);
  });

  it("(3) acked critical → moves to `acked`, block=false", () => {
    const acks = { acks: { [alertKey(CRITICAL_REGRESSION)]: { ackedAt: "2026-05-02T03:01:00Z" } } };
    const r = buildAlertReport(snap(CRITICAL_REGRESSION), acks) as AlertReport;
    expect(r.block).toBe(false);
    expect(r.blocking).toHaveLength(0);
    expect(r.acked).toHaveLength(1);
    expect(r.acked[0].severity).toBe("critical");
    expect(r.summary).toMatch(/acknowledged/i);
  });

  it("(4) acked high → moves to `acked`, block=false", () => {
    const acks = { acks: { [alertKey(HIGH_TESTS)]: { ackedAt: "2026-05-02T03:01:00Z" } } };
    const r = buildAlertReport(snap(HIGH_TESTS), acks) as AlertReport;
    expect(r.block).toBe(false);
    expect(r.advisory).toHaveLength(0);
    expect(r.acked).toHaveLength(1);
    expect(r.acked[0].severity).toBe("high");
  });
});

describe("buildAlertReport — failure modes (P9-U03)", () => {
  it("(5) snapshot=null → block=false, has_snapshot=false, empty arrays", () => {
    const r = buildAlertReport(null, null) as AlertReport;
    expect(r.block).toBe(false);
    expect(r.has_snapshot).toBe(false);
    expect(r.blocking).toHaveLength(0);
    expect(r.advisory).toHaveLength(0);
    expect(r.acked).toHaveLength(0);
    expect(r.summary).toMatch(/no quality dashboard/i);
  });

  it("(6) snapshot.alerts undefined → block=false, treated as empty (has_snapshot=true since object received)", () => {
    const r = buildAlertReport({} as unknown as { alerts?: RawAlert[] }, null) as AlertReport;
    expect(r.block).toBe(false);
    // has_snapshot reflects "did we receive a snapshot object", not "are there alerts"
    expect(r.has_snapshot).toBe(true);
    expect(r.blocking).toHaveLength(0);
    expect(r.advisory).toHaveLength(0);
    expect(r.acked).toHaveLength(0);
  });

  it("(7) malformed alert (no severity field) is silently dropped, no crash", () => {
    const malformed = { category: "x", message: "y", timestamp: "z" } as unknown as RawAlert;
    const r = buildAlertReport(snap(malformed, CRITICAL_REGRESSION), null) as AlertReport;
    expect(r.blocking).toHaveLength(1); // only the well-formed one
    expect(r.blocking[0].category).toBe("regression");
  });
});

describe("buildAlertReport — adversarial (P9-U03)", () => {
  it("(8) mixed severities partition correctly", () => {
    const acks = { acks: { [alertKey(HIGH_TESTS)]: { ackedAt: "2026-05-02T03:01:00Z" } } };
    const r = buildAlertReport(
      snap(CRITICAL_REGRESSION, HIGH_TESTS, MEDIUM_SCHEMAS, INFO_NOTE),
      acks,
    ) as AlertReport;

    expect(r.blocking).toHaveLength(1); // critical, not acked
    expect(r.blocking[0].severity).toBe("critical");
    expect(r.advisory).toHaveLength(0); // the only high is acked
    expect(r.acked).toHaveLength(1);
    expect(r.acked[0].severity).toBe("high");
    expect(r.block).toBe(true); // critical present and not acked
  });

  it("(9) duplicate alerts share one ack — both move to acked", () => {
    const dup1 = { ...CRITICAL_REGRESSION, timestamp: "2026-05-02T03:00:00Z" };
    const dup2 = { ...CRITICAL_REGRESSION, timestamp: "2026-05-02T04:00:00Z" };
    const acks = { acks: { [alertKey(CRITICAL_REGRESSION)]: { ackedAt: "2026-05-02T03:01:00Z" } } };
    const r = buildAlertReport(snap(dup1, dup2), acks) as AlertReport;

    expect(r.acked).toHaveLength(2);
    expect(r.blocking).toHaveLength(0);
    expect(r.block).toBe(false);
  });

  it("(10) medium and info severities are ignored — only critical/high gate", () => {
    const r = buildAlertReport(snap(MEDIUM_SCHEMAS, INFO_NOTE), null) as AlertReport;
    expect(r.block).toBe(false);
    expect(r.blocking).toHaveLength(0);
    expect(r.advisory).toHaveLength(0);
    expect(r.acked).toHaveLength(0);
    expect(r.summary).toMatch(/no quality alerts/i);
  });
});

describe("buildAlertReport — invariants (P9-U03)", () => {
  it("(11) blocking + advisory + acked counts ≤ alerts.length", () => {
    const r = buildAlertReport(
      snap(CRITICAL_REGRESSION, HIGH_TESTS, MEDIUM_SCHEMAS, INFO_NOTE),
      null,
    ) as AlertReport;
    expect(r.blocking.length + r.advisory.length + r.acked.length).toBeLessThanOrEqual(4);
    // Specifically: 1 blocking + 1 advisory + 0 acked = 2 (medium + info dropped)
    expect(r.blocking.length + r.advisory.length + r.acked.length).toBe(2);
  });

  it("(12) blocking only contains critical-severity alerts", () => {
    const r = buildAlertReport(
      snap(CRITICAL_REGRESSION, HIGH_TESTS, CRITICAL_REGRESSION),
      null,
    ) as AlertReport;
    for (const a of r.blocking) expect(a.severity).toBe("critical");
    for (const a of r.advisory) expect(a.severity).toBe("high");
  });
});
