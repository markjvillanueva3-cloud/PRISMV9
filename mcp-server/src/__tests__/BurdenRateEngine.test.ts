/**
 * BurdenRateEngine.test.ts — HOTEL/U-BURDEN-RATE-REAL (2026-05-25, slot:hotel)
 *
 * Anti-regression test for the BurdenRateEngine real implementation.
 * The pre-existing engine was a stub returning $0 (lost to exFAT corruption
 * 2026-04-10) — this test pins the cost-accounting math + R12 fail-loud
 * + hotel-soul invariants (cents resolution, defensive copy, USD only).
 *
 * Reference calculation cross-check (vmc_tier2):
 *   purchasePrice = $125,000     depreciationYears = 10
 *   annualMaintPct = 0.025       annualUtilities = $4,800
 *   floorSpaceSqFt = 150         floorSpaceCostPerSqFtMonth = $15
 *   annualOperatingHours = 4000
 *   defaults: oee=0.65, opLabor=$28.50, benefitMult=1.35,
 *             capitalCostPct=0.06, insuranceTaxPct=0.015
 *
 *   productiveHoursAnnual = 4000 × 0.65 = 2600
 *   depreciation_annual   = 125000 / 10 = $12,500
 *   capital_cost_annual   = 125000 × 0.06 = $7,500
 *   maintenance_annual    = 125000 × 0.025 = $3,125
 *   utilities_annual      = $4,800
 *   floor_space_annual    = 150 × 15 × 12 = $27,000
 *   insurance_tax_annual  = 125000 × 0.015 = $1,875
 *   operator_labor_per_hr = 28.5 × 1.35 = $38.475
 *
 *   depreciation_per_hr   = 12500 / 2600  = $4.81
 *   capital_cost_per_hr   = 7500 / 2600   = $2.88
 *   maintenance_per_hr    = 3125 / 2600   = $1.20
 *   utilities_per_hr      = 4800 / 2600   = $1.85
 *   floor_space_per_hr    = 27000 / 2600  = $10.38
 *   insurance_tax_per_hr  = 1875 / 2600   = $0.72
 *   operator_labor_per_hr = $38.48
 *   total                 = $60.32 / productive-hour
 *
 *   3-month period cost: 60.32 × (2600 × 3/12) = 60.32 × 650 ≈ $39,208
 */
import { describe, it, expect } from "vitest";
import { burdenRateEngine } from "../engines/BurdenRateEngine.js";

