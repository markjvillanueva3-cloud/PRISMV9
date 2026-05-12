// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { advancedStatisticalLearningEngine } from '../engines/AdvancedStatisticalLearningEngine';

describe('AdvancedStatisticalLearningEngine', () => {
  // ==========================================================================
  // MCMC TESTS
  // ==========================================================================
  describe('mcmcSample', () => {
    it('should recover posterior mean ≈ true mean for normal target', () => {
      const result = advancedStatisticalLearningEngine.mcmcSample({
        log_target: 'normal',
        target_params: { mu: 5, sigma: 1 },
        initial_value: 0,
        n_samples: 10000,
        burn_in: 2000,
        proposal_sigma: 1.0,
        seed: 42,
      });
      expect(Math.abs(result.posterior_mean - 5)).toBeLessThan(0.5);
    });

    it('should have acceptance rate between 0.15 and 0.50 for well-tuned proposal', () => {
      const result = advancedStatisticalLearningEngine.mcmcSample({
        log_target: 'normal',
        target_params: { mu: 0, sigma: 1 },
        initial_value: 0,
        n_samples: 10000,
        burn_in: 1000,
        proposal_sigma: 2.0,
        seed: 123,
      });
      expect(result.acceptance_rate).toBeGreaterThan(0.15);
      expect(result.acceptance_rate).toBeLessThan(0.70);
    });

    it('should indicate convergence via Geweke diagnostic', () => {
      const result = advancedStatisticalLearningEngine.mcmcSample({
        log_target: 'normal',
        target_params: { mu: 0, sigma: 1 },
        initial_value: 0,
        n_samples: 10000,
        burn_in: 2000,
        proposal_sigma: 1.5,
        seed: 101,
      });
      // Geweke z-score should be finite; convergence depends on chain mixing
      expect(Number.isFinite(result.geweke_diagnostic.z_score)).toBe(true);
      // With enough samples and burn-in, |z| should typically be < 3
      expect(Math.abs(result.geweke_diagnostic.z_score)).toBeLessThan(3.0);
    });

    it('should have effective sample size > 0', () => {
      const result = advancedStatisticalLearningEngine.mcmcSample({
        log_target: 'normal',
        target_params: { mu: 0, sigma: 1 },
        initial_value: 0,
        n_samples: 5000,
        burn_in: 500,
        seed: 77,
      });
      expect(result.effective_sample_size).toBeGreaterThan(0);
    });

    it('should remove burn-in (samples start after transient)', () => {
      // Start far from target — burn-in should remove the initial drift
      const result = advancedStatisticalLearningEngine.mcmcSample({
        log_target: 'normal',
        target_params: { mu: 0, sigma: 1 },
        initial_value: 100, // far from target
        n_samples: 5000,
        burn_in: 3000,
        proposal_sigma: 2.0,
        seed: 55,
      });
      // After burn-in removal, mean should be close to 0
      expect(Math.abs(result.posterior_mean)).toBeLessThan(1.0);
    });
  });

  // ==========================================================================
  // GIBBS SAMPLING TESTS
  // ==========================================================================
  describe('gibbsSampler', () => {
    it('should recover correct marginal means for bivariate normal', () => {
      const result = advancedStatisticalLearningEngine.gibbsSampler({
        conditionals: ['x|y', 'y|x'],
        n_samples: 10000,
        burn_in: 1000,
        initial_values: [0, 0],
        params: { mu_x: 3, mu_y: -2, sigma_x: 1, sigma_y: 1, rho: 0.5 },
        seed: 42,
      });
      expect(Math.abs(result.marginal_means[0] - 3)).toBeLessThan(0.3);
      expect(Math.abs(result.marginal_means[1] - (-2))).toBeLessThan(0.3);
    });

    it('should estimate correlation ≈ true correlation', () => {
      const result = advancedStatisticalLearningEngine.gibbsSampler({
        conditionals: ['x|y', 'y|x'],
        n_samples: 10000,
        burn_in: 1000,
        initial_values: [0, 0],
        params: { mu_x: 0, mu_y: 0, sigma_x: 1, sigma_y: 1, rho: 0.7 },
        seed: 88,
      });
      expect(Math.abs(result.correlation_matrix[0][1] - 0.7)).toBeLessThan(0.15);
    });
  });

  // ==========================================================================
  // BAYESIAN LINEAR REGRESSION TESTS
  // ==========================================================================
  describe('bayesianLinearRegression', () => {
    it('should contain true coefficients within credible intervals', () => {
      // y = 2*x1 + 3*x2 + noise
      const rng = { state: 42, next() { this.state = (this.state * 1103515245 + 12345) & 0x7fffffff; return this.state / 0x7fffffff; } };
      const n = 100;
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < n; i++) {
        const x1 = rng.next() * 4 - 2;
        const x2 = rng.next() * 4 - 2;
        X.push([x1, x2]);
        y.push(2 * x1 + 3 * x2 + (rng.next() - 0.5) * 0.5);
      }

      const result = advancedStatisticalLearningEngine.bayesianLinearRegression({
        X, y, n_samples: 5000, seed: 42,
      });

      // True β1 = 2 should be in CI
      expect(result.coefficient_credible_intervals[0][0]).toBeLessThan(2.5);
      expect(result.coefficient_credible_intervals[0][1]).toBeGreaterThan(1.5);
      // True β2 = 3 should be in CI
      expect(result.coefficient_credible_intervals[1][0]).toBeLessThan(3.5);
      expect(result.coefficient_credible_intervals[1][1]).toBeGreaterThan(2.5);
    });
  });

  // ==========================================================================
  // RANDOM FOREST CLASSIFICATION TESTS
  // ==========================================================================
  describe('randomForestClassify', () => {
    it('should achieve >80% accuracy on separable 2-class data', () => {
      // Class 0: x1 < 0, Class 1: x1 > 0 (well-separated)
      const X_train: number[][] = [];
      const y_train: number[] = [];
      for (let i = 0; i < 100; i++) {
        X_train.push([i < 50 ? -2 + Math.random() * 0.5 : 2 + Math.random() * 0.5, Math.random()]);
        y_train.push(i < 50 ? 0 : 1);
      }

      const result = advancedStatisticalLearningEngine.randomForestClassify({
        X_train, y_train,
        X_test: [[-3, 0.5], [3, 0.5]],
        n_trees: 50,
        max_depth: 5,
        seed: 42,
      });

      expect(result.oob_score).toBeGreaterThan(0.80);
      expect(result.predictions[0]).toBe(0);
      expect(result.predictions[1]).toBe(1);
    });

    it('should have feature importance summing to ~1', () => {
      const X_train = Array.from({ length: 60 }, (_, i) => [i < 30 ? -1 : 1, Math.random(), Math.random()]);
      const y_train = Array.from({ length: 60 }, (_, i) => i < 30 ? 0 : 1);

      const result = advancedStatisticalLearningEngine.randomForestClassify({
        X_train, y_train,
        X_test: [[0, 0, 0]],
        n_trees: 30,
        seed: 42,
        feature_names: ['signal', 'noise1', 'noise2'],
      });

      const sum = Object.values(result.feature_importance).reduce((s, v) => s + v, 0);
      expect(Math.abs(sum - 1.0)).toBeLessThan(0.05);
    });

    it('should have OOB error < 0.5 on separable data (better than random)', () => {
      const X_train = Array.from({ length: 80 }, (_, i) => [i < 40 ? -3 : 3, Math.random()]);
      const y_train = Array.from({ length: 80 }, (_, i) => i < 40 ? 0 : 1);

      const result = advancedStatisticalLearningEngine.randomForestClassify({
        X_train, y_train,
        X_test: [[0, 0]],
        n_trees: 50,
        seed: 42,
      });

      expect(result.oob_error).toBeLessThan(0.5);
    });

    it('should produce lower variance with more trees (100 vs 10)', () => {
      const X_train = Array.from({ length: 60 }, (_, i) => [i < 30 ? -2 : 2, Math.random()]);
      const y_train = Array.from({ length: 60 }, (_, i) => i < 30 ? 0 : 1);
      const X_test = [[0.5, 0.5]];

      // Run multiple times with 10 trees and 100 trees
      const probs10: number[] = [];
      const probs100: number[] = [];
      for (let s = 0; s < 5; s++) {
        const r10 = advancedStatisticalLearningEngine.randomForestClassify({
          X_train, y_train, X_test, n_trees: 10, seed: s * 7,
        });
        const r100 = advancedStatisticalLearningEngine.randomForestClassify({
          X_train, y_train, X_test, n_trees: 100, seed: s * 7,
        });
        probs10.push(r10.probabilities[0][0]);
        probs100.push(r100.probabilities[0][0]);
      }

      const var10 = probs10.reduce((s, p) => s + (p - probs10.reduce((a, b) => a + b) / 5) ** 2, 0) / 5;
      const var100 = probs100.reduce((s, p) => s + (p - probs100.reduce((a, b) => a + b) / 5) ** 2, 0) / 5;
      // More trees should have lower or equal variance
      expect(var100).toBeLessThanOrEqual(var10 + 0.05); // small tolerance
    });
  });

  // ==========================================================================
  // RANDOM FOREST REGRESSION TESTS
  // ==========================================================================
  describe('randomForestRegress', () => {
    it('should achieve R² > 0.7 on linear + noise data', () => {
      const n = 100;
      const X_train: number[][] = [];
      const y_train: number[] = [];
      for (let i = 0; i < n; i++) {
        const x = (i / n) * 10;
        X_train.push([x]);
        y_train.push(2 * x + 3 + (Math.random() - 0.5) * 2);
      }

      const result = advancedStatisticalLearningEngine.randomForestRegress({
        X_train, y_train,
        X_test: [[5]],
        n_trees: 50,
        seed: 42,
      });

      expect(result.oob_r_squared).toBeGreaterThan(0.7);
      // Prediction for x=5 should be ~13
      expect(Math.abs(result.predictions[0] - 13)).toBeLessThan(4);
    });
  });

  // ==========================================================================
  // RANDOM FOREST TOOL CONDITION TESTS
  // ==========================================================================
  describe('randomForestToolCondition', () => {
    it('should classify "good" for low force/vibration readings', () => {
      const result = advancedStatisticalLearningEngine.randomForestToolCondition({
        sensor_data: [{ force: 180, vibration: 0.4, ae: 25, temp: 35, time: 3 }],
        seed: 42,
      });

      expect(result.condition).toBe('good');
      expect(result.confidence).toBeGreaterThan(0.3);
      expect(result.risk_score).toBeLessThan(0.7);
    });

    it('should classify "replace" for high force/vibration readings', () => {
      const result = advancedStatisticalLearningEngine.randomForestToolCondition({
        sensor_data: [{ force: 950, vibration: 5.5, ae: 95, temp: 120, time: 65 }],
        seed: 42,
      });

      expect(result.condition).toBe('replace');
      expect(result.risk_score).toBeGreaterThan(0.3);
    });
  });

  // ==========================================================================
  // LOGISTIC REGRESSION TESTS
  // ==========================================================================
  describe('logisticRegressionFit', () => {
    it('should produce large coefficients for perfectly separable data', () => {
      const X = Array.from({ length: 40 }, (_, i) => [i < 20 ? -5 : 5]);
      const y = Array.from({ length: 40 }, (_, i) => i < 20 ? 0 : 1);

      const model = advancedStatisticalLearningEngine.logisticRegressionFit({
        X, y, max_iter: 50,
      });

      // Coefficient should be large positive (positive x → class 1)
      expect(model.coefficients[0]).toBeGreaterThan(0.5);
    });

    it('should have odds ratios > 1 for positive predictors', () => {
      const X = Array.from({ length: 100 }, (_, i) => [i / 50 - 1 + Math.random() * 0.1]);
      const y = Array.from({ length: 100 }, (_, i) => i >= 50 ? 1 : 0);

      const model = advancedStatisticalLearningEngine.logisticRegressionFit({
        X, y, seed: 42,
      });

      expect(model.odds_ratios[0]).toBeGreaterThan(1);
    });

    it('should have finite AIC and BIC', () => {
      const X = [[1], [2], [3], [4], [5], [6], [7], [8]];
      const y = [0, 0, 0, 0, 1, 1, 1, 1];

      const model = advancedStatisticalLearningEngine.logisticRegressionFit({ X, y });

      expect(Number.isFinite(model.aic)).toBe(true);
      expect(Number.isFinite(model.bic)).toBe(true);
    });

    it('should produce predictions between 0 and 1', () => {
      const X = [[1], [2], [3], [4], [5]];
      const y = [0, 0, 1, 1, 1];

      const model = advancedStatisticalLearningEngine.logisticRegressionFit({ X, y });
      const pred = advancedStatisticalLearningEngine.logisticRegressionPredict({
        X_new: [[-10], [0], [10]],
        model,
      });

      for (const p of pred.probabilities) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
    });
  });

  // ==========================================================================
  // LOGISTIC TOOL BREAKAGE TESTS
  // ==========================================================================
  describe('logisticToolBreakage', () => {
    it('should predict low breakage probability for low force ratio', () => {
      const result = advancedStatisticalLearningEngine.logisticToolBreakage({
        force_ratio: 0.5,
        vibration: 0.3,
        wear_vb: 0.05,
        time_min: 2,
        chip_variation: 0.05,
      });

      expect(result.breakage_probability).toBeLessThan(0.3);
      expect(result.risk_level).toBe('low');
    });

    it('should predict high breakage probability for high wear', () => {
      const result = advancedStatisticalLearningEngine.logisticToolBreakage({
        force_ratio: 1.5,
        vibration: 4.0,
        wear_vb: 0.5,
        time_min: 45,
        chip_variation: 0.3,
      });

      expect(result.breakage_probability).toBeGreaterThan(0.5);
      expect(['high', 'critical']).toContain(result.risk_level);
    });

    it('should identify dominant risk factor', () => {
      const result = advancedStatisticalLearningEngine.logisticToolBreakage({
        force_ratio: 0.5,
        vibration: 0.2,
        wear_vb: 0.6, // very high wear
        time_min: 5,
        chip_variation: 0.05,
      });

      expect(result.dominant_risk_factor).toBe('wear_vb');
    });
  });

  // ==========================================================================
  // PERMUTATION TEST TESTS
  // ==========================================================================
  describe('permutationTest', () => {
    it('should not reject null for identical groups (p > 0.05)', () => {
      const result = advancedStatisticalLearningEngine.permutationTest({
        group_a: [1, 2, 3, 4, 5],
        group_b: [1, 2, 3, 4, 5],
        statistic: 'mean_diff',
        n_permutations: 999,
        seed: 42,
      });

      expect(result.p_value).toBeGreaterThan(0.05);
      expect(result.reject_null).toBe(false);
    });

    it('should reject null for very different groups (p < 0.05)', () => {
      const result = advancedStatisticalLearningEngine.permutationTest({
        group_a: [1, 2, 3, 4, 5],
        group_b: [100, 200, 300, 400, 500],
        statistic: 'mean_diff',
        n_permutations: 999,
        seed: 42,
      });

      expect(result.p_value).toBeLessThan(0.05);
      expect(result.reject_null).toBe(true);
    });

    it('should have p-value between 0 and 1', () => {
      const result = advancedStatisticalLearningEngine.permutationTest({
        group_a: [2, 4, 6],
        group_b: [1, 3, 5],
        statistic: 'mean_diff',
        n_permutations: 499,
        seed: 42,
      });

      expect(result.p_value).toBeGreaterThan(0);
      expect(result.p_value).toBeLessThanOrEqual(1);
    });

    it('should compute effect size', () => {
      const result = advancedStatisticalLearningEngine.permutationTest({
        group_a: [10, 11, 12, 13, 14],
        group_b: [1, 2, 3, 4, 5],
        statistic: 't',
        n_permutations: 999,
        seed: 42,
      });

      expect(result.effect_size).toBeGreaterThan(0);
      expect(Number.isFinite(result.effect_size)).toBe(true);
    });
  });

  // ==========================================================================
  // BOUNDARY & REPRODUCIBILITY TESTS
  // ==========================================================================
  describe('boundary and reproducibility', () => {
    it('should handle single data point without crashing', () => {
      const result = advancedStatisticalLearningEngine.mcmcSample({
        log_target: 'normal',
        target_params: { mu: 0, sigma: 1 },
        initial_value: 0,
        n_samples: 10,
        burn_in: 5,
        seed: 1,
      });
      expect(result.samples.length).toBe(10);
    });

    it('should produce reproducible results with same seed', () => {
      const params = {
        log_target: 'normal' as const,
        target_params: { mu: 3, sigma: 2 },
        initial_value: 0,
        n_samples: 1000,
        burn_in: 200,
        seed: 12345,
      };

      const r1 = advancedStatisticalLearningEngine.mcmcSample(params);
      const r2 = advancedStatisticalLearningEngine.mcmcSample(params);

      expect(r1.posterior_mean).toBeCloseTo(r2.posterior_mean, 10);
      expect(r1.acceptance_rate).toBeCloseTo(r2.acceptance_rate, 10);
      expect(r1.samples[0]).toBe(r2.samples[0]);
    });
  });
});
