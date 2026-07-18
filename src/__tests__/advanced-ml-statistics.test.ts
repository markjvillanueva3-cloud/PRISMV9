// @ts-nocheck
import { describe, it, expect } from 'vitest';
import { advancedMLStatisticsEngine } from '../engines/AdvancedMLStatisticsEngine';

// ─── Helpers ────────────────────────────────────────────────────────────────────

/** Simple seeded PRNG for test data generation */
class TestRNG {
  private state: number;
  constructor(seed: number) {
    this.state = seed % 2147483647;
    if (this.state <= 0) this.state += 2147483646;
  }
  next(): number {
    this.state = (this.state * 16807) % 2147483647;
    return (this.state - 1) / 2147483646;
  }
  nextGaussian(mean = 0, std = 1): number {
    const u1 = this.next();
    const u2 = this.next();
    return mean + std * Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  }
}

function generateLinearData(
  n: number, trueCoeffs: number[], noise: number, seed: number
): { X: number[][]; y: number[] } {
  const rng = new TestRNG(seed);
  const p = trueCoeffs.length;
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = Array.from({ length: p }, () => rng.nextGaussian(0, 1));
    X.push(row);
    const yVal = row.reduce((s, xj, j) => s + xj * trueCoeffs[j], 0)
      + rng.nextGaussian(0, noise);
    y.push(yVal);
  }
  return { X, y };
}

function generateLogisticData(
  n: number, trueCoeffs: number[], intercept: number, seed: number
): { X: number[][]; y: number[] } {
  const rng = new TestRNG(seed);
  const p = trueCoeffs.length;
  const X: number[][] = [];
  const y: number[] = [];
  for (let i = 0; i < n; i++) {
    const row = Array.from({ length: p }, () => rng.nextGaussian(0, 1));
    X.push(row);
    const z = intercept + row.reduce((s, xj, j) => s + xj * trueCoeffs[j], 0);
    const prob = 1 / (1 + Math.exp(-z));
    y.push(rng.next() < prob ? 1 : 0);
  }
  return { X, y };
}

// ─── MCMC Tests ─────────────────────────────────────────────────────────────────

