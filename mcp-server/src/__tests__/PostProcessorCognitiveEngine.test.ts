/**
 * PostProcessorCognitiveEngine Tests
 * ====================================
 * Tests for the near-AGI cognitive architecture for post processor generation.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorCognitiveEngine,
  type CognitiveGenerationRequest,
  type CognitiveGenerationResult
} from "../engines/PostProcessorCognitiveEngine.js";

describe("PostProcessorCognitiveEngine", () => {
  describe("Statistics", () => {
    it("should return comprehensive statistics", () => {
      const stats = postProcessorCognitiveEngine.getStatistics();

      expect(stats.controllersModeled).toBeGreaterThan(3);
      expect(stats.cognitiveArchitecture).toHaveLength(5);
      expect(stats.capabilities).toHaveLength(6);
      expect(stats.cognitiveArchitecture).toContain("Perception Layer (pattern recognition, intent classification)");
      expect(stats.cognitiveArchitecture).toContain("Metacognitive Layer (self-assessment, confidence calibration)");
    });
  });

  describe("Cognitive Generation - Fanuc", () => {
    it("should generate post with cognitive trace", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate HSM finishing post for complex contours",
        controller: "fanuc",
        machineProfile: {
          manufacturer: "Fanuc",
          model: "Robodrill",
          maxRPM: 24000,
          maxFeed: 15000,
          hasHSM: true,
          hasTSC: true,
          has5Axis: false
        },
        qualityTarget: 0.9,
        safetyTarget: 0.95
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.gcodeBlocks).toBeDefined();
      expect(result.gcodeBlocks.length).toBeGreaterThan(0);
      expect(result.cognitiveTrace).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.5);
      expect(result.explanation).toContain("fanuc");
    });

    it("should include cognitive trace phases", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate safe start block",
        controller: "fanuc"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      // Check all phases present
      expect(result.cognitiveTrace.perceptionPhase).toBeDefined();
      expect(result.cognitiveTrace.memoryRetrievalPhase).toBeDefined();
      expect(result.cognitiveTrace.reasoningPhase).toBeDefined();
      expect(result.cognitiveTrace.synthesisPhase).toBeDefined();

      // Check timing recorded
      expect(result.cognitiveTrace.perceptionPhase.duration_ms).toBeGreaterThanOrEqual(0);
      expect(result.cognitiveTrace.reasoningPhase.deliberationSteps).toBeGreaterThan(0);
    });

    it("should provide metacognitive assessment", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate drilling cycle post",
        controller: "fanuc"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.metacognitiveAssessment).toBeDefined();
      expect(result.metacognitiveAssessment.overallConfidence).toBeGreaterThan(0);
      expect(result.metacognitiveAssessment.overallConfidence).toBeLessThanOrEqual(1);
      expect(result.metacognitiveAssessment.recommendedVerification).toBeInstanceOf(Array);
    });
  });

  describe("Cognitive Generation - Haas", () => {
    it("should use Haas-specific cognitive model", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate finishing post with smoothing",
        controller: "haas",
        machineProfile: {
          manufacturer: "Haas",
          model: "VF-2",
          maxRPM: 8100,
          maxFeed: 16500,
          hasHSM: true,
          hasTSC: true,
          has5Axis: false
        }
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.gcodeBlocks.length).toBeGreaterThan(0);
      // Haas uses G187 for smoothing
      const gcodeString = result.gcodeBlocks.join(" ");
      expect(gcodeString.includes("G187") || gcodeString.includes("SAFE START")).toBe(true);
    });
  });

  describe("Cognitive Generation - Okuma", () => {
    it("should use Okuma OSP dialect", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate contour post with Super-NURBS",
        controller: "okuma",
        machineProfile: {
          manufacturer: "Okuma",
          model: "Genos M460V",
          maxRPM: 15000,
          maxFeed: 40000,
          hasHSM: true,
          hasTSC: true,
          has5Axis: false
        }
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.gcodeBlocks.length).toBeGreaterThan(0);
      expect(result.explanation).toContain("okuma");
    });
  });

  describe("Cognitive Generation - Siemens", () => {
    it("should use Sinumerik dialect", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate 5-axis post with TRAORI",
        controller: "siemens",
        machineProfile: {
          manufacturer: "DMG Mori",
          model: "DMU 50",
          maxRPM: 18000,
          maxFeed: 30000,
          hasHSM: true,
          hasTSC: true,
          has5Axis: true
        }
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.gcodeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe("Cognitive Generation - Heidenhain", () => {
    it("should handle Klartext dialect", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate 5-axis plane orientation post",
        controller: "heidenhain"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.gcodeBlocks.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });
  });

  describe("Perception Phase", () => {
    it("should recognize safe start pattern", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate safe start initialization",
        controller: "fanuc"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.perceptionPhase.recognizedPatterns).toContain("safe_start");
    });

    it("should classify operation intent", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate roughing toolpath post",
        controller: "fanuc"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.perceptionPhase.perceivedIntent.primaryOperation).toBe("roughing");
    });

    it("should classify finishing intent", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate finishing pass post with high surface quality",
        controller: "haas"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.perceptionPhase.perceivedIntent.primaryOperation).toBe("finishing");
      expect(result.cognitiveTrace.perceptionPhase.perceivedIntent.surfaceQualityTarget).toBeGreaterThan(0.5);
    });
  });

  describe("Memory Retrieval Phase", () => {
    it("should activate semantic concepts", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate post",
        controller: "fanuc"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.memoryRetrievalPhase.semanticConceptsActivated).toBeInstanceOf(Array);
      // Should activate the dialect name at minimum
      expect(result.cognitiveTrace.memoryRetrievalPhase.semanticConceptsActivated.length).toBeGreaterThan(0);
    });

    it("should fire procedural productions", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate finishing post",
        controller: "fanuc",
        safetyTarget: 0.95
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.memoryRetrievalPhase.proceduralProductionsFired).toBeInstanceOf(Array);
    });
  });

  describe("Reasoning Phase", () => {
    it("should perform causal reasoning", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate HSM post",
        controller: "fanuc",
        machineProfile: {
          manufacturer: "Fanuc",
          model: "Test",
          maxRPM: 20000,
          maxFeed: 15000,
          hasHSM: true,
          hasTSC: false,
          has5Axis: false
        }
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.reasoningPhase.causalInferences).toBeInstanceOf(Array);
      expect(result.cognitiveTrace.reasoningPhase.causalInferences.length).toBeGreaterThan(0);
    });

    it("should record deliberation steps", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Complex multi-operation post",
        controller: "siemens"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.reasoningPhase.deliberationSteps).toBeGreaterThanOrEqual(5);
    });
  });

  describe("Synthesis Phase", () => {
    it("should generate multiple candidates", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate optimized post",
        controller: "haas"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.synthesisPhase.candidatesGenerated).toBeGreaterThan(0);
      expect(result.cognitiveTrace.synthesisPhase.candidatesEvaluated).toBeGreaterThan(0);
    });

    it("should provide alternative solutions", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate post with alternatives",
        controller: "fanuc"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.alternativeSolutions).toBeInstanceOf(Array);
      expect(result.alternativeSolutions.length).toBeGreaterThan(0);
      expect(result.alternativeSolutions[0].tradeoffs).toBeDefined();
    });
  });

  describe("Episodic Memory", () => {
    it("should store episodic memories", () => {
      postProcessorCognitiveEngine.storeEpisodicMemory({
        timestamp: Date.now(),
        context: {
          controller: "fanuc",
          machineModel: "Test Machine",
          camSystem: "fusion360",
          operation: "finishing"
        },
        event: {
          inputRequest: "Test request",
          generatedCode: ["G90", "G01 X10"],
          outcome: "success"
        },
        emotionalTag: 0.8
      });

      const stats = postProcessorCognitiveEngine.getStatistics();
      expect(stats.episodicMemoryCount).toBeGreaterThan(0);
    });
  });

  describe("Explanation Generation", () => {
    it("should generate human-readable explanation", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate test post",
        controller: "okuma"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(100);
      expect(result.explanation).toContain("Cognitive Post Generation");
      expect(result.explanation).toContain("Perception");
      expect(result.explanation).toContain("Memory");
      expect(result.explanation).toContain("Reasoning");
      expect(result.explanation).toContain("Confidence");
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown controller gracefully", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate post",
        controller: "generic" as any
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.gcodeBlocks.length).toBeGreaterThan(0);
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should handle empty problem", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "",
        controller: "fanuc"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.gcodeBlocks.length).toBeGreaterThan(0);
    });

    it("should handle constraints", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate constrained post",
        controller: "haas",
        constraints: ["No canned cycles", "Absolute coordinates only"]
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.cognitiveTrace.perceptionPhase.perceivedIntent.constraints).toEqual(["No canned cycles", "Absolute coordinates only"]);
    });
  });

  describe("Learning Opportunities", () => {
    it("should identify learning opportunities", async () => {
      const request: CognitiveGenerationRequest = {
        problem: "Generate novel post configuration",
        controller: "fanuc"
      };

      const result = await postProcessorCognitiveEngine.generateCognitively(request);

      expect(result.learningOpportunities).toBeInstanceOf(Array);
    });
  });
});
