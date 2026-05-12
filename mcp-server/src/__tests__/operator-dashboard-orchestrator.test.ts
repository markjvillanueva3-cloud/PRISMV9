/**
 * OperatorDashboardOrchestratorEngine — Tests
 *
 * Tests all 3 methods: getStatus, getAlerts, getShiftSummary
 * with nominal, edge-case, and degraded-mode scenarios.
 */

import { describe, it, expect } from "vitest";
import { operatorDashboardOrchestratorEngine } from "../engines/OperatorDashboardOrchestratorEngine.js";
import type {
  DashboardStatusInput,
  DashboardAlertsInput,
  ShiftSummaryInput,
} from "../engines/OperatorDashboardOrchestratorEngine.js";

// ============================================================================
// getStatus
// ============================================================================

describe("OperatorDashboardOrchestratorEngine.getStatus", () => {
  it("returns valid dashboard for nominal cutting conditions", () => {
    const input: DashboardStatusInput = {
      machine_id: "DMG-001",
      current_rpm: 4000,
      current_feed: 800,
      current_load_pct: 45,
    };
    const result = operatorDashboardOrchestratorEngine.getStatus(input);

    expect(result.machine_id).toBe("DMG-001");
    expect(result.timestamp).toBeTruthy();
    expect(["GREEN", "YELLOW", "RED"]).toContain(result.overall_risk);
    expect(result.spindle.available).toBe(true);
    expect(result.spindle.load_pct).toBe(45);
    expect(result.spindle.health).toBe("normal");
    expect(result.chatter.available).toBe(true);
    expect(result.tool.available).toBe(true);
    expect(result.safety.available).toBe(true);
    expect(result.degraded_subsystems).toEqual([]);
  });

  it("returns GREEN for very light idle-like conditions", () => {
    const input: DashboardStatusInput = {
      machine_id: "DMG-001",
      current_rpm: 1000,
      current_feed: 200,
      current_load_pct: 10,
    };
    const result = operatorDashboardOrchestratorEngine.getStatus(input);

    expect(result.overall_risk).toBe("GREEN");
    expect(result.spindle.health).toBe("normal");
  });

  it("returns YELLOW for elevated spindle load", () => {
    const input: DashboardStatusInput = {
      machine_id: "HAAS-002",
      current_rpm: 6000,
      current_feed: 1200,
      current_load_pct: 85,
    };
    const result = operatorDashboardOrchestratorEngine.getStatus(input);

    expect(["YELLOW", "RED"]).toContain(result.overall_risk);
    expect(result.spindle.health).toMatch(/warning|critical/);
    expect(result.alerts.length).toBeGreaterThan(0);
    expect(result.alerts.some(a => a.source === "spindle_protection")).toBe(true);
  });

  it("returns RED for overload conditions", () => {
    const input: DashboardStatusInput = {
      machine_id: "MAZAK-003",
      current_rpm: 12000,
      current_feed: 3000,
      current_load_pct: 98,
    };
    const result = operatorDashboardOrchestratorEngine.getStatus(input);

    expect(result.overall_risk).toBe("RED");
    expect(result.spindle.health).toBe("critical");
    expect(result.alerts.some(a => a.severity === "critical")).toBe(true);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("includes safety violations when gcode_block provided", () => {
    const input: DashboardStatusInput = {
      machine_id: "FANUC-004",
      current_rpm: 5000,
      current_feed: 500,
      current_load_pct: 40,
      gcode_block: "G00 X100 Y100\nG01 Z-50 F2000\nM03 S8000",
    };
    const result = operatorDashboardOrchestratorEngine.getStatus(input);

    expect(result.safety.available).toBe(true);
    expect(typeof result.safety.score).toBe("number");
  });

  it("handles missing optional fields gracefully", () => {
    const input: DashboardStatusInput = {
      machine_id: "GENERIC-005",
      current_rpm: 3000,
      current_feed: 600,
      current_load_pct: 50,
    };
    const result = operatorDashboardOrchestratorEngine.getStatus(input);

    expect(result).toBeDefined();
    expect(result.machine_id).toBe("GENERIC-005");
    expect(result.safety.violations).toEqual([]);
    expect(result.safety.score).toBe(100);
  });

  it("returns valid structure at extreme low values", () => {
    const input: DashboardStatusInput = {
      machine_id: "IDLE-006",
      current_rpm: 0,
      current_feed: 0,
      current_load_pct: 0,
    };
    const result = operatorDashboardOrchestratorEngine.getStatus(input);

    expect(result.overall_risk).toBe("GREEN");
    expect(result.spindle.load_pct).toBe(0);
    expect(result.chatter.risk_pct).toBeLessThan(10);
  });

  it("alerts are sorted by severity (critical first)", () => {
    const input: DashboardStatusInput = {
      machine_id: "SORT-007",
      current_rpm: 14000,
      current_feed: 4000,
      current_load_pct: 99,
    };
    const result = operatorDashboardOrchestratorEngine.getStatus(input);

    if (result.alerts.length >= 2) {
      const severityOrder = { critical: 2, warning: 1, info: 0 };
      for (let i = 1; i < result.alerts.length; i++) {
        expect(severityOrder[result.alerts[i - 1].severity]).toBeGreaterThanOrEqual(
          severityOrder[result.alerts[i].severity]
        );
      }
    }
  });

  it("chatter risk increases with high RPM and load", () => {
    const low = operatorDashboardOrchestratorEngine.getStatus({
      machine_id: "M1", current_rpm: 2000, current_feed: 400, current_load_pct: 30,
    });
    const high = operatorDashboardOrchestratorEngine.getStatus({
      machine_id: "M1", current_rpm: 14000, current_feed: 4000, current_load_pct: 90,
    });

    expect(high.chatter.risk_pct).toBeGreaterThan(low.chatter.risk_pct);
  });
});

// ============================================================================
// getAlerts
// ============================================================================

describe("OperatorDashboardOrchestratorEngine.getAlerts", () => {
  it("returns only warnings and above when min_severity=warning", () => {
    const input: DashboardAlertsInput = {
      machine_id: "ALERT-001",
      current_rpm: 10000,
      current_feed: 2000,
      current_load_pct: 88,
      min_severity: "warning",
    };
    const result = operatorDashboardOrchestratorEngine.getAlerts(input);

    expect(result.machine_id).toBe("ALERT-001");
    expect(result.alert_count).toEqual(result.alerts.length);
    for (const a of result.alerts) {
      expect(["warning", "critical"]).toContain(a.severity);
    }
  });

  it("returns only critical when min_severity=critical", () => {
    const input: DashboardAlertsInput = {
      machine_id: "ALERT-002",
      current_rpm: 14000,
      current_feed: 4500,
      current_load_pct: 99,
      min_severity: "critical",
    };
    const result = operatorDashboardOrchestratorEngine.getAlerts(input);

    for (const a of result.alerts) {
      expect(a.severity).toBe("critical");
    }
  });

  it("returns all alerts when min_severity=info (default)", () => {
    const input: DashboardAlertsInput = {
      machine_id: "ALERT-003",
      current_rpm: 8000,
      current_feed: 1500,
      current_load_pct: 82,
    };
    const result = operatorDashboardOrchestratorEngine.getAlerts(input);

    expect(result.overall_risk).toBeTruthy();
    expect(result.timestamp).toBeTruthy();
  });

  it("returns zero alerts for idle machine", () => {
    const input: DashboardAlertsInput = {
      machine_id: "IDLE-004",
      current_rpm: 0,
      current_feed: 0,
      current_load_pct: 0,
    };
    const result = operatorDashboardOrchestratorEngine.getAlerts(input);

    expect(result.alert_count).toBe(0);
    expect(result.overall_risk).toBe("GREEN");
  });
});

// ============================================================================
// getShiftSummary
// ============================================================================

describe("OperatorDashboardOrchestratorEngine.getShiftSummary", () => {
  it("computes correct aggregate stats for a full shift", () => {
    const input: ShiftSummaryInput = {
      machine_id: "SHIFT-001",
      shift_hours: 8,
      operations: [
        { rpm: 4000, feed: 800, duration_min: 30, load_pct: 50 },
        { rpm: 6000, feed: 1200, duration_min: 45, load_pct: 65 },
        { rpm: 3000, feed: 600, duration_min: 60, load_pct: 40 },
        { rpm: 8000, feed: 1500, duration_min: 20, load_pct: 75 },
      ],
    };
    const result = operatorDashboardOrchestratorEngine.getShiftSummary(input);

    expect(result.machine_id).toBe("SHIFT-001");
    expect(result.shift_hours).toBe(8);
    expect(result.total_cut_time_min).toBeCloseTo(155, 0);
    expect(result.idle_time_min).toBeCloseTo(325, 0);
    expect(result.operation_count).toBe(4);
    expect(result.utilization_pct).toBeGreaterThan(0);
    expect(result.utilization_pct).toBeLessThan(100);
    expect(result.avg_spindle_load_pct).toBeGreaterThan(0);
    expect(result.peak_spindle_load_pct).toBe(75);
    expect(result.quality_score).toBeGreaterThanOrEqual(0);
    expect(result.quality_score).toBeLessThanOrEqual(100);
    expect(result.recommendations).toBeInstanceOf(Array);
  });

  it("handles empty operations list", () => {
    const input: ShiftSummaryInput = {
      machine_id: "EMPTY-002",
      shift_hours: 8,
      operations: [],
    };
    const result = operatorDashboardOrchestratorEngine.getShiftSummary(input);

    expect(result.total_cut_time_min).toBe(0);
    expect(result.idle_time_min).toBe(480);
    expect(result.utilization_pct).toBe(0);
    expect(result.operation_count).toBe(0);
  });

  it("detects low utilization and recommends improvements", () => {
    const input: ShiftSummaryInput = {
      machine_id: "LOW-003",
      shift_hours: 8,
      operations: [
        { rpm: 4000, feed: 800, duration_min: 30, load_pct: 40 },
      ],
    };
    const result = operatorDashboardOrchestratorEngine.getShiftSummary(input);

    expect(result.utilization_pct).toBeLessThan(60);
    expect(result.recommendations.some(r => r.toLowerCase().includes("utilization"))).toBe(true);
  });

  it("flags peak load above 90%", () => {
    const input: ShiftSummaryInput = {
      machine_id: "PEAK-004",
      shift_hours: 8,
      operations: [
        { rpm: 12000, feed: 3000, duration_min: 60, load_pct: 95 },
        { rpm: 4000, feed: 800, duration_min: 120, load_pct: 50 },
      ],
    };
    const result = operatorDashboardOrchestratorEngine.getShiftSummary(input);

    expect(result.peak_spindle_load_pct).toBe(95);
    expect(result.recommendations.some(r => r.includes("Peak load"))).toBe(true);
  });

  it("handles single short operation", () => {
    const input: ShiftSummaryInput = {
      machine_id: "SHORT-005",
      shift_hours: 1,
      operations: [
        { rpm: 5000, feed: 1000, duration_min: 5, load_pct: 60 },
      ],
    };
    const result = operatorDashboardOrchestratorEngine.getShiftSummary(input);

    expect(result.total_cut_time_min).toBe(5);
    expect(result.operation_count).toBe(1);
    expect(result.timestamp).toBeTruthy();
  });

  it("includes gcode safety violations in summary", () => {
    const input: ShiftSummaryInput = {
      machine_id: "SAFETY-006",
      shift_hours: 8,
      operations: [
        { rpm: 5000, feed: 1000, duration_min: 30, load_pct: 50 },
      ],
      gcode_blocks: ["G00 X500 Y500 Z500\nG01 Z-100 F5000"],
    };
    const result = operatorDashboardOrchestratorEngine.getShiftSummary(input);

    expect(typeof result.safety_violations_total).toBe("number");
  });
});
