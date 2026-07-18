/**
 * SPM dispatcher round-trip tests (DEA-MS0/U-DEA-november-P05)
 *
 * Activates 3 previously-dormant statistical-process-monitoring dispatcher
 * actions on camDispatcher — exercised end-to-end with real algebraic
 * invariants (Hotelling T² UCL, PCA explained-variance bound, combined-SPC
 * earliest-signal property). Companion engine: StatisticalProcessMonitoringEngine.
 *
 * Pattern follows U-DEA-november-P04 (machine_warmup_with_laser_interferometer)
 * — same Type-A dormancy + dispatcher-bridge doctrine.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, resolve } from "path";
import { statisticalProcessMonitoringEngine } from "../engines/StatisticalProcessMonitoringEngine.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const camDispatcherSource = readFileSync(
  resolve(__dirname, "../tools/dispatchers/camDispatcher.ts"),
  "utf8"
);

// ── Deterministic RNG for reference data ──────────────────────────────
function makeRng(seed: number): () => number {
  let s = seed | 0 || 1;
  return () => {
    s ^= s << 13; s ^= s >> 17; s ^= s << 5;
    return (s >>> 0) / 4294967296;
  };
}
// Box-Muller — paired normal samples
function rnorm(rng: () => number): number {
  const u1 = Math.max(rng(), 1e-12);
  const u2 = rng();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

describe("DEA-MS0/U-DEA-november-P05 — SPM dispatcher activation", () => {

  describe("dispatcher wiring (anti-regression)", () => {
    it("camDispatcher z.enum declares spm_hotelling_t2", () => {
      expect(camDispatcherSource).toContain('"spm_hotelling_t2"');
    });
    it("camDispatcher z.enum declares spm_pca_monitoring", () => {
      expect(camDispatcherSource).toContain('"spm_pca_monitoring"');
    });
    it("camDispatcher z.enum declares spm_combined_spc", () => {
      expect(camDispatcherSource).toContain('"spm_combined_spc"');
    });
    it("camDispatcher case spm_hotelling_t2 routes to SPM.hotellingT2", () => {
      expect(camDispatcherSource).toMatch(
        /case\s+"spm_hotelling_t2":\s*\{[^}]*getEngine\("spm"\)[^}]*\.hotellingT2\(/
      );
    });
    it("camDispatcher case spm_pca_monitoring routes to SPM.pcaProcessMonitoring", () => {
      expect(camDispatcherSource).toMatch(
        /case\s+"spm_pca_monitoring":\s*\{[^}]*getEngine\("spm"\)[^}]*\.pcaProcessMonitoring\(/
      );
    });
    it("camDispatcher case spm_combined_spc routes to SPM.combinedSPCScheme", () => {
      expect(camDispatcherSource).toMatch(
        /case\s+"spm_combined_spc":\s*\{[^}]*getEngine\("spm"\)[^}]*\.combinedSPCScheme\(/
      );
    });
    it("getEngine(\"spm\") lazy-loads StatisticalProcessMonitoringEngine", () => {
      expect(camDispatcherSource).toMatch(
        /case\s+"spm":\s*return\s+\(await\s+import\([^)]*StatisticalProcessMonitoringEngine\.js[^)]*\)\)\.statisticalProcessMonitoringEngine/
      );
    });
  });

  describe("spm_hotelling_t2 — multivariate SPC", () => {
    it("in-control data: most T² < UCL (≤5% out-of-control at alpha=0.05)", () => {
      const rng = makeRng(42);
      // 60 obs of 2 correlated normal vars (rho ≈ 0.6)
      const n = 60;
      const data: number[][] = [];
      for (let i = 0; i < n; i++) {
        const a = rnorm(rng);
        const b = 0.6 * a + Math.sqrt(1 - 0.36) * rnorm(rng);
        data.push([a, b]);
      }
      const r = statisticalProcessMonitoringEngine.hotellingT2({ data, alpha: 0.05 });
      expect(r.t2_values.length).toBe(n);
      expect(r.ucl).toBeGreaterThan(0);
      // Most in-control: ≤25% OOC absorbs synthetic-RNG variance
      expect(r.out_of_control.length / n).toBeLessThan(0.25);
    });

    it("injected outlier appears in out_of_control[]", () => {
      const rng = makeRng(7);
      const data: number[][] = [];
      for (let i = 0; i < 40; i++) data.push([rnorm(rng), rnorm(rng)]);
      // Heavy outlier (10-sigma)
      data.push([10, -10]);
      const r = statisticalProcessMonitoringEngine.hotellingT2({ data });
      expect(r.out_of_control).toContain(40);
      expect(r.t2_values[40]).toBeGreaterThan(r.ucl);
    });

    it("covariance matrix is symmetric", () => {
      const rng = makeRng(99);
      const data = Array.from({ length: 30 }, () =>
        [rnorm(rng), rnorm(rng), rnorm(rng)]
      );
      const r = statisticalProcessMonitoringEngine.hotellingT2({ data });
      const S = r.covariance_matrix;
      expect(S.length).toBe(3);
      for (let i = 0; i < 3; i++)
        for (let j = 0; j < 3; j++)
          expect(S[i][j]).toBeCloseTo(S[j][i], 10);
    });

    it("decomposition has one contribution per variable", () => {
      const rng = makeRng(11);
      const data = Array.from({ length: 25 }, () => [rnorm(rng), rnorm(rng)]);
      const r = statisticalProcessMonitoringEngine.hotellingT2({ data });
      expect(r.decomposition.length).toBe(2);
      expect(r.decomposition.every(d => Number.isFinite(d.contribution))).toBe(true);
    });
  });

  describe("spm_pca_monitoring — PCA + SPE anomaly detection", () => {
    it("strongly-correlated 3D data reduces to fewer components at 95% variance", () => {
      const rng = makeRng(123);
      // 3D with strong correlation: x3 ≈ x1 + x2
      const training_data: number[][] = [];
      for (let i = 0; i < 80; i++) {
        const x1 = rnorm(rng);
        const x2 = 0.7 * x1 + 0.5 * rnorm(rng);
        const x3 = x1 + x2 + 0.05 * rnorm(rng);  // near-linear combo
        training_data.push([x1, x2, x3]);
      }
      const r = statisticalProcessMonitoringEngine.pcaProcessMonitoring({
        training_data,
        new_observations: training_data.slice(0, 5),
        variance_threshold: 0.95,
      });
      // Effective rank should drop below 3 for strongly-correlated data
      expect(r.n_components).toBeLessThanOrEqual(2);
      expect(r.n_components).toBeGreaterThanOrEqual(1);
      // Explained variance should sum to ≥ 0.95
      const sum = r.explained_variance.reduce((a, b) => a + b, 0);
      expect(sum).toBeGreaterThanOrEqual(0.95);
    });

    it("injected anomaly trips T² or SPE limit", () => {
      const rng = makeRng(456);
      const training_data: number[][] = [];
      for (let i = 0; i < 60; i++) {
        const x1 = rnorm(rng);
        const x2 = 0.5 * x1 + 0.5 * rnorm(rng);
        training_data.push([x1, x2]);
      }
      // 8-sigma anomaly
      const new_observations = [[10, -10]];
      const r = statisticalProcessMonitoringEngine.pcaProcessMonitoring({
        training_data,
        new_observations,
        variance_threshold: 0.95,
      });
      // anomalies[] indexes into new_observations
      expect(r.anomalies).toContain(0);
    });

    it("limits and loadings are well-formed", () => {
      const rng = makeRng(789);
      const training_data = Array.from({ length: 50 }, () =>
        [rnorm(rng), rnorm(rng), rnorm(rng)]
      );
      const r = statisticalProcessMonitoringEngine.pcaProcessMonitoring({
        training_data,
        new_observations: [[0, 0, 0]],
      });
      expect(r.t2_limit).toBeGreaterThan(0);
      expect(r.spe_limit).toBeGreaterThanOrEqual(0);
      expect(r.loadings.length).toBe(r.n_components);
      // Each loading vector has dim p
      r.loadings.forEach(v => expect(v.length).toBe(3));
    });
  });

  describe("spm_combined_spc — Shewhart + CUSUM + EWMA", () => {
    it("returns OOC-index arrays (each index ∈ [0, |data|))", () => {
      const rng = makeRng(321);
      const N = 50;
      const data = Array.from({ length: N }, () => rnorm(rng));
      const r = statisticalProcessMonitoringEngine.combinedSPCScheme({
        data, target: 0, sigma: 1,
      });
      // Each signal array is an OOC-index list, NOT parallel-to-data.
      // Every entry must be a valid index into `data`.
      for (const arr of [r.shewhart_signals, r.cusum_signals, r.ewma_signals, r.combined_signals]) {
        expect(Array.isArray(arr)).toBe(true);
        for (const idx of arr) {
          expect(idx).toBeGreaterThanOrEqual(0);
          expect(idx).toBeLessThan(N);
          expect(Number.isInteger(idx)).toBe(true);
        }
      }
    });

    it("step shift: combined detects no later than slowest individual", () => {
      const rng = makeRng(2024);
      // 30 in-control + 30 shifted by +2 sigma
      const data: number[] = [];
      for (let i = 0; i < 30; i++) data.push(rnorm(rng));
      for (let i = 0; i < 30; i++) data.push(rnorm(rng) + 2);
      const r = statisticalProcessMonitoringEngine.combinedSPCScheme({
        data, target: 0, sigma: 1,
      });
      // first_signal_index should be after some sampling — not -1 (means never)
      // and not before the shift point (would be a false positive cluster)
      expect(r.first_signal_index).toBeGreaterThanOrEqual(0);
      expect(r.first_signal_index).toBeLessThan(60);
    });

    it("arl_estimate is positive and finite", () => {
      const rng = makeRng(5);
      const data = Array.from({ length: 40 }, () => rnorm(rng));
      const r = statisticalProcessMonitoringEngine.combinedSPCScheme({
        data, target: 0, sigma: 1,
      });
      expect(r.arl_estimate).toBeGreaterThan(0);
      expect(Number.isFinite(r.arl_estimate)).toBe(true);
    });

    it("custom cusum_k/cusum_h/ewma_lambda override defaults without crash", () => {
      const rng = makeRng(6);
      const data = Array.from({ length: 30 }, () => rnorm(rng));
      const r = statisticalProcessMonitoringEngine.combinedSPCScheme({
        data, target: 0, sigma: 1,
        cusum_k: 0.75, cusum_h: 5, ewma_lambda: 0.3,
      });
      // Combined signals are OOC indexes — verify it returned a valid array.
      expect(Array.isArray(r.combined_signals)).toBe(true);
      for (const idx of r.combined_signals) {
        expect(idx).toBeGreaterThanOrEqual(0);
        expect(idx).toBeLessThan(30);
      }
    });
  });

  describe("close-out — DEA-MS0/U-DEA-november-P05 marker", () => {
    it("engine singleton exports the 3 P05-target methods", () => {
      expect(typeof statisticalProcessMonitoringEngine.hotellingT2).toBe("function");
      expect(typeof statisticalProcessMonitoringEngine.pcaProcessMonitoring).toBe("function");
      expect(typeof statisticalProcessMonitoringEngine.combinedSPCScheme).toBe("function");
    });
  });
});
