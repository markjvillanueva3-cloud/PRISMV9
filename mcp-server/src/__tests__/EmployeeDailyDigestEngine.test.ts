/**
 * EmployeeDailyDigestEngine.test.ts — HOTEL/U-EMPLOYEE-DAILY-DIGEST (iter20)
 */
import { describe, it, expect } from "vitest";
import { employeeDailyDigestEngine, type DigestInput } from "../engines/EmployeeDailyDigestEngine.js";

const baseInput: DigestInput = {
  employee_id: "EMP-001",
  as_of_date: "2026-06-01",
  role: "machinist",
  tier: "intermediate",
  shifts_today_tomorrow: [
    { date: "2026-06-01", shift: "day", machine_serial: "HAAS-VF2-001" },
    { date: "2026-06-02", shift: "day", machine_serial: "HAAS-VF2-001" },
  ],
  pto: {
    vacation_hours: 48,
    sick_hours: 24,
    personal_hours: 16,
    pending_request_count: 0,
    approved_upcoming_count: 1,
  },
  required_courses: [],
  safety_reminders: [],
  nudges: [],
  payroll_snapshot: {
    pay_period_id: "2026-P11",
    gross_pay_cents: 156000,
    regular_hours: 40,
    overtime_hours: 8,
    shift_differential_cents: 0,
  },
  readiness_label: "developing",
};

