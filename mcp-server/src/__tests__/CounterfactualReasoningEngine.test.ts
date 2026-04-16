/**
 * Tests for CounterfactualReasoningEngine
 */
import { describe, it, expect, beforeEach } from "vitest";
import { counterfactualReasoningEngine, CounterfactualReasoningEngine } from "../engines/CounterfactualReasoningEngine.js";

describe("CounterfactualReasoningEngine", () => {
  let engine: CounterfactualReasoningEngine;

  beforeEach(() => {
    engine = new CounterfactualReasoningEngine();
  });

  describe("createCausalGraph", () => {
    it("should create a causal graph with variables", () => {
      const variables = [
        { name: "cutting_speed", type: "continuous" as const, domain: { min: 50, max: 500 }, current_value: 200, unit: "SFM" },
        { name: "surface_finish", type: "continuous" as const, domain: { min: 0.4, max: 6.3 }, current_value: 1.6, unit: "µm" },
        { name: "tool_wear", type: "continuous" as const, domain: { min: 0, max: 0.5 }, current_value: 0.1, unit: "mm" },
      ];

      const graph = engine.createCausalGraph(variables, "machining");

      expect(graph).toBeDefined();
      expect(graph.id).toBeDefined();
      expect(graph.variables.size).toBe(3);
      expect(graph.relations.length).toBeGreaterThan(0); // Should have template relations
    });

    it("should include machining causal templates", () => {
      const variables = [
        { name: "cutting_speed", type: "continuous" as const, domain: { min: 50, max: 500 }, current_value: 200 },
        { name: "surface_finish", type: "continuous" as const, domain: { min: 0.4, max: 6.3 }, current_value: 1.6 },
      ];

      const graph = engine.createCausalGraph(variables, "machining");

      // Should have the cutting_speed -> surface_finish relation
      const relation = graph.relations.find(r => r.from === "cutting_speed" && r.to === "surface_finish");
      expect(relation).toBeDefined();
      expect(relation!.strength).toBeGreaterThan(0);
    });
  });

  describe("generateCounterfactual", () => {
    it("should generate a counterfactual scenario", () => {
      const variables = [
        { name: "cutting_speed", type: "continuous" as const, domain: { min: 50, max: 500 }, current_value: 200 },
        { name: "surface_finish", type: "continuous" as const, domain: { min: 0.4, max: 6.3 }, current_value: 1.6 },
        { name: "tool_wear", type: "continuous" as const, domain: { min: 0, max: 0.5 }, current_value: 0.1 },
      ];

      const graph = engine.createCausalGraph(variables, "machining");
      const cf = engine.generateCounterfactual(graph.id, "cutting_speed", 300);

      expect(cf).not.toBeNull();
      expect(cf!.intervention.variable).toBe("cutting_speed");
      expect(cf!.intervention.original_value).toBe(200);
      expect(cf!.intervention.counterfactual_value).toBe(300);
      expect(cf!.predicted_effects.length).toBeGreaterThan(0);
    });

    it("should calculate outcome and risk scores", () => {
      const variables = [
        { name: "cutting_speed", type: "continuous" as const, domain: { min: 50, max: 500 }, current_value: 200 },
        { name: "surface_finish", type: "continuous" as const, domain: { min: 0.4, max: 6.3 }, current_value: 1.6 },
      ];

      const graph = engine.createCausalGraph(variables, "machining");
      const cf = engine.generateCounterfactual(graph.id, "cutting_speed", 300);

      expect(cf!.outcome_score).toBeGreaterThanOrEqual(0);
      expect(cf!.outcome_score).toBeLessThanOrEqual(1);
      expect(cf!.risk_score).toBeGreaterThanOrEqual(0);
      expect(cf!.feasibility).toBeGreaterThan(0);
    });
  });

  describe("compareScenarios", () => {
    it("should compare and rank multiple counterfactual scenarios", () => {
      const variables = [
        { name: "cutting_speed", type: "continuous" as const, domain: { min: 50, max: 500 }, current_value: 200 },
        { name: "feed_rate", type: "continuous" as const, domain: { min: 0.001, max: 0.020 }, current_value: 0.008 },
        { name: "surface_finish", type: "continuous" as const, domain: { min: 0.4, max: 6.3 }, current_value: 1.6 },
      ];

      const graph = engine.createCausalGraph(variables, "machining");

      // Generate multiple scenarios
      engine.generateCounterfactual(graph.id, "cutting_speed", 250);
      engine.generateCounterfactual(graph.id, "cutting_speed", 300);
      engine.generateCounterfactual(graph.id, "feed_rate", 0.006);

      const comparison = engine.compareScenarios(graph.id);

      expect(comparison).not.toBeNull();
      expect(comparison!.scenarios.length).toBe(3);
      expect(comparison!.ranking.length).toBe(3);
      expect(comparison!.best_scenario_id).toBeDefined();
      expect(comparison!.recommendation).toBeDefined();
    });
  });

  describe("analyzeRootCause", () => {
    it("should analyze root causes for undesired outcome", () => {
      const variables = [
        { name: "cutting_speed", type: "continuous" as const, domain: { min: 50, max: 500 }, current_value: 200 },
        { name: "feed_rate", type: "continuous" as const, domain: { min: 0.001, max: 0.020 }, current_value: 0.008 },
        { name: "surface_finish", type: "continuous" as const, domain: { min: 0.4, max: 6.3 }, current_value: 2.5 },
      ];

      const graph = engine.createCausalGraph(variables, "machining");
      const analysis = engine.analyzeRootCause(graph.id, "surface_finish", 1.0);

      expect(analysis).not.toBeNull();
      expect(analysis!.observed_outcome).toContain("surface_finish = 2.5");
      expect(analysis!.desired_outcome).toContain("surface_finish = 1");
      expect(analysis!.root_causes.length).toBeGreaterThan(0);
      expect(analysis!.intervention_plan.length).toBeGreaterThan(0);
    });
  });

  describe("getMachiningTemplates", () => {
    it("should return machining causal templates", () => {
      const templates = engine.getMachiningTemplates();

      expect(templates.length).toBeGreaterThan(10);
      expect(templates.some(t => t.from === "cutting_speed")).toBe(true);
      expect(templates.some(t => t.to === "surface_finish")).toBe(true);
    });
  });

  describe("getTrainingContext", () => {
    it("should return training context string", () => {
      const context = engine.getTrainingContext();

      expect(context).toContain("COUNTERFACTUAL REASONING");
      expect(context).toContain("What-if");
      expect(context).toContain("Causal");
    });
  });
});

describe("counterfactualReasoningEngine singleton", () => {
  it("should be defined", () => {
    expect(counterfactualReasoningEngine).toBeDefined();
    expect(counterfactualReasoningEngine).toBeInstanceOf(CounterfactualReasoningEngine);
  });
});
