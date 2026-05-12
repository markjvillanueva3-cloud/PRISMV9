/**
 * PostProcessorKnowledgeGraphEngine Tests
 * ========================================
 * Tests for the knowledge graph reasoning engine.
 */

import { describe, it, expect } from "vitest";
import {
  postProcessorKnowledgeGraphEngine,
  RTCP_CONFIGURATIONS
} from "../engines/PostProcessorKnowledgeGraphEngine.js";

describe("PostProcessorKnowledgeGraphEngine", () => {
  describe("Statistics", () => {
    it("should return comprehensive statistics", () => {
      const stats = postProcessorKnowledgeGraphEngine.getStatistics();

      expect(stats.entityCount).toBeGreaterThan(15);
      expect(stats.relationshipCount).toBeGreaterThan(10);
      expect(stats.rtcpControllers).toHaveLength(6);
      expect(stats.capabilities.length).toBeGreaterThan(5);
    });

    it("should have all entity types", () => {
      const stats = postProcessorKnowledgeGraphEngine.getStatistics();

      expect(stats.entityTypes.CONTROLLER).toBeGreaterThan(0);
      expect(stats.entityTypes.OPERATION).toBeGreaterThan(0);
      expect(stats.entityTypes.GCODE).toBeGreaterThan(0);
      expect(stats.entityTypes.FAILURE_MODE).toBeGreaterThan(0);
      expect(stats.entityTypes.SOLUTION).toBeGreaterThan(0);
    });

    it("should have all relationship types", () => {
      const stats = postProcessorKnowledgeGraphEngine.getStatistics();

      expect(stats.relationshipTypes.GENERATES).toBeGreaterThan(0);
      expect(stats.relationshipTypes.REQUIRES).toBeGreaterThan(0);
      expect(stats.relationshipTypes.RESOLVES).toBeGreaterThan(0);
    });
  });

  describe("RTCP Configurations", () => {
    it("should have Fanuc RTCP config", () => {
      const config = postProcessorKnowledgeGraphEngine.getRTCPConfiguration("fanuc");

      expect(config).toBeDefined();
      expect(config?.activationCode).toBe("G43.4 H#");
      expect(config?.deactivationCode).toBe("G49");
      expect(config?.vectorMode).toBe("G43.5 H# Q#");
    });

    it("should have Siemens RTCP config", () => {
      const config = postProcessorKnowledgeGraphEngine.getRTCPConfiguration("siemens");

      expect(config).toBeDefined();
      expect(config?.activationCode).toBe("TRAORI");
      expect(config?.deactivationCode).toBe("TRAFOOF");
    });

    it("should have Heidenhain RTCP config", () => {
      const config = postProcessorKnowledgeGraphEngine.getRTCPConfiguration("heidenhain");

      expect(config).toBeDefined();
      expect(config?.activationCode).toBe("M128");
      expect(config?.deactivationCode).toBe("M129");
    });

    it("should have Haas RTCP config", () => {
      const config = postProcessorKnowledgeGraphEngine.getRTCPConfiguration("haas");

      expect(config).toBeDefined();
      expect(config?.activationCode).toBe("G234 (TCPC)");
    });

    it("should have Mazak RTCP config", () => {
      const config = postProcessorKnowledgeGraphEngine.getRTCPConfiguration("mazak");

      expect(config).toBeDefined();
      expect(config?.tribalKnowledge.length).toBeGreaterThan(0);
    });

    it("should have Okuma RTCP config", () => {
      const config = postProcessorKnowledgeGraphEngine.getRTCPConfiguration("okuma");

      expect(config).toBeDefined();
      expect(config?.tribalKnowledge.some(t => t.includes("Super-NURBS"))).toBe(true);
    });

    it("should return null for unknown controller", () => {
      const config = postProcessorKnowledgeGraphEngine.getRTCPConfiguration("unknown_brand");
      expect(config).toBeNull();
    });

    it("should have tribal knowledge for each config", () => {
      const configs = postProcessorKnowledgeGraphEngine.getAllRTCPConfigurations();

      for (const [name, config] of Object.entries(configs)) {
        expect(config.tribalKnowledge.length).toBeGreaterThan(0);
        expect(config.postProcessorRequirements.length).toBeGreaterThan(0);
      }
    });
  });

  describe("Knowledge Graph Queries", () => {
    it("should find related entities for controller", () => {
      const related = postProcessorKnowledgeGraphEngine.queryRelatedEntities("controller_fanuc");

      expect(related.length).toBeGreaterThan(0);
    });

    it("should find solutions for chatter failure", () => {
      const solutions = postProcessorKnowledgeGraphEngine.findSolutions("fail_chatter");

      expect(solutions.length).toBeGreaterThan(0);
      expect(solutions[0].confidence).toBeGreaterThan(0.5);
      expect(solutions.some(s => s.solution.name.includes("Speed") || s.solution.name.includes("Feed"))).toBe(true);
    });

    it("should find solutions for surface finish failure", () => {
      const solutions = postProcessorKnowledgeGraphEngine.findSolutions("fail_surface");

      expect(solutions.length).toBeGreaterThan(0);
    });

    it("should find solutions for collision failure", () => {
      const solutions = postProcessorKnowledgeGraphEngine.findSolutions("fail_collision");

      expect(solutions.length).toBeGreaterThan(0);
      expect(solutions[0].solution.name).toContain("Simulation");
    });
  });

  describe("Operation Sequencing", () => {
    it("should sequence operations correctly", () => {
      const sequence = postProcessorKnowledgeGraphEngine.getOptimalOperationSequence(
        ["Finishing", "Roughing", "Drilling"],
        { tolerance: 0.001, surfaceFinish: 32, cycleTime: 100 }
      );

      expect(sequence[0].operation).toBe("Roughing");
      expect(sequence[1].operation).toBe("Finishing");
      expect(sequence[2].operation).toBe("Drilling");
    });

    it("should include reasoning for each operation", () => {
      const sequence = postProcessorKnowledgeGraphEngine.getOptimalOperationSequence(
        ["Roughing", "Semi-Finishing", "Finishing"],
        { tolerance: 0.001, surfaceFinish: 16, cycleTime: 100 }
      );

      for (const op of sequence) {
        expect(op.reasoning).toBeDefined();
        expect(op.reasoning.length).toBeGreaterThan(0);
      }
    });

    it("should prioritize 5-axis last", () => {
      const sequence = postProcessorKnowledgeGraphEngine.getOptimalOperationSequence(
        ["5-Axis Contouring", "Roughing", "Drilling"],
        { tolerance: 0.001, surfaceFinish: 32, cycleTime: 100 }
      );

      expect(sequence[sequence.length - 1].operation).toBe("5-Axis Contouring");
    });
  });

  describe("G-Code Generation", () => {
    it("should generate G-code for basic operations", () => {
      const result = postProcessorKnowledgeGraphEngine.generateOptimizedGCode({
        controller: "fanuc",
        operations: ["Roughing", "Finishing"]
      });

      expect(result.gcode.length).toBeGreaterThan(10);
      expect(result.reasoning.length).toBeGreaterThan(0);
      expect(result.gcode.some(line => line.includes("G90"))).toBe(true);
      expect(result.gcode.some(line => line.includes("M30"))).toBe(true);
    });

    it("should generate G-code with RTCP for 5-axis", () => {
      const result = postProcessorKnowledgeGraphEngine.generateOptimizedGCode({
        controller: "fanuc",
        operations: ["5-Axis Contouring"],
        fiveAxis: true
      });

      expect(result.rtcpConfig).toBeDefined();
      expect(result.gcode.some(line => line.includes("G43.4"))).toBe(true);
      expect(result.gcode.some(line => line.includes("G49"))).toBe(true);
    });

    it("should generate G-code with Siemens TRAORI for 5-axis", () => {
      const result = postProcessorKnowledgeGraphEngine.generateOptimizedGCode({
        controller: "siemens",
        operations: ["5-Axis Contouring"],
        fiveAxis: true
      });

      expect(result.rtcpConfig?.activationCode).toBe("TRAORI");
      expect(result.gcode.some(line => line.includes("TRAORI"))).toBe(true);
    });

    it("should generate G-code with Heidenhain M128 for 5-axis", () => {
      const result = postProcessorKnowledgeGraphEngine.generateOptimizedGCode({
        controller: "heidenhain",
        operations: ["5-Axis Contouring"],
        fiveAxis: true
      });

      expect(result.rtcpConfig?.activationCode).toBe("M128");
      expect(result.gcode.some(line => line.includes("M128"))).toBe(true);
    });

    it("should warn when 5-axis requested but no RTCP config", () => {
      const result = postProcessorKnowledgeGraphEngine.generateOptimizedGCode({
        controller: "unknown_controller",
        operations: ["5-Axis Contouring"],
        fiveAxis: true
      });

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some(w => w.includes("no RTCP"))).toBe(true);
    });

    it("should include material in header", () => {
      const result = postProcessorKnowledgeGraphEngine.generateOptimizedGCode({
        controller: "haas",
        operations: ["Roughing"],
        material: "Aluminum 6061"
      });

      expect(result.gcode.some(line => line.includes("Aluminum 6061"))).toBe(true);
    });
  });

  describe("Fault Diagnosis", () => {
    it("should diagnose chatter from vibration symptom", () => {
      const diagnoses = postProcessorKnowledgeGraphEngine.diagnoseFault(["vibration during cutting"]);

      expect(diagnoses.length).toBeGreaterThan(0);
      expect(diagnoses.some(d => d.failureMode === "Chatter")).toBe(true);
    });

    it("should diagnose from noise symptom", () => {
      const diagnoses = postProcessorKnowledgeGraphEngine.diagnoseFault(["excessive noise"]);

      expect(diagnoses.length).toBeGreaterThan(0);
      expect(diagnoses.some(d => d.failureMode === "Chatter")).toBe(true);
    });

    it("should provide solutions for each diagnosis", () => {
      const diagnoses = postProcessorKnowledgeGraphEngine.diagnoseFault(["chatter", "poor surface finish"]);

      for (const diagnosis of diagnoses) {
        expect(diagnosis.solutions.length).toBeGreaterThan(0);
        expect(diagnosis.reasoning).toBeDefined();
      }
    });

    it("should rank solutions by confidence", () => {
      const diagnoses = postProcessorKnowledgeGraphEngine.diagnoseFault(["collision risk"]);

      if (diagnoses.length > 0 && diagnoses[0].solutions.length > 1) {
        expect(diagnoses[0].solutions[0].confidence).toBeGreaterThanOrEqual(
          diagnoses[0].solutions[1].confidence
        );
      }
    });
  });

  describe("RTCP Constants", () => {
    it("should export RTCP_CONFIGURATIONS", () => {
      expect(RTCP_CONFIGURATIONS).toBeDefined();
      expect(Object.keys(RTCP_CONFIGURATIONS)).toHaveLength(6);
    });

    it("should have complete configuration for each controller", () => {
      for (const [name, config] of Object.entries(RTCP_CONFIGURATIONS)) {
        expect(config.controller).toBeDefined();
        expect(config.activationCode).toBeDefined();
        expect(config.deactivationCode).toBeDefined();
        expect(config.pivotPointMethod).toBeDefined();
        expect(config.compensationAxes).toContain("X");
        expect(config.compensationAxes).toContain("Y");
        expect(config.compensationAxes).toContain("Z");
      }
    });
  });

  describe("Edge Cases", () => {
    it("should handle empty operations list", () => {
      const result = postProcessorKnowledgeGraphEngine.generateOptimizedGCode({
        controller: "fanuc",
        operations: []
      });

      expect(result.gcode.length).toBeGreaterThan(0);  // Should have header/footer
    });

    it("should handle unknown operations gracefully", () => {
      const sequence = postProcessorKnowledgeGraphEngine.getOptimalOperationSequence(
        ["Unknown Operation", "Roughing"],
        { tolerance: 0.001, surfaceFinish: 32, cycleTime: 100 }
      );

      expect(sequence).toHaveLength(2);
      expect(sequence[0].operation).toBe("Roughing");  // Known operation first
    });

    it("should handle empty symptoms list", () => {
      const diagnoses = postProcessorKnowledgeGraphEngine.diagnoseFault([]);
      expect(diagnoses).toHaveLength(0);
    });
  });
});
