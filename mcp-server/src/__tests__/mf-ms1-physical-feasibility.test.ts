/**
 * MF-MS1 Physical Feasibility Tests
 *
 * Tests for AccessibilityAnalysisEngine, WorkholdingViabilityEngine,
 * and RigidityDegradationEngine direct-parameter APIs.
 *
 * 40+ tests covering: all engines, all methods, physics invariants,
 * edge cases, multi-material, and cross-engine scenarios.
 */

import { describe, it, expect } from "vitest";
import { accessibilityAnalysisEngine } from "../engines/AccessibilityAnalysisEngine.js";
import { workholdingViabilityEngine } from "../engines/WorkholdingViabilityEngine.js";
import { rigidityDegradationEngine } from "../engines/RigidityDegradationEngine.js";

// ══════════════════════════════════════════════════════════════
// AccessibilityAnalysisEngine
// ══════════════════════════════════════════════════════════════

describe("AccessibilityAnalysisEngine", () => {
  describe("checkAccessDirect", () => {
    it("should pass when tool is long enough with margin", () => {
      const r = accessibilityAnalysisEngine.checkAccessDirect({
        feature_depth_mm: 20,
        feature_width_mm: 30,
        tool_diameter_mm: 10,
        tool_length_mm: 40,
      });
      expect(r.accessible).toBe(true);
      expect(r.margin_mm).toBe(15); // 40 - (20+5)
      expect(r.issues).toHaveLength(0);
    });

    it("should fail when tool is too short", () => {
      const r = accessibilityAnalysisEngine.checkAccessDirect({
        feature_depth_mm: 50,
        feature_width_mm: 20,
        tool_diameter_mm: 10,
        tool_length_mm: 30,
      });
      expect(r.accessible).toBe(false);
      expect(r.margin_mm).toBe(-25); // 30 - (50+5)
      expect(r.issues.some(i => i.includes("too short"))).toBe(true);
    });

    it("should flag corner radius violation", () => {
      const r = accessibilityAnalysisEngine.checkAccessDirect({
        feature_depth_mm: 10,
        feature_width_mm: 20,
        tool_diameter_mm: 12,
        tool_length_mm: 30,
        corner_radius_mm: 3, // tool radius 6 > 3
      });
      expect(r.accessible).toBe(false);
      expect(r.issues.some(i => i.includes("cannot cut"))).toBe(true);
    });

    it("should accept tool when corner radius is large enough", () => {
      const r = accessibilityAnalysisEngine.checkAccessDirect({
        feature_depth_mm: 10,
        feature_width_mm: 20,
        tool_diameter_mm: 6,
        tool_length_mm: 30,
        corner_radius_mm: 5, // tool radius 3 <= 5
      });
      expect(r.accessible).toBe(true);
      expect(r.issues.filter(i => i.includes("cannot cut"))).toHaveLength(0);
    });

    it("should warn on deep pocket chip evacuation (ratio > 4)", () => {
      const r = accessibilityAnalysisEngine.checkAccessDirect({
        feature_depth_mm: 50,
        feature_width_mm: 10,
        tool_diameter_mm: 8,
        tool_length_mm: 80,
      });
      expect(r.issues.some(i => i.includes("evacuation"))).toBe(true);
    });

    it("should flag critical chip evacuation (ratio > 6)", () => {
      const r = accessibilityAnalysisEngine.checkAccessDirect({
        feature_depth_mm: 70,
        feature_width_mm: 10,
        tool_diameter_mm: 8,
        tool_length_mm: 100,
      });
      expect(r.accessible).toBe(false);
      expect(r.issues.some(i => i.includes("Critical chip"))).toBe(true);
    });
  });

  describe("findMinToolDiameter", () => {
    it("should return 2x corner radius", () => {
      expect(accessibilityAnalysisEngine.findMinToolDiameter(5)).toBe(10);
      expect(accessibilityAnalysisEngine.findMinToolDiameter(3)).toBe(6);
      expect(accessibilityAnalysisEngine.findMinToolDiameter(0.5)).toBe(1);
    });

    it("should return small value for zero/negative radius", () => {
      expect(accessibilityAnalysisEngine.findMinToolDiameter(0)).toBe(0.1);
      expect(accessibilityAnalysisEngine.findMinToolDiameter(-1)).toBe(0.1);
    });
  });

  describe("checkHolderClearance", () => {
    it("should detect clear holder with margin", () => {
      const r = accessibilityAnalysisEngine.checkHolderClearance({
        holder_diameter_mm: 40,
        wall_distance_mm: 30,
        wall_height_mm: 20,
      });
      expect(r.clear).toBe(true);
      expect(r.interference_mm).toBeLessThan(0);
    });

    it("should detect holder collision", () => {
      const r = accessibilityAnalysisEngine.checkHolderClearance({
        holder_diameter_mm: 60,
        wall_distance_mm: 25,
        wall_height_mm: 20,
      });
      // Required: 60/2 + 2 = 32mm > 25mm
      expect(r.clear).toBe(false);
      expect(r.interference_mm).toBeGreaterThan(0);
    });

    it("interference = holder_r + 2 - wall_distance", () => {
      const r = accessibilityAnalysisEngine.checkHolderClearance({
        holder_diameter_mm: 50,
        wall_distance_mm: 27,
        wall_height_mm: 30,
      });
      // 50/2 + 2 - 27 = 0 — exactly at limit, considered clear
      expect(r.interference_mm).toBe(0);
      expect(r.clear).toBe(true);
    });
  });

  describe("checkChipEvacuation", () => {
    it("should be adequate for shallow pocket", () => {
      const r = accessibilityAnalysisEngine.checkChipEvacuation({
        pocket_depth_mm: 10,
        pocket_width_mm: 20,
        tool_diameter_mm: 10,
        flute_count: 3,
      });
      expect(r.adequate).toBe(true);
      expect(r.aspect_ratio).toBe(0.5);
    });

    it("should warn for deep narrow pocket", () => {
      const r = accessibilityAnalysisEngine.checkChipEvacuation({
        pocket_depth_mm: 50,
        pocket_width_mm: 10,
        tool_diameter_mm: 8,
        flute_count: 4,
      });
      expect(r.adequate).toBe(false);
      expect(r.aspect_ratio).toBe(5);
      expect(r.recommendations.length).toBeGreaterThan(0);
    });

    it("should recommend fewer flutes for deep features", () => {
      const r = accessibilityAnalysisEngine.checkChipEvacuation({
        pocket_depth_mm: 40,
        pocket_width_mm: 10,
        tool_diameter_mm: 8,
        flute_count: 4,
      });
      expect(r.recommendations.some(r => r.includes("2-flute"))).toBe(true);
    });
  });

  describe("checkAllFeatures", () => {
    it("should report all features accessible when tools fit", () => {
      const r = accessibilityAnalysisEngine.checkAllFeatures(
        [
          { id: "F1", depth_mm: 10, width_mm: 20 },
          { id: "F2", depth_mm: 15, width_mm: 25, corner_radius_mm: 5 },
        ],
        [
          { id: "T1", diameter_mm: 10, length_mm: 40 },
          { id: "T2", diameter_mm: 6, length_mm: 40 },
        ]
      );
      expect(r.all_accessible).toBe(true);
      expect(r.accessible_count).toBe(2);
      expect(r.blocked_count).toBe(0);
    });

    it("should report blocked features", () => {
      const r = accessibilityAnalysisEngine.checkAllFeatures(
        [
          { id: "F1", depth_mm: 100, width_mm: 5 }, // too deep + narrow
        ],
        [
          { id: "T1", diameter_mm: 4, length_mm: 50 }, // too short
        ]
      );
      expect(r.all_accessible).toBe(false);
      expect(r.blocked_count).toBe(1);
      expect(r.critical_issues.length).toBeGreaterThan(0);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// WorkholdingViabilityEngine
// ══════════════════════════════════════════════════════════════

describe("WorkholdingViabilityEngine", () => {
  describe("checkViabilityDirect", () => {
    it("should be viable with adequate clamping", () => {
      const r = workholdingViabilityEngine.checkViabilityDirect({
        clamping_zones: [
          { id: "Z1", face: "left", area_mm2: 1000, clamp_force_N: 5000 },
          { id: "Z2", face: "right", area_mm2: 1000, clamp_force_N: 5000 },
        ],
        cutting_force_N: 500,
      });
      expect(r.viable).toBe(true);
      expect(r.grip_margin).toBeGreaterThan(0);
      // 0.3 * (5000+5000) = 3000 > 500*2 = 1000
      expect(r.force_capacity_N).toBe(3000);
    });

    it("should fail with insufficient clamping", () => {
      const r = workholdingViabilityEngine.checkViabilityDirect({
        clamping_zones: [
          { id: "Z1", face: "left", area_mm2: 50, clamp_force_N: 100 },
        ],
        cutting_force_N: 5000,
        safety_factor: 3.0,
      });
      expect(r.viable).toBe(false);
      expect(r.grip_margin).toBeLessThan(0);
      expect(r.issues.some(i => i.includes("Insufficient"))).toBe(true);
    });

    it("should fail with no clamping zones", () => {
      const r = workholdingViabilityEngine.checkViabilityDirect({
        clamping_zones: [],
        cutting_force_N: 500,
      });
      expect(r.viable).toBe(false);
      expect(r.force_capacity_N).toBe(0);
    });

    it("should warn on single clamp zone", () => {
      const r = workholdingViabilityEngine.checkViabilityDirect({
        clamping_zones: [
          { id: "Z1", face: "bottom", area_mm2: 2000, clamp_force_N: 10000 },
        ],
        cutting_force_N: 100,
      });
      expect(r.issues.some(i => i.includes("Single clamp"))).toBe(true);
    });

    it("grip force scales with friction coefficient", () => {
      const r1 = workholdingViabilityEngine.checkViabilityDirect({
        clamping_zones: [
          { id: "Z1", face: "left", area_mm2: 500, clamp_force_N: 2000 },
        ],
        cutting_force_N: 100,
        friction_coeff: 0.2,
      });
      const r2 = workholdingViabilityEngine.checkViabilityDirect({
        clamping_zones: [
          { id: "Z1", face: "left", area_mm2: 500, clamp_force_N: 2000 },
        ],
        cutting_force_N: 100,
        friction_coeff: 0.4,
      });
      expect(r2.force_capacity_N).toBe(r1.force_capacity_N * 2);
    });
  });

  describe("trackSurfaceDegradation", () => {
    it("should track grip reduction as area is removed", () => {
      const r = workholdingViabilityEngine.trackSurfaceDegradation({
        original_area_mm2: 1000,
        removed_area_mm2: 400,
      });
      expect(r.grip_ratio).toBeCloseTo(0.6);
      expect(r.critical).toBe(false);
      // F = 0.3 * 5.0 * 600 = 900
      expect(r.remaining_grip_N).toBeCloseTo(900);
    });

    it("should be critical when > 50% removed", () => {
      const r = workholdingViabilityEngine.trackSurfaceDegradation({
        original_area_mm2: 1000,
        removed_area_mm2: 600,
      });
      expect(r.grip_ratio).toBeCloseTo(0.4);
      expect(r.critical).toBe(true);
    });

    it("should clamp at zero when fully removed", () => {
      const r = workholdingViabilityEngine.trackSurfaceDegradation({
        original_area_mm2: 1000,
        removed_area_mm2: 1500,
      });
      expect(r.remaining_grip_N).toBe(0);
      expect(r.grip_ratio).toBe(0);
      expect(r.critical).toBe(true);
    });
  });

  describe("checkVacuumSeal", () => {
    it("should be intact with no through-holes", () => {
      const r = workholdingViabilityEngine.checkVacuumSeal({
        seal_perimeter_mm: 400,
        through_holes: [],
        sealed: true,
      });
      expect(r.intact).toBe(true);
      expect(r.leak_area_mm2).toBe(0);
    });

    it("should detect broken seal from through-holes", () => {
      const r = workholdingViabilityEngine.checkVacuumSeal({
        seal_perimeter_mm: 400,
        through_holes: [10, 8], // 10mm and 8mm holes
        sealed: true,
      });
      expect(r.intact).toBe(false);
      // pi*5^2 + pi*4^2 = 78.54 + 50.27 = 128.81
      expect(r.leak_area_mm2).toBeCloseTo(
        Math.PI * 25 + Math.PI * 16, 1
      );
    });

    it("should report not intact when unsealed", () => {
      const r = workholdingViabilityEngine.checkVacuumSeal({
        seal_perimeter_mm: 400,
        through_holes: [],
        sealed: false,
      });
      expect(r.intact).toBe(false);
    });
  });

  describe("checkDatumIntegrity", () => {
    it("should detect destroyed datum from matching approach", () => {
      const r = workholdingViabilityEngine.checkDatumIntegrity({
        datum_surfaces: [
          {
            id: "D1", type: "primary", zone: "bottom",
            area_mm2: 500,
            position_mm: { x: 0, y: 0, z: 0 },
          },
        ],
        next_operation: {
          type: "pocket",
          position: { x: 0, y: 0, z: 10 },
          depth_mm: 5,
          approach: "bottom",
        },
      });
      expect(r.intact).toBe(false);
      expect(r.destroyed).toContain("D1");
    });

    it("should detect at-risk datum from proximity", () => {
      const r = workholdingViabilityEngine.checkDatumIntegrity({
        datum_surfaces: [
          {
            id: "D1", type: "secondary", zone: "left",
            area_mm2: 200,
            position_mm: { x: 10, y: 10, z: 10 },
          },
        ],
        next_operation: {
          type: "pocket",
          position: { x: 12, y: 10, z: 10 },
          depth_mm: 5,
          approach: "top", // not matching zone
        },
      });
      expect(r.intact).toBe(false);
      expect(r.at_risk).toContain("D1");
    });

    it("should be intact when operation is far from datums", () => {
      const r = workholdingViabilityEngine.checkDatumIntegrity({
        datum_surfaces: [
          {
            id: "D1", type: "primary", zone: "bottom",
            area_mm2: 500,
            position_mm: { x: 0, y: 0, z: 0 },
          },
        ],
        next_operation: {
          type: "pocket",
          position: { x: 100, y: 100, z: 100 },
          depth_mm: 5,
          approach: "top",
        },
      });
      expect(r.intact).toBe(true);
    });
  });

  describe("suggestFixturingDirect", () => {
    it("should suggest vise for parts with side surfaces", () => {
      const r = workholdingViabilityEngine.suggestFixturingDirect({
        available_surfaces: [
          { id: "S1", face: "left", area_mm2: 500 },
          { id: "S2", face: "right", area_mm2: 500 },
        ],
        part_weight_N: 50,
        max_cutting_force_N: 1000,
      });
      expect(r.fixture_type).toBe("vise");
      expect(r.min_clamp_force_N).toBeCloseTo(1000 * 2 / 0.3);
    });

    it("should suggest vacuum for large flat bottom", () => {
      const r = workholdingViabilityEngine.suggestFixturingDirect({
        available_surfaces: [
          { id: "S1", face: "bottom", area_mm2: 5000 },
          { id: "S2", face: "top", area_mm2: 5000 },
        ],
        part_weight_N: 100,
        max_cutting_force_N: 500,
      });
      expect(r.fixture_type).toBe("vacuum");
    });

    it("should warn on limited surfaces", () => {
      const r = workholdingViabilityEngine.suggestFixturingDirect({
        available_surfaces: [
          { id: "S1", face: "top", area_mm2: 50 },
        ],
        part_weight_N: 10,
        max_cutting_force_N: 200,
      });
      expect(r.warnings.some(w => w.includes("Limited"))).toBe(true);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// RigidityDegradationEngine
// ══════════════════════════════════════════════════════════════

describe("RigidityDegradationEngine", () => {
  describe("checkRigidityDirect", () => {
    it("should pass for thick wall with low force", () => {
      const r = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 10,
        wall_height_mm: 20,
        wall_length_mm: 50,
        cutting_force_N: 100,
        tolerance_mm: 0.05,
        material_E_GPa: 200, // steel
      });
      expect(r.stiff_enough).toBe(true);
      expect(r.deflection_mm).toBeLessThan(0.05);
      expect(r.natural_freq_Hz).toBeGreaterThan(0);
    });

    it("should fail for thin wall with high force", () => {
      const r = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 1,
        wall_height_mm: 50,
        wall_length_mm: 50,
        cutting_force_N: 500,
        tolerance_mm: 0.01,
        material_E_GPa: 70, // aluminum
      });
      expect(r.stiff_enough).toBe(false);
      expect(r.deflection_mm).toBeGreaterThan(0.01);
      expect(r.issues.length).toBeGreaterThan(0);
    });

    it("should handle zero thickness as infinite deflection", () => {
      const r = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 0,
        wall_height_mm: 20,
        wall_length_mm: 50,
        cutting_force_N: 100,
      });
      expect(r.stiff_enough).toBe(false);
      expect(r.deflection_mm).toBe(Infinity);
      expect(r.stiffness_N_per_mm).toBe(0);
    });

    it("deflection proportional to force (linearity)", () => {
      const base = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 5,
        wall_height_mm: 30,
        wall_length_mm: 40,
        cutting_force_N: 100,
        material_E_GPa: 200,
      });
      const doubled = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 5,
        wall_height_mm: 30,
        wall_length_mm: 40,
        cutting_force_N: 200,
        material_E_GPa: 200,
      });
      expect(doubled.deflection_mm).toBeCloseTo(base.deflection_mm * 2, 6);
    });

    it("deflection proportional to H^3 (cantilever)", () => {
      const h1 = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 5,
        wall_height_mm: 20,
        wall_length_mm: 40,
        cutting_force_N: 100,
        material_E_GPa: 200,
      });
      const h2 = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 5,
        wall_height_mm: 40,
        wall_length_mm: 40,
        cutting_force_N: 100,
        material_E_GPa: 200,
      });
      // (40/20)^3 = 8
      expect(h2.deflection_mm / h1.deflection_mm).toBeCloseTo(8, 1);
    });

    it("stiffness proportional to t^3", () => {
      const t1 = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 2,
        wall_height_mm: 30,
        wall_length_mm: 40,
        cutting_force_N: 100,
        material_E_GPa: 200,
      });
      const t2 = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 4,
        wall_height_mm: 30,
        wall_length_mm: 40,
        cutting_force_N: 100,
        material_E_GPa: 200,
      });
      // (4/2)^3 = 8
      expect(t2.stiffness_N_per_mm / t1.stiffness_N_per_mm).toBeCloseTo(8, 1);
    });

    it("should support simply-supported mode", () => {
      const r = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 5,
        wall_height_mm: 20,
        wall_length_mm: 100,
        cutting_force_N: 100,
        material_E_GPa: 200,
        support_type: "supported",
      });
      expect(r.deflection_mm).toBeGreaterThan(0);
      expect(r.stiffness_N_per_mm).toBeGreaterThan(0);
    });

    it("should support clamped plate mode", () => {
      const r = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 5,
        wall_height_mm: 20,
        wall_length_mm: 100,
        cutting_force_N: 100,
        material_E_GPa: 200,
        support_type: "clamped",
      });
      expect(r.deflection_mm).toBeGreaterThan(0);
    });

    it("should use material name for defaults", () => {
      const r = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 5,
        wall_height_mm: 30,
        wall_length_mm: 40,
        cutting_force_N: 100,
        material_name: "aluminum",
      });
      // Aluminum E=70 GPa, should deflect more than steel
      const rSteel = rigidityDegradationEngine.checkRigidityDirect({
        wall_thickness_mm: 5,
        wall_height_mm: 30,
        wall_length_mm: 40,
        cutting_force_N: 100,
        material_name: "steel",
      });
      expect(r.deflection_mm).toBeGreaterThan(rSteel.deflection_mm);
      // Ratio should be ~200/70 = 2.86
      expect(r.deflection_mm / rSteel.deflection_mm).toBeCloseTo(200 / 70, 0);
    });
  });

  describe("predictStiffnessEvolution", () => {
    it("should show decreasing stiffness as wall thins", () => {
      const r = rigidityDegradationEngine.predictStiffnessEvolution({
        initial_thickness_mm: 10,
        operations: [
          { depth_mm: 5, removes_thickness_mm: 2 },
          { depth_mm: 5, removes_thickness_mm: 2 },
          { depth_mm: 5, removes_thickness_mm: 2 },
        ],
        wall_height_mm: 30,
        wall_length_mm: 50,
        material_E_GPa: 200,
      });
      expect(r).toHaveLength(3);
      expect(r[0].thickness_mm).toBe(8);
      expect(r[1].thickness_mm).toBe(6);
      expect(r[2].thickness_mm).toBe(4);
      // Stiffness must decrease monotonically
      expect(r[0].stiffness_N_per_mm).toBeGreaterThan(r[1].stiffness_N_per_mm);
      expect(r[1].stiffness_N_per_mm).toBeGreaterThan(r[2].stiffness_N_per_mm);
    });

    it("fn should decrease with material removal", () => {
      const r = rigidityDegradationEngine.predictStiffnessEvolution({
        initial_thickness_mm: 8,
        operations: [
          { depth_mm: 5, removes_thickness_mm: 3 },
          { depth_mm: 5, removes_thickness_mm: 3 },
        ],
        wall_height_mm: 25,
        wall_length_mm: 40,
        material_E_GPa: 200,
      });
      expect(r[0].fn_Hz).toBeGreaterThan(r[1].fn_Hz);
    });

    it("should handle complete wall removal", () => {
      const r = rigidityDegradationEngine.predictStiffnessEvolution({
        initial_thickness_mm: 5,
        operations: [
          { depth_mm: 10, removes_thickness_mm: 6 },
        ],
        wall_height_mm: 20,
        wall_length_mm: 30,
      });
      expect(r[0].thickness_mm).toBe(0);
      expect(r[0].stiffness_N_per_mm).toBe(0);
      expect(r[0].deflection_at_100N_mm).toBe(Infinity);
    });
  });

  describe("findCriticalFeaturesDirect", () => {
    it("should rank by risk level (critical first)", () => {
      const r = rigidityDegradationEngine.findCriticalFeaturesDirect({
        wall_sections: [
          { section_id: "W1", thickness_mm: 1, height_mm: 40, length_mm: 50 },
          { section_id: "W2", thickness_mm: 10, height_mm: 20, length_mm: 50 },
          { section_id: "W3", thickness_mm: 3, height_mm: 30, length_mm: 50 },
        ],
        cutting_force_N: 200,
        tolerance_mm: 0.02,
        material_E_GPa: 200,
      });
      expect(r[0].section_id).toBe("W1");
      expect(r[0].risk_level).toBe("critical");
      // Thick wall should be safe
      const w2 = r.find(w => w.section_id === "W2");
      expect(w2!.risk_level).toBe("safe");
    });

    it("all sections safe with very thick walls", () => {
      const r = rigidityDegradationEngine.findCriticalFeaturesDirect({
        wall_sections: [
          { section_id: "W1", thickness_mm: 20, height_mm: 10, length_mm: 50 },
        ],
        cutting_force_N: 50,
        tolerance_mm: 0.1,
      });
      expect(r[0].risk_level).toBe("safe");
    });
  });

  describe("recommendSupportDirect", () => {
    it("should recommend backing for tall thin wall", () => {
      const r = rigidityDegradationEngine.recommendSupportDirect({
        wall_thickness_mm: 1.5,
        wall_height_mm: 25,
        cutting_force_N: 200,
        tolerance_mm: 0.02,
      });
      expect(r.backing_recommended).toBe(true);
      expect(r.spring_passes).toBeGreaterThanOrEqual(3);
      expect(r.reduced_doc_mm).toBeLessThan(1);
    });

    it("should suggest fill strategy for extreme thin wall", () => {
      const r = rigidityDegradationEngine.recommendSupportDirect({
        wall_thickness_mm: 0.8,
        wall_height_mm: 20,
        cutting_force_N: 100,
        tolerance_mm: 0.01,
      });
      expect(r.fill_strategy).toBeDefined();
      expect(r.spring_passes).toBe(5);
    });

    it("should suggest ice/wax for thin aluminum walls", () => {
      const r = rigidityDegradationEngine.recommendSupportDirect({
        wall_thickness_mm: 1.5,
        wall_height_mm: 15,
        cutting_force_N: 100,
        tolerance_mm: 0.02,
        material_name: "aluminum",
      });
      expect(r.fill_strategy).toBe("ice_or_wax_fill");
    });

    it("should not need backing for thick short wall", () => {
      const r = rigidityDegradationEngine.recommendSupportDirect({
        wall_thickness_mm: 10,
        wall_height_mm: 8,
        cutting_force_N: 300,
        tolerance_mm: 0.05,
      });
      expect(r.backing_recommended).toBe(false);
      expect(r.fill_strategy).toBeUndefined();
    });
  });

  describe("multi-material deflection ratios", () => {
    it("aluminum deflects ~2.86x more than steel", () => {
      const check = (E: number) =>
        rigidityDegradationEngine.checkRigidityDirect({
          wall_thickness_mm: 5,
          wall_height_mm: 30,
          wall_length_mm: 40,
          cutting_force_N: 100,
          material_E_GPa: E,
        });
      const steel = check(200);
      const alum = check(70);
      const ti = check(114);
      expect(alum.deflection_mm / steel.deflection_mm).toBeCloseTo(200 / 70, 1);
      expect(ti.deflection_mm / steel.deflection_mm).toBeCloseTo(200 / 114, 1);
    });
  });
});

