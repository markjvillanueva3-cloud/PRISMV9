/**
 * LatheLoRABenchmarkSuiteEngine Tests
 * LATHE-LORA-MS0 U-LLR16: Benchmark suite for LatheLoRA
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRABenchmarkSuiteEngine } from "../engines/LatheLoRABenchmarkSuiteEngine.js";

describe("LatheLoRABenchmarkSuiteEngine", () => {
  beforeEach(() => {
    latheLoRABenchmarkSuiteEngine.reset();
    latheLoRABenchmarkSuiteEngine.setConfig({
      physics_weight: 0.35,
      safety_weight: 0.35,
      reasoning_weight: 0.30,
      passing_threshold: 70,
      include_categories: ["speed_feed", "gcode", "physics", "safety", "reasoning", "comprehensive"],
    });
  });

  describe("getTestCases", () => {
    it("returns standard test cases", () => {
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases();
      expect(cases.length).toBeGreaterThan(0);
    });

    it("filters by include_categories", () => {
      latheLoRABenchmarkSuiteEngine.setConfig({ include_categories: ["speed_feed"] });
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases();
      expect(cases.every(c => c.category === "speed_feed")).toBe(true);
    });

    it("includes all standard categories", () => {
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases();
      const categories = new Set(cases.map(c => c.category));
      expect(categories.has("speed_feed")).toBe(true);
      expect(categories.has("gcode")).toBe(true);
      expect(categories.has("physics")).toBe(true);
    });
  });

  describe("addTestCase", () => {
    it("adds custom test case", () => {
      const initialCount = latheLoRABenchmarkSuiteEngine.getTestCases().length;
      latheLoRABenchmarkSuiteEngine.addTestCase({
        id: "CUSTOM-001",
        category: "speed_feed",
        prompt: "Custom test prompt",
        expected_elements: ["test"],
        weight: 1.0,
      });
      const newCount = latheLoRABenchmarkSuiteEngine.getTestCases().length;
      expect(newCount).toBe(initialCount + 1);
    });
  });

  describe("runTest", () => {
    it("evaluates single test case", () => {
      const testCase = latheLoRABenchmarkSuiteEngine.getTestCases()[0];
      const output = `
        For 4140 steel using Kienzle model:
        G50 S3000 spindle clamp
        Surface speed 400 SFM, RPM calculated
        Feed 0.012 IPR, depth 0.1 inch
        Because this is roughing, therefore higher depth.
        Verify clearance before cycling.
      `;
      const result = latheLoRABenchmarkSuiteEngine.runTest(testCase, output);

      expect(result.test_id).toBe(testCase.id);
      expect(result.category).toBe(testCase.category);
      expect(typeof result.physics_score).toBe("number");
      expect(typeof result.safety_score).toBe("number");
      expect(typeof result.reasoning_score).toBe("number");
      expect(typeof result.combined_score).toBe("number");
    });

    it("returns passed true for good output", () => {
      const testCase = latheLoRABenchmarkSuiteEngine.getTestCases()[0];
      const output = `
        For 4140 steel (P group) using Kienzle kc1.1 = 1800 MPa:

        G50 S3000 (spindle clamp for safety)
        G96 S400 M03 (surface speed 400 SFM)

        Surface speed: 400 SFM
        Feed rate: 0.012 IPR
        Depth of cut: 0.100 inch

        Because this is a roughing operation, therefore we use higher depth.
        First, verify clearance. Then start the operation. Finally, check finish.

        I recommend monitoring tool wear per Taylor equation.
        Important: ensure coolant is flowing.
      `;
      const result = latheLoRABenchmarkSuiteEngine.runTest(testCase, output);
      expect(result.combined_score).toBeGreaterThan(60);
    });

    it("calculates execution time", () => {
      const testCase = latheLoRABenchmarkSuiteEngine.getTestCases()[0];
      const result = latheLoRABenchmarkSuiteEngine.runTest(testCase, "test output");
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("runBenchmark", () => {
    it("runs benchmark with model outputs", () => {
      const testCases = latheLoRABenchmarkSuiteEngine.getTestCases().slice(0, 3);
      const outputs = new Map<string, string>();

      for (const tc of testCases) {
        outputs.set(tc.id, `
          G50 S3000 spindle clamp clearance verify
          400 SFM 0.012 IPR roughing finishing
          Because therefore recommend
        `);
      }

      const summary = latheLoRABenchmarkSuiteEngine.runBenchmark(outputs);

      expect(summary.total_tests).toBe(3);
      expect(summary.run_id).toContain("bench-");
      expect(summary.timestamp).toBeGreaterThan(0);
    });

    it("calculates pass rate", () => {
      const testCases = latheLoRABenchmarkSuiteEngine.getTestCases().slice(0, 2);
      const outputs = new Map<string, string>();

      outputs.set(testCases[0].id, "G50 S3000 400 SFM 0.012 IPR clearance verify because recommend");
      outputs.set(testCases[1].id, "bad output");

      const summary = latheLoRABenchmarkSuiteEngine.runBenchmark(outputs);
      expect(summary.pass_rate).toBeGreaterThanOrEqual(0);
      expect(summary.pass_rate).toBeLessThanOrEqual(100);
    });

    it("groups results by category", () => {
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases().slice(0, 5);
      const outputs = new Map<string, string>();
      for (const tc of cases) {
        outputs.set(tc.id, "G50 S3000 clearance verify speed feed");
      }

      const summary = latheLoRABenchmarkSuiteEngine.runBenchmark(outputs);
      expect(Object.keys(summary.by_category).length).toBeGreaterThan(0);
    });

    it("identifies worst performing tests", () => {
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases().slice(0, 5);
      const outputs = new Map<string, string>();
      for (const tc of cases) {
        outputs.set(tc.id, "test");
      }

      const summary = latheLoRABenchmarkSuiteEngine.runBenchmark(outputs);
      expect(summary.worst_performing.length).toBeLessThanOrEqual(3);
    });
  });

  describe("getResults", () => {
    it("returns results after benchmark", () => {
      const tc = latheLoRABenchmarkSuiteEngine.getTestCases()[0];
      const outputs = new Map<string, string>();
      outputs.set(tc.id, "test output");

      latheLoRABenchmarkSuiteEngine.runBenchmark(outputs);
      const results = latheLoRABenchmarkSuiteEngine.getResults();

      expect(results.length).toBe(1);
      expect(results[0].test_id).toBe(tc.id);
    });

    it("returns empty before benchmark", () => {
      const results = latheLoRABenchmarkSuiteEngine.getResults();
      expect(results).toEqual([]);
    });
  });

  describe("generateReport", () => {
    it("generates markdown report", () => {
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases().slice(0, 3);
      const outputs = new Map<string, string>();
      for (const tc of cases) {
        outputs.set(tc.id, "G50 S3000 test output");
      }

      const summary = latheLoRABenchmarkSuiteEngine.runBenchmark(outputs);
      const report = latheLoRABenchmarkSuiteEngine.generateReport(summary);

      expect(report).toContain("# LatheLoRA Benchmark Report");
      expect(report).toContain("## Summary");
      expect(report).toContain("Total Tests:");
      expect(report).toContain("## Dimension Scores");
    });

    it("includes category breakdown", () => {
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases().slice(0, 3);
      const outputs = new Map<string, string>();
      for (const tc of cases) {
        outputs.set(tc.id, "test");
      }

      const summary = latheLoRABenchmarkSuiteEngine.runBenchmark(outputs);
      const report = latheLoRABenchmarkSuiteEngine.generateReport(summary);

      expect(report).toContain("## By Category");
    });
  });

  describe("passesBenchmark", () => {
    it("returns true for high pass rate", () => {
      const summary = {
        run_id: "test",
        timestamp: Date.now(),
        total_tests: 10,
        passed_tests: 9,
        pass_rate: 90,
        avg_physics_score: 80,
        avg_safety_score: 80,
        avg_reasoning_score: 80,
        avg_combined_score: 80,
        by_category: {},
        worst_performing: [],
        execution_time_ms: 100,
      };

      expect(latheLoRABenchmarkSuiteEngine.passesBenchmark(summary)).toBe(true);
    });

    it("returns false for low pass rate", () => {
      const summary = {
        run_id: "test",
        timestamp: Date.now(),
        total_tests: 10,
        passed_tests: 5,
        pass_rate: 50,
        avg_physics_score: 60,
        avg_safety_score: 60,
        avg_reasoning_score: 60,
        avg_combined_score: 60,
        by_category: {},
        worst_performing: [],
        execution_time_ms: 100,
      };

      expect(latheLoRABenchmarkSuiteEngine.passesBenchmark(summary)).toBe(false);
    });

    it("accepts custom min pass rate", () => {
      const summary = {
        run_id: "test",
        timestamp: Date.now(),
        total_tests: 10,
        passed_tests: 7,
        pass_rate: 70,
        avg_physics_score: 75,
        avg_safety_score: 75,
        avg_reasoning_score: 75,
        avg_combined_score: 75,
        by_category: {},
        worst_performing: [],
        execution_time_ms: 100,
      };

      expect(latheLoRABenchmarkSuiteEngine.passesBenchmark(summary, 70)).toBe(true);
      expect(latheLoRABenchmarkSuiteEngine.passesBenchmark(summary, 80)).toBe(false);
    });
  });

  describe("getSummary", () => {
    it("formats summary string", () => {
      const summary = {
        run_id: "test",
        timestamp: Date.now(),
        total_tests: 10,
        passed_tests: 8,
        pass_rate: 80,
        avg_physics_score: 75,
        avg_safety_score: 80,
        avg_reasoning_score: 70,
        avg_combined_score: 75,
        by_category: {},
        worst_performing: [],
        execution_time_ms: 100,
      };

      const str = latheLoRABenchmarkSuiteEngine.getSummary(summary);
      expect(str).toContain("8/10");
      expect(str).toContain("80%");
      expect(str).toContain("Physics:");
      expect(str).toContain("Safety:");
    });

    it("shows PASS for passing benchmark", () => {
      const summary = {
        run_id: "test",
        timestamp: Date.now(),
        total_tests: 10,
        passed_tests: 9,
        pass_rate: 90,
        avg_physics_score: 85,
        avg_safety_score: 85,
        avg_reasoning_score: 85,
        avg_combined_score: 85,
        by_category: {},
        worst_performing: [],
        execution_time_ms: 100,
      };

      const str = latheLoRABenchmarkSuiteEngine.getSummary(summary);
      expect(str).toContain("PASS");
    });
  });

  describe("reset", () => {
    it("clears results and custom test cases", () => {
      latheLoRABenchmarkSuiteEngine.addTestCase({
        id: "CUSTOM",
        category: "speed_feed",
        prompt: "test",
        expected_elements: [],
        weight: 1,
      });

      const tc = latheLoRABenchmarkSuiteEngine.getTestCases()[0];
      latheLoRABenchmarkSuiteEngine.runBenchmark(new Map([[tc.id, "test"]]));

      latheLoRABenchmarkSuiteEngine.reset();

      expect(latheLoRABenchmarkSuiteEngine.getResults()).toEqual([]);
      const cases = latheLoRABenchmarkSuiteEngine.getTestCases();
      expect(cases.find(c => c.id === "CUSTOM")).toBeUndefined();
    });
  });

  describe("setConfig / getConfig", () => {
    it("updates weights", () => {
      latheLoRABenchmarkSuiteEngine.setConfig({ physics_weight: 0.5 });
      const config = latheLoRABenchmarkSuiteEngine.getConfig();
      expect(config.physics_weight).toBe(0.5);
    });

    it("updates passing threshold", () => {
      latheLoRABenchmarkSuiteEngine.setConfig({ passing_threshold: 80 });
      const config = latheLoRABenchmarkSuiteEngine.getConfig();
      expect(config.passing_threshold).toBe(80);
    });
  });
});