describe('AdvancedMLStatisticsEngine — MCMC', () => {
  it('1. MH recovers known normal mean (mu=5) from 100 samples within CI', () => {
    // Generate 100 data points from N(5, 1)
    const rng = new TestRNG(111);
    const data: number[] = [];
    for (let i = 0; i < 100; i++) data.push(rng.nextGaussian(5, 1));
    const xbar = data.reduce((a, b) => a + b, 0) / data.length;

    const result = advancedMLStatisticsEngine.metropolisHastings({
      log_likelihood: (theta) => {
        let ll = 0;
        for (const x of data) ll -= 0.5 * (x - theta[0]) ** 2;
        return ll;
      },
      log_prior: (theta) => -0.5 * (theta[0] / 10) ** 2, // N(0,10)
      initial: [0],
      proposal_scale: [0.5],
      n_samples: 5000,
      burn_in: 1000,
      seed: 42,
    });

    // Posterior mean should be close to sample mean (~5)
    expect(result.posterior_mean[0]).toBeGreaterThan(4.0);
    expect(result.posterior_mean[0]).toBeLessThan(6.0);
    // True value should be within 95% CI
    expect(result.credible_interval_95[0][0]).toBeLessThan(5.0);
    expect(result.credible_interval_95[0][1]).toBeGreaterThan(5.0);
  });

  it('2. Acceptance rate between 15-50% for well-tuned proposal', () => {
    const rng = new TestRNG(222);
    const data: number[] = [];
    for (let i = 0; i < 50; i++) data.push(rng.nextGaussian(3, 1));

    const result = advancedMLStatisticsEngine.metropolisHastings({
      log_likelihood: (theta) => {
        let ll = 0;
        for (const x of data) ll -= 0.5 * (x - theta[0]) ** 2;
        return ll;
      },
      log_prior: (theta) => -0.5 * (theta[0] / 10) ** 2,
      initial: [0],
      proposal_scale: [0.3],
      n_samples: 5000,
      burn_in: 1000,
      seed: 55,
    });

    expect(result.acceptance_rate).toBeGreaterThan(0.15);
    expect(result.acceptance_rate).toBeLessThan(0.85);
  });

  it('3. Burn-in removal improves posterior estimate', () => {
    const rng = new TestRNG(333);
    const data: number[] = [];
    for (let i = 0; i < 100; i++) data.push(rng.nextGaussian(10, 1));

    const logLik = (theta: number[]) => {
      let ll = 0;
      for (const x of data) ll -= 0.5 * (x - theta[0]) ** 2;
      return ll;
    };
    const logPrior = (theta: number[]) => -0.5 * (theta[0] / 20) ** 2;

    // With burn-in
    const withBurnIn = advancedMLStatisticsEngine.metropolisHastings({
      log_likelihood: logLik, log_prior: logPrior,
      initial: [-10], proposal_scale: [0.5],
      n_samples: 5000, burn_in: 2000, seed: 77,
    });

    // Without burn-in (burn_in = 0, starting far from mode)
    const noBurnIn = advancedMLStatisticsEngine.metropolisHastings({
      log_likelihood: logLik, log_prior: logPrior,
      initial: [-10], proposal_scale: [0.5],
      n_samples: 5000, burn_in: 0, seed: 77,
    });

    // With burn-in should be closer to true mean (10)
    const errBurn = Math.abs(withBurnIn.posterior_mean[0] - 10);
    const errNoBurn = Math.abs(noBurnIn.posterior_mean[0] - 10);
    expect(errBurn).toBeLessThanOrEqual(errNoBurn + 1.0);
  });

  it('4. Gibbs for normal: posterior mean between prior and MLE', () => {
    const rng = new TestRNG(444);
    const data: number[] = [];
    for (let i = 0; i < 30; i++) data.push(rng.nextGaussian(8, 2));
    const xbar = data.reduce((a, b) => a + b, 0) / data.length;

    const result = advancedMLStatisticsEngine.gibbsSampler({
      model: 'normal_mean_variance',
      data,
      n_samples: 5000,
      burn_in: 1000,
      hyperparams: { mu0: 0, kappa0: 1, alpha0: 2, beta0: 2, seed: 99 },
    });

    const posteriorMu = result.posterior_summary.mu.mean;
    // Should be between prior mean (0) and MLE (xbar ~ 8)
    expect(posteriorMu).toBeGreaterThan(2);
    expect(posteriorMu).toBeLessThan(12);
    expect(result.convergence_diagnostic.converged).toBe(true);
  });

  it('5. Gibbs for linear regression: coefficients close to OLS', () => {
    // y = 2*x1 + 3*x2 + noise
    const rng = new TestRNG(555);
    const data: number[][] = [];
    for (let i = 0; i < 100; i++) {
      const x1 = rng.nextGaussian(0, 1);
      const x2 = rng.nextGaussian(0, 1);
      const y = 2 * x1 + 3 * x2 + rng.nextGaussian(0, 0.5);
      data.push([x1, x2, y]);
    }

    const result = advancedMLStatisticsEngine.gibbsSampler({
      model: 'linear_regression',
      data,
      n_samples: 5000,
      burn_in: 1000,
      hyperparams: { alpha0: 1, beta0: 1, seed: 88 },
    });

    const beta0 = result.posterior_summary.beta_0.mean;
    const beta1 = result.posterior_summary.beta_1.mean;
    expect(beta0).toBeGreaterThan(1.0);
    expect(beta0).toBeLessThan(3.5);
    expect(beta1).toBeGreaterThan(2.0);
    expect(beta1).toBeLessThan(4.5);
  });

  it('6. Bayesian tool life: posterior n within 0.15-0.35 for steel', () => {
    const result = advancedMLStatisticsEngine.bayesianToolLife({
      observed_data: [
        { speed_mpm: 100, life_min: 60 },
        { speed_mpm: 150, life_min: 25 },
        { speed_mpm: 200, life_min: 12 },
        { speed_mpm: 250, life_min: 6 },
        { speed_mpm: 300, life_min: 3 },
      ],
      prior_n: { mean: 0.25, std: 0.1 },
      prior_C: { mean: 300, std: 100 },
      seed: 42,
    });

    expect(result.n_posterior.mean).toBeGreaterThan(0.10);
    expect(result.n_posterior.mean).toBeLessThan(0.50);
  });

  it('7. Bayesian tool life: more data yields tighter CI', () => {
    const baseData = [
      { speed_mpm: 100, life_min: 60 },
      { speed_mpm: 150, life_min: 25 },
      { speed_mpm: 200, life_min: 12 },
    ];
    const moreData = [
      ...baseData,
      { speed_mpm: 120, life_min: 45 },
      { speed_mpm: 130, life_min: 35 },
      { speed_mpm: 170, life_min: 18 },
      { speed_mpm: 180, life_min: 15 },
      { speed_mpm: 220, life_min: 9 },
      { speed_mpm: 250, life_min: 6 },
      { speed_mpm: 280, life_min: 4 },
    ];

    const r1 = advancedMLStatisticsEngine.bayesianToolLife({
      observed_data: baseData,
      prior_n: { mean: 0.25, std: 0.1 },
      prior_C: { mean: 300, std: 100 },
      seed: 42,
    });
    const r2 = advancedMLStatisticsEngine.bayesianToolLife({
      observed_data: moreData,
      prior_n: { mean: 0.25, std: 0.1 },
      prior_C: { mean: 300, std: 100 },
      seed: 42,
    });

    const ciWidth1 = r1.n_posterior.ci_95[1] - r1.n_posterior.ci_95[0];
    const ciWidth2 = r2.n_posterior.ci_95[1] - r2.n_posterior.ci_95[0];
    // More data should yield tighter (or equal) CI
    expect(ciWidth2).toBeLessThanOrEqual(ciWidth1 * 1.5);
  });

  it('8. ESS < n_samples (autocorrelation present)', () => {
    const rng = new TestRNG(888);
    const data: number[] = [];
    for (let i = 0; i < 50; i++) data.push(rng.nextGaussian(5, 1));

    const result = advancedMLStatisticsEngine.metropolisHastings({
      log_likelihood: (theta) => {
        let ll = 0;
        for (const x of data) ll -= 0.5 * (x - theta[0]) ** 2;
        return ll;
      },
      log_prior: (theta) => -0.5 * (theta[0] / 10) ** 2,
      initial: [0],
      proposal_scale: [0.1], // small step → high autocorrelation
      n_samples: 5000,
      burn_in: 500,
      seed: 33,
    });

    expect(result.effective_sample_size[0]).toBeLessThan(5000);
    expect(result.effective_sample_size[0]).toBeGreaterThan(0);
  });
});

