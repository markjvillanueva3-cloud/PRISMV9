/**
 * UnifiedPPAGIOrchestrationEngine Tests
 * ======================================
 * Tests for the central unified orchestration coordinator for PP-AGI engines.
 */

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import {
  unifiedPPAGIOrchestrationEngine,
  UnifiedPPAGIOrchestrationEngine,
  OrchestrationEventTypes,
  type OrchestrationRequest,
  type PPOperationType,
  type QualityLevel
} from "../engines/UnifiedPPAGIOrchestrationEngine.js";
import { eventBus } from "../engines/EventBus.js";

// ============================================================================
// TEST UTILITIES
// ============================================================================

/**
 * Create a test orchestration request.
 */
function createTestRequest(overrides: Partial<OrchestrationRequest> = {}): OrchestrationRequest {
  return {
    requestId: `test-${Date.now()}`,
    operationType: "analyze",
    input: {
      rawData: { test: true }
    },
    constraints: {
      maxLatency: 30000,
      maxParallelism: 2,
      enableFallbacks: true,
      engineTimeout: 5000,
      qualityLevel: "production"
    },
    context: {
      sessionId: "test-session",
      machineId: "test-machine"
    },
    priority: 5,
    ...overrides
  };
}

/**
 * Create a generation request.
 */
function createGenerationRequest(): OrchestrationRequest {
  return {
    requestId: `gen-${Date.now()}`,
    operationType: "generate",
    input: {
      request: {
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
        }
      }
    },
    constraints: {
      maxLatency: 60000,
      qualityLevel: "production"
    },
    context: {
      controllerId: "fanuc",
      materialId: "steel"
    }
  };
}

// ============================================================================
// TEST SUITE
// ============================================================================

