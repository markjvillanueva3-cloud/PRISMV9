/**
 * FeasibilityAnalysisEngine — MF-MS1 Tests
 *
 * 25+ tests covering all 3 sub-engines:
 * - Accessibility Analysis (tool reach, holder clearance, corner radius, chip evac, deflection)
 * - Workholding Viability (vise, vacuum, magnetic, chuck, safety factor, grip degradation)
 * - Rigidity Degradation (wall stiffness, floor stiffness, natural frequency, chatter risk)
 */
import { describe, it, expect } from "vitest";
import {
  FeasibilityAnalysisEngine,
  feasibilityAnalysisEngine,
  type AccessibilityFeature,
  type AccessibilityTool,
  type WorkholdingWorkpieceState,
  type ClampingConfig,
  type OperationForces,
  type RigidityMaterial,
  type RigidityWorkpieceState,
  type AccessibilityResult,
  type WorkholdingResult,
  type RigidityResult
} from "../engines/FeasibilityAnalysisEngine.js";

// ── Fixtures ────────────────────────────────────────────────────────────────

const STANDARD_TOOL: AccessibilityTool = {
  diameter_mm: 10,
  length_mm: 80,
  loc_mm: 50,
  holder_diameter_mm: 20,
  corner_radius_mm: 0,
  material: "carbide",
  flutes: 4
};

const SMALL_TOOL: AccessibilityTool = {
  diameter_mm: 3,
  length_mm: 60,
  loc_mm: 20,
  holder_diameter_mm: 12,
  material: "carbide",
  flutes: 2
};

const STOCK_200x150x50 = {
  min_x: 0, max_x: 200,
  min_y: 0, max_y: 150,
  min_z: 0, max_z: 50
};

const ALUMINUM: RigidityMaterial = {
  name: "6061-T6",
  E_GPa: 69,
  density_kg_m3: 2700,
  poisson_ratio: 0.33,
  yield_MPa: 276
};

const STEEL: RigidityMaterial = {
  name: "1045",
  E_GPa: 205,
  density_kg_m3: 7850,
  poisson_ratio: 0.29,
  yield_MPa: 530
};

function makeWorkpieceState(
  overrides?: Partial<WorkholdingWorkpieceState>
): WorkholdingWorkpieceState {
  return {
    stock: STOCK_200x150x50,
    volume_remaining_pct: 0.8,
    clamping_surfaces: [
      { zone: "bottom", area_mm2: 30000, is_machined: false, is_datum: true, flatness_um: 5 },
      { zone: "side_x_pos", area_mm2: 7500, is_machined: false, is_datum: false },
      { zone: "side_x_neg", area_mm2: 7500, is_machined: false, is_datum: false },
      { zone: "side_y_pos", area_mm2: 10000, is_machined: false, is_datum: false },
      { zone: "side_y_neg", area_mm2: 10000, is_machined: false, is_datum: false },
      { zone: "top", area_mm2: 30000, is_machined: true, is_datum: false }
    ],
    datum_surfaces: [
      { datum_id: "A", intact: true, surface_zone: "bottom" },
      { datum_id: "B", intact: true, surface_zone: "side_x_neg" }
    ],
    ...overrides
  };
}

const MODERATE_FORCES: OperationForces = {
  Fx: 300, Fy: 200, Fz: 150
};

const HEAVY_FORCES: OperationForces = {
  Fx: 2000, Fy: 1500, Fz: 800, torque_Nm: 25
};

// ── Accessibility Analysis ──────────────────────────────────────────────────

