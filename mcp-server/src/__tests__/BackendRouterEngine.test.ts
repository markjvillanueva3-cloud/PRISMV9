/**
 * BackendRouterEngine Tests
 * ==========================
 * Tests for hybrid backend routing (LOCAL-LLM-MS0 Phase 1)
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  backendRouterEngine,
  RouteTaskInputSchema,
  BackendTypeSchema,
  TaskComplexitySchema,
  RecordOutcomeInputSchema,
} from "../engines/BackendRouterEngine.js";

describe("BackendRouterEngine", () => {
  describe("schema validation", () => {
    it("validates route task input with required task", () => {
      const result = RouteTaskInputSchema.safeParse({
        task: "Explain this code",
      });
      expect(result.success).toBe(true);
    });

    it("rejects route task input without task", () => {
      const result = RouteTaskInputSchema.safeParse({});
      expect(result.success).toBe(false);
    });

    it("validates backend type enum", () => {
      expect(BackendTypeSchema.safeParse("qwen").success).toBe(true);
      expect(BackendTypeSchema.safeParse("deepseek-flash").success).toBe(true);
      expect(BackendTypeSchema.safeParse("deepseek-pro").success).toBe(true);
      expect(BackendTypeSchema.safeParse("invalid").success).toBe(false);
    });

    it("validates task complexity enum", () => {
      expect(TaskComplexitySchema.safeParse("simple").success).toBe(true);
      expect(TaskComplexitySchema.safeParse("moderate").success).toBe(true);
      expect(TaskComplexitySchema.safeParse("complex").success).toBe(true);
      expect(TaskComplexitySchema.safeParse("critical").success).toBe(true);
      expect(TaskComplexitySchema.safeParse("invalid").success).toBe(false);
    });

    it("applies default values for route task input", () => {
      const result = RouteTaskInputSchema.parse({
        task: "Simple task",
      });
      expect(result.contextLength).toBe(0);
      expect(result.tags).toEqual([]);
      expect(result.preferLocal).toBe(true);
    });

    it("validates record outcome input", () => {
      const result = RecordOutcomeInputSchema.safeParse({
        taskSignature: "test-signature",
        backend: "qwen",
        success: true,
        latencyMs: 1000,
      });
      expect(result.success).toBe(true);
    });
  });

  describe("routing logic", () => {
    it("routes simple tasks to qwen by default", () => {
      const result = backendRouterEngine.route({
        task: "Simple question",
      });
      expect(result.backend).toBe("qwen");
      expect(result.complexity).toBe("simple");
    });

    it("routes high context length to deepseek-flash", () => {
      const result = backendRouterEngine.route({
        task: "Analyze this large codebase",
        contextLength: 50000,
      });
      expect(result.backend).toBe("deepseek-flash");
      expect(result.reason).toContain("Context");
    });

    it("routes critical tags to deepseek-pro", () => {
      const result = backendRouterEngine.route({
        task: "Production deployment validation",
        tags: ["critical"],
        preferLocal: false,
      });
      expect(result.backend).toBe("deepseek-pro");
      expect(result.reason).toContain("Critical");
    });

    it("routes agentic tasks to deepseek when preferLocal is false", () => {
      const result = backendRouterEngine.route({
        task: "Multi-step reasoning task",
        tags: ["agentic"],
        preferLocal: false,
      });
      expect(["deepseek-flash", "deepseek-pro"]).toContain(result.backend);
    });

    it("respects preferLocal override", () => {
      const result = backendRouterEngine.route({
        task: "Complex analysis task",
        tags: ["reasoning"],
        preferLocal: true,
        contextLength: 10000,
      });
      expect(result.backend).toBe("qwen");
      expect(result.reason).toContain("preference");
    });

    it("respects maxLatencyMs constraint", () => {
      const result = backendRouterEngine.route({
        task: "Critical task",
        tags: ["critical"],
        preferLocal: false,
        maxLatencyMs: 1000,
      });
      expect(result.backend).toBe("qwen");
      expect(result.reason).toContain("Latency");
    });

    it("provides alternatives in routing result", () => {
      const result = backendRouterEngine.route({
        task: "Complex multi-step task",
        contextLength: 50000,
      });
      expect(Array.isArray(result.alternatives)).toBe(true);
    });

    it("assesses complexity for moderate tasks", () => {
      const result = backendRouterEngine.route({
        task: "Explain how this function works",
      });
      expect(result.complexity).toBe("moderate");
    });

    it("assesses complexity for complex tasks", () => {
      const result = backendRouterEngine.route({
        task: "Architect a distributed system design",
      });
      expect(result.complexity).toBe("complex");
    });
  });

  describe("outcome recording and stats", () => {
    it("records outcome successfully", () => {
      backendRouterEngine.recordOutcome({
        taskSignature: "test-task-1",
        backend: "qwen",
        success: true,
        latencyMs: 500,
      });

      const stats = backendRouterEngine.getStats();
      expect(stats.totalRoutes).toBeGreaterThan(0);
    });

    it("getStats returns valid statistics structure", () => {
      const stats = backendRouterEngine.getStats();

      expect(stats).toHaveProperty("totalRoutes");
      expect(stats).toHaveProperty("byBackend");
      expect(stats).toHaveProperty("successRates");
      expect(stats).toHaveProperty("avgLatencies");
      expect(stats).toHaveProperty("learnedPatterns");
      expect(typeof stats.totalRoutes).toBe("number");
    });

    it("getThresholds returns current thresholds", () => {
      const thresholds = backendRouterEngine.getThresholds();

      expect(thresholds).toHaveProperty("contextUpgradeTokens");
      expect(thresholds).toHaveProperty("complexityUpgradeTags");
      expect(thresholds).toHaveProperty("criticalTags");
      expect(thresholds).toHaveProperty("maxLocalContextTokens");
    });

    it("returns confidence score between 0 and 1", () => {
      const result = backendRouterEngine.route({
        task: "Test task",
      });
      expect(result.confidence).toBeGreaterThanOrEqual(0);
      expect(result.confidence).toBeLessThanOrEqual(1);
    });

    it("returns estimated cost of 0 for local backend", () => {
      const result = backendRouterEngine.route({
        task: "Simple task",
        preferLocal: true,
      });
      if (result.backend === "qwen") {
        expect(result.estimatedCost).toBe(0);
      }
    });
  });
});
