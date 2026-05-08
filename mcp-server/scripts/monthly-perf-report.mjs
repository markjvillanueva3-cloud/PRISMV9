#!/usr/bin/env node
/**
 * monthly-perf-report.mjs
 *
 * OBSIDIAN-AUTOMATE-MS3/U-PERF-REPORT-CRON
 *
 * Monthly cron entry point that invokes PerformanceLoopEngine.monthlyReport()
 * and writes a markdown rendering of the article's four feedback questions to
 * `knowledge/memories/inbox/perf-report-YYYY-MM.md`.
 *
 * Article (cyrilXBT JARVIS):
 *   "Every shipped piece feeds back; the vault learns what your audience
 *    actually responds to."
 *
 * Q1 — Which topics drove the most bookmarks per impression
 * Q2 — Which hook formats outperformed their topic average
 * Q3 — Three content angles best posts suggest I have not tried yet
 * Q4 — Which topic+format combinations to double down on this month
 *
 * Flags:
 *   --dry-run                  print to stdout, do not write
 *   --published-dir <path>     override published-content directory
 *   --output <path>            override output file
 *   --since <YYYY-MM-DD>       override default 30d window floor
 *
 * Cron contract:
 *   `1 8 1 * *` (1st of month, 08:01 local) — registered in cron-jobs.json.
 *   First-of-month gives the prior month a clean publish-date floor.
 *
 * @milestone OBSIDIAN-AUTOMATE-MS3/U-PERF-REPORT-CRON
 */

import { writeFileSync, mkdirSync, existsSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const PRISM_ROOT = resolve(__dirname, "..", "..");

const DEFAULT_PUBLISHED_DIR = resolve(PRISM_ROOT, "knowledge", "memories", "published");
const DEFAULT_INBOX_DIR = resolve(PRISM_ROOT, "knowledge", "memories", "inbox");

function parseFlags(argv) {
  const out = { dryRun: false };
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--dry-run") out.dryRun = true;
    else if (a === "--published-dir") out.publishedDir = argv[++i];
    else if (a === "--output") out.output = argv[++i];
    else if (a === "--since") out.since = argv[++i];
    else if (a === "--apply") out.dryRun = false;
  }
  return out;
}

async function loadEngine() {
  const distEngine = resolve(__dirname, "..", "dist", "engines", "PerformanceLoopEngine.js");
  if (existsSync(distEngine)) {
    return import(pathToFileURL(distEngine).href);
  }
  const tsx = await import("tsx/esm/api");
  return tsx.tsImport(
    resolve(__dirname, "..", "src", "engines", "PerformanceLoopEngine.ts"),
    import.meta.url,
  );
}

function pad2(n) { return String(n).padStart(2, "0"); }

