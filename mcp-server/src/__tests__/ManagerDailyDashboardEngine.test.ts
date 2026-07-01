/**
 * ManagerDailyDashboardEngine.test.ts — HOTEL/U-MANAGER-DAILY-DASHBOARD (iter21)
 */
import { describe, it, expect } from "vitest";
import {
  managerDailyDashboardEngine,
  type ManagerDashboardInput,
} from "../engines/ManagerDailyDashboardEngine.js";

const baseInput: ManagerDashboardInput = {
  manager_employee_id: "EMP-MGR-001",
  as_of_date: "2026-06-01",
  direct_reports: [
    {
      employee_id: "EMP-A",
      role: "machinist",
      composite_score: 0.85,
      readiness_label: "ready",
      has_today_shift: true,
      needs_attention_dims: [],
    },
    {
      employee_id: "EMP-B",
      role: "operator",
      composite_score: 0.62,
      readiness_label: "developing",
      has_today_shift: true,
      needs_attention_dims: ["quality"],
    },
    {
      employee_id: "EMP-C",
      role: "operator",
      composite_score: 0.45,
      readiness_label: "early",
      has_today_shift: false,
      needs_attention_dims: ["throughput", "safety"],
    },
  ],
  pending_pto_requests: [],
  team_coverage_gaps: [],
  overdue_action_items: [],
};

