/**
 * LatheTroubleshootingIntelligenceEngine Tests — LLM-INTEL-10
 *
 * Tests for practical machinist troubleshooting:
 *   1. Tool overhang analysis
 *   2. Workpiece overhang analysis
 *   3. Chatter diagnosis
 *   4. Machining error diagnosis
 *   5. Tool breakage risk assessment
 *   6. Setup validation
 *
 * @module __tests__/lathe-troubleshooting-intelligence.test
 */

import { describe, it, expect } from "vitest";
import {
  LatheTroubleshootingIntelligenceEngine,
  latheTroubleshootingIntelligenceEngine,
  type ToolSetup,
  type WorkpieceSetup,
  type CuttingParameters,
} from "../engines/LatheTroubleshootingIntelligenceEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const standardToolSetup: ToolSetup = {
  tool_type: "turning",
  shank_diameter_mm: 25,
  overhang_mm: 75,
  holder_type: "standard",
  insert_size_mm: 12,
  tool_material: "carbide",
  is_internal: false,
};

const boringBarSetup: ToolSetup = {
  tool_type: "boring_bar",
  shank_diameter_mm: 20,
  overhang_mm: 100,
  holder_type: "standard",
  insert_size_mm: 8,
  tool_material: "carbide",
  is_internal: true,
};

const extremeOverhangTool: ToolSetup = {
  tool_type: "boring_bar",
  shank_diameter_mm: 16,
  overhang_mm: 120,  // L/D = 7.5, way too high
  holder_type: "standard",
  insert_size_mm: 6,
  tool_material: "carbide",
  is_internal: true,
};

const dampedBoringBar: ToolSetup = {
  tool_type: "boring_bar",
  shank_diameter_mm: 20,
  overhang_mm: 100,
  holder_type: "damped",
  insert_size_mm: 8,
  tool_material: "carbide",
  is_internal: true,
};

const standardWorkpiece: WorkpieceSetup = {
  diameter_mm: 50,
  length_mm: 150,
  material: "1045 Steel",
  hardness_hrc: 25,
  holding_method: "3_jaw_chuck",
  chuck_grip_length_mm: 40,
  tailstock_support: false,
  steady_rest: false,
};

const longWorkpiece: WorkpieceSetup = {
  diameter_mm: 30,
  length_mm: 300,
  material: "1045 Steel",
  hardness_hrc: 25,
  holding_method: "3_jaw_chuck",
  chuck_grip_length_mm: 40,
  tailstock_support: false,
  steady_rest: false,
};

const supportedWorkpiece: WorkpieceSetup = {
  diameter_mm: 30,
  length_mm: 300,
  material: "1045 Steel",
  hardness_hrc: 25,
  holding_method: "3_jaw_chuck",
  chuck_grip_length_mm: 40,
  tailstock_support: true,
  steady_rest: false,
};

const thinWallWorkpiece: WorkpieceSetup = {
  diameter_mm: 80,
  length_mm: 100,
  material: "6061 Aluminum",
  wall_thickness_mm: 2,
  holding_method: "3_jaw_chuck",
  chuck_grip_length_mm: 30,
  tailstock_support: false,
  steady_rest: false,
};

const standardCuttingParams: CuttingParameters = {
  cutting_speed_m_min: 200,
  feed_mm_rev: 0.2,
  depth_of_cut_mm: 2,
  operation: "roughing",
  coolant: "flood",
};

const heavyCuttingParams: CuttingParameters = {
  cutting_speed_m_min: 180,
  feed_mm_rev: 0.35,
  depth_of_cut_mm: 4,
  operation: "roughing",
  coolant: "flood",
};

const finishingParams: CuttingParameters = {
  cutting_speed_m_min: 250,
  feed_mm_rev: 0.1,
  depth_of_cut_mm: 0.5,
  operation: "finishing",
  coolant: "flood",
};

// ============================================================================
// TESTS
// ============================================================================

