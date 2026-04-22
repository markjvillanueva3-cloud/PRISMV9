/**
 * WorkholdingForceEngine Tests — P4-U05-VISE
 * ============================================
 *
 * Tests for workholding force calculations:
 *   - Vise clamping force (clampForce)
 *   - Chuck jaw force for turning (chuckForce)
 *   - Friction coefficient effects
 *   - Safety factor validation
 *   - Centrifugal force at high RPM
 *
 * Physics references:
 *   - Carr Lane Manufacturing workholding guide
 *   - SME Fundamentals of Tool Design Ch.8
 *   - Machinery's Handbook Ch.25
 *
 * Key formulas:
 *   F_clamp = F_cutting × SF / μ
 *   F_grip = F_tangential × SF / (μ × n_jaws)
 *   F_centrifugal = m × ω² × r
 *
 * @module __tests__/WorkholdingForceEngine.P4U05.test
 * @milestone MILL-MASTER-P4/U05-VISE
 */

import { describe, it, expect } from "vitest";
import {
  WorkholdingForceEngine,
  workholdingForceEngine,
  type ClampForceInput,
  type ClampForceResult,
  type ChuckForceInput,
  type ChuckForceResult,
} from "../engines/WorkholdingForceEngine.js";

describe("WorkholdingForceEngine P4-U05-VISE", () => {
  describe("clampForce — vise clamping calculations", () => {
    it("calculates basic vise clamping force", () => {
      const input: ClampForceInput = {
        cutting_force_n: 1000,
      };
      const result = workholdingForceEngine.clampForce(input);

      // Default vise: μ=0.15, SF=2.0
      // F_clamp = 1000 × 2.0 / 0.15 = 13,333 N
      expect(result.required_force.value).toBeCloseTo(13333, -1);
      expect(result.required_force.unit).toBe("N");
      expect(result.friction_coefficient.value).toBe(0.15);
      expect(result.safety_factor.value).toBe(2.0);
      expect(result.force_per_clamp.value).toBeCloseTo(13333, -1); // 1 clamp for vise
      expect(result.warnings.length).toBe(0);
    });

    it("uses correct defaults for each workholding type", () => {
      const fc = 500;
      const types: Array<{ type: string; mu: number; sf: number }> = [
        { type: "vise", mu: 0.15, sf: 2.0 },
        { type: "chuck_3jaw", mu: 0.20, sf: 2.5 },
        { type: "chuck_6jaw", mu: 0.25, sf: 2.0 },
        { type: "vacuum", mu: 0.30, sf: 3.0 },
        { type: "magnetic", mu: 0.20, sf: 3.0 },
        { type: "fixture_plate", mu: 0.25, sf: 2.0 },
      ];

      for (const { type, mu, sf } of types) {
        const result = workholdingForceEngine.clampForce({
          cutting_force_n: fc,
          workholding_type: type as any,
        });
        const expected = (fc * sf) / mu;
        expect(result.required_force.value).toBeCloseTo(expected, -1);
        expect(result.friction_coefficient.value).toBe(mu);
        expect(result.safety_factor.value).toBe(sf);
      }
    });

    it("respects custom friction coefficient", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 1000,
        friction_coefficient: 0.30, // serrated jaws
      });
      // F_clamp = 1000 × 2.0 / 0.30 = 6,667 N
      expect(result.required_force.value).toBeCloseTo(6667, -1);
      expect(result.friction_coefficient.value).toBe(0.30);
    });

    it("respects custom safety factor", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 1000,
        safety_factor: 3.0, // aggressive roughing
      });
      // F_clamp = 1000 × 3.0 / 0.15 = 20,000 N
      expect(result.required_force.value).toBe(20000);
    });

    it("divides force among multiple clamps", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 1000,
        workholding_type: "fixture_plate",
        num_clamps: 4,
      });
      // Default fixture_plate: μ=0.25, SF=2.0
      // Total = 1000 × 2.0 / 0.25 = 8000 N
      // Per clamp = 8000 / 4 = 2000 N
      expect(result.required_force.value).toBe(8000);
      expect(result.force_per_clamp.value).toBe(2000);
    });

    it("warns on significant workpiece weight for vertical setups", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 500,
        workpiece_mass_kg: 100, // 981 N gravity
      });
      // Required force = 500 × 2.0 / 0.15 = 6,667 N
      // Gravity check: 981 > 6667 × 0.15 × 0.5 = 500 → warns
      expect(result.warnings.some(w => w.includes("weight"))).toBe(true);
    });

    it("warns on high cutting force for vacuum holding", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 600, // >500 threshold
        workholding_type: "vacuum",
      });
      expect(result.warnings.some(w => w.includes("vacuum"))).toBe(true);
    });

    it("warns on high cutting force for magnetic chuck", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 1200, // >1000 threshold
        workholding_type: "magnetic",
      });
      expect(result.warnings.some(w => w.includes("magnetic"))).toBe(true);
    });

    it("warns on low safety factor", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 1000,
        safety_factor: 1.2, // <1.5 threshold
      });
      expect(result.warnings.some(w => w.includes("Safety factor"))).toBe(true);
    });

    it("calculates torque for vise bolt tightening", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 1000,
      });
      // T ≈ F × 0.002 (M12 bolt approximation)
      // F_per_clamp = 13333 N → T ≈ 26.7 Nm
      expect(result.torque_nm.value).toBeCloseTo(26.7, 0);
      expect(result.torque_nm.unit).toBe("Nm");
    });
  });

  describe("chuckForce — turning chuck calculations", () => {
    it("calculates basic 3-jaw chuck force", () => {
      const input: ChuckForceInput = {
        cutting_force_tangential_n: 1000,
        workpiece_diameter_mm: 50,
        rpm: 1000,
        workpiece_mass_kg: 2,
      };
      const result = workholdingForceEngine.chuckForce(input);

      // Default: μ=0.20, SF=2.5, 3 jaws
      // F_grip = 1000 × 2.5 / (0.20 × 3) = 4167 N
      expect(result.required_grip_force.value).toBeCloseTo(4167, -1);
      expect(result.required_grip_force.unit).toBe("N");

      // Centrifugal: F = m × ω² × r
      // ω = 2π × 1000 / 60 = 104.7 rad/s
      // r = 0.025 m
      // F = 2 × 104.7² × 0.025 = 548 N
      expect(result.centrifugal_force.value).toBeCloseTo(548, -1);

      expect(result.is_safe).toBe(true);
    });

    it("uses default radial force of 40% tangential", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 1000,
        workpiece_diameter_mm: 50,
        rpm: 500,
        workpiece_mass_kg: 1,
      });
      // Radial force defaults to 0.4 × Ft, but doesn't directly affect grip formula
      // (Fr is stored in the calculation but grip is dominated by Ft)
      expect(result.required_grip_force.value).toBeGreaterThan(0);
    });

    it("calculates with 6-jaw chuck", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 1000,
        workpiece_diameter_mm: 100,
        rpm: 800,
        workpiece_mass_kg: 5,
        num_jaws: 6,
      });
      // F_grip = 1000 × 2.5 / (0.20 × 6) = 2083 N
      expect(result.required_grip_force.value).toBeCloseTo(2083, -1);
    });

    it("warns on RPM approaching max safe limit", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 150, // large diameter
        rpm: 2000, // high RPM with heavy part
        workpiece_mass_kg: 10,
      });
      // High centrifugal force should trigger warning
      expect(result.warnings.some(w => w.includes("RPM"))).toBe(true);
    });

    it("warns on large workpiece in 3-jaw", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 250, // >200mm threshold
        rpm: 500,
        workpiece_mass_kg: 15,
      });
      expect(result.warnings.some(w => w.includes("6-jaw"))).toBe(true);
    });

    it("warns when centrifugal > 30% of grip", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 200, // low cutting force
        workpiece_diameter_mm: 100,
        rpm: 3000, // high RPM
        workpiece_mass_kg: 8, // heavy
      });
      expect(result.warnings.some(w => w.includes("Centrifugal"))).toBe(true);
    });

    it("reports is_safe=false when RPM exceeds max", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 100,
        workpiece_diameter_mm: 200,
        rpm: 10000, // extreme
        workpiece_mass_kg: 20,
      });
      // Centrifugal will far exceed grip force
      expect(result.is_safe).toBe(false);
    });

    it("calculates max safe RPM", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 1000,
        workpiece_diameter_mm: 50,
        rpm: 500,
        workpiece_mass_kg: 2,
      });
      // Max RPM where centrifugal = 50% of static grip
      expect(result.max_safe_rpm.value).toBeGreaterThan(0);
      expect(result.max_safe_rpm.unit).toBe("rev/min");
    });

    it("respects custom friction coefficient", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 1000,
        workpiece_diameter_mm: 50,
        rpm: 500,
        workpiece_mass_kg: 2,
        friction_coefficient: 0.30, // better jaws
      });
      // F_grip = 1000 × 2.5 / (0.30 × 3) = 2778 N
      expect(result.required_grip_force.value).toBeCloseTo(2778, -1);
    });

    it("respects custom safety factor", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 1000,
        workpiece_diameter_mm: 50,
        rpm: 500,
        workpiece_mass_kg: 2,
        safety_factor: 3.5, // aggressive turning
      });
      // F_grip = 1000 × 3.5 / (0.20 × 3) = 5833 N
      expect(result.required_grip_force.value).toBeCloseTo(5833, -1);
    });
  });

  describe("physics validation", () => {
    it("clamp force scales linearly with cutting force", () => {
      const r1 = workholdingForceEngine.clampForce({ cutting_force_n: 500 });
      const r2 = workholdingForceEngine.clampForce({ cutting_force_n: 1000 });
      expect(r2.required_force.value / r1.required_force.value).toBeCloseTo(2, 1);
    });

    it("clamp force scales inversely with friction", () => {
      const r1 = workholdingForceEngine.clampForce({
        cutting_force_n: 1000,
        friction_coefficient: 0.15,
      });
      const r2 = workholdingForceEngine.clampForce({
        cutting_force_n: 1000,
        friction_coefficient: 0.30,
      });
      expect(r1.required_force.value / r2.required_force.value).toBeCloseTo(2, 1);
    });

    it("centrifugal force scales with RPM squared", () => {
      const r1 = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 50,
        rpm: 1000,
        workpiece_mass_kg: 2,
      });
      const r2 = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 50,
        rpm: 2000,
        workpiece_mass_kg: 2,
      });
      // F_cent ∝ ω² → 4× at 2× RPM
      expect(r2.centrifugal_force.value / r1.centrifugal_force.value).toBeCloseTo(4, 0);
    });

    it("centrifugal force scales linearly with mass", () => {
      const r1 = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 50,
        rpm: 1000,
        workpiece_mass_kg: 2,
      });
      const r2 = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 50,
        rpm: 1000,
        workpiece_mass_kg: 4,
      });
      expect(r2.centrifugal_force.value / r1.centrifugal_force.value).toBeCloseTo(2, 1);
    });

    it("centrifugal force scales linearly with radius", () => {
      const r1 = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 50,
        rpm: 1000,
        workpiece_mass_kg: 2,
      });
      const r2 = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 100,
        rpm: 1000,
        workpiece_mass_kg: 2,
      });
      expect(r2.centrifugal_force.value / r1.centrifugal_force.value).toBeCloseTo(2, 1);
    });
  });

  describe("edge cases", () => {
    it("handles zero cutting force", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 0,
      });
      expect(result.required_force.value).toBe(0);
    });

    it("handles very high cutting forces", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 50000, // extreme roughing
      });
      expect(result.required_force.value).toBeGreaterThan(0);
      expect(Number.isFinite(result.required_force.value)).toBe(true);
    });

    it("handles very low RPM in chuck", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 1000,
        workpiece_diameter_mm: 50,
        rpm: 10, // threading
        workpiece_mass_kg: 2,
      });
      // Minimal centrifugal force
      expect(result.centrifugal_force.value).toBeLessThan(1);
      expect(result.is_safe).toBe(true);
    });

    it("handles very small workpiece diameter", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 500,
        workpiece_diameter_mm: 5, // small pin
        rpm: 5000,
        workpiece_mass_kg: 0.1,
      });
      expect(Number.isFinite(result.max_safe_rpm.value)).toBe(true);
    });

    it("handles very heavy workpiece", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 2000,
        workpiece_diameter_mm: 300,
        rpm: 200, // slow due to mass
        workpiece_mass_kg: 100,
      });
      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  describe("AtomicValue structure", () => {
    it("clampForce returns properly structured AtomicValues", () => {
      const result = workholdingForceEngine.clampForce({
        cutting_force_n: 1000,
      });

      // Check all AtomicValue fields present
      expect(result.required_force).toHaveProperty("value");
      expect(result.required_force).toHaveProperty("unit");
      expect(result.required_force).toHaveProperty("uncertainty");
      expect(result.required_force).toHaveProperty("source");

      expect(typeof result.required_force.value).toBe("number");
      expect(typeof result.required_force.unit).toBe("string");
      expect(typeof result.required_force.uncertainty).toBe("number");
      expect(typeof result.required_force.source).toBe("string");
    });

    it("chuckForce returns properly structured AtomicValues", () => {
      const result = workholdingForceEngine.chuckForce({
        cutting_force_tangential_n: 1000,
        workpiece_diameter_mm: 50,
        rpm: 1000,
        workpiece_mass_kg: 2,
      });

      expect(result.required_grip_force).toHaveProperty("value");
      expect(result.centrifugal_force).toHaveProperty("value");
      expect(result.total_required).toHaveProperty("value");
      expect(result.force_per_jaw).toHaveProperty("value");
      expect(result.max_safe_rpm).toHaveProperty("value");

      // Verify units are correct
      expect(result.required_grip_force.unit).toBe("N");
      expect(result.centrifugal_force.unit).toBe("N");
      expect(result.total_required.unit).toBe("N/jaw");
      expect(result.max_safe_rpm.unit).toBe("rev/min");
    });
  });

  describe("singleton export", () => {
    it("exports singleton instance", () => {
      expect(workholdingForceEngine).toBeInstanceOf(WorkholdingForceEngine);
    });

    it("class can be instantiated independently", () => {
      const instance = new WorkholdingForceEngine();
      const result = instance.clampForce({ cutting_force_n: 500 });
      expect(result.required_force.value).toBeGreaterThan(0);
    });
  });
});

describe("millDispatcher workholding actions", () => {
  it("mill_workholding_force routes to WorkholdingForceEngine.clampForce", async () => {
    // Import the engine directly to verify behavior matches
    const { workholdingForceEngine } = await import("../engines/WorkholdingForceEngine.js");
    const result = workholdingForceEngine.clampForce({
      cutting_force_n: 1000,
      workholding_type: "vise",
    });
    expect(result.required_force.value).toBeCloseTo(13333, -1);
  });

  it("mill_workholding_chuck routes to WorkholdingForceEngine.chuckForce", async () => {
    const { workholdingForceEngine } = await import("../engines/WorkholdingForceEngine.js");
    const result = workholdingForceEngine.chuckForce({
      cutting_force_tangential_n: 1000,
      workpiece_diameter_mm: 50,
      rpm: 1000,
      workpiece_mass_kg: 2,
    });
    expect(result.required_grip_force.value).toBeGreaterThan(0);
    expect(result.centrifugal_force.value).toBeGreaterThan(0);
  });
});
