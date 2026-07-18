/**
 * ManagerDailyDashboardEngine — foreman/manager team rollup.
 *
 * Natural counterpart to EmployeeDailyDigestEngine: aggregates the digests of
 * the manager's direct reports into one team-view + adds manager-only signals:
 *   • team-coverage gaps (machines unstaffed, employees unqualified, overdue rest)
 *   • PTO requests awaiting THIS manager's approval
 *   • overdue management-review action items (the §9.3 action items where this
 *     manager is the owner)
 *   • team performance rollup (avg quality/throughput/safety/learning)
 *   • top-performer + needs-attention lists
 *
 * Pass-in pattern (no rebuild — pure transform over upstream signals).
 *
 * Hotel-soul invariants: PII-free (employee_id only), Object.frozen returns,
 * R12 fail-loud, audit-trail (generated_at).
 *
 * @module ManagerDailyDashboardEngine
 * @milestone HOTEL/U-MANAGER-DAILY-DASHBOARD (2026-05-25, slot:hotel iter21)
 */

export interface DirectReportSummary {
  employee_id: string;
  role: string | null;
  composite_score: number;       // 0..1 from EmployeePerformanceFeedbackEngine
  readiness_label: "early" | "developing" | "ready" | "promote_now" | null;
  has_today_shift: boolean;
  needs_attention_dims: ReadonlyArray<string>;  // e.g. ["quality", "safety"]
}

export interface PendingPTORequest {
  request_id: string;
  employee_id: string;
  category: "vacation" | "sick" | "personal";
  start_date: string;
  end_date: string;
  hours_requested: number;
  age_days: number;              // days since submission
}

export interface CoverageGapSummary {
  kind: "unstaffed_machine" | "unqualified_employee" | "double_booked" | "insufficient_rest";
  date: string;
  detail: string;
}

export interface OverdueActionItem {
  action_id: string;
  review_id: string;
  description: string;
  due_date: string;
  age_days: number;
}

export interface ManagerDashboardInput {
  manager_employee_id: string;
  as_of_date: string;             // YYYY-MM-DD
  direct_reports: ReadonlyArray<DirectReportSummary>;
  pending_pto_requests: ReadonlyArray<PendingPTORequest>;
  team_coverage_gaps: ReadonlyArray<CoverageGapSummary>;
  overdue_action_items: ReadonlyArray<OverdueActionItem>;
}

export interface TeamPerformanceRollup {
  n_reports: number;
  avg_composite: number;
  top_performer: { employee_id: string; score: number } | null;
  ready_for_promotion: ReadonlyArray<string>; // employee_ids with label "ready"|"promote_now"
  needs_attention: ReadonlyArray<{ employee_id: string; dim: string }>;
  pct_with_today_shift: number;
}

export interface ManagerDashboard {
  manager_employee_id: string;
  as_of_date: string;
  team_rollup: TeamPerformanceRollup;
  pending_pto_requests: ReadonlyArray<PendingPTORequest>;
  team_coverage_gaps: ReadonlyArray<CoverageGapSummary>;
  overdue_action_items: ReadonlyArray<OverdueActionItem>;
  top_priorities: ReadonlyArray<{
    rank: number;
    kind: "coverage_gap" | "pto_approval" | "action_item" | "team_alert";
    urgency: "info" | "warn" | "critical";
    headline: string;
  }>;
  generated_at: string;
}

class ManagerDailyDashboardEngine {
  buildDashboard(input: ManagerDashboardInput): ManagerDashboard {
    this.validate(input);
    const rollup = this.computeRollup(input.direct_reports);
    const priorities = this.computeTopPriorities(input);
    return Object.freeze({
      manager_employee_id: input.manager_employee_id,
      as_of_date: input.as_of_date,
      team_rollup: rollup,
      pending_pto_requests: Object.freeze(
        input.pending_pto_requests.map((r) => Object.freeze({ ...r })),
      ),
      team_coverage_gaps: Object.freeze(
        input.team_coverage_gaps.map((g) => Object.freeze({ ...g })),
      ),
      overdue_action_items: Object.freeze(
        input.overdue_action_items.map((a) => Object.freeze({ ...a })),
      ),
      top_priorities: Object.freeze(priorities.map((p) => Object.freeze(p))),
      generated_at: new Date().toISOString(),
    });
  }