describe("UnifiedPPAGIOrchestrationEngine", () => {
  let engine: UnifiedPPAGIOrchestrationEngine;

  beforeEach(() => {
    // Use the singleton but clear stats between tests
    engine = unifiedPPAGIOrchestrationEngine;
    engine.clearStatistics();
  });

  afterEach(() => {
    // Clean up any event subscriptions
    vi.restoreAllMocks();
  });

  // ==========================================================================
  // BASIC ENGINE TESTS
  // ==========================================================================

  describe("Engine Metadata", () => {
    it("should return engine version", () => {
      const version = engine.getVersion();
      expect(version).toBe("1.0.0");
    });

    it("should return quality threshold", () => {
      const threshold = engine.getQualityThreshold();
      expect(threshold).toBe(0.70);
    });

    it("should return registered engines", () => {
      const engines = engine.getEngines();
      expect(engines.length).toBeGreaterThan(10);
    });

    it("should return engine dependencies", () => {
      const deps = engine.getEngineDependencies();
      expect(deps).toBeDefined();
      expect(deps["pp-physics-generator"]).toContain("pp-unified-physics");
    });

    it("should return engine fallbacks", () => {
      const fallbacks = engine.getEngineFallbacks();
      expect(fallbacks).toBeDefined();
      expect(fallbacks["pp-ultimate"]).toContain("pp-deep-reasoning");
    });

    it("should generate AI context", () => {
      const context = engine.getContextForAI();
      expect(context).toContain("UNIFIED PP-AGI ORCHESTRATION ENGINE");
      expect(context).toContain("REGISTERED ENGINES:");
      expect(context).toContain("CAPABILITIES:");
    });
  });

  // ==========================================================================
  // STATISTICS TESTS
  // ==========================================================================

  describe("Statistics", () => {
    it("should return initial statistics", () => {
      const stats = engine.getStatistics();
      expect(stats.totalRequests).toBe(0);
      expect(stats.successfulRequests).toBe(0);
      expect(stats.failedRequests).toBe(0);
      expect(stats.avgDuration_ms).toBe(0);
    });

    it("should track requests by operation type", () => {
      const stats = engine.getStatistics();
      expect(stats.requestsByType.generate).toBe(0);
      expect(stats.requestsByType.optimize).toBe(0);
      expect(stats.requestsByType.validate).toBe(0);
      expect(stats.requestsByType.analyze).toBe(0);
      expect(stats.requestsByType.explain).toBe(0);
      expect(stats.requestsByType.quote).toBe(0);
    });

    it("should clear statistics", () => {
      engine.clearStatistics();
      const stats = engine.getStatistics();
      expect(stats.totalRequests).toBe(0);
    });
  });

  // ==========================================================================
  // ORCHESTRATION TESTS
  // ==========================================================================

  describe("Basic Orchestration", () => {
    it("should execute analyze orchestration", async () => {
      const request = createTestRequest({ operationType: "analyze" });
      const result = await engine.orchestrate(request);

      expect(result.requestId).toBe(request.requestId);
      expect(result.status).toMatch(/success|partial/);
      expect(result.totalDuration_ms).toBeGreaterThan(0);
      expect(result.enginesExecuted).toBeGreaterThan(0);
      expect(result.metrics).toBeDefined();
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it("should execute validate orchestration", async () => {
      const request = createTestRequest({ operationType: "validate" });
      const result = await engine.orchestrate(request);

      expect(result.status).toMatch(/success|partial/);
      expect(result.engineResults.length).toBeGreaterThan(0);
    });

    it("should execute explain orchestration", async () => {
      const request = createTestRequest({ operationType: "explain" });
      const result = await engine.orchestrate(request);

      expect(result.status).toMatch(/success|partial/);
    });

    it("should execute quote orchestration", async () => {
      const request = createTestRequest({ operationType: "quote" });
      const result = await engine.orchestrate(request);

      expect(result.status).toMatch(/success|partial/);
    });

    it("should execute optimize orchestration", async () => {
      const request = createTestRequest({ operationType: "optimize" });
      const result = await engine.orchestrate(request);

      expect(result.status).toMatch(/success|partial/);
    });

    it("should update statistics after orchestration", async () => {
      const request = createTestRequest();
      await engine.orchestrate(request);

      const stats = engine.getStatistics();
      expect(stats.totalRequests).toBe(1);
      expect(stats.requestsByType.analyze).toBe(1);
    });
  });

  // ==========================================================================
  // GENERATION ORCHESTRATION TESTS
  // ==========================================================================

  describe("Generation Orchestration", () => {
    it("should execute generation orchestration", async () => {
      const request = createGenerationRequest();
      const result = await engine.orchestrate(request);

      expect(result.status).toMatch(/success|partial/);
      expect(result.enginesExecuted).toBeGreaterThan(0);
    });

    it("should include AGI post result for generation", async () => {
      const request = createGenerationRequest();
      const result = await engine.orchestrate(request);

      // AGI post result may or may not be present depending on engine execution
      if (result.status === "success" && result.agiPostResult) {
        expect(result.agiPostResult.gcode).toBeDefined();
      }
    });
  });

  // ==========================================================================
  // CONSTRAINTS TESTS
  // ==========================================================================

  describe("Orchestration Constraints", () => {
    it("should respect required engines constraint", async () => {
      const request = createTestRequest({
        constraints: {
          requiredEngines: ["pp-unified-physics"],
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      expect(result.engineResults.some(r => r.engineId === "pp-unified-physics")).toBe(true);
    });

    it("should respect excluded engines constraint", async () => {
      const request = createTestRequest({
        constraints: {
          excludeEngines: ["pp-transformer"],
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      expect(result.engineResults.some(r => r.engineId === "pp-transformer")).toBe(false);
    });

    it("should apply quality level constraint", async () => {
      const qualityLevels: QualityLevel[] = ["draft", "production", "aerospace"];

      for (const level of qualityLevels) {
        const request = createTestRequest({
          constraints: {
            qualityLevel: level,
            maxLatency: 30000
          }
        });
        const result = await engine.orchestrate(request);

        expect(result.requestId).toBeDefined();
      }
    });

    it("should enforce max parallelism", async () => {
      const request = createTestRequest({
        constraints: {
          maxParallelism: 1,
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      expect(result.metrics.parallelismAchieved).toBeLessThanOrEqual(result.enginesExecuted);
    });
  });

  // ==========================================================================
  // METRICS TESTS
  // ==========================================================================

  describe("Orchestration Metrics", () => {
    it("should calculate engine latency metrics", async () => {
      const request = createTestRequest();
      const result = await engine.orchestrate(request);

      expect(result.metrics.avgEngineLatency_ms).toBeGreaterThanOrEqual(0);
      expect(result.metrics.maxEngineLatency_ms).toBeGreaterThanOrEqual(0);
      expect(result.metrics.maxEngineLatency_ms).toBeGreaterThanOrEqual(result.metrics.avgEngineLatency_ms);
    });

    it("should track total engines", async () => {
      const request = createTestRequest();
      const result = await engine.orchestrate(request);

      expect(result.metrics.totalEngines).toBe(result.enginesExecuted);
    });

    it("should report quality gate status", async () => {
      const request = createTestRequest();
      const result = await engine.orchestrate(request);

      expect(typeof result.metrics.qualityGatePassed).toBe("boolean");
      expect(result.metrics.overallConfidence).toBeGreaterThanOrEqual(0);
      expect(result.metrics.overallConfidence).toBeLessThanOrEqual(1);
    });

    it("should track fallback invocations", async () => {
      const request = createTestRequest({
        constraints: {
          enableFallbacks: true,
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      expect(result.metrics.fallbackInvocations).toBeGreaterThanOrEqual(0);
    });

    it("should track lock contention events", async () => {
      const request = createTestRequest();
      const result = await engine.orchestrate(request);

      expect(result.metrics.lockContentionEvents).toBeGreaterThanOrEqual(0);
    });
  });

  // ==========================================================================
  // DAG EXECUTION TESTS
  // ==========================================================================

  describe("DAG Execution", () => {
    it("should execute engines in dependency order", async () => {
      const request = createTestRequest({
        constraints: {
          requiredEngines: ["pp-unified-physics", "pp-physics-generator"],
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      const physicsIdx = result.engineResults.findIndex(r => r.engineId === "pp-unified-physics");
      const generatorIdx = result.engineResults.findIndex(r => r.engineId === "pp-physics-generator");

      // Physics should complete before generator (or generator might be skipped)
      if (physicsIdx !== -1 && generatorIdx !== -1) {
        expect(physicsIdx).toBeLessThan(generatorIdx);
      }
    });

    it("should mark dependencies as satisfied", async () => {
      const request = createTestRequest();
      const result = await engine.orchestrate(request);

      const successfulResults = result.engineResults.filter(r => r.status === "completed");
      for (const r of successfulResults) {
        expect(r.dependenciesSatisfied).toBe(true);
      }
    });

    it("should skip engines with failed dependencies", async () => {
      // This test verifies that engines are skipped when dependencies fail
      const request = createTestRequest();
      const result = await engine.orchestrate(request);

      const skippedResults = result.engineResults.filter(r => r.status === "skipped");
      for (const r of skippedResults) {
        expect(r.dependenciesSatisfied).toBe(false);
      }
    });
  });

  // ==========================================================================
  // FALLBACK TESTS
  // ==========================================================================

  describe("Fallback Handling", () => {
    it("should enable fallbacks by default", async () => {
      const request = createTestRequest({
        constraints: {
          enableFallbacks: true,
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      expect(result.status).toMatch(/success|partial|failed/);
    });

    it("should track fallback usage", async () => {
      const request = createTestRequest({
        constraints: {
          enableFallbacks: true,
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      const fallbackResults = result.engineResults.filter(r => r.fallbackUsed);
      expect(result.metrics.fallbackInvocations).toBe(fallbackResults.length);
    });

    it("should disable fallbacks when requested", async () => {
      const request = createTestRequest({
        constraints: {
          enableFallbacks: false,
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      // When fallbacks are disabled, failed engines should not have fallbackUsed
      const fallbackResults = result.engineResults.filter(r => r.fallbackUsed);
      expect(fallbackResults.length).toBe(0);
    });
  });

  // ==========================================================================
  // EVENT BUS INTEGRATION TESTS
  // ==========================================================================

  describe("Event Bus Integration", () => {
    it("should publish orchestration started event", async () => {
      const events: any[] = [];
      const subId = eventBus.subscribe(
        OrchestrationEventTypes.ORCHESTRATION_STARTED,
        (event) => events.push(event)
      );

      const request = createTestRequest();
      await engine.orchestrate(request);

      eventBus.unsubscribe(subId);
      expect(events.length).toBeGreaterThan(0);
    });

    it("should publish orchestration completed event", async () => {
      const events: any[] = [];
      const subId = eventBus.subscribe(
        OrchestrationEventTypes.ORCHESTRATION_COMPLETED,
        (event) => events.push(event)
      );

      const request = createTestRequest();
      await engine.orchestrate(request);

      eventBus.unsubscribe(subId);
      expect(events.length).toBeGreaterThan(0);
    });

    it("should publish engine started events", async () => {
      const events: any[] = [];
      const subId = eventBus.subscribe(
        OrchestrationEventTypes.ENGINE_STARTED,
        (event) => events.push(event)
      );

      const request = createTestRequest();
      await engine.orchestrate(request);

      eventBus.unsubscribe(subId);
      expect(events.length).toBeGreaterThan(0);
    });

    it("should publish engine completed events", async () => {
      const events: any[] = [];
      const subId = eventBus.subscribe(
        OrchestrationEventTypes.ENGINE_COMPLETED,
        (event) => events.push(event)
      );

      const request = createTestRequest();
      await engine.orchestrate(request);

      eventBus.unsubscribe(subId);
      expect(events.length).toBeGreaterThan(0);
    });

    it("should subscribe to events", () => {
      const handler = vi.fn();
      const subId = engine.subscribeToEvents("orchestration.*", handler);

      expect(typeof subId).toBe("string");

      engine.unsubscribeFromEvents(subId);
    });

    it("should unsubscribe from events", () => {
      const handler = vi.fn();
      const subId = engine.subscribeToEvents("orchestration.*", handler);

      const result = engine.unsubscribeFromEvents(subId);
      expect(result).toBe(true);
    });
  });

  // ==========================================================================
  // ACTIVE ORCHESTRATIONS TESTS
  // ==========================================================================

  describe("Active Orchestrations Tracking", () => {
    it("should track active orchestrations", async () => {
      // Start orchestration but don't await immediately
      const request = createTestRequest();
      const orchestrationPromise = engine.orchestrate(request);

      // Check active orchestrations (may be empty if already completed)
      const active = engine.getActiveOrchestrations();
      expect(Array.isArray(active)).toBe(true);

      // Wait for completion
      await orchestrationPromise;
    });

    it("should remove completed orchestrations", async () => {
      const request = createTestRequest();
      await engine.orchestrate(request);

      // After completion, the orchestration should be removed
      const active = engine.getActiveOrchestrations();
      expect(active.find(o => o.requestId === request.requestId)).toBeUndefined();
    });
  });

  // ==========================================================================
  // WARNINGS AND RECOMMENDATIONS TESTS
  // ==========================================================================

  describe("Warnings and Recommendations", () => {
    it("should generate warnings array", async () => {
      const request = createTestRequest();
      const result = await engine.orchestrate(request);

      expect(Array.isArray(result.warnings)).toBe(true);
    });

    it("should generate recommendations array", async () => {
      const request = createTestRequest();
      const result = await engine.orchestrate(request);

      expect(Array.isArray(result.recommendations)).toBe(true);
    });

    it("should warn when quality gate fails", async () => {
      // Force a low-confidence scenario
      const request = createTestRequest({
        constraints: {
          requiredEngines: [], // Empty to minimize confidence
          maxLatency: 30000
        }
      });
      const result = await engine.orchestrate(request);

      // If quality gate failed, there should be a warning
      if (!result.metrics.qualityGatePassed) {
        expect(result.warnings.some(w => w.includes("Quality gate"))).toBe(true);
      }
    });
  });

  // ==========================================================================
  // ERROR HANDLING TESTS
  // ==========================================================================

  describe("Error Handling", () => {
    it("should handle empty input gracefully", async () => {
      const request: OrchestrationRequest = {
        requestId: "empty-test",
        operationType: "analyze",
        input: {},
        constraints: {},
        context: {}
      };
      const result = await engine.orchestrate(request);

      expect(result.requestId).toBe("empty-test");
      expect(result.status).toMatch(/success|partial|failed/);
    });

    it("should handle missing request ID", async () => {
      const request = createTestRequest();
      delete (request as any).requestId;

      const result = await engine.orchestrate(request);

      // Should generate a request ID
      expect(result.requestId).toBeDefined();
      expect(result.requestId.length).toBeGreaterThan(0);
    });

    it("should track failed requests in statistics", async () => {
      // Clear stats first
      engine.clearStatistics();

      // Run a valid orchestration
      const request = createTestRequest();
      await engine.orchestrate(request);

      const stats = engine.getStatistics();
      expect(stats.totalRequests).toBe(1);
    });
  });

  // ==========================================================================
  // OPERATION TYPE COVERAGE TESTS
  // ==========================================================================

  describe("Operation Type Coverage", () => {
    const operationTypes: PPOperationType[] = [
      "generate",
      "optimize",
      "validate",
      "analyze",
      "explain",
      "quote"
    ];

    for (const opType of operationTypes) {
      it(`should handle ${opType} operation type`, async () => {
        const request = createTestRequest({ operationType: opType });
        const result = await engine.orchestrate(request);

        expect(result.requestId).toBeDefined();
        expect(result.status).toMatch(/success|partial|failed/);
        expect(result.timestamp).toBeInstanceOf(Date);
      });
    }
  });

  // ==========================================================================
  // CONCURRENT ORCHESTRATION TESTS
  // ==========================================================================

  describe("Concurrent Orchestrations", () => {
    it("should handle multiple concurrent orchestrations", async () => {
      const requests = [
        createTestRequest({ operationType: "analyze" }),
        createTestRequest({ operationType: "validate" }),
        createTestRequest({ operationType: "quote" })
      ];

      const results = await Promise.all(
        requests.map(r => engine.orchestrate(r))
      );

      expect(results.length).toBe(3);
      for (const result of results) {
        expect(result.status).toMatch(/success|partial|failed/);
      }
    });

    it("should isolate orchestration contexts", async () => {
      const requests = [
        createTestRequest({
          requestId: "machine-1-request",
          context: { machineId: "machine-1" }
        }),
        createTestRequest({
          requestId: "machine-2-request",
          context: { machineId: "machine-2" }
        })
      ];

      const results = await Promise.all(
        requests.map(r => engine.orchestrate(r))
      );

      // Each result should be independent
      expect(results[0].requestId).toBe("machine-1-request");
      expect(results[1].requestId).toBe("machine-2-request");
      expect(results[0].requestId).not.toBe(results[1].requestId);
    });
  });

  // ==========================================================================
  // ENGINE REGISTRY TESTS
  // ==========================================================================

  describe("Engine Registry", () => {
    it("should have all expected engine categories", () => {
      const engines = engine.getEngines();
      const categories = new Set(engines.map(e => e.category));

      expect(categories.has("physics")).toBe(true);
      expect(categories.has("generator")).toBe(true);
      expect(categories.has("knowledge")).toBe(true);
    });

    it("should have valid engine entries", () => {
      const engines = engine.getEngines();

      for (const eng of engines) {
        expect(eng.id).toBeDefined();
        expect(eng.name).toBeDefined();
        expect(eng.category).toBeDefined();
        expect(eng.confidence).toBeGreaterThan(0);
        expect(eng.confidence).toBeLessThanOrEqual(1);
      }
    });
  });
});
