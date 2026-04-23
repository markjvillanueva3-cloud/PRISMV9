/**
 * cadRegressionReportGenerator.test.ts — U-CINF11 unit tests
 *
 * Covers:
 *   1. renderSnapshot emits heading with short batch ID
 *   2. renderSnapshot includes counts and error-breakdown tables
 *   3. renderSnapshot formats sub-second durations as "ms"
 *   4. renderSnapshot handles zero recent failures gracefully
 *   5. renderSnapshot includes failure rows when present
 *   6. renderDiff summary table enumerates all buckets
 *   7. renderDiff skips empty sections
 *   8. renderDiff respects rowLimit and indicates truncation
 *   9. renderDiff shows regressions with base/candidate status
 *  10. renderTrend returns "No data" for empty series
 *  11. renderTrend renders deltaPassRate as percent with sign-friendly format
 *  12. renderTrend emits one row per series point
 *  13. renderHotspots notes "No hotspots" when list is empty
 *  14. renderHotspots renders threshold + minAppearances in header
 *  15. renderSummary concatenates only provided parts with --- separator
 *  16. renderSummary handles empty parts object
 *  17. execute routes op=renderSnapshot via BaseEngine envelope
 *  18. execute routes op=renderDiff
 *  19. execute rejects unknown op
 *  20. execute rejects missing required payload
 */

import { describe, it, expect } from "vitest";
import {
  CADRegressionReportGeneratorEngine,
  cadRegressionReportGeneratorEngine,
  renderSnapshot,
  renderDiff,
  renderTrend,
  renderHotspots,
  renderSummary,
} from "../engines/CADRegressionReportGeneratorEngine.js";
import type {
  DashboardSnapshot,
} from "../engines/CADRegressionDashboardEngine.js";
import type {
  DiffReport,
  TrendReport,
  HotspotReport,
} from "../engines/CADRegressionResultsAnalyzerEngine.js";

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

function snap(o: Partial<DashboardSnapshot> = {}): DashboardSnapshot {
  return {
    batchId: UUID_A,
    schemaVersion: 1,
    lifecycle: "running",
    pctComplete: 50,
    counts: {
      total: 10,
      completed: 5,
      pending: 3,
      running: 2,
      passed: 4,
      failed: 1,
      skipped: 0,
      errored: 0,
    },
    errorBreakdown: {
      format: 0,
      parse: 1,
      generation: 0,
      comparison: 0,
      timeout: 0,
      crash: 0,
      unclassified: 0,
    },
    throughput: {
      avgTerminalDurationMs: 450,
      windowedCompletedCount: 4,
      windowMinutes: 5,
      filesPerMinute: 0.8,
      etaMs: 12_000,
    },
    recentFailures: [],
    createdAt: "2026-04-19T17:00:00.000Z",
    lastCheckpoint: "2026-04-19T18:00:00.000Z",
    updatedAt: "2026-04-19T18:00:00.000Z",
    snapshotAt: "2026-04-19T18:00:05.000Z",
    ...o,
  };
}

// ── renderSnapshot ───────────────────────────────────────────────────────────

describe("renderSnapshot()", () => {
  it("emits heading with short batch ID", () => {
    const md = renderSnapshot(snap());
    expect(md).toContain("# CAD Regression — Batch `11111111`");
  });

  it("includes counts and error breakdown tables", () => {
    const md = renderSnapshot(snap());
    expect(md).toContain("## Counts");
    expect(md).toMatch(/\| total \| 10 \|/);
    expect(md).toMatch(/\| passed \| 4 \|/);
    expect(md).toContain("## Error breakdown");
    expect(md).toMatch(/\| parse \| 1 \|/);
  });

  it("formats sub-second durations as ms", () => {
    const md = renderSnapshot(snap());
    expect(md).toContain("450 ms");
  });

  it("handles zero recent failures gracefully", () => {
    const md = renderSnapshot(snap({ recentFailures: [] }));
    expect(md).toContain("_No recent failures._");
  });

  it("includes failure rows when present", () => {
    const md = renderSnapshot(
      snap({
        recentFailures: [
          {
            fileId: "part.step",
            status: "fail",
            errorType: "parse",
            durationMs: 200,
            retries: 1,
            completedAt: "2026-04-19T18:00:00.000Z",
          },
        ],
      }),
    );
    expect(md).toContain("## Recent failures (1)");
    expect(md).toContain("`part.step`");
    expect(md).toMatch(/\| fail \| parse \| 1 \|/);
  });
});

// ── renderDiff ───────────────────────────────────────────────────────────────

function makeDiff(overrides: Partial<DiffReport> = {}): DiffReport {
  return {
    baseBatchId: UUID_A,
    candidateBatchId: UUID_B,
    regressions: [],
    recoveries: [],
    stablePass: [],
    stableFail: [],
    newFiles: [],
    removedFiles: [],
    other: [],
    totals: {
      regression: 0,
      recovery: 0,
      stablePass: 0,
      stableFail: 0,
      new: 0,
      removed: 0,
      other: 0,
    },
    ...overrides,
  };
}

