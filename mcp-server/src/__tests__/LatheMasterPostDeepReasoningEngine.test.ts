/**
 * LatheMasterPostDeepReasoningEngine Tests
 *
 * U-LTH28: Tests for deep reasoning explanations of master post decisions.
 * Verifies human-readable traces with >=4 reasoning steps.
 */

import { describe, it, expect } from "vitest";
import {
  latheMasterPostDeepReasoningEngine,
  type PostDecisionTrace,
  type PostDecisionStep,
} from "../engines/LatheMasterPostDeepReasoningEngine.js";
import type { MasterPostRouteRequest, RouteDecision } from "../engines/LatheMasterPostRouterEngine.js";

describe("LatheMasterPostDeepReasoningEngine", () => {
  const createBaseRequest = (overrides: Partial<MasterPostRouteRequest> = {}): MasterPostRouteRequest => ({
    machine_id: "LTH-01",
    operation: "turning",
    program_name: "TEST_PART",
    program_number: 1001,
    moves: [
      { type: "rapid", x: 100, z: 5 },
      { type: "linear", x: 50, z: 0, feed: 200 },
    ],
    tool_number: 1,
    spindle_rpm: 1500,
    feed_rate_mmmin: 200,
    ...overrides,
  });

  const createBaseDecision = (overrides: Partial<RouteDecision> = {}): RouteDecision => ({
    machine_id: "LTH-01",
    machine_name: "Okuma GENOS L300-M",
    controller_family: "okuma",
    controller_model: "OSP-P300L-R",
    selected_post: "okuma_turning",
    route_method: "direct_match",
    confidence: 0.95,
    reasoning: ["Controller family match", "Operation supported"],
    ...overrides,
  });

  describe("explainDecision()", () => {
    it("returns a complete decision trace", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.trace_id).toBeDefined();
      expect(trace.request_summary).toContain("turning");
      expect(trace.decision_summary).toContain("okuma_turning");
      expect(trace.steps.length).toBeGreaterThanOrEqual(4);
      expect(trace.causal_analysis).toBeDefined();
      expect(trace.overall_confidence).toBeGreaterThan(0);
    });

    it("includes at least 4 reasoning steps", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.steps.length).toBeGreaterThanOrEqual(4);
    });

    it("covers machine, controller, post, and confidence categories", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      const categories = trace.steps.map(s => s.category);
      expect(categories).toContain("machine");
      expect(categories).toContain("controller");
      expect(categories).toContain("post");
      expect(categories).toContain("confidence");
    });

    it("includes human-readable explanation", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.human_readable_explanation.length).toBeGreaterThan(100);
      expect(trace.human_readable_explanation).toContain("Post Selection Decision");
      expect(trace.human_readable_explanation).toContain(decision.selected_post);
    });

    it("tracks reasoning time", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.total_reasoning_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Reasoning Steps Quality", () => {
    it("each step has substantial reasoning text", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      for (const step of trace.steps) {
        expect(step.reasoning.length).toBeGreaterThan(50);
        expect(step.action).toBeDefined();
        expect(step.step_number).toBeGreaterThan(0);
      }
    });

    it("each step has valid confidence between 0 and 1", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      for (const step of trace.steps) {
        expect(step.confidence).toBeGreaterThanOrEqual(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("each step includes relevant factors", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      for (const step of trace.steps) {
        expect(Object.keys(step.factors).length).toBeGreaterThan(0);
      }
    });

    it("machine step includes machine details", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      const machineStep = trace.steps.find(s => s.category === "machine");
      expect(machineStep).toBeDefined();
      expect(machineStep?.factors.machine_id).toBe("LTH-01");
      expect(machineStep?.factors.controller_family).toBe("okuma");
    });

    it("controller step includes compatibility info", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      const controllerStep = trace.steps.find(s => s.category === "controller");
      expect(controllerStep).toBeDefined();
      expect(controllerStep?.factors.controller_match).toBe(true);
    });

    it("post step includes operation support", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      const postStep = trace.steps.find(s => s.category === "post");
      expect(postStep).toBeDefined();
      expect(postStep?.factors.operation).toBe("turning");
      expect(postStep?.factors.operation_supported).toBe(true);
    });
  });

  describe("Causal Analysis", () => {
    it("identifies root cause", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.causal_analysis.root_cause).toBeDefined();
      expect(trace.causal_analysis.root_cause.length).toBeGreaterThan(20);
    });

    it("includes impact paths", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.causal_analysis.impact_paths.length).toBeGreaterThan(0);
      for (const path of trace.causal_analysis.impact_paths) {
        expect(path.factor).toBeDefined();
        expect(["positive", "negative", "neutral"]).toContain(path.influence);
        expect(path.weight).toBeGreaterThan(0);
        expect(path.explanation).toBeDefined();
      }
    });

    it("identifies critical factors", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.causal_analysis.critical_factors.length).toBeGreaterThan(0);
    });

    it("provides confidence breakdown", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(Object.keys(trace.causal_analysis.confidence_breakdown).length).toBeGreaterThan(0);
    });
  });

  describe("compareDecisions()", () => {
    it("compares two decisions and identifies advantages", () => {
      const request = createBaseRequest();
      const chosen = createBaseDecision();
      const alternative = createBaseDecision({
        selected_post: "fanuc_turning",
        controller_family: "fanuc",
        confidence: 0.7,
      });

      const comparison = latheMasterPostDeepReasoningEngine.compareDecisions(
        request,
        chosen,
        alternative
      );

      expect(comparison.comparison_summary).toContain("okuma_turning");
      expect(comparison.comparison_summary).toContain("fanuc_turning");
      expect(comparison.chosen_advantages.length).toBeGreaterThan(0);
      expect(comparison.recommendation_confidence).toBeGreaterThan(0);
    });

    it("identifies decisive factors", () => {
      const request = createBaseRequest();
      const chosen = createBaseDecision();
      const alternative = createBaseDecision({
        selected_post: "generic_turning",
        controller_family: "generic",
        confidence: 0.6,
      });

      const comparison = latheMasterPostDeepReasoningEngine.compareDecisions(
        request,
        chosen,
        alternative
      );

      expect(comparison.decisive_factors.length).toBeGreaterThan(0);
    });
  });

  describe("getAspectReasoning()", () => {
    it("returns reasoning for machine aspect", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const step = latheMasterPostDeepReasoningEngine.getAspectReasoning(
        request,
        decision,
        "machine"
      );

      expect(step.category).toBe("machine");
      expect(step.reasoning.length).toBeGreaterThan(0);
    });

    it("returns reasoning for controller aspect", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const step = latheMasterPostDeepReasoningEngine.getAspectReasoning(
        request,
        decision,
        "controller"
      );

      expect(step.category).toBe("controller");
    });

    it("returns reasoning for post aspect", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const step = latheMasterPostDeepReasoningEngine.getAspectReasoning(
        request,
        decision,
        "post"
      );

      expect(step.category).toBe("post");
    });

    it("returns reasoning for confidence aspect", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const step = latheMasterPostDeepReasoningEngine.getAspectReasoning(
        request,
        decision,
        "confidence"
      );

      expect(step.category).toBe("confidence");
    });
  });

  describe("validateTrace()", () => {
    it("validates a good trace", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();
      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      const validation = latheMasterPostDeepReasoningEngine.validateTrace(trace);

      expect(validation.valid).toBe(true);
      expect(validation.issues.length).toBe(0);
    });

    it("detects insufficient reasoning steps", () => {
      const badTrace: PostDecisionTrace = {
        trace_id: "test",
        request_summary: "test",
        decision_summary: "test",
        steps: [
          { step_number: 1, category: "machine", action: "test", reasoning: "test reason", factors: {}, confidence: 0.9 },
        ],
        causal_analysis: {
          root_cause: "test",
          impact_paths: [],
          critical_factors: [],
          confidence_breakdown: {},
        },
        overall_confidence: 0.9,
        total_reasoning_time_ms: 10,
        human_readable_explanation: "Short",
      };

      const validation = latheMasterPostDeepReasoningEngine.validateTrace(badTrace);

      expect(validation.valid).toBe(false);
      expect(validation.issues.some(i => i.includes("reasoning steps"))).toBe(true);
    });
  });

  describe("Feature Considerations", () => {
    it("considers live tooling in reasoning", () => {
      const request = createBaseRequest({ live_tooling: true });
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.human_readable_explanation).toContain("live tooling");
    });

    it("considers sub-spindle in reasoning", () => {
      const request = createBaseRequest({ sub_spindle: true });
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.human_readable_explanation).toContain("sub-spindle");
    });

    it("considers CSS mode in reasoning", () => {
      const request = createBaseRequest({ css_mode: true });
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.human_readable_explanation).toContain("CSS");
    });
  });

  describe("Different Controller Families", () => {
    it("reasons about Fanuc controller", () => {
      const request = createBaseRequest({ machine_id: "FANUC-01" });
      const decision = createBaseDecision({
        machine_id: "FANUC-01",
        controller_family: "fanuc",
        selected_post: "fanuc_turning",
      });

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.steps.some(s => s.reasoning.includes("fanuc"))).toBe(true);
    });

    it("reasons about Haas controller", () => {
      const request = createBaseRequest({ machine_id: "HAAS-01" });
      const decision = createBaseDecision({
        machine_id: "HAAS-01",
        controller_family: "haas",
        selected_post: "haas_turning",
      });

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.steps.some(s => s.reasoning.includes("haas"))).toBe(true);
    });

    it("reasons about Mazak controller", () => {
      const request = createBaseRequest({ machine_id: "MAZAK-01" });
      const decision = createBaseDecision({
        machine_id: "MAZAK-01",
        controller_family: "mazak",
        selected_post: "mazak_turning",
      });

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.steps.some(s => s.reasoning.includes("mazak"))).toBe(true);
    });
  });

  describe("Different Route Methods", () => {
    it("explains direct_match routing", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision({ route_method: "direct_match" });

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.human_readable_explanation).toContain("direct match");
    });

    it("explains controller_family routing", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision({ route_method: "controller_family" });

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.human_readable_explanation).toContain("controller family");
    });

    it("explains fallback_generator routing", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision({
        route_method: "fallback_generator",
        confidence: 0.7,
      });

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      expect(trace.human_readable_explanation).toContain("fallback generator");
    });
  });

  describe("Different Operations", () => {
    const operations: Array<MasterPostRouteRequest["operation"]> = [
      "turning",
      "facing",
      "grooving",
      "threading",
      "drilling",
      "boring",
      "parting",
    ];

    for (const operation of operations) {
      it(`reasons about ${operation} operation`, () => {
        const request = createBaseRequest({ operation });
        const decision = createBaseDecision();

        const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

        const postStep = trace.steps.find(s => s.category === "post");
        expect(postStep?.factors.operation).toBe(operation);
      });
    }
  });

  describe("Alternative Identification", () => {
    it("identifies alternative posts when available", () => {
      const request = createBaseRequest();
      const decision = createBaseDecision();

      const trace = latheMasterPostDeepReasoningEngine.explainDecision(request, decision);

      const altStep = trace.steps.find(s => s.category === "alternative");
      if (altStep) {
        expect(altStep.factors.alternatives_count).toBeGreaterThanOrEqual(0);
      }
    });
  });
});
