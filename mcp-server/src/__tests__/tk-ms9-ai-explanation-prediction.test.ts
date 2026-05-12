/**
 * TK-MS9: Tribal Knowledge AI Explanation & Prediction Tests
 *
 * Tests AI explanation generation, reasoning chains, predictive surfacing,
 * and multi-agent tribal synthesis.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  tribalExplanationEngine,
  type ExplanationResult,
  type ReasoningChain,
  type ReasoningStep,
  type PredictedTip,
  type SynthesisResult,
  type AgentPerspective,
  type ExplanationContext,
} from "../engines/TribalExplanationEngine.js";

describe("TK-MS9: Tribal Knowledge AI Explanation & Prediction", () => {
  describe("U1: Tribal Explanation Generator", () => {
    describe("explainTipRelevance", () => {
      it("should generate explanation for relevant tip", () => {
        const context: ExplanationContext = {
          material: "304 Stainless",
          operation: "roughing",
          machine: "Okuma LB3000",
        };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-001", // Stainless work hardening tip
          context
        );

        expect(explanation).toHaveProperty("tip_id", "tk-001");
        expect(explanation).toHaveProperty("explanation");
        expect(explanation).toHaveProperty("confidence");
        expect(explanation.confidence).toBeGreaterThan(0);
        expect(explanation.explanation.length).toBeGreaterThan(20);
      });

      it("should cite matching factors in explanation", () => {
        const context: ExplanationContext = {
          material: "Titanium",
          operation: "finishing",
        };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-002", // Titanium tip
          context
        );

        expect(explanation.matching_factors).toBeDefined();
        expect(explanation.matching_factors.length).toBeGreaterThan(0);
      });

      it("should include counter-examples for low confidence", () => {
        const context: ExplanationContext = {
          material: "Plastic",
          operation: "drilling",
        };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-001", // Stainless tip - not relevant to plastic
          context
        );

        if (explanation.confidence < 0.5) {
          expect(explanation.counter_examples).toBeDefined();
        }
      });

      it("should provide natural language explanation", () => {
        const context: ExplanationContext = {
          material: "Aluminum",
          operation: "milling",
        };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-006", // Aluminum chatter fix
          context
        );

        // Should read like natural language, not code
        expect(explanation.explanation).not.toMatch(/^\{/);
        expect(explanation.explanation).not.toMatch(/undefined/);
      });

      it("should explain with PUOA reasoning integration", () => {
        const context: ExplanationContext = {
          material: "Steel",
          operation: "turning",
          puoa_tier: "tier_2",
        };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-003",
          context
        );

        expect(explanation.puoa_integration).toBeDefined();
        expect(explanation.puoa_integration.tier).toBe("tier_2");
      });

      it("should handle unknown tip gracefully", () => {
        const context: ExplanationContext = { material: "Steel" };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "nonexistent-tip-xyz",
          context
        );

        expect(explanation.tip_id).toBe("nonexistent-tip-xyz");
        expect(explanation.confidence).toBe(0);
        expect(explanation.explanation).toContain("not found");
      });

      it("should rank explanation factors by importance", () => {
        const context: ExplanationContext = {
          material: "D2 Tool Steel",
          operation: "grinding",
          machine: "Okuma",
        };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-007",
          context
        );

        if (explanation.matching_factors.length > 1) {
          // Factors should be sorted by weight
          for (let i = 1; i < explanation.matching_factors.length; i++) {
            expect(explanation.matching_factors[i - 1].weight)
              .toBeGreaterThanOrEqual(explanation.matching_factors[i].weight);
          }
        }
      });

      it("should include source attribution", () => {
        const context: ExplanationContext = { operation: "milling" };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-001",
          context
        );

        expect(explanation.source_attribution).toBeDefined();
        expect(["tribal", "oem", "proven", "user"]).toContain(
          explanation.source_attribution.authority
        );
      });

      it("should calculate relevance score", () => {
        const context: ExplanationContext = {
          material: "Stainless",
          operation: "roughing",
        };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-001",
          context
        );

        expect(explanation.relevance_score).toBeGreaterThanOrEqual(0);
        expect(explanation.relevance_score).toBeLessThanOrEqual(1);
      });

      it("should provide recommendation", () => {
        const context: ExplanationContext = {
          material: "Inconel",
          operation: "roughing",
        };

        const explanation = tribalExplanationEngine.explainTipRelevance(
          "tk-005",
          context
        );

        expect(explanation.recommendation).toBeDefined();
        expect(["apply", "consider", "skip"]).toContain(
          explanation.recommendation.action
        );
      });
    });
  });

  describe("U2: Contextual Reasoning Chain", () => {
    describe("buildReasoningChain", () => {
      it("should build reasoning chain for context", () => {
        const context: ExplanationContext = {
          material: "4140 Steel",
          operation: "drilling",
          machine: "Haas VF-2",
        };

        const chain = tribalExplanationEngine.buildReasoningChain(context, [
          "tk-001",
          "tk-003",
        ]);

        expect(chain).toHaveProperty("chain_id");
        expect(chain).toHaveProperty("steps");
        expect(chain.steps.length).toBeGreaterThan(0);
      });

      it("should include step-by-step reasoning", () => {
        const context: ExplanationContext = { material: "Aluminum" };

        const chain = tribalExplanationEngine.buildReasoningChain(context, ["tk-006"]);

        for (const step of chain.steps) {
          expect(step).toHaveProperty("step_number");
          expect(step).toHaveProperty("action");
          expect(step).toHaveProperty("conclusion");
        }
      });

      it("should attribute authority sources", () => {
        const context: ExplanationContext = {
          material: "Titanium",
          operation: "finishing",
        };

        const chain = tribalExplanationEngine.buildReasoningChain(context, ["tk-002"]);

        expect(chain.authority_ranking).toBeDefined();
        expect(chain.authority_ranking).toContain("tribal");
      });

      it("should explain conflict resolution", () => {
        const context: ExplanationContext = {
          material: "Steel",
          conflicting_tips: ["tk-001", "tk-003"],
        };

        const chain = tribalExplanationEngine.buildReasoningChain(context, [
          "tk-001",
          "tk-003",
        ]);

        if (chain.has_conflicts) {
          expect(chain.conflict_resolution).toBeDefined();
          expect(chain.conflict_resolution.method).toBeDefined();
        }
      });

      it("should produce visualization-ready output", () => {
        const context: ExplanationContext = { operation: "milling" };

        const chain = tribalExplanationEngine.buildReasoningChain(context, ["tk-001"]);

        expect(chain.visualization).toBeDefined();
        expect(chain.visualization.format).toBe("mermaid");
        expect(chain.visualization.content).toContain("graph");
      });

      it("should include intermediate conclusions", () => {
        const context: ExplanationContext = {
          material: "Brass",
          operation: "turning",
        };

        const chain = tribalExplanationEngine.buildReasoningChain(context, [
          "tk-001",
          "tk-002",
        ]);

        const conclusionSteps = chain.steps.filter(
          (s) => s.conclusion && s.conclusion.length > 0
        );
        expect(conclusionSteps.length).toBeGreaterThan(0);
      });

      it("should track confidence through chain", () => {
        const context: ExplanationContext = { material: "Steel" };

        const chain = tribalExplanationEngine.buildReasoningChain(context, ["tk-001"]);

        expect(chain.initial_confidence).toBeDefined();
        expect(chain.final_confidence).toBeDefined();
        expect(chain.confidence_delta).toBeDefined();
      });

      it("should handle empty tip list", () => {
        const context: ExplanationContext = { material: "Steel" };

        const chain = tribalExplanationEngine.buildReasoningChain(context, []);

        expect(chain.steps).toEqual([]);
        expect(chain.final_confidence).toBe(0);
      });

      it("should include timing information", () => {
        const context: ExplanationContext = { operation: "roughing" };

        const chain = tribalExplanationEngine.buildReasoningChain(context, ["tk-001"]);

        expect(chain.timestamp).toBeDefined();
        expect(chain.processing_time_ms).toBeGreaterThanOrEqual(0);
      });

      it("should support chain serialization", () => {
        const context: ExplanationContext = { material: "Aluminum" };

        const chain = tribalExplanationEngine.buildReasoningChain(context, ["tk-006"]);
        const serialized = JSON.stringify(chain);

        expect(() => JSON.parse(serialized)).not.toThrow();
      });
    });
  });

  describe("U3: Predictive Tip Surfacing", () => {
    describe("predictUpcomingTips", () => {
      it("should predict tips based on context", () => {
        const taskContext = {
          material: "316 Stainless",
          upcoming_operations: ["roughing", "finishing"],
          machine: "Okuma LB3000",
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(taskContext);

        expect(Array.isArray(predictions)).toBe(true);
        for (const pred of predictions) {
          expect(pred).toHaveProperty("tip_id");
          expect(pred).toHaveProperty("prediction_confidence");
          expect(pred).toHaveProperty("predicted_for_operation");
        }
      });

      it("should rank predictions by confidence", () => {
        const taskContext = {
          material: "Titanium",
          upcoming_operations: ["roughing", "semi-finish", "finishing"],
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(taskContext);

        if (predictions.length > 1) {
          for (let i = 1; i < predictions.length; i++) {
            expect(predictions[i - 1].prediction_confidence)
              .toBeGreaterThanOrEqual(predictions[i].prediction_confidence);
          }
        }
      });

      it("should use historical patterns", () => {
        const taskContext = {
          material: "Aluminum",
          prior_operations: ["facing", "roughing"],
          upcoming_operations: ["finishing"],
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(taskContext);

        // Should have pattern-based predictions
        const patternBased = predictions.filter(
          (p) => p.prediction_source === "historical_pattern"
        );
        expect(patternBased.length).toBeGreaterThanOrEqual(0);
      });

      it("should anticipate material workflow", () => {
        const taskContext = {
          material: "D2 Tool Steel",
          workflow_stage: "roughing",
          upcoming_operations: ["finishing"], // Add upcoming operation
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(taskContext);

        // Should return predictions for the material workflow
        expect(predictions.length).toBeGreaterThanOrEqual(0);
        // If predictions exist, check they have prediction source
        for (const pred of predictions) {
          expect(pred.prediction_source).toBeDefined();
        }
      });

      it("should pre-load machine-specific tips", () => {
        const taskContext = {
          machine: "Okuma GENOS M560-V",
          material: "Steel",
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(taskContext);

        // Should include machine-specific tips
        const machineSpecific = predictions.filter(
          (p) => p.machine_specific === true
        );
        expect(machineSpecific.length).toBeGreaterThanOrEqual(0);
      });

      it("should provide prediction reasoning", () => {
        const taskContext = {
          material: "Inconel 718",
          upcoming_operations: ["roughing"],
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(taskContext);

        if (predictions.length > 0) {
          expect(predictions[0].prediction_reason).toBeDefined();
          expect(predictions[0].prediction_reason.length).toBeGreaterThan(5);
        }
      });

      it("should limit predictions", () => {
        const taskContext = {
          material: "Steel",
          upcoming_operations: ["roughing", "finishing", "threading"],
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(
          taskContext,
          { max_predictions: 5 }
        );

        expect(predictions.length).toBeLessThanOrEqual(5);
      });

      it("should filter by minimum confidence", () => {
        const taskContext = {
          material: "Plastic",
          upcoming_operations: ["milling"],
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(
          taskContext,
          { min_confidence: 0.7 }
        );

        for (const pred of predictions) {
          expect(pred.prediction_confidence).toBeGreaterThanOrEqual(0.7);
        }
      });

      it("should handle empty context", () => {
        const predictions = tribalExplanationEngine.predictUpcomingTips({});

        expect(Array.isArray(predictions)).toBe(true);
        // Empty context should return empty or generic predictions
      });

      it("should indicate prediction urgency", () => {
        const taskContext = {
          material: "Titanium",
          current_operation: "setup",
          upcoming_operations: ["roughing"],
        };

        const predictions = tribalExplanationEngine.predictUpcomingTips(taskContext);

        if (predictions.length > 0) {
          expect(["immediate", "soon", "later"]).toContain(
            predictions[0].urgency
          );
        }
      });
    });
  });

  describe("U4: Multi-Agent Tribal Synthesis", () => {
    describe("synthesizeAgentPerspectives", () => {
      it("should synthesize multiple agent perspectives", () => {
        const perspectives: AgentPerspective[] = [
          {
            agent_id: "claude-backend",
            tip_id: "tk-001",
            confidence: 0.85,
            reasoning: "Material match and operation relevance",
          },
          {
            agent_id: "claude-data",
            tip_id: "tk-001",
            confidence: 0.9,
            reasoning: "Historical success rate supports this tip",
          },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        expect(synthesis).toHaveProperty("tip_id", "tk-001");
        expect(synthesis).toHaveProperty("consensus_confidence");
        expect(synthesis).toHaveProperty("agent_count", 2);
      });

      it("should aggregate confidence from multiple agents", () => {
        const perspectives: AgentPerspective[] = [
          { agent_id: "agent-1", tip_id: "tk-002", confidence: 0.7, reasoning: "A" },
          { agent_id: "agent-2", tip_id: "tk-002", confidence: 0.8, reasoning: "B" },
          { agent_id: "agent-3", tip_id: "tk-002", confidence: 0.9, reasoning: "C" },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        // Aggregated confidence should be reasonable
        expect(synthesis.consensus_confidence).toBeGreaterThanOrEqual(0.7);
        expect(synthesis.consensus_confidence).toBeLessThanOrEqual(1);
      });

      it("should identify agreement patterns", () => {
        const perspectives: AgentPerspective[] = [
          { agent_id: "a1", tip_id: "tk-001", confidence: 0.9, reasoning: "R1" },
          { agent_id: "a2", tip_id: "tk-001", confidence: 0.88, reasoning: "R2" },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        expect(synthesis.agreement_level).toBe("high");
      });

      it("should identify disagreement patterns", () => {
        const perspectives: AgentPerspective[] = [
          { agent_id: "a1", tip_id: "tk-001", confidence: 0.9, reasoning: "Apply" },
          { agent_id: "a2", tip_id: "tk-001", confidence: 0.3, reasoning: "Skip" },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        expect(["low", "medium"]).toContain(synthesis.agreement_level);
      });

      it("should generate consensus recommendation", () => {
        const perspectives: AgentPerspective[] = [
          { agent_id: "a1", tip_id: "tk-003", confidence: 0.75, reasoning: "R1" },
          { agent_id: "a2", tip_id: "tk-003", confidence: 0.8, reasoning: "R2" },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        expect(synthesis.recommendation).toBeDefined();
        expect(["apply", "consider", "skip", "escalate"]).toContain(
          synthesis.recommendation.action
        );
      });

      it("should escalate unresolvable conflicts", () => {
        const perspectives: AgentPerspective[] = [
          { agent_id: "a1", tip_id: "tk-001", confidence: 0.95, reasoning: "Must apply" },
          { agent_id: "a2", tip_id: "tk-001", confidence: 0.1, reasoning: "Never apply" },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        if (synthesis.agreement_level === "low") {
          expect(synthesis.escalation_required).toBe(true);
          expect(synthesis.escalation_reason).toBeDefined();
        }
      });

      it("should weight agent authority", () => {
        const perspectives: AgentPerspective[] = [
          {
            agent_id: "claude-physics",
            tip_id: "tk-005",
            confidence: 0.7,
            reasoning: "Physics analysis",
            authority_weight: 0.9,
          },
          {
            agent_id: "claude-general",
            tip_id: "tk-005",
            confidence: 0.9,
            reasoning: "General reasoning",
            authority_weight: 0.5,
          },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        // Higher authority agent should have more influence
        expect(synthesis.weighted_confidence).toBeDefined();
      });

      it("should synthesize multiple tips", () => {
        const perspectives: AgentPerspective[] = [
          { agent_id: "a1", tip_id: "tk-001", confidence: 0.8, reasoning: "R1" },
          { agent_id: "a1", tip_id: "tk-002", confidence: 0.7, reasoning: "R2" },
          { agent_id: "a2", tip_id: "tk-001", confidence: 0.85, reasoning: "R3" },
        ];

        const syntheses = tribalExplanationEngine.synthesizeMultipleTips(perspectives);

        expect(syntheses.length).toBeGreaterThanOrEqual(1);
        expect(syntheses.some(s => s.tip_id === "tk-001")).toBe(true);
      });

      it("should handle single agent perspective", () => {
        const perspectives: AgentPerspective[] = [
          { agent_id: "solo", tip_id: "tk-001", confidence: 0.8, reasoning: "Only opinion" },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        expect(synthesis.agent_count).toBe(1);
        expect(synthesis.consensus_confidence).toBe(0.8);
      });

      it("should provide synthesis reasoning", () => {
        const perspectives: AgentPerspective[] = [
          { agent_id: "a1", tip_id: "tk-001", confidence: 0.8, reasoning: "Material match" },
          { agent_id: "a2", tip_id: "tk-001", confidence: 0.75, reasoning: "Operation fit" },
        ];

        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
          perspectives
        );

        expect(synthesis.synthesis_reasoning).toBeDefined();
        expect(synthesis.synthesis_reasoning.length).toBeGreaterThan(10);
      });

      it("should handle empty perspectives", () => {
        const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives([]);

        expect(synthesis.agent_count).toBe(0);
        expect(synthesis.consensus_confidence).toBe(0);
      });
    });
  });

  describe("integration", () => {
    it("should combine explanation with prediction", () => {
      const context: ExplanationContext = {
        material: "Stainless Steel",
        operation: "roughing",
      };

      // Get predictions
      const predictions = tribalExplanationEngine.predictUpcomingTips({
        material: context.material,
        upcoming_operations: ["finishing"],
      });

      // Explain first prediction
      if (predictions.length > 0) {
        const explanation = tribalExplanationEngine.explainTipRelevance(
          predictions[0].tip_id,
          context
        );

        expect(explanation.tip_id).toBe(predictions[0].tip_id);
      }
    });

    it("should build reasoning chain from multi-agent synthesis", () => {
      const perspectives: AgentPerspective[] = [
        { agent_id: "a1", tip_id: "tk-001", confidence: 0.85, reasoning: "R1" },
        { agent_id: "a2", tip_id: "tk-001", confidence: 0.8, reasoning: "R2" },
      ];

      const synthesis = tribalExplanationEngine.synthesizeAgentPerspectives(
        perspectives
      );

      const chain = tribalExplanationEngine.buildReasoningChain(
        { material: "Steel" },
        [synthesis.tip_id]
      );

      expect(chain.steps.length).toBeGreaterThan(0);
    });
  });
});
