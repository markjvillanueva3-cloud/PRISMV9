#!/usr/bin/env node
// tier: T3
/**
 * stop-token-savings-summary.mjs — Stop hook
 *
 * TOKEN-SAVINGS-SUMMARY/U-TSS01 (2026-05-24, slot:alpha)
 *
 * Tails the 5 token-savings telemetry ledgers at every session Stop and emits
 * a human-readable one-line summary of estimated savings + top-3 nudge reasons
 * as `additionalContext`. Strictly advisory — never blocks Stop.
 *
 * Distinct from `stop-psn-savings-aggregate` (writes aggregate JSON daily).
 * This hook emits an inline session-end nudge so operators see the figure
 * without grepping dashboards.
 *
 * Tracked ledgers:
 *   1. state/shared/dashboards/pre-tool-savings-multi.jsonl     → nudges-per-tool
 *   2. state/shared/dashboards/rtk-adoption-measure.jsonl       → rtk measurement
 *   3. mcp-server/data/state/ollama-offload-stats.json          → ollama offloads
 *   4. state/shared/route-savings-stats.json                    → route savings (may not exist)
 *   5. state/shared/mcp-route-suggest-stats.json                → mcp route suggests
 *
 * Throttle:
 *   One global file-lock at state/shared/.token-savings-summary-throttle
 *   (mtime-based). Default 30 min between fires fleet-wide.
 *
 * Knobs:
 *   PRISM_TOKEN_SAVINGS_SUMMARY_DISABLE=1   → off entirely
 *   PRISM_TOKEN_SAVINGS_SUMMARY_THROTTLE_MS  default 1_800_000 (30 min)
 *   PRISM_TOKEN_SAVINGS_TAIL_LINES           default 200
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync, utimesSync } from "node:fs";
import path from "node:path";

const PRISM_ROOT = "H:/prism";

export const LEDGERS = {
  "pre-tool-savings-multi": {
    path: `${PRISM_ROOT}/state/shared/dashboards/pre-tool-savings-multi.jsonl`,
    kind: "jsonl",
  },
  "rtk-adoption-measure": {
    path: `${PRISM_ROOT}/state/shared/dashboards/rtk-adoption-measure.jsonl`,
    kind: "jsonl",
  },
  "ollama-offload-stats": {
    path: `${PRISM_ROOT}/mcp-server/data/state/ollama-offload-stats.json`,
    kind: "json",
  },
  "route-savings-stats": {
    path: `${PRISM_ROOT}/state/shared/route-savings-stats.json`,
    kind: "json",
  },
  "mcp-route-suggest-stats": {
    path: `${PRISM_ROOT}/state/shared/mcp-route-suggest-stats.json`,
    kind: "json",
  },
};

const LOCK_PATH = `${PRISM_ROOT}/state/shared/.token-savings-summary-throttle`;
const DEFAULT_THROTTLE_MS = 30 * 60_000;
const DEFAULT_TAIL_LINES = 200;
const MAX_READ_BYTES = 500_000;

// ── pure helpers (exported for tests) ──────────────────────────────────────

/**
 * Parse a JSONL tail string. Returns { nudgeCount, nudgeReasons, savedTokens, lines }.
 * - Counts entries with `nudge === true` (multi.jsonl)
 * - Sums `est_tokens` for entries with `kind === "measured"` (rtk-adoption-measure)
 * - Tallies reasons (multi.jsonl) or `base` (rtk) for top-N reporting
 */
export function parseLedgerTail(text) {
  const out = { nudgeCount: 0, nudgeReasons: {}, savedTokens: 0, lines: 0 };
  if (!text || typeof text !== "string") return out;
  for (const raw of text.split("\n")) {
    if (!raw) continue;
    let e;
    try { e = JSON.parse(raw); } catch { continue; }
    out.lines += 1;
    if (e && e.nudge === true) {
      out.nudgeCount += 1;
      const reason = String(e.reason || e.tool || "unknown");
      out.nudgeReasons[reason] = (out.nudgeReasons[reason] || 0) + 1;
    }
    if (e && e.kind === "measured" && Number.isFinite(e.est_tokens)) {
      out.savedTokens += Math.max(0, Number(e.est_tokens) - Number(e.observed_tokens || 0));
      const base = String(e.base || "rtk");
      out.nudgeReasons[`rtk:${base}`] = (out.nudgeReasons[`rtk:${base}`] || 0) + 1;
    }
  }
  return out;
}

