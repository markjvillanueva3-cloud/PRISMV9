/**
 * PostProcessorVideoKnowledgeNeuralEngine Tests
 * ==============================================
 * Tests for the video-learned neural network post processor engine.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorVideoKnowledgeNeuralEngine,
  VIDEO_LEARNED_KNOWLEDGE,
  type VideoLearnedController
} from "../engines/PostProcessorVideoKnowledgeNeuralEngine.js";

describe("PostProcessorVideoKnowledgeNeuralEngine", () => {
  describe("Statistics", () => {
    it("should return comprehensive statistics", () => {
      const stats = postProcessorVideoKnowledgeNeuralEngine.getStatistics();

      expect(stats.controllersCount).toBe(14);
      expect(stats.totalTrainingHours).toBeGreaterThan(30);
      expect(stats.totalVideoSources).toBeGreaterThan(10);
      expect(stats.totalTribalTips).toBeGreaterThan(40);
      expect(stats.embeddingDimension).toBe(512);
      expect(stats.attentionHeads).toBe(8);
      expect(stats.neuralLayers).toHaveLength(6);
    });

    it("should have all 6 neural layers documented", () => {
      const stats = postProcessorVideoKnowledgeNeuralEngine.getStatistics();

      expect(stats.neuralLayers[0]).toContain("Perception");
      expect(stats.neuralLayers[1]).toContain("Embedding");
      expect(stats.neuralLayers[2]).toContain("Attention");
      expect(stats.neuralLayers[3]).toContain("Reasoning");
      expect(stats.neuralLayers[4]).toContain("Synthesis");
      expect(stats.neuralLayers[5]).toContain("Metacognition");
    });
  });

  describe("Controller Knowledge", () => {
    it("should have knowledge for all 14 controllers", () => {
      const controllers = postProcessorVideoKnowledgeNeuralEngine.getAvailableControllers();
      expect(controllers).toHaveLength(14);
    });

    it("should return complete knowledge for Siemens 840D", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("siemens_840d");

      expect(knowledge.displayName).toBe("Siemens Sinumerik 840D sl");
      expect(knowledge.manufacturer).toBe("Siemens");
      expect(knowledge.trainingHours).toBe(7.4);
      expect(knowledge.hsmSmoothing.activationCode).toContain("CYCLE832");
      expect(knowledge.tribalKnowledge.length).toBeGreaterThan(0);
    });

    it("should return complete knowledge for Fanuc 0i", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("fanuc_oi");

      expect(knowledge.displayName).toBe("Fanuc 0i Series");
      expect(knowledge.trainingHours).toBe(5.67);
      expect(knowledge.hsmSmoothing.activationCode).toBe("G05.1 Q1");
      expect(knowledge.toolManagement.virtualTipOrientations).toBeDefined();
      expect(knowledge.toolManagement.virtualTipOrientations?.[3]).toBe("OD turning tool (top turret, most common)");
    });

    it("should return complete knowledge for Okuma OSP-P300", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("okuma_osp_p300");

      expect(knowledge.displayName).toBe("Okuma OSP-P300");
      expect(knowledge.hsmSmoothing.activationCode).toBe("G08 P1");
      expect(knowledge.uniqueFeatures).toContain("Super-NURBS spline fitting");
    });

    it("should return complete knowledge for Mazak MAZATROL", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("mazak_mazatrol");

      expect(knowledge.displayName).toBe("Mazak MAZATROL");
      expect(knowledge.toolManagement.offsetFormat).toBe("T#.## (tool.offset, e.g., T6.01, T6.02 for offset A, B)");
      expect(knowledge.tribalKnowledge).toContain("Depth of cut is RADIAL not diameter");
    });

    it("should return complete knowledge for Haas NGC", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("haas_ngc");

      expect(knowledge.displayName).toBe("Haas NGC (Next Generation Control)");
      expect(knowledge.hsmSmoothing.activationCode).toBe("G187 P#");
      expect(knowledge.hsmSmoothing.modes.rough.code).toBe("G187 P1");
      expect(knowledge.hsmSmoothing.modes.finish.code).toBe("G187 P3");
    });

    it("should return complete knowledge for Heidenhain TNC", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("heidenhain_tnc");

      expect(knowledge.tcpm).toBeDefined();
      expect(knowledge.tcpm?.tcpActivation).toBe("M128 (TCPM)");
      expect(knowledge.tcpm?.vectorMode).toBe("PLANE SPATIAL");
    });
  });

  describe("HSM Code Retrieval", () => {
    it("should return correct HSM code for Siemens finish mode", () => {
      const code = postProcessorVideoKnowledgeNeuralEngine.getHSMCode("siemens_840d", "finish");
      expect(code).toContain("CYCLE832");
      expect(code).toContain("0.01");
    });

    it("should return correct HSM code for Haas rough mode", () => {
      const code = postProcessorVideoKnowledgeNeuralEngine.getHSMCode("haas_ngc", "rough");
      expect(code).toBe("G187 P1");
    });

    it("should return correct HSM code for Haas finish mode", () => {
      const code = postProcessorVideoKnowledgeNeuralEngine.getHSMCode("haas_ngc", "finish");
      expect(code).toBe("G187 P3");
    });

    it("should return correct HSM code for Fanuc off mode", () => {
      const code = postProcessorVideoKnowledgeNeuralEngine.getHSMCode("fanuc_oi", "off");
      expect(code).toBe("G05.1 Q0");
    });

    it("should return correct HSM code for Okuma", () => {
      // Okuma doesn't have separate finish mode, falls back to 'on' mode
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("okuma_osp_p300");
      expect(knowledge.hsmSmoothing.modes.on.code).toBe("G08 P1");
    });
  });

  describe("TCPM Code Retrieval", () => {
    it("should return TCPM code for Fanuc", () => {
      const code = postProcessorVideoKnowledgeNeuralEngine.getTCPMCode("fanuc_oi");
      expect(code).toBe("G43.4");
    });

    it("should return TCPM code for Siemens", () => {
      const code = postProcessorVideoKnowledgeNeuralEngine.getTCPMCode("siemens_840d");
      expect(code).toBe("TRAORI");
    });

    it("should return TCPM code for Heidenhain", () => {
      const code = postProcessorVideoKnowledgeNeuralEngine.getTCPMCode("heidenhain_tnc");
      expect(code).toBe("M128 (TCPM)");
    });

    it("should return null for controllers without TCPM", () => {
      const code = postProcessorVideoKnowledgeNeuralEngine.getTCPMCode("brother_c00");
      expect(code).toBeNull();
    });
  });

  describe("Tribal Knowledge Retrieval", () => {
    it("should return tribal knowledge for Siemens", () => {
      const tips = postProcessorVideoKnowledgeNeuralEngine.getTribalKnowledge("siemens_840d");
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.includes("USB"))).toBe(true);
    });

    it("should return tribal knowledge for Fanuc", () => {
      const tips = postProcessorVideoKnowledgeNeuralEngine.getTribalKnowledge("fanuc_oi");
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.includes("radius") || tip.includes("AICC"))).toBe(true);
    });

    it("should return tribal knowledge for Mazak", () => {
      const tips = postProcessorVideoKnowledgeNeuralEngine.getTribalKnowledge("mazak_mazatrol");
      expect(tips.length).toBeGreaterThan(0);
      expect(tips.some(tip => tip.includes("RADIAL") || tip.includes("Pattern"))).toBe(true);
    });
  });

  describe("Common Mistakes Retrieval", () => {
    it("should return common mistakes for Fanuc", () => {
      const mistakes = postProcessorVideoKnowledgeNeuralEngine.getCommonMistakes("fanuc_oi");
      expect(mistakes.length).toBeGreaterThan(0);
      expect(mistakes.some(m => m.includes("virtual tip") || m.includes("AICC"))).toBe(true);
    });

    it("should return common mistakes for Haas", () => {
      const mistakes = postProcessorVideoKnowledgeNeuralEngine.getCommonMistakes("haas_ngc");
      expect(mistakes.length).toBeGreaterThan(0);
    });
  });

  describe("Tool Management Knowledge", () => {
    it("should return tool management for Fanuc with virtual tip orientations", () => {
      const toolMgmt = postProcessorVideoKnowledgeNeuralEngine.getToolManagement("fanuc_oi");

      expect(toolMgmt.offsetFormat).toBe("T0101 (tool 1, offset 1)");
      expect(toolMgmt.virtualTipOrientations).toBeDefined();
      expect(toolMgmt.virtualTipOrientations?.[3]).toBe("OD turning tool (top turret, most common)");
      expect(toolMgmt.virtualTipOrientations?.[2]).toBe("ID boring bar");
      expect(toolMgmt.virtualTipOrientations?.[7]).toBe("Drill (on center)");
    });

    it("should return tool management for Siemens", () => {
      const toolMgmt = postProcessorVideoKnowledgeNeuralEngine.getToolManagement("siemens_840d");

      expect(toolMgmt.naming).toContain("text names");
      expect(toolMgmt.cuttingEdges).toContain("D1-D9");
    });

    it("should return tool management for Mazak", () => {
      const toolMgmt = postProcessorVideoKnowledgeNeuralEngine.getToolManagement("mazak_mazatrol");

      expect(toolMgmt.offsetFormat).toBe("T#.## (tool.offset, e.g., T6.01, T6.02 for offset A, B)");
      expect(toolMgmt.cuttingEdges).toContain("A-J");
    });
  });

  describe("Canned Cycle Format Retrieval", () => {
    it("should return drilling cycle format for Fanuc", () => {
      const format = postProcessorVideoKnowledgeNeuralEngine.getCannedCycleFormat(
        "fanuc_oi", "drilling", "G83"
      );
      expect(format).toBe("G83 X Y Z R Q F");
    });

    it("should return turning cycle format for Fanuc", () => {
      const format = postProcessorVideoKnowledgeNeuralEngine.getCannedCycleFormat(
        "fanuc_oi", "turning", "G71"
      );
      expect(format).toContain("G71");
    });

    it("should return drilling cycle format for Siemens", () => {
      const format = postProcessorVideoKnowledgeNeuralEngine.getCannedCycleFormat(
        "siemens_840d", "drilling", "CYCLE83"
      );
      expect(format).toContain("CYCLE83");
    });

    it("should return null for non-existent cycle", () => {
      const format = postProcessorVideoKnowledgeNeuralEngine.getCannedCycleFormat(
        "fanuc_oi", "drilling", "G999"
      );
      expect(format).toBeNull();
    });
  });

  describe("Neural Reasoning", () => {
    it("should perform neural reasoning for finishing operation", () => {
      const result = postProcessorVideoKnowledgeNeuralEngine.reason({
        operation: "finishing",
        targetController: "haas_ngc"
      });

      expect(result.controller).toBe("haas_ngc");
      expect(result.confidence).toBeGreaterThan(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.gcodeBlocks.length).toBeGreaterThan(0);
      expect(result.features).toContain("hsm_finish");
    });

    it("should perform neural reasoning for roughing operation", () => {
      const result = postProcessorVideoKnowledgeNeuralEngine.reason({
        operation: "roughing",
        targetController: "siemens_840d"
      });

      expect(result.controller).toBe("siemens_840d");
      expect(result.reasoning.some(r => r.includes("rough") || r.includes("Rough"))).toBe(true);
      expect(result.features).toContain("hsm_rough");
    });

    it("should perform neural reasoning for 5-axis operation", () => {
      const result = postProcessorVideoKnowledgeNeuralEngine.reason({
        operation: "5-axis finishing",
        targetController: "fanuc_oi"
      });

      expect(result.controller).toBe("fanuc_oi");
      expect(result.features).toContain("tcpm");
      expect(result.gcodeBlocks.some(g => g.includes("TCPM") || g.includes("G43.4"))).toBe(true);
    });

    it("should include metacognition data", () => {
      const result = postProcessorVideoKnowledgeNeuralEngine.reason({
        operation: "finishing",
        targetController: "fanuc_oi"
      });

      expect(result.metacognition).toBeDefined();
      expect(result.metacognition.selfAssessedConfidence).toBeGreaterThan(0);
      expect(result.metacognition.selfAssessedConfidence).toBeLessThanOrEqual(1);
      expect(result.metacognition.improvementSuggestions.length).toBeGreaterThan(0);
    });

    it("should auto-select best controller when not specified", () => {
      const result = postProcessorVideoKnowledgeNeuralEngine.reason({
        operation: "finishing",
        material: "steel"
      });

      expect(result.controller).toBeDefined();
      expect(Object.keys(VIDEO_LEARNED_KNOWLEDGE)).toContain(result.controller);
    });

    it("should generate warnings from common mistakes", () => {
      const result = postProcessorVideoKnowledgeNeuralEngine.reason({
        operation: "finishing",
        targetController: "fanuc_oi"
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("Warning"))).toBe(true);
    });
  });

  describe("Controller-Specific Features", () => {
    it("should have AICC knowledge for Fanuc", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("fanuc_oi");
      expect(knowledge.hsmSmoothing.modes.level5).toBeDefined();
      expect(knowledge.hsmSmoothing.modes.level5.code).toBe("G05.1 Q1 R5");
    });

    it("should have CYCLE832 knowledge for Siemens", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("siemens_840d");
      expect(knowledge.hsmSmoothing.modes.prefinish).toBeDefined();
      expect(knowledge.hsmSmoothing.modes.prefinish.code).toBe("CYCLE832(0.05, 11211)");
    });

    it("should have Super-NURBS knowledge for Okuma", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("okuma_osp_p300");
      expect(knowledge.hsmSmoothing.modes.rt).toBeDefined();
      expect(knowledge.uniqueFeatures).toContain("Super-NURBS spline fitting");
    });

    it("should have UltiMotion knowledge for Hurco", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("hurco_winmax");
      expect(knowledge.uniqueFeatures).toContain("UltiMotion adaptive motion");
    });

    it("should have SSS Control knowledge for Mitsubishi", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("mitsubishi_m80");
      expect(knowledge.hsmSmoothing.modes.sss).toBeDefined();
    });
  });

  describe("Video Source Tracking", () => {
    it("should track video sources for Fanuc", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("fanuc_oi");
      expect(knowledge.videoSources).toContain("Jody Michaels - Fanuc FA America");
    });

    it("should track video sources for Okuma", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("okuma_osp_p300");
      expect(knowledge.videoSources).toContain("Gosiger Training");
    });

    it("should track video sources for Mazak", () => {
      const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge("mazak_mazatrol");
      expect(knowledge.videoSources).toContain("Mazatrol Tips and Tricks");
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty operation string", () => {
      const result = postProcessorVideoKnowledgeNeuralEngine.reason({
        operation: "",
        targetController: "fanuc_oi"
      });

      expect(result.controller).toBe("fanuc_oi");
      expect(result.metacognition).toBeDefined();
    });

    it("should handle unknown machine capabilities", () => {
      const result = postProcessorVideoKnowledgeNeuralEngine.reason({
        operation: "finishing",
        machineCapabilities: ["unknown_feature", "another_unknown"],
        targetController: "haas_ngc"
      });

      expect(result.controller).toBe("haas_ngc");
      expect(result.confidence).toBeGreaterThan(0);
    });

    it("should return all 14 controllers when listing", () => {
      const controllers = postProcessorVideoKnowledgeNeuralEngine.getAvailableControllers();
      expect(controllers).toContain("siemens_840d");
      expect(controllers).toContain("fanuc_oi");
      expect(controllers).toContain("okuma_osp_p300");
      expect(controllers).toContain("mazak_mazatrol");
      expect(controllers).toContain("haas_ngc");
      expect(controllers).toContain("heidenhain_tnc");
      expect(controllers).toContain("brother_c00");
      expect(controllers).toContain("mitsubishi_m80");
    });
  });

  describe("Knowledge Completeness", () => {
    it("should have setup workflow for each controller", () => {
      const controllers = postProcessorVideoKnowledgeNeuralEngine.getAvailableControllers();
      for (const controller of controllers) {
        const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge(controller);
        expect(knowledge.setupWorkflow.length).toBeGreaterThan(0);
      }
    });

    it("should have program structure for each controller", () => {
      const controllers = postProcessorVideoKnowledgeNeuralEngine.getAvailableControllers();
      for (const controller of controllers) {
        const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge(controller);
        expect(knowledge.programStructure.endOfProgram).toBeDefined();
        expect(knowledge.programStructure.toolCall).toBeDefined();
      }
    });

    it("should have HSM smoothing modes for each controller", () => {
      const controllers = postProcessorVideoKnowledgeNeuralEngine.getAvailableControllers();
      for (const controller of controllers) {
        const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge(controller);
        expect(Object.keys(knowledge.hsmSmoothing.modes).length).toBeGreaterThan(0);
      }
    });

    it("should have drilling cycles for each controller", () => {
      const controllers = postProcessorVideoKnowledgeNeuralEngine.getAvailableControllers();
      for (const controller of controllers) {
        const knowledge = postProcessorVideoKnowledgeNeuralEngine.getControllerKnowledge(controller);
        expect(Object.keys(knowledge.cannedCycles.drilling).length).toBeGreaterThan(0);
      }
    });
  });
});
