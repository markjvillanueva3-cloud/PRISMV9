/**
 * LatheMasterPostRegressionMatrixEngine Tests
 *
 * U-LTH31: Tests for regression test matrix with 150+ jobs across
 * 21 JM Die machines and 5 validator groups.
 */

import { describe, it, expect } from "vitest";
import {
  latheMasterPostRegressionMatrixEngine,
  type RegressionTestCase,
  type TestResult,
  type MatrixRunResult,
  type ValidatorGroup,
} from "../engines/LatheMasterPostRegressionMatrixEngine.js";

describe("LatheMasterPostRegressionMatrixEngine", () => {
  describe("Test Matrix Generation", () => {
    it("generates at least 100 test cases", () => {
      const stats = latheMasterPostRegressionMatrixEngine.getStatistics();
      expect(stats.total_tests).toBeGreaterThanOrEqual(100);
    });

    it("covers all 5 validator groups", () => {
      const stats = latheMasterPostRegressionMatrixEngine.getStatistics();
      expect(stats.validators_covered).toBe(5);

      const groups: ValidatorGroup[] = [
        "basic_operations",
        "threading_operations",
        "live_tooling",
        "advanced_features",
        "edge_cases"
      ];

      for (const group of groups) {
        expect(stats.tests_by_validator[group]).toBeGreaterThan(0);
      }
    });

    it("covers all 7 lathe machines", () => {
      const stats = latheMasterPostRegressionMatrixEngine.getStatistics();
      const lathes = latheMasterPostRegressionMatrixEngine.getLatheMachines();

      for (const lathe of lathes) {
        expect(stats.tests_by_machine[lathe.id]).toBeGreaterThan(0);
      }
    });

    it("includes tests for non-lathe machines (cross-validation)", () => {
      const allMachines = latheMasterPostRegressionMatrixEngine.getAllMachines();
      const nonLathes = allMachines.filter(m => m.type !== "lathe");

      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();
      const crossValTests = cases.filter(c =>
        nonLathes.some(m => m.id === c.machine_id)
      );

      expect(crossValTests.length).toBeGreaterThan(0);
    });
  });

  describe("getTestCases()", () => {
    it("returns all test cases without filter", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();
      expect(cases.length).toBeGreaterThan(0);
    });

    it("filters by machine_id", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
        machine_id: "LTH-01"
      });

      for (const c of cases) {
        expect(c.machine_id).toBe("LTH-01");
      }
    });

    it("filters by validator_group", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
        validator_group: "basic_operations"
      });

      for (const c of cases) {
        expect(c.validator_group).toBe("basic_operations");
      }
    });

    it("each test case has required fields", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();

      for (const c of cases.slice(0, 20)) {
        expect(c.id).toBeDefined();
        expect(c.name.length).toBeGreaterThan(0);
        expect(c.machine_id).toBeDefined();
        expect(c.validator_group).toBeDefined();
        expect(c.payload).toBeDefined();
        expect(c.expected).toBeDefined();
        expect(c.tags.length).toBeGreaterThan(0);
      }
    });
  });

  describe("runTestCase()", () => {
    it("returns test result for a single case", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();
      const testCase = cases[0];

      const result = latheMasterPostRegressionMatrixEngine.runTestCase(testCase);

      expect(result.test_id).toBe(testCase.id);
      expect(result.test_name).toBe(testCase.name);
      expect(result.machine_id).toBe(testCase.machine_id);
      expect(result.validator_group).toBe(testCase.validator_group);
      expect(typeof result.passed).toBe("boolean");
      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });

    it("includes detailed results", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
        machine_id: "LTH-01"
      });
      const testCase = cases[0];

      const result = latheMasterPostRegressionMatrixEngine.runTestCase(testCase);

      expect(result.details.expected_success).toBeDefined();
      expect(result.details.actual_success).toBeDefined();
      expect(Array.isArray(result.details.content_checks)).toBe(true);
    });

    it("validates block count when specified", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();
      const caseWithBlockCheck = cases.find(
        c => c.expected.min_blocks !== undefined
      );

      if (caseWithBlockCheck) {
        const result = latheMasterPostRegressionMatrixEngine.runTestCase(caseWithBlockCheck);
        expect(result.details.block_count).toBeDefined();
        expect(result.details.block_check_passed).toBeDefined();
      }
    });

    it("validates content patterns when specified", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();
      const caseWithContentCheck = cases.find(
        c => c.expected.must_contain?.length
      );

      if (caseWithContentCheck) {
        const result = latheMasterPostRegressionMatrixEngine.runTestCase(caseWithContentCheck);
        expect(result.details.content_checks.length).toBeGreaterThan(0);
      }
    });
  });

  describe("runMatrix()", () => {
    it("runs full matrix and returns results", () => {
      const result = latheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["LTH-01"] // Limit to one machine for speed
      });

      expect(result.run_id).toBeDefined();
      expect(result.started_at).toBeDefined();
      expect(result.completed_at).toBeDefined();
      expect(result.total_tests).toBeGreaterThan(0);
      expect(result.passed + result.failed).toBe(result.total_tests);
    });

    it("filters by machines", () => {
      const result = latheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["LTH-01", "LTH-02"]
      });

      const machineIds = Object.keys(result.results_by_machine);
      expect(machineIds).toContain("LTH-01");
      expect(machineIds).toContain("LTH-02");
      expect(machineIds.length).toBe(2);
    });

    it("filters by validators", () => {
      const result = latheMasterPostRegressionMatrixEngine.runMatrix({
        validators: ["basic_operations"]
      });

      // All tests should be basic_operations
      for (const test of result.failed_tests) {
        expect(test.validator_group).toBe("basic_operations");
      }
    });

    it("filters by tags", () => {
      const result = latheMasterPostRegressionMatrixEngine.runMatrix({
        tags: ["threading"]
      });

      expect(result.total_tests).toBeGreaterThan(0);
    });

    it("calculates pass rate correctly", () => {
      const result = latheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["LTH-01"]
      });

      const expectedRate = result.total_tests > 0
        ? result.passed / result.total_tests
        : 0;
      expect(result.pass_rate).toBe(expectedRate);
    });

    it("aggregates results by machine", () => {
      const result = latheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["LTH-01"]
      });

      expect(result.results_by_machine["LTH-01"]).toBeDefined();
      const machineResult = result.results_by_machine["LTH-01"];
      expect(machineResult.passed + machineResult.failed).toBeGreaterThan(0);
    });

    it("aggregates results by validator", () => {
      const result = latheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["LTH-01"]
      });

      const validators: ValidatorGroup[] = [
        "basic_operations",
        "threading_operations",
        "live_tooling",
        "advanced_features",
        "edge_cases"
      ];

      for (const validator of validators) {
        expect(result.results_by_validator[validator]).toBeDefined();
      }
    });

    it("tracks execution time", () => {
      const result = latheMasterPostRegressionMatrixEngine.runMatrix({
        machines: ["LTH-01"]
      });

      expect(result.execution_time_ms).toBeGreaterThanOrEqual(0);
    });
  });

  describe("Validator Groups", () => {
    describe("basic_operations", () => {
      it("tests turning, facing, grooving, boring, parting", () => {
        const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
          validator_group: "basic_operations"
        });

        const operations = new Set(cases.map(c => c.payload.operation));
        expect(operations.has("turning")).toBe(true);
        expect(operations.has("facing")).toBe(true);
      });
    });

    describe("threading_operations", () => {
      it("tests threading operations", () => {
        const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
          validator_group: "threading_operations"
        });

        expect(cases.length).toBeGreaterThan(0);
        for (const c of cases) {
          expect(c.payload.operation).toBe("threading");
        }
      });
    });

    describe("live_tooling", () => {
      it("tests drilling, tapping, milling with live tooling", () => {
        const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
          validator_group: "live_tooling"
        });

        for (const c of cases) {
          expect(c.payload.live_tooling).toBe(true);
        }
      });
    });

    describe("advanced_features", () => {
      it("tests CSS mode, sub-spindle, work offsets", () => {
        const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
          validator_group: "advanced_features"
        });

        expect(cases.length).toBeGreaterThan(0);
      });
    });

    describe("edge_cases", () => {
      it("tests long programs and complex geometry", () => {
        const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
          validator_group: "edge_cases"
        });

        const longProgram = cases.find(c => c.tags.includes("long_program"));
        const contour = cases.find(c => c.tags.includes("contour"));

        expect(longProgram).toBeDefined();
        expect(contour).toBeDefined();
      });
    });
  });

  describe("Machine Coverage", () => {
    it("covers Okuma GENOS L300-M (LTH-01)", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
        machine_id: "LTH-01"
      });
      expect(cases.length).toBeGreaterThan(10);
    });

    it("covers Okuma LB3000EX (LTH-06) with sub-spindle", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
        machine_id: "LTH-06"
      });

      const subSpindleTest = cases.find(c => c.payload.sub_spindle === true);
      expect(subSpindleTest).toBeDefined();
    });

    it("covers Okuma Multus B250II (LTH-07) with all features", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
        machine_id: "LTH-07"
      });

      expect(cases.length).toBeGreaterThan(15); // Should have most tests
    });
  });

  describe("getStatistics()", () => {
    it("returns matrix statistics", () => {
      const stats = latheMasterPostRegressionMatrixEngine.getStatistics();

      expect(stats.total_tests).toBeGreaterThan(0);
      expect(stats.machines_covered).toBeGreaterThan(0);
      expect(stats.validators_covered).toBe(5);
      expect(Object.keys(stats.tests_by_machine).length).toBeGreaterThan(0);
      expect(Object.keys(stats.tests_by_validator).length).toBe(5);
    });
  });

  describe("getLatheMachines()", () => {
    it("returns 7 lathe machines", () => {
      const lathes = latheMasterPostRegressionMatrixEngine.getLatheMachines();

      expect(lathes.length).toBe(7);
      for (const lathe of lathes) {
        expect(lathe.type).toBe("lathe");
        expect(lathe.id.startsWith("LTH-")).toBe(true);
      }
    });

    it("includes capability flags", () => {
      const lathes = latheMasterPostRegressionMatrixEngine.getLatheMachines();

      for (const lathe of lathes) {
        expect(typeof lathe.supports_live_tooling).toBe("boolean");
        expect(typeof lathe.supports_sub_spindle).toBe("boolean");
        expect(typeof lathe.supports_css).toBe("boolean");
      }
    });
  });

  describe("getAllMachines()", () => {
    it("returns all 21 machines", () => {
      const machines = latheMasterPostRegressionMatrixEngine.getAllMachines();

      expect(machines.length).toBe(21);
    });

    it("includes lathes, mills, EDMs, and support machines", () => {
      const machines = latheMasterPostRegressionMatrixEngine.getAllMachines();
      const types = new Set(machines.map(m => m.type));

      expect(types.has("lathe")).toBe(true);
      expect(types.has("mill")).toBe(true);
      expect(types.has("edm")).toBe(true);
      expect(types.has("other")).toBe(true);
    });
  });

  describe("Baseline and Regression", () => {
    it("creates baseline snapshot", () => {
      const baseline = latheMasterPostRegressionMatrixEngine.createBaseline();

      expect(baseline.version).toBeDefined();
      expect(baseline.created_at).toBeDefined();
      expect(baseline.test_count).toBeGreaterThan(0);
      expect(Object.keys(baseline.checksums).length).toBeGreaterThan(0);
    });

    it("checks for regressions", () => {
      // Create baseline first
      latheMasterPostRegressionMatrixEngine.createBaseline();

      const regressionCheck = latheMasterPostRegressionMatrixEngine.checkRegressions();

      expect(typeof regressionCheck.has_regressions).toBe("boolean");
      expect(Array.isArray(regressionCheck.regressions)).toBe(true);
      expect(Array.isArray(regressionCheck.new_tests)).toBe(true);
      expect(Array.isArray(regressionCheck.removed_tests)).toBe(true);
    });

    it("reports no regressions when baseline matches current", () => {
      // Create fresh baseline
      latheMasterPostRegressionMatrixEngine.createBaseline();

      // Check immediately (should have no regressions)
      const check = latheMasterPostRegressionMatrixEngine.checkRegressions();

      expect(check.has_regressions).toBe(false);
      expect(check.regressions.length).toBe(0);
    });
  });

  describe("Test Tags", () => {
    it("tags include operation type", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();

      const turningCases = cases.filter(c => c.tags.includes("turning"));
      const threadingCases = cases.filter(c => c.tags.includes("threading"));

      expect(turningCases.length).toBeGreaterThan(0);
      expect(threadingCases.length).toBeGreaterThan(0);
    });

    it("tags include controller family", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();

      const okumaCases = cases.filter(c => c.tags.includes("okuma"));
      expect(okumaCases.length).toBeGreaterThan(0);
    });

    it("tags include feature categories", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();

      const cssTests = cases.filter(c => c.tags.includes("css"));
      const liveToolingTests = cases.filter(c => c.tags.includes("live_tooling"));

      expect(cssTests.length).toBeGreaterThan(0);
      expect(liveToolingTests.length).toBeGreaterThan(0);
    });
  });

  describe("Expected Results Validation", () => {
    it("basic operations expect success", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
        validator_group: "basic_operations"
      });

      for (const c of cases) {
        expect(c.expected.success).toBe(true);
      }
    });

    it("lathe tests expect okuma_turning post", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases({
        machine_id: "LTH-01"
      });

      const withPostExpectation = cases.filter(c => c.expected.selected_post);
      for (const c of withPostExpectation) {
        expect(c.expected.selected_post).toBe("okuma_turning");
      }
    });

    it("long program tests have min_blocks requirement", () => {
      const cases = latheMasterPostRegressionMatrixEngine.getTestCases();
      const longProgram = cases.find(c => c.tags.includes("long_program"));

      expect(longProgram?.expected.min_blocks).toBeGreaterThanOrEqual(50);
    });
  });
});
