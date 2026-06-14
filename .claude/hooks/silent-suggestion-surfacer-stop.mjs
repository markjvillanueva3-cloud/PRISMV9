#!/usr/bin/env node
// tier: T3
/**
 * silent-suggestion-surfacer-stop.mjs — Stop hook (advisory, T3).
 *
 * Closes AUDIT-TOKEN-SAVINGS-2026-05-17 F4 #2: surface the 79
 * routing-recommendation `silent` suggestions/24h the ollama-task-offloader
 * emits but the operator never sees. Each silent suggestion is a decision the
 * offloader made — kept-quiet because it landed below INJECT_THRESHOLD or hit
 * the per-category rate-limit — but if the operator could SEE the rolled-up
 * picture they'd know which categories to either (a) tune up the threshold on
 * or (b) explicitly route via /ollama-* skills.
 *
 * FIRES ON: Stop
 * BLOCKING: never — advisory only, returns {continue:true} unconditionally.
 * THROTTLE: per-session 4h stamp at .claude/cache/silent-surfacer-<sid>.json.
 *
 * Knobs:
 *   PRISM_SILENT_SURFACER_DISABLE=1        — disable entirely
 *   PRISM_SILENT_SURFACER_WINDOW_HOURS=N   — lookback (default 4, clamp 1..72)
 *   PRISM_SILENT_SURFACER_MIN_FINDINGS=N   — silent gate (default 3)
 *   PRISM_SILENT_SURFACER_COOLDOWN_SEC=N   — per-session min interval (default 14400)
 *   PRISM_SILENT_SURFACER_STATS_PATH=PATH  — override stats file (tests)
 *
 * Design:
 *   - Pure `computeSilentSummary(events, since, now)` reads events array,
 *     returns the rolled-up shape. Easy to test.
 *   - Wrapper does fs read + stamp check + emit. Fail-soft on every error.
 *   - Stop hook MUST never throw — output is best-effort.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DEFAULT_STATS_PATH = "H:/prism/mcp-server/data/state/ollama-offload-stats.json";
const STAMP_DIR = "H:/prism/.claude/cache";
const DEFAULT_WINDOW_HOURS = 4;
const DEFAULT_MIN_FINDINGS = 3;
const DEFAULT_COOLDOWN_SEC = 14400; // 4h
const MAX_WINDOW_HOURS = 72;
const MIN_WINDOW_HOURS = 1;

function clampInt(v, lo, hi, fallback) {
  const n = parseInt(v, 10);
  if (!Number.isFinite(n)) return fallback;
  return Math.max(lo, Math.min(hi, n));
}

const DISABLE = process.env.PRISM_SILENT_SURFACER_DISABLE === "1";
const WINDOW_HOURS = clampInt(
  process.env.PRISM_SILENT_SURFACER_WINDOW_HOURS, MIN_WINDOW_HOURS, MAX_WINDOW_HOURS, DEFAULT_WINDOW_HOURS,
);
const MIN_FINDINGS = clampInt(
  process.env.PRISM_SILENT_SURFACER_MIN_FINDINGS, 1, 1000, DEFAULT_MIN_FINDINGS,
);
const COOLDOWN_SEC = clampInt(
  process.env.PRISM_SILENT_SURFACER_COOLDOWN_SEC, 60, 7 * 24 * 3600, DEFAULT_COOLDOWN_SEC,
);
const STATS_PATH = process.env.PRISM_SILENT_SURFACER_STATS_PATH || DEFAULT_STATS_PATH;

/**
 * Pure: roll up silent-suggestion events within a time window.
 *
 * @param {Array} events  ollama-offload-stats event array
 * @param {number} sinceMs lookback boundary (epoch ms)
 * @param {number} nowMs   current epoch ms (for relative reporting)
 * @returns {{
 *   total: number,
 *   byCategory: Record<string, number>,
 *   byReason: Record<string, number>,
 *   topCategory: string|null,
 *   topReason: string|null,
 *   windowEvents: number
 * }}
 */
