/**
 * UncertaintyQuantificationEngine — Comprehensive Test Suite
 *
 * Tests: Monte Carlo propagation, Sobol sensitivity indices,
 *        prediction intervals, distribution sampling, edge cases.
 */

import { describe, it, expect } from 'vitest';
import {
  uncertaintyQuantificationEngine,
  type UncertaintyParameter,
  type UncertaintyInput,
} from '../../engines/UncertaintyQuantificationEngine.js';

// ── Test Parameters ─────────────────────────────────────────────────

const cuttingSpeedParam: UncertaintyParameter = {
  name: 'Vc',
  nominal: 200,
  distribution: 'normal',
  std: 10,
  unit: 'm/min',
};

const feedParam: UncertaintyParameter = {
  name: 'fz',
  nominal: 0.1,
  distribution: 'uniform',
  min: 0.08,
  max: 0.12,
  unit: 'mm/tooth',
};

const depthParam: UncertaintyParameter = {
  name: 'ap',
  nominal: 3.0,
  distribution: 'triangular',
  min: 2.5,
  max: 3.5,
  mode: 3.0,
  unit: 'mm',
};

const toolDiamParam: UncertaintyParameter = {
  name: 'D',
  nominal: 12,
  distribution: 'lognormal',
  std: 0.05,
  unit: 'mm',
};

/** Simple linear model: force = 2000 * fz * ap */
function simpleForceModel(
  params: Record<string, number>
): Record<string, number> {
  const force = 2000 * params['fz'] * params['ap'];
  return { force_N: force };
}

/** Multi-output model */
function multiOutputModel(
  params: Record<string, number>
): Record<string, number> {
  const force = 2000 * params['fz'] * params['ap'];
  const temp = 0.5 * params['Vc'] * Math.sqrt(params['fz']);
  return { force_N: force, temperature_C: temp };
}

/** Constant model (zero variance output) */
function constantModel(): Record<string, number> {
  return { force_N: 500 };
}

// ── Tests ───────────────────────────────────────────────────────────

