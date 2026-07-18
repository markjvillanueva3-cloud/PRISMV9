/**
 * EmployeePerformanceFeedbackEngine.test.ts — HOTEL/U-EMPLOYEE-PERFORMANCE-FEEDBACK (iter16)
 */
import { describe, it, expect, beforeEach } from "vitest";
import { employeePerformanceFeedbackEngine } from "../engines/EmployeePerformanceFeedbackEngine.js";

describe("EmployeePerformanceFeedbackEngine", () => {
  beforeEach(() => employeePerformanceFeedbackEngine.reset());

  describe("recordSignal — input validation (R12)", () => {
    it("records a valid signal", () => {
      const s = employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-A",
        kind: "sf_outcome",
        verdict: "positive",
      });
      expect(s.id).toMatch(/^PFS-\d{6}$/);
      expect(s.kind).toBe("sf_outcome");
      expect(s.verdict).toBe("positive");
      expect(s.weight).toBe(1.0);
    });

    it("R12 throws on missing employee_id", () => {
      expect(() =>
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "",
          kind: "sf_outcome",
          verdict: "positive",
        }),
      ).toThrow(/employee_id required/);
    });

    it("R12 throws on unknown kind", () => {
      expect(() =>
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-A",
          kind: "garbage" as never,
          verdict: "positive",
        }),
      ).toThrow(/unknown kind/);
    });

    it("R12 throws on unknown verdict", () => {
      expect(() =>
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-A",
          kind: "sf_outcome",
          verdict: "stellar" as never,
        }),
      ).toThrow(/unknown verdict/);
    });

    it("R12 throws on out-of-range weight", () => {
      expect(() =>
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-A",
          kind: "sf_outcome",
          verdict: "positive",
          weight: 1.5,
        }),
      ).toThrow(/weight must be in/);
    });
  });

  describe("Dimension routing — signal kind → dimension", () => {
    it("sf_outcome + insert_outcome update quality", () => {
      for (let i = 0; i < 5; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-Q",
          kind: i % 2 === 0 ? "sf_outcome" : "insert_outcome",
          verdict: "positive",
        });
      }
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-Q")!;
      expect(p.quality.sample_n).toBe(5);
      expect(p.throughput.sample_n).toBe(0);
      expect(p.safety.sample_n).toBe(0);
      expect(p.learning.sample_n).toBe(0);
    });

    it("op_completion updates throughput", () => {
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-T",
        kind: "op_completion",
        verdict: "positive",
      });
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-T")!;
      expect(p.throughput.sample_n).toBe(1);
    });

    it("safety_incident updates safety", () => {
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-S",
        kind: "safety_incident",
        verdict: "major_issue",
      });
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-S")!;
      expect(p.safety.sample_n).toBe(1);
      expect(p.safety.value).toBeLessThan(1.0);
    });

    it("course_outcome updates learning", () => {
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-L",
        kind: "course_outcome",
        verdict: "positive",
      });
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-L")!;
      expect(p.learning.sample_n).toBe(1);
    });
  });

  describe("EMA scoring — variability across verdicts", () => {
    it("sustained positive signals push score toward 1.0", () => {
      for (let i = 0; i < 50; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-EXCEL",
          kind: "sf_outcome",
          verdict: "positive",
        });
      }
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-EXCEL")!;
      expect(p.quality.value).toBeGreaterThan(0.65);
    });

    it("sustained major_issue signals push score toward 0.0", () => {
      for (let i = 0; i < 50; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-STRUGGLE",
          kind: "sf_outcome",
          verdict: "major_issue",
        });
      }
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-STRUGGLE")!;
      expect(p.quality.value).toBeLessThan(0.35);
    });

    it("mixed signals settle in the middle", () => {
      for (let i = 0; i < 20; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-MIX",
          kind: "sf_outcome",
          verdict: i % 2 === 0 ? "positive" : "minor_issue",
        });
      }
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-MIX")!;
      expect(p.quality.value).toBeGreaterThan(0.40);
      expect(p.quality.value).toBeLessThan(0.75);
    });

    it("composite_score reflects all 4 dimensions weighted", () => {
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-C",
        kind: "sf_outcome",
        verdict: "positive",
      });
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-C",
        kind: "op_completion",
        verdict: "positive",
      });
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-C")!;
      expect(p.composite_score).toBeGreaterThan(0.5);
      expect(p.composite_score).toBeLessThanOrEqual(1.0);
    });
  });

  describe("generateNudges — positive + corrective coaching", () => {
    it("emits positive nudge after sustained excellence (≥5 signals, ≥85%)", () => {
      for (let i = 0; i < 30; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-STAR",
          kind: "sf_outcome",
          verdict: "positive",
          weight: 1.0,
        });
      }
      const nudges = employeePerformanceFeedbackEngine.generateNudges("EMP-STAR");
      const positive = nudges.find((n) => n.kind === "positive" && n.dimension === "quality");
      expect(positive).toMatchObject({
        kind: "positive",
        dimension: "quality",
        severity: "info",
        employee_id: "EMP-STAR",
      });
      expect(positive!.message).toMatch(/Sustained quality excellence/);
    });

    it("emits corrective nudge when quality < 50% (sample_n ≥3)", () => {
      for (let i = 0; i < 8; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-NEED-HELP",
          kind: "sf_outcome",
          verdict: "major_issue",
          weight: 1.0,
        });
      }
      const nudges = employeePerformanceFeedbackEngine.generateNudges("EMP-NEED-HELP");
      const corrective = nudges.find(
        (n) => n.kind === "corrective" && n.dimension === "quality",
      );
      expect(corrective).toMatchObject({
        kind: "corrective",
        dimension: "quality",
        employee_id: "EMP-NEED-HELP",
      });
      expect(["warn", "critical"]).toContain(corrective!.severity);
    });

    it("safety nudge fires after single major_issue safety_incident", () => {
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-SAFE",
        kind: "safety_incident",
        verdict: "major_issue",
      });
      const nudges = employeePerformanceFeedbackEngine.generateNudges("EMP-SAFE");
      const safetyNudge = nudges.find((n) => n.dimension === "safety");
      expect(safetyNudge).toMatchObject({
        kind: "corrective",
        dimension: "safety",
        employee_id: "EMP-SAFE",
      });
      expect(["warn", "critical"]).toContain(safetyNudge!.severity);
    });

    it("R12 throws when employee has no recorded signals", () => {
      expect(() =>
        employeePerformanceFeedbackEngine.generateNudges("EMP-GHOST"),
      ).toThrow(/no profile/);
    });
  });

  describe("assessRoleReadiness — career-progression score", () => {
    it("returns at least 'developing' when composite ≥0.65 and growth 100%", () => {
      for (let i = 0; i < 30; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-R",
          kind: "sf_outcome",
          verdict: "positive",
        });
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-R",
          kind: "op_completion",
          verdict: "positive",
        });
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-R",
          kind: "course_outcome",
          verdict: "positive",
        });
      }
      const r = employeePerformanceFeedbackEngine.assessRoleReadiness({
        employee_id: "EMP-R",
        growth_course_completion_pct: 1.0,
      });
      expect(r.readiness_score).toBeGreaterThanOrEqual(0.6);
      expect(["developing", "ready", "promote_now"]).toContain(r.readiness_label);
    });

    it("returns 'early' when composite low and growth not started", () => {
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-E",
        kind: "sf_outcome",
        verdict: "minor_issue",
      });
      const r = employeePerformanceFeedbackEngine.assessRoleReadiness({
        employee_id: "EMP-E",
        growth_course_completion_pct: 0,
      });
      expect(r.readiness_label).toBe("early");
    });

    it("R12 throws on invalid growth_course_completion_pct", () => {
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-V",
        kind: "sf_outcome",
        verdict: "positive",
      });
      expect(() =>
        employeePerformanceFeedbackEngine.assessRoleReadiness({
          employee_id: "EMP-V",
          growth_course_completion_pct: 1.5,
        }),
      ).toThrow(/must be in \[0, 1\]/);
    });
  });

  describe("teamRollup — foreman dashboard", () => {
    beforeEach(() => {
      for (let i = 0; i < 20; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-STAR",
          kind: "sf_outcome",
          verdict: "positive",
        });
      }
      for (let i = 0; i < 10; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-MID",
          kind: "sf_outcome",
          verdict: i % 2 === 0 ? "positive" : "neutral",
        });
      }
      for (let i = 0; i < 5; i++) {
        employeePerformanceFeedbackEngine.recordSignal({
          employee_id: "EMP-LOW",
          kind: "sf_outcome",
          verdict: "major_issue",
        });
      }
    });

    it("aggregates 3 employees and ranks top performer", () => {
      const roll = employeePerformanceFeedbackEngine.teamRollup({
        employee_ids: ["EMP-STAR", "EMP-MID", "EMP-LOW"],
      });
      expect(roll.n).toBe(3);
      expect(roll.top_composite!.employee_id).toBe("EMP-STAR");
      expect(roll.needs_attention.some((n) => n.employee_id === "EMP-LOW")).toBe(true);
    });

    it("returns zero-shape rollup when no employees have profiles", () => {
      employeePerformanceFeedbackEngine.reset();
      const roll = employeePerformanceFeedbackEngine.teamRollup({
        employee_ids: ["EMP-NOPE-1", "EMP-NOPE-2"],
      });
      expect(roll.n).toBe(0);
      expect(roll.top_composite).toBeNull();
    });

    it("R12 throws on empty employee_ids array", () => {
      expect(() =>
        employeePerformanceFeedbackEngine.teamRollup({ employee_ids: [] }),
      ).toThrow(/employee_ids array required/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("returned profile + signals are frozen", () => {
      employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-F",
        kind: "sf_outcome",
        verdict: "positive",
      });
      const p = employeePerformanceFeedbackEngine.getProfile("EMP-F");
      expect(Object.isFrozen(p)).toBe(true);
      expect(Object.isFrozen(p!.signals)).toBe(true);
      expect(Object.isFrozen(p!.quality)).toBe(true);
    });

    it("PII-free — no name/SSN in signals or profile", () => {
      const s = employeePerformanceFeedbackEngine.recordSignal({
        employee_id: "EMP-P",
        kind: "sf_outcome",
        verdict: "positive",
      });
      const keys = Object.keys(s);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
    });
  });
});
