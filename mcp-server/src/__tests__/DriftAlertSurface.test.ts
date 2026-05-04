/**
 * DriftAlertSurface — tests for .claude/hooks/drift-alert-surface.mjs
 * ===================================================================
 *
 * INTEL-OLLAMA-OBSIDIAN-MS0/P19-U02.
 *
 * The hook script lives at .claude/hooks/drift-alert-surface.mjs and
 * exports four functions: evaluateDriftAlerts (no I/O), formatAlerts
 * (no I/O), tailLog (file read), loadEnvironment (file read).
 *
 * These tests exercise the pure logic only — no spawn, no real schtasks.
 * Coverage:
 *   - happy path: empty log + manifest with no schedule → no alerts
 *   - failure mode 1: error row in window → surfaces error alert with body
 *   - failure mode 2: stale daily task → surfaces warn alert with age
 *   - failure mode 3: malformed JSONL line → ignored, doesn't throw
 *   - adversarial: NaN timestamps, missing fields, oversize log
 *   - variability: hourly + daily + event-triggered + unknown schedules
 *
 * @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P19-U02
 */

import { describe, it, expect, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  evaluateDriftAlerts,
  formatAlerts,
  tailLog,
} from "../../../.claude/hooks/drift-alert-surface.mjs";

// ─── Named constants (no magic numbers) ──────────────────────────────────
const HOUR_MS = 60 * 60 * 1000;
const NOW = new Date("2026-05-04T12:00:00.000Z");
const ERROR_LOOKBACK_HOURS = 24;
const DEFAULT_DRIFT_PCT = 5;
const STALE_GAP_HOURS = 30;
const FRESH_HOURLY_GAP_HOURS = 1.5;
const HOURLY_MODIFIER_2H = 2;
const FRESH_DAILY_GAP_HOURS = 23;
const BIG_LOG_ROWS = 10_000;
const TAIL_BYTES_TEST = 4096;
const MAX_LARGE_FILE_LINES = 5000;
const PAD_CHARS = 80;

const baseManifest = {
  schemaVersion: "1.0.0",
  drift_alert_threshold_pct: DEFAULT_DRIFT_PCT,
  tasks: [
    {
      id: "drift-update-prism-inventory",
      schedule: { kind: "daily", time: "06:00" },
      schtasks_args: ["/SC", "DAILY", "/ST", "06:00"],
    },
    {
      id: "drift-inventory-delta",
      schedule: { kind: "hourly", modifier: 1 },
      schtasks_args: ["/SC", "HOURLY", "/MO", "1"],
    },
    {
      id: "drift-self-awareness-manifest",
      schedule: { kind: "event", trigger: "SessionEnd" },
      schtasks_args: null,
    },
  ],
};

function jsonl(...rows: object[]): string {
  return rows.map((r) => JSON.stringify(r)).join("\n") + "\n";
}

function tsAgo(hoursAgo: number): string {
  return new Date(NOW.getTime() - hoursAgo * HOUR_MS).toISOString();
}

describe("evaluateDriftAlerts — happy path", () => {
  it("returns 0 alerts when both clock-scheduled tasks ran recently", () => {
    const log = jsonl(
      { ts: tsAgo(2), level: "info", task_id: "drift-update-prism-inventory", action: "run", message: "ok" },
      { ts: tsAgo(0.5), level: "info", task_id: "drift-inventory-delta", action: "run", message: "ok" },
    );
    const result = evaluateDriftAlerts(baseManifest, log, NOW);
    expect(result.ok).toBe(true);
    expect(result.alerts).toEqual([]);
    expect(result.stats).toEqual({ totalRows: 2, errorRows: 0, infoRows: 2, warnRows: 0 });
  });

  it("ignores event-triggered tasks (no schedule window expectation)", () => {
    const result = evaluateDriftAlerts(
      { tasks: [baseManifest.tasks[2]] },
      "",
      NOW,
    );
    expect(result.alerts).toEqual([]);
    expect(result.ok).toBe(true);
  });

  it("treats missing tasks array as empty manifest", () => {
    const result = evaluateDriftAlerts({}, "", NOW);
    expect(result.alerts).toEqual([]);
    expect(result.ok).toBe(true);
    expect(result.stats.totalRows).toBe(0);
  });
});

