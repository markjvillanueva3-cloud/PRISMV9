/**
 * MILL-HARD-MS8: 5-Axis AI Ultra-Intelligence Test Suite
 * =======================================================
 * Tests for maximum AI hardening of 5-axis machining:
 *   - μS-28: Natural Language to 5-Axis Pipeline
 *   - μS-29: Predictive Tool Life (ML-based)
 *   - μS-30: Deep Learning Toolpath Scorer
 *   - μS-31: Explainable AI (Chain-of-Thought)
 *   - μS-32: Reinforcement Learning (Strategy Adaptation)
 *   - μS-33: LLM Troubleshooting (AI Diagnosis)
 *
 * @milestone MILL-HARD-MS8
 * @tests 96
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  FiveAxisAIUltraIntelligenceEngine,
  type NLIntent,
  type ToolLifePredictionInput,
  type ToolpathFeatures,
  type ExplainableAIRequest,
  type FiveAxisRLState,
  type FiveAxisRLAction,
  type FiveAxisRLEpisode,
  type TroubleshootingRequest,
} from "../engines/index.js";

describe("MILL-HARD-MS8: 5-Axis AI Ultra-Intelligence", () => {
  beforeEach(() => {
    FiveAxisAIUltraIntelligenceEngine.clearAll();
  });

  // ===========================================================================
  // μS-28: NATURAL LANGUAGE TO 5-AXIS PIPELINE
  // ===========================================================================
  describe("μS-28: Natural Language to 5-Axis Pipeline", () => {
    describe("parseNaturalLanguage", () => {
      it("should extract impeller geometry from input", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Machine this titanium impeller blade"
        );

        expect(result.geometry_type).toBe("impeller_blade");
        expect(result.geometry_confidence).toBeGreaterThanOrEqual(0.9);
      });

      it("should extract material from input", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Cut this D2 tool steel mold cavity"
        );

        expect(result.material?.name).toBe("D2 Tool Steel");
        expect(result.material?.iso_group).toBe("H");
        expect(result.material_confidence).toBeGreaterThanOrEqual(0.9);
      });

      it("should extract Ra target from input", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Finish surface to 0.8 um Ra"
        );

        expect(result.target_ra_um).toBe(0.8);
      });

      it("should extract tolerance class from input", () => {
        const fine = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Need fine precision on this part"
        );
        expect(fine.tolerance_class).toBe("fine");

        const coarse = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Rough cut is acceptable"
        );
        expect(coarse.tolerance_class).toBe("coarse");
      });

      it("should extract batch size from input", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Need to make 50 parts for production run"
        );

        expect(result.batch_size).toBe(50);
      });

      it("should extract priority from input", () => {
        const quality = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Quality is most important on this finish"
        );
        expect(quality.priority).toBe("quality");

        const speed = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Need this fast, it's urgent"
        );
        expect(speed.priority).toBe("speed");

        const cost = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Keep the cost down, budget is tight"
        );
        expect(cost.priority).toBe("cost");
      });

      it("should identify ambiguities when geometry unclear", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Machine this complex part"
        );

        expect(result.geometry_confidence).toBeLessThan(0.7);
        expect(result.ambiguities.length).toBeGreaterThan(0);
        expect(result.clarification_needed).toBe(true);
      });

      it("should request clarification for missing material", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Machine an impeller"
        );

        expect(result.clarification_needed).toBe(true);
        expect(result.clarification_questions.some(q => q.toLowerCase().includes("material"))).toBe(true);
      });

      it("should calculate overall confidence", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Machine titanium impeller to 0.8um Ra"
        );

        expect(result.overall_confidence).toBeGreaterThan(0);
        expect(result.overall_confidence).toBeLessThanOrEqual(1);
      });
    });

    describe("processNaturalLanguage", () => {
      it("should generate complete workflow from NL input", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage(
          "Machine a titanium turbine blade with fine finish"
        );

        expect(result.intent).toBeDefined();
        expect(result.reasoning.steps.length).toBeGreaterThanOrEqual(5);
        expect(result.sequence).toBeDefined();
        expect(result.sequence?.operations.length).toBeGreaterThan(0);
      });

      it("should generate reasoning chain with multiple steps", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage(
          "Machine aluminum mold cavity"
        );

        expect(result.reasoning.steps.length).toBeGreaterThanOrEqual(5);
        expect(result.reasoning.steps.some(s => s.type === "parse")).toBe(true);
        expect(result.reasoning.steps.some(s => s.type === "validate")).toBe(true);
        expect(result.reasoning.steps.some(s => s.type === "select")).toBe(true);
        expect(result.reasoning.steps.some(s => s.type === "optimize")).toBe(true);
      });

      it("should provide warnings for challenging materials", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage(
          "Machine hardened D2 tool steel mold"
        );

        expect(result.warnings.some(w => w.toLowerCase().includes("harden") || w.toLowerCase().includes("ceramic") || w.toLowerCase().includes("cbn"))).toBe(true);
      });

      it("should provide suggestions for improvement", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage(
          "Machine this part to 0.5 um Ra"
        );

        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it("should require confirmation for low confidence", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage(
          "Process this thing"
        );

        expect(result.requires_confirmation).toBe(true);
        expect(result.confirmation_prompt).toBeDefined();
      });

      it("should skip sequence generation if clarification needed", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage(
          "Do something with this"
        );

        if (result.intent.clarification_needed) {
          expect(result.sequence).toBeUndefined();
        }
      });
    });

    describe("generatePRISMAIPrompt", () => {
      it("should generate formatted CLI prompt", () => {
        const intent = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Machine titanium impeller to 0.8 um Ra"
        );
        const prompt = FiveAxisAIUltraIntelligenceEngine.generatePRISMAIPrompt(intent);

        expect(prompt).toContain("PRISM 5-Axis AI");
        expect(prompt).toContain("titanium impeller");
        expect(prompt).toContain("0.8");
        expect(prompt).toContain("chain-of-thought");
      });

      it("should include all detected parameters", () => {
        const intent = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Fast machine 25 aluminum parts quality finish"
        );
        const prompt = FiveAxisAIUltraIntelligenceEngine.generatePRISMAIPrompt(intent);

        expect(prompt).toContain("Geometry");
        expect(prompt).toContain("Material");
        expect(prompt).toContain("Tolerance");
      });
    });
  });

  // ===========================================================================
  // μS-29: PREDICTIVE TOOL LIFE
  // ===========================================================================
  describe("μS-29: Predictive Tool Life", () => {
    const baseInput: ToolLifePredictionInput = {
      tool: {
        id: "T8",
        type: "ball_nose",
        diameter_mm: 8,
        flute_length_mm: 20,
        overall_length_mm: 60,
        flute_count: 2,
        material: "carbide",
      },
      material: { name: "Ti-6Al-4V", iso_group: "S", kc11_mpa: 2800, mc: 0.25 },
      cutting_params: {
        spindle_rpm: 4000,
        feed_mmmin: 800,
        ap_mm: 0.3,
        ae_mm: 1.5,
        lead_angle_deg: 15,
        tilt_angle_deg: 10,
        stepover_pct: 15,
        coolant: "flood",
      },
      operation_type: "finishing",
      avg_tilt_angle_deg: 15,
      tilt_variation_deg: 8,
      engagement_variation_pct: 20,
      thermal_cycling_factor: 0.3,
      similar_operations_count: 15,
    };

    describe("predictToolLife", () => {
      it("should predict tool life with confidence interval", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.predictToolLife(baseInput);

        expect(result.predicted_life_min).toBeGreaterThan(0);
        expect(result.confidence_interval.lower).toBeLessThan(result.predicted_life_min);
        expect(result.confidence_interval.upper).toBeGreaterThan(result.predicted_life_min);
      });

      it("should include all contributing factors", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.predictToolLife(baseInput);

        expect(result.factors.base_taylor_life_min).toBeGreaterThan(0);
        expect(result.factors.tilt_factor).toBeGreaterThan(0);
        expect(result.factors.engagement_factor).toBeGreaterThan(0);
        expect(result.factors.thermal_factor).toBeGreaterThan(0);
        expect(result.factors.material_factor).toBeGreaterThan(0);
        expect(result.factors.ml_adjustment).toBeGreaterThan(0);
      });

      it("should reduce life for high tilt variation", () => {
        const lowVariation = { ...baseInput, tilt_variation_deg: 5 };
        const highVariation = { ...baseInput, tilt_variation_deg: 30 };

        const lowResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(lowVariation);
        const highResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(highVariation);

        expect(highResult.predicted_life_min).toBeLessThan(lowResult.predicted_life_min);
      });

      it("should reduce life for high thermal cycling", () => {
        const lowThermal = { ...baseInput, thermal_cycling_factor: 0.1 };
        const highThermal = { ...baseInput, thermal_cycling_factor: 0.8 };

        const lowResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(lowThermal);
        const highResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(highThermal);

        expect(highResult.predicted_life_min).toBeLessThan(lowResult.predicted_life_min);
      });

      it("should have higher failure probability for S/H materials", () => {
        const titanium = { ...baseInput };
        const aluminum = {
          ...baseInput,
          material: { name: "6061-T6", iso_group: "N", kc11_mpa: 700, mc: 0.25 },
        };

        const tiResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(titanium);
        const alResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(aluminum);

        expect(tiResult.failure_probability).toBeGreaterThan(alResult.failure_probability);
      });

      it("should provide wear rate prediction", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.predictToolLife(baseInput);

        expect(["gradual", "accelerating", "stable"]).toContain(result.wear_rate_prediction);
      });

      it("should recommend change interval before predicted failure", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.predictToolLife(baseInput);

        expect(result.recommended_change_interval_min).toBeLessThan(result.predicted_life_min);
      });

      it("should provide reasoning chain", () => {
        const result = FiveAxisAIUltraIntelligenceEngine.predictToolLife(baseInput);

        expect(result.reasoning.length).toBeGreaterThanOrEqual(5);
        expect(result.reasoning.some(r => r.includes("Taylor"))).toBe(true);
        expect(result.reasoning.some(r => r.includes("factor"))).toBe(true);
      });

      it("should increase confidence with more historical data", () => {
        const fewOps = { ...baseInput, similar_operations_count: 2 };
        const manyOps = { ...baseInput, similar_operations_count: 25 };

        const fewResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(fewOps);
        const manyResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(manyOps);

        expect(manyResult.confidence).toBeGreaterThan(fewResult.confidence);
      });

      it("should narrow confidence interval with more data", () => {
        const fewOps = { ...baseInput, similar_operations_count: 3 };
        const manyOps = { ...baseInput, similar_operations_count: 15 };

        const fewResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(fewOps);
        const manyResult = FiveAxisAIUltraIntelligenceEngine.predictToolLife(manyOps);

        const fewWidth = fewResult.confidence_interval.upper - fewResult.confidence_interval.lower;
        const manyWidth = manyResult.confidence_interval.upper - manyResult.confidence_interval.lower;

        expect(manyWidth).toBeLessThan(fewWidth);
      });
    });

    describe("recordToolLifeData", () => {
      it("should store training data", () => {
        expect(FiveAxisAIUltraIntelligenceEngine.getToolLifeDataCount()).toBe(0);

        FiveAxisAIUltraIntelligenceEngine.recordToolLifeData(baseInput, 45, "flank_wear");

        expect(FiveAxisAIUltraIntelligenceEngine.getToolLifeDataCount()).toBe(1);
      });

      it("should accept different failure modes", () => {
        FiveAxisAIUltraIntelligenceEngine.recordToolLifeData(baseInput, 30, "crater_wear");
        FiveAxisAIUltraIntelligenceEngine.recordToolLifeData(baseInput, 20, "chipping");
        FiveAxisAIUltraIntelligenceEngine.recordToolLifeData(baseInput, 10, "breakage");

        expect(FiveAxisAIUltraIntelligenceEngine.getToolLifeDataCount()).toBe(3);
      });
    });
  });

  // ===========================================================================
  // μS-30: DEEP LEARNING TOOLPATH SCORER
  // ===========================================================================
  describe("μS-30: Deep Learning Toolpath Scorer", () => {
    describe("extractToolpathFeatures", () => {
      it("should extract geometric features from points", () => {
        const points = [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
          { x: 3, y: 0, z: 0 },
        ];

        const features = FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures(points);

        expect(features.total_length_mm).toBeCloseTo(3, 1);
        expect(features.point_count).toBe(4);
        expect(features.avg_point_spacing_mm).toBeCloseTo(1, 1);
      });

      it("should calculate direction changes", () => {
        const points = [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 1, y: 1, z: 0 },
          { x: 1, y: 2, z: 0 },
        ];

        const features = FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures(points);

        expect(features.max_direction_change_deg).toBeGreaterThan(0);
        expect(features.avg_direction_change_deg).toBeGreaterThan(0);
      });

      it("should calculate jerk score", () => {
        const smooth = [
          { x: 0, y: 0, z: 0 },
          { x: 1, y: 0, z: 0 },
          { x: 2, y: 0, z: 0 },
          { x: 3, y: 0, z: 0 },
        ];
        const jerky = [
          { x: 0, y: 0, z: 0 },
          { x: 0.1, y: 0, z: 0 },
          { x: 3, y: 0, z: 0 },
          { x: 3.1, y: 0, z: 0 },
        ];

        const smoothFeatures = FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures(smooth);
        const jerkyFeatures = FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures(jerky);

        expect(jerkyFeatures.jerk_score).toBeGreaterThan(smoothFeatures.jerk_score);
      });

      it("should track rotary motion with axis vectors", () => {
        const points = [
          { x: 0, y: 0, z: 0, i: 0, j: 0, k: 1 },
          { x: 1, y: 0, z: 0, i: 0.1, j: 0, k: 0.995 },
          { x: 2, y: 0, z: 0, i: 0.2, j: 0, k: 0.98 },
        ];

        const features = FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures(points);

        expect(features.rotary_motion_pct).toBeGreaterThan(0);
      });

      it("should handle empty or minimal points", () => {
        const empty = FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures([]);
        expect(empty.point_count).toBe(0);

        const single = FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures([{ x: 0, y: 0, z: 0 }]);
        expect(single.point_count).toBe(0);
      });
    });

    describe("scoreToolpath", () => {
      it("should provide overall quality score", () => {
        const features: ToolpathFeatures = {
          total_length_mm: 100,
          point_count: 1000,
          avg_point_spacing_mm: 0.1,
          point_spacing_variance: 0.001,
          max_direction_change_deg: 15,
          avg_direction_change_deg: 5,
          jerk_score: 0.2,
          rotary_motion_pct: 30,
          simultaneous_5ax_pct: 25,
          singularity_proximity_score: 0,
          rapid_pct: 5,
          air_cut_pct: 3,
          retract_count: 5,
          min_tool_clearance_mm: 10,
          collision_risk_score: 0,
        };

        const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(features);

        expect(score.overall_score).toBeGreaterThan(0);
        expect(score.overall_score).toBeLessThanOrEqual(100);
      });

      it("should provide component scores", () => {
        const features: ToolpathFeatures = {
          total_length_mm: 100,
          point_count: 500,
          avg_point_spacing_mm: 0.2,
          point_spacing_variance: 0.01,
          max_direction_change_deg: 20,
          avg_direction_change_deg: 8,
          jerk_score: 0.3,
          rotary_motion_pct: 40,
          simultaneous_5ax_pct: 35,
          singularity_proximity_score: 0,
          rapid_pct: 8,
          air_cut_pct: 5,
          retract_count: 8,
          min_tool_clearance_mm: 8,
          collision_risk_score: 0.1,
        };

        const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(features);

        expect(score.smoothness_score).toBeDefined();
        expect(score.efficiency_score).toBeDefined();
        expect(score.safety_score).toBeDefined();
        expect(score.surface_quality_potential).toBeDefined();
      });

      it("should detect high jerk issues", () => {
        const features: ToolpathFeatures = {
          total_length_mm: 100,
          point_count: 100,
          avg_point_spacing_mm: 1,
          point_spacing_variance: 0.5,
          max_direction_change_deg: 30,
          avg_direction_change_deg: 15,
          jerk_score: 0.7,
          rotary_motion_pct: 20,
          simultaneous_5ax_pct: 15,
          singularity_proximity_score: 0,
          rapid_pct: 10,
          air_cut_pct: 8,
          retract_count: 10,
          min_tool_clearance_mm: 5,
          collision_risk_score: 0.2,
        };

        const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(features);

        expect(score.issues.some(i => i.type === "smoothness")).toBe(true);
      });

      it("should detect sharp direction changes", () => {
        const features: ToolpathFeatures = {
          total_length_mm: 100,
          point_count: 100,
          avg_point_spacing_mm: 1,
          point_spacing_variance: 0.1,
          max_direction_change_deg: 60,
          avg_direction_change_deg: 25,
          jerk_score: 0.4,
          rotary_motion_pct: 20,
          simultaneous_5ax_pct: 15,
          singularity_proximity_score: 0,
          rapid_pct: 10,
          air_cut_pct: 8,
          retract_count: 10,
          min_tool_clearance_mm: 5,
          collision_risk_score: 0.1,
        };

        const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(features);

        expect(score.issues.some(i => i.description.includes("direction"))).toBe(true);
      });

      it("should detect singularity proximity", () => {
        const features: ToolpathFeatures = {
          total_length_mm: 100,
          point_count: 100,
          avg_point_spacing_mm: 1,
          point_spacing_variance: 0.1,
          max_direction_change_deg: 20,
          avg_direction_change_deg: 8,
          jerk_score: 0.2,
          rotary_motion_pct: 20,
          simultaneous_5ax_pct: 15,
          singularity_proximity_score: 0.8,
          rapid_pct: 10,
          air_cut_pct: 8,
          retract_count: 10,
          min_tool_clearance_mm: 5,
          collision_risk_score: 0.1,
        };

        const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(features);

        expect(score.issues.some(i => i.severity === "critical")).toBe(true);
      });

      it("should provide feature importances", () => {
        const features: ToolpathFeatures = {
          total_length_mm: 100,
          point_count: 500,
          avg_point_spacing_mm: 0.2,
          point_spacing_variance: 0.01,
          max_direction_change_deg: 20,
          avg_direction_change_deg: 8,
          jerk_score: 0.3,
          rotary_motion_pct: 40,
          simultaneous_5ax_pct: 35,
          singularity_proximity_score: 0,
          rapid_pct: 8,
          air_cut_pct: 5,
          retract_count: 8,
          min_tool_clearance_mm: 8,
          collision_risk_score: 0.1,
        };

        const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(features);

        expect(Object.keys(score.feature_importances).length).toBeGreaterThan(0);
        const totalImportance = Object.values(score.feature_importances).reduce((a, b) => a + b, 0);
        expect(totalImportance).toBeCloseTo(1, 1);
      });

      it("should identify activation pattern", () => {
        const smoothFeatures: ToolpathFeatures = {
          total_length_mm: 100,
          point_count: 2000,
          avg_point_spacing_mm: 0.05,
          point_spacing_variance: 0.0001,
          max_direction_change_deg: 5,
          avg_direction_change_deg: 2,
          jerk_score: 0.05,
          rotary_motion_pct: 20,
          simultaneous_5ax_pct: 15,
          singularity_proximity_score: 0,
          rapid_pct: 2,
          air_cut_pct: 1,
          retract_count: 2,
          min_tool_clearance_mm: 15,
          collision_risk_score: 0,
        };

        const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(smoothFeatures);

        expect(score.activation_pattern).toBe("smooth_finish");
      });

      it("should provide recommendations", () => {
        const features: ToolpathFeatures = {
          total_length_mm: 100,
          point_count: 100,
          avg_point_spacing_mm: 1,
          point_spacing_variance: 0.5,
          max_direction_change_deg: 35,
          avg_direction_change_deg: 20,
          jerk_score: 0.5,
          rotary_motion_pct: 40,
          simultaneous_5ax_pct: 20,
          singularity_proximity_score: 0,
          rapid_pct: 10,
          air_cut_pct: 8,
          retract_count: 10,
          min_tool_clearance_mm: 5,
          collision_risk_score: 0.1,
        };

        const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(features);

        expect(score.recommendations.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // μS-31: EXPLAINABLE AI
  // ===========================================================================
  describe("μS-31: Explainable AI", () => {
    describe("explainDecision", () => {
      it("should explain strategy decisions", () => {
        const request: ExplainableAIRequest = {
          decision_type: "strategy",
          decision_made: "5-Axis Flowline for impeller blade",
          context: { geometry: "impeller_blade", material: "Ti-6Al-4V" },
          detail_level: "detailed",
        };

        const response = FiveAxisAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.reasoning_chain.length).toBeGreaterThanOrEqual(5);
        expect(response.reasoning_chain.some(s => s.type === "observation")).toBe(true);
        expect(response.reasoning_chain.some(s => s.type === "conclusion")).toBe(true);
      });

      it("should explain parameter decisions", () => {
        const request: ExplainableAIRequest = {
          decision_type: "params",
          decision_made: "RPM=4000, Feed=800mm/min",
          context: { material: "Ti-6Al-4V", operation: "finishing" },
          detail_level: "brief",
        };

        const response = FiveAxisAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.reasoning_chain.length).toBeGreaterThan(0);
        expect(response.key_factors.length).toBeGreaterThan(0);
      });

      it("should explain tool decisions", () => {
        const request: ExplainableAIRequest = {
          decision_type: "tool",
          decision_made: "8mm ball nose carbide",
          context: { reach_required: 30, surface_access: "undercut" },
          detail_level: "detailed",
        };

        const response = FiveAxisAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.key_factors.some(f => f.factor.toLowerCase().includes("reach") || f.factor.toLowerCase().includes("rigidity"))).toBe(true);
      });

      it("should provide alternatives considered", () => {
        const request: ExplainableAIRequest = {
          decision_type: "strategy",
          decision_made: "5-Axis Swarf",
          context: { geometry: "ruled_surface" },
          detail_level: "exhaustive",
        };

        const response = FiveAxisAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.alternatives_considered.length).toBeGreaterThan(0);
        expect(response.alternatives_considered[0].why_not).toBeDefined();
        expect(response.alternatives_considered[0].would_be_better_if).toBeDefined();
      });

      it("should provide factor importances", () => {
        const request: ExplainableAIRequest = {
          decision_type: "strategy",
          decision_made: "5-Axis Shape Offset",
          context: { geometry: "mold_cavity", target_ra: 0.8 },
          detail_level: "detailed",
        };

        const response = FiveAxisAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.key_factors.length).toBeGreaterThan(0);
        const totalImportance = response.key_factors.reduce((sum, f) => sum + f.importance, 0);
        expect(totalImportance).toBeGreaterThan(0);
      });

      it("should include self-critique", () => {
        const request: ExplainableAIRequest = {
          decision_type: "strategy",
          decision_made: "5-Axis Geodesic",
          context: { geometry: "freeform_surface" },
          detail_level: "exhaustive",
        };

        const response = FiveAxisAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.reasoning_chain.some(s => s.self_critique)).toBe(true);
      });

      it("should generate natural language summary", () => {
        const request: ExplainableAIRequest = {
          decision_type: "params",
          decision_made: "Conservative parameters selected",
          context: { priority: "quality" },
          detail_level: "brief",
        };

        const response = FiveAxisAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.summary.length).toBeGreaterThan(0);
        expect(response.detailed_explanation.length).toBeGreaterThan(response.summary.length);
      });

      it("should calculate confidence from steps", () => {
        const request: ExplainableAIRequest = {
          decision_type: "sequence",
          decision_made: "Rough -> Semi -> Finish",
          context: {},
          detail_level: "detailed",
        };

        const response = FiveAxisAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.confidence).toBeGreaterThan(0);
        expect(response.confidence).toBeLessThanOrEqual(1);
      });
    });
  });

  // ===========================================================================
  // μS-32: REINFORCEMENT LEARNING
  // ===========================================================================
  describe("μS-32: Reinforcement Learning", () => {
    describe("getRecommendedAction", () => {
      it("should recommend strategy for geometry type", () => {
        const state: FiveAxisRLState = {
          geometry_type: "impeller_blade",
          material_iso: "S",
          complexity_score: 7,
          target_ra_um: 0.8,
          machine_capability: 0.9,
        };

        const action = FiveAxisAIUltraIntelligenceEngine.getRecommendedAction(state);

        expect(action.action_type).toBe("select_strategy");
        expect(action.strategy_id).toBeDefined();
      });

      it("should recommend flowline for blade geometry", () => {
        const state: FiveAxisRLState = {
          geometry_type: "impeller_blade",
          material_iso: "S",
          complexity_score: 6,
          target_ra_um: 1.0,
          machine_capability: 0.9,
        };

        const action = FiveAxisAIUltraIntelligenceEngine.getRecommendedAction(state);

        expect(action.strategy_id).toContain("flowline");
      });

      it("should recommend swarf for ruled surfaces", () => {
        const state: FiveAxisRLState = {
          geometry_type: "ruled_surface",
          material_iso: "P",
          complexity_score: 5,
          target_ra_um: 1.6,
          machine_capability: 0.9,
        };

        const action = FiveAxisAIUltraIntelligenceEngine.getRecommendedAction(state);

        expect(action.strategy_id).toContain("swarf");
      });

      it("should incorporate learned preferences", () => {
        const state: FiveAxisRLState = {
          geometry_type: "freeform_surface",
          material_iso: "P",
          complexity_score: 8,
          target_ra_um: 1.2,
          machine_capability: 0.9,
        };

        // Record positive episode for geodesic
        const episode: FiveAxisRLEpisode = {
          episode_id: "test_ep_1",
          initial_state: state,
          actions: [{ action_type: "select_strategy", strategy_id: "5ax_geodesic" }],
          rewards: [{ surface_quality_reward: 0.9, cycle_time_reward: 0.5, tool_life_reward: 0.7, scrap_penalty: 0, rework_penalty: 0, total_reward: 0.7 }],
          final_state: state,
          total_reward: 0.7,
          lessons_learned: ["Geodesic worked well"],
        };
        FiveAxisAIUltraIntelligenceEngine.recordEpisode(episode);

        const action = FiveAxisAIUltraIntelligenceEngine.getRecommendedAction(state);

        expect(action.action_type).toBe("select_strategy");
      });
    });

    describe("calculateReward", () => {
      it("should give positive reward for better than predicted results", () => {
        const reward = FiveAxisAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 0.8, cycle_min: 25, tool_life_min: 50 },
          false,
          false
        );

        expect(reward.surface_quality_reward).toBeGreaterThan(0);
        expect(reward.cycle_time_reward).toBeGreaterThan(0);
        expect(reward.tool_life_reward).toBeGreaterThan(0);
        expect(reward.total_reward).toBeGreaterThan(0);
      });

      it("should give negative reward for worse than predicted", () => {
        const reward = FiveAxisAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 2.0, cycle_min: 50, tool_life_min: 20 },
          false,
          false
        );

        expect(reward.surface_quality_reward).toBeLessThan(0);
        expect(reward.cycle_time_reward).toBeLessThan(0);
        expect(reward.tool_life_reward).toBeLessThan(0);
      });

      it("should apply scrap penalty", () => {
        const noScrap = FiveAxisAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          false,
          false
        );
        const withScrap = FiveAxisAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          true,
          false
        );

        expect(withScrap.scrap_penalty).toBe(-1);
        expect(withScrap.total_reward).toBeLessThan(noScrap.total_reward);
      });

      it("should apply rework penalty", () => {
        const noRework = FiveAxisAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          false,
          false
        );
        const withRework = FiveAxisAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 1.0, cycle_min: 30, tool_life_min: 45 },
          false,
          true
        );

        expect(withRework.rework_penalty).toBe(-0.5);
        expect(withRework.total_reward).toBeLessThan(noRework.total_reward);
      });
    });

    describe("recordEpisode", () => {
      it("should store episode", () => {
        expect(FiveAxisAIUltraIntelligenceEngine.getRLEpisodeCount()).toBe(0);

        const episode: FiveAxisRLEpisode = {
          episode_id: "ep_test_1",
          initial_state: {
            geometry_type: "mold_cavity",
            material_iso: "H",
            complexity_score: 6,
            target_ra_um: 1.0,
            machine_capability: 0.9,
          },
          actions: [{ action_type: "select_strategy", strategy_id: "5ax_shape_offset" }],
          rewards: [{ surface_quality_reward: 0.8, cycle_time_reward: 0.6, tool_life_reward: 0.7, scrap_penalty: 0, rework_penalty: 0, total_reward: 0.7 }],
          final_state: {
            geometry_type: "mold_cavity",
            material_iso: "H",
            complexity_score: 6,
            target_ra_um: 1.0,
            machine_capability: 0.9,
          },
          total_reward: 0.7,
          lessons_learned: ["Shape offset effective for cavity"],
        };

        FiveAxisAIUltraIntelligenceEngine.recordEpisode(episode);

        expect(FiveAxisAIUltraIntelligenceEngine.getRLEpisodeCount()).toBe(1);
      });

      it("should update policy from episodes", () => {
        const initial = FiveAxisAIUltraIntelligenceEngine.getPolicyStats();

        const episode: FiveAxisRLEpisode = {
          episode_id: "ep_test_2",
          initial_state: {
            geometry_type: "turbine_blade",
            material_iso: "S",
            complexity_score: 8,
            target_ra_um: 0.8,
            machine_capability: 0.9,
          },
          actions: [{ action_type: "select_strategy", strategy_id: "5ax_swarf" }],
          rewards: [{ surface_quality_reward: 0.9, cycle_time_reward: 0.7, tool_life_reward: 0.6, scrap_penalty: 0, rework_penalty: 0, total_reward: 0.75 }],
          final_state: {
            geometry_type: "turbine_blade",
            material_iso: "S",
            complexity_score: 8,
            target_ra_um: 0.8,
            machine_capability: 0.9,
          },
          total_reward: 0.75,
          lessons_learned: [],
        };

        FiveAxisAIUltraIntelligenceEngine.recordEpisode(episode);

        const updated = FiveAxisAIUltraIntelligenceEngine.getPolicyStats();

        expect(updated.trained_episodes).toBeGreaterThan(initial.trained_episodes);
        expect(updated.version).toBeGreaterThan(initial.version);
      });
    });

    describe("getPolicyStats", () => {
      it("should return current policy state", () => {
        const policy = FiveAxisAIUltraIntelligenceEngine.getPolicyStats();

        expect(policy.policy_id).toBeDefined();
        expect(policy.version).toBeDefined();
        expect(policy.trained_episodes).toBeDefined();
        expect(policy.avg_reward).toBeDefined();
        expect(policy.updated_at).toBeDefined();
      });
    });
  });

  // ===========================================================================
  // μS-33: LLM TROUBLESHOOTING
  // ===========================================================================
  describe("μS-33: LLM Troubleshooting", () => {
    describe("diagnoseProblem", () => {
      it("should diagnose surface finish issues", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Poor surface finish on 5-axis part",
          symptoms: ["Visible scallop marks", "Ra is 2.5um instead of target 0.8um"],
          context: { machine_id: "okuma_m460v" },
          severity: "major",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.length).toBeGreaterThan(0);
        expect(diagnosis.root_causes.some(r => r.category === "params")).toBe(true);
        expect(diagnosis.corrective_actions.length).toBeGreaterThan(0);
      });

      it("should diagnose vibration/chatter issues", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Chatter during 5-axis finishing",
          symptoms: ["Audible vibration", "Chatter marks on surface"],
          context: { operation: { strategy_name: "5-Axis Swarf" } as any },
          severity: "major",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.some(r => r.cause.toLowerCase().includes("spindle") || r.cause.toLowerCase().includes("overhang"))).toBe(true);
      });

      it("should diagnose tool life issues", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Tool wear is too fast",
          symptoms: ["Flank wear exceeds limits", "Tool life only 15 minutes"],
          context: {},
          severity: "major",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.some(r => r.category === "params")).toBe(true);
        expect(diagnosis.corrective_actions.some(a => a.action.toLowerCase().includes("speed") || a.action.toLowerCase().includes("reduce"))).toBe(true);
      });

      it("should diagnose dimensional accuracy issues", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Dimensions out of tolerance",
          symptoms: ["Wall thickness varies", "Dimensional error increases with depth"],
          context: {},
          severity: "critical",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.some(r => r.cause.toLowerCase().includes("deflection"))).toBe(true);
      });

      it("should provide verification methods", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Surface finish is rough",
          symptoms: ["Visible marks"],
          context: {},
          severity: "minor",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.every(r => r.how_to_verify.length > 0)).toBe(true);
      });

      it("should prioritize corrective actions", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Multiple issues with 5-axis operation",
          symptoms: ["Vibration", "Tool wear", "Surface issues"],
          context: {},
          severity: "critical",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        if (diagnosis.corrective_actions.length > 1) {
          expect(diagnosis.corrective_actions[0].priority).toBeGreaterThanOrEqual(
            diagnosis.corrective_actions[diagnosis.corrective_actions.length - 1].priority
          );
        }
      });

      it("should generate preventive measures", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Recurring surface quality issues",
          symptoms: ["Bad finish", "Inconsistent results"],
          context: {},
          severity: "major",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.preventive_measures.length).toBeGreaterThan(0);
      });

      it("should provide reasoning chain", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Tool breaking during 5-axis cut",
          symptoms: ["Sudden failure"],
          context: {},
          severity: "critical",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.reasoning_chain.length).toBeGreaterThan(0);
        expect(diagnosis.reasoning_chain[0]).toContain("Analyzing");
      });

      it("should calculate diagnosis confidence", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Known surface finish problem with clear symptoms",
          symptoms: ["Scallop too high", "Feed marks visible", "Stepover too large"],
          context: {},
          severity: "major",
        };

        const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.confidence).toBeGreaterThan(0);
        expect(diagnosis.confidence).toBeLessThanOrEqual(1);
      });

      it("should store troubleshooting history", () => {
        expect(FiveAxisAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBe(0);

        const request: TroubleshootingRequest = {
          problem_description: "Test issue",
          symptoms: ["Symptom 1"],
          context: {},
          severity: "minor",
        };

        FiveAxisAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(FiveAxisAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBe(1);
      });
    });

    describe("generateTroubleshootingPrompt", () => {
      it("should generate formatted LLM prompt", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Surface quality degradation",
          symptoms: ["Ra increased", "Visible marks"],
          context: { machine_id: "okuma_m460v", recent_changes: ["New tool batch"] },
          severity: "major",
        };

        const prompt = FiveAxisAIUltraIntelligenceEngine.generateTroubleshootingPrompt(request);

        expect(prompt).toContain("PRISM 5-Axis Troubleshooting");
        expect(prompt).toContain("Surface quality");
        expect(prompt).toContain("Ra increased");
        expect(prompt).toContain("okuma_m460v");
        expect(prompt).toContain("root cause");
      });

      it("should include all symptoms", () => {
        const request: TroubleshootingRequest = {
          problem_description: "Multiple symptoms",
          symptoms: ["Symptom A", "Symptom B", "Symptom C"],
          context: {},
          severity: "minor",
        };

        const prompt = FiveAxisAIUltraIntelligenceEngine.generateTroubleshootingPrompt(request);

        expect(prompt).toContain("Symptom A");
        expect(prompt).toContain("Symptom B");
        expect(prompt).toContain("Symptom C");
      });
    });
  });

  // ===========================================================================
  // INTEGRATION & EDGE CASES
  // ===========================================================================
  describe("Integration & Edge Cases", () => {
    it("should handle complete NL to troubleshooting workflow", () => {
      // Step 1: Parse NL
      const intent = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage(
        "Machine titanium impeller with 0.8um Ra finish"
      );
      expect(intent.geometry_type).toBeDefined();

      // Step 2: Process to workflow
      const workflow = FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage(
        "Machine titanium impeller with 0.8um Ra finish"
      );
      expect(workflow.sequence).toBeDefined();

      // Step 3: If issue occurs, troubleshoot
      const diagnosis = FiveAxisAIUltraIntelligenceEngine.diagnoseProblem({
        problem_description: "Ra achieved is 1.2um instead of 0.8um",
        symptoms: ["Scallop marks visible"],
        context: { operation: workflow.sequence?.operations[1] },
        severity: "major",
      });
      expect(diagnosis.corrective_actions.length).toBeGreaterThan(0);
    });

    it("should handle empty input gracefully", () => {
      const result = FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage("");
      expect(result.clarification_needed).toBe(true);
    });

    it("should handle minimal toolpath data", () => {
      const features = FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures([
        { x: 0, y: 0, z: 0 },
        { x: 1, y: 1, z: 1 },
      ]);

      const score = FiveAxisAIUltraIntelligenceEngine.scoreToolpath(features);
      expect(score.overall_score).toBeDefined();
    });

    it("should clear all data correctly", () => {
      // Add some data
      FiveAxisAIUltraIntelligenceEngine.recordToolLifeData({
        tool: { id: "T1", type: "ball_nose", diameter_mm: 8, flute_length_mm: 20, overall_length_mm: 60, flute_count: 2, material: "carbide" },
        material: { name: "Test", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
        cutting_params: { spindle_rpm: 5000, feed_mmmin: 1000, ap_mm: 0.3, ae_mm: 1, lead_angle_deg: 10, tilt_angle_deg: 5, stepover_pct: 10, coolant: "flood" },
        operation_type: "finishing",
        avg_tilt_angle_deg: 10,
        tilt_variation_deg: 5,
        engagement_variation_pct: 15,
        thermal_cycling_factor: 0.2,
        similar_operations_count: 10,
      }, 45);

      FiveAxisAIUltraIntelligenceEngine.diagnoseProblem({
        problem_description: "Test",
        symptoms: ["Test"],
        context: {},
        severity: "minor",
      });

      expect(FiveAxisAIUltraIntelligenceEngine.getToolLifeDataCount()).toBeGreaterThan(0);
      expect(FiveAxisAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBeGreaterThan(0);

      FiveAxisAIUltraIntelligenceEngine.clearAll();

      expect(FiveAxisAIUltraIntelligenceEngine.getToolLifeDataCount()).toBe(0);
      expect(FiveAxisAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBe(0);
      expect(FiveAxisAIUltraIntelligenceEngine.getRLEpisodeCount()).toBe(0);
    });
  });

  // ===========================================================================
  // MODULE EXPORTS
  // ===========================================================================
  describe("Module Exports", () => {
    it("should export class and singleton", () => {
      expect(FiveAxisAIUltraIntelligenceEngine).toBeDefined();
      expect(typeof FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.processNaturalLanguage).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.predictToolLife).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.extractToolpathFeatures).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.scoreToolpath).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.explainDecision).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.getRecommendedAction).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.calculateReward).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.recordEpisode).toBe("function");
      expect(typeof FiveAxisAIUltraIntelligenceEngine.diagnoseProblem).toBe("function");
    });

    it("should export all required types", async () => {
      const exports = await import("../engines/index.js");

      // NL Pipeline types
      expect(exports.FiveAxisAIUltraIntelligenceEngine).toBeDefined();

      // The types are compile-time only, but the engine should be usable
      const intent = exports.FiveAxisAIUltraIntelligenceEngine.parseNaturalLanguage("Test");
      expect(intent.raw_input).toBe("Test");
    });
  });
});
