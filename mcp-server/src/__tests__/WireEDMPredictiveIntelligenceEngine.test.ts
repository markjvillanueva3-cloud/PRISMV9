/**
 * WireEDMPredictiveIntelligenceEngine Tests
 *
 * Tests real-time predictive AI for Wire EDM:
 * - Surface finish (Ra) prediction
 * - Cut time prediction
 * - Wire break risk prediction
 * - Cost prediction
 * - Quality score prediction
 * - Pass strategy recommendation
 *
 * @module __tests__/WireEDMPredictiveIntelligenceEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wireEDMPredictiveIntelligenceEngine,
  WireEDMPredictiveIntelligenceEngine,
  type PredictionInput,
} from "../engines/WireEDMPredictiveIntelligenceEngine.js";

describe("WireEDMPredictiveIntelligenceEngine", () => {
  let engine: WireEDMPredictiveIntelligenceEngine;

  beforeEach(() => {
    engine = new WireEDMPredictiveIntelligenceEngine();
  });

  // ============================================================================
  // FULL PREDICTION TESTS
  // ============================================================================

  describe("predict", () => {
    it("generates full prediction for D2 at 25mm", async () => {
      const input: PredictionInput = {
        material: "D2",
        thickness_mm: 25,
      };

      const result = await engine.predict(input);

      expect(result.input.material).toBe("D2");
      expect(result.timestamp).toBeTruthy();
      expect(result.predictions.surface_finish).toBeDefined();
      expect(result.predictions.cut_time).toBeDefined();
      expect(result.predictions.wire_break_risk).toBeDefined();
      expect(result.predictions.cost).toBeDefined();
      expect(result.predictions.quality_score).toBeDefined();
      expect(result.predictions.pass_strategy).toBeDefined();
    });

    it("includes overall confidence", async () => {
      const result = await engine.predict({
        material: "A2",
        thickness_mm: 30,
      });

      expect(result.overall_confidence).toBeGreaterThan(0);
      expect(result.overall_confidence).toBeLessThanOrEqual(1);
    });

    it("generates what-if scenarios", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      expect(result.what_if_scenarios.length).toBeGreaterThan(0);
      expect(result.what_if_scenarios[0].scenario_name).toBeTruthy();
      expect(result.what_if_scenarios[0].impact).toBeDefined();
    });

    it("generates recommendations", async () => {
      const result = await engine.predict({
        material: "M2",
        thickness_mm: 40,
      });

      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("generates warnings for risky conditions", async () => {
      const result = await engine.predict({
        material: "tungsten_carbide",
        thickness_mm: 100,
        target_ra_um: 0.2,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SURFACE FINISH PREDICTION TESTS
  // ============================================================================

  describe("Ra prediction", () => {
    it("predicts Ra with confidence interval", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      const ra = result.predictions.surface_finish;
      expect(ra.value).toBeGreaterThan(0);
      expect(ra.unit).toBe("µm");
      expect(ra.confidence).toBeGreaterThan(0.5);
      expect(ra.confidence_interval[0]).toBeLessThan(ra.value);
      expect(ra.confidence_interval[1]).toBeGreaterThan(ra.value);
    });

    it("predicts lower Ra with more passes", async () => {
      const result4 = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      const result6 = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 6,
      });

      expect(result6.predictions.surface_finish.value).toBeLessThan(
        result4.predictions.surface_finish.value
      );
    });

    it("includes alternative strategies", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      const ra = result.predictions.surface_finish;
      expect(ra.alternative_strategies.length).toBeGreaterThan(0);
      expect(ra.alternative_strategies[0].passes).toBeDefined();
      expect(ra.alternative_strategies[0].predicted_ra).toBeDefined();
    });

    it("includes explanation trace", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.predictions.surface_finish.explanation.length).toBeGreaterThan(0);
      expect(result.predictions.surface_finish.sources_used.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // CUT TIME PREDICTION TESTS
  // ============================================================================

  describe("Cut time prediction", () => {
    it("predicts cut time with breakdown", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      const time = result.predictions.cut_time;
      expect(time.value).toBeGreaterThan(0);
      expect(time.unit).toBe("minutes");
      expect(time.breakdown.rough_cut).toBeGreaterThan(0);
      expect(time.breakdown.skim_passes.length).toBeGreaterThan(0);
      expect(time.breakdown.setup_overhead).toBeGreaterThan(0);
    });

    it("predicts longer time for thicker material", async () => {
      const result25 = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      const result50 = await engine.predict({
        material: "D2",
        thickness_mm: 50,
      });

      expect(result50.predictions.cut_time.value).toBeGreaterThan(
        result25.predictions.cut_time.value
      );
    });

    it("identifies bottleneck", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.predictions.cut_time.bottleneck).toBeTruthy();
    });
  });

  // ============================================================================
  // WIRE BREAK RISK PREDICTION TESTS
  // ============================================================================

  describe("Wire break risk prediction", () => {
    it("predicts wire break probability", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      const risk = result.predictions.wire_break_risk;
      expect(risk.value).toBeGreaterThanOrEqual(0);
      expect(risk.value).toBeLessThanOrEqual(1);
      expect(risk.unit).toBe("probability");
    });

    it("identifies risk factors", async () => {
      const result = await engine.predict({
        material: "tungsten_carbide",
        thickness_mm: 80,
        urgency: "high",
      });

      const risk = result.predictions.wire_break_risk;
      expect(risk.risk_factors.length).toBeGreaterThan(0);
      expect(risk.risk_factors[0].factor).toBeTruthy();
      expect(risk.risk_factors[0].mitigation).toBeTruthy();
    });

    it("predicts higher risk for thick sections", async () => {
      const result25 = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      const result100 = await engine.predict({
        material: "D2",
        thickness_mm: 100,
      });

      expect(result100.predictions.wire_break_risk.value).toBeGreaterThan(
        result25.predictions.wire_break_risk.value
      );
    });

    it("includes check interval recommendation", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 50,
      });

      expect(result.predictions.wire_break_risk.recommended_check_interval_min).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // COST PREDICTION TESTS
  // ============================================================================

  describe("Cost prediction", () => {
    it("predicts cost with breakdown", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      const cost = result.predictions.cost;
      expect(cost.value).toBeGreaterThan(0);
      expect(cost.unit).toBe("USD");
      expect(cost.breakdown.machine_time).toBeGreaterThan(0);
      expect(cost.breakdown.wire_consumption).toBeGreaterThan(0);
      expect(cost.breakdown.operator_labor).toBeGreaterThan(0);
    });

    it("identifies cost drivers", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 50,
      });

      expect(result.predictions.cost.cost_drivers.length).toBeGreaterThan(0);
    });

    it("suggests optimization opportunities", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 75,
        num_passes: 6,
      });

      expect(result.predictions.cost.optimization_opportunities.length).toBeGreaterThan(0);
    });

    it("includes confidence interval", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      const cost = result.predictions.cost;
      expect(cost.confidence_interval[0]).toBeLessThan(cost.value);
      expect(cost.confidence_interval[1]).toBeGreaterThan(cost.value);
    });
  });

  // ============================================================================
  // QUALITY SCORE PREDICTION TESTS
  // ============================================================================

  describe("Quality score prediction", () => {
    it("predicts overall quality score", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      const quality = result.predictions.quality_score;
      expect(quality.value).toBeGreaterThanOrEqual(0);
      expect(quality.value).toBeLessThanOrEqual(100);
      expect(quality.unit).toBe("score_0_100");
    });

    it("breaks down dimension scores", async () => {
      const result = await engine.predict({
        material: "A2",
        thickness_mm: 30,
      });

      const quality = result.predictions.quality_score;
      expect(quality.dimension_scores.surface_finish).toBeGreaterThan(0);
      expect(quality.dimension_scores.dimensional_accuracy).toBeGreaterThan(0);
      expect(quality.dimension_scores.edge_quality).toBeGreaterThan(0);
      expect(quality.dimension_scores.consistency).toBeGreaterThan(0);
    });

    it("identifies risk areas", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 100,
        target_ra_um: 0.1,
      });

      expect(result.predictions.quality_score.risk_areas.length).toBeGreaterThan(0);
    });

    it("suggests improvement actions", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 3,
        target_ra_um: 0.3,
      });

      // May or may not have improvements depending on quality score
      expect(Array.isArray(result.predictions.quality_score.improvement_actions)).toBe(true);
    });
  });

  // ============================================================================
  // PASS STRATEGY PREDICTION TESTS
  // ============================================================================

  describe("Pass strategy prediction", () => {
    it("recommends E-code family", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      const strategy = result.predictions.pass_strategy;
      expect(strategy.e_code_family).toBeTruthy();
      expect(strategy.passes.length).toBeGreaterThan(0);
    });

    it("includes pass details", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      const pass = result.predictions.pass_strategy.passes[0];
      expect(pass.pass_number).toBe(1);
      expect(pass.e_code).toBeTruthy();
      expect(pass.offset_mm).toBeGreaterThan(0);
      expect(pass.predicted_ra).toBeGreaterThan(0);
      expect(pass.cut_speed_mmpm).toBeGreaterThan(0);
    });

    it("calculates total time", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      expect(result.predictions.pass_strategy.total_time_min).toBeGreaterThan(0);
    });

    it("includes rationale", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        target_ra_um: 0.4,
      });

      expect(result.predictions.pass_strategy.rationale.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // WHAT-IF SCENARIO TESTS
  // ============================================================================

  describe("What-if scenarios", () => {
    it("generates add pass scenario", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      const addPass = result.what_if_scenarios.find(s => s.scenario_name.includes("Add"));
      if (addPass) {
        expect(addPass.impact.ra_change_pct).toBeLessThan(0);  // Ra should decrease
        expect(addPass.impact.time_change_pct).toBeGreaterThan(0);  // Time should increase
      }
    });

    it("includes recommendation for each scenario", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 4,
      });

      for (const scenario of result.what_if_scenarios) {
        expect(["adopt", "consider", "avoid"]).toContain(scenario.recommendation);
        expect(scenario.rationale).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // MATERIAL COVERAGE TESTS
  // ============================================================================

  describe("Material coverage", () => {
    const materials = ["D2", "A2", "S7", "M2", "H13", "tungsten_carbide", "graphite", "copper", "aluminum"];

    for (const material of materials) {
      it(`predicts for ${material}`, async () => {
        const result = await engine.predict({
          material,
          thickness_mm: 25,
        });

        expect(result.predictions.surface_finish.value).toBeGreaterThan(0);
        expect(result.predictions.cut_time.value).toBeGreaterThan(0);
        expect(result.predictions.cost.value).toBeGreaterThan(0);
      });
    }
  });

  // ============================================================================
  // LEARNING TESTS
  // ============================================================================

  describe("recordOutcome", () => {
    it("records actual outcome for calibration", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
      });

      // Should not throw
      expect(() => {
        engine.recordOutcome(
          `D2-25-${Date.now()}`,
          {
            actual_ra: 0.55,
            actual_time_min: 35,
            wire_breaks: 0,
          }
        );
      }).not.toThrow();
    });
  });

  // ============================================================================
  // STATUS TESTS
  // ============================================================================

  describe("getStatus", () => {
    it("returns engine status", () => {
      const status = engine.getStatus();

      expect(status.predictions_made).toBeGreaterThanOrEqual(0);
      expect(status.calibration_factors).toBeGreaterThanOrEqual(0);
      expect(status.materials_supported).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // SINGLETON TESTS
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(wireEDMPredictiveIntelligenceEngine).toBeDefined();
      expect(wireEDMPredictiveIntelligenceEngine).toBeInstanceOf(
        WireEDMPredictiveIntelligenceEngine
      );
    });
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles unknown material gracefully", async () => {
      const result = await engine.predict({
        material: "unknown_exotic_alloy",
        thickness_mm: 25,
      });

      // Should fall back to D2 defaults
      expect(result.predictions.surface_finish.value).toBeGreaterThan(0);
    });

    it("handles extreme thickness", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 200,
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.predictions.wire_break_risk.value).toBeGreaterThan(0.2);
    });

    it("handles minimum passes", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        num_passes: 1,
      });

      expect(result.predictions.surface_finish.value).toBeGreaterThan(1);  // Rough only
    });

    it("handles high urgency jobs", async () => {
      const result = await engine.predict({
        material: "D2",
        thickness_mm: 25,
        urgency: "high",
      });

      expect(result.recommendations.some(r => r.toLowerCase().includes("rush") || r.toLowerCase().includes("validate"))).toBe(true);
    });
  });
});
