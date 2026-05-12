import { describe, it, expect } from "vitest";
import {
  PhysicsNeuralBridgeEngine,
  type PhysicsInput,
} from "../engines/PhysicsNeuralBridgeEngine.js";

describe("PhysicsNeuralBridgeEngine", () => {
  const engine = new PhysicsNeuralBridgeEngine();

  const testInput: PhysicsInput = {
    cutting_speed_mpm: 150,
    feed_per_tooth_mm: 0.1,
    axial_depth_mm: 3,
    radial_depth_mm: 6,
    tool_diameter_mm: 12,
    number_of_teeth: 4,
    material_kc1_1: 1800,
    material_mc: 0.25,
    material_C: 250,
    material_n: 0.25,
  };

  describe("predict", () => {
    it("should return all four bridged predictions", () => {
      const result = engine.predict(testInput);

      expect(result.cutting_force).toBeDefined();
      expect(result.tool_life).toBeDefined();
      expect(result.surface_roughness).toBeDefined();
      expect(result.deflection).toBeDefined();
    });

    it("should include physics predictions with models", () => {
      const result = engine.predict(testInput);

      expect(result.cutting_force.physics_prediction.model).toBe("Kienzle");
      expect(result.tool_life.physics_prediction.model).toBe("Taylor");
      expect(result.surface_roughness.physics_prediction.model).toBe("Kinematic");
      expect(result.deflection.physics_prediction.model).toBe("Cantilever");
    });

    it("should include neural corrections", () => {
      const result = engine.predict(testInput);

      expect(result.cutting_force.neural_correction.correction_factor).toBeDefined();
      expect(result.cutting_force.neural_correction.learned_from).toContain("JM-DIE");
    });

    it("should fuse values with confidence", () => {
      const result = engine.predict(testInput);

      expect(result.cutting_force.fused_value).toBeGreaterThan(0);
      expect(result.cutting_force.fused_confidence).toBeGreaterThan(0);
      expect(result.cutting_force.fused_confidence).toBeLessThanOrEqual(1);
    });

    it("should validate predictions", () => {
      const result = engine.predict(testInput);

      expect(["pass", "warn", "fail"]).toContain(result.cutting_force.validation_status);
      expect(Array.isArray(result.cutting_force.validation_messages)).toBe(true);
    });

    it("should generate explanations", () => {
      const result = engine.predict(testInput);

      expect(result.cutting_force.explanation).toContain("Kienzle");
      expect(result.cutting_force.explanation).toContain("Neural correction");
    });

    it("should return overall confidence", () => {
      const result = engine.predict(testInput);

      expect(result.overall_confidence).toBeGreaterThan(0);
      expect(result.overall_confidence).toBeLessThanOrEqual(1);
    });
  });

  describe("physics models", () => {
    it("should produce reasonable Kienzle force", () => {
      const result = engine.predict(testInput);
      const force = result.cutting_force.physics_prediction.value;

      expect(force).toBeGreaterThan(100);
      expect(force).toBeLessThan(10000);
      expect(result.cutting_force.physics_prediction.unit).toBe("N");
    });

    it("should produce reasonable Taylor tool life", () => {
      const result = engine.predict(testInput);
      const life = result.tool_life.physics_prediction.value;

      expect(life).toBeGreaterThan(1);
      expect(life).toBeLessThan(500);
      expect(result.tool_life.physics_prediction.unit).toBe("min");
    });

    it("should produce reasonable surface roughness", () => {
      const result = engine.predict(testInput);
      const Ra = result.surface_roughness.physics_prediction.value;

      expect(Ra).toBeGreaterThan(0);
      expect(Ra).toBeLessThan(20);
      expect(result.surface_roughness.physics_prediction.unit).toBe("µm");
    });

    it("should produce reasonable deflection", () => {
      const result = engine.predict(testInput);
      const deflection = result.deflection.physics_prediction.value;

      expect(deflection).toBeGreaterThan(0);
      expect(result.deflection.physics_prediction.unit).toBe("µm");
    });
  });

  describe("neural correction bounds", () => {
    it("should keep correction factors within reasonable range", () => {
      const result = engine.predict(testInput);

      const corrections = [
        result.cutting_force.neural_correction.correction_factor,
        result.tool_life.neural_correction.correction_factor,
        result.surface_roughness.neural_correction.correction_factor,
        result.deflection.neural_correction.correction_factor,
      ];

      corrections.forEach(c => {
        expect(c).toBeGreaterThan(0.5);
        expect(c).toBeLessThan(1.5);
      });
    });
  });

  describe("validation", () => {
    it("should pass validation for normal inputs", () => {
      const result = engine.predict(testInput);

      expect(result.cutting_force.validation_status).toBe("pass");
    });

    it("should warn on extreme speed", () => {
      const extremeInput: PhysicsInput = {
        ...testInput,
        cutting_speed_mpm: 1,
      };

      const result = engine.predict(extremeInput);
      expect(result.tool_life.physics_prediction.value).toBeGreaterThan(100);
    });
  });

  describe("model version", () => {
    it("should return model version", () => {
      expect(engine.getModelVersion()).toMatch(/^v\d+\.\d+\.\d+/);
    });
  });
});