describe("evaluateDriftAlerts — failure modes", () => {
  it("surfaces an error row from within the 24h lookback window", () => {
    const errorTs = tsAgo(6);
    const errorMsg = "exit 1";
    const log = jsonl(
      { ts: errorTs, level: "error", task_id: "drift-update-prism-inventory", action: "schtasks-fail", message: errorMsg },
      { ts: tsAgo(1), level: "info", task_id: "drift-inventory-delta", action: "run", message: "ok" },
    );
    const result = evaluateDriftAlerts(baseManifest, log, NOW);
    expect(result.ok).toBe(false);
    const errors = result.alerts.filter((a) => a.level === "error");
    expect(errors).toEqual([
      {
        level: "error",
        task_id: "drift-update-prism-inventory",
        message: `[${errorTs}] drift-update-prism-inventory: ${errorMsg}`,
      },
    ]);
  });

  it("ignores error rows older than 24h (boundary check)", () => {
    const log = jsonl(
      { ts: tsAgo(ERROR_LOOKBACK_HOURS + 1), level: "error", task_id: "drift-update-prism-inventory", action: "fail", message: "stale error" },
      { ts: tsAgo(0.5), level: "info", task_id: "drift-update-prism-inventory", action: "run", message: "ok" },
      { ts: tsAgo(0.5), level: "info", task_id: "drift-inventory-delta", action: "run", message: "ok" },
    );
    const result = evaluateDriftAlerts(baseManifest, log, NOW);
    expect(result.alerts.filter((a) => a.level === "error")).toEqual([]);
  });

  it("flags stale daily task whose last run is past the 24h * (1 + drift) gap", () => {
    const log = jsonl(
      { ts: tsAgo(STALE_GAP_HOURS), level: "info", task_id: "drift-update-prism-inventory", action: "run", message: "ok" },
      { ts: tsAgo(0.5), level: "info", task_id: "drift-inventory-delta", action: "run", message: "ok" },
    );
    const result = evaluateDriftAlerts(baseManifest, log, NOW);
    const staleAlerts = result.alerts.filter((a) => a.task_id === "drift-update-prism-inventory");
    expect(staleAlerts).toHaveLength(1);
    expect(staleAlerts[0].level).toBe("warn");
    expect(staleAlerts[0].message).toBe(
      "Task drift-update-prism-inventory last ran 30.0h ago (window: 24.0h, drift 5%).",
    );
  });

  it("flags every clock-scheduled task with no run record yet", () => {
    const result = evaluateDriftAlerts(baseManifest, "", NOW);
    const warnIds = result.alerts.filter((a) => a.level === "warn").map((a) => a.task_id);
    expect(warnIds.sort()).toEqual(["drift-inventory-delta", "drift-update-prism-inventory"]);
  });

  it("suppresses no-run-record alert when task was install-skipped", () => {
    const log = jsonl(
      { ts: tsAgo(1), level: "warn", task_id: "drift-update-prism-inventory", action: "skip", message: "source missing" },
      { ts: tsAgo(0.5), level: "info", task_id: "drift-inventory-delta", action: "run", message: "ok" },
    );
    const result = evaluateDriftAlerts(baseManifest, log, NOW);
    const flagged = result.alerts.filter((a) => a.task_id === "drift-update-prism-inventory");
    expect(flagged).toEqual([]);
  });
});

describe("evaluateDriftAlerts — adversarial inputs", () => {
  it("ignores malformed JSONL lines without throwing", () => {
    const log = [
      "{not json",
      JSON.stringify({ ts: tsAgo(1), level: "info", task_id: "drift-update-prism-inventory", action: "run", message: "ok" }),
      "[also not an object]",
      JSON.stringify(null),
      JSON.stringify({ ts: tsAgo(0.5), level: "info", task_id: "drift-inventory-delta", action: "run", message: "ok" }),
      "",
    ].join("\n");
    const result = evaluateDriftAlerts(baseManifest, log, NOW);
    expect(result.ok).toBe(true);
    expect(result.stats.totalRows).toBeGreaterThanOrEqual(2);
    expect(result.stats.errorRows).toBe(0);
  });

  it("rejects rows with NaN/missing timestamps as not-recent", () => {
    const log = jsonl(
      { ts: "not-a-date", level: "error", task_id: "drift-update-prism-inventory", action: "fail", message: "should be ignored" },
      { level: "error", task_id: "drift-update-prism-inventory", action: "fail", message: "no ts at all" },
      { ts: tsAgo(1), level: "info", task_id: "drift-update-prism-inventory", action: "run", message: "ok" },
      { ts: tsAgo(0.5), level: "info", task_id: "drift-inventory-delta", action: "run", message: "ok" },
    );
    const result = evaluateDriftAlerts(baseManifest, log, NOW);
    expect(result.alerts.filter((a) => a.level === "error")).toEqual([]);
  });

  it("uses default 5% drift threshold when manifest omits it", () => {
    const m = { tasks: baseManifest.tasks };
    const log = jsonl(
      { ts: tsAgo(ERROR_LOOKBACK_HOURS), level: "info", task_id: "drift-update-prism-inventory", action: "run", message: "ok" },
      { ts: tsAgo(0.5), level: "info", task_id: "drift-inventory-delta", action: "run", message: "ok" },
    );
    const result = evaluateDriftAlerts(m, log, NOW);
    const flagged = result.alerts.filter((a) => a.task_id === "drift-update-prism-inventory");
    expect(flagged).toEqual([]);
  });

  it("handles oversize log content (10k rows) and tallies stats correctly", () => {
    const rows: object[] = [];
    for (let i = 0; i < BIG_LOG_ROWS; i++) {
      rows.push({
        ts: new Date(NOW.getTime() - i * 60_000).toISOString(),
        level: "info",
        task_id: i % 2 === 0 ? "drift-update-prism-inventory" : "drift-inventory-delta",
        action: "run",
        message: `bulk-${i}`,
      });
    }
    const log = jsonl(...rows);
    const result = evaluateDriftAlerts(baseManifest, log, NOW);
    expect(result.ok).toBe(true);
    expect(result.stats).toEqual({ totalRows: BIG_LOG_ROWS, errorRows: 0, infoRows: BIG_LOG_ROWS, warnRows: 0 });
  });
});

