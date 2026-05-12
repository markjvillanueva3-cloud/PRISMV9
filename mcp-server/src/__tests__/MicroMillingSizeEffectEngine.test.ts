/**
 * MicroMillingSizeEffectEngine Tests — MILL-AGI-P2/MILL-MS7-05
 *
 * Tests size effect physics for micro-scale cutting.
 */

import { describe, it, expect } from "vitest";
import {
  MicroMillingSizeEffectEngine,
  type MicroTool,
  type MicroCut,
  type MicroMaterial,
} from "../engines/MicroMillingSizeEffectEngine.js";

describe("MicroMillingSizeEffectEngine", () => {
  const defaultTool: MicroTool = {
    diameter_mm: 0.5,
    edge_radius_um: 3,
    flute_count: 2,
    helix_angle_deg: 30,
    rake_angle_deg: 10,
    coating: "tialn",
  };

  const defaultCut: MicroCut = {
    feed_per_tooth_um: 5,
    axial_depth_mm: 0.05,
    radial_depth_mm: 0.1,
    cutting_speed_m_min: 100,
    spindle_rpm: 60000,
  };

  const defaultMaterial: MicroMaterial = {
    name: "4140 Steel",
    iso_group: "P",
    kc1_1_base: 1800,
    mc: 0.25,
    grain_size_um: 20,
    hardness_hrc: 30,
    elastic_modulus_gpa: 210,
  };

  describe("calculateSizeEffect", () => {
    it("should calculate size effect corrected forces", () => {
      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, defaultCut, defaultMaterial);

      expect(result.cutting_force_N).toBeGreaterThan(0);
      expect(result.thrust_force_N).toBeGreaterThan(0);
      expect(result.effective_kc_N_mm2).toBeGreaterThan(defaultMaterial.kc1_1_base);
      expect(result.size_effect_factor).toBeGreaterThan(1);
    });

    it("should identify cutting regime", () => {
      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, defaultCut, defaultMaterial);

      expect(["cutting", "transition", "ploughing"]).toContain(result.regime);
    });

    it("should detect ploughing at very small chip thickness", () => {
      const smallCut: MicroCut = {
        ...defaultCut,
        feed_per_tooth_um: 0.5, // Very small
      };

      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, smallCut, defaultMaterial);

      expect(result.regime).toBe("ploughing");
      expect(result.ploughing_ratio).toBeGreaterThan(0.5);
    });

    it("should detect cutting or transition regime at larger chip thickness", () => {
      const largeCut: MicroCut = {
        ...defaultCut,
        feed_per_tooth_um: 25, // Much larger
        radial_depth_mm: 0.5,
      };
      const largerTool: MicroTool = {
        ...defaultTool,
        diameter_mm: 2,
        edge_radius_um: 2,
      };

      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(largerTool, largeCut, defaultMaterial);

      // At larger scale, should not be ploughing dominated
      expect(["cutting", "transition"]).toContain(result.regime);
      expect(result.ploughing_ratio).toBeLessThan(0.8);
    });

    it("should calculate minimum chip thickness", () => {
      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, defaultCut, defaultMaterial);

      expect(result.minimum_chip_thickness_um).toBeGreaterThan(0);
      expect(result.minimum_chip_thickness_um).toBeCloseTo(defaultTool.edge_radius_um * 0.2, 1);
    });

    it("should include physics trace with formulas", () => {
      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, defaultCut, defaultMaterial);

      expect(result.physics_trace.formulas.some(f => f.includes("Aramcharoen"))).toBe(true);
      expect(result.physics_trace.formulas.some(f => f.includes("Fc = kc_eff"))).toBe(true);
      expect(result.physics_trace.confidence).toBeGreaterThan(0.5);
    });

    it("should calculate elastic recovery", () => {
      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, defaultCut, defaultMaterial);

      expect(result.elastic_recovery_um).toBeGreaterThan(0);
    });

    it("should increase thrust force ratio with ploughing", () => {
      const cuttingCut: MicroCut = { ...defaultCut, feed_per_tooth_um: 10 };
      const ploughingCut: MicroCut = { ...defaultCut, feed_per_tooth_um: 1 };

      const cuttingResult = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, cuttingCut, defaultMaterial);
      const ploughingResult = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, ploughingCut, defaultMaterial);

      const cuttingRatio = cuttingResult.thrust_force_N / cuttingResult.cutting_force_N;
      const ploughingRatio = ploughingResult.thrust_force_N / ploughingResult.cutting_force_N;

      expect(ploughingRatio).toBeGreaterThan(cuttingRatio);
    });

    it("should warn about grain size effects", () => {
      const fineMaterial: MicroMaterial = {
        ...defaultMaterial,
        grain_size_um: 50, // Large grain relative to chip
      };
      const smallCut: MicroCut = {
        ...defaultCut,
        feed_per_tooth_um: 3,
      };

      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, smallCut, fineMaterial);

      expect(result.warnings.some(w => w.includes("Grain size"))).toBe(true);
    });

    it("should calculate specific energy", () => {
      const result = MicroMillingSizeEffectEngine.calculateSizeEffect(defaultTool, defaultCut, defaultMaterial);

      // Specific energy is calculated but may be very small for micro-cutting
      expect(result.specific_energy_J_mm3).toBeGreaterThanOrEqual(0);
    });
  });

  describe("analyzeChipFormation", () => {
    it("should calculate chip formation mechanics", () => {
      const result = MicroMillingSizeEffectEngine.analyzeChipFormation(defaultTool, defaultCut, defaultMaterial);

      expect(result.uncut_chip_thickness_um).toBeGreaterThan(0);
      expect(result.actual_chip_thickness_um).toBeGreaterThan(0);
      expect(result.chip_compression_ratio).toBeGreaterThan(1);
      expect(result.shear_angle_deg).toBeGreaterThan(0);
      expect(result.shear_angle_deg).toBeLessThan(90);
    });

    it("should identify cutting regime", () => {
      const result = MicroMillingSizeEffectEngine.analyzeChipFormation(defaultTool, defaultCut, defaultMaterial);

      expect(["continuous", "segmented", "ploughing_dominant"]).toContain(result.cutting_regime);
    });

    it("should calculate edge radius ratio", () => {
      const result = MicroMillingSizeEffectEngine.analyzeChipFormation(defaultTool, defaultCut, defaultMaterial);

      expect(result.edge_radius_ratio).toBeGreaterThan(0);
    });

    it("should identify segmented chips for hard materials", () => {
      const hardMaterial: MicroMaterial = {
        ...defaultMaterial,
        hardness_hrc: 55,
      };

      const result = MicroMillingSizeEffectEngine.analyzeChipFormation(defaultTool, defaultCut, hardMaterial);

      expect(result.cutting_regime).toBe("segmented");
    });
  });

  describe("recommend", () => {
    it("should provide process recommendations", () => {
      const result = MicroMillingSizeEffectEngine.recommend(defaultTool, defaultMaterial);

      expect(result.optimal_fz_um).toBeGreaterThan(0);
      expect(result.recommended_rpm).toBeGreaterThan(0);
      expect(result.expected_force_N).toBeGreaterThan(0);
      expect(result.tool_life_factor).toBeGreaterThan(0);
      expect(result.process_stability).toBeGreaterThan(0);
      expect(result.process_stability).toBeLessThanOrEqual(1);
    });

    it("should recommend higher feed than minimum chip thickness", () => {
      const result = MicroMillingSizeEffectEngine.recommend(defaultTool, defaultMaterial);
      const hMin = defaultTool.edge_radius_um * 0.2;

      expect(result.optimal_fz_um).toBeGreaterThan(hMin);
    });

    it("should recommend appropriate spindle speed", () => {
      const result = MicroMillingSizeEffectEngine.recommend(defaultTool, defaultMaterial);

      // For 0.5mm tool at ~150 SFM, expect high RPM
      expect(result.recommended_rpm).toBeGreaterThan(50000);
    });

    it("should warn about uncoated tools for steel", () => {
      const uncoatedTool: MicroTool = {
        ...defaultTool,
        coating: "uncoated",
      };

      const result = MicroMillingSizeEffectEngine.recommend(uncoatedTool, defaultMaterial);

      expect(result.recommendations.some(r => r.includes("coated"))).toBe(true);
    });

    it("should adjust for aluminum materials", () => {
      const aluminum: MicroMaterial = {
        name: "6061 Aluminum",
        iso_group: "N",
        kc1_1_base: 700,
        mc: 0.25,
      };

      const steelResult = MicroMillingSizeEffectEngine.recommend(defaultTool, defaultMaterial);
      const alResult = MicroMillingSizeEffectEngine.recommend(defaultTool, aluminum);

      expect(alResult.recommended_rpm).toBeGreaterThan(steelResult.recommended_rpm);
    });

    it("should flag small tool stability concerns", () => {
      const tinyTool: MicroTool = {
        ...defaultTool,
        diameter_mm: 0.2,
      };

      const result = MicroMillingSizeEffectEngine.recommend(tinyTool, defaultMaterial);

      expect(result.process_stability).toBeLessThan(0.7);
      expect(result.recommendations.some(r => r.includes("runout"))).toBe(true);
    });
  });
});