/**
 * Parse a JSON stats file (object-shape ledgers). Returns the same shape as
 * parseLedgerTail so aggregator can blend them.
 *
 * - ollama-offload-stats.json: `estimatedTokensSaved`, `byHook`
 * - mcp-route-suggest-stats.json: `totalFires`, `byClassifier`
 * - route-savings-stats.json: best-effort `savedTokens` / `totalSaved` fields
 */
export function parseLedgerJson(obj) {
  const out = { nudgeCount: 0, nudgeReasons: {}, savedTokens: 0, lines: 0 };
  if (!obj || typeof obj !== "object") return out;
  // estimatedTokensSaved (ollama)
  if (Number.isFinite(obj.estimatedTokensSaved)) out.savedTokens += Number(obj.estimatedTokensSaved);
  // best-effort generic
  for (const k of ["savedTokens", "totalSaved", "tokensSaved"]) {
    if (Number.isFinite(obj[k])) out.savedTokens += Number(obj[k]);
  }
  // totalFires (mcp-route-suggest)
  if (Number.isFinite(obj.totalFires)) out.nudgeCount += Number(obj.totalFires);
  // breakdowns — flatten top reasons
  const buckets = [obj.byClassifier, obj.byHook, obj.byCategory, obj.byToolName];
  for (const bucket of buckets) {
    if (!bucket || typeof bucket !== "object") continue;
    for (const [reason, raw] of Object.entries(bucket)) {
      let val = 0;
      if (Number.isFinite(raw)) val = Number(raw);
      else if (raw && typeof raw === "object") {
        // shapes like { suggested: N, accepted: N }
        if (Number.isFinite(raw.suggested)) val += Number(raw.suggested);
        else if (Number.isFinite(raw.count)) val += Number(raw.count);
        else if (Number.isFinite(raw.fires)) val += Number(raw.fires);
      }
      if (val > 0) out.nudgeReasons[reason] = (out.nudgeReasons[reason] || 0) + val;
    }
  }
  return out;
}

/**
 * Aggregate across all ledger parse results.
 * Input shape: { [ledgerName]: parseResult }
 * Output: { totalSavedTokens, totalNudges, topReasons: [[reason, count], ...], ledgersWithData }
 */
