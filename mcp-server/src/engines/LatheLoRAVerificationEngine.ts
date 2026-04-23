/**
 * LatheLoRAVerificationEngine — LATHE-LORA-MS0 U-LLR24
 * ====================================================
 *
 * Verifies LatheLoRA deployments meet quality and safety standards.
 * Performs comprehensive checks before approving production use.
 *
 * Verification dimensions:
 *   - Model availability and responsiveness
 *   - Physics correctness validation
 *   - Safety compliance checking
 *   - Reasoning quality assessment
 *   - G-code generation validation
 *   - Performance benchmarking
 *
 * @module engines/LatheLoRAVerificationEngine
 * @version 1.0.0
 */

import { log } from "../utils/Logger.js";

// ============================================================================
// TYPES
// ============================================================================

/** Verification status */
export type VerificationStatus = "pending" | "running" | "passed" | "failed" | "warning";

/** Verification category */
export type VerificationCategory =
  | "availability"
  | "physics"
  | "safety"
  | "reasoning"
  | "gcode"
  | "performance";

/** Single verification result */
export interface VerificationResult {
  category: VerificationCategory;
  name: string;
  passed: boolean;
  score: number;  // 0-100
  details: string;
  critical: boolean;
  execution_time_ms: number;
}

/** Verification suite result */
export interface VerificationSuiteResult {
  id: string;
  model_id: string;
  timestamp: number;
  status: VerificationStatus;
  overall_score: number;
  results: VerificationResult[];
  summary: {
    total: number;
    passed: number;
    failed: number;
    critical_failures: number;
  };
  recommendation: "approve" | "conditional" | "reject";
  notes: string[];
}

/** Verification test case */
export interface VerificationTestCase {
  id: string;
  category: VerificationCategory;
  name: string;
  prompt: string;
  validation: {
    type: "contains" | "regex" | "range" | "custom";
    expected?: string[] | string;
    min?: number;
    max?: number;
  };
  critical: boolean;
  timeout_ms: number;
}

/** Verification config */
export interface VerificationConfig {
  pass_threshold: number;
  critical_must_pass: boolean;
  timeout_ms: number;
  parallel_execution: boolean;
  categories: VerificationCategory[];
}

// ============================================================================
// CONSTANTS
// ============================================================================

const DEFAULT_CONFIG: VerificationConfig = {
  pass_threshold: 80,
  critical_must_pass: true,
  timeout_ms: 60000,
  parallel_execution: true,
  categories: ["availability", "physics", "safety", "reasoning", "gcode", "performance"],
};

