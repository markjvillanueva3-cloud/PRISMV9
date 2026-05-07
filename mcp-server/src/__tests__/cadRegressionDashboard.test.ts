/**
 * cadRegressionDashboard.test.ts — U-CINF08 unit tests
 *
 * Covers:
 *   1. isTerminal classifies lifecycle status correctly
 *   2. pctComplete clamps to [0,100] and handles 0-total edge
 *   3. tallyCounts aggregates every TestStatus bucket
 *   4. aggregateErrors bins failures by ErrorType
 *   5. aggregateErrors buckets missing errorType as unclassified
 *   6. lifecycle returns "empty" for zero files
 *   7. lifecycle returns "running" when any file is non-terminal
 *   8. lifecycle returns "completed" when every file is terminal
 *   9. throughputEstimate computes avg duration & ETA for remaining
 *  10. throughputEstimate windowed count respects completedAt timestamps
 *  11. throughputEstimate returns null metrics when zero terminal entries
 *  12. recentFailures returns at most `limit`, sorted by completedAt desc
 *  13. recentFailures places missing-timestamp failures last
 *  14. snapshot() loads batch, composes full DashboardSnapshot
 *  15. snapshot() throws when batch file is missing
 *  16. listBatches() returns [] when state dir missing
 *  17. listBatches() skips corrupt JSON files
 *  18. listBatches() sorts by lastCheckpoint desc
 *  19. execute() routes op=snapshot via BaseEngine envelope
 *  20. execute() returns error envelope on unknown op
 */

import { describe, it, expect } from "vitest";
import { join as pathJoin } from "path";
import {
  CADRegressionDashboardEngine,
  cadRegressionDashboardEngine,
  DEFAULT_RECENT_FAILURES,
  DEFAULT_THROUGHPUT_WINDOW_MIN,
  aggregateErrors,
  isTerminal,
  lifecycle,
  pctComplete,
  recentFailures,
  tallyCounts,
  throughputEstimate,
  type DashboardFS,
} from "../engines/CADRegressionDashboardEngine.js";
import type {
  TestBatch,
  TestFileEntry,
} from "../schemas/cadRegressionTestSchema.js";

// ── Fixture helpers ─────────────────────────────────────────────────────────

const UUID_A = "11111111-1111-4111-8111-111111111111";
const UUID_B = "22222222-2222-4222-8222-222222222222";

function entry(
  overrides: Partial<TestFileEntry> & { fileId: string },
): TestFileEntry {
  return {
    fileId: overrides.fileId,
    status: overrides.status ?? "pending",
    errorType: overrides.errorType ?? "none",
    durationMs: overrides.durationMs ?? 0,
    retries: overrides.retries ?? 0,
    artifacts: overrides.artifacts ?? {},
    startedAt: overrides.startedAt,
    completedAt: overrides.completedAt,
  };
}

function batch(
  overrides: Partial<Omit<TestBatch, "files">> & {
    files: Record<string, TestFileEntry>;
    batchId?: string;
  },
): TestBatch {
  const files = overrides.files;
  const counts = tallyCounts({
    batchId: UUID_A,
    schemaVersion: 1,
    stats: { total: 0, completed: 0, passed: 0, failed: 0, skipped: 0, errored: 0 },
    lastCheckpoint: "2026-04-19T18:00:00.000Z",
    createdAt: "2026-04-19T17:00:00.000Z",
    updatedAt: "2026-04-19T18:00:00.000Z",
    files,
  });
  return {
    batchId: overrides.batchId ?? UUID_A,
    schemaVersion: 1,
    stats: {
      total: counts.total,
      completed: counts.completed,
      passed: counts.passed,
      failed: counts.failed,
      skipped: counts.skipped,
      errored: counts.errored,
    },
    lastCheckpoint: overrides.lastCheckpoint ?? "2026-04-19T18:00:00.000Z",
    createdAt: overrides.createdAt ?? "2026-04-19T17:00:00.000Z",
    updatedAt: overrides.updatedAt ?? "2026-04-19T18:00:00.000Z",
    files,
  };
}

/**
 * Minimal in-memory FS backed by a plain object map (path → file contents).
 * Keys must be absolute paths composed with `path.join` so separators match
 * what the engine will produce on the host platform.
 */
/** Normalize separators + strip leading slashes so "/state", "\state", "state" compare equal. */
function norm(p: string): string {
  return p.replace(/\\/g, "/").replace(/^\/+/, "").replace(/\/+$/, "");
}

