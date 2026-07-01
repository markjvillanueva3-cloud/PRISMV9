/**
 * ExecutiveSummaryEngine.test.ts — HOTEL/U-EXECUTIVE-SUMMARY (iter31 /yolo)
 */
import { describe, it, expect } from "vitest";
import { executiveSummaryEngine, type ExecutiveSummaryInput } from "../engines/ExecutiveSummaryEngine.js";

const BASE: ExecutiveSummaryInput = {
  week_ending_date: "2026-06-07",
  headcount: 12,
  role_distribution: { machinist: 4, operator: 3, programmer: 2, qa_lead: 1, foreman: 1, owner: 1 },
  team_avg_composite: 0.78,
  payroll_total_cents: 4_800_000, // $48K week
  payroll_reconciliation_ok: true,
  pto_hours_used_this_week: 32,
  pto_hours_balance_total: 1_240,
  open_ncrs_critical: 0,
  open_ncrs_major: 2,
  open_ncrs_minor: 5,
  vendor_tier_mix: { preferred: 4, approved: 8, probation: 1, disqualified: 0 },
  complaints_this_week: 1,
  complaints_critical_this_week: 0,
};

describe("ExecutiveSummaryEngine", () => {
  describe("Happy path — green-week summary", () => {
    it("returns no red flags when all metrics in target", () => {
      const s = executiveSummaryEngine.buildSummary(BASE);
      expect(s.red_flags).toHaveLength(0);
      expect(s.total_open_ncrs).toBe(7);
      expect(s.headcount).toBe(12);
      expect(Object.isFrozen(s)).toBe(true);
    });

    it("aggregates NCR severity correctly", () => {
      const s = executiveSummaryEngine.buildSummary(BASE);
      expect(s.open_ncrs_by_severity.major).toBe(2);
      expect(s.open_ncrs_by_severity.minor).toBe(5);
      expect(s.total_open_ncrs).toBe(7);
    });
  });

  describe("Red-flag triggers — variability across all 5 domains", () => {
    it("team_avg < 0.60 → warn HR flag", () => {
      const s = executiveSummaryEngine.buildSummary({ ...BASE, team_avg_composite: 0.55 });
      const hr = s.red_flags.find((f) => f.domain === "hr");
      expect(hr).toMatchObject({ level: "warn", domain: "hr", metric: "team_avg_composite" });
    });

    it("team_avg < 0.45 → critical HR flag", () => {
      const s = executiveSummaryEngine.buildSummary({ ...BASE, team_avg_composite: 0.40 });
      const hr = s.red_flags.find((f) => f.domain === "hr");
      expect(hr?.level).toBe("critical");
    });

    it("payroll reconciliation FAIL → critical finance flag", () => {
      const s = executiveSummaryEngine.buildSummary({ ...BASE, payroll_reconciliation_ok: false });
      const fin = s.red_flags.find((f) => f.domain === "finance");
      expect(fin).toMatchObject({ level: "critical", metric: "payroll_reconciliation_ok" });
    });

    it("≥1 open critical NCR → critical QA flag", () => {
      const s = executiveSummaryEngine.buildSummary({ ...BASE, open_ncrs_critical: 2 });
      const qa = s.red_flags.find((f) => f.domain === "qa");
      expect(qa).toMatchObject({ level: "critical", metric: "open_ncrs_critical", value: "2" });
    });

    it("≥1 critical complaint this week → critical customer flag", () => {
      const s = executiveSummaryEngine.buildSummary({ ...BASE, complaints_critical_this_week: 1 });
      const cust = s.red_flags.find((f) => f.domain === "customer");
      expect(cust?.level).toBe("critical");
    });

    it("disqualified vendor in mix → warn vendor flag", () => {
      const s = executiveSummaryEngine.buildSummary({
        ...BASE,
        vendor_tier_mix: { preferred: 3, approved: 7, probation: 1, disqualified: 2 },
      });
      const v = s.red_flags.find((f) => f.domain === "vendor");
      expect(v).toMatchObject({ level: "warn", value: "2" });
    });

    it("compound red-flag week — multiple domains flag simultaneously", () => {
      const s = executiveSummaryEngine.buildSummary({
        ...BASE,
        team_avg_composite: 0.40,
        payroll_reconciliation_ok: false,
        open_ncrs_critical: 3,
        complaints_critical_this_week: 2,
        vendor_tier_mix: { preferred: 2, approved: 5, probation: 4, disqualified: 1 },
      });
      const domains = new Set(s.red_flags.map((f) => f.domain));
      expect(domains.size).toBe(5); // all 5 domains flagged
      expect(s.red_flags.filter((f) => f.level === "critical").length).toBeGreaterThanOrEqual(4);
    });
  });

  describe("R12 input validation", () => {
    it("throws on bad date format", () => {
      expect(() =>
        executiveSummaryEngine.buildSummary({ ...BASE, week_ending_date: "this week" }),
      ).toThrow(/week_ending_date must be ISO/);
    });

    it("throws on out-of-range team_avg", () => {
      expect(() =>
        executiveSummaryEngine.buildSummary({ ...BASE, team_avg_composite: 1.5 }),
      ).toThrow(/team_avg_composite must be in/);
    });

    it("throws on NaN team_avg", () => {
      expect(() =>
        executiveSummaryEngine.buildSummary({ ...BASE, team_avg_composite: Number.NaN }),
      ).toThrow(/team_avg_composite must be in/);
    });

    it("throws on negative headcount", () => {
      expect(() =>
        executiveSummaryEngine.buildSummary({ ...BASE, headcount: -1 }),
      ).toThrow(/headcount must be non-negative/);
    });

    it("throws on fractional payroll cents", () => {
      expect(() =>
        executiveSummaryEngine.buildSummary({ ...BASE, payroll_total_cents: 100.5 }),
      ).toThrow(/payroll_total_cents must be non-negative integer/);
    });

    it("throws on non-integer NCR count", () => {
      expect(() =>
        executiveSummaryEngine.buildSummary({ ...BASE, open_ncrs_major: 1.5 }),
      ).toThrow(/open_ncrs_major must be non-negative integer/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned summary + nested objects frozen", () => {
      const s = executiveSummaryEngine.buildSummary(BASE);
      expect(Object.isFrozen(s)).toBe(true);
      expect(Object.isFrozen(s.role_distribution)).toBe(true);
      expect(Object.isFrozen(s.vendor_tier_mix)).toBe(true);
      expect(Object.isFrozen(s.red_flags)).toBe(true);
    });

    it("PII-free — only counts + aggregates, no employee_ids/names", () => {
      const s = executiveSummaryEngine.buildSummary(BASE);
      const keys = Object.keys(s);
      expect(keys).not.toContain("employee_names");
      expect(keys).not.toContain("ssn_list");
      expect(keys).not.toContain("top_performer_id"); // intentionally no individuals at exec level
    });
  });
});
