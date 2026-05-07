/**
 * PrintToProgramRegressionHarnessEngine — P2P-FULLSTACK-MS0/U-P2PFS59
 *
 * Replays TestResource fixtures through their matching Print-to-Program
 * pipeline and produces a structured pass/fail verdict per fixture.
 *
 * This is NOT the vitest-level engine unit tests — those validate a
 * single pipeline in isolation with synthetic features. This engine
 * validates that the *composite* pipeline (drawing → P2P → post) behaves
 * consistently across the full fixture registry, so a change to any
 * upstream engine surfaces as an obvious regression here instead of
 * being caught only in 6 specific unit tests.
 *
 * The harness is *synthetic-feature-driven*: for each fixture, it
 * extracts a PartFeature stand-in from the fixture's metadata (material,
 * operation, tags) and feeds it to the pipeline. This keeps the harness
 * deterministic + cheap — no file I/O, no CAD parsing. Real file-backed
 * replay can be added later without changing the verdict schema.
 *
 * Verdicts:
 *   pass     — pipeline ran, produced non-empty output, no errors
 *   skip     — fixture.process has no wired pipeline yet
 *   fail     — pipeline threw OR produced empty/invalid output
 *   warning  — pipeline passed but downstream warnings surfaced
 */

import {
  testResourceRegistryEngine,
  type TestResource,
  type TestResourceFilter,
  type TestProcess,
} from "./TestResourceRegistryEngine.js";
import { sinkerEDMPrintToProgramEngine } from "./SinkerEDMPrintToProgramEngine.js";
import type { PartFeature } from "./EDMDrawingInterpretationEngine.js";

// ============================================================================
// TYPES
// ============================================================================

export type RegressionVerdict = "pass" | "fail" | "skip" | "warning";

export interface RegressionResult {
  fixture_id: string;
  process: TestProcess;
  verdict: RegressionVerdict;
  /** Pipeline duration in ms (wall clock). */
  duration_ms: number;
  /** Rendered program length in lines — 0 if skipped/failed. */
  line_count: number;
  /** Warnings from the pipeline, if any. */
  warnings: string[];
  /** Error text if verdict == "fail". */
  error?: string;
  /** Reason text for skip verdicts. */
  skip_reason?: string;
}

export interface RegressionSummary {
  total: number;
  pass: number;
  fail: number;
  skip: number;
  warning: number;
  pass_rate: number;
  average_duration_ms: number;
  by_process: Record<TestProcess, { total: number; pass: number; fail: number }>;
  failed_ids: string[];
}

export interface RegressionRunResult {
  results: RegressionResult[];
  summary: RegressionSummary;
}

// ============================================================================
// ENGINE
// ============================================================================

export class PrintToProgramRegressionHarnessEngine {
  constructor(
    private readonly registry = testResourceRegistryEngine,
    private readonly sinkerP2P = sinkerEDMPrintToProgramEngine,
  ) {}

  /** Run all fixtures (optionally filtered). */
  run(filter: TestResourceFilter = {}): RegressionRunResult {
    const fixtures = this.registry.filter(filter);
    const results: RegressionResult[] = fixtures.map((f) => this.runOne(f));
    return { results, summary: this.summarize(results) };
  }

  /** Run a single fixture by id. Throws if id not registered. */
  runById(id: string): RegressionResult {
    const f = this.registry.get(id);
    if (!f) throw new Error(`Fixture not registered: ${id}`);
    return this.runOne(f);
  }

  /** Run one fixture through its matching pipeline. */
  runOne(fixture: TestResource): RegressionResult {
    const start = Date.now();
    const base: RegressionResult = {
      fixture_id: fixture.id,
      process: fixture.process,
      verdict: "skip",
      duration_ms: 0,
      line_count: 0,
      warnings: [],
    };

    try {
      switch (fixture.process) {
        case "sinker_edm":
          return this.runSinker(fixture, start);
        case "wire_edm":
        case "lathe":
        case "mill":
        case "grinder":
        case "welder":
        case "laser":
        case "waterjet":
          return {
            ...base,
            duration_ms: Date.now() - start,
            skip_reason: `No harness pipeline wired for process="${fixture.process}"`,
          };
        default:
          return {
            ...base,
            duration_ms: Date.now() - start,
            verdict: "fail",
            error: `Unknown process type "${fixture.process}"`,
          };
      }
    } catch (e) {
      return {
        ...base,
        duration_ms: Date.now() - start,
        verdict: "fail",
        error: e instanceof Error ? e.message : String(e),
      };
    }
  }

  // ── Per-pipeline adapters ──────────────────────────────────────────────

