import { describe, it, expect } from 'vitest';
import {
  metrologyBudgetEngine,
  MetrologyBudgetEngine,
} from '../engines/MetrologyBudgetEngine.js';

describe('MetrologyBudgetEngine', () => {
  const engine = metrologyBudgetEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(MetrologyBudgetEngine);
  });

  // ── expandedUncertainty ─────────────────────────────────────────
  describe('expandedUncertainty()', () => {
    it('combines sources via RSS and Welch-Satterthwaite', () => {
      const r = engine.expandedUncertainty({
        sources: [
          { name: 'repeatability', u: 0.5, dof: 9 },
          { name: 'calibration', u: 0.3, dof: 50 },
          { name: 'resolution', u: 0.1, dof: Infinity },
        ],
      });
      // uc = sqrt(0.25 + 0.09 + 0.01) = sqrt(0.35) ≈ 0.5916
      expect(r.combined_uc).toBeCloseTo(0.5916, 3);
      expect(r.expanded_U).toBeGreaterThan(r.combined_uc);
      expect(r.coverage_factor_k).toBeGreaterThan(1.9);
      expect(r.contributions.length).toBe(3);
      expect(r.contributions[0].pct).toBeGreaterThan(50);
      expect(r.formula).toContain('uc');
    });

    it('flags dominant uncertainty source', () => {
      const r = engine.expandedUncertainty({
        sources: [
          { name: 'dominant', u: 10, dof: 9 },
          { name: 'minor', u: 0.1, dof: 50 },
        ],
      });
      expect(
        r.warnings.some((w: string) => w.includes('Dominant'))
      ).toBe(true);
    });
  });

  // ── thermalCompensation ─────────────────────────────────────────
  describe('thermalCompensation()', () => {
    it('computes thermal expansion ΔL = α×L×ΔT', () => {
      const r = engine.thermalCompensation({
        nominal_mm: 100,
        cte: 11.7e-6,
        delta_T: 5,
      });
      // ΔL = 11.7e-6 * 100 * 5 = 0.00585 mm
      expect(r.thermal_error_mm).toBeCloseTo(0.00585, 5);
      expect(r.compensated_dim_mm).toBeCloseTo(100.00585, 5);
    });

    it('warns on large temperature deviation', () => {
      const r = engine.thermalCompensation({
        nominal_mm: 500,
        cte: 11.7e-6,
        delta_T: 10,
      });
      expect(
        r.warnings.some((w: string) => w.includes('ΔT'))
      ).toBe(true);
    });

    it('computes thermal uncertainty from CTE and temp', () => {
      const r = engine.thermalCompensation({
        nominal_mm: 100,
        cte: 11.7e-6,
        delta_T: 5,
        cte_uncertainty: 1e-6,
        temp_uncertainty: 0.5,
      });
      expect(r.thermal_uncertainty_mm).toBeGreaterThan(0);
    });
  });

  // ── conformanceProbability ──────────────────────────────────────
  describe('conformanceProbability()', () => {
    it('computes probability for centered 3-sigma process', () => {
      const r = engine.conformanceProbability({
        mu: 50, sigma: 1, usl: 53, lsl: 47,
      });
      expect(r.probability_conforming).toBeGreaterThan(0.997);
      expect(r.ppm_nonconforming).toBeLessThan(3000);
      expect(r.z_upper).toBeCloseTo(3, 1);
      expect(r.z_lower).toBeCloseTo(-3, 1);
    });

    it('warns on off-center process', () => {
      const r = engine.conformanceProbability({
        mu: 52, sigma: 1, usl: 53, lsl: 47,
      });
      expect(
        r.warnings.some((w: string) => w.includes('off-center'))
      ).toBe(true);
    });
  });

  // ── guardBand ───────────────────────────────────────────────────
  describe('guardBand()', () => {
    it('computes ISO 14253-1 guard band', () => {
      const r = engine.guardBand({
        usl: 50.5, lsl: 49.5,
        expanded_uncertainty_U: 0.05,
      });
      expect(r.tolerance).toBeCloseTo(1.0, 5);
      expect(r.guard_band).toBeCloseTo(0.05, 5);
      expect(r.acceptance_zone_width).toBeCloseTo(0.9, 5);
      expect(r.acceptance_upper).toBeCloseTo(50.45, 5);
      expect(r.acceptance_lower).toBeCloseTo(49.55, 5);
    });

    it('warns when U exceeds tolerance ratio', () => {
      const r = engine.guardBand({
        usl: 50.1, lsl: 49.9,
        expanded_uncertainty_U: 0.15,
      });
      expect(r.warnings.length).toBeGreaterThan(0);
      expect(r.acceptance_zone_width).toBeLessThan(0);
    });
  });

  // ── calculate dispatcher ────────────────────────────────────────
  it('dispatches via calculate()', () => {
    const r = engine.calculate({
      action: 'metrology_thermal_compensation',
      params: { nominal_mm: 100, cte: 12e-6, delta_T: 3 },
    });
    expect(r).toBeDefined();
    expect(r.thermal_error_mm).toBeGreaterThan(0);
  });

  it('throws on unknown action', () => {
    expect(() => engine.calculate({
      action: 'bogus', params: {},
    })).toThrow();
  });
});
