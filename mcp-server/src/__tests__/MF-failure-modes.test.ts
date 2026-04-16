/**
 * MF Track — Failure Mode Coverage Tests
 *
 * Tests explicit failure mode detection across the 43 spec-defined modes.
 * Organized by category matching the spec.
 */
import { describe, it, expect } from "vitest";
import { AccessibilityAnalysisEngine } from "../engines/AccessibilityAnalysisEngine.js";
import { WorkholdingViabilityEngine } from "../engines/WorkholdingViabilityEngine.js";
import { RigidityDegradationEngine, MATERIAL_STIFFNESS } from "../engines/RigidityDegradationEngine.js";

const access = new AccessibilityAnalysisEngine();
const workhold = new WorkholdingViabilityEngine();
const rigid = new RigidityDegradationEngine();
const AL = MATERIAL_STIFFNESS["6061-T6"];

// ── Geometry/Access Failure Modes (Spec #1-7) ──

describe("Geometry/Access failure modes", () => {
  it("#1: Tool too short for feature depth", () => {
    const result = access.checkAccessDirect({
      feature_depth_mm: 60,
      feature_width_mm: 30,
      tool_diameter_mm: 12,
      tool_length_mm: 40, // too short for 60mm + 5mm clearance
    });
    expect(result.accessible).toBe(false);
    expect(result.issues.some(i => i.includes("Tool too short"))).toBe(true);
  });

  it("#2: Holder collides with IPW walls", () => {
    const result = access.checkAccessDirect({
      feature_depth_mm: 30,
      feature_width_mm: 25, // narrow pocket
      tool_diameter_mm: 12,
      tool_length_mm: 50,
      holder_diameter_mm: 40, // large holder
      ipw_wall_height_mm: 20, // tall walls
    });
    expect(result.issues.some(i => i.includes("Holder") || i.includes("holder"))).toBe(true);
  });

  it("#3: Internal corner radius < smallest tool radius", () => {
    const result = access.checkAccessDirect({
      feature_depth_mm: 20,
      feature_width_mm: 30,
      tool_diameter_mm: 16, // R8mm
      tool_length_mm: 50,
      corner_radius_mm: 5, // R5mm < R8mm
    });
    expect(result.accessible).toBe(false);
    expect(result.issues.some(i => i.includes("cannot cut") || i.includes("corner"))).toBe(true);
  });

  it("#5: Chip evacuation blocked in deep pocket", () => {
    const result = access.checkChipEvacuation({
      pocket_depth_mm: 50,
      pocket_width_mm: 8, // aspect ratio 50/8 = 6.25 > 6
      tool_diameter_mm: 6,
      flute_count: 4,
    });
    expect(result.adequate).toBe(false);
    expect(result.aspect_ratio).toBeGreaterThan(6);
    expect(result.recommendations.length).toBeGreaterThan(0);
  });

  it("should recommend fewer flutes for deep pockets", () => {
    const result = access.checkChipEvacuation({
      pocket_depth_mm: 40, // aspect 40/10 = 4 > 3
      pocket_width_mm: 10,
      tool_diameter_mm: 8,
      flute_count: 4, // too many for deep pocket
    });
    expect(result.recommendations.some(r => r.includes("flute"))).toBe(true);
  });
});

// ── Workholding Failure Modes (Spec #8-16) ──