/** Standard verification test cases */
const STANDARD_TEST_CASES: VerificationTestCase[] = [
  // Availability
  {
    id: "AVAIL-001",
    category: "availability",
    name: "Model responds to ping",
    prompt: "Hello",
    validation: { type: "contains", expected: ["hello", "hi", "greetings", "lathe", "assist"] },
    critical: true,
    timeout_ms: 5000,
  },
  {
    id: "AVAIL-002",
    category: "availability",
    name: "Model handles empty input",
    prompt: "",
    validation: { type: "contains", expected: ["please", "provide", "input", "help", "ask"] },
    critical: false,
    timeout_ms: 5000,
  },

  // Physics
  {
    id: "PHYS-001",
    category: "physics",
    name: "SFM calculation for steel",
    prompt: "What is the recommended surface speed in SFM for roughing 4140 steel with carbide inserts?",
    validation: { type: "range", min: 300, max: 500 },
    critical: true,
    timeout_ms: 10000,
  },
  {
    id: "PHYS-002",
    category: "physics",
    name: "Feed rate recommendation",
    prompt: "What feed rate in IPR should I use for roughing 4140 steel with a 0.032 nose radius insert?",
    validation: { type: "range", min: 0.008, max: 0.020 },
    critical: true,
    timeout_ms: 10000,
  },
  {
    id: "PHYS-003",
    category: "physics",
    name: "Kienzle model mention",
    prompt: "How do you calculate cutting force for turning operations?",
    validation: { type: "contains", expected: ["Kienzle", "kc1", "force", "cutting"] },
    critical: false,
    timeout_ms: 10000,
  },
  {
    id: "PHYS-004",
    category: "physics",
    name: "Taylor tool life",
    prompt: "How do you estimate tool life for carbide turning inserts?",
    validation: { type: "contains", expected: ["Taylor", "tool life", "VT", "speed", "wear"] },
    critical: false,
    timeout_ms: 10000,
  },

  // Safety
  {
    id: "SAFE-001",
    category: "safety",
    name: "G50 spindle clamp",
    prompt: "What G-code limits maximum spindle speed to 3000 RPM?",
    validation: { type: "contains", expected: ["G50", "S3000"] },
    critical: true,
    timeout_ms: 10000,
  },
  {
    id: "SAFE-002",
    category: "safety",
    name: "Clearance awareness",
    prompt: "What should I verify before running a rapid move (G00)?",
    validation: { type: "contains", expected: ["clearance", "collision", "path", "safe"] },
    critical: true,
    timeout_ms: 10000,
  },
  {
    id: "SAFE-003",
    category: "safety",
    name: "Chuck speed limits",
    prompt: "What happens if I exceed the chuck's maximum RPM rating?",
    validation: { type: "contains", expected: ["danger", "failure", "jaws", "centrifugal", "unsafe", "eject"] },
    critical: false,
    timeout_ms: 10000,
  },

  // Reasoning
  {
    id: "REAS-001",
    category: "reasoning",
    name: "Causal reasoning",
    prompt: "Why do we reduce cutting speed when machining stainless steel compared to carbon steel?",
    validation: { type: "contains", expected: ["because", "work hardening", "heat", "thermal"] },
    critical: false,
    timeout_ms: 15000,
  },
  {
    id: "REAS-002",
    category: "reasoning",
    name: "Step-by-step explanation",
    prompt: "Explain the steps to set up a facing operation on a CNC lathe.",
    validation: { type: "contains", expected: ["first", "then", "step", "verify", "tool"] },
    critical: false,
    timeout_ms: 15000,
  },

  // G-code
  {
    id: "GCODE-001",
    category: "gcode",
    name: "Facing code generation",
    prompt: "Write G-code for facing a 2 inch diameter part from 2.0 to 1.95 inches on an Okuma lathe.",
    validation: { type: "contains", expected: ["G50", "G96", "G00", "G01", "X", "Z"] },
    critical: true,
    timeout_ms: 20000,
  },
  {
    id: "GCODE-002",
    category: "gcode",
    name: "CSS mode usage",
    prompt: "Write G-code to turn OD at constant surface speed of 400 SFM.",
    validation: { type: "contains", expected: ["G96", "S400", "G50"] },
    critical: true,
    timeout_ms: 15000,
  },
  {
    id: "GCODE-003",
    category: "gcode",
    name: "Program structure",
    prompt: "Show a complete program structure for an Okuma OSP lathe.",
    validation: { type: "contains", expected: ["G50", "M03", "M30", "G28"] },
    critical: false,
    timeout_ms: 20000,
  },

  // Performance
  {
    id: "PERF-001",
    category: "performance",
    name: "Response time",
    prompt: "What is 400 SFM in meters per minute?",
    validation: { type: "range", min: 120, max: 130 },
    critical: false,
    timeout_ms: 5000,
  },
];

// ============================================================================
// ENGINE CLASS
// ============================================================================

class LatheLoRAVerificationEngine {
  private config: VerificationConfig = DEFAULT_CONFIG;
  private testCases: VerificationTestCase[] = [...STANDARD_TEST_CASES];
  private history: VerificationSuiteResult[] = [];

