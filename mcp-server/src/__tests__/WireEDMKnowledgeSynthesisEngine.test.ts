/**
 * WireEDMKnowledgeSynthesisEngine Tests
 *
 * Tests unified knowledge fusion for Wire EDM:
 * - Multi-source evidence gathering
 * - Conflict resolution
 * - Bayesian belief synthesis
 * - Counterfactual analysis
 * - Hypothesis evaluation
 * - Adaptive learning
 *
 * @module __tests__/WireEDMKnowledgeSynthesisEngine.test
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  wireEDMKnowledgeSynthesisEngine,
  WireEDMKnowledgeSynthesisEngine,
  type SynthesisQuery,
} from "../engines/WireEDMKnowledgeSynthesisEngine.js";

describe("WireEDMKnowledgeSynthesisEngine", () => {
  let engine: WireEDMKnowledgeSynthesisEngine;

  beforeEach(() => {
    engine = new WireEDMKnowledgeSynthesisEngine();
  });

  // ============================================================================
  // SYNTHESIS TESTS
  // ============================================================================

  describe("synthesize", () => {
    it("synthesizes answer for parameter query", async () => {
      const query: SynthesisQuery = {
        question: "What settings should I use for D2 at 25mm?",
        context: { material: "D2", thickness_mm: 25 },
      };

      const result = await engine.synthesize(query);

      expect(result.query_id).toMatch(/^synth-/);
      expect(result.synthesized_answer).toBeDefined();
      expect(result.synthesized_answer.statement).toBeTruthy();
      expect(result.synthesized_answer.posterior_probability).toBeGreaterThan(0);
      expect(result.synthesized_answer.evidence_pieces.length).toBeGreaterThan(0);
    });

    it("synthesizes answer for troubleshooting query", async () => {
      const query: SynthesisQuery = {
        question: "Why is my wire breaking frequently?",
        context: { thickness_mm: 80 },
      };

      const result = await engine.synthesize(query);

      expect(result.synthesized_answer.statement).toBeTruthy();
      expect(result.hypothesis_evaluation).toBeDefined();
      expect(result.hypothesis_evaluation!.hypotheses.length).toBeGreaterThan(0);
    });

    it("synthesizes answer for surface finish query", async () => {
      const query: SynthesisQuery = {
        question: "How can I improve surface finish Ra?",
        context: { material: "A2", num_passes: 4, target_ra_um: 0.4 },
      };

      const result = await engine.synthesize(query);

      expect(result.synthesized_answer.evidence_pieces.length).toBeGreaterThan(0);
      expect(result.action_recommendations.length).toBeGreaterThan(0);
    });

    it("includes timestamp and query ID", async () => {
      const result = await engine.synthesize({
        question: "What is the best approach for thick sections?",
      });

      expect(result.timestamp).toMatch(/^\d{4}-\d{2}-\d{2}T/);
      expect(result.query_id).toBeTruthy();
    });

    it("includes meta information", async () => {
      const result = await engine.synthesize({
        question: "What parameters for tungsten carbide?",
        context: { material: "tungsten_carbide", thickness_mm: 20 },
      });

      expect(result.meta.sources_consulted.length).toBeGreaterThan(0);
      expect(result.meta.total_evidence_pieces).toBeGreaterThan(0);
      expect(result.meta.synthesis_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  // ============================================================================
  // EVIDENCE GATHERING TESTS
  // ============================================================================

  describe("evidence gathering", () => {
    it("gathers physics evidence for MRR queries", async () => {
      const result = await engine.synthesize({
        question: "What affects material removal rate in wire EDM?",
      });

      const physicsEvidence = result.synthesized_answer.evidence_pieces.filter(
        (e) => e.source_type === "physics"
      );

      expect(physicsEvidence.length).toBeGreaterThan(0);
      expect(physicsEvidence[0].source_name).toContain("Kunieda");
    });

    it("gathers tribal evidence for wire break queries", async () => {
      const result = await engine.synthesize({
        question: "My wire keeps breaking during roughing",
      });

      const tribalEvidence = result.synthesized_answer.evidence_pieces.filter(
        (e) => e.source_type === "tribal"
      );

      expect(tribalEvidence.length).toBeGreaterThan(0);
    });

    it("gathers empirical evidence for E-code queries", async () => {
      const result = await engine.synthesize({
        question: "What E-code parameters should I use?",
        context: { material: "D2", thickness_mm: 30 },
      });

      const empiricalEvidence = result.synthesized_answer.evidence_pieces.filter(
        (e) => e.source_type === "empirical"
      );

      expect(empiricalEvidence.length).toBeGreaterThan(0);
    });

    it("gathers JM Die specific evidence", async () => {
      const result = await engine.synthesize({
        question: "What is the standard approach for die work?",
      });

      const jmDieEvidence = result.synthesized_answer.evidence_pieces.filter(
        (e) => e.source_type === "jm_die_specific"
      );

      expect(jmDieEvidence.length).toBeGreaterThan(0);
      expect(jmDieEvidence[0].claim).toContain("JM Die");
    });

    it("gathers neural evidence when context is provided", async () => {
      const result = await engine.synthesize({
        question: "Predict the Ra for this setup",
        context: { material: "D2", thickness_mm: 25 },
      });

      const neuralEvidence = result.synthesized_answer.evidence_pieces.filter(
        (e) => e.source_type === "neural"
      );

      expect(neuralEvidence.length).toBeGreaterThan(0);
      expect(neuralEvidence[0].supporting_data).toHaveProperty("predicted_ra");
    });

    it("respects exclude_sources option", async () => {
      const result = await engine.synthesize({
        question: "What settings for D2?",
        context: { material: "D2" },
        exclude_sources: ["neural", "tribal"],
      });

      const excluded = result.synthesized_answer.evidence_pieces.filter(
        (e) => e.source_type === "neural" || e.source_type === "tribal"
      );

      expect(excluded.length).toBe(0);
    });
  });

  // ============================================================================
  // CONFLICT RESOLUTION TESTS
  // ============================================================================

  describe("conflict resolution", () => {
    it("resolves conflicts between sources", async () => {
      const result = await engine.synthesize({
        question: "How many passes for Ra 0.3um on D2?",
        context: { material: "D2", target_ra_um: 0.3 },
      });

      // Conflicts may or may not exist depending on evidence
      expect(result.meta.conflicts_resolved).toBeGreaterThanOrEqual(0);
    });

    it("adjusts confidence after conflict resolution", async () => {
      const result = await engine.synthesize({
        question: "What is the optimal number of passes?",
        context: { material: "D2", thickness_mm: 25 },
      });

      // All evidence pieces should have valid confidence
      for (const evidence of result.synthesized_answer.evidence_pieces) {
        expect(evidence.confidence).toBeGreaterThan(0);
        expect(evidence.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  // ============================================================================
  // BELIEF SYNTHESIS TESTS
  // ============================================================================

  describe("belief synthesis", () => {
    it("calculates posterior probability", async () => {
      const result = await engine.synthesize({
        question: "What settings for A2 steel?",
        context: { material: "A2" },
      });

      expect(result.synthesized_answer.posterior_probability).toBeGreaterThan(0);
      expect(result.synthesized_answer.posterior_probability).toBeLessThanOrEqual(1);
    });

    it("includes reasoning trace", async () => {
      const result = await engine.synthesize({
        question: "What parameters should I use?",
        context: { material: "D2" },
      });

      expect(result.synthesized_answer.reasoning_trace.length).toBeGreaterThan(0);
      expect(result.synthesized_answer.reasoning_trace[0]).toContain("synthesis");
    });

    it("identifies uncertainty sources", async () => {
      const result = await engine.synthesize({
        question: "What about exotic material XYZ?",
      });

      // Should identify knowledge gaps for unknown material
      expect(result.knowledge_gaps.length).toBeGreaterThan(0);
    });

    it("calculates actionable confidence", async () => {
      const result = await engine.synthesize({
        question: "What settings for D2 at 25mm?",
        context: { material: "D2", thickness_mm: 25 },
      });

      // High confidence queries should have actionable confidence > 0
      if (result.synthesized_answer.posterior_probability > 0.7) {
        expect(result.synthesized_answer.actionable_confidence).toBeGreaterThan(0);
      }
    });

    it("generates supporting beliefs", async () => {
      const result = await engine.synthesize({
        question: "What is the best approach?",
        context: { material: "D2", thickness_mm: 25 },
      });

      expect(result.supporting_beliefs.length).toBeGreaterThan(0);
    });
  });

  // ============================================================================
  // COUNTERFACTUAL ANALYSIS TESTS
  // ============================================================================

  describe("counterfactual analysis", () => {
    it("runs counterfactuals when context has passes", async () => {
      const result = await engine.synthesize({
        question: "Should I add another pass?",
        context: { material: "D2", num_passes: 4 },
      });

      expect(result.counterfactuals_considered.length).toBeGreaterThan(0);
    });

    it("includes pass counterfactual with Ra prediction", async () => {
      const result = await engine.synthesize({
        question: "What if I add a skim pass?",
        context: { num_passes: 4, target_ra_um: 0.5 },
      });

      const passCounterfactual = result.counterfactuals_considered.find(
        (cf) => cf.base_case.passes !== undefined
      );

      if (passCounterfactual) {
        expect(passCounterfactual.predicted_outcomes.length).toBeGreaterThan(0);
        expect(passCounterfactual.predicted_outcomes[0].metric).toBe("Ra (µm)");
      }
    });

    it("includes thickness counterfactual", async () => {
      const result = await engine.synthesize({
        question: "What if the section were thicker?",
        context: { thickness_mm: 50 },
      });

      const thicknessCounterfactual = result.counterfactuals_considered.find(
        (cf) => cf.base_case.thickness_mm !== undefined
      );

      expect(thicknessCounterfactual).toBeDefined();
      expect(thicknessCounterfactual!.causal_mechanisms.length).toBeGreaterThan(0);
    });

    it("includes risk assessment in counterfactuals", async () => {
      const result = await engine.synthesize({
        question: "What are the risks of thicker material?",
        context: { thickness_mm: 60 },
      });

      const cf = result.counterfactuals_considered[0];
      if (cf) {
        expect(cf.risk_assessment.length).toBeGreaterThan(0);
        expect(cf.risk_assessment[0].severity).toMatch(/low|medium|high|critical/);
      }
    });
  });

  // ============================================================================
  // HYPOTHESIS EVALUATION TESTS
  // ============================================================================

  describe("hypothesis evaluation", () => {
    it("evaluates hypotheses for troubleshooting queries", async () => {
      const result = await engine.synthesize({
        question: "Why is wire breaking?",
      });

      expect(result.hypothesis_evaluation).toBeDefined();
      expect(result.hypothesis_evaluation!.hypotheses.length).toBeGreaterThan(0);
    });

    it("calculates posterior probabilities for hypotheses", async () => {
      const result = await engine.synthesize({
        question: "What is causing the poor surface finish?",
      });

      if (result.hypothesis_evaluation) {
        for (const h of result.hypothesis_evaluation.hypotheses) {
          expect(h.posterior).toBeGreaterThan(0);
          expect(h.posterior).toBeLessThanOrEqual(1);
        }
      }
    });

    it("identifies best hypothesis", async () => {
      const result = await engine.synthesize({
        question: "Why does this problem occur?",
      });

      if (result.hypothesis_evaluation) {
        expect(result.hypothesis_evaluation.best_hypothesis).toBeTruthy();
      }
    });

    it("provides tests to discriminate hypotheses", async () => {
      const result = await engine.synthesize({
        question: "What is causing the wire breaks?",
      });

      if (result.hypothesis_evaluation) {
        const topHypothesis = result.hypothesis_evaluation.hypotheses[0];
        expect(topHypothesis.tests_to_discriminate.length).toBeGreaterThan(0);
      }
    });

    it("calculates discrimination power", async () => {
      const result = await engine.synthesize({
        question: "What is the root cause of this issue?",
      });

      if (result.hypothesis_evaluation) {
        expect(result.hypothesis_evaluation.discrimination_power).toBeGreaterThanOrEqual(0);
        expect(result.hypothesis_evaluation.discrimination_power).toBeLessThanOrEqual(1);
      }
    });
  });

  // ============================================================================
  // RECOMMENDATIONS TESTS
  // ============================================================================

  describe("action recommendations", () => {
    it("generates action recommendations", async () => {
      const result = await engine.synthesize({
        question: "What should I do for D2 at 25mm?",
        context: { material: "D2", thickness_mm: 25 },
      });

      expect(result.action_recommendations.length).toBeGreaterThan(0);
    });

    it("prioritizes recommendations", async () => {
      const result = await engine.synthesize({
        question: "How to handle thick section?",
        context: { thickness_mm: 100 },
      });

      // Recommendations should be sorted by priority
      for (let i = 1; i < result.action_recommendations.length; i++) {
        expect(result.action_recommendations[i].priority).toBeGreaterThanOrEqual(
          result.action_recommendations[i - 1].priority
        );
      }
    });

    it("includes confidence and rationale", async () => {
      const result = await engine.synthesize({
        question: "What settings for S7?",
        context: { material: "S7" },
      });

      for (const rec of result.action_recommendations) {
        expect(rec.confidence).toBeGreaterThan(0);
        expect(rec.rationale).toBeTruthy();
      }
    });
  });

  // ============================================================================
  // KNOWLEDGE GAPS TESTS
  // ============================================================================

  describe("knowledge gaps", () => {
    it("identifies missing source types", async () => {
      const result = await engine.synthesize({
        question: "Simple query",
        exclude_sources: ["physics", "empirical"],
      });

      expect(result.knowledge_gaps.length).toBeGreaterThan(0);
    });

    it("identifies unknown material gap", async () => {
      const result = await engine.synthesize({
        question: "What about Inconel 718?",
        context: { material: "inconel_718" },
      });

      expect(result.knowledge_gaps.some((g) => g.includes("material"))).toBe(true);
    });
  });

  // ============================================================================
  // LEARNING TESTS
  // ============================================================================

  describe("adaptive learning", () => {
    it("records outcome for learning", () => {
      const scenario = { material: "D2", thickness_mm: 25, num_passes: 4 };
      const prediction = { ra_um: 0.6 };
      const actual = { ra_um: 0.55 };

      const record = engine.recordOutcome(scenario, prediction, actual);

      expect(record.id).toMatch(/^learn-/);
      expect(record.error_analysis.length).toBeGreaterThan(0);
      expect(record.error_analysis[0].error_percent).toBeCloseTo(-8.33, 0);
    });

    it("identifies large prediction errors", () => {
      const scenario = { material: "D2" };
      const prediction = { ra_um: 0.6 };
      const actual = { ra_um: 1.0 };

      const record = engine.recordOutcome(scenario, prediction, actual);

      expect(record.error_analysis[0].error_source).toContain("adjustment needed");
      expect(record.lessons_learned.length).toBeGreaterThan(0);
    });

    it("generates model update recommendation", () => {
      const scenario = { material: "D2" };
      const prediction = { ra_um: 0.5 };
      const actual = { ra_um: 0.9 };

      const record = engine.recordOutcome(scenario, prediction, actual);

      expect(record.model_update).toContain("Update");
    });
  });

  // ============================================================================
  // CROSS-DOMAIN TRANSFER TESTS
  // ============================================================================

  describe("cross-domain transfer", () => {
    it("creates transfer mapping between domains", () => {
      const mapping = engine.transferKnowledge(
        "wire_edm",
        "sinker_edm",
        ["thermal", "surface_finish"]
      );

      expect(mapping.source_domain).toBe("wire_edm");
      expect(mapping.target_domain).toBe("sinker_edm");
      expect(mapping.mappable_concepts.length).toBe(2);
    });

    it("calculates transfer confidence", () => {
      const mapping = engine.transferKnowledge(
        "wire_edm",
        "sinker_edm",
        ["thermal"]
      );

      expect(mapping.mappable_concepts[0].transfer_confidence).toBeGreaterThan(0);
      expect(mapping.mappable_concepts[0].transfer_confidence).toBeLessThanOrEqual(1);
    });

    it("identifies adjustments needed for transfer", () => {
      const mapping = engine.transferKnowledge(
        "wire_edm",
        "sinker_edm",
        ["surface_finish"]
      );

      expect(mapping.mappable_concepts[0].adjustments_needed.length).toBeGreaterThan(0);
    });

    it("calculates overall applicability", () => {
      const mapping = engine.transferKnowledge(
        "wire_edm",
        "laser",
        ["thermal", "precision"]
      );

      expect(mapping.overall_applicability).toBeGreaterThan(0);
      expect(mapping.overall_applicability).toBeLessThanOrEqual(1);
    });
  });

  // ============================================================================
  // STATUS TESTS
  // ============================================================================

  describe("getStatus", () => {
    it("returns engine status", () => {
      const status = engine.getStatus();

      expect(status.learning_records).toBeGreaterThanOrEqual(0);
      expect(status.cached_beliefs).toBeGreaterThanOrEqual(0);
      expect(status.knowledge_sources.length).toBeGreaterThan(0);
      expect(status.material_database_size).toBeGreaterThan(0);
    });

    it("lists all knowledge sources", () => {
      const status = engine.getStatus();

      expect(status.knowledge_sources).toContain("Kunieda MRR Model");
      expect(status.knowledge_sources).toContain("E-Code Database");
      expect(status.knowledge_sources).toContain("JM Die Production History");
    });
  });

  // ============================================================================
  // SINGLETON TESTS
  // ============================================================================

  describe("singleton", () => {
    it("exports singleton instance", () => {
      expect(wireEDMKnowledgeSynthesisEngine).toBeDefined();
      expect(wireEDMKnowledgeSynthesisEngine).toBeInstanceOf(
        WireEDMKnowledgeSynthesisEngine
      );
    });
  });

  // ============================================================================
  // MATERIAL KNOWLEDGE TESTS
  // ============================================================================

  describe("material knowledge", () => {
    const materials = ["D2", "A2", "S7", "M2", "tungsten_carbide", "H13"];

    for (const material of materials) {
      it(`provides knowledge for ${material}`, async () => {
        const result = await engine.synthesize({
          question: `What settings for ${material}?`,
          context: { material },
        });

        expect(result.synthesized_answer.evidence_pieces.length).toBeGreaterThan(0);
      });
    }
  });

  // ============================================================================
  // EDGE CASES
  // ============================================================================

  describe("edge cases", () => {
    it("handles empty question gracefully", async () => {
      const result = await engine.synthesize({
        question: "",
      });

      expect(result.synthesized_answer).toBeDefined();
    });

    it("handles missing context", async () => {
      const result = await engine.synthesize({
        question: "What settings should I use?",
      });

      expect(result.synthesized_answer).toBeDefined();
    });

    it("handles extreme thickness values", async () => {
      const result = await engine.synthesize({
        question: "Settings for very thick section",
        context: { thickness_mm: 200 },
      });

      expect(result.knowledge_gaps.length).toBeGreaterThan(0);
    });

    it("handles zero passes", async () => {
      const result = await engine.synthesize({
        question: "What if zero passes?",
        context: { num_passes: 0 },
      });

      // Should still produce a result
      expect(result.synthesized_answer).toBeDefined();
    });
  });
});
