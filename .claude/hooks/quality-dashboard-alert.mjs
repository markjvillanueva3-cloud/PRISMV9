#!/usr/bin/env node
// tier: T0
/**
 * quality-dashboard-alert.mjs — Stop + PreCompact hook
 * INTEL-OLLAMA-OBSIDIAN-MS0/P9-U03
 *
 * Surfaces QualityDashboardEngine alerts at session-end and pre-compact:
 *
 *   • PreCompact event → recompute dashboard (refresh AUTO-7 snapshot before compaction
 *                       captures stale numbers). Emit advisory to stderr if any alerts.
 *
 *   • Stop event       → read most-recent snapshot. If unacknowledged CRITICAL alerts
 *                       are present, emit { decision: "block" } so the session cannot
 *                       end until the user acknowledges. HIGH alerts are advisory.
 *
 * Acknowledgement: callers ack alerts by writing
 *   mcp-server/data/state/quality-acks.json
 * with shape { acks: { [alertKey]: { ackedAt, byChat? } } }
 *
 * Alert key = severity|category|message — timestamp varies between computes so
 * excluding it lets one ack persist across recomputes of the same defect.
 *
 * Hook protocol — Claude Code:
 *   stdin  = JSON { hook_event_name, session_id, ...event-specific fields }
 *   stdout = JSON { continue: true } | { decision: "block", reason: "..." }
 *   stderr = optional advisory (does not block, always shown to user)
 *
 * Best-effort behavior: any error path returns `{ continue: true }` so a broken hook
 * never wedges Stop. Only an explicit blocking alert returns `{ decision: "block" }`.
 *
 * Pure function `buildAlertReport(snapshot, acks)` is exported for unit testing.
 */
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";

// ──────────────────────────────────────────────────────────────────────────
// Path resolution — robust to invocation from any worktree
// ──────────────────────────────────────────────────────────────────────────

