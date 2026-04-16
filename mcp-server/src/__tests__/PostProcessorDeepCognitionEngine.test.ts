/**
 * PostProcessorDeepCognitionEngine Tests
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorDeepCognitionEngine,
  CASE_LIBRARY,
  type CognitionProblem
} from "../engines/PostProcessorDeepCognitionEngine.js";

describe("PostProcessorDeepCognitionEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorDeepCognitionEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.cognitionModes).toBe(11);
      expect(stats.caseLibrarySize).toBeGreaterThan(5);
      expect(stats.maxReasoningDepth).toBeGreaterThan(5);
    });
  });

  describe("Deep Reasoning — Decision", () => {
    it("should reason about a decision problem", () => {
      const problem: CognitionProblem = {
        description: "Select roughing strategy for D2 tool steel on Haas VF-2",
        context: {
          controller: "Haas",
          material: "D2",
          machineType: "vmc-3axis",
          operations: ["roughing"]
        },
        goalType: "decision"
      };

      const result = postProcessorDeepCognitionEngine.reason(problem);

      expect(result.reasoningTrace.length).toBeGreaterThan(4);
      expect(result.primaryConclusion).toBeDefined();
      expect(result.alternatives.length).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it("should generate alternatives for decision", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Roughing strategy",
        context: { material: "steel" },
        goalType: "decision"
      });

      expect(result.alternatives.length).toBeGreaterThan(2);
      expect(result.alternatives.some(a => a.option.toLowerCase().includes("conservative"))).toBe(true);
    });
  });

  describe("Deep Reasoning — Diagnosis", () => {
    it("should reason about a diagnosis problem", () => {
      const problem: CognitionProblem = {
        description: "Chatter during finish pass on Haas with D2 steel",
        context: {
          controller: "Haas",
          material: "D2",
          operations: ["finishing"]
        },
        goalType: "diagnosis"
      };

      const result = postProcessorDeepCognitionEngine.reason(problem);

      expect(result.reasoningTrace.some(s => s.mode === "chain-of-thought")).toBe(true);
      expect(result.alternatives.some(a => a.option.toLowerCase().includes("hypothesis"))).toBe(true);
    });

    it("should consider multiple hypotheses", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Tool breakage",
        context: { material: "D2" },
        goalType: "diagnosis"
      });

      const hypotheses = result.alternatives.filter(a =>
        a.option.toLowerCase().includes("primary") ||
        a.option.toLowerCase().includes("secondary") ||
        a.option.toLowerCase().includes("environmental")
      );
      expect(hypotheses.length).toBeGreaterThan(1);
    });
  });

  describe("Deep Reasoning — Optimization", () => {
    it("should reason about optimization", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Optimize cycle time for high-volume production",
        context: { material: "aluminum", operations: ["roughing", "finishing"] },
        goalType: "optimization"
      });

      expect(result.alternatives.length).toBeGreaterThanOrEqual(3);
      expect(result.alternatives.some(a =>
        a.option.toLowerCase().includes("time") ||
        a.option.toLowerCase().includes("tool life") ||
        a.option.toLowerCase().includes("balanced")
      )).toBe(true);
    });
  });

  describe("Case Library", () => {
    it("should have known cases", () => {
      expect(CASE_LIBRARY.length).toBeGreaterThan(5);
    });

    it("should include Hurco G05.3 case", () => {
      const hurco = postProcessorDeepCognitionEngine.getCase("case-001-hurco-g053");
      expect(hurco).toBeDefined();
      expect(hurco?.lesson).toContain("G05.3");
    });

    it("should include Okuma ALARM-D case", () => {
      const okuma = postProcessorDeepCognitionEngine.getCase("case-002-okuma-alarm-d");
      expect(okuma).toBeDefined();
      expect(okuma?.solution).toContain("G20 HP=1");
    });

    it("should include D2 tool failure case", () => {
      const d2 = postProcessorDeepCognitionEngine.getCase("case-003-d2-tool-failure");
      expect(d2).toBeDefined();
      expect(d2?.lesson).toContain("CBN");
    });

    it("should include graphite case", () => {
      const graphite = postProcessorDeepCognitionEngine.getCase("case-004-graphite-dust");
      expect(graphite?.solution).toContain("dust");
    });

    it("should include titanium case", () => {
      const ti = postProcessorDeepCognitionEngine.getCase("case-005-ti-work-hardening");
      expect(ti?.lesson).toContain("continuously");
    });

    it("should include 5-axis collision case", () => {
      const fiveAx = postProcessorDeepCognitionEngine.getCase("case-006-5ax-trunnion-collision");
      expect(fiveAx).toBeDefined();
    });

    it("should search cases by keyword", () => {
      const ssTips = postProcessorDeepCognitionEngine.searchCases("chatter");
      expect(ssTips.length).toBeGreaterThan(0);

      const graphite = postProcessorDeepCognitionEngine.searchCases("graphite");
      expect(graphite.length).toBeGreaterThan(0);
    });

    it("should handle unknown case ID", () => {
      expect(postProcessorDeepCognitionEngine.getCase("unknown")).toBeUndefined();
    });
  });

  describe("Analogical Reasoning", () => {
    it("should find analogies for similar problems", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Chatter on Hurco WinMAX during finish pass",
        context: { controller: "Hurco", operations: ["finishing"] },
        goalType: "diagnosis"
      });

      expect(result.analogies.length).toBeGreaterThan(0);
    });

    it("should find graphite case for graphite problem", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Machining graphite electrode with dust",
        context: { material: "graphite" },
        goalType: "diagnosis"
      });

      expect(result.analogies.some(a => a.analogousCase.toLowerCase().includes("graphite"))).toBe(true);
    });
  });

  describe("Symptom-Based Diagnosis", () => {
    it("should diagnose from symptoms", () => {
      const results = postProcessorDeepCognitionEngine.diagnose(["chatter", "finish", "Hurco"]);
      expect(results.length).toBeGreaterThan(0);
      expect(results[0].applicability).toBeDefined();
    });

    it("should rank by match score", () => {
      const results = postProcessorDeepCognitionEngine.diagnose(["ALARM-D", "Okuma"]);
      if (results.length > 1) {
        expect(results[0].matchScore).toBeGreaterThanOrEqual(results[1].matchScore);
      }
    });

    it("should return applicability labels", () => {
      const results = postProcessorDeepCognitionEngine.diagnose(["chatter"]);
      expect(results.every(r => ["strong", "moderate", "weak", "none"].includes(r.applicability))).toBe(true);
    });

    it("should handle no-match symptoms", () => {
      const results = postProcessorDeepCognitionEngine.diagnose(["completely_unrelated_xyz_symptom"]);
      expect(results).toEqual([]);
    });
  });

  describe("Uncertainty Quantification", () => {
    it("should identify data gaps", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Problem without material specified",
        context: {},
        goalType: "decision"
      });

      expect(result.uncertainties.some(u => u.source === "data-gap")).toBe(true);
    });

    it("should provide mitigations", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Unspecified problem",
        context: {},
        goalType: "diagnosis"
      });

      for (const u of result.uncertainties) {
        expect(u.mitigation).toBeDefined();
        expect(u.mitigation.length).toBeGreaterThan(0);
      }
    });

    it("should flag model limits for unusual materials", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Machining ceramic composite",
        context: { material: "ceramic composite" },
        goalType: "decision"
      });

      expect(result.uncertainties.some(u => u.source === "model-limit")).toBe(true);
    });
  });

  describe("Meta-Cognition", () => {
    it("should reflect on reasoning quality", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Test reasoning depth",
        context: { material: "steel", controller: "Haas" },
        goalType: "decision"
      });

      expect(result.metaCognition.reasoningQuality).toBeGreaterThan(0);
      expect(result.metaCognition.reasoningQuality).toBeLessThanOrEqual(1);
    });

    it("should suggest improvements", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Simple problem",
        context: {},
        goalType: "decision"
      });

      expect(result.metaCognition.nextTimeImprovement).toBeDefined();
    });

    it("should identify potential biases", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Any problem",
        context: { material: "steel" },
        goalType: "decision"
      });

      expect(Array.isArray(result.metaCognition.potentialBiases)).toBe(true);
    });
  });

  describe("Explanation Generation", () => {
    it("should generate structured explanation", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Decision for material choice",
        context: { material: "D2", controller: "Haas", operations: ["roughing"] },
        goalType: "decision"
      });

      expect(result.explanation.summary).toBeDefined();
      expect(result.explanation.whyThisApproach).toBeDefined();
      expect(result.explanation.whyNotAlternatives.length).toBeGreaterThan(0);
      expect(result.explanation.humanInterpretation).toBeDefined();
    });

    it("should include supporting evidence", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Justify approach",
        context: { material: "steel" },
        goalType: "decision"
      });

      expect(result.explanation.supportingEvidence.length).toBeGreaterThan(0);
    });

    it("should include limitations", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Edge case",
        context: {},
        goalType: "decision"
      });

      expect(result.explanation.limitations.length).toBeGreaterThan(0);
    });

    it("should provide human interpretation", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Pocket milling setup",
        context: { material: "aluminum", controller: "Haas" },
        goalType: "design"
      });

      expect(result.explanation.humanInterpretation.length).toBeGreaterThan(20);
    });
  });

  describe("Reasoning Modes Coverage", () => {
    it("should use multiple cognition modes", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Complex problem",
        context: { material: "D2", controller: "Haas" },
        goalType: "decision"
      });

      const modes = new Set(result.reasoningTrace.map(s => s.mode));
      expect(modes.size).toBeGreaterThanOrEqual(4);
    });

    it("should include first-principles reasoning", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Any problem",
        context: { material: "steel" },
        goalType: "decision"
      });

      expect(result.reasoningTrace.some(s => s.mode === "first-principles")).toBe(true);
    });

    it("should include chain-of-thought", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Multi-step problem",
        context: { material: "titanium" },
        goalType: "decision"
      });

      expect(result.reasoningTrace.some(s => s.mode === "chain-of-thought")).toBe(true);
    });

    it("should include critique-refine", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Critical decision",
        context: { material: "steel" },
        goalType: "decision"
      });

      expect(result.reasoningTrace.some(s => s.mode === "critique-refine")).toBe(true);
    });

    it("should include counterfactual analysis", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Risky decision",
        context: { material: "D2" },
        goalType: "decision"
      });

      expect(result.reasoningTrace.some(s => s.mode === "counterfactual")).toBe(true);
    });
  });

  describe("Confidence Scoring", () => {
    it("should produce confidence score 0-1", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Confidence test",
        context: { material: "steel" },
        goalType: "decision"
      });

      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it("should have lower confidence for ambiguous problems", () => {
      const clear = postProcessorDeepCognitionEngine.reason({
        description: "Standard steel milling",
        context: {
          material: "steel",
          controller: "Haas",
          operations: ["roughing"],
          machineType: "vmc-3axis"
        },
        goalType: "decision"
      });

      const ambiguous = postProcessorDeepCognitionEngine.reason({
        description: "Exotic material",
        context: { material: "ceramic composite" },
        goalType: "decision"
      });

      // Ambiguous case should have more uncertainties
      expect(ambiguous.uncertainties.length).toBeGreaterThanOrEqual(clear.uncertainties.length);
    });
  });

  describe("AI Context", () => {
    it("should generate AI context", () => {
      const context = postProcessorDeepCognitionEngine.getContextForAI();

      expect(context).toContain("DEEP COGNITION");
      expect(context).toContain("chain-of-thought");
      expect(context).toContain("analogical");
      expect(context).toContain("meta-cognitive");
      expect(context).toContain("API METHODS");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty context", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Empty context test",
        context: {},
        goalType: "decision"
      });

      expect(result).toBeDefined();
      expect(result.uncertainties.length).toBeGreaterThan(0);
    });

    it("should handle all goal types", () => {
      const types: Array<CognitionProblem["goalType"]> = [
        "decision", "diagnosis", "design", "optimization", "explanation"
      ];

      for (const goalType of types) {
        const result = postProcessorDeepCognitionEngine.reason({
          description: `Test ${goalType}`,
          context: { material: "steel" },
          goalType
        });

        expect(result).toBeDefined();
        expect(result.alternatives.length).toBeGreaterThan(0);
      }
    });

    it("should handle unknown material gracefully", () => {
      const result = postProcessorDeepCognitionEngine.reason({
        description: "Unknown material",
        context: { material: "unobtanium-xyz" },
        goalType: "decision"
      });

      expect(result.confidenceScore).toBeGreaterThan(0);
    });
  });
});
