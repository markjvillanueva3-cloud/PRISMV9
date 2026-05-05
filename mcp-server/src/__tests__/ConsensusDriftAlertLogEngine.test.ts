/**
 * ConsensusDriftAlertLogEngine — INTEL-OLLAMA-OBSIDIAN-MS0/U-CONSENSUS-DRIFT-ALERT-LOG.
 *
 * Verifies append-only persistence of actionable drift events:
 *   - record actionable events as alerts + always emit summary
 *   - skip non-actionable (none/minor) at alert level but include in summary counts
 *   - read tail via getAlerts with filter combinations
 *   - getAlertStats aggregates totals + per-vendor + per-severity
 *   - corrupt/missing log fail-open
 *   - schema_version + ts present on every line
 *   - append-only (existing entries preserved across record calls)
 */
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "node:fs";
import * as os from "node:os";
import * as path from "node:path";
import { ConsensusDriftAlertLogEngine } from "../engines/ConsensusDriftAlertLogEngine.js";
import type { DriftReport } from "../engines/ConsensusDriftDetectorEngine.js";

const engine = new ConsensusDriftAlertLogEngine();

let dir: string;
let logPath: string;

beforeEach(() => {
  dir = fs.mkdtempSync(path.join(os.tmpdir(), "prism-drift-alert-"));
  logPath = path.join(dir, "alerts.jsonl");
});
afterEach(() => {
  fs.rmSync(dir, { recursive: true, force: true });
});

function makeReport(events: Array<Partial<DriftReport["events"][number]>> = [], counts: Partial<DriftReport["counts"]> = {}): DriftReport {
  const filledEvents: DriftReport["events"] = events.map((e) => ({
    vendor: e.vendor ?? "anthropic",
    taskType: e.taskType ?? "plan",
    emaBefore: e.emaBefore ?? 0.85,
    emaAfter: e.emaAfter ?? 0.50,
    delta: e.delta ?? -0.35,
    severity: e.severity ?? "severe",
    nBefore: e.nBefore ?? 30,
    nAfter: e.nAfter ?? 32,
  }));
  return {
    generatedAt: "2026-05-05T18:00:00.000Z",
    beforeAt: "2026-05-05T17:00:00.000Z",
    afterAt: "2026-05-05T18:00:00.000Z",
    thresholds: { minor: 0.05, moderate: 0.15, severe: 0.30 },
    minObservations: 5,
    events: filledEvents,
    exempt: [],
    counts: {
      none: counts.none ?? 0,
      minor: counts.minor ?? 0,
      moderate: counts.moderate ?? filledEvents.filter((e) => e.severity === "moderate").length,
      severe: counts.severe ?? filledEvents.filter((e) => e.severity === "severe").length,
      exempt: counts.exempt ?? 0,
      totalCompared: counts.totalCompared ?? filledEvents.length,
    },
  };
}

