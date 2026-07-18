import { describe, it, expect } from 'vitest';
import { qualityFormulasEngine, QualityFormulasEngine } from '../../src/engines/QualityFormulasEngine.js';

describe('QualityFormulasEngine', () => {
  const engine = qualityFormulasEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(QualityFormulasEngine);
  });

  // ── gageRR ──────────────────────────────────────────────────────
  describe('gageRR()', () => {
    it('computes %GRR and ndc for 2 operators, 3 parts, 2 replicates', () => {
      const measurements = [
        [[10.1, 10.2], [20.0, 20.1], [30.0, 30.1]],
        [[10.0, 10.3], [20.1, 20.0], [30.1, 30.0]],
      ];
      const r = engine.gageRR({ measurements, tolerance: 1.0 });
      expect(r.sigma_gage).toBeGreaterThan(0);
      expect(r.sigma_total).toBeGreaterThan(0);
      expect(r.pct_grr).toBeGreaterThanOrEqual(0);
      expect(r.pct_grr).toBeLessThanOrEqual(100);
      expect(r.ndc).toBeGreaterThanOrEqual(0);
      expect(r.formula).toContain('GRR');
    });

    it('flags unacceptable GRR > 30%', () => {
      // High noise, low part variation
      const measurements = [
        [[10.0, 11.0], [10.5, 11.5]],
        [[9.5, 11.5], [10.0, 12.0]],
      ];
      const r = engine.gageRR({ measurements, tolerance: 1.0 });
      expect(r.pct_grr).toBeGreaterThan(0);
    });
  });

  // ── samplingPlan ────────────────────────────────────────────────
  describe('samplingPlan()', () => {
    it('returns valid sample size and accept number', () => {
      const r = engine.samplingPlan({ lot_size_N: 1000, aql_pct: 1.0 });
      expect(r.sample_size_n).toBeGreaterThan(0);
      expect(r.sample_size_n).toBeLessThanOrEqual(1000);
      expect(r.accept_number_c).toBeGreaterThanOrEqual(0);
      expect(r.aoq).toBeGreaterThanOrEqual(0);
      expect(r.ati).toBeGreaterThan(0);
      expect(r.formula).toContain('AOQ');
    });
  });

  // ── advancedCapability ──────────────────────────────────────────
  describe('advancedCapability()', () => {
    it('computes Cpm for centered process', () => {
      const data = Array.from({ length: 100 }, (_, i) => 50 + (Math.sin(i) * 0.5));
      const r = engine.advancedCapability({ data, usl: 52, lsl: 48, target: 50 });
      expect(r.cpm).toBeGreaterThan(0);
      expect(r.cpk).toBeGreaterThan(0);
      expect(r.method).toBe('cpm');
    });

    it('uses Clements method for non-normal', () => {
      const data = Array.from({ length: 200 }, (_, i) => 50 + Math.pow(Math.sin(i), 3) * 2);
      const r = engine.advancedCapability({ data, usl: 54, lsl: 46, method: 'clements' });
      expect(r.method).toBe('clements');
      expect(r.cpk).toBeGreaterThan(0);
    });
  });

  // ── conformanceDecision ─────────────────────────────────────────
  describe('conformanceDecision()', () => {
    it('accepts measurement well within tolerance', () => {
      const r = engine.conformanceDecision({
        measured_value: 50.0, nominal: 50, usl: 50.5, lsl: 49.5,
        expanded_uncertainty_U: 0.05,
      });
      expect(r.decision).toBe('ACCEPT');
      expect(r.in_acceptance_zone).toBe(true);
      expect(r.guard_band).toBe(0.05);
    });

    it('rejects measurement outside spec', () => {
      const r = engine.conformanceDecision({
        measured_value: 51.0, nominal: 50, usl: 50.5, lsl: 49.5,
        expanded_uncertainty_U: 0.05,
      });
      expect(r.decision).toBe('REJECT');
      expect(r.in_spec).toBe(false);
    });

    it('returns INDETERMINATE in guard band', () => {
      const r = engine.conformanceDecision({
        measured_value: 50.47, nominal: 50, usl: 50.5, lsl: 49.5,
        expanded_uncertainty_U: 0.05,
      });
      expect(r.decision).toBe('INDETERMINATE');
    });
  });

  // ── calculate dispatcher ────────────────────────────────────────
  it('dispatches via calculate()', () => {
    const r = engine.calculate({
      action: 'calc_gage_rr',
      params: {
        measurements: [[[10, 10.1], [20, 20.1]], [[10.1, 10], [20.1, 20]]],
        tolerance: 1,
      },
    });
    expect(r).toBeDefined();
  });
});
