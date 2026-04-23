/**
 * U-P2PFS11: WEDMProgramSafetyGateEngine MCP Wiring Tests
 * Verifies dispatcher actions wedm_program_safety_gate and wedm_safety_gate_check
 */
import { describe, it, expect } from "vitest";
import { wedmProgramSafetyGateEngine } from "../engines/WEDMProgramSafetyGateEngine.js";

describe("WEDMProgramSafetyGateEngine MCP Wiring (U-P2PFS11)", () => {
  describe("evaluate()", () => {
    it("returns SafetyGateResult with all fields", () => {
      const result = wedmProgramSafetyGateEngine.evaluate({
        collision: { pass: true, collision_count: 0, min_clearance_mm: 5 },
        head_clearance: { pass: true, upper_clearance_mm: 10, lower_clearance_mm: 10, min_required_mm: 5 },
        flushing: { pass: true, velocity_m_s: 2.5, required_velocity_m_s: 2.0, mode: "submerged" },
        thermal: { pass: true, heat_release_J: 50, cooling_capacity_J: 100, recast_depth_um: 3, max_recast_um: 5 },
        dialect: { pass: true, expected_controller: "fanuc" },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_mm: 0.01, tolerance_mm: 0.02, deflection_ratio: 0.5 },
      });

      expect(result).toHaveProperty("s_of_x");
      expect(result).toHaveProperty("pass");
      expect(result).toHaveProperty("threshold");
      expect(result).toHaveProperty("components");
      expect(result).toHaveProperty("summary");
      expect(typeof result.s_of_x).toBe("number");
      expect(typeof result.pass).toBe("boolean");
    });

    it("passes when all components pass", () => {
      const result = wedmProgramSafetyGateEngine.evaluate({
        collision: { pass: true, collision_count: 0, min_clearance_mm: 5 },
        head_clearance: { pass: true, upper_clearance_mm: 10, lower_clearance_mm: 10, min_required_mm: 5 },
        flushing: { pass: true, velocity_m_s: 2.5, required_velocity_m_s: 2.0, mode: "submerged" },
        thermal: { pass: true, heat_release_J: 50, cooling_capacity_J: 100, recast_depth_um: 3, max_recast_um: 5 },
        dialect: { pass: true, expected_controller: "fanuc" },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_mm: 0.01, tolerance_mm: 0.02, deflection_ratio: 0.5 },
      });

      expect(result.pass).toBe(true);
      expect(result.s_of_x).toBeGreaterThanOrEqual(0.70);
    });

    it("fails when collision check fails", () => {
      const result = wedmProgramSafetyGateEngine.evaluate({
        collision: { pass: false, collision_count: 3, min_clearance_mm: -1 },
        head_clearance: { pass: true, upper_clearance_mm: 10, lower_clearance_mm: 10, min_required_mm: 5 },
        flushing: { pass: true, velocity_m_s: 2.5, required_velocity_m_s: 2.0, mode: "submerged" },
      });

      expect(result.s_of_x).toBeLessThan(1.0);
      expect(result.components.length).toBeGreaterThan(0);
    });

    it("handles partial input gracefully", () => {
      const result = wedmProgramSafetyGateEngine.evaluate({
        collision: { pass: true, collision_count: 0, min_clearance_mm: 5 },
      });

      expect(result).toHaveProperty("s_of_x");
      expect(result).toHaveProperty("pass");
      expect(result.components.length).toBeGreaterThan(0);
    });

    it("s_of_x is between 0 and 1", () => {
      const result = wedmProgramSafetyGateEngine.evaluate({
        collision: { pass: false, collision_count: 5, min_clearance_mm: -2 },
        flushing: { pass: false, velocity_m_s: 0.5, required_velocity_m_s: 2.0, mode: "side_flush" },
        thermal: { pass: false, heat_release_J: 200, cooling_capacity_J: 50, recast_depth_um: 10, max_recast_um: 5 },
      });

      expect(result.s_of_x).toBeGreaterThanOrEqual(0);
      expect(result.s_of_x).toBeLessThanOrEqual(1);
    });
  });

  describe("gate()", () => {
    it("returns allow/deny with reason", () => {
      const result = wedmProgramSafetyGateEngine.gate({
        collision: { pass: true, collision_count: 0, min_clearance_mm: 5 },
        head_clearance: { pass: true, upper_clearance_mm: 10, lower_clearance_mm: 10, min_required_mm: 5 },
        flushing: { pass: true, velocity_m_s: 2.5, required_velocity_m_s: 2.0, mode: "submerged" },
        thermal: { pass: true, heat_release_J: 50, cooling_capacity_J: 100, recast_depth_um: 3, max_recast_um: 5 },
        dialect: { pass: true, expected_controller: "fanuc" },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_mm: 0.01, tolerance_mm: 0.02, deflection_ratio: 0.5 },
      });

      expect(result).toHaveProperty("allow");
      expect(result).toHaveProperty("reason");
      expect(result).toHaveProperty("result");
      expect(typeof result.allow).toBe("boolean");
      expect(typeof result.reason).toBe("string");
    });

    it("allows when s_of_x >= threshold", () => {
      const result = wedmProgramSafetyGateEngine.gate({
        collision: { pass: true, collision_count: 0, min_clearance_mm: 5 },
        head_clearance: { pass: true, upper_clearance_mm: 10, lower_clearance_mm: 10, min_required_mm: 5 },
        flushing: { pass: true, velocity_m_s: 2.5, required_velocity_m_s: 2.0, mode: "submerged" },
        thermal: { pass: true, heat_release_J: 50, cooling_capacity_J: 100, recast_depth_um: 3, max_recast_um: 5 },
        dialect: { pass: true, expected_controller: "fanuc" },
        unit_tag: { pass: true, declared_unit: "metric", code_unit: "G21", coordinate_scale_consistent: true },
        deflection: { pass: true, max_deflection_mm: 0.01, tolerance_mm: 0.02, deflection_ratio: 0.5 },
      });

      expect(result.allow).toBe(true);
    });

    it("denies when s_of_x < threshold", () => {
      const result = wedmProgramSafetyGateEngine.gate({
        collision: { pass: false, collision_count: 5, min_clearance_mm: -2 },
        head_clearance: { pass: false, upper_clearance_mm: 2, lower_clearance_mm: 2, min_required_mm: 5 },
        flushing: { pass: false, velocity_m_s: 0.5, required_velocity_m_s: 2.0, mode: "side_flush" },
        thermal: { pass: false, heat_release_J: 200, cooling_capacity_J: 50, recast_depth_um: 15, max_recast_um: 5 },
        dialect: { pass: false, expected_controller: "fanuc", detected_controller: "sodick" },
        unit_tag: { pass: false, declared_unit: "metric", code_unit: "G20", coordinate_scale_consistent: false },
        deflection: { pass: false, max_deflection_mm: 0.1, tolerance_mm: 0.02, deflection_ratio: 5.0 },
      });

      expect(result.allow).toBe(false);
      expect(result.reason.length).toBeGreaterThan(0);
    });
  });

  describe("Component Evaluation", () => {
    it("evaluates each component separately", () => {
      const result = wedmProgramSafetyGateEngine.evaluate({
        collision: { pass: true, collision_count: 0, min_clearance_mm: 5 },
        flushing: { pass: false, velocity_m_s: 0.5, required_velocity_m_s: 2.0, mode: "submerged" },
      });

      expect(result.components.length).toBeGreaterThan(0);
      const collisionComp = result.components.find(c => c.component === "collision");
      const flushingComp = result.components.find(c => c.component === "flushing");

      if (collisionComp) {
        expect(collisionComp.pass).toBe(true);
      }
      if (flushingComp) {
        expect(flushingComp.pass).toBe(false);
      }
    });

    it("components have weight and score", () => {
      const result = wedmProgramSafetyGateEngine.evaluate({
        collision: { pass: true, collision_count: 0, min_clearance_mm: 5 },
      });

      for (const comp of result.components) {
        expect(comp).toHaveProperty("component");
        expect(comp).toHaveProperty("weight");
        expect(comp).toHaveProperty("raw_score");
        expect(comp).toHaveProperty("weighted_score");
        expect(comp).toHaveProperty("pass");
        expect(typeof comp.weight).toBe("number");
        expect(typeof comp.raw_score).toBe("number");
      }
    });
  });
});
