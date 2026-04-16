/**
 * PostProcessorAISelfAwarenessIntegrationEngine Tests
 * =====================================================
 * Tests for the unified AI self-awareness integration layer
 * for post processor generation.
 *
 * @module tests/PostProcessorAISelfAwarenessIntegrationEngine
 */

import { describe, it, expect, beforeAll } from "vitest";
import {
  postProcessorAISelfAwarenessIntegrationEngine,
  type AIPostGeneratorRequest,
  type PostProcessorSelfAwarenessContext,
  type AIGeneratedPostResult,
} from "../engines/PostProcessorAISelfAwarenessIntegrationEngine.js";

describe("PostProcessorAISelfAwarenessIntegrationEngine", () => {
  beforeAll(async () => {
    await postProcessorAISelfAwarenessIntegrationEngine.initialize();
  });

  describe("Engine Statistics", () => {
    it("should return valid statistics", () => {
      const stats = postProcessorAISelfAwarenessIntegrationEngine.stats();

      expect(stats.jmDieMachines).toBeGreaterThanOrEqual(8);
      expect(stats.controllersSupported).toBeGreaterThanOrEqual(10);
      expect(stats.formulas).toBeGreaterThanOrEqual(8);
      expect(stats.initialized).toBe(true);
    });

    it("should return JM Die machines summary", () => {
      const machines = postProcessorAISelfAwarenessIntegrationEngine.getJMDieMachinesSummary();

      expect(machines.length).toBeGreaterThanOrEqual(8);
      expect(machines.some(m => m.manufacturer === "Okuma")).toBe(true);
      expect(machines.some(m => m.manufacturer === "Haas")).toBe(true);
      expect(machines.some(m => m.manufacturer === "Hurco")).toBe(true);
    });

    it("should return controller knowledge summary", () => {
      const controllers = postProcessorAISelfAwarenessIntegrationEngine.getControllerKnowledgeSummary();

      expect(controllers.length).toBeGreaterThanOrEqual(10);
      expect(controllers.some(c => c.controller === "haas")).toBe(true);
      expect(controllers.some(c => c.controller === "okuma")).toBe(true);
      expect(controllers.some(c => c.controller === "fanuc")).toBe(true);
    });
  });

  describe("Self-Awareness Context Building", () => {
    it("should build context for Haas VF-2", () => {
      const request: AIPostGeneratorRequest = {
        controller: "haas",
        manufacturer: "Haas",
        model: "VF-2",
        axisCount: 3,
        machineType: "mill",
      };

      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext(request);

      expect(context.aiCapabilities.neuralNetworkAvailable).toBe(true);
      expect(context.aiCapabilities.deepReasoningAvailable).toBe(true);
      expect(context.controllerKnowledge.controller).toBe("haas");
      expect(context.controllerKnowledge.dialect).toBe("NGC");
      expect(context.machineProfile).toBeDefined();
      expect(context.machineProfile?.manufacturer).toBe("Haas");
      expect(context.tribalKnowledge.length).toBeGreaterThan(0);
      expect(context.playbookRules.length).toBeGreaterThan(0);
      expect(context.reasoningChain.length).toBeGreaterThan(0);
      expect(context.overallConfidence).toBeGreaterThan(0.5);
    });

    it("should build context for Okuma lathe", () => {
      const request: AIPostGeneratorRequest = {
        controller: "okuma",
        manufacturer: "Okuma",
        model: "LB15II",
        axisCount: 2,
        machineType: "lathe",
      };

      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext(request);

      expect(context.controllerKnowledge.controller).toBe("okuma");
      expect(context.controllerKnowledge.dialect).toBe("OSP");
      expect(context.machineProfile?.machineType).toBe("lathe");
      expect(context.controllerKnowledge.dialectSpecificFeatures).toContain("Super-NURBS G08");
    });

    it("should build context for unknown machine with fallback", () => {
      const request: AIPostGeneratorRequest = {
        controller: "fanuc",
        manufacturer: "Unknown",
        model: "Custom",
        axisCount: 3,
        machineType: "mill",
      };

      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext(request);

      // Should still work with generic controller knowledge
      expect(context.controllerKnowledge.controller).toBe("fanuc");
      expect(context.machineProfile).toBeUndefined(); // No JM Die profile
      expect(context.overallConfidence).toBeLessThan(0.9); // Lower confidence without profile
    });
  });

  describe("Post Generation", () => {
    it("should generate post for Haas VF-2", async () => {
      const request: AIPostGeneratorRequest = {
        controller: "haas",
        manufacturer: "Haas",
        model: "VF-2",
        axisCount: 3,
        machineType: "mill",
        useNeuralNetwork: true,
        useDeepReasoning: true,
      };

      const result = await postProcessorAISelfAwarenessIntegrationEngine.generatePost(request);

      expect(result.postId).toContain("haas");
      expect(result.postId).toContain("vf-2");
      expect(result.name).toContain("Haas");
      expect(result.name).toContain("VF-2");
      expect(result.name).toContain("AI-Enhanced");

      // Safe start block
      expect(result.safeStartBlock).toContain("G90");
      expect(result.safeStartBlock).toContain("G40");
      expect(result.safeStartBlock).toContain("G187"); // Haas HSM

      // Program end
      expect(result.programEndBlock).toContain("M30");

      // Tool change sequence
      expect(result.toolChangeSequence).toContain("M6");
      expect(result.toolChangeSequence).toContain("M3");

      // Coolant codes
      expect(result.coolantCodes.flood).toBeDefined();
      expect(result.coolantCodes.tsc).toBeDefined();
      expect(result.coolantCodes.tsc.on).toBe("M88");
      expect(result.coolantCodes.tsc.off).toBe("M89");

      // HSM control
      expect(result.hsmControl).toBeDefined();
      expect(result.hsmControl?.activate).toContain("G187");
      expect(result.hsmControl?.modes.finish).toBe("P3");

      // Canned cycles
      expect(result.cannedCycles.drill).toBeDefined();
      expect(result.cannedCycles.tap).toBeDefined();

      // Probing cycles (Haas has probing)
      expect(result.probingCycles).toBeDefined();

      // Safety features
      expect(result.safetyFeatures.retract).toContain("G28");
      expect(result.safetyFeatures.emergencyStop).toContain("M0");

      // Self-awareness context
      expect(result.selfAwarenessContext).toBeDefined();
      expect(result.selfAwarenessContext.aiCapabilities.recommendedApproach).toBe("hybrid");

      // Reasoning trace
      expect(result.reasoningTrace.length).toBeGreaterThan(0);

      // Confidence
      expect(result.confidence).toBeGreaterThan(0.7);

      // Knowledge sources
      expect(result.knowledgeSources.length).toBeGreaterThan(0);
      expect(result.knowledgeSources.some(s => s.includes("ControllerKnowledge"))).toBe(true);
    });

    it("should generate post for Okuma mill with Super-NURBS", async () => {
      const request: AIPostGeneratorRequest = {
        controller: "okuma",
        manufacturer: "Okuma",
        model: "Genos M460V",
        axisCount: 3,
        machineType: "mill",
      };

      const result = await postProcessorAISelfAwarenessIntegrationEngine.generatePost(request);

      expect(result.safeStartBlock).toContain("G08 P1"); // Super-NURBS
      expect(result.coolantCodes.tsc?.on).toBe("M51");
      expect(result.workOffsetSetup).toBe("G15 H1"); // Okuma-specific
      expect(result.hsmControl?.activate).toContain("G08");
    });

    it("should generate post for Hurco mill with ISNC mode", async () => {
      const request: AIPostGeneratorRequest = {
        controller: "hurco",
        manufacturer: "Hurco",
        model: "VMX42",
        axisCount: 3,
        machineType: "mill",
      };

      const result = await postProcessorAISelfAwarenessIntegrationEngine.generatePost(request);

      expect(result.safeStartBlock).toContain("G101"); // ISNC mode
      expect(result.selfAwarenessContext.controllerKnowledge.dialectSpecificFeatures)
        .toContain("BNC/ISNC Modes");
    });

    it("should generate 5-axis post with TCP control", async () => {
      const request: AIPostGeneratorRequest = {
        controller: "siemens",
        manufacturer: "DMG",
        model: "DMU 50",
        axisCount: 5,
        machineType: "mill",
      };

      const result = await postProcessorAISelfAwarenessIntegrationEngine.generatePost(request);

      expect(result.fiveAxisControl).toBeDefined();
      expect(result.fiveAxisControl?.tcpOn).toContain("TRAORI");
      expect(result.fiveAxisControl?.mode).toBe("TRAORI");
    });

    it("should generate lathe post with SSV support", async () => {
      const request: AIPostGeneratorRequest = {
        controller: "okuma",
        manufacturer: "Okuma",
        model: "LB15II",
        axisCount: 2,
        machineType: "lathe",
      };

      const result = await postProcessorAISelfAwarenessIntegrationEngine.generatePost(request);

      expect(result.selfAwarenessContext.machineProfile?.capabilities.hasSSV).toBe(true);
      expect(result.safeStartBlock).toContain("G50 S"); // Spindle limit
    });

    it("should include cross-CAM features when specified", async () => {
      const request: AIPostGeneratorRequest = {
        controller: "haas",
        manufacturer: "Haas",
        model: "VF-3",
        axisCount: 3,
        machineType: "mill",
        useCrossCAMSynthesis: true,
        sourceCAMSystems: ["solidcam", "hypermill", "fusion360"],
      };

      const result = await postProcessorAISelfAwarenessIntegrationEngine.generatePost(request);

      expect(result.crossCAMFeatures.length).toBeGreaterThan(0);
      expect(result.crossCAMFeatures.some(f => f.toLowerCase().includes("solidcam"))).toBe(true);
      expect(result.crossCAMFeatures.some(f => f.toLowerCase().includes("hypermill"))).toBe(true);
      expect(result.crossCAMFeatures.some(f => f.toLowerCase().includes("fusion"))).toBe(true);
    });
  });

  describe("Controller Knowledge", () => {
    it("should have Haas-specific knowledge", () => {
      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext({
        controller: "haas",
        manufacturer: "Haas",
        model: "VF-2",
        axisCount: 3,
        machineType: "mill",
      });

      const ck = context.controllerKnowledge;
      expect(ck.mCodes.M88).toBe("TSC On");
      expect(ck.gCodes.G187).toContain("HSM Smoothing");
      expect(ck.cannedCycles.length).toBeGreaterThan(0);
      expect(ck.probingCycles.length).toBeGreaterThan(0);
      expect(ck.dialectSpecificFeatures).toContain("G187 HSM Smoothing");
    });

    it("should have Okuma-specific knowledge", () => {
      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext({
        controller: "okuma",
        manufacturer: "Okuma",
        model: "Genos M460V",
        axisCount: 3,
        machineType: "mill",
      });

      const ck = context.controllerKnowledge;
      expect(ck.gCodes.G08).toContain("Super-NURBS");
      expect(ck.gCodes.G15).toContain("Work Offset");
      expect(ck.dialectSpecificFeatures).toContain("Super-NURBS G08");
      expect(ck.dialectSpecificFeatures).toContain("CAS Collision Avoidance");
    });

    it("should have Siemens-specific knowledge", () => {
      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext({
        controller: "siemens",
        manufacturer: "DMG",
        model: "DMU 50",
        axisCount: 5,
        machineType: "mill",
      });

      const ck = context.controllerKnowledge;
      expect(ck.gCodes.CYCLE832).toContain("HSM");
      expect(ck.gCodes.TRAORI).toContain("5-Axis");
      expect(ck.dialectSpecificFeatures).toContain("CYCLE832 HSM");
      expect(ck.dialectSpecificFeatures).toContain("TRAORI 5-Axis");
    });

    it("should have Heidenhain-specific knowledge", () => {
      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext({
        controller: "heidenhain",
        manufacturer: "Hermle",
        model: "C 400",
        axisCount: 5,
        machineType: "mill",
      });

      const ck = context.controllerKnowledge;
      expect(ck.dialect).toBe("TNC");
      expect(ck.dialectSpecificFeatures).toContain("Klartext Programming");
      expect(ck.dialectSpecificFeatures).toContain("FUNCTION TCPM");
    });
  });

  describe("Playbook Rules", () => {
    it("should include critical safety rules", () => {
      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext({
        controller: "haas",
        manufacturer: "Haas",
        model: "VF-2",
        axisCount: 3,
        machineType: "mill",
      });

      expect(context.playbookRules.some(r => r.ruleId === "safe-start-always")).toBe(true);
      expect(context.playbookRules.some(r => r.ruleId === "retract-before-toolchange")).toBe(true);
      expect(context.playbookRules.some(r => r.severity === "critical")).toBe(true);
    });

    it("should include lathe-specific rules for lathes", () => {
      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext({
        controller: "okuma",
        manufacturer: "Okuma",
        model: "LB15II",
        axisCount: 2,
        machineType: "lathe",
      });

      expect(context.playbookRules.some(r => r.ruleId === "lathe-spindle-limit")).toBe(true);
    });
  });

  describe("Reasoning Chain", () => {
    it("should build reasoning chain with dependencies", () => {
      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext({
        controller: "haas",
        manufacturer: "Haas",
        model: "VF-2",
        axisCount: 3,
        machineType: "mill",
      });

      expect(context.reasoningChain.length).toBeGreaterThanOrEqual(3);

      // First step should have no dependencies
      expect(context.reasoningChain[0].dependencies.length).toBe(0);

      // Later steps should depend on earlier ones
      expect(context.reasoningChain[2].dependencies.length).toBeGreaterThan(0);

      // All steps should have confidence
      for (const step of context.reasoningChain) {
        expect(step.confidence).toBeGreaterThan(0);
        expect(step.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Formula References", () => {
    it("should include applicable formulas", () => {
      const context = postProcessorAISelfAwarenessIntegrationEngine.buildSelfAwarenessContext({
        controller: "haas",
        manufacturer: "Haas",
        model: "VF-2",
        axisCount: 3,
        machineType: "mill",
      });

      expect(context.applicableFormulas.length).toBeGreaterThanOrEqual(8);
      expect(context.applicableFormulas.some(f => f.formulaId === "rpm-sfm")).toBe(true);
      expect(context.applicableFormulas.some(f => f.formulaId === "kienzle-force")).toBe(true);
      expect(context.applicableFormulas.some(f => f.formulaId === "taylor-life")).toBe(true);
    });
  });

  describe("Warnings Generation", () => {
    it("should warn about missing machine profile", async () => {
      const result = await postProcessorAISelfAwarenessIntegrationEngine.generatePost({
        controller: "fanuc",
        manufacturer: "Unknown",
        model: "Custom",
        axisCount: 3,
        machineType: "mill",
      });

      expect(result.warnings.some(w => w.includes("No JM Die machine profile"))).toBe(true);
    });

    it("should warn about 5-axis with generic controller", async () => {
      const result = await postProcessorAISelfAwarenessIntegrationEngine.generatePost({
        controller: "generic",
        manufacturer: "Unknown",
        model: "Custom",
        axisCount: 5,
        machineType: "mill",
      });

      expect(result.warnings.some(w => w.includes("5-axis") || w.includes("TCP"))).toBe(true);
    });
  });
});
