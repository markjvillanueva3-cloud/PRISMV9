/**
 * ConsensusDashboardRendererEngine — INTEL-OLLAMA-OBSIDIAN-MS0/U-CONSENSUS-DASHBOARD-CLI.
 *
 * Verifies the markdown renderer for consensus dashboard payloads:
 * header, per-task tables, suggested probes, recent trend, plus the
 * empty-state and probe-limit edge cases.
 */
import { describe, it, expect } from "vitest";
import { ConsensusDashboardRendererEngine } from "../engines/ConsensusDashboardRendererEngine.js";
import type { RunLogPayload, DriftAlertPayload } from "../engines/ConsensusDashboardRendererEngine.js";
import type { Dashboard } from "../engines/ConsensusPerformanceDashboardEngine.js";
import type { RunLogEntry } from "../engines/ConsensusCreditRunLogEngine.js";
import type { AlertEntry } from "../engines/ConsensusDriftAlertLogEngine.js";

const renderer = new ConsensusDashboardRendererEngine();

function makeDashboard(overrides: Partial<Dashboard> = {}): Dashboard {
  return {
    generatedAt: "2026-05-05T15:00:00.000Z",
    perfStatePath: "/tmp/perf.json",
    feedPath: "/tmp/feed.jsonl",
    perTaskType: {
      decide: {
        taskType: "decide",
        vendors: [
          { vendor: "anthropic", ema: 0.92, n: 12, lastUpdated: "2026-05-05T14:00:00.000Z", rank: 1 },
          { vendor: "openai", ema: 0.85, n: 8, lastUpdated: "2026-05-05T13:00:00.000Z", rank: 2 },
        ],
        totalObservations: 20,
        coverage: { covered: ["anthropic", "openai"], missing: ["google"], sparse: [] },
      },
      plan: {
        taskType: "plan",
        vendors: [],
        totalObservations: 0,
        coverage: { covered: [], missing: ["anthropic", "openai", "google"], sparse: [] },
      },
    },
    overall: {
      totalVendors: 3,
      totalTaskTypes: 2,
      totalObservations: 20,
      coldStartCombos: [
        { vendor: "google", taskType: "decide", reason: "missing" },
        { vendor: "anthropic", taskType: "plan", reason: "missing" },
        { vendor: "openai", taskType: "plan", reason: "missing" },
        { vendor: "google", taskType: "plan", reason: "missing" },
      ],
      coverage: { fullyCovered: 0, partial: 1, uncovered: 1 },
    },
    trend: {
      feedLines: 50,
      scannedLines: 50,
      recentRewards: { count: 50, mean: 0.78, p50: 0.8, p90: 0.95 },
      rewardByTaskType: { decide: { mean: 0.82, n: 30 }, plan: { mean: 0.7, n: 20 } },
    },
    suggestedProbes: [
      { vendor: "anthropic", taskType: "plan", reason: "missing", priority: 1.0 },
      { vendor: "google", taskType: "decide", reason: "missing", priority: 1.0 },
      { vendor: "openai", taskType: "plan", reason: "missing", priority: 1.0 },
      { vendor: "google", taskType: "plan", reason: "missing", priority: 1.0 },
    ],
    ...overrides,
  };
}

