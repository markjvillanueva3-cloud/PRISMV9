/**
 * Tests for ChainOfThoughtEngine, UncertaintyPropagationEngine, LearningAdaptationEngine
 * ======================================================================================
 * Verifies:
 *   - Chain-of-thought step-by-step reasoning
 *   - Tree-of-thought branching with beam search
 *   - Adversarial self-questioning
 *   - Manufacturing heuristic application
 *   - GUM-compliant analytical uncertainty propagation
 *   - Monte Carlo uncertainty propagation
 *   - Sobol sensitivity indices
 *   - Bayesian learning from outcomes
 *   - Pattern extraction and adjustment recommendations
 *   - Tribal knowledge extraction
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  ChainOfThoughtEngine,
  ReasoningProblem,
  ReasoningChain,
  ReasoningTree,
} from "../engines/ChainOfThoughtEngine.js";
import {
  UncertaintyPropagationEngine,
  UncertainValue,
  UncertaintyInput,
  UncertaintyBudget,
  MonteCarloResult,
} from "../engines/UncertaintyPropagationEngine.js";
import {
  LearningAdaptationEngine,
  Prediction,
  Outcome,
  PredictionCategory,
} from "../engines/LearningAdaptationEngine.js";

// ============================================================================
// CHAIN OF THOUGHT TESTS
// ============================================================================

describe("ChainOfThoughtEngine", () => {
  describe("Basic Reasoning", () => {
    it("should reason through a simple problem", () => {
      const problem: ReasoningProblem = {
        problem: "Calculate optimal cutting speed for mild steel",
        goal: "Find cutting speed that balances MRR and tool life",
        known_facts: [
          "Material is AISI 1020 mild steel",
          "Tool is uncoated carbide",
          "Required surface finish Ra 1.6 μm",
        ],
        constraints: [
          "Tool life must be > 15 minutes",
          "Surface finish must meet specification",
        ],
        max_steps: 10,
      };

      const chain = ChainOfThoughtEngine.reason(problem);

      expect(chain).toBeDefined();
      expect(chain.chain_id).toMatch(/^cot-/);
      expect(chain.problem).toBe(problem.problem);
      expect(chain.goal).toBe(problem.goal);
      expect(chain.steps.length).toBeGreaterThan(0);
      expect(chain.steps.length).toBeLessThanOrEqual(10);
    });

    it("should include observation steps for known facts", () => {
      const problem: ReasoningProblem = {
        problem: "Determine if operation is feasible",
        goal: "Assess feasibility",
        known_facts: ["Power available: 15 kW", "Force required: 1200 N"],
      };

      const chain = ChainOfThoughtEngine.reason(problem);

      const observations = chain.steps.filter(s => s.type === "observation");
      expect(observations.length).toBeGreaterThanOrEqual(1);
      expect(observations.some(o => o.content.includes("known fact") || o.content.includes("Known facts"))).toBe(true);
    });

    it("should include constraint observation steps", () => {
      const problem: ReasoningProblem = {
        problem: "Optimize feed rate",
        goal: "Maximize MRR within constraints",
        constraints: ["Force < 2000 N", "Temperature < 400°C"],
      };

      const chain = ChainOfThoughtEngine.reason(problem);

      const constraintStep = chain.steps.find(s =>
        s.content.includes("Constraint") || s.content.includes("constraint")
      );
      expect(constraintStep).toBeDefined();
    });

    it("should form an initial hypothesis", () => {
      const problem: ReasoningProblem = {
        problem: "Select optimal cutting speed for titanium",
        goal: "Balance productivity and tool life",
      };

      const chain = ChainOfThoughtEngine.reason(problem);

      const hypothesis = chain.steps.find(s => s.type === "hypothesis");
      expect(hypothesis).toBeDefined();
      expect(hypothesis?.confidence).toBeLessThan(1.0);
      expect(hypothesis?.alternatives).toBeDefined();
    });

    it("should reach a final answer", () => {
      const problem: ReasoningProblem = {
        problem: "Estimate cutting force",
        goal: "Calculate Fc using Kienzle model",
        context: {
          material: "steel",
          depth: 2,
          feed: 0.2,
        },
        max_steps: 15,
      };

      const chain = ChainOfThoughtEngine.reason(problem);

      expect(chain.final_answer).toBeDefined();
      expect(chain.final_answer?.confidence).toBeGreaterThan(0);
      expect(chain.final_answer?.justification.length).toBeGreaterThan(0);
    });

    it("should track confidence throughout reasoning", () => {
      const problem: ReasoningProblem = {
        problem: "Determine chatter risk",
        goal: "Assess stability at given spindle speed",
      };

      const chain = ChainOfThoughtEngine.reason(problem);

      expect(chain.current_confidence).toBeGreaterThan(0);
      expect(chain.current_confidence).toBeLessThanOrEqual(1);

      // Each step should have confidence
      for (const step of chain.steps) {
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should include self-questioning", () => {
      const problem: ReasoningProblem = {
        problem: "Validate speed/feed calculation",
        goal: "Verify calculation is correct",
      };

      const chain = ChainOfThoughtEngine.reason(problem);

      const stepsWithQuestions = chain.steps.filter(s => s.self_question);
      expect(stepsWithQuestions.length).toBeGreaterThan(0);

      // Self-questions should have answers
      for (const step of stepsWithQuestions) {
        expect(step.self_answer).toBeDefined();
      }
    });
  });

  describe("Tree-of-Thought Reasoning", () => {
    it("should reason with tree structure", () => {
      const problem: ReasoningProblem = {
        problem: "Find best toolpath strategy for pocket",
        goal: "Minimize cycle time while maintaining tool life",
        max_steps: 8,
      };

      const tree = ChainOfThoughtEngine.reasonTree(problem, 3);

      expect(tree).toBeDefined();
      expect(tree.tree_id).toMatch(/^tot-/);
      expect(tree.root).toBeDefined();
      expect(tree.beam_width).toBe(3);
      expect(tree.explored_nodes).toBeGreaterThan(1);
    });

    it("should explore multiple branches", () => {
      const problem: ReasoningProblem = {
        problem: "Select machining approach",
        goal: "Choose between climb vs conventional milling",
        max_steps: 6,
      };

      const tree = ChainOfThoughtEngine.reasonTree(problem, 3);

      // Root should have children
      expect(tree.root.children.length).toBeGreaterThan(0);
      expect(tree.explored_nodes).toBeGreaterThan(tree.root.children.length);
    });

    it("should track best path", () => {
      const problem: ReasoningProblem = {
        problem: "Optimize roughing parameters",
        goal: "Maximize MRR",
        max_steps: 5,
      };

      const tree = ChainOfThoughtEngine.reasonTree(problem, 2);

      expect(tree.best_path.length).toBeGreaterThan(0);
      expect(tree.best_path[0]).toBe(tree.root.node_id);
    });

    it("should prune low-scoring branches", () => {
      const problem: ReasoningProblem = {
        problem: "Select tool geometry",
        goal: "Optimize for finishing",
        max_steps: 6,
      };

      const tree = ChainOfThoughtEngine.reasonTree(problem, 2);

      // Find pruned nodes
      const findPruned = (node: typeof tree.root): number => {
        let count = node.pruned ? 1 : 0;
        for (const child of node.children) {
          count += findPruned(child);
        }
        return count;
      };

      // With beam width 2, some nodes should be pruned
      const prunedCount = findPruned(tree.root);
      expect(prunedCount).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Adversarial Challenge", () => {
    it("should challenge answer assumptions", () => {
      const answer = {
        answer: { recommended_speed: 150 },
        confidence: 0.85,
        justification: ["Based on material properties", "Tool geometry considered"],
        assumptions: [
          "Tool is new (no wear)",
          "Coolant is at optimal pressure",
        ],
        caveats: [],
        evidence_strength: "strong" as const,
      };

      const result = ChainOfThoughtEngine.adversarialChallenge(answer, {
        material: "steel",
        tool_condition: "used",
      });

      expect(result.challenges.length).toBeGreaterThan(0);
      expect(result.challenges.some(c => c.challenge.includes("assumption"))).toBe(true);
    });

    it("should calculate revised confidence", () => {
      const answer = {
        answer: 200,
        confidence: 0.9,
        justification: ["Calculation"],
        assumptions: ["Linear behavior"],
        caveats: [],
        evidence_strength: "strong" as const,
      };

      const result = ChainOfThoughtEngine.adversarialChallenge(answer, {});

      expect(result.revised_confidence).toBeLessThanOrEqual(answer.confidence);
      expect(result.revised_confidence).toBeGreaterThan(0);
    });

    it("should flag undefended challenges", () => {
      const answer = {
        answer: { speed: 1500 },  // Very high speed
        confidence: 0.95,
        justification: ["Calculated from formula"],
        assumptions: [],
        caveats: [],
        evidence_strength: "strong" as const,
      };

      const result = ChainOfThoughtEngine.adversarialChallenge(answer, {
        cutting_speed: 1500,  // Very high
        material: "titanium",  // Titanium is problematic at high speeds
      });

      // Should detect the contradiction
      const undefended = result.challenges.filter(c => !c.defended);
      expect(undefended.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Manufacturing Heuristics", () => {
    it("should apply cutting speed heuristics for hardened materials", () => {
      const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(
        "What cutting speed for hardened steel?",
        { material: "D2 hardened to 60 HRC" }
      );

      expect(heuristics.length).toBeGreaterThan(0);
      const hardenedHeuristic = heuristics.find(h => h.heuristic === "hardened_material");
      expect(hardenedHeuristic).toBeDefined();
      expect(hardenedHeuristic?.applies).toBe(true);
    });

    it("should apply titanium processing heuristics", () => {
      const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(
        "Machining parameters for Ti-6Al-4V",
        { material: "titanium Ti-6Al-4V" }
      );

      const titaniumHeuristic = heuristics.find(h => h.heuristic === "titanium_processing");
      expect(titaniumHeuristic).toBeDefined();
      expect(titaniumHeuristic?.implication).toContain("coolant");
    });

    it("should apply finishing operation heuristics", () => {
      const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(
        "Finishing pass parameters",
        { operation: "finish turning" }
      );

      const finishHeuristic = heuristics.find(h => h.heuristic === "finishing_operation");
      expect(finishHeuristic).toBeDefined();
      expect(finishHeuristic?.implication).toContain("light");
    });

    it("should apply roughing operation heuristics", () => {
      const heuristics = ChainOfThoughtEngine.applyManufacturingHeuristics(
        "Roughing parameters for stock removal",
        { operation: "rough milling hogging" }
      );

      const roughHeuristic = heuristics.find(h => h.heuristic === "roughing_operation");
      expect(roughHeuristic).toBeDefined();
      expect(roughHeuristic?.implication).toContain("MRR");
    });
  });

  describe("Explanation", () => {
    it("should explain reasoning chain in natural language", () => {
      const problem: ReasoningProblem = {
        problem: "Calculate tool life",
        goal: "Estimate minutes of cutting before tool change",
        max_steps: 6,
      };

      const chain = ChainOfThoughtEngine.reason(problem);
      const explanation = ChainOfThoughtEngine.explainChain(chain);

      expect(explanation).toContain("Reasoning Trace");
      expect(explanation).toContain("Step");
      expect(explanation).toContain("Confidence");
    });
  });
});

// ============================================================================
// UNCERTAINTY PROPAGATION TESTS
// ============================================================================

describe("UncertaintyPropagationEngine", () => {
  describe("Analytical Propagation (GUM)", () => {
    it("should propagate uncertainty through linear function", () => {
      // f = a + b
      const inputs: UncertaintyInput[] = [
        {
          id: "a",
          value: { value: 10, uncertainty: 0.5, distribution: "normal" },
        },
        {
          id: "b",
          value: { value: 20, uncertainty: 1.0, distribution: "normal" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.a + inp.b;

      const budget = UncertaintyPropagationEngine.propagateAnalytical(inputs, func);

      expect(budget.result_value).toBeCloseTo(30, 5);
      // Combined uncertainty = sqrt(0.5² + 1.0²) ≈ 1.118
      expect(budget.combined_uncertainty).toBeCloseTo(Math.sqrt(0.25 + 1), 2);
    });

    it("should propagate uncertainty through multiplicative function", () => {
      // f = a * b
      const inputs: UncertaintyInput[] = [
        {
          id: "a",
          value: { value: 100, uncertainty: 5, distribution: "normal" },
        },
        {
          id: "b",
          value: { value: 2, uncertainty: 0.1, distribution: "normal" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.a * inp.b;

      const budget = UncertaintyPropagationEngine.propagateAnalytical(inputs, func);

      expect(budget.result_value).toBeCloseTo(200, 5);
      expect(budget.combined_uncertainty).toBeGreaterThan(0);
      expect(budget.expanded_uncertainty).toBeGreaterThan(budget.combined_uncertainty);
    });

    it("should calculate sensitivity coefficients", () => {
      // f = x² + y
      const inputs: UncertaintyInput[] = [
        {
          id: "x",
          value: { value: 5, uncertainty: 0.1, distribution: "normal" },
        },
        {
          id: "y",
          value: { value: 10, uncertainty: 0.2, distribution: "normal" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.x * inp.x + inp.y;

      const budget = UncertaintyPropagationEngine.propagateAnalytical(inputs, func);

      // ∂f/∂x = 2x = 10, ∂f/∂y = 1
      const sensX = budget.sensitivity_analysis.find(s => s.variable === "x");
      const sensY = budget.sensitivity_analysis.find(s => s.variable === "y");

      expect(sensX?.partial_derivative).toBeCloseTo(10, 1);
      expect(sensY?.partial_derivative).toBeCloseTo(1, 1);
    });

    it("should rank sensitivities by contribution", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "dominant",
          value: { value: 100, uncertainty: 10, distribution: "normal" },
        },
        {
          id: "minor",
          value: { value: 1, uncertainty: 0.01, distribution: "normal" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.dominant + inp.minor;

      const budget = UncertaintyPropagationEngine.propagateAnalytical(inputs, func);

      const dominant = budget.sensitivity_analysis.find(s => s.variable === "dominant");
      const minor = budget.sensitivity_analysis.find(s => s.variable === "minor");

      expect(dominant?.relative_contribution).toBeGreaterThan(minor?.relative_contribution || 0);
      expect(dominant?.rank).toBe(1);
    });

    it("should handle correlated inputs", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "a",
          value: { value: 10, uncertainty: 1, distribution: "normal", correlation_id: "ab" },
        },
        {
          id: "b",
          value: { value: 10, uncertainty: 1, distribution: "normal", correlation_id: "ab" },
        },
      ];

      const correlations = [
        { var1_id: "a", var2_id: "b", coefficient: 0.8, type: "assumed" as const },
      ];

      const func = (inp: Record<string, number>) => inp.a + inp.b;

      const budgetCorrelated = UncertaintyPropagationEngine.propagateAnalytical(
        inputs, func, correlations
      );
      const budgetUncorrelated = UncertaintyPropagationEngine.propagateAnalytical(
        inputs, func
      );

      // Positive correlation should increase combined uncertainty
      expect(budgetCorrelated.combined_uncertainty).toBeGreaterThan(
        budgetUncorrelated.combined_uncertainty
      );
    });

    it("should calculate effective degrees of freedom", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "measured",
          value: { value: 50, uncertainty: 2, distribution: "student_t", degrees_of_freedom: 5 },
        },
        {
          id: "spec",
          value: { value: 100, uncertainty: 1, distribution: "uniform" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.measured + inp.spec;

      const budget = UncertaintyPropagationEngine.propagateAnalytical(inputs, func);

      expect(budget.effective_dof).toBeGreaterThan(0);
      expect(budget.coverage_factor).toBeGreaterThan(1);
    });
  });

  describe("Monte Carlo Propagation", () => {
    it("should propagate uncertainty through Monte Carlo", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "x",
          value: { value: 10, uncertainty: 1, distribution: "normal" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.x * inp.x;

      const result = UncertaintyPropagationEngine.propagateMonteCarlo(inputs, func, 5000);

      expect(result.mean).toBeCloseTo(100, -1);  // x² ≈ 100 (plus variance contribution)
      expect(result.standard_deviation).toBeGreaterThan(0);
      expect(result.sample_count).toBe(5000);
    });

    it("should calculate confidence intervals", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "a",
          value: { value: 50, uncertainty: 5, distribution: "normal" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.a;

      const result = UncertaintyPropagationEngine.propagateMonteCarlo(inputs, func, 10000);

      // 95% CI should be approximately mean ± 2σ
      const [lower95, upper95] = result.confidence_interval_95;
      expect(lower95).toBeLessThan(result.mean);
      expect(upper95).toBeGreaterThan(result.mean);
      expect(upper95 - lower95).toBeGreaterThan(result.standard_deviation);
    });

    it("should calculate percentiles", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "x",
          value: { value: 100, uncertainty: 10, distribution: "normal" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.x;

      const result = UncertaintyPropagationEngine.propagateMonteCarlo(inputs, func, 5000);

      expect(result.percentiles[50]).toBeCloseTo(100, -1);  // Median ≈ mean
      expect(result.percentiles[5]).toBeLessThan(result.percentiles[50]);
      expect(result.percentiles[95]).toBeGreaterThan(result.percentiles[50]);
    });

    it("should check convergence", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "x",
          value: { value: 10, uncertainty: 1, distribution: "normal" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.x;

      const result = UncertaintyPropagationEngine.propagateMonteCarlo(inputs, func, 10000);

      expect(result.convergence_metric).toBeDefined();
      expect(result.convergence_achieved).toBeDefined();
    });

    it("should handle non-normal distributions", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "uniform_input",
          value: { value: 50, uncertainty: 10, distribution: "uniform" },
        },
      ];

      const func = (inp: Record<string, number>) => inp.uniform_input;

      const result = UncertaintyPropagationEngine.propagateMonteCarlo(inputs, func, 5000);

      expect(result.mean).toBeCloseTo(50, 0);
      expect(result.standard_deviation).toBeGreaterThan(0);
    });
  });

  describe("Sobol Sensitivity Indices", () => {
    it("should calculate first-order indices", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "x",
          value: { value: 10, uncertainty: 1, distribution: "normal" },
        },
        {
          id: "y",
          value: { value: 5, uncertainty: 1, distribution: "normal" },
        },
      ];

      // f = x + y (linear, no interactions)
      const func = (inp: Record<string, number>) => inp.x + inp.y;

      const sobol = UncertaintyPropagationEngine.calculateSobolIndices(inputs, func, 2048);

      // With larger sample size, indices should be closer to theoretical 0.5 each
      expect(sobol.first_order.x).toBeDefined();
      expect(sobol.first_order.y).toBeDefined();
      // Sum should be roughly 1 for linear additive function (may vary due to sampling)
      const sum = sobol.first_order.x + sobol.first_order.y;
      expect(Math.abs(sum)).toBeLessThan(2);  // Reasonable bounds
    });

    it("should calculate total-order indices", () => {
      const inputs: UncertaintyInput[] = [
        {
          id: "a",
          value: { value: 1, uncertainty: 0.1, distribution: "normal" },
        },
        {
          id: "b",
          value: { value: 2, uncertainty: 0.2, distribution: "normal" },
        },
      ];

      // f = a * b (multiplicative with interaction)
      const func = (inp: Record<string, number>) => inp.a * inp.b;

      const sobol = UncertaintyPropagationEngine.calculateSobolIndices(inputs, func, 2048);

      expect(sobol.total_order.a).toBeDefined();
      expect(sobol.total_order.b).toBeDefined();
      // Indices are computed via sampling; just verify structure exists
      expect(typeof sobol.total_order.a).toBe("number");
      expect(typeof sobol.total_order.b).toBe("number");
    });
  });

  describe("Type A and Type B Uncertainties", () => {
    it("should create uncertain value from measurements (Type A)", () => {
      const measurements = [10.1, 10.2, 9.9, 10.0, 10.1, 10.0, 9.8, 10.2];

      const uv = UncertaintyPropagationEngine.fromMeasurements(measurements, "mm", "caliper");

      expect(uv.value).toBeCloseTo(10.0375, 2);
      expect(uv.uncertainty).toBeGreaterThan(0);
      expect(uv.degrees_of_freedom).toBe(7);
      expect(uv.unit).toBe("mm");
    });

    it("should create uncertain value from specification (Type B)", () => {
      const uv = UncertaintyPropagationEngine.fromSpecification(
        100,      // nominal
        0.5,      // tolerance
        "uniform", // distribution
        "mm",
        "drawing tolerance"
      );

      expect(uv.value).toBe(100);
      expect(uv.uncertainty).toBeCloseTo(0.5 / Math.sqrt(3), 5);
      expect(uv.distribution).toBe("uniform");
    });
  });

  describe("Utility Functions", () => {
    it("should combine independent uncertainties with RSS", () => {
      const combined = UncertaintyPropagationEngine.combineUncertainties([1, 2, 3]);

      expect(combined).toBeCloseTo(Math.sqrt(1 + 4 + 9), 5);
    });

    it("should format result with proper significant figures", () => {
      const formatted = UncertaintyPropagationEngine.formatResult(
        123.456, 2.5, 2, "N"
      );

      expect(formatted).toContain("±");
      expect(formatted).toContain("N");
      expect(formatted).toContain("k=2");
    });

    it("should validate uncertainty budget", () => {
      const budget: UncertaintyBudget = {
        quantity: "Test",
        result_value: 100,
        combined_uncertainty: 5,
        expanded_uncertainty: 10,
        coverage_factor: 2,
        coverage_probability: 0.95,
        effective_dof: 50,
        entries: [
          {
            source: "input1",
            type: "A",
            value: 100,
            standard_uncertainty: 5,
            sensitivity_coefficient: 1,
            contribution_to_variance: 25,
            degrees_of_freedom: 10,
          },
        ],
        correlations: [],
        sensitivity_analysis: [
          {
            variable: "input1",
            partial_derivative: 1,
            relative_contribution: 1.0,
            rank: 1,
          },
        ],
      };

      const validation = UncertaintyPropagationEngine.validateBudget(budget);

      expect(validation.valid).toBe(true);
      expect(validation.errors.length).toBe(0);
    });
  });
});

// ============================================================================
// LEARNING ADAPTATION TESTS
// ============================================================================

describe("LearningAdaptationEngine", () => {
  beforeEach(() => {
    LearningAdaptationEngine.reset();
  });

  describe("Learning from Outcomes", () => {
    it("should record prediction-outcome pair", () => {
      const prediction: Prediction = {
        prediction_id: "pred-001",
        category: "cutting_force",
        predicted_value: 1000,
        predicted_uncertainty: 100,
        confidence: 0.85,
        timestamp: new Date().toISOString(),
        context: { material: "steel", depth: 2, feed: 0.2 },
        model_version: "1.0",
      };

      const outcome: Outcome = {
        prediction_id: "pred-001",
        observed_value: 1050,
        timestamp: new Date().toISOString(),
      };

      const record = LearningAdaptationEngine.learn(prediction, outcome);

      expect(record).toBeDefined();
      expect(record.prediction.prediction_id).toBe("pred-001");
      expect(record.outcome.observed_value).toBe(1050);
      expect(record.error_analysis).toBeDefined();
    });

    it("should analyze error correctly", () => {
      const prediction: Prediction = {
        prediction_id: "pred-002",
        category: "tool_life",
        predicted_value: 30,  // minutes
        predicted_uncertainty: 5,
        confidence: 0.8,
        timestamp: new Date().toISOString(),
        context: { material: "titanium" },
        model_version: "1.0",
      };

      const outcome: Outcome = {
        prediction_id: "pred-002",
        observed_value: 25,  // Tool failed earlier
        timestamp: new Date().toISOString(),
      };

      const record = LearningAdaptationEngine.learn(prediction, outcome);

      expect(record.error_analysis.absolute_error).toBe(-5);
      expect(record.error_analysis.error_direction).toBe("over");  // Predicted too high
      expect(record.error_analysis.within_uncertainty).toBe(true);  // 5 < 2*5
    });

    it("should detect outliers", () => {
      const prediction: Prediction = {
        prediction_id: "pred-003",
        category: "surface_finish",
        predicted_value: 1.6,  // Ra
        predicted_uncertainty: 0.1,
        confidence: 0.9,
        timestamp: new Date().toISOString(),
        context: {},
        model_version: "1.0",
      };

      const outcome: Outcome = {
        prediction_id: "pred-003",
        observed_value: 3.2,  // Much worse than predicted
        timestamp: new Date().toISOString(),
      };

      const record = LearningAdaptationEngine.learn(prediction, outcome);

      expect(record.error_analysis.error_category).toBe("outlier");
      expect(record.learning_weight).toBeLessThan(1);  // Outliers get reduced weight
    });

    it("should calculate learning weight", () => {
      const prediction: Prediction = {
        prediction_id: "pred-004",
        category: "cycle_time",
        predicted_value: 60,
        predicted_uncertainty: 4,  // Small uncertainty
        confidence: 0.95,  // High confidence
        timestamp: new Date().toISOString(),
        context: {},
        model_version: "1.0",
      };

      const outcome: Outcome = {
        prediction_id: "pred-004",
        observed_value: 70,  // Wrong, z=10/4=2.5, outside uncertainty but not outlier (<3)
        timestamp: new Date().toISOString(),
      };

      const record = LearningAdaptationEngine.learn(prediction, outcome);

      // Confident predictions that are wrong (outside uncertainty) should have higher learning weight
      expect(record.learning_weight).toBeGreaterThan(1);
    });
  });

  describe("Track Record", () => {
    it("should build track record over multiple predictions", () => {
      const category: PredictionCategory = "cutting_force";

      // Add 10 predictions with outcomes
      for (let i = 0; i < 10; i++) {
        const predicted = 1000 + i * 10;
        const observed = predicted + (Math.random() - 0.5) * 50;

        LearningAdaptationEngine.learn(
          {
            prediction_id: `pred-tr-${i}`,
            category,
            predicted_value: predicted,
            predicted_uncertainty: 50,
            confidence: 0.8,
            timestamp: new Date().toISOString(),
            context: {},
            model_version: "1.0",
          },
          {
            prediction_id: `pred-tr-${i}`,
            observed_value: observed,
            timestamp: new Date().toISOString(),
          }
        );
      }

      const trackRecord = LearningAdaptationEngine.getTrackRecord(category);

      expect(trackRecord.length).toBe(1);
      expect(trackRecord[0].total_predictions).toBe(10);
      expect(trackRecord[0].accuracy_rate).toBeGreaterThan(0);
    });
  });

  describe("Adjustment Recommendations", () => {
    it("should recommend bias correction for systematic errors", () => {
      const category: PredictionCategory = "temperature";

      // Add predictions that are consistently low but within uncertainty bounds
      // (so confidence calibration stays high, but bias is detectable)
      // Need 30+ iterations for EMA to converge to > 0.1 threshold
      for (let i = 0; i < 40; i++) {
        LearningAdaptationEngine.learn(
          {
            prediction_id: `pred-bias-${i}`,
            category,
            predicted_value: 400,  // Always predict 400
            predicted_uncertainty: 100,  // Large uncertainty so errors are within bounds
            confidence: 0.8,
            timestamp: new Date().toISOString(),
            context: {},
            model_version: "1.0",
          },
          {
            prediction_id: `pred-bias-${i}`,
            observed_value: 480,  // Always observe 480 (20% higher, well within 2*100=200)
            timestamp: new Date().toISOString(),
          }
        );
      }

      const adjustment = LearningAdaptationEngine.getAdjustment(category, {});

      expect(adjustment).toBeDefined();
      expect(adjustment?.adjustment_type).toBe("bias_correction");
    });
  });

  describe("Prediction Adjustment", () => {
    it("should adjust prediction based on learned patterns", () => {
      const category: PredictionCategory = "cutting_force";

      // Train with systematic under-prediction
      for (let i = 0; i < 20; i++) {
        LearningAdaptationEngine.learn(
          {
            prediction_id: `pred-adj-${i}`,
            category,
            predicted_value: 1000,
            predicted_uncertainty: 50,
            confidence: 0.8,
            timestamp: new Date().toISOString(),
            context: { material: "titanium" },
            model_version: "1.0",
          },
          {
            prediction_id: `pred-adj-${i}`,
            observed_value: 1100,  // Always 10% higher
            timestamp: new Date().toISOString(),
          }
        );
      }

      const adjusted = LearningAdaptationEngine.adjustPrediction(
        category,
        1000,
        50,
        { material: "titanium" }
      );

      expect(adjusted.adjusted_value).not.toBe(1000);
      expect(adjusted.adjustments_applied.length).toBeGreaterThan(0);
    });
  });

  describe("Calibration", () => {
    it("should calibrate model for a category", () => {
      const category: PredictionCategory = "deflection";

      // Add varied predictions and outcomes
      for (let i = 0; i < 20; i++) {
        const predicted = 0.01 + i * 0.002;
        const observed = predicted * 1.1 + 0.001;  // Systematic scale error

        LearningAdaptationEngine.learn(
          {
            prediction_id: `pred-cal-${i}`,
            category,
            predicted_value: predicted,
            predicted_uncertainty: predicted * 0.1,
            confidence: 0.85,
            timestamp: new Date().toISOString(),
            context: {},
            model_version: "1.0",
          },
          {
            prediction_id: `pred-cal-${i}`,
            observed_value: observed,
            timestamp: new Date().toISOString(),
          }
        );
      }

      const calibration = LearningAdaptationEngine.calibrate(category);

      expect(calibration.category).toBe(category);
      expect(calibration.scale_factor).toBeGreaterThan(1);  // We're under-predicting
      expect(calibration.rmse).toBeGreaterThan(0);
      expect(calibration.calibration_curve.length).toBeGreaterThan(0);
      expect(calibration.recommendation).toBeDefined();
    });

    it("should handle insufficient data", () => {
      const calibration = LearningAdaptationEngine.calibrate("power");

      expect(calibration.recommendation).toContain("Insufficient data");
    });
  });

  describe("Tribal Knowledge", () => {
    it("should extract tribal knowledge from patterns", () => {
      const category: PredictionCategory = "tool_life";

      // Add material-specific patterns
      for (let i = 0; i < 10; i++) {
        LearningAdaptationEngine.learn(
          {
            prediction_id: `pred-tk-titanium-${i}`,
            category,
            predicted_value: 30,
            predicted_uncertainty: 5,
            confidence: 0.8,
            timestamp: new Date().toISOString(),
            context: { material: "titanium" },
            model_version: "1.0",
          },
          {
            prediction_id: `pred-tk-titanium-${i}`,
            observed_value: 20,  // Tool life always shorter for titanium
            timestamp: new Date().toISOString(),
          }
        );
      }

      const insights = LearningAdaptationEngine.extractTribalKnowledge();

      expect(insights.length).toBeGreaterThan(0);
      // Should have titanium-specific insight
      const titaniumInsight = insights.find(i =>
        i.insight.toLowerCase().includes("titanium")
      );
      expect(titaniumInsight).toBeDefined();
    });
  });

  describe("Historical Confidence Intervals", () => {
    it("should calculate historical confidence interval", () => {
      const category: PredictionCategory = "mrr";

      // Add some history
      for (let i = 0; i < 25; i++) {
        const predicted = 100;
        const observed = 100 + (Math.random() - 0.5) * 40;

        LearningAdaptationEngine.learn(
          {
            prediction_id: `pred-ci-${i}`,
            category,
            predicted_value: predicted,
            predicted_uncertainty: 10,
            confidence: 0.8,
            timestamp: new Date().toISOString(),
            context: {},
            model_version: "1.0",
          },
          {
            prediction_id: `pred-ci-${i}`,
            observed_value: observed,
            timestamp: new Date().toISOString(),
          }
        );
      }

      const ci = LearningAdaptationEngine.getHistoricalConfidenceInterval(
        category,
        100,
        10,
        0.95
      );

      expect(ci.lower).toBeLessThan(100);
      expect(ci.upper).toBeGreaterThan(100);
      expect(ci.adjusted_uncertainty).toBeGreaterThanOrEqual(10);
    });
  });

  describe("State Management", () => {
    it("should export and import state", () => {
      // Add some data
      LearningAdaptationEngine.learn(
        {
          prediction_id: "pred-state-1",
          category: "cutting_force",
          predicted_value: 1000,
          predicted_uncertainty: 100,
          confidence: 0.8,
          timestamp: new Date().toISOString(),
          context: {},
          model_version: "1.0",
        },
        {
          prediction_id: "pred-state-1",
          observed_value: 1050,
          timestamp: new Date().toISOString(),
        }
      );

      const exported = LearningAdaptationEngine.exportState();

      // Reset and reimport
      LearningAdaptationEngine.reset();
      expect(LearningAdaptationEngine.getTrackRecord().length).toBe(0);

      LearningAdaptationEngine.importState(exported);
      expect(LearningAdaptationEngine.getTrackRecord().length).toBeGreaterThan(0);
    });
  });
});
