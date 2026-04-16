/**
 * Tests for FuzzyLogic, DynamicProgramming, RobustStatistics engines
 */
import { describe, it, expect } from "vitest";
import { fuzzyLogicEngine } from "../engines/FuzzyLogicEngine.js";
import { dynamicProgrammingEngine } from "../engines/DynamicProgrammingEngine.js";
import { robustStatisticsEngine } from "../engines/RobustStatisticsEngine.js";

// ===========================================================================
// FuzzyLogic
// ===========================================================================

describe("FuzzyLogic — Membership", () => {
  it("triangular membership function", () => {
    const mf = { name: "medium", type: "triangular" as const, params: [0, 5, 10] };
    expect(fuzzyLogicEngine.membership(5, mf)).toBeCloseTo(1);
    expect(fuzzyLogicEngine.membership(0, mf)).toBeCloseTo(0);
    expect(fuzzyLogicEngine.membership(10, mf)).toBeCloseTo(0);
    expect(fuzzyLogicEngine.membership(2.5, mf)).toBeCloseTo(0.5);
  });

  it("trapezoidal membership function", () => {
    const mf = { name: "normal", type: "trapezoidal" as const, params: [2, 4, 6, 8] };
    expect(fuzzyLogicEngine.membership(5, mf)).toBeCloseTo(1);
    expect(fuzzyLogicEngine.membership(1, mf)).toBeCloseTo(0);
    expect(fuzzyLogicEngine.membership(3, mf)).toBeCloseTo(0.5);
  });

  it("gaussian membership function", () => {
    const mf = { name: "center", type: "gaussian" as const, params: [5, 2] };
    expect(fuzzyLogicEngine.membership(5, mf)).toBeCloseTo(1);
    expect(fuzzyLogicEngine.membership(5 + 2, mf)).toBeCloseTo(Math.exp(-0.5), 3);
  });
});

describe("FuzzyLogic — Fuzzification", () => {
  it("fuzzifies a value into 3 terms", () => {
    const variable = fuzzyLogicEngine.createStandard3Term("speed", 0, 100);
    const result = fuzzyLogicEngine.fuzzify(50, variable);
    expect(result.medium).toBeCloseTo(1, 1);
    expect(result.low).toBeCloseTo(0, 1);
    expect(result.high).toBeCloseTo(0, 1);
  });

  it("creates 5-term variable", () => {
    const variable = fuzzyLogicEngine.createStandard5Term("force", 0, 1000);
    expect(variable.terms.length).toBe(5);
    const result = fuzzyLogicEngine.fuzzify(500, variable);
    expect(result.medium).toBeCloseTo(1, 1);
  });
});

describe("FuzzyLogic — Inference System", () => {
  it("evaluates a simple fuzzy system", () => {
    const system = fuzzyLogicEngine.createProcessController([-10, 10], [-5, 5]);
    const result = fuzzyLogicEngine.evaluate(system, { error: 0, error_change: 0 });
    expect(result.crispOutputs.control).toBeDefined();
    expect(result.ruleActivations.length).toBe(25); // 5x5 rule matrix
    // At zero error, output should be near midpoint
    expect(Math.abs(result.crispOutputs.control)).toBeLessThan(3);
  });

  it("responds to positive error", () => {
    const system = fuzzyLogicEngine.createProcessController([-10, 10], [-5, 5]);
    const zeroResult = fuzzyLogicEngine.evaluate(system, { error: 0, error_change: 0 });
    const highResult = fuzzyLogicEngine.evaluate(system, { error: 8, error_change: 0 });
    expect(highResult.crispOutputs.control).toBeGreaterThan(zeroResult.crispOutputs.control);
  });
});

// ===========================================================================
// DynamicProgramming
// ===========================================================================

describe("DynamicProgramming — Knapsack", () => {
  it("solves 0/1 knapsack", () => {
    const result = dynamicProgrammingEngine.knapsack01(
      [
        { value: 60, weight: 10 },
        { value: 100, weight: 20 },
        { value: 120, weight: 30 },
      ],
      50
    );
    expect(result.maxValue).toBe(220); // Items 1+2 (100+120, weight 50)
    expect(result.totalWeight).toBeLessThanOrEqual(50);
  });

  it("solves unbounded knapsack", () => {
    const result = dynamicProgrammingEngine.knapsackUnbounded(
      [
        { value: 10, weight: 5 },
        { value: 30, weight: 10 },
        { value: 20, weight: 15 },
      ],
      30
    );
    expect(result.maxValue).toBe(90); // 3x item with value 30
    expect(result.totalWeight).toBeLessThanOrEqual(30);
  });
});

describe("DynamicProgramming — Edit Distance", () => {
  it("computes edit distance", () => {
    const result = dynamicProgrammingEngine.editDistance("kitten", "sitting");
    expect(result.distance).toBe(3);
    expect(result.operations.length).toBeGreaterThan(0);
  });

  it("identical strings have distance 0", () => {
    const result = dynamicProgrammingEngine.editDistance("abc", "abc");
    expect(result.distance).toBe(0);
  });
});