// ══════════════════════════════════════════════════════════════
// Cross-Engine Scenarios
// ══════════════════════════════════════════════════════════════

describe("Cross-engine scenarios", () => {
  it("thin wall: rigidity + workholding + accessibility combined", () => {
    // Scenario: 2mm thin wall, 40mm tall pocket, 30mm wide
    // Check accessibility
    const access = accessibilityAnalysisEngine.checkAccessDirect({
      feature_depth_mm: 40,
      feature_width_mm: 30,
      tool_diameter_mm: 10,
      tool_length_mm: 60,
      holder_diameter_mm: 32,
    });
    expect(access.accessible).toBe(true);

    // Check rigidity of the resulting thin wall
    const rigid = rigidityDegradationEngine.checkRigidityDirect({
      wall_thickness_mm: 2,
      wall_height_mm: 40,
      wall_length_mm: 30,
      cutting_force_N: 300,
      tolerance_mm: 0.02,
      material_name: "aluminum",
    });
    // 2mm wall at 40mm height in aluminum = very flexible
    expect(rigid.stiff_enough).toBe(false);
    expect(rigid.issues.length).toBeGreaterThan(0);

    // Get support recommendation
    const support = rigidityDegradationEngine.recommendSupportDirect({
      wall_thickness_mm: 2,
      wall_height_mm: 40,
      cutting_force_N: 300,
      tolerance_mm: 0.02,
      material_name: "aluminum",
    });
    expect(support.backing_recommended).toBe(true);

    // Check workholding after material removal
    const grip = workholdingViabilityEngine.trackSurfaceDegradation({
      original_area_mm2: 2000,
      removed_area_mm2: 1200, // 60% removed from pocket
    });
    expect(grip.grip_ratio).toBeCloseTo(0.4);
    expect(grip.critical).toBe(true);
  });

  it("progressive operation sequence: stiffness degrades", () => {
    // Track wall through 4 operations
    const evolution = rigidityDegradationEngine.predictStiffnessEvolution({
      initial_thickness_mm: 12,
      operations: [
        { depth_mm: 20, removes_thickness_mm: 3 },
        { depth_mm: 20, removes_thickness_mm: 3 },
        { depth_mm: 20, removes_thickness_mm: 3 },
        { depth_mm: 20, removes_thickness_mm: 2 },
      ],
      wall_height_mm: 40,
      wall_length_mm: 60,
      material_name: "steel",
    });

    // After each op, check if tool can still reach
    for (const step of evolution) {
      expect(step.thickness_mm).toBeGreaterThanOrEqual(0);
    }

    // Final wall = 12 - 3 - 3 - 3 - 2 = 1mm
    expect(evolution[3].thickness_mm).toBe(1);

    // Stiffness ratio: (12^3)/(1^3) = 1728
    const stiffRatio = evolution[0].stiffness_N_per_mm > 0
      ? evolution[0].stiffness_N_per_mm / evolution[3].stiffness_N_per_mm
      : Infinity;
    // First op: t=9, last: t=1, ratio = 9^3/1^3 = 729
    expect(stiffRatio).toBeCloseTo(729, 0);

    // Workholding degradation tracks alongside
    const grip = workholdingViabilityEngine.trackSurfaceDegradation({
      original_area_mm2: 3000,
      removed_area_mm2: 2400, // 80% of surface gone
    });
    expect(grip.critical).toBe(true);
  });

  it("vacuum fixture + through-hole = seal failure", () => {
    // Part starts on vacuum
    const seal = workholdingViabilityEngine.checkVacuumSeal({
      seal_perimeter_mm: 600,
      through_holes: [],
      sealed: true,
    });
    expect(seal.intact).toBe(true);

    // After drilling through-holes
    const sealAfter = workholdingViabilityEngine.checkVacuumSeal({
      seal_perimeter_mm: 600,
      through_holes: [12, 12, 8],
      sealed: true,
    });
    expect(sealAfter.intact).toBe(false);
    expect(sealAfter.leak_area_mm2).toBeGreaterThan(0);
  });
});
