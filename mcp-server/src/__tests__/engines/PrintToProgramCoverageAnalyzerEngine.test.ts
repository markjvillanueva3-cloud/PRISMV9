/**
 * PrintToProgramCoverageAnalyzerEngine tests
 * P2P-FULLSTACK-MS0 / U-P2PFS63
 */
import { describe, it, expect } from "vitest";
import {
  PrintToProgramCoverageAnalyzerEngine,
  printToProgramCoverageAnalyzerEngine,
} from "../../engines/PrintToProgramCoverageAnalyzerEngine.js";
import { TestResourceRegistryEngine } from "../../engines/TestResourceRegistryEngine.js";
import { PrintToProgramRegressionHarnessEngine } from "../../engines/PrintToProgramRegressionHarnessEngine.js";
import { PairedPrintProgramBundleEngine } from "../../engines/PairedPrintProgramBundleEngine.js";
import { PrintToProgramTutorialEngine } from "../../engines/PrintToProgramTutorialEngine.js";
import { MultiControllerCalibrationEngine } from "../../engines/MultiControllerCalibrationEngine.js";

function defaultAnalyzer() {
  return new PrintToProgramCoverageAnalyzerEngine();
}

function isolatedAnalyzer() {
  // Build an analyzer whose inputs are known — no cross-test bleed.
  return new PrintToProgramCoverageAnalyzerEngine(
    new TestResourceRegistryEngine(),
    new PrintToProgramRegressionHarnessEngine(new TestResourceRegistryEngine()),
    new PairedPrintProgramBundleEngine(),
    new PrintToProgramTutorialEngine(),
    new MultiControllerCalibrationEngine(),
  );
}

