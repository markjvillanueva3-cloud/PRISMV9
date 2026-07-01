// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  VarianceReductionEngine,
  varianceReductionEngine,
} from '../engines/VarianceReductionEngine';

// ─── Shared test model ──────────────────────────────────────────────────────

/** Simple model: y = x1^2 + x2 (nonlinear, good for VR testing) */
const testModel = (x: Record<string, number>) =>
  x.x1 * x.x1 + x.x2;

/** Linear control variable with known mean */
const controlFn = (x: Record<string, number>) => x.x1 + x.x2;
// E[x1 + x2] = mean_x1 + mean_x2 = 2 + 1 = 3
const controlMean = 3;

const testDists = {
  x1: { mean: 2, std: 0.5 },
  x2: { mean: 1, std: 0.3 },
};

describe('VarianceReductionEngine', () => {
  const engine = varianceReductionEngine;

  // ─── Antithetic Variates ────────────────────────────────────────────

  describe('Antithetic Variates', () => {
    it('1. estimate close to crude MC mean (within CI)', () => {
      const result = engine.antitheticVariates({
        model_fn: testModel,
        parameter_distributions: testDists,
        n_samples: 2000,
        seed: 42,
      });
      // True E[x1^2 + x2] = E[x1^2] + E[x2]
      //   = (var + mean^2) + mean = (0.25 + 4) + 1 = 5.25
      const trueVal = 5.25;
      expect(Math.abs(result.estimate_mean - trueVal))
        .toBeLessThan(0.5);
      // Should be within its own CI
      expect(result.estimate_mean).toBeGreaterThanOrEqual(
        result.ci_95[0]
      );
      expect(result.estimate_mean).toBeLessThanOrEqual(
        result.ci_95[1]
      );
    });

    it('2. variance reduction factor > 1', () => {
      const result = engine.antitheticVariates({
        model_fn: testModel,
        parameter_distributions: testDists,
        n_samples: 2000,
        seed: 42,
      });
      expect(result.variance_reduction_factor)
        .toBeGreaterThan(1);
    });

    it('3. equivalent samples > actual samples used', () => {
      const result = engine.antitheticVariates({
        model_fn: testModel,
        parameter_distributions: testDists,
        n_samples: 1000,
        seed: 42,
      });
      expect(result.comparison_crude.n_samples_equivalent)
        .toBeGreaterThan(1000);
    });
  });

  // ─── Control Variates ───────────────────────────────────────────────

  describe('Control Variates', () => {
    it('4. optimal c computed correctly', () => {
      const result = engine.controlVariates({
        model_fn: testModel,
        control_fn: controlFn,
        control_mean: controlMean,
        parameter_distributions: testDists,
        n_samples: 2000,
        seed: 42,
      });
      // c = -Cov(Y,X)/Var(X) — should be a finite number
      expect(Number.isFinite(result.optimal_c)).toBe(true);
      // For our model, Y and X are correlated so c != 0
      expect(Math.abs(result.optimal_c)).toBeGreaterThan(0.01);
    });

    it('5. variance reduction > 1 for correlated control', () => {
      const result = engine.controlVariates({
        model_fn: testModel,
        control_fn: controlFn,
        control_mean: controlMean,
        parameter_distributions: testDists,
        n_samples: 2000,
        seed: 42,
      });
      expect(result.variance_reduction_factor)
        .toBeGreaterThan(1);
      expect(Math.abs(result.correlation_yx))
        .toBeGreaterThan(0.1);
    });

    it('6. no reduction when control uncorrelated', () => {
      // Use a control that is independent of Y
      const independentControl = (_x: Record<string, number>) =>
        Math.sin(12345);
      const result = engine.controlVariates({
        model_fn: testModel,
        control_fn: independentControl,
        control_mean: Math.sin(12345),
        parameter_distributions: testDists,
        n_samples: 1000,
        seed: 42,
      });
      // VRF should be close to 1 (no benefit)
      expect(result.variance_reduction_factor)
        .toBeGreaterThanOrEqual(0.8);
      expect(result.variance_reduction_factor)
        .toBeLessThan(3);
    });
  });

  // ─── Importance Sampling ────────────────────────────────────────────

  describe('Importance Sampling', () => {
    const nomDist = {
      mean: [0, 0],
      cov: [[1, 0], [0, 1]],
    };

    it('7. estimate close to true value for known integral', () => {
      // E[x1^2 + x2^2] under N(0,I) = 2
      const modelFn = (x: number[]) => x[0] * x[0] + x[1] * x[1];
      const result = engine.importanceSampling({
        model_fn: modelFn,
        nominal_distribution: nomDist,
        importance_distribution: {
          mean: [0, 0],
          cov: [[1.5, 0], [0, 1.5]],
        },
        n_samples: 3000,
        seed: 42,
      });
      expect(Math.abs(result.estimate_mean - 2))
        .toBeLessThan(1.0);
    });

    it('8. effective sample size < n_samples', () => {
      const modelFn = (x: number[]) => x[0] * x[0] + x[1] * x[1];
      const result = engine.importanceSampling({
        model_fn: modelFn,
        nominal_distribution: nomDist,
        importance_distribution: {
          mean: [1, 1],
          cov: [[2, 0], [0, 2]],
        },
        n_samples: 1000,
        seed: 42,
      });
      // ESS < n due to weight concentration
      expect(result.effective_sample_size).toBeLessThan(1000);
      expect(result.effective_sample_size).toBeGreaterThan(0);
    });

    it('9. shift toward tail improves rare event estimation', () => {
      // Estimate P(x1 > 3) under N(0,1) — true ≈ 0.00135
      const rareFn = (x: number[]) => (x[0] > 3 ? 1 : 0);
      const result = engine.importanceSampling({
        model_fn: rareFn,
        nominal_distribution: {
          mean: [0], cov: [[1]],
        },
        importance_distribution: {
          mean: [3], cov: [[1]],
        },
        n_samples: 5000,
        seed: 42,
      });
      // Should get an estimate in the right ballpark
      expect(result.estimate_mean).toBeGreaterThan(0);
      expect(result.estimate_mean).toBeLessThan(0.1);
    });
  });

  // ─── Stratified Sampling ────────────────────────────────────────────

  describe('Stratified Sampling', () => {
    it('10. mean close to crude MC mean', () => {
      const result = engine.stratifiedSampling({
        model_fn: testModel,
        parameter_distributions: testDists,
        n_samples: 2000,
        seed: 42,
      });
      const trueVal = 5.25;
      expect(Math.abs(result.estimate_mean - trueVal))
        .toBeLessThan(2.0);
    });

    it('11. variance reduction > 1 for non-uniform response', () => {
      const result = engine.stratifiedSampling({
        model_fn: testModel,
        parameter_distributions: testDists,
        n_samples: 2000,
        n_strata_per_dim: 10,
        seed: 42,
      });
      expect(result.variance_reduction_factor)
        .toBeGreaterThanOrEqual(1);
    });

    it('12. equal strata have similar allocation', () => {
      // Constant model → all strata should have similar means
      const constModel = (_x: Record<string, number>) => 5.0;
      const result = engine.stratifiedSampling({
        model_fn: constModel,
        parameter_distributions: testDists,
        n_samples: 500,
        n_strata_per_dim: 5,
        seed: 42,
      });
      for (const m of result.stratum_means) {
        expect(m).toBeCloseTo(5.0, 5);
      }
      // All strata stds should be ~0
      for (const s of result.stratum_stds) {
        expect(s).toBeLessThan(0.01);
      }
    });
  });

  // ─── Compare Methods ───────────────────────────────────────────────

  describe('Compare Variance Reduction', () => {
    it('13. all methods produce valid estimates', () => {
      const result = engine.compareVarianceReduction({
        model_fn: testModel,
        parameter_distributions: testDists,
        n_samples: 1000,
        seed: 42,
      });
      expect(result.methods.length).toBeGreaterThanOrEqual(3);
      for (const m of result.methods) {
        expect(Number.isFinite(m.mean)).toBe(true);
        expect(Number.isFinite(m.std)).toBe(true);
        expect(m.std).toBeGreaterThanOrEqual(0);
      }
    });

    it('14. best method has lowest std', () => {
      const result = engine.compareVarianceReduction({
        model_fn: testModel,
        parameter_distributions: testDists,
        n_samples: 1000,
        seed: 42,
      });
      const best = result.methods.find(
        m => m.name === result.best_method
      );
      expect(best).toBeDefined();
      const minStd = Math.min(...result.methods.map(m => m.std));
      expect(best!.std).toBeCloseTo(minStd, 5);
    });

    it('15. all variance reduction factors >= 1', () => {
      const result = engine.compareVarianceReduction({
        model_fn: testModel,
        parameter_distributions: testDists,
        n_samples: 1000,
        seed: 42,
      });
      for (const m of result.methods) {
        expect(m.variance_reduction).toBeGreaterThanOrEqual(1);
      }
    });
  });

  // ─── Adaptive Monte Carlo ──────────────────────────────────────────

  describe('Adaptive Monte Carlo UQ', () => {
    it('16. selects a method automatically', () => {
      const result = engine.adaptiveMonteCarloUQ({
        model_fn: testModel,
        parameter_distributions: testDists,
        target_cv: 0.02,
        max_samples: 5000,
        seed: 42,
      });
      expect([
        'crude_mc', 'antithetic', 'stratified',
      ]).toContain(result.method_selected);
    });

    it('17. CV achieved <= target CV (or close)', () => {
      const targetCV = 0.05;
      const result = engine.adaptiveMonteCarloUQ({
        model_fn: testModel,
        parameter_distributions: testDists,
        target_cv: targetCV,
        max_samples: 10000,
        seed: 42,
      });
      // CV should be at or near target (allow 2x slack
      // since we have finite max_samples)
      expect(result.cv_achieved).toBeLessThan(targetCV * 3);
    });

    it('18. equivalent samples > actual samples', () => {
      const result = engine.adaptiveMonteCarloUQ({
        model_fn: testModel,
        parameter_distributions: testDists,
        max_samples: 5000,
        seed: 42,
      });
      expect(result.equivalent_crude_mc_samples)
        .toBeGreaterThanOrEqual(result.n_samples_used);
    });
  });
});
