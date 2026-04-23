/**
 * WEDMProgramSafetyGateEngine tests
 * MS-P2.5-SAFETY/U-P2.5-SAFE-01
 */

import { describe, it, expect } from "vitest";
import {
  WEDMProgramSafetyGateEngine,
  wedmProgramSafetyGateEngine,
  type SafetyGateInput,
} from "../engines/WEDMProgramSafetyGateEngine.js";

describe("WEDMProgramSafetyGateEngine", () => {
  describe("evaluate()", () => {
    it("returns PASS when all components pass (S(x) = 1.0)", () => {
      const input: SafetyGateInput = {
        collision: { pass: true, collision_count: 0 },
        head_clearance: { pass: true, min_clearance_mm: 5.0, required_clearance_mm: 3.0 },
        flush: { pass: true, velocity_m_s: 1.5, required_velocity_m_s: 1.2, mode: "submerged" },
        thermal: { pass: true, max_temp_C: 450, limit_temp_C: 600 },
        dialect: { pass: true, expected_controller: "mitsubishi", detected_controller: "mitsubishi", confidence: 0.95 },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_um: 8.5, limit_um: 15.0 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.success).toBe(true);
      expect(result.verdict).toBe("pass");
      expect(result.sx_score).toBe(1.0);
      expect(result.hard_block).toBe(false);
      expect(result.can_emit).toBe(true);
      expect(result.components_evaluated).toHaveLength(7);
      expect(result.components_missing).toHaveLength(0);
    });

    it("returns HARD BLOCK when S(x) < 0.70", () => {
      const input: SafetyGateInput = {
        collision: { pass: true, collision_count: 0 },
        head_clearance: { pass: false, min_clearance_mm: 1.0, required_clearance_mm: 3.0 },
        flush: { pass: false, velocity_m_s: 0.3, required_velocity_m_s: 0.8, mode: "side_flush" },
        thermal: { pass: false, max_temp_C: 750, limit_temp_C: 600 },
        dialect: { pass: true, expected_controller: "sodick", detected_controller: "sodick", confidence: 0.92 },
        unit_tag: { pass: true, declared_unit: "imperial", code_unit: "G20", coordinate_scale_consistent: true },
        deflection: { pass: false, max_deflection_um: 25.0, limit_um: 15.0 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.verdict).toBe("hard_block");
      expect(result.sx_score).toBeLessThan(0.70);
      expect(result.hard_block).toBe(true);
      expect(result.can_emit).toBe(false);
    });

    it("returns HARD BLOCK when collision fails (mandatory)", () => {
      const input: SafetyGateInput = {
        collision: { pass: false, collision_count: 2, colliding_obstacles: ["fixture_clamp_1", "upper_head"] },
        head_clearance: { pass: true, min_clearance_mm: 5.0, required_clearance_mm: 3.0 },
        flush: { pass: true, velocity_m_s: 1.5, required_velocity_m_s: 1.2, mode: "submerged" },
        thermal: { pass: true, max_temp_C: 450, limit_temp_C: 600 },
        dialect: { pass: true, expected_controller: "fanuc", detected_controller: "fanuc", confidence: 0.98 },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_um: 8.5, limit_um: 15.0 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.verdict).toBe("hard_block");
      expect(result.hard_block).toBe(true);
      expect(result.mandatory_failures).toContain("collision");
      expect(result.can_emit).toBe(false);
    });

    it("returns HARD BLOCK when unit_tag fails (mandatory)", () => {
      const input: SafetyGateInput = {
        collision: { pass: true, collision_count: 0 },
        head_clearance: { pass: true, min_clearance_mm: 5.0, required_clearance_mm: 3.0 },
        flush: { pass: true, velocity_m_s: 1.5, required_velocity_m_s: 1.2, mode: "submerged" },
        thermal: { pass: true, max_temp_C: 450, limit_temp_C: 600 },
        dialect: { pass: true, expected_controller: "makino", detected_controller: "makino", confidence: 0.91 },
        unit_tag: { pass: false, declared_unit: "metric", code_unit: "G20", coordinate_scale_consistent: false },
        deflection: { pass: true, max_deflection_um: 8.5, limit_um: 15.0 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.verdict).toBe("hard_block");
      expect(result.hard_block).toBe(true);
      expect(result.mandatory_failures).toContain("unit_tag");
    });

    it("returns WARNING when 0.70 ≤ S(x) < 0.90", () => {
      const input: SafetyGateInput = {
        collision: { pass: true, collision_count: 0 },
        head_clearance: { pass: true, min_clearance_mm: 5.0, required_clearance_mm: 3.0 },
        flush: { pass: false, velocity_m_s: 0.4, required_velocity_m_s: 0.8, mode: "side_flush" },
        thermal: { pass: true, max_temp_C: 450, limit_temp_C: 600 },
        dialect: { pass: true, expected_controller: "agiecharmilles", detected_controller: "agiecharmilles", confidence: 0.89 },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_um: 8.5, limit_um: 15.0 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.verdict).toBe("warning");
      expect(result.sx_score).toBeGreaterThanOrEqual(0.70);
      expect(result.sx_score).toBeLessThan(0.90);
      expect(result.hard_block).toBe(false);
      expect(result.can_emit).toBe(true);
    });

    it("handles partial evaluation with missing components", () => {
      const input: SafetyGateInput = {
        collision: { pass: true, collision_count: 0 },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        dialect: { pass: true, expected_controller: "mitsubishi", detected_controller: "mitsubishi", confidence: 0.95 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.components_evaluated).toHaveLength(3);
      expect(result.components_missing).toContain("head_clearance");
      expect(result.components_missing).toContain("flush");
      expect(result.components_missing).toContain("thermal");
      expect(result.components_missing).toContain("deflection");
      expect(result.audit.partial_evaluation).toBe(true);
    });

    it("calculates correct weights", () => {
      const engine = new WEDMProgramSafetyGateEngine();
      const weights = engine.getWeights();

      expect(weights.collision).toBe(0.20);
      expect(weights.head_clearance).toBe(0.15);
      expect(weights.flush).toBe(0.15);
      expect(weights.thermal).toBe(0.15);
      expect(weights.dialect).toBe(0.10);
      expect(weights.unit_tag).toBe(0.10);
      expect(weights.deflection).toBe(0.15);

      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 10);
    });

    it("includes audit trail with timestamp and weights", () => {
      const input: SafetyGateInput = {
        collision: { pass: true, collision_count: 0 },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.audit.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.audit.weights_used.collision).toBe(0.20);
      expect(result.audit.threshold_used).toBe(0.70);
    });
  });

  describe("canEmit()", () => {
    it("returns true when S(x) >= 0.70 and no mandatory failures", () => {
      const input: SafetyGateInput = {
        collision: { pass: true, collision_count: 0 },
        head_clearance: { pass: true, min_clearance_mm: 5.0, required_clearance_mm: 3.0 },
        flush: { pass: true, velocity_m_s: 1.5, required_velocity_m_s: 1.2, mode: "submerged" },
        thermal: { pass: true, max_temp_C: 450, limit_temp_C: 600 },
        dialect: { pass: true, expected_controller: "mitsubishi", detected_controller: "mitsubishi", confidence: 0.95 },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_um: 8.5, limit_um: 15.0 },
      };

      expect(wedmProgramSafetyGateEngine.canEmit(input)).toBe(true);
    });

    it("returns false when collision fails", () => {
      const input: SafetyGateInput = {
        collision: { pass: false, collision_count: 1 },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
      };

      expect(wedmProgramSafetyGateEngine.canEmit(input)).toBe(false);
    });
  });

  describe("getScore()", () => {
    it("returns correct S(x) score", () => {
      const input: SafetyGateInput = {
        collision: { pass: true, collision_count: 0 },
        head_clearance: { pass: true, min_clearance_mm: 5.0, required_clearance_mm: 3.0 },
        flush: { pass: true, velocity_m_s: 1.5, required_velocity_m_s: 1.2, mode: "submerged" },
        thermal: { pass: true, max_temp_C: 450, limit_temp_C: 600 },
        dialect: { pass: true, expected_controller: "mitsubishi", detected_controller: "mitsubishi", confidence: 0.95 },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_um: 8.5, limit_um: 15.0 },
      };

      expect(wedmProgramSafetyGateEngine.getScore(input)).toBe(1.0);
    });
  });

  describe("getThresholds()", () => {
    it("returns correct threshold values", () => {
      const thresholds = wedmProgramSafetyGateEngine.getThresholds();

      expect(thresholds.pass).toBe(0.90);
      expect(thresholds.warn).toBe(0.70);
      expect(thresholds.hard_block).toBe(0.70);
    });
  });
});
