/**
 * Tests for WireEDMAGIOrchestrator
 *
 * Near-AGI level orchestration engine integrating:
 * - Multi-model ensemble predictions (GPR, ANN, DNN+COOT)
 * - Causal inference for parameter relationships
 * - Counterfactual reasoning (what-if scenarios)
 * - Research knowledge integration (2024-2026 studies)
 * - Self-assessment and feedback learning
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  WireEDMAGIOrchestrator,
  wireEDMAGIOrchestrator,
  type AGIRequest,
  type AGIDecision,
  type AGIFeedback
} from "../engines/WireEDMAGIOrchestrator.js";

describe("WireEDMAGIOrchestrator", () => {
  let orchestrator: WireEDMAGIOrchestrator;

  beforeEach(() => {
    orchestrator = new WireEDMAGIOrchestrator();
  });

  // ===========================================================================
  // Singleton Export
  // ===========================================================================

  describe("singleton", () => {
    it("exports a singleton instance", () => {
      expect(wireEDMAGIOrchestrator).toBeInstanceOf(WireEDMAGIOrchestrator);
    });
  });

  // ===========================================================================
  // Status
  // ===========================================================================

  describe("getStatus", () => {
    it("returns orchestrator status with all components", () => {
      const status = orchestrator.getStatus();

      expect(status.knowledge_entries).toBeGreaterThan(0);
      expect(status.causal_relationships).toBeGreaterThan(0);
      expect(status.decisions_made).toBe(0);
      expect(status.feedback_received).toBe(0);
    });

    it("includes all 8 reasoning modes", () => {
      const status = orchestrator.getStatus();

      expect(status.reasoning_modes).toContain("analytical");
      expect(status.reasoning_modes).toContain("creative");
      expect(status.reasoning_modes).toContain("adaptive");
      expect(status.reasoning_modes).toContain("predictive");
      expect(status.reasoning_modes).toContain("counterfactual");
      expect(status.reasoning_modes).toContain("causal");
      expect(status.reasoning_modes).toContain("ensemble");
      expect(status.reasoning_modes).toContain("full_agi");
      expect(status.reasoning_modes.length).toBe(8);
    });

    it("lists all capabilities", () => {
      const status = orchestrator.getStatus();

      expect(status.capabilities).toContain("multi_model_ensemble_prediction");
      expect(status.capabilities).toContain("causal_inference");
      expect(status.capabilities).toContain("counterfactual_reasoning");
      expect(status.capabilities).toContain("transfer_learning_recommendations");
      expect(status.capabilities).toContain("self_assessment");
      expect(status.capabilities).toContain("feedback_learning");
      expect(status.capabilities).toContain("research_knowledge_integration");
    });
  });

  // ===========================================================================
  // Full AGI Processing
  // ===========================================================================

  describe("process", () => {
    const steelRequest: AGIRequest = {
      context: {
        machine: "fa_s_vpack",
        material: "D2",
        thickness_mm: 25,
        wire_diameter_mm: 0.25,
        target_ra_um: 0.5
      },
      query: "Optimize parameters for D2 steel 25mm with mirror finish",
      mode: "full_agi"
    };

    it("processes full AGI request for steel", () => {
      const result = orchestrator.process(steelRequest);

      expect(result.decision_id).toBeDefined();
      expect(result.decision_id).toContain("agi_");
      expect(result.reasoning_chain.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("returns reasoning chain with steps", () => {
      const result = orchestrator.process(steelRequest);

      expect(result.reasoning_chain.length).toBeGreaterThanOrEqual(5);

      for (const step of result.reasoning_chain) {
        expect(step.step_number).toBeGreaterThan(0);
        expect(step.mode).toBeDefined();
        expect(step.reasoning).toBeDefined();
        expect(step.conclusion).toBeDefined();
        expect(step.confidence).toBeGreaterThan(0);
      }
    });

    it("includes knowledge sources", () => {
      const result = orchestrator.process(steelRequest);

      expect(result.knowledge_sources.length).toBeGreaterThan(0);

      for (const ks of result.knowledge_sources) {
        expect(ks.id).toBeDefined();
        expect(ks.source).toBeDefined();
        expect(ks.confidence).toBeGreaterThan(0);
        expect(ks.tier).toMatch(/very_high|high|medium|low|uncertain/);
      }
    });

    it("provides causal inferences", () => {
      const result = orchestrator.process(steelRequest);

      expect(result.causal_inferences.length).toBeGreaterThan(0);

      for (const ci of result.causal_inferences) {
        expect(ci.cause).toBeDefined();
        expect(ci.effect).toBeDefined();
        expect(ci.strength).toBeGreaterThan(0);
        expect(ci.strength).toBeLessThanOrEqual(1);
        expect(ci.direction).toMatch(/positive|negative|nonlinear/);
      }
    });

    it("generates counterfactual scenarios", () => {
      const result = orchestrator.process(steelRequest);

      expect(result.counterfactuals_considered.length).toBeGreaterThanOrEqual(3);

      const scenarios = result.counterfactuals_considered.map(c => c.scenario_id);
      expect(scenarios).toContain("high_speed");
      expect(scenarios).toContain("high_quality");
      expect(scenarios).toContain("safe_mode");
    });

    it("provides final recommendation", () => {
      const result = orchestrator.process(steelRequest);

      expect(result.final_recommendation).toBeDefined();
      expect(Object.keys(result.final_recommendation).length).toBeGreaterThan(0);
    });

    it("includes self-assessment", () => {
      const result = orchestrator.process(steelRequest);

      expect(result.self_assessment).toBeDefined();
      expect(result.self_assessment.reasoning_quality).toBeGreaterThan(0);
      expect(result.self_assessment.knowledge_coverage).toBeGreaterThan(0);
      expect(result.self_assessment.uncertainty_handled).toBeGreaterThan(0);
    });

    it("tracks decision time", () => {
      const result = orchestrator.process(steelRequest);
      expect(result.time_to_decision_ms).toBeGreaterThanOrEqual(0);
    });

    it("records decision in history", () => {
      const statusBefore = orchestrator.getStatus();
      expect(statusBefore.decisions_made).toBe(0);

      orchestrator.process(steelRequest);

      const statusAfter = orchestrator.getStatus();
      expect(statusAfter.decisions_made).toBe(1);
    });
  });

  // ===========================================================================
  // Reasoning Mode Variations
  // ===========================================================================

  describe("reasoning modes", () => {
    const baseRequest: AGIRequest = {
      context: {
        machine: "sp43",
        material: "steel",
        thickness_mm: 15,
        wire_diameter_mm: 0.20
      },
      query: "Predict parameters"
    };

    it("defaults to full_agi mode", () => {
      const result = orchestrator.process(baseRequest);
      expect(result.mode).toBe("full_agi");
    });

    it("processes analytical mode", () => {
      const result = orchestrator.process({
        ...baseRequest,
        mode: "analytical"
      });

      expect(result.mode).toBe("analytical");
      expect(result.reasoning_chain.some(r => r.mode === "analytical")).toBe(true);
    });

    it("processes predictive mode", () => {
      const result = orchestrator.process({
        ...baseRequest,
        mode: "predictive"
      });

      expect(result.reasoning_chain.some(r => r.mode === "ensemble")).toBe(true);
    });

    it("processes ensemble mode", () => {
      const result = orchestrator.process({
        ...baseRequest,
        mode: "ensemble"
      });

      expect(result.reasoning_chain.some(r => r.mode === "ensemble")).toBe(true);
    });

    it("processes causal mode", () => {
      const result = orchestrator.process({
        ...baseRequest,
        mode: "causal"
      });

      expect(result.reasoning_chain.some(r => r.mode === "causal")).toBe(true);
    });
  });

  // ===========================================================================
  // Quick Predict
  // ===========================================================================

  describe("quickPredict", () => {
    it("returns parameters for steel", () => {
      const result = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      expect(result.parameters).toBeDefined();
      expect(Object.keys(result.parameters).length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("returns predicted MRR parameter", () => {
      const result = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      expect(result.parameters.predicted_mrr_mm3pm).toBeDefined();
      expect(result.parameters.predicted_mrr_mm3pm).toBeGreaterThan(0);
    });

    it("returns predicted Ra parameter", () => {
      const result = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      expect(result.parameters.predicted_ra_um).toBeDefined();
      expect(result.parameters.predicted_ra_um).toBeGreaterThan(0);
    });

    it("handles different materials", () => {
      const steel = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      const carbide = orchestrator.quickPredict({
        material: "tungsten_carbide",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      // Both should return valid parameters
      expect(steel.parameters.predicted_mrr_mm3pm).toBeGreaterThan(0);
      expect(carbide.parameters.predicted_mrr_mm3pm).toBeGreaterThan(0);
    });

    it("handles different thicknesses", () => {
      const thin = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 10,
        wire_diameter_mm: 0.25
      });

      const thick = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 50,
        wire_diameter_mm: 0.25
      });

      expect(thin.parameters.predicted_mrr_mm3pm).toBeGreaterThan(0);
      expect(thick.parameters.predicted_mrr_mm3pm).toBeGreaterThan(0);
    });

    it("returns confidence level", () => {
      const result = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("returns warnings array", () => {
      const result = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      expect(Array.isArray(result.warnings)).toBe(true);
    });
  });

  // ===========================================================================
  // Counterfactual Analysis (via process)
  // ===========================================================================

  describe("counterfactual analysis", () => {
    it("generates high_speed scenario", () => {
      const result = orchestrator.process({
        context: { material: "D2", thickness_mm: 25, wire_diameter_mm: 0.25 },
        query: "Analyze",
        include_counterfactuals: true
      });

      const highSpeed = result.counterfactuals_considered.find(c => c.scenario_id === "high_speed");
      expect(highSpeed).toBeDefined();
      expect(highSpeed!.description).toContain("current");
      expect(highSpeed!.risk_assessment.wire_break_risk).toBeGreaterThan(0);
    });

    it("generates high_quality scenario", () => {
      const result = orchestrator.process({
        context: { material: "D2", thickness_mm: 25, wire_diameter_mm: 0.25 },
        query: "Analyze",
        include_counterfactuals: true
      });

      const highQuality = result.counterfactuals_considered.find(c => c.scenario_id === "high_quality");
      expect(highQuality).toBeDefined();
      expect(highQuality!.description).toContain("finish");
    });

    it("generates safe_mode scenario", () => {
      const result = orchestrator.process({
        context: { material: "D2", thickness_mm: 25, wire_diameter_mm: 0.25 },
        query: "Analyze",
        include_counterfactuals: true
      });

      const safeMode = result.counterfactuals_considered.find(c => c.scenario_id === "safe_mode");
      expect(safeMode).toBeDefined();
      expect(safeMode!.risk_assessment.wire_break_risk).toBeLessThan(0.15);
      expect(safeMode!.recommendation).toBe("proceed");
    });

    it("can exclude counterfactuals", () => {
      const result = orchestrator.process({
        context: { material: "D2", thickness_mm: 25, wire_diameter_mm: 0.25 },
        query: "Analyze",
        include_counterfactuals: false
      });

      expect(result.counterfactuals_considered.length).toBe(0);
    });
  });

  // ===========================================================================
  // Causal Analysis
  // ===========================================================================

  describe("causal analysis", () => {
    it("includes peak_current → mrr relationship", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Causal analysis",
        include_causal_analysis: true
      });

      const currentToMrr = result.causal_inferences.find(
        c => c.cause === "peak_current" && c.effect === "mrr"
      );

      expect(currentToMrr).toBeDefined();
      expect(currentToMrr!.direction).toBe("positive");
      expect(currentToMrr!.strength).toBeGreaterThan(0.7);
    });

    it("includes peak_current → surface_roughness relationship", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Causal analysis",
        include_causal_analysis: true
      });

      const currentToRa = result.causal_inferences.find(
        c => c.cause === "peak_current" && c.effect === "surface_roughness"
      );

      expect(currentToRa).toBeDefined();
      expect(currentToRa!.direction).toBe("positive");
    });

    it("includes pulse_on_time → mrr relationship", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Causal analysis",
        include_causal_analysis: true
      });

      const pulseOnToMrr = result.causal_inferences.find(
        c => c.cause === "pulse_on_time" && c.effect === "mrr"
      );

      expect(pulseOnToMrr).toBeDefined();
      expect(pulseOnToMrr!.direction).toBe("positive");
    });

    it("can exclude causal analysis", () => {
      const result = orchestrator.process({
        context: { material: "D2", thickness_mm: 25, wire_diameter_mm: 0.25 },
        query: "Analyze",
        include_causal_analysis: false
      });

      expect(result.causal_inferences.length).toBe(0);
    });
  });

  // ===========================================================================
  // Feedback Learning
  // ===========================================================================

  describe("recordFeedback", () => {
    it("records feedback and increments counter", () => {
      const statusBefore = orchestrator.getStatus();
      const initialFeedback = statusBefore.feedback_received;

      // Make a decision first
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Predict parameters"
      });

      // Record feedback with proper structure
      const feedback: AGIFeedback = {
        decision_id: result.decision_id,
        actual_outcome: { mrr: 48, ra: 0.75 },
        predicted_vs_actual: {
          mrr: { predicted: 50, actual: 48, error: -0.04 },
          ra: { predicted: 0.8, actual: 0.75, error: -0.0625 }
        },
        learning_updates: ["Slightly overestimated MRR"],
        model_adjustments: { mrr_bias: -0.04 }
      };

      orchestrator.recordFeedback(feedback);

      const statusAfter = orchestrator.getStatus();
      expect(statusAfter.feedback_received).toBe(initialFeedback + 1);
    });

    it("tracks multiple feedback entries", () => {
      // Make multiple decisions and record feedback
      for (let i = 0; i < 3; i++) {
        const result = orchestrator.process({
          context: { material: "steel", thickness_mm: 20 + i * 5, wire_diameter_mm: 0.25 },
          query: `Test ${i}`
        });

        orchestrator.recordFeedback({
          decision_id: result.decision_id,
          actual_outcome: { mrr: 45 + i * 5 },
          predicted_vs_actual: {
            mrr: { predicted: 50, actual: 45 + i * 5, error: (45 + i * 5 - 50) / 50 }
          },
          learning_updates: [],
          model_adjustments: {}
        });
      }

      const status = orchestrator.getStatus();
      expect(status.feedback_received).toBeGreaterThanOrEqual(3);
      expect(status.decisions_made).toBeGreaterThanOrEqual(3);
    });
  });

  // ===========================================================================
  // Knowledge Integration
  // ===========================================================================

  describe("knowledge integration", () => {
    it("applies research knowledge with citations", () => {
      const result = orchestrator.process({
        context: {
          material: "steel",
          thickness_mm: 20,
          wire_diameter_mm: 0.25,
          target_ra_um: 0.5
        },
        query: "Full prediction with research basis"
      });

      // Should include research-based knowledge
      const researchKnowledge = result.knowledge_sources.filter(
        k => k.source === "research_paper"
      );

      expect(researchKnowledge.length).toBeGreaterThan(0);
      expect(researchKnowledge[0].citations).toBeDefined();
    });

    it("includes high-confidence knowledge entries", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Test"
      });

      const highConfidence = result.knowledge_sources.filter(
        k => k.confidence >= 0.9
      );

      expect(highConfidence.length).toBeGreaterThan(0);
    });

    it("includes DNN+COOT research entry", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Predict MRR"
      });

      // Should have DNN+COOT in knowledge sources
      const dnnCoot = result.knowledge_sources.find(k =>
        k.content.includes("DNN+COOT") || k.content.includes("98.77%")
      );
      expect(dnnCoot).toBeDefined();
    });
  });

  // ===========================================================================
  // Material Handling
  // ===========================================================================

  describe("material handling", () => {
    const materials = ["D2", "A2", "S7", "M2", "tungsten_carbide", "Ti6Al4V", "aluminum", "copper"];

    for (const mat of materials) {
      it(`processes ${mat} material`, () => {
        const result = orchestrator.quickPredict({
          material: mat,
          thickness_mm: 20,
          wire_diameter_mm: 0.25
        });

        expect(result.parameters).toBeDefined();
        expect(result.confidence).toBeGreaterThan(0);
      });
    }

    it("handles unknown material gracefully", () => {
      const result = orchestrator.quickPredict({
        material: "unobtanium",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      // Should use default factor and return valid result
      expect(result.parameters).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Recommendation Logic
  // ===========================================================================

  describe("recommendation logic", () => {
    it("recommends 4 passes for mirror finish (Ra < 0.5)", () => {
      const result = orchestrator.process({
        context: {
          material: "steel",
          thickness_mm: 20,
          wire_diameter_mm: 0.25,
          target_ra_um: 0.35
        },
        query: "Mirror finish recommendation"
      });

      expect(result.final_recommendation.recommended_passes).toBe(4);
    });

    it("recommends 3 passes for Ra < 1.0", () => {
      const result = orchestrator.process({
        context: {
          material: "steel",
          thickness_mm: 20,
          wire_diameter_mm: 0.25,
          target_ra_um: 0.8
        },
        query: "Fine finish recommendation"
      });

      expect(result.final_recommendation.recommended_passes).toBe(3);
    });

    it("recommends 2 passes for Ra < 2.5", () => {
      const result = orchestrator.process({
        context: {
          material: "steel",
          thickness_mm: 20,
          wire_diameter_mm: 0.25,
          target_ra_um: 2.0
        },
        query: "Standard finish recommendation"
      });

      expect(result.final_recommendation.recommended_passes).toBe(2);
    });

    it("recommends 1 pass for rough cut (Ra >= 2.5)", () => {
      const result = orchestrator.process({
        context: {
          material: "steel",
          thickness_mm: 20,
          wire_diameter_mm: 0.25,
          target_ra_um: 3.0
        },
        query: "Rough cut recommendation"
      });

      expect(result.final_recommendation.recommended_passes).toBe(1);
    });

    it("includes strategy in recommendation", () => {
      const result = orchestrator.process({
        context: {
          material: "steel",
          thickness_mm: 20,
          wire_diameter_mm: 0.25,
          target_ra_um: 0.5
        },
        query: "Strategy recommendation"
      });

      expect(result.final_recommendation.strategy).toBe("balanced_optimization");
    });
  });

  // ===========================================================================
  // Reasoning Chain
  // ===========================================================================

  describe("reasoning chain", () => {
    it("builds step-by-step reasoning chain", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Full analysis"
      });

      expect(result.reasoning_chain.length).toBeGreaterThan(0);

      for (const step of result.reasoning_chain) {
        expect(step.step_number).toBeGreaterThan(0);
        expect(step.mode).toBeDefined();
        expect(step.input).toBeDefined();
        expect(step.reasoning).toBeDefined();
        expect(step.conclusion).toBeDefined();
        expect(step.confidence).toBeGreaterThan(0);
      }
    });

    it("has sequential step numbers", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Analysis"
      });

      for (let i = 0; i < result.reasoning_chain.length; i++) {
        expect(result.reasoning_chain[i].step_number).toBe(i + 1);
      }
    });

    it("includes knowledge references in steps", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: "Analysis"
      });

      // At least one step should reference knowledge
      const stepsWithKnowledge = result.reasoning_chain.filter(
        s => s.knowledge_used && s.knowledge_used.length > 0
      );

      expect(stepsWithKnowledge.length).toBeGreaterThan(0);
    });
  });

  // ===========================================================================
  // Edge Cases
  // ===========================================================================

  describe("edge cases", () => {
    it("handles very thin material", () => {
      const result = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 1,
        wire_diameter_mm: 0.25
      });

      expect(result.parameters).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("handles very thick material", () => {
      const result = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 200,
        wire_diameter_mm: 0.25
      });

      expect(result.parameters).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("handles empty query", () => {
      const result = orchestrator.process({
        context: { material: "steel", thickness_mm: 20, wire_diameter_mm: 0.25 },
        query: ""
      });

      // Should still produce a result
      expect(result.decision_id).toBeDefined();
    });

    it("handles minimal context", () => {
      const result = orchestrator.quickPredict({
        material: "steel",
        thickness_mm: 20,
        wire_diameter_mm: 0.25
      });

      expect(result.parameters).toBeDefined();
    });
  });
});
