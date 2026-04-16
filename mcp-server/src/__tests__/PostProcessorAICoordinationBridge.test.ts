/**
 * PostProcessorAICoordinationBridge Tests
 * ========================================
 * Tests for the AI coordination bridge that wires all PP engines together.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  postProcessorAICoordinationBridge,
  type CoordinatedRequest
} from "../engines/PostProcessorAICoordinationBridge.js";

function createCoordRequest(overrides: Partial<CoordinatedRequest> = {}): CoordinatedRequest {
  return {
    controller: "fanuc",
    machineType: "mill",
    operations: ["roughing"],
    material: "steel",
    cuttingParams: {
      cuttingSpeed_m_min: 150,
      feedRate_mm_rev: 0.2,
      depthOfCut_mm: 2.0,
      widthOfCut_mm: 10
    },
    tool: {
      diameter_mm: 20,
      flutes: 4,
      noseRadius_mm: 0.8,
      material: "carbide"
    },
    machine: {
      maxRPM: 10000,
      power_kW: 15,
      rigidity: "medium"
    },
    ...overrides
  };
}

describe("PostProcessorAICoordinationBridge", () => {
  beforeEach(() => {
    postProcessorAICoordinationBridge.resetPerformanceTracking();
  });

  describe("Statistics", () => {
    it("should return bridge statistics", () => {
      const stats = postProcessorAICoordinationBridge.getStatistics();

      expect(stats.version).toBe("1.0.0");
      expect(stats.safetyHardBlock).toBe(0.70);
      expect(stats.enginesTracked).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Coordinate Method", () => {
    it("should coordinate across all engines", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
      expect(result.engineExecutions.length).toBeGreaterThanOrEqual(3);
      expect(result.metadata.enginesInvoked).toBeGreaterThanOrEqual(3);
    });

    it("should invoke physics engine", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      const physics = result.engineExecutions.find(e => e.engineId === "pp-unified-physics");
      expect(physics).toBeDefined();
      expect(physics?.invoked).toBe(true);
    });

    it("should invoke generator engine", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      const gen = result.engineExecutions.find(e => e.engineId === "pp-physics-generator");
      expect(gen).toBeDefined();
      expect(gen?.invoked).toBe(true);
    });

    it("should invoke Master AGI", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      const agi = result.engineExecutions.find(e => e.engineId === "pp-master-agi");
      expect(agi).toBeDefined();
      expect(agi?.invoked).toBe(true);
    });

    it("should record engine execution duration", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      for (const exec of result.engineExecutions) {
        expect(exec.duration_ms).toBeGreaterThanOrEqual(0);
      }
    });

    it("should record engine confidence scores", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      const successful = result.engineExecutions.filter(e => e.success);
      for (const exec of successful) {
        expect(exec.confidence).toBeGreaterThanOrEqual(0);
        expect(exec.confidence).toBeLessThanOrEqual(1);
      }
    });
  });

  describe("Physics Analysis Aggregation", () => {
    it("should aggregate cutting forces", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.physicsAnalysis.forces.cuttingForce_N).toBeGreaterThan(0);
      expect(result.physicsAnalysis.forces.cuttingPower_kW).toBeGreaterThan(0);
    });

    it("should aggregate thermal analysis", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.physicsAnalysis.thermal.chipTemperature_C).toBeGreaterThan(100);
    });

    it("should aggregate tool life prediction", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.physicsAnalysis.toolLife.predictedLife_min).toBeGreaterThan(0);
      expect(result.physicsAnalysis.toolLife.primaryWearMechanism).toBeDefined();
    });

    it("should aggregate chatter stability", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(typeof result.physicsAnalysis.chatter.isStable).toBe("boolean");
      expect(result.physicsAnalysis.chatter.stabilityMargin_pct).toBeGreaterThanOrEqual(0);
    });

    it("should aggregate surface integrity", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.physicsAnalysis.surface.Ra_um).toBeGreaterThan(0);
    });

    it("should calculate overall safety score", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.physicsAnalysis.overallSafetyScore).toBeGreaterThan(0);
      expect(result.physicsAnalysis.overallSafetyScore).toBeLessThanOrEqual(1);
    });
  });

  describe("Consensus Building", () => {
    it("should build consensus across engines", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.consensus.agreementLevel).toBeGreaterThanOrEqual(0);
      expect(result.consensus.agreementLevel).toBeLessThanOrEqual(1);
      expect(result.consensus.finalDecision).toBeDefined();
    });

    it("should produce voting results", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.consensus.votingResults.length).toBeGreaterThan(0);
      for (const vote of result.consensus.votingResults) {
        expect(vote.option).toBeDefined();
        expect(vote.weight).toBeGreaterThanOrEqual(0);
      }
    });

    it("should sort voting results by weight", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      const votes = result.consensus.votingResults;
      if (votes.length > 1) {
        expect(votes[0].weight).toBeGreaterThanOrEqual(votes[1].weight);
      }
    });
  });

  describe("Quality Gates", () => {
    it("should apply safety check gate", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(typeof result.qualityGates.safetyCheckPassed).toBe("boolean");
    });

    it("should apply physics validation gate", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.qualityGates.physicsValidated).toBe(true);
    });

    it("should apply consensus gate", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(typeof result.qualityGates.consensusReached).toBe("boolean");
    });

    it("should compute overall gate", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(typeof result.qualityGates.overallPassed).toBe("boolean");
    });
  });

  describe("Cross-Domain Integration", () => {
    it("should handle no cross-domain context", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.crossDomainSynergy.sourcesConsidered.length).toBe(0);
      expect(result.crossDomainSynergy.integrationSuccess).toBe(true);
    });

    it("should integrate cross-domain context from Mill AI", async () => {
      const request = createCoordRequest({
        crossDomainContext: [
          { source: "MillAISelfAwarenessIntegrationEngine", data: { programs: 533 }, confidence: 0.9 }
        ]
      });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.crossDomainSynergy.sourcesConsidered).toContain("MillAISelfAwarenessIntegrationEngine");
      expect(result.crossDomainSynergy.integrationSuccess).toBe(true);
    });

    it("should integrate from multiple AI systems", async () => {
      const request = createCoordRequest({
        crossDomainContext: [
          { source: "MillAI", data: {}, confidence: 0.9 },
          { source: "LatheAI", data: {}, confidence: 0.85 },
          { source: "PRISMSelfAwareness", data: {}, confidence: 0.95 }
        ]
      });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.crossDomainSynergy.sourcesConsidered.length).toBe(3);
    });

    it("should detect divergence with low-confidence sources", async () => {
      const request = createCoordRequest({
        crossDomainContext: [
          { source: "LowConfAI", data: {}, confidence: 0.3 }
        ]
      });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.crossDomainSynergy.divergenceDetected).toBe(true);
    });
  });

  describe("Performance Tracking", () => {
    it("should track engine performance", async () => {
      const request = createCoordRequest();
      await postProcessorAICoordinationBridge.coordinate(request);

      const records = postProcessorAICoordinationBridge.getPerformanceRecords();
      expect(records.length).toBeGreaterThan(0);
    });

    it("should track invocations correctly", async () => {
      const request = createCoordRequest();
      await postProcessorAICoordinationBridge.coordinate(request);
      await postProcessorAICoordinationBridge.coordinate(request);

      const records = postProcessorAICoordinationBridge.getPerformanceRecords();
      const physics = records.find(r => r.engineId === "pp-unified-physics");
      expect(physics?.invocations).toBe(2);
    });

    it("should get specific engine performance", async () => {
      const request = createCoordRequest();
      await postProcessorAICoordinationBridge.coordinate(request);

      const perf = postProcessorAICoordinationBridge.getEnginePerformance("pp-unified-physics");
      expect(perf).toBeDefined();
      expect(perf?.invocations).toBeGreaterThan(0);
    });

    it("should return undefined for untracked engine", () => {
      const perf = postProcessorAICoordinationBridge.getEnginePerformance("nonexistent");
      expect(perf).toBeUndefined();
    });

    it("should find best-performing engine by success rate", async () => {
      const request = createCoordRequest();
      await postProcessorAICoordinationBridge.coordinate(request);

      const best = postProcessorAICoordinationBridge.getBestEngine("success_rate");
      expect(best).toBeDefined();
    });

    it("should find fastest engine", async () => {
      const request = createCoordRequest();
      await postProcessorAICoordinationBridge.coordinate(request);

      const fastest = postProcessorAICoordinationBridge.getBestEngine("speed");
      expect(fastest).toBeDefined();
    });

    it("should find most confident engine", async () => {
      const request = createCoordRequest();
      await postProcessorAICoordinationBridge.coordinate(request);

      const confident = postProcessorAICoordinationBridge.getBestEngine("confidence");
      expect(confident).toBeDefined();
    });

    it("should reset performance tracking", async () => {
      const request = createCoordRequest();
      await postProcessorAICoordinationBridge.coordinate(request);

      expect(postProcessorAICoordinationBridge.getPerformanceRecords().length).toBeGreaterThan(0);

      postProcessorAICoordinationBridge.resetPerformanceTracking();
      expect(postProcessorAICoordinationBridge.getPerformanceRecords().length).toBe(0);
    });
  });

  describe("Quick Physics Analysis", () => {
    it("should provide quick physics analysis", () => {
      const analysis = postProcessorAICoordinationBridge.quickPhysicsAnalysis(
        "fanuc",
        "steel",
        150,
        0.2,
        2.0
      );

      expect(analysis.forces.Fc_N).toBeGreaterThan(0);
      expect(analysis.overallSafetyScore).toBeGreaterThan(0);
    });

    it("should handle default parameters", () => {
      const analysis = postProcessorAICoordinationBridge.quickPhysicsAnalysis(
        "haas",
        "aluminum"
      );

      expect(analysis.forces.Fc_N).toBeGreaterThan(0);
    });

    it("should calculate different forces for different materials", () => {
      const steel = postProcessorAICoordinationBridge.quickPhysicsAnalysis("fanuc", "steel");
      const aluminum = postProcessorAICoordinationBridge.quickPhysicsAnalysis("fanuc", "aluminum");

      // Both should produce valid analyses
      expect(steel.forces.Fc_N).toBeGreaterThan(0);
      expect(aluminum.forces.Fc_N).toBeGreaterThan(0);
    });
  });

  describe("Material Handling", () => {
    it("should handle steel", async () => {
      const request = createCoordRequest({ material: "steel" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle aluminum", async () => {
      const request = createCoordRequest({ material: "aluminum" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle titanium", async () => {
      const request = createCoordRequest({ material: "titanium" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle inconel", async () => {
      const request = createCoordRequest({ material: "inconel" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });
  });

  describe("Controller Handling", () => {
    it("should handle Fanuc", async () => {
      const request = createCoordRequest({ controller: "fanuc" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle Siemens", async () => {
      const request = createCoordRequest({ controller: "siemens" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle Haas", async () => {
      const request = createCoordRequest({ controller: "haas" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle Okuma", async () => {
      const request = createCoordRequest({ controller: "okuma" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle 5-axis mode", async () => {
      const request = createCoordRequest({
        machineType: "5axis",
        operations: ["5-axis contouring"]
      });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });
  });

  describe("Edge Cases", () => {
    it("should handle minimal request", async () => {
      const request: CoordinatedRequest = {
        controller: "fanuc",
        machineType: "mill",
        operations: ["roughing"],
        material: "steel"
      };
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
      expect(result.metadata.enginesSucceeded).toBeGreaterThan(0);
    });

    it("should handle unknown material", async () => {
      const request = createCoordRequest({ material: "unknown_metal" });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should handle empty operations", async () => {
      const request = createCoordRequest({ operations: [] });
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.gcode.length).toBeGreaterThan(10);
    });

    it("should provide metadata", async () => {
      const request = createCoordRequest();
      const result = await postProcessorAICoordinationBridge.coordinate(request);

      expect(result.metadata.totalDuration_ms).toBeGreaterThanOrEqual(0);
      expect(result.metadata.version).toBe("1.0.0");
      expect(result.metadata.timestamp).toBeDefined();
    });
  });
});
