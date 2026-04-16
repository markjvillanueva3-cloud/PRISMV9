/**
 * MasterPostProcessorAGIOrchestrationEngine Tests
 * ================================================
 * Tests for the supreme AGI orchestrator for post processor intelligence.
 */

import { describe, it, expect } from "vitest";
import {
  masterPostProcessorAGIOrchestrationEngine,
  PP_ENGINE_REGISTRY,
  CONTROLLER_KNOWLEDGE,
  type AGIPostRequest
} from "../engines/MasterPostProcessorAGIOrchestrationEngine.js";

// Default AGI request for testing
function createAGIRequest(overrides: Partial<AGIPostRequest> = {}): AGIPostRequest {
  return {
    controller: "fanuc",
    machineType: "mill",
    operations: ["roughing", "finishing"],
    material: "steel",
    tool: {
      diameter_mm: 20,
      flutes: 4,
      noseRadius_mm: 0.8,
      material: "carbide"
    },
    machine: {
      maxRPM: 10000,
      power_kW: 15,
      rigidity: "medium",
      axes: 3
    },
    workpiece: {
      hardness_HB: 200,
      stockAllowance_mm: 5,
      partComplexity: "moderate"
    },
    options: {
      optimizationTarget: "balanced",
      safetyLevel: "standard",
      includeComments: true,
      includePhysicsAnnotations: true,
      enableAdaptiveFeed: true,
      reasoningDepth: "deep"
    },
    ...overrides
  };
}

