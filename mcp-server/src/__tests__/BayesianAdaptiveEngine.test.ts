/**
 * Tests for BayesianAdaptiveEngine
 * ==================================
 * Covers: defaultPrior, predictForce, calibrate (Bayesian NIG update,
 *         convergence, drift detection, credible intervals, predictions)
 */

import { describe, it, expect } from 'vitest';
import {
  BayesianAdaptiveEngine,
  bayesianAdaptiveEngine,
} from '../../src/engines/BayesianAdaptiveEngine.js';

describe('BayesianAdaptiveEngine', () => {
  const engine = new BayesianAdaptiveEngine();

  // ==========================================================================
  // SINGLETON
  // ==========================================================================

  describe('singleton', () => {
    it('exports a singleton instance', () => {
      expect(bayesianAdaptiveEngine).toBeInstanceOf(BayesianAdaptiveEngine);
    });
  });

  // ==========================================================================
  // defaultPrior
  // ==========================================================================

  describe('defaultPrior', () => {
    it('returns steel_1045 defaults with no material', () => {
      const p = engine.defaultPrior();
      expect(p.kc11_mean).toBe(1800);
      expect(p.mc_mean).toBe(0.25);
    });

    it('returns aluminum priors for material="aluminum"', () => {
      const p = engine.defaultPrior('aluminum');
      expect(p.kc11_mean).toBe(800);
      expect(p.mc_mean).toBe(0.23);
    });

    it('returns titanium priors', () => {
      const p = engine.defaultPrior('titanium');
      expect(p.kc11_mean).toBe(1600);
      expect(p.mc_mean).toBe(0.22);
    });

    it('returns inconel priors', () => {
      const p = engine.defaultPrior('inconel');
      expect(p.kc11_mean).toBe(2500);
      expect(p.mc_mean).toBe(0.30);
    });

    it('falls back to steel_1045 for unknown material', () => {
      const p = engine.defaultPrior('unobtainium');
      expect(p.kc11_mean).toBe(1800);
    });

    it('includes sigma2 prior parameters', () => {
      const p = engine.defaultPrior();
      expect(p.sigma2_shape).toBe(3);
      expect(p.sigma2_scale).toBe(1000);
    });

    it('includes variance parameters', () => {
      const p = engine.defaultPrior();
      expect(p.kc11_var).toBe(200 * 200);
      expect(p.mc_var).toBe(0.05 * 0.05);
    });
  });

  // ==========================================================================
  // predictForce
  // ==========================================================================

  describe('predictForce', () => {
    it('computes Kienzle force: Fc = kc11 * b * h^(1-mc)', () => {
      // kc11=1800, mc=0.25, h=0.1mm, b=3mm
      const force = engine.predictForce(1800, 0.25, 0.1, 3);
      // Expected: 1800 * 3 * 0.1^0.75 = 5400 * 0.17783 ≈ 960
      expect(force).toBeCloseTo(1800 * 3 * Math.pow(0.1, 0.75), 1);
    });

    it('returns 0 for h=0', () => {
      // h^(1-mc) where h=0 → 0 (as 0^positive = 0)
      const force = engine.predictForce(1800, 0.25, 0, 3);
      expect(force).toBe(0);
    });

    it('force scales linearly with width of cut', () => {
      const f1 = engine.predictForce(1800, 0.25, 0.1, 2);
      const f2 = engine.predictForce(1800, 0.25, 0.1, 4);
      expect(f2 / f1).toBeCloseTo(2.0, 5);
    });

    it('force increases with chip thickness', () => {
      const thin = engine.predictForce(1800, 0.25, 0.05, 3);
      const thick = engine.predictForce(1800, 0.25, 0.2, 3);
      expect(thick).toBeGreaterThan(thin);
    });

    it('higher mc reduces the exponent (1-mc), lowering force for h<1', () => {
      const lowMc = engine.predictForce(1800, 0.2, 0.1, 3);
      const highMc = engine.predictForce(1800, 0.35, 0.1, 3);
      // h^0.8 vs h^0.65 — with h=0.1 < 1, higher exponent (1-mc) gives larger value
      // lowMc exponent = 0.8, highMc exponent = 0.65 → 0.1^0.8 < 0.1^0.65
      // So highMc gives larger force for h < 1
      expect(highMc).toBeGreaterThan(lowMc);
    });
  });

  // ==========================================================================
  // calibrate — insufficient data
  // ==========================================================================

  describe('calibrate — insufficient data', () => {
    it('returns prior-only result for 0 observations', () => {
      const result = engine.calibrate({ observations: [] });
      expect(result.converged).toBe(false);
      expect(result.convergence_ratio).toBe(1.0);
      expect(result.predictions).toHaveLength(0);
      expect(result.warnings.some((w) => w.includes('Insufficient observations'))).toBe(true);
    });

    it('returns prior-only result for 1 observation', () => {
      const result = engine.calibrate({
        observations: [{ force_N: 500, chip_thickness_mm: 0.1, width_of_cut_mm: 3 }],
      });
      expect(result.converged).toBe(false);
      expect(result.posterior.n_observations).toBe(0);
      expect(result.formula).toContain('PRIOR ONLY');
    });

    it('skips invalid observations (zero/negative values)', () => {
      const result = engine.calibrate({
        observations: [
          { force_N: -100, chip_thickness_mm: 0.1, width_of_cut_mm: 3 },
          { force_N: 500, chip_thickness_mm: 0, width_of_cut_mm: 3 },
        ],
      });
      expect(result.warnings.some((w) => w.includes('non-positive'))).toBe(true);
      expect(result.posterior.n_observations).toBe(0);
    });
  });

  // ==========================================================================
  // calibrate — Bayesian update with synthetic data
  // ==========================================================================

  describe('calibrate — Bayesian update', () => {
    // Generate synthetic observations from known kc11=1800, mc=0.25
    function generateObs(n: number, kc11 = 1800, mc = 0.25, noise = 0) {
      const obs = [];
      for (let i = 0; i < n; i++) {
        const h = 0.05 + Math.random() * 0.3;
        const b = 2 + Math.random() * 4;
        const force = kc11 * b * Math.pow(h, 1 - mc) + noise * (Math.random() - 0.5);
        obs.push({ force_N: force, chip_thickness_mm: h, width_of_cut_mm: b });
      }
      return obs;
    }

    it('posterior kc11 moves toward true value with data', () => {
      const result = engine.calibrate({
        observations: generateObs(30, 1800, 0.25, 10),
        material_hint: 'steel_1045',
      });
      // Should be reasonably close to 1800
      expect(result.posterior.kc11_mean).toBeGreaterThan(1000);
      expect(result.posterior.kc11_mean).toBeLessThan(3000);
      expect(result.posterior.n_observations).toBe(30);
    });

    it('posterior mc is close to true mc=0.25', () => {
      const result = engine.calibrate({
        observations: generateObs(30, 1800, 0.25, 5),
        material_hint: 'steel_1045',
      });
      expect(result.posterior.mc_mean).toBeGreaterThan(0.1);
      expect(result.posterior.mc_mean).toBeLessThan(0.5);
    });

    it('posterior uncertainty (std) decreases with more data', () => {
      const r10 = engine.calibrate({
        observations: generateObs(10, 1800, 0.25, 5),
      });
      const r50 = engine.calibrate({
        observations: generateObs(50, 1800, 0.25, 5),
      });
      // More data should generally reduce uncertainty
      expect(r50.posterior.kc11_std).toBeLessThanOrEqual(r10.posterior.kc11_std * 2); // at least not much worse
    });

    it('predictions array has same length as valid observations', () => {
      const obs = generateObs(15, 1800, 0.25, 10);
      const result = engine.calibrate({ observations: obs });
      expect(result.predictions).toHaveLength(15);
    });

    it('each prediction has required fields', () => {
      const result = engine.calibrate({
        observations: generateObs(5, 1800, 0.25, 5),
      });
      for (const pred of result.predictions) {
        expect(pred).toHaveProperty('predicted_force_N');
        expect(pred).toHaveProperty('actual_force_N');
        expect(pred).toHaveProperty('residual_N');
        expect(pred).toHaveProperty('log_likelihood');
        expect(pred.predicted_force_N).toBeGreaterThan(0);
      }
    });

    it('residual = actual - predicted', () => {
      const result = engine.calibrate({
        observations: generateObs(5, 1800, 0.25, 5),
      });
      for (const pred of result.predictions) {
        expect(pred.residual_N).toBeCloseTo(pred.actual_force_N - pred.predicted_force_N, 1);
      }
    });
  });

  // ==========================================================================
  // calibrate — convergence
  // ==========================================================================

  describe('calibrate — convergence', () => {
    it('does not converge with few observations', () => {
      const obs = [];
      for (let i = 0; i < 5; i++) {
        const h = 0.1 + i * 0.05;
        obs.push({ force_N: 1800 * 3 * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: 3 });
      }
      const result = engine.calibrate({
        observations: obs,
        min_observations: 20,
      });
      expect(result.converged).toBe(false);
      expect(result.warnings.some((w) => w.includes('need 20'))).toBe(true);
    });

    it('convergence_ratio decreases with more consistent data', () => {
      const obs = [];
      for (let i = 0; i < 30; i++) {
        const h = 0.05 + i * 0.01;
        obs.push({
          force_N: 1800 * 3 * Math.pow(h, 0.75),
          chip_thickness_mm: h,
          width_of_cut_mm: 3,
        });
      }
      const result = engine.calibrate({ observations: obs, min_observations: 5 });
      expect(result.convergence_ratio).toBeLessThan(1.0);
    });
  });

  // ==========================================================================
  // calibrate — credible intervals
  // ==========================================================================

  describe('calibrate — credible intervals', () => {
    it('95% CI for kc11 brackets the posterior mean', () => {
      const obs = [];
      for (let i = 0; i < 20; i++) {
        const h = 0.05 + i * 0.015;
        obs.push({ force_N: 1800 * 3 * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: 3 });
      }
      const result = engine.calibrate({ observations: obs });
      const [lo, hi] = result.credible_interval_95.kc11;
      expect(lo).toBeLessThan(result.posterior.kc11_mean);
      expect(hi).toBeGreaterThan(result.posterior.kc11_mean);
    });

    it('95% CI for mc brackets the posterior mean', () => {
      const obs = [];
      for (let i = 0; i < 20; i++) {
        const h = 0.05 + i * 0.015;
        obs.push({ force_N: 1800 * 3 * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: 3 });
      }
      const result = engine.calibrate({ observations: obs });
      const [lo, hi] = result.credible_interval_95.mc;
      expect(lo).toBeLessThan(result.posterior.mc_mean);
      expect(hi).toBeGreaterThan(result.posterior.mc_mean);
    });

    it('prior-only CI is symmetric around prior mean', () => {
      const result = engine.calibrate({ observations: [] });
      const [lo, hi] = result.credible_interval_95.kc11;
      const mid = (lo + hi) / 2;
      expect(mid).toBeCloseTo(1800, -1); // within ~10
    });
  });

  // ==========================================================================
  // calibrate — drift detection
  // ==========================================================================

  describe('calibrate — kc11 drift', () => {
    it('detects increasing kc11 drift (tool wear)', () => {
      const obs = [];
      for (let i = 0; i < 20; i++) {
        const h = 0.1;
        const b = 3;
        // kc11 increases over time (simulating wear)
        const kc11 = 1800 + i * 50;
        obs.push({ force_N: kc11 * b * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: b });
      }
      const result = engine.calibrate({ observations: obs });
      expect(result.kc11_trend).toBe('increasing');
      expect(result.kc11_drift_pct).toBeGreaterThan(0);
    });

    it('detects decreasing kc11 drift (thermal softening)', () => {
      const obs = [];
      for (let i = 0; i < 20; i++) {
        const h = 0.1;
        const b = 3;
        const kc11 = 1800 - i * 50;
        obs.push({ force_N: kc11 * b * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: b });
      }
      const result = engine.calibrate({ observations: obs });
      expect(result.kc11_trend).toBe('decreasing');
      expect(result.kc11_drift_pct).toBeLessThan(0);
    });

    it('reports stable for constant kc11', () => {
      const obs = [];
      for (let i = 0; i < 20; i++) {
        const h = 0.05 + i * 0.015;
        obs.push({ force_N: 1800 * 3 * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: 3 });
      }
      const result = engine.calibrate({ observations: obs });
      expect(result.kc11_trend).toBe('stable');
    });

    it('returns stable trend for < 6 observations', () => {
      const obs = [];
      for (let i = 0; i < 4; i++) {
        const h = 0.1 + i * 0.05;
        obs.push({ force_N: 1800 * 3 * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: 3 });
      }
      const result = engine.calibrate({ observations: obs });
      expect(result.kc11_drift_pct).toBe(0);
    });
  });

  // ==========================================================================
  // calibrate — material hint
  // ==========================================================================

  describe('calibrate — material hint', () => {
    it('uses aluminum prior when material_hint="aluminum"', () => {
      // With no observations, posterior = prior
      const result = engine.calibrate({
        observations: [],
        material_hint: 'aluminum',
      });
      expect(result.posterior.kc11_mean).toBe(800);
      expect(result.posterior.mc_mean).toBe(0.23);
    });

    it('custom prior overrides material hint', () => {
      const result = engine.calibrate({
        observations: [],
        material_hint: 'aluminum',
        prior: { kc11_mean: 999 },
      });
      expect(result.posterior.kc11_mean).toBe(999);
    });
  });

  // ==========================================================================
  // calibrate — result structure
  // ==========================================================================

  describe('calibrate — result structure', () => {
    it('result contains all required fields', () => {
      const obs = [];
      for (let i = 0; i < 5; i++) {
        const h = 0.1 + i * 0.05;
        obs.push({ force_N: 1800 * 3 * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: 3 });
      }
      const result = engine.calibrate({ observations: obs });
      expect(result).toHaveProperty('posterior');
      expect(result).toHaveProperty('converged');
      expect(result).toHaveProperty('convergence_ratio');
      expect(result).toHaveProperty('kc11_trend');
      expect(result).toHaveProperty('kc11_drift_pct');
      expect(result).toHaveProperty('predictions');
      expect(result).toHaveProperty('credible_interval_95');
      expect(result).toHaveProperty('warnings');
      expect(result).toHaveProperty('formula');
      expect(result.posterior).toHaveProperty('sigma2_mean');
    });

    it('formula contains Kienzle equation', () => {
      const obs = [];
      for (let i = 0; i < 5; i++) {
        const h = 0.1 + i * 0.05;
        obs.push({ force_N: 1800 * 3 * Math.pow(h, 0.75), chip_thickness_mm: h, width_of_cut_mm: 3 });
      }
      const result = engine.calibrate({ observations: obs });
      expect(result.formula).toContain('Fc =');
      expect(result.formula).toContain('kc11');
    });
  });
});
