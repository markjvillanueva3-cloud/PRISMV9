/**
 * CADRegressionReportGeneratorEngine — U-CINF11 (CAD-INFRA-MS0)
 *
 * Pure rendering layer. Takes structured outputs from CINF08 (DashboardSnapshot)
 * and CINF10 (DiffReport, TrendReport, HotspotReport) and emits Markdown
 * suitable for docs, GitHub comments, PR bodies, and runbook attachments.
 *
 * No FS, no network, no state. Each render_* helper is a pure string function.
 * The engine wraps them in the BaseEngine envelope for dispatcher consumption.
 *
 * Duplication guard: this is distinct from HyperMillReportGeneratorEngine,
 * SetupSheetRenderer, DailyFlashReportEngine, etc. — all of those render their
 * own domain content; none consume cad-regression-tests shapes.
 *
 * @module engines/CADRegressionReportGeneratorEngine
 */

import { BaseEngine } from "./BaseEngine.js";
import type { EngineCapability, EngineInfo } from "./IEngine.js";
import type {
  DashboardSnapshot,
} from "./CADRegressionDashboardEngine.js";
import type {
  DiffReport,
  TrendReport,
  HotspotReport,
  FileTransition,
} from "./CADRegressionResultsAnalyzerEngine.js";

// ── Pure renderers ────────────────────────────────────────────────────────────

function pct(n: number): string {
  if (!Number.isFinite(n)) return "—";
  return `${(n * 100).toFixed(1)}%`;
}

function num(n: number | null | undefined, digits = 2): string {
  if (n == null || !Number.isFinite(n)) return "—";
  return n.toFixed(digits);
}

function ms(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—";
  if (n < 1000) return `${Math.round(n)} ms`;
  if (n < 60_000) return `${(n / 1000).toFixed(1)} s`;
  const mins = Math.floor(n / 60_000);
  const secs = Math.round((n % 60_000) / 1000);
  return `${mins}m ${secs}s`;
}

function iso(s: string | null | undefined): string {
  if (!s) return "—";
  return s;
}

function shortId(id: string): string {
  return id.slice(0, 8);
}

/** Render a table row of fileId | baseStatus | candidateStatus for a transition list. */
function transitionRows(rows: FileTransition[], limit: number): string[] {
  const truncated = rows.slice(0, limit);
  const lines = truncated.map(
    (t) =>
      `| \`${t.fileId}\` | ${t.baseStatus ?? "—"} | ${t.candidateStatus ?? "—"} |`,
  );
  if (rows.length > limit) {
    lines.push(`| _…and ${rows.length - limit} more_ | | |`);
  }
  return lines;
}