describe("LatheTroubleshootingIntelligenceEngine", () => {
  const engine = latheTroubleshootingIntelligenceEngine;

  describe("analyzeToolOverhang", () => {
    it("should identify safe tool overhang", () => {
      const result = engine.analyzeToolOverhang(standardToolSetup, standardCuttingParams);

      expect(result.ld_ratio).toBeCloseTo(3, 1);  // 75/25 = 3
      expect(result.risk_level).toBe("safe");
      expect(result.max_safe_overhang_mm).toBeGreaterThan(standardToolSetup.overhang_mm);
    });

    it("should flag dangerous boring bar overhang", () => {
      const result = engine.analyzeToolOverhang(extremeOverhangTool, standardCuttingParams);

      expect(result.ld_ratio).toBeGreaterThan(7);  // 120/16 = 7.5
      expect(result.risk_level).toBe("dangerous");
      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it("should recommend damped holder for high L/D", () => {
      const result = engine.analyzeToolOverhang(boringBarSetup, standardCuttingParams);

      // L/D = 5, marginal for boring bar
      expect(result.ld_ratio).toBeCloseTo(5, 1);
      expect(result.recommendations.some(r =>
        r.action.toLowerCase().includes("damped")
      )).toBe(true);
    });

    it("should allow higher L/D with damped holder", () => {
      const standardResult = engine.analyzeToolOverhang(boringBarSetup, standardCuttingParams);
      const dampedResult = engine.analyzeToolOverhang(dampedBoringBar, standardCuttingParams);

      // Same L/D ratio but damped should be safer
      expect(dampedResult.max_safe_overhang_mm).toBeGreaterThan(standardResult.max_safe_overhang_mm);
    });

    it("should calculate deflection estimate", () => {
      const result = engine.analyzeToolOverhang(boringBarSetup, heavyCuttingParams);

      expect(result.deflection_estimate_mm).toBeGreaterThan(0);
      expect(result.deflection_estimate_mm).toBeLessThan(1);  // Should be reasonable
    });

    it("should suggest parameter adjustments for risky setups", () => {
      const result = engine.analyzeToolOverhang(extremeOverhangTool, heavyCuttingParams);

      expect(result.parameter_adjustments.length).toBeGreaterThan(0);
      expect(result.parameter_adjustments.some(p => p.parameter === "depth_of_cut")).toBe(true);
    });
  });

  describe("analyzeWorkpieceOverhang", () => {
    it("should identify safe workpiece setup", () => {
      const result = engine.analyzeWorkpieceOverhang(standardWorkpiece, standardCuttingParams);

      // L/D = (150-40)/50 = 2.2, should be safe
      expect(result.ld_ratio).toBeLessThan(3);
      expect(result.risk_level).toBe("safe");
    });

    it("should flag dangerous workpiece overhang", () => {
      const result = engine.analyzeWorkpieceOverhang(longWorkpiece, standardCuttingParams);

      // L/D = (300-40)/30 = 8.7, dangerous
      expect(result.ld_ratio).toBeGreaterThan(8);
      expect(result.risk_level).toBe("dangerous");
      expect(result.support_requirements.some(s => s.required)).toBe(true);
    });

    it("should recommend tailstock for long parts", () => {
      const result = engine.analyzeWorkpieceOverhang(longWorkpiece, standardCuttingParams);

      expect(result.support_requirements.some(s =>
        s.support_type === "tailstock" && s.required
      )).toBe(true);
    });

    it("should recognize tailstock support eliminates overhang", () => {
      const result = engine.analyzeWorkpieceOverhang(supportedWorkpiece, standardCuttingParams);

      expect(result.unsupported_length_mm).toBe(0);
      expect(result.risk_level).toBe("safe");
    });

    it("should warn about thin wall parts", () => {
      const result = engine.analyzeWorkpieceOverhang(thinWallWorkpiece, standardCuttingParams);

      expect(result.warnings.some(w => w.toLowerCase().includes("thin"))).toBe(true);
      expect(result.chuck_pressure_recommendation.toLowerCase()).toContain("reduce");
    });

    it("should estimate tip deflection", () => {
      const result = engine.analyzeWorkpieceOverhang(longWorkpiece, heavyCuttingParams);

      expect(result.deflection_at_tip_mm).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("deflection"))).toBe(true);
    });
  });

  describe("diagnoseChatter", () => {
    it("should diagnose regenerative chatter from symptoms", () => {
      const result = engine.diagnoseChatter(
        {
          surface_pattern: "fine_waves",
          noise_type: "squeal",
          when_occurs: "always",
        },
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.likely_type).toBe("regenerative");
      expect(result.confidence).toBeGreaterThan(0.5);
    });

    it("should identify tool overhang as chatter cause", () => {
      const result = engine.diagnoseChatter(
        {
          surface_pattern: "fine_waves",
          noise_type: "squeal",
          when_occurs: "always",
        },
        extremeOverhangTool,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.root_causes.some(c =>
        c.cause.toLowerCase().includes("overhang")
      )).toBe(true);
    });

    it("should identify workpiece flexibility as cause", () => {
      const result = engine.diagnoseChatter(
        {
          surface_pattern: "coarse_marks",
          noise_type: "growl",
          when_occurs: "always",
        },
        standardToolSetup,
        longWorkpiece,
        standardCuttingParams
      );

      expect(result.root_causes.some(c =>
        c.cause.toLowerCase().includes("workpiece")
      )).toBe(true);
      expect(result.setup_changes.some(s =>
        s.toLowerCase().includes("tailstock") || s.toLowerCase().includes("steady")
      )).toBe(true);
    });

    it("should suggest speed changes", () => {
      const result = engine.diagnoseChatter(
        {
          surface_pattern: "fine_waves",
          noise_type: "squeal",
          when_occurs: "at_certain_speeds",
        },
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.speed_recommendations.length).toBeGreaterThan(0);
      expect(result.speed_recommendations.some(s =>
        s.reason.toLowerCase().includes("resonance")
      )).toBe(true);
    });

    it("should recommend DOC reduction", () => {
      const result = engine.diagnoseChatter(
        {
          surface_pattern: "fine_waves",
          noise_type: "squeal",
          when_occurs: "at_high_doc",
        },
        standardToolSetup,
        standardWorkpiece,
        heavyCuttingParams
      );

      expect(result.parameter_fixes.some(p =>
        p.parameter === "depth_of_cut" && p.recommended_value < p.current_value
      )).toBe(true);
    });

    it("should identify thin-wall chatter risk", () => {
      const result = engine.diagnoseChatter(
        {
          surface_pattern: "fine_waves",
          noise_type: "squeal",
          when_occurs: "always",
        },
        standardToolSetup,
        thinWallWorkpiece,
        standardCuttingParams
      );

      expect(result.root_causes.some(c =>
        c.cause.toLowerCase().includes("thin") || c.cause.toLowerCase().includes("wall")
      )).toBe(true);
    });

    it("should rate chatter severity", () => {
      const mildResult = engine.diagnoseChatter(
        {
          surface_pattern: "fine_waves",
          noise_type: "squeal",
          when_occurs: "at_certain_speeds",
        },
        standardToolSetup,
        standardWorkpiece,
        finishingParams
      );

      const severeResult = engine.diagnoseChatter(
        {
          surface_pattern: "coarse_marks",
          noise_type: "growl",
          when_occurs: "always",
        },
        extremeOverhangTool,
        longWorkpiece,
        heavyCuttingParams
      );

      expect(severeResult.severity).toBe("severe");
    });
  });

  describe("diagnoseMachiningError", () => {
    it("should diagnose taper causes", () => {
      const result = engine.diagnoseMachiningError(
        "taper",
        { error_amount: 0.05, location: "end" },
        standardToolSetup,
        longWorkpiece,
        standardCuttingParams
      );

      expect(result.error_type).toBe("taper");
      expect(result.likely_causes.length).toBeGreaterThan(0);
      expect(result.corrective_actions.length).toBeGreaterThan(0);
    });

    it("should suggest tailstock check for taper", () => {
      const result = engine.diagnoseMachiningError(
        "taper",
        {},
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.likely_causes.some(c =>
        c.cause.toLowerCase().includes("tailstock")
      )).toBe(true);
    });

    it("should diagnose out of round causes", () => {
      const result = engine.diagnoseMachiningError(
        "out_of_round",
        { error_amount: 0.02 },
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.likely_causes.some(c =>
        c.cause.toLowerCase().includes("chuck") || c.cause.toLowerCase().includes("spindle")
      )).toBe(true);
    });

    it("should diagnose poor surface finish", () => {
      const result = engine.diagnoseMachiningError(
        "poor_finish",
        {},
        standardToolSetup,
        standardWorkpiece,
        heavyCuttingParams
      );

      expect(result.likely_causes.some(c =>
        c.cause.toLowerCase().includes("feed")
      )).toBe(true);
      expect(result.corrective_actions.some(a =>
        a.action.toLowerCase().includes("feed") || a.action.toLowerCase().includes("reduce")
      )).toBe(true);
    });

    it("should diagnose oversized parts", () => {
      const result = engine.diagnoseMachiningError(
        "oversized",
        { target_value: 50, actual_value: 50.05 },
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.likely_causes.some(c =>
        c.cause.toLowerCase().includes("wear") || c.cause.toLowerCase().includes("thermal")
      )).toBe(true);
    });

    it("should diagnose undersized parts", () => {
      const result = engine.diagnoseMachiningError(
        "undersized",
        { target_value: 50, actual_value: 49.95 },
        standardToolSetup,
        longWorkpiece,
        standardCuttingParams
      );

      expect(result.likely_causes.some(c =>
        c.cause.toLowerCase().includes("deflection")
      )).toBe(true);
    });

    it("should link chatter marks to chatter diagnosis", () => {
      const result = engine.diagnoseMachiningError(
        "chatter_marks",
        {},
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.corrective_actions.some(a =>
        a.action.toLowerCase().includes("speed")
      )).toBe(true);
    });

    it("should diagnose thread pitch errors", () => {
      const result = engine.diagnoseMachiningError(
        "thread_pitch_error",
        {},
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.likely_causes.some(c =>
        c.cause.toLowerCase().includes("encoder") || c.cause.toLowerCase().includes("calibration")
      )).toBe(true);
    });

    it("should diagnose concentricity issues", () => {
      const result = engine.diagnoseMachiningError(
        "concentricity",
        {},
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.likely_causes.some(c =>
        c.cause.toLowerCase().includes("rechuck") || c.cause.toLowerCase().includes("runout")
      )).toBe(true);
      expect(result.prevention_measures.length).toBeGreaterThan(0);
    });

    it("should provide measurement suggestions", () => {
      const result = engine.diagnoseMachiningError(
        "taper",
        {},
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.measurement_suggestions.length).toBeGreaterThan(0);
    });
  });

  describe("assessToolBreakageRisk", () => {
    it("should assess low risk for standard setup", () => {
      const result = engine.assessToolBreakageRisk(
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.overall_risk).toBe("low");
      expect(result.risk_score).toBeLessThan(30);
    });

    it("should assess elevated risk for extreme overhang", () => {
      const result = engine.assessToolBreakageRisk(
        extremeOverhangTool,
        standardWorkpiece,
        standardCuttingParams
      );

      // Extreme overhang alone contributes 30 points = "medium" risk
      // Combined with other factors could push to "high"
      expect(["medium", "high", "critical"]).toContain(result.overall_risk);
      expect(result.risk_factors.some(f =>
        f.factor.toLowerCase().includes("overhang")
      )).toBe(true);
    });

    it("should flag DOC exceeding insert size", () => {
      const deepCut: CuttingParameters = {
        ...standardCuttingParams,
        depth_of_cut_mm: 10,  // Exceeds 12mm insert by engagement
      };

      const result = engine.assessToolBreakageRisk(
        standardToolSetup,
        standardWorkpiece,
        deepCut
      );

      expect(result.parameter_limits.some(l =>
        l.parameter === "depth_of_cut" && l.exceeded
      )).toBe(true);
    });

    it("should flag excessive feed", () => {
      const highFeed: CuttingParameters = {
        ...standardCuttingParams,
        feed_mm_rev: 0.5,
      };

      const result = engine.assessToolBreakageRisk(
        standardToolSetup,
        standardWorkpiece,
        highFeed
      );

      expect(result.parameter_limits.some(l =>
        l.parameter === "feed" && l.exceeded
      )).toBe(true);
    });

    it("should provide warning signs", () => {
      const result = engine.assessToolBreakageRisk(
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.warning_signs.length).toBeGreaterThan(0);
      expect(result.warning_signs.some(w =>
        w.toLowerCase().includes("noise") || w.toLowerCase().includes("vibration")
      )).toBe(true);
    });

    it("should provide preventive actions", () => {
      const result = engine.assessToolBreakageRisk(
        extremeOverhangTool,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.preventive_actions.length).toBeGreaterThan(0);
    });

    it("should provide monitoring recommendations for high risk", () => {
      const result = engine.assessToolBreakageRisk(
        extremeOverhangTool,
        standardWorkpiece,
        heavyCuttingParams
      );

      expect(result.monitoring_recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("validateSetup", () => {
    it("should validate good setup", () => {
      const result = engine.validateSetup(
        standardToolSetup,
        standardWorkpiece,
        finishingParams
      );

      expect(result.valid).toBe(true);
      expect(result.score).toBeGreaterThan(80);
    });

    it("should fail validation for dangerous setup", () => {
      const result = engine.validateSetup(
        extremeOverhangTool,
        longWorkpiece,
        heavyCuttingParams
      );

      expect(result.valid).toBe(false);
      expect(result.issues_found.some(i => i.severity === "critical")).toBe(true);
    });

    it("should check tool overhang", () => {
      const result = engine.validateSetup(
        extremeOverhangTool,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.checklist_items.some(c =>
        c.item.toLowerCase().includes("overhang") && c.status !== "ok"
      )).toBe(true);
    });

    it("should check workpiece support", () => {
      const result = engine.validateSetup(
        standardToolSetup,
        longWorkpiece,
        standardCuttingParams
      );

      expect(result.issues_found.some(i =>
        i.category === "Workholding"
      )).toBe(true);
    });

    it("should check chuck grip length", () => {
      const shortGrip: WorkpieceSetup = {
        ...standardWorkpiece,
        chuck_grip_length_mm: 10,  // Very short grip
      };

      const result = engine.validateSetup(
        standardToolSetup,
        shortGrip,
        standardCuttingParams
      );

      expect(result.issues_found.some(i =>
        i.issue.toLowerCase().includes("grip")
      )).toBe(true);
    });

    it("should check thin wall handling", () => {
      const result = engine.validateSetup(
        standardToolSetup,
        thinWallWorkpiece,
        standardCuttingParams
      );

      expect(result.checklist_items.some(c =>
        c.item.toLowerCase().includes("wall") && c.status !== "ok"
      )).toBe(true);
    });

    it("should check parameter limits", () => {
      const extremeParams: CuttingParameters = {
        ...standardCuttingParams,
        feed_mm_rev: 0.6,  // Very high
      };

      const result = engine.validateSetup(
        standardToolSetup,
        standardWorkpiece,
        extremeParams
      );

      expect(result.issues_found.some(i =>
        i.category === "Parameters"
      )).toBe(true);
    });

    it("should provide risk assessment", () => {
      const result = engine.validateSetup(
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.risk_assessment).toBeTruthy();
      expect(result.risk_assessment.toLowerCase()).toContain("risk");
    });

    it("should provide recommendations", () => {
      const result = engine.validateSetup(
        extremeOverhangTool,
        longWorkpiece,
        heavyCuttingParams
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should include safety checklist items", () => {
      const result = engine.validateSetup(
        standardToolSetup,
        standardWorkpiece,
        standardCuttingParams
      );

      expect(result.checklist_items.some(c =>
        c.item.toLowerCase().includes("guard") || c.item.toLowerCase().includes("emergency")
      )).toBe(true);
    });
  });
});