function memFS(files: Record<string, string>): DashboardFS {
  const normalized: Record<string, string> = {};
  for (const [k, v] of Object.entries(files)) normalized[norm(k)] = v;
  return {
    existsSync: (p: string) => {
      const np = norm(p);
      if (np in normalized) return true;
      const prefix = np ? `${np}/` : "";
      return Object.keys(normalized).some((k) => k.startsWith(prefix));
    },
    readFileSync: (p: string, _enc: "utf-8") => {
      const v = normalized[norm(p)];
      if (v === undefined) throw new Error(`no such file: ${p}`);
      return v;
    },
    readdirSync: (p: string) => {
      const np = norm(p);
      const prefix = np ? `${np}/` : "";
      const names = new Set<string>();
      for (const key of Object.keys(normalized)) {
        if (key.startsWith(prefix)) {
          const rest = key.slice(prefix.length);
          const first = rest.split("/")[0];
          if (first) names.add(first);
        }
      }
      return [...names];
    },
  };
}

/** Cross-platform helper: build the state-dir key the engine would read. */
function stateFilePath(stateDir: string, batchId: string): string {
  return pathJoin(stateDir, `${batchId}.json`);
}

// ── Pure helpers ─────────────────────────────────────────────────────────────

describe("isTerminal()", () => {
  it("returns true for pass/fail/skip/error, false for pending/running", () => {
    expect(isTerminal("pass")).toBe(true);
    expect(isTerminal("fail")).toBe(true);
    expect(isTerminal("skip")).toBe(true);
    expect(isTerminal("error")).toBe(true);
    expect(isTerminal("pending")).toBe(false);
    expect(isTerminal("running")).toBe(false);
  });
});

describe("pctComplete()", () => {
  it("returns 0 when total is 0", () => {
    expect(pctComplete(0, 0)).toBe(0);
  });
  it("returns rounded percent", () => {
    expect(pctComplete(100, 50)).toBe(50);
    expect(pctComplete(3, 1)).toBe(33);
    expect(pctComplete(3, 2)).toBe(67);
  });
  it("clamps above 100 to 100", () => {
    expect(pctComplete(10, 15)).toBe(100);
  });
});

describe("tallyCounts()", () => {
  it("aggregates every TestStatus bucket", () => {
    const b = batch({
      files: {
        a: entry({ fileId: "a", status: "pass" }),
        b: entry({ fileId: "b", status: "fail", errorType: "comparison" }),
        c: entry({ fileId: "c", status: "skip" }),
        d: entry({ fileId: "d", status: "error", errorType: "crash" }),
        e: entry({ fileId: "e", status: "pending" }),
        f: entry({ fileId: "f", status: "running" }),
      },
    });
    const c = tallyCounts(b);
    expect(c.total).toBe(6);
    expect(c.passed).toBe(1);
    expect(c.failed).toBe(1);
    expect(c.skipped).toBe(1);
    expect(c.errored).toBe(1);
    expect(c.pending).toBe(1);
    expect(c.running).toBe(1);
    expect(c.completed).toBe(4); // pass+fail+skip+error
  });
});

describe("aggregateErrors()", () => {
  it("bins failures and errors by ErrorType", () => {
    const b = batch({
      files: {
        a: entry({ fileId: "a", status: "fail", errorType: "comparison" }),
        b: entry({ fileId: "b", status: "fail", errorType: "parse" }),
        c: entry({ fileId: "c", status: "error", errorType: "crash" }),
        d: entry({ fileId: "d", status: "error", errorType: "timeout" }),
        e: entry({ fileId: "e", status: "fail", errorType: "format" }),
        f: entry({ fileId: "f", status: "error", errorType: "generation" }),
        g: entry({ fileId: "g", status: "pass" }), // ignored
      },
    });
    const br = aggregateErrors(b);
    expect(br.comparison).toBe(1);
    expect(br.parse).toBe(1);
    expect(br.crash).toBe(1);
    expect(br.timeout).toBe(1);
    expect(br.format).toBe(1);
    expect(br.generation).toBe(1);
    expect(br.unclassified).toBe(0);
  });

  it("counts fail/error with errorType='none' as unclassified", () => {
    const b = batch({
      files: {
        a: entry({ fileId: "a", status: "fail", errorType: "none" }),
        b: entry({ fileId: "b", status: "error", errorType: "none" }),
      },
    });
    expect(aggregateErrors(b).unclassified).toBe(2);
  });
});