export function renderSnapshot(snap: DashboardSnapshot): string {
  const lines: string[] = [];
  lines.push(`# CAD Regression — Batch \`${shortId(snap.batchId)}\``);
  lines.push("");
  lines.push(`- **Lifecycle**: ${snap.lifecycle}`);
  lines.push(`- **Progress**: ${snap.pctComplete}%`);
  lines.push(`- **Last checkpoint**: ${iso(snap.lastCheckpoint)}`);
  lines.push(`- **Snapshot at**: ${iso(snap.snapshotAt)}`);
  lines.push("");
  lines.push("## Counts");
  lines.push("");
  lines.push("| Status | Count |");
  lines.push("| ------ | ----- |");
  const c = snap.counts as unknown as Record<string, number>;
  const countKeys = [
    "total",
    "pending",
    "running",
    "passed",
    "failed",
    "skipped",
    "errored",
  ];
  for (const k of countKeys) {
    if (c[k] != null) lines.push(`| ${k} | ${c[k]} |`);
  }
  lines.push("");
  lines.push("## Error breakdown");
  lines.push("");
  lines.push("| Type | Count |");
  lines.push("| ---- | ----- |");
  for (const [k, v] of Object.entries(snap.errorBreakdown)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");
  lines.push("## Throughput");
  lines.push("");
  lines.push(`- Average terminal duration: ${ms(snap.throughput.avgTerminalDurationMs)}`);
  lines.push(
    `- Files per minute (${snap.throughput.windowMinutes}-min window): ${num(snap.throughput.filesPerMinute)}`,
  );
  lines.push(`- Windowed completions: ${snap.throughput.windowedCompletedCount}`);
  lines.push(`- Estimated remaining: ${ms(snap.throughput.etaMs)}`);
  lines.push("");
  if (snap.recentFailures.length > 0) {
    lines.push(`## Recent failures (${snap.recentFailures.length})`);
    lines.push("");
    lines.push("| File | Status | Error type | Retries | Duration | Completed |");
    lines.push("| ---- | ------ | ---------- | ------- | -------- | --------- |");
    for (const f of snap.recentFailures) {
      lines.push(
        `| \`${f.fileId}\` | ${f.status} | ${f.errorType} | ${f.retries} | ${ms(f.durationMs)} | ${iso(f.completedAt)} |`,
      );
    }
  } else {
    lines.push("_No recent failures._");
  }
  lines.push("");
  return lines.join("\n");
}

export function renderDiff(diff: DiffReport, rowLimit = 50): string {
  const lines: string[] = [];
  lines.push(`# CAD Regression — Diff`);
  lines.push("");
  lines.push(`- **Base**: \`${shortId(diff.baseBatchId)}\``);
  lines.push(`- **Candidate**: \`${shortId(diff.candidateBatchId)}\``);
  lines.push("");
  lines.push("## Summary");
  lines.push("");
  lines.push("| Class | Count |");
  lines.push("| ----- | ----- |");
  for (const [k, v] of Object.entries(diff.totals)) {
    lines.push(`| ${k} | ${v} |`);
  }
  lines.push("");

  const sections: Array<[string, FileTransition[]]> = [
    ["Regressions (pass → fail/error)", diff.regressions],
    ["Recoveries (fail/error → pass)", diff.recoveries],
    ["New files", diff.newFiles],
    ["Removed files", diff.removedFiles],
  ];
  for (const [title, rows] of sections) {
    if (rows.length === 0) continue;
    lines.push(`## ${title} (${rows.length})`);
    lines.push("");
    lines.push("| File | Base | Candidate |");
    lines.push("| ---- | ---- | --------- |");
    for (const line of transitionRows(rows, rowLimit)) lines.push(line);
    lines.push("");
  }
  return lines.join("\n");
}

export function renderTrend(trend: TrendReport): string {
  const lines: string[] = [];
  lines.push(`# CAD Regression — Trend`);
  lines.push("");
  if (trend.series.length === 0) {
    lines.push("_No data._");
    return lines.join("\n");
  }
  lines.push(
    `Series length: **${trend.series.length}** · Delta pass rate: **${
      trend.deltaPassRate == null ? "—" : pct(trend.deltaPassRate)
    }**`,
  );
  lines.push("");
  lines.push("| Batch | Last checkpoint | Passed | Failed | Pass rate |");
  lines.push("| ----- | --------------- | ------ | ------ | --------- |");
  for (const p of trend.series) {
    lines.push(
      `| \`${shortId(p.batchId)}\` | ${iso(p.lastCheckpoint)} | ${p.passed} | ${p.failed} | ${pct(p.passRate)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

export function renderHotspots(report: HotspotReport): string {
  const lines: string[] = [];
  lines.push(`# CAD Regression — Hotspots`);
  lines.push("");
  lines.push(
    `Analyzed **${report.analyzedBatches}** batches · threshold **${pct(report.threshold)}** · minAppearances **${report.minAppearances}**`,
  );
  lines.push("");
  if (report.hotspots.length === 0) {
    lines.push("_No hotspots detected._");
    return lines.join("\n");
  }
  lines.push("| File | Appearances | Failures | Rate | Last failed |");
  lines.push("| ---- | ----------- | -------- | ---- | ----------- |");
  for (const h of report.hotspots) {
    lines.push(
      `| \`${h.fileId}\` | ${h.appearances} | ${h.failures} | ${pct(h.failureRate)} | ${iso(h.lastFailedAt)} |`,
    );
  }
  lines.push("");
  return lines.join("\n");
}

/**
 * Render a combined summary. Each section is appended with a blank line
 * separator. Empty inputs are simply omitted.
 */
export function renderSummary(parts: {
  snapshot?: DashboardSnapshot;
  diff?: DiffReport;
  trend?: TrendReport;
  hotspots?: HotspotReport;
  rowLimit?: number;
}): string {
  const sections: string[] = [];
  if (parts.snapshot) sections.push(renderSnapshot(parts.snapshot));
  if (parts.diff) sections.push(renderDiff(parts.diff, parts.rowLimit));
  if (parts.trend) sections.push(renderTrend(parts.trend));
  if (parts.hotspots) sections.push(renderHotspots(parts.hotspots));
  return sections.join("\n---\n\n");
}

// ── Op types ──────────────────────────────────────────────────────────────────

type RenderSnapshotOp = { op: "renderSnapshot"; snapshot: DashboardSnapshot };
type RenderDiffOp = { op: "renderDiff"; diff: DiffReport; rowLimit?: number };
type RenderTrendOp = { op: "renderTrend"; trend: TrendReport };
type RenderHotspotsOp = { op: "renderHotspots"; hotspots: HotspotReport };
type RenderSummaryOp = {
  op: "renderSummary";
  snapshot?: DashboardSnapshot;
  diff?: DiffReport;
  trend?: TrendReport;
  hotspots?: HotspotReport;
  rowLimit?: number;
};
type ReportOp =
  | RenderSnapshotOp
  | RenderDiffOp
  | RenderTrendOp
  | RenderHotspotsOp
  | RenderSummaryOp;

// ── Engine class ──────────────────────────────────────────────────────────────

const VALID_OPS = new Set<ReportOp["op"]>([
  "renderSnapshot",
  "renderDiff",
  "renderTrend",
  "renderHotspots",
  "renderSummary",
]);

export class CADRegressionReportGeneratorEngine extends BaseEngine {
  constructor() {
    const info: EngineInfo = {
      name: "CADRegressionReportGeneratorEngine",
      version: "1.0.0",
      domain: "cad_infrastructure",
      description:
        "Pure Markdown renderer for CAD regression snapshots, diffs, trend series, and hotspots.",
    };
    super(info);
  }

  getCapabilities(): EngineCapability[] {
    return [
      {
        name: "renderSnapshot",
        description: "Render a DashboardSnapshot as Markdown (counts, error breakdown, throughput, recent failures).",
        actions: ["cad_regression_report_snapshot"],
      },
      {
        name: "renderDiff",
        description: "Render a DiffReport as Markdown (regressions, recoveries, new, removed).",
        actions: ["cad_regression_report_diff"],
      },
      {
        name: "renderTrend",
        description: "Render a TrendReport as Markdown (pass-rate series + delta).",
        actions: ["cad_regression_report_trend"],
      },
      {
        name: "renderHotspots",
        description: "Render a HotspotReport as Markdown (files failing in >= threshold fraction of batches).",
        actions: ["cad_regression_report_hotspots"],
      },
      {
        name: "renderSummary",
        description: "Combine any of snapshot/diff/trend/hotspots into a single Markdown document.",
        actions: ["cad_regression_report_summary"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    const op = (input as { op?: string }).op as ReportOp["op"] | undefined;
    if (!op || !VALID_OPS.has(op)) {
      return "op must be one of: renderSnapshot | renderDiff | renderTrend | renderHotspots | renderSummary";
    }
    return null;
  }

  protected async executeImpl(input: unknown): Promise<unknown> {
    const i = input as ReportOp;
    switch (i.op) {
      case "renderSnapshot":
        if (!i.snapshot) throw new Error("renderSnapshot requires 'snapshot'");
        return { markdown: renderSnapshot(i.snapshot) };
      case "renderDiff":
        if (!i.diff) throw new Error("renderDiff requires 'diff'");
        return { markdown: renderDiff(i.diff, i.rowLimit) };
      case "renderTrend":
        if (!i.trend) throw new Error("renderTrend requires 'trend'");
        return { markdown: renderTrend(i.trend) };
      case "renderHotspots":
        if (!i.hotspots) throw new Error("renderHotspots requires 'hotspots'");
        return { markdown: renderHotspots(i.hotspots) };
      case "renderSummary":
        return { markdown: renderSummary(i) };
    }
  }
}

export const cadRegressionReportGeneratorEngine =
  new CADRegressionReportGeneratorEngine();
