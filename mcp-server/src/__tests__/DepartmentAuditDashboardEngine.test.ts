/**
 * DepartmentAuditDashboardEngine — happy/all-severities/CAPA-overdue/health-score
 * computation/cross-dept filter/R12 fail-loud/adversarial inputs.
 *
 * @milestone HOTEL/U-DEPT-AUDIT-DASHBOARD (2026-05-26, slot:hotel iter8 /goal Phase 3)
 */
import { describe, it, expect } from "vitest";
import {
  departmentAuditDashboardEngine,
  type AuditFinding,
  type CapaRecord,
} from "../engines/DepartmentAuditDashboardEngine.js";

const NOW = "2026-05-26T12:00:00.000Z";
const D30_AGO = "2026-04-25T12:00:00.000Z"; // exactly 31 days ago
const D5_AGO = "2026-05-21T12:00:00.000Z";

describe("DepartmentAuditDashboardEngine", () => {
  it("HAPPY PATH: clean dept scores 100", () => {
    const row = departmentAuditDashboardEngine.buildRow({
      department_code: "mill", manager_employee_id: "MGR-001",
      member_count: 8, oee_pct: 87, on_time_delivery_pct: 96,
      waste_count: 5, open_kaizen_events: 1, open_ncrs: 0,
      findings: [], capas: [],
      window_start: "2026-05-19T00:00:00.000Z",
      window_end: NOW, now_iso: NOW,
    });
    expect(row.audit_health_score).toBe(100);
    expect(row.open_capa_count).toBe(0);
    expect(row.overdue_capa_count).toBe(0);
    expect(row.rationale[0]).toContain("running clean");
  });

  it("CRITICAL finding drops score by 20", () => {
    const findings: AuditFinding[] = [
      { finding_id: "F-1", department_code: "mill", severity: "critical", raised_at: NOW, description: "x" },
    ];
    const row = departmentAuditDashboardEngine.buildRow({
      department_code: "mill", manager_employee_id: "MGR-001",
      member_count: 8, oee_pct: 87, on_time_delivery_pct: 96,
      waste_count: 0, open_kaizen_events: 1, open_ncrs: 0,
      findings, capas: [],
      window_start: "2026-05-19T00:00:00.000Z", window_end: NOW, now_iso: NOW,
    });
    expect(row.audit_health_score).toBe(80);
    expect(row.findings_count_by_severity.critical).toBe(1);
    expect(row.rationale.some((r) => r.includes("CRITICAL"))).toBe(true);
  });

  it("ALL 4 SEVERITIES tally correctly", () => {
    const findings: AuditFinding[] = [
      { finding_id: "F-1", department_code: "mill", severity: "low", raised_at: NOW, description: "x" },
      { finding_id: "F-2", department_code: "mill", severity: "medium", raised_at: NOW, description: "x" },
      { finding_id: "F-3", department_code: "mill", severity: "high", raised_at: NOW, description: "x" },
      { finding_id: "F-4", department_code: "mill", severity: "critical", raised_at: NOW, description: "x" },
    ];
    const row = departmentAuditDashboardEngine.buildRow({
      department_code: "mill", manager_employee_id: "MGR-001",
      member_count: 8, oee_pct: 87, on_time_delivery_pct: 96,
      waste_count: 0, open_kaizen_events: 1, open_ncrs: 0,
      findings, capas: [],
      window_start: "2026-05-19T00:00:00.000Z", window_end: NOW, now_iso: NOW,
    });
    // 100 - 1 - 3 - 8 - 20 = 68
    expect(row.audit_health_score).toBe(68);
    expect(row.findings_count_by_severity.low).toBe(1);
    expect(row.findings_count_by_severity.medium).toBe(1);
    expect(row.findings_count_by_severity.high).toBe(1);
    expect(row.findings_count_by_severity.critical).toBe(1);
  });

  it("CAPA OVERDUE: opened >30d ago + still open = overdue (5pt deduction each)", () => {
    const capas: CapaRecord[] = [
      { capa_id: "C-1", department_code: "mill", status: "open", opened_at: D30_AGO },
      { capa_id: "C-2", department_code: "mill", status: "in_progress", opened_at: D30_AGO },
      { capa_id: "C-3", department_code: "mill", status: "open", opened_at: D5_AGO }, // not overdue
      { capa_id: "C-4", department_code: "mill", status: "closed", opened_at: D30_AGO }, // closed = excluded
    ];
    const row = departmentAuditDashboardEngine.buildRow({
      department_code: "mill", manager_employee_id: "MGR-001",
      member_count: 8, oee_pct: 87, on_time_delivery_pct: 96,
      waste_count: 0, open_kaizen_events: 1, open_ncrs: 0,
      findings: [], capas,
      window_start: "2026-05-19T00:00:00.000Z", window_end: NOW, now_iso: NOW,
    });
    expect(row.open_capa_count).toBe(3); // 2 overdue + 1 fresh
    expect(row.overdue_capa_count).toBe(2);
    expect(row.audit_health_score).toBe(90); // 100 - 2*5
  });

  it("CROSS-DEPT FILTER: findings + capas for OTHER depts are excluded", () => {
    const findings: AuditFinding[] = [
      { finding_id: "F-1", department_code: "mill", severity: "high", raised_at: NOW, description: "x" },
      { finding_id: "F-2", department_code: "lathe", severity: "critical", raised_at: NOW, description: "x" },
    ];
    const capas: CapaRecord[] = [
      { capa_id: "C-1", department_code: "lathe", status: "open", opened_at: D30_AGO },
    ];
    const row = departmentAuditDashboardEngine.buildRow({
      department_code: "mill", manager_employee_id: "MGR-001",
      member_count: 8, oee_pct: 87, on_time_delivery_pct: 96,
      waste_count: 0, open_kaizen_events: 1, open_ncrs: 0,
      findings, capas,
      window_start: "2026-05-19T00:00:00.000Z", window_end: NOW, now_iso: NOW,
    });
    // Only mill F-1 (high=8) counts
    expect(row.audit_health_score).toBe(92);
    expect(row.findings_count_by_severity.critical).toBe(0);
    expect(row.open_capa_count).toBe(0);
  });

  it("open_kaizen_events > 1 penalty kicks in (signals ongoing churn)", () => {
    const row = departmentAuditDashboardEngine.buildRow({
      department_code: "mill", manager_employee_id: "MGR-001",
      member_count: 8, oee_pct: 87, on_time_delivery_pct: 96,
      waste_count: 0, open_kaizen_events: 4, open_ncrs: 0,
      findings: [], capas: [],
      window_start: "2026-05-19T00:00:00.000Z", window_end: NOW, now_iso: NOW,
    });
    // 100 - (4-1)*2 = 94
    expect(row.audit_health_score).toBe(94);
  });

  it("FLOOR: score cannot go negative", () => {
    const findings: AuditFinding[] = Array.from({ length: 10 }, (_, i) => ({
      finding_id: `F-${i}`, department_code: "mill", severity: "critical" as const, raised_at: NOW, description: "x",
    }));
    const row = departmentAuditDashboardEngine.buildRow({
      department_code: "mill", manager_employee_id: "MGR-001",
      member_count: 8, oee_pct: 50, on_time_delivery_pct: 50,
      waste_count: 0, open_kaizen_events: 1, open_ncrs: 99,
      findings, capas: [],
      window_start: "2026-05-19T00:00:00.000Z", window_end: NOW, now_iso: NOW,
    });
    expect(row.audit_health_score).toBe(0);
  });

  it("REJECTS missing department_code/manager (R12)", () => {
    expect(() =>
      departmentAuditDashboardEngine.buildRow({
        department_code: "", manager_employee_id: "MGR-001",
        member_count: 0, oee_pct: 0, on_time_delivery_pct: 0,
        waste_count: 0, open_kaizen_events: 0, open_ncrs: 0,
        findings: [], capas: [],
        window_start: NOW, window_end: NOW,
      }),
    ).toThrow(/department_code required/);
  });

  it("REJECTS adversarial NaN/>100 percentages (R12)", () => {
    expect(() =>
      departmentAuditDashboardEngine.buildRow({
        department_code: "mill", manager_employee_id: "MGR-001",
        member_count: 0, oee_pct: NaN, on_time_delivery_pct: 0,
        waste_count: 0, open_kaizen_events: 0, open_ncrs: 0,
        findings: [], capas: [],
        window_start: NOW, window_end: NOW,
      }),
    ).toThrow(/oee_pct/);
    expect(() =>
      departmentAuditDashboardEngine.buildRow({
        department_code: "mill", manager_employee_id: "MGR-001",
        member_count: 0, oee_pct: 0, on_time_delivery_pct: 150,
        waste_count: 0, open_kaizen_events: 0, open_ncrs: 0,
        findings: [], capas: [],
        window_start: NOW, window_end: NOW,
      }),
    ).toThrow(/on_time/);
  });

  it("REJECTS invalid severity / CAPA status (R12)", () => {
    expect(() =>
      departmentAuditDashboardEngine.buildRow({
        department_code: "mill", manager_employee_id: "MGR-001",
        member_count: 0, oee_pct: 80, on_time_delivery_pct: 80,
        waste_count: 0, open_kaizen_events: 0, open_ncrs: 0,
        findings: [{ finding_id: "F-X", department_code: "mill", severity: "bogus" as unknown as "low", raised_at: NOW, description: "x" }],
        capas: [],
        window_start: NOW, window_end: NOW,
      }),
    ).toThrow(/invalid severity/);
  });

  it("REJECTS invalid now_iso (R12)", () => {
    expect(() =>
      departmentAuditDashboardEngine.buildRow({
        department_code: "mill", manager_employee_id: "MGR-001",
        member_count: 0, oee_pct: 80, on_time_delivery_pct: 80,
        waste_count: 0, open_kaizen_events: 0, open_ncrs: 0,
        findings: [], capas: [],
        window_start: NOW, window_end: NOW, now_iso: "not-a-date",
      }),
    ).toThrow(/invalid now_iso/);
  });

  it("PSN roost: edges_in reference 5 audit-source engines", () => {
    const roost = departmentAuditDashboardEngine.systemVizRoost();
    expect(roost.layer).toBe(7);
    expect(roost.node_type).toBe("hub");
    expect(roost.psn_legs).toEqual([7, 11]);
    expect(roost.edges_in).toContain("DepartmentEngine");
    expect(roost.edges_in).toContain("KaizenLeanSigmaEngine");
    expect(roost.edges_in).toContain("NonConformanceAndCorrectiveActionEngine");
    expect(roost.edges_in).toContain("AuditEngine");
    expect(roost.edges_in).toContain("InternalAuditCalendarEngine");
  });
});