describe("ConsensusDashboardRendererEngine", () => {
  // ---- header ----

  it("renderHeader emits generatedAt, paths, totals, and coverage summary", () => {
    const lines = renderer.renderHeader(makeDashboard());
    const text = lines.join("\n");
    expect(text).toContain("2026-05-05T15:00:00.000Z");
    expect(text).toContain("/tmp/perf.json");
    expect(text).toContain("/tmp/feed.jsonl");
    expect(text).toContain("Vendors: **3**");
    expect(text).toContain("Task types: **2**");
    expect(text).toContain("Total observations: **20**");
    expect(text).toContain("**0** fully · 1 partial · 1 uncovered");
  });

  it("renderHeader breaks coldStartCombos into missing/sparse/stale counts", () => {
    const lines = renderer.renderHeader(makeDashboard({
      overall: {
        totalVendors: 3,
        totalTaskTypes: 2,
        totalObservations: 0,
        coldStartCombos: [
          { vendor: "a", taskType: "x", reason: "missing" },
          { vendor: "b", taskType: "x", reason: "sparse", n: 1 },
          { vendor: "c", taskType: "x", reason: "stale", ageDays: 60 },
        ],
        coverage: { fullyCovered: 0, partial: 0, uncovered: 2 },
      },
    }));
    const text = lines.join("\n");
    expect(text).toContain("missing=1");
    expect(text).toContain("sparse=1");
    expect(text).toContain("stale=1");
  });

  it("renderHeader shows a checkmark when no cold-start combos", () => {
    const text = renderer.renderHeader(makeDashboard({
      overall: {
        totalVendors: 3,
        totalTaskTypes: 2,
        totalObservations: 100,
        coldStartCombos: [],
        coverage: { fullyCovered: 2, partial: 0, uncovered: 0 },
      },
    })).join("\n");
    expect(text).toContain("Cold-start combos: **0** ✓");
  });

  // ---- per-task tables ----

  it("renderPerTaskTables emits a markdown table per task with rank/vendor/ema/n columns", () => {
    const text = renderer.renderPerTaskTables(makeDashboard().perTaskType).join("\n");
    expect(text).toContain("### decide");
    expect(text).toContain("| Rank | Vendor | EMA | n | Last updated |");
    expect(text).toContain("| 1 | anthropic | 0.9200 | 12 |");
    expect(text).toContain("| 2 | openai | 0.8500 | 8 |");
  });

  it("renderPerTaskTables sorts task types alphabetically for stable output", () => {
    const text = renderer.renderPerTaskTables(makeDashboard().perTaskType).join("\n");
    const decideIdx = text.indexOf("### decide");
    const planIdx = text.indexOf("### plan");
    expect(decideIdx).toBeGreaterThan(-1);
    expect(planIdx).toBeGreaterThan(decideIdx); // alphabetical
  });

  it("renderPerTaskTables shows 'No covered vendors yet.' for empty task views", () => {
    const text = renderer.renderPerTaskTables(makeDashboard().perTaskType).join("\n");
    expect(text).toContain("No covered vendors yet.");
    expect(text).toContain("Missing: anthropic, openai, google");
  });

  it("renderPerTaskTables emits per-task gap line when missing or sparse vendors exist", () => {
    const text = renderer.renderPerTaskTables(makeDashboard().perTaskType).join("\n");
    expect(text).toContain("_Gaps — missing: google_");
  });

  it("renderPerTaskTables degrades gracefully when given empty perTaskType map", () => {
    const text = renderer.renderPerTaskTables({}).join("\n");
    expect(text).toContain("_No task types in dashboard._");
  });

  // ---- probes ----

  it("renderProbes emits priority/vendor/task/reason rows in given order", () => {
    const text = renderer.renderProbes(makeDashboard().suggestedProbes).join("\n");
    expect(text).toContain("| Priority | Vendor | Task | Reason |");
    expect(text).toContain("| 1.000 | anthropic | plan | missing |");
    expect(text).toContain("| 1.000 | google | decide | missing |");
  });

  it("renderProbes respects limit and reports truncation", () => {
    const probes = Array.from({ length: 25 }, (_, i) => ({
      vendor: `vendor_${i}`,
      taskType: `task_${i}`,
      reason: "missing" as const,
      priority: 1.0,
    }));
    const text = renderer.renderProbes(probes, 5).join("\n");
    // Row format: "| <priority> | <vendor> | <task> | <reason> |"
    // Count data rows by matching the unique "vendor_" token (excludes header divider rows).
    const dataRows = text.split("\n").filter((l) => l.includes("vendor_"));
    expect(dataRows).toHaveLength(5);
    // First and last shown rows match input ordering.
    expect(dataRows[0]).toContain("vendor_0");
    expect(dataRows[4]).toContain("vendor_4");
    // Truncation footer reports the remainder.
    expect(text).toContain("…and 20 more (limit=5)");
  });

  it("renderProbes shows 'all calibrated' message when probes empty", () => {
    const text = renderer.renderProbes([]).join("\n");
    expect(text).toContain("_No probes suggested — all combos calibrated._");
  });

  // ---- trend ----

  it("renderTrend emits feedLines, distribution stats, and per-task table", () => {
    const text = renderer.renderTrend(makeDashboard().trend).join("\n");
    expect(text).toContain("**50** total");
    expect(text).toContain("scanned **50**");
    expect(text).toContain("mean=**0.7800**");
    expect(text).toContain("p50=0.8000");
    expect(text).toContain("p90=0.9500");
    expect(text).toContain("| decide | 0.8200 | 30 |");
    expect(text).toContain("| plan | 0.7000 | 20 |");
  });

  it("renderTrend shows empty-feed message when feedLines=0", () => {
    const text = renderer.renderTrend({
      feedLines: 0,
      scannedLines: 0,
      recentRewards: null,
      rewardByTaskType: {},
    }).join("\n");
    expect(text).toContain("_Feed empty — no consensus runs recorded yet._");
  });

  it("renderTrend handles non-empty feed but null recentRewards", () => {
    const text = renderer.renderTrend({
      feedLines: 5,
      scannedLines: 5,
      recentRewards: null,
      rewardByTaskType: {},
    }).join("\n");
    expect(text).toContain("**5** total");
    expect(text).toContain("_No reward signal in scanned window._");
  });

  // ---- end-to-end render() ----

  it("render produces all four sections and a trailing newline", () => {
    const md = renderer.render(makeDashboard());
    expect(md.startsWith("# Consensus Dashboard")).toBe(true);
    expect(md).toContain("## Per-task vendor ranking");
    expect(md).toContain("## Suggested probes");
    expect(md).toContain("## Recent feed trend");
    expect(md.endsWith("\n")).toBe(true);
  });

  it("render with showTrend=false omits the trend section entirely", () => {
    const md = renderer.render(makeDashboard(), { showTrend: false });
    expect(md).not.toContain("## Recent feed trend");
    expect(md).toContain("## Suggested probes");
  });

  it("render with showProbes=false omits the probes section entirely", () => {
    const md = renderer.render(makeDashboard(), { showProbes: false });
    expect(md).not.toContain("## Suggested probes");
    expect(md).toContain("## Recent feed trend");
  });

  it("render uses custom title when opts.title provided", () => {
    const md = renderer.render(makeDashboard(), { title: "Vendor Calibration Snapshot" });
    expect(md.startsWith("# Vendor Calibration Snapshot")).toBe(true);
  });

  it("render is deterministic for the same dashboard input", () => {
    const dash = makeDashboard();
    const a = renderer.render(dash);
    const b = renderer.render(dash);
    expect(a).toBe(b);
  });

  // ---- recent-runs (U-CONSENSUS-DASHBOARD-RUNLOG) ----

  function makeEntry(overrides: Partial<RunLogEntry> = {}): RunLogEntry {
    return {
      schema_version: "1.0.0",
      ts: "2026-05-05T16:00:00.000Z",
      ok: true,
      processed: 12,
      skipped: 0,
      cursorAdvance: 4096,
      cursorOffset: 4096,
      perVendor: { anthropic: 4, openai: 4, google: 4 },
      trigger: "cron",
      error: null,
      durationMs: 84,
      ...overrides,
    };
  }

  function makePayload(entries: RunLogEntry[]): RunLogPayload {
    if (entries.length === 0) {
      return {
        history: [],
        stats: {
          totalRuns: 0,
          successfulRuns: 0,
          failedRuns: 0,
          successRate: 0,
          totalProcessed: 0,
          totalSkipped: 0,
          meanDurationMs: 0,
          lastRunAt: null,
          lastRunOk: null,
        },
      };
    }
    let successful = 0;
    let totalProcessed = 0;
    let totalSkipped = 0;
    let totalDuration = 0;
    for (const e of entries) {
      if (e.ok) successful++;
      totalProcessed += e.processed;
      totalSkipped += e.skipped;
      totalDuration += e.durationMs;
    }
    const last = entries[entries.length - 1];
    return {
      history: entries,
      stats: {
        totalRuns: entries.length,
        successfulRuns: successful,
        failedRuns: entries.length - successful,
        successRate: Number((successful / entries.length).toFixed(4)),
        totalProcessed,
        totalSkipped,
        meanDurationMs: Number((totalDuration / entries.length).toFixed(2)),
        lastRunAt: last.ts,
        lastRunOk: last.ok,
      },
    };
  }

  it("renderRecentRuns shows empty-state message when history is empty", () => {
    const text = renderer.renderRecentRuns(makePayload([])).join("\n");
    expect(text).toContain("## Recent credit-assignment runs");
    expect(text).toContain("_No recorded runs yet");
    // No table header should be emitted in empty state.
    expect(text).not.toContain("| Timestamp |");
  });

  it("renderRecentRuns emits table rows + stats summary line for populated history", () => {
    const payload = makePayload([
      makeEntry({ ts: "2026-05-05T15:00:00.000Z", processed: 10, skipped: 1, durationMs: 100, cursorOffset: 1000, ok: true }),
      makeEntry({ ts: "2026-05-05T16:00:00.000Z", processed: 20, skipped: 0, durationMs: 50, cursorOffset: 3000, ok: false }),
    ]);
    const text = renderer.renderRecentRuns(payload).join("\n");
    expect(text).toContain("| Timestamp | OK | Processed | Skipped | Duration (ms) | Cursor |");
    expect(text).toContain("| 2026-05-05T15:00:00.000Z | ✓ | 10 | 1 | 100 | 1000 |");
    expect(text).toContain("| 2026-05-05T16:00:00.000Z | ✗ | 20 | 0 | 50 | 3000 |");
    // Stats line: 2 runs, 1 ok, 1 failed (50.0%), processed=30, skipped=1, mean=75ms
    expect(text).toContain("2 runs");
    expect(text).toContain("1 ok / 1 failed (50.0%)");
    expect(text).toContain("processed=30");
    expect(text).toContain("skipped=1");
    expect(text).toContain("mean=75ms");
  });

  it("renderRecentRuns caps rows at limit and reports truncation", () => {
    const entries = Array.from({ length: 25 }, (_, i) =>
      makeEntry({ ts: `2026-05-05T${String(i % 24).padStart(2, "0")}:00:00.000Z`, processed: i, cursorOffset: i * 100 }),
    );
    const text = renderer.renderRecentRuns(makePayload(entries), 5).join("\n");
    const dataRows = text.split("\n").filter((l) => l.startsWith("| 2026-"));
    expect(dataRows).toHaveLength(5);
    // Tail-slice: last 5 entries (indices 20..24) shown — cursorOffsets 2000..2400.
    expect(dataRows[0]).toContain("| 2000 |");
    expect(dataRows[4]).toContain("| 2400 |");
    expect(text).toContain("…and 20 earlier runs not shown (limit=5)");
  });

  it("render with showRunLog=false suppresses the recent-runs section even if runLog supplied", () => {
    const payload = makePayload([makeEntry()]);
    const md = renderer.render(makeDashboard(), { runLog: payload, showRunLog: false });
    expect(md).not.toContain("## Recent credit-assignment runs");
  });

  it("renderRecentRuns preserves input ordering (oldest → newest tail)", () => {
    const entries = [
      makeEntry({ ts: "2026-05-05T10:00:00.000Z", cursorOffset: 100 }),
      makeEntry({ ts: "2026-05-05T11:00:00.000Z", cursorOffset: 200 }),
      makeEntry({ ts: "2026-05-05T12:00:00.000Z", cursorOffset: 300 }),
    ];
    const text = renderer.renderRecentRuns(makePayload(entries)).join("\n");
    const idx10 = text.indexOf("2026-05-05T10:00:00.000Z");
    const idx11 = text.indexOf("2026-05-05T11:00:00.000Z");
    const idx12 = text.indexOf("2026-05-05T12:00:00.000Z");
    expect(idx10).toBeGreaterThan(-1);
    expect(idx11).toBeGreaterThan(idx10);
    expect(idx12).toBeGreaterThan(idx11);
  });

  it("render appends recent-runs section after trend when runLog provided (default showRunLog=true)", () => {
    const md = renderer.render(makeDashboard(), { runLog: makePayload([makeEntry()]) });
    const trendIdx = md.indexOf("## Recent feed trend");
    const runsIdx = md.indexOf("## Recent credit-assignment runs");
    expect(trendIdx).toBeGreaterThan(-1);
    expect(runsIdx).toBeGreaterThan(trendIdx);
  });

  // ---- recent-drift-alerts (U-CONSENSUS-DRIFT-DASHBOARD-SECTION) ----

  function makeAlert(overrides: Partial<AlertEntry> = {}): AlertEntry {
    return {
      schema_version: "1.0.0",
      ts: "2026-05-05T18:00:00.000Z",
      kind: "alert",
      vendor: "anthropic",
      taskType: "plan",
      severity: "severe",
      emaBefore: 0.85,
      emaAfter: 0.45,
      delta: -0.40,
      nBefore: 30,
      nAfter: 32,
      ...overrides,
    };
  }

  function makeDriftPayload(alerts: AlertEntry[], overrides: Partial<DriftAlertPayload["stats"]> = {}): DriftAlertPayload {
    const onlyAlerts = alerts.filter((a) => a.kind === "alert");
    const summaries = alerts.filter((a) => a.kind === "summary");
    const bySeverity: Record<string, number> = { minor: 0, moderate: 0, severe: 0 };
    const byVendor: Record<string, number> = {};
    for (const a of onlyAlerts) {
      if (a.severity) bySeverity[a.severity] = (bySeverity[a.severity] ?? 0) + 1;
      if (a.vendor) byVendor[a.vendor] = (byVendor[a.vendor] ?? 0) + 1;
    }
    return {
      alerts,
      stats: {
        totalAlerts: onlyAlerts.length,
        totalSummaries: summaries.length,
        bySeverity,
        byVendor,
        earliestTs: alerts.length > 0 ? alerts[0].ts : null,
        latestTs: alerts.length > 0 ? alerts[alerts.length - 1].ts : null,
        ...overrides,
      },
    };
  }

  it("renderDriftAlerts shows 'no checks' message when ledger entirely empty", () => {
    const text = renderer.renderDriftAlerts(makeDriftPayload([])).join("\n");
    expect(text).toContain("## Recent drift alerts");
    expect(text).toContain("Drift ledger empty");
    expect(text).not.toContain("| Timestamp |");
  });

  it("renderDriftAlerts shows 'no actionable regressions' when summaries exist but no alerts", () => {
    const summaryOnly: AlertEntry[] = [
      { schema_version: "1.0.0", ts: "2026-05-05T18:00:00.000Z", kind: "summary", run_id: "r1", total_actionable: 0 },
      { schema_version: "1.0.0", ts: "2026-05-05T19:00:00.000Z", kind: "summary", run_id: "r2", total_actionable: 0 },
    ];
    const text = renderer.renderDriftAlerts(makeDriftPayload(summaryOnly)).join("\n");
    expect(text).toContain("2 drift checks recorded");
    expect(text).toContain("no actionable regressions");
    expect(text).not.toContain("| Timestamp |");
  });

  it("renderDriftAlerts emits table rows + stats summary for actionable alerts", () => {
    const alerts: AlertEntry[] = [
      makeAlert({ vendor: "anthropic", taskType: "plan", severity: "severe", delta: -0.40, emaBefore: 0.85, emaAfter: 0.45, nAfter: 32 }),
      makeAlert({ ts: "2026-05-05T19:00:00.000Z", vendor: "openai", taskType: "decide", severity: "moderate", delta: -0.18, emaBefore: 0.80, emaAfter: 0.62, nAfter: 50 }),
    ];
    const text = renderer.renderDriftAlerts(makeDriftPayload(alerts)).join("\n");
    expect(text).toContain("| Timestamp | Severity | Vendor | Task | Δ EMA | Before → After | n |");
    expect(text).toContain("severe");
    expect(text).toContain("anthropic");
    expect(text).toContain("0.850 → 0.450");
    expect(text).toContain("-0.400");
    expect(text).toContain("openai");
    expect(text).toContain("0.800 → 0.620");
    expect(text).toContain("Stats: 2 alerts");
    expect(text).toContain("severe=1");
    expect(text).toContain("moderate=1");
    expect(text).toContain("anthropic=1");
    expect(text).toContain("openai=1");
  });

  it("renderDriftAlerts caps rows at limit and reports truncation", () => {
    const alerts = Array.from({ length: 25 }, (_, i) =>
      makeAlert({
        ts: `2026-05-05T${String(i % 24).padStart(2, "0")}:00:00.000Z`,
        vendor: `vendor_${i}`,
        delta: -0.40 - i * 0.001,
      }),
    );
    const text = renderer.renderDriftAlerts(makeDriftPayload(alerts), 5).join("\n");
    // Data rows start with "| 2026-" (ISO timestamp); stats footer starts with "_".
    const dataRows = text.split("\n").filter((l) => l.startsWith("| 2026-"));
    expect(dataRows).toHaveLength(5);
    // Tail-slice: last 5 alerts (indices 20..24).
    expect(dataRows[0]).toContain("vendor_20");
    expect(dataRows[4]).toContain("vendor_24");
    expect(text).toContain("…and 20 earlier alerts not shown (limit=5)");
  });

  it("renderDriftAlerts skips summary entries from the rendered table (alerts only)", () => {
    const mixed: AlertEntry[] = [
      makeAlert({ vendor: "anthropic", severity: "severe", delta: -0.40 }),
      { schema_version: "1.0.0", ts: "2026-05-05T18:00:01.000Z", kind: "summary", run_id: "r1", total_actionable: 1 },
      makeAlert({ ts: "2026-05-05T19:00:00.000Z", vendor: "openai", severity: "moderate", delta: -0.18 }),
    ];
    const text = renderer.renderDriftAlerts(makeDriftPayload(mixed)).join("\n");
    // Two alert rows in the table; summary line shouldn't appear with run_id.
    expect(text).not.toContain("run_id");
    const rowCount = text.split("\n").filter((l) => l.includes("severe") || l.includes("moderate")).length;
    expect(rowCount).toBeGreaterThanOrEqual(2);
  });

  it("render with showDriftAlerts=false suppresses section even if driftAlerts payload supplied", () => {
    const md = renderer.render(makeDashboard(), {
      driftAlerts: makeDriftPayload([makeAlert()]),
      showDriftAlerts: false,
    });
    expect(md).not.toContain("## Recent drift alerts");
  });

  it("render appends drift-alerts section after run-log when both supplied", () => {
    const md = renderer.render(makeDashboard(), {
      runLog: makePayload([makeEntry()]),
      driftAlerts: makeDriftPayload([makeAlert()]),
    });
    const runsIdx = md.indexOf("## Recent credit-assignment runs");
    const alertsIdx = md.indexOf("## Recent drift alerts");
    expect(runsIdx).toBeGreaterThan(-1);
    expect(alertsIdx).toBeGreaterThan(runsIdx);
  });
});