describe("FeasibilityAnalysisEngine", () => {
  describe("analyzeAccessibility", () => {
    it("should confirm accessibility for a shallow pocket with adequate tool", () => {
      const feature: AccessibilityFeature = {
        type: "pocket_closed",
        position: { x: 100, y: 75, z: 0 },
        depth_mm: 20,
        width_mm: 40,
        length_mm: 60,
        corner_radius_mm: 6
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, STANDARD_TOOL, "top"
      );
      expect(result.accessible).toBe(true);
      expect(result.limiting_factor).toBeNull();
      expect(result.corner_accessible).toBe(true);
      expect(result.holder_clear).toBe(true);
      expect(result.clearance_mm).toBeGreaterThan(0);
      expect(result.physics.E_GPa).toBe(620); // carbide
      expect(result.physics.I_mm4).toBeGreaterThan(0);
    });

    it("should detect tool reach limitation when depth exceeds LOC", () => {
      const feature: AccessibilityFeature = {
        type: "pocket_closed",
        position: { x: 50, y: 50, z: 0 },
        depth_mm: 60,  // exceeds LOC of 50mm
        width_mm: 30,
        length_mm: 50
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, STANDARD_TOOL, "top"
      );
      expect(result.accessible).toBe(false);
      expect(result.limiting_factor).toBe("tool_reach");
      expect(result.suggestions.length).toBeGreaterThan(0);
      expect(result.suggestions[0]).toContain("LOC");
    });

    it("should detect holder collision in narrow pocket at depth", () => {
      const feature: AccessibilityFeature = {
        type: "pocket_closed",
        position: { x: 50, y: 50, z: 0 },
        depth_mm: 55,  // exceeds LOC, holder enters pocket
        width_mm: 15,  // narrow — holder Ø20 won't fit
        length_mm: 50
      };
      // Use tool with shorter LOC to force holder into pocket
      const tool: AccessibilityTool = {
        ...STANDARD_TOOL,
        loc_mm: 40,
        length_mm: 100
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, tool, "top"
      );
      expect(result.holder_clear).toBe(false);
      expect(result.suggestions.some(s => s.includes("Holder"))).toBe(true);
    });

    it("should detect corner radius limitation", () => {
      const feature: AccessibilityFeature = {
        type: "pocket_closed",
        position: { x: 50, y: 50, z: 0 },
        depth_mm: 15,
        width_mm: 30,
        length_mm: 40,
        corner_radius_mm: 3  // requires R3, but tool is R5 (Ø10)
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, STANDARD_TOOL, "top"
      );
      expect(result.corner_accessible).toBe(false);
      expect(result.suggestions.some(s => s.includes("corner"))).toBe(true);
    });

    it("should flag critical chip evacuation for deep holes", () => {
      const feature: AccessibilityFeature = {
        type: "hole_blind",
        position: { x: 50, y: 50, z: 0 },
        depth_mm: 30,
        diameter_mm: 3   // depth/dia = 10:1 — critical
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, SMALL_TOOL, "top"
      );
      expect(result.depth_to_diameter_ratio).toBeGreaterThan(8);
      expect(result.suggestions.some(
        s => s.includes("critical") || s.includes("gun drill")
      )).toBe(true);
    });

    it("should flag moderate chip evacuation for medium-depth holes", () => {
      const feature: AccessibilityFeature = {
        type: "hole_blind",
        position: { x: 50, y: 50, z: 0 },
        depth_mm: 12,
        diameter_mm: 3   // depth/dia = 4:1 — moderate/difficult
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, SMALL_TOOL, "top"
      );
      expect(result.depth_to_diameter_ratio).toBeCloseTo(4, 0);
      expect(result.suggestions.length).toBeGreaterThan(0);
    });

    it("should calculate deflection using correct E for HSS tool", () => {
      const feature: AccessibilityFeature = {
        type: "slot",
        position: { x: 50, y: 50, z: 0 },
        depth_mm: 10,
        width_mm: 8
      };
      const hss_tool: AccessibilityTool = {
        ...STANDARD_TOOL,
        material: "hss"
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, hss_tool, "top"
      );
      expect(result.physics.E_GPa).toBe(210); // HSS
      // HSS deflects more than carbide at same geometry
      const carbide_result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, STANDARD_TOOL, "top"
      );
      expect(result.deflection_mm).toBeGreaterThan(carbide_result.deflection_mm);
    });

    it("should add suggestion for side approach", () => {
      const feature: AccessibilityFeature = {
        type: "profile",
        position: { x: 50, y: 50, z: 0 },
        depth_mm: 10
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, STANDARD_TOOL, "side_x_pos"
      );
      expect(result.suggestions.some(
        s => s.includes("Side approach")
      )).toBe(true);
    });

    it("should report max depth for target deflection", () => {
      const feature: AccessibilityFeature = {
        type: "pocket_closed",
        position: { x: 50, y: 50, z: 0 },
        depth_mm: 20,
        width_mm: 30,
        length_mm: 40
      };
      const result = feasibilityAnalysisEngine.analyzeAccessibility(
        feature, STANDARD_TOOL, "top"
      );
      expect(result.physics.max_depth_for_target_deflection_mm).toBeGreaterThan(0);
      expect(result.physics.estimated_force_N).toBeGreaterThan(0);
    });
  });

  // ── Workholding Viability ───────────────────────────────────────────────

  describe("analyzeWorkholding", () => {
    it("should confirm vise viability with moderate forces", () => {
      const wp = makeWorkpieceState();
      const clamping: ClampingConfig = { method: "vise" };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, MODERATE_FORCES
      );
      expect(result.viable).toBe(true);
      expect(result.safety_factor).toBeGreaterThanOrEqual(2.0);
      expect(result.grip_degradation_pct).toBeLessThan(50);
      expect(result.total_cutting_force_N).toBeGreaterThan(0);
      expect(result.physics.normal_force_N).toBeGreaterThan(0);
      expect(result.physics.friction_force_N).toBeGreaterThan(0);
    });

    it("should detect insufficient safety factor with heavy forces", () => {
      const wp = makeWorkpieceState({
        clamping_surfaces: [
          { zone: "side_x_pos", area_mm2: 500, is_machined: true, is_datum: false },
          { zone: "side_x_neg", area_mm2: 500, is_machined: true, is_datum: false }
        ]
      });
      const clamping: ClampingConfig = {
        method: "vise",
        force_per_jaw_N: 500,  // very weak clamp
        n_jaws: 2
      };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, HEAVY_FORCES
      );
      expect(result.safety_factor).toBeLessThan(2.0);
      expect(result.viable).toBe(false);
      expect(result.warnings.some(s => s.includes("Safety factor"))).toBe(true);
    });

    it("should calculate vacuum workholding correctly", () => {
      const wp = makeWorkpieceState();
      const clamping: ClampingConfig = {
        method: "vacuum",
        vacuum_pressure_kPa: 80,
        vacuum_efficiency: 0.85
      };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, MODERATE_FORCES
      );
      expect(result.physics.effective_seal_area_mm2).toBeGreaterThan(0);
      expect(result.physics.atmospheric_force_N).toBeGreaterThan(0);
      expect(result.vacuum_seal_intact).toBe(true);
    });

    it("should detect broken vacuum seal on machined bottom", () => {
      const wp = makeWorkpieceState({
        clamping_surfaces: [
          { zone: "bottom", area_mm2: 30000,
            is_machined: true, is_datum: false, flatness_um: 100 }
        ]
      });
      const clamping: ClampingConfig = { method: "vacuum" };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, MODERATE_FORCES
      );
      expect(result.vacuum_seal_intact).toBe(false);
      expect(result.warnings.some(s => s.includes("seal"))).toBe(true);
    });

    it("should calculate magnetic workholding for ferrous material", () => {
      const wp = makeWorkpieceState({
        material: { name: "1045 steel", magnetic: true, density_kg_m3: 7850 }
      });
      const clamping: ClampingConfig = {
        method: "magnetic",
        magnetic_force_per_cm2: 120
      };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, MODERATE_FORCES
      );
      expect(result.physics.normal_force_N).toBeGreaterThan(0);
    });

    it("should reject magnetic workholding for non-magnetic material", () => {
      const wp = makeWorkpieceState({
        material: { name: "6061 aluminum", magnetic: false }
      });
      const clamping: ClampingConfig = { method: "magnetic" };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, MODERATE_FORCES
      );
      expect(result.warnings.some(s => s.includes("non-magnetic"))).toBe(true);
      expect(result.physics.normal_force_N).toBe(0);
    });

    it("should warn on compromised datum surfaces", () => {
      const wp = makeWorkpieceState({
        datum_surfaces: [
          { datum_id: "A", intact: false, surface_zone: "bottom" },
          { datum_id: "B", intact: true, surface_zone: "side_x_neg" }
        ]
      });
      const clamping: ClampingConfig = { method: "vise" };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, MODERATE_FORCES
      );
      expect(result.datum_available).toBe(false);
      expect(result.warnings.some(s => s.includes("Datum"))).toBe(true);
    });

    it("should warn when volume remaining is very low", () => {
      const wp = makeWorkpieceState({ volume_remaining_pct: 0.2 });
      const clamping: ClampingConfig = { method: "vise" };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, MODERATE_FORCES
      );
      expect(result.warnings.some(
        s => s.includes("volume remaining") || s.includes("stock volume")
      )).toBe(true);
    });

    it("should calculate correct cutting force magnitude", () => {
      const forces: OperationForces = { Fx: 300, Fy: 400, Fz: 0 };
      const wp = makeWorkpieceState();
      const clamping: ClampingConfig = { method: "vise" };
      const result = feasibilityAnalysisEngine.analyzeWorkholding(
        wp, clamping, forces
      );
      expect(result.total_cutting_force_N).toBeCloseTo(500, 0); // 3-4-5
    });
  });

  // ── Rigidity Degradation ──────────────────────────────────────────────────

  describe("analyzeRigidity", () => {
    it("should analyze a standard aluminum wall", () => {
      const result = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, 5, 30, ALUMINUM, 50
      );
      expect(result.rigidity_score).toBeGreaterThan(0);
      expect(result.rigidity_score).toBeLessThanOrEqual(100);
      expect(result.natural_freq_hz).toBeGreaterThan(0);
      expect(result.wall_analysis).toHaveLength(1);
      expect(result.wall_analysis[0].thickness_mm).toBe(5);
      expect(result.wall_analysis[0].stiffness_N_per_mm).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should rate thin walls as higher chatter risk", () => {
      const thin = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, 1.0, 40, ALUMINUM, 50
      );
      const thick = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, 8.0, 40, ALUMINUM, 50
      );
      expect(thin.rigidity_score).toBeLessThan(thick.rigidity_score);
      expect(thin.natural_freq_hz).toBeLessThan(thick.natural_freq_hz);
    });

    it("should compute higher stiffness for steel vs aluminum", () => {
      const alu = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, 3, 30, ALUMINUM, 50
      );
      const steel = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, 3, 30, STEEL, 50
      );
      expect(steel.wall_analysis[0].stiffness_N_per_mm)
        .toBeGreaterThan(alu.wall_analysis[0].stiffness_N_per_mm);
    });

    it("should analyze floor stiffness for thin bottom", () => {
      const result = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, undefined, undefined, ALUMINUM,
        undefined, 2, 80, 60, // floor: 2mm thick, 80x60mm
        10000, 4
      );
      expect(result.floor_analysis).toHaveLength(1);
      expect(result.floor_analysis[0].stiffness_N_per_mm).toBeGreaterThan(0);
      expect(result.floor_analysis[0].natural_freq_hz).toBeGreaterThan(0);
    });

    it("should combine wall and floor analyses from workpiece state", () => {
      const wp: RigidityWorkpieceState = {
        stock: STOCK_200x150x50,
        volume_remaining_pct: 0.6,
        wall_sections: [
          { thickness_mm: 3, height_mm: 25, length_mm: 60 },
          { thickness_mm: 5, height_mm: 20, length_mm: 40 }
        ],
        floor_sections: [
          { thickness_mm: 4, length_mm: 80, width_mm: 60 }
        ]
      };
      const result = feasibilityAnalysisEngine.analyzeRigidity(
        wp, undefined, undefined, ALUMINUM
      );
      expect(result.wall_analysis).toHaveLength(2);
      expect(result.floor_analysis).toHaveLength(1);
      // Overall freq should be the minimum across all
      const all_freqs = [
        ...result.wall_analysis.map(w => w.natural_freq_hz),
        ...result.floor_analysis.map(f => f.natural_freq_hz)
      ];
      expect(result.natural_freq_hz).toBeCloseTo(Math.min(...all_freqs), 0);
    });

    it("should detect critical chatter when fn matches spindle frequency", () => {
      // Very thin wall with high spindle speed → resonance likely
      const result = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, 1.0, 50, ALUMINUM, 30,
        undefined, undefined, undefined,
        30000, 2  // high RPM, 2 flutes → f_tooth = 1000 Hz
      );
      // With 1mm wall, 50mm height, natural freq should be low
      expect(result.chatter_risk).not.toBe("low");
      expect(result.physics.critical_spindle_rpm).toBeGreaterThan(0);
    });

    it("should report critical spindle RPM to avoid", () => {
      const result = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, 3, 25, ALUMINUM, 50,
        undefined, undefined, undefined,
        10000, 4
      );
      expect(result.physics.critical_spindle_rpm).toBeGreaterThan(0);
      expect(result.physics.critical_spindle_rpm_2nd).toBeGreaterThan(0);
      // 2nd harmonic should be half of 1st
      expect(result.physics.critical_spindle_rpm_2nd)
        .toBeCloseTo(result.physics.critical_spindle_rpm / 2, -1);
    });

    it("should return perfect score when no thin sections exist", () => {
      const result = feasibilityAnalysisEngine.analyzeRigidity(
        undefined, undefined, undefined, ALUMINUM
      );
      expect(result.rigidity_score).toBe(100);
      expect(result.chatter_risk).toBe("low");
    });

    it("should throw on missing material", () => {
      expect(() => {
        feasibilityAnalysisEngine.analyzeRigidity(
          undefined, 3, 25, undefined as unknown as RigidityMaterial
        );
      }).toThrow("material");
    });
  });

  // ── calculate() dispatcher ────────────────────────────────────────────────

  describe("calculate()", () => {
    it("should dispatch to analyzeAccessibility", () => {
      const result = feasibilityAnalysisEngine.calculate({
        action: "analyzeAccessibility",
        feature: {
          type: "pocket_closed",
          position: { x: 50, y: 50, z: 0 },
          depth_mm: 20, width_mm: 30, length_mm: 40
        },
        tool: STANDARD_TOOL
      }) as AccessibilityResult;
      expect(result.accessible).toBeDefined();
      expect(result.physics).toBeDefined();
    });

    it("should dispatch to analyzeWorkholding", () => {
      const result = feasibilityAnalysisEngine.calculate({
        action: "analyzeWorkholding",
        workpiece_state: makeWorkpieceState(),
        clamping: { method: "vise" },
        operation_forces: MODERATE_FORCES
      }) as WorkholdingResult;
      expect(result.viable).toBeDefined();
      expect(result.safety_factor).toBeGreaterThan(0);
    });

    it("should dispatch to analyzeRigidity", () => {
      const result = feasibilityAnalysisEngine.calculate({
        action: "analyzeRigidity",
        wall_thickness_mm: 5,
        wall_height_mm: 30,
        material: ALUMINUM
      }) as RigidityResult;
      expect(result.rigidity_score).toBeDefined();
      expect(result.wall_analysis).toHaveLength(1);
    });

    it("should throw on missing feature for accessibility", () => {
      expect(() => {
        feasibilityAnalysisEngine.calculate({
          action: "analyzeAccessibility",
          tool: STANDARD_TOOL
        });
      }).toThrow("feature");
    });

    it("should throw on missing params for workholding", () => {
      expect(() => {
        feasibilityAnalysisEngine.calculate({
          action: "analyzeWorkholding",
          workpiece_state: makeWorkpieceState()
        });
      }).toThrow("workpiece_state");
    });

    it("should throw on unknown action", () => {
      expect(() => {
        feasibilityAnalysisEngine.calculate({
          action: "unknown" as any
        });
      }).toThrow("Unknown");
    });
  });

  // ── Singleton ─────────────────────────────────────────────────────────────

  describe("singleton", () => {
    it("should export a singleton instance", () => {
      expect(feasibilityAnalysisEngine).toBeInstanceOf(FeasibilityAnalysisEngine);
    });
  });
});