describe("evaluateDriftAlerts — variability across schedule kinds", () => {
  it("hourly schedule with modifier=2 allows 2h gap (1.5h-old run is fresh)", () => {
    const m = {
      tasks: [
        {
          id: "task-2hr",
          schedule: { kind: "hourly", modifier: HOURLY_MODIFIER_2H },
          schtasks_args: ["/SC", "HOURLY", "/MO", "2"],
        },
      ],
    };
    const log = jsonl({
      ts: tsAgo(FRESH_HOURLY_GAP_HOURS),
      level: "info", task_id: "task-2hr", action: "run", message: "ok",
    });
    expect(evaluateDriftAlerts(m, log, NOW).alerts).toEqual([]);
  });

  it("daily schedule treats 23h-old run as fresh", () => {
    const m = { tasks: [baseManifest.tasks[0]] };
    const log = jsonl({
      ts: tsAgo(FRESH_DAILY_GAP_HOURS),
      level: "info", task_id: "drift-update-prism-inventory", action: "run", message: "ok",
    });
    expect(evaluateDriftAlerts(m, log, NOW).alerts).toEqual([]);
  });

  it("unknown schedule.kind is silently skipped (not flagged as stale)", () => {
    const m = {
      tasks: [
        {
          id: "task-weekly",
          schedule: { kind: "weekly", day: "Monday" },
          schtasks_args: ["/SC", "WEEKLY"],
        },
      ],
    };
    const result = evaluateDriftAlerts(m, "", NOW);
    expect(result.alerts).toEqual([]);
  });
});

describe("formatAlerts", () => {
  it("returns empty string when no alerts", () => {
    expect(formatAlerts([])).toBe("");
  });

  it("renders error and warn sections with concrete counts and source pointer", () => {
    const text = formatAlerts([
      { level: "error", task_id: "t1", message: "boom" },
      { level: "warn", task_id: "t2", message: "stale" },
    ]);
    expect(text).toContain("### ⚠️ Drift-detection alerts (P19-U02)");
    expect(text).toContain("**1 error(s) in last 24h:**");
    expect(text).toContain("- boom");
    expect(text).toContain("**1 stale/missing task(s):**");
    expect(text).toContain("- stale");
    expect(text).toContain("`mcp-server/data/state/cron-runs.jsonl`");
    expect(text).toContain("install-drift-detection-cron.ps1");
  });

  it("only emits error section when no warns", () => {
    const text = formatAlerts([{ level: "error", task_id: "t", message: "x" }]);
    expect(text).toContain("**1 error(s) in last 24h:**");
    expect(text.includes("stale/missing task(s)")).toBe(false);
  });

  it("only emits warn section when no errors", () => {
    const text = formatAlerts([{ level: "warn", task_id: "t", message: "y" }]);
    expect(text.includes("error(s) in last 24h")).toBe(false);
    expect(text).toContain("**1 stale/missing task(s):**");
  });
});

describe("tailLog", () => {
  const tmpRoot = mkdtempSync(join(tmpdir(), "drift-tail-"));

  afterAll(() => {
    rmSync(tmpRoot, { recursive: true, force: true });
  });

  it("returns empty string for missing file", () => {
    expect(tailLog(join(tmpRoot, "nope.jsonl"))).toBe("");
  });

  it("returns full file when smaller than maxBytes", () => {
    const p = join(tmpRoot, "small.jsonl");
    const content = "line1\nline2\n";
    writeFileSync(p, content);
    expect(tailLog(p)).toBe(content);
  });

  it("returns tail-aligned content when file exceeds maxBytes (no half-rows at start)", () => {
    const p = join(tmpRoot, "big.jsonl");
    const lines: string[] = [];
    for (let i = 0; i < MAX_LARGE_FILE_LINES; i++) {
      lines.push(`{"i":${i},"pad":"${"x".repeat(PAD_CHARS)}"}`);
    }
    writeFileSync(p, lines.join("\n") + "\n");
    const tail = tailLog(p, TAIL_BYTES_TEST);
    expect(tail.length).toBeLessThanOrEqual(TAIL_BYTES_TEST);
    const tailLines = tail.split("\n").filter((l) => l.length > 0);
    expect(tailLines.length).toBeGreaterThan(0);
    for (const line of tailLines) {
      const parsed = JSON.parse(line) as { i: number; pad: string };
      expect(typeof parsed.i).toBe("number");
      expect(parsed.pad.length).toBe(PAD_CHARS);
    }
  });
});
