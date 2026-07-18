/**
 * ExecutiveSummaryEngine — C-suite weekly rollup, top of hotel dashboard hierarchy.
 *
 * Aggregates upstream inputs (passed in — no rebuild):
 *   - headcount + role distribution (from EmployeeRoleAcademyInjectionEngine)
 *   - team performance avg (from EmployeePerformanceFeedbackEngine via manager rollup)
 *   - week's payroll total (from EmployeePayrollGrossPayEngine reconciled grosses)
 *   - PTO usage rate (from EmployeePTOAccrualEngine)
 *   - open NCRs by severity (from NonConformanceEngine)
 *   - vendor tier mix (from VendorPerformanceTrackerEngine)
 *   - customer complaints triaged this week (from CustomerComplaintIntakeEngine)
 *
 * Emits 5 "red-flag" indicators if thresholds breached → owner attention list.
 *
 * Hotel-soul: PII-free aggregates (counts only, no names), Object.frozen, R12 fail-loud.
 *
 * @module ExecutiveSummaryEngine
 * @milestone HOTEL/U-EXECUTIVE-SUMMARY (2026-05-25, slot:hotel iter31 /yolo)
 */

export interface ExecutiveSummaryInput {
  week_ending_date: string;            // YYYY-MM-DD
  headcount: number;
  role_distribution: Readonly<Record<string, number>>;  // role → count
  team_avg_composite: number;          // 0..1
  payroll_total_cents: number;
  payroll_reconciliation_ok: boolean;
  pto_hours_used_this_week: number;
  pto_hours_balance_total: number;
  open_ncrs_critical: number;
  open_ncrs_major: number;
  open_ncrs_minor: number;
  vendor_tier_mix: Readonly<{ preferred: number; approved: number; probation: number; disqualified: number }>;
  complaints_this_week: number;
  complaints_critical_this_week: number;
}

export interface RedFlag {
  level: "warn" | "critical";
  domain: "hr" | "qa" | "finance" | "vendor" | "customer";
  metric: string;
  value: string;
  threshold: string;
}

export interface ExecutiveSummary {
  week_ending_date: string;
  headcount: number;
  role_distribution: Readonly<Record<string, number>>;
  team_avg_composite: number;
  payroll_total_cents: number;
  payroll_reconciliation_ok: boolean;
  pto_hours_used_this_week: number;
  pto_hours_balance_total: number;
  total_open_ncrs: number;
  open_ncrs_by_severity: Readonly<{ critical: number; major: number; minor: number }>;
  vendor_tier_mix: Readonly<{ preferred: number; approved: number; probation: number; disqualified: number }>;
  complaints_this_week: number;
  complaints_critical_this_week: number;
  red_flags: ReadonlyArray<RedFlag>;
  generated_at: string;
}

const TEAM_AVG_WARN = 0.60;
const TEAM_AVG_CRIT = 0.45;
const COMPLAINT_CRIT_THRESHOLD = 1; // ≥1 critical complaint in week = warn
const NCR_CRIT_THRESHOLD = 1;       // ≥1 open critical NCR = warn

class ExecutiveSummaryEngine {
  buildSummary(input: ExecutiveSummaryInput): ExecutiveSummary {
    this.validate(input);
    const totalOpen = input.open_ncrs_critical + input.open_ncrs_major + input.open_ncrs_minor;
    const flags = this.computeRedFlags(input);
    return Object.freeze({
      week_ending_date: input.week_ending_date,
      headcount: input.headcount,
      role_distribution: Object.freeze({ ...input.role_distribution }),
      team_avg_composite: input.team_avg_composite,
      payroll_total_cents: input.payroll_total_cents,
      payroll_reconciliation_ok: input.payroll_reconciliation_ok,
      pto_hours_used_this_week: input.pto_hours_used_this_week,
      pto_hours_balance_total: input.pto_hours_balance_total,
      total_open_ncrs: totalOpen,
      open_ncrs_by_severity: Object.freeze({
        critical: input.open_ncrs_critical,
        major: input.open_ncrs_major,
        minor: input.open_ncrs_minor,
      }),
      vendor_tier_mix: Object.freeze({ ...input.vendor_tier_mix }),
      complaints_this_week: input.complaints_this_week,
      complaints_critical_this_week: input.complaints_critical_this_week,
      red_flags: Object.freeze(flags.map((f) => Object.freeze(f))),
      generated_at: new Date().toISOString(),
    });
  }

