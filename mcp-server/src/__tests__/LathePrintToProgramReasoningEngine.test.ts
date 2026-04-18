/**
 * LathePrintToProgramReasoningEngine Tests
 *
 * U-LTH43: Reasoning layer for decision explanation
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintToProgramReasoningEngine,
  type ReasoningTrace,
  type ReasoningInput,
} from "../engines/LathePrintToProgramReasoningEngine.js";
import { lathePrintToProgramOrchestratorEngine } from "../engines/LathePrintToProgramOrchestratorEngine.js";

describe("LathePrintToProgramReasoningEngine", () => {
  const getTestInput = async (): Promise<ReasoningInput> => {
    const result = await lathePrintToProgramOrchestratorEngine.execute({
      blueprint: {
        source_type: "pdf",
        part_type: "turning",
        part_number: "REASON-001",
      },
      program_number: 9101,
      program_name: "REASONING TEST",
      controller: "okuma_osp",
    });

    return {
      intake: result.stages.ingest.data!,
      recognition: result.stages.recognition.data!,
      plan: result.stages.planning.data!,
      program: result.program!,
    };
  };

  describe("trace()", () => {
    it("generates reasoning trace with all fields", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      expect(trace.trace_id).toMatch(/^reason_\d+_\d+$/);
      expect(trace.processing_time_ms).toBeGreaterThanOrEqual(0);
      expect(trace.total_decisions).toBeGreaterThan(0);
      expect(trace.confidence_score).toBeGreaterThan(0);
    });

    it("produces >= 8 reasoning steps", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      expect(trace.steps.length).toBeGreaterThanOrEqual(8);
    });

    it("covers all pipeline phases", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      const phases = new Set(trace.steps.map(s => s.phase));
      expect(phases.has("ingest")).toBe(true);
      expect(phases.has("recognition")).toBe(true);
      expect(phases.has("planning")).toBe(true);
      expect(phases.has("generation")).toBe(true);
    });

    it("includes causal graph", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      expect(trace.causal_graph.nodes.length).toBeGreaterThan(0);
      expect(trace.causal_graph.edges.length).toBeGreaterThan(0);
    });

    it("generates counterfactuals", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      expect(trace.counterfactuals.length).toBeGreaterThan(0);
      for (const cf of trace.counterfactuals) {
        expect(cf.scenario).toBeDefined();
        expect(cf.variable_changed).toBeDefined();
        expect(cf.predicted_outcome.length).toBeGreaterThan(0);
      }
    });

    it("provides explanation summary", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      expect(trace.explanation_summary.length).toBeGreaterThan(0);
      expect(trace.explanation_summary).toContain("decisions");
    });
  });

  describe("Reasoning Steps", () => {
    it("numbers steps sequentially", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      for (let i = 0; i < trace.steps.length; i++) {
        expect(trace.steps[i].step_number).toBe(i + 1);
      }
    });

    it("includes premises for each step", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      for (const step of trace.steps) {
        expect(step.premises.length).toBeGreaterThan(0);
      }
    });

    it("includes conclusion for each step", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      for (const step of trace.steps) {
        expect(step.conclusion.length).toBeGreaterThan(0);
      }
    });

    it("assigns confidence to each step", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      for (const step of trace.steps) {
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("classifies reasoning type", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      const validTypes = ["causal", "counterfactual", "abductive", "deductive"];
      for (const step of trace.steps) {
        expect(validTypes).toContain(step.reasoning_type);
      }
    });
  });

  describe("Alternatives Considered", () => {
    it("documents alternatives for decisions", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      const stepsWithAlternatives = trace.steps.filter(s => s.alternatives_considered.length > 0);
      expect(stepsWithAlternatives.length).toBeGreaterThan(0);
    });

    it("explains why alternatives were rejected", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      for (const step of trace.steps) {
        for (const alt of step.alternatives_considered) {
          expect(alt.description.length).toBeGreaterThan(0);
          expect(alt.rejected_reason.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe("Evidence", () => {
    it("provides evidence for decisions", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      const stepsWithEvidence = trace.steps.filter(s => s.evidence.length > 0);
      expect(stepsWithEvidence.length).toBeGreaterThan(0);
    });

    it("weights evidence appropriately", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      for (const step of trace.steps) {
        for (const evidence of step.evidence) {
          expect(evidence.weight).toBeGreaterThan(0);
          expect(evidence.weight).toBeLessThanOrEqual(1);
        }
      }
    });
  });

  describe("Causal Graph", () => {
    it("identifies root causes", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      expect(trace.causal_graph.root_causes.length).toBeGreaterThan(0);
    });

    it("identifies terminal effects", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      expect(trace.causal_graph.terminal_effects.length).toBeGreaterThan(0);
    });

    it("classifies node types", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      const nodeTypes = new Set(trace.causal_graph.nodes.map(n => n.type));
      expect(nodeTypes.has("cause")).toBe(true);
      expect(nodeTypes.has("mediator")).toBe(true);
      expect(nodeTypes.has("effect")).toBe(true);
    });

    it("edges have mechanisms", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      for (const edge of trace.causal_graph.edges) {
        expect(edge.mechanism.length).toBeGreaterThan(0);
        expect(edge.strength).toBeGreaterThan(0);
      }
    });
  });

  describe("Counterfactual Analysis", () => {
    it("analyzes feed rate counterfactual", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      const feedCf = trace.counterfactuals.find(cf => cf.variable_changed === "feed_rate");
      expect(feedCf).toBeDefined();
      expect(feedCf!.side_effects.length).toBeGreaterThan(0);
    });

    it("analyzes spindle speed counterfactual", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      const speedCf = trace.counterfactuals.find(cf => cf.variable_changed === "spindle_speed");
      expect(speedCf).toBeDefined();
    });

    it("provides outcome probabilities", async () => {
      const input = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace(input);

      for (const cf of trace.counterfactuals) {
        expect(cf.outcome_probability).toBeGreaterThan(0);
        expect(cf.outcome_probability).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("query()", () => {
    it("answers why questions", async () => {
      const input = await getTestInput();
      const answer = lathePrintToProgramReasoningEngine.query(
        "Why was this tool selected?",
        input
      );

      expect(answer.length).toBeGreaterThan(0);
      expect(answer).toContain("because");
    });

    it("answers what-if questions", async () => {
      const input = await getTestInput();
      const answer = lathePrintToProgramReasoningEngine.query(
        "What if we increased the feed rate?",
        input
      );

      expect(answer.length).toBeGreaterThan(0);
    });

    it("answers how questions", async () => {
      const input = await getTestInput();
      const answer = lathePrintToProgramReasoningEngine.query(
        "How was the program generated?",
        input
      );

      expect(answer.length).toBeGreaterThan(0);
    });

    it("answers alternative questions", async () => {
      const input = await getTestInput();
      const answer = lathePrintToProgramReasoningEngine.query(
        "What alternatives were considered?",
        input
      );

      expect(answer.length).toBeGreaterThan(0);
    });
  });

  describe("explainDecision()", () => {
    it("explains specific decision by ID", async () => {
      const input = await getTestInput();
      const explanation = lathePrintToProgramReasoningEngine.explainDecision(
        "tool",
        input
      );

      expect(explanation).toBeDefined();
      if (explanation) {
        expect(explanation.decision.toLowerCase()).toContain("tool");
      }
    });

    it("returns null for unknown decision", async () => {
      const input = await getTestInput();
      const explanation = lathePrintToProgramReasoningEngine.explainDecision(
        "xyz_nonexistent_decision_abc",
        input
      );

      expect(explanation).toBeNull();
    });
  });

  describe("getStatistics()", () => {
    it("returns reasoning statistics", () => {
      const stats = lathePrintToProgramReasoningEngine.getStatistics();

      expect(stats.reasoning_types).toContain("causal");
      expect(stats.reasoning_types).toContain("counterfactual");
      expect(stats.reasoning_types).toContain("abductive");
      expect(stats.reasoning_types).toContain("deductive");
    });

    it("lists supported phases", () => {
      const stats = lathePrintToProgramReasoningEngine.getStatistics();

      expect(stats.supported_phases).toContain("ingest");
      expect(stats.supported_phases).toContain("recognition");
      expect(stats.supported_phases).toContain("planning");
      expect(stats.supported_phases).toContain("generation");
    });

    it("tracks trace count", async () => {
      const before = lathePrintToProgramReasoningEngine.getStatistics().total_traces as number;
      const input = await getTestInput();
      lathePrintToProgramReasoningEngine.trace(input);
      const after = lathePrintToProgramReasoningEngine.getStatistics().total_traces as number;

      expect(after).toBe(before + 1);
    });
  });

  describe("Partial Input", () => {
    it("handles intake-only input", async () => {
      const full = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace({ intake: full.intake });

      expect(trace.steps.length).toBeGreaterThan(0);
      expect(trace.steps[0].phase).toBe("ingest");
    });

    it("handles recognition-only input", async () => {
      const full = await getTestInput();
      const trace = lathePrintToProgramReasoningEngine.trace({ recognition: full.recognition });

      expect(trace.steps.length).toBeGreaterThan(0);
    });

    it("handles empty input gracefully", () => {
      const trace = lathePrintToProgramReasoningEngine.trace({});

      expect(trace.steps.length).toBe(0);
      expect(trace.total_decisions).toBe(0);
    });
  });
});
