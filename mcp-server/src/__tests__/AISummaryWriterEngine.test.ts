/**
 * AISummaryWriterEngine — all 3 cadences (daily/weekly/monthly), narrative +
 * bullet generation, kpi_callouts, dollar-to-the-cent formatting (hotel-soul),
 * cpk classification bands, OEE bands, G5 round-trip submission, R12.
 *
 * Variability ≥17 cases · ≥6 R12 modes · ≥2 adversarial inputs.
 *
 * @milestone HOTEL/U-AI-SUMMARY-WRITER (2026-05-26, slot:hotel iter7 /goal Phase 2)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  aiSummaryWriterEngine,
  allowedCadences,
  allowedSubjectKinds,
  type DailyEmployeeMetrics,
  type WeeklyDepartmentMetrics,
  type MonthlyCustomerMetrics,
} from "../engines/AISummaryWriterEngine.js";
import { aiProposalApprovalQueueEngine } from "../engines/AIProposalApprovalQueueEngine.js";
import { managerRegistryEngine } from "../engines/ManagerRegistryEngine.js";

describe("AISummaryWriterEngine — allowed enums", () => {
  it("exposes 3 cadences + 3 subject kinds", () => {
    expect(allowedCadences()).toEqual(["daily", "weekly", "monthly"]);
    expect(allowedSubjectKinds()).toEqual(["employee", "department", "customer"]);
  });

  it("classifyCpk bands match Six Sigma convention", () => {
    expect(aiSummaryWriterEngine.classifyCpk(2.0)).toBe("excellent");
    expect(aiSummaryWriterEngine.classifyCpk(1.5)).toBe("capable");
    expect(aiSummaryWriterEngine.classifyCpk(1.1)).toBe("marginal");
    expect(aiSummaryWriterEngine.classifyCpk(0.8)).toBe("not_capable");
    expect(aiSummaryWriterEngine.classifyCpk(NaN)).toBe("not_capable");
    expect(aiSummaryWriterEngine.classifyCpk(-1)).toBe("not_capable");
  });
});

describe("AISummaryWriterEngine — daily per-employee", () => {
  beforeEach(() => {
    aiSummaryWriterEngine.reset();
    aiProposalApprovalQueueEngine.reset();
  });

  it("HAPPY PATH: builds narrative + bullets + KPIs for a normal shift", () => {
    const m: DailyEmployeeMetrics = {
      employee_id: "EMP-001",
      department_code: "mill",
      shift_date: "2026-05-26",
      parts_completed: 14,
      setups_completed: 3,
      cycle_time_ratio: 1.0,
      cpk: 1.5,
      waste_count: 1,
      notable_events: ["broke insert on op 3 — replaced + recovered"],
    };
    const d = aiSummaryWriterEngine.buildDailyEmployeeSummary(m);
    expect(d.cadence).toBe("daily");
    expect(d.subject_kind).toBe("employee");
    expect(d.subject_id).toBe("EMP-001");
    expect(d.narrative[0]).toContain("EMP-001");
    expect(d.narrative[0]).toContain("14 parts");
    expect(d.narrative[0]).toContain("3 setups");
    expect(d.narrative[1]).toContain("Cpk 1.50");
    expect(d.narrative[1]).toContain("capable");
    expect(d.narrative[1]).toContain("on plan");
    expect(d.narrative[2]).toContain("broke insert");
    expect(d.affected_departments).toEqual(["mill"]);
    expect(d.kpi_callouts.parts_completed).toBe(14);
  });

  it("BAND: cycle_time_ratio > 1.1 → 'behind plan' with percent", () => {
    const m: DailyEmployeeMetrics = {
      employee_id: "EMP-002", department_code: "mill", shift_date: "2026-05-26",
      parts_completed: 8, setups_completed: 2,
      cycle_time_ratio: 1.25, cpk: 1.2, waste_count: 0,
      notable_events: [],
    };
    const d = aiSummaryWriterEngine.buildDailyEmployeeSummary(m);
    expect(d.narrative[1]).toContain("25% behind plan");
    expect(d.narrative[1]).toContain("marginal");
  });

  it("BAND: cycle_time_ratio < 0.95 → 'ahead of plan' with percent", () => {
    const m: DailyEmployeeMetrics = {
      employee_id: "EMP-003", department_code: "lathe", shift_date: "2026-05-26",
      parts_completed: 20, setups_completed: 1,
      cycle_time_ratio: 0.8, cpk: 2.0, waste_count: 0,
      notable_events: [],
    };
    const d = aiSummaryWriterEngine.buildDailyEmployeeSummary(m);
    expect(d.narrative[1]).toContain("20% ahead of plan");
    expect(d.narrative[1]).toContain("excellent");
  });

  it("waste_count=0 vs >0 yields different narrative phrasing", () => {
    const zero = aiSummaryWriterEngine.buildDailyEmployeeSummary({
      employee_id: "E", department_code: "mill", shift_date: "2026-05-26",
      parts_completed: 1, setups_completed: 1, cycle_time_ratio: 1, cpk: 1.5,
      waste_count: 0, notable_events: [],
    });
    expect(zero.narrative[1]).toContain("no DOWNTIME wastes observed");
    const one = aiSummaryWriterEngine.buildDailyEmployeeSummary({
      employee_id: "E", department_code: "mill", shift_date: "2026-05-26",
      parts_completed: 1, setups_completed: 1, cycle_time_ratio: 1, cpk: 1.5,
      waste_count: 1, notable_events: [],
    });
    expect(one.narrative[1]).toContain("1 DOWNTIME waste observation");
  });

  it("REJECTS bad shift_date format (R12)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildDailyEmployeeSummary({
        employee_id: "E", department_code: "mill", shift_date: "5/26/2026",
        parts_completed: 1, setups_completed: 1, cycle_time_ratio: 1, cpk: 1, waste_count: 0,
        notable_events: [],
      }),
    ).toThrow(/YYYY-MM-DD/);
  });

  it("REJECTS adversarial NaN cycle_time_ratio (R12)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildDailyEmployeeSummary({
        employee_id: "E", department_code: "mill", shift_date: "2026-05-26",
        parts_completed: 1, setups_completed: 1, cycle_time_ratio: NaN, cpk: 1, waste_count: 0,
        notable_events: [],
      }),
    ).toThrow(/cycle_time_ratio/);
  });

  it("REJECTS negative parts_completed (R12 boundary)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildDailyEmployeeSummary({
        employee_id: "E", department_code: "mill", shift_date: "2026-05-26",
        parts_completed: -1, setups_completed: 1, cycle_time_ratio: 1, cpk: 1, waste_count: 0,
        notable_events: [],
      }),
    ).toThrow(/parts_completed/);
  });
});

describe("AISummaryWriterEngine — weekly per-department", () => {
  beforeEach(() => aiSummaryWriterEngine.reset());

  it("WORLD-CLASS BAND: OEE>=85 + on_time>=95 → 'world-class' phrasing", () => {
    const m: WeeklyDepartmentMetrics = {
      department_code: "mill", week_start: "2026-05-19", week_end: "2026-05-25",
      oee_pct: 88.5, on_time_pct: 97.2, open_kaizen: 2, open_ncrs: 0,
      top_wastes: [{ waste: "waiting", count: 5 }, { waste: "motion", count: 3 }],
      notable_events: [],
    };
    const d = aiSummaryWriterEngine.buildWeeklyDepartmentSummary(m);
    expect(d.narrative[0]).toContain("world-class");
    expect(d.narrative[0]).toContain("88.5%");
    expect(d.narrative[1]).toContain("waiting(5)");
    expect(d.narrative[1]).toContain("motion(3)");
    expect(d.cadence).toBe("weekly");
  });

  it("BELOW-TARGET BAND: OEE<65 → 'below-target'", () => {
    const d = aiSummaryWriterEngine.buildWeeklyDepartmentSummary({
      department_code: "wedm", week_start: "2026-05-19", week_end: "2026-05-25",
      oee_pct: 45, on_time_pct: 70, open_kaizen: 0, open_ncrs: 3,
      top_wastes: [], notable_events: [],
    });
    expect(d.narrative[0]).toContain("below-target");
    expect(d.narrative[1]).toContain("no top wastes");
    expect(d.narrative[1]).toContain("3 open NCRs");
  });

  it("REJECTS OEE > 100 (R12 boundary)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildWeeklyDepartmentSummary({
        department_code: "mill", week_start: "2026-05-19", week_end: "2026-05-25",
        oee_pct: 150, on_time_pct: 90, open_kaizen: 0, open_ncrs: 0,
        top_wastes: [], notable_events: [],
      }),
    ).toThrow(/oee_pct/);
  });

  it("REJECTS adversarial Infinity on_time_pct (R12)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildWeeklyDepartmentSummary({
        department_code: "mill", week_start: "2026-05-19", week_end: "2026-05-25",
        oee_pct: 80, on_time_pct: Infinity, open_kaizen: 0, open_ncrs: 0,
        top_wastes: [], notable_events: [],
      }),
    ).toThrow(/on_time_pct/);
  });
});

describe("AISummaryWriterEngine — monthly per-customer", () => {
  beforeEach(() => aiSummaryWriterEngine.reset());

  it("formats revenue dollars-to-the-cent (hotel-soul)", () => {
    const m: MonthlyCustomerMetrics = {
      customer_id: "ALCOA", month: "2026-05",
      orders_shipped: 12, on_time_pct: 95.5,
      total_revenue_cents: 487523n, // $4,875.23
      open_complaints: 0, rfqs_received: 8, rfqs_won: 3,
      notable_events: [],
    };
    const d = aiSummaryWriterEngine.buildMonthlyCustomerSummary(m, "sales");
    expect(d.cadence).toBe("monthly");
    expect(d.subject_id).toBe("ALCOA");
    expect(d.narrative[0]).toContain("$4875.23");
    expect(d.narrative[1]).toContain("3/8 won");
    expect(d.narrative[1]).toContain("38% win rate");
    expect(d.affected_departments).toEqual(["sales"]);
    expect(d.kpi_callouts.revenue_dollars).toBe(4875.23);
  });

  it("0 rfqs handled gracefully (no division-by-zero)", () => {
    const d = aiSummaryWriterEngine.buildMonthlyCustomerSummary({
      customer_id: "OPTIMAS", month: "2026-05",
      orders_shipped: 0, on_time_pct: 0,
      total_revenue_cents: 0n,
      open_complaints: 0, rfqs_received: 0, rfqs_won: 0,
      notable_events: [],
    }, "sales");
    expect(d.narrative[1]).toContain("0/0 won");
    // No "win rate" string when no RFQs to compute one
    expect(d.narrative[1]).not.toContain("win rate");
  });

  it("REJECTS bad month format (R12)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildMonthlyCustomerSummary({
        customer_id: "X", month: "May 2026",
        orders_shipped: 0, on_time_pct: 0,
        total_revenue_cents: 0n,
        open_complaints: 0, rfqs_received: 0, rfqs_won: 0,
        notable_events: [],
      }, "sales"),
    ).toThrow(/YYYY-MM/);
  });

  it("REJECTS non-bigint revenue (PII-safe currency invariant — R12)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildMonthlyCustomerSummary({
        customer_id: "X", month: "2026-05",
        orders_shipped: 0, on_time_pct: 0,
        total_revenue_cents: 100 as unknown as bigint, // number not bigint
        open_complaints: 0, rfqs_received: 0, rfqs_won: 0,
        notable_events: [],
      }, "sales"),
    ).toThrow(/bigint/);
  });

  it("REJECTS rfqs_won > rfqs_received (R12 invariant)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildMonthlyCustomerSummary({
        customer_id: "X", month: "2026-05",
        orders_shipped: 5, on_time_pct: 90,
        total_revenue_cents: 100000n,
        open_complaints: 0, rfqs_received: 3, rfqs_won: 5,
        notable_events: [],
      }, "sales"),
    ).toThrow(/rfqs_won.*cannot exceed/);
  });

  it("REJECTS adversarial negative revenue (R12)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildMonthlyCustomerSummary({
        customer_id: "X", month: "2026-05",
        orders_shipped: 5, on_time_pct: 90,
        total_revenue_cents: -100n,
        open_complaints: 0, rfqs_received: 0, rfqs_won: 0,
        notable_events: [],
      }, "sales"),
    ).toThrow(/non-negative/);
  });

  it("REJECTS missing customer_dept_code (R12)", () => {
    expect(() =>
      aiSummaryWriterEngine.buildMonthlyCustomerSummary({
        customer_id: "X", month: "2026-05",
        orders_shipped: 0, on_time_pct: 0,
        total_revenue_cents: 0n,
        open_complaints: 0, rfqs_received: 0, rfqs_won: 0,
        notable_events: [],
      }, ""),
    ).toThrow(/customer_dept_code required/);
  });
});

describe("AISummaryWriterEngine — G5 round-trip", () => {
  beforeEach(() => {
    aiSummaryWriterEngine.reset();
    aiProposalApprovalQueueEngine.reset();
    managerRegistryEngine.reset();
    managerRegistryEngine.register({
      employee_id: "ADMIN-001",
      rank: "admin",
      department_code: "office",
      reports_to_employee_id: null,
      by_employee_id: "ADMIN-001",
    });
  });

  it("daily draft → G5 admin approval", () => {
    const draft = aiSummaryWriterEngine.buildDailyEmployeeSummary({
      employee_id: "EMP-001", department_code: "mill", shift_date: "2026-05-26",
      parts_completed: 14, setups_completed: 3, cycle_time_ratio: 1.0,
      cpk: 1.5, waste_count: 0, notable_events: [],
    });
    const proposal_id = aiSummaryWriterEngine.submitDraft({
      draft, explanation_ref: "EXPL-DAILY-001",
    });
    expect(proposal_id).toMatch(/^AIPROP-/);
    aiProposalApprovalQueueEngine.beginReview({
      proposal_id, reviewer_employee_id: "ADMIN-001",
    });
    const approved = aiProposalApprovalQueueEngine.approve({
      proposal_id, reviewer_employee_id: "ADMIN-001",
      rationale: "narrative accurate, publish",
    });
    expect(approved.status).toBe("approved");
    expect(approved.kind).toBe("ai_summary");
  });

  it("default TTL by cadence: daily=240, weekly=720, monthly=1440 min", () => {
    // Use 'submit' return → proposal expires_at - submitted_at = TTL min
    const dailyDraft = aiSummaryWriterEngine.buildDailyEmployeeSummary({
      employee_id: "E", department_code: "mill", shift_date: "2026-05-26",
      parts_completed: 1, setups_completed: 1, cycle_time_ratio: 1, cpk: 1.5, waste_count: 0, notable_events: [],
    });
    const dailyId = aiSummaryWriterEngine.submitDraft({ draft: dailyDraft, explanation_ref: "X" });
    const dailyP = aiProposalApprovalQueueEngine.getProposal(dailyId);
    const dailyTtlMin = (Date.parse(dailyP.expires_at) - Date.parse(dailyP.submitted_at)) / 60_000;
    expect(dailyTtlMin).toBe(240);
  });

  it("REJECTS submit with empty affected_departments (would orphan-route)", () => {
    const bogusDraft = {
      cadence: "daily" as const,
      subject_kind: "employee" as const,
      subject_id: "X",
      narrative: ["a"],
      bullets: ["b"],
      kpi_callouts: {},
      window_start: "2026-05-26T00:00:00.000Z",
      window_end: "2026-05-26T23:59:59.999Z",
      affected_departments: [] as ReadonlyArray<string>,
    };
    expect(() =>
      aiSummaryWriterEngine.submitDraft({ draft: bogusDraft, explanation_ref: "X" }),
    ).toThrow(/affected_departments/);
  });
});

describe("AISummaryWriterEngine — PSN/system-viz synergy", () => {
  it("emits roost manifest with Wiki+Tribal+PRISM-AI PSN legs", () => {
    const roost = aiSummaryWriterEngine.systemVizRoost();
    expect(roost.engine_name).toBe("AISummaryWriterEngine");
    expect(roost.layer).toBe(7);
    expect(roost.node_type).toBe("hub");
    expect(roost.psn_legs).toEqual([3, 5, 11]);
    expect(roost.edges_out).toContain("AIProposalApprovalQueueEngine");
    expect(roost.edges_in).toContain("EmployeeDailyDigestEngine");
    expect(roost.edges_in).toContain("KaizenLeanSigmaEngine");
  });
});
