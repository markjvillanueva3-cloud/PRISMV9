/**
 * MF-MS1: Physical Feasibility Engines — Comprehensive Tests
 *
 * Tests for AccessibilityAnalysisEngine, WorkholdingViabilityEngine,
 * and RigidityDegradationEngine with physics validation.
 */

import { describe, it, expect } from "vitest";
import {
  AccessibilityAnalysisEngine,
  type DirectAccessParams,
} from "../engines/AccessibilityAnalysisEngine.js";
import {
  WorkholdingViabilityEngine,
  type WorkholdingConfig,
} from "../engines/WorkholdingViabilityEngine.js";
import {
  RigidityDegradationEngine,
  MATERIAL_STIFFNESS,
  type MaterialStiffness,
} from "../engines/RigidityDegradationEngine.js";

describe("MF-MS1: Accessibility Analysis Engine", () => {
  const engine = new AccessibilityAnalysisEngine();

  describe("checkAccessDirect", () => {
    it("should pass when tool can reach feature", () => {
      const params: DirectAccessParams = {
        feature_depth_mm: 30,
        feature_width_mm: 20,
        tool_diameter_mm: 10,
        tool_length_mm: 50,  // > 30 + 5mm clearance
      };

      const result = engine.checkAccessDirect(params);

      expect(result.accessible).toBe(true);
      expect(result.margin_mm).toBeGreaterThan(0);
      expect(result.issues.length).toBe(0);
    });

    it("should fail when tool too short", () => {
      const params: DirectAccessParams = {
        feature_depth_mm: 50,
        feature_width_mm: 20,
        tool_diameter_mm: 10,
        tool_length_mm: 40,  // < 50 + 5mm clearance
      };

      const result = engine.checkAccessDirect(params);

      expect(result.accessible).toBe(false);
      expect(result.issues.some(i => i.toLowerCase().includes("tool too short"))).toBe(true);
    });

    it("should detect holder collision risk", () => {
      const params: DirectAccessParams = {
        feature_depth_mm: 20,
        feature_width_mm: 15,
        tool_diameter_mm: 10,
        tool_length_mm: 50,
        holder_diameter_mm: 40,  // Large holder
        ipw_wall_height_mm: 30,  // Tall walls
      };

      const result = engine.checkAccessDirect(params);

      // Holder collision should be flagged
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should warn on high aspect ratio pockets", () => {
      const params: DirectAccessParams = {
        feature_depth_mm: 50,
        feature_width_mm: 10,  // Aspect ratio = 5 (> 4)
        tool_diameter_mm: 8,
        tool_length_mm: 60,
      };

      const result = engine.checkAccessDirect(params);

      // Should have aspect ratio warning
      expect(result.issues.some(i => i.toLowerCase().includes("aspect") || i.toLowerCase().includes("chip"))).toBe(true);
    });

    it("should detect corner radius issues", () => {
      const params: DirectAccessParams = {
        feature_depth_mm: 20,
        feature_width_mm: 20,
        tool_diameter_mm: 12,  // Tool radius = 6mm
        tool_length_mm: 50,
        corner_radius_mm: 3,   // Corner radius < tool radius
      };

      const result = engine.checkAccessDirect(params);

      expect(result.issues.some(i => i.toLowerCase().includes("corner") || i.toLowerCase().includes("radius"))).toBe(true);
    });

    it("should provide suggestions for issues", () => {
      const params: DirectAccessParams = {
        feature_depth_mm: 60,
        feature_width_mm: 10,
        tool_diameter_mm: 8,
        tool_length_mm: 50,  // Too short
      };

      const result = engine.checkAccessDirect(params);

      expect(result.suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("findMinToolDiameter", () => {
    it("should find minimum tool diameter for corner radius", () => {
      // Feature corner radius limits max tool diameter
      // Method takes corner_radius_mm directly and returns diameter
      const result = engine.findMinToolDiameter(3);  // 3mm corner radius

      expect(result).toBeDefined();
      expect(typeof result).toBe("number");
      // Tool diameter <= 2 × corner_radius = 6mm
      expect(result).toBeLessThanOrEqual(6);
    });
  });

  describe("checkHolderClearance", () => {
    it("should detect holder interference", () => {
      const result = engine.checkHolderClearance({
        holder_diameter_mm: 50,
        wall_distance_mm: 20,  // Holder radius (25) > wall distance
        wall_height_mm: 30,
      });

      expect(result.clear).toBe(false);
      expect(result.interference_mm).toBeGreaterThan(0);
    });

    it("should pass when holder clears wall", () => {
      const result = engine.checkHolderClearance({
        holder_diameter_mm: 30,
        wall_distance_mm: 25,  // Holder radius (15) + margin < wall distance
        wall_height_mm: 20,
      });

      expect(result.clear).toBe(true);
    });
  });

  describe("checkChipEvacuation", () => {
    it("should warn on deep narrow pockets", () => {
      const result = engine.checkChipEvacuation({
        pocket_depth_mm: 50,
        pocket_width_mm: 10,  // Aspect ratio = 5
        tool_diameter_mm: 8,
        flute_count: 3,
      });

      expect(result.adequate).toBe(false);
      expect(result.aspect_ratio).toBeCloseTo(5, 1);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should pass for shallow pockets", () => {
      const result = engine.checkChipEvacuation({
        pocket_depth_mm: 10,
        pocket_width_mm: 30,  // Aspect ratio = 0.33
        tool_diameter_mm: 12,
        flute_count: 4,
      });

      expect(result.adequate).toBe(true);
      expect(result.aspect_ratio).toBeLessThan(1);
    });
  });
});

describe("MF-MS1: Workholding Viability Engine", () => {
  const engine = new WorkholdingViabilityEngine();

  describe("checkViabilityDirect", () => {
    it("should calculate grip force with friction coefficient", () => {
      const result = engine.checkViabilityDirect({
        clamping_zones: [
          { id: "bottom", face: "bottom", area_mm2: 5000, clamp_force_N: 10000 },
        ],
        cutting_force_N: 500,
        friction_coeff: 0.3,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("viable");
      expect(result).toHaveProperty("force_capacity_N");
      expect(result.force_capacity_N).toBeGreaterThan(0);
    });

    it("should detect insufficient grip", () => {
      const result = engine.checkViabilityDirect({
        clamping_zones: [
          { id: "bottom", face: "bottom", area_mm2: 100, clamp_force_N: 100 },
        ],
        cutting_force_N: 2000,  // High cutting force
        safety_factor: 2.0,
      });

      expect(result.viable).toBe(false);
      expect(result.issues.length).toBeGreaterThan(0);
    });

    it("should account for different fixture friction", () => {
      const lowFriction = engine.checkViabilityDirect({
        clamping_zones: [
          { id: "z1", face: "bottom", area_mm2: 5000, clamp_force_N: 10000 },
        ],
        cutting_force_N: 500,
        friction_coeff: 0.15,
      });

      const highFriction = engine.checkViabilityDirect({
        clamping_zones: [
          { id: "z1", face: "bottom", area_mm2: 5000, clamp_force_N: 10000 },
        ],
        cutting_force_N: 500,
        friction_coeff: 0.30,
      });

      // Higher friction = more grip capacity
      expect(highFriction.force_capacity_N).toBeGreaterThan(lowFriction.force_capacity_N);
    });
  });

  describe("trackSurfaceDegradation", () => {
    it("should track grip degradation as material is removed", () => {
      const result = engine.trackSurfaceDegradation({
        original_area_mm2: 5000,
        removed_area_mm2: 2000,
        friction_coeff: 0.3,
        clamp_pressure_MPa: 5.0,
      });

      expect(result).toBeDefined();
      expect(result.grip_ratio).toBeCloseTo(0.6, 1);  // 60% remaining
      expect(result.critical).toBe(false);  // > 50%
    });

    it("should flag critical when grip ratio < 50%", () => {
      const result = engine.trackSurfaceDegradation({
        original_area_mm2: 5000,
        removed_area_mm2: 3000,  // 40% remaining
      });

      expect(result.critical).toBe(true);
    });
  });

  describe("checkVacuumSeal", () => {
    it("should detect broken seal from through-holes", () => {
      const result = engine.checkVacuumSeal({
        seal_perimeter_mm: 400,
        through_holes: [10, 8],  // Two holes
        sealed: true,
      });

      expect(result.intact).toBe(false);
      expect(result.leak_area_mm2).toBeGreaterThan(0);
    });

    it("should pass when no through-holes", () => {
      const result = engine.checkVacuumSeal({
        seal_perimeter_mm: 400,
        through_holes: [],
        sealed: true,
      });

      expect(result.intact).toBe(true);
      expect(result.leak_area_mm2).toBe(0);
    });
  });

  describe("suggestFixturingDirect", () => {
    it("should recommend fixture based on part geometry with large bottom surface", () => {
      // Large bottom area > 5000 mm2 => vacuum fixture
      const result = engine.suggestFixturingDirect({
        max_cutting_force_N: 500,
        available_surfaces: [
          { face: "bottom", area_mm2: 10000 },  // Large flat bottom
          { face: "left", area_mm2: 1000 },
          { face: "right", area_mm2: 1000 },
        ],
      });

      expect(result).toHaveProperty("fixture_type");
      expect(result).toHaveProperty("clamp_positions");
      expect(result).toHaveProperty("min_clamp_force_N");
      expect(result.fixture_type).toBe("vacuum");
      expect(result.min_clamp_force_N).toBeGreaterThan(0);
    });

    it("should recommend vise for parts with parallel left/right faces", () => {
      // Left/right faces > 200 mm2 => vise
      const result = engine.suggestFixturingDirect({
        max_cutting_force_N: 300,
        available_surfaces: [
          { face: "bottom", area_mm2: 500 },   // Small bottom
          { face: "left", area_mm2: 400 },     // > 200
          { face: "right", area_mm2: 400 },    // > 200
        ],
      });

      expect(result.fixture_type).toBe("vise");
      expect(result.clamp_positions).toContain("left face");
      expect(result.clamp_positions).toContain("right face");
    });
  });
});

describe("MF-MS1: Rigidity Degradation Engine", () => {
  const engine = new RigidityDegradationEngine();

  describe("MATERIAL_STIFFNESS constants", () => {
    it("should have valid material properties", () => {
      expect(MATERIAL_STIFFNESS["6061-T6"]).toBeDefined();
      expect(MATERIAL_STIFFNESS["4140"]).toBeDefined();
      expect(MATERIAL_STIFFNESS["304SS"]).toBeDefined();

      for (const [name, props] of Object.entries(MATERIAL_STIFFNESS)) {
        expect(props.elastic_modulus_GPa).toBeGreaterThan(0);
        expect(props.density_kg_m3).toBeGreaterThan(0);
      }
    });

    it("should have correct order of magnitude for modulus", () => {
      // Steel ~200 GPa, Aluminum ~70 GPa, Titanium ~110 GPa
      expect(MATERIAL_STIFFNESS["4140"].elastic_modulus_GPa).toBeCloseTo(205, 0);
      expect(MATERIAL_STIFFNESS["6061-T6"].elastic_modulus_GPa).toBeCloseTo(69, 0);
      expect(MATERIAL_STIFFNESS["Ti-6Al-4V"].elastic_modulus_GPa).toBeCloseTo(114, 0);
    });
  });

  describe("checkRigidityDirect", () => {
    it("should calculate cantilever deflection", () => {
      const result = engine.checkRigidityDirect({
        wall_height_mm: 30,
        wall_thickness_mm: 2,
        wall_length_mm: 50,
        cutting_force_N: 200,
        material_E_GPa: 69,  // Aluminum
        tolerance_mm: 0.1,
      });

      expect(result).toBeDefined();
      expect(result).toHaveProperty("deflection_mm");
      expect(result).toHaveProperty("stiff_enough");
      expect(result.deflection_mm).toBeGreaterThan(0);
    });

    it("should flag excessive deflection for thin walls", () => {
      const result = engine.checkRigidityDirect({
        wall_height_mm: 50,
        wall_thickness_mm: 0.5,  // Very thin
        wall_length_mm: 30,
        cutting_force_N: 300,
        material_E_GPa: 69,
        tolerance_mm: 0.05,
      });

      expect(result.stiff_enough).toBe(false);
      expect(result.deflection_mm).toBeGreaterThan(0.05);
    });

    it("should show steel deflects less than aluminum", () => {
      const baseParams = {
        wall_height_mm: 30,
        wall_thickness_mm: 2,
        wall_length_mm: 50,
        cutting_force_N: 200,
        tolerance_mm: 0.1,
      };

      const alResult = engine.checkRigidityDirect({
        ...baseParams,
        material_E_GPa: 69,  // Aluminum
      });

      const steelResult = engine.checkRigidityDirect({
        ...baseParams,
        material_E_GPa: 205,  // Steel
      });

      // Steel has ~3x the modulus of aluminum
      expect(steelResult.deflection_mm).toBeLessThan(alResult.deflection_mm);
    });

    it("should calculate natural frequency", () => {
      const result = engine.checkRigidityDirect({
        wall_height_mm: 30,
        wall_thickness_mm: 3,
        wall_length_mm: 50,
        cutting_force_N: 100,
        material_E_GPa: 200,
        density_kg_m3: 7850,
      });

      expect(result.natural_freq_Hz).toBeGreaterThan(0);
      // Typical thin wall frequencies in 100s-1000s Hz range
      expect(result.natural_freq_Hz).toBeGreaterThan(50);
    });

    it("should decrease frequency as wall gets taller", () => {
      const baseParams = {
        wall_thickness_mm: 3,
        wall_length_mm: 50,
        cutting_force_N: 100,
        material_E_GPa: 200,
      };

      const shortResult = engine.checkRigidityDirect({
        ...baseParams,
        wall_height_mm: 20,
      });

      const tallResult = engine.checkRigidityDirect({
        ...baseParams,
        wall_height_mm: 40,
      });

      // Taller wall = lower natural frequency
      expect(tallResult.natural_freq_Hz).toBeLessThan(shortResult.natural_freq_Hz);
    });
  });

  describe("recommendSupportDirect", () => {
    it("should suggest support for thin walls", () => {
      const result = engine.recommendSupportDirect({
        wall_thickness_mm: 0.8,
        wall_height_mm: 40,
        cutting_force_N: 100,
        tolerance_mm: 0.05,
        material_E_GPa: 69,
      });

      expect(result).toBeDefined();
      expect(result.spring_passes).toBeGreaterThan(0);
      expect(result.reduced_doc_mm).toBeGreaterThan(0);
      expect(result.backing_recommended).toBe(true);  // Thin wall needs backing
    });

    it("should recommend fill strategy for very thin walls", () => {
      const result = engine.recommendSupportDirect({
        wall_thickness_mm: 0.5,
        wall_height_mm: 20,
        cutting_force_N: 50,
        tolerance_mm: 0.02,
        material_E_GPa: 69,
      });

      expect(result.fill_strategy).toBeDefined();  // Should recommend wax/ice fill
    });

    it("should not recommend backing for thick walls", () => {
      const result = engine.recommendSupportDirect({
        wall_thickness_mm: 10,  // Thick wall
        wall_height_mm: 20,
        cutting_force_N: 200,
        tolerance_mm: 0.1,
      });

      expect(result.backing_recommended).toBe(false);
    });
  });

  describe("physics validation", () => {
    it("should use correct cantilever formula: δ = F×H³/(3×E×I)", () => {
      // Manual calculation for verification
      // Using mm units throughout since engine uses mm
      const F = 100;  // N
      const H = 30;   // mm
      const E = 200 * 1e3;  // 200 GPa in MPa
      const t = 3;    // mm
      const L = 50;   // mm
      const I = (L * Math.pow(t, 3)) / 12;  // mm^4

      // delta = F*H^3 / (3*E*I) - all in mm/MPa consistent units
      const expectedDeflection_mm = (F * Math.pow(H, 3)) / (3 * E * I);

      const result = engine.checkRigidityDirect({
        wall_height_mm: 30,
        wall_thickness_mm: 3,
        wall_length_mm: 50,
        cutting_force_N: 100,
        material_E_GPa: 200,
        tolerance_mm: 1,
      });

      expect(result.deflection_mm).toBeCloseTo(expectedDeflection_mm, 5);
    });
  });
});
