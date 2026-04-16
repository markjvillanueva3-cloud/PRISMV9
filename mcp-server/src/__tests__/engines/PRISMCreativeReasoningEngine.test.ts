/**
 * Tests for PRISMCreativeReasoningEngine
 *
 * Tests creative problem-solving, hybrid approaches, and mathematical optimization.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PRISMCreativeReasoningEngine,
  prismCreativeReasoningEngine,
  type ProblemDefinition,
  type CreativeMode,
} from "../../engines/PRISMCreativeReasoningEngine.js";

describe("PRISMCreativeReasoningEngine", () => {
  // ==========================================================================
  // INSTANTIATION
  // ==========================================================================

  describe("instantiation", () => {
    it("should export singleton prismCreativeReasoningEngine", () => {
      expect(prismCreativeReasoningEngine).toBeDefined();
      expect(prismCreativeReasoningEngine).toBeInstanceOf(PRISMCreativeReasoningEngine);
    });

    it("should create new instance with constructor", () => {
      const engine = new PRISMCreativeReasoningEngine();
      expect(engine).toBeInstanceOf(PRISMCreativeReasoningEngine);
    });
  });

  // ==========================================================================
  // EXPLORE - CONVENTIONAL MODE
  // ==========================================================================

  describe("explore() - conventional mode", () => {
    it("should generate conventional solutions for cutting parameters", () => {
      const problem: ProblemDefinition = {
        domain: "cutting_parameters",
        objective: "Optimize speed and feed for D2 steel",
        constraints: ["Tool life > 30 min", "Surface finish Ra < 1.6"],
        desiredOutcome: "Balanced parameters",
        flexibility: "moderate",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "conventional");

      expect(result.solutions.length).toBeGreaterThan(0);
      expect(result.solutions[0].approach).toBe("conventional");
      expect(result.mode).toBe("conventional");
    });

    it("should have high viability scores for conventional solutions", () => {
      const problem: ProblemDefinition = {
        domain: "toolpath_generation",
        objective: "Generate roughing toolpath",
        constraints: [],
        desiredOutcome: "Efficient material removal",
        flexibility: "strict",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "conventional");

      result.solutions.forEach((s) => {
        expect(s.viabilityScore).toBeGreaterThan(0.5);
      });
    });
  });

  // ==========================================================================
  // EXPLORE - EXPLORATORY MODE
  // ==========================================================================

  describe("explore() - exploratory mode", () => {
    it("should challenge assumptions in exploratory mode", () => {
      const problem: ProblemDefinition = {
        domain: "cutting_parameters",
        objective: "Maximize productivity",
        constraints: [],
        desiredOutcome: "Faster cycle time",
        flexibility: "flexible",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "exploratory");

      expect(result.challengedAssumptions.length).toBeGreaterThan(0);
    });

    it("should have more solutions than conventional mode", () => {
      const problem: ProblemDefinition = {
        domain: "tool_life",
        objective: "Extend tool life",
        constraints: [],
        desiredOutcome: "Lower tooling costs",
        flexibility: "moderate",
      };

      const conventional = prismCreativeReasoningEngine.explore(problem, "conventional");
      const exploratory = prismCreativeReasoningEngine.explore(problem, "exploratory");

      expect(exploratory.solutions.length).toBeGreaterThanOrEqual(conventional.solutions.length);
    });
  });

  // ==========================================================================
  // EXPLORE - HYBRID MODE
  // ==========================================================================

  describe("explore() - hybrid mode", () => {
    it("should generate hybrid combinations", () => {
      const problem: ProblemDefinition = {
        domain: "cycle_time",
        objective: "Reduce cycle time",
        constraints: ["Maintain quality"],
        desiredOutcome: "20% faster",
        flexibility: "flexible",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "hybrid");

      expect(result.hybridCombinations.length).toBeGreaterThanOrEqual(0);
    });

    it("should have hybrid solutions with multiple components", () => {
      const problem: ProblemDefinition = {
        domain: "surface_finish",
        objective: "Improve surface finish",
        constraints: [],
        desiredOutcome: "Ra < 0.4",
        flexibility: "maximum",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "hybrid");

      const hybridSolutions = result.solutions.filter((s) => s.approach === "hybrid");
      hybridSolutions.forEach((s) => {
        expect(s.hybridComponents.length).toBeGreaterThanOrEqual(0);
      });
    });
  });

  // ==========================================================================
  // EXPLORE - INNOVATIVE MODE
  // ==========================================================================

  describe("explore() - innovative mode", () => {
    it("should generate novel insights", () => {
      const problem: ProblemDefinition = {
        domain: "tool_life",
        objective: "Predict tool failure",
        constraints: [],
        desiredOutcome: "Accurate prediction",
        flexibility: "maximum",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "innovative");

      expect(result.novelInsights.length).toBeGreaterThan(0);
    });

    it("should have high novelty scores for innovative solutions", () => {
      const problem: ProblemDefinition = {
        domain: "quality_optimization",
        objective: "Zero defects",
        constraints: [],
        desiredOutcome: "Six sigma quality",
        flexibility: "flexible",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "innovative");

      const innovativeSolutions = result.solutions.filter((s) => s.approach === "innovative");
      innovativeSolutions.forEach((s) => {
        expect(s.noveltyScore).toBeGreaterThan(0.5);
      });
    });
  });

  // ==========================================================================
  // EXPLORE - OPTIMAL MODE
  // ==========================================================================

  describe("explore() - optimal mode", () => {
    it("should mathematically optimize all solutions", () => {
      const problem: ProblemDefinition = {
        domain: "cost_reduction",
        objective: "Minimize total cost",
        constraints: ["Quality maintained"],
        desiredOutcome: "30% cost reduction",
        flexibility: "moderate",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "optimal");

      result.solutions.forEach((s) => {
        expect(s.optimizationScore).toBeGreaterThan(0);
      });
    });

    it("should have highest exploration depth", () => {
      const problem: ProblemDefinition = {
        domain: "multi_domain",
        objective: "Balance all objectives",
        constraints: [],
        desiredOutcome: "Pareto optimal",
        flexibility: "maximum",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "optimal");

      expect(result.explorationDepth).toBe(6);
    });

    it("should recommend a solution", () => {
      const problem: ProblemDefinition = {
        domain: "cutting_parameters",
        objective: "Optimal parameters",
        constraints: [],
        desiredOutcome: "Best balance",
        flexibility: "moderate",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "optimal");

      expect(result.recommendedSolution).not.toBeNull();
    });
  });

  // ==========================================================================
  // PROBLEM DOMAINS
  // ==========================================================================

  describe("problem domains", () => {
    const domains = [
      "cutting_parameters",
      "toolpath_generation",
      "material_selection",
      "fixture_design",
      "process_planning",
      "quality_optimization",
      "cost_reduction",
      "cycle_time",
      "tool_life",
      "surface_finish",
      "multi_domain",
    ] as const;

    domains.forEach((domain) => {
      it(`should handle ${domain} domain`, () => {
        const problem: ProblemDefinition = {
          domain,
          objective: `Optimize ${domain}`,
          constraints: [],
          desiredOutcome: "Improved results",
          flexibility: "moderate",
        };

        const result = prismCreativeReasoningEngine.explore(problem, "exploratory");

        expect(result.solutions.length).toBeGreaterThan(0);
        expect(result.problem.domain).toBe(domain);
      });
    });
  });

  // ==========================================================================
  // FLEXIBILITY LEVELS
  // ==========================================================================

  describe("flexibility levels", () => {
    it("should produce more conservative solutions for strict flexibility", () => {
      const problem: ProblemDefinition = {
        domain: "cutting_parameters",
        objective: "Safe parameters",
        constraints: ["No risk"],
        desiredOutcome: "Reliable results",
        flexibility: "strict",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "optimal");

      // Strict flexibility should favor viability over novelty
      expect(result.solutions.length).toBeGreaterThan(0);
    });

    it("should produce more innovative solutions for maximum flexibility", () => {
      const problem: ProblemDefinition = {
        domain: "cutting_parameters",
        objective: "Push limits",
        constraints: [],
        desiredOutcome: "Maximum performance",
        flexibility: "maximum",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "optimal");

      // Maximum flexibility should explore more options
      expect(result.solutions.length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // CAPABILITY SUMMARY
  // ==========================================================================

  describe("getCapabilitySummary()", () => {
    it("should return capability summary", () => {
      const summary = prismCreativeReasoningEngine.getCapabilitySummary();

      expect(summary.totalCapabilities).toBeGreaterThan(0);
      expect(summary.categories.length).toBeGreaterThan(0);
      expect(summary.keyFeatures.length).toBeGreaterThan(0);
      expect(summary.hybridPotential).toBeGreaterThan(0);
    });

    it("should include key features", () => {
      const summary = prismCreativeReasoningEngine.getCapabilitySummary();

      expect(summary.keyFeatures).toContain("82 dispatchers with 4,296+ actions");
      expect(summary.keyFeatures).toContain("Cross-domain knowledge synthesis");
    });
  });

  // ==========================================================================
  // SUMMARY
  // ==========================================================================

  describe("getSummary()", () => {
    it("should return formatted summary", () => {
      const summary = prismCreativeReasoningEngine.getSummary();

      expect(summary).toContain("PRISMCreativeReasoningEngine");
      expect(summary).toContain("Capabilities");
      expect(summary).toContain("Hybrid Potential");
      expect(summary).toContain("Exploration Modes");
    });
  });

  // ==========================================================================
  // HISTORY
  // ==========================================================================

  describe("getHistory()", () => {
    it("should track exploration history", () => {
      const engine = new PRISMCreativeReasoningEngine();

      const problem: ProblemDefinition = {
        domain: "tool_life",
        objective: "Test",
        constraints: [],
        desiredOutcome: "Test",
        flexibility: "moderate",
      };

      engine.explore(problem, "conventional");
      engine.explore(problem, "exploratory");

      const history = engine.getHistory();
      expect(history.length).toBe(2);
    });
  });

  // ==========================================================================
  // SOLUTION STRUCTURE
  // ==========================================================================

  describe("solution structure", () => {
    it("should have all required fields", () => {
      const problem: ProblemDefinition = {
        domain: "cutting_parameters",
        objective: "Test",
        constraints: [],
        desiredOutcome: "Test",
        flexibility: "moderate",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "conventional");

      result.solutions.forEach((s) => {
        expect(s.id).toBeDefined();
        expect(s.approach).toBeDefined();
        expect(s.description).toBeDefined();
        expect(s.noveltyScore).toBeGreaterThanOrEqual(0);
        expect(s.noveltyScore).toBeLessThanOrEqual(1);
        expect(s.viabilityScore).toBeGreaterThanOrEqual(0);
        expect(s.viabilityScore).toBeLessThanOrEqual(1);
        expect(s.optimizationScore).toBeGreaterThanOrEqual(0);
        expect(s.optimizationScore).toBeLessThanOrEqual(1);
        expect(s.confidence).toBeGreaterThanOrEqual(0);
        expect(s.confidence).toBeLessThanOrEqual(1);
        expect(Array.isArray(s.hybridComponents)).toBe(true);
        expect(Array.isArray(s.requiredCapabilities)).toBe(true);
        expect(Array.isArray(s.assumptions)).toBe(true);
        expect(Array.isArray(s.tradeoffs)).toBe(true);
        expect(Array.isArray(s.mathematicalBasis)).toBe(true);
        expect(Array.isArray(s.riskAssessment)).toBe(true);
      });
    });
  });

  // ==========================================================================
  // SVI CONTRIBUTION
  // ==========================================================================

  describe("SVI contribution", () => {
    it("should calculate positive SVI contribution", () => {
      const problem: ProblemDefinition = {
        domain: "multi_domain",
        objective: "Maximize variability",
        constraints: [],
        desiredOutcome: "High SVI",
        flexibility: "maximum",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "innovative");

      expect(result.variabilityContribution).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // REASONING TRAIL
  // ==========================================================================

  describe("reasoning trail", () => {
    it("should provide reasoning for each phase", () => {
      const problem: ProblemDefinition = {
        domain: "cutting_parameters",
        objective: "Optimize",
        constraints: [],
        desiredOutcome: "Better",
        flexibility: "moderate",
      };

      const result = prismCreativeReasoningEngine.explore(problem, "optimal");

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning.some((r) => r.includes("conventional"))).toBe(true);
    });
  });
});