function reportToMarkdown(report, monthLabel) {
  const lines = [];
  lines.push("---");
  lines.push("type: perf-report");
  lines.push(`month: ${monthLabel}`);
  lines.push(`generated_at: ${report.generatedAtIso}`);
  lines.push(`window_since: ${report.windowSinceIso}`);
  lines.push(`scanned: ${report.scanned}`);
  lines.push(`analyzed: ${report.analyzed}`);
  lines.push("---");
  lines.push("");
  lines.push(`# Performance Loop — ${monthLabel}`);
  lines.push("");
  lines.push(`_${report.analyzed} of ${report.scanned} published-content notes met the publish-date floor (${report.windowSinceIso}). Empty sections mean the corpus did not yield a confident answer; that is a signal, not a failure._`);
  lines.push("");

  // Q1
  lines.push("## Q1 — Topics by bookmarks-per-impression");
  if (report.topicsByBpi.length === 0) {
    lines.push("(no topics analyzed)");
  } else {
    lines.push("| Pillar | Posts | Mean BPI | Total impressions | Total bookmarks | Best hook |");
    lines.push("|---|---:|---:|---:|---:|---|");
    for (const t of report.topicsByBpi) {
      lines.push(`| ${t.pillar} | ${t.count} | ${(t.meanBpi * 100).toFixed(2)}% | ${t.totalImpressions.toLocaleString("en-US")} | ${t.totalBookmarks.toLocaleString("en-US")} | ${t.bestHookFormat} |`);
    }
  }
  lines.push("");

  // Q2
  lines.push("## Q2 — Hook formats outperforming topic average");
  if (report.hookOutperformance.length === 0) {
    lines.push("(no hook outperformed its topic average — corpus likely too small or hooks evenly matched)");
  } else {
    lines.push("| Pillar | Hook | Posts | Mean BPI | Topic mean | Outperformance |");
    lines.push("|---|---|---:|---:|---:|---:|");
    for (const h of report.hookOutperformance) {
      lines.push(`| ${h.pillar} | ${h.hookFormat} | ${h.count} | ${(h.meanBpi * 100).toFixed(2)}% | ${(h.topicMeanBpi * 100).toFixed(2)}% | +${(h.outperformanceRatio * 100).toFixed(1)}% |`);
    }
  }
  lines.push("");

  // Q3
  lines.push("## Q3 — Three angles you have not tried");
  if (report.untriedAngles.length === 0) {
    lines.push("(no untried-angle suggestions — either every hook has been tried in every top pillar, or the corpus is too thin to generalize)");
  } else {
    for (const a of report.untriedAngles) {
      lines.push(`- **${a.pillar} × ${a.hookFormat}** — ${a.reason}`);
    }
  }
  lines.push("");

  // Q4
  lines.push("## Q4 — Combos to double down on");
  if (report.doubleDownCombos.length === 0) {
    lines.push("(no combo cleared the minimum-evidence threshold — wait for more shipped pieces in any single combo)");
  } else {
    lines.push("| Rank | Pillar | Hook | Posts | Mean BPI |");
    lines.push("|---:|---|---|---:|---:|");
    for (const c of report.doubleDownCombos) {
      lines.push(`| ${c.rank} | ${c.pillar} | ${c.hookFormat} | ${c.count} | ${(c.meanBpi * 100).toFixed(2)}% |`);
    }
  }
  lines.push("");
  lines.push("---");
  lines.push("_Generated by `monthly-perf-report.mjs`. Source: `knowledge/memories/published/`. Edit nothing here — re-run on the 1st of next month for a refreshed view._");
  lines.push("");
  return lines.join("\n");
}

export async function runMonthlyPerfReport(opts = {}) {
  const flags = opts.flags ?? parseFlags(process.argv);
  const publishedDir = resolve(flags.publishedDir ?? opts.publishedDir ?? DEFAULT_PUBLISHED_DIR);
  const now = opts.now ?? Date.now();
  const today = new Date(now);
  // The "month" label refers to the prior calendar month (we run on the 1st).
  const reportMonth = new Date(today.getUTCFullYear(), today.getUTCMonth() - 1, 15); // mid-prior-month
  const monthLabel = `${reportMonth.getUTCFullYear()}-${pad2(reportMonth.getUTCMonth() + 1)}`;

  const outputPath = resolve(
    flags.output ?? opts.output ?? resolve(DEFAULT_INBOX_DIR, `perf-report-${monthLabel}.md`),
  );

  let engine = opts.engine;
  if (!engine) {
    const mod = await loadEngine();
    engine = mod.performanceLoopEngine;
  }
  if (!engine || typeof engine.monthlyReport !== "function") {
    throw new Error("monthly-perf-report: PerformanceLoopEngine.monthlyReport not available");
  }

  const report = engine.monthlyReport({
    publishedDir,
    sinceIso: flags.since ?? opts.sinceIso,
    now,
  });
  const markdown = reportToMarkdown(report, monthLabel);

  if (flags.dryRun || opts.dryRun) {
    process.stdout.write(markdown);
    return { ok: true, dryRun: true, outputPath: null, report, markdown };
  }

  mkdirSync(dirname(outputPath), { recursive: true });
  writeFileSync(outputPath, markdown, "utf8");
  return { ok: true, dryRun: false, outputPath, report, markdown };
}

// ─────────────────────────────────────────────────────────────────────────────
// CLI entry
// ─────────────────────────────────────────────────────────────────────────────

const isCli = (() => {
  try {
    const argv1 = resolve(process.argv[1] ?? "");
    return argv1 === __filename;
  } catch { return false; }
})();

if (isCli) {
  runMonthlyPerfReport().then(
    (r) => {
      if (!r.dryRun) {
        process.stdout.write(`monthly-perf-report: wrote ${r.outputPath}\n`);
      }
      process.exit(0);
    },
    (err) => {
      process.stderr.write(`monthly-perf-report ERROR: ${err?.stack ?? err?.message ?? err}\n`);
      process.exit(1);
    },
  );
}

export { reportToMarkdown };
