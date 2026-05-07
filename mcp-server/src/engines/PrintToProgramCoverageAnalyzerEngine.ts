/**
 * PrintToProgramCoverageAnalyzerEngine — P2P-FULLSTACK-MS0/U-P2PFS63
 *
 * Capstone for the P2P-FULLSTACK-MS0 resource-harvesting block. Unifies
 * the five prior sub-systems into a single coverage matrix + gap report:
 *
 *   U-P2PFS58  TestResourceRegistryEngine         — what fixtures exist
 *   U-P2PFS59  PrintToProgramRegressionHarnessEngine — what runs through
 *                                                      a wired pipeline
 *   U-P2PFS60  MultiControllerCalibrationEngine   — what dialects are
 *                                                    calibrated
 *   U-P2PFS61  PairedPrintProgramBundleEngine     — what fixtures have
 *                                                    signature bundles
 *   U-P2PFS62  PrintToProgramTutorialEngine       — what fixtures have
 *                                                    curricula
 *
 * Output: a FixtureCoverageRow per fixture (bundle?, tutorial?,
 * runnable_pipeline?, harness_verdict?) + process-level rollups + a
 * prioritized gap list telling a human what to build next.
 *
 * Purpose: a single signal that drifts INSIDE the test infrastructure
 * itself, so when a new fixture lands or a new pipeline gets wired the
 * dashboard shows what's still missing instead of leaving it to tribal
 * memory.
 *
 * Engine does NOT mutate any upstream state. Pure analyzer.
 */

import {
  testResourceRegistryEngine,
  type TestResource,
  type TestProcess,
} from "./TestResourceRegistryEngine.js";
import {
  printToProgramRegressionHarnessEngine,
  type RegressionResult,
} from "./PrintToProgramRegressionHarnessEngine.js";
import {
  pairedPrintProgramBundleEngine,
} from "./PairedPrintProgramBundleEngine.js";
import {
  printToProgramTutorialEngine,
} from "./PrintToProgramTutorialEngine.js";
import {
  multiControllerCalibrationEngine,
  canonicalProbes,
  type ControllerDialect,
} from "./MultiControllerCalibrationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export interface FixtureCoverageRow {
  fixture_id: string;
  process: TestProcess;
  difficulty: string;
  coverage: string;
  /** True if a PairedPrintProgramBundle is registered for this fixture. */
  has_bundle: boolean;
  /** True if a Tutorial walkthrough is registered for this fixture. */
  has_tutorial: boolean;
  /** True if the process has a wired pipeline in the regression harness. */
  runnable_pipeline: boolean;
  /** Regression verdict when the harness ran (or "not_run"). */
  harness_verdict: "pass" | "fail" | "skip" | "warning" | "not_run";
}

export interface ProcessCoverage {
  process: TestProcess;
  fixture_count: number;
  runnable: boolean;
  bundle_coverage_pct: number;
  tutorial_coverage_pct: number;
  /** pass + warning out of runnable fixtures. */
  harness_pass_pct: number;
}

export interface ControllerCoverage {
  total_calibrated: number;
  total_probes: number;
  dialects: ControllerDialect[];
  universal_hits_pct: number;
  divergent_count: number;
}

export interface CoverageGap {
  /** Short human-readable tag. */
  kind:
    | "missing_bundle"
    | "missing_tutorial"
    | "no_pipeline_for_process"
    | "harness_fail"
    | "controller_divergence";
  /** Which fixture/process/dialect the gap applies to. */
  target: string;
  /** 1 = highest priority, 5 = lowest. */
  priority: 1 | 2 | 3 | 4 | 5;
  /** One-line explanation. */
  reason: string;
}

export interface CoverageReport {
  generated_at: string;
  total_fixtures: number;
  /** overall_coverage_pct weights bundle + tutorial + runnable equally. */
  overall_coverage_pct: number;
  per_fixture: FixtureCoverageRow[];
  per_process: ProcessCoverage[];
  controllers: ControllerCoverage;
  gaps: CoverageGap[];
}

