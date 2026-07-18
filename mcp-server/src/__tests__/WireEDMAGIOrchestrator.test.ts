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

      // Strengthened from a presence-only check: parameters must be a non-empty
      // Record<string, number> per the quickPredict return type.
      const keys = Object.keys(result.parameters);
      expect(keys.length).toBeGreaterThan(0);
      for (const k of keys) {
        expect(Number.isFinite(result.parameters[k])).toBe(true);
      }
    });
  });
});

// ============================================================================
// INFRA-AGI-ROUTER-MS2/P0-U04 — DomainAGIIntent contract adapter
// ============================================================================

import {
  type WedmOrchestrateOptions,
  type WedmDecisionValue,
} from "../engines/WireEDMAGIOrchestrator.js";
import {
  type DomainAGIIntent,
} from "../schemas/domainAGIContract.js";
import { OutcomeEventSchema, type OutcomeEvent } from "../schemas/outcomeEventSchema.js";
import type { Tier6GeomResult } from "../engines/WEDMTier6GeomGateEngine.js";

function makeOrchestrateRig(seamOverrides: Partial<WedmOrchestrateOptions> = {}) {
  const engine = new WireEDMAGIOrchestrator();
  const published: OutcomeEvent[] = [];
  const fakeTier6Pass: Tier6GeomResult = {
    success: true,
    part_id: "rig-default",
    safety_score: 0.95,
    verdict: "pass",
    min_achievable_radius_mm: 0.3,
    corners: [], slots: [], stations: [], envelope: [],
    error_counts: { pass: 1, warning: 0, error: 0, hard_block: 0 },
    tribal_override_applied: false,
    recommendations: [],
    summary: "Tier-6 pass",
  };
  const realSeams: WedmOrchestrateOptions = {
    publishOutcome: (event) => { published.push(event); },
    tier6Check: () => fakeTier6Pass,
    ...seamOverrides,
  };
  return { engine, published, realSeams };
}

function wedmIntent(overrides: Partial<DomainAGIIntent> = {}): DomainAGIIntent {
  return {
    schemaVersion: "1.0.0",
    domain: "wedm",
    action: "rough_cut",
    features: [{ id: "F-001", kind: "profile", dimensions: { thickness_mm: 25, wire_diameter_mm: 0.25 } }],
    material: "D2",
    constraints: {},
    consensusRequired: false,
    ...overrides,
  };
}

