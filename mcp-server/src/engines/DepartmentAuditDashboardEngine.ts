/**
 * DepartmentAuditDashboardEngine (G7) — per-dept audit rollup.
 *
 * Consumes:
 *   • DepartmentEngine (G1) — dept roster + KPI rollup
 *   • KaizenLeanSigmaEngine — waste summary + open kaizen events
 *   • Existing audit engines (AuditEngine / InternalAuditCalendarEngine /
 *     NonConformanceAndCorrectiveActionEngine) — findings + open CAPA
 *
 * Produces: a per-dept audit dashboard row that the manager UI consumes for
 * the foreman daily rollup + the management-review monthly cycle.
 *
 * Hotel-soul invariants: PII-free, Object.frozen, R12 fail-loud.
 *
 * @module DepartmentAuditDashboardEngine
 * @milestone HOTEL/U-DEPT-AUDIT-DASHBOARD (2026-05-26, slot:hotel iter8 /goal Phase 3)
 */

export type AuditSeverity = "low" | "medium" | "high" | "critical";
export type CapaStatus = "open" | "in_progress" | "closed" | "verified";

export interface AuditFinding {
  finding_id: string;
  department_code: string;
  severity: AuditSeverity;
  raised_at: string;
  description: string;
  /** Linked CAPA (8D) id when remediation has been opened. */
  capa_id?: string;
}

export interface CapaRecord {
  capa_id: string;
  department_code: string;
  status: CapaStatus;
  opened_at: string;
  closed_at?: string;
  /** Linked DMAIC kaizen event id (G13 bridge). */
  kaizen_event_id?: string;
}

export interface DeptDashboardRow {
  department_code: string;
  manager_employee_id: string;
  member_count: number;
  oee_pct: number;
  on_time_delivery_pct: number;
  waste_count: number;
  open_kaizen_events: number;
  open_ncrs: number;
  /** Findings raised in the reporting window. */
  findings_count_by_severity: Readonly<Record<AuditSeverity, number>>;
  /** Open CAPAs (status != closed/verified). */
  open_capa_count: number;
  /** CAPAs overdue (opened > 30d ago, still open/in_progress). */
  overdue_capa_count: number;
  /** Audit health score 0..100 — higher = healthier. */
  audit_health_score: number;
  rationale: ReadonlyArray<string>;
  window_start: string;
  window_end: string;
}

export interface SystemVizRoost {
  engine_name: string;
  layer: number;
  node_type: "hub" | "sink" | "source" | "orphan" | "ghost" | "normal";
  psn_legs: ReadonlyArray<number>;
  edges_out: ReadonlyArray<string>;
  edges_in: ReadonlyArray<string>;
}

const ALLOWED_SEVERITIES = new Set<AuditSeverity>([
  "low", "medium", "high", "critical",
]);

const ALLOWED_CAPA_STATUSES = new Set<CapaStatus>([
  "open", "in_progress", "closed", "verified",
]);

const SEVERITY_WEIGHT: Readonly<Record<AuditSeverity, number>> = Object.freeze({
  low: 1, medium: 3, high: 8, critical: 20,
});

const CAPA_OVERDUE_DAYS = 30;

