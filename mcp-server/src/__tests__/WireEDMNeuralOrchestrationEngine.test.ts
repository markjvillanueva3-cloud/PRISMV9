/**
 * WireEDMNeuralOrchestrationEngine Tests
 *
 * Tests Claude Opus-level intelligent orchestration:
 * - Multi-strategy evaluation
 * - Hybrid strategy generation
 * - Cost optimization
 * - Troubleshooting
 * - Learning from feedback
 *
 * @module __tests__/WireEDMNeuralOrchestrationEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wireEDMNeuralOrchestrationEngine,
  WireEDMNeuralOrchestrationEngine,
  type OrchestrationInput,
  type OrchestrationResult,
} from "../engines/WireEDMNeuralOrchestrationEngine.js";

describe("WireEDMNeuralOrchestrationEngine", () => {
  let engine: WireEDMNeuralOrchestrationEngine;

  beforeEach(() => {
    engine = new WireEDMNeuralOrchestrationEngine();
  });

  // ============================================================================
  // ORCHESTRATION TESTS
  // ============================================================================

  describe("orchestrate", () => {
    it("generates complete decision chain for standard input", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.8,
      };

      const result = engine.orchestrate(input);

      expect(result.success).toBe(true);
      expect(result.decision_chain).toBeDefined();
      expect(result.decision_chain.reasoning_steps.length).toBeGreaterThan(0);
      expect(result.recommended_parameters).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("includes all reasoning steps", () => {
      const input: OrchestrationInput = {
        material: "A2",
        thickness_mm: 50,
      };

      const result = engine.orchestrate(input);
      const steps = result.decision_chain.reasoning_steps;

      expect(steps.length).toBe(8);
      expect(steps[0].action).toBe("analyze_material");
      expect(steps[1].action).toBe("evaluate_strategies");
      expect(steps[2].action).toBe("apply_priority_weighting");
      expect(steps[3].action).toBe("filter_by_constraints");
      expect(steps[4].action).toBe("generate_hybrid");
      expect(steps[5].action).toBe("analyze_cost");
      expect(steps[6].action).toBe("assess_risks");
      expect(steps[7].action).toBe("generate_execution_plan");
    });

    it("evaluates multiple strategies", () => {
      const input: OrchestrationInput = {
        material: "M2",
        thickness_mm: 30,
      };

      const result = engine.orchestrate(input);

      expect(result.decision_chain.strategies_evaluated.length).toBeGreaterThan(0);
      for (const strategy of result.decision_chain.strategies_evaluated) {
        expect(strategy.strategy_id).toBeTruthy();
        expect(strategy.source).toMatch(/physics|neural|tribal/);
        expect(strategy.predicted_ra_um).toBeGreaterThan(0);
        expect(strategy.confidence).toBeGreaterThan(0);
      }
    });

    it("generates hybrid strategy combining sources", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 40,
        target_ra_um: 0.5,
      };

      const result = engine.orchestrate(input);
      const hybrid = result.decision_chain.hybrid_enhancement;

      expect(hybrid).toBeDefined();
      expect(hybrid!.components.length).toBeGreaterThan(0);
      expect(hybrid!.parameters.wire_type).toBeTruthy();
      expect(hybrid!.parameters.num_passes).toBeGreaterThan(0);
      expect(hybrid!.confidence_breakdown.combined_confidence).toBeGreaterThan(0);
    });

    it("provides cost analysis", () => {
      const input: OrchestrationInput = {
        material: "S7",
        thickness_mm: 35,
      };

      const result = engine.orchestrate(input);
      const cost = result.decision_chain.cost_analysis;

      expect(cost.wire_cost_usd).toBeGreaterThanOrEqual(0);
      expect(cost.machine_time_usd).toBeGreaterThan(0);
      expect(cost.labor_usd).toBeGreaterThan(0);
      expect(cost.total_usd).toBeGreaterThan(0);
      expect(cost.total_usd).toBeCloseTo(
        cost.wire_cost_usd + cost.machine_time_usd + cost.labor_usd + cost.overhead_usd,
        2
      );
    });

    it("generates execution plan", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 20,
      };

      const result = engine.orchestrate(input);
      const plan = result.decision_chain.execution_plan;

      expect(plan.length).toBeGreaterThan(0);
      expect(plan[0]).toContain("Setup");
      expect(plan.some(step => step.includes("passes"))).toBe(true);
    });

    it("warns for unknown materials", () => {
      const input: OrchestrationInput = {
        material: "unobtanium",
        thickness_mm: 25,
      };

      const result = engine.orchestrate(input);

      expect(result.warnings.some(w => w.includes("Unknown material"))).toBe(true);
    });

    it("provides alternatives", () => {
      const input: OrchestrationInput = {
        material: "A2",
        thickness_mm: 30,
      };

      const result = engine.orchestrate(input);

      expect(result.alternatives.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // PRIORITY WEIGHTING TESTS
  // ============================================================================

  describe("priority weighting", () => {
    it("applies speed priority correctly", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 30,
        priority: "speed",
      };

      const result = engine.orchestrate(input);
      const selected = result.decision_chain.selected_strategy;

      // Speed priority should favor faster strategies
      expect(result.decision_chain.reasoning_steps[2].rationale).toContain("speed");
    });

    it("applies quality priority correctly", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 30,
        priority: "quality",
      };

      const result = engine.orchestrate(input);

      expect(result.decision_chain.reasoning_steps[2].rationale).toContain("quality");
    });

    it("applies cost priority correctly", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 30,
        priority: "cost",
      };

      const result = engine.orchestrate(input);

      expect(result.decision_chain.reasoning_steps[2].rationale).toContain("cost");
    });

    it("defaults to balanced priority", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 30,
      };

      const result = engine.orchestrate(input);

      expect(result.decision_chain.reasoning_steps[2].rationale).toContain("balanced");
    });
  });

  // ============================================================================
  // CONSTRAINT HANDLING TESTS
  // ============================================================================

  describe("constraint handling", () => {
    it("filters strategies by max cycle time", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 50,
        constraints: {
          max_cycle_time_min: 10,
        },
      };

      const result = engine.orchestrate(input);

      // Should still succeed even with tight constraints
      expect(result.success).toBe(true);
    });

    it("filters strategies by max wire consumption", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 30,
        constraints: {
          max_wire_consumption_m: 5,
        },
      };

      const result = engine.orchestrate(input);

      expect(result.success).toBe(true);
    });

    it("warns when no strategies meet constraints", () => {
      const input: OrchestrationInput = {
        material: "D2",
        thickness_mm: 100,
        constraints: {
          max_cycle_time_min: 1,
          max_wire_consumption_m: 0.1,
        },
      };

      const result = engine.orchestrate(input);

      expect(result.warnings.some(w => w.includes("constraints"))).toBe(true);
    });
  });

  // ============================================================================
  // MATERIAL HANDLING TESTS
  // ============================================================================

  describe("material handling", () => {
    it("handles tool steels correctly", () => {
      for (const material of ["D2", "A2", "M2", "S7", "H13"]) {
        const result = engine.orchestrate({ material, thickness_mm: 25 });
        expect(result.success).toBe(true);
        expect(result.warnings.length).toBe(0);
      }
    });

    it("handles carbide with higher risk", () => {
      const result = engine.orchestrate({
        material: "tungsten_carbide",
        thickness_mm: 25,
      });

      expect(result.success).toBe(true);
      expect(result.decision_chain.risk_mitigations.some(m => m.includes("carbide"))).toBe(true);
    });

    it("handles copper with adjusted parameters", () => {
      const result = engine.orchestrate({
        material: "copper",
        thickness_mm: 20,
      });

      expect(result.success).toBe(true);
      expect(result.decision_chain.hybrid_enhancement!.expected_outcomes.ra_um).toBeLessThan(0.5);
    });

    it("handles graphite", () => {
      const result = engine.orchestrate({
        material: "graphite",
        thickness_mm: 30,
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // THICKNESS HANDLING TESTS
  // ============================================================================

  describe("thickness handling", () => {
    it("handles thin sections (< 10mm)", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 5,
      });

      expect(result.success).toBe(true);
      expect(result.recommended_parameters.wire_diameter).toBe("0.20");
    });

    it("handles medium sections (10-50mm)", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 30,
      });

      expect(result.success).toBe(true);
      expect(result.recommended_parameters.wire_diameter).toBe("0.25");
    });

    it("handles thick sections (> 50mm)", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 80,
      });

      expect(result.success).toBe(true);
      expect(result.recommended_parameters.wire_diameter).toBe("0.30");
      expect(result.decision_chain.risk_mitigations.length).toBeGreaterThan(0);
    });

    it("handles extreme thickness (> 100mm)", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 120,
      });

      expect(result.success).toBe(true);
      expect(result.decision_chain.risk_mitigations.some(m => m.includes("thick"))).toBe(true);
    });
  });

  // ============================================================================
  // QUICK PARAMETERS TESTS
  // ============================================================================

  describe("getQuickParameters", () => {
    it("returns parameters without full decision chain", () => {
      const params = engine.getQuickParameters("D2", 25, 0.8);

      expect(params.wire_type).toBe("brass");
      expect(params.num_passes).toBeGreaterThan(0);
      expect(params.on_time_us).toBeGreaterThan(0);
      expect(params.off_time_us).toBeGreaterThan(0);
    });

    it("adjusts passes for fine finish target", () => {
      const finishParams = engine.getQuickParameters("D2", 25, 0.3);
      const roughParams = engine.getQuickParameters("D2", 25, 1.2);

      expect(finishParams.num_passes).toBeGreaterThan(roughParams.num_passes);
    });
  });

  // ============================================================================
  // COST OPTIMIZATION TESTS
  // ============================================================================

  describe("optimizeForCost", () => {
    it("returns min cost and best value strategies", () => {
      const result = engine.optimizeForCost({
        material: "D2",
        thickness_mm: 30,
      });

      expect(result.min_cost_strategy).toBeDefined();
      expect(result.best_value_strategy).toBeDefined();
      expect(result.cost_comparison.length).toBeGreaterThan(0);
    });

    it("includes value scores in comparison", () => {
      const result = engine.optimizeForCost({
        material: "A2",
        thickness_mm: 40,
      });

      for (const item of result.cost_comparison) {
        expect(item.strategy).toBeTruthy();
        expect(item.cost).toBeGreaterThan(0);
        expect(item.value_score).toBeGreaterThan(0);
      }
    });

    it("min cost strategy has lowest cost", () => {
      const result = engine.optimizeForCost({
        material: "D2",
        thickness_mm: 25,
      });

      const minCost = result.min_cost_strategy.predicted_cost_usd;
      for (const item of result.cost_comparison) {
        expect(item.cost).toBeGreaterThanOrEqual(minCost - 0.01);
      }
    });
  });

  // ============================================================================
  // TROUBLESHOOTING TESTS
  // ============================================================================

  describe("troubleshoot", () => {
    it("diagnoses wire break symptoms", () => {
      const result = engine.troubleshoot(["wire breaks frequently"]);

      expect(result.root_causes.length).toBeGreaterThan(0);
      expect(result.root_causes[0].probability).toBeGreaterThan(0);
      expect(result.immediate_actions.length).toBeGreaterThan(0);
      expect(result.parameter_adjustments.on_time_us).toBeDefined();
    });

    it("diagnoses poor finish symptoms", () => {
      const result = engine.troubleshoot(["poor finish on part"]);

      expect(result.root_causes.length).toBeGreaterThan(0);
      expect(result.root_causes.some(c => c.cause.toLowerCase().includes("skim") || c.cause.toLowerCase().includes("vibration"))).toBe(true);
      expect(result.parameter_adjustments.num_passes).toBeDefined();
    });

    it("diagnoses slow cutting symptoms", () => {
      const result = engine.troubleshoot(["cutting too slow"]);

      expect(result.immediate_actions.some(a => a.includes("ON time"))).toBe(true);
    });

    it("diagnoses taper/barrel symptoms", () => {
      const result = engine.troubleshoot(["barrel shape in thick section"]);

      expect(result.root_causes.some(c => c.cause.includes("deflection"))).toBe(true);
      expect(result.parameter_adjustments.wire_tension_g).toBeDefined();
    });

    it("handles multiple symptoms", () => {
      const result = engine.troubleshoot([
        "wire breaks",
        "poor finish",
        "slow speed",
      ]);

      expect(result.root_causes.length).toBeGreaterThan(2);
      expect(result.immediate_actions.length).toBeGreaterThan(3);
    });

    it("sorts root causes by probability", () => {
      const result = engine.troubleshoot(["wire breaks", "poor finish"]);

      for (let i = 1; i < result.root_causes.length; i++) {
        expect(result.root_causes[i - 1].probability)
          .toBeGreaterThanOrEqual(result.root_causes[i].probability);
      }
    });
  });

  // ============================================================================
  // STRATEGY COMPARISON TESTS
  // ============================================================================

  describe("compareStrategies", () => {
    it("compares strategies head to head", () => {
      const result = engine.compareStrategies(
        { material: "D2", thickness_mm: 30 },
        ["physics_standard", "neural_optimized"]
      );

      expect(result.comparison_matrix).toBeDefined();
      expect(result.winner).toBeTruthy();
      expect(result.reasoning).toBeTruthy();
    });

    it("returns metrics for each strategy", () => {
      const result = engine.compareStrategies(
        { material: "D2", thickness_mm: 25 },
        ["physics_standard", "tribal_jmdie"]
      );

      for (const strategyId of Object.keys(result.comparison_matrix)) {
        const metrics = result.comparison_matrix[strategyId];
        expect(metrics.predicted_ra_um).toBeGreaterThan(0);
        expect(metrics.confidence).toBeGreaterThan(0);
      }
    });

    it("handles no matching strategies", () => {
      const result = engine.compareStrategies(
        { material: "D2", thickness_mm: 25 },
        ["nonexistent_strategy"]
      );

      expect(result.winner).toBe("none");
    });
  });

  // ============================================================================
  // FEEDBACK LEARNING TESTS
  // ============================================================================

  describe("recordFeedback", () => {
    it("records successful feedback", () => {
      const update = engine.recordFeedback({
        decision_id: "wedm-decision-123",
        actual_ra_um: 0.7,
        actual_cycle_time_min: 25,
        success: true,
        timestamp: new Date().toISOString(),
      });

      expect(update.patterns_learned.length).toBeGreaterThan(0);
    });

    it("learns from failures", () => {
      const update = engine.recordFeedback({
        decision_id: "wedm-decision-456",
        success: false,
        issues: ["wire break", "poor finish"],
        timestamp: new Date().toISOString(),
      });

      expect(update.patterns_learned.some(p => p.includes("Wire break"))).toBe(true);
      expect(update.patterns_learned.some(p => p.includes("Poor finish"))).toBe(true);
    });

    it("adjusts strategy weights", () => {
      // Success should increase weight
      const successUpdate = engine.recordFeedback({
        decision_id: "wedm-decision-physics_standard",
        success: true,
        timestamp: new Date().toISOString(),
      });

      // Failure should decrease weight
      const failureUpdate = engine.recordFeedback({
        decision_id: "wedm-decision-physics_standard",
        success: false,
        timestamp: new Date().toISOString(),
      });

      expect(successUpdate.updated_weights).toBeDefined();
      expect(failureUpdate.updated_weights).toBeDefined();
    });
  });

  // ============================================================================
  // GEOMETRY HANDLING TESTS
  // ============================================================================

  describe("geometry handling", () => {
    it("handles straight geometry", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 25,
        geometry: "straight",
      });

      expect(result.success).toBe(true);
    });

    it("handles complex geometry", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 25,
        geometry: "complex",
      });

      expect(result.success).toBe(true);
    });

    it("handles corner-heavy geometry with mitigations", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 25,
        geometry: "corner_heavy",
      });

      expect(result.success).toBe(true);
      expect(result.decision_chain.risk_mitigations.some(m => m.includes("corner"))).toBe(true);
    });

    it("handles taper geometry with mitigations", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 25,
        geometry: "taper",
      });

      expect(result.success).toBe(true);
    });
  });

  // ============================================================================
  // SINGLETON TESTS
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(wireEDMNeuralOrchestrationEngine).toBeDefined();
      expect(wireEDMNeuralOrchestrationEngine).toBeInstanceOf(WireEDMNeuralOrchestrationEngine);
    });

    it("singleton produces consistent results", () => {
      const result1 = wireEDMNeuralOrchestrationEngine.orchestrate({
        material: "D2",
        thickness_mm: 25,
      });
      const result2 = wireEDMNeuralOrchestrationEngine.orchestrate({
        material: "D2",
        thickness_mm: 25,
      });

      expect(result1.recommended_parameters.num_passes)
        .toBe(result2.recommended_parameters.num_passes);
    });
  });

  // ============================================================================
  // EDGE CASE TESTS
  // ============================================================================

  describe("edge cases", () => {
    it("handles zero thickness", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 0,
      });

      expect(result.success).toBe(true);
    });

    it("handles very thin section (1mm)", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 1,
      });

      expect(result.success).toBe(true);
    });

    it("handles extreme Ra target", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.1,
      });

      expect(result.success).toBe(true);
      expect(result.recommended_parameters.num_passes).toBeGreaterThanOrEqual(5);
    });

    it("handles no target Ra", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.success).toBe(true);
    });

    it("handles empty observations", () => {
      const result = engine.orchestrate({
        material: "D2",
        thickness_mm: 25,
        observations: [],
      });

      expect(result.success).toBe(true);
    });
  });
});