  private computeRollup(reports: ReadonlyArray<DirectReportSummary>): TeamPerformanceRollup {
    if (reports.length === 0) {
      return Object.freeze({
        n_reports: 0,
        avg_composite: 0,
        top_performer: null,
        ready_for_promotion: Object.freeze([]),
        needs_attention: Object.freeze([]),
        pct_with_today_shift: 0,
      });
    }
    const avgComposite = reports.reduce((s, r) => s + r.composite_score, 0) / reports.length;
    const top = reports.reduce((best, r) => (r.composite_score > best.composite_score ? r : best));
    const readyForPromotion = reports
      .filter((r) => r.readiness_label === "ready" || r.readiness_label === "promote_now")
      .map((r) => r.employee_id);
    const needsAttention: { employee_id: string; dim: string }[] = [];
    for (const r of reports) {
      for (const d of r.needs_attention_dims) {
        needsAttention.push({ employee_id: r.employee_id, dim: d });
      }
    }
    const withShift = reports.filter((r) => r.has_today_shift).length;
    return Object.freeze({
      n_reports: reports.length,
      avg_composite: Number(avgComposite.toFixed(4)),
      top_performer: Object.freeze({ employee_id: top.employee_id, score: top.composite_score }),
      ready_for_promotion: Object.freeze(readyForPromotion),
      needs_attention: Object.freeze(needsAttention.map((n) => Object.freeze(n))),
      pct_with_today_shift: Number((withShift / reports.length).toFixed(4)),
    });
  }

  private computeTopPriorities(input: ManagerDashboardInput): ReadonlyArray<{
    rank: number;
    kind: "coverage_gap" | "pto_approval" | "action_item" | "team_alert";
    urgency: "info" | "warn" | "critical";
    headline: string;
  }> {
    type Candidate = {
      kind: "coverage_gap" | "pto_approval" | "action_item" | "team_alert";
      urgency: "info" | "warn" | "critical";
      headline: string;
      sortKey: number;
    };
    const cands: Candidate[] = [];

    // 1. Coverage gaps — unstaffed_machine is critical; others warn
    for (const g of input.team_coverage_gaps) {
      cands.push({
        kind: "coverage_gap",
        urgency: g.kind === "unstaffed_machine" ? "critical" : "warn",
        headline: `Coverage: ${g.detail}`,
        sortKey: g.kind === "unstaffed_machine" ? 0 : 10,
      });
    }

    // 2. Overdue action items — sortKey by age
    for (const a of input.overdue_action_items) {
      cands.push({
        kind: "action_item",
        urgency: a.age_days > 7 ? "critical" : "warn",
        headline: `Action ${a.action_id}: ${a.description} (overdue ${a.age_days}d)`,
        sortKey: a.age_days > 7 ? 1 : 12,
      });
    }

    // 3. Stale PTO requests (>3d unactioned = warn, >7d = critical)
    for (const r of input.pending_pto_requests) {
      let urgency: "info" | "warn" | "critical" = "info";
      let key = 20;
      if (r.age_days > 7) { urgency = "critical"; key = 2; }
      else if (r.age_days > 3) { urgency = "warn"; key = 15; }
      cands.push({
        kind: "pto_approval",
        urgency,
        headline: `PTO request ${r.request_id} from ${r.employee_id} (${r.category}, ${r.hours_requested}h, age ${r.age_days}d)`,
        sortKey: key,
      });
    }

    // 4. Team alert if avg composite < 0.55
    const rollup = this.computeRollup(input.direct_reports);
    if (rollup.n_reports >= 3 && rollup.avg_composite < 0.55) {
      cands.push({
        kind: "team_alert",
        urgency: "warn",
        headline: `Team avg composite ${(rollup.avg_composite * 100).toFixed(0)}% — review coaching strategy`,
        sortKey: 14,
      });
    }

    cands.sort((a, b) => a.sortKey - b.sortKey);
    return cands.slice(0, 5).map((c, i) => ({
      rank: i + 1,
      kind: c.kind,
      urgency: c.urgency,
      headline: c.headline,
    }));
  }

  private validate(input: ManagerDashboardInput): void {
    if (!input.manager_employee_id) {
      throw new Error("ManagerDailyDashboardEngine: manager_employee_id required");
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.as_of_date)) {
      throw new Error("ManagerDailyDashboardEngine: as_of_date must be ISO YYYY-MM-DD");
    }
    if (!Array.isArray(input.direct_reports) || !Array.isArray(input.pending_pto_requests) ||
        !Array.isArray(input.team_coverage_gaps) || !Array.isArray(input.overdue_action_items)) {
      throw new Error("ManagerDailyDashboardEngine: direct_reports/pending_pto/coverage_gaps/overdue_actions must be arrays");
    }
    for (const r of input.direct_reports) {
      if (!Number.isFinite(r.composite_score) || r.composite_score < 0 || r.composite_score > 1) {
        throw new Error(
          `ManagerDailyDashboardEngine: direct_report ${r.employee_id} composite_score must be in [0, 1]`,
        );
      }
    }
    for (const r of input.pending_pto_requests) {
      if (!Number.isFinite(r.age_days) || r.age_days < 0) {
        throw new Error(
          `ManagerDailyDashboardEngine: pto request ${r.request_id} age_days must be non-negative finite`,
        );
      }
    }
  }
}

export const managerDailyDashboardEngine = new ManagerDailyDashboardEngine();