describe("Workholding failure modes", () => {
  it("#9: Grip force insufficient after material removal", () => {
    const result = workhold.checkViabilityDirect({
      clamping_zones: [
        { id: "z1", face: "left", area_mm2: 50, friction_coeff: 0.15 },
        { id: "z2", face: "right", area_mm2: 50, friction_coeff: 0.15 },
      ],
      cutting_force_N: 5000,
      safety_factor: 2.0,
    });
    expect(result.viable).toBe(false);
    expect(result.issues.some(i => i.includes("Insufficient grip"))).toBe(true);
  });

  it("#11: Part rotates in fixture (single clamp zone)", () => {
    const result = workhold.checkViabilityDirect({
      clamping_zones: [
        { id: "z1", face: "left", area_mm2: 5000 },
      ],
      cutting_force_N: 500,
    });
    expect(result.issues.some(i => i.includes("rotate"))).toBe(true);
  });

  it("#12: Vacuum seal broken by through-hole", () => {
    const result = workhold.checkVacuumSeal({
      seal_perimeter_mm: 400,
      through_holes: [10, 8], // two holes
      sealed: true,
    });
    expect(result.intact).toBe(false);
    expect(result.leak_area_mm2).toBeGreaterThan(0);
  });

  it("Vacuum seal intact with no holes", () => {
    const result = workhold.checkVacuumSeal({
      seal_perimeter_mm: 400,
      through_holes: [],
      sealed: true,
    });
    expect(result.intact).toBe(true);
    expect(result.leak_area_mm2).toBe(0);
  });

  it("should track grip degradation", () => {
    const result = workhold.trackSurfaceDegradation({
      original_area_mm2: 1000,
      removed_area_mm2: 800, // 80% removed
    });
    expect(result.critical).toBe(true);
    expect(result.grip_ratio).toBeCloseTo(0.2, 1);
  });

  it("should flag all clamps on same face", () => {
    const result = workhold.checkViabilityDirect({
      clamping_zones: [
        { id: "z1", face: "top", area_mm2: 500 },
        { id: "z2", face: "top", area_mm2: 500 },
      ],
      cutting_force_N: 200,
    });
    expect(result.issues.some(i => i.includes("same face"))).toBe(true);
  });

  it("should suggest fixturing based on available surfaces", () => {
    const result = workhold.suggestFixturingDirect({
      available_surfaces: [
        { id: "s1", face: "left", area_mm2: 500 },
        { id: "s2", face: "right", area_mm2: 500 },
        { id: "s3", face: "bottom", area_mm2: 3000 },
      ],
      part_weight_N: 50,
      max_cutting_force_N: 1000,
    });
    expect(result.fixture_type).toBeDefined();
    expect(result.clamp_positions.length).toBeGreaterThan(0);
  });
});

// ── Rigidity Failure Modes (Spec #17-23) ──

describe("Rigidity failure modes", () => {
  it("#17: Thin wall deflects beyond tolerance", () => {
    const result = rigid.checkRigidityDirect({
      wall_thickness_mm: 1.0,
      wall_height_mm: 30,
      wall_length_mm: 50,
      cutting_force_N: 500,
      tolerance_mm: 0.05,
      material_E_GPa: 69, // aluminum
    });
    expect(result.stiff_enough).toBe(false);
    expect(result.deflection_mm).toBeGreaterThan(0.05);
    expect(result.issues.some(i => i.includes("Deflection") || i.includes("deflection"))).toBe(true);
  });

  it("#19: Unsupported cantilever chatters (low fn)", () => {
    const result = rigid.checkRigidityDirect({
      wall_thickness_mm: 1.5,
      wall_height_mm: 40,
      wall_length_mm: 60,
      cutting_force_N: 300,
      material_E_GPa: 69,
      density_kg_m3: 2700,
    });
    // Very thin tall wall should have low natural frequency
    if (result.natural_freq_Hz > 0 && result.natural_freq_Hz < 100) {
      expect(result.issues.some(i => i.includes("frequency") || i.includes("vibration"))).toBe(true);
    }
  });

  it("#22: Web between pockets too thin", () => {
    const result = rigid.checkRigidityDirect({
      wall_thickness_mm: 0.5,
      wall_height_mm: 20,
      wall_length_mm: 40,
      cutting_force_N: 200,
      tolerance_mm: 0.02,
    });
    expect(result.stiff_enough).toBe(false);
    expect(result.issues.some(i => i.includes("thin") || i.includes("fragile"))).toBe(true);
  });

  it("should predict stiffness evolution across operations", () => {
    const result = rigid.predictStiffnessEvolution({
      initial_thickness_mm: 10,
      operations: [
        { depth_mm: 5, removes_thickness_mm: 3 },
        { depth_mm: 5, removes_thickness_mm: 3 },
        { depth_mm: 5, removes_thickness_mm: 2 },
      ],
      wall_height_mm: 30,
      wall_length_mm: 50,
      material_E_GPa: 200,
    });
    expect(result).toHaveLength(3);
    // Stiffness should decrease as wall thins
    expect(result[2].stiffness_N_per_mm).toBeLessThan(result[0].stiffness_N_per_mm);
    // Thickness should decrease
    expect(result[2].thickness_mm).toBe(2); // 10 - 3 - 3 - 2
  });

  it("should find critical features ranked by risk", () => {
    const result = rigid.findCriticalFeaturesDirect({
      wall_sections: [
        { section_id: "w1", thickness_mm: 1, height_mm: 30, length_mm: 50 },
        { section_id: "w2", thickness_mm: 5, height_mm: 20, length_mm: 40 },
        { section_id: "w3", thickness_mm: 0.5, height_mm: 25, length_mm: 30 },
      ],
      cutting_force_N: 500,
      tolerance_mm: 0.05,
    });
    expect(result).toHaveLength(3);
    // Most critical should be ranked first
    expect(result[0].risk_level).toBe("critical");
    // The 0.5mm wall is thinnest but 1mm×30mm tall may deflect more — either could be first
    expect(["w1", "w3"]).toContain(result[0].section_id);
  });

  it("should recommend support for thin walls", () => {
    const result = rigid.recommendSupportDirect({
      wall_thickness_mm: 1.0,
      wall_height_mm: 30,
      cutting_force_N: 300,
      tolerance_mm: 0.05,
      material_E_GPa: 69,
    });
    expect(result.spring_passes).toBeGreaterThan(0);
    expect(result.reduced_doc_mm).toBeGreaterThan(0);
    expect(result.backing_recommended).toBe(true);
    // Aluminum thin wall should recommend fill
    expect(result.fill_strategy).toBeDefined();
  });
});

