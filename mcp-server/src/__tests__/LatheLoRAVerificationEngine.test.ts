/**
 * LatheLoRAVerificationEngine Tests
 * LATHE-LORA-MS0 U-LLR24: Deployment verification
 */

import { describe, it, expect, beforeEach } from "vitest";
import { latheLoRAVerificationEngine, type VerificationTestCase, type VerificationResult } from "../engines/LatheLoRAVerificationEngine.js";

describe("LatheLoRAVerificationEngine", () => {
  beforeEach(() => {
    latheLoRAVerificationEngine.reset();
  });

  describe("setConfig / getConfig", () => {
    it("has sensible defaults", () => {
      const config = latheLoRAVerificationEngine.getConfig();

      expect(config.pass_threshold).toBe(80);
      expect(config.critical_must_pass).toBe(true);
      expect(config.timeout_ms).toBe(60000);
      expect(config.parallel_execution).toBe(true);
      expect(config.categories.length).toBe(6);
    });

    it("allows config updates", () => {
      latheLoRAVerificationEngine.setConfig({
        pass_threshold: 90,
        timeout_ms: 30000,
      });

      const config = latheLoRAVerificationEngine.getConfig();
      expect(config.pass_threshold).toBe(90);
      expect(config.timeout_ms).toBe(30000);
    });
  });

  describe("getTestCases", () => {
    it("returns all standard test cases", () => {
      const cases = latheLoRAVerificationEngine.getTestCases();

      expect(cases.length).toBeGreaterThan(10);
    });

    it("includes all categories", () => {
      const cases = latheLoRAVerificationEngine.getTestCases();
      const categories = new Set(cases.map(c => c.category));

      expect(categories.has("availability")).toBe(true);
      expect(categories.has("physics")).toBe(true);
      expect(categories.has("safety")).toBe(true);
      expect(categories.has("gcode")).toBe(true);
      expect(categories.has("reasoning")).toBe(true);
      expect(categories.has("performance")).toBe(true);
    });

    it("filters by category", () => {
      const physics = latheLoRAVerificationEngine.getTestCases("physics");

      expect(physics.length).toBeGreaterThan(0);
      expect(physics.every(c => c.category === "physics")).toBe(true);
    });

    it("test cases have required fields", () => {
      const cases = latheLoRAVerificationEngine.getTestCases();

      for (const tc of cases) {
        expect(tc.id).toBeDefined();
        expect(tc.category).toBeDefined();
        expect(tc.name).toBeDefined();
        expect(tc.prompt).toBeDefined();
        expect(tc.validation).toBeDefined();
        expect(tc.timeout_ms).toBeGreaterThan(0);
      }
    });
  });

  describe("addTestCase", () => {
    it("adds custom test case", () => {
      const custom: VerificationTestCase = {
        id: "CUSTOM-001",
        category: "physics",
        name: "Custom physics test",
        prompt: "What is the formula for cutting force?",
        validation: { type: "contains", expected: ["Fc", "force", "Kienzle"] },
        critical: false,
        timeout_ms: 10000,
      };

      latheLoRAVerificationEngine.addTestCase(custom);

      const cases = latheLoRAVerificationEngine.getTestCases();
      expect(cases.find(c => c.id === "CUSTOM-001")).toBeDefined();
    });
  });

  describe("runTest", () => {
    it("passes contains validation with all keywords", () => {
      const testCase: VerificationTestCase = {
        id: "TEST-001",
        category: "physics",
        name: "Test",
        prompt: "What is SFM?",
        validation: { type: "contains", expected: ["surface", "feet", "minute"] },
        critical: false,
        timeout_ms: 5000,
      };

      const result = latheLoRAVerificationEngine.runTest(
        testCase,
        "Surface feet per minute (SFM) is the speed at which the material surface passes the tool.",
        200
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it("partially passes with some keywords", () => {
      const testCase: VerificationTestCase = {
        id: "TEST-001",
        category: "physics",
        name: "Test",
        prompt: "What is SFM?",
        validation: { type: "contains", expected: ["surface", "feet", "minute", "speed", "rpm"] },
        critical: false,
        timeout_ms: 5000,
      };

      const result = latheLoRAVerificationEngine.runTest(
        testCase,
        "Surface feet per minute.",
        200
      );

      expect(result.score).toBe(60); // 3/5 * 100 = 60
      expect(result.passed).toBe(true); // >= 60
    });

    it("fails with missing keywords", () => {
      const testCase: VerificationTestCase = {
        id: "TEST-001",
        category: "physics",
        name: "Test",
        prompt: "What is SFM?",
        validation: { type: "contains", expected: ["surface", "feet", "minute", "speed", "rpm"] },
        critical: false,
        timeout_ms: 5000,
      };

      const result = latheLoRAVerificationEngine.runTest(
        testCase,
        "I don't know.",
        200
      );

      expect(result.passed).toBe(false);
      expect(result.score).toBeLessThan(60);
    });

    it("validates regex patterns", () => {
      const testCase: VerificationTestCase = {
        id: "TEST-002",
        category: "gcode",
        name: "Test regex",
        prompt: "Write G50",
        validation: { type: "regex", expected: "G50\\s*S\\d+" },
        critical: false,
        timeout_ms: 5000,
      };

      const result = latheLoRAVerificationEngine.runTest(
        testCase,
        "G50 S3000",
        100
      );

      expect(result.passed).toBe(true);
      expect(result.score).toBe(100);
    });

    it("validates range values", () => {
      const testCase: VerificationTestCase = {
        id: "TEST-003",
        category: "physics",
        name: "Test range",
        prompt: "What SFM for steel?",
        validation: { type: "range", min: 300, max: 500 },
        critical: false,
        timeout_ms: 5000,
      };

      const result = latheLoRAVerificationEngine.runTest(
        testCase,
        "Use 400 SFM for steel with carbide inserts.",
        100
      );

      expect(result.passed).toBe(true);
      expect(result.details).toContain("within range");
    });

    it("fails range validation outside bounds", () => {
      const testCase: VerificationTestCase = {
        id: "TEST-003",
        category: "physics",
        name: "Test range",
        prompt: "What SFM for steel?",
        validation: { type: "range", min: 300, max: 500 },
        critical: false,
        timeout_ms: 5000,
      };

      const result = latheLoRAVerificationEngine.runTest(
        testCase,
        "Use 100 SFM.",
        100
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain("outside");
    });

    it("penalizes timeout", () => {
      const testCase: VerificationTestCase = {
        id: "TEST-001",
        category: "physics",
        name: "Test",
        prompt: "What is SFM?",
        validation: { type: "contains", expected: ["surface", "feet"] },
        critical: false,
        timeout_ms: 1000,
      };

      const result = latheLoRAVerificationEngine.runTest(
        testCase,
        "Surface feet per minute.",
        2000 // exceeds timeout
      );

      expect(result.passed).toBe(false);
      expect(result.details).toContain("TIMEOUT");
    });

    it("is case insensitive", () => {
      const testCase: VerificationTestCase = {
        id: "TEST-001",
        category: "physics",
        name: "Test",
        prompt: "What is SFM?",
        validation: { type: "contains", expected: ["SURFACE", "FEET"] },
        critical: false,
        timeout_ms: 5000,
      };

      const result = latheLoRAVerificationEngine.runTest(
        testCase,
        "surface feet per minute",
        100
      );

      expect(result.passed).toBe(true);
    });
  });

  describe("createSuiteResult", () => {
    it("creates suite with overall score", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test 1", passed: true, score: 80, details: "", critical: false, execution_time_ms: 100 },
        { category: "physics", name: "Test 2", passed: true, score: 100, details: "", critical: false, execution_time_ms: 100 },
      ];

      const suite = latheLoRAVerificationEngine.createSuiteResult("model-1", results);

      expect(suite.model_id).toBe("model-1");
      expect(suite.overall_score).toBe(90);
      expect(suite.summary.passed).toBe(2);
      expect(suite.summary.failed).toBe(0);
      expect(suite.status).toBe("passed");
      expect(suite.recommendation).toBe("approve");
    });

    it("rejects on critical failure", () => {
      const results: VerificationResult[] = [
        { category: "safety", name: "Safety test", passed: false, score: 0, details: "", critical: true, execution_time_ms: 100 },
        { category: "physics", name: "Physics test", passed: true, score: 100, details: "", critical: false, execution_time_ms: 100 },
      ];

      const suite = latheLoRAVerificationEngine.createSuiteResult("model-1", results);

      expect(suite.status).toBe("failed");
      expect(suite.recommendation).toBe("reject");
      expect(suite.summary.critical_failures).toBe(1);
    });

    it("warns on low score", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 70, details: "", critical: false, execution_time_ms: 100 },
      ];

      const suite = latheLoRAVerificationEngine.createSuiteResult("model-1", results);

      expect(suite.status).toBe("warning");
      expect(suite.recommendation).toBe("conditional");
    });

    it("adds notes for low category scores", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test 1", passed: false, score: 40, details: "", critical: false, execution_time_ms: 100 },
        { category: "physics", name: "Test 2", passed: false, score: 50, details: "", critical: false, execution_time_ms: 100 },
      ];

      const suite = latheLoRAVerificationEngine.createSuiteResult("model-1", results);

      expect(suite.notes.some(n => n.includes("physics"))).toBe(true);
    });
  });

  describe("getVerificationPrompts", () => {
    it("returns prompts for all categories", () => {
      const prompts = latheLoRAVerificationEngine.getVerificationPrompts();

      expect(prompts.length).toBeGreaterThan(10);
      expect(prompts[0].id).toBeDefined();
      expect(prompts[0].prompt).toBeDefined();
    });

    it("filters by category", () => {
      const prompts = latheLoRAVerificationEngine.getVerificationPrompts(["physics"]);

      expect(prompts.every(p => p.id.startsWith("PHYS"))).toBe(true);
    });
  });

  describe("processResponses", () => {
    it("processes responses and creates suite result", () => {
      const responses = [
        {
          id: "PHYS-001",
          response: "The recommended surface speed is 400 SFM for 4140 steel.",
          execution_time_ms: 200,
        },
        {
          id: "SAFE-001",
          response: "Use G50 S3000 to limit spindle speed to 3000 RPM.",
          execution_time_ms: 150,
        },
      ];

      const suite = latheLoRAVerificationEngine.processResponses("model-1", responses);

      expect(suite.results.length).toBe(2);
      expect(suite.model_id).toBe("model-1");
    });

    it("skips unknown test IDs", () => {
      const responses = [
        { id: "UNKNOWN-001", response: "test", execution_time_ms: 100 },
      ];

      const suite = latheLoRAVerificationEngine.processResponses("model-1", responses);

      expect(suite.results.length).toBe(0);
    });
  });

  describe("getHistory / getLatest", () => {
    it("tracks verification history", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 90, details: "", critical: false, execution_time_ms: 100 },
      ];

      latheLoRAVerificationEngine.createSuiteResult("model-1", results);
      latheLoRAVerificationEngine.createSuiteResult("model-1", results);

      const history = latheLoRAVerificationEngine.getHistory("model-1");
      expect(history.length).toBe(2);
    });

    it("filters history by model", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 90, details: "", critical: false, execution_time_ms: 100 },
      ];

      latheLoRAVerificationEngine.createSuiteResult("model-1", results);
      latheLoRAVerificationEngine.createSuiteResult("model-2", results);

      const history = latheLoRAVerificationEngine.getHistory("model-1");
      expect(history.length).toBe(1);
      expect(history[0].model_id).toBe("model-1");
    });

    it("respects limit", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 90, details: "", critical: false, execution_time_ms: 100 },
      ];

      for (let i = 0; i < 15; i++) {
        latheLoRAVerificationEngine.createSuiteResult("model-1", results);
      }

      const history = latheLoRAVerificationEngine.getHistory("model-1", 5);
      expect(history.length).toBe(5);
    });

    it("getLatest returns most recent", () => {
      const results1: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 80, details: "", critical: false, execution_time_ms: 100 },
      ];
      const results2: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 90, details: "", critical: false, execution_time_ms: 100 },
      ];

      latheLoRAVerificationEngine.createSuiteResult("model-1", results1);
      latheLoRAVerificationEngine.createSuiteResult("model-1", results2);

      const latest = latheLoRAVerificationEngine.getLatest("model-1");
      expect(latest?.overall_score).toBe(90);
    });

    it("getLatest returns undefined for unknown model", () => {
      expect(latheLoRAVerificationEngine.getLatest("unknown")).toBeUndefined();
    });
  });

  describe("isVerified", () => {
    it("returns false for unverified model", () => {
      expect(latheLoRAVerificationEngine.isVerified("model-1")).toBe(false);
    });

    it("returns true for verified model", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 90, details: "", critical: false, execution_time_ms: 100 },
      ];

      latheLoRAVerificationEngine.createSuiteResult("model-1", results);

      expect(latheLoRAVerificationEngine.isVerified("model-1")).toBe(true);
    });

    it("returns false for failed verification", () => {
      const results: VerificationResult[] = [
        { category: "safety", name: "Test", passed: false, score: 0, details: "", critical: true, execution_time_ms: 100 },
      ];

      latheLoRAVerificationEngine.createSuiteResult("model-1", results);

      expect(latheLoRAVerificationEngine.isVerified("model-1")).toBe(false);
    });
  });

  describe("generateReport", () => {
    it("generates markdown report", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "SFM Test", passed: true, score: 90, details: "Found keywords", critical: false, execution_time_ms: 100 },
        { category: "safety", name: "G50 Test", passed: false, score: 40, details: "Missing keywords", critical: true, execution_time_ms: 150 },
      ];

      const suite = latheLoRAVerificationEngine.createSuiteResult("lathe-lora-7b", results);
      const report = latheLoRAVerificationEngine.generateReport(suite);

      expect(report).toContain("# LatheLoRA Verification Report");
      expect(report).toContain("lathe-lora-7b");
      expect(report).toContain("SFM Test");
      expect(report).toContain("G50 Test");
      expect(report).toContain("CRITICAL");
      expect(report).toContain("Overall Score");
    });

    it("includes category sections", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test 1", passed: true, score: 90, details: "", critical: false, execution_time_ms: 100 },
        { category: "safety", name: "Test 2", passed: true, score: 85, details: "", critical: false, execution_time_ms: 100 },
      ];

      const suite = latheLoRAVerificationEngine.createSuiteResult("model-1", results);
      const report = latheLoRAVerificationEngine.generateReport(suite);

      expect(report).toContain("### Physics");
      expect(report).toContain("### Safety");
    });
  });

  describe("getSummary", () => {
    it("returns one-line summary", () => {
      const results: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 90, details: "", critical: false, execution_time_ms: 100 },
      ];

      const suite = latheLoRAVerificationEngine.createSuiteResult("model-1", results);
      const summary = latheLoRAVerificationEngine.getSummary(suite);

      expect(summary).toContain("PASSED");
      expect(summary).toContain("90.0");
      expect(summary).toContain("APPROVE");
    });
  });

  describe("reset", () => {
    it("clears all state", () => {
      const custom: VerificationTestCase = {
        id: "CUSTOM-001",
        category: "physics",
        name: "Custom",
        prompt: "Test",
        validation: { type: "contains", expected: ["test"] },
        critical: false,
        timeout_ms: 5000,
      };
      latheLoRAVerificationEngine.addTestCase(custom);

      const results: VerificationResult[] = [
        { category: "physics", name: "Test", passed: true, score: 90, details: "", critical: false, execution_time_ms: 100 },
      ];
      latheLoRAVerificationEngine.createSuiteResult("model-1", results);

      latheLoRAVerificationEngine.reset();

      expect(latheLoRAVerificationEngine.getTestCases().find(c => c.id === "CUSTOM-001")).toBeUndefined();
      expect(latheLoRAVerificationEngine.getHistory().length).toBe(0);
    });
  });
});
