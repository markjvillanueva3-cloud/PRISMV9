/**
 * LatheDeepReasoningEngine Tests — LLM-INTEL-8
 *
 * Tests for multi-step deep reasoning for lathe operations:
 *   1. Process planning chains
 *   2. Setup optimization
 *   3. Chatter prediction
 *   4. Deflection prediction
 *   5. Failure mode analysis
 *   6. Learning integration
 *
 * @module __tests__/lathe-deep-reasoning.test
 */

import { describe, it, expect } from "vitest";
import {
  LatheDeepReasoningEngine,
  latheDeepReasoningEngine,
  type LathePartDefinition,
  type LatheMachineCapability,
  type LatheFeature,
} from "../engines/LatheDeepReasoningEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const simplePart: LathePartDefinition = {
  part_id: "TEST-SIMPLE",
  material: "1045 Steel",
  iso_group: "P",
  stock_type: "bar",
  stock_od_mm: 55,
  stock_length_mm: 110,
  finished_od_mm: 50,
  finished_length_mm: 100,
  features: [
    { id: "f1", type: "face", location_z_mm: 0 },
    { id: "f2", type: "od_cylinder", location_z_mm: 0, diameter_mm: 50, length_mm: 80 },
    { id: "f3", type: "chamfer", location_z_mm: 0, angle_deg: 45 },
  ],
  tolerances: {
    diameter_mm: 0.05,
    length_mm: 0.1,
  },
  surface_finish_ra: 3.2,
  batch_size: 50,
};

const complexPart: LathePartDefinition = {
  part_id: "TEST-COMPLEX",
  material: "316 Stainless",
  iso_group: "M",
  stock_type: "bar",
  stock_od_mm: 82,
  stock_length_mm: 165,
  finished_od_mm: 75,
  finished_id_mm: 20,
  finished_length_mm: 150,
  features: [
    { id: "f1", type: "face", location_z_mm: 0, critical: true },
    { id: "f2", type: "od_cylinder", location_z_mm: 0, diameter_mm: 75, length_mm: 100, tolerance_class: "precision" },
    { id: "f3", type: "shoulder", location_z_mm: 100, diameter_mm: 60 },
    { id: "f4", type: "od_cylinder", location_z_mm: 100, diameter_mm: 60, length_mm: 40 },
    { id: "f5", type: "id_bore", location_z_mm: 0, diameter_mm: 20, depth_mm: 80 },
    { id: "f6", type: "thread_od", location_z_mm: 110, diameter_mm: 60, length_mm: 25, thread_spec: "M60x2" },
    { id: "f7", type: "groove_od", location_z_mm: 105, width_mm: 3, depth_mm: 5 },
    { id: "f8", type: "cross_hole", location_z_mm: 50, diameter_mm: 10, depth_mm: 20 },
  ],
  tolerances: {
    diameter_mm: 0.025,
    length_mm: 0.05,
    concentricity_mm: 0.01,
  },
  surface_finish_ra: 1.6,
  batch_size: 25,
};

const slenderPart: LathePartDefinition = {
  part_id: "TEST-SLENDER",
  material: "4140 Steel",
  iso_group: "P",
  stock_type: "bar",
  stock_od_mm: 22,
  stock_length_mm: 210,
  finished_od_mm: 20,
  finished_length_mm: 200,
  features: [
    { id: "f1", type: "face", location_z_mm: 0 },
    { id: "f2", type: "od_cylinder", location_z_mm: 0, diameter_mm: 20, length_mm: 180 },
    { id: "f3", type: "thread_od", location_z_mm: 180, diameter_mm: 20, length_mm: 15, thread_spec: "M20x1.5" },
  ],
  tolerances: {
    diameter_mm: 0.03,
    length_mm: 0.1,
  },
  surface_finish_ra: 3.2,
  batch_size: 100,
};

const precisionPart: LathePartDefinition = {
  part_id: "TEST-PRECISION",
  material: "52100 Bearing Steel",
  iso_group: "H",
  stock_type: "bar",
  stock_od_mm: 35,
  stock_length_mm: 55,
  finished_od_mm: 30,
  finished_length_mm: 50,
  features: [
    { id: "f1", type: "face", location_z_mm: 0, critical: true },
    { id: "f2", type: "od_cylinder", location_z_mm: 0, diameter_mm: 30, length_mm: 40, tolerance_class: "ultra_precision", surface_finish_ra: 0.4 },
    { id: "f3", type: "id_bore", location_z_mm: 5, diameter_mm: 15, depth_mm: 35, tolerance_class: "ultra_precision" },
  ],
  tolerances: {
    diameter_mm: 0.005,
    length_mm: 0.02,
    concentricity_mm: 0.003,
    runout_mm: 0.002,
  },
  surface_finish_ra: 0.8,
  batch_size: 10,
};

