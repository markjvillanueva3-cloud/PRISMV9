/**
 * Batch 69 — LinearRegression, PIDController, FourierAnalysis
 * @milestone FORGE-ENGINES-BATCH69
 */
import { describe, it, expect } from "vitest";
import { linearRegressionEngine } from "../engines/LinearRegressionEngine.js";
import { pidControllerEngine } from "../engines/PIDControllerEngine.js";
import { fourierAnalysisEngine } from "../engines/FourierAnalysisEngine.js";

describe("LinearRegressionEngine", () => {
  const base = {
    x_values: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10],
    y_values: [2.1, 4.0, 5.9, 8.1, 10.0, 11.9, 14.1, 16.0, 17.9, 20.1],
  };
  it("slope ≈ 2", () => {
    expect(linearRegressionEngine.calculate(base).slope.value).toBeCloseTo(2, 0);
  });
  it("R² > 0.99 for linear data", () => {
    expect(linearRegressionEngine.calculate(base).r_squared.value).toBeGreaterThan(0.99);
  });
  it("prediction at x=5 ≈ 10", () => {
    const r = linearRegressionEngine.calculate({ ...base, prediction_x: 5 });
    expect(r.predicted_y.value).toBeCloseTo(10, 0);
  });
  it("F-statistic > 0", () => {
    expect(linearRegressionEngine.calculate(base).f_statistic.value).toBeGreaterThan(0);
  });
  it("std error > 0", () => {
    expect(linearRegressionEngine.calculate(base).std_error.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(linearRegressionEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("PIDControllerEngine", () => {
  const base = { process_gain: 1.5, time_constant_s: 10, dead_time_s: 2 };
  it("controller gain > 0", () => {
    expect(pidControllerEngine.calculate(base).kc.value).toBeGreaterThan(0);
  });
  it("integral time > 0", () => {
    expect(pidControllerEngine.calculate(base).ti_s.value).toBeGreaterThan(0);
  });
  it("derivative time ≥ 0", () => {
    expect(pidControllerEngine.calculate(base).td_s.value).toBeGreaterThanOrEqual(0);
  });
  it("more dead time = lower gain", () => {
    const lo = pidControllerEngine.calculate({ ...base, dead_time_s: 1 });
    const hi = pidControllerEngine.calculate({ ...base, dead_time_s: 5 });
    expect(hi.kc.value).toBeLessThan(lo.kc.value);
  });
  it("settling time > 0", () => {
    expect(pidControllerEngine.calculate(base).settling_time_s.value).toBeGreaterThan(0);
  });
  it("controllability ratio > 0", () => {
    expect(pidControllerEngine.calculate(base).controllability_ratio.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(pidControllerEngine.calculate(base).recommendations)).toBe(true);
  });
});

describe("FourierAnalysisEngine", () => {
  // Generate 128 samples of 10Hz sine at 1000Hz sample rate
  const fs = 1000;
  const N = 128;
  const signal = Array.from({ length: N }, (_, i) => Math.sin(2 * Math.PI * 10 * i / fs));
  const base = { signal, sample_rate_Hz: fs };

  it("dominant frequency ≈ 10Hz", () => {
    const r = fourierAnalysisEngine.calculate(base);
    expect(r.dominant_frequency_Hz.value).toBeCloseTo(10, -1);
  });
  it("RMS > 0", () => {
    expect(fourierAnalysisEngine.calculate(base).total_rms.value).toBeGreaterThan(0);
  });
  it("nyquist = fs/2", () => {
    expect(fourierAnalysisEngine.calculate(base).nyquist_frequency_Hz.value).toBe(500);
  });
  it("DC component is small for sine", () => {
    expect(Math.abs(fourierAnalysisEngine.calculate(base).dc_component.value)).toBeLessThan(0.5);
  });
  it("spectral energy > 0", () => {
    expect(fourierAnalysisEngine.calculate(base).spectral_energy.value).toBeGreaterThan(0);
  });
  it("recommendations is array", () => {
    expect(Array.isArray(fourierAnalysisEngine.calculate(base).recommendations)).toBe(true);
  });
});
