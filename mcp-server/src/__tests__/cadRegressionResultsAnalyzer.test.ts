/**
 * cadRegressionResultsAnalyzer.test.ts — U-CINF10 unit tests
 *
 * Covers:
 *   1. classifyTransition maps all 7 transition classes
 *   2. diffBatches catches pass→fail as regression
 *   3. diffBatches catches fail→pass as recovery
 *   4. diffBatches classifies new/removed files correctly
 *   5. diffBatches totals sum to the union of fileIds
 *   6. diffBatches sorts each bucket by fileId
 *   7. passRate handles zero-total batch (returns 0)
 *   8. passRate excludes skip/pending from denominator
 *   9. trendSeries orders by lastCheckpoint ascending
 *  10. trendSeries deltaPassRate = last - first
 *  11. trendSeries deltaPassRate = null for single-point series
 *  12. hotspotFiles respects minAppearances filter
 *  13. hotspotFiles respects threshold filter
 *  14. hotspotFiles tracks most-recent lastFailedAt
 *  15. hotspotFiles sorts by failureRate desc then failures desc
 *  16. execute() routes op=diff via memFS
 *  17. execute() rejects op=diff without both batchIds
 *  18. execute() routes op=trend via memFS
 *  19. execute() routes op=hotspots with explicit threshold
 *  20. execute() returns error envelope on unknown op
 */

import { describe, it, expect } from "vitest";
import { join as pathJoin } from "path";
import {
  CADRegressionResultsAnalyzerEngine,
  cadRegressionResultsAnalyzerEngine,
  DEFAULT_HOTSPOT_THRESHOLD,
  DEFAULT_HOTSPOT_MIN_APPEARANCES,
  classifyTransition,
  diffBatches,
  passRate,
  trendSeries,
  hotspotFiles,
  type AnalyzerFS,
} from "../engines/CADRegressionResultsAnalyzerEngine.js";
import type {
  TestBatch,
  TestFileEntry,
  TestStatus,
} from "../schemas/cadRegressionTestSchema.js";

// ── Fixture builders ─────────────────────────────────────────────────────────

