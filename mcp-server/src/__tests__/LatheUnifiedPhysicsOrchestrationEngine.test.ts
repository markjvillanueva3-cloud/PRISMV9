/**
 * LatheUnifiedPhysicsOrchestrationEngine Tests
 *
 * Comprehensive test suite for PhD-level unified physics analysis.
 * Tests all physics sub-models against literature values and validates
 * the integration between cutting mechanics, thermal physics, metallurgy,
 * and dynamics.
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  latheUnifiedPhysicsOrchestrationEngine,
  type UnifiedPhysicsInput,
  type TurningToolGeometry,
  type CuttingParameters,
  type MachineCapability,
} from "../engines/LatheUnifiedPhysicsOrchestrationEngine.js";
import {
  CANONICAL_KIENZLE,
  CANONICAL_TAYLOR,
  CANONICAL_MATERIAL_DB,
} from "../physics/constants.js";

// ─── Test Fixtures ───────────────────────────────────────────────────────

const standardTool: TurningToolGeometry = {
  nose_radius_mm: 0.8,
  ic_diameter_mm: 12.7,
  lead_angle_deg: 95,
  back_rake_deg: 6,
  side_rake_deg: -6,
  relief_angle_deg: 7,
  inclination_angle_deg: -5,
  tool_material: "carbide",
  coating: "TiAlN",
  edge_radius_mm: 0.02,
  flank_wear_VB_mm: 0.1,
};

const standardMachine: MachineCapability = {
  max_power_kW: 22,
  max_torque_Nm: 500,
  max_rpm: 4000,
  min_rpm: 50,
  spindle_stiffness_N_um: 50,
  turret_stiffness_N_um: 30,
  has_tailstock: true,
  has_steady_rest: true,
  has_live_tooling: true,
  controller: "Okuma OSP",
};

const standardParams: CuttingParameters = {
  cutting_speed_m_min: 200,
  feed_mm_rev: 0.25,
  depth_of_cut_mm: 2.5,
  workpiece_diameter_mm: 50,
};

const createInput = (overrides: Partial<UnifiedPhysicsInput> = {}): UnifiedPhysicsInput => ({
  material: "steel",
  operation: "roughing",
  parameters: standardParams,
  tool: standardTool,
  machine: standardMachine,
  ...overrides,
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 1: CUTTING FORCE TESTS (KIENZLE MODEL)
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Cutting Forces", () => {
  describe("Kienzle Force Model", () => {
    it("should calculate cutting force using canonical Kienzle constants", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "steel", 2.5, 0.25, 200, 95
      );

      // Expected: Fc = kc × b × h where kc = 1800 × h^(-0.25)
      // h = 0.25 × sin(95°) ≈ 0.249 mm
      // b = 2.5 / sin(95°) ≈ 2.51 mm
      // kc = 1800 × 0.249^(-0.25) ≈ 2551 N/mm²
      // Fc = 2551 × 2.51 × 0.249 ≈ 1596 N

      expect(result.Fc).toBeGreaterThan(1400);
      expect(result.Fc).toBeLessThan(1800);
      expect(result.kc).toBeGreaterThan(2000);
      expect(result.source).toContain("CANONICAL_KIENZLE");
      expect(result.source).toContain("kc1_1=1800");
    });

    it("should use canonical kc1_1=1800 for steel (ISO P)", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "steel", 1.0, 0.2, 150
      );

      // Verify the canonical constant is used
      expect(result.source).toContain("kc1_1=1800");
      expect(result.source).toContain("mc=0.25");
    });

    it("should scale correctly with depth of cut", () => {
      const result1 = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "steel", 1.0, 0.2, 150
      );
      const result2 = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "steel", 2.0, 0.2, 150
      );

      // Force should double when ap doubles (linear relationship)
      expect(result2.Fc).toBeCloseTo(result1.Fc * 2, -1);
    });

    it("should apply size effect at low chip thickness", () => {
      // At very small feed, specific cutting force increases due to size effect
      const resultLowFeed = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "steel", 1.0, 0.05, 150
      );
      const resultHighFeed = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "steel", 1.0, 0.3, 150
      );

      // kc should be higher at lower feed due to h^(-mc) term
      expect(resultLowFeed.kc).toBeGreaterThan(resultHighFeed.kc);
    });

    it("should calculate correct values for different ISO groups", () => {
      const steelResult = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "steel", 1.0, 0.2, 150
      );
      const aluminumResult = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "aluminum_6061", 1.0, 0.2, 150
      );
      const titaniumResult = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "titanium_gr5", 1.0, 0.2, 150
      );

      // Force ranking: Ti > Steel > Aluminum (based on kc1_1 values)
      expect(titaniumResult.Fc).toBeGreaterThan(steelResult.Fc);
      expect(steelResult.Fc).toBeGreaterThan(aluminumResult.Fc);

      // Verify canonical constants are used
      expect(CANONICAL_KIENZLE.S.kc1_1).toBe(2800); // Titanium
      expect(CANONICAL_KIENZLE.P.kc1_1).toBe(1800); // Steel
      expect(CANONICAL_KIENZLE.N.kc1_1).toBe(700);  // Aluminum
    });
  });

  describe("Power and Torque Calculations", () => {
    it("should calculate cutting power correctly: P = Fc × Vc / 60000", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateKienzleForce(
        "steel", 2.0, 0.2, 200
      );

      // P [kW] = Fc [N] × Vc [m/min] / 60000
      const expectedPower = result.Fc * 200 / 60000;
      expect(result.power_kW).toBeCloseTo(expectedPower, 1);
    });

    it("should compute spindle torque in full analysis", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      // T [Nm] = Fc [N] × D [mm] / 2000
      const expectedTorque = result.cutting_forces.Fc.value * 50 / 2000;
      expect(result.cutting_forces.torque_Nm.value).toBeCloseTo(expectedTorque, 0);
    });
  });

  describe("Shear Plane Analysis", () => {
    it("should calculate shear plane angle using Merchant equation", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateShearPlane(6, 0.4);

      // Merchant: φ = π/4 - β/2 + α/2
      // β = atan(0.4) ≈ 21.8°, α = 6°
      // φ = 45 - 10.9 + 3 = 37.1°
      expect(result.phi_deg).toBeGreaterThan(30);
      expect(result.phi_deg).toBeLessThan(45);
      expect(result.equation).toContain("Merchant");
    });

    it("should compute shear strain from geometry", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateShearPlane(6, 0.4);

      // γ = cos(α) / [sin(φ) × cos(φ - α)]
      // Typical values: 1.5-3.0 for metals
      expect(result.gamma).toBeGreaterThan(1.0);
      expect(result.gamma).toBeLessThan(4.0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 2: TOOL LIFE TESTS (TAYLOR EQUATION)
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Tool Life", () => {
  describe("Taylor Equation", () => {
    it("should calculate tool life using canonical Taylor constants", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateTaylorLife(
        "steel", 200
      );

      // Taylor: T = (C/Vc)^(1/n) where C=350, n=0.25 for steel
      // T = (350/200)^(1/0.25) = 1.75^4 = 9.4 min
      expect(result.life_min).toBeGreaterThan(5);
      expect(result.life_min).toBeLessThan(20);
      expect(result.source).toContain("CANONICAL_TAYLOR");
      expect(result.source).toContain("C=350");
      expect(result.source).toContain("n=0.25");
    });

    it("should apply coating multiplier", () => {
      const uncoated = latheUnifiedPhysicsOrchestrationEngine.calculateTaylorLife(
        "steel", 200, "uncoated"
      );
      const coated = latheUnifiedPhysicsOrchestrationEngine.calculateTaylorLife(
        "steel", 200, "TiAlN"
      );

      // TiAlN coating has 1.5× life multiplier
      expect(coated.life_min).toBeGreaterThan(uncoated.life_min * 1.3);
      expect(coated.source).toContain("coating_mult=1.5");
    });

    it("should predict shorter life for difficult materials", () => {
      const steelLife = latheUnifiedPhysicsOrchestrationEngine.calculateTaylorLife(
        "steel", 100
      );
      const titaniumLife = latheUnifiedPhysicsOrchestrationEngine.calculateTaylorLife(
        "titanium_gr5", 100
      );

      // Titanium has lower C constant (150 vs 350)
      expect(titaniumLife.life_min).toBeLessThan(steelLife.life_min);
    });

    it("should demonstrate Taylor equation sensitivity to speed", () => {
      const life100 = latheUnifiedPhysicsOrchestrationEngine.calculateTaylorLife(
        "steel", 100
      );
      const life200 = latheUnifiedPhysicsOrchestrationEngine.calculateTaylorLife(
        "steel", 200
      );

      // Doubling Vc should reduce life by factor of 2^(1/n) = 2^4 = 16
      // But our canonical n=0.25 gives reasonable reduction
      expect(life100.life_min).toBeGreaterThan(life200.life_min * 10);
    });
  });

  describe("Extended Tool Life Model", () => {
    it("should include feed and DOC effects in full analysis", () => {
      const baseInput = createInput({
        parameters: { ...standardParams, feed_mm_rev: 0.15 }
      });
      const highFeedInput = createInput({
        parameters: { ...standardParams, feed_mm_rev: 0.35 }
      });

      const baseResult = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(baseInput);
      const highFeedResult = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(highFeedInput);

      // Higher feed should reduce tool life
      expect(highFeedResult.tool_life.extended_life_min.value).toBeLessThan(
        baseResult.tool_life.extended_life_min.value
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 3: THERMAL PHYSICS TESTS (JAEGER MODEL)
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Thermal Physics", () => {
  describe("Jaeger Moving Heat Source", () => {
    it("should calculate temperature rise using Jaeger model", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateJaegerTemperature(
        "steel", 1500, 200, 0.5
      );

      // Shear zone temp should be well above ambient but below melting
      expect(result.shear_zone_temp_C).toBeGreaterThan(200);
      expect(result.shear_zone_temp_C).toBeLessThan(1000);
      expect(result.source).toContain("Jaeger");
    });

    it("should calculate higher interface temperature than shear zone", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateJaegerTemperature(
        "steel", 1500, 200, 0.5
      );

      // Interface temp > shear zone due to friction heating
      expect(result.interface_temp_C).toBeGreaterThan(result.shear_zone_temp_C);
    });

    it("should respect material melting point limit", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateJaegerTemperature(
        "aluminum_6061", 2000, 500, 1.0
      );

      // Should not exceed melting point (~580°C for aluminum)
      expect(result.shear_zone_temp_C).toBeLessThan(600);
    });
  });

  describe("Heat Partition", () => {
    it("should partition heat between chip, tool, workpiece", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      const partition = result.thermal.heat_partition;

      // Chip typically takes 60-80%
      expect(partition.chip_pct).toBeGreaterThan(0.50);
      expect(partition.chip_pct).toBeLessThan(0.85);

      // Sum should be approximately 1.0
      const sum = partition.chip_pct + partition.tool_pct +
        partition.workpiece_pct + partition.coolant_pct;
      expect(sum).toBeCloseTo(1.0, 1);
    });

    it("should increase coolant partition with flood cooling", () => {
      const dryInput = createInput();
      const floodInput = createInput({
        coolant: { type: "flood", concentration_pct: 8, flow_rate_L_min: 20 }
      });

      const dryResult = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(dryInput);
      const floodResult = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(floodInput);

      expect(floodResult.thermal.heat_partition.coolant_pct).toBeGreaterThan(
        dryResult.thermal.heat_partition.coolant_pct
      );
    });
  });

  describe("White Layer Risk", () => {
    it("should assess white layer risk for hardened steel", () => {
      const input = createInput({
        material: "hardened_steel",
        parameters: { ...standardParams, cutting_speed_m_min: 300 }
      });
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      // High speed on hardened steel should have white layer threshold of 700C
      expect(result.thermal.white_layer_risk.threshold_C).toBe(700);
      // Risk level is one of the valid values (none is possible if temp is well below threshold)
      expect(["none", "low", "medium", "high", "critical"]).toContain(
        result.thermal.white_layer_risk.risk_level
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 4: JOHNSON-COOK FLOW STRESS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Johnson-Cook Model", () => {
  describe("Flow Stress Calculation", () => {
    it("should compute Johnson-Cook stress with all three terms", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateJohnsonCookStress(
        "steel", 0.5, 10000, 400
      );

      // Flow stress should be reasonable for steel at machining conditions
      expect(result.stress_MPa).toBeGreaterThan(500);
      expect(result.stress_MPa).toBeLessThan(1500);

      // All terms should be positive
      expect(result.terms.hardening).toBeGreaterThan(0);
      expect(result.terms.rate).toBeGreaterThan(0);
      expect(result.terms.thermal).toBeGreaterThan(0);
      expect(result.terms.thermal).toBeLessThan(1);
    });

    it("should increase stress with strain (work hardening)", () => {
      const lowStrain = latheUnifiedPhysicsOrchestrationEngine.calculateJohnsonCookStress(
        "steel", 0.1, 10000, 400
      );
      const highStrain = latheUnifiedPhysicsOrchestrationEngine.calculateJohnsonCookStress(
        "steel", 1.0, 10000, 400
      );

      expect(highStrain.stress_MPa).toBeGreaterThan(lowStrain.stress_MPa);
    });

    it("should increase stress with strain rate", () => {
      const lowRate = latheUnifiedPhysicsOrchestrationEngine.calculateJohnsonCookStress(
        "steel", 0.5, 100, 400
      );
      const highRate = latheUnifiedPhysicsOrchestrationEngine.calculateJohnsonCookStress(
        "steel", 0.5, 100000, 400
      );

      expect(highRate.stress_MPa).toBeGreaterThan(lowRate.stress_MPa);
    });

    it("should decrease stress with temperature (thermal softening)", () => {
      const coldResult = latheUnifiedPhysicsOrchestrationEngine.calculateJohnsonCookStress(
        "steel", 0.5, 10000, 200
      );
      const hotResult = latheUnifiedPhysicsOrchestrationEngine.calculateJohnsonCookStress(
        "steel", 0.5, 10000, 800
      );

      expect(hotResult.stress_MPa).toBeLessThan(coldResult.stress_MPa);
      expect(hotResult.T_star).toBeGreaterThan(coldResult.T_star);
    });

    it("should compute homologous temperature T* correctly", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateJohnsonCookStress(
        "steel", 0.5, 10000, 500
      );

      // T* = (T - T_room) / (T_melt - T_room)
      // T* = (773 - 293) / (1793 - 293) = 480/1500 ≈ 0.32
      expect(result.T_star).toBeGreaterThan(0.2);
      expect(result.T_star).toBeLessThan(0.5);
    });
  });

  describe("Adiabatic Shear Susceptibility", () => {
    it("should detect high ASB susceptibility for titanium", () => {
      const input = createInput({
        material: "titanium_gr5",
        parameters: { ...standardParams, cutting_speed_m_min: 100 }
      });
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      // Titanium has low thermal conductivity → prone to ASB
      expect(["medium", "high"]).toContain(
        result.flow_stress.adiabatic_shear_susceptibility
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 5: DEFLECTION AND DYNAMICS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Deflection & Dynamics", () => {
  describe("Tool Deflection", () => {
    it("should calculate deflection using beam theory: delta = FL³/(3EI)", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.calculateToolDeflection(
        1000, 30, 20, "carbide"
      );

      // I = π × 20⁴ / 64 = 7854 mm⁴
      // E = 600000 MPa for carbide
      // δ = 1000 × 30³ / (3 × 600000 × 7854) = 0.00191 mm
      expect(result.deflection_mm).toBeGreaterThan(0.001);
      expect(result.deflection_mm).toBeLessThan(0.01);
      expect(result.equation).toContain("δ = F×L³/(3×E×I)");
    });

    it("should increase deflection with force", () => {
      const lowForce = latheUnifiedPhysicsOrchestrationEngine.calculateToolDeflection(
        500, 30, 20
      );
      const highForce = latheUnifiedPhysicsOrchestrationEngine.calculateToolDeflection(
        1500, 30, 20
      );

      expect(highForce.deflection_mm).toBeCloseTo(lowForce.deflection_mm * 3, 2);
    });

    it("should scale with L³ (cubic relationship with overhang)", () => {
      const short = latheUnifiedPhysicsOrchestrationEngine.calculateToolDeflection(
        1000, 20, 20
      );
      const long = latheUnifiedPhysicsOrchestrationEngine.calculateToolDeflection(
        1000, 40, 20
      );

      // 40³/20³ = 8, so deflection should be ~8× larger
      expect(long.deflection_mm).toBeCloseTo(short.deflection_mm * 8, 1);
    });
  });

  describe("Part Deflection", () => {
    it("should compute part deflection for slender workpiece", () => {
      const input = createInput({
        part_length_mm: 200,  // L/D = 200/50 = 4
        parameters: { ...standardParams, workpiece_diameter_mm: 50 }
      });
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      // Slender part (L/D > 3) should have measurable deflection
      expect(result.deflection_dynamics.part_deflection_mm.value).toBeGreaterThan(0);
    });

    it("should warn for L/D > 6 without support", () => {
      const input = createInput({
        part_length_mm: 350,  // L/D = 350/50 = 7
        parameters: { ...standardParams, workpiece_diameter_mm: 50 },
        machine: { ...standardMachine, has_tailstock: false, has_steady_rest: false }
      });
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(result.deflection_dynamics.part_deflection_mm.warning).toContain("L/D");
    });
  });

  describe("Chatter Stability", () => {
    it("should assess chatter stability", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(typeof result.deflection_dynamics.chatter.is_stable).toBe("boolean");
      expect(result.deflection_dynamics.chatter.critical_depth_mm).toBeGreaterThan(0);
    });

    it("should provide stable RPM recommendations", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(Array.isArray(result.deflection_dynamics.chatter.recommended_rpm)).toBe(true);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 6: CHIP FORMATION TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Chip Formation", () => {
  describe("Chip Geometry", () => {
    it("should calculate chip thickness ratio", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      // r = sin(φ)/cos(φ-α), typically 0.3-0.8 for metals
      expect(result.chip_formation.chip_thickness_ratio).toBeGreaterThan(0.2);
      expect(result.chip_formation.chip_thickness_ratio).toBeLessThan(1.0);
    });

    it("should predict chip type based on conditions", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      const validTypes = ["continuous", "lamellar", "segmented", "discontinuous", "built_up_edge"];
      expect(validTypes).toContain(result.chip_formation.chip_type);
    });

    it("should predict discontinuous chips for cast iron", () => {
      const input = createInput({ material: "cast_iron" });
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(result.chip_formation.chip_type).toBe("discontinuous");
    });
  });

  describe("Chip Breaking", () => {
    it("should assess chip breaking conditions", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(typeof result.chip_formation.chip_breaking.will_break).toBe("boolean");
      expect(["natural", "chipbreaker", "obstruction"]).toContain(
        result.chip_formation.chip_breaking.mechanism
      );
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 7: SURFACE INTEGRITY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Surface Integrity", () => {
  describe("Surface Roughness Prediction", () => {
    it("should predict Ra using Brammertz formula", () => {
      const result = latheUnifiedPhysicsOrchestrationEngine.predictSurfaceRoughness(
        0.2, 0.8
      );

      // Ra = f²×1000/(32×r_e) = 0.2²×1000/(32×0.8) = 1.56 µm
      expect(result.Ra_um).toBeCloseTo(1.56, 1);
      expect(result.source).toContain("Brammertz");
    });

    it("should improve Ra with lower feed", () => {
      const highFeed = latheUnifiedPhysicsOrchestrationEngine.predictSurfaceRoughness(
        0.3, 0.8
      );
      const lowFeed = latheUnifiedPhysicsOrchestrationEngine.predictSurfaceRoughness(
        0.1, 0.8
      );

      // Ra scales with f², so 0.1 should give 9× better than 0.3
      expect(lowFeed.Ra_um).toBeLessThan(highFeed.Ra_um / 5);
    });

    it("should improve Ra with larger nose radius", () => {
      const smallNose = latheUnifiedPhysicsOrchestrationEngine.predictSurfaceRoughness(
        0.2, 0.4
      );
      const largeNose = latheUnifiedPhysicsOrchestrationEngine.predictSurfaceRoughness(
        0.2, 1.2
      );

      expect(largeNose.Ra_um).toBeLessThan(smallNose.Ra_um);
    });
  });

  describe("Surface Layer Analysis", () => {
    it("should predict affected layer depth", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(result.surface_integrity.surface_layer.affected_depth_um).toBeGreaterThan(0);
    });

    it("should provide hardness profile", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(result.surface_integrity.surface_layer.microhardness_profile.length).toBeGreaterThan(2);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 8: METALLURGICAL EFFECTS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Metallurgy", () => {
  describe("Residual Stress", () => {
    it("should predict residual stress type and magnitude", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(["tensile", "compressive", "mixed"]).toContain(
        result.metallurgy.residual_stress.type
      );
      expect(result.metallurgy.residual_stress.magnitude_MPa.value).toBeGreaterThan(0);
    });
  });

  describe("Work Hardening", () => {
    it("should predict work hardening depth and increase", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(result.metallurgy.work_hardening.depth_um).toBeGreaterThan(0);
      expect(result.metallurgy.work_hardening.hardness_increase_pct).toBeGreaterThan(0);
    });
  });

  describe("White Layer Formation", () => {
    it("should predict white layer for hardened steel at high speed", () => {
      const input = createInput({
        material: "hardened_steel",
        parameters: {
          ...standardParams,
          cutting_speed_m_min: 250,
          depth_of_cut_mm: 0.3
        }
      });
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      // At high speed on hardened steel, white layer is a concern
      expect(typeof result.metallurgy.white_layer.will_form).toBe("boolean");
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 9: CHEMISTRY TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Chemistry", () => {
  describe("Coolant Compatibility", () => {
    it("should assess coolant-material compatibility", () => {
      const input = createInput({
        coolant: { type: "flood", concentration_pct: 8 }
      });
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(typeof result.chemistry.coolant_compatibility.compatible).toBe("boolean");
    });

    it("should warn about low concentration on stainless", () => {
      const input = createInput({
        material: "stainless_304",
        coolant: { type: "flood", concentration_pct: 4 }
      });
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(result.chemistry.coolant_compatibility.issues.length).toBeGreaterThan(0);
    });
  });

  describe("Coating Status", () => {
    it("should check coating integrity vs temperature", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(typeof result.chemistry.coating_status.intact).toBe("boolean");
      expect(result.chemistry.coating_status.breakdown_temperature_C).toBeGreaterThan(0);
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 10: INTEGRATED ANALYSIS TESTS
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Full Integration", () => {
  describe("Complete Analysis", () => {
    it("should return comprehensive result with all sections", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      // Verify all top-level sections exist
      expect(result.cutting_forces).toBeDefined();
      expect(result.tool_life).toBeDefined();
      expect(result.thermal).toBeDefined();
      expect(result.flow_stress).toBeDefined();
      expect(result.metallurgy).toBeDefined();
      expect(result.chemistry).toBeDefined();
      expect(result.deflection_dynamics).toBeDefined();
      expect(result.chip_formation).toBeDefined();
      expect(result.surface_integrity).toBeDefined();
      expect(result.machine_check).toBeDefined();
      expect(result.assessment).toBeDefined();
      expect(result.optimization).toBeDefined();
    });

    it("should include literature references", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(result.references.length).toBeGreaterThan(5);
      expect(result.references.some(r => r.includes("Kienzle"))).toBe(true);
      expect(result.references.some(r => r.includes("Taylor"))).toBe(true);
      expect(result.references.some(r => r.includes("Johnson"))).toBe(true);
    });

    it("should validate machine capability", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(typeof result.machine_check.power_ok).toBe("boolean");
      expect(typeof result.machine_check.torque_ok).toBe("boolean");
      expect(typeof result.machine_check.rpm_ok).toBe("boolean");
      expect(typeof result.machine_check.overall_feasible).toBe("boolean");
    });

    it("should provide safety score 0-100", () => {
      const input = createInput();
      const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);

      expect(result.assessment.safety_score).toBeGreaterThanOrEqual(0);
      expect(result.assessment.safety_score).toBeLessThanOrEqual(100);
    });
  });

  describe("Multi-Material Analysis", () => {
    const materials = [
      "steel",
      "stainless_304",
      "aluminum_6061",
      "titanium_gr5",
      "cast_iron",
    ];

    materials.forEach(mat => {
      it(`should analyze ${mat} without errors`, () => {
        const input = createInput({ material: mat });
        expect(() => {
          latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);
        }).not.toThrow();
      });
    });
  });

  describe("Operation Types", () => {
    const operations: UnifiedPhysicsInput["operation"][] = [
      "roughing", "finishing", "facing", "boring", "grooving", "parting"
    ];

    operations.forEach(op => {
      it(`should handle ${op} operation`, () => {
        const input = createInput({ operation: op });
        const result = latheUnifiedPhysicsOrchestrationEngine.analyzeFullPhysics(input);
        expect(result.input_summary.operation).toBe(op);
      });
    });
  });
});

// ═══════════════════════════════════════════════════════════════════════════
// SECTION 11: PHYSICS CONSTANT VALIDATION
// ═══════════════════════════════════════════════════════════════════════════

describe("LatheUnifiedPhysicsOrchestrationEngine - Canonical Constants", () => {
  it("should use CANONICAL_KIENZLE values from constants.ts", () => {
    // Verify the engine is using canonical values
    expect(CANONICAL_KIENZLE.P.kc1_1).toBe(1800);
    expect(CANONICAL_KIENZLE.P.mc).toBe(0.25);
    expect(CANONICAL_KIENZLE.M.kc1_1).toBe(2100);
    expect(CANONICAL_KIENZLE.S.kc1_1).toBe(2800);
    expect(CANONICAL_KIENZLE.N.kc1_1).toBe(700);
    expect(CANONICAL_KIENZLE.H.kc1_1).toBe(3200);
  });

  it("should use CANONICAL_TAYLOR values from constants.ts", () => {
    expect(CANONICAL_TAYLOR.P.C).toBe(350);
    expect(CANONICAL_TAYLOR.P.n).toBe(0.25);
    expect(CANONICAL_TAYLOR.S.C).toBe(150);  // Superalloys harder to machine
    expect(CANONICAL_TAYLOR.N.C).toBe(900);  // Aluminum easier
  });

  it("should use material properties from CANONICAL_MATERIAL_DB", () => {
    expect(CANONICAL_MATERIAL_DB.steel.kc1_1).toBe(1800);
    expect(CANONICAL_MATERIAL_DB.steel.taylor_C).toBe(350);
    expect(CANONICAL_MATERIAL_DB.titanium_gr5.kc1_1).toBe(2800);
  });
});
