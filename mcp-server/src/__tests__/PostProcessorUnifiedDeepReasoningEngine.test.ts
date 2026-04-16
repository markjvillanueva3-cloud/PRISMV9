/**
 * PostProcessorUnifiedDeepReasoningEngine Tests
 * ==============================================
 * Tests for the unified deep learning, neural network, and reasoning engine.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  postProcessorUnifiedDeepReasoningEngine,
  type UnifiedReasoningRequest,
  type UnifiedReasoningResult
} from "../engines/PostProcessorUnifiedDeepReasoningEngine.js";

describe("PostProcessorUnifiedDeepReasoningEngine", () => {
  describe("Statistics", () => {
    it("should return comprehensive statistics", () => {
      const stats = postProcessorUnifiedDeepReasoningEngine.getStatistics();

      expect(stats.controllersSupported).toBeGreaterThan(15);
      expect(stats.patternsLearned).toBeGreaterThan(5);
      expect(stats.jmDieMachines).toBe(9);
      expect(stats.intelligenceLayers).toBe(6);
      expect(stats.mctsConfig).toBeDefined();
      expect(stats.mctsConfig.explorationConstant).toBeCloseTo(Math.sqrt(2), 5);
    });
  });

  describe("Unified Reasoning - Fanuc Controller", () => {
    let request: UnifiedReasoningRequest;
    let result: UnifiedReasoningResult;

    beforeEach(() => {
      request = {
        problem: "Generate optimized HSM post for 3-axis milling",
        controller: "fanuc",
        machineCapabilities: {
          hasHSM: true,
          hasTSC: true,
          hasProbing: true,
          has5Axis: false,
          maxRPM: 12000,
          maxFeed: 1000
        },
        targetMetrics: {
          quality: 0.9,
          efficiency: 0.85,
          safety: 0.95
        },
        enableCounterfactual: true,
        enableMetaCognition: true
      };

      result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);
    });

    it("should produce valid solution", () => {
      expect(result.solution).toBeDefined();
      expect(result.solution.gcodeBlocks).toBeInstanceOf(Array);
      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
    });

    it("should include safe start block", () => {
      const gcodeString = result.solution.gcodeBlocks.join(" ");
      expect(gcodeString).toContain("G90");
      expect(gcodeString).toContain("G80");
    });

    it("should include Fanuc-specific codes", () => {
      const gcodeString = result.solution.gcodeBlocks.join(" ");
      // Should have Fanuc HSM code
      expect(gcodeString).toContain("G05.1") || expect(gcodeString).toContain("G64");
    });

    it("should identify features applied", () => {
      expect(result.solution.features).toBeInstanceOf(Array);
      expect(result.solution.features.length).toBeGreaterThan(0);
    });

    it("should include optimizations", () => {
      expect(result.solution.optimizations).toBeInstanceOf(Array);
    });

    it("should provide reasoning path", () => {
      expect(result.reasoning).toBeDefined();
      expect(result.reasoning.metaCognition).toBeDefined();
      expect(result.reasoning.metaCognition.reasoningQuality).toBeGreaterThan(0);
    });

    it("should calculate metrics", () => {
      expect(result.metrics.quality).toBeGreaterThan(0);
      expect(result.metrics.efficiency).toBeGreaterThan(0);
      expect(result.metrics.safety).toBeGreaterThan(0);
      expect(result.metrics.confidence).toBeGreaterThan(0);
    });

    it("should integrate tribal knowledge", () => {
      expect(result.tribalKnowledge).toBeDefined();
      expect(result.tribalKnowledge.appliedTips).toBeInstanceOf(Array);
      expect(result.tribalKnowledge.alignmentScore).toBeGreaterThanOrEqual(0);
    });

    it("should validate physics", () => {
      expect(result.physicsValidation).toBeDefined();
      expect(result.physicsValidation.overallSafety).toBeGreaterThan(0);
    });

    it("should generate explanation", () => {
      expect(result.explanation).toBeDefined();
      expect(result.explanation.length).toBeGreaterThan(50);
      expect(result.explanation).toContain("fanuc");
    });
  });

  describe("Unified Reasoning - Haas NGC Controller", () => {
    it("should use G187 for HSM smoothing", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate finishing post with high surface quality",
        controller: "haas_ngc",
        machineCapabilities: {
          hasHSM: true,
          hasTSC: true
        }
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);
      const gcodeString = result.solution.gcodeBlocks.join(" ");

      // Haas uses G187 for smoothing
      expect(gcodeString).toContain("G187");
    });
  });

  describe("Unified Reasoning - Okuma OSP Controller", () => {
    it("should use G08 for Super-NURBS", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate contour post with smooth surfaces",
        controller: "okuma_osp",
        machineCapabilities: {
          hasHSM: true
        }
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);
      const gcodeString = result.solution.gcodeBlocks.join(" ");

      // Okuma uses G08 for Super-NURBS
      expect(gcodeString).toContain("G08");
    });
  });

  describe("Unified Reasoning - Siemens 840D Controller", () => {
    it("should include Siemens-specific codes", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate 5-axis post with TCPM",
        controller: "siemens_840d",
        machineCapabilities: {
          hasHSM: true,
          has5Axis: true
        }
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);
      const gcodeString = result.solution.gcodeBlocks.join(" ");

      // Siemens uses COMPCURV or CYCLE832 for HSM
      const hasSiemensCode = gcodeString.includes("COMPCURV") ||
                            gcodeString.includes("CYCLE832") ||
                            gcodeString.includes("TRAORI");
      expect(hasSiemensCode).toBe(true);
    });
  });

  describe("Unified Reasoning - Heidenhain TNC Controller", () => {
    it("should handle Heidenhain dialect", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate post for Heidenhain machine",
        controller: "heidenhain_tnc",
        machineCapabilities: {
          has5Axis: true
        }
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
      expect(result.tribalKnowledge.appliedTips.length).toBeGreaterThan(0);
    });
  });

  describe("Unified Reasoning - JM Die Machines", () => {
    it("should handle Hurco VMX42 profile", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate post for Hurco VMX42",
        controller: "hurco_winmax",
        machineCapabilities: {
          hasHSM: true,
          hasTSC: true,
          hasProbing: true,
          has5Axis: false,
          maxRPM: 10000,
          maxFeed: 762
        }
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
      expect(result.metrics.confidence).toBeGreaterThan(0.5);
    });

    it("should handle Okuma lathe profile", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate lathe post for Okuma LB15II",
        controller: "okuma_osp",
        machineCapabilities: {
          hasHSM: false,
          hasTSC: false,
          hasSSV: true,
          maxRPM: 5000,
          maxFeed: 500
        }
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe("Meta-Cognition", () => {
    it("should perform meta-cognition when enabled", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Complex multi-operation post",
        controller: "fanuc",
        enableMetaCognition: true
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.reasoning.metaCognition).toBeDefined();
      expect(result.reasoning.metaCognition.reasoningQuality).toBeGreaterThan(0);
      expect(result.reasoning.metaCognition.confidenceCalibration).toBeGreaterThan(0);
      expect(result.reasoning.metaCognition.improvementSuggestions).toBeInstanceOf(Array);
    });

    it("should use default meta-cognition when disabled", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Simple post",
        controller: "generic",
        enableMetaCognition: false
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.reasoning.metaCognition).toBeDefined();
      expect(result.reasoning.metaCognition.reasoningQuality).toBe(0.8);
    });
  });

  describe("Counterfactual Analysis", () => {
    it("should skip counterfactual when disabled", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Basic post generation",
        controller: "haas",
        enableCounterfactual: false
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      // Should still produce valid result
      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe("Constraints Handling", () => {
    it("should handle multiple constraints", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate constrained post",
        controller: "fanuc",
        constraints: [
          "No canned cycles",
          "Keep under 1000 lines",
          "Use absolute coordinates only"
        ]
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      // Confidence should be slightly lower due to constraints
      expect(result.metrics.confidence).toBeLessThan(0.95);
      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
    });
  });

  describe("Generic Controller Fallback", () => {
    it("should work with generic controller", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate basic G-code",
        controller: "generic"
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
      // Should have basic safe start codes
      const gcodeString = result.solution.gcodeBlocks.join(" ");
      expect(gcodeString).toContain("G90");
    });
  });

  describe("MCTS Exploration", () => {
    it("should perform MCTS exploration", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Optimize post processor configuration",
        controller: "fanuc"
      };

      const mctsResult = postProcessorUnifiedDeepReasoningEngine.performMCTSExploration(request, 100);

      expect(mctsResult.bestPath).toBeInstanceOf(Array);
      expect(mctsResult.reward).toBeGreaterThan(0);
      expect(mctsResult.explorationStats.simulations).toBe(100);
      expect(mctsResult.explorationStats.maxDepth).toBeGreaterThan(0);
    });

    it("should find better paths with more simulations", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Deep optimization",
        controller: "haas"
      };

      const result100 = postProcessorUnifiedDeepReasoningEngine.performMCTSExploration(request, 100);
      const result500 = postProcessorUnifiedDeepReasoningEngine.performMCTSExploration(request, 500);

      // More simulations should generally find better or equal paths
      expect(result500.reward).toBeGreaterThanOrEqual(result100.reward * 0.9);
    });
  });

  describe("Physics Validation", () => {
    it("should validate physics with high safety target", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate safe post",
        controller: "fanuc",
        targetMetrics: {
          safety: 0.95
        }
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.physicsValidation.forcesValid).toBe(true);
      expect(result.physicsValidation.thermalValid).toBe(true);
      expect(result.physicsValidation.toolLifeValid).toBe(true);
      expect(result.physicsValidation.overallSafety).toBeGreaterThan(0.8);
    });

    it("should flag physics concerns with low safety target", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate aggressive post",
        controller: "fanuc",
        targetMetrics: {
          safety: 0.3
        }
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      // With low safety target, forces validation may fail
      expect(result.physicsValidation.forcesValid).toBe(false);
    });
  });

  describe("Tribal Knowledge Integration", () => {
    it("should apply controller-specific best practices", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate post with tribal knowledge",
        controller: "okuma_osp_p300"
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.tribalKnowledge.appliedTips.length).toBeGreaterThan(0);
      // Should include Okuma best practices
      const tipsJoined = result.tribalKnowledge.appliedTips.join(" ");
      expect(tipsJoined).toContain("Super-NURBS") || expect(tipsJoined).toContain("CAS");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty problem", () => {
      const request: UnifiedReasoningRequest = {
        problem: "",
        controller: "fanuc"
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
    });

    it("should handle undefined capabilities", () => {
      const request: UnifiedReasoningRequest = {
        problem: "Generate post",
        controller: "fanuc",
        machineCapabilities: undefined
      };

      const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);

      expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
    });

    it("should handle all controller types", () => {
      const controllers = [
        "fanuc", "siemens", "haas", "okuma", "mazak",
        "mitsubishi", "heidenhain", "hurco", "brother", "generic"
      ] as const;

      for (const controller of controllers) {
        const request: UnifiedReasoningRequest = {
          problem: "Test post",
          controller
        };

        const result = postProcessorUnifiedDeepReasoningEngine.performUnifiedReasoning(request);
        expect(result.solution.gcodeBlocks.length).toBeGreaterThan(0);
      }
    });
  });
});