// ============================================================================
// ENGINE
// ============================================================================

const WIRED_PIPELINE_PROCESSES: TestProcess[] = ["sinker_edm"];

export class PrintToProgramCoverageAnalyzerEngine {
  constructor(
    private readonly registry = testResourceRegistryEngine,
    private readonly harness = printToProgramRegressionHarnessEngine,
    private readonly bundles = pairedPrintProgramBundleEngine,
    private readonly tutorials = printToProgramTutorialEngine,
    private readonly calibration = multiControllerCalibrationEngine,
  ) {}

  /** Run the full coverage analysis. */
  analyze(): CoverageReport {
    const fixtures = this.registry.list();
    const bundleIds = new Set(this.bundles.bundles().map((b) => b.fixture_id));
    const tutorialIds = new Set(this.tutorials.walkthroughs().map((w) => w.fixture_id));

    // Run the harness once and index by fixture_id for lookup
    const harnessOut = this.harness.run();
    const harnessByFixture = new Map<string, RegressionResult>(
      harnessOut.results.map((r) => [r.fixture_id, r]),
    );

    const perFixture: FixtureCoverageRow[] = fixtures.map((f) =>
      this._rowFor(f, bundleIds, tutorialIds, harnessByFixture),
    );

    const perProcess = this._rollupByProcess(perFixture);
    const controllers = this._analyzeControllers();
    const gaps = this._collectGaps(perFixture, perProcess, controllers);
    const overall = this._overallCoveragePct(perFixture);

    return {
      generated_at: new Date().toISOString(),
      total_fixtures: perFixture.length,
      overall_coverage_pct: overall,
      per_fixture: perFixture,
      per_process: perProcess,
      controllers,
      gaps,
    };
  }

  /** Quick lookup: is this fixture fully covered? */
  isFullyCovered(fixture_id: string): boolean {
    const f = this.registry.get(fixture_id);
    if (!f) return false;
    const hasBundle = this.bundles.getBundle(fixture_id) !== undefined;
    const hasTutorial = this.tutorials.getWalkthrough(fixture_id) !== undefined;
    const runnable = WIRED_PIPELINE_PROCESSES.includes(f.process);
    return hasBundle && hasTutorial && runnable;
  }

  // ── internals ──────────────────────────────────────────────────────────

  private _rowFor(
    f: TestResource,
    bundleIds: Set<string>,
    tutorialIds: Set<string>,
    harnessByFixture: Map<string, RegressionResult>,
  ): FixtureCoverageRow {
    const harnessR = harnessByFixture.get(f.id);
    return {
      fixture_id: f.id,
      process: f.process,
      difficulty: f.difficulty,
      coverage: f.coverage,
      has_bundle: bundleIds.has(f.id),
      has_tutorial: tutorialIds.has(f.id),
      runnable_pipeline: WIRED_PIPELINE_PROCESSES.includes(f.process),
      harness_verdict: harnessR ? harnessR.verdict : "not_run",
    };
  }

  private _rollupByProcess(rows: FixtureCoverageRow[]): ProcessCoverage[] {
    const byProc = new Map<TestProcess, FixtureCoverageRow[]>();
    for (const r of rows) {
      const arr = byProc.get(r.process) ?? [];
      arr.push(r);
      byProc.set(r.process, arr);
    }
    return Array.from(byProc.entries()).map(([process, group]) => {
      const runnable = WIRED_PIPELINE_PROCESSES.includes(process);
      const bundles = group.filter((g) => g.has_bundle).length;
      const tuts = group.filter((g) => g.has_tutorial).length;
      const passing = group.filter(
        (g) => g.harness_verdict === "pass" || g.harness_verdict === "warning",
      ).length;
      return {
        process,
        fixture_count: group.length,
        runnable,
        bundle_coverage_pct: pct(bundles, group.length),
        tutorial_coverage_pct: pct(tuts, group.length),
        harness_pass_pct: runnable ? pct(passing, group.length) : 0,
      };
    });
  }

