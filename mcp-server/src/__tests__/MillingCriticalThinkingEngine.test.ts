/**
 * Tests for MillingCriticalThinkingEngine
 * Validates Claude Opus-level critical thinking for milling.
 */
import { describe, it, expect } from "vitest";
import {
  MillingCriticalThinkingEngine,
  millingCriticalThinkingEngine,
  type CriticalThinkingRequest,
  type ReasoningMode,
} from "../engines/MillingCriticalThinkingEngine.js";

describe("MillingCriticalThinkingEngine", () => {
  // ============================================================================
  // INITIALIZATION
  // ============================================================================

  describe("initialization", () => {
    it("exports singleton instance", () => {
      expect(millingCriticalThinkingEngine).toBeDefined();
      expect(millingCriticalThinkingEngine).toBeInstanceOf(MillingCriticalThinkingEngine);
    });

    it("can instantiate new engine instances", () => {
      const engine = new MillingCriticalThinkingEngine();
      expect(engine).toBeInstanceOf(MillingCriticalThinkingEngine);
    });
  });

  // ============================================================================
  // ANALYZE METHOD
  // ============================================================================

  describe("analyze()", () => {
    it("returns complete CriticalThinkingResponse", async () => {
      const request: CriticalThinkingRequest = {
        problem: "How to optimize roughing parameters for 4140 steel?",
        domain: "parameters",
        material_iso: "P",
        operation: "roughing",
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.request_id).toMatch(/^CRITICAL-/);
      expect(response.timestamp).toBeDefined();
      expect(response.problem).toBe(request.problem);
      expect(response.domain).toBe("parameters");
      expect(response.reasoning_paths.length).toBeGreaterThan(0);
      expect(response.decision).toBeDefined();
      expect(response.confidence).toBeGreaterThan(0);
    });

    it("generates multiple reasoning paths", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Should we increase cutting speed?",
        domain: "parameters",
        reasoning_modes: ["deductive", "inductive", "causal"],
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.reasoning_paths.length).toBe(3);
      const modes = response.reasoning_paths.map(p => p.mode);
      expect(modes).toContain("deductive");
      expect(modes).toContain("inductive");
      expect(modes).toContain("causal");
    });

    it("generates counterfactuals when enabled", async () => {
      const request: CriticalThinkingRequest = {
        problem: "What parameters should we use?",
        domain: "parameters",
        include_counterfactuals: true,
        current_parameters: {
          rpm: 3000,
          feed_mm_min: 500,
          doc_mm: 5,
          tool_diameter_mm: 10,
        },
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.counterfactuals.length).toBeGreaterThan(0);
      for (const cf of response.counterfactuals) {
        expect(cf.scenario).toBeDefined();
        expect(cf.predicted_outcome).toBeDefined();
        expect(["low", "medium", "high"]).toContain(cf.risk_level);
        expect(cf.confidence).toBeGreaterThan(0);
      }
    });

    it("assesses risks when enabled", async () => {
      const request: CriticalThinkingRequest = {
        problem: "How to machine hardened D2?",
        domain: "parameters",
        material_iso: "H",
        hardness_hrc: 58,
        include_risk_analysis: true,
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.risks.length).toBeGreaterThan(0);
      for (const risk of response.risks) {
        expect(risk.risk_factor).toBeDefined();
        expect(risk.probability).toBeGreaterThanOrEqual(0);
        expect(risk.probability).toBeLessThanOrEqual(1);
        expect(["minor", "moderate", "severe", "critical"]).toContain(risk.impact);
        expect(risk.mitigation).toBeDefined();
      }
    });

    it("analyzes trade-offs", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Speed vs quality trade-off?",
        domain: "parameters",
        operation: "roughing",
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.trade_offs.length).toBeGreaterThan(0);
      for (const tradeOff of response.trade_offs) {
        expect(tradeOff.option_a).toBeDefined();
        expect(tradeOff.option_b).toBeDefined();
        expect(tradeOff.criteria).toBeDefined();
        expect(["a", "b", "tie"]).toContain(tradeOff.winner);
        expect(tradeOff.explanation).toBeDefined();
      }
    });

    it("synthesizes final decision", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Best approach for finishing operation?",
        domain: "parameters",
        operation: "finishing",
        constraints: {
          surface_finish_ra: 0.8,
        },
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.decision.recommendation).toBeDefined();
      expect(response.decision.confidence).toBeGreaterThan(0);
      expect(response.decision.reasoning_summary).toBeDefined();
      expect(Array.isArray(response.decision.key_factors)).toBe(true);
      expect(Array.isArray(response.decision.risks)).toBe(true);
      expect(Array.isArray(response.decision.alternatives)).toBe(true);
    });
  });

  // ============================================================================
  // QUICK ANALYZE METHOD
  // ============================================================================

  describe("quickAnalyze()", () => {
    it("returns quick recommendation", () => {
      const request: CriticalThinkingRequest = {
        problem: "Parameters for 4140 steel?",
        domain: "parameters",
        material_iso: "P",
        operation: "roughing",
      };

      const result = millingCriticalThinkingEngine.quickAnalyze(request);

      expect(result.recommendation).toBeDefined();
      expect(result.reasoning).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.top_risk).toBeDefined();
    });

    it("provides material-specific recommendations", () => {
      const aluminumRequest: CriticalThinkingRequest = {
        problem: "Parameters for aluminum?",
        domain: "parameters",
        material_iso: "N",
      };

      const titaniumRequest: CriticalThinkingRequest = {
        problem: "Parameters for titanium?",
        domain: "parameters",
        material_iso: "S",
      };

      const aluminumResult = millingCriticalThinkingEngine.quickAnalyze(aluminumRequest);
      const titaniumResult = millingCriticalThinkingEngine.quickAnalyze(titaniumRequest);

      expect(aluminumResult.recommendation.toLowerCase()).toContain("high speed");
      expect(titaniumResult.recommendation.toLowerCase()).toContain("reduce");
    });

    it("handles hardened materials", () => {
      const request: CriticalThinkingRequest = {
        problem: "Parameters for hardened steel?",
        domain: "parameters",
        material_iso: "H",
        hardness_hrc: 55,
      };

      const result = millingCriticalThinkingEngine.quickAnalyze(request);

      expect(result.recommendation.toLowerCase()).toContain("hard") ||
        expect(result.recommendation.toLowerCase()).toContain("reduced");
    });
  });

  // ============================================================================
  // ROOT CAUSE ANALYSIS
  // ============================================================================

  describe("rootCauseAnalysis()", () => {
    it("analyzes chatter symptoms", () => {
      const result = millingCriticalThinkingEngine.rootCauseAnalysis(
        "Chatter marks on surface",
        { material_iso: "P", operation: "finishing" }
      );

      expect(result.probable_causes.length).toBeGreaterThan(0);
      expect(result.probable_causes[0].probability).toBeGreaterThan(0);
      expect(result.recommended_investigation.length).toBeGreaterThan(0);
      expect(result.immediate_actions.length).toBeGreaterThan(0);

      // Should identify common chatter causes
      const causeNames = result.probable_causes.map(c => c.cause.toLowerCase());
      expect(causeNames.some(c => c.includes("engagement") || c.includes("overhang") || c.includes("speed"))).toBe(true);
    });

    it("analyzes tool wear symptoms", () => {
      const result = millingCriticalThinkingEngine.rootCauseAnalysis(
        "Excessive tool wear",
        { material_iso: "H", operation: "roughing" }
      );

      expect(result.probable_causes.length).toBeGreaterThan(0);
      const causeNames = result.probable_causes.map(c => c.cause.toLowerCase());
      expect(causeNames.some(c => c.includes("speed") || c.includes("cooling") || c.includes("coating"))).toBe(true);
    });

    it("analyzes surface finish symptoms", () => {
      const result = millingCriticalThinkingEngine.rootCauseAnalysis(
        "Poor surface finish",
        { material_iso: "N", operation: "finishing" }
      );

      expect(result.probable_causes.length).toBeGreaterThan(0);
      const causeNames = result.probable_causes.map(c => c.cause.toLowerCase());
      expect(causeNames.some(c => c.includes("feed") || c.includes("runout") || c.includes("built-up"))).toBe(true);
    });

    it("sorts causes by probability", () => {
      const result = millingCriticalThinkingEngine.rootCauseAnalysis(
        "Vibration during machining",
        {}
      );

      for (let i = 1; i < result.probable_causes.length; i++) {
        expect(result.probable_causes[i - 1].probability).toBeGreaterThanOrEqual(
          result.probable_causes[i].probability
        );
      }
    });
  });

  // ============================================================================
  // WHAT-IF ANALYSIS
  // ============================================================================

  describe("whatIf()", () => {
    it("predicts effects of RPM change", () => {
      const result = millingCriticalThinkingEngine.whatIf(
        { rpm: 3000, feed: 500, doc: 5 },
        { parameter: "rpm", delta_percent: 20 },
        { material_iso: "P" }
      );

      expect(result.predicted_effects.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);

      // Should include tool life prediction
      const effects = result.predicted_effects.map(e => e.metric.toLowerCase());
      expect(effects.some(e => e.includes("tool life") || e.includes("surface"))).toBe(true);
    });

    it("predicts effects of feed change", () => {
      const result = millingCriticalThinkingEngine.whatIf(
        { rpm: 3000, feed: 500, doc: 5 },
        { parameter: "feed", delta_percent: -30 },
        { material_iso: "P", operation: "finishing" }
      );

      expect(result.predicted_effects.length).toBeGreaterThan(0);

      // Should predict surface finish improvement with lower feed
      const surfaceEffect = result.predicted_effects.find(e =>
        e.metric.toLowerCase().includes("surface")
      );
      expect(surfaceEffect?.direction).toBe("decrease"); // Ra decreases = better finish
    });

    it("predicts effects of DOC change", () => {
      const result = millingCriticalThinkingEngine.whatIf(
        { rpm: 3000, feed: 500, doc: 5 },
        { parameter: "doc", delta_percent: 50 },
        { material_iso: "P", operation: "roughing" }
      );

      expect(result.predicted_effects.length).toBeGreaterThan(0);

      // Should predict MRR increase
      const mrrEffect = result.predicted_effects.find(e =>
        e.metric.toLowerCase().includes("mrr")
      );
      expect(mrrEffect?.direction).toBe("increase");
    });

    it("generates warnings for large changes", () => {
      const largeRpmChange = millingCriticalThinkingEngine.whatIf(
        { rpm: 3000, feed: 500, doc: 5 },
        { parameter: "rpm", delta_percent: 50 },
        {}
      );

      expect(largeRpmChange.warnings.length).toBeGreaterThan(0);

      const largeDocChange = millingCriticalThinkingEngine.whatIf(
        { rpm: 3000, feed: 500, doc: 5 },
        { parameter: "doc", delta_percent: 100 },
        {}
      );

      expect(largeDocChange.warnings.length).toBeGreaterThan(0);
    });

    it("adjusts confidence for difficult materials", () => {
      const steelResult = millingCriticalThinkingEngine.whatIf(
        { rpm: 3000, feed: 500, doc: 5 },
        { parameter: "rpm", delta_percent: 20 },
        { material_iso: "P" }
      );

      const titaniumResult = millingCriticalThinkingEngine.whatIf(
        { rpm: 3000, feed: 500, doc: 5 },
        { parameter: "rpm", delta_percent: 20 },
        { material_iso: "S" }
      );

      expect(titaniumResult.confidence).toBeLessThan(steelResult.confidence);
    });
  });

  // ============================================================================
  // REASONING MODES
  // ============================================================================

  describe("reasoning modes", () => {
    it("generates deductive reasoning", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Test deductive reasoning",
        domain: "parameters",
        reasoning_modes: ["deductive"],
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.reasoning_paths.length).toBe(1);
      expect(response.reasoning_paths[0].mode).toBe("deductive");
      expect(response.reasoning_paths[0].steps.length).toBeGreaterThan(0);
      expect(response.reasoning_paths[0].confidence).toBeGreaterThan(0.7);
    });

    it("generates inductive reasoning", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Test inductive reasoning",
        domain: "parameters",
        reasoning_modes: ["inductive"],
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.reasoning_paths[0].mode).toBe("inductive");
      expect(response.reasoning_paths[0].steps.some(s =>
        s.toLowerCase().includes("pattern") || s.toLowerCase().includes("observation")
      )).toBe(true);
    });

    it("generates causal reasoning", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Test causal reasoning",
        domain: "parameters",
        reasoning_modes: ["causal"],
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.reasoning_paths[0].mode).toBe("causal");
      expect(response.reasoning_paths[0].steps.some(s =>
        s.toLowerCase().includes("causal") || s.toLowerCase().includes("cause")
      )).toBe(true);
    });

    it("generates abductive reasoning", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Why did the tool fail?",
        domain: "general",
        reasoning_modes: ["abductive"],
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.reasoning_paths[0].mode).toBe("abductive");
      expect(response.reasoning_paths[0].steps.some(s =>
        s.toLowerCase().includes("explanation")
      )).toBe(true);
    });

    it("generates analogical reasoning", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Similar to previous job",
        domain: "parameters",
        reasoning_modes: ["analogical"],
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.reasoning_paths[0].mode).toBe("analogical");
      expect(response.reasoning_paths[0].steps.some(s =>
        s.toLowerCase().includes("similar") || s.toLowerCase().includes("analog")
      )).toBe(true);
    });

    it("generates counterfactual reasoning", async () => {
      const request: CriticalThinkingRequest = {
        problem: "What if we had done differently?",
        domain: "parameters",
        reasoning_modes: ["counterfactual"],
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.reasoning_paths[0].mode).toBe("counterfactual");
      expect(response.reasoning_paths[0].steps.some(s =>
        s.toLowerCase().includes("alternative") || s.toLowerCase().includes("imagin")
      )).toBe(true);
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles minimal request", async () => {
      const request: CriticalThinkingRequest = {
        problem: "General question",
        domain: "general",
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response).toBeDefined();
      expect(response.reasoning_paths.length).toBeGreaterThan(0);
      expect(response.decision).toBeDefined();
    });

    it("handles all reasoning modes at once", async () => {
      const allModes: ReasoningMode[] = ["deductive", "inductive", "abductive", "analogical", "causal", "counterfactual"];
      const request: CriticalThinkingRequest = {
        problem: "Comprehensive analysis",
        domain: "parameters",
        reasoning_modes: allModes,
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.reasoning_paths.length).toBe(6);
    });

    it("handles disabled counterfactuals", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Test without counterfactuals",
        domain: "parameters",
        include_counterfactuals: false,
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.counterfactuals.length).toBe(0);
    });

    it("handles disabled risk analysis", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Test without risk analysis",
        domain: "parameters",
        include_risk_analysis: false,
      };

      const response = await millingCriticalThinkingEngine.analyze(request);

      expect(response.risks.length).toBe(0);
    });
  });

  // ============================================================================
  // PERFORMANCE
  // ============================================================================

  describe("performance", () => {
    it("analyze completes quickly", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Performance test",
        domain: "parameters",
        reasoning_modes: ["deductive", "causal"],
      };

      const start = Date.now();
      const response = await millingCriticalThinkingEngine.analyze(request);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
      expect(response.computation_time_ms).toBeLessThan(50);
    });

    it("quickAnalyze is very fast", () => {
      const request: CriticalThinkingRequest = {
        problem: "Quick test",
        domain: "parameters",
      };

      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        millingCriticalThinkingEngine.quickAnalyze(request);
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });

    it("rootCauseAnalysis is fast", () => {
      const start = Date.now();
      for (let i = 0; i < 100; i++) {
        millingCriticalThinkingEngine.rootCauseAnalysis("chatter", {});
      }
      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(50);
    });
  });

  // ============================================================================
  // CONSISTENCY
  // ============================================================================

  describe("consistency", () => {
    it("analyze returns consistent results", async () => {
      const request: CriticalThinkingRequest = {
        problem: "Consistent test",
        domain: "parameters",
        material_iso: "P",
        reasoning_modes: ["deductive"],
      };

      const response1 = await millingCriticalThinkingEngine.analyze(request);
      const response2 = await millingCriticalThinkingEngine.analyze(request);

      expect(response1.reasoning_paths[0].mode).toBe(response2.reasoning_paths[0].mode);
      expect(response1.reasoning_paths[0].conclusion).toBe(response2.reasoning_paths[0].conclusion);
    });

    it("quickAnalyze is deterministic", () => {
      const request: CriticalThinkingRequest = {
        problem: "Deterministic test",
        domain: "parameters",
        material_iso: "P",
      };

      const result1 = millingCriticalThinkingEngine.quickAnalyze(request);
      const result2 = millingCriticalThinkingEngine.quickAnalyze(request);

      expect(result1.recommendation).toBe(result2.recommendation);
      expect(result1.confidence).toBe(result2.confidence);
    });
  });
});
