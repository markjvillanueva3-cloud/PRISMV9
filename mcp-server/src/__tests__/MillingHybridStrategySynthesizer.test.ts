/**
 * Tests for MillingHybridStrategySynthesizer
 * Validates intelligent strategy combination for milling.
 */
import { describe, it, expect } from "vitest";
import {
  MillingHybridStrategySynthesizer,
  millingHybridStrategySynthesizer,
  type HybridRequest,
  type StrategyType,
} from "../engines/MillingHybridStrategySynthesizer.js";

describe("MillingHybridStrategySynthesizer", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingHybridStrategySynthesizer).toBeDefined();
      expect(millingHybridStrategySynthesizer).toBeInstanceOf(MillingHybridStrategySynthesizer);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingHybridStrategySynthesizer();
      expect(engine).toBeInstanceOf(MillingHybridStrategySynthesizer);
    });
  });

  // ============================================================================
  // SYNTHESIZE METHOD
  // ============================================================================

  describe("synthesize()", () => {
    it("returns complete HybridSynthesisResult", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 30,
        width_mm: 50,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.request_id).toMatch(/^HYBRID-/);
      expect(result.timestamp).toBeDefined();
      expect(result.feature_analysis).toBeDefined();
      expect(result.strategy_scores.length).toBeGreaterThan(5);
      expect(result.top_single_strategy).toBeDefined();
      expect(result.workflow_steps.length).toBeGreaterThan(0);
      expect(result.operation_sequence.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("analyzes feature complexity", () => {
      const simpleRequest: HybridRequest = {
        feature_type: "face",
        depth_mm: 5,
        material_iso: "P",
      };

      const complexRequest: HybridRequest = {
        feature_type: "cavity",
        depth_mm: 80,
        corner_radius_mm: 1,
        hardness_hrc: 55,
        surface_finish_ra: 0.8,
      };

      const simpleResult = millingHybridStrategySynthesizer.synthesize(simpleRequest);
      const complexResult = millingHybridStrategySynthesizer.synthesize(complexRequest);

      expect(["simple", "moderate"]).toContain(simpleResult.feature_analysis.complexity);
      expect(complexResult.feature_analysis.complexity).toBe("complex");
      expect(complexResult.feature_analysis.challenges.length).toBeGreaterThan(
        simpleResult.feature_analysis.challenges.length
      );
    });

    it("scores strategies appropriately", () => {
      const request: HybridRequest = {
        feature_type: "slot",
        depth_mm: 40,
        material_iso: "S", // Superalloy - trochoidal should score well
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      // Trochoidal should be high for deep slot in superalloy
      const trochoidalScore = result.strategy_scores.find(s => s.strategy === "trochoidal");
      expect(trochoidalScore).toBeDefined();
      expect(trochoidalScore!.fit_score).toBeGreaterThan(0.5);
    });

    it("finds hybrid combinations", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 30,
        corner_radius_mm: 2,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.hybrid_combinations.length).toBeGreaterThan(0);
      for (const combo of result.hybrid_combinations) {
        expect(combo.primary_strategy).toBeDefined();
        expect(combo.secondary_strategy).toBeDefined();
        expect(combo.synergy_score).toBeGreaterThan(0);
        expect(combo.workflow.length).toBeGreaterThan(0);
      }
    });

    it("recommends best hybrid", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 30,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      if (result.recommended_hybrid) {
        expect(result.recommended_hybrid.synergy_score).toBeGreaterThan(0.6);
        expect(result.recommended_hybrid.workflow.length).toBeGreaterThan(0);
      }
    });

    it("generates operation sequence", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 40,
        corner_radius_mm: 2,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.operation_sequence).toContain("Face top surface");
      expect(result.operation_sequence.some(op =>
        op.toLowerCase().includes("rough")
      )).toBe(true);
      expect(result.operation_sequence.some(op =>
        op.toLowerCase().includes("finish")
      )).toBe(true);
    });

    it("estimates improvements", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 30,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.estimated_cycle_time_reduction_pct).toBeGreaterThanOrEqual(0);
      expect(result.estimated_tool_life_improvement_pct).toBeGreaterThanOrEqual(0);
      expect(result.estimated_quality_improvement_pct).toBeGreaterThanOrEqual(0);
    });

    it("provides tribal tips", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 50,
        material_iso: "S", // Superalloy
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.tribal_tips.length).toBeGreaterThan(0);
    });

    it("generates warnings for challenging features", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 60,
        corner_radius_mm: 0.5,
        hardness_hrc: 58,
        tool_diameter_mm: 10,
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // QUICK RECOMMEND METHOD
  // ============================================================================

  describe("quickRecommend()", () => {
    it("returns quick recommendation", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.quickRecommend(request);

      expect(result.strategy).toBeDefined();
      expect(result.reason).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("recommends hybrid for tight corners", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        corner_radius_mm: 2,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.quickRecommend(request);

      // If trochoidal is recommended with tight corners, should suggest rest
      if (result.strategy === "trochoidal") {
        expect(result.hybrid_with).toBe("rest");
      }
    });

    it("recommends hybrid for deep features", () => {
      const request: HybridRequest = {
        feature_type: "face",
        depth_mm: 60,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.quickRecommend(request);

      // Deep face may suggest HFM + plunge
      if (result.strategy === "hfm") {
        expect(result.hybrid_with).toBe("plunge");
      }
    });
  });

  // ============================================================================
  // GET STRATEGIES METHOD
  // ============================================================================

  describe("getStrategies()", () => {
    it("returns all available strategies", () => {
      const strategies = millingHybridStrategySynthesizer.getStrategies();

      expect(strategies.length).toBeGreaterThan(10);
      for (const strategy of strategies) {
        expect(strategy.type).toBeDefined();
        expect(strategy.description).toBeDefined();
        expect(strategy.best_for.length).toBeGreaterThan(0);
        expect(strategy.limitations.length).toBeGreaterThan(0);
        expect(strategy.cost_factor).toBeGreaterThan(0);
        expect(strategy.time_factor).toBeGreaterThan(0);
        expect(strategy.quality_factor).toBeGreaterThan(0);
      }
    });

    it("includes key strategy types", () => {
      const strategies = millingHybridStrategySynthesizer.getStrategies();
      const types = strategies.map(s => s.type);

      expect(types).toContain("trochoidal");
      expect(types).toContain("hsm");
      expect(types).toContain("plunge");
      expect(types).toContain("rest");
      expect(types).toContain("hfm");
      expect(types).toContain("5_axis");
    });
  });

  // ============================================================================
  // GET SYNERGY METHOD
  // ============================================================================

  describe("getSynergy()", () => {
    it("returns synergy for trochoidal+rest", () => {
      const synergy = millingHybridStrategySynthesizer.getSynergy("trochoidal", "rest");

      expect(synergy).not.toBeNull();
      expect(synergy!.synergy_score).toBeGreaterThan(0.8);
      expect(synergy!.workflow.length).toBeGreaterThan(0);
      expect(synergy!.recommended).toBe(true);
    });

    it("returns synergy for hfm+plunge", () => {
      const synergy = millingHybridStrategySynthesizer.getSynergy("hfm", "plunge");

      expect(synergy).not.toBeNull();
      expect(synergy!.synergy_score).toBeGreaterThan(0.7);
    });

    it("returns synergy for hsm+conventional", () => {
      const synergy = millingHybridStrategySynthesizer.getSynergy("hsm", "conventional");

      expect(synergy).not.toBeNull();
      expect(synergy!.synergy_score).toBeGreaterThan(0.7);
    });

    it("returns null for incompatible strategies", () => {
      const synergy = millingHybridStrategySynthesizer.getSynergy("plunge", "pencil");

      expect(synergy).toBeNull();
    });

    it("handles reverse order", () => {
      const synergy1 = millingHybridStrategySynthesizer.getSynergy("trochoidal", "rest");
      const synergy2 = millingHybridStrategySynthesizer.getSynergy("rest", "trochoidal");

      expect(synergy1).not.toBeNull();
      expect(synergy2).not.toBeNull();
      expect(synergy1!.synergy_score).toBe(synergy2!.synergy_score);
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("material-specific behavior", () => {
    it("prioritizes trochoidal for superalloys", () => {
      const request: HybridRequest = {
        feature_type: "slot",
        depth_mm: 30,
        material_iso: "S", // Superalloy
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      const trochoidalScore = result.strategy_scores.find(s => s.strategy === "trochoidal");
      expect(trochoidalScore!.fit_score).toBeGreaterThan(0.6);
      expect(trochoidalScore!.reasons.some(r =>
        r.toLowerCase().includes("superalloy") || r.toLowerCase().includes("hard")
      )).toBe(true);
    });

    it("prioritizes HSM for aluminum", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 20,
        material_iso: "N", // Aluminum
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      const hsmScore = result.strategy_scores.find(s => s.strategy === "hsm");
      expect(hsmScore!.fit_score).toBeGreaterThan(0.5);
      expect(hsmScore!.reasons.some(r =>
        r.toLowerCase().includes("aluminum")
      )).toBe(true);
    });

    it("includes hard milling tips for hard materials", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 20,
        hardness_hrc: 50,
        material_iso: "H",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.tribal_tips.some(tip =>
        tip.toLowerCase().includes("hard")
      )).toBe(true);
    });
  });

  // ============================================================================
  // FEATURE-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("feature-specific behavior", () => {
    it("recommends rest for tight corners", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        corner_radius_mm: 1.5,
        depth_mm: 30,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      // Should either have rest in hybrids OR mention corners in operation sequence
      const hasRestHybrid = result.hybrid_combinations.some(c =>
        c.secondary_strategy === "rest" || c.primary_strategy === "rest"
      );
      const hasCornerOp = result.operation_sequence.some(op =>
        op.toLowerCase().includes("corner") || op.toLowerCase().includes("pencil")
      );
      expect(hasRestHybrid || hasCornerOp).toBe(true);
    });

    it("recommends plunge for deep features", () => {
      const request: HybridRequest = {
        feature_type: "cavity",
        depth_mm: 80,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      const plungeScore = result.strategy_scores.find(s => s.strategy === "plunge");
      expect(plungeScore!.fit_score).toBeGreaterThan(0.5);
    });

    it("includes pencil for tight corner cleanup", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        corner_radius_mm: 1,
        material_iso: "P",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.operation_sequence.some(op =>
        op.toLowerCase().includes("pencil") || op.toLowerCase().includes("corner")
      )).toBe(true);
    });
  });

  // ============================================================================
  // PRIORITY-BASED BEHAVIOR
  // ============================================================================

  describe("priority-based behavior", () => {
    it("favors faster strategies when speed priority", () => {
      const speedRequest: HybridRequest = {
        feature_type: "pocket",
        material_iso: "P",
        priority: "speed",
      };

      const qualityRequest: HybridRequest = {
        feature_type: "pocket",
        material_iso: "P",
        priority: "quality",
      };

      const speedResult = millingHybridStrategySynthesizer.synthesize(speedRequest);
      const qualityResult = millingHybridStrategySynthesizer.synthesize(qualityRequest);

      // Fast strategies should score higher with speed priority
      const hfmSpeedScore = speedResult.strategy_scores.find(s => s.strategy === "hfm")!.fit_score;
      const hfmQualityScore = qualityResult.strategy_scores.find(s => s.strategy === "hfm")!.fit_score;

      expect(hfmSpeedScore).toBeGreaterThanOrEqual(hfmQualityScore);
    });

    it("favors quality strategies when quality priority", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        material_iso: "P",
        priority: "quality",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      const hsmScore = result.strategy_scores.find(s => s.strategy === "hsm");
      expect(hsmScore!.reasons.some(r =>
        r.toLowerCase().includes("quality")
      )).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles minimal request", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result).toBeDefined();
      expect(result.strategy_scores.length).toBeGreaterThan(0);
      expect(result.top_single_strategy).toBeDefined();
    });

    it("handles extreme depth", () => {
      const request: HybridRequest = {
        feature_type: "cavity",
        depth_mm: 200,
        tool_diameter_mm: 10,
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w =>
        w.toLowerCase().includes("depth")
      )).toBe(true);
    });

    it("handles very tight corners", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        corner_radius_mm: 0.3,
      };

      const result = millingHybridStrategySynthesizer.synthesize(request);

      expect(result.warnings.some(w =>
        w.toLowerCase().includes("corner") || w.toLowerCase().includes("edm")
      )).toBe(true);
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("synthesize completes quickly", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 30,
        material_iso: "P",
      };

      const start = Date.now();
      const result = millingHybridStrategySynthesizer.synthesize(request);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("quickRecommend is very fast", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        material_iso: "P",
      };

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        millingHybridStrategySynthesizer.quickRecommend(request);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  // ============================================================================
  // CONSISTENCY
  // ============================================================================

  describe("consistency", () => {
    it("synthesize returns consistent results", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        depth_mm: 30,
        material_iso: "P",
      };

      const result1 = millingHybridStrategySynthesizer.synthesize(request);
      const result2 = millingHybridStrategySynthesizer.synthesize(request);

      expect(result1.top_single_strategy).toBe(result2.top_single_strategy);
      expect(result1.strategy_scores[0].fit_score).toBe(result2.strategy_scores[0].fit_score);
    });

    it("quickRecommend is deterministic", () => {
      const request: HybridRequest = {
        feature_type: "pocket",
        material_iso: "P",
      };

      const result1 = millingHybridStrategySynthesizer.quickRecommend(request);
      const result2 = millingHybridStrategySynthesizer.quickRecommend(request);

      expect(result1.strategy).toBe(result2.strategy);
      expect(result1.confidence).toBe(result2.confidence);
    });
  });
});