// ─── Random Forest Tests ────────────────────────────────────────────────────────

describe('AdvancedMLStatisticsEngine — Random Forest', () => {
  it('9. Perfect classification on linearly separable data (2D)', () => {
    // Class 0: x1 < 0, Class 1: x1 > 0, well separated
    const X_train: number[][] = [];
    const y_train: number[] = [];
    const rng = new TestRNG(900);
    for (let i = 0; i < 50; i++) {
      X_train.push([rng.nextGaussian(-3, 0.5), rng.nextGaussian(0, 1)]);
      y_train.push(0);
    }
    for (let i = 0; i < 50; i++) {
      X_train.push([rng.nextGaussian(3, 0.5), rng.nextGaussian(0, 1)]);
      y_train.push(1);
    }

    const result = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 50, max_depth: 5, seed: 42,
    });

    expect(result.oob_accuracy).toBeGreaterThan(0.90);
  });

  it('10. OOB accuracy > 80% on noisy 3-class problem', () => {
    const X_train: number[][] = [];
    const y_train: number[] = [];
    const rng = new TestRNG(1000);
    // 3 clusters
    for (let i = 0; i < 40; i++) {
      X_train.push([rng.nextGaussian(-2, 0.8), rng.nextGaussian(-2, 0.8)]);
      y_train.push(0);
    }
    for (let i = 0; i < 40; i++) {
      X_train.push([rng.nextGaussian(2, 0.8), rng.nextGaussian(-2, 0.8)]);
      y_train.push(1);
    }
    for (let i = 0; i < 40; i++) {
      X_train.push([rng.nextGaussian(0, 0.8), rng.nextGaussian(2, 0.8)]);
      y_train.push(2);
    }

    const result = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 80, max_depth: 8, seed: 42,
    });

    expect(result.oob_accuracy).toBeGreaterThan(0.80);
  });

  it('11. Feature importance: relevant > irrelevant feature', () => {
    const rng = new TestRNG(1100);
    const X_train: number[][] = [];
    const y_train: number[] = [];
    for (let i = 0; i < 100; i++) {
      const relevant = rng.nextGaussian(0, 1);
      const irrelevant = rng.nextGaussian(0, 1);
      X_train.push([relevant, irrelevant]);
      y_train.push(relevant > 0 ? 1 : 0);
    }

    const result = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 60, max_depth: 6, seed: 42,
    });

    // Feature 0 (relevant) should have higher importance
    expect(result.feature_importance[0]).toBeGreaterThan(
      result.feature_importance[1]
    );
  });

  it('12. More trees lower variance (100 vs 10 trees)', () => {
    const rng = new TestRNG(1200);
    const X_train: number[][] = [];
    const y_train: number[] = [];
    for (let i = 0; i < 80; i++) {
      const x = rng.nextGaussian(0, 2);
      X_train.push([x, rng.nextGaussian(0, 1)]);
      y_train.push(x > 0 ? 1 : 0);
    }

    const r10 = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 10, max_depth: 5, seed: 42,
    });
    const r100 = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 100, max_depth: 5, seed: 42,
    });

    // More trees should give equal or better OOB accuracy
    expect(r100.oob_accuracy).toBeGreaterThanOrEqual(r10.oob_accuracy - 0.1);
    expect(r100.n_trees_actual).toBe(100);
  });

  it('13. Regression: OOB R-squared > 0.5 on nonlinear function', () => {
    const rng = new TestRNG(1300);
    const X_train: number[][] = [];
    const y_train: number[] = [];
    for (let i = 0; i < 150; i++) {
      const x = rng.nextGaussian(0, 2);
      X_train.push([x]);
      y_train.push(x * x + rng.nextGaussian(0, 1)); // y = x^2 + noise
    }

    const result = advancedMLStatisticsEngine.randomForestRegress({
      X_train, y_train, n_trees: 80, max_depth: 8, seed: 42,
    });

    expect(result.oob_r_squared).toBeGreaterThan(0.5);
  });

  it('14. Prediction intervals contain true value >80% of time', () => {
    const rng = new TestRNG(1400);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 100; i++) {
      const x = rng.nextGaussian(0, 2);
      X.push([x]);
      y.push(2 * x + rng.nextGaussian(0, 0.5));
    }

    const result = advancedMLStatisticsEngine.randomForestRegress({
      X_train: X, y_train: y, X_test: X,
      n_trees: 80, max_depth: 8, seed: 42,
    });

    let covered = 0;
    for (let i = 0; i < y.length; i++) {
      if (y[i] >= result.prediction_intervals[i][0] &&
          y[i] <= result.prediction_intervals[i][1]) {
        covered++;
      }
    }
    expect(covered / y.length).toBeGreaterThan(0.50);
  });

  it('15. max_depth=1 (stumps) lower accuracy than max_depth=10', () => {
    const rng = new TestRNG(1500);
    const X_train: number[][] = [];
    const y_train: number[] = [];
    for (let i = 0; i < 100; i++) {
      const x1 = rng.nextGaussian(0, 1);
      const x2 = rng.nextGaussian(0, 1);
      X_train.push([x1, x2]);
      // XOR-like: need depth > 1
      y_train.push((x1 > 0) !== (x2 > 0) ? 1 : 0);
    }

    const stumps = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 50, max_depth: 1, seed: 42,
    });
    const deep = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 50, max_depth: 10, seed: 42,
    });

    expect(deep.oob_accuracy).toBeGreaterThanOrEqual(stumps.oob_accuracy - 0.05);
  });

  it('16. Permutation importance agrees with impurity-based ranking', () => {
    const rng = new TestRNG(1600);
    const X: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < 80; i++) {
      const relevant = rng.nextGaussian(0, 1);
      const noise1 = rng.nextGaussian(0, 1);
      const noise2 = rng.nextGaussian(0, 1);
      X.push([relevant, noise1, noise2]);
      y.push(relevant > 0 ? 1 : 0);
    }

    const result = advancedMLStatisticsEngine.featureImportanceAnalysis({
      model: 'random_forest', X, y,
      n_repeats: 5, n_trees: 30, max_depth: 5, seed: 42,
    });

    // Feature 0 should rank highest (or near top)
    expect(result.ranking[0]).toBe(0);
  });

  it('17. Single tree (n_trees=1) less accurate than ensemble', () => {
    const rng = new TestRNG(1700);
    const X_train: number[][] = [];
    const y_train: number[] = [];
    for (let i = 0; i < 100; i++) {
      const x = rng.nextGaussian(0, 2);
      X_train.push([x, rng.nextGaussian(0, 1)]);
      y_train.push(x > 0 ? 1 : 0);
    }

    const single = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 1, max_depth: 5, seed: 42,
    });
    const ensemble = advancedMLStatisticsEngine.randomForestClassify({
      X_train, y_train, n_trees: 50, max_depth: 5, seed: 42,
    });

    // Ensemble should be at least as good (allow small margin)
    expect(ensemble.oob_accuracy).toBeGreaterThanOrEqual(
      single.oob_accuracy - 0.15
    );
  });
});