describe("PrintToProgramCoverageAnalyzerEngine", () => {
  it("exports a ready-to-use singleton", () => {
    expect(printToProgramCoverageAnalyzerEngine).toBeInstanceOf(
      PrintToProgramCoverageAnalyzerEngine,
    );
  });

  it("analyze() returns a report with one row per registered fixture", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    expect(report.total_fixtures).toBe(report.per_fixture.length);
    expect(report.total_fixtures).toBeGreaterThan(0);
  });

  it("report.generated_at is an ISO-8601 string", () => {
    const report = defaultAnalyzer().analyze();
    expect(() => new Date(report.generated_at).toISOString()).not.toThrow();
  });

  it("each fixture row has the correct boolean flags set", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    for (const row of report.per_fixture) {
      expect(typeof row.has_bundle).toBe("boolean");
      expect(typeof row.has_tutorial).toBe("boolean");
      expect(typeof row.runnable_pipeline).toBe("boolean");
      // Only sinker_edm has a wired pipeline today
      if (row.process === "sinker_edm") {
        expect(row.runnable_pipeline).toBe(true);
      } else {
        expect(row.runnable_pipeline).toBe(false);
      }
    }
  });

  it("sinker_edm fixtures get pass/warning harness verdicts", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    const sinkers = report.per_fixture.filter((r) => r.process === "sinker_edm");
    expect(sinkers.length).toBeGreaterThan(0);
    for (const r of sinkers) {
      expect(["pass", "warning"]).toContain(r.harness_verdict);
    }
  });

  it("non-sinker fixtures get skip harness verdict (pipeline not wired)", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    const nonSinkers = report.per_fixture.filter((r) => r.process !== "sinker_edm");
    for (const r of nonSinkers) {
      expect(r.harness_verdict).toBe("skip");
    }
  });

  it("per_process rollup sums to total_fixtures", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    const sum = report.per_process.reduce((s, p) => s + p.fixture_count, 0);
    expect(sum).toBe(report.total_fixtures);
  });

  it("per_process marks sinker_edm runnable; everything else not", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    for (const p of report.per_process) {
      if (p.process === "sinker_edm") expect(p.runnable).toBe(true);
      else expect(p.runnable).toBe(false);
    }
  });

  it("bundle_coverage_pct matches actual bundle/fixture ratio", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    for (const p of report.per_process) {
      const group = report.per_fixture.filter((r) => r.process === p.process);
      const expected =
        group.length > 0
          ? Math.round(
              (group.filter((r) => r.has_bundle).length / group.length) * 10000,
            ) / 100
          : 0;
      expect(p.bundle_coverage_pct).toBeCloseTo(expected, 2);
    }
  });

  it("controllers block reports 5 canonical probes all passing", () => {
    const a = isolatedAnalyzer();
    const c = a.analyze().controllers;
    expect(c.total_probes).toBe(5);
    expect(c.total_calibrated).toBe(5);
    expect(c.universal_hits_pct).toBe(100);
    expect(c.divergent_count).toBe(0);
  });

  it("gaps list is sorted by priority ascending", () => {
    const a = isolatedAnalyzer();
    const gaps = a.analyze().gaps;
    for (let i = 1; i < gaps.length; i++) {
      expect(gaps[i].priority).toBeGreaterThanOrEqual(gaps[i - 1].priority);
    }
  });

  it("gaps flag non-sinker processes as no_pipeline_for_process (priority 1)", () => {
    const a = isolatedAnalyzer();
    const gaps = a.analyze().gaps;
    const pipelineGaps = gaps.filter((g) => g.kind === "no_pipeline_for_process");
    expect(pipelineGaps.length).toBeGreaterThan(0);
    for (const g of pipelineGaps) {
      expect(g.priority).toBe(1);
      expect(g.target).not.toBe("sinker_edm"); // sinker is wired
    }
  });

  it("gaps flag fixtures without bundles", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    const missingBundleIds = report.per_fixture
      .filter((r) => !r.has_bundle)
      .map((r) => r.fixture_id);
    const bundleGaps = report.gaps.filter((g) => g.kind === "missing_bundle");
    for (const id of missingBundleIds) {
      expect(bundleGaps.some((g) => g.target === id)).toBe(true);
    }
  });

  it("gaps flag fixtures without tutorials", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    const missingTutIds = report.per_fixture
      .filter((r) => !r.has_tutorial)
      .map((r) => r.fixture_id);
    const tutGaps = report.gaps.filter((g) => g.kind === "missing_tutorial");
    for (const id of missingTutIds) {
      expect(tutGaps.some((g) => g.target === id)).toBe(true);
    }
  });

  it("overall_coverage_pct is 0..100", () => {
    const a = isolatedAnalyzer();
    const pct = a.analyze().overall_coverage_pct;
    expect(pct).toBeGreaterThanOrEqual(0);
    expect(pct).toBeLessThanOrEqual(100);
  });

  it("isFullyCovered: true iff bundle + tutorial + wired pipeline", () => {
    const a = isolatedAnalyzer();
    const report = a.analyze();
    for (const row of report.per_fixture) {
      const covered = a.isFullyCovered(row.fixture_id);
      const expected = row.has_bundle && row.has_tutorial && row.runnable_pipeline;
      expect(covered).toBe(expected);
    }
  });

  it("isFullyCovered returns false for unknown fixture_id", () => {
    const a = isolatedAnalyzer();
    expect(a.isFullyCovered("does-not-exist")).toBe(false);
  });

  it("empty registry → zero fixtures + zero coverage + per-process empty", () => {
    const emptyReg = new TestResourceRegistryEngine([]);
    const a = new PrintToProgramCoverageAnalyzerEngine(
      emptyReg,
      new PrintToProgramRegressionHarnessEngine(emptyReg),
      new PairedPrintProgramBundleEngine([]),
      new PrintToProgramTutorialEngine([]),
      new MultiControllerCalibrationEngine(),
    );
    const report = a.analyze();
    expect(report.total_fixtures).toBe(0);
    expect(report.overall_coverage_pct).toBe(0);
    expect(report.per_fixture).toHaveLength(0);
    expect(report.per_process).toHaveLength(0);
  });

  it("overall_coverage_pct weights bundle + tutorial + runnable equally", () => {
    const emptyReg = new TestResourceRegistryEngine([]);
    emptyReg.register({
      id: "sinker-covered",
      process: "sinker_edm",
      coverage: "regression",
      difficulty: "intermediate",
      label: "covered",
    });
    emptyReg.register({
      id: "mill-stranded",
      process: "mill",
      coverage: "tutorial",
      difficulty: "beginner",
      label: "stranded",
    });
    const bundles = new PairedPrintProgramBundleEngine([
      {
        fixture_id: "sinker-covered",
        process: "sinker_edm",
        print_summary: "covered",
        program_signature: {},
      },
    ]);
    const tuts = new PrintToProgramTutorialEngine([
      {
        fixture_id: "sinker-covered",
        title: "t",
        difficulty: "beginner",
        prerequisites: [],
        learning_objectives: ["x"],
        steps: [
          {
            step_number: 1,
            title: "s",
            decision: "d",
            reasoning: "r",
            common_mistakes: [],
            expected_outcome: "o",
          },
        ],
        estimated_minutes: 10,
      },
    ]);
    const a = new PrintToProgramCoverageAnalyzerEngine(
      emptyReg,
      new PrintToProgramRegressionHarnessEngine(emptyReg),
      bundles,
      tuts,
      new MultiControllerCalibrationEngine(),
    );
    const report = a.analyze();
    // sinker-covered: bundle(+1) + tutorial(+1) + runnable(+1) = 3 of 3
    // mill-stranded:  bundle(0) + tutorial(0) + runnable(0) = 0 of 3
    // total 3 / 6 = 50%
    expect(report.overall_coverage_pct).toBeCloseTo(50, 1);
  });

  it("harness_fail gap lands at priority 1 when the pipeline rejects a fixture", () => {
    const emptyReg = new TestResourceRegistryEngine([]);
    emptyReg.register({
      id: "broken-proc",
      process: "completely_made_up" as any, // unknown process → harness will fail
      coverage: "regression",
      difficulty: "intermediate",
      label: "broken",
    });
    const a = new PrintToProgramCoverageAnalyzerEngine(
      emptyReg,
      new PrintToProgramRegressionHarnessEngine(emptyReg),
      new PairedPrintProgramBundleEngine([]),
      new PrintToProgramTutorialEngine([]),
      new MultiControllerCalibrationEngine(),
    );
    const report = a.analyze();
    const failGap = report.gaps.find((g) => g.kind === "harness_fail");
    expect(failGap).toBeDefined();
    expect(failGap?.priority).toBe(1);
    expect(failGap?.target).toBe("broken-proc");
  });

  it("analyze() doesn't mutate upstream engines", () => {
    const a = isolatedAnalyzer();
    const firstReport = a.analyze();
    const secondReport = a.analyze();
    expect(firstReport.total_fixtures).toBe(secondReport.total_fixtures);
    expect(firstReport.per_process.length).toBe(secondReport.per_process.length);
  });
});
