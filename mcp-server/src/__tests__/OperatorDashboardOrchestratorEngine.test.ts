/**
 * OperatorDashboardOrchestratorEngine -- companion engine test (R15 completion
 * for U-OPDASH-ORCH-WIRE). Focuses on orchestrate() at the ENGINE level (the
 * method added this session); the pre-existing operator-dashboard-orchestrator.test.ts
 * covers getStatus/getAlerts/getShiftSummary. Engine-level (no dispatcher) so the
 * raw {sections_failed:[], shift_summary:null} shape is asserted directly (the
 * dispatcher's responseSlimmer is NOT in this path).
 */
import { describe, it, expect } from "vitest";
import { operatorDashboardOrchestratorEngine } from "../engines/OperatorDashboardOrchestratorEngine.js";

// High-load live signal -> deterministic CRITICAL spindle (load>95) + WARNING chatter (risk>60).
const HOT = { machine_id: "VMC-01", current_rpm: 12000, current_feed: 3000, current_load_pct: 96 };

describe("OperatorDashboardOrchestratorEngine.orchestrate", () => {
  it("composes the status + alerts sections (no shift context)", () => {
    const d = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT });
    expect(d.sections_available).toContain("status");
    expect(d.sections_available).toContain("alerts");
    expect(d.sections_failed).toEqual([]);
    expect(d.status).not.toBeNull();
    expect(d.shift_summary).toBeNull(); // no shift context supplied
  });

  it("surfaces a CRITICAL spindle + RED overall_risk at overload", () => {
    const d = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT });
    expect(d.status!.spindle.health).toBe("critical");
    expect(d.overall_risk).toBe("RED");
    expect(d.overall_risk).toBe(d.status!.overall_risk); // derived from status
  });

  it("default min_severity (info) -> alerts view equals the full status alert set", () => {
    const d = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT });
    expect(d.alerts!.alert_count).toBe(d.status!.alerts.length);
    expect(d.alerts!.alert_count).toBeGreaterThanOrEqual(2); // critical spindle + warning chatter
  });

  it("min_severity=critical filters the alerts view to criticals only (status alerts unchanged)", () => {
    const d = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT, min_severity: "critical" });
    expect(d.alerts!.alert_count).toBeLessThan(d.status!.alerts.length);
    expect(d.alerts!.alerts.every((a) => a.severity === "critical")).toBe(true);
  });

  it("an unknown min_severity coerces to info (never silently drops all alerts)", () => {
    const d = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT, min_severity: "bogus" as never });
    expect(d.alerts!.alert_count).toBe(d.status!.alerts.length);
  });

  it("adds the shift_summary section when shift context is supplied", () => {
    const d = operatorDashboardOrchestratorEngine.orchestrate({
      ...HOT,
      shift_hours: 8,
      operations: [
        { rpm: 8000, feed: 2000, duration_min: 120, load_pct: 70 },
        { rpm: 10000, feed: 2500, duration_min: 90, load_pct: 85 },
      ],
    });
    expect(d.sections_available).toContain("shift_summary");
    expect(d.shift_summary!.operation_count).toBe(2);
    expect(d.shift_summary!.utilization_pct).toBeGreaterThan(0);
  });

  it("fail-soft: a throwing section is recorded while the others still report", () => {
    // operations:[null] passes the array gate but throws inside getShiftSummary
    const d = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT, shift_hours: 8, operations: [null as never] });
    expect(d.sections_failed).toContain("shift_summary");
    expect(typeof d.errors.shift_summary).toBe("string");
    expect(d.shift_summary).toBeNull();
    expect(d.sections_available).toContain("status"); // graceful degradation
    expect(d.status).not.toBeNull();
  });

  it("shift gate: operations without shift_hours -> section skipped, not failed", () => {
    const d = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT, operations: [{ rpm: 8000, feed: 2000, duration_min: 60 }] });
    expect(d.shift_summary).toBeNull();
    expect(d.sections_available).not.toContain("shift_summary");
    expect(d.sections_failed).not.toContain("shift_summary");
  });

  it("rejects a missing machine_id", () => {
    expect(() => operatorDashboardOrchestratorEngine.orchestrate({ current_rpm: 1000, current_feed: 500, current_load_pct: 50 } as never)).toThrow();
  });

  it("rejects a non-finite live signal (would silently NaN the dashboard)", () => {
    expect(() => operatorDashboardOrchestratorEngine.orchestrate({ machine_id: "VMC-01", current_rpm: Number.NaN, current_feed: 500, current_load_pct: 50 })).toThrow();
    expect(() => operatorDashboardOrchestratorEngine.orchestrate({ machine_id: "VMC-01", current_rpm: 1000, current_feed: 500, current_load_pct: "fast" as never })).toThrow();
  });

  it("is deterministic in section availability for the same input", () => {
    const a = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT });
    const b = operatorDashboardOrchestratorEngine.orchestrate({ ...HOT });
    expect(a.sections_available).toEqual(b.sections_available);
    expect(a.overall_risk).toBe(b.overall_risk);
  });
});
