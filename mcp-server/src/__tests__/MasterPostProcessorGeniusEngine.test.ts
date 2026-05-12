/**
 * MasterPostProcessorGeniusEngine Tests
 * ======================================
 * Tests for the 50-year master-level post processor genius engine.
 */

import { describe, it, expect } from "vitest";
import {
  masterPostProcessorGeniusEngine,
  CUTTING_MECHANICS,
  MACHINE_EXPERTISE,
  JM_DIE_PATTERNS,
  PRINT_TO_PROGRAM_PIPELINE
} from "../engines/MasterPostProcessorGeniusEngine.js";

describe("MasterPostProcessorGeniusEngine", () => {
  describe("Statistics", () => {
    it("should return comprehensive statistics", () => {
      const stats = masterPostProcessorGeniusEngine.getStatistics();

      expect(stats.experience).toBe(50);
      expect(stats.education).toBe("PhD Manufacturing Science");
      expect(stats.certifications).toHaveLength(4);
      expect(stats.knowledgeSources.length).toBeGreaterThan(3);
      expect(stats.capabilities.length).toBeGreaterThan(5);
      expect(stats.jmDiePrograms).toBe(24545);
    });

    it("should have controller expertise", () => {
      const stats = masterPostProcessorGeniusEngine.getStatistics();

      expect(stats.controllerExpertise).toContain("okuma_lathe");
      expect(stats.controllerExpertise).toContain("fanuc_lathe");
      expect(stats.controllerExpertise).toContain("haas_mill");
      expect(stats.controllerExpertise).toContain("siemens_mill");
      expect(stats.controllerExpertise).toContain("mazak_lathe");
    });
  });

  describe("Cutting Mechanics Knowledge", () => {
    it("should have Kienzle model", () => {
      const mechanics = masterPostProcessorGeniusEngine.getCuttingMechanics();

      expect(mechanics.kienzleModel.formula).toBe("Fc = kc1.1 × b × h^(1-mc)");
      expect(mechanics.kienzleModel.parameters["kc1.1"]).toBeDefined();
      expect(mechanics.kienzleModel.applications.length).toBeGreaterThan(0);
    });

    it("should have Taylor tool life model", () => {
      const mechanics = masterPostProcessorGeniusEngine.getCuttingMechanics();

      expect(mechanics.taylorToolLife.formula).toBe("VcT^n = C");
      expect(mechanics.taylorToolLife.parameters["n"]).toBeDefined();
      expect(mechanics.taylorToolLife.parameters["C"]).toBeDefined();
    });

    it("should have chip formation knowledge", () => {
      const mechanics = masterPostProcessorGeniusEngine.getCuttingMechanics();

      expect(mechanics.chipFormation.types.continuous).toBeDefined();
      expect(mechanics.chipFormation.types.discontinuous).toBeDefined();
      expect(mechanics.chipFormation.types.builtUpEdge).toBeDefined();
      expect(mechanics.chipFormation.controlStrategies.length).toBeGreaterThan(0);
    });

    it("should have thermal modeling knowledge", () => {
      const mechanics = masterPostProcessorGeniusEngine.getCuttingMechanics();

      expect(mechanics.thermalModeling.heatPartition).toContain("Chip:");
      expect(mechanics.thermalModeling.tribalTips.length).toBeGreaterThan(0);
    });
  });

  describe("Machine Expertise Database", () => {
    it("should have Okuma expertise", () => {
      const expertise = masterPostProcessorGeniusEngine.getMachineExpertiseDatabase();

      expect(expertise.okuma_lathe).toBeDefined();
      expect(expertise.okuma_lathe.controller).toBe("OSP-P300L");
      expect(expertise.okuma_lathe.quirks.length).toBeGreaterThan(0);
      expect(expertise.okuma_lathe.tribalKnowledge.length).toBeGreaterThan(0);
    });

    it("should have Fanuc expertise", () => {
      const expertise = masterPostProcessorGeniusEngine.getMachineExpertiseDatabase();

      expect(expertise.fanuc_lathe).toBeDefined();
      expect(expertise.fanuc_lathe.controller).toContain("Fanuc");
      expect(expertise.fanuc_lathe.postProcessorNotes.length).toBeGreaterThan(0);
    });

    it("should have Haas expertise", () => {
      const expertise = masterPostProcessorGeniusEngine.getMachineExpertiseDatabase();

      expect(expertise.haas_mill).toBeDefined();
      expect(expertise.haas_mill.controller).toBe("Haas NGC");
      expect(expertise.haas_mill.optimalSettings.roughingG187).toBe("P1");
      expect(expertise.haas_mill.optimalSettings.finishingG187).toBe("P3 E0.0002");
    });

    it("should have Siemens expertise", () => {
      const expertise = masterPostProcessorGeniusEngine.getMachineExpertiseDatabase();

      expect(expertise.siemens_mill).toBeDefined();
      expect(expertise.siemens_mill.controller).toBe("Sinumerik 840D sl");
      expect(expertise.siemens_mill.postProcessorNotes.some(n => n.includes("CYCLE832"))).toBe(true);
    });

    it("should have Mazak expertise", () => {
      const expertise = masterPostProcessorGeniusEngine.getMachineExpertiseDatabase();

      expect(expertise.mazak_lathe).toBeDefined();
      expect(expertise.mazak_lathe.controller).toContain("MAZATROL");
      expect(expertise.mazak_lathe.quirks.some(q => q.includes("RADIAL"))).toBe(true);
    });
  });

  describe("JM Die Patterns", () => {
    it("should have OD turning pattern", () => {
      const patterns = masterPostProcessorGeniusEngine.getJMDiePatterns();

      expect(patterns.okuma_od_turning).toBeDefined();
      expect(patterns.okuma_od_turning.operation).toBe("OD Roughing/Finishing");
      expect(patterns.okuma_od_turning.typicalStructure.length).toBeGreaterThan(5);
      expect(patterns.okuma_od_turning.commonGCodes).toContain("G85");
      expect(patterns.okuma_od_turning.commonGCodes).toContain("G87");
    });

    it("should have ID boring pattern", () => {
      const patterns = masterPostProcessorGeniusEngine.getJMDiePatterns();

      expect(patterns.okuma_id_boring).toBeDefined();
      expect(patterns.okuma_id_boring.operation).toBe("ID Boring");
      expect(patterns.okuma_id_boring.tribalTips.some(t => t.includes("G97"))).toBe(true);
    });

    it("should have drilling pattern", () => {
      const patterns = masterPostProcessorGeniusEngine.getJMDiePatterns();

      expect(patterns.okuma_drilling).toBeDefined();
      expect(patterns.okuma_drilling.commonGCodes).toContain("G83");
    });

    it("should have threading pattern", () => {
      const patterns = masterPostProcessorGeniusEngine.getJMDiePatterns();

      expect(patterns.okuma_threading).toBeDefined();
      expect(patterns.okuma_threading.commonGCodes).toContain("G76");
    });
  });

  describe("Print-to-Program Pipeline", () => {
    it("should have 6 pipeline stages", () => {
      const pipeline = masterPostProcessorGeniusEngine.getPrintToProgramPipeline();

      expect(pipeline).toHaveLength(6);
    });

    it("should have Print Analysis stage", () => {
      const pipeline = masterPostProcessorGeniusEngine.getPrintToProgramPipeline();

      expect(pipeline[0].name).toBe("Print Analysis");
      expect(pipeline[0].inputs).toContain("Engineering drawing");
      expect(pipeline[0].outputs).toContain("Feature list");
    });

    it("should have Process Planning stage", () => {
      const pipeline = masterPostProcessorGeniusEngine.getPrintToProgramPipeline();

      expect(pipeline[1].name).toBe("Process Planning");
      expect(pipeline[1].expertDecisions.length).toBeGreaterThan(0);
    });

    it("should have Post Processing stage", () => {
      const pipeline = masterPostProcessorGeniusEngine.getPrintToProgramPipeline();

      const postStage = pipeline.find(s => s.name === "Post Processing");
      expect(postStage).toBeDefined();
      expect(postStage?.outputs).toContain("G-code program");
    });

    it("should have Verification stage", () => {
      const pipeline = masterPostProcessorGeniusEngine.getPrintToProgramPipeline();

      const verifyStage = pipeline.find(s => s.name === "Verification");
      expect(verifyStage).toBeDefined();
      expect(verifyStage?.outputs).toContain("Collision report");
    });

    it("should have Optimization stage", () => {
      const pipeline = masterPostProcessorGeniusEngine.getPrintToProgramPipeline();

      const optStage = pipeline.find(s => s.name === "Optimization");
      expect(optStage).toBeDefined();
      expect(optStage?.expertDecisions.some(d => d.includes("HSM"))).toBe(true);
    });
  });

  describe("Master Post Generation", () => {
    it("should generate post for Okuma lathe", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "okuma",
        machineType: "lathe",
        operations: ["OD Roughing", "OD Finishing"],
        material: "4140 Steel"
      });

      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0.8);
      expect(result.tribalKnowledge.length).toBeGreaterThan(0);
    });

    it("should generate post for Fanuc lathe", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "fanuc",
        machineType: "lathe",
        operations: ["Drilling"],
        material: "Aluminum 6061"
      });

      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.recommendations.length).toBeGreaterThan(0);
    });

    it("should generate post for Haas mill", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "haas",
        machineType: "mill",
        operations: ["Roughing", "Finishing"],
        material: "Steel"
      });

      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.recommendations.some(r => r.includes("G187"))).toBe(true);
    });

    it("should include safety checks", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "okuma",
        machineType: "lathe",
        operations: ["Roughing"]
      });

      expect(result.safetyChecks.length).toBeGreaterThan(0);
      expect(result.safetyChecks.some(c => c.includes("PASS") || c.includes("FAIL"))).toBe(true);
    });

    it("should estimate cycle time", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "fanuc",
        machineType: "lathe",
        operations: ["Roughing", "Finishing", "Drilling"]
      });

      expect(result.cycleTimeEstimate).toBeGreaterThan(0);
    });

    it("should include expert reasoning", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "siemens",
        machineType: "mill",
        operations: ["Finishing"]
      });

      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.reasoning[0].decision).toBeDefined();
      expect(result.reasoning[0].rationale).toBeDefined();
      expect(result.reasoning[0].confidenceLevel).toBeGreaterThan(0);
    });

    it("should provide material-specific recommendations for titanium", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "haas",
        machineType: "mill",
        operations: ["Roughing"],
        material: "Titanium Ti-6Al-4V"
      });

      expect(result.recommendations.some(r =>
        r.includes("speed") || r.includes("TSC") || r.includes("coolant")
      )).toBe(true);
    });

    it("should provide material-specific recommendations for aluminum", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "haas",
        machineType: "mill",
        operations: ["Finishing"],
        material: "Aluminum 6061-T6"
      });

      expect(result.recommendations.some(r =>
        r.includes("speed") || r.includes("flute") || r.includes("air")
      )).toBe(true);
    });
  });

  describe("Expert Advice", () => {
    it("should provide chatter advice", () => {
      const advice = masterPostProcessorGeniusEngine.getExpertAdvice("chatter vibration");

      expect(advice.length).toBeGreaterThan(3);
      expect(advice.some(a => a.includes("speed"))).toBe(true);
      expect(advice.some(a => a.includes("feed"))).toBe(true);
    });

    it("should provide surface finish advice", () => {
      const advice = masterPostProcessorGeniusEngine.getExpertAdvice("poor surface finish");

      expect(advice.length).toBeGreaterThan(3);
      expect(advice.some(a => a.includes("speed") || a.includes("feed"))).toBe(true);
    });

    it("should provide tool life advice", () => {
      const advice = masterPostProcessorGeniusEngine.getExpertAdvice("tool life too short");

      expect(advice.length).toBeGreaterThan(3);
      expect(advice.some(a => a.includes("speed"))).toBe(true);
    });

    it("should provide accuracy advice", () => {
      const advice = masterPostProcessorGeniusEngine.getExpertAdvice("tolerance accuracy");

      expect(advice.length).toBeGreaterThan(3);
      expect(advice.some(a => a.includes("thermal") || a.includes("warmup"))).toBe(true);
    });
  });

  describe("Knowledge Constants", () => {
    it("should export CUTTING_MECHANICS", () => {
      expect(CUTTING_MECHANICS.kienzleModel).toBeDefined();
      expect(CUTTING_MECHANICS.taylorToolLife).toBeDefined();
    });

    it("should export MACHINE_EXPERTISE", () => {
      expect(Object.keys(MACHINE_EXPERTISE).length).toBe(5);
    });

    it("should export JM_DIE_PATTERNS", () => {
      expect(Object.keys(JM_DIE_PATTERNS).length).toBe(4);
    });

    it("should export PRINT_TO_PROGRAM_PIPELINE", () => {
      expect(PRINT_TO_PROGRAM_PIPELINE).toHaveLength(6);
    });
  });

  describe("Edge Cases", () => {
    it("should handle unknown controller", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "unknown_brand",
        machineType: "lathe",
        operations: ["Roughing"]
      });

      expect(result.gcode.length).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeGreaterThan(0.5);
    });

    it("should handle empty operations", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "fanuc",
        machineType: "lathe",
        operations: []
      });

      expect(result.gcode.length).toBeGreaterThan(0);  // Should still have header/footer
    });

    it("should handle no material specified", () => {
      const result = masterPostProcessorGeniusEngine.generateMasterPost({
        controller: "okuma",
        machineType: "lathe",
        operations: ["Roughing"]
      });

      expect(result.gcode.some(line => line.includes("UNKNOWN"))).toBe(true);
    });
  });
});
