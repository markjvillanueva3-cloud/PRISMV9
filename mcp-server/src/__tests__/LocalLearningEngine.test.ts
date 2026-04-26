/**
 * LocalLearningEngine Tests — LOCAL-LLM-MS0 Session 3
 * Tests via dispatcher as recommended
 */

import { describe, it, expect } from "vitest";
import { localDispatcher } from "../tools/dispatchers/localDispatcher.js";

describe("LocalLearningEngine via prism_local dispatcher", () => {
  const uniqueId = () => `test_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

  describe("learn_pattern action", () => {
    it("stores new pattern and returns isNew=true", async () => {
      const result = await localDispatcher("learn_pattern", {
        error: `Module not found: fake-module-${uniqueId()}`,
        fix: "npm install fake-module",
        errorType: "module",
      });

      expect(result.success).toBe(true);
      expect(result.action).toBe("learn_pattern");
      const data = result.data as { success: boolean; isNew: boolean; key: string; ollamaUsed: boolean };
      expect(data.success).toBe(true);
      expect(data.isNew).toBe(true);
      expect(data.key.startsWith("module:")).toBe(true);
      expect(data.ollamaUsed).toBe(false);
    });

    it("normalizes line numbers in error key", async () => {
      const baseError = `NormTest TypeError at line`;
      const uid = uniqueId();

      const result1 = await localDispatcher("learn_pattern", {
        error: `${baseError} 42: var ${uid}`,
        fix: "fix the error",
        errorType: "runtime",
      });

      const result2 = await localDispatcher("learn_pattern", {
        error: `${baseError} 999: var ${uid}`,
        fix: "fix the error",
        errorType: "runtime",
      });

      const data1 = result1.data as { key: string };
      const data2 = result2.data as { key: string; isNew: boolean };
      expect(data1.key).toBe(data2.key);
      expect(data2.isNew).toBe(false);
    });

    it("rejects empty error string", async () => {
      const result = await localDispatcher("learn_pattern", {
        error: "",
        fix: "some fix",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("error");
    });

    it("rejects empty fix string", async () => {
      const result = await localDispatcher("learn_pattern", {
        error: "some error",
        fix: "",
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain("fix");
    });
  });

  describe("search_patterns action", () => {
    it("finds previously learned patterns", async () => {
      const uid = uniqueId();
      const errorMsg = `SearchableError ${uid} cannot resolve`;

      // First learn a pattern
      await localDispatcher("learn_pattern", {
        error: errorMsg,
        fix: "install the dependency",
        errorType: "module",
      });

      // Then search for it
      const result = await localDispatcher("search_patterns", {
        query: `SearchableError ${uid}`,
        limit: 5,
        minConfidence: 0.1,
      });

      expect(result.success).toBe(true);
      const data = result.data as { results: Array<{ error: string; fix: string; confidence: number }> };
      expect(data.results.length).toBeGreaterThan(0);
      expect(data.results[0].error).toContain(uid);
      expect(data.results[0].fix).toBe("install the dependency");
      expect(data.results[0].confidence).toBeGreaterThan(0);
    });

    it("returns empty results for non-matching query", async () => {
      const result = await localDispatcher("search_patterns", {
        query: "xyznonexistent99999zzzzz",
        limit: 5,
        minConfidence: 0.8,
      });

      expect(result.success).toBe(true);
      const data = result.data as { results?: unknown[]; totalPatterns?: number };
      // slimResponse strips empty arrays, so results may be undefined or empty
      const resultsCount = data.results?.length ?? 0;
      expect(resultsCount).toBe(0);
    });

    it("filters by errorType", async () => {
      const uid = uniqueId();

      await localDispatcher("learn_pattern", {
        error: `TypeFilter ${uid} ts error`,
        fix: "fix ts",
        errorType: "typescript",
      });

      await localDispatcher("learn_pattern", {
        error: `TypeFilter ${uid} runtime error`,
        fix: "fix runtime",
        errorType: "runtime",
      });

      const result = await localDispatcher("search_patterns", {
        query: `TypeFilter ${uid}`,
        errorType: "typescript",
        limit: 10,
        minConfidence: 0.0,
      });

      const data = result.data as { results: Array<{ key: string }> };
      for (const r of data.results) {
        expect(r.key.startsWith("typescript:")).toBe(true);
      }
    });

    it("respects limit parameter", async () => {
      const result = await localDispatcher("search_patterns", {
        query: "error",
        limit: 2,
        minConfidence: 0.0,
      });

      const data = result.data as { results: unknown[] };
      expect(data.results.length).toBeLessThanOrEqual(2);
    });
  });

  describe("trajectory_start action", () => {
    it("returns trajectory ID in correct format", async () => {
      const result = await localDispatcher("trajectory_start", {
        task: "Test task " + uniqueId(),
        agent: "test-agent",
      });

      expect(result.success).toBe(true);
      const data = result.data as { trajectoryId: string };
      expect(data.trajectoryId).toMatch(/^traj_\d+_[a-z0-9]+$/);
    });
  });

  describe("trajectory_step action", () => {
    it("records step and returns correct index", async () => {
      const startResult = await localDispatcher("trajectory_start", {
        task: "Step test " + uniqueId(),
      });
      const { trajectoryId } = startResult.data as { trajectoryId: string };

      const step1 = await localDispatcher("trajectory_step", {
        trajectoryId,
        action: "Read file",
        result: "contents read",
        quality: 0.9,
      });

      expect(step1.success).toBe(true);
      const data1 = step1.data as { success: boolean; stepIndex: number };
      expect(data1.success).toBe(true);
      expect(data1.stepIndex).toBe(0);

      const step2 = await localDispatcher("trajectory_step", {
        trajectoryId,
        action: "Write file",
        quality: 0.8,
      });

      const data2 = step2.data as { stepIndex: number };
      expect(data2.stepIndex).toBe(1);
    });

    it("fails for unknown trajectory ID", async () => {
      const result = await localDispatcher("trajectory_step", {
        trajectoryId: "nonexistent_traj_xyz",
        action: "some action",
      });

      expect(result.success).toBe(true);
      const data = result.data as { success: boolean; stepIndex: number };
      expect(data.success).toBe(false);
      expect(data.stepIndex).toBe(-1);
    });
  });

  describe("trajectory_end action", () => {
    it("calculates correct metrics", async () => {
      const startResult = await localDispatcher("trajectory_start", {
        task: "End test " + uniqueId(),
      });
      const { trajectoryId } = startResult.data as { trajectoryId: string };

      await localDispatcher("trajectory_step", {
        trajectoryId,
        action: "Action 1",
        quality: 0.8,
      });

      await localDispatcher("trajectory_step", {
        trajectoryId,
        action: "Action 2",
        quality: 1.0,
      });

      const endResult = await localDispatcher("trajectory_end", {
        trajectoryId,
        success: true,
        feedback: "Completed",
      });

      expect(endResult.success).toBe(true);
      const data = endResult.data as {
        success: boolean;
        stepCount: number;
        averageQuality: number;
        duration: number;
      };
      expect(data.success).toBe(true);
      expect(data.stepCount).toBe(2);
      expect(data.averageQuality).toBe(0.9);
      expect(data.duration).toBeGreaterThanOrEqual(0);
    });

    it("returns zero averageQuality when no quality scores", async () => {
      const startResult = await localDispatcher("trajectory_start", {
        task: "No quality " + uniqueId(),
      });
      const { trajectoryId } = startResult.data as { trajectoryId: string };

      await localDispatcher("trajectory_step", {
        trajectoryId,
        action: "No quality step",
      });

      const endResult = await localDispatcher("trajectory_end", {
        trajectoryId,
        success: false,
      });

      const data = endResult.data as { averageQuality: number };
      expect(data.averageQuality).toBe(0);
    });
  });

  describe("learning_stats action", () => {
    it("returns complete statistics", async () => {
      const result = await localDispatcher("learning_stats", {});

      expect(result.success).toBe(true);
      const data = result.data as {
        totalPatterns: number;
        totalTrajectories: number;
        successRate: number;
        topErrorTypes: Array<{ type: string; count: number }>;
        ollamaAvailable: boolean;
        lastUpdated: string;
      };

      expect(data.totalPatterns).toBeGreaterThanOrEqual(0);
      expect(data.totalTrajectories).toBeGreaterThanOrEqual(0);
      expect(data.successRate).toBeGreaterThanOrEqual(0);
      expect(data.successRate).toBeLessThanOrEqual(1);
      expect(Array.isArray(data.topErrorTypes)).toBe(true);
      expect(data.lastUpdated).toMatch(/^\d{4}-\d{2}-\d{2}T/);
    });
  });
});