  private runSinker(fixture: TestResource, start: number): RegressionResult {
    const feature = this.synthesizeFeature(fixture);
    const out = this.sinkerP2P.run({
      features: [feature],
      workpiece_material: fixture.material ?? "d2",
      workpiece_hardness_HRC: 60,
    });
    const duration = Date.now() - start;
    const lineCount = out.program?.line_count ?? 0;
    const warnings = Array.isArray(out.warnings) ? out.warnings.map(String) : [];

    if (lineCount <= 0) {
      return {
        fixture_id: fixture.id,
        process: fixture.process,
        verdict: "fail",
        duration_ms: duration,
        line_count: lineCount,
        warnings,
        error: "Pipeline produced empty program",
      };
    }

    return {
      fixture_id: fixture.id,
      process: fixture.process,
      verdict: warnings.length > 0 ? "warning" : "pass",
      duration_ms: duration,
      line_count: lineCount,
      warnings,
    };
  }

  /**
   * Build a synthetic PartFeature from a fixture's metadata. This is
   * deterministic: the same fixture always produces the same feature,
   * so regression runs are reproducible.
   *
   * Size/depth defaults scale gently with difficulty tier so harder
   * fixtures exercise deeper cavities.
   */
  private synthesizeFeature(fixture: TestResource): PartFeature {
    const sizeByDifficulty: Record<string, { L: number; W: number; D: number }> = {
      beginner: { L: 12, W: 8, D: 4 },
      intermediate: { L: 20, W: 14, D: 10 },
      advanced: { L: 28, W: 20, D: 18 },
      expert: { L: 34, W: 25, D: 26 },
    };
    const dims = sizeByDifficulty[fixture.difficulty] ?? sizeByDifficulty.intermediate;

    const raByCoverage: Record<string, number> = {
      tutorial: 3.2,
      regression: 1.6,
      calibration: 0.8,
      adversarial: 0.4,
    };

    return {
      name: fixture.label,
      type: fixture.tags.includes("through_cut") || fixture.tags.includes("through_hole")
        ? "hole"
        : "cavity",
      is_through: fixture.tags.includes("through_cut") || fixture.tags.includes("through_hole"),
      dimensions_mm: { length: dims.L, width: dims.W, depth: dims.D },
      tolerance_mm: fixture.coverage === "calibration" ? 0.005 : 0.01,
      surface_finish_ra_um: raByCoverage[fixture.coverage] ?? 1.6,
      min_corner_radius_mm: 0.25,
    };
  }

  /** Aggregate per-fixture results into a summary. */
  private summarize(results: RegressionResult[]): RegressionSummary {
    const summary: RegressionSummary = {
      total: results.length,
      pass: 0,
      fail: 0,
      skip: 0,
      warning: 0,
      pass_rate: 0,
      average_duration_ms: 0,
      by_process: {
        wire_edm: { total: 0, pass: 0, fail: 0 },
        sinker_edm: { total: 0, pass: 0, fail: 0 },
        lathe: { total: 0, pass: 0, fail: 0 },
        mill: { total: 0, pass: 0, fail: 0 },
        grinder: { total: 0, pass: 0, fail: 0 },
        welder: { total: 0, pass: 0, fail: 0 },
        laser: { total: 0, pass: 0, fail: 0 },
        waterjet: { total: 0, pass: 0, fail: 0 },
      },
      failed_ids: [],
    };

    let totalDuration = 0;
    for (const r of results) {
      totalDuration += r.duration_ms;
      if (r.verdict === "pass") summary.pass++;
      else if (r.verdict === "warning") summary.warning++;
      else if (r.verdict === "fail") summary.fail++;
      else summary.skip++;

      // Unknown/injected processes (e.g. bad-process test fixtures) may not
      // have a seeded bucket — synthesize one so we don't throw on them.
      const bucket =
        summary.by_process[r.process] ??
        (summary.by_process[r.process] = { total: 0, pass: 0, fail: 0 });
      bucket.total++;
      if (r.verdict === "pass" || r.verdict === "warning") {
        bucket.pass++;
      }
      if (r.verdict === "fail") {
        bucket.fail++;
        summary.failed_ids.push(r.fixture_id);
      }
    }

    const runnable = summary.total - summary.skip;
    summary.pass_rate = runnable > 0
      ? Math.round(((summary.pass + summary.warning) / runnable) * 10000) / 100
      : 0;
    summary.average_duration_ms = results.length > 0
      ? Math.round((totalDuration / results.length) * 100) / 100
      : 0;

    return summary;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

export const printToProgramRegressionHarnessEngine = new PrintToProgramRegressionHarnessEngine();
