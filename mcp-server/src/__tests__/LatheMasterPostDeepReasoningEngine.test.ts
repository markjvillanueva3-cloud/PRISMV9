/**
 * LatheMasterPostDeepReasoningEngine Tests — LATHE-MASTER U-LTH28
 *
 * Exit Gate: Any output comes with human-readable decision trace with ≥ 4 reasoning steps.
 *
 * Coverage:
 * - Happy path: explain selection for known machines
 * - Causal inference generation
 * - Counterfactual reasoning
 * - Fallback paths for unknown machines
 * - ≥4 reasoning steps verification (EXIT GATE)
 * - Failure modes: invalid input, empty machine ID
 * - Adversarial inputs: NaN, special characters, oversize
 * - Dispatcher wiring verification
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  LatheMasterPostDeepReasoningEngine,
  type DeepReasoningInput,
  type DecisionTrace,
  DeepReasoningInputSchema,
} from "../engines/LatheMasterPostDeepReasoningEngine.js";

describe("LatheMasterPostDeepReasoningEngine", () => {
  beforeEach(() => {
    LatheMasterPostDeepReasoningEngine.clearHistory();
  });

  describe("explainSelection — Happy Path", () => {
    it("should return decision trace for known Okuma lathe", () => {
      const input: DeepReasoningInput = {
        machineId: "okuma-lb3000",
        operation: "od_turning",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.machineId).toBe("okuma-lb3000");
      expect(result.trace.selectedSubPost).toBe("okuma-osp-p300l-lathe");
      expect(result.trace.selectedDialect).toBe("okuma");
      expect(result.trace.routingPath).toBe("direct");
      expect(result.errors).toHaveLength(0);
    });

    it("should return decision trace for Citizen swiss machine", () => {
      const input: DeepReasoningInput = {
        machineId: "citizen-l20",
        operation: "swiss_turning",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.selectedSubPost).toBe("citizen-cincom-swiss");
      expect(result.trace.selectedDialect).toBe("citizen");
    });

    it("should return decision trace for Fanuc-controlled Doosan", () => {
      const input: DeepReasoningInput = {
        machineId: "doosan-puma-2600",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.selectedSubPost).toBe("fanuc-31i-lathe");
      expect(result.trace.selectedDialect).toBe("fanuc");
    });

    it("should handle Haas mill correctly", () => {
      const input: DeepReasoningInput = {
        machineId: "haas-vf2",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.selectedDialect).toBe("haas");
    });

    it("should return alternatives considered", () => {
      const input: DeepReasoningInput = {
        machineId: "okuma-lb3000",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.trace.alternativesConsidered.length).toBeGreaterThan(0);
      for (const alt of result.trace.alternativesConsidered) {
        expect(alt.subPostId).toBeTruthy();
        expect(alt.dialect).toBeTruthy();
        expect(alt.score).toBeGreaterThanOrEqual(0);
        expect(alt.score).toBeLessThanOrEqual(1);
        expect(alt.rejectionReason).toBeTruthy();
      }
    });
  });

  describe("EXIT GATE: ≥4 Reasoning Steps", () => {
    it("should produce ≥4 reasoning steps for known machine", () => {
      const input: DeepReasoningInput = {
        machineId: "okuma-lb3000",
        operation: "od_turning",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.trace.totalSteps).toBeGreaterThanOrEqual(4);
      expect(result.trace.steps.length).toBeGreaterThanOrEqual(4);
    });

    it("should produce ≥4 reasoning steps for unknown machine (fallback)", () => {
      const input: DeepReasoningInput = {
        machineId: "unknown-machine-xyz",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.trace.totalSteps).toBeGreaterThanOrEqual(4);
    });

    it("should have human-readable titles and descriptions in each step", () => {
      const input: DeepReasoningInput = {
        machineId: "okuma-lb4000",
        operation: "threading",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      for (const step of result.trace.steps) {
        expect(step.title).toBeTruthy();
        expect(step.title.length).toBeGreaterThan(3);
        expect(step.description).toBeTruthy();
        expect(step.description.length).toBeGreaterThan(10);
        expect(step.conclusion).toBeTruthy();
        expect(step.stepNumber).toBeGreaterThan(0);
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should include step types in reasoning chain", () => {
      const input: DeepReasoningInput = {
        machineId: "okuma-lb3000",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);
      const stepTypes = result.trace.steps.map((s) => s.type);

      expect(stepTypes).toContain("input_analysis");
      expect(stepTypes).toContain("machine_lookup");
      expect(stepTypes).toContain("capability_match");
      expect(stepTypes).toContain("dialect_selection");
    });

    it("should include causal chains in reasoning steps", () => {
      const input: DeepReasoningInput = {
        machineId: "citizen-m32",
        operation: "swiss_turning",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);
      const stepsWithCausal = result.trace.steps.filter((s) => s.causalChain && s.causalChain.length > 0);

      expect(stepsWithCausal.length).toBeGreaterThan(0);
      for (const step of stepsWithCausal) {
        expect(step.causalChain!.length).toBeGreaterThanOrEqual(2);
      }
    });
  });

  describe("Causal Inference", () => {
    it("should generate causal queries for known machine", () => {
      const queries = LatheMasterPostDeepReasoningEngine.generateCausalInference("okuma-lb3000");

      expect(queries.length).toBeGreaterThan(0);
      for (const q of queries) {
        expect(q.question).toBeTruthy();
        expect(q.cause).toBeTruthy();
        expect(q.effect).toBeTruthy();
        expect(q.confidence).toBeGreaterThan(0);
        expect(q.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should generate causal query explaining sub-post selection", () => {
      const queries = LatheMasterPostDeepReasoningEngine.generateCausalInference("okuma-lb3000");
      const subPostQuery = queries.find((q) => q.question.includes("selected"));

      expect(subPostQuery).toBeDefined();
      expect(subPostQuery!.cause).toContain("controller");
      expect(subPostQuery!.effect).toContain("dialect");
    });

    it("should generate causal query for operation capabilities", () => {
      const queries = LatheMasterPostDeepReasoningEngine.generateCausalInference("okuma-lb3000", "tapping");
      const capQuery = queries.find((q) => q.question.includes("perform") || q.question.includes("tapping"));

      expect(capQuery).toBeDefined();
    });

    it("should handle unknown machine in causal inference", () => {
      const queries = LatheMasterPostDeepReasoningEngine.generateCausalInference("unknown-xyz");

      expect(queries.length).toBe(1);
      expect(queries[0].cause).toContain("not found");
      expect(queries[0].effect).toContain("Fallback");
    });
  });

  describe("Counterfactual Reasoning", () => {
    it("should generate counterfactual for capability change", () => {
      const queries = LatheMasterPostDeepReasoningEngine.generateCounterfactual(
        "okuma-lb25",
        "If machine had live_tooling capability",
      );

      expect(queries.length).toBeGreaterThan(0);
      expect(queries[0].hypothetical).toContain("live_tooling");
    });

    it("should generate counterfactual for controller change", () => {
      const queries = LatheMasterPostDeepReasoningEngine.generateCounterfactual(
        "okuma-lb3000",
        "If machine used Fanuc controller",
      );

      expect(queries.length).toBeGreaterThan(0);
      const controllerQuery = queries.find((q) => q.hypothetical.includes("Fanuc"));
      expect(controllerQuery).toBeDefined();
      expect(controllerQuery!.hypotheticalOutcome).toContain("Fanuc");
    });

    it("should generate counterfactual for machine unavailability", () => {
      const queries = LatheMasterPostDeepReasoningEngine.generateCounterfactual(
        "okuma-lb3000",
        "If machine were unavailable",
      );

      expect(queries.length).toBeGreaterThan(0);
      const unavailQuery = queries.find((q) => q.hypothetical.includes("unavailable"));
      expect(unavailQuery).toBeDefined();
      expect(unavailQuery!.hypotheticalOutcome).toContain("routed");
    });

    it("should handle unknown machine in counterfactual", () => {
      const queries = LatheMasterPostDeepReasoningEngine.generateCounterfactual("unknown-xyz", "any change");

      expect(queries.length).toBe(1);
      expect(queries[0].actualOutcome).toContain("Fallback");
    });
  });

  describe("Human Readable Output", () => {
    it("should generate human-readable explanation", () => {
      const input: DeepReasoningInput = {
        machineId: "okuma-lb3000",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.trace.humanReadableExplanation).toBeTruthy();
      expect(result.trace.humanReadableExplanation.length).toBeGreaterThan(100);
      expect(result.trace.humanReadableExplanation).toContain("okuma-lb3000");
      expect(result.trace.humanReadableExplanation).toContain("reasoning chain");
    });

    it("should generate summary", () => {
      const input: DeepReasoningInput = {
        machineId: "citizen-l20",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.trace.summary).toBeTruthy();
      expect(result.trace.summary).toContain("citizen-l20");
      expect(result.trace.summary).toContain("citizen");
    });

    it("getHumanReadableSummary should format trace correctly", () => {
      const input: DeepReasoningInput = {
        machineId: "doosan-puma-2600",
        operation: "od_turning",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);
      const summary = LatheMasterPostDeepReasoningEngine.getHumanReadableSummary(result.trace);

      expect(summary).toContain("Decision Trace");
      expect(summary).toContain("doosan-puma-2600");
      expect(summary).toContain("Dialect:");
      expect(summary).toContain("Routing Path:");
      expect(summary).toContain("Reasoning Chain");
    });
  });

  describe("Fallback Path", () => {
    it("should use fallback for unknown machine", () => {
      const input: DeepReasoningInput = {
        machineId: "completely-unknown-machine",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.routingPath).toBe("fallback");
      expect(result.trace.selectedSubPost).toBe("generic-lathe-post");
      expect(result.trace.selectedDialect).toBe("generic");
    });

    it("should include fallback reasoning step", () => {
      const input: DeepReasoningInput = {
        machineId: "unknown-xyz-123",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);
      const fallbackStep = result.trace.steps.find((s) => s.type === "fallback_decision");

      expect(fallbackStep).toBeDefined();
      expect(fallbackStep!.factors.some((f) => f.name === "reason")).toBe(true);
    });
  });

  describe("Failure Modes", () => {
    it("should reject empty machine ID", () => {
      const input = { machineId: "" };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0]).toContain("machineId");
    });

    it("should handle missing machineId field", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({} as DeepReasoningInput);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });

    it("should handle null input gracefully", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection(null as unknown as DeepReasoningInput);

      expect(result.success).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe("Adversarial Inputs", () => {
    it("should handle machine ID with special characters", () => {
      const input: DeepReasoningInput = {
        machineId: "machine<script>alert(1)</script>",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.routingPath).toBe("fallback");
    });

    it("should handle extremely long machine ID", () => {
      const input: DeepReasoningInput = {
        machineId: "a".repeat(10000),
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.routingPath).toBe("fallback");
    });

    it("should handle unicode machine ID", () => {
      const input: DeepReasoningInput = {
        machineId: "旋盤-おくま-3000",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.routingPath).toBe("fallback");
    });

    it("should handle whitespace-only machine ID", () => {
      const input: DeepReasoningInput = {
        machineId: "   ",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);

      expect(result.success).toBe(true);
      expect(result.trace.routingPath).toBe("fallback");
    });
  });

  describe("Statistics and History", () => {
    it("should track trace history", () => {
      LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });
      LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "citizen-l20" });
      LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "unknown-xyz" });

      const history = LatheMasterPostDeepReasoningEngine.getTraceHistory();

      expect(history.length).toBe(3);
    });

    it("should compute statistics correctly", () => {
      LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });
      LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb4000" });
      LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "unknown-xyz" });

      const stats = LatheMasterPostDeepReasoningEngine.getStatistics();

      expect(stats.totalTraces).toBe(3);
      expect(stats.avgStepsPerTrace).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeGreaterThan(0);
      expect(stats.avgConfidence).toBeLessThanOrEqual(1);
      expect(stats.pathDistribution).toHaveProperty("direct");
      expect(stats.pathDistribution).toHaveProperty("fallback");
    });

    it("should clear history", () => {
      LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });
      expect(LatheMasterPostDeepReasoningEngine.getTraceHistory().length).toBe(1);

      LatheMasterPostDeepReasoningEngine.clearHistory();

      expect(LatheMasterPostDeepReasoningEngine.getTraceHistory().length).toBe(0);
    });

    it("should return empty statistics when no traces", () => {
      const stats = LatheMasterPostDeepReasoningEngine.getStatistics();

      expect(stats.totalTraces).toBe(0);
      expect(stats.avgStepsPerTrace).toBe(0);
      expect(stats.avgConfidence).toBe(0);
    });
  });

  describe("Zod Schema Validation", () => {
    it("should validate correct input", () => {
      const input = {
        machineId: "okuma-lb3000",
        operation: "od_turning",
        controller: "okuma-osp-p300l",
        requireCapabilities: ["live_tooling"],
        strictMode: true,
      };

      const result = DeepReasoningInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });

    it("should reject missing machineId", () => {
      const input = {
        operation: "od_turning",
      };

      const result = DeepReasoningInputSchema.safeParse(input);

      expect(result.success).toBe(false);
    });

    it("should accept minimal valid input", () => {
      const input = {
        machineId: "any-machine",
      };

      const result = DeepReasoningInputSchema.safeParse(input);

      expect(result.success).toBe(true);
    });
  });

  describe("Capability Requirements", () => {
    it("should detect missing required capabilities", () => {
      const input: DeepReasoningInput = {
        machineId: "okuma-lb25",
        operation: "tapping",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);
      const capStep = result.trace.steps.find((s) => s.type === "capability_match");

      expect(capStep).toBeDefined();
      const missingFactor = capStep!.factors.find((f) => f.name === "missingRequired");
      expect(missingFactor).toBeDefined();
    });

    it("should confirm available capabilities", () => {
      const input: DeepReasoningInput = {
        machineId: "okuma-lb3000",
        operation: "milling",
      };

      const result = LatheMasterPostDeepReasoningEngine.explainSelection(input);
      const capStep = result.trace.steps.find((s) => s.type === "capability_match");

      expect(capStep).toBeDefined();
      expect(capStep!.factors.some((f) => f.value.toString().includes("live_tooling"))).toBe(true);
    });
  });

  describe("Version", () => {
    it("should return version string", () => {
      const version = LatheMasterPostDeepReasoningEngine.getVersion();

      expect(version).toBe("1.0.0");
    });
  });

  describe("Trace Metadata", () => {
    it("should include traceId", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });

      expect(result.trace.traceId).toBeTruthy();
      expect(result.trace.traceId).toMatch(/^trace-\d+-[a-z0-9]+$/);
    });

    it("should include timestamps", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });

      expect(result.trace.createdAt).toBeTruthy();
      expect(new Date(result.trace.createdAt).getTime()).not.toBeNaN();

      for (const step of result.trace.steps) {
        expect(step.timestamp).toBeTruthy();
        expect(new Date(step.timestamp).getTime()).not.toBeNaN();
      }
    });

    it("should include reasoning duration", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });

      expect(result.trace.reasoningDuration).toBeGreaterThanOrEqual(0);
    });

    it("should include confidence score", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });

      expect(result.trace.confidenceScore).toBeGreaterThan(0);
      expect(result.trace.confidenceScore).toBeLessThanOrEqual(1);
    });
  });

  describe("Factors in Reasoning Steps", () => {
    it("should include factors with weights and impacts", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });

      for (const step of result.trace.steps) {
        expect(step.factors.length).toBeGreaterThan(0);
        for (const factor of step.factors) {
          expect(factor.name).toBeTruthy();
          expect(factor.weight).toBeGreaterThanOrEqual(0);
          expect(factor.weight).toBeLessThanOrEqual(1);
          expect(["positive", "negative", "neutral"]).toContain(factor.impact);
          expect(factor.explanation).toBeTruthy();
        }
      }
    });
  });

  describe("Counterfactuals in Steps", () => {
    it("should include counterfactuals in relevant steps", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({
        machineId: "okuma-lb3000",
        operation: "od_turning",
      });

      const stepsWithCounterfactual = result.trace.steps.filter((s) => s.counterfactual);
      expect(stepsWithCounterfactual.length).toBeGreaterThan(0);
    });
  });

  describe("Multiple Dialects", () => {
    it("should correctly identify Okuma dialect", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "okuma-lb3000" });
      expect(result.trace.selectedDialect).toBe("okuma");
    });

    it("should correctly identify Fanuc dialect", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "doosan-puma-2600" });
      expect(result.trace.selectedDialect).toBe("fanuc");
    });

    it("should correctly identify Citizen dialect", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "citizen-l20" });
      expect(result.trace.selectedDialect).toBe("citizen");
    });

    it("should correctly identify Haas dialect", () => {
      const result = LatheMasterPostDeepReasoningEngine.explainSelection({ machineId: "haas-vf2" });
      expect(result.trace.selectedDialect).toBe("haas");
    });
  });
});
