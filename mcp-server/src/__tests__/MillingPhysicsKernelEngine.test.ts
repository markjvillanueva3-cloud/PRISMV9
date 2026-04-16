/**
 * MillingPhysicsKernelEngine.test.ts
 *
 * Tests for the milling physics kernel facade engine.
 * Verifies delegation to underlying physics engines.
 */

import { describe, it, expect } from "vitest";
import { millingPhysicsKernelEngine } from "../engines/MillingPhysicsKernelEngine.js";

describe("MillingPhysicsKernelEngine", () => {
  describe("calculateMillingForces", () => {
    it("should calculate forces using Kienzle model with helix decomposition", () => {
      const result = millingPhysicsKernelEngine.calculateMillingForces({
        kc1_1: 1800, // Steel P-group
        mc: 0.25,
        ap: 3.0,    // 3mm axial depth
        fz: 0.1,    // 0.1mm feed per tooth
        helix_angle_deg: 30,
        tool_diameter_mm: 10,
      });

      // Kienzle: Fc = kc1_1 * ap * fz^(1-mc) = 1800 * 3 * 0.1^0.75 ≈ 960 N
      expect(result.tangential_force_N.value).toBeCloseTo(960.3, 0);
      expect(result.tangential_force_N.source).toContain("Kienzle");

      // Helix decomposition at 30°: Fa = Fc * sin(30°) = 0.5 * Fc
      expect(result.axial_force_N.value).toBeCloseTo(result.tangential_force_N.value * 0.5, 0);

      // Radial: Fr = Fc * cos(30°) ≈ 0.866 * Fc
      expect(result.radial_force_N.value).toBeCloseTo(result.tangential_force_N.value * 0.866, 0);

      // Resultant should be > tangential
      expect(result.resultant_force_N.value).toBeGreaterThan(result.tangential_force_N.value);

      // Specific cutting force kc = Fc / (ap * fz)
      expect(result.specific_cutting_force_N_mm2.value).toBeCloseTo(3201, 0);
    });

    it("should handle zero helix angle (all radial, no axial)", () => {
      const result = millingPhysicsKernelEngine.calculateMillingForces({
        kc1_1: 1800,
        mc: 0.25,
        ap: 2.0,
        fz: 0.15,
        helix_angle_deg: 0,
      });

      // At 0° helix: all force is radial, none axial
      expect(result.axial_force_N.value).toBeCloseTo(0, 5);
      expect(result.radial_force_N.value).toBeCloseTo(result.tangential_force_N.value, 5);
    });

    it("should handle 45° helix angle (equal distribution)", () => {
      const result = millingPhysicsKernelEngine.calculateMillingForces({
        kc1_1: 1500,
        mc: 0.25,
        ap: 1.0,
        fz: 0.1,
        helix_angle_deg: 45,
      });

      // At 45°: sin(45) = cos(45) ≈ 0.707
      const ratio = Math.sqrt(2) / 2;
      expect(result.axial_force_N.value).toBeCloseTo(result.tangential_force_N.value * ratio, 0);
      expect(result.radial_force_N.value).toBeCloseTo(result.tangential_force_N.value * ratio, 0);
    });
  });

  describe("calculateToolLife", () => {
    it("should calculate basic Taylor tool life", () => {
      const result = millingPhysicsKernelEngine.calculateToolLife({
        C: 300,   // Taylor constant
        n: 0.25,  // Speed exponent
        Vc: 150,  // Cutting speed m/min
      });

      // T = (C/Vc)^(1/n) = (300/150)^4 = 16 min
      expect(result.tool_life_min.value).toBeCloseTo(16, 0);
      expect(result.model_used).toBe("basic_taylor");
      expect(result.tool_life_min.source).toContain("Taylor");
    });

    it("should apply coating multiplier", () => {
      const uncoated = millingPhysicsKernelEngine.calculateToolLife({
        C: 300,
        n: 0.25,
        Vc: 150,
      });

      const coated = millingPhysicsKernelEngine.calculateToolLife({
        C: 300,
        n: 0.25,
        Vc: 150,
        coating: "TiAlN",
      });

      // TiAlN has 1.5x multiplier
      expect(coated.tool_life_min.value).toBeGreaterThan(uncoated.tool_life_min.value);
      expect(coated.tool_life_min.value / uncoated.tool_life_min.value).toBeCloseTo(1.5 ** 4, 1);
    });

    it("should use extended Taylor with p and q exponents", () => {
      const result = millingPhysicsKernelEngine.calculateToolLife({
        C: 1000,
        n: 0.25,
        p: 0.30,
        q: 0.15,
        Vc: 150,
        f: 0.2,
        ap: 3.0,
      });

      // T = C / (Vc^n × f^p × ap^q)
      // T = 1000 / (150^0.25 × 0.2^0.3 × 3^0.15)
      // T ≈ 1000 / (3.499 × 0.617 × 1.175) ≈ 394 min
      expect(result.model_used).toBe("extended_taylor");
      expect(result.exponents.p).toBe(0.30);
      expect(result.exponents.q).toBe(0.15);
      expect(result.tool_life_min.value).toBeGreaterThan(100);
    });

    it("should use ISO group lookup for extended exponents", () => {
      const result = millingPhysicsKernelEngine.calculateToolLife({
        C: 1000,
        n: 0.25,
        Vc: 150,
        f: 0.2,
        ap: 3.0,
        iso_group: "P", // Steel
      });

      // Should use P-steel exponents: p=0.30, q=0.15
      expect(result.model_used).toBe("extended_taylor");
      expect(result.exponents.p).toBe(0.30);
      expect(result.exponents.q).toBe(0.15);
    });
  });

  describe("calculateToolDeflection", () => {
    it("should calculate deflection using cantilever beam theory", () => {
      const result = millingPhysicsKernelEngine.calculateToolDeflection({
        force_N: 500,
        tool_stickout_mm: 50,
        tool_diameter_mm: 10,
      });

      // δ = FL³/(3EI), I = πd⁴/64
      // I = π × 10⁴ / 64 ≈ 490.87 mm⁴
      // δ = 500 × 50³ / (3 × 600000 × 490.87) ≈ 0.071 mm
      expect(result.deflection_mm.value).toBeCloseTo(0.071, 2);
      expect(result.deflection_mm.source).toContain("Euler-Bernoulli");
    });

    it("should flag excessive deflection", () => {
      const result = millingPhysicsKernelEngine.calculateToolDeflection({
        force_N: 2000,
        tool_stickout_mm: 80,
        tool_diameter_mm: 8,
      });

      // Long stickout + small diameter + high force = high deflection
      expect(result.deflection_mm.value).toBeGreaterThan(0.5);
      expect(result.acceptable).toBe(false);
    });

    it("should accept low deflection", () => {
      const result = millingPhysicsKernelEngine.calculateToolDeflection({
        force_N: 100,
        tool_stickout_mm: 20,
        tool_diameter_mm: 12,
      });

      expect(result.deflection_mm.value).toBeLessThan(0.01);
      expect(result.acceptable).toBe(true);
    });
  });

  describe("calculateSurfaceRoughness", () => {
    it("should calculate Ra using Brammertz kinematic model", () => {
      const result = millingPhysicsKernelEngine.calculateSurfaceRoughness(
        0.1,  // fz = 0.1mm
        0.8   // corner radius = 0.8mm
      );

      // Ra = fz² / (32 × re) × 1000 = 0.1² / (32 × 0.8) × 1000 ≈ 0.39 µm
      expect(result.value).toBeCloseTo(0.39, 1);
      expect(result.unit).toBe("µm");
      expect(result.source).toContain("Brammertz");
    });

    it("should show worse finish with higher feed", () => {
      const fine = millingPhysicsKernelEngine.calculateSurfaceRoughness(0.05, 0.8);
      const coarse = millingPhysicsKernelEngine.calculateSurfaceRoughness(0.2, 0.8);

      // Ra ∝ fz², so 4x feed = 16x roughness
      expect(coarse.value / fine.value).toBeCloseTo(16, 0);
    });
  });

  describe("decomposeHelixForces", () => {
    it("should decompose tangential force by helix angle", () => {
      const result = millingPhysicsKernelEngine.decomposeHelixForces(1000, 30);

      expect(result.axial_force_N.value).toBeCloseTo(500, 0);
      expect(result.radial_force_N.value).toBeCloseTo(866, 0);
    });
  });

  describe("predictChipFormation", () => {
    it("should predict chip type and Merchant shear angle", () => {
      const result = millingPhysicsKernelEngine.predictChipFormation({
        cutting_speed_m_min: 150,
        feed_mm: 0.2,
        depth_of_cut_mm: 2.0,
        rake_angle_deg: 10,
        workpiece_hardness_hrc: 30,
      });

      // Merchant's equation: φ = 45 + γ/2 - β/2
      // With 10° rake and typical friction, shear angle should be ~25-35°
      expect(result.shear_angle_deg).toBeDefined();
      expect(result.shear_angle_deg.value).toBeGreaterThan(15);
      expect(result.shear_angle_deg.value).toBeLessThan(50);
      expect(result.chip_type).toBeDefined();
      expect(result.chip_compression_ratio).toBeDefined();
    });
  });

  describe("calculateCuttingTemperature", () => {
    it("should calculate temperatures using Loewen-Shaw model", () => {
      const result = millingPhysicsKernelEngine.calculateCuttingTemperature({
        Vc: 200,
        fz: 0.15,
        ap: 2.0,
        Fc: 800,
        workpiece: {
          thermal_conductivity_w_mk: 50,
          specific_heat_j_kgk: 500,
          density_kg_m3: 7850,
        },
      });

      // Should have chip and tool temperatures
      expect(result.chip_temperature_C.value).toBeGreaterThan(100);
      expect(result.tool_face_temperature_C.value).toBeGreaterThan(100);

      // Heat partition should sum to ~1
      const totalPartition =
        result.heat_partition_chip.value +
        result.heat_partition_tool.value +
        result.heat_partition_workpiece.value;
      expect(totalPartition).toBeCloseTo(1.0, 1);

      expect(result.chip_temperature_C.source).toContain("Loewen-Shaw");
    });
  });

  describe("getFullPhysicsState", () => {
    it("should return comprehensive physics analysis", () => {
      const result = millingPhysicsKernelEngine.getFullPhysicsState({
        material: {
          kc1_1: 1800,
          mc: 0.25,
          thermal_conductivity_w_mk: 50,
          specific_heat_j_kgk: 500,
          density_kg_m3: 7850,
          hardness_hrc: 30,
        },
        tool: {
          diameter_mm: 10,
          stickout_mm: 40,
          helix_angle_deg: 30,
          rake_angle_deg: 8,
          corner_radius_mm: 0.5,
          thermal_conductivity_w_mk: 100,
          coating: "TiAlN",
        },
        cutting: {
          Vc: 150,
          fz: 0.1,
          ap: 2.0,
          ae: 5.0,
        },
        taylor: {
          C: 300,
          n: 0.25,
          iso_group: "P",
        },
      });

      // Should have all physics components
      expect(result.forces).toBeDefined();
      expect(result.forces.tangential_force_N.value).toBeGreaterThan(0);

      expect(result.temperature).toBeDefined();
      expect(result.temperature.chip_temperature_C.value).toBeGreaterThan(0);

      expect(result.deflection).toBeDefined();
      expect(result.deflection.deflection_mm.value).toBeGreaterThan(0);

      expect(result.surfaceRoughness).toBeDefined();
      expect(result.surfaceRoughness.value).toBeGreaterThan(0);

      expect(result.toolLife).toBeDefined();
      expect(result.toolLife?.tool_life_min.value).toBeGreaterThan(0);

      expect(result.chipFormation).toBeDefined();

      // Should list consulted engines
      expect(result.engines_consulted.length).toBeGreaterThan(0);
      expect(result.engines_consulted.join(",")).toContain("kienzle");
      expect(result.engines_consulted.join(",")).toContain("LoewenShaw");
    });
  });
});
