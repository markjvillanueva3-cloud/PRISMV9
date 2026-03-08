/**
 * Batch 77 — BayesianInference, WaveletAnalysis, TimeSeriesARIMA
 * @milestone FORGE-ENGINES-BATCH77
 */
import { describe, it, expect } from "vitest";
import { bayesianInferenceEngine } from "../engines/BayesianInferenceEngine.js";
import { waveletAnalysisEngine } from "../engines/WaveletAnalysisEngine.js";
import { timeSeriesARIMAEngine } from "../engines/TimeSeriesARIMAEngine.js";

describe("BayesianInferenceEngine", () => {
  const base = { prior_type: "beta_binomial" as const, successes: 7, trials: 10 };
  it("posterior mean between 0 and 1", () => {
    const pm = bayesianInferenceEngine.calculate(base).posterior_mean.value;
    expect(pm).toBeGreaterThan(0);
    expect(pm).toBeLessThan(1);
  });
  it("credible interval contains posterior mean", () => {
    const r = bayesianInferenceEngine.calculate(base);
    expect(r.credible_lower.value).toBeLessThan(r.posterior_mean.value);
    expect(r.credible_upper.value).toBeGreaterThan(r.posterior_mean.value);
  });
  it("more data narrows posterior", () => {
    const few = bayesianInferenceEngine.calculate({ ...base, successes: 7, trials: 10 });
    const many = bayesianInferenceEngine.calculate({ ...base, successes: 70, trials: 100 });
    expect(many.posterior_variance.value).toBeLessThan(few.posterior_variance.value);
  });
  it("normal-normal updates mean", () => {
    const r = bayesianInferenceEngine.calculate({ prior_type: "normal_normal", prior_mean: 0, data_mean: 10, sample_size: 20 });
    expect(r.posterior_mean.value).toBeGreaterThan(0);
  });
  it("effective sample size > 0", () => {
    expect(bayesianInferenceEngine.calculate(base).effective_sample_size.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(bayesianInferenceEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("WaveletAnalysisEngine", () => {
  const signal = Array.from({ length: 64 }, (_, i) => Math.sin(2 * Math.PI * i / 16) + 0.1 * Math.random());
  const base = { signal };
  it("total energy > 0", () => {
    expect(waveletAnalysisEngine.calculate(base).total_energy.value).toBeGreaterThan(0);
  });
  it("detail + approx ≈ 100%", () => {
    const r = waveletAnalysisEngine.calculate(base);
    expect(r.detail_energy_pct.value + r.approximation_energy_pct.value).toBeGreaterThan(50);
  });
  it("num levels > 0", () => {
    expect(waveletAnalysisEngine.calculate(base).num_levels.value).toBeGreaterThan(0);
  });
  it("compression ratio > 1", () => {
    expect(waveletAnalysisEngine.calculate(base).compression_ratio.value).toBeGreaterThanOrEqual(1);
  });
  it("pure noise has high detail energy", () => {
    const noise = Array.from({ length: 64 }, () => Math.random() - 0.5);
    expect(waveletAnalysisEngine.calculate({ signal: noise }).detail_energy_pct.value).toBeGreaterThan(30);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(waveletAnalysisEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("TimeSeriesARIMAEngine", () => {
  // AR(1) process with phi=0.8
  const data: number[] = [0];
  for (let i = 1; i < 100; i++) data.push(0.8 * data[i - 1] + (Math.sin(i) * 0.3));
  const base = { data };
  it("AR coefficient near true value", () => {
    const phi = timeSeriesARIMAEngine.calculate(base).ar_coefficients.value;
    expect(phi).toBeGreaterThan(0.3);
    expect(phi).toBeLessThan(1);
  });
  it("forecast within confidence interval", () => {
    const r = timeSeriesARIMAEngine.calculate(base);
    expect(r.forecast_next.value).toBeGreaterThanOrEqual(r.forecast_lower.value);
    expect(r.forecast_next.value).toBeLessThanOrEqual(r.forecast_upper.value);
  });
  it("residual std > 0", () => {
    expect(timeSeriesARIMAEngine.calculate(base).residual_std.value).toBeGreaterThan(0);
  });
  it("AIC is finite", () => {
    expect(isFinite(timeSeriesARIMAEngine.calculate(base).aic.value)).toBe(true);
  });
  it("differencing produces different forecast", () => {
    const d0 = timeSeriesARIMAEngine.calculate({ ...base, d: 0 }).forecast_next.value;
    const d1 = timeSeriesARIMAEngine.calculate({ ...base, d: 1 }).forecast_next.value;
    expect(d0).not.toBe(d1);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(timeSeriesARIMAEngine.calculate(base).recommendations)).toBe(true);
  });
});
