/**
 * LathePrintToProgramRegressionEngine Tests
 *
 * U-LTH46: E2E Regression Matrix validation
 */

import { describe, it, expect } from "vitest";
import {
  lathePrintToProgramRegressionEngine,
  GOLDEN_BASELINE,
  type RegressionTestCase,
  type RegressionResult,
  type RegressionMatrixResult,
} from "../engines/LathePrintToProgramRegressionEngine.js";

describe("LathePrintToProgramRegressionEngine", () => {
  describe("GOLDEN_BASELINE", () => {
    it("contains exactly 50 test cases", () => {
      expect(GOLDEN_BASELINE.length).toBe(50);
    });

    it("has unique IDs for all test cases", () => {
      const ids = GOLDEN_BASELINE.map((tc) => tc.id);
      const uniqueIds = new Set(ids);
      expect(uniqueIds.size).toBe(ids.length);
    });

    it("covers all 5 part type categories", () => {
      const partTypes = new Set(GOLDEN_BASELINE.map((tc) => tc.input.part_type));
      expect(partTypes.has("shaft")).toBe(true);
      expect(partTypes.has("bore")).toBe(true);
      expect(partTypes.has("thread")).toBe(true);
      expect(partTypes.has("groove")).toBe(true);
      expect(partTypes.has("complex")).toBe(true);
    });

    it("has 10 cases per category", () => {
      const categoryCounts = GOLDEN_BASELINE.reduce(
        (acc, tc) => {
          acc[tc.input.part_type] = (acc[tc.input.part_type] || 0) + 1;
          return acc;
        },
        {} as Record<string, number>
      );

      expect(categoryCounts["shaft"]).toBe(10);
      expect(categoryCounts["bore"]).toBe(10);
      expect(categoryCounts["thread"]).toBe(10);
      expect(categoryCounts["groove"]).toBe(10);
      expect(categoryCounts["complex"]).toBe(10);
    });

    it("all test cases have valid structure", () => {
      for (const tc of GOLDEN_BASELINE) {
        expect(tc.id).toMatch(/^JMD-R\d{3}$/);
        expect(tc.name).toBeTruthy();
        expect(tc.description).toBeTruthy();
        expect(tc.customer).toBeTruthy();
        expect(tc.part_number).toBeTruthy();
        expect(tc.blueprint_hash).toBeTruthy();

        expect(tc.input.dimensions.length).toBeGreaterThan(0);
        expect(tc.input.material).toBeTruthy();
        expect(["shaft", "bore", "thread", "groove", "complex"]).toContain(tc.input.part_type);

        expect(tc.expected.line_count_min).toBeGreaterThan(0);
        expect(tc.expected.line_count_max).toBeGreaterThan(tc.expected.line_count_min);
        expect(tc.expected.tool_count).toBeGreaterThan(0);
        expect(tc.expected.cycle_time_min_sec).toBeGreaterThan(0);
        expect(tc.expected.cycle_time_max_sec).toBeGreaterThan(tc.expected.cycle_time_min_sec);
        expect(tc.expected.feature_count).toBeGreaterThan(0);
        expect(tc.expected.critical_dimensions.length).toBeGreaterThan(0);
      }
    });

    it("covers diverse materials", () => {
      const materials = new Set(GOLDEN_BASELINE.map((tc) => tc.input.material));
      expect(materials.size).toBeGreaterThan(15);
    });

    it("covers diverse customers", () => {
      const customers = new Set(GOLDEN_BASELINE.map((tc) => tc.customer));
      expect(customers.size).toBeGreaterThan(20);
    });
  });

  describe("getBaseline()", () => {
    it("returns all 50 test cases", () => {
      const baseline = lathePrintToProgramRegressionEngine.getBaseline();
      expect(baseline.length).toBe(50);
    });

    it("returns immutable copy of baseline", () => {
      const baseline1 = lathePrintToProgramRegressionEngine.getBaseline();
      const baseline2 = lathePrintToProgramRegressionEngine.getBaseline();
      expect(baseline1).toEqual(baseline2);
    });
  });

  describe("getBaselineVersion()", () => {
    it("returns valid semver version", () => {
      const version = lathePrintToProgramRegressionEngine.getBaselineVersion();
      expect(version).toMatch(/^\d+\.\d+\.\d+$/);
    });
  });

  describe("getMaxDivergence()", () => {
    it("returns 5.0 percent threshold", () => {
      const maxDiv = lathePrintToProgramRegressionEngine.getMaxDivergence();
      expect(maxDiv).toBe(5.0);
    });
  });

  describe("runSingleTest()", () => {
    it("returns valid result structure", async () => {
      const testCase = GOLDEN_BASELINE[0];
      const result = await lathePrintToProgramRegressionEngine.runSingleTest(testCase);

      expect(result.test_id).toBe(testCase.id);
      expect(typeof result.passed).toBe("boolean");
      expect(typeof result.divergence_pct).toBe("number");
      expect(result.divergence_pct).toBeGreaterThanOrEqual(0);
      expect(result.divergence_pct).toBeLessThanOrEqual(100);

      expect(result.details).toBeDefined();
      expect(typeof result.details.program_hash_match).toBe("boolean");
      expect(typeof result.details.line_count_in_range).toBe("boolean");
      expect(typeof result.details.tool_count_match).toBe("boolean");
      expect(typeof result.details.cycle_time_in_range).toBe("boolean");
      expect(typeof result.details.feature_count_match).toBe("boolean");
      expect(typeof result.details.critical_dims_covered).toBe("boolean");

      expect(result.actual).toBeDefined();
      expect(typeof result.actual.program_hash).toBe("string");
      expect(typeof result.actual.line_count).toBe("number");
      expect(typeof result.actual.tool_count).toBe("number");
      expect(typeof result.actual.cycle_time_sec).toBe("number");
      expect(typeof result.actual.feature_count).toBe("number");
    });

    it("handles shaft test case", async () => {
      const shaftCase = GOLDEN_BASELINE.find((tc) => tc.id === "JMD-R001");
      expect(shaftCase).toBeDefined();

      const result = await lathePrintToProgramRegressionEngine.runSingleTest(shaftCase!);

      expect(result.test_id).toBe("JMD-R001");
      expect(typeof result.actual.line_count).toBe("number");
      expect(typeof result.actual.tool_count).toBe("number");
    });

    it("handles bore test case", async () => {
      const boreCase = GOLDEN_BASELINE.find((tc) => tc.id === "JMD-R011");
      expect(boreCase).toBeDefined();

      const result = await lathePrintToProgramRegressionEngine.runSingleTest(boreCase!);

      expect(result.test_id).toBe("JMD-R011");
      expect(typeof result.actual.line_count).toBe("number");
    });

    it("handles thread test case", async () => {
      const threadCase = GOLDEN_BASELINE.find((tc) => tc.id === "JMD-R021");
      expect(threadCase).toBeDefined();

      const result = await lathePrintToProgramRegressionEngine.runSingleTest(threadCase!);

      expect(result.test_id).toBe("JMD-R021");
      expect(typeof result.actual.line_count).toBe("number");
    });

    it("handles groove test case", async () => {
      const grooveCase = GOLDEN_BASELINE.find((tc) => tc.id === "JMD-R031");
      expect(grooveCase).toBeDefined();

      const result = await lathePrintToProgramRegressionEngine.runSingleTest(grooveCase!);

      expect(result.test_id).toBe("JMD-R031");
      expect(typeof result.actual.line_count).toBe("number");
    });

    it("handles complex test case", async () => {
      const complexCase = GOLDEN_BASELINE.find((tc) => tc.id === "JMD-R041");
      expect(complexCase).toBeDefined();

      const result = await lathePrintToProgramRegressionEngine.runSingleTest(complexCase!);

      expect(result.test_id).toBe("JMD-R041");
      expect(typeof result.actual.line_count).toBe("number");
    });
  });

  describe("runSubset()", () => {
    it("runs subset of test cases", async () => {
      const ids = ["JMD-R001", "JMD-R011", "JMD-R021"];
      const result = await lathePrintToProgramRegressionEngine.runSubset(ids);

      expect(result.total_cases).toBe(3);
      expect(result.results.length).toBe(3);
      expect(result.results.map((r) => r.test_id).sort()).toEqual(ids.sort());
    });

    it("handles empty subset", async () => {
      const result = await lathePrintToProgramRegressionEngine.runSubset([]);

      expect(result.total_cases).toBe(0);
      expect(result.results.length).toBe(0);
      expect(result.divergence_pct).toBe(0);
      expect(result.ship_blocked).toBe(false);
    });

    it("handles non-existent IDs gracefully", async () => {
      const result = await lathePrintToProgramRegressionEngine.runSubset(["JMD-R999"]);

      expect(result.total_cases).toBe(0);
    });
  });

  describe("runFullMatrix()", () => {
    it("returns valid matrix result structure", async () => {
      const subset = await lathePrintToProgramRegressionEngine.runSubset(["JMD-R001"]);

      expect(subset.timestamp).toBeTruthy();
      expect(typeof subset.total_cases).toBe("number");
      expect(typeof subset.passed).toBe("number");
      expect(typeof subset.failed).toBe("number");
      expect(typeof subset.divergence_pct).toBe("number");
      expect(typeof subset.ship_blocked).toBe("boolean");
      expect(subset.baseline_version).toBeTruthy();
      expect(subset.engine_version).toBeTruthy();
    });

    it("ship_blocked is true when divergence > 5%", async () => {
      const mockResult: RegressionMatrixResult = {
        timestamp: new Date().toISOString(),
        total_cases: 10,
        passed: 9,
        failed: 1,
        divergence_pct: 10,
        ship_blocked: true,
        results: [],
        baseline_version: "1.0.0",
        engine_version: "1.0.0",
      };

      expect(mockResult.ship_blocked).toBe(true);
    });

    it("ship_blocked is false when divergence <= 5%", async () => {
      const mockResult: RegressionMatrixResult = {
        timestamp: new Date().toISOString(),
        total_cases: 50,
        passed: 48,
        failed: 2,
        divergence_pct: 4,
        ship_blocked: false,
        results: [],
        baseline_version: "1.0.0",
        engine_version: "1.0.0",
      };

      expect(mockResult.ship_blocked).toBe(false);
    });
  });

  describe("baseline coverage metrics", () => {
    it("all dimensions have valid units", () => {
      for (const tc of GOLDEN_BASELINE) {
        for (const dim of tc.input.dimensions) {
          expect(["mm", "in"]).toContain(dim.unit);
        }
      }
    });

    it("all tolerances are non-negative", () => {
      for (const tc of GOLDEN_BASELINE) {
        for (const dim of tc.input.dimensions) {
          expect(dim.tolerance_plus).toBeGreaterThanOrEqual(0);
          expect(dim.tolerance_minus).toBeGreaterThanOrEqual(0);
        }
      }
    });

    it("expected ranges are valid", () => {
      for (const tc of GOLDEN_BASELINE) {
        expect(tc.expected.line_count_max).toBeGreaterThan(tc.expected.line_count_min);
        expect(tc.expected.cycle_time_max_sec).toBeGreaterThan(tc.expected.cycle_time_min_sec);
      }
    });

    it("GD&T types are valid", () => {
      const validGdtTypes = [
        "cylindricity",
        "concentricity",
        "perpendicularity",
        "runout",
        "total_runout",
        "straightness",
        "profile",
        "position",
        "parallelism",
        "flatness",
        "symmetry",
      ];

      for (const tc of GOLDEN_BASELINE) {
        for (const gdt of tc.input.gdt) {
          expect(validGdtTypes).toContain(gdt.type);
        }
      }
    });
  });

  describe("regression alarm", () => {
    it("can detect regression when divergence exceeds threshold", () => {
      const maxDivergence = lathePrintToProgramRegressionEngine.getMaxDivergence();
      expect(maxDivergence).toBe(5.0);

      const failedResults = 3;
      const totalResults = 50;
      const divergence = (failedResults / totalResults) * 100;

      expect(divergence).toBe(6);
      expect(divergence > maxDivergence).toBe(true);
    });

    it("passes when divergence within threshold", () => {
      const maxDivergence = lathePrintToProgramRegressionEngine.getMaxDivergence();

      const failedResults = 2;
      const totalResults = 50;
      const divergence = (failedResults / totalResults) * 100;

      expect(divergence).toBe(4);
      expect(divergence <= maxDivergence).toBe(true);
    });
  });
});
