import { describe, it, expect } from "vitest";
import { ManufacturingIntegrationEngine } from "../engines/ManufacturingIntegrationEngine.js";

const engine = new ManufacturingIntegrationEngine();

describe("ManufacturingIntegrationEngine", () => {
  describe("Distortion Prediction", () => {
    it("predicts distortion for roughing", () => {
      const result = engine.predictSetupDistortion(
        [{ type: "roughing", cutting_force_N: 500, axial_depth_mm: 5 }],
        { iso_group: "P" },
        { length: 200, width: 100, height: 50 },
      );
      expect(result.predicted_distortion_um).toBeGreaterThan(0);
      expect(["bow", "twist", "cup"]).toContain(result.distortion_direction);
    });

    it("thin wall amplifies", () => {
      const thick = engine.predictSetupDistortion(
        [{ type: "roughing", cutting_force_N: 500, axial_depth_mm: 5 }],
        { iso_group: "P" },
        { length: 200, width: 100, height: 50, wall_thickness_min: 10 },
      );
      const thin = engine.predictSetupDistortion(
        [{ type: "roughing", cutting_force_N: 500, axial_depth_mm: 5 }],
        { iso_group: "P" },
        { length: 200, width: 100, height: 50, wall_thickness_min: 2 },
      );
      expect(thin.thin_wall_amplification).toBeGreaterThan(thick.thin_wall_amplification);
    });
  });

  describe("Compensation", () => {
    it("applies offsets", () => {
      const d = engine.predictSetupDistortion(
        [{ type: "roughing", cutting_force_N: 500, axial_depth_mm: 5 }],
        { iso_group: "P" },
        { length: 200, width: 100, height: 50 },
      );
      const result = engine.applyDistortionCompensation([{ x: 100, y: 50, z: 25 }], d);
      expect(result.compensated.length).toBe(1);
    });
  });

  describe("Fixture Planning", () => {
    it("vise layout", () => {
      const result = engine.planFixtureLayout(
        { length: 200, width: 100, height: 30 },
        [{ type: "roughing", cutting_force_N: 500, axial_depth_mm: 3 }],
        "vise",
      );
      expect(result.clamp_positions.length).toBe(2);
      expect(result.grip_safety_factor).toBeGreaterThan(0);
    });

    it("fixture plate layout", () => {
      const result = engine.planFixtureLayout(
        { length: 200, width: 100, height: 30 },
        [{ type: "roughing", cutting_force_N: 500, axial_depth_mm: 3 }],
        "fixture_plate",
      );
      expect(result.clamp_positions.length).toBeGreaterThan(0);
    });
  });

  describe("Variable Depth Trochoidal", () => {
    it("generates layers", () => {
      const result = engine.variableDepthTrochoidal(
        { width_mm: 50, length_mm: 100, depth_mm: 20 },
        { diameter_mm: 10, flutes: 4, feed_per_tooth_mm: 0.08, max_ap_mm: 5, rpm: 8000 },
        { iso_group: "P" },
      );
      expect(result.layers.length).toBeGreaterThan(0);
      expect(result.total_time_s).toBeGreaterThan(0);
    });
  });

  describe("GD&T Uncertainty", () => {
    it("propagates via Monte Carlo", () => {
      const result = engine.propagateGDTUncertainty(
        [{ id: "h1", type: "true_position", nominal: { x: 50, y: 50, z: 0 }, zone_diameter_mm: 0.1, datum_ref: "A" }],
        { positioning_accuracy_um: 5, thermal_drift_um: 3, spindle_runout_um: 2 },
      );
      expect(result.per_feature.length).toBe(1);
      expect(result.per_feature[0].predicted_cpk).toBeGreaterThan(0);
      expect(result.per_feature[0].probability_in_zone).toBeLessThanOrEqual(1);
      expect(result.monte_carlo_samples).toBe(500);
    });
  });
});
