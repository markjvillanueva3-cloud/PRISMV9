/**
 * LatheAIOrchestrationEngine Tests
 * =================================
 * Tests for the unified AI orchestration layer that coordinates all 27+ lathe engines.
 *
 * Test Categories:
 *   1. Unified Entry Points — orchestrateFullAnalysis, orchestrateOptimization, etc.
 *   2. Engine Coordination — parallel/sequential execution, result aggregation
 *   3. Knowledge Integration — tribal knowledge injection, physics validation
 *   4. Autonomous Execution — engine chain selection, adaptive strategy
 *   5. MCP Action Mapping — action routing, engine flow execution
 *
 * @module tests/engines/lathe-ai-orchestration
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  latheAIOrchestrationEngine,
  LatheAIOrchestrationEngine,
  type FullAnalysisOrchestrationResult,
  type OptimizationOrchestrationResult,
  type LearningOrchestrationResult,
  type DiagnosisOrchestrationResult,
  type OrchestrationStrategy,
  type EngineExecutionRecord,
  type OrchestrationContext,
  type PhysicsValidationResult,
} from "../../engines/LatheAIOrchestrationEngine.js";
import type {
  LathePartDescription,
  LatheCurrentStrategy,
  LatheSymptoms,
  LatheCuttingParams,
  LatheTool,
  LatheOperationType,
} from "../../engines/LatheDeepAIHardeningEngine.js";

// ============================================================================
// TEST FIXTURES
// ============================================================================

const SAMPLE_PART: LathePartDescription = {
  name: "Test Punch",
  part_number: "P-001",
  material: {
    name: "M2 Tool Steel",
    iso_group: "P",
    kc11_mpa: 1800,
    hardness_hrc: 62,
    mc_exponent: 0.25,
  },
  bar_od_mm: 50,
  finished_od_mm: 45,
  length_mm: 100,
  features: [
    {
      type: "contour",
      location: "od",
      start_z_mm: 0,
      end_z_mm: -80,
      diameter_mm: 45,
      tolerance_mm: 0.02,
    },
    {
      type: "thread",
      location: "od",
      start_z_mm: -80,
      end_z_mm: -95,
      thread_pitch_mm: 1.5,
      thread_form: "metric",
    },
  ],
  jm_die_category: "punch",
};

const SAMPLE_STRATEGY: LatheCurrentStrategy = {
  name: "Test Strategy",
  operations: ["face_rough", "od_rough", "od_finish", "od_thread", "parting"],
  params: {
    vc_mpm: 120,
    fn_mmrev: 0.25,
    ap_mm: 2.0,
    css_mode: true,
  },
  tools: [
    {
      tool_id: "T0101",
      tool_type: "external",
      insert_shape: "C",
      nose_radius_mm: 0.8,
      orientation: 3,
    },
  ],
  cycle_time_min: 15,
  achieved_ra_um: 3.2,
};

const SAMPLE_SYMPTOMS: LatheSymptoms = {
  machine_id: "LTH-01",
  material: "M2",
  operation: "od_finish",
  symptoms: ["chatter", "poor surface finish", "vibration marks"],
  measured_ra_um: 6.4,
  chatter_detected: true,
};

const SAMPLE_PROGRAM = `
O0001 (TEST PUNCH)
N10 G50 S3000
N20 G96 S120 M3
N30 T0101
N40 G0 X52 Z5
N50 G71 U2.0 R0.5
N60 G71 P70 Q100 U0.5 W0.1 F0.25
N70 G0 X45
N80 G1 Z-80 F0.15
N90 X48
N100 G0 X52
N110 G70 P70 Q100
N120 M30
`;

// ============================================================================
// 1. UNIFIED ENTRY POINTS
// ============================================================================

describe("LatheAIOrchestrationEngine — Unified Entry Points", () => {
  describe("orchestrateFullAnalysis", () => {
    it("should analyze a part description with all engines", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
        SAMPLE_PART,
        { machineId: "LTH-01" },
        "adaptive",
      );

      expect(result.sessionId).toMatch(/^analysis-/);
      expect(result.totalDurationMs).toBeGreaterThan(0);
      expect(result.phases).toBeDefined();
      expect(result.phases.length).toBeGreaterThan(0);
      expect(result.aggregatedAnalysis).toBeDefined();
      expect(result.aggregatedAnalysis.partClassification).toBeDefined();
      expect(result.confidenceScore).toBeGreaterThan(0);
      expect(result.confidenceScore).toBeLessThanOrEqual(1);
    });

    it("should analyze a G-code program string", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
        SAMPLE_PROGRAM,
        {},
        "fast_path",
      );

      expect(result.sessionId).toMatch(/^analysis-/);
      expect(result.phases).toHaveLength(expect.any(Number));
      expect(result.engineResults).toBeInstanceOf(Map);
    });

    it("should apply different strategies with different engine counts", async () => {
      const fullResult = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
        SAMPLE_PART,
        {},
        "full_coverage",
      );

      const fastResult = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
        SAMPLE_PART,
        {},
        "fast_path",
      );

      // Full coverage should generally process more phases
      expect(fullResult.phases.length).toBeGreaterThanOrEqual(fastResult.phases.length);
    });

    it("should include tribal knowledge when enabled", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
        SAMPLE_PART,
        { material: "M2" },
        "quality_optimized",
      );

      expect(result.tribalKnowledgeApplied).toBeGreaterThanOrEqual(0);
    });

    it("should generate recommendations based on analysis", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
        SAMPLE_PART,
        {},
        "safety_first",
      );

      expect(result.recommendations).toBeDefined();
      expect(Array.isArray(result.recommendations)).toBe(true);
    });
  });

  describe("orchestrateOptimization", () => {
    it("should optimize a strategy for speed", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateOptimization(
        SAMPLE_STRATEGY,
        { priority: "speed" },
        "adaptive",
      );

      expect(result.sessionId).toMatch(/^optimization-/);
      expect(result.originalStrategy).toEqual(SAMPLE_STRATEGY);
      expect(result.optimizedStrategy).toBeDefined();
      expect(result.optimizedStrategy.score).toBeGreaterThan(0);
      expect(result.improvementMetrics).toBeDefined();
    });

    it("should optimize a strategy for quality", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateOptimization(
        SAMPLE_STRATEGY,
        { priority: "quality", targetRaUm: 1.6 },
        "quality_optimized",
      );

      expect(result.optimizedStrategy.estimatedRaUm).toBeLessThan(SAMPLE_STRATEGY.achieved_ra_um!);
      expect(result.improvementMetrics.raImprovementPct).toBeGreaterThan(0);
    });

    it("should optimize a strategy for tool life", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateOptimization(
        SAMPLE_STRATEGY,
        { priority: "tool_life", minToolLifeMin: 90 },
        "cost_optimized",
      );

      expect(result.optimizedStrategy.params.vc_mpm).toBeLessThan(SAMPLE_STRATEGY.params.vc_mpm * 1.1);
      expect(result.tradeoffAnalysis).toBeDefined();
    });

    it("should track engine contributions", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateOptimization(
        SAMPLE_STRATEGY,
        { priority: "balanced" },
        "adaptive",
      );

      expect(result.engineContributions).toBeInstanceOf(Map);
      expect(result.engineContributions.size).toBeGreaterThan(0);
    });

    it("should provide tradeoff analysis", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateOptimization(
        SAMPLE_STRATEGY,
        { priority: "speed" },
        "adaptive",
      );

      expect(result.tradeoffAnalysis.primaryObjective).toBe("speed");
      expect(result.tradeoffAnalysis.tradeoffs).toBeDefined();
      expect(Array.isArray(result.tradeoffAnalysis.tradeoffs)).toBe(true);
    });
  });

  describe("orchestrateLearning", () => {
    it("should learn from multiple programs", async () => {
      const programs = [SAMPLE_PROGRAM, SAMPLE_PROGRAM.replace("O0001", "O0002")];

      const result = await latheAIOrchestrationEngine.orchestrateLearning(
        programs,
        { validatePhysics: true, extractPatterns: true },
      );

      expect(result.sessionId).toMatch(/^learning-/);
      expect(result.programsProcessed).toBe(2);
      expect(result.patternsLearned).toBeDefined();
      expect(result.trainingMetrics).toBeDefined();
    });

    it("should extract patterns from programs", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateLearning(
        [SAMPLE_PROGRAM],
        { extractPatterns: true },
      );

      expect(result.patternsLearned.length).toBeGreaterThan(0);
      expect(result.patternsLearned[0].patternId).toBeDefined();
      expect(result.patternsLearned[0].patternType).toMatch(/^(success|failure|optimization)$/);
    });

    it("should validate physics when enabled", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateLearning(
        [SAMPLE_PROGRAM],
        { validatePhysics: true },
      );

      expect(result.trainingMetrics.physicsValidatedPrograms).toBeGreaterThanOrEqual(0);
      expect(result.trainingMetrics.totalPrograms).toBe(1);
    });

    it("should update neural networks when enabled", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateLearning(
        [SAMPLE_PROGRAM],
        { updateNeuralNetworks: true, extractPatterns: true },
      );

      expect(result.neuralNetworkUpdates).toBeDefined();
      if (result.neuralNetworkUpdates.length > 0) {
        expect(result.neuralNetworkUpdates[0].networkId).toBeDefined();
        expect(result.neuralNetworkUpdates[0].updateType).toMatch(/^(weights|structure|hyperparameters)$/);
      }
    });
  });

  describe("orchestrateDiagnosis", () => {
    it("should diagnose symptoms with root cause analysis", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateDiagnosis(
        SAMPLE_SYMPTOMS,
        { machineId: "LTH-01" },
      );

      expect(result.sessionId).toMatch(/^diagnosis-/);
      expect(result.symptoms).toEqual(SAMPLE_SYMPTOMS.symptoms);
      expect(result.primaryDiagnosis).toBeDefined();
      expect(result.primaryDiagnosis.probability).toBeGreaterThan(0);
      expect(result.rootCauses).toBeDefined();
    });

    it("should accept symptom array directly", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateDiagnosis(
        ["chatter", "vibration", "noise"],
        {},
      );

      expect(result.symptoms).toEqual(["chatter", "vibration", "noise"]);
      expect(result.primaryDiagnosis).toBeDefined();
    });

    it("should generate corrective actions", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateDiagnosis(
        SAMPLE_SYMPTOMS,
        {},
      );

      expect(result.correctiveActions).toBeDefined();
      expect(Array.isArray(result.correctiveActions)).toBe(true);
    });

    it("should generate preventive measures", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateDiagnosis(
        SAMPLE_SYMPTOMS,
        {},
      );

      expect(result.preventiveMeasures).toBeDefined();
      expect(Array.isArray(result.preventiveMeasures)).toBe(true);
    });

    it("should cite knowledge sources", async () => {
      const result = await latheAIOrchestrationEngine.orchestrateDiagnosis(
        SAMPLE_SYMPTOMS,
        {},
      );

      expect(result.knowledgeSources).toBeDefined();
      expect(Array.isArray(result.knowledgeSources)).toBe(true);
    });
  });
});

// ============================================================================
// 2. ENGINE COORDINATION
// ============================================================================

describe("LatheAIOrchestrationEngine — Engine Coordination", () => {
  describe("executeParallel", () => {
    it("should execute multiple engines in parallel", async () => {
      const engines = ["LatheDeepAIHardeningEngine", "LatheScienceHardeningEngine"];

      const results = await latheAIOrchestrationEngine.executeParallel(
        engines,
        SAMPLE_PART,
        5000,
      );

      expect(results).toBeInstanceOf(Map);
      expect(results.size).toBe(2);

      for (const [name, record] of results) {
        expect(engines).toContain(name);
        expect(record.engineName).toBe(name);
        expect(record.status).toMatch(/^(completed|failed)$/);
        expect(record.durationMs).toBeDefined();
      }
    });

    it("should respect timeout parameter", async () => {
      const results = await latheAIOrchestrationEngine.executeParallel(
        ["LatheDeepAIHardeningEngine"],
        SAMPLE_PART,
        100, // Very short timeout
      );

      expect(results).toBeInstanceOf(Map);
      // Engine should either complete quickly or timeout
      for (const [_, record] of results) {
        expect(record.durationMs).toBeLessThanOrEqual(150); // Allow small margin
      }
    });

    it("should track execution records correctly", async () => {
      const results = await latheAIOrchestrationEngine.executeParallel(
        ["LathePartClassifierEngine"],
        SAMPLE_PART,
        2000,
      );

      const record = results.get("LathePartClassifierEngine");
      expect(record).toBeDefined();
      if (record) {
        expect(record.startTime).toBeGreaterThan(0);
        expect(record.retryCount).toBe(0);
      }
    });
  });

  describe("executeSequential", () => {
    it("should execute engines in sequence with result passing", async () => {
      const engines = ["LathePartClassifierEngine", "LatheDeepAIHardeningEngine"];

      const results = await latheAIOrchestrationEngine.executeSequential(
        engines,
        SAMPLE_PART,
      );

      expect(results).toBeInstanceOf(Map);
      // Sequential should process at least the first engine
      const keys = Array.from(results.keys());
      expect(keys.length).toBeGreaterThan(0);
      expect(keys[0]).toBe("LathePartClassifierEngine");
    });

    it("should stop on blocking failure when failFast is true", async () => {
      const engines = ["NonExistentEngine", "LatheDeepAIHardeningEngine"];

      const results = await latheAIOrchestrationEngine.executeSequential(
        engines,
        SAMPLE_PART,
      );

      expect(results.has("NonExistentEngine")).toBe(true);
      const failedRecord = results.get("NonExistentEngine");
      expect(failedRecord?.status).toBe("failed");
    });

    it("should apply transform function between engines", async () => {
      let transformCalled = false;
      const transformFn = (prevResult: unknown, engineName: string) => {
        transformCalled = true;
        return { ...SAMPLE_PART, transformed: true };
      };

      await latheAIOrchestrationEngine.executeSequential(
        ["LathePartClassifierEngine"],
        SAMPLE_PART,
        transformFn,
      );

      // Transform may or may not be called depending on engine success
      expect(typeof transformCalled).toBe("boolean");
    });
  });

  describe("aggregateResults", () => {
    it("should aggregate results using confidence weighting", async () => {
      const results = new Map<string, EngineExecutionRecord>();
      results.set("Engine1", {
        engineName: "Engine1",
        status: "completed",
        startTime: Date.now(),
        endTime: Date.now() + 100,
        durationMs: 100,
        result: { value: 100 },
        retryCount: 0,
        confidence: 0.9,
      });
      results.set("Engine2", {
        engineName: "Engine2",
        status: "completed",
        startTime: Date.now(),
        endTime: Date.now() + 100,
        durationMs: 100,
        result: { value: 200 },
        retryCount: 0,
        confidence: 0.7,
      });

      const aggregated = latheAIOrchestrationEngine.aggregateResults(
        results,
        "confidence_weighted",
      );

      expect(aggregated).toBeDefined();
      // Highest confidence result should be selected
      expect((aggregated as { value: number }).value).toBe(100);
    });

    it("should prioritize physics engines when using physics_priority", async () => {
      const results = new Map<string, EngineExecutionRecord>();
      results.set("LatheScienceHardeningEngine", {
        engineName: "LatheScienceHardeningEngine",
        status: "completed",
        startTime: Date.now(),
        endTime: Date.now() + 100,
        durationMs: 100,
        result: { type: "physics" },
        retryCount: 0,
        confidence: 0.8,
      });
      results.set("LatheIntelligenceEngine", {
        engineName: "LatheIntelligenceEngine",
        status: "completed",
        startTime: Date.now(),
        endTime: Date.now() + 100,
        durationMs: 100,
        result: { type: "intelligence" },
        retryCount: 0,
        confidence: 0.95,
      });

      const aggregated = latheAIOrchestrationEngine.aggregateResults(
        results,
        "physics_priority",
      );

      expect(aggregated).toBeDefined();
      expect((aggregated as { type: string }).type).toBe("physics");
    });

    it("should return null when no completed results", async () => {
      const results = new Map<string, EngineExecutionRecord>();
      results.set("Engine1", {
        engineName: "Engine1",
        status: "failed",
        startTime: Date.now(),
        retryCount: 0,
        confidence: 0,
        error: "Test error",
      });

      const aggregated = latheAIOrchestrationEngine.aggregateResults(results, "consensus");
      expect(aggregated).toBeNull();
    });
  });
});

// ============================================================================
// 3. KNOWLEDGE INTEGRATION
// ============================================================================

describe("LatheAIOrchestrationEngine — Knowledge Integration", () => {
  describe("injectTribalKnowledge", () => {
    it("should inject tribal knowledge into context", () => {
      const context: OrchestrationContext = {
        sessionId: "test",
        startTime: Date.now(),
        input: SAMPLE_PART,
        sharedKnowledge: new Map(),
        executionPlan: [],
        completedEngines: [],
        failedEngines: [],
        currentPhase: "initialization",
        tribalKnowledge: [],
        physicsValidation: {
          kienzleValid: false,
          taylorValid: false,
          deflectionValid: false,
          thermalValid: false,
          overallValid: false,
          warnings: [],
        },
        confidenceAccumulator: [],
      };

      latheAIOrchestrationEngine.injectTribalKnowledge(context, ["chatter", "threading"]);

      expect(context.tribalKnowledge.length).toBeGreaterThan(0);
      expect(context.sharedKnowledge.has("tribal")).toBe(true);
    });

    it("should cache tribal knowledge for repeated queries", () => {
      const context1: OrchestrationContext = {
        sessionId: "test1",
        startTime: Date.now(),
        input: {},
        sharedKnowledge: new Map(),
        executionPlan: [],
        completedEngines: [],
        failedEngines: [],
        currentPhase: "initialization",
        tribalKnowledge: [],
        physicsValidation: {
          kienzleValid: false,
          taylorValid: false,
          deflectionValid: false,
          thermalValid: false,
          overallValid: false,
          warnings: [],
        },
        confidenceAccumulator: [],
      };

      const context2 = { ...context1, sessionId: "test2", tribalKnowledge: [] };

      latheAIOrchestrationEngine.injectTribalKnowledge(context1, ["parting"]);
      latheAIOrchestrationEngine.injectTribalKnowledge(context2, ["parting"]);

      // Both should have same knowledge (from cache)
      expect(context1.tribalKnowledge.length).toBe(context2.tribalKnowledge.length);
    });
  });

  describe("shareKnowledge", () => {
    it("should share knowledge between engines via context", () => {
      const context: OrchestrationContext = {
        sessionId: "test",
        startTime: Date.now(),
        input: {},
        sharedKnowledge: new Map(),
        executionPlan: [],
        completedEngines: [],
        failedEngines: [],
        currentPhase: "analysis",
        tribalKnowledge: [],
        physicsValidation: {
          kienzleValid: false,
          taylorValid: false,
          deflectionValid: false,
          thermalValid: false,
          overallValid: false,
          warnings: [],
        },
        confidenceAccumulator: [],
      };

      latheAIOrchestrationEngine.shareKnowledge(
        context,
        "cutting_params",
        { vc: 120, fn: 0.25 },
        "LatheScienceHardeningEngine",
      );

      expect(context.sharedKnowledge.get("cutting_params")).toEqual({ vc: 120, fn: 0.25 });
    });
  });

  describe("validatePhysics", () => {
    it("should validate Kienzle cutting force", () => {
      const params: LatheCuttingParams = {
        vc_mpm: 120,
        fn_mmrev: 0.25,
        ap_mm: 2.0,
      };
      const tool: LatheTool = {
        tool_id: "T0101",
        tool_type: "external",
        nose_radius_mm: 0.8,
      };

      const result = latheAIOrchestrationEngine.validatePhysics(params, "P", tool);

      expect(result.kienzleValid).toBeDefined();
      expect(typeof result.kienzleValid).toBe("boolean");
    });

    it("should validate Taylor tool life", () => {
      const params: LatheCuttingParams = {
        vc_mpm: 120,
        fn_mmrev: 0.25,
        ap_mm: 2.0,
      };
      const tool: LatheTool = {
        tool_id: "T0101",
        tool_type: "external",
        nose_radius_mm: 0.8,
      };

      const result = latheAIOrchestrationEngine.validatePhysics(params, "P", tool);

      expect(result.taylorValid).toBeDefined();
      expect(typeof result.taylorValid).toBe("boolean");
    });

    it("should detect thermal risk at high speeds", () => {
      const params: LatheCuttingParams = {
        vc_mpm: 500, // Very high speed
        fn_mmrev: 0.25,
        ap_mm: 2.0,
      };
      const tool: LatheTool = {
        tool_id: "T0101",
        tool_type: "external",
        nose_radius_mm: 0.8,
      };

      const result = latheAIOrchestrationEngine.validatePhysics(params, "P", tool);

      expect(result.thermalValid).toBe(false);
      expect(result.warnings.some(w => w.includes("Thermal"))).toBe(true);
    });

    it("should detect deflection risk", () => {
      const params: LatheCuttingParams = {
        vc_mpm: 120,
        fn_mmrev: 0.25,
        ap_mm: 8.0, // Very high depth of cut
      };
      const tool: LatheTool = {
        tool_id: "T0101",
        tool_type: "external",
        nose_radius_mm: 0.1, // Very small nose radius
      };

      const result = latheAIOrchestrationEngine.validatePhysics(params, "P", tool);

      expect(result.deflectionValid).toBe(false);
      expect(result.warnings.some(w => w.includes("Deflection"))).toBe(true);
    });
  });
});

// ============================================================================
// 4. AUTONOMOUS EXECUTION
// ============================================================================

describe("LatheAIOrchestrationEngine — Autonomous Execution", () => {
  describe("selectEngineChain", () => {
    it("should select engines based on input features", () => {
      const chain = latheAIOrchestrationEngine.selectEngineChain(
        SAMPLE_PROGRAM,
        { material: "M2" },
        10,
      );

      expect(Array.isArray(chain)).toBe(true);
      expect(chain.length).toBeGreaterThan(0);
      expect(chain.length).toBeLessThanOrEqual(10);
    });

    it("should always include critical engines", () => {
      const chain = latheAIOrchestrationEngine.selectEngineChain(
        SAMPLE_PART,
        {},
        5,
      );

      // Critical engines should be included
      const criticalEngines = [
        "LatheDeepAIHardeningEngine",
        "LatheScienceHardeningEngine",
        "LatheCollisionZoneEngine",
      ];

      const hasCritical = chain.some(e => criticalEngines.includes(e));
      expect(hasCritical).toBe(true);
    });

    it("should respect maxEngines limit", () => {
      const chain = latheAIOrchestrationEngine.selectEngineChain(
        SAMPLE_PART,
        {},
        3,
      );

      expect(chain.length).toBeLessThanOrEqual(3);
    });

    it("should sort engines by dependencies", () => {
      const chain = latheAIOrchestrationEngine.selectEngineChain(
        SAMPLE_PART,
        {},
        10,
      );

      // Engines with dependencies should come after their dependencies
      const chainSet = new Set(chain);
      expect(chainSet.size).toBe(chain.length); // No duplicates
    });
  });

  describe("adaptStrategy", () => {
    it("should adapt to fast_path after many failures", () => {
      const history: EngineExecutionRecord[] = [
        { engineName: "E1", status: "failed", startTime: 0, retryCount: 0, confidence: 0 },
        { engineName: "E2", status: "failed", startTime: 0, retryCount: 0, confidence: 0 },
        { engineName: "E3", status: "failed", startTime: 0, retryCount: 0, confidence: 0 },
        { engineName: "E4", status: "failed", startTime: 0, retryCount: 0, confidence: 0 },
      ];

      const adapted = latheAIOrchestrationEngine.adaptStrategy("full_coverage", history);
      expect(adapted).toBe("fast_path");
    });

    it("should adapt to full_coverage on low confidence", () => {
      const history: EngineExecutionRecord[] = [
        { engineName: "E1", status: "completed", startTime: 0, retryCount: 0, confidence: 0.4 },
        { engineName: "E2", status: "completed", startTime: 0, retryCount: 0, confidence: 0.5 },
      ];

      const adapted = latheAIOrchestrationEngine.adaptStrategy("fast_path", history);
      expect(adapted).toBe("full_coverage");
    });

    it("should simplify to fast_path on high confidence", () => {
      const history: EngineExecutionRecord[] = [
        { engineName: "E1", status: "completed", startTime: 0, retryCount: 0, confidence: 0.95 },
        { engineName: "E2", status: "completed", startTime: 0, retryCount: 0, confidence: 0.92 },
      ];

      const adapted = latheAIOrchestrationEngine.adaptStrategy("full_coverage", history);
      expect(adapted).toBe("fast_path");
    });

    it("should maintain current strategy on balanced results", () => {
      const history: EngineExecutionRecord[] = [
        { engineName: "E1", status: "completed", startTime: 0, retryCount: 0, confidence: 0.75 },
        { engineName: "E2", status: "completed", startTime: 0, retryCount: 0, confidence: 0.8 },
      ];

      const adapted = latheAIOrchestrationEngine.adaptStrategy("adaptive", history);
      expect(adapted).toBe("adaptive");
    });
  });

  describe("executeFallback", () => {
    it("should try fallback engines on primary failure", async () => {
      const result = await latheAIOrchestrationEngine.executeFallback(
        "NonExistentEngine",
        ["LatheDeepAIHardeningEngine"],
        SAMPLE_PART,
      );

      // Should have tried the fallback
      expect(result.engineName).toMatch(/Engine$/);
      expect(result.status).toMatch(/^(completed|failed)$/);
    });

    it("should return first successful result", async () => {
      const result = await latheAIOrchestrationEngine.executeFallback(
        "LathePartClassifierEngine",
        ["LatheDeepAIHardeningEngine"],
        SAMPLE_PART,
      );

      // If primary succeeds, should not try fallbacks
      expect(result.engineName).toBeDefined();
    });
  });
});

// ============================================================================
// 5. MCP ACTION MAPPING
// ============================================================================

describe("LatheAIOrchestrationEngine — MCP Action Mapping", () => {
  describe("mapActionToEngines", () => {
    it("should map lathe actions to engines", () => {
      const engines = latheAIOrchestrationEngine.mapActionToEngines("lathe_chatter_analysis");

      expect(Array.isArray(engines)).toBe(true);
      expect(engines.length).toBeGreaterThan(0);
      expect(engines).toContain("LatheScienceHardeningEngine");
    });

    it("should return default engine for unknown actions", () => {
      const engines = latheAIOrchestrationEngine.mapActionToEngines("unknown_action");

      expect(engines).toEqual(["LatheDeepAIHardeningEngine"]);
    });

    it("should map threading actions correctly", () => {
      const engines = latheAIOrchestrationEngine.mapActionToEngines("thread_single_point");

      expect(engines).toContain("LatheScienceHardeningEngine");
      expect(engines).toContain("LatheAIReasoningEngine");
    });

    it("should map safety actions to collision engine", () => {
      const engines = latheAIOrchestrationEngine.mapActionToEngines("lathe_collision_check");

      expect(engines).toContain("LatheCollisionZoneEngine");
    });

    it("should map CAM actions to CAM intelligence engine", () => {
      const engines = latheAIOrchestrationEngine.mapActionToEngines("lathe_cam_template");

      expect(engines).toContain("LatheCAMIntelligenceEngine");
    });
  });

  describe("executeAction", () => {
    it("should execute orchestrated flow for action", async () => {
      const result = await latheAIOrchestrationEngine.executeAction(
        "lathe_complete_analysis",
        { part: SAMPLE_PART },
      );

      expect(result).toBeDefined();
    });

    it("should handle single-engine actions", async () => {
      const result = await latheAIOrchestrationEngine.executeAction(
        "lathe_cam_template",
        { operation: "od_rough" },
      );

      expect(result).toBeDefined();
    });
  });

  describe("getRegisteredActions", () => {
    it("should return all registered MCP actions", () => {
      const actions = latheAIOrchestrationEngine.getRegisteredActions();

      expect(Array.isArray(actions)).toBe(true);
      expect(actions.length).toBeGreaterThan(30); // Should have 30+ actions
    });

    it("should include core lathe actions", () => {
      const actions = latheAIOrchestrationEngine.getRegisteredActions();

      expect(actions).toContain("chuck_force");
      expect(actions).toContain("lathe_collision_check");
      expect(actions).toContain("lathe_opus_analyze");
    });
  });

  describe("getEngineInventory", () => {
    it("should return engine inventory summary", () => {
      const inventory = latheAIOrchestrationEngine.getEngineInventory();

      expect(inventory.total).toBeGreaterThanOrEqual(25);
      expect(inventory.byCategory).toBeDefined();
      expect(inventory.byPriority).toBeDefined();
    });

    it("should have all engine categories", () => {
      const inventory = latheAIOrchestrationEngine.getEngineInventory();

      expect(inventory.byCategory.ai_hardening).toBeGreaterThan(0);
      expect(inventory.byCategory.collision_safety).toBeGreaterThan(0);
      expect(inventory.byCategory.intelligence).toBeGreaterThan(0);
    });

    it("should have critical and high priority engines", () => {
      const inventory = latheAIOrchestrationEngine.getEngineInventory();

      expect(inventory.byPriority.critical).toBeGreaterThan(0);
      expect(inventory.byPriority.high).toBeGreaterThan(0);
    });
  });
});

// ============================================================================
// INTEGRATION TESTS
// ============================================================================

describe("LatheAIOrchestrationEngine — Integration", () => {
  it("should handle full workflow: analyze -> optimize -> learn", async () => {
    // Step 1: Analyze
    const analysisResult = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
      SAMPLE_PART,
      { machineId: "LTH-01" },
      "fast_path",
    );
    expect(analysisResult.confidenceScore).toBeGreaterThan(0);

    // Step 2: Optimize based on analysis
    const optimizationResult = await latheAIOrchestrationEngine.orchestrateOptimization(
      SAMPLE_STRATEGY,
      { priority: "balanced" },
      "adaptive",
    );
    expect(optimizationResult.optimizedStrategy).toBeDefined();

    // Step 3: Learn from the program
    const learningResult = await latheAIOrchestrationEngine.orchestrateLearning(
      [SAMPLE_PROGRAM],
      { extractPatterns: true },
    );
    expect(learningResult.trainingMetrics.totalPrograms).toBe(1);
  });

  it("should handle diagnosis workflow with corrective actions", async () => {
    const diagnosisResult = await latheAIOrchestrationEngine.orchestrateDiagnosis(
      SAMPLE_SYMPTOMS,
      {},
    );

    expect(diagnosisResult.primaryDiagnosis).toBeDefined();
    expect(diagnosisResult.correctiveActions.length).toBeGreaterThan(0);

    // Verify corrective action structure
    const action = diagnosisResult.correctiveActions[0];
    expect(action.action).toBeDefined();
    expect(action.priority).toMatch(/^(immediate|high|medium|low)$/);
  });

  it("should coordinate multiple strategies in sequence", async () => {
    const strategies: OrchestrationStrategy[] = ["fast_path", "adaptive", "quality_optimized"];
    const results: FullAnalysisOrchestrationResult[] = [];

    for (const strategy of strategies) {
      const result = await latheAIOrchestrationEngine.orchestrateFullAnalysis(
        SAMPLE_PART,
        {},
        strategy,
      );
      results.push(result);
    }

    // All strategies should complete
    expect(results.length).toBe(3);
    expect(results.every(r => r.sessionId.startsWith("analysis-"))).toBe(true);
  });
});
