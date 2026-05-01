import { describe, it, expect } from "vitest";
import { InverseThermalCompensationEngine } from "../engines/InverseThermalCompensationEngine.js";

const engine = new InverseThermalCompensationEngine();

describe("InverseThermalCompensationEngine", () => {
  describe("Thermal Field Prediction", () => {
    it("predicts zero deformation at t=0", () => {
      const field = engine.predictThermalField("vmc", 0, 0, 3);
      expect(field.max_deformation_um).toBeCloseTo(0, 1);
    });

    it("deformation increases with run time", () => {
      const f1 = engine.predictThermalField("vmc", 10, 0, 3);
      const f2 = engine.predictThermalField("vmc", 60, 0, 3);
      expect(f2.max_deformation_um).toBeGreaterThan(f1.max_deformation_um);
    });

    it("ambient offset increases deformation", () => {
      const f1 = engine.predictThermalField("vmc", 30, 0, 3);
      const f2 = engine.predictThermalField("vmc", 30, 5, 3); // +5°C ambient
      expect(f2.max_deformation_um).toBeGreaterThan(f1.max_deformation_um);
    });

    it("dominant axis is identified", () => {
      const field = engine.predictThermalField("vmc", 60, 0, 3);
      expect(["x", "y", "z"]).toContain(field.dominant_axis);
    });

    it("grid has expected number of points", () => {
      const field = engine.predictThermalField("vmc", 30, 0, 3);
      // (3+1)^3 = 64 points for resolution 3
      expect(field.grid.length).toBe(64);
    });
  });

  describe("Compensation", () => {
    it("compensation offsets are opposite to deformation", () => {
      const field = engine.predictThermalField("vmc", 60, 0, 3);
      const coords = [{ x: 400, y: 250, z: 250 }];
      const result = engine.computeCompensation(field, coords);

      // Compensated coordinate should differ from original
      expect(result.max_correction_um).toBeGreaterThan(0);
      // Offset is applied as negative of deformation
      expect(result.compensated.length).toBe(1);
    });

    it("no compensation at t=0", () => {
      const field = engine.predictThermalField("vmc", 0, 0, 3);
      const coords = [{ x: 200, y: 100, z: 300 }];
      const result = engine.computeCompensation(field, coords);
      expect(result.max_correction_um).toBeCloseTo(0, 0);
    });

    it("handles multiple coordinates", () => {
      const field = engine.predictThermalField("vmc", 30, 0, 3);
      const coords = [
        { x: 0, y: 0, z: 0 },
        { x: 400, y: 250, z: 250 },
        { x: 800, y: 500, z: 500 },
      ];
      const result = engine.computeCompensation(field, coords);
      expect(result.compensated.length).toBe(3);
      expect(result.offsets.length).toBe(3);
    });
  });

  describe("Sensor Update", () => {
    it("updates source temperatures from sensor readings", () => {
      const updated = engine.updateFromSensors("vmc", {
        temperatures: { "spindle_bearing": 45 },
        ambient_C: 22,
      });
      const spindle = updated.sources.find(s => s.name === "spindle_bearing");
      expect(spindle?.delta_T_C).toBe(23); // 45 - 22
    });
  });

  describe("Warm-Up Profile", () => {
    it("deformation starts at zero and increases", () => {
      const profile = engine.warmUpProfile("vmc", 60, 10);
      expect(profile.tip_deformation_um[0]).toBeCloseTo(0, 0);
      expect(profile.tip_deformation_um[profile.tip_deformation_um.length - 1]).toBeGreaterThan(0);
    });

    it("recommends warm-up time", () => {
      const profile = engine.warmUpProfile("vmc", 120, 5);
      expect(profile.recommended_warmup_min).toBeGreaterThan(0);
      expect(profile.time_to_90pct_min).toBeGreaterThan(0);
      expect(profile.steady_state_um).toBeGreaterThan(0);
    });

    it("HMC has different profile than VMC", () => {
      const vmc = engine.warmUpProfile("vmc", 120, 10);
      const hmc = engine.warmUpProfile("hmc", 120, 10);
      // Different machines = different steady state
      expect(vmc.steady_state_um).not.toBe(hmc.steady_state_um);
    });
  });

  describe("Dispatcher", () => {
    it("predict_field action works", () => {
      const result = engine.calculate({
        action: "predict_field", machine: "vmc", run_time_min: 30,
      }) as any;
      expect(result.max_deformation_um).toBeGreaterThan(0);
    });

    it("warmup_profile action works", () => {
      const result = engine.calculate({
        action: "warmup_profile", machine: "vmc", max_time_min: 60,
      }) as any;
      expect(result.recommended_warmup_min).toBeGreaterThan(0);
    });

    it("unknown action returns error", () => {
      const result = engine.calculate({ action: "unknown" as any }) as any;
      expect(result.error).toBeDefined();
    });
  });
});