describe("ConsensusDriftAlertLogEngine", () => {
  // ---- recordReport() ----

  it("recordReport writes one alert per actionable event + one summary line", () => {
    const report = makeReport([
      { vendor: "anthropic", taskType: "plan", severity: "severe", delta: -0.40 },
      { vendor: "openai", taskType: "decide", severity: "moderate", delta: -0.18 },
    ]);
    const result = engine.recordReport({ report, runId: "cron-001", logPath });
    expect(result.ok).toBe(true);
    expect(result.alertsWritten).toBe(2);
    expect(result.summaryWritten).toBe(true);
    expect(result.error).toBeNull();
    const lines = fs.readFileSync(logPath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(3); // 2 alerts + 1 summary
    const alerts = engine.getAlerts({ logPath, kind: "alert" });
    expect(alerts).toHaveLength(2);
    const summary = engine.getAlerts({ logPath, kind: "summary" });
    expect(summary).toHaveLength(1);
    expect(summary[0].run_id).toBe("cron-001");
    expect(summary[0].total_actionable).toBe(2);
  });

  it("recordReport skips minor events but still emits summary", () => {
    const report = makeReport(
      [{ vendor: "google", taskType: "plan", severity: "minor", delta: -0.07 }],
      { minor: 1 },
    );
    const result = engine.recordReport({ report, runId: "cron-002", logPath });
    expect(result.alertsWritten).toBe(0);
    expect(result.summaryWritten).toBe(true);
    const alerts = engine.getAlerts({ logPath, kind: "alert" });
    expect(alerts).toHaveLength(0);
    const summary = engine.getAlerts({ logPath, kind: "summary" });
    expect(summary).toHaveLength(1);
    expect(summary[0].counts!.minor).toBe(1);
    expect(summary[0].total_actionable).toBe(0);
  });

  it("recordReport with no events still emits a summary (audit trail)", () => {
    const report = makeReport([]);
    const result = engine.recordReport({ report, runId: "cron-003", logPath });
    expect(result.alertsWritten).toBe(0);
    expect(result.summaryWritten).toBe(true);
    const all = engine.getAlerts({ logPath });
    expect(all).toHaveLength(1);
    expect(all[0].kind).toBe("summary");
  });

  it("recordReport is append-only across multiple invocations", () => {
    const report1 = makeReport([{ vendor: "anthropic", severity: "severe", delta: -0.35 }]);
    const report2 = makeReport([{ vendor: "openai", severity: "moderate", delta: -0.18 }]);
    engine.recordReport({ report: report1, runId: "r1", logPath });
    engine.recordReport({ report: report2, runId: "r2", logPath });
    const alerts = engine.getAlerts({ logPath, kind: "alert" });
    expect(alerts).toHaveLength(2);
    expect(alerts.map((a) => a.vendor)).toEqual(["anthropic", "openai"]);
    const summaries = engine.getAlerts({ logPath, kind: "summary" });
    expect(summaries).toHaveLength(2);
    expect(summaries.map((s) => s.run_id)).toEqual(["r1", "r2"]);
  });

  it("recordReport schema_version + ts populated on every line", () => {
    const report = makeReport([{ vendor: "anthropic", severity: "severe", delta: -0.35 }]);
    const fixedTs = new Date("2026-05-05T18:30:00.000Z");
    engine.recordReport({ report, runId: "r1", logPath, now: fixedTs });
    const all = engine.getAlerts({ logPath });
    for (const e of all) {
      expect(e.schema_version).toBe("1.0.0");
      expect(e.ts).toBe("2026-05-05T18:30:00.000Z");
    }
  });

  // ---- getAlerts() filtering ----

  it("getAlerts filters by severity (alerts only)", () => {
    const report = makeReport([
      { vendor: "anthropic", severity: "severe", delta: -0.40 },
      { vendor: "openai", severity: "moderate", delta: -0.18 },
    ]);
    engine.recordReport({ report, runId: "r1", logPath });
    const severe = engine.getAlerts({ logPath, severity: "severe" });
    expect(severe).toHaveLength(1);
    expect(severe[0].vendor).toBe("anthropic");
    const moderate = engine.getAlerts({ logPath, severity: "moderate" });
    expect(moderate).toHaveLength(1);
    expect(moderate[0].vendor).toBe("openai");
  });

  it("getAlerts filters by vendor", () => {
    const report = makeReport([
      { vendor: "anthropic", severity: "severe", delta: -0.40 },
      { vendor: "anthropic", taskType: "decide", severity: "moderate", delta: -0.20 },
      { vendor: "openai", severity: "severe", delta: -0.45 },
    ]);
    engine.recordReport({ report, runId: "r1", logPath });
    const anthropicOnly = engine.getAlerts({ logPath, vendor: "anthropic" });
    expect(anthropicOnly).toHaveLength(2);
    expect(anthropicOnly.every((a) => a.vendor === "anthropic")).toBe(true);
  });

  it("getAlerts filters by sinceTs", () => {
    engine.recordReport({
      report: makeReport([{ vendor: "anthropic", severity: "severe", delta: -0.40 }]),
      runId: "r1",
      logPath,
      now: new Date("2026-05-04T12:00:00.000Z"),
    });
    engine.recordReport({
      report: makeReport([{ vendor: "openai", severity: "severe", delta: -0.40 }]),
      runId: "r2",
      logPath,
      now: new Date("2026-05-05T12:00:00.000Z"),
    });
    const recent = engine.getAlerts({ logPath, sinceTs: "2026-05-05T00:00:00.000Z", kind: "alert" });
    expect(recent).toHaveLength(1);
    expect(recent[0].vendor).toBe("openai");
  });

  it("getAlerts respects limit cap", () => {
    for (let i = 0; i < 25; i++) {
      engine.recordReport({
        report: makeReport([{ vendor: `v${i}`, severity: "severe", delta: -0.40 }]),
        runId: `r${i}`,
        logPath,
      });
    }
    const limited = engine.getAlerts({ logPath, kind: "alert", limit: 5 });
    expect(limited).toHaveLength(5);
    // Tail-cap returns the most recent.
    expect(limited[4].vendor).toBe("v24");
  });

  // ---- getAlertStats() ----

  it("getAlertStats aggregates totals, severity, vendor counts", () => {
    engine.recordReport({
      report: makeReport([
        { vendor: "anthropic", severity: "severe", delta: -0.40 },
        { vendor: "anthropic", taskType: "decide", severity: "moderate", delta: -0.20 },
        { vendor: "openai", severity: "moderate", delta: -0.18 },
      ]),
      runId: "r1",
      logPath,
    });
    const stats = engine.getAlertStats({ logPath });
    expect(stats.totalAlerts).toBe(3);
    expect(stats.totalSummaries).toBe(1);
    expect(stats.bySeverity.severe).toBe(1);
    expect(stats.bySeverity.moderate).toBe(2);
    expect(stats.bySeverity.minor).toBe(0);
    expect(stats.byVendor.anthropic).toBe(2);
    expect(stats.byVendor.openai).toBe(1);
  });

  it("getAlertStats earliestTs/latestTs tracked across multi-run timeline", () => {
    engine.recordReport({
      report: makeReport([{ vendor: "anthropic", severity: "severe", delta: -0.40 }]),
      runId: "r1",
      logPath,
      now: new Date("2026-05-04T12:00:00.000Z"),
    });
    engine.recordReport({
      report: makeReport([{ vendor: "openai", severity: "moderate", delta: -0.18 }]),
      runId: "r2",
      logPath,
      now: new Date("2026-05-05T15:00:00.000Z"),
    });
    const stats = engine.getAlertStats({ logPath });
    expect(stats.earliestTs).toBe("2026-05-04T12:00:00.000Z");
    expect(stats.latestTs).toBe("2026-05-05T15:00:00.000Z");
  });

  // ---- adversarial: missing/corrupt log ----

  it("getAlerts returns empty array when log file is missing", () => {
    expect(engine.getAlerts({ logPath: path.join(dir, "missing.jsonl") })).toEqual([]);
  });

  it("getAlerts skips corrupt lines but parses valid neighbors", () => {
    fs.writeFileSync(
      logPath,
      [
        JSON.stringify({ schema_version: "1.0.0", ts: "2026-05-05T18:00:00.000Z", kind: "summary", run_id: "good1" }),
        "{not-valid-json",
        JSON.stringify({ schema_version: "1.0.0", ts: "2026-05-05T18:00:01.000Z", kind: "alert", vendor: "ok", severity: "severe" }),
        '{"missing-required-fields": true}',
        JSON.stringify({ schema_version: "1.0.0", ts: "2026-05-05T18:00:02.000Z", kind: "summary", run_id: "good2" }),
      ].join("\n") + "\n",
      "utf-8",
    );
    const all = engine.getAlerts({ logPath });
    expect(all).toHaveLength(3);
    expect(all.map((e) => e.kind)).toEqual(["summary", "alert", "summary"]);
  });

  it("recordReport returns ok:false when log directory cannot be created (fail-open)", () => {
    // Write a regular file at the parent dir path so mkdirSync(parent) fails.
    const blockedParent = path.join(dir, "blocked");
    fs.writeFileSync(blockedParent, "not a directory", "utf-8");
    const blockedPath = path.join(blockedParent, "child", "alerts.jsonl");
    const result = engine.recordReport({
      report: makeReport([{ severity: "severe", delta: -0.40 }]),
      logPath: blockedPath,
    });
    expect(result.ok).toBe(false);
    expect(result.error).not.toBeNull();
  });

  // ---- end-to-end ----

  it("full lifecycle: record → filter → aggregate", () => {
    const ts1 = new Date("2026-05-04T00:00:00.000Z");
    const ts2 = new Date("2026-05-05T00:00:00.000Z");
    engine.recordReport({
      report: makeReport([
        { vendor: "anthropic", severity: "severe", delta: -0.40 },
        { vendor: "openai", severity: "moderate", delta: -0.18 },
      ]),
      runId: "yesterday",
      logPath,
      now: ts1,
    });
    engine.recordReport({
      report: makeReport([{ vendor: "anthropic", severity: "moderate", delta: -0.20 }]),
      runId: "today",
      logPath,
      now: ts2,
    });
    // Total ledger: 3 alerts + 2 summaries = 5 entries.
    expect(engine.getAlerts({ logPath })).toHaveLength(5);
    // Today only: 1 alert + 1 summary.
    const today = engine.getAlerts({ logPath, sinceTs: "2026-05-05T00:00:00.000Z" });
    expect(today).toHaveLength(2);
    // Stats over full window.
    const stats = engine.getAlertStats({ logPath });
    expect(stats.totalAlerts).toBe(3);
    expect(stats.byVendor.anthropic).toBe(2);
    expect(stats.byVendor.openai).toBe(1);
    expect(stats.bySeverity.severe).toBe(1);
    expect(stats.bySeverity.moderate).toBe(2);
  });
});
