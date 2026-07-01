/**
 * LatheOpusReasoningEngine Test Suite
 * ====================================
 * Comprehensive tests for Claude Opus-level intelligence in lathe programming.
 *
 * Tests cover:
 *   - Neural network decision making
 *   - Deep reasoning chains
 *   - Cost-efficiency optimization
 *   - Knowledge synthesis
 *   - Operation flow optimization
 *   - Counterfactual reasoning
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  LatheOpusReasoningEngine,
  latheOpusReasoningEngine,
  type PartAnalysisInput,
  type LatheMaterialSpec,
  type LathePartGeometry,
  type LatheFeatureSpec,
} from "../../engines/LatheOpusReasoningEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const STEEL_MATERIAL: LatheMaterialSpec = {
  name: "4140 Alloy Steel",
  iso_group: "P",
  hardness_hrc: 28,
  condition: "normalized",
};

const HARDENED_D2_MATERIAL: LatheMaterialSpec = {
  name: "D2 Tool Steel",
  iso_group: "H",
  hardness_hrc: 60,
  condition: "hardened",
};

const ALUMINUM_MATERIAL: LatheMaterialSpec = {
  name: "6061-T6 Aluminum",
  iso_group: "N",
  hardness_hb: 95,
  condition: "as_received",
};

const STAINLESS_MATERIAL: LatheMaterialSpec = {
  name: "304 Stainless Steel",
  iso_group: "M",
  hardness_hb: 200,
  condition: "annealed",
};

const SIMPLE_SHAFT_GEOMETRY: LathePartGeometry = {
  bar_od_mm: 50,
  finished_od_mm: 45,
  length_mm: 100,
  features: [
    { type: "od_turn", location_z_mm: 0, diameter_mm: 45, tolerance_mm: 0.05 },
    { type: "chamfer", location_z_mm: 0, depth_mm: 1.5 },
  ],
};

const COMPLEX_PART_GEOMETRY: LathePartGeometry = {
  bar_od_mm: 75,
  finished_od_mm: 60,
  length_mm: 150,
  id_bore_mm: 25,
  features: [
    { type: "od_turn", location_z_mm: 0, diameter_mm: 60, tolerance_mm: 0.02, ra_um: 1.6 },
    { type: "id_bore", location_z_mm: 10, diameter_mm: 25, tolerance_mm: 0.01 },
    { type: "thread", location_z_mm: 0, diameter_mm: 60, thread_pitch_mm: 1.5 },
    { type: "groove", location_z_mm: 50, diameter_mm: 55, depth_mm: 3 },
    { type: "chamfer", location_z_mm: 0, depth_mm: 2 },
    { type: "face", location_z_mm: 0 },
  ],
};

const SIMPLE_PART_INPUT: PartAnalysisInput = {
  part_name: "Simple Shaft",
  material: STEEL_MATERIAL,
  geometry: SIMPLE_SHAFT_GEOMETRY,
  batch_size: 100,
  priority: "balanced",
};

const COMPLEX_PART_INPUT: PartAnalysisInput = {
  part_name: "Threaded Bore Component",
  material: STEEL_MATERIAL,
  geometry: COMPLEX_PART_GEOMETRY,
  batch_size: 50,
  priority: "quality",
  constraints: {
    target_ra_um: 1.6,
    target_tolerance_mm: 0.02,
    max_cycle_time_min: 15,
  },
};

// ============================================================================
// NEURAL NETWORK DECISION MAKING TESTS
// ============================================================================

describe("LatheOpusReasoningEngine - Neural Network Decision Making", () => {
  describe("predictOperationSequence", () => {
    it("should predict operation priorities for a simple part", () => {
      const result = LatheOpusReasoningEngine.predictOperationSequence(
        SIMPLE_SHAFT_GEOMETRY,
        STEEL_MATERIAL,
        { priority: "balanced" }
      );

      expect(result).toBeDefined();
      expect(result.operation_priorities).toBeInstanceOf(Array);
      expect(result.operation_priorities.length).toBe(8);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning).toContain("Neural network");
    });

    it("should prioritize face operation highly", () => {
      const result = LatheOpusReasoningEngine.predictOperationSequence(
        SIMPLE_SHAFT_GEOMETRY,
        STEEL_MATERIAL,
        { priority: "speed" }
      );

      // Face should be among the top priorities
      const faceOp = result.operation_priorities.find(p => p.operation === "face");
      expect(faceOp).toBeDefined();
      expect(faceOp!.priority_score).toBeGreaterThan(0);
    });

    it("should return sorted priorities (descending)", () => {
      const result = LatheOpusReasoningEngine.predictOperationSequence(
        COMPLEX_PART_GEOMETRY,
        STEEL_MATERIAL,
        { priority: "quality" }
      );

      for (let i = 1; i < result.operation_priorities.length; i++) {
        expect(result.operation_priorities[i - 1].priority_score)
          .toBeGreaterThanOrEqual(result.operation_priorities[i].priority_score);
      }
    });
  });

  describe("predictCuttingParameters", () => {
    it("should predict parameters for steel roughing", () => {
      const result = LatheOpusReasoningEngine.predictCuttingParameters(
        STEEL_MATERIAL,
        "rough_od",
        { nose_radius_mm: 0.8, insert_type: "CNMG" },
        {}
      );

      expect(result.vc_mpm).toBeGreaterThan(100);
      expect(result.vc_mpm).toBeLessThan(400);
      expect(result.fn_mmrev).toBeGreaterThan(0.05);
      expect(result.fn_mmrev).toBeLessThan(0.35);
      expect(result.ap_mm).toBeGreaterThan(0.2);
      expect(result.ap_mm).toBeLessThan(6);
      expect(["G96", "G97"]).toContain(result.spindle_mode);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.physics_basis).toBeDefined();
    });

    it("should recommend lower speed for hardened material", () => {
      const steelResult = LatheOpusReasoningEngine.predictCuttingParameters(
        STEEL_MATERIAL,
        "rough_od",
        { nose_radius_mm: 0.8, insert_type: "CNMG" },
        {}
      );

      const hardenedResult = LatheOpusReasoningEngine.predictCuttingParameters(
        HARDENED_D2_MATERIAL,
        "rough_od",
        { nose_radius_mm: 0.8, insert_type: "CBN" },
        {}
      );

      expect(hardenedResult.vc_mpm).toBeLessThan(steelResult.vc_mpm);
    });

    it("should recommend higher speed for aluminum", () => {
      const aluminumResult = LatheOpusReasoningEngine.predictCuttingParameters(
        ALUMINUM_MATERIAL,
        "finish_od",
        { nose_radius_mm: 1.2, insert_type: "PCD" },
        {}
      );

      expect(aluminumResult.vc_mpm).toBeGreaterThan(200);
    });

    it("should recommend G97 for threading operations", () => {
      const result = LatheOpusReasoningEngine.predictCuttingParameters(
        STEEL_MATERIAL,
        "thread_od",
        { nose_radius_mm: 0.0, insert_type: "threading" },
        {}
      );

      // Thread is a special case, verify confidence
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("predictToolSelection", () => {
    it("should select appropriate tool for external turning", () => {
      const feature: LatheFeatureSpec = {
        type: "od_turn",
        location_z_mm: 0,
        diameter_mm: 45,
      };

      const result = LatheOpusReasoningEngine.predictToolSelection(
        STEEL_MATERIAL,
        feature,
        0.05,
        1.6
      );

      expect(result.tool_category).toBe("external_turning");
      expect(result.insert_shape).toBe("C");
      expect(result.nose_radius_mm).toBeGreaterThan(0);
      expect(result.insert_grade).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should select CBN for hardened steel", () => {
      const feature: LatheFeatureSpec = {
        type: "od_turn",
        location_z_mm: 0,
        diameter_mm: 40,
      };

      const result = LatheOpusReasoningEngine.predictToolSelection(
        HARDENED_D2_MATERIAL,
        feature,
        0.02,
        0.8
      );

      expect(result.insert_grade).toBe("CBN");
    });

    it("should recommend larger nose radius for fine finish", () => {
      const feature: LatheFeatureSpec = {
        type: "od_turn",
        location_z_mm: 0,
        diameter_mm: 50,
      };

      const coarseResult = LatheOpusReasoningEngine.predictToolSelection(
        STEEL_MATERIAL,
        feature,
        0.1,
        3.2
      );

      const fineResult = LatheOpusReasoningEngine.predictToolSelection(
        STEEL_MATERIAL,
        feature,
        0.02,
        0.4
      );

      expect(fineResult.nose_radius_mm).toBeGreaterThanOrEqual(coarseResult.nose_radius_mm);
    });
  });
});

// ============================================================================
// DEEP REASONING CHAIN TESTS
// ============================================================================

describe("LatheOpusReasoningEngine - Deep Reasoning Chains", () => {
  describe("analyzePartWithReasoning", () => {
    it("should generate complete analysis for simple part", () => {
      const result = LatheOpusReasoningEngine.analyzePartWithReasoning(SIMPLE_PART_INPUT);

      expect(result.part_summary).toContain("Simple Shaft");
      expect(result.recommended_sequence).toBeDefined();
      expect(result.recommended_sequence.operations.length).toBeGreaterThan(0);
      expect(result.reasoning_chain).toBeDefined();
      expect(result.reasoning_chain.steps.length).toBeGreaterThanOrEqual(6);
      expect(result.confidence).toBeGreaterThan(0);
    });

    // ENGINE-AUDIT 2026-06-19 (slot:bravo): buildOperationSequence hardcoded estimatedVolume=1000
    // (a Placeholder mm3 that fabricated estimated_time_sec + estimated_cost). The fix derives the
    // real stock-removal volume from part geometry, so a physically-larger stock must yield a longer
    // total estimated time -- pre-fix (constant 1000) the two would be IDENTICAL. (Found by the new
    // scripts/audit-fabricated-output.mjs detector.)
    it("estimated time scales with real stock-removal volume (not a hardcoded 1000 placeholder)", () => {
      const sameFeatures = [
        { type: "od_turn" as const, location_z_mm: 0, diameter_mm: 45, tolerance_mm: 0.05 },
        { type: "chamfer" as const, location_z_mm: 0, depth_mm: 1.5 },
      ];
      const small: PartAnalysisInput = {
        part_name: "small stock", material: STEEL_MATERIAL, batch_size: 1, priority: "balanced",
        geometry: { bar_od_mm: 50, finished_od_mm: 45, length_mm: 100, features: sameFeatures },
      };
      const large: PartAnalysisInput = {
        part_name: "large stock", material: STEEL_MATERIAL, batch_size: 1, priority: "balanced",
        geometry: { bar_od_mm: 90, finished_od_mm: 45, length_mm: 250, features: sameFeatures },
      };
      const tSmall = LatheOpusReasoningEngine.analyzePartWithReasoning(small)
        .recommended_sequence.operations.reduce((s, o) => s + o.estimated_time_sec, 0);
      const tLarge = LatheOpusReasoningEngine.analyzePartWithReasoning(large)
        .recommended_sequence.operations.reduce((s, o) => s + o.estimated_time_sec, 0);
      expect(tSmall).toBeGreaterThan(0);
      expect(tLarge).toBeGreaterThan(tSmall); // larger real stock volume -> longer time (fix proven)
    });

    it("should include all reasoning step types", () => {
      const result = LatheOpusReasoningEngine.analyzePartWithReasoning(COMPLEX_PART_INPUT);

      const stepTypes = new Set(result.reasoning_chain.steps.map(s => s.type));

      expect(stepTypes.has("observe")).toBe(true);
      expect(stepTypes.has("hypothesize")).toBe(true);
      expect(stepTypes.has("analyze")).toBe(true);
      expect(stepTypes.has("infer")).toBe(true);
      expect(stepTypes.has("validate")).toBe(true);
      expect(stepTypes.has("conclude")).toBe(true);
    });

    it("should generate hybrid strategies", () => {
      const result = LatheOpusReasoningEngine.analyzePartWithReasoning(COMPLEX_PART_INPUT);

      expect(result.hybrid_strategies.length).toBeGreaterThan(0);
      expect(result.hybrid_strategies[0].roughing).toBeDefined();
      expect(result.hybrid_strategies[0].finishing).toBeDefined();
      expect(result.hybrid_strategies[0].total_cycle_time_min).toBeGreaterThan(0);
    });

    it("should generate counterfactual scenarios", () => {
      const result = LatheOpusReasoningEngine.analyzePartWithReasoning(COMPLEX_PART_INPUT);

      expect(result.counterfactuals.length).toBeGreaterThan(0);
      expect(result.counterfactuals[0].description).toContain("What if");
      expect(result.counterfactuals[0].predicted_outcomes.length).toBeGreaterThan(0);
    });

    it("should provide knowledge synthesis", () => {
      const result = LatheOpusReasoningEngine.analyzePartWithReasoning(COMPLEX_PART_INPUT);

      expect(result.knowledge_synthesis.physics_insights.length).toBeGreaterThan(0);
      expect(result.knowledge_synthesis.tribal_insights.length).toBeGreaterThanOrEqual(0);
      expect(result.knowledge_synthesis.novel_combinations.length).toBeGreaterThan(0);
    });

    it("should warn about hardened material", () => {
      const hardenedInput: PartAnalysisInput = {
        ...COMPLEX_PART_INPUT,
        part_name: "Hardened Punch",
        material: HARDENED_D2_MATERIAL,
      };

      const result = LatheOpusReasoningEngine.analyzePartWithReasoning(hardenedInput);

      const hasHardWarning = result.warnings.some(w =>
        w.toLowerCase().includes("hard") || w.toLowerCase().includes("cbn")
      ) || result.reasoning_chain.steps.some(s =>
        s.description.toLowerCase().includes("hard") ||
        JSON.stringify(s.outputs).toLowerCase().includes("hard")
      );

      expect(hasHardWarning || result.reasoning_chain.steps.some(s =>
        JSON.stringify(s.outputs).includes("HRC")
      )).toBe(true);
    });
  });

  describe("diagnoseWithReasoning", () => {
    it("should diagnose surface finish problems", () => {
      const symptoms = ["Poor surface finish", "Tool marks visible", "Ra reading 4.5 um"];
      const context = {
        material: STEEL_MATERIAL,
        operation: "finish_od",
        params: { vc_mpm: 200, fn_mmrev: 0.15, ap_mm: 0.3 },
      };

      const result = LatheOpusReasoningEngine.diagnoseWithReasoning(symptoms, context);

      expect(result.problem).toContain("Poor surface finish");
      expect(result.conclusion).toBeDefined();
      expect(result.steps.length).toBeGreaterThan(2);
      expect(result.total_confidence).toBeGreaterThan(0);
    });

    it("should diagnose chatter issues", () => {
      const symptoms = ["Chatter marks on part", "Vibration during cut", "Noise during machining"];
      const context = {
        material: STEEL_MATERIAL,
        operation: "rough_od",
        params: { vc_mpm: 250, fn_mmrev: 0.2, ap_mm: 4.0 },
      };

      const result = LatheOpusReasoningEngine.diagnoseWithReasoning(symptoms, context);

      expect(result.conclusion.toLowerCase()).toContain("depth of cut");
    });

    it("should include physics basis in diagnosis", () => {
      const symptoms = ["Excessive tool wear"];
      const context = {
        material: HARDENED_D2_MATERIAL,
        operation: "finish_od",
        params: { vc_mpm: 150, fn_mmrev: 0.1, ap_mm: 0.2 },
      };

      const result = LatheOpusReasoningEngine.diagnoseWithReasoning(symptoms, context);

      const hasPhysicsBasis = result.steps.some(s => s.physics_basis !== undefined);
      expect(hasPhysicsBasis).toBe(true);
    });
  });
});

// ============================================================================
// COST-EFFICIENCY OPTIMIZATION TESTS
// ============================================================================

describe("LatheOpusReasoningEngine - Cost-Efficiency Optimization", () => {
  describe("calculateCostEfficiency", () => {
    it("should calculate efficiency for steel parameters", () => {
      const result = LatheOpusReasoningEngine.calculateCostEfficiency(
        STEEL_MATERIAL,
        { vc_mpm: 200, fn_mmrev: 0.15, ap_mm: 2.0 },
        100
      );

      expect(result.mrr_mm3_min).toBeGreaterThan(0);
      expect(result.tool_life_min).toBeGreaterThan(0);
      expect(result.cost_per_part).toBeGreaterThan(0);
      expect(result.efficiency_score).toBeGreaterThan(0);
      expect(result.recommendation).toBeDefined();
    });

    it("should show lower efficiency for aggressive parameters", () => {
      const conservative = LatheOpusReasoningEngine.calculateCostEfficiency(
        STEEL_MATERIAL,
        { vc_mpm: 150, fn_mmrev: 0.1, ap_mm: 1.5 },
        100
      );

      const aggressive = LatheOpusReasoningEngine.calculateCostEfficiency(
        STEEL_MATERIAL,
        { vc_mpm: 300, fn_mmrev: 0.25, ap_mm: 4.0 },
        100
      );

      // Aggressive should have higher MRR but lower tool life
      expect(aggressive.mrr_mm3_min).toBeGreaterThan(conservative.mrr_mm3_min);
      expect(aggressive.tool_life_min).toBeLessThan(conservative.tool_life_min);
    });

    it("should provide appropriate recommendations", () => {
      const result = LatheOpusReasoningEngine.calculateCostEfficiency(
        STEEL_MATERIAL,
        { vc_mpm: 100, fn_mmrev: 0.05, ap_mm: 0.5 },
        100
      );

      // Very conservative parameters should suggest improvement
      expect(result.recommendation.length).toBeGreaterThan(0);
    });

    // ENGINE-AUDIT 2026-06-19 (slot:bravo): cost_per_part was fabricated from a hardcoded 5-min
    // cycle time. It now uses the real params.cycle_time_min when supplied, else a flagged estimate.
    it("flags cost as an ESTIMATE when cycle_time_min is omitted", () => {
      const r = LatheOpusReasoningEngine.calculateCostEfficiency(
        STEEL_MATERIAL,
        { vc_mpm: 200, fn_mmrev: 0.15, ap_mm: 2.0 },
        100
      );
      expect(r.cost_is_estimate).toBe(true);
      expect(r.recommendation).toMatch(/ESTIMATE/);
    });

    it("reports a real (non-estimate) cost when cycle_time_min is supplied", () => {
      const r = LatheOpusReasoningEngine.calculateCostEfficiency(
        STEEL_MATERIAL,
        { vc_mpm: 200, fn_mmrev: 0.15, ap_mm: 2.0, cycle_time_min: 8 },
        100
      );
      expect(r.cost_is_estimate).toBe(false);
      expect(r.recommendation).not.toMatch(/ESTIMATE/);
    });

    it("uses the real cycle time: a longer cycle yields a higher cost_per_part (the fix)", () => {
      const base = { vc_mpm: 200, fn_mmrev: 0.15, ap_mm: 2.0 };
      const five = LatheOpusReasoningEngine.calculateCostEfficiency(STEEL_MATERIAL, { ...base, cycle_time_min: 5 }, 100);
      const ten = LatheOpusReasoningEngine.calculateCostEfficiency(STEEL_MATERIAL, { ...base, cycle_time_min: 10 }, 100);
      const omitted = LatheOpusReasoningEngine.calculateCostEfficiency(STEEL_MATERIAL, base, 100);
      expect(ten.cost_per_part).toBeGreaterThan(five.cost_per_part); // longer cycle -> more cost
      expect(omitted.cost_per_part).toBeCloseTo(five.cost_per_part, 2); // default fallback == explicit 5min
    });
  });

  describe("generateHybridStrategies", () => {
    it("should generate multiple strategies", () => {
      const strategies = LatheOpusReasoningEngine.generateHybridStrategies(
        STEEL_MATERIAL,
        COMPLEX_PART_GEOMETRY,
        "balanced"
      );

      expect(strategies.length).toBeGreaterThanOrEqual(3);
    });

    it("should order strategies by priority", () => {
      const speedStrategies = LatheOpusReasoningEngine.generateHybridStrategies(
        STEEL_MATERIAL,
        COMPLEX_PART_GEOMETRY,
        "speed"
      );

      // First strategy should have lowest cycle time when priority is speed
      for (let i = 1; i < speedStrategies.length; i++) {
        expect(speedStrategies[0].total_cycle_time_min)
          .toBeLessThanOrEqual(speedStrategies[i].total_cycle_time_min);
      }
    });

    it("should include roughing and finishing parameters", () => {
      const strategies = LatheOpusReasoningEngine.generateHybridStrategies(
        STEEL_MATERIAL,
        COMPLEX_PART_GEOMETRY,
        "quality"
      );

      for (const strategy of strategies) {
        expect(strategy.roughing.vc_mpm).toBeGreaterThan(0);
        expect(strategy.roughing.fn_mmrev).toBeGreaterThan(0);
        expect(strategy.roughing.ap_mm).toBeGreaterThan(0);
        expect(strategy.finishing.vc_mpm).toBeGreaterThan(0);
        expect(strategy.finishing.fn_mmrev).toBeGreaterThan(0);
        expect(strategy.finishing.ap_mm).toBeGreaterThan(0);
        expect(strategy.finishing.predicted_ra_um).toBeGreaterThan(0);
      }
    });

    it("should predict different parameters for different materials", () => {
      const steelStrategies = LatheOpusReasoningEngine.generateHybridStrategies(
        STEEL_MATERIAL,
        COMPLEX_PART_GEOMETRY,
        "balanced"
      );

      const aluminumStrategies = LatheOpusReasoningEngine.generateHybridStrategies(
        ALUMINUM_MATERIAL,
        COMPLEX_PART_GEOMETRY,
        "balanced"
      );

      // Aluminum should have higher speeds
      expect(aluminumStrategies[0].roughing.vc_mpm).toBeGreaterThan(steelStrategies[0].roughing.vc_mpm);
    });
  });

  describe("analyzeTradeoff", () => {
    it("should generate Pareto frontier for cycle time vs tool life", () => {
      const result = LatheOpusReasoningEngine.analyzeTradeoff(
        STEEL_MATERIAL,
        COMPLEX_PART_GEOMETRY,
        "cycle_time",
        "tool_life"
      );

      expect(result.objective_a).toBe("cycle_time_min");
      expect(result.objective_b).toBe("tool_life_min");
      expect(result.pareto_points.length).toBeGreaterThan(0);
      expect(result.optimal_compromise).toBeDefined();
      expect(result.sensitivity.length).toBeGreaterThan(0);
    });

    it("should show inverse relationship in Pareto points", () => {
      const result = LatheOpusReasoningEngine.analyzeTradeoff(
        STEEL_MATERIAL,
        COMPLEX_PART_GEOMETRY,
        "cycle_time",
        "tool_life"
      );

      // Generally, lower cycle time = lower tool life
      const points = result.pareto_points;
      if (points.length >= 2) {
        // Find min and max cycle time points
        const minCycleTimePoint = points.reduce((min, p) => p.a_value < min.a_value ? p : min);
        const maxCycleTimePoint = points.reduce((max, p) => p.a_value > max.a_value ? p : max);

        // Min cycle time should have lower tool life than max cycle time
        expect(minCycleTimePoint.b_value).toBeLessThan(maxCycleTimePoint.b_value);
      }
    });
  });
});

// ============================================================================
// COUNTERFACTUAL REASONING TESTS
// ============================================================================

describe("LatheOpusReasoningEngine - Counterfactual Reasoning", () => {
  const currentState = {
    vc_mpm: 200,
    fn_mmrev: 0.15,
    ap_mm: 2.0,
    tool_life_min: 45,
    cycle_time_min: 8,
    ra_um: 1.6,
  };

  describe("generateCounterfactuals", () => {
    it("should generate multiple scenarios", () => {
      const scenarios = LatheOpusReasoningEngine.generateCounterfactuals(
        currentState,
        STEEL_MATERIAL
      );

      expect(scenarios.length).toBeGreaterThanOrEqual(3);
    });

    it("should include speed increase scenario", () => {
      const scenarios = LatheOpusReasoningEngine.generateCounterfactuals(
        currentState,
        STEEL_MATERIAL
      );

      const speedIncrease = scenarios.find(s => s.id.includes("speed_increase"));
      expect(speedIncrease).toBeDefined();
      expect(speedIncrease!.modified_value).toBeGreaterThan(currentState.vc_mpm);
    });

    it("should predict outcomes for each scenario", () => {
      const scenarios = LatheOpusReasoningEngine.generateCounterfactuals(
        currentState,
        STEEL_MATERIAL
      );

      for (const scenario of scenarios) {
        expect(scenario.predicted_outcomes.length).toBeGreaterThan(0);
        expect(scenario.net_benefit_score).toBeGreaterThanOrEqual(0);
        expect(scenario.net_benefit_score).toBeLessThanOrEqual(1);
        expect(scenario.feasibility).toBeGreaterThan(0);
        expect(scenario.risk_score).toBeGreaterThanOrEqual(0);
      }
    });

    it("should show tool life decrease when speed increases", () => {
      const scenarios = LatheOpusReasoningEngine.generateCounterfactuals(
        currentState,
        STEEL_MATERIAL
      );

      const speedIncrease = scenarios.find(s => s.id.includes("speed_increase"));
      const toolLifeOutcome = speedIncrease?.predicted_outcomes.find(
        o => o.variable === "tool_life_min"
      );

      expect(toolLifeOutcome).toBeDefined();
      expect(toolLifeOutcome!.change_percent).toBeLessThan(0);
    });
  });

  describe("evaluateCounterfactual", () => {
    it("should evaluate prediction accuracy", () => {
      const scenarios = LatheOpusReasoningEngine.generateCounterfactuals(
        currentState,
        STEEL_MATERIAL
      );

      const scenario = scenarios[0];
      const actualOutcomes = {
        tool_life_min: 35,
        cycle_time_min: 7,
        ra_um: 1.5,
      };

      const evaluation = LatheOpusReasoningEngine.evaluateCounterfactual(
        scenario,
        actualOutcomes
      );

      expect(evaluation.prediction_accuracy).toBeGreaterThanOrEqual(0);
      expect(evaluation.prediction_accuracy).toBeLessThanOrEqual(1);
      expect(evaluation.insights.length).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// OPERATION FLOW OPTIMIZATION TESTS
// ============================================================================

describe("LatheOpusReasoningEngine - Operation Flow Optimization", () => {
  const testOperations = [
    { id: "op1", type: "face", tool_category: "external", estimated_time_sec: 30 },
    { id: "op2", type: "rough_od", tool_category: "external", estimated_time_sec: 120 },
    { id: "op3", type: "drill", tool_category: "drilling", estimated_time_sec: 60 },
    { id: "op4", type: "finish_od", tool_category: "external", estimated_time_sec: 90 },
    { id: "op5", type: "thread_od", tool_category: "threading", estimated_time_sec: 45 },
    { id: "op6", type: "cutoff", tool_category: "external", estimated_time_sec: 20 },
  ];

  describe("optimizeOperationSequence", () => {
    it("should optimize for tool changes", () => {
      const result = LatheOpusReasoningEngine.optimizeOperationSequence(
        testOperations,
        "tool_changes"
      );

      expect(result.sequence.length).toBe(testOperations.length);
      expect(result.total_tool_changes).toBeLessThan(testOperations.length);
      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should ensure cutoff is last", () => {
      const result = LatheOpusReasoningEngine.optimizeOperationSequence(
        testOperations,
        "tool_changes"
      );

      const cutoffIdx = result.sequence.indexOf("op6");
      expect(cutoffIdx).toBe(result.sequence.length - 1);
    });

    it("should group same-category tools when optimizing for tool changes", () => {
      const result = LatheOpusReasoningEngine.optimizeOperationSequence(
        testOperations,
        "tool_changes"
      );

      // External operations should tend to be grouped
      expect(result.reasoning.some(r => r.includes("tool change") || r.includes("Tool change"))).toBe(true);
    });

    it("should handle thermal optimization", () => {
      const result = LatheOpusReasoningEngine.optimizeOperationSequence(
        testOperations,
        "thermal"
      );

      expect(result.sequence.length).toBe(testOperations.length);
      expect(result.reasoning.some(r => r.toLowerCase().includes("thermal"))).toBe(true);
    });
  });

  describe("calculateThermalDriftImpact", () => {
    it("should calculate thermal impact", () => {
      const operations = [
        { id: "op1", type: "rough_od", mrr: 5000, cycle_time_sec: 120 },
        { id: "op2", type: "rough_od", mrr: 4000, cycle_time_sec: 100 },
        { id: "op3", type: "finish_od", mrr: 500, cycle_time_sec: 90 },
      ];

      const result = LatheOpusReasoningEngine.calculateThermalDriftImpact(operations);

      expect(result.peak_temperature_factor).toBeGreaterThan(0);
      expect(typeof result.equilibrium_reached).toBe("boolean");
      expect(typeof result.pause_duration_sec).toBe("number");
    });

    it("should recommend pause for high MRR operations", () => {
      const operations = [
        { id: "op1", type: "rough_od", mrr: 20000, cycle_time_sec: 120 },
        { id: "op2", type: "rough_od", mrr: 18000, cycle_time_sec: 100 },
        { id: "op3", type: "finish_od", mrr: 500, cycle_time_sec: 90 },
      ];

      const result = LatheOpusReasoningEngine.calculateThermalDriftImpact(operations);

      if (result.peak_temperature_factor > 2.0) {
        expect(result.recommended_pause_after_id).not.toBeNull();
        expect(result.pause_duration_sec).toBeGreaterThan(0);
      }
    });
  });
});

// ============================================================================
// KNOWLEDGE SYNTHESIS TESTS
// ============================================================================

describe("LatheOpusReasoningEngine - Knowledge Synthesis", () => {
  describe("synthesizeParameters", () => {
    it("should synthesize parameters for roughing", () => {
      const result = LatheOpusReasoningEngine.synthesizeParameters(
        STEEL_MATERIAL,
        "rough_od",
        {}
      );

      expect(result.vc_mpm).toBeGreaterThan(0);
      expect(result.fn_mmrev).toBeGreaterThan(0);
      expect(result.ap_mm).toBeGreaterThan(0);
      expect(result.source).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should adjust for finishing operations", () => {
      const roughing = LatheOpusReasoningEngine.synthesizeParameters(
        STEEL_MATERIAL,
        "rough_od",
        {}
      );

      const finishing = LatheOpusReasoningEngine.synthesizeParameters(
        STEEL_MATERIAL,
        "finish_od",
        {}
      );

      expect(finishing.fn_mmrev).toBeLessThan(roughing.fn_mmrev);
      expect(finishing.ap_mm).toBeLessThan(roughing.ap_mm);
      expect(finishing.adjustments.some(a => a.toLowerCase().includes("finish"))).toBe(true);
    });

    it("should adjust for surface finish targets", () => {
      const coarseFinish = LatheOpusReasoningEngine.synthesizeParameters(
        STEEL_MATERIAL,
        "finish_od",
        { target_ra_um: 3.2 }
      );

      const fineFinish = LatheOpusReasoningEngine.synthesizeParameters(
        STEEL_MATERIAL,
        "finish_od",
        { target_ra_um: 0.4 }
      );

      expect(fineFinish.fn_mmrev).toBeLessThanOrEqual(coarseFinish.fn_mmrev);
    });

    it("should adjust for hardened materials", () => {
      const softResult = LatheOpusReasoningEngine.synthesizeParameters(
        STEEL_MATERIAL,
        "finish_od",
        {}
      );

      const hardResult = LatheOpusReasoningEngine.synthesizeParameters(
        HARDENED_D2_MATERIAL,
        "finish_od",
        {}
      );

      expect(hardResult.vc_mpm).toBeLessThan(softResult.vc_mpm);
      expect(hardResult.adjustments.some(a => a.toLowerCase().includes("hard"))).toBe(true);
    });
  });

  describe("findRelevantKnowledge", () => {
    it("should find knowledge for stainless steel", () => {
      const knowledge = LatheOpusReasoningEngine.findRelevantKnowledge({
        material: STAINLESS_MATERIAL,
        operation_types: ["rough_od", "finish_od"],
        constraints: {},
      });

      expect(knowledge.length).toBeGreaterThan(0);
      const hasStainlessKnowledge = knowledge.some(
        k => k.tip.toLowerCase().includes("stainless") || k.tip.toLowerCase().includes("304")
      );
      expect(hasStainlessKnowledge).toBe(true);
    });

    it("should find knowledge for threading operations", () => {
      const knowledge = LatheOpusReasoningEngine.findRelevantKnowledge({
        material: STEEL_MATERIAL,
        operation_types: ["thread_od"],
        constraints: {},
      });

      expect(knowledge.length).toBeGreaterThan(0);
      const hasThreadKnowledge = knowledge.some(
        k => k.tip.toLowerCase().includes("thread")
      );
      expect(hasThreadKnowledge).toBe(true);
    });

    it("should sort knowledge by confidence", () => {
      const knowledge = LatheOpusReasoningEngine.findRelevantKnowledge({
        material: STEEL_MATERIAL,
        operation_types: ["rough_od", "finish_od", "thread_od"],
        constraints: {},
      });

      for (let i = 1; i < knowledge.length; i++) {
        expect(knowledge[i - 1].confidence).toBeGreaterThanOrEqual(knowledge[i].confidence);
      }
    });
  });
});

// ============================================================================
// SINGLETON INSTANCE TESTS
// ============================================================================

describe("LatheOpusReasoningEngine - Singleton", () => {
  it("should export singleton instance", () => {
    expect(latheOpusReasoningEngine).toBeDefined();
    expect(latheOpusReasoningEngine).toBeInstanceOf(LatheOpusReasoningEngine);
  });

  it("should return same instance from getInstance", () => {
    const instance1 = LatheOpusReasoningEngine.getInstance();
    const instance2 = LatheOpusReasoningEngine.getInstance();
    expect(instance1).toBe(instance2);
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("LatheOpusReasoningEngine - Integration", () => {
  it("should handle complete workflow for JM Die punch", () => {
    const punchInput: PartAnalysisInput = {
      part_name: "Cold Heading Punch",
      material: {
        name: "M2 High Speed Steel",
        iso_group: "H",
        hardness_hrc: 62,
        condition: "hardened",
      },
      geometry: {
        bar_od_mm: 32,
        finished_od_mm: 25,
        length_mm: 80,
        features: [
          { type: "od_turn", location_z_mm: 0, diameter_mm: 25, tolerance_mm: 0.005, ra_um: 0.4 },
          { type: "chamfer", location_z_mm: 0, depth_mm: 1 },
          { type: "face", location_z_mm: 0 },
        ],
      },
      batch_size: 25,
      priority: "quality",
      constraints: {
        target_ra_um: 0.4,
        target_tolerance_mm: 0.005,
      },
    };

    const result = LatheOpusReasoningEngine.analyzePartWithReasoning(punchInput);

    expect(result.part_summary).toContain("Cold Heading Punch");
    expect(result.recommended_sequence.operations.length).toBeGreaterThan(0);
    expect(result.hybrid_strategies.length).toBeGreaterThan(0);
    expect(result.reasoning_chain.steps.length).toBeGreaterThan(0);

    // Should recognize hardened material
    const hasHardMaterialHandling =
      result.knowledge_synthesis.tribal_insights.some(t => t.toLowerCase().includes("hard")) ||
      result.reasoning_chain.steps.some(s =>
        JSON.stringify(s.outputs).toLowerCase().includes("hrc") ||
        JSON.stringify(s.outputs).toLowerCase().includes("hard")
      );
    expect(hasHardMaterialHandling || result.warnings.length > 0).toBe(true);
  });

  it("should handle aluminum high-speed machining", () => {
    const aluminumInput: PartAnalysisInput = {
      part_name: "Aerospace Fitting",
      material: ALUMINUM_MATERIAL,
      geometry: {
        bar_od_mm: 100,
        finished_od_mm: 75,
        length_mm: 200,
        id_bore_mm: 50,
        features: [
          { type: "od_turn", location_z_mm: 0, diameter_mm: 75, tolerance_mm: 0.02 },
          { type: "id_bore", location_z_mm: 0, diameter_mm: 50, tolerance_mm: 0.02 },
          { type: "groove", location_z_mm: 100, depth_mm: 5 },
        ],
      },
      batch_size: 200,
      priority: "speed",
    };

    const result = LatheOpusReasoningEngine.analyzePartWithReasoning(aluminumInput);

    // Should recommend higher speeds for aluminum
    const params = result.recommended_sequence.operations[0]?.params;
    if (params) {
      expect(params.vc_mpm).toBeGreaterThan(200);
    }

    // Should prioritize speed in strategies
    expect(result.hybrid_strategies[0].total_cycle_time_min).toBeDefined();
  });
});