const basicLathe: LatheMachineCapability = {
  machine_id: "LATHE-BASIC",
  machine_type: "2_axis",
  controller: "fanuc",
  max_spindle_rpm: 4000,
  max_spindle_hp: 20,
  max_turning_diameter_mm: 300,
  max_turning_length_mm: 500,
  has_live_tooling: false,
  has_c_axis: false,
  has_y_axis: false,
  has_sub_spindle: false,
  has_tailstock: true,
  has_steady_rest: true,
  turret_stations: 12,
  accuracy_class: "standard",
};

const millTurnLathe: LatheMachineCapability = {
  machine_id: "MILLTURN-01",
  machine_type: "mill_turn",
  controller: "mazak",
  max_spindle_rpm: 5000,
  max_spindle_hp: 30,
  max_turning_diameter_mm: 400,
  max_turning_length_mm: 800,
  bar_capacity_mm: 65,
  has_live_tooling: true,
  has_c_axis: true,
  has_y_axis: true,
  has_sub_spindle: true,
  has_tailstock: true,
  has_steady_rest: true,
  turret_stations: 24,
  accuracy_class: "precision",
};

// ============================================================================
// TESTS
// ============================================================================

describe("LatheDeepReasoningEngine", () => {
  const engine = latheDeepReasoningEngine;

  describe("generateProcessPlan", () => {
    it("should generate valid process plan for simple part", () => {
      const plan = engine.generateProcessPlan(simplePart, basicLathe);

      expect(plan.plan_id).toContain("PLAN-");
      expect(plan.part_id).toBe(simplePart.part_id);
      expect(plan.setups.length).toBeGreaterThan(0);
      expect(plan.total_cycle_time_sec).toBeGreaterThan(0);
      expect(plan.reasoning_chain).toBeDefined();
      expect(plan.reasoning_chain.steps.length).toBeGreaterThanOrEqual(3);
    });

    it("should include reasoning chain with steps", () => {
      const plan = engine.generateProcessPlan(simplePart, basicLathe);

      expect(plan.reasoning_chain.chain_id).toContain("CHAIN-");
      expect(plan.reasoning_chain.problem_statement).toContain(simplePart.part_id);
      expect(plan.reasoning_chain.steps.length).toBeGreaterThan(0);
      expect(plan.reasoning_chain.conclusion).toBeTruthy();
      expect(plan.reasoning_chain.overall_confidence).toBeGreaterThan(0);
    });

    it("should sequence operations correctly", () => {
      const plan = engine.generateProcessPlan(simplePart, basicLathe);

      // Find facing operation
      const faceOp = plan.setups[0].operations.find(op => op.feature_id === "f1");
      expect(faceOp).toBeDefined();
      expect(faceOp!.sequence).toBe(1); // Facing should be first

      // Part-off should be last
      const lastOp = plan.setups[plan.setups.length - 1].operations.slice(-1)[0];
      expect(lastOp.operation_type).toBe("parting");
    });

    it("should identify risks for slender parts", () => {
      const plan = engine.generateProcessPlan(slenderPart, basicLathe);

      const deflectionRisk = plan.risk_factors.find(r => r.category === "deflection");
      expect(deflectionRisk).toBeDefined();
      expect(["medium", "high", "critical"]).toContain(deflectionRisk?.severity);
    });

    it("should generate quality predictions for critical features", () => {
      const plan = engine.generateProcessPlan(complexPart, millTurnLathe);

      expect(plan.quality_predictions.length).toBeGreaterThan(0);
      for (const qp of plan.quality_predictions) {
        expect(qp.cpk_estimate).toBeGreaterThan(0);
        expect(qp.confidence).toBeGreaterThan(0);
      }
    });

    it("should recommend tailstock for high L/D parts", () => {
      const plan = engine.generateProcessPlan(slenderPart, basicLathe);

      // L/D = 200/20 = 10
      const hasTailstockRec = plan.recommendations.some(r =>
        r.toLowerCase().includes("tailstock")
      );
      expect(hasTailstockRec).toBe(true);
    });

    it("should handle precision parts with tight tolerances", () => {
      const plan = engine.generateProcessPlan(precisionPart, millTurnLathe);

      expect(plan.setups.length).toBeGreaterThan(0);
      const hasToleranceRec = plan.recommendations.some(r =>
        r.toLowerCase().includes("precision") || r.toLowerCase().includes("tolerance")
      );
      expect(hasToleranceRec).toBe(true);
    });
  });

  describe("optimizeSetups", () => {
    it("should return optimal setup count", () => {
      const result = engine.optimizeSetups(simplePart, basicLathe);

      expect(result.optimal_setup_count).toBeGreaterThan(0);
      expect(result.setups.length).toBe(result.optimal_setup_count);
    });

    it("should provide alternative strategies", () => {
      const result = engine.optimizeSetups(complexPart, millTurnLathe);

      expect(result.alternative_strategies.length).toBeGreaterThan(0);
      for (const alt of result.alternative_strategies) {
        expect(alt.setup_count).toBeGreaterThan(0);
        expect(alt.trade_offs.length).toBeGreaterThan(0);
        expect(alt.when_to_use).toBeTruthy();
      }
    });

    it("should calculate accuracy vs efficiency scores", () => {
      const result = engine.optimizeSetups(complexPart, millTurnLathe, {
        time_priority: 0.5,
      });

      expect(result.accuracy_vs_efficiency.accuracy_score).toBeGreaterThan(0);
      expect(result.accuracy_vs_efficiency.accuracy_score).toBeLessThanOrEqual(1);
      expect(result.accuracy_vs_efficiency.efficiency_score).toBeGreaterThan(0);
      expect(result.accuracy_vs_efficiency.efficiency_score).toBeLessThanOrEqual(1);
    });

    it("should favor efficiency when time_priority is high", () => {
      const result = engine.optimizeSetups(complexPart, millTurnLathe, {
        time_priority: 0.9,
      });

      expect(result.accuracy_vs_efficiency.balance_point).toBe("efficiency");
    });

    it("should favor accuracy when time_priority is low", () => {
      const result = engine.optimizeSetups(precisionPart, millTurnLathe, {
        time_priority: 0.2,
      });

      expect(result.accuracy_vs_efficiency.balance_point).toBe("accuracy");
    });
  });

  describe("predictChatter", () => {
    it("should predict chatter risk for standard operation", () => {
      const result = engine.predictChatter(simplePart, basicLathe, {
        type: "turning_od",
        tool_overhang_mm: 40,
        depth_of_cut_mm: 2,
        feed_mm_rev: 0.25,
        target_rpm: 800,
      });

      expect(["none", "low", "moderate", "high", "critical"]).toContain(result.chatter_risk);
      expect(result.recommended_rpm).toBeGreaterThan(0);
      expect(result.reasoning_chain).toBeDefined();
    });

    it("should identify high risk for slender parts", () => {
      const result = engine.predictChatter(slenderPart, basicLathe, {
        type: "turning_od",
        tool_overhang_mm: 60,
        depth_of_cut_mm: 3,
        feed_mm_rev: 0.3,
        target_rpm: 1200,
      });

      // L/D = 10, should have elevated risk
      expect(["moderate", "high", "critical"]).toContain(result.chatter_risk);
      expect(result.contributing_factors.length).toBeGreaterThan(0);
    });

    it("should provide stable RPM ranges", () => {
      const result = engine.predictChatter(simplePart, basicLathe, {
        type: "turning_od",
        tool_overhang_mm: 30,
        depth_of_cut_mm: 2,
        feed_mm_rev: 0.2,
        target_rpm: 1000,
      });

      expect(result.stable_rpm_ranges.length).toBeGreaterThan(0);
      for (const range of result.stable_rpm_ranges) {
        expect(range.max).toBeGreaterThan(range.min);
      }
    });

    it("should identify critical RPM ranges (lobes) when present", () => {
      const result = engine.predictChatter(simplePart, basicLathe, {
        type: "turning_od",
        tool_overhang_mm: 40,
        depth_of_cut_mm: 2.5,
        feed_mm_rev: 0.25,
        target_rpm: 1500,
      });

      // Critical ranges may or may not be present depending on machine RPM limits
      // If present, they should have valid severity
      for (const range of result.critical_rpm_ranges) {
        expect(["moderate", "high"]).toContain(range.severity);
        expect(range.max).toBeGreaterThan(range.min);
      }
    });

    it("should generate tool recommendations", () => {
      const result = engine.predictChatter(complexPart, millTurnLathe, {
        type: "boring",
        tool_overhang_mm: 80,
        depth_of_cut_mm: 1.5,
        feed_mm_rev: 0.15,
        target_rpm: 600,
      });

      expect(result.tool_recommendations.length).toBeGreaterThan(0);
    });
  });

  describe("predictDeflection", () => {
    it("should predict deflection for cantilever setup", () => {
      const result = engine.predictDeflection(simplePart, basicLathe, 500, {
        chuck_grip_length_mm: 25,
        tailstock_engaged: false,
      });

      expect(result.max_deflection_mm).toBeGreaterThanOrEqual(0);
      expect(typeof result.deflection_acceptable).toBe("boolean");
      expect(result.deflection_by_location.length).toBeGreaterThan(0);
    });

    it("should show reduced deflection with tailstock", () => {
      const withoutTailstock = engine.predictDeflection(slenderPart, basicLathe, 500, {
        chuck_grip_length_mm: 20,
        tailstock_engaged: false,
      });

      const withTailstock = engine.predictDeflection(slenderPart, basicLathe, 500, {
        chuck_grip_length_mm: 20,
        tailstock_engaged: true,
      });

      expect(withTailstock.max_deflection_mm).toBeLessThan(withoutTailstock.max_deflection_mm);
    });

    it("should identify contributing factors", () => {
      const result = engine.predictDeflection(slenderPart, basicLathe, 1500, {
        chuck_grip_length_mm: 15,
        tailstock_engaged: false,
      });

      expect(result.contributing_factors.length).toBeGreaterThan(0);
      const hasLDFactor = result.contributing_factors.some(f => f.includes("L/D"));
      expect(hasLDFactor).toBe(true);
    });

    it("should provide mitigation options", () => {
      const result = engine.predictDeflection(slenderPart, basicLathe, 1000, {
        chuck_grip_length_mm: 20,
        tailstock_engaged: false,
      });

      expect(result.mitigation_options.length).toBeGreaterThan(0);
      for (const opt of result.mitigation_options) {
        expect(opt.deflection_reduction_pct).toBeGreaterThan(0);
        expect(opt.trade_off).toBeTruthy();
      }
    });

    it("should check deflection at multiple locations", () => {
      const result = engine.predictDeflection(simplePart, basicLathe, 500, {
        chuck_grip_length_mm: 25,
        tailstock_engaged: false,
      });

      expect(result.deflection_by_location.length).toBeGreaterThanOrEqual(4);
      for (const loc of result.deflection_by_location) {
        expect(loc.z_position_mm).toBeGreaterThan(0);
        expect(loc.deflection_mm).toBeGreaterThanOrEqual(0);
        expect(typeof loc.within_tolerance).toBe("boolean");
      }
    });
  });

  describe("analyzeFailureModes", () => {
    it("should identify failure modes for standard part", () => {
      const result = engine.analyzeFailureModes(simplePart, basicLathe);

      expect(result.failure_modes.length).toBeGreaterThan(0);
      expect(["low", "moderate", "high", "critical"]).toContain(result.overall_risk_level);
    });

    it("should calculate RPN for each failure mode", () => {
      const result = engine.analyzeFailureModes(complexPart, millTurnLathe);

      for (const fm of result.failure_modes) {
        expect(fm.rpn).toBe(Math.round(fm.probability * 10 * fm.severity));
        expect(fm.causes.length).toBeGreaterThan(0);
        expect(fm.prevention.length).toBeGreaterThan(0);
      }
    });

    it("should identify safety-critical modes", () => {
      const result = engine.analyzeFailureModes(slenderPart, basicLathe);

      const safetyModes = result.failure_modes.filter(f => f.category === "safety");
      // Slender parts have ejection risk
      if (safetyModes.length > 0) {
        expect(safetyModes[0].severity).toBeGreaterThanOrEqual(8);
      }
    });

    it("should provide inspection recommendations", () => {
      const result = engine.analyzeFailureModes(precisionPart, millTurnLathe);

      expect(result.recommended_inspections.length).toBeGreaterThan(0);
      expect(result.recommended_inspections).toContain("First piece inspection");
    });

    it("should identify top risks", () => {
      const result = engine.analyzeFailureModes(complexPart, millTurnLathe);

      expect(result.top_risks.length).toBeGreaterThan(0);
      expect(result.top_risks.length).toBeLessThanOrEqual(3);
    });

    it("should sort failure modes by RPN", () => {
      const result = engine.analyzeFailureModes(complexPart, millTurnLathe);

      for (let i = 0; i < result.failure_modes.length - 1; i++) {
        expect(result.failure_modes[i].rpn).toBeGreaterThanOrEqual(result.failure_modes[i + 1].rpn);
      }
    });

    it("should adjust risk based on operator skill", () => {
      const expertResult = engine.analyzeFailureModes(complexPart, millTurnLathe, {
        operator_skill: "expert",
        tool_condition: "new",
        machine_condition: "excellent",
      });

      const noviceResult = engine.analyzeFailureModes(complexPart, millTurnLathe, {
        operator_skill: "novice",
        tool_condition: "worn",
        machine_condition: "fair",
      });

      // Worn tools should increase tool breakage probability
      const expertToolBreak = expertResult.failure_modes.find(f => f.mode_id === "FM-TOOL-BREAK");
      const noviceToolBreak = noviceResult.failure_modes.find(f => f.mode_id === "FM-TOOL-BREAK");

      if (expertToolBreak && noviceToolBreak) {
        expect(noviceToolBreak.probability).toBeGreaterThan(expertToolBreak.probability);
      }
    });
  });

  describe("recordOutcome", () => {
    it("should record successful outcome", () => {
      const result = engine.recordOutcome("PLAN-TEST-123", {
        success: true,
        actual_cycle_time_sec: 120,
        quality_results: [
          { feature_id: "f1", actual_dimension_mm: 50.01 },
          { feature_id: "f2", actual_dimension_mm: 24.99 },
        ],
      });

      expect(result.recorded).toBe(true);
      expect(result.learning_updates.length).toBeGreaterThan(0);
    });

    it("should record issues encountered", () => {
      const result = engine.recordOutcome("PLAN-TEST-456", {
        success: false,
        issues_encountered: ["Chatter on OD", "Tool breakage"],
        operator_notes: "Reduced speed by 20%",
      });

      expect(result.recorded).toBe(true);
      expect(result.learning_updates.some(u => u.includes("Failure mode"))).toBe(true);
    });
  });

  describe("reasoning chain quality", () => {
    it("should have numbered steps", () => {
      const plan = engine.generateProcessPlan(simplePart, basicLathe);

      for (let i = 0; i < plan.reasoning_chain.steps.length; i++) {
        expect(plan.reasoning_chain.steps[i].step_number).toBe(i + 1);
      }
    });

    it("should have confidence scores for each step", () => {
      const plan = engine.generateProcessPlan(complexPart, millTurnLathe);

      for (const step of plan.reasoning_chain.steps) {
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should calculate overall confidence as average", () => {
      const plan = engine.generateProcessPlan(simplePart, basicLathe);

      const avgConfidence = plan.reasoning_chain.steps.reduce((s, step) => s + step.confidence, 0) /
                           plan.reasoning_chain.steps.length;
      expect(plan.reasoning_chain.overall_confidence).toBeCloseTo(avgConfidence, 2);
    });

    it("should track reasoning time", () => {
      const plan = engine.generateProcessPlan(complexPart, millTurnLathe);

      // Reasoning time should be defined (may be 0 for very fast execution)
      expect(plan.reasoning_chain.total_reasoning_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("should include metadata", () => {
      const plan = engine.generateProcessPlan(complexPart, millTurnLathe);

      expect(plan.reasoning_chain.metadata.material).toBe(complexPart.material);
      expect(plan.reasoning_chain.metadata.machine_type).toBe(millTurnLathe.machine_type);
      expect(["simple", "moderate", "complex", "expert"]).toContain(plan.reasoning_chain.metadata.complexity_level);
    });
  });

  describe("singleton export", () => {
    it("should export singleton instance", () => {
      expect(latheDeepReasoningEngine).toBeDefined();
      expect(latheDeepReasoningEngine).toBeInstanceOf(LatheDeepReasoningEngine);
    });
  });
});