describe("DynamicProgramming — LCS", () => {
  it("finds longest common subsequence", () => {
    const result = dynamicProgrammingEngine.lcs("ABCBDAB", "BDCAB");
    expect(result.length).toBe(4);
    expect(result.subsequence.length).toBe(4);
  });
});

describe("DynamicProgramming — Cutting Stock", () => {
  it("cuts pieces from stock bars", () => {
    const result = dynamicProgrammingEngine.cuttingStock({
      stockLength: 100,
      pieces: [
        { length: 40, demand: 3 },
        { length: 30, demand: 4 },
        { length: 20, demand: 2 },
      ],
    });
    expect(result.totalBars).toBeGreaterThan(0);
    expect(result.utilization).toBeGreaterThan(0.5);
    expect(result.patterns.length).toBeGreaterThan(0);
  });
});

describe("DynamicProgramming — Resource Allocation", () => {
  it("allocates resources optimally", () => {
    const result = dynamicProgrammingEngine.resourceAllocation({
      budget: 10,
      resources: [
        { name: "machine_A", costs: [3, 6, 9], values: [5, 8, 10] },
        { name: "machine_B", costs: [2, 5, 8], values: [3, 7, 9] },
      ],
    });
    expect(result.totalCost).toBeLessThanOrEqual(10);
    expect(result.totalValue).toBeGreaterThan(0);
    expect(result.allocations.length).toBe(2);
  });
});

// ===========================================================================
// RobustStatistics
// ===========================================================================

describe("RobustStatistics — Location", () => {
  it("computes robust location estimates", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100]; // Outlier at 100
    const result = robustStatisticsEngine.robustLocation(data);
    // Median should be robust to outlier
    expect(result.median).toBe(5.5);
    expect(result.trimmedMean).toBeLessThan(result.mean);
    expect(result.hodgesLehmann).toBeDefined();
  });
});

describe("RobustStatistics — Scale", () => {
  it("computes robust scale estimates", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 100];
    const result = robustStatisticsEngine.robustScale(data);
    expect(result.mad).toBeDefined();
    expect(result.iqr).toBeGreaterThan(0);
    expect(result.normalizedMad).toBeLessThan(result.std); // MAD more robust
  });
});

describe("RobustStatistics — Outlier Detection", () => {
  it("detects outliers via MAD", () => {
    const data = [10, 11, 12, 10.5, 11.5, 12.5, 100];
    const result = robustStatisticsEngine.detectOutliers(data, "mad");
    expect(result.outlierValues).toContain(100);
    expect(result.cleanData.length).toBeLessThan(data.length);
  });

  it("detects outliers via boxplot", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 50];
    const result = robustStatisticsEngine.detectOutliers(data, "boxplot");
    expect(result.outlierValues).toContain(50);
  });

  it("detects outliers via Grubbs", () => {
    const data = [10, 11, 12, 10.5, 11.5, 12.5, 100];
    const result = robustStatisticsEngine.detectOutliers(data, "grubbs", 2.0);
    expect(result.outlierValues).toContain(100);
  });
});

describe("RobustStatistics — Bootstrap", () => {
  it("computes bootstrap confidence interval", () => {
    const data = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];
    const result = robustStatisticsEngine.bootstrap(
      data,
      d => d.reduce((s, v) => s + v, 0) / d.length, // mean
      { samples: 500 }
    );
    expect(result.estimate).toBeCloseTo(5.5, 1);
    expect(result.ci[0]).toBeLessThan(result.ci[1]);
    expect(result.ci[0]).toBeGreaterThan(0);
    expect(result.ci[1]).toBeLessThan(11);
    expect(result.se).toBeGreaterThan(0);
  });
});

describe("RobustStatistics — Theil-Sen Regression", () => {
  it("fits robust line through data", () => {
    // y = 2x + 1 with one outlier
    const x = [0, 1, 2, 3, 4, 5];
    const y = [1, 3, 5, 7, 9, 100]; // Last point is outlier
    const result = robustStatisticsEngine.theilSen(x, y);
    // Theil-Sen should be close to slope=2 despite outlier
    expect(result.slope).toBeCloseTo(2, 0);
    expect(result.intercept).toBeCloseTo(1, 0);
    expect(result.residuals.length).toBe(6);
  });
});

describe("RobustStatistics — Mann-Whitney U", () => {
  it("compares two groups", () => {
    const group1 = [1, 2, 3, 4, 5];
    const group2 = [6, 7, 8, 9, 10];
    const result = robustStatisticsEngine.mannWhitneyU(group1, group2);
    expect(result.U).toBeDefined();
    expect(result.significant).toBe(true); // Groups are clearly different
  });

  it("detects no difference in similar groups", () => {
    const group1 = [1, 3, 5, 7, 9];
    const group2 = [2, 4, 6, 8, 10];
    const result = robustStatisticsEngine.mannWhitneyU(group1, group2);
    expect(result.significant).toBe(false); // Interleaved, no real difference
  });
});
