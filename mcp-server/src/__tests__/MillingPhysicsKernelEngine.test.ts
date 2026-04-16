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

  // =========================================================================
  // PHASE 1 WIRING TESTS: Additional Force Engines
  // =========================================================================

  describe("calculateKienzleSpecificForce (KienzleForceModelEngine)", () => {
    it("should calculate specific cutting force with corrections", () => {
      const result = millingPhysicsKernelEngine.calculateKienzleSpecificForce({
        kc1_1: 1800,
        mc: 0.25,
        feed_mm: 0.2,
        depth_of_cut_mm: 3.0,
        rake_angle_deg: 10,
        cutting_speed_mpm: 150,
      });

      expect(result.kc).toBeGreaterThan(0);
      expect(result.kc_corrected).toBeGreaterThan(0);
      expect(result.main_cutting_force_Fc).toBeGreaterThan(0);
      expect(result.cutting_power_Pc).toBeGreaterThan(0);
    });
  });

  describe("calculateForceComponents (KienzleForceModelEngine)", () => {
    it("should calculate all force components for milling", () => {
      const result = millingPhysicsKernelEngine.calculateForceComponents({
        operation: "milling",
        kc1_1: 1800,
        mc: 0.25,
        feed_mm: 0.1,
        depth_of_cut_mm: 2.0,
        cutting_speed_mpm: 150,
        tool_diameter_mm: 10,
        flutes: 4,
        radial_depth_mm: 5,
      });

      expect(result.Fc).toBeGreaterThan(0);
      expect(result.Ff).toBeGreaterThan(0);
      expect(result.Fp).toBeGreaterThan(0);
      expect(result.Fr).toBeGreaterThan(0);       // Resultant force
      expect(result.power_kW).toBeGreaterThan(0);
    });
  });

  describe("calculatePowerBudget (CuttingPowerBudgetEngine)", () => {
    it("should validate power against machine envelope", () => {
      const result = millingPhysicsKernelEngine.calculatePowerBudget({
        machine_power_kW: 15,
        cutting_speed_m_min: 150,
        tool_diameter_mm: 10,
        depth_of_cut_mm: 2.0,
        width_of_cut_mm: 5.0,
        feed_mm_tooth: 0.1,
        flutes: 4,
        iso_group: "P",
      });

      expect(result.required_power_kW).toBeDefined();
      expect(result.power_utilization_pct).toBeDefined();
      expect(result.power_utilization_pct.value).toBeLessThanOrEqual(100);
    });
  });

  describe("calculateSpecificEnergy (SpecificCuttingEnergyEngine)", () => {
    it("should calculate energy per volume", () => {
      const result = millingPhysicsKernelEngine.calculateSpecificEnergy({
        kc1_1: 1800,
        mc: 0.25,
        feed_mm: 0.1,
        depth_of_cut_mm: 2.0,
        width_of_cut_mm: 5.0,
        cutting_speed_m_min: 150,
      });

      expect(result.specific_energy_J_mm3).toBeDefined();
      expect(result.specific_energy_J_mm3.value).toBeGreaterThan(0);
    });
  });

  // =========================================================================
  // PHASE 1 WIRING TESTS: Additional Thermal Engines
  // =========================================================================

  describe("calculateTriggerTemperature (CuttingTemperatureEngine)", () => {
    it("should calculate interface temperatures", () => {
      const result = millingPhysicsKernelEngine.calculateTriggerTemperature({
        cutting_speed_mpm: 150,
        feed_mm: 0.2,
        depth_of_cut_mm: 2.0,
        material_type: "steel",
        tool_coating: "TiAlN",
        coolant: "flood",
      });

      expect(result.interface_temperature.value).toBeGreaterThan(100);
      expect(result.chip_temperature.value).toBeGreaterThan(100);
      expect(result.thermal_margin.value).toBeDefined();
    });
  });

  describe("getWiredEngines", () => {
    it("should list all wired engines", () => {
      const engines = millingPhysicsKernelEngine.getWiredEngines();
      expect(engines.length).toBeGreaterThanOrEqual(12);
      expect(engines.join(",")).toContain("KienzleForceModelEngine");
      expect(engines.join(",")).toContain("CuttingPowerBudgetEngine");
      expect(engines.join(",")).toContain("ThermalWearCouplingEngine");
    });
  });

  describe("getWiringStats", () => {
    it("should return engine counts by category", () => {
      const stats = millingPhysicsKernelEngine.getWiringStats();
      expect(stats.total_engines).toBeGreaterThanOrEqual(16);
      expect(stats.force).toBeGreaterThanOrEqual(5);
      expect(stats.thermal).toBeGreaterThanOrEqual(4);
      expect(stats.deflection).toBeGreaterThanOrEqual(1);
      expect(stats.stability).toBeGreaterThanOrEqual(1);
      expect(stats.surface).toBeGreaterThanOrEqual(2);
    });
  });

  // =========================================================================
  // PHASE 1 WIRING TESTS: Deflection Engines
  // =========================================================================

  describe("calculateAdvancedToolDeflection (ToolDeflectionPredictionEngine)", () => {
    it("should calculate deflection with stress analysis", () => {
      const result = millingPhysicsKernelEngine.calculateAdvancedToolDeflection({
        tool_diameter_mm: 10,
        tool_overhang_mm: 50,
        cutting_force_N: 500,
        tool_material: "carbide",
        flute_count: 4,
      });

      expect(result.static_deflection_um.value).toBeGreaterThan(0);
      expect(result.max_bending_stress_MPa.value).toBeGreaterThan(0);
      expect(result.safety_factor.value).toBeGreaterThan(0);
      expect(result.is_safe).toBeDefined();
    });
  });

  // =========================================================================
  // PHASE 1 WIRING TESTS: Stability Engines
  // =========================================================================

  describe("generateStabilityLobes (ChatterStabilityLobeEngine)", () => {
    it("should generate stability lobe diagram", () => {
      const result = millingPhysicsKernelEngine.generateStabilityLobes({
        tool: {
          diameter_mm: 10,
          flute_count: 4,
          overhang_mm: 40,
          material: "carbide",
        },
        workpiece: {
          iso_group: "P",
        },
        machine: {
          natural_frequency_hz: 800,
          damping_ratio: 0.03,
          stiffness_n_um: 50,
          max_rpm: 10000,
        },
        cutting: {
          radial_immersion_ratio: 0.5,
          up_milling: false,
        },
        rpm_points: 20,
      });

      // Result is AtomicValue<ChatterResult>
      expect(result.value).toBeDefined();
      expect(result.value.lobes).toBeDefined();
      expect(result.value.critical_frequency_hz).toBeGreaterThan(0);
      expect(result.value.recommendations).toBeDefined();
      // Lobes may be empty depending on parameters, but structure should exist
      expect(Array.isArray(result.value.lobes)).toBe(true);
    });
  });

  // =========================================================================
  // PHASE 1 WIRING TESTS: Surface Engines
  // =========================================================================

  describe("analyzeSurfaceIntegrity (SurfaceIntegrityEngine)", () => {
    it("should analyze surface integrity for milling", () => {
      const result = millingPhysicsKernelEngine.analyzeSurfaceIntegrity({
        process: "milling",
        feed_mm_rev: 0.15,
        tool_nose_radius_mm: 0.8,
        cutting_speed_m_min: 150,
        depth_of_cut_mm: 2.0,
        material: "steel",
        coolant: "flood",
      });

      expect(result.surface_roughness_ra.value).toBeGreaterThan(0);
      expect(result.residual_stress_surface).toBeDefined();
      expect(result.white_layer_thickness).toBeDefined();
      expect(result.fatigue_derating).toBeDefined();
      expect(result.surface_quality_score.value).toBeGreaterThan(0);
    });
  });

  describe("optimalFeedForTargetRa", () => {
    it("should calculate optimal feed for target Ra", () => {
      const fz = millingPhysicsKernelEngine.optimalFeedForTargetRa(
        1.6,  // Target Ra = 1.6 µm
        0.8,  // Tool radius = 0.8mm
        5     // Edge radius = 5 µm
      );

      expect(fz).toBeGreaterThan(0);
      expect(fz).toBeLessThan(0.5); // Reasonable feed range
    });
  });
});
