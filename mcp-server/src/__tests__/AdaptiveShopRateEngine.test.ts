/**
 * AdaptiveShopRateEngine.test.ts — HOTEL/U-ADAPTIVE-SHOP-RATE (iter3)
 *
 * Tests Bayesian conjugate-Gaussian update of per-machine shop-rate priors
 * from job-economics outcomes.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { adaptiveShopRateEngine, type JobEconomicsOutcome } from "../engines/AdaptiveShopRateEngine.js";

function outcome(overrides: Partial<JobEconomicsOutcome> = {}): JobEconomicsOutcome {
  return {
    job_id: "J-001",
    machine_id: "vmc_tier2",
    recorded_at: new Date().toISOString(),
    predicted_cost: 500,
    actual_cost: 520,
    predicted_hours: 8,
    actual_hours: 8,
    quoted_revenue: 700,
    actual_revenue: 700,
    ...overrides,
  };
}

describe("AdaptiveShopRateEngine — self-learning shop-rate optimizer", () => {
  // Isolate persistence (U-QP-ADAPTIVE-PERSIST) to a temp file so auto-persist
  // never writes the production state path during tests.
  let adaptiveDir: string;
  beforeEach(() => {
    adaptiveDir = mkdtempSync(join(tmpdir(), "adaptive-rate-"));
    adaptiveShopRateEngine.configureStatePath(join(adaptiveDir, "state.json"));
  });
  afterEach(() => {
    try { rmSync(adaptiveDir, { recursive: true, force: true }); } catch { /* best effort */ }
  });

  describe("recordOutcome", () => {
    it("stores a valid outcome and returns a frozen copy", () => {
      const r = adaptiveShopRateEngine.recordOutcome(outcome());
      expect(Object.isFrozen(r)).toBe(true);
      expect(adaptiveShopRateEngine.listOutcomes("vmc_tier2")).toHaveLength(1);
    });

    it("stores per-machine outcomes independently", () => {
      adaptiveShopRateEngine.recordOutcome(outcome({ machine_id: "vmc_tier2" }));
      adaptiveShopRateEngine.recordOutcome(outcome({ machine_id: "vmc_production" }));
      expect(adaptiveShopRateEngine.listOutcomes("vmc_tier2")).toHaveLength(1);
      expect(adaptiveShopRateEngine.listOutcomes("vmc_production")).toHaveLength(1);
    });

    it("R12: throws on missing job_id", () => {
      expect(() => adaptiveShopRateEngine.recordOutcome(outcome({ job_id: "" }))).toThrow(
        /job_id \+ machine_id required/,
      );
    });

    it("R12: throws on negative actual_cost", () => {
      expect(() => adaptiveShopRateEngine.recordOutcome(outcome({ actual_cost: -1 }))).toThrow(
        /actual_cost.*non-negative/,
      );
    });

    it("R12: throws on zero actual_hours (div-by-zero gate)", () => {
      expect(() => adaptiveShopRateEngine.recordOutcome(outcome({ actual_hours: 0 }))).toThrow(
        /actual_hours must be > 0/,
      );
    });

    it("R12: throws on NaN predicted_cost", () => {
      expect(() => adaptiveShopRateEngine.recordOutcome(outcome({ predicted_cost: NaN }))).toThrow(
        /predicted_cost.*non-negative finite/,
      );
    });
  });

  describe("getPrior bootstrap", () => {
    it("returns MachineRateDatabase typical when no observations exist", () => {
      const p = adaptiveShopRateEngine.getPrior("vmc_tier2");
      expect(p).not.toBeNull();
      expect(p!.mu).toBeGreaterThan(0);
      expect(p!.n_observations).toBe(0);
      expect(p!.sigma).toBeGreaterThan(0);
    });

    it("returns null for an unknown machine", () => {
      expect(adaptiveShopRateEngine.getPrior("nonexistent_xyz")).toBeNull();
    });

    it("prior sigma starts at ~25% of mean (initial uncertainty)", () => {
      const p = adaptiveShopRateEngine.getPrior("vmc_tier2");
      expect(p!.sigma / p!.mu).toBeGreaterThan(0.2);
      expect(p!.sigma / p!.mu).toBeLessThan(0.3);
    });
  });

  describe("adaptShopRate — Bayesian conjugate update", () => {
    it("posterior mean shifts TOWARD observation (Bayesian invariant)", () => {
      // MRD typical for vmc_tier2 = $65/hr. Observe consistently $80/hr.
      // Posterior should land between $65 and $80.
      const priorBefore = adaptiveShopRateEngine.getPrior("vmc_tier2")!;
      const obsRate = 80;
      // Generate 5 jobs at $80/hr observed rate (e.g. 8 hrs × $80 = $640 actual_cost)
      for (let i = 0; i < 5; i++) {
        adaptiveShopRateEngine.recordOutcome(
          outcome({ job_id: `J-${i}`, actual_cost: obsRate * 8, actual_hours: 8 }),
        );
      }
      const r = adaptiveShopRateEngine.adaptShopRate("vmc_tier2");
      expect(r.prior_after.mu).toBeGreaterThan(priorBefore.mu);
      expect(r.prior_after.mu).toBeLessThan(obsRate);
      expect(r.observations_applied).toBe(5);
    });

    it("posterior sigma shrinks as observations accumulate (uncertainty reduction)", () => {
      const before = adaptiveShopRateEngine.getPrior("vmc_tier2")!;
      for (let i = 0; i < 5; i++) {
        adaptiveShopRateEngine.recordOutcome(
          outcome({ job_id: `J-${i}`, actual_cost: 500, actual_hours: 8 }),
        );
      }
      const r = adaptiveShopRateEngine.adaptShopRate("vmc_tier2");
      expect(r.prior_after.sigma).toBeLessThan(before.sigma);
    });

    it("more observations → tighter credible interval", () => {
      for (let i = 0; i < 3; i++) {
        adaptiveShopRateEngine.recordOutcome(outcome({ job_id: `J-${i}` }));
      }
      const r3 = adaptiveShopRateEngine.adaptShopRate("vmc_tier2");
      const ciWidth3 = r3.credible_interval_95.upper - r3.credible_interval_95.lower;

      adaptiveShopRateEngine.reset();
      for (let i = 0; i < 20; i++) {
        adaptiveShopRateEngine.recordOutcome(outcome({ job_id: `J-${i}` }));
      }
      const r20 = adaptiveShopRateEngine.adaptShopRate("vmc_tier2");
      const ciWidth20 = r20.credible_interval_95.upper - r20.credible_interval_95.lower;

      expect(ciWidth20).toBeLessThan(ciWidth3);
    });

    it("returns no-op result when no outcomes recorded", () => {
      const r = adaptiveShopRateEngine.adaptShopRate("vmc_tier2");
      expect(r.observations_applied).toBe(0);
      expect(r.delta_mu).toBe(0);
      expect(r.prior_before.mu).toBe(r.prior_after.mu);
    });

    it("R12: throws on unknown machine", () => {
      expect(() => adaptiveShopRateEngine.adaptShopRate("nonexistent_xyz")).toThrow(
        /no prior for/,
      );
    });

    it("R12: throws on out-of-range obsSigmaFraction", () => {
      adaptiveShopRateEngine.recordOutcome(outcome());
      expect(() => adaptiveShopRateEngine.adaptShopRate("vmc_tier2", 1.5)).toThrow(
        /obsSigmaFraction must be in/,
      );
      expect(() => adaptiveShopRateEngine.adaptShopRate("vmc_tier2", 0)).toThrow(
        /obsSigmaFraction must be in/,
      );
    });

    it("delta_mu_pct reports proportional shift", () => {
      const before = adaptiveShopRateEngine.getPrior("vmc_tier2")!;
      for (let i = 0; i < 10; i++) {
        adaptiveShopRateEngine.recordOutcome(
          outcome({ job_id: `J-${i}`, actual_cost: 800, actual_hours: 8 }), // $100/hr
        );
      }
      const r = adaptiveShopRateEngine.adaptShopRate("vmc_tier2");
      const expectedDeltaPct = ((r.prior_after.mu - before.mu) / before.mu) * 100;
      expect(Math.abs(r.delta_mu_pct - expectedDeltaPct)).toBeLessThan(0.5);
      expect(r.delta_mu_pct).toBeGreaterThan(0);
    });
  });

  describe("analyzeMargin — under/over-quoting signal", () => {
    it("flags under_quoting when actual margin < predicted by >5pp", () => {
      // Quoted: revenue $1000, predicted cost $700 → predicted margin 30%
      // Actual: cost $850, revenue $1000 → actual margin 15% (drift -15pp)
      for (let i = 0; i < 3; i++) {
        adaptiveShopRateEngine.recordOutcome(
          outcome({
            job_id: `J-${i}`,
            predicted_cost: 700,
            actual_cost: 850,
            quoted_revenue: 1000,
            actual_revenue: 1000,
          }),
        );
      }
      const m = adaptiveShopRateEngine.analyzeMargin("vmc_tier2");
      expect(m.signal).toBe("under_quoting");
      expect(m.bias_dollars).toBeGreaterThan(0); // actual_cost > predicted_cost
    });

    it("flags over_quoting when actual margin > predicted by >5pp", () => {
      // Quoted: cost $700, revenue $1000 → 30% margin
      // Actual: cost $500, revenue $1000 → 50% margin (drift +20pp)
      for (let i = 0; i < 3; i++) {
        adaptiveShopRateEngine.recordOutcome(
          outcome({
            job_id: `J-${i}`,
            predicted_cost: 700,
            actual_cost: 500,
            quoted_revenue: 1000,
            actual_revenue: 1000,
          }),
        );
      }
      const m = adaptiveShopRateEngine.analyzeMargin("vmc_tier2");
      expect(m.signal).toBe("over_quoting");
      expect(m.bias_dollars).toBeLessThan(0);
    });

    it("flags calibrated when actual ≈ predicted", () => {
      for (let i = 0; i < 5; i++) {
        adaptiveShopRateEngine.recordOutcome(
          outcome({
            job_id: `J-${i}`,
            predicted_cost: 700,
            actual_cost: 705,
            quoted_revenue: 1000,
            actual_revenue: 1000,
          }),
        );
      }
      const m = adaptiveShopRateEngine.analyzeMargin("vmc_tier2");
      expect(m.signal).toBe("calibrated");
    });

    it("R12: throws on no outcomes", () => {
      expect(() => adaptiveShopRateEngine.analyzeMargin("vmc_tier2")).toThrow(/no outcomes/);
    });
  });

  describe("Hotel-soul invariants", () => {
    it("AdaptiveUpdateResult is frozen + USD only", () => {
      adaptiveShopRateEngine.recordOutcome(outcome());
      const r = adaptiveShopRateEngine.adaptShopRate("vmc_tier2");
      expect(Object.isFrozen(r)).toBe(true);
      expect(r.currency).toBe("USD");
      expect(r.source).toBe("AdaptiveShopRateEngine.v1");
    });

    it("MarginAnalysis is frozen + USD only", () => {
      adaptiveShopRateEngine.recordOutcome(outcome());
      const m = adaptiveShopRateEngine.analyzeMargin("vmc_tier2");
      expect(Object.isFrozen(m)).toBe(true);
      expect(m.currency).toBe("USD");
    });

    it("ledger outcomes preserve all recorded fields (PII-free invariant)", () => {
      adaptiveShopRateEngine.recordOutcome(outcome({ job_id: "JOB-X-42" }));
      const list = adaptiveShopRateEngine.listOutcomes("vmc_tier2");
      expect(list[0].job_id).toBe("JOB-X-42");
      // No employee/person fields exist on JobEconomicsOutcome — PII-free by design.
      expect(Object.keys(list[0])).not.toContain("employee_id");
      expect(Object.keys(list[0])).not.toContain("operator_name");
    });
  });
});
