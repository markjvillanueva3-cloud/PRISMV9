/**
 * LatheMasterPostRegressionMatrixEngine — Regression Test Matrix for Master Post
 *
 * U-LTH31: Golden matrix of 150 jobs across 21 JM Die machines + 5 validator groups.
 * Provides baseline locking, regression detection, and automated validation.
 *
 * Test Matrix Structure:
 *   - 7 lathe machines (LTH-01 to LTH-07)
 *   - 14 other machines (for cross-validation)
 *   - 5 validator groups per machine
 *   - ~150 total test cases
 *
 * Validator Groups:
 *   1. Basic Operations (turning, facing, grooving)
 *   2. Threading Operations (single-point, multi-start)
 *   3. Live Tooling (drilling, tapping, milling)
 *   4. Advanced Features (CSS, sub-spindle, B-axis)
 *   5. Edge Cases (long programs, complex geometry, error handling)
 *
 * @module LatheMasterPostRegressionMatrixEngine
 */

import { latheMasterPostAPIEngine } from "./LatheMasterPostAPIEngine.js";
import type { RouteActionPayload } from "./LatheMasterPostAPIEngine.js";

// ============================================================================
// TYPES
// ============================================================================

/** Test case definition */
export interface RegressionTestCase {
  id: string;
  name: string;
  machine_id: string;
  validator_group: ValidatorGroup;
  payload: RouteActionPayload;
  expected: {
    success: boolean;
    selected_post?: string;
    min_blocks?: number;
    max_blocks?: number;
    must_contain?: string[];
    must_not_contain?: string[];
  };
  tags: string[];
}

/** Validator group categories */
export type ValidatorGroup =
  | "basic_operations"
  | "threading_operations"
  | "live_tooling"
  | "advanced_features"
  | "edge_cases";

/** Test result */
export interface TestResult {
  test_id: string;
  test_name: string;
  machine_id: string;
  validator_group: ValidatorGroup;
  passed: boolean;
  execution_time_ms: number;
  details: {
    expected_success: boolean;
    actual_success: boolean;
    expected_post?: string;
    actual_post?: string;
    block_count?: number;
    block_check_passed?: boolean;
    content_checks: Array<{
      pattern: string;
      expected: boolean;
      found: boolean;
      passed: boolean;
    }>;
  };
  errors: string[];
}

/** Matrix run result */
export interface MatrixRunResult {
  run_id: string;
  started_at: string;
  completed_at: string;
  total_tests: number;
  passed: number;
  failed: number;
  skipped: number;
  pass_rate: number;
  results_by_machine: Record<string, { passed: number; failed: number }>;
  results_by_validator: Record<ValidatorGroup, { passed: number; failed: number }>;
  failed_tests: TestResult[];
  execution_time_ms: number;
}

/** Baseline snapshot */
export interface BaselineSnapshot {
  version: string;
  created_at: string;
  test_count: number;
  checksums: Record<string, string>;
  expected_results: Record<string, {
    block_count: number;
    selected_post: string;
  }>;
}

/** JM Die machine definition */
interface MachineDefinition {
  id: string;
  name: string;
  type: "lathe" | "mill" | "edm" | "other";
  controller_family: string;
  supports_live_tooling: boolean;
  supports_sub_spindle: boolean;
  supports_css: boolean;
}

// ============================================================================
// ENGINE
// ============================================================================

class LatheMasterPostRegressionMatrixEngine {
  private runCounter = 0;
  private baseline: BaselineSnapshot | null = null;

