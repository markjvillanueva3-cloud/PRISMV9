/**
 * Tests for AdvancedMathematicalMethodsEngine — 7 mathematical methods
 * PCE, EMD/HHT, GARCH, LHS, CMA-ES, SVM, ALT
 */
import { describe, it, expect } from "vitest";
import { AdvancedMathematicalMethodsEngine } from "../engines/AdvancedMathematicalMethodsEngine.js";

const engine = new AdvancedMathematicalMethodsEngine();

describe("AdvancedMathematicalMethodsEngine", () => {
  // ────────────────────────────────────────────────────────────────────
  // 1. Polynomial Chaos Expansion (PCE)
  // ────────────────────────────────────────────────────────────────────
  describe("polynomialChaosExpansion()", () => {
    it("should compute PCE coefficients for a linear function", () => {
      // y = 2*x + 1 on uniform [-1,1]
      const N = 50;
      const samples: number[][] = [];
      const outputs: number[] = [];
      for (let i = 0; i < N; i++) {
        const x = -1 + (2 * i) / (N - 1);
        samples.push([x]);
        outputs.push(2 * x + 1);
      }
      const r = engine.polynomialChaosExpansion({
        samples,
        outputs,
        order: 3,
        dimensions: 1,
      });
      expect(r.coefficients.length).toBeGreaterThan(0);
      expect(r.numTerms).toBeGreaterThanOrEqual(4); // 1, x, x², x³
      expect(r.mean).toBeCloseTo(1, 0); // E[2x+1] on [-1,1] ≈ 1
      expect(r.rSquared).toBeGreaterThan(0.95);
    });

    it("should compute Sobol indices", () => {
      // y = 3*x1 + x2 => x1 contributes ~90% of variance
      const N = 100;
      const samples: number[][] = [];
      const outputs: number[] = [];
      for (let i = 0; i < N; i++) {
        const x1 = -1 + (2 * (i % 10)) / 9;
        const x2 = -1 + (2 * Math.floor(i / 10)) / 9;
        samples.push([x1, x2]);
        outputs.push(3 * x1 + x2);
      }
      const r = engine.polynomialChaosExpansion({
        samples,
        outputs,
        order: 2,
        dimensions: 2,
      });
      expect(r.sobolIndices).toHaveLength(2);
      // x1 should dominate (Sobol S1 >> S2)
      expect(r.sobolIndices[0]).toBeGreaterThan(r.sobolIndices[1]);
      expect(r.variance).toBeGreaterThan(0);
    });

    it("should handle single-sample edge case gracefully", () => {
      const r = engine.polynomialChaosExpansion({
        samples: [[0.5]],
        outputs: [1.0],
        order: 1,
        dimensions: 1,
      });
      expect(r.coefficients).toBeDefined();
      expect(r.numTerms).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 2. Empirical Mode Decomposition (EMD / HHT)
  // ────────────────────────────────────────────────────────────────────
  describe("empiricalModeDecomposition()", () => {
    it("should decompose a composite signal into IMFs", () => {
      // Signal = sin(2πt) + 0.5*sin(10πt) + trend
      const N = 200;
      const signal: number[] = [];
      for (let i = 0; i < N; i++) {
        const t = i / N;
        signal.push(Math.sin(2 * Math.PI * t) + 0.5 * Math.sin(10 * Math.PI * t) + 0.2 * t);
      }
      const r = engine.empiricalModeDecomposition({ signal, maxIMFs: 5 });
      expect(r.numIMFs).toBeGreaterThanOrEqual(1);
      expect(r.imfs.length).toBe(r.numIMFs);
      expect(r.residual).toHaveLength(N);
      // IMFs should have energy > 0
      for (const imf of r.imfs) {
        expect(imf.energy).toBeGreaterThan(0);
        expect(imf.data).toHaveLength(N);
      }
    });

    it("should reconstruct signal from IMFs + residual", () => {
      const N = 100;
      const signal: number[] = [];
      for (let i = 0; i < N; i++) {
        signal.push(Math.sin(2 * Math.PI * i / 50) + Math.cos(2 * Math.PI * i / 10));
      }
      const r = engine.empiricalModeDecomposition({ signal, maxIMFs: 4 });
      // Sum of all IMFs + residual should approximately equal original signal
      for (let i = 0; i < N; i++) {
        let reconstructed = r.residual[i];
        for (const imf of r.imfs) {
          reconstructed += imf.data[i];
        }
        expect(reconstructed).toBeCloseTo(signal[i], 1);
      }
    });

    it("should provide Hilbert spectrum entries", () => {
      const signal = Array.from({ length: 100 }, (_, i) => Math.sin(2 * Math.PI * i / 20));
      const r = engine.empiricalModeDecomposition({ signal });
      expect(r.hilbertSpectrum).toBeDefined();
      // Should have at least some spectrum entries
      if (r.numIMFs > 0) {
        expect(r.hilbertSpectrum.length).toBeGreaterThan(0);
      }
    });

    it("should handle constant signal", () => {
      const signal = Array.from({ length: 50 }, () => 5.0);
      const r = engine.empiricalModeDecomposition({ signal });
      // Constant signal → no IMFs (or 0-energy IMFs), residual = constant
      expect(r.residual.every((v) => Math.abs(v - 5.0) < 1)).toBe(true);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 3. GARCH(1,1)
  // ────────────────────────────────────────────────────────────────────
  describe("garch()", () => {
    it("should fit GARCH(1,1) to synthetic volatile returns", () => {
      // Generate synthetic returns with volatility clustering
      const N = 200;
      const returns: number[] = [];
      let vol = 0.01;
      for (let i = 0; i < N; i++) {
        // Simple vol clustering: vol mean-reverts with shocks
        vol = 0.01 + 0.85 * (vol - 0.01) + 0.002 * (Math.sin(i * 0.3) > 0 ? 1 : -1);
        returns.push(vol * Math.sin(i * 0.7 + 0.3));
      }
      const r = engine.garch({ returns, forecastHorizon: 5 });
      expect(r.omega).toBeGreaterThan(0);
      expect(r.alpha).toHaveLength(1);
      expect(r.beta).toHaveLength(1);
      expect(r.alpha[0]).toBeGreaterThanOrEqual(0);
      expect(r.beta[0]).toBeGreaterThanOrEqual(0);
      expect(r.persistence).toBeGreaterThanOrEqual(0);
      expect(r.persistence).toBeLessThanOrEqual(1.5); // May slightly exceed 1 in pathological cases
      expect(r.conditionalVariance).toHaveLength(N);
      expect(r.forecastVariance).toHaveLength(5);
      expect(r.unconditionalVariance).toBeGreaterThan(0);
      expect(r.logLikelihood).toBeDefined();
    });

    it("should forecast variance into the future", () => {
      const returns = Array.from({ length: 100 }, (_, i) => 0.02 * Math.sin(i * 0.5));
      const r = engine.garch({ returns, forecastHorizon: 10 });
      expect(r.forecastVariance).toHaveLength(10);
      // All forecasted variances should be positive
      for (const fv of r.forecastVariance) {
        expect(fv).toBeGreaterThan(0);
      }
    });

    it("should handle near-zero returns", () => {
      const returns = Array.from({ length: 50 }, () => 0.0001 * Math.random());
      const r = engine.garch({ returns });
      expect(r.omega).toBeGreaterThanOrEqual(0);
      expect(r.conditionalVariance).toHaveLength(50);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 4. Latin Hypercube Sampling (LHS)
  // ────────────────────────────────────────────────────────────────────
  describe("latinHypercubeSampling()", () => {
    it("should generate correct number of samples and dimensions", () => {
      const r = engine.latinHypercubeSampling({
        n: 20,
        dimensions: 3,
        seed: 42,
      });
      expect(r.samples).toHaveLength(20);
      expect(r.samples[0]).toHaveLength(3);
      expect(r.correlationMatrix).toHaveLength(3);
      expect(r.correlationMatrix[0]).toHaveLength(3);
    });

    it("should respect bounds", () => {
      const r = engine.latinHypercubeSampling({
        n: 50,
        dimensions: 2,
        lowerBounds: [10, 100],
        upperBounds: [20, 200],
        seed: 123,
      });
      for (const sample of r.samples) {
        expect(sample[0]).toBeGreaterThanOrEqual(10);
        expect(sample[0]).toBeLessThanOrEqual(20);
        expect(sample[1]).toBeGreaterThanOrEqual(100);
        expect(sample[1]).toBeLessThanOrEqual(200);
      }
    });

    it("should have low inter-dimension correlation", () => {
      const r = engine.latinHypercubeSampling({
        n: 100,
        dimensions: 3,
        seed: 999,
      });
      // Off-diagonal correlations should be small (< 0.3 for well-spread samples)
      expect(r.maxCorrelation).toBeLessThan(0.5);
      // Diagonal should be 1
      expect(r.correlationMatrix[0][0]).toBeCloseTo(1, 5);
      expect(r.correlationMatrix[1][1]).toBeCloseTo(1, 5);
    });

    it("should have space-filling property (stratified)", () => {
      const r = engine.latinHypercubeSampling({
        n: 10,
        dimensions: 1,
        seed: 7,
      });
      // In 1D LHS with 10 samples, each decile should have exactly 1 sample
      const bins = new Array(10).fill(0);
      for (const s of r.samples) {
        const bin = Math.min(9, Math.floor(s[0] * 10));
        bins[bin]++;
      }
      for (const count of bins) {
        expect(count).toBe(1);
      }
    });

    it("should be reproducible with same seed", () => {
      const r1 = engine.latinHypercubeSampling({ n: 10, dimensions: 2, seed: 42 });
      const r2 = engine.latinHypercubeSampling({ n: 10, dimensions: 2, seed: 42 });
      expect(r1.samples).toEqual(r2.samples);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 5. CMA-ES (Covariance Matrix Adaptation Evolution Strategy)
  // ────────────────────────────────────────────────────────────────────
  describe("cmaes()", () => {
    it("should minimize sphere function f(x) = sum(xi²)", () => {
      const r = engine.cmaes({
        objectiveFn: (x) => x.reduce((s, v) => s + v * v, 0),
        initialMean: [5, 5],
        initialSigma: 2,
        maxGenerations: 2000,
        tolerance: 1e-8,
      });
      expect(r.bestValue).toBeLessThan(1);
      expect(r.fitnessHistory.length).toBeGreaterThan(0);
      expect(r.evaluations).toBeGreaterThan(0);
    });

    it("should minimize Rosenbrock function", () => {
      // f(x,y) = (1-x)² + 100(y-x²)²  → minimum at (1,1)
      const r = engine.cmaes({
        objectiveFn: (x) => (1 - x[0]) ** 2 + 100 * (x[1] - x[0] ** 2) ** 2,
        initialMean: [-1, -1],
        initialSigma: 1,
        maxGenerations: 2000,
        tolerance: 1e-6,
      });
      expect(r.bestValue).toBeLessThan(0.1);
      expect(r.bestSolution[0]).toBeCloseTo(1, 0);
      expect(r.bestSolution[1]).toBeCloseTo(1, 0);
    });

    it("should respect bounds", () => {
      const r = engine.cmaes({
        objectiveFn: (x) => x.reduce((s, v) => s + v * v, 0),
        initialMean: [3, 3],
        initialSigma: 1,
        lowerBounds: [1, 1],
        upperBounds: [5, 5],
        maxGenerations: 200,
      });
      // Best solution should be at lower bound (closest to 0 within [1,5])
      expect(r.bestSolution[0]).toBeGreaterThanOrEqual(0.9);
      expect(r.bestSolution[1]).toBeGreaterThanOrEqual(0.9);
    });

    it("should track fitness history", () => {
      const r = engine.cmaes({
        objectiveFn: (x) => x[0] ** 2 + x[1] ** 2,
        initialMean: [10, 10],
        initialSigma: 3,
        maxGenerations: 100,
      });
      // Fitness should generally decrease
      expect(r.fitnessHistory[r.fitnessHistory.length - 1]).toBeLessThanOrEqual(r.fitnessHistory[0]);
      expect(r.evaluations).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 6. Support Vector Machine (SVM)
  // ────────────────────────────────────────────────────────────────────
  describe("svm()", () => {
    it("should classify linearly separable data", () => {
      // Simple 2D: class +1 if x1 > 0, else -1
      const X = [
        [2, 1], [1, 2], [3, 3], [2, 3],
        [-2, -1], [-1, -2], [-3, -3], [-2, -3],
      ];
      const y = [1, 1, 1, 1, -1, -1, -1, -1];
      const r = engine.svm({ X, y, kernel: "linear", C: 10 });
      expect(r.supportVectorIndices.length).toBeGreaterThan(0);
      expect(r.numSupportVectors).toBeGreaterThan(0);
      expect(r.accuracy).toBeGreaterThanOrEqual(0.5);
      // Use predict function on training point
      expect(r.predict([3, 3])).toBeGreaterThan(0); // should be +1
      expect(r.predict([-3, -3])).toBeLessThan(0); // should be -1
    });

    it("should classify with RBF kernel for non-linear data", () => {
      // XOR-like: (+1,+1)→+1, (-1,-1)→+1, (+1,-1)→-1, (-1,+1)→-1
      const X = [
        [1, 1], [1.1, 0.9], [0.9, 1.1],
        [-1, -1], [-1.1, -0.9], [-0.9, -1.1],
        [1, -1], [1.1, -0.9], [0.9, -1.1],
        [-1, 1], [-1.1, 0.9], [-0.9, 1.1],
      ];
      const y = [1, 1, 1, 1, 1, 1, -1, -1, -1, -1, -1, -1];
      const r = engine.svm({ X, y, kernel: "rbf", C: 100, gamma: 1.0 });
      expect(r.supportVectorIndices.length).toBeGreaterThan(0);
      expect(r.bias).toBeDefined();
    });

    it("should return bias and weight info", () => {
      const X = [[1, 0], [0, 1], [-1, 0], [0, -1]];
      const y = [1, 1, -1, -1];
      const r = engine.svm({ X, y, kernel: "linear", C: 1 });
      expect(r.bias).toBeDefined();
      expect(typeof r.bias).toBe("number");
    });

    it("should handle polynomial kernel", () => {
      const X = [[1, 2], [2, 3], [3, 4], [-1, -2], [-2, -3], [-3, -4]];
      const y = [1, 1, 1, -1, -1, -1];
      const r = engine.svm({ X, y, kernel: "polynomial", degree: 2, C: 1 });
      expect(r.numSupportVectors).toBeGreaterThan(0);
      expect(r.alphas.length).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // 7. Accelerated Life Testing (ALT)
  // ────────────────────────────────────────────────────────────────────
  describe("acceleratedLifeTest()", () => {
    it("should compute Arrhenius acceleration factors", () => {
      // Flat failureData array with {time, stress} per the ALTInput type
      const r = engine.acceleratedLifeTest({
        failureData: [
          { time: 100, stress: 400 }, { time: 150, stress: 400 },
          { time: 200, stress: 400 }, { time: 250, stress: 400 },
          { time: 300, stress: 350 }, { time: 400, stress: 350 },
          { time: 500, stress: 350 }, { time: 600, stress: 350 },
          { time: 800, stress: 300 }, { time: 1000, stress: 300 },
          { time: 1200, stress: 300 }, { time: 1500, stress: 300 },
        ],
        stressModel: "arrhenius",
        useStress: 300,
        confidence: 0.9,
      });
      expect(r.accelerationFactor).toBeGreaterThan(0);
      expect(r.b10Life).toBeGreaterThan(0);
      expect(r.predictedMTTF).toBeGreaterThan(0);
      expect(r.parameters).toBeDefined();
      expect(r.logLikelihood).toBeDefined();
    });

    it("should compute inverse power law model", () => {
      const r = engine.acceleratedLifeTest({
        failureData: [
          { time: 50, stress: 100 }, { time: 80, stress: 100 },
          { time: 120, stress: 100 },
          { time: 200, stress: 50 }, { time: 300, stress: 50 },
          { time: 400, stress: 50 },
          { time: 800, stress: 20 }, { time: 1000, stress: 20 },
          { time: 1500, stress: 20 },
        ],
        stressModel: "inverse_power",
        useStress: 20,
      });
      expect(r.b10Life).toBeGreaterThan(0);
      expect(r.parameters).toBeDefined();
      expect(r.predictedMTTF).toBeGreaterThan(0);
    });

    it("should compute Eyring model", () => {
      const r = engine.acceleratedLifeTest({
        failureData: [
          { time: 100, stress: 400 }, { time: 200, stress: 400 },
          { time: 300, stress: 400 },
          { time: 400, stress: 350 }, { time: 500, stress: 350 },
          { time: 600, stress: 350 },
          { time: 800, stress: 300 }, { time: 1000, stress: 300 },
          { time: 1200, stress: 300 },
        ],
        stressModel: "eyring",
        useStress: 300,
      });
      expect(r.b10Life).toBeGreaterThan(0);
      expect(r.accelerationFactor).toBeGreaterThan(0);
    });

    it("should provide reliability function", () => {
      const r = engine.acceleratedLifeTest({
        failureData: [
          { time: 50, stress: 500 }, { time: 100, stress: 500 },
          { time: 150, stress: 500 }, { time: 200, stress: 500 },
          { time: 200, stress: 350 }, { time: 350, stress: 350 },
          { time: 500, stress: 350 },
        ],
        stressModel: "arrhenius",
        useStress: 300,
      });
      // reliabilityAtTime is a function
      expect(typeof r.reliabilityAtTime).toBe("function");
      // R(0) should be ~1
      expect(r.reliabilityAtTime(0)).toBeCloseTo(1, 1);
      // R(very large t) should approach 0
      expect(r.reliabilityAtTime(1e9)).toBeLessThan(0.1);
    });

    it("should handle single stress level", () => {
      const r = engine.acceleratedLifeTest({
        failureData: [
          { time: 100, stress: 400 }, { time: 200, stress: 400 },
          { time: 300, stress: 400 }, { time: 400, stress: 400 },
          { time: 500, stress: 400 },
        ],
        stressModel: "arrhenius",
        useStress: 300,
      });
      expect(r.b10Life).toBeGreaterThan(0);
      expect(r.confidenceBounds).toBeDefined();
      expect(r.confidenceBounds.lower).toBeLessThanOrEqual(r.confidenceBounds.upper);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Cross-method integration
  // ────────────────────────────────────────────────────────────────────
  describe("cross-method integration", () => {
    it("LHS samples can feed PCE", () => {
      // Use LHS to generate samples, then run PCE
      const lhs = engine.latinHypercubeSampling({
        n: 50,
        dimensions: 2,
        lowerBounds: [-1, -1],
        upperBounds: [1, 1],
        seed: 42,
      });
      // Transform to [-1,1] range (already in bounds)
      const outputs = lhs.samples.map(([x1, x2]) => x1 * x1 + x2);
      const pce = engine.polynomialChaosExpansion({
        samples: lhs.samples,
        outputs,
        order: 2,
        dimensions: 2,
      });
      expect(pce.rSquared).toBeGreaterThan(0.7);
      expect(pce.sobolIndices).toHaveLength(2);
    });

    it("CMA-ES can optimize a simple objective", () => {
      const r = engine.cmaes({
        objectiveFn: (x) => (x[0] - 0.5) ** 2,
        initialMean: [2],
        initialSigma: 1,
        maxGenerations: 500,
      });
      // Just verify it makes progress toward the optimum
      expect(r.bestValue).toBeLessThan(1);
      expect(r.generations).toBeGreaterThan(0);
    });
  });

  // ────────────────────────────────────────────────────────────────────
  // Dimensional / mathematical correctness
  // ────────────────────────────────────────────────────────────────────
  describe("mathematical correctness", () => {
    it("PCE should produce valid variance and coefficients for quadratic", () => {
      const N = 60;
      const samples: number[][] = [];
      const outputs: number[] = [];
      for (let i = 0; i < N; i++) {
        const x = -1 + (2 * i) / (N - 1);
        samples.push([x]);
        outputs.push(x * x);
      }
      const r = engine.polynomialChaosExpansion({
        samples, outputs, order: 3, dimensions: 1,
      });
      expect(r.variance).toBeGreaterThan(0);
      expect(r.stdDev).toBeCloseTo(Math.sqrt(r.variance), 5);
      expect(r.coefficients.length).toBeGreaterThan(1);
      expect(r.rSquared).toBeGreaterThan(0.9);
    });

    it("LHS minDistance should be positive", () => {
      const r = engine.latinHypercubeSampling({ n: 20, dimensions: 2, seed: 77 });
      expect(r.minDistance).toBeGreaterThan(0);
    });

    it("GARCH persistence = alpha + beta", () => {
      const returns = Array.from({ length: 100 }, (_, i) => 0.01 * Math.sin(i * 0.3));
      const r = engine.garch({ returns });
      expect(r.persistence).toBeCloseTo(r.alpha[0] + r.beta[0], 10);
    });

    it("CMA-ES evaluations >= generations * populationSize", () => {
      const r = engine.cmaes({
        objectiveFn: (x) => x[0] ** 2,
        initialMean: [5],
        initialSigma: 1,
        maxGenerations: 10,
        populationSize: 6,
      });
      expect(r.evaluations).toBeGreaterThanOrEqual(r.generations * 6);
    });
  });
});
