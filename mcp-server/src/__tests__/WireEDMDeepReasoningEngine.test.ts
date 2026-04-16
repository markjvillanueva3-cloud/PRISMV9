/**
 * WireEDMDeepReasoningEngine Tests
 *
 * Tests Claude Opus-level deep reasoning capabilities:
 *   - Causal inference
 *   - Diagnostic reasoning
 *   - Analogical reasoning
 *   - Probabilistic reasoning
 *   - Temporal reasoning
 *   - Spatial reasoning
 *
 * @module __tests__/WireEDMDeepReasoningEngine.test
 */

import { describe, it, expect } from "vitest";
import {
  wireEDMDeepReasoningEngine,
  type DeepReasoningResult,
} from "../engines/WireEDMDeepReasoningEngine.js";

// ============================================================================
// CAUSAL REASONING TESTS
// ============================================================================

describe("WireEDMDeepReasoningEngine", () => {
  describe("causal reasoning", () => {
    it("builds forward causal chain from cause", () => {
      const chain = wireEDMDeepReasoningEngine.buildCausalChain("increased ON time");

      expect(chain.root_cause).toContain("ON time");
      expect(chain.links.length).toBeGreaterThan(0);
      expect(chain.total_confidence).toBeGreaterThan(0);
      expect(chain.total_confidence).toBeLessThanOrEqual(1);
    });

    it("finds root cause from effect", () => {
      const chain = wireEDMDeepReasoningEngine.findRootCause("wire breakage");

      expect(chain.final_effect).toContain("wire");
      expect(chain.links.length).toBeGreaterThan(0);
      expect(chain.intervention_points.length).toBeGreaterThan(0);
    });

    it("traces causal chain through multiple steps", () => {
      const chain = wireEDMDeepReasoningEngine.buildCausalChain("poor flushing");

      expect(chain.links.length).toBeGreaterThanOrEqual(2);
      // Should reach wire breakage through debris accumulation
      expect(
        chain.links.some(l => l.effect.toLowerCase().includes("debris") ||
                              l.effect.toLowerCase().includes("arc"))
      ).toBe(true);
    });

    it("provides physics basis for causal links", () => {
      const chain = wireEDMDeepReasoningEngine.buildCausalChain("ON time");

      const linkWithPhysics = chain.links.find(l => l.physics_basis);
      expect(linkWithPhysics).toBeDefined();
      expect(linkWithPhysics?.physics_basis).toBeTruthy();
    });

    it("identifies intervention points", () => {
      const chain = wireEDMDeepReasoningEngine.findRootCause("wire breakage");

      expect(chain.intervention_points.length).toBeGreaterThan(0);
      expect(chain.intervention_points[0]).toContain("Fix:");
    });
  });

  // ============================================================================
  // DIAGNOSTIC REASONING TESTS
  // ============================================================================

  describe("diagnostic reasoning", () => {
    it("diagnoses wire break symptoms", () => {
      const hypotheses = wireEDMDeepReasoningEngine.diagnose([
        "wire breaks frequently",
        "only during rough cut",
      ]);

      expect(hypotheses.length).toBeGreaterThan(0);
      expect(hypotheses[0].hypothesis).toBeTruthy();
      expect(hypotheses[0].posterior_probability).toBeGreaterThan(0);
    });

    it("diagnoses poor surface finish", () => {
      const hypotheses = wireEDMDeepReasoningEngine.diagnose([
        "poor surface finish",
        "skim passes complete",
      ]);

      expect(hypotheses.length).toBeGreaterThan(0);
      expect(hypotheses[0].supporting_evidence.length).toBeGreaterThan(0);
    });

    it("ranks hypotheses by probability", () => {
      const hypotheses = wireEDMDeepReasoningEngine.diagnose([
        "wire breaks",
        "poor finish",
      ]);

      // Should be sorted by posterior probability
      for (let i = 1; i < hypotheses.length; i++) {
        expect(hypotheses[i - 1].posterior_probability)
          .toBeGreaterThanOrEqual(hypotheses[i].posterior_probability);
      }
    });

    it("provides confirmation tests", () => {
      const hypotheses = wireEDMDeepReasoningEngine.diagnose([
        "slow cutting",
        "frequent retracts",
      ]);

      expect(hypotheses[0]?.tests_to_confirm.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // ANALOGICAL REASONING TESTS
  // ============================================================================

  describe("analogical reasoning", () => {
    it("finds analogies for thick section cutting", () => {
      const analogies = wireEDMDeepReasoningEngine.findAnalogies("thick D2 section");

      expect(analogies.length).toBeGreaterThan(0);
      expect(analogies[0].transferred_knowledge.length).toBeGreaterThan(0);
    });

    it("finds analogies for fine finish requirements", () => {
      const analogies = wireEDMDeepReasoningEngine.findAnalogies("fine finish A2");

      expect(analogies.length).toBeGreaterThan(0);
      expect(analogies[0].mapping_confidence).toBeGreaterThan(0.5);
    });

    it("identifies limitations of analogies", () => {
      const analogies = wireEDMDeepReasoningEngine.findAnalogies("thick carbide");

      if (analogies.length > 0) {
        expect(analogies[0].limitations.length).toBeGreaterThan(0);
      }
    });

    it("ranks analogies by confidence", () => {
      const analogies = wireEDMDeepReasoningEngine.findAnalogies("corner geometry");

      for (let i = 1; i < analogies.length; i++) {
        expect(analogies[i - 1].mapping_confidence)
          .toBeGreaterThanOrEqual(analogies[i].mapping_confidence);
      }
    });
  });

  // ============================================================================
  // PROBABILISTIC REASONING TESTS
  // ============================================================================

  describe("probabilistic reasoning", () => {
    it("estimates surface roughness with uncertainty", () => {
      const estimate = wireEDMDeepReasoningEngine.estimateWithUncertainty(
        "surface_roughness",
        { num_passes: 4 }
      );

      expect(estimate.mean).toBeGreaterThan(0);
      expect(estimate.std_dev).toBeGreaterThan(0);
      expect(estimate.confidence_95[0]).toBeLessThan(estimate.mean);
      expect(estimate.confidence_95[1]).toBeGreaterThan(estimate.mean);
    });

    it("estimates cycle time based on thickness", () => {
      const estimate = wireEDMDeepReasoningEngine.estimateWithUncertainty(
        "cycle_time",
        { thickness_mm: 50, num_passes: 4 }
      );

      expect(estimate.mean).toBeGreaterThan(0);
      expect(estimate.distribution).toBe("normal");
    });

    it("estimates wire break probability", () => {
      const thinEstimate = wireEDMDeepReasoningEngine.estimateWithUncertainty(
        "wire_break_probability",
        { thickness_mm: 25 }
      );

      const thickEstimate = wireEDMDeepReasoningEngine.estimateWithUncertainty(
        "wire_break_probability",
        { thickness_mm: 100 }
      );

      // Thicker = higher break probability
      expect(thickEstimate.mean).toBeGreaterThan(thinEstimate.mean);
    });

    it("provides source attribution", () => {
      const estimate = wireEDMDeepReasoningEngine.estimateWithUncertainty(
        "surface_roughness",
        {}
      );

      expect(estimate.source).toBeTruthy();
    });
  });

  // ============================================================================
  // MAIN REASONING ENTRY POINT TESTS
  // ============================================================================

  describe("reason (main entry point)", () => {
    it("selects causal mode for 'why' questions", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "Why does wire break during thick section cutting?"
      );

      expect(result.mode).toBe("causal");
      expect(result.causal_chains).toBeDefined();
    });

    it("selects diagnostic mode for problem descriptions", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "Fix the wire break issue",
        { symptoms: ["wire breaks frequently"] }
      );

      expect(result.mode).toBe("diagnostic");
      expect(result.hypotheses).toBeDefined();
    });

    it("selects analogical mode for similarity questions", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "Is this similar to cutting D2?"
      );

      expect(result.mode).toBe("analogical");
    });

    it("selects probabilistic mode for likelihood questions", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "What is the probability of achieving Ra 0.2?"
      );

      expect(result.mode).toBe("probabilistic");
    });

    it("selects prescriptive mode for 'should' questions", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "What parameters should I use for D2?"
      );

      expect(result.mode).toBe("prescriptive");
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("provides reasoning trace", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "What is the best approach for this part?"
      );

      expect(result.reasoning_trace.length).toBeGreaterThan(0);
      expect(result.reasoning_trace[0].step).toBe(1);
      expect(result.reasoning_trace[0].confidence).toBeGreaterThan(0);
    });

    it("identifies risks", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "How should I cut this thick carbide?",
        { thickness_mm: 100 }
      );

      expect(result.risks.length).toBeGreaterThan(0);
      expect(result.risks[0].mitigation).toBeTruthy();
    });

    it("provides conclusion with confidence", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "What E-code should I use?"
      );

      expect(result.conclusion).toBeTruthy();
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // TEMPORAL REASONING TESTS
  // ============================================================================

  describe("temporal reasoning", () => {
    it("models process stages for sequence questions", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "What is the sequence of Wire EDM passes?"
      );

      expect(result.mode).toBe("temporal");
      expect(result.temporal_model).toBeDefined();
      expect(result.temporal_model!.length).toBeGreaterThan(0);
    });

    it("identifies stage transitions", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "When should I switch from rough to skim?"
      );

      if (result.temporal_model) {
        const hasTransition = result.temporal_model.some(s => s.next_states.length > 0);
        expect(hasTransition).toBe(true);
      }
    });
  });

  // ============================================================================
  // SPATIAL REASONING TESTS
  // ============================================================================

  describe("spatial reasoning", () => {
    it("analyzes corner geometry", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "How should I handle sharp inside corners?"
      );

      expect(result.mode).toBe("spatial");
      expect(result.spatial_analysis).toBeDefined();
    });

    it("analyzes taper geometry", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "What about corner geometry with taper angle compensation?"
      );

      // Taper analysis happens within spatial mode
      expect(result.mode).toBe("spatial");
    });

    it("assesses wire deflection risk", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "What is the corner geometry deflection risk?"
      );

      expect(result.mode).toBe("spatial");
      if (result.spatial_analysis && result.spatial_analysis.length > 0) {
        expect(result.spatial_analysis[0].wire_deflection_risk).toBeGreaterThanOrEqual(0);
        expect(result.spatial_analysis[0].wire_deflection_risk).toBeLessThanOrEqual(1);
      }
    });
  });

  // ============================================================================
  // INTEGRATION TESTS
  // ============================================================================

  describe("integration", () => {
    it("synthesizes multiple reasoning modes", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "What should I do about frequent wire breaks on thick D2?",
        {
          material: "D2",
          thickness_mm: 100,
          symptoms: ["wire breaks", "slow cutting"],
        }
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.conclusion).toBeTruthy();
    });

    it("handles complex multi-factor queries", () => {
      const result = wireEDMDeepReasoningEngine.reason(
        "Why is my surface finish poor and what should I do?",
        {
          material: "A2",
          symptoms: ["poor finish", "skim complete"],
        }
      );

      expect(result.recommendations.length).toBeGreaterThan(0);
      expect(result.risks.length).toBeGreaterThan(0);
    });
  });
});
