#!/usr/bin/env node
// tier: T3
/**
 * stop-system-viz-drift.mjs — SYSTEM-VIZ-FS-COVERAGE-MS1/U-MS1-DRIFT-STOP-HOOK
 *
 * Stop-time advisory: once per session, if the system-viz drift report is older
 * than 12h OR shows more than DRIFT_THRESHOLD drifted namespaces, nudge the
 * operator to refresh. Strictly NON-BLOCKING — emits a one-line advisory in
 * suppressOutput:false mode; never blocks Stop, never returns decision:"block".
 *
 * Trigger conditions (any of):
 *   - DRIFT_REPORT.json missing or older than DRIFT_REPORT_MAX_AGE_MS (12h default)
 *   - drifted_count (sum of all non-fresh categories) > DRIFT_THRESHOLD (10 default)
 *   - any truncated namespace
 *   - any root-missing namespace
 *
 * Throttle: stamp file at state/shared/.drift-stop-stamp.json prevents firing
 * more than once per STOP_THROTTLE_MS (60min default) per chat session.
 *
 * Knobs:
 *   PRISM_DRIFT_STOP_HOOK_DISABLE=1       — off entirely
 *   PRISM_DRIFT_STOP_HOOK_THRESHOLD=N     — drift count nudge threshold (default 10)
 *   PRISM_DRIFT_STOP_MAX_AGE_HOURS=N      — report-age nudge threshold (default 12)
 *   PRISM_DRIFT_STOP_THROTTLE_MIN=N       — per-session throttle (default 60)
 *
 * Hook contract: emits { continue: true, suppressOutput: false, systemMessage: "<nudge>" }
 * when conditions match; otherwise { continue: true, suppressOutput: true }.
 */
import fs from "node:fs";
import path from "node:path";

const HOME_DRIVE_LETTER = process.env.SystemDrive || "C:";
const REPO_ROOT = "H:/prism";
const REPORT_PATH = path.join(REPO_ROOT, "state", "shared", "system-viz", "DRIFT_REPORT.json");
// W1 / U-FOLD-DEFAULT consumer: the newly-built fold-debt marker written by
// scripts/system-viz-on-commit.mjs. This Stop hook is its consumer so a
// stuck fold (commits paused → last batch never folded) reaches the operator
// instead of silently degrading viz highlights.
const FOLD_DEBT_PATH = path.join(REPO_ROOT, "state", "shared", "system-viz", ".newly-built-fold-debt.json");
const DEFAULT_FOLD_DEBT_MAX_HRS = 6;
const STAMP_PATH = path.join(REPO_ROOT, "state", "shared", ".drift-stop-stamp.json");
const DEFAULT_REPORT_MAX_AGE_MS = 12 * 60 * 60 * 1000;
const DEFAULT_DRIFT_THRESHOLD = 10;
const DEFAULT_THROTTLE_MS = 60 * 60 * 1000;

function clamped(envVal, fallback, scale = 1) {
  const n = Number(envVal);
  return Number.isFinite(n) && n > 0 ? Math.floor(n * scale) : fallback;
}

function emit(payload) {
  process.stdout.write(JSON.stringify(payload));
  process.stdout.write("\n");
  process.exit(0);
}

function silent() { emit({ continue: true, suppressOutput: true }); }

function readJsonSafe(filePath) {
  try { return JSON.parse(fs.readFileSync(filePath, "utf8")); }
  catch { return null; }
}

function loadStamp() {
  const s = readJsonSafe(STAMP_PATH);
  return s && typeof s === "object" ? s : { lastFiredAt: 0, lastFiredFor: null };
}

function saveStamp(stamp) {
  try {
    fs.mkdirSync(path.dirname(STAMP_PATH), { recursive: true });
    const tmp = STAMP_PATH + ".tmp";
    fs.writeFileSync(tmp, JSON.stringify(stamp));
    fs.renameSync(tmp, STAMP_PATH);
  } catch { /* never block on stamp write */ }
}

function readSessionIdFromStdin(rawInput) {
  if (!rawInput) return null;
  try {
    const parsed = JSON.parse(rawInput);
    return parsed?.session_id ?? parsed?.sessionId ?? null;
  } catch { return null; }
}