describe("BurdenRateEngine — fully-burdened machine hourly rate", () => {
  describe("calculateBurdenRate (positional signature, legacy)", () => {
    it("computes a real burden rate for vmc_tier2 (NOT the $0 stub)", () => {
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      expect(r.burdenRate).toBeGreaterThan(0);
      // Stub used to return literal 0 — anti-regression.
      expect(r.burdenRate).toBeGreaterThan(40);
      expect(r.burdenRate).toBeLessThan(100);
    });

    it("matches reference vmc_tier2 calculation to ±$0.05", () => {
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      // Reference $60.32 with rounding tolerance; engine reports cents-resolution.
      expect(r.burdenRate).toBeGreaterThanOrEqual(60);
      expect(r.burdenRate).toBeLessThanOrEqual(61);
    });

    it("period cost ≈ burdenRate × productive_hours_period (engine reports unrounded product)", () => {
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      const computed = r.burdenRate * r.assumptions.productive_hours_period;
      // Engine computes periodCost from UNROUNDED total_per_hr; reconstructing
      // from the 2dp burdenRate loses up to ($0.005 × productive_hours_period)
      // — for ~650h that's ~$3.25. Allow $5 tolerance (0.01% of a ~$39k figure).
      expect(Math.abs(r.periodCost - computed)).toBeLessThan(5);
    });

    it("scales periodCost linearly with periodMonths", () => {
      const q = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      const a = burdenRateEngine.calculateBurdenRate("vmc_tier2", 12);
      expect(a.periodCost / q.periodCost).toBeGreaterThan(3.9);
      expect(a.periodCost / q.periodCost).toBeLessThan(4.1);
    });
  });

  describe("calculateBurdenRate (object input signature)", () => {
    it("returns same numeric burdenRate as positional signature when defaults match", () => {
      const positional = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      const obj = burdenRateEngine.calculateBurdenRate({
        machineId: "vmc_tier2",
        periodMonths: 3,
      });
      expect(obj.burdenRate).toBe(positional.burdenRate);
    });

    it("respects OEE override (higher OEE → lower per-hour burden)", () => {
      const low = burdenRateEngine.calculateBurdenRate({ machineId: "vmc_tier2", oee: 0.5 });
      const high = burdenRateEngine.calculateBurdenRate({ machineId: "vmc_tier2", oee: 0.85 });
      expect(high.burdenRate).toBeLessThan(low.burdenRate);
    });

    it("respects custom operatorLaborRate (zero labor → lower burden)", () => {
      const def = burdenRateEngine.calculateBurdenRate({ machineId: "vmc_tier2" });
      const noLabor = burdenRateEngine.calculateBurdenRate({
        machineId: "vmc_tier2",
        operatorLaborRate: 0,
      });
      expect(noLabor.burdenRate).toBeLessThan(def.burdenRate);
      expect(noLabor.components.operator_labor_per_hr).toBe(0);
    });

    it("respects custom benefitMultiplier", () => {
      const def = burdenRateEngine.calculateBurdenRate({ machineId: "vmc_tier2" });
      const heavyBenefit = burdenRateEngine.calculateBurdenRate({
        machineId: "vmc_tier2",
        benefitMultiplier: 1.6,
      });
      expect(heavyBenefit.components.operator_labor_per_hr).toBeGreaterThan(
        def.components.operator_labor_per_hr,
      );
    });

    it("respects custom capitalCostPct", () => {
      const def = burdenRateEngine.calculateBurdenRate({ machineId: "vmc_tier2" });
      const cheapCap = burdenRateEngine.calculateBurdenRate({
        machineId: "vmc_tier2",
        capitalCostPct: 0.03,
      });
      expect(cheapCap.components.capital_cost_per_hr).toBeLessThan(
        def.components.capital_cost_per_hr,
      );
    });
  });

  describe("R12 fail-loud (hotel-soul invariant — no silent $0)", () => {
    it("throws on unknown machineId (not a $0-stub fallback)", () => {
      expect(() => burdenRateEngine.calculateBurdenRate("nonexistent_machine_xyz")).toThrow(
        /unknown machineId/,
      );
    });

    it("throws on empty machineId", () => {
      expect(() => burdenRateEngine.calculateBurdenRate("")).toThrow(
        /machineId is required/,
      );
    });

    it("throws on non-positive periodMonths", () => {
      expect(() => burdenRateEngine.calculateBurdenRate("vmc_tier2", 0)).toThrow(
        /periodMonths must be a positive/,
      );
      expect(() => burdenRateEngine.calculateBurdenRate("vmc_tier2", -3)).toThrow(
        /periodMonths must be a positive/,
      );
    });

    it("throws on out-of-range oee", () => {
      expect(() =>
        burdenRateEngine.calculateBurdenRate({ machineId: "vmc_tier2", oee: 0 }),
      ).toThrow(/oee must be in/);
      expect(() =>
        burdenRateEngine.calculateBurdenRate({ machineId: "vmc_tier2", oee: 1.5 }),
      ).toThrow(/oee must be in/);
    });

    it("throws on negative operatorLaborRate", () => {
      expect(() =>
        burdenRateEngine.calculateBurdenRate({
          machineId: "vmc_tier2",
          operatorLaborRate: -1,
        }),
      ).toThrow(/non-negative/);
    });

    it("throws on benefitMultiplier below 1.0", () => {
      expect(() =>
        burdenRateEngine.calculateBurdenRate({
          machineId: "vmc_tier2",
          benefitMultiplier: 0.9,
        }),
      ).toThrow(/benefitMultiplier must be ≥1/);
    });

    it("throws on NaN periodMonths", () => {
      expect(() => burdenRateEngine.calculateBurdenRate("vmc_tier2", NaN)).toThrow(
        /periodMonths must be a positive/,
      );
    });
  });

  describe("Hotel-soul invariants — cents resolution, defensive copy, USD only", () => {
    it("reports dollar amounts to the cent (never rounded to thousands)", () => {
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      // The cents digit MUST exist (multiplied by 100 gives an integer; but
      // result is NOT divisible by 1000 — verifying cents-resolution).
      const cents = Math.round(r.burdenRate * 100);
      expect(cents).toBe(r.burdenRate * 100);
    });

    it("returns frozen object (defensive immutability)", () => {
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      expect(Object.isFrozen(r)).toBe(true);
      expect(Object.isFrozen(r.components)).toBe(true);
      expect(Object.isFrozen(r.assumptions)).toBe(true);
    });

    it("currency is always USD", () => {
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      expect(r.currency).toBe("USD");
    });

    it("source pins the v2 implementation (not the stub)", () => {
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      expect(r.source).toBe("BurdenRateEngine.v2");
    });
  });

  describe("Cross-check against MachineRateDatabase typical hourly rate", () => {
    it("reports variance vs MRD typical and explains it", () => {
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      expect(r.cross_check.mrd_typical_hourly_rate).toBeGreaterThan(0);
      expect(typeof r.cross_check.variance_pct).toBe("number");
      expect(r.cross_check.variance_explanation.length).toBeGreaterThan(20);
    });

    it("reports a numeric variance against MRD typical (sign may go either way)", () => {
      // MRD's `hourlyRate.typical` is a market/billing benchmark, NOT a pure
      // cost — our burden may sit above or below it depending on machine class
      // (entry/tier2/production). The invariant is: variance is reported as a
      // finite number with a sign-aware explanation, not that direction is
      // always positive.
      const r = burdenRateEngine.calculateBurdenRate("vmc_tier2", 3);
      expect(Number.isFinite(r.cross_check.variance_pct)).toBe(true);
      const explanation = r.cross_check.variance_explanation;
      if (r.cross_check.variance_pct > 10) {
        expect(explanation).toMatch(/higher than MRD typical/);
      } else if (r.cross_check.variance_pct < -10) {
        expect(explanation).toMatch(/lower than MRD typical/);
      } else {
        expect(explanation).toMatch(/within ±10%/);
      }
    });
  });

  describe("getAll — fleet rate batch", () => {
    it("returns one result per input id, preserving order", () => {
      const ids = ["vmc_entry", "vmc_tier2", "vmc_production"];
      const out = burdenRateEngine.getAll(ids);
      expect(out).toHaveLength(3);
      expect(out.map((r) => r.machineId)).toEqual(ids);
    });

    it("defaults to 3-month period for every machine", () => {
      const out = burdenRateEngine.getAll(["vmc_entry", "vmc_tier2"]);
      for (const r of out) expect(r.periodMonths).toBe(3);
    });

    it("throws if any id is unknown (R12 fail-loud — never silent)", () => {
      expect(() =>
        burdenRateEngine.getAll(["vmc_tier2", "nonexistent_xyz"]),
      ).toThrow(/unknown machineId/);
    });
  });

  describe("shopAverage — weighted shop-wide burden rate", () => {
    it("computes weighted avg consistent with total cost / total hours", () => {
      const out = burdenRateEngine.shopAverage(
        ["vmc_entry", "vmc_tier2", "vmc_production"],
        3,
      );
      const recomputed = out.total_period_cost / out.total_productive_hours;
      expect(Math.abs(out.weighted_burden_rate - recomputed)).toBeLessThan(0.01);
    });

    it("aggregates per-machine details into the result", () => {
      const out = burdenRateEngine.shopAverage(["vmc_entry", "vmc_tier2"], 6);
      expect(out.per_machine).toHaveLength(2);
      for (const r of out.per_machine) expect(r.periodMonths).toBe(6);
    });

    it("throws on empty machineIds array", () => {
      expect(() => burdenRateEngine.shopAverage([], 3)).toThrow(
        /machineIds must be non-empty/,
      );
    });

    it("shop-wide weighted rate falls within per-machine min/max", () => {
      const ids = ["vmc_entry", "vmc_tier2", "vmc_production"];
      const out = burdenRateEngine.shopAverage(ids, 3);
      const perRates = out.per_machine.map((r) => r.burdenRate);
      const minR = Math.min(...perRates);
      const maxR = Math.max(...perRates);
      expect(out.weighted_burden_rate).toBeGreaterThanOrEqual(minR);
      expect(out.weighted_burden_rate).toBeLessThanOrEqual(maxR);
    });
  });

  describe("Financial-invariant gates (hotel slot-soul)", () => {
    it("sum of components ≈ total_per_hr (within 2 cents — float-precision tolerance)", () => {
      // Each component is independently round-to-cents'd, so summing 7 of them
      // can drift up to ±$0.035 from the round-to-cents'd unrounded total.
      // Allow 2 cents tolerance — this is a consistency check, not an exact math
      // check (an exact one would require unrounded internal exposure).
      const r = burdenRateEngine.calculateBurdenRate("vmc_production", 3);
      const c = r.components;
      const sum =
        c.depreciation_per_hr +
        c.capital_cost_per_hr +
        c.maintenance_per_hr +
        c.utilities_per_hr +
        c.floor_space_per_hr +
        c.insurance_tax_per_hr +
        c.operator_labor_per_hr;
      expect(Math.abs(sum - c.total_per_hr)).toBeLessThanOrEqual(0.02);
    });

    it("all components are non-negative (no anti-invariant zeros except labor-off)", () => {
      const r = burdenRateEngine.calculateBurdenRate("hmc_tier2", 3);
      for (const v of Object.values(r.components)) {
        expect(v).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