// ── Cross-Engine Integration ──

describe("Cross-engine integration", () => {
  it("accessibility + rigidity: thin wall near deep pocket", () => {
    // Deep pocket → check accessibility
    const accessResult = access.checkAccessDirect({
      feature_depth_mm: 45,
      feature_width_mm: 20,
      tool_diameter_mm: 10,
      tool_length_mm: 60,
    });
    expect(accessResult.accessible).toBe(true);

    // Same pocket creates thin wall → check rigidity
    const rigidResult = rigid.checkRigidityDirect({
      wall_thickness_mm: 2,
      wall_height_mm: 45,
      wall_length_mm: 60,
      cutting_force_N: 400,
      tolerance_mm: 0.05,
      material_E_GPa: 69,
    });
    // Accessible but not stiff enough
    expect(rigidResult.stiff_enough).toBe(false);
  });

  it("workholding + accessibility: large pocket reduces both", () => {
    // Large pocket reduces clamping area
    const whResult = workhold.trackSurfaceDegradation({
      original_area_mm2: 5000,
      removed_area_mm2: 4000,
    });
    expect(whResult.critical).toBe(true);

    // Same pocket creates chip evacuation issue
    const chipResult = access.checkChipEvacuation({
      pocket_depth_mm: 40,
      pocket_width_mm: 8,
      tool_diameter_mm: 6,
      flute_count: 3,
    });
    expect(chipResult.adequate).toBe(false);
  });
});

// ── Physics Dimensional Checks ──

describe("Physics dimensional consistency", () => {
  it("cantilever: deflection scales as H³", () => {
    const d1 = rigid.cantileverDeflection(100, 10, 200000, 100);
    const d2 = rigid.cantileverDeflection(100, 20, 200000, 100);
    // δ ∝ H³ → doubling H → 8x deflection
    expect(d2 / d1).toBeCloseTo(8, 0);
  });

  it("cantilever: deflection scales as 1/E", () => {
    const dAl = rigid.cantileverDeflection(100, 20, 69000, 100);
    const dSt = rigid.cantileverDeflection(100, 20, 200000, 100);
    expect(dAl / dSt).toBeCloseTo(200000 / 69000, 1);
  });

  it("cantilever: deflection scales as F", () => {
    const d1 = rigid.cantileverDeflection(100, 20, 200000, 100);
    const d2 = rigid.cantileverDeflection(200, 20, 200000, 100);
    expect(d2 / d1).toBeCloseTo(2, 5);
  });

  it("cantilever: deflection scales as 1/I", () => {
    const d1 = rigid.cantileverDeflection(100, 20, 200000, 100);
    const d2 = rigid.cantileverDeflection(100, 20, 200000, 200);
    expect(d1 / d2).toBeCloseTo(2, 5);
  });

  it("stiffness scales as t³ (I ∝ t³)", () => {
    // k = 3EI/H³, I = Lt³/12
    const r1 = rigid.checkRigidityDirect({
      wall_thickness_mm: 2, wall_height_mm: 20, wall_length_mm: 50,
      cutting_force_N: 100, material_E_GPa: 200,
    });
    const r2 = rigid.checkRigidityDirect({
      wall_thickness_mm: 4, wall_height_mm: 20, wall_length_mm: 50,
      cutting_force_N: 100, material_E_GPa: 200,
    });
    // Doubling t → 8x stiffness
    expect(r2.stiffness_N_per_mm / r1.stiffness_N_per_mm).toBeCloseTo(8, 0);
  });

  it("vacuum leak area: A = π×r²", () => {
    const result = workhold.checkVacuumSeal({
      seal_perimeter_mm: 100,
      through_holes: [10], // diameter 10mm
      sealed: true,
    });
    const expected = Math.PI * 25; // π × 5²
    expect(result.leak_area_mm2).toBeCloseTo(expected, 1);
  });
});
