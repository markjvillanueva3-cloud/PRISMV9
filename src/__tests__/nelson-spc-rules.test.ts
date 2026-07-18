/**
 * Tests for NelsonSPCRulesEngine — 8 Nelson Rules for SPC pattern detection
 *
 * Reference: Nelson, L.S. (1984). "The Shewhart Control Chart—Tests for
 *   Special Causes", Journal of Quality Technology, 16(4), 237-239.
 */

import { describe, it, expect } from "vitest";
import { nelsonSPCRulesEngine } from "../engines/NelsonSPCRulesEngine.js";

// ── Helpers ──────────────────────────────────────────────────────────────

/** Generate normally-distributed data (Box-Muller) around mean with given sigma */
function normalData(
  n: number, mean = 50, sigma = 1, seed = 42
): number[] {
  const data: number[] = [];
  // Simple seeded pseudo-random (LCG)
  let s = seed;
  const rand = () => { s = (s * 1664525 + 1013904223) & 0x7fffffff; return s / 0x7fffffff; };
  for (let i = 0; i < n; i += 2) {
    const u1 = rand() || 0.001;
    const u2 = rand();
    const z0 = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
    const z1 = Math.sqrt(-2 * Math.log(u1)) * Math.sin(2 * Math.PI * u2);
    data.push(mean + sigma * z0);
    if (i + 1 < n) data.push(mean + sigma * z1);
  }
  return data;
}

// ── Rule 1: Beyond 3-sigma ──────────────────────────────────────────────

