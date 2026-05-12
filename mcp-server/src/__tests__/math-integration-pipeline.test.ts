/**
 * Tests for MathIntegrationPipelineEngine — 7 cross-engine integration pipelines
 */
import { describe, it, expect } from "vitest";
import { MathIntegrationPipelineEngine } from "../engines/MathIntegrationPipelineEngine.js";

const engine = new MathIntegrationPipelineEngine();

describe("MathIntegrationPipelineEngine", () => {
  // ──────────────────────────────────────────────────────────────────
  // 1. Robust Optimization (LHS → PCE → CMA-ES)
  // ──────────────────────────────────────────────────────────────────
  describe("robustOptimization()", () => {
    it("should find robust optimum for sphere function", () => {
      const r = engine.robustOptimization({
        objectiveFn: (x) => x[0] ** 2 + x[1] ** 2,
        dimensions: 2,
        bounds: [[-5, 5], [-5, 5]],
        nSamples: 30,
        seed: 42,
      });
      expect(r.bestSolution).toHaveLength(2);
      expect(r.bestValue).toBeDefined();
      expect(r.robustValue).toBeDefined();
      expect(r.sobolIndices).toHaveLength(2);
      expect(r.convergenceHistory.length).toBeGreaterThan(0);
    });

    it("should identify dominant dimension via Sobol indices", () => {
      // f = 9*x1² + x2² → x1 dominates
      const r = engine.robustOptimization({
        objectiveFn: (x) => 9 * x[0] ** 2 + x[1] ** 2,
        dimensions: 2,
        bounds: [[-3, 3], [-3, 3]],
        nSamples: 40,
        seed: 42,
      });
      expect(r.sobolIndices[0]).toBeGreaterThan(r.sobolIndices[1]);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 2. Multivariate SPC (PCA → CUSUM/EWMA)
  // ──────────────────────────────────────────────────────────────────
  describe("multivariateSPC()", () => {
    it("should detect shift in multivariate process", () => {
      // 3 dimensions, 20 in-control + 20 shifted
      const measurements: number[][] = [];
      for (let i = 0; i < 20; i++) {
        measurements.push([10 + Math.sin(i) * 0.3, 20 + Math.cos(i) * 0.3, 30 + Math.sin(i * 2) * 0.2]);
      }
      for (let i = 0; i < 20; i++) {
        measurements.push([13 + Math.sin(i) * 0.3, 23 + Math.cos(i) * 0.3, 33 + Math.sin(i * 2) * 0.2]);
      }
      const r = engine.multivariateSPC({
        measurements,
        nComponents: 2,
        cusumK: 0.5,
        cusumH: 4,
      });
      expect(r.pcaResult.components).toHaveLength(2);
      expect(r.pcaResult.explainedVarianceRatio.length).toBeGreaterThan(0);
      expect(r.controlResults.length).toBeGreaterThan(0);
      expect(r.overallOOC.length).toBeGreaterThan(0);
    });

    it("should compute Hotelling T² statistics", () => {
      const measurements = Array.from({ length: 30 }, (_, i) => [
        10 + Math.sin(i) * 0.5, 20 + Math.cos(i) * 0.5,
      ]);
      const r = engine.multivariateSPC({ measurements, nComponents: 2 });
      expect(r.hotellingT2).toHaveLength(30);
      expect(r.t2Limit).toBeGreaterThan(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 3. Smart DOE (LHS → BayesOpt → Bootstrap CI)
  // ──────────────────────────────────────────────────────────────────
  describe("smartDOE()", () => {
    it("should find optimum with confidence interval", () => {
      const r = engine.smartDOE({
        objectiveFn: (x) => (x[0] - 2) ** 2 + (x[1] - 3) ** 2,
        dimensions: 2,
        bounds: [[-5, 5], [-5, 5]],
        nInitial: 8,
        nIterations: 12,
        confidenceLevel: 0.95,
        seed: 42,
      });
      expect(r.bestSolution).toHaveLength(2);
      expect(r.bestValue).toBeGreaterThanOrEqual(0);
      expect(r.confidenceInterval).toHaveLength(2);
      expect(r.confidenceInterval[0]).toBeLessThanOrEqual(r.confidenceInterval[1]);
      expect(r.totalExperiments).toBeGreaterThanOrEqual(20);
      expect(r.experimentLog.length).toBe(r.totalExperiments);
    });

    it("should improve over pure random sampling", () => {
      const r = engine.smartDOE({
        objectiveFn: (x) => x[0] ** 2,
        dimensions: 1,
        bounds: [[-10, 10]],
        nInitial: 5,
        nIterations: 10,
        seed: 42,
      });
      // Best should be reasonably close to 0
      expect(r.bestValue).toBeLessThan(25);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 4. Predictive Maintenance (EMD → PCA → SVM)
  // ──────────────────────────────────────────────────────────────────
  describe("predictiveMaintenance()", () => {
    it("should extract health features from vibration signal", () => {
      // Simulate vibration: low freq + noise
      const signal = Array.from({ length: 200 }, (_, i) =>
        Math.sin(2 * Math.PI * i / 50) + 0.3 * Math.sin(2 * Math.PI * i / 10) + 0.1 * Math.sin(i));
      const r = engine.predictiveMaintenance({ vibrationSignal: signal });
      expect(r.imfs.length).toBeGreaterThan(0);
      expect(r.healthScore).toBeGreaterThanOrEqual(0);
      expect(r.healthScore).toBeLessThanOrEqual(1);
    });

    it("should classify with training data", () => {
      const makeSignal = (freq: number, amp: number) =>
        Array.from({ length: 100 }, (_, i) => amp * Math.sin(2 * Math.PI * i / freq) + 0.1 * Math.sin(i * 3));
      const trainingSignals = [
        makeSignal(50, 1), makeSignal(50, 1.1), makeSignal(50, 0.9), // healthy (0)
        makeSignal(10, 3), makeSignal(10, 3.2), makeSignal(10, 2.8), // degraded (1)
      ];
      const labels = [0, 0, 0, 1, 1, 1];
      const testSignal = makeSignal(50, 1.05); // should be healthy
      const r = engine.predictiveMaintenance({
        vibrationSignal: testSignal,
        trainingData: { signals: trainingSignals, labels },
      });
      expect(r.classification).toBeDefined();
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 5. Probabilistic Costing (MCMC → GARCH → Bootstrap)
  // ──────────────────────────────────────────────────────────────────
  describe("probabilisticCosting()", () => {
    it("should compute cost distribution with CI", () => {
      const r = engine.probabilisticCosting({
        baseCost: 1000,
        costComponents: [
          { name: "material", mean: 400, stdDev: 40 },
          { name: "labor", mean: 300, stdDev: 30 },
          { name: "tooling", mean: 200, stdDev: 50 },
          { name: "overhead", mean: 100, stdDev: 10 },
        ],
        nSamples: 500,
        confidenceLevel: 0.95,
        seed: 42,
      });
      expect(r.expectedCost).toBeGreaterThan(800);
      expect(r.costCI[0]).toBeLessThan(r.expectedCost);
      expect(r.costCI[1]).toBeGreaterThan(r.expectedCost);
      expect(r.componentSensitivity).toHaveLength(4);
      expect(r.riskScore).toBeGreaterThanOrEqual(0);
      expect(r.riskScore).toBeLessThanOrEqual(1);
    });

    it("should model material price volatility with GARCH", () => {
      const priceHistory = Array.from({ length: 100 }, (_, i) =>
        50 + 5 * Math.sin(i * 0.1) + 2 * Math.cos(i * 0.3));
      const r = engine.probabilisticCosting({
        baseCost: 500,
        costComponents: [{ name: "material", mean: 300, stdDev: 30 }],
        materialPriceHistory: priceHistory,
        seed: 42,
      });
      expect(r.materialVolatility).toBeDefined();
      expect(r.materialVolatility!.persistence).toBeGreaterThanOrEqual(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 6. Capability with CI (Cp/Cpk → Bootstrap)
  // ──────────────────────────────────────────────────────────────────
  describe("capabilityWithCI()", () => {
    it("should compute Cp/Cpk with confidence intervals", () => {
      // Well-centered process: mean=10, std=0.3, spec=[9, 11]
      const measurements = Array.from({ length: 50 }, (_, i) =>
        10 + 0.3 * Math.sin(i * 0.7));
      const r = engine.capabilityWithCI({
        measurements,
        USL: 11,
        LSL: 9,
        nBootstrap: 1000,
        confidenceLevel: 0.95,
        seed: 42,
      });
      expect(r.cp).toBeGreaterThan(0);
      expect(r.cpk).toBeGreaterThan(0);
      expect(r.cpCI[0]).toBeLessThanOrEqual(r.cp);
      expect(r.cpCI[1]).toBeGreaterThanOrEqual(r.cp);
      expect(r.cpkCI[0]).toBeLessThanOrEqual(r.cpk);
      expect(r.cpkCI[1]).toBeGreaterThanOrEqual(r.cpk);
      expect(typeof r.isCapable).toBe("boolean");
      expect(typeof r.isCapableWithCI).toBe("boolean");
      expect(r.nSamples).toBe(50);
    });

    it("should correctly flag incapable process", () => {
      // Wide spread process: std >> spec range
      const measurements = Array.from({ length: 30 }, (_, i) =>
        10 + 3 * Math.sin(i * 0.5));
      const r = engine.capabilityWithCI({
        measurements,
        USL: 11,
        LSL: 9,
        seed: 42,
      });
      expect(r.cpk).toBeLessThan(1.33);
      expect(r.isCapable).toBe(false);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // 7. Process Fingerprint (Wavelet → PCA → K-Means → LogReg)
  // ──────────────────────────────────────────────────────────────────
  describe("processFingerprint()", () => {
    it("should cluster process signals", () => {
      // Two distinct signal types
      const signals: number[][] = [];
      for (let i = 0; i < 5; i++) {
        // Type A: low frequency dominant
        signals.push(Array.from({ length: 64 }, (_, j) =>
          Math.sin(2 * Math.PI * j / 32) + 0.1 * i));
      }
      for (let i = 0; i < 5; i++) {
        // Type B: high frequency dominant
        signals.push(Array.from({ length: 64 }, (_, j) =>
          Math.sin(2 * Math.PI * j / 4) + 0.1 * i));
      }
      const r = engine.processFingerprint({ signals, k: 2, seed: 42 });
      expect(r.clusters).toHaveLength(2);
      expect(r.clusterLabels).toHaveLength(10);
      expect(r.fingerprints).toHaveLength(10);
      expect(r.pcaVariance.length).toBeGreaterThan(0);
    });

    it("should classify with labels", () => {
      const signals: number[][] = [];
      const labels: number[] = [];
      for (let i = 0; i < 6; i++) {
        signals.push(Array.from({ length: 32 }, (_, j) =>
          (i < 3 ? 1 : 5) * Math.sin(2 * Math.PI * j / 16)));
        labels.push(i < 3 ? 0 : 1);
      }
      const r = engine.processFingerprint({ signals, k: 2, labels, seed: 42 });
      expect(r.classification).toBeDefined();
      expect(r.classification!.accuracy).toBeGreaterThanOrEqual(0);
    });
  });

  // ──────────────────────────────────────────────────────────────────
  // Meta
  // ──────────────────────────────────────────────────────────────────
  describe("meta", () => {
    it("stats() should report 7 pipelines", () => {
      const s = engine.stats();
      expect(s.pipelineCount).toBe(7);
      expect(s.upstreamEngines).toHaveLength(3);
    });

    it("listPipelines() should return 7 entries", () => {
      const p = engine.listPipelines();
      expect(p).toHaveLength(7);
      expect(p[0].name).toBeDefined();
      expect(p[0].description).toBeDefined();
    });
  });
});
