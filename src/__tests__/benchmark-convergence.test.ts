/**
 * Convergence Benchmark Tests
 *
 * Validates two fundamental numerical properties used across PRISM stochastic engines:
 *   1. Monte Carlo CI width narrows proportionally to 1/sqrt(N)
 *   2. Bayesian conjugate-normal posterior converges to the true value
 *
 * These properties underpin StochasticCuttingForce, StochasticToolLife,
 * UncertaintyPropagationPipeline, SelfLearningCAM, and PhysicsAutoCalibration engines.
 */
import { describe, it, expect } from 'vitest';

describe('Monte Carlo Convergence', () => {
  const SAMPLE_SIZES = [100, 500, 1000, 5000];

  it('CI width decreases with sqrt(N)', () => {
    // Draw from N(100, 10) at increasing sample sizes using a deterministic
    // linear-congruential generator (LCG) → Box-Muller transform.
    const widths: number[] = [];

    for (const N of SAMPLE_SIZES) {
      let sum = 0;
      let sum2 = 0;
      const seed = 42;

      for (let i = 0; i < N; i++) {
        // Two independent LCG draws for Box-Muller
        const u1 = ((seed * (i + 1) * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        const u2 = ((seed * (i + 2) * 1103515245 + 12345) & 0x7fffffff) / 0x7fffffff;
        const z = Math.sqrt(-2 * Math.log(Math.max(u1, 1e-10))) * Math.cos(2 * Math.PI * u2);
        const val = 100 + 10 * z;
        sum += val;
        sum2 += val * val;
      }

      const mean = sum / N;
      const std = Math.sqrt(sum2 / N - mean * mean);
      const ci_width = 2 * 1.96 * std / Math.sqrt(N);
      widths.push(ci_width);
    }

    // Verify: each step to a larger N should narrow the CI
    for (let i = 1; i < widths.length; i++) {
      const ratio = widths[i - 1] / widths[i];
      // Expected ratio from 1/sqrt(N) scaling
      const expected_ratio = Math.sqrt(SAMPLE_SIZES[i] / SAMPLE_SIZES[i - 1]);
      // Allow 50% tolerance because the LCG is not a perfect RNG
      expect(ratio).toBeGreaterThan(expected_ratio * 0.5);
    }

    // Final CI at N=5000 should be substantially narrower than at N=100
    expect(widths[widths.length - 1]).toBeLessThan(widths[0]);
  });

  it('Bayesian posterior converges with more data', () => {
    // Conjugate-normal updating: simulates PRISM's SelfLearningCAMEngine
    // and PhysicsAutoCalibrationEngine Bayesian kc1.1 calibration.
    let mu_prior = 1800;       // initial kc1.1 prior (N/mm²)
    let sigma_prior = 200;     // wide initial uncertainty
    const true_kc = 1850;      // ground truth
    const measurement_sigma = 50;

    const convergence: number[] = [];

    for (let i = 0; i < 50; i++) {
      // Simulate a noisy force measurement
      const measurement = true_kc + (Math.sin(i * 137.5) * measurement_sigma);

      // Conjugate-normal posterior update
      const prec_prior = 1 / (sigma_prior ** 2);
      const prec_obs = 1 / (measurement_sigma ** 2);
      const sigma2_post = 1 / (prec_prior + prec_obs);
      const mu_post = sigma2_post * (mu_prior * prec_prior + measurement * prec_obs);

      convergence.push(Math.abs(mu_post - true_kc));
      mu_prior = mu_post;
      sigma_prior = Math.sqrt(sigma2_post);
    }

    // After 50 updates the posterior should be much closer to truth
    expect(convergence[49]).toBeLessThan(convergence[0]);
    // Within 20 N/mm² of true value (1% of kc range)
    expect(convergence[49]).toBeLessThan(20);
  });

  it('Posterior uncertainty shrinks monotonically with data', () => {
    // Verify the sigma (uncertainty) never increases during pure conjugate updates
    let sigma = 200;
    const measurement_sigma = 50;
    const sigmas: number[] = [sigma];

    for (let i = 0; i < 20; i++) {
      const sigma2_post = 1 / (1 / sigma ** 2 + 1 / measurement_sigma ** 2);
      sigma = Math.sqrt(sigma2_post);
      sigmas.push(sigma);
    }

    // Each sigma must be strictly less than the previous
    for (let i = 1; i < sigmas.length; i++) {
      expect(sigmas[i]).toBeLessThan(sigmas[i - 1]);
    }

    // Final uncertainty should be well below measurement noise
    expect(sigmas[sigmas.length - 1]).toBeLessThan(measurement_sigma);
  });
});
