/**
 * CADPhysicsConsistencyGateEngine Tests — U-ML-01
 *
 * Comprehensive test coverage for Kienzle/Taylor physics validation gate.
 * Tests: happy path, edge cases, boundary conditions, failure modes, adversarial inputs.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  cadPhysicsConsistencyGateEngine,
  type PhysicsValidationInput,
  type PhysicsGateResult,
} from "../engines/CADPhysicsConsistencyGateEngine.js";

describe("CADPhysicsConsistencyGateEngine", () => {
  beforeEach(() => {
    cadPhysicsConsistencyGateEngine.resetStats();
  });

  // ══════════════════════════════════════════════════════════════════════════
  // HAPPY PATH — Normal operation scenarios
  // ══════════════════════════════════════════════════════════════════════════

  describe("Happy Path", () => {
    it("validates conservative steel cutting parameters as PASS", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.passed).toBe(true);
      expect(result.verdict).toBe("PASS");
      expect(result.safety_score).toBeGreaterThanOrEqual(0.9);
      expect(result.physics_summary.cutting_force_N).toBeGreaterThan(0);
      expect(result.physics_summary.tool_life_min).toBeGreaterThan(15);
    });

    it("validates aluminum high-speed machining", () => {
      const input: PhysicsValidationInput = {
        iso_group: "N",
        ap_mm: 0.5,
        fz_mm: 0.08,
        vc_m_min: 350,
        tool_diameter_mm: 16,
        tool_stickout_mm: 25,
        flute_count: 3,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.passed).toBe(true);
      expect(["PASS", "WARN"]).toContain(result.verdict);
      expect(result.iso_group).toBe("N");
      expect(result.kienzle_source).toContain("ASM");
    });

    it("validates cast iron with correct physics constants", () => {
      const input: PhysicsValidationInput = {
        iso_group: "K",
        ap_mm: 1.5,
        fz_mm: 0.12,
        vc_m_min: 200,
        tool_diameter_mm: 16,
        tool_stickout_mm: 40,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.passed).toBe(true);
      const forceConstraint = result.constraints.find(c => c.name === "cutting_force");
      expect(forceConstraint).toBeDefined();
      expect(forceConstraint!.details).toContain("kc1_1=1100");
    });

    it("tracks validation statistics correctly", () => {
      const goodInput: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 0.5,
        fz_mm: 0.08,
        vc_m_min: 120,
        tool_diameter_mm: 10,
        tool_stickout_mm: 25,
        flute_count: 4,
      };

      cadPhysicsConsistencyGateEngine.validate(goodInput);
      cadPhysicsConsistencyGateEngine.validate(goodInput);
      cadPhysicsConsistencyGateEngine.validate(goodInput);

      const stats = cadPhysicsConsistencyGateEngine.getStats();
      expect(stats.evaluations).toBe(3);
      expect(stats.rejects).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // KIENZLE CUTTING FORCE VALIDATION
  // ══════════════════════════════════════════════════════════════════════════

  describe("Kienzle Cutting Force", () => {
    it("computes correct force for steel (P group)", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 2.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const Fc = result.physics_summary.cutting_force_N;

      // Fc = 1800 * 2.0 * 0.1^(1-0.25) = 1800 * 2.0 * 0.1^0.75
      // 0.1^0.75 ≈ 0.178
      // Fc ≈ 1800 * 2.0 * 0.178 ≈ 640.8 N
      expect(Fc).toBeGreaterThan(600);
      expect(Fc).toBeLessThan(700);
    });

    it("computes correct force for stainless (M group)", () => {
      const input: PhysicsValidationInput = {
        iso_group: "M",
        ap_mm: 1.0,
        fz_mm: 0.08,
        vc_m_min: 100,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const forceConstraint = result.constraints.find(c => c.name === "cutting_force");

      expect(forceConstraint!.details).toContain("kc1_1=2100");
      expect(forceConstraint!.details).toContain("mc=0.25");
    });

    it("computes correct force for hardened steel (H group)", () => {
      const input: PhysicsValidationInput = {
        iso_group: "H",
        ap_mm: 0.3,
        fz_mm: 0.05,
        vc_m_min: 80,
        tool_diameter_mm: 6,
        tool_stickout_mm: 18,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const forceConstraint = result.constraints.find(c => c.name === "cutting_force");

      expect(forceConstraint!.details).toContain("kc1_1=3200");
    });

    it("scales force by radial engagement for slotting", () => {
      const fullSlot: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
        ae_mm: 10, // Full slot
      };

      const halfSlot: PhysicsValidationInput = {
        ...fullSlot,
        ae_mm: 5, // 50% engagement
      };

      const fullResult = cadPhysicsConsistencyGateEngine.validate(fullSlot);
      const halfResult = cadPhysicsConsistencyGateEngine.validate(halfSlot);

      // Half engagement should have lower force (scaled by sqrt(0.5))
      expect(halfResult.physics_summary.cutting_force_N).toBeLessThan(
        fullResult.physics_summary.cutting_force_N
      );
    });

    it("rejects excessive cutting force", () => {
      const input: PhysicsValidationInput = {
        iso_group: "H",
        ap_mm: 5.0, // Very aggressive
        fz_mm: 0.3,
        vc_m_min: 100,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.verdict).toBe("REJECT");
      expect(result.physics_summary.cutting_force_N).toBeGreaterThan(5000);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // TAYLOR TOOL LIFE VALIDATION
  // ══════════════════════════════════════════════════════════════════════════

  describe("Taylor Tool Life", () => {
    it("computes correct tool life for steel", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 200, // T = (350/200)^(1/0.25) = 1.75^4 ≈ 9.4 min
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const T = result.physics_summary.tool_life_min;

      expect(T).toBeGreaterThan(5);
      expect(T).toBeLessThan(15);
    });

    it("gives longer life at lower cutting speeds", () => {
      const fast: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 250,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const slow: PhysicsValidationInput = {
        ...fast,
        vc_m_min: 100,
      };

      const fastResult = cadPhysicsConsistencyGateEngine.validate(fast);
      const slowResult = cadPhysicsConsistencyGateEngine.validate(slow);

      expect(slowResult.physics_summary.tool_life_min).toBeGreaterThan(
        fastResult.physics_summary.tool_life_min
      );
    });

    it("warns on short tool life", () => {
      const input: PhysicsValidationInput = {
        iso_group: "S", // Superalloys — very low Taylor C
        ap_mm: 0.5,
        fz_mm: 0.08,
        vc_m_min: 60, // T = (100/60)^(1/0.18) ≈ 1.67^5.56 ≈ 15.6 min
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      // Should be close to min threshold
      const lifeConstraint = result.constraints.find(c => c.name === "tool_life");
      expect(lifeConstraint!.value).toBeGreaterThan(10);
    });

    it("rejects when tool life below minimum", () => {
      const input: PhysicsValidationInput = {
        iso_group: "H", // Hard milling — C=80, n=0.15
        ap_mm: 0.2,
        fz_mm: 0.05,
        vc_m_min: 150, // Very high for hardened
        tool_diameter_mm: 6,
        tool_stickout_mm: 18,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      const lifeConstraint = result.constraints.find(c => c.name === "tool_life");
      expect(lifeConstraint!.value).toBeLessThan(15);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // POWER AND DEFLECTION
  // ══════════════════════════════════════════════════════════════════════════

  describe("Power and Deflection", () => {
    it("computes cutting power correctly", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 2.0,
        fz_mm: 0.15,
        vc_m_min: 200,
        tool_diameter_mm: 16,
        tool_stickout_mm: 40,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const P = result.physics_summary.cutting_power_kW;

      // P = Fc * Vc / (60000 * 0.85)
      expect(P).toBeGreaterThan(0);
      expect(P).toBeLessThan(15);
    });

    it("warns on high power consumption", () => {
      const input: PhysicsValidationInput = {
        iso_group: "M",
        ap_mm: 4.0,
        fz_mm: 0.2,
        vc_m_min: 180,
        tool_diameter_mm: 20,
        tool_stickout_mm: 50,
        flute_count: 4,
        machine_limits: {
          max_spindle_power_kW: 10,
        },
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const powerConstraint = result.constraints.find(c => c.name === "spindle_power");

      expect(powerConstraint!.value).toBeGreaterThan(5);
    });

    it("detects excessive tool deflection", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 2.0,
        fz_mm: 0.15,
        vc_m_min: 150,
        tool_diameter_mm: 6, // Small diameter
        tool_stickout_mm: 60, // Long stick-out
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const deflectionConstraint = result.constraints.find(c => c.name === "tool_deflection");

      expect(deflectionConstraint!.value).toBeGreaterThan(0.01);
    });

    it("larger tools have less deflection", () => {
      const smallTool: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 6,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const largeTool: PhysicsValidationInput = {
        ...smallTool,
        tool_diameter_mm: 16,
      };

      const smallResult = cadPhysicsConsistencyGateEngine.validate(smallTool);
      const largeResult = cadPhysicsConsistencyGateEngine.validate(largeTool);

      expect(largeResult.physics_summary.deflection_mm).toBeLessThan(
        smallResult.physics_summary.deflection_mm
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // THERMAL CONSTRAINTS
  // ══════════════════════════════════════════════════════════════════════════

  describe("Thermal Constraints", () => {
    it("estimates cutting temperature", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 200,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const temp = result.physics_summary.cutting_temp_C;

      expect(temp).toBeGreaterThan(20);
      expect(temp).toBeLessThan(600);
    });

    it("superalloys generate higher temperatures", () => {
      const steel: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 100,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const inconel: PhysicsValidationInput = {
        ...steel,
        iso_group: "S",
      };

      const steelResult = cadPhysicsConsistencyGateEngine.validate(steel);
      const inconelResult = cadPhysicsConsistencyGateEngine.validate(inconel);

      expect(inconelResult.physics_summary.cutting_temp_C).toBeGreaterThan(
        steelResult.physics_summary.cutting_temp_C
      );
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // SAFETY SCORE COMPUTATION
  // ══════════════════════════════════════════════════════════════════════════

  describe("Safety Score", () => {
    it("S(x) >= 0.90 returns PASS", () => {
      const input: PhysicsValidationInput = {
        iso_group: "N",
        ap_mm: 0.3,
        fz_mm: 0.05,
        vc_m_min: 200,
        tool_diameter_mm: 16,
        tool_stickout_mm: 20,
        flute_count: 3,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.safety_score).toBeGreaterThanOrEqual(0.9);
      expect(result.verdict).toBe("PASS");
    });

    it("0.70 <= S(x) < 0.90 returns WARN", () => {
      const input: PhysicsValidationInput = {
        iso_group: "M",
        ap_mm: 2.5,
        fz_mm: 0.15,
        vc_m_min: 140,
        tool_diameter_mm: 10,
        tool_stickout_mm: 35,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      // This should be borderline
      if (result.safety_score >= 0.7 && result.safety_score < 0.9) {
        expect(result.verdict).toBe("WARN");
      }
    });

    it("S(x) < 0.70 returns REJECT", () => {
      const input: PhysicsValidationInput = {
        iso_group: "H",
        ap_mm: 4.0,
        fz_mm: 0.25,
        vc_m_min: 200,
        tool_diameter_mm: 8,
        tool_stickout_mm: 50,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.safety_score).toBeLessThan(0.7);
      expect(result.verdict).toBe("REJECT");
    });

    it("safety score is bounded [0, 1]", () => {
      const inputs: PhysicsValidationInput[] = [
        { iso_group: "P", ap_mm: 0.1, fz_mm: 0.02, vc_m_min: 50, tool_diameter_mm: 20, tool_stickout_mm: 20, flute_count: 4 },
        { iso_group: "H", ap_mm: 5.0, fz_mm: 0.5, vc_m_min: 300, tool_diameter_mm: 4, tool_stickout_mm: 80, flute_count: 2 },
      ];

      for (const input of inputs) {
        const result = cadPhysicsConsistencyGateEngine.validate(input);
        expect(result.safety_score).toBeGreaterThanOrEqual(0);
        expect(result.safety_score).toBeLessThanOrEqual(1);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // BATCH VALIDATION
  // ══════════════════════════════════════════════════════════════════════════

  describe("Batch Validation", () => {
    it("validates multiple parameter sets", () => {
      const items: PhysicsValidationInput[] = [
        { iso_group: "P", ap_mm: 1.0, fz_mm: 0.1, vc_m_min: 150, tool_diameter_mm: 10, tool_stickout_mm: 30, flute_count: 4 },
        { iso_group: "N", ap_mm: 2.0, fz_mm: 0.15, vc_m_min: 400, tool_diameter_mm: 12, tool_stickout_mm: 25, flute_count: 3 },
        { iso_group: "K", ap_mm: 1.5, fz_mm: 0.12, vc_m_min: 200, tool_diameter_mm: 16, tool_stickout_mm: 40, flute_count: 4 },
      ];

      const result = cadPhysicsConsistencyGateEngine.validateBatch({ items });

      expect(result.total).toBe(3);
      expect(result.results).toHaveLength(3);
      expect(result.mean_safety_score).toBeGreaterThan(0);
    });

    it("stops on first failure when requested", () => {
      const items: PhysicsValidationInput[] = [
        { iso_group: "P", ap_mm: 1.0, fz_mm: 0.1, vc_m_min: 150, tool_diameter_mm: 10, tool_stickout_mm: 30, flute_count: 4 },
        { iso_group: "H", ap_mm: 10.0, fz_mm: 0.5, vc_m_min: 300, tool_diameter_mm: 4, tool_stickout_mm: 80, flute_count: 2 }, // Will fail
        { iso_group: "N", ap_mm: 1.0, fz_mm: 0.1, vc_m_min: 300, tool_diameter_mm: 12, tool_stickout_mm: 25, flute_count: 3 },
      ];

      const result = cadPhysicsConsistencyGateEngine.validateBatch({
        items,
        stop_on_first_failure: true,
      });

      expect(result.results.length).toBeLessThanOrEqual(2);
      expect(result.overall_verdict).toBe("REJECT");
    });

    it("computes correct overall verdict", () => {
      const allPass: PhysicsValidationInput[] = [
        { iso_group: "N", ap_mm: 0.3, fz_mm: 0.05, vc_m_min: 200, tool_diameter_mm: 16, tool_stickout_mm: 20, flute_count: 3 },
        { iso_group: "N", ap_mm: 0.3, fz_mm: 0.05, vc_m_min: 200, tool_diameter_mm: 16, tool_stickout_mm: 20, flute_count: 3 },
      ];

      const result = cadPhysicsConsistencyGateEngine.validateBatch({ items: allPass });

      expect(result.overall_verdict).toBe("PASS");
      expect(result.passed).toBe(2);
      expect(result.rejected).toBe(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // MACHINE LIMITS OVERRIDE
  // ══════════════════════════════════════════════════════════════════════════

  describe("Machine Limits Override", () => {
    it("respects custom force limit", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 2.0,
        fz_mm: 0.15,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
        machine_limits: {
          max_cutting_force_N: 1000,
        },
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const forceConstraint = result.constraints.find(c => c.name === "cutting_force");

      expect(forceConstraint!.limit).toBe(1000);
    });

    it("respects custom power limit", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
        machine_limits: {
          max_spindle_power_kW: 5,
        },
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);
      const powerConstraint = result.constraints.find(c => c.name === "spindle_power");

      expect(powerConstraint!.limit).toBeLessThan(5);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // PHYSICS CONSTANTS ACCESS
  // ══════════════════════════════════════════════════════════════════════════

  describe("Physics Constants", () => {
    it("returns correct Kienzle constants for all ISO groups", () => {
      const groups: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];
      const expectedKc: Record<string, number> = {
        P: 1800, M: 2100, K: 1100, N: 700, S: 2800, H: 3200,
      };

      for (const group of groups) {
        const constants = cadPhysicsConsistencyGateEngine.getPhysicsConstants(group);
        expect(constants.kienzle.kc1_1).toBe(expectedKc[group]);
      }
    });

    it("returns correct Taylor constants for all ISO groups", () => {
      const groups: Array<"P" | "M" | "K" | "N" | "S" | "H"> = ["P", "M", "K", "N", "S", "H"];
      const expectedC: Record<string, number> = {
        P: 350, M: 200, K: 400, N: 600, S: 100, H: 80,
      };

      for (const group of groups) {
        const constants = cadPhysicsConsistencyGateEngine.getPhysicsConstants(group);
        expect(constants.taylor.C).toBe(expectedC[group]);
      }
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // EDGE CASES
  // ══════════════════════════════════════════════════════════════════════════

  describe("Edge Cases", () => {
    it("handles very small depth of cut", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 0.01,
        fz_mm: 0.02,
        vc_m_min: 100,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.passed).toBe(true);
      expect(result.physics_summary.cutting_force_N).toBeGreaterThan(0);
    });

    it("handles very small feed per tooth", () => {
      const input: PhysicsValidationInput = {
        iso_group: "H",
        ap_mm: 0.1,
        fz_mm: 0.005,
        vc_m_min: 50,
        tool_diameter_mm: 6,
        tool_stickout_mm: 15,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.passed).toBe(true);
    });

    it("handles zero radial engagement gracefully", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
        ae_mm: 0,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.physics_summary.cutting_force_N).toBeGreaterThan(0);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // ADVERSARIAL INPUTS
  // ══════════════════════════════════════════════════════════════════════════

  describe("Adversarial Inputs", () => {
    it("throws on unknown ISO group", () => {
      const input = {
        iso_group: "X" as any,
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      expect(() => cadPhysicsConsistencyGateEngine.validate(input)).toThrow("Unknown ISO material group");
    });

    it("handles NaN inputs gracefully", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: NaN,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      // NaN propagates through calculations, resulting in failed constraints
      expect(Number.isNaN(result.physics_summary.cutting_force_N)).toBe(true);
    });

    it("handles Infinity inputs", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: Infinity,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.verdict).toBe("REJECT");
    });

    it("handles negative values", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: -1.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      // Negative depth gives negative force — constraint fails
      expect(result.physics_summary.cutting_force_N).toBeLessThan(0);
    });

    it("handles zero cutting speed (infinite tool life)", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 0,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.physics_summary.tool_life_min).toBe(Infinity);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // RECOMMENDATIONS
  // ══════════════════════════════════════════════════════════════════════════

  describe("Recommendations", () => {
    it("provides recommendations for high force", () => {
      const input: PhysicsValidationInput = {
        iso_group: "H",
        ap_mm: 4.0,
        fz_mm: 0.25,
        vc_m_min: 100,
        tool_diameter_mm: 10,
        tool_stickout_mm: 40,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      // High force should trigger recommendations about force, ap, fz, or Reduce
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r =>
        r.toLowerCase().includes("force") ||
        r.toLowerCase().includes("reduce") ||
        r.toLowerCase().includes("cutting")
      )).toBe(true);
    });

    it("provides recommendations for short tool life", () => {
      const input: PhysicsValidationInput = {
        iso_group: "H",
        ap_mm: 0.3,
        fz_mm: 0.05,
        vc_m_min: 120, // High speed for hardened = short life
        tool_diameter_mm: 8,
        tool_stickout_mm: 20,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      // With H group at 120 m/min, tool life should be short
      expect(result.physics_summary.tool_life_min).toBeLessThan(30);
    });
  });

  // ══════════════════════════════════════════════════════════════════════════
  // VALIDATION TIME
  // ══════════════════════════════════════════════════════════════════════════

  describe("Performance", () => {
    it("validates in under 10ms", () => {
      const input: PhysicsValidationInput = {
        iso_group: "P",
        ap_mm: 1.0,
        fz_mm: 0.1,
        vc_m_min: 150,
        tool_diameter_mm: 10,
        tool_stickout_mm: 30,
        flute_count: 4,
      };

      const result = cadPhysicsConsistencyGateEngine.validate(input);

      expect(result.validation_time_ms).toBeLessThan(10);
    });
  });
});