describe("WireEDMAGIOrchestrator.orchestrate — DomainAGIIntent contract (P0-U04)", () => {
  describe("happy path — produces 3 decisions per WEDM action", () => {
    it("rough_cut → strategy/param/safety decisions with single-pass-rough pick", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const result = await engine.orchestrate(wedmIntent({ action: "rough_cut" }), realSeams);
      expect(result.success).toBe(true);
      expect(result.error === undefined).toBe(true);
      expect(result.decisions.map((d) => d.kind)).toEqual(["strategy", "param", "safety"]);
      const strat = result.decisions[0].value as WedmDecisionValue;
      expect(strat.selected).toBe("single_pass_rough_high_energy");
      expect(strat.enginePick).toBe("single_pass_rough_high_energy");
      expect(strat.consensusOverride).toBe(false);
    });

    it("skim_pass → finish_skim_2pass strategy", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const result = await engine.orchestrate(wedmIntent({ action: "skim_pass" }), realSeams);
      expect(result.success).toBe(true);
      const strat = result.decisions[0].value as WedmDecisionValue;
      expect(strat.selected).toBe("finish_skim_2pass_offset");
    });

    it("taper_cut → angled_uv_taper strategy", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const result = await engine.orchestrate(wedmIntent({ action: "taper_cut" }), realSeams);
      expect(result.success).toBe(true);
      const strat = result.decisions[0].value as WedmDecisionValue;
      expect(strat.selected).toBe("angled_uv_taper_continuous");
    });

    it("start_hole / no_core_cut / corner_strategy — exhaustiveness coverage", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const acts: DomainAGIIntent["action"][] = ["start_hole", "no_core_cut", "corner_strategy"];
      const results = await Promise.all(acts.map((action) => engine.orchestrate(wedmIntent({ action }), realSeams)));
      const expected: Record<string, string> = {
        start_hole: "edm_pierce_no_threading",
        no_core_cut: "destructive_no_core_removal",
        corner_strategy: "feed_dwell_corner_compensation",
      };
      for (let i = 0; i < acts.length; i++) {
        expect(results[i].success).toBe(true);
        const sv = results[i].decisions[0].value as WedmDecisionValue;
        expect(sv.selected).toBe(expected[acts[i] as string]);
      }
    });
  });

  describe("confidence rollup — joint probability (NOT min/max/mean)", () => {
    it("pipeline confidence equals the product of per-decision confidences", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      const product = result.decisions.reduce((acc, d) => acc * d.confidence, 1);
      expect(result.confidence).toBeCloseTo(product, 10);
      // Strictly LESS than any single confidence proves not min/max/mean.
      expect(result.confidence).toBeLessThan(result.decisions[0].confidence);
    });

    it("zero per-decision confidence zeroes the rollup (multiplicative)", async () => {
      const { engine, realSeams } = makeOrchestrateRig({
        consensusDecide: async (q) => ({ answer: q.options[0], confidence: 0, voters: [] }),
      });
      const result = await engine.orchestrate(wedmIntent({ consensusRequired: true }), realSeams);
      expect(result.success).toBe(true);
      expect(result.confidence).toBe(0);
    });
  });

  describe("outcome events — MS1 cross_process_decision contract", () => {
    it("emits one schema-valid v1.1.0 outcome per decision", async () => {
      const { engine, published, realSeams } = makeOrchestrateRig();
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      expect(published).toHaveLength(3);
      expect(result.outcomes).toHaveLength(3);
      for (const e of published) {
        expect(() => OutcomeEventSchema.parse(e)).not.toThrow();
        expect(e.schemaVersion).toBe("1.1.0");
        expect(e.kind).toBe("cross_process_decision");
        expect(e.domain).toBe("wedm");
      }
    });

    it("recommended payload deep-equals the decision value", async () => {
      const { engine, published, realSeams } = makeOrchestrateRig();
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      for (let i = 0; i < result.decisions.length; i++) {
        expect(published[i].recommended).toEqual(result.decisions[i].value);
      }
    });

    it("shares one job_id, distinct lineage_ids", async () => {
      const { engine, published, realSeams } = makeOrchestrateRig();
      await engine.orchestrate(wedmIntent(), realSeams);
      const jobIds = new Set(published.map((e) => e.context.job_id));
      const lineageIds = new Set(published.map((e) => e.lineage_id));
      expect(jobIds.size).toBe(1);
      expect([...jobIds][0]).toMatch(/^wedm-agi-job-/);
      expect(lineageIds.size).toBe(3);
    });

    it("publish-throws → warning, NOT fatal", async () => {
      const { engine, realSeams } = makeOrchestrateRig({
        publishOutcome: () => { throw new Error("bus down"); },
      });
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => /bus down/.test(w))).toBe(true);
    });
  });

  describe("consensus gating — only when intent.consensusRequired", () => {
    it("non-consensus path NEVER invokes the consensus seam", async () => {
      let called = false;
      const { engine, realSeams } = makeOrchestrateRig({
        consensusDecide: async (q) => { called = true; return { answer: q.options[0], confidence: 1, voters: [] }; },
      });
      await engine.orchestrate(wedmIntent({ consensusRequired: false }), realSeams);
      expect(called).toBe(false);
    });

    it("consensus override populates alternatives + flips selected, preserves enginePick", async () => {
      const { engine, realSeams } = makeOrchestrateRig({
        consensusDecide: async (q) => ({
          answer: q.options[1],
          confidence: 0.7,
          voters: ["fake-a", "fake-b"],
        }),
      });
      const result = await engine.orchestrate(wedmIntent({ consensusRequired: true }), realSeams);
      const strat = result.decisions[0].value as WedmDecisionValue;
      expect(strat.consensusOverride).toBe(true);
      expect(strat.selected).not.toBe(strat.enginePick);
      expect(strat.enginePick).toBe("single_pass_rough_high_energy");
      const alts = result.decisions[0].alternatives ?? [];
      expect(alts.length).toBeGreaterThan(0);
      expect(alts.map((a) => a.value)).toContain("single_pass_rough_high_energy");
      expect(result.warnings.some((w) => /Consensus overrode/.test(w))).toBe(true);
    });

    it("surfaces auditId ONLY when seam returns one (R12 — no fabricated pointer)", async () => {
      const withId = makeOrchestrateRig({
        consensusDecide: async (q) => ({ answer: q.options[0], confidence: 0.9, voters: ["v"], auditId: "audit-real-001" }),
      });
      const withoutId = makeOrchestrateRig({
        consensusDecide: async (q) => ({ answer: q.options[0], confidence: 0.9, voters: ["v"] }),
      });
      const [rWith, rWithout] = await Promise.all([
        withId.engine.orchestrate(wedmIntent({ consensusRequired: true }), withId.realSeams),
        withoutId.engine.orchestrate(wedmIntent({ consensusRequired: true }), withoutId.realSeams),
      ]);
      expect(rWith.decisions[0].consensus_audit_id).toBe("audit-real-001");
      // Spread `...(consensusAuditId ? {...} : {})` means absent, not just undefined.
      expect("consensus_audit_id" in rWithout.decisions[0]).toBe(false);
    });

    it("consensus throw → warning + engine pick fallback (does NOT fail the run)", async () => {
      const { engine, realSeams } = makeOrchestrateRig({
        consensusDecide: async () => { throw new Error("model timeout"); },
      });
      const result = await engine.orchestrate(wedmIntent({ consensusRequired: true }), realSeams);
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => /Consensus call failed.*model timeout/.test(w))).toBe(true);
      const strat = result.decisions[0].value as WedmDecisionValue;
      expect(strat.selected).toBe("single_pass_rough_high_energy");
      expect(strat.consensusOverride).toBe(false);
    });

    it("default consensus seam refuses to run under VITEST without injection (fail-loud)", async () => {
      const { engine } = makeOrchestrateRig();
      const result = await engine.orchestrate(
        wedmIntent({ consensusRequired: true }),
        { publishOutcome: () => {}, tier6Check: () => ({
            success: true, part_id: "x", safety_score: 1, verdict: "pass" as const,
            min_achievable_radius_mm: 0.3, corners: [], slots: [], stations: [], envelope: [],
            error_counts: { pass: 1, warning: 0, error: 0, hard_block: 0 },
            tribal_override_applied: false, recommendations: [], summary: "ok",
        }) },
      );
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => /Consensus call failed/.test(w))).toBe(true);
    });
  });

  describe("validation + error paths", () => {
    it("INVALID_INTENT on cross-domain action ('turning' for wedm domain)", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const bad = { ...wedmIntent(), action: "turning" as unknown as DomainAGIIntent["action"] };
      const result = await engine.orchestrate(bad, realSeams);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("INVALID_INTENT");
      expect(result.error?.stage).toBe("validation");
    });

    it("WRONG_DOMAIN when a mill intent lands here", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const mill: DomainAGIIntent = {
        schemaVersion: "1.0.0",
        domain: "mill",
        action: "roughing",
        features: [],
        material: "1018",
        constraints: {},
        consensusRequired: false,
      };
      const result = await engine.orchestrate(mill, realSeams);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("WRONG_DOMAIN");
    });

    it("REASONING_FAILED when the AGI reasoner throws — error message propagates", async () => {
      const { engine, realSeams } = makeOrchestrateRig({
        agiReason: () => { throw new Error("AGI boom"); },
      });
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("REASONING_FAILED");
      expect(result.error?.message).toMatch(/AGI boom/);
    });

    it("REASONING_INCOMPLETE on empty final_recommendation", async () => {
      const { engine, realSeams } = makeOrchestrateRig({
        agiReason: () => ({
          decision_id: "fake", query: "x", mode: "analytical",
          reasoning_chain: [], final_recommendation: {}, confidence: 0.5,
          knowledge_sources: [], counterfactuals_considered: [], causal_inferences: [],
          time_to_decision_ms: 0,
          self_assessment: { reasoning_quality: 0.5, knowledge_coverage: 0.5, uncertainty_handled: 0.5 },
        }),
      });
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("REASONING_INCOMPLETE");
    });

    it("SAFETY_FLOOR_VIOLATED on Tier-6 hard-block (Tier-6 IS the WEDM safety floor)", async () => {
      const blockedTier6: Tier6GeomResult = {
        success: false, part_id: "x", safety_score: 0.1, verdict: "hard_block",
        min_achievable_radius_mm: 0.5,
        corners: [{ corner_id: "c1", radius_mm: 0.1, min_required_mm: 0.5, margin_mm: -0.4, severity: "hard_block", message: "corner radius below wire+gap" }],
        slots: [], stations: [], envelope: [],
        error_counts: { pass: 0, warning: 0, error: 0, hard_block: 1 },
        tribal_override_applied: false, recommendations: [], summary: "Tier-6 hard-block",
      };
      const { engine, realSeams } = makeOrchestrateRig({ tier6Check: () => blockedTier6 });
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      expect(result.success).toBe(false);
      expect(result.error?.code).toBe("SAFETY_FLOOR_VIOLATED");
      expect(result.error?.message).toMatch(/corner radius below wire\+gap/);
    });

    it("Tier-6 warning verdict succeeds + surfaces the warning", async () => {
      const warnedTier6: Tier6GeomResult = {
        success: true, part_id: "x", safety_score: 0.72, verdict: "warning",
        min_achievable_radius_mm: 0.3,
        corners: [{ corner_id: "c1", radius_mm: 0.4, min_required_mm: 0.5, margin_mm: -0.1, severity: "warning", message: "tight corner" }],
        slots: [], stations: [], envelope: [],
        error_counts: { pass: 0, warning: 1, error: 0, hard_block: 0 },
        tribal_override_applied: false, recommendations: [], summary: "Tier-6 warning",
      };
      const { engine, realSeams } = makeOrchestrateRig({ tier6Check: () => warnedTier6 });
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => /tight corner/.test(w))).toBe(true);
    });
  });

  describe("intent → context mapping", () => {
    it("defaults thickness + wire-dia + emits warnings when both omitted", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const bare = wedmIntent({ features: [] });
      const result = await engine.orchestrate(bare, realSeams);
      expect(result.success).toBe(true);
      expect(result.warnings.some((w) => /Thickness not provided/.test(w))).toBe(true);
      expect(result.warnings.some((w) => /Wire diameter not provided/.test(w))).toBe(true);
    });

    it("forwards explicit thickness + wire_diameter to Tier-6 input", async () => {
      let capturedThickness = -1;
      let capturedWire = -1;
      const { engine, realSeams } = makeOrchestrateRig({
        tier6Check: (input) => {
          capturedThickness = input.thickness_mm;
          capturedWire = input.wire_diameter_mm ?? -1;
          return {
            success: true, part_id: input.part_id, safety_score: 1, verdict: "pass",
            min_achievable_radius_mm: 0.3, corners: [], slots: [], stations: [], envelope: [],
            error_counts: { pass: 1, warning: 0, error: 0, hard_block: 0 },
            tribal_override_applied: false, recommendations: [], summary: "ok",
          };
        },
      });
      await engine.orchestrate(
        wedmIntent({
          features: [{ id: "F-2", kind: "slot", dimensions: { thickness_mm: 12.7, wire_diameter_mm: 0.20 } }],
        }),
        realSeams,
      );
      expect(capturedThickness).toBe(12.7);
      expect(capturedWire).toBe(0.20);
    });

    it("strategy detail propagates action + material into the decision payload", async () => {
      const { engine, realSeams } = makeOrchestrateRig();
      const result = await engine.orchestrate(
        wedmIntent({ action: "taper_cut", material: "Inconel_718" }),
        realSeams,
      );
      const strat = result.decisions[0].value as WedmDecisionValue;
      const detail = strat.detail as { strategy: string; action: string; material: string };
      expect(detail.action).toBe("taper_cut");
      expect(detail.material).toBe("Inconel_718");
    });
  });

  describe("param decision — AGI reasoner output", () => {
    it("param.detail equals reasoner's final_recommendation verbatim", async () => {
      const customRec = { peak_current_a: 4.2, pulse_on_us: 22, pulse_off_us: 8, wire_tension_n: 12 };
      const { engine, realSeams } = makeOrchestrateRig({
        agiReason: () => ({
          decision_id: "fake", query: "x", mode: "analytical",
          reasoning_chain: [], final_recommendation: customRec, confidence: 0.85,
          knowledge_sources: [], counterfactuals_considered: [], causal_inferences: [],
          time_to_decision_ms: 0,
          self_assessment: { reasoning_quality: 0.85, knowledge_coverage: 0.85, uncertainty_handled: 0.85 },
        }),
      });
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      const param = result.decisions[1].value as WedmDecisionValue;
      expect(param.detail).toEqual(customRec);
      // Engine pick label assembles first 3 numeric params verbatim.
      expect(param.enginePick).toBe("peak_current_a=4.2 pulse_on_us=22 pulse_off_us=8");
    });
  });

  describe("safety decision — Tier-6 verdict surfaced", () => {
    it("safety.detail carries verdict + S(x) + min radius + recommendations", async () => {
      const customTier6: Tier6GeomResult = {
        success: true, part_id: "x", safety_score: 0.88, verdict: "pass",
        min_achievable_radius_mm: 0.275,
        corners: [], slots: [], stations: [], envelope: [],
        error_counts: { pass: 2, warning: 0, error: 0, hard_block: 0 },
        tribal_override_applied: false,
        recommendations: ["increase flushing pressure for stack >50mm"],
        summary: "Tier-6 pass with one recommendation",
      };
      const { engine, realSeams } = makeOrchestrateRig({ tier6Check: () => customTier6 });
      const result = await engine.orchestrate(wedmIntent(), realSeams);
      const safety = result.decisions[2].value as WedmDecisionValue;
      const detail = safety.detail as { verdict: string; safety_score: number; min_achievable_radius_mm: number; recommendations: string[] };
      expect(detail.verdict).toBe("pass");
      expect(detail.safety_score).toBeCloseTo(0.88, 5);
      expect(detail.min_achievable_radius_mm).toBeCloseTo(0.275, 5);
      expect(detail.recommendations).toContain("increase flushing pressure for stack >50mm");
      expect(result.decisions[2].confidence).toBeCloseTo(0.88, 5);
    });
  });
});
