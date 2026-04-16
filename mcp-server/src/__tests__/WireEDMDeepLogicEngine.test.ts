/**
 * WireEDMDeepLogicEngine Tests
 *
 * Tests Claude Opus-level deep logic and critical thinking:
 * - Counterfactual reasoning
 * - Hypothesis generation
 * - Inference chains
 * - Constraint solving
 * - Decision analysis
 *
 * @module __tests__/WireEDMDeepLogicEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wireEDMDeepLogicEngine,
  WireEDMDeepLogicEngine,
  type LogicMode,
  type Hypothesis,
  type CounterfactualScenario,
} from "../engines/WireEDMDeepLogicEngine.js";

describe("WireEDMDeepLogicEngine", () => {
  let engine: WireEDMDeepLogicEngine;

  beforeEach(() => {
    engine = new WireEDMDeepLogicEngine();
  });

  // ============================================================================
  // MAIN REASON TESTS
  // ============================================================================

  describe("reason", () => {
    it("routes to counterfactual mode for 'what if' queries", () => {
      const result = engine.reason("What if we added one more pass?", {
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      expect(result.mode).toBe("counterfactual");
      expect(result.counterfactuals).toBeDefined();
      expect(result.counterfactuals!.length).toBeGreaterThan(0);
    });

    it("routes to abductive mode for 'why' queries", () => {
      const result = engine.reason("Why is the wire breaking?", {
        symptoms: ["wire breaks frequently"],
      });

      expect(result.mode).toBe("abductive");
      expect(result.hypotheses).toBeDefined();
    });

    it("routes to constraint mode for limit queries", () => {
      const result = engine.reason("Must achieve Ra within 0.4µm limit", {
        target_ra_um: 0.4,
        thickness_mm: 25,
      });

      expect(result.mode).toBe("constraint");
      expect(result.constraint_solution).toBeDefined();
    });

    it("routes to decision mode for choice queries", () => {
      const result = engine.reason("Which wire should I choose?", {
        material: "D2",
        thickness_mm: 50,
      });

      expect(result.mode).toBe("decision");
      expect(result.decision_analysis).toBeDefined();
    });

    it("routes to deductive mode by default", () => {
      const result = engine.reason("Calculate parameters for D2", {
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.mode).toBe("deductive");
      expect(result.inference_chain).toBeDefined();
    });

    it("includes confidence score", () => {
      const result = engine.reason("What settings for D2?", {
        material: "D2",
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("identifies knowledge gaps", () => {
      const result = engine.reason("What settings?", {});

      expect(result.knowledge_gaps.length).toBeGreaterThan(0);
      expect(result.knowledge_gaps.some(g => g.includes("Material") || g.includes("Thickness"))).toBe(true);
    });
  });

  // ============================================================================
  // COUNTERFACTUAL ANALYSIS TESTS
  // ============================================================================

  describe("analyzeCounterfactuals", () => {
    it("generates scenarios for parameter changes", () => {
      const scenarios = engine.analyzeCounterfactuals({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
        on_time_us: 4,
      });

      expect(scenarios.length).toBeGreaterThan(0);
    });

    it("includes predicted outcomes", () => {
      const scenarios = engine.analyzeCounterfactuals({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      for (const scenario of scenarios) {
        expect(scenario.predicted_outcomes).toBeDefined();
        expect(scenario.predicted_outcomes.ra_um.value).toBeGreaterThan(0);
        expect(scenario.predicted_outcomes.cycle_time_min.value).toBeGreaterThan(0);
      }
    });

    it("identifies trade-offs", () => {
      const scenarios = engine.analyzeCounterfactuals({
        thickness_mm: 30,
        num_passes: 4,
      });

      for (const scenario of scenarios) {
        expect(scenario.trade_offs.length).toBeGreaterThan(0);
      }
    });

    it("provides recommendations", () => {
      const scenarios = engine.analyzeCounterfactuals({
        thickness_mm: 25,
        num_passes: 3,
      });

      for (const scenario of scenarios) {
        expect(scenario.recommendation).toBeTruthy();
      }
    });

    it("varies specified parameters", () => {
      const scenarios = engine.analyzeCounterfactuals(
        { thickness_mm: 25 },
        ["num_passes"]
      );

      expect(scenarios.length).toBe(1);
      expect(scenarios[0].changes[0].parameter).toBe("num_passes");
    });

    it("handles thick sections differently", () => {
      const thinScenarios = engine.analyzeCounterfactuals({ thickness_mm: 20 });
      const thickScenarios = engine.analyzeCounterfactuals({ thickness_mm: 80 });

      const thinOnTimeRec = thinScenarios.find(s => s.changes[0].parameter === "on_time_us");
      const thickOnTimeRec = thickScenarios.find(s => s.changes[0].parameter === "on_time_us");

      if (thinOnTimeRec && thickOnTimeRec) {
        // Thick section should have more cautious recommendation
        expect(thickOnTimeRec.recommendation).not.toBe(thinOnTimeRec.recommendation);
      }
    });
  });

  // ============================================================================
  // HYPOTHESIS GENERATION TESTS
  // ============================================================================

  describe("generateHypotheses", () => {
    it("generates hypotheses for wire break observations", () => {
      const hypotheses = engine.generateHypotheses("Wire breaks frequently during cutting");

      expect(hypotheses.length).toBeGreaterThan(0);
      expect(hypotheses[0].statement).toBeTruthy();
      expect(hypotheses[0].confidence).toBeGreaterThan(0);
    });

    it("generates hypotheses for poor finish", () => {
      const hypotheses = engine.generateHypotheses("Ra is worse than expected");

      expect(hypotheses.length).toBeGreaterThan(0);
      expect(hypotheses.some(h => h.statement.includes("resistivity") || h.statement.includes("passes"))).toBe(true);
    });

    it("includes supporting evidence", () => {
      const hypotheses = engine.generateHypotheses("Wire breaks");

      for (const h of hypotheses) {
        expect(h.supporting_evidence.length).toBeGreaterThan(0);
        expect(h.supporting_evidence[0].source).toBeTruthy();
      }
    });

    it("includes tests required", () => {
      const hypotheses = engine.generateHypotheses("Poor surface finish");

      for (const h of hypotheses) {
        expect(h.tests_required.length).toBeGreaterThan(0);
      }
    });

    it("sorts by confidence", () => {
      const hypotheses = engine.generateHypotheses("Wire breaks during roughing");

      for (let i = 1; i < hypotheses.length; i++) {
        expect(hypotheses[i - 1].confidence).toBeGreaterThanOrEqual(hypotheses[i].confidence);
      }
    });

    it("considers context for contradicting evidence", () => {
      const thinHypotheses = engine.generateHypotheses("Wire breaks", { thickness_mm: 10 });
      const thickHypotheses = engine.generateHypotheses("Wire breaks", { thickness_mm: 80 });

      // Flushing hypothesis should have contradicting evidence for thin sections
      const thinFlushing = thinHypotheses.find(h => h.statement.includes("flushing"));
      const thickFlushing = thickHypotheses.find(h => h.statement.includes("flushing"));

      if (thinFlushing && thickFlushing) {
        expect(thinFlushing.contradicting_evidence.length).toBeGreaterThanOrEqual(
          thickFlushing.contradicting_evidence.length
        );
      }
    });
  });

  // ============================================================================
  // INFERENCE CHAIN TESTS
  // ============================================================================

  describe("buildInferenceChain", () => {
    it("builds deductive chain from context", () => {
      const chain = engine.buildInferenceChain(
        "Determine parameters for D2 at 25mm",
        "deductive",
        { material: "D2", thickness_mm: 25, target_ra_um: 0.8 }
      );

      expect(chain.steps.length).toBeGreaterThan(0);
      expect(chain.final_conclusion).toBeTruthy();
      expect(chain.overall_confidence).toBeGreaterThan(0);
    });

    it("builds inductive chain from observations", () => {
      const chain = engine.buildInferenceChain(
        "Learn from JM Die programs",
        "inductive",
        {}
      );

      expect(chain.steps.length).toBeGreaterThan(0);
      expect(chain.steps[0].rule_applied).toContain("Pattern");
    });

    it("includes assumptions", () => {
      const chain = engine.buildInferenceChain(
        "Parameters for thick D2",
        "deductive",
        { material: "D2", thickness_mm: 80 }
      );

      expect(chain.assumptions.length).toBeGreaterThan(0);
    });

    it("identifies potential flaws", () => {
      const chain = engine.buildInferenceChain(
        "Learn patterns",
        "inductive",
        {}
      );

      expect(chain.potential_flaws.length).toBeGreaterThan(0);
    });

    it("chains steps with dependencies", () => {
      const chain = engine.buildInferenceChain(
        "Parameters",
        "deductive",
        { material: "D2", thickness_mm: 80 }
      );

      // Some steps should depend on earlier steps
      const hasDependent = chain.steps.some(s => s.dependencies.length > 0);
      expect(hasDependent).toBe(true);
    });

    it("includes carbide-specific rules", () => {
      const chain = engine.buildInferenceChain(
        "Parameters for carbide",
        "deductive",
        { material: "tungsten_carbide", thickness_mm: 25 }
      );

      const hasCoatedWireRule = chain.steps.some(s =>
        s.conclusion.toLowerCase().includes("coated") || s.conclusion.toLowerCase().includes("on time")
      );
      expect(hasCoatedWireRule).toBe(true);
    });
  });

  // ============================================================================
  // CONSTRAINT SOLVING TESTS
  // ============================================================================

  describe("solveConstraints", () => {
    it("finds feasible solution for standard requirements", () => {
      const solution = engine.solveConstraints({
        target_ra_um: 0.8,
        max_cycle_time_min: 60,
        thickness_mm: 25,
      });

      expect(solution.feasible).toBe(true);
      expect(solution.parameters.num_passes).toBeGreaterThan(0);
    });

    it("identifies violated constraints", () => {
      const solution = engine.solveConstraints({
        target_ra_um: 0.1, // Very tight Ra
        max_cycle_time_min: 5, // Very short time
        thickness_mm: 50,
      });

      // Should have constraints that conflict
      expect(solution.constraints_violated.length + solution.constraints_satisfied.length)
        .toBeGreaterThan(0);
    });

    it("provides parameters", () => {
      const solution = engine.solveConstraints({
        target_ra_um: 0.8,
        thickness_mm: 30,
      });

      expect(solution.parameters.num_passes).toBeDefined();
      expect(solution.parameters.on_time_us).toBeDefined();
      expect(solution.parameters.wire_tension_g).toBeDefined();
    });

    it("provides alternatives when infeasible", () => {
      const solution = engine.solveConstraints({
        target_ra_um: 0.05, // Impossible Ra
        thickness_mm: 100,
      });

      if (!solution.feasible) {
        expect(solution.alternatives.length).toBeGreaterThan(0);
      }
    });

    it("calculates optimization score", () => {
      const solution = engine.solveConstraints({
        target_ra_um: 0.8,
        thickness_mm: 25,
      });

      expect(solution.optimization_score).toBeGreaterThan(0);
      expect(solution.optimization_score).toBeLessThanOrEqual(1);
    });

    it("includes slack for soft constraints", () => {
      const solution = engine.solveConstraints({
        target_ra_um: 0.8,
        max_cycle_time_min: 120,
        thickness_mm: 25,
      });

      const softConstraints = solution.constraints_satisfied.filter(c => c.type === "soft");
      if (softConstraints.length > 0) {
        expect(softConstraints[0].slack).toBeDefined();
      }
    });
  });

  // ============================================================================
  // DECISION ANALYSIS TESTS
  // ============================================================================

  describe("analyzeDecision", () => {
    it("generates decision tree", () => {
      const analysis = engine.analyzeDecision("Which strategy?", {
        material: "D2",
        thickness_mm: 25,
      });

      expect(analysis.root).toBeDefined();
      expect(analysis.root.question).toBeTruthy();
      expect(analysis.root.branches.length).toBeGreaterThan(0);
    });

    it("determines optimal path", () => {
      const analysis = engine.analyzeDecision("Which wire?", {
        thickness_mm: 40,
      });

      expect(analysis.optimal_path.length).toBeGreaterThan(0);
    });

    it("provides expected outcomes", () => {
      const analysis = engine.analyzeDecision("Strategy?", {
        thickness_mm: 25,
      });

      expect(analysis.expected_outcomes).toBeDefined();
      expect(analysis.expected_outcomes.success_probability).toBeGreaterThan(0);
    });

    it("includes sensitivity analysis", () => {
      const analysis = engine.analyzeDecision("Strategy?", {
        thickness_mm: 25,
      });

      expect(analysis.sensitivity_analysis.length).toBeGreaterThan(0);
      for (const s of analysis.sensitivity_analysis) {
        expect(s.parameter).toBeTruthy();
        expect(s.impact).toMatch(/high|medium|low/);
      }
    });

    it("handles thin vs thick differently", () => {
      const thinAnalysis = engine.analyzeDecision("Strategy?", { thickness_mm: 20 });
      const thickAnalysis = engine.analyzeDecision("Strategy?", { thickness_mm: 80 });

      expect(thinAnalysis.optimal_path[0]).not.toBe(thickAnalysis.optimal_path[0]);
    });
  });

  // ============================================================================
  // HYPOTHESIS TESTING TESTS
  // ============================================================================

  describe("testHypothesis", () => {
    it("updates confidence with new evidence", () => {
      const hypothesis: Hypothesis = {
        id: "H001",
        statement: "Test hypothesis",
        confidence: 0.6,
        supporting_evidence: [],
        contradicting_evidence: [],
        tests_required: ["Run test"],
        implications: []
      };

      const result = engine.testHypothesis(hypothesis, [
        { source: "empirical", description: "Test passed", strength: 0.8 }
      ]);

      expect(result.updated_confidence).toBeGreaterThan(0.6);
    });

    it("decreases confidence with contradicting evidence", () => {
      const hypothesis: Hypothesis = {
        id: "H002",
        statement: "Test hypothesis",
        confidence: 0.7,
        supporting_evidence: [],
        contradicting_evidence: [],
        tests_required: [],
        implications: []
      };

      const result = engine.testHypothesis(hypothesis, [
        { source: "empirical", description: "Test failed", strength: 0.2 }
      ]);

      expect(result.updated_confidence).toBeLessThan(0.7);
    });

    it("returns verdict", () => {
      const hypothesis: Hypothesis = {
        id: "H003",
        statement: "Strong hypothesis",
        confidence: 0.8,
        supporting_evidence: [
          { source: "physics", description: "Evidence", strength: 0.9 }
        ],
        contradicting_evidence: [],
        tests_required: [],
        implications: []
      };

      const result = engine.testHypothesis(hypothesis);

      expect(result.verdict).toMatch(/supported|refuted|inconclusive/);
      expect(result.reasoning).toBeTruthy();
    });

    it("suggests tests for inconclusive cases", () => {
      const hypothesis: Hypothesis = {
        id: "H004",
        statement: "Uncertain hypothesis",
        confidence: 0.5,
        supporting_evidence: [
          { source: "tribal", description: "Some support", strength: 0.5 }
        ],
        contradicting_evidence: [
          { source: "empirical", description: "Some contradiction", strength: 0.4 }
        ],
        tests_required: ["Check parameter X"],
        implications: []
      };

      const result = engine.testHypothesis(hypothesis);

      if (result.verdict === "inconclusive") {
        expect(result.reasoning).toContain("test");
      }
    });
  });

  // ============================================================================
  // SINGLETON TESTS
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(wireEDMDeepLogicEngine).toBeDefined();
      expect(wireEDMDeepLogicEngine).toBeInstanceOf(WireEDMDeepLogicEngine);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty context", () => {
      const result = engine.reason("What parameters?", {});

      expect(result.conclusion).toBeTruthy();
      expect(result.knowledge_gaps.length).toBeGreaterThan(0);
    });

    it("handles missing query", () => {
      const result = engine.reason("", { material: "D2" });

      expect(result.mode).toBeDefined();
    });

    it("handles extreme thickness", () => {
      const result = engine.reason("Parameters for thick section", {
        thickness_mm: 200,
      });

      expect(result.conclusion).toBeTruthy();
    });

    it("handles exotic materials", () => {
      const result = engine.reason("Parameters", {
        material: "exotic_alloy_xyz",
      });

      expect(result.knowledge_gaps.some(g => g.includes("material"))).toBe(true);
    });
  });
});