function main() {
  if (process.env.PRISM_DRIFT_STOP_HOOK_DISABLE === "1") silent();

  const threshold = clamped(process.env.PRISM_DRIFT_STOP_HOOK_THRESHOLD, DEFAULT_DRIFT_THRESHOLD);
  const reportMaxAgeMs = clamped(process.env.PRISM_DRIFT_STOP_MAX_AGE_HOURS, DEFAULT_REPORT_MAX_AGE_MS / 3_600_000) * 3_600_000;
  const throttleMs = clamped(process.env.PRISM_DRIFT_STOP_THROTTLE_MIN, DEFAULT_THROTTLE_MS / 60_000) * 60_000;

  let stdin = "";
  try {
    if (!process.stdin.isTTY) stdin = fs.readFileSync(0, "utf8");
  } catch { /* tolerate stdin failure */ }
  const sessionId = readSessionIdFromStdin(stdin) || "unknown";

  const now = Date.now();
  const stamp = loadStamp();
  const sinceLastMs = now - (Number(stamp.lastFiredAt) || 0);
  if (sinceLastMs < throttleMs) silent(); // throttled

  const reasons = [];
  let reportAgeMs = Infinity;
  let report = readJsonSafe(REPORT_PATH);

  if (!report) {
    reasons.push("DRIFT_REPORT.json missing — run `/system-viz-drift --refresh`");
  } else {
    try {
      const stat = fs.statSync(REPORT_PATH);
      reportAgeMs = now - stat.mtimeMs;
      if (reportAgeMs > reportMaxAgeMs) {
        reasons.push(`drift report ${(reportAgeMs / 3_600_000).toFixed(1)}h old (threshold ${(reportMaxAgeMs / 3_600_000).toFixed(0)}h)`);
      }
    } catch { /* report mtime unreadable, but data parsed — proceed without age check */ }

    const byCategory = report.byCategory || {};
    const driftedCount = (report.total || 0) - (byCategory.fresh || 0);
    const truncated = byCategory.truncated || 0;
    const rootMissing = byCategory["root-missing"] || 0;
    if (driftedCount > threshold) {
      reasons.push(`${driftedCount} drifted namespaces (threshold ${threshold})`);
    }
    if (truncated > 0) reasons.push(`${truncated} truncated namespace${truncated > 1 ? "s" : ""}`);
    if (rootMissing > 0) reasons.push(`${rootMissing} root-missing namespace${rootMissing > 1 ? "s" : ""}`);
  }

  // W1 / U-FOLD-DEFAULT consumer. Canonical staleness logic lives in
  // foldDebtVerdict() (scripts/system-viz-on-commit.mjs); the rule is
  // inlined here (3 lines) per hook-self-containment (.claude/rules/hooks.md)
  // — keep the two in sync if the rule ever grows.
  const foldDebt = readJsonSafe(FOLD_DEBT_PATH);
  if (foldDebt && foldDebt.status !== "folded" && Number(foldDebt.pendingCount) > 0) {
    const tsMs = Date.parse(foldDebt.ts ?? "");
    const ageHrs = Number.isFinite(tsMs) ? (now - tsMs) / 3_600_000 : Infinity;
    const maxHrs = clamped(process.env.PRISM_FOLD_DEBT_MAX_HRS, DEFAULT_FOLD_DEBT_MAX_HRS);
    if (ageHrs > maxHrs) {
      const ageStr = Number.isFinite(ageHrs) ? `${ageHrs.toFixed(1)}h` : "∞ (no/invalid timestamp)";
      reasons.push(`${foldDebt.pendingCount} newly-built node(s) unfolded ${ageStr} — commits paused? → \`FOLD_NEWLY_BUILT=1 node H:/prism/scripts/system-viz-on-commit.mjs\` (check: \`--fold-debt-status\`)`);
    }
  }

  if (reasons.length === 0) silent();

  const msg = `system-viz drift advisory: ${reasons.join(" · ")} → run \`/system-viz-drift --refresh\` or \`node H:/prism/scripts/cron-revwalk.mjs --dry-run\``;
  saveStamp({ lastFiredAt: now, lastFiredFor: sessionId, reasonCount: reasons.length });
  emit({ continue: true, suppressOutput: false, systemMessage: msg });
}

try { main(); } catch (err) {
  // Hook MUST NOT block Stop even on internal failure. Silent fallback.
  process.stderr.write(`stop-system-viz-drift: ${err?.message || err}\n`);
  silent();
}
