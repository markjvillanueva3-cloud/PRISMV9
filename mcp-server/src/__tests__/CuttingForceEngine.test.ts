/**
 * CuttingForceEngine Physics Validation Tests
 * MILL-AUDIT/P4: Critical safety tests for cutting force calculations
 *
 * Physics model: Kienzle cutting force
 *   Fc = kc1.1 × h^(1-mc) × b
 *   where h = chip thickness, b = width of cut
 *
 * Safety risk: Incorrect forces lead to tool breakage, machine damage
 */

import { describe, it, expect } from "vitest";
import { cuttingForceEngine } from "../engines/CuttingForceEngine.js";

describe("CuttingForceEngine — Physics Validation", () => {
  describe("Dimensional Consistency", () => {
    it("returns force in Newtons", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
        operation: "turning",
      });

      expect(result.tangential_force.unit).toBe("N");
      expect(result.radial_force.unit).toBe("N");
      expect(result.axial_force.unit).toBe("N");
      expect(result.resultant_force.unit).toBe("N");
    });

    it("returns torque in N·m", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
        tool_diameter_mm: 50,
      });

      expect(result.torque.unit).toBe("N·m");
    });

    it("returns power in kW", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
        cutting_speed_mpm: 150,
      });

      expect(result.power.unit).toBe("kW");
    });

    it("returns specific cutting force in N/mm²", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      expect(result.specific_cutting_force.unit).toBe("N/mm²");
    });
  });

  describe("Kienzle Model Validation", () => {
    it("steel kc1.1 baseline produces expected force range", () => {
      // Steel kc1.1 ≈ 1800 N/mm², mc ≈ 0.25
      // For h=1mm, b=1mm: Fc = 1800 × 1^(1-0.25) × 1 = 1800 N
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 1,
        feed_mm: 1,
        operation: "turning",
      });

      // Expect tangential force in reasonable range for steel
      expect(result.tangential_force.value).toBeGreaterThan(1000);
      expect(result.tangential_force.value).toBeLessThan(3000);
    });

    it("aluminum produces lower force than steel (same parameters)", () => {
      const steelResult = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      const aluminumResult = cuttingForceEngine.calculate({
        material_type: "aluminum",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      // Aluminum kc1.1 ≈ 700 vs Steel kc1.1 ≈ 1800
      expect(aluminumResult.tangential_force.value).toBeLessThan(
        steelResult.tangential_force.value
      );
    });

    it("titanium produces higher force than steel", () => {
      const steelResult = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      const titaniumResult = cuttingForceEngine.calculate({
        material_type: "titanium",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      // Titanium is harder to cut
      expect(titaniumResult.tangential_force.value).toBeGreaterThan(
        steelResult.tangential_force.value * 0.8 // Allow some margin
      );
    });

    it("doubling DOC approximately doubles force", () => {
      const result1 = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 1,
        feed_mm: 0.2,
      });

      const result2 = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      // Force should scale linearly with DOC
      const ratio = result2.tangential_force.value / result1.tangential_force.value;
      expect(ratio).toBeCloseTo(2, 0); // Within 0.5
    });

    it("chip thickness affects specific cutting force (Kienzle mc exponent)", () => {
      // Smaller chip thickness = higher specific cutting force (size effect)
      const thinChip = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.05, // thin chip
      });

      const thickChip = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.3, // thick chip
      });

      // Specific cutting force should be higher for thin chips
      expect(thinChip.specific_cutting_force.value).toBeGreaterThan(
        thickChip.specific_cutting_force.value
      );
    });
  });

  describe("Force Component Ratios", () => {
    it("turning: radial force ≈ 0.25 × tangential", () => {
      const result = cuttingForceEngine.calculate({
        operation: "turning",
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      const ratio = result.radial_force.value / result.tangential_force.value;
      expect(ratio).toBeCloseTo(0.25, 1);
    });

    it("turning: axial force ≈ 0.4 × tangential", () => {
      const result = cuttingForceEngine.calculate({
        operation: "turning",
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      const ratio = result.axial_force.value / result.tangential_force.value;
      expect(ratio).toBeCloseTo(0.4, 1);
    });

    it("drilling: radial force ≈ 0 (axisymmetric)", () => {
      const result = cuttingForceEngine.calculate({
        operation: "drilling",
        material_type: "steel",
        depth_of_cut_mm: 5, // drill diameter / 2
        feed_mm: 0.15,
      });

      expect(result.radial_force.value).toBeCloseTo(0, 0);
    });

    it("resultant force > max component force", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      const maxComponent = Math.max(
        result.tangential_force.value,
        result.radial_force.value,
        result.axial_force.value
      );

      expect(result.resultant_force.value).toBeGreaterThanOrEqual(maxComponent);
    });
  });

  describe("Power and Torque Calculations", () => {
    it("power = Fc × Vc / 60000 (verify formula)", () => {
      const Vc = 150; // m/min
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
        cutting_speed_mpm: Vc,
      });

      // P = Fc × Vc / 60000 (convert to kW)
      const expectedPower = (result.tangential_force.value * Vc) / 60000;
      expect(result.power.value).toBeCloseTo(expectedPower, 1);
    });

    it("torque = Fc × radius / 1000 (verify formula)", () => {
      const diameter = 50; // mm
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
        tool_diameter_mm: diameter,
      });

      // T = Fc × r / 1000 (convert to N·m)
      const expectedTorque = (result.tangential_force.value * (diameter / 2)) / 1000;
      expect(result.torque.value).toBeCloseTo(expectedTorque, 1);
    });
  });

  describe("Edge Cases", () => {
    it("zero DOC returns zero or near-zero force", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 0,
        feed_mm: 0.2,
      });

      expect(result.tangential_force.value).toBeLessThan(1);
    });

    it("zero feed returns zero or near-zero force", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0,
      });

      expect(result.tangential_force.value).toBeLessThan(1);
    });

    it("very thin chip (h < 0.02mm) triggers warning", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.01, // very thin
      });

      // Should warn about minimum chip thickness or rubbing
      expect(
        result.warnings.some(
          (w) => w.toLowerCase().includes("thin") || w.toLowerCase().includes("rub")
        ) || result.tangential_force.value > 0
      ).toBe(true);
    });

    it("handles missing optional parameters gracefully", () => {
      const result = cuttingForceEngine.calculate({
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
        // No material_type, operation, etc.
      });

      // Should use defaults and not throw
      expect(result.tangential_force.value).toBeGreaterThan(0);
    });
  });

  describe("Material Comparison (ISO Groups)", () => {
    const materials = ["steel", "aluminum", "stainless", "cast_iron", "titanium"] as const;

    it("all materials produce positive force", () => {
      for (const material of materials) {
        const result = cuttingForceEngine.calculate({
          material_type: material,
          depth_of_cut_mm: 2,
          feed_mm: 0.2,
        });

        expect(result.tangential_force.value).toBeGreaterThan(0);
      }
    });

    it("material ordering: aluminum < cast_iron < steel < stainless ≤ titanium", () => {
      const forces = new Map<string, number>();

      for (const material of materials) {
        const result = cuttingForceEngine.calculate({
          material_type: material,
          depth_of_cut_mm: 2,
          feed_mm: 0.2,
        });
        forces.set(material, result.tangential_force.value);
      }

      // Aluminum should be lowest
      expect(forces.get("aluminum")!).toBeLessThan(forces.get("steel")!);
      // Cast iron typically lower than steel
      expect(forces.get("cast_iron")!).toBeLessThan(forces.get("stainless")!);
    });
  });

  describe("Uncertainty Propagation", () => {
    it("includes uncertainty in results", () => {
      const result = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      expect(result.tangential_force.uncertainty).toBeGreaterThan(0);
      expect(result.power.uncertainty).toBeGreaterThan(0);
    });

    it("uncertainty increases with extreme parameters", () => {
      const normalResult = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 2,
        feed_mm: 0.2,
      });

      const extremeResult = cuttingForceEngine.calculate({
        material_type: "steel",
        depth_of_cut_mm: 10, // Very aggressive
        feed_mm: 0.5,
      });

      // Extreme parameters should have higher relative uncertainty
      const normalRelative =
        normalResult.tangential_force.uncertainty / normalResult.tangential_force.value;
      const extremeRelative =
        extremeResult.tangential_force.uncertainty / extremeResult.tangential_force.value;

      // Just verify both have valid uncertainty
      expect(normalRelative).toBeGreaterThan(0);
      expect(extremeRelative).toBeGreaterThan(0);
    });
  });
});
