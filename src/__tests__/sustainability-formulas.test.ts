/**
 * Dedicated tests for SustainabilityFormulasEngine
 * Methods: carbonFootprint, specificEnergy, coolantLifecycle, materialUtilization
 */
import { describe, it, expect } from "vitest";
import { sustainabilityFormulasEngine } from "../engines/SustainabilityFormulasEngine.js";

describe("SustainabilityFormulasEngine", () => {
  describe("carbonFootprint", () => {
    it("should compute scope 1+2+3 emissions", () => {
      const r = sustainabilityFormulasEngine.carbonFootprint({
        electricity_kwh: 100,
        grid_ef_kg_per_kwh: 0.4,
        natural_gas_m3: 10,
        gas_ef_kg_per_m3: 2.0,
        material_mass_kg: 5,
        material_ef_kg_per_kg: 2.0,
        batch_size: 10,
      });
      expect(r.scope2_kg_co2).toBeCloseTo(40, 0);
      expect(r.scope1_kg_co2).toBeCloseTo(20, 0);
      expect(r.total_kg_co2).toBeCloseTo(70, 0);
      expect(r.per_part_kg_co2).toBeCloseTo(7, 0);
      expect(r.breakdown.length).toBeGreaterThanOrEqual(2);
    });

    it("should use default emission factors", () => {
      const r = sustainabilityFormulasEngine.carbonFootprint({
        electricity_kwh: 50,
      });
      expect(r.scope2_kg_co2).toBeCloseTo(50 * 0.4, 0);
      expect(r.total_kg_co2).toBeGreaterThan(0);
    });
  });

  describe("specificEnergy", () => {
    it("should compute SEC = P*t/V in kJ/cm3", () => {
      const r = sustainabilityFormulasEngine.specificEnergy({
        power_kw: 5,
        cutting_time_min: 10,
        volume_removed_cm3: 100,
      });
      // SEC = 5 * 10 * 60 / 100 = 30 kJ/cm3
      expect(r.sec_kj_per_cm3).toBeCloseTo(30, 0);
      expect(r.efficiency_pct).toBeGreaterThan(0);
      expect(r.energy_rating).toBeDefined();
    });

    it("should benchmark against theoretical minimum for aluminum", () => {
      const r = sustainabilityFormulasEngine.specificEnergy({
        power_kw: 2,
        cutting_time_min: 5,
        volume_removed_cm3: 200,
        material: "aluminum",
      });
      expect(r.theoretical_min_kj_per_cm3).toBeCloseTo(0.4, 1);
      expect(r.sec_kj_per_cm3).toBeGreaterThan(r.theoretical_min_kj_per_cm3);
    });
  });

  describe("coolantLifecycle", () => {
    it("should compute TCO and optimal replacement interval", () => {
      const r = sustainabilityFormulasEngine.coolantLifecycle({
        purchase_cost: 500,
        fill_volume_liters: 200,
        maintenance_cost_per_week: 20,
        expected_life_weeks: 26,
        disposal_cost_per_liter: 1.5,
      });
      expect(r.tco).toBeGreaterThan(0);
      expect(r.cost_per_week).toBeGreaterThan(0);
      expect(r.optimal_replace_weeks).toBeGreaterThan(0);
      expect(r.purchase_pct + r.maintenance_pct + r.disposal_pct + r.topup_pct).toBeCloseTo(100, 0);
    });

    it("should include top-up costs when provided", () => {
      const base = sustainabilityFormulasEngine.coolantLifecycle({
        purchase_cost: 500,
        fill_volume_liters: 200,
        maintenance_cost_per_week: 20,
        expected_life_weeks: 26,
        disposal_cost_per_liter: 1.5,
      });
      const withTopup = sustainabilityFormulasEngine.coolantLifecycle({
        purchase_cost: 500,
        fill_volume_liters: 200,
        maintenance_cost_per_week: 20,
        expected_life_weeks: 26,
        disposal_cost_per_liter: 1.5,
        topup_rate_liters_per_week: 5,
        topup_cost_per_liter: 3,
      });
      expect(withTopup.tco).toBeGreaterThan(base.tco);
      expect(withTopup.topup_pct).toBeGreaterThan(0);
    });
  });

  describe("materialUtilization", () => {
    it("should compute utilization and buy-to-fly ratio", () => {
      const r = sustainabilityFormulasEngine.materialUtilization({
        part_volume_cm3: 50,
        stock_volume_cm3: 200,
      });
      expect(r.utilization_pct).toBeCloseTo(25, 0);
      expect(r.buy_to_fly_ratio).toBeCloseTo(4, 1);
      expect(r.material_wasted_cm3).toBeCloseTo(150, 0);
    });

    it("should compute net material cost with scrap recovery", () => {
      const r = sustainabilityFormulasEngine.materialUtilization({
        part_volume_cm3: 50,
        stock_volume_cm3: 200,
        material_cost_per_cm3: 0.1,
        scrap_value_per_cm3: 0.02,
      });
      expect(r.material_cost).toBeCloseTo(20, 0);
      expect(r.scrap_recovery).toBeCloseTo(3, 0);
      expect(r.net_material_cost).toBeCloseTo(17, 0);
    });
  });
});