describe('UncertaintyQuantificationEngine', () => {

  // ── sampleDistribution ────────────────────────────────────────

  describe('sampleDistribution', () => {
    it('normal samples cluster around nominal', () => {
      const samples: number[] = [];
      for (let i = 0; i < 1000; i++) {
        samples.push(
          uncertaintyQuantificationEngine.sampleDistribution(cuttingSpeedParam)
        );
      }
      const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
      expect(mean).toBeCloseTo(200, -1); // within ~10
    });

    it('uniform samples stay within [min, max]', () => {
      for (let i = 0; i < 500; i++) {
        const val = uncertaintyQuantificationEngine.sampleDistribution(
          feedParam
        );
        expect(val).toBeGreaterThanOrEqual(0.08);
        expect(val).toBeLessThanOrEqual(0.12);
      }
    });

    it('triangular samples stay within [min, max]', () => {
      for (let i = 0; i < 500; i++) {
        const val = uncertaintyQuantificationEngine.sampleDistribution(
          depthParam
        );
        expect(val).toBeGreaterThanOrEqual(2.5);
        expect(val).toBeLessThanOrEqual(3.5);
      }
    });

    it('lognormal samples are always positive', () => {
      for (let i = 0; i < 500; i++) {
        const val = uncertaintyQuantificationEngine.sampleDistribution(
          toolDiamParam
        );
        expect(val).toBeGreaterThan(0);
      }
    });

    it('normal uses default std of 5% when not specified', () => {
      const param: UncertaintyParameter = {
        name: 'x',
        nominal: 100,
        distribution: 'normal',
        unit: 'mm',
      };
      const samples: number[] = [];
      for (let i = 0; i < 2000; i++) {
        samples.push(
          uncertaintyQuantificationEngine.sampleDistribution(param)
        );
      }
      const mean = samples.reduce((s, v) => s + v, 0) / samples.length;
      const sd = Math.sqrt(
        samples.reduce((s, v) => s + (v - mean) ** 2, 0) / samples.length
      );
      // Default std = 100 * 0.05 = 5
      expect(sd).toBeCloseTo(5, 0);
    });
  });

  // ── monteCarloSample ──────────────────────────────────────────

  describe('monteCarloSample', () => {
    it('generates correct number of samples', () => {
      const samples = uncertaintyQuantificationEngine.monteCarloSample(
        [cuttingSpeedParam, feedParam],
        100
      );
      expect(samples).toHaveLength(100);
    });

    it('each sample has all parameter names', () => {
      const params = [cuttingSpeedParam, feedParam, depthParam];
      const samples = uncertaintyQuantificationEngine.monteCarloSample(
        params,
        50
      );
      for (const s of samples) {
        expect(s).toHaveProperty('Vc');
        expect(s).toHaveProperty('fz');
        expect(s).toHaveProperty('ap');
      }
    });

    it('returns empty array for n=0', () => {
      const samples = uncertaintyQuantificationEngine.monteCarloSample(
        [cuttingSpeedParam],
        0
      );
      expect(samples).toHaveLength(0);
    });
  });

  // ── sobolIndices ──────────────────────────────────────────────

  describe('sobolIndices', () => {
    it('returns indices for each parameter', () => {
      const params = [feedParam, depthParam];
      const indices = uncertaintyQuantificationEngine.sobolIndices(
        params,
        simpleForceModel,
        256,
        'force_N'
      );
      expect(indices).toHaveLength(2);
      expect(indices[0].parameter).toBe('fz');
      expect(indices[1].parameter).toBe('ap');
    });

    it('first-order indices are in [0, 1]', () => {
      const params = [feedParam, depthParam];
      const indices = uncertaintyQuantificationEngine.sobolIndices(
        params,
        simpleForceModel,
        256,
        'force_N'
      );
      for (const idx of indices) {
        expect(idx.first_order).toBeGreaterThanOrEqual(0);
        expect(idx.first_order).toBeLessThanOrEqual(1);
      }
    });

    it('total-order >= first-order for each param', () => {
      const params = [feedParam, depthParam];
      const indices = uncertaintyQuantificationEngine.sobolIndices(
        params,
        simpleForceModel,
        256,
        'force_N'
      );
      for (const idx of indices) {
        expect(idx.total_order).toBeGreaterThanOrEqual(idx.first_order);
      }
    });

    it('interaction = total_order - first_order', () => {
      const params = [feedParam, depthParam];
      const indices = uncertaintyQuantificationEngine.sobolIndices(
        params,
        simpleForceModel,
        256,
        'force_N'
      );
      for (const idx of indices) {
        expect(idx.interaction).toBeCloseTo(
          idx.total_order - idx.first_order,
          4
        );
      }
    });

    it('returns empty for no parameters', () => {
      const indices = uncertaintyQuantificationEngine.sobolIndices(
        [],
        simpleForceModel,
        100,
        'force_N'
      );
      expect(indices).toHaveLength(0);
    });

    it('constant model yields zero indices', () => {
      const params = [feedParam, depthParam];
      const indices = uncertaintyQuantificationEngine.sobolIndices(
        params,
        constantModel,
        128,
        'force_N'
      );
      for (const idx of indices) {
        expect(idx.first_order).toBeCloseTo(0, 4);
        expect(idx.total_order).toBeCloseTo(0, 4);
      }
    });
  });

  // ── quantify (full pipeline) ──────────────────────────────────

  describe('quantify', () => {
    it('produces output statistics for a simple model', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 500,
      });
      expect(result.outputs).toHaveLength(1);
      const out = result.outputs[0];
      expect(out.name).toBe('force_N');
      // Nominal: 2000 * 0.1 * 3.0 = 600
      expect(out.mean).toBeCloseTo(600, -2); // within ~100
      expect(out.std).toBeGreaterThan(0);
      expect(out.cv_pct).toBeGreaterThan(0);
    });

    it('prediction interval brackets the mean', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 500,
      });
      const out = result.outputs[0];
      expect(out.prediction_interval[0]).toBeLessThan(out.mean);
      expect(out.prediction_interval[1]).toBeGreaterThan(out.mean);
    });

    it('percentiles are in correct order', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 500,
      });
      const out = result.outputs[0];
      expect(out.percentile_5).toBeLessThanOrEqual(out.percentile_25);
      expect(out.percentile_25).toBeLessThanOrEqual(out.median);
      expect(out.median).toBeLessThanOrEqual(out.percentile_75);
      expect(out.percentile_75).toBeLessThanOrEqual(out.percentile_95);
    });

    it('model_form_uncertainty = |mean| * bias_pct / 100', () => {
      const biasPct = 8;
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 200,
        model_bias_pct: biasPct,
      });
      const out = result.outputs[0];
      const expected = Math.abs(out.mean) * (biasPct / 100);
      expect(out.model_form_uncertainty).toBeCloseTo(expected, 3);
    });

    it('total_uncertainty >= std and >= model_form', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 300,
        model_bias_pct: 5,
      });
      const out = result.outputs[0];
      expect(out.total_uncertainty).toBeGreaterThanOrEqual(
        out.std - 0.001
      );
      expect(out.total_uncertainty).toBeGreaterThanOrEqual(
        out.model_form_uncertainty - 0.001
      );
    });

    it('handles multi-output models', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [cuttingSpeedParam, feedParam, depthParam],
        model: multiOutputModel,
        n_samples: 300,
        output_names: ['force_N', 'temperature_C'],
      });
      expect(result.outputs).toHaveLength(2);
      expect(result.outputs[0].name).toBe('force_N');
      expect(result.outputs[1].name).toBe('temperature_C');
    });

    it('identifies most influential parameter', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 300,
        compute_sobol: true,
      });
      expect(result.most_influential_parameter).toBeTruthy();
      expect(['fz', 'ap']).toContain(
        result.most_influential_parameter
      );
    });

    it('single parameter gets sobol index of 1', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam],
        model: (p) => ({ force_N: 2000 * p['fz'] * 3 }),
        n_samples: 200,
        compute_sobol: true,
      });
      expect(result.sobol_indices).toHaveLength(1);
      expect(result.sobol_indices[0].first_order).toBe(1);
      expect(result.sobol_indices[0].total_order).toBe(1);
    });

    it('warns for low sample count', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam],
        model: simpleForceModel,
        n_samples: 32,
      });
      expect(
        result.warnings.some(w => w.includes('below 64'))
      ).toBe(true);
    });

    it('returns empty result for no parameters', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [],
        model: simpleForceModel,
      });
      expect(result.outputs).toHaveLength(0);
      expect(result.n_samples_actual).toBe(0);
      expect(
        result.warnings.some(w => w.includes('No input parameters'))
      ).toBe(true);
    });

    it('returns empty result when model returns no outputs', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam],
        model: () => ({}),
        n_samples: 100,
      });
      expect(result.outputs).toHaveLength(0);
      expect(
        result.warnings.some(w => w.includes('no outputs'))
      ).toBe(true);
    });

    it('formula string contains Sobol and MC description', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 100,
      });
      expect(result.formula).toContain('MC propagation');
      expect(result.formula).toContain('Sobol');
    });

    it('n_samples_actual matches input', () => {
      const result = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam],
        model: simpleForceModel,
        n_samples: 250,
      });
      expect(result.n_samples_actual).toBe(250);
    });

    it('confidence level affects prediction interval width', () => {
      const narrow = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 500,
        confidence_level: 0.80,
        compute_sobol: false,
      });
      const wide = uncertaintyQuantificationEngine.quantify({
        parameters: [feedParam, depthParam],
        model: simpleForceModel,
        n_samples: 500,
        confidence_level: 0.99,
        compute_sobol: false,
      });
      const narrowWidth =
        narrow.outputs[0].prediction_interval[1] -
        narrow.outputs[0].prediction_interval[0];
      const wideWidth =
        wide.outputs[0].prediction_interval[1] -
        wide.outputs[0].prediction_interval[0];
      expect(wideWidth).toBeGreaterThan(narrowWidth);
    });
  });
});
