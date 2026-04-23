/**
 * MastercamHeadlessIntegrationTestEngine.test.ts — U-CAD-APP-19 (PHASE-48)
 */

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  MastercamHeadlessIntegrationTestEngine,
  type MCHeadlessTransport,
  type MCHeadlessClock,
  type MCTestCase,
  type MCVersion,
  type MCFileSnapshot,
  type MCOperationSnapshot,
} from "../engines/MastercamHeadlessIntegrationTestEngine.js";

function makeClock(): MCHeadlessClock & { tick(ms?: number): void } {
  let t = new Date("2026-04-22T00:00:00Z").getTime();
  return {
    now: () => new Date(t).toISOString(),
    tick: (ms = 1000) => { t += ms; },
  };
}

function makeOperation(id: string, name: string): MCOperationSnapshot {
  return {
    operationId: id,
    operationName: name,
    operationType: "pocket",
    toolNumber: 1,
    toolDiameter: 12,
    spindleSpeed: 6000,
    feedrate: 1500,
    stepover: 6,
    stepdown: 3,
    stockToLeave: 0.1,
    coolant: "flood",
    cycleTime: 120,
    toolpathLength: 5000,
  };
}

function makeSnapshot(filePath: string): MCFileSnapshot {
  return {
    filePath,
    fileHash: "abc123",
    mcVersion: "2025",
    operationCount: 2,
    operations: [
      makeOperation("op1", "Pocket 1"),
      makeOperation("op2", "Contour 1"),
    ],
    stockMaterial: "6061 Aluminum",
    stockDimensions: { x: 100, y: 75, z: 25 },
    postProcessor: "MPFAN.PST",
    timestamp: "2026-04-22T00:00:00Z",
  };
}

function makeTransport(): MCHeadlessTransport {
  let pidCounter = 1000;

  return {
    startMastercam: vi.fn(async (version: MCVersion) => ({
      pid: ++pidCounter,
      ready: true,
    })),
    stopMastercam: vi.fn(async () => true),
    isMastercamRunning: vi.fn(async () => true),

    openFile: vi.fn(async () => ({ success: true })),
    saveFile: vi.fn(async () => ({ success: true })),
    closeFile: vi.fn(async () => ({ success: true })),

    getOperations: vi.fn(async () => [
      makeOperation("op1", "Pocket 1"),
      makeOperation("op2", "Contour 1"),
    ]),
    regenerateToolpaths: vi.fn(async () => ({
      success: true,
      regenerated: 2,
      errors: [],
    })),
    verifyToolpaths: vi.fn(async () => ({ valid: true, issues: [] })),

    runPostProcessor: vi.fn(async (pid, postName, outputPath) => ({
      success: true,
      ncPath: outputPath,
    })),
    validateNCOutput: vi.fn(async () => ({ valid: true, issues: [] })),

    getFileSnapshot: vi.fn(async () => makeSnapshot("/test/part.mcam")),
    compareSnapshots: vi.fn(async () => ({ identical: true, differences: [] })),

    getMastercamVersion: vi.fn(async () => "2025" as MCVersion),
    getHookVersion: vi.fn(async () => "1.0.0"),
  };
}