describe("MasterPostProcessorAGIOrchestrationEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = masterPostProcessorAGIOrchestrationEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.totalEngines).toBeGreaterThan(10);
      expect(stats.totalControllers).toBeGreaterThan(8);
      expect(stats.totalCapabilities).toBeGreaterThan(50);
      expect(stats.totalTribalTips).toBeGreaterThan(200);
      expect(stats.totalVideoHours).toBeGreaterThan(30);
      expect(stats.safetyThreshold).toBe(0.70);
    });
  });

  describe("Post Processor Engine Registry", () => {
    it("should have comprehensive engine registry", () => {
      expect(PP_ENGINE_REGISTRY.length).toBeGreaterThan(10);
    });

    it("should have physics engines", () => {
      const physicsEngines = PP_ENGINE_REGISTRY.filter(e => e.category === "physics");
      expect(physicsEngines.length).toBeGreaterThan(0);
      expect(physicsEngines.some(e => e.name.includes("UnifiedPhysics"))).toBe(true);
    });

    it("should have generator engines", () => {
      const generators = PP_ENGINE_REGISTRY.filter(e => e.category === "generator");
      expect(generators.length).toBeGreaterThan(0);
    });

    it("should have knowledge engines", () => {
      const knowledge = PP_ENGINE_REGISTRY.filter(e => e.category === "knowledge");
      expect(knowledge.length).toBeGreaterThan(1);
    });

    it("should have deep learning engines", () => {
      const dl = PP_ENGINE_REGISTRY.filter(e => e.category === "deep-learning");
      expect(dl.length).toBeGreaterThan(1);
    });

    it("should have reasoning engines", () => {
      const reasoning = PP_ENGINE_REGISTRY.filter(e => e.category === "reasoning");
      expect(reasoning.length).toBeGreaterThan(0);
    });

    it("should have meta engines", () => {
      const meta = PP_ENGINE_REGISTRY.filter(e => e.category === "meta");
      expect(meta.length).toBeGreaterThan(1);
    });

    it("should have priorities and confidence scores", () => {
      for (const engine of PP_ENGINE_REGISTRY) {
        expect(engine.priority).toBeGreaterThan(0);
        expect(engine.priority).toBeLessThanOrEqual(5);
        expect(engine.confidence).toBeGreaterThan(0.7);
        expect(engine.confidence).toBeLessThanOrEqual(1);
      }
    });

    it("should have capabilities for all engines", () => {
      for (const engine of PP_ENGINE_REGISTRY) {
        expect(engine.capabilities.length).toBeGreaterThan(2);
        expect(engine.inputTypes.length).toBeGreaterThan(0);
        expect(engine.outputTypes.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Controller Knowledge Database", () => {
    it("should have multiple controllers", () => {
      expect(CONTROLLER_KNOWLEDGE.length).toBeGreaterThan(8);
    });

    it("should have Fanuc controller", () => {
      const fanuc = CONTROLLER_KNOWLEDGE.find(c => c.id === "fanuc");
      expect(fanuc).toBeDefined();
      expect(fanuc?.rtcp.activation).toBe("G43.4 H#");
      expect(fanuc?.marketShare).toBeGreaterThan(0.3);
    });

    it("should have Siemens controller", () => {
      const siemens = CONTROLLER_KNOWLEDGE.find(c => c.id === "siemens");
      expect(siemens).toBeDefined();
      expect(siemens?.rtcp.activation).toBe("TRAORI");
      expect(siemens?.hsm).toBe("CYCLE832");
    });

    it("should have Okuma controller", () => {
      const okuma = CONTROLLER_KNOWLEDGE.find(c => c.id === "okuma");
      expect(okuma).toBeDefined();
      expect(okuma?.nurbs).toBe("G06");
      expect(okuma?.jmDieUsage).toBe("high");
    });

    it("should have Haas controller", () => {
      const haas = CONTROLLER_KNOWLEDGE.find(c => c.id === "haas");
      expect(haas).toBeDefined();
      expect(haas?.rtcp.activation).toBe("G234");
      expect(haas?.hsm).toBe("G187 P3 E0.0001");
    });

    it("should have Heidenhain controller", () => {
      const heidenhain = CONTROLLER_KNOWLEDGE.find(c => c.id === "heidenhain");
      expect(heidenhain).toBeDefined();
      expect(heidenhain?.rtcp.activation).toBe("M128");
      expect(heidenhain?.rtcp.vectorMode).toBe("TCPM");
    });

    it("should have Mazak controller", () => {
      const mazak = CONTROLLER_KNOWLEDGE.find(c => c.id === "mazak");
      expect(mazak).toBeDefined();
      expect(mazak?.strengths).toContain("Conversational programming");
    });

    it("should have Mitsubishi controller", () => {
      const mitsubishi = CONTROLLER_KNOWLEDGE.find(c => c.id === "mitsubishi");
      expect(mitsubishi).toBeDefined();
      expect(mitsubishi?.jmDieUsage).toBe("medium");
    });

    it("should have Hurco controller", () => {
      const hurco = CONTROLLER_KNOWLEDGE.find(c => c.id === "hurco");
      expect(hurco).toBeDefined();
      expect(hurco?.hsm).toBe("UltiMotion");
      expect(hurco?.jmDieUsage).toBe("high");
    });

    it("should have tribal tips for all controllers", () => {
      for (const controller of CONTROLLER_KNOWLEDGE) {
        expect(controller.tribalTips).toBeGreaterThan(0);
        expect(controller.videoHours).toBeGreaterThanOrEqual(0);
      }
    });

    it("should have strengths and weaknesses", () => {
      for (const controller of CONTROLLER_KNOWLEDGE) {
        expect(controller.strengths.length).toBeGreaterThan(0);
        expect(controller.weaknesses.length).toBeGreaterThan(0);
      }
    });
  });

  describe("AGI Post Generation", () => {
    it("should generate AGI post for Fanuc mill", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.length).toBeGreaterThan(20);
      expect(result.reasoningChain.length).toBeGreaterThan(5);
      expect(result.qualityMetrics.safetyScore).toBeGreaterThan(0.7);
    });

    it("should generate AGI post for Siemens", async () => {
      const request = createAGIRequest({ controller: "siemens" });
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.some(line => line.includes("CYCLE832") || line.includes("Siemens"))).toBe(true);
    });

    it("should generate AGI post for 5-axis", async () => {
      const request = createAGIRequest({
        machineType: "5axis",
        machine: { maxRPM: 12000, power_kW: 20, rigidity: "high", axes: 5 }
      });
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.some(line => line.includes("G43.4"))).toBe(true);
      expect(result.gcode.some(line => line.includes("G49"))).toBe(true);
    });

    it("should include reasoning chain", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.reasoningChain.length).toBeGreaterThan(5);

      const modes = result.reasoningChain.map(s => s.mode);
      expect(modes).toContain("analytical");
      expect(modes).toContain("causal");
      expect(modes).toContain("ensemble");
      expect(modes).toContain("meta");
    });

    it("should include physics analysis", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.physicsAnalysis.cuttingForce_N).toBeGreaterThan(0);
      expect(result.physicsAnalysis.toolLife_min).toBeGreaterThan(0);
      expect(result.physicsAnalysis.chipTemperature_C).toBeGreaterThan(100);
    });

    it("should include quality metrics", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.qualityMetrics.safetyScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.confidenceScore).toBeGreaterThan(0);
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(0.5);
    });

    it("should include engine contributions", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.engineContributions.length).toBeGreaterThan(5);
      for (const contrib of result.engineContributions) {
        expect(contrib.engineId).toBeDefined();
        expect(contrib.confidence).toBeGreaterThan(0);
        expect(contrib.weight).toBeGreaterThan(0);
      }
    });

    it("should include controller insights", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.controllerInsights.controller).toBeDefined();
      expect(result.controllerInsights.tribalTipsApplied.length).toBeGreaterThan(0);
      expect(result.controllerInsights.optimalSettings.rtcp).toBeDefined();
    });

    it("should include metadata", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.metadata.generationTime_ms).toBeGreaterThanOrEqual(0);
      expect(result.metadata.enginesInvoked).toBeGreaterThan(10);
      expect(result.metadata.reasoningSteps).toBeGreaterThan(5);
      expect(result.metadata.version).toBe("1.0.0");
    });
  });

  describe("Engine Search", () => {
    it("should search engines by name", () => {
      const results = masterPostProcessorAGIOrchestrationEngine.searchEngines("physics");
      expect(results.length).toBeGreaterThan(0);
      expect(results.some(e => e.name.toLowerCase().includes("physics"))).toBe(true);
    });

    it("should search engines by capability", () => {
      const results = masterPostProcessorAGIOrchestrationEngine.searchEngines("Kienzle");
      expect(results.length).toBeGreaterThan(0);
    });

    it("should search engines by category", () => {
      const results = masterPostProcessorAGIOrchestrationEngine.searchEngines("deep-learning");
      expect(results.length).toBeGreaterThan(1);
      expect(results.every(e => e.category === "deep-learning")).toBe(true);
    });
  });

  describe("Controller Lookup", () => {
    it("should get controller by ID", () => {
      const controller = masterPostProcessorAGIOrchestrationEngine.getController("fanuc");
      expect(controller).toBeDefined();
      expect(controller?.name).toBe("Fanuc");
    });

    it("should get controller by partial name", () => {
      const controller = masterPostProcessorAGIOrchestrationEngine.getController("sinumerik");
      expect(controller).toBeDefined();
      expect(controller?.id).toBe("siemens");
    });

    it("should return undefined for unknown controller", () => {
      const controller = masterPostProcessorAGIOrchestrationEngine.getController("nonexistent");
      expect(controller).toBeUndefined();
    });
  });

  describe("Engine Recommendations", () => {
    it("should recommend engines for physics task", () => {
      const recs = masterPostProcessorAGIOrchestrationEngine.recommendEngines("calculate cutting force thermal");
      expect(recs.length).toBeGreaterThan(0);
      expect(recs[0].reason).toContain("Physics");
    });

    it("should recommend engines for generation task", () => {
      const recs = masterPostProcessorAGIOrchestrationEngine.recommendEngines("generate G-code create post");
      expect(recs.length).toBeGreaterThan(0);
    });

    it("should recommend engines for deep learning task", () => {
      const recs = masterPostProcessorAGIOrchestrationEngine.recommendEngines("pattern recognition neural network");
      expect(recs.length).toBeGreaterThan(0);
      expect(recs.some(r => r.engine.category === "deep-learning")).toBe(true);
    });

    it("should recommend engines for reasoning task", () => {
      const recs = masterPostProcessorAGIOrchestrationEngine.recommendEngines("causal reasoning think about");
      expect(recs.length).toBeGreaterThan(0);
    });

    it("should sort by confidence", () => {
      const recs = masterPostProcessorAGIOrchestrationEngine.recommendEngines("physics force");
      if (recs.length > 1) {
        expect(recs[0].confidence).toBeGreaterThanOrEqual(recs[1].confidence);
      }
    });
  });

  describe("AI Context Generation", () => {
    it("should generate context for AI injection", () => {
      const context = masterPostProcessorAGIOrchestrationEngine.getContextForAI();

      expect(context).toContain("MASTER POST PROCESSOR AGI");
      expect(context).toContain("POST PROCESSOR ENGINES");
      expect(context).toContain("CONTROLLERS");
      expect(context).toContain("AGI REASONING MODES");
      expect(context).toContain("API METHODS");
    });

    it("should include engine categories in context", () => {
      const context = masterPostProcessorAGIOrchestrationEngine.getContextForAI();

      expect(context).toContain("physics");
      expect(context).toContain("generator");
      expect(context).toContain("knowledge");
    });

    it("should include controller usage in context", () => {
      const context = masterPostProcessorAGIOrchestrationEngine.getContextForAI();

      expect(context).toContain("Okuma");
      expect(context).toContain("Haas");
      expect(context).toContain("Fanuc");
    });
  });

  describe("Reasoning Modes", () => {
    it("should use analytical mode for decomposition", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      const analyticalSteps = result.reasoningChain.filter(s => s.mode === "analytical");
      expect(analyticalSteps.length).toBeGreaterThan(0);
    });

    it("should use causal mode for physics", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      const causalSteps = result.reasoningChain.filter(s => s.mode === "causal");
      expect(causalSteps.length).toBeGreaterThan(0);
    });

    it("should use ensemble mode for multi-engine fusion", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      const ensembleSteps = result.reasoningChain.filter(s => s.mode === "ensemble");
      expect(ensembleSteps.length).toBeGreaterThan(0);
    });

    it("should use meta mode for self-reflection", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      const metaSteps = result.reasoningChain.filter(s => s.mode === "meta");
      expect(metaSteps.length).toBeGreaterThan(0);
    });
  });

  describe("Material Handling", () => {
    it("should handle steel material", async () => {
      const request = createAGIRequest({ material: "steel" });
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.some(line => line.toLowerCase().includes("steel"))).toBe(true);
    });

    it("should handle aluminum material", async () => {
      const request = createAGIRequest({ material: "aluminum" });
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.some(line => line.toLowerCase().includes("aluminum"))).toBe(true);
    });

    it("should handle titanium material", async () => {
      const request = createAGIRequest({ material: "titanium" });
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown controller", async () => {
      const request = createAGIRequest({ controller: "unknown_brand" });
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.length).toBeGreaterThan(10);
      expect(result.controllerInsights.controller).toBeDefined();
    });

    it("should handle unknown material", async () => {
      const request = createAGIRequest({ material: "unknown_metal" });
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle empty operations", async () => {
      const request = createAGIRequest({ operations: [] });
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle minimal request", async () => {
      const request: AGIPostRequest = {
        controller: "fanuc",
        machineType: "mill",
        operations: ["roughing"],
        material: "steel"
      };
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.gcode.length).toBeGreaterThan(10);
      expect(result.qualityMetrics.overallScore).toBeGreaterThan(0);
    });
  });

  describe("Safety Threshold", () => {
    it("should have safety threshold of 0.70", () => {
      const stats = masterPostProcessorAGIOrchestrationEngine.getStatistics();
      expect(stats.safetyThreshold).toBe(0.70);
    });

    it("should generate results with safety score above threshold", async () => {
      const request = createAGIRequest();
      const result = await masterPostProcessorAGIOrchestrationEngine.generateAGIPost(request);

      expect(result.qualityMetrics.safetyScore).toBeGreaterThanOrEqual(0.70);
    });
  });
});