describe("lifecycle()", () => {
  it("returns 'empty' for zero files", () => {
    expect(lifecycle(batch({ files: {} }))).toBe("empty");
  });
  it("returns 'running' when any file is non-terminal", () => {
    const b = batch({
      files: {
        a: entry({ fileId: "a", status: "pass" }),
        b: entry({ fileId: "b", status: "pending" }),
      },
    });
    expect(lifecycle(b)).toBe("running");
  });
  it("returns 'completed' when every file is terminal", () => {
    const b = batch({
      files: {
        a: entry({ fileId: "a", status: "pass" }),
        b: entry({ fileId: "b", status: "skip" }),
        c: entry({ fileId: "c", status: "fail", errorType: "parse" }),
      },
    });
    expect(lifecycle(b)).toBe("completed");
  });
});

describe("throughputEstimate()", () => {
  const now = new Date("2026-04-19T18:00:00.000Z");

  it("computes avgDuration and ETA from terminal entries", () => {
    const b = batch({
      files: {
        a: entry({
          fileId: "a",
          status: "pass",
          durationMs: 1000,
          completedAt: "2026-04-19T17:59:00.000Z",
        }),
        b: entry({
          fileId: "b",
          status: "pass",
          durationMs: 3000,
          completedAt: "2026-04-19T17:58:30.000Z",
        }),
        c: entry({ fileId: "c", status: "pending" }),
        d: entry({ fileId: "d", status: "pending" }),
      },
    });
    const est = throughputEstimate(b, now, 5);
    expect(est.avgTerminalDurationMs).toBe(2000); // (1000+3000)/2
    expect(est.etaMs).toBe(4000); // 2000ms avg × 2 remaining
    expect(est.windowedCompletedCount).toBe(2);
    expect(est.filesPerMinute).toBeCloseTo(2 / 5, 5);
  });

  it("counts only entries whose completedAt is within the rolling window", () => {
    const b = batch({
      files: {
        old: entry({
          fileId: "old",
          status: "pass",
          durationMs: 100,
          completedAt: "2026-04-19T17:00:00.000Z", // 60 min ago — outside 5 min window
        }),
        mid: entry({
          fileId: "mid",
          status: "pass",
          durationMs: 100,
          completedAt: "2026-04-19T17:56:00.000Z", // 4 min ago — inside
        }),
        nw: entry({
          fileId: "nw",
          status: "pass",
          durationMs: 100,
          completedAt: "2026-04-19T17:59:00.000Z", // 1 min ago — inside
        }),
      },
    });
    const est = throughputEstimate(b, now, 5);
    expect(est.windowedCompletedCount).toBe(2);
    expect(est.filesPerMinute).toBeCloseTo(2 / 5, 5);
  });

  it("returns null metrics when zero terminal entries", () => {
    const b = batch({
      files: {
        a: entry({ fileId: "a", status: "pending" }),
        b: entry({ fileId: "b", status: "running" }),
      },
    });
    const est = throughputEstimate(b, now, 5);
    expect(est.avgTerminalDurationMs).toBeNull();
    expect(est.etaMs).toBeNull();
    expect(est.filesPerMinute).toBeNull();
  });
});

describe("recentFailures()", () => {
  it("returns at most `limit`, sorted by completedAt desc", () => {
    const b = batch({
      files: {
        a: entry({
          fileId: "a",
          status: "fail",
          errorType: "comparison",
          completedAt: "2026-04-19T17:55:00.000Z",
        }),
        b: entry({
          fileId: "b",
          status: "fail",
          errorType: "parse",
          completedAt: "2026-04-19T17:59:00.000Z",
        }),
        c: entry({
          fileId: "c",
          status: "error",
          errorType: "crash",
          completedAt: "2026-04-19T17:57:00.000Z",
        }),
        d: entry({ fileId: "d", status: "pass" }),
      },
    });
    const rf = recentFailures(b, 2);
    expect(rf).toHaveLength(2);
    expect(rf[0]?.fileId).toBe("b"); // newest
    expect(rf[1]?.fileId).toBe("c");
  });

  it("places missing-completedAt failures last", () => {
    const b = batch({
      files: {
        a: entry({
          fileId: "a",
          status: "fail",
          errorType: "parse",
          completedAt: "2026-04-19T17:59:00.000Z",
        }),
        b: entry({ fileId: "b", status: "fail", errorType: "crash" }),
      },
    });
    const rf = recentFailures(b);
    expect(rf[0]?.fileId).toBe("a");
    expect(rf[1]?.fileId).toBe("b");
    expect(rf[1]?.completedAt).toBeNull();
  });

  it("honours DEFAULT_RECENT_FAILURES when limit omitted", () => {
    const files: Record<string, TestFileEntry> = {};
    for (let i = 0; i < 20; i++) {
      files[`f${i}`] = entry({
        fileId: `f${i}`,
        status: "fail",
        errorType: "crash",
        completedAt: new Date(1_700_000_000_000 + i * 1000).toISOString(),
      });
    }
    const rf = recentFailures(batch({ files }));
    expect(rf).toHaveLength(DEFAULT_RECENT_FAILURES);
  });
});