const UUID = (n: number): string => {
  const hex = n.toString(16).padStart(12, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-4000-8000-${hex.padStart(12, "0").slice(0, 12)}`;
};

function entry(o: {
  fileId: string;
  status: TestStatus;
  durationMs?: number;
  retries?: number;
  completedAt?: string;
  errorType?: TestFileEntry["errorType"];
}): TestFileEntry {
  return {
    fileId: o.fileId,
    status: o.status,
    errorType: o.errorType ?? "none",
    durationMs: o.durationMs ?? 0,
    retries: o.retries ?? 0,
    artifacts: {},
    completedAt: o.completedAt,
  };
}

function batch(o: {
  batchId: string;
  lastCheckpoint: string;
  files: Record<string, TestFileEntry>;
  createdAt?: string;
  updatedAt?: string;
}): TestBatch {
  const total = Object.keys(o.files).length;
  let completed = 0;
  let passed = 0;
  let failed = 0;
  let errored = 0;
  let skipped = 0;
  let pending = 0;
  let running = 0;
  for (const f of Object.values(o.files)) {
    switch (f.status) {
      case "pass":
        passed += 1;
        completed += 1;
        break;
      case "fail":
        failed += 1;
        completed += 1;
        break;
      case "error":
        errored += 1;
        completed += 1;
        break;
      case "skip":
        skipped += 1;
        completed += 1;
        break;
      case "pending":
        pending += 1;
        break;
      case "running":
        running += 1;
        break;
    }
  }
  return {
    batchId: o.batchId,
    schemaVersion: 1,
    createdAt: o.createdAt ?? "2026-04-19T17:00:00.000Z",
    updatedAt: o.updatedAt ?? o.lastCheckpoint,
    lastCheckpoint: o.lastCheckpoint,
    stats: {
      total,
      completed,
      pending,
      running,
      passed,
      failed,
      errored,
      skipped,
    },
    files: o.files,
  };
}

// ── FS harness ───────────────────────────────────────────────────────────────

function memFS(stored: Record<string, TestBatch>, stateDir: string): AnalyzerFS {
  const files: Record<string, string> = {};
  for (const [id, b] of Object.entries(stored)) {
    files[pathJoin(stateDir, `${id}.json`)] = JSON.stringify(b);
  }
  return {
    existsSync: (p) => p in files,
    readFileSync: (p, _enc) => {
      const v = files[p];
      if (v === undefined) throw new Error(`no such file: ${p}`);
      return v;
    },
  };
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe("classifyTransition()", () => {
  it("maps all transition classes correctly", () => {
    expect(classifyTransition("pass", "fail")).toBe("regression");
    expect(classifyTransition("pass", "error")).toBe("regression");
    expect(classifyTransition("fail", "pass")).toBe("recovery");
    expect(classifyTransition("error", "pass")).toBe("recovery");
    expect(classifyTransition("pass", "pass")).toBe("stable_pass");
    expect(classifyTransition("fail", "fail")).toBe("stable_fail");
    expect(classifyTransition("error", "error")).toBe("stable_fail");
    expect(classifyTransition(null, "pass")).toBe("new");
    expect(classifyTransition("pass", null)).toBe("removed");
    expect(classifyTransition("skip", "pass")).toBe("other");
    expect(classifyTransition("pass", "pending")).toBe("other");
  });
});

describe("passRate()", () => {
  it("returns 0 when no terminal entries", () => {
    const b = batch({
      batchId: UUID(1),
      lastCheckpoint: "2026-04-19T17:00:00.000Z",
      files: { a: entry({ fileId: "a", status: "pending" }) },
    });
    const r = passRate(b);
    expect(r.rate).toBe(0);
    expect(r.total).toBe(0);
  });

  it("excludes skip/pending from denominator", () => {
    const b = batch({
      batchId: UUID(1),
      lastCheckpoint: "2026-04-19T17:00:00.000Z",
      files: {
        a: entry({ fileId: "a", status: "pass" }),
        b: entry({ fileId: "b", status: "fail" }),
        c: entry({ fileId: "c", status: "skip" }),
        d: entry({ fileId: "d", status: "pending" }),
      },
    });
    const r = passRate(b);
    expect(r.total).toBe(2);
    expect(r.passed).toBe(1);
    expect(r.failed).toBe(1);
    expect(r.rate).toBeCloseTo(0.5, 5);
  });
});

// ── diffBatches ──────────────────────────────────────────────────────────────

describe("diffBatches()", () => {
  const base = batch({
    batchId: UUID(1),
    lastCheckpoint: "2026-04-19T17:00:00.000Z",
    files: {
      a: entry({ fileId: "a", status: "pass" }),
      b: entry({ fileId: "b", status: "pass" }),
      c: entry({ fileId: "c", status: "fail" }),
      d: entry({ fileId: "d", status: "fail" }),
      e: entry({ fileId: "e", status: "pass" }),
    },
  });
  const cand = batch({
    batchId: UUID(2),
    lastCheckpoint: "2026-04-19T18:00:00.000Z",
    files: {
      a: entry({ fileId: "a", status: "fail" }),
      b: entry({ fileId: "b", status: "pass" }),
      c: entry({ fileId: "c", status: "fail" }),
      d: entry({ fileId: "d", status: "pass" }),
      f: entry({ fileId: "f", status: "pass" }),
    },
  });

  it("classifies pass→fail as regression", () => {
    const d = diffBatches(base, cand);
    expect(d.totals.regression).toBe(1);
    expect(d.regressions[0]?.fileId).toBe("a");
  });

  it("classifies fail→pass as recovery", () => {
    const d = diffBatches(base, cand);
    expect(d.totals.recovery).toBe(1);
    expect(d.recoveries[0]?.fileId).toBe("d");
  });

  it("classifies stable_pass / stable_fail", () => {
    const d = diffBatches(base, cand);
    expect(d.stablePass.map((t) => t.fileId)).toEqual(["b"]);
    expect(d.stableFail.map((t) => t.fileId)).toEqual(["c"]);
  });

  it("classifies new / removed", () => {
    const d = diffBatches(base, cand);
    expect(d.newFiles.map((t) => t.fileId)).toEqual(["f"]);
    expect(d.removedFiles.map((t) => t.fileId)).toEqual(["e"]);
  });

  it("totals sum to the union of fileIds", () => {
    const d = diffBatches(base, cand);
    const sum =
      d.totals.regression +
      d.totals.recovery +
      d.totals.stablePass +
      d.totals.stableFail +
      d.totals.new +
      d.totals.removed +
      d.totals.other;
    expect(sum).toBe(6); // a b c d e f
  });
});

// ── trendSeries ──────────────────────────────────────────────────────────────

describe("trendSeries()", () => {
  it("orders by lastCheckpoint ascending and computes deltaPassRate", () => {
    const b1 = batch({
      batchId: UUID(1),
      lastCheckpoint: "2026-04-19T17:00:00.000Z",
      files: {
        a: entry({ fileId: "a", status: "pass" }),
        b: entry({ fileId: "b", status: "fail" }),
      },
    });
    const b2 = batch({
      batchId: UUID(2),
      lastCheckpoint: "2026-04-19T18:00:00.000Z",
      files: {
        a: entry({ fileId: "a", status: "pass" }),
        b: entry({ fileId: "b", status: "pass" }),
      },
    });
    const r = trendSeries([b2, b1]); // intentionally reversed input
    expect(r.series[0].batchId).toBe(b1.batchId);
    expect(r.series[1].batchId).toBe(b2.batchId);
    expect(r.series[0].passRate).toBeCloseTo(0.5, 5);
    expect(r.series[1].passRate).toBeCloseTo(1.0, 5);
    expect(r.deltaPassRate).toBeCloseTo(0.5, 5);
  });

  it("returns deltaPassRate=null for single-point series", () => {
    const b1 = batch({
      batchId: UUID(1),
      lastCheckpoint: "2026-04-19T17:00:00.000Z",
      files: { a: entry({ fileId: "a", status: "pass" }) },
    });
    const r = trendSeries([b1]);
    expect(r.deltaPassRate).toBeNull();
  });
});

// ── hotspotFiles ─────────────────────────────────────────────────────────────

describe("hotspotFiles()", () => {
  function mkSeq(statuses: TestStatus[], id: string): TestBatch[] {
    return statuses.map((s, i) =>
      batch({
        batchId: UUID(100 + i),
        lastCheckpoint: `2026-04-19T17:0${i}:00.000Z`,
        files: {
          [id]: entry({
            fileId: id,
            status: s,
            completedAt: `2026-04-19T17:0${i}:30.000Z`,
          }),
        },
      }),
    );
  }

  it("excludes files below minAppearances", () => {
    const batches = mkSeq(["fail", "fail"], "flaky"); // only 2 appearances
    const r = hotspotFiles(batches, 0.5, 3);
    expect(r.hotspots).toHaveLength(0);
    expect(r.analyzedBatches).toBe(2);
  });

  it("includes only files above threshold", () => {
    const batches = mkSeq(["pass", "pass", "pass", "fail"], "ok"); // 25%
    const r = hotspotFiles(batches, 0.5, 3);
    expect(r.hotspots).toHaveLength(0);
  });

  it("flags a true hotspot with lastFailedAt", () => {
    const batches = mkSeq(["fail", "fail", "fail", "pass"], "bad");
    const r = hotspotFiles(batches, 0.5, 3);
    expect(r.hotspots).toHaveLength(1);
    const h = r.hotspots[0];
    expect(h.fileId).toBe("bad");
    expect(h.appearances).toBe(4);
    expect(h.failures).toBe(3);
    expect(h.failureRate).toBeCloseTo(0.75, 5);
    expect(h.lastFailedAt).toBe("2026-04-19T17:02:30.000Z");
  });

  it("sorts hotspots by failureRate desc then failures desc", () => {
    // high-rate file: 3/3 fail; lower-rate file: 2/4 fail
    const b1 = batch({
      batchId: UUID(1),
      lastCheckpoint: "2026-04-19T17:00:00.000Z",
      files: {
        highRate: entry({ fileId: "highRate", status: "fail" }),
        lowRate: entry({ fileId: "lowRate", status: "fail" }),
      },
    });
    const b2 = batch({
      batchId: UUID(2),
      lastCheckpoint: "2026-04-19T17:01:00.000Z",
      files: {
        highRate: entry({ fileId: "highRate", status: "fail" }),
        lowRate: entry({ fileId: "lowRate", status: "fail" }),
      },
    });
    const b3 = batch({
      batchId: UUID(3),
      lastCheckpoint: "2026-04-19T17:02:00.000Z",
      files: {
        highRate: entry({ fileId: "highRate", status: "fail" }),
        lowRate: entry({ fileId: "lowRate", status: "pass" }),
      },
    });
    const b4 = batch({
      batchId: UUID(4),
      lastCheckpoint: "2026-04-19T17:03:00.000Z",
      files: {
        lowRate: entry({ fileId: "lowRate", status: "pass" }),
      },
    });
    const r = hotspotFiles([b1, b2, b3, b4], 0.5, 3);
    // highRate: 3/3 (1.0), lowRate: 2/4 (0.5) — both above threshold
    expect(r.hotspots.map((h) => h.fileId)).toEqual(["highRate", "lowRate"]);
  });
});

// ── execute() routing ────────────────────────────────────────────────────────

const STATE_DIR = "/state-analyzer";

describe("execute() routing", () => {
  it("routes op=diff and returns DiffReport", async () => {
    const base = batch({
      batchId: UUID(1),
      lastCheckpoint: "2026-04-19T17:00:00.000Z",
      files: { a: entry({ fileId: "a", status: "pass" }) },
    });
    const cand = batch({
      batchId: UUID(2),
      lastCheckpoint: "2026-04-19T18:00:00.000Z",
      files: { a: entry({ fileId: "a", status: "fail" }) },
    });
    const fs = memFS({ [UUID(1)]: base, [UUID(2)]: cand }, STATE_DIR);
    const result = await cadRegressionResultsAnalyzerEngine.execute({
      op: "diff",
      baseBatchId: UUID(1),
      candidateBatchId: UUID(2),
      stateDir: STATE_DIR,
      fs,
    });
    expect(result.success).toBe(true);
    const report = result.data as { totals: { regression: number } };
    expect(report.totals.regression).toBe(1);
  });

  it("rejects op=diff without both batchIds", async () => {
    const e = new CADRegressionResultsAnalyzerEngine();
    const result = await e.execute({ op: "diff", baseBatchId: UUID(1) } as unknown);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/baseBatchId.*candidateBatchId|requires/);
  });

  it("routes op=trend", async () => {
    const b1 = batch({
      batchId: UUID(1),
      lastCheckpoint: "2026-04-19T17:00:00.000Z",
      files: { a: entry({ fileId: "a", status: "pass" }) },
    });
    const fs = memFS({ [UUID(1)]: b1 }, STATE_DIR);
    const result = await cadRegressionResultsAnalyzerEngine.execute({
      op: "trend",
      batchIds: [UUID(1)],
      stateDir: STATE_DIR,
      fs,
    });
    expect(result.success).toBe(true);
    const r = result.data as { series: unknown[] };
    expect(r.series).toHaveLength(1);
  });

  it("routes op=hotspots with explicit threshold", async () => {
    const batches: Record<string, TestBatch> = {};
    for (let i = 0; i < 4; i++) {
      const id = UUID(200 + i);
      batches[id] = batch({
        batchId: id,
        lastCheckpoint: `2026-04-19T17:0${i}:00.000Z`,
        files: {
          noisy: entry({
            fileId: "noisy",
            status: "fail",
            completedAt: `2026-04-19T17:0${i}:30.000Z`,
          }),
        },
      });
    }
    const fs = memFS(batches, STATE_DIR);
    const result = await cadRegressionResultsAnalyzerEngine.execute({
      op: "hotspots",
      batchIds: Object.keys(batches),
      threshold: 0.5,
      minAppearances: 3,
      stateDir: STATE_DIR,
      fs,
    });
    expect(result.success).toBe(true);
    const r = result.data as { hotspots: Array<{ fileId: string }>; threshold: number };
    expect(r.threshold).toBe(0.5);
    expect(r.hotspots[0]?.fileId).toBe("noisy");
  });

  it("returns error envelope on unknown op", async () => {
    const e = new CADRegressionResultsAnalyzerEngine();
    const result = await e.execute({ op: "garbage" } as unknown);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/diff \| trend \| hotspots|op must be/);
  });

  it("exposes DEFAULT_HOTSPOT_THRESHOLD = 0.5 and DEFAULT_HOTSPOT_MIN_APPEARANCES = 3", () => {
    expect(DEFAULT_HOTSPOT_THRESHOLD).toBe(0.5);
    expect(DEFAULT_HOTSPOT_MIN_APPEARANCES).toBe(3);
  });
});
