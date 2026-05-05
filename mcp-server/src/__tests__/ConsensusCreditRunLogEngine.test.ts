/**
 * ConsensusCreditRunLogEngine — INTEL-OLLAMA-OBSIDIAN-MS0/U-CREDIT-CRON.
 *
 * Verifies append-only run-log persistence: schema, history retrieval,
 * stats aggregation, cold-start, and adversarial inputs.
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import {
  ConsensusCreditRunLogEngine,
} from "../engines/ConsensusCreditRunLogEngine.js";

function tmpDir(): string {
  return fs.mkdtempSync(path.join(os.tmpdir(), "prism-credit-runlog-"));
}

interface RecordOverrides {
  ok?: boolean;
  processed?: number;
  skipped?: number;
  cursorAdvance?: number;
  cursorOffset?: number;
  perVendor?: Record<string, number>;
  trigger?: string;
  error?: string | null;
  durationMs?: number;
}

function makeRunInput(logPath: string, overrides: RecordOverrides = {}) {
  return {
    ok: overrides.ok ?? true,
    processed: overrides.processed ?? 5,
    skipped: overrides.skipped ?? 0,
    cursorAdvance: overrides.cursorAdvance ?? 1024,
    cursorOffset: overrides.cursorOffset ?? 4096,
    perVendor: overrides.perVendor ?? { anthropic: 5, openai: 5 },
    trigger: overrides.trigger ?? "cli",
    error: overrides.error ?? null,
    durationMs: overrides.durationMs ?? 250,
    logPath,
  };
}

describe("ConsensusCreditRunLogEngine", () => {
  let dir: string;
  let logPath: string;
  let engine: ConsensusCreditRunLogEngine;

  beforeEach(() => {
    dir = tmpDir();
    logPath = path.join(dir, "runs.jsonl");
    engine = new ConsensusCreditRunLogEngine();
  });

  afterEach(() => {
    try { fs.rmSync(dir, { recursive: true, force: true }); } catch { /* ignore */ }
  });

  // ---- recordRun ----

  it("recordRun appends a complete entry to the JSONL log", () => {
    const out = engine.recordRun(makeRunInput(logPath, { processed: 12, skipped: 1 }));
    expect(out.ok).toBe(true);
    expect(out.error).toBe(null);
    expect(fs.existsSync(logPath)).toBe(true);

    const raw = fs.readFileSync(logPath, "utf-8");
    const lines = raw.split("\n").filter((l) => l.length > 0);
    expect(lines).toHaveLength(1);
    const parsed = JSON.parse(lines[0]);
    expect(parsed.ok).toBe(true);
    expect(parsed.processed).toBe(12);
    expect(parsed.skipped).toBe(1);
    expect(parsed.schema_version).toBe("1.0.0");
    expect(typeof parsed.ts).toBe("string");
  });

  it("recordRun appends multiple entries without rewriting prior content", () => {
    engine.recordRun(makeRunInput(logPath, { processed: 1 }));
    engine.recordRun(makeRunInput(logPath, { processed: 2 }));
    engine.recordRun(makeRunInput(logPath, { processed: 3 }));
    const raw = fs.readFileSync(logPath, "utf-8");
    const lines = raw.split("\n").filter((l) => l.length > 0);
    expect(lines).toHaveLength(3);
    expect(JSON.parse(lines[0]).processed).toBe(1);
    expect(JSON.parse(lines[1]).processed).toBe(2);
    expect(JSON.parse(lines[2]).processed).toBe(3);
  });

  it("recordRun captures error message and ok=false on a failed run", () => {
    const out = engine.recordRun(makeRunInput(logPath, {
      ok: false,
      processed: 0,
      error: "ENOENT: feed file missing",
    }));
    expect(out.ok).toBe(true); // logging itself succeeded
    expect(out.entry.ok).toBe(false);
    expect(out.entry.error).toBe("ENOENT: feed file missing");
  });

  it("recordRun fails gracefully when log directory cannot be created", () => {
    // Write to an impossible path (a file, not a directory). On Windows, create
    // a file then try to nest underneath.
    const blocker = path.join(dir, "blocker.txt");
    fs.writeFileSync(blocker, "x");
    const out = engine.recordRun(makeRunInput(path.join(blocker, "subdir", "log.jsonl")));
    expect(out.ok).toBe(false);
    expect(out.error).not.toBe(null);
    expect(out.error?.length).toBeGreaterThan(0);
  });

  // ---- getHistory ----

  it("getHistory returns empty array on missing log file", () => {
    expect(engine.getHistory({ logPath })).toEqual([]);
  });

  it("getHistory returns entries in chronological order (append order)", () => {
    engine.recordRun(makeRunInput(logPath, { processed: 1, trigger: "first" }));
    engine.recordRun(makeRunInput(logPath, { processed: 2, trigger: "second" }));
    engine.recordRun(makeRunInput(logPath, { processed: 3, trigger: "third" }));
    const history = engine.getHistory({ logPath });
    expect(history.map((e) => e.processed)).toEqual([1, 2, 3]);
    expect(history.map((e) => e.trigger)).toEqual(["first", "second", "third"]);
  });

  it("getHistory respects limit by tailing", () => {
    for (let i = 1; i <= 10; i++) {
      engine.recordRun(makeRunInput(logPath, { processed: i }));
    }
    const history = engine.getHistory({ logPath, limit: 3 });
    expect(history).toHaveLength(3);
    expect(history.map((e) => e.processed)).toEqual([8, 9, 10]);
  });

  it("getHistory skips malformed JSON lines", () => {
    engine.recordRun(makeRunInput(logPath, { processed: 1 }));
    fs.appendFileSync(logPath, "{garbage no close\n");
    fs.appendFileSync(logPath, '{"missing_required_fields": true}\n');
    engine.recordRun(makeRunInput(logPath, { processed: 2 }));
    const history = engine.getHistory({ logPath });
    expect(history).toHaveLength(2);
    expect(history.map((e) => e.processed)).toEqual([1, 2]);
  });

  // ---- getStats ----

  it("getStats on empty log returns zeroed snapshot", () => {
    const stats = engine.getStats({ logPath });
    expect(stats.totalRuns).toBe(0);
    expect(stats.successfulRuns).toBe(0);
    expect(stats.successRate).toBe(0);
    expect(stats.lastRunAt).toBe(null);
    expect(stats.lastRunOk).toBe(null);
  });

  it("getStats aggregates success rate, totals, and mean duration", () => {
    engine.recordRun(makeRunInput(logPath, { ok: true, processed: 10, skipped: 1, durationMs: 100 }));
    engine.recordRun(makeRunInput(logPath, { ok: false, processed: 0, skipped: 0, durationMs: 50, error: "boom" }));
    engine.recordRun(makeRunInput(logPath, { ok: true, processed: 20, skipped: 2, durationMs: 200 }));
    engine.recordRun(makeRunInput(logPath, { ok: true, processed: 5, skipped: 0, durationMs: 150 }));
    const stats = engine.getStats({ logPath });
    expect(stats.totalRuns).toBe(4);
    expect(stats.successfulRuns).toBe(3);
    expect(stats.failedRuns).toBe(1);
    expect(stats.successRate).toBe(0.75);
    expect(stats.totalProcessed).toBe(35);
    expect(stats.totalSkipped).toBe(3);
    // (100 + 50 + 200 + 150) / 4 = 125
    expect(stats.meanDurationMs).toBe(125);
    expect(stats.lastRunOk).toBe(true);
  });

  it("getStats reflects most recent run's status in lastRunOk", () => {
    engine.recordRun(makeRunInput(logPath, { ok: true, processed: 5 }));
    engine.recordRun(makeRunInput(logPath, { ok: false, processed: 0, error: "fail" }));
    expect(engine.getStats({ logPath }).lastRunOk).toBe(false);
  });

  // ---- variability across triggers + vendor distributions ----

  it("recordRun preserves variability across triggers (cli / dispatcher / cron / manual)", () => {
    const triggers = ["cli", "dispatcher", "cron", "manual"];
    for (const trigger of triggers) {
      engine.recordRun(makeRunInput(logPath, { trigger, processed: 1 }));
    }
    const history = engine.getHistory({ logPath });
    expect(history.map((e) => e.trigger).sort()).toEqual([...triggers].sort());
  });

  it("recordRun preserves per-vendor count distributions across runs", () => {
    engine.recordRun(makeRunInput(logPath, {
      perVendor: { anthropic: 5, openai: 5, google: 3, ollama: 2, xai: 1 },
    }));
    const history = engine.getHistory({ logPath });
    expect(history[0].perVendor).toEqual({ anthropic: 5, openai: 5, google: 3, ollama: 2, xai: 1 });
  });

  // ---- adversarial / edge cases ----

  it("getHistory tolerates a log with only malformed lines", () => {
    fs.writeFileSync(logPath, "not json\n{also bad\n");
    expect(engine.getHistory({ logPath })).toEqual([]);
  });

  it("getHistory limit=1 returns only the most recent entry", () => {
    engine.recordRun(makeRunInput(logPath, { processed: 1 }));
    engine.recordRun(makeRunInput(logPath, { processed: 2 }));
    const history = engine.getHistory({ logPath, limit: 1 });
    expect(history).toHaveLength(1);
    expect(history[0].processed).toBe(2);
  });

  it("recordRun timestamp is monotonically non-decreasing across rapid successive calls", () => {
    const ts: string[] = [];
    for (let i = 0; i < 5; i++) {
      const { entry } = engine.recordRun(makeRunInput(logPath, { processed: i }));
      ts.push(entry.ts);
    }
    for (let i = 1; i < ts.length; i++) {
      expect(ts[i] >= ts[i - 1]).toBe(true);
    }
  });
});