const HOOK_DIR = path.dirname(new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/"));
const REPO_ROOT = path.resolve(HOOK_DIR, "../..");
const DASHBOARD_PATH = path.join(REPO_ROOT, "state", "shared", "QUALITY_DASHBOARD.json");
const ACKS_PATH = path.join(REPO_ROOT, "mcp-server", "data", "state", "quality-acks.json");
const COMPUTE_SCRIPT = path.join(
  REPO_ROOT,
  "mcp-server",
  "scripts",
  "compute-quality-dashboard.mjs",
);

// Severity gates
const BLOCKING_SEVERITIES = new Set(["critical"]);
const ADVISORY_SEVERITIES = new Set(["high"]);
const PRECOMPACT_TIMEOUT_MS = 8000;

// ──────────────────────────────────────────────────────────────────────────
// Stdin payload
// ──────────────────────────────────────────────────────────────────────────

function readStdinSafe() {
  try {
    if (process.stdin.isTTY) return "";
    return fs.readFileSync(0, "utf-8");
  } catch {
    return "";
  }
}

function parsePayload(raw) {
  if (!raw) return {};
  try { return JSON.parse(raw); } catch { return {}; }
}

// ──────────────────────────────────────────────────────────────────────────
// File loaders — never throw
// ──────────────────────────────────────────────────────────────────────────

function readJsonSafe(filePath) {
  try {
    if (!fs.existsSync(filePath)) return null;
    return JSON.parse(fs.readFileSync(filePath, "utf-8"));
  } catch {
    return null;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Pure logic — exported for testing
// ──────────────────────────────────────────────────────────────────────────

/**
 * Compose the canonical key for an alert. Excludes timestamp so the same
 * recurring alert can be acknowledged once.
 */
export function alertKey(alert) {
  return `${alert.severity}|${alert.category}|${alert.message}`;
}

/**
 * Build the alert report from a dashboard snapshot + acks map.
 * @param {{alerts?: Array<{severity:string,category:string,message:string,timestamp:string}>}|null} snapshot
 * @param {{acks?: Record<string, {ackedAt: string}>}|null} acksDoc
 * @returns {{
 *   block: boolean,
 *   blocking: Array<object>,
 *   advisory: Array<object>,
 *   acked: Array<object>,
 *   summary: string,
 *   has_snapshot: boolean
 * }}
 */
export function buildAlertReport(snapshot, acksDoc) {
  if (!snapshot || !Array.isArray(snapshot.alerts)) {
    return {
      block: false,
      blocking: [],
      advisory: [],
      acked: [],
      summary: "No quality dashboard snapshot available — no alerts to surface.",
      has_snapshot: !!snapshot,
    };
  }

  const acks = (acksDoc && acksDoc.acks) || {};
  const blocking = [];
  const advisory = [];
  const acked = [];

  for (const alert of snapshot.alerts) {
    if (!alert || typeof alert.severity !== "string") continue;
    const key = alertKey(alert);
    const isAcked = key in acks;

    if (BLOCKING_SEVERITIES.has(alert.severity)) {
      if (isAcked) acked.push(alert); else blocking.push(alert);
    } else if (ADVISORY_SEVERITIES.has(alert.severity)) {
      if (isAcked) acked.push(alert); else advisory.push(alert);
    }
  }

  const block = blocking.length > 0;
  let summary;
  if (block) {
    summary = `${blocking.length} unacknowledged CRITICAL alert(s) — Stop blocked. Acknowledge in ${ACKS_PATH} or run the audit MCP action.`;
  } else if (advisory.length > 0) {
    summary = `${advisory.length} HIGH alert(s) — review recommended. ${acked.length > 0 ? `${acked.length} previously acknowledged.` : ""}`.trim();
  } else if (acked.length > 0) {
    summary = `All ${acked.length} alert(s) previously acknowledged.`;
  } else {
    summary = "No quality alerts.";
  }

  return { block, blocking, advisory, acked, summary, has_snapshot: true };
}

// ──────────────────────────────────────────────────────────────────────────
// PreCompact: refresh the dashboard before compaction freezes the snapshot
// ──────────────────────────────────────────────────────────────────────────

function refreshDashboardBlocking() {
  if (!fs.existsSync(COMPUTE_SCRIPT)) return false;
  try {
    const r = spawnSync(
      process.execPath,
      [COMPUTE_SCRIPT],
      { encoding: "utf-8", timeout: PRECOMPACT_TIMEOUT_MS, windowsHide: true },
    );
    return r.status === 0;
  } catch {
    return false;
  }
}

// ──────────────────────────────────────────────────────────────────────────
// Output helpers — Claude Code hook protocol
// ──────────────────────────────────────────────────────────────────────────

function emitContinue(extra = {}) {
  try {
    process.stdout.write(JSON.stringify({ continue: true, ...extra }));
  } catch { /* swallow */ }
}

function emitBlock(reason, details) {
  try {
    process.stdout.write(JSON.stringify({ decision: "block", reason, details }));
  } catch { /* swallow */ }
}

function emitAdvisory(report, eventName) {
  if (report.advisory.length === 0 && report.blocking.length === 0) return;
  const lines = [`[quality-dashboard-alert:${eventName}] ${report.summary}`];
  for (const a of report.blocking) {
    lines.push(`[quality-dashboard-alert] CRITICAL  ${a.category} — ${a.message}`);
  }
  for (const a of report.advisory) {
    lines.push(`[quality-dashboard-alert] HIGH      ${a.category} — ${a.message}`);
  }
  try { process.stderr.write(lines.join("\n") + "\n"); } catch { /* swallow */ }
}

// ──────────────────────────────────────────────────────────────────────────
// Main
// ──────────────────────────────────────────────────────────────────────────

async function main() {
  const raw = readStdinSafe();
  const payload = parsePayload(raw);
  const eventName = payload.hook_event_name || payload.event || "Stop";

  // PreCompact → refresh dashboard FIRST so the next session's startup hook
  // sees current data, not stale pre-compact state.
  if (eventName === "PreCompact") {
    refreshDashboardBlocking();
  }

  const snapshot = readJsonSafe(DASHBOARD_PATH);
  const acksDoc = readJsonSafe(ACKS_PATH);
  const report = buildAlertReport(snapshot, acksDoc);

  emitAdvisory(report, eventName);

  // Stop hooks may BLOCK; PreCompact must always continue (no point blocking
  // a compaction the user already committed to).
  if (eventName === "Stop" && report.block) {
    emitBlock(report.summary, {
      blocking: report.blocking.map((a) => alertKey(a)),
      ack_path: ACKS_PATH,
    });
    return;
  }

  emitContinue({
    quality_alerts: {
      block: report.block,
      blocking_count: report.blocking.length,
      advisory_count: report.advisory.length,
      acked_count: report.acked.length,
    },
  });
}

// Hard timeout — never let the hook wedge Stop
const HARD_TIMEOUT_MS = PRECOMPACT_TIMEOUT_MS + 4000;
setTimeout(() => {
  emitContinue();
  process.exit(0);
}, HARD_TIMEOUT_MS);

// Only run main() when invoked as a script (not when imported by tests)
const __isMain = (() => {
  try {
    const argv1 = process.argv[1] ? path.resolve(process.argv[1]) : "";
    const self = new URL(import.meta.url).pathname.replace(/^\/(\w):\//, "$1:/");
    return path.resolve(self) === argv1;
  } catch { return true; }
})();

if (__isMain) {
  main()
    .then(() => process.exit(0))
    .catch(() => {
      emitContinue();
      process.exit(0);
    });
}
