#!/usr/bin/env node
/**
 * system-awareness-freshness-cron.mjs — U-SAF-F2 task target.
 *
 * Scheduled-task wrapper that:
 *   1. Runs the U-SAF-A1 audit (7-day lookback) using the same in-process API.
 *   2. Appends a one-line summary to state/shared/SYSTEM-AWARENESS-FRESHNESS-HISTORY.jsonl
 *      (atomic append; one row per cron fire).
 *   3. If the latest baseline is >7 days old, refreshes it (full 30-day lookback).
 *
 * Modes:
 *   node scripts/system-awareness-freshness-cron.mjs            # normal cron pass
 *   node scripts/system-awareness-freshness-cron.mjs --dry-run  # compute but don't write
 *   node scripts/system-awareness-freshness-cron.mjs --json     # machine-readable summary
 *
 * Knobs:
 *   PRISM_SAF_CRON_DISABLE=1                  — exit 0 immediately
 *   PRISM_SAF_CRON_HISTORY=path               — override default history path
 *   PRISM_SAF_CRON_BASELINE_REFRESH_DAYS=N    — refresh baseline if older than N days (default 7)
 *
 * Exit: 0 ok, 1 staleness count grew, 2 error.
 */
import { statSync, appendFileSync, writeFileSync, renameSync, readdirSync } from "node:fs";
import { join, basename } from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = "H:/prism";
const DEFAULT_HISTORY_PATH = REPO_ROOT + "/state/shared/SYSTEM-AWARENESS-FRESHNESS-HISTORY.jsonl";
const BASELINE_DIR = REPO_ROOT + "/state/shared";
const BASELINE_PREFIX = "SYSTEM-AWARENESS-FRESHNESS-BASELINE-";
const DEFAULT_REFRESH_DAYS = 7;
const MS_PER_DAY = 24 * 60 * 60 * 1000;

// ─── Pure core ──────────────────────────────────────────────────────────

/**
 * Decide whether the latest baseline needs refresh based on its mtime.
 * Returns true if a refresh should run (file missing OR older than threshold).
 */
export function shouldRefreshBaseline({ latestMtimeMs, nowMs, refreshDays = DEFAULT_REFRESH_DAYS }) {
  if (!Number.isFinite(latestMtimeMs) || latestMtimeMs <= 0) return true;
  if (!Number.isFinite(nowMs) || nowMs <= 0) return false; // unknown clock → skip refresh
  const ageMs = nowMs - latestMtimeMs;
  return ageMs >= refreshDays * MS_PER_DAY;
}

/**
 * Build the JSONL history row from a fresh audit. Stable schema, one-line.
 */
export function buildHistoryRow(audit) {
  if (!audit || !audit.summary) throw new Error("buildHistoryRow needs audit with summary");
  return {
    generatedAt: audit.generatedAt,
    lookbackDays: audit.lookbackDays,
    commitCount: audit.commitCount,
    milestoneTokenCount: audit.milestoneTokenCount,
    total: audit.summary.total,
    byCategory: audit.summary.byCategory,
    bySeverity: audit.summary.bySeverity,
  };
}

/**
 * Format the today-suffixed baseline filename. Pure (no Date.now() — input ms).
 */
export function baselineNameForDate(nowMs) {
  const d = new Date(nowMs);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return BASELINE_PREFIX + y + "-" + m + "-" + day + ".json";
}

/**
 * Pure decision: given the latest baseline name + dir entries + nowMs, return
 * the refresh action {refresh, targetName, reason}.
 */
export function planBaselineRefresh({ latestName, latestMtimeMs, nowMs, refreshDays = DEFAULT_REFRESH_DAYS }) {
  if (!latestName) return { refresh: true, targetName: baselineNameForDate(nowMs), reason: "no baseline exists" };
  if (shouldRefreshBaseline({ latestMtimeMs, nowMs, refreshDays })) {
    return { refresh: true, targetName: baselineNameForDate(nowMs), reason: "baseline older than " + refreshDays + "d" };
  }
  return { refresh: false, targetName: latestName, reason: "baseline fresh enough" };
}

// ─── I/O helpers ────────────────────────────────────────────────────────

function listBaselines() {
  try {
    return readdirSync(BASELINE_DIR)
      .filter((n) => typeof n === "string" && n.startsWith(BASELINE_PREFIX) && n.endsWith(".json"))
      .sort(); // ISO date suffix sorts by date
  } catch { return []; }
}

