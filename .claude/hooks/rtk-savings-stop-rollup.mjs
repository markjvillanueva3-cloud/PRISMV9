#!/usr/bin/env node
// tier: T3
/**
 * rtk-savings-stop-rollup.mjs — Stop hook
 *
 * RTK-PSN-SYNERGY/U-RPS03 (2026-05-24, slot:alpha)
 *
 * At session end, roll up rtk-savings-ledger.jsonl into a daily summary at
 * state/shared/dashboards/rtk-savings-daily.json. Feeds the SVI-style
 * dashboard pattern + master-index nightly regen.
 *
 * Pure-function aggregation. Throttled (1/15min global) to avoid thrashing
 * the daily file under 16-chat fleet Stop bursts.
 *
 * Knobs:
 *   PRISM_RTK_ROLLUP_DISABLE=1
 *   PRISM_RTK_ROLLUP_THROTTLE_MS (default 900000 = 15min)
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync, statSync } from "node:fs";
import path from "node:path";

const LEDGER = "H:/prism/state/shared/dashboards/rtk-savings-ledger.jsonl";
const DAILY = "H:/prism/state/shared/dashboards/rtk-savings-daily.json";
const THROTTLE_MS_DEFAULT = 15 * 60_000;
const MAX_READ_BYTES = 1_000_000; // 1MB tail — keeps memory bounded

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }

/**
 * Pure: aggregate ledger lines into per-day totals keyed by YYYY-MM-DD.
 * Returns { byDay: { [date]: {hits, misses, savedTokens, missedTokens, sessions:Set} } }.
 * For testability, returns Set-as-Array.
 */
export function rollupLedger(jsonl) {
  const byDay = {};
  if (!jsonl) return { byDay };
  for (const line of jsonl.split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    const day = String(e.ts || "").slice(0, 10); // YYYY-MM-DD
    if (!day || day.length !== 10) continue;
    if (!byDay[day]) byDay[day] = { hits: 0, misses: 0, savedTokens: 0, missedTokens: 0, sessions: new Set(), byBase: {} };
    const tokens = Number.isFinite(e.est_tokens) ? e.est_tokens : 0;
    if (e.kind === "hit") {
      byDay[day].hits += 1;
      byDay[day].savedTokens += tokens;
    } else if (e.kind === "miss") {
      byDay[day].misses += 1;
      byDay[day].missedTokens += tokens;
      byDay[day].byBase[e.base] = (byDay[day].byBase[e.base] || 0) + tokens;
    }
    if (e.sessionId) byDay[day].sessions.add(e.sessionId);
  }
  // Serialize Sets to Arrays for JSON round-trip
  for (const day of Object.keys(byDay)) {
    byDay[day].sessions = [...byDay[day].sessions];
    byDay[day].uniqueSessions = byDay[day].sessions.length;
  }
  return { byDay };
}

function tailRead(filePath, maxBytes) {
  try {
    if (!existsSync(filePath)) return "";
    const st = statSync(filePath);
    if (st.size === 0) return "";
    const buf = readFileSync(filePath, { encoding: "utf8" });
    return buf.length > maxBytes ? buf.slice(buf.length - maxBytes) : buf;
  } catch { return ""; }
}

function readJsonSafe(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return null; } }
function writeJsonSafe(p, obj) {
  try {
    if (!existsSync(path.dirname(p))) mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(obj, null, 2), "utf8");
  } catch { /* ignore */ }
}

function main() {
  if (process.env.PRISM_RTK_ROLLUP_DISABLE === "1") return pass();
  const throttleMs = Number.parseInt(process.env.PRISM_RTK_ROLLUP_THROTTLE_MS ?? String(THROTTLE_MS_DEFAULT), 10);
  const existing = readJsonSafe(DAILY) || {};
  const lastRollupAt = Number(existing._meta?.lastRollupAt ?? 0);
  const now = Date.now();
  if ((now - lastRollupAt) < throttleMs) return pass();

  const txt = tailRead(LEDGER, MAX_READ_BYTES);
  if (!txt) return pass();
  const { byDay } = rollupLedger(txt);
  if (Object.keys(byDay).length === 0) return pass();

  writeJsonSafe(DAILY, {
    schemaVersion: "1.0.0",
    _meta: { lastRollupAt: now, generatedBy: "rtk-savings-stop-rollup.mjs" },
    byDay,
  });
  pass();
}

if (process.argv[1] && process.argv[1].endsWith("rtk-savings-stop-rollup.mjs")) {
  try { main(); } catch { pass(); }
}
