/**
 * LatheLoRABenchmarkSuiteEngine — LATHE-LORA-MS0 U-LLR16
 * ======================================================
 *
 * Comprehensive benchmark suite for LatheLoRA model evaluation.
 * Combines physics, safety, and reasoning evaluators with
 * standardized test cases and aggregate scoring.
 *
 * Benchmark categories:
 *   - Speed/feed calculation accuracy
 *   - G-code generation quality
 *   - Physics compliance
 *   - Safety adherence
 *   - Reasoning coherence
 *
 * @module engines/LatheLoRABenchmarkSuiteEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";
import { latheLoRAPhysicsEvaluatorEngine, type PhysicsEvaluation } from "./LatheLoRAPhysicsEvaluatorEngine.js";
import { latheLoRASafetyEvaluatorEngine, type SafetyEvaluation } from "./LatheLoRASafetyEvaluatorEngine.js";
import { latheLoRAReasoningEvaluatorEngine, type ReasoningEvaluation } from "./LatheLoRAReasoningEvaluatorEngine.js";
import type { ISOGroup } from "../physics/constants.js";

// ============================================================================
// TYPES
// ============================================================================

/** Benchmark test case */
export interface BenchmarkTestCase {
  id: string;
  category: "speed_feed" | "gcode" | "physics" | "safety" | "reasoning" | "comprehensive";
  prompt: string;
  expected_elements: string[];
  iso_group?: ISOGroup;
  weight: number;
}

/** Single test result */
export interface TestResult {
  test_id: string;
  category: string;
  passed: boolean;
  physics_score: number;
  safety_score: number;
  reasoning_score: number;
  combined_score: number;
  issues_count: number;
  execution_time_ms: number;
}

/** Benchmark run summary */
export interface BenchmarkSummary {
  run_id: string;
  timestamp: number;
  total_tests: number;
  passed_tests: number;
  pass_rate: number;
  avg_physics_score: number;
  avg_safety_score: number;
  avg_reasoning_score: number;
  avg_combined_score: number;
  by_category: Record<string, {
    total: number;
    passed: number;
    avg_score: number;
  }>;
  worst_performing: TestResult[];
  execution_time_ms: number;
}

