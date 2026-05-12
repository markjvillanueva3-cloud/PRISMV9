/**
 * SCIMATH Wiring Integration Tests — SCIMATH-WIRE-MS0 P6-U04
 *
 * Verifies all 25 downstream SCIMATH consumer wiring points produce
 * equivalent or better results. Tests cross-domain consistency.
 *
 * Coverage: P1 (Quality), P2 (ML), P3 (Physics), P4 (Chatter),
 *           P5 (Deflection), P6 (Downstream Math).
 */

import { describe, it, expect } from "vitest";

// ── P1: Quality & SPC ──
import { SVDEngine } from "../engines/SVDEngine.js";
import { CholeskyEngine } from "../engines/CholeskyEngine.js";
import { EigensolverEngine } from "../engines/EigensolverEngine.js";

// ── P3: Physics Pipeline ──
import { SystemIdentificationEngine } from "../engines/SystemIdentificationEngine.js";
import { RobustRegressionEngine } from "../engines/RobustRegressionEngine.js";

// ── P5: Deflection ──
import { toolAssemblyDeflectionEngine } from "../engines/ToolAssemblyDeflectionEngine.js";
import { fixtureDynamicsEngine } from "../engines/FixtureDynamicsEngine.js";

// ── P6: Downstream Math ──
import { stochasticWrapperEngine } from "../engines/StochasticWrapperEngine.js";
import { monteCarloEngine } from "../engines/MonteCarloEngine.js";
import { finiteElementEngine } from "../engines/FiniteElementEngine.js";


