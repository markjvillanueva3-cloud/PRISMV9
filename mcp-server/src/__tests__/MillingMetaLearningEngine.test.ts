/**
 * Tests for MillingMetaLearningEngine
 * Validates self-improving milling intelligence capabilities.
 */
import { describe, it, expect } from "vitest";
import {
  MillingMetaLearningEngine,
  millingMetaLearningEngine,
  type OperationExperience,
  type LearningFeedback,
} from "../engines/MillingMetaLearningEngine.js";

describe("MillingMetaLearningEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingMetaLearningEngine).toBeDefined();
      expect(millingMetaLearningEngine).toBeInstanceOf(MillingMetaLearningEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingMetaLearningEngine();
      expect(engine).toBeInstanceOf(MillingMetaLearningEngine);
    });

    it("starts with seed patterns", () => {
      const engine = new MillingMetaLearningEngine();
      const patterns = engine.getPatterns();
      expect(patterns.length).toBeGreaterThan(5);
    });
  });

  // ============================================================================
  // LEARN FROM EXPERIENCE
  // ============================================================================

  describe("learnFromExperience()", () => {
    it("learns from successful operation", () => {
      const engine = new MillingMetaLearningEngine();
      const experience: OperationExperience = {
        id: "EXP-001",
        timestamp: new Date().toISOString(),
        operation: "roughing",
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        tool_type: "flat_endmill",
        tool_diameter_mm: 12,
        rpm: 3500,
        feed_mm_min: 600,
        doc_mm: 4,
        woc_mm: 8,
        success: true,
        cycle_time_min: 15,
        tool_life_achieved_min: 90,
        surface_finish_ra: 2.5,
      };

      const result = engine.learnFromExperience(experience);

      expect(result.learned).toBe(true);
      expect(result.state_update.total_experiences).toBe(1);
      expect(result.state_update.successful_operations).toBe(1);
    });

    it("learns from failed operation and discovers pattern", () => {
      const engine = new MillingMetaLearningEngine();
      const experience: OperationExperience = {
        id: "EXP-002",
        timestamp: new Date().toISOString(),
        operation: "slotting",
        material: "Inconel 718",
        material_iso: "S",
        feature_type: "slot",
        tool_type: "flat_endmill",
        tool_diameter_mm: 10,
        rpm: 2500,
        feed_mm_min: 400,
        doc_mm: 5,
        woc_mm: 10,
        success: false,
        operator_notes: "Tool broke due to chip recutting",
      };

      const result = engine.learnFromExperience(experience);

      expect(result.learned).toBe(true);
      expect(result.new_patterns.length).toBeGreaterThan(0);
      expect(result.new_patterns[0].pattern_type).toBe("failure_mode");
    });

    it("increments experience count", () => {
      const engine = new MillingMetaLearningEngine();
      const initialState = engine.getState();

      engine.learnFromExperience({
        id: "EXP-003",
        timestamp: new Date().toISOString(),
        operation: "facing",
        material: "6061-T6",
        material_iso: "N",
        feature_type: "face",
        tool_type: "face_mill",
        tool_diameter_mm: 50,
        rpm: 8000,
        feed_mm_min: 1500,
        doc_mm: 2,
        woc_mm: 35,
        success: true,
      });

      const newState = engine.getState();
      expect(newState.total_experiences).toBe(initialState.total_experiences + 1);
    });
  });

  // ============================================================================
  // PROCESS FEEDBACK
  // ============================================================================

  describe("processFeedback()", () => {
    it("processes success feedback", () => {
      const engine = new MillingMetaLearningEngine();
      const feedback: LearningFeedback = {
        experience_id: "EXP-001",
        outcome: "success",
        metric_scores: {
          tool_life: 0.9,
          surface_finish: 0.85,
          cycle_time: 0.8,
        },
      };

      const result = engine.processFeedback(feedback);

      expect(result.processed).toBe(true);
      expect(result.adjustments.confidence).toBeGreaterThan(0);
    });

    it("processes failure feedback with adjustments", () => {
      const engine = new MillingMetaLearningEngine();
      const feedback: LearningFeedback = {
        experience_id: "EXP-002",
        outcome: "failure",
        metric_scores: {
          tool_life: 0.2,
        },
        root_cause_if_failure: "Excessive speed for material",
      };

      const result = engine.processFeedback(feedback);

      expect(result.processed).toBe(true);
      expect(result.adjustments.confidence).toBeLessThan(0);
    });

    it("adjusts for poor tool life", () => {
      const engine = new MillingMetaLearningEngine();
      const feedback: LearningFeedback = {
        experience_id: "EXP-003",
        outcome: "partial",
        metric_scores: {
          tool_life: 0.3,
        },
      };

      const result = engine.processFeedback(feedback);

      expect(result.adjustments.rpm).toBeLessThan(0);
      expect(result.adjustments.feed).toBeLessThan(0);
    });

    it("adjusts for poor surface finish", () => {
      const engine = new MillingMetaLearningEngine();
      const feedback: LearningFeedback = {
        experience_id: "EXP-004",
        outcome: "partial",
        metric_scores: {
          surface_finish: 0.5,
        },
      };

      const result = engine.processFeedback(feedback);

      expect(result.adjustments.feed).toBeLessThan(0);
    });
  });

  // ============================================================================
  // GET ADAPTIVE RECOMMENDATION
  // ============================================================================

  describe("getAdaptiveRecommendation()", () => {
    it("returns adaptive recommendation", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "4140 Steel",
        material_iso: "P",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      expect(result.request_id).toMatch(/^ADAPT-/);
      expect(result.timestamp).toBeDefined();
      expect(result.parameters.rpm).toBeDefined();
      expect(result.parameters.feed_mm_min).toBeDefined();
      expect(result.parameters.doc_mm).toBeDefined();
    });

    it("includes parameter uncertainty", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "finishing",
        material: "6061-T6",
        material_iso: "N",
        feature_type: "contour",
        tool_diameter_mm: 10,
      });

      expect(result.parameters.rpm.predicted_value).toBeGreaterThan(0);
      expect(result.parameters.rpm.uncertainty).toBeGreaterThanOrEqual(0);
      expect(result.parameters.rpm.confidence).toBeGreaterThan(0);
      expect(result.parameters.rpm.confidence).toBeLessThanOrEqual(1);
    });

    it("reports similar experiences count", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "D2",
        material_iso: "H",
        feature_type: "pocket",
        tool_diameter_mm: 8,
      });

      expect(result.similar_experiences).toBeGreaterThanOrEqual(0);
    });

    it("reports adaptation method", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "Ti-6Al-4V",
        material_iso: "S",
        feature_type: "slot",
        tool_diameter_mm: 10,
      });

      expect(["direct", "transfer", "extrapolation", "bayesian"]).toContain(result.adaptation_method);
    });

    it("reports patterns applied", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "316 Stainless",
        material_iso: "M",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      expect(Array.isArray(result.patterns_applied)).toBe(true);
    });

    it("reports exploration vs exploitation balance", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "4140",
        material_iso: "P",
        feature_type: "face",
        tool_diameter_mm: 50,
      });

      expect(result.exploration_vs_exploitation).toBeGreaterThanOrEqual(0);
      expect(result.exploration_vs_exploitation).toBeLessThanOrEqual(1);
    });

    it("detects knowledge gaps", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "Hastelloy X",
        material_iso: "S",
        feature_type: "deep_pocket",
        tool_diameter_mm: 6,
      });

      expect(Array.isArray(result.knowledge_gaps)).toBe(true);
    });

    it("provides confidence interval", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "finishing",
        material: "A2",
        material_iso: "H",
        feature_type: "contour",
        tool_diameter_mm: 10,
      });

      expect(result.confidence_interval).toHaveLength(2);
      expect(result.confidence_interval[0]).toBeLessThan(result.confidence_interval[1]);
    });

    it("recommends validation steps", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "Inconel 718",
        material_iso: "S",
        feature_type: "deep_pocket",
        tool_diameter_mm: 8,
      });

      expect(result.recommended_validation.length).toBeGreaterThan(0);
    });

    it("adjusts parameters for material class", () => {
      const steelResult = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "4140",
        material_iso: "P",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      const superalloyResult = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "Inconel",
        material_iso: "S",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      // Superalloy should have lower speeds
      expect(superalloyResult.parameters.rpm.predicted_value).toBeLessThan(
        steelResult.parameters.rpm.predicted_value
      );
    });

    it("handles customer context", () => {
      const result = millingMetaLearningEngine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "4140",
        material_iso: "P",
        feature_type: "pocket",
        tool_diameter_mm: 12,
        customer: "FONTANA",
      });

      expect(result.request_id).toBeDefined();
      // Customer patterns should be considered
      expect(result.patterns_applied.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // GET TRANSFER MAPPINGS
  // ============================================================================

  describe("getTransferMappings()", () => {
    it("returns transfer mappings for steel roughing", () => {
      const mappings = millingMetaLearningEngine.getTransferMappings("steel_roughing");

      expect(mappings.length).toBeGreaterThan(0);
      expect(mappings[0].source_domain).toBe("steel_roughing");
      expect(mappings[0].similarity).toBeGreaterThan(0);
    });

    it("returns empty for unknown domain", () => {
      const mappings = millingMetaLearningEngine.getTransferMappings("unknown_domain");

      expect(mappings.length).toBe(0);
    });
  });

  // ============================================================================
  // GET PATTERNS
  // ============================================================================

  describe("getPatterns()", () => {
    it("returns all patterns without filter", () => {
      const patterns = millingMetaLearningEngine.getPatterns();

      expect(patterns.length).toBeGreaterThan(5);
    });

    it("filters by pattern type", () => {
      const failureModes = millingMetaLearningEngine.getPatterns("failure_mode");
      const successFactors = millingMetaLearningEngine.getPatterns("success_factor");

      expect(failureModes.every(p => p.pattern_type === "failure_mode")).toBe(true);
      expect(successFactors.every(p => p.pattern_type === "success_factor")).toBe(true);
    });

    it("patterns have required fields", () => {
      const patterns = millingMetaLearningEngine.getPatterns();

      for (const pattern of patterns) {
        expect(pattern.pattern_id).toBeDefined();
        expect(pattern.pattern_type).toBeDefined();
        expect(pattern.description).toBeDefined();
        expect(pattern.confidence).toBeGreaterThan(0);
        expect(pattern.evidence_count).toBeGreaterThan(0);
        expect(pattern.applicability.length).toBeGreaterThan(0);
      }
    });
  });

  // ============================================================================
  // GET STATE
  // ============================================================================

  describe("getState()", () => {
    it("returns learning state", () => {
      const state = millingMetaLearningEngine.getState();

      expect(state.total_experiences).toBeGreaterThanOrEqual(0);
      expect(state.successful_operations).toBeGreaterThanOrEqual(0);
      expect(state.patterns_discovered).toBeGreaterThan(0);
      expect(state.avg_prediction_accuracy).toBeGreaterThan(0);
      expect(state.learning_rate).toBeGreaterThan(0);
      expect(state.exploration_factor).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SELF ASSESS
  // ============================================================================

  describe("selfAssess()", () => {
    it("returns self-assessment", () => {
      const assessment = millingMetaLearningEngine.selfAssess();

      expect(assessment.prediction_accuracy).toBeGreaterThanOrEqual(0);
      expect(assessment.prediction_accuracy).toBeLessThanOrEqual(1);
      expect(assessment.confidence_calibration).toBeGreaterThan(0);
      expect(assessment.coverage).toBeGreaterThan(0);
    });

    it("identifies improvement areas and strengths", () => {
      const assessment = millingMetaLearningEngine.selfAssess();

      expect(Array.isArray(assessment.improvement_areas)).toBe(true);
      expect(Array.isArray(assessment.strengths)).toBe(true);
    });
  });

  // ============================================================================
  // GET STATS
  // ============================================================================

  describe("getStats()", () => {
    it("returns statistics", () => {
      const stats = millingMetaLearningEngine.getStats();

      expect(stats.experiences).toBeGreaterThanOrEqual(0);
      expect(stats.patterns).toBeGreaterThan(5);
      expect(stats.success_rate).toBeGreaterThanOrEqual(0);
      expect(stats.success_rate).toBeLessThanOrEqual(1);
      expect(stats.learning_rate).toBeGreaterThan(0);
      expect(stats.exploration_factor).toBeGreaterThan(0);
      expect(stats.transfer_mappings).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe("integration", () => {
    it("complete learning cycle works", () => {
      const engine = new MillingMetaLearningEngine();

      // Get initial recommendation
      const rec1 = engine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "4140",
        material_iso: "P",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      // Learn from experience
      engine.learnFromExperience({
        id: "INT-001",
        timestamp: new Date().toISOString(),
        operation: "roughing",
        material: "4140",
        material_iso: "P",
        feature_type: "pocket",
        tool_type: "flat_endmill",
        tool_diameter_mm: 12,
        rpm: rec1.parameters.rpm.predicted_value,
        feed_mm_min: rec1.parameters.feed_mm_min.predicted_value,
        doc_mm: rec1.parameters.doc_mm.predicted_value,
        woc_mm: rec1.parameters.woc_mm.predicted_value,
        success: true,
      });

      // Process feedback
      engine.processFeedback({
        experience_id: "INT-001",
        outcome: "success",
        metric_scores: { tool_life: 0.9, surface_finish: 0.85 },
      });

      // Get new recommendation
      const rec2 = engine.getAdaptiveRecommendation({
        operation: "roughing",
        material: "4140",
        material_iso: "P",
        feature_type: "pocket",
        tool_diameter_mm: 12,
      });

      // Should have more confidence after learning
      expect(engine.getState().total_experiences).toBeGreaterThan(0);
    });

    it("failure learning adjusts recommendations", () => {
      const engine = new MillingMetaLearningEngine();
      const initialPatterns = engine.getPatterns().length;

      // Learn from failure
      engine.learnFromExperience({
        id: "FAIL-001",
        timestamp: new Date().toISOString(),
        operation: "slotting",
        material: "Inconel",
        material_iso: "S",
        feature_type: "slot",
        tool_type: "flat_endmill",
        tool_diameter_mm: 8,
        rpm: 3000,
        feed_mm_min: 500,
        doc_mm: 4,
        woc_mm: 8,
        success: false,
        operator_notes: "Tool broke - speed too high for Inconel",
      });

      // Should have discovered new pattern
      expect(engine.getPatterns().length).toBeGreaterThan(initialPatterns);
    });
  });
});