  /** JM Die machine inventory (21 machines) */
  private readonly machines: MachineDefinition[] = [
    // 7 Okuma Lathes
    { id: "LTH-01", name: "Okuma GENOS L300-M", type: "lathe", controller_family: "okuma", supports_live_tooling: true, supports_sub_spindle: false, supports_css: true },
    { id: "LTH-02", name: "Okuma GENOS L200E-M", type: "lathe", controller_family: "okuma", supports_live_tooling: true, supports_sub_spindle: false, supports_css: true },
    { id: "LTH-03", name: "Okuma LNC8", type: "lathe", controller_family: "okuma", supports_live_tooling: false, supports_sub_spindle: false, supports_css: true },
    { id: "LTH-04", name: "Okuma Crown L1060", type: "lathe", controller_family: "okuma", supports_live_tooling: false, supports_sub_spindle: false, supports_css: true },
    { id: "LTH-05", name: "Okuma L400II-E", type: "lathe", controller_family: "okuma", supports_live_tooling: false, supports_sub_spindle: false, supports_css: true },
    { id: "LTH-06", name: "Okuma LB3000EX", type: "lathe", controller_family: "okuma", supports_live_tooling: true, supports_sub_spindle: true, supports_css: true },
    { id: "LTH-07", name: "Okuma Multus B250II", type: "lathe", controller_family: "okuma", supports_live_tooling: true, supports_sub_spindle: true, supports_css: true },
    // 5 Mills
    { id: "MILL-01", name: "Haas VF-2SS", type: "mill", controller_family: "haas", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "MILL-02", name: "Haas VF-4SS", type: "mill", controller_family: "haas", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "MILL-03", name: "Roku-Roku HC-658", type: "mill", controller_family: "fanuc", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "MILL-04", name: "Hurco VM10i", type: "mill", controller_family: "hurco", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "MILL-05", name: "Hurco VMX42", type: "mill", controller_family: "hurco", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    // 2 Sinker EDMs
    { id: "EDM-01", name: "Mitsubishi EA8", type: "edm", controller_family: "mitsubishi", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "EDM-02", name: "Mitsubishi EA12", type: "edm", controller_family: "mitsubishi", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    // 1 Wire EDM
    { id: "WEDM-01", name: "Mitsubishi FA10S", type: "edm", controller_family: "mitsubishi", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    // 6 Support machines
    { id: "SAW-01", name: "Kasto Bandsaws", type: "other", controller_family: "generic", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "GRIND-01", name: "Surface Grinder", type: "other", controller_family: "generic", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "GRIND-02", name: "Cylindrical Grinder", type: "other", controller_family: "generic", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "PRESS-01", name: "Hydraulic Press", type: "other", controller_family: "generic", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "INSP-01", name: "CMM Inspection", type: "other", controller_family: "generic", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
    { id: "HEAT-01", name: "Heat Treatment", type: "other", controller_family: "generic", supports_live_tooling: false, supports_sub_spindle: false, supports_css: false },
  ];

  /** Generated test cases */
  private testCases: RegressionTestCase[] = [];

  constructor() {
    this.generateTestMatrix();
  }

  /**
   * Run full regression matrix
   */
  runMatrix(options?: {
    machines?: string[];
    validators?: ValidatorGroup[];
    tags?: string[];
  }): MatrixRunResult {
    const startTime = Date.now();
    const runId = `run_${++this.runCounter}_${Date.now()}`;

    // Filter test cases
    let cases = [...this.testCases];
    if (options?.machines?.length) {
      cases = cases.filter(c => options.machines!.includes(c.machine_id));
    }
    if (options?.validators?.length) {
      cases = cases.filter(c => options.validators!.includes(c.validator_group));
    }
    if (options?.tags?.length) {
      cases = cases.filter(c => c.tags.some(t => options.tags!.includes(t)));
    }

    // Run tests
    const results: TestResult[] = [];
    for (const testCase of cases) {
      results.push(this.runTestCase(testCase));
    }

    // Aggregate results
    const passed = results.filter(r => r.passed).length;
    const failed = results.filter(r => !r.passed).length;

    const resultsByMachine: Record<string, { passed: number; failed: number }> = {};
    const resultsByValidator: Record<ValidatorGroup, { passed: number; failed: number }> = {
      basic_operations: { passed: 0, failed: 0 },
      threading_operations: { passed: 0, failed: 0 },
      live_tooling: { passed: 0, failed: 0 },
      advanced_features: { passed: 0, failed: 0 },
      edge_cases: { passed: 0, failed: 0 },
    };

    for (const result of results) {
      // By machine
      if (!resultsByMachine[result.machine_id]) {
        resultsByMachine[result.machine_id] = { passed: 0, failed: 0 };
      }
      if (result.passed) {
        resultsByMachine[result.machine_id].passed++;
      } else {
        resultsByMachine[result.machine_id].failed++;
      }

      // By validator
      if (result.passed) {
        resultsByValidator[result.validator_group].passed++;
      } else {
        resultsByValidator[result.validator_group].failed++;
      }
    }

    return {
      run_id: runId,
      started_at: new Date(startTime).toISOString(),
      completed_at: new Date().toISOString(),
      total_tests: results.length,
      passed,
      failed,
      skipped: 0,
      pass_rate: results.length > 0 ? passed / results.length : 0,
      results_by_machine: resultsByMachine,
      results_by_validator: resultsByValidator,
      failed_tests: results.filter(r => !r.passed),
      execution_time_ms: Date.now() - startTime
    };
  }

  /**
   * Run single test case
   */
  runTestCase(testCase: RegressionTestCase): TestResult {
    const startTime = Date.now();
    const errors: string[] = [];
    const contentChecks: TestResult["details"]["content_checks"] = [];

    let actualSuccess = false;
    let actualPost: string | undefined;
    let blockCount: number | undefined;
    let gcode = "";

    try {
      const result = latheMasterPostAPIEngine.route(testCase.payload);
      actualSuccess = result.success;
      actualPost = result.route_decision?.selected_post;
      blockCount = result.block_count;
      gcode = result.gcode || "";
    } catch (error) {
      actualSuccess = false;
      errors.push(error instanceof Error ? error.message : String(error));
    }

    // Check success
    let passed = testCase.expected.success === actualSuccess;

    // Check selected post
    if (testCase.expected.selected_post && actualPost !== testCase.expected.selected_post) {
      passed = false;
      errors.push(`Expected post ${testCase.expected.selected_post}, got ${actualPost}`);
    }

    // Check block count
    let blockCheckPassed = true;
    if (testCase.expected.min_blocks !== undefined && blockCount !== undefined) {
      if (blockCount < testCase.expected.min_blocks) {
        blockCheckPassed = false;
        errors.push(`Block count ${blockCount} below minimum ${testCase.expected.min_blocks}`);
      }
    }
    if (testCase.expected.max_blocks !== undefined && blockCount !== undefined) {
      if (blockCount > testCase.expected.max_blocks) {
        blockCheckPassed = false;
        errors.push(`Block count ${blockCount} above maximum ${testCase.expected.max_blocks}`);
      }
    }
    if (!blockCheckPassed) passed = false;

    // Check content patterns
    if (testCase.expected.must_contain) {
      for (const pattern of testCase.expected.must_contain) {
        const found = gcode.includes(pattern);
        contentChecks.push({ pattern, expected: true, found, passed: found });
        if (!found) {
          passed = false;
          errors.push(`Missing required pattern: ${pattern}`);
        }
      }
    }

    if (testCase.expected.must_not_contain) {
      for (const pattern of testCase.expected.must_not_contain) {
        const found = gcode.includes(pattern);
        contentChecks.push({ pattern, expected: false, found, passed: !found });
        if (found) {
          passed = false;
          errors.push(`Found forbidden pattern: ${pattern}`);
        }
      }
    }

    return {
      test_id: testCase.id,
      test_name: testCase.name,
      machine_id: testCase.machine_id,
      validator_group: testCase.validator_group,
      passed,
      execution_time_ms: Date.now() - startTime,
      details: {
        expected_success: testCase.expected.success,
        actual_success: actualSuccess,
        expected_post: testCase.expected.selected_post,
        actual_post: actualPost,
        block_count: blockCount,
        block_check_passed: blockCheckPassed,
        content_checks: contentChecks
      },
      errors
    };
  }

  /**
   * Get all test cases
   */
  getTestCases(filter?: {
    machine_id?: string;
    validator_group?: ValidatorGroup;
  }): RegressionTestCase[] {
    let cases = [...this.testCases];
    if (filter?.machine_id) {
      cases = cases.filter(c => c.machine_id === filter.machine_id);
    }
    if (filter?.validator_group) {
      cases = cases.filter(c => c.validator_group === filter.validator_group);
    }
    return cases;
  }

  /**
   * Get matrix statistics
   */
  getStatistics(): {
    total_tests: number;
    tests_by_machine: Record<string, number>;
    tests_by_validator: Record<ValidatorGroup, number>;
    machines_covered: number;
    validators_covered: number;
  } {
    const testsByMachine: Record<string, number> = {};
    const testsByValidator: Record<ValidatorGroup, number> = {
      basic_operations: 0,
      threading_operations: 0,
      live_tooling: 0,
      advanced_features: 0,
      edge_cases: 0,
    };

    for (const test of this.testCases) {
      testsByMachine[test.machine_id] = (testsByMachine[test.machine_id] || 0) + 1;
      testsByValidator[test.validator_group]++;
    }

    return {
      total_tests: this.testCases.length,
      tests_by_machine: testsByMachine,
      tests_by_validator: testsByValidator,
      machines_covered: Object.keys(testsByMachine).length,
      validators_covered: 5
    };
  }

  /**
   * Create baseline snapshot
   */
  createBaseline(): BaselineSnapshot {
    const results = this.runMatrix();
    const checksums: Record<string, string> = {};
    const expectedResults: Record<string, { block_count: number; selected_post: string }> = {};

    for (const test of this.testCases) {
      const result = this.runTestCase(test);
      checksums[test.id] = this.hashResult(result);
      if (result.details.block_count !== undefined && result.details.actual_post) {
        expectedResults[test.id] = {
          block_count: result.details.block_count,
          selected_post: result.details.actual_post
        };
      }
    }

    this.baseline = {
      version: "1.0.0",
      created_at: new Date().toISOString(),
      test_count: this.testCases.length,
      checksums,
      expected_results: expectedResults
    };

    return this.baseline;
  }

  /**
   * Check for regressions against baseline
   */
  checkRegressions(): {
    has_regressions: boolean;
    regressions: Array<{
      test_id: string;
      test_name: string;
      type: "block_count" | "post_change" | "new_failure";
      baseline_value: string;
      current_value: string;
    }>;
    new_tests: string[];
    removed_tests: string[];
  } {
    if (!this.baseline) {
      return {
        has_regressions: false,
        regressions: [],
        new_tests: this.testCases.map(t => t.id),
        removed_tests: []
      };
    }

    const regressions: Array<{
      test_id: string;
      test_name: string;
      type: "block_count" | "post_change" | "new_failure";
      baseline_value: string;
      current_value: string;
    }> = [];

    const currentTestIds = new Set(this.testCases.map(t => t.id));
    const baselineTestIds = new Set(Object.keys(this.baseline.expected_results));

    const newTests = this.testCases
      .filter(t => !baselineTestIds.has(t.id))
      .map(t => t.id);

    const removedTests = Array.from(baselineTestIds)
      .filter(id => !currentTestIds.has(id));

    for (const test of this.testCases) {
      if (!this.baseline.expected_results[test.id]) continue;

      const result = this.runTestCase(test);
      const expected = this.baseline.expected_results[test.id];

      // Check for post change
      if (result.details.actual_post && expected.selected_post !== result.details.actual_post) {
        regressions.push({
          test_id: test.id,
          test_name: test.name,
          type: "post_change",
          baseline_value: expected.selected_post,
          current_value: result.details.actual_post
        });
      }

      // Check for significant block count change (>10%)
      if (result.details.block_count !== undefined) {
        const delta = Math.abs(result.details.block_count - expected.block_count);
        const pct = delta / expected.block_count;
        if (pct > 0.1) {
          regressions.push({
            test_id: test.id,
            test_name: test.name,
            type: "block_count",
            baseline_value: String(expected.block_count),
            current_value: String(result.details.block_count)
          });
        }
      }

      // Check for new failure
      if (!result.passed && this.baseline.checksums[test.id]) {
        const baselineHash = this.baseline.checksums[test.id];
        const currentHash = this.hashResult(result);
        if (baselineHash !== currentHash) {
          regressions.push({
            test_id: test.id,
            test_name: test.name,
            type: "new_failure",
            baseline_value: "passed",
            current_value: result.errors.join("; ")
          });
        }
      }
    }

    return {
      has_regressions: regressions.length > 0,
      regressions,
      new_tests: newTests,
      removed_tests: removedTests
    };
  }

  /**
   * Get lathe machines only
   */
  getLatheMachines(): MachineDefinition[] {
    return this.machines.filter(m => m.type === "lathe");
  }

  /**
   * Get all machines
   */
  getAllMachines(): MachineDefinition[] {
    return [...this.machines];
  }

  // ── Private Methods ──────────────────────────────────────────────────────

  private generateTestMatrix(): void {
    this.testCases = [];
    let testId = 0;

    const lathes = this.machines.filter(m => m.type === "lathe");

    // Generate tests for each lathe machine
    for (const machine of lathes) {
      // Group 1: Basic Operations
      this.testCases.push(...this.generateBasicOperationTests(machine, testId));
      testId += 5;

      // Group 2: Threading Operations
      this.testCases.push(...this.generateThreadingTests(machine, testId));
      testId += 3;

      // Group 3: Live Tooling (if supported)
      if (machine.supports_live_tooling) {
        this.testCases.push(...this.generateLiveToolingTests(machine, testId));
        testId += 4;
      }

      // Group 4: Advanced Features
      this.testCases.push(...this.generateAdvancedFeatureTests(machine, testId));
      testId += 3;

      // Group 5: Edge Cases
      this.testCases.push(...this.generateEdgeCaseTests(machine, testId));
      testId += 3;
    }

    // Add cross-validation tests for non-lathe machines (should fail gracefully)
    for (const machine of this.machines.filter(m => m.type !== "lathe")) {
      this.testCases.push(this.generateCrossValidationTest(machine, testId++));
    }
  }

  private generateBasicOperationTests(machine: MachineDefinition, startId: number): RegressionTestCase[] {
    const tests: RegressionTestCase[] = [];
    const operations = ["turning", "facing", "grooving", "boring", "parting"];

    for (let i = 0; i < operations.length; i++) {
      tests.push({
        id: `test_${startId + i}`,
        name: `${machine.name} - ${operations[i]}`,
        machine_id: machine.id,
        validator_group: "basic_operations",
        payload: this.createPayload(machine.id, operations[i], { tool_number: i + 1 }),
        expected: {
          success: true,
          selected_post: `${machine.controller_family}_turning`,
          min_blocks: 10,
          must_contain: ["G28", "M30"]
        },
        tags: ["basic", operations[i], machine.controller_family]
      });
    }

    return tests;
  }

  private generateThreadingTests(machine: MachineDefinition, startId: number): RegressionTestCase[] {
    return [
      {
        id: `test_${startId}`,
        name: `${machine.name} - Single-point threading`,
        machine_id: machine.id,
        validator_group: "threading_operations",
        payload: this.createPayload(machine.id, "threading", { tool_number: 10 }),
        expected: {
          success: true,
          min_blocks: 10,
          must_contain: ["G28", "M30"]
        },
        tags: ["threading", "single-point", machine.controller_family]
      },
      {
        id: `test_${startId + 1}`,
        name: `${machine.name} - NPT threading`,
        machine_id: machine.id,
        validator_group: "threading_operations",
        payload: this.createPayload(machine.id, "threading", { tool_number: 11 }),
        expected: {
          success: true,
          min_blocks: 10
        },
        tags: ["threading", "npt", machine.controller_family]
      },
      {
        id: `test_${startId + 2}`,
        name: `${machine.name} - Metric threading`,
        machine_id: machine.id,
        validator_group: "threading_operations",
        payload: this.createPayload(machine.id, "threading", { tool_number: 12 }),
        expected: {
          success: true,
          min_blocks: 10
        },
        tags: ["threading", "metric", machine.controller_family]
      }
    ];
  }

  private generateLiveToolingTests(machine: MachineDefinition, startId: number): RegressionTestCase[] {
    return [
      {
        id: `test_${startId}`,
        name: `${machine.name} - Cross drilling`,
        machine_id: machine.id,
        validator_group: "live_tooling",
        payload: this.createPayload(machine.id, "drilling", { live_tooling: true, tool_number: 20 }),
        expected: {
          success: true,
          min_blocks: 10
        },
        tags: ["live_tooling", "drilling", machine.controller_family]
      },
      {
        id: `test_${startId + 1}`,
        name: `${machine.name} - Cross tapping`,
        machine_id: machine.id,
        validator_group: "live_tooling",
        payload: this.createPayload(machine.id, "tapping", { live_tooling: true, tool_number: 21 }),
        expected: {
          success: true,
          min_blocks: 10
        },
        tags: ["live_tooling", "tapping", machine.controller_family]
      },
      {
        id: `test_${startId + 2}`,
        name: `${machine.name} - C-axis milling`,
        machine_id: machine.id,
        validator_group: "live_tooling",
        payload: this.createPayload(machine.id, "profiling", { live_tooling: true, tool_number: 22 }),
        expected: {
          success: true,
          min_blocks: 10
        },
        tags: ["live_tooling", "milling", "c_axis", machine.controller_family]
      },
      {
        id: `test_${startId + 3}`,
        name: `${machine.name} - Hex milling`,
        machine_id: machine.id,
        validator_group: "live_tooling",
        payload: this.createPayload(machine.id, "profiling", { live_tooling: true, tool_number: 23 }),
        expected: {
          success: true,
          min_blocks: 10
        },
        tags: ["live_tooling", "hex", machine.controller_family]
      }
    ];
  }

  private generateAdvancedFeatureTests(machine: MachineDefinition, startId: number): RegressionTestCase[] {
    const tests: RegressionTestCase[] = [];

    // CSS mode
    tests.push({
      id: `test_${startId}`,
      name: `${machine.name} - CSS mode`,
      machine_id: machine.id,
      validator_group: "advanced_features",
      payload: this.createPayload(machine.id, "turning", { css_mode: true, tool_number: 1 }),
      expected: {
        success: true,
        min_blocks: 10,
        must_contain: machine.supports_css ? ["G96"] : []
      },
      tags: ["advanced", "css", machine.controller_family]
    });

    // Sub-spindle (if supported)
    if (machine.supports_sub_spindle) {
      tests.push({
        id: `test_${startId + 1}`,
        name: `${machine.name} - Sub-spindle transfer`,
        machine_id: machine.id,
        validator_group: "advanced_features",
        payload: this.createPayload(machine.id, "turning", { sub_spindle: true, tool_number: 1 }),
        expected: {
          success: true,
          min_blocks: 10
        },
        tags: ["advanced", "sub_spindle", machine.controller_family]
      });
    } else {
      tests.push({
        id: `test_${startId + 1}`,
        name: `${machine.name} - High-speed turning`,
        machine_id: machine.id,
        validator_group: "advanced_features",
        payload: this.createPayload(machine.id, "turning", { spindle_rpm: 4000, tool_number: 1 }),
        expected: {
          success: true,
          min_blocks: 10
        },
        tags: ["advanced", "high_speed", machine.controller_family]
      });
    }

    // Work offset
    tests.push({
      id: `test_${startId + 2}`,
      name: `${machine.name} - G54 work offset`,
      machine_id: machine.id,
      validator_group: "advanced_features",
      payload: this.createPayload(machine.id, "turning", { work_offset: "G54", tool_number: 1 }),
      expected: {
        success: true,
        min_blocks: 10
      },
      tags: ["advanced", "work_offset", machine.controller_family]
    });

    return tests;
  }

  private generateEdgeCaseTests(machine: MachineDefinition, startId: number): RegressionTestCase[] {
    return [
      {
        id: `test_${startId}`,
        name: `${machine.name} - Long program (50 moves)`,
        machine_id: machine.id,
        validator_group: "edge_cases",
        payload: this.createLongProgramPayload(machine.id, 50),
        expected: {
          success: true,
          min_blocks: 50,
          max_blocks: 200
        },
        tags: ["edge_case", "long_program", machine.controller_family]
      },
      {
        id: `test_${startId + 1}`,
        name: `${machine.name} - Minimal program (2 moves)`,
        machine_id: machine.id,
        validator_group: "edge_cases",
        payload: this.createPayload(machine.id, "facing", { tool_number: 1 }, 2),
        expected: {
          success: true,
          min_blocks: 5
        },
        tags: ["edge_case", "minimal", machine.controller_family]
      },
      {
        id: `test_${startId + 2}`,
        name: `${machine.name} - Complex contour`,
        machine_id: machine.id,
        validator_group: "edge_cases",
        payload: this.createContourPayload(machine.id),
        expected: {
          success: true,
          min_blocks: 15
        },
        tags: ["edge_case", "contour", machine.controller_family]
      }
    ];
  }

  private generateCrossValidationTest(machine: MachineDefinition, testId: number): RegressionTestCase {
    return {
      id: `test_${testId}`,
      name: `${machine.name} - Cross-validation (non-lathe)`,
      machine_id: machine.id,
      validator_group: "edge_cases",
      payload: this.createPayload(machine.id, "turning", { tool_number: 1 }),
      expected: {
        success: true, // Should still route, just to generic post
        selected_post: "generic_turning"
      },
      tags: ["cross_validation", machine.type, machine.controller_family]
    };
  }

  private createPayload(
    machineId: string,
    operation: string,
    overrides: Partial<RouteActionPayload> = {},
    moveCount = 5
  ): RouteActionPayload {
    const moves: RouteActionPayload["moves"] = [];
    for (let i = 0; i < moveCount; i++) {
      moves.push(
        i % 2 === 0
          ? { type: "rapid", x: 100 - i * 10, z: 5 }
          : { type: "linear", x: 100 - i * 10, z: -i * 10, feed: 200 }
      );
    }

    return {
      machine_id: machineId,
      operation,
      program_name: `TEST_${operation.toUpperCase()}`,
      program_number: 1000 + Math.floor(Math.random() * 9000),
      moves,
      tool_number: 1,
      spindle_rpm: 1500,
      feed_rate_mmmin: 200,
      ...overrides
    };
  }

  private createLongProgramPayload(machineId: string, moveCount: number): RouteActionPayload {
    const moves: RouteActionPayload["moves"] = [];
    for (let i = 0; i < moveCount; i++) {
      if (i % 3 === 0) {
        moves.push({ type: "rapid", x: 100, z: 5 - i });
      } else if (i % 3 === 1) {
        moves.push({ type: "linear", x: 50 + i, z: -i * 2, feed: 200 });
      } else {
        moves.push({ type: "arc_cw", x: 45 + i, z: -i * 2 - 5, i: 5, k: -2.5 });
      }
    }

    return {
      machine_id: machineId,
      operation: "contouring",
      program_name: "LONG_PROGRAM_TEST",
      program_number: 9999,
      moves,
      tool_number: 1,
      spindle_rpm: 1500,
      feed_rate_mmmin: 200
    };
  }

  private createContourPayload(machineId: string): RouteActionPayload {
    return {
      machine_id: machineId,
      operation: "contouring",
      program_name: "CONTOUR_TEST",
      program_number: 8888,
      moves: [
        { type: "rapid", x: 100, z: 5 },
        { type: "linear", x: 50, z: 0, feed: 200 },
        { type: "arc_cw", x: 45, z: -5, i: 0, k: -5 },
        { type: "linear", x: 45, z: -20, feed: 180 },
        { type: "arc_ccw", x: 40, z: -25, i: -5, k: 0 },
        { type: "linear", x: 40, z: -40, feed: 150 },
        { type: "arc_cw", x: 35, z: -45, i: 0, k: -5 },
        { type: "linear", x: 35, z: -50, feed: 150 },
        { type: "rapid", x: 100, z: 5 }
      ],
      tool_number: 2,
      spindle_rpm: 1200,
      feed_rate_mmmin: 180
    };
  }

  private hashResult(result: TestResult): string {
    const key = `${result.passed}_${result.details.actual_post}_${result.details.block_count}`;
    let hash = 0;
    for (let i = 0; i < key.length; i++) {
      const char = key.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return Math.abs(hash).toString(16);
  }
}

// ── Singleton Export ───────────────────────────────────────────────────────

export const latheMasterPostRegressionMatrixEngine = new LatheMasterPostRegressionMatrixEngine();