/** Benchmark configuration */
export interface BenchmarkConfig {
  physics_weight: number;
  safety_weight: number;
  reasoning_weight: number;
  passing_threshold: number;
  include_categories: string[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: BenchmarkConfig = {
  physics_weight: 0.35,
  safety_weight: 0.35,
  reasoning_weight: 0.30,
  passing_threshold: 70,
  include_categories: ["speed_feed", "gcode", "physics", "safety", "reasoning", "comprehensive"],
};

/** Standard benchmark test cases */
const STANDARD_TEST_CASES: BenchmarkTestCase[] = [
  // Speed/Feed category
  {
    id: "SF-001",
    category: "speed_feed",
    prompt: "Calculate speed and feed for roughing 4140 steel, 2 inch diameter, with carbide insert",
    expected_elements: ["rpm", "sfm", "ipr", "depth"],
    iso_group: "P",
    weight: 1.0,
  },
  {
    id: "SF-002",
    category: "speed_feed",
    prompt: "What is the optimal surface speed for finishing 304 stainless steel?",
    expected_elements: ["sfm", "stainless", "finishing"],
    iso_group: "M",
    weight: 1.0,
  },
  {
    id: "SF-003",
    category: "speed_feed",
    prompt: "Calculate cutting parameters for titanium Ti-6Al-4V, 1 inch diameter",
    expected_elements: ["sfm", "ipr", "titanium"],
    iso_group: "S",
    weight: 1.2,
  },

  // G-code category
  {
    id: "GC-001",
    category: "gcode",
    prompt: "Write G-code for a facing operation on 4140 steel, 3 inch diameter to 2.95 inch",
    expected_elements: ["G50", "G96", "G00", "G01"],
    iso_group: "P",
    weight: 1.0,
  },
  {
    id: "GC-002",
    category: "gcode",
    prompt: "Generate roughing cycle G-code for OD turning, 2 inch to 1.5 inch diameter, 3 inch length",
    expected_elements: ["G71", "G50", "roughing"],
    iso_group: "P",
    weight: 1.0,
  },
  {
    id: "GC-003",
    category: "gcode",
    prompt: "Write threading G-code for 1/2-13 UNC external thread",
    expected_elements: ["G76", "threading", "pitch"],
    weight: 1.2,
  },

  // Physics category
  {
    id: "PH-001",
    category: "physics",
    prompt: "Calculate cutting force for 4140 steel, 0.1 inch depth, 0.010 ipr feed",
    expected_elements: ["kienzle", "force", "kc1"],
    iso_group: "P",
    weight: 1.0,
  },
  {
    id: "PH-002",
    category: "physics",
    prompt: "Estimate tool life for carbide insert turning 304 stainless at 350 SFM",
    expected_elements: ["taylor", "tool life", "minutes"],
    iso_group: "M",
    weight: 1.0,
  },

  // Safety category
  {
    id: "SA-001",
    category: "safety",
    prompt: "What safety considerations for high-speed turning aluminum at 2000 RPM?",
    expected_elements: ["spindle", "clamp", "clearance"],
    iso_group: "N",
    weight: 1.0,
  },
  {
    id: "SA-002",
    category: "safety",
    prompt: "List safety checks before running a threading operation",
    expected_elements: ["verify", "clearance", "spindle"],
    weight: 1.0,
  },

  // Reasoning category
  {
    id: "RE-001",
    category: "reasoning",
    prompt: "Explain why we reduce speed when machining stainless steel vs carbon steel",
    expected_elements: ["because", "work hardening", "thermal"],
    weight: 1.0,
  },
  {
    id: "RE-002",
    category: "reasoning",
    prompt: "When should I use G96 CSS vs G97 constant RPM?",
    expected_elements: ["facing", "diameter", "surface speed"],
    weight: 1.0,
  },

  // Comprehensive category
  {
    id: "CP-001",
    category: "comprehensive",
    prompt: "Plan a complete turning operation for 4140 steel shaft, rough and finish to 1.000 +/- 0.001 diameter",
    expected_elements: ["roughing", "finishing", "G50", "tolerance"],
    iso_group: "P",
    weight: 1.5,
  },
  {
    id: "CP-002",
    category: "comprehensive",
    prompt: "Design a grooving operation for O-ring groove, 0.140 wide x 0.100 deep in aluminum",
    expected_elements: ["grooving", "width", "depth", "feed"],
    iso_group: "N",
    weight: 1.5,
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRABenchmarkSuiteEngine {
  private config: BenchmarkConfig = DEFAULT_CONFIG;
  private testCases: BenchmarkTestCase[] = [...STANDARD_TEST_CASES];
  private results: TestResult[] = [];

  /**
   * Set benchmark configuration
   */
  setConfig(config: Partial<BenchmarkConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): BenchmarkConfig {
    return { ...this.config };
  }

  /**
   * Add custom test case
   */
  addTestCase(testCase: BenchmarkTestCase): void {
    this.testCases.push(testCase);
  }

  /**
   * Get all test cases
   */
  getTestCases(): BenchmarkTestCase[] {
    return this.testCases.filter(tc =>
      this.config.include_categories.includes(tc.category)
    );
  }

  /**
   * Run single test
   */
  runTest(testCase: BenchmarkTestCase, modelOutput: string): TestResult {
    const startTime = Date.now();

    // Run all evaluators
    const physicsEval = latheLoRAPhysicsEvaluatorEngine.evaluate(
      modelOutput,
      { iso_group: testCase.iso_group }
    );

    const safetyEval = latheLoRASafetyEvaluatorEngine.evaluate(
      modelOutput,
      { operation: testCase.category }
    );

    const reasoningEval = latheLoRAReasoningEvaluatorEngine.evaluate(modelOutput);

    // Calculate combined score
    const combinedScore =
      physicsEval.overall_score * this.config.physics_weight +
      safetyEval.overall_score * this.config.safety_weight +
      reasoningEval.overall_score * this.config.reasoning_weight;

    // Check for expected elements
    const lower = modelOutput.toLowerCase();
    const elementsFound = testCase.expected_elements.filter(e =>
      lower.includes(e.toLowerCase())
    ).length;
    const elementBonus = (elementsFound / testCase.expected_elements.length) * 10;

    const finalScore = Math.min(100, combinedScore + elementBonus);
    const passed = finalScore >= this.config.passing_threshold;

    const totalIssues =
      physicsEval.issues.length +
      safetyEval.issues.length +
      reasoningEval.findings.filter(f => f.quality === "weak" || f.quality === "missing").length;

    return {
      test_id: testCase.id,
      category: testCase.category,
      passed,
      physics_score: physicsEval.overall_score,
      safety_score: safetyEval.overall_score,
      reasoning_score: reasoningEval.overall_score,
      combined_score: Math.round(finalScore),
      issues_count: totalIssues,
      execution_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Run full benchmark suite
   */
  runBenchmark(modelOutputs: Map<string, string>): BenchmarkSummary {
    const runId = `bench-${Date.now()}`;
    const startTime = Date.now();
    const results: TestResult[] = [];

    const testCases = this.getTestCases();

    for (const testCase of testCases) {
      const output = modelOutputs.get(testCase.id);
      if (output) {
        const result = this.runTest(testCase, output);
        results.push(result);
      }
    }

    this.results = results;

    // Calculate summary statistics
    const totalTests = results.length;
    const passedTests = results.filter(r => r.passed).length;

    const avgPhysics = results.reduce((sum, r) => sum + r.physics_score, 0) / totalTests || 0;
    const avgSafety = results.reduce((sum, r) => sum + r.safety_score, 0) / totalTests || 0;
    const avgReasoning = results.reduce((sum, r) => sum + r.reasoning_score, 0) / totalTests || 0;
    const avgCombined = results.reduce((sum, r) => sum + r.combined_score, 0) / totalTests || 0;

    // Group by category
    const byCategory: Record<string, { total: number; passed: number; avg_score: number }> = {};
    for (const result of results) {
      if (!byCategory[result.category]) {
        byCategory[result.category] = { total: 0, passed: 0, avg_score: 0 };
      }
      byCategory[result.category].total++;
      if (result.passed) byCategory[result.category].passed++;
      byCategory[result.category].avg_score += result.combined_score;
    }
    for (const cat of Object.keys(byCategory)) {
      byCategory[cat].avg_score /= byCategory[cat].total;
    }

    // Get worst performing tests
    const worstPerforming = [...results]
      .sort((a, b) => a.combined_score - b.combined_score)
      .slice(0, 3);

    return {
      run_id: runId,
      timestamp: Date.now(),
      total_tests: totalTests,
      passed_tests: passedTests,
      pass_rate: totalTests > 0 ? (passedTests / totalTests) * 100 : 0,
      avg_physics_score: Math.round(avgPhysics),
      avg_safety_score: Math.round(avgSafety),
      avg_reasoning_score: Math.round(avgReasoning),
      avg_combined_score: Math.round(avgCombined),
      by_category: byCategory,
      worst_performing: worstPerforming,
      execution_time_ms: Date.now() - startTime,
    };
  }

  /**
   * Get test results
   */
  getResults(): TestResult[] {
    return [...this.results];
  }

  /**
   * Generate benchmark report
   */
  generateReport(summary: BenchmarkSummary): string {
    const lines = [
      "# LatheLoRA Benchmark Report",
      "",
      `Run ID: ${summary.run_id}`,
      `Date: ${new Date(summary.timestamp).toISOString()}`,
      "",
      "## Summary",
      `- Total Tests: ${summary.total_tests}`,
      `- Passed: ${summary.passed_tests} (${summary.pass_rate.toFixed(1)}%)`,
      `- Avg Combined Score: ${summary.avg_combined_score}/100`,
      "",
      "## Dimension Scores",
      `- Physics: ${summary.avg_physics_score}/100`,
      `- Safety: ${summary.avg_safety_score}/100`,
      `- Reasoning: ${summary.avg_reasoning_score}/100`,
      "",
      "## By Category",
    ];

    for (const [cat, data] of Object.entries(summary.by_category)) {
      lines.push(`- ${cat}: ${data.passed}/${data.total} passed, avg ${data.avg_score.toFixed(0)}`);
    }

    if (summary.worst_performing.length > 0) {
      lines.push("", "## Worst Performing Tests");
      for (const test of summary.worst_performing) {
        lines.push(`- ${test.test_id}: ${test.combined_score}/100 (${test.category})`);
      }
    }

    lines.push("", `Execution time: ${summary.execution_time_ms}ms`);

    return lines.join("\n");
  }

  /**
   * Check if model passes benchmark
   */
  passesBenchmark(summary: BenchmarkSummary, minPassRate: number = 80): boolean {
    return summary.pass_rate >= minPassRate && summary.avg_combined_score >= this.config.passing_threshold;
  }

  /**
   * Get quick summary string
   */
  getSummary(summary: BenchmarkSummary): string {
    const status = this.passesBenchmark(summary) ? "PASS" : "FAIL";
    return [
      `[${status}] ${summary.passed_tests}/${summary.total_tests} (${summary.pass_rate.toFixed(0)}%)`,
      `Combined: ${summary.avg_combined_score}`,
      `Physics: ${summary.avg_physics_score}`,
      `Safety: ${summary.avg_safety_score}`,
      `Reasoning: ${summary.avg_reasoning_score}`,
    ].join(" | ");
  }

  /**
   * Reset test cases to defaults
   */
  reset(): void {
    this.testCases = [...STANDARD_TEST_CASES];
    this.results = [];
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRABenchmarkSuiteEngine = new LatheLoRABenchmarkSuiteEngine();