export function computeSilentSummary(events, sinceMs, nowMs) {
  const result = {
    total: 0,
    byCategory: {},
    byReason: {},
    topCategory: null,
    topReason: null,
    windowEvents: 0,
  };
  if (!Array.isArray(events)) return result;
  for (const ev of events) {
    if (!ev || typeof ev !== "object") continue;
    const ts = typeof ev.ts === "string" ? Date.parse(ev.ts) : NaN;
    if (!Number.isFinite(ts) || ts < sinceMs || ts > nowMs) continue;
    result.windowEvents++;
    if (ev.decision !== "suggest") continue;
    // The offloader marks a suggestion silent via extras.mode === "silent".
    // Pre-2026-05-18 events carried `mode` at the top level; tolerate both.
    const mode = (ev.extras && ev.extras.mode) || ev.mode;
    if (mode !== "silent") continue;
    result.total++;
    const cat = ev.category || "unknown";
    result.byCategory[cat] = (result.byCategory[cat] || 0) + 1;
    const reason = (ev.extras && ev.extras.reason) || ev.reason || "unspecified";
    result.byReason[reason] = (result.byReason[reason] || 0) + 1;
  }
  // Determine top category/reason (alphabetic-deterministic tie-breaker).
  let topCat = null, topCatCount = 0;
  for (const [k, v] of Object.entries(result.byCategory).sort(([a], [b]) => a.localeCompare(b))) {
    if (v > topCatCount) { topCat = k; topCatCount = v; }
  }
  let topR = null, topRCount = 0;
  for (const [k, v] of Object.entries(result.byReason).sort(([a], [b]) => a.localeCompare(b))) {
    if (v > topRCount) { topR = k; topRCount = v; }
  }
  result.topCategory = topCat;
  result.topReason = topR;
  return result;
}

/**
 * Pure: should we fire? Encapsulates the cooldown + min-findings gate.
 * Returns {fire:boolean, reason:string}.
 */
export function decideFire(summary, lastFireMs, nowMs, cooldownSec, minFindings) {
  if (summary.total < minFindings) {
    return { fire: false, reason: "below-min-findings" };
  }
  if (Number.isFinite(lastFireMs) && (nowMs - lastFireMs) < cooldownSec * 1000) {
    return { fire: false, reason: "cooldown-active" };
  }
  return { fire: true, reason: "ok" };
}

/**
 * Pure: render the advisory message.
 */
export function renderAdvisory(summary, windowHours) {
  const topCats = Object.entries(summary.byCategory)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  const topReasons = Object.entries(summary.byReason)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .map(([k, v]) => `${k}=${v}`)
    .join(", ");
  return [
    `💡 silent-offload-surfacer (last ${windowHours}h):`,
    `  • ${summary.total} silent suggestion(s) the operator did NOT see`,
    `  • top categories: ${topCats || "(none)"}`,
    `  • top reasons:    ${topReasons || "(none)"}`,
    `  Action: tune INJECT_THRESHOLD lower on these categories OR route them via /ollama-* skills explicitly.`,
    `  Full picture: node H:/prism/scripts/ollama-offload-dashboard.mjs --window=${windowHours}h`,
  ].join("\n");
}

function readStatsEvents(path) {
  try {
    if (!existsSync(path)) return [];
    const raw = readFileSync(path, "utf-8");
    const j = JSON.parse(raw);
    return Array.isArray(j.events) ? j.events : [];
  } catch { return []; }
}

function readStdinPayload() {
  try {
    const raw = readFileSync(0, "utf-8");
    if (!raw) return {};
    return JSON.parse(raw);
  } catch { return {}; }
}

function deriveSessionId(payload) {
  if (payload && typeof payload.session_id === "string" && payload.session_id.length >= 8) {
    return payload.session_id.slice(0, 8);
  }
  return "anon";
}

function readStamp(stampPath) {
  try {
    if (!existsSync(stampPath)) return null;
    return JSON.parse(readFileSync(stampPath, "utf-8"));
  } catch { return null; }
}

function writeStamp(stampPath, obj) {
  try {
    if (!existsSync(STAMP_DIR)) mkdirSync(STAMP_DIR, { recursive: true });
    writeFileSync(stampPath, JSON.stringify(obj));
  } catch { /* best-effort */ }
}

function emit(o) { process.stdout.write(JSON.stringify(o)); }

async function main() {
  if (DISABLE) { emit({ continue: true }); return; }
  const payload = readStdinPayload();
  const sid = deriveSessionId(payload);
  const stampPath = join(STAMP_DIR, `silent-surfacer-${sid}.json`);
  const now = Date.now();
  const sinceMs = now - WINDOW_HOURS * 3600 * 1000;
  const events = readStatsEvents(STATS_PATH);
  const summary = computeSilentSummary(events, sinceMs, now);
  const stamp = readStamp(stampPath);
  const lastFireMs = stamp && Number.isFinite(stamp.lastFireMs) ? stamp.lastFireMs : -Infinity;
  const gate = decideFire(summary, lastFireMs, now, COOLDOWN_SEC, MIN_FINDINGS);
  if (!gate.fire) { emit({ continue: true }); return; }
  const msg = renderAdvisory(summary, WINDOW_HOURS);
  writeStamp(stampPath, { lastFireMs: now, lastSummary: { total: summary.total, topCategory: summary.topCategory } });
  emit({ continue: true, systemMessage: msg });
}

const invokedAsCli = (() => {
  try {
    if (!process.argv[1]) return false;
    return pathToFileURL(process.argv[1]).href === import.meta.url;
  } catch { return false; }
})();

if (invokedAsCli) {
  main().catch(() => { emit({ continue: true }); });
}