// ── Engine surface ───────────────────────────────────────────────────────────

describe("snapshot()", () => {
  it("loads a batch from disk and composes a full snapshot", async () => {
    const b = batch({
      batchId: UUID_A,
      files: {
        a: entry({
          fileId: "a",
          status: "pass",
          durationMs: 1000,
          completedAt: "2026-04-19T17:59:30.000Z",
        }),
        b: entry({
          fileId: "b",
          status: "fail",
          errorType: "comparison",
          durationMs: 1200,
          completedAt: "2026-04-19T17:59:45.000Z",
        }),
        c: entry({ fileId: "c", status: "pending" }),
      },
    });
    const fs = memFS({
      [stateFilePath("/state", UUID_A)]: JSON.stringify(b),
    });
    const e = new CADRegressionDashboardEngine();
    const snap = await e.snapshot(
      UUID_A,
      "/state",
      DEFAULT_THROUGHPUT_WINDOW_MIN,
      DEFAULT_RECENT_FAILURES,
      new Date("2026-04-19T18:00:00.000Z"),
      fs,
    );
    expect(snap.batchId).toBe(UUID_A);
    expect(snap.counts.total).toBe(3);
    expect(snap.counts.passed).toBe(1);
    expect(snap.counts.failed).toBe(1);
    expect(snap.counts.pending).toBe(1);
    expect(snap.lifecycle).toBe("running");
    expect(snap.pctComplete).toBe(67);
    expect(snap.errorBreakdown.comparison).toBe(1);
    expect(snap.recentFailures).toHaveLength(1);
    expect(snap.recentFailures[0]?.fileId).toBe("b");
    expect(snap.throughput.avgTerminalDurationMs).toBe(1100); // (1000+1200)/2
  });

  it("throws when the batch file is missing", async () => {
    const fs = memFS({});
    const e = new CADRegressionDashboardEngine();
    await expect(e.snapshot(UUID_A, "/state", 5, 10, new Date(), fs)).rejects.toThrow(
      /batch not found/,
    );
  });
});

describe("listBatches()", () => {
  it("returns [] when state dir is missing", async () => {
    const fs: DashboardFS = {
      existsSync: () => false,
      readFileSync: () => "",
      readdirSync: () => [],
    };
    const e = new CADRegressionDashboardEngine();
    expect(await e.listBatches("/nope", fs)).toEqual([]);
  });

  it("skips corrupt JSON files and returns valid ones sorted by lastCheckpoint desc", async () => {
    const older = batch({
      batchId: UUID_A,
      lastCheckpoint: "2026-04-19T17:00:00.000Z",
      files: { a: entry({ fileId: "a", status: "pass" }) },
    });
    const newer = batch({
      batchId: UUID_B,
      lastCheckpoint: "2026-04-19T18:00:00.000Z",
      files: { a: entry({ fileId: "a", status: "pending" }) },
    });
    const fs = memFS({
      [stateFilePath("/state", UUID_A)]: JSON.stringify(older),
      [stateFilePath("/state", UUID_B)]: JSON.stringify(newer),
      [pathJoin("/state", "bogus.json")]: "{not json",
    });
    const e = new CADRegressionDashboardEngine();
    const list = await e.listBatches("/state", fs);
    expect(list).toHaveLength(2);
    expect(list[0]?.batchId).toBe(UUID_B); // newer first
    expect(list[1]?.batchId).toBe(UUID_A);
    expect(list[0]?.lifecycle).toBe("running");
    expect(list[1]?.lifecycle).toBe("completed");
  });
});

describe("execute() routing", () => {
  it("routes op=snapshot via the BaseEngine envelope", async () => {
    const b = batch({
      batchId: UUID_A,
      files: { a: entry({ fileId: "a", status: "pass" }) },
    });
    const fs = memFS({ [stateFilePath("/state", UUID_A)]: JSON.stringify(b) });
    const result = await cadRegressionDashboardEngine.execute({
      op: "snapshot",
      batchId: UUID_A,
      stateDir: "/state",
      fs,
      now: "2026-04-19T18:00:00.000Z",
    });
    expect(result.success).toBe(true);
    const data = result.data as { pctComplete: number; lifecycle: string };
    expect(data.pctComplete).toBe(100);
    expect(data.lifecycle).toBe("completed");
  });

  it("returns error envelope on unknown op", async () => {
    const result = await cadRegressionDashboardEngine.execute({ op: "delete" });
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/snapshot\|list/);
  });
});
