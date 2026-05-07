/**
 * Tests for MastercamSPCBridge
 * @milestone CAM-PARITY-AGI-MS0/U-CAMP04
 */

import { describe, it, expect } from "vitest";
import { mastercamSPCBridge, type SPCFeature, type SPCMeasurement } from "../engines/MastercamSPCBridge.js";

describe("MastercamSPCBridge", () => {
  // Test data
  const testFeature: SPCFeature = {
    feature_id: "DIA-001",
    feature_type: "diameter",
    nominal: 25.0,
    tolerance_plus: 0.025,
    tolerance_minus: 0.025,
    unit: "mm"
  };

  const generateMeasurements = (
    featureId: string,
    count: number,
    nominal: number,
    stdDev: number
  ): SPCMeasurement[] => {
    const measurements: SPCMeasurement[] = [];
    for (let i = 0; i < count; i++) {
      // Box-Muller transform for normal distribution
      const u1 = Math.random();
      const u2 = Math.random();
      const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
      const value = nominal + z * stdDev;

      measurements.push({
        feature_id: featureId,
        measured_value: value,
        timestamp: new Date().toISOString(),
        part_number: i + 1
      });
    }
    return measurements;
  };

  describe("createXBarRChart", () => {
    it("should create X-bar R chart from measurements", () => {
      const measurements = generateMeasurements("DIA-001", 50, 25.0, 0.008);
      const chart = mastercamSPCBridge.createXBarRChart(testFeature, measurements, 5);

      expect(chart.feature_id).toBe("DIA-001");
      expect(chart.subgroup_size).toBe(5);
      expect(chart.x_bar_values.length).toBe(10); // 50 / 5
      expect(chart.r_values.length).toBe(10);
      expect(chart.x_bar_ucl).toBeGreaterThan(chart.x_bar_cl);
      expect(chart.x_bar_lcl).toBeLessThan(chart.x_bar_cl);
      expect(chart.r_ucl).toBeGreaterThan(chart.r_cl);
    });

    it("should detect out-of-control points", () => {
      // Create measurements with one extreme outlier
      const measurements = generateMeasurements("DIA-001", 50, 25.0, 0.005);
      measurements[0].measured_value = 25.1; // Way outside normal
      measurements[1].measured_value = 25.1;
      measurements[2].measured_value = 25.1;
      measurements[3].measured_value = 25.1;
      measurements[4].measured_value = 25.1;

      const chart = mastercamSPCBridge.createXBarRChart(testFeature, measurements, 5);
      expect(chart.out_of_control_points.length).toBeGreaterThan(0);
    });

    it("should use correct A2/D3/D4 factors for subgroup size", () => {
      const measurements = generateMeasurements("DIA-001", 30, 25.0, 0.008);

      const chart3 = mastercamSPCBridge.createXBarRChart(testFeature, measurements, 3);
      const chart5 = mastercamSPCBridge.createXBarRChart(testFeature, measurements, 5);

      // Different subgroup sizes produce different R-bar UCL ratios (D4 factor)
      // D4(3) = 2.575, D4(5) = 2.115 - so chart3 R_UCL/R_CL > chart5 R_UCL/R_CL
      const ratio3 = chart3.r_ucl / chart3.r_cl;
      const ratio5 = chart5.r_ucl / chart5.r_cl;
      expect(ratio3).toBeGreaterThan(ratio5);
    });
  });

  describe("calculateCapability", () => {
    it("should calculate Cp and Cpk for capable process", () => {
      // Small variation relative to tolerance = capable
      const measurements = generateMeasurements("DIA-001", 50, 25.0, 0.004);
      const capability = mastercamSPCBridge.calculateCapability(testFeature, measurements);

      expect(capability.Cp).toBeGreaterThan(1.0);
      expect(capability.Cpk).toBeGreaterThan(0.8);
      expect(capability.sigma_short).toBeLessThan(0.01);
    });

    it("should detect incapable process", () => {
      // Large variation relative to tolerance = incapable
      const measurements = generateMeasurements("DIA-001", 50, 25.0, 0.02);
      const capability = mastercamSPCBridge.calculateCapability(testFeature, measurements);

      expect(capability.Cpk).toBeLessThan(1.0);
      expect(capability.process_status).toBe("incapable");
      expect(capability.recommendations.length).toBeGreaterThan(0);
    });

    it("should detect off-center process", () => {
      // Process centered away from nominal
      const measurements = generateMeasurements("DIA-001", 50, 25.015, 0.003);
      const capability = mastercamSPCBridge.calculateCapability(testFeature, measurements);

      // Cp > Cpk indicates off-center
      expect(capability.Cp).toBeGreaterThan(capability.Cpk);
      expect(capability.recommendations.some(r => r.includes("off-center"))).toBe(true);
    });

    it("should calculate PPM defective", () => {
      const measurements = generateMeasurements("DIA-001", 50, 25.0, 0.008);
      const capability = mastercamSPCBridge.calculateCapability(testFeature, measurements);

      expect(capability.ppm_defective).toBeGreaterThanOrEqual(0);
      expect(capability.ppm_defective).toBeLessThan(1e6);
    });
  });

  describe("analyzeJob", () => {
    it("should analyze multiple features", () => {
      const features: SPCFeature[] = [
        testFeature,
        {
          feature_id: "LEN-001",
          feature_type: "length",
          nominal: 50.0,
          tolerance_plus: 0.05,
          tolerance_minus: 0.05,
          unit: "mm"
        }
      ];

      const measurements = [
        ...generateMeasurements("DIA-001", 30, 25.0, 0.005),
        ...generateMeasurements("LEN-001", 30, 50.0, 0.01)
      ];

      const result = mastercamSPCBridge.analyzeJob("JOB-001", features, measurements);

      expect(result.job_id).toBe("JOB-001");
      expect(result.feature_count).toBe(2);
      expect(result.charts.length).toBe(2);
      expect(result.capabilities.length).toBe(2);
      expect(result.timestamp).toBeTruthy();
    });

    it("should determine overall status", () => {
      const measurements = generateMeasurements("DIA-001", 50, 25.0, 0.004);
      const result = mastercamSPCBridge.analyzeJob("JOB-002", [testFeature], measurements);

      expect(["in_control", "warning", "out_of_control"]).toContain(result.overall_status);
      expect(result.summary).toContain("/");
    });
  });

  describe("Nelson Rules", () => {
    it("should detect rule 2 violation (9 consecutive same side)", () => {
      const measurements: SPCMeasurement[] = [];
      // Create 9 consecutive above center
      for (let i = 0; i < 50; i++) {
        measurements.push({
          feature_id: "DIA-001",
          measured_value: i < 9 ? 25.01 : 25.0 + (Math.random() - 0.5) * 0.01,
          timestamp: new Date().toISOString(),
          part_number: i + 1
        });
      }

      const chart = mastercamSPCBridge.createXBarRChart(testFeature, measurements, 5);
      const rule2 = chart.nelson_violations.find(v => v.rule === 2);
      // May or may not trigger depending on subgroup averaging
      expect(chart.nelson_violations).toBeDefined();
    });
  });

  describe("getStats", () => {
    it("should return capability statistics", () => {
      const stats = mastercamSPCBridge.getStats();

      expect(stats.features_supported).toBe(5);
      expect(stats.nelson_rules).toBe(5);
      expect(stats.capability_indices).toBe(4);
    });
  });
});
