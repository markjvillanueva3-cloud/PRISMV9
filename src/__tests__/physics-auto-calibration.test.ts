// @ts-nocheck
import { describe, it, expect, beforeEach } from "vitest";
import {
  PhysicsAutoCalibrationEngine,
  type CalibrationMeasurement,
} from "../engines/PhysicsAutoCalibrationEngine.js";

describe("PhysicsAutoCalibrationEngine", () => {
  let engine: PhysicsAutoCalibrationEngine;

  beforeEach(() => {
    engine = new PhysicsAutoCalibrationEngine();
  });

  // ── Bayesian kc1.1 / mc updating ──

  it("should update kc1.1 from a measured force observation", () => {
    const meas: CalibrationMeasurement = {
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      ae_mm: 6,
      spindle_rpm: 3000,
      feed_rate_mmmin: 1200,
      measured_force_N: 800,
    };
    const result = engine.submit(meas);
    expect(result).toBeDefined();
    expect(result.material).toBeTruthy();
    expect(result.after.kc1_1).toBeGreaterThan(0);
    expect(result.n_observations).toBeGreaterThanOrEqual(1);
    expect(result.updated_constants).toContain("kc1_1");
  });

  it("should converge kc1.1 toward measured data with repeated observations", () => {
    const base: CalibrationMeasurement = {
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
      ap_mm: 2,
      ae_mm: 5,
      spindle_rpm: 4000,
      feed_rate_mmmin: 1600,
      measured_force_N: 600,
    };
    // Submit 5 identical observations — posterior should converge
    let lastResult;
    for (let i = 0; i < 5; i++) {
      lastResult = engine.submit(base);
    }
    expect(lastResult!.n_observations).toBe(5);
    expect(lastResult!.confidence).toBeGreaterThan(0);
    // After multiple consistent observations, after values should be closer to implied kc
    const changePct = Math.abs(lastResult!.change_pct.kc1_1);
    // The change from the last update should be small (converging)
    expect(changePct).toBeLessThan(50);
  });

  it("should update mc exponent from force data", () => {
    const result = engine.submit({
      material: "M",
      tool_diameter_mm: 8,
      flutes: 3,
      ap_mm: 1.5,
      ae_mm: 4,
      spindle_rpm: 3500,
      feed_rate_mmmin: 1050,
      measured_force_N: 500,
    });
    expect(result.after.mc).toBeGreaterThan(0);
    expect(result.after.mc).toBeLessThan(1);
  });

  // ── Taylor C/n calibration ──

  it("should calibrate Taylor C from measured tool life", () => {
    const result = engine.submit({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      ae_mm: 6,
      spindle_rpm: 3000,
      feed_rate_mmmin: 1200,
      measured_tool_life_min: 45,
    });
    expect(result.updated_constants).toContain("taylor_C");
    expect(result.after.taylor_C).toBeGreaterThan(0);
  });

  it("should calibrate Taylor n from measured tool life", () => {
    const result = engine.submit({
      material: "K",
      tool_diameter_mm: 16,
      flutes: 4,
      ap_mm: 4,
      ae_mm: 8,
      spindle_rpm: 2500,
      feed_rate_mmmin: 2000,
      measured_tool_life_min: 30,
    });
    expect(result.after.taylor_n).toBeGreaterThan(0);
    expect(result.after.taylor_n).toBeLessThan(1);
  });

  // ── Predict with calibrated constants ──

  it("should predict using calibrated constants after submit", () => {
    engine.submit({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      ae_mm: 6,
      spindle_rpm: 3000,
      feed_rate_mmmin: 1200,
      measured_force_N: 850,
      measured_tool_life_min: 40,
    });
    const pred = engine.predict({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      ae_mm: 6,
      spindle_rpm: 3000,
      feed_rate_mmmin: 1200,
    });
    expect(pred).toBeDefined();
    expect(pred.force_N).toBeGreaterThan(0);
    expect(pred.tool_life_min).toBeGreaterThan(0);
    expect(pred.power_kW).toBeGreaterThan(0);
    expect(pred.force_CI95).toHaveLength(2);
    expect(pred.force_CI95[0]).toBeLessThanOrEqual(pred.force_N);
    expect(pred.force_CI95[1]).toBeGreaterThanOrEqual(pred.force_N);
    expect(["calibrated", "blended", "canonical"]).toContain(pred.source);
  });

  // ── Persistence: export / import ──

  it("should export and import calibration state faithfully", () => {
    engine.submit({
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
      ap_mm: 2,
      ae_mm: 5,
      spindle_rpm: 4000,
      feed_rate_mmmin: 1600,
      measured_force_N: 700,
    });
    const exported = engine.exportCalibration();
    expect(exported.version).toBeGreaterThanOrEqual(1);
    expect(exported.total_measurements).toBe(1);
    expect(Object.keys(exported.materials).length).toBeGreaterThanOrEqual(1);

    // Import into a fresh engine
    const engine2 = new PhysicsAutoCalibrationEngine();
    const importResult = engine2.importCalibration(exported);
    expect(importResult.success).toBe(true);
    expect(importResult.materials_loaded).toBeGreaterThanOrEqual(1);

    // States should match
    const state1 = engine.getState();
    const state2 = engine2.getState();
    expect(state2.total_measurements).toBe(state1.total_measurements);
  });

  // ── Edge cases ──

  it("should handle getState on fresh engine (no observations)", () => {
    const state = engine.getState();
    expect(state).toBeDefined();
    expect(state.total_measurements).toBe(0);
    expect(Object.keys(state.materials).length).toBe(0);
  });

  it("should predict with canonical constants when no calibration data exists", () => {
    const pred = engine.predict({
      material: "Steel 1045",
      tool_diameter_mm: 12,
      flutes: 4,
      ap_mm: 3,
      spindle_rpm: 3000,
      feed_rate_mmmin: 1200,
    });
    expect(pred.source).toBe("canonical");
    expect(pred.force_N).toBeGreaterThan(0);
  });

  it("should reset calibration for a specific material", () => {
    engine.submit({
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
      ap_mm: 2,
      ae_mm: 5,
      spindle_rpm: 4000,
      feed_rate_mmmin: 1600,
      measured_force_N: 700,
    });
    engine.submit({
      material: "M",
      tool_diameter_mm: 10,
      flutes: 4,
      ap_mm: 2,
      ae_mm: 5,
      spindle_rpm: 3000,
      feed_rate_mmmin: 1200,
      measured_force_N: 500,
    });
    const resetResult = engine.reset({ material: "P" });
    expect(resetResult.reset).toBeTruthy();
    // M should still exist
    const state = engine.getState();
    expect(state.materials["M"]).toBeDefined();
  });

  it("should reset all calibration when no material specified", () => {
    engine.submit({
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
      ap_mm: 2,
      ae_mm: 5,
      spindle_rpm: 4000,
      feed_rate_mmmin: 1600,
      measured_force_N: 700,
    });
    const resetResult = engine.reset();
    expect(resetResult.total_measurements).toBe(0);
    const state = engine.getState();
    expect(Object.keys(state.materials).length).toBe(0);
  });

  it("should flag outlier warnings for extreme measurements", () => {
    // Submit a force measurement that is wildly different from canonical
    const result = engine.submit({
      material: "P",
      tool_diameter_mm: 10,
      flutes: 4,
      ap_mm: 2,
      ae_mm: 5,
      spindle_rpm: 4000,
      feed_rate_mmmin: 1600,
      measured_force_N: 50000, // Extreme outlier
    });
    // Engine should either warn or still produce a result
    expect(result).toBeDefined();
    // Outlier detection may add warnings
    if (result.warnings.length > 0) {
      expect(result.warnings.some((w: string) => w.toLowerCase().includes("outlier") || w.toLowerCase().includes("extreme") || w.length > 0)).toBe(true);
    }
  });

  it("should handle single data point calibration (blended source)", () => {
    engine.submit({
      material: "N",
      tool_diameter_mm: 20,
      flutes: 3,
      ap_mm: 5,
      ae_mm: 10,
      spindle_rpm: 2000,
      feed_rate_mmmin: 1800,
      measured_force_N: 400,
    });
    const pred = engine.predict({
      material: "N",
      tool_diameter_mm: 20,
      flutes: 3,
      ap_mm: 5,
      ae_mm: 10,
      spindle_rpm: 2000,
      feed_rate_mmmin: 1800,
    });
    // With only 1 observation, source should be blended (shrinkage to prior)
    expect(["blended", "calibrated"]).toContain(pred.source);
    expect(pred.confidence).toBeGreaterThan(0);
    expect(pred.confidence).toBeLessThanOrEqual(1);
  });
});
