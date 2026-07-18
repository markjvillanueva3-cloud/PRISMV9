/**
 * EmployeePerMachineSFAdaptiveEngine.test.ts — HOTEL/U-EMP-PER-MACHINE-SF-ADAPTIVE (iter6)
 */
import { describe, it, expect, beforeEach } from "vitest";
import {
  employeePerMachineSFAdaptiveEngine,
  type SFObservation,
  type OutcomeVerdict,
} from "../engines/EmployeePerMachineSFAdaptiveEngine.js";

function obs(overrides: Partial<SFObservation> = {}): SFObservation {
  return {
    machine_serial: "VMC-001-SN-A001",
    material: "AL6061-T6",
    tool_type: "endmill_4fl_carbide_0.25in",
    rpm_used: 8000,
    feed_in_min_used: 60,
    doc_mm_used: 2,
    woc_mm_used: 4,
    verdict: "good",
    employee_id: "EMP-MV",
    job_id: "J-001",
    recorded_at: new Date().toISOString(),
    ...overrides,
  };
}

const BOOTSTRAP = { rpm: 8000, feed_in_min: 60, doc_mm: 2, woc_mm: 4 };
const SAME_TUPLE = { machine_serial: "VMC-001-SN-A001", material: "AL6061-T6", tool_type: "endmill_4fl_carbide_0.25in" };

