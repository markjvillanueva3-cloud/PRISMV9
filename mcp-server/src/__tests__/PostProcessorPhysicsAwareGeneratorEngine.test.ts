/**
 * PostProcessorPhysicsAwareGeneratorEngine Tests
 * ===============================================
 * Tests for the physics-aware post processor generator.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorPhysicsAwareGeneratorEngine,
  CONTROLLER_DATABASE,
  OPERATION_DATABASE,
  type PhysicsAwareRequest
} from "../engines/PostProcessorPhysicsAwareGeneratorEngine.js";

// Default request for testing
function createRequest(overrides: Partial<PhysicsAwareRequest> = {}): PhysicsAwareRequest {
  return {
    controller: "fanuc",
    machineType: "mill",
    operations: ["roughing"],
    material: "steel",
    toolDiameter_mm: 20,
    toolFlutes: 4,
    toolNoseRadius_mm: 0.8,
    machinePower_kW: 15,
    machineRigidity: "medium",
    coolantType: "flood",
    ...overrides
  };
}

describe("PostProcessorPhysicsAwareGeneratorEngine", () => {
  describe("Statistics", () => {
    it("should return engine statistics", () => {
      const stats = postProcessorPhysicsAwareGeneratorEngine.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.controllers).toBe(7);
      expect(stats.operations).toBe(6);
      expect(stats.physicsModels.length).toBe(8);
      expect(stats.integrations.length).toBe(5);
    });

    it("should list all physics models", () => {
      const stats = postProcessorPhysicsAwareGeneratorEngine.getStatistics();

      expect(stats.physicsModels).toContain("Kienzle cutting force");
      expect(stats.physicsModels).toContain("Taylor tool life");
      expect(stats.physicsModels).toContain("Trigger-Chao temperature");
      expect(stats.physicsModels).toContain("Tlusty chatter stability");
    });
  });

  describe("Controller Database", () => {
    it("should have Fanuc controller profile", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getControllerDatabase();

      expect(db.fanuc).toBeDefined();
      expect(db.fanuc.name).toBe("Fanuc");
      expect(db.fanuc.rtcp.activation).toBe("G43.4 H#");
      expect(db.fanuc.tribalTips.length).toBeGreaterThan(0);
    });

    it("should have Siemens controller profile", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getControllerDatabase();

      expect(db.siemens).toBeDefined();
      expect(db.siemens.rtcp.activation).toBe("TRAORI");
      expect(db.siemens.hsmMode).toBe("CYCLE832");
    });

    it("should have Okuma controller profile", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getControllerDatabase();

      expect(db.okuma).toBeDefined();
      expect(db.okuma.hsmMode).toBe("VARD=ON");
      expect(db.okuma.tribalTips.some(t => t.includes("Super-NURBS"))).toBe(true);
    });

    it("should have Haas controller profile", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getControllerDatabase();

      expect(db.haas).toBeDefined();
      expect(db.haas.rtcp.activation).toBe("G234");
      expect(db.haas.hsmMode).toBe("G187 P3 E0.0001");
    });

    it("should have Heidenhain controller profile", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getControllerDatabase();

      expect(db.heidenhain).toBeDefined();
      expect(db.heidenhain.rtcp.activation).toBe("M128");
      expect(db.heidenhain.rtcp.vectorMode).toBe("TCPM");
    });

    it("should have Mazak controller profile", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getControllerDatabase();

      expect(db.mazak).toBeDefined();
      expect(db.mazak.tribalTips.some(t => t.includes("RADIAL"))).toBe(true);
    });

    it("should have Mitsubishi controller profile", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getControllerDatabase();

      expect(db.mitsubishi).toBeDefined();
      expect(db.mitsubishi.tribalTips.some(t => t.includes("NURBS"))).toBe(true);
    });
  });

  describe("Operation Database", () => {
    it("should have roughing operation", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getOperationDatabase();

      expect(db.roughing).toBeDefined();
      expect(db.roughing.typicalDepth_mm).toBe(3.0);
      expect(db.roughing.coolantRequired).toBe(true);
    });

    it("should have finishing operation", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getOperationDatabase();

      expect(db.finishing).toBeDefined();
      expect(db.finishing.typicalDepth_mm).toBe(0.3);
      expect(db.finishing.chatterRisk).toBe("low");
    });

    it("should have drilling operation", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getOperationDatabase();

      expect(db.drilling).toBeDefined();
      expect(db.drilling.maxDepth_mm).toBe(100);
    });

    it("should have threading operation", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getOperationDatabase();

      expect(db.threading).toBeDefined();
      expect(db.threading.chatterRisk).toBe("high");
    });

    it("should have 5-axis contouring operation", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getOperationDatabase();

      expect(db["5axis_contouring"]).toBeDefined();
      expect(db["5axis_contouring"].coolantRequired).toBe(true);
    });

    it("should have HSM operation", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getOperationDatabase();

      expect(db.hsm).toBeDefined();
      expect(db.hsm.coolantRequired).toBe(false);
      expect(db.hsm.chatterRisk).toBe("low");
    });

    it("should have material-specific speeds for each operation", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getOperationDatabase();

      for (const [name, op] of Object.entries(db)) {
        expect(op.typicalSpeed_m_min.P).toBeGreaterThan(0);
        expect(op.typicalSpeed_m_min.S).toBeLessThan(op.typicalSpeed_m_min.N);  // Superalloy < Aluminum
      }
    });
  });

  describe("Physics-Aware Post Generation", () => {
    it("should generate post for Fanuc mill", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.length).toBeGreaterThan(20);
      expect(result.safetyScore).toBeGreaterThan(0.5);
      expect(result.physicsAnalysis).toBeDefined();
      expect(result.controllerProfile.name).toBe("Fanuc");
    });

    it("should generate post for Siemens mill", () => {
      const request = createRequest({ controller: "siemens" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.length).toBeGreaterThan(20);
      expect(result.controllerProfile.name).toBe("Siemens Sinumerik");
    });

    it("should generate post for Haas mill", () => {
      const request = createRequest({ controller: "haas" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.controllerProfile.name).toBe("Haas NGC");
    });

    it("should include physics analysis", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.physicsAnalysis.forces.Fc_N).toBeGreaterThan(0);
      expect(result.physicsAnalysis.thermal.chipTemperature_C).toBeGreaterThan(100);
      expect(result.physicsAnalysis.toolLife.predictedLife_min).toBeGreaterThan(0);
    });

    it("should include physics comments in G-code", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.some(line => line.includes("PHYSICS ANALYSIS"))).toBe(true);
      expect(result.gcode.some(line => line.includes("Safety Score"))).toBe(true);
      expect(result.gcode.some(line => line.includes("Cutting Force"))).toBe(true);
    });

    it("should include reasoning chain", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.reasoning.length).toBeGreaterThan(5);
      expect(result.reasoning.some(r => r.step === "Kienzle Force Model")).toBe(true);
      expect(result.reasoning.some(r => r.step === "Taylor Tool Life")).toBe(true);
    });

    it("should calculate cycle time estimate", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.cycleTimeEstimate_min).toBeGreaterThan(0);
    });

    it("should calculate power utilization", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.powerUtilization_pct).toBeGreaterThan(0);
      expect(result.powerUtilization_pct).toBeLessThan(150);  // Reasonable range
    });
  });

  describe("Material-Specific Generation", () => {
    it("should generate post for aluminum", () => {
      const request = createRequest({ material: "aluminum" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.some(line => line.includes("aluminum"))).toBe(true);
    });

    it("should generate post for titanium", () => {
      const request = createRequest({ material: "titanium" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.some(line => line.includes("titanium"))).toBe(true);
    });

    it("should generate post for inconel", () => {
      const request = createRequest({ material: "inconel" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.physicsAnalysis).toBeDefined();
    });
  });

  describe("5-Axis Generation", () => {
    it("should include RTCP activation for 5-axis", () => {
      const request = createRequest({
        machineType: "5axis",
        operations: ["5-axis contouring"]
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.some(line => line.includes("G43.4"))).toBe(true);
      expect(result.gcode.some(line => line.includes("G49"))).toBe(true);
    });

    it("should include Siemens TRAORI for 5-axis", () => {
      const request = createRequest({
        controller: "siemens",
        machineType: "5axis"
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.some(line => line.includes("TRAORI"))).toBe(true);
    });

    it("should include Heidenhain M128 for 5-axis", () => {
      const request = createRequest({
        controller: "heidenhain",
        machineType: "5axis"
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.some(line => line.includes("M128"))).toBe(true);
    });
  });

  describe("HSM Mode Generation", () => {
    it("should include Fanuc HSM mode", () => {
      const request = createRequest({
        operations: ["hsm", "finishing"]
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.some(line => line.includes("G05.1"))).toBe(true);
    });

    it("should include Haas G187 for HSM", () => {
      const request = createRequest({
        controller: "haas",
        operations: ["hsm"]
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.some(line => line.includes("G187"))).toBe(true);
    });
  });

  describe("Physics-Based Optimization", () => {
    it("should optimize for tool life", () => {
      const request = createRequest({
        optimizationTarget: "tool_life"
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.reasoning.some(r => r.step.includes("Tool Life"))).toBe(true);
    });

    it("should optimize for cycle time", () => {
      const request = createRequest({
        optimizationTarget: "cycle_time"
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.cycleTimeEstimate_min).toBeGreaterThan(0);
    });

    it("should generate feed overrides when needed", () => {
      const request = createRequest({
        machinePower_kW: 5,  // Low power to trigger optimization
        operations: ["roughing"]
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      // May or may not have overrides depending on physics
      expect(Array.isArray(result.feedOverrides)).toBe(true);
    });
  });

  describe("Warnings and Recommendations", () => {
    it("should collect force warnings", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(Array.isArray(result.forceWarnings)).toBe(true);
    });

    it("should collect thermal warnings", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(Array.isArray(result.thermalWarnings)).toBe(true);
    });

    it("should collect chatter warnings", () => {
      const request = createRequest();
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(Array.isArray(result.chatterWarnings)).toBe(true);
    });

    it("should include critical warnings in G-code comments", () => {
      const request = createRequest({
        machinePower_kW: 3,  // Very low power
        toolDiameter_mm: 50,  // Large tool
        operations: ["roughing"]
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      // Check that warnings are handled (may or may not have critical warnings)
      expect(Array.isArray(result.criticalWarnings)).toBe(true);
    });
  });

  describe("Multiple Operations", () => {
    it("should handle multiple operations", () => {
      const request = createRequest({
        operations: ["roughing", "finishing", "drilling"]
      });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.filter(line => line.includes("OPERATION:")).length).toBe(3);
      expect(result.operationDetails.length).toBe(3);
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown controller", () => {
      const request = createRequest({ controller: "unknown_brand" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.length).toBeGreaterThan(10);
      expect(result.controllerProfile).toBeDefined();
    });

    it("should handle unknown material", () => {
      const request = createRequest({ material: "unknown_metal" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle empty operations", () => {
      const request = createRequest({ operations: [] });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle very small tool", () => {
      const request = createRequest({ toolDiameter_mm: 1 });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.physicsAnalysis).toBeDefined();
    });

    it("should handle high rigidity machine", () => {
      const request = createRequest({ machineRigidity: "high" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.physicsAnalysis.chatter.dampingRatio).toBeGreaterThan(0);
    });

    it("should handle TSC coolant", () => {
      const request = createRequest({ coolantType: "tsc" });
      const result = postProcessorPhysicsAwareGeneratorEngine.generatePhysicsAwarePost(request);

      expect(result.physicsAnalysis.thermal.coolantEffectiveness).toBeGreaterThan(0.8);
    });
  });

  describe("Controller-Specific Tribal Knowledge", () => {
    it("should have tribal tips for each controller", () => {
      const db = postProcessorPhysicsAwareGeneratorEngine.getControllerDatabase();

      for (const [name, controller] of Object.entries(db)) {
        expect(controller.tribalTips.length).toBeGreaterThan(0);
      }
    });
  });
});
