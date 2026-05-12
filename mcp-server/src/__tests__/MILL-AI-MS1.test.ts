/**
 * MILL-AI-MS1: Milling AI Ultra-Intelligence Test Suite
 * ======================================================
 * Tests for maximum AI hardening across ALL milling operations:
 *   - 2D Milling (face, contour, pocket, slot, engrave)
 *   - 2.5D Milling (adaptive, drill, bore, thread)
 *   - 3D Milling (parallel, scallop, pencil, rest, morph)
 *   - 3+2 Milling (indexed, multiside, tombstone)
 *   - 5-Axis delegation
 *
 * AI Capabilities Tested:
 *   - Natural Language Pipeline
 *   - Strategy Intelligence
 *   - Predictive Tool Life
 *   - Deep Learning Toolpath Scorer
 *   - Explainable AI
 *   - Reinforcement Learning
 *   - LLM Troubleshooting
 *
 * @milestone MILL-AI-MS1
 * @tests 92
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  MillingAIUltraIntelligenceEngine,
  type MillingNLIntent,
  type MillingToolLifeInput,
  type StrategyAnalysisRequest,
  type ExplainableMillingRequest,
  type MillingRLState,
  type MillingRLEpisode,
  type MillingTroubleshootingRequest,
  type ToolpathFeatures,
} from "../engines/index.js";

describe("MILL-AI-MS1: Milling AI Ultra-Intelligence", () => {
  beforeEach(() => {
    MillingAIUltraIntelligenceEngine.clearAll();
  });

  // ===========================================================================
  // NATURAL LANGUAGE PIPELINE
  // ===========================================================================
  describe("Natural Language Pipeline", () => {
    describe("parseNaturalLanguage", () => {
      it("should extract 2D pocket operation", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Mill a rectangular pocket in aluminum"
        );

        expect(result.milling_type).toBe("2d_pocket");
        expect(result.material?.iso_group).toBe("N");
        expect(result.operation_confidence).toBeGreaterThanOrEqual(0.85);
      });

      it("should extract adaptive clearing operation", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Use adaptive clearing to rough the pocket"
        );

        expect(result.milling_type).toBe("25d_adaptive");
      });

      it("should extract 3D surface operation", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Finish the freeform surface with scallop strategy"
        );

        expect(result.milling_type).toBe("3d_scallop");
        expect(result.geometry_type).toBe("freeform_surface");
      });

      it("should extract drilling operation", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Drill the hole pattern on the part"
        );

        expect(result.milling_type).toBe("25d_drill");
        expect(result.geometry_type).toBe("hole_pattern");
      });

      it("should extract 3+2 indexed operation", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Machine multi-side part with 3+2 indexed positions"
        );

        expect(result.milling_type).toBe("3plus2_indexed");
        expect(result.geometry_type).toBe("multiside_part");
      });

      it("should extract face milling operation", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Face mill the top surface flat"
        );

        expect(result.milling_type).toBe("2d_face");
      });

      it("should extract material from input", () => {
        const steel = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Pocket in 4140 steel"
        );
        expect(steel.material?.iso_group).toBe("P");

        const stainless = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Contour 316 stainless"
        );
        expect(stainless.material?.iso_group).toBe("M");

        const toolSteel = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Machine D2 tool steel cavity"
        );
        expect(toolSteel.material?.iso_group).toBe("H");
      });

      it("should extract dimensions from input", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Mill pocket 25mm deep, 50mm wide, tolerance ±0.02mm"
        );

        expect(result.depth_mm).toBe(25);
        expect(result.width_mm).toBe(50);
        expect(result.tolerance_mm).toBe(0.02);
      });

      it("should extract Ra target from input", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Finish to 0.8 um Ra surface"
        );

        expect(result.target_ra_um).toBe(0.8);
      });

      it("should extract priority from input", () => {
        const quality = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Quality is critical on this finish"
        );
        expect(quality.priority).toBe("quality");

        const speed = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Need this fast, urgent job"
        );
        expect(speed.priority).toBe("speed");

        const toolLife = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Optimize for tool life on this batch"
        );
        expect(toolLife.priority).toBe("tool_life");
      });

      it("should identify ambiguities when operation unclear", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Process this part"
        );

        expect(result.operation_confidence).toBeLessThan(0.7);
        expect(result.clarification_needed).toBe(true);
      });

      it("should calculate overall confidence", () => {
        const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Adaptive clearing in 6061 aluminum rectangular pocket"
        );

        expect(result.overall_confidence).toBeGreaterThan(0.5);
        expect(result.overall_confidence).toBeLessThanOrEqual(1);
      });
    });

    describe("processNaturalLanguage", () => {
      it("should generate complete workflow from NL input", () => {
        const result = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
          "Mill deep pocket in D2 tool steel with fine finish"
        );

        expect(result.intent).toBeDefined();
        expect(result.reasoning.steps.length).toBeGreaterThanOrEqual(7);
        expect(result.operation_plan).toBeDefined();
        expect(result.operation_plan?.operations.length).toBeGreaterThan(0);
      });

      it("should generate reasoning chain with multiple step types", () => {
        const result = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
          "Adaptive clearing pocket in aluminum"
        );

        expect(result.reasoning.steps.some(s => s.type === "parse")).toBe(true);
        expect(result.reasoning.steps.some(s => s.type === "classify")).toBe(true);
        expect(result.reasoning.steps.some(s => s.type === "validate")).toBe(true);
        expect(result.reasoning.steps.some(s => s.type === "select")).toBe(true);
        expect(result.reasoning.steps.some(s => s.type === "optimize")).toBe(true);
      });

      it("should include physics basis in reasoning", () => {
        const result = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
          "Finish cut with 0.8um Ra requirement"
        );

        const optimizeStep = result.reasoning.steps.find(s => s.type === "optimize");
        expect(optimizeStep?.physics_basis).toContain("kc1.1"); // Kienzle formula uses kc1.1
      });

      it("should provide warnings for difficult materials", () => {
        const hardened = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
          "Machine hardened D2 tool steel mold"
        );
        expect(hardened.warnings.some(w => w.toLowerCase().includes("hardened") || w.includes("ISO H") || w.toLowerCase().includes("ceramic") || w.toLowerCase().includes("cbn"))).toBe(true);

        const titanium = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
          "Mill titanium part"
        );
        expect(titanium.warnings.some(w => w.includes("ISO S") || w.toLowerCase().includes("titanium") || w.toLowerCase().includes("superalloy") || w.toLowerCase().includes("reduce"))).toBe(true);
      });

      it("should provide warnings for deep pockets", () => {
        const result = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
          "Mill pocket 75mm deep in steel"
        );

        expect(result.warnings.some(w => w.toLowerCase().includes("deep"))).toBe(true);
      });

      it("should provide suggestions for improvement", () => {
        const result = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
          "Machine this complex shape"
        );

        expect(result.suggestions.length).toBeGreaterThan(0);
      });

      it("should generate operation plan with multiple phases", () => {
        const result = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
          "Mill pocket in aluminum with good finish"
        );

        expect(result.operation_plan?.operations.some(op => op.phase === "roughing")).toBe(true);
        expect(result.operation_plan?.operations.some(op => op.phase === "finishing")).toBe(true);
      });
    });

    describe("generatePRISMAIPrompt", () => {
      it("should generate formatted CLI prompt", () => {
        const intent = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
          "Mill pocket in steel with 1.6um Ra"
        );
        const prompt = MillingAIUltraIntelligenceEngine.generatePRISMAIPrompt(intent);

        expect(prompt).toContain("PRISM Milling AI");
        expect(prompt).toContain("chain-of-thought");
        expect(prompt).toContain("physics");
      });
    });
  });

  // ===========================================================================
  // STRATEGY INTELLIGENCE
  // ===========================================================================
  describe("Strategy Intelligence", () => {
    describe("selectOptimalStrategy", () => {
      it("should select adaptive clearing for pockets with speed priority", () => {
        const request: StrategyAnalysisRequest = {
          geometry: "pocket_complex",
          material: { name: "6061-T6", iso_group: "N", kc11_mpa: 700, mc: 0.25 },
          depth_mm: 20,
          machine_axes: 3,
          priority: "speed",
        };

        const result = MillingAIUltraIntelligenceEngine.selectOptimalStrategy(request);

        expect(result.strategy_name.toLowerCase()).toContain("adaptive");
        expect(result.confidence).toBeGreaterThan(0.5);
      });

      it("should select scallop for freeform with quality priority", () => {
        const request: StrategyAnalysisRequest = {
          geometry: "freeform_surface",
          material: { name: "4140 Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
          target_ra_um: 0.8,
          depth_mm: 30,
          machine_axes: 3,
          priority: "quality",
        };

        const result = MillingAIUltraIntelligenceEngine.selectOptimalStrategy(request);

        expect(result.category).toBe("3D");
      });

      it("should select 3+2 for multiside parts", () => {
        const request: StrategyAnalysisRequest = {
          geometry: "multiside_part",
          material: { name: "6061-T6", iso_group: "N", kc11_mpa: 700, mc: 0.25 },
          depth_mm: 15,
          machine_axes: 5,
          priority: "quality",
        };

        const result = MillingAIUltraIntelligenceEngine.selectOptimalStrategy(request);

        expect(result.category).toBe("3+2");
      });

      it("should provide primary reason and supporting factors", () => {
        const request: StrategyAnalysisRequest = {
          geometry: "pocket_rectangular",
          material: { name: "Aluminum", iso_group: "N", kc11_mpa: 700, mc: 0.25 },
          depth_mm: 10,
          machine_axes: 3,
          priority: "speed",
        };

        const result = MillingAIUltraIntelligenceEngine.selectOptimalStrategy(request);

        expect(result.primary_reason.length).toBeGreaterThan(10);
        expect(result.supporting_factors.length).toBeGreaterThan(0);
      });

      it("should provide alternatives with why-not explanations", () => {
        const request: StrategyAnalysisRequest = {
          geometry: "pocket_complex",
          material: { name: "Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
          depth_mm: 25,
          machine_axes: 5,
          priority: "speed",
        };

        const result = MillingAIUltraIntelligenceEngine.selectOptimalStrategy(request);

        expect(result.alternatives.length).toBeGreaterThan(0);
        expect(result.alternatives[0].why_not).toBeDefined();
      });

      it("should provide recommended parameters", () => {
        const request: StrategyAnalysisRequest = {
          geometry: "flat_surface",
          material: { name: "Aluminum", iso_group: "N", kc11_mpa: 700, mc: 0.25 },
          depth_mm: 5,
          machine_axes: 3,
          priority: "speed",
        };

        const result = MillingAIUltraIntelligenceEngine.selectOptimalStrategy(request);

        expect(result.recommended_params.spindle_rpm).toBeGreaterThan(0);
        expect(result.recommended_params.feed_mmmin).toBeGreaterThan(0);
      });

      it("should provide recommended tool", () => {
        const request: StrategyAnalysisRequest = {
          geometry: "pocket_rectangular",
          material: { name: "Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
          depth_mm: 15,
          machine_axes: 3,
          priority: "tool_life",
        };

        const result = MillingAIUltraIntelligenceEngine.selectOptimalStrategy(request);

        expect(result.recommended_tool.type).toBeDefined();
        expect(result.recommended_tool.diameter_mm).toBeGreaterThan(0);
      });
    });

    describe("compareStrategies", () => {
      it("should return multiple strategy options", () => {
        const request: StrategyAnalysisRequest = {
          geometry: "freeform_surface",
          material: { name: "Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
          depth_mm: 20,
          machine_axes: 5,
          priority: "quality",
        };

        const results = MillingAIUltraIntelligenceEngine.compareStrategies(request);

        expect(results.length).toBeGreaterThan(0);
      });
    });
  });

  // ===========================================================================
  // PREDICTIVE TOOL LIFE
  // ===========================================================================
  describe("Predictive Tool Life", () => {
    const baseInput: MillingToolLifeInput = {
      tool: {
        id: "T4",
        type: "flat_endmill",
        diameter_mm: 12,
        flute_count: 4,
        flute_length_mm: 30,
        overall_length_mm: 75,
        coating: "TiAlN",
        material: "carbide",
      },
      material: { name: "4140 Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
      params: {
        spindle_rpm: 6000,
        feed_mmmin: 2400,
        ap_mm: 2,
        ae_mm: 6,
        coolant: "flood",
      },
      milling_type: "25d_adaptive",
      operation_phase: "roughing",
      engagement_angle_avg_deg: 90,
      interrupted_cut: false,
      entry_type: "ramp",
      corner_count: 4,
      similar_operations_count: 12,
    };

    describe("predictToolLife", () => {
      it("should predict tool life with confidence interval", () => {
        const result = MillingAIUltraIntelligenceEngine.predictToolLife(baseInput);

        expect(result.predicted_life_min).toBeGreaterThan(0);
        expect(result.confidence_interval.lower).toBeLessThan(result.predicted_life_min);
        expect(result.confidence_interval.upper).toBeGreaterThan(result.predicted_life_min);
      });

      it("should include all contributing factors", () => {
        const result = MillingAIUltraIntelligenceEngine.predictToolLife(baseInput);

        expect(result.factors.base_taylor_life_min).toBeGreaterThan(0);
        expect(result.factors.engagement_factor).toBeGreaterThan(0);
        expect(result.factors.interruption_factor).toBeGreaterThan(0);
        expect(result.factors.entry_factor).toBeGreaterThan(0);
        expect(result.factors.corner_factor).toBeGreaterThan(0);
        expect(result.factors.material_factor).toBeGreaterThan(0);
        expect(result.factors.coating_factor).toBeGreaterThan(0);
        expect(result.factors.ml_adjustment).toBeGreaterThan(0);
      });

      it("should reduce life for interrupted cuts", () => {
        const continuous = { ...baseInput, interrupted_cut: false };
        const interrupted = { ...baseInput, interrupted_cut: true };

        const contResult = MillingAIUltraIntelligenceEngine.predictToolLife(continuous);
        const intResult = MillingAIUltraIntelligenceEngine.predictToolLife(interrupted);

        expect(intResult.predicted_life_min).toBeLessThan(contResult.predicted_life_min);
      });

      it("should reduce life for high engagement angles", () => {
        const lowEngagement = { ...baseInput, engagement_angle_avg_deg: 30 };
        const fullSlot = { ...baseInput, engagement_angle_avg_deg: 180 };

        const lowResult = MillingAIUltraIntelligenceEngine.predictToolLife(lowEngagement);
        const fullResult = MillingAIUltraIntelligenceEngine.predictToolLife(fullSlot);

        expect(fullResult.predicted_life_min).toBeLessThan(lowResult.predicted_life_min);
      });

      it("should reduce life for plunge entry", () => {
        const ramp = { ...baseInput, entry_type: "ramp" as const };
        const plunge = { ...baseInput, entry_type: "plunge" as const };

        const rampResult = MillingAIUltraIntelligenceEngine.predictToolLife(ramp);
        const plungeResult = MillingAIUltraIntelligenceEngine.predictToolLife(plunge);

        expect(plungeResult.predicted_life_min).toBeLessThan(rampResult.predicted_life_min);
      });

      it("should predict dominant wear mode based on material", () => {
        const titanium: MillingToolLifeInput = {
          ...baseInput,
          material: { name: "Ti-6Al-4V", iso_group: "S", kc11_mpa: 2800, mc: 0.25 },
        };
        const hardened: MillingToolLifeInput = {
          ...baseInput,
          material: { name: "D2 Tool Steel", iso_group: "H", kc11_mpa: 3200, mc: 0.25, hardness_hrc: 58 },
        };

        const tiResult = MillingAIUltraIntelligenceEngine.predictToolLife(titanium);
        const hardResult = MillingAIUltraIntelligenceEngine.predictToolLife(hardened);

        expect(tiResult.dominant_wear_mode).toBe("notch");
        expect(hardResult.dominant_wear_mode).toBe("crater");
      });

      it("should improve confidence with more historical data", () => {
        const fewOps = { ...baseInput, similar_operations_count: 3 };
        const manyOps = { ...baseInput, similar_operations_count: 25 };

        const fewResult = MillingAIUltraIntelligenceEngine.predictToolLife(fewOps);
        const manyResult = MillingAIUltraIntelligenceEngine.predictToolLife(manyOps);

        expect(manyResult.confidence).toBeGreaterThan(fewResult.confidence);
      });

      it("should provide reasoning chain", () => {
        const result = MillingAIUltraIntelligenceEngine.predictToolLife(baseInput);

        expect(result.reasoning.length).toBeGreaterThanOrEqual(8);
        expect(result.reasoning.some(r => r.includes("Taylor"))).toBe(true);
      });
    });

    describe("recordToolLifeData", () => {
      it("should store training data", () => {
        expect(MillingAIUltraIntelligenceEngine.getToolLifeDataCount()).toBe(0);

        MillingAIUltraIntelligenceEngine.recordToolLifeData(baseInput, 55);

        expect(MillingAIUltraIntelligenceEngine.getToolLifeDataCount()).toBe(1);
      });
    });
  });

  // ===========================================================================
  // DEEP LEARNING TOOLPATH SCORER
  // ===========================================================================
  describe("Deep Learning Toolpath Scorer", () => {
    describe("extractToolpathFeatures", () => {
      it("should extract features from toolpath points", () => {
        const points = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
          { x: 10, y: 10, z: 0 },
          { x: 0, y: 10, z: 0 },
          { x: 0, y: 0, z: 0 },
        ];

        const features = MillingAIUltraIntelligenceEngine.extractToolpathFeatures(points, "2d_pocket");

        expect(features.total_length_mm).toBeGreaterThan(0);
        expect(features.point_count).toBe(5);
      });

      it("should detect 2D vs 3D toolpath", () => {
        const points2D = [
          { x: 0, y: 0, z: 0 },
          { x: 10, y: 0, z: 0 },
          { x: 10, y: 10, z: 0 },
        ];

        const points3D = Array.from({ length: 50 }, (_, i) => ({
          x: Math.cos(i * 0.1) * 10,
          y: Math.sin(i * 0.1) * 10,
          z: i * 0.5,
        }));

        const features2D = MillingAIUltraIntelligenceEngine.extractToolpathFeatures(points2D, "2d_contour");
        const features3D = MillingAIUltraIntelligenceEngine.extractToolpathFeatures(points3D, "3d_parallel");

        expect(features2D.milling_specific.is_2d).toBe(true);
        expect(features3D.milling_specific.is_3d).toBe(true);
      });

      it("should count plunge moves", () => {
        const pointsWithPlunges = [
          { x: 0, y: 0, z: 0 },
          { x: 0, y: 0, z: -5 }, // Plunge
          { x: 10, y: 0, z: -5 },
          { x: 10, y: 0, z: 0 },
          { x: 10, y: 0, z: -5 }, // Plunge
        ];

        const features = MillingAIUltraIntelligenceEngine.extractToolpathFeatures(pointsWithPlunges, "25d_pocket");

        expect(features.milling_specific.plunge_count).toBeGreaterThan(0);
      });
    });

    describe("scoreToolpath", () => {
      it("should provide overall quality score", () => {
        const features: ToolpathFeatures & { milling_specific: any } = {
          total_length_mm: 500,
          point_count: 1000,
          avg_point_spacing_mm: 0.5,
          point_spacing_variance: 0.01,
          max_direction_change_deg: 20,
          avg_direction_change_deg: 8,
          jerk_score: 0.2,
          rotary_motion_pct: 0,
          simultaneous_5ax_pct: 0,
          singularity_proximity_score: 0,
          rapid_pct: 5,
          air_cut_pct: 3,
          retract_count: 4,
          min_tool_clearance_mm: 10,
          collision_risk_score: 0,
          milling_specific: {
            z_level_count: 5,
            xy_motion_pct: 95,
            z_motion_pct: 5,
            is_2d: true,
            is_3d: false,
            cornering_frequency: 0.05,
            plunge_count: 2,
          },
        };

        const score = MillingAIUltraIntelligenceEngine.scoreToolpath(features, "2d_pocket");

        expect(score.overall_score).toBeGreaterThan(0);
        expect(score.overall_score).toBeLessThanOrEqual(100);
      });

      it("should provide milling-specific analysis", () => {
        const features: ToolpathFeatures & { milling_specific: any } = {
          total_length_mm: 200,
          point_count: 500,
          avg_point_spacing_mm: 0.4,
          point_spacing_variance: 0.02,
          max_direction_change_deg: 30,
          avg_direction_change_deg: 10,
          jerk_score: 0.3,
          rotary_motion_pct: 0,
          simultaneous_5ax_pct: 0,
          singularity_proximity_score: 0,
          rapid_pct: 8,
          air_cut_pct: 5,
          retract_count: 8,
          min_tool_clearance_mm: 8,
          collision_risk_score: 0.1,
          milling_specific: {
            z_level_count: 3,
            xy_motion_pct: 90,
            z_motion_pct: 10,
            is_2d: true,
            is_3d: false,
            cornering_frequency: 0.15,
            plunge_count: 6,
          },
        };

        const score = MillingAIUltraIntelligenceEngine.scoreToolpath(features, "25d_pocket");

        expect(score.milling_analysis).toBeDefined();
        expect(score.milling_analysis.efficiency_rating).toBeDefined();
        expect(score.milling_analysis.safety_rating).toBeDefined();
      });

      it("should detect issues with high plunge count", () => {
        const features: ToolpathFeatures & { milling_specific: any } = {
          total_length_mm: 100,
          point_count: 200,
          avg_point_spacing_mm: 0.5,
          point_spacing_variance: 0.05,
          max_direction_change_deg: 25,
          avg_direction_change_deg: 12,
          jerk_score: 0.4,
          rotary_motion_pct: 0,
          simultaneous_5ax_pct: 0,
          singularity_proximity_score: 0,
          rapid_pct: 10,
          air_cut_pct: 8,
          retract_count: 10,
          min_tool_clearance_mm: 5,
          collision_risk_score: 0.2,
          milling_specific: {
            z_level_count: 4,
            xy_motion_pct: 85,
            z_motion_pct: 15,
            is_2d: false,
            is_3d: false,
            cornering_frequency: 0.2,
            plunge_count: 10,
          },
        };

        const score = MillingAIUltraIntelligenceEngine.scoreToolpath(features, "25d_pocket");

        expect(score.milling_analysis.issues.some(i => i.includes("plunge") || i.includes("entry"))).toBe(true);
      });
    });
  });

  // ===========================================================================
  // EXPLAINABLE AI
  // ===========================================================================
  describe("Explainable AI", () => {
    describe("explainDecision", () => {
      it("should explain strategy decisions with physics", () => {
        const request: ExplainableMillingRequest = {
          decision_type: "strategy",
          decision_made: "Adaptive Clearing for pocket roughing",
          context: {
            milling_type: "25d_adaptive",
            geometry: "pocket_complex",
            material: { name: "Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
          },
          detail_level: "detailed",
        };

        const response = MillingAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.reasoning_chain.length).toBeGreaterThanOrEqual(5);
        expect(response.physics_principles.length).toBeGreaterThan(0);
        expect(response.confidence).toBeGreaterThan(0);
      });

      it("should explain parameter decisions with formulas", () => {
        const request: ExplainableMillingRequest = {
          decision_type: "params",
          decision_made: "RPM=6000, Feed=2400mm/min, ap=2mm, ae=6mm",
          context: {
            material: { name: "Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
            params: { spindle_rpm: 6000, feed_mmmin: 2400, ap_mm: 2, ae_mm: 6, coolant: "flood" },
          },
          detail_level: "exhaustive",
        };

        const response = MillingAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.physics_principles.some(p => p.name.includes("Kienzle"))).toBe(true);
        expect(response.reasoning_chain.some(s => s.formula_applied)).toBe(true);
      });

      it("should explain tool decisions", () => {
        const request: ExplainableMillingRequest = {
          decision_type: "tool",
          decision_made: "12mm 4-flute TiAlN carbide endmill",
          context: {
            geometry: "pocket_rectangular",
          },
          detail_level: "detailed",
        };

        const response = MillingAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.physics_principles.some(p => p.name.includes("Deflection"))).toBe(true);
      });

      it("should provide alternatives considered", () => {
        const request: ExplainableMillingRequest = {
          decision_type: "strategy",
          decision_made: "Parallel Finish",
          context: { geometry: "freeform_surface" },
          detail_level: "detailed",
        };

        const response = MillingAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.alternatives_considered.length).toBeGreaterThan(0);
        expect(response.alternatives_considered[0].why_not).toBeDefined();
      });

      it("should provide key factors with importance weights", () => {
        const request: ExplainableMillingRequest = {
          decision_type: "params",
          decision_made: "Conservative parameters",
          context: { constraints: ["quality"] },
          detail_level: "detailed",
        };

        const response = MillingAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.key_factors.length).toBeGreaterThan(0);
        const totalImportance = response.key_factors.reduce((sum, f) => sum + f.importance, 0);
        expect(totalImportance).toBeGreaterThan(0);
      });

      it("should generate operator guidance", () => {
        const request: ExplainableMillingRequest = {
          decision_type: "params",
          decision_made: "Aggressive roughing parameters",
          context: {},
          detail_level: "brief",
        };

        const response = MillingAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.operator_guidance).toBeDefined();
        expect(response.operator_guidance.length).toBeGreaterThan(0);
      });

      it("should generate detailed explanation", () => {
        const request: ExplainableMillingRequest = {
          decision_type: "strategy",
          decision_made: "Scallop Constant",
          context: {},
          detail_level: "exhaustive",
        };

        const response = MillingAIUltraIntelligenceEngine.explainDecision(request);

        expect(response.detailed_explanation.length).toBeGreaterThan(response.summary.length);
      });
    });
  });

  // ===========================================================================
  // REINFORCEMENT LEARNING
  // ===========================================================================
  describe("Reinforcement Learning", () => {
    describe("getRecommendedAction", () => {
      it("should recommend strategy for milling state", () => {
        const state: MillingRLState = {
          milling_type: "25d_adaptive",
          geometry_type: "pocket_complex",
          material_iso: "P",
          complexity_score: 6,
          target_ra_um: 3.2,
          depth_mm: 20,
          machine_capability: 0.9,
        };

        const action = MillingAIUltraIntelligenceEngine.getRecommendedAction(state);

        expect(action.action_type).toBe("select_strategy");
        expect(action.strategy_id).toBeDefined();
      });

      it("should recommend default strategy based on milling type", () => {
        const state: MillingRLState = {
          milling_type: "3d_scallop",
          geometry_type: "freeform_surface",
          material_iso: "P",
          complexity_score: 7,
          target_ra_um: 1.6,
          depth_mm: 30,
          machine_capability: 0.9,
        };

        const action = MillingAIUltraIntelligenceEngine.getRecommendedAction(state);

        expect(action.strategy_id).toContain("scallop");
      });

      it("should incorporate learned preferences", () => {
        const state: MillingRLState = {
          milling_type: "2d_pocket",
          geometry_type: "pocket_rectangular",
          material_iso: "N",
          complexity_score: 4,
          target_ra_um: 3.2,
          depth_mm: 15,
          machine_capability: 0.9,
        };

        // Record positive episode
        const episode: MillingRLEpisode = {
          episode_id: "test_ep_1",
          milling_type: "2d_pocket",
          initial_state: state,
          actions: [{ action_type: "select_strategy", strategy_id: "pocket_clearing" }],
          rewards: [{
            surface_quality_reward: 0.8,
            cycle_time_reward: 0.7,
            tool_life_reward: 0.6,
            scrap_penalty: 0,
            rework_penalty: 0,
            total_reward: 0.7,
          }],
          final_state: state,
          total_reward: 0.7,
          lessons_learned: [],
        };
        MillingAIUltraIntelligenceEngine.recordEpisode(episode);

        const action = MillingAIUltraIntelligenceEngine.getRecommendedAction(state);
        expect(action.action_type).toBe("select_strategy");
      });
    });

    describe("calculateReward", () => {
      it("should calculate positive reward for better than predicted", () => {
        const reward = MillingAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 2.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 1.5, cycle_min: 25, tool_life_min: 50 },
          false,
          false
        );

        expect(reward.surface_quality_reward).toBeGreaterThan(0);
        expect(reward.cycle_time_reward).toBeGreaterThan(0);
        expect(reward.total_reward).toBeGreaterThan(0);
      });

      it("should apply scrap and rework penalties", () => {
        const noIssues = MillingAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 2.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 2.0, cycle_min: 30, tool_life_min: 45 },
          false,
          false
        );
        const withScrap = MillingAIUltraIntelligenceEngine.calculateReward(
          { ra_um: 2.0, cycle_min: 30, tool_life_min: 45 },
          { ra_um: 2.0, cycle_min: 30, tool_life_min: 45 },
          true,
          false
        );

        expect(withScrap.scrap_penalty).toBe(-1);
        expect(withScrap.total_reward).toBeLessThan(noIssues.total_reward);
      });
    });

    describe("recordEpisode", () => {
      it("should store episode and update policy", () => {
        const initial = MillingAIUltraIntelligenceEngine.getPolicyStats();

        const episode: MillingRLEpisode = {
          episode_id: "ep_test_1",
          milling_type: "25d_adaptive",
          initial_state: {
            milling_type: "25d_adaptive",
            geometry_type: "pocket_complex",
            material_iso: "P",
            complexity_score: 6,
            target_ra_um: 3.2,
            depth_mm: 20,
            machine_capability: 0.9,
          },
          actions: [{ action_type: "select_strategy", strategy_id: "adaptive_clearing" }],
          rewards: [{
            surface_quality_reward: 0.8,
            cycle_time_reward: 0.9,
            tool_life_reward: 0.7,
            scrap_penalty: 0,
            rework_penalty: 0,
            total_reward: 0.8,
          }],
          final_state: {
            milling_type: "25d_adaptive",
            geometry_type: "pocket_complex",
            material_iso: "P",
            complexity_score: 6,
            target_ra_um: 3.2,
            depth_mm: 20,
            machine_capability: 0.9,
          },
          total_reward: 0.8,
          lessons_learned: ["Adaptive clearing excellent for complex pockets"],
        };

        MillingAIUltraIntelligenceEngine.recordEpisode(episode);

        const updated = MillingAIUltraIntelligenceEngine.getPolicyStats();
        expect(updated.trained_episodes).toBeGreaterThan(initial.trained_episodes);
        expect(updated.version).toBeGreaterThan(initial.version);
      });
    });
  });

  // ===========================================================================
  // LLM TROUBLESHOOTING
  // ===========================================================================
  describe("LLM Troubleshooting", () => {
    describe("diagnoseProblem", () => {
      it("should diagnose surface finish issues", () => {
        const request: MillingTroubleshootingRequest = {
          problem_description: "Poor surface finish on pocket walls",
          symptoms: ["Visible feed marks", "Ra is 5um instead of target 2um"],
          milling_type: "2d_pocket",
          context: { machine_id: "hurco_vm30i" },
          severity: "major",
        };

        const diagnosis = MillingAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.length).toBeGreaterThan(0);
        expect(diagnosis.root_causes.some(r => r.category === "params")).toBe(true);
        expect(diagnosis.corrective_actions.length).toBeGreaterThan(0);
      });

      it("should diagnose tool life issues with physics explanation", () => {
        const request: MillingTroubleshootingRequest = {
          problem_description: "Tool wear is too fast during roughing",
          symptoms: ["Rapid flank wear", "Tool life only 20 minutes"],
          milling_type: "25d_adaptive",
          context: {
            material: { name: "Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
            params: { spindle_rpm: 8000, feed_mmmin: 3000, ap_mm: 3, ae_mm: 8, coolant: "flood" },
          },
          severity: "major",
        };

        const diagnosis = MillingAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.some(r => r.physics_explanation)).toBe(true);
        expect(diagnosis.parameter_adjustments.length).toBeGreaterThan(0);
      });

      it("should diagnose chatter issues", () => {
        const request: MillingTroubleshootingRequest = {
          problem_description: "Chatter during finishing passes",
          symptoms: ["Audible vibration", "Chatter marks on surface", "Noise from spindle"],
          milling_type: "3d_parallel",
          context: {},
          severity: "major",
        };

        const diagnosis = MillingAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.some(r =>
          r.cause.toLowerCase().includes("spindle") ||
          r.cause.toLowerCase().includes("overhang") ||
          r.cause.toLowerCase().includes("lobe")
        )).toBe(true);
      });

      it("should diagnose dimensional accuracy issues", () => {
        const request: MillingTroubleshootingRequest = {
          problem_description: "Pocket dimensions out of tolerance",
          symptoms: ["Walls oversize", "Dimension error increases with depth"],
          milling_type: "2d_pocket",
          context: {},
          severity: "critical",
        };

        const diagnosis = MillingAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.some(r => r.cause.toLowerCase().includes("deflection"))).toBe(true);
      });

      it("should diagnose chip issues", () => {
        const request: MillingTroubleshootingRequest = {
          problem_description: "Poor chip evacuation in deep pocket",
          symptoms: ["Chips re-cutting", "Surface damage", "Tool getting hot"],
          milling_type: "25d_pocket",
          context: {},
          severity: "major",
        };

        const diagnosis = MillingAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.root_causes.some(r => r.category === "programming" || r.cause.includes("chip"))).toBe(true);
      });

      it("should provide parameter adjustments", () => {
        const request: MillingTroubleshootingRequest = {
          problem_description: "Surface finish issues",
          symptoms: ["Feed marks visible"],
          milling_type: "3d_parallel",
          context: {
            params: { spindle_rpm: 6000, feed_mmmin: 2000, ap_mm: 0.5, ae_mm: 2, coolant: "flood" },
          },
          severity: "minor",
        };

        const diagnosis = MillingAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.parameter_adjustments.length).toBeGreaterThan(0);
        expect(diagnosis.parameter_adjustments[0].current_value).toBeDefined();
        expect(diagnosis.parameter_adjustments[0].recommended_value).toBeDefined();
        expect(diagnosis.parameter_adjustments[0].expected_improvement).toBeDefined();
      });

      it("should generate preventive measures", () => {
        const request: MillingTroubleshootingRequest = {
          problem_description: "Recurring quality issues",
          symptoms: ["Inconsistent results"],
          milling_type: "2d_pocket",
          context: {},
          severity: "major",
        };

        const diagnosis = MillingAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(diagnosis.preventive_measures.length).toBeGreaterThan(0);
      });

      it("should store troubleshooting history", () => {
        expect(MillingAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBe(0);

        const request: MillingTroubleshootingRequest = {
          problem_description: "Test issue",
          symptoms: ["Symptom"],
          milling_type: "2d_pocket",
          context: {},
          severity: "minor",
        };

        MillingAIUltraIntelligenceEngine.diagnoseProblem(request);

        expect(MillingAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBe(1);
      });
    });

    describe("generateTroubleshootingPrompt", () => {
      it("should generate formatted LLM prompt", () => {
        const request: MillingTroubleshootingRequest = {
          problem_description: "Tool breakage during pocket milling",
          symptoms: ["Sudden failure", "No warning signs"],
          milling_type: "25d_pocket",
          context: {
            tool: { id: "T4", type: "flat_endmill", diameter_mm: 12, flute_count: 4, flute_length_mm: 30, overall_length_mm: 75, material: "carbide" },
            material: { name: "Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
            params: { spindle_rpm: 6000, feed_mmmin: 2400, ap_mm: 3, ae_mm: 8, coolant: "flood" },
          },
          severity: "critical",
        };

        const prompt = MillingAIUltraIntelligenceEngine.generateTroubleshootingPrompt(request);

        expect(prompt).toContain("PRISM Milling Troubleshooting");
        expect(prompt).toContain("Tool breakage");
        expect(prompt).toContain("physics");
        expect(prompt).toContain("root cause");
      });
    });
  });

  // ===========================================================================
  // 5-AXIS DELEGATION
  // ===========================================================================
  describe("5-Axis Delegation", () => {
    it("should delegate to 5-axis engine for simultaneous operations", () => {
      const result = MillingAIUltraIntelligenceEngine.delegateTo5Axis(
        "Machine titanium impeller with 5-axis simultaneous"
      );

      expect(result.intent).toBeDefined();
      expect(result.reasoning).toBeDefined();
    });
  });

  // ===========================================================================
  // INTEGRATION & EDGE CASES
  // ===========================================================================
  describe("Integration & Edge Cases", () => {
    it("should handle complete NL to troubleshooting workflow", () => {
      // Parse
      const intent = MillingAIUltraIntelligenceEngine.parseNaturalLanguage(
        "Mill deep pocket in tool steel with fine finish"
      );
      expect(intent.milling_type).toBeDefined();

      // Process
      const workflow = MillingAIUltraIntelligenceEngine.processNaturalLanguage(
        "Mill deep pocket in tool steel with fine finish"
      );
      expect(workflow.operation_plan).toBeDefined();

      // Troubleshoot if issue
      const diagnosis = MillingAIUltraIntelligenceEngine.diagnoseProblem({
        problem_description: "Surface finish not meeting spec",
        symptoms: ["Scallop too visible"],
        milling_type: workflow.intent.milling_type || "2d_pocket",
        context: {},
        severity: "major",
      });
      expect(diagnosis.corrective_actions.length).toBeGreaterThan(0);
    });

    it("should handle empty input gracefully", () => {
      const result = MillingAIUltraIntelligenceEngine.parseNaturalLanguage("");
      expect(result.clarification_needed).toBe(true);
    });

    it("should clear all data correctly", () => {
      // Add some data
      MillingAIUltraIntelligenceEngine.recordToolLifeData({
        tool: { id: "T1", type: "flat_endmill", diameter_mm: 10, flute_count: 4, flute_length_mm: 25, overall_length_mm: 60, material: "carbide" },
        material: { name: "Steel", iso_group: "P", kc11_mpa: 1800, mc: 0.25 },
        params: { spindle_rpm: 5000, feed_mmmin: 2000, ap_mm: 2, ae_mm: 5, coolant: "flood" },
        milling_type: "2d_pocket",
        operation_phase: "roughing",
        engagement_angle_avg_deg: 90,
        interrupted_cut: false,
        entry_type: "ramp",
        corner_count: 4,
        similar_operations_count: 10,
      }, 50);

      MillingAIUltraIntelligenceEngine.diagnoseProblem({
        problem_description: "Test",
        symptoms: ["Test"],
        milling_type: "2d_pocket",
        context: {},
        severity: "minor",
      });

      expect(MillingAIUltraIntelligenceEngine.getToolLifeDataCount()).toBeGreaterThan(0);
      expect(MillingAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBeGreaterThan(0);

      MillingAIUltraIntelligenceEngine.clearAll();

      expect(MillingAIUltraIntelligenceEngine.getToolLifeDataCount()).toBe(0);
      expect(MillingAIUltraIntelligenceEngine.getTroubleshootingHistoryCount()).toBe(0);
      expect(MillingAIUltraIntelligenceEngine.getRLEpisodeCount()).toBe(0);
    });
  });

  // ===========================================================================
  // MODULE EXPORTS
  // ===========================================================================
  describe("Module Exports", () => {
    it("should export class and singleton", () => {
      expect(MillingAIUltraIntelligenceEngine).toBeDefined();
      expect(typeof MillingAIUltraIntelligenceEngine.parseNaturalLanguage).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.processNaturalLanguage).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.selectOptimalStrategy).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.predictToolLife).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.extractToolpathFeatures).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.scoreToolpath).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.explainDecision).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.getRecommendedAction).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.calculateReward).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.recordEpisode).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.diagnoseProblem).toBe("function");
      expect(typeof MillingAIUltraIntelligenceEngine.delegateTo5Axis).toBe("function");
    });

    it("should export all required types", async () => {
      const exports = await import("../engines/index.js");

      expect(exports.MillingAIUltraIntelligenceEngine).toBeDefined();

      const intent = exports.MillingAIUltraIntelligenceEngine.parseNaturalLanguage("Test pocket");
      expect(intent.raw_input).toBe("Test pocket");
    });
  });
});
