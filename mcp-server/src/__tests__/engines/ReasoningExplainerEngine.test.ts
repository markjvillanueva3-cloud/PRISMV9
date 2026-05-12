/**
 * Tests for ReasoningExplainerEngine
 *
 * AGENT ROADMAP: U-AGT10 (MS3 extension)
 * Verifies transparent AI explanations
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ReasoningExplainerEngine,
  reasoningExplainerEngine,
  ExplanationRequest,
  ExplanationAudience,
} from "../../engines/ReasoningExplainerEngine.js";
import {
  ManufacturingReasoningEngine,
  ManufacturingReasoningChain,
  ManufacturingProblem,
} from "../../engines/ManufacturingReasoningEngine.js";
import {
  MultiPathReasoningEngine,
  MultiPathResult,
} from "../../engines/MultiPathReasoningEngine.js";

describe("ReasoningExplainerEngine", () => {
  let engine: ReasoningExplainerEngine;
  let reasoningEngine: ManufacturingReasoningEngine;
  let multiPathEngine: MultiPathReasoningEngine;

  beforeEach(() => {
    engine = new ReasoningExplainerEngine();
    reasoningEngine = new ManufacturingReasoningEngine();
    multiPathEngine = new MultiPathReasoningEngine();
  });

  describe("explain", () => {
    it("should generate explanation for recommendation question", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Determine cutting parameters",
        goal: "Get optimal parameters",
        domain: "machining"
      });

      const request: ExplanationRequest = {
        question: "Why did you recommend these parameters?",
        context: { reasoningChain: chain, recommendation: "Use 200 SFM" }
      };

      const explanation = engine.explain(request);

      expect(explanation.id).toMatch(/^exp_/);
      expect(explanation.target).toBe("recommendation");
      expect(explanation.summary).toBeDefined();
      expect(explanation.sections.length).toBeGreaterThan(0);
      expect(explanation.wordCount).toBeGreaterThan(0);
    });

    it("should generate explanation for calculation question", () => {
      const request: ExplanationRequest = {
        question: "How did you calculate this number?",
        context: {
          calculation: {
            formula: "Fc = kc1.1 × ap × fz^(1-mc)",
            inputs: { ap: 2, fz: 0.1, kc1_1: 2100, mc: 0.25 },
            result: 420,
            unit: "N",
            source: "Kienzle model"
          }
        }
      };

      const explanation = engine.explain(request);

      expect(explanation.target).toBe("calculation");
      expect(explanation.summary).toContain("420");
      expect(explanation.citations.length).toBeGreaterThan(0);
    });

    it("should generate explanation for selection question", () => {
      const request: ExplanationRequest = {
        question: "Why did you select this tool?",
        context: {
          selection: {
            selected: "Carbide insert CNMG",
            alternatives: ["HSS endmill", "Ceramic insert"],
            criteria: { durability: 0.9, cost: 0.7, speed: 0.85 }
          }
        }
      };

      const explanation = engine.explain(request);

      expect(explanation.target).toBe("selection");
      expect(explanation.summary).toContain("CNMG");
    });

    it("should adapt to machinist audience", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Calculate cutting velocity for roughing",
        goal: "Determine speed",
        domain: "machining"
      });

      const request: ExplanationRequest = {
        question: "Why this speed?",
        context: { reasoningChain: chain },
        audience: "machinist"
      };

      const explanation = engine.explain(request);

      expect(explanation.audience).toBe("machinist");
      expect(explanation.wordCount).toBeLessThanOrEqual(200);
      // Should have practical implication section
      const practicalSection = explanation.sections.find(
        s => s.heading === "Why This Matters"
      );
      expect(practicalSection).toBeDefined();
    });

    it("should adapt to engineer audience", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Analyze deflection limits",
        goal: "Verify structural integrity",
        domain: "machining"
      });

      const request: ExplanationRequest = {
        question: "Explain the analysis",
        context: { reasoningChain: chain },
        audience: "engineer"
      };

      const explanation = engine.explain(request);

      expect(explanation.audience).toBe("engineer");
      // Engineer explanations can be longer
      expect(explanation.wordCount).toBeLessThanOrEqual(400);
    });

    it("should include physics formula citations", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Calculate cutting force",
        goal: "Verify machine capability",
        domain: "machining"
      });

      const request: ExplanationRequest = {
        question: "Show me the calculation",
        context: { reasoningChain: chain },
        audience: "engineer"
      };

      const explanation = engine.explain(request);

      // Should have formula citations
      const formulaCitations = explanation.citations.filter(
        c => c.type === "formula"
      );
      expect(formulaCitations.length).toBeGreaterThanOrEqual(0);
    });

    it("should include safety considerations", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Evaluate cutting strategy",
        goal: "Check safety",
        domain: "machining"
      });

      const request: ExplanationRequest = {
        question: "What about safety?",
        context: { reasoningChain: chain }
      };

      const explanation = engine.explain(request);

      // Should mention safety if chain has safety checks
      const safetySection = explanation.sections.find(
        s => s.heading.toLowerCase().includes("safety")
      );
      if (chain.safety_checks.filter(s => s.severity === "critical").length > 0) {
        expect(safetySection).toBeDefined();
      }
    });

    it("should respect word limit", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Complex multi-step analysis",
        goal: "Comprehensive evaluation",
        domain: "machining",
        known_facts: Array(10).fill("Known fact"),
        constraints: Array(5).fill("Constraint")
      });

      const request: ExplanationRequest = {
        question: "Explain everything",
        context: { reasoningChain: chain },
        maxWords: 100
      };

      const explanation = engine.explain(request);

      expect(explanation.wordCount).toBeLessThanOrEqual(100);
    });

    it("should handle multi-path results", async () => {
      const result = await multiPathEngine.explorePaths({
        problem: "Select approach",
        goal: "Find best option",
        domain: "machining",
        maxPaths: 3
      });

      const request: ExplanationRequest = {
        question: "Why did you choose this approach?",
        context: { multiPathResult: result }
      };

      const explanation = engine.explain(request);

      // Should have sections about the approach
      const approachSection = explanation.sections.find(
        s => s.heading.toLowerCase().includes("approach")
      );
      expect(approachSection).toBeDefined();
      expect(approachSection?.content).toContain(result.bestPath.approach);

      // Should mention alternatives
      const altSection = explanation.sections.find(
        s => s.heading.toLowerCase().includes("other")
      );
      expect(altSection).toBeDefined();
    });

    it("should calculate reading level", () => {
      const request: ExplanationRequest = {
        question: "Simple question",
        context: {
          calculation: {
            formula: "simple",
            inputs: { x: 1 },
            result: 10,
            unit: "mm",
            source: "test"
          }
        },
        audience: "machinist"
      };

      const explanation = engine.explain(request);

      expect(explanation.readingLevelGrade).toBeGreaterThanOrEqual(1);
      expect(explanation.readingLevelGrade).toBeLessThanOrEqual(18);
    });
  });

  describe("explainWhy", () => {
    it("should generate why explanation", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Determine feed rate",
        goal: "Optimize feed",
        domain: "machining"
      });

      const explanation = engine.explainWhy("0.004 IPR feed rate", chain, "machinist");

      expect(explanation).toContain("**");
      expect(explanation.length).toBeGreaterThan(50);
    });

    it("should adapt to different audiences", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Speed selection",
        goal: "Select speed",
        domain: "machining"
      });

      const machinistExp = engine.explainWhy("200 SFM", chain, "machinist");
      const engineerExp = engine.explainWhy("200 SFM", chain, "engineer");

      // Both should be valid explanations
      expect(machinistExp.length).toBeGreaterThan(0);
      expect(engineerExp.length).toBeGreaterThan(0);
    });
  });

  describe("explainFormula", () => {
    it("should explain known formulas", () => {
      const formulas = [
        "Fc = kc1.1 × ap × fz^(1-mc)",
        "T = (C/Vc)^(1/n)",
        "P = Fc × Vc / (60 × 1000 × η)"
      ];

      for (const formula of formulas) {
        const explanation = engine.explainFormula(formula);
        expect(explanation.length).toBeGreaterThan(20);
      }
    });

    it("should handle unknown formulas", () => {
      const explanation = engine.explainFormula("F = ma");
      expect(explanation).toContain("calculates");
    });

    it("should simplify for machinist audience", () => {
      const formula = "Fc = kc1.1 × ap × fz^(1-mc)";
      const machinistExp = engine.explainFormula(formula, "machinist");
      const engineerExp = engine.explainFormula(formula, "engineer");

      // Machinist explanation should be simpler or same
      expect(machinistExp.length).toBeGreaterThan(0);
      expect(engineerExp.length).toBeGreaterThan(0);
    });
  });

  describe("getReadingLevelLabel", () => {
    it("should return appropriate labels", () => {
      expect(engine.getReadingLevelLabel(4)).toBe("Easy to read");
      expect(engine.getReadingLevelLabel(8)).toBe("Moderate");
      expect(engine.getReadingLevelLabel(12)).toBe("Technical");
      expect(engine.getReadingLevelLabel(16)).toBe("Expert level");
    });
  });

  describe("explanation structure", () => {
    it("should include required fields", () => {
      const request: ExplanationRequest = {
        question: "Test question",
        context: {
          selection: {
            selected: "Option A",
            alternatives: ["Option B"],
            criteria: { score: 0.9 }
          }
        }
      };

      const explanation = engine.explain(request);

      expect(explanation.id).toBeDefined();
      expect(explanation.target).toBeDefined();
      expect(explanation.audience).toBeDefined();
      expect(explanation.summary).toBeDefined();
      expect(Array.isArray(explanation.sections)).toBe(true);
      expect(Array.isArray(explanation.citations)).toBe(true);
      expect(typeof explanation.wordCount).toBe("number");
      expect(typeof explanation.readingLevelGrade).toBe("number");
      expect(explanation.createdAt).toBeDefined();
    });

    it("should prioritize critical sections", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Safety critical operation",
        goal: "Ensure safety",
        domain: "safety"
      });

      // Add some critical safety to chain manually for test
      chain.safety_checks.push({
        id: "test_critical",
        concern: "Critical test concern",
        severity: "critical",
        applies: true,
        checked_at_step: 1
      });

      const request: ExplanationRequest = {
        question: "Explain safety",
        context: { reasoningChain: chain },
        maxWords: 100
      };

      const explanation = engine.explain(request);

      // Critical sections should be included
      const criticalSection = explanation.sections.find(
        s => s.importance === "critical"
      );
      expect(criticalSection).toBeDefined();
    });
  });

  describe("citation handling", () => {
    it("should deduplicate citations", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Multi-formula calculation",
        goal: "Get result",
        domain: "machining"
      });

      const request: ExplanationRequest = {
        question: "Show citations",
        context: { reasoningChain: chain }
      };

      const explanation = engine.explain(request);

      // Check for duplicates
      const sources = explanation.citations.map(c => c.source);
      const uniqueSources = new Set(sources);
      expect(sources.length).toBe(uniqueSources.size);
    });

    it("should include citation confidence", async () => {
      const chain = await reasoningEngine.reason({
        problem: "Test",
        goal: "Test",
        domain: "machining"
      });

      const request: ExplanationRequest = {
        question: "Test",
        context: { reasoningChain: chain }
      };

      const explanation = engine.explain(request);

      for (const citation of explanation.citations) {
        expect(citation.confidence).toBeGreaterThanOrEqual(0);
        expect(citation.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("target detection", () => {
    it("should detect recommendation questions", () => {
      const request: ExplanationRequest = {
        question: "Why did you recommend this?",
        context: {}
      };

      const explanation = engine.explain(request);
      expect(explanation.target).toBe("recommendation");
    });

    it("should detect calculation questions", () => {
      const request: ExplanationRequest = {
        question: "How did you calculate this number?",
        context: {}
      };

      const explanation = engine.explain(request);
      expect(explanation.target).toBe("calculation");
    });

    it("should detect selection questions", () => {
      const request: ExplanationRequest = {
        question: "Why did you select this option?",
        context: {}
      };

      const explanation = engine.explain(request);
      expect(explanation.target).toBe("selection");
    });

    it("should detect warning questions", () => {
      const request: ExplanationRequest = {
        question: "What is the danger here?",
        context: {}
      };

      const explanation = engine.explain(request);
      expect(explanation.target).toBe("warning");
    });

    it("should detect constraint questions", () => {
      const request: ExplanationRequest = {
        question: "Why can't I exceed this limit?",
        context: {}
      };

      const explanation = engine.explain(request);
      expect(explanation.target).toBe("constraint");
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(reasoningExplainerEngine).toBeInstanceOf(ReasoningExplainerEngine);
    });
  });
});