describe("ManagerDailyDashboardEngine", () => {
  describe("Team rollup computation", () => {
    it("aggregates 3 reports with correct averages + top performer", () => {
      const d = managerDailyDashboardEngine.buildDashboard(baseInput);
      expect(d.team_rollup.n_reports).toBe(3);
      // avg = (0.85 + 0.62 + 0.45) / 3 = 0.64
      expect(d.team_rollup.avg_composite).toBeCloseTo(0.64, 2);
      expect(d.team_rollup.top_performer).toEqual({ employee_id: "EMP-A", score: 0.85 });
      expect(d.team_rollup.ready_for_promotion).toEqual(["EMP-A"]);
      expect(d.team_rollup.needs_attention).toHaveLength(3);
      expect(d.team_rollup.pct_with_today_shift).toBeCloseTo(0.6667, 3);
    });

    it("empty team returns zero-shape rollup", () => {
      const d = managerDailyDashboardEngine.buildDashboard({ ...baseInput, direct_reports: [] });
      expect(d.team_rollup.n_reports).toBe(0);
      expect(d.team_rollup.avg_composite).toBe(0);
      expect(d.team_rollup.top_performer).toBeNull();
      expect(d.team_rollup.ready_for_promotion).toHaveLength(0);
    });

    it("variability — needs_attention dims preserved per employee", () => {
      const d = managerDailyDashboardEngine.buildDashboard(baseInput);
      const empC = d.team_rollup.needs_attention.filter((n) => n.employee_id === "EMP-C");
      expect(empC).toHaveLength(2);
      expect(empC.map((n) => n.dim).sort()).toEqual(["safety", "throughput"]);
    });

    it("promote_now label also classified as ready_for_promotion", () => {
      const d = managerDailyDashboardEngine.buildDashboard({
        ...baseInput,
        direct_reports: [
          {
            employee_id: "EMP-PROMO",
            role: "programmer",
            composite_score: 0.95,
            readiness_label: "promote_now",
            has_today_shift: true,
            needs_attention_dims: [],
          },
        ],
      });
      expect(d.team_rollup.ready_for_promotion).toEqual(["EMP-PROMO"]);
    });
  });

  describe("Top priorities — urgency ranking", () => {
    it("unstaffed_machine outranks unqualified + double_booked", () => {
      const d = managerDailyDashboardEngine.buildDashboard({
        ...baseInput,
        team_coverage_gaps: [
          { kind: "double_booked", date: "2026-06-01", detail: "EMP-X on 2 machines" },
          { kind: "unstaffed_machine", date: "2026-06-01", detail: "OKUMA-LATHE-001 unstaffed" },
          { kind: "unqualified_employee", date: "2026-06-01", detail: "EMP-Y missing course-32" },
        ],
      });
      expect(d.top_priorities[0].kind).toBe("coverage_gap");
      expect(d.top_priorities[0].urgency).toBe("critical");
      expect(d.top_priorities[0].headline).toContain("OKUMA-LATHE-001");
    });

    it("stale PTO (>7d) ranks critical", () => {
      const d = managerDailyDashboardEngine.buildDashboard({
        ...baseInput,
        pending_pto_requests: [
          {
            request_id: "PTO-001",
            employee_id: "EMP-X",
            category: "vacation",
            start_date: "2026-07-01",
            end_date: "2026-07-05",
            hours_requested: 32,
            age_days: 10,
          },
        ],
      });
      expect(d.top_priorities[0].kind).toBe("pto_approval");
      expect(d.top_priorities[0].urgency).toBe("critical");
      expect(d.top_priorities[0].headline).toContain("PTO-001");
    });

    it("PTO age 4d → warn (not critical)", () => {
      const d = managerDailyDashboardEngine.buildDashboard({
        ...baseInput,
        pending_pto_requests: [
          {
            request_id: "PTO-002",
            employee_id: "EMP-Y",
            category: "sick",
            start_date: "2026-07-01",
            end_date: "2026-07-01",
            hours_requested: 8,
            age_days: 4,
          },
        ],
      });
      const ptoPri = d.top_priorities.find((p) => p.kind === "pto_approval");
      expect(ptoPri?.urgency).toBe("warn");
    });

    it("overdue >7d action item ranks critical", () => {
      const d = managerDailyDashboardEngine.buildDashboard({
        ...baseInput,
        overdue_action_items: [
          {
            action_id: "MRA-001",
            review_id: "MR-001",
            description: "Procure 2nd wire-EDM machine",
            due_date: "2026-05-15",
            age_days: 17,
          },
        ],
      });
      expect(d.top_priorities[0].kind).toBe("action_item");
      expect(d.top_priorities[0].urgency).toBe("critical");
    });

    it("team_alert fires when avg composite < 0.55 (≥3 reports)", () => {
      const d = managerDailyDashboardEngine.buildDashboard({
        ...baseInput,
        direct_reports: [
          {
            employee_id: "EMP-A",
            role: null,
            composite_score: 0.40,
            readiness_label: "early",
            has_today_shift: true,
            needs_attention_dims: [],
          },
          {
            employee_id: "EMP-B",
            role: null,
            composite_score: 0.30,
            readiness_label: "early",
            has_today_shift: true,
            needs_attention_dims: [],
          },
          {
            employee_id: "EMP-C",
            role: null,
            composite_score: 0.50,
            readiness_label: "early",
            has_today_shift: true,
            needs_attention_dims: [],
          },
        ],
      });
      const alert = d.top_priorities.find((p) => p.kind === "team_alert");
      expect(alert).toMatchObject({ kind: "team_alert", urgency: "warn" });
      expect(alert!.headline).toContain("40%");
    });

    it("top_priorities capped at 5 items", () => {
      const manyGaps = Array.from({ length: 10 }, (_, i) => ({
        kind: "unstaffed_machine" as const,
        date: "2026-06-01",
        detail: `MACHINE-${i} unstaffed`,
      }));
      const d = managerDailyDashboardEngine.buildDashboard({
        ...baseInput,
        team_coverage_gaps: manyGaps,
      });
      expect(d.top_priorities).toHaveLength(5);
    });
  });

  describe("R12 input validation", () => {
    it("throws on missing manager_employee_id", () => {
      expect(() =>
        managerDailyDashboardEngine.buildDashboard({ ...baseInput, manager_employee_id: "" }),
      ).toThrow(/manager_employee_id required/);
    });

    it("throws on bad date format", () => {
      expect(() =>
        managerDailyDashboardEngine.buildDashboard({ ...baseInput, as_of_date: "tomorrow" }),
      ).toThrow(/as_of_date must be ISO/);
    });

    it("throws on out-of-range composite_score", () => {
      expect(() =>
        managerDailyDashboardEngine.buildDashboard({
          ...baseInput,
          direct_reports: [
            {
              employee_id: "EMP-X",
              role: null,
              composite_score: 1.5,
              readiness_label: null,
              has_today_shift: false,
              needs_attention_dims: [],
            },
          ],
        }),
      ).toThrow(/composite_score must be in/);
    });

    it("throws on NaN composite_score", () => {
      expect(() =>
        managerDailyDashboardEngine.buildDashboard({
          ...baseInput,
          direct_reports: [
            {
              employee_id: "EMP-X",
              role: null,
              composite_score: Number.NaN,
              readiness_label: null,
              has_today_shift: false,
              needs_attention_dims: [],
            },
          ],
        }),
      ).toThrow(/composite_score must be in/);
    });

    it("throws on negative age_days", () => {
      expect(() =>
        managerDailyDashboardEngine.buildDashboard({
          ...baseInput,
          pending_pto_requests: [
            {
              request_id: "PTO-X",
              employee_id: "EMP-X",
              category: "vacation",
              start_date: "2026-07-01",
              end_date: "2026-07-01",
              hours_requested: 8,
              age_days: -5,
            },
          ],
        }),
      ).toThrow(/age_days must be non-negative/);
    });

    it("throws when arrays are non-array", () => {
      expect(() =>
        managerDailyDashboardEngine.buildDashboard({
          ...baseInput,
          pending_pto_requests: null as never,
        }),
      ).toThrow(/must be arrays/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned dashboard + nested arrays are frozen", () => {
      const d = managerDailyDashboardEngine.buildDashboard(baseInput);
      expect(Object.isFrozen(d)).toBe(true);
      expect(Object.isFrozen(d.team_rollup)).toBe(true);
      expect(Object.isFrozen(d.top_priorities)).toBe(true);
      expect(Object.isFrozen(d.pending_pto_requests)).toBe(true);
      expect(Object.isFrozen(d.team_coverage_gaps)).toBe(true);
    });

    it("PII-free — only employee_id, no name/SSN/DOB", () => {
      const d = managerDailyDashboardEngine.buildDashboard(baseInput);
      const keys = Object.keys(d);
      expect(keys).not.toContain("manager_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });
  });
});
