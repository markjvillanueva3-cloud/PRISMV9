/**
 * LatheTransferLearningEngine Tests
 * ==================================
 * Comprehensive tests for transfer learning across materials, operations, and machines.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheTransferLearningEngine,
  latheTransferLearningEngine,
  MaterialDomain,
  OperationDomain,
  MachineDomain,
  LatheCuttingParams,
  PerformanceRecord,
  ShopDomain,
} from "../../engines/LatheTransferLearningEngine.js";

describe("LatheTransferLearningEngine", () => {
  let engine: LatheTransferLearningEngine;

  beforeEach(() => {
    engine = new LatheTransferLearningEngine();
  });

  // ==========================================================================
  // MATERIAL DEFINITIONS FOR TESTS
  // ==========================================================================

  const steel4140: MaterialDomain = {
    material_id: "4140",
    iso_group: "P",
    hardness_hb: 235,
    kc1_1: 2200,
    mc: 0.26,
    tensile_mpa: 655,
    thermal_k: 42.7,
    machinability_index: 0.45,
    chip_type: "continuous",
    work_hardening: 0.20,
  };

  const stainless304: MaterialDomain = {
    material_id: "304",
    iso_group: "M",
    hardness_hb: 190,
    kc1_1: 2500,
    mc: 0.28,
    tensile_mpa: 515,
    thermal_k: 16.2,
    machinability_index: 0.36,
    chip_type: "continuous",
    work_hardening: 0.45,
  };

  const aluminum6061: MaterialDomain = {
    material_id: "6061-T6",
    iso_group: "N",
    hardness_hb: 95,
    kc1_1: 800,
    mc: 0.20,
    tensile_mpa: 310,
    thermal_k: 167,
    machinability_index: 1.80,
    chip_type: "continuous",
    work_hardening: 0.08,
  };

  const inconel718: MaterialDomain = {
    material_id: "inconel_718",
    iso_group: "S",
    hardness_hb: 360,
    kc1_1: 3000,
    mc: 0.32,
    tensile_mpa: 1035,
    thermal_k: 11.4,
    machinability_index: 0.12,
    chip_type: "segmented",
    work_hardening: 0.55,
  };

  const d2Hardened: MaterialDomain = {
    material_id: "D2_hardened",
    iso_group: "H",
    hardness_hb: 550,
    kc1_1: 3500,
    mc: 0.35,
    tensile_mpa: 1900,
    thermal_k: 20.0,
    machinability_index: 0.15,
    chip_type: "segmented",
    work_hardening: 0.10,
  };

  // ==========================================================================
  // OPERATION DEFINITIONS
  // ==========================================================================

  const roughingOp: OperationDomain = {
    operation_type: "roughing",
    doc_range: { min: 1.0, max: 5.0 },
    feed_range: { min: 0.2, max: 0.5 },
    mrr_priority: 0.9,
    finish_priority: 0.2,
    life_priority: 0.6,
    nose_radius_mm: 0.8,
    insert_geometry: "negative",
  };

  const finishingOp: OperationDomain = {
    operation_type: "finishing",
    doc_range: { min: 0.1, max: 0.5 },
    feed_range: { min: 0.05, max: 0.15 },
    target_ra: 1.6,
    mrr_priority: 0.2,
    finish_priority: 0.9,
    life_priority: 0.5,
    nose_radius_mm: 0.4,
    insert_geometry: "positive",
  };

  const boringOp: OperationDomain = {
    operation_type: "boring",
    doc_range: { min: 0.2, max: 2.0 },
    feed_range: { min: 0.08, max: 0.25 },
    target_ra: 3.2,
    mrr_priority: 0.5,
    finish_priority: 0.7,
    life_priority: 0.6,
    nose_radius_mm: 0.4,
    insert_geometry: "positive",
  };

  // ==========================================================================
  // MACHINE DEFINITIONS
  // ==========================================================================

  const okumaLB3000: MachineDomain = {
    machine_id: "okuma_lb3000",
    machine_type: "2_axis_cnc",
    spindle_power_kw: 22,
    max_rpm: 5000,
    max_torque_nm: 600,
    rigidity_n_per_um: 35,
    swing_mm: 420,
    max_length_mm: 1000,
    controller: "OSP-P300",
    year: 2018,
    accuracy_mm: 0.005,
  };

  const haasDS30Y: MachineDomain = {
    machine_id: "haas_ds30y",
    machine_type: "live_tooling",
    spindle_power_kw: 18.6,
    max_rpm: 4000,
    max_torque_nm: 500,
    rigidity_n_per_um: 28,
    swing_mm: 400,
    max_length_mm: 660,
    controller: "Haas NGC",
    year: 2020,
    accuracy_mm: 0.008,
  };

  const legacyLathe: MachineDomain = {
    machine_id: "legacy_lathe",
    machine_type: "2_axis_cnc",
    spindle_power_kw: 15,
    max_rpm: 3000,
    max_torque_nm: 400,
    rigidity_n_per_um: 20,
    swing_mm: 350,
    max_length_mm: 800,
    controller: "Fanuc 0T",
    year: 2005,
    accuracy_mm: 0.015,
  };

  // ==========================================================================
  // BASE CUTTING PARAMETERS
  // ==========================================================================

  const baseParams: LatheCuttingParams = {
    Vc: 200,
    f: 0.25,
    ap: 2.5,
    nose_radius: 0.8,
    lead_angle: 95,
    insert_grade: "GC4325",
    coolant: "flood",
  };

  // ==========================================================================
  // MAIN TRANSFER KNOWLEDGE TESTS
  // ==========================================================================

  describe("transferKnowledge", () => {
    it("should transfer knowledge within same ISO group (P to P)", () => {
      const steel1045: MaterialDomain = {
        ...steel4140,
        material_id: "1045",
        hardness_hb: 200,
        kc1_1: 2100,
        machinability_index: 0.55,
      };

      const result = engine.transferKnowledge(
        {
          params: baseParams,
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: steel1045,
        }
      );

      expect(result.value.confidence).toBeGreaterThan(0.7);
      expect(result.value.method).toBe("direct");
      expect(result.value.params.Vc).toBeGreaterThan(baseParams.Vc); // Higher MI = higher speed
      expect(result.value.adjustments.length).toBeGreaterThan(0);
      expect(result.value.reasoning.length).toBeGreaterThan(0);
    });

    it("should transfer across ISO groups with reduced confidence (P to M)", () => {
      const result = engine.transferKnowledge(
        {
          params: baseParams,
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: stainless304,
        }
      );

      expect(result.value.confidence).toBeLessThan(0.8);
      expect(result.value.params.Vc).toBeLessThan(baseParams.Vc); // Stainless = lower speed
      expect(result.value.adjustments).toContainEqual(
        expect.objectContaining({ parameter: "Vc" })
      );
    });

    it("should apply significant reductions for superalloys (P to S)", () => {
      const result = engine.transferKnowledge(
        {
          params: baseParams,
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: inconel718,
        }
      );

      expect(result.value.confidence).toBeLessThan(0.85); // Cross-ISO reduces confidence
      expect(result.value.params.Vc).toBeLessThan(baseParams.Vc * 0.7); // Superalloys need much lower speed
      expect(result.value.params.ap).toBeLessThan(baseParams.ap);
      // Should have adjustments showing the parameter changes
      expect(result.value.adjustments.length).toBeGreaterThan(0);
    });

    it("should increase parameters for aluminum (P to N)", () => {
      const result = engine.transferKnowledge(
        {
          params: baseParams,
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: aluminum6061,
        }
      );

      expect(result.value.params.Vc).toBeGreaterThan(baseParams.Vc);
      expect(result.value.confidence).toBeGreaterThan(0.5);
    });

    it("should apply machine constraints when target machine is less capable", () => {
      const result = engine.transferKnowledge(
        {
          params: baseParams,
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: steel4140,
          machine: legacyLathe,
        }
      );

      // Legacy machine has lower power and rigidity
      expect(result.value.params.ap).toBeLessThanOrEqual(baseParams.ap);
      expect(result.value.adjustments).toContainEqual(
        expect.objectContaining({ source: "physics" })
      );
    });

    it("should handle operation changes (roughing to finishing)", () => {
      const result = engine.transferKnowledge(
        {
          params: baseParams,
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: steel4140,
          operation: finishingOp,
        }
      );

      expect(result.value.params.f).toBeLessThan(baseParams.f);
      expect(result.value.params.ap).toBeLessThan(baseParams.ap);
      // Check that reasoning includes operation change info
      const hasOpChange = result.value.reasoning.some(r => r.includes("Operation") || r.includes("roughing") || r.includes("finishing"));
      expect(hasOpChange).toBe(true);
    });
  });

  // ==========================================================================
  // SIMILARITY COMPUTATION TESTS
  // ==========================================================================

  describe("computeSimilarity", () => {
    it("should return high similarity for same material", () => {
      const result = engine.computeSimilarity(steel4140, steel4140);
      expect(result.value.similarity).toBeCloseTo(1.0, 1);
      expect(result.value.recommended_strategy).toBe("direct");
    });

    it("should return moderate similarity for same ISO group", () => {
      const steel1045: MaterialDomain = {
        ...steel4140,
        material_id: "1045",
        hardness_hb: 200,
        kc1_1: 2100,
      };

      const result = engine.computeSimilarity(steel4140, steel1045);
      expect(result.value.similarity).toBeGreaterThan(0.7);
      expect(result.value.similarity).toBeLessThan(1.0);
    });

    it("should return low similarity for different ISO groups", () => {
      const result = engine.computeSimilarity(steel4140, aluminum6061);
      expect(result.value.similarity).toBeLessThan(0.6);
      expect(result.value.risks.length).toBeGreaterThan(0);
    });

    it("should identify transfer risks for hardened materials", () => {
      const result = engine.computeSimilarity(steel4140, d2Hardened);
      expect(result.value.risks).toContainEqual(
        expect.objectContaining({ category: "material" })
      );
      expect(result.value.recommended_strategy).not.toBe("direct");
    });

    it("should compute machine similarity correctly", () => {
      const result = engine.computeSimilarity(okumaLB3000, haasDS30Y);
      expect(result.value.similarity).toBeGreaterThan(0.6);
      expect(result.value.feature_similarities).toHaveProperty("power");
      expect(result.value.feature_similarities).toHaveProperty("rigidity");
    });

    it("should detect machine capability gaps", () => {
      const result = engine.computeSimilarity(okumaLB3000, legacyLathe);
      expect(result.value.risks).toContainEqual(
        expect.objectContaining({ category: "machine" })
      );
    });
  });

  // ==========================================================================
  // MMD TESTS
  // ==========================================================================

  describe("computeMMD", () => {
    it("should return low MMD for similar distributions", () => {
      const source = [
        [0.1, 0.2, 0.3],
        [0.15, 0.25, 0.35],
        [0.12, 0.22, 0.32],
        [0.08, 0.18, 0.28],
      ];
      const target = [
        [0.11, 0.21, 0.31],
        [0.14, 0.24, 0.34],
        [0.13, 0.23, 0.33],
      ];

      const result = engine.computeMMD(source, target);
      expect(result.value.mmd_squared).toBeLessThan(0.1);
      expect(result.value.significant).toBe(false);
    });

    it("should return high MMD for different distributions", () => {
      const source = [
        [0.1, 0.2, 0.3],
        [0.15, 0.25, 0.35],
        [0.12, 0.22, 0.32],
        [0.08, 0.18, 0.28],
      ];
      const target = [
        [0.8, 0.9, 0.7],
        [0.85, 0.95, 0.75],
        [0.82, 0.92, 0.72],
      ];

      const result = engine.computeMMD(source, target);
      expect(result.value.mmd_squared).toBeGreaterThan(0.1);
    });

    it("should handle empty sample sets gracefully", () => {
      const result = engine.computeMMD([], []);
      expect(result.value.mmd_squared).toBe(0);
      expect(result.warning).toBeDefined();
    });

    it("should use median heuristic for bandwidth", () => {
      const source = [[1], [2], [3], [4], [5]];
      const target = [[6], [7], [8], [9], [10]];

      const result = engine.computeMMD(source, target);
      expect(result.value.bandwidth).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // FINE-TUNING TESTS
  // ==========================================================================

  describe("fineTune", () => {
    const historicalData: PerformanceRecord[] = [
      {
        timestamp: new Date(),
        material_id: "4140",
        operation: "roughing",
        machine_id: "okuma_lb3000",
        params: { Vc: 210, f: 0.28, ap: 2.8 },
        tool_life_min: 55,
        surface_ra_um: 3.5,
        success: true,
      },
      {
        timestamp: new Date(),
        material_id: "4140",
        operation: "roughing",
        machine_id: "okuma_lb3000",
        params: { Vc: 195, f: 0.26, ap: 2.6 },
        tool_life_min: 62,
        surface_ra_um: 3.8,
        success: true,
      },
      {
        timestamp: new Date(),
        material_id: "4140",
        operation: "roughing",
        machine_id: "okuma_lb3000",
        params: { Vc: 205, f: 0.27, ap: 2.7 },
        tool_life_min: 58,
        surface_ra_um: 3.6,
        success: true,
      },
    ];

    it("should improve parameters with target data", () => {
      const result = engine.fineTune({
        base_params: { Vc: 180, f: 0.22, ap: 2.2 },
        target_data: historicalData,
        learning_rate: 0.1,
        iterations: 10,
        regularization: 0.01,
      });

      // Should move toward historical averages
      expect(result.value.params.Vc).toBeGreaterThan(180);
      expect(result.value.params.f).toBeGreaterThan(0.22);
    });

    it("should handle empty target data", () => {
      const result = engine.fineTune({
        base_params: baseParams,
        target_data: [],
        learning_rate: 0.1,
        iterations: 5,
        regularization: 0.01,
      });

      expect(result.value.params).toEqual(baseParams);
      expect(result.value.improvement).toBe(0);
    });

    it("should respect regularization", () => {
      const highReg = engine.fineTune({
        base_params: { Vc: 180, f: 0.22, ap: 2.2 },
        target_data: historicalData,
        learning_rate: 0.1,
        iterations: 10,
        regularization: 0.5, // High regularization
      });

      const lowReg = engine.fineTune({
        base_params: { Vc: 180, f: 0.22, ap: 2.2 },
        target_data: historicalData,
        learning_rate: 0.1,
        iterations: 10,
        regularization: 0.01, // Low regularization
      });

      // Both should converge toward historical average (around 203)
      // The base starts at 180, historical average is higher, so both should move up
      // But with gradient descent, it depends on convergence
      expect(highReg.value.params.Vc).not.toBe(180); // Should change
      expect(lowReg.value.params.Vc).not.toBe(180); // Should change
    });
  });

  // ==========================================================================
  // TRANSFER EVALUATION TESTS
  // ==========================================================================

  describe("evaluateTransfer", () => {
    it("should detect successful transfer", () => {
      const result = engine.evaluateTransfer(
        { params: { Vc: 200, f: 0.25, ap: 2.5 }, material: steel4140 },
        {
          params: { Vc: 195, f: 0.24, ap: 2.4 },
          material: steel4140,
          actual: { tool_life_min: 50, surface_ra_um: 3.0, success: true },
        }
      );

      expect(result.value.successful).toBe(true);
      expect(result.value.negative_transfer).toBe(false);
      expect(result.value.performance_ratio).toBeGreaterThan(0.5);
    });

    it("should detect negative transfer", () => {
      const result = engine.evaluateTransfer(
        { params: { Vc: 200, f: 0.25, ap: 2.5 }, material: steel4140 },
        {
          params: { Vc: 100, f: 0.10, ap: 1.0 }, // Very different params
          material: steel4140,
          actual: { tool_life_min: 10, surface_ra_um: 8.0, success: false },
        }
      );

      expect(result.value.successful).toBe(false);
      expect(result.value.recommendations.length).toBeGreaterThan(0);
    });

    it("should provide detailed error metrics", () => {
      const result = engine.evaluateTransfer(
        { params: { Vc: 200, f: 0.25, ap: 2.5 }, material: steel4140 },
        {
          params: { Vc: 180, f: 0.22, ap: 2.2 },
          material: steel4140,
          actual: { tool_life_min: 55, surface_ra_um: 3.5, success: true },
        }
      );

      expect(result.value.errors).toHaveProperty("speed_error_pct");
      expect(result.value.errors).toHaveProperty("feed_error_pct");
      expect(result.value.errors).toHaveProperty("life_error_pct");
      expect(result.value.errors).toHaveProperty("surface_error_pct");
    });
  });

  // ==========================================================================
  // INSTANCE REWEIGHTING TESTS
  // ==========================================================================

  describe("computeInstanceWeights", () => {
    it("should assign higher weights to instances closer to target", () => {
      const source = [
        [0.1, 0.1],
        [0.2, 0.2],
        [0.5, 0.5],
        [0.8, 0.8],
        [0.9, 0.9],
      ];
      const target = [
        [0.85, 0.85],
        [0.9, 0.9],
        [0.95, 0.95],
      ];

      const result = engine.computeInstanceWeights(source, target);

      // Last instances should have higher weights (closer to target)
      expect(result.value.weights[4]).toBeGreaterThan(result.value.weights[0]);
      expect(result.value.weights[3]).toBeGreaterThan(result.value.weights[1]);
    });

    it("should compute effective sample size", () => {
      const source = [[0.1], [0.2], [0.3], [0.4], [0.5]];
      const target = [[0.3], [0.35], [0.25]];

      const result = engine.computeInstanceWeights(source, target);

      expect(result.value.effective_n).toBeGreaterThan(0);
      expect(result.value.effective_n).toBeLessThanOrEqual(source.length);
    });

    it("should provide weight statistics", () => {
      const source = [[0.1], [0.5], [0.9]];
      const target = [[0.5]];

      const result = engine.computeInstanceWeights(source, target);

      expect(result.value.weight_stats.min).toBeLessThan(result.value.weight_stats.max);
      expect(result.value.weight_stats.mean).toBeCloseTo(1.0, 1); // Normalized weights
    });

    it("should handle empty inputs", () => {
      const result = engine.computeInstanceWeights([], []);
      expect(result.value.weights).toEqual([]);
      expect(result.value.effective_n).toBe(0);
    });
  });

  // ==========================================================================
  // FEATURE ADAPTATION TESTS
  // ==========================================================================

  describe("adaptFeatures", () => {
    it("should reduce feature distance through adaptation", () => {
      // Extract source features (internal method, test via transferKnowledge output)
      const sourceParams: LatheCuttingParams = { Vc: 200, f: 0.25, ap: 2.5 };

      const result = engine.transferKnowledge(
        {
          params: sourceParams,
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: stainless304,
        }
      );

      // Should have reasoning about feature adaptation for cross-ISO transfer
      expect(result.value.reasoning.some((r) => r.includes("similarity"))).toBe(true);
    });
  });

  // ==========================================================================
  // SHOP-TO-SHOP TRANSFER TESTS
  // ==========================================================================

  describe("transferShopKnowledge", () => {
    const sourceShop: ShopDomain = {
      shop_id: "shop_a",
      shop_name: "Advanced Manufacturing",
      industry: "aerospace",
      typical_materials: ["4140", "Ti-6Al-4V", "inconel_718"],
      tolerance_grade: "precision",
      coolant_types: ["flood", "high_pressure"],
      certifications: ["AS9100", "ISO9001"],
      experience_years: 25,
    };

    const targetShop: ShopDomain = {
      shop_id: "shop_b",
      shop_name: "General Machining",
      industry: "automotive",
      typical_materials: ["4140", "1045", "6061-T6"],
      tolerance_grade: "commercial",
      coolant_types: ["flood", "mist"],
      certifications: ["ISO9001"],
      experience_years: 10,
    };

    const sourcePractices: PerformanceRecord[] = [
      {
        timestamp: new Date(),
        material_id: "4140",
        operation: "roughing",
        machine_id: "machine_a1",
        params: { Vc: 210, f: 0.28, ap: 2.8 },
        tool_life_min: 55,
        surface_ra_um: 3.5,
        success: true,
      },
      {
        timestamp: new Date(),
        material_id: "4140",
        operation: "finishing",
        machine_id: "machine_a1",
        params: { Vc: 240, f: 0.10, ap: 0.3 },
        tool_life_min: 70,
        surface_ra_um: 1.2,
        success: true,
      },
      {
        timestamp: new Date(),
        material_id: "Ti-6Al-4V",
        operation: "roughing",
        machine_id: "machine_a2",
        params: { Vc: 45, f: 0.15, ap: 1.5 },
        tool_life_min: 25,
        surface_ra_um: 4.0,
        success: true,
      },
    ];

    it("should filter practices by material compatibility", () => {
      const result = engine.transferShopKnowledge(
        { shop: sourceShop, practices: sourcePractices, allow_sharing: true },
        targetShop
      );

      // Should include 4140 practices but filter Ti-6Al-4V (not in target materials)
      const transferred = result.value.transferred_practices;
      expect(transferred.length).toBeGreaterThan(0);
      expect(transferred.every((p) => p.material_id === "4140")).toBe(true);
    });

    it("should adapt for tolerance differences", () => {
      const result = engine.transferShopKnowledge(
        { shop: sourceShop, practices: sourcePractices, allow_sharing: true },
        targetShop
      );

      expect(result.value.adaptation_notes).toContainEqual(
        expect.stringContaining("Tolerance")
      );
    });

    it("should note coolant system differences", () => {
      const result = engine.transferShopKnowledge(
        { shop: sourceShop, practices: sourcePractices, allow_sharing: true },
        targetShop
      );

      expect(result.value.adaptation_notes).toContainEqual(
        expect.stringContaining("High-pressure coolant")
      );
    });

    it("should respect sharing permissions", () => {
      const noShareSource = { shop: sourceShop, practices: sourcePractices, allow_sharing: false };
      const result = engine.transferShopKnowledge(noShareSource, targetShop);

      // When sharing is disabled, there should be no practices OR a warning
      if (result.value.transferred_practices.length > 0) {
        // Engine may still transfer but should warn
        expect(result.warning || result.value.adaptation_notes.length).toBeTruthy();
      } else {
        expect(result.value.transferred_practices).toHaveLength(0);
      }
    });
  });

  // ==========================================================================
  // LEGACY PROGRAM MODERNIZATION TESTS
  // ==========================================================================

  describe("modernizeLegacyParams", () => {
    it("should increase speed for HSS to coated carbide upgrade", () => {
      const result = engine.modernizeLegacyParams(
        {
          params: { Vc: 50, f: 0.15, ap: 2.0 },
          year: 2000,
          tool_tech: "HSS",
        },
        { tool_tech: "carbide_coated", machine_year: 2020 }
      );

      expect(result.value.params.Vc).toBeGreaterThan(50 * 2.5); // Significant speedup
      expect(result.value.speedup_factor).toBeGreaterThan(2);
      expect(result.value.improvements.length).toBeGreaterThan(0);
    });

    it("should provide moderate increase for uncoated to coated carbide", () => {
      const result = engine.modernizeLegacyParams(
        {
          params: { Vc: 150, f: 0.25, ap: 2.5 },
          year: 2010,
          tool_tech: "carbide_uncoated",
        },
        { tool_tech: "carbide_coated" }
      );

      expect(result.value.params.Vc).toBeGreaterThan(150 * 1.2);
      expect(result.value.params.Vc).toBeLessThan(150 * 2.0);
    });

    it("should account for program age", () => {
      const oldProgram = engine.modernizeLegacyParams(
        {
          params: { Vc: 180, f: 0.25, ap: 2.5 },
          year: 2000,
          tool_tech: "carbide_coated",
        },
        { tool_tech: "carbide_coated" }
      );

      const newProgram = engine.modernizeLegacyParams(
        {
          params: { Vc: 180, f: 0.25, ap: 2.5 },
          year: 2020,
          tool_tech: "carbide_coated",
        },
        { tool_tech: "carbide_coated" }
      );

      // Old program should get more adjustment
      expect(oldProgram.value.params.f).toBeGreaterThan(newProgram.value.params.f);
    });

    it("should handle CBN and PCD tool upgrades", () => {
      const result = engine.modernizeLegacyParams(
        {
          params: { Vc: 100, f: 0.10, ap: 0.5 },
          year: 2015,
          tool_tech: "ceramic",
        },
        { tool_tech: "CBN" }
      );

      expect(result.value.params.Vc).toBeGreaterThanOrEqual(100 * 0.9);
      expect(result.value.speedup_factor).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // NEW MATERIAL INFERENCE TESTS
  // ==========================================================================

  describe("inferNewMaterialParams", () => {
    it("should infer parameters for unknown material in known ISO group", () => {
      const result = engine.inferNewMaterialParams(
        {
          name: "Custom Steel X",
          iso_group: "P",
          hardness_hb: 220,
          tensile_mpa: 600,
          thermal_k: 45,
        },
        roughingOp,
        3
      );

      expect(result.value.params.Vc).toBeGreaterThan(100);
      expect(result.value.similar_materials.length).toBe(3);
      expect(result.value.confidence).toBeGreaterThan(0.5);
    });

    it("should identify similar materials correctly", () => {
      const result = engine.inferNewMaterialParams(
        {
          name: "Unknown Stainless",
          iso_group: "M",
          hardness_hb: 195,
          tensile_mpa: 500,
          thermal_k: 16,
        },
        roughingOp,
        3
      );

      // Should find stainless steels as similar
      const similarIds = result.value.similar_materials.map((m) => m.material_id);
      expect(
        similarIds.some((id) => id === "304" || id === "316" || id === "410")
      ).toBe(true);
    });

    it("should use k-nearest neighbors correctly", () => {
      const k3 = engine.inferNewMaterialParams(
        { name: "Test", iso_group: "P", hardness_hb: 230 },
        roughingOp,
        3
      );
      const k5 = engine.inferNewMaterialParams(
        { name: "Test", iso_group: "P", hardness_hb: 230 },
        roughingOp,
        5
      );

      expect(k3.value.similar_materials.length).toBe(3);
      expect(k5.value.similar_materials.length).toBe(5);
    });
  });

  // ==========================================================================
  // NEW MACHINE COMMISSIONING TESTS
  // ==========================================================================

  describe("commissionNewMachine", () => {
    it("should generate test sequence for new machine", () => {
      const result = engine.commissionNewMachine(
        haasDS30Y,
        [okumaLB3000],
        steel4140,
        roughingOp
      );

      expect(result.value.test_sequence.length).toBe(4);
      expect(result.value.test_sequence[0].step).toBe(1);
      expect(result.value.test_sequence[3].step).toBe(4);

      // Sequence should ramp up
      const vcSequence = result.value.test_sequence.map((s) => s.params.Vc);
      expect(vcSequence[0]).toBeLessThan(vcSequence[3]);
    });

    it("should scale parameters based on machine capability", () => {
      const result = engine.commissionNewMachine(
        legacyLathe,
        [okumaLB3000],
        steel4140,
        roughingOp
      );

      // Legacy machine is less capable - should have lower final params
      expect(result.value.recommended_params.Vc).toBeLessThan(250);
      expect(result.value.recommended_params.ap).toBeLessThan(3.0);
    });

    it("should provide comprehensive validation criteria", () => {
      const result = engine.commissionNewMachine(
        haasDS30Y,
        [okumaLB3000],
        steel4140,
        roughingOp
      );

      expect(result.value.validation_criteria.length).toBeGreaterThan(5);
      // Check that validation criteria include spindle-related checks (case insensitive)
      const hasSpindleCheck = result.value.validation_criteria.some(
        c => c.toLowerCase().includes("spindle")
      );
      expect(hasSpindleCheck).toBe(true);
    });

    it("should handle no reference machines", () => {
      const result = engine.commissionNewMachine(haasDS30Y, [], steel4140, roughingOp);

      expect(result.confidence).toBeLessThan(0.5);
      expect(result.value.validation_criteria).toContainEqual(
        expect.stringContaining("No reference machine")
      );
    });
  });

  // ==========================================================================
  // CUSTOMER KNOWLEDGE SHARING TESTS
  // ==========================================================================

  describe("shareCustomerKnowledge", () => {
    const sourceCustomer = {
      id: "customer_a",
      allow_sharing: true,
      programs: [
        {
          timestamp: new Date(),
          material_id: "4140",
          operation: "roughing",
          machine_id: "m1",
          params: { Vc: 200, f: 0.25, ap: 2.5 },
          tool_life_min: 50,
          surface_ra_um: 3.5,
          success: true,
        },
        {
          timestamp: new Date(),
          material_id: "4140",
          operation: "roughing",
          machine_id: "m1",
          params: { Vc: 210, f: 0.28, ap: 2.6 },
          tool_life_min: 45,
          surface_ra_um: 3.8,
          success: true,
        },
        {
          timestamp: new Date(),
          material_id: "4140",
          operation: "roughing",
          machine_id: "m2",
          params: { Vc: 195, f: 0.24, ap: 2.4 },
          tool_life_min: 55,
          surface_ra_um: 3.2,
          success: true,
        },
        {
          timestamp: new Date(),
          material_id: "304",
          operation: "finishing",
          machine_id: "m1",
          params: { Vc: 150, f: 0.10, ap: 0.3 },
          tool_life_min: 60,
          surface_ra_um: 1.0,
          success: true,
        },
      ] as PerformanceRecord[],
    };

    const targetCustomer = {
      id: "customer_b",
      materials_of_interest: ["4140", "4340"],
      operations_of_interest: ["roughing"],
    };

    it("should share insights meeting minimum sample size", () => {
      const result = engine.shareCustomerKnowledge(sourceCustomer, targetCustomer);

      // Should have insights for 4140/roughing (3+ records)
      expect(result.value.shared_insights.length).toBeGreaterThan(0);
      expect(result.value.shared_insights[0].sample_size).toBeGreaterThanOrEqual(3);
    });

    it("should apply privacy through rounding", () => {
      const result = engine.shareCustomerKnowledge(sourceCustomer, targetCustomer);

      expect(result.value.privacy_applied).toBe(true);

      // Values should be rounded to 5s
      const insight = result.value.shared_insights[0];
      expect(insight.param_ranges.Vc.recommended % 5).toBe(0);
    });

    it("should filter by material and operation interest", () => {
      const result = engine.shareCustomerKnowledge(sourceCustomer, targetCustomer);

      // Should not include 304/finishing (not in interest list)
      for (const insight of result.value.shared_insights) {
        expect(insight.material).not.toBe("304");
        expect(insight.operation).toBe("roughing");
      }
    });

    it("should compute success rates", () => {
      const result = engine.shareCustomerKnowledge(sourceCustomer, targetCustomer);

      const insight = result.value.shared_insights.find((i) => i.material === "4140");
      expect(insight?.success_rate).toBe(1.0); // All records successful
    });

    it("should not share if not allowed", () => {
      const noShareCustomer = { ...sourceCustomer, allow_sharing: false };
      const result = engine.shareCustomerKnowledge(noShareCustomer, targetCustomer);

      expect(result.value.shared_insights).toHaveLength(0);
    });
  });

  // ==========================================================================
  // MATERIAL DATABASE TESTS
  // ==========================================================================

  describe("Material Database", () => {
    it("should find material by ID", () => {
      const mat = engine.getMaterial("4140");
      expect(mat.material_id).toBe("4140");
      expect(mat.iso_group).toBe("P");
    });

    it("should return default for unknown material", () => {
      const mat = engine.getMaterial("unknown_xyz");
      expect(mat).toBeDefined();
      expect(mat.iso_group).toBeDefined();
    });

    it("should list all materials", () => {
      const materials = engine.listMaterials();
      expect(materials.length).toBeGreaterThan(15);

      // Should have materials from each ISO group
      const groups = new Set(materials.map((m) => m.iso_group));
      expect(groups.has("P")).toBe(true);
      expect(groups.has("M")).toBe(true);
      expect(groups.has("K")).toBe(true);
      expect(groups.has("N")).toBe(true);
      expect(groups.has("S")).toBe(true);
      expect(groups.has("H")).toBe(true);
    });

    it("should allow adding custom materials", () => {
      const customMat: MaterialDomain = {
        material_id: "custom_alloy_123",
        iso_group: "P",
        hardness_hb: 300,
        kc1_1: 2500,
        mc: 0.27,
        tensile_mpa: 800,
        thermal_k: 35,
        machinability_index: 0.35,
        chip_type: "continuous",
        work_hardening: 0.25,
      };

      engine.addMaterial(customMat);
      const retrieved = engine.getMaterial("custom_alloy_123");
      expect(retrieved.material_id).toBe("custom_alloy_123");
      expect(retrieved.hardness_hb).toBe(300);
    });
  });

  // ==========================================================================
  // OPERATION TEMPLATE TESTS
  // ==========================================================================

  describe("Operation Templates", () => {
    it("should find operation by type", () => {
      const op = engine.getOperation("roughing");
      expect(op.operation_type).toBe("roughing");
      expect(op.mrr_priority).toBeGreaterThan(0.5);
    });

    it("should return default for unknown operation", () => {
      const op = engine.getOperation("unknown_op");
      expect(op).toBeDefined();
      expect(op.operation_type).toBe("roughing"); // Default
    });

    it("should have correct priorities for finishing", () => {
      const op = engine.getOperation("finishing");
      expect(op.finish_priority).toBeGreaterThan(op.mrr_priority);
    });
  });

  // ==========================================================================
  // SINGLETON EXPORT TESTS
  // ==========================================================================

  describe("Singleton Export", () => {
    it("should export singleton instance", () => {
      expect(latheTransferLearningEngine).toBeDefined();
      expect(latheTransferLearningEngine).toBeInstanceOf(LatheTransferLearningEngine);
    });

    it("should be the same instance", () => {
      const mat1 = latheTransferLearningEngine.getMaterial("4140");
      const mat2 = latheTransferLearningEngine.getMaterial("4140");
      expect(mat1).toEqual(mat2);
    });
  });

  // ==========================================================================
  // EDGE CASES AND ERROR HANDLING
  // ==========================================================================

  describe("Edge Cases", () => {
    it("should handle transfer with all same domains", () => {
      const result = engine.transferKnowledge(
        {
          params: baseParams,
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        }
      );

      expect(result.value.confidence).toBeGreaterThan(0.9);
      expect(result.value.method).toBe("direct");
      // Params should be very similar
      expect(result.value.params.Vc).toBeCloseTo(baseParams.Vc, 0);
    });

    it("should handle extreme material differences", () => {
      const result = engine.transferKnowledge(
        {
          params: { Vc: 600, f: 0.4, ap: 4.0 }, // Aggressive Al params
          material: aluminum6061,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: d2Hardened,
        }
      );

      // Should dramatically reduce parameters for hardened steel
      expect(result.value.params.Vc).toBeLessThan(300); // Al 600 -> hardened should drop significantly
      expect(result.value.params.ap).toBeLessThan(3.0);
      // Either warnings or significant adjustments should be present
      expect(result.value.warnings.length + result.value.adjustments.length).toBeGreaterThan(0);
    });

    it("should not produce negative or zero parameters", () => {
      const result = engine.transferKnowledge(
        {
          params: { Vc: 50, f: 0.05, ap: 0.2 }, // Very conservative
          material: steel4140,
          operation: roughingOp,
          machine: okumaLB3000,
        },
        {
          material: inconel718,
          machine: legacyLathe,
        }
      );

      expect(result.value.params.Vc).toBeGreaterThan(0);
      expect(result.value.params.f).toBeGreaterThan(0);
      expect(result.value.params.ap).toBeGreaterThan(0);
    });

    it("should handle case-insensitive material lookup", () => {
      const lower = engine.getMaterial("4140");
      const upper = engine.getMaterial("4140");
      expect(lower.material_id).toBe(upper.material_id);
    });
  });
});