  private _analyzeControllers(): ControllerCoverage {
    const probes = canonicalProbes();
    const cal = this.calibration.compareAll(probes);
    return {
      total_calibrated: cal.per_dialect.filter((d) => d.passed).length,
      total_probes: probes.length,
      dialects: cal.per_dialect.map((d) => d.dialect),
      universal_hits_pct: pct(cal.universal_hits.length, 5), // 5 canonical required
      divergent_count: cal.divergent_dialects.length,
    };
  }

  private _collectGaps(
    rows: FixtureCoverageRow[],
    perProcess: ProcessCoverage[],
    controllers: ControllerCoverage,
  ): CoverageGap[] {
    const gaps: CoverageGap[] = [];

    // Missing bundles (priority 2 for calibration/regression fixtures, 3 for tutorial)
    for (const r of rows) {
      if (!r.has_bundle) {
        const isHotCoverage =
          r.coverage === "regression" || r.coverage === "calibration";
        gaps.push({
          kind: "missing_bundle",
          target: r.fixture_id,
          priority: isHotCoverage ? 2 : 3,
          reason: `Fixture '${r.fixture_id}' (${r.coverage}) has no PairedPrintProgramBundle`,
        });
      }
    }

    // Missing tutorials (priority 3 for tutorial coverage, 4 for other)
    for (const r of rows) {
      if (!r.has_tutorial) {
        const isTutorialCoverage = r.coverage === "tutorial";
        gaps.push({
          kind: "missing_tutorial",
          target: r.fixture_id,
          priority: isTutorialCoverage ? 3 : 4,
          reason: `Fixture '${r.fixture_id}' (${r.coverage}) has no TutorialWalkthrough`,
        });
      }
    }

    // Processes with no pipeline wired
    for (const pp of perProcess) {
      if (!pp.runnable) {
        gaps.push({
          kind: "no_pipeline_for_process",
          target: pp.process,
          priority: 1,
          reason: `No harness pipeline wired for process='${pp.process}' (${pp.fixture_count} fixtures stranded)`,
        });
      }
    }

    // Harness failures — always priority 1
    for (const r of rows) {
      if (r.harness_verdict === "fail") {
        gaps.push({
          kind: "harness_fail",
          target: r.fixture_id,
          priority: 1,
          reason: `Harness reported 'fail' for fixture '${r.fixture_id}'`,
        });
      }
    }

    // Controller divergence
    if (controllers.divergent_count > 0) {
      gaps.push({
        kind: "controller_divergence",
        target: `${controllers.divergent_count} dialect(s)`,
        priority: 2,
        reason: `${controllers.divergent_count} controller dialect(s) diverge from the majority consensus`,
      });
    }

    // Sort by priority ascending, then by target alphabetically for stability
    gaps.sort((a, b) => {
      if (a.priority !== b.priority) return a.priority - b.priority;
      return a.target.localeCompare(b.target);
    });

    return gaps;
  }

  private _overallCoveragePct(rows: FixtureCoverageRow[]): number {
    if (rows.length === 0) return 0;
    // Equal weight: each fixture contributes 3 "points" (bundle, tutorial, runnable)
    let earned = 0;
    let possible = 0;
    for (const r of rows) {
      possible += 3;
      if (r.has_bundle) earned += 1;
      if (r.has_tutorial) earned += 1;
      if (r.runnable_pipeline) earned += 1;
    }
    return pct(earned, possible);
  }
}

// ============================================================================
// HELPERS
// ============================================================================

function pct(n: number, d: number): number {
  if (d === 0) return 0;
  return Math.round((n / d) * 10000) / 100;
}

// ============================================================================
// SINGLETON
// ============================================================================

export const printToProgramCoverageAnalyzerEngine = new PrintToProgramCoverageAnalyzerEngine();
