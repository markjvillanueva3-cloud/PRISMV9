/**
 * CADRegressionReportGeneratorEngine — U-CINF11 (CAD-INFRA-MS0)
 *
 * Pure rendering layer. Takes structured outputs from CINF08 (DashboardSnapshot)
 * and CINF10 (DiffReport, TrendReport, HotspotReport) and emits Markdown OR
 * HTML (snapshot/diff/trend/hotspots/summary) suitable for docs, GitHub
 * comments, PR bodies, runbook attachments, and stakeholder PDF export
 * (printable HTML — browser "Print → Save as PDF" handles the binary, no
 * headless-browser/PDF dependency added).
 *
 * No FS, no network, no state. Each render_* helper is a pure string function.
 * The engine wraps them in the BaseEngine envelope for dispatcher consumption.
 *
 * The inline `mdToInlineHtml` converter handles ONLY the constrained markdown
 * shape this engine itself produces (h1/h2 headings, GFM tables, bullet lists,
 * inline code, **strong**, `---` hr). It is NOT a general-purpose markdown
 * parser — that lives in scripts/lib/html-report-render.mjs (cross-tree, not
 * importable from the engine-layer per src/tools/.claude/CLAUDE.md). Keeping
 * this converter private + specialized is the dedup-safe boundary.
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

// ── Inline md → html converter (private; handles only this engine's markdown shape) ─

const HTML_ESCAPE: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => HTML_ESCAPE[c] ?? c);
}

/** Apply inline markdown to already-escaped text: `code`, **strong**, _em_. */
function inlineMd(escaped: string): string {
  // Inline code first (so its content isn't bold/italic-processed).
  let out = escaped.replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`);
  // **strong** — non-greedy.
  out = out.replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>");
  // _emphasis_ — non-greedy, single-line.
  out = out.replace(/(^|[\s(])_([^_\n]+)_(?=[\s).,;:!?]|$)/g, "$1<em>$2</em>");
  return out;
}

/** Detect a GFM-table separator row: `| --- | :---: |` etc. */
function isTableSeparator(line: string): boolean {
  if (!line.startsWith("|")) return false;
  const cells = line
    .slice(1, line.endsWith("|") ? -1 : undefined)
    .split("|")
    .map((c) => c.trim());
  if (cells.length === 0) return false;
  return cells.every((c) => /^:?-{1,}:?$/.test(c));
}

function splitRow(line: string): string[] {
  const trimmed = line.startsWith("|") ? line.slice(1) : line;
  const tail = trimmed.endsWith("|") ? trimmed.slice(0, -1) : trimmed;
  return tail.split("|").map((c) => c.trim());
}

/**
 * Convert this engine's markdown output to an HTML fragment.
 *
 * Recognized constructs (the set this engine actually emits):
 *   - `# H1` → `<h1>`, `## H2` → `<h2>`
 *   - GFM tables (header row + separator + body rows)
 *   - `- ` bullet lists (single-level)
 *   - `---` thematic break → `<hr>`
 *   - inline code, **strong**, _italic_
 *   - blank line → paragraph break
 *   - `_italic standalone notice_` paragraph (used by empty-state markers)
 *
 * Everything else is rendered as an HTML-escaped paragraph. Idempotent for
 * well-formed input; degrades gracefully (never throws) on partial input.
 */
export function mdToInlineHtml(md: string): string {
  if (typeof md !== "string" || md.length === 0) return "";
  const lines = md.split(/\r?\n/);
  const out: string[] = [];
  let i = 0;
  let listOpen = false;
  let paragraphBuf: string[] = [];

  const flushParagraph = (): void => {
    if (paragraphBuf.length === 0) return;
    const joined = paragraphBuf.join(" ").trim();
    paragraphBuf = [];
    if (joined.length === 0) return;
    out.push(`<p>${inlineMd(escapeHtml(joined))}</p>`);
  };
  const closeList = (): void => {
    if (listOpen) {
      out.push("</ul>");
      listOpen = false;
    }
  };

  while (i < lines.length) {
    const line = lines[i];
    const trimmed = line.trim();

    // Blank line — paragraph / list break.
    if (trimmed.length === 0) {
      flushParagraph();
      closeList();
      i += 1;
      continue;
    }

    // Headings (## first so it doesn't match `# ` prefix-greedy).
    if (/^##\s+/.test(trimmed)) {
      flushParagraph();
      closeList();
      out.push(`<h2>${inlineMd(escapeHtml(trimmed.replace(/^##\s+/, "")))}</h2>`);
      i += 1;
      continue;
    }
    if (/^#\s+/.test(trimmed)) {
      flushParagraph();
      closeList();
      out.push(`<h1>${inlineMd(escapeHtml(trimmed.replace(/^#\s+/, "")))}</h1>`);
      i += 1;
      continue;
    }

    // Thematic break (---).
    if (trimmed === "---") {
      flushParagraph();
      closeList();
      out.push("<hr>");
      i += 1;
      continue;
    }

    // GFM table — header row followed by separator.
    if (trimmed.startsWith("|") && i + 1 < lines.length && isTableSeparator(lines[i + 1].trim())) {
      flushParagraph();
      closeList();
      const headerCells = splitRow(trimmed);
      const bodyRows: string[][] = [];
      let j = i + 2;
      while (j < lines.length && lines[j].trim().startsWith("|")) {
        bodyRows.push(splitRow(lines[j].trim()));
        j += 1;
      }
      out.push("<table>");
      out.push("<thead><tr>");
      for (const h of headerCells) out.push(`<th>${inlineMd(escapeHtml(h))}</th>`);
      out.push("</tr></thead>");
      out.push("<tbody>");
      for (const row of bodyRows) {
        out.push("<tr>");
        for (const cell of row) out.push(`<td>${inlineMd(escapeHtml(cell))}</td>`);
        out.push("</tr>");
      }
      out.push("</tbody></table>");
      i = j;
      continue;
    }

    // Bullet list (single-level — the only shape this engine emits).
    if (/^-\s+/.test(trimmed)) {
      flushParagraph();
      if (!listOpen) {
        out.push("<ul>");
        listOpen = true;
      }
      const item = trimmed.replace(/^-\s+/, "");
      out.push(`<li>${inlineMd(escapeHtml(item))}</li>`);
      i += 1;
      continue;
    }

    // Default — accumulate paragraph buffer.
    closeList();
    paragraphBuf.push(trimmed);
    i += 1;
  }
  flushParagraph();
  closeList();
  return out.join("\n");
}

/** Print-CSS embedded so PDF-via-browser works air-gapped. Stable across calls. */
const PRINTABLE_CSS = `
:root { color-scheme: light; }
* { box-sizing: border-box; }
body { font-family: -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; margin: 24px; color: #222; line-height: 1.5; }
h1 { font-size: 22px; margin: 18px 0 10px; border-bottom: 2px solid #444; padding-bottom: 4px; }
h2 { font-size: 17px; margin: 16px 0 8px; color: #333; }
table { border-collapse: collapse; margin: 8px 0 16px; width: 100%; font-size: 13px; }
th, td { border: 1px solid #bbb; padding: 6px 10px; text-align: left; vertical-align: top; }
th { background: #eee; font-weight: 600; }
tbody tr:nth-child(even) { background: #f7f7f7; }
code { font-family: "SFMono-Regular", Consolas, "Liberation Mono", monospace; background: #f0f0f0; padding: 1px 5px; border-radius: 3px; font-size: 12px; }
ul { margin: 6px 0 12px 18px; padding: 0; }
li { margin-bottom: 2px; }
hr { border: 0; border-top: 1px solid #999; margin: 16px 0; }
p { margin: 6px 0; }
em { color: #555; }
.diff-images { margin: 12px 0; padding: 8px; border: 1px dashed #888; color: #666; font-style: italic; font-size: 12px; }
@media print {
  body { margin: 12mm; }
  h1 { page-break-after: avoid; }
  h2 { page-break-after: avoid; }
  table, tr, td, th { page-break-inside: avoid; }
}
`.trim();

/**
 * Wrap an HTML fragment in a standalone, printable HTML5 document.
 *
 * Self-contained: CSS is embedded inline (no external sheet), so the file
 * works air-gapped and renders identically under Chrome's "Print → Save as
 * PDF" dialog. Title defaults to "CAD Regression Report" and is HTML-escaped.
 */
export function wrapPrintableHtml(fragment: string, title?: string): string {
  const t = escapeHtml(title?.trim() || "CAD Regression Report");
  return [
    "<!DOCTYPE html>",
    '<html lang="en">',
    "<head>",
    '<meta charset="UTF-8">',
    '<meta name="viewport" content="width=device-width, initial-scale=1">',
    `<title>${t}</title>`,
    `<style>${PRINTABLE_CSS}</style>`,
    "</head>",
    "<body>",
    fragment,
    "</body>",
    "</html>",
  ].join("\n");
}

/** HTML renderer — snapshot. `printable` true → standalone HTML5 doc. */
export function renderSnapshotHtml(snap: DashboardSnapshot, printable = false): string {
  const fragment = mdToInlineHtml(renderSnapshot(snap));
  return printable ? wrapPrintableHtml(fragment, `Snapshot — Batch ${shortId(snap.batchId)}`) : fragment;
}

/** HTML renderer — diff. */
export function renderDiffHtml(diff: DiffReport, rowLimit = 50, printable = false): string {
  const fragment = mdToInlineHtml(renderDiff(diff, rowLimit));
  return printable
    ? wrapPrintableHtml(fragment, `Diff — ${shortId(diff.baseBatchId)} → ${shortId(diff.candidateBatchId)}`)
    : fragment;
}

/** HTML renderer — trend. */
export function renderTrendHtml(trend: TrendReport, printable = false): string {
  const fragment = mdToInlineHtml(renderTrend(trend));
  return printable ? wrapPrintableHtml(fragment, "Trend Report") : fragment;
}

/** HTML renderer — hotspots. */
export function renderHotspotsHtml(report: HotspotReport, printable = false): string {
  const fragment = mdToInlineHtml(renderHotspots(report));
  return printable ? wrapPrintableHtml(fragment, "Hotspot Report") : fragment;
}

/** HTML renderer — combined summary (stakeholder PDF target). */
export function renderSummaryHtml(parts: {
  snapshot?: DashboardSnapshot;
  diff?: DiffReport;
  trend?: TrendReport;
  hotspots?: HotspotReport;
  rowLimit?: number;
  printable?: boolean;
}): string {
  const fragment = mdToInlineHtml(renderSummary(parts));
  return parts.printable ? wrapPrintableHtml(fragment, "CAD Regression — Executive Summary") : fragment;
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
type RenderSnapshotHtmlOp = {
  op: "renderSnapshotHtml";
  snapshot: DashboardSnapshot;
  printable?: boolean;
};
type RenderDiffHtmlOp = {
  op: "renderDiffHtml";
  diff: DiffReport;
  rowLimit?: number;
  printable?: boolean;
};
type RenderTrendHtmlOp = {
  op: "renderTrendHtml";
  trend: TrendReport;
  printable?: boolean;
};
type RenderHotspotsHtmlOp = {
  op: "renderHotspotsHtml";
  hotspots: HotspotReport;
  printable?: boolean;
};
type RenderSummaryHtmlOp = {
  op: "renderSummaryHtml";
  snapshot?: DashboardSnapshot;
  diff?: DiffReport;
  trend?: TrendReport;
  hotspots?: HotspotReport;
  rowLimit?: number;
  printable?: boolean;
};
type ReportOp =
  | RenderSnapshotOp
  | RenderDiffOp
  | RenderTrendOp
  | RenderHotspotsOp
  | RenderSummaryOp
  | RenderSnapshotHtmlOp
  | RenderDiffHtmlOp
  | RenderTrendHtmlOp
  | RenderHotspotsHtmlOp
  | RenderSummaryHtmlOp;

// ── Engine class ──────────────────────────────────────────────────────────────

const VALID_OPS = new Set<ReportOp["op"]>([
  "renderSnapshot",
  "renderDiff",
  "renderTrend",
  "renderHotspots",
  "renderSummary",
  "renderSnapshotHtml",
  "renderDiffHtml",
  "renderTrendHtml",
  "renderHotspotsHtml",
  "renderSummaryHtml",
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
      {
        name: "renderSnapshotHtml",
        description: "Render a DashboardSnapshot as an HTML fragment (or printable HTML5 doc).",
        actions: ["cad_regression_report_snapshot_html"],
      },
      {
        name: "renderDiffHtml",
        description: "Render a DiffReport as an HTML fragment (or printable HTML5 doc).",
        actions: ["cad_regression_report_diff_html"],
      },
      {
        name: "renderTrendHtml",
        description: "Render a TrendReport as an HTML fragment (or printable HTML5 doc).",
        actions: ["cad_regression_report_trend_html"],
      },
      {
        name: "renderHotspotsHtml",
        description: "Render a HotspotReport as an HTML fragment (or printable HTML5 doc).",
        actions: ["cad_regression_report_hotspots_html"],
      },
      {
        name: "renderSummaryHtml",
        description: "Combine snapshot/diff/trend/hotspots into one HTML document — printable=true emits a standalone PDF-ready HTML5 page (browser Print → Save as PDF; air-gapped, no external deps).",
        actions: ["cad_regression_report_summary_html"],
      },
    ];
  }

  validate(input: unknown): string | null {
    if (!input || typeof input !== "object") return "input must be an object";
    const op = (input as { op?: string }).op as ReportOp["op"] | undefined;
    if (!op || !VALID_OPS.has(op)) {
      return "op must be one of: renderSnapshot | renderDiff | renderTrend | renderHotspots | renderSummary | renderSnapshotHtml | renderDiffHtml | renderTrendHtml | renderHotspotsHtml | renderSummaryHtml";
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
      case "renderSnapshotHtml":
        if (!i.snapshot) throw new Error("renderSnapshotHtml requires 'snapshot'");
        return { html: renderSnapshotHtml(i.snapshot, i.printable === true) };
      case "renderDiffHtml":
        if (!i.diff) throw new Error("renderDiffHtml requires 'diff'");
        return { html: renderDiffHtml(i.diff, i.rowLimit, i.printable === true) };
      case "renderTrendHtml":
        if (!i.trend) throw new Error("renderTrendHtml requires 'trend'");
        return { html: renderTrendHtml(i.trend, i.printable === true) };
      case "renderHotspotsHtml":
        if (!i.hotspots) throw new Error("renderHotspotsHtml requires 'hotspots'");
        return { html: renderHotspotsHtml(i.hotspots, i.printable === true) };
      case "renderSummaryHtml":
        return { html: renderSummaryHtml(i) };
    }
  }
}

export const cadRegressionReportGeneratorEngine =
  new CADRegressionReportGeneratorEngine();