export function aggregateAcrossLedgers(byLedger) {
  const agg = {
    totalSavedTokens: 0,
    totalNudges: 0,
    topReasons: [],
    ledgersWithData: 0,
    byLedger: {},
  };
  if (!byLedger || typeof byLedger !== "object") return agg;
  const reasonTotals = {};
  for (const [name, stats] of Object.entries(byLedger)) {
    if (!stats) continue;
    const savedTokens = Number(stats.savedTokens) || 0;
    const nudgeCount = Number(stats.nudgeCount) || 0;
    const hasData = savedTokens > 0 || nudgeCount > 0 || (stats.lines || 0) > 0;
    if (hasData) agg.ledgersWithData += 1;
    agg.totalSavedTokens += savedTokens;
    agg.totalNudges += nudgeCount;
    agg.byLedger[name] = { savedTokens, nudgeCount };
    for (const [reason, count] of Object.entries(stats.nudgeReasons || {})) {
      reasonTotals[reason] = (reasonTotals[reason] || 0) + Number(count || 0);
    }
  }
  agg.topReasons = Object.entries(reasonTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  return agg;
}

/**
 * Format the one-line summary for `additionalContext`.
 * Pure: no I/O.
 */
export function formatSummary(agg) {
  if (!agg || (agg.totalSavedTokens === 0 && agg.totalNudges === 0 && agg.ledgersWithData === 0)) {
    return "💰 Session token-savings: no telemetry tracked this window.";
  }
  const k = agg.totalSavedTokens >= 1000
    ? `${(agg.totalSavedTokens / 1000).toFixed(1)}k`
    : String(agg.totalSavedTokens);
  const top = (agg.topReasons || []).map(([r, c]) => `${r}×${c}`).join(", ");
  const reasonsPart = top ? ` · top: ${top}` : "";
  return `💰 Session token-savings: ~${k} tokens saved across ${agg.ledgersWithData}/5 ledgers, ${agg.totalNudges} nudges${reasonsPart}`;
}

/**
 * Throttle gate — true when stale (>= throttleMs since lockPath mtime) OR missing.
 * Pure-ish: only reads mtime; does NOT mutate the lock (caller does after emitting).
 */
export function shouldEmit(lockPath, now, throttleMs = DEFAULT_THROTTLE_MS) {
  try {
    if (!existsSync(lockPath)) return true;
    const st = statSync(lockPath);
    const lastMs = st.mtimeMs || 0;
    return (now - lastMs) >= throttleMs;
  } catch {
    return true; // fail-soft: never block emission on a stat error
  }
}

// ── I/O wrappers (not exercised by unit tests) ─────────────────────────────

function tailLines(text, n) {
  if (!text) return "";
  const lines = text.split("\n");
  if (lines.length <= n) return text;
  return lines.slice(lines.length - n).join("\n");
}

function tailRead(filePath, maxLines) {
  try {
    if (!existsSync(filePath)) return "";
    const st = statSync(filePath);
    if (st.size === 0) return "";
    const raw = readFileSync(filePath, "utf8");
    const trimmed = raw.length > MAX_READ_BYTES ? raw.slice(raw.length - MAX_READ_BYTES) : raw;
    return tailLines(trimmed, maxLines);
  } catch { return ""; }
}

function readJsonSafe(p) {
  try {
    if (!existsSync(p)) return null;
    return JSON.parse(readFileSync(p, "utf8"));
  } catch { return null; }
}

function touchLock(lockPath) {
  try {
    const dir = path.dirname(lockPath);
    if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
    if (!existsSync(lockPath)) {
      writeFileSync(lockPath, "", "utf8");
    } else {
      const now = new Date();
      utimesSync(lockPath, now, now);
    }
  } catch { /* ignore */ }
}

function pass(extra = null) {
  const payload = extra
    ? { continue: true, hookSpecificOutput: { hookEventName: "Stop", additionalContext: extra } }
    : { continue: true };
  process.stdout.write(JSON.stringify(payload));
}

export function collectAllLedgers(tailLineCount = DEFAULT_TAIL_LINES) {
  const byLedger = {};
  for (const [name, cfg] of Object.entries(LEDGERS)) {
    if (cfg.kind === "jsonl") {
      const text = tailRead(cfg.path, tailLineCount);
      byLedger[name] = parseLedgerTail(text);
    } else if (cfg.kind === "json") {
      const obj = readJsonSafe(cfg.path);
      byLedger[name] = parseLedgerJson(obj);
    }
  }
  return byLedger;
}

function main() {
  if (process.env.PRISM_TOKEN_SAVINGS_SUMMARY_DISABLE === "1") return pass();
  const throttleMs = Number.parseInt(
    process.env.PRISM_TOKEN_SAVINGS_SUMMARY_THROTTLE_MS ?? String(DEFAULT_THROTTLE_MS),
    10,
  );
  const tailLineCount = Number.parseInt(
    process.env.PRISM_TOKEN_SAVINGS_TAIL_LINES ?? String(DEFAULT_TAIL_LINES),
    10,
  );
  const now = Date.now();
  if (!shouldEmit(LOCK_PATH, now, throttleMs)) return pass();

  const byLedger = collectAllLedgers(tailLineCount);
  const agg = aggregateAcrossLedgers(byLedger);
  const summary = formatSummary(agg);
  touchLock(LOCK_PATH);
  pass(summary);
}

if (process.argv[1] && process.argv[1].endsWith("stop-token-savings-summary.mjs")) {
  try { main(); } catch { pass(); }
}