class DepartmentAuditDashboardEngine {
  /**
   * Build a per-dept dashboard row from injected snapshot inputs.
   * Pure function — caller provides KPI rollup + findings + CAPAs.
   */
  buildRow(args: {
    department_code: string;
    manager_employee_id: string;
    member_count: number;
    oee_pct: number;
    on_time_delivery_pct: number;
    waste_count: number;
    open_kaizen_events: number;
    open_ncrs: number;
    findings: ReadonlyArray<AuditFinding>;
    capas: ReadonlyArray<CapaRecord>;
    window_start: string;
    window_end: string;
    now_iso?: string;
  }): DeptDashboardRow {
    if (!args.department_code) {
      throw new Error("DepartmentAuditDashboardEngine.buildRow: department_code required");
    }
    if (!args.manager_employee_id) {
      throw new Error("DepartmentAuditDashboardEngine.buildRow: manager_employee_id required");
    }
    this.validatePct("oee_pct", args.oee_pct);
    this.validatePct("on_time_delivery_pct", args.on_time_delivery_pct);
    this.validateNonNeg("member_count", args.member_count);
    this.validateNonNeg("waste_count", args.waste_count);
    this.validateNonNeg("open_kaizen_events", args.open_kaizen_events);
    this.validateNonNeg("open_ncrs", args.open_ncrs);

    const now =
      args.now_iso !== undefined ? Date.parse(args.now_iso) : Date.now();
    if (!Number.isFinite(now)) {
      throw new Error(
        `DepartmentAuditDashboardEngine.buildRow: invalid now_iso '${args.now_iso}'`,
      );
    }

    // Findings — filter to dept + tally by severity
    const findingsBySev: Record<AuditSeverity, number> = {
      low: 0, medium: 0, high: 0, critical: 0,
    };
    for (const f of args.findings) {
      if (f.department_code !== args.department_code) continue;
      if (!ALLOWED_SEVERITIES.has(f.severity)) {
        throw new Error(
          `DepartmentAuditDashboardEngine.buildRow: finding '${f.finding_id}' invalid severity '${f.severity}'`,
        );
      }
      findingsBySev[f.severity]++;
    }

    // CAPAs — count open + overdue
    let openCapa = 0;
    let overdueCapa = 0;
    for (const c of args.capas) {
      if (c.department_code !== args.department_code) continue;
      if (!ALLOWED_CAPA_STATUSES.has(c.status)) {
        throw new Error(
          `DepartmentAuditDashboardEngine.buildRow: capa '${c.capa_id}' invalid status '${c.status}'`,
        );
      }
      if (c.status === "open" || c.status === "in_progress") {
        openCapa++;
        const openedMs = Date.parse(c.opened_at);
        if (Number.isFinite(openedMs)) {
          const ageDays = (now - openedMs) / 86_400_000;
          if (ageDays > CAPA_OVERDUE_DAYS) overdueCapa++;
        }
      }
    }

    // Audit health score:
    //   start at 100
    //   - sum(SEVERITY_WEIGHT × count) for each finding
    //   - 5 × overdue_capa
    //   - 2 × (open_kaizen - 1 if >1)  -- capped to not punish active improvement
    //   - 3 × open_ncrs
    //   floor at 0
    let score = 100;
    for (const sev of Object.keys(findingsBySev) as AuditSeverity[]) {
      score -= SEVERITY_WEIGHT[sev] * findingsBySev[sev];
    }
    score -= overdueCapa * 5;
    score -= args.open_ncrs * 3;
    if (args.open_kaizen_events > 1) {
      score -= (args.open_kaizen_events - 1) * 2;
    }
    score = Math.max(0, Math.min(100, score));

    const rationale: string[] = [];
    if (findingsBySev.critical > 0) {
      rationale.push(`${findingsBySev.critical} CRITICAL finding(s) drove ${findingsBySev.critical * SEVERITY_WEIGHT.critical} pt deduction`);
    }
    if (findingsBySev.high > 0) {
      rationale.push(`${findingsBySev.high} high finding(s) drove ${findingsBySev.high * SEVERITY_WEIGHT.high} pt deduction`);
    }
    if (overdueCapa > 0) {
      rationale.push(`${overdueCapa} overdue CAPA(s) (>${CAPA_OVERDUE_DAYS}d open) drove ${overdueCapa * 5} pt deduction`);
    }
    if (args.open_ncrs > 0) {
      rationale.push(`${args.open_ncrs} open NCR(s) drove ${args.open_ncrs * 3} pt deduction`);
    }
    if (rationale.length === 0) {
      rationale.push("no audit-health deductions in window — dept running clean");
    }

    return Object.freeze({
      department_code: args.department_code,
      manager_employee_id: args.manager_employee_id,
      member_count: args.member_count,
      oee_pct: args.oee_pct,
      on_time_delivery_pct: args.on_time_delivery_pct,
      waste_count: args.waste_count,
      open_kaizen_events: args.open_kaizen_events,
      open_ncrs: args.open_ncrs,
      findings_count_by_severity: Object.freeze(findingsBySev),
      open_capa_count: openCapa,
      overdue_capa_count: overdueCapa,
      audit_health_score: score,
      rationale: Object.freeze(rationale),
      window_start: args.window_start,
      window_end: args.window_end,
    });
  }

  systemVizRoost(): SystemVizRoost {
    return Object.freeze({
      engine_name: "DepartmentAuditDashboardEngine",
      layer: 7,
      node_type: "hub",
      psn_legs: Object.freeze([7, 11]),
      edges_out: Object.freeze(["ManagerDailyDashboardEngine", "ExecutiveSummaryEngine"]),
      edges_in: Object.freeze([
        "DepartmentEngine",
        "KaizenLeanSigmaEngine",
        "NonConformanceAndCorrectiveActionEngine",
        "AuditEngine",
        "InternalAuditCalendarEngine",
      ]),
    });
  }

  private validatePct(name: string, v: number): void {
    if (!Number.isFinite(v) || v < 0 || v > 100) {
      throw new Error(
        `DepartmentAuditDashboardEngine.buildRow: ${name} must be 0..100 (got ${v})`,
      );
    }
  }

  private validateNonNeg(name: string, v: number): void {
    if (!Number.isFinite(v) || v < 0) {
      throw new Error(
        `DepartmentAuditDashboardEngine.buildRow: ${name} must be finite non-negative (got ${v})`,
      );
    }
  }
}

export const departmentAuditDashboardEngine = new DepartmentAuditDashboardEngine();