describe("EmployeeDailyDigestEngine", () => {
  describe("buildDigest — happy path", () => {
    it("emits full digest with all fields preserved", () => {
      const d = employeeDailyDigestEngine.buildDigest(baseInput);
      expect(d.employee_id).toBe("EMP-001");
      expect(d.as_of_date).toBe("2026-06-01");
      expect(d.role).toBe("machinist");
      expect(d.tier).toBe("intermediate");
      expect(d.readiness_label).toBe("developing");
      expect(d.shifts_today_tomorrow).toHaveLength(2);
      expect(d.pto.vacation_hours).toBe(48);
      expect(d.payroll_snapshot?.gross_pay_cents).toBe(156000);
    });

    it("preserves nested values verbatim", () => {
      const d = employeeDailyDigestEngine.buildDigest(baseInput);
      expect(d.shifts_today_tomorrow[0].machine_serial).toBe("HAAS-VF2-001");
      expect(d.payroll_snapshot?.pay_period_id).toBe("2026-P11");
    });
  });

  describe("Top-3 action ranking — urgency hierarchy (variability)", () => {
    it("overdue safety > critical nudge > today shift", () => {
      const d = employeeDailyDigestEngine.buildDigest({
        ...baseInput,
        safety_reminders: [
          { cfr_reference: "29 CFR 1910.147", topic: "LOTO", status: "overdue", due_date: "2026-05-15" },
        ],
        nudges: [
          {
            kind: "corrective",
            dimension: "quality",
            message: "Quality 28% — review with foreman",
            severity: "critical",
          },
        ],
      });
      expect(d.top_actions).toHaveLength(3);
      expect(d.top_actions[0].kind).toBe("safety");
      expect(d.top_actions[0].urgency).toBe("critical");
      expect(d.top_actions[1].kind).toBe("nudge");
      expect(d.top_actions[1].urgency).toBe("critical");
      expect(d.top_actions[2].kind).toBe("shift");
    });

    it("only-info-day: today's shift, tomorrow's shift, payroll", () => {
      const d = employeeDailyDigestEngine.buildDigest(baseInput);
      expect(d.top_actions).toHaveLength(2); // 2 shifts only — no other candidates
      expect(d.top_actions[0].kind).toBe("shift");
      expect(d.top_actions[0].headline).toContain("Today");
      expect(d.top_actions[1].headline).toContain("Tomorrow");
    });

    it("warn nudge ranks above today's shift", () => {
      const d = employeeDailyDigestEngine.buildDigest({
        ...baseInput,
        nudges: [
          {
            kind: "corrective",
            dimension: "throughput",
            message: "Throughput trending low",
            severity: "warn",
          },
        ],
      });
      expect(d.top_actions[0].kind).toBe("nudge");
      expect(d.top_actions[0].urgency).toBe("warn");
      expect(d.top_actions[1].kind).toBe("shift");
    });

    it("course with due_date appears in top actions", () => {
      const d = employeeDailyDigestEngine.buildDigest({
        ...baseInput,
        shifts_today_tomorrow: [],
        required_courses: [
          { course_id: "course-22", reason: "refresher_overdue", due_date: "2026-06-10" },
        ],
      });
      const courseAction = d.top_actions.find((a) => a.kind === "course");
      expect(courseAction).toMatchObject({
        kind: "course",
        urgency: "warn",
      });
      expect(courseAction!.headline).toContain("course-22");
      expect(courseAction!.headline).toContain("2026-06-10");
    });

    it("PTO pending_request_count > 0 surfaces approver action", () => {
      const d = employeeDailyDigestEngine.buildDigest({
        ...baseInput,
        shifts_today_tomorrow: [],
        pto: { ...baseInput.pto, pending_request_count: 3 },
      });
      const ptoAction = d.top_actions.find((a) => a.kind === "pto_response");
      expect(ptoAction).toMatchObject({
        kind: "pto_response",
        urgency: "info",
      });
      expect(ptoAction!.headline).toContain("3");
    });

    it("positive nudges deprioritized below corrective ones", () => {
      const d = employeeDailyDigestEngine.buildDigest({
        ...baseInput,
        shifts_today_tomorrow: [],
        nudges: [
          {
            kind: "positive",
            dimension: "quality",
            message: "Sustained quality excellence (87%)",
            severity: "info",
          },
          {
            kind: "corrective",
            dimension: "safety",
            message: "Recent safety signal — refresh per OSHA cadence",
            severity: "warn",
          },
        ],
      });
      expect(d.top_actions[0].headline).toContain("safety signal");
      expect(d.top_actions[1].headline).toContain("excellence");
    });
  });

  describe("Variability — multiple shifts/reminders/nudges", () => {
    it("handles 3 safety reminders mixing overdue + due_soon", () => {
      const d = employeeDailyDigestEngine.buildDigest({
        ...baseInput,
        shifts_today_tomorrow: [],
        safety_reminders: [
          { cfr_reference: "29 CFR 1910.147", topic: "LOTO", status: "overdue", due_date: "2026-05-15" },
          { cfr_reference: "29 CFR 1910.1200", topic: "HazCom", status: "due_soon", due_date: "2026-07-01" },
          { cfr_reference: "29 CFR 1910.178", topic: "Forklift", status: "due_soon", due_date: "2026-08-15" },
        ],
      });
      expect(d.safety_reminders).toHaveLength(3);
      // overdue should win the top-1 slot
      expect(d.top_actions[0].kind).toBe("safety");
      expect(d.top_actions[0].urgency).toBe("critical");
      expect(d.top_actions[0].headline).toContain("LOTO");
    });

    it("nudges across 4 dimensions all surface in main array", () => {
      const d = employeeDailyDigestEngine.buildDigest({
        ...baseInput,
        nudges: [
          { kind: "positive", dimension: "quality", message: "Q nudge", severity: "info" },
          { kind: "corrective", dimension: "throughput", message: "T nudge", severity: "warn" },
          { kind: "corrective", dimension: "safety", message: "S nudge", severity: "warn" },
          { kind: "corrective", dimension: "learning", message: "L nudge", severity: "warn" },
        ],
      });
      expect(d.nudges).toHaveLength(4);
      const dims = d.nudges.map((n) => n.dimension);
      expect(dims).toEqual(["quality", "throughput", "safety", "learning"]);
    });
  });

  describe("R12 input validation", () => {
    it("throws on missing employee_id", () => {
      expect(() =>
        employeeDailyDigestEngine.buildDigest({ ...baseInput, employee_id: "" }),
      ).toThrow(/employee_id required/);
    });

    it("throws on bad date format", () => {
      expect(() =>
        employeeDailyDigestEngine.buildDigest({ ...baseInput, as_of_date: "June 1" }),
      ).toThrow(/as_of_date must be ISO/);
    });

    it("throws when required arrays are not arrays", () => {
      expect(() =>
        employeeDailyDigestEngine.buildDigest({
          ...baseInput,
          nudges: null as never,
        }),
      ).toThrow(/must be arrays/);
    });

    it("throws on missing pto field", () => {
      expect(() =>
        employeeDailyDigestEngine.buildDigest({
          ...baseInput,
          pto: null as never,
        }),
      ).toThrow(/pto object with vacation_hours required/);
    });

    it("throws on NaN pto value", () => {
      expect(() =>
        employeeDailyDigestEngine.buildDigest({
          ...baseInput,
          pto: { ...baseInput.pto, sick_hours: Number.NaN },
        }),
      ).toThrow(/pto.sick_hours must be finite/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned digest + nested arrays are frozen", () => {
      const d = employeeDailyDigestEngine.buildDigest(baseInput);
      expect(Object.isFrozen(d)).toBe(true);
      expect(Object.isFrozen(d.shifts_today_tomorrow)).toBe(true);
      expect(Object.isFrozen(d.pto)).toBe(true);
      expect(Object.isFrozen(d.nudges)).toBe(true);
      expect(Object.isFrozen(d.top_actions)).toBe(true);
    });

    it("PII-free — no name/SSN/DOB keys", () => {
      const d = employeeDailyDigestEngine.buildDigest(baseInput);
      const keys = Object.keys(d);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
      expect(keys).not.toContain("phone");
      expect(keys).not.toContain("address");
    });

    it("null payroll_snapshot stays null (no fabrication)", () => {
      const d = employeeDailyDigestEngine.buildDigest({ ...baseInput, payroll_snapshot: null });
      expect(d.payroll_snapshot).toBeNull();
    });
  });
});
