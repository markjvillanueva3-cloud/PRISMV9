// @ts-nocheck
import { describe, it, expect } from 'vitest';
import {
  KDEGradientBoostEngine,
  kdeGradientBoostEngine,
} from '../engines/KDEGradientBoostEngine';

// ─── Helpers ────────────────────────────────────────────────────────────────

/** Seeded PRNG for reproducible test data */
class TestRNG {
  private s: number;
  constructor(seed = 7) { this.s = seed; }
  next() {
    this.s = (this.s * 16807) % 2147483647;
    return (this.s - 1) / 2147483646;
  }
  gaussian() {
    const u1 = this.next();
    const u2 = this.next();
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

function normalData(n: number, mean: number, std: number, seed = 7) {
  const rng = new TestRNG(seed);
  return Array.from({ length: n }, () => mean + std * rng.gaussian());
}

function bimodalData(n: number, seed = 7) {
  const rng = new TestRNG(seed);
  return Array.from({ length: n }, () => {
    const cluster = rng.next() < 0.5 ? -3 : 3;
    return cluster + 0.5 * rng.gaussian();
  });
}

describe('KDEGradientBoostEngine', () => {
  const engine = kdeGradientBoostEngine;

  // ─── KDE Tests ──────────────────────────────────────────────────────

  describe('KDE', () => {
    it('1. standard normal: density peak near 0', () => {
      const data = normalData(500, 0, 1);
      const result = engine.kernelDensityEstimate({ data });
      // Mode should be near 0
      expect(Math.abs(result.mode)).toBeLessThan(0.5);
      // Peak density near 1/sqrt(2π) ≈ 0.399
      const maxD = Math.max(...result.density);
      expect(maxD).toBeGreaterThan(0.2);
      expect(maxD).toBeLessThan(0.6);
    });

    it('2. Silverman bandwidth produces positive value', () => {
      const data = normalData(200, 5, 2, 11);
      const result = engine.kernelDensityEstimate({ data });
      expect(result.bandwidth).toBeGreaterThan(0);
      // For n=200, std≈2: h ≈ 0.9*min(2, IQR/1.34)*200^(-0.2) ≈ 0.5-0.7
      expect(result.bandwidth).toBeLessThan(3);
    });

    it('3. bimodal data: two peaks detected', () => {
      const data = bimodalData(500);
      const result = engine.kernelDensityEstimate({
        data,
        bandwidth: 0.5,
        n_eval_points: 300,
      });
      // Find local maxima
      const peaks: number[] = [];
      for (let i = 1; i < result.density.length - 1; i++) {
        if (
          result.density[i] > result.density[i - 1] &&
          result.density[i] > result.density[i + 1] &&
          result.density[i] > 0.05
        ) {
          peaks.push(result.x_values[i]);
        }
      }
      expect(peaks.length).toBeGreaterThanOrEqual(2);
    });

    it('4. CDF monotonically increasing from 0 to ~1', () => {
      const data = normalData(300, 0, 1, 13);
      const result = engine.kernelDensityEstimate({ data });
      expect(result.cdf_values[0]).toBeCloseTo(0, 1);
      const lastCdf = result.cdf_values[result.cdf_values.length - 1];
      expect(lastCdf).toBeGreaterThan(0.95);
      expect(lastCdf).toBeLessThanOrEqual(1.01);
      // Monotonicity
      for (let i = 1; i < result.cdf_values.length; i++) {
        expect(result.cdf_values[i]).toBeGreaterThanOrEqual(
          result.cdf_values[i - 1] - 1e-10
        );
      }
    });

    it('5. Epanechnikov kernel: density non-negative', () => {
      const data = normalData(200, 0, 1, 17);
      const result = engine.kernelDensityEstimate({
        data,
        kernel: 'epanechnikov',
      });
      for (const d of result.density) {
        expect(d).toBeGreaterThanOrEqual(0);
      }
    });

    it('6. anomaly detection: outlier identified', () => {
      const training = normalData(500, 0, 1, 19);
      const result = engine.densityBasedAnomaly({
        training_data: training,
        test_points: [0.0, 0.5, 10.0, -8.0, 0.1],
        threshold_percentile: 5,
      });
      // 10.0 and -8.0 should be anomalies
      expect(result.is_anomaly[2]).toBe(true); // 10.0
      expect(result.is_anomaly[3]).toBe(true); // -8.0
      // 0.0 should not be anomaly
      expect(result.is_anomaly[0]).toBe(false);
      expect(result.n_anomalies).toBeGreaterThanOrEqual(2);
    });

    it('7. 2D KDE: density grid has correct dimensions', () => {
      const rng = new TestRNG(23);
      const n = 100;
      const x = Array.from({ length: n }, () => rng.gaussian());
      const y = Array.from({ length: n }, () => rng.gaussian());
      const result = engine.kde2d({ x, y, n_grid: 30 });
      expect(result.x_grid.length).toBe(30);
      expect(result.y_grid.length).toBe(30);
      expect(result.density_grid.length).toBe(30);
      expect(result.density_grid[0].length).toBe(30);
      expect(result.contour_levels.length).toBe(5);
    });
  });

  // ─── Gradient Boosting Tests ────────────────────────────────────────

  describe('Gradient Boosting', () => {
    // Generate regression data: y = x1^2 + 0.5*x2 + noise
    function regressData(n: number, seed = 31) {
      const rng = new TestRNG(seed);
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < n; i++) {
        const x1 = rng.next() * 4 - 2;
        const x2 = rng.next() * 4 - 2;
        X.push([x1, x2]);
        y.push(x1 * x1 + 0.5 * x2 + 0.1 * rng.gaussian());
      }
      return { X, y };
    }

    // Generate classification data
    function classifyData(n: number, seed = 37) {
      const rng = new TestRNG(seed);
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < n; i++) {
        const x1 = rng.next() * 4 - 2;
        const x2 = rng.next() * 4 - 2;
        X.push([x1, x2]);
        y.push(x1 + x2 > 0 ? 1 : 0);
      }
      return { X, y };
    }

    it('8. regression: train MSE decreases with iterations', () => {
      const { X, y } = regressData(100);
      const result = engine.gradientBoostRegress({
        X_train: X,
        y_train: y,
        n_estimators: 50,
        learning_rate: 0.1,
        max_depth: 3,
        seed: 42,
      });
      const firstLoss = result.learning_curve[0].train_loss;
      const lastLoss = result.learning_curve[
        result.learning_curve.length - 1
      ].train_loss;
      expect(lastLoss).toBeLessThan(firstLoss);
    });

    it('9. fits nonlinear (sin) better than linear', () => {
      const rng = new TestRNG(41);
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < 200; i++) {
        const x = rng.next() * 6 - 3;
        X.push([x]);
        y.push(Math.sin(x) + 0.1 * rng.gaussian());
      }
      const result = engine.gradientBoostRegress({
        X_train: X,
        y_train: y,
        n_estimators: 80,
        max_depth: 4,
        seed: 42,
      });
      // MSE should be well below 1 (linear would be ~0.5+)
      expect(result.train_mse).toBeLessThan(0.3);
    });

    it('10. classification: accuracy > 85% on separable data', () => {
      const { X, y } = classifyData(200);
      const result = engine.gradientBoostClassify({
        X_train: X,
        y_train: y,
        n_estimators: 60,
        max_depth: 3,
        seed: 42,
      });
      expect(result.train_accuracy).toBeGreaterThan(0.85);
    });

    it('11. feature importance: relevant features ranked higher', () => {
      // y = 3*x1 + noise, x2 is irrelevant
      const rng = new TestRNG(43);
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < 200; i++) {
        const x1 = rng.next() * 4 - 2;
        const x2 = rng.next() * 4 - 2;
        X.push([x1, x2]);
        y.push(3 * x1 + 0.1 * rng.gaussian());
      }
      const result = engine.gradientBoostRegress({
        X_train: X,
        y_train: y,
        n_estimators: 40,
        max_depth: 2,
        seed: 42,
      });
      // Feature 0 (x1) should have higher importance
      expect(result.feature_importance[0]).toBeGreaterThan(
        result.feature_importance[1]
      );
    });

    it('12. learning rate: lower rate needs more estimators', () => {
      const { X, y } = regressData(100, 47);
      const fast = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 20, learning_rate: 0.3, seed: 42,
      });
      const slow = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 20, learning_rate: 0.01, seed: 42,
      });
      // With same n_estimators, higher LR should fit better
      expect(fast.train_mse).toBeLessThan(slow.train_mse);
    });

    it('13. stochastic (subsample < 1): still converges', () => {
      const { X, y } = regressData(150, 51);
      const result = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 60, subsample: 0.7, seed: 42,
      });
      const firstLoss = result.learning_curve[0].train_loss;
      const lastLoss = result.learning_curve[
        result.learning_curve.length - 1
      ].train_loss;
      expect(lastLoss).toBeLessThan(firstLoss);
    });

    it('14. depth 1 (stumps) less accurate than depth 3', () => {
      const { X, y } = regressData(150, 53);
      const stumps = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 50, max_depth: 1, seed: 42,
      });
      const deep = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 50, max_depth: 3, seed: 42,
      });
      expect(deep.train_mse).toBeLessThan(stumps.train_mse);
    });

    it('15. predictions within reasonable range', () => {
      const { X, y } = regressData(100, 57);
      const result = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 40, seed: 42,
      });
      const yMin = Math.min(...y);
      const yMax = Math.max(...y);
      const range = yMax - yMin;
      for (const p of result.predictions) {
        expect(p).toBeGreaterThan(yMin - range);
        expect(p).toBeLessThan(yMax + range);
      }
    });

    it('16. manufacturing defect: returns valid probabilities', () => {
      const features = Array.from({ length: 50 }, (_, i) => ({
        speed_mpm: 100 + i * 2,
        feed_mm_rev: 0.1 + i * 0.005,
        depth_mm: 1.0 + i * 0.05,
        tool_wear_vb: 0.05 + i * 0.005,
        vibration_rms: 0.5 + i * 0.02,
      }));
      const labels = features.map((_, i) => (i > 35 ? 1 : 0));
      const result = engine.manufacturingDefectPrediction({
        features,
        defect_labels: labels,
        predict_features: features.slice(0, 5),
      });
      expect(result.probabilities.length).toBe(5);
      for (const p of result.probabilities) {
        expect(p).toBeGreaterThanOrEqual(0);
        expect(p).toBeLessThanOrEqual(1);
      }
      expect(result.feature_ranking.length).toBe(7);
      expect(result.recommended_monitoring_features.length)
        .toBeGreaterThan(0);
    });
  });

  // ─── Integration Tests ──────────────────────────────────────────────

  describe('Integration', () => {
    it('17. KDE + GB: verify GB residuals distribution', () => {
      const rng = new TestRNG(61);
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < 200; i++) {
        const x = rng.next() * 4 - 2;
        X.push([x]);
        y.push(x * x + 0.3 * rng.gaussian());
      }
      const gb = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 60, max_depth: 3, seed: 42,
      });
      // Compute residuals
      const residuals = y.map((yi, i) => yi - gb.predictions[i]);
      const kdeRes = engine.kernelDensityEstimate({
        data: residuals,
      });
      // Residuals should have mode near 0
      expect(Math.abs(kdeRes.mode)).toBeLessThan(1.0);
    });

    it('18. learning curve shows convergence', () => {
      const rng = new TestRNG(63);
      const X: number[][] = [];
      const y: number[] = [];
      for (let i = 0; i < 100; i++) {
        const x = rng.next() * 4 - 2;
        X.push([x]);
        y.push(2 * x + 1);
      }
      const result = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 50, seed: 42,
      });
      // Last 10 losses should be similar (converged)
      const last10 = result.learning_curve.slice(-10);
      const maxLoss = Math.max(...last10.map(e => e.train_loss));
      const minLoss = Math.min(...last10.map(e => e.train_loss));
      expect(maxLoss - minLoss).toBeLessThan(0.5);
    });

    it('19. single feature regression works', () => {
      const X = [[1], [2], [3], [4], [5]];
      const y = [2, 4, 6, 8, 10];
      const result = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 30, seed: 42,
      });
      expect(result.feature_importance.length).toBe(1);
      expect(result.train_mse).toBeLessThan(5);
    });

    it('20. no test set: returns only training metrics', () => {
      const X = [[1, 2], [3, 4], [5, 6]];
      const y = [1, 2, 3];
      const result = engine.gradientBoostRegress({
        X_train: X, y_train: y,
        n_estimators: 10, seed: 42,
      });
      expect(result.test_mse).toBeUndefined();
      expect(result.predictions.length).toBe(3);
    });
  });
});
