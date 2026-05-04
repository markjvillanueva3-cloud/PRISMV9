#!/usr/bin/env node
// drift-alert-surface.mjs — SessionStart hook
//
// INTEL-OLLAMA-OBSIDIAN-MS0/P19-U02.
//
// Reads the tail of mcp-server/data/state/cron-runs.jsonl and emits a
// hookSpecificOutput.additionalContext block when:
//   - any level=error row exists in the last 24h, OR
//   - any task hasn't logged a successful "run" within (1+drift_threshold)
//     of its schedule window, OR
//   - the log file is unreadable / missing entirely (warn once, not error)
//
// Quiet by default — emits NOTHING to additionalContext when there are no
// alerts. The hook ALWAYS exits 0 with continue:true so it never blocks
// SessionStart.
//
// All real logic is in `evaluateDriftAlerts()` so tests can drive it
// without spawning a process.
//
// @milestone INTEL-OLLAMA-OBSIDIAN-MS0/P19-U02

import { readFileSync, statSync, existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const REPO_ROOT_DEFAULT = resolve(__dirname, "..", "..");
const MANIFEST_REL = "scripts/drift-detection-manifest.json";
const LOG_REL = "mcp-server/data/state/cron-runs.jsonl";
const TAIL_BYTES_DEFAULT = 256 * 1024;
const ERROR_LOOKBACK_HOURS = 24;
const HOUR_MS = 60 * 60 * 1000;

/**
 * Pure function — given a manifest object, log content (string), and the
 * "current" Date, returns the alert summary. No I/O.
 *
 * @param {object} manifest - parsed drift-detection-manifest.json
 * @param {string} logContent - JSONL content of cron-runs.jsonl (already tailed)
 * @param {Date} now
 * @returns {{
 *   alerts: Array<{level: string, task_id: string|null, message: string}>,
 *   ok: boolean,
 *   stats: {totalRows: number, errorRows: number, infoRows: number, warnRows: number}
 * }}
 */
export function evaluateDriftAlerts(manifest, logContent, now) {
  const alerts = [];
  const stats = { totalRows: 0, errorRows: 0, infoRows: 0, warnRows: 0 };
  const errorCutoff = now.getTime() - ERROR_LOOKBACK_HOURS * HOUR_MS;

  // Parse JSONL — skip malformed rows silently (don't block on bad data).
  const rows = [];
  for (const line of logContent.split(/\r?\n/)) {
    if (!line.trim()) continue;
    stats.totalRows++;
    let row;
    try { row = JSON.parse(line); } catch { continue; }
    if (typeof row !== "object" || row === null) continue;
    rows.push(row);
    if (row.level === "error") stats.errorRows++;
    else if (row.level === "warn") stats.warnRows++;
    else if (row.level === "info") stats.infoRows++;
  }

  // Recent errors (last 24h)
  for (const row of rows) {
    if (row.level !== "error") continue;
    const ts = Date.parse(typeof row.ts === "string" ? row.ts : "");
    if (!Number.isFinite(ts) || ts < errorCutoff) continue;
    alerts.push({
      level: "error",
      task_id: typeof row.task_id === "string" ? row.task_id : null,
      message: `[${row.ts}] ${row.task_id ?? "?"}: ${row.message ?? "(no message)"}`,
    });
  }

  // Stale-task detection — for clock-scheduled tasks only
  const tasks = Array.isArray(manifest?.tasks) ? manifest.tasks : [];
  const driftThreshold = typeof manifest?.drift_alert_threshold_pct === "number"
    ? manifest.drift_alert_threshold_pct / 100
    : 0.05;

  for (const task of tasks) {
    if (!task || !task.schedule || task.schedule.kind === "event") continue;
    if (typeof task.id !== "string") continue;

    // Find latest successful "run" or "install" row for this task.
    let latest = -Infinity;
    for (const row of rows) {
      if (row.task_id !== task.id) continue;
      if (row.level === "error") continue;
      if (row.action !== "run" && row.action !== "install") continue;
      const ts = Date.parse(typeof row.ts === "string" ? row.ts : "");
      if (Number.isFinite(ts) && ts > latest) latest = ts;
    }

    const expectedWindowMs = expectedWindowMillis(task.schedule);
    if (expectedWindowMs == null) continue;

    if (latest === -Infinity) {
      // Never run — only flag once installation should have happened.
      // Skip if the task was install-skipped (skip_if_missing flow); we
      // detect that by checking for any "skip" row for this task_id.
      const skipped = rows.some((r) => r.task_id === task.id && (r.action === "skip" || r.action === "skip-exists"));
      if (skipped) continue;
      alerts.push({
        level: "warn",
        task_id: task.id,
        message: `Task ${task.id} has no run record yet — installer may not have run on this host.`,
      });
      continue;
    }

    const allowedGapMs = expectedWindowMs * (1 + driftThreshold);
    if (now.getTime() - latest > allowedGapMs) {
      const ageHours = ((now.getTime() - latest) / HOUR_MS).toFixed(1);
      alerts.push({
        level: "warn",
        task_id: task.id,
        message: `Task ${task.id} last ran ${ageHours}h ago (window: ${(expectedWindowMs / HOUR_MS).toFixed(1)}h, drift ${(driftThreshold * 100).toFixed(0)}%).`,
      });
    }
  }

  return { alerts, ok: alerts.length === 0, stats };
}

/**
 * Translate manifest schedule → expected gap between runs in ms.
 * Returns null for unknown / unsupported schedule kinds.
 */
function expectedWindowMillis(schedule) {
  if (!schedule || typeof schedule !== "object") return null;
  switch (schedule.kind) {
    case "hourly": {
      const mod = typeof schedule.modifier === "number" ? schedule.modifier : 1;
      return Math.max(1, mod) * HOUR_MS;
    }
    case "daily":
      return 24 * HOUR_MS;
    default:
      return null;
  }
}

/**
 * Format alerts as a markdown block suitable for hookSpecificOutput.additionalContext.
 */
export function formatAlerts(alerts) {
  if (!alerts.length) return "";
  const lines = ["### ⚠️ Drift-detection alerts (P19-U02)"];
  const errors = alerts.filter((a) => a.level === "error");
  const warns = alerts.filter((a) => a.level !== "error");
  if (errors.length) {
    lines.push("");
    lines.push(`**${errors.length} error(s) in last ${ERROR_LOOKBACK_HOURS}h:**`);
    for (const a of errors) lines.push(`- ${a.message}`);
  }
  if (warns.length) {
    lines.push("");
    lines.push(`**${warns.length} stale/missing task(s):**`);
    for (const a of warns) lines.push(`- ${a.message}`);
  }
  lines.push("");
  lines.push("Source: `mcp-server/data/state/cron-runs.jsonl`. Re-run `scripts/install-drift-detection-cron.ps1` to refresh.");
  return lines.join("\n");
}

/**
 * Tail-read a JSONL file — returns the last N bytes' worth of complete lines.
 * Returns "" if the file is missing or unreadable (caller decides what to do).
 */
export function tailLog(absPath, maxBytes = TAIL_BYTES_DEFAULT) {
  try {
    if (!existsSync(absPath)) return "";
    const stat = statSync(absPath);
    if (stat.size <= maxBytes) {
      return readFileSync(absPath, "utf8");
    }
    // Stream-read the tail. fs.openSync + readSync would be cleaner but
    // readFileSync + slice keeps it dependency-free.
    const full = readFileSync(absPath);
    const slice = full.slice(stat.size - maxBytes).toString("utf8");
    const firstNl = slice.indexOf("\n");
    return firstNl >= 0 ? slice.slice(firstNl + 1) : slice;
  } catch {
    return "";
  }
}

/** Discover repo root + manifest + log paths. Pure I/O wrapper. */
export function loadEnvironment(repoRoot = REPO_ROOT_DEFAULT) {
  const manifestPath = resolve(repoRoot, MANIFEST_REL);
  const logPath = resolve(repoRoot, LOG_REL);
  let manifest = null;
  if (existsSync(manifestPath)) {
    try { manifest = JSON.parse(readFileSync(manifestPath, "utf8")); } catch { /* malformed manifest is non-fatal */ }
  }
  return { manifestPath, logPath, manifest };
}

async function main() {
  // Drain stdin (SessionStart hooks receive a payload but we don't need it).
  // No await — we're not blocking on input.
  const env = loadEnvironment();
  const out = { continue: true };
  if (!env.manifest) {
    // Manifest absent — quiet. Nothing to alert on.
    process.stdout.write(JSON.stringify(out));
    return;
  }
  const log = tailLog(env.logPath);
  const result = evaluateDriftAlerts(env.manifest, log, new Date());
  if (!result.ok) {
    out.hookSpecificOutput = {
      hookEventName: "SessionStart",
      additionalContext: formatAlerts(result.alerts),
    };
  }
  process.stdout.write(JSON.stringify(out));
}

if (import.meta.url === `file://${process.argv[1]?.replace(/\\/g, "/")}` || process.argv[1]?.endsWith("drift-alert-surface.mjs")) {
  main().catch((err) => {
    // Any uncaught error falls back to continue:true so SessionStart never blocks.
    process.stderr.write(`drift-alert-surface error: ${err?.message ?? String(err)}\n`);
    process.stdout.write(JSON.stringify({ continue: true }));
    process.exit(0);
  });
}