describe("MastercamHeadlessIntegrationTestEngine (U-CAD-APP-19)", () => {
  let eng: MastercamHeadlessIntegrationTestEngine;
  let clock: ReturnType<typeof makeClock>;
  let transport: MCHeadlessTransport;

  beforeEach(() => {
    clock = makeClock();
    transport = makeTransport();
    eng = new MastercamHeadlessIntegrationTestEngine({ transport, clock });
  });

  describe("process management", () => {
    it("startMastercam starts headless instance", async () => {
      const result = await eng.startMastercam("2025");
      expect(result.success).toBe(true);
      expect(result.pid).toBeGreaterThan(0);
      expect(eng.isRunning()).toBe(true);
      expect(eng.getActiveVersion()).toBe("2025");
    });

    it("startMastercam fails if already running", async () => {
      await eng.startMastercam("2025");
      const result = await eng.startMastercam("2024");
      expect(result.success).toBe(false);
      expect(result.error).toContain("already running");
    });

    it("startMastercam handles startup failure", async () => {
      vi.mocked(transport.startMastercam).mockResolvedValueOnce({ pid: 0, ready: false });
      const result = await eng.startMastercam("2025");
      expect(result.success).toBe(false);
    });

    it("stopMastercam stops running instance", async () => {
      await eng.startMastercam("2025");
      const result = await eng.stopMastercam();
      expect(result.success).toBe(true);
      expect(eng.isRunning()).toBe(false);
      expect(eng.getActivePid()).toBeNull();
    });

    it("stopMastercam fails if not running", async () => {
      const result = await eng.stopMastercam();
      expect(result.success).toBe(false);
      expect(result.error).toContain("No Mastercam instance");
    });

    it("stopMastercam with force option", async () => {
      await eng.startMastercam("2025");
      await eng.stopMastercam(true);
      expect(transport.stopMastercam).toHaveBeenCalledWith(expect.any(Number), true);
    });

    it("supports multiple MC versions", async () => {
      const versions: MCVersion[] = ["X8", "2020", "2025"];
      for (const v of versions) {
        const result = await eng.startMastercam(v);
        expect(result.success).toBe(true);
        expect(eng.getActiveVersion()).toBe(v);
        await eng.stopMastercam();
      }
    });
  });

  describe("test registration", () => {
    it("registerTest adds test to queue", () => {
      const test: MCTestCase = {
        testId: "t1",
        testName: "Test 1",
        category: "file_ops",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 30000,
      };
      eng.registerTest(test);
      expect(eng.getRegisteredTests()).toHaveLength(1);
    });

    it("registerTests adds multiple tests", () => {
      const tests: MCTestCase[] = [
        { testId: "t1", testName: "Test 1", category: "startup", expectedOutcome: "2025", timeout: 60000 },
        { testId: "t2", testName: "Test 2", category: "file_ops", expectedOutcome: "success", timeout: 60000 },
      ];
      eng.registerTests(tests);
      expect(eng.getRegisteredTests()).toHaveLength(2);
    });

    it("clearTests clears queue", () => {
      eng.registerTest({ testId: "t1", testName: "Test", category: "startup", expectedOutcome: "2025", timeout: 60000 });
      const count = eng.clearTests();
      expect(count).toBe(1);
      expect(eng.getRegisteredTests()).toHaveLength(0);
    });
  });

  describe("test execution - startup", () => {
    it("runTest startup passes with valid start", async () => {
      const test: MCTestCase = {
        testId: "startup-1",
        testName: "Startup Test",
        category: "startup",
        expectedOutcome: "2025",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("passed");
      expect(result.assertions?.some(a => a.assertion.includes("starts successfully"))).toBe(true);
    });

    it("runTest startup fails on error", async () => {
      vi.mocked(transport.startMastercam).mockResolvedValueOnce({ pid: 0, ready: false });
      const test: MCTestCase = {
        testId: "startup-fail",
        testName: "Startup Fail Test",
        category: "startup",
        expectedOutcome: "2025",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("failed");
    });
  });

  describe("test execution - file_ops", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("runTest file_ops passes with valid file", async () => {
      const test: MCTestCase = {
        testId: "file-1",
        testName: "File Ops Test",
        category: "file_ops",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("passed");
      expect(result.assertions?.some(a => a.assertion.includes("opens successfully"))).toBe(true);
      expect(result.assertions?.some(a => a.assertion.includes("closes successfully"))).toBe(true);
    });

    it("runTest file_ops skipped without file", async () => {
      const test: MCTestCase = {
        testId: "file-nofile",
        testName: "File Ops No File",
        category: "file_ops",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("skipped");
    });

    it("runTest file_ops handles open failure", async () => {
      vi.mocked(transport.openFile).mockResolvedValueOnce({ success: false, error: "File not found" });
      const test: MCTestCase = {
        testId: "file-fail",
        testName: "File Ops Fail",
        category: "file_ops",
        mcamFile: "/nonexistent.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("failed");
    });
  });

  describe("test execution - toolpath_gen", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("runTest toolpath_gen passes with valid regen", async () => {
      const test: MCTestCase = {
        testId: "tp-1",
        testName: "Toolpath Gen Test",
        category: "toolpath_gen",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("passed");
      expect(result.assertions?.some(a => a.assertion.includes("regenerate successfully"))).toBe(true);
      expect(result.assertions?.some(a => a.assertion.includes("verify valid"))).toBe(true);
    });

    it("runTest toolpath_gen fails with regen errors", async () => {
      vi.mocked(transport.regenerateToolpaths).mockResolvedValueOnce({
        success: false,
        regenerated: 0,
        errors: ["Geometry missing"],
      });
      const test: MCTestCase = {
        testId: "tp-fail",
        testName: "Toolpath Fail",
        category: "toolpath_gen",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("failed");
    });
  });

  describe("test execution - post_process", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("runTest post_process passes with valid NC", async () => {
      const test: MCTestCase = {
        testId: "post-1",
        testName: "Post Process Test",
        category: "post_process",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("passed");
      expect(result.artifacts?.some(a => a.type === "nc")).toBe(true);
    });

    it("runTest post_process fails on invalid NC", async () => {
      vi.mocked(transport.validateNCOutput).mockResolvedValueOnce({
        valid: false,
        issues: ["Missing tool change"],
      });
      const test: MCTestCase = {
        testId: "post-fail",
        testName: "Post Fail",
        category: "post_process",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("failed");
    });
  });

  describe("test execution - operation_verify", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("runTest operation_verify validates all operations", async () => {
      const test: MCTestCase = {
        testId: "op-1",
        testName: "Operation Verify",
        category: "operation_verify",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("passed");
      expect(result.assertions?.some(a => a.assertion.includes("valid spindle"))).toBe(true);
      expect(result.assertions?.some(a => a.assertion.includes("valid feedrate"))).toBe(true);
    });

    it("runTest operation_verify fails on invalid params", async () => {
      vi.mocked(transport.getOperations).mockResolvedValueOnce([
        { ...makeOperation("op1", "Bad Op"), spindleSpeed: 0 },
      ]);
      const test: MCTestCase = {
        testId: "op-fail",
        testName: "Operation Fail",
        category: "operation_verify",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("failed");
    });
  });

  describe("test execution - benchmark", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("runTest benchmark captures metrics", async () => {
      const test: MCTestCase = {
        testId: "bench-1",
        testName: "Benchmark Test",
        category: "benchmark",
        mcamFile: "/test/part.mcam",
        expectedOutcome: "success",
        timeout: 120000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("passed");
      expect(result.metrics).toBeDefined();
      expect(result.metrics?.fileOpenMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.toolpathRegenMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.postProcessMs).toBeGreaterThanOrEqual(0);
      expect(result.metrics?.totalMs).toBeGreaterThanOrEqual(0);
    });
  });

  describe("runAllTests", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("runs all registered tests", async () => {
      eng.registerTests([
        { testId: "t1", testName: "Test 1", category: "file_ops", mcamFile: "/test/part.mcam", expectedOutcome: "success", timeout: 60000 },
        { testId: "t2", testName: "Test 2", category: "operation_verify", mcamFile: "/test/part.mcam", expectedOutcome: "success", timeout: 60000 },
      ]);
      const suiteResult = await eng.runAllTests();
      expect(suiteResult.totalTests).toBe(2);
      expect(suiteResult.passed).toBe(2);
      expect(suiteResult.results).toHaveLength(2);
    });

    it("reports mixed results correctly", async () => {
      vi.mocked(transport.openFile)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: "Error" });

      eng.registerTests([
        { testId: "t1", testName: "Pass", category: "file_ops", mcamFile: "/test/pass.mcam", expectedOutcome: "success", timeout: 60000 },
        { testId: "t2", testName: "Fail", category: "file_ops", mcamFile: "/test/fail.mcam", expectedOutcome: "success", timeout: 60000 },
      ]);
      const suiteResult = await eng.runAllTests();
      expect(suiteResult.passed).toBe(1);
      expect(suiteResult.failed).toBe(1);
    });
  });

  describe("runTestsByCategory", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
      eng.registerTests([
        { testId: "t1", testName: "File 1", category: "file_ops", mcamFile: "/test/a.mcam", expectedOutcome: "success", timeout: 60000 },
        { testId: "t2", testName: "File 2", category: "file_ops", mcamFile: "/test/b.mcam", expectedOutcome: "success", timeout: 60000 },
        { testId: "t3", testName: "Op 1", category: "operation_verify", mcamFile: "/test/c.mcam", expectedOutcome: "success", timeout: 60000 },
      ]);
    });

    it("runs only tests in category", async () => {
      const results = await eng.runTestsByCategory("file_ops");
      expect(results).toHaveLength(2);
      expect(results.every(r => r.testId.startsWith("t1") || r.testId.startsWith("t2"))).toBe(true);
    });
  });

  describe("runTestsByTag", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
      eng.registerTests([
        { testId: "t1", testName: "Smoke 1", category: "file_ops", mcamFile: "/test/a.mcam", expectedOutcome: "success", timeout: 60000, tags: ["smoke"] },
        { testId: "t2", testName: "Smoke 2", category: "operation_verify", mcamFile: "/test/b.mcam", expectedOutcome: "success", timeout: 60000, tags: ["smoke", "critical"] },
        { testId: "t3", testName: "Full", category: "file_ops", mcamFile: "/test/c.mcam", expectedOutcome: "success", timeout: 60000, tags: ["full"] },
      ]);
    });

    it("runs only tests with tag", async () => {
      const results = await eng.runTestsByTag("smoke");
      expect(results).toHaveLength(2);
    });

    it("handles multiple tags", async () => {
      const results = await eng.runTestsByTag("critical");
      expect(results).toHaveLength(1);
      expect(results[0].testId).toBe("t2");
    });
  });

  describe("baseline management", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("captureBaseline captures snapshot", async () => {
      const result = await eng.captureBaseline("/test/part.mcam", "baseline-1");
      expect(result.success).toBe(true);
      expect(result.snapshot).toBeDefined();
      expect(result.snapshot?.operationCount).toBe(2);
    });

    it("getBaseline retrieves captured baseline", async () => {
      await eng.captureBaseline("/test/part.mcam", "baseline-1");
      const baseline = eng.getBaseline("baseline-1");
      expect(baseline).toBeDefined();
      expect(baseline?.filePath).toBe("/test/part.mcam");
    });

    it("compareToBaseline finds identical files", async () => {
      await eng.captureBaseline("/test/part.mcam", "baseline-1");
      const result = await eng.compareToBaseline("/test/part.mcam", "baseline-1");
      expect(result.identical).toBe(true);
      expect(result.differences).toHaveLength(0);
    });

    it("compareToBaseline finds differences", async () => {
      vi.mocked(transport.compareSnapshots).mockResolvedValueOnce({
        identical: false,
        differences: ["Spindle speed changed", "Feedrate changed"],
      });
      await eng.captureBaseline("/test/part.mcam", "baseline-1");
      const result = await eng.compareToBaseline("/test/modified.mcam", "baseline-1");
      expect(result.identical).toBe(false);
      expect(result.differences).toHaveLength(2);
    });

    it("compareToBaseline fails for missing baseline", async () => {
      const result = await eng.compareToBaseline("/test/part.mcam", "nonexistent");
      expect(result.identical).toBe(false);
      expect(result.error).toContain("Baseline not found");
    });
  });

  describe("results management", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("getResults returns all results", async () => {
      eng.registerTest({ testId: "t1", testName: "Test", category: "file_ops", mcamFile: "/test/a.mcam", expectedOutcome: "success", timeout: 60000 });
      await eng.runAllTests();
      expect(eng.getResults()).toHaveLength(1);
    });

    it("getResultsByStatus filters results", async () => {
      vi.mocked(transport.openFile)
        .mockResolvedValueOnce({ success: true })
        .mockResolvedValueOnce({ success: false, error: "Error" });

      eng.registerTests([
        { testId: "t1", testName: "Pass", category: "file_ops", mcamFile: "/test/pass.mcam", expectedOutcome: "success", timeout: 60000 },
        { testId: "t2", testName: "Fail", category: "file_ops", mcamFile: "/test/fail.mcam", expectedOutcome: "success", timeout: 60000 },
      ]);
      await eng.runAllTests();

      expect(eng.getResultsByStatus("passed")).toHaveLength(1);
      expect(eng.getResultsByStatus("failed")).toHaveLength(1);
    });

    it("clearResults clears all results", async () => {
      eng.registerTest({ testId: "t1", testName: "Test", category: "file_ops", mcamFile: "/test/a.mcam", expectedOutcome: "success", timeout: 60000 });
      await eng.runAllTests();
      const count = eng.clearResults();
      expect(count).toBe(1);
      expect(eng.getResults()).toHaveLength(0);
    });
  });

  describe("subscriptions", () => {
    beforeEach(async () => {
      await eng.startMastercam("2025");
    });

    it("onTestComplete receives test results", async () => {
      const results: Array<{ testId: string }> = [];
      eng.onTestComplete((r) => results.push(r));

      eng.registerTest({ testId: "t1", testName: "Test", category: "file_ops", mcamFile: "/test/a.mcam", expectedOutcome: "success", timeout: 60000 });
      await eng.runAllTests();

      expect(results).toHaveLength(1);
      expect(results[0].testId).toBe("t1");
    });

    it("onTestComplete unsubscribe stops notifications", async () => {
      const results: Array<{ testId: string }> = [];
      const unsub = eng.onTestComplete((r) => results.push(r));
      unsub();

      eng.registerTest({ testId: "t1", testName: "Test", category: "file_ops", mcamFile: "/test/a.mcam", expectedOutcome: "success", timeout: 60000 });
      await eng.runAllTests();

      expect(results).toHaveLength(0);
    });

    it("onSuiteComplete receives suite result", async () => {
      const suites: Array<{ totalTests: number }> = [];
      eng.onSuiteComplete((s) => suites.push(s));

      eng.registerTests([
        { testId: "t1", testName: "Test 1", category: "file_ops", mcamFile: "/test/a.mcam", expectedOutcome: "success", timeout: 60000 },
        { testId: "t2", testName: "Test 2", category: "file_ops", mcamFile: "/test/b.mcam", expectedOutcome: "success", timeout: 60000 },
      ]);
      await eng.runAllTests();

      expect(suites).toHaveLength(1);
      expect(suites[0].totalTests).toBe(2);
    });

    it("subscriber errors do not block others", async () => {
      const results: Array<{ testId: string }> = [];
      eng.onTestComplete(() => { throw new Error("fail"); });
      eng.onTestComplete((r) => results.push(r));

      eng.registerTest({ testId: "t1", testName: "Test", category: "file_ops", mcamFile: "/test/a.mcam", expectedOutcome: "success", timeout: 60000 });
      await eng.runAllTests();

      expect(results).toHaveLength(1);
    });
  });

  describe("error handling", () => {
    it("handles transport exceptions gracefully", async () => {
      vi.mocked(transport.startMastercam).mockRejectedValueOnce(new Error("Connection failed"));
      const test: MCTestCase = {
        testId: "error-1",
        testName: "Error Test",
        category: "startup",
        expectedOutcome: "2025",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("error");
      expect(result.message).toContain("Connection failed");
      expect(result.errorStack).toBeDefined();
    });

    it("handles unknown test category", async () => {
      const test = {
        testId: "unknown-1",
        testName: "Unknown Category",
        category: "unknown_category" as MCTestCase["category"],
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("error");
      expect(result.message).toContain("Unknown test category");
    });
  });

  describe("edge cases", () => {
    it("handles empty test queue", async () => {
      const suiteResult = await eng.runAllTests();
      expect(suiteResult.totalTests).toBe(0);
      expect(suiteResult.passed).toBe(0);
    });

    it("handles shutdown test without running instance", async () => {
      const test: MCTestCase = {
        testId: "shutdown-1",
        testName: "Shutdown Test",
        category: "shutdown",
        expectedOutcome: "success",
        timeout: 60000,
      };
      const result = await eng.runTest(test);
      expect(result.status).toBe("skipped");
    });

    it("handles zero timeout", async () => {
      const test: MCTestCase = {
        testId: "zero-timeout",
        testName: "Zero Timeout",
        category: "file_ops",
        mcamFile: "/test/a.mcam",
        expectedOutcome: "success",
        timeout: 0,
      };
      await eng.startMastercam("2025");
      const result = await eng.runTest(test);
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("handles very long test name", async () => {
      const longName = "A".repeat(1000);
      const test: MCTestCase = {
        testId: "long-name",
        testName: longName,
        category: "file_ops",
        mcamFile: "/test/a.mcam",
        expectedOutcome: "success",
        timeout: 60000,
      };
      await eng.startMastercam("2025");
      const result = await eng.runTest(test);
      expect(result.testName).toBe(longName);
    });
  });
});
