/**
 * Batch 27 Engines -- Unit Tests
 * LeanSixSigmaEngine
 * @milestone AUDIT-FT-B27
 */
import { describe, it, expect } from "vitest";
import { leanSixSigmaEngine } from "../engines/LeanSixSigmaEngine.js";

describe("LeanSixSigmaEngine", () => {
  describe("calculateCp", () => {
    it("calculates Cp correctly", () => {
      expect(leanSixSigmaEngine.calculateCp(10, 0, 1)).toBeCloseTo(10 / 6);
    });

    it("returns 0 for zero sigma", () => {
      expect(leanSixSigmaEngine.calculateCp(10, 0, 0)).toBe(0);
    });
  });

  describe("calculateCpk", () => {
    it("centered process: Cpk = Cp", () => {
      const r = leanSixSigmaEngine.calculateCpk(15, 5, 10, 1);
      expect(r.value).toBeCloseTo(10 / 6);
      expect(r.cpkUpper).toBeCloseTo(r.cpkLower);
    });

    it("off-center process: Cpk < Cp", () => {
      const r = leanSixSigmaEngine.calculateCpk(15, 5, 12, 1);
      expect(r.value).toBeLessThan(10 / 6);
      expect(r.cpkUpper).toBeLessThan(r.cpkLower);
    });

    it("interprets sigma levels correctly", () => {
      const r2 = leanSixSigmaEngine.calculateCpk(6, -6, 0, 1);
      expect(r2.interpretation).toBe("World Class (6σ)");

      const r1 = leanSixSigmaEngine.calculateCpk(3, -3, 0, 1);
      expect(r1.interpretation).toBe("Capable (3σ)");

      const r0 = leanSixSigmaEngine.calculateCpk(1, -1, 0, 1);
      expect(r0.interpretation).toBe("Not Capable - Action Required");
    });

    it("estimates PPM", () => {
      const r = leanSixSigmaEngine.calculateCpk(3, -3, 0, 1);
      expect(r.ppm).toBeGreaterThan(0);
      expect(r.ppm).toBeLessThan(10000);
    });
  });

  describe("calculateCpkWithUncertainty", () => {
    it("provides confidence intervals", () => {
      const data = Array.from({ length: 50 }, () => 10 + (Math.random() - 0.5) * 2);
      const r = leanSixSigmaEngine.calculateCpkWithUncertainty(data, 15, 5);
      expect(r.confidence95.lower).toBeLessThan(r.value);
      expect(r.confidence95.upper).toBeGreaterThan(r.value);
      expect(r.sampleSize).toBe(50);
    });
  });

  describe("xBarRChart", () => {
    it("calculates control limits for in-control process", () => {
      const subgroups = [
        [10.1, 10.2, 10.0, 10.1, 10.2],
        [10.0, 10.1, 10.2, 10.0, 10.1],
        [10.1, 10.0, 10.1, 10.2, 10.1],
        [10.2, 10.1, 10.0, 10.1, 10.0],
        [10.0, 10.1, 10.1, 10.2, 10.1],
      ];
      const r = leanSixSigmaEngine.xBarRChart(subgroups);
      expect(r.chartType).toBe("X-bar and R");
      expect(r.subgroupSize).toBe(5);
      expect(r.numSubgroups).toBe(5);
      expect(r.xBar.UCL).toBeGreaterThan(r.xBar.centerline);
      expect(r.xBar.LCL).toBeLessThan(r.xBar.centerline);
      expect(r.inControl).toBe(true);
      expect(r.estimatedSigma).toBeGreaterThan(0);
    });

    it("detects out-of-control points", () => {
      const subgroups = [
        [10, 10, 10, 10, 10],
        [10, 10, 10, 10, 10],
        [20, 20, 20, 20, 20], // way out
        [10, 10, 10, 10, 10],
      ];
      const r = leanSixSigmaEngine.xBarRChart(subgroups);
      expect(r.inControl).toBe(false);
      expect(r.outOfControl.length).toBeGreaterThan(0);
    });
  });

  describe("iMRChart", () => {
    it("calculates I-MR chart for individuals", () => {
      const data = [10.1, 10.0, 10.2, 10.1, 10.0, 10.1, 10.2, 10.0, 10.1, 10.1];
      const r = leanSixSigmaEngine.iMRChart(data);
      expect(r.chartType).toBe("I-MR");
      expect(r.UCL).toBeGreaterThan(r.centerline);
      expect(r.LCL).toBeLessThan(r.centerline);
      expect(r.inControl).toBe(true);
    });

    it("detects out-of-control individual", () => {
      const data = [10, 10, 10, 10, 10, 10, 10, 10, 10, 50]; // outlier
      const r = leanSixSigmaEngine.iMRChart(data);
      expect(r.inControl).toBe(false);
    });
  });
});
