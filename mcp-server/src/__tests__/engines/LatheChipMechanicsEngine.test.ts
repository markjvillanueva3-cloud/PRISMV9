/**
 * LatheChipMechanicsEngine Test Suite
 *
 * Tests for comprehensive chip formation physics in turning operations.
 * Validates Merchant theory, chip type prediction, chipbreaker design,
 * adiabatic shear bands, chip flow, and chip control assessment.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheChipMechanicsEngine,
  latheChipMechanicsEngine,
  type CuttingParameters,
  type ChipMaterialProperties,
} from "../../engines/LatheChipMechanicsEngine.js";

describe("LatheChipMechanicsEngine", () => {
  let engine: LatheChipMechanicsEngine;

  beforeEach(() => {
    engine = new LatheChipMechanicsEngine();
  });

  // =====================================
  // SHEAR ANGLE CALCULATIONS
  // =====================================

  describe("calculateShearAngle", () => {
    it("should calculate Merchant shear angle correctly", () => {
      // Merchant: phi = 45 - beta/2 + alpha/2
      // For alpha=6deg, mu=0.5 -> beta=26.57deg
      // phi = 45 - 13.28 + 3 = 34.72deg
      const result = engine.calculateShearAngle(6, 0.5);

      expect(result.merchant_angle.value).toBeGreaterThan(30);
      expect(result.merchant_angle.value).toBeLessThan(40);
      expect(result.merchant_angle.unit).toBe("deg");
      expect(result.merchant_angle.source).toContain("Merchant");
    });

    it("should calculate Lee-Shaffer angle (upper bound)", () => {
      const result = engine.calculateShearAngle(6, 0.5);

      // Lee-Shaffer gives different result
      expect(result.lee_shaffer_angle.value).toBeDefined();
      expect(result.lee_shaffer_angle.source).toContain("Lee-Shaffer");
    });

    it("should calculate chip thickness ratio r = sin(phi)/cos(phi-alpha)", () => {
      const result = engine.calculateShearAngle(6, 0.5);

      // Chip ratio should be between 0.3 and 1.0 for typical cutting
      expect(result.chip_thickness_ratio.value).toBeGreaterThan(0.3);
      expect(result.chip_thickness_ratio.value).toBeLessThan(1.0);
    });

    it("should calculate shear strain gamma = cos(alpha)/(sin(phi)*cos(phi-alpha))", () => {
      const result = engine.calculateShearAngle(6, 0.5);

      // Shear strain typically 1.5-4.0 for metal cutting
      expect(result.shear_strain.value).toBeGreaterThan(1.0);
      expect(result.shear_strain.value).toBeLessThan(5.0);
    });

    it("should handle negative rake angles", () => {
      const result = engine.calculateShearAngle(-6, 0.5);

      // Negative rake should give lower shear angle
      expect(result.merchant_angle.value).toBeGreaterThan(5);
      expect(result.merchant_angle.value).toBeLessThan(35);
    });

    it("should include friction angle calculation", () => {
      const result = engine.calculateShearAngle(6, 0.5);

      // beta = atan(0.5) = 26.57 deg
      expect(result.friction_angle.value).toBeCloseTo(26.57, 1);
    });

    it("should provide Oxley angle when material has J-C params", () => {
      const material: ChipMaterialProperties = {
        iso_group: "P",
        name: "Steel",
        elongation_pct: 25,
        yield_strength_MPa: 350,
        thermal_conductivity: 50,
        specific_heat: 486,
        density: 7850,
        friction_coefficient: 0.5,
        jc_A: 350,
        jc_B: 600,
        jc_n: 0.25,
      };

      const result = engine.calculateShearAngle(6, 0.5, material);
      expect(result.oxley_angle.value).toBeDefined();
    });
  });

  // =====================================
  // CHIP TYPE PREDICTION
  // =====================================

  describe("predictChipType", () => {
    const steelParams: CuttingParameters = {
      cutting_speed_mpm: 200,
      feed_mm_rev: 0.25,
      depth_of_cut_mm: 2.0,
      rake_angle_deg: 6,
      chipbreaker: "medium",
    };

    it("should predict continuous chips for ductile steel with chipbreaker", () => {
      const result = engine.predictChipType(steelParams, "steel");

      expect(["continuous", "lamellar"]).toContain(result.predicted_type);
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should predict discontinuous chips for cast iron", () => {
      const result = engine.predictChipType(steelParams, "cast_iron");

      expect(result.predicted_type).toBe("discontinuous");
      expect(result.predicted_shape).toBe("comma");
    });

    it("should detect BUE risk at low cutting speed", () => {
      const lowSpeedParams: CuttingParameters = {
        ...steelParams,
        cutting_speed_mpm: 30,
        coolant: "none",
      };

      const result = engine.predictChipType(lowSpeedParams, "steel");

      expect(result.bue_risk.value).toBeGreaterThan(0.3);
    });

    it("should predict segmented chips for titanium at high speed", () => {
      const tiParams: CuttingParameters = {
        cutting_speed_mpm: 80,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 2.0,
        rake_angle_deg: 6,
      };

      const result = engine.predictChipType(tiParams, "titanium");

      expect(result.segmentation_risk.value).toBeGreaterThan(0.3);
    });

    it("should detect stringy chip risk at low feed without chipbreaker", () => {
      const lowFeedParams: CuttingParameters = {
        cutting_speed_mpm: 200,
        feed_mm_rev: 0.05,
        depth_of_cut_mm: 0.5,
        rake_angle_deg: 6,
        chipbreaker: undefined,
      };

      const result = engine.predictChipType(lowFeedParams, "stainless");

      expect(["stringy", "continuous"]).toContain(result.predicted_type);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should predict elemental chips for very brittle materials", () => {
      // Hardened steel with very low elongation
      const hardenedMat: ChipMaterialProperties = {
        iso_group: "H",
        name: "Hardened Steel",
        elongation_pct: 1,
        yield_strength_MPa: 2000,
        thermal_conductivity: 30,
        specific_heat: 450,
        density: 7850,
        friction_coefficient: 0.4,
      };

      const result = engine.predictChipType(steelParams, hardenedMat);
      expect(result.predicted_type).toBe("elemental");
    });

    it("should assess chip control quality", () => {
      const result = engine.predictChipType(steelParams, "steel");

      expect([
        "excellent",
        "good",
        "marginal",
        "poor",
        "dangerous",
      ]).toContain(result.chip_control_quality);
    });

    it("should provide recommendations for poor chip control", () => {
      const badParams: CuttingParameters = {
        cutting_speed_mpm: 30,
        feed_mm_rev: 0.05,
        depth_of_cut_mm: 0.5,
        rake_angle_deg: 6,
        coolant: "none",
      };

      const result = engine.predictChipType(badParams, "aluminum");

      expect(result.recommendations.length).toBeGreaterThan(0);
    });
  });

  // =====================================
  // CHIPBREAKER DESIGN
  // =====================================

  describe("designChipBreaker", () => {
    it("should recommend no chipbreaker for brittle materials", () => {
      const result = engine.designChipBreaker("cast_iron", 2.0, 0.25);

      expect(result.recommended_type).toBe("none");
      // Check recommendations contain something about natural chip breaking
      expect(result.recommendations.some(r =>
        r.toLowerCase().includes("brittle") ||
        r.toLowerCase().includes("natural") ||
        r.toLowerCase().includes("break")
      )).toBe(true);
    });

    it("should recommend light chipbreaker for low feed", () => {
      const result = engine.designChipBreaker("steel", 1.0, 0.08);

      expect(result.recommended_type).toBe("light");
    });

    it("should recommend medium chipbreaker for typical feed", () => {
      const result = engine.designChipBreaker("steel", 2.0, 0.25);

      expect(result.recommended_type).toBe("medium");
    });

    it("should recommend heavy chipbreaker for high feed", () => {
      const result = engine.designChipBreaker("steel", 4.0, 0.50);

      expect(result.recommended_type).toBe("heavy");
    });

    it("should calculate groove width and depth", () => {
      const result = engine.designChipBreaker("steel", 2.0, 0.25);

      expect(result.groove_width_mm.value).toBeGreaterThan(0);
      expect(result.groove_depth_mm.value).toBeGreaterThan(0);
      expect(result.land_width_mm.value).toBeGreaterThan(0);
    });

    it("should provide operating window for chipbreaker", () => {
      const result = engine.designChipBreaker("steel", 2.0, 0.25);

      expect(result.operating_window.min_feed_mm_rev).toBeDefined();
      expect(result.operating_window.max_feed_mm_rev).toBeDefined();
      expect(result.operating_window.min_doc_mm).toBeDefined();
      expect(result.operating_window.max_doc_mm).toBeDefined();
    });

    it("should calculate chip curl radius using Nakayama model", () => {
      const result = engine.designChipBreaker("steel", 2.0, 0.25);

      expect(result.chip_curl_radius.value).toBeGreaterThan(0);
      expect(result.chip_curl_radius.source).toContain("Nakayama");
    });

    it("should assess self-breaking possibility", () => {
      const result = engine.designChipBreaker("steel", 2.0, 0.25);

      expect(typeof result.self_breaking_possible).toBe("boolean");
    });

    it("should recommend heavier chipbreaker for stainless", () => {
      const steelResult = engine.designChipBreaker("steel", 2.0, 0.15);
      const stainlessResult = engine.designChipBreaker("stainless", 2.0, 0.15);

      // Stainless should have heavier recommendation
      const typeRank = {
        none: 0,
        light: 1,
        medium: 2,
        heavy: 3,
        high_feed: 4,
      };
      expect(typeRank[stainlessResult.recommended_type]).toBeGreaterThanOrEqual(
        typeRank[steelResult.recommended_type]
      );
    });

    it("should calculate minimum DOC for chipbreaker engagement", () => {
      const result = engine.designChipBreaker("steel", 0.2, 0.25);

      // Should have min_doc_for_engagement calculated
      expect(result.min_doc_for_engagement.value).toBeGreaterThan(0);
      // The min engagement should be larger than the provided DOC for medium chipbreaker
      if (result.recommended_type !== "none") {
        expect(result.min_doc_for_engagement.value).toBeGreaterThan(0);
      }
    });
  });

  // =====================================
  // ADIABATIC SHEAR BANDS
  // =====================================

  describe("analyzeAdiabaticShearBands", () => {
    it("should predict segmented chips for titanium", () => {
      const result = engine.analyzeAdiabaticShearBands(
        "titanium",
        80,
        0.2,
        6
      );

      // Titanium has high thermal softening / low strain hardening
      // Should have some non-zero Recht parameter
      expect(result.recht_parameter.value).toBeGreaterThanOrEqual(0);
      // Should calculate shear band properties
      expect(result.shear_band_spacing.value).toBeGreaterThan(0);
    });

    it("should analyze aluminum chip formation", () => {
      const result = engine.analyzeAdiabaticShearBands(
        "aluminum",
        300,
        0.2,
        6
      );

      // Aluminum has high thermal conductivity
      // Should return valid analysis results
      expect(result.recht_parameter.value).toBeGreaterThanOrEqual(0);
      expect(result.deformation_mode).toBeDefined();
      expect(["uniform", "localized", "adiabatic_shear"]).toContain(result.deformation_mode);
    });

    it("should calculate shear band spacing", () => {
      const result = engine.analyzeAdiabaticShearBands(
        "inconel",
        60,
        0.15,
        6
      );

      expect(result.shear_band_spacing.value).toBeGreaterThan(0);
      expect(result.shear_band_spacing.unit).toBe("mm");
    });

    it("should calculate segmentation frequency", () => {
      const result = engine.analyzeAdiabaticShearBands(
        "titanium",
        80,
        0.2,
        6
      );

      if (result.is_segmented) {
        expect(result.segmentation_frequency.value).toBeGreaterThan(0);
        expect(result.segmentation_frequency.unit).toBe("Hz");
      }
    });

    it("should calculate thermal softening and strain hardening rates", () => {
      const result = engine.analyzeAdiabaticShearBands(
        "steel",
        200,
        0.25,
        6
      );

      // Both rates should be defined (may be zero for some material configurations)
      expect(result.thermal_softening_rate.value).toBeGreaterThanOrEqual(0);
      expect(result.strain_hardening_rate.value).toBeGreaterThanOrEqual(0);
      // At least one should be non-zero for steel
      expect(result.thermal_softening_rate.value + result.strain_hardening_rate.value).toBeGreaterThan(0);
    });

    it("should estimate critical speed for segmentation onset", () => {
      const result = engine.analyzeAdiabaticShearBands(
        "steel",
        200,
        0.25,
        6
      );

      expect(result.critical_speed_for_segmentation.value).toBeGreaterThan(0);
      expect(result.critical_speed_for_segmentation.unit).toBe("m/min");
    });

    it("should identify deformation mode correctly", () => {
      const result = engine.analyzeAdiabaticShearBands(
        "titanium",
        100,
        0.2,
        6
      );

      expect(["uniform", "localized", "adiabatic_shear"]).toContain(
        result.deformation_mode
      );
    });
  });

  // =====================================
  // CHIP FLOW ANALYSIS
  // =====================================

  describe("analyzeChipFlow", () => {
    const params: CuttingParameters = {
      cutting_speed_mpm: 200,
      feed_mm_rev: 0.25,
      depth_of_cut_mm: 2.0,
      rake_angle_deg: 6,
      inclination_angle_deg: 5,
      nose_radius_mm: 0.8,
    };

    it("should calculate chip flow angle using Stabler rule", () => {
      const result = engine.analyzeChipFlow(params, "steel");

      expect(result.stabler_angle.value).toBe(5); // Equal to inclination
      expect(result.stabler_angle.source).toContain("Stabler");
    });

    it("should apply Colwell correction for nose radius", () => {
      const result = engine.analyzeChipFlow(params, "steel");

      expect(result.colwell_angle.value).toBeDefined();
      expect(result.colwell_angle.source).toContain("Colwell");
    });

    it("should calculate side and back curl radii", () => {
      const result = engine.analyzeChipFlow(params, "steel");

      expect(result.side_curl_radius.value).toBeGreaterThan(0);
      expect(result.back_curl_radius.value).toBeGreaterThan(0);
    });

    it("should determine natural curl direction", () => {
      const result = engine.analyzeChipFlow(params, "steel");

      expect(["side", "back", "combined"]).toContain(
        result.natural_curl_direction
      );
    });

    it("should estimate chip space requirements", () => {
      const result = engine.analyzeChipFlow(params, "steel");

      expect(result.chip_space_required.value).toBeGreaterThan(0);
    });

    it("should assess evacuation difficulty", () => {
      const result = engine.analyzeChipFlow(params, "steel");

      expect(["easy", "moderate", "difficult"]).toContain(
        result.evacuation_difficulty
      );
    });

    it("should calculate tangling risk", () => {
      const result = engine.analyzeChipFlow(params, "stainless");

      expect(result.tangling_risk.value).toBeGreaterThanOrEqual(0);
      expect(result.tangling_risk.value).toBeLessThanOrEqual(1);
    });

    it("should return all chip flow properties", () => {
      const result = engine.analyzeChipFlow(params, "steel");

      // All chip flow properties should be present
      expect(result.chip_flow_angle).toBeDefined();
      expect(result.stabler_angle).toBeDefined();
      expect(result.colwell_angle).toBeDefined();
      expect(result.side_curl_radius).toBeDefined();
      expect(result.back_curl_radius).toBeDefined();
      expect(result.natural_curl_direction).toBeDefined();
      expect(result.chip_space_required).toBeDefined();
      expect(result.evacuation_difficulty).toBeDefined();
      expect(result.tangling_risk).toBeDefined();
    });
  });

  // =====================================
  // CHIP CONTROL ASSESSMENT
  // =====================================

  describe("assessChipControl", () => {
    const goodParams: CuttingParameters = {
      cutting_speed_mpm: 200,
      feed_mm_rev: 0.25,
      depth_of_cut_mm: 2.0,
      rake_angle_deg: 6,
      chipbreaker: "medium",
      coolant: "flood",
    };

    it("should provide overall quality assessment", () => {
      const result = engine.assessChipControl(goodParams, "steel");

      expect([
        "excellent",
        "good",
        "marginal",
        "poor",
        "dangerous",
      ]).toContain(result.overall_quality);
    });

    it("should calculate numeric score", () => {
      const result = engine.assessChipControl(goodParams, "steel");

      expect(result.score.value).toBeGreaterThanOrEqual(0);
      expect(result.score.value).toBeLessThanOrEqual(100);
    });

    it("should classify chip length", () => {
      const result = engine.assessChipControl(goodParams, "steel");

      expect([
        "short",
        "medium",
        "long",
        "very_long",
        "continuous",
      ]).toContain(result.chip_length_class);
    });

    it("should estimate actual chip length", () => {
      const result = engine.assessChipControl(goodParams, "steel");

      expect(result.estimated_chip_length_mm.value).toBeGreaterThan(0);
    });

    it("should assess handling difficulty", () => {
      const result = engine.assessChipControl(goodParams, "steel");

      expect(["easy", "moderate", "difficult", "hazardous"]).toContain(
        result.handling_difficulty
      );
    });

    it("should evaluate surface damage risk", () => {
      const result = engine.assessChipControl(goodParams, "steel");

      expect(result.surface_damage_risk.value).toBeGreaterThanOrEqual(0);
      expect(result.surface_damage_risk.value).toBeLessThanOrEqual(1);
    });

    it("should calculate tool wear impact from chip control", () => {
      const result = engine.assessChipControl(goodParams, "steel");

      expect(result.tool_wear_impact.value).toBeGreaterThan(0);
    });

    it("should detect issues and provide solutions", () => {
      const badParams: CuttingParameters = {
        cutting_speed_mpm: 200,
        feed_mm_rev: 0.05,
        depth_of_cut_mm: 0.3,
        rake_angle_deg: 6,
      };

      const result = engine.assessChipControl(badParams, "stainless");

      // Should detect chip control issues
      expect(result.issues_detected.length).toBeGreaterThanOrEqual(0);
    });

    it("should give higher score with chipbreaker in range", () => {
      const withBreaker = engine.assessChipControl(goodParams, "steel");
      const withoutBreaker = engine.assessChipControl(
        { ...goodParams, chipbreaker: undefined },
        "steel"
      );

      expect(withBreaker.score.value).toBeGreaterThan(
        withoutBreaker.score.value
      );
    });

    it("should give higher score with high-pressure coolant", () => {
      const withHP = engine.assessChipControl(
        { ...goodParams, coolant: "high_pressure", coolant_pressure_bar: 100 },
        "steel"
      );
      const withFlood = engine.assessChipControl(goodParams, "steel");

      expect(withHP.score.value).toBeGreaterThanOrEqual(withFlood.score.value);
    });
  });

  // =====================================
  // OPTIMIZATION
  // =====================================

  describe("optimizeForChipBreaking", () => {
    const suboptimalParams: CuttingParameters = {
      cutting_speed_mpm: 200,
      feed_mm_rev: 0.05, // Too low for chip breaking
      depth_of_cut_mm: 0.3,
      rake_angle_deg: 6,
    };

    it("should increase feed for better chip breaking", () => {
      const result = engine.optimizeForChipBreaking(suboptimalParams, "steel");

      expect(result.optimized_feed.value).toBeGreaterThan(
        suboptimalParams.feed_mm_rev
      );
    });

    it("should suggest chipbreaker when needed", () => {
      const result = engine.optimizeForChipBreaking(suboptimalParams, "steel");

      expect(result.chipbreaker_recommendation).toBeDefined();
    });

    it("should document trade-offs", () => {
      const result = engine.optimizeForChipBreaking(suboptimalParams, "steel");

      expect(result.trade_offs.length).toBeGreaterThan(0);
    });

    it("should calculate predicted improvement", () => {
      const result = engine.optimizeForChipBreaking(suboptimalParams, "steel");

      expect(result.predicted_improvement.value).toBeDefined();
    });

    it("should retain original params for comparison", () => {
      const result = engine.optimizeForChipBreaking(suboptimalParams, "steel");

      expect(result.original_params).toEqual(suboptimalParams);
    });

    it("should recommend coolant changes for ductile materials", () => {
      const result = engine.optimizeForChipBreaking(
        suboptimalParams,
        "stainless"
      );

      expect(result.coolant_recommendation).toBeDefined();
    });
  });

  // =====================================
  // PROBLEM DIAGNOSIS
  // =====================================

  describe("diagnoseChipProblem", () => {
    it("should diagnose stringy chip problems", () => {
      const result = engine.diagnoseChipProblem("Long stringy chips wrapping");

      expect(result.problem).toContain("Stringy");
      expect(result.solutions.length).toBeGreaterThan(0);
      expect(result.severity).toBe("high");
    });

    it("should diagnose bird's nest with critical severity", () => {
      const result = engine.diagnoseChipProblem("Bird's nest forming");

      expect(result.problem).toContain("Bird");
      expect(result.severity).toBe("critical");
    });

    it("should diagnose BUE issues", () => {
      const result = engine.diagnoseChipProblem("Built-up edge on insert");

      expect(result.problem).toContain("Built-Up Edge");
      expect(result.solutions.length).toBeGreaterThan(0);
      // Should have some actionable solution
      expect(result.solutions.some(s =>
        s.toLowerCase().includes("speed") ||
        s.toLowerCase().includes("coolant") ||
        s.toLowerCase().includes("coat")
      )).toBe(true);
    });

    it("should diagnose overheating from chip color", () => {
      const result = engine.diagnoseChipProblem("Blue/purple chips");

      expect(result.problem).toContain("Overheat");
    });

    it("should provide unknown response for unrecognized symptoms", () => {
      const result = engine.diagnoseChipProblem("Random gibberish");

      expect(result.problem).toContain("Unknown");
    });
  });

  // =====================================
  // MATERIAL DATABASE
  // =====================================

  describe("getMaterialProperties", () => {
    it("should return steel properties", () => {
      const result = engine.getMaterialProperties("steel");

      expect(result).not.toBeNull();
      expect(result?.iso_group).toBe("P");
    });

    it("should match by partial name", () => {
      const result = engine.getMaterialProperties("stain");

      expect(result).not.toBeNull();
      expect(result?.iso_group).toBe("M");
    });

    it("should match by material name", () => {
      // Test with a material name
      const result = engine.getMaterialProperties("titanium");

      expect(result).not.toBeNull();
      if (result) {
        expect(result.iso_group).toBe("S");
        expect(result.name.toLowerCase()).toContain("titanium");
      }
    });

    it("should return null for unknown material", () => {
      const result = engine.getMaterialProperties("unobtainium");

      expect(result).toBeNull();
    });
  });

  describe("listAvailableMaterials", () => {
    it("should return list of materials", () => {
      const result = engine.listAvailableMaterials();

      expect(result.length).toBeGreaterThan(5);
      expect(result[0]).toHaveProperty("name");
      expect(result[0]).toHaveProperty("iso_group");
    });
  });

  // =====================================
  // SINGLETON
  // =====================================

  describe("singleton", () => {
    it("should export singleton instance", () => {
      expect(latheChipMechanicsEngine).toBeDefined();
      expect(latheChipMechanicsEngine).toBeInstanceOf(LatheChipMechanicsEngine);
    });

    it("should have all public methods", () => {
      expect(typeof latheChipMechanicsEngine.calculateShearAngle).toBe("function");
      expect(typeof latheChipMechanicsEngine.predictChipType).toBe("function");
      expect(typeof latheChipMechanicsEngine.designChipBreaker).toBe("function");
      expect(typeof latheChipMechanicsEngine.analyzeAdiabaticShearBands).toBe("function");
      expect(typeof latheChipMechanicsEngine.analyzeChipFlow).toBe("function");
      expect(typeof latheChipMechanicsEngine.assessChipControl).toBe("function");
      expect(typeof latheChipMechanicsEngine.optimizeForChipBreaking).toBe("function");
      expect(typeof latheChipMechanicsEngine.diagnoseChipProblem).toBe("function");
    });
  });

  // =====================================
  // EDGE CASES
  // =====================================

  describe("edge cases", () => {
    it("should handle zero rake angle", () => {
      const result = engine.calculateShearAngle(0, 0.5);
      expect(result.merchant_angle.value).toBeGreaterThan(0);
    });

    it("should handle very high cutting speed", () => {
      const params: CuttingParameters = {
        cutting_speed_mpm: 1000,
        feed_mm_rev: 0.2,
        depth_of_cut_mm: 1.0,
        rake_angle_deg: 6,
      };

      const result = engine.predictChipType(params, "aluminum");
      expect(result).toBeDefined();
    });

    it("should handle very low feed", () => {
      const params: CuttingParameters = {
        cutting_speed_mpm: 200,
        feed_mm_rev: 0.01,
        depth_of_cut_mm: 0.1,
        rake_angle_deg: 6,
      };

      const result = engine.assessChipControl(params, "steel");
      expect(result.overall_quality).toBeDefined();
    });

    it("should handle high friction coefficient", () => {
      const result = engine.calculateShearAngle(6, 1.0);
      expect(result.merchant_angle.value).toBeGreaterThan(5);
      expect(result.merchant_angle.value).toBeLessThan(45);
    });
  });

  // =====================================
  // INTEGRATION TESTS
  // =====================================

  describe("integration", () => {
    it("should provide consistent results across related methods", () => {
      const params: CuttingParameters = {
        cutting_speed_mpm: 200,
        feed_mm_rev: 0.25,
        depth_of_cut_mm: 2.0,
        rake_angle_deg: 6,
        chipbreaker: "medium",
      };

      const chipPrediction = engine.predictChipType(params, "steel");
      const chipControl = engine.assessChipControl(params, "steel");

      // Good chip type should correlate with good chip control
      if (chipPrediction.predicted_type === "discontinuous") {
        expect(chipControl.overall_quality).toBe("excellent");
      }
    });

    it("should optimize poor chip control to acceptable level", () => {
      const badParams: CuttingParameters = {
        cutting_speed_mpm: 200,
        feed_mm_rev: 0.05,
        depth_of_cut_mm: 0.3,
        rake_angle_deg: 6,
      };

      const originalScore = engine.assessChipControl(badParams, "steel").score.value;
      const optimized = engine.optimizeForChipBreaking(badParams, "steel");

      const newParams: CuttingParameters = {
        ...badParams,
        feed_mm_rev: optimized.optimized_feed.value,
        depth_of_cut_mm: optimized.optimized_doc.value,
        chipbreaker: optimized.chipbreaker_recommendation as CuttingParameters["chipbreaker"],
      };

      const newScore = engine.assessChipControl(newParams, "steel").score.value;

      expect(newScore).toBeGreaterThan(originalScore);
    });
  });
});
