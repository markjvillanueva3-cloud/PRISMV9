/**
 * Tests for AdaptiveCalibrationEngine — 6 self-calibrating methods
 */
import { describe, it, expect } from "vitest";
import { AdaptiveCalibrationEngine } from "../engines/AdaptiveCalibrationEngine.js";

const engine = new AdaptiveCalibrationEngine();

describe("AdaptiveCalibrationEngine", () => {
  // ── 1. Bayesian Kienzle Update ─────────────────────────────────────
  describe("bayesianKienzleUpdate()", () => {
    it("should update kc1.1 posterior from measurements", () => {
      const r = engine.bayesianKienzleUpdate({
        kc11Prior: 1800, kc11PriorStdDev: 200,
        mcPrior: 0.25, mcPriorStdDev: 0.05,
        measurements: [
          { force_N: 450, chipThickness_mm: 0.1, chipWidth_mm: 3 },
          { force_N: 480, chipThickness_mm: 0.1, chipWidth_mm: 3 },
          { force_N: 460, chipThickness_mm: 0.1, chipWidth_mm: 3 },
          { force_N: 470, chipThickness_mm: 0.1, chipWidth_mm: 3 },
        ],
        measurementStdDev: 30,
      });
      expect(r.kc11Posterior).toBeGreaterThan(0);
      expect(r.kc11PosteriorStdDev).toBeLessThan(r.kc11PriorStdDev || 200);
      expect(r.credibleInterval95.kc11[0]).toBeLessThan(r.kc11Posterior);
      expect(r.credibleInterval95.kc11[1]).toBeGreaterThan(r.kc11Posterior);
      expect(r.nObservations).toBe(4);
      expect(r.posteriorImprovement).toBeGreaterThan(0);
    });

    it("should converge toward measured values with many observations", () => {
      // Many measurements at kc1.1 ≈ 1500 should pull posterior from 1800 toward 1500
      const measurements = Array.from({ length: 20 }, () => ({
        force_N: 1500 * 3 * Math.pow(0.1, 1 - 0.25), // F = kc1.1 * b * h^(1-mc)
        chipThickness_mm: 0.1, chipWidth_mm: 3,
      }));
      const r = engine.bayesianKienzleUpdate({
        kc11Prior: 1800, kc11PriorStdDev: 200,
        mcPrior: 0.25, mcPriorStdDev: 0.05,
        measurements, measurementStdDev: 30,
      });
      // Posterior should be closer to 1500 than to 1800
      expect(Math.abs(r.kc11Posterior - 1500)).toBeLessThan(Math.abs(1800 - 1500));
    });
  });

  // ── 2. Taylor Coefficient Tracker ──────────────────────────────────
  describe("taylorCoefficientTracker()", () => {
    it("should track Taylor coefficients via Kalman filter", () => {
      const r = engine.taylorCoefficientTracker({
        priorC: 300, priorN: 0.25,
        observations: [
          { speed_mpm: 100, toolLife_min: 60 },
          { speed_mpm: 150, toolLife_min: 25 },
          { speed_mpm: 200, toolLife_min: 12 },
          { speed_mpm: 250, toolLife_min: 6 },
        ],
      });
      expect(r.updatedC).toBeGreaterThan(0);
      expect(r.updatedN).toBeGreaterThan(0);
      expect(r.updatedN).toBeLessThan(1);
      expect(r.stateHistory.length).toBeGreaterThanOrEqual(4);
      expect(r.residuals).toHaveLength(4);
      // Prediction function should work
      expect(typeof r.predictionAtSpeed).toBe("function");
      const pred = r.predictionAtSpeed(150);
      expect(pred).toBeGreaterThan(0);
    });

    it("should reduce uncertainty over time", () => {
      const r = engine.taylorCoefficientTracker({
        priorC: 300, priorN: 0.3,
        observations: Array.from({ length: 10 }, (_, i) => ({
          speed_mpm: 100 + i * 20,
          toolLife_min: 300 / Math.pow(100 + i * 20, 0.25),
        })),
      });
      expect(r.cStdDev).toBeGreaterThan(0);
      expect(r.nStdDev).toBeGreaterThan(0);
    });
  });

  // ── 3. Surface Finish Bias Corrector ───────────────────────────────
  describe("surfaceFinishBiasCorrector()", () => {
    it("should detect and correct systematic bias", () => {
      // Predictions consistently 0.3 μm too high
      const predictions = [1.5, 1.6, 1.4, 1.7, 1.5, 1.6, 1.8, 1.4, 1.5, 1.6];
      const measurements = predictions.map((p) => p - 0.3 + (Math.random() - 0.5) * 0.05);
      const r = engine.surfaceFinishBiasCorrector({
        predictions, measurements, seed: 42,
      });
      expect(r.meanBias).toBeGreaterThan(0.1); // should detect ~0.3 bias
      expect(r.rmseCorrected).toBeLessThan(r.rmseOriginal);
      expect(r.improvementPercent).toBeGreaterThan(0);
    });

    it("should not correct when no significant bias", () => {
      const predictions = [1.5, 1.6, 1.4, 1.7, 1.5];
      const measurements = [1.52, 1.58, 1.42, 1.68, 1.51];
      const r = engine.surfaceFinishBiasCorrector({
        predictions, measurements, seed: 42,
      });
      expect(Math.abs(r.meanBias)).toBeLessThan(0.1);
    });
  });

  // ── 4. Process Drift Compensator ───────────────────────────────────
  describe("processDriftCompensator()", () => {
    it("should detect drift onset", () => {
      // 20 stable points then linear drift
      const measurements = [
        ...Array.from({ length: 20 }, () => 10 + (Math.random() - 0.5) * 0.2),
        ...Array.from({ length: 20 }, (_, i) => 10 + 0.02 * (i + 1) + (Math.random() - 0.5) * 0.1),
      ];
      const r = engine.processDriftCompensator({
        measurements, target: 10, sigma: 0.2,
        cusumK: 0.5, cusumH: 4,
      });
      expect(r.driftDetected).toBe(true);
      expect(r.driftOnsetIndex).toBeGreaterThanOrEqual(15);
      expect(r.driftRate_perPart).toBeGreaterThan(0);
      expect(r.compensationOffsets).toHaveLength(40);
    });

    it("should not flag stable process", () => {
      const measurements = Array.from({ length: 30 }, () =>
        10 + (Math.random() - 0.5) * 0.3);
      const r = engine.processDriftCompensator({
        measurements, target: 10, sigma: 0.5,
      });
      expect(r.driftDetected).toBe(false);
    });
  });

  // ── 5. Thermal Model Calibrator ────────────────────────────────────
  describe("thermalModelCalibrator()", () => {
    it("should fit thermal growth model", () => {
      // Generate synthetic thermal data: δ = 20*(1-exp(-t/30)) + 0.001*t
      const times = Array.from({ length: 50 }, (_, i) => i * 2);
      const displacements = times.map((t) =>
        20 * (1 - Math.exp(-t / 30)) + 0.001 * t + (Math.random() - 0.5) * 0.5);
      const r = engine.thermalModelCalibrator({
        timePoints: times, measuredDisplacements: displacements,
        nTimeConstants: 1,
      });
      expect(r.amplitudes).toHaveLength(1);
      expect(r.timeConstants).toHaveLength(1);
      expect(r.rmse).toBeLessThan(5);
      expect(r.rSquared).toBeGreaterThan(0.8);
      expect(typeof r.predictAt).toBe("function");
      expect(r.predictAt(0)).toBeCloseTo(0, 0);
    });
  });

  // ── 6. Model Selector ─────────────────────────────────────────────
  describe("modelSelector()", () => {
    it("should select best model from candidates", () => {
      // Data follows quadratic y = 2x² + noise
      const x = Array.from({ length: 20 }, (_, i) => i * 0.5);
      const y = x.map((xi) => 2 * xi * xi + (Math.random() - 0.5) * 2);
      const r = engine.modelSelector({
        x, y,
        candidateModels: [
          { name: "linear", fn: (xi, p) => p[0] * xi + p[1], nParams: 2, initialParams: [1, 0] },
          { name: "quadratic", fn: (xi, p) => p[0] * xi * xi + p[1] * xi + p[2], nParams: 3, initialParams: [1, 0, 0] },
        ],
      });
      expect(r.rankings).toHaveLength(2);
      expect(r.bestModel).toBe("quadratic");
      expect(r.predictions).toHaveLength(20);
      // Quadratic should have better R²
      const quadR2 = r.rankings.find((m) => m.name === "quadratic")!.rSquared;
      const linR2 = r.rankings.find((m) => m.name === "linear")!.rSquared;
      expect(quadR2).toBeGreaterThan(linR2);
    });

    it("should compute Akaike weights summing to 1", () => {
      const x = Array.from({ length: 15 }, (_, i) => i);
      const y = x.map((xi) => 3 * xi + 2);
      const r = engine.modelSelector({
        x, y,
        candidateModels: [
          { name: "linear", fn: (xi, p) => p[0] * xi + p[1], nParams: 2, initialParams: [1, 0] },
          { name: "constant", fn: (_xi, p) => p[0], nParams: 1, initialParams: [10] },
        ],
      });
      const totalWeight = r.rankings.reduce((s, m) => s + m.akaikeWeight, 0);
      expect(totalWeight).toBeCloseTo(1, 1);
    });
  });

  // ── Stats ──────────────────────────────────────────────────────────
  describe("stats()", () => {
    it("should report 6 methods", () => {
      const s = engine.stats();
      expect(s.methods).toHaveLength(6);
    });
  });
});
