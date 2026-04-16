/**
 * Tests for MillingNeuralCognitiveEngine
 * Validates near-AGI level cognitive processing for milling.
 */
import { describe, it, expect } from "vitest";
import {
  MillingNeuralCognitiveEngine,
  millingNeuralCognitiveEngine,
  type CognitiveInput,
} from "../engines/MillingNeuralCognitiveEngine.js";

describe("MillingNeuralCognitiveEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingNeuralCognitiveEngine).toBeDefined();
      expect(millingNeuralCognitiveEngine).toBeInstanceOf(MillingNeuralCognitiveEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingNeuralCognitiveEngine();
      expect(engine).toBeInstanceOf(MillingNeuralCognitiveEngine);
    });
  });

  // ============================================================================
  // PROCESS METHOD
  // ============================================================================

  describe("process()", () => {
    it("returns complete CognitiveOutput", async () => {
      const input: CognitiveInput = {
        query: "Optimize roughing parameters for 4140 steel",
        intent: "optimize",
        material_iso: "P",
        operation: "roughing",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.request_id).toMatch(/^COGNITIVE-/);
      expect(output.timestamp).toBeDefined();
      expect(output.query).toBe(input.query);
      expect(output.intent).toBe("optimize");
      expect(output.recommendation).toBeDefined();
      expect(output.reasoning_traces.length).toBeGreaterThan(0);
      expect(output.neural_predictions.length).toBeGreaterThan(0);
      expect(output.overall_confidence).toBeGreaterThan(0);
    });

    it("generates recommendation with parameters", async () => {
      const input: CognitiveInput = {
        query: "Parameters for finishing",
        intent: "recommend",
        material_iso: "P",
        operation: "finishing",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.recommendation.parameters.rpm).toBeGreaterThan(0);
      expect(output.recommendation.parameters.feed_mm_min).toBeGreaterThan(0);
      expect(output.recommendation.parameters.doc_mm).toBeGreaterThan(0);
      expect(output.recommendation.strategy).toBeDefined();
      expect(output.recommendation.tool).toBeDefined();
      expect(output.recommendation.operation_sequence.length).toBeGreaterThan(0);
    });

    it("performs multi-path reasoning", async () => {
      const input: CognitiveInput = {
        query: "Analyze cutting strategy",
        intent: "analyze",
        material_iso: "P",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.reasoning_traces.length).toBeGreaterThanOrEqual(2);
      for (const trace of output.reasoning_traces) {
        expect(trace.mode).toBeDefined();
        expect(trace.steps.length).toBeGreaterThan(0);
        expect(trace.confidence).toBeGreaterThan(0);
      }
    });

    it("generates neural predictions with uncertainty", async () => {
      const input: CognitiveInput = {
        query: "Predict optimal parameters",
        intent: "predict",
        material_iso: "P",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.neural_predictions.length).toBeGreaterThanOrEqual(3);
      for (const pred of output.neural_predictions) {
        expect(pred.parameter).toBeDefined();
        expect(pred.predicted_value).toBeGreaterThan(0);
        expect(pred.confidence).toBeGreaterThan(0);
        expect(pred.uncertainty_range[0]).toBeLessThan(pred.uncertainty_range[1]);
        expect(pred.influencing_factors.length).toBeGreaterThan(0);
      }
    });

    it("synthesizes knowledge from multiple sources", async () => {
      const input: CognitiveInput = {
        query: "Recommend approach",
        intent: "recommend",
        material_iso: "P",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.knowledge_synthesis.length).toBeGreaterThan(3);
      expect(output.knowledge_synthesis.some(k => k.source.includes("JM Die"))).toBe(true);
      expect(output.knowledge_synthesis.some(k => k.source.includes("HyperMill"))).toBe(true);
      expect(output.knowledge_synthesis.some(k => k.source.includes("Physics"))).toBe(true);
    });

    it("validates physics constraints", async () => {
      const input: CognitiveInput = {
        query: "Check parameters",
        intent: "analyze",
        material_iso: "P",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.physics_validations.length).toBeGreaterThan(0);
      for (const validation of output.physics_validations) {
        expect(validation.check).toBeDefined();
        expect(typeof validation.passed).toBe("boolean");
        expect(validation.formula).toBeDefined();
      }
    });

    it("performs metacognitive assessment", async () => {
      const input: CognitiveInput = {
        query: "Analyze approach",
        intent: "analyze",
        material_iso: "P",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.metacognition).toBeDefined();
      expect(output.metacognition.confidence_calibration).toBeGreaterThan(0);
      expect(output.metacognition.uncertainty_decomposition.epistemic).toBeGreaterThanOrEqual(0);
      expect(output.metacognition.uncertainty_decomposition.aleatoric).toBeGreaterThanOrEqual(0);
    });

    it("generates explanation", async () => {
      const input: CognitiveInput = {
        query: "Explain approach",
        intent: "explain",
        material_iso: "P",
        require_explanation: true,
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.explanation.summary).toBeDefined();
      expect(output.explanation.detailed_reasoning.length).toBeGreaterThan(0);
      expect(output.explanation.key_factors.length).toBeGreaterThan(0);
      expect(output.explanation.trade_offs_considered.length).toBeGreaterThan(0);
    });

    it("applies tribal knowledge", async () => {
      const input: CognitiveInput = {
        query: "Recommend parameters",
        intent: "recommend",
        material_iso: "H",
        hardness_hrc: 55,
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.tribal_tips_applied.length).toBeGreaterThan(0);
      expect(output.playbook_rules_applied.length).toBeGreaterThan(0);
    });

    it("assesses risks", async () => {
      const input: CognitiveInput = {
        query: "Check risks",
        intent: "analyze",
        material_iso: "S",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.risks.length).toBeGreaterThan(0);
      for (const risk of output.risks) {
        expect(risk.risk).toBeDefined();
        expect(risk.probability).toBeGreaterThan(0);
        expect(risk.mitigation).toBeDefined();
      }
    });
  });

  // ============================================================================
  // MATERIAL-SPECIFIC BEHAVIOR
  // ============================================================================

  describe("material-specific behavior", () => {
    it("handles hard materials (H group)", async () => {
      const input: CognitiveInput = {
        query: "Parameters for D2 tool steel",
        intent: "recommend",
        material_iso: "H",
        hardness_hrc: 58,
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.recommendation.strategy.toLowerCase()).toContain("hard");
      expect(output.recommendation.tool.type.toLowerCase()).toContain("cbn");
      expect(output.recommendation.parameters.rpm).toBeLessThan(3000);
    });

    it("handles aluminum (N group)", async () => {
      const input: CognitiveInput = {
        query: "Parameters for 6061 aluminum",
        intent: "recommend",
        material_iso: "N",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.recommendation.parameters.rpm).toBeGreaterThan(3000);
      expect(output.recommendation.tool.flutes).toBe(2);
      expect(output.recommendation.tool.coating.toLowerCase()).toContain("uncoated");
    });

    it("handles superalloys (S group)", async () => {
      const input: CognitiveInput = {
        query: "Parameters for titanium",
        intent: "recommend",
        material_iso: "S",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.recommendation.parameters.rpm).toBeLessThan(3000);
      expect(output.recommendation.strategy.toLowerCase()).toContain("trochoidal") ||
        expect(output.recommendation.strategy.toLowerCase()).toContain("superalloy");
      expect(output.risks.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // QUICK PROCESS METHOD
  // ============================================================================

  describe("quickProcess()", () => {
    it("returns quick recommendation", () => {
      const input: CognitiveInput = {
        query: "Quick parameters",
        intent: "recommend",
        material_iso: "P",
      };

      const result = millingNeuralCognitiveEngine.quickProcess(input);

      expect(result.recommendation.rpm).toBeGreaterThan(0);
      expect(result.recommendation.feed).toBeGreaterThan(0);
      expect(result.recommendation.doc).toBeGreaterThan(0);
      expect(result.recommendation.strategy).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.top_tip).toBeDefined();
    });

    it("adjusts for material", () => {
      const steelInput: CognitiveInput = {
        query: "Quick params",
        intent: "recommend",
        material_iso: "P",
      };

      const aluminumInput: CognitiveInput = {
        query: "Quick params",
        intent: "recommend",
        material_iso: "N",
      };

      const steelResult = millingNeuralCognitiveEngine.quickProcess(steelInput);
      const aluminumResult = millingNeuralCognitiveEngine.quickProcess(aluminumInput);

      expect(aluminumResult.recommendation.rpm).toBeGreaterThan(steelResult.recommendation.rpm);
    });
  });

  // ============================================================================
  // EXPLAIN METHOD
  // ============================================================================

  describe("explain()", () => {
    it("explains a decision", () => {
      const input: CognitiveInput = {
        query: "Why this approach?",
        intent: "explain",
        material_iso: "P",
        operation: "roughing",
      };

      const result = millingNeuralCognitiveEngine.explain(input, "Use trochoidal milling");

      expect(result.explanation).toBeDefined();
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
      expect(result.supporting_evidence.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("includes material considerations in explanation", () => {
      const input: CognitiveInput = {
        query: "Explain",
        intent: "explain",
        material_iso: "H",
        hardness_hrc: 55,
      };

      const result = millingNeuralCognitiveEngine.explain(input, "Use CBN tooling");

      expect(result.reasoning_chain.some(r => r.toLowerCase().includes("hard"))).toBe(true);
    });
  });

  // ============================================================================
  // LEARN FROM FEEDBACK METHOD
  // ============================================================================

  describe("learnFromFeedback()", () => {
    it("learns from successful feedback", () => {
      const input: CognitiveInput = {
        query: "Learn",
        intent: "recommend",
        material_iso: "P",
      };

      const result = millingNeuralCognitiveEngine.learnFromFeedback(
        input,
        { rpm: 3000, feed: 500, doc: 5 },
        { rpm: 3200, feed: 520, doc: 5.2 },
        { success: true, tool_life_min: 45 }
      );

      expect(result.learning_applied).toBe(true);
      expect(result.adjustment_factors.rpm).toBeGreaterThan(1);
      expect(result.confidence_adjustment).toBeGreaterThan(0);
      expect(result.insight).toBeDefined();
    });

    it("learns from failed feedback", () => {
      const input: CognitiveInput = {
        query: "Learn",
        intent: "recommend",
        material_iso: "P",
      };

      const result = millingNeuralCognitiveEngine.learnFromFeedback(
        input,
        { rpm: 3000, feed: 500, doc: 5 },
        { rpm: 2500, feed: 400, doc: 4 },
        { success: false }
      );

      expect(result.learning_applied).toBe(true);
      expect(result.confidence_adjustment).toBeLessThan(0);
    });

    it("identifies when prediction was aggressive", () => {
      const input: CognitiveInput = {
        query: "Learn",
        intent: "recommend",
        material_iso: "P",
      };

      const result = millingNeuralCognitiveEngine.learnFromFeedback(
        input,
        { rpm: 4000, feed: 600, doc: 6 },
        { rpm: 3000, feed: 450, doc: 4 },
        { success: false }
      );

      expect(result.insight.toLowerCase()).toContain("reduce");
    });
  });

  // ============================================================================
  // GET STATS METHOD
  // ============================================================================

  describe("getStats()", () => {
    it("returns system statistics", () => {
      const stats = millingNeuralCognitiveEngine.getStats();

      expect(stats.reasoning_modes).toBe(8);
      expect(stats.knowledge_sources).toBe(12);
      expect(stats.neural_layers).toBe(6);
      expect(stats.physics_validations).toBe(5);
      expect(stats.tribal_tips).toBe(3700);
      expect(stats.materials_supported).toBeGreaterThan(0);
      expect(stats.operations_supported).toBeGreaterThan(0);
      expect(stats.confidence_calibration).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // REASONING MODES
  // ============================================================================

  describe("reasoning modes", () => {
    it("uses chain_of_thought for analysis", async () => {
      const input: CognitiveInput = {
        query: "Analyze",
        intent: "analyze",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.reasoning_traces.some(t => t.mode === "chain_of_thought")).toBe(true);
    });

    it("uses tree_of_thought for optimization", async () => {
      const input: CognitiveInput = {
        query: "Optimize",
        intent: "optimize",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.reasoning_traces.some(t => t.mode === "tree_of_thought")).toBe(true);
    });

    it("uses abductive for diagnosis", async () => {
      const input: CognitiveInput = {
        query: "Diagnose issue",
        intent: "diagnose",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.reasoning_traces.some(t => t.mode === "abductive")).toBe(true);
    });

    it("uses analogical for recommendation", async () => {
      const input: CognitiveInput = {
        query: "Recommend",
        intent: "recommend",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.reasoning_traces.some(t => t.mode === "analogical")).toBe(true);
    });
  });

  // ============================================================================
  // COGNITIVE LOAD
  // ============================================================================

  describe("cognitive load", () => {
    it("determines reflexive for simple queries", async () => {
      const input: CognitiveInput = {
        query: "Simple query",
        intent: "recommend",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.cognitive_load).toBe("reflexive");
    });

    it("determines metacognitive for hard materials", async () => {
      const input: CognitiveInput = {
        query: "Hard material query",
        intent: "recommend",
        hardness_hrc: 55,
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.cognitive_load).toBe("metacognitive");
    });

    it("determines strategic for exhaustive analysis", async () => {
      const input: CognitiveInput = {
        query: "Exhaustive analysis",
        intent: "analyze",
        reasoning_depth: "exhaustive",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output.cognitive_load).toBe("strategic");
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles minimal input", async () => {
      const input: CognitiveInput = {
        query: "Test",
        intent: "recommend",
      };

      const output = await millingNeuralCognitiveEngine.process(input);

      expect(output).toBeDefined();
      expect(output.recommendation).toBeDefined();
      expect(output.overall_confidence).toBeGreaterThan(0);
    });

    it("handles all intents", async () => {
      const intents: CognitiveInput["intent"][] = ["analyze", "optimize", "predict", "diagnose", "recommend", "explain", "generate"];

      for (const intent of intents) {
        const output = await millingNeuralCognitiveEngine.process({
          query: `Test ${intent}`,
          intent,
        });
        expect(output.intent).toBe(intent);
      }
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("process completes in reasonable time", async () => {
      const input: CognitiveInput = {
        query: "Performance test",
        intent: "recommend",
        material_iso: "P",
      };

      const start = Date.now();
      const output = await millingNeuralCognitiveEngine.process(input);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(100);
      expect(output.computation_time_ms).toBeLessThan(100);
    });

    it("quickProcess is very fast", () => {
      const input: CognitiveInput = {
        query: "Quick test",
        intent: "recommend",
      };

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        millingNeuralCognitiveEngine.quickProcess(input);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  // ============================================================================
  // CONSISTENCY
  // ============================================================================

  describe("consistency", () => {
    it("process returns consistent results", async () => {
      const input: CognitiveInput = {
        query: "Consistent test",
        intent: "recommend",
        material_iso: "P",
      };

      const output1 = await millingNeuralCognitiveEngine.process(input);
      const output2 = await millingNeuralCognitiveEngine.process(input);

      expect(output1.recommendation.parameters.rpm).toBe(output2.recommendation.parameters.rpm);
      expect(output1.recommendation.strategy).toBe(output2.recommendation.strategy);
    });

    it("quickProcess is deterministic", () => {
      const input: CognitiveInput = {
        query: "Deterministic test",
        intent: "recommend",
        material_iso: "P",
      };

      const result1 = millingNeuralCognitiveEngine.quickProcess(input);
      const result2 = millingNeuralCognitiveEngine.quickProcess(input);

      expect(result1.recommendation.rpm).toBe(result2.recommendation.rpm);
      expect(result1.confidence).toBe(result2.confidence);
    });
  });
});