describe("renderDiff()", () => {
  it("summary table enumerates all buckets", () => {
    const md = renderDiff(makeDiff());
    for (const k of ["regression", "recovery", "stablePass", "stableFail", "new", "removed", "other"]) {
      expect(md).toContain(`| ${k} |`);
    }
  });

  it("skips empty sections", () => {
    const md = renderDiff(makeDiff());
    expect(md).not.toContain("## Regressions");
    expect(md).not.toContain("## Recoveries");
  });

  it("respects rowLimit and indicates truncation", () => {
    const regs = Array.from({ length: 5 }, (_, i) => ({
      fileId: `f${i}`,
      baseStatus: "pass" as const,
      candidateStatus: "fail" as const,
      classification: "regression" as const,
    }));
    const md = renderDiff(
      makeDiff({ regressions: regs, totals: { ...makeDiff().totals, regression: 5 } }),
      3,
    );
    expect(md).toContain("## Regressions (pass → fail/error) (5)");
    expect(md).toContain("`f0`");
    expect(md).toContain("`f2`");
    expect(md).toContain("_…and 2 more_");
  });

  it("shows regressions with base/candidate status", () => {
    const md = renderDiff(
      makeDiff({
        regressions: [
          {
            fileId: "a.step",
            baseStatus: "pass",
            candidateStatus: "fail",
            classification: "regression",
          },
        ],
        totals: { ...makeDiff().totals, regression: 1 },
      }),
    );
    expect(md).toContain("| `a.step` | pass | fail |");
  });
});

// ── renderTrend ──────────────────────────────────────────────────────────────

describe("renderTrend()", () => {
  it("returns No data for empty series", () => {
    const md = renderTrend({ series: [], deltaPassRate: null });
    expect(md).toContain("_No data._");
  });

  it("emits one row per series point and a delta line", () => {
    const tr: TrendReport = {
      series: [
        {
          batchId: UUID_A,
          passRate: 0.5,
          passed: 1,
          failed: 1,
          total: 2,
          lastCheckpoint: "2026-04-19T17:00:00.000Z",
        },
        {
          batchId: UUID_B,
          passRate: 1.0,
          passed: 2,
          failed: 0,
          total: 2,
          lastCheckpoint: "2026-04-19T18:00:00.000Z",
        },
      ],
      deltaPassRate: 0.5,
    };
    const md = renderTrend(tr);
    expect(md).toContain("Delta pass rate: **50.0%**");
    expect(md).toContain("| `11111111` |");
    expect(md).toContain("| `22222222` |");
  });

  it("renders deltaPassRate=null as em dash", () => {
    const md = renderTrend({
      series: [
        {
          batchId: UUID_A,
          passRate: 0.5,
          passed: 1,
          failed: 1,
          total: 2,
          lastCheckpoint: "2026-04-19T17:00:00.000Z",
        },
      ],
      deltaPassRate: null,
    });
    expect(md).toContain("Delta pass rate: **—**");
  });
});

// ── renderHotspots ───────────────────────────────────────────────────────────

describe("renderHotspots()", () => {
  it("notes No hotspots when list is empty", () => {
    const rep: HotspotReport = {
      threshold: 0.5,
      minAppearances: 3,
      analyzedBatches: 5,
      hotspots: [],
    };
    const md = renderHotspots(rep);
    expect(md).toContain("_No hotspots detected._");
    expect(md).toContain("threshold **50.0%**");
    expect(md).toContain("minAppearances **3**");
  });

  it("emits a row per hotspot", () => {
    const rep: HotspotReport = {
      threshold: 0.5,
      minAppearances: 3,
      analyzedBatches: 4,
      hotspots: [
        {
          fileId: "noisy.step",
          appearances: 4,
          failures: 3,
          failureRate: 0.75,
          lastFailedAt: "2026-04-19T17:02:30.000Z",
        },
      ],
    };
    const md = renderHotspots(rep);
    expect(md).toContain("| `noisy.step` | 4 | 3 | 75.0% |");
  });
});

// ── renderSummary ────────────────────────────────────────────────────────────

describe("renderSummary()", () => {
  it("concatenates only provided parts with --- separator", () => {
    const md = renderSummary({
      snapshot: snap(),
      trend: { series: [], deltaPassRate: null },
    });
    expect(md).toContain("# CAD Regression — Batch");
    expect(md).toContain("# CAD Regression — Trend");
    expect(md).toContain("\n---\n");
  });

  it("handles empty parts object", () => {
    const md = renderSummary({});
    expect(md).toBe("");
  });
});

// ── execute() ────────────────────────────────────────────────────────────────

describe("execute() routing", () => {
  it("routes op=renderSnapshot", async () => {
    const result = await cadRegressionReportGeneratorEngine.execute({
      op: "renderSnapshot",
      snapshot: snap(),
    });
    expect(result.success).toBe(true);
    const data = result.data as { markdown: string };
    expect(data.markdown).toContain("# CAD Regression — Batch");
  });

  it("routes op=renderDiff", async () => {
    const result = await cadRegressionReportGeneratorEngine.execute({
      op: "renderDiff",
      diff: makeDiff(),
    });
    expect(result.success).toBe(true);
  });

  it("rejects unknown op", async () => {
    const e = new CADRegressionReportGeneratorEngine();
    const result = await e.execute({ op: "bogus" } as unknown);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/renderSnapshot.*renderSummary|op must be/);
  });

  it("rejects missing snapshot payload", async () => {
    const e = new CADRegressionReportGeneratorEngine();
    const result = await e.execute({ op: "renderSnapshot" } as unknown);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/requires/);
  });
});
