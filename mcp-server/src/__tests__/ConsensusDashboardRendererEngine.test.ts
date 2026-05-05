/**
 * ConsensusDashboardRendererEngine — INTEL-OLLAMA-OBSIDIAN-MS0/U-CONSENSUS-DASHBOARD-CLI.
 *
 * Verifies the markdown renderer for consensus dashboard payloads:
 * header, per-task tables, suggested probes, recent trend, plus the
 * empty-state and probe-limit edge cases.
 */
import { describe, it, expect } from "vitest";
import { ConsensusDashboardRendererEngine } from "../engines/ConsensusDashboardRendererEngine.js";
import type { Dashboard } from "../engines/ConsensusPerformanceDashboardEngine.js";

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
});