describe("EmployeePerMachineSFAdaptiveEngine", () => {
  beforeEach(() => employeePerMachineSFAdaptiveEngine.reset());

  describe("recordOutcome", () => {
    it("stores valid observation", () => {
      employeePerMachineSFAdaptiveEngine.recordOutcome(obs());
      expect(employeePerMachineSFAdaptiveEngine.listOutcomes(SAME_TUPLE.machine_serial, SAME_TUPLE.material, SAME_TUPLE.tool_type)).toHaveLength(1);
    });

    it("ISOLATES per-machine — same model different serials get independent ledgers", () => {
      employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ machine_serial: "VMC-001-SN-A001" }));
      employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ machine_serial: "VMC-001-SN-A002" }));
      const a = employeePerMachineSFAdaptiveEngine.listOutcomes("VMC-001-SN-A001", SAME_TUPLE.material, SAME_TUPLE.tool_type);
      const b = employeePerMachineSFAdaptiveEngine.listOutcomes("VMC-001-SN-A002", SAME_TUPLE.material, SAME_TUPLE.tool_type);
      expect(a).toHaveLength(1);
      expect(b).toHaveLength(1);
    });

    it("R12 throws on invalid verdict", () => {
      expect(() => employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ verdict: "invalid_x" as OutcomeVerdict }))).toThrow(
        /invalid verdict/,
      );
    });

    it("R12 throws on missing employee_id / job_id", () => {
      expect(() => employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ employee_id: "" }))).toThrow(/employee_id \+ job_id required/);
    });

    it("R12 throws on non-positive cutting params", () => {
      expect(() => employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ rpm_used: 0 }))).toThrow(/rpm_used must be positive/);
      expect(() => employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ feed_in_min_used: -1 }))).toThrow(/feed_in_min_used must be positive/);
    });

    it("R12 throws on invalid insert_corner (non-int / negative)", () => {
      expect(() => employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ insert_corner: -1 }))).toThrow(/insert_corner must be a positive integer/);
      expect(() => employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ insert_corner: 2.5 }))).toThrow(/insert_corner must be a positive integer/);
    });
  });

  describe("getPrior bootstrap", () => {
    it("bootstraps from caller-supplied calculator output when no prior exists", () => {
      const p = employeePerMachineSFAdaptiveEngine.getPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      expect(p.rpm.mu).toBe(8000);
      expect(p.rpm.n).toBe(0);
      expect(p.rpm.sigma).toBeGreaterThan(0);
    });

    it("THROWS when no prior and no bootstrap", () => {
      expect(() => employeePerMachineSFAdaptiveEngine.getPrior(SAME_TUPLE)).toThrow(/no prior.*no bootstrap/);
    });

    it("THROWS on non-positive bootstrap values", () => {
      expect(() =>
        employeePerMachineSFAdaptiveEngine.getPrior({ ...SAME_TUPLE, bootstrap: { ...BOOTSTRAP, rpm: 0 } }),
      ).toThrow(/positive finite/);
    });
  });

  describe("adaptPrior — Bayesian update", () => {
    it("'perfect' verdicts pull posterior TOWARD observation", () => {
      // bootstrap 8000 RPM; observe 10000 RPM with "perfect" verdict
      for (let i = 0; i < 5; i++) {
        employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ job_id: `J-${i}`, rpm_used: 10000, verdict: "perfect" }));
      }
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      expect(r.by_dimension.rpm.after.mu).toBeGreaterThan(8000);
      expect(r.by_dimension.rpm.after.mu).toBeLessThan(10000);
    });

    it("'chatter' verdict pushes posterior AWAY from observation (downward when obs > prior)", () => {
      // Observe 9000 RPM with "chatter" — should push posterior DOWN below 8000
      for (let i = 0; i < 5; i++) {
        employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ job_id: `J-${i}`, rpm_used: 9000, verdict: "chatter" }));
      }
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      // Should not exceed prior mean (negative reward pushes away)
      expect(r.by_dimension.rpm.after.mu).toBeLessThanOrEqual(8000);
    });

    it("'tool_break' is strongest negative signal", () => {
      for (let i = 0; i < 3; i++) {
        employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ job_id: `BREAK-${i}`, rpm_used: 9500, verdict: "tool_break" }));
      }
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      // Significant downward shift expected
      expect(r.by_dimension.rpm.after.mu).toBeLessThan(8000);
      expect(r.by_dimension.rpm.delta_pct).toBeLessThan(0);
    });

    it("posterior sigma SHRINKS as observations accumulate", () => {
      const before = employeePerMachineSFAdaptiveEngine.getPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      for (let i = 0; i < 10; i++) {
        employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ job_id: `J-${i}`, verdict: "good" }));
      }
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      expect(r.by_dimension.rpm.after.sigma).toBeLessThan(before.rpm.sigma);
    });

    it("returns no-op when no observations recorded", () => {
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      expect(r.observations_applied).toBe(0);
      expect(r.by_dimension.rpm.before.mu).toBe(r.by_dimension.rpm.after.mu);
    });

    it("each dimension (rpm/feed/doc/woc) updates independently", () => {
      // Observe consistent +20% on RPM, -10% on feed, unchanged DOC/WOC
      for (let i = 0; i < 5; i++) {
        employeePerMachineSFAdaptiveEngine.recordOutcome(
          obs({ job_id: `J-${i}`, rpm_used: 9600, feed_in_min_used: 54, verdict: "perfect" }),
        );
      }
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      expect(r.by_dimension.rpm.after.mu).toBeGreaterThan(8000);
      expect(r.by_dimension.feed_in_min.after.mu).toBeLessThan(60);
    });

    it("R12 throws on out-of-range obsSigmaFraction", () => {
      employeePerMachineSFAdaptiveEngine.recordOutcome(obs());
      expect(() =>
        employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP, obsSigmaFraction: 1.5 }),
      ).toThrow(/obsSigmaFraction must be in/);
    });
  });

  describe("recommendSpeedsFeeds convenience wrapper", () => {
    it("returns frozen recommendation with n_observations", () => {
      for (let i = 0; i < 3; i++) {
        employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ job_id: `J-${i}`, verdict: "perfect" }));
      }
      const r = employeePerMachineSFAdaptiveEngine.recommendSpeedsFeeds({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      expect(Object.isFrozen(r)).toBe(true);
      expect(r.n_observations).toBe(3);
      expect(r.rpm).toBeGreaterThan(0);
      expect(r.source).toBe("EmployeePerMachineSFAdaptiveEngine.v1");
    });
  });

  describe("Hotel-soul invariants", () => {
    it("adapt result is frozen", () => {
      employeePerMachineSFAdaptiveEngine.recordOutcome(obs());
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      expect(Object.isFrozen(r)).toBe(true);
    });

    it("credible_95 intervals reported per dimension", () => {
      employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ verdict: "perfect" }));
      const r = employeePerMachineSFAdaptiveEngine.adaptPrior({ ...SAME_TUPLE, bootstrap: BOOTSTRAP });
      expect(r.recommendation_credible_95.rpm.lower).toBeLessThan(r.recommendation_credible_95.rpm.upper);
    });

    it("PII-free: only employee_id (string) stored, no name/SSN/DOB fields", () => {
      employeePerMachineSFAdaptiveEngine.recordOutcome(obs({ employee_id: "EMP-42" }));
      const list = employeePerMachineSFAdaptiveEngine.listOutcomes(SAME_TUPLE.machine_serial, SAME_TUPLE.material, SAME_TUPLE.tool_type);
      const keys = Object.keys(list[0]);
      expect(keys).not.toContain("employee_name");
      expect(keys).not.toContain("ssn");
      expect(keys).not.toContain("dob");
      expect(list[0].employee_id).toBe("EMP-42");
    });
  });
});