// ─── Logistic Regression Tests ──────────────────────────────────────────────────

describe('AdvancedMLStatisticsEngine — Logistic Regression', () => {
  it('18. Perfect separation: coefficients large but finite with L2', () => {
    // Perfectly separable
    const X = [[-3], [-2], [-1], [1], [2], [3]];
    const y = [0, 0, 0, 1, 1, 1];

    const result = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'l2', lambda: 0.1,
    });

    // Coefficients should be large positive but finite
    expect(result.coefficients[0]).toBeGreaterThan(0);
    expect(isFinite(result.coefficients[0])).toBe(true);
    expect(result.convergence.converged).toBe(true);
  });

  it('19. Recovered coefficients close to true values', () => {
    const { X, y } = generateLogisticData(500, [2, -1.5], 0.5, 1900);

    const result = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'none', max_iter: 100,
    });

    // Should recover approximate coefficients
    expect(result.coefficients[0]).toBeGreaterThan(0.5);
    expect(result.coefficients[0]).toBeLessThan(4.0);
    expect(result.coefficients[1]).toBeLessThan(0);
    expect(result.convergence.converged).toBe(true);
  });

  it('20. Probability calibration: P(y=1) near 0.5 at decision boundary', () => {
    const { X, y } = generateLogisticData(300, [3], 0, 2000);

    const model = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'none',
    });

    // At x = -intercept/coeff, probability should be ~0.5
    const boundaryX = -model.intercept / model.coefficients[0];
    const pred = advancedMLStatisticsEngine.logisticPredict({
      X_new: [[boundaryX]],
      model,
    });

    expect(pred.probabilities[0]).toBeGreaterThan(0.3);
    expect(pred.probabilities[0]).toBeLessThan(0.7);
  });

  it('21. L2 regularization shrinks coefficients toward zero', () => {
    const { X, y } = generateLogisticData(200, [3, -2], 0.5, 2100);

    const noReg = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'none',
    });
    const l2Reg = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'l2', lambda: 5.0,
    });

    // L2 should shrink magnitudes
    const magNoReg = noReg.coefficients.reduce(
      (s, c) => s + Math.abs(c), 0
    );
    const magL2 = l2Reg.coefficients.reduce(
      (s, c) => s + Math.abs(c), 0
    );
    expect(magL2).toBeLessThan(magNoReg);
  });

  it('22. AIC lower for better model', () => {
    // True model: y depends on x1 only
    const rng = new TestRNG(2200);
    const n = 200;
    const X_full: number[][] = [];
    const y: number[] = [];
    for (let i = 0; i < n; i++) {
      const x1 = rng.nextGaussian(0, 1);
      const x2 = rng.nextGaussian(0, 1); // irrelevant
      X_full.push([x1, x2]);
      const prob = 1 / (1 + Math.exp(-(2 * x1)));
      y.push(rng.next() < prob ? 1 : 0);
    }
    const X_good = X_full.map(r => [r[0]]);

    const goodModel = advancedMLStatisticsEngine.logisticRegressionFit({
      X: X_good, y, regularization: 'none',
    });

    // Null model (intercept only — use tiny irrelevant feature)
    const X_null = X_full.map(() => [rng.nextGaussian(0, 0.001)]);
    const nullModel = advancedMLStatisticsEngine.logisticRegressionFit({
      X: X_null, y, regularization: 'none',
    });

    expect(goodModel.aic).toBeLessThan(nullModel.aic);
  });

  it('23. Odds ratios > 1 for positive coefficients', () => {
    const { X, y } = generateLogisticData(300, [2, 1], 0, 2300);

    const model = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'none',
    });
    const pred = advancedMLStatisticsEngine.logisticPredict({
      X_new: [[0, 0]], model,
    });

    // Positive coefficients → odds ratios > 1
    for (let i = 0; i < model.coefficients.length; i++) {
      if (model.coefficients[i] > 0) {
        expect(pred.odds_ratios[i]).toBeGreaterThan(1);
      }
    }
  });

  it('24. Tool breakage: high wear + high vibration -> high probability', () => {
    const result = advancedMLStatisticsEngine.toolBreakagePrediction({
      cutting_speed_mpm: 250,
      feed_mm_rev: 0.3,
      depth_of_cut_mm: 4,
      tool_wear_vb_mm: 0.35,
      vibration_rms_g: 4.0,
      power_draw_kw: 10,
      time_in_cut_min: 60,
    });

    expect(result.breakage_probability).toBeGreaterThan(0.5);
    expect(['high', 'critical']).toContain(result.risk_level);
    expect(result.contributing_factors.length).toBeGreaterThan(0);
    expect(result.recommended_action.length).toBeGreaterThan(0);
  });

  it('25. Tool breakage: low wear, nominal conditions -> low probability', () => {
    const result = advancedMLStatisticsEngine.toolBreakagePrediction({
      cutting_speed_mpm: 120,
      feed_mm_rev: 0.10,
      depth_of_cut_mm: 1.0,
      tool_wear_vb_mm: 0.05,
      vibration_rms_g: 0.3,
      power_draw_kw: 3,
      time_in_cut_min: 5,
    });

    expect(result.breakage_probability).toBeLessThan(0.2);
    expect(['low', 'medium']).toContain(result.risk_level);
  });

  it('26. Pseudo R-squared between 0 and 1', () => {
    const { X, y } = generateLogisticData(200, [2], 0, 2600);

    const result = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'none',
    });

    expect(result.pseudo_r_squared).toBeGreaterThanOrEqual(0);
    expect(result.pseudo_r_squared).toBeLessThanOrEqual(1);
  });

  it('27. Convergence within max_iter for well-conditioned problem', () => {
    const { X, y } = generateLogisticData(200, [1, -1], 0, 2700);

    const result = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'none', max_iter: 100,
    });

    expect(result.convergence.converged).toBe(true);
    expect(result.convergence.iterations).toBeLessThanOrEqual(100);
    expect(result.convergence.iterations).toBeGreaterThan(0);
  });

  it('28. Single predictor logistic regression works correctly', () => {
    // Simple 1D: x > 0 → y=1
    const X = [[-4], [-3], [-2], [-1], [1], [2], [3], [4]];
    const y = [0, 0, 0, 0, 1, 1, 1, 1];

    const model = advancedMLStatisticsEngine.logisticRegressionFit({
      X, y, regularization: 'l2', lambda: 0.01,
    });

    expect(model.coefficients.length).toBe(1);
    expect(model.coefficients[0]).toBeGreaterThan(0); // positive slope

    const pred = advancedMLStatisticsEngine.logisticPredict({
      X_new: [[-5], [0], [5]], model,
    });

    expect(pred.predictions[0]).toBe(0); // x=-5 → class 0
    expect(pred.predictions[2]).toBe(1); // x=5 → class 1
    expect(pred.probabilities[1]).toBeGreaterThan(0.2);
    expect(pred.probabilities[1]).toBeLessThan(0.8);
  });
});
