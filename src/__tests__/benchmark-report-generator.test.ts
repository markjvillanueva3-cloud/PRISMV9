import { describe, it, expect, beforeEach } from "vitest";
import {
  BenchmarkReportGeneratorEngine,
  type BenchmarkReport,
  type ScorecardResult,
} from "../engines/BenchmarkReportGeneratorEngine.js";

describe("BenchmarkReportGeneratorEngine", () => {
  let engine: BenchmarkReportGeneratorEngine;

  beforeEach(() => {
    engine = new BenchmarkReportGeneratorEngine();
  });

  // ── generateReport ──

  describe("generateReport", () => {
    it("returns a valid report with all layers", () => {
      const report = engine.generateReport();
      expect(report.generated_at).toBeTruthy();
      expect(report.summary.total_tests).toBeGreaterThan(0);
      expect(report.summary.passed).toBeGreaterThanOrEqual(0);
      expect(report.summary.failed).toBeGreaterThanOrEqual(0);
      expect(report.summary.passed + report.summary.failed).toBe(report.summary.total_tests);
      expect(report.summary.pass_rate_pct).toBeGreaterThanOrEqual(0);
      expect(report.summary.pass_rate_pct).toBeLessThanOrEqual(100);
      expect(report.summary.overall_score).toBeGreaterThanOrEqual(0);
      expect(report.summary.overall_score).toBeLessThanOrEqual(100);
    });

    it("includes all 5 layers by default", () => {
      const report = engine.generateReport();
      expect(report.layers).toHaveLength(5);
      expect(report.layers.map(l => l.layer)).toEqual([1, 2, 3, 4, 5]);
    });

    it("filters to specific layers when include_layers is provided", () => {
      const report = engine.generateReport({ include_layers: [1, 3] });
      expect(report.layers).toHaveLength(2);
      expect(report.layers.map(l => l.layer)).toEqual([1, 3]);
    });

    it("layer 1 has correct name", () => {
      const report = engine.generateReport({ include_layers: [1] });
      expect(report.layers[0].name).toBe("Synthetic Parts");
      expect(report.layers[0].total).toBe(15);
    });

    it("layer 2 references Math Proof", () => {
      const report = engine.generateReport({ include_layers: [2] });
      expect(report.layers[0].name).toBe("Math Proof");
      expect(report.layers[0].total).toBeGreaterThan(0);
    });

    it("layer 3 references Cross-Engine", () => {
      const report = engine.generateReport({ include_layers: [3] });
      expect(report.layers[0].name).toBe("Cross-Engine");
    });

    it("layer 4 references Machine Coverage with 910 machines", () => {
      const report = engine.generateReport({ include_layers: [4] });
      expect(report.layers[0].name).toBe("Machine Coverage");
      expect(report.layers[0].total).toBe(910);
    });

    it("layer 5 references Beat Defaults", () => {
      const report = engine.generateReport({ include_layers: [5] });
      expect(report.layers[0].name).toBe("Beat Defaults");
      expect(report.layers[0].total).toBe(10);
    });

    it("single layer report has fewer total tests", () => {
      const full = engine.generateReport();
      const single = engine.generateReport({ include_layers: [1] });
      expect(single.summary.total_tests).toBeLessThan(full.summary.total_tests);
    });
  });

  // ── Formula Accuracy ──

  describe("formula accuracy", () => {
    it("computes formula accuracy for all 5 formulas", () => {
      const report = engine.generateReport();
      const fa = report.formula_accuracy;
      expect(fa.kienzle_force).toBeDefined();
      expect(fa.taylor_life).toBeDefined();
      expect(fa.deflection).toBeDefined();
      expect(fa.surface_finish).toBeDefined();
      expect(fa.power).toBeDefined();
    });

    it("all formulas have tests > 0", () => {
      const report = engine.generateReport();
      for (const entry of Object.values(report.formula_accuracy)) {
        expect(entry.tests).toBeGreaterThan(0);
      }
    });

    it("avg_error_pct <= max_error_pct for each formula", () => {
      const report = engine.generateReport();
      for (const entry of Object.values(report.formula_accuracy)) {
        expect(entry.avg_error_pct).toBeLessThanOrEqual(entry.max_error_pct);
      }
    });

    it("error percentages are non-negative", () => {
      const report = engine.generateReport();
      for (const entry of Object.values(report.formula_accuracy)) {
        expect(entry.avg_error_pct).toBeGreaterThanOrEqual(0);
        expect(entry.max_error_pct).toBeGreaterThanOrEqual(0);
      }
    });
  });

  // ── Physics Consistency ──

  describe("physics consistency", () => {
    it("all agreement percentages are between 0 and 100", () => {
      const report = engine.generateReport();
      const pc = report.physics_consistency;
      expect(pc.sfo_vs_canonical).toBeGreaterThan(0);
      expect(pc.sfo_vs_canonical).toBeLessThanOrEqual(100);
      expect(pc.postprocessor_vs_sfo).toBeGreaterThan(0);
      expect(pc.postprocessor_vs_sfo).toBeLessThanOrEqual(100);
      expect(pc.simulation_vs_canonical).toBeGreaterThan(0);
      expect(pc.simulation_vs_canonical).toBeLessThanOrEqual(100);
    });

    it("max_divergence_pct is non-negative", () => {
      const report = engine.generateReport();
      expect(report.physics_consistency.max_divergence_pct).toBeGreaterThanOrEqual(0);
    });
  });

  // ── Machine Coverage ──

  describe("machine coverage", () => {
    it("total machines is 910", () => {
      const report = engine.generateReport();
      expect(report.machine_coverage.total_machines_tested).toBe(910);
    });

    it("by_type sums are reasonable", () => {
      const report = engine.generateReport();
      const total = Object.values(report.machine_coverage.by_type)
        .reduce((s, n) => s + n, 0);
      expect(total).toBe(910);
    });

    it("all_within_limits is boolean", () => {
      const report = engine.generateReport();
      expect(typeof report.machine_coverage.all_within_limits).toBe("boolean");
    });
  });

  // ── Industry Benchmarks ──

  describe("industry benchmarks", () => {
    it("has 10 industry programs", () => {
      const report = engine.generateReport();
      expect(report.industry_benchmarks.parts_tested).toBe(10);
      expect(report.industry_benchmarks.per_part).toHaveLength(10);
    });

    it("each part has a verdict", () => {
      const report = engine.generateReport();
      for (const part of report.industry_benchmarks.per_part) {
        expect(["BEATEN", "MATCHED", "LOST"]).toContain(part.verdict);
      }
    });

    it("parts_beaten <= parts_tested", () => {
      const report = engine.generateReport();
      const ib = report.industry_benchmarks;
      expect(ib.parts_beaten).toBeLessThanOrEqual(ib.parts_tested);
    });

    it("all 10 parts are BEATEN (negative cycle_time_delta)", () => {
      const report = engine.generateReport();
      for (const part of report.industry_benchmarks.per_part) {
        expect(part.cycle_time_delta_pct).toBeLessThan(0);
        expect(part.verdict).toBe("BEATEN");
      }
    });
  });

  // ── Overall Score ──

  describe("overall score", () => {
    it("score is between 0 and 100", () => {
      const report = engine.generateReport();
      expect(report.summary.overall_score).toBeGreaterThanOrEqual(0);
      expect(report.summary.overall_score).toBeLessThanOrEqual(100);
    });

    it("high pass rate contributes to high score", () => {
      const report = engine.generateReport();
      // Our test data should yield a high score
      expect(report.summary.overall_score).toBeGreaterThan(80);
    });
  });

  // ── generateTextReport ──

  describe("generateTextReport", () => {
    it("returns a non-empty string", () => {
      const text = engine.generateTextReport();
      expect(typeof text).toBe("string");
      expect(text.length).toBeGreaterThan(100);
    });

    it("contains PRISM BENCHMARK REPORT header", () => {
      const text = engine.generateTextReport();
      expect(text).toContain("PRISM BENCHMARK REPORT");
    });

    it("contains OVERALL SCORE line", () => {
      const text = engine.generateTextReport();
      expect(text).toMatch(/OVERALL SCORE: \d+\.\d\/100/);
    });

    it("contains formula accuracy section", () => {
      const text = engine.generateTextReport();
      expect(text).toContain("Formula Accuracy:");
      expect(text).toContain("Kienzle force:");
      expect(text).toContain("Taylor life:");
      expect(text).toContain("Deflection:");
    });

    it("contains industry benchmark entries", () => {
      const text = engine.generateTextReport();
      expect(text).toContain("IB-001");
      expect(text).toContain("Aluminum Bracket");
      expect(text).toContain("[BEATEN]");
    });

    it("verbose mode includes machine coverage details", () => {
      const text = engine.generateTextReport({ verbose: true });
      expect(text).toContain("Verbose: Machine Coverage");
      expect(text).toContain("VMC:");
    });

    it("non-verbose mode omits machine details", () => {
      const text = engine.generateTextReport({ verbose: false });
      expect(text).not.toContain("Verbose: Machine Coverage");
    });

    it("respects layer filter in text output", () => {
      const text = engine.generateTextReport({ include_layers: [1] });
      expect(text).toContain("Layer 1");
      expect(text).not.toContain("Layer 5");
    });
  });

  // ── scorecard ──

  describe("scorecard", () => {
    it("returns scorecard for valid benchmark_id", () => {
      const card = engine.scorecard({ benchmark_id: "IB-001" });
      expect(card.benchmark_id).toBe("IB-001");
      expect(card.name).toBe("Aluminum Bracket");
      expect(card.material).toBe("aluminum_6061");
    });

    it("throws for unknown benchmark_id", () => {
      expect(() => engine.scorecard({ benchmark_id: "IB-999" }))
        .toThrow("Unknown benchmark_id");
    });

    it("scorecard has correct verdict", () => {
      const card = engine.scorecard({ benchmark_id: "IB-001" });
      expect(card.verdict).toBe("BEATEN");
    });

    it("scorecard computes cycle time improvement", () => {
      const card = engine.scorecard({ benchmark_id: "IB-001" });
      expect(card.cycle_time_delta_pct).toBe(-22);
      expect(card.prism_cycle_time_min).toBeLessThan(card.default_cycle_time_min);
    });

    it("scorecard includes formula checks", () => {
      const card = engine.scorecard({ benchmark_id: "IB-002" });
      expect(card.formula_checks).toHaveLength(5);
      for (const check of card.formula_checks) {
        expect(check.pass).toBe(true);
        expect(check.error_pct).toBe(0);
      }
    });

    it("scorecard cost improvement is negative (savings)", () => {
      const card = engine.scorecard({ benchmark_id: "IB-003" });
      expect(card.cost_delta_pct).toBeLessThan(0);
      expect(card.prism_cost).toBeLessThan(card.default_cost);
    });

    it("scorecard tool life improvement is positive", () => {
      const card = engine.scorecard({ benchmark_id: "IB-005" });
      expect(card.tool_life_delta_pct).toBeGreaterThan(0);
      expect(card.prism_tool_life_min).toBeGreaterThan(card.default_tool_life_min);
    });
  });

  // ── Edge cases ──

  describe("edge cases", () => {
    it("empty layers array returns report with no layers", () => {
      const report = engine.generateReport({ include_layers: [] });
      expect(report.layers).toHaveLength(0);
      expect(report.summary.total_tests).toBe(0);
    });

    it("report is deterministic across calls", () => {
      const r1 = engine.generateReport();
      const r2 = engine.generateReport();
      expect(r1.summary.overall_score).toBe(r2.summary.overall_score);
      expect(r1.summary.total_tests).toBe(r2.summary.total_tests);
      expect(r1.formula_accuracy.kienzle_force.avg_error_pct)
        .toBe(r2.formula_accuracy.kienzle_force.avg_error_pct);
    });

    it("invalid layer numbers are silently ignored", () => {
      const report = engine.generateReport({ include_layers: [99] });
      expect(report.layers).toHaveLength(0);
    });

    it("generated_at is a valid ISO date string", () => {
      const report = engine.generateReport();
      const date = new Date(report.generated_at);
      expect(date.getTime()).not.toBeNaN();
    });
  });
});