  private computeRedFlags(input: ExecutiveSummaryInput): RedFlag[] {
    const out: RedFlag[] = [];
    if (input.team_avg_composite < TEAM_AVG_CRIT) {
      out.push({
        level: "critical", domain: "hr",
        metric: "team_avg_composite",
        value: `${(input.team_avg_composite * 100).toFixed(0)}%`,
        threshold: `${(TEAM_AVG_CRIT * 100).toFixed(0)}%`,
      });
    } else if (input.team_avg_composite < TEAM_AVG_WARN) {
      out.push({
        level: "warn", domain: "hr",
        metric: "team_avg_composite",
        value: `${(input.team_avg_composite * 100).toFixed(0)}%`,
        threshold: `${(TEAM_AVG_WARN * 100).toFixed(0)}%`,
      });
    }
    if (!input.payroll_reconciliation_ok) {
      out.push({
        level: "critical", domain: "finance",
        metric: "payroll_reconciliation_ok",
        value: "false",
        threshold: "true",
      });
    }
    if (input.open_ncrs_critical >= NCR_CRIT_THRESHOLD) {
      out.push({
        level: "critical", domain: "qa",
        metric: "open_ncrs_critical",
        value: String(input.open_ncrs_critical),
        threshold: `<${NCR_CRIT_THRESHOLD}`,
      });
    }
    if (input.complaints_critical_this_week >= COMPLAINT_CRIT_THRESHOLD) {
      out.push({
        level: "critical", domain: "customer",
        metric: "complaints_critical_this_week",
        value: String(input.complaints_critical_this_week),
        threshold: `<${COMPLAINT_CRIT_THRESHOLD}`,
      });
    }
    if (input.vendor_tier_mix.disqualified > 0) {
      out.push({
        level: "warn", domain: "vendor",
        metric: "vendor_tier_mix.disqualified",
        value: String(input.vendor_tier_mix.disqualified),
        threshold: "0",
      });
    }
    return out;
  }

  private validate(input: ExecutiveSummaryInput): void {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(input.week_ending_date)) {
      throw new Error("ExecutiveSummaryEngine: week_ending_date must be ISO YYYY-MM-DD");
    }
    if (!Number.isInteger(input.headcount) || input.headcount < 0) {
      throw new Error("ExecutiveSummaryEngine: headcount must be non-negative integer");
    }
    if (!Number.isFinite(input.team_avg_composite) ||
        input.team_avg_composite < 0 || input.team_avg_composite > 1) {
      throw new Error("ExecutiveSummaryEngine: team_avg_composite must be in [0, 1]");
    }
    if (!Number.isInteger(input.payroll_total_cents) || input.payroll_total_cents < 0) {
      throw new Error("ExecutiveSummaryEngine: payroll_total_cents must be non-negative integer");
    }
    const fields: Array<keyof ExecutiveSummaryInput> = [
      "open_ncrs_critical", "open_ncrs_major", "open_ncrs_minor",
      "complaints_this_week", "complaints_critical_this_week",
    ];
    for (const f of fields) {
      const v = input[f] as number;
      if (!Number.isInteger(v) || v < 0) {
        throw new Error(`ExecutiveSummaryEngine: ${f} must be non-negative integer`);
      }
    }
  }
}

export const executiveSummaryEngine = new ExecutiveSummaryEngine();