function latestBaselineMtime(name) {
  if (!name) return null;
  try { return statSync(join(BASELINE_DIR, name)).mtimeMs; }
  catch { return null; }
}

function atomicWrite(path, content) {
  const tmp = path + "." + process.pid + "." + Date.now() + ".tmp";
  writeFileSync(tmp, content, "utf8");
  renameSync(tmp, path);
}

async function runFullAudit(lookbackDays) {
  const mod = await import("file:///H:/prism/scripts/system-awareness-freshness-audit.mjs");
  const readFile = mod.makeReadFile();
  const readDir = mod.makeReadDir();
  const gitLog = await mod.makeGitLogAsync();
  return mod.buildAudit({ readFile, readDir, gitLog, lookbackDays });
}

// ─── CLI ────────────────────────────────────────────────────────────────

function parseArgs(argv) {
  const args = { dryRun: false, json: false };
  for (const a of argv) {
    if (a === "--dry-run") args.dryRun = true;
    else if (a === "--json") args.json = true;
  }
  return args;
}

async function main() {
  if (process.env.PRISM_SAF_CRON_DISABLE === "1") return 0;
  const args = parseArgs(process.argv.slice(2));
  const historyPath = process.env.PRISM_SAF_CRON_HISTORY || DEFAULT_HISTORY_PATH;
  const refreshDays = parseInt(process.env.PRISM_SAF_CRON_BASELINE_REFRESH_DAYS || String(DEFAULT_REFRESH_DAYS), 10) || DEFAULT_REFRESH_DAYS;

  try {
    // Step 1: 7-day audit for the history JSONL row.
    const audit7 = await runFullAudit(7);
    const row = buildHistoryRow(audit7);

    // Step 2: decide whether to refresh baseline.
    const baselines = listBaselines();
    const latestName = baselines.length > 0 ? baselines[baselines.length - 1] : null;
    const latestMtimeMs = latestName ? latestBaselineMtime(latestName) : null;
    const plan = planBaselineRefresh({ latestName, latestMtimeMs, nowMs: Date.now(), refreshDays });

    let baselineUpdated = false;
    let baselineFindings = null;
    if (plan.refresh) {
      const fullAudit = await runFullAudit(30);
      baselineFindings = fullAudit.findings.length;
      if (!args.dryRun) {
        atomicWrite(join(BASELINE_DIR, plan.targetName), JSON.stringify(fullAudit, null, 2) + "\n");
        baselineUpdated = true;
      }
    }

    // Step 3: append history row (atomic — appendFileSync is atomic-on-Windows
    // for small writes thanks to O_APPEND semantics emulation).
    if (!args.dryRun) {
      appendFileSync(historyPath, JSON.stringify(row) + "\n");
    }

    const summary = {
      ok: true,
      historyPath,
      historyAppended: !args.dryRun,
      baselineRefresh: plan.refresh,
      baselineReason: plan.reason,
      baselineTargetName: plan.targetName,
      baselineUpdated,
      baselineFindings,
      audit7Total: row.total,
      audit7High: row.bySeverity?.high || 0,
    };

    if (args.json) process.stdout.write(JSON.stringify(summary, null, 2) + "\n");
    else {
      process.stderr.write("saf-cron: " + (args.dryRun ? "DRY-RUN" : "APPLY") + "\n");
      process.stderr.write("  history: " + historyPath + " (appended=" + summary.historyAppended + ")\n");
      process.stderr.write("  audit7: total=" + row.total + " high=" + summary.audit7High + "\n");
      process.stderr.write("  baseline: " + plan.reason + " → " + (baselineUpdated ? "WROTE " + plan.targetName : "skip") + "\n");
    }
    // Exit 1 if any high findings (advisory signal; cron logs it).
    return summary.audit7High > 0 ? 1 : 0;
  } catch (e) {
    process.stderr.write("saf-cron: error — " + e.message + "\n");
    return 2;
  }
}

// Windows-safe main detection
const __isMain = (() => {
  try {
    const argv = process.argv[1] || "";
    return basename(argv).toLowerCase() === basename(fileURLToPath(import.meta.url)).toLowerCase();
  } catch { return false; }
})();
if (__isMain) {
  main().then((code) => process.exit(code || 0)).catch(() => process.exit(2));
}
