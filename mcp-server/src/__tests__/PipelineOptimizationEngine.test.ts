/**
 * PipelineOptimizationEngine Tests
 *
 * Tests for centralized pipeline infrastructure:
 * - Dead letter queue
 * - Telemetry collection
 * - Resource allocation
 * - Stage parallelization analysis
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  PipelineOptimizationEngine,
  pipelineOptimizationEngine,
  type PipelineStageDefinition,
} from "../engines/PipelineOptimizationEngine.js";

describe("PipelineOptimizationEngine", () => {
  let engine: PipelineOptimizationEngine;

  beforeEach(() => {
    engine = new PipelineOptimizationEngine();
  });

  describe("wrapPipeline", () => {
    it("should create a wrapper with the correct pipeline name", () => {
      const wrapper = engine.wrapPipeline("TestPipeline");
      expect(wrapper.pipelineName).toBe("TestPipeline");
      expect(typeof wrapper.executeWithInfra).toBe("function");
    });
  });

  describe("executeWithInfra", () => {
    it("should execute a simple pipeline successfully", async () => {
      const wrapper = engine.wrapPipeline("SimpleTest");

      const stages = [
        {
          definition: { name: "stage1", index: 0 },
          execute: async (input: unknown) => ({ ...input as object, step1: true }),
        },
        {
          definition: { name: "stage2", index: 1 },
          execute: async (input: unknown) => ({ ...input as object, step2: true }),
        },
      ];

      const result = await wrapper.executeWithInfra(
        { initial: true },
        stages,
        { useLock: false, collectMetrics: true }
      );

      expect(result.success).toBe(true);
      expect(result.output).toEqual({ initial: true, step1: true, step2: true });
      expect(result.metrics.status).toBe("completed");
      expect(result.metrics.stageMetrics).toHaveLength(2);
    });

    it("should handle stage failures and track metrics", async () => {
      const wrapper = engine.wrapPipeline("FailingTest");

      const stages = [
        {
          definition: { name: "success_stage", index: 0 },
          execute: async (input: unknown) => ({ ...input as object, passed: true }),
        },
        {
          definition: { name: "failing_stage", index: 1 },
          execute: async () => {
            throw new Error("Intentional test failure");
          },
        },
      ];

      const result = await wrapper.executeWithInfra(
        { start: true },
        stages,
        { useLock: false, useDeadLetterQueue: false }
      );

      expect(result.success).toBe(false);
      expect(result.metrics.status).toBe("failed");
      expect(result.errors).toContain("Intentional test failure");

      // First stage should be completed
      expect(result.metrics.stageMetrics[0].status).toBe("completed");
      // Second stage should be failed
      expect(result.metrics.stageMetrics[1].status).toBe("failed");
    });

    it("should retry failed stages when maxRetries is set", async () => {
      let attemptCount = 0;
      const wrapper = engine.wrapPipeline("RetryTest");

      const stages = [
        {
          definition: { name: "flaky_stage", index: 0, maxRetries: 2 },
          execute: async (input: unknown) => {
            attemptCount++;
            if (attemptCount < 3) {
              throw new Error(`Attempt ${attemptCount} failed`);
            }
            return { ...input as object, succeeded: true };
          },
        },
      ];

      const result = await wrapper.executeWithInfra(
        { start: true },
        stages,
        { useLock: false }
      );

      expect(result.success).toBe(true);
      expect(attemptCount).toBe(3);
      expect(result.metrics.stageMetrics[0].retries).toBe(2);
    });
  });

  describe("getDeadLetterQueue", () => {
    it("should return empty array initially", () => {
      const dlq = engine.getDeadLetterQueue();
      expect(Array.isArray(dlq)).toBe(true);
    });
  });

  describe("getTelemetryStats", () => {
    it("should return zero stats for unknown pipeline", () => {
      const stats = engine.getTelemetryStats("NonExistent");
      expect(stats.totalRuns).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgDurationMs).toBe(0);
    });
  });

  describe("getResourceAllocation", () => {
    it("should return valid resource allocation", () => {
      const allocation = engine.getResourceAllocation();
      expect(allocation.maxConcurrentPipelines).toBeGreaterThanOrEqual(1);
      expect(typeof allocation.memoryAvailableMB).toBe("number");
      expect(typeof allocation.queueDepth).toBe("number");
    });
  });

  describe("analyzeStageParallelization", () => {
    it("should identify parallelizable stages", () => {
      const stages: PipelineStageDefinition[] = [
        { name: "sequential1", index: 0, parallelizable: false },
        { name: "parallel1", index: 1, parallelizable: true },
        { name: "parallel2", index: 2, parallelizable: true },
        { name: "sequential2", index: 3, parallelizable: false },
      ];

      const analysis = engine.analyzeStageParallelization(stages);
      expect(analysis.sequentialStages).toContain(0);
      expect(analysis.sequentialStages).toContain(3);
      expect(analysis.parallelGroups.length).toBeGreaterThan(0);
      // The parallel group should contain stages 1 and 2
      expect(analysis.parallelGroups.some(g => g.includes(1) && g.includes(2))).toBe(true);
    });

    it("should generate recommendations for CPU-intensive stages", () => {
      const stages: PipelineStageDefinition[] = [
        { name: "cpu1", index: 0, resources: { cpuIntensive: true } },
        { name: "cpu2", index: 1, resources: { cpuIntensive: true } },
        { name: "cpu3", index: 2, resources: { cpuIntensive: true } },
        { name: "cpu4", index: 3, resources: { cpuIntensive: true } },
      ];

      const analysis = engine.analyzeStageParallelization(stages);
      expect(analysis.recommendations.some(r => r.includes("CPU-intensive"))).toBe(true);
    });
  });

  describe("getActivePipelines", () => {
    it("should return empty array when no pipelines running", () => {
      const active = engine.getActivePipelines();
      expect(active).toEqual([]);
    });
  });

  describe("cleanup", () => {
    it("should not throw when cleaning up empty state", () => {
      const result = engine.cleanup(24);
      expect(result.telemetryCleared).toBe(0);
      expect(result.dlqCleared).toBe(0);
    });
  });

  describe("singleton export", () => {
    it("should export a singleton instance", () => {
      expect(pipelineOptimizationEngine).toBeDefined();
      expect(pipelineOptimizationEngine.name).toBe("PipelineOptimizationEngine");
    });
  });
});
