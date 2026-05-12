/**
 * PostProcessorAGIMasterRegistryEngine Tests
 * ============================================
 * Tests for the PP master registry that inventories all 40+ PP engines.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorAGIMasterRegistryEngine,
  PP_MASTER_REGISTRY,
  ROUTING_RULES
} from "../engines/PostProcessorAGIMasterRegistryEngine.js";

describe("PostProcessorAGIMasterRegistryEngine", () => {
  describe("Statistics", () => {
    it("should return comprehensive statistics", () => {
      const stats = postProcessorAGIMasterRegistryEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.totalEngines).toBeGreaterThanOrEqual(35);
      expect(stats.activeEngines).toBeGreaterThanOrEqual(35);
      expect(stats.routingRules).toBeGreaterThan(10);
      expect(stats.uniqueCapabilities).toBeGreaterThan(30);
    });

    it("should count tier distribution", () => {
      const stats = postProcessorAGIMasterRegistryEngine.getStatistics();

      expect(stats.enginesByTier["agi-orchestration"]).toBeGreaterThan(0);
      expect(stats.enginesByTier.physics).toBeGreaterThan(0);
      expect(stats.enginesByTier.knowledge).toBeGreaterThan(0);
      expect(stats.enginesByTier.generator).toBeGreaterThan(0);
    });
  });

  describe("Registry Coverage", () => {
    it("should have AGI orchestration tier engines", () => {
      const agi = postProcessorAGIMasterRegistryEngine.getEnginesByTier("agi-orchestration");
      expect(agi.length).toBeGreaterThanOrEqual(3);
      expect(agi.some(e => e.id === "pp-master-agi")).toBe(true);
    });

    it("should have physics tier engines", () => {
      const physics = postProcessorAGIMasterRegistryEngine.getEnginesByTier("physics");
      expect(physics.length).toBeGreaterThanOrEqual(2);
      expect(physics.some(e => e.id === "pp-unified-physics")).toBe(true);
    });

    it("should have knowledge tier engines", () => {
      const knowledge = postProcessorAGIMasterRegistryEngine.getEnginesByTier("knowledge");
      expect(knowledge.length).toBeGreaterThanOrEqual(3);
    });

    it("should have deep-learning tier engines", () => {
      const dl = postProcessorAGIMasterRegistryEngine.getEnginesByTier("deep-learning");
      expect(dl.length).toBeGreaterThanOrEqual(3);
    });

    it("should have reasoning tier engines", () => {
      const reasoning = postProcessorAGIMasterRegistryEngine.getEnginesByTier("reasoning");
      expect(reasoning.length).toBeGreaterThanOrEqual(3);
    });

    it("should have generator tier engines", () => {
      const generators = postProcessorAGIMasterRegistryEngine.getEnginesByTier("generator");
      expect(generators.length).toBeGreaterThanOrEqual(5);
    });

    it("should have verification tier engines", () => {
      const verification = postProcessorAGIMasterRegistryEngine.getEnginesByTier("verification");
      expect(verification.length).toBeGreaterThan(0);
    });

    it("should have ultimate tier engines", () => {
      const ultimate = postProcessorAGIMasterRegistryEngine.getEnginesByTier("ultimate");
      expect(ultimate.length).toBeGreaterThan(0);
    });
  });

  describe("Engine Lookup", () => {
    it("should get engine by ID", () => {
      const engine = postProcessorAGIMasterRegistryEngine.getEngine("pp-master-agi");
      expect(engine).toBeDefined();
      expect(engine?.name).toBe("MasterPostProcessorAGIOrchestrationEngine");
    });

    it("should return undefined for unknown engine", () => {
      const engine = postProcessorAGIMasterRegistryEngine.getEngine("unknown-engine-id");
      expect(engine).toBeUndefined();
    });

    it("should have complete engine info", () => {
      for (const engine of PP_MASTER_REGISTRY) {
        expect(engine.id).toBeDefined();
        expect(engine.name).toBeDefined();
        expect(engine.path).toContain("src/engines/");
        expect(engine.tier).toBeDefined();
        expect(engine.purpose).toBeDefined();
        expect(engine.capabilities.length).toBeGreaterThan(0);
        expect(engine.priority).toBeGreaterThanOrEqual(1);
        expect(engine.priority).toBeLessThanOrEqual(5);
      }
    });

    it("should get engines by priority", () => {
      const priority1 = postProcessorAGIMasterRegistryEngine.getEnginesByPriority(1);
      expect(priority1.length).toBeGreaterThan(3);
    });
  });

  describe("Task Routing", () => {
    it("should route post generation task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("generate post for Fanuc");

      expect(result.matchedRules.length).toBeGreaterThan(0);
      expect(result.recommendedEngines.some(e => e.id === "pp-master-agi")).toBe(true);
    });

    it("should route physics task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("calculate kienzle cutting force");

      expect(result.recommendedEngines.some(e => e.id === "pp-unified-physics")).toBe(true);
    });

    it("should route hyperMILL task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("generate post for Haas VF-2 using hyperMILL");

      expect(result.recommendedEngines.some(e => e.id === "pp-hypermill-kb")).toBe(true);
    });

    it("should route lathe task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("generate lathe post");

      expect(result.recommendedEngines.some(e => e.id === "pp-lathe-ai" || e.id === "pp-lathe")).toBe(true);
    });

    it("should route EDM task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("generate wire EDM post");

      expect(result.recommendedEngines.some(e => e.id === "pp-edm-extension")).toBe(true);
    });

    it("should route 5-axis task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("generate 5-axis post with RTCP");

      expect(result.recommendedEngines.length).toBeGreaterThan(0);
    });

    it("should route deep learning task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("train neural network for patterns");

      expect(result.recommendedEngines.some(e => e.tier === "deep-learning")).toBe(true);
    });

    it("should route reasoning task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("reason causally about post quality");

      expect(result.recommendedEngines.some(e => e.tier === "reasoning")).toBe(true);
    });

    it("should route learning feedback task", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("learn from production feedback");

      expect(result.recommendedEngines.some(e => e.id === "pp-agi-learning")).toBe(true);
    });

    it("should provide reasoning for each match", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("generate post");

      expect(result.reasoning.length).toBeGreaterThan(0);
    });

    it("should sort engines by priority", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("generate 5-axis post with physics");

      if (result.recommendedEngines.length > 1) {
        for (let i = 0; i < result.recommendedEngines.length - 1; i++) {
          expect(result.recommendedEngines[i].priority).toBeLessThanOrEqual(
            result.recommendedEngines[i + 1].priority
          );
        }
      }
    });
  });

  describe("Capability Search", () => {
    it("should search by capability", () => {
      const physics = postProcessorAGIMasterRegistryEngine.searchByCapability("kienzle");
      expect(physics.length).toBeGreaterThan(0);
    });

    it("should search by keyword in purpose", () => {
      const bayesian = postProcessorAGIMasterRegistryEngine.searchByCapability("bayesian");
      expect(bayesian.length).toBeGreaterThan(0);
    });

    it("should find RTCP capability", () => {
      const rtcp = postProcessorAGIMasterRegistryEngine.searchByCapability("RTCP");
      expect(rtcp.length).toBeGreaterThan(0);
    });
  });

  describe("Dependency Graph", () => {
    it("should get dependencies for an engine", () => {
      const deps = postProcessorAGIMasterRegistryEngine.getDependencies("pp-coordination-bridge");
      expect(deps.length).toBeGreaterThan(0);
    });

    it("should get dependents for an engine", () => {
      const dependents = postProcessorAGIMasterRegistryEngine.getDependents("pp-unified-physics");
      expect(dependents.length).toBeGreaterThan(0);
    });

    it("should return empty for engine with no dependencies", () => {
      const deps = postProcessorAGIMasterRegistryEngine.getDependencies("pp-unified-physics");
      expect(deps).toEqual([]);
    });

    it("should handle unknown engine ID", () => {
      const deps = postProcessorAGIMasterRegistryEngine.getDependencies("unknown");
      expect(deps).toEqual([]);
    });
  });

  describe("Capability Matrix", () => {
    it("should build capability matrix", () => {
      const matrix = postProcessorAGIMasterRegistryEngine.getCapabilityMatrix();

      expect(Object.keys(matrix).length).toBeGreaterThan(20);
    });

    it("should track multiple engines per capability", () => {
      const matrix = postProcessorAGIMasterRegistryEngine.getCapabilityMatrix();
      const allEngineLists = Object.values(matrix);

      expect(allEngineLists.every(list => list.length > 0)).toBe(true);
    });
  });

  describe("Execution Planning", () => {
    it("should generate execution plan", () => {
      const plan = postProcessorAGIMasterRegistryEngine.getExecutionPlan(
        "generate 5-axis post for titanium with physics validation"
      );

      expect(plan.task).toBeDefined();
      expect(plan.stages.length).toBeGreaterThan(0);
      expect(plan.totalEngines).toBeGreaterThan(0);
    });

    it("should assess complexity", () => {
      const simple = postProcessorAGIMasterRegistryEngine.getExecutionPlan("generate post");
      const complex = postProcessorAGIMasterRegistryEngine.getExecutionPlan(
        "generate 5-axis post with physics, learn from feedback, verify output, optimize feeds"
      );

      expect(["simple", "moderate", "complex"]).toContain(simple.estimatedComplexity);
      expect(["simple", "moderate", "complex"]).toContain(complex.estimatedComplexity);
    });

    it("should identify parallel stages", () => {
      const plan = postProcessorAGIMasterRegistryEngine.getExecutionPlan("generate physics-validated post");

      for (const stage of plan.stages) {
        expect(typeof stage.parallel).toBe("boolean");
        expect(stage.engines.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Registry Completeness", () => {
    it("should have expected AGI engines from this session", () => {
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-master-agi")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-coordination-bridge")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-agi-learning")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-unified-physics")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-physics-generator")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-hypermill-kb")).toBeDefined();
    });

    it("should have pre-existing critical engines", () => {
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-genius")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-video-neural")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-knowledge-graph")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-pipeline")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-lathe-ai")).toBeDefined();
      expect(postProcessorAGIMasterRegistryEngine.getEngine("pp-edm-extension")).toBeDefined();
    });

    it("should have session build dates", () => {
      const newEngines = PP_MASTER_REGISTRY.filter(e => e.built === "2026-04-15");
      expect(newEngines.length).toBeGreaterThan(5);

      const earlierEngines = PP_MASTER_REGISTRY.filter(e => e.built === "earlier");
      expect(earlierEngines.length).toBeGreaterThan(20);
    });
  });

  describe("AI Context Generation", () => {
    it("should generate AI context", () => {
      const context = postProcessorAGIMasterRegistryEngine.getContextForAI();

      expect(context).toContain("POST PROCESSOR MASTER REGISTRY");
      expect(context).toContain("TOTAL ENGINES");
      expect(context).toContain("TIERS");
      expect(context).toContain("API METHODS");
    });

    it("should include usage examples in context", () => {
      const context = postProcessorAGIMasterRegistryEngine.getContextForAI();

      expect(context).toContain("routeTask");
      expect(context).toContain("getEnginesByTier");
      expect(context).toContain("getExecutionPlan");
    });
  });

  describe("Routing Rules", () => {
    it("should have routing rules", () => {
      expect(ROUTING_RULES.length).toBeGreaterThan(10);
    });

    it("should have regex patterns for routing", () => {
      for (const rule of ROUTING_RULES) {
        expect(rule.taskPattern).toBeInstanceOf(RegExp);
        expect(rule.recommendedEngines.length).toBeGreaterThan(0);
        expect(rule.reasoning).toBeDefined();
      }
    });

    it("should have valid engine references in rules", () => {
      for (const rule of ROUTING_RULES) {
        for (const engineId of rule.recommendedEngines) {
          const engine = postProcessorAGIMasterRegistryEngine.getEngine(engineId);
          expect(engine).toBeDefined();
        }
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty task string", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("");
      expect(result.matchedRules).toEqual([]);
    });

    it("should handle task with no matches", () => {
      const result = postProcessorAGIMasterRegistryEngine.routeTask("completely unrelated task xyz");
      expect(result.recommendedEngines).toEqual([]);
    });

    it("should handle very long task description", () => {
      const longTask = "generate post ".repeat(100);
      const result = postProcessorAGIMasterRegistryEngine.routeTask(longTask);
      expect(result.recommendedEngines.length).toBeGreaterThan(0);
    });
  });
});