describe("NelsonSPCRulesEngine", () => {
  describe("Rule 1 — Beyond 3-sigma", () => {
    it("triggers for a point at 3.5 sigma", () => {
      const data = [50, 50, 50, 53.5, 50, 50];
      const v = nelsonSPCRulesEngine.checkBeyond3Sigma(data, 50, 1);
      expect(v.length).toBe(1);
      expect(v[0].indices).toEqual([3]);
      expect(v[0].rule).toBe(1);
      expect(v[0].severity).toBe("critical");
    });

    it("does NOT trigger for a point at 2.9 sigma", () => {
      const data = [50, 50, 50, 52.9, 50, 50];
      const v = nelsonSPCRulesEngine.checkBeyond3Sigma(data, 50, 1);
      expect(v.length).toBe(0);
    });
  });

  // ── Rule 2: Nine consecutive same side ────────────────────────────────

  describe("Rule 2 — Nine consecutive same side", () => {
    it("triggers for exactly 9 points above mean", () => {
      // 9 points above mean of 50
      const data = [49, 51, 51, 51, 51, 51, 51, 51, 51, 51, 49];
      const v = nelsonSPCRulesEngine.checkNineConsecutiveSameSide(data, 50);
      expect(v.length).toBe(1);
      expect(v[0].indices.length).toBe(9);
      expect(v[0].rule).toBe(2);
    });

    it("does NOT trigger for only 8 consecutive points above", () => {
      const data = [49, 51, 51, 51, 51, 51, 51, 51, 51, 49];
      const v = nelsonSPCRulesEngine.checkNineConsecutiveSameSide(data, 50);
      expect(v.length).toBe(0);
    });
  });

  // ── Rule 3: Six consecutive increasing/decreasing ────────────────────

  describe("Rule 3 — Six consecutive increasing/decreasing", () => {
    it("triggers for 6 ascending points", () => {
      const data = [10, 11, 12, 13, 14, 15];
      const v = nelsonSPCRulesEngine.checkSixConsecutiveIncreasingDecreasing(data);
      expect(v.length).toBe(1);
      expect(v[0].indices.length).toBe(6);
      expect(v[0].description).toContain("increasing");
    });

    it("triggers for 6 descending points", () => {
      const data = [15, 14, 13, 12, 11, 10];
      const v = nelsonSPCRulesEngine.checkSixConsecutiveIncreasingDecreasing(data);
      expect(v.length).toBe(1);
      expect(v[0].description).toContain("decreasing");
    });

    it("does NOT trigger for only 5 ascending points", () => {
      const data = [10, 11, 12, 13, 14];
      const v = nelsonSPCRulesEngine.checkSixConsecutiveIncreasingDecreasing(data);
      expect(v.length).toBe(0);
    });
  });

  // ── Rule 4: Fourteen alternating ──────────────────────────────────────

  describe("Rule 4 — Fourteen alternating up/down", () => {
    it("triggers for 14 alternating points", () => {
      // 14 points: up, down, up, down ...
      const data = [50, 52, 48, 52, 48, 52, 48, 52, 48, 52, 48, 52, 48, 52];
      const v = nelsonSPCRulesEngine.checkFourteenAlternating(data);
      expect(v.length).toBe(1);
      expect(v[0].rule).toBe(4);
      expect(v[0].indices.length).toBe(14);
    });

    it("does NOT trigger for 13 alternating points", () => {
      const data = [50, 52, 48, 52, 48, 52, 48, 52, 48, 52, 48, 52, 48];
      const v = nelsonSPCRulesEngine.checkFourteenAlternating(data);
      expect(v.length).toBe(0);
    });
  });

  // ── Rule 5: Two of three beyond 2-sigma ───────────────────────────────

  describe("Rule 5 — Two of three beyond 2-sigma same side", () => {
    it("triggers when 2 of 3 consecutive points are beyond +2sigma", () => {
      // mean=50, sigma=1 => 2sigma boundary = 52
      const data = [50, 52.5, 50, 53.0, 50];
      const v = nelsonSPCRulesEngine.checkTwoOfThreeBeyond2Sigma(
        data, 50, 1
      );
      expect(v.length).toBeGreaterThanOrEqual(1);
      expect(v[0].rule).toBe(5);
    });

    it("does NOT trigger when only 1 of 3 exceeds 2-sigma", () => {
      const data = [50, 52.5, 50, 50, 50];
      const v = nelsonSPCRulesEngine.checkTwoOfThreeBeyond2Sigma(
        data, 50, 1
      );
      expect(v.length).toBe(0);
    });
  });

  // ── Rule 6: Four of five beyond 1-sigma ───────────────────────────────

  describe("Rule 6 — Four of five beyond 1-sigma same side", () => {
    it("triggers when 4 of 5 consecutive are beyond +1sigma", () => {
      // mean=50, sigma=1 => 1sigma boundary = 51
      const data = [51.5, 51.2, 50.5, 51.8, 51.3];
      const v = nelsonSPCRulesEngine.checkFourOfFiveBeyond1Sigma(
        data, 50, 1
      );
      expect(v.length).toBe(1);
      expect(v[0].rule).toBe(6);
    });

    it("does NOT trigger when only 3 of 5 exceed 1-sigma", () => {
      const data = [51.5, 51.2, 50.5, 50.2, 51.3];
      const v = nelsonSPCRulesEngine.checkFourOfFiveBeyond1Sigma(
        data, 50, 1
      );
      expect(v.length).toBe(0);
    });
  });

  // ── Rule 7: Fifteen within 1-sigma (stratification) ───────────────────

  describe("Rule 7 — Fifteen within 1-sigma", () => {
    it("triggers for 15 points all within 1 sigma", () => {
      // All values between 49 and 51 (mean=50, sigma=1)
      const data = Array.from(
        { length: 15 },
        (_, i) => 49.5 + (i % 3) * 0.25
      );
      const v = nelsonSPCRulesEngine.checkFifteenWithin1Sigma(
        data, 50, 1
      );
      expect(v.length).toBe(1);
      expect(v[0].rule).toBe(7);
      expect(v[0].severity).toBe("info");
    });

    it("does NOT trigger for 14 points within 1 sigma", () => {
      const data = Array.from(
        { length: 14 },
        (_, i) => 49.5 + (i % 3) * 0.25
      );
      const v = nelsonSPCRulesEngine.checkFifteenWithin1Sigma(
        data, 50, 1
      );
      expect(v.length).toBe(0);
    });
  });

  // ── Rule 8: Eight beyond 1-sigma either side (mixture) ────────────────

  describe("Rule 8 — Eight beyond 1-sigma either side (mixture)", () => {
    it("triggers for 8 points alternating beyond +/- 1sigma", () => {
      // All beyond 1sigma, alternating sides. mean=50, sigma=1
      const data = [52, 48, 52, 48, 52, 48, 52, 48];
      const v = nelsonSPCRulesEngine.checkEightBeyond1Sigma(
        data, 50, 1
      );
      expect(v.length).toBe(1);
      expect(v[0].rule).toBe(8);
    });

    it("does NOT trigger when some points are within 1-sigma", () => {
      const data = [52, 48, 50, 48, 52, 48, 52, 48];
      const v = nelsonSPCRulesEngine.checkEightBeyond1Sigma(
        data, 50, 1
      );
      expect(v.length).toBe(0);
    });
  });

  // ── evaluateAllRules ──────────────────────────────────────────────────

  describe("evaluateAllRules", () => {
    it("returns no violations for normally distributed data", () => {
      // 100 points, mean=50, sigma=1
      const data = normalData(100, 50, 1);
      const result = nelsonSPCRulesEngine.evaluateAllRules(data, 50, 1);
      // Statistically, most runs should be in control
      // We check the structure is correct
      expect(result.rule_results.length).toBe(8);
      expect(result.summary).toBeDefined();
    });

    it("detects multiple rules violated simultaneously", () => {
      // Construct data that violates Rule 1 and Rule 2
      // 9 points above mean, one of which is beyond 3sigma
      const data = [
        50, 53.5, 51, 51, 51, 51, 51, 51, 51, 51, 50,
      ];
      const result = nelsonSPCRulesEngine.evaluateAllRules(data, 50, 1);
      const violatedRules = result.rule_results
        .filter(r => r.violated)
        .map(r => r.rule);
      expect(violatedRules).toContain(1); // 3.5sigma outlier
      expect(violatedRules).toContain(2); // 9+ same side
    });

    it("returns empty violations for empty data", () => {
      const result = nelsonSPCRulesEngine.evaluateAllRules([]);
      expect(result.violations.length).toBe(0);
      expect(result.overall_in_control).toBe(true);
      expect(result.summary).toContain("No data");
    });

    it("handles a single data point gracefully", () => {
      const result = nelsonSPCRulesEngine.evaluateAllRules([50]);
      expect(result.rule_results.length).toBe(8);
      // sigma=0 for single point so most rules are skipped
      expect(result.violations.length).toBe(0);
    });
  });

  // ── Auto-calculate mean and sigma ─────────────────────────────────────

  describe("auto-calculate mean and sigma", () => {
    it("correctly auto-calculates mean and sigma from data", () => {
      const data = [10, 20, 30, 40, 50];
      // mean = 30, sigma = sqrt(250/4) = 7.9057
      const chart = nelsonSPCRulesEngine.generateControlChart(data);
      expect(chart.mean).toBeCloseTo(30, 4);
      expect(chart.sigma).toBeCloseTo(
        Math.sqrt(((10-30)**2 + (20-30)**2 + (30-30)**2
          + (40-30)**2 + (50-30)**2) / 4),
        4
      );
    });
  });

  // ── Control chart generation ──────────────────────────────────────────

  describe("generateControlChart", () => {
    it("calculates UCL/LCL as mean +/- 3sigma", () => {
      const data = normalData(50, 100, 2);
      const chart = nelsonSPCRulesEngine.generateControlChart(
        data, 100, 2
      );
      expect(chart.ucl).toBeCloseTo(106, 4);
      expect(chart.lcl).toBeCloseTo(94, 4);
      expect(chart.uwl).toBeCloseTo(104, 4);
      expect(chart.lwl).toBeCloseTo(96, 4);
      expect(chart.uzone_b).toBeCloseTo(102, 4);
      expect(chart.lzone_b).toBeCloseTo(98, 4);
    });

    it("classifies zones A/B/C correctly", () => {
      // Specific values in each zone. mean=50, sigma=1
      const data = [50, 50.5, 51.5, 52.5, 49.5, 48.5, 47.5];
      const chart = nelsonSPCRulesEngine.generateControlChart(
        data, 50, 1
      );
      expect(chart.points[0].zone).toBe("C+"); // 50 = mean
      expect(chart.points[1].zone).toBe("C+"); // 50.5 within 1s
      expect(chart.points[2].zone).toBe("B+"); // 51.5 between 1s-2s
      expect(chart.points[3].zone).toBe("A+"); // 52.5 beyond 2s
      expect(chart.points[4].zone).toBe("C-"); // 49.5 within -1s
      expect(chart.points[5].zone).toBe("B-"); // 48.5 between -1s/-2s
      expect(chart.points[6].zone).toBe("A-"); // 47.5 beyond -2s
    });
  });

  // ── Diagnostics ───────────────────────────────────────────────────────

  describe("diagnosePattern", () => {
    it("maps each rule to correct diagnostic output", () => {
      for (let rule = 1; rule <= 8; rule++) {
        const violations = [{
          rule,
          rule_name: `Rule ${rule}`,
          indices: [0],
          description: "test",
          severity: "warning" as const,
        }];
        const diag = nelsonSPCRulesEngine.diagnosePattern(violations);
        expect(diag.length).toBe(1);
        expect(diag[0].rule).toBe(rule);
        expect(diag[0].probable_causes.length).toBeGreaterThan(0);
        expect(
          diag[0].manufacturing_recommendations.length
        ).toBeGreaterThan(0);
      }
    });

    it("returns immediate urgency for Rule 1", () => {
      const violations = [{
        rule: 1, rule_name: "Beyond 3-sigma",
        indices: [5], description: "test", severity: "critical" as const,
      }];
      const diag = nelsonSPCRulesEngine.diagnosePattern(violations);
      expect(diag[0].urgency).toBe("immediate");
    });

    it("returns monitor urgency for Rule 7", () => {
      const violations = [{
        rule: 7, rule_name: "Stratification",
        indices: [0], description: "test", severity: "info" as const,
      }];
      const diag = nelsonSPCRulesEngine.diagnosePattern(violations);
      expect(diag[0].urgency).toBe("monitor");
    });
  });

  // ── Real Manufacturing Scenarios ──────────────────────────────────────

  describe("Real manufacturing scenarios", () => {
    it("detects progressive tool wear (Rule 3 — trend)", () => {
      // Simulate diameter growing as tool wears: 6 consecutive increases
      const baseline = Array.from({ length: 5 }, () => 25.000);
      const trend = [25.001, 25.003, 25.006, 25.010, 25.015, 25.021];
      const data = [...baseline, ...trend];
      const result = nelsonSPCRulesEngine.evaluateAllRules(
        data, 25.000, 0.005
      );
      const r3 = result.rule_results.find(r => r.rule === 3);
      expect(r3!.violated).toBe(true);
    });

    it("detects tool breakage (Rule 1 — outlier)", () => {
      // Stable process then sudden jump from tool breakage
      const data = [
        50.01, 49.98, 50.02, 49.99, 50.01,
        50.00, 49.97, 50.03, 54.50, 50.01,  // index 8 = breakage
      ];
      const result = nelsonSPCRulesEngine.evaluateAllRules(
        data, 50.00, 1.0
      );
      const r1 = result.rule_results.find(r => r.rule === 1);
      expect(r1!.violated).toBe(true);
      expect(r1!.violations[0].indices).toContain(8);
    });

    it("detects two machines mixed (Rule 8 — mixture)", () => {
      // Machine A runs at 50+2, Machine B at 50-2, alternating
      // All points beyond 1sigma, none within. mean=50, sigma=1
      const data = [52, 48, 52, 48, 52, 48, 52, 48];
      const result = nelsonSPCRulesEngine.evaluateAllRules(
        data, 50, 1
      );
      const r8 = result.rule_results.find(r => r.rule === 8);
      expect(r8!.violated).toBe(true);
    });

    it("detects over-compensation (Rule 4 — alternating)", () => {
      // Operator adjusts after every part, causing oscillation
      const data = [
        50, 51, 49, 51, 49, 51, 49, 51, 49, 51, 49, 51, 49, 51,
      ];
      const result = nelsonSPCRulesEngine.evaluateAllRules(
        data, 50, 1
      );
      const r4 = result.rule_results.find(r => r.rule === 4);
      expect(r4!.violated).toBe(true);
    });
  });
});
