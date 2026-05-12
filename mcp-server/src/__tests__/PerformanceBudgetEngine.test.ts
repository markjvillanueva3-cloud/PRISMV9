import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  PerformanceBudgetEngine,
  performanceBudgetEngine,
  PP_BUDGETS,
  PerformanceBudget,
  OperationMode,
} from "../engines/PerformanceBudgetEngine.js";

describe("PerformanceBudgetEngine", () => {
  let engine: PerformanceBudgetEngine;

  beforeEach(() => {
    engine = new PerformanceBudgetEngine();
  });

  // ── Singleton Export ────────────────────────────────────────────────────────
  describe("singleton export", () => {
    it("exports a singleton instance", () => {
      expect(performanceBudgetEngine).toBeInstanceOf(PerformanceBudgetEngine);
    });
  });

  // ── PP_BUDGETS Predefined Budgets ───────────────────────────────────────────
  describe("PP_BUDGETS predefined budgets", () => {
    it("defines pp_generate_simple budget", () => {
      const budget = PP_BUDGETS.pp_generate_simple;
      expect(budget.operation).toBe("Simple G-code generation");
      expect(budget.latencyBudget.p50).toBe(100);
      expect(budget.latencyBudget.p95).toBe(500);
      expect(budget.latencyBudget.p99).toBe(1000);
      expect(budget.latencyBudget.max).toBe(5000);
      expect(budget.memoryBudget.heapLimit).toBe(512);
      expect(budget.memoryBudget.modelMemory).toBe(200);
      expect(budget.mode).toBe("realtime");
    });

    it("defines pp_generate_complex budget for batch mode", () => {
      const budget = PP_BUDGETS.pp_generate_complex;
      expect(budget.operation).toBe("Complex 5-axis G-code");
      expect(budget.latencyBudget.max).toBe(30000);
      expect(budget.memoryBudget.heapLimit).toBe(2048);
      expect(budget.mode).toBe("batch");
    });

    it("defines pp_neural_inference budget", () => {
      const budget = PP_BUDGETS.pp_neural_inference;
      expect(budget.latencyBudget.p50).toBe(50);
      expect(budget.memoryBudget.modelMemory).toBe(2000);
      expect(budget.mode).toBe("realtime");
    });

    it("defines pp_collision_check budget with tight latency", () => {
      const budget = PP_BUDGETS.pp_collision_check;
      expect(budget.latencyBudget.p50).toBe(20);
      expect(budget.latencyBudget.max).toBe(1000);
    });

    it("defines pp_offline_inference budget", () => {
      const budget = PP_BUDGETS.pp_offline_inference;
      expect(budget.mode).toBe("offline");
      expect(budget.memoryBudget.modelMemory).toBe(1500);
    });

    it("loads all predefined budgets on construction", () => {
      const budgets = engine.listBudgets();
      expect(budgets.length).toBeGreaterThanOrEqual(Object.keys(PP_BUDGETS).length);
      expect(budgets.find((b) => b.operationId === "pp_generate_simple")).toBeDefined();
      expect(budgets.find((b) => b.operationId === "pp_neural_inference")).toBeDefined();
    });
  });

  // ── Budget Management ───────────────────────────────────────────────────────
  describe("budget management", () => {
    it("registers a custom budget", () => {
      const customBudget: PerformanceBudget = {
        operation: "Custom operation",
        latencyBudget: { p50: 10, p95: 50, p99: 100, max: 500 },
        memoryBudget: { heapLimit: 256, modelMemory: 50 },
        mode: "realtime" as OperationMode,
      };

      engine.registerBudget("custom_op", customBudget);
      const retrieved = engine.getBudget("custom_op");

      expect(retrieved).toEqual(customBudget);
    });

    it("returns undefined for unregistered budget", () => {
      expect(engine.getBudget("nonexistent")).toBeUndefined();
    });

    it("lists all registered budgets", () => {
      const budgets = engine.listBudgets();
      expect(budgets.length).toBeGreaterThan(0);
      expect(budgets[0]).toHaveProperty("operationId");
      expect(budgets[0]).toHaveProperty("budget");
    });
  });

  // ── Async Wrap Budget Enforcement ───────────────────────────────────────────
  describe("async wrap()", () => {
    it("wraps a fast operation without violation", async () => {
      const result = await engine.wrap("pp_generate_simple", async () => {
        return "success";
      });

      expect(result.result).toBe("success");
      expect(result.withinBudget).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.metrics.operationId).toBe("pp_generate_simple");
      expect(result.metrics.durationMs).toBeLessThan(100);
      expect(result.metrics.budgetViolated).toBe(false);
    });

    it("throws on unregistered operation", async () => {
      await expect(
        engine.wrap("nonexistent", async () => "test")
      ).rejects.toThrow("No budget registered for operation");
    });

    it("detects latency timeout violation", async () => {
      // Register a budget with very short timeout
      engine.registerBudget("test_short", {
        operation: "Short timeout test",
        latencyBudget: { p50: 1, p95: 2, p99: 3, max: 10 },
        memoryBudget: { heapLimit: 1024, modelMemory: 100 },
        mode: "realtime",
      });

      await expect(
        engine.wrap("test_short", async () => {
          await new Promise((resolve) => setTimeout(resolve, 50));
          return "delayed";
        })
      ).rejects.toThrow("timed out");
    });

    it("throws on violation when throwOnViolation is true", async () => {
      engine.registerBudget("test_throw", {
        operation: "Throw on violation test",
        latencyBudget: { p50: 1, p95: 2, p99: 3, max: 5 },
        memoryBudget: { heapLimit: 1024, modelMemory: 100 },
        mode: "realtime",
      });

      await expect(
        engine.wrap(
          "test_throw",
          async () => {
            await new Promise((resolve) => setTimeout(resolve, 20));
            return "result";
          },
          { throwOnViolation: true }
        )
      ).rejects.toThrow("timed out");
    });

    it("records execution metrics", async () => {
      await engine.wrap("pp_collision_check", async () => {
        return { collision: false };
      });

      const metrics = engine.getMetrics("pp_collision_check");
      expect(metrics.length).toBe(1);
      expect(metrics[0].operationId).toBe("pp_collision_check");
      expect(metrics[0].durationMs).toBeGreaterThanOrEqual(0);
      expect(metrics[0].timestamp).toBeGreaterThan(0);
    });

    it("uses cache when offline mode is enabled", async () => {
      engine.enableOffline();
      engine.setInCache("test_cache_key", { cached: true });

      const result = await engine.wrap(
        "pp_generate_simple",
        async () => ({ computed: true }),
        { cacheKey: "test_cache_key" }
      );

      expect(result.result).toEqual({ cached: true });
      expect(result.metrics.offlineMode).toBe(true);
      expect(result.metrics.durationMs).toBe(0);
    });
  });

  // ── Sync Wrap Budget Enforcement ────────────────────────────────────────────
  describe("sync wrapSync()", () => {
    it("wraps a fast synchronous operation", () => {
      const result = engine.wrapSync("pp_force_prediction", () => {
        return { force: 245.3 };
      });

      expect(result.result).toEqual({ force: 245.3 });
      expect(result.withinBudget).toBe(true);
      expect(result.violations).toHaveLength(0);
    });

    it("throws on unregistered operation", () => {
      expect(() =>
        engine.wrapSync("nonexistent", () => "test")
      ).toThrow("No budget registered for operation");
    });

    it("records metrics for sync operations", () => {
      engine.wrapSync("pp_force_prediction", () => 123);

      const metrics = engine.getMetrics("pp_force_prediction");
      expect(metrics.length).toBe(1);
      expect(metrics[0].operationId).toBe("pp_force_prediction");
    });
  });

  // ── Metrics & Statistics ────────────────────────────────────────────────────
  describe("metrics and statistics", () => {
    it("calculates stats from multiple executions", async () => {
      // Run multiple operations
      for (let i = 0; i < 10; i++) {
        await engine.wrap("pp_collision_check", async () => {
          return { collision: false };
        });
      }

      const stats = engine.getStats("pp_collision_check");
      expect(stats).not.toBeNull();
      expect(stats!.totalExecutions).toBe(10);
      expect(stats!.violations).toBe(0);
      expect(stats!.violationRate).toBe(0);
      expect(stats!.actualLatencies.p50).toBeGreaterThanOrEqual(0);
      expect(stats!.compliance.p50Met).toBe(true);
      expect(stats!.compliance.maxMet).toBe(true);
    });

    it("returns null stats for operation with no executions", () => {
      const stats = engine.getStats("pp_thermal_simulation");
      expect(stats).toBeNull();
    });

    it("calculates percentiles correctly", async () => {
      // Manually add metrics with known durations
      for (let i = 1; i <= 100; i++) {
        engine["metrics"].set("test_percentile", engine["metrics"].get("test_percentile") || []);
        engine["metrics"].get("test_percentile")!.push({
          operationId: "test_percentile",
          durationMs: i, // 1, 2, 3, ..., 100
          peakHeapMb: 50,
          timestamp: Date.now(),
          budgetViolated: false,
          violations: [],
          offlineMode: false,
        });
      }

      engine.registerBudget("test_percentile", {
        operation: "Percentile test",
        latencyBudget: { p50: 60, p95: 100, p99: 100, max: 110 },
        memoryBudget: { heapLimit: 1024, modelMemory: 100 },
        mode: "realtime",
      });

      const stats = engine.getStats("test_percentile");
      expect(stats).not.toBeNull();
      expect(stats!.actualLatencies.p50).toBe(50);
      expect(stats!.actualLatencies.p95).toBe(95);
      expect(stats!.actualLatencies.p99).toBe(99);
      expect(stats!.actualLatencies.max).toBe(100);
    });

    it("getAllStats returns stats for all operations", async () => {
      await engine.wrap("pp_collision_check", async () => null);
      await engine.wrap("pp_force_prediction", async () => null);

      const allStats = engine.getAllStats();
      expect(allStats.length).toBeGreaterThanOrEqual(2);
    });

    it("clears metrics for specific operation", async () => {
      await engine.wrap("pp_collision_check", async () => null);
      expect(engine.getMetrics("pp_collision_check").length).toBe(1);

      engine.clearMetrics("pp_collision_check");
      expect(engine.getMetrics("pp_collision_check").length).toBe(0);
    });

    it("clears all metrics", async () => {
      await engine.wrap("pp_collision_check", async () => null);
      await engine.wrap("pp_force_prediction", async () => null);

      engine.clearMetrics();
      expect(engine.getMetrics("pp_collision_check").length).toBe(0);
      expect(engine.getMetrics("pp_force_prediction").length).toBe(0);
    });
  });

  // ── Violations ──────────────────────────────────────────────────────────────
  describe("violations", () => {
    it("records and retrieves violations", async () => {
      // Force a violation by exceeding heap limit (simulated through direct recording)
      engine["violations"].push({
        operationId: "test_op",
        type: "heap_limit",
        limit: 100,
        actual: 200,
        unit: "MB",
        severity: "error",
        timestamp: Date.now(),
      });

      const violations = engine.getViolations();
      expect(violations.length).toBe(1);
      expect(violations[0].type).toBe("heap_limit");
      expect(violations[0].actual).toBe(200);
    });

    it("limits violation retrieval", () => {
      for (let i = 0; i < 200; i++) {
        engine["violations"].push({
          operationId: `test_${i}`,
          type: "latency_max",
          limit: 100,
          actual: 150,
          unit: "ms",
          severity: "warn",
          timestamp: Date.now(),
        });
      }

      const violations = engine.getViolations(50);
      expect(violations.length).toBe(50);
    });
  });

  // ── Offline Mode Support ────────────────────────────────────────────────────
  describe("offline mode", () => {
    it("enables and disables offline mode", () => {
      expect(engine.isOfflineEnabled()).toBe(false);

      engine.enableOffline();
      expect(engine.isOfflineEnabled()).toBe(true);

      engine.disableOffline();
      expect(engine.isOfflineEnabled()).toBe(false);
    });

    it("configures offline settings", () => {
      engine.configureOffline({
        enabled: true,
        cacheDir: "/custom/cache",
        cacheTtlMs: 7200000,
      });

      expect(engine.isOfflineEnabled()).toBe(true);
      expect(engine["offlineConfig"].cacheDir).toBe("/custom/cache");
      expect(engine["offlineConfig"].cacheTtlMs).toBe(7200000);
    });

    it("registers and retrieves local model paths", () => {
      engine.registerLocalModel("gpt-4", "/models/gpt4.onnx");
      engine.registerLocalModel("classifier", "/models/classifier.onnx");

      expect(engine.getLocalModelPath("gpt-4")).toBe("/models/gpt4.onnx");
      expect(engine.getLocalModelPath("classifier")).toBe("/models/classifier.onnx");
      expect(engine.getLocalModelPath("nonexistent")).toBeUndefined();
    });

    it("checks network availability", async () => {
      const status = await engine.checkNetworkAvailability();
      expect(status).toHaveProperty("available");
      expect(status).toHaveProperty("lastChecked");
      expect(status).toHaveProperty("consecutiveFailures");
    });

    it("returns cached network status within interval", async () => {
      const status1 = await engine.checkNetworkAvailability();
      const status2 = await engine.checkNetworkAvailability();

      expect(status1.lastChecked).toBe(status2.lastChecked);
    });

    it("auto-enables offline after consecutive failures", async () => {
      // Mock network failures
      const mockEngine = new PerformanceBudgetEngine();
      let callCount = 0;
      mockEngine["performNetworkCheck"] = async () => {
        callCount++;
        return false;
      };
      mockEngine["offlineConfig"].networkCheckIntervalMs = 0; // No caching

      for (let i = 0; i < 3; i++) {
        await mockEngine.checkNetworkAvailability();
      }

      expect(mockEngine.isOfflineEnabled()).toBe(true);
    });
  });

  // ── Caching ─────────────────────────────────────────────────────────────────
  describe("caching", () => {
    it("stores and retrieves cached values", () => {
      engine.setInCache("key1", { data: "value1" });
      engine.setInCache("key2", [1, 2, 3]);

      expect(engine.getFromCache("key1")).toEqual({ data: "value1" });
      expect(engine.getFromCache("key2")).toEqual([1, 2, 3]);
    });

    it("returns undefined for missing cache keys", () => {
      expect(engine.getFromCache("nonexistent")).toBeUndefined();
    });

    it("expires cached values based on TTL", () => {
      vi.useFakeTimers();

      engine.setInCache("expiring", "value", 1000); // 1 second TTL
      expect(engine.getFromCache("expiring")).toBe("value");

      vi.advanceTimersByTime(2000);
      expect(engine.getFromCache("expiring")).toBeUndefined();

      vi.useRealTimers();
    });

    it("clears all cache entries", () => {
      engine.setInCache("a", 1);
      engine.setInCache("b", 2);

      engine.clearCache();
      expect(engine.getFromCache("a")).toBeUndefined();
      expect(engine.getFromCache("b")).toBeUndefined();
    });

    it("returns cache statistics", () => {
      engine.setInCache("x", 10);
      engine.setInCache("y", 20);

      const stats = engine.getCacheStats();
      expect(stats.entries).toBe(2);
      expect(stats.keys).toContain("x");
      expect(stats.keys).toContain("y");
    });
  });

  // ── CI Integration ──────────────────────────────────────────────────────────
  describe("CI integration", () => {
    it("validates budgets with no data as passing", () => {
      const validation = engine.validateBudgets();
      expect(validation.passed).toBe(true);
      expect(validation.results.length).toBeGreaterThan(0);
    });

    it("validates budgets with passing executions", async () => {
      await engine.wrap("pp_collision_check", async () => null);

      const validation = engine.validateBudgets();
      const result = validation.results.find((r) => r.operationId === "pp_collision_check");

      expect(result).toBeDefined();
      expect(result!.passed).toBe(true);
    });

    it("validates budgets with failing executions", () => {
      // Manually inject failing metrics
      engine["metrics"].set("pp_collision_check", [
        {
          operationId: "pp_collision_check",
          durationMs: 5000, // Way over p50=20ms
          peakHeapMb: 50,
          timestamp: Date.now(),
          budgetViolated: true,
          violations: ["latency_max exceeded"],
          offlineMode: false,
        },
      ]);

      const validation = engine.validateBudgets();
      const result = validation.results.find((r) => r.operationId === "pp_collision_check");

      expect(result).toBeDefined();
      expect(result!.passed).toBe(false);
      expect(result!.reason).toContain("Failed");
    });

    it("assertBudgetCompliance throws on violation", () => {
      engine["metrics"].set("pp_collision_check", [
        {
          operationId: "pp_collision_check",
          durationMs: 5000,
          peakHeapMb: 50,
          timestamp: Date.now(),
          budgetViolated: true,
          violations: [],
          offlineMode: false,
        },
      ]);

      expect(() => engine.assertBudgetCompliance("pp_collision_check")).toThrow(
        "Budget compliance failed"
      );
    });

    it("assertBudgetCompliance passes for compliant operation", async () => {
      await engine.wrap("pp_collision_check", async () => null);

      expect(() => engine.assertBudgetCompliance("pp_collision_check")).not.toThrow();
    });

    it("assertBudgetCompliance does nothing for operation with no data", () => {
      expect(() => engine.assertBudgetCompliance("pp_thermal_simulation")).not.toThrow();
    });

    it("generates a performance report", async () => {
      await engine.wrap("pp_collision_check", async () => null);

      const report = engine.generateReport();

      expect(report.timestamp).toBeGreaterThan(0);
      expect(report.summary.totalOperations).toBeGreaterThan(0);
      expect(report.summary.operationsWithData).toBeGreaterThanOrEqual(1);
      expect(report.operations).toBeInstanceOf(Array);
      expect(report.recentViolations).toBeInstanceOf(Array);
    });

    it("calculates overall pass rate correctly", async () => {
      await engine.wrap("pp_collision_check", async () => null);
      await engine.wrap("pp_force_prediction", async () => null);

      const report = engine.generateReport();
      expect(report.summary.overallPassRate).toBeGreaterThan(0);
    });
  });

  // ── One-Liner Status ────────────────────────────────────────────────────────
  describe("oneLiner()", () => {
    it("returns formatted status string", () => {
      const status = engine.oneLiner();
      expect(status).toContain("PerfBudget");
      expect(status).toContain("operations compliant");
      expect(status).toContain("violations");
    });
  });

  // ── Edge Cases ──────────────────────────────────────────────────────────────
  describe("edge cases", () => {
    it("handles empty metrics gracefully", () => {
      const stats = engine.getStats("pp_generate_simple");
      expect(stats).toBeNull();
    });

    it("limits stored metrics to prevent memory growth", async () => {
      engine["maxMetricsPerOperation"] = 5;

      for (let i = 0; i < 10; i++) {
        await engine.wrap("pp_collision_check", async () => i);
      }

      const metrics = engine.getMetrics("pp_collision_check");
      expect(metrics.length).toBe(5);
    });

    it("handles concurrent operations", async () => {
      const promises = Array.from({ length: 10 }, (_, i) =>
        engine.wrap("pp_collision_check", async () => i)
      );

      const results = await Promise.all(promises);
      expect(results.length).toBe(10);
      expect(results.every((r) => r.withinBudget)).toBe(true);
    });

    it("handles operation that throws", async () => {
      await expect(
        engine.wrap("pp_collision_check", async () => {
          throw new Error("Operation failed");
        })
      ).rejects.toThrow("Operation failed");
    });

    it("handles sync operation that throws", () => {
      expect(() =>
        engine.wrapSync("pp_force_prediction", () => {
          throw new Error("Sync failed");
        })
      ).toThrow("Sync failed");
    });
  });

  // ── Memory Tracking ─────────────────────────────────────────────────────────
  describe("memory tracking", () => {
    it("tracks heap usage during execution", async () => {
      const result = await engine.wrap("pp_generate_simple", async () => {
        // Allocate some memory
        const arr = new Array(10000).fill({ data: "x".repeat(100) });
        return arr.length;
      });

      expect(result.metrics.peakHeapMb).toBeGreaterThan(0);
    });

    it("reports heap compliance in stats", async () => {
      await engine.wrap("pp_generate_simple", async () => null);

      const stats = engine.getStats("pp_generate_simple");
      expect(stats).not.toBeNull();
      expect(stats!.compliance.heapMet).toBe(true);
      expect(stats!.avgHeapMb).toBeGreaterThanOrEqual(0);
    });
  });
});
