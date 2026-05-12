import { describe, it, expect } from 'vitest';
import {
  sustainabilityFormulasEngine,
  SustainabilityFormulasEngine,
} from '../engines/SustainabilityFormulasEngine.js';

describe('SustainabilityFormulasEngine', () => {
  const engine = sustainabilityFormulasEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(SustainabilityFormulasEngine);
  });

  // ── carbonFootprint ─────────────────────────────────────────────
  describe('carbonFootprint()', () => {
    it('computes scope 1+2+3 emissions', () => {
      const r = engine.carbonFootprint({
        electricity_kwh: 100,
        grid_ef_kg_per_kwh: 0.5,
        natural_gas_m3: 10,
        gas_ef_kg_per_m3: 2.0,
        material_mass_kg: 50,
        material_ef_kg_per_kg: 2.0,
      });
      // scope1 = 10*2 = 20, scope2 = 100*0.5 = 50, scope3 = 50*2 = 100
      expect(r.scope1_kg_co2).toBeCloseTo(20, 1);
      expect(r.scope2_kg_co2).toBeCloseTo(50, 1);
      expect(r.scope3_kg_co2).toBeCloseTo(100, 1);
      expect(r.total_kg_co2).toBeCloseTo(170, 1);
      expect(r.breakdown.length).toBe(3);
      expect(r.formula).toContain('Scope');
    });

    it('computes per-part emissions for batch', () => {
      const r = engine.carbonFootprint({
        electricity_kwh: 200,
        batch_size: 10,
      });
      expect(r.per_part_kg_co2).toBeCloseTo(
        r.total_kg_co2 / 10, 5
      );
    });
  });

  // ── specificEnergy ──────────────────────────────────────────────
  describe('specificEnergy()', () => {
    it('computes SEC = P*t/V', () => {
      const r = engine.specificEnergy({
        power_kw: 5,
        cutting_time_min: 2,
        volume_removed_cm3: 100,
        material: 'steel',
      });
      // SEC = 5 * 2 * 60 / 100 = 6 kJ/cm3
      expect(r.sec_kj_per_cm3).toBeCloseTo(6, 1);
      expect(r.theoretical_min_kj_per_cm3).toBe(2.0);
      expect(r.efficiency_pct).toBeCloseTo(33.3, 1);
      expect(r.energy_rating).toContain('C');
    });

    it('rates excellent efficiency for aluminum', () => {
      const r = engine.specificEnergy({
        power_kw: 2,
        cutting_time_min: 1,
        volume_removed_cm3: 200,
        material: 'aluminum',
      });
      // SEC = 2*60/200 = 0.6, theor = 0.4, eff = 66.7%
      expect(r.efficiency_pct).toBeGreaterThan(60);
      expect(r.energy_rating).toContain('A');
    });
  });

  // ── coolantLifecycle ────────────────────────────────────────────
  describe('coolantLifecycle()', () => {
    it('computes TCO and optimal replacement', () => {
      const r = engine.coolantLifecycle({
        purchase_cost: 500,
        fill_volume_liters: 200,
        maintenance_cost_per_week: 50,
        expected_life_weeks: 26,
        disposal_cost_per_liter: 0.5,
      });
      // TCO = 500 + 50*26 + 200*0.5 = 500 + 1300 + 100 = 1900
      expect(r.tco).toBeCloseTo(1900, 0);
      expect(r.cost_per_week).toBeCloseTo(1900 / 26, 1);
      expect(r.optimal_replace_weeks).toBeGreaterThan(0);
      expect(r.formula).toContain('TCO');
    });

    it('includes top-up costs', () => {
      const r = engine.coolantLifecycle({
        purchase_cost: 500,
        fill_volume_liters: 200,
        maintenance_cost_per_week: 50,
        expected_life_weeks: 26,
        disposal_cost_per_liter: 0.5,
        topup_rate_liters_per_week: 5,
        topup_cost_per_liter: 2,
      });
      // topup = 5*2*26 = 260
      expect(r.tco).toBeCloseTo(1900 + 260, 0);
      expect(r.topup_pct).toBeGreaterThan(0);
    });
  });

  // ── materialUtilization ─────────────────────────────────────────
  describe('materialUtilization()', () => {
    it('computes utilization and buy-to-fly', () => {
      const r = engine.materialUtilization({
        part_volume_cm3: 50,
        stock_volume_cm3: 200,
        material_cost_per_cm3: 0.1,
        scrap_value_per_cm3: 0.02,
      });
      expect(r.utilization_pct).toBeCloseTo(25, 1);
      expect(r.buy_to_fly_ratio).toBeCloseTo(4, 1);
      expect(r.material_wasted_cm3).toBeCloseTo(150, 0);
      expect(r.material_cost).toBeCloseTo(20, 1);
      expect(r.scrap_recovery).toBeCloseTo(3, 1);
      expect(r.net_material_cost).toBeCloseTo(17, 1);
    });

    it('warns on very low utilization', () => {
      const r = engine.materialUtilization({
        part_volume_cm3: 10,
        stock_volume_cm3: 200,
      });
      expect(
        r.warnings.some(
          (w: string) => w.includes('low utilization')
        )
      ).toBe(true);
    });

    it('uses mass for buy-to-fly when provided', () => {
      const r = engine.materialUtilization({
        part_volume_cm3: 100,
        stock_volume_cm3: 500,
        part_mass_kg: 0.8,
        stock_mass_kg: 4.0,
      });
      expect(r.buy_to_fly_ratio).toBeCloseTo(5, 1);
    });
  });

  // ── calculate dispatcher ────────────────────────────────────────
  it('dispatches via calculate()', () => {
    const r = engine.calculate({
      action: 'sustainability_specific_energy',
      params: {
        power_kw: 3,
        cutting_time_min: 1,
        volume_removed_cm3: 50,
      },
    });
    expect(r).toBeDefined();
    expect(r.sec_kj_per_cm3).toBeGreaterThan(0);
  });

  it('throws on unknown action', () => {
    expect(() => engine.calculate({
      action: 'bogus', params: {},
    })).toThrow();
  });
});
