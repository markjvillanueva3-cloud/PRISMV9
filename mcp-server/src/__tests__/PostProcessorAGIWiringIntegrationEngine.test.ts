/**
 * PostProcessorAGIWiringIntegrationEngine Tests
 */

import { describe, it, expect } from "vitest";
import { postProcessorAGIWiringIntegrationEngine } from "../engines/PostProcessorAGIWiringIntegrationEngine.js";

describe("PostProcessorAGIWiringIntegrationEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorAGIWiringIntegrationEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.knowledgeEnginesTracked).toBe(7);
      expect(stats.registryEngines).toBeGreaterThan(40);
    });
  });

  describe("Wiring Verification", () => {
    it("should verify wiring is complete", () => {
      const v = postProcessorAGIWiringIntegrationEngine.verifyWiring();

      expect(v.wiringComplete).toBe(true);
      expect(v.reachable.length).toBe(v.allKnowledgeEngines.length);
      expect(v.unreachable).toEqual([]);
    });

    it("should report all 7 knowledge engines", () => {
      const v = postProcessorAGIWiringIntegrationEngine.verifyWiring();

      expect(v.allKnowledgeEngines).toContain("pp-tribal-int");
      expect(v.allKnowledgeEngines).toContain("pp-prod-patterns");
      expect(v.allKnowledgeEngines).toContain("pp-kinematics");
      expect(v.allKnowledgeEngines).toContain("pp-cps-impl");
      expect(v.allKnowledgeEngines).toContain("pp-hypermill-kb");
      expect(v.allKnowledgeEngines).toContain("pp-master-post-arch");
      expect(v.allKnowledgeEngines).toContain("pp-comprehensive-kb");
    });

    it("should track routing rules", () => {
      const v = postProcessorAGIWiringIntegrationEngine.verifyWiring();
      expect(v.routingRulesCount).toBeGreaterThan(20);
    });

    it("should report registry coverage", () => {
      const v = postProcessorAGIWiringIntegrationEngine.verifyWiring();
      expect(v.registryCovered.length).toBeGreaterThan(40);
    });
  });

  describe("Quick Health Check", () => {
    it("should return healthy status", () => {
      const health = postProcessorAGIWiringIntegrationEngine.quickHealthCheck();

      expect(health.healthy).toBe(true);
      expect(health.engines.length).toBe(7);
      expect(health.summary).toContain("healthy");
    });

    it("should report each engine reachable", () => {
      const health = postProcessorAGIWiringIntegrationEngine.quickHealthCheck();

      expect(health.engines.every(e => e.reachable)).toBe(true);
    });
  });

  describe("Execution Planning", () => {
    it("should plan for post generation task", () => {
      const plan = postProcessorAGIWiringIntegrationEngine.planExecution(
        "generate post for Haas VF-2 milling steel"
      );

      expect(plan.routedEngines.length).toBeGreaterThan(0);
      expect(plan.knowledgeEngines.length).toBe(7);
      expect(plan.totalEngines).toBeGreaterThan(5);
    });

    it("should assess complexity", () => {
      const simple = postProcessorAGIWiringIntegrationEngine.planExecution("tribal wisdom");
      const complex = postProcessorAGIWiringIntegrationEngine.planExecution(
        "generate 5-axis post for titanium with physics validation and tribal knowledge for Haas UMC"
      );

      expect(["simple", "moderate", "complex"]).toContain(simple.estimatedComplexity);
      expect(["simple", "moderate", "complex"]).toContain(complex.estimatedComplexity);
    });

    it("should include knowledge engines in every plan", () => {
      const plan = postProcessorAGIWiringIntegrationEngine.planExecution("any task");

      expect(plan.knowledgeEngines).toContain("pp-tribal-int");
      expect(plan.knowledgeEngines).toContain("pp-prod-patterns");
    });
  });

  describe("Full Pipeline Execution", () => {
    it("should run full pipeline with all knowledge sources", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate Haas post for steel",
        controller: "haas",
        machineId: "haas-vf2",
        machineType: "vmc-3axis",
        material: "steel",
        operations: ["roughing"]
      });

      expect(result.routing.matchedRules).toBeGreaterThan(0);
      expect(result.knowledgeContext.tribalTips).toBeGreaterThan(0);
      expect(result.executionDetails.knowledgeEnginesQueried.length).toBeGreaterThan(3);
      expect(result.reasoningChain.length).toBeGreaterThan(4);
    });

    it("should invoke all knowledge engines by default", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate post",
        controller: "haas",
        machineId: "haas-vf2",
        machineType: "vmc-3axis",
        material: "steel"
      });

      expect(result.executionDetails.knowledgeEnginesQueried).toContain("pp-tribal-int");
      expect(result.executionDetails.knowledgeEnginesQueried).toContain("pp-prod-patterns");
      expect(result.executionDetails.knowledgeEnginesQueried).toContain("pp-comprehensive-kb");
    });

    it("should produce G-code output", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate post",
        controller: "fanuc",
        material: "steel",
        operations: ["roughing"]
      });

      expect(result.gcode).toBeDefined();
      expect(result.gcode?.length).toBeGreaterThan(10);
    });

    it("should record feedback when enabled", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate post with learning",
        controller: "haas",
        material: "steel",
        operations: ["roughing"],
        options: { recordFeedback: true }
      });

      expect(result.executionDetails.enginesInvoked).toContain("pp-agi-learning");
    });

    it("should respect option filters", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate post tribal-only",
        controller: "haas",
        material: "steel",
        options: {
          includeTribalKnowledge: true,
          includeProductionPatterns: false,
          includeKinematicsValidation: false,
          includeCPSKnowledge: false,
          includeHyperMillKnowledge: false,
          includeMasterPostArchitecture: false,
          includeCatalogData: false
        }
      });

      expect(result.executionDetails.knowledgeEnginesQueried).toContain("pp-tribal-int");
      expect(result.executionDetails.knowledgeEnginesQueried).not.toContain("pp-prod-patterns");
      expect(result.executionDetails.knowledgeEnginesQueried).not.toContain("pp-kinematics");
    });
  });

  describe("Knowledge Context Aggregation", () => {
    it("should collect critical warnings", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate graphite electrode post",
        controller: "haas",
        material: "graphite",
        operations: ["milling"]
      });

      expect(Array.isArray(result.knowledgeContext.criticalWarnings)).toBe(true);
      // Graphite has critical safety tips (dust collection)
      expect(result.knowledgeContext.criticalWarnings.length).toBeGreaterThan(0);
    });

    it("should collect recommendations", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate post",
        controller: "okuma",
        material: "steel"
      });

      expect(result.knowledgeContext.recommendations.length).toBeGreaterThan(0);
    });

    it("should collect physics basis for tips", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "physics analysis",
        controller: "fanuc",
        material: "steel"
      });

      expect(result.knowledgeContext.physicsBasis.length).toBeGreaterThan(0);
    });

    it("should include production patterns for known material", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "post for D2 tool steel",
        material: "D2"
      });

      expect(result.knowledgeContext.productionPatterns).toBeDefined();
      expect(result.knowledgeContext.productionPatterns?.materialSpeeds).toBeDefined();
    });

    it("should include kinematics for known machine", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "machine analysis",
        machineId: "haas-vf2"
      });

      expect(result.knowledgeContext.kinematics).toBeDefined();
      expect(result.knowledgeContext.kinematics?.machineProfile).toBeDefined();
    });

    it("should include master post architecture for known type", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "architecture query",
        machineType: "vmc-3axis"
      });

      expect(result.knowledgeContext.masterPostArchitecture).toBeDefined();
    });

    it("should include catalog data", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "catalog lookup for haas machines"
      });

      expect(result.knowledgeContext.catalog).toBeDefined();
      expect(result.knowledgeContext.catalog?.totalAssets).toBeGreaterThan(1000);
    });
  });

  describe("Reasoning Chain", () => {
    it("should produce reasoning chain", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate post",
        controller: "haas",
        material: "steel"
      });

      expect(result.reasoningChain.length).toBeGreaterThan(3);
      expect(result.reasoningChain[0].step).toBe("Route task");
    });

    it("should have engine attribution for each step", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "generate post",
        controller: "haas"
      });

      for (const step of result.reasoningChain) {
        expect(step.engine).toBeDefined();
        expect(step.output).toBeDefined();
      }
    });
  });

  describe("AI Context", () => {
    it("should generate AI context", () => {
      const context = postProcessorAGIWiringIntegrationEngine.getContextForAI();

      expect(context).toContain("WIRING INTEGRATION");
      expect(context).toContain("COMPLETE ✓");
      expect(context).toContain("PIPELINE STAGES");
      expect(context).toContain("API METHODS");
    });

    it("should show all engines reachable", () => {
      const context = postProcessorAGIWiringIntegrationEngine.getContextForAI();

      expect(context).toContain("pp-tribal-int");
      expect(context).toContain("pp-prod-patterns");
      expect(context).toContain("pp-kinematics");
    });
  });

  describe("Edge Cases", () => {
    it("should handle minimal request", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "minimal test"
      });

      expect(result).toBeDefined();
      expect(result.executionDetails).toBeDefined();
    });

    it("should handle unknown controller", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "test",
        controller: "unknown_controller"
      });

      expect(result.executionDetails.success).toBeDefined();
    });

    it("should handle unknown machine", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "test",
        machineId: "nonexistent-machine"
      });

      // Should still run — just with less kinematics context
      expect(result.reasoningChain.length).toBeGreaterThan(0);
    });

    it("should handle unknown material gracefully", async () => {
      const result = await postProcessorAGIWiringIntegrationEngine.runFullPipeline({
        task: "test",
        material: "unknown_metal"
      });

      expect(result).toBeDefined();
    });
  });
});
