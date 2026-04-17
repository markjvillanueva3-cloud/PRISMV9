/**
 * Tests for WEDMProgramSafetyGateEngine
 * MS-P2.5-SAFETY/U-P2.5-SAFE-01
 *
 * Includes 10 deliberately-unsafe inputs that MUST all be blocked
 */

import { describe, it, expect } from "vitest";
import {
  wedmProgramSafetyGateEngine,
  WEDMProgramSafetyGateEngine,
  type SafetyGateInput,
} from "../engines/WEDMProgramSafetyGateEngine.js";

describe("WEDMProgramSafetyGateEngine", () => {
  describe("S(x) Calculation", () => {
    it("calculates S(x) = 1.0 when all components pass", () => {
      const input = wedmProgramSafetyGateEngine.createFullPassingInput();
      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.pass).toBe(true);
      expect(result.s_of_x).toBe(1.0);
      expect(result.hard_block).toBe(false);
      expect(result.passing_components).toBe(7);
      expect(result.failing_components).toBe(0);
    });

    it("uses correct component weights", () => {
      const weights = wedmProgramSafetyGateEngine.getComponentWeights();

      expect(weights.collision).toBe(0.20);
      expect(weights.head_clearance).toBe(0.15);
      expect(weights.flushing).toBe(0.15);
      expect(weights.thermal).toBe(0.15);
      expect(weights.dialect).toBe(0.10);
      expect(weights.unit_tag).toBe(0.10);
      expect(weights.deflection).toBe(0.15);

      // Weights must sum to 1.0
      const sum = Object.values(weights).reduce((a, b) => a + b, 0);
      expect(sum).toBeCloseTo(1.0, 5);
    });

    it("returns S(x) breakdown with all components", () => {
      const input = wedmProgramSafetyGateEngine.createFullPassingInput();
      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.components.length).toBe(7);
      expect(result.components.map((c) => c.component)).toEqual([
        "collision",
        "head_clearance",
        "flushing",
        "thermal",
        "dialect",
        "unit_tag",
        "deflection",
      ]);
    });
  });

  describe("Threshold Enforcement", () => {
    it("HARD BLOCKS when S(x) < 0.70", () => {
      // All components missing → S(x) ≈ 0.185 (only deflection partial credit)
      const result = wedmProgramSafetyGateEngine.evaluate({});

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.s_of_x).toBeLessThan(0.70);
      expect(result.summary).toContain("HARD BLOCK");
    });

    it("passes when S(x) >= 0.70", () => {
      const input = wedmProgramSafetyGateEngine.createFullPassingInput();
      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.pass).toBe(true);
      expect(result.hard_block).toBe(false);
      expect(result.s_of_x).toBeGreaterThanOrEqual(0.70);
    });

    it("custom threshold can be configured", () => {
      const strictEngine = new WEDMProgramSafetyGateEngine(0.95);
      const input = wedmProgramSafetyGateEngine.createFullPassingInput();

      // Remove one component to get S(x) < 0.95
      delete (input as any).collision;

      const result = strictEngine.evaluate(input);
      expect(result.threshold).toBe(0.95);
      expect(result.s_of_x).toBeLessThan(0.95);
      expect(result.hard_block).toBe(true);
    });
  });

  describe("10 Deliberately-Unsafe Inputs (component failure detection)", () => {
    it("DETECTS: Collision (component fails, adds failure reason)", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        collision: { pass: false, collision_count: 3, min_clearance_mm: -2.5 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const collisionComp = result.components.find((c) => c.component === "collision");
      expect(collisionComp?.pass).toBe(false);
      expect(collisionComp?.weighted_score).toBe(0);
      expect(result.failure_reasons.some((r) => r.includes("collision"))).toBe(true);
    });

    it("DETECTS: Upper head clearance insufficient", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        head_clearance: { pass: false, upper_clearance_mm: 1.5, lower_clearance_mm: 4.0, min_required_mm: 3.0 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "head_clearance");
      expect(comp?.pass).toBe(false);
      expect(result.failure_reasons.some((r) => r.includes("clearance"))).toBe(true);
    });

    it("DETECTS: Lower head clearance insufficient", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        head_clearance: { pass: false, upper_clearance_mm: 5.0, lower_clearance_mm: 1.0, min_required_mm: 3.0 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "head_clearance");
      expect(comp?.pass).toBe(false);
    });

    it("DETECTS: Flushing velocity inadequate", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        flushing: { pass: false, velocity_m_s: 0.3, required_velocity_m_s: 0.8, mode: "submerged" },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "flushing");
      expect(comp?.pass).toBe(false);
      expect(result.failure_reasons.some((r) => r.includes("Flushing"))).toBe(true);
    });

    it("DETECTS: Thermal overload", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        thermal: { pass: false, heat_release_J: 200, cooling_capacity_J: 100, recast_depth_um: 5, max_recast_um: 10 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "thermal");
      expect(comp?.pass).toBe(false);
      expect(result.failure_reasons.some((r) => r.includes("Thermal"))).toBe(true);
    });

    it("DETECTS: Excessive recast depth", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        thermal: { pass: false, heat_release_J: 50, cooling_capacity_J: 100, recast_depth_um: 25, max_recast_um: 10 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "thermal");
      expect(comp?.pass).toBe(false);
      expect(result.failure_reasons.some((r) => r.includes("Recast"))).toBe(true);
    });

    it("DETECTS: Controller dialect mismatch", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        dialect: { pass: false, expected_controller: "mitsubishi_fa", detected_controller: "sodick_aq", mismatched_codes: ["M6", "M50"] },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "dialect");
      expect(comp?.pass).toBe(false);
      expect(result.failure_reasons.some((r) => r.includes("dialect"))).toBe(true);
    });

    it("DETECTS: Missing G20/G21 unit declaration", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        unit_tag: { pass: false, declared_unit: "metric", code_unit: "missing", coordinate_scale_consistent: false },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "unit_tag");
      expect(comp?.pass).toBe(false);
      expect(result.failure_reasons.some((r) => r.includes("G20/G21"))).toBe(true);
    });

    it("DETECTS: Unit mismatch (metric declared, G20 in code)", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        unit_tag: { pass: false, declared_unit: "metric", code_unit: "G20", coordinate_scale_consistent: false },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "unit_tag");
      expect(comp?.pass).toBe(false);
      expect(result.failure_reasons.some((r) => r.includes("Unit mismatch"))).toBe(true);
    });

    it("DETECTS: Wire deflection exceeds tolerance", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        deflection: { pass: false, max_deflection_mm: 0.015, tolerance_mm: 0.005, deflection_ratio: 3.0 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const comp = result.components.find((c) => c.component === "deflection");
      expect(comp?.pass).toBe(false);
      expect(result.failure_reasons.some((r) => r.includes("deflection"))).toBe(true);
    });
  });

  describe("Combined Failures BLOCK (S(x) < 0.70)", () => {
    it("HARD BLOCKS when collision + head_clearance + unit_tag all fail", () => {
      const input: SafetyGateInput = {
        collision: { pass: false, collision_count: 2, min_clearance_mm: -1.0 },
        head_clearance: { pass: false, upper_clearance_mm: 1.0, lower_clearance_mm: 1.0, min_required_mm: 3.0 },
        unit_tag: { pass: false, declared_unit: "metric", code_unit: "missing", coordinate_scale_consistent: false },
        // Missing flushing, thermal, dialect → partial credit
        // Missing deflection → soft pass
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      // S(x) should be < 0.70 with multiple critical failures
      expect(result.s_of_x).toBeLessThan(0.70);
      expect(result.hard_block).toBe(true);
    });

    it("HARD BLOCKS when 4+ components fail", () => {
      const input: SafetyGateInput = {
        collision: { pass: false, collision_count: 1, min_clearance_mm: 0 },
        head_clearance: { pass: false, upper_clearance_mm: 2.0, lower_clearance_mm: 1.0, min_required_mm: 3.0 },
        flushing: { pass: false, velocity_m_s: 0.2, required_velocity_m_s: 0.8, mode: "submerged" },
        thermal: { pass: false, heat_release_J: 150, cooling_capacity_J: 100, recast_depth_um: 15, max_recast_um: 10 },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.failing_components).toBeGreaterThanOrEqual(4);
      expect(result.s_of_x).toBeLessThan(0.70);
      expect(result.hard_block).toBe(true);
    });
  });

  describe("Multiple Failures", () => {
    it("lists all failure reasons when multiple components fail", () => {
      const input: SafetyGateInput = {
        collision: { pass: false, collision_count: 2, min_clearance_mm: -1.0 },
        head_clearance: { pass: false, upper_clearance_mm: 1.0, lower_clearance_mm: 1.0, min_required_mm: 3.0 },
        unit_tag: { pass: false, declared_unit: "metric", code_unit: "missing", coordinate_scale_consistent: false },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.hard_block).toBe(true);
      expect(result.failing_components).toBeGreaterThanOrEqual(3);
      expect(result.failure_reasons.length).toBeGreaterThanOrEqual(3);
    });

    it("S(x) reflects partial scores from failing components", () => {
      // Partial flushing velocity → partial credit
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        flushing: { pass: false, velocity_m_s: 0.6, required_velocity_m_s: 0.8, mode: "submerged" },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      // Flushing component should have partial score
      const flushingComp = result.components.find((c) => c.component === "flushing");
      expect(flushingComp?.raw_score).toBeCloseTo(0.75, 1); // 0.6/0.8 = 0.75
    });
  });

  describe("Operator Override", () => {
    it("allows override when all failing components acknowledged", () => {
      // Fail collision (0.20) + head_clearance (0.15) + flushing (0.10) = 0.45 weight lost
      // S(x) = 1.0 - 0.45 = 0.55 < 0.70 threshold, triggering hard block
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
        collision: { pass: false, collision_count: 1, min_clearance_mm: -0.1 },
        head_clearance: { pass: false, upper_clearance_mm: 1.0, lower_clearance_mm: 0.5, min_required_mm: 3.0 },
        flushing: { pass: false, velocity_m_s: 0.5, required_velocity_m_s: 0.8, mode: "side_flush" },
        operator_override: {
          enabled: true,
          acknowledged_risks: ["collision", "head_clearance", "flushing"],
          operator_id: "senior_operator_001",
          timestamp: new Date().toISOString(),
        },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.pass).toBe(true);
      expect(result.operator_override_used).toBe(true);
      expect(result.hard_block).toBe(false);
    });

    it("still blocks if not all failing components acknowledged", () => {
      const input: SafetyGateInput = {
        collision: { pass: false, collision_count: 1, min_clearance_mm: -0.5 },
        unit_tag: { pass: false, declared_unit: "metric", code_unit: "missing", coordinate_scale_consistent: false },
        operator_override: {
          enabled: true,
          acknowledged_risks: ["collision"], // Missing unit_tag acknowledgement
          operator_id: "operator_002",
          timestamp: new Date().toISOString(),
        },
      };

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.pass).toBe(false);
      expect(result.hard_block).toBe(true);
      expect(result.operator_override_used).toBe(false);
    });
  });

  describe("Gate Function", () => {
    it("returns allow=true for safe programs", () => {
      const input = wedmProgramSafetyGateEngine.createFullPassingInput();
      const gate = wedmProgramSafetyGateEngine.gate(input);

      expect(gate.allow).toBe(true);
      expect(gate.reason).toContain("PASS");
    });

    it("returns allow=false for unsafe programs", () => {
      const gate = wedmProgramSafetyGateEngine.gate({});

      expect(gate.allow).toBe(false);
      expect(gate.reason).toContain("HARD BLOCK");
    });
  });

  describe("Missing Components", () => {
    it("treats missing collision as failure", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
      };
      delete (input as any).collision;

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const collisionComp = result.components.find((c) => c.component === "collision");
      expect(collisionComp?.pass).toBe(false);
      expect(collisionComp?.failure_reason).toContain("missing");
    });

    it("treats missing unit_tag as failure", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
      };
      delete (input as any).unit_tag;

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const unitComp = result.components.find((c) => c.component === "unit_tag");
      expect(unitComp?.pass).toBe(false);
      expect(unitComp?.failure_reason).toContain("25.4×");
    });

    it("gives partial credit to missing deflection (soft check)", () => {
      const input: SafetyGateInput = {
        ...wedmProgramSafetyGateEngine.createFullPassingInput(),
      };
      delete (input as any).deflection;

      const result = wedmProgramSafetyGateEngine.evaluate(input);

      const deflectionComp = result.components.find((c) => c.component === "deflection");
      expect(deflectionComp?.raw_score).toBeCloseTo(0.7, 1);
      expect(deflectionComp?.pass).toBe(true); // Soft pass
    });
  });

  describe("Summary Messages", () => {
    it("includes S(x) value in summary", () => {
      const input = wedmProgramSafetyGateEngine.createFullPassingInput();
      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.summary).toContain("S(x)");
      expect(result.summary).toContain("1.000");
    });

    it("includes component count in pass summary", () => {
      const input = wedmProgramSafetyGateEngine.createFullPassingInput();
      const result = wedmProgramSafetyGateEngine.evaluate(input);

      expect(result.summary).toContain("7/7");
    });

    it("includes failing count in block summary", () => {
      const result = wedmProgramSafetyGateEngine.evaluate({});

      expect(result.summary).toContain("failing");
      expect(result.summary).toContain("CANNOT emit");
    });
  });
});