  /**
   * Set configuration
   */
  setConfig(config: Partial<VerificationConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get configuration
   */
  getConfig(): VerificationConfig {
    return { ...this.config };
  }

  /**
   * Add custom test case
   */
  addTestCase(testCase: VerificationTestCase): void {
    this.testCases.push(testCase);
  }

  /**
   * Get all test cases
   */
  getTestCases(category?: VerificationCategory): VerificationTestCase[] {
    if (category) {
      return this.testCases.filter(tc => tc.category === category);
    }
    return [...this.testCases];
  }

  /**
   * Run single verification test
   */
  runTest(
    testCase: VerificationTestCase,
    modelResponse: string,
    executionTimeMs: number
  ): VerificationResult {
    let passed = false;
    let score = 0;
    let details = "";

    const response = modelResponse.toLowerCase();

    switch (testCase.validation.type) {
      case "contains": {
        const expected = testCase.validation.expected as string[];
        const found = expected.filter(e => response.includes(e.toLowerCase()));
        score = (found.length / expected.length) * 100;
        passed = score >= 60;
        details = `Found ${found.length}/${expected.length} expected keywords: ${found.join(", ")}`;
        break;
      }

      case "regex": {
        const pattern = new RegExp(testCase.validation.expected as string, "i");
        passed = pattern.test(modelResponse);
        score = passed ? 100 : 0;
        details = passed ? "Pattern matched" : "Pattern not found";
        break;
      }

      case "range": {
        // Extract first number from response
        const numbers = modelResponse.match(/[\d.]+/g);
        if (numbers && numbers.length > 0) {
          const value = parseFloat(numbers[0]);
          const min = testCase.validation.min ?? -Infinity;
          const max = testCase.validation.max ?? Infinity;
          passed = value >= min && value <= max;
          score = passed ? 100 : 0;
          details = `Value ${value} ${passed ? "within" : "outside"} range [${min}, ${max}]`;
        } else {
          passed = false;
          score = 0;
          details = "No numeric value found in response";
        }
        break;
      }

      default:
        details = "Unknown validation type";
    }

    // Check for timeout
    if (executionTimeMs > testCase.timeout_ms) {
      passed = false;
      score = Math.max(0, score - 30);
      details += ` (TIMEOUT: ${executionTimeMs}ms > ${testCase.timeout_ms}ms)`;
    }

    return {
      category: testCase.category,
      name: testCase.name,
      passed,
      score,
      details,
      critical: testCase.critical,
      execution_time_ms: executionTimeMs,
    };
  }

  /**
   * Create verification suite result from individual results
   */
  createSuiteResult(
    modelId: string,
    results: VerificationResult[]
  ): VerificationSuiteResult {
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;
    const criticalFailures = results.filter(r => !r.passed && r.critical).length;
    const overallScore = results.reduce((sum, r) => sum + r.score, 0) / results.length;

    let status: VerificationStatus;
    let recommendation: "approve" | "conditional" | "reject";
    const notes: string[] = [];

    if (criticalFailures > 0 && this.config.critical_must_pass) {
      status = "failed";
      recommendation = "reject";
      notes.push(`${criticalFailures} critical test(s) failed`);
    } else if (overallScore >= this.config.pass_threshold) {
      status = "passed";
      recommendation = "approve";
      notes.push("All thresholds met");
    } else if (overallScore >= this.config.pass_threshold * 0.8) {
      status = "warning";
      recommendation = "conditional";
      notes.push(`Score ${overallScore.toFixed(1)} below threshold ${this.config.pass_threshold}`);
    } else {
      status = "failed";
      recommendation = "reject";
      notes.push(`Score ${overallScore.toFixed(1)} significantly below threshold`);
    }

    // Add category-specific notes
    const categories = [...new Set(results.map(r => r.category))];
    for (const cat of categories) {
      const catResults = results.filter(r => r.category === cat);
      const catScore = catResults.reduce((s, r) => s + r.score, 0) / catResults.length;
      if (catScore < 60) {
        notes.push(`Low ${cat} score: ${catScore.toFixed(1)}`);
      }
    }

    const suiteResult: VerificationSuiteResult = {
      id: `verify-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      model_id: modelId,
      timestamp: Date.now(),
      status,
      overall_score: overallScore,
      results,
      summary: {
        total: results.length,
        passed,
        failed,
        critical_failures: criticalFailures,
      },
      recommendation,
      notes,
    };

    this.history.push(suiteResult);
    return suiteResult;
  }

  /**
   * Get prompts for verification
   */
  getVerificationPrompts(categories?: VerificationCategory[]): Array<{ id: string; prompt: string }> {
    const cats = categories || this.config.categories;
    return this.testCases
      .filter(tc => cats.includes(tc.category))
      .map(tc => ({ id: tc.id, prompt: tc.prompt }));
  }

  /**
   * Process responses and create suite result
   */
  processResponses(
    modelId: string,
    responses: Array<{ id: string; response: string; execution_time_ms: number }>
  ): VerificationSuiteResult {
    const results: VerificationResult[] = [];

    for (const resp of responses) {
      const testCase = this.testCases.find(tc => tc.id === resp.id);
      if (testCase) {
        const result = this.runTest(testCase, resp.response, resp.execution_time_ms);
        results.push(result);
      }
    }

    return this.createSuiteResult(modelId, results);
  }

  /**
   * Get verification history
   */
  getHistory(modelId?: string, limit: number = 10): VerificationSuiteResult[] {
    const filtered = modelId
      ? this.history.filter(h => h.model_id === modelId)
      : this.history;
    return filtered.slice(-limit);
  }

  /**
   * Get latest verification for model
   */
  getLatest(modelId: string): VerificationSuiteResult | undefined {
    const modelHistory = this.history.filter(h => h.model_id === modelId);
    return modelHistory[modelHistory.length - 1];
  }

  /**
   * Check if model is verified
   */
  isVerified(modelId: string): boolean {
    const latest = this.getLatest(modelId);
    return latest?.status === "passed";
  }

  /**
   * Generate verification report
   */
  generateReport(result: VerificationSuiteResult): string {
    const lines = [
      `# LatheLoRA Verification Report`,
      ``,
      `**Model:** ${result.model_id}`,
      `**Date:** ${new Date(result.timestamp).toISOString()}`,
      `**Status:** ${result.status.toUpperCase()}`,
      `**Recommendation:** ${result.recommendation.toUpperCase()}`,
      ``,
      `## Summary`,
      ``,
      `| Metric | Value |`,
      `|--------|-------|`,
      `| Overall Score | ${result.overall_score.toFixed(1)}/100 |`,
      `| Tests Passed | ${result.summary.passed}/${result.summary.total} |`,
      `| Tests Failed | ${result.summary.failed} |`,
      `| Critical Failures | ${result.summary.critical_failures} |`,
      ``,
      `## Results by Category`,
      ``,
    ];

    // Group by category
    const categories = [...new Set(result.results.map(r => r.category))];
    for (const cat of categories) {
      const catResults = result.results.filter(r => r.category === cat);
      const catScore = catResults.reduce((s, r) => s + r.score, 0) / catResults.length;

      lines.push(`### ${cat.charAt(0).toUpperCase() + cat.slice(1)} (${catScore.toFixed(1)}/100)`);
      lines.push(``);
      lines.push(`| Test | Score | Status | Details |`);
      lines.push(`|------|-------|--------|---------|`);

      for (const r of catResults) {
        const status = r.passed ? "✓" : (r.critical ? "✗ CRITICAL" : "✗");
        lines.push(`| ${r.name} | ${r.score.toFixed(0)} | ${status} | ${r.details} |`);
      }
      lines.push(``);
    }

    if (result.notes.length > 0) {
      lines.push(`## Notes`);
      lines.push(``);
      for (const note of result.notes) {
        lines.push(`- ${note}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Get quick summary
   */
  getSummary(result: VerificationSuiteResult): string {
    return [
      `[${result.status.toUpperCase()}]`,
      `Score: ${result.overall_score.toFixed(1)}`,
      `Passed: ${result.summary.passed}/${result.summary.total}`,
      `Critical: ${result.summary.critical_failures} failed`,
      `→ ${result.recommendation.toUpperCase()}`,
    ].join(" | ");
  }

  /**
   * Reset engine state
   */
  reset(): void {
    this.testCases = [...STANDARD_TEST_CASES];
    this.history = [];
    this.config = DEFAULT_CONFIG;
  }
}

// ============================================================================
// SINGLETON EXPORT
// ============================================================================

export const latheLoRAVerificationEngine = new LatheLoRAVerificationEngine();
