#!/usr/bin/env node
// tier: T3
/**
 * rtk-savings-headline-inject.mjs — UserPromptSubmit hook
 *
 * RTK-PSN-SYNERGY/U-RPS02 (2026-05-24, slot:alpha)
 *
 * PSN synergy: surfaces a 1-line session-aggregate RTK telemetry headline so
 * the operator sees compounding wins/misses without invoking `rtk gain` manually.
 *
 * Reads state/shared/dashboards/rtk-savings-ledger.jsonl (written by
 * rtk-prefix-reminder.mjs every PreToolUse:Bash). Tail-bounded (200 KB) so
 * the hook stays cheap even if the ledger grows.
 *
 * Headline format:
 *   "📊 RTK session: N hits / M misses · est ~Xk saved / ~Yk on table · top miss: <cmd> (k)"
 *
 * Knobs:
 *   PRISM_RTK_HEADLINE_DISABLE=1
 *   PRISM_RTK_HEADLINE_RATE_MS    (default 600000 = every 10min per session)
 *   PRISM_RTK_HEADLINE_MIN_EVENTS (default 5 — don't fire on near-empty ledger)
 */

import { readFileSync, existsSync, statSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import os from "node:os";
// 2026-05-26 (U-D19-RTK-COUNTER-WIRE, slot:alpha): S6 shared counter for
// FEATURE-UTILIZATION dashboard. RTK was 0-fire pre-wire (UNKNOWN tier)
// because the FEATURE-UTILIZATION aggregator's data sources didn't cover the
// rtk ledger. Counts headline injections (rate-limited to once per N min per
// session); raw rtk calls are in the LEDGER and far higher-volume.
import { incrementFeature } from "../helpers/feature-counter.mjs";

const LEDGER = "H:/prism/state/shared/dashboards/rtk-savings-ledger.jsonl";
const RATE_FILE = path.join(os.tmpdir(), "prism-hook-state", "rtk-savings-headline.last.json");
const DEFAULT_RATE_MS = 10 * 60_000;
const DEFAULT_MIN_EVENTS = 5;
const MAX_READ_BYTES = 200_000;

function pass() { process.stdout.write(JSON.stringify({ continue: true })); }
function readJsonSafe(p) { try { return JSON.parse(readFileSync(p, "utf8")); } catch { return {}; } }
function writeJsonSafe(p, obj) {
  try {
    if (!existsSync(path.dirname(p))) mkdirSync(path.dirname(p), { recursive: true });
    writeFileSync(p, JSON.stringify(obj), "utf8");
  } catch { /* ignore */ }
}

function tailRead(filePath, maxBytes) {
  try {
    const st = statSync(filePath);
    if (st.size === 0) return "";
    const buf = readFileSync(filePath, { encoding: "utf8" });
    return buf.length > maxBytes ? buf.slice(buf.length - maxBytes) : buf;
  } catch { return ""; }
}

/**
 * Pure: summarize JSONL ledger into {hits, misses, savedTokens, missedTokens, topMissBase, topMissTokens}.
 * Filters to a single session prefix if provided.
 */
export function summarizeLedger(jsonl, sessionPrefix = "") {
  const out = { hits: 0, misses: 0, savedTokens: 0, missedTokens: 0, byMiss: {} };
  if (!jsonl) return out;
  for (const line of jsonl.split("\n")) {
    if (!line) continue;
    let e;
    try { e = JSON.parse(line); } catch { continue; }
    if (sessionPrefix && e.sessionId !== sessionPrefix) continue;
    const tokens = Number.isFinite(e.est_tokens) ? e.est_tokens : 0;
    if (e.kind === "hit") {
      out.hits += 1;
      out.savedTokens += tokens;
    } else if (e.kind === "miss") {
      out.misses += 1;
      out.missedTokens += tokens;
      out.byMiss[e.base] = (out.byMiss[e.base] || 0) + tokens;
    }
  }
  return out;
}

export function formatHeadline(summary) {
  if (!summary || (summary.hits === 0 && summary.misses === 0)) return null;
  const top = Object.entries(summary.byMiss || {}).sort((a, b) => b[1] - a[1])[0];
  const savedK = (summary.savedTokens / 1000).toFixed(1);
  const missedK = (summary.missedTokens / 1000).toFixed(1);
  const topStr = top ? ` · top miss: \`${top[0]}\` (~${(top[1] / 1000).toFixed(1)}k)` : "";
  return `## 📊 RTK session telemetry\n${summary.hits} hits / ${summary.misses} misses · est saved **~${savedK}k tokens** · on-table **~${missedK}k**${topStr}\n_Disable: \`PRISM_RTK_HEADLINE_DISABLE=1\` · Set rate: \`PRISM_RTK_HEADLINE_RATE_MS=N\` (default 600000)._`;
}

async function readStdin() {
  try { return JSON.parse(readFileSync(0, "utf8") || "{}"); } catch { return {}; }
}

async function main() {
  if (process.env.PRISM_RTK_HEADLINE_DISABLE === "1") return pass();
  if (!existsSync(LEDGER)) return pass();

  const input = await readStdin();
  const sessionId = String(input.session_id || input.sessionId || "").slice(0, 8);
  if (!sessionId) return pass();

  // Rate-limit per session — once per N minutes (the headline is cumulative,
  // not per-prompt; surfacing it every prompt would burn ~140 tokens × every UserPromptSubmit).
  const rateMs = Number.parseInt(process.env.PRISM_RTK_HEADLINE_RATE_MS ?? String(DEFAULT_RATE_MS), 10);
  const minEvents = Number.parseInt(process.env.PRISM_RTK_HEADLINE_MIN_EVENTS ?? String(DEFAULT_MIN_EVENTS), 10);
  const rateState = readJsonSafe(RATE_FILE);
  const now = Date.now();
  if (rateState[sessionId] && (now - rateState[sessionId]) < rateMs) return pass();

  const txt = tailRead(LEDGER, MAX_READ_BYTES);
  if (!txt) return pass();
  const summary = summarizeLedger(txt, sessionId);
  const events = summary.hits + summary.misses;
  if (events < minEvents) return pass();

  const headline = formatHeadline(summary);
  if (!headline) return pass();

  // U-D19: feature engaged — RTK ledger had >= minEvents and headline built.
  try { incrementFeature("RTK", { slot: input?.slot ?? null }); } catch { /* never blocks */ }

  // Record fire time
  rateState[sessionId] = now;
  // Prune entries >2× window old
  for (const k of Object.keys(rateState)) {
    if (now - rateState[k] > rateMs * 2) delete rateState[k];
  }
  writeJsonSafe(RATE_FILE, rateState);

  process.stdout.write(JSON.stringify({
    continue: true,
    hookSpecificOutput: { hookEventName: "UserPromptSubmit", additionalContext: headline },
  }));
}

if (process.argv[1] && process.argv[1].endsWith("rtk-savings-headline-inject.mjs")) {
  main().catch(() => pass());
}