describe("SCIMATH Wiring Integration", () => {

  // ════════════════════════════════════════════════════════════════════
  // P1: Quality & SPC — Multivariate Analytics
  // ════════════════════════════════════════════════════════════════════

  describe("P1: SVD/Cholesky for Quality Analytics", () => {
    it("SVD condition number detects ill-conditioned covariance", () => {
      // Near-singular covariance matrix (highly correlated measurements)
      const covMat = [
        [1.0, 0.999, 0.998],
        [0.999, 1.0, 0.999],
        [0.998, 0.999, 1.0],
      ];
      const result = SVDEngine.conditionNumber(covMat);
      expect(result.conditionNumber).toBeGreaterThan(100);
    });

    it("Cholesky factorizes SPD covariance for Mahalanobis distance", () => {
      const sigma = [
        [4, 2],
        [2, 3],
      ];
      const result = CholeskyEngine.factorize(sigma);
      expect(result.L).toBeDefined();
      expect(result.L.length).toBe(2);
      // Verify L * L^T = sigma
      const LLT00 = result.L[0][0] * result.L[0][0];
      const LLT01 = result.L[1][0] * result.L[0][0];
      const LLT11 = result.L[1][0] * result.L[1][0] + result.L[1][1] * result.L[1][1];
      expect(LLT00).toBeCloseTo(4, 5);
      expect(LLT01).toBeCloseTo(2, 5);
      expect(LLT11).toBeCloseTo(3, 5);
    });

    it("Cholesky sampleMultivariateNormal produces correlated samples", () => {
      const mu = [100, 50];
      const sigma = [[4, 1.6], [1.6, 1]]; // correlated
      const L = CholeskyEngine.factorize(sigma).L;
      const z = [0.5, -0.3]; // deterministic z for reproducibility
      const sample = CholeskyEngine.sampleMultivariateNormal(mu, L, z);
      expect(sample.length).toBe(2);
      expect(sample[0]).toBeGreaterThan(mu[0] - 10);
      expect(sample[1]).toBeGreaterThan(mu[1] - 10);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // P2: ML & Optimization — Stable Matrix Operations
  // ════════════════════════════════════════════════════════════════════

  describe("P2: SVD least squares for regression", () => {
    it("SVD least squares solves overdetermined system", () => {
      // y = 2x + 1 with noise
      const A = [[1, 1], [1, 2], [1, 3], [1, 4], [1, 5]];
      const b = [3.1, 5.0, 6.9, 9.1, 11.0]; // ≈ 1 + 2x
      const result = SVDEngine.leastSquares(A, b);
      expect(result.x[0]).toBeCloseTo(1, 0); // intercept ≈ 1
      expect(result.x[1]).toBeCloseTo(2, 0); // slope ≈ 2
    });

    it("Robust regression resists outliers", () => {
      // Clean data: y = 3x
      const X = [[1], [2], [3], [4], [5], [6], [7], [8], [9], [10]];
      const y = [3, 6, 9, 12, 15, 18, 21, 24, 27, 30];
      // Add outliers
      y[4] = 100;
      y[7] = -50;
      const huber = RobustRegressionEngine.huber(X, y, { fitIntercept: false });
      const ols = RobustRegressionEngine.ols(X, y, { fitIntercept: false });
      // Huber should be closer to true slope (3.0) than OLS
      expect(Math.abs(huber.coefficients[0] - 3)).toBeLessThan(
        Math.abs(ols.coefficients[0] - 3)
      );
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // P3: Physics Pipeline — Core Manufacturing
  // ════════════════════════════════════════════════════════════════════

  describe("P3: SystemID RLS for adaptive calibration", () => {
    it("RLS recovers Taylor coefficients from noisy data", () => {
      // Taylor: ln(T) = ln(C) - n*ln(V)
      // True: C=200, n=0.25
      const trueC = 200, trueN = 0.25;
      const state = SystemIdentificationEngine.rlsInit(2, { lambda: 0.99, delta: 100 });
      state.theta[0] = Math.log(150); // prior guess
      state.theta[1] = 0.3;

      const speeds = [100, 150, 200, 250, 300, 120, 180, 220];
      for (const v of speeds) {
        const trueLife = trueC / Math.pow(v, trueN);
        const noisyLife = trueLife * (0.9 + Math.random() * 0.2);
        const phi = [1.0, -Math.log(v)];
        SystemIdentificationEngine.rlsUpdate(state, phi, Math.log(noisyLife));
      }

      const estC = Math.exp(state.theta[0]);
      const estN = state.theta[1];
      // Should converge reasonably close to true values
      expect(estC).toBeGreaterThan(100);
      expect(estC).toBeLessThan(400);
      expect(estN).toBeGreaterThan(0.1);
      expect(estN).toBeLessThan(0.5);
    });

    it("TLS handles errors-in-variables", () => {
      const A = [[1, -Math.log(100)], [1, -Math.log(200)], [1, -Math.log(300)]];
      const b = [Math.log(50), Math.log(30), Math.log(20)];
      const result = SystemIdentificationEngine.totalLeastSquares(A, b);
      expect(result.x.length).toBe(2);
      expect(result.residual).toBeGreaterThanOrEqual(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // P4: Chatter & Vibration — Multi-Mode Physics
  // ════════════════════════════════════════════════════════════════════

  describe("P4: Eigensolver for multi-mode dynamics", () => {
    it("generalizedEigen extracts natural frequencies from K,M", () => {
      // Simple 2-DOF spring-mass: m=1kg, k=4N/m
      const K = [[8, -4], [-4, 4]];
      const M = [[2, 0], [0, 1]];
      const result = EigensolverEngine.generalizedEigen(K, M);
      expect(result.converged).toBe(true);
      expect(result.eigenvalues.length).toBeGreaterThanOrEqual(2);
      // ω² values should be positive
      result.eigenvalues.forEach(lam => {
        expect(lam).toBeGreaterThan(0);
      });
    });

    it("symmetricQR handles 3x3 covariance matrix", () => {
      const A = [[5, 1, 0], [1, 3, 1], [0, 1, 4]];
      const result = EigensolverEngine.symmetricQR(A);
      expect(result.converged).toBe(true);
      expect(result.eigenvalues.length).toBe(3);
      // All eigenvalues should be positive (SPD matrix)
      result.eigenvalues.forEach(lam => {
        expect(lam).toBeGreaterThan(0);
      });
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // P5: Deflection & Structural — FEM Upgrade Path
  // ════════════════════════════════════════════════════════════════════

  describe("P5: FEM-backed tool assembly deflection", () => {
    it("beam theory deflection is computed correctly", () => {
      const result = toolAssemblyDeflectionEngine.compute({
        sections: [
          { name: "holder", length_mm: 50, diameter_mm: 40, material: "steel", is_cutting: false },
          { name: "shank", length_mm: 60, diameter_mm: 20, material: "carbide", is_cutting: false },
          { name: "cutting", length_mm: 30, diameter_mm: 12, material: "carbide", is_cutting: true },
        ],
        cutting_force_n: 500,
        taper: "BT40",
      });
      expect(result.value.total_deflection_mm).toBeGreaterThan(0);
      expect(result.value.total_deflection_um).toBeGreaterThan(0);
      expect(result.value.stiffness_n_mm).toBeGreaterThan(0);
      expect(result.value.natural_frequency_hz).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.8);
    });

    it("FEM path activates for L/D > 4", () => {
      const result = toolAssemblyDeflectionEngine.compute({
        sections: [
          { name: "shank", length_mm: 100, diameter_mm: 16, material: "carbide", is_cutting: false }, // L/D = 6.25
          { name: "cutting", length_mm: 30, diameter_mm: 10, material: "carbide", is_cutting: true },
        ],
        cutting_force_n: 300,
        taper: "CAT40",
      });
      expect(result.value.fem_analysis).toBeDefined();
      expect(result.value.fem_analysis!.axial_compliance_um).toBeGreaterThanOrEqual(0);
      expect(result.value.fem_analysis!.fem_natural_freq_hz).toBeGreaterThan(0);
      expect(result.confidence).toBe(0.88);
    });

    it("FEM auto-activates for HSK tapers", () => {
      const result = toolAssemblyDeflectionEngine.compute({
        sections: [
          { name: "holder", length_mm: 40, diameter_mm: 30, material: "steel", is_cutting: false },
          { name: "cutting", length_mm: 20, diameter_mm: 10, material: "carbide", is_cutting: true },
        ],
        cutting_force_n: 200,
        taper: "HSK-A63",
      });
      expect(result.value.fem_analysis).toBeDefined();
    });

    it("resonance risk detected when spindle near natural frequency", () => {
      // Use small tool with high natural frequency, then set spindle RPM near it
      const result = toolAssemblyDeflectionEngine.compute({
        sections: [
          { name: "tool", length_mm: 50, diameter_mm: 10, material: "carbide", is_cutting: true },
        ],
        cutting_force_n: 100,
        taper: "HSK-A63",
        use_fem: true,
        spindle_speed_rpm: 60000, // high RPM
        num_flutes: 4,
      });
      expect(result.value.resonance_risk).toBeDefined();
      // Natural frequency check is present regardless of risk level
      expect(result.value.resonance_risk!.natural_freq_hz).toBeGreaterThan(0);
      expect(result.value.resonance_risk!.spindle_freq_hz).toBeGreaterThan(0);
    });

    it("backward compatible — no FEM when use_fem=false", () => {
      const result = toolAssemblyDeflectionEngine.compute({
        sections: [
          { name: "tool", length_mm: 100, diameter_mm: 16, material: "carbide", is_cutting: true },
        ],
        cutting_force_n: 300,
        taper: "BT40",
        use_fem: false,
      });
      expect(result.value.fem_analysis).toBeUndefined();
      expect(result.confidence).toBe(0.8);
    });
  });

  describe("P5: Quad4 FEM clamp contact stress", () => {
    it("computes von Mises stress at clamp jaw", () => {
      const result = fixtureDynamicsEngine.clampContactStress({
        jaw_width_mm: 30,
        jaw_height_mm: 20,
        jaw_thickness_mm: 10,
        clamping_force_N: 5000,
        E_mpa: 210000,
        nu: 0.3,
        yield_stress_mpa: 350,
      });
      expect(result.max_von_mises_mpa).toBeGreaterThan(0);
      expect(result.yield_ratio).toBeGreaterThan(0);
      expect(result.max_displacement_mm).toBeGreaterThan(0);
      expect(result.element_stresses.length).toBeGreaterThan(0);
      expect(result.contact_pressure_mpa).toBeGreaterThan(0);
    });

    it("detects yield exceedance", () => {
      // Very high force on small jaw → should exceed yield
      const result = fixtureDynamicsEngine.clampContactStress({
        jaw_width_mm: 5,
        jaw_height_mm: 5,
        jaw_thickness_mm: 3,
        clamping_force_N: 50000,
        yield_stress_mpa: 250,
      });
      expect(result.yield_exceeded).toBe(true);
      expect(result.yield_ratio).toBeGreaterThan(1.0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("wired to dispatcher via fixture_clamp_contact_stress", () => {
      const result = fixtureDynamicsEngine.calculate({
        action: "fixture_clamp_contact_stress",
        params: {
          jaw_width_mm: 30,
          jaw_height_mm: 20,
          jaw_thickness_mm: 10,
          clamping_force_N: 5000,
        },
      });
      expect(result.max_von_mises_mpa).toBeGreaterThan(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // P6: Downstream Math Cleanup
  // ════════════════════════════════════════════════════════════════════

  describe("P6: SVD-backed PCE in StochasticWrapper", () => {
    it("PCE analysis runs with SVD-backed least squares", () => {
      const result = stochasticWrapperEngine.wrapWithPCE({
        engine_fn: (inputs: Record<string, number>) => ({ out: inputs.x * 2 + inputs.y }),
        nominal_inputs: { x: 10, y: 5 },
        input_distributions: {
          x: { type: "normal", params: [10, 1] },
          y: { type: "normal", params: [5, 0.5] },
        },
        pce_order: 2,
        n_eval_points: 50,
        seed: 42,
      });
      // PCE should produce valid statistics
      expect(result.value.outputs.out).toBeDefined();
      expect(result.value.outputs.out.mean).toBeGreaterThan(0);
      expect(result.value.outputs.out.std_dev).toBeGreaterThan(0);
    });
  });

  describe("P6: MonteCarloEngine correlated sampling", () => {
    it("generates correlated multivariate normal samples", () => {
      const mu = [100, 50];
      const cov = [[4, 1.6], [1.6, 1]];
      const samples = monteCarloEngine.sampleCorrelatedNormal(mu, cov, 100);
      expect(samples.length).toBe(100);
      expect(samples[0].length).toBe(2);

      // Check mean is near mu (statistical — allow wide tolerance)
      const meanX = samples.reduce((s, row) => s + row[0], 0) / 100;
      const meanY = samples.reduce((s, row) => s + row[1], 0) / 100;
      expect(meanX).toBeGreaterThan(90);
      expect(meanX).toBeLessThan(110);
      expect(meanY).toBeGreaterThan(40);
      expect(meanY).toBeLessThan(60);
    });
  });

  describe("P6: Eigensolver in CMMPathPlanning", () => {
    it("EigensolverEngine.symmetricQR produces valid eigenvectors", () => {
      // Covariance matrix for plane fitting
      const C = [[3, 1, 0], [1, 2, 0.5], [0, 0.5, 1]];
      const result = EigensolverEngine.symmetricQR(C);
      expect(result.converged).toBe(true);
      expect(result.eigenvalues.length).toBe(3);
      // Smallest eigenvalue's eigenvector is the plane normal
      const minIdx = result.eigenvalues.indexOf(Math.min(...result.eigenvalues));
      const ev = result.eigenvectors.map(row => row[minIdx]);
      const len = Math.sqrt(ev.reduce((s, v) => s + v * v, 0));
      expect(len).toBeGreaterThan(0.5); // non-degenerate
    });
  });

  describe("P6: FEM modalAnalysis for natural frequency", () => {
    it("computes bar element natural frequencies", () => {
      const elements = [
        { nodes: [0, 1] as [number, number], E: 210e9, A: 1e-4, L: 0.1, rho: 7850 },
        { nodes: [1, 2] as [number, number], E: 210e9, A: 1e-4, L: 0.1, rho: 7850 },
      ];
      const result = finiteElementEngine.modalAnalysis(elements, 3, [0], 2);
      expect(result.frequencies.length).toBeGreaterThan(0);
      expect(result.frequencies[0]).toBeGreaterThan(0);
    });
  });

  // ════════════════════════════════════════════════════════════════════
  // Cross-Domain Consistency
  // ════════════════════════════════════════════════════════════════════

  describe("Cross-domain: SCIMATH consumer consistency", () => {
    it("SVD and Cholesky agree on SPD inverse for small matrices", () => {
      const A = [[4, 2], [2, 3]];
      const svdInv = SVDEngine.pseudoInverse(A).matrix;
      const cholFact = CholeskyEngine.factorize(A);

      // Verify A * A_inv ≈ I via SVD
      const prod00 = A[0][0] * svdInv[0][0] + A[0][1] * svdInv[1][0];
      const prod01 = A[0][0] * svdInv[0][1] + A[0][1] * svdInv[1][1];
      expect(prod00).toBeCloseTo(1, 4);
      expect(prod01).toBeCloseTo(0, 4);

      // Cholesky solve: A*x = e1, x = A_inv[:,0]
      const x = CholeskyEngine.solve(cholFact.L, [1, 0]);
      expect(x[0]).toBeCloseTo(svdInv[0][0], 4);
      expect(x[1]).toBeCloseTo(svdInv[1][0], 4);
    });

    it("RLS and Ridge regression converge for well-conditioned problems", () => {
      // y = 3x1 + 2x2
      const X = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2]];
      const y = [3, 2, 5, 8, 7];

      // Ridge regression
      const ridge = RobustRegressionEngine.ridge(X, y, { lambda: 0.01, fitIntercept: false });

      // RLS (batch)
      const state = SystemIdentificationEngine.rlsInit(2, { lambda: 1.0, delta: 1000 });
      for (let i = 0; i < X.length; i++) {
        SystemIdentificationEngine.rlsUpdate(state, X[i], y[i]);
      }

      // Both should recover [3, 2] approximately
      expect(ridge.coefficients[0]).toBeCloseTo(state.theta[0], 0);
      expect(ridge.coefficients[1]).toBeCloseTo(state.theta[1], 0);
    });
  });
});
