import { describe, it, expect } from 'vitest';
import {
  qualityFormulasEngine,
  QualityFormulasEngine,
} from '../engines/QualityFormulasEngine.js';

describe('QualityFormulasEngine', () => {
  const engine = qualityFormulasEngine;

  it('exports a singleton instance', () => {
    expect(engine).toBeInstanceOf(QualityFormulasEngine);
  });

  // ── gageRR ──────────────────────────────────────────────────────
  describe('gageRR()', () => {
    it('computes GRR metrics for 2 operators, 3 parts, 2 replicates', () => {
      const r = engine.gageRR({
        measurements: [
          [[10.1, 10.2], [20.0, 20.1], [30.0, 30.1]],
          [[10.0, 10.3], [20.1, 20.0], [30.1, 30.0]],
        ],
        tolerance: 1.0,
        operators: 2,
        parts: 3,
        replicates: 2,
      });
      expect(r.gage_rr).toBeGreaterThan(0);
      expect(r.ndc).toBeGreaterThanOrEqual(0);
      expect(r.assessment).toBeDefined();
    });
  });

  // ── samplingPlan ────────────────────────────────────────────────
  describe('samplingPlan()', () => {
    it('returns valid sample size and accept number', () => {
      const r = engine.samplingPlan({
        lot_size: 1000,
        aql: 0.01,
        ltpd: 0.05,
      });
      expect(r.sample_size).toBeGreaterThan(0);
      expect(r.accept_number).toBeGreaterThanOrEqual(0);
      expect(r.oc_curve).toBeDefined();
      expect(r.aoq_at_aql).toBeDefined();
    });
  });

  // ── processCapabilityAdvanced ───────────────────────────────────
  describe('processCapabilityAdvanced()', () => {
    it('computes Cpm for centered process', () => {
      const data = Array.from(
        { length: 100 },
        (_, i) => 50 + Math.sin(i) * 0.5
      );
      const r = engine.processCapabilityAdvanced({
        data,
        usl: 52,
        lsl: 48,
        target: 50,
      });
      expect(r.cpm).toBeGreaterThan(0);
      expect(r.cpk).toBeGreaterThan(0);
      expect(r.method).toBeDefined();
    });
  });

  // ── conformanceDecision ─────────────────────────────────────────
  describe('conformanceDecision()', () => {
    it('accepts measurement well within tolerance', () => {
      const r = engine.conformanceDecision({
        measured_value: 50.0,
        uncertainty: 0.05,
        usl: 50.5,
        lsl: 49.5,
      });
      expect(r.decision).toBe('conforming');
      expect(r.iso_zone).toBe('conformance');
      expect(r.guard_band).toBeGreaterThanOrEqual(0);
    });

    it('rejects measurement far outside spec', () => {
      const r = engine.conformanceDecision({
        measured_value: 52.0,
        uncertainty: 0.05,
        usl: 50.5,
        lsl: 49.5,
      });
      expect(r.decision).toBe('non_conforming');
    });

    it('returns indeterminate in guard band zone', () => {
      const r = engine.conformanceDecision({
        measured_value: 50.47,
        uncertainty: 0.05,
        usl: 50.5,
        lsl: 49.5,
      });
      expect(r.decision).toBe('indeterminate');
      expect(r.iso_zone).toBe('uncertainty');
    });
  });

  // ── calculate dispatcher ────────────────────────────────────────
  it('dispatches via calculate()', () => {
    const r = engine.calculate({
      action: 'calc_gage_rr',
      params: {
        measurements: [
          [[10, 10.1], [20, 20.1]],
          [[10.1, 10], [20.1, 20]],
        ],
        tolerance: 1,
        operators: 2,
        parts: 2,
        replicates: 2,
      },
    });
    expect(r).toBeDefined();
  });

  it('throws on unknown action', () => {
    expect(() => engine.calculate({
      action: 'bogus',
      params: {},
    })).toThrow();
  });
});
